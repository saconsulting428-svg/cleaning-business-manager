/* HUSH — world model and deterministic simulation (movement, interaction, noise). No rendering, no DOM.
   Shared by the game, the automated solver and the tests. All state is plain data so it can be cloned cheaply. */
(function (root) {
  'use strict';
  var AI = root.HushAI || require('./ai.js');
  var DT = 1 / 30;
  var C = { WALK: 2.4, CROUCH: 1.2, STEP_T: 0.45, N_STEP: 3, N_GLASS: 8, N_GLASS_CROUCH: 2.5, N_DOOR: 6, N_LOCK: 4, N_GEN: 10, N_RADIO: 12, N_SONAR: 14,
    SONAR_CD: 2.5, SONAR_R: 9, REACH: 0.75, PICK: 0.6, STAIR_T: 0.5, VENT_T: 1.4, GEN_PULSES: 8, RADIO_DELAY: 1.5, RADIO_PULSES: 5 };

  /* Level text: one string per floor, one character per tile.
     . floor   ~ noisy debris   P start   E exit   e exit that needs power   L locker (hide)   K keycard
     D door   X locked door (keycard)   W powered door (generator)   G generator   R radio switch   S speaker
     # solid wall   1-9 stair pairs   a-c vent pairs   u-w hidden vent pairs (found with sonar) */
  function parse(def) {
    var W = { def: def, floors: [], objs: [], doors: [], keys: [], vents: [], stairs: [], lockers: [], start: null, exit: null, gen: null, radio: null, speaker: null,
      sonar: def.sonar === undefined ? 3 : def.sonar, par: def.par === undefined ? 1 : def.par, chase: !!def.chase, parTime: def.parTime || 0 };
    var pairs = {};
    def.floors.forEach(function (row, f) {
      var fl = { w: row.length, noisy: [] }; W.floors.push(fl);
      for (var i = 0; i < row.length; i++) {
        var ch = row[i], x = i + 0.5, o = null; fl.noisy.push(ch === '~');
        if (ch === '.' || ch === '~') continue;
        if (ch === 'P') { W.start = { f: f, x: x }; continue; }
        if (ch === 'E' || ch === 'e') o = { t: 'exit', power: ch === 'e' };
        else if (ch === 'L') o = { t: 'locker' };
        else if (ch === 'K') o = { t: 'key', bit: W.keys.length };
        else if (ch === 'D' || ch === 'X' || ch === 'W') o = { t: 'door', kind: ch === 'D' ? 'plain' : ch === 'X' ? 'locked' : 'power', bit: 0 };
        else if (ch === '#') o = { t: 'door', kind: 'wall', bit: 30 };
        else if (ch === 'G') o = { t: 'gen' };
        else if (ch === 'R') o = { t: 'radio' };
        else if (ch === 'S') o = { t: 'speaker' };
        else if (/[1-9]/.test(ch)) o = { t: 'stairs', tag: ch };
        else if (/[a-c]/.test(ch)) o = { t: 'vent', tag: ch, hidden: false };
        else if (/[u-w]/.test(ch)) o = { t: 'vent', tag: ch, hidden: true };
        else throw new Error('Unknown tile "' + ch + '" in ' + def.name);
        o.id = W.objs.length; o.f = f; o.x = x; W.objs.push(o);
        if (o.t === 'door') { if (o.kind === 'wall') W.walls = (W.walls || 0) + 1; W.doors.push(o); if (o.kind !== 'wall') o.bit = W.doors.length - 1 - (W.walls || 0); } if (o.t === 'key') W.keys.push(o); if (o.t === 'locker') W.lockers.push(o);
        if (o.t === 'exit') W.exit = o; if (o.t === 'gen') W.gen = o; if (o.t === 'radio') W.radio = o; if (o.t === 'speaker') W.speaker = o;
        if (o.tag) { if (pairs[o.tag]) { o.link = pairs[o.tag].id; pairs[o.tag].link = o.id; pairs[o.tag].done = 1; if (o.t === 'vent') { o.bit = pairs[o.tag].bit; } } else { pairs[o.tag] = o; if (o.t === 'vent') { o.bit = W.vents.length; } }
          (o.t === 'vent' ? W.vents : W.stairs).push(o); }
      }
    });
    Object.keys(pairs).forEach(function (k) { if (!pairs[k].done) throw new Error('Unpaired "' + k + '" in ' + def.name); });
    if (!W.start || !W.exit) throw new Error('Missing start or exit in ' + def.name);
    /* all-pairs walking distance between stair landings (creatures and sound travel by stairs, never vents) */
    var n = W.stairs.length, D = []; W.stairs.forEach(function (s, i) { s.si = i; });
    for (var i = 0; i < n; i++) { D.push([]); for (var j = 0; j < n; j++) { var a = W.stairs[i], b = W.stairs[j];
      D[i].push(i === j ? 0 : a.link === b.id ? 2 : a.f === b.f ? Math.abs(a.x - b.x) : 1e9); } }
    for (var k = 0; k < n; k++) for (i = 0; i < n; i++) for (j = 0; j < n; j++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j];
    W.SD = D;
    W.cdefs = (def.creatures || []).map(function (c) { return AI.define(c); });
    return W;
  }
  /* Walking distance between two points, and the first stair to take when they are on different floors. */
  function route(W, f1, x1, f2, x2) {
    if (f1 === f2) return { d: Math.abs(x1 - x2), via: null };
    var best = 1e9, via = null;
    for (var i = 0; i < W.stairs.length; i++) { var s = W.stairs[i]; if (s.f !== f1) continue;
      for (var j = 0; j < W.stairs.length; j++) { var e = W.stairs[j]; if (e.f !== f2) continue;
        var d = Math.abs(x1 - s.x) + W.SD[i][j] + Math.abs(x2 - e.x); if (d < best) { best = d; via = s; } } }
    return { d: best, via: via };
  }

  function init(W) {
    return { t: 0, f: W.start.f, x: W.start.x, dir: 1, crouch: false, moving: false, hid: -1, comp: false, busy: 0, bf: -1, bx: 0, vent: false,
      keys: 0, power: false, open: 0, took: 0, rev: 0, sl: W.sonar, scd: 0, su: 0, det: false, stepT: 0, genN: 0, genT: 0, radT: -1, radN: 0, radTT: 0,
      won: false, dead: false, cr: W.cdefs.map(function (d) { return AI.spawn(d); }), ev: [] };
  }
  function clone(S) {
    var o = {}; for (var k in S) o[k] = S[k];
    o.cr = S.cr.map(function (c) { var n = {}; for (var k in c) n[k] = c[k]; return n; }); o.ev = [];
    return o;
  }
  function doorOpen(S, d) { return (S.open >> d.bit) & 1; }
  /* Is a closed door standing between two x positions on a floor? Returns the door or null. */
  function doorBetween(W, S, f, x1, x2) {
    for (var i = 0; i < W.doors.length; i++) { var d = W.doors[i]; if (d.f === f && !doorOpen(S, d) && (d.x - x1) * (d.x - x2) < 0) return d; }
    return null;
  }
  function noise(W, S, f, x, r, kind) {
    S.ev.push({ e: 'noise', f: f, x: x, r: r, kind: kind });
    for (var i = 0; i < S.cr.length; i++) AI.hear(W, S, S.cr[i], W.cdefs[i], f, x, r, kind, route);
  }
  /* The thing the player would use right now (for the contextual button), or null. */
  function target(W, S) {
    if (S.busy > 0 || S.dead || S.won) return null;
    if (S.hid >= 0) return { o: W.objs[S.hid], act: 'leave' };
    var best = null, bd = C.REACH;
    for (var i = 0; i < W.objs.length; i++) { var o = W.objs[i]; if (o.f !== S.f) continue; var d = Math.abs(o.x - S.x); if (d > bd) continue; var act = null;
      if (o.t === 'door' && o.kind !== 'wall' && !doorOpen(S, o)) act = o.kind === 'plain' ? 'open' : o.kind === 'locked' ? (S.keys > 0 ? 'unlock' : 'locked') : (S.power ? 'open' : 'nopower');
      else if (o.t === 'locker') act = 'hide';
      else if (o.t === 'stairs') act = 'climb';
      else if (o.t === 'vent' && (!o.hidden || (S.rev >> o.bit) & 1)) act = 'crawl';
      else if (o.t === 'gen' && !S.power) act = 'start';
      else if (o.t === 'radio' && S.radT < 0 && S.radN === 0) act = 'radio';
      else if (o.t === 'exit' && o.power && !S.power) act = 'nopower';
      if (act) { best = { o: o, act: act }; bd = d; } }
    return best;
  }
  /* Advance the world by one tick. inp: { mx: -1|0|1, crouch: bool, use: bool, ping: bool } (use/ping are single presses). */
  function step(W, S, inp) {
    if (S.won || S.dead) return;
    var dt = DT, i; S.t += dt; if (S.scd > 0) S.scd -= dt; S.moving = false;
    if (S.busy > 0) { S.busy -= dt; if (S.busy <= 0 && S.bf >= 0) { S.f = S.bf; S.x = S.bx; S.bf = -1; S.vent = false; S.ev.push({ e: 'arrive' }); } }
    else if (S.hid >= 0) { if (inp.use) { S.hid = -1; S.comp = false; S.ev.push({ e: 'leave' }); } }
    else {
      S.crouch = !!inp.crouch;
      if (inp.mx) {
        var nx = S.x + inp.mx * (S.crouch ? C.CROUCH : C.WALK) * dt, w = W.floors[S.f].w; S.dir = inp.mx;
        nx = Math.max(0.5, Math.min(w - 0.5, nx));
        for (i = 0; i < W.doors.length; i++) { var d = W.doors[i]; if (d.f !== S.f || doorOpen(S, d)) continue;
          if (S.x <= d.x - 0.45 && nx > d.x - 0.45) nx = d.x - 0.45; if (S.x >= d.x + 0.45 && nx < d.x + 0.45) nx = d.x + 0.45; }
        if (nx !== S.x) { S.x = nx; S.moving = true; S.stepT -= dt;
          if (S.stepT <= 0) { S.stepT = C.STEP_T * (S.crouch ? 1.5 : 1); var glass = W.floors[S.f].noisy[Math.floor(S.x)], r = glass ? (S.crouch ? C.N_GLASS_CROUCH : C.N_GLASS) : (S.crouch ? 0 : C.N_STEP);
            S.ev.push({ e: 'step', glass: glass, crouch: S.crouch }); if (r) noise(W, S, S.f, S.x, r, glass ? 'glass' : 'step'); } }
      } else S.stepT = 0;
      for (i = 0; i < W.keys.length; i++) { var k = W.keys[i]; if (k.f === S.f && !((S.took >> k.bit) & 1) && Math.abs(k.x - S.x) < C.PICK) { S.took |= 1 << k.bit; S.keys++; S.ev.push({ e: 'key', x: k.x }); } }
      var ex = W.exit; if (ex.f === S.f && Math.abs(ex.x - S.x) < C.PICK && (!ex.power || S.power)) { S.won = true; S.ev.push({ e: 'won' }); return; }
      if (inp.use) { var tg = target(W, S); if (tg) { var o = tg.o;
        switch (tg.act) {
          case 'open': S.open |= 1 << o.bit; S.ev.push({ e: 'door', x: o.x }); noise(W, S, o.f, o.x, C.N_DOOR, 'door'); break;
          case 'unlock': S.keys--; S.open |= 1 << o.bit; S.ev.push({ e: 'unlock', x: o.x }); noise(W, S, o.f, o.x, C.N_LOCK, 'door'); break;
          case 'locked': case 'nopower': S.ev.push({ e: 'denied', why: tg.act }); break;
          case 'hide': S.hid = o.id; S.x = o.x; S.comp = AI.watched(W, S); S.ev.push({ e: 'hide' }); break;
          case 'climb': var p = W.objs[o.link]; S.busy = C.STAIR_T; S.bf = p.f; S.bx = p.x; S.x = o.x; AI.follow(W, S, p); S.ev.push({ e: 'stairs' }); AI.onStairs(S, o); break;
          case 'crawl': var q = W.objs[o.link]; S.busy = C.VENT_T; S.bf = q.f; S.bx = q.x; S.x = o.x; S.vent = true; S.ev.push({ e: 'vent' }); break;
          case 'start': S.power = true; S.genN = C.GEN_PULSES; S.genT = 0; S.ev.push({ e: 'gen', x: o.x }); break;
          case 'radio': S.radT = C.RADIO_DELAY; S.ev.push({ e: 'radio' }); break;
        } } }
      if (inp.ping && S.sl > 0 && S.scd <= 0) { S.sl--; S.su++; S.scd = C.SONAR_CD;
        for (i = 0; i < W.vents.length; i++) { var v = W.vents[i]; if (v.hidden && v.f === S.f && Math.abs(v.x - S.x) <= C.SONAR_R) S.rev |= 1 << v.bit; }
        S.ev.push({ e: 'ping', f: S.f, x: S.x }); noise(W, S, S.f, S.x, C.N_SONAR, 'sonar'); }
    }
    if (S.genN > 0) { S.genT -= dt; if (S.genT <= 0) { S.genT = 1; S.genN--; noise(W, S, W.gen.f, W.gen.x, C.N_GEN, 'gen'); } }
    if (S.radT >= 0) { S.radT -= dt; if (S.radT < 0) { S.radN = C.RADIO_PULSES; S.radTT = 0; } }
    if (S.radN > 0) { S.radTT -= dt; if (S.radTT <= 0) { S.radTT = 1; S.radN--; noise(W, S, W.speaker.f, W.speaker.x, C.N_RADIO, 'radio'); } }
    for (i = 0; i < S.cr.length; i++) AI.step(W, S, S.cr[i], W.cdefs[i], dt, route, doorBetween);
  }
  function stars(W, S) { return 1 + (S.su <= W.par ? 1 : 0) + ((W.chase ? S.t <= W.parTime : !S.det) ? 1 : 0); }

  var api = { DT: DT, C: C, parse: parse, init: init, clone: clone, step: step, target: target, route: route, doorOpen: doorOpen, doorBetween: doorBetween, stars: stars };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HushWorld = api;
})(typeof window !== 'undefined' ? window : globalThis);
