/* ============================================================
   world.js — infinite, distance-driven background.
   0–2,000 m   Sky (sunrise, clouds, birds, sunset)
   2,000–5,000 Upper atmosphere (twilight, moon, aurora, meteors, Earth's limb)
   5,000–10,000 Space (stars, satellites, asteroids, aliens/UFOs)
   10,000+     Alien planets: a NEW seeded theme every 5,000 m, forever
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, U = G.U, V = G.view;
  const { clamp, lerp, rand, pick, smooth, TAU, mix, rgb, hsl } = U;
  const PLEN = 5000, TR = 700, PX_M = G.PX_M;
  let ctx = null, T = 0, lowFx = false;

  /* ---------- sky colour keyframes (distance in meters) ---------- */
  const SKY = [
    [0, '#5b8fe6', '#ffb7a0'],     // sunrise
    [300, '#3aa6f0', '#cdeeff'],   // blue sky
    [900, '#4f8ff0', '#ffe3a3'],   // golden hour
    [1400, '#3b2f7a', '#ff8a4c'],  // sunset
    [1800, '#1d1a4d', '#c04a7a'],  // twilight
    [2200, '#0b1240', '#243a8a'],  // upper atmosphere
    [3500, '#050a24', '#0b3a5a'],
    [5000, '#02030f', '#0a0618'],  // space
    [7500, '#05031a', '#1a0b3a'],
    [9400, '#07031a', '#2a0f4a']
  ].map(b => [b[0], U.hex(b[1]), U.hex(b[2])]);
  function skyKeys(A) {
    let i = 0; while (i < SKY.length - 2 && A > SKY[i + 1][0]) i++;
    const a = SKY[i], b = SKY[i + 1], s = smooth((A - a[0]) / (b[0] - a[0]));
    return [mix(a[1], b[1], s), mix(a[2], b[2], s)];
  }

  /* ---------- procedural planet themes (seeded, never repeat) ---------- */
  const KINDS = ['ice', 'lava', 'gas', 'crystal', 'neon', 'hole'];
  const FIXED = { ice: 'Ice Planet', lava: 'Lava Planet', gas: 'Ringed Gas Giant', crystal: 'Crystal Planet', neon: 'Neon Nebula', hole: 'Black Hole Zone' };
  const NOUN = { ice: 'Ice World', lava: 'Lava World', gas: 'Gas Giant', crystal: 'Crystal World', neon: 'Neon Nebula', hole: 'Void Rift' };
  const ADJ = ['Verdant', 'Amber', 'Obsidian', 'Cobalt', 'Emerald', 'Violet', 'Crimson', 'Golden', 'Frozen', 'Silent', 'Radiant', 'Ashen', 'Jade', 'Scarlet', 'Lunar', 'Hollow', 'Prism', 'Storm'];
  const BIAS = {   // which obstacle patterns this theme favours (a different "obstacle set" per world)
    ice: { zig: 2.2, rain: 1.4, wall: 1.2 }, lava: { boulder: 2.2, dart: 1.8, rain: 1.3 }, gas: { beam: 2.4, wall: 1.5, pit: 1.3 },
    crystal: { rock: 2.8, rain: 1.6, tris: 1.5 }, neon: { homing: 2.6, dart: 1.6, zig: 1.4 }, hole: { dart: 2, wall: 2, homing: 1.6, heavy: 1.5 }
  };
  const cache = [];
  function themeFor(i) {
    if (cache[i]) return cache[i];
    const rng = U.mulberry32(i * 7919 + 13), th = { idx: i };
    let hue;
    if (i < 6) { th.kind = KINDS[i]; hue = { ice: 200, lava: 8, gas: 35, crystal: 285, neon: 310, hole: 265 }[th.kind] + rng() * 20 - 10; }
    else { th.kind = KINDS[Math.floor(rng() * 6)]; hue = rng() * 360; }
    th.hue = hue;
    th.name = i < 6 ? FIXED[th.kind] : ADJ[Math.floor(rng() * ADJ.length)] + ' ' + NOUN[th.kind];
    switch (th.kind) {
      case 'ice': th.top = hsl(hue, .6, .1); th.bot = hsl(hue - 5, .7, .36); break;
      case 'lava': th.top = hsl(hue, .7, .06); th.bot = hsl(hue + 8, .85, .26); break;
      case 'gas': th.top = hsl(hue, .5, .08); th.bot = hsl(hue + 30, .6, .28); break;
      case 'crystal': th.top = hsl(hue, .6, .09); th.bot = hsl(hue + 35, .7, .3); break;
      case 'neon': th.top = hsl(hue - 60, .8, .04); th.bot = hsl(hue, .75, .2); break;
      default: th.top = hsl(hue, .3, .012); th.bot = hsl(hue, .5, .1);
    }
    th.tint = [0, 40, -40].map(o => ['hsl(' + ((hue + o + 360) % 360 | 0) + ',72%,62%)', 'hsl(' + ((hue + o + 360) % 360 | 0) + ',60%,16%)']);
    th.bias = Object.assign({}, BIAS[th.kind]);
    if (i >= 6) { for (const k in th.bias) th.bias[k] *= 0.7 + rng() * 0.9; const extra = pick2(rng, ['zig', 'dart', 'wall', 'rock', 'beam', 'homing', 'boulder', 'heavy', 'rain']); th.bias[extra] = (th.bias[extra] || 1) * (1.6 + rng()); }
    th.planets = []; const np = th.kind === 'hole' ? 1 : 2 + Math.floor(rng() * 2);
    for (let k = 0; k < np; k++) {
      const p = { x: 0.15 + rng() * 0.7, f: rng(), r: th.kind === 'hole' ? 85 + rng() * 25 : 46 + rng() * 74, par: 0.3 + rng() * 0.7, ring: rng() < 0.45, h2: rng() * 60 - 30, tilt: rng() * 0.8 - 0.4, cracks: [], spikes: [] };
      for (let c = 0; c < 6; c++) { const pts = [], a = rng() * TAU; for (let q = 1; q <= 4; q++) pts.push([Math.cos(a + (rng() - .5) * .5) * q / 4, Math.sin(a + (rng() - .5) * .5) * q / 4]); p.cracks.push(pts); }
      for (let c = 0; c < 9; c++) p.spikes.push([c / 9 * TAU + rng() * .3, 1.15 + rng() * .45]);
      th.planets.push(p);
    }
    th.blobs = [0, 1, 2].map(() => { const h = hue + rng() * 90 - 45; return { x: rng(), f: rng(), r: .3 + rng() * .25, par: .2 + rng() * .5, c0: 'hsla(' + (h | 0) + ',80%,55%,.26)', c1: 'hsla(' + (h | 0) + ',80%,55%,0)' }; });
    th.fx = { ice: 'snow', lava: 'ember', gas: 'spore', crystal: 'spark', neon: 'dash', hole: 'spark' }[th.kind];
    return (cache[i] = th);
  }
  function pick2(rng, a) { return a[Math.floor(rng() * a.length)]; }

  /* blend between space and planet themes, and between consecutive planets */
  function layersAt(A) {
    if (A < 10000 - TR) return null;
    if (A < 10000) return [{ th: themeFor(0), a: smooth((A - (10000 - TR)) / TR) }];
    const i = Math.floor((A - 10000) / PLEN), p = A - 10000 - i * PLEN, b = smooth((p - (PLEN - TR)) / TR);
    return b > 0 ? [{ th: themeFor(i), a: 1 - b }, { th: themeFor(i + 1), a: b }] : [{ th: themeFor(i), a: 1 }];
  }
  function skyColors(A) {
    if (A < 9400) return skyKeys(A);
    const L = layersAt(A), last = SKY[SKY.length - 1];
    if (A < 10000) return [mix(last[1], L[0].th.top, L[0].a), mix(last[2], L[0].th.bot, L[0].a)];
    if (L.length === 1) return [L[0].th.top, L[0].th.bot];
    return [mix(L[0].th.top, L[1].th.top, L[1].a), mix(L[0].th.bot, L[1].th.bot, L[1].a)];
  }

  /* ---------- zones (for banners / HUD / music / obstacle sets) ---------- */
  function zoneAt(A) {
    if (A < 2000) return { key: 'sky', name: 'Sky', sub: 'Clouds, birds and open air', n: 0 };
    if (A < 5000) return { key: 'upper', name: 'Upper Atmosphere', sub: 'The air gets thin…', n: 1 };
    if (A < 10000) return { key: 'space', name: 'Space', sub: 'Satellites, asteroids… and aliens', n: 2 };
    const i = Math.floor((A - 10000) / PLEN), th = themeFor(i);
    return { key: 'p' + i, name: th.name, sub: 'Alien zone ' + (i + 1), n: 3 + i };
  }
  function themeAt(A) { if (A < 10000) return null; return themeFor(Math.floor((A - 10000) / PLEN + 0.0001)); }

  /* ---------- decor state ---------- */
  let stars = [], clouds = [], birds = [], tufts = [], shoots = [], ufos = [], rocks = [], sats = [], galaxy = [], amb = [];
  let guardian = null, ufoT = 0, shootT = 3, guardCool = 0, satT = 2, lvlTheme = null, gdec = [];
  function init(c) { ctx = c; build(); }
  function build() {
    const W = V.W, H = V.H, S = V.S;
    stars = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 1.6, z: .2 + Math.random() * .8, tw: Math.random() * TAU }));
    clouds = Array.from({ length: 9 }, () => ({ x: Math.random() * W, y: Math.random() * H, w: 80 + Math.random() * 110, z: .25 + Math.random() * .5, o: .35 + Math.random() * .4 }));
    birds = Array.from({ length: 6 }, () => ({ x: Math.random() * W, y: Math.random() * H * .6, vx: rand(20, 50), ph: rand(0, TAU) }));
    galaxy = Array.from({ length: 220 }, (_, i) => { const rr = Math.pow(Math.random(), .6) * 130, ang = (i % 3) * TAU / 3 + rr * .045 + rand(-.3, .3); return { x: Math.cos(ang) * rr, y: Math.sin(ang) * rr, s: rand(.6, 2), h: rand(200, 320) }; });
    rocks = Array.from({ length: 8 }, () => ({ x: Math.random() * W, f: Math.random(), s: rand(7, 17), rot: rand(0, TAU), vr: rand(-.8, .8), z: rand(.4, 1) }));
    tufts = []; for (let x = 10; x < W + 60; x += rand(40, 72) * S) tufts.push({ k: Math.random() < .3 ? 'house' : 'tree', x, s: rand(.8, 1.3), c: pick(['#fda4af', '#fde68a', '#bae6fd', '#fff']) });
    gdec = Array.from({ length: 16 }, (_, i) => ({ x: (i + Math.random() * .8) / 15 * (W + 80) - 20, s: .7 + Math.random() * .8, v: Math.random() }));
    amb = Array.from({ length: 42 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .7, ph: Math.random() * TAU, s: 1 + Math.random() * 2 }));
  }

  function update(dt, rise, A) {
    const W = V.W, H = V.H; T += dt;
    for (const s of stars) { s.y += rise * s.z * .12 * dt; if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; } }
    for (const c of clouds) { c.y += rise * c.z * dt; if (c.y > H + 70) { c.y = -70; c.x = Math.random() * W; } }
    for (const g of rocks) g.rot += g.vr * dt;
    for (const b of birds) { b.x += b.vx * dt; b.y += rise * .15 * dt; b.ph += dt * 9; if (b.x > W + 20) { b.x = -20; } if (b.y > H + 20) { b.y = -20; b.x = Math.random() * W; } }
    shootT -= dt;
    if (shootT <= 0) { shootT = rand(1.6, 4.5); if (A > 2300 && shoots.length < 3) shoots.push({ x: rand(W * .3, W), y: rand(0, H * .4), vx: -rand(380, 600), vy: rand(220, 380), life: .8, max: .8, comet: A > 7500 }); }
    for (let i = shoots.length - 1; i >= 0; i--) { const s = shoots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) shoots.splice(i, 1); }
    satT -= dt;
    if (A > 5200 && A < 9800 && satT <= 0 && sats.length < 2) { satT = rand(5, 10); const d = Math.random() < .5 ? 1 : -1; sats.push({ x: d > 0 ? -40 : W + 40, y: rand(H * .1, H * .6), vx: d * rand(14, 28), ph: rand(0, 6) }); }
    for (let i = sats.length - 1; i >= 0; i--) { const s = sats[i]; s.x += s.vx * dt; s.y += rise * .05 * dt; if (s.x < -60 || s.x > W + 60) sats.splice(i, 1); }
    if (A > 6500 && A < 9900) { ufoT -= dt; if (ufos.length < 3 && ufoT <= 0) { ufoT = rand(2, 5); const d = Math.random() < .5 ? 1 : -1; ufos.push({ x: d > 0 ? -70 : W + 70, y: rand(H * .1, H * .55), vx: d * rand(28, 60), s: rand(.7, 1.25), ph: rand(0, TAU), beam: Math.random() < .6 }); } }
    for (let i = ufos.length - 1; i >= 0; i--) { const u = ufos[i]; u.x += u.vx * dt; u.ph += dt * 3; if (u.x < -90 || u.x > W + 90) ufos.splice(i, 1); }
    guardCool -= dt;
    if (A > 8300 && A < 9800 && !guardian && guardCool <= 0) { guardian = { x: W + 140, y: H * rand(.2, .4), vx: -26, ph: 0 }; guardCool = 70; if (G.state === 'PLAY' && G.UI) G.UI.banner('👽 You are not alone…', 'Something ancient is watching'); }
    if (guardian) { guardian.x += guardian.vx * dt; guardian.ph += dt; if (guardian.x < -170) guardian = null; }
    // ambient particles of the current planet theme
    const L = lvlTheme ? [{ th: lvlTheme, a: 1 }] : layersAt(A);
    if (L) {
      const th = L[L.length - 1].th; amb.kind = th.fx;
      for (const a of amb) {
        a.ph += dt * (1 + a.z);
        if (th.fx === 'ember') a.y += (rise * a.z * .15 - 70 * a.z) * dt;
        else if (th.fx === 'snow') { a.y += (rise * a.z * .2 + 34 * a.z) * dt; a.x += Math.sin(a.ph) * 12 * dt; }
        else a.y += rise * a.z * .18 * dt + 8 * dt;
        if (a.y > H + 8) { a.y = -8; a.x = Math.random() * W; } else if (a.y < -8) { a.y = H + 8; a.x = Math.random() * W; }
      }
    }
  }

  function drawUfo(u) {
    ctx.save(); ctx.translate(u.x, u.y + Math.sin(u.ph) * 5); ctx.scale(u.s * V.S, u.s * V.S);
    if (u.beam) { const g = ctx.createLinearGradient(0, 10, 0, 140); g.addColorStop(0, 'rgba(190,255,200,.4)'); g.addColorStop(1, 'rgba(190,255,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(14, 10); ctx.lineTo(46, 140); ctx.lineTo(-46, 140); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(165,243,252,.55)'; ctx.beginPath(); ctx.arc(0, -2, 17, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.arc(0, -6, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.ellipse(-3, -7, 2, 3, .4, 0, TAU); ctx.ellipse(3, -7, 2, 3, -.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#86efac'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(14, -13 + Math.sin(T * 8 + u.ph) * 4); ctx.stroke();
    const bg = ctx.createLinearGradient(0, -4, 0, 14); bg.addColorStop(0, '#e2e8f0'); bg.addColorStop(1, '#64748b');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 4, 36, 10, 0, 0, TAU); ctx.fill();
    for (let i = -2; i <= 2; i++) { ctx.fillStyle = 'hsl(' + ((i * 60 + T * 120) % 360 | 0) + ',100%,65%)'; ctx.beginPath(); ctx.arc(i * 12, 5 + Math.abs(i) * .8, 2.4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawGround(A) {
    const W = V.W, H = V.H, S = V.S, gBase = H * .9 + A * PX_M * .4;
    if (gBase > H * 1.3) return;
    const sr = 1 - smooth(A / 150);
    ctx.fillStyle = rgb(mix([75, 154, 88], [150, 110, 160], sr * .55)); ctx.beginPath(); ctx.moveTo(0, H + 500);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, gBase - 34 * S + Math.sin(x * .011 + 1) * 16 * S);
    ctx.lineTo(W, H + 500); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb(mix([58, 131, 72], [110, 80, 130], sr * .5)); ctx.beginPath(); ctx.moveTo(0, H + 500);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, gBase - 4 * S + Math.sin(x * .017 + 3) * 8 * S);
    ctx.lineTo(W, H + 500); ctx.closePath(); ctx.fill();
    for (const d of tufts) {
      const y = gBase - 2 * S + Math.sin(d.x * .017 + 3) * 8 * S, s = d.s * S;
      if (d.k === 'tree') { ctx.fillStyle = '#7c4a2d'; ctx.fillRect(d.x - 2 * s, y - 12 * s, 4 * s, 14 * s); ctx.fillStyle = '#2f7d46'; ctx.beginPath(); ctx.arc(d.x, y - 20 * s, 11 * s, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = d.c; ctx.fillRect(d.x - 12 * s, y - 18 * s, 24 * s, 18 * s); ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(d.x - 15 * s, y - 18 * s); ctx.lineTo(d.x, y - 31 * s); ctx.lineTo(d.x + 15 * s, y - 18 * s); ctx.fill(); ctx.fillStyle = '#475569'; ctx.fillRect(d.x - 3 * s, y - 10 * s, 6 * s, 10 * s); }
    }
  }

  /* ---------- planet theme drawing ---------- */
  function drawTheme(th, al, A) {
    const W = V.W, H = V.H, S = V.S, hue = th.hue;
    ctx.save(); ctx.globalAlpha = al;
    // nebula blobs
    if (!lowFx) {
      ctx.globalCompositeOperation = 'lighter';
      for (const b of th.blobs) {
        const y = ((b.f * H * 1.5 + A * b.par * 2.2) % (H * 1.5)) - H * .25, r = H * b.r;
        const gr = ctx.createRadialGradient(b.x * W, y, 0, b.x * W, y, r); gr.addColorStop(0, b.c0); gr.addColorStop(1, b.c1); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // planets
    for (const p of th.planets) {
      const span = H * 1.8, x = p.x * W, y = ((p.f * span + A * p.par * 2.4) % span) - H * .45, r = p.r * S;
      planet(th, p, x, y, r);
    }
    // ambient particles
    const k = th.fx;
    for (let i = 0; i < amb.length; i += lowFx ? 2 : 1) {
      const a = amb[i];
      if (k === 'snow') { ctx.fillStyle = 'rgba(235,248,255,.85)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * .9, 0, TAU); ctx.fill(); }
      else if (k === 'ember') { ctx.fillStyle = 'hsla(' + (15 + a.z * 35 | 0) + ',100%,60%,' + (.4 + .4 * Math.sin(a.ph * 3)).toFixed(2) + ')'; ctx.fillRect(a.x, a.y, a.s * 1.6, a.s * 1.6); }
      else if (k === 'dash') { ctx.fillStyle = 'hsla(' + (i % 2 ? hue : hue + 120 | 0) + ',100%,65%,.7)'; ctx.fillRect(a.x, a.y, 1.6, 6 + a.z * 10); }
      else if (k === 'spark') { const t = .5 + .5 * Math.sin(a.ph * 4); ctx.fillStyle = 'hsla(' + (hue + 20 | 0) + ',100%,80%,' + t.toFixed(2) + ')'; ctx.fillRect(a.x - a.s, a.y - .5, a.s * 2, 1); ctx.fillRect(a.x - .5, a.y - a.s, 1, a.s * 2); }
      else { ctx.fillStyle = 'hsla(' + (hue + 20 | 0) + ',70%,75%,.35)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.s, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  function planet(th, p, x, y, r) {
    const hue = th.hue + p.h2, k = th.kind;
    if (k === 'neon') {
      ctx.globalCompositeOperation = 'lighter';
      for (let q = 1; q <= 3; q++) { ctx.strokeStyle = 'hsla(' + ((hue + q * 40) % 360 | 0) + ',100%,62%,' + (.7 - q * .15) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * (.35 + q * .3), 0, TAU); ctx.stroke(); }
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'hsla(' + (hue | 0) + ',100%,60%,.4)'); g.addColorStop(1, 'hsla(' + (hue | 0) + ',100%,60%,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; return;
    }
    if (k === 'hole') {
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.tilt);
      for (let q = 0; q < 6; q++) { ctx.strokeStyle = 'hsla(' + ((hue + q * 18) % 360 | 0) + ',100%,' + (62 - q * 3) + '%,' + (.55 - q * .07).toFixed(2) + ')'; ctx.lineWidth = 5 - q * .6; ctx.beginPath(); ctx.ellipse(0, 0, r * (1.1 + q * .2), r * (.3 + q * .05), 0, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * .36, 0, T * 2, T * 2 + 1.1); ctx.stroke();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * .85, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'hsla(' + (hue | 0) + ',100%,70%,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * .88, 0, TAU); ctx.stroke(); ctx.restore(); return;
    }
    if (k === 'lava') { const g = ctx.createRadialGradient(x, y, r * .8, x, y, r * 1.5); g.addColorStop(0, 'rgba(255,90,20,.4)'); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, TAU); ctx.fill(); }
    if (k === 'crystal') {
      ctx.fillStyle = 'hsla(' + ((hue + 30) % 360 | 0) + ',85%,75%,.85)';
      for (const s of p.spikes) { const a = s[0], l = s[1], w = .16; ctx.beginPath(); ctx.moveTo(x + Math.cos(a - w) * r * .9, y + Math.sin(a - w) * r * .9); ctx.lineTo(x + Math.cos(a) * r * l, y + Math.sin(a) * r * l); ctx.lineTo(x + Math.cos(a + w) * r * .9, y + Math.sin(a + w) * r * .9); ctx.fill(); }
    }
    const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
    if (k === 'ice') { g.addColorStop(0, 'hsl(' + (hue | 0) + ',70%,88%)'); g.addColorStop(1, 'hsl(' + (hue | 0) + ',55%,38%)'); }
    else if (k === 'lava') { g.addColorStop(0, 'hsl(' + (hue | 0) + ',40%,22%)'); g.addColorStop(1, 'hsl(' + (hue | 0) + ',50%,6%)'); }
    else if (k === 'crystal') { g.addColorStop(0, 'hsl(' + (hue | 0) + ',70%,70%)'); g.addColorStop(1, 'hsl(' + (hue | 0) + ',60%,25%)'); }
    else { g.addColorStop(0, 'hsl(' + (hue | 0) + ',65%,70%)'); g.addColorStop(1, 'hsl(' + ((hue + 30) % 360 | 0) + ',55%,22%)'); }
    if (k === 'gas' && p.ring) { ctx.strokeStyle = 'hsla(' + ((hue + 40) % 360 | 0) + ',80%,75%,.5)'; ctx.lineWidth = r * .14; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r * .4, p.tilt, Math.PI, TAU); ctx.stroke(); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (k === 'ice') { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x, y - r * .95, r * .5, 0, Math.PI); ctx.fill(); ctx.fillStyle = 'rgba(180,220,255,.35)'; ctx.beginPath(); ctx.arc(x - r * .3, y + r * .2, r * .2, 0, TAU); ctx.arc(x + r * .35, y - r * .1, r * .14, 0, TAU); ctx.fill(); }
    if (k === 'lava') { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,120,30,.9)'; ctx.lineWidth = 2; for (const c of p.cracks) { ctx.beginPath(); ctx.moveTo(x, y); for (const q of c) ctx.lineTo(x + q[0] * r, y + q[1] * r); ctx.stroke(); } ctx.globalCompositeOperation = 'source-over'; }
    if (k === 'gas') {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      for (let b = 0; b < 6; b++) { ctx.fillStyle = 'hsla(' + ((hue + b * 14) % 360 | 0) + ',70%,' + (b % 2 ? 60 : 38) + '%,.45)'; ctx.fillRect(x - r, y - r + b * r * .34 + Math.sin(T * .4 + b) * 3, r * 2, r * .2); }
      ctx.restore();
      if (p.ring) { ctx.strokeStyle = 'hsla(' + ((hue + 40) % 360 | 0) + ',80%,78%,.7)'; ctx.lineWidth = r * .14; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r * .4, p.tilt, 0, Math.PI); ctx.stroke(); }
    }
  }

  /* ---------- main draw ---------- */
  function draw(A) {
    const W = V.W, H = V.H, S = V.S;
    const [top, bot] = skyColors(A);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // sun: rises at start, arcs high, sets during sunset
    const sunA = 1 - smooth((A - 1650) / 250);
    if (sunA > .01) {
      const fy = A < 300 ? lerp(.8, .2, smooth(A / 300)) : A < 900 ? .2 : lerp(.2, .92, smooth((A - 900) / 800));
      const sx = W * .72, sy = H * fy, warm = A < 160 || A > 1100;
      const sg = ctx.createRadialGradient(sx, sy, 4, sx, sy, 150 * S);
      sg.addColorStop(0, 'rgba(255,246,200,' + (.95 * sunA) + ')'); sg.addColorStop(.25, 'rgba(' + (warm ? '255,170,110' : '255,225,150') + ',' + (.5 * sunA) + ')'); sg.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,248,225,' + sunA + ')'; ctx.beginPath(); ctx.arc(sx, sy, 22 * S, 0, TAU); ctx.fill();
    }
    // space nebula + galaxy
    const nA = smooth((A - 6500) / 600) * (1 - smooth((A - 9400) / 600));
    if (nA > .01 && !lowFx) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      [[.25, .3, '168,85,247'], [.75, .55, '236,72,153'], [.4, .85, '59,130,246']].forEach(([fx, fy, c], i) => {
        const y = ((fy * H + A * .5 * (1 + i * .3)) % (H * 1.4)) - H * .2, r = H * .35, gr = ctx.createRadialGradient(W * fx, y, 0, W * fx, y, r);
        gr.addColorStop(0, 'rgba(' + c + ',' + (.24 * nA) + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }); ctx.restore();
    }
    const gA = smooth((A - 7200) / 500) * (1 - smooth((A - 9400) / 600));
    if (gA > .01 && !lowFx) {
      const cy = lerp(-H * .1, H * .9, clamp((A - 7200) / 2200, 0, 1)), cx = W * .3, c = Math.cos(T * .05), s = Math.sin(T * .05);
      const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70 * S); gg.addColorStop(0, 'rgba(255,240,255,' + (.5 * gA) + ')'); gg.addColorStop(1, 'rgba(180,120,255,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, 70 * S, 0, TAU); ctx.fill();
      for (const p of galaxy) { const x = p.x * c - p.y * s, y = (p.x * s + p.y * c) * .5; ctx.fillStyle = 'hsla(' + (p.h | 0) + ',80%,78%,' + (.75 * gA) + ')'; ctx.fillRect(cx + x * S, cy + y * S, p.s, p.s); }
    }
    // stars
    const starA = smooth((A - 1600) / 500);
    if (starA > .01) {
      const n = A > 5000 ? stars.length : Math.floor(stars.length * .55);
      for (let i = 0; i < n; i += lowFx && i % 2 ? 1 : 1) { const s = stars[i]; s.tw += .03; ctx.fillStyle = 'rgba(255,255,255,' + (starA * (.45 + .55 * Math.sin(s.tw))).toFixed(2) + ')'; const r = s.r * s.z + .4; ctx.fillRect(s.x, s.y, r, r); }
    }
    // Earth's curved limb sinking away in the upper atmosphere
    const lA = smooth((A - 1700) / 300) * (1 - smooth((A - 4800) / 800));
    if (lA > .01) {
      const R = W * 2.4, cy = H + R * .93 + Math.max(0, A - 2000) * .55;
      ctx.save(); ctx.globalAlpha = lA;
      ctx.fillStyle = '#071a44'; ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(110,180,255,.35)'; ctx.lineWidth = 16; ctx.stroke();
      ctx.strokeStyle = 'rgba(180,220,255,.85)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }
    // distant ringed planet (space)
    const pA = smooth((A - 5500) / 300) * (1 - smooth((A - 8200) / 500));
    if (pA > .01) {
      const py = lerp(-H * .2, H * 1.3, clamp((A - 5500) / 2700, 0, 1)), px = W * .76;
      ctx.save(); ctx.globalAlpha = .85 * pA; const pg = ctx.createRadialGradient(px - 30, py - 30, 10, px, py, 95 * S); pg.addColorStop(0, '#c4b5fd'); pg.addColorStop(.6, '#6d28d9'); pg.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 90 * S, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(253,230,138,.55)'; ctx.lineWidth = 5 * S; ctx.beginPath(); ctx.ellipse(px, py, 140 * S, 26 * S, -.35, 0, TAU); ctx.stroke(); ctx.restore();
    }
    // moon
    const mA = smooth((A - 1700) / 150) * (1 - smooth((A - 5800) / 500));
    if (mA > .01) {
      const mx = W * .22, my = lerp(H * .95, H * .2, smooth((A - 1700) / 500)), mr = lerp(20, 46, smooth((A - 1800) / 700)) * S;
      ctx.save(); ctx.globalAlpha = mA;
      const mg = ctx.createRadialGradient(mx, my, mr * .8, mx, my, mr * 2.6); mg.addColorStop(0, 'rgba(226,232,255,.35)'); mg.addColorStop(1, 'rgba(226,232,255,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr * 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f1f5f9'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(148,163,184,.55)';
      [[-.3, -.25, .2], [.25, .1, .26], [-.1, .4, .14]].forEach(([cx, cy, r]) => { ctx.beginPath(); ctx.arc(mx + cx * mr, my + cy * mr, r * mr, 0, TAU); ctx.fill(); });
      const cov = 1 - smooth((A - 1700) / 700);
      if (cov > .02) { ctx.fillStyle = rgb(mix(top, bot, clamp(my / H, 0, 1))); ctx.beginPath(); ctx.arc(mx + mr * .6 * cov + mr * .15, my - mr * .1, mr * 1.05, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // aurora
    const auA = smooth((A - 2800) / 400) * (1 - smooth((A - 4900) / 400));
    if (auA > .01 && !lowFx) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) {
        const base = H * (.18 + k * .17), amp = 26 + k * 10, hue = [150, 175, 280][k], gr = ctx.createLinearGradient(0, base - 70, 0, base + 120);
        gr.addColorStop(0, 'hsla(' + hue + ',95%,62%,0)'); gr.addColorStop(.35, 'hsla(' + hue + ',95%,62%,' + (.22 * auA) + ')'); gr.addColorStop(1, 'hsla(' + (hue + 40) + ',90%,55%,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x <= W + 16; x += 16) ctx.lineTo(x, base + Math.sin(x * .011 + T * .5 * (1 + k * .3) + k * 2) * amp + Math.sin(x * .027 - T * .7) * amp * .35);
        ctx.lineTo(W, base + 150); ctx.lineTo(0, base + 150); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // meteors / comets
    for (const s of shoots) {
      const a = clamp(s.life / s.max, 0, 1), tl = s.comet ? 150 : 90, len = Math.hypot(s.vx, s.vy), tx = s.x - s.vx / len * tl, ty = s.y - s.vy / len * tl;
      const lg = ctx.createLinearGradient(s.x, s.y, tx, ty); lg.addColorStop(0, s.comet ? 'rgba(150,230,255,' + a + ')' : 'rgba(255,255,255,' + a + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = lg; ctx.lineWidth = s.comet ? 4 : 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      if (s.comet) { ctx.fillStyle = 'rgba(220,250,255,' + a + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, TAU); ctx.fill(); }
    }
    // asteroid field
    const rA = smooth((A - 5200) / 300) * (1 - smooth((A - 9300) / 500));
    if (rA > .01) {
      for (const r of rocks) {
        const y = ((r.f * H * 1.3 + A * 1.2 * r.z) % (H * 1.3)) - H * .15;
        ctx.save(); ctx.translate(r.x, y); ctx.rotate(r.rot); ctx.globalAlpha = .75 * rA * r.z; ctx.fillStyle = '#475569'; ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr = r.s * S * (.75 + .25 * Math.sin(i * 2.3 + r.x)); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
    }
    // clouds
    const clA = 1 - smooth((A - 1700) / 500);
    if (clA > .01) {
      const tint = A < 300 ? mix([255, 200, 190], [255, 255, 255], A / 300) : A < 1300 ? mix([255, 255, 255], [255, 175, 135], smooth((A - 800) / 500)) : mix([255, 175, 135], [170, 150, 220], smooth((A - 1300) / 500));
      for (const c of clouds) {
        ctx.fillStyle = 'rgba(' + (tint[0] | 0) + ',' + (tint[1] | 0) + ',' + (tint[2] | 0) + ',' + (c.o * clA).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(c.x, c.y, c.w * .28, 0, TAU); ctx.arc(c.x + c.w * .24, c.y - c.w * .08, c.w * .34, 0, TAU); ctx.arc(c.x + c.w * .5, c.y, c.w * .26, 0, TAU); ctx.fill();
      }
    }
    // ground (falls away on lift-off) + birds
    drawGround(A);
    const bA = 1 - smooth((A - 1500) / 400);
    if (bA > .01) {
      ctx.strokeStyle = 'rgba(' + (A < 1300 ? '51,65,85' : '30,27,75') + ',' + bA + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (const b of birds) { const w = Math.sin(b.ph) * 3; ctx.beginPath(); ctx.moveTo(b.x - 7, b.y + w); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + 7, b.y + w); ctx.stroke(); }
    }
    // satellites
    for (const s of sats) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(S, S); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = '#2563eb'; ctx.fillRect(-26, -3, 18, 6); ctx.fillRect(8, -3, 18, 6); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -12); ctx.stroke();
      ctx.fillStyle = Math.sin(T * 5 + s.ph) > 0 ? '#f87171' : '#7f1d1d'; ctx.fillRect(-1.5, -14, 3, 3); ctx.restore();
    }
    // alien territory pieces
    const moA = smooth((A - 8600) / 300) * (1 - smooth((A - 9500) / 500));
    if (moA > .01) {
      ctx.save(); ctx.globalAlpha = .8 * moA; const mx = W * .5 + Math.sin(T * .1) * 40, my = H * .1, mw = W * .42;
      const mg = ctx.createLinearGradient(0, my - 20, 0, my + 30); mg.addColorStop(0, '#475569'); mg.addColorStop(1, '#0f172a');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(mx, my, mw, 24 * S, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(125,211,252,.35)'; ctx.beginPath(); ctx.ellipse(mx, my - 14 * S, mw * .35, 18 * S, 0, Math.PI, TAU); ctx.fill();
      for (let i = -6; i <= 6; i++) { ctx.fillStyle = 'hsl(' + ((i * 40 + T * 90) % 360 | 0) + ',100%,65%)'; ctx.beginPath(); ctx.arc(mx + i * mw / 7, my + 6 * S, 3, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    for (const u of ufos) drawUfo(u);
    if (guardian) { ctx.save(); ctx.globalAlpha = .5; ctx.font = (150 * S) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👽', guardian.x, guardian.y + Math.sin(guardian.ph) * 10); ctx.restore(); }
    // Earth as a shrinking blue dot
    const eA = smooth((A - 4800) / 400) * (1 - smooth((A - 9000) / 800));
    if (eA > .01) {
      const er = lerp(18, 3, clamp((A - 4800) / 4200, 0, 1)) * S, ex = W * .5, ey = H - 8;
      ctx.save(); ctx.globalAlpha = eA; const eg = ctx.createRadialGradient(ex - er * .3, ey - er * .3, 1, ex, ey, er); eg.addColorStop(0, '#bae6fd'); eg.addColorStop(.6, '#2563eb'); eg.addColorStop(1, '#14532d');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill(); ctx.restore();
    }
    // alien planet themes (cross-fade)
    const L = layersAt(A); if (L) for (const l of L) drawTheme(l.th, l.a, A);
  }


  /* ---------- JOURNEY levels: launch from a planet's surface into space ---------- */
  function hills(gBase, off, amp, fq, ph, col) {
    const W = V.W, H = V.H, S = V.S; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H + 500);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, gBase - off * S + Math.sin(x * fq + ph) * amp * S);
    ctx.lineTo(W, H + 500); ctx.closePath(); ctx.fill();
  }
  function drawLevelGround(pl, A) {
    const W = V.W, H = V.H, S = V.S, gBase = H * .9 + A * PX_M * .4; if (gBase > H * 1.3) return;
    const [fc, nc] = pl.ground, k = pl.gk;
    if (k === 'neon') {                                             // synthwave floor: sun + perspective grid
      const hy = gBase - 30 * S; const sg = ctx.createLinearGradient(0, hy - 90 * S, 0, hy); sg.addColorStop(0, '#fde047'); sg.addColorStop(1, '#ec4899');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(W / 2, hy, 80 * S, Math.PI, 0); ctx.fill();
      ctx.fillStyle = nc; ctx.fillRect(0, hy, W, H + 500); ctx.strokeStyle = 'rgba(244,114,182,.8)'; ctx.lineWidth = 1.5;
      for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 22 * S, hy); ctx.lineTo(W / 2 + i * 120 * S, hy + 400); ctx.stroke(); }
      for (let j = 1; j < 8; j++) { const y = hy + j * j * 7 * S; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      return;
    }
    if (k === 'gas') {                                              // floating cloud sea
      for (let layer = 0; layer < 2; layer++) { ctx.fillStyle = layer ? nc : fc; for (const d of gdec) { ctx.beginPath(); ctx.arc(d.x + layer * 20, gBase - (layer ? 4 : 26) * S + Math.sin(d.x + layer) * 8, (30 + 24 * d.s) * S, 0, TAU); ctx.fill(); } ctx.fillRect(0, gBase + (layer ? 10 : -6) * S, W, H + 500); }
      return;
    }
    hills(gBase, 34, 16, .011, 1, fc); hills(gBase, 4, 8, .017, 3, nc);
    for (const d of gdec) {
      const y = gBase - 2 * S + Math.sin(d.x * .017 + 3) * 8 * S, s = d.s * S;
      if (k === 'moon') { ctx.strokeStyle = 'rgba(40,44,54,.8)'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(60,64,74,.5)'; ctx.beginPath(); ctx.ellipse(d.x, y + 14 * S, 18 * s, 5 * s, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      else if (k === 'mars') { ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(d.x - 12 * s, y + 6); ctx.lineTo(d.x - 4 * s, y - 14 * s); ctx.lineTo(d.x + 10 * s, y - 8 * s); ctx.lineTo(d.x + 14 * s, y + 6); ctx.fill(); }
      else if (k === 'venus') { if (d.v > .6) { ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.moveTo(d.x - 26 * s, y + 8); ctx.lineTo(d.x - 6 * s, y - 40 * s); ctx.lineTo(d.x + 6 * s, y - 40 * s); ctx.lineTo(d.x + 26 * s, y + 8); ctx.fill(); ctx.fillStyle = 'rgba(251,146,60,' + (.6 + .3 * Math.sin(T * 3 + d.x)) + ')'; ctx.beginPath(); ctx.ellipse(d.x, y - 40 * s, 8 * s, 4 * s, 0, 0, TAU); ctx.fill(); } }
      else if (k === 'ice') { ctx.fillStyle = 'rgba(224,242,254,.95)'; ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(d.x - 9 * s, y + 6); ctx.lineTo(d.x, y - (22 + 24 * d.v) * s); ctx.lineTo(d.x + 9 * s, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (k === 'lava') { ctx.strokeStyle = 'rgba(251,146,60,' + (.55 + .35 * Math.sin(T * 3 + d.x)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x - 22 * s, y + 10); ctx.lineTo(d.x, y + 4); ctx.lineTo(d.x + 22 * s, y + 12); ctx.stroke(); }
      else if (k === 'crystal') { ctx.fillStyle = 'hsl(' + (pl.hue + d.v * 60 | 0) + ',80%,66%)'; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(d.x - 8 * s, y + 6); ctx.lineTo(d.x - 3 * s, y - (28 + 30 * d.v) * s); ctx.lineTo(d.x + 5 * s, y - (20 + 20 * d.v) * s); ctx.lineTo(d.x + 9 * s, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (k === 'hole') { ctx.fillStyle = '#374151'; ctx.beginPath(); ctx.moveTo(d.x - 14 * s, y + 4); ctx.lineTo(d.x - 6 * s, y - (8 + 14 * d.v) * s); ctx.lineTo(d.x + 12 * s, y - 4 * s); ctx.lineTo(d.x + 16 * s, y + 6); ctx.fill(); }
    }
  }
  function drawTraffic(alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    for (const s of shoots) { const a = clamp(s.life / s.max, 0, 1), len = Math.hypot(s.vx, s.vy), tx = s.x - s.vx / len * 90, ty = s.y - s.vy / len * 90; const lg = ctx.createLinearGradient(s.x, s.y, tx, ty); lg.addColorStop(0, 'rgba(255,255,255,' + a + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke(); }
    for (const s of sats) { ctx.save(); ctx.translate(s.x, s.y); ctx.scale(V.S, V.S); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(-6, -5, 12, 10); ctx.fillStyle = '#2563eb'; ctx.fillRect(-26, -3, 18, 6); ctx.fillRect(8, -3, 18, 6); ctx.restore(); }
    for (const u of ufos) drawUfo(u);
    ctx.restore();
  }
  function drawLevel(L, A, goal) {
    const pl = L.planet, W = V.W, H = V.H, S = V.S, p = clamp(A / goal, 0, 1);
    if (pl.type === 'earth') { draw(p * 6400); return; }                      // Earth reuses the full sky->space renderer
    const sp = smooth(p / .65);
    const top = pl.airless ? mix(pl.top, [1, 1, 8], sp) : mix(pl.top, [2, 3, 14], sp * .92), bot = pl.airless ? mix(pl.bot, [8, 8, 28], sp) : mix(pl.bot, mix(pl.top, [6, 4, 24], .4), sp);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const sa = pl.airless ? .95 : smooth((p - .2) / .4);
    if (sa > .01) for (const s of stars) { s.tw += .03; ctx.fillStyle = 'rgba(255,255,255,' + (sa * (.45 + .55 * Math.sin(s.tw))).toFixed(2) + ')'; const r = s.r * s.z + .4; ctx.fillRect(s.x, s.y, r, r); }
    if (pl.type === 'moon') {                                                  // Earth hanging in the black sky
      const ex = W * .72, ey = lerp(H * .26, H * .68, p), er = 62 * S, eg = ctx.createRadialGradient(ex - er * .3, ey - er * .3, 2, ex, ey, er);
      eg.addColorStop(0, '#bae6fd'); eg.addColorStop(.55, '#2563eb'); eg.addColorStop(1, '#0c1a4a'); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(34,197,94,.7)'; ctx.beginPath(); ctx.ellipse(ex - er * .25, ey - er * .1, er * .3, er * .22, .5, 0, TAU); ctx.ellipse(ex + er * .3, ey + er * .3, er * .2, er * .15, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(ex + er * .1, ey - er * .45, er * .4, er * .08, .2, 0, TAU); ctx.fill();
    } else if (pl.type === 'mars') {
      const sx = W * .7, sy = H * .24, sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 90 * S); sg.addColorStop(0, 'rgba(255,240,215,.95)'); sg.addColorStop(.2, 'rgba(255,200,150,.35)'); sg.addColorStop(1, 'rgba(255,170,120,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e7d3c2'; ctx.beginPath(); ctx.arc(W * .25, H * .18 + p * 40, 6 * S, 0, TAU); ctx.arc(W * .4, H * .3 + p * 60, 3.5 * S, 0, TAU); ctx.fill();
    } else if (pl.type === 'venus') {
      const sg = ctx.createRadialGradient(W * .5, H * .3, 10, W * .5, H * .3, 240 * S); sg.addColorStop(0, 'rgba(255,230,160,' + (.8 * (1 - sp)) + ')'); sg.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    }
    if (pl.th) drawTheme(pl.th, smooth((p - .03) / .3), A);
    const ca = pl.cloudy ? 1 - smooth(p / .5) : 0;
    if (ca > .01) for (const c of clouds) { ctx.fillStyle = 'rgba(' + pl.cloud + ',' + (c.o * ca).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(c.x, c.y, c.w * .28, 0, TAU); ctx.arc(c.x + c.w * .24, c.y - c.w * .08, c.w * .34, 0, TAU); ctx.arc(c.x + c.w * .5, c.y, c.w * .26, 0, TAU); ctx.fill(); }
    drawLevelGround(pl, A);
    drawTraffic(smooth((p - .3) / .3));
  }

  G.World = { init, build, update, draw, drawLevel, zoneAt, themeAt, themeFor, setLevelTheme(t) { lvlTheme = t; }, setLowFx(v) { lowFx = v; } };
})();
