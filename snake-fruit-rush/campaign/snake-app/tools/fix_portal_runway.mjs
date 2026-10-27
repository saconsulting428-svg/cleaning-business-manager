// Some levels send the snake through a portal in its first ticks and it lands facing a wall 2 cells away.
// Move the landing endpoint (at most 2 tiles) so the snake has 3 safe ticks, keeping the level solvable and meaningful.
import fs from 'fs';
import { E } from './solver.mjs';
import { analyze } from './analyze.mjs';
import { structuralErrors, protectedCells } from './structural.mjs';
const levels = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const key = (c) => c[0] + ',' + c[1];
const dies3 = (lv) => { const rt = E.makeRuntime(lv), st = E.newState(rt); for (let t = 0; t < 3; t++) { const r = E.step(rt, st, null); if (r.status === 'fail') return true; } return false; };
const log = [];
levels.forEach((lv, i) => {
  if (!dies3(lv)) return;
  const portals = lv.devices.filter((d) => d.type === 'portal');
  let fixed = null;
  outer: for (const pd of portals) for (let which = 0; which < 2; which++) {
    const orig = pd.cells[which], taken = new Set([...lv.board.walls, ...lv.board.ice].map(key));
    const prot = protectedCells(lv);
    const cands = [];
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) { const d = Math.abs(dx) + Math.abs(dy); if (!d || d > 2) continue; const c = [orig[0] + dx, orig[1] + dy]; if (c[0] < 0 || c[1] < 0 || c[0] > 7 || c[1] > 7) continue; cands.push({ c, d }); }
    cands.sort((a, b) => a.d - b.d);
    for (const { c } of cands) {
      if (taken.has(key(c)) || prot.has(key(c))) continue;
      const t = clone(lv), td = t.devices.find((x) => x.id === pd.id && x.type === 'portal');
      td.cells[which] = c;
      if (structuralErrors(t).length || dies3(t)) continue;
      const a = analyze(t);
      if (!a.solvable || a.problems.length) continue;
      levels[i] = t; fixed = pd.id + ' end ' + which + ' ' + key(orig) + ' -> ' + key(c); break outer;
    }
  }
  log.push('L' + lv.id + ': ' + (fixed || 'NOT FIXED'));
});
console.log(log.join('\n') || 'nothing to fix');
fs.writeFileSync(process.argv[3], JSON.stringify(levels));
