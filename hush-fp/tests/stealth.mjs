/* A careful human-like player (no god mode): follows the solution route but crouches near creatures, backs off, hides in lockers when hunted and waits, uses the radio
   to pull a creature away from its route when one blocks a corridor. Win rates over several start delays show whether the levels can be beaten by playing quietly. */
import { LEVELS } from '../src/logic/levels.js';
import { generate } from '../src/logic/gen.js';
import { World, DT } from '../src/logic/world.js';
import { findPath, lineOfSight } from '../src/logic/ai.js';
const ang = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
function coming_flag(w, p) { return false; }
export function stealthRun(gen, delay, maxT) {
  const w = new World(gen, {}), p = w.player, path = gen.solution; let rule = '', idx = 0, t = 0, mode = 'go', hideWait = 0, lock = null, used = new Set(), locker = null, lastProg = 0, lastPos = [p.x, p.y], stuck = 0, backT = 0;
  const steer = (tx, ty, inp, speed) => { const d = ang(p.yaw, Math.atan2(ty - p.y, tx - p.x)); inp.dyaw = Math.max(-0.4, Math.min(0.4, d)); if (Math.abs(d) < 0.7) inp.fwd = 1; inp.sprint = speed === 'run'; p.crouch = speed === 'crouch'; };
  while (t < maxT && !w.over) {
    const inp = { fwd: 0, str: 0, sprint: false }; t += DT;
    if (process.env.TRACE) { for (const c of w.creatures) { if (c._ps !== c.state) { console.log('   t=' + t.toFixed(1), c.t, c.state, 'dist', Math.hypot(c.x - p.x, c.y - p.y).toFixed(1), 'alert', c.alert.toFixed(2), 'player crouch', p.crouch, 'flash', p.flash, 'sprint', p.sprint, 'hidden', p.hidden); c._ps = c.state; } } }
    if (t < delay) { w.update(DT, inp); continue; }
    if (process.env.TRACE2 && Math.abs(t % 30) < DT) console.log('  t=' + t.toFixed(0), 'pos', p.x.toFixed(1), p.y.toFixed(1), 'idx', idx, 'hidden', p.hidden, 'rule', rule, 'crouch', p.crouch, 'flash', p.flash, 'creatures', w.creatures.map(c => c.t + ':' + c.state + '@' + c.x.toFixed(0) + ',' + c.y.toFixed(0) + ' d' + Math.hypot(c.x - p.x, c.y - p.y).toFixed(1)).join(' '));
    const cs = w.creatures.map(c => ({ c, d: Math.hypot(c.x - p.x, c.y - p.y), los: lineOfSight(w, p.x, p.y, c.x, c.y) })), hunting = cs.filter(e => e.c.state === 'hunt' && e.d < 16), alerted = cs.filter(e => e.d < 11 && (e.los || e.c.state !== 'roam'));
    if (p.vent) { w.update(DT, inp); continue; }
    if (p.hidden >= 0) { const danger = cs.some(e => (e.d < 9 && (e.c.moving || e.c.k.roam > 0)) || e.c.state === 'hunt' || e.c.state === 'search' || e.c.state === 'check' || e.c.state === 'investigate'); hideWait = danger ? 0 : hideWait + DT; if (hideWait > 3) { inp.interact = true; hideWait = 0; locker = null; } w.update(DT, inp); continue; }
    /* the 'suspicious' warning: something has started to notice you. Torch off, crouch, back away along the route until it loses interest */
    const sus = cs.find(e => e.c.alert > 0.12 && e.c.state !== 'hunt' && e.d < 16);
    if (sus && !hunting.length && p.hidden < 0) { rule = 'sus'; p.crouch = true; if (p.flash) inp.flash = true; const back = path[Math.max(0, idx - 4)]; steer(back[0] + 0.5, back[1] + 0.5, inp, 'crouch'); w.update(DT, inp); continue; }
    /* hunted: get into the nearest locker, or run along the route */
    if (hunting.length) {
      if (!locker) { let best = null, bd = 12; for (const o of w.objs) if (o.type === 'locker') { const d = Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y); if (d < bd) { bd = d; best = o; } } locker = best; }
      if (locker) { const fx = locker.x + 0.5 + Math.cos(locker.face) * 0.8, fy = locker.y + 0.5 + Math.sin(locker.face) * 0.8, d = Math.hypot(fx - p.x, fy - p.y); if (d < 0.6) { p.yaw = locker.face + Math.PI; inp.dyaw = 0; const L = w.interactTarget(); if (L && L.kind === 'locker') inp.interact = true; } else { const pp = findPath(w, p.x, p.y, fx, fy); const n = pp && pp[0]; if (n) steer(n[0], n[1], inp, 'run'); } w.update(DT, inp); continue; }
    } else if (!coming_flag(w, p)) locker = null;
    /* a roaming creature is coming this way: get into a locker if one is close, otherwise back off along the route */
    const coming = cs.filter(e => e.c.state !== 'hunt' && e.d < 8.5 && (e.los || e.d < 5) && e.c.moving);
    if (coming.length && !hunting.length) { rule = 'coming';
      if (!locker) { let best = null, bd = 7; for (const o of w.objs) if (o.type === 'locker') { const d = Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y); if (d < bd) { bd = d; best = o; } } locker = best; }
      if (locker) { const fx = locker.x + 0.5 + Math.cos(locker.face) * 0.8, fy = locker.y + 0.5 + Math.sin(locker.face) * 0.8, d = Math.hypot(fx - p.x, fy - p.y); if (d < 0.6) { p.yaw = locker.face + Math.PI; const L = w.interactTarget(); if (L && L.kind === 'locker') inp.interact = true; } else { const pp = findPath(w, p.x, p.y, fx, fy); const n = pp && pp[0]; if (n) steer(n[0], n[1], inp, 'walk'); } w.update(DT, inp); continue; }
      const back = path[Math.max(0, idx - 3)]; steer(back[0] + 0.5, back[1] + 0.5, inp, 'crouch'); w.update(DT, inp); continue;
    }
    /* normal route */
    const next = path[Math.min(idx + 1, path.length - 1)], cx = next[0] + 0.5, cy = next[1] + 0.5;
    if (idx < path.length - 1 && Math.hypot(cx - p.x, cy - p.y) < 0.35) idx++;
    if (idx >= path.length - 1) { const ex = gen.exit; p.yaw += ang(p.yaw, Math.atan2(ex.y + 0.5 - p.y, ex.x + 0.5 - p.x)); if (Math.hypot(ex.x + 0.5 - p.x, ex.y + 0.5 - p.y) < 1.6) inp.interact = true; else inp.fwd = 1; p.crouch = false; w.update(DT, inp); continue; }
    const cur = path[idx], jump = Math.abs(next[0] - cur[0]) + Math.abs(next[1] - cur[1]) > 1.5;
    if (jump) { const v = w.objs.find(o => o.type === 'vent' && Math.abs(o.x - cur[0]) + Math.abs(o.y - cur[1]) === 1); if (v) { steer(v.x + 0.5, v.y + 0.5, inp, 'walk'); if (Math.hypot(v.x + 0.5 - p.x, v.y + 0.5 - p.y) < 1.2) { inp.interact = true; idx++; } w.update(DT, inp); continue; } }
    /* something dangerous right ahead: switch the torch off and creep; back off only when it is very close */
    const wantFlash = !(alerted.length); if (wantFlash !== p.flash) inp.flash = true;
    const ahead = alerted.find(e => e.los && (e.d < 3.8 && Math.abs(ang(e.c.yaw, Math.atan2(p.y - e.c.y, p.x - e.c.x))) < e.c.k.fov / 2 + 0.2) && Math.abs(ang(p.yaw, Math.atan2(e.c.y - p.y, e.c.x - p.x))) < 0.9);
    if (ahead && ahead.c.state !== 'hunt') { backT = 1.2; }
    if (backT > 0) { rule = 'back'; backT -= DT; p.crouch = true; if (ahead && ahead.d < 3.2) { inp.fwd = -1; } w.update(DT, inp); continue; }
    /* a watcher whose gaze covers the way ahead: stop and wait for it to look away, then go */
    const gaze = cs.find(e => e.c.state === 'roam' && e.los && e.d < e.c.k.sight * 0.8 && Math.abs(ang(e.c.yaw, Math.atan2(p.y - e.c.y, p.x - e.c.x))) < e.c.k.fov / 2 + 0.2 && e.d > 1.0);
    if (gaze && !hunting.length) { rule = 'gaze'; p.crouch = true; w.update(DT, inp); continue; }
    const nearGlass = w.tileAt(p.x + Math.cos(p.yaw) * 1.2, p.y + Math.sin(p.yaw) * 1.2) !== 1;
    const speed = alerted.length || nearGlass ? 'crouch' : 'walk'; steer(cx, cy, inp, speed);
    const tgt = w.interactTarget();
    if (tgt && !used.has(tgt.obj.id + tgt.kind)) { const o = tgt.obj; if (tgt.kind === 'note' || tgt.kind === 'valve' || (tgt.kind === 'generator' && p.inv.fuse >= o.need) || (tgt.kind === 'door' && o.locked && ((o.lock === 'key' || o.lock === 'card') ? p.inv[o.lock] > 0 : o.lock === 'code'))) { inp.interact = true; used.add(o.id + tgt.kind); if (o.lock === 'code') { w.update(DT, inp); w.enterCode(o.id, o.code); continue; } } }
    if (w.objs.some(o => o.type === 'door' && o.hidden && !o.revealed && Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) < 5) && p.pulses > 0) w.pulse();
    w.update(DT, inp);
    if (Math.hypot(p.x - lastPos[0], p.y - lastPos[1]) < 0.02) stuck += DT; else { stuck = 0; lastPos = [p.x, p.y]; } if (stuck > 25 && !hunting.length) { stuck = 0; backT = 0; }
  }
  return { ok: w.over === 'win', t, hunts: w.huntCount, why: w.over || 'timeout', pos: [p.x.toFixed(1), p.y.toFixed(1)], idx, n: path.length, cs: w.creatures.map(c => c.t + ':' + c.state + '@' + c.x.toFixed(0) + ',' + c.y.toFixed(0)).join(' ') };
}
if (process.argv[1] && process.argv[1].endsWith('stealth.mjs')) {
  const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null, delays = [0, 3, 7, 12, 19]; let total = 0, wins = 0;
  LEVELS.forEach((spec, i) => { if (only && !only.includes(i)) return; const gen = generate(spec); let w = 0, hs = 0, tt = 0, dead = 0, tmo = 0; for (const d of delays) { const r = stealthRun(gen, d, +(process.env.MAXT || 480)); if (!r.ok && process.env.DBG) console.log('   fail', JSON.stringify(r)); if (r.ok) w++; else if (r.why === 'dead') dead++; else tmo++; hs += r.hunts; tt += r.t; } total += delays.length; wins += w; console.log(String(i + 1).padStart(2), spec.name.padEnd(20), w + '/' + delays.length + ' dead ' + dead + ' timeout ' + tmo, ' avg hunts ' + (hs / delays.length).toFixed(1), ' avg time ' + Math.round(tt / delays.length) + 's'); });
  console.log('careful-player wins: ' + wins + '/' + total + ' (' + Math.round(100 * wins / total) + '%)');
}
