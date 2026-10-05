"""Build the complete Etsy bundle: SVG, DXF, PNG preview, PDF instructions, zip.

    python3 build.py

Requires: fonttools shapely ezdxf reportlab pillow numpy
"""
import json
import os
import re
import shutil
import sys
import xml.etree.ElementTree as ET
import zipfile

import ezdxf

import designs
from qc import check_part

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BUNDLE_NAME = "Interchangeable-Welcome-Home-Sign-Bundle"
OUT = os.path.join(ROOT, BUNDLE_NAME)
CUT_COLOR, SCORE_COLOR = "#FF0000", "#0000FF"


def fmt(v):
    s = f"{v:.3f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def ring_d(ring):
    pts = ring[:-1] if ring[0] == ring[-1] else ring
    return "M" + " L".join(f"{fmt(x)},{fmt(y)}" for x, y in pts) + " Z"


def write_svg(p, path):
    w, h = p.size
    cut = " ".join(ring_d(r) for r in p.cut_rings())
    score = " ".join(ring_d(r) for r in p.score_rings())
    svg = f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="{fmt(w)}mm" height="{fmt(h)}mm" viewBox="0 0 {fmt(w)} {fmt(h)}">
  <title>{p.title} - Interchangeable Welcome Home Sign</title>
  <desc>Size {w / 25.4:.2f} x {h / 25.4:.2f} in ({fmt(w)} x {fmt(h)} mm). 1 unit = 1 mm. RED = cut (all closed paths, text converted to outlines). BLUE = optional score/engrave border (do not cut through). Personal and small-batch physical sales only - do not share or resell this file.</desc>
  <g id="CUT" fill="none" stroke="{CUT_COLOR}" stroke-width="0.1">
    <path id="{p.name}-cut" fill-rule="evenodd" d="{cut}"/>
  </g>
  <g id="SCORE-optional" fill="none" stroke="{SCORE_COLOR}" stroke-width="0.1">
    <path id="{p.name}-score" d="{score}"/>
  </g>
</svg>
'''
    with open(path, "w") as f:
        f.write(svg)


def write_dxf(p, path):
    doc = ezdxf.new("R2010", setup=False)
    doc.units = ezdxf.units.MM
    doc.header["$INSUNITS"] = 4
    doc.header["$MEASUREMENT"] = 1
    doc.layers.add("CUT", color=1)
    doc.layers.add("SCORE_OPTIONAL", color=5)
    msp = doc.modelspace()
    h = p.size[1]
    # DXF is y-up: flip so the part reads the right way round
    for ring in p.cut_rings():
        pts = [(x, h - y) for x, y in ring[:-1]]
        msp.add_lwpolyline(pts, close=True, dxfattribs={"layer": "CUT"})
    for ring in p.score_rings():
        pts = [(x, h - y) for x, y in ring[:-1]]
        msp.add_lwpolyline(pts, close=True, dxfattribs={"layer": "SCORE_OPTIONAL"})
    doc.saveas(path)


# --------------------------------------------------------------------------- file verification
def verify_svg(path, p):
    errs = []
    raw = open(path).read()
    for bad in ("<image", "<text", "clipPath", "<mask", "base64", "<use", "transform="):
        if bad in raw:
            errs.append(f"contains {bad}")
    root = ET.fromstring(raw)
    ns = "{http://www.w3.org/2000/svg}"
    w, h = p.size
    if root.get("width") != f"{fmt(w)}mm" or root.get("height") != f"{fmt(h)}mm":
        errs.append("width/height mismatch")
    n_sub = 0
    for el in root.iter(ns + "path"):
        d = el.get("d")
        subs = [s for s in re.split(r"(?=M)", d) if s.strip()]
        for s in subs:
            n_sub += 1
            if not s.strip().endswith("Z"):
                errs.append("open subpath")
        xs = [float(v) for v in re.findall(r"([-\d.]+),", d)]
        ys = [float(v) for v in re.findall(r",([-\d.]+)", d)]
        if min(xs) < -0.01 or min(ys) < -0.01 or max(xs) > w + 0.01 or max(ys) > h + 0.01:
            errs.append("path outside artboard")
    return errs, n_sub


def verify_dxf(path, p):
    errs = []
    doc = ezdxf.readfile(path)
    msp = doc.modelspace()
    ents = list(msp)
    if any(e.dxftype() != "LWPOLYLINE" for e in ents):
        errs.append("unexpected entity types")
    if not all(e.closed for e in ents):
        errs.append("open polyline")
    cut = [e for e in ents if e.dxf.layer == "CUT"]
    if len(cut) != len(p.cut_rings()):
        errs.append("cut contour count mismatch")
    xs = [pt[0] for e in cut for pt in e.get_points()]
    ys = [pt[1] for e in cut for pt in e.get_points()]
    w, h = p.size
    if abs((max(xs) - min(xs)) - w) > 0.05 or abs((max(ys) - min(ys)) - h) > 0.05:
        errs.append("extents mismatch")
    # duplicate contour check
    sigs = set()
    for e in ents:
        sig = (e.dxf.layer, len(e), round(sum(pt[0] for pt in e.get_points()), 2), round(sum(pt[1] for pt in e.get_points()), 2))
        if sig in sigs:
            errs.append("duplicate contour")
        sigs.add(sig)
    if doc.header.get("$INSUNITS") != 4:
        errs.append("units not mm")
    return errs, len(ents)


def main():
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    for sub in ("SVG", "DXF", "PNG", "Instructions"):
        os.makedirs(os.path.join(OUT, sub))

    parts = [fn() for fn in designs.ALL]
    report = []
    ok = True
    for p in parts:
        r = check_part(p)
        svg_path = os.path.join(OUT, "SVG", p.name + ".svg")
        dxf_path = os.path.join(OUT, "DXF", p.name + ".dxf")
        write_svg(p, svg_path)
        write_dxf(p, dxf_path)
        se, n_svg = verify_svg(svg_path, p)
        de, n_dxf = verify_dxf(dxf_path, p)
        r["errors"] += [f"SVG: {e}" for e in se] + [f"DXF: {e}" for e in de]
        r["svg_subpaths"], r["dxf_entities"] = n_svg, n_dxf
        r["hang_holes"] = [(round(x, 2), round(y, 2)) for x, y in p.hang_holes]
        r["ok"] = not r["errors"]
        ok &= r["ok"]
        report.append(r)
        print(f"{'OK ' if r['ok'] else 'ERR'} {p.name:20s} {r['size_mm']}  web>={r['min_web_mm']}  "
              f"holes={r['holes']}  {r['errors'] or ''} {r['warnings'] or ''}")

    import preview
    preview.render(parts, os.path.join(OUT, "PNG", "Product-Preview.png"))
    import instructions
    instructions.build(parts, os.path.join(OUT, "Instructions", "Read-Me.pdf"),
                       os.path.join(OUT, "PNG", "Product-Preview.png"))

    with open(os.path.join(HERE, "qc-report.json"), "w") as f:
        json.dump(report, f, indent=1)

    zpath = os.path.join(ROOT, BUNDLE_NAME + ".zip")
    if os.path.exists(zpath):
        os.remove(zpath)
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for dp, _, fns in os.walk(OUT):
            for fn in sorted(fns):
                full = os.path.join(dp, fn)
                z.write(full, os.path.relpath(full, ROOT))
    print("zip:", zpath, os.path.getsize(zpath) // 1024, "KB")
    if not ok:
        sys.exit("QC FAILED")


if __name__ == "__main__":
    main()
