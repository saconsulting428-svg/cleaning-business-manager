/* Realistic head builder: dense sculpted skull with anatomical features, painted PBR skin (albedo/normal/roughness/SSS-emissive),
   real eyes (sclera + iris + cornea), mouth cavity + teeth, jaw/eyelid/brow/mouth blendshapes (ARKit-style subset) and strand-card hair. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3, TAU = Math.PI * 2, ZS = .87;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (x, y, z, cx, cy, cz, sx, sy, sz) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2 + ((z - cz) / sz) ** 2));
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const mixHex = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

/* anatomical feature blobs [cx,cy,cz, sx,sy,sz, amp] (units of head radius; front = +x); cz=0 → centred, else mirrored (uses |z|) */
const FEAT = [[.88, .3, 0, .3, .1, .55, .055], [.9, .075, .385, .22, .13, .17, -.05], [.98, -.02, 0, .24, .34, .07, .08], [1.06, -.3, 0, .15, .1, .11, .11], [1.0, -.34, .15, .1, .07, .07, .04],
  [.8, -.1, .6, .25, .2, .2, .055], [.82, -.42, .55, .25, .22, .2, -.055], [.97, -.55, 0, .2, .09, .22, .035], [.93, -.86, 0, .25, .18, .3, .08], [.2, -.7, .82, .3, .2, .15, .04], [.6, .18, .78, .3, .3, .2, -.03], [.92, -.27, .3, .15, .12, .1, .014],
  [.95, -.7, 0, .15, .05, .3, -.018], [.98, -.4, 0, .1, .04, .12, -.014]];
const MORPHS = ['jawOpen', 'mouthSmile_L', 'mouthSmile_R', 'mouthStretch', 'mouthFrown', 'browDown_L', 'browDown_R', 'browInnerUp', 'browOuterUp_L', 'browOuterUp_R', 'eyeBlink_L', 'eyeBlink_R', 'eyeSquint_L', 'eyeSquint_R', 'mouthPress', 'noseSneer'];
const EXPRESSIONS = {
  neutral: { browDown_L: .05, browDown_R: .05 }, focused: { browDown_L: .45, browDown_R: .45, eyeSquint_L: .3, eyeSquint_R: .3 },
  angry: { browDown_L: .9, browDown_R: .9, eyeSquint_L: .4, eyeSquint_R: .4, mouthFrown: .35, noseSneer: .5, jawOpen: .08, mouthPress: .3 },
  shouting: { browDown_L: .7, browDown_R: .7, eyeSquint_L: .35, eyeSquint_R: .35, jawOpen: 1, mouthStretch: .7, noseSneer: .4 },
  smirk: { mouthSmile_L: .85, mouthSmile_R: .15, browOuterUp_R: .4, eyeSquint_L: .25, browDown_L: .2 },
  serious: { browDown_L: .55, browDown_R: .55, eyeSquint_L: .12, eyeSquint_R: .12, mouthPress: .35 },
  pain: { browInnerUp: .8, eyeBlink_L: .9, eyeBlink_R: .9, jawOpen: .5, mouthStretch: .5, noseSneer: .3 },
  ko: { eyeBlink_L: 1, eyeBlink_R: 1, jawOpen: .25 }, effort: { browDown_L: .7, browDown_R: .7, eyeSquint_L: .55, eyeSquint_R: .55, jawOpen: .35, noseSneer: .3 }
};

/* ---------------- geometry ---------------- */
function headGeometry(R, hero, face) {
  const Wd = hero ? 144 : 64, Hd = hero ? 108 : 48, sg = new THREE.SphereGeometry(1, Wd, Hd), p = sg.attributes.position, n0 = p.count, v = new V3(), nm = new V3();
  const P = []; // unit-R positions
  for (let i = 0; i < n0; i++) {
    v.fromBufferAttribute(p, i); const y = v.y;
    if (y < 0) { const k = -y; v.x *= 1 - .05 * k; v.z *= 1 - (.26 + (face.jaw || 0) * .2) * k * k * 1.5 - .08 * k; if (v.x > 0) v.x += .075 * k * k; v.y *= 1 + .16 * k; }
    if (v.x < 0) v.x *= .96; v.y *= 1.09;
    nm.copy(v).normalize(); let d = 0; const az = Math.abs(v.z);
    if (v.x > -.1) for (const [cx, cy, cz, sx, sy, sz, amp] of FEAT) d += amp * gauss(v.x, v.y, cz === 0 ? v.z : az, cx, cy, cz, sx, sy, sz);
    v.addScaledVector(nm, d); P.push(v.x, v.y, v.z);
  }
  // lip ring row (closest to the target mouth height at the front)
  let ring = 0, best = 9; const row = i => Math.floor(i / (Wd + 1));
  for (let iy = 1; iy < Hd; iy++) { let sum = 0, c = 0; for (let ix = 0; ix <= Wd; ix++) { const i = iy * (Wd + 1) + ix; if (P[i * 3] > .6 && Math.abs(P[i * 3 + 2]) < .12) { sum += P[i * 3 + 1]; c++; } } if (c) { const m = sum / c, e = Math.abs(m + .55); if (e < best) { best = e; ring = iy; } } }
  let yl = 0, cl = 0; for (let ix = 0; ix <= Wd; ix++) { const i = ring * (Wd + 1) + ix; if (P[i * 3] > .6 && Math.abs(P[i * 3 + 2]) < .12) { yl += P[i * 3 + 1]; cl++; } } const yLip = yl / cl;
  const dup = new Map(); let nv = n0; const lowerSet = new Set();
  for (let ix = 0; ix <= Wd; ix++) { const i = ring * (Wd + 1) + ix; if (P[i * 3] > .3 && Math.abs(P[i * 3 + 2]) < .25) { dup.set(i, nv); P.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); lowerSet.add(nv); nv++; } }
  const idx = [], src = sg.index.array;
  for (let t = 0; t < src.length; t += 3) {
    let a = src[t], b = src[t + 1], c = src[t + 2]; const ra = row(a), rb = row(b), rc = row(c), hasR = ra === ring || rb === ring || rc === ring, hasB = ra === ring + 1 || rb === ring + 1 || rc === ring + 1;
    if (hasR && hasB) { if (ra === ring && dup.has(a)) a = dup.get(a); if (rb === ring && dup.has(b)) b = dup.get(b); if (rc === ring && dup.has(c)) c = dup.get(c); }
    // eye openings (removed triangles → eyeball visible)
    const cx = (P[a * 3] + P[b * 3] + P[c * 3]) / 3, cy = (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3, cz = Math.abs(P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
    if (cx > .4 && (((cz - .385) / .15) ** 2 + ((cy - .075) / .062) ** 2) < 1) continue;
    idx.push(a, b, c);
  }
  const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  for (let i = 0; i < nv; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; pos[i * 3] = x * R; pos[i * 3 + 1] = y * R; pos[i * 3 + 2] = z * R * ZS; uv[i * 2] = Math.atan2(z, x) / TAU + .5; uv[i * 2 + 1] = .5 + y / 2.7; }
  // blendshape deltas
  const deltas = MORPHS.map(() => new Float32Array(nv * 3)), isLower = i => i >= n0 ? lowerSet.has(i) : row(i) > ring;
  const hinge = [-.1, 0], TH = .42;
  for (let i = 0; i < nv; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], az = Math.abs(z), s = z >= 0 ? 1 : -1; // s=+1 → fighter's right (L = -z)
    const add = (k, dx, dy, dz) => { const a = deltas[k]; a[i * 3] += dx * R; a[i * 3 + 1] += dy * R; a[i * 3 + 2] += dz * R * ZS; };
    if (isLower(i)) { const w = sstep(.5, .16, az) * sstep(-.15, .35, x); if (w > 0) { const dx = x - hinge[0], dy = y - hinge[1], c = Math.cos(TH * w), sn = Math.sin(TH * w); add(0, dx * c + dy * sn - dx, -dx * sn + dy * c - dy, 0); } }
    const mc = (sgn) => gauss(x, y, z, .9, yLip + .02, sgn * .25, .25, .12, .13);
    const cl = mc(-1), cr = mc(1);
    add(1, 0, .065 * cl, -.04 * cl); add(2, 0, .065 * cr, .04 * cr);                        // smile L(-z)/R(+z): corner up + out
    const cs = cl + cr; add(3, -.02 * cs, 0, .075 * cs * s); add(4, 0, -.055 * cs, 0);            // stretch / frown
    const bw = (sgn, k) => gauss(x, y, z, .93, .32, sgn * .38, .22, .1, .28) + .6 * gauss(x, y, z, .95, .28, sgn * .14, .12, .1, .12);
    add(5, .012 * bw(-1), -.065 * bw(-1), 0); add(6, .012 * bw(1), -.065 * bw(1), 0);
    const inn = gauss(x, y, z, .95, .3, -.14, .14, .12, .14) + gauss(x, y, z, .95, .3, .14, .14, .12, .14); add(7, 0, .07 * inn, 0);
    add(8, 0, .05 * gauss(x, y, z, .9, .34, -.55, .2, .1, .2), 0); add(9, 0, .05 * gauss(x, y, z, .9, .34, .55, .2, .1, .2), 0);
    for (const [sgn, kb, ks] of [[-1, 10, 12], [1, 11, 13]]) { const g = gauss(x, y, z, .9, .075, sgn * .385, .3, .14, .2); add(kb, .006 * g, -(y - .075) * .97 * g, 0); add(ks, 0, -(y - .075) * .5 * g + .02 * gauss(x, y, z, .85, -.1, sgn * .4, .25, .1, .2), 0); }
    add(14, 0, .02 * (cl + cr) * 0 + .0, 0); const pr = gauss(x, y, z, .98, yLip, 0, .2, .04, .3); add(14, .012 * pr, 0, 0);
    const ns = gauss(x, y, z, 1.0, -.33, 0, .15, .1, .2); add(15, 0, .03 * ns, 0);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  geo.computeVertexNormals(); geo.morphTargetsRelative = true; geo.morphAttributes.position = deltas.map(d => new THREE.BufferAttribute(d, 3));
  return { geo, yLip, hinge, TH };
}

/* ---------------- painted skin maps ---------------- */
const MAPCACHE = {};
function skinMaps(spec, yLip, hero) {
  const key = spec.skin + spec.id + hero; if (MAPCACHE[key]) return MAPCACHE[key];
  const Wc = hero ? 2048 : 1024, Hc = Wc / 2, rn = rng(spec.skin.charCodeAt(2) * 31 + 7), kx = Wc / TAU, ky = Hc / 2.7;
  const A = cvs(Wc, Hc), g = A.getContext('2d'), Hh = cvs(Wc, Hc), gh = Hh.getContext('2d'), Rg = cvs(Wc, Hc), gr = Rg.getContext('2d'), E = cvs(Wc, Hc), ge = E.getContext('2d');
  const base = spec.skin, warm = mixHex(base, '#c4584c', .35), deep = mixHex(base, '#4a2a22', .5), light = mixHex(base, '#ffe8d4', .3), pink = mixHex(base, '#c8606a', .55), lipc = mixHex(base, '#a0464a', .6);
  g.fillStyle = base; g.fillRect(0, 0, Wc, Hc); gh.fillStyle = '#808080'; gh.fillRect(0, 0, Wc, Hc); gr.fillStyle = '#8c8c8c'; gr.fillRect(0, 0, Wc, Hc); ge.fillStyle = '#000'; ge.fillRect(0, 0, Wc, Hc);
  const C = (x, y, z) => [(Math.atan2(z, x) / TAU + .5) * Wc, (.5 - y / 2.7) * Hc];
  const blob = (ctx, x, y, z, rx, ry, col, al, rot = 0) => { const [cx, cy] = C(x, y, z); ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(rx * kx, ry * ky); const gd = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); gd.addColorStop(0, col); gd.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = al; ctx.fillStyle = gd; ctx.fillRect(-1, -1, 2, 2); ctx.restore(); };
  const curve = (ctx, pts, col, w, al, blur = 0) => { ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; if (blur) ctx.filter = 'blur(' + blur + 'px)'; ctx.beginPath(); pts.forEach(([x, y, z], i) => { const [cx, cy] = C(x, y, z); i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); }); ctx.stroke(); ctx.restore(); };
  // --- global colour variation
  blob(g, .95, .62, 0, .55, .3, light, .18); blob(g, .86, -.2, 0, .6, .4, warm, .1);
  for (const s of [-1, 1]) { blob(g, .85, -.18, s * .56, .26, .2, warm, .22); blob(g, .9, .075, s * .385, .3, .2, deep, .3); blob(g, .9, -.085, s * .38, .22, .06, deep, .22); blob(g, .6, -.2, s * .95, .3, .3, warm, .12); blob(g, -.05, -.03, s * 1.0, .12, .2, pink, .5);
    curve(g, [[.95, -.34, s * .16], [.9, -.42, s * .26], [.86, -.5, s * .32], [.85, -.6, s * .33]], deep, 5, .22, 3); curve(g, [[.97, .12, s * .13], [.97, -.1, s * .1], [1.02, -.26, s * .08]], deep, 4, .12, 3); }
  blob(g, 1.06, -.3, 0, .1, .09, pink, .4); blob(g, .95, -.7, 0, .2, .1, deep, .13); blob(g, .9, .4, 0, .5, .08, deep, .06);
  // forehead creases + frown lines (heightmap)
  for (const yv of [.56, .64, .72]) curve(gh, [[.9, yv, -.5], [.99, yv + .01, -.2], [1.0, yv + .01, .2], [.9, yv, .5]], '#555', 2, .35, 1.2);
  for (const s of [-1, 1]) { curve(gh, [[.97, .3, s * .1], [.99, .42, s * .12]], '#444', 2.5, .4, 1); curve(gh, [[.95, -.34, s * .16], [.9, -.42, s * .26], [.86, -.5, s * .32]], '#505050', 4, .35, 2); curve(gh, [[.92, -.12, s * .44], [.95, -.1, s * .3], [.93, -.12, s * .2]], '#606060', 3, .3, 2); }
  // --- stubble (light), pores
  const sm = hero ? 1 : .45;
  const mask = (y, z) => { const jaw = sstep(-.36, -.6, y) * sstep(.85, .35, Math.abs(z)); const lip = Math.exp(-(((y + .47) / .1) ** 2)) * sstep(.4, .1, Math.abs(z)) * 1.2; const cheek = sstep(-.12, -.4, y) * sstep(.8, .5, Math.abs(z)) * .4; return Math.min(1, jaw + lip + cheek); };
  g.fillStyle = '#17110e'; for (let i = 0; i < 110000 * sm; i++) { const y = -.95 + rn() * .75, z = (rn() * 1.0) * (rn() < .5 ? -1 : 1), m = mask(y, z); if (rn() > m * .55) continue; const x = Math.sqrt(Math.max(.05, 1 - y * y * .5 - z * z)), [cx, cy] = C(x, y, z); g.globalAlpha = .2 + rn() * .35; g.fillRect(cx, cy, 1 + rn() * .6, 1 + rn() * .6); gh.fillStyle = '#444'; gh.globalAlpha = .5; gh.fillRect(cx, cy, 1.4, 1.4); } g.globalAlpha = 1; gh.globalAlpha = 1;
  const shade = (y, z) => mask(y, z); for (let k = 0; k < 40; k++) { const y = -.9 + k * .018; for (const z of [-.5, -.3, -.1, .1, .3, .5]) blob(g, .95, y, z, .12, .05, '#1c1411', .05 * shade(y, z)); }
  g.globalAlpha = .06; for (let i = 0; i < 26000 * sm; i++) { g.fillStyle = rn() < .5 ? '#000' : '#fff'; g.fillRect(rn() * Wc, rn() * Hc, 1.2, 1.2); } g.globalAlpha = 1;
  gh.globalAlpha = .5; for (let i = 0; i < 90000 * sm; i++) { gh.fillStyle = rn() < .6 ? '#656565' : '#999'; gh.fillRect(rn() * Wc, rn() * Hc, 1.3, 1.3); } gh.globalAlpha = 1;
  // --- eyebrows (hair strokes)
  for (const s of [-1, 1]) for (let i = 0; i < 520 * sm + 60; i++) { const t = rn(), z = s * (.14 + .52 * t), y = .335 + .045 * Math.sin(t * Math.PI * .9) - .05 * t * t + (rn() - .5) * .045 * (1 - t * .5), x = Math.sqrt(1 - y * y * .6 - z * z) * .99; const [cx, cy] = C(x, y, z); const ang = -Math.PI / 2 + s * (.5 + .9 * t) * .6 + (rn() - .5) * .3; g.strokeStyle = '#0b0807'; g.globalAlpha = .55 + rn() * .4; g.lineWidth = 1.2 + rn() * .9; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * 8 * (hero ? 1 : .5), cy + Math.sin(ang) * 8 * (hero ? 1 : .5)); g.stroke(); } g.globalAlpha = 1;
  // --- eye area: lash lines, creases, tear ducts
  for (const s of [-1, 1]) {
    const up = [], lo = []; for (let k = 0; k <= 24; k++) { const a = Math.PI * k / 24, z = s * (.385 + .15 * Math.cos(a)), yy = .075 + .066 * Math.sin(a); up.push([Math.sqrt(1 - yy * yy * .8 - z * z), yy + .004, z]); lo.push([Math.sqrt(1 - yy * yy * .8 - z * z), .075 - .062 * Math.sin(a) - .004, z]); }
    curve(g, up, '#0a0605', hero ? 7 : 4, .95, .8); curve(g, lo, '#3a2420', hero ? 3 : 2, .6, .6);
    curve(g, up.map(([x, y, z]) => [x, y + .045, z]), deep, 4, .38, 2); blob(g, .9, .07, s * .235, .035, .03, '#cc6a64', .7);
    curve(gh, up.map(([x, y, z]) => [x, y + .045, z]), '#444', 3, .5, 1.5);
  }
  // --- lips + nostrils + philtrum
  const lipU = [.985, yLip + .035, 0], lipL = [.985, yLip - .05, 0];
  { const lc = mixHex(base, '#8a2f35', .62), lc2 = mixHex(base, '#a8474b', .6), shape = (pts, col, blur) => { g.save(); g.filter = 'blur(' + blur + 'px)'; g.fillStyle = col; g.beginPath(); pts.forEach(([x, y, z], i) => { const [cx, cy] = C(x, y, z); i ? g.lineTo(cx, cy) : g.moveTo(cx, cy); }); g.closePath(); g.fill(); g.restore(); };
    const arcPts = (fn, n = 20) => { const o = []; for (let k = 0; k <= n; k++) { const t = k / n, z = -.28 + .56 * t; o.push([.99, fn(z), z]); } return o; };
    const up = arcPts(z => yLip + .075 * (1 - (z / .28) ** 2) - .012 * Math.exp(-((z / .04) ** 2))), upBase = arcPts(z => yLip), lo = arcPts(z => yLip - .1 * (1 - (z / .28) ** 2) ** .8);
    shape([...up, ...upBase.slice().reverse()], lc, hero ? 2 : 1); shape([...upBase, ...lo.slice().reverse()], lc2, hero ? 2 : 1);
    blob(g, .99, yLip - .055, 0, .13, .025, '#e0a0a0', .28); }
  curve(g, [[.98, yLip, -.27], [1.0, yLip + .003, -.1], [1.0, yLip, 0], [1.0, yLip + .003, .1], [.98, yLip, .27]], '#2a0d0f', hero ? 4 : 2.5, .85, .6);
  for (let i = 0; i < 70 * sm + 20; i++) { const z = (rn() - .5) * .46, y = yLip + (rn() < .5 ? .01 + rn() * .06 : -.01 - rn() * .09), x = Math.sqrt(1 - y * y * .6 - z * z); const [cx, cy] = C(x, y, z); gh.strokeStyle = '#555'; gh.globalAlpha = .5; gh.lineWidth = 1; gh.beginPath(); gh.moveTo(cx, cy); gh.lineTo(cx + (rn() - .5) * 2, cy + 6); gh.stroke(); } gh.globalAlpha = 1;
  for (const s of [-1, 1]) { blob(g, 1.03, -.365, s * .075, .04, .02, '#1c0a0a', .8); curve(g, [[.98, -.4, s * .05], [1.0, yLip + .07, s * .05]], deep, 3, .22, 1.5); }
  // --- scar through the left brow (KAI)
  if (spec.face && spec.face.scar) { curve(g, [[.92, .5, -.36], [.95, .38, -.44], [.93, .22, -.5]], '#d6a894', hero ? 4 : 2.5, .75, .5); curve(gh, [[.92, .5, -.36], [.95, .38, -.44], [.93, .22, -.5]], '#b0b0b0', 3, .8, .5); }
  // --- roughness (oily T-zone, wet lips) + SSS emissive (thin areas: lips, nose tip, ears, eyelids)
  blob(gr, .98, .55, 0, .3, .2, '#555', .55); blob(gr, 1.05, -.3, 0, .12, .16, '#555', .6); blob(gr, .95, -.8, 0, .2, .1, '#666', .4);
  blob(gr, .985, yLip + .035, 0, .27, .05, '#6a6a6a', .8); blob(gr, .985, yLip - .05, 0, .25, .065, '#606060', .8);
  gr.globalAlpha = .55; gr.fillStyle = '#b0b0b0'; for (const [x0, x1, y0, y1, z0, z1] of [[0, 1, -.9, -.45, 0, .55]]) for (let i = 0; i < 6000 * sm; i++) { const y = y0 + rn() * (y1 - y0), z = (z0 + rn() * (z1 - z0)) * (rn() < .5 ? -1 : 1), x = Math.sqrt(Math.max(.05, 1 - y * y * .5 - z * z)); const [cx, cy] = C(x, y, z); gr.fillRect(cx, cy, 2, 2); } gr.globalAlpha = 1;
  blob(ge, 1.06, -.3, 0, .1, .1, '#5a1810', .9); blob(ge, lipU[0], yLip, 0, .27, .1, '#4a1210', .8); for (const s of [-1, 1]) { blob(ge, -.05, -.03, s * 1.0, .14, .22, '#6a2014', .9); blob(ge, .88, -.12, s * .58, .22, .2, '#3a0e0a', .5); blob(ge, .9, .07, s * .385, .22, .12, '#3a0e0a', .5); }
  // --- height → normal map
  const hd = gh.getImageData(0, 0, Wc, Hc).data, nd = new Uint8ClampedArray(Wc * Hc * 4), str = hero ? 3.2 : 2.4;
  const hv = (x, y) => hd[(((y + Hc) % Hc) * Wc + ((x + Wc) % Wc)) * 4] / 255;
  for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) { const dx = (hv(x + 1, y) - hv(x - 1, y)) * str, dy = (hv(x, y + 1) - hv(x, y - 1)) * str, l = Math.hypot(dx, dy, 1), o = (y * Wc + x) * 4; nd[o] = (-dx / l * .5 + .5) * 255; nd[o + 1] = (dy / l * .5 + .5) * 255; nd[o + 2] = (1 / l * .5 + .5) * 255; nd[o + 3] = 255; }
  const N = cvs(Wc, Hc); N.getContext('2d').putImageData(new ImageData(nd, Wc, Hc), 0, 0);
  const T = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
  return MAPCACHE[key] = { map: T(A, true), normal: T(N, false), rough: T(Rg, false), emissive: T(E, true), canvas: { A, N } };
}

/* ---------------- eyes ---------------- */
function eyeTextures(irisColor) {
  const c = cvs(512, 256), g = c.getContext('2d'), rn = rng(5); // sphere with pole at +x: iris = top rows (radial streaks)
  g.fillStyle = '#ece6dc'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 70; i++) { g.strokeStyle = 'rgba(190,60,60,' + (.08 + rn() * .12) + ')'; g.lineWidth = 1; const x = rn() * 512, y = 120 + rn() * 130; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rn() - .5) * 30, y - 30 - rn() * 40); g.stroke(); }
  const ir = g.createLinearGradient(0, 0, 0, 62); const col = new THREE.Color(irisColor); ir.addColorStop(0, '#000'); ir.addColorStop(.1, '#' + col.clone().multiplyScalar(.3).getHexString()); ir.addColorStop(.45, '#' + col.clone().multiplyScalar(1.5).getHexString()); ir.addColorStop(.85, '#' + col.clone().multiplyScalar(.8).getHexString()); ir.addColorStop(1, '#0b0705');
  g.fillStyle = ir; g.fillRect(0, 0, 512, 62); for (let i = 0; i < 320; i++) { g.strokeStyle = 'rgba(' + (rn() < .5 ? '255,215,160' : '10,5,2') + ',' + (.1 + rn() * .2) + ')'; g.lineWidth = 1; const x = rn() * 512; g.beginPath(); g.moveTo(x, 6 + rn() * 6); g.lineTo(x + (rn() - .5) * 4, 40 + rn() * 20); g.stroke(); }
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 14);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/* ---------------- hair cards ---------------- */
function hairAlpha() {
  const c = cvs(64, 128), g = c.getContext('2d'), rn = rng(21); g.clearRect(0, 0, 64, 128);
  for (let i = 0; i < 46; i++) { const x0 = 3 + rn() * 58, x1 = 32 + (x0 - 32) * (.2 + rn() * .3), w = 3 + rn() * 2.5; g.strokeStyle = 'rgba(255,255,255,' + (.7 + rn() * .3) + ')'; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, 0); g.quadraticCurveTo(x0 + (rn() - .5) * 12, 60, x1, 100 + rn() * 26); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
}
function hairGeometry(R, rn, DETq) {
  const geos = [], up = new V3(0, 1, 0);
  const card = (az, el, len, w, droop, side = 0, fwd = 0) => {
    const base = new V3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az) * ZS), out = base.clone().normalize(); base.multiplyScalar(R * 1.02);
    let d = out.clone().multiplyScalar(1 - droop).addScaledVector(up, -droop).addScaledVector(new V3(1, 0, 0), fwd).addScaledVector(new V3(0, 0, 1), side).normalize();
    const seg = 6, pos = [], uv = [], idx = [], pts = [base.clone()]; let cur = base.clone(), dir = d.clone();
    for (let k = 1; k <= seg; k++) { dir.lerp(new V3(0, -1, 0), .16 * (1 + droop)).normalize(); cur = cur.clone().addScaledVector(dir, R * len / seg); pts.push(cur); }
    const nrm = out.clone(), sd = new V3().crossVectors(d, nrm).normalize();
    for (let k = 0; k <= seg; k++) { const t = k / seg, hw = (R * w / 2) * (1 - .8 * Math.pow(t, 1.4)); const p0 = pts[k]; pos.push(p0.x - sd.x * hw, p0.y - sd.y * hw, p0.z - sd.z * hw, p0.x + sd.x * hw, p0.y + sd.y * hw, p0.z + sd.z * hw); uv.push(0, t, 1, t); if (k < seg) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); geos.push(g);
  };
  const r = (a, b) => a + rn() * (b - a);
  for (let i = 0; i < 230; i++) card(r(0, TAU), r(.8, 1.5), r(.4, .85), r(.18, .3), r(.35, .75), r(-.3, .3), r(-.25, .1));                    // crown (messy, slightly forward-swept)
  for (let i = 0; i < 44; i++) card(r(-.95, .95), r(.95, 1.22), r(.36, .58), r(.13, .22), r(.6, .85), r(-.4, .4), r(.2, .5));                       // fringe over forehead
  for (const s of [-1, 1]) for (let i = 0; i < 32; i++) card(s * r(1.2, 2.3), r(.05, .85), r(.5, .95), r(.18, .3), r(.8, 1), 0, r(-.1, .15));  // side locks over ears
  for (let i = 0; i < 70; i++) card(Math.PI + r(-1.2, 1.2), r(-.3, .9), r(.7, 1.3), r(.2, .32), r(.85, 1), 0, r(-.35, -.1));                    // back / nape
  return mergeGeometries(geos);
}

/* ---------------- main builder ---------------- */
export function buildRealHead(spec, R, DET) {
  const hero = DET.hs >= 60, g = new THREE.Group(), { geo, yLip, hinge, TH } = headGeometry(R, hero, spec.face || {}), M = skinMaps(spec, yLip, hero);
  const skin = new THREE.MeshPhysicalMaterial({ map: M.map, normalMap: M.normal, normalScale: new THREE.Vector2(.9, .9), roughnessMap: M.rough, roughness: 1, metalness: 0, emissiveMap: M.emissive, emissive: new THREE.Color('#ff6a50'), emissiveIntensity: .07,
    sheen: .35, sheenRoughness: .6, sheenColor: new THREE.Color(spec.skin).multiplyScalar(.8), clearcoat: .02, clearcoatRoughness: .7, envMapIntensity: .55, side: THREE.FrontSide });
  const head = new THREE.Mesh(geo, skin); head.castShadow = head.receiveShadow = true; head.morphTargetInfluences = new Array(MORPHS.length).fill(0); head.morphTargetDictionary = Object.fromEntries(MORPHS.map((m, i) => [m, i])); head.name = 'KAI_head'; g.add(head);
  // inner dark shell + mouth cavity + teeth + tongue
  const inner = new THREE.Mesh(new THREE.SphereGeometry(.8 * R, 20, 14), new THREE.MeshBasicMaterial({ color: '#1a0709' })); inner.position.x = -.12 * R; inner.scale.z = ZS; g.add(inner);
  const tm = new THREE.MeshStandardMaterial({ color: '#e9e2d2', roughness: .28 });
  const arc = (r, y) => { const a = Math.PI * .85, m = new THREE.Mesh(new THREE.TorusGeometry(r * R, .034 * R, 8, 24, a).rotateX(Math.PI / 2).rotateY(a / 2), tm); m.position.set(.5 * R, y * R, 0); m.scale.z = ZS; return m; };
  const upper = arc(.3, yLip + .03); g.add(upper);
  const jaw = new THREE.Group(); jaw.position.set(hinge[0] * R, hinge[1] * R, 0); g.add(jaw);
  const lowT = arc(.3, yLip - .045); lowT.position.x -= hinge[0] * R; lowT.position.y -= hinge[1] * R; jaw.add(lowT);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(.2 * R, 16, 12), new THREE.MeshStandardMaterial({ color: '#b5545a', roughness: .5 })); tongue.scale.set(1.1, .35, .85); tongue.position.set(.46 * R - hinge[0] * R, (yLip - .09) * R - hinge[1] * R, 0); jaw.add(tongue);
  // eyes
  const eyeTex = eyeTextures(spec.eye || '#3a2412'), eyes = [];
  for (const s of [-1, 1]) {
    const eg = new THREE.Group(); eg.position.set(.74 * R, .075 * R, s * .385 * R * ZS);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(.155 * R, 28, 20).rotateZ(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: eyeTex, roughness: .35, clearcoat: .5, clearcoatRoughness: .05, envMapIntensity: .45 })); eg.add(ball);
    const cornea = new THREE.Mesh(new THREE.SphereGeometry(.1585 * R, 28, 16, 0, TAU, 0, .75).rotateZ(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .03, roughness: 0, metalness: 0, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: .8, depthWrite: false })); eg.add(cornea);
    g.add(eg); eyes.push(eg);
  }
  // hair
  const hairMat = new THREE.MeshStandardMaterial({ color: spec.hair.color, roughness: .55, metalness: 0, alphaMap: hairAlpha(), alphaTest: .42, side: THREE.DoubleSide, envMapIntensity: .6 });
  const hairG = new THREE.Group(); g.add(hairG);
  const capMat = new THREE.MeshStandardMaterial({ color: spec.hair.color, roughness: .75, envMapIntensity: .3 });
  const capA = new THREE.Mesh(new THREE.SphereGeometry(R * 1.015, 40, 28, 0, TAU, 0, Math.PI * .36), capMat); capA.scale.set(1.0, 1.1, 1.01 * ZS); capA.rotation.z = .1; hairG.add(capA);
  const capB = new THREE.Mesh(new THREE.SphereGeometry(R * 1.015, 40, 28, -Math.PI / 2, Math.PI, 0, Math.PI * .66), capMat); capB.scale.set(1.0, 1.1, 1.01 * ZS); hairG.add(capB);
  const cards = new THREE.Mesh(hairGeometry(R, rng(77), DET), hairMat); cards.castShadow = true; hairG.add(cards);
  // ears
  const earMat = new THREE.MeshStandardMaterial({ color: mixHex(spec.skin, '#c0605a', .12), roughness: .55 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(R * .15, 18, 14), earMat); e.scale.set(.32, 1.05, .6); e.position.set(-R * .06, -R * .02, s * R * .9 * ZS); e.rotation.set(s * .1, 0, s * .12); g.add(e); }
  // expression state (blendshape weights, smoothed) + blinking
  const cur = {}, tgt = {}; for (const m of MORPHS) { cur[m] = 0; tgt[m] = 0; }
  const setExpr = (name, snap) => { for (const m of MORPHS) tgt[m] = 0; Object.assign(tgt, EXPRESSIONS[name] || EXPRESSIONS.neutral); if (snap) Object.assign(cur, tgt); };
  let blinkT = 2 + Math.random() * 3, blink = 0;
  const updExpr = (dt) => {
    const k = 1 - Math.exp(-dt * 14); for (const m of MORPHS) cur[m] += (tgt[m] - cur[m]) * k;
    blinkT -= dt; if (blinkT <= 0) { blink = .16; blinkT = 2.5 + Math.random() * 3.5; } let bl = 0; if (blink > 0) { blink -= dt; bl = Math.sin(Math.max(0, blink) / .16 * Math.PI); }
    const inf = head.morphTargetInfluences; MORPHS.forEach((m, i) => { let v = cur[m]; if (m === 'eyeBlink_L' || m === 'eyeBlink_R') v = Math.max(v, bl); inf[i] = v; });
    jaw.rotation.z = -TH * cur.jawOpen; jaw.position.set(hinge[0] * R, hinge[1] * R, 0);
  };
  if (typeof window !== 'undefined') window.__faceDbg = { yLip, canvas: M.canvas };
  setExpr('neutral', true);
  return { g, eyes, hairParts: { sway: hairG }, setExpr, updExpr, head };
}
