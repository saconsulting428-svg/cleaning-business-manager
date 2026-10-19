import { COLORS, shade } from './theme.js';

const clampR = (r, w, h) => Math.max(1, Math.min(r, w / 2, h / 2));

/**
 * Chunky cartoon rounded rectangle centred on (cx, cy): drop shadow, thick ink outline,
 * darker bottom "lip" for the 3D look and a soft top shine.
 */
export function roundedBox(g, cx, cy, w, h, r, color, o = {}) {
  const ow = o.ow ?? 6;
  const lip = o.lip ?? 8;
  const outline = o.outline ?? COLORS.ink;
  const x = cx - w / 2, y = cy - h / 2;
  r = clampR(r, w, h);
  if (o.shadow !== false) {
    g.fillStyle(COLORS.ink, 0.25);
    g.fillRoundedRect(x + 2, y + ow * 0.8 + 6, w, h, r);
  }
  g.fillStyle(outline, 1);
  g.fillRoundedRect(x, y, w, h, r);
  const ix = x + ow, iy = y + ow, iw = w - ow * 2, ih = h - ow * 2;
  const ir = clampR(r - ow * 0.5, iw, ih);
  if (lip > 0) {
    g.fillStyle(shade(color, -0.3), 1);
    g.fillRoundedRect(ix, iy, iw, ih, ir);
  }
  g.fillStyle(color, 1);
  g.fillRoundedRect(ix, iy, iw, Math.max(4, ih - lip), ir);
  if (o.shine !== false) {
    g.fillStyle(COLORS.white, 0.3);
    g.fillRoundedRect(ix + ow, iy + ow * 0.5, iw - ow * 2, Math.max(4, (ih - lip) * 0.26), clampR(ir * 0.6, iw, ih));
  }
}

/** Same look as roundedBox but a circle. */
export function roundedCircle(g, cx, cy, rad, color, o = {}) {
  const ow = o.ow ?? 6;
  const lip = o.lip ?? 8;
  if (o.shadow !== false) {
    g.fillStyle(COLORS.ink, 0.25);
    g.fillCircle(cx + 2, cy + ow * 0.8 + 6, rad);
  }
  g.fillStyle(o.outline ?? COLORS.ink, 1);
  g.fillCircle(cx, cy, rad);
  g.fillStyle(shade(color, -0.3), 1);
  g.fillCircle(cx, cy, rad - ow);
  g.fillStyle(color, 1);
  g.fillCircle(cx, cy - lip / 2, rad - ow - lip / 2 + 1);
  if (o.shine !== false) {
    g.fillStyle(COLORS.white, 0.3);
    g.fillEllipse(cx, cy - rad * 0.45, rad * 1.1, rad * 0.5);
  }
}
