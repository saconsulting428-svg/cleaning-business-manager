/* ============================================================
   entities.js — object pools, geometry, particles/FX, obstacle
   types + wave patterns, coins and power-up pickups.
   Everything that is created often (obstacles, bullets, coins,
   particles) lives in a fixed pool: nothing is allocated while
   playing, so the garbage collector never causes frame drops.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, U = G.U, V = G.view;
  const { clamp, lerp, rand, pick, TAU } = U;
  const E = (G.E = {});

  /* ---------------- pools ---------------- */
  function mkPool(n, make) { const a = []; for (let i = 0; i < n; i++) { const o = make(); o.on = false; a.push(o); } a.cur = 0; return a; }
  function take(pool) {
    const n = pool.length;
    for (let k = 0; k < n; k++) { const i = (pool.cur + k) % n; if (!pool[i].on) { pool.cur = (i + 1) % n; pool[i].on = true; return pool[i]; } }
    return null;
  }
  E.take = take;
  E.obs = mkPool(150, () => ({ type: 0, kind: '', x: 0, y: 0, vx: 0, vy: 0, r: 10, a: 0, va: 0, spin: 0, mass: 1, e: .7, hp: 1, fill: '#fff', stroke: '#000', glow: '', nv: 0, lx: [0, 0, 0, 0], ly: [0, 0, 0, 0], wx: [0, 0, 0, 0], wy: [0, 0, 0, 0], hw: 0, hh: 0, flash: 0, hitCd: 0, entered: false, ghost: 0, beh: '', t: 0, bx: 0, amp: 0, freq: 0, stun: 0, gen: 0, damp: .5, wallHalf: 10, shootable: true }));
  E.bullets = mkPool(40, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
  E.coins = mkPool(90, () => ({ x: 0, y: 0, val: 1, r: 10, vy: 0, ph: 0 }));
  E.picks = mkPool(10, () => ({ x: 0, y: 0, kind: '', r: 16, vy: 0 }));
  E.parts = mkPool(480, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 3, col: '#fff', kind: 'dot', text: '', grav: 0, drag: 0, rot: 0, vr: 0, scroll: 0, below: false }));
  E.timers = [];                                   // delayed spawns (dart telegraphs)
  E.clearAll = () => { for (const p of [E.obs, E.bullets, E.coins, E.picks, E.parts]) for (const o of p) o.on = false; E.timers.length = 0; };

  /* ---------------- FX particles ---------------- */
  const FX = (E.fx = {});
  function part(kind, x, y, vx, vy, life, size, col, extra) {
    const p = take(E.parts); if (!p) return null;
    p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.size = size; p.col = col;
    p.grav = 0; p.drag = 0; p.rot = 0; p.vr = 0; p.scroll = 0; p.below = false; p.text = '';
    if (extra) for (const k in extra) p[k] = extra[k];
    return p;
  }
  FX.part = part;
  FX.burst = (x, y, col, n, power) => {
    n = Math.round(n * (G.fxQ || 1)); power = power || 1;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(70, 360) * power;
      part(i % 4 === 0 ? 'rect' : 'dot', x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(.35, .8), rand(2.5, 6), i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#fff' : col, { grav: 420, drag: .02, scroll: .5, vr: rand(-10, 10), rot: rand(0, 6) });
    }
  };
  FX.sparks = (x, y, col, n, nx, ny) => {
    n = Math.round(n * (G.fxQ || 1));
    for (let i = 0; i < n; i++) { const a = Math.atan2(ny, nx) + rand(-1.1, 1.1), sp = rand(80, 260); part('dot', x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(.18, .35), rand(1.5, 3), col, { drag: .05, scroll: .5 }); }
  };
  FX.ring = (x, y, col, size) => part('ring', x, y, 0, 0, .35, size, col, { scroll: .4 });
  FX.pop = (x, y, text, col, size) => part('pop', x, y, 0, -60, .9, size || 16, col || '#fde047', { scroll: .3 });
  FX.coin = (x, y) => { const n = Math.round(6 * (G.fxQ || 1)); for (let i = 0; i < n; i++) { const a = rand(0, TAU); part('star', x, y, Math.cos(a) * rand(60, 160), Math.sin(a) * rand(60, 160), .45, rand(5, 8), '#fde047', { scroll: .5, vr: rand(-8, 8) }); } };
  FX.text = (x, y, txt, size, life, vy, col) => part('text', x, y, rand(-20, 20), vy || 40, life || 1, size || 16, col || '#fff', { text: txt, scroll: .9 });

  // trail emitted behind the hero; style comes from the selected character
  let trailAcc = 0;
  FX.trail = (style, x, y, r, dt) => {
    const rates = { sparkle: 44, puff: 30, fire: 80, bubble: 15, glow: 50, streak: 70, feather: 9 };
    trailAcc += (rates[style] || 0) * dt * (G.fxQ || 1);
    while (trailAcc >= 1) {
      trailAcc -= 1; const px = x + rand(-6, 6), py = y + r * .8 + rand(0, 8);
      if (style === 'sparkle') part('star', px, py, rand(-30, 30), rand(20, 70), rand(.4, .8), rand(4, 8), pick(['#fff', '#fde68a', '#bae6fd']), { below: true, scroll: 1, vr: rand(-6, 6) });
      else if (style === 'puff') part('dot', px, py + 10, rand(-14, 14), rand(30, 60), rand(.6, 1), rand(5, 9), 'rgba(255,255,255,.55)', { below: true, scroll: .8 });
      else if (style === 'fire') part('fire', px, py, rand(-22, 22), rand(60, 150), rand(.35, .65), rand(6, 11), '#f97316', { below: true, scroll: .6 });
      else if (style === 'bubble') part('ring', px, py, rand(-26, 26), rand(0, 30), rand(1, 1.6), rand(4, 9), pick(['#bae6fd', '#fbcfe8', '#fff']), { below: true, scroll: .8, grav: -10 });
      else if (style === 'glow') part('add', px, py, rand(-45, 45), rand(10, 90), rand(.5, 1), rand(2, 4.5), 'hsl(' + pick([150, 190, 260]) + ',100%,70%)', { below: true, scroll: 1 });
      else if (style === 'streak') part('add', x + rand(-3, 3), py, 0, rand(30, 60), .55, rand(5, 7), 'rgba(255,255,255,.8)', { below: true, scroll: 1 });
      else if (style === 'feather') part('dot', px, py, rand(-30, 30), rand(10, 50), rand(.8, 1.3), rand(3, 5), pick(['#38bdf8', '#bae6fd', '#fff']), { below: true, scroll: .9, grav: 20 });
    }
  };
  FX.update = (dt, rise) => {
    for (const p of E.parts) {
      if (!p.on) continue;
      p.life -= dt; if (p.life <= 0) { p.on = false; continue; }
      p.vy += p.grav * dt;
      if (p.drag) { const k = Math.pow(1 - p.drag, dt * 60); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += (p.vy + rise * p.scroll) * dt; p.rot += p.vr * dt;
    }
  };

  /* ---------------- geometry ---------------- */
  function updateWV(o) {
    if (o.type !== 1) return;
    const c = Math.cos(o.a), s = Math.sin(o.a);
    for (let i = 0; i < o.nv; i++) { o.wx[i] = o.x + o.lx[i] * c - o.ly[i] * s; o.wy[i] = o.y + o.lx[i] * s + o.ly[i] * c; }
  }
  E.updateWV = updateWV;
  function closestOnPoly(px, py, o) {
    let bx = 0, by = 0, bd = 1e18, pos = false, neg = false; const n = o.nv;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ax = o.wx[i], ay = o.wy[i], abx = o.wx[j] - ax, aby = o.wy[j] - ay;
      const t = clamp(((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby), 0, 1);
      const cx = ax + abx * t, cy = ay + aby * t, d = (px - cx) * (px - cx) + (py - cy) * (py - cy);
      if (d < bd) { bd = d; bx = cx; by = cy; }
      if (abx * (py - ay) - aby * (px - ax) > 0) pos = true; else neg = true;
    }
    return { x: bx, y: by, d: Math.sqrt(bd), inside: !(pos && neg) };
  }
  const HIT = { nx: 0, ny: 0, pen: 0 };               // reused result object (no allocation)
  // circle (cx,cy,R) vs obstacle. returns HIT (normal points obstacle -> circle) or null
  E.circleVs = (o, cx, cy, R) => {
    if (o.type === 0) {
      const dx = cx - o.x, dy = cy - o.y, d = Math.hypot(dx, dy), m = R + o.r;
      if (d >= m) return null;
      if (d < .001) { HIT.nx = 0; HIT.ny = -1; HIT.pen = m; return HIT; }
      HIT.nx = dx / d; HIT.ny = dy / d; HIT.pen = m - d; return HIT;
    }
    if (Math.hypot(cx - o.x, cy - o.y) > R + o.r) return null;
    const c = closestOnPoly(cx, cy, o);
    if (c.inside) { const d = c.d || .001; HIT.nx = (c.x - cx) / d; HIT.ny = (c.y - cy) / d; HIT.pen = R + c.d; return HIT; }
    if (c.d >= R) return null;
    const d = c.d || .001; HIT.nx = (cx - c.x) / d; HIT.ny = (cy - c.y) / d; HIT.pen = R - c.d; return HIT;
  };
  E.distToObs = (o, px, py) => { if (o.type === 0) return Math.hypot(px - o.x, py - o.y) - o.r; if (Math.hypot(px - o.x, py - o.y) > o.r + 8) return 99; const c = closestOnPoly(px, py, o); return c.inside ? 0 : c.d; };

  /* ---------------- obstacle construction ---------------- */
  const PAL = [['#fb7185', '#9f1239'], ['#fbbf24', '#92400e'], ['#34d399', '#065f46'], ['#60a5fa', '#1e3a8a'], ['#a78bfa', '#4c1d95'], ['#f472b6', '#831843']];
  E.theme = null;                                      // set by the game: planet theme (tint + obstacle bias) or null
  const tint = () => E.theme ? pick(E.theme.tint) : pick(PAL);
  function newObs(kind, x, y, r, props) {
    const o = take(E.obs); if (!o) return null;
    o.type = 0; o.kind = kind; o.x = x; o.y = y; o.vx = 0; o.vy = 0; o.r = r; o.a = 0; o.va = 0; o.spin = 0; o.mass = r / 36; o.e = .7; o.hp = 1;
    o.glow = ''; o.nv = 0; o.flash = 0; o.hitCd = 0; o.entered = false; o.ghost = 0; o.beh = ''; o.t = 0; o.stun = 0; o.gen = 0; o.damp = .5; o.shootable = true; o.wallHalf = r;
    const tp = tint(); o.fill = tp[0]; o.stroke = tp[1];
    if (props) for (const k in props) o[k] = props[k];
    return o;
  }
  function asRect(o, w, h) {
    o.type = 1; o.nv = 4; o.hw = w / 2; o.hh = h / 2;
    o.lx[0] = -w / 2; o.ly[0] = -h / 2; o.lx[1] = w / 2; o.ly[1] = -h / 2; o.lx[2] = w / 2; o.ly[2] = h / 2; o.lx[3] = -w / 2; o.ly[3] = h / 2;
    o.r = Math.hypot(w, h) / 2; o.wallHalf = Math.min(w, h * 4) / 2; updateWV(o); return o;
  }
  function asTri(o, s) {
    o.type = 1; o.nv = 3; o.lx[0] = 0; o.ly[0] = -s; o.lx[1] = s * .87; o.ly[1] = s * .5; o.lx[2] = -s * .87; o.ly[2] = s * .5;
    o.r = s; o.wallHalf = s * .6; updateWV(o); return o;
  }
  const circ = (kind, x, y, r, p) => newObs(kind, x, y, r, p);
  const rect = (kind, x, y, w, h, p) => { const o = newObs(kind, x, y, 10, p); return o && asRect(o, w, h); };
  const tri = (kind, x, y, s, p) => { const o = newObs(kind, x, y, s, p); return o && asTri(o, s); };
  const rx = m => rand(m, V.W - m);

  /* ---------------- wave patterns: each returns the height it occupies ---------------- */
  const P = {};
  P.sprinkle = (y0, d, first) => {
    const S = V.S, n = first ? 1 : 1 + Math.floor(1 + d * 3);
    for (let i = 0; i < n; i++) { const r = rand(12, 19) * S; circ('ball', first ? V.W * .5 + rand(-30, 30) : rx(r + 14), y0 - i * rand(80, 130) * S, r, { vy: rand(0, 20) + d * 55 }); }
    return n * 100 * S;
  };
  P.blocks = (y0, d) => { const S = V.S, n = 2 + Math.floor(d * 2.5); for (let i = 0; i < n; i++) { const s = rand(26, 34) * S; rect('block', rx(s), y0 - i * rand(80, 120) * S, s, s, { vy: rand(0, 20) + d * 45, va: rand(-1.2, 1.2), spin: 0, mass: 1.05, hp: 1.5 }); } return n * 105 * S; };
  P.pit = (y0, d) => {
    const S = V.S, cols = 4 + Math.floor(d * 2), rows = 2 + Math.floor(d * 2), r = rand(11, 13) * S, sp = r * 2.1, cx = rx(cols * sp * .5 + 12), tp = tint();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) circ('ball', cx + (i - (cols - 1) / 2) * sp + (j % 2 ? sp * .3 : 0), y0 - j * sp, r, { vy: rand(5, 25), mass: .45, fill: tp[0], stroke: tp[1] });
    return rows * sp + 60 * S;
  };
  P.tris = (y0, d) => { const S = V.S, n = 2 + Math.floor(d * 3); for (let i = 0; i < n; i++) { const s = rand(20, 27) * S; tri('tri', rx(s + 6), y0 - i * rand(85, 125) * S, s, { vy: rand(0, 24) + d * 45, va: rand(-1.8, 1.8), mass: .95 }); } return n * 110 * S; };
  P.zig = (y0, d) => {
    const S = V.S, n = 1 + Math.floor(d * 2.5);
    for (let i = 0; i < n; i++) { const r = rand(14, 18) * S, x = rx(90 * S); circ('zig', x, y0 - i * rand(100, 150) * S, r, { vy: rand(20, 60), beh: 'zig', bx: x, amp: rand(70, 120) * S, freq: rand(1.5, 2.3), damp: 1, t: rand(0, 6), fill: '#22d3ee', stroke: '#164e63' }); }
    return n * 130 * S;
  };
  P.dart = (y0, d) => {
    const S = V.S, n = 1 + Math.floor(d * 2.3), hx = G.heroX ? G.heroX() : V.W / 2;
    for (let i = 0; i < n; i++) E.timers.push({ t: .9 + i * .5, kind: 'dart', x: clamp(hx + rand(-110, 110) * S, 24, V.W - 24), d });
    return 160 * S;
  };
  P.walls = (y0, d) => {
    const S = V.S, W = V.W, gap = lerp(195, 128, d) * S, gc = W * .5 + rand(-1, 1) * (30 + 70 * d) * S, h = 24 * S, tp = tint(), dbl = d > .55;
    const make = (yy, c) => {
      const lw = c - gap / 2, rw = W - (c + gap / 2);
      if (lw > 4) rect('wall', lw / 2, yy, lw, h, { vy: 8, mass: 3.5, hp: 99, shootable: false, fill: tp[0], stroke: tp[1] });
      if (rw > 4) rect('wall', W - rw / 2, yy, rw, h, { vy: 8, mass: 3.5, hp: 99, shootable: false, fill: tp[0], stroke: tp[1] });
    };
    make(y0, gc); if (dbl) make(y0 - 190 * S, W * .5 + rand(-1, 1) * (30 + 70 * d) * S);
    return (dbl ? 300 : 110) * S;
  };
  P.rock = (y0, d) => {
    const S = V.S, n = 1 + Math.floor(d * 1.6);
    for (let i = 0; i < n; i++) { const r = rand(25, 31) * S; circ('rock', rx(r + 10), y0 - i * rand(140, 190) * S, r, { vy: rand(15, 35), mass: 1.4, hp: 1, fill: '#a8a29e', stroke: '#44403c', gen: 0 }); }
    return n * 160 * S;
  };
  P.beam = (y0, d) => {
    const S = V.S, W = V.W, two = d > .4, len = two ? W * .4 : Math.min(W * .62, 230 * S), h = 11 * S, dir = Math.random() < .5 ? 1 : -1, spd = 1 + d * 1.3;
    const mk = (x, y, sd) => { const o = rect('laser', x, y, len, h, { vy: 14, spin: sd * spd, va: sd * spd, mass: 2.8, hp: 99, shootable: false, fill: '#fb7185', stroke: '#fff', glow: '#fb7185' }); if (o) o.wallHalf = h; };
    if (two) { mk(W * .27, y0 - 20 * S, dir); mk(W * .73, y0 - 20 * S, -dir); } else mk(W * .5 + rand(-40, 40) * S, y0 - 30 * S, dir);
    return 210 * S;
  };
  P.homing = (y0, d) => { const S = V.S, n = 1 + (d > .45 ? 1 : 0); for (let i = 0; i < n; i++) circ('homing', rx(40), y0 - i * 150 * S, 15 * S, { vy: 30, beh: 'home', damp: .6, mass: .7, fill: '#f43f5e', stroke: '#881337', glow: '#f43f5e' }); return n * 150 * S; };
  P.pyramid = (y0, d) => {
    const S = V.S, rows = 3, s = 30 * S, cx = rx(s * 2), tp = tint();
    for (let r = 0; r < rows; r++) { const cols = rows - r; for (let c = 0; c < cols; c++) rect('block', cx + (c - (cols - 1) / 2) * (s + 5), y0 - r * (s + 5), s, s, { vy: 16, mass: .9, hp: 1.5, fill: tp[0], stroke: tp[1] }); }
    return rows * (s + 5) + 70 * S;
  };
  P.boulder = (y0, d) => {
    const S = V.S; circ('boulder', V.W * .5 + rand(-55, 55), y0 - 40 * S, rand(34, 40) * S, { vy: 20, mass: 3.2, hp: 3, fill: '#334155', stroke: '#020617', glow: '#f43f5e' });
    for (const sx of [-1, 1]) circ('ball', V.W * .5 + sx * rand(80, 100) * S, y0 - 10 * S, 15 * S, { vy: 18, mass: .6 });
    return 250 * S;
  };
  P.rain = (y0, d) => { const S = V.S, n = 8 + Math.floor(d * 8); for (let i = 0; i < n; i++) { const r = rand(5, 8) * S; circ('debris', rx(r + 8), y0 - i * rand(26, 48) * S, r, { vy: rand(10, 50), mass: .12, hp: 1, fill: '#cbd5e1', stroke: '#475569' }); } return n * 38 * S; };
  P.heavy = (y0, d) => {
    const S = V.S, rows = 2 + Math.floor(d * 2), cols = 3 + Math.floor(d * 2), r = rand(17, 20) * S, sp = r * 2.1, cx = rx(cols * sp * .5 + 10);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) circ('heavy', cx + (i - (cols - 1) / 2) * sp + (j % 2 ? sp * .35 : 0), y0 - j * sp, r, { vy: rand(8, 22), mass: 1.6, hp: 2, fill: '#475569', stroke: '#0f172a', glow: '#ef4444' });
    return rows * sp + 80 * S;
  };

  // distance (m) at which each pattern unlocks, and base weight. The first ~30s only use 'sprinkle'/'blocks'.
  const LIST = [
    ['sprinkle', 0, 9], ['blocks', 160, 6], ['pit', 400, 5], ['tris', 600, 6], ['zig', 800, 5], ['dart', 1000, 5], ['walls', 1400, 4],
    ['rock', 1800, 5], ['beam', 2300, 5], ['homing', 3000, 4], ['pyramid', 3500, 3], ['boulder', 4000, 4], ['rain', 4500, 3], ['heavy', 6000, 4]
  ];
  E.P = P; E.lastPat = '';
  E.spawnWave = (run, d) => {
    const dist = run.dist, bias = (E.theme && E.theme.bias) || null;
    const pool = []; let total = 0;
    for (const [id, minD, w0] of LIST) { if (dist < minD || id === E.lastPat) continue; const w = w0 * (bias && bias[id] ? bias[id] : 1); pool.push([id, w]); total += w; }
    if (!pool.length) { pool.push(['sprinkle', 1]); total = 1; }          // early game: only one pattern unlocked, so allow a repeat
    let roll = Math.random() * total, pat = pool[0][0];
    for (const [id, w] of pool) { roll -= w; if (roll <= 0) { pat = id; break; } }
    E.lastPat = pat;
    const y0 = -50 * V.S;
    let used = P[pat](y0, d, run.spawned === 0);
    if (d > .35 && Math.random() < d * .4 && pat !== 'walls' && pat !== 'beam') { const o = pool[Math.floor(Math.random() * pool.length)][0]; if (o !== 'walls' && o !== 'beam') used = Math.max(used, P[o](y0 - used * .8, d, false) + used * .5); }
    return used;
  };
  E.spawnDart = (x, d) => {
    const S = V.S, o = tri('dart', x, -30 * S, 13 * S, { vy: 500 + d * 280, a: Math.PI, mass: .35, hp: 1, damp: 1, fill: '#f8fafc', stroke: '#dc2626', glow: '#ef4444' });
    return o;
  };

  /* ---------------- destroying / splitting ---------------- */
  E.destroy = (o, byBullet) => {
    if (!o.on) return;
    const S = V.S;
    FX.burst(o.x, o.y, o.fill, Math.round(clamp(8 + o.r * .4, 8, 22)), clamp(.6 + o.r / 60, .7, 1.3));
    G.Audio.boom(); if (G.Game) G.Game.shake(clamp(o.r / 18, 1, 5));
    if (o.kind === 'rock' && o.gen === 0) {
      const n = 2 + (Math.random() < .4 ? 1 : 0);
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * .9, sh = circ('shard', o.x, o.y, 12 * S, { vy: o.vy, mass: .45, gen: 1, hp: 1, fill: o.fill, stroke: o.stroke }); if (sh) { sh.vx = Math.cos(a) * 170 + rand(-30, 30); sh.vy = o.vy + Math.sin(a) * 120; sh.va = rand(-4, 4); sh.entered = true; } }
    } else if (Math.random() < (byBullet ? .3 : .12)) spawnCoin(o.x, o.y, 1, -40);
    o.on = false;
  };

  /* ---------------- coins & pickups ---------------- */
  function spawnCoin(x, y, val, vy) { const c = take(E.coins); if (!c) return null; c.x = x; c.y = y; c.val = val || 1; c.r = (val > 1 ? 15 : 11) * V.S; c.vy = vy || 0; c.ph = rand(0, 6); return c; }
  E.spawnCoin = spawnCoin;
  E.spawnCoins = y0 => {
    const S = V.S, W = V.W, k = Math.random(), x0 = rx(50);
    if (k < .45) { for (let i = 0; i < 5; i++) spawnCoin(clamp(x0, 20, W - 20), y0 - i * 38 * S, 1); }
    else if (k < .8) { const dir = Math.random() < .5 ? 1 : -1; for (let i = 0; i < 5; i++) spawnCoin(clamp(x0 + Math.sin(i / 4 * Math.PI) * 60 * S * dir, 20, W - 20), y0 - i * 34 * S, 1); }
    else { for (let i = 0; i < 3; i++) spawnCoin(clamp(x0 + i * 36 * S, 20, W - 20), y0, 1); }
    if (Math.random() < .08) spawnCoin(rx(40), y0 - 90 * S, 5);
  };
  E.spawnPick = (kind, x, y) => { const p = take(E.picks); if (!p) return; p.kind = kind; p.x = x; p.y = y; p.r = 17 * V.S; p.vy = 0; };
})();
