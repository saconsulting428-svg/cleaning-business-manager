/* UI kit: buttons with press feedback, cream cards, chips, stars, toggles, icons, screen fades and toasts.
 * Hit targets are collected while drawing (immediate mode) and resolved by the input handler in main.js. */
(function (S) {
  'use strict';
  const G = () => S.gfx, U = S.UI;
  const ui = {
    buttons: [], pressed: null, pressAt: 0, now: 0,
    fade: { a: 0, phase: 0, t: 0, fn: null }, toast: null, shake: 0,

    begin(now) { ui.now = now; ui.buttons = []; },
    clearButtons() { ui.buttons = []; },                      // a modal layer calls this so only it reacts to taps
    blocked() { return ui.fade.phase !== 0; },
    hit(x, y) {
      for (let i = ui.buttons.length - 1; i >= 0; i--) {
        const b = ui.buttons[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
      }
      return null;
    },
    reg(id, x, y, w, h, fn, sound) { ui.buttons.push({ id: id, x: x, y: y, w: w, h: h, fn: fn, sound: sound }); },

    // ---------- fade between screens ----------
    go(fn) {
      if (ui.fade.phase !== 0) return;
      if (S.save.data.reduced) { fn(); return; }
      ui.fade.phase = 1; ui.fade.t = 0; ui.fade.fn = fn;
    },
    updateFade(dt) {
      const f = ui.fade;
      if (f.phase === 1) { f.t += dt; f.a = Math.min(1, f.t / 130); if (f.t >= 130) { const fn = f.fn; f.fn = null; if (fn) fn(); f.phase = 2; f.t = 0; } }
      else if (f.phase === 2) { f.t += dt; f.a = Math.max(0, 1 - f.t / 170); if (f.t >= 170) { f.phase = 0; f.a = 0; } }
    },
    drawFade() {
      if (ui.fade.a <= 0.01) return;
      G().use(6);
      G().rect(0, 0, S.W, S.H, S.UI.dark, ui.fade.a);
    },
    showToast(msg, ms) { ui.toast = { s: msg, t0: ui.now, ms: ms || 1700 }; },
    drawToast() {
      const t = ui.toast;
      if (!t) return;
      const age = ui.now - t.t0;
      if (age > t.ms) { ui.toast = null; return; }
      const a = Math.min(1, age / 140, (t.ms - age) / 220), y = 92 + (1 - S.ease.out(Math.min(1, age / 200))) * -16;
      G().use(6);
      const w = Math.min(S.W - 40, 40 + t.s.length * 9.2);
      G().rrect(S.W / 2 - w / 2, y - 20 + 4, w, 40, 20, '#000000', 0.25 * a);
      G().rrect(S.W / 2 - w / 2, y - 20, w, 40, 20, U.cream, a);
      G().rrectStroke(S.W / 2 - w / 2, y - 20, w, 40, 20, U.creamEdge, a, 2);
      G().text(S.W / 2, y, t.s, 15, U.ink, { alpha: a });
    },

    // ---------- surfaces ----------
    // Cream card (the design package's panel). o: {fill, edge, shadow, r}
    panel(x, y, w, h, o) {
      o = o || {};
      const g = G(), r = o.r === undefined ? 22 : o.r;
      g.rrect(x + 1, y + (o.shadow === undefined ? 6 : o.shadow), w - 2, h, r, '#000000', 0.26);
      g.rrect(x, y, w, h, r, o.edge || U.creamEdge);
      g.rrect(x + 3, y + 3, w - 6, h - 6, Math.max(2, r - 3), o.fill || U.cream);
      g.rrect(x + 8, y + 7, w - 16, 5, 3, '#ffffff', 0.5);        // soft top highlight
    },
    dark(x, y, w, h, o) {                                           // translucent dark card used on world backgrounds
      o = o || {};
      G().rrect(x, y, w, h, o.r === undefined ? 18 : o.r, '#000000', o.alpha === undefined ? 0.32 : o.alpha);
    },
    chip(x, y, w, h, o) {                                           // small pill. o: {fill, edge}
      o = o || {};
      G().rrect(x, y + 2, w, h, h / 2, '#000000', 0.2);
      G().rrect(x, y, w, h, h / 2, o.edge || U.creamEdge);
      G().rrect(x + 2, y + 2, w - 4, h - 4, h / 2 - 2, o.fill || U.cream);
    },

    // ---------- buttons ----------
    // style: primary | secondary | ghost | danger | dark ; o: {size, disabled, icon, id, sound:false}
    button(cx, cy, w, h, label, fn, o) {
      o = o || {};
      const g = G(), id = o.id || (label + '@' + Math.round(cx) + ',' + Math.round(cy));
      const style = o.style || 'secondary', pressed = ui.pressed === id && !o.disabled;
      const press = pressed ? 1 : 0, lift = o.disabled ? 2 : 5, x = cx - w / 2, y = cy - h / 2 + press * (lift - 1), r = Math.min(h / 2, 24);
      let top, bot, edge, base, ink = U.ink;
      if (o.disabled) { top = '#c9c5b1'; bot = '#b7b3a0'; edge = '#8f8b7d'; base = '#8f8b7d'; ink = '#6f6b5d'; }
      else if (style === 'primary') { top = U.gold1; bot = U.gold2; edge = '#fff1a6'; base = U.goldEdge; ink = '#4a3210'; }
      else if (style === 'danger') { top = '#ff8a7a'; bot = '#e5483d'; edge = '#ffc4b9'; base = '#8f241d'; ink = '#ffffff'; }
      else if (style === 'dark') { top = '#2b4a36'; bot = '#203a28'; edge = '#4b7a5c'; base = '#07170e'; ink = '#fff6dc'; }
      else if (style === 'ghost') { top = 'rgba'; bot = 'rgba'; edge = '#fff6dc'; base = null; ink = '#fff6dc'; }
      else { top = U.cream2; bot = U.cream; edge = U.creamEdge; base = '#a89560'; ink = U.ink; }
      if (style === 'ghost' && !o.disabled) {
        g.rrect(x, y, w, h, r, '#000000', pressed ? 0.35 : 0.2);
        g.rrectStroke(x, y, w, h, r, edge, 0.85, 2.5);
      } else {
        if (base) g.rrect(x, y + lift - press * (lift - 1), w, h, r, base);
        g.rrect(x, y, w, h, r, edge);
        g.rrect(x + 2.5, y + 2.5, w - 5, h - 5, Math.max(2, r - 2.5), bot);
        g.rrect(x + 2.5, y + 2.5, w - 5, (h - 5) * 0.55, Math.max(2, r - 2.5), top, 0.9);       // lighter top half = gentle gradient
        g.rrect(x + 14, y + 8, Math.min(24, w * 0.18), 3.5, 2, '#ffffff', style === 'primary' ? 0.7 : 0.45);
      }
      const size = o.size || 20;
      let lx = cx;
      if (o.icon) { ui.icon(o.icon, cx - (label ? (label.length * size * 0.28 + 10) : 0), y + h / 2, size * 1.05, ink); lx = cx + size * 0.55; }
      if (label) g.text(lx, y + h / 2 + 1, label, size, ink);
      if (!o.disabled) ui.reg(id, x - 4, cy - h / 2 - 4, w + 8, h + 8 + lift, fn, o.sound);
      return { x: x, y: y, w: w, h: h };
    },
    // Round icon button. kind: back | pause | gear | sound | close | skins | map | play | home
    round(cx, cy, r, kind, fn, o) {
      o = o || {};
      const g = G(), id = o.id || ('r:' + kind + Math.round(cx) + Math.round(cy)), pressed = ui.pressed === id;
      const y = cy + (pressed ? 3 : 0), light = o.light !== false;
      g.circle(cx, cy + 5, r, '#000000', 0.28);
      g.circle(cx, y, r, light ? U.creamEdge : '#4b7a5c');
      g.circle(cx, y, r - 2.5, light ? U.cream : '#2b4a36');
      g.circle(cx - r * 0.25, y - r * 0.42, r * 0.28, '#ffffff', light ? 0.55 : 0.18);
      ui.icon(kind, cx, y, r * 1.02, light ? U.ink : U.light);
      if (o.badge) { g.circle(cx + r * 0.7, y - r * 0.7, 8, U.red); g.text(cx + r * 0.7, y - r * 0.7, o.badge, 11, '#ffffff'); }
      ui.reg(id, cx - Math.max(r, 24) - 4, cy - Math.max(r, 24) - 4, Math.max(r, 24) * 2 + 8, Math.max(r, 24) * 2 + 12, fn, o.sound);
    },

    // ---------- icons (drawn, no image files) ----------
    icon(kind, x, y, s, color) {
      const g = G(), u = s / 20;
      switch (kind) {
        case 'back': g.line(x + 4 * u, y - 7 * u, x - 4 * u, y, color, 3.4 * u); g.line(x - 4 * u, y, x + 4 * u, y + 7 * u, color, 3.4 * u); break;
        case 'close': g.line(x - 6 * u, y - 6 * u, x + 6 * u, y + 6 * u, color, 3.4 * u); g.line(x + 6 * u, y - 6 * u, x - 6 * u, y + 6 * u, color, 3.4 * u); break;
        case 'pause': g.rrect(x - 6 * u, y - 7 * u, 4.2 * u, 14 * u, 1.5 * u, color); g.rrect(x + 1.8 * u, y - 7 * u, 4.2 * u, 14 * u, 1.5 * u, color); break;
        case 'play': g.poly([{ x: x - 5 * u, y: y - 8 * u }, { x: x - 5 * u, y: y + 8 * u }, { x: x + 8 * u, y: y }], color); break;
        case 'gear': {
          for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.line(x + Math.cos(a) * 6 * u, y + Math.sin(a) * 6 * u, x + Math.cos(a) * 9.2 * u, y + Math.sin(a) * 9.2 * u, color, 3.6 * u); }
          g.circle(x, y, 7 * u, color); g.circle(x, y, 3 * u, U.cream);
          break;
        }
        case 'sound': g.rrect(x - 8 * u, y - 3 * u, 5 * u, 6 * u, 1.5 * u, color); g.poly([{ x: x - 4 * u, y: y - 3 * u }, { x: x + 2 * u, y: y - 8 * u }, { x: x + 2 * u, y: y + 8 * u }, { x: x - 4 * u, y: y + 3 * u }], color);
          g.arc(x + 2 * u, y, 5 * u, -0.9, 0.9, color, 1, 2.4 * u); g.arc(x + 2 * u, y, 9 * u, -0.9, 0.9, color, 1, 2.4 * u); break;
        case 'mute': g.rrect(x - 8 * u, y - 3 * u, 5 * u, 6 * u, 1.5 * u, color); g.poly([{ x: x - 4 * u, y: y - 3 * u }, { x: x + 2 * u, y: y - 8 * u }, { x: x + 2 * u, y: y + 8 * u }, { x: x - 4 * u, y: y + 3 * u }], color);
          g.line(x + 5 * u, y - 5 * u, x + 11 * u, y + 5 * u, '#ef4444', 3 * u); g.line(x + 11 * u, y - 5 * u, x + 5 * u, y + 5 * u, '#ef4444', 3 * u); break;
        case 'map': g.circle(x - 6 * u, y + 5 * u, 3.2 * u, color); g.circle(x + 1 * u, y - 4 * u, 3.2 * u, color); g.circle(x + 7 * u, y + 4 * u, 3.2 * u, color);
          g.line(x - 6 * u, y + 5 * u, x + 1 * u, y - 4 * u, color, 1.8 * u, 0.8); g.line(x + 1 * u, y - 4 * u, x + 7 * u, y + 4 * u, color, 1.8 * u, 0.8); break;
        case 'home': g.poly([{ x: x - 9 * u, y: y }, { x: x, y: y - 8 * u }, { x: x + 9 * u, y: y }], color); g.rrect(x - 6 * u, y - 1 * u, 12 * u, 9 * u, 1.5 * u, color); break;
        case 'skins': g.circle(x - 6 * u, y + 4 * u, 3.6 * u, color); g.circle(x, y, 3.6 * u, color); g.circle(x + 6 * u, y - 4 * u, 4.4 * u, color); break;
        case 'retry': g.arc(x, y, 7 * u, -0.4, 4.6, color, 1, 3.2 * u); g.poly([{ x: x + 3 * u, y: y - 11 * u }, { x: x + 10 * u, y: y - 5 * u }, { x: x + 2 * u, y: y - 4 * u }], color); break;
        case 'check': g.line(x - 6 * u, y, x - 2 * u, y + 5 * u, color, 3.4 * u); g.line(x - 2 * u, y + 5 * u, x + 7 * u, y - 5 * u, color, 3.4 * u); break;
        case 'lock': g.rrect(x - 6 * u, y - 1 * u, 12 * u, 9 * u, 2.5 * u, color); g.arc(x, y - 1 * u, 4.2 * u, Math.PI, 0, color, 1, 2.6 * u); break;
        case 'next': g.poly([{ x: x - 6 * u, y: y - 8 * u }, { x: x - 6 * u, y: y + 8 * u }, { x: x + 3 * u, y: y }], color); g.rrect(x + 4 * u, y - 8 * u, 3.4 * u, 16 * u, 1.2 * u, color); break;
        case 'video': g.rrect(x - 9 * u, y - 6 * u, 13 * u, 12 * u, 3 * u, color); g.poly([{ x: x + 5 * u, y: y - 2 * u }, { x: x + 10 * u, y: y - 6 * u }, { x: x + 10 * u, y: y + 6 * u }, { x: x + 5 * u, y: y + 2 * u }], color); break;
        default: break;
      }
    },
    star(x, y, size, state, o) {                                     // state 0 empty, 1 earned ; o: {scale, rot, alpha}
      o = o || {};
      G().img('stars', x, y, size * (o.scale || 1), size * (o.scale || 1), { frame: state ? 1 : 0, rot: o.rot || 0, alpha: o.alpha === undefined ? 1 : o.alpha });
    },
    starRow(cx, cy, size, earned, now, t0, total) {                  // animated reveal when t0 is given
      const gap = size * 1.18;
      for (let i = 0; i < (total || 3); i++) {
        const x = cx + (i - ((total || 3) - 1) / 2) * gap;
        if (t0 === undefined || t0 === null) { ui.star(x, cy, size, i < earned); continue; }
        const p = S.prog(now, t0, 240 + i * 260, 320);
        if (i < earned && p > 0) { const s = p < 1 ? S.ease.back(p) : 1; ui.star(x, cy - 10 * (1 - S.ease.out(p)), size * 1.25 * (0.4 + 0.6 * s), true, { rot: (1 - p) * 0.5 }); }
        else ui.star(x, cy, size, false, { alpha: 0.9 });
      }
    },
    toggle(cx, cy, on, fn, id) {
      const g = G(), w = 56, h = 30, x = cx - w / 2, y = cy - h / 2;
      g.rrect(x, y + 2, w, h, h / 2, '#000000', 0.2);
      g.rrect(x, y, w, h, h / 2, on ? U.green : '#b8b19a');
      g.rrect(x + 2, y + 2, w - 4, h * 0.5, h / 2 - 2, '#ffffff', 0.18);
      g.circle(x + (on ? w - 15 : 15), cy, 11.5, '#ffffff');
      g.circle(x + (on ? w - 15 : 15), cy + 1, 11.5, '#000000', 0.06);
      ui.reg(id || ('t' + Math.round(cx) + Math.round(cy)), x - 8, y - 8, w + 16, h + 16, fn);
    },
    bar(x, y, w, h, frac, color, bg) {
      G().rrect(x, y, w, h, h / 2, bg || '#0b1f14', 0.55);
      if (frac > 0) G().rrect(x, y, Math.max(h, w * S.clamp(frac, 0, 1)), h, h / 2, color);
    },
    coinText(x, y, amount, size, color, o) {                          // coin icon + number
      const g = G(), s = String(amount), w = s.length * size * 0.55;
      g.img('coin', x - w / 2 - size * 0.4, y, size * 1.25, size * 1.25);
      g.text(x + size * 0.45, y + 1, s, size, color || U.ink, Object.assign({ ox: 0.5 }, o || {}));
    }
  };
  S.ui = ui;
})(window.SFR);
