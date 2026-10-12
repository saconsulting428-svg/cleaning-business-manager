/* Procedural 3D character builder + IK rig.
   Local space: origin = ground under the fighter, +X = forward, +Y = up, +Z = fighter's right. */
import * as THREE from 'three';
import { buildRealHead } from './face.js';

const V3 = THREE.Vector3, D2R = Math.PI / 180;
const UP = new V3(0, 1, 0);

/* ---------- textures ---------- */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function toTex(c, srgb = true, rep = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t;
}
const texCache = {};
function skinMaps(hex, torso) {
  const key = 'skin' + hex + torso; if (texCache[key]) return texCache[key];
  const rn = mulberry(hex.length * 77 + hex.charCodeAt(2) * 13), W = 512, H = 512;
  const a = cv(W, H), g = a.getContext('2d'), b = cv(W, H), gb = b.getContext('2d');
  g.fillStyle = hex; g.fillRect(0, 0, W, H); gb.fillStyle = '#808080'; gb.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) { // soft blood-flow blotches
    const x = rn() * W, y = rn() * H, r = 30 + rn() * 70, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(190,70,60,.07)'); gr.addColorStop(1, 'transparent'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 9000; i++) { // pores
    const x = rn() * W, y = rn() * H, v = rn(); g.fillStyle = v < .5 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)'; g.fillRect(x, y, 1.5, 1.5);
    gb.fillStyle = 'rgba(0,0,0,' + (.1 + rn() * .15) + ')'; gb.fillRect(x, y, 1.6, 1.6);
  }
  if (torso) { // muscle definition: u=.5 is the front centre
    const line = (fn, w1) => { g.strokeStyle = 'rgba(60,20,15,.38)'; g.lineWidth = w1; g.lineCap = 'round'; g.beginPath(); fn(g); g.stroke(); gb.strokeStyle = 'rgba(0,0,0,.55)'; gb.lineWidth = w1 + 1; gb.beginPath(); fn(gb); gb.stroke(); };
    const cx = W / 2;
    line(c => { c.moveTo(cx, H * .12); c.lineTo(cx, H * .86); }, 3);                                  // linea alba
    for (const s of [-1, 1]) {
      line(c => { c.moveTo(cx + s * 6, H * .245); c.quadraticCurveTo(cx + s * 50, H * .3, cx + s * 98, H * .22); }, 4);   // pec underline
      line(c => { c.moveTo(cx + s * 98, H * .17); c.quadraticCurveTo(cx + s * 70, H * .13, cx + s * 10, H * .13); }, 2.5); // clavicle
      for (let k = 0; k < 4; k++) { const y = H * (.40 + k * .105); line(c => { c.moveTo(cx + s * 4, y); c.quadraticCurveTo(cx + s * 24, y + 4, cx + s * 44, y - 2); }, 3.2); } // abs rows
      line(c => { c.moveTo(cx + s * 56, H * .34); c.quadraticCurveTo(cx + s * 70, H * .52, cx + s * 52, H * .78); }, 3);   // obliques
      for (let k = 0; k < 3; k++) line(c => { c.moveTo(cx + s * (86 + k * 4), H * (.28 + k * .045)); c.lineTo(cx + s * (112 + k * 4), H * (.30 + k * .045)); }, 2); // serratus
    }
  }
  const o = { map: toTex(a), bump: toTex(b, false) }; return texCache[key] = o;
}
function fabricBump(kind) {
  const key = 'fab' + kind; if (texCache[key]) return texCache[key];
  const rn = mulberry(kind.length * 31 + 7), W = 256, c = cv(W, W), g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, W, W);
  if (kind === 'leather') {
    for (let i = 0; i < 900; i++) { const x = rn() * W, y = rn() * W, l = 6 + rn() * 26, a = rn() * 3; g.strokeStyle = rn() < .5 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.16)'; g.lineWidth = 1 + rn() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  } else { // woven cloth
    for (let y = 0; y < W; y += 3) { g.fillStyle = (y / 3) % 2 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.12)'; g.fillRect(0, y, W, 1.5); }
    for (let x = 0; x < W; x += 3) { g.fillStyle = (x / 3) % 2 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.1)'; g.fillRect(x, 0, 1.5, W); }
  }
  return texCache[key] = toTex(c, false, [3, 3]);
}
function dragonTex(base, accent) { // embroidered dragon motif for pants
  const key = 'drg' + base + accent; if (texCache[key]) return texCache[key];
  const c = cv(256, 512), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = accent; g.lineWidth = 7; g.lineCap = 'round'; g.shadowColor = accent; g.shadowBlur = 6;
  g.beginPath(); g.moveTo(40, 30); for (let y = 30; y < 480; y += 40) g.bezierCurveTo(200, y + 10, 30, y + 25, 190, y + 40); g.stroke();
  g.lineWidth = 3; g.beginPath(); for (let y = 50; y < 470; y += 40) { g.moveTo(110, y); g.lineTo(150, y - 14); g.moveTo(110, y); g.lineTo(158, y + 8); } g.stroke();
  return texCache[key] = toTex(c);
}

/* ---------- materials ---------- */
function skinMat(hex, torso) {
  const m = skinMaps(hex, torso);
  return new THREE.MeshPhysicalMaterial({ map: m.map, bumpMap: m.bump, bumpScale: torso ? 1.4 : .8, roughness: .56, metalness: 0, sheen: .25, sheenRoughness: .5, sheenColor: new THREE.Color(hex).multiplyScalar(.9), clearcoat: .04, clearcoatRoughness: .5 });
}
function clothMat(hex, kind = 'cloth', extra = {}) {
  const leather = kind === 'leather';
  return new THREE.MeshPhysicalMaterial(Object.assign({ color: hex, bumpMap: fabricBump(kind), bumpScale: leather ? 1.6 : .6, roughness: leather ? .42 : .82, metalness: 0, clearcoat: leather ? .5 : 0, clearcoatRoughness: .35, sheen: leather ? 0 : .6, sheenRoughness: .8, sheenColor: new THREE.Color(hex).multiplyScalar(1.6) }, extra));
}
const metalMat = (hex, r = .3) => new THREE.MeshStandardMaterial({ color: hex, metalness: .9, roughness: r });

/* ---------- geometry helpers ---------- */
function tubeGeo(r0, r1, bulge = .12, at = .35, seg = DET.seg, rs = DET.rs) { // unit-length tapered muscular tube along +Y
  const pts = [new THREE.Vector2(0.0001, 0)];
  for (let i = 0; i <= seg; i++) { const t = i / seg, r = (r0 + (r1 - r0) * t) * (1 + bulge * Math.exp(-((t - at) ** 2) / .06)); pts.push(new THREE.Vector2(r, t)); }
  pts.push(new THREE.Vector2(0.0001, 1));
  return new THREE.LatheGeometry(pts, rs);
}
function torsoGeo(L, bulk, wide, fem, m = 0) {
  const T = L.spine, w = wide * bulk, pts = [new THREE.Vector2(0.0001, 0)];
  const prof = fem ? [[0, .145], [.1, .14], [.3, .118], [.5, .13], [.68, .148], [.82, .152], [.92, .14], [.97, .09], [1, .05]]
                   : [[0, .15], [.1, .15], [.3, .13], [.5, .155], [.68, .178], [.82, .192], [.92, .17], [.97, .1], [1, .055]];
  const tp = (t) => 1 + m * (t > .6 && t < .97 ? .17 * Math.sin((t - .6) / .37 * Math.PI * .9 + .2) + .05 : t > .2 && t < .45 ? -.1 : 0); // V-taper: broad chest/lats, narrow waist
  for (const [t, r] of prof) pts.push(new THREE.Vector2(r * w * tp(t), t * T));
  pts.push(new THREE.Vector2(0.0001, T));
  const g = new THREE.LatheGeometry(pts, Math.round(DET.ss * 1.5)); g.rotateY(-Math.PI / 2); return g;
}
function sph(r, sx = 1, sy = 1, sz = 1, mat) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, DET.ss, DET.ss * .7), mat); m.scale.set(sx, sy, sz); return m; }
function shadow(m) { m.castShadow = true; m.receiveShadow = true; return m; }

/* ---------- level of detail ---------- */
let DET = { rs: 20, seg: 16, ss: 24, hs: 36 };
export function setLOD(l) { DET = l === 'hero' ? { rs: 32, seg: 24, ss: 48, hs: 64 } : { rs: 12, seg: 8, ss: 20, hs: 28 }; }
export const EXPR = { // brow = inward/down tilt, browY = raise, lid = squint/close (0-1), mouth = open (0-1), smile = smirk tilt, snarl = upper-lip lift
  neutral: { brow: .12, browY: 0, lid: .08, mouth: 0, smile: 0 }, angry: { brow: .75, browY: -.012, lid: .38, mouth: .12, smile: 0 },
  shouting: { brow: .6, browY: -.006, lid: .3, mouth: 1, smile: 0 }, focused: { brow: .38, browY: -.006, lid: .26, mouth: 0, smile: 0 },
  smirk: { brow: .05, browY: .004, lid: .16, mouth: 0, smile: 1 }, serious: { brow: .45, browY: -.004, lid: .16, mouth: 0, smile: 0 },
  pain: { brow: -.3, browY: .01, lid: 1, mouth: .65, smile: 0 }, ko: { brow: -.15, browY: 0, lid: 1, mouth: .3, smile: 0 }, effort: { brow: .55, browY: -.008, lid: .5, mouth: .45, smile: 0 }
};
function irisTex(color) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), col = new THREE.Color(color);
  g.fillStyle = '#' + col.clone().multiplyScalar(.35).getHexString(); g.fillRect(0, 0, 128, 128);
  let gr = g.createRadialGradient(64, 64, 6, 64, 64, 58); gr.addColorStop(0, '#' + col.clone().multiplyScalar(.5).getHexString()); gr.addColorStop(.35, '#' + col.clone().multiplyScalar(1.5).getHexString()); gr.addColorStop(.8, '#' + col.clone().multiplyScalar(.7).getHexString()); gr.addColorStop(1, '#050505');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,220,160,.25)'; g.lineWidth = 1.5; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.beginPath(); g.moveTo(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20); g.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); g.stroke(); }
  g.fillStyle = '#050505'; g.beginPath(); g.arc(64, 64, 20, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(48, 46, 8, 0, TAU); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TAU = Math.PI * 2;
function buildHead(spec, R, mats) {
  const g = new THREE.Group(), face = spec.face || {}, hs = spec.hair.style;
  const geo = new THREE.SphereGeometry(R, DET.hs, DET.hs * .75), p = geo.attributes.position, v = new V3(), nrm = new V3();
  // anatomical feature blobs on the face (head-local, units of R, front = +x): [cx,cy,cz, sx,sy,sz, amp]
  const FEAT = [[.86, .3, 0, .3, .1, .55, .062], [.9, .08, .37, .22, .15, .17, -.05], [.98, -.02, 0, .25, .34, .075, .075], [1.06, -.3, 0, .15, .1, .11, .1], [1.0, -.33, .15, .1, .07, .07, .035],
    [.8, -.1, .6, .25, .2, .2, .05], [.82, -.4, .55, .25, .22, .2, -.05], [.97, -.55, 0, .2, .09, .22, .03], [.99, -.575, 0, .2, .014, .2, -.022], [.92, -.86, 0, .25, .18, .3, .075], [.2, -.7, .82, .3, .2, .15, .035],
    [.6, .18, .78, .3, .3, .2, -.03], [.9, -.25, .3, .15, .12, .1, .012]];
  for (let i = 0; i < p.count; i++) { // base skull: tapered jaw, forward chin, slightly flatter back
    v.fromBufferAttribute(p, i); const y = v.y / R;
    if (y < 0) { const k = -y; v.x *= 1 - .05 * k; v.z *= 1 - (.16 + (face.jaw || 0) * .12) * k * k * 1.4 - .06 * k; if (v.x > 0) v.x += .06 * R * k * k; v.y *= 1 + .12 * k; }
    if (v.x < 0) v.x *= .96; v.y *= 1.09;
    nrm.copy(v).normalize(); const px = v.x / R, py = v.y / R, pz = Math.abs(v.z) / R; let d = 0;
    if (px > -.1) for (const [cx, cy, cz, sx, sy, sz, amp] of FEAT) { if (cz === 0) { const e = ((px - cx) / sx) ** 2 + ((py - cy) / sy) ** 2 + ((v.z / R) / sz) ** 2; d += amp * Math.exp(-e); } else { const e = ((px - cx) / sx) ** 2 + ((py - cy) / sy) ** 2 + ((pz - cz) / sz) ** 2; d += amp * Math.exp(-e); } }
    v.addScaledVector(nrm, d * R); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  g.add(shadow(new THREE.Mesh(geo, mats.skinFace)));
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  for (const s of [-1, 1]) add(sph(R * .17, .5, 1, .8, mats.skin), -R * .1, -R * .02, s * R * .98); // ears
  // eyes
  const irisT = irisTex(spec.eye || '#4a2c16'), eyes = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(R * .74, R * .07, s * R * .38);
    eg.add(new THREE.Mesh(new THREE.SphereGeometry(R * .165, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#e9e3d8', roughness: .12, clearcoat: 1, clearcoatRoughness: .05 })));
    const iris = new THREE.Mesh(new THREE.CircleGeometry(R * .1, 28), new THREE.MeshBasicMaterial({ map: irisT })); iris.position.x = R * .158; iris.rotation.y = Math.PI / 2; eg.add(iris);
    const lidU = shadow(new THREE.Mesh(new THREE.SphereGeometry(R * .185, 18, 10, 0, TAU, 0, Math.PI / 2), mats.skin)); lidU.rotation.z = -Math.PI / 2; eg.add(lidU); // upper lid (rotates down)
    const lidL = shadow(new THREE.Mesh(new THREE.SphereGeometry(R * .183, 18, 10, 0, TAU, Math.PI / 2, Math.PI / 2), mats.skin)); lidL.rotation.z = -Math.PI / 2; eg.add(lidL);
    g.add(eg);
    const eb = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(R * .042, R * .36, 4, 8), mats.hair)); eb.scale.set(1, 1, .8); g.add(eb);
    eyes.push({ eg, lidU, lidL, eb, s });
  }
  // mouth rig
  const mouth = new THREE.Group(); mouth.position.set(R * .93, -R * .54, 0); g.add(mouth);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(R * .2, 14, 10), new THREE.MeshStandardMaterial({ color: '#2a0508', roughness: .7 })); inner.scale.set(.3, .8, 1.1); inner.position.x = -R * .05; mouth.add(inner);
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(R * .05, R * .07, R * .34), new THREE.MeshStandardMaterial({ color: '#e8e2d4', roughness: .3 })); teeth.position.set(R * .02, R * .06, 0); mouth.add(teeth);
  const upper = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(R * .042, R * .3, 4, 8), mats.lip)); upper.rotation.x = Math.PI / 2; upper.position.set(R * .05, R * .1, 0); mouth.add(upper);
  const lower = new THREE.Group(); lower.position.set(0, 0, 0); mouth.add(lower);
  const lip = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(R * .05, R * .26, 4, 8), mats.lip)); lip.rotation.x = Math.PI / 2; lip.position.set(R * .05, -R * .02, 0); lower.add(lip);
  const chin = shadow(new THREE.Mesh(new THREE.SphereGeometry(R * .24, 16, 12), mats.skin)); chin.scale.set(.75, .6, .9); chin.position.set(R * .05, -R * .22, 0); lower.add(chin);
  // facial hair / scar
  if (spec.beard) {
    const bm = new THREE.MeshStandardMaterial({ color: spec.beard.color || spec.hair.color, roughness: .9, transparent: spec.beard.type === 'stubble', opacity: spec.beard.type === 'stubble' ? .45 : 1 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 32, 20, Math.PI * .5 - 1.0, 2.0, Math.PI * .55, Math.PI * .45), bm); b.scale.set(1.02, spec.beard.type === 'stubble' ? 1 : 1.35, 1.02); b.position.y = -R * .1; g.add(b);
    if (spec.beard.type !== 'stubble') add(new THREE.Mesh(new THREE.CapsuleGeometry(R * .04, R * .3, 4, 8), bm), R * .98, -R * .38, 0).rotation.x = Math.PI / 2;
  }
  if (face.scar) { const sc = new THREE.Mesh(new THREE.CapsuleGeometry(R * .012, R * .3, 3, 6), new THREE.MeshStandardMaterial({ color: '#a8564e', roughness: .6 })); sc.position.set(R * .93, R * .27, R * .42); sc.rotation.set(0, 0, .25); sc.rotation.x = .3; g.add(sc); }
  // hair
  const hm = mats.hair, hairParts = {};
  const cap = (sc = 1.05) => { const g1 = new THREE.Group(); const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(R * sc, DET.hs, DET.hs * .7, 0, TAU, 0, Math.PI * .34), hm)); m.scale.set(1.02, 1.12, 1.03); m.rotation.z = .12; g1.add(m);
    const back = shadow(new THREE.Mesh(new THREE.SphereGeometry(R * sc, DET.hs, DET.hs * .7, -Math.PI / 2, Math.PI, 0, Math.PI * .66), hm)); back.scale.set(1.02, 1.12, 1.03); g1.add(back); return g1; };
  if (hs === 'messy') {
    g.add(cap(1.045)); const sw = new THREE.Group(); g.add(sw); hairParts.sway = sw; let seed = 11; const rn = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const lock = (ang, el, len, w, droop = .55) => { // cone-shaped lock pointing outward then drooping
      const dir = new V3(-Math.cos(ang) * Math.cos(el), Math.sin(el) - droop, Math.sin(ang) * Math.cos(el)).normalize(), base = new V3(-Math.cos(ang) * Math.cos(el), Math.sin(el), Math.sin(ang) * Math.cos(el)).multiplyScalar(R * 1.0);
      const c = shadow(new THREE.Mesh(new THREE.ConeGeometry(R * w, R * len, 7, 1), hm)); c.position.copy(base).addScaledVector(dir, R * len * .4); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.clone().negate().multiplyScalar(-1)); sw.add(c); };
    for (let i = 0; i < 130; i++) { const ang = rn() * TAU, el = .15 + rn() * 1.3, front = Math.cos(ang) < -.05; if (front) continue; lock(ang, el, .5 + rn() * .5, .09 + rn() * .06, .7 + rn() * .6); }
    for (let i = 0; i < 12; i++) { const a = Math.PI + (i < 6 ? -1 : 1) * (.42 + (i % 6) * .17); lock(a, .95 + rn() * .25, .3 + rn() * .2, .07 + rn() * .03, .7 + rn() * .3); }       // fringe over forehead (front = -x in lock space)
    for (let i = 0; i < 16; i++) lock(.15 + rn() * .5 + (i % 2 ? 2.5 : 0), -.1 + rn() * .5, .9 + rn() * .6, .1, .8);                      // back/side locks to the neck
  } else if (hs === 'spiky') {
    g.add(cap(1.06)); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, tilt = .35 + (i % 3) * .12, c = shadow(new THREE.Mesh(new THREE.ConeGeometry(R * .2, R * (.7 + (i % 4) * .15), 8), hm)); const rr = R * .74; c.position.set(Math.cos(a) * rr * .8 - R * .12, R * (.85 + (i % 2) * .05), Math.sin(a) * rr); c.rotation.z = -Math.cos(a) * tilt - .4; c.rotation.x = Math.sin(a) * tilt; g.add(c); }
  } else if (hs === 'short' || hs === 'slick') { g.add(cap(1.045)); }
  else if (hs === 'long' || hs === 'sweep') {
    g.add(cap(1.06)); const strands = new THREE.Group(); strands.position.set(-R * .55, R * .5, 0);
    const mk = (z, len, w) => { const c = new THREE.CatmullRomCurve3([new V3(0, 0, z), new V3(-R * .5, -R * .5, z * 1.15), new V3(-R * .75, -R * 1.5, z * 1.1), new V3(-R * .7, -len, z * .8)]); strands.add(shadow(new THREE.Mesh(new THREE.TubeGeometry(c, 14, w, 8), hm))); };
    for (let k = -4; k <= 4; k++) mk(k * R * .17, R * (2.4 + Math.abs(k) * -.12), R * .13); g.add(strands); hairParts.sway = strands;
  } else if (hs === 'ponytail') {
    g.add(cap(1.06)); const pt = new THREE.Group(); pt.position.set(-R * .85, R * .55, 0); const c = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(-R * .55, R * .15, 0), new V3(-R * .8, -R * .8, 0), new V3(-R * .7, -R * 2.0, 0)]);
    pt.add(shadow(new THREE.Mesh(new THREE.TubeGeometry(c, 16, R * .2, 10), hm))); g.add(pt); hairParts.sway = pt;
  } else if (hs === 'mohawk') {
    for (let i = 0; i < 9; i++) { const c = shadow(new THREE.Mesh(new THREE.ConeGeometry(R * .15, R * (.6 + .2 * Math.sin(i / 8 * Math.PI)), 8), hm)); const a = -.2 + (i / 8) * 2.9; c.position.set(Math.cos(a) * R * .75 - R * .1, Math.sin(a) * R * .95 + R * .15, 0); c.rotation.z = -(Math.PI / 2 - a); g.add(c); }
  }
  const cur = Object.assign({}, EXPR.neutral), tgt = Object.assign({}, EXPR.neutral);
  const setExpr = (name, snap) => { Object.assign(tgt, EXPR[name] || EXPR.neutral); if (snap) Object.assign(cur, tgt); };
  const updExpr = (dt) => {
    const k = 1 - Math.exp(-dt * 16); for (const key in cur) cur[key] += (tgt[key] - cur[key]) * k;
    for (const E of eyes) {
      const l = Math.min(1, cur.lid); E.lidU.rotation.z = -Math.PI / 2 + 0; E.lidU.scale.set(1, .2 + l * .85, 1); E.lidU.visible = l > .05; E.lidL.scale.set(1, .2 + Math.max(0, l - .6) * 1.2, 1); E.lidL.visible = l > .7;
      E.lidU.rotation.set(0, 0, 0); E.lidL.rotation.set(0, 0, 0);
      E.eb.position.set(R * .94, R * .34 + cur.browY - cur.brow * R * .05, E.s * R * .38); E.eb.rotation.set(Math.PI / 2 + E.s * -cur.brow * .55 * -1, 0, -E.s * 0 + cur.brow * .35 * -0); E.eb.rotation.x = Math.PI / 2 + E.s * cur.brow * -.5; E.eb.rotation.z = 0;
    }
    const m = cur.mouth; lower.position.y = -m * R * .26; lower.rotation.z = m * .15; inner.scale.set(.3, .15 + m * 1.1, 1.1); inner.visible = m > .03; teeth.visible = m > .2; teeth.position.y = R * .06 - m * R * .02;
    upper.rotation.z = cur.smile * .22; upper.position.y = R * .1 + cur.smile * R * .02; lip.rotation.z = -cur.smile * .1;
  };
  return { g, eyes, hairParts, setExpr, updExpr };
}

/* ---------- the rig ---------- */
export class Rig {
  constructor(spec, opts = {}) {
    setLOD(opts.lod || 'game'); this.lod = opts.lod || 'game'; this.spec = spec; const sc = spec.height || 1, bulk = spec.bulk || 1, fem = spec.gender === 'f';
    this.sc = sc;
    this.L = { thigh: .47 * sc, shin: .46 * sc, ankle: .085 * sc, spine: .52 * sc, neck: .08 * sc, headR: .112 * sc, upper: .31 * sc, fore: .26 * sc, hand: .08 * sc, shW: (fem ? .185 : .215) * sc * (spec.shoulders || 1), hipW: .095 * sc };
    const L = this.L;
    this.root = new THREE.Group(); this.tilt = new THREE.Group(); this.root.add(this.tilt); this.body = new THREE.Group(); this.tilt.add(this.body);
    const mats = this.mats = {
      skin: skinMat(spec.skin, false), skinTorso: skinMat(spec.skin, true), skinFace: skinMat(spec.skin, false),
      lip: new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.skin).multiplyScalar(.7).lerp(new THREE.Color('#a04040'), .4), roughness: .5 }),
      hair: new THREE.MeshPhysicalMaterial({ color: spec.hair.color, roughness: .78, metalness: 0, sheen: .25, sheenColor: new THREE.Color(spec.hair.color).addScalar(.05), sheenRoughness: .6, envMapIntensity: .35 })
    };
    const top = spec.top || { type: 'bare' }, pants = spec.pants || { type: 'long', color: '#222' };
    const body = this.body, S = (m) => { body.add(m); return m; };
    // --- pelvis
    this.pelvis = S(shadow(new THREE.Mesh(new THREE.SphereGeometry(.15 * bulk, 24, 16), clothMat(pants.color, pants.fabric || 'cloth'))));
    this.pelvis.scale.set(1, .7, 1.2 * (fem ? 1.1 : 1));
    // --- torso (+ clothing)
    this.torso = new THREE.Group(); body.add(this.torso);
    const MU = spec.muscle || 0, tg = torsoGeo(L, bulk, 1, fem, MU);
    const torsoMesh = shadow(new THREE.Mesh(tg, mats.skinTorso)); torsoMesh.scale.set(1, 1, .62 + .1 * MU); this.torso.add(torsoMesh);
    const addPec = (s) => { const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(.085 * bulk, 20, 14), mats.skin)); m.scale.set(.8, .75, 1.1); m.position.set(.1, L.spine * .76, s * .085 * bulk * (fem ? .9 : 1.15)); this.torso.add(m); };
    if (top.type === 'bare' || top.type === 'vest') { addPec(-1); addPec(1); }
    this.cloth = {};
    if (top.type !== 'bare') {
      const tm = clothMat(top.color, top.fabric || 'cloth'), tcol = top.type === 'vest' ? 1.03 : 1.045;
      const jg = torsoGeo(L, bulk * tcol, 1, fem, MU); if (top.length) jg.translate(0, -top.length, 0);
      const jm = shadow(new THREE.Mesh(jg, tm)); jm.scale.set(1, 1, .66 + .1 * MU); jm.scale.y = top.type === 'vest' ? .97 : 1.02; this.torso.add(jm);
      if (top.type === 'vest') { // open front: skin shows through via an inset strip
        const strip = shadow(new THREE.Mesh(new THREE.BoxGeometry(.03, L.spine * .8, .1 * bulk), mats.skinTorso)); strip.position.set(.14 * bulk, L.spine * .5, 0); this.torso.add(strip);
      }
      if (top.collar) { const col = shadow(new THREE.Mesh(new THREE.TorusGeometry(.085 * bulk, .028, 10, 24, Math.PI * 1.5), tm)); col.rotation.set(Math.PI / 2, 0, Math.PI * .75); col.position.set(0, L.spine * .985, 0); col.scale.set(1, 1.1, 1); this.torso.add(col); }
      if (top.trim) { const tr = shadow(new THREE.Mesh(new THREE.BoxGeometry(.012, L.spine * .96, .008), new THREE.MeshStandardMaterial({ color: top.trim, roughness: .4, emissive: top.trim, emissiveIntensity: .15 }))); tr.position.set(.19 * bulk, L.spine * .5, 0); this.torso.add(tr); }
    }
    // belt
    if (spec.belt) { const belt = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.158 * bulk, .158 * bulk, .05, 28, 1, true), clothMat(spec.belt, 'cloth', { side: THREE.DoubleSide }))); belt.scale.z = .74; belt.position.y = .015; this.torso.add(belt);
      const bk = shadow(new THREE.Mesh(new THREE.BoxGeometry(.035, .045, .028), metalMat('#d9c46a', .25))); bk.position.set(.158 * bulk, .015, 0); this.torso.add(bk); }
    // shoulders (deltoids) + neck
    this.shMesh = [-1, 1].map(() => { const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(.07 * bulk * (spec.shoulderBulk || 1) * (1 + .28 * MU), 20, 14), (top.type === 'bare' || top.type === 'vest' || top.type === 'tank') ? mats.skin : clothMat(top.color, top.fabric || 'cloth'))); S(m); return m; });
    this.neck = S(shadow(new THREE.Mesh(tubeGeo(.052 * bulk * (1 + .22 * MU), .05 * bulk * (1 + .22 * MU), .0), mats.skin)));
    if (MU > 0) for (const s of [-1, 1]) { const tr = shadow(new THREE.Mesh(new THREE.SphereGeometry(.07 * bulk * (.8 + .3 * MU), 18, 12), mats.skin)); tr.scale.set(1.1, .6, 1); tr.position.set(-.01, L.spine * .985, s * .085 * bulk); tr.rotation.x = s * .5; this.torso.add(tr); } // trapezius
    // --- head
    const hb = (spec.face && spec.face.real) ? buildRealHead(spec, L.headR, DET) : buildHead(spec, L.headR, mats); this.head = hb.g; this.eyes = hb.eyes; this.hairParts = hb.hairParts; this.face = hb; body.add(this.head);
    // --- limbs
    const armSleeve = top.type === 'jacket' || top.type === 'coat' || top.type === 'hoodie' || top.type === 'gi', armMat = armSleeve ? clothMat(top.color, top.fabric || 'cloth') : mats.skin;
    const wrapC = spec.wraps ? clothMat(spec.wraps.color, 'cloth') : null;
    const mk = (r0, r1, bulge, at, mat) => shadow(new THREE.Mesh(tubeGeo(r0, r1, bulge, at), mat));
    const ua = .056 * bulk * (spec.arms || 1), fa = .043 * bulk * (spec.arms || 1);
    this.upperArm = [0, 1].map(() => S(mk(ua, ua * .82, .22 + .12 * MU, .3, armMat)));
    this.foreArm = [0, 1].map(() => S(mk(fa * 1.1, fa * .78, .18 + .12 * MU, .25, (spec.wraps && spec.wraps.forearm) ? wrapC : (top.type === 'jacket' || top.type === 'coat' || top.type === 'hoodie') ? armMat : mats.skin)));
    this.elbow = [0, 1].map(() => S(shadow(new THREE.Mesh(new THREE.SphereGeometry(fa * 1.05, 14, 10), armSleeve || (spec.wraps && spec.wraps.forearm) ? armMat : mats.skin))));
    const gloveMat = spec.gloves ? clothMat(spec.gloves.color, 'leather') : (spec.wraps && spec.wraps.hands) ? wrapC : mats.skin;
    this.fist = [0, 1].map(() => { const g = new THREE.Group(); const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(.052 * sc * (spec.gloves ? 1.12 : 1), 18, 14), gloveMat)); m.scale.set(1.0, .9, .82); g.add(m);
      for (let k = 0; k < 4; k++) { const kn = shadow(new THREE.Mesh(new THREE.SphereGeometry(.014 * sc, 8, 6), gloveMat)); kn.position.set(.04 * sc, .02 * sc - k * .0 , (k - 1.5) * .02 * sc); g.add(kn); }
      S(g); return g; });
    const tw = .08 * bulk * (spec.legs || 1), sw = .056 * bulk * (spec.legs || 1);
    const legFab = pants.fabric || 'cloth', pM = clothMat(pants.color, legFab, pants.dragon ? { map: dragonTex(pants.color, pants.dragon) } : {});
    const shortP = pants.type === 'shorts', wide = pants.type === 'gi' ? 1.18 : 1;
    this.thigh = [0, 1].map(() => S(mk(tw * wide, tw * .72 * wide, .1 + .1 * MU, .3, pM)));
    this.shin = [0, 1].map(() => S(mk(sw * 1.15 * wide, sw * .66 * wide, .2 + .12 * MU, .25, shortP ? mats.skin : pM)));
    this.knee = [0, 1].map(() => S(shadow(new THREE.Mesh(new THREE.SphereGeometry(sw * (MU ? .98 : 1.2) * wide, 14, 10), shortP ? mats.skin : pM))));
    this.hipJ = [0, 1].map(() => S(shadow(new THREE.Mesh(new THREE.SphereGeometry(tw * 1.05 * wide, 14, 10), pM))));
    // feet / shoes
    const shoe = spec.shoes || { type: 'bare' };
    this.foot = [0, 1].map(() => {
      const g = new THREE.Group();
      if (shoe.type === 'bare') {
        const f = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(.036 * sc, .13 * sc, 6, 12), mats.skin)); f.rotation.z = Math.PI / 2; f.position.set(.055 * sc, -.045 * sc, 0); f.scale.set(1, 1, 1.15); g.add(f);
        for (let k = 0; k < 5; k++) { const t = sph(.011 * sc, 1, .8, 1, mats.skin); t.position.set(.145 * sc, -.065 * sc, (k - 2) * .014 * sc); g.add(t); }
      } else {
        const sm = clothMat(shoe.color, 'leather'), f = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(.047 * sc, .17 * sc, 6, 12), sm)); f.rotation.z = Math.PI / 2; f.position.set(.07 * sc, -.045 * sc, 0); f.scale.set(1, .85, 1.1); g.add(f);
        const sole = shadow(new THREE.Mesh(new THREE.BoxGeometry(.3 * sc, .026 * sc, .1 * sc), new THREE.MeshStandardMaterial({ color: shoe.sole || '#111', roughness: .7 }))); sole.position.set(.075 * sc, -.083 * sc, 0); g.add(sole);
        if (shoe.type === 'boot') { const bt = shadow(new THREE.Mesh(tubeGeo(.052 * sc, .056 * sc, 0), sm)); bt.scale.y = .2 * sc; bt.position.y = -.0; g.add(bt); }
      }
      S(g); return g; });
    this.bootShin = null;
    // long coat tails
    this.coat = null;
    if (top.type === 'coat') {
      const cm = clothMat(top.color, top.fabric || 'leather', { side: THREE.DoubleSide });
      this.coat = [0, 1, 2].map((i) => { const m = shadow(new THREE.Mesh(new THREE.BoxGeometry(.016, 1, i === 2 ? .36 * bulk : .2 * bulk, 1, 10, 1), cm)); m.geometry.translate(0, -.5, 0); body.add(m); return m; });
      this.coatDir = [new V3(0, -1, 0), new V3(0, -1, 0), new V3(0, -1, 0)];
    }
    this.joints = {}; for (const k of ['hip', 'chest', 'neck', 'head', 'handL', 'handR', 'footL', 'footR', 'kneeL', 'kneeR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'ankleL', 'ankleR', 'shL', 'shR']) this.joints[k] = new V3();
    this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = [new V3(), new V3(), new V3(), new V3(), new V3(), new V3()]; this._d = new V3(); this._pn = new V3();
    this.sway = 0; this.lastHeadX = 0;
    this.custom = spec.custom ? spec.custom(this, { THREE, shadow, clothMat, metalMat, tubeGeo, mats, DET }) : null;
    this.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  setExpression(n, snap) { this.exprName = n; this.face.setExpr(n, snap); }

  /* two-bone IK: returns mid point (into out), clamps end */
  ik(a, t, l1, l2, pole, mid, end) {
    const d = this._d.copy(t).sub(a), len = d.length(), max = (l1 + l2) * .999, min = Math.abs(l1 - l2) * 1.01 + .001;
    const L = Math.min(max, Math.max(min, len)); d.multiplyScalar(1 / (len || 1)); end.copy(a).addScaledVector(d, L);
    const x = (L * L + l1 * l1 - l2 * l2) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    const pn = this._pn.copy(pole); pn.addScaledVector(d, -pn.dot(d)); if (pn.lengthSq() < 1e-6) pn.set(0, -1, 0); pn.normalize();
    mid.copy(a).addScaledVector(d, x).addScaledVector(pn, h);
  }
  seg(mesh, a, b) { mesh.position.copy(a); const d = this._v[4].copy(b).sub(a), l = d.length(); mesh.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / (l || 1))); mesh.scale.set(1, l, 1); }

  /* P: pose {hip:[x,y,z], pitch, twist, roll, hipTwist, headPitch, headYaw, hL, hR, fL, fR, fLp, fRp, fLy, fRy, lay, eye, mouth} (angles in degrees) */
  apply(P, dt = 1 / 60) {
    const L = this.L, J = this.joints, q = this._q, e = this._e, v = this._v;
    this.tilt.rotation.z = (P.lay || 0) * Math.PI / 2; this.tilt.position.y = (P.lay || 0) * .2 + (P.liftY || 0) * 0;
    const hip = J.hip.set(P.hip[0], P.hip[1], P.hip[2]);
    // pelvis & chest orientation
    const qp = new THREE.Quaternion().setFromEuler(e.set(P.hipRoll * D2R || 0, P.hipTwist * D2R, 0, 'YZX'));
    const qc = new THREE.Quaternion().setFromEuler(e.set((P.roll || 0) * D2R, P.twist * D2R, -P.pitch * D2R, 'YZX'));
    this.pelvis.position.copy(hip); this.pelvis.quaternion.copy(qp);
    this.torso.position.copy(hip); this.torso.quaternion.copy(qc);
    const up = v[0].set(0, 1, 0).applyQuaternion(qc);
    J.chest.copy(hip).addScaledVector(up, L.spine * .6);
    const nb = v[1].copy(hip).addScaledVector(up, L.spine);
    J.neck.copy(nb);
    // shoulders
    for (const s of [-1, 1]) {
      const sh = J[s < 0 ? 'shL' : 'shR'].set(0, L.spine * .93, s * L.shW).applyQuaternion(qc).add(hip);
      this.shMesh[s < 0 ? 0 : 1].position.copy(sh);
    }
    // head
    const qh = new THREE.Quaternion().setFromEuler(e.set(0, (P.headYaw || 0) * D2R, -(P.headPitch || 0) * D2R, 'YZX')).premultiply(qc);
    const hu = v[2].set(0, 1, 0).applyQuaternion(qh);
    J.head.copy(nb).addScaledVector(hu, L.neck + L.headR * .95); this.head.position.copy(J.head); this.head.quaternion.copy(qh);
    this.seg(this.neck, nb.clone().addScaledVector(up, -.03), J.head.clone().addScaledVector(hu, -L.headR * .5));
    // arms
    for (const i of [0, 1]) {
      const s = i ? 1 : -1, sh = i ? J.shR : J.shL, el = i ? J.elbowR : J.elbowL, hd = i ? J.handR : J.handL, t = i ? P.hR : P.hL;
      const tgt = v[3].set(t[0], t[1], t[2]);
      const pole = v[4].set(-.3, -1, s * .75).applyQuaternion(qc);
      this.ik(sh, tgt, L.upper, L.fore + L.hand * .6, pole, el, hd);
      const fd = v[3].copy(hd).sub(el).normalize(), wrist = new V3().copy(hd).addScaledVector(fd, -L.hand * .45);
      this.seg(this.upperArm[i], sh, el); this.seg(this.foreArm[i], el, wrist); this.elbow[i].position.copy(el);
      this.fist[i].position.copy(hd); this.fist[i].quaternion.setFromUnitVectors(new V3(1, 0, 0), fd);
    }
    // legs
    for (const i of [0, 1]) {
      const s = i ? 1 : -1, hj = i ? J.hipR : J.hipL, kn = i ? J.kneeR : J.kneeL, an = i ? J.ankleR : J.ankleL, ft = i ? J.footR : J.footL, t = i ? P.fR : P.fL;
      hj.set(0, 0, s * L.hipW).applyQuaternion(qp).add(hip);
      const tgt = v[3].set(t[0], t[1] + L.ankle, t[2]);
      const fy = ((i ? P.fRy : P.fLy) || 0) * D2R + (P.hipTwist || 0) * D2R;
      const pole = v[4].set(Math.cos(fy), .0, -Math.sin(fy) + s * .25);
      this.ik(hj, tgt, L.thigh, L.shin, pole, kn, an);
      this.seg(this.thigh[i], hj, kn); this.seg(this.shin[i], kn, an); this.knee[i].position.copy(kn); this.hipJ[i].position.copy(hj);
      const fp = ((i ? P.fRp : P.fLp) || 0) * D2R;
      this.foot[i].position.copy(an); this.foot[i].quaternion.setFromEuler(e.set(0, fy, fp, 'YZX'));
      ft.copy(an).add(v[3].set(.11 * this.sc, 0, 0).applyQuaternion(this.foot[i].quaternion));
    }
    this.face.updExpr(dt);
    // hair / coat secondary motion
    const vx = (J.head.x - this.lastHeadX) / Math.max(dt, 1e-3); this.lastHeadX = J.head.x; this.sway += (vx * .06 - this.sway) * .12;
    if (this.hairParts.sway) { this.hairParts.sway.rotation.z = clamp(this.sway * .6, -.8, .8); this.hairParts.sway.rotation.x = Math.sin(performance.now() * .003) * .03; }
    if (this.custom) this.custom.update(P, dt, { qc, qp, hip, up });
    if (this.coat) {
      const hs = [J.hipL, J.hipR], len = (this.spec.top.coatLen || .78) * this.sc;
      for (let i = 0; i < 3; i++) {
        const m = this.coat[i], cd = this.coatDir[i];
        const tgt = i < 2 ? v[i].copy(i ? J.kneeR : J.kneeL).sub(hs[i]).normalize().lerp(new V3(0, -1, 0), .5).normalize() : v[2].set(-.3 - clamp(this.sway * .3, -.4, .4), -1, 0).normalize();
        cd.lerp(tgt, .25).normalize();
        if (i < 2) m.position.set(hip.x + .1, hip.y + .08, hs[i].z + (i ? .02 : -.02)); else m.position.set(hip.x - .1, hip.y + .08, hip.z);
        m.quaternion.setFromUnitVectors(new V3(0, -1, 0), cd); m.scale.set(1, len * (i === 2 ? .95 : 1), 1);
      }
    }
  }
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
