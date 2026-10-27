// Final stage: compute pars / star rules / solutions from the real solver, validate, and write the level data files.
import fs from 'fs';
import { solve, E } from './solver.mjs';
import { analyze, STRAIGHT } from './analyze.mjs';
import { structuralErrors } from './structural.mjs';
import { solveFair, routeStats } from './fair.mjs';

const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const designRaw = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));     // levels_conv (design) for the change log
const outDir = process.argv[4];
const WORLD_IDS = ['garden', 'desert', 'ice', 'volcano', 'night'];
const only = process.argv[5] ? process.argv[5].split(',').map(Number) : null;
const clone = (o) => JSON.parse(JSON.stringify(o));
const key = (c) => c[0] + ',' + c[1];

const finals = [], report = [], changeLog = {};
for (const lv0 of input) {
  if (only && !only.includes(lv0.id)) continue;
  const lv = clone(lv0), notes = [];
  const errs = structuralErrors(lv);
  const a = analyze(lv);
  if (errs.length || !a.solvable) { report.push({ id: lv.id, ok: false, errs: errs, solvable: a.solvable }); continue; }
  const minAny = a.min;
  // ---- three-star rules (everything except the move count)
  let extra = lv.starRules.three.filter((r) => r.type !== 'movesAtMost');
  const probe = (rules) => solve(lv, { maxMoves: (lv.hardMoveLimit || 70), straight: STRAIGHT, maxStates: 3e6, pred: (rt, st) => E.checkAll(rt, st, rules) });
  let m3 = probe(extra);
  const relaxed = [];
  while (!m3 && extra.length) { relaxed.push(extra[extra.length - 1].type); extra = extra.slice(0, -1); m3 = probe(extra); }
  if (!m3) { m3 = { moves: minAny, path: a.path }; }
  const min3 = m3.moves;
  // ---- comfortable route: no more than `lim` tight turns (1-cell zig-zags) in a row, so it can be played in real time
  const rulesPred = (rt, st) => E.checkAll(rt, st, extra);
  let comfort = null, lim = 2;
  for (; lim <= 8 && !comfort; lim++) comfort = solveFair(lv, { maxMoves: Math.max(min3 * 2 + 8, 24), straight: STRAIGHT, maxStreak: lim, weight: 1.0, pred: rulesPred });
  lim -= 1;
  const comfy = comfort || m3;
  const threeCap = Math.max(min3 + (min3 >= 18 ? 2 : 1), comfy.moves);
  const twoCap = Math.max(threeCap + 3, minAny + Math.ceil(minAny * 0.3));
  let cap = lv.hardMoveLimit ? Math.max(twoCap + 3, minAny + Math.ceil(minAny * 0.5) + 3) : null;
  const sol = comfy.path;
  // the snake's tick: slower where even the comfortable route needs a run of quick turns
  const tickMs = lim <= 2 ? 180 : lim === 3 ? 195 : lim === 4 ? 210 : 230;
  const stats = routeStats(lv, sol);
  // ---- write final level
  const out = {
    id: lv.id, world: WORLD_IDS[Math.floor((lv.id - 1) / 20)], difficulty: lv.difficulty,
    board: { cols: 8, rows: 8, walls: lv.board.walls.slice().sort((p, q) => p[1] - q[1] || p[0] - q[0]), ice: lv.board.ice.slice().sort((p, q) => p[1] - q[1] || p[0] - q[0]) },
    snake: lv.snake, items: lv.items, devices: lv.devices, exit: lv.exit,
    parMoves: twoCap, hardMoveLimit: cap, tickMs: tickMs,
    starRules: { one: { type: 'complete' }, two: { type: 'movesAtMost', value: twoCap }, three: [{ type: 'movesAtMost', value: threeCap }, ...extra] },
    mechanics: lv.mechanics, requiredFruit: lv.requiredFruit, hint: lv.hint, solution: sol
  };
  // ---- re-verify the final object end to end
  const re = analyze(out);
  const chk = solve(out, { maxMoves: (cap || 80), straight: STRAIGHT, pred: (rt, st) => E.checkAll(rt, st, out.starRules.three) });
  const rep = { id: lv.id, ok: !!(re.solvable && chk && !re.problems.length), min: minAny, min3: min3, par: twoCap, three: threeCap, cap: cap, tight: stats.tight, tightStreak: stats.maxTightStreak, tickMs: tickMs, comfortLimit: lim, turns: stats.turns, relaxed: relaxed, problems: re.problems.map((p) => p.kind + p.id), solutionLen: sol.length };
  report.push(rep);
  finals.push(out);
  // change log versus the design document
  const d = designRaw[lv.id - 1], dw = new Set(d.board.walls.map(key)), fw = new Set(out.board.walls.map(key));
  const added = [...fw].filter((k) => !dw.has(k)), removed = [...dw].filter((k) => !fw.has(k));
  const mv = [];
  const cmp = (name, x, y) => { if (JSON.stringify(x) !== JSON.stringify(y)) mv.push(name); };
  cmp('snake', d.snake, out.snake);
  d.items.forEach((it, i) => { const o = out.items[i]; if (!o || JSON.stringify(it.cell) !== JSON.stringify(o.cell)) mv.push(it.type + '@' + key(it.cell) + ' moved'); });
  d.devices.forEach((dv, i) => { const o = out.devices[i]; if (!o || JSON.stringify(dv.cell || dv.cells) !== JSON.stringify(o.cell || o.cells)) mv.push(dv.type + ' ' + dv.id + ' moved'); });
  changeLog[lv.id] = { wallsAdded: added, wallsRemoved: removed, moved: mv, parDesign: d.parMoves, parNow: twoCap, minMoves: minAny };
}
// ---- write data files
fs.mkdirSync(outDir, { recursive: true });
const fmt = (lv) => {
  const j = JSON.stringify, L = [];
  L.push('  { id: ' + lv.id + ', world: ' + j(lv.world) + ', difficulty: ' + lv.difficulty + ',');
  L.push('    board: { cols: 8, rows: 8, walls: ' + j(lv.board.walls) + ', ice: ' + j(lv.board.ice) + ' },');
  L.push('    snake: ' + j(lv.snake) + ', exit: ' + j(lv.exit) + ',');
  L.push('    items: [' + lv.items.map((i) => j(i)).join(', ') + '],');
  L.push('    devices: [' + lv.devices.map((i) => j(i)).join(', ') + '],');
  L.push('    parMoves: ' + lv.parMoves + ', hardMoveLimit: ' + j(lv.hardMoveLimit) + ', tickMs: ' + lv.tickMs + ',');
  L.push('    starRules: ' + j(lv.starRules) + ',');
  L.push('    mechanics: ' + j(lv.mechanics) + ', requiredFruit: ' + lv.requiredFruit + ',');
  L.push('    solution: ' + j(lv.solution) + ',');
  L.push('    hint: ' + j(lv.hint) + ' }');
  return L.join('\n');
};
if (!only) {
  for (let w = 0; w < 5; w++) {
    const part = finals.filter((l) => Math.floor((l.id - 1) / 20) === w);
    const names = ['Garden', 'Desert', 'Ice', 'Volcano', 'Night'];
    const body = '/* World ' + (w + 1) + ' - ' + names[w] + ' (levels ' + (w * 20 + 1) + '-' + (w * 20 + 20) + ').\n * Plain data: the engine builds each level from these objects. Coordinates are (x, y), origin top-left, 8 x 8 board.\n * parMoves = two-star limit, starRules.three = three-star conditions, solution = shortest fair route (U/D/L/R, "." = forced tick). */\n' +
      'window.SFR_LEVELS = (window.SFR_LEVELS || []).concat([\n' + part.map(fmt).join(',\n') + '\n]);\n';
    fs.writeFileSync(outDir + '/world' + (w + 1) + '.js', body);
  }
}
fs.writeFileSync(outDir + '/../../../../tools/level-report.json', JSON.stringify(report, null, 1));
fs.writeFileSync(outDir + '/../../../../tools/level-changes.json', JSON.stringify(changeLog, null, 1));
const bad = report.filter((r) => !r.ok);
console.log('levels', report.length, 'ok', report.length - bad.length, 'bad', bad.map((b) => b.id + (b.problems && b.problems.length ? ':' + b.problems.join('+') : (b.errs ? ':' + b.errs.join('|') : ''))).join(' '));
const tightLv = report.filter((r) => r.ok && r.tightStreak >= 3);
console.log('routes still with >=3 tight turns in a row:', tightLv.map((r) => r.id + '(streak ' + r.tightStreak + ')').join(' '));
const tm = {}; report.forEach((r) => { tm[r.tickMs] = (tm[r.tickMs] || 0) + 1; }); console.log('tick speeds:', JSON.stringify(tm));
console.log('relaxed 3-star rules:', report.filter((r) => r.relaxed && r.relaxed.length).map((r) => r.id + ':' + r.relaxed.join(',')).join(' '));
