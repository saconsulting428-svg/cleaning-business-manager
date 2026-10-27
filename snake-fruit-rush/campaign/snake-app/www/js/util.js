/* Snake Fruit Rush - shared helpers. Everything lives in the global SFR namespace (plain scripts, no bundler). */
window.SFR = window.SFR || {};
(function (S) {
  'use strict';
  S.W = 450;                                   // logical width; the height is chosen at start-up from the screen shape
  S.H = 800;
  S.ZOOM = 2;
  S.version = '2.0';

  S.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  S.lerp = (a, b, t) => a + (b - a) * t;
  S.rnd = (n) => Math.floor(Math.random() * n);
  S.C = (hex) => parseInt(hex.slice(1), 16);
  S.ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    // 0 -> 1 -> 0 pulse
    pulse: (t) => Math.sin(Math.PI * S.clamp(t, 0, 1))
  };
  // progress 0..1 of an animation that starts `delay` ms after `t0` and lasts `dur` ms
  S.prog = (now, t0, delay, dur) => S.clamp((now - t0 - delay) / dur, 0, 1);
  // f < 0 darker, f > 0 lighter
  S.shade = (hex, f) => {
    const n = S.C(hex), m = f < 0 ? 0 : 255, a = Math.abs(f);
    const ch = (v) => Math.round(v + (m - v) * a);
    return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
  };
  S.mix = (h1, h2, t) => {
    const a = S.C(h1), b = S.C(h2), ch = (x, y) => Math.round(x + (y - x) * t);
    return '#' + ((1 << 24) | (ch(a >> 16, b >> 16) << 16) | (ch((a >> 8) & 255, (b >> 8) & 255) << 8) | ch(a & 255, b & 255)).toString(16).slice(1);
  };
  S.hsl = (h, s2, l) => {
    h = ((h % 360) + 360) % 360; s2 /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s2 * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return '#' + ((1 << 24) | (f(0) << 16) | (f(8) << 8) | f(4)).toString(16).slice(1);
  };
  S.num = (v, lo, hi, dflt) => { v = Math.floor(Number(v)); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt; };
  S.FONT = 'Fredoka, Verdana, "Trebuchet MS", sans-serif';
  S.reducedMotion = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
})(window.SFR);
