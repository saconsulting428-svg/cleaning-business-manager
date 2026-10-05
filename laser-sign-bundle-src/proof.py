"""Render quick proof images of each part (for design review only, not shipped)."""
import os
import sys

from PIL import Image, ImageDraw

import designs
from qc import check_part

OUT = sys.argv[1] if len(sys.argv) > 1 else "proofs"
os.makedirs(OUT, exist_ok=True)
S = 5  # px per mm

for fn in designs.ALL:
    p = fn()
    r = check_part(p)
    print(r)
    w, h = p.size
    im = Image.new("RGB", (int(w * S) + 40, int(h * S) + 40), "white")
    d = ImageDraw.Draw(im)
    tr = lambda pts: [(x * S + 20, y * S + 20) for x, y in pts]
    if r["errors"]:
        print("  !!", p.name, r["errors"])
        continue
    rings = p.cut_rings()
    d.polygon(tr(rings[0]), fill=(196, 160, 118))
    for ring in rings[1:]:
        d.polygon(tr(ring), fill="white")
    for ring in rings:
        d.line(tr(ring), fill=(200, 0, 0), width=1)
    for ring in p.score_rings():
        d.line(tr(ring), fill=(0, 0, 220), width=1)
    im.save(os.path.join(OUT, p.name + ".png"))
