// Guard proximity awareness: unit scenarios on a tiny custom level.
import { WORLDS } from '../src/levels/worlds.js';
import { createLevel, createState, stepSim } from '../src/game/sim.js';
let bad = 0;
const check = (name, ok, extra = '') => { if (!ok) bad++; console.log(`${ok ? '✓' : '✗'} ${name} ${extra}`); };
function scenario(map, guard, setup, secs) {
  const def = { level: 99, world: 'house', name: 't', difficulty: 1, map, guards: [guard] };
  const ctx = createLevel(def, WORLDS.house); const st = createState(ctx);
  const g = st.guards[0]; setup(st, g);
  let peak = 0, minMeter = 0;
  for (let i = 0; i < secs * 60 && st.status === 'playing'; i++) { stepSim(ctx, st); peak = Math.max(peak, g.meter); st.events.length = 0; }
  return { st, g, peak };
}
const open = ['###########', '#S........#', '#.........#', '#.........#', '#........E#', '###########'];
// guard stands still at (5,2) facing EAST (cone points away from x<5)
const still = { patrol: [[5, 2]], face: 0, range: 4.5, fov: 70 };
const put = (x, y) => (st, g) => { st.player.x = x; st.player.y = y; };

let r = scenario(open, still, put(4.5, 2.5), 0.5);  // directly behind, 1.0 tile
check('right behind guard (1 tile, outside cone): guard notices', r.peak > 0.04, `meter ${r.peak.toFixed(2)}`);
check('  ...but is not instantly caught', r.st.status === 'playing');
r = scenario(open, still, put(3.5, 2.5), 2);         // 2 tiles behind: outside radius
check('2 tiles behind guard (outside radius): no reaction', r.peak === 0, `meter ${r.peak.toFixed(2)}`);
r = scenario(open, still, put(2.5, 3.5), 2);         // far behind
check('far behind guard: no reaction', r.peak === 0);
let c1 = scenario(open, still, put(4.0, 2.5), 0.3).peak, c2 = scenario(open, still, put(4.8, 2.5), 0.3).peak; // 1.5 tiles vs 0.7 tiles
check('closer = stronger reaction', c2 > c1, `${c1.toFixed(2)} -> ${c2.toFixed(2)}`);
r = scenario(open, still, (st) => { st.player.x = 4.5; st.player.y = 2.5; st.player.path = []; }, 0.1);
const turned = scenario(open, still, put(4.5, 2.5), 1.0).g;
const facing = Math.abs(((turned.face - Math.PI + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
check('guard turns toward the thief and stops (suspicious)', facing < 0.8 && turned.state === 'suspicious', `face ${turned.face.toFixed(2)} rad, state ${turned.state}`);
// hiding protects
const hideMap = ['###########', '#S........#', '#.........#', '#....H....#', '#........E#', '###########'];
r = scenario(hideMap, { patrol: [[5, 2]], face: 0 }, put(5.5, 3.5), 2); // thief on the wardrobe right under the guard's feet (dist 1.0)
check('hiding spot protects at close range', r.peak === 0 && r.st.status === 'playing', `meter ${r.peak.toFixed(2)}`);
// walls block
const wallMap = ['###########', '#S...#....#', '#....#....#', '#....#....#', '#........E#', '###########'];
r = scenario(wallMap, { patrol: [[6, 2]], face: 0 }, put(4.5, 2.5), 2); // thief right behind the wall (dist 2? wall tile x=5)
check('wall blocks proximity awareness', r.peak === 0, `meter ${r.peak.toFixed(2)}`);
// bump still catches
r = scenario(open, still, put(4.8, 2.5), 1);
check('touching the guard = caught', r.st.status === 'caught');
// walking past behind guard at normal speed: notices (spotted) but survives
const def = { level: 99, world: 'house', name: 't', difficulty: 1, map: open, guards: [still] };
const ctx = createLevel(def, WORLDS.house); const st = createState(ctx);
st.player.x = 4.5; st.player.y = 1.5; st.player.path = [{ x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }]; // run down the column right behind the guard's back
let peak = 0; for (let i = 0; i < 600 && st.status === 'playing'; i++) { stepSim(ctx, st); peak = Math.max(peak, st.guards[0].meter); if (!st.player.path.length) break; }
check('sprint past right behind the guard: he reacts, but a fast pass survives', peak > 0.1 && st.status === 'playing', `peak meter ${peak.toFixed(2)}`);
process.exit(bad ? 1 : 0);
