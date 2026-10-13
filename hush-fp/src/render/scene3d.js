/* Builds the 3D facility from a World: merged wall/floor/ceiling geometry with procedural textures, merged static props, animated doors / items / generator / valve / exit,
   emergency light fixtures, and the sonar-pulse shader patch shared by every surface. Units: metres; one logic tile = TS metres. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildTextures, canvasTexture } from './textures.js';
import { T } from '../logic/gen.js';
import { rng32 } from '../logic/rng.js';

export const TS = 2, WH = 3.2;
export const PULSE = { uPulseO: { value: new THREE.Vector3(0, -99, 0) }, uPulseR: { value: 0 }, uPulseA: { value: 0 }, uPulseMax: { value: 14 }, uTime: { value: 0 } };
export const THEME = {
  concrete: { fog: 0x07090b, fogD: 0.062, lamp: 0xffd6a0, amb: 0x1d1f26, ambI: 0.55, accent: 0xffb060, water: 0x22333c },
  flood: { fog: 0x050e16, fogD: 0.07, lamp: 0xa6dcff, amb: 0x16222e, ambI: 0.6, accent: 0x6cc8ff, water: 0x142c3c },
  nest: { fog: 0x120406, fogD: 0.066, lamp: 0xff6a50, amb: 0x2a1014, ambI: 0.6, accent: 0xff4030, water: 0x2a0a0e }
};

/* every surface shows the sonar: a ring racing outward, a blue wire-grid and glow inside the ring that fades away */
export function patchPulse(mat) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, PULSE);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPW; uniform vec3 uPulseO; uniform float uPulseR, uPulseA, uPulseMax, uTime;')
      .replace('#include <dithering_fragment>', `
        float pd = distance(vPW, uPulseO);
        if (uPulseA > 0.001 && pd < uPulseMax) {
          float ring = smoothstep(uPulseR - 1.1, uPulseR, pd) * (1.0 - smoothstep(uPulseR, uPulseR + 0.18, pd));
          float inside = 1.0 - smoothstep(uPulseR - 0.2, uPulseR + 0.2, pd);
          vec3 g = abs(fract(vPW * 1.0 - 0.5) - 0.5) / max(fwidth(vPW), vec3(0.0001));
          float line = 1.0 - clamp(min(min(g.x, g.y), g.z), 0.0, 1.0);
          float fade = uPulseA * (1.0 - pd / uPulseMax);
          gl_FragColor.rgb += vec3(0.08, 0.62, 1.0) * (line * 0.85 + 0.16) * inside * fade + vec3(0.35, 0.85, 1.0) * ring * uPulseA * 1.6;
        }
        #include <dithering_fragment>`);
  };
  mat.customProgramCacheKey = () => 'pulse';
  return mat;
}

class GB {                                           // tiny geometry accumulator
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
  quad(a, b, c, d, nrm, uv, col) { const o = this.p.length / 3; for (const v of [a, b, c, d]) { this.p.push(v[0], v[1], v[2]); this.n.push(nrm[0], nrm[1], nrm[2]); } this.u.push(uv[0], uv[1], uv[2], uv[3], uv[4], uv[5], uv[6], uv[7]); for (let k = 0; k < 4; k++) this.c.push(col[k][0], col[k][1], col[k][2]); this.i.push(o, o + 1, o + 2, o, o + 2, o + 3); }
  build() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); return g; }
}
const box = (w, h, d, x, y, z, ry) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
const cyl = (r1, r2, h, x, y, z, seg) => { const g = new THREE.CylinderGeometry(r1, r2, h, seg || 10); g.translate(x, y, z); return g; };
const ell = (rx, ry, rz, x, y, z) => { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(rx, ry, rz); g.translate(x, y, z); return g; };

export function buildScene(world, Q) {
  const spec = world.spec, theme = ['concrete', 'flood', 'nest'][spec.ch], TH = THEME[theme], R = rng32(spec.seed * 31 + 7), W = world.W, H = world.H, cells = world.cells;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000); scene.fog = new THREE.FogExp2(TH.fog, TH.fogD * (spec.lightsOut ? 1.15 : 1));
  const tex = buildTextures(theme, Q.texSize), disposables = [];
  const lit = (o) => (Q.lowMats ? new THREE.MeshLambertMaterial(o) : new THREE.MeshStandardMaterial(o));
  const mk = (t, rep, o) => { const m = lit(Object.assign({ map: t.map, vertexColors: false }, o)); if (!Q.lowMats && t.normal) { m.normalMap = t.normal; m.normalScale = new THREE.Vector2(1.1, 1.1); } patchPulse(m); disposables.push(m); return m; };
  const wallMat = mk(tex.wall, 1, { vertexColors: true, roughness: theme === 'flood' ? 0.45 : 0.88, metalness: 0.02 });
  const floorMat = mk(tex.floor, 1, { vertexColors: true, roughness: theme === 'flood' ? 0.22 : theme === 'nest' ? 0.5 : 0.62, metalness: 0.05 });
  const ceilMat = mk(tex.ceil, 1, { vertexColors: true, roughness: 0.95 });
  const metalMat = mk(tex.metal, 1, { roughness: 0.5, metalness: 0.55 }), crateMat = mk(tex.crate, 1, { roughness: 0.85 });
  const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || cells[y * W + x] === T.WALL;
  const wall = new GB(), floor = new GB(), ceil = new GB();
  const shade = (k) => [[k * 0.5, k * 0.5, k * 0.5], [k * 0.5, k * 0.5, k * 0.5], [k, k, k], [k, k, k]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = cells[y * W + x];
    if (t === T.WALL) {
      const x0 = x * TS, z0 = y * TS, x1 = x0 + TS, z1 = z0 + TS, tint = 0.8 + R() * 0.3, top = tint * 0.95, bot = tint * 0.5;
      const col = [[bot, bot, bot], [bot, bot, bot], [top, top, top], [top, top, top]], vv = WH / TS;
      if (!solid(x, y + 1)) wall.quad([x0, 0, z1], [x1, 0, z1], [x1, WH, z1], [x0, WH, z1], [0, 0, 1], [0, 0, 1, 0, 1, vv, 0, vv], col);        // faces +z side (toward floor tile at y+1)
      if (!solid(x, y - 1)) wall.quad([x1, 0, z0], [x0, 0, z0], [x0, WH, z0], [x1, WH, z0], [0, 0, -1], [0, 0, 1, 0, 1, vv, 0, vv], col);
      if (!solid(x + 1, y)) wall.quad([x1, 0, z1], [x1, 0, z0], [x1, WH, z0], [x1, WH, z1], [1, 0, 0], [0, 0, 1, 0, 1, vv, 0, vv], col);
      if (!solid(x - 1, y)) wall.quad([x0, 0, z0], [x0, 0, z1], [x0, WH, z1], [x0, WH, z0], [-1, 0, 0], [0, 0, 1, 0, 1, vv, 0, vv], col);
    } else {
      const x0 = x * TS, z0 = y * TS, x1 = x0 + TS, z1 = z0 + TS, k = 0.78 + R() * 0.3;
      floor.quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [0, 1, 0], [0, 1, 1, 1, 1, 0, 0, 0], [[k, k, k], [k, k, k], [k, k, k], [k, k, k]]);
      ceil.quad([x0, WH, z0], [x1, WH, z0], [x1, WH, z1], [x0, WH, z1], [0, -1, 0], [0, 0, 1, 0, 1, 1, 0, 1], shade(0.85 + R() * 0.15).map(c => c.map(v => v * 0.8)));
    }
  }
  const addMesh = (g, m, cast, recv) => { const o = new THREE.Mesh(g.isBufferGeometry ? g : g.build(), m); o.castShadow = !!cast; o.receiveShadow = recv !== false; scene.add(o); return o; };
  addMesh(wall, wallMat, false, true); addMesh(floor, floorMat, false, true); addMesh(ceil, ceilMat, false, false);
  /* water and glass */
  const waterG = []; const glassG = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const t = cells[y * W + x]; if (t === T.WATER) { const g = new THREE.PlaneGeometry(TS, TS); g.rotateX(-Math.PI / 2); g.translate(x * TS + TS / 2, 0.07, y * TS + TS / 2); waterG.push(g); }
    if (t === T.GLASS) for (let s = 0; s < 9; s++) { const g = new THREE.BoxGeometry(0.1 + R() * 0.16, 0.012, 0.06 + R() * 0.1); g.rotateY(R() * 6.28); g.translate(x * TS + R() * TS, 0.02, y * TS + R() * TS); glassG.push(g); } }
  let waterMesh = null; if (waterG.length) { const wm = lit({ color: TH.water, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.78, normalMap: Q.lowMats ? null : tex.water.normal }); if (!Q.lowMats) { wm.normalScale = new THREE.Vector2(0.6, 0.6); tex.water.normal.repeat.set(1, 1); } patchPulse(wm); disposables.push(wm); waterMesh = new THREE.Mesh(mergeGeometries(waterG), wm); scene.add(waterMesh); }
  if (glassG.length) { const gm = lit({ color: 0xcfe6f2, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.7, emissive: 0x112233, emissiveIntensity: 0.3 }); patchPulse(gm); const gmesh = new THREE.Mesh(mergeGeometries(glassG), gm); scene.add(gmesh); }
  /* static props merged by material */
  const stat = { metal: [], crate: [], dark: [], flesh: [], emis: [] };
  const darkMat = (() => { const m = lit({ color: 0x15171a, roughness: 0.7, metalness: 0.3 }); patchPulse(m); return m; })();
  const fleshMat = (() => { const m = lit({ color: 0x3b1214, roughness: 0.55, emissive: 0x5a0a0c, emissiveIntensity: 0.5 }); patchPulse(m); return m; })();
  const podMat = (() => { const m = lit({ color: 0x4a1418, roughness: 0.35, emissive: 0xaa1818, emissiveIntensity: 0.9, transparent: false }); patchPulse(m); return m; })();
  const boneMat = (() => { const m = lit({ color: 0xb8ad98, roughness: 0.6 }); patchPulse(m); return m; })();
  const pods = [], bones = [];
  const P = (arr, g, x, z, ry) => { g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry || 0)); g.translate(x, 0, z); arr.push(g); };
  for (const o of world.objs) {
    if (o.type !== 'prop') continue; const cx = o.x * TS + TS / 2, cz = o.y * TS + TS / 2, r = Math.round(o.rot / (Math.PI / 2)) * (Math.PI / 2) + (R() - 0.5) * 0.2;
    switch (o.kind) {
      case 'crate': { const s = 1.5 + R() * 0.2; P(stat.crate, box(s, s, s, 0, s / 2, 0), cx, cz, r); if (R() < 0.5) P(stat.crate, box(s * 0.7, s * 0.7, s * 0.7, 0.1, s + s * 0.35, 0), cx, cz, r + 0.4); break; }
      case 'barrel': for (let i = 0; i < 3; i++) { const a = i * 2.1 + r; const g = cyl(0.36, 0.36, 1.0, 0, 0.5, 0, 12); const g2 = cyl(0.375, 0.375, 0.05, 0, 0.7, 0, 12), g3 = cyl(0.375, 0.375, 0.05, 0, 0.3, 0, 12); const gg = mergeGeometries([g, g2, g3]); gg.translate(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); P(stat.metal, gg, cx, cz, 0); } break;
      case 'shelf': { const w = 1.8, d = 0.55; const parts = [box(0.06, 2.1, 0.06, -w / 2, 1.05, -d / 2), box(0.06, 2.1, 0.06, w / 2, 1.05, -d / 2), box(0.06, 2.1, 0.06, -w / 2, 1.05, d / 2), box(0.06, 2.1, 0.06, w / 2, 1.05, d / 2)]; for (let i = 0; i < 4; i++) parts.push(box(w, 0.05, d, 0, 0.3 + i * 0.55, 0)); P(stat.metal, mergeGeometries(parts), cx, cz, r); for (let i = 0; i < 6; i++) P(stat.crate, box(0.3 + R() * 0.3, 0.3, 0.3, (R() - 0.5) * 1.4, 0.48 + Math.floor(R() * 4) * 0.55, (R() - 0.5) * 0.3), cx, cz, r); break; }
      case 'table': { const parts = [box(1.7, 0.07, 0.85, 0, 0.82, 0)]; for (const sx of [-0.78, 0.78]) for (const sz of [-0.36, 0.36]) parts.push(box(0.07, 0.8, 0.07, sx, 0.4, sz)); P(stat.metal, mergeGeometries(parts), cx, cz, r); if (R() < 0.6) P(stat.dark, box(0.4, 0.28, 0.3, (R() - 0.5), 0.99, 0), cx, cz, r); break; }
      case 'pipe': { const parts = [cyl(0.17, 0.17, WH, 0, WH / 2, 0), cyl(0.2, 0.2, 0.15, 0, 0.5, 0), cyl(0.2, 0.2, 0.15, 0, 2.2, 0), cyl(0.12, 0.12, 1.4, 0.45, 1.5, 0)]; P(stat.metal, mergeGeometries(parts), cx, cz, r); break; }
      case 'pod': { const g = ell(0.75, 1.05, 0.75, 0, 1.0, 0); P(pods, g, cx, cz, 0); P(stat.flesh, cyl(0.9, 1.1, 0.3, 0, 0.15, 0, 12), cx, cz, 0); break; }
      case 'bones': { for (let i = 0; i < 9; i++) { const g = cyl(0.04, 0.06, 0.6 + R() * 0.6, 0, 0.1 + R() * 0.2, 0, 6); g.rotateZ(R() * 3); g.rotateY(R() * 6); g.translate((R() - 0.5) * 1.4, 0, (R() - 0.5) * 1.4); P(bones, g, cx, cz, 0); } P(bones, ell(0.2, 0.17, 0.25, 0.1, 0.17, 0.2), cx, cz, 0); P(stat.flesh, cyl(0.95, 1.05, 0.12, 0, 0.06, 0, 12), cx, cz, 0); break; }
    }
  }
  const pushStat = (arr, mat, cast) => { if (arr.length) addMesh(mergeGeometries(arr), mat, cast, true); };
  pushStat(stat.crate, crateMat, true); pushStat(stat.metal, metalMat, true); pushStat(stat.dark, darkMat, true); pushStat(stat.flesh, fleshMat, false); pushStat(pods, podMat, false); pushStat(bones, boneMat, false);
  /* pipes and conduits along corridor walls: breaks up the flat walls */
  const duct = [], conduit = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { if (cells[y * W + x] === T.WALL) continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (solid(x + dx, y + dz) && R() < 0.2) {
    const cx = x * TS + TS / 2 + dx * (TS / 2 - 0.12), cz = y * TS + TS / 2 + dz * (TS / 2 - 0.12), h = R() < 0.5 ? 2.55 : 0.55 + R() * 0.2; const len = TS, g = cyl(0.07 + R() * 0.04, 0.07, len, 0, 0, 0, 8); g.rotateZ(Math.PI / 2); if (dz) { g.rotateY(0); } else { g.rotateY(Math.PI / 2); } g.translate(cx, h, cz); duct.push(g);
    if (R() < 0.4) conduit.push(box(dz ? 0.08 : 0.1, 0.3, dz ? 0.1 : 0.08, cx, h + 0.05, cz)); } }
  pushStat(duct, metalMat, false); pushStat(conduit, darkMat, false);

  /* ---------------- dynamic objects ---------------- */
  const dyn = { doors: [], items: [], gens: [], valves: [], lamps: [], notes: [] }; const group = new THREE.Group(); scene.add(group);
  const stripe = (c1, c2) => canvasTexture(64, 64, (x, w, h) => { x.fillStyle = c1; x.fillRect(0, 0, w, h); x.fillStyle = c2; for (let i = -h; i < w; i += 16) { x.beginPath(); x.moveTo(i, h); x.lineTo(i + 8, h); x.lineTo(i + 8 + h, 0); x.lineTo(i + h, 0); x.fill(); } });
  const lockCol = { key: 0xc9a14a, card: 0x3ca0ff, power: 0xffcc22, code: 0x66ff88, valve: 0xff5533, secret: 0x44aaff };
  const lockTex = {};
  for (const o of world.objs) {
    const cx = o.x * TS + TS / 2, cz = o.y * TS + TS / 2;
    if (o.type === 'door') {
      const g = new THREE.Group(), alongX = o.dir === 'x';           // corridor direction: the slab spans across it
      const slabM = metalMat.clone(); patchPulse(slabM); slabM.color = new THREE.Color(o.lock ? 0xb0b0b0 : 0x9a9a98); slabM.emissive = new THREE.Color(0x000000); slabM.emissiveIntensity = 1;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.14 : TS, 2.7, alongX ? TS : 0.14), slabM); slab.position.y = 1.35; slab.castShadow = true; g.add(slab);
      if (o.lock) { const bandM = new THREE.MeshBasicMaterial({ color: lockCol[o.lock] || 0xffffff }); const band = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.17 : TS * 0.8, 0.12, alongX ? TS * 0.8 : 0.17), bandM); band.position.y = 1.15; slab.add(band); band.position.set(0, -0.2, 0); }
      const lightM = new THREE.MeshBasicMaterial({ color: 0xff2020 }); const lamp = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.2 : 0.25, 0.12, alongX ? 0.25 : 0.2), lightM); lamp.position.set(0, 2.3, 0); slab.add(lamp); lamp.position.y = 0.95;
      g.position.set(cx, 0, cz); group.add(g);
      const frame = [box(alongX ? 0.3 : 0.25, WH, alongX ? 0.25 : 0.3, 0, WH / 2, 0)]; const fp = [];                    // frame posts + lintel
      const sx = alongX ? 0 : 1, sz = alongX ? 1 : 0; fp.push(box(alongX ? 0.3 : 0.25, 2.8, alongX ? 0.25 : 0.3, sx * (TS / 2 - 0.12), 1.4, sz * (TS / 2 - 0.12)), box(alongX ? 0.3 : 0.25, 2.8, alongX ? 0.25 : 0.3, -sx * (TS / 2 - 0.12), 1.4, -sz * (TS / 2 - 0.12)), box(alongX ? 0.32 : TS, WH - 2.7, alongX ? TS : 0.32, 0, 2.7 + (WH - 2.7) / 2, 0)); void frame;
      for (const q of fp) { q.translate(cx, 0, cz); } addMesh(mergeGeometries(fp), darkMat, true, true);
      let pad = null; if (o.lock === 'code') { const ptex = canvasTexture(64, 96, (x, w, h) => { x.fillStyle = '#0c1410'; x.fillRect(0, 0, w, h); x.fillStyle = '#3cff80'; x.font = 'bold 14px monospace'; x.fillText('----', 12, 18); x.fillStyle = '#1b3a28'; for (let i = 0; i < 12; i++) x.fillRect(8 + (i % 3) * 17, 30 + Math.floor(i / 3) * 15, 13, 11); }); pad = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.42), new THREE.MeshBasicMaterial({ map: ptex })); pad.position.set(cx + (alongX ? -0.25 : 0.0), 1.35, cz + (alongX ? 0.0 : -0.25)); pad.position.x = cx + (alongX ? 0 : (TS / 2 - 0.1)); pad.position.z = cz + (alongX ? (TS / 2 - 0.1) : 0); pad.rotation.y = alongX ? Math.PI : -Math.PI / 2; group.add(pad); }
      let wallSlab = null; if (o.hidden) { wallSlab = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.3 : TS, WH, alongX ? TS : 0.3), wallMat); wallSlab.position.set(cx, WH / 2, cz); group.add(wallSlab); g.visible = false; }
      dyn.doors.push({ o, g, slab, slabM, lightM, wallSlab, pad });
    } else if (o.type === 'locker') {
      const dx = Math.cos(o.face), dz = Math.sin(o.face), ltex = canvasTexture(64, 128, (x, w, h) => { x.fillStyle = '#26302c'; x.fillRect(0, 0, w, h); x.fillStyle = '#0b100e'; for (let i = 0; i < 9; i++) x.fillRect(12, 14 + i * 5, 40, 2); x.fillRect(12, 80, 40, 2); for (let i = 0; i < 6; i++) x.fillRect(12, 86 + i * 5, 40, 2); x.fillStyle = '#9aa'; x.fillRect(48, 64, 4, 12); });
      const lm = lit({ map: ltex, roughness: 0.55, metalness: 0.5 }); patchPulse(lm); const lk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.05, 0.7), [lm, lm, lm, lm, lm, lm]); lk.castShadow = true; lk.receiveShadow = true;
      const lg = new THREE.Group(); lg.add(lk); lk.position.y = 1.03; lg.position.set(cx - dx * (TS / 2 - 0.37), 0, cz - dz * (TS / 2 - 0.37)); lg.rotation.y = Math.PI / 2 - o.face; group.add(lg); dyn.valves.push({ o, g: lg, kind: 'locker', mat: lm });
    } else if (o.type === 'vent') {
      const dx = Math.cos(o.face), dz = Math.sin(o.face), gm = lit({ color: 0x0b0c0e, roughness: 0.6, metalness: 0.6 }); patchPulse(gm); const vg = new THREE.Group();
      vg.add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.05), gm)); for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.03, 0.07), metalMat); b.position.set(0, -0.3 + i * 0.12, 0.03); vg.add(b); }
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.88, 0.04), metalMat); fr.position.z = -0.02; vg.add(fr);
      vg.position.set(cx - dx * (TS / 2 - 0.03), 0.55, cz - dz * (TS / 2 - 0.03)); vg.rotation.y = Math.PI / 2 - o.face; group.add(vg); dyn.valves.push({ o, g: vg, kind: 'vent', mat: gm });
    } else if (o.type === 'generator') {
      const gm = lit({ color: 0x3a4036, roughness: 0.6, metalness: 0.5, map: tex.metal.map }); patchPulse(gm); const gg = new THREE.Group();
      gg.add(new THREE.Mesh(mergeGeometries([box(1.5, 0.9, 1.0, 0, 0.55, 0), cyl(0.38, 0.38, 1.3, 0.3, 1.3, 0, 14).rotateZ(Math.PI / 2 * 0)]), gm)); const tank = new THREE.Mesh(cyl(0.34, 0.34, 1.3, 0, 0, 0, 14), gm); tank.rotation.z = Math.PI / 2; tank.position.set(0, 1.35, 0); gg.add(tank);
      const il = new THREE.MeshBasicMaterial({ color: 0xff2200 }); const ind = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), il); ind.position.set(-0.45, 0.95, 0.52); gg.add(ind);
      const fan = new THREE.Mesh(cyl(0.3, 0.3, 0.05, 0, 0, 0, 12), darkMat); fan.rotation.x = Math.PI / 2; fan.position.set(0.5, 0.55, 0.52); gg.add(fan);
      gg.position.set(cx, 0, cz); gg.rotation.y = R() < 0.5 ? 0 : Math.PI / 2; group.add(gg); dyn.gens.push({ o, g: gg, il, fan });
    } else if (o.type === 'valve') {
      const vg = new THREE.Group(); vg.add(new THREE.Mesh(mergeGeometries([cyl(0.12, 0.14, 1.1, 0, 0.55, 0, 10), box(0.5, 0.15, 0.5, 0, 0.08, 0)]), metalMat)); const wm = lit({ color: 0xaa2218, roughness: 0.4, metalness: 0.6 }); patchPulse(wm);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 20), wm); wheel.position.set(0, 1.18, 0); wheel.rotation.x = Math.PI / 2; vg.add(wheel); for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.03), wm); sp.position.y = 1.18; sp.rotation.y = i * Math.PI / 3; vg.add(sp); }
      vg.position.set(cx, 0, cz); group.add(vg); dyn.valves.push({ o, g: vg, kind: 'valve', wheel });
    } else if (o.type === 'exit') {
      const eg = new THREE.Group(), etex = canvasTexture(256, 128, (x, w, h) => { x.fillStyle = '#04140b'; x.fillRect(0, 0, w, h); x.fillStyle = '#3dff8a'; x.font = 'bold 64px sans-serif'; x.textAlign = 'center'; x.fillText('EXIT', w / 2, 82); x.strokeStyle = '#3dff8a'; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12); });
      eg.add(new THREE.Mesh(mergeGeometries([box(1.9, 2.7, 0.35, 0, 1.35, 0), box(0.2, 2.9, 0.5, -1.0, 1.45, 0), box(0.2, 2.9, 0.5, 1.0, 1.45, 0), box(2.2, 0.2, 0.5, 0, 2.95, 0)]), metalMat)); const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshBasicMaterial({ color: 0x0f3a24 })); door.position.set(0, 1.25, 0.19); eg.add(door); const door2 = door.clone(); door2.position.z = -0.19; door2.rotation.y = Math.PI; eg.add(door2);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.47), new THREE.MeshBasicMaterial({ map: etex })); sign.position.set(0, 2.5, 0.2); eg.add(sign); const s2 = sign.clone(); s2.position.z = -0.2; s2.rotation.y = Math.PI; eg.add(s2);
      /* the exit hums with green light so it is always findable */
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0x30ff80, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 })); sp.scale.set(3.5, 3.5, 1); sp.position.y = 1.5; eg.add(sp); dyn.exitGlow = sp;
      const near = world.exitDir || [0, 1]; void near; eg.position.set(cx, 0, cz);
      /* face the open side */
      const openDir = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([ax, az]) => !solid(o.x + ax, o.y + az) && !world.solid.has((o.y + az) * W + (o.x + ax))) || [0, 1]; eg.rotation.y = Math.atan2(openDir[0], openDir[1]); group.add(eg); dyn.exit = eg;
    } else if (o.type === 'item') {
      const ig = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: o.kind === 'key' ? 0xd8b24a : o.kind === 'card' ? 0x3ca0ff : o.kind === 'fuse' ? 0xffcc44 : 0x6a7078, roughness: 0.35, metalness: 0.8, emissive: o.kind === 'key' ? 0x6a4a10 : o.kind === 'card' ? 0x0a3a77 : o.kind === 'fuse' ? 0x774400 : 0x222a30, emissiveIntensity: 0.9 });
      patchPulse(m);
      if (o.kind === 'key') { ig.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 14), m)); const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), m); shaft.position.y = -0.2; ig.add(shaft); for (let i = 0; i < 2; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.04), m); t.position.set(0.06, -0.3 + i * 0.07, 0); ig.add(t); } }
      else if (o.kind === 'card') { ig.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.19, 0.012), m)); const st = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.014), new THREE.MeshBasicMaterial({ color: 0xffffff })); st.position.y = 0.03; ig.add(st); }
      else if (o.kind === 'fuse') { ig.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xffeebb, transparent: true, opacity: 0.7, emissive: 0xaa6600, emissiveIntensity: 0.8 }))); for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), m); cap.position.y = s * 0.11; ig.add(cap); } }
      else { ig.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.1), m)); const an = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 4), m); an.position.set(0.07, 0.25, 0); ig.add(an); const sp = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), new THREE.MeshBasicMaterial({ color: 0x223 })); sp.position.set(0, 0.03, 0.055); ig.add(sp); }
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: o.kind === 'key' ? 0xffd070 : o.kind === 'card' ? 0x50a8ff : o.kind === 'fuse' ? 0xffb030 : 0xaaccff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55 })); gl.scale.set(1.1, 1.1, 1); ig.add(gl);
      ig.position.set(cx, 0.9, cz); group.add(ig); dyn.items.push({ o, g: ig, m, gl });
    } else if (o.type === 'note') {
      const ntex = canvasTexture(128, 160, (x, w, h) => { x.fillStyle = '#d9d0b6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3a3226'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(12, 24 + i * 14); x.lineTo(14 + 60 + Math.random() * 50, 22 + i * 14 + Math.random() * 3); x.stroke(); } x.fillStyle = '#7a1c1c'; x.font = 'bold 20px monospace'; x.fillText('####', 40, 140); });
      const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: ntex, roughness: 0.9, emissive: 0x332a18, emissiveIntensity: 0.5 })); patchPulse(pg.material); pg.rotation.x = -Math.PI / 2; pg.rotation.z = R() * 6; pg.position.set(cx, 0.03, cz); group.add(pg);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffeeaa, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.35 })); gl.scale.set(1.2, 1.2, 1); gl.position.set(cx, 0.4, cz); group.add(gl); dyn.notes.push({ o, g: pg, gl });
    }
  }
  /* ---------------- light fixtures ---------------- */
  const lampMats = { ok: new THREE.MeshBasicMaterial({ color: TH.lamp }), dead: new THREE.MeshBasicMaterial({ color: 0x151515 }), fl: [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: TH.lamp })) };
  const lampGeo = new THREE.BoxGeometry(0.9, 0.08, 0.28), lampGeoH = [], fixtures = [];
  const housing = [];
  for (const l of world.lights) { const kind = spec.lightsOut ? (R() < 0.8 ? 'dead' : l.kind) : l.kind; const m = kind === 'ok' ? lampMats.ok : kind === 'dead' ? lampMats.dead : lampMats.fl[Math.floor(R() * 3)];
    const mesh = new THREE.Mesh(lampGeo, m); mesh.position.set(l.x * TS, WH - 0.06, l.y * TS); mesh.rotation.y = R() < 0.5 ? 0 : Math.PI / 2; scene.add(mesh); housing.push(box(1.0, 0.04, 0.34, l.x * TS, WH - 0.02, l.y * TS, mesh.rotation.y)); fixtures.push({ x: l.x * TS, z: l.y * TS, kind, mat: m, ph: l.ph }); }
  if (housing.length) addMesh(mergeGeometries(housing), darkMat, false, false);
  const sceneAmb = new THREE.HemisphereLight(TH.amb, 0x050507, TH.ambI * (spec.lightsOut ? 0.6 : 1) * 1.7); scene.add(sceneAmb);
  /* nest: an organic glow in every wall pocket and floor veins */
  return { scene, group, dyn, fixtures, lampMats, theme, TH, tex, waterMesh, disposables, wallMat, floorMat, amb: sceneAmb };
}
let _glow = null;
export function glowTex() { if (_glow) return _glow; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _glow = new THREE.CanvasTexture(c); return _glow; }
