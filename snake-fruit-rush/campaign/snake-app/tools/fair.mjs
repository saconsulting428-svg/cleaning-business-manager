// Real-time fairness helper: among routes that are about as short as the best one, find the one with the fewest
// "tight" turns (a turn made one cell after the previous turn), because those are the hardest to execute while the
// snake keeps moving. Dijkstra over (state + current straight run).
import { E } from './solver.mjs';
const LETTER = (d) => (d[0] === 0 ? (d[1] < 0 ? 'U' : 'D') : (d[0] < 0 ? 'L' : 'R'));

class Heap {
  constructor() { this.a = []; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].c <= a[i].c) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l].c < a[m].c) m = l; if (r < a.length && a[r].c < a[m].c) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

// Dijkstra over (state, straight run, tight-turn streak). maxStreak limits how many tight turns may follow each other.
export function solveFair(level, opts) {
  const rt = E.makeRuntime(level), maxMoves = opts.maxMoves, straight = opts.straight || 2, pred = opts.pred || (() => true);
  const maxStreak = opts.maxStreak === undefined ? 99 : opts.maxStreak, weight = opts.weight === undefined ? 0.4 : opts.weight;
  const start = E.newState(rt);
  const h = new Heap();
  h.push({ st: start, path: '', c: 0, run: 9, streak: 0, tight: 0, turns: 0 });
  const best = new Map();
  let visited = 0;
  while (h.size) {
    const n = h.pop(), st = n.st;
    const kk = E.stateKey(st) + '|' + Math.min(n.run, 3) + '|' + Math.min(n.streak, 9);
    if (best.has(kk) && best.get(kk) <= n.c) continue;
    best.set(kk, n.c);
    if (++visited > (opts.maxStates || 2e6)) return null;
    if (st.moves >= maxMoves) continue;
    const r0 = E.resolveDir(rt, st, null);
    let options = r0.forced ? [null] : E.DIR_LIST.filter((d) => !E.opposite(d, st.dir));
    if (st.moves < straight) options = [null];
    for (const d of options) {
      const turned = d && !E.sameDir(d, st.dir);
      const tight = !!turned && n.run < 2;
      const streak = tight ? n.streak + 1 : (turned || n.run + 1 >= 2 ? 0 : n.streak);
      if (streak > maxStreak) continue;
      const c = E.cloneState(st);
      const res = E.step(rt, c, d);
      if (res.status === 'fail' || res.status === 'wait') continue;
      const run = turned ? 0 : n.run + 1;
      const cost = n.c + 1 + (tight ? weight : 0);
      const path = n.path + (d ? LETTER(d) : '.');
      if (res.status === 'win') { if (pred(rt, c)) return { moves: c.moves, path: path, tight: n.tight + (tight ? 1 : 0), turns: n.turns + (turned ? 1 : 0), streak: streak }; continue; }
      h.push({ st: c, path: path, c: cost, run: run, streak: streak, tight: n.tight + (tight ? 1 : 0), turns: n.turns + (turned ? 1 : 0) });
    }
  }
  return null;
}
// stats of a stored solution (letters; '.' = forced/ice tick)
export function routeStats(level, path) {
  const rt = E.makeRuntime(level), st = E.newState(rt);
  const M = { U: E.DIRS.up, D: E.DIRS.down, L: E.DIRS.left, R: E.DIRS.right };
  let run = 9, tight = 0, turns = 0, maxRun = 0, tightStreak = 0, maxTightStreak = 0, firstTurnTick = -1;
  for (let i = 0; i < path.length; i++) {
    const c = path[i], d = M[c] || null, before = st.dir;
    E.step(rt, st, d);
    const turned = d && !E.sameDir(d, before);
    if (turned) { turns++; if (firstTurnTick < 0) firstTurnTick = i; if (run < 2) { tight++; tightStreak++; maxTightStreak = Math.max(maxTightStreak, tightStreak); } else tightStreak = 0; run = 0; } else run++;
    maxRun = Math.max(maxRun, run);
  }
  return { turns: turns, tight: tight, maxTightStreak: maxTightStreak, firstTurnTick: firstTurnTick, moves: path.length };
}
