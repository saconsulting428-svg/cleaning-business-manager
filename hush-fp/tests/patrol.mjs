/* Patrol coverage: with the player parked far away, how many of the rooms a roaming creature can reach does it actually visit in 5 game minutes? */
import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { World, DT } from '../src/logic/world.js';
import { reachFrom } from '../src/logic/ai.js';
let bad = 0, tot = 0;
for (let li = 0; li < LEVELS.length; li++) {
  const w = new World(generate(LEVELS[li]), {}); w.player.x = -200; w.player.y = -200; w.player.alive = true;
  for (const c of w.creatures) { if (c.k.roam <= 0) continue; const reach = reachFrom(w, c.x, c.y); const reachable = w.rooms.filter(r => { for (let y = r.y0; y < r.y0 + r.h; y++) for (let x = r.x0; x < r.x0 + r.w; x++) if (reach.has(y * w.W + x)) return true; return false; }); c.__visited = new Set(); c.__dist = 0; c.__reach = reachable.length; }
  for (let i = 0; i < 300 * 30; i++) { w.update(DT, {}); for (const c of w.creatures) { if (!c.__visited) continue; c.__dist += Math.hypot(c.x - (c.px ?? c.x), c.y - (c.py ?? c.y)); const r = w.rooms.find(r => c.x >= r.x0 && c.x < r.x0 + r.w && c.y >= r.y0 && c.y < r.y0 + r.h); if (r) c.__visited.add(r.idx); } }
  for (const c of w.creatures) { if (!c.__visited) continue; tot++; const ok = c.__dist > 15 && c.__visited.size >= Math.min(c.__reach, 3); if (!ok) bad++; console.log((ok ? 'ok  ' : 'BAD ') + `L${li + 1} ${LEVELS[li].name.padEnd(18)} c${c.id} ${c.t.padEnd(8)} walked ${c.__dist.toFixed(0).padStart(4)} tiles, rooms visited ${c.__visited.size}/${c.__reach} reachable`); }
}
console.log(bad + ' of ' + tot + ' roaming creatures patrol badly'); process.exit(bad ? 1 : 0);
