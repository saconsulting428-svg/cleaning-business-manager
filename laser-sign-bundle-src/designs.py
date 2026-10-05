"""Design definitions: the main sign and the eight interchangeable pieces."""
from shapely.geometry import LineString, Polygon, box
from shapely.ops import unary_union

from geometry import (HANG_SPACING, IN, Part, arc_pts, circle, fonts, four_pane_window, heart, leaf_cluster,
                      loft_window, mirror_x, round_concave, round_convex, sprig, text)

PIECE_SCORE = 4.0
HANG_CLEAR = 10.5   # centre of hanging hole to outline


def _hang(part, cx):
    xs = (cx - HANG_SPACING / 2, cx + HANG_SPACING / 2)
    part.add_hang_holes(xs, round(part.hang_y(xs, HANG_CLEAR), 2))


def _text(part, label, s, font, cap, cx, baseline, max_w):
    glyphs, bb, used = text(s, font, cap, cx, baseline, max_w=max_w)
    part.add(label, unary_union(glyphs))
    return bb


def _room_right(part, y0, y1, clear):
    """Right-most x available between heights y0..y1, keeping `clear` mm inside the score border."""
    inner = part.silhouette.buffer(-(part.score_inset + clear))
    band = inner.intersection(box(-1, y0, 1e4, y1))
    xs = [inner.intersection(LineString([(-1, y), (1e4, y)])).bounds[2]
          for y in (y0, (y0 + y1) / 2, y1)]
    return min(xs)


def _flank_sprigs(part, bb, cx, cy, max_len, gap=7.0, bend=0.08, n=3, L=10.0, W=4.6, dy=0.0):
    """Leaf sprigs either side of a word, shortened automatically to fit inside the border."""
    x0 = bb[2] + gap
    limit = _room_right(part, cy - 10, cy + 10, 3.5)
    length = min(max_len, limit - x0 - L * 0.9)
    if length < 6:
        return
    if length < 30:
        stem = max(6.0, length + L * 0.9 - L * 0.95)
        right = leaf_cluster((x0, cy), stem, L=L, W=W)
    else:
        right = sprig((x0, cy + dy), (x0 + length, cy - dy), bend=-bend, n_leaves=n, L=L, W=W)
    part.add("sprig", right)
    part.add("sprig", mirror_x(right, cx))


# --------------------------------------------------------------------------- main sign
def main_sign():
    serif, sans = fonts()
    W, H = 12 * IN, 8 * IN
    cx = W / 2
    body = round_convex(box(0, 30, W, H), 10)
    gable = Polygon([(cx - 78, 31), (cx, 0), (cx + 78, 31)])
    chimney = box(cx - 56, 7, cx - 44, 30)
    sil = round_convex(unary_union([body, gable, chimney]), 2.0)
    sil = round_concave(sil, 2.0)
    p = Part("Main-Welcome-Sign", "WELCOME TO OUR HOME (main sign)", sil, 5.0, nominal=(W, H))
    p.score_base = round_concave(round_convex(unary_union([body, gable]), 2.0), 2.0)

    p.add("window", four_pane_window(cx, 22.5, pane=6.6, mull=2.6))
    bb = _text(p, "text", "WELCOME", serif, 31, cx, 76, max_w=236)
    bb2 = _text(p, "text", "TO OUR", sans, 12.5, cx, 98.5, max_w=120)
    # horizontal leaf flourishes either side of TO OUR
    y = (bb2[1] + bb2[3]) / 2
    right = sprig((bb2[2] + 8, y), (bb2[2] + 52, y), bend=0.0, n_leaves=4, L=9.5, W=4.4)
    p.add("sprig", right)
    p.add("sprig", mirror_x(right, cx))
    bb3 = _text(p, "text", "HOME", serif, 46, cx, 158, max_w=176)
    # rising sprigs beside HOME
    x0 = bb3[2] + 9
    x1 = min(x0 + 30, _room_right(p, bb3[1], bb3[3], 3.5) - 9)
    right = sprig((x0, bb3[3] - 1), (x1, bb3[1] + 6), bend=-0.2, n_leaves=4, L=10.5, W=4.8)
    p.add("sprig", right)
    p.add("sprig", mirror_x(right, cx))
    # small leaf garland at the bottom centre
    right = sprig((cx + 8, 176), (cx + 36, 176), bend=0.0, n_leaves=3, L=8.5, W=4.0)
    p.add("sprig", right)
    p.add("sprig", mirror_x(right, cx))
    p.add("dot", circle(cx, 176, 2.2))
    # wall-hanging holes (top corners) + accessory holes (bottom, 4 in apart)
    p.add_hang_holes([17.5, W - 17.5], 47.0)
    p.wall_holes = p.hang_holes[:]
    p.hang_holes = []
    p.add_hang_holes([cx - HANG_SPACING / 2, cx + HANG_SPACING / 2], 186.0)
    return p.build()


# --------------------------------------------------------------------------- pieces
def welcome():
    serif, _ = fonts()
    W, H = 8 * IN, 2.75 * IN
    cx, n = W / 2, 15
    sil = Polygon([(0, 0), (W, 0), (W - n, H / 2), (W, H), (0, H), (n, H / 2)])
    sil = round_concave(round_convex(sil, 1.6), 2.0)
    p = Part("Welcome", "WELCOME", sil, PIECE_SCORE, nominal=(W, H))
    _hang(p, cx)
    bb = _text(p, "text", "WELCOME", serif, 23, cx, H / 2 + 14.5, max_w=W - 2 * n - 40)
    p.add("dot", circle(bb[0] - 9, (bb[1] + bb[3]) / 2, 2.6))
    p.add("dot", circle(bb[2] + 9, (bb[1] + bb[3]) / 2, 2.6))
    return p.build()


def home():
    serif, _ = fonts()
    W, H = 7 * IN, 4 * IN
    cx, eave = W / 2, 42
    roof = Polygon([(0, eave + 6), (0, eave), (cx, 0), (W, eave), (W, eave + 6)])
    body = box(12, eave + 5, W - 12, H)
    chimney = box(cx + 40, 6, cx + 52, 30)
    sil = round_concave(round_convex(unary_union([roof, body, chimney]), 2.0), 2.0)
    p = Part("Home", "HOME", sil, PIECE_SCORE, nominal=(W, H))
    p.score_base = round_concave(round_convex(unary_union([roof, body]), 2.0), 2.0)
    _hang(p, cx)
    p.add("window", four_pane_window(cx, 24, pane=5.6, mull=2.4))
    bb = _text(p, "text", "HOME", serif, 28, cx, 88, max_w=W - 24 - 34)
    return p.build()


def family():
    serif, _ = fonts()
    W, H = 8 * IN, 3 * IN
    cx, rise = W / 2, 12
    # segmental arch top
    half = W / 2
    r = (half ** 2 + rise ** 2) / (2 * rise)
    import math
    a = math.asin(half / r)
    top = arc_pts(cx, r, r, -math.pi / 2 - a, -math.pi / 2 + a, 120)
    sil = Polygon([(0, H)] + [(0, top[0][1])] + top + [(W, top[-1][1]), (W, H)])
    sil = round_convex(sil, 6)
    p = Part("Family", "FAMILY", sil, PIECE_SCORE, nominal=(W, H))
    _hang(p, cx)
    bb = _text(p, "text", "FAMILY", serif, 22, cx, 54, max_w=120)
    cy = (bb[1] + bb[3]) / 2
    _flank_sprigs(p, bb, cx, cy, 26, n=3, L=9, W=4.3, dy=3)
    return p.build()


def gather():
    serif, _ = fonts()
    W, H = 8 * IN, 2.75 * IN
    cx, r = W / 2, 11
    sil = box(0, 0, W, H)
    for x in (0, W):
        for y in (0, H):
            sil = sil.difference(circle(x, y, r))
    p = Part("Gather", "GATHER", sil, PIECE_SCORE, nominal=(W, H))
    _hang(p, cx)
    bb = _text(p, "text", "GATHER", serif, 22, cx, H / 2 + 15, max_w=122)
    cy = (bb[1] + bb[3]) / 2
    _flank_sprigs(p, bb, cx, cy, 22, n=2, L=8.5, W=4.2, dy=2)
    return p.build()


def hello():
    serif, _ = fonts()
    W, H = 7 * IN, 2.5 * IN
    cx = W / 2
    sil = box(H / 2, 0, W - H / 2, H).union(circle(H / 2, H / 2, H / 2)).union(circle(W - H / 2, H / 2, H / 2))
    p = Part("Hello", "HELLO", sil, PIECE_SCORE, nominal=(W, H))
    _hang(p, cx)
    bb = _text(p, "text", "HELLO", serif, 23, cx, H / 2 + 15, max_w=110)
    cy = (bb[1] + bb[3]) / 2
    _flank_sprigs(p, bb, cx, cy, 15, n=1, L=8, W=4.0, dy=1.5, gap=6)
    return p.build()


def farm():
    serif, _ = fonts()
    W, H = 7 * IN, 4 * IN
    cx = W / 2
    eave = 50
    sil = Polygon([(0, H), (0, eave), (26, 17), (cx, 0), (W - 26, 17), (W, eave), (W, H)])
    sil = round_concave(round_convex(sil, 2.5), 2.0)
    p = Part("Farm", "FARM", sil, PIECE_SCORE, nominal=(W, H))
    _hang(p, cx)
    p.add("window", loft_window(cx, 26, s=18, bar=2.8))
    bb = _text(p, "text", "FARM", serif, 30, cx, 88, max_w=W - 40)
    return p.build()


def our_home():
    serif, _ = fonts()
    W, H = 9 * IN, 3 * IN
    cx = W / 2
    body = round_convex(box(0, 16, W, H), 7)
    gable = Polygon([(cx - 50, 17), (cx, 0), (cx + 50, 17)])
    sil = round_concave(round_convex(unary_union([body, gable]), 2.0), 2.0)
    p = Part("Our-Home", "OUR HOME", sil, PIECE_SCORE, nominal=(W, H))
    _hang(p, cx)
    bb = _text(p, "text", "OUR HOME", serif, 22, cx, 58, max_w=165)
    cy = (bb[1] + bb[3]) / 2
    _flank_sprigs(p, bb, cx, cy, 16, n=1, L=8, W=4.0, dy=1.5, gap=6)
    return p.build()


def love_grows_here():
    import math
    serif, _ = fonts()
    W, H = 8 * IN, 4 * IN
    cx, rise = W / 2, 16
    half = W / 2
    r = (half ** 2 + rise ** 2) / (2 * rise)
    a = math.asin(half / r)
    top = arc_pts(cx, r, r, -math.pi / 2 - a, -math.pi / 2 + a, 120)
    sil = Polygon([(0, H)] + [(0, top[0][1])] + top + [(W, top[-1][1]), (W, H)])
    sil = round_convex(sil, 6)
    p = Part("Love-Grows-Here", "LOVE GROWS HERE", sil, PIECE_SCORE, nominal=(W, H))
    _hang(p, cx)
    bb1 = _text(p, "text", "LOVE GROWS", serif, 19, cx, 54, max_w=170)
    bb2 = _text(p, "text", "HERE", serif, 19, cx, 84, max_w=100)
    cy = (bb2[1] + bb2[3]) / 2
    _flank_sprigs(p, bb2, cx, cy, 34, n=3, L=9, W=4.3, dy=2.5)
    p.add("heart", heart(cx, 20, 9))
    return p.build()


ALL = [main_sign, welcome, home, family, gather, hello, farm, our_home, love_grows_here]
