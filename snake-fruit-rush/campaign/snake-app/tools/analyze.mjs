import { solve, E } from './solver.mjs';
const clone = (o) => JSON.parse(JSON.stringify(o));
const cellEq = (a, b) => a[0] === b[0] && a[1] === b[1];
const LETTER = { U: E.DIRS.up, D: E.DIRS.down, L: E.DIRS.left, R: E.DIRS.right };
export const STRAIGHT = 2;      // the first two ticks of every intended route go straight

export function pathCells(lv, path) {
  const rt = E.makeRuntime(lv), st = E.newState(rt), cells = [st.body[0]];
  for (const c of path) { const r = E.step(rt, st, LETTER[c] || null); cells.push(st.body[0]); if (r.status === 'win' || r.status === 'fail') break; }
  return cells;
}

// Which devices does the optimal route actually touch? (a device that is on the best route clearly matters)
export function usage(lv, path) {
  const rt = E.makeRuntime(lv), st = E.newState(rt), u = { door: new Set(), gate: new Set(), portal: new Set(), ice: false, cells: new Set([st.body[0]]) };
  for (const c of path) {
    const r = E.step(rt, st, LETTER[c] || null);
    u.cells.add(st.body[0]);
    if (rt.ice[st.body[0]]) u.ice = true;
    if (rt.doorAt[st.body[0]] >= 0) u.door.add(rt.doors[rt.doorAt[st.body[0]]].id);
    if (rt.gateAt[st.body[0]] >= 0) u.gate.add(rt.gates[rt.gateAt[st.body[0]]].id);
    r.events.forEach((e) => { if (e.t === 'portal') { lv.devices.filter((d) => d.type === 'portal').forEach((d) => { if (d.cells.some((cc) => cc[1] * lv.board.cols + cc[0] === e.from)) u.portal.add(d.id); }); } });
    if (r.status === 'win' || r.status === 'fail') break;
  }
  return u;
}
// Solve a level and test that every device really matters. problems[] entries: {kind, id, cells}
export function analyze(lv, opts = {}) {
  const maxMoves = opts.maxMoves || 70;
  const sOpts = (extra) => Object.assign({ maxMoves: maxMoves, maxStates: 3e6, straight: STRAIGHT }, extra);
  const base = solve(lv, sOpts({ maxMoves: lv.hardMoveLimit || maxMoves }));
  const res = { id: lv.id, solvable: !!(base && !base.aborted), aborted: !!(base && base.aborted), min: base && base.moves, path: base && base.path, problems: [] };
  if (!res.solvable) return res;
  res.cells = pathCells(lv, base.path);
  const used = usage(lv, base.path);
  const variant = (fn) => { const v = clone(lv); fn(v); v.hardMoveLimit = null; const r = solve(v, sOpts({ maxMoves: res.min + 14 })); return { r: r, v: v }; };
  const report = (kind, id, out, extra) => {
    const isUsed = (kind === 'door' && used.door.has(id)) || (kind === 'gate' && used.gate.has(id)) || (kind === 'portal' && used.portal.has(id)) || (kind === 'ice' && used.ice);
    if (isUsed) return;                                           // on the optimal route: it matters
    if (out.r && !out.r.aborted && out.r.moves < res.min + extra) res.problems.push({ kind: kind, id: id, delta: out.r.moves - res.min, cells: pathCells(out.v, out.r.path) });
  };
  lv.devices.filter((d) => d.type === 'door').forEach((d) => report('door', d.id, variant((v) => { v.board.walls.push(d.cell); v.devices = v.devices.filter((x) => x !== d && !(x.type === 'door' && cellEq(x.cell, d.cell))); }), 6));
  lv.devices.filter((d) => d.type === 'gate').forEach((d) => report('gate', d.id, variant((v) => { v.board.walls.push(d.cell); v.devices = v.devices.filter((x) => !(x.type === 'gate' && x.id === d.id) && !(x.type === 'switch' && x.gate === d.id)); }), 6));
  lv.devices.filter((d) => d.type === 'portal').forEach((d) => report('portal', d.id, variant((v) => { d.cells.forEach((c) => v.board.walls.push(c)); v.devices = v.devices.filter((x) => !(x.type === 'portal' && x.id === d.id)); }), 4));
  if (lv.board.ice.length) report('ice', '', variant((v) => { lv.board.ice.forEach((c) => v.board.walls.push(c)); v.board.ice = []; }), 3);
  if (lv.items.some((i) => i.type === 'bomb')) {
    const out = variant((v) => { v.items = v.items.filter((i) => i.type !== 'bomb'); });
    const near = lv.items.some((b) => b.type === 'bomb' && [...used.cells].some((c) => Math.abs((c % 8) - b.cell[0]) <= 1 && Math.abs(((c / 8) | 0) - b.cell[1]) <= 1));
    if (!near && out.r && !out.r.aborted && out.r.moves > res.min - 2) res.problems.push({ kind: 'bombs', id: '', delta: out.r.moves - res.min, cells: pathCells(out.v, out.r.path) });
  }
  return res;
}
