/* Turns the embedded SVG art into Phaser textures (rasterised once, 3x, then scaled down for sharp tiles). */
(function (S) {
  'use strict';
  const RS = 3;                                    // raster scale: 1 SVG unit = 3 px
  const recolor = (svg, from, to) => {
    let out = svg;
    from.forEach((c, i) => { out = out.split(c).join('\u0000' + i + '\u0000'); });   // two-step so swaps never chain
    to.forEach((c, i) => { out = out.split('\u0000' + i + '\u0000').join(c); });
    return out;
  };
  const sized = (svg, scale) => {
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const w = Math.round(+m[1] * scale), h = Math.round(+m[2] * scale);
    return { svg: svg.replace('<svg ', '<svg width="' + w + '" height="' + h + '" '), w: w, h: h };
  };
  function raster(svg, scale) {
    const s = sized(svg, scale);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ img: img, w: s.w, h: s.h });
      img.onerror = () => reject(new Error('svg failed'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg);
    });
  }

  const DOOR_FROM = ['#774e35', '#3f302b', '#f5c969', '#b67a43', '#332b35', '#e9b96f'];
  const GATE_TO = ['#2f6f7a', '#16424a', '#7be0d0', '#3fa6a0', '#1b2f33', '#a8f1e6'];
  const TELE_FROM = ['#effaff', '#63c9ff', '#6849d8', '#322979', '#201a61', '#b7f4ff'];
  const TELE2_TO = ['#fff3e8', '#ffb36b', '#d8503a', '#7a2a2a', '#4a1414', '#ffe0c0'];

  const art = {
    ready: false,
    // frames of the fruit atlas, in file order
    FRUIT_FRAMES: ['apple', 'orange', 'cherry', 'grapes', 'strawberry'],
    load(scene) {
      const jobs = [];
      const add = (key, svg, scale, frames) => jobs.push(raster(svg, scale || RS).then((r) => {
        const tex = scene.textures.addImage(key, r.img);
        if (frames) frames.forEach((f) => tex.add(f[0], 0, f[1] * (scale || RS), f[2] * (scale || RS), f[3] * (scale || RS), f[4] * (scale || RS)));
      }));
      const V = S.SVG;
      S.WORLDS.forEach((w, i) => {
        add('wall' + i, recolor(V['wall-block'], S.WALL_KEYS, w.wall));
        add('exit' + i, recolor(V['exit-portal'], S.PORTAL_KEYS, w.portal));
      });
      add('ice', V['ice-tile']);
      add('door', V['locked-door']);
      add('gate', recolor(V['locked-door'], DOOR_FROM, GATE_TO));
      add('key', V.key);
      add('switch', V['switch-button']);
      add('bomb', V['bomb-trap']);
      add('coin', V['coin-reward']);
      add('tele0', V['teleporter-pair'], RS, [['a', 0, 0, 64, 64], ['b', 64, 0, 64, 64]]);
      add('tele1', recolor(V['teleporter-pair'], TELE_FROM, TELE2_TO), RS, [['a', 0, 0, 64, 64], ['b', 64, 0, 64, 64]]);
      add('stars', V['star-rating'], RS, [[0, 0, 0, 32, 32], [1, 32, 0, 32, 32], [2, 64, 0, 32, 32]]);
      add('fruits', V['fruit-atlas'], RS, art.FRUIT_FRAMES.map((n, i) => [n, i * 48, 0, 48, 48]));
      add('patterns', V['world-pattern-overlays'], 1, [[0, 0, 0, 256, 256], [1, 256, 0, 256, 256], [2, 512, 0, 256, 256], [3, 768, 0, 256, 256], [4, 1024, 0, 256, 256]]);
      return Promise.all(jobs).then(() => { art.ready = true; });
    },
    // Scenery above and below the board (painted once, so it costs nothing per frame)
    scenery(ctx, wi, w, h) {
      const E = (x, y, rx, ry, c, a) => { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; };
      const T = (x1, y1, x2, y2, x3, y3, c, a) => { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; };
      const rnd = (i) => ((Math.imul(i + 7 * wi + 3, 2654435761) >>> 0) % 1000) / 1000;
      if (wi === 0) {                                              // garden: hills, bushes, flowers
        E(60, h + 10, 190, 70, '#0e3a1c', 0.55); E(w - 40, h + 20, 210, 80, '#0e3a1c', 0.5); E(w / 2, h + 40, 220, 60, '#1d5a2e', 0.5);
        [[40, h - 50], [90, h - 36], [w - 50, h - 48], [w - 105, h - 34]].forEach((b) => { E(b[0], b[1], 30, 24, '#2f8a43', 0.8); E(b[0] + 14, b[1] - 8, 20, 17, '#46bd61', 0.8); });
        for (let i = 0; i < 12; i++) { const x = rnd(i) * w, y = h - 20 - rnd(i + 40) * 40; E(x, y, 4, 4, ['#ffd0e0', '#fff3a0', '#ffffff'][i % 3], 0.9); }
        for (let i = 0; i < 6; i++) E(rnd(i + 60) * w, 20 + rnd(i + 70) * 30, 22, 9, '#7fe08a', 0.18);
      } else if (wi === 1) {                                       // desert: sun, dunes, cactus
        E(w - 62, h - 118, 34, 34, '#ffd47a', 0.6); E(w - 62, h - 118, 50, 50, '#ffd47a', 0.18);
        E(70, h + 10, 230, 80, '#8a5628', 0.55); E(w - 30, h + 20, 220, 70, '#a8672f', 0.5); E(w / 2, h + 50, 200, 60, '#c78a45', 0.45);
        [[60, h - 52], [w - 60, h - 44]].forEach((c) => { ctx.globalAlpha = 0.8; ctx.fillStyle = '#2f7a4a'; ctx.fillRect(c[0] - 5, c[1] - 26, 10, 40); ctx.fillRect(c[0] - 18, c[1] - 14, 8, 6); ctx.fillRect(c[0] - 18, c[1] - 24, 7, 16); ctx.fillRect(c[0] + 10, c[1] - 10, 8, 6); ctx.fillRect(c[0] + 11, c[1] - 22, 7, 16); ctx.globalAlpha = 1; });
      } else if (wi === 2) {                                       // ice: snowy peaks, snowflakes
        T(20, h, 100, h - 90, 180, h, '#dff4ff', 0.3); T(w - 190, h, w - 100, h - 70, w - 10, h, '#cfeeff', 0.3); T(150, h, 230, h - 50, 310, h, '#bfe6fb', 0.28);
        for (let i = 0; i < 26; i++) E(rnd(i) * w, rnd(i + 30) * 70 + (i % 2 ? h - 110 : 0), 2 + rnd(i + 5) * 2.5, 2 + rnd(i + 5) * 2.5, '#ffffff', 0.55);
        E(w / 2, h + 30, 260, 50, '#eaf8ff', 0.35);
      } else if (wi === 3) {                                       // volcano: lava glow, volcano, embers
        E(w / 2, h + 30, 300, 90, '#ff5a2a', 0.28);
        T(w / 2 - 130, h, w / 2, h - 110, w / 2 + 130, h, '#0f0a09', 0.8); E(w / 2, h - 108, 26, 8, '#ff7047', 0.9); E(w / 2, h - 118, 12, 14, '#ffb347', 0.35);
        for (let i = 0; i < 24; i++) E(rnd(i) * w, h - 130 + rnd(i + 20) * 150 - (i % 3) * 100, 1.6 + rnd(i + 9) * 1.8, 1.6 + rnd(i + 9) * 1.8, i % 2 ? '#ff9a52' : '#ffd27a', 0.6);
      } else {                                                     // night: moon, stars, hills
        E(60, h - 92, 28, 28, '#f5f4ff', 0.9); E(69, h - 98, 24, 24, '#0c1030', 1);
        for (let i = 0; i < 40; i++) E(rnd(i) * w, rnd(i + 50) * h, 0.8 + rnd(i + 3) * 1.6, 0.8 + rnd(i + 3) * 1.6, i % 5 ? '#ffffff' : '#a58cff', 0.35 + rnd(i + 8) * 0.5);
        E(80, h + 30, 220, 70, '#0a0d24', 0.8); E(w - 60, h + 36, 230, 76, '#0c1030', 0.8);
        [[70, h - 40], [w - 80, h - 34]].forEach((t) => { T(t[0] - 16, t[1] + 30, t[0], t[1] - 20, t[0] + 16, t[1] + 30, '#06081c', 0.9); });
      }
    },
    // World backgrounds are painted once into a canvas texture (gradient + soft glow + pattern) and then drawn as ONE image
    // per frame - much cheaper than redrawing the pattern tiles every frame on weak phones.
    bgCache: [],
    bgKey(wi) { return 'bg' + wi + '_' + Math.round(S.H) + (S.save.data.pattern ? 'p' : 'n'); },
    ensureBg(scene, wi) {
      const key = art.bgKey(wi);
      if (scene.textures.exists(key)) return key;
      try {
        const w = S.W, h = Math.round(S.H), tex = scene.textures.createCanvas(key, w, h), ctx = tex.getContext(), W = S.WORLDS[wi];
        const gr = ctx.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, W.bgTop); gr.addColorStop(1, W.bgBot);
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
        const glow = (r, a) => { const rg = ctx.createRadialGradient(w / 2, 110, 0, w / 2, 110, r); rg.addColorStop(0, W.glow); rg.addColorStop(1, W.bgTop); ctx.globalAlpha = a; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(w / 2, 110, r, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; };
        glow(280, 0.14); glow(170, 0.1);
        if (S.save.data.pattern) {
          const src = scene.textures.get('patterns').getSourceImage(), sz = 210;
          ctx.globalAlpha = 0.1;
          for (let y = 0; y < h + sz; y += sz) for (let x = -20; x < w; x += sz) ctx.drawImage(src, W.pattern * 256, 0, 256, 256, x, y, sz, sz);
          ctx.globalAlpha = 1;
        }
        art.scenery(ctx, wi, w, h);
        tex.refresh();
        art.bgCache.push(key);
        while (art.bgCache.length > 3) scene.textures.remove(art.bgCache.shift());
        return key;
      } catch (e) { return null; }
    }
  };
  S.art = art;
})(window.SFR);
