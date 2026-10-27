/* Gameplay controller: real-time snake movement on the puzzle engine.
 * The snake moves by itself every tick in its current direction; ONLY the player changes direction
 * (swipe, tap-to-turn, keyboard, optional D-pad). Nothing here ever steers the snake automatically. */
(function (S) {
  'use strict';
  const E = S.engine || window.SFREngine, G = () => S.gfx, U = S.UI;
  S.engine = E;

  const TICK_MS = 180;            // one cell per tick
  const ICE_MS = 115;             // sliding on ice is faster
  const INSTANT_TURN = 0.3;       // a turn that arrives this far into a tick is taken at once instead of waiting
  const MAX_FX = 90;
  const CONFETTI = ['#f87171', '#fbbf24', '#4ade80', '#38bdf8', '#c084fc', '#f472b6'];
  const SPECIES_COIN = { bigfruit: 5, golden: 25 };

  const P = {
    lv: null, rt: null, st: null, queue: [], acc: 0, tickMs: TICK_MS, prevF: [], k: 1,
    mode: 'idle',               // idle | run | paused | ending | dying | done
    waiting: false,             // stopped at the end of an ice strip until the player turns
    result: null, failInfo: null, fx: [], bump: null, flash: 0, exitAt: -1e9, eatAt: -1e9, growIdx: -1,
    hintCells: null, shownMoves: 0, startedAt: 0, attemptMs: 0, coinsFromFruit: 0, fruitsEaten: 0, now: 0, bumpDir: [0, 0]
  };
  S.play = P;

  // ---------- geometry ----------
  // Board position/size. Computed from the screen height so tall phones use the extra room.
  P.layout = function () {
    const W = S.W, H = S.H, dpad = S.save.data.dpad;
    const cell = Math.floor((W - 30) / 8), size = cell * 8;
    const top = 156, bottom = H - (dpad ? 236 : 116);
    const by = Math.round(top + Math.max(0, (bottom - top - size) / 2)) + 4;
    return { cell: cell, size: size, bx: Math.round((W - size) / 2), by: by, statY: by + size + 22, dpadY: H - 108 };
  };
  const cellXY = (c, L) => ({ x: L.bx + (c % 8) * L.cell + L.cell / 2, y: L.by + ((c / 8) | 0) * L.cell + L.cell / 2 });
  P.cellXY = (c) => cellXY(c, P.layout());

  // ---------- starting / restarting ----------
  P.start = function (id, opts) {
    opts = opts || {};
    const lv = S.getLevel(id);
    P.lv = lv; P.rt = S.getRT(id);
    P.st = E.newState(P.rt);
    P.queue = []; P.acc = 0; P.k = 1; P.waiting = false; P.result = null; P.failInfo = null;
    P.fx = []; P.bump = null; P.flash = 0; P.exitAt = -1e9; P.eatAt = -1e9; P.growIdx = -1; P.exitWasReady = false; P.doorAt = {}; P.gateAt = {};
    P.fruitsEaten = 0; P.coinsFromFruit = 0; P.attemptMs = 0;
    P.prevF = bodyXY(P.st.body);
    P.hintCells = opts.hint ? S.solutionCells(lv) : null;
    P.mode = 'run';
    P.tickMs = P.lv.tickMs || TICK_MS;
    if (opts.snapshot) restore(opts.snapshot);
    P.startedAt = P.now;
    if (opts.snapshot) P.mode = 'paused';
  };
  function restore(a) {
    const st = P.st;
    st.body = a.body.slice(); st.dir = a.dir.slice(); st.fruitMask = a.fruitMask; st.keyMask = a.keyMask; st.gateMask = a.gateMask;
    st.moves = a.moves; st.swLog = a.swLog; st.fruitLog = a.fruitLog;
    P.prevF = bodyXY(st.body);
    P.fruitsEaten = st.fruitLog ? st.fruitLog.split(',').filter(Boolean).length : 0;
  }
  P.snapshot = function () {
    if (!P.st || P.mode === 'done' || P.mode === 'ending' || P.mode === 'dying' || P.st.done) return null;
    const st = P.st;
    return { level: P.lv.id, body: st.body.slice(), dir: st.dir.slice(), fruitMask: st.fruitMask, keyMask: st.keyMask, gateMask: st.gateMask, moves: st.moves, swLog: st.swLog, fruitLog: st.fruitLog };
  };
  P.active = () => P.mode === 'run';
  P.pause = function () { if (P.mode === 'run') { P.mode = 'paused'; S.save.data.attempt = P.snapshot(); S.save.write(); } };
  P.resume = function () { if (P.mode === 'paused') { P.mode = 'run'; P.acc = Math.min(P.acc, P.tickMs * 0.5); } };

  // ---------- input ----------
  const opposite = E.opposite, same = E.sameDir;
  P.turn = function (d) {
    if (P.mode !== 'run') return false;
    const last = P.queue.length ? P.queue[P.queue.length - 1] : P.st.dir;
    if (same(d, last) || opposite(d, last) || P.queue.length >= 2) return false;
    P.queue.push(d);
    S.audio.sfx.swipe();
    if (!S.save.data.seen.swipe) { S.save.data.seen.swipe = 1; }
    if (P.waiting) { P.acc = P.tickMs; return true; }                      // stopped on ice: move as soon as the player turns
    // Responsive controls: if the snake is already part-way into its step, take the turn right now.
    if (P.queue.length === 1 && P.acc >= P.tickMs * INSTANT_TURN && !E.resolveDir(P.rt, P.st, null).forced) { P.acc = P.tickMs; }
    return true;
  };
  // Tap: the snake turns towards the tapped point (never anywhere else).
  P.tapTurn = function (x, y) {
    if (P.mode !== 'run') return;
    const h = cellXY(P.st.body[0], P.layout()), dx = x - h.x, dy = y - h.y;
    const horiz = [dx > 0 ? 1 : -1, 0], vert = [0, dy > 0 ? 1 : -1];
    const order = Math.abs(dx) > Math.abs(dy) ? [horiz, vert] : [vert, horiz];
    if (!P.turn(order[0])) P.turn(order[1]);
  };

  // ---------- positions for drawing ----------
  const bodyXY = (body) => body.map((c) => ({ x: c % 8, y: (c / 8) | 0 }));
  // Interpolated body points in cell coordinates (fractional). Portal jumps are not interpolated.
  P.visualCells = function () {
    const st = P.st, out = [], k = P.k;
    for (let i = 0; i < st.body.length; i++) {
      const c = st.body[i], p = P.prevF[Math.min(i, P.prevF.length - 1)];
      const cx = c % 8, cy = (c / 8) | 0;
      const jump = Math.abs(cx - p.x) + Math.abs(cy - p.y) > 1.01;
      out.push(jump || k >= 1 ? { x: cx, y: cy } : { x: p.x + (cx - p.x) * k, y: p.y + (cy - p.y) * k });
    }
    return out;
  };

  // ---------- fx ----------
  function addFx(o) { if (P.fx.length < MAX_FX) P.fx.push(o); }
  P.burst = function (x, y, color, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = (spd || 0.12) * (0.5 + Math.random() * 0.8);
      addFx({ k: 'spark', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.03, r: 2.2 + Math.random() * 2.2, color: color === 'rand' ? CONFETTI[S.rnd(CONFETTI.length)] : color, life: 460, max: 460 });
    }
  };
  P.ring = function (x, y, color, r1, ms) { addFx({ k: 'ring', x: x, y: y, r0: 8, r1: r1 || 46, color: color, life: ms || 420, max: ms || 420 }); };
  P.popText = function (x, y, s, color, size) { addFx({ k: 'text', x: x, y: y, s: s, color: color, size: size || 17, life: 800, max: 800 }); };
  P.confetti = function (x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 0.2 + Math.random() * 0.3;
      addFx({ k: 'conf', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.02, color: CONFETTI[S.rnd(CONFETTI.length)], life: 1500, max: 1500 });
    }
  };
  function updateFx(dt) {
    for (let i = P.fx.length - 1; i >= 0; i--) {
      const e = P.fx[i];
      e.life -= dt;
      if (e.life <= 0) { P.fx.splice(i, 1); continue; }
      if (e.k === 'spark' || e.k === 'conf') { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += (e.k === 'conf' ? 0.00045 : 0.0003) * dt; if (e.k === 'conf') e.rot += e.vr * dt; }
      else if (e.k === 'text') e.y -= 0.035 * dt;
    }
  }
  P.updateFx = updateFx;

  // ---------- events -> feedback ----------
  function onEvents(events, L) {
    const A = S.audio, sfx = A.sfx;
    for (const e of events) {
      const p = cellXY(e.cell !== undefined ? e.cell : P.st.body[0], L);
      if (e.t === 'fruit') {
        const sp = e.species;
        P.fruitsEaten++;
        P.coinsFromFruit += SPECIES_COIN[sp] || 1;
        P.eatAt = P.now; P.growIdx = P.st.body.length - 1;
        P.burst(p.x, p.y, 'rand', sp === 'golden' ? 16 : 9);
        P.ring(p.x, p.y, sp === 'golden' ? '#fde047' : '#ffffff', 40);
        addFx({ k: 'pop', x: p.x, y: p.y, species: sp, life: 320, max: 320 });
        P.popText(p.x, p.y - 20, '+1', '#ffffff', 18);
        P.popText(p.x + 30, p.y - 4, 'LENGTH ' + P.st.body.length, '#ffe879', 11);
        if (sp === 'golden' || sp === 'bigfruit') sfx.bonus(); else sfx.eat(P.fruitsEaten - 1);
        sfx.grow();
        A.buzz(sp === 'golden' ? 35 : 14);
      } else if (e.t === 'key') {
        P.burst(p.x, p.y, '#ffe879', 10); P.ring(p.x, p.y, '#ffe879', 42); P.popText(p.x, p.y - 22, 'KEY!', '#ffe879', 16);
        sfx.key(); A.buzz(25);
      } else if (e.t === 'door') {
        const d = cellXY(e.cell, L);
        P.burst(d.x, d.y, '#f5c969', 12, 0.1); P.ring(d.x, d.y, '#f5c969', 46, 520);
        P.popText(d.x, d.y - 26, 'DOOR OPEN', '#ffe879', 12);
        P.doorAt = P.doorAt || {}; P.doorAt[e.index] = P.now;
        sfx.door();
      } else if (e.t === 'switch') {
        P.burst(p.x, p.y, '#48d8bf', 8); P.ring(p.x, p.y, '#48d8bf', 40);
        const g = P.rt.gates[e.gate], gp = cellXY(g.cell, L);
        P.ring(gp.x, gp.y, '#48d8bf', 44, 520);
        P.gateAt = P.gateAt || {}; P.gateAt[e.gate] = P.now;
        P.popText(gp.x, gp.y - 26, e.open ? 'GATE OPEN' : 'GATE CLOSED', '#7be0d0', 12);
        sfx.toggle(); A.buzz(18);
      } else if (e.t === 'portal') {
        const a = cellXY(e.from, L), b = cellXY(e.to, L);
        P.ring(a.x, a.y, '#a58cff', 40); P.ring(b.x, b.y, '#63c9ff', 46, 520);
        P.burst(b.x, b.y, '#b7f4ff', 10);
        sfx.portal(); A.buzz(15);
      }
    }
    if (!P.exitWasReady && E.exitReady(P.rt, P.st)) {
      P.exitWasReady = true; P.exitAt = P.now;
      const x = cellXY(P.rt.exit, L);
      P.ring(x.x, x.y, '#8ef5d4', 60, 600); P.burst(x.x, x.y, '#8ef5d4', 12);
      P.popText(x.x, x.y - 30, 'EXIT OPEN!', '#8ef5d4', 14);
      S.audio.sfx.exitOpen();
    }
  }

  function delayNow() { return P.rt.ice[P.st.body[0]] ? Math.round(ICE_MS * (P.lv.tickMs || TICK_MS) / TICK_MS) : (P.lv.tickMs || TICK_MS); }

  // One tick of the snake. Returns false if the snake waited (ice stop).
  function tick(L) {
    const st = P.st, rt = P.rt;
    const rd = E.resolveDir(rt, st, null);
    let input = null;
    if (!rd.forced && P.queue.length) input = P.queue.shift();
    const before = P.visualCells();
    const wasIce = rt.ice[st.body[0]] === 1;
    const res = E.step(rt, st, input);
    if (res.status === 'wait') {
      P.waiting = true; P.acc = 0; P.k = 1; P.prevF = before;
      return false;
    }
    P.waiting = false;
    if (res.status === 'fail') { P.prevF = before; P.k = 1; onFail(res, L); return true; }
    P.prevF = before; P.k = 0;
    if (wasIce || rt.ice[st.body[0]]) { if (Math.random() < 0.5) { const h = cellXY(st.body[0], L); addFx({ k: 'spark', x: h.x, y: h.y, vx: (Math.random() - 0.5) * 0.05, vy: (Math.random() - 0.5) * 0.05, r: 2, color: '#e8fbff', life: 300, max: 300 }); } }
    if (rt.ice[st.body[0]]) S.audio.sfx.slide();
    trailPuff(L);
    onEvents(res.events, L);
    P.tickMs = delayNow();
    if (res.status === 'win') onWin(L);
    return true;
  }
  function trailPuff(L) {
    const sk = S.activeSkin(), t = P.st.body[P.st.body.length - 1];
    if (!sk.trail || P.fx.length > MAX_FX - 20) return;
    let color;
    if (sk.trail === 'rainbow') color = S.hsl(P.now * 0.35, 90, 60);
    else if (sk.trail === 'fire') color = Math.random() < 0.5 ? '#f97316' : '#fbbf24';
    else color = Math.random() < 0.5 ? '#fde68a' : '#ffffff';
    const p = cellXY(t, L);
    addFx({ k: 'spark', x: p.x + (Math.random() - 0.5) * 8, y: p.y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02, r: 3.4, color: color, life: 520, max: 520 });
  }

  function onWin(L) {
    P.mode = 'ending';
    P.endAt = P.now;
    const st = P.st, stars = E.evaluateStars(P.rt, st), lv = P.lv;
    const reward = { first: 5 + P.coinsFromFruit, replay: 1, perfect: 5 };
    P.result = Object.assign({ stars: stars, moves: st.moves, length: st.body.length, fruits: P.fruitsEaten, levelId: lv.id }, S.save.complete(lv.id, stars, reward));
    if (P.result.unlockedNew) S.screens.pendingUnlock = { level: lv.id + 1 };
    const h = cellXY(P.rt.exit, L);
    P.ring(h.x, h.y, '#8ef5d4', 70, 700); P.ring(h.x, h.y, '#ffe879', 46, 560);
    P.confetti(h.x, h.y, 34);
    S.audio.sfx.win(); S.audio.buzz(60);
  }
  function onFail(res, L) {
    P.mode = 'dying';
    P.endAt = P.now;
    const st = P.st, h = cellXY(st.body[0], L);
    P.failInfo = { reason: res.reason, cell: res.cell, level: P.lv.id };
    P.bumpDir = st.dir.slice();
    if (res.reason === 'trap') {
      const b = cellXY(res.cell, L);
      P.burst(b.x, b.y, '#fbbf24', 18, 0.18); P.burst(b.x, b.y, '#f97316', 12, 0.12); P.ring(b.x, b.y, '#fbbf24', 64, 520);
      S.audio.sfx.boom();
    } else {
      P.burst(h.x + st.dir[0] * L.cell * 0.4, h.y + st.dir[1] * L.cell * 0.4, '#ffffff', 8, 0.1);
      S.audio.sfx.fail();
    }
    S.audio.buzz(110);
    if (!S.save.data.reduced && S.scene) S.scene.cameras.main.shake(190, 0.004);
    S.save.data.attempt = null; S.save.write();
  }

  // ---------- per-frame update ----------
  P.update = function (dt, now) {
    P.now = now;
    updateFx(dt);
    if (P.mode === 'idle' || P.mode === 'paused' || P.mode === 'done') return;
    const L = P.layout();
    if (P.mode === 'run') {
      P.attemptMs += dt;
      if (!P.waiting) P.acc += dt;
      else if (P.queue.length) P.acc = P.tickMs;
      P.k = Math.min(1, P.acc / P.tickMs);
      let guard = 0;
      while (P.mode === 'run' && P.acc >= P.tickMs && guard++ < 3) {
        const ticked = tick(L);
        if (!ticked) break;
        if (P.mode === 'run') P.acc = Math.max(0, P.acc - P.tickMs);
      }
      if (P.mode === 'run') P.k = Math.min(1, P.acc / P.tickMs);
    } else if (P.mode === 'ending' || P.mode === 'dying') {
      if (P.mode === 'ending') P.k = Math.min(1, P.k + dt / 160);   // finish sliding into the exit
      if (now - P.endAt > (P.mode === 'ending' ? 700 : 760)) P.mode = 'done';
    }
  };
  P.finished = () => P.mode === 'done';

  // Shortest solution stored with each level (used for the optional rewarded hint)
  S.solutionCells = function (lv) {
    if (!lv.solution) return null;
    const rt = S.getRT(lv.id), st = E.newState(rt), cells = [st.body[0]];
    const M = { U: E.DIRS.up, D: E.DIRS.down, L: E.DIRS.left, R: E.DIRS.right };
    for (const c of lv.solution) { const r = E.step(rt, st, M[c] || null); cells.push(st.body[0]); if (r.status !== 'ok') break; }
    return cells;
  };
})(window.SFR);
