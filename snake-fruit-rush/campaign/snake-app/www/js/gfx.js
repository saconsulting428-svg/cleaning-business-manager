/* Layered immediate-mode renderer on top of Phaser.
 * Every frame the screens redraw everything through these helpers. Each layer owns one Graphics object plus
 * pooled Text and Image objects (reused, never re-created), drawn in the order  graphics < images < text. */
(function (S) {
  'use strict';
  const C = S.C;
  const gfx = {
    scene: null, layers: [], L: null, g: null,
    init(scene, count) {
      gfx.scene = scene;
      gfx.layers = [];
      for (let i = 0; i < count; i++) {
        const base = i * 10;
        gfx.layers.push({ g: scene.add.graphics().setDepth(base), texts: [], n: 0, imgs: [], ni: 0, base: base });
      }
      gfx.use(0);
    },
    use(i) { gfx.L = gfx.layers[i]; gfx.g = gfx.L.g; },
    begin() { gfx.layers.forEach((l) => { l.g.clear(); l.n = 0; l.ni = 0; }); gfx.use(0); },
    end() {
      gfx.layers.forEach((l) => {
        for (let i = l.n; i < l.texts.length; i++) l.texts[i].setVisible(false);
        for (let i = l.ni; i < l.imgs.length; i++) l.imgs[i].setVisible(false);
      });
    },

    // ----- shapes -----
    rect(x, y, w, h, color, alpha) { gfx.g.fillStyle(C(color), alpha === undefined ? 1 : alpha); gfx.g.fillRect(x, y, w, h); },
    rrect(x, y, w, h, r, color, alpha) {
      if (w <= 0 || h <= 0) return;
      gfx.g.fillStyle(C(color), alpha === undefined ? 1 : alpha);
      gfx.g.fillRoundedRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    },
    rrectStroke(x, y, w, h, r, color, alpha, lw) {
      gfx.g.lineStyle(lw || 2, C(color), alpha === undefined ? 1 : alpha);
      gfx.g.strokeRoundedRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    },
    circle(x, y, r, color, alpha) { if (r <= 0) return; gfx.g.fillStyle(C(color), alpha === undefined ? 1 : alpha); gfx.g.fillCircle(x, y, r); },
    ring(x, y, r, color, alpha, lw) { gfx.g.lineStyle(lw || 2, C(color), alpha === undefined ? 1 : alpha); gfx.g.strokeCircle(x, y, r); },
    line(x1, y1, x2, y2, color, lw, alpha) { gfx.g.lineStyle(lw, C(color), alpha === undefined ? 1 : alpha); gfx.g.lineBetween(x1, y1, x2, y2); },
    poly(pts, color, alpha) { gfx.g.fillStyle(C(color), alpha === undefined ? 1 : alpha); gfx.g.fillPoints(pts, true); },
    arc(x, y, r, a0, a1, color, alpha, lw) {
      gfx.g.lineStyle(lw || 2, C(color), alpha === undefined ? 1 : alpha);
      gfx.g.beginPath(); gfx.g.arc(x, y, r, a0, a1, false); gfx.g.strokePath();
    },
    // vertical gradient made of thin bands
    vgrad(x, y, w, h, top, bottom, bands) {
      const n = bands || 28, a = C(top), b = C(bottom);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), ch = (s) => Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * t));
        gfx.g.fillStyle((ch(16) << 16) | (ch(8) << 8) | ch(0), 1);
        gfx.g.fillRect(x, y + (h * i) / n, w, h / n + 1);
      }
    },

    // ----- text (pooled) -----
    // opts: ox, oy (origin 0..1), bold (default true), wrap (px), align, scale, alpha, shadow (color)
    text(x, y, s, size, color, o) {
      o = o || {};
      if (o.shadow) gfx._text(x, y + (o.shadowDy === undefined ? Math.max(2, size * 0.09) : o.shadowDy), s, size, o.shadow, o, 1);
      gfx._text(x, y, s, size, color, o, 0);
    },
    _text(x, y, s, size, color, o, isShadow) {
      const L = gfx.L;
      let t = L.texts[L.n];
      if (!t) {
        t = gfx.scene.add.text(0, 0, '', { fontFamily: S.FONT });
        t.setScale(1 / S.ZOOM);               // rendered at ZOOM x size and scaled down, so it stays sharp
        t.setDepth(L.base + 6);
        L.texts.push(t);
      }
      L.n++;
      const bold = o.bold !== false, wrap = o.wrap || 0, align = o.align || 'center';
      const key = s + '|' + size + '|' + color + '|' + bold + '|' + wrap + '|' + align + '|' + S.ZOOM;
      if (t._key !== key) {
        const style = { fontFamily: S.FONT, fontSize: (size * S.ZOOM) + 'px', color: color, fontStyle: bold ? '700' : '500', align: align, lineSpacing: 2 * S.ZOOM };
        if (wrap) style.wordWrap = { width: wrap * S.ZOOM, useAdvancedWrap: true };
        t.setStyle(style);
        t.setText(String(s));
        t._key = key;
      }
      t.setOrigin(o.ox === undefined ? 0.5 : o.ox, o.oy === undefined ? 0.5 : o.oy);
      t.setScale((o.scale || 1) / S.ZOOM);
      t.setAlpha((o.alpha === undefined ? 1 : o.alpha) * (isShadow ? 0.55 : 1));
      t.setPosition(x, y);
      t.setVisible(true);
    },

    // ----- images (pooled) -----
    // opts: frame, ox, oy, rot (rad), alpha, tint, flipX, scaleX, scaleY, z (draw order inside the layer)
    img(key, x, y, w, h, o) {
      o = o || {};
      const L = gfx.L;
      let im = L.imgs[L.ni];
      if (!im) { im = gfx.scene.add.image(0, 0, key); im.setDepth(L.base + 3); L.imgs.push(im); }
      L.ni++;
      if (im._tk !== key || im._fr !== (o.frame === undefined ? '__BASE' : o.frame)) {
        im.setTexture(key, o.frame);
        im._tk = key; im._fr = o.frame === undefined ? '__BASE' : o.frame;
      }
      im.setOrigin(o.ox === undefined ? 0.5 : o.ox, o.oy === undefined ? 0.5 : o.oy);
      im.setDisplaySize(w * (o.scaleX === undefined ? 1 : o.scaleX), h * (o.scaleY === undefined ? 1 : o.scaleY));
      im.setPosition(x, y);
      im.setDepth(L.base + 3 + (o.z || 0) * 0.01);
      im.setRotation(o.rot || 0);
      im.setAlpha(o.alpha === undefined ? 1 : o.alpha);
      im.setFlipX(!!o.flipX);
      if (o.tint) im.setTint(S.C(o.tint)); else im.clearTint();
      im.setVisible(true);
    }
  };
  S.gfx = gfx;
})(window.SFR);
