/* The 3D asset library: furniture, electrical gear, industrial machinery, laboratory equipment, doors, lockers and the interactive objects, all built from many small connected parts
   (frames, panels, hinges, handles, bolts, drawers, wires, indicators) instead of a few floating boxes. Parts of one kind are merged per material (so a whole level is a handful of draw
   calls) and carry vertex colours: every instance gets its own paint/rust/dirt, with grime gathering near the floor. Units are metres; one tile is 2 m. */
import * as THREE from 'three';

const gb = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const rot3 = (g, rx, ry, rz) => { if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0))); return g; };
const hex = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return ((Math.round((A[0] + (B[0] - A[0]) * t) * 255) << 16) | (Math.round((A[1] + (B[1] - A[1]) * t) * 255) << 8) | Math.round((A[2] + (B[2] - A[2]) * t) * 255)); };
export const CATS = ['steel', 'dark', 'wood', 'white', 'cloth', 'glass', 'liq', 'scr', 'bl1', 'bl2', 'hazard', 'flesh', 'pod', 'bone', 'rust'];
export const newAcc = () => { const a = {}; for (const c of CATS) a[c] = []; return a; };
/* vertex colours: base colour, a darker band near the floor (grime), a little noise */
function paint(g, color, wear, seed) {
  const pos = g.attributes.position, n = pos.count, arr = new Float32Array(n * 3), [r, gr, b] = hex(color); let s = (seed * 9301 + 49297) % 233280;
  for (let i = 0; i < n; i++) { s = (s * 9301 + 49297) % 233280; const nz = 0.9 + 0.2 * (s / 233280), y = pos.getY(i), dirt = 1 - 0.34 * wear * Math.exp(-Math.max(0, y) * 2.4), k = nz * dirt * 1.5; arr[i * 3] = r * k; arr[i * 3 + 1] = gr * k; arr[i * 3 + 2] = b * k; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return g;
}
/* a placement context: where the next parts go (position, rotation, wear) */
export function ctx(acc, cx, cz, rot, wear, seed, pre) {
  const put = (cat, g, color) => { paint(g, color, wear, seed++); if (pre) g.applyMatrix4(pre); g.applyMatrix4(new THREE.Matrix4().makeRotationY(rot)); g.translate(cx, 0, cz); acc[cat].push(g); };
  const B = (cat, w, h, d, x, y, z, color, rx, ry, rz) => { const g = gb(w, h, d); rot3(g, rx, ry, rz); g.translate(x, y, z); put(cat, g, color); };
  /* ax: 'y' vertical (default), 'x' or 'z' horizontal */
  const C = (cat, r1, r2, h, x, y, z, color, seg, ax) => { const g = new THREE.CylinderGeometry(r1, r2, h, seg || 12); if (ax === 'x') g.rotateZ(Math.PI / 2); else if (ax === 'z') g.rotateX(Math.PI / 2); g.translate(x, y, z); put(cat, g, color); };
  const S = (cat, rx, ry, rz, x, y, z, color) => { const g = new THREE.SphereGeometry(1, 12, 9); g.scale(rx, ry, rz); g.translate(x, y, z); put(cat, g, color); };
  return { B, C, S, put, cx, cz, rot, acc, wear };
}
const STEEL = [0x676e75, 0x59636c, 0x7a8087, 0x4f5a52, 0x5e5a52], WOOD = [0x6b4a2e, 0x84603c, 0x57402b, 0x75573a], PAINT = [0x7d8a7f, 0x8a8f86, 0x6f7f8c, 0x9a9486, 0x8c7e6a];
const pk = (a, R) => a[Math.floor(R() * a.length)];

/* ---------- static props: each takes (K = ctx, R = random, WH = ceiling height) ---------- */
const PROPS = {
  desk(K, R) {
    const { B, C } = K, w = pk(WOOD, R), m = pk(STEEL, R), side = R() < 0.5 ? -1 : 1;
    B('wood', 1.6, 0.05, 0.8, 0, 0.75, 0, w); B('wood', 1.62, 0.02, 0.82, 0, 0.77, 0, mix(w, 0x000000, 0.25));                                                  // top with an edge lip
    B('steel', 0.05, 0.72, 0.7, -side * 0.72, 0.36, 0, m); B('wood', 1.4, 0.5, 0.03, 0, 0.5, -0.36, mix(w, 0, 0.3));                                           // side panel, modesty panel
    B('wood', 0.5, 0.64, 0.7, side * 0.55, 0.34, 0, mix(w, 0, 0.1));                                                                                              // drawer pedestal
    for (let i = 0; i < 3; i++) { B('wood', 0.46, 0.18, 0.02, side * 0.55, 0.12 + i * 0.2, 0.36, mix(w, 0xffffff, 0.08)); B('steel', 0.14, 0.02, 0.03, side * 0.55, 0.2 + i * 0.2, 0.39, 0x9aa0a4); }
    B('steel', 0.05, 0.05, 0.62, side * 0.28, 0.1, 0, m);
    if (R() < 0.7) { B('dark', 0.42, 0.3, 0.06, -side * 0.2, 1.0, -0.15, 0x1b1d20); B('scr', 0.38, 0.25, 0.02, -side * 0.2, 1.0, -0.115, 0x203038); B('dark', 0.1, 0.12, 0.1, -side * 0.2, 0.84, -0.15, 0x1b1d20); B('dark', 0.42, 0.02, 0.16, -side * 0.2, 0.79, 0.12, 0x2a2c30); }
    for (let i = 0; i < 3; i++) B('cloth', 0.22 + R() * 0.1, 0.012 + i * 0.012, 0.3, side * 0.5 + (R() - 0.5) * 0.2, 0.79 + i * 0.012, 0.1, 0x9a927c, 0, R() * 0.5);
    C('white', 0.04, 0.035, 0.09, side * 0.2, 0.83, 0.25, 0xa8a59a, 10);
  },
  table(K, R) {
    const { B } = K, w = pk(WOOD, R), m = pk(STEEL, R);
    B('wood', 1.7, 0.06, 0.85, 0, 0.8, 0, w); B('wood', 1.74, 0.025, 0.89, 0, 0.84, 0, mix(w, 0, 0.3));
    for (const sx of [-0.78, 0.78]) for (const sz of [-0.34, 0.34]) { B('steel', 0.06, 0.78, 0.06, sx, 0.39, sz, m); B('dark', 0.08, 0.02, 0.08, sx, 0.01, sz, 0x222222); }
    B('steel', 1.5, 0.04, 0.04, 0, 0.62, -0.34, m); B('steel', 1.5, 0.04, 0.04, 0, 0.62, 0.34, m); B('steel', 0.04, 0.04, 0.68, -0.78, 0.62, 0, m); B('steel', 0.04, 0.04, 0.68, 0.78, 0.62, 0, m);
    if (R() < 0.6) B('cloth', 0.3, 0.02, 0.4, (R() - 0.5) * 0.8, 0.86, (R() - 0.5) * 0.3, 0x9a927c, 0, R() * 3);
    if (R() < 0.5) K.C('white', 0.05, 0.04, 0.1, (R() - 0.5) * 1.2, 0.91, (R() - 0.5) * 0.4, 0xa8a59a, 10);
  },
  chair(K, R) {
    const over = R() < 0.18, m = pk(STEEL, R), cl = pk([0x3a4a58, 0x4a3c3c, 0x2f3a33, 0x55503e], R), K2 = over ? ctx(K.acc, K.cx, K.cz, K.rot, 0.9, 77, new THREE.Matrix4().makeRotationZ(1.45).setPosition(0.25, 0.3, 0)) : K;
    const { B: b2, C: c2 } = K2;
    b2('cloth', 0.46, 0.07, 0.46, 0, 0.47, 0, cl); b2('cloth', 0.44, 0.5, 0.07, 0, 0.78, -0.23, cl, -0.08); b2('dark', 0.3, 0.05, 0.05, 0, 1.06, -0.26, 0x1b1d20);
    c2('steel', 0.03, 0.03, 0.4, 0, 0.25, 0, m, 8); for (let i = 0; i < 5; i++) { const a = i * 1.2566; b2('steel', 0.32, 0.03, 0.04, Math.cos(a) * 0.16, 0.05, Math.sin(a) * 0.16, m, 0, -a); c2('dark', 0.035, 0.035, 0.03, Math.cos(a) * 0.3, 0.025, Math.sin(a) * 0.3, 0x1b1d20, 8); }
    b2('steel', 0.04, 0.04, 0.3, -0.26, 0.62, 0, m); b2('steel', 0.04, 0.04, 0.3, 0.26, 0.62, 0, m);
  },
  cabinet(K, R) {
    const { B } = K, m = pk(PAINT, R), n = 4, h = 1.35;
    B('steel', 0.62, h, 0.7, 0, h / 2, 0, m); B('steel', 0.66, 0.03, 0.74, 0, h + 0.015, 0, mix(m, 0, 0.2));
    for (let i = 0; i < n; i++) { const y = 0.12 + i * (h - 0.16) / n + 0.15; B('steel', 0.56, (h - 0.16) / n - 0.03, 0.025, 0, y, 0.355, mix(m, 0xffffff, 0.06)); B('dark', 0.16, 0.03, 0.04, 0, y + 0.08, 0.385, 0x2a2c30); B('cloth', 0.12, 0.05, 0.005, 0, y + 0.02, 0.37, 0xa5a290); }
    B('steel', 0.62, 0.03, 0.04, 0, 0.02, 0.33, 0x2a2c30);
    if (R() < 0.5) B('dark', 0.06, 0.08, 0.03, 0.22, h - 0.12, 0.37, 0x33363a);
  },
  shelf(K, R) {
    const { B } = K, m = pk(STEEL, R), w = 1.8, d = 0.55, h = 2.1;
    for (const sx of [-w / 2, w / 2]) for (const sz of [-d / 2, d / 2]) B('steel', 0.05, h, 0.05, sx, h / 2, sz, m);
    for (let i = 0; i < 5; i++) { const y = 0.12 + i * 0.5; B('steel', w, 0.03, d, 0, y, 0, mix(m, 0, 0.15)); B('steel', w, 0.05, 0.02, 0, y + 0.03, d / 2 - 0.01, m);
      let x = -w / 2 + 0.12; while (x < w / 2 - 0.2 && R() < 0.85) { const bw = 0.15 + R() * 0.25, bh = 0.18 + R() * 0.22; if (R() < 0.5) B('wood', bw, bh, 0.3 + R() * 0.15, x + bw / 2, y + 0.015 + bh / 2, (R() - 0.5) * 0.08, pk(WOOD, R)); else B('cloth', bw * 0.5, bh, 0.28, x + bw / 4, y + 0.015 + bh / 2, 0, pk([0x3a4a58, 0x6a3a30, 0x4a5a40, 0x8f8a7c], R)); x += bw + 0.03; } }
    B('steel', 0.03, h - 0.1, 0.03, 0, h / 2, -d / 2, mix(m, 0, 0.1), 0, 0, 0.2); B('steel', 0.03, h - 0.1, 0.03, 0, h / 2, -d / 2, mix(m, 0, 0.1), 0, 0, -0.2);
  },
  bed(K, R) {
    const { B, C } = K, m = pk(STEEL, R);
    B('steel', 1.9, 0.04, 0.9, 0, 0.55, 0, m); B('white', 1.8, 0.14, 0.82, 0, 0.64, 0, 0x9ca09c); B('cloth', 0.4, 0.1, 0.55, -0.7, 0.76, 0, 0xa0a098); B('cloth', 1.3, 0.04, 0.84, 0.25, 0.73, 0, mix(0x8aa0a0, 0, R() * 0.3));
    B('steel', 0.05, 0.7, 0.9, -0.95, 0.85, 0, m); B('steel', 0.05, 0.5, 0.9, 0.95, 0.8, 0, m); for (const s of [-1, 1]) { B('steel', 1.1, 0.03, 0.03, 0.1, 0.92, s * 0.43, m); B('steel', 1.1, 0.03, 0.03, 0.1, 0.8, s * 0.43, m); }
    for (const sx of [-0.8, 0.8]) for (const sz of [-0.38, 0.38]) { B('steel', 0.04, 0.4, 0.04, sx, 0.3, sz, m); C('dark', 0.06, 0.06, 0.04, sx, 0.04, sz, 0x1b1d20, 10, 'z'); }
    C('steel', 0.015, 0.015, 1.6, 0.9, 0.9, -0.5, m, 6); B('steel', 0.3, 0.02, 0.02, 0.9, 1.7, -0.5, m); C('white', 0.06, 0.06, 0.14, 0.85, 1.55, -0.5, 0xa4aaaa, 8);
  },
  trolley(K, R) {
    const { B, C } = K, m = pk(STEEL, R);
    for (const s of [0.3, 0.9]) B('steel', 0.9, 0.025, 0.55, 0, s, 0, m); for (const sx of [-0.42, 0.42]) for (const sz of [-0.25, 0.25]) { B('steel', 0.03, 0.95, 0.03, sx, 0.5, sz, m); C('dark', 0.05, 0.05, 0.04, sx, 0.05, sz, 0x1b1d20, 10, 'z'); }
    B('steel', 0.03, 0.03, 0.55, -0.42, 1.0, 0, m); B('steel', 0.9, 0.012, 0.4, 0, 0.93, 0, 0xa8aeb0);
    if (R() < 0.7) { B('white', 0.3, 0.1, 0.22, -0.2, 0.99, 0, 0x9ea29e); B('bl1', 0.1, 0.01, 0.02, -0.2, 1.045, 0, 0xa02020); } B('glass', 0.07, 0.18, 0.07, 0.25, 1.03, 0.1, 0x9ac0c0); B('cloth', 0.4, 0.04, 0.3, 0.1, 0.34, 0, 0x8aa0a0);
  },
  computer(K, R) {
    const { B } = K, w = pk(WOOD, R);
    B('wood', 1.3, 0.05, 0.7, 0, 0.75, 0, w); for (const sx of [-0.6, 0.6]) B('steel', 0.05, 0.73, 0.65, sx, 0.365, 0, 0x4f5961);
    B('dark', 0.46, 0.34, 0.2, -0.05, 1.0, -0.1, 0x25282b); B('scr', 0.4, 0.27, 0.02, -0.05, 1.0, 0.005, 0x21443a); B('dark', 0.1, 0.14, 0.1, -0.05, 0.84, -0.1, 0x25282b);
    B('dark', 0.2, 0.4, 0.4, 0.45, 0.97, -0.1, 0x7d7a6e); B('dark', 0.16, 0.03, 0.02, 0.45, 1.1, 0.11, 0x2a2c30); B('bl2', 0.015, 0.015, 0.01, 0.52, 1.0, 0.11, 0x30c060);
    B('dark', 0.44, 0.025, 0.16, -0.05, 0.79, 0.2, 0x8a877a); B('dark', 0.1, 0.02, 0.07, 0.25, 0.79, 0.22, 0x1b1d20);
    B('steel', 0.5, 0.4, 0.5, 0, 0.2, 0.0, 0x4a5258);
  },
  server(K, R) {
    const { B } = K;
    B('steel', 0.8, 2.0, 0.9, 0, 1.0, 0, 0x3b4249); B('steel', 0.84, 0.05, 0.94, 0, 2.02, 0, 0x2a2f34); B('dark', 0.7, 1.8, 0.04, 0, 1.0, 0.46, 0x1d2024);
    for (let i = 0; i < 9; i++) { const y = 0.25 + i * 0.19; B('steel', 0.66, 0.15, 0.04, 0, y, 0.47, 0x4a525a); for (let j = 0; j < 4; j++) B(R() < 0.5 ? 'bl2' : 'bl1', 0.02, 0.02, 0.01, -0.22 + j * 0.06, y, 0.495, R() < 0.8 ? 0x30c060 : 0xc02020); B('dark', 0.26, 0.04, 0.01, 0.15, y, 0.495, 0x16181b); }
    for (let i = 0; i < 3; i++) B('dark', 0.03, 0.9, 0.03, -0.3 + i * 0.05, 1.6, -0.48, 0x16181b, 0, 0, 0.1 * (i - 1));
    B('steel', 0.04, 0.04, 0.5, -0.38, 0.05, 0.1, 0x2a2f34); B('steel', 0.04, 0.04, 0.5, 0.38, 0.05, 0.1, 0x2a2f34);
  },
  console(K, R) {
    const { B } = K, m = pk(STEEL, R);
    B('steel', 1.7, 0.85, 0.75, 0, 0.43, 0, m); B('dark', 1.62, 0.07, 0.62, 0, 0.88, 0.03, 0x25282b); B('steel', 1.7, 0.55, 0.14, 0, 1.18, -0.34, mix(m, 0, 0.1));
    for (let i = -1; i <= 1; i++) { B('dark', 0.5, 0.4, 0.06, i * 0.54, 1.28, -0.28, 0x16181b, -0.2); B('scr', 0.44, 0.33, 0.02, i * 0.54, 1.28, -0.25, i === 0 ? 0x2f6a58 : 0x26475c, -0.2); }
    for (let i = 0; i < 12; i++) B('dark', 0.05, 0.03, 0.05, -0.62 + i * 0.11, 0.935, 0.1 + (i % 2) * 0.07, pk([0x9a2a22, 0x2a6a3a, 0xb09a30, 0x30343a], R)); for (let i = 0; i < 4; i++) { B('dark', 0.025, 0.1, 0.025, 0.55 + i * 0.09, 0.97, 0.22, 0x1b1d20, 0, 0, (R() - 0.5) * 0.6); }
    B('steel', 0.4, 0.04, 0.04, 0, 0.1, 0.4, 0x1b1d20); for (let i = 0; i < 3; i++) B('bl' + (1 + (i % 2)), 0.03, 0.03, 0.02, -0.7 + i * 0.05, 1.5, -0.27, i % 2 ? 0x30c060 : 0xc02020);
  },
  tank(K, R) {
    const { B, C } = K, m = pk([0x55656a, 0x5a6a58, 0x6a6a60], R);
    C('steel', 0.82, 0.82, 2.2, 0, 1.2, 0, m, 20); C('steel', 0.8, 0.5, 0.25, 0, 2.43, 0, mix(m, 0, 0.1), 20); C('steel', 0.9, 0.9, 0.12, 0, 0.1, 0, 0x3a4044, 20);
    for (const y of [0.55, 1.2, 1.85]) C('steel', 0.84, 0.84, 0.05, 0, y, 0, mix(m, 0, 0.25), 20);
    for (let i = 0; i < 9; i++) B('steel', 0.04, 0.04, 0.04, Math.cos(i * 0.7) * 0.8, 0.55, Math.sin(i * 0.7) * 0.8, 0x2a2e30);
    B('steel', 0.06, 2.3, 0.04, 0.82, 1.2, 0.2, 0x4a5258); B('steel', 0.06, 2.3, 0.04, 0.82, 1.2, -0.2, 0x4a5258); for (let i = 0; i < 8; i++) B('steel', 0.04, 0.04, 0.44, 0.82, 0.3 + i * 0.28, 0, 0x4a5258);
    C('steel', 0.1, 0.1, 0.3, -0.6, 2.6, 0.2, 0x4a5258, 10); C('dark', 0.07, 0.07, 0.6, -0.4, 0.3, 0.8, 0x3a4044, 10, 'x'); B('hazard', 0.3, 0.12, 0.01, 0, 1.3, 0.82, 0xc99a14); C('white', 0.1, 0.1, 0.03, 0.3, 1.5, 0.83, 0xa8a89c, 14, 'z'); B('bl1', 0.02, 0.07, 0.01, 0.3, 1.5, 0.85, 0xa02020);
  },
  specimen(K, R) {
    const { B, C } = K, broken = R() < 0.35;
    C('steel', 0.62, 0.66, 0.2, 0, 0.1, 0, 0x30363a, 20); C('glass', 0.54, 0.54, 1.9, 0, 1.15, 0, 0x9ac4cc, 20); if (!broken) C('liq', 0.5, 0.5, 1.6, 0, 1.05, 0, 0x4ad0b0, 18); else C('liq', 0.5, 0.5, 0.5, 0, 0.45, 0, 0x4ad0b0, 18);
    C('steel', 0.6, 0.56, 0.18, 0, 2.15, 0, 0x30363a, 20); for (let i = 0; i < 3; i++) C('dark', 0.03, 0.03, 0.9, -0.2 + i * 0.2, 2.6, 0, 0x16181b, 6); B('dark', 0.5, 0.02, 0.02, 0, 3.0, 0, 0x16181b);
    B('white', 0.3, 0.14, 0.02, 0, 0.35, 0.64, 0xa5a59a); B('bl2', 0.03, 0.03, 0.01, 0.2, 0.35, 0.66, 0x30c060); for (let i = 0; i < 4; i++) B('steel', 0.04, 1.9, 0.04, Math.cos(i * 1.57 + 0.78) * 0.56, 1.15, Math.sin(i * 1.57 + 0.78) * 0.56, 0x30363a);
    if (!broken && R() < 0.5) B('flesh', 0.18, 0.5, 0.18, 0, 1.2, 0, 0x6a4a44, 0.2, 0, 0.3);
  },
  machine(K, R) {
    const { B, C } = K, m = pk([0x56635a, 0x5f5a4c, 0x4a5662, 0x6a5a40], R);
    B('steel', 1.7, 1.9, 1.3, 0, 1.0, 0, m); B('steel', 1.8, 0.1, 1.4, 0, 0.05, 0, 0x2a2e30); B('dark', 1.55, 0.14, 1.15, 0, 1.97, 0, 0x2a2e30);
    for (let i = 0; i < 6; i++) B('dark', 1.2, 0.03, 0.02, 0, 0.45 + i * 0.1, 0.66, 0x16181b); B('steel', 0.6, 0.45, 0.04, -0.4, 1.4, 0.67, mix(m, 0xffffff, 0.1));
    for (let i = 0; i < 3; i++) C('white', 0.07, 0.07, 0.03, -0.55 + i * 0.15, 1.4, 0.7, 0xa8a89c, 14, 'z'); for (let i = 0; i < 4; i++) B(i % 2 ? 'bl1' : 'bl2', 0.05, 0.05, 0.02, 0.3 + i * 0.1, 1.4, 0.69, i % 2 ? 0xa02020 : 0x30c060);
    C('steel', 0.1, 0.1, WHc(K), 0.55, 1.9 + WHc(K) / 2, 0.3, 0x4a5258, 10); C('steel', 0.07, 0.07, 1.0, 0.9, 1.1, 0.25, 0x4a5258, 8); B('hazard', 1.5, 0.12, 0.01, 0, 0.25, 0.66, 0xc99a14);
    for (const sx of [-0.8, 0.8]) for (const sy of [0.4, 1.5]) C('dark', 0.025, 0.025, 0.03, sx, sy, 0.66, 0x16181b, 6, 'z'); B('dark', 0.5, 0.1, 0.5, -0.9, 0.05, 0.4, 0x16181b);
  },
  pump(K, R) {
    const { B, C } = K, m = pk([0x3d5a68, 0x56635a, 0x6a4a38], R);
    B('steel', 1.5, 0.12, 0.8, 0, 0.06, 0, 0x30363a); C('steel', 0.34, 0.34, 0.9, -0.3, 0.55, 0, m, 16, 'x'); C('steel', 0.4, 0.4, 0.5, 0.45, 0.58, 0, mix(m, 0, 0.15), 16, 'x');
    for (let i = 0; i < 6; i++) { const a = i * 1.047; C('dark', 0.025, 0.025, 0.02, 0.45 + 0.0, 0.58 + Math.sin(a) * 0.34, Math.cos(a) * 0.34, 0x16181b, 6, 'x'); }
    C('steel', 0.1, 0.1, 0.8, 0.6, 1.0, 0, 0x4a5258, 10); C('steel', 0.15, 0.15, 0.04, 0.6, 0.6, 0, 0x4a5258, 12); C('steel', 0.15, 0.15, 0.04, 0.6, 1.4, 0, 0x4a5258, 12); C('white', 0.07, 0.07, 0.03, 0.2, 1.0, 0.3, 0xa8a89c, 14, 'z'); B('bl1', 0.01, 0.05, 0.01, 0.2, 1.0, 0.33, 0xa02020);
    C('dark', 0.05, 0.05, 0.6, 0.1, 0.18, 0.4, 0x16181b, 6, 'x'); B('steel', 0.3, 0.08, 0.04, -0.6, 0.9, 0.0, 0x2a2e30);
  },
  genprop(K, R) {
    const { B, C } = K;
    B('steel', 1.7, 0.1, 1.0, 0, 0.1, 0, 0x2a2e30); B('steel', 1.4, 0.8, 0.8, -0.1, 0.55, 0, 0x6a5a3a); C('steel', 0.34, 0.34, 1.1, 0.1, 1.15, 0, 0x5a5a4e, 16, 'x'); B('dark', 0.34, 0.5, 0.7, 0.62, 0.6, 0, 0x16181b);
    for (let i = 0; i < 5; i++) B('dark', 0.02, 0.4, 0.02, 0.8, 0.6, -0.3 + i * 0.15, 0x0a0a0c); C('steel', 0.06, 0.06, 0.9, -0.7, 1.35, 0.3, 0x3a3a34, 8); B('steel', 0.4, 0.3, 0.04, -0.3, 0.7, 0.42, 0x33373a); B('bl1', 0.05, 0.05, 0.02, -0.4, 0.75, 0.45, 0xa02020);
  },
  pipe(K, R) {
    const { B, C } = K, m = pk(STEEL, R), wh = WHc(K);
    C('steel', 0.17, 0.17, wh, 0, wh / 2, 0, m, 12); C('steel', 0.1, 0.1, wh, 0.34, wh / 2, 0.05, mix(m, 0x6a4a30, 0.3), 10);
    for (const y of [0.5, 1.4, 2.3]) { C('steel', 0.22, 0.22, 0.07, 0, y, 0, 0x30363a, 12); C('steel', 0.14, 0.14, 0.05, 0.34, y, 0.05, 0x30363a, 10); B('dark', 0.5, 0.04, 0.12, 0.17, y - 0.1, 0.02, 0x30363a); }
    C('steel', 0.13, 0.13, 0.5, 0.17, 1.9, 0.0, 0x4a5258, 10, 'x'); C('white', 0.07, 0.07, 0.03, -0.12, 1.1, 0.16, 0xa8a89c, 14, 'z');
  },
  column(K, R) {
    const { B, C } = K, wh = WHc(K);
    C('steel', 0.46, 0.5, wh, 0, wh / 2, 0, 0x7d7a72, 14); B('dark', 1.0, 0.1, 1.0, 0, 0.05, 0, 0x30333a); B('dark', 1.0, 0.1, 1.0, 0, wh - 0.05, 0, 0x30333a); C('hazard', 0.505, 0.505, 0.5, 0, 0.9, 0, 0xc99a14, 14);
    C('dark', 0.03, 0.03, wh - 0.3, 0.5, wh / 2, 0, 0x16181b, 6); for (let i = 0; i < 4; i++) B('dark', 0.05, 0.05, 0.05, Math.cos(i * 1.57 + 0.78) * 0.44, 0.12, Math.sin(i * 1.57 + 0.78) * 0.44, 0x16181b);
  },
  crate(K, R) {
    const { B } = K, w = pk(WOOD, R), s = 1.1 + R() * 0.3;
    for (let k = 0; k < (R() < 0.5 ? 2 : 1); k++) { const y = k * s * 0.72, sz = k ? s * 0.75 : s; B('wood', sz, sz * 0.72, sz, k * 0.1, y + sz * 0.36, 0, w, 0, k * 0.4);
      for (const sx of [-1, 1]) B('wood', 0.06, sz * 0.74, sz * 1.02, k * 0.1 + sx * sz * 0.45, y + sz * 0.36, 0, mix(w, 0, 0.2), 0, k * 0.4); B('wood', sz * 1.02, 0.06, 0.1, k * 0.1, y + sz * 0.72, 0, mix(w, 0, 0.2), 0, k * 0.4); B('hazard', 0.22, 0.14, 0.01, 0.1, y + sz * 0.4, sz / 2 + 0.01, 0xd8d0b8, 0, k * 0.4); }
  },
  barrel(K, R) {
    const { C, B } = K;
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4, x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42, m = pk([0x5a4a30, 0x3a4a5a, 0x4a5a3a, 0x6a2a24], R); C('steel', 0.36, 0.36, 0.95, x, 0.48, z, m, 14); for (const y of [0.15, 0.48, 0.8]) C('steel', 0.375, 0.375, 0.04, x, y, z, mix(m, 0, 0.3), 14); C('dark', 0.34, 0.34, 0.03, x, 0.96, z, 0x2a2c30, 14); C('dark', 0.05, 0.05, 0.03, x + 0.1, 0.98, z, 0x16181b, 8); B('hazard', 0.14, 0.1, 0.01, x, 0.55, z + 0.37, 0xd8d0b8, 0, a); }
  },
  labbench(K, R) {
    const { B, C } = K;
    B('white', 1.8, 0.05, 0.8, 0, 0.9, 0, 0x9a9e9a); B('dark', 1.8, 0.02, 0.82, 0, 0.935, 0, 0x2a3034); for (const sx of [-0.85, 0, 0.85]) B('steel', 0.05, 0.88, 0.7, sx, 0.44, 0, 0x6f7a80); B('steel', 1.7, 0.5, 0.03, 0, 0.5, -0.36, 0x5e686e);
    C('steel', 0.2, 0.2, 0.06, -0.5, 0.97, 0, 0xb4bcc0, 14); C('dark', 0.015, 0.015, 0.3, -0.5, 1.12, -0.2, 0xb4bcc0, 6); for (let i = 0; i < 4; i++) C('glass', 0.04, 0.04, 0.16, 0.1 + i * 0.12, 1.02, 0.1, 0x9ac4cc, 8); C('liq', 0.033, 0.033, 0.08, 0.1, 1.0, 0.1, 0x4ad0b0, 8);
    B('dark', 0.2, 0.12, 0.14, 0.62, 1.0, 0.0, 0x25282b); C('dark', 0.03, 0.03, 0.12, 0.62, 1.1, 0, 0x16181b, 6); B('scr', 0.12, 0.05, 0.01, 0.62, 1.0, 0.075, 0x2f6a58);
    for (let i = 0; i < 3; i++) B('white', 0.5, 0.2, 0.02, -0.55 + i * 0.55, 0.6, 0.355, 0x7a8588);
  },
  sofa(K, R) {
    const { B } = K, cl = pk([0x4a3a3a, 0x3a4a58, 0x4a4a3a, 0x5a3a30], R);
    B('cloth', 1.7, 0.3, 0.8, 0, 0.3, 0, cl); B('cloth', 1.7, 0.5, 0.18, 0, 0.7, -0.33, cl, -0.1); for (const s of [-1, 1]) B('cloth', 0.18, 0.28, 0.8, s * 0.86, 0.5, 0, mix(cl, 0, 0.15)); B('cloth', 0.78, 0.12, 0.62, -0.4, 0.5, 0.05, mix(cl, 0xffffff, 0.06)); B('cloth', 0.78, 0.12, 0.62, 0.4, 0.5, 0.05, mix(cl, 0xffffff, 0.06));
    for (const sx of [-0.8, 0.8]) for (const sz of [-0.34, 0.34]) B('dark', 0.05, 0.12, 0.05, sx, 0.06, sz, 0x16181b);
  },
  counter(K, R) {
    const { B } = K, w = pk(WOOD, R);
    B('wood', 1.9, 1.05, 0.5, 0, 0.53, 0.2, mix(w, 0, 0.1)); B('wood', 1.96, 0.05, 0.9, 0, 1.07, 0.1, w); B('dark', 0.5, 0.3, 0.06, -0.3, 1.25, 0.1, 0x1b1d20); B('scr', 0.44, 0.24, 0.02, -0.3, 1.25, 0.14, 0x203038); B('cloth', 0.3, 0.015, 0.4, 0.5, 1.1, 0.1, 0x9a927c, 0, 0.3); B('dark', 0.14, 0.12, 0.08, 0.1, 1.14, 0.2, 0x1b1d20);
  },
  ...{}
};
const WHc = (K) => K.wh || 3.2;

/* nest props keep the older biological look but get tendrils and a wet sheen */
PROPS.cocoon = (K, R) => { const { B, C, S } = K; C('flesh', 0.12, 0.2, WHc(K) - 0.9, 0, 0.9 + (WHc(K) - 0.9) / 2, 0, 0x3b1214, 8); S('pod', 0.62, 1.05, 0.62, 0, 1.15, 0, 0x6a2a2e); C('flesh', 0.95, 1.15, 0.3, 0, 0.15, 0, 0x3b1214, 12); for (let k = 0; k < 6; k++) { const a = k * 1.05; B('flesh', 0.1, 0.8, 0.1, Math.cos(a) * 0.9, 0.35, Math.sin(a) * 0.9, 0x4a1a1c, 0.5 * Math.cos(a), 0, 0.5 * Math.sin(a)); } };
PROPS.pod = (K, R) => { const { C, S, B } = K; S('pod', 0.75, 1.05, 0.75, 0, 1.0, 0, 0x7a2a30); C('flesh', 0.9, 1.1, 0.3, 0, 0.15, 0, 0x3b1214, 12); for (let k = 0; k < 4; k++) B('flesh', 0.08, 0.5, 0.08, Math.cos(k * 1.6) * 0.95, 0.2, Math.sin(k * 1.6) * 0.95, 0x4a1a1c, 0.6, 0, 0.6); };
PROPS.bones = (K, R) => { const { C, S } = K; for (let i = 0; i < 9; i++) { const g = new THREE.CylinderGeometry(0.04, 0.06, 0.6 + R() * 0.6, 6); g.rotateZ(R() * 3); g.rotateY(R() * 6); g.translate((R() - 0.5) * 1.4, 0.15 + R() * 0.2, (R() - 0.5) * 1.4); K.put('bone', g, 0xb8ad98); } S('bone', 0.2, 0.17, 0.25, 0.1, 0.17, 0.2, 0xcfc4ae); C('flesh', 0.95, 1.05, 0.12, 0, 0.06, 0, 0x3b1214, 12); };
PROPS.cage = (K, R) => { const { B } = K; for (const sx of [-0.8, 0.8]) for (const sz of [-0.8, 0.8]) B('dark', 0.08, 2.2, 0.08, sx, 1.1, sz, 0x25282b); B('dark', 1.7, 0.07, 1.7, 0, 2.2, 0, 0x25282b); B('dark', 1.7, 0.07, 1.7, 0, 0.04, 0, 0x25282b); for (let i = -3; i <= 3; i++) for (const s of [-0.8, 0.8]) { B('dark', 0.03, 2.2, 0.03, i * 0.26, 1.1, s, 0x30343a); B('dark', 0.03, 2.2, 0.03, s, 1.1, i * 0.26, 0x30343a); } B('dark', 1.6, 0.03, 0.03, 0, 1.2, 0.8, 0x30343a); B('steel', 0.14, 0.2, 0.06, 0.1, 1.1, 0.84, 0x7a7f84); B('bone', 0.4, 0.06, 0.1, 0.1, 0.1, 0.1, 0xb8ad98, 0, 0.6); };
export const PROP_KINDS = Object.keys(PROPS);
export function buildProp(kind, acc, cx, cz, rot, R, wh, seed) { const f = PROPS[kind]; if (!f) return false; const K = ctx(acc, cx, cz, rot, 0.6 + R() * 0.8, seed || 1); K.wh = wh; f(K, R); return true; }

/* ---------- wall fixtures: extinguishers, fuse boxes, pipe runs, signs, clocks, notice boards, cables ---------- */
export function wallFixtures(acc, faces, roomAt, R, WH, TS) {
  const per = new Map();
  for (const f of faces) {
    const room = roomAt(f.tx, f.ty); if (!room) continue; const n = per.get(room) || 0; if (n >= 4 || R() > 0.07) continue; per.set(room, n + 1);
    const nx = f.n[0], nz = f.n[1], K = ctx(acc, f.x + nx * 0.04, f.z + nz * 0.04, Math.atan2(nx, nz), 0.8, (f.tx * 31 + f.ty * 17) | 1), { B, C } = K, k = room.kind, pick = R();
    if (pick < 0.3 && /office|hall|reception|security|storage|lab|archive|canteen|medical/.test(k)) { C('rust', 0.1, 0.1, 0.46, 0, 0.9, 0.08, 0xa02a22, 12); C('dark', 0.04, 0.04, 0.1, 0, 1.18, 0.08, 0x16181b, 8); B('dark', 0.03, 0.03, 0.18, 0.06, 1.2, 0.1, 0x16181b); C('dark', 0.015, 0.015, 0.5, 0.1, 0.95, 0.09, 0x16181b, 6); B('steel', 0.2, 0.04, 0.05, 0, 0.78, 0.06, 0x6f757b); B('white', 0.14, 0.05, 0.005, 0, 0.95, 0.19, 0xa5a290); }
    else if (pick < 0.55 && /generator|maintenance|pump|control|machine|tunnel|hive|lift|vault|cells/.test(k)) { B('steel', 0.5, 0.65, 0.16, 0, 1.4, 0.08, 0x5a6a60); B('steel', 0.44, 0.58, 0.02, 0, 1.4, 0.17, 0x65766a); B('hazard', 0.12, 0.12, 0.005, 0, 1.62, 0.185, 0xc99a14); B('dark', 0.05, 0.04, 0.03, 0.17, 1.4, 0.19, 0x16181b); for (let i = 0; i < 3; i++) B('dark', 0.1, 0.012, 0.02, -0.05, 1.3 + i * 0.07, 0.19, 0x25282b); C('dark', 0.02, 0.02, 0.5, 0.1, 1.0, 0.1, 0x16181b, 6); }
    else if (pick < 0.75) { const y = 0.6 + R() * 1.6; C('steel', 0.07, 0.07, TS, 0, y, 0.1, pk(STEEL, R), 8, 'x'); for (const s of [-0.7, 0.7]) B('steel', 0.04, 0.2, 0.12, s, y, 0.05, 0x2a2e30); if (R() < 0.5) C('steel', 0.05, 0.05, TS, 0.0, y + 0.18, 0.1, mix(pk(STEEL, R), 0x6a4a30, 0.4), 8, 'x'); }
    else if (pick < 0.88 && /office|reception|security|canteen|archive|lab/.test(k)) { B('wood', 0.9, 0.6, 0.03, 0, 1.5, 0.03, 0x7a5a38); B('cloth', 0.8, 0.5, 0.01, 0, 1.5, 0.05, 0xb4a888); for (let i = 0; i < 4; i++) B('cloth', 0.18, 0.22, 0.005, -0.28 + i * 0.19, 1.5 + (i % 2) * 0.05, 0.07, pk([0x9c957c, 0xc8b898, 0xa0a8a0], R), 0, 0, (R() - 0.5) * 0.2); }
    else { C('dark', 0.2, 0.2, 0.05, 0, 2.2, 0.03, 0x1d2024, 18, 'z'); C('white', 0.17, 0.17, 0.02, 0, 2.2, 0.06, 0xd8d4c4, 18, 'z'); B('dark', 0.01, 0.12, 0.01, 0, 2.23, 0.08, 0x16181b); B('dark', 0.1, 0.01, 0.01, 0.04, 2.2, 0.08, 0x16181b); }
  }
}

/* ---------- interactive objects (each returns a Group plus the handles the game animates) ---------- */
function grain(dis) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(70,70,70,' + (0.12 + Math.random() * 0.2) + ')'; x.fillRect(0, Math.random() * 64, 64, 0.6 + Math.random() * 1.6); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; dis.push({ dispose() { t.dispose(); } }); return t; }
export function mkMats(lit, patchPulse, tex, dis) {
  const v = (o) => { const m = lit(Object.assign({ vertexColors: true }, o)); patchPulse(m); dis.push(m); return m; };
  return { steel: v({ roughness: 0.55, metalness: 0.18, map: tex.metal.map, color: 0xc4c4c4 }), dark: v({ roughness: 0.65, metalness: 0.08, color: 0xb4b4b4 }), wood: v({ roughness: 0.85, color: 0x9a9a9a, map: grain(dis) }), white: v({ roughness: 0.5, metalness: 0.05, color: 0x8c8c8c }), cloth: v({ roughness: 1, color: 0x9a9a9a }), rust: v({ roughness: 0.7, metalness: 0.1, color: 0xb0b0b0 }) };
}
export { paint };
export const kindList = PROP_KINDS;
