// Guard AI: PATROL -> SUSPICIOUS -> ALERT (a visible reaction pause) -> CHASE, plus alarm investigation.
// Caught = detection meter full OR touching the thief.
import { CFG } from '../config.js';
import { findPath } from '../game/grid.js';
import { D2R, nearPlayer, normAngle, seesPlayer } from './vision.js';

/**
 * `def`: { patrol:[[x,y,wait?],...], mode:'loop'|'pingpong', face(deg), speed, range, fov, fillTime,
 *          sweep:{amp(deg), speed(rad/s)} }  — all optional except patrol.
 */
export function makeGuard(def, id, difficulty = 1) {
  const route = def.patrol.map((p) => ({ x: p[0], y: p[1], wait: p[2] ?? CFG.guard.defaultWait }));
  const face = (def.face ?? 0) * D2R;
  return {
    id, x: route[0].x + 0.5, y: route[0].y + 0.5, face, baseFace: face,
    route, ri: 0, dir: 1, mode: def.mode || 'loop',
    speed: def.speed ?? CFG.guard.speed, range: def.range ?? CFG.guard.range, fov: def.fov ?? CFG.guard.fov,
    fill: (def.fillTime ?? CFG.fillTime) * (1.15 - 0.03 * difficulty),
    prox: def.prox ?? CFG.guard.proximity, near: 0,
    sweep: def.sweep || null, path: [], wait: def.startDelay ?? 0, t: 0, meter: 0, state: 'patrol',
    chase: false, alertT: 0, chaseT: 0, repath: 0, lastSeen: null,
    inv: null, invId: -1, look: null, spawn: { x: route[0].x + 0.5, y: route[0].y + 0.5, face },
  };
}

function tileOf(g) { return { x: Math.floor(g.x), y: Math.floor(g.y) }; }

function turnToward(g, target, dt, rate = CFG.guard.turnRate) {
  const diff = normAngle(target - g.face);
  const max = rate * D2R * dt;
  g.face += Math.abs(diff) <= max ? diff : Math.sign(diff) * max;
}

/** Walk along g.path. Returns true on the frame the end of the path is reached. */
function moveAlong(g, speed, dt) {
  let budget = speed * dt;
  let moved = false;
  while (budget > 1e-6 && g.path.length) {
    const n = g.path[0];
    const dx = n.x + 0.5 - g.x;
    const dy = n.y + 0.5 - g.y;
    const d = Math.hypot(dx, dy);
    if (d <= budget) { g.x = n.x + 0.5; g.y = n.y + 0.5; budget -= d; g.path.shift(); moved = true; if (!g.path.length) return true; }
    else { g.x += (dx / d) * budget; g.y += (dy / d) * budget; budget = 0; }
    g.heading = Math.atan2(dy, dx);
    moved = true;
  }
  if (moved && g.heading !== undefined) turnToward(g, g.heading, dt);
  return false;
}

function nearestRouteIndex(g) {
  let best = 0;
  let bd = Infinity;
  g.route.forEach((r, i) => { const d = Math.hypot(r.x + 0.5 - g.x, r.y + 0.5 - g.y); if (d < bd) { bd = d; best = i; } });
  return best;
}

function advance(g) {
  if (g.route.length < 2) return;
  if (g.mode === 'pingpong') {
    if (g.ri + g.dir >= g.route.length || g.ri + g.dir < 0) g.dir *= -1;
    g.ri += g.dir;
  } else g.ri = (g.ri + 1) % g.route.length;
}

function goTo(ctx, state, g, tx, ty) {
  const t = tileOf(g);
  g.path = findPath(ctx, state, t.x, t.y, tx, ty) || [];
}

export function effectiveRange(g, state) {
  return g.range + (state.alarm.t > 0 ? CFG.alarm.rangeBonus : 0);
}

export function updateGuard(ctx, state, g, dt, hooks) {
  g.t += dt;
  const p = state.player;
  const range = effectiveRange(g, state);
  const d = seesPlayer(ctx, state, g.x, g.y, g.face, range, g.fov);

  // --- detection meter (warning phase before failure) ---
  // Two senses: the vision cone (long range, directional) and close-range awareness (any direction, short radius,
  // blocked by walls, defeated by hiding). Whichever is stronger drives the meter.
  const prev = g.meter;
  const R = g.prox + (state.alarm.t > 0 ? 0.3 : 0);
  const dn = nearPlayer(ctx, state, g.x, g.y, R);
  g.near = dn >= 0 ? 1 - dn / R : 0;
  let rate = d >= 0 ? (1 + (1 - d / range)) / g.fill : 0;
  if (dn >= 0) rate = Math.max(rate, (CFG.guard.proximityGain * Math.pow(g.near, 1.2)) / g.fill);
  const reacting = g.alertT > 0 || g.chase;
  if (reacting) rate *= CFG.guard.postCriticalGain; // once alerted, the thief gets a moment to break line of sight
  if (rate > 0) {
    g.meter += rate * dt;
    g.look = Math.atan2(p.y - g.y, p.x - g.x);
    g.lastSeen = { x: p.x, y: p.y };
    if (reacting) g.meter = Math.min(g.meter, 0.92); // alerted guards must physically reach you: sight alone no longer ends the run
  } else g.meter = Math.max(0, g.meter - dt * CFG.decayRate);
  if (g.meter > CFG.spottedAt) state.spotted = true;
  if (prev < CFG.suspiciousAt && g.meter >= CFG.suspiciousAt) hooks.emit('alert', { id: g.id });
  if (prev < CFG.criticalAt && g.meter >= CFG.criticalAt && !reacting) { g.alertT = CFG.guard.alertReact; hooks.emit('critical', { id: g.id }); }
  if (g.meter >= 1) { hooks.caught(g); return; }
  if (state.invuln <= 0 && Math.hypot(p.x - g.x, p.y - g.y) < CFG.bumpDistance) { hooks.caught(g); return; }

  // --- behaviour ---
  const alarmOn = state.alarm.t > 0;
  if (g.alertT > 0) { // ALERT: stop dead, snap toward the thief, brace — an unmistakable reaction before the chase
    g.state = 'alert'; g.path = [];
    if (g.look !== null) turnToward(g, g.look, dt, CFG.guard.turnRate);
    g.alertT -= dt;
    if (g.alertT <= 0) { g.chase = true; g.chaseT = CFG.guard.chaseTime; g.repath = 0; hooks.emit('chase', { id: g.id }); }
    return;
  }
  if (g.chase) { // CHASE: run to where the thief was last seen; give up after a few seconds without contact
    g.state = 'chase';
    if (rate > 0) g.chaseT = CFG.guard.chaseTime; else g.chaseT -= dt;
    g.repath -= dt;
    if (g.repath <= 0 && g.lastSeen) {
      g.repath = 0.25;
      goTo(ctx, state, g, Math.floor(g.lastSeen.x), Math.floor(g.lastSeen.y));
      if (p.hidden) { // never barge into a hiding spot: stop short and search around it
        while (g.path.length && Math.hypot(g.path[g.path.length - 1].x + 0.5 - g.lastSeen.x, g.path[g.path.length - 1].y + 0.5 - g.lastSeen.y) < CFG.guard.chaseStopShort) g.path.pop();
      }
    }
    if (g.path.length) moveAlong(g, g.speed * CFG.guard.chaseSpeedMul, dt);
    else if (!p.hidden && g.lastSeen && Math.hypot(g.lastSeen.x - g.x, g.lastSeen.y - g.y) > 0.15) { // same tile: close in directly
      const dx = g.lastSeen.x - g.x, dy = g.lastSeen.y - g.y, dd = Math.hypot(dx, dy), stp = Math.min(dd, g.speed * CFG.guard.chaseSpeedMul * dt);
      g.x += (dx / dd) * stp; g.y += (dy / dd) * stp; g.heading = Math.atan2(dy, dx); turnToward(g, g.heading, dt);
    } else g.face += 2.0 * dt; // search: sweep the area
    if (g.chaseT <= 0) { // lost him: back to the route
      g.chase = false; g.meter = Math.min(g.meter, 0.2);
      g.ri = nearestRouteIndex(g); goTo(ctx, state, g, g.route[g.ri].x, g.route[g.ri].y); g.wait = 0;
    }
    return;
  }
  if (g.meter > CFG.suspiciousAt && !alarmOn) {
    g.state = 'suspicious';
    if (g.look !== null) turnToward(g, g.look, dt, CFG.guard.suspiciousTurn); // head-turn is slower than a patrol turn
    return;
  }
  if (alarmOn) {
    g.state = 'alert';
    if (g.invId !== state.alarm.id) {
      g.invId = state.alarm.id;
      g.inv = { x: Math.floor(state.alarm.x), y: Math.floor(state.alarm.y) };
      goTo(ctx, state, g, g.inv.x, g.inv.y);
      g.wait = 0;
    }
    if (g.path.length) moveAlong(g, g.speed * CFG.guard.alertSpeedMul, dt);
    else g.face += 2.2 * dt; // look around at the alarm spot
    return;
  }
  if (g.inv) { // alarm over: head back to the patrol route
    g.inv = null; g.invId = -1;
    g.ri = nearestRouteIndex(g);
    goTo(ctx, state, g, g.route[g.ri].x, g.route[g.ri].y);
    g.wait = 0;
  }
  g.state = 'patrol';
  if (g.path.length) {
    if (moveAlong(g, g.speed, dt)) {
      g.wait = g.route[g.ri].wait;
      const f = g.route[g.ri].face;
      if (f !== undefined) g.baseFace = f * D2R;
    }
    return;
  }
  // standing at a patrol point
  if (g.sweep) g.face = g.baseFace + g.sweep.amp * D2R * Math.sin(g.t * g.sweep.speed);
  else if (g.route[g.ri].face !== undefined) turnToward(g, g.baseFace, dt);
  if (g.wait > 0) { g.wait -= dt; return; }
  if (g.route.length > 1) {
    advance(g);
    goTo(ctx, state, g, g.route[g.ri].x, g.route[g.ri].y);
  }
}

/** After a rewarded "continue": guards near the thief are sent back to their spawn so the retry is fair. */
export function resetGuardNear(g, x, y, radius) {
  g.meter = 0; g.state = 'patrol'; g.inv = null; g.invId = -1; g.look = null; g.chase = false; g.alertT = 0; g.chaseT = 0; g.lastSeen = null;
  if (Math.hypot(g.x - x, g.y - y) < radius) {
    g.x = g.spawn.x; g.y = g.spawn.y; g.face = g.spawn.face; g.path = []; g.ri = 0; g.dir = 1; g.wait = 0.5;
  }
}
