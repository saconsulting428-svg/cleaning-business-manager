import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { World } from '../src/logic/world.js';
import { runBot } from './bot.mjs';
let fail = 0;
LEVELS.forEach((spec, i) => {
  const w = new World(generate(spec), { god: true }); const r = runBot(w, 700);
  if (!r.ok) fail++; console.log((r.ok ? 'PASS' : 'FAIL'), String(i + 1).padStart(2), spec.name.padEnd(20), r.ok ? 'won in ' + r.t.toFixed(0) + 's (par ' + w.gen.par + ') hunts ' + w.huntCount : r.why);
});
console.log(fail ? fail + ' failed' : 'all ' + (LEVELS ? LEVELS.length : 40) + ' levels completed through the real game logic'); process.exit(fail ? 1 : 0);
