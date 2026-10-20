/* Bug hunt: random-input play on every level (logic layer, thousands of ticks each) with invariants: positions finite and on floor, nobody inside walls/props, no exceptions,
   creatures not stuck, no endless hunts, doors/locks consistent. usage: node fuzz.mjs [seconds per run] [runs per level] */
import { LEVELS } from '../src/logic/levels.js';
import { generate, T } from '../src/logic/gen.js';
import { World, DT } from '../src/logic/world.js';
const SECS = +process.argv[2] || 150, RUNS = +process.argv[3] || 4; const problems = new Map(); const note = (k, d) => { if (!problems.has(k)) problems.set(k, []); const a = problems.get(k); if (a.length < 4) a.push(d); };
let ticks = 0, wins = 0, deaths = 0, runs = 0;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
for (let li = 0; li < LEVELS.length; li++) {
  if (process.env.ONLYL && +process.env.ONLYL !== li + 1) continue;
  const g = generate(LEVELS[li]);
  for (let r = 0; r < RUNS; r++) {
    if (process.env.ONLYR && +process.env.ONLYR !== r) continue;
    const rnd = mulberry(li * 1000 + r * 7 + 1), w = new World(generate(LEVELS[li]), { diff: ['easy', 'normal', 'hard'][r % 3] }); runs++; const p = w.player; const tag = `L${li + 1}.${r}`;
    const mode = r % 4; let yawT = 0, turn = 0, fwd = 1, sprint = false, still = new Map(), huntT = new Map(), stuckP = 0, lastP = [p.x, p.y];
    try {
      for (let i = 0; i < SECS * 30 && !w.over; i++) {
        const inp = {}; yawT -= DT; if (yawT <= 0) { yawT = 0.3 + rnd() * 2.5; turn = (rnd() - 0.5) * 0.12; fwd = rnd() < 0.8 ? 1 : rnd() < 0.5 ? 0 : -1; sprint = rnd() < 0.3; }
        inp.dyaw = turn * (rnd() < 0.2 ? 3 : 1); inp.fwd = fwd; inp.str = rnd() < 0.05 ? (rnd() - 0.5) * 2 : 0; inp.sprint = sprint;
        if (rnd() < 0.02 * (mode === 1 ? 4 : 1)) inp.interact = true; if (rnd() < 0.004) inp.pulse = true; if (rnd() < 0.003) inp.radio = true; if (rnd() < 0.003) inp.flash = true; if (rnd() < 0.01) inp.crouchPress = true;
        if (mode === 2 && p.hidden < 0 && rnd() < 0.02) { const L = w.nearestLocker(p.x, p.y, 2.2); if (L) w.enterLocker(L); }
        if (mode === 3 && w.keypad && rnd() < 0.1) { const d = w.keypad; w.enterCode(d.id, rnd() < 0.5 ? d.code : '0000'); w.keypad = null; }
        w.update(DT, inp); w.drainEvents(); ticks++;
        /* invariants */
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.yaw) || !Number.isFinite(p.pitch) || !Number.isFinite(p.stamina)) { note('player NaN', tag); break; }
        if (!p.vent && p.hidden < 0 && w.solidForPlayer && w.solidForPlayer(Math.floor(p.x), Math.floor(p.y)) && w.cells[Math.floor(p.y) * w.W + Math.floor(p.x)] === T.WALL) note('player inside wall', tag + ' ' + p.x.toFixed(2) + ',' + p.y.toFixed(2));
        if (p.x < 0 || p.y < 0 || p.x > w.W || p.y > w.H) note('player out of map', tag);
        if (p.stamina < -0.001 || p.stamina > 1.001) note('stamina out of range', tag + ' ' + p.stamina);
        for (const c of w.creatures) {
          if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.yaw)) { note('creature NaN', tag); break; }
          const k = Math.floor(c.y) * w.W + Math.floor(c.x); if (w.cells[k] === T.WALL) note('creature inside wall', `${tag} c${c.id} ${c.x.toFixed(2)},${c.y.toFixed(2)} ${c.state}`);
          if (w.solid.has(k) && !w.doorAt.has(k)) note('creature inside a prop tile', `${tag} c${c.id} ${c.state} ${c.x.toFixed(1)},${c.y.toFixed(1)}`);
          const key = c.id, pr = still.get(key) || { x: c.x, y: c.y, t: 0 }; if (Math.hypot(c.x - pr.x, c.y - pr.y) > 0.05 || pr.st !== c.state) { pr.x = c.x; pr.y = c.y; pr.t = 0; pr.st = c.state; } else pr.t += DT; still.set(key, pr);
          if (pr.t > 25 && (c.state === 'hunt' || (c.state === 'investigate')) && !(c.sniffT > 0)) { note('creature stuck while ' + c.state, `${tag} c${c.id} ${c.t} at ${c.x.toFixed(1)},${c.y.toFixed(1)} for ${pr.t.toFixed(0)}s tgt ${c.target ? c.target.x.toFixed(1) + ',' + c.target.y.toFixed(1) : '-'} path ${c.path ? c.path.length + '@' + c.pi : '-'} post ${c.post ? c.post.x.toFixed(1) + ',' + c.post.y.toFixed(1) : '-'} moving ${c.moving} player ${p.x.toFixed(1)},${p.y.toFixed(1)} hidden ${p.hidden}`); if (process.env.TRACE && c.id === 2) { for (let q = 0; q < 12; q++) { const before = [c.state, c.yaw.toFixed(3), c.moving, c.pi, c.path && c.path.length, c.repath.toFixed(2)]; w.update(DT, {}); w.drainEvents(); console.log('tick', q, before.join(' '), '->', c.state, c.yaw.toFixed(3), c.moving, c.pi); } }
          if (process.env.DUMP) { console.log(JSON.stringify(c, (k, v) => (k === 'k' || k === 'path') ? (k === 'path' ? v && v.map(q => q.map(n => +n.toFixed(1)).join(',')) : undefined) : v)); for (let y = Math.floor(c.y) - 4; y < Math.floor(c.y) + 5; y++) { let m = ''; for (let x = Math.floor(c.x) - 9; x < Math.floor(c.x) + 10; x++) { const k2 = y * w.W + x; m += (x === Math.floor(c.x) && y === Math.floor(c.y)) ? 'C' : (x === Math.floor(p.x) && y === Math.floor(p.y)) ? '@' : w.cells[k2] === 0 ? '#' : w.doorAt.has(k2) ? 'D' : w.solid.has(k2) ? 'P' : '.'; } console.log(m); } } pr.t = -1e9; }
          if (pr.t > 70 && c.state === 'roam' && c.k.roam > 0) { note('roaming creature frozen', `${tag} c${c.id} ${c.t} at ${c.x.toFixed(1)},${c.y.toFixed(1)} wait ${c.wait}`); pr.t = -1e9; }
          const h = huntT.get(key) || 0; huntT.set(key, c.state === 'hunt' ? h + DT : 0); if (h > 90) { note('endless hunt (>90 s)', `${tag} c${c.id} ${c.t}`); huntT.set(key, -1e9); }
        }
        if (p.hidden >= 0 && !w.objById.get(p.hidden)) note('hidden in a missing locker', tag);
      }
    } catch (e) { note('EXCEPTION ' + String(e.message).slice(0, 80), tag + ' ' + (e.stack || '').split('\n')[1]); }
    if (w.over === 'win') wins++; if (w.over === 'dead') deaths++;
  }
}
console.log(`${runs} runs, ${ticks} ticks (${(ticks / 30 / 60).toFixed(0)} game-minutes), wins ${wins}, deaths ${deaths}`);
if (!problems.size) console.log('no invariant violations'); for (const [k, v] of problems) console.log('PROBLEM', k, '->', v.join(' | '));
process.exit(problems.size ? 1 : 0);
