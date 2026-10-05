"""Manufacturability checks run on every part before files are written."""
import itertools

from shapely.geometry import LinearRing, Polygon
from shapely.strtree import STRtree

from geometry import MIN_WEB, polys


def check_part(p, min_web=MIN_WEB, min_score_gap=2.5):
    res = {"name": p.name, "errors": [], "warnings": []}
    part = p.part
    if not part.is_valid:
        res["errors"].append("invalid geometry")
    pieces = polys(part)
    if len(pieces) != 1:
        areas = sorted((round(q.area, 2) for q in pieces), reverse=True)
        res["errors"].append(f"part splits into {len(pieces)} pieces (islands would fall out): {areas[:6]}")
    poly = pieces[0] if len(pieces) == 1 else max(pieces, key=lambda q: q.area)

    rings = [LinearRing(poly.exterior.coords)] + [LinearRing(r.coords) for r in poly.interiors]
    for r in rings:
        if not r.is_closed:
            res["errors"].append("open contour")
        if not r.is_simple:
            res["errors"].append("self-intersecting contour")

    # material web between any two distinct cut contours
    tree = STRtree(rings)
    min_d, where = 1e9, None
    for i, r in enumerate(rings):
        for j in tree.query(r.buffer(min_web * 3)):
            if j <= i:
                continue
            d = r.distance(rings[j])
            if d < min_d:
                min_d, where = d, rings[j].centroid
    res["min_web_mm"] = round(min_d, 2)
    if min_d < min_web - 0.02:
        res["errors"].append(f"web {min_d:.2f} mm < {min_web} mm near ({where.x:.1f},{where.y:.1f})")

    # thin peninsulas / necks inside one contour: morphological opening
    r = min_web / 2 * 0.95
    opened = poly.buffer(-r, quad_segs=8).buffer(r, quad_segs=8)
    lost = poly.difference(opened)
    thin = [q for q in polys(lost) if q.area > 1.5 and q.minimum_rotated_rectangle.length > 0
            and (q.area / max(1e-6, max_dim(q))) > 0.35]
    if thin:
        c = thin[0].centroid
        res["warnings"].append(f"{len(thin)} thin region(s), e.g. at ({c.x:.1f},{c.y:.1f}) area {thin[0].area:.1f}")

    # holes: count and smallest
    hole_areas = [Polygon(r).area for r in poly.interiors]
    res["holes"] = len(hole_areas)
    res["smallest_hole_mm2"] = round(min(hole_areas), 2) if hole_areas else None

    # score line clearance
    if p.score is not None:
        sr = [LinearRing(q.exterior.coords) for q in polys(p.score)]
        if len(sr) != 1:
            res["errors"].append("score outline not a single closed loop")
        sd = min(s.distance(c) for s in sr for c in rings)
        res["score_clearance_mm"] = round(sd, 2)
        if sd < min_score_gap:
            res["errors"].append(f"score line only {sd:.2f} mm from a cut")
    w, h = p.size
    res["size_mm"] = (round(w, 2), round(h, 2))
    return res


def max_dim(q):
    minx, miny, maxx, maxy = q.bounds
    return max(maxx - minx, maxy - miny)
