/* ============================================================
   obsart.js — obstacle visuals. Each obstacle has a `sk` (skin) chosen from
   the zone it spawns in (birds in the sky, meteors high up, asteroids and
   satellites in space, fireballs on lava worlds, crystals, drones ...).
   Collision shapes never change; only the drawing does.
   draw(ctx, o, t) is called with the context already translated to o.x,o.y.
   ROT[sk] = true  -> the skin rotates with the obstacle, otherwise it stays upright.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, TAU = Math.PI * 2;
  const A = (G.Art = {});
  A.ROT = { asteroid: 1, shard: 1, saw: 1, mine: 1, iceball: 1, basalt: 1, meteorRock: 1, satellite: 1 };
  const rg = (c, x, y, r0, r1, st) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach(s => g.addColorStop(s[0], s[1])); return g; };
  function blob(c, r, seed, n, jit) { c.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * (1 - jit + jit * (.5 + .5 * Math.sin(i * 2.7 + seed))); i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); }
  function tail(c, r, col, len, w) { const g = c.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,120,0,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-r * w, 0); c.lineTo(r * w, 0); c.lineTo(0, -len); c.closePath(); c.fill(); }

  const F = {};
  F.bird = (c, o, t) => {
    const r = o.r, f = Math.sin(t * 14 + o.seed) , dir = o.vx < -2 ? -1 : 1;
    c.scale(dir, 1);
    c.fillStyle = o.fill; c.beginPath(); c.ellipse(0, 0, r, r * .68, 0, 0, TAU); c.fill(); c.strokeStyle = o.stroke; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.ellipse(-r * .1, -r * .15, r * .75, r * (.15 + .55 * Math.abs(f)), -.5 * f, 0, TAU); c.fillStyle = o.stroke; c.globalAlpha = .75; c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#fb923c'; c.beginPath(); c.moveTo(r * .85, -r * .08); c.lineTo(r * 1.45, r * .08); c.lineTo(r * .85, r * .25); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(r * .4, -r * .2, r * .2, 0, TAU); c.fill(); c.fillStyle = '#111827'; c.beginPath(); c.arc(r * .46, -r * .2, r * .09, 0, TAU); c.fill();
    c.fillStyle = o.stroke; c.beginPath(); c.moveTo(-r, 0); c.lineTo(-r * 1.5, -r * .25); c.lineTo(-r * 1.4, r * .25); c.fill();
  };
  F.cloud = (c, o, t) => {
    const r = o.r; c.fillStyle = '#475569'; c.strokeStyle = '#1e293b'; c.lineWidth = 2;
    [[-.5, .1, .6], [0, -.2, .75], [.55, .1, .6], [0, .3, .62]].forEach(([x, y, s]) => { c.beginPath(); c.arc(x * r, y * r, s * r * .8, 0, TAU); c.fill(); });
    c.fillStyle = '#64748b'; c.beginPath(); c.arc(-r * .15, -r * .3, r * .45, 0, TAU); c.fill();
    if (Math.sin(t * 9 + o.seed) > .6) { c.strokeStyle = '#fde047'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, r * .2); c.lineTo(-r * .2, r * .55); c.lineTo(r * .05, r * .5); c.lineTo(-r * .15, r * .95); c.stroke(); }
  };
  F.kite = (c, o, t) => {
    const r = o.r; c.rotate(Math.sin(t * 3 + o.seed) * .18);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, r * 1.1); for (let i = 1; i <= 4; i++) c.lineTo(Math.sin(t * 6 + i) * 5, r * 1.1 + i * r * .35); c.stroke();
    c.fillStyle = o.fill; c.beginPath(); c.moveTo(0, -r); c.lineTo(r * .75, 0); c.lineTo(0, r * 1.1); c.lineTo(-r * .75, 0); c.closePath(); c.fill(); c.strokeStyle = o.stroke; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r * 1.1); c.moveTo(-r * .75, 0); c.lineTo(r * .75, 0); c.stroke();
  };
  F.meteor = (c, o, t) => {
    const r = o.r; tail(c, r, 'rgba(255,170,40,.75)', r * 3.2, 1); c.fillStyle = rg(c, -r * .3, -r * .3, 1, r * 1.1, [[0, '#fcd34d'], [.5, '#c2410c'], [1, '#451a03']]);
    blob(c, r, o.seed, 9, .3); c.fill(); c.strokeStyle = '#fb923c'; c.lineWidth = 2; c.stroke();
  };
  F.asteroid = (c, o) => {
    const r = o.r; blob(c, r, o.seed, 10, .35); c.fillStyle = rg(c, -r * .3, -r * .3, 1, r * 1.1, [[0, '#a8a29e'], [1, '#44403c']]); c.fill(); c.strokeStyle = '#1c1917'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(28,25,23,.45)'; [[.3, .2, .2], [-.35, .3, .14], [-.1, -.35, .12]].forEach(([x, y, s]) => { c.beginPath(); c.arc(x * r, y * r, s * r, 0, TAU); c.fill(); });
  };
  F.satellite = (c, o, t) => {
    const r = o.r, w = o.hw || r, h = o.hh || r;
    c.fillStyle = '#1d4ed8'; c.strokeStyle = '#bfdbfe'; c.lineWidth = 1;
    for (const s of [-1, 1]) { c.fillRect(s > 0 ? w * .5 : -w * 1.5, -h * .42, w, h * .84); c.strokeRect(s > 0 ? w * .5 : -w * 1.5, -h * .42, w, h * .84); for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo((s > 0 ? w * .5 : -w * 1.5) + w * i / 3, -h * .42); c.lineTo((s > 0 ? w * .5 : -w * 1.5) + w * i / 3, h * .42); c.stroke(); } }
    c.fillStyle = '#e2e8f0'; c.fillRect(-w * .5, -h * .5, w, h); c.strokeStyle = '#475569'; c.lineWidth = 2; c.strokeRect(-w * .5, -h * .5, w, h);
    c.fillStyle = Math.sin(t * 6 + o.seed) > 0 ? '#ef4444' : '#7f1d1d'; c.beginPath(); c.arc(0, 0, Math.min(w, h) * .14, 0, TAU); c.fill();
  };
  F.mine = (c, o, t) => {
    const r = o.r; c.fillStyle = '#334155'; c.strokeStyle = '#0f172a'; c.lineWidth = 2;
    for (let i = 0; i < 8; i++) { c.save(); c.rotate(i / 8 * TAU); c.beginPath(); c.moveTo(r * .8, -r * .17); c.lineTo(r * 1.3, 0); c.lineTo(r * .8, r * .17); c.fill(); c.restore(); }
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = rg(c, -r * .3, -r * .3, 1, r, [[0, '#94a3b8'], [1, '#1e293b']]); c.fill(); c.stroke();
    const b = (Math.sin(t * 7 + o.seed) + 1) / 2; c.fillStyle = 'rgba(239,68,68,' + (.35 + .65 * b) + ')'; c.beginPath(); c.arc(0, 0, r * (.28 + .1 * b), 0, TAU); c.fill();
  };
  F.shard = (c, o) => {
    const r = o.r; c.beginPath(); c.moveTo(0, -r * 1.15); c.lineTo(r * .6, -r * .25); c.lineTo(r * .45, r * .9); c.lineTo(-r * .15, r * 1.1); c.lineTo(-r * .62, r * .1); c.closePath();
    c.fillStyle = o.fill; c.fill(); c.strokeStyle = o.stroke; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(0, -r * 1.15); c.lineTo(r * .6, -r * .25); c.lineTo(r * .05, -r * .1); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(r * .05, -r * .1); c.lineTo(-r * .62, r * .1); c.moveTo(r * .05, -r * .1); c.lineTo(r * .45, r * .9); c.stroke();
  };
  F.iceball = (c, o) => {
    const r = o.r; c.fillStyle = rg(c, -r * .3, -r * .3, 1, r * 1.1, [[0, '#fff'], [.5, '#bae6fd'], [1, '#0ea5e9']]); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.strokeStyle = '#0c4a6e'; c.lineWidth = 2; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * Math.PI / 3); c.beginPath(); c.moveTo(-r * .7, 0); c.lineTo(r * .7, 0); c.stroke(); c.restore(); }
  };
  F.fireball = (c, o, t) => {
    const r = o.r; tail(c, r, 'rgba(255,90,10,.85)', r * 3.4, 1.1);
    c.fillStyle = rg(c, 0, 0, 1, r * 1.3, [[0, '#fff7ae'], [.35, '#fb923c'], [.8, '#dc2626'], [1, 'rgba(127,29,29,0)']]); c.beginPath(); c.arc(0, 0, r * 1.25 + Math.sin(t * 15) * 1.5, 0, TAU); c.fill();
  };
  F.basalt = (c, o, t) => {
    const w = (o.hw || o.r) , h = (o.hh || o.r); c.fillStyle = '#292524'; c.strokeStyle = '#0c0a09'; c.lineWidth = 2.4; c.fillRect(-w, -h, w * 2, h * 2); c.strokeRect(-w, -h, w * 2, h * 2);
    c.strokeStyle = 'rgba(251,146,60,' + (.6 + .3 * Math.sin(t * 4 + o.seed)) + ')'; c.lineWidth = 2; c.beginPath(); c.moveTo(-w * .7, -h * .6); c.lineTo(-w * .1, -h * .1); c.lineTo(w * .3, -h * .5); c.moveTo(-w * .1, -h * .1); c.lineTo(w * .2, h * .6); c.stroke();
  };
  F.drone = (c, o, t) => {
    const r = o.r; for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4, x = Math.cos(a) * r * .9, y = Math.sin(a) * r * .9; c.strokeStyle = '#22d3ee'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(x, y); c.stroke(); c.fillStyle = 'rgba(103,232,249,.55)'; c.beginPath(); c.ellipse(x, y, r * .42, r * .1 + Math.abs(Math.sin(t * 30 + i)) * r * .15, a, 0, TAU); c.fill(); }
    c.fillStyle = '#0f172a'; c.strokeStyle = o.fill; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = Math.sin(t * 5 + o.seed) > 0 ? '#f43f5e' : '#fda4af'; c.beginPath(); c.arc(0, 0, r * .2, 0, TAU); c.fill();
  };
  F.saw = (c, o, t) => {
    const r = o.r, n = 12; c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, rr = i % 2 ? r * .78 : r * 1.08; i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath();
    c.fillStyle = rg(c, -r * .3, -r * .3, 1, r * 1.2, [[0, '#f1f5f9'], [1, '#64748b']]); c.fill(); c.strokeStyle = '#1e293b'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#1e293b'; c.beginPath(); c.arc(0, 0, r * .25, 0, TAU); c.fill(); c.strokeStyle = 'rgba(15,23,42,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.stroke();
  };
  F.missile = (c, o, t) => {         // drawn pointing UP (it flies up from below)
    const w = o.hw || 8, h = o.hh || 20, fl = h * (.6 + .3 * Math.sin(t * 40));
    c.fillStyle = '#fde047'; c.beginPath(); c.moveTo(-w * .55, h); c.lineTo(w * .55, h); c.lineTo(0, h + fl); c.fill(); c.fillStyle = '#fb923c'; c.beginPath(); c.moveTo(-w * .3, h); c.lineTo(w * .3, h); c.lineTo(0, h + fl * .6); c.fill();
    c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(-w, h * .5); c.lineTo(-w * 1.9, h * 1.05); c.lineTo(-w * .6, h * .9); c.fill(); c.beginPath(); c.moveTo(w, h * .5); c.lineTo(w * 1.9, h * 1.05); c.lineTo(w * .6, h * .9); c.fill();
    c.fillStyle = '#e2e8f0'; c.strokeStyle = '#334155'; c.lineWidth = 2; c.fillRect(-w, -h * .6, w * 2, h * 1.7); c.strokeRect(-w, -h * .6, w * 2, h * 1.7);
    c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(-w, -h * .6); c.lineTo(0, -h * 1.25); c.lineTo(w, -h * .6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#38bdf8'; c.beginPath(); c.arc(0, 0, w * .45, 0, TAU); c.fill();
  };
  F.comet = (c, o, t) => {
    const r = o.r, dir = o.vx < 0 ? 1 : -1, g = c.createLinearGradient(0, 0, dir * r * 7, 0); g.addColorStop(0, 'rgba(150,230,255,.9)'); g.addColorStop(1, 'rgba(150,230,255,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, -r * .85); c.lineTo(dir * r * 7, 0); c.lineTo(0, r * .85); c.closePath(); c.fill();
    c.fillStyle = rg(c, 0, 0, 1, r * 1.1, [[0, '#fff'], [.6, '#a5f3fc'], [1, '#0891b2']]); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  };
  F.jet = (c, o, t) => {
    const r = o.r, dir = o.vx < 0 ? -1 : 1; c.scale(dir, 1);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(-r * 1.1, -r * .12); c.lineTo(-r * 4.5, 0); c.lineTo(-r * 1.1, r * .12); c.fill();
    c.fillStyle = '#e2e8f0'; c.strokeStyle = '#334155'; c.lineWidth = 2; c.beginPath(); c.moveTo(r * 1.4, 0); c.lineTo(r * .3, -r * .32); c.lineTo(-r * 1.1, -r * .28); c.lineTo(-r * 1.1, r * .28); c.lineTo(r * .3, r * .32); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(-r * .2, -r * .3); c.lineTo(-r * .85, -r * 1.05); c.lineTo(-r * 1.0, -r * .3); c.fill(); c.beginPath(); c.moveTo(-r * .2, r * .3); c.lineTo(-r * .85, r * 1.05); c.lineTo(-r * 1.0, r * .3); c.fill();
    c.fillStyle = '#38bdf8'; c.beginPath(); c.ellipse(r * .45, -r * .05, r * .32, r * .15, 0, 0, TAU); c.fill();
  };
  A.draw = (c, o, t) => { const f = F[o.sk]; if (!f) return false; f(c, o, t); return true; };

  /* which skin a kind gets in a zone. zone: 'sky' | 'upper' | 'space' | 'ice' | 'lava' | 'gas' | 'crystal' | 'neon' | 'hole' | 'moon' | 'mars' | 'venus' */
  const MAP = {
    sky:     { ball: 'bird', zig: 'bird', block: 'cloud', tri: 'kite', rock: 'meteor', shard: 'shard', heavy: 'mine', boulder: 'meteor', debris: 'meteor', sweeper: 'jet' },
    upper:   { ball: 'meteor', zig: 'meteor', block: 'basalt', tri: 'shard', rock: 'asteroid', shard: 'shard', heavy: 'mine', boulder: 'asteroid', debris: 'meteor', sweeper: 'comet' },
    space:   { ball: 'asteroid', zig: 'drone', block: 'satellite', tri: 'shard', rock: 'asteroid', shard: 'shard', heavy: 'mine', boulder: 'asteroid', debris: 'asteroid', sweeper: 'comet' },
    ice:     { ball: 'iceball', zig: 'iceball', block: 'basalt', tri: 'shard', rock: 'asteroid', shard: 'shard', heavy: 'mine', boulder: 'iceball', debris: 'iceball', sweeper: 'comet' },
    lava:    { ball: 'fireball', zig: 'fireball', block: 'basalt', tri: 'shard', rock: 'asteroid', shard: 'shard', heavy: 'mine', boulder: 'fireball', debris: 'fireball', sweeper: 'fireball' },
    gas:     { ball: 'cloud', zig: 'cloud', block: 'satellite', tri: 'kite', rock: 'asteroid', shard: 'shard', heavy: 'mine', boulder: 'cloud', debris: 'cloud', sweeper: 'jet' },
    crystal: { ball: 'shard', zig: 'shard', block: 'shard', tri: 'shard', rock: 'shard', shard: 'shard', heavy: 'mine', boulder: 'shard', debris: 'shard', sweeper: 'comet' },
    neon:    { ball: 'drone', zig: 'drone', block: 'satellite', tri: 'shard', rock: 'asteroid', shard: 'shard', heavy: 'mine', boulder: 'drone', debris: 'drone', sweeper: 'comet' },
    hole:    { ball: 'asteroid', zig: 'asteroid', block: 'basalt', tri: 'shard', rock: 'asteroid', shard: 'shard', heavy: 'mine', boulder: 'asteroid', debris: 'asteroid', sweeper: 'comet' }
  };
  MAP.moon = MAP.space; MAP.mars = Object.assign({}, MAP.upper, { ball: 'asteroid', block: 'basalt' }); MAP.venus = Object.assign({}, MAP.sky, { ball: 'fireball', zig: 'fireball', block: 'cloud' });
  const FIXED = { saw: 'saw', missile: 'missile', mine: 'mine', homing: 'drone', dart: null, laser: null, wall: null };
  A.skinFor = (kind, zone) => { if (kind in FIXED) return FIXED[kind]; const m = MAP[zone] || MAP.sky; return m[kind] || null; };
})();
