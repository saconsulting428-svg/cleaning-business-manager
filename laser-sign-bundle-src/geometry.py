"""Cut-geometry builder for the Interchangeable Welcome Home Sign bundle.

All coordinates are millimetres, origin at the top-left of each part, y pointing
down (SVG convention). Every part is a single through-cut piece: an outer
silhouette with holes (text, leaves, windows, hanging holes). Text is converted
to outlines and stencil bridges are added so no counter (inside of O, A, R...)
becomes a loose island.
"""
import math
import os

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_SERIF = os.path.join(HERE, "fonts", "cinzel-latin-900-normal.woff")
FONT_SANS = os.path.join(HERE, "fonts", "josefin-sans-latin-700-normal.woff")

IN = 25.4
HANG_HOLE_D = 5.0          # hanging hole diameter (mm)
HANG_SPACING = 4 * IN      # identical on main sign and every piece -> interchangeable
MIN_WEB = 2.2              # smallest allowed material web between two cuts (mm)
MIN_LETTER_GAP = 3.0       # material left between neighbouring letters (mm)


# --------------------------------------------------------------------------- helpers
def polys(geom):
    if geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [geom]
    return [g for g in getattr(geom, "geoms", []) if isinstance(g, Polygon) and not g.is_empty]


def round_convex(g, r):
    return g.buffer(-r, quad_segs=24).buffer(r, quad_segs=24)


def round_concave(g, r):
    return g.buffer(r, quad_segs=24).buffer(-r, quad_segs=24)


def circle(cx, cy, r):
    return Point(cx, cy).buffer(r, quad_segs=48)


def qbez(p0, p1, p2, n=60):
    pts = []
    for i in range(n + 1):
        t = i / n
        a, b, c = (1 - t) ** 2, 2 * (1 - t) * t, t * t
        pts.append((a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]))
    return pts


def arc_pts(cx, cy, r, a0, a1, n=80):
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n), cy + r * math.sin(a0 + (a1 - a0) * i / n))
            for i in range(n + 1)]


# --------------------------------------------------------------------------- fonts
class _FlattenPen(BasePen):
    def __init__(self, glyphset, steps=28):
        super().__init__(glyphset)
        self.contours, self.cur, self.steps = [], [], steps

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            mt = 1 - t
            self.cur.append((mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0],
                             mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1]))

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            mt = 1 - t
            self.cur.append((mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
                             mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]))

    def _closePath(self):
        if len(self.cur) >= 3:
            self.contours.append(self.cur)
        self.cur = []

    _endPath = _closePath


class Font:
    def __init__(self, path):
        self.tt = TTFont(path)
        self.gs = self.tt.getGlyphSet()
        self.cmap = self.tt.getBestCmap()
        self.cap = self.tt["OS/2"].sCapHeight
        self._cache = {}

    def glyph(self, ch):
        """Glyph outline in font units (y up) as a shapely geometry, nonzero fill."""
        if ch in self._cache:
            return self._cache[ch]
        name = self.cmap[ord(ch)]
        pen = _FlattenPen(self.gs)
        self.gs[name].draw(pen)
        rings = []
        for c in pen.contours:
            p = Polygon(c)
            if not p.is_valid:
                p = p.buffer(0)
            area = Polygon(c).area if Polygon(c).is_valid else p.area
            # signed area via shoelace
            s = sum(c[i][0] * c[(i + 1) % len(c)][1] - c[(i + 1) % len(c)][0] * c[i][1] for i in range(len(c))) / 2
            rings.append((s, p))
        geom = Polygon()
        if rings:
            outer_sign = math.copysign(1, max(rings, key=lambda r: abs(r[0]))[0])
            outer = unary_union([p for s, p in rings if math.copysign(1, s) == outer_sign])
            inner = unary_union([p for s, p in rings if math.copysign(1, s) != outer_sign])
            geom = outer.difference(inner) if not inner.is_empty else outer
        adv = self.tt["hmtx"][name][0]
        self._cache[ch] = (geom, adv)
        return geom, adv


SERIF = None
SANS = None


def fonts():
    global SERIF, SANS
    if SERIF is None:
        SERIF, SANS = Font(FONT_SERIF), Font(FONT_SANS)
    return SERIF, SANS


# --------------------------------------------------------------------------- stencil bridges
def add_bridges(glyph, cap):
    """Cut bridges through the strokes around every counter so it stays attached."""
    b = max(2.2, min(3.2, cap * 0.075))
    m = cap * 0.45
    out = glyph
    # open up tiny counters (e.g. the eye of a heavy "A") so the material island they leave
    # is at least ~2.8 mm wide instead of a fragile sliver
    for poly in polys(glyph):
        for ring in poly.interiors:
            counter = Polygon(ring)
            grown = counter
            for _ in range(6):
                if not grown.buffer(-1.8).is_empty:
                    break
                grown = grown.buffer(0.35, join_style=2)
            if grown is not counter:
                out = out.difference(grown)
    glyph = out
    report = []
    for poly in polys(glyph):
        for ring in poly.interiors:
            counter = Polygon(ring)
            cx = counter.centroid.x
            cy = counter.centroid.y
            minx, miny, maxx, maxy = counter.bounds
            made = 0
            for up in (True, False):
                strip = box(cx - b / 2, miny - m, cx + b / 2, cy) if up else box(cx - b / 2, cy, cx + b / 2, maxy + m)
                for comp in polys(out.intersection(strip)):
                    if comp.distance(counter) > 1e-3:
                        continue
                    # the bridge must pass fully through the stroke, never just notch it
                    if up and comp.bounds[1] <= strip.bounds[1] + 1e-3:
                        continue
                    if not up and comp.bounds[3] >= strip.bounds[3] - 1e-3:
                        continue
                    out = out.difference(comp.buffer(1e-3, join_style=2))
                    made += 1
            report.append(made)
            if made == 0:
                raise RuntimeError("could not bridge a counter")
    # drop slivers created by bridging
    out = unary_union([p for p in polys(out) if p.area > 0.6])
    return out, report


# --------------------------------------------------------------------------- text
def text(s, font, cap, cx, baseline, max_w=None, gap=MIN_LETTER_GAP, tracking=0.04):
    """Lay out a single line of text centred on cx. Returns (list of glyph geoms, bbox)."""
    for _ in range(40):
        sc = cap / font.cap
        x = 0.0
        placed = []
        prev = None
        for ch in s:
            g, adv = font.glyph(ch)
            if ch == " " or g.is_empty:
                x += adv * sc
                prev = None
                continue
            gg = affinity.scale(g, sc, -sc, origin=(0, 0))
            # close hair-line material gaps (e.g. a nearly-closed R bowl) so they become proper
            # counters that receive a stencil bridge, instead of a fragile sliver connection
            gg = round_concave(gg, 0.75)
            gg, _ = add_bridges(gg, cap)
            gg = affinity.translate(gg, x, 0)
            x0 = x
            if prev is not None:
                shift = 0.0
                for _i in range(20):
                    d = prev.distance(affinity.translate(gg, shift, 0))
                    if d >= gap - 1e-3:
                        break
                    shift += (gap - d) + 0.05
                gg = affinity.translate(gg, shift, 0)
                x += shift
            placed.append(gg)
            prev = gg
            x += adv * sc + tracking * cap
        allg = unary_union(placed)
        minx, miny, maxx, maxy = allg.bounds
        w = maxx - minx
        if max_w and w > max_w:
            cap *= (max_w / w) * 0.995
            continue
        dx = cx - (minx + maxx) / 2
        placed = [affinity.translate(p, dx, baseline) for p in placed]
        bb = unary_union(placed).bounds
        return placed, bb, cap
    raise RuntimeError("text fit failed")


# --------------------------------------------------------------------------- ornaments
def leaf(base, angle, L, W):
    pts_top, pts_bot = [], []
    n = 40
    for i in range(n + 1):
        t = i / n
        hw = (W / 2) * math.sin(math.pi * t ** 0.85)
        pts_top.append((t * L, -hw))
        pts_bot.append((t * L, hw))
    poly = Polygon(pts_top + pts_bot[::-1][1:-1])
    poly = affinity.rotate(poly, angle, origin=(0, 0), use_radians=False)
    return affinity.translate(poly, base[0], base[1])


def sprig(p0, p2, bend=0.18, n_leaves=4, L=11.0, W=5.0, stem=2.2, leaf_angle=44, first_side=1, tip=True):
    """A stem from p0 to p2 with alternating leaves, returned as one hole geometry."""
    mx, my = (p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2
    dx, dy = p2[0] - p0[0], p2[1] - p0[1]
    ln = math.hypot(dx, dy)
    nx, ny = -dy / ln, dx / ln
    p1 = (mx + nx * bend * ln, my + ny * bend * ln)
    pts = qbez(p0, p1, p2)
    line = LineString(pts)
    parts = [line.buffer(stem / 2, quad_segs=16)]
    side = first_side
    for i in range(n_leaves):
        t = 0.22 + 0.62 * i / max(1, n_leaves - 1)
        d = line.length * t
        pa = line.interpolate(d)
        pb = line.interpolate(min(line.length, d + 0.5))
        ang = math.degrees(math.atan2(pb.y - pa.y, pb.x - pa.x))
        parts.append(leaf((pa.x, pa.y), ang + side * leaf_angle, L, W))
        side = -side
    if tip:
        pa = line.interpolate(line.length - 0.6)
        pb = line.interpolate(line.length)
        ang = math.degrees(math.atan2(pb.y - pa.y, pb.x - pa.x))
        parts.append(leaf((pa.x, pa.y), ang, L * 1.05, W * 1.05))
    return unary_union(parts)


def leaf_cluster(base, length, L=9.0, W=4.6, stem=2.2, spread=46):
    """Short horizontal stem ending in three leaves (pointing +x); for tight spaces."""
    x0, y0 = base
    end = (x0 + length, y0)
    parts = [LineString([base, end]).buffer(stem / 2, quad_segs=16),
             leaf(end, 0, L, W * 1.05),
             leaf((x0 + length * 0.55, y0), -spread, L * 0.85, W * 0.95),
             leaf((x0 + length * 0.55, y0), spread, L * 0.85, W * 0.95)]
    return unary_union(parts)


def mirror_x(g, cx):
    return affinity.scale(g, -1, 1, origin=(cx, 0))


def four_pane_window(cx, cy, pane=7.0, mull=2.6):
    o = pane + mull / 2
    return unary_union([box(cx + sx * mull / 2, cy + sy * mull / 2, cx + sx * o, cy + sy * o).buffer(0)
                        for sx in (-1, 1) for sy in (-1, 1)]).buffer(0.6, quad_segs=6).buffer(-0.6)


def loft_window(cx, cy, s=20.0, bar=3.0):
    sq = box(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2)
    d1 = LineString([(cx - s, cy - s), (cx + s, cy + s)]).buffer(bar / 2, cap_style=2)
    d2 = LineString([(cx - s, cy + s), (cx + s, cy - s)]).buffer(bar / 2, cap_style=2)
    return sq.difference(d1).difference(d2)


def heart(cx, cy, size):
    pts = []
    for i in range(200):
        t = 2 * math.pi * i / 200
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * size / 32, cy - y * size / 32))
    return Polygon(pts)


# --------------------------------------------------------------------------- part model
class Part:
    def __init__(self, name, title, silhouette, score_inset, nominal=None):
        self.name, self.title = name, title
        if nominal:
            # snap the outline to its exact nominal size (corrects tiny losses from corner rounding)
            minx, miny, maxx, maxy = silhouette.bounds
            silhouette = affinity.scale(silhouette, nominal[0] / (maxx - minx), nominal[1] / (maxy - miny),
                                        origin=(minx, miny))
            silhouette = affinity.translate(silhouette, -minx, -miny)
        self.silhouette = silhouette
        self.score_inset = score_inset
        self.score_base = None   # optional outline (e.g. without chimney) used for the score border
        self.holes = []          # list of (label, geometry)
        self.hang_holes = []     # centres

    def add(self, label, geom):
        self.holes.append((label, geom))

    def add_hang_holes(self, xs, y):
        for x in xs:
            self.hang_holes.append((x, y))
            self.add("hang", circle(x, y, HANG_HOLE_D / 2))

    def hang_y(self, xs, clearance):
        """Lowest-needed y so a hanging hole at each x sits `clearance` inside the outline."""
        inner = self.silhouette.buffer(-clearance)
        ys = []
        for x in xs:
            seg = inner.intersection(LineString([(x, -1000), (x, 1000)]))
            ys.append(seg.bounds[1])
        return max(ys)

    def build(self):
        hole_geom = unary_union([g for _, g in self.holes])
        # soften inside corners of the holes (= sharp material spikes) with a 0.6 mm radius
        hole_geom = round_concave(hole_geom, 0.6)
        self.part = self.silhouette.difference(hole_geom)
        self.score = None
        if self.score_inset:
            base = self.score_base if self.score_base is not None else self.silhouette
            sc = base.buffer(-self.score_inset, join_style=2, mitre_limit=3.0)
            # drop narrow channels (e.g. inside a chimney) so the border stays one clean loop
            sc = round_convex(sc, 3.5)
            self.score = max(polys(sc), key=lambda q: q.area)
        return self

    @property
    def size(self):
        minx, miny, maxx, maxy = self.silhouette.bounds
        return maxx - minx, maxy - miny

    def cut_rings(self):
        p = self.part.simplify(0.01, preserve_topology=True)
        return [list(p.exterior.coords)] + [list(r.coords) for r in p.interiors]

    def score_rings(self):
        if self.score is None:
            return []
        return [list(q.exterior.coords) for q in polys(self.score.simplify(0.01))]
