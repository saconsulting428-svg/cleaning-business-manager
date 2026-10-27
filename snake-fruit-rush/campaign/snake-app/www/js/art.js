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
        tex.refresh();
        art.bgCache.push(key);
        while (art.bgCache.length > 3) scene.textures.remove(art.bgCache.shift());
        return key;
      } catch (e) { return null; }
    }
  };
  S.art = art;
})(window.SFR);
