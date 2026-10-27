// Validates ALL 100 levels with the real engine.   node tools/validate-levels.mjs
// Checks structure, spawn, start runway, solvability, stored solution replay, stars, caps, device necessity,
// accessibility and real-time fairness (turn density vs. tick speed). Exit code 1 if anything is wrong.
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';
import { E, solve } from './solver.mjs';
import { analyze, STRAIGHT } from './analyze.mjs';
import { structuralErrors } from './structural.mjs';
import { routeStats } from './fair.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../www/js/levels');
const ctx = { window: {} };
for (let w = 1; w <= 5; w++) vm.runInNewContext(fs.readFileSync(path.join(dir, 'world' + w + '.js'), 'utf8'), ctx);
const levels = ctx.window.SFR_LEVELS.slice().sort((a, b) => a.id - b.id);

const M = { U: E.DIRS.up, D: E.DIRS.down, L: E.DIRS.left, R: E.DIRS.right };
const WORLD = ['garden', 'desert', 'ice', 'volcano', 'night'];
const errors = [], warns = [], rows = [];
const err = (lv, m) => errors.push('L' + lv.id + ': ' + m);

if (levels.length !== 100) errors.push('expected 100 levels, found ' + levels.length);
levels.forEach((lv, i) => { if (lv.id !== i + 1) errors.push('level ids must be 1..100 in order (got ' + lv.id + ' at ' + (i + 1) + ')'); });

for (const lv of levels) {
  if (lv.world !== WORLD[Math.floor((lv.id - 1) / 20)]) err(lv, 'wrong world name ' + lv.world);
  // structure: spawn, overlaps, start direction + 3 clear cells ahead, door/key/switch/gate/portal links
  structuralErrors(lv).forEach((e) => err(lv, e));
  const rt = E.makeRuntime(lv);
  // no immediate unavoidable collision: the snake can go straight for 3 ticks
  { const st = E.newState(rt); for (let t = 0; t < 3; t++) { const r = E.step(rt, st, null); if (r.status === 'fail') { err(lv, 'dies within 3 ticks without any input (' + r.reason + ')'); break; } } }
  // required fruit / exit / key / gate / portal cells reachable (flood fill, doors and gates treated as passable)
  { const seen = new Uint8Array(64), q = [lv.snake.head[1] * 8 + lv.snake.head[0]]; seen[q[0]] = 1;
    const portal = (c) => (rt.portalTo[c] >= 0 ? rt.portalTo[c] : -1);
    while (q.length) { const c = q.pop(), x = c % 8, y = (c / 8) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((d) => { const nx = x + d[0], ny = y + d[1]; if (nx < 0 || ny < 0 || nx > 7 || ny > 7) return; const n = ny * 8 + nx; if (rt.wall[n] || seen[n]) return; seen[n] = 1; q.push(n); const p = portal(n); if (p >= 0 && !seen[p]) { seen[p] = 1; q.push(p); } }); }
    rt.fruits.forEach((f, i) => { if (!seen[f.cell]) err(lv, 'fruit ' + i + ' is unreachable'); });
    rt.keys.forEach((k) => { if (!seen[k.cell]) err(lv, 'key ' + k.id + ' is unreachable'); });
    rt.switches.forEach((s) => { if (!seen[s.cell]) err(lv, 'switch ' + s.id + ' is unreachable'); });
    if (!seen[rt.exit]) err(lv, 'exit is unreachable'); }
  // replay the stored solution through the real engine
  let st = E.newState(rt), final = null;
  for (const c of lv.solution) { final = E.step(rt, st, M[c] || null); if (final.status !== 'ok') break; }
  if (!final || final.status !== 'win') { err(lv, 'stored solution does not win (' + (final && final.status) + ' ' + (final && final.reason) + ')'); continue; }
  const stars = E.evaluateStars(rt, st);
  if (stars !== 3) err(lv, 'stored solution earns ' + stars + ' stars (3-star rules not achievable?)');
  if (st.moves > lv.starRules.three[0].value) err(lv, '3-star move limit smaller than the stored solution');
  if (lv.parMoves < st.moves || lv.starRules.two.value !== lv.parMoves) err(lv, 'par inconsistent');
  if (lv.hardMoveLimit && lv.hardMoveLimit < lv.parMoves + 2) err(lv, 'hard cap too tight for the 2-star par');
  // independent solver: shortest route exists, and par/caps are reasonable
  const a = analyze(lv);
  if (!a.solvable) { err(lv, 'solver finds no route'); continue; }
  if (a.min > st.moves) err(lv, 'solver found a shorter route than the stored one that is not shorter: ' + a.min + ' < ' + st.moves + ' (ok, just informational)');
  a.problems.forEach((p) => err(lv, 'device not meaningful: ' + p.kind + ' ' + p.id));
  // real-time fairness
  const rs = routeStats(lv, lv.solution);
  if (rs.firstTurnTick >= 0 && rs.firstTurnTick < STRAIGHT) err(lv, 'first turn comes too early (tick ' + rs.firstTurnTick + ')');
  const need = rs.maxTightStreak <= 2 ? 180 : rs.maxTightStreak === 3 ? 195 : rs.maxTightStreak === 4 ? 210 : 230;
  if ((lv.tickMs || 180) < need) err(lv, 'tick ' + lv.tickMs + ' ms is too fast for ' + rs.maxTightStreak + ' quick turns in a row');
  rows.push({ id: lv.id, min: a.min, route: st.moves, par: lv.parMoves, cap: lv.hardMoveLimit, tick: lv.tickMs, turns: rs.turns, tightStreak: rs.maxTightStreak, mech: lv.mechanics.join('+') });
}

console.log('id  min route par cap  tick turns streak mechanics');
rows.forEach((r) => console.log(String(r.id).padEnd(3), String(r.min).padEnd(4), String(r.route).padEnd(5), String(r.par).padEnd(3), String(r.cap || '-').padEnd(4), String(r.tick).padEnd(4), String(r.turns).padEnd(5), String(r.tightStreak).padEnd(6), r.mech));
console.log('\nlevels checked:', levels.length, '| errors:', errors.length);
errors.forEach((e) => console.log('ERROR', e));
process.exit(errors.length ? 1 : 0);
