/* ============================================================
   game.js — game state, main loop, input, physics, abilities,
   collisions, rendering. UI (DOM) lives in ui.js.
   States: MENU | PLAY | PAUSE | DYING | OVER | WIN
   Modes : 'journey' (100 levels, one planet each) | 'endless'
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, U = G.U, V = G.view, E = G.E, FX = E.fx, DT = G.Data, D = G.Storage.data, A = G.Audio;
  const { clamp, lerp, rand, pick, smooth, TAU } = U;
  const PX_M = G.PX_M, CP_EVERY = 2500;
  const cv = document.getElementById('c'), ctx = cv.getContext('2d'), app = document.getElementById('app');

  let T = 0, state = 'MENU', run = null, timeScale = 1, shakeV = 0, flashRed = 0, bgA = 0, menuT = 0, lastSave = 0, lastOpts = null;
  const char = { x: 200, y: 500, y0: 500, r: 26, hitR: 20, baseX: 200, sway: 0, flash: 0, lean: 0, off: { x: 0, y: 0, vx: 0, vy: 0 }, def: null };
  const shield = { x: 200, y: 400, vx: 0, vy: 0, r: 25, rr: 25, repel: 1, speed: 1, pulse: 0 };
  const input = { tx: 200, ty: 400, pid: null, ox: 0, oy: 0, keys: {}, padStart: false };
  G.fxQ = 1; G.paused = 0; G.heroX = () => char.baseX;

  /* ---------------- sizing / stats ---------------- */
  function resize() {
    const r = app.getBoundingClientRect();
    V.W = r.width; V.H = r.height; V.dpr = Math.min(window.devicePixelRatio || 1, G.lowDpr ? 1.25 : 2);
    cv.width = Math.round(V.W * V.dpr); cv.height = Math.round(V.H * V.dpr); ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    V.S = clamp(Math.min(V.W / 420, V.H / 760), .78, 1.25);
    char.baseX = V.W / 2; char.y0 = V.H * .76; applyStats(); G.World.build();
  }
  function applyStats() {
    const def = DT.char(D.chars.sel), sLv = D.up.shield; char.def = def;
    char.r = 26 * V.S * def.size; char.hitR = char.r * .76;
    shield.r = 25 * V.S * def.shield * (1 + .08 * sLv); shield.repel = 1 + .12 * sLv; shield.speed = def.speed;
    if (state !== 'PLAY') shield.rr = shield.r;
  }
  G.applyStats = applyStats;

  /* ---------------- difficulty curve ---------------- */
  const diff = eff => clamp(1 - Math.exp(-eff / 6000), 0, 1);
  const baseRise = eff => Math.min(360, 100 + 230 * diff(eff) + Math.max(0, (eff - 12000) / 1000) * 6);
  const effOf = r => (r.mode === 'journey' ? r.base : 0) + r.dist;
  const worldA = r => r.mode === 'journey' ? (r.info.planet.type === 'earth' ? r.dist / r.goal * 6400 : 3000 + r.dist / r.goal * 7000) : r.dist;
  function skinZone(r) {
    if (r.mode === 'journey') return G.Levels.skinZone(r.info, r.dist);
    const z = G.World.zoneAt(r.dist); if (z.key === 'sky' || z.key === 'upper' || z.key === 'space') return z.key;
    const th = G.World.themeAt(r.dist); return th ? th.kind : 'space';
  }

  /* ---------------- run lifecycle ---------------- */
  function startRun(opts) {
    opts = opts || lastOpts || { mode: 'endless' }; lastOpts = opts; A.init(); applyStats();
    const mode = opts.mode === 'journey' ? 'journey' : 'endless', level = mode === 'journey' ? U.clamp(opts.level | 0 || 1, 1, 100) : 0;
    const info = mode === 'journey' ? G.Levels.info(level) : null, startDist = opts.startDist || 0;
    const lv = D.up.life, maxLives = 3 + (lv >= 1 ? 1 : 0) + (lv >= 3 ? 1 : 0);
    run = {
      mode, level, info, goal: info ? info.goal : 0, base: info ? info.base : 0, startDist, dist: startDist, distPx: startDist * PX_M, rise: 100,
      t: 0, lives: maxLives, maxLives, coins: 0, invuln: 0, invisT: 0, slowT: 0, dashT: 0, boostT: 0, magT: 0, cd: { invis: 0, slow: 0, dash: 0 }, cdMax: { invis: 1, slow: 1, dash: 1 },
      gunT: 0, aim: -Math.PI / 2, recoil: 0, spawned: 0, sinceSpawn: 0, nextGap: 430 * V.S, combo: 0, comboT: 0, nearT: 0, nextMile: DT.nextMile(startDist),
      zoneKey: '', reviveUsed: false, dead: false, deadT: 0, won: false, winT: 0, startBest: mode === 'endless' ? D.endless.best : 0, bonks: 0, hint: -1,
      cp: startDist, cpAt: 0, launchT: startDist === 0 ? 1.5 : 0, milesShown: 0
    };
    G.Diff.begin(run);
    if (mode === 'journey') run.cpAt = run.startDist < run.goal * .5 ? Math.round(run.goal * .5) : 0;
    else run.cpAt = (Math.floor(startDist / CP_EVERY) + 1) * CP_EVERY;
    run.rise = baseRise(effOf(run));
    if (D.boostNext) { run.boostT = 12; D.boostNext = false; }
    D.runs++; G.Storage.save();
    E.clearAll(); E.lastPat = ''; E.theme = null; E.zone = 'sky';
    G.World.setLevelTheme(info && info.planet.th ? info.planet.th : null); G.World.build();
    char.x = char.baseX; char.y = run.launchT > 0 ? V.H * .9 : char.y0; char.sway = 0; char.flash = 0; char.off.x = char.off.y = char.off.vx = char.off.vy = 0;
    shield.x = V.W / 2; shield.y = char.y0 - 95 * V.S; shield.vx = shield.vy = 0; shield.rr = shield.r; shield.pulse = 0;
    input.tx = shield.x; input.ty = shield.y; timeScale = 1; shakeV = 0; flashRed = 0; bgA = run.dist;
    state = 'PLAY'; A.setZone(0);
    G.UI.onRunStart(run);
  }
  function endSave() { G.Storage.save(); lastSave = T; }

  function finishStats() {
    const r = run; G.Diff.end(r);
    D.best = Math.max(D.best, r.dist);
    if (r.mode === 'endless') { D.endless.best = Math.max(D.endless.best, r.dist); if (r.dist >= 50) G.Backend.submit('endless', r.dist, 0); }
    endSave();
  }
  function die() {
    if (run.dead) return;
    run.dead = true; run.deadT = 0; state = 'DYING';
    A.over(); shake(14); U.vibrate([80, 40, 120]);
    FX.burst(char.x, char.y, '#fb7185', 46, 1.4);
    for (let i = 0; i < 16; i++) { const a = rand(0, TAU); FX.part('dot', char.x, char.y, Math.cos(a) * rand(60, 380), Math.sin(a) * rand(60, 380), rand(.5, 1), rand(2, 5), '#fff', { grav: 300, scroll: .4 }); }
    finishStats();
  }
  function win() {
    const r = run; r.won = true; r.winT = 0; state = 'WIN';
    for (const o of E.obs) if (o.on) E.destroy(o, true);
    E.timers.length = 0; A.checkpoint && A.checkpoint(); A.mile(); shake(6);
    const st = G.Levels.stars(r.hits), rew = G.Levels.reward(r.level, st), J = D.journey;
    r.winData = { stars: st, reward: rew, level: r.level, prevStars: J.stars[r.level] || 0, hasNext: r.level < 100 };
    J.stars[r.level] = Math.max(J.stars[r.level] || 0, st); J.unlocked = Math.min(100, Math.max(J.unlocked, r.level + 1)); delete J.cp[r.level];
    D.coins += rew; r.coins += rew; D.best = Math.max(D.best, r.dist);
    G.Diff.end(r); G.Backend.submit('journey', G.Levels.totalStars(), r.level); endSave();
    for (let i = 0; i < 5; i++) setTimeout(() => FX.burst(rand(60, V.W - 60), rand(V.H * .2, V.H * .6), pick(['#fde047', '#67e8f9', '#f472b6', '#a3e635']), 26, 1.1), i * 180);
  }
  function revive() {
    run.reviveUsed = true; run.dead = false; run.lives = Math.min(run.maxLives, 2); run.invuln = 3; flashRed = 0;
    for (const o of E.obs) { if (!o.on) continue; if (Math.hypot(o.x - char.x, o.y - char.y) < 380 * V.S) { if (o.shootable) E.destroy(o, true); else o.ghost = 3; } }
    FX.ring(char.x, char.y, '#fde047', 120); FX.ring(char.x, char.y, '#fff', 60);
    A.revive(); state = 'PLAY'; G.UI.onRevive(run);
  }
  function toMenu() {
    state = 'MENU'; run = null; E.clearAll(); timeScale = 1; shakeV = 0; flashRed = 0; G.World.setLevelTheme(null);
    char.off.x = char.off.y = 0; applyStats(); G.UI.onMenu(); G.Storage.save();
  }
  function pause() { if (state !== 'PLAY') return; state = 'PAUSE'; G.Storage.save(); G.UI.onPause(true); }
  function resume() { if (state !== 'PAUSE') return; state = 'PLAY'; G.UI.onPause(false); }
  function shake(m) { if (D.settings.shake) shakeV = Math.min(16, Math.max(shakeV, m)); }
  G.Game = { shake };

  /* ---------------- hits / collisions ---------------- */
  function hurt(o) {
    run.lives--; run.invuln = 1.5; char.flash = .35; flashRed = 1; shake(9); A.hurt(); U.vibrate(60); G.Diff.onHit(run);
    const ox = char.x - o.x; char.off.vx = ox > 0 ? 260 : -260; char.off.vy = 420 * V.S;
    FX.burst(char.x, char.y, '#fb7185', 18, .9); FX.pop(char.x, char.y - char.r - 16, '-1 ❤', '#fb7185', 22);
    if (o.shootable) E.destroy(o, false); else o.ghost = 2;
    if (run.lives <= 0) die();
  }
  function shieldVsObs(o) {
    if (o.ghost > 0) return;
    const hit = E.circleVs(o, shield.x, shield.y, shield.rr);
    if (!hit) return;
    const nx = hit.nx, ny = hit.ny, rise = run.rise * (run.dashT > 0 ? 2.2 : 1);
    o.x -= nx * (hit.pen + .6); o.y -= ny * (hit.pen + .6); if (o.type === 1) E.updateWV(o);
    let ovx = o.vx, ovy = o.vy + rise;
    const vn = (ovx - shield.vx) * nx + (ovy - shield.vy) * ny;
    const inv = 1 / (.55 + .45 * o.mass), boost = run.boostT > 0 ? 1.5 : 1;
    if (vn > 0) { const dv = (1 + .9) * vn * inv; ovx -= nx * dv; ovy -= ny * dv; }                       // REPEL: reflect the approach velocity...
    const pushV = 300 * shield.repel * boost * inv, s = ovx * nx + ovy * ny;
    if (s > -pushV) { ovx += nx * (-pushV - s); ovy += ny * (-pushV - s); }                               // ...and guarantee a minimum push-away speed
    ovx += shield.vx * .32; ovy += shield.vy * .32;
    const sp = Math.hypot(ovx, ovy); if (sp > 1000) { ovx *= 1000 / sp; ovy *= 1000 / sp; }
    o.vx = ovx; o.vy = ovy - rise;
    o.va = clamp(o.va + (rand(-1, 1) * 3 + (-ny * ovx + nx * ovy) * .004) / (o.mass + .5), -9, 9);
    if (o.hitCd <= 0) {
      o.hitCd = .14; o.flash = 1; run.bonks++; shield.pulse = 1; G.Diff.onBonk(run);
      if (o.beh === 'orbit') o.beh = ''; else if (o.beh) o.stun = .7;
      const cx = shield.x - nx * shield.rr, cy = shield.y - ny * shield.rr;
      FX.sparks(cx, cy, '#fff', 7, -nx, -ny); FX.ring(shield.x, shield.y, 'rgba(255,255,255,.8)', shield.rr * .9);
      A.bonk(o.mass); shake(clamp(1 + Math.abs(vn) * .003, 1, 3.5)); if (o.mass > 1.2) U.vibrate(8);
      if (o.kind === 'rock' && o.gen === 0 && Math.abs(vn) > 380) E.destroy(o, false);
    }
  }
  function heroVsObs(o) {
    if (o.ghost > 0) return;
    const hx = char.x + char.off.x, hy = char.y + char.off.y;
    if (!E.circleVs(o, hx, hy, char.hitR)) return;
    if (run.dashT > 0) { if (o.shootable) E.destroy(o, true); else o.ghost = .6; return; }
    if (run.invisT > 0 || run.invuln > 0) return;
    o.nmDone = true; hurt(o);
  }
  function pairs() {
    const a = E.obs, n = a.length;
    for (let i = 0; i < n; i++) {
      const p = a[i]; if (!p.on || p.type !== 0 || p.beh) continue;
      for (let j = i + 1; j < n; j++) {
        const q = a[j]; if (!q.on || q.type !== 0 || q.beh) continue;
        const dx = q.x - p.x, dy = q.y - p.y, m = p.r + q.r; if (dx > m || dx < -m || dy > m || dy < -m) continue;
        const d2 = dx * dx + dy * dy; if (d2 >= m * m || d2 < 1e-4) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (m - d) * .5;
        p.x -= nx * ov; p.y -= ny * ov; q.x += nx * ov; q.y += ny * ov;
        const vn = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
        if (vn < 0) { const j2 = -1.6 * vn / (1 / p.mass + 1 / q.mass); p.vx -= j2 * nx / p.mass; p.vy -= j2 * ny / p.mass; q.vx += j2 * nx / q.mass; q.vy += j2 * ny / q.mass; }
      }
    }
  }

  /* ---------------- abilities / pickups ---------------- */
  function ability(id) {
    if (state !== 'PLAY') return;
    const lv = D.up[id]; if (!lv || run.cd[id] > 0) return;
    if (id === 'invis') { run.invisT = G.T.invisDur[lv]; run.cd.invis = run.cdMax.invis = G.T.invisCd[lv]; A.ability(); FX.ring(char.x, char.y, '#c4b5fd', 70); }
    else if (id === 'slow') { run.slowT = G.T.slowDur[lv]; run.cd.slow = run.cdMax.slow = G.T.slowCd[lv]; A.ability(); }
    else if (id === 'dash') { run.dashT = G.T.dashDur[lv]; run.cd.dash = run.cdMax.dash = G.T.dashCd[lv]; A.dash(); shake(6); U.vibrate(25); }
  }
  function collectPick(p) {
    p.on = false; A.power(); FX.ring(p.x, p.y, '#fde047', 50);
    if (p.kind === 'heart') { if (run.lives < run.maxLives) { run.lives++; FX.pop(p.x, p.y - 20, '+1 ❤', '#fb7185', 20); } else addCoins(10, p.x, p.y); }
    else if (p.kind === 'boost') { run.boostT = 8; FX.pop(p.x, p.y - 20, 'SHIELD BOOST', '#fde047', 17); }
    else if (p.kind === 'magnet') { run.magT = 7; FX.pop(p.x, p.y - 20, 'MAGNET', '#67e8f9', 17); }
    else if (p.kind === 'ghost') { run.invisT = Math.max(run.invisT, 3); FX.pop(p.x, p.y - 20, 'GHOST', '#c4b5fd', 17); }
  }
  function addCoins(n, x, y) { run.coins += n; D.coins += n; if (x != null) FX.pop(x, y - 8, '+' + n, '#fde047', n > 4 ? 20 : 16); }
  G.Game.ability = ability;

  /* ---------------- input ---------------- */
  function ptr(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function setTarget(p) { input.tx = clamp(p.x + input.ox, shield.r, V.W - shield.r); input.ty = clamp(p.y + input.oy, shield.r, V.H - shield.r); }
  cv.addEventListener('pointerdown', e => {
    A.init();
    if (state === 'MENU') { const p = ptr(e); FX.burst(p.x, p.y, '#fbbf24', 22, .9); A.boom(); return; }
    if (state !== 'PLAY') return;
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const p = ptr(e); input.pid = e.pointerId;
    if (e.pointerType === 'mouse') { input.ox = 0; input.oy = 0; }
    else { let ox = shield.x - p.x, oy = shield.y - p.y; if (Math.hypot(ox, oy) > 130 * V.S) { ox = 0; oy = -62 * V.S; } input.ox = ox; input.oy = oy; }
    setTarget(p);
  });
  cv.addEventListener('pointermove', e => { if (state !== 'PLAY') return; if (e.pointerType === 'mouse') { input.ox = 0; input.oy = 0; setTarget(ptr(e)); } else if (e.pointerId === input.pid) setTarget(ptr(e)); });
  const endPtr = e => { if (e.pointerId === input.pid) input.pid = null; };
  cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
  addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA/.test((e.target.tagName || ''))) return;
    const k = e.key.toLowerCase();
    if (k === 'escape' || k === 'p') { if (state === 'PLAY') pause(); else if (state === 'PAUSE') resume(); return; }
    input.keys[k] = true;
    if (k === '1' || k === 'q') ability('invis'); if (k === '2' || k === 'e') ability('slow'); if (k === '3' || k === ' ') ability('dash');
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) && state === 'PLAY') e.preventDefault();
  });
  addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
  function poll(dt) {
    const K = input.keys; let ax = 0, ay = 0;
    if (K['arrowleft'] || K['a']) ax--; if (K['arrowright'] || K['d']) ax++; if (K['arrowup'] || K['w']) ay--; if (K['arrowdown'] || K['s']) ay++;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const gx = gp.axes[0] || 0, gy = gp.axes[1] || 0; if (Math.abs(gx) > .15) ax += gx; if (Math.abs(gy) > .15) ay += gy;
      for (const [b, dx, dy] of [[14, -1, 0], [15, 1, 0], [12, 0, -1], [13, 0, 1]]) if (gp.buttons[b] && gp.buttons[b].pressed) { ax += dx; ay += dy; }
      if (gp.buttons[0] && gp.buttons[0].pressed && !input.a) ability('dash'); input.a = !!(gp.buttons[0] && gp.buttons[0].pressed);
      const st = gp.buttons[9] && gp.buttons[9].pressed; if (st && !input.padStart) pause(); input.padStart = !!st;
    }
    if (ax || ay) { const m = Math.hypot(ax, ay) || 1; input.ox = 0; input.oy = 0; input.tx = clamp(input.tx + ax / m * 720 * V.S * dt * Math.min(1, m), shield.r, V.W - shield.r); input.ty = clamp(input.ty + ay / m * 720 * V.S * dt * Math.min(1, m), shield.r, V.H - shield.r); }
  }
  function moveShield(dt) {
    const ox = shield.x, oy = shield.y, dx = input.tx - shield.x, dy = input.ty - shield.y, dist = Math.hypot(dx, dy);
    if (dist > .01) { let step = dist * (1 - Math.exp(-30 * shield.speed * dt)); step = Math.min(step, 2800 * V.S * shield.speed * dt); shield.x += dx / dist * step; shield.y += dy / dist * step; }
    shield.vx = (shield.x - ox) / dt; shield.vy = (shield.y - oy) / dt;
  }

  /* ---------------- main update ---------------- */
  const HINTS = [[.5, '👆 Drag to move your shield — bonk obstacles away!', 5], [6.5, 'Collect 🪙 coins to buy upgrades', 4.5], [12, "Don't let anything touch your hero ❤", 4.5], [30, '', 0]];
  function stepPlay(dt) {
    const r = run; r.t += dt;
    timeScale += ((r.slowT > 0 ? .45 : 1) - timeScale) * Math.min(1, dt * 7);
    const wdt = dt * timeScale; poll(dt);
    r.invuln = Math.max(0, r.invuln - dt); r.invisT = Math.max(0, r.invisT - dt); r.slowT = Math.max(0, r.slowT - dt); r.dashT = Math.max(0, r.dashT - dt);
    r.boostT = Math.max(0, r.boostT - dt); r.magT = Math.max(0, r.magT - dt); r.comboT -= dt; if (r.comboT <= 0) r.combo = 0; r.nearT = Math.max(0, r.nearT - dt);
    for (const k in r.cd) r.cd[k] = Math.max(0, r.cd[k] - dt);
    char.flash = Math.max(0, char.flash - dt); flashRed = Math.max(0, flashRed - dt * 2.2); shield.pulse = Math.max(0, shield.pulse - dt * 6); r.recoil = Math.max(0, r.recoil - dt * 40);
    const wantR = shield.r * (r.boostT > 0 ? 1.4 : 1); shield.rr += (wantR - shield.rr) * Math.min(1, dt * 10);
    G.Diff.tick(r, dt);

    // ---- distance: real-time only; speed ramps gradually, Dash is the only temporary boost ----
    const eff = effOf(r), mod = G.Diff.mod(r);
    r.rise += (baseRise(eff) * (.9 + .1 * mod) - r.rise) * Math.min(1, dt * 1.5);
    const rise = r.rise * (r.dashT > 0 ? 2.2 : 1);
    r.distPx += rise * wdt; r.dist = r.distPx / PX_M;
    if (r.mode === 'endless' && r.dist > D.endless.best) D.endless.best = r.dist;
    if (r.dist > D.best) D.best = r.dist;

    // ---- launch from the ground (first 1.5 s) ----
    if (r.launchT > 0) { r.launchT -= dt; const k = 1 - Math.max(0, r.launchT) / 1.5; char.y = lerp(V.H * .9, char.y0, 1 - Math.pow(1 - k, 3)); if (r.launchT <= 0) char.y = char.y0; }

    // ---- checkpoints / milestones / zone banners ----
    if (r.cpAt && r.dist >= r.cpAt) {
      r.cp = r.cpAt;
      if (r.mode === 'journey') { D.journey.cp[r.level] = Math.round(r.cp); r.cpAt = 0; } else { D.endless.cp = Math.max(D.endless.cp, r.cp); r.cpAt += CP_EVERY; }
      A.checkpoint(); G.UI.banner('⚑ CHECKPOINT', r.mode === 'journey' ? 'Saved — retry from here if you fall' : U.fmt(r.cp) + ' m saved'); G.UI.flash('#fde047'); endSave(); FX.ring(char.x, char.y, '#fde047', 90);
    }
    if (r.mode === 'endless' && r.dist >= r.nextMile) { const b = DT.mileBonus(r.nextMile); addCoins(b); G.UI.banner('🏁 ' + U.fmt(r.nextMile) + ' m', '+' + b + ' 🪙 milestone bonus'); A.mile(); r.nextMile = DT.nextMile(r.dist); }
    if (r.mode === 'endless') {
      const z = G.World.zoneAt(r.dist);
      if (z.key !== r.zoneKey) { const first = !r.zoneKey; r.zoneKey = z.key; if (!first || r.dist > 0) { A.zone(); A.setZone(z.n); G.UI.banner('Entering: ' + z.name, z.sub); G.UI.flash('#fff'); } }
    } else if (!r.won && r.dist >= r.goal) { win(); return; }
    else { const p = r.dist / r.goal; if (!r.say80 && p > .85) { r.say80 = true; G.UI.banner('Almost there!', Math.ceil(r.goal - r.dist) + ' m to go'); } }

    // ---- spawning: gap shrinks with difficulty & flow; first 30 s are extra roomy ----
    const d = diff(eff), dPat = clamp(d * mod, 0, 1), ease = lerp(1.6, 1, smooth(r.t / 30));
    if (r.launchT <= 0) r.sinceSpawn += rise * wdt;
    if (r.sinceSpawn >= r.nextGap) {
      r.sinceSpawn = 0; E.zone = skinZone(r);
      E.theme = r.mode === 'journey' ? (r.info.planet.th || null) : G.World.themeAt(r.dist);
      const used = E.spawnWave(r, dPat, eff); r.spawned++;
      E.spawnCoins(-60 * V.S - used * .4);
      const pr = .08 + D.up.life * .012 + r.assist * .06;
      if (Math.random() < pr && r.t > 20) E.spawnPick(r.lives < r.maxLives && Math.random() < .45 + D.up.life * .05 ? 'heart' : pick(['boost', 'magnet', 'ghost']), rand(40, V.W - 40), -120 * V.S - used * Math.random());
      r.nextGap = used + lerp(400, 165, d) * V.S * ease / (.7 + .3 * mod) * rand(.9, 1.15);
    }
    for (let i = E.timers.length - 1; i >= 0; i--) {
      const t = E.timers[i]; t.t -= wdt;
      if (t.t <= 0) { E.zone = skinZone(r); if (t.kind === 'dart') E.spawnDart(t.x, t.d); else if (t.kind === 'sweep') E.spawnSweeper(t.dir, t.y, t.d); else if (t.kind === 'missile') E.spawnMissile(t.x, t.d); E.timers.splice(i, 1); }
    }

    // ---- hero: sway + knockback spring ----
    char.sway += dt * 2.4; const ob = char.off; ob.vx += (-ob.x * 60 - ob.vx * 8) * dt; ob.vy += (-ob.y * 60 - ob.vy * 8) * dt; ob.x += ob.vx * dt; ob.y += ob.vy * dt;
    char.lean = clamp(Math.cos(char.sway) * .5 + ob.vx * .004, -1, 1); char.x = char.baseX + Math.sin(char.sway) * 12 * V.S;

    // ---- physics with sub-steps (a fast shield can't tunnel through small objects) ----
    const sub = 3, sdt = dt / sub, wsdt = wdt / sub;
    for (let s = 0; s < sub; s++) { moveShield(sdt); stepObs(wsdt, rise); if (run.dead || state !== 'PLAY') return; }
    pairs();
    for (const o of E.obs) {
      if (!o.on) continue;
      if ((o.entered && o.y < -300) || o.y > V.H + 320 || o.y < -2600 || (o.noWall && (o.x < -170 || o.x > V.W + 170))) o.on = false;
    }

    // ---- shield gun (turret on the shield aims at the nearest threat) ----
    const rate = G.T.gunRate[D.up.gun], tg = D.up.gun > 0 ? findTarget() : null;
    if (D.up.gun > 0) { const want = tg ? Math.atan2(tg.y - shield.y, tg.x - shield.x) : -Math.PI / 2; let da = want - r.aim; da = Math.atan2(Math.sin(da), Math.cos(da)); r.aim += da * Math.min(1, dt * 14); }
    if (rate > 0) { r.gunT -= wdt; if (r.gunT <= 0) { if (tg) { fire(tg); r.gunT = 1 / rate; } else r.gunT = .12; } }
    stepBullets(dt);

    // ---- coins / pickups ----
    const magR = (r.magT > 0 ? 600 : G.T.magnet[D.up.magnet]) * V.S, hx = char.x + ob.x, hy = char.y + ob.y;
    for (const c of E.coins) {
      if (!c.on) continue;
      c.ph += dt * 6; c.vy *= Math.pow(.2, dt); c.y += (rise + c.vy) * wdt;
      const dx = hx - c.x, dy = hy - c.y, dd = Math.hypot(dx, dy);
      if (dd < magR && dd > 1) { const pull = (1 - dd / magR) * 520 + 120; c.x += dx / dd * pull * dt; c.y += dy / dd * pull * dt; }
      if (dd < char.r + c.r || Math.hypot(shield.x - c.x, shield.y - c.y) < shield.rr + c.r) { c.on = false; r.combo++; r.comboT = 1.3; addCoins(c.val, c.x, c.y); A.coin(r.combo); FX.coin(c.x, c.y); G.UI.flyCoin(c.x, c.y); if (r.combo >= 5 && r.combo % 5 === 0) FX.pop(hx, hy - char.r - 30, 'x' + r.combo + ' COMBO!', '#fb923c', 20); }
      else if (c.y > V.H + 40) c.on = false;
    }
    for (const p of E.picks) {
      if (!p.on) continue;
      p.y += rise * wdt; const dd = Math.hypot(hx - p.x, hy - p.y), ds = Math.hypot(shield.x - p.x, shield.y - p.y);
      if (dd < char.r + p.r || ds < shield.rr + p.r) collectPick(p); else if (p.y > V.H + 40) p.on = false;
    }

    // ---- tutorial hints (journey level 1 / first endless run) ----
    if (!D.tut) { let h = -1; for (let i = 0; i < HINTS.length; i++) if (r.t >= HINTS[i][0] && r.t < HINTS[i][0] + HINTS[i][2]) h = i; if (h !== r.hint) { r.hint = h; G.UI.hint(h >= 0 ? HINTS[h][1] : ''); } if (r.t > 32) { D.tut = true; G.UI.hint(''); } }

    FX.trail(char.def.trail, hx, hy, char.r, dt); if (r.dashT > 0) FX.trail('streak', hx, hy, char.r, dt * 2);
    FX.update(wdt, rise); G.World.update(wdt, rise, worldA(r)); bgA = r.dist;
    shakeV *= Math.exp(-9 * dt);
    if (T - lastSave > 10) endSave();
    G.UI.hud(r);
  }

  function stepObs(sdt, rise) {
    const hx = char.x + char.off.x, hy = char.y + char.off.y;
    for (const o of E.obs) {
      if (!o.on) continue;
      o.t += sdt; o.hitCd = Math.max(0, o.hitCd - sdt); o.flash = Math.max(0, o.flash - sdt * 5); o.ghost = Math.max(0, o.ghost - sdt); o.stun = Math.max(0, o.stun - sdt);
      if (o.beh === 'orbit') { o.ang += o.om * sdt; o.cy0 += (o.cvy + rise) * sdt; o.x = o.cx0 + Math.cos(o.ang) * o.R; o.y = o.cy0 + Math.sin(o.ang) * o.R; o.vx = -Math.sin(o.ang) * o.R * o.om; o.vy = Math.cos(o.ang) * o.R * o.om + o.cvy; }
      else {
        if (o.beh === 'zig' && o.stun <= 0) { const tv = Math.cos(o.t * o.freq) * o.amp * o.freq; o.vx += (tv - o.vx) * Math.min(1, sdt * 6); }
        else if (o.beh === 'home' && o.stun <= 0) { const want = clamp((char.x - o.x) * 1.4, -o.homeMax, o.homeMax); o.vx += (want - o.vx) * Math.min(1, sdt * 2.2); }
        o.x += o.vx * sdt; o.y += (o.vy + rise) * sdt; o.a += o.va * sdt;
        if (o.damp !== 1) o.vx *= Math.pow(o.damp, sdt);
        o.va += (o.spin - o.va) * (1 - Math.pow(.35, sdt));
        if (!o.noWall) { const wr = o.wallHalf; if (o.x - wr < 0) { o.x = wr; o.vx = Math.abs(o.vx) * o.wallE; } else if (o.x + wr > V.W) { o.x = V.W - wr; o.vx = -Math.abs(o.vx) * o.wallE; } }
      }
      if (o.type === 1) E.updateWV(o);
      if (!o.entered && o.y > -20) o.entered = true;
      shieldVsObs(o); if (!o.on) continue;
      heroVsObs(o); if (run.dead) return;
      if (!o.nmDone && o.entered) {                                      // NEAR MISS: shave past the hero without touching
        const dd = Math.hypot(o.x - hx, o.y - hy); if (dd < o.minD) o.minD = dd;
        if (o.y > hy + char.hitR + o.r + 8) { o.nmDone = true; if (o.minD < char.hitR + o.r + 14 && run.nearT <= 0 && run.invisT <= 0 && run.dashT <= 0 && run.invuln <= 0) { run.nearT = .9; addCoins(2, hx, hy - 30); FX.pop(hx, hy - char.r - 20, 'NEAR MISS!', '#67e8f9', 15); run.flow = Math.min(1, run.flow + .01); } }
      }
    }
  }

  /* ---------------- shield gun ---------------- */
  function findTarget() {
    let best = null, bd = 1e9; const hx = char.x, hy = char.y;
    for (const o of E.obs) { if (!o.on || !o.shootable || !o.entered || o.y > hy + 60 || o.ghost > 0) continue; const dd = Math.hypot(o.x - hx, o.y - hy); if (dd < 560 * V.S && dd < bd) { bd = dd; best = o; } }
    return best;
  }
  function fire(tg) {
    const b = E.take(E.bullets); if (!b) return;
    const dx = tg.x - shield.x, dy = tg.y - shield.y, d = Math.hypot(dx, dy) || 1, sp = 820 * V.S, lv = D.up.gun;
    b.x = shield.x + dx / d * shield.rr * .8; b.y = shield.y + dy / d * shield.rr * .8; b.vx = dx / d * sp; b.vy = dy / d * sp; b.life = 1.2; A.gun(); run.recoil = 5 * V.S;
    FX.part('dot', b.x, b.y, dx / d * 80, dy / d * 80, .12, 4 + lv * .6, '#fde047', {});
  }
  function stepBullets(dt) {
    for (const b of E.bullets) {
      if (!b.on) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > V.W + 20 || b.y < -20 || b.y > V.H + 20) { b.on = false; continue; }
      for (const o of E.obs) {
        if (!o.on || !o.shootable || !o.entered || o.ghost > 0) continue;
        if (E.distToObs(o, b.x, b.y) < 6) { b.on = false; o.hp -= 1; o.flash = 1; FX.sparks(b.x, b.y, '#fde047', 5, -b.vx, -b.vy); if (o.hp <= 0) E.destroy(o, true); else A.bonk(.4); break; }
      }
    }
  }

  /* ---------------- menu showcase / dying / win ---------------- */
  function stepMenu(dt) {
    menuT += dt; const cy = V.H * .4;
    char.x = V.W / 2 + Math.sin(menuT * 1.3) * 12; char.y = cy + Math.sin(menuT * 2) * 7; char.sway = menuT * 2.4; char.lean = Math.cos(menuT * 1.3) * .4;
    const ox = shield.x, oy = shield.y;
    shield.x = char.x + Math.cos(menuT * 1.4) * 74 * V.S; shield.y = char.y - 66 * V.S + Math.sin(menuT * 1.9) * 24 * V.S; shield.rr = shield.r; shield.pulse = Math.max(0, shield.pulse - dt * 6);
    shield.vx = (shield.x - ox) / dt; shield.vy = (shield.y - oy) / dt;
    FX.trail(char.def.trail, char.x, char.y, char.r, dt); FX.update(dt, 90);
    bgA = 8000 - 8000 * Math.cos(menuT * .05); G.World.update(dt, 90, bgA);
  }
  function stepDying(dt) {
    const ws = dt * .5; run.deadT += dt;
    FX.update(ws, 40); G.World.update(ws, 40, worldA(run)); shakeV *= Math.exp(-9 * dt); flashRed = Math.max(0, flashRed - dt * 2);
    if (run.deadT > .85 && state === 'DYING') { state = 'OVER'; G.UI.onDeath(run); }
  }
  function stepWin(dt) {
    const r = run; r.winT += dt; char.y -= (160 + r.winT * 700) * dt; char.lean = 0;
    FX.update(dt, 120); G.World.update(dt, 160 + r.winT * 500, worldA(r)); shakeV *= Math.exp(-9 * dt);
    FX.trail(char.def.trail, char.x, char.y, char.r, dt * 3);
    if (r.winT > 1.7 && state === 'WIN') { state = 'WINSHOW'; G.UI.onWin(r); }
  }

  /* ---------------- rendering ---------------- */
  function drawObs(o) {
    const S = V.S, art = G.Art; ctx.save(); ctx.translate(o.x, o.y);
    if (o.sk && art.ROT[o.sk]) ctx.rotate(o.a);
    else if (!o.sk) ctx.rotate(o.a);
    if (o.ghost > 0) ctx.globalAlpha = .45;
    if (o.sk) {
      art.draw(ctx, o, T);
      if (o.flash > 0) { ctx.globalAlpha = o.flash * .55; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, o.r * 1.05, 0, TAU); ctx.fill(); }
      ctx.restore(); return;
    }
    if (o.glow) { ctx.globalAlpha *= .22; ctx.fillStyle = o.glow; ctx.beginPath(); ctx.arc(0, 0, (o.type ? o.r * .9 : o.r) * 1.45, 0, TAU); ctx.fill(); ctx.globalAlpha = o.ghost > 0 ? .45 : 1; }
    ctx.fillStyle = o.fill; ctx.strokeStyle = o.stroke; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    if (o.type === 0) {
      ctx.beginPath(); ctx.arc(0, 0, o.r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.arc(-o.r * .3, -o.r * .3, o.r * .28, 0, TAU); ctx.fill();
      if (o.kind === 'heavy' || o.kind === 'boulder') { ctx.strokeStyle = 'rgba(239,68,68,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, o.r * .55, 0, TAU); ctx.stroke(); }
      else if (o.kind === 'homing') { ctx.rotate(-o.a); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, o.r * .5, 0, TAU); ctx.fill(); const lx = clamp((char.x - o.x) * .02, -3, 3); ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(lx, 2, o.r * .24, 0, TAU); ctx.fill(); }
    } else {
      if (o.kind === 'dart') { ctx.fillStyle = 'rgba(239,68,68,.3)'; ctx.beginPath(); ctx.moveTo(-o.r * .5, -o.r * 3.2); ctx.lineTo(o.r * .5, -o.r * 3.2); ctx.lineTo(0, -o.r * .5); ctx.fill(); ctx.fillStyle = o.fill; }
      ctx.beginPath(); for (let i = 0; i < o.nv; i++) i ? ctx.lineTo(o.lx[i], o.ly[i]) : ctx.moveTo(o.lx[i], o.ly[i]); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (o.kind === 'laser') { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-o.hw + 4, -o.hh * .3, o.hw * 2 - 8, o.hh * .6); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-o.hw, 0, o.hh * 1.3, 0, TAU); ctx.arc(o.hw, 0, o.hh * 1.3, 0, TAU); ctx.fill(); }
      else if (o.kind === 'wall') { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-o.hw + 3, -o.hh + 3, o.hw * 2 - 6, o.hh * .5); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5; for (let x = -o.hw + 30 * S; x < o.hw; x += 30 * S) { ctx.beginPath(); ctx.moveTo(x, -o.hh); ctx.lineTo(x, o.hh); ctx.stroke(); } }
      else if (o.kind !== 'dart') { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(o.lx[0] * .7, o.ly[0] * .7); ctx.lineTo(o.lx[1] * .7, o.ly[1] * .7); ctx.lineTo(0, 0); ctx.fill(); }
    }
    if (o.flash > 0) { ctx.globalAlpha = o.flash * .7; ctx.fillStyle = '#fff'; ctx.beginPath(); if (o.type === 0) ctx.arc(0, 0, o.r, 0, TAU); else for (let i = 0; i < o.nv; i++) i ? ctx.lineTo(o.lx[i], o.ly[i]) : ctx.moveTo(o.lx[i], o.ly[i]); ctx.fill(); }
    ctx.restore();
  }
  function starPath(x, y, ro, ri, n) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = -Math.PI / 2 + i * Math.PI / n; i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.closePath(); }
  function drawParts(below) {
    for (const p of E.parts) {
      if (!p.on || p.below !== !!below) continue;
      const a = clamp(p.life / p.max, 0, 1); ctx.globalAlpha = Math.min(1, a * 1.6);
      switch (p.kind) {
        case 'dot': ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.4, p.size * (.35 + .65 * a)), 0, TAU); ctx.fill(); break;
        case 'add': ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.4, p.size * (.3 + .7 * a)), 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break;
        case 'fire': ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'hsl(' + (8 + 44 * a | 0) + ',100%,' + (42 + 18 * a | 0) + '%)'; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.4, p.size * (.3 + .7 * a)), 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break;
        case 'ring': ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.5 - .5 * a), 0, TAU); ctx.stroke(); break;
        case 'rect': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.size * .5, -p.size * .3, p.size, p.size * .6); ctx.restore(); break;
        case 'star': ctx.fillStyle = p.col; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); starPath(0, 0, p.size * (.4 + .6 * a), p.size * .45 * (.4 + .6 * a), 4); ctx.fill(); ctx.restore(); break;
        case 'text': ctx.save(); ctx.translate(p.x, p.y); ctx.font = p.size + 'px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = p.col; ctx.fillText(p.text, 0, 0); ctx.restore(); break;
        case 'pop': ctx.font = '700 ' + p.size + 'px Fredoka,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,12,40,.75)'; ctx.fillStyle = p.col; ctx.strokeText(p.text || '', p.x, p.y); ctx.fillText(p.text || '', p.x, p.y); break;
      }
    }
    ctx.globalAlpha = 1;
  }
  FX.pop = (x, y, text, col, size) => FX.part('pop', x, y, 0, -60, .9, size || 16, col || '#fde047', { scroll: .3, text });
  function drawCoin(c) {
    const w = Math.abs(Math.cos(c.ph)) * .75 + .25; ctx.save(); ctx.translate(c.x, c.y); ctx.scale(w, 1);
    ctx.fillStyle = c.val > 1 ? '#fb923c' : '#fbbf24'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, c.r * .62, 0, TAU); ctx.stroke(); ctx.restore();
  }
  const PICK = { heart: ['❤️', '#fb7185'], boost: ['🛡️', '#fde047'], magnet: ['🧲', '#67e8f9'], ghost: ['👻', '#c4b5fd'] };
  function drawPick(p) {
    const [em, col] = PICK[p.kind], pu = 1 + Math.sin(T * 6 + p.x) * .08;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pu, pu);
    ctx.globalAlpha = .3; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, p.r * 1.5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(15,23,42,.8)'; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.font = (p.r * 1.15) + 'px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(em, 0, 1); ctx.restore();
  }
  // world-anchored markers: finish line, checkpoint flag, your best altitude
  function marker(target, label, col, kind) {
    const y = char.y0 - (target - run.dist) * PX_M; if (y < -40 || y > V.H + 40) return;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = kind === 'finish' ? 6 : 3;
    if (kind === 'finish') { const n = 14, w = V.W / n; for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#111827'; ctx.fillRect(i * w, y - 6, w, 6); ctx.fillStyle = i % 2 ? '#111827' : '#fff'; ctx.fillRect(i * w, y, w, 6); } }
    else { ctx.setLineDash([12, 8]); ctx.globalAlpha = .85; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(V.W, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillRect(14, y - 40, 3, 40); ctx.beginPath(); ctx.moveTo(17, y - 40); ctx.lineTo(48, y - 30); ctx.lineTo(17, y - 20); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.font = '700 14px Fredoka,system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,12,40,.8)'; ctx.fillStyle = '#fff'; ctx.strokeText(label, V.W / 2, y - 12); ctx.fillText(label, V.W / 2, y - 12); ctx.restore();
  }
  function drawMarkers() {
    const r = run; if (r.won) return;
    if (r.mode === 'journey') { marker(r.goal, '🏁 FINISH', '#fff', 'finish'); if (r.cpAt) marker(r.cpAt, '⚑ CHECKPOINT', '#fde047'); }
    else { if (r.cpAt) marker(r.cpAt, '⚑ ' + U.fmt(r.cpAt) + ' m', '#fde047'); if (D.endless.best > r.dist + 5 && D.endless.best > 100) marker(D.endless.best, '🏆 YOUR BEST ' + U.fmt(D.endless.best) + ' m', '#f472b6'); }
  }
  function drawTelegraphs() {
    for (const t of E.timers) {
      const a = .45 + .55 * Math.abs(Math.sin(T * 14)); ctx.globalAlpha = a; ctx.fillStyle = '#ef4444';
      if (t.kind === 'dart') { const x = t.x, y = 70 * V.S; ctx.beginPath(); ctx.moveTo(x - 13, y - 14); ctx.lineTo(x + 13, y - 14); ctx.lineTo(x, y + 12); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 15px Fredoka,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y - 6); }
      else if (t.kind === 'sweep') { const x = t.dir > 0 ? 18 : V.W - 18, y = t.y, d = t.dir; ctx.beginPath(); ctx.moveTo(x + d * 16, y); ctx.lineTo(x - d * 8, y - 15); ctx.lineTo(x - d * 8, y + 15); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 15px Fredoka,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x - d * 2, y); }
      else if (t.kind === 'missile') { const x = t.x, y = V.H - 56 * V.S; ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x - 14, y + 12); ctx.lineTo(x + 14, y + 12); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 15px Fredoka,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y + 3); }
      ctx.globalAlpha = 1;
    }
  }
  function shieldDraw(x, y, rr, rn, menu) {
    const aim = menu ? -Math.PI / 2 + Math.sin(menuT * 1.7) * .9 : rn.aim, rec = menu ? Math.max(0, Math.sin(menuT * 3.4)) * 5 : rn.recoil;
    G.Shields.draw(ctx, D.shields.sel, x, y, rr, T, { boost: !menu && rn.boostT > 0, ghost: !menu && rn.invisT > 0, gun: D.up.gun, aim, recoil: rec, pulse: shield.pulse });
  }
  function render() {
    ctx.save();
    if (shakeV > .2) ctx.translate(rand(-shakeV, shakeV), rand(-shakeV, shakeV));
    if (run && state !== 'MENU') { if (run.mode === 'journey') G.World.drawLevel(run.info, run.dist, run.goal); else G.World.draw(bgA); } else G.World.draw(bgA);
    if (state === 'MENU') {
      drawParts(true);
      if (!G.UI.subOpen()) { G.Chars.draw(ctx, char.def.id, char.x, char.y, char.r * 1.35, T, { lean: char.lean }); shieldDraw(shield.x, shield.y, shield.rr, null, true); }
      drawParts(false); ctx.restore(); return;
    }
    const r = run; drawParts(true); drawMarkers();
    for (const c of E.coins) if (c.on) drawCoin(c);
    for (const p of E.picks) if (p.on) drawPick(p);
    for (const o of E.obs) if (o.on) drawObs(o);
    drawTelegraphs();
    if (char.def && state !== 'OVER' && !r.dead) {
      const hx = char.x + char.off.x, hy = char.y + char.off.y;
      let al = 1; if (r.invisT > 0) al = .35 + .15 * Math.sin(T * 12); else if (r.invuln > 0 && Math.floor(T * 14) % 2 === 0) al = .3;
      if (r.dashT > 0) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; for (let i = 0; i < 10; i++) { const lx = (i * 97 + T * 600) % V.W, ly = (i * 53 + T * 900) % V.H; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 60); ctx.stroke(); } }
      G.Chars.draw(ctx, char.def.id, hx, hy, char.r, T, { lean: char.lean, flash: char.flash, alpha: al });
      if (r.dashT > 0) { ctx.strokeStyle = 'rgba(253,224,71,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, char.r * 1.5, 0, TAU); ctx.stroke(); }
    }
    if (state === 'PLAY' || state === 'PAUSE') shieldDraw(shield.x, shield.y, shield.rr, r, false);
    for (const b of E.bullets) if (b.on) { ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, TAU); ctx.fill(); ctx.globalAlpha = .4; ctx.beginPath(); ctx.arc(b.x - b.vx * .012, b.y - b.vy * .012, 3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    drawParts(false);
    if (flashRed > 0) { const g = ctx.createRadialGradient(V.W / 2, V.H / 2, V.H * .25, V.W / 2, V.H / 2, V.H * .75); g.addColorStop(0, 'rgba(239,68,68,0)'); g.addColorStop(1, 'rgba(239,68,68,' + (.55 * flashRed) + ')'); ctx.fillStyle = g; ctx.fillRect(-20, -20, V.W + 40, V.H + 40); }
    if (r.slowT > 0 || timeScale < .9) { ctx.fillStyle = 'rgba(96,165,250,' + ((1 - timeScale) * .2) + ')'; ctx.fillRect(0, 0, V.W, V.H); }
    ctx.restore();
  }

  /* ---------------- loop (+ adaptive quality for mid-range phones) ---------------- */
  let last = 0, ema = 16, slowCount = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    let dt = (ts - last) / 1000; if (!(dt > 0)) dt = .016; last = ts;
    ema += (dt * 1000 - ema) * .05;
    if (ema > 26) slowCount++; else if (slowCount > 0) slowCount--;
    if (slowCount > 90 && G.fxQ > .5) { G.fxQ = .5; G.World.setLowFx(true); } else if (slowCount > 260 && !G.lowDpr) { G.lowDpr = true; resize(); }
    dt = Math.min(dt, .05); T += dt;
    if (!G.paused) {
      if (state === 'PLAY') stepPlay(dt); else if (state === 'MENU') stepMenu(dt); else if (state === 'DYING' || state === 'OVER') stepDying(dt); else if (state === 'WIN' || state === 'WINSHOW') stepWin(dt);
    }
    render();
  }

  Object.assign(G.Game, { start: startRun, pause, resume, toMenu, revive, restart() { startRun(lastOpts); }, char, shield, input, resize, applyStats, endSave, CP_EVERY });
  Object.defineProperty(G.Game, 'lastOpts', { get() { return lastOpts; } });
  Object.defineProperty(G.Game, 'state', { get() { return state; } });
  Object.defineProperty(G.Game, 'run', { get() { return run; } });
  G.Game.boot = function () { resize(); addEventListener('resize', resize); requestAnimationFrame(frame); };
  addEventListener('blur', () => { if (state === 'PLAY') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'PLAY') pause(); G.Storage.save(); } });
})();
