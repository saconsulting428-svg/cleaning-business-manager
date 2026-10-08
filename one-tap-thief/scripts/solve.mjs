// Beam-search bot: proves each level is beatable (ideally as a 3-star Perfect Heist) with the real simulation,
// and prints difficulty metrics.   usage: [FAST=1] node scripts/solve.mjs [levelNumber ...]
import { LEVELS } from '../src/levels/levels.js';
import { CFG } from '../src/config.js';
import { solve } from './solver-lib.mjs';

const only = process.argv.slice(2).map(Number);
let fails = 0;
const rows = [];
for (const def of LEVELS) {
  if (only.length && !only.includes(def.level)) continue;
  const t0 = Date.now();
  let r = solve(def, true);
  let kind = '3★ perfect';
  if (!r.ok) { r = solve(def, false); kind = r.ok ? 'only non-perfect' : 'UNSOLVED'; }
  let margin = '-', beamNeeded = '-';
  if (r.ok && kind === '3★ perfect') {
    margin = solve(def, true, 160, 90, true).ok ? 'yes' : 'NO';
    // timing forgiveness: the longest gap between decisions at which a safe route still exists (smaller = tighter timing)
    beamNeeded = 0.4;
    for (const d of (process.env.FAST ? [] : [0.8, 1.2, 1.6, 2.4])) if (solve(def, true, 160, 90, false, d).ok) beamNeeded = d; else break;
  }
  // window tightness: slowest thief speed (as % of normal) that still allows a Perfect route. High = narrow safe windows.
  let exposure = '-';
  if (r.ok && kind === '3★ perfect') {
    const saved = CFG.playerSpeed;
    exposure = '100%';
    for (const m of [0.45, 0.6, 0.75, 0.9]) { CFG.playerSpeed = saved * m; if (solve(def, true).ok) { exposure = Math.round(m * 100) + '%'; break; } }
    CFG.playerSpeed = saved;
  }
  let delay = '-';
  if (r.ok) { const free = solve({ ...def, guards: [], cameras: [], lasers: [] }, true); if (free.ok) delay = '+' + Math.max(0, r.time - free.time).toFixed(1) + 's'; }
  if (kind !== '3★ perfect' || margin === 'NO') fails++;
  rows.push({ level: def.level, name: def.name, kind, margin, beamNeeded, route: r.ok ? r.time.toFixed(1) + 's' : '-' });
  console.log(`L${def.level} ${def.name.padEnd(18)} ${kind.padEnd(11)} harsh-guards-still-safe=${margin.padEnd(3)} timing-forgiveness=${String(beamNeeded).padEnd(3)}s perfect-route=${r.ok ? r.time.toFixed(1) + 's' : '-'} wait/detour-cost=${delay} min-thief-speed=${exposure}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
process.exit(fails ? 1 : 0);
