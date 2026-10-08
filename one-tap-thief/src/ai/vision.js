// Vision cones: detection test + polygon used for drawing.
import { lineClear, sightBlocked } from '../game/grid.js';

export const D2R = Math.PI / 180;
export function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Can a viewer at (x,y) facing `face` (rad) see the thief? Returns distance or -1. */
export function seesPlayer(ctx, state, x, y, face, range, fovDeg, skip = 0.2) {
  const p = state.player;
  if (p.hidden || state.invuln > 0) return -1;
  const dx = p.x - x;
  const dy = p.y - y;
  const d = Math.hypot(dx, dy);
  if (d > range) return -1;
  if (d > 0.4 && Math.abs(normAngle(Math.atan2(dy, dx) - face)) > (fovDeg * D2R) / 2) return -1;
  return lineClear(ctx, state, x, y, p.x, p.y, skip) ? d : -1;
}

/** Polygon of the visible area (for rendering). Points are in tile coordinates. */
export function conePolygon(ctx, state, x, y, face, range, fovDeg, skip = 0.2, rays = 26) {
  const pts = [{ x, y }];
  const half = (fovDeg * D2R) / 2;
  for (let i = 0; i <= rays; i++) {
    const a = face - half + (i / rays) * half * 2;
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    let t = skip;
    for (; t < range; t += 0.1) {
      if (sightBlocked(ctx, state, Math.floor(x + cx * t), Math.floor(y + cy * t))) break;
    }
    t = Math.min(t, range);
    pts.push({ x: x + cx * t, y: y + cy * t });
  }
  return pts;
}
