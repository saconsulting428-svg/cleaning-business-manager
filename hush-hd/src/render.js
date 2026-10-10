/* HUSH HD - renderer. Reads simulation state, never changes it.
   Layers, back to front: baked environment tiles -> props and debris -> live objects -> creatures -> survivor -> dust ->
   darkness mask (flashlight, lamps, sonar cut-outs) -> emissive lights, eyes, beam -> sonar wave -> fog -> vignette/grain.
   World units are metres; one metre is PM device pixels (an integer, so baked tiles never show seams). */
const Renderer = (function () {
  'use strict';
  const G = Gfx, TAU = Math.PI * 2, Sim_ = Sim;
  let K_SURV = 0.002736, K_MON = 0.002904;                         // metres per atlas pixel (idle survivor 1.8 m, idle monster 2.3 m); overwritten from atlas.json when it loads
  const CYCLE = { run: 2.1, crouch: 1.3, monster: 2.6 };       // metres travelled per full animation loop
  const KIND_SCALE = { stalker: 1, sentinel: 1.12, listener: 0.92 };
  const clamp = G.clamp, hash = G.hash;
  const seq = function (n, p) { return Math.max(0, Math.min(n - 1, Math.floor(p * n))); };
  const frac = function (v) { return v - Math.floor(v); };
  const ease = function (t) { return t * t * (3 - 2 * t); };
  const approach = function (v, target, step) { return v < target ? Math.min(target, v + step) : Math.max(target, v - step); };
  /* a walk loop played at `phase` cycles: the current frame, and how far the next frame is blended in (only over the last part of each
     frame, so poses stay crisp and the motion between frames reads as continuous instead of stepping) */
  /* The sprite frames carry the height of the body above the floor (flight phase), but they change in steps. This shifts the drawn figure so its height
     follows a smooth curve through those samples, which removes the stepping from the vertical motion. Returns a screen-pixel offset (down is positive). */
  function bob(name, g, mul, PM) {
    const e = G.SP[name]; if (!e || !e.ok || !e.m.gaps) return 0; const m = e.m, gi = m.gaps[g.i], gj = m.gaps[g.j], target = gi + (gj - gi) * ease(g.t), baked = gi * (1 - g.b) + gj * g.b;
    return -(target - baked) * m.k * PM * (mul || 1);
  }
  function gait(n, phase) { const fp = frac(phase) * n, i = Math.floor(fp) % n, t = fp - Math.floor(fp); return { i, j: (i + 1) % n, b: t < 0.5 ? 0 : ease((t - 0.5) / 0.5), t }; }

  /* ---------- sprite blit (1:1 from a cached, pre-scaled sheet; whole device pixels) ---------- */
  function blit(c, name, fr, x, fy, dir, alpha, PM, mul, sx) {
    const e = G.SP[name]; if (!e || !e.ok) return false;
    const m = e.m, k = name.charAt(0) === 'M' ? K_MON : K_SURV, need = k * PM * (mul || 1), s = G.scaledSheet(name, need), f = s.frames[fr];
    if (!f) return false;
    const adj = need / s.q, ax = m.ax * s.q, base = m.base * s.q;
    const squash = sx !== undefined && sx < 0.995, up = Math.abs(adj - 1) > 0.012;
    c.save(); c.globalAlpha *= alpha;
    if (!squash && !up) {
      const dy = Math.round(fy - base);
      if (dir < 0) { c.setTransform(-1, 0, 0, 1, Math.round(x + ax), 0); c.drawImage(f, 0, dy); }
      else c.drawImage(f, Math.round(x - ax), dy);
    } else {
      c.translate(x, fy); c.scale(dir * adj * (squash ? sx : 1), adj); c.drawImage(f, -ax, -base);
    }
    c.restore(); return true;
  }
  /* point on the figure (flashlight lens, eye) in screen space */
  function anchor(name, fr, x, fy, dir, PM, mul) {
    const m = G.SP[name].m, k = name.charAt(0) === 'M' ? K_MON : K_SURV, p = m.pt[Math.min(fr, m.pt.length - 1)];
    return { x: x + dir * p[0] * k * PM * (mul || 1), y: fy + p[1] * k * PM * (mul || 1) };
  }

  /* ---------- painters for level objects (metres, origin at the foot of the object, y points down) ---------- */
  const O = {};
  function metal(c, x, y, w, h, base, lit) {
    const g = c.createLinearGradient(x, y, x + w, y); const b = base;
    g.addColorStop(0, G.rgba(G.shade(b, 0.55), 1)); g.addColorStop(0.28, G.rgba(G.shade(b, lit || 1.2), 1)); g.addColorStop(0.7, G.rgba(G.shade(b, 0.85), 1)); g.addColorStop(1, G.rgba(G.shade(b, 0.45), 1));
    c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  function door(c, o, st, T, open, t) {
    const w = 0.92, h = 2.5, kind = o.kind;
    c.fillStyle = '#05080a'; c.fillRect(-w / 2, -h, w, h);                                              // the opening behind the slab
    if (open > 0.02) { const g = c.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, 'rgba(8,12,16,1)'); g.addColorStop(1, 'rgba(20,28,34,1)'); c.fillStyle = g; c.fillRect(-w / 2, -h, w, h); }
    const sh = h * (1 - open);                                                                           // slab slides up into the lintel
    if (sh > 0.02) {
      c.save(); c.beginPath(); c.rect(-w / 2, -h, w, h); c.clip();
      const top = -h + (h - sh) * -1 + 0; c.translate(0, -(h - sh));
      metal(c, -w / 2, -h, w, h, kind === 'plain' ? [96, 108, 118] : kind === 'locked' ? [92, 82, 84] : [88, 96, 92], 1.25);
      c.fillStyle = 'rgba(0,0,0,0.38)'; for (let i = 1; i < 8; i++) c.fillRect(-w / 2, -h + i * 0.3, w, 0.018);                    // ribs
      c.fillStyle = 'rgba(255,255,255,0.07)'; for (let i = 1; i < 8; i++) c.fillRect(-w / 2, -h + i * 0.3 + 0.018, w, 0.01);
      c.fillStyle = '#080b0d'; c.fillRect(-0.28, -1.75, 0.56, 0.14);                                                                // viewing slit
      c.fillStyle = kind === 'plain' ? 'rgba(130,170,190,0.18)' : 'rgba(150,40,40,0.2)'; c.fillRect(-0.26, -1.73, 0.52, 0.1);
      c.fillStyle = T.hazard; c.globalAlpha = 0.75; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-w / 2 + i * 0.16, -0.06); c.lineTo(-w / 2 + i * 0.16 + 0.08, -0.06); c.lineTo(-w / 2 + i * 0.16 + 0.02, -0.0); c.lineTo(-w / 2 + i * 0.16 - 0.06, -0.0); c.fill(); } c.globalAlpha = 1;
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(-w / 2, -h, 0.03, h); c.fillRect(w / 2 - 0.03, -h, 0.03, h);
      c.restore();
    }
    c.fillStyle = '#1b2227'; c.fillRect(-w / 2 - 0.1, -h - 0.08, 0.1, h + 0.08); c.fillRect(w / 2, -h - 0.08, 0.1, h + 0.08); c.fillRect(-w / 2 - 0.1, -h - 0.14, w + 0.2, 0.1);   // steel frame
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-w / 2 - 0.1, -h - 0.14, w + 0.2, 0.012); c.fillRect(-w / 2 - 0.1, -h, 0.012, h);
    if (kind !== 'plain') { c.fillStyle = '#0b0f12'; c.fillRect(w / 2 + 0.14, -1.45, 0.16, 0.3); }                                       // reader / panel
  }
  function doorGlow(c, o, S, T, open, t) {
    const kind = o.kind; if (kind === 'plain') return;
    let col;
    if (kind === 'locked') col = open ? '#5fe08a' : S.keys > 0 ? '#4ccbe6' : '#ff3b3b';
    else col = open ? '#5fe08a' : S.power ? '#5fe08a' : (Math.sin(t * 5) > 0 ? '#ffb02e' : '#7a4a10');
    c.fillStyle = col; c.fillRect(0.5, -1.4, 0.07, 0.07);
    c.globalAlpha = 0.6; c.fillStyle = col; c.fillRect(0.49, -1.41, 0.09, 0.09); c.globalAlpha = 1;
    c.fillStyle = col; c.globalAlpha = 0.9; c.fillRect(-0.06, -2.46, 0.12, 0.05); c.globalAlpha = 1;
    if (open < 0.9) { const g = G.glowSprite(col); c.globalAlpha = 0.5 * (1 - open); c.drawImage(g, 0.18, -1.75, 0.7, 0.7); c.globalAlpha = 1; }
  }
  function wall(c, o, T) {
    const h = 3.0; metal(c, -0.5, -h, 1, h, [78, 80, 82], 1.0);
    c.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 6; i++) { c.fillRect(-0.5, -h + i * 0.5, 1, 0.025); }
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 0.03; c.beginPath(); c.moveTo(-0.45, -2.9); c.lineTo(0.45, -0.1); c.moveTo(0.45, -2.9); c.lineTo(-0.45, -0.1); c.stroke();
    c.fillStyle = T.hazard; c.globalAlpha = 0.8; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(-0.5 + i * 0.13, -0.5); c.lineTo(-0.5 + i * 0.13 + 0.07, -0.5); c.lineTo(-0.5 + i * 0.13 - 0.03, -0.3); c.lineTo(-0.5 + i * 0.13 - 0.1, -0.3); c.fill(); } c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(-0.5, -h, 0.02, h);
    c.fillStyle = '#242628'; for (const p of [[-0.4, -2.85], [0.4, -2.85], [-0.4, -0.15], [0.4, -0.15]]) { c.beginPath(); c.arc(p[0], p[1], 0.04, 0, TAU); c.fill(); }
    c.fillStyle = '#17120e'; c.beginPath(); c.moveTo(-0.5, 0); c.lineTo(-0.35, -0.25); c.lineTo(-0.1, -0.12); c.lineTo(0.2, -0.3); c.lineTo(0.5, 0); c.fill();          // rubble
  }
  function locker(c, o, S, t, hiding) {
    const w = 0.62, h = 1.95, j = hiding ? Math.sin(t * 9) * 0.003 : 0;
    c.save(); c.translate(j, 0);
    const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#202b32'); g.addColorStop(0.35, '#4a5c68'); g.addColorStop(0.7, '#364652'); g.addColorStop(1, '#151d22');
    c.fillStyle = g; c.fillRect(-w / 2, -h, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 0.025; c.strokeRect(-w / 2 + 0.02, -h + 0.02, w - 0.04, h - 0.04); c.beginPath(); c.moveTo(0, -h); c.lineTo(0, 0); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.7)'; for (let i = 0; i < 6; i++) { c.fillRect(-w / 2 + 0.07, -h + 0.14 + i * 0.045, w / 2 - 0.12, 0.022); c.fillRect(0.05, -h + 0.14 + i * 0.045, w / 2 - 0.12, 0.022); }
    c.fillStyle = '#9aa7ae'; c.fillRect(-0.075, -0.95, 0.035, 0.2); c.fillRect(0.04, -0.95, 0.035, 0.2);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-w / 2, -h, 0.012, h);
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(-w / 2, -0.06, w, 0.06);
    c.restore();
  }
  function exitDoor(c, o, S, T, t) {
    const w = 1.1, h = 2.55, powered = !o.power || S.power;
    c.fillStyle = '#04070a'; c.fillRect(-w / 2, -h, w, h);
    metal(c, -w / 2 + 0.06, -h + 0.06, w - 0.12, h - 0.06, [88, 98, 104], 1.15);
    c.fillStyle = 'rgba(0,0,0,0.45)'; for (let i = 1; i < 8; i++) c.fillRect(-w / 2 + 0.06, -h + i * 0.31, w - 0.12, 0.02);
    c.fillStyle = '#1b2227'; c.fillRect(-w / 2 - 0.1, -h - 0.1, 0.12, h + 0.1); c.fillRect(w / 2 - 0.02, -h - 0.1, 0.12, h + 0.1); c.fillRect(-w / 2 - 0.1, -h - 0.16, w + 0.2, 0.14);
    c.fillStyle = T.hazard; c.globalAlpha = 0.8; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(-w / 2 + 0.06 + i * 0.15, -0.0); c.lineTo(-w / 2 + 0.06 + i * 0.15 + 0.08, 0); c.lineTo(-w / 2 + 0.06 + i * 0.15 + 0.04, -0.1); c.lineTo(-w / 2 + 0.06 + i * 0.15 - 0.04, -0.1); c.fill(); } c.globalAlpha = 1;
    c.fillStyle = '#0a0d0f'; c.fillRect(-0.3, -h - 0.6, 0.6, 0.34);                                                     // sign housing
  }
  function exitGlow(c, o, S, T, t) {
    const powered = !o.power || S.power, col = powered ? '#4be07a' : '#c4352f';
    const g = G.glowSprite(col); c.globalAlpha = (powered ? 0.55 : 0.35) * (0.85 + 0.15 * Math.sin(t * 3)); c.drawImage(g, -1.1, -3.5, 2.2, 1.8); c.globalAlpha = 1;
    c.fillStyle = col; c.globalAlpha = powered ? 1 : 0.8 * (Math.sin(t * 4) > 0 ? 1 : 0.35); c.fillRect(-0.27, -3.13, 0.54, 0.28); c.globalAlpha = 1;
    c.fillStyle = '#041008'; c.font = '700 0.22px "Barlow Condensed", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(powered ? 'EXIT' : 'NO PWR', 0, -2.98);
    if (powered) { c.strokeStyle = col; c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4); c.lineWidth = 0.05; c.beginPath(); c.moveTo(-0.25, -0.25 - 0.02); c.lineTo(0, 0 - 0.02); c.lineTo(0.25, -0.25 - 0.02); c.stroke(); c.globalAlpha = 1; }
  }
  function stairs(c, o, W, T, t) {
    const up = W.objs[o.link].f < o.f, w = 1.9, h = 2.7, n = 9;
    c.fillStyle = 'rgba(2,4,6,0.78)'; c.fillRect(-w / 2, -h - 0.05, w, h + 0.05);
    const dir = up ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const x0 = -w / 2 + i * (w / n), y = -(i + 1) * (h / n) * (up ? 1 : 1);
      const g = c.createLinearGradient(0, y, 0, y + h / n); g.addColorStop(0, '#59646c'); g.addColorStop(1, '#2a3238');
      c.fillStyle = g; c.fillRect(up ? x0 : -x0 - w / n, y, w / n, -y);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(up ? x0 : -x0 - w / n, y, w / n, 0.025);
    }
    c.strokeStyle = '#8c969c'; c.lineWidth = 0.04; c.beginPath(); c.moveTo(up ? -w / 2 : w / 2, -0.95); c.lineTo(up ? w / 2 : -w / 2, -h + 0.3); c.stroke();
    c.fillStyle = '#1b2227'; c.fillRect(-w / 2 - 0.08, -h - 0.1, 0.08, h + 0.1); c.fillRect(w / 2, -h - 0.1, 0.08, h + 0.1);
  }
  function stairsGlow(c, o, W, T, t) {
    const up = W.objs[o.link].f < o.f; c.fillStyle = T.accent; c.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3);
    const dy = up ? -0.06 * Math.sin(t * 3) : 0.06 * Math.sin(t * 3);
    c.beginPath(); if (up) { c.moveTo(0, -3.1 + dy); c.lineTo(0.14, -2.95 + dy); c.lineTo(-0.14, -2.95 + dy); } else { c.moveTo(0, -2.95 + dy); c.lineTo(0.14, -3.1 + dy); c.lineTo(-0.14, -3.1 + dy); } c.fill(); c.globalAlpha = 1;
  }
  function vent(c, o, S, T, revealed, t) {
    const w = 0.9, h = 0.58;
    c.save(); c.translate(0, -0.35);
    c.fillStyle = '#05070a'; c.fillRect(-w / 2, -h, w, h);
    metal(c, -w / 2, -h, w, h, [88, 98, 106], 1.2); c.fillStyle = '#04060a';
    for (let i = 0; i < 6; i++) c.fillRect(-w / 2 + 0.05, -h + 0.06 + i * 0.085, w - 0.1, 0.045);
    c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 0.025; c.strokeRect(-w / 2, -h, w, h);
    c.fillStyle = '#2a3238'; for (const p of [[-w / 2 + 0.04, -h + 0.04], [w / 2 - 0.04, -h + 0.04], [-w / 2 + 0.04, -0.04], [w / 2 - 0.04, -0.04]]) { c.beginPath(); c.arc(p[0], p[1], 0.022, 0, TAU); c.fill(); }
    c.restore();
  }
  function ventGlow(c, o, S, T, t) {
    c.strokeStyle = '#4ccbe6'; c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3); c.lineWidth = 0.025; c.strokeRect(-0.45, -0.93, 0.9, 0.58); c.globalAlpha = 1;
  }
  function generator(c, o, S, T, t) {
    const run = S.power, jx = run ? Math.sin(t * 60) * 0.004 : 0, w = 1.7, h = 1.3;
    c.save(); c.translate(jx, 0);
    let g = c.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, '#5c6a56'); g.addColorStop(0.5, '#39452f'); g.addColorStop(1, '#1b2216'); c.fillStyle = g; c.fillRect(-w / 2, -h, w, h);
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(-w / 2, -h + 0.45, w, 0.03); c.fillRect(-w / 2, -0.12, w, 0.12);
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 0.03; c.strokeRect(-w / 2, -h, w, h);
    c.fillStyle = '#0b0e09'; c.beginPath(); c.arc(-0.45, -0.72, 0.3, 0, TAU); c.fill(); c.strokeStyle = '#2a3224'; c.lineWidth = 0.025; c.stroke();
    c.strokeStyle = '#1a1d16'; c.lineWidth = 0.025; for (let i = 0; i < 4; i++) { const a = (run ? t * 22 : 0) + i * Math.PI / 2; c.beginPath(); c.moveTo(-0.45, -0.72); c.lineTo(-0.45 + Math.cos(a) * 0.27, -0.72 + Math.sin(a) * 0.27); c.stroke(); }
    c.fillStyle = '#10130d'; c.fillRect(0.1, -1.15, 0.65, 0.4); c.fillStyle = '#1f3a2a'; c.fillRect(0.14, -1.11, 0.57, 0.32);
    c.strokeStyle = '#a7b59a'; c.lineWidth = 0.014; c.beginPath(); c.moveTo(0.42, -0.95); c.lineTo(0.42 + Math.cos(run ? -0.4 + Math.sin(t * 9) * 0.15 : -2.4) * 0.12, -0.95 + Math.sin(run ? -0.4 + Math.sin(t * 9) * 0.15 : -2.4) * 0.12); c.stroke();
    c.fillStyle = '#272b24'; c.fillRect(w / 2 - 0.28, -h - 0.35, 0.12, 0.38);                                           // exhaust stack
    c.fillStyle = '#17190f'; c.fillRect(0.2, -0.45, 0.55, 0.22); c.fillStyle = '#9a3a2a'; c.fillRect(0.28, -0.4, 0.14, 0.12);
    c.restore();
  }
  function generatorGlow(c, o, S, T, t) {
    const col = S.power ? '#ffb02e' : '#a02a24', fl = S.power ? (0.7 + 0.3 * Math.sin(t * 17)) : (Math.sin(t * 2) > 0.6 ? 0.8 : 0.25);
    c.fillStyle = col; c.globalAlpha = fl; c.beginPath(); c.arc(0.58, -0.35, 0.05, 0, TAU); c.fill(); c.globalAlpha = 1;
    c.globalAlpha = 0.5 * fl; c.drawImage(G.glowSprite(col), 0.1, -0.85, 1, 1); c.globalAlpha = 1;
    if (S.power) { c.fillStyle = '#7fd69b'; c.globalAlpha = 0.9; c.fillRect(0.16, -1.09, 0.5, 0.28); c.globalAlpha = 1; }
  }
  function radioSwitch(c, o, S, T, t) {
    c.fillStyle = '#10161a'; c.fillRect(-0.2, -1.6, 0.4, 0.62); metal(c, -0.18, -1.58, 0.36, 0.58, [70, 82, 90], 1.1);
    c.fillStyle = '#0a0d0f'; c.fillRect(-0.05, -1.4, 0.1, 0.3); c.fillStyle = '#c9ccc7'; c.fillRect(-0.025, -1.4, 0.05, 0.14);
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 0.02; c.strokeRect(-0.2, -1.6, 0.4, 0.62);
  }
  function radioGlow(c, o, S, T, t) {
    const ready = S.radT < 0 && S.radN === 0, col = ready ? '#4ccbe6' : '#ffb02e';
    c.fillStyle = col; c.globalAlpha = ready ? 0.7 + 0.3 * Math.sin(t * 3) : 1; c.beginPath(); c.arc(0, -1.5, 0.035, 0, TAU); c.fill(); c.globalAlpha = 1;
  }
  function speaker(c, o, S, T, t) {
    c.fillStyle = '#0c1013'; c.fillRect(-0.28, -2.45, 0.56, 0.62); metal(c, -0.26, -2.43, 0.52, 0.58, [66, 74, 80], 1.0);
    c.fillStyle = '#05070a'; c.beginPath(); c.arc(0, -2.14, 0.2, 0, TAU); c.fill();
    c.strokeStyle = '#2a3238'; c.lineWidth = 0.02; for (let i = 1; i < 4; i++) { c.beginPath(); c.arc(0, -2.14, i * 0.05, 0, TAU); c.stroke(); }
  }
  function speakerGlow(c, o, S, T, t) {
    if (S.radN <= 0 && S.radT < 0) return;
    const a = S.radN > 0 ? 1 - ((S.radTT % 1 + 1) % 1) : 0.4 + 0.3 * Math.sin(t * 20);
    c.strokeStyle = '#ffc93a'; c.globalAlpha = 0.6 * a; c.lineWidth = 0.035; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, -2.14, 0.3 + i * 0.22 + (1 - a) * 0.25, 0, TAU); c.stroke(); } c.globalAlpha = 1;
  }
  function keycard(c, o, t) {
    const b = Math.sin(t * 2.6) * 0.05; c.save(); c.translate(0, -0.95 + b); c.rotate(Math.sin(t * 1.7) * 0.12);
    c.fillStyle = '#10161a'; c.fillRect(-0.17, -0.11, 0.34, 0.22); c.fillStyle = '#3aa0c0'; c.fillRect(-0.15, -0.09, 0.3, 0.18); c.fillStyle = '#0c3040'; c.fillRect(-0.15, -0.03, 0.3, 0.05); c.fillStyle = '#f2c14e'; c.fillRect(-0.12, -0.075, 0.07, 0.05); c.restore();
  }
  function keyGlow(c, o, t) { c.globalAlpha = 0.65 + 0.2 * Math.sin(t * 3); c.drawImage(G.glowSprite('#4ccbe6'), -0.5, -1.45 + Math.sin(t * 2.6) * 0.05, 1, 1); c.globalAlpha = 1; }
  function glassDebris(c, x0, seed, T) {
    for (let k = 0; k < 9; k++) { const x = x0 + (hash(k, seed) - 0.5) * 0.9, a = hash(k, seed + 9) * Math.PI, l = 0.05 + hash(k, seed + 4) * 0.1;
      c.fillStyle = G.rgba(T.glass, 0.35 + hash(k, seed + 3) * 0.3); c.beginPath(); c.moveTo(x, -0.01); c.lineTo(x + Math.cos(a) * l, -0.01 - Math.abs(Math.sin(a)) * l * 0.9); c.lineTo(x + l * 0.6, -0.01); c.fill(); }
  }

  /* ---------- renderer instance ---------- */
  function create(canvas, onQuality) {
    const ctx = canvas.getContext('2d', { alpha: false }), dark = G.mk(8, 8), dctx = dark.getContext('2d');
    let dpr = 1, cssW = 1, cssH = 1, Wpx = 1, Hpx = 1, PM = 48, FY = 300, dk = 0.5, bright = 0;
    let W = null, theme = 0, T = G.THEMES[0], E = null, seed = 1, level = 0;
    let quality = 0, dprCap = 3, slow = 0, lastWall = 0, qHold = 0;
    const an = { lead: 0, last: 0, layout: null, camX: 0, camF: -1, cr: 0, mv: 0, face: 1, cf: [], cm: [], door: {}, deadT: undefined, openCache: -1, lampT: 0, parts: [] };
    const QUAL = [{ cap: 3, dk: 0.5, fog: 2, parts: 26, grain: 1 }, { cap: 2, dk: 0.4, fog: 1, parts: 10, grain: 0 }, { cap: 1.5, dk: 0.33, fog: 0, parts: 0, grain: 0 }];
    for (let i = 0; i < 28; i++) an.parts.push({ x: Math.random() * 8 - 4, y: Math.random() * 3.2, s: 0.4 + Math.random() * 0.8, p: Math.random() * 6.28 });

    function resize() {
      const r = canvas.parentNode.getBoundingClientRect(); cssW = Math.max(60, r.width); cssH = Math.max(60, r.height);
      const q = QUAL[quality]; dprCap = q.cap; dpr = Math.min(window.devicePixelRatio || 1, dprCap); dk = q.dk;
      Wpx = Math.round(cssW * dpr); Hpx = Math.round(cssH * dpr);
      canvas.width = Wpx; canvas.height = Hpx; canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      const land = cssW > cssH * 1.15, U = land ? Math.min(cssW / 8.4, cssH / 5.2) : Math.min(cssW / 5.4, cssH / 7.8); PM = Math.max(24, Math.round(U * dpr)); FY = Math.round(Hpx * (land ? 0.74 : 0.6));
      dark.width = Math.ceil(Wpx * dk); dark.height = Math.ceil(Hpx * dk);
      if (W) E = G.env(theme, PM);
      an.vig = null;
    }
    function setLevel(Wd, chapter, idx) { W = Wd; theme = chapter; T = G.THEMES[theme]; seed = 17 + idx * 31; level = idx; E = G.env(theme, PM); reset(); }
    function reset() { an.camF = -1; an.cr = 0; an.mv = 0; an.face = 1; an.cf = []; an.cm = []; an.door = {}; an.deadT = undefined; an.camX = W ? W.start.x : 0; an.lampT = 0; an.layout = null; an.hid = 0; an.last = 0; an.lead = 0; }
    function setBright(v) { bright = v ? 1 : 0; }
    function warm(f) { E = G.env(theme, PM); G.scaledSheet('Survivor_Run', K_SURV * PM); G.scaledSheet('Survivor_CrouchWalk', K_SURV * PM); if (W.cdefs.length) { G.scaledSheet('Monster_Run', K_MON * PM); G.scaledSheet('Monster_Roar', K_MON * PM); G.scaledSheet('Monster_Attack', K_MON * PM); } }

    /* camera: follows the survivor, leads a little in the facing direction, never shows more than a metre beyond the ends */
    function camera(f, dt) {
      const half = Wpx / PM / 2, fw = W.floors[f.S.f].w;
      an.lead += ((f.S.moving ? f.S.dir * 0.8 : an.lead) - an.lead) * Math.min(1, dt * 3.5);          // looks ahead only while moving; no jump when you stop or turn
      let tx = f.px + an.lead; const lo = half - 1.0, hi = fw - half + 1.0;
      tx = lo > hi ? fw / 2 : clamp(tx, lo, hi);
      if (an.camF !== f.S.f) { an.camX = tx; an.camF = f.S.f; } else an.camX += (tx - an.camX) * (1 - Math.exp(-dt * 9));      // frame-rate independent, stiff enough that you never feel it trailing
      an.camX = Math.round(an.camX * PM) / PM;                                                          // whole device pixels: world and sprites move together, no shimmer
    }
    const sx_ = function (x) { return Math.round((x - an.camX) * PM + Wpx / 2); };

    /* ---------- environment ---------- */
    function drawEnv(fl, f) {
      const w = fl.w, half = Wpx / PM / 2, i0 = Math.floor(an.camX - half) - 1, i1 = Math.ceil(an.camX + half) + 1;
      const wallH = E.wall.height, ceilH = E.ceil.height, floorH = E.floor.height;
      const yWall = FY - wallH, yCeil = yWall - ceilH + 1;
      ctx.fillStyle = '#020305'; ctx.fillRect(0, 0, Wpx, Hpx);
      for (let i = i0; i <= i1; i++) {
        const dx = Math.round((i - an.camX) * PM + Wpx / 2);
        if (i < 0 || i >= w) {                                                                // bulkhead beyond the ends of the level
          ctx.fillStyle = '#06090c'; ctx.fillRect(dx, yCeil, PM, Hpx); ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fillRect(dx, yCeil, 2, Hpx); continue;
        }
        const vw = Math.floor(hash(i, seed) * G.NV_WALL), vc = Math.floor(hash(i, seed + 7) * G.NV_CEIL), vf = Math.floor(hash(i, seed + 13) * G.NV_FLOOR);
        ctx.drawImage(E.ceil, vc * PM, 0, PM, ceilH, dx, yCeil, PM, ceilH);
        ctx.drawImage(E.wall, vw * PM, 0, PM, wallH, dx, yWall, PM, wallH);
        ctx.drawImage(E.floor, vf * PM, 0, PM, floorH, dx, FY, PM, floorH);
      }
      /* below the floor face, and above the ceiling: fall off to black */
      let g = ctx.createLinearGradient(0, FY + floorH - 2, 0, Hpx); g.addColorStop(0, 'rgba(2,3,5,0.6)'); g.addColorStop(0.3, 'rgba(2,3,5,1)'); ctx.fillStyle = g; ctx.fillRect(0, FY + floorH - 2, Wpx, Hpx);
      g = ctx.createLinearGradient(0, 0, 0, yCeil + 4); g.addColorStop(0.55, 'rgba(2,3,5,1)'); g.addColorStop(1, 'rgba(2,3,5,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wpx, yCeil + 4);
    }
    /* props, debris and lamps are placed deterministically on tiles that hold no object */
    function layoutFor(f) {
      if (f.cacheFloor === W && an.layout && an.layoutF === f.S.f) return an.layout;
      const fl = W.floors[f.S.f], used = {}, props = [], lamps = [];
      W.objs.forEach(function (o) { if (o.f === f.S.f) used[Math.floor(o.x)] = 1; });
      if (W.start.f === f.S.f) used[Math.floor(W.start.x)] = 1;
      for (let i = 0; i < fl.w; i++) {
        if (!used[i] && !used[i - 1] && !used[i + 1] && hash(i, seed + 21) < 0.2) props.push({ i, p: Math.floor(hash(i, seed + 22) * 8), dx: (hash(i, seed + 23) - 0.5) * 0.4 });
        if (i % 4 === 1 || hash(i, seed + 31) < 0.1) { const r = hash(i, seed + 32); lamps.push({ x: i + 0.5 + (hash(i, seed + 33) - 0.5) * 0.6, kind: r < 0.18 ? 'dead' : r < 0.4 ? 'flicker' : 'ok', ph: hash(i, seed + 34) * 100 }); }
      }
      an.layout = { props, lamps, floor: fl }; an.layoutF = f.S.f; f.cacheFloor = W; return an.layout;
    }
    function lampLevel(l, t) {
      if (l.kind === 'dead') return 0.12;
      if (l.kind === 'flicker') { const s = Math.sin(t * 13 + l.ph) * Math.sin(t * 7.3 + l.ph * 2); return s > 0.55 ? 0.15 : s > 0.3 ? 0.6 : 1; }
      return 1;
    }
    function drawProps(L, f) {
      const half = Wpx / PM / 2, ph = E.propH, pw = E.propW;
      for (const p of L.props) { const x = p.i + 0.5 + p.dx; if (Math.abs(x - an.camX) > half + 1.5) continue; ctx.drawImage(E.props, p.p * pw, 0, pw, ph, Math.round((x - an.camX) * PM + Wpx / 2 - pw / 2), FY - ph, pw, ph); }
      const fl = W.floors[f.S.f];
      ctx.save(); for (let i = Math.floor(an.camX - half) - 1; i <= Math.ceil(an.camX + half) + 1; i++) if (i >= 0 && i < fl.w && fl.noisy[i]) { ctx.setTransform(PM, 0, 0, PM, Math.round((i + 0.5 - an.camX) * PM + Wpx / 2), FY); glassDebris(ctx, 0, i * 7 + seed, T); } ctx.restore();
    }
    function lampFixtures(L, t) {
      const half = Wpx / PM / 2;
      for (const l of L.lamps) { if (Math.abs(l.x - an.camX) > half + 2) continue; const lv = lampLevel(l, t), x = Math.round((l.x - an.camX) * PM + Wpx / 2), y = FY - Math.round(2.95 * PM);
        ctx.fillStyle = '#0a0d10'; ctx.fillRect(x - PM * 0.32, y - PM * 0.08, PM * 0.64, PM * 0.1);
        ctx.fillStyle = G.rgba(T.lamp, 0.25 + 0.75 * lv); ctx.fillRect(x - PM * 0.27, y + PM * 0.02, PM * 0.54, Math.max(2, PM * 0.04)); }
    }

    /* ---------- creatures ---------- */
    function creatureView(i, c, x, f, now, dt) {
      const d = W.cdefs[i], S = f.S, mul = KIND_SCALE[d.t] || 1, moving = f.crMv[i];
      const mvA = an.cm[i] = approach(an.cm[i] || 0, moving ? 1 : 0, dt / (moving ? 0.08 : 0.1)), mE = ease(mvA);
      an.cf[i] = c.dir;
      const fdir = an.cf[i] >= 0 ? 1 : -1, sx = Math.max(0.64, Math.abs(an.cf[i]));
      const dist = Math.abs(f.px - x), hunting = c.st === Sim_.HUNT, dead = S.dead;
      let name = 'Monster_Roar', fr = 0; const layers = [];
      if (dead && hunting && dist < 1.8 && c.f === S.f) { name = 'Monster_Attack'; fr = seq(4, an.deadP); layers.push({ n: name, f: fr, a: 1 }); }
      else if (c.st === Sim_.ROAM && c.seen > 0.02 && !hunting) { name = 'Monster_Roar'; fr = seq(3, c.seen * 0.999); layers.push({ n: name, f: fr, a: 1 }); }          // it stops and stares: R1 -> R3 as it makes up its mind
      else {
        const idleFr = (c.st === Sim_.SEARCH || (hunting && !moving)) ? (Math.sin(now * 1.7 + i * 2) > 0.1 ? 1 : 0) : 0, g = gait(8, f.crPhase[i]);
        if (mE < 0.995) layers.push({ n: 'Monster_Roar', f: idleFr, a: 1 - mE });
        if (mE > 0.005) { const dy = bob('Monster_Run', g, mul, PM); layers.push({ n: 'Monster_Run', f: g.i, a: mE * (1 - g.b), dy }); if (g.b > 0.02) layers.push({ n: 'Monster_Run', f: g.j, a: mE * g.b, dy }); }
        if (mE > 0.5) { name = 'Monster_Run'; fr = g.i; } else { name = 'Monster_Roar'; fr = idleFr; }
      }
      return { name, fr, layers, x, mul, fdir, sx, mv: mvA, hunting, c, d, i, dist, dead };
    }
    function drawCreature(v, alphaMul, now) {
      ctx.save();
      const px = sx_(v.x);
      if (!v.dead) { ctx.globalAlpha = 0.5 * alphaMul; ctx.drawImage(G.glowSprite('#000000'), px - PM * 1.1 * v.mul, FY - PM * 0.15, PM * 2.2 * v.mul, PM * 0.3); ctx.globalAlpha = 1; }
      for (let k = 0; k < v.layers.length; k++) { const L = v.layers[k]; blit(ctx, L.n, L.f, px, FY + (L.dy || 0), v.fdir, alphaMul * L.a, PM, v.mul, v.sx); }
      ctx.restore();
    }

    /* ---------- survivor ---------- */
    function drawSurvivor(f, now, dt, alpha, ox, oy, scl) {
      const S = f.S, px = sx_(f.px) + (ox || 0), fy = FY + (oy || 0), face = an.face >= 0 ? 1 : -1, sq = Math.max(0.66, Math.abs(an.face)), mul = scl || 1;
      let used = null;
      if (S.dead && an.deadP >= 0 && G.ready('Survivor_Caught')) { blit(ctx, 'Survivor_Caught', seq(4, an.deadP), px, fy, face, alpha, PM, mul, sq); return { name: 'Survivor_Caught', fr: 0 }; }
      const cr = ease(clamp(an.cr, 0, 1)), mv = ease(clamp(an.mv, 0, 1));
      const using = f.useP >= 0 && an.mv < 0.3 && cr < 0.35 && G.ready('Survivor_Use');
      if (using) { const fr = seq(4, f.useP); blit(ctx, 'Survivor_Use', fr, px, fy, face, alpha, PM, mul, sq); return { name: 'Survivor_Use', fr, useFr: fr }; }
      const gs = gait(9, f.phase), gc = gait(6, f.phaseC), mC = G.SP.Survivor_CrouchWalk && G.SP.Survivor_CrouchWalk.m, idleC = mC ? mC.neutral : 1;
      const layer = function (name, g, idle, a0) {                                  // one pose family: idle frame <-> blended walk frames
        if (a0 < 0.01) return;
        if (mv < 0.995) blit(ctx, name, idle, px, fy, face, a0 * (1 - mv), PM, mul, sq);
        if (mv > 0.005) { const dy = bob(name, g, mul, PM); blit(ctx, name, g.i, px, fy + dy, face, a0 * mv * (1 - g.b), PM, mul, sq); if (g.b > 0.02) blit(ctx, name, g.j, px, fy + dy, face, a0 * mv * g.b, PM, mul, sq); }
      };
      layer('Survivor_Run', gs, 9, alpha * (1 - cr));
      layer('Survivor_CrouchWalk', gc, idleC, alpha * cr);
      an.dbg = { mv: +mv.toFixed(2), run: gs.i, next: gs.j, b: +gs.b.toFixed(2), cr: +cr.toFixed(2) };
      return { name: 'Survivor_Run', gs, gc, mv, cr, idleC };
    }
    function handPoint(f, info, px) {
      if (info.useFr !== undefined) { const q = G.SP.Survivor_Use.m.pt[info.useFr], kk = G.SP.Survivor_Use.m.k, fc = an.face >= 0 ? 1 : -1; return { x: px + fc * q[0] * kk * PM, y: FY + q[1] * kk * PM }; }
      if (info.name === 'Survivor_Caught') return { x: px, y: FY - PM * 1.1 };
      const face = an.face >= 0 ? 1 : -1, SR = G.SP.Survivor_Run, SC = G.SP.Survivor_CrouchWalk;
      if (!SR || !SR.ok || !SC || !SC.ok) return { x: px + face * 0.5 * PM, y: FY - 1.1 * PM };
      const mix = function (p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
      const walk = function (m, g, idle) { const w = mix(m.pt[g.i], m.pt[g.j], g.b); return mix(m.pt[idle], w, info.mv); };
      const a = walk(SR.m, info.gs, 9), b = walk(SC.m, info.gc, info.idleC), p = mix(a, b, info.cr), k = SR.m.k;
      return { x: px + face * p[0] * k * PM, y: FY + p[1] * k * PM };
    }
    /* procedural fallback if the sprites never load: a plain readable silhouette, so the game stays playable */
    function fallbackFigure(x, fy, dir, col, h, w) { ctx.fillStyle = col; ctx.fillRect(x - w / 2, fy - h, w, h); ctx.beginPath(); ctx.arc(x, fy - h - w * 0.35, w * 0.4, 0, TAU); ctx.fill(); }

    /* ---------- lighting ---------- */
    function lighting(f, L, hand, now, hidden) {
      const A = bright ? 0.80 : 0.89, S = f.S;
      dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, dark.width, dark.height);
      dctx.fillStyle = G.rgba(T.amb, A); dctx.fillRect(0, 0, dark.width, dark.height);
      dctx.globalCompositeOperation = 'destination-out';
      const hole = G.holeSprite(), cone = G.coneSprite(), k = dk;
      const cut = function (sp, x, y, r, a) { dctx.globalAlpha = a; dctx.drawImage(sp, (x - r) * k, (y - r) * k, r * 2 * k, r * 2 * k); };
      /* lamps */
      const half = Wpx / PM / 2;
      for (const l of L.lamps) { if (Math.abs(l.x - an.camX) > half + 3) continue; const lv = lampLevel(l, now), x = (l.x - an.camX) * PM + Wpx / 2; cut(hole, x, FY - PM * 2.1, PM * 2.9, 0.62 * lv); cut(hole, x, FY - PM * 0.35, PM * 1.9, 0.5 * lv); }
      /* survivor: flashlight cone, small pool of light, and a patch on the floor */
      const px = sx_(f.px);
      if (!hidden && !(S.dead && an.deadP > 0.4)) {
        const face = an.face >= 0 ? 1 : -1, len = 5.0 * PM, flick = S.dead ? 0.5 + 0.5 * Math.sin(now * 40) : 1;
        dctx.save(); dctx.globalAlpha = 0.95 * flick; dctx.translate(hand.x * k, hand.y * k); dctx.scale(face, 1); dctx.drawImage(cone, 0, -len * k, len * k, len * 2 * k); dctx.restore();
        cut(hole, px + face * PM * 0.1, FY - PM * 0.95, PM * 1.35, 0.55 * flick);
      }
      /* sonar: a disc of vision that grows with the wave and then fades */
      for (const p of f.pings) { if (p.f !== S.f) continue; const age = now - p.t0; if (age < 0 || age > 2.6) continue; const r = (1 - Math.pow(1 - clamp(age / 1.1, 0, 1), 2)) * 9.5 * PM; cut(hole, (p.x - an.camX) * PM + Wpx / 2, FY - PM * 1.2, r * 1.05, clamp(1.15 - age / 2.6, 0, 1) * 0.98); }
      /* creatures that are close are faintly visible: a red-lit outline lets the player read distance without handing out its position */
      for (const v of f.vis) cut(hole, sx_(v.x), FY - PM * 1.1 * v.mul, PM * 1.35 * v.mul, v.hunting ? 0.55 : 0.28);
      /* emissive things punch their own small holes */
      for (const o of f.near) { if (o.t === 'key') cut(hole, sx_(o.x), FY - PM * 0.9, PM * 0.9, 0.6); else if (o.t === 'exit') cut(hole, sx_(o.x), FY - PM * 1.4, PM * 1.7, 0.45); else if (o.t === 'gen') cut(hole, sx_(o.x), FY - PM * 0.6, PM * 1.6, S.power ? 0.6 : 0.2); else if (o.t === 'stairs' || o.t === 'locker' || o.t === 'door') cut(hole, sx_(o.x), FY - PM * 1.2, PM * 1.2, 0.2); }
      dctx.globalAlpha = 1; dctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true; ctx.drawImage(dark, 0, 0, dark.width, dark.height, 0, 0, Wpx, Hpx);
    }

    /* ---------- main frame ---------- */
    function draw(f) {
      const now = f.now, dt = clamp(now - an.last, 0.001, 0.1); an.last = now;
      const S = f.S, fl = W.floors[S.f];
      adapt();
      /* smoothed animation state */
      an.cr = approach(an.cr, S.crouch ? 1 : 0, dt / 0.16); an.mv = approach(an.mv, S.moving ? 1 : 0, dt / (S.moving ? 0.06 : 0.07));   // time-based, so a dissolve always takes the same short time
      an.face = S.dir;                                                                       // turning is an instant flip: the squash-turn made a ghosted, glitchy frame
      if (S.dead) { if (an.deadT === undefined) an.deadT = now; an.deadP = Math.min(0.999, (now - an.deadT) / 0.8); } else { an.deadT = undefined; an.deadP = -1; }
      /* the vent is its own little scene */
      if (S.vent && S.busy > 0) { drawVent(f, now); finish(f, now, S.busy / Sim_.C.VENT_T, true); return; }
      camera(f, dt);
      const L = layoutFor(f), hid = S.hid >= 0;
      drawEnv(fl, f); drawProps(L, f); lampFixtures(L, now);
      /* objects */
      ctx.save();
      const half = Wpx / PM / 2, near = f.near; near.length = 0;
      for (let i = 0; i < W.objs.length; i++) {
        const o = W.objs[i]; if (o.f !== S.f || Math.abs(o.x - an.camX) > half + 2.5) continue; near.push(o);
        const x = Math.round((o.x - an.camX) * PM + Wpx / 2);
        ctx.setTransform(PM, 0, 0, PM, x, FY);
        switch (o.t) {
          case 'door': if (o.kind === 'wall') wall(ctx, o, T); else { const t = Sim_.doorOpen(S, o) ? 1 : 0; an.door[o.id] = an.door[o.id] === undefined ? t : an.door[o.id] + (t - an.door[o.id]) * Math.min(1, dt * 4.5); door(ctx, o, S, T, an.door[o.id], now); } break;
          case 'locker': locker(ctx, o, S, now, S.hid === o.id); break;
          case 'exit': exitDoor(ctx, o, S, T, now); break;
          case 'stairs': stairs(ctx, o, W, T, now); break;
          case 'vent': if (!o.hidden || (S.rev >> o.bit) & 1) vent(ctx, o, S, T, true, now); break;
          case 'gen': generator(ctx, o, S, T, now); break;
          case 'radio': radioSwitch(ctx, o, S, T, now); break;
          case 'speaker': speaker(ctx, o, S, T, now); break;
          case 'key': if (!((S.took >> o.bit) & 1)) keycard(ctx, o, now); break;
        }
      }
      ctx.restore();
      /* creatures on this floor (those mid-stairs are shown fading) */
      f.vis.length = 0; const seenList = [];
      for (let i = 0; i < S.cr.length; i++) {
        const c = S.cr[i];
        if (c.busy > 0) { const cb = an['cb' + i] = Math.max(an['cb' + i] || 0, c.busy), cp = 1 - c.busy / cb, here = c.f === S.f && cp < 0.5, there = c.bf === S.f && cp >= 0.5;
          if (here || there) { const v = creatureView(i, c, here ? c.x : c.bx, f, now, dt); v.mv = 1; v.layers = [{ n: 'Monster_Run', f: Math.floor(frac(now * 1.2) * 8), a: 1 }]; drawCreature(v, here ? 1 - cp * 2 : (cp - 0.5) * 2, now); } continue; }
        an['cb' + i] = 0; if (c.f !== S.f) continue;
        const x = f.crx[i]; if (Math.abs(x - an.camX) > half + 3) continue;
        const v = creatureView(i, c, x, f, now, dt); drawCreature(v, 1, now); seenList.push(v);
        if (Math.abs(x - f.px) < 7.5 || v.hunting) f.vis.push(v);
      }
      /* survivor */
      let info = { name: 'Survivor_Run', gs: { i: 9, j: 9, b: 0 }, gc: { i: 1, j: 1, b: 0 }, mv: 0, cr: 0, idleC: 1 }, handPt, alpha = 1, ox = 0, oy = 0, scl = 1;     // used while hidden or fading: nothing is drawn but the beam origin must still exist
      const px = sx_(f.px);
      const stairsOut = S.busy > 0 && !S.vent && S.bf >= 0;
      if (stairsOut) { const p = 1 - S.busy / Sim_.C.STAIR_T, up = S.bf < S.f; alpha = 1 - p; oy = (up ? -1 : 1) * p * 0.35 * PM; scl = 1 - p * 0.12; ox = S.dir * p * 0.3 * PM; }
      else if (f.arrive && now - f.arrive.t0 < 0.45) { const p = clamp((now - f.arrive.t0) / 0.45, 0, 1); alpha = p; oy = (f.arrive.up ? 1 : -1) * (1 - p) * 0.3 * PM; }
      if (hid) { const hv = an.hid = (an.hid === undefined ? 0 : an.hid) + (1 - (an.hid || 0)) * Math.min(1, dt * 8); alpha = 1 - hv; } else an.hid = 0;
      if (alpha > 0.01) {
        if (G.ready('Survivor_Run')) { info = drawSurvivor(f, now, dt, alpha, ox, oy, scl); }
        else fallbackFigure(px, FY, 1, '#1b2128', 1.8 * PM * (1 - 0.35 * an.cr), 0.5 * PM);
      }
      handPt = handPoint(f, info, px); handPt.y += oy; handPt.x += ox;
      dust(f, now, dt);
      lighting(f, L, handPt, now, hid || alpha < 0.05);
      /* ---- emissive layer: drawn after the darkness so status lights, eyes and the beam stay readable ---- */
      ctx.save();
      for (let i = 0; i < near.length; i++) {
        const o = near[i], x = Math.round((o.x - an.camX) * PM + Wpx / 2); ctx.setTransform(PM, 0, 0, PM, x, FY);
        switch (o.t) {
          case 'door': if (o.kind !== 'wall') doorGlow(ctx, o, S, T, an.door[o.id] || 0, now); break;
          case 'exit': exitGlow(ctx, o, S, T, now); break;
          case 'stairs': stairsGlow(ctx, o, W, T, now); break;
          case 'vent': if (o.hidden && (S.rev >> o.bit) & 1) ventGlow(ctx, o, S, T, now); break;
          case 'gen': generatorGlow(ctx, o, S, T, now); break;
          case 'radio': radioGlow(ctx, o, S, T, now); break;
          case 'speaker': speakerGlow(ctx, o, S, T, now); break;
          case 'key': if (!((S.took >> o.bit) & 1)) keyGlow(ctx, o, now); break;
          case 'locker': if (S.hid === o.id) { ctx.fillStyle = '#cfe9f1'; ctx.globalAlpha = 0.55 + 0.3 * Math.sin(now * 3); ctx.fillRect(-0.16, -1.72, 0.05, 0.022); ctx.fillRect(0.11, -1.72, 0.05, 0.022); ctx.globalAlpha = 1; } break;
        }
      }
      ctx.restore();
      for (const l of L.lamps) { if (Math.abs(l.x - an.camX) > half + 3) continue; const lv = lampLevel(l, now), x = (l.x - an.camX) * PM + Wpx / 2; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 * lv; ctx.drawImage(G.glowSprite(rgbStr(T.lamp)), x - PM * 1.6, FY - PM * 3.0 - PM * 0.3, PM * 3.2, PM * 2.2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      beam(f, handPt, now, hid || alpha < 0.05);
      /* eyes and the red wash behind creatures */
      for (const v of seenList) eyes(v, now, f);
      /* interaction marker */
      if (f.target && !S.dead) marker(f, now);
      ripples(f, now); sonarWave(f, now);
      /* sonar silhouettes of creatures as they were when the pulse left */
      sonarShapes(f, now);
      fog(now); finish(f, now, 0, false);
    }
    const rgbStr = function (c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };
    function beam(f, hand, now, hidden) {
      if (hidden || f.S.dead && an.deadP > 0.4) return;
      const face = an.face >= 0 ? 1 : -1, len = 4.7 * PM, cone = G.coneSprite();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.085; ctx.translate(hand.x, hand.y); ctx.scale(face, 1); ctx.drawImage(cone, 0, -len * 0.62, len * 1.04, len * 1.24); ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.drawImage(G.glowSprite('#eaf6ff'), hand.x - PM * 0.12, hand.y - PM * 0.12, PM * 0.24, PM * 0.24); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function eyes(v, now, f) {
      const c = v.c, S = f.S, a = v.hunting ? 1 : c.st === Sim_.INVESTIGATE ? 0.55 : (Math.abs(v.x - f.px) < 7.5 && (f.px - v.x) * c.dir > 0) ? 0.9 : 0.25; if (a <= 0.05) return;
      const e = G.SP[v.name]; if (!e || !e.ok) return; const p = anchor(v.name, v.fr, sx_(v.x), FY, v.fdir, PM, v.mul);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (0.85 + 0.15 * Math.sin(now * 6 + v.i)); ctx.drawImage(G.glowSprite('#ff2a2a'), p.x - PM * 0.38, p.y - PM * 0.38, PM * 0.76, PM * 0.76);
      ctx.globalAlpha = a * 0.5; ctx.drawImage(G.glowSprite('#c01418'), sx_(v.x) - PM * 1.4 * v.mul, FY - PM * 2.1 * v.mul, PM * 2.8 * v.mul, PM * 2.2 * v.mul);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function marker(f, now) {
      const o = f.target.o, x = sx_(o.x); if (f.target.act === 'leave') return;
      const y = FY - PM * (o.t === 'exit' ? 3.5 : o.t === 'key' ? 1.55 : 2.25) + Math.sin(now * 5) * PM * 0.05, col = f.labelNo ? '#9aa6ae' : '#4ccbe6';
      ctx.globalAlpha = 0.9; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + PM * 0.12); ctx.lineTo(x + PM * 0.12, y - PM * 0.04); ctx.lineTo(x - PM * 0.12, y - PM * 0.04); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }
    function ripples(f, now) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = Math.max(1, PM * 0.02);
      for (const r of f.ripples) { if (r.f !== f.S.f) continue; const age = now - r.t0, d = r.kind === 'gen' || r.kind === 'radio' ? 1.0 : 0.7; if (age < 0 || age > d) continue; const p = age / d, rad = Math.min(r.r, 14) * PM * (1 - Math.pow(1 - p, 2));
        ctx.globalAlpha = (1 - p) * 0.28; ctx.strokeStyle = r.col; ctx.beginPath(); ctx.ellipse(sx_(r.x), FY - PM * 0.05, rad, rad * 0.16, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    function sonarWave(f, now) {
      const ring = G.ringSprite();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const p of f.pings) { if (p.f !== f.S.f) continue; const age = now - p.t0; if (age < 0 || age > 1.3) continue; const e = 1 - Math.pow(1 - clamp(age / 1.1, 0, 1), 2), r = e * 9.5 * PM, a = clamp(1 - age / 1.3, 0, 1); const x = sx_(p.x), y = FY - PM * 1.2;
        ctx.globalAlpha = a * 0.9; ctx.drawImage(ring, x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = a * 0.08; ctx.drawImage(G.glowSprite('#4ccbe6'), x - r, y - r, r * 2, r * 2); }
      ctx.restore();
    }
    function sonarShapes(f, now) {
      for (const p of f.pings) { if (p.f !== f.S.f) continue; const age = now - p.t0; if (age < 0 || age > 2.6) continue; const reach = (1 - Math.pow(1 - clamp(age / 1.1, 0, 1), 2)) * 9.5;
        for (const s of p.cr) { if (s.f !== f.S.f || Math.abs(s.x - p.x) > reach) continue; const d = W.cdefs[s.i], mul = KIND_SCALE[d.t] || 1, fr = Math.floor(frac(s.ph) * 8) % 8;
          const sheet = G.SP.Monster_Run && G.SP.Monster_Run.ok ? 'Monster_Run' : null; if (!sheet) continue;
          const sc = G.scaledSheet('Monster_Run', K_MON * PM * mul), tin = G.tintedFrame('Monster_Run', fr, K_MON * PM * mul, 'rgb(255,70,70)');
          const m = G.SP.Monster_Run.m, ax = m.ax * sc.q, base = m.base * sc.q, x = sx_(s.x), dir = s.dir;
          ctx.save(); ctx.globalAlpha = clamp(1.1 - age / 2.6, 0, 1) * 0.7; ctx.globalCompositeOperation = 'lighter';
          if (dir < 0) { ctx.setTransform(-1, 0, 0, 1, Math.round(x + ax), 0); ctx.drawImage(tin, 0, Math.round(FY - base)); } else ctx.drawImage(tin, Math.round(x - ax), Math.round(FY - base));
          ctx.restore(); } }
    }
    function dust(f, now, dt) {
      const n = QUAL[quality].parts; if (!n) return; ctx.save(); ctx.fillStyle = 'rgba(190,215,235,1)';
      for (let i = 0; i < n; i++) { const p = an.parts[i]; p.p += dt * p.s * 0.5; const x = (an.camX + p.x + Math.sin(p.p) * 0.4 + ((now * p.s * 0.05) % 8) - 4), px = (x - an.camX) * PM + Wpx / 2, py = FY - PM * (0.3 + p.y) + Math.cos(p.p * 1.3) * PM * 0.1;
        ctx.globalAlpha = 0.18 * (0.5 + 0.5 * Math.sin(p.p * 2)); ctx.fillRect(px, py, Math.max(1, PM * 0.018), Math.max(1, PM * 0.018)); }
      ctx.restore();
    }
    const fogTile = {};
    function fog(now) {
      const nf = QUAL[quality].fog; if (!nf) return; const T_ = G.textures().fog, ph = Math.ceil(PM * 2.2), key = PM; let tile = fogTile[key];
      if (!tile) { const tw = Math.round(PM * 6); tile = fogTile[key] = G.mk(tw, ph); const x = tile.getContext('2d'); x.drawImage(T_, 0, 0, tw, ph);
        const g = x.createLinearGradient(0, 0, 0, ph); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,1)'); g.addColorStop(0.65, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, tile.width, ph); }
      const tw = tile.width; ctx.save();
      for (let l = 0; l < nf; l++) { const sp = (l ? -0.5 : 0.35) * PM * 0.35, off = (((now * sp + l * 97) % tw) + tw) % tw; ctx.globalAlpha = l ? 0.05 : 0.07; for (let x = -off; x < Wpx; x += tw) ctx.drawImage(tile, Math.round(x), FY - PM * (l ? 1.9 : 1.2)); }
      ctx.restore();
    }
    /* duct interior while crawling through a vent: the crawl sheet plays against sliding grille light */
    function drawVent(f, now) {
      const S = f.S, p = 1 - S.busy / Sim_.C.VENT_T, dir = S.bf >= 0 && W.objs.find(function (o) { return o.t === 'vent' && o.f === S.bf && Math.abs(o.x - S.bx) < 1e-6; }) ? (S.bx >= S.x ? 1 : -1) : 1;
      ctx.fillStyle = '#05080a'; ctx.fillRect(0, 0, Wpx, Hpx);
      const cy = FY - PM * 0.6, th = PM * 1.55, y0 = cy - th / 2;
      let g = ctx.createLinearGradient(0, y0, 0, y0 + th); g.addColorStop(0, '#15191d'); g.addColorStop(0.08, '#4a555d'); g.addColorStop(0.5, '#262d33'); g.addColorStop(0.92, '#3a444b'); g.addColorStop(1, '#0b0d10'); ctx.fillStyle = g; ctx.fillRect(0, y0, Wpx, th);
      const scroll = p * 7 * PM * dir; ctx.fillStyle = 'rgba(0,0,0,0.45)'; for (let x = -((scroll % (PM * 2)) + PM * 2); x < Wpx + PM * 2; x += PM * 2) ctx.fillRect(Math.round(x), y0, Math.max(2, PM * 0.04), th);
      for (let x = -((scroll * 0.6 % (PM * 3.5)) + PM * 3.5); x < Wpx + PM * 3.5; x += PM * 3.5) { const gg = ctx.createLinearGradient(x, 0, x + PM * 0.9, 0); gg.addColorStop(0, 'rgba(120,180,210,0)'); gg.addColorStop(0.5, 'rgba(120,180,210,0.16)'); gg.addColorStop(1, 'rgba(120,180,210,0)'); ctx.fillStyle = gg; ctx.fillRect(x, y0, PM * 0.9, th); }
      const px = Wpx / 2, cf = Math.floor(frac(p * 2.2) * 6) % 6; const sh = G.glowSprite('#000'); ctx.globalAlpha = 0.5; ctx.drawImage(sh, px - PM * 1.2, y0 + th - PM * 0.22, PM * 2.4, PM * 0.3); ctx.globalAlpha = 1;
      if (G.ready('Survivor_Crawl')) blit(ctx, 'Survivor_Crawl', cf, px, y0 + th - PM * 0.08, dir, 1, PM, 1, 1); else fallbackFigure(px, y0 + th, 1, '#1b2128', 0.5 * PM, 1.2 * PM);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12; ctx.drawImage(G.coneSprite(), dir > 0 ? px + PM * 0.9 : px - PM * 0.9 - PM * 4, cy - PM * 1.2, PM * 4, PM * 2.4); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function finish(f, now, ventBusyP, inVent) {
      const S = f.S;
      /* vignette */
      if (!an.vig) { an.vig = G.vignetteSprite([0, 0, 0], 0.22, 0.62); }
      ctx.drawImage(an.vig, 0, 0, Wpx, Hpx);
      if (f.threat > 0.02 || f.hunted) { const a = f.hunted ? 0.3 + 0.12 * Math.sin(now * 9) : f.threat * 0.22; ctx.globalAlpha = a; ctx.drawImage(G.vignetteSprite([160, 12, 22], 0.2, 0.9), 0, 0, Wpx, Hpx); ctx.globalAlpha = 1; }
      if (QUAL[quality].grain) { const gt = G.textures().grain; ctx.save(); ctx.globalAlpha = 0.1; const ox = -Math.floor(Math.random() * 64), oy = -Math.floor(Math.random() * 64); for (let y = oy; y < Hpx; y += 128) for (let x = ox; x < Wpx; x += 128) ctx.drawImage(gt, x, y); ctx.restore(); }
      let fade = f.fade || 0;
      if (inVent) { const p = 1 - ventBusyP; fade = Math.max(fade, p < 0.15 ? 1 - p / 0.15 : p > 0.88 ? (p - 0.88) / 0.12 : 0); }
      else if (S.busy > 0 && !S.vent && S.bf >= 0) { fade = Math.max(fade, (1 - S.busy / Sim_.C.STAIR_T) * 0.85); }
      if (fade > 0.003) { ctx.fillStyle = 'rgba(2,3,5,' + Math.min(1, fade) + ')'; ctx.fillRect(0, 0, Wpx, Hpx); }
    }
    /* frame-time watchdog: drop effects, never raise them again within a session */
    function adapt() {
      const t = performance.now(), d = t - lastWall; lastWall = t;
      if (d > 0 && d < 250) { slow = d > 26 ? slow + d : Math.max(0, slow - d * 1.5); if (slow > 2400 && quality < QUAL.length - 1 && t > qHold) { quality++; slow = 0; qHold = t + 3000; resize(); if (onQuality) onQuality(quality); } }
    }
    return { resize, setLevel, reset, setBright, warm, draw, get quality() { return quality; }, set quality(q) { quality = clamp(q, 0, QUAL.length - 1); resize(); }, metrics() { return { PM, FY, Wpx, Hpx, dpr, quality }; }, debug: an,
      newFrame: function () { return { near: [], vis: [], cacheFloor: null }; } };
  }

  /* ---------- posters for menus: a lit corner of the facility with the characters in it ---------- */
  function poster(cv, o) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2.5), w = Math.max(40, Math.round(r.width * dpr)), h = Math.max(40, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext('2d'), th = o.chapter || 0, T = G.THEMES[th], PM = Math.max(24, Math.round((o.pm || h / 4.4)));
    const E = G.env(th, PM), fy = Math.round(h * (o.fy || 0.78)), seed = 5 + (o.seed || 0) + th * 13, t = o.t || 0;
    c.fillStyle = '#020305'; c.fillRect(0, 0, w, h);
    const wallH = E.wall.height, ceilH = E.ceil.height, floorH = E.floor.height, n = Math.ceil(w / PM) + 2, off = Math.round((o.scroll || 0) * PM) % PM;
    for (let i = 0; i < n; i++) { const dx = i * PM - off, ii = i + (o.shift || 0);
      c.drawImage(E.ceil, Math.floor(hash(ii, seed + 7) * G.NV_CEIL) * PM, 0, PM, ceilH, dx, fy - wallH - ceilH + 1, PM, ceilH);
      c.drawImage(E.wall, Math.floor(hash(ii, seed) * G.NV_WALL) * PM, 0, PM, wallH, dx, fy - wallH, PM, wallH);
      c.drawImage(E.floor, Math.floor(hash(ii, seed + 13) * G.NV_FLOOR) * PM, 0, PM, floorH, dx, fy, PM, floorH);
      if (hash(ii, seed + 21) < 0.22) c.drawImage(E.props, Math.floor(hash(ii, seed + 22) * 8) * E.propW, 0, E.propW, E.propH, dx + PM / 2 - E.propW / 2, fy - E.propH, E.propW, E.propH); }
    let g = c.createLinearGradient(0, fy + floorH, 0, h); g.addColorStop(0, 'rgba(2,3,5,0.5)'); g.addColorStop(0.3, 'rgba(2,3,5,1)'); c.fillStyle = g; c.fillRect(0, fy + floorH, w, h);
    g = c.createLinearGradient(0, 0, 0, fy - wallH - ceilH + 6); g.addColorStop(0.5, 'rgba(2,3,5,1)'); g.addColorStop(1, 'rgba(2,3,5,0)'); c.fillStyle = g; c.fillRect(0, 0, w, fy - wallH - ceilH + 6);
    const sxp = Math.round(w * (o.sx === undefined ? 0.3 : o.sx)), mxp = Math.round(w * (o.mx === undefined ? 0.78 : o.mx));
    const mk_ = o.mk || 'stalker', mul = KIND_SCALE[mk_] * (o.ms || 1);
    let hand = { x: sxp + PM * 0.5, y: fy - PM * 1.05 };
    if (o.creature !== false) { const nm = o.pose === 'attack' ? 'Monster_Attack' : 'Monster_Roar', fr = o.pose === 'attack' ? 1 : o.roar === undefined ? 0 : o.roar; blit(c, nm, fr, mxp, fy, -1, 1, PM, mul); }
    if (o.survivor !== false) { if (o.sPose === 'caught') blit(c, 'Survivor_Caught', o.sFrame || 1, sxp, fy, 1, 1, PM, 1); else if (o.sPose === 'crouch') blit(c, 'Survivor_CrouchWalk', 1, sxp, fy, 1, 1, PM, 1); else if (o.sPose === 'run') blit(c, 'Survivor_Run', Math.floor(frac(t * 1.4) * 9) % 9, sxp, fy, 1, 1, PM, 1); else blit(c, 'Survivor_Run', 9, sxp, fy, 1, 1, PM, 1); }
    const cone = G.coneSprite(), len = PM * 5.2;
    let D = poster._D; if (!D) D = poster._D = document.createElement('canvas'); if (D.width !== w || D.height !== h) { D.width = w; D.height = h; } const d = D.getContext('2d'); d.setTransform(1, 0, 0, 1, 0, 0); d.globalCompositeOperation = 'source-over'; d.globalAlpha = 1; d.clearRect(0, 0, w, h); d.fillStyle = G.rgba(T.amb, o.dark === undefined ? 0.86 : o.dark); d.fillRect(0, 0, w, h); d.globalCompositeOperation = 'destination-out';
    const hole = G.holeSprite();
    if (o.survivor !== false && !o.noBeam) { d.save(); d.globalAlpha = 0.95; d.translate(hand.x, hand.y); d.drawImage(cone, 0, -len, len, len * 2); d.restore(); d.globalAlpha = 0.55; d.drawImage(hole, sxp - PM * 1.3, fy - PM * 2.2, PM * 2.6, PM * 2.6); }
    d.globalAlpha = 0.6; for (let i = 0; i < n; i += 4) d.drawImage(hole, i * PM - PM * 1.4, fy - PM * 4, PM * 2.8, PM * 2.8);
    if (o.creature !== false) { d.globalAlpha = o.bl === undefined ? 0.55 : o.bl; d.drawImage(hole, mxp - PM * 1.5, fy - PM * 3.2, PM * 3, PM * 3.2); }
    c.drawImage(D, 0, 0);
    if (o.creature !== false) { const nm = o.pose === 'attack' ? 'Monster_Attack' : 'Monster_Roar', fr = o.pose === 'attack' ? 1 : o.roar === undefined ? 0 : o.roar; const p = anchor(nm, fr, mxp, fy, -1, PM, mul); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.9; c.drawImage(G.glowSprite('#ff2a2a'), p.x - PM * 0.4, p.y - PM * 0.4, PM * 0.8, PM * 0.8); c.globalAlpha = 0.35; c.drawImage(G.glowSprite('#c01418'), mxp - PM * 1.6, fy - PM * 2.6, PM * 3.2, PM * 2.8); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    c.drawImage(G.vignetteSprite([0, 0, 0], 0.2, 0.7), 0, 0, w, h);
    if (o.fadeBottom) { const gg = c.createLinearGradient(0, h * (1 - o.fadeBottom), 0, h); gg.addColorStop(0, 'rgba(3,5,9,0)'); gg.addColorStop(1, 'rgba(3,5,9,1)'); c.fillStyle = gg; c.fillRect(0, 0, w, h); }
    if (o.fadeLeft) { const gg = c.createLinearGradient(0, 0, w * o.fadeLeft, 0); gg.addColorStop(0, 'rgba(3,5,9,0.92)'); gg.addColorStop(1, 'rgba(3,5,9,0)'); c.fillStyle = gg; c.fillRect(0, 0, w, h); }
    if (o.red) { c.fillStyle = 'rgba(120,6,14,' + o.red + ')'; c.fillRect(0, 0, w, h); }
  }

  return { create, poster, blit };
})();
