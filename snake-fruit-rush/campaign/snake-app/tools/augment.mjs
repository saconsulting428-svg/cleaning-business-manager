// Adds the fewest wall segments needed so that every key/door, switch/gate, portal, ice strip and
// bomb really shapes the route (see analyze.mjs). Deterministic: seeded random search.
import fs from 'fs';
import { analyze } from './analyze.mjs';
import { structuralErrors, protectedCells } from './structural.mjs';

const clone = (o) => JSON.parse(JSON.stringify(o));
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const key = (c) => c[0] + ',' + c[1];

function segmentAt(lv, rand, cellIdx, prevIdx, prot, wallSet) {
  const cols = lv.board.cols, x = cellIdx % cols, y = (cellIdx / cols) | 0;
  const px = prevIdx % cols, py = (prevIdx / cols) | 0;
  const horizontalTravel = Math.abs(x - px) >= Math.abs(y - py);
  const axis = horizontalTravel ? [0, 1] : [1, 0];                // wall across the direction of travel
  const cells = [[x, y]];
  const want = 1 + ((rand() * 3) | 0);                            // 2..4 cells in total
  for (const sgn of [1, -1]) {
    let k = 0, cx = x, cy = y;
    const grow = sgn === 1 ? ((rand() * (want + 1)) | 0) : want - cells.length + 1;
    while (k < grow && cells.length < want + 1) {
      cx += axis[0] * sgn; cy += axis[1] * sgn;
      if (cx < 0 || cy < 0 || cx >= cols || cy >= lv.board.rows || prot.has(key([cx, cy])) || wallSet.has(key([cx, cy]))) break;
      cells.push([cx, cy]); k++;
    }
  }
  return cells;
}

// a straight wall line through the door/gate cell (the device itself is the only opening)
function barrierThrough(lv, kind, id, prot, wallSet, rand) {
  const dv = lv.devices.find((d) => d.type === kind && d.id === id);
  if (!dv) return null;
  const vertical = rand() < 0.5, cells = [];
  for (let t = 0; t < 8; t++) {
    const c = vertical ? [dv.cell[0], t] : [t, dv.cell[1]];
    if (c[0] === dv.cell[0] && c[1] === dv.cell[1]) continue;
    if (prot.has(key(c)) || wallSet.has(key(c))) continue;
    cells.push(c);
  }
  return cells;
}
// a wall line across the first cell of an ice strip, leaving that cell open
function iceBarrier(lv, prot, wallSet, rand) {
  const ice = lv.board.ice;
  if (!ice.length) return null;
  const c0 = ice[(rand() * ice.length) | 0];
  const horizontalStrip = ice.filter((c) => c[1] === c0[1]).length >= ice.filter((c) => c[0] === c0[0]).length;
  const cells = [];
  for (let t = 0; t < 8; t++) {
    const c = horizontalStrip ? [c0[0], t] : [t, c0[1]];
    if (c[0] === c0[0] && c[1] === c0[1]) continue;
    if (prot.has(key(c)) || wallSet.has(key(c))) continue;
    cells.push(c);
  }
  return cells;
}

export function augment(lv0, opts = {}) {
  const maxMin = opts.maxMin || 46, maxAdded = opts.maxAdded || 22, iters = opts.iters || 900;
  const rand = rng(opts.seed || lv0.id * 7919);
  let lv = clone(lv0), a = analyze(lv), added = [];
  if (!a.solvable) return { ok: false, reason: 'unsolvable', lv: lv0 };
  let tries = 0;
  while (a.problems.length && tries < iters) {
    tries++;
    const prot = protectedCells(lv), wallSet = new Set(lv.board.walls.map(key));
    const p = a.problems[(rand() * a.problems.length) | 0];
    const pool = [];
    for (let i = 3; i < p.cells.length; i++) if (!prot.has(key([p.cells[i] % 8, (p.cells[i] / 8) | 0]))) pool.push(i);
    if (!pool.length) continue;
    const i = pool[(rand() * pool.length) | 0];
    if (p.kind === 'bombs' && rand() < 0.7) {                      // put one bomb on the bomb-free shortest route
      const bombs = lv.items.filter((x) => x.type === 'bomb'), b = bombs[(rand() * bombs.length) | 0];
      const target = [p.cells[i] % 8, (p.cells[i] / 8) | 0];
      if (wallSet.has(key(target))) continue;
      const cand = clone(lv), cb = cand.items.filter((x) => x.type === 'bomb')[bombs.indexOf(b)];
      cb.cell = target;
      if (structuralErrors(cand).length) continue;
      const ca = analyze(cand);
      if (!ca.solvable || ca.min > maxMin || ca.problems.length > a.problems.length) continue;
      lv = cand; a = ca; added.push([]); continue;
    }
    let seg = null;
    let relocate = null;
    if ((p.kind === 'door' || p.kind === 'gate') && rand() < 0.6) {
      seg = barrierThrough(lv, p.kind, p.id, prot, wallSet, rand);
      if (rand() < 0.6) relocate = p.kind === 'gate' ? { type: 'switch', gate: p.id } : { type: 'key', id: p.id };   // the key / switch may have to move to the start side
    }
    else if (p.kind === 'ice' && rand() < 0.6) seg = iceBarrier(lv, prot, wallSet, rand);
    if (!seg || !seg.length) seg = segmentAt(lv, rand, p.cells[i], p.cells[i - 1], prot, wallSet);
    if (added.reduce((n, s) => n + s.length, 0) + seg.length > maxAdded) continue;
    const cand = clone(lv); cand.board.walls.push(...seg);
    if (relocate) {
      const taken = new Set(cand.board.walls.map(key));
      const free = [];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const k = key([x, y]); if (!taken.has(k) && !prot.has(k)) free.push([x, y]); }
      if (!free.length) continue;
      const to = free[(rand() * free.length) | 0];
      const obj = relocate.type === 'switch' ? cand.devices.find((d) => d.type === 'switch' && d.gate === relocate.gate) : cand.items.find((d) => d.type === 'key' && d.id === relocate.id);
      if (!obj) continue;
      obj.cell = to;
    }
    if (structuralErrors(cand).length) continue;
    const ca = analyze(cand);
    if (!ca.solvable || ca.min > maxMin) continue;
    if (ca.problems.length > a.problems.length || (ca.problems.length === a.problems.length && rand() < 0.65)) continue;
    lv = cand; a = ca; added.push(seg);
  }
  const ok = a.problems.length === 0;
  if (ok) {                                                       // prune walls that turned out to be unnecessary
    for (let k = added.length - 1; k >= 0; k--) {
      const cand = clone(lv), drop = new Set(added[k].map(key));
      cand.board.walls = cand.board.walls.filter((w) => !drop.has(key(w)));
      const ca = analyze(cand);
      if (ca.solvable && !ca.problems.length && ca.min >= a.min - 4) { lv = cand; a = ca; added.splice(k, 1); }
    }
  }
  return { ok: ok, lv: lv, added: added, analysis: a, tries: tries };
}

if (process.argv[1] && process.argv[1].endsWith('augment.mjs')) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const ids = process.argv[4].split(',').map(Number);
  const out = {};
  for (const id of ids) {
    const lv = input[id - 1], t0 = Date.now();
    let best = null;
    for (let attempt = 0; attempt < 4 && !(best && best.ok); attempt++) {
      const r = augment(lv, { seed: id * 7919 + attempt * 104729, maxMin: Math.min(54, Math.ceil(lv.parMoves * 1.4) + 4), maxAdded: 34, iters: 2500 });
      if (!best || (r.ok && !best.ok) || (!best.ok && r.analysis && best.analysis && r.analysis.problems.length < best.analysis.problems.length)) best = r;
    }
    out[id] = { ok: best.ok, lv: best.lv, added: best.added, min: best.analysis && best.analysis.min, problems: best.analysis && best.analysis.problems.map((p) => p.kind + p.id) };
    console.error('L' + id, best.ok ? 'ok' : 'FAILED', 'min', out[id].min, 'walls added', (best.added || []).reduce((n, s) => n + s.length, 0), ((Date.now() - t0) / 1000).toFixed(1) + 's', out[id].problems && out[id].problems.join(','));
  }
  fs.writeFileSync(process.argv[3], JSON.stringify(out));
}
