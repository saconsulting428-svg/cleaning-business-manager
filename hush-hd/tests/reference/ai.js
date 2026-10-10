/* HUSH — creature AI. A small, learnable state machine:
   ROAM -> (hears a noise) INVESTIGATE -> SEARCH -> RETURN -> ROAM, and from any of those (sees the player long enough) -> HUNT -> SEARCH.
   Deterministic: no randomness, so behaviour can be learned by the player and proven by the solver. */
(function (root) {
  'use strict';
  var ROAM = 0, INV = 1, SEARCH = 2, HUNT = 3, RETURN = 4;
  var TYPES = {
    stalker:  { roam: 1.3, inv: 2.1, hunt: 2.9, sight: 4.5, sightC: 2.5, hear: 1 },    /* patrols a route */
    sentinel: { roam: 1.3, inv: 2.1, hunt: 2.9, sight: 5.0, sightC: 2.5, hear: 1 },    /* stands guard, only moves for noise */
    listener: { roam: 1.1, inv: 2.4, hunt: 2.8, sight: 1.3, sightC: 1.3, hear: 1.7 }   /* nearly blind, hears far */
  };
  var NOTICE = 0.55, FORGET = 1, HUNT_SIGHT = 6.5, CATCH = 0.6, STAIR_T = 1, SEARCH_T = 4, SEARCH_HUNT_T = 5, PUSH_DOOR = 0.8;

  function define(c) {
    var T = TYPES[c.t || 'stalker'], d = { t: c.t || 'stalker', f: c.f || 0, a: c.a, b: c.b === undefined ? c.a : c.b, dir: c.dir || 1, turn: c.turn || 0, wake: c.wake || 0 };
    for (var k in T) d[k] = c[k] === undefined ? T[k] : c[k];
    d.a += 0.5; d.b += 0.5; d.guard = d.t === 'sentinel' || d.a === d.b;
    return d;
  }
  function spawn(d) { var c = { f: d.f, x: d.a, dir: d.dir, st: ROAM, tm: 0, tf: d.f, tx: d.a, wp: 1, seen: 0, lk: 0, busy: 0, bf: -1, bx: 0, turnT: d.turn, doorT: 0, sx: 0, sT: 4, step: 0, hk: '' }; if (d.wake === 'hunt') { c.st = HUNT; c.seen = 1; } return c; }

  function sees(W, S, c, d, doorBetween) {
    if (c.f !== S.f || S.hid >= 0 || S.vent || c.busy > 0) return false;
    var dx = S.x - c.x, dist = Math.abs(dx);
    if (doorBetween(W, S, c.f, c.x, S.x)) return false;
    if (dist < 1) return true;
    if (c.st === HUNT) return dist <= HUNT_SIGHT;
    return (dx > 0 ? 1 : -1) === c.dir && dist <= (S.crouch ? d.sightC : d.sight);
  }
  /* A noise reaches a creature if the walking distance to it is within the noise radius (scaled by the creature's hearing). */
  function hear(W, S, c, d, f, x, r, kind, route) {
    if (c.st === HUNT) return;
    if (route(W, c.f, c.x, f, x).d > r * d.hear) return;
    c.st = INV; c.tf = f; c.tx = x; c.doorT = 0; c.hk = kind; S.ev.push({ e: 'heard', kind: kind });
  }
  /* Is any hunting creature looking at the player right now? (hiding while watched does not work) */
  function watched(W, S) {
    var Wd = root.HushWorld || require('./world.js');
    for (var i = 0; i < S.cr.length; i++) { var c = S.cr[i]; if (c.st !== HUNT) continue; var hid = S.hid; S.hid = -1; var v = sees(W, S, c, W.cdefs[i], Wd.doorBetween); S.hid = hid; if (v) return true; }
    return false;
  }
  /* The player took stairs: hunters that saw it will follow. */
  function follow(W, S, landing) { for (var i = 0; i < S.cr.length; i++) { var c = S.cr[i]; if (c.st === HUNT && c.f === S.f && Math.abs(c.x - S.x) <= HUNT_SIGHT) { c.tf = landing.f; c.tx = landing.x; c.lk = 0; } } }

  /* The player steps onto stairs a creature is already coming down: caught. */
  function onStairs(S, o) { for (var i = 0; i < S.cr.length; i++) { var c = S.cr[i]; if (c.busy > 0 && c.bf === o.f && Math.abs(c.bx - o.x) < 0.1) { hunt(S, c); S.dead = true; S.ev.push({ e: 'caught' }); } } }

  /* Walk toward a point (possibly on another floor). Returns 'moving' | 'arrived' | 'blocked'. */
  function goTo(W, S, c, tf, tx, speed, dt, route, doorBetween) {
    var gx = tx, stair = null;
    if (c.f !== tf) { stair = route(W, c.f, c.x, tf, tx).via; if (!stair) return 'blocked'; gx = stair.x; }
    var dx = gx - c.x;
    if (Math.abs(dx) < 0.08) {
      if (stair) { var p = W.objs[stair.link]; c.busy = STAIR_T; c.bf = p.f; c.bx = p.x; S.ev.push({ e: 'cstairs' });
        if (S.busy > 0 && !S.vent && S.bf === c.f && Math.abs(S.bx - stair.x) < 0.1) { hunt(S, c); S.dead = true; S.ev.push({ e: 'caught' }); }   /* met on the stairs */
        return 'moving'; }
      return 'arrived';
    }
    c.dir = dx > 0 ? 1 : -1;
    var nx = c.x + c.dir * Math.min(Math.abs(dx), speed * dt), door = doorBetween(W, S, c.f, c.x, nx + c.dir * 0.5);
    if (door) {
      if (door.kind !== 'plain') return 'blocked';
      if (Math.abs(door.x - c.x) > 0.95) { c.x = nx; return 'moving'; }
      c.doorT += dt; if (c.doorT >= PUSH_DOOR) { c.doorT = 0; S.open |= 1 << door.bit; S.ev.push({ e: 'cdoor', f: door.f, x: door.x }); }
      return 'moving';
    }
    c.x = nx; c.step += Math.abs(speed * dt); return 'moving';
  }
  function hunt(S, c) { c.st = HUNT; c.seen = 1; c.lk = 0; c.tf = S.f; c.tx = S.x; if (!S.det) S.det = true; S.ev.push({ e: 'hunt' }); }

  function step(W, S, c, d, dt, route, doorBetween) {
    if (c.busy > 0) { c.busy -= dt; if (c.busy <= 0) { c.f = c.bf; c.x = c.bx; c.bf = -1; } return; }
    var see = sees(W, S, c, d, doorBetween), r;
    /* walking into it is never survivable, whatever it was doing */
    if (c.f === S.f && S.hid < 0 && !S.vent && S.busy <= 0 && Math.abs(c.x - S.x) < CATCH) { if (c.st !== HUNT) hunt(S, c); S.dead = true; S.ev.push({ e: 'caught' }); return; }
    if (c.st !== HUNT) {
      if (see) { c.seen += dt / NOTICE; if (c.seen >= 1) hunt(S, c); } else c.seen = Math.max(0, c.seen - dt / FORGET);
    }
    switch (c.st) {
      case ROAM:
        if (c.seen > 0 && see) { c.dir = S.x > c.x ? 1 : -1; break; }           /* it stops and stares: the player's warning */
        if (d.guard) { if (d.turn) { c.turnT -= dt; if (c.turnT <= 0) { c.turnT = d.turn; c.dir = -c.dir; } } break; }
        if (c.tm > 0) { c.tm -= dt; break; }
        if (goTo(W, S, c, d.f, c.wp ? d.b : d.a, d.roam, dt, route, doorBetween) !== 'moving') { c.wp = 1 - c.wp; c.tm = 1; }
        break;
      case INV:
        r = goTo(W, S, c, c.tf, c.tx, d.inv, dt, route, doorBetween);
        if (r !== 'moving') { c.st = SEARCH; c.tm = c.sT = SEARCH_T; c.sx = c.x; }
        break;
      case SEARCH:
        c.tm -= dt;
        var ph = 1 - c.tm / c.sT;
        if (ph < 0.4) goTo(W, S, c, c.f, c.sx - 2, 1.4, dt, route, doorBetween); else if (ph < 0.9) goTo(W, S, c, c.f, c.sx + 2, 1.4, dt, route, doorBetween);
        if (c.tm <= 0) { c.st = RETURN; }
        break;
      case HUNT:
        if (see) { c.tf = S.f; c.tx = S.x; c.lk = 0; } else c.lk += dt;
        r = goTo(W, S, c, c.tf, c.tx, d.hunt, dt, route, doorBetween);
        if (c.f === S.f && !S.vent && S.busy <= 0 && Math.abs(c.x - S.x) < CATCH && (S.hid < 0 || S.comp)) { S.dead = true; S.ev.push({ e: 'caught' }); return; }
        if (!see && c.lk > 1.5 && r !== 'moving') { c.st = SEARCH; c.tm = c.sT = SEARCH_HUNT_T; c.sx = c.x; c.seen = 0; S.ev.push({ e: 'lost' }); }
        break;
      case RETURN:
        var home = d.guard ? d.a : (Math.abs(c.x - d.a) < Math.abs(c.x - d.b) || c.f !== d.f ? d.a : d.b);
        if (goTo(W, S, c, d.f, home, d.roam, dt, route, doorBetween) !== 'moving') { c.st = ROAM; c.wp = home === d.a ? 1 : 0; c.tm = 0.5; if (d.guard) c.dir = d.dir; }
        break;
    }
  }
  var api = { ROAM: ROAM, INV: INV, SEARCH: SEARCH, HUNT: HUNT, RETURN: RETURN, TYPES: TYPES, NAMES: ['roam', 'investigate', 'search', 'hunt', 'return'],
    define: define, spawn: spawn, onStairs: onStairs, sees: sees, hear: hear, watched: watched, follow: follow, step: step };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HushAI = api;
})(typeof window !== 'undefined' ? window : globalThis);
