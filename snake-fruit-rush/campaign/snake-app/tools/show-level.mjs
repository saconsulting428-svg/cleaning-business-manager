// Prints a level as ASCII with its stored route.   node tools/show-level.mjs 53 68
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { fileURLToPath } from 'url';
import { E } from './solver.mjs';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../www/js/levels');
const ctx = { window: {} };
for (let w = 1; w <= 5; w++) vm.runInNewContext(fs.readFileSync(path.join(dir, 'world' + w + '.js'), 'utf8'), ctx);
const levels = ctx.window.SFR_LEVELS.slice().sort((a, b) => a.id - b.id);
const M = { U: E.DIRS.up, D: E.DIRS.down, L: E.DIRS.left, R: E.DIRS.right };
for (const id of process.argv.slice(2).map(Number)) {
  const lv = levels[id - 1], rt = E.makeRuntime(lv), st = E.newState(rt), trail = new Set(), start = new Set(st.body);
  for (const c of lv.solution) { const r = E.step(rt, st, M[c] || null); trail.add(st.body[0]); if (r.status !== 'ok') break; }
  console.log('L' + id, lv.world, 'snake', JSON.stringify(lv.snake), 'tick', lv.tickMs, 'route', lv.solution);
  for (let y = 0; y < 8; y++) { let row = ''; for (let x = 0; x < 8; x++) { const i = y * 8 + x; let c = '.';
    if (rt.wall[i]) c = '#'; else if (rt.ice[i]) c = '~'; else if (rt.bomb[i]) c = 'X';
    if (rt.doorAt[i] >= 0) c = 'D'; else if (rt.gateAt[i] >= 0) c = 'G'; else if (rt.switchAt[i] >= 0) c = 'w'; else if (rt.keyAt[i] >= 0) c = 'k';
    else if (rt.fruitAt[i] >= 0) c = rt.fruits[rt.fruitAt[i]].required ? 'f' : 'o'; else if (rt.portalTo[i] >= 0) c = 'T';
    if (i === rt.exit) c = 'E'; if (start.has(i)) c = 'S'; else if (trail.has(i) && (c === '.' || c === '~')) c = '*';
    row += c + ' '; } console.log(row); }
  console.log('');
}
