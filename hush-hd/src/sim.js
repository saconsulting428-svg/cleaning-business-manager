/* HUSH HD - deterministic simulation: world model, noise, creature AI.
   No rendering, no DOM, no randomness. Everything is plain data so a state can be cloned cheaply (tests and solvers rely on it).
   The rules, constants and update order reproduce the original game; tests/diff-sim.js proves it tick-for-tick against the original code. */
const Sim = (function () {
  'use strict';

  const DT = 1 / 30;                                   // fixed simulation step (seconds)

  /* ---------- tuning (original values) ---------- */
  const C = {
    WALK: 2.4, CROUCH: 1.2, STEP_T: 0.45,
    N_STEP: 3, N_GLASS: 8, N_GLASS_CROUCH: 2.5, N_DOOR: 6, N_LOCK: 4, N_GEN: 10, N_RADIO: 12, N_SONAR: 14,    // noise radii (tiles)
    SONAR_CD: 2.5, SONAR_R: 9, REACH: 0.75, PICK: 0.6, STAIR_T: 0.5, VENT_T: 1.4,
    GEN_PULSES: 8, RADIO_DELAY: 1.5, RADIO_PULSES: 5
  };
  const AIC = { NOTICE: 0.55, FORGET: 1, HUNT_SIGHT: 6.5, CATCH: 0.6, STAIR_T: 1, SEARCH_T: 4, SEARCH_HUNT_T: 5, PUSH_DOOR: 0.8 };
  const ROAM = 0, INVESTIGATE = 1, SEARCH = 2, HUNT = 3, RETURN = 4;
  const STATE_NAMES = ['roam', 'investigate', 'search', 'hunt', 'return'];
  const TYPES = {
    stalker:  { roam: 1.3, inv: 2.1, hunt: 2.9, sight: 4.5, sightC: 2.5, hear: 1 },     // patrols a route
    sentinel: { roam: 1.3, inv: 2.1, hunt: 2.9, sight: 5.0, sightC: 2.5, hear: 1 },     // stands guard, moves only for noise
    listener: { roam: 1.1, inv: 2.4, hunt: 2.8, sight: 1.3, sightC: 1.3, hear: 1.7 }    // nearly blind, hears far
  };

  /* ---------- level parsing ---------- */
  function parse(def) {
    const W = {
      def, floors: [], objs: [], doors: [], keys: [], vents: [], stairs: [], lockers: [], start: null, exit: null, gen: null, radio: null, speaker: null,
      sonar: def.sonar === undefined ? 3 : def.sonar, par: def.par === undefined ? 1 : def.par, chase: !!def.chase, parTime: def.parTime || 0, walls: 0
    };
    const pairs = {};
    def.floors.forEach(function (row, f) {
      const fl = { w: row.length, noisy: [] };
      W.floors.push(fl);
      for (let i = 0; i < row.length; i++) {
        const ch = row[i], x = i + 0.5;
        let o = null;
        fl.noisy.push(ch === '~');
        if (ch === '.' || ch === '~') continue;
        if (ch === 'P') { W.start = { f, x }; continue; }
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
        if (o.t === 'door') {
          if (o.kind === 'wall') W.walls++;
          W.doors.push(o);
          if (o.kind !== 'wall') o.bit = W.doors.length - 1 - W.walls;
        }
        if (o.t === 'key') W.keys.push(o);
        if (o.t === 'locker') W.lockers.push(o);
        if (o.t === 'exit') W.exit = o;
        if (o.t === 'gen') W.gen = o;
        if (o.t === 'radio') W.radio = o;
        if (o.t === 'speaker') W.speaker = o;
        if (o.tag) {                                                    // stairs and vents come in linked pairs
          const first = pairs[o.tag];
          if (first) { o.link = first.id; first.link = o.id; first.done = true; if (o.t === 'vent') o.bit = first.bit; }
          else { pairs[o.tag] = o; if (o.t === 'vent') o.bit = W.vents.length; }
          (o.t === 'vent' ? W.vents : W.stairs).push(o);
        }
      }
    });
    Object.keys(pairs).forEach(function (k) { if (!pairs[k].done) throw new Error('Unpaired "' + k + '" in ' + def.name); });
    if (!W.start || !W.exit) throw new Error('Missing start or exit in ' + def.name);
    /* all-pairs walking distance between stair landings: creatures and sound travel by stairs, never by vents */
    const n = W.stairs.length, D = [];
    W.stairs.forEach(function (s, i) { s.si = i; });
    for (let i = 0; i < n; i++) {
      D.push([]);
      for (let j = 0; j < n; j++) {
        const a = W.stairs[i], b = W.stairs[j];
        D[i].push(i === j ? 0 : a.link === b.id ? 2 : a.f === b.f ? Math.abs(a.x - b.x) : 1e9);
      }
    }
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j];
    W.SD = D;
    W.cdefs = (def.creatures || []).map(defineCreature);
    return W;
  }

  /* Walking distance between two points, and the first stair to take when they are on different floors. */
  function route(W, f1, x1, f2, x2) {
    if (f1 === f2) return { d: Math.abs(x1 - x2), via: null };
    let best = 1e9, via = null;
    for (let i = 0; i < W.stairs.length; i++) {
      const s = W.stairs[i]; if (s.f !== f1) continue;
      for (let j = 0; j < W.stairs.length; j++) {
        const e = W.stairs[j]; if (e.f !== f2) continue;
        const d = Math.abs(x1 - s.x) + W.SD[i][j] + Math.abs(x2 - e.x);
        if (d < best) { best = d; via = s; }
      }
    }
    return { d: best, via };
  }

  /* ---------- state ---------- */
  function init(W) {
    return {
      t: 0, f: W.start.f, x: W.start.x, dir: 1, crouch: false, moving: false, hid: -1, comp: false, busy: 0, bf: -1, bx: 0, vent: false,
      keys: 0, power: false, open: 0, took: 0, rev: 0, sl: W.sonar, scd: 0, su: 0, det: false, stepT: 0, genN: 0, genT: 0, radT: -1, radN: 0, radTT: 0,
      won: false, dead: false, cr: W.cdefs.map(spawnCreature), ev: []
    };
  }
  function clone(S) {
    const o = {};
    for (const k in S) o[k] = S[k];
    o.cr = S.cr.map(function (c) { const n = {}; for (const k in c) n[k] = c[k]; return n; });
    o.ev = [];
    return o;
  }
  const doorOpen = function (S, d) { return (S.open >> d.bit) & 1; };
  /* Is a closed door (or wall) standing between two x positions on a floor? Returns it, or null. */
  function doorBetween(W, S, f, x1, x2) {
    for (let i = 0; i < W.doors.length; i++) {
      const d = W.doors[i];
      if (d.f === f && !doorOpen(S, d) && (d.x - x1) * (d.x - x2) < 0) return d;
    }
    return null;
  }

  /* ---------- creature AI ---------- */
  function defineCreature(c) {
    const T = TYPES[c.t || 'stalker'];
    const d = { t: c.t || 'stalker', f: c.f || 0, a: c.a, b: c.b === undefined ? c.a : c.b, dir: c.dir || 1, turn: c.turn || 0, wake: c.wake || 0 };
    for (const k in T) d[k] = c[k] === undefined ? T[k] : c[k];
    d.a += 0.5; d.b += 0.5;
    d.guard = d.t === 'sentinel' || d.a === d.b;
    return d;
  }
  function spawnCreature(d) {
    const c = { f: d.f, x: d.a, dir: d.dir, st: ROAM, tm: 0, tf: d.f, tx: d.a, wp: 1, seen: 0, lk: 0, busy: 0, bf: -1, bx: 0, turnT: d.turn, doorT: 0, sx: 0, sT: 4, step: 0, hk: '' };
    if (d.wake === 'hunt') { c.st = HUNT; c.seen = 1; }
    return c;
  }
  function sees(W, S, c, d) {
    if (c.f !== S.f || S.hid >= 0 || S.vent || c.busy > 0) return false;
    const dx = S.x - c.x, dist = Math.abs(dx);
    if (doorBetween(W, S, c.f, c.x, S.x)) return false;
    if (dist < 1) return true;
    if (c.st === HUNT) return dist <= AIC.HUNT_SIGHT;
    return (dx > 0 ? 1 : -1) === c.dir && dist <= (S.crouch ? d.sightC : d.sight);
  }
  /* A noise reaches a creature if the walking distance to it is within the noise radius (scaled by its hearing). */
  function hear(W, S, c, d, f, x, r, kind) {
    if (c.st === HUNT) return;
    if (route(W, c.f, c.x, f, x).d > r * d.hear) return;
    c.st = INVESTIGATE; c.tf = f; c.tx = x; c.doorT = 0; c.hk = kind;
    S.ev.push({ e: 'heard', kind });
  }
  /* Is any hunting creature looking at the player right now? (hiding while watched does not work) */
  function watched(W, S) {
    for (let i = 0; i < S.cr.length; i++) {
      const c = S.cr[i]; if (c.st !== HUNT) continue;
      const hid = S.hid; S.hid = -1;
      const v = sees(W, S, c, W.cdefs[i]);
      S.hid = hid;
      if (v) return true;
    }
    return false;
  }
  /* The player took stairs: hunters that saw it will follow. */
  function followStairs(W, S, landing) {
    for (let i = 0; i < S.cr.length; i++) {
      const c = S.cr[i];
      if (c.st === HUNT && c.f === S.f && Math.abs(c.x - S.x) <= AIC.HUNT_SIGHT) { c.tf = landing.f; c.tx = landing.x; c.lk = 0; }
    }
  }
  function startHunt(S, c) {
    c.st = HUNT; c.seen = 1; c.lk = 0; c.tf = S.f; c.tx = S.x;
    if (!S.det) S.det = true;
    S.ev.push({ e: 'hunt' });
  }
  function kill(S, c, hunting) { if (hunting) startHunt(S, c); S.dead = true; S.ev.push({ e: 'caught' }); }
  /* The player steps onto stairs a creature is already coming down: caught. */
  function onStairs(S, o) {
    for (let i = 0; i < S.cr.length; i++) {
      const c = S.cr[i];
      if (c.busy > 0 && c.bf === o.f && Math.abs(c.bx - o.x) < 0.1) kill(S, c, true);
    }
  }
  /* Walk toward a point (possibly on another floor). Returns 'moving' | 'arrived' | 'blocked'. */
  function goTo(W, S, c, tf, tx, speed, dt) {
    let gx = tx, stair = null;
    if (c.f !== tf) { stair = route(W, c.f, c.x, tf, tx).via; if (!stair) return 'blocked'; gx = stair.x; }
    const dx = gx - c.x;
    if (Math.abs(dx) < 0.08) {
      if (stair) {
        const p = W.objs[stair.link];
        c.busy = AIC.STAIR_T; c.bf = p.f; c.bx = p.x; S.ev.push({ e: 'cstairs' });
        if (S.busy > 0 && !S.vent && S.bf === c.f && Math.abs(S.bx - stair.x) < 0.1) kill(S, c, true);        // met on the stairs
        return 'moving';
      }
      return 'arrived';
    }
    c.dir = dx > 0 ? 1 : -1;
    const nx = c.x + c.dir * Math.min(Math.abs(dx), speed * dt), door = doorBetween(W, S, c.f, c.x, nx + c.dir * 0.5);
    if (door) {
      if (door.kind !== 'plain') return 'blocked';
      if (Math.abs(door.x - c.x) > 0.95) { c.x = nx; return 'moving'; }
      c.doorT += dt;
      if (c.doorT >= AIC.PUSH_DOOR) { c.doorT = 0; S.open |= 1 << door.bit; S.ev.push({ e: 'cdoor', f: door.f, x: door.x }); }
      return 'moving';
    }
    c.x = nx; c.step += Math.abs(speed * dt);
    return 'moving';
  }
  function stepCreature(W, S, c, d, dt) {
    if (c.busy > 0) { c.busy -= dt; if (c.busy <= 0) { c.f = c.bf; c.x = c.bx; c.bf = -1; } return; }
    const see = sees(W, S, c, d);
    let r;
    /* walking into it is never survivable, whatever it was doing */
    if (c.f === S.f && S.hid < 0 && !S.vent && S.busy <= 0 && Math.abs(c.x - S.x) < AIC.CATCH) { kill(S, c, c.st !== HUNT); return; }
    if (c.st !== HUNT) {
      if (see) { c.seen += dt / AIC.NOTICE; if (c.seen >= 1) startHunt(S, c); }
      else c.seen = Math.max(0, c.seen - dt / AIC.FORGET);
    }
    switch (c.st) {
      case ROAM:
        if (c.seen > 0 && see) { c.dir = S.x > c.x ? 1 : -1; break; }            // it stops and stares: the player's warning
        if (d.guard) { if (d.turn) { c.turnT -= dt; if (c.turnT <= 0) { c.turnT = d.turn; c.dir = -c.dir; } } break; }
        if (c.tm > 0) { c.tm -= dt; break; }
        if (goTo(W, S, c, d.f, c.wp ? d.b : d.a, d.roam, dt) !== 'moving') { c.wp = 1 - c.wp; c.tm = 1; }
        break;
      case INVESTIGATE:
        r = goTo(W, S, c, c.tf, c.tx, d.inv, dt);
        if (r !== 'moving') { c.st = SEARCH; c.tm = c.sT = AIC.SEARCH_T; c.sx = c.x; }
        break;
      case SEARCH: {
        c.tm -= dt;
        const ph = 1 - c.tm / c.sT;
        if (ph < 0.4) goTo(W, S, c, c.f, c.sx - 2, 1.4, dt); else if (ph < 0.9) goTo(W, S, c, c.f, c.sx + 2, 1.4, dt);
        if (c.tm <= 0) c.st = RETURN;
        break;
      }
      case HUNT:
        if (see) { c.tf = S.f; c.tx = S.x; c.lk = 0; } else c.lk += dt;
        r = goTo(W, S, c, c.tf, c.tx, d.hunt, dt);
        if (c.f === S.f && !S.vent && S.busy <= 0 && Math.abs(c.x - S.x) < AIC.CATCH && (S.hid < 0 || S.comp)) { kill(S, c, false); return; }
        if (!see && c.lk > 1.5 && r !== 'moving') { c.st = SEARCH; c.tm = c.sT = AIC.SEARCH_HUNT_T; c.sx = c.x; c.seen = 0; S.ev.push({ e: 'lost' }); }
        break;
      case RETURN: {
        const home = d.guard ? d.a : (Math.abs(c.x - d.a) < Math.abs(c.x - d.b) || c.f !== d.f ? d.a : d.b);
        if (goTo(W, S, c, d.f, home, d.roam, dt) !== 'moving') { c.st = ROAM; c.wp = home === d.a ? 1 : 0; c.tm = 0.5; if (d.guard) c.dir = d.dir; }
        break;
      }
    }
  }

  /* ---------- player and world ---------- */
  function noise(W, S, f, x, r, kind) {
    S.ev.push({ e: 'noise', f, x, r, kind });
    for (let i = 0; i < S.cr.length; i++) hear(W, S, S.cr[i], W.cdefs[i], f, x, r, kind);
  }
  /* The thing the player would use right now (drives the contextual USE button), or null. */
  function target(W, S) {
    if (S.busy > 0 || S.dead || S.won) return null;
    if (S.hid >= 0) return { o: W.objs[S.hid], act: 'leave' };
    let best = null, bd = C.REACH;
    for (let i = 0; i < W.objs.length; i++) {
      const o = W.objs[i]; if (o.f !== S.f) continue;
      const d = Math.abs(o.x - S.x); if (d > bd) continue;
      let act = null;
      if (o.t === 'door' && o.kind !== 'wall' && !doorOpen(S, o)) act = o.kind === 'plain' ? 'open' : o.kind === 'locked' ? (S.keys > 0 ? 'unlock' : 'locked') : (S.power ? 'open' : 'nopower');
      else if (o.t === 'locker') act = 'hide';
      else if (o.t === 'stairs') act = 'climb';
      else if (o.t === 'vent' && (!o.hidden || (S.rev >> o.bit) & 1)) act = 'crawl';
      else if (o.t === 'gen' && !S.power) act = 'start';
      else if (o.t === 'radio' && S.radT < 0 && S.radN === 0) act = 'radio';
      else if (o.t === 'exit' && o.power && !S.power) act = 'nopower';
      if (act) { best = { o, act }; bd = d; }
    }
    return best;
  }

  /* Advance the world by one tick. inp = { mx: -1|0|1, crouch: bool, use: bool, ping: bool } (use and ping are single presses). */
  function step(W, S, inp) {
    if (S.won || S.dead) return;
    const dt = DT;
    S.t += dt; if (S.scd > 0) S.scd -= dt; S.moving = false;
    if (S.busy > 0) {
      S.busy -= dt;
      if (S.busy <= 0 && S.bf >= 0) { S.f = S.bf; S.x = S.bx; S.bf = -1; S.vent = false; S.ev.push({ e: 'arrive' }); }
    } else if (S.hid >= 0) {
      if (inp.use) { S.hid = -1; S.comp = false; S.ev.push({ e: 'leave' }); }
    } else {
      S.crouch = !!inp.crouch;
      if (inp.mx) walk(W, S, inp.mx, dt);
      else S.stepT = 0;
      pickKeys(W, S);
      const ex = W.exit;
      if (ex.f === S.f && Math.abs(ex.x - S.x) < C.PICK && (!ex.power || S.power)) { S.won = true; S.ev.push({ e: 'won' }); return; }
      if (inp.use) { const tg = target(W, S); if (tg) interact(W, S, tg); }
      if (inp.ping && S.sl > 0 && S.scd <= 0) ping(W, S);
    }
    if (S.genN > 0) { S.genT -= dt; if (S.genT <= 0) { S.genT = 1; S.genN--; noise(W, S, W.gen.f, W.gen.x, C.N_GEN, 'gen'); } }
    if (S.radT >= 0) { S.radT -= dt; if (S.radT < 0) { S.radN = C.RADIO_PULSES; S.radTT = 0; } }
    if (S.radN > 0) { S.radTT -= dt; if (S.radTT <= 0) { S.radTT = 1; S.radN--; noise(W, S, W.speaker.f, W.speaker.x, C.N_RADIO, 'radio'); } }
    for (let i = 0; i < S.cr.length; i++) stepCreature(W, S, S.cr[i], W.cdefs[i], dt);
  }
  function walk(W, S, mx, dt) {
    let nx = S.x + mx * (S.crouch ? C.CROUCH : C.WALK) * dt;
    const w = W.floors[S.f].w;
    S.dir = mx;
    nx = Math.max(0.5, Math.min(w - 0.5, nx));
    for (let i = 0; i < W.doors.length; i++) {                             // closed doors and walls stop the player
      const d = W.doors[i]; if (d.f !== S.f || doorOpen(S, d)) continue;
      if (S.x <= d.x - 0.45 && nx > d.x - 0.45) nx = d.x - 0.45;
      if (S.x >= d.x + 0.45 && nx < d.x + 0.45) nx = d.x + 0.45;
    }
    if (nx === S.x) return;
    S.x = nx; S.moving = true; S.stepT -= dt;
    if (S.stepT <= 0) {
      S.stepT = C.STEP_T * (S.crouch ? 1.5 : 1);
      const glass = W.floors[S.f].noisy[Math.floor(S.x)];
      const r = glass ? (S.crouch ? C.N_GLASS_CROUCH : C.N_GLASS) : (S.crouch ? 0 : C.N_STEP);
      S.ev.push({ e: 'step', glass, crouch: S.crouch });
      if (r) noise(W, S, S.f, S.x, r, glass ? 'glass' : 'step');
    }
  }
  function pickKeys(W, S) {
    for (let i = 0; i < W.keys.length; i++) {
      const k = W.keys[i];
      if (k.f === S.f && !((S.took >> k.bit) & 1) && Math.abs(k.x - S.x) < C.PICK) { S.took |= 1 << k.bit; S.keys++; S.ev.push({ e: 'key', x: k.x }); }
    }
  }
  function interact(W, S, tg) {
    const o = tg.o;
    switch (tg.act) {
      case 'open': S.open |= 1 << o.bit; S.ev.push({ e: 'door', x: o.x }); noise(W, S, o.f, o.x, C.N_DOOR, 'door'); break;
      case 'unlock': S.keys--; S.open |= 1 << o.bit; S.ev.push({ e: 'unlock', x: o.x }); noise(W, S, o.f, o.x, C.N_LOCK, 'door'); break;
      case 'locked': case 'nopower': S.ev.push({ e: 'denied', why: tg.act }); break;
      case 'hide': S.hid = o.id; S.x = o.x; S.comp = watched(W, S); S.ev.push({ e: 'hide' }); break;
      case 'climb': {
        const p = W.objs[o.link];
        S.busy = C.STAIR_T; S.bf = p.f; S.bx = p.x; S.x = o.x;
        followStairs(W, S, p); S.ev.push({ e: 'stairs' }); onStairs(S, o);
        break;
      }
      case 'crawl': { const q = W.objs[o.link]; S.busy = C.VENT_T; S.bf = q.f; S.bx = q.x; S.x = o.x; S.vent = true; S.ev.push({ e: 'vent' }); break; }
      case 'start': S.power = true; S.genN = C.GEN_PULSES; S.genT = 0; S.ev.push({ e: 'gen', x: o.x }); break;
      case 'radio': S.radT = C.RADIO_DELAY; S.ev.push({ e: 'radio' }); break;
    }
  }
  function ping(W, S) {
    S.sl--; S.su++; S.scd = C.SONAR_CD;
    for (let i = 0; i < W.vents.length; i++) {
      const v = W.vents[i];
      if (v.hidden && v.f === S.f && Math.abs(v.x - S.x) <= C.SONAR_R) S.rev |= 1 << v.bit;
    }
    S.ev.push({ e: 'ping', f: S.f, x: S.x });
    noise(W, S, S.f, S.x, C.N_SONAR, 'sonar');
  }
  /* 1 star for finishing, 1 for staying within the sonar par, 1 for never being detected (chase levels: for escaping within the time limit). */
  function stars(W, S) { return 1 + (S.su <= W.par ? 1 : 0) + ((W.chase ? S.t <= W.parTime : !S.det) ? 1 : 0); }

  return { DT, C, AIC, ROAM, INVESTIGATE, SEARCH, HUNT, RETURN, STATE_NAMES, TYPES, parse, route, init, clone, step, target, doorOpen, doorBetween, stars };
})();
