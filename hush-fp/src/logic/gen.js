/* Facility generator + solver. A level spec becomes a deterministic grid layout: rooms in a jittered grid, chained by corridors from the start room to the exit room, with the
   locks of the spec placed on chain edges and every key/card/fuse/note/valve placed in a room reachable BEFORE the lock that needs it. A breadth-first solver then plays the
   whole level on the grid (tile + progress mask) and the generator retries with a new seed until the level is solvable and no lock can be bypassed. */
import { rng32 } from './rng.js';

export const T = { WALL: 0, FLOOR: 1, WATER: 2, GLASS: 3 };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function generate(spec) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const w = tryGenerate(spec, spec.seed * 7919 + attempt * 104729 + 17);
    if (w) { w.attempt = attempt; return w; }
  }
  throw new Error('level generation failed: ' + spec.name);
}

function tryGenerate(spec, seed) {
  const R = rng32(seed), ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  const n = spec.rooms;
  const cols = Math.ceil(Math.sqrt(n * 1.5)); let rows = Math.ceil(n / cols); if (n > 6) rows++;
  const CW = 15, CH = 13, W = cols * CW + 2, H = rows * CH + 2;
  const cells = new Uint8Array(W * H), at = (x, y) => y * W + x, inb = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  /* rooms: one per chosen grid cell, 3 tiles of margin from the cell edge so two rooms are never closer than 6 tiles */
  const slots = []; for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) slots.push([cx, cy]);
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = slots[i]; slots[i] = slots[j]; slots[j] = t; }
  const rooms = slots.slice(0, n).map((s, id) => { const w = ri(5, CW - 6), h = ri(5, CH - 6); const x0 = s[0] * CW + 1 + 3 + ri(0, CW - 6 - w), y0 = s[1] * CH + 1 + 3 + ri(0, CH - 6 - h); return { id, x0, y0, w, h, cx: Math.floor(x0 + w / 2), cy: Math.floor(y0 + h / 2), kind: 'room' }; });
  /* chain: start at a random room, always walk to the nearest unvisited room */
  const order = [rooms[Math.floor(R() * n)]], left = rooms.filter(r => r !== order[0]);
  while (left.length) { const l = order[order.length - 1]; left.sort((a, b) => (Math.abs(a.cx - l.cx) + Math.abs(a.cy - l.cy)) - (Math.abs(b.cx - l.cx) + Math.abs(b.cy - l.cy)) + (R() - 0.5) * 2); order.push(left.shift()); }
  order.forEach((r, i) => { r.idx = i; });
  const roomAt = (x, y) => { for (const r of rooms) if (x >= r.x0 && x < r.x0 + r.w && y >= r.y0 && y < r.y0 + r.h) return r; return null; };
  for (const r of rooms) for (let y = r.y0; y < r.y0 + r.h; y++) for (let x = r.x0; x < r.x0 + r.w; x++) cells[at(x, y)] = T.FLOOR;
  /* corridors */
  const carve = (a, b, horizFirst) => {
    const path = []; let x = a.cx, y = a.cy; const step = (tx, ty) => { while (x !== tx || y !== ty) { if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y); path.push([x, y]); } };
    if (horizFirst) { step(b.cx, a.cy); step(b.cx, b.cy); } else { step(a.cx, b.cy); step(b.cx, b.cy); }
    const out = []; for (const [px, py] of path) { if (!inb(px, py)) return null; if (cells[at(px, py)] === T.WALL) cells[at(px, py)] = T.FLOOR; if (!roomAt(px, py)) out.push([px, py]); }
    return out;
  };
  const edges = [];
  for (let i = 0; i < n - 1; i++) { const c = carve(order[i], order[i + 1], R() < 0.5); if (!c || c.length < 3) return null; edges.push({ a: i, b: i + 1, cells: c }); }
  /* gates sit on chain edges, the last one right before the exit room */
  const m = spec.gates.length, gateEdge = [];
  for (let k = 0; k < m; k++) { const e = Math.floor((k + 1) * (n - 1) / m) - 1; if (e < 0 || (k && e <= gateEdge[k - 1])) return null; gateEdge.push(e); }
  const zoneOf = i => { let z = 0; for (let k = 0; k < m; k++) if (gateEdge[k] < i) z++; return z; };
  /* optional loops between rooms of the same zone */
  for (let i = 0; i < n - 2; i++) if (zoneOf(i) === zoneOf(i + 2) && R() < 0.55 && !gateEdge.includes(i) && !gateEdge.includes(i + 1)) { const c = carve(order[i], order[i + 2], R() < 0.5); if (c && c.length > 2) edges.push({ a: i, b: i + 2, cells: c, loop: true }); }
  /* every room must stay inside the zone logic: rooms in the same zone range only */
  const objs = []; let nextId = 1; const O = (o) => { o.id = nextId++; objs.push(o); return o; };
  const blocked = new Set();                       // tiles occupied by solid objects
  const reserve = new Set();                       // tiles in front of lockers and vents: nothing may stand there
  const key = (x, y) => y * W + x;
  const isFree = (x, y) => cells[at(x, y)] !== T.WALL && !blocked.has(key(x, y)) && !reserve.has(key(x, y)) && !objs.some(o => o.x === x && o.y === y);
  /* doors on corridors: a door goes on a straight corridor cell with walls on both sides */
  const doorCell = (cellsList, fromEnd) => {
    const list = fromEnd ? cellsList.slice().reverse() : cellsList;
    for (let i = 1; i < list.length - 1; i++) {
      const [x, y] = list[i], [px, py] = list[i - 1], [nx, ny] = list[i + 1]; if (roomAt(x, y)) continue;
      if (px - x === x - nx && py - y === y - ny) {                // straight
        const dirx = Math.abs(nx - px) > 0 ? 'x' : 'y';
        const side = dirx === 'x' ? [[x, y - 1], [x, y + 1]] : [[x - 1, y], [x + 1, y]];
        if (side.every(([sx, sy]) => cells[at(sx, sy)] === T.WALL) && !objs.some(o => o.type === 'door' && Math.abs(o.x - x) + Math.abs(o.y - y) < 3)) return { x, y, dir: dirx };
      }
    }
    return null;
  };
  const gates = [];
  const lockOf = { key: 'key', card: 'card', power: 'power', code: 'code', valve: 'valve', secret: 'secret' };
  for (let k = 0; k < m; k++) {
    const e = edges[gateEdge[k]], dc = doorCell(e.cells, false); if (!dc) return null;
    const type = spec.gates[k], door = O({ type: 'door', x: dc.x, y: dc.y, dir: dc.dir, lock: lockOf[type], hidden: type === 'secret', gate: k });
    gates.push({ k, type, edge: gateEdge[k], doorId: door.id, provisions: [] });
  }
  /* plain doors on other corridor ends */
  for (const e of edges) { if (gates.some(g => edges[g.edge] === e)) continue; if (R() < 0.7) { const dc = doorCell(e.cells, R() < 0.5); if (dc) O({ type: 'door', x: dc.x, y: dc.y, dir: dc.dir, lock: null }); } }
  /* where may things go */
  const spot = (roomIdx, inset) => {
    const r = order[roomIdx]; for (let t = 0; t < 60; t++) { const x = ri(r.x0 + inset, r.x0 + r.w - 1 - inset), y = ri(r.y0 + inset, r.y0 + r.h - 1 - inset); if (isFree(x, y) && !nearMouth(x, y)) return { x, y }; } return null;
  };
  const nearMouth = (x, y) => DIRS.some(([dx, dy]) => { const cx = x + dx, cy = y + dy; return inb(cx, cy) && cells[at(cx, cy)] !== T.WALL && !roomAt(cx, cy); });
  const roomsUpTo = (e, skipStart) => { const r = []; for (let i = skipStart ? 1 : 0; i <= e; i++) r.push(i); return r.length ? r : [0]; };
  let fuseCount = 0;
  for (const g of gates) {
    const cand = roomsUpTo(g.edge, g.edge >= 1);
    const place = (o) => { for (let t = 0; t < 12; t++) { const ri_ = pick(cand), p = spot(ri_, 1); if (p) { o.x = p.x; o.y = p.y; o.room = ri_; O(o); return o; } } return null; };
    if (g.type === 'key' || g.type === 'card') { if (!place({ type: 'item', kind: g.type, gate: g.k })) return null; }
    else if (g.type === 'code') { const code = String(1000 + Math.floor(R() * 9000)); objs.find(o => o.id === g.doorId).code = code; if (!place({ type: 'note', code, gate: g.k })) return null; }
    else if (g.type === 'valve') { const v = place({ type: 'valve', opens: g.doorId, gate: g.k }); if (!v) return null; blocked.add(key(v.x, v.y)); }
    else if (g.type === 'power') {
      const gen = place({ type: 'generator', need: spec.fuses, gate: g.k }); if (!gen) return null; blocked.add(key(gen.x, gen.y)); g.generator = gen.id;
      for (let f = 0; f < spec.fuses; f++) if (!place({ type: 'item', kind: 'fuse', gate: g.k })) return null; fuseCount += spec.fuses;
    }
  }
  /* exit in the last room, start in the first */
  const lastRoom = order[n - 1], startRoom = order[0];
  let ex = null; for (let t = 0; t < 80 && !ex; t++) { const x = ri(lastRoom.x0 + 1, lastRoom.x0 + lastRoom.w - 2), y = ri(lastRoom.y0 + 1, lastRoom.y0 + lastRoom.h - 2); if (isFree(x, y) && !nearMouth(x, y)) ex = { x, y }; }
  if (!ex) return null; const exit = O({ type: 'exit', x: ex.x, y: ex.y }); blocked.add(key(ex.x, ex.y));
  let st = null; for (let t = 0; t < 80 && !st; t++) { const x = ri(startRoom.x0 + 1, startRoom.x0 + startRoom.w - 2), y = ri(startRoom.y0 + 1, startRoom.y0 + startRoom.h - 2); if (isFree(x, y) && !nearMouth(x, y)) st = { x, y }; }
  if (!st) return null;
  /* wall fixtures: lockers and vents sit in a room's edge row, facing into the room */
  const wallSpot = (roomIdx) => {
    const r = order[roomIdx]; for (let t = 0; t < 60; t++) {
      const side = ri(0, 3); let x, y, fx, fy;
      if (side === 0) { x = ri(r.x0 + 1, r.x0 + r.w - 2); y = r.y0; fx = 0; fy = 1; } else if (side === 1) { x = ri(r.x0 + 1, r.x0 + r.w - 2); y = r.y0 + r.h - 1; fx = 0; fy = -1; }
      else if (side === 2) { x = r.x0; y = ri(r.y0 + 1, r.y0 + r.h - 2); fx = 1; fy = 0; } else { x = r.x0 + r.w - 1; y = ri(r.y0 + 1, r.y0 + r.h - 2); fx = -1; fy = 0; }
      const out = [x - fx, y - fy]; if (cells[at(out[0], out[1])] !== T.WALL) continue;           // no opening behind it
      if (!isFree(x, y) || nearMouth(x, y) || Math.abs(x - st.x) + Math.abs(y - st.y) < 3) continue;
      if (objs.some(o => (o.type === 'locker' || o.type === 'vent') && Math.abs(o.x - x) + Math.abs(o.y - y) < 2)) continue;
      if (!isFree(x + fx, y + fy)) continue;
      reserve.add(key(x + fx, y + fy)); return { x, y, face: Math.atan2(fy, fx) };
    } return null;
  };
  /* hiding places: every room gets a locker (the start room first), then extras up to the spec; hiding is the core answer to the creature, so one is always close */
  const lockerRooms = order.map(r => r.idx).slice(0, Math.max(spec.lockers, Math.min(n, spec.creatures.length ? n : 1)));
  for (const ri_ of lockerRooms) { const p = wallSpot(ri_); if (p) { O({ type: 'locker', x: p.x, y: p.y, face: p.face, room: ri_ }); blocked.add(key(p.x, p.y)); } }
  for (let v = 0; v < spec.vents; v++) {                                               // vent pairs stay inside one zone so they never bypass a lock
    let done = false; for (let t = 0; t < 40 && !done; t++) { const a = ri(0, n - 1), b = ri(0, n - 1); if (a === b || zoneOf(a) !== zoneOf(b) || Math.abs(a - b) < 2) continue;
      const pa = wallSpot(a), pb = wallSpot(b); if (!pa || !pb) continue; const va = O({ type: 'vent', x: pa.x, y: pa.y, face: pa.face, room: a }), vb = O({ type: 'vent', x: pb.x, y: pb.y, face: pb.face, room: b }); va.pair = vb.id; vb.pair = va.id; blocked.add(key(pa.x, pa.y)); blocked.add(key(pb.x, pb.y)); done = true; }
  }
  if (spec.radio) { const cand = roomsUpTo(Math.max(1, Math.floor(n / 2)), false); let ok = false; for (let t = 0; t < 20 && !ok; t++) { const p = spot(pick(cand), 1); if (p) { O({ type: 'item', kind: 'radio', x: p.x, y: p.y }); ok = true; } } }
  /* floor types */
  if (spec.water) for (const r of rooms) if (r.idx > 0 && R() < 0.5) { r.flooded = true; for (let y = r.y0; y < r.y0 + r.h; y++) for (let x = r.x0; x < r.x0 + r.w; x++) cells[at(x, y)] = T.WATER; }
  for (let g = 0; g < spec.glass; g++) { const r = pick(rooms); const x = ri(r.x0, r.x0 + r.w - 1), y = ri(r.y0, r.y0 + r.h - 1); if (cells[at(x, y)] === T.FLOOR && !objs.some(o => o.x === x && o.y === y)) cells[at(x, y)] = T.GLASS; }
  for (const e of edges) for (const [x, y] of e.cells) if (spec.glass && R() < 0.05 && cells[at(x, y)] === T.FLOOR && !objs.some(o => o.x === x && o.y === y)) cells[at(x, y)] = T.GLASS;
  /* props: solid clutter in room interiors (never on a tile that would cut the room apart) */
  /* every room gets a character: a kind, a landmark prop and a mix of clutter that fits it (chapter 1 abandoned facility, 2 flooded pumping station, 3 the nest) */
  const KINDS = [['storage', 'office', 'machine', 'vault'], ['pump', 'tanks', 'control', 'sluice'], ['hive', 'cells', 'bonepit', 'nursery']][spec.ch];
  const MIX = { storage: ['shelf', 'crate', 'barrel'], office: ['console', 'table', 'crate'], machine: ['machine', 'pipe', 'barrel'], vault: ['column', 'crate', 'shelf'],
    pump: ['tank', 'pipe', 'barrel'], tanks: ['tank', 'tank', 'crate'], control: ['console', 'pipe', 'table'], sluice: ['machine', 'pipe', 'barrel'],
    hive: ['cocoon', 'pod', 'bones'], cells: ['cage', 'bones', 'crate'], bonepit: ['bones', 'bones', 'pod'], nursery: ['pod', 'pod', 'cocoon'] };
  const LAND = { storage: 'shelf', office: 'console', machine: 'machine', vault: 'column', pump: 'tank', tanks: 'tank', control: 'console', sluice: 'machine', hive: 'cocoon', cells: 'cage', bonepit: 'bones', nursery: 'pod' };
  rooms.forEach((r, i) => { r.kind = i === startRoom.id ? KINDS[0] : KINDS[Math.floor(R() * KINDS.length)]; });
  const floorCount = () => { let c = 0; for (let i = 0; i < cells.length; i++) if (cells[i] !== T.WALL && !blocked.has(i)) c++; return c; };
  const connected = () => { const seen = new Uint8Array(W * H); const q = [[st.x, st.y]]; seen[at(st.x, st.y)] = 1; let cnt = 1, qi = 0; while (qi < q.length) { const [x, y] = q[qi++]; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (inb(nx, ny) && !seen[at(nx, ny)] && cells[at(nx, ny)] !== T.WALL && !blocked.has(key(nx, ny))) { seen[at(nx, ny)] = 1; cnt++; q.push([nx, ny]); } } } return cnt === floorCount(); };
  for (const r of rooms) {
    const mix = MIX[r.kind], cnt = ri(1, 3); let landmark = false;
    for (let i = 0; i < cnt + 1; i++) {
      let x, y; if (!landmark) { x = r.cx; y = r.cy; if (!isFree(x, y) || nearMouth(x, y) || (x === st.x && y === st.y) || cells[at(x, y)] === T.GLASS) { x = ri(r.x0 + 1, r.x0 + r.w - 2); y = ri(r.y0 + 1, r.y0 + r.h - 2); } } else { x = ri(r.x0 + 1, r.x0 + r.w - 2); y = ri(r.y0 + 1, r.y0 + r.h - 2); }
      if (!isFree(x, y) || nearMouth(x, y) || (x === st.x && y === st.y) || cells[at(x, y)] === T.GLASS) continue;
      blocked.add(key(x, y)); if (!connected()) { blocked.delete(key(x, y)); continue; }
      O({ type: 'prop', kind: landmark ? pick(mix) : LAND[r.kind], x, y, rot: R() * Math.PI * 2, solid: true, landmark: !landmark, room: r.idx }); landmark = true;
    }
  }
  /* lights: a fixture every few tiles of corridor and in every room */
  const lights = [];
  for (const r of rooms) lights.push({ x: r.cx + 0.5, y: r.cy + 0.5, kind: R() < 0.2 ? 'dead' : R() < 0.4 ? 'flicker' : 'ok', ph: R() * 100 });
  for (const e of edges) for (let i = 2; i < e.cells.length; i += 5) lights.push({ x: e.cells[i][0] + 0.5, y: e.cells[i][1] + 0.5, kind: R() < 0.3 ? 'dead' : R() < 0.35 ? 'flicker' : 'ok', ph: R() * 100 });
  /* creatures */
  const creatures = []; const used = new Set();
  const itemRooms = new Set(objs.filter(o => o.type === 'item' || o.type === 'note' || o.type === 'generator' || o.type === 'valve').map(o => o.room).filter(r => r !== undefined));
  const ventRooms = new Set(objs.filter(o => o.type === 'vent').map(o => o.room));
  for (const t of spec.creatures) {
    let pool = order.filter(r => r.idx >= 1 && !used.has(r.idx) && (t !== 'sentinel' || r.idx <= n - 2));
    if (!pool.length) pool = order.filter(r => r.idx >= 1); if (!pool.length) return null;
    const noVent = pool.filter(r => !ventRooms.has(r.idx)); if (noVent.length) pool = noVent;                    // nothing waits where a vent comes out
    if (t === 'sentinel') { const guard = pool.filter(r => itemRooms.has(r.idx)); if (guard.length) pool = guard; }
    const r = pick(pool); used.add(r.idx); let x = r.cx, y = r.cy; if (blocked.has(key(x, y)) || objs.some(o => o.x === x && o.y === y)) { const f = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => isFree(x + dx, y + dy)); if (!f) return null; x += f[0]; y += f[1]; }
    creatures.push({ t, x: x + 0.5, y: y + 0.5, roomIdx: r.idx, yaw: R() * Math.PI * 2, hunted: !!spec.hunted && creatures.length === 0 });
  }
  /* one optional story document per level (own random stream, so layouts and solvability are unaffected) */
  { const LR = rng32(spec.seed * 977 + 13); const idxs = order.map((_, i) => i).filter(i => i > 0); for (let k = idxs.length - 1; k > 0; k--) { const j = Math.floor(LR() * (k + 1)); [idxs[k], idxs[j]] = [idxs[j], idxs[k]]; }
    for (const ri_ of idxs) { const r = order[ri_]; let done = false; for (let t = 0; t < 40 && !done; t++) { const x = r.x0 + 1 + Math.floor(LR() * (r.w - 2)), y = r.y0 + 1 + Math.floor(LR() * (r.h - 2)); if (isFree(x, y) && !nearMouth(x, y) && cells[at(x, y)] === T.FLOOR) { O({ type: 'log', x, y, room: ri_, rot: Math.floor(LR() * 4) * Math.PI / 2 }); done = true; } } if (done) break; } }
  const world = { spec, W, H, cells, rooms: order, edges, gates, gateEdge, objs, start: { x: st.x + 0.5, y: st.y + 0.5, yaw: 0 }, exit, lights, creatures, blocked: [...blocked], seed };
  /* start facing the first corridor */
  { const e0 = edges[0].cells[0]; world.start.yaw = Math.atan2(e0[1] - st.y, e0[0] - st.x); }
  if (!checkGates(world)) return null;
  const sol = solve(world); if (!sol) return null;
  world.solution = sol; world.par = Math.round(sol.length / 1.5 + 14 + gates.length * 10);
  return world;
}

/* -------- reachability with locks closed: no lock may be bypassed -------- */
export function checkGates(w) {
  const { W, H, cells, gates } = w;
  const doorAt = new Map(); for (const o of w.objs) if (o.type === 'door') doorAt.set(o.y * W + o.x, o);
  const blockedSet = new Set(w.blocked);
  const roomIdxAt = (x, y) => { for (const r of w.rooms) if (x >= r.x0 && x < r.x0 + r.w && y >= r.y0 && y < r.y0 + r.h) return r.idx; return -1; };
  for (let k = 0; k < gates.length; k++) {
    const seen = new Uint8Array(W * H); const q = [[Math.floor(w.start.x), Math.floor(w.start.y)]]; seen[q[0][1] * W + q[0][0]] = 1; let qi = 0;
    while (qi < q.length) { const [x, y] = q[qi++]; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, i = ny * W + nx; if (seen[i] || cells[i] === T.WALL || blockedSet.has(i)) continue; const d = doorAt.get(i); if (d && d.lock && d.gate >= k) continue; seen[i] = 1; q.push([nx, ny]); } }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (seen[y * W + x]) { const r = roomIdxAt(x, y); if (r > w.gateEdge[k]) return false; }
    /* vents may not carry you past the lock either */
    for (const o of w.objs) if (o.type === 'vent' && seen[o.y * W + o.x] === 0) { /* vent in an unreachable room is fine */ }
  }
  return true;
}

/* -------- solver: BFS over (tile, progress mask); returns the list of tiles + actions or null -------- */
export function solve(w) {
  const { W, H, cells } = w; const blockedSet = new Set(w.blocked);
  const bits = {}; let nb = 0; const bit = (name) => (bits[name] === undefined ? (bits[name] = nb++) : bits[name]);
  const itemAt = new Map(), inter = new Map();                       // tile -> bit effects ; tile adjacent -> interact
  for (const o of w.objs) {
    if (o.type === 'item') { if (o.kind === 'radio') continue; bit('i' + o.id); itemAt.set(o.y * W + o.x, o); }
    if (o.type === 'note') { bit('n' + o.id); }
    if (o.type === 'valve') bit('v' + o.id);
    if (o.type === 'generator') bit('g' + o.id);
  }
  const doorAt = new Map(); for (const o of w.objs) if (o.type === 'door') doorAt.set(o.y * W + o.x, o);
  const need = (d, mask) => {
    if (!d.lock || d.lock === 'secret') return true;
    if (d.lock === 'key' || d.lock === 'card') { const it = w.objs.find(o => o.type === 'item' && o.kind === d.lock && o.gate === d.gate); return !!(mask & (1 << bits['i' + it.id])); }
    if (d.lock === 'code') { const nt = w.objs.find(o => o.type === 'note' && o.gate === d.gate); return !!(mask & (1 << bits['n' + nt.id])); }
    if (d.lock === 'valve') { const v = w.objs.find(o => o.type === 'valve' && o.opens === d.id); return !!(mask & (1 << bits['v' + v.id])); }
    if (d.lock === 'power') { const g = w.objs.find(o => o.type === 'generator' && o.gate === d.gate); return !!(mask & (1 << bits['g' + g.id])); }
    return false;
  };
  const interactsAt = (x, y, mask) => {                                // standing on (x,y), what progress do the neighbours give?
    let m = mask;
    for (const o of w.objs) {
      if (o.type === 'item' && o.kind !== 'radio' && o.x === x && o.y === y) m |= 1 << bits['i' + o.id];
      if (Math.abs(o.x - x) + Math.abs(o.y - y) <= 1) {
        if (o.type === 'note') m |= 1 << bits['n' + o.id];
        if (o.type === 'valve') m |= 1 << bits['v' + o.id];
        if (o.type === 'generator') { let have = 0; for (const f of w.objs) if (f.type === 'item' && f.kind === 'fuse' && f.gate === o.gate && (m & (1 << bits['i' + f.id]))) have++; if (have >= o.need) m |= 1 << bits['g' + o.id]; }
      }
    }
    return m;
  };
  const sx = Math.floor(w.start.x), sy = Math.floor(w.start.y), startMask = interactsAt(sx, sy, 0);
  const idx = (x, y, m) => (m * H + y) * W + x, seen = new Map(), prev = new Map(), q = [[sx, sy, startMask]]; seen.set(idx(sx, sy, startMask), 1); let qi = 0;
  const ex = w.exit;
  const ventTo = new Map(); for (const o of w.objs) if (o.type === 'vent') { const p = w.objs.find(v => v.id === o.pair); ventTo.set(o.y * W + o.x, p); }
  while (qi < q.length) {
    const [x, y, m] = q[qi++]; if (Math.abs(x - ex.x) + Math.abs(y - ex.y) <= 1) { const path = []; let cur = idx(x, y, m); while (cur !== undefined) { const p = prev.get(cur); const mm = Math.floor(cur / (W * H)), r = cur % (W * H); path.push([r % W, Math.floor(r / W), mm]); cur = p; } path.reverse(); return path; }
    const nxt = [];
    for (const [dx, dy] of DIRS) nxt.push([x + dx, y + dy]);
    for (const [nx, ny] of nxt) {
      const i = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= H || cells[i] === T.WALL) continue;
      const v = ventTo.get(i); if (blockedSet.has(i) && !v) continue;
      const d = doorAt.get(i); if (d && !need(d, m)) continue;
      let tx = nx, ty = ny; if (v) { tx = Math.floor(v.x - Math.cos(v.face)); ty = Math.floor(v.y - Math.sin(v.face)); tx = v.x + Math.round(Math.cos(v.face)); ty = v.y + Math.round(Math.sin(v.face)); if (cells[ty * W + tx] === T.WALL || blockedSet.has(ty * W + tx)) continue; }
      const nm = interactsAt(tx, ty, m), k = idx(tx, ty, nm); if (seen.has(k)) continue; seen.set(k, 1); prev.set(k, idx(x, y, m)); q.push([tx, ty, nm]);
    }
  }
  return null;
}
