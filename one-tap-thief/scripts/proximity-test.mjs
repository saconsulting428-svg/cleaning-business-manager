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
r = scenario(open, still, put(5.2, 2.5), 0.2);
check('touching the guard = caught immediately', r.st.status === 'caught');
// walking past behind guard at normal speed: notices (spotted) but survives
const def = { level: 99, world: 'house', name: 't', difficulty: 1, map: open, guards: [still] };
const ctx = createLevel(def, WORLDS.house); const st = createState(ctx);
st.player.x = 4.5; st.player.y = 1.5; st.player.path = [{ x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }]; // run down the column right behind the guard's back
let peak = 0; for (let i = 0; i < 600 && st.status === 'playing'; i++) { stepSim(ctx, st); peak = Math.max(peak, st.guards[0].meter); if (!st.player.path.length) break; }
check('sprint past right behind the guard: he reacts, but a fast pass survives', peak > 0.04 && st.status === 'playing', `peak meter ${peak.toFixed(2)}`);

// ---- state machine: PATROL -> SUSPICIOUS -> ALERT (reaction pause) -> CHASE -> caught on contact
{
  const def2 = { level: 99, world: 'house', name: 't', difficulty: 1, map: open, guards: [{ patrol: [[5, 2]], face: 0, range: 4.5, fov: 70 }] };
  const ctx2 = createLevel(def2, WORLDS.house); const st2 = createState(ctx2); const gd = st2.guards[0];
  st2.player.x = 4.3; st2.player.y = 2.5;                     // stand 1.2 tiles behind him and do nothing
  const seen = []; let moved = 0, last = gd.state, gx = gd.x, gy = gd.y, reactPause = 0;
  for (let i = 0; i < 60 * 8 && st2.status === 'playing'; i++) {
    stepSim(ctx2, st2);
    if (gd.state !== last) { seen.push(gd.state); last = gd.state; }
    if (gd.state === 'alert' && Math.hypot(gd.x - gx, gd.y - gy) < 1e-6) reactPause += 1 / 60;
    gx = gd.x; gy = gd.y;
  }
  check('states progress suspicious -> alert -> chase', ['suspicious', 'alert', 'chase'].every((x) => seen.includes(x)) && seen.indexOf('suspicious') < seen.indexOf('alert') && seen.indexOf('alert') < seen.indexOf('chase'), seen.join(' > '));
  check('alert state is a real pause (guard stands still while reacting)', reactPause > 0.3, `${reactPause.toFixed(2)}s`);
  check('chase ends with the guard catching a thief who stays put', st2.status === 'caught', st2.status);
}
{ // thief flees along a long room: he is much faster than the chasing guard
  const wide = ['#########################', '#S......................#', '#.......................#', '#......................E#', '#########################'];
  const ctx2 = createLevel({ level: 99, world: 'house', name: 't', difficulty: 1, map: wide, guards: [{ patrol: [[5, 2]], face: 0, range: 4.5, fov: 70 }] }, WORLDS.house);
  const st2 = createState(ctx2); const gd = st2.guards[0];
  st2.player.x = 7.0; st2.player.y = 2.5;                      // right in front of him, 1.5 tiles away
  let t0 = -1, gap = 0;
  for (let i = 0; i < 60 * 8 && st2.status === 'playing'; i++) {
    if (gd.chase && t0 < 0) { t0 = i; st2.player.path = [{ x: 22, y: 2 }]; }
    stepSim(ctx2, st2);
    if (t0 >= 0 && i - t0 === 120) gap = Math.hypot(gd.x - st2.player.x, gd.y - st2.player.y);
  }
  check('a fleeing thief outruns the chasing guard (gap grows)', t0 >= 0 && st2.status === 'playing' && gap > 3.5, `gap after 2s ${gap.toFixed(1)} tiles, ${st2.status}`);
}
{ // hidden during the chase: guard stops short and searches, never walks into the wardrobe
  const m = ['#############', '#S..........#', '#...........#', '#...........#', '#..........E#', '#############'].map((r, y) => (y === 3 ? '#.H.........#' : r));
  const def2 = { level: 99, world: 'house', name: 't', difficulty: 1, map: m, guards: [{ patrol: [[5, 2]], face: 0, range: 4.5, fov: 70 }] };
  const ctx2 = createLevel(def2, WORLDS.house); const st2 = createState(ctx2); const gd = st2.guards[0];
  st2.player.x = 4.3; st2.player.y = 2.5; let hid = false, minD = 9;
  for (let i = 0; i < 60 * 14 && st2.status === 'playing'; i++) {
    if (gd.chase && !hid) { hid = true; st2.player.x = 2.5; st2.player.y = 3.5; }                   // teleport into the wardrobe (2,3)
    stepSim(ctx2, st2); if (hid) minD = Math.min(minD, Math.hypot(gd.x - 2.5, gd.y - 3.5));
  }
  check('hiding during the chase: guard searches but never barges in', hid && st2.status === 'playing' && minD > 0.9, `min distance ${minD.toFixed(2)} ${st2.status}`);
  check('...and gives up after a few seconds, returning to patrol', !gd.chase && gd.state !== 'chase', `state ${gd.state}`);
}
process.exit(bad ? 1 : 0);
