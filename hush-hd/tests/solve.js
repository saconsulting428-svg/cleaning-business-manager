// Heuristic beam-search solver over the real simulation. Finds an action list that completes a level; the list is later replayed
// through the game's own input path in a real browser (tests/playthrough.js) and on the ORIGINAL simulation (tests/verify-original.js).
const N = require('./load-new.js'), Sim = N.Sim, fs = require('fs'), path = require('path');
const ACTS = [{ mx: 1 }, { mx: -1 }, { mx: 1, crouch: true }, { mx: -1, crouch: true }, {}, { crouch: true }, { use: true }, { ping: true }];
const NT = 12;
function key(S) {
  const r = v => Math.round(v * 20);
  const k = [S.f, r(S.x), S.crouch | 0, S.hid, S.busy > 0 ? 1 : 0, S.vent | 0, S.keys, S.took, S.power | 0, S.open, S.rev, S.sl, S.scd > 0 ? 1 : 0, S.su, S.det | 0, S.genN > 0 ? 1 : 0, S.radN > 0 || S.radT >= 0 ? 1 : 0];
  for (const c of S.cr) k.push(c.f, r(c.x), c.dir, c.st, c.busy > 0 ? 1 : 0);
  return k.join(',');
}
function gdist(W, f1, x1, f2, x2) {
  const nodes = [{ f: f1, x: x1, id: -1 }, { f: f2, x: x2, id: -2 }]; W.objs.forEach(o => { if (o.t === 'stairs' || o.t === 'vent') nodes.push(o); });
  const walls = W.objs.filter(o => o.t === 'door' && o.kind === 'wall'), n = nodes.length, D = new Array(n).fill(1e9), done = new Array(n).fill(false); D[0] = 0;
  const blocked = (a, b) => walls.some(w => w.f === a.f && (w.x - a.x) * (w.x - b.x) < 0);
  for (let it = 0; it < n; it++) {
    let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || D[i] < D[u])) u = i; if (u < 0 || D[u] >= 1e9) break; done[u] = true;
    for (let v = 0; v < n; v++) { if (done[v]) continue; const a = nodes[u], b = nodes[v]; let c = 1e9;
      if (a.f === b.f && !blocked(a, b)) c = Math.abs(a.x - b.x);
      if (a.link !== undefined && a.link === b.id && a.id >= 0) c = Math.min(c, 1.5);
      if (D[u] + c < D[v]) D[v] = D[u] + c; }
  }
  return D[1];
}
function h(W, S) {
  const pts = [], needKey = W.doors.some(d => d.kind === 'locked' && !Sim.doorOpen(S, d));
  if (needKey && S.keys === 0) { const ks = W.keys.filter(k => !((S.took >> k.bit) & 1)); if (ks.length) pts.push(ks[0]); }
  if (needKey) { const ds = W.doors.filter(d => d.kind === 'locked' && !Sim.doorOpen(S, d)); pts.push(ds[0]); }
  if (!S.power && (W.exit.power || W.doors.some(d => d.kind === 'power' && !Sim.doorOpen(S, d)))) pts.unshift(W.gen);
  pts.push(W.exit);
  let cf = S.f, cx = S.x, tot = 0; for (const p of pts) { const r = gdist(W, cf, cx, p.f, p.x); tot += r > 1e8 ? 200 : r; cf = p.f; cx = p.x; }
  let hv = 0; W.vents.forEach(v => { if (v.hidden && !((S.rev >> v.bit) & 1)) hv++; });
  return tot + pts.length * 10 + 6 * hv;
}
function solve(li, K, maxMacro) {
  const W = Sim.parse(N.LEVELS[li]); let layer = [{ S: Sim.init(W), p: null }], best = null;
  for (let m = 0; m < maxMacro && layer.length; m++) {
    const cand = new Map();
    for (const node of layer) for (let a = 0; a < ACTS.length; a++) {
      const A = ACTS[a], S0 = node.S;
      if (A.ping && (S0.sl <= 0 || S0.scd > 0)) continue; if (A.use && !Sim.target(W, S0)) continue;
      const S = Sim.clone(S0);
      for (let t = 0; t < NT && !S.won && !S.dead; t++) { Sim.step(W, S, { mx: A.mx || 0, crouch: !!A.crouch, use: t === 0 && !!A.use, ping: t === 0 && !!A.ping }); S.ev.length = 0; }
      if (S.dead) continue;
      const np = { a, prev: node.p };
      if (S.won) { const st = Sim.stars(W, S); if (!best || st > best.stars) { const acts = []; for (let q = np; q; q = q.prev) acts.push(q.a); best = { stars: st, t: +S.t.toFixed(1), su: S.su, det: S.det, path: acts.reverse() }; } continue; }
      const k = key(S), sc = h(W, S) + (S.det ? 15 : 0) + (S.su > W.par ? 8 * (S.su - W.par) : 0) + S.t * 0.05, o = cand.get(k);
      if (!o || o.sc > sc) cand.set(k, { S, sc, p: np });
    }
    if (best && best.stars === 3) return best;
    layer = [...cand.values()].sort((x, y) => x.sc - y.sc).slice(0, K);
    if (best && m > best.path.length + 40) break;
  }
  return best;
}
const levels = process.argv[2].split(',').map(Number), outFile = path.join(__dirname, 'solutions', 'L' + levels.join('_') + '.json');
fs.mkdirSync(path.join(__dirname, 'solutions'), { recursive: true });
const res = {};
for (const L of levels) {
  const K = { 15: 15000, 24: 8000, 29: 6000 }[L] || 3000, t0 = Date.now(), r = solve(L - 1, K, 320);
  res[L] = r; console.log(L, N.LEVELS[L - 1].name, r ? `stars=${r.stars} t=${r.t} su=${r.su} det=${r.det} len=${r.path.length}` : 'NOT SOLVED', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  fs.writeFileSync(outFile, JSON.stringify(res));
}
