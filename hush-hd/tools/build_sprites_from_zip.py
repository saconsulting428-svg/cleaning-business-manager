#!/usr/bin/env python3
"""Builds the HUSH HD sprite atlases straight from the artist's frame PNGs (Pngs.zip).

  python3 tools/build_sprites_from_zip.py Pngs.zip            # writes assets/clean/*.webp + assets/clean/atlas.json
  python3 tools/build.py                                      # embeds them into HUSH-HD.html

Expected frames (file name stem, case-insensitive; folders and extra words are ignored):
  survivor  Run, S1..S8 (run loop) and S9 (idle) | C1..C6 crouch-walk | W1..W6 crawl | Y1..Y4 use | X1..X4 caught
  monster   U1..U8 run | A1..A4 attack | R1..R3 idle/roar

Per frame:
  1. flatten onto white if there is an alpha channel, then remove the white background by flood fill from the borders (white that is
     enclosed by the figure, e.g. eye highlights, is kept), with a soft one-pixel matte
  2. de-fringe: edge colour is replaced by the nearest solid body colour, so no white halo is left around hair, claws or the flashlight
  3. drop stray fragments (panels, specks) and enclosed transparent holes are filled (same stage as tools/clean_sprites.py)
  4. outlier scale (e.g. a W6 exported on a larger canvas) is normalised to the median figure height of its animation
  5. frames are cut to their content and re-registered: feet on one baseline, horizontal anchor at the body's centre of mass, so the
     animation never jumps; nothing (claws, boots, backpack, flashlight) is cropped
  6. flashlight / eye anchor points are measured, atlases are packed with the same layout the game reads (atlas.json)
Everything it decides is printed, so a reviewer can see what was changed.  overrides.json (optional, next to the zip) may hold
{"W6": {"scale": 0.8}} style manual corrections."""
import sys, os, re, io, json, zipfile
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import clean_sprites as cs

SHEETS = {  # name: (frame ids in order, columns, metres for the reference frame, reference frame id)
    'Survivor_Run':        (['Run'] + ['S%d' % i for i in range(1, 9)] + ['S9'], 7, 1.80, 'S9'),
    'Survivor_CrouchWalk': (['C%d' % i for i in range(1, 7)], 6, None, None),
    'Survivor_Crawl':      (['W%d' % i for i in range(1, 7)], 4, None, None),
    'Survivor_Use':        (['Y%d' % i for i in range(1, 5)], 4, None, None),
    'Survivor_Caught':     (['X%d' % i for i in range(1, 5)], 4, None, None),
    'Monster_Run':         (['U%d' % i for i in range(1, 9)], 5, None, None),
    'Monster_Attack':      (['A%d' % i for i in range(1, 5)], 4, None, None),
    'Monster_Roar':        (['R%d' % i for i in range(1, 4)], 3, 2.30, 'R1'),
}
K_SURV_REF, K_MON_REF = 'S9', 'R1'
PAD = 3

def frame_id(stem):
    s = stem.lower()
    m = re.search(r'(?<![a-z0-9])(run|s[1-9]|c[1-6]|w[1-6]|y[1-4]|x[1-4]|u[1-8]|a[1-4]|r[1-3])(?![a-z0-9])', s)
    if not m: return None
    t = m.group(1)
    return 'Run' if t == 'run' else t.upper()

def lum(a): return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]

def key_out_white(im, thr=236):
    """-> RGBA uint8 with the white background removed."""
    im = im.convert('RGBA'); a = np.array(im)
    if (a[..., 3] < 250).any():                                    # already has transparency: flatten on white first
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); a = np.array(bg)
    rgb = a[..., :3].astype(np.int32)
    nearwhite = (rgb.min(axis=-1) >= thr)
    lab, n = ndi.label(nearwhite)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(border)) if border else np.zeros_like(nearwhite)
    fg = ~bgmask
    # soft matte: pixels next to the background fade by how close to white they are
    edge = fg & ndi.binary_dilation(bgmask, iterations=2)
    alpha = fg.astype(np.float32)
    whiteness = np.clip((rgb.min(axis=-1) - 150) / (thr - 150), 0, 1)
    alpha[edge] = np.clip(1.0 - whiteness[edge] ** 1.5, 0, 1)
    out = np.dstack([a[..., :3], (alpha * 255).astype(np.uint8)])
    return out

def decontaminate_and_clean(c, stats):
    c = cs.clean_cell(c, stats)
    return c

def bbox(a):
    ys, xs = np.where(a[..., 3] > 16)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def measure_point(kind, a, ax, base):
    ys, xs = np.where(a[..., 3] > 128)
    if kind == 'survivor':                                          # lens: the right-most solid column band, a few rows around its middle
        x1 = xs.max(); sel = xs >= x1 - 6
        return [float(x1 - ax), float(np.mean(ys[sel]) - base)]
    r = a[..., 0].astype(np.int32); g = a[..., 1].astype(np.int32); b = a[..., 2].astype(np.int32)    # eye: strongest saturated red glow in the upper half
    score = (r - (g + b) // 2) * (a[..., 3] > 200); h = a.shape[0]; score[h // 2:] = 0
    score = ndi.gaussian_filter(score.astype(np.float32), 3)
    y, x = np.unravel_index(np.argmax(score), score.shape)
    return [float(x - ax), float(y - base)]

def main(zip_path, out_dir='assets/clean'):
    overrides = {}
    op = os.path.join(os.path.dirname(os.path.abspath(zip_path)), 'overrides.json')
    if os.path.exists(op): overrides = json.load(open(op))
    frames = {}
    with zipfile.ZipFile(zip_path) as z:
        for n in z.namelist():
            if n.endswith('/') or not n.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')) or '__MACOSX' in n: continue
            fid = frame_id(os.path.splitext(os.path.basename(n))[0])
            if fid is None: print('  skipped (no frame id):', n); continue
            if fid in frames: print('  duplicate id', fid, '->', n, '(keeping the first)'); continue
            frames[fid] = Image.open(io.BytesIO(z.read(n)))
    need = [f for ids, *_ in SHEETS.values() for f in ids]
    missing = [f for f in need if f not in frames]
    if missing: sys.exit('missing frames: ' + ', '.join(missing))
    print('found all %d frames' % len(need))
    stats = dict(fragments=0, slivers=0, holes_px=0, bright_edge_before=0, bright_edge_faded=0)
    proc = {}
    for fid in need:
        im = frames[fid]; print('  %-4s source %dx%d' % (fid, *im.size), end='')
        a = key_out_white(im)
        if fid == 'Y3': cs.drop_panel(a, stats)
        a = decontaminate_and_clean(a, stats)
        x0, y0, x1, y1 = bbox(a); a = a[y0:y1, x0:x1]
        proc[fid] = a; print('  -> content %dx%d' % (a.shape[1], a.shape[0]))
    # scale outliers inside each animation (a frame exported on another scale, e.g. W6): the figure dimension that is most stable
    # across the animation (height for run cycles, length for the crawl) is compared with the median
    for sheet, (ids, cols, ref_m, ref_id) in SHEETS.items():
        if len(ids) < 4 or sheet not in ('Survivor_Crawl', 'Monster_Run', 'Survivor_CrouchWalk', 'Survivor_Run'): continue
        hs = np.array([proc[i].shape[0] for i in ids], float); ws = np.array([proc[i].shape[1] for i in ids], float)
        mad = lambda v: np.median(np.abs(v - np.median(v))) / np.median(v)           # robust spread: one rogue frame must not decide
        dim = hs if mad(hs) <= mad(ws) else ws; dname = 'height' if dim is hs else 'length'
        med = np.median(dim)
        for i, d in zip(ids, dim):
            sc = overrides.get(i, {}).get('scale')
            if sc is None and abs(d - med) / med > 0.15: sc = med / d
            if sc and abs(sc - 1) > 0.01:
                im = Image.fromarray(proc[i], 'RGBA'); w, h = im.size
                proc[i] = np.array(im.resize((max(1, round(w * sc)), max(1, round(h * sc))), Image.LANCZOS)); print('  normalised %s: scale x%.3f (%s %d -> %d, median %d)' % (i, sc, dname, d, d * sc, med))
    # metres per pixel from the standing references; everything else shares it (frames come from the same renders)
    k_s = 1.80 / proc['S9'].shape[0]; k_m = 2.30 / proc['R1'].shape[0]
    print('  k survivor %.6f  k monster %.6f m/px' % (k_s, k_m))
    os.makedirs(out_dir, exist_ok=True); meta = {}
    for sheet, (ids, cols, ref_m, ref_id) in SHEETS.items():
        k = k_s if sheet.startswith('Survivor') else k_m
        # register: horizontal anchor = centre of mass of the solid pixels, vertical anchor = lowest solid row
        cm = []
        for i in ids:
            a = proc[i]; w = (a[..., 3] > 128).astype(np.float32); ys, xs = np.where(w > 0); cm.append(float(xs.mean()))
        left = max(cm[j] for j in range(len(ids))); right = max(proc[i].shape[1] - cm[j] for j, i in enumerate(ids))
        cw = int(np.ceil(left + right)) + 2 * PAD; ch = max(proc[i].shape[0] for i in ids) + 2 * PAD
        ax = int(round(left)) + PAD; base = ch - PAD
        atlas = np.zeros((((len(ids) + cols - 1) // cols) * ch, cols * cw, 4), np.uint8); pts = []
        for j, i in enumerate(ids):
            a = proc[i]; ox = ax - int(round(cm[j])); oy = base - a.shape[0]
            cx, cy = (j % cols) * cw, (j // cols) * ch
            atlas[cy + oy: cy + oy + a.shape[0], cx + ox: cx + ox + a.shape[1]] = a
            cell = atlas[cy: cy + ch, cx: cx + cw]
            pts.append([round(v, 1) for v in measure_point('survivor' if sheet.startswith('Survivor') else 'monster', cell, ax, base)])
        fn = sheet + '.webp'
        Image.fromarray(atlas, 'RGBA').save(os.path.join(out_dir, fn), 'WEBP', quality=92, alpha_quality=100, method=6)
        meta[sheet] = dict(src=fn, w=cw, h=ch, ax=ax, base=base, n=len(ids), cols=cols, k=round(k, 6), pt=pts)
        print('  %-20s %d frames, cell %dx%d, anchor (%d,%d), %d KB' % (sheet, len(ids), cw, ch, ax, base, os.path.getsize(os.path.join(out_dir, fn)) // 1024))
    json.dump(meta, open(os.path.join(out_dir, 'atlas.json'), 'w'), indent=1)
    print('cleanup stats:', stats)

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'assets/clean')
