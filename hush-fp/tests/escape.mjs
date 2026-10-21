/* "Is being hunted survivable?" For every level: put the player in random rooms with a creature hunting from ~6 tiles away, and let a sensible escape policy act:
   sprint to the locker / vent that the player reaches well before the creature (gap >= 7 tiles so it does not see you go in), hide, wait. Success = alive after 60 s. */
import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { World, DT } from '../src/logic/world.js';
import { findPath, distField } from '../src/logic/ai.js';
const ang = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const plen = (pp) => { if (!pp) return 1e9; let d = 0, px = null, py; for (const [x, y] of pp) { if (px !== null) d += Math.hypot(x - px, y - py); px = x; py = y; } return d; };
function trial(li, seed) {
  const rnd = mulberry(li * 977 + seed * 131 + 7), w = new World(generate(LEVELS[li]), {}), p = w.player, c = w.creatures[0]; if (!c) return null;
  w.gen.exit = { x: -99, y: -99 };                                               // measure survival, not the exit
  const room = w.rooms[Math.floor(rnd() * w.rooms.length)]; let pos = null; for (let t = 0; t < 40 && !pos; t++) { const x = room.x0 + Math.floor(rnd() * room.w), y = room.y0 + Math.floor(rnd() * room.h), k = y * w.W + x; if (w.cells[k] !== 0 && !w.solid.has(k)) pos = [x + 0.5, y + 0.5]; } if (!pos) return null;
  p.x = pos[0]; p.y = pos[1]; p.px = p.x; p.py = p.y; const f = distField(w, p.x, p.y, 9); let cp = null, bd = 1e9; for (const [k, d] of f) { const x = k % w.W, y = (k / w.W) | 0; if (d >= 5.5 && d <= 7 && !w.solid.has(k) && w.cells[k] !== 0 && Math.abs(d - 6.2) < bd) { bd = Math.abs(d - 6.2); cp = [x + 0.5, y + 0.5]; } } if (!cp) return null;
  for (const o of w.creatures) { o.x = cp[0] + (o === c ? 0 : 50); o.px = o.x; } c.x = cp[0]; c.y = cp[1]; c.state = 'hunt'; c.alert = 1; c.path = null; c.lastSeen = { x: p.x, y: p.y }; c.hunts = 1; c.yaw = Math.atan2(p.y - c.y, p.x - c.x); w.creatures.slice(1).forEach(o => { o.x = -90; o.y = -90; });
  /* policy: run to the tile that keeps the biggest lead (my path vs the creature's path, sprint 2.7 vs hunt ~2.0), re-planned every 0.7 s; once it stops hunting, creep to the nearest locker and hide */
  let t = 0, goal = null, replan = 0, hid = false, hidAt = -1;
  for (; t < 60 && !w.over; t += DT) {
    const inp = {}; replan -= DT;
    if (p.hidden >= 0 || p.vent) { w.update(DT, inp); w.drainEvents(); continue; }
    const hunting = c.state === 'hunt';
    if (hunting) {
      if (replan <= 0 || !goal) { replan = 0.7; const fp = distField(w, p.x, p.y, 26), fc = distField(w, c.x, c.y, 40); const cand = []; for (const [k, d] of fp) { if (d < 8 || d > 24) continue; const x = k % w.W, y = (k / w.W) | 0; if (w.solid.has(k) && !w.doorAt.has(k)) continue; const cd = fc.get(k); if (cd === undefined) continue; cand.push([cd - 1.4 * d + (rnd() - 0.5) * 0.5, x + 0.5, y + 0.5]); } cand.sort((u, v) => v[0] - u[0]); let ng = null; for (const q of cand.slice(0, 12)) { if (findPath(w, p.x, p.y, q[1], q[2])) { ng = [q[1], q[2]]; break; } } if (ng) goal = ng; }
      if (goal) { const pp = findPath(w, p.x, p.y, goal[0], goal[1]); const n = (pp && pp[0]) || goal; if (n) { const dd = ang(p.yaw, Math.atan2(n[1] - p.y, n[0] - p.x)); inp.dyaw = Math.max(-0.5, Math.min(0.5, dd)); if (Math.abs(dd) < 0.8) { inp.fwd = 1; inp.sprint = true; } } }
    } else {
      /* it lost me: go to a locker nearby if its distance is comfortable, crouch */
      if (!goal || goal.lock !== true) { let best = null, bd = 1e9; for (const o of w.objs) if (o.type === 'locker') { const fx = o.x + 0.5 + Math.cos(o.face) * 0.9, fy = o.y + 0.5 + Math.sin(o.face) * 0.9, d = Math.hypot(fx - p.x, fy - p.y), cd = Math.hypot(fx - c.x, fy - c.y); if (cd > 9 && d < bd) { bd = d; best = { o, fx, fy }; } } goal = best ? Object.assign([best.fx, best.fy], { lock: true, o: best.o }) : null; }
      if (goal && goal.lock) { const d = Math.hypot(goal[0] - p.x, goal[1] - p.y); if (d < 0.6) { p.yaw = goal.o.face + Math.PI; const tg = w.interactTarget(); if (tg && tg.kind === 'locker') { inp.interact = true; hid = true; } } else { const pp = findPath(w, p.x, p.y, goal[0], goal[1]); const n = pp && pp[0]; if (n) { const dd = ang(p.yaw, Math.atan2(n[1] - p.y, n[0] - p.x)); inp.dyaw = Math.max(-0.5, Math.min(0.5, dd)); if (Math.abs(dd) < 0.8) { inp.fwd = 1; p.crouch = true; } } } }
    }
    w.update(DT, inp); w.drainEvents();
  }
  const best = null;
  return { alive: !w.over, hidden: hid, died: t, gap: null, pd: null, type: null, how: hid ? 'hid' : 'ran' };
}
let tot = 0, ok = 0; const per = []; const why = { aliveHid: 0, aliveRun: 0, deadHid: 0, deadRun: 0 }; const gaps = [];
for (let li = 0; li < LEVELS.length; li++) { let a = 0, n = 0; for (let s = 0; s < 14; s++) { const r = trial(li, s); if (!r) continue; n++; if (r.alive) a++; why[(r.alive ? 'alive' : 'dead') + (r.hidden ? 'Hid' : 'Run')]++; gaps.push([r.alive, r.gap, r.pd, r.type]); } tot += n; ok += a; per.push(`${String(li + 1).padStart(2)} ${LEVELS[li].name.padEnd(20)} ${a}/${n}`); }
console.log(per.join('\n')); console.log(JSON.stringify(why)); const g1 = gaps.filter(g => g[1] !== null); for (const [lo, hi] of [[-99, 0], [0, 4], [4, 8], [8, 14], [14, 99]]) { const sel = g1.filter(g => g[1] >= lo && g[1] < hi); console.log('gap', lo, hi, 'n', sel.length, 'survived', sel.filter(g => g[0]).length); }
console.log(`hunted-player survival with locker/vent/sprint: ${ok}/${tot} (${Math.round(100 * ok / tot)}%)`);
