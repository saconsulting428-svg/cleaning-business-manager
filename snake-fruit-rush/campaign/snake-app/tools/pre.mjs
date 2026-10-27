// stage 1: raw -> structurally valid levels (+ log of everything that was changed)
import fs from 'fs';
import { convert } from './convert.mjs';
import { FIXES } from './fixes.mjs';
import { cleanOverlaps, structuralErrors, fixRunway, relocateStart } from './structural.mjs';
import { solve } from './solver.mjs';
const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const levels = convert(raw);
const log = {};
for (const lv of levels) {
  const notes = [];
  if (FIXES[lv.id]) { FIXES[lv.id].apply(lv); notes.push(FIXES[lv.id].why); }
  notes.push(...cleanOverlaps(lv));
  const ch = fixRunway(lv, (dn) => {
    const c = JSON.parse(JSON.stringify(lv)); c.snake.direction = dn;
    const r = solve(c, { maxMoves: 60, maxStates: 1e6 });
    return r && !r.aborted ? r.moves : 999;
  });
  if (ch) notes.push('start heading changed (' + ch + ') so the snake has 3 clear cells ahead');
  if (structuralErrors(lv).length) {
    const mv = relocateStart(lv, () => { const r = solve(lv, { maxMoves: 60, maxStates: 1e6 }); return r && !r.aborted ? r.moves : 999; });
    if (mv) notes.push('start moved (' + mv + ') to get a clear runway');
  }
  const errs = structuralErrors(lv);
  if (errs.length) notes.push('STILL INVALID: ' + errs.join('; '));
  if (notes.length) log[lv.id] = notes;
}
fs.writeFileSync(process.argv[3], JSON.stringify(levels, null, 1));
fs.writeFileSync(process.argv[4], JSON.stringify(log, null, 1));
console.log('changed levels:', Object.keys(log).length);
for (const [id, n] of Object.entries(log)) console.log(id, n.join(' | '));
