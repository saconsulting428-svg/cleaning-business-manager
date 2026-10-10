/* HUSH HD - graphics toolkit: sprite atlases, procedural textures, chapter themes and the baked environment tile sets.
   Everything heavy happens once (at load, level start or resize); the per-frame code only blits cached canvases. */
const Gfx = (function () {
  'use strict';
  const TAU = Math.PI * 2;

  /* ---------- small utilities ---------- */
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function hash(i, s) { let h = (Math.imul(i | 0, 374761393) + Math.imul((s | 0) + 1, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  /* colours are accepted as [r,g,b], '#rrggbb' or 'rgb(r,g,b)' */
  function rgbOf(c) {
    if (typeof c !== 'string') return c;
    if (c.charAt(0) === '#') { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const m = c.match(/\d+/g); return [+m[0], +m[1], +m[2]];
  }
  function rgba(c, a) { c = rgbOf(c); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function shade(c, k) { c = rgbOf(c); return [Math.max(0, Math.min(255, c[0] * k)) | 0, Math.max(0, Math.min(255, c[1] * k)) | 0, Math.max(0, Math.min(255, c[2] * k)) | 0]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* tileable fractal value noise 0..1 */
  function fbm(size, base, oct, seed) {
    const out = new Float32Array(size * size);
    let amp = 1, tot = 0;
    for (let o = 0; o < oct; o++) {
      const cells = base << o, g = new Float32Array(cells * cells);
      for (let i = 0; i < g.length; i++) g[i] = hash(i, seed + o * 101);
      for (let y = 0; y < size; y++) {
        const fy = y / size * cells, y0 = Math.floor(fy); let ty = fy - y0; ty = ty * ty * (3 - 2 * ty);
        const ya = (y0 % cells) * cells, yb = ((y0 + 1) % cells) * cells;
        for (let x = 0; x < size; x++) {
          const fx = x / size * cells, x0 = Math.floor(fx); let tx = fx - x0; tx = tx * tx * (3 - 2 * tx);
          const xa = x0 % cells, xb = (x0 + 1) % cells;
          out[y * size + x] += amp * ((g[ya + xa] * (1 - tx) + g[ya + xb] * tx) * (1 - ty) + (g[yb + xa] * (1 - tx) + g[yb + xb] * tx) * ty);
        }
      }
      tot += amp; amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  }
  function canvasFrom(size, fn) {
    const c = mk(size, size), x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data;
    for (let i = 0; i < size * size; i++) { const p = fn(i, i % size, (i / size) | 0); d[i * 4] = p[0]; d[i * 4 + 1] = p[1]; d[i * 4 + 2] = p[2]; d[i * 4 + 3] = p[3]; }
    x.putImageData(im, 0, 0); return c;
  }

  /* ---------- shared procedural textures (built once) ---------- */
  let TEX = null;
  function textures() {
    if (TEX) return TEX;
    const n1 = fbm(256, 4, 5, 7), n2 = fbm(256, 16, 3, 23), n3 = fbm(256, 2, 4, 61);
    TEX = {};
    TEX.concrete = canvasFrom(256, function (i) { const v = clamp(128 + (n1[i] - 0.5) * 170 + (n2[i] - 0.5) * 70 + (hash(i, 99) - 0.5) * 22, 0, 255); return [v, v, v, 255]; });
    TEX.grit = canvasFrom(128, function (i) { const q = hash(i, 5), v = q > 0.985 ? 40 : q > 0.9 ? 205 : 255; return [v, v, v, 255]; });
    TEX.fog = canvasFrom(256, function (i) { const a = Math.max(0, n3[i] - 0.38) * 2.2; return [205, 225, 245, Math.min(255, a * a * 255)]; });
    TEX.grain = canvasFrom(128, function (i) { const v = 128 + (hash(i, 13) - 0.5) * 120; return [v, v, v, 90]; });
    /* streaks: water and rust runs falling from the top edge */
    const cols = new Float32Array(256);
    for (let x = 0; x < 256; x++) cols[x] = Math.pow(hash(x, 41), 5);
    for (let k = 0; k < 3; k++) for (let x = 1; x < 255; x++) cols[x] = (cols[x - 1] + cols[x] * 2 + cols[x + 1]) / 4;
    TEX.streak = canvasFrom(256, function (i, px, py) { const a = cols[px] * 6 * Math.pow(1 - py / 256, 1.6) * (0.6 + n2[i] * 0.8); return [10, 9, 8, clamp(a * 255, 0, 190)]; });
    return TEX;
  }

  /* ---------- soft light sprites (prebuilt once, stamped many times) ---------- */
  const LIGHT = {};
  function radial(key, size, stops) {
    if (LIGHT[key]) return LIGHT[key];
    const c = mk(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return (LIGHT[key] = c);
  }
  function glowSprite(col) { return radial('g' + col, 128, [[0, rgba(col, 1)], [0.35, rgba(col, 0.45)], [1, rgba(col, 0)]]); }
  function holeSprite() { return radial('hole', 128, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]); }
  /* the flashlight: a cone with a soft edge and a hot centre, pointing right from (0, mid); length L, half angle A */
  function coneSprite() {
    if (LIGHT.cone) return LIGHT.cone;
    const W = 512, H = 512, c = mk(W, H), x = c.getContext('2d');
    const layers = [[0.38, 0.5], [0.26, 0.4], [0.14, 0.32]];
    layers.forEach(function (k) {
      const g = x.createRadialGradient(0, H / 2, 0, 0, H / 2, W);
      g.addColorStop(0, 'rgba(255,255,255,' + k[1] + ')'); g.addColorStop(0.55, 'rgba(255,255,255,' + k[1] * 0.7 + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2 - Math.tan(k[0]) * W); x.lineTo(W * 1.02, H / 2); x.lineTo(W, H / 2 + Math.tan(k[0]) * W); x.closePath(); x.fill();
    });
    return (LIGHT.cone = c);
  }
  /* thin bright ring used by the sonar wave front */
  function ringSprite() {
    if (LIGHT.ring) return LIGHT.ring;
    const S = 256, c = mk(S, S), x = c.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(120,230,255,0)'); g.addColorStop(0.9, 'rgba(120,230,255,0)'); g.addColorStop(0.955, 'rgba(160,240,255,0.95)'); g.addColorStop(0.985, 'rgba(120,220,255,0.35)'); g.addColorStop(1, 'rgba(120,220,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    return (LIGHT.ring = c);
  }
  function vignetteSprite(col, inner, a) {
    const key = 'v' + col + inner + a; if (LIGHT[key]) return LIGHT[key];
    const W = 128, H = 256, c = mk(W, H), x = c.getContext('2d'), g = x.createRadialGradient(W / 2, H / 2, H * inner, W / 2, H / 2, H * 0.72);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, a));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    return (LIGHT[key] = c);
  }

  /* ---------- chapter themes ---------- */
  const THEMES = [
    { name: 'laboratory',  wall: [92, 106, 118], dado: [58, 68, 78],  floor: [60, 68, 76], duct: [84, 96, 108], accent: '#4ccbe6', lamp: [205, 232, 255], amb: [3, 6, 12], tint: [150, 190, 220], hazard: '#d6a431', glass: [150, 220, 235] },
    { name: 'research',    wall: [78, 104, 100], dado: [46, 66, 62],  floor: [52, 66, 64], duct: [72, 98, 94],  accent: '#6fe0b5', lamp: [214, 255, 232], amb: [2, 8, 8],  tint: [140, 215, 190], hazard: '#d6a431', glass: [150, 235, 215] },
    { name: 'containment', wall: [112, 82, 76], dado: [70, 46, 44],  floor: [66, 56, 56], duct: [104, 78, 72], accent: '#e0534a', lamp: [255, 214, 190], amb: [9, 3, 4],  tint: [225, 150, 130], hazard: '#e0a02e', glass: [235, 170, 160] }
  ];

  /* ---------- environment tile sets (baked per theme and scale) ----------
     Strips, in metres: ceiling 3.0..4.9, wall 0..3.0, floor face 0..-1.3. Every strip is one tile (1 m) wide, so the live code only blits. */
  const WALL_H = 3.0, CEIL_H = 1.9, FLOOR_H = 1.3, NV_WALL = 8, NV_CEIL = 6, NV_FLOOR = 6;
  const envCache = {};
  function env(themeIdx, PM) {
    const key = themeIdx + '@' + PM; if (envCache[key]) return envCache[key];
    const e = bakeEnv(THEMES[themeIdx], PM, themeIdx); envCache[key] = e;
    const keys = Object.keys(envCache); if (keys.length > 4) { const old = envCache[keys[0]]; [old.wall, old.ceil, old.floor, old.props].forEach(function (a) { if (a && a.width) a.width = 1; }); delete envCache[keys[0]]; }
    return e;
  }
  function noiseOverlay(x, w, h, a, mode, off) {
    const T = textures(); x.save(); x.globalCompositeOperation = mode; x.globalAlpha = a;
    const pat = x.createPattern(T.concrete, 'repeat'); x.translate(-(off || 0), 0); x.fillStyle = pat; x.fillRect(off || 0, 0, w, h); x.restore();
  }
  function cylinder(x, x1, y1, x2, y2, r, col) {
    /* a pipe seen from the side: lit along its upper edge, dark along its lower edge */
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const g = x.createLinearGradient(x1 + nx * r, y1 + ny * r, x1 - nx * r, y1 - ny * r);
    g.addColorStop(0, rgba(shade(col, 1.45), 1)); g.addColorStop(0.3, rgba(shade(col, 1.1), 1)); g.addColorStop(0.75, rgba(shade(col, 0.55), 1)); g.addColorStop(1, rgba(shade(col, 0.32), 1));
    x.fillStyle = g; x.beginPath(); x.moveTo(x1 + nx * r, y1 + ny * r); x.lineTo(x2 + nx * r, y2 + ny * r); x.lineTo(x2 - nx * r, y2 - ny * r); x.lineTo(x1 - nx * r, y1 - ny * r); x.closePath(); x.fill();
  }
  function bakeEnv(T, PM, ti) {
    const E = { PM, T, lamps: [] };
    const tex = textures();
    /* ---- wall tiles ---- */
    const wh = Math.ceil(WALL_H * PM); E.wall = mk(PM * NV_WALL, wh);
    let x = E.wall.getContext('2d');
    for (let v = 0; v < NV_WALL; v++) {
      x.save(); x.translate(v * PM, 0); x.beginPath(); x.rect(0, 0, PM, wh); x.clip();
      let g = x.createLinearGradient(0, 0, 0, wh); g.addColorStop(0, rgba(shade(T.wall, 0.78), 1)); g.addColorStop(0.55, rgba(T.wall, 1)); g.addColorStop(1, rgba(shade(T.wall, 0.7), 1));
      x.fillStyle = g; x.fillRect(0, 0, PM, wh);
      x.save(); x.translate(0, 0); noiseOverlay(x, PM, wh, 0.55, 'overlay', (v * 53) % 200); x.restore();
      /* concrete panel seams, shadow side then lit side */
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, 0, Math.max(1, PM * 0.02), wh);
      x.fillStyle = 'rgba(255,255,255,0.07)'; x.fillRect(Math.max(1, PM * 0.02), 0, Math.max(1, PM * 0.012), wh);
      x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(0, wh * 0.5, PM, Math.max(1, PM * 0.012));
      /* dado band (the lower painted wall) with a stripe */
      const dh = PM * 0.95; g = x.createLinearGradient(0, wh - dh, 0, wh); g.addColorStop(0, rgba(shade(T.dado, 1.25), 1)); g.addColorStop(1, rgba(shade(T.dado, 0.7), 1));
      x.fillStyle = g; x.fillRect(0, wh - dh, PM, dh); noiseOverlay(x, PM, wh, 0.3, 'overlay', (v * 31) % 180);
      x.fillStyle = rgba(shade(T.dado, 1.7), 0.8); x.fillRect(0, wh - dh, PM, Math.max(1.5, PM * 0.025));
      x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, wh - PM * 0.1, PM, PM * 0.1);               // skirting
      x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(0, wh - PM * 0.1, PM, Math.max(1, PM * 0.012));
      /* hanging stains */
      x.save(); x.globalAlpha = 0.75; x.drawImage(tex.streak, (v * 64) % 192, 0, 64, 256, 0, 0, PM, wh * 0.9); x.restore();
      /* per-variant detail */
      const d = v % 8;
      if (d === 2) { cylinder(x, PM * 0.22, 0, PM * 0.22, wh, PM * 0.045, T.duct); x.fillStyle = rgba(shade(T.duct, 0.5), 1); x.fillRect(PM * 0.12, wh * 0.45, PM * 0.2, PM * 0.28); x.fillStyle = rgba(shade(T.duct, 1.4), 1); x.fillRect(PM * 0.14, wh * 0.47, PM * 0.16, PM * 0.02); }
      if (d === 3) {                                                                   // warning sign: hazard triangle on a yellow plate
        const sx0 = PM * 0.28, sy0 = PM * 0.85, sw = PM * 0.44; x.fillStyle = T.hazard; x.fillRect(sx0, sy0, sw, sw); x.strokeStyle = '#15130c'; x.lineWidth = Math.max(1.5, PM * 0.02); x.strokeRect(sx0 + PM * 0.02, sy0 + PM * 0.02, sw - PM * 0.04, sw - PM * 0.04);
        x.fillStyle = '#15130c'; x.beginPath(); x.moveTo(PM * 0.5, sy0 + PM * 0.07); x.lineTo(PM * 0.68, sy0 + sw - PM * 0.07); x.lineTo(PM * 0.32, sy0 + sw - PM * 0.07); x.closePath(); x.fill();
        x.fillStyle = T.hazard; x.fillRect(PM * 0.485, sy0 + PM * 0.17, PM * 0.03, PM * 0.1); x.fillRect(PM * 0.485, sy0 + PM * 0.3, PM * 0.03, PM * 0.03); }
      if (d === 4) { x.fillStyle = rgba(shade(T.wall, 0.4), 1); x.fillRect(PM * 0.18, wh * 0.28, PM * 0.64, PM * 0.9); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = Math.max(1, PM * 0.015); x.strokeRect(PM * 0.18, wh * 0.28, PM * 0.64, PM * 0.9);
        for (let k = 0; k < 6; k++) { x.fillStyle = k % 3 === 0 ? T.accent : k % 3 === 1 ? '#3b4650' : '#c9453d'; x.globalAlpha = 0.7; x.fillRect(PM * (0.24 + (k % 3) * 0.17), wh * 0.32 + (k / 3 | 0) * PM * 0.16, PM * 0.1, PM * 0.06); x.globalAlpha = 1; } }
      if (d === 5) { x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = Math.max(1, PM * 0.012); x.beginPath(); x.moveTo(PM * 0.6, 0); x.lineTo(PM * 0.52, wh * 0.18); x.lineTo(PM * 0.6, wh * 0.3); x.lineTo(PM * 0.48, wh * 0.46); x.stroke(); }
      if (d === 6) { cylinder(x, PM * 0.7, 0, PM * 0.7, wh, PM * 0.06, T.duct); cylinder(x, 0, wh * 0.42, PM, wh * 0.42, PM * 0.04, T.duct); x.fillStyle = '#9c2a26'; x.beginPath(); x.arc(PM * 0.7, wh * 0.42, PM * 0.075, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = Math.max(1, PM * 0.01); x.stroke(); }
      if (d === 7) { x.fillStyle = 'rgba(255,255,255,0.09)'; x.font = '700 ' + Math.round(PM * 0.5) + 'px "Barlow Condensed", Arial Narrow, sans-serif'; x.textAlign = 'center'; x.fillText(String(10 + ((ti * 7 + v * 13) % 80)), PM * 0.5, wh * 0.62); x.fillRect(PM * 0.25, wh * 0.66, PM * 0.5, PM * 0.025); }
      if (d === 1) { x.fillStyle = 'rgba(30,20,10,0.28)'; x.beginPath(); x.ellipse(PM * 0.55, wh * 0.62, PM * 0.28, PM * 0.12, 0, 0, TAU); x.fill(); }
      x.restore();
    }
    /* ---- ceiling tiles: ducts, pipes, cable trays and light fittings ---- */
    const ch = Math.ceil(CEIL_H * PM); E.ceil = mk(PM * NV_CEIL, ch); x = E.ceil.getContext('2d');
    for (let v = 0; v < NV_CEIL; v++) {
      x.save(); x.translate(v * PM, 0); x.beginPath(); x.rect(0, 0, PM, ch); x.clip();
      let g = x.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, '#05080b'); g.addColorStop(0.4, rgba(shade(T.wall, 0.35), 1)); g.addColorStop(1, rgba(shade(T.wall, 0.55), 1));
      x.fillStyle = g; x.fillRect(0, 0, PM, ch); noiseOverlay(x, PM, ch, 0.4, 'overlay', (v * 40) % 200);
      /* big duct with ribs */
      const dy0 = ch * 0.1, dh = ch * 0.42;
      g = x.createLinearGradient(0, dy0, 0, dy0 + dh); g.addColorStop(0, rgba(shade(T.duct, 1.35), 1)); g.addColorStop(0.35, rgba(T.duct, 1)); g.addColorStop(1, rgba(shade(T.duct, 0.35), 1));
      x.fillStyle = g; x.fillRect(0, dy0, PM, dh); noiseOverlay(x, PM, ch, 0.18, 'overlay', (v * 17) % 150);
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, dy0, Math.max(1.5, PM * 0.03), dh); x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(Math.max(1.5, PM * 0.03), dy0, Math.max(1, PM * 0.015), dh);
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, dy0 + dh - 2, PM, 2);
      /* pipes below the duct */
      cylinder(x, 0, ch * 0.66, PM, ch * 0.66, PM * 0.075, T.duct); cylinder(x, 0, ch * 0.82, PM, ch * 0.82, PM * 0.055, shade(T.duct, 0.8));
      x.fillStyle = rgba(shade(T.duct, 0.45), 1); x.fillRect(PM * 0.5 - PM * 0.03, ch * 0.62, PM * 0.06, PM * 0.34);          // pipe clamp
      /* cable tray on some tiles */
      if (v % 3 === 1) { x.strokeStyle = 'rgba(8,10,12,0.9)'; x.lineWidth = Math.max(1.5, PM * 0.025); x.beginPath(); x.moveTo(0, ch * 0.57); x.quadraticCurveTo(PM * 0.5, ch * 0.6 + PM * 0.14, PM, ch * 0.57); x.stroke(); }
      if (v === 4) { x.strokeStyle = rgba(shade(T.accent.length === 7 ? [76, 203, 230] : [150, 150, 150], 0.5), 0.5); }
      x.restore();
    }
    /* ---- floor face: steel plate and grating ---- */
    const fh = Math.ceil(FLOOR_H * PM); E.floor = mk(PM * NV_FLOOR, fh); x = E.floor.getContext('2d');
    for (let v = 0; v < NV_FLOOR; v++) {
      x.save(); x.translate(v * PM, 0); x.beginPath(); x.rect(0, 0, PM, fh); x.clip();
      let g = x.createLinearGradient(0, 0, 0, fh); g.addColorStop(0, rgba(shade(T.floor, 1.5), 1)); g.addColorStop(0.08, rgba(shade(T.floor, 1.05), 1)); g.addColorStop(0.5, rgba(shade(T.floor, 0.7), 1)); g.addColorStop(1, '#030507');
      x.fillStyle = g; x.fillRect(0, 0, PM, fh); noiseOverlay(x, PM, fh, 0.55, 'overlay', (v * 70) % 200);
      x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(0, 0, PM, Math.max(1.5, PM * 0.022));                     // lit top edge of the floor
      x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, PM * 0.05, PM, Math.max(1, PM * 0.02));
      x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(0, 0, Math.max(1, PM * 0.018), fh);                              // plate seam
      /* diamond-plate marks */
      x.strokeStyle = 'rgba(255,255,255,0.05)'; x.lineWidth = 1;
      for (let k = 0; k < 5; k++) { const px = PM * (0.12 + k * 0.19); x.beginPath(); x.moveTo(px, PM * 0.14); x.lineTo(px + PM * 0.07, PM * 0.2); x.stroke(); }
      /* grating slots below the walking surface */
      const gy = PM * 0.34; x.fillStyle = 'rgba(0,0,0,0.6)'; for (let k = 0; k < 9; k++) x.fillRect(PM * (0.04 + k * 0.11), gy, PM * 0.06, PM * 0.2);
      if (v % 3 === 0) { x.fillStyle = T.hazard; x.globalAlpha = 0.55; for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(PM * k / 6, fh * 0.64); x.lineTo(PM * (k + 0.5) / 6, fh * 0.64); x.lineTo(PM * (k + 0.2) / 6, fh * 0.64 + PM * 0.1); x.lineTo(PM * (k - 0.3) / 6, fh * 0.64 + PM * 0.1); x.fill(); } x.globalAlpha = 1; }
      cylinder(x, 0, fh * 0.86, PM, fh * 0.86, PM * 0.05, shade(T.duct, 0.55));
      x.restore();
    }
    return bakeProps(E, T, PM);
  }

  /* ---------- props that stand in front of the wall (barrels, crates, cabinets...) ---------- */
  const PROP_W = [0.8, 0.9, 0.7, 1.1, 0.6, 1.2, 0.5, 0.9];
  function bakeProps(E, T, PM) {
    const n = PROP_W.length, H = Math.ceil(2.1 * PM); E.props = mk(Math.ceil(PM * 1.3) * n, H); E.propW = Math.ceil(PM * 1.3); E.propH = H;
    const x = E.props.getContext('2d');
    const base = T.wall;
    for (let p = 0; p < n; p++) {
      x.save(); x.translate(p * E.propW + E.propW / 2, H);               // origin: floor, middle of the slot
      const w = PROP_W[p] * PM;
      switch (p) {
        case 0: { /* oil drums */
          for (let k = 0; k < 2; k++) { const cx = (k - 0.5) * w * 0.52, bw = w * 0.5, bh = PM * 0.95; const g = x.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
            g.addColorStop(0, '#16231f'); g.addColorStop(0.35, '#3c5a50'); g.addColorStop(1, '#0b1210'); x.fillStyle = g; x.fillRect(cx - bw / 2, -bh, bw, bh);
            x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(cx - bw / 2, -bh * 0.7, bw, PM * 0.03); x.fillRect(cx - bw / 2, -bh * 0.3, bw, PM * 0.03);
            x.fillStyle = T.hazard; x.globalAlpha = 0.85; x.beginPath(); x.moveTo(cx, -bh * 0.62); x.lineTo(cx + bw * 0.2, -bh * 0.4); x.lineTo(cx - bw * 0.2, -bh * 0.4); x.closePath(); x.fill(); x.globalAlpha = 1; } break; }
        case 1: { /* stacked crates */
          const bw = w * 0.9, bh = PM * 0.62; for (let k = 0; k < 2; k++) { const yy = -bh * (k + 1), xx = -bw / 2 + k * PM * 0.12; const g = x.createLinearGradient(0, yy, 0, yy + bh); g.addColorStop(0, '#4b4034'); g.addColorStop(1, '#241d16');
            x.fillStyle = g; x.fillRect(xx, yy, bw, bh); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = Math.max(1.5, PM * 0.025); x.strokeRect(xx + 1, yy + 1, bw - 2, bh - 2);
            x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + bw, yy + bh); x.moveTo(xx + bw, yy); x.lineTo(xx, yy + bh); x.stroke(); } break; }
        case 2: { /* wall cabinet */
          const bw = w, bh = PM * 1.5; let g = x.createLinearGradient(-bw / 2, 0, bw / 2, 0); g.addColorStop(0, rgba(shade(base, 0.5), 1)); g.addColorStop(0.5, rgba(shade(base, 0.8), 1)); g.addColorStop(1, rgba(shade(base, 0.35), 1));
          x.fillStyle = g; x.fillRect(-bw / 2, -bh, bw, bh); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = Math.max(1.5, PM * 0.02); x.strokeRect(-bw / 2, -bh, bw, bh); x.beginPath(); x.moveTo(0, -bh); x.lineTo(0, 0); x.stroke();
          x.fillStyle = 'rgba(0,0,0,0.5)'; for (let k = 0; k < 6; k++) x.fillRect(-bw * 0.4, -bh * 0.92 + k * PM * 0.05, bw * 0.22, PM * 0.025); x.fillStyle = '#b9c0c6'; x.fillRect(-PM * 0.05, -bh * 0.5, PM * 0.025, PM * 0.2); x.fillRect(PM * 0.03, -bh * 0.5, PM * 0.025, PM * 0.2); break; }
        case 3: { /* workbench with terminal */
          const bw = w, bh = PM * 0.85; x.fillStyle = '#2a2f33'; x.fillRect(-bw / 2, -bh, bw, PM * 0.07); x.fillStyle = '#1b1f22'; x.fillRect(-bw / 2 + PM * 0.05, -bh, PM * 0.06, bh); x.fillRect(bw / 2 - PM * 0.11, -bh, PM * 0.06, bh);
          x.fillStyle = '#0a0c0e'; x.fillRect(-bw * 0.25, -bh - PM * 0.38, bw * 0.4, PM * 0.34); const g = x.createLinearGradient(0, -bh - PM * 0.36, 0, -bh - PM * 0.06); g.addColorStop(0, rgba([30, 60, 70], 1)); g.addColorStop(1, rgba([10, 24, 30], 1)); x.fillStyle = g; x.fillRect(-bw * 0.23, -bh - PM * 0.36, bw * 0.36, PM * 0.3); x.fillStyle = '#16191c'; x.fillRect(-bw * 0.05, -bh - PM * 0.06, bw * 0.06, PM * 0.06); break; }
        case 4: { /* fire extinguisher + bracket */
          x.fillStyle = '#7d1f1d'; const g = x.createLinearGradient(-PM * 0.1, 0, PM * 0.1, 0); g.addColorStop(0, '#4a0f0e'); g.addColorStop(0.4, '#a4302c'); g.addColorStop(1, '#2a0807'); x.fillStyle = g; x.fillRect(-PM * 0.1, -PM * 0.62, PM * 0.2, PM * 0.5); x.fillStyle = '#111'; x.fillRect(-PM * 0.04, -PM * 0.72, PM * 0.08, PM * 0.1); x.fillStyle = '#222'; x.fillRect(-PM * 0.05, -PM * 0.62, PM * 0.1, PM * 0.04); x.fillRect(-PM * 0.12, -PM * 0.4, PM * 0.24, PM * 0.04);
          x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(-PM * 0.05, -PM * 0.12, PM * 0.1, PM * 0.12); break; }
        case 5: { /* industrial machine block */
          const bw = w, bh = PM * 1.25; let g = x.createLinearGradient(0, -bh, 0, 0); g.addColorStop(0, rgba(shade(T.duct, 0.9), 1)); g.addColorStop(1, rgba(shade(T.duct, 0.35), 1)); x.fillStyle = g; x.fillRect(-bw / 2, -bh, bw, bh);
          x.fillStyle = 'rgba(0,0,0,0.45)'; for (let k = 0; k < 7; k++) x.fillRect(-bw * 0.4 + k * bw * 0.115, -bh * 0.85, bw * 0.06, bh * 0.45); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = Math.max(1.5, PM * 0.025); x.strokeRect(-bw / 2, -bh, bw, bh);
          x.fillStyle = '#9a2c28'; x.beginPath(); x.arc(bw * 0.3, -bh * 0.2, PM * 0.05, 0, TAU); x.fill(); x.fillStyle = '#2a8a5a'; x.beginPath(); x.arc(bw * 0.2, -bh * 0.2, PM * 0.04, 0, TAU); x.fill(); break; }
        case 6: { /* pipe stand / gas cylinders */
          for (let k = 0; k < 2; k++) { const cx = (k - 0.5) * PM * 0.26; const g = x.createLinearGradient(cx - PM * 0.1, 0, cx + PM * 0.1, 0); g.addColorStop(0, '#222b30'); g.addColorStop(0.4, '#5a6a72'); g.addColorStop(1, '#13181b'); x.fillStyle = g; x.beginPath(); x.moveTo(cx - PM * 0.1, 0); x.lineTo(cx - PM * 0.1, -PM * 1.0); x.quadraticCurveTo(cx, -PM * 1.2, cx + PM * 0.1, -PM * 1.0); x.lineTo(cx + PM * 0.1, 0); x.fill(); x.fillStyle = k ? '#3a7ab0' : '#b0873a'; x.fillRect(cx - PM * 0.1, -PM * 0.75, PM * 0.2, PM * 0.06); }
          x.strokeStyle = '#111'; x.lineWidth = Math.max(1.5, PM * 0.03); x.beginPath(); x.moveTo(-PM * 0.2, -PM * 0.5); x.lineTo(PM * 0.2, -PM * 0.5); x.stroke(); break; }
        default: { /* stretcher / trolley */
          const bw = w; x.fillStyle = '#2d3338'; x.fillRect(-bw / 2, -PM * 0.62, bw, PM * 0.1); x.fillStyle = '#c9ccc7'; x.globalAlpha = 0.55; x.fillRect(-bw / 2 + PM * 0.04, -PM * 0.72, bw - PM * 0.08, PM * 0.1); x.globalAlpha = 1;
          x.strokeStyle = '#14181b'; x.lineWidth = Math.max(2, PM * 0.04); x.beginPath(); x.moveTo(-bw * 0.35, -PM * 0.52); x.lineTo(-bw * 0.4, -PM * 0.1); x.moveTo(bw * 0.35, -PM * 0.52); x.lineTo(bw * 0.4, -PM * 0.1); x.stroke(); x.fillStyle = '#0c0e10'; x.beginPath(); x.arc(-bw * 0.4, -PM * 0.07, PM * 0.07, 0, TAU); x.arc(bw * 0.4, -PM * 0.07, PM * 0.07, 0, TAU); x.fill(); }
      }
      /* contact shadow so props sit on the floor */
      x.globalAlpha = 0.5; x.fillStyle = '#000'; x.beginPath(); x.ellipse(0, -PM * 0.01, w * 0.55, PM * 0.05, 0, 0, TAU); x.fill(); x.globalAlpha = 1;
      x.restore();
    }
    return E;
  }

  /* ---------- sprite atlases ---------- */
  const SP = {};
  function loadSprites(metaMap) {
    const jobs = Object.keys(metaMap).map(function (k) {
      return new Promise(function (res) {
        const m = metaMap[k], im = new Image(); const e = SP[k] = { m, im, ok: false, scaled: {}, tint: {} };
        im.onload = function () { e.ok = true; res(true); }; im.onerror = function () { res(false); };      // a failed load keeps the procedural fallback in use
        im.src = m.src;
      });
    });
    return Promise.all(jobs);
  }
  const ready = function (k) { return !!(SP[k] && SP[k].ok); };
  /* downscale by repeated halving: far sharper than one big step, and done once per size, never per frame */
  function resample(src, sx, sy, sw, sh, dw, dh) {
    let cw = sw, ch = sh, cur = src, cx = sx, cy = sy;
    while (cw * 0.5 > dw * 1.0001 && ch * 0.5 > dh * 1.0001) {
      const nw = Math.max(dw, Math.ceil(cw * 0.5)), nh = Math.max(dh, Math.ceil(ch * 0.5)), t = mk(nw, nh), c = t.getContext('2d');
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
      cur = t; cx = 0; cy = 0; cw = nw; ch = nh;
    }
    const out = mk(dw, dh), o = out.getContext('2d'); o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high'; o.drawImage(cur, cx, cy, cw, ch, 0, 0, dw, dh);
    return out;
  }
  /* scaled copy of a sheet at q device px per source px (quantised so few copies exist); returns frame canvases */
  function scaledSheet(name, q) {
    const e = SP[name]; q = Math.max(0.05, Math.min(1, Math.round(q * 2000) / 2000));
    const key = q.toFixed(4); if (e.scaled[key]) return e.scaled[key];
    const m = e.m, cw = Math.max(1, Math.round(m.w * q)), ch = Math.max(1, Math.round(m.h * q)), frames = [];
    for (let i = 0; i < m.n; i++) frames.push(resample(e.im, (i % m.cols) * m.w, ((i / m.cols) | 0) * m.h, m.w, m.h, cw, ch));
    const res = { frames, cw, ch, q: cw / m.w };
    const keys = Object.keys(e.scaled); if (keys.length >= 6) { e.scaled[keys[0]].frames.forEach(function (f) { f.width = 1; }); delete e.scaled[keys[0]]; }
    return (e.scaled[key] = res);
  }
  /* one frame flattened to a single colour (sonar silhouettes); cached */
  function tintedFrame(name, fr, q, col) {
    const s = scaledSheet(name, q), key = name + fr + col + s.cw; const e = SP[name]; if (e.tint[key]) return e.tint[key];
    const t = mk(s.cw, s.ch), x = t.getContext('2d'); x.drawImage(s.frames[fr], 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, s.cw, s.ch);
    return (e.tint[key] = t);
  }

  return { TAU, mk, hash, rgba, shade, clamp, textures, radial, glowSprite, holeSprite, coneSprite, ringSprite, vignetteSprite, THEMES, env, WALL_H, CEIL_H, FLOOR_H, NV_WALL, NV_CEIL, NV_FLOOR, PROP_W,
    SP, loadSprites, ready, scaledSheet, tintedFrame, cylinder };
})();
