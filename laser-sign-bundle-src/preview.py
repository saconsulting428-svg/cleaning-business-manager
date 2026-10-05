"""Etsy-style product mockup rendered straight from the cut geometry."""
import os

import numpy as np
from fontTools.ttLib import TTFont
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from geometry import FONT_SANS, FONT_SERIF

TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".cache")
RNG = np.random.default_rng(7)


def ttf(path):
    os.makedirs(TMP, exist_ok=True)
    out = os.path.join(TMP, os.path.basename(path).replace(".woff", ".ttf"))
    if not os.path.exists(out):
        f = TTFont(path)
        f.flavor = None
        f.save(out)
    return out


def smooth_noise(h, w, cell, cell_x=None):
    cx = cell_x or cell
    small = RNG.random((max(2, h // cell + 2), max(2, w // cx + 2)))
    im = Image.fromarray((small * 255).astype(np.uint8)).resize(
        ((small.shape[1] - 1) * cx, (small.shape[0] - 1) * cell), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32)[:h, :w] / 255.0


def wood(h, w, base=(201, 158, 108)):
    y = np.arange(h, dtype=np.float32)[:, None]
    x = np.arange(w, dtype=np.float32)[None, :]
    # birch-ply look: long, gently wandering horizontal grain lines
    warp = smooth_noise(h, w, 60, 700) * 30 + smooth_noise(h, w, 12, 160) * 3
    grain = np.sin((y + warp) * 0.42) * 0.5 + 0.5
    grain = grain ** 3
    streak = smooth_noise(h, w, 2, 90)
    shade = 0.90 + 0.07 * grain + 0.05 * streak + 0.05 * smooth_noise(h, w, 200, 500)
    img = np.stack([np.clip(base[i] * shade, 0, 255) for i in range(3)], axis=-1)
    return Image.fromarray(img.astype(np.uint8))


def wall(w, h):
    base = np.array([238, 233, 224], dtype=np.float32)
    n = smooth_noise(h, w, 6) * 0.03 + smooth_noise(h, w, 120) * 0.04
    img = base[None, None, :] * (0.95 + n[..., None])
    board = 260
    for x0 in range(0, w, board):
        img[:, x0:x0 + 3] *= 0.80
        img[:, x0 + 3:x0 + 6] *= 1.02
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def part_mask(p, s, ss=3):
    w, h = p.size
    W, H = int(w * s) + 4, int(h * s) + 4
    m = Image.new("L", (W * ss, H * ss), 0)
    d = ImageDraw.Draw(m)
    rings = p.cut_rings()
    tr = lambda r: [((x * s + 2) * ss, (y * s + 2) * ss) for x, y in r]
    d.polygon(tr(rings[0]), fill=255)
    for r in rings[1:]:
        d.polygon(tr(r), fill=0)
    score = Image.new("L", m.size, 0)
    ds = ImageDraw.Draw(score)
    for r in p.score_rings():
        ds.line(tr(r), fill=255, width=max(2, int(0.55 * s * ss)))
    return m.resize((W, H), Image.LANCZOS), score.resize((W, H), Image.LANCZOS)


def place(canvas, p, s, x, y, tint=(201, 158, 108)):
    mask, score = part_mask(p, s)
    W, H = mask.size
    # drop shadow on the wall
    sh = Image.new("L", canvas.size, 0)
    sh.paste(mask, (x + int(s * 2.2), y + int(s * 3.2)))
    sh = sh.filter(ImageFilter.GaussianBlur(s * 2.2))
    dark = Image.new("RGB", canvas.size, (70, 55, 40))
    canvas.paste(dark, (0, 0), sh.point(lambda v: int(v * 0.42)))
    # wood with laser-darkened edges
    tex = wood(H, W, tint)
    edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(5)))
    tex = Image.composite(Image.new("RGB", (W, H), (92, 58, 30)), tex, edge.point(lambda v: int(v * 0.85)))
    tex = Image.composite(Image.new("RGB", (W, H), (120, 80, 45)), tex, score.point(lambda v: int(v * 0.7)))
    canvas.paste(tex, (x, y), mask)
    return W, H


def jump_ring(d, cx, cy, r, s):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(150, 150, 150), width=max(3, int(s * 0.9)))
    d.arc([cx - r, cy - r, cx + r, cy + r], 200, 300, fill=(225, 225, 225), width=max(2, int(s * 0.4)))


def render(parts, out_path):
    by = {p.name: p for p in parts}
    CW, CH = 3000, 2250
    canvas = wall(CW, CH)
    d = ImageDraw.Draw(canvas)
    serif_f = ttf(FONT_SERIF)
    sans_f = ttf(FONT_SANS)

    # ---- main sign + one hanging piece at true relative scale
    s = 4.6
    main = by["Main-Welcome-Sign"]
    mx, my = 150, 360
    mw, mh = place(canvas, main, s, mx, my)
    # twine to a nail
    nail = (mx + mw // 2, my - 150)
    for hx, hy in main.wall_holes:
        d.line([nail, (mx + hx * s, my + hy * s)], fill=(160, 130, 95), width=5)
    d.ellipse([nail[0] - 12, nail[1] - 12, nail[0] + 12, nail[1] + 12], fill=(90, 90, 90))
    hang = by["Family"]
    gap = 12  # mm between the bottom of the sign and the top of the piece
    py = int(my + (main.size[1] + gap) * s)
    pw, ph = hang.size[0] * s, hang.size[1] * s
    px = int(mx + mw / 2 - pw / 2)
    place(canvas, hang, s, px, py)
    for (ax, ay), (bx, by_) in zip(main.hang_holes, hang.hang_holes):
        top = (mx + ax * s, my + ay * s)
        bot = (px + bx * s, py + by_ * s)
        jump_ring(d, top[0], top[1] + 12, 14, s)
        jump_ring(d, bot[0], bot[1] - 12, 14, s)
        # short chain between the two rings
        y = top[1] + 26
        while y < bot[1] - 30:
            d.ellipse([top[0] - 6, y, top[0] + 6, y + 18], outline=(140, 140, 140), width=3)
            y += 14

    # ---- swap-in pieces column
    s2 = 2.05
    col_x = 1690
    title = ImageFont.truetype(serif_f, 54)
    d.text((col_x + 30, 300), "SWAP IN ANY PIECE", font=title, fill=(70, 62, 52))
    names = ["Welcome", "Home", "Gather", "Hello", "Farm", "Our-Home", "Love-Grows-Here"]
    cells = [(0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2), (0, 3)]
    cw, rh = 640, 400
    for name, (cx, cy) in zip(names, cells):
        p = by[name]
        w, h = p.size[0] * s2, p.size[1] * s2
        x0 = int(col_x + 10 + cx * cw + (cw - w) / 2)
        y0 = int(420 + cy * rh + (rh - 40 - h) / 2)
        place(canvas, p, s2, x0, y0)
    lab = ImageFont.truetype(sans_f, 40)
    d.text((col_x + 10 + cw + 60, 420 + 3 * rh + 110), "+ FAMILY (shown hanging)", font=lab, fill=(95, 85, 72))

    # ---- header + footer bands
    band = Image.new("RGB", (CW, 210), (58, 64, 58))
    canvas.paste(band, (0, 0))
    h1 = ImageFont.truetype(serif_f, 92)
    h2 = ImageFont.truetype(sans_f, 44)
    t = "INTERCHANGEABLE WELCOME HOME SIGN"
    tw = d.textlength(t, font=h1)
    d.text(((CW - tw) / 2, 28), t, font=h1, fill=(245, 239, 228))
    t2 = "LASER CUT SVG + DXF BUNDLE  •  MAIN SIGN 12 × 8 IN  •  8 SWAP-IN WORD PIECES"
    tw = d.textlength(t2, font=h2)
    d.text(((CW - tw) / 2, 140), t2, font=h2, fill=(214, 200, 176))
    foot = Image.new("RGB", (CW, 120), (58, 64, 58))
    canvas.paste(foot, (0, CH - 120))
    f3 = ImageFont.truetype(sans_f, 42)
    t3 = ("DIGITAL FILES ONLY — NO PHYSICAL ITEM SHIPPED   •   SVG • DXF • PNG • PDF GUIDE"
          "   •   DESIGNED FOR 3 MM (1/8 IN) MATERIAL")
    tw = d.textlength(t3, font=f3)
    d.text(((CW - tw) / 2, CH - 88), t3, font=f3, fill=(235, 228, 214))
    canvas.save(out_path, optimize=True)
