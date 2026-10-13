import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
let bad = 0, t0 = Date.now();
LEVELS.forEach((spec, i) => {
  try { const t = Date.now(); const w = generate(spec); const kinds = {}; w.objs.forEach(o => { const k = o.type + (o.kind ? ':' + o.kind : ''); kinds[k] = (kinds[k] || 0) + 1; });
    console.log(String(i + 1).padStart(2), spec.name.padEnd(20), w.W + 'x' + w.H, 'rooms', w.rooms.length, 'attempt', w.attempt, 'sol', w.solution.length, (Date.now() - t) + 'ms', JSON.stringify(kinds)); }
  catch (e) { bad++; console.log('FAIL', i + 1, spec.name, e.message); }
});
console.log(bad ? bad + ' failed' : 'all 30 generated + solved', (Date.now() - t0) + 'ms'); process.exit(bad ? 1 : 0);
