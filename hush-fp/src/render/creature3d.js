/* The creature: a hunched, long-limbed beast built from merged primitive parts on a joint tree, posed every frame from the AI state.
   Legs use two-bone IK driven by the distance-based gait phase (feet stay planted on the floor), arms swing against them, the spine hunches with speed,
   the jaw opens when it hunts, the head turns toward what it watches. A second copy with a flat additive material is the sonar silhouette (visible through walls). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sdCapsule, sdRoundCone, sdEllipsoid, smin, surfaceNets, skinWeights, fbm3 } from './sdf.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
const frac = v => v - Math.floor(v), ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const SPH = new THREE.SphereGeometry(1, 14, 10), CONE = new THREE.ConeGeometry(1, 1, 6), CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const mat4 = (x, y, z, rx, ry, rz, sx, sy, sz) => { const m = new THREE.Matrix4(); m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx, sy, sz)); return m; };
const ell = (rx, ry, rz, x, y, z, rot) => SPH.clone().applyMatrix4(mat4(x, y, z, rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, rx, ry, rz));
const cone = (r, h, x, y, z, rx, rz, ry) => CONE.clone().applyMatrix4(mat4(x, y, z, rx || 0, ry || 0, rz || 0, r, h, r));
const tube = (r1, r2, len, x, y, z, rx, rz) => { const g = new THREE.CylinderGeometry(r2, r1, len, 8, 1); g.translate(0, -len / 2, 0); g.applyMatrix4(mat4(x, y, z, rx || 0, 0, rz || 0, 1, 1, 1)); return g; };   // hangs down from its joint
const merge = list => { const m = mergeGeometries(list, false); list.forEach(g => g.dispose()); return m; };

export const KIND = {
  stalker: { scale: 1.0, skin: 0x050404, vein: 0x8a1414, eye: 0xff2a22, eyes: 2, ears: 0.5, spikes: 1.0, lean: 0, TL: 0.64, SL: 0.62, AL: 0.62, FL: 0.7, bw: 1.0, jaw: 1.0 },
  sentinel: { scale: 1.0, skin: 0x040506, vein: 0x1c6c8c, eye: 0xbfeaff, eyes: 4, ears: 0.2, spikes: 0.6, lean: -0.12, TL: 0.8, SL: 0.78, AL: 0.8, FL: 0.9, bw: 0.82, jaw: 0.8 },
  listener: { scale: 1.0, skin: 0x060505, vein: 0x7a2038, eye: 0x552020, eyes: 0, ears: 1.9, spikes: 0.8, lean: 0.1, TL: 0.6, SL: 0.58, AL: 0.68, FL: 0.74, bw: 1.05, jaw: 1.25 }
};
let glowTex = null;
function glow() { if (glowTex) return glowTex; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c); return glowTex; }

/* ---- the body: one smooth skin generated from a signed-distance model, cached per creature type ---- */
const GEO = {};
function bodyGeometry(type) {
  if (GEO[type]) return GEO[type]; const K = KIND[type] || KIND.stalker, H = K.TL + K.SL + 0.04, T = H + 0.05, bw = K.bw, N = [0, T + 1.0, 0.16], Jt = [0, N[1] - 0.06, N[2] + 0.12];
  const SH = [0.56 * bw, T + 0.86, 0.06], EL = [SH[0], SH[1] - K.AL, SH[2]], WR = [EL[0], EL[1] - K.FL, EL[2]], HP = [0.2, H, 0], KN = [0.2, H - K.TL, 0], AN = [0.2, H - K.TL - K.SL, 0];
  const f = (x, y, z) => {
    const ax = Math.abs(x);
    let d = sdRoundCone(x, y, z, 0, H - 0.1, -0.02, 0, T + 0.45, 0.03, 0.27 * bw, 0.3 * bw);                                              // belly
    d = smin(d, sdRoundCone(x, y, z, 0, T + 0.45, 0.03, 0, T + 0.9, 0.06, 0.3 * bw, 0.36 * bw), 0.14);                                      // chest
    d = smin(d, sdCapsule(ax, y, z, 0, T + 0.86, 0.05, 0.5 * bw, T + 0.86, 0.05, 0.2), 0.14);                                                 // shoulders
    d = smin(d, sdRoundCone(x, y, z, 0, T + 0.85, 0.08, N[0], N[1] + 0.05, N[2] + 0.04, 0.18, 0.12), 0.1);                                    // neck
    d = smin(d, sdEllipsoid(x, y, z, 0, N[1] + 0.07, N[2] + 0.12, 0.17, 0.19, 0.23), 0.07);                                                  // skull
    d = smin(d, sdRoundCone(x, y, z, 0, N[1] + 0.02, N[2] + 0.2, 0, N[1] - 0.02, N[2] + 0.54, 0.11, 0.07), 0.05);                           // snout
    d = smin(d, sdEllipsoid(ax, y, z, 0.1, N[1] + 0.16, N[2] + 0.24, 0.07, 0.04, 0.09), 0.04);                                                // brow ridges
    d = smin(d, sdRoundCone(ax, y, z, 0.12, N[1] + 0.2, N[2] + 0.05, 0.12 + 0.07 * K.ears, N[1] + 0.2 + 0.3 * K.ears, N[2] - 0.08, 0.055, 0.012), 0.04);   // ears
    const arm = smin(sdRoundCone(ax, y, z, SH[0], SH[1], SH[2], EL[0], EL[1], EL[2], 0.115, 0.085), sdRoundCone(ax, y, z, EL[0], EL[1], EL[2], WR[0], WR[1], WR[2], 0.085, 0.055), 0.07);
    d = smin(d, smin(arm, sdEllipsoid(ax, y, z, WR[0], WR[1] - 0.08, WR[2] + 0.02, 0.08, 0.1, 0.07), 0.05), 0.1);                              // arms + hands
    const leg = smin(sdRoundCone(ax, y, z, HP[0], HP[1], HP[2], KN[0], KN[1], KN[2], 0.17, 0.1), sdRoundCone(ax, y, z, KN[0], KN[1], KN[2], AN[0], AN[1], AN[2], 0.1, 0.055), 0.08);
    d = smin(d, smin(leg, sdRoundCone(ax, y, z, AN[0], AN[1] - 0.01, AN[2] - 0.03, AN[0], AN[1] - 0.04, AN[2] + 0.32, 0.065, 0.04), 0.06), 0.1); // legs + feet
    d = smin(d, sdEllipsoid(ax, y, z, 0.22, H - 0.1, -0.05, 0.2, 0.26, 0.22), 0.1);                                                           // haunches
    const jaw = sdRoundCone(x, y, z, 0, Jt[1] - 0.13, Jt[2] + 0.04, 0, Jt[1] - 0.2, Jt[2] + 0.4 * K.jaw, 0.08, 0.045);                        // lower jaw: hard-separated from the head
    d = Math.min(d, jaw);
    /* relief: skin wrinkles, ribs under the chest skin */
    d += 0.012 * (fbm3(x * 9, y * 9, z * 9) - 0.5); if (z > 0.1 && y > T + 0.2 && y < T + 0.85) d += 0.007 * Math.sin(y * 34) * Math.max(0, 1 - Math.abs(x) * 2);
    return d;
  };
  const step = 0.042, mesh = surfaceNets(f, [-1.05, -0.15, -0.6], [1.05, H + 1.7, 1.1], step);
  /* bones, in skeleton order: pelvis, torso, neck(head), jaw, shoulder L/R, elbow L/R, wrist L/R, hip L/R, knee L/R, ankle L/R */
  const seg = (a, b, w) => ({ a, b, w: w || 1 }), L = (v) => [-v[0], v[1], v[2]];
  const wr2 = [WR[0], WR[1] - 0.2, WR[2] + 0.04];
  const bones = [seg([0, H - 0.12, 0], [0, T, 0], 1.2), seg([0, T, 0], [0, T + 0.9, 0.05], 1.1), seg([0, T + 0.9, 0.08], [0, N[1] + 0.05, N[2] + 0.5], 0.8), seg([0, Jt[1] - 0.15, Jt[2]], [0, Jt[1] - 0.2, Jt[2] + 0.4], 0.5),
    seg(L(SH), L(EL), 1), seg(SH, EL, 1), seg(L(EL), L(WR), 1), seg(EL, WR, 1), seg(L(WR), L(wr2), 0.8), seg(WR, wr2, 0.8), seg(L(HP), L(KN), 1), seg(HP, KN, 1), seg(L(KN), L(AN), 1), seg(KN, AN, 1), seg(L(AN), [-AN[0], AN[1] - 0.04, AN[2] + 0.3], 0.8), seg(AN, [AN[0], AN[1] - 0.04, AN[2] + 0.3], 0.8)];
  const sk = skinWeights(mesh.positions, bones, 3.2), n = mesh.positions.length / 3, vein = new Float32Array(n), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const x = mesh.positions[i * 3], y = mesh.positions[i * 3 + 1], z = mesh.positions[i * 3 + 2]; const nz = fbm3(x * 5.5, y * 5.5, z * 5.5), vn = Math.abs(nz - 0.5); vein[i] = Math.max(0, 1 - vn / 0.011); vein[i] *= vein[i]; const m = 0.55 + 0.9 * fbm3(x * 11 + 3, y * 11, z * 11); col[i * 3] = m * (1 + (z > 0 && y < T ? 0.3 : 0)); col[i * 3 + 1] = m * 0.9; col[i * 3 + 2] = m * 0.9; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('vein', new THREE.BufferAttribute(vein, 1));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(sk.skinIndex, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sk.skinWeight, 4)); g.setIndex(new THREE.BufferAttribute(mesh.indices, 1)); g.userData = { H, T, N, Jt, SH, EL, WR, HP, KN, AN };
  return (GEO[type] = g);
}

/* build one copy. mats: { skin, bone, eye } materials; ghost copies pass the same flat material for everything */
export function buildCreature(type, mats, withEffects) {
  const K = KIND[type] || KIND.stalker, root = new THREE.Group(), J = {}, M = mats, geo = bodyGeometry(type), D = geo.userData; const bone = (parent, x, y, z) => { const b = new THREE.Bone(); b.position.set(x, y, z); parent.add(b); return b; };
  const rigid = (geoms, m, parent) => { const mesh = new THREE.Mesh(mergeGeometries(geoms), m); mesh.castShadow = false; parent.add(mesh); geoms.forEach(g => g.dispose()); return mesh; };
  J.pelvis = bone(root, 0, D.H, 0); J.torso = bone(J.pelvis, 0, 0.05, 0); J.neck = bone(J.torso, 0, 1.0, 0.16); J.jaw = bone(J.neck, 0, -0.06, 0.12);
  J.arm = []; J.leg = []; const sh = [], el = [], wr = [], hp = [], kn = [], an = [];
  for (let s = 0; s < 2; s++) { const sg = s ? 1 : -1, a = {}; a.sh = bone(J.torso, sg * 0.56 * K.bw, 0.86, 0.06); a.el = bone(a.sh, 0, -K.AL, 0); a.wr = bone(a.el, 0, -K.FL, 0); a.side = sg; J.arm.push(a); sh.push(a.sh); el.push(a.el); wr.push(a.wr); }
  for (let s = 0; s < 2; s++) { const sg = s ? 1 : -1, l = { TL: K.TL, SL: K.SL, side: sg }; l.hp = bone(J.pelvis, sg * 0.2, 0, 0); l.kn = bone(l.hp, 0, -K.TL, 0); l.an = bone(l.kn, 0, -K.SL, 0); J.leg.push(l); hp.push(l.hp); kn.push(l.kn); an.push(l.an); }
  const bones = [J.pelvis, J.torso, J.neck, J.jaw, sh[0], sh[1], el[0], el[1], wr[0], wr[1], hp[0], hp[1], kn[0], kn[1], an[0], an[1]];
  /* the skeleton wants hierarchy order; torso/neck/etc. are already parented, so just bind */
  const skin = new THREE.SkinnedMesh(geo, M.skin); skin.frustumCulled = false; skin.castShadow = withEffects !== false; skin.receiveShadow = true; root.add(skin); root.add(J.pelvis); root.updateMatrixWorld(true);
  const skel = new THREE.Skeleton(bones); skin.bind(skel);
  /* rigid details: spikes along the spine, teeth, claws, eyes */
  const cone = (r, h, x, y, z, rx, rz) => { const g = new THREE.ConeGeometry(r, h, 6); g.translate(0, h / 2, 0); g.rotateX(rx || 0); g.rotateZ(rz || 0); g.translate(x, y, z); return g; };
  const nS = Math.round(18 * K.spikes), sp = []; for (let i = 0; i < nS; i++) { const u = i / Math.max(1, nS - 1), len = (0.26 + 0.46 * Math.sin(u * Math.PI)) * K.spikes + 0.08; sp.push(cone(0.05, len, (i % 2 ? 0.07 : -0.07), 0.08 + u * 0.95, -0.28 * K.bw - u * 0.04, -2.15 + u * 0.4, 0)); }
  if (sp.length) rigid(sp, M.bone, J.torso);
  const ut = [], lt = []; for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { const z = 0.22 + i * 0.065; ut.push(cone(0.011, 0.075 - i * 0.004, sx * (0.06 - i * 0.004), 0.0, z, Math.PI, 0)); lt.push(cone(0.01, 0.065, sx * (0.045 - i * 0.003), -0.05, 0.05 + i * 0.06 * K.jaw, 0, 0)); }
  rigid(ut, M.bone, J.neck); rigid(lt, M.bone, J.jaw);
  { const mane = []; for (let i = 0; i < 9; i++) { const u = i / 8; mane.push(cone(0.04 - 0.012 * u, (0.34 - 0.12 * u) * K.spikes + 0.05, (i % 2 ? 0.05 : -0.05) * (1 + u), 0.12 + 0.06 * Math.sin(u * 3), -0.1 - u * 0.17, -2.0 - u * 0.5, (i % 3 - 1) * 0.15)); } rigid(mane, M.bone, J.neck); }
  for (let s = 0; s < 2; s++) { const cl = []; for (let i = 0; i < 4; i++) cl.push(cone(0.017, 0.46, (i - 1.5) * 0.045, -0.14, 0.05 + (i === 0 || i === 3 ? -0.01 : 0), 2.9, 0)); rigid(cl, M.bone, J.arm[s].wr); const ft = []; for (let i = 0; i < 3; i++) ft.push(cone(0.016, 0.24, (i - 1) * 0.045, -0.05, 0.3, 1.9, 0)); rigid(ft, M.bone, J.leg[s].an); }
  J.eyes = []; const ep = K.eyes === 4 ? [[0.1, 0.1, 0.34], [-0.1, 0.1, 0.34], [0.14, 0.18, 0.27], [-0.14, 0.18, 0.27]] : K.eyes === 2 ? [[0.085, 0.1, 0.36], [-0.085, 0.1, 0.36]] : [];
  for (const p of ep) { const e = new THREE.Mesh(SPH, M.eye); e.scale.setScalar(0.03); e.position.set(p[0], p[1], p[2]); J.neck.add(e); J.eyes.push(e); if (withEffects !== false) { const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: K.eye, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 })); spr.scale.setScalar(0.45); spr.position.copy(e.position); J.neck.add(spr); (J.glows = J.glows || []).push(spr); } }
  J.type = type; J.K = K; J.state = { mv: 0, run: 0, jaw: 0, headYaw: 0, headPitch: 0, lean: 0.4, seed: Math.random() * 10 };
  root.scale.setScalar(K.scale); root.userData.J = J; return root;
}

function legIK(L, tz, ty) {                         // target (z forward, y up) relative to the hip joint; returns joint angles
  const d0 = Math.hypot(tz, ty), d = clamp(d0, 0.12, L.TL + L.SL - 0.01), psi = Math.atan2(tz, -ty);
  const beta = Math.acos(clamp((L.TL * L.TL + d * d - L.SL * L.SL) / (2 * L.TL * d), -1, 1)), phi1 = psi + beta;
  const kz = L.TL * Math.sin(phi1), ky = -L.TL * Math.cos(phi1), phi2 = Math.atan2(tz * (d / d0 || 1) - kz, -(ty * (d / d0 || 1) - ky));
  return { phi1, phi2 };
}

/* pose a built creature. c: logic creature; t: time; dt; lookYaw: world-relative head turn target (radians relative to body) */
export function poseCreature(root, c, t, dt, look) {
  const J = root.userData.J, S = J.state, K = J.K; if (!J) return; const hunting = c.state === 'hunt', moving = c.moving && c.speed > 0.05;
  S.mv += ((moving ? 1 : 0) - S.mv) * Math.min(1, dt * 7); S.run += ((hunting && moving ? 1 : 0) - S.run) * Math.min(1, dt * 5); const w = S.mv, run = S.run;
  const lunge = c.lunge || 0; const roar = Math.max(lunge * 0.45, c.roar > 0 ? ease(Math.min(1, c.roar * 2)) * (c.roar > 0.3 ? 1 : c.roar / 0.3) : 0);
  const phase = c.phase, hipBase = 1.18 - 0.2 * run - 0.08 * (c.state === 'search' || c.state === 'check' ? 1 : 0), stepL = lerp(0.8, 1.35, run) * w, lift = lerp(0.13, 0.3, run) * w, st = lerp(0.58, 0.44, run);
  const bob = (0.035 + 0.04 * run) * w * (0.5 + 0.5 * Math.cos(4 * Math.PI * phase)), breath = Math.sin(t * 1.6 + S.seed) * 0.012 * (1 - w);
  J.pelvis.position.y = hipBase - bob + breath;
  /* legs */
  const ankle = 0.1;
  for (let k = 0; k < 2; k++) {
    const L = J.leg[k], q = frac(phase + 0.5 * k), idleZ = k ? -0.12 : 0.1; let z, y, pitch;
    if (q < st) { const u = q / st; z = stepL * (0.5 - u); y = 0; pitch = lerp(0.25, 0, ease(u * 3)) - 0.7 * ease((u - 0.75) * 4); }
    else { const s = (q - st) / (1 - st); z = stepL * (-0.5 + ease(s)); y = lift * Math.sin(Math.PI * s); pitch = lerp(-0.7, 0.25, s); }
    z = lerp(idleZ, z, w); const hipH = J.pelvis.position.y, ik = legIK(L, z - 0.08 * 0, -(hipH - ankle) + y);
    L.hp.rotation.x = -ik.phi1; L.kn.rotation.x = -(ik.phi2 - ik.phi1); L.an.rotation.x = -(lerp(0.1, pitch, w) - ik.phi2);
  }
  /* spine: hunch grows with speed; a roar throws the chest open */
  const leanT = lerp(0.42, 0.7 + 0.45 * run, w) + K.lean - 0.75 * roar + (c.state === 'search' ? 0.1 : 0); S.lean += (leanT - S.lean) * Math.min(1, dt * 6); J.torso.rotation.x = S.lean; J.torso.position.y = 0.05;
  J.torso.rotation.z = Math.sin(2 * Math.PI * phase) * 0.06 * w; J.torso.rotation.y = Math.sin(2 * Math.PI * phase + 0.6) * 0.1 * w;
  /* arms */
  for (let k = 0; k < 2; k++) {
    const A = J.arm[k], sw = Math.sin(2 * Math.PI * phase + (k ? 0 : Math.PI)) * (0.45 + 0.55 * run) * w;
    let sh = lerp(0.25, 0.95, w * 0.5 + run * 0.4) + sw * 0.8 - S.lean * 0.35, el = lerp(0.25, 0.7, w) + 0.35 * Math.max(0, sw);
    if (roar) { sh = lerp(sh, -1.1, roar); el = lerp(el, 0.4, roar); A.sh.rotation.z = A.side * 0.6 * roar; } else A.sh.rotation.z = A.side * 0.12;
    if (c.state === 'check') { sh = 1.0; el = 0.5; }
    A.sh.rotation.x = -sh; A.el.rotation.x = -el; A.wr.rotation.x = -0.25 + 0.25 * sw;
  }
  /* head: looks at what it is watching, scans when it searches, jaw drops when it hunts */
  let hy = 0, hp = 0.1 + 0.2 * (hunting ? 1 : 0);
  if (look !== undefined) hy = clamp(look, -1.0, 1.0); else if (c.state === 'search' || c.state === 'roam') hy = Math.sin(t * 0.8 + S.seed) * 0.5; else if (c.state === 'investigate') hp = 0.4;
  S.headYaw += (hy - S.headYaw) * Math.min(1, dt * 6); S.headPitch += (hp - roar * 0.9 - S.headPitch) * Math.min(1, dt * 5);
  J.neck.rotation.y = S.headYaw; J.neck.rotation.x = S.headPitch - S.lean * 0.55;
  const jawT = roar ? 1.0 : hunting ? 0.55 + 0.25 * Math.sin(t * 9) : c.state === 'suspicious' ? 0.2 : 0.06 + 0.04 * Math.sin(t * 1.3 + S.seed); S.jaw += (jawT - S.jaw) * Math.min(1, dt * 8); J.jaw.rotation.x = S.jaw * 0.65;
  /* eyes pulse */
  const pul = 0.75 + 0.25 * Math.sin(t * 5 + S.seed); if (J.glows) J.glows.forEach(g => { g.material.opacity = (hunting ? 1 : 0.7) * pul; g.scale.setScalar(hunting ? 0.62 : 0.4); });
}
export function creatureMaterials(type) {
  const K = KIND[type] || KIND.stalker;
  const skin = new THREE.MeshPhysicalMaterial({ color: K.skin, vertexColors: true, roughness: 0.78, metalness: 0.0, specularIntensity: 0.05, clearcoat: 0.0, emissive: new THREE.Color(K.vein), emissiveIntensity: 1.0 });
  skin.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float vein; varying float vVein;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvVein = vein;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vVein;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vVein * 1.6;');
  };
  skin.customProgramCacheKey = () => 'creatureskin';
  return { skin, bone: new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 0.6, emissive: new THREE.Color(K.vein), emissiveIntensity: 0.12 }), eye: new THREE.MeshBasicMaterial({ color: K.eye }) };
}
export function ghostMaterial() { return new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }); }
