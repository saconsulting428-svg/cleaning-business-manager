/* Signed-distance modelling: smooth unions of capsules / cones / ellipsoids, polygonised with surface nets into one organic mesh, with gradient normals and bone weights.
   Used for the creature, so its body is one continuous skin (no visible joints) that is then skinned to a bone tree and animated. */
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
export function sdCapsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az; const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
export function sdRoundCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az, l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2, pax = px - ax, pay = py - ay, paz = pz - az;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2, qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y, x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2; if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1; return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
export function sdEllipsoid(px, py, pz, cx, cy, cz, rx, ry, rz) { const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz, k0 = Math.hypot(x, y, z), k1 = Math.hypot(x / rx, y / ry, z / rz); return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1; }
/* value noise for skin relief and vein masks */
function h3(x, y, z) { let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return n - Math.floor(n); }
export function vnoise(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf); const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), L(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v), L(L(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), L(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v), w); }
export const fbm3 = (x, y, z) => 0.6 * vnoise(x, y, z) + 0.28 * vnoise(x * 2.1, y * 2.1, z * 2.1) + 0.12 * vnoise(x * 4.3, y * 4.3, z * 4.3);

/* surface nets: f(x,y,z) -> signed distance (negative inside). Returns positions, normals, indices (triangles wound to face outward). */
export function surfaceNets(f, min, max, step) {
  const nx = Math.ceil((max[0] - min[0]) / step) + 1, ny = Math.ceil((max[1] - min[1]) / step) + 1, nz = Math.ceil((max[2] - min[2]) / step) + 1, S = nx * ny * nz, val = new Float32Array(S);
  const id = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[id(i, j, k)] = f(min[0] + i * step, min[1] + j * step, min[2] + k * step);
  const vidx = new Int32Array(S).fill(-1), pos = [], CORN = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const v = []; let mask = 0; for (let c = 0; c < 8; c++) { const q = val[id(i + CORN[c][0], j + CORN[c][1], k + CORN[c][2])]; v.push(q); if (q < 0) mask |= 1 << c; } if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0; for (const [a, b] of EDGES) { if ((v[a] < 0) === (v[b] < 0)) continue; const t = v[a] / (v[a] - v[b]); sx += CORN[a][0] + t * (CORN[b][0] - CORN[a][0]); sy += CORN[a][1] + t * (CORN[b][1] - CORN[a][1]); sz += CORN[a][2] + t * (CORN[b][2] - CORN[a][2]); cnt++; }
    vidx[id(i, j, k)] = pos.length / 3; pos.push(min[0] + (i + sx / cnt) * step, min[1] + (j + sy / cnt) * step, min[2] + (k + sz / cnt) * step);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = val[id(i, j, k)] < 0;
    if (v0 !== (val[id(i + 1, j, k)] < 0)) quad(vidx[id(i, j, k)], vidx[id(i, j - 1, k)], vidx[id(i, j - 1, k - 1)], vidx[id(i, j, k - 1)], !v0);
    if (v0 !== (val[id(i, j + 1, k)] < 0)) quad(vidx[id(i, j, k)], vidx[id(i, j, k - 1)], vidx[id(i - 1, j, k - 1)], vidx[id(i - 1, j, k)], !v0);
    if (v0 !== (val[id(i, j, k + 1)] < 0)) quad(vidx[id(i, j, k)], vidx[id(i - 1, j, k)], vidx[id(i - 1, j - 1, k)], vidx[id(i, j - 1, k)], !v0);
  }
  /* normals from the field gradient; flip any triangle that faces inward */
  const n = pos.length / 3, nor = new Float32Array(n * 3), e = step * 0.6;
  for (let q = 0; q < n; q++) { const x = pos[q * 3], y = pos[q * 3 + 1], z = pos[q * 3 + 2]; let gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e); const l = Math.hypot(gx, gy, gz) || 1; nor[q * 3] = gx / l; nor[q * 3 + 1] = gy / l; nor[q * 3 + 2] = gz / l; }
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3; const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2]; const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx; if (cx * (nor[a] + nor[b] + nor[c]) + cy * (nor[a + 1] + nor[b + 1] + nor[c + 1]) + cz * (nor[a + 2] + nor[b + 2] + nor[c + 2]) < 0) { const tmp = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = tmp; } }
  return { positions: new Float32Array(pos), normals: nor, indices: new Uint32Array(idx) };
}
/* bone weights: every vertex follows the nearest bone segments (smoothly blended at joints). bones: [{a:[x,y,z], b:[x,y,z]}] -> skinIndex / skinWeight (4 influences) */
export function skinWeights(positions, bones, sharp) {
  const n = positions.length / 3, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let v = 0; v < n; v++) {
    const px = positions[v * 3], py = positions[v * 3 + 1], pz = positions[v * 3 + 2], ds = [];
    for (let b = 0; b < bones.length; b++) { const B = bones[b], ax = B.a[0], ay = B.a[1], az = B.a[2], bx = B.b[0], by = B.b[1], bz = B.b[2]; const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az; const hh = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz + 1e-9))); const d = Math.hypot(pax - bax * hh, pay - bay * hh, paz - baz * hh) / (B.w || 1); ds.push([Math.pow(1 / (d * d + 0.0009), sharp || 3), b]); }
    ds.sort((p, q) => q[0] - p[0]); let tot = 0; for (let k = 0; k < 4; k++) tot += ds[k][0]; for (let k = 0; k < 4; k++) { si[v * 4 + k] = ds[k][1]; sw[v * 4 + k] = ds[k][0] / tot; }
  }
  return { skinIndex: si, skinWeight: sw };
}
