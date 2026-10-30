/* One fear beat per level (from the design document): a short, authored moment that is never a damage source. The logic here decides WHEN it happens (a timer, entering a room, using the
   sonar or the radio, starting the generator...) and what the world does about it (a creature turns to stare, a door opens, creatures freeze); everything the player sees or hears is sent as a
   {type:'beat', what} event that main.js / the renderer play. Beats that are pure scenery (claw marks, handprints, footprints, a floor plan, a swinging lamp, cables, a seated shadow) are built
   by render/extras3d.js from spec.beat and have no logic. */
import { emitNoise, lineOfSight } from './ai.js';

const roomIdxAt = (w, x, y) => { x = Math.floor(x); y = Math.floor(y); const r = w.rooms.find(q => x >= q.x0 && x < q.x0 + q.w && y >= q.y0 && y < q.y0 + q.h); return r ? r.idx : -1; };
export function initBeat(w) { w.beat = { id: w.spec.beat || null, t: 0, st: {}, seen: new WeakSet(), pend: [] }; }
const fire = (w, what, o) => w.events.push(Object.assign({ type: 'beat', what }, o || {}));
const later = (b, sec, fn) => b.pend.push({ at: b.t + sec, fn });
/* a spot a few tiles away that the player cannot see (behind a wall), for ghosts in the sonar */
function hiddenSpot(w, min, max) {
  const p = w.player; for (let t = 0; t < 80; t++) { const a = w.rnd() * 6.283, d = min + w.rnd() * (max - min), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (w.cells[Math.floor(y) * w.W + Math.floor(x)] !== 0 && !w.solid.has(Math.floor(y) * w.W + Math.floor(x)) && !lineOfSight(w, p.x, p.y, x, y)) return { x, y }; } return null;
}
export function updateBeat(w, dt) {
  const b = w.beat; if (!b || !b.id) return; const p = w.player; if (!p.alive || w.over) return; b.t += dt; const room = roomIdxAt(w, p.x, p.y), st = b.st, calm = !w.creatures.some(c => c.state === 'hunt') && p.hidden < 0;
  for (let i = b.pend.length - 1; i >= 0; i--) if (b.t >= b.pend[i].at) { const f = b.pend.splice(i, 1)[0].fn; f(); }
  const ev = (type) => w.events.find(e => e.type === type && !b.seen.has(e)); const take = (e) => { b.seen.add(e); return e; };
  const once = (key, cond, fn) => { if (!st[key] && cond) { st[key] = 1; fn(); } };
  switch (b.id) {
    case 'phoneRing': once('ring', b.t > 8 && room >= 1, () => { fire(w, 'phone'); }); once('dark', st.ring && room >= 2, () => { w.events.push({ type: 'sp', what: 'outage', dur: 1.6 }); }); break;
    case 'pulseGhost': case 'pulseGhost3': { const e = ev('pulse'); if (e && !st.g) { take(e); st.g = 1; const n = b.id === 'pulseGhost' ? 1 : 3; for (let k = 0; k < n; k++) { const s = hiddenSpot(w, 5 + k * 3, 9 + k * 4); if (s) fire(w, 'ghost', { x: s.x, y: s.y }); } } break; }
    case 'cctv': once('c', b.t > 15 && room >= 1 && calm, () => fire(w, 'cctv', { dur: 3, mode: 'you' })); break;
    case 'cctvBehind': once('c', b.t > 14 && room >= 1 && calm, () => { fire(w, 'cctv', { dur: 2.4, mode: 'empty' }); later(b, 2.6, () => fire(w, 'eyesBehind')); }); break;
    case 'stare': { if (!st.s) { const c = w.creatures.find(q => q.t === 'sentinel' && q.state === 'roam' && Math.hypot(q.x - p.x, q.y - p.y) < 13 && lineOfSight(w, q.x, q.y, p.x, p.y)); if (c) { st.s = 1; st.c = c; st.until = b.t + 3.6; fire(w, 'stare'); } } else if (st.c && b.t < st.until && st.c.state === 'roam') { const want = Math.atan2(p.y - st.c.y, p.x - st.c.x); let d = want - st.c.yaw; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; st.c.yaw += Math.max(-1.0 * dt, Math.min(1.0 * dt, d)); } break; }
    case 'glassCrack': once('g', b.t > 10 && room >= 2, () => fire(w, 'crack')); break;
    case 'ductScrape': once('d', b.t > 12 && room >= 1 && calm, () => { fire(w, 'scrape'); fire(w, 'silence', { dur: 2.5 }); }); break;
    case 'radioVoice': { const e = ev('radio'); if (e && !st.v) { take(e); st.v = 1; later(b, 1.3, () => fire(w, 'voice', { text: '"I\'M HERE."' })); } break; }
    case 'tankClicks': { const e = ev('radio'); if (e && !st.v) { take(e); st.v = 1; later(b, 1.0, () => fire(w, 'clicks')); } break; }
    case 'radioAnswer': { const e = ev('radio'); if (e && !st.v) { take(e); st.v = 1; const r = w.rooms[Math.min(w.rooms.length - 1, 2)]; later(b, 2.6, () => fire(w, 'radio2', { x: r.cx + 0.5, y: r.cy + 0.5 })); } break; }
    case 'lockerRock': { const L = w.objs.find(o => o.type === 'locker' && o.room >= 2); if (L && room >= 1 && Math.hypot(L.x - p.x, L.y - p.y) < 9) { st.k = (st.k || 0) - dt; if (st.k <= 0) { st.k = 6; fire(w, 'knock', { x: L.x + 0.5, y: L.y + 0.5 }); } } break; }
    case 'redWave': once('r', room >= 1 && b.t > 6, () => fire(w, 'redwave')); break;
    case 'motorBelow': { const e = ev('generator'); if (e && !st.m) { take(e); st.m = 1; later(b, 2.2, () => { fire(w, 'motor'); w.events.push({ type: 'sp', what: 'flicker', dur: 1.2 }); }); } break; }
    case 'liftUnlisted': once('l', b.t > 20 && room >= 1 && calm, () => fire(w, 'lift')); break;
    case 'lightsPulse': once('p', b.t > 8, () => fire(w, 'lightsPulse')); break;
    case 'tapThree': { const T = w.objs.find(o => o.type === 'prop' && o.kind === 'specimen'); once('t', b.t > 12 && room >= 1 && T && calm, () => fire(w, 'tap3', { x: T.x + 0.5, y: T.y + 0.5 })); break; }
    case 'coreCountdown': { const e = ev('generator'); if (e && !st.c) { take(e); st.c = 1; for (let k = 8; k >= 1; k--) later(b, 8 - k, () => fire(w, 'count', { n: k })); later(b, 8.2, () => { fire(w, 'impact2'); w.events.push({ type: 'sp', what: 'outage', dur: 2 }); }); } break; }
    case 'circleSteps': once('c', b.t > 14 && room >= 1 && calm, () => fire(w, 'circle')); break;
    case 'ceilCrawl': once('c', b.t > 14 && room >= 1 && calm, () => { fire(w, 'scrape'); fire(w, 'ceilEyes', { x: p.x + Math.cos(p.yaw) * 5, y: p.y + Math.sin(p.yaw) * 5 }); }); break;
    case 'intercom': once('i', b.t > 12 && room >= 1 && calm, () => fire(w, 'voice', { text: '"OKAFOR."', static: true })); break;
    case 'silenceAll': once('s', room >= 3, () => fire(w, 'silence', { dur: 6 })); break;
    case 'eggCrack': once('e', room >= 2, () => later(b, 1.5, () => fire(w, 'eggcrack'))); break;
    case 'climbShaft': { const e = ev('step'); if (e && b.t > 10) { take(e); st.n = (st.n || 0) + 1; if (st.n % 2 === 0 && st.n < 60) fire(w, 'climb'); } break; }
    case 'heartEcho': once('h', b.t > 6, () => fire(w, 'heartEcho')); break;
    case 'doorOpens': { if (!st.d && room >= 1) { const d = w.doors.find(q => !q.lock && q.want === 0 && !q.hidden && Math.hypot(q.x + 0.5 - p.x, q.y + 0.5 - p.y) < 6 && Math.hypot(q.x + 0.5 - p.x, q.y + 0.5 - p.y) > 3.5); if (d) { st.d = 1; w.openDoor(d, true, { by: 'beat' }); fire(w, 'creak', { x: d.x + 0.5, y: d.y + 0.5 }); } } break; }
    case 'torchPull': once('t', b.t > 5, () => fire(w, 'torchPull')); break;
    case 'hugeShape': { const e = ev('pulse'); if (e && !st.h) { take(e); st.h = 1; fire(w, 'huge'); } break; }
    case 'cableHum': { st.h = (st.h || 0) - dt; if (st.h <= 0 && room >= 1) { st.h = 7; fire(w, 'hum'); } break; }
    case 'footprints': once('f', room >= 1, () => fire(w, 'redwave')); break;
    case 'recording': { const e = ev('log'); if (e && !st.r) { take(e); st.r = 1; later(b, 2.5, () => fire(w, 'voice', { text: '"...THEY WILL LOSE THE WAY TO THE SURFACE..."', static: true })); } break; }
    case 'rushFreeze': case 'convergeSilence': { const e = ev('generator') || ev('breaker'); if (e && !st.r) { take(e); st.r = 1; const r = w.rooms[Math.max(0, w.rooms.length - 2)]; emitNoise(w, r.cx + 0.5, r.cy + 0.5, 28, 'impact'); fire(w, 'impact2'); later(b, 5, () => { for (const c of w.creatures) { c.frozenT = 3.5; } fire(w, 'silence', { dur: 5 }); fire(w, 'freeze'); }); } break; }
    case 'faintPing': { const ex = w.gen.exit; once('f', ex && Math.hypot(ex.x + 0.5 - p.x, ex.y + 0.5 - p.y) < 9, () => fire(w, 'faintPing')); break; }
    default: break;
  }
}
