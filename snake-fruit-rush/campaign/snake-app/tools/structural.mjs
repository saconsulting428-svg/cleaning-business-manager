// Generic structural clean-up + validation of one level (no solving).
import { E } from './solver.mjs';
const cellEq = (a, b) => a[0] === b[0] && a[1] === b[1];
const key = (c) => c[0] + ',' + c[1];

export function cleanOverlaps(lv) {
  const notes = [];
  const device = new Set(), ice = new Set(lv.board.ice.map(key));
  lv.devices.forEach((d) => { if (d.type === 'portal') d.cells.forEach((c) => device.add(key(c))); else device.add(key(d.cell)); });
  lv.items.filter((i) => i.type === 'bomb').forEach((i) => device.add(key(i.cell)));
  const before = lv.board.walls.length;
  lv.board.walls = lv.board.walls.filter((w) => !device.has(key(w)) && !ice.has(key(w)));
  if (lv.board.walls.length !== before) notes.push('removed ' + (before - lv.board.walls.length) + ' wall cell(s) that sat under a device/ice tile');
  // a door/gate/bomb replaces an ice cell
  const solid = new Set();
  lv.devices.filter((d) => d.type === 'door' || d.type === 'gate').forEach((d) => solid.add(key(d.cell)));
  lv.items.filter((i) => i.type === 'bomb').forEach((i) => solid.add(key(i.cell)));
  const ib = lv.board.ice.length;
  lv.board.ice = lv.board.ice.filter((c) => !solid.has(key(c)));
  if (lv.board.ice.length !== ib) notes.push('removed ' + (ib - lv.board.ice.length) + ' ice cell(s) under a door/gate/bomb');
  return notes;
}

const DIRN = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
// cells that are never allowed to hold a wall: snake start + runway, exit, items, devices
export function protectedCells(lv) {
  const p = new Set();
  const s = lv.snake, d = DIRN[s.direction];
  for (let i = -(s.length - 1); i <= 3; i++) p.add(key([s.head[0] + d[0] * i, s.head[1] + d[1] * i]));
  p.add(key(lv.exit.cell));
  lv.items.forEach((i) => p.add(key(i.cell)));
  lv.devices.forEach((dv) => { if (dv.type === 'portal') dv.cells.forEach((c) => p.add(key(c))); else p.add(key(dv.cell)); });
  lv.board.ice.forEach((c) => p.add(key(c)));
  return p;
}

// Hard errors that must be zero in a shipped level.
export function structuralErrors(lv) {
  const errs = [], cols = lv.board.cols, rows = lv.board.rows;
  const inb = (c) => c[0] >= 0 && c[1] >= 0 && c[0] < cols && c[1] < rows;
  const owner = new Map();
  const put = (c, name) => { if (!inb(c)) errs.push(name + ' out of board ' + key(c)); const k = key(c); if (owner.has(k)) errs.push(name + ' overlaps ' + owner.get(k) + ' at ' + k); else owner.set(k, name); };
  lv.board.walls.forEach((c) => put(c, 'wall'));
  lv.board.ice.forEach((c) => { const k = key(c); if (owner.has(k)) errs.push('ice overlaps ' + owner.get(k) + ' at ' + k); else owner.set(k, 'ice'); });
  const s = lv.snake, d = DIRN[s.direction];
  for (let i = 0; i < s.length; i++) put([s.head[0] - d[0] * i, s.head[1] - d[1] * i], 'snake');
  put(lv.exit.cell, 'exit');
  lv.items.forEach((i) => { const k = key(i.cell); if (!inb(i.cell)) errs.push(i.type + ' out of board'); else if (owner.has(k) && owner.get(k) !== 'ice') errs.push(i.type + ' overlaps ' + owner.get(k) + ' at ' + k); else owner.set(k, i.type); });
  lv.devices.forEach((dv) => { (dv.type === 'portal' ? dv.cells : [dv.cell]).forEach((c) => put(c, dv.type)); });
  // runway: 3 free cells ahead of the head (ice is fine; a gate is fine if its switch is crossed first)
  const opened = new Set();
  for (let i = 1; i <= 3; i++) {
    const c = [s.head[0] + d[0] * i, s.head[1] + d[1] * i];
    const o = inb(c) ? owner.get(key(c)) : 'edge';
    if (o === 'gate') { const g = lv.devices.find((x) => x.type === 'gate' && cellEq(x.cell, c)); if (g.startOpen || opened.has(g.id)) continue; }
    if (o === 'edge' || o === 'wall' || o === 'bomb' || o === 'door' || o === 'gate') { errs.push('runway blocked at step ' + i + ' by ' + o); break; }
    if (o === 'switch') { const sw = lv.devices.find((x) => x.type === 'switch' && cellEq(x.cell, c)); opened.add(sw.gate); }
  }
  const req = lv.items.filter((i) => i.type === 'fruit' && i.required !== false).length;
  if (req < 1) errs.push('no required fruit');
  lv.devices.filter((x) => x.type === 'door').forEach((x) => { if (!lv.items.some((i) => i.type === 'key' && i.id === x.id)) errs.push('door ' + x.id + ' has no key'); });
  lv.devices.filter((x) => x.type === 'switch').forEach((x) => { if (!lv.devices.some((g) => g.type === 'gate' && g.id === x.gate)) errs.push('switch ' + x.id + ' has no gate'); });
  lv.devices.filter((x) => x.type === 'portal').forEach((x) => { if (x.cells.length !== 2) errs.push('portal needs two ends'); });
  return errs;
}

// If the start heading runs into something within 3 cells (or the body would be on a wall), try the other headings.
export function fixRunway(lv, scoreDir) {
  if (!structuralErrors(lv).some((e) => e.startsWith('runway') || e.startsWith('snake'))) return null;
  const orig = lv.snake.direction;
  const results = [];
  for (const dn of ['up', 'right', 'down', 'left']) {
    lv.snake.direction = dn;
    const errs = structuralErrors(lv).filter((e) => e.startsWith('runway') || e.startsWith('snake') || e.includes('overlaps'));
    if (!errs.length) results.push({ dn: dn, score: scoreDir ? scoreDir(dn) : 0 });
  }
  results.sort((a, b) => a.score - b.score);
  if (!results.length) { lv.snake.direction = orig; return null; }
  lv.snake.direction = results[0].dn;
  return orig + ' -> ' + results[0].dn;
}

// last resort: move the start cell (at most 2 tiles) to the nearest place with a clear runway
export function relocateStart(lv, scoreFn) {
  const orig = { head: lv.snake.head.slice(), direction: lv.snake.direction };
  const cands = [];
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist === 0 || dist > 2) continue;
    for (const dn of ['up', 'right', 'down', 'left']) {
      lv.snake.head = [orig.head[0] + dx, orig.head[1] + dy]; lv.snake.direction = dn;
      if (!structuralErrors(lv).length) cands.push({ head: lv.snake.head.slice(), dn: dn, dist: dist, score: scoreFn ? scoreFn() : 0 });
    }
  }
  lv.snake.head = orig.head; lv.snake.direction = orig.direction;
  if (!cands.length) return null;
  cands.sort((a, b) => a.dist - b.dist || a.score - b.score);
  lv.snake.head = cands[0].head; lv.snake.direction = cands[0].dn;
  return JSON.stringify(orig.head) + orig.direction + ' -> ' + JSON.stringify(cands[0].head) + cands[0].dn;
}
export { cellEq };
