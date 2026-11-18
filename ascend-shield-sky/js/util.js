/* ============================================================
   util.js — shared helpers, namespace G, view dimensions
   ============================================================ */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  G.view = { W: 400, H: 700, S: 1, dpr: 1 };   // live canvas size + UI scale
  G.PX_M = 10;                                  // pixels per meter (distance counter)
  const U = (G.U = {});
  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.pick = a => a[Math.floor(Math.random() * a.length)];
  U.smooth = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  U.fmt = n => Math.floor(n).toLocaleString('en-US');
  // seeded RNG (mulberry32): same seed -> same sequence, used for planet themes
  U.mulberry32 = function (a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  U.mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  U.rgb = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  U.hsl = (h, s, l) => {            // returns [r,g,b] 0-255
    h = ((h % 360) + 360) % 360 / 360;
    const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); };
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  };
  U.vibrate = ms => { try { if (G.Storage.data.settings.vibe && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  U.today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  U.yesterday = () => { const d = new Date(Date.now() - 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
})();
