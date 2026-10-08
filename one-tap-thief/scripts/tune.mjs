// Design aid: try parameter overrides on a level and print difficulty metrics.
// usage: node scripts/tune.mjs <level> '<json overrides applied to every guard/camera>'   e.g. '{"range":5.5,"fov":75}'
import { LEVELS } from '../src/levels/levels.js';
import { CFG } from '../src/config.js';
import { solve } from './solver-lib.mjs';
const n = +process.argv[2];
const ov = JSON.parse(process.argv[3] || '{}');
const def = structuredClone(LEVELS.find((l) => l.level === n));
if (ov.def) Object.assign(def, ov.def);
const { def: _d, guard: _g, camera: _c, ...flat } = ov;
for (const g of def.guards || []) Object.assign(g, _g || flat);
for (const c of def.cameras || []) Object.assign(c, _c || {});
const ok = solve(def, true);
let speed = '100%';
const saved = CFG.playerSpeed;
for (const m of [0.45, 0.6, 0.75, 0.9]) { CFG.playerSpeed = saved * m; if (solve(def, true).ok) { speed = Math.round(m * 100) + '%'; break; } }
CFG.playerSpeed = saved;
const harsh = ok.ok ? solve(def, true, 160, 90, true).ok : '-';
const free = solve({ ...def, guards: [], cameras: [], lasers: [] }, true);
console.log(`L${n} ${JSON.stringify(ov)} → perfect=${ok.ok} route=${ok.time?.toFixed(1)}s cost=+${ok.ok ? (ok.time - free.time).toFixed(1) : '-'}s min-speed=${speed} harsh-ok=${harsh}`);
