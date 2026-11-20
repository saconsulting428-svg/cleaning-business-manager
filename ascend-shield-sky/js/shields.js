/* ============================================================
   shields.js — shield SKINS (9 designs, none are plain circles) + the
   gun turret that is drawn on the shield when the Shield Gun is owned.
   The collision area is still a circle of radius r, so every design is
   drawn inside r and a faint ring shows the real edge.
   draw(ctx, id, x, y, r, t, {boost, ghost, gun, aim, recoil, pulse})
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, TAU = Math.PI * 2;
  const LIST = [
    { id: 'aegis',   name: 'Aegis Hex',    price: 0,    c1: '#67e8f9', c2: '#2563eb', desc: 'Honeycomb energy plate' },
    { id: 'wings',   name: 'Angel Wings',  price: 300,  c1: '#fff7d6', c2: '#f59e0b', desc: 'Feathered wings + halo' },
    { id: 'crest',   name: 'Royal Crest',  price: 450,  c1: '#a5b4fc', c2: '#4338ca', desc: 'Knight\'s heraldic shield' },
    { id: 'gear',    name: 'Steel Gear',   price: 600,  c1: '#cbd5e1', c2: '#475569', desc: 'Spinning cog wheel' },
    { id: 'flame',   name: 'Phoenix Flame', price: 800, c1: '#fde047', c2: '#ea580c', desc: 'Ring of living fire' },
    { id: 'crystal', name: 'Prism Crystal', price: 1000, c1: '#f0abfc', c2: '#7e22ce', desc: 'Faceted gem' },
    { id: 'orbit',   name: 'Blade Orbit',  price: 1400, c1: '#86efac', c2: '#047857', desc: 'Three orbiting blades' },
    { id: 'lotus',   name: 'Lotus Bloom',  price: 1800, c1: '#fbcfe8', c2: '#db2777', desc: 'Layered petals' },
    { id: 'star',    name: 'Neon Star',    price: 2400, c1: '#fef08a', c2: '#06b6d4', desc: 'Spinning neon star' }
  ];
  const get = id => LIST.find(s => s.id === id) || LIST[0];
  const rad = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; };
  function poly(c, n, r, rot) { c.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i / n * TAU; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }
  function glowStroke(c, col, w) { c.strokeStyle = col; c.globalAlpha *= .28; c.lineWidth = w * 2.6; c.stroke(); c.globalAlpha /= .28; c.lineWidth = w; c.stroke(); }

  const S = {};
  S.aegis = (c, r, t, k) => {
    const pu = 1 + Math.sin(t * 3) * .02; c.scale(pu, pu);
    poly(c, 6, r * .95, -Math.PI / 2); c.fillStyle = rad(c, 0, 0, r * .1, r, [[0, 'rgba(255,255,255,.85)'], [.55, k.c1], [1, k.c2]]); c.globalAlpha *= .8; c.fill(); c.globalAlpha /= .8;
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.6;                                        // honeycomb
    for (let i = 0; i < 6; i++) { c.save(); c.rotate(i / 6 * TAU); c.translate(r * .5, 0); poly(c, 6, r * .22, 0); c.stroke(); c.restore(); }
    poly(c, 6, r * .22, 0); c.stroke();
    poly(c, 6, r * .95, -Math.PI / 2); glowStroke(c, k.c1, 3);
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * .95, t * 2, t * 2 + .7); c.stroke();     // sweeping shine
  };
  S.wings = (c, r, t, k) => {
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      c.save(); c.translate(s * r * .16, r * .12); c.rotate(s * (-1.15 + i * .3 + Math.sin(t * 3 + i * .3) * .05));
      c.beginPath(); c.ellipse(s * r * (.46 - i * .02), 0, r * (.56 - Math.abs(i - 1) * .05), r * .13, 0, 0, TAU);
      c.fillStyle = rad(c, 0, 0, 1, r, [[0, '#fff'], [1, i % 2 ? k.c1 : '#fff']]); c.globalAlpha *= .92; c.fill(); c.strokeStyle = k.c2; c.lineWidth = 1.4; c.stroke(); c.globalAlpha /= .92; c.restore();
    }
    c.fillStyle = rad(c, 0, 0, 1, r * .42, [[0, '#fff'], [.5, k.c1], [1, k.c2]]); c.beginPath(); c.arc(0, r * .05, r * .36 + Math.sin(t * 4) * 1.2, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(0, -r * .82, r * .3, r * .1, 0, 0, TAU); glowStroke(c, '#fde047', 3);                  // halo
  };
  S.crest = (c, r, t, k) => {
    const sc = r * .95; c.scale(sc, sc);
    c.beginPath(); c.moveTo(-.8, -.85); c.lineTo(.8, -.85); c.lineTo(.8, .05); c.quadraticCurveTo(.8, .62, 0, 1); c.quadraticCurveTo(-.8, .62, -.8, .05); c.closePath();
    c.fillStyle = rad(c, -.2, -.3, .05, 1.3, [[0, '#fff'], [.4, k.c1], [1, k.c2]]); c.globalAlpha *= .92; c.fill(); c.globalAlpha /= .92;
    c.lineWidth = .1; c.strokeStyle = '#fbbf24'; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = .05; c.beginPath(); c.moveTo(0, -.85); c.lineTo(0, .98); c.moveTo(-.8, -.2); c.lineTo(.8, -.2); c.stroke();
    c.save(); c.translate(0, -.1); c.rotate(Math.sin(t * 2) * .12); c.fillStyle = '#fde047'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? .13 : .3; i ? c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore();
  };
  S.gear = (c, r, t, k) => {
    c.rotate(t * .6); const n = 10; c.beginPath();
    for (let i = 0; i < n; i++) { const a = i / n * TAU, w = TAU / n * .22; [[a - w * 1.7, .8], [a - w, .98], [a + w, .98], [a + w * 1.7, .8]].forEach(([aa, rr], j) => { const px = Math.cos(aa) * r * rr, py = Math.sin(aa) * r * rr; (i || j) ? c.lineTo(px, py) : c.moveTo(px, py); }); }
    c.closePath(); c.fillStyle = rad(c, -r * .3, -r * .3, 1, r, [[0, '#f8fafc'], [.5, k.c1], [1, k.c2]]); c.fill(); c.strokeStyle = '#1e293b'; c.lineWidth = 2; c.stroke();
    c.beginPath(); c.arc(0, 0, r * .55, 0, TAU); c.strokeStyle = 'rgba(15,23,42,.6)'; c.lineWidth = 3; c.stroke();
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(Math.cos(i / 6 * TAU) * r * .68, Math.sin(i / 6 * TAU) * r * .68, 2.4, 0, TAU); c.fillStyle = '#1e293b'; c.fill(); }
    c.rotate(-t * .6); c.fillStyle = rad(c, 0, 0, 1, r * .35, [[0, '#fff'], [1, '#22d3ee']]); c.globalAlpha *= .5 + .3 * Math.sin(t * 5); c.beginPath(); c.arc(0, 0, r * .3, 0, TAU); c.fill(); c.globalAlpha = 1;
  };
  S.flame = (c, r, t, k) => {
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + t * (layer ? -.6 : .5), f = Math.sin(t * 9 + i * 1.7 + layer) * .12, r0 = r * .5, r1 = r * (.95 - layer * .22 + f);
      c.save(); c.rotate(a); c.beginPath(); c.moveTo(r0, -r * .14); c.quadraticCurveTo(r0 + (r1 - r0) * .6, -r * .12, r1, 0); c.quadraticCurveTo(r0 + (r1 - r0) * .6, r * .12, r0, r * .14); c.closePath();
      c.fillStyle = layer ? '#fde047' : k.c2; c.globalAlpha = layer ? .95 : .9; c.fill(); c.strokeStyle = layer ? '#f59e0b' : '#7c2d12'; c.lineWidth = 1.2; c.stroke(); c.restore();
    }
    c.globalAlpha = 1; c.fillStyle = rad(c, 0, 0, 1, r * .6, [[0, '#fff'], [.4, k.c1], [1, 'rgba(234,88,12,0)']]); c.beginPath(); c.arc(0, 0, r * .6 + Math.sin(t * 8) * 2, 0, TAU); c.fill();
  };
  S.crystal = (c, r, t, k) => {
    c.translate(0, Math.sin(t * 2) * 2);
    const P = [[0, -r], [r * .72, 0], [0, r], [-r * .72, 0]];
    c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fillStyle = rad(c, -r * .2, -r * .3, 2, r * 1.1, [[0, '#fff'], [.45, k.c1], [1, k.c2]]); c.globalAlpha *= .88; c.fill(); c.globalAlpha /= .88;
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -r); c.lineTo(0, r); c.moveTo(-r * .72, 0); c.lineTo(r * .72, 0); c.moveTo(-r * .36, -r * .5); c.lineTo(r * .36, -r * .5); c.moveTo(-r * .36, r * .5); c.lineTo(r * .36, r * .5); c.stroke();
    c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); glowStroke(c, k.c1, 2.6);
    for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1, s = (Math.sin(t * 6 + i) + 1) * 2.5; c.fillStyle = '#fff'; c.fillRect(Math.cos(a) * r * .8 - s / 2, Math.sin(a) * r * .8 - s / 2, s, s); }
  };
  S.orbit = (c, r, t, k) => {
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, r * .74, 0, TAU); c.stroke();
    for (let i = 0; i < 3; i++) { const a = t * 2.3 + i * TAU / 3; c.beginPath(); c.arc(0, 0, r * .74, a, a + .95); glowStroke(c, i % 2 ? k.c1 : '#fff', 5); c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, r * .74, a, a + .95); c.strokeStyle = i % 2 ? k.c1 : '#fff'; c.lineWidth = 5; c.stroke(); }
    c.fillStyle = rad(c, 0, 0, 1, r * .45, [[0, '#fff'], [.5, k.c1], [1, k.c2]]); c.beginPath(); c.arc(0, 0, r * .36 + Math.sin(t * 5) * 1.5, 0, TAU); c.fill();
  };
  S.lotus = (c, r, t, k) => {
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 8; i++) {
      c.save(); c.rotate(i / 8 * TAU + (ring ? .39 : 0) + t * (ring ? -.35 : .25)); c.beginPath(); c.ellipse(r * (.5 - ring * .12), 0, r * (.5 - ring * .14), r * (.2 - ring * .03), 0, 0, TAU);
      c.fillStyle = rad(c, r * .3, 0, 1, r * .9, [[0, '#fff'], [1, ring ? k.c2 : k.c1]]); c.globalAlpha *= .9; c.fill(); c.globalAlpha /= .9; c.strokeStyle = k.c2; c.lineWidth = 1.3; c.stroke(); c.restore();
    }
    c.fillStyle = rad(c, 0, 0, 1, r * .26, [[0, '#fff'], [1, '#f59e0b']]); c.beginPath(); c.arc(0, 0, r * .22 + Math.sin(t * 4) * 1, 0, TAU); c.fill();
  };
  S.star = (c, r, t, k) => {
    for (const [sc, rot, a] of [[1, t * .5, 1], [.55, -t * .8, .8]]) {
      c.save(); c.rotate(rot); c.beginPath();
      for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? .45 : 1) * r * .98 * sc; i ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); }
      c.closePath(); c.fillStyle = rad(c, 0, 0, 1, r, [[0, '#fff'], [.5, k.c1], [1, k.c2]]); c.globalAlpha *= a * .9; c.fill(); c.globalAlpha /= a * .9; glowStroke(c, sc === 1 ? k.c2 : '#fff', 2.4); c.restore();
    }
  };

  // ----- gun turret drawn ON the shield (pointing at the target) -----
  function drawGun(c, r, lv, aim, recoil) {
    c.save(); c.rotate(aim + Math.PI / 2);
    const offs = lv <= 1 ? [0] : lv <= 3 ? [-.2, .2] : [-.3, 0, .3], len = r * (.5 + .08 * lv), w = r * (lv >= 4 ? .13 : .16);
    for (const o of offs) {
      const ox = o * r, y0 = -r * .18 - len + recoil;
      c.fillStyle = '#1e293b'; c.fillRect(ox - w / 2 - 1.5, y0 - 1.5, w + 3, len + 3);
      const g = c.createLinearGradient(ox - w / 2, 0, ox + w / 2, 0); g.addColorStop(0, '#94a3b8'); g.addColorStop(.5, '#f1f5f9'); g.addColorStop(1, '#64748b'); c.fillStyle = g; c.fillRect(ox - w / 2, y0, w, len);
      c.fillStyle = lv >= 4 ? '#fb923c' : '#fde047'; c.fillRect(ox - w / 2 - 1, y0 - 3, w + 2, 4);
      if (recoil > .3) { c.fillStyle = 'rgba(253,224,71,.95)'; c.beginPath(); c.moveTo(ox - w, y0 - 3); c.lineTo(ox, y0 - 3 - r * .55); c.lineTo(ox + w, y0 - 3); c.closePath(); c.fill(); }
    }
    c.restore();
    c.fillStyle = '#0f172a'; c.beginPath(); c.arc(0, 0, r * .27, 0, TAU); c.fill();                      // turret hub
    c.fillStyle = rad(c, -r * .05, -r * .05, 1, r * .24, [[0, '#e2e8f0'], [1, '#475569']]); c.beginPath(); c.arc(0, 0, r * .22, 0, TAU); c.fill();
    c.fillStyle = '#fde047'; for (let i = 0; i < lv; i++) { c.beginPath(); c.arc((i - (lv - 1) / 2) * r * .09, 0, r * .03, 0, TAU); c.fill(); }   // level pips
  }

  G.Shields = {
    LIST, get,
    draw(c, id, x, y, r, t, o) {
      o = o || {}; const k = get(id);
      c.save(); c.translate(x, y); const pu = 1 + (o.pulse || 0) * .14; c.scale(pu, pu);
      if (o.ghost) c.globalAlpha = .5;
      let col = k; if (o.boost) col = { c1: '#fde68a', c2: '#d97706' };
      c.save(); (S[k.id] || S.aegis)(c, r, t, col); c.restore();
      c.strokeStyle = o.boost ? 'rgba(253,224,71,.7)' : 'rgba(255,255,255,.22)'; c.lineWidth = o.boost ? 3 : 1.5; if (!o.boost) c.setLineDash([4, 6]); c.beginPath(); c.arc(0, 0, r + 3, 0, TAU); c.stroke(); c.setLineDash([]);   // hit-area ring
      if (o.gun > 0) drawGun(c, r, o.gun, o.aim == null ? -Math.PI / 2 : o.aim, o.recoil || 0);
      c.restore();
    }
  };
})();
