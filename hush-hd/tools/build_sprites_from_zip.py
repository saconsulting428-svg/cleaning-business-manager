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

def key_out_white(im, thr=236, pocket_min=160):
    """-> RGBA uint8 with the white background removed.
    Background = near-white pixels connected to the border, plus enclosed near-white pockets larger than `pocket_min` px (the gap between an
    arm and the body, say); small white spots (eye highlights, lens glints) are kept. The edge band is then matted against white
    (alpha from darkness, colour un-mixed from the white), which is what removes the white halo around hair and fabric."""
    im = im.convert('RGBA'); a = np.array(im)
    if (a[..., 3] < 250).any():                                    # already has transparency: flatten on white first
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im); a = np.array(bg)
    rgb = a[..., :3].astype(np.float32)
    minc = rgb.min(axis=-1)
    nearwhite = minc >= thr
    lab, n = ndi.label(nearwhite)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndi.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1)) if n else []
    big = {i + 1 for i, sz in enumerate(sizes) if sz >= pocket_min}
    bgmask = np.isin(lab, list(border | big)) if (border or big) else np.zeros_like(nearwhite)
    alpha = (~bgmask).astype(np.float32)
    band = ndi.binary_dilation(bgmask, iterations=4) & ~bgmask
    # foreground darkness estimate: darkest typical body pixels near the band (jacket/hair ~ 30-60); alpha = how far from white the pixel is
    fgmin = 38.0
    ab = np.clip((255.0 - minc) / (255.0 - fgmin), 0, 1)
    alpha[band] = np.where(minc[band] >= 226, 0.0, ab[band])
    alpha[band] = np.maximum(alpha[band], 0.0)
    out_rgb = rgb.copy()
    m = band & (alpha > 0.02)
    out_rgb[m] = (rgb[m] - 255.0 * (1 - alpha[m][:, None])) / alpha[m][:, None]        # un-mix the white
    out_rgb = np.clip(out_rgb, 0, 255)
    return np.dstack([out_rgb.astype(np.uint8), (alpha * 255).astype(np.uint8)])

def decontaminate_and_clean(c, stats):
    c = cs.clean_cell(c, stats, hole_max=450)           # only specks (eye glints, lens): bigger enclosed gaps are real background
    return c

def bbox(a):
    ys, xs = np.where(a[..., 3] > 16)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def measure_lens(a, ax, base):
    """Use frames: the flashlight is held low, so the lens is found as the brightest neutral (silver) blob in the middle of the figure."""
    r = a[..., 0].astype(np.int32); g = a[..., 1].astype(np.int32); b = a[..., 2].astype(np.int32)
    lum = (r * 299 + g * 587 + b * 114) // 1000; sat = np.max([r, g, b], axis=0) - np.min([r, g, b], axis=0)
    ys, xs = np.where(a[..., 3] > 200); y0, y1 = ys.min(), ys.max(); h = y1 - y0
    m = (lum > 140) & (sat < 45) & (a[..., 3] > 200); m[:y0 + int(h * 0.30)] = False; m[y0 + int(h * 0.75):] = False
    mc = ndi.binary_closing(m, iterations=2) & (a[..., 3] > 200); lab, n = ndi.label(mc)
    if n == 0: return None
    sizes = ndi.sum(mc, lab, index=np.arange(1, n + 1)); cand = [i + 1 for i, sz in enumerate(sizes) if sz >= max(12, 0.25 * sizes.max())]
    if not cand: return None
    cx = {i: np.where(lab == i)[1].mean() for i in cand}; i = max(cand, key=lambda k: cx[k])        # the lens is the right-most bright blob (hand highlights sit further back)
    yy, xx = np.where(lab == i)
    return [float(xx.mean() - ax), float(yy.mean() - base)]

def measure_point(kind, a, ax, base):
    ys, xs = np.where(a[..., 3] > 128)
    if kind == 'survivor':                                          # fallback when the lens is not visible: right-most solid pixels in the middle of the body
        y0, y1 = ys.min(), ys.max(); keep = (ys > y0 + 0.25 * (y1 - y0)) & (ys < y0 + 0.7 * (y1 - y0))
        ys, xs = ys[keep], xs[keep]; x1 = xs.max(); sel = xs >= x1 - 6
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
    def take(n, opener):
        if not n.lower().endswith(('.png', '.webp', '.jpg', '.jpeg')) or '__MACOSX' in n: return
        fid = frame_id(os.path.splitext(os.path.basename(n))[0])
        if fid is None: print('  skipped (no frame id):', n); return
        if fid in frames: print('  duplicate id', fid, '->', n, '(keeping the first)'); return
        frames[fid] = opener()
    if os.path.isdir(zip_path):                                    # a folder of frames works the same as the zip
        for dp, _d, fs in os.walk(zip_path):
            for f in sorted(fs): take(f, lambda dp=dp, f=f: Image.open(os.path.join(dp, f)))
    else:
        with zipfile.ZipFile(zip_path) as z:
            for n in z.namelist():
                if not n.endswith('/'): take(n, lambda n=n: Image.open(io.BytesIO(z.read(n))))
    need = [f for ids, *_ in SHEETS.values() for f in ids]
    missing = [f for f in need if f not in frames]
    if missing: sys.exit('missing frames: ' + ', '.join(missing))
    print('found all %d frames' % len(need))
    stats = dict(fragments=0, slivers=0, holes_px=0, bright_edge_before=0, bright_edge_faded=0)
    proc = {}; srcbot = {}; scl = {}
    for fid in need:
        im = frames[fid]; print('  %-4s source %dx%d' % (fid, *im.size), end='')
        a = key_out_white(im)
        # a surface that bleeds off the canvas edge (Y3: the panel the hand presses) shows up as tall full-height columns at the border
        H, Wd = a.shape[:2]; colc = (a[..., 3] > 40).sum(axis=0)
        for side in (1, -1):
            idx = Wd - 1 if side == 1 else 0
            if colc[idx] > 0.45 * H:
                x = idx
                while 0 <= x < Wd and colc[x] > 0.3 * H: x -= side
                cut = x - side * 8; print('  [edge panel removed on', 'right' if side == 1 else 'left', 'from x=%d]' % cut, end='')
                if side == 1: a[:, max(cut, 0):, 3] = 0
                else: a[:, :min(cut, Wd), 3] = 0
        if fid == 'Y3': cs.drop_panel(a, stats)
        a = decontaminate_and_clean(a, stats)
        x0, y0, x1, y1 = bbox(a); srcbot[fid] = y1; scl[fid] = 1.0; a = a[y0:y1, x0:x1]
        proc[fid] = a; print('  -> content %dx%d' % (a.shape[1], a.shape[0]))
    # ---- scale policy -------------------------------------------------------------------------------------------------
    # Every frame of one animation gets the SAME scale. (The first atlas normalised each frame to a constant silhouette area, which
    # made wide poses - running, crawling - shrink and bent ones grow from frame to frame.)  Sheet scales are calibrated once from the
    # supplied art (px of atlas per px of source); see tools/ for how they were measured.
    SHEET_SCALE = {'Survivor_Run': 0.50, 'Survivor_CrouchWalk': 0.51, 'Survivor_Crawl': 0.57, 'Survivor_Use': 0.455, 'Survivor_Caught': 0.465,
                   'Monster_Run': 0.69, 'Monster_Attack': 0.675, 'Monster_Roar': 0.58}
    def rescale(i, f):
        if abs(f - 1) < 0.004: return
        im = Image.fromarray(proc[i], 'RGBA'); w, h = im.size; scl[i] *= f
        proc[i] = np.array(im.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS))
    for sheet, (ids, *_r) in SHEETS.items():
        base = SHEET_SCALE[sheet]
        fac = {i: base * overrides.get(i, {}).get('scale', 1.0) for i in ids}
        if sheet == 'Survivor_Crawl':                               # W6 is exported larger than its siblings: equalise body length
            ln = np.array([proc[i].shape[1] for i in ids], float); med = np.median(ln)
            for i, l in zip(ids, ln):
                if abs(l - med) / med > 0.04: fac[i] *= med / l; print('  normalised %s: length %d -> %d (x%.3f)' % (i, l, med, med / l))
        for i in ids: rescale(i, fac[i])
        if sheet == 'Survivor_Run':
            # a runner is shorter than a man standing still, and the unbalanced loop made him look like he shrank when he started to run.
            # Run frames are lifted toward 94% of the idle height (partial, exponent .75), so the loop stays within +-3% of one height.
            hid = proc['S9'].shape[0]; target = 0.94 * hid
            for i in ids:
                if i == 'S9': continue
                h = proc[i].shape[0]; f = min(1.16, max(1.0, (target / h) ** 0.75)); rescale(i, f)
                print('  run balance %-3s height %d -> %d (x%.3f)' % (i, h, proc[i].shape[0], f))
    # metres per pixel from the standing references; everything else shares it (frames come from the same renders)
    k_s = 1.80 / proc['S9'].shape[0]; k_m = 2.30 / proc['R1'].shape[0]   # metres per atlas pixel: idle survivor 1.8 m, idle monster 2.3 m
    print('  k survivor %.6f  k monster %.6f m/px' % (k_s, k_m))
    os.makedirs(out_dir, exist_ok=True); meta = {}
    for sheet, (ids, cols, ref_m, ref_id) in SHEETS.items():
        k = k_s if sheet.startswith('Survivor') else k_m
        # register: horizontal anchor = centre of mass of the solid pixels, vertical anchor = lowest solid row
        cm = []
        for i in ids:
            a = proc[i]; w = (a[..., 3] > 128).astype(np.float32); ys, xs = np.where(w > 0); cm.append(float(xs.mean()))
        left = max(cm[j] for j in range(len(ids))); right = max(proc[i].shape[1] - cm[j] for j, i in enumerate(ids))
        # Flight phase: in the supplied frames a running figure is higher on the canvas while airborne. Keeping that height (instead of gluing
        # every frame's lowest pixel to the floor) is what gives the run its bounce. Only run cycles use it: the other sheets' canvases drift
        # by small random amounts, which must not become hovering.
        lift = [0] * len(ids)
        if sheet in ('Survivor_Run', 'Monster_Run'):
            loop_ = [i for i in ids if i != 'S9']; G_src = max(srcbot[i] for i in loop_); noise_src = 28           # canvas px: below this the frame is simply standing on the ground
            for j, i in enumerate(ids):
                if i in srcbot and i in loop_ and G_src - srcbot[i] > noise_src: lift[j] = int(round((G_src - srcbot[i]) * scl[i]))
            print('  %s flight lift (atlas px): %s' % (sheet, dict(zip(ids, lift))))
        cw = int(np.ceil(left + right)) + 2 * PAD; ch = max(proc[i].shape[0] + lift[j] for j, i in enumerate(ids)) + 2 * PAD
        ax = int(round(left)) + PAD; base = ch - PAD
        atlas = np.zeros((((len(ids) + cols - 1) // cols) * ch, cols * cw, 4), np.uint8); pts = []; gaps = []; widths = []
        for j, i in enumerate(ids):
            a = proc[i]; ox = ax - int(round(cm[j])); oy = base - a.shape[0] - lift[j]
            cx, cy = (j % cols) * cw, (j // cols) * ch
            atlas[cy + oy: cy + oy + a.shape[0], cx + ox: cx + ox + a.shape[1]] = a
            cell = atlas[cy: cy + ch, cx: cx + cw]
            rows = np.where((cell[..., 3] > 128).any(axis=1))[0]; gaps.append(int(base - (rows.max() + 1)))
            cols_ = np.where((cell[..., 3] > 128).any(axis=0))[0]; widths.append(int(cols_.max() - cols_.min()))
            pt = measure_lens(cell, ax, base) if sheet.startswith('Survivor') else None
            if pt is None: pt = measure_point('survivor' if sheet.startswith('Survivor') else 'monster', cell, ax, base)
            pts.append([round(v, 1) for v in pt])
        fn = sheet + '.webp'
        Image.fromarray(atlas, 'RGBA').save(os.path.join(out_dir, fn), 'WEBP', quality=92, alpha_quality=100, method=6)
        # gait metadata: `steps` = frames where a foot lands (the lowest point goes from airborne to on the ground), used to fire footstep
        # sounds exactly when the boot touches down; `neutral` = the loop frame with the narrowest stance (closest to standing), where a walk
        # cycle should begin and end so that idle <-> moving transitions do not jump.
        loop = [j for j, i in enumerate(ids) if i != 'S9']; thr_air, thr_gnd = max(20, int(0.06 * ch)), max(6, int(0.04 * ch))
        steps = [j for j in loop if gaps[j] <= thr_gnd and gaps[loop[(loop.index(j) - 1) % len(loop)]] >= thr_air]
        if sheet in ('Survivor_CrouchWalk', 'Survivor_Crawl'): steps = [loop[0], loop[len(loop) // 2]]    # no airborne phase: plant every half cycle
        if not steps: steps = [loop[0], loop[len(loop) // 2]]
        neutral = min(loop, key=lambda j: widths[j])
        meta[sheet] = dict(src=fn, w=cw, h=ch, ax=ax, base=base, n=len(ids), cols=cols, k=round(k, 6), pt=pts, steps=steps, neutral=neutral, gaps=gaps)
        print('  %-20s landing frames %s  neutral frame %s  ground gaps %s' % (sheet, steps, ids[neutral], gaps))
        print('  %-20s %d frames, cell %dx%d, anchor (%d,%d), %d KB' % (sheet, len(ids), cw, ch, ax, base, os.path.getsize(os.path.join(out_dir, fn)) // 1024))
    json.dump(meta, open(os.path.join(out_dir, 'atlas.json'), 'w'), indent=1)
    print('cleanup stats:', stats)

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'assets/clean')
