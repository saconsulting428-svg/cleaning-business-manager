/* ============================================================
   chars.js — drawing + idle/move animation for every character.
   draw(ctx, id, x, y, r, t, {lean, flash, alpha})
     r    = radius, t = time in seconds, lean = -1..1 (horizontal motion)
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, TAU = Math.PI * 2;
  const F = {};

  F.balloon = (c, r, t, lean) => {
    c.rotate(lean * .12);
    const sq = 1 + Math.sin(t * 3) * .03, wv = Math.sin(t * 4.3) * 6 - lean * 10;
    c.strokeStyle = 'rgba(226,232,240,.85)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, r * 1.05); c.quadraticCurveTo(wv, r * 1.8, -wv * .6, r * 2.6); c.stroke();
    c.fillStyle = '#ef4444'; c.beginPath(); c.moveTo(-5, r * 1.1); c.lineTo(5, r * 1.1); c.lineTo(0, r * .96); c.fill();
    c.beginPath(); c.ellipse(0, 0, r * .92 * sq, r * 1.06 / sq, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.42)'; c.beginPath(); c.ellipse(-r * .32, -r * .34, r * .2, r * .36, -.45, 0, TAU); c.fill();
  };

  F.hotair = (c, r, t, lean) => {
    c.rotate(lean * .08);
    const sw = Math.sin(t * 2) * 3 - lean * 7, by = r * 1.55;
    c.strokeStyle = '#78350f'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-r * .45, r * .7); c.lineTo(-r * .2 + sw, by); c.moveTo(r * .45, r * .7); c.lineTo(r * .2 + sw, by); c.stroke();
    const fl = 5 + Math.sin(t * 25) * 2; c.fillStyle = '#fbbf24'; c.beginPath(); c.moveTo(-4, r * .95); c.lineTo(4, r * .95); c.lineTo(0, r * .95 - fl - 4); c.fill();
    c.fillStyle = '#b45309'; c.fillRect(-r * .28 + sw, by, r * .56, r * .4);
    c.fillStyle = '#f97316'; c.beginPath(); c.ellipse(0, -r * .1, r * .98, r * 1.05, 0, 0, TAU); c.fill();
    c.fillStyle = '#fde047'; c.beginPath(); c.ellipse(0, -r * .1, r * .6, r * 1.05, 0, 0, TAU); c.fill();
    c.fillStyle = '#ef4444'; c.beginPath(); c.ellipse(0, -r * .1, r * .22, r * 1.05, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-r * .5, -r * .4, r * .12, r * .3, -.4, 0, TAU); c.fill();
  };

  F.rocket = (c, r, t, lean) => {
    c.rotate(lean * .2);
    const fl = 14 + Math.sin(t * 32) * 6;
    c.fillStyle = '#fde047'; c.beginPath(); c.moveTo(-8, r); c.lineTo(8, r); c.lineTo(0, r + fl); c.fill();
    c.fillStyle = '#fb923c'; c.beginPath(); c.moveTo(-4, r); c.lineTo(4, r); c.lineTo(0, r + fl * .6); c.fill();
    c.fillStyle = '#f97316';
    c.beginPath(); c.moveTo(-r * .5, r * .1); c.lineTo(-r * .98, r * 1.05); c.lineTo(-r * .4, r * .85); c.fill();
    c.beginPath(); c.moveTo(r * .5, r * .1); c.lineTo(r * .98, r * 1.05); c.lineTo(r * .4, r * .85); c.fill();
    c.fillStyle = '#f8fafc'; c.beginPath(); c.ellipse(0, 0, r * .62, r * 1.08, 0, 0, TAU); c.fill();
    c.fillStyle = '#f97316'; c.beginPath(); c.arc(0, -r * .5, r * .54, Math.PI, 0); c.fill();
    c.fillStyle = '#38bdf8'; c.strokeStyle = '#334155'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, r * .05, r * .26, 0, TAU); c.fill(); c.stroke();
  };

  F.jelly = (c, r, t, lean) => {
    const p = (Math.sin(t * 4) + 1) / 2, rr = r * (.9 + .1 * p);
    c.rotate(lean * .1);
    c.strokeStyle = 'rgba(251,207,232,.9)'; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = -2; i <= 2; i++) { const sx = i * rr * .38, sw = Math.sin(t * 5 + i) * 5 - lean * 9; c.beginPath(); c.moveTo(sx, r * .2); c.quadraticCurveTo(sx + sw, r * 1.0, sx - sw * .6, r * (1.55 + .15 * p)); c.stroke(); }
    const g = c.createRadialGradient(-rr * .3, -rr * .4, 2, 0, 0, rr * 1.1); g.addColorStop(0, '#fbcfe8'); g.addColorStop(1, 'rgba(236,72,153,.85)');
    c.fillStyle = g; c.beginPath(); c.moveTo(-rr, r * .25); c.arc(0, r * .25, rr, Math.PI, 0); c.quadraticCurveTo(0, r * (.5 - .12 * p), -rr, r * .25); c.fill();
    c.fillStyle = '#1e293b'; c.beginPath(); c.arc(-rr * .32, -r * .1, 2.8, 0, TAU); c.arc(rr * .32, -r * .1, 2.8, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-rr * .4, -rr * .45, rr * .16, rr * .1, -.5, 0, TAU); c.fill();
  };

  F.ufo = (c, r, t, lean) => {
    c.rotate(lean * .22);
    const bg = c.createLinearGradient(0, -4, 0, r * .6); bg.addColorStop(0, '#e2e8f0'); bg.addColorStop(1, '#64748b');
    c.fillStyle = 'rgba(125,211,252,.25)'; c.beginPath(); c.ellipse(0, r * .75, r * .5, r * .22 + Math.sin(t * 8) * 2, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(165,243,252,.6)'; c.beginPath(); c.arc(0, -r * .05, r * .6, Math.PI, 0); c.fill();
    c.fillStyle = '#86efac'; c.beginPath(); c.arc(0, -r * .22, r * .26, 0, TAU); c.fill();
    c.fillStyle = '#0f172a'; c.beginPath(); c.ellipse(-r * .1, -r * .25, 2, 3.2, .4, 0, TAU); c.ellipse(r * .1, -r * .25, 2, 3.2, -.4, 0, TAU); c.fill();
    c.fillStyle = bg; c.beginPath(); c.ellipse(0, r * .22, r * 1.1, r * .38, 0, 0, TAU); c.fill();
    for (let i = -2; i <= 2; i++) { c.fillStyle = 'hsl(' + ((i * 60 + t * 160) % 360 | 0) + ',100%,65%)'; c.beginPath(); c.arc(i * r * .42, r * .27 + Math.abs(i) * 1.2, 2.6, 0, TAU); c.fill(); }
  };

  F.plane = (c, r, t, lean) => {
    c.translate(0, Math.sin(t * 3) * 2); c.rotate(lean * .5);
    const k = 1 - Math.abs(lean) * .25; c.scale(k, 1);
    const tip = [0, -r * 1.3], L = [-r * .98, r * .9], R = [r * .98, r * .9], tail = [0, r * .38];
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(L[0], L[1]); c.lineTo(tail[0], tail[1]); c.closePath(); c.fill();
    c.fillStyle = '#cbd5e1'; c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(R[0], R[1]); c.lineTo(tail[0], tail[1]); c.closePath(); c.fill();
    c.fillStyle = '#94a3b8'; c.beginPath(); c.moveTo(tail[0], tail[1]); c.lineTo(L[0] * .45, L[1] * .9); c.lineTo(0, r * 1.05); c.lineTo(R[0] * .45, R[1] * .9); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(71,85,105,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(0, r * 1.05); c.stroke();
  };

  F.bird = (c, r, t, lean) => {
    c.rotate(lean * .15);
    const fl = Math.sin(t * 11) * .55;
    c.fillStyle = '#0ea5e9';
    for (const s of [-1, 1]) { c.save(); c.translate(s * r * .6, r * .05); c.rotate(s * (.5 + fl)); c.beginPath(); c.ellipse(s * r * .38, 0, r * .55, r * .22, 0, 0, TAU); c.fill(); c.restore(); }
    c.fillStyle = '#0369a1'; for (let i = -1; i <= 1; i++) { c.beginPath(); c.ellipse(i * r * .22, r * .98, r * .1, r * .32, i * .25, 0, TAU); c.fill(); }
    c.fillStyle = '#38bdf8'; c.beginPath(); c.ellipse(0, r * .1, r * .72, r * .86, 0, 0, TAU); c.fill();
    c.fillStyle = '#bae6fd'; c.beginPath(); c.ellipse(0, r * .3, r * .46, r * .55, 0, 0, TAU); c.fill();
    c.fillStyle = '#fb923c'; c.beginPath(); c.moveTo(-r * .16, -r * .5); c.lineTo(r * .16, -r * .5); c.lineTo(0, -r * .9); c.fill();
    c.fillStyle = '#0f172a'; c.beginPath(); c.arc(-r * .25, -r * .32, 3, 0, TAU); c.arc(r * .25, -r * .32, 3, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 2; c.beginPath(); c.arc(0, -r * .1, r * .95, 0, TAU); c.stroke();   // astronaut helmet
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(0, -r * .1, r * .8, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
  };

  G.Chars = {
    draw(c, id, x, y, r, t, o) {
      o = o || {};
      c.save(); c.translate(x, y); if (o.alpha != null) c.globalAlpha = o.alpha;
      (F[id] || F.balloon)(c, r, t, o.lean || 0);
      c.restore();
      if (o.flash > 0) { c.save(); c.globalAlpha = Math.min(1, o.flash * 2); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r * 1.1, 0, TAU); c.fill(); c.restore(); }
    }
  };
})();
