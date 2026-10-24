/* Level dressing (generation side): environmental hazards, obstacles, hiding variants, healing pickups and the spawn list of the small secondary creatures.
   It runs with its own random stream AFTER the layout, the locks, the items and the clutter are placed, and every blocking piece is checked against the walkable-tile connectivity
   (the generator's own solver then re-verifies the finished level, and the generator retries with a new seed if anything went wrong), so a required key, door, objective or the exit can never be cut off.
   Nothing here touches the first three (tutorial) levels. */
import { rng32 } from './rng.js';

const WALL = 0, FLOOR = 1, WATER = 2;
/* level index (0-based) -> the small creatures on that level. Never more than two, and only on about a third of the levels. */
export const CRAWLERS = { 6: ['crawler'], 9: ['crawler'], 11: ['dropper'], 14: ['crawler'], 16: ['crawler'], 18: ['dropper'], 20: ['crawler', 'crawler'], 23: ['crawler'], 25: ['dropper'],
  27: ['crawler'], 29: ['crawler'], 31: ['crawler', 'dropper'], 33: ['crawler'], 35: ['dropper'], 37: ['crawler', 'crawler'], 39: ['crawler', 'crawler'] };
/* level index -> its one memorable set-piece (about one every five levels) */
export const SETPIECES = { 7: 'outage', 11: 'sighting', 16: 'machine', 21: 'genroom', 26: 'impact', 30: 'cell', 34: 'surge', 38: 'chase' };

export function dressLevel(c) {
  const { spec, cells, W, H, objs, O, blocked, isFree, nearMouth, rooms, edges, st, connected, at } = c;
  const i = spec.story === undefined ? 0 : spec.story, ch = spec.ch, R = rng32(spec.seed * 1301 + 71), ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  const out = { crawlers: [], setpiece: SETPIECES[i] || null };
  if (i < 3) return out;                                              // the tutorial levels stay clean
  const far = (x, y, d) => Math.abs(x - st.x) + Math.abs(y - st.y) >= d;
  const inRooms = rooms.filter(r => r.idx >= 1);
  const roomTile = (r, inset) => { for (let t = 0; t < 40; t++) { const x = ri(r.x0 + inset, r.x0 + r.w - 1 - inset), y = ri(r.y0 + inset, r.y0 + r.h - 1 - inset); if (isFree(x, y) && !nearMouth(x, y) && far(x, y, 6)) return [x, y]; } return null; };
  const corridorTile = () => { const es = edges.filter(e => e.cells.length >= 7); for (let t = 0; t < 40 && es.length; t++) { const e = pick(es), k = ri(2, e.cells.length - 3), [x, y] = e.cells[k]; if (isFree(x, y) && far(x, y, 8) && !objs.some(o => o.type === 'door' && Math.abs(o.x - x) + Math.abs(o.y - y) < 2)) return [x, y]; } return null; };
  const anyTile = () => (R() < 0.5 ? corridorTile() : null) || (inRooms.length ? roomTile(pick(inRooms), 1) : null);

  /* -- hazards: timed, never solid, so they can be waited out or walked around -- */
  const nSpark = i < 4 ? 0 : ch === 0 ? (i % 3 === 1 ? 1 : 0) + (i > 8 ? 1 : 0) : ch === 1 ? 1 + (i % 2) : 2 + (i % 2);
  const nSteam = ch === 0 ? (i >= 5 && i % 4 === 1 ? 1 : 0) : ch === 1 ? 1 : 1 + (i % 2);
  const nLeak = ch === 0 ? (i >= 3 && i % 3 === 0 ? 1 : 0) : 1 + (i % 2);
  for (let k = 0; k < nSpark; k++) { const p = (R() < 0.65 ? corridorTile() : null) || anyTile(); if (p) O({ type: 'hazard', kind: 'spark', x: p[0], y: p[1], ph: R() * 10, period: 3.6 + R() * 1.6, dress: true }); }
  for (let k = 0; k < nSteam; k++) { const p = anyTile(); if (p) O({ type: 'hazard', kind: 'steam', x: p[0], y: p[1], ph: R() * 8, period: 7 + R() * 3, dress: true }); }
  for (let k = 0; k < nLeak; k++) {
    const r = inRooms.length ? pick(inRooms) : null, p = r && roomTile(r, 1); if (!p) continue;
    O({ type: 'hazard', kind: 'leak', x: p[0], y: p[1], ph: R() * 6, period: 3.4 + R() * 2.5, dress: true });
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 1]]) { const x = p[0] + dx, y = p[1] + dy; if (R() < 0.75 && x > 0 && y > 0 && cells[at(x, y)] === FLOOR) cells[at(x, y)] = WATER; }   // a small puddle under the pipe
  }

  /* -- obstacles that block a tile: only where the walkable floor stays one connected piece -- */
  const FALL_ROOMS = [['storage', 'security', 'office', 'vault', 'reception'], ['lab', 'specimen', 'medical', 'observation', 'control'], ['maintenance', 'tunnel', 'pump', 'machine', 'generator']][ch];
  const nFall = i < 5 ? 0 : 1 + (i > 14 && R() < 0.5 ? 1 : 0);
  for (let k = 0; k < nFall; k++) {
    const pool = inRooms.filter(r => FALL_ROOMS.includes(r.kind)), list = pool.length ? pool : inRooms;
    for (let t = 0; t < 30 && list.length; t++) { const r = pick(list), p = roomTile(r, 1); if (!p || !far(p[0], p[1], 7)) continue; blocked.add(p[1] * W + p[0]); if (!connected()) { blocked.delete(p[1] * W + p[0]); continue; } O({ type: 'prop', kind: 'fallen', x: p[0], y: p[1], rot: ri(0, 3) * Math.PI / 2, solid: true, room: r.idx, dress: true }); break; }
  }
  /* a collapsed stretch of an optional (loop) corridor: the player has to take the other way */
  const loops = edges.filter(e => e.loop && e.cells.length >= 6);
  if (i >= 7 && loops.length && R() < 0.85) {
    const e = pick(loops);
    for (let t = 0; t < 12; t++) {
      const [x, y] = e.cells[ri(2, e.cells.length - 3)]; if (!isFree(x, y) || objs.some(o => o.type === 'door' && Math.abs(o.x - x) + Math.abs(o.y - y) < 3)) continue;
      blocked.add(y * W + x); if (!connected()) { blocked.delete(y * W + x); continue; } O({ type: 'prop', kind: 'collapse', x, y, rot: ri(0, 3) * Math.PI / 2, solid: true, dress: true }); break;
    }
  }
  /* -- debris: loud to step on, never in the way -- */
  const nDeb = i < 4 ? 0 : 3 + ri(0, 4);
  for (let k = 0; k < nDeb; k++) { const p = anyTile(); if (p) O({ type: 'debris', x: p[0], y: p[1], rot: R() * 6.28, dress: true }); }
  /* damaged doors creak: louder when opened */
  for (const o of objs) if (o.type === 'door' && !o.lock && i >= 4 && R() < 0.4) o.damaged = true;
  /* a small flooded patch in a dry room */
  if (i >= 6 && !spec.water && R() < 0.6) {
    const pool = inRooms.filter(r => !r.flooded && (r.kind === 'pump' || r.kind === 'maintenance' || r.kind === 'storage' || r.kind === 'generator' || R() < 0.3));
    if (pool.length) { const r = pick(pool), cx = ri(r.x0 + 1, r.x0 + r.w - 2), cy = ri(r.y0 + 1, r.y0 + r.h - 2); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy; if (x >= r.x0 && y >= r.y0 && x < r.x0 + r.w && y < r.y0 + r.h && cells[at(x, y)] === FLOOR && R() < 0.8) cells[at(x, y)] = WATER; } }
  }


  /* -- healing: uncommon, always somewhere in the facility but never near the start -- */
  const hurtLevel = nSpark > 0 || !!CRAWLERS[i];
  const nBand = i >= 4 && (i % 3 === 1 || hurtLevel) ? 1 : 0, nMed = (i >= 9 && i % 4 === 1) || (CRAWLERS[i] && CRAWLERS[i].length > 1) ? 1 : 0;
  const heal = (kind) => { for (let t = 0; t < 30 && inRooms.length; t++) { const p = roomTile(pick(inRooms), 1); if (p) { O({ type: 'pickup', kind, x: p[0], y: p[1], dress: true }); return; } } };
  for (let k = 0; k < nBand; k++) heal('bandage'); for (let k = 0; k < nMed; k++) heal('medkit');

  /* -- small creatures: their start tiles (rooms away from the start, floor that is free) -- */
  for (const kind of CRAWLERS[i] || []) {
    const pool = inRooms.filter(r => r.idx >= 2); let p = null;
    for (let t = 0; t < 30 && pool.length && !p; t++) { const q = roomTile(pick(pool), 1); if (q && far(q[0], q[1], 10) && cells[at(q[0], q[1])] !== WATER) p = q; }
    if (p) out.crawlers.push({ kind, x: p[0] + 0.5, y: p[1] + 0.5 });
  }
  return out;
}

/* hiding places differ by chapter (lockers, storage cabinets, an alcove behind a shelf frame); runs once every locker exists */
export function lockerVariants(c) {
  const { spec, objs, R } = c, ch = spec.ch; if ((spec.story === undefined ? 0 : spec.story) < 3) return;
  for (const o of objs) if (o.type === 'locker' && !o.variant) o.variant = ch === 0 ? (R() < 0.4 ? 'cabinet' : 'locker') : ch === 1 ? (R() < 0.35 ? 'cabinet' : 'locker') : (R() < 0.4 ? 'alcove' : 'locker');
}
