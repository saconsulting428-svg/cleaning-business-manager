#!/usr/bin/env python3
"""Sprite clean-up pipeline for HUSH HD.

For every frame cell of every atlas:
  1. drop stray fragments (e.g. the extra panel sliver in Y3, the white patch in X4)
  2. fill enclosed transparent holes (eye pupils, lens, chest highlights that were keyed out with the white background)
  3. de-fringe: replace the colour of semi-transparent edge pixels with the nearest solid body colour and fade bright
     residue, which removes white halos around hair, claws, clothing and the flashlight
Cell size, anchors and baselines are untouched, so animation metadata stays valid.

usage: clean_sprites.py <in_dir_with_atlas.json> <out_dir>
"""
import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def lum(rgb):
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]

def drop_panel(c, stats):
    """Y3 carries a sliver of the surface the hand pushes on (a thin blue-grey vertical panel at the fingertips).
    Everything to the right of the last skin-coloured pixel (the fingertips) is removed, then any bluish remains next to the hand."""
    a = c[..., 3] > 0
    r = c[..., 0].astype(int); g = c[..., 1].astype(int); b = c[..., 2].astype(int)
    skin = a & (r > g + 14) & (r > b + 24) & (c[..., 3] > 200)
    ys, xs = np.where(skin)
    n0 = int((c[..., 3] > 0).sum())
    if len(xs) > 40:
        xh = int(np.percentile(xs, 99.5)); c[:, xh + 4:, 3] = 0
    xs2 = np.where((c[..., 3] > 0).any(axis=0))[0]; x1 = xs2.max(); lo = max(0, x1 - 20)
    m = np.zeros(a.shape, bool); m[:, lo:] = (((b > r + 8) | ((b >= r) & (r < 70) & (g < 70))) & (c[..., 3] > 0))[:, lo:]
    c[..., 3][m] = 0; stats['panel_px'] = stats.get('panel_px', 0) + n0 - int((c[..., 3] > 0).sum())

def clean_cell(c, stats, hole_max=6000):
    a = c[..., 3].astype(np.int32)
    solid = a > 128
    # 1. stray fragments
    lab, n = ndi.label(a > 24, structure=np.ones((3, 3)))
    if n > 1:
        sizes = ndi.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
        big = sizes.max()
        keep = np.zeros(n + 1, bool)
        main = (lab == (np.argmax(sizes) + 1))
        near_main = ndi.binary_dilation(main, iterations=2)
        for i, s in enumerate(sizes, 1):
            comp = lab == i
            if s >= 0.004 * big or (s >= 40 and (comp & near_main).any() and s >= 0.0008 * big):
                keep[i] = True
            else:
                stats['fragments'] += 1
        # thin tall slivers (flat panel edge seen in Y3) are removed even when large
        for i in range(1, n + 1):
            if not keep[i]:
                continue
            ys, xs = np.where(lab == i)
            w = xs.max() - xs.min() + 1; h = ys.max() - ys.min() + 1
            if w <= 14 and h >= 40 and sizes[i - 1] < 0.02 * big:
                keep[i] = False; stats['slivers'] += 1
        c[..., 3][~keep[lab]] = 0
        a = c[..., 3].astype(np.int32)
    # 2. enclosed holes
    solid = a > 128
    filled = ndi.binary_fill_holes(solid)
    holes = filled & ~solid
    hl, hn = ndi.label(holes)
    if hn:
        hs = ndi.sum(np.ones_like(hl), hl, index=np.arange(1, hn + 1))
        for i, s in enumerate(hs, 1):
            if s <= hole_max:
                m = hl == i
                c[..., 3][m] = 255
                stats['holes_px'] += int(s)
        # inpaint colour of the freshly opaque pixels from the nearest original solid pixel
        newly = (c[..., 3] == 255) & ~solid
        if newly.any():
            idx = ndi.distance_transform_edt(~solid, return_distances=False, return_indices=True)
            c[..., :3][newly] = c[idx[0][newly], idx[1][newly], :3]
    # 3. de-fringe
    a = c[..., 3].astype(np.int32)
    core = ndi.binary_erosion(a >= 250, iterations=2)
    edge = (a > 0) & ~core
    if core.any() and edge.any():
        idx = ndi.distance_transform_edt(~core, return_distances=False, return_indices=True)
        nearest = c[idx[0], idx[1], :3].astype(np.float32)
        orig = c[..., :3].astype(np.float32)
        before = ((lum(orig) > 150) & ((orig.max(axis=-1) - orig.min(axis=-1)) < 60) & edge).sum()
        # colour bleed from the body
        out = orig.copy(); out[edge] = nearest[edge]
        # fade residue that was clearly lighter than the body it sits on (white matte)
        sat = orig.max(axis=-1) - orig.min(axis=-1)
        bright = edge & (lum(orig) > lum(nearest) + 55) & (sat < 60)   # white/grey matte only; saturated red glow on claws is real
        newa = c[..., 3].astype(np.float32); newa[bright] *= 0.3
        c[..., :3] = np.clip(out, 0, 255).astype(np.uint8); c[..., 3] = newa.astype(np.uint8)
        stats['bright_edge_before'] += int(before); stats['bright_edge_faded'] += int(bright.sum())
    return c

def main(src, dst):
    meta = json.load(open(os.path.join(src, 'atlas.json')))
    os.makedirs(dst, exist_ok=True)
    out_meta = {}
    for name, m in meta.items():
        im = np.array(Image.open(os.path.join(src, m['src'])).convert('RGBA'))
        stats = dict(fragments=0, slivers=0, holes_px=0, bright_edge_before=0, bright_edge_faded=0)
        cw, ch = m['w'], m['h']
        for i in range(m['n']):
            x0 = (i % m['cols']) * cw; y0 = (i // m['cols']) * ch
            cell = im[y0:y0 + ch, x0:x0 + cw].copy()
            if name == 'Survivor_Use' and i == 2: drop_panel(cell, stats)
            im[y0:y0 + ch, x0:x0 + cw] = clean_cell(cell, stats)
        fn = name + '.webp'
        Image.fromarray(im, 'RGBA').save(os.path.join(dst, fn), 'WEBP', quality=92, alpha_quality=100, method=6)
        mm = dict(m); mm['src'] = fn; out_meta[name] = mm
        print(f"{name:18s} {os.path.getsize(os.path.join(dst, fn))//1024:5d} KB  {stats}")
    json.dump(out_meta, open(os.path.join(dst, 'atlas.json'), 'w'), indent=1)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
