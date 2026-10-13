/* Procedural surface textures: albedo + normal map per material, tileable, no image files. Height fields come from periodic value-noise (fbm), cracks, seams and stains;
   the normal map is derived from the height field, so the flashlight rakes across real-looking relief. */
import * as THREE from 'three';
import { rng32 } from '../logic/rng.js';

function fbmField(n, oct, seed, f0) {
  const R = rng32(seed), out = new Float32Array(n * n); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const f = f0 << o, lat = new Float32Array(f * f); for (let i = 0; i < lat.length; i++) lat[i] = R();
    for (let y = 0; y < n; y++) { const fy = y / n * f, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), a = y0 % f, b = (y0 + 1) % f;
      for (let x = 0; x < n; x++) { const fx = x / n * f, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), c = x0 % f, d = (x0 + 1) % f;
        const v = (lat[a * f + c] * (1 - sx) + lat[a * f + d] * sx) * (1 - sy) + (lat[b * f + c] * (1 - sx) + lat[b * f + d] * sx) * sy; out[y * n + x] += v * amp; } }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot; return out;
}
const mix = (a, b, t) => a + (b - a) * t, cl = (v, a, b) => (v < a ? a : v > b ? b : v), ss = (a, b, v) => { const t = cl((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* paint: (x, y, nx, ny) -> fills r,g,b and h into the buffers. Returns { map, normal } textures */
function make(n, seed, painter, normalStrength) {
  const col = new Uint8ClampedArray(n * n * 4), h = new Float32Array(n * n), R = rng32(seed + 99);
  painter({ n, col, h, R, set(x, y, r, g, b, hh) { const i = (y * n + x); col[i * 4] = r; col[i * 4 + 1] = g; col[i * 4 + 2] = b; col[i * 4 + 3] = 255; h[i] = hh; } });
  const nrm = new Uint8ClampedArray(n * n * 4), s = normalStrength || 2.2;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const l = h[y * n + (x + n - 1) % n], r = h[y * n + (x + 1) % n], u = h[((y + n - 1) % n) * n + x], d = h[((y + 1) % n) * n + x];
    let nx = (l - r) * s, ny = (u - d) * s, nz = 1; const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len; const i = (y * n + x) * 4;
    nrm[i] = (nx * 0.5 + 0.5) * 255; nrm[i + 1] = (ny * 0.5 + 0.5) * 255; nrm[i + 2] = (nz * 0.5 + 0.5) * 255; nrm[i + 3] = 255;
  }
  const mk = (data, srgb) => { const cv = document.createElement('canvas'); cv.width = cv.height = n; cv.getContext('2d').putImageData(new ImageData(data, n, n), 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: mk(col, true), normal: mk(nrm, false) };
}
function cracks(n, h, col, R, count, darken) {
  for (let c = 0; c < count; c++) { let x = R() * n, y = R() * n, a = R() * 6.28; const len = 40 + R() * 120; for (let i = 0; i < len; i++) { a += (R() - 0.5) * 0.7; x += Math.cos(a); y += Math.sin(a); const ix = ((x % n) + n) % n | 0, iy = ((y % n) + n) % n | 0, k = iy * n + ix; h[k] -= 0.35; col[k * 4] *= darken; col[k * 4 + 1] *= darken; col[k * 4 + 2] *= darken; if (R() < 0.15) { const k2 = (((iy + 1) % n) * n + ix); h[k2] -= 0.15; } } }
}

const CACHE = {};
export function buildTextures(theme, size) {
  const ck = theme + ':' + (size || 512); if (CACHE[ck]) return CACHE[ck];
  const n = size || 512, T = {};
  const C = { concrete: { lo: [36, 34, 32], hi: [96, 90, 80], stain: [22, 18, 14] }, flood: { lo: [38, 50, 58], hi: [92, 112, 122], stain: [18, 30, 34] }, nest: { lo: [52, 28, 30], hi: [118, 70, 66], stain: [30, 8, 10] } }[theme] || null;
  /* WALL: panelled concrete / tiled / flesh */
  T.wall = make(n, 11, ({ col, h, R, set }) => {
    const f1 = fbmField(n, 5, 31, 4), f2 = fbmField(n, 4, 32, 2), st = fbmField(n, 3, 33, 3);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, v = f1[i], vs = f2[(y * 3 % n) * n + x] ; let hh = v * 0.55, t = v;
      let r = mix(C.lo[0], C.hi[0], t), g = mix(C.lo[1], C.hi[1], t), b = mix(C.lo[2], C.hi[2], t);
      const streak = ss(0.5, 0.75, fbmStreak(st, x, y, n)); r = mix(r, C.stain[0], streak * 0.65); g = mix(g, C.stain[1], streak * 0.65); b = mix(b, C.stain[2], streak * 0.65);
      if (theme === 'flood') { const tile = (x % (n / 4) < 3 || y % (n / 4) < 3) ? 1 : 0; if (tile) { r *= 0.45; g *= 0.5; b *= 0.55; hh -= 0.5; } const sheen = ss(0.55, 0.9, t); r += sheen * 12; g += sheen * 18; b += sheen * 20; }
      else if (theme === 'concrete') { const seamY = y < 4 || Math.abs(y - n / 2) < 3 ? 1 : 0, seamX = x < 3 ? 1 : 0; if (seamY || seamX) { r *= 0.5; g *= 0.5; b *= 0.5; hh -= 0.6; } }
      else { const vein = Math.abs(f2[i] - 0.5) < 0.025 ? 1 : 0; if (vein) { r = 140; g = 24; b = 26; hh += 0.25; } hh += Math.sin(x * 0.08 + v * 6) * 0.1; }
      const grime = ss(0.0, 0.5, 1 - y / n) * 0.3; /* the lower part of every panel is dirtier */ r *= 1 - grime * 0.5; g *= 1 - grime * 0.5; b *= 1 - grime * 0.5;
      set(x, y, r + (R() - 0.5) * 10, g + (R() - 0.5) * 10, b + (R() - 0.5) * 10, hh + vs * 0.1);
    }
    cracks(n, h, col, R, theme === 'nest' ? 4 : 9, 0.5);
    if (theme !== 'nest') for (let k = 0; k < 6; k++) { const bx = Math.floor(R() * n), by = Math.floor(R() * n); for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= 9) { const j = (((by + yy + n) % n) * n + ((bx + xx + n) % n)); h[j] += 0.5; col[j * 4] *= 1.2; col[j * 4 + 1] *= 1.2; col[j * 4 + 2] *= 1.2; } }
  }, 2.6);
  /* FLOOR */
  T.floor = make(n, 12, ({ col, h, R, set }) => {
    const f1 = fbmField(n, 5, 41, 4), f2 = fbmField(n, 3, 42, 2);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, v = f1[i]; let hh = v * 0.5, t = v * 0.9; let r = mix(C.lo[0], C.hi[0], t) * 0.8, g = mix(C.lo[1], C.hi[1], t) * 0.8, b = mix(C.lo[2], C.hi[2], t) * 0.8;
      if (theme === 'flood') { const grout = (x % (n / 4) < 3 || y % (n / 4) < 3); if (grout) { r *= 0.35; g *= 0.4; b *= 0.45; hh -= 0.6; } const puddle = ss(0.5, 0.62, f2[i]); r *= 1 - puddle * 0.35; g *= 1 - puddle * 0.3; b *= 1 - puddle * 0.25; hh -= puddle * 0.25; }
      else if (theme === 'concrete') { const joint = (x < 3 || y < 3 || Math.abs(x - n / 2) < 2 || Math.abs(y - n / 2) < 2); if (joint) { r *= 0.4; g *= 0.4; b *= 0.4; hh -= 0.7; } const oil = ss(0.55, 0.7, f2[i]); r *= 1 - oil * 0.45; g *= 1 - oil * 0.45; b *= 1 - oil * 0.4; }
      else { const vein = Math.abs(f2[i] - 0.5) < 0.03 ? 1 : 0; r = mix(r, 120, 0.1); if (vein) { r = 120; g = 18; b = 20; hh += 0.3; } hh += Math.sin(v * 12) * 0.12; }
      set(x, y, r + (R() - 0.5) * 8, g + (R() - 0.5) * 8, b + (R() - 0.5) * 8, hh);
    }
    cracks(n, h, col, R, 6, 0.55);
  }, 2.2);
  /* CEILING */
  T.ceil = make(n, 13, ({ col, h, R, set }) => { const f1 = fbmField(n, 4, 51, 4); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x, v = f1[i]; const panel = (x % (n / 2) < 4 || y % (n / 2) < 4); let k = panel ? 0.35 : 1; set(x, y, mix(C.lo[0], C.hi[0], v) * 0.55 * k, mix(C.lo[1], C.hi[1], v) * 0.55 * k, mix(C.lo[2], C.hi[2], v) * 0.55 * k, (panel ? -0.5 : 0) + v * 0.4); } }, 2);
  /* METAL: doors, lockers, generator */
  T.metal = make(n, 14, ({ col, h, R, set }) => { const f1 = fbmField(n, 5, 61, 3), f2 = fbmField(n, 4, 62, 8); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x, rust = ss(0.5, 0.75, f1[i]); const scratch = fbmField === null ? 0 : Math.sin(y * 1.7 + f2[i] * 20) * 0.5 + 0.5; let r = mix(88, 140, f2[i]) * (1 - rust * 0.15) + rust * 70, g = mix(92, 130, f2[i]) * (1 - rust * 0.4) + rust * 30, b = mix(96, 125, f2[i]) * (1 - rust * 0.65) + rust * 10; r *= 0.65 + scratch * 0.1; g *= 0.65 + scratch * 0.1; b *= 0.65 + scratch * 0.1; set(x, y, r, g, b, f2[i] * 0.4 + scratch * 0.1 - rust * 0.2); }
    for (let k = 0; k < 14; k++) { const bx = Math.floor(R() * n), by = Math.floor(R() * n); for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= 9) { const j = (((by + yy + n) % n) * n + ((bx + xx + n) % n)); h[j] += 0.6; col[j * 4] *= 1.3; col[j * 4 + 1] *= 1.3; col[j * 4 + 2] *= 1.3; } } }, 2.4);
  /* CRATE: wooden planks */
  T.crate = make(n, 15, ({ col, h, R, set }) => { const f1 = fbmField(n, 4, 71, 4); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x, plank = Math.floor(y / (n / 5)), edge = (y % (n / 5) < 3); const grain = Math.sin((x * 0.15) + f1[i] * 9 + plank * 7) * 0.5 + 0.5; let k = 0.55 + grain * 0.35 + f1[i] * 0.2; if (edge) k *= 0.4; set(x, y, 96 * k, 72 * k, 44 * k, grain * 0.3 - (edge ? 0.7 : 0)); } }, 2.4);
  /* WATER normal (animated by offset) */
  T.water = make(n, 16, ({ col, h, set }) => { const f1 = fbmField(n, 5, 81, 6); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = f1[y * n + x]; set(x, y, 20, 40, 52, v); } }, 5);
  for (const k of Object.keys(T)) { T[k].map.userData.shared = true; T[k].normal.userData.shared = true; }
  return (CACHE[ck] = T);
}
function fbmStreak(st, x, y, n) { return st[((y * 0.25) | 0) * n % (n * n) + x] * 0.6 + st[((y * 0.07) | 0) * n + ((x + 37) % n)] * 0.4; }
/* a small texture drawn with 2D canvas calls (signs, stripes, glyphs) */
export function canvasTexture(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
