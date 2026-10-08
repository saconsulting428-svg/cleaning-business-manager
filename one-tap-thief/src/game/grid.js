// Tile grid: parsing level maps, path finding and line of sight.
export const K = { FLOOR: 0, WALL: 1, FURN: 2, HIDE: 3, ALARM: 4, DOOR: 5, EXIT: 6 };
const CHAR = { '#': K.WALL, F: K.FURN, H: K.HIDE, A: K.ALARM, D: K.DOOR, E: K.EXIT };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Turn a level definition (see levels/levels.js) into static, read-only context. */
export function buildContext(def, world) {
  const rows = def.map;
  const h = rows.length;
  const w = rows[0].length;
  const kind = new Uint8Array(w * h);
  const items = [];
  const doors = [];
  const doorAt = new Map();
  let start = null;
  let exit = null;
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Level ${def.level}: row ${y} has width ${row.length}, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const c = row[x];
      let k = K.FLOOR;
      if (c in CHAR) k = CHAR[c];
      else if (c === 'S') start = { x, y };
      else if (c === 'L' || c === 'R' || c === 'K') {
        items.push({ id: items.length, type: c === 'L' ? 'loot' : c === 'R' ? 'rare' : 'key', x, y });
      }
      if (k === K.EXIT) exit = { x, y };
      if (k === K.DOOR) { doorAt.set(y * w + x, doors.length); doors.push({ x, y }); }
      kind[y * w + x] = k;
    }
  });
  if (!start) throw new Error(`Level ${def.level}: missing start 'S'`);
  if (!exit) throw new Error(`Level ${def.level}: missing exit 'E'`);
  const lootCount = items.filter((i) => i.type !== 'key').length;
  return { def, world, w, h, kind, items, doors, doorAt, start, exit, lootCount };
}

export function tileKind(ctx, x, y) {
  if (x < 0 || y < 0 || x >= ctx.w || y >= ctx.h) return K.WALL;
  return ctx.kind[y * ctx.w + x];
}

export function doorOpen(ctx, state, x, y) {
  const i = ctx.doorAt.get(y * ctx.w + x);
  return i !== undefined && state.doorOpen[i];
}

export function moveBlocked(ctx, state, x, y, passDoors) {
  const k = tileKind(ctx, x, y);
  if (k === K.WALL || k === K.FURN) return true;
  if (k === K.DOOR) return !passDoors && !doorOpen(ctx, state, x, y);
  return false;
}

export function sightBlocked(ctx, state, x, y) {
  const k = tileKind(ctx, x, y);
  if (k === K.WALL || k === K.FURN) return true;
  if (k === K.DOOR) return !doorOpen(ctx, state, x, y);
  return false;
}

/** Breadth-first search from (sx,sy). Returns distance + predecessor tables. `avoidExit` keeps routes from crossing the exit tile. */
export function bfs(ctx, state, sx, sy, passDoors = false, avoidExit = false) {
  const { w, h } = ctx;
  const dist = new Int16Array(w * h).fill(-1);
  const prev = new Int16Array(w * h).fill(-1);
  const q = [sy * w + sx];
  dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    const cx = c % w;
    const cy = (c / w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (dist[n] >= 0 || moveBlocked(ctx, state, nx, ny, passDoors)) continue;
      if (avoidExit && nx === ctx.exit.x && ny === ctx.exit.y) continue;
      dist[n] = dist[c] + 1;
      prev[n] = c;
      q.push(n);
    }
  }
  return { dist, prev };
}

/** Tiles from the BFS start (exclusive) to (tx,ty) (inclusive). null when unreachable. */
export function pathTo(ctx, res, tx, ty) {
  let c = ty * ctx.w + tx;
  if (res.dist[c] < 0) return null;
  const out = [];
  while (res.prev[c] >= 0) {
    out.push({ x: c % ctx.w, y: (c / ctx.w) | 0 });
    c = res.prev[c];
  }
  return out.reverse();
}

export function findPath(ctx, state, sx, sy, tx, ty, passDoors = false) {
  return pathTo(ctx, bfs(ctx, state, sx, sy, passDoors), tx, ty);
}

/** March a ray; true when no sight-blocking tile is crossed. `skip` ignores the first bit (wall-mounted cameras). */
export function lineClear(ctx, state, x0, y0, x1, y1, skip = 0.2) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  for (let t = skip; t < d; t += 0.12) {
    const px = x0 + (dx / d) * t;
    const py = y0 + (dy / d) * t;
    if (sightBlocked(ctx, state, Math.floor(px), Math.floor(py))) return false;
  }
  return true;
}
