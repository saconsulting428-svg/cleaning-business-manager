/* Extra arenas: traditional martial-arts tournament dojo (dusk) and industrial underground cage arena. Built lazily. */
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

const TAU = Math.PI * 2, V3 = THREE.Vector3;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, srgb = true, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(rep[0], rep[1]); return t; };
const neon = (c, i = 2.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false });
const sh = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };
function skyTex(stops) { const c = cv(4, 512), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512); stops.forEach(([p, col]) => gr.addColorStop(p, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 512); return tex(c); }
function glowTex(color = '255,200,120') { const c = cv(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(.3, `rgba(${color},.4)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return tex(c); }
/* instanced seated/standing crowd silhouettes with subtle idle motion */
function crowd(rn, spots, colors, scale = 1) {
  const body = new THREE.CapsuleGeometry(.2 * scale, .5 * scale, 4, 8).scale(1.45, 1, .8), head = new THREE.SphereGeometry(.14 * scale, 12, 9);
  const mb = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: .9, metalness: 0 }), spots.length), mh = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ color: '#3a2a24', roughness: .85 }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), base = [];
  spots.forEach((s, i) => { base.push({ x: s[0], y: s[1], z: s[2], ph: rn() * 6, ry: s[3] || 0, sc: .9 + rn() * .25 }); c.set(colors[(rn() * colors.length) | 0]).multiplyScalar(.28 + rn() * .3); mb.setColorAt(i, c); });
  const upd = (t) => { base.forEach((b, i) => { const bob = Math.sin(t * 2 + b.ph) * .03 + (Math.sin(t * .7 + b.ph * 2) > .93 ? .08 : 0); q.setFromEuler(new THREE.Euler(0, b.ry, Math.sin(t + b.ph) * .04)); m.compose(new V3(b.x, b.y + bob, b.z), q, new V3(b.sc, b.sc, b.sc)); mb.setMatrixAt(i, m); m.compose(new V3(b.x, b.y + .55 * scale * b.sc + bob + .2, b.z), q, new V3(b.sc, b.sc, b.sc)); mh.setMatrixAt(i, m); }); mb.instanceMatrix.needsUpdate = true; mh.instanceMatrix.needsUpdate = true; };
  upd(0); mb.castShadow = false; return { meshes: [mb, mh], update: upd };
}
function woodTex(rn, W = 1024) { // planks with grain
  const c = cv(W, W), g = c.getContext('2d'); g.fillStyle = '#7a4a24'; g.fillRect(0, 0, W, W); const pw = W / 8;
  for (let i = 0; i < 8; i++) { const sh2 = .85 + rn() * .3; g.fillStyle = `rgb(${(122 * sh2) | 0},${(74 * sh2) | 0},${(36 * sh2) | 0})`; g.fillRect(i * pw + 2, 0, pw - 4, W);
    for (let k = 0; k < 90; k++) { g.strokeStyle = `rgba(40,20,8,${.08 + rn() * .14})`; g.lineWidth = 1 + rn() * 2; const x = i * pw + 4 + rn() * (pw - 8); g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (rn() - .5) * 18, W * .3, x + (rn() - .5) * 18, W * .6, x + (rn() - .5) * 10, W); g.stroke(); }
    for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(30,14,6,.5)'; g.beginPath(); g.ellipse(i * pw + pw / 2 + (rn() - .5) * 30, rn() * W, 6 + rn() * 8, 3 + rn() * 5, 0, 0, TAU); g.fill(); } }
  g.fillStyle = 'rgba(0,0,0,.6)'; for (let i = 0; i <= 8; i++) g.fillRect(i * pw - 1, 0, 3, W);
  return c;
}
function stoneTex(rn, W = 1024) {
  const c = cv(W, W), g = c.getContext('2d'); g.fillStyle = '#6b6862'; g.fillRect(0, 0, W, W); const n = 5, s = W / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = .78 + rn() * .35; g.fillStyle = `rgb(${(110 * v) | 0},${(106 * v) | 0},${(98 * v) | 0})`; g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
    for (let k = 0; k < 400; k++) { g.fillStyle = rn() < .5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'; g.fillRect(x * s + rn() * s, y * s + rn() * s, 2, 2); } if (rn() < .35) { const gr = g.createRadialGradient(x * s + rn() * s, y * s + rn() * s, 0, x * s + s / 2, y * s + s / 2, s * .5); gr.addColorStop(0, 'rgba(70,100,50,.35)'); gr.addColorStop(1, 'transparent'); g.fillStyle = gr; g.fillRect(x * s, y * s, s, s); } }
  return c;
}

/* ===================================================== TOURNAMENT DOJO (dusk) ===================================================== */
export function buildDojo(ctx) {
  const rn = mulberry(808), group = new THREE.Group(), q = ctx.q, A = { fires: [], banners: [], petals: null };
  // sky + sun + mountains
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 24), new THREE.MeshBasicMaterial({ map: skyTex([[0, '#1c1033'], [.38, '#5a2a5a'], [.62, '#c8553d'], [.8, '#ff9a4a'], [1, '#ffd08a']]), side: THREE.BackSide, fog: false, depthWrite: false })); group.add(dome);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('255,210,140'), color: new THREE.Color(2.4, 1.8, 1.1), fog: false, depthWrite: false })); sun.scale.set(150, 150, 1); sun.position.set(-40, 24, -210); group.add(sun);
  const hillTex = (col, h, seed) => { const c = cv(1024, 256), g = c.getContext('2d'), r = mulberry(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, 256); let y = 120; for (let x = 0; x <= 1024; x += 8) { y += (r() - .5) * 18 + Math.sin(x * .01 + seed) * 4; y = Math.min(Math.max(y, 60), 200); g.lineTo(x, y - h); } g.lineTo(1024, 256); g.fill(); return tex(c); };
  [['#3a2a4e', 90, 1, 120, -160, 2], ['#2c2040', 60, 2, 80, -120, 1.5], ['#1d1530', 40, 3, 55, -85, 1.2]].forEach(([col, h, sd, dist, z, sc]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(440 * sc, 110 * sc), new THREE.MeshBasicMaterial({ map: hillTex(col, h, sd), transparent: true, depthWrite: false, fog: true })); m.position.set(0, 18 + sc * 6, z); group.add(m); });
  // courtyard (stone) + fighting platform (wood)
  const stone = tex(stoneTex(rn), true, [8, 5]), floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ map: stone, roughness: .85, bumpMap: stone, bumpScale: 1.5 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.4; floor.receiveShadow = true; group.add(floor);
  const wood = tex(woodTex(rn), true, [2, 1.2]), woodMat = new THREE.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 1.2, roughness: .42, metalness: 0, envMapIntensity: .8 });
  const plat = sh(new THREE.Mesh(new THREE.BoxGeometry(13, .4, 7.4), woodMat)); plat.position.y = -.2; group.add(plat);
  const trim = sh(new THREE.Mesh(new THREE.BoxGeometry(13.4, .16, 7.8), new THREE.MeshStandardMaterial({ color: '#2a1408', roughness: .6 }))); trim.position.y = -.42; group.add(trim);
  // gold inlay ring + emblem
  const gold = new THREE.MeshStandardMaterial({ color: '#d9a82a', metalness: .9, roughness: .3, emissive: '#6a4a08', emissiveIntensity: .3 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.15, 3.22, 96), gold); ring.rotation.x = -Math.PI / 2; ring.position.y = .006; group.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.34, 96), new THREE.MeshStandardMaterial({ color: '#a51a1a', roughness: .5, emissive: '#400', emissiveIntensity: .4 })); ring2.rotation.x = -Math.PI / 2; ring2.position.y = .006; group.add(ring2);
  const em = cv(512, 512), eg = em.getContext('2d'); eg.translate(256, 256); eg.fillStyle = '#a51a1a'; eg.beginPath(); eg.arc(0, 0, 200, 0, TAU); eg.fill(); eg.strokeStyle = '#d9a82a'; eg.lineWidth = 12; eg.beginPath(); eg.arc(0, 0, 200, 0, TAU); eg.stroke();
  eg.fillStyle = '#d9a82a'; for (let k = 0; k < 8; k++) { eg.rotate(TAU / 8); eg.beginPath(); eg.moveTo(0, -60); eg.lineTo(30, -140); eg.lineTo(-30, -140); eg.fill(); } eg.fillStyle = '#111'; eg.beginPath(); eg.arc(0, 0, 50, 0, TAU); eg.fill();
  const emb = new THREE.Mesh(new THREE.CircleGeometry(1.7, 64), new THREE.MeshStandardMaterial({ map: tex(em), transparent: true, roughness: .5, metalness: .4, opacity: .92 })); emb.rotation.x = -Math.PI / 2; emb.position.y = .008; group.add(emb);
  // steps + low rail at the back
  for (let i = 0; i < 3; i++) { const s = sh(new THREE.Mesh(new THREE.BoxGeometry(8 - i * .5, .24, 1.1), new THREE.MeshStandardMaterial({ map: stone, roughness: .85 }))); s.position.set(0, -.4 + .24 * (i + 1) - .08, -4.3 - i * .0 - (2 - i) * 1.1); group.add(s); }
  const red = new THREE.MeshStandardMaterial({ color: '#8a1414', roughness: .55 }), dark = new THREE.MeshStandardMaterial({ color: '#241410', roughness: .7 }), roofM = new THREE.MeshStandardMaterial({ color: '#2a2630', roughness: .6, metalness: .2 });
  // torii-style gate at the back
  const gate = new THREE.Group(); [-4.2, 4.2].forEach(x => { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(.34, .4, 7.2, 20), red)); p.position.set(x, 3.2, 0); gate.add(p); const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .2, 20), dark)); b.position.set(x, -.1, 0); gate.add(b); });
  const beam = sh(new THREE.Mesh(new THREE.BoxGeometry(11.6, .5, .5), dark)); beam.position.y = 6.6; gate.add(beam); const beam2 = sh(new THREE.Mesh(new THREE.BoxGeometry(10, .34, .4), red)); beam2.position.y = 5.5; gate.add(beam2);
  const cap = sh(new THREE.Mesh(new THREE.BoxGeometry(13, .22, .9), dark)); cap.position.y = 7; cap.rotation.z = 0; gate.add(cap); const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.2, .12), gold); plaque.position.set(0, 6.0, .2); gate.add(plaque);
  gate.position.set(0, 0, -11.5); group.add(gate);
  // temple halls left/right (tiered roofs) + red pillars
  const hall = (x, z, rotY, s = 1) => { const g = new THREE.Group(); const body = sh(new THREE.Mesh(new THREE.BoxGeometry(9 * s, 5 * s, 6 * s), new THREE.MeshStandardMaterial({ color: '#d8c8a8', roughness: .85 }))); body.position.y = 2.5 * s - .4; g.add(body);
    for (let i = -2; i <= 2; i++) { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(.22 * s, .26 * s, 5 * s, 14), red)); p.position.set(i * 2 * s, 2.5 * s - .4, 3.1 * s); g.add(p); }
    for (let t = 0; t < 2; t++) { const rf = sh(new THREE.Mesh(new THREE.ConeGeometry((7.4 - t * 2.2) * s, (2.4 - t * .5) * s, 4), roofM)); rf.rotation.y = Math.PI / 4; rf.scale.z = .82; rf.position.y = (5.6 + t * 2.1) * s - .4; g.add(rf); const eave = sh(new THREE.Mesh(new THREE.BoxGeometry((10.6 - t * 3) * s, .22, (7.4 - t * 2.4) * s), dark)); eave.position.y = (5.1 + t * 2.1) * s - .4; g.add(eave); }
    g.position.set(x, 0, z); g.rotation.y = rotY; group.add(g); };
  hall(-19, -9, .45, 1.2); hall(19, -9, -.45, 1.2); hall(-30, 2, 1.1, 1); hall(30, 2, -1.1, 1);
  // stone lanterns with warm lights + torches
  const warmPts = []; const lantern = (x, z) => { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#8a8780', roughness: .9 }); [[.5, .7, .3], [.45, .6, 1.0], [.9, .25, 1.55], [.12, .45, 1.9]].forEach(([w, h, y], i) => { const b = sh(new THREE.Mesh(i === 3 ? new THREE.ConeGeometry(.55, .4, 4) : new THREE.BoxGeometry(w, h, w), m)); b.position.y = y; if (i === 2) b.scale.set(1.5, .5, 1.5); if (i === 3) { b.position.y = 2.2; b.rotation.y = Math.PI / 4; } g.add(b); });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(.4, .4, .4), neon('#ffb060', 3)); glow.position.y = 1.55; g.add(glow); const pl = new THREE.PointLight(0xffa850, 8, 9, 2); pl.position.set(0, 1.6, 0); g.add(pl); A.fires.push({ l: pl, base: 8 }); g.position.set(x, -.4, z); group.add(g); };
  [[-7.4, -3.6], [7.4, -3.6], [-7.4, 3.4], [7.4, 3.4]].forEach(([x, z]) => lantern(x, z));
  const torch = (x, z) => { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(.06, .1, 3, 8), dark)); p.position.set(x, 1.1, z); group.add(p); const fl = new THREE.Mesh(new THREE.ConeGeometry(.22, .7, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.3, .25), toneMapped: false, transparent: true, opacity: .9 })); fl.position.set(x, 2.8, z); group.add(fl); const pl = new THREE.PointLight(0xff8a30, 22, 14, 2); pl.position.set(x, 3, z); group.add(pl); A.fires.push({ l: pl, fm: fl, base: 22 }); };
  [[-8.6, -5.4], [8.6, -5.4]].forEach(([x, z]) => torch(x, z));
  // banners on tall poles (waving)
  const bannerTex = () => { const c = cv(256, 512), g = c.getContext('2d'); g.fillStyle = '#8a1414'; g.fillRect(0, 0, 256, 512); g.fillStyle = '#d9a82a'; g.fillRect(10, 10, 236, 8); g.fillRect(10, 494, 236, 8); g.strokeStyle = '#d9a82a'; g.lineWidth = 10; g.beginPath(); g.arc(128, 190, 70, 0, TAU); g.stroke(); g.lineWidth = 8; g.beginPath(); g.moveTo(128, 120); g.lineTo(128, 260); g.moveTo(70, 190); g.lineTo(186, 190); g.stroke(); g.fillStyle = '#d9a82a'; for (let k = 0; k < 5; k++) g.fillRect(100, 300 + k * 36, 56, 14); return tex(c); };
  const bt = bannerTex(); [[-10.5, -5.5], [10.5, -5.5], [-12, 0], [12, 0], [-6, -7.5], [6, -7.5]].forEach(([x, z], i) => { const pole = sh(new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, 8, 8), dark)); pole.position.set(x, 3.6, z); group.add(pole); const g = new THREE.PlaneGeometry(1.5, 4.2, 6, 16); g.translate(.8, -2.1, 0); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: bt, roughness: .85, side: THREE.DoubleSide })); m.position.set(x, 7.4, z); m.rotation.y = x < 0 ? .3 : -.3; m.castShadow = true; group.add(m); A.banners.push({ m, g, base: g.attributes.position.array.slice(), ph: i }); });
  // paper lantern strings
  [[-14, 3.3, -3, 14, 3.3, -3], [-14, 4, -9, 14, 4, -9]].forEach(([x0, y0, z0, x1, y1, z1]) => { for (let i = 0; i < 12; i++) { const t = i / 11, x = x0 + (x1 - x0) * t, y = y0 + 1.6 - Math.sin(t * Math.PI) * .9 + 2, z = z0; const l = new THREE.Mesh(new THREE.SphereGeometry(.34, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? '#ff3a2a' : '#ffb050').multiplyScalar(2.2), toneMapped: false })); l.scale.y = 1.25; l.position.set(x, y, z); group.add(l); } });
  // crowd on stone tiers (left, right, back)
  const spots = []; const cols = ['#2a2a38', '#5a2a2a', '#2a4a5a', '#4a3a22', '#e8e0d0', '#6a2a5a', '#2a3a2a'];
  for (let row = 0; row < 4; row++) for (let i = 0; i < 16; i++) { spots.push([-9.5 - row * 1.4, row * .55 + .1, -4 + i * .7 + (row % 2) * .35, Math.PI / 2 + (rn() - .5) * .3]); spots.push([9.5 + row * 1.4, row * .55 + .1, -4 + i * .7 + (row % 2) * .35, -Math.PI / 2 + (rn() - .5) * .3]); }
  for (let row = 0; row < 3; row++) for (let i = 0; i < 22; i++) spots.push([-8 + i * .75 + (row % 2) * .35, row * .5 + .2, -8.2 - row * 1.1, 0]);
  const cr = crowd(rn, spots, cols, 1); cr.meshes.forEach(m => group.add(m)); A.crowd = cr;
  for (const side of [-1, 1]) for (let row = 0; row < 4; row++) { const t = sh(new THREE.Mesh(new THREE.BoxGeometry(1.4, .5 * (row + 1), 12), new THREE.MeshStandardMaterial({ map: stone, roughness: .9 })), false); t.position.set(side * (9.5 + row * 1.4), -.4 + .25 * (row + 1) - .02, 0.9); group.add(t); }
  // cherry trees + falling petals
  const tree = (x, z, s) => { const g = new THREE.Group(); const tr = sh(new THREE.Mesh(new THREE.CylinderGeometry(.18 * s, .32 * s, 4 * s, 10), new THREE.MeshStandardMaterial({ color: '#3a2418', roughness: .9 }))); tr.position.y = 1.6 * s; g.add(tr); for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry((1 + rn()) * s, 10, 8), new THREE.MeshStandardMaterial({ color: ['#ff9ac0', '#ffc6dc', '#ff7aa8'][(rn() * 3) | 0], roughness: .9, emissive: '#552233', emissiveIntensity: .25 })); b.position.set((rn() - .5) * 4 * s, (3.6 + rn() * 2) * s, (rn() - .5) * 4 * s); g.add(b); } g.position.set(x, -.4, z); group.add(g); };
  [[-17, -14, 1.3], [17, -14, 1.2], [-12, -18, 1.5], [12, -19, 1.4], [-24, -6, 1.2], [24, -6, 1.3]].forEach(([x, z, s]) => tree(x, z, s));
  const N = 260, pp = new Float32Array(N * 3), pv = []; for (let i = 0; i < N; i++) { pp.set([(rn() - .5) * 40, rn() * 12, (rn() - .5) * 26 - 4], i * 3); pv.push([rn() * .5 + .25, rn() * 6]); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); const petals = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#ffc6dc', size: .12, transparent: true, opacity: .85, depthWrite: false })); group.add(petals);
  // mist layers
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(80, 6), new THREE.MeshBasicMaterial({ map: glowTex('255,190,170'), transparent: true, opacity: .16, depthWrite: false, fog: false })); m.position.set(0, 1.6 + i * .5, -14 + i * 3); group.add(m); }
  A.update = (t, dt) => {
    A.fires.forEach((f, i) => { f.l.intensity = f.base + Math.sin(t * 17 + i * 3) * f.base * .12 + Math.random() * f.base * .08; if (f.fm) f.fm.scale.set(1 + Math.sin(t * 20 + i) * .15, 1 + Math.sin(t * 13 + i) * .25, 1); });
    A.banners.forEach(b => { const p = b.g.attributes.position, a = b.base; for (let k = 0; k < p.count; k++) { const x = a[k * 3] / 1.5; p.setZ(k, Math.sin(t * 2 + b.ph + a[k * 3 + 1] * .8) * .14 * x); } p.needsUpdate = true; });
    const pa = pg.attributes.position.array; for (let i = 0; i < N; i++) { pa[i * 3 + 1] -= pv[i][0] * dt; pa[i * 3] += Math.sin(t * .6 + pv[i][1]) * dt * .6 + dt * .3; if (pa[i * 3 + 1] < -.3) { pa[i * 3 + 1] = 11; pa[i * 3] = (Math.random() - .5) * 40; } } pg.attributes.position.needsUpdate = true;
    if ((Math.floor(t * 8) % 2) === 0) A.crowd.update(t);
  };
  return { group, update: A.update, preset: { fog: [0x5a2e44, .011], bg: 0x2a1530, key: [0xffc79a, 2.7, [-6, 7, 6]], hemi: [0xffb88a, 0x3a2a4a, .75], spot: [0xffe0b0, 90], rims: null, exposure: 1.1 }, envLights: [[0xff9a50, -8, 3, -4], [0xffd0a0, 6, 6, 4], [0xff4a4a, 0, 2, -9]] };
}

/* ===================================================== INDUSTRIAL UNDERGROUND CAGE ARENA ===================================================== */
export function buildBunker(ctx) {
  const rn = mulberry(404), group = new THREE.Group(), q = ctx.q, A = { lamps: [], sparks: null, beacon: null };
  // concrete walls / ceiling shell
  const wallC = cv(1024, 1024), wg = wallC.getContext('2d'); wg.fillStyle = '#4a4d50'; wg.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { const v = .85 + rn() * .3; wg.fillStyle = `rgb(${(74 * v) | 0},${(77 * v) | 0},${(80 * v) | 0})`; wg.fillRect(x * 256 + 3, y * 128 + 3, 250, 122); }
  for (let i = 0; i < 80; i++) { const x = rn() * 1024, gr = wg.createLinearGradient(x, 0, x, 1024); gr.addColorStop(0, 'rgba(10,20,10,.0)'); gr.addColorStop(.3, 'rgba(10,20,10,.25)'); gr.addColorStop(1, 'rgba(10,20,10,0)'); wg.fillStyle = gr; wg.fillRect(x, 0, 2 + rn() * 5, 1024); }
  for (let i = 0; i < 30000; i++) { wg.fillStyle = rn() < .5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.05)'; wg.fillRect(rn() * 1024, rn() * 1024, 2, 2); }
  // graffiti
  const tags = ['FIGHT', 'NO MERCY', 'PIT', 'KO', 'RISE', '666', 'WAR']; const gcols = ['#ff3a6a', '#3ad0ff', '#ffe03a', '#7dff5a', '#ff8a2a'];
  wg.textAlign = 'center'; for (let i = 0; i < 10; i++) { wg.save(); wg.translate(60 + rn() * 900, 90 + rn() * 840); wg.rotate((rn() - .5) * .5); wg.font = `900 ${50 + rn() * 70}px Impact, Arial Black, sans-serif`; wg.lineWidth = 8; wg.strokeStyle = '#000'; wg.strokeText(tags[(rn() * tags.length) | 0], 0, 0); wg.fillStyle = gcols[(rn() * gcols.length) | 0]; wg.fillText(tags[(rn() * tags.length) | 0], 0, 0); wg.restore(); }
  const wallT = tex(wallC, true, [3, 1]), wallMat = new THREE.MeshStandardMaterial({ map: wallT, bumpMap: wallT, bumpScale: 2, roughness: .9, metalness: .1 });
  const back = sh(new THREE.Mesh(new THREE.PlaneGeometry(50, 14), wallMat), false); back.position.set(0, 7, -12); group.add(back);
  for (const s of [-1, 1]) { const w = sh(new THREE.Mesh(new THREE.PlaneGeometry(40, 14), wallMat), false); w.position.set(s * 20, 7, -2); w.rotation.y = -s * Math.PI / 2; group.add(w); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: '#1a1c1e', roughness: .9 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 12; group.add(ceil);
  // wet concrete floor (+ reflector on medium/high)
  const fc = cv(1024, 1024), fg = fc.getContext('2d'); fg.fillStyle = '#3a3c3e'; fg.fillRect(0, 0, 1024, 1024); for (let i = 0; i < 60000; i++) { fg.fillStyle = rn() < .5 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.05)'; fg.fillRect(rn() * 1024, rn() * 1024, 2, 2); }
  for (let i = 0; i < 40; i++) { const x = rn() * 1024, y = rn() * 1024, r = 30 + rn() * 90, gr = fg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'transparent'); fg.fillStyle = gr; fg.fillRect(x - r, y - r, r * 2, r * 2); }
  fg.strokeStyle = 'rgba(0,0,0,.6)'; fg.lineWidth = 4; for (let i = 0; i <= 4; i++) { fg.beginPath(); fg.moveTo(i * 256, 0); fg.lineTo(i * 256, 1024); fg.moveTo(0, i * 256); fg.lineTo(1024, i * 256); fg.stroke(); }
  const rc = cv(256, 256), rg = rc.getContext('2d'); rg.fillStyle = '#808080'; rg.fillRect(0, 0, 256, 256); for (let i = 0; i < 14; i++) { const x = rn() * 256, y = rn() * 256, r = 18 + rn() * 55, gr = rg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'transparent'); rg.fillStyle = gr; rg.fillRect(x - r, y - r, r * 2, r * 2); }
  const ac = cv(256, 256), ag = ac.getContext('2d'); ag.fillStyle = '#d0d0d0'; ag.fillRect(0, 0, 256, 256); for (let i = 0; i < 14; i++) { const x = rn() * 256, y = rn() * 256, r = 18 + rn() * 55, gr = ag.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'transparent'); ag.fillStyle = gr; ag.fillRect(x - r, y - r, r * 2, r * 2); }
  const slab = sh(new THREE.Mesh(new THREE.BoxGeometry(34, .6, 20), new THREE.MeshStandardMaterial({ color: '#202224', roughness: .9 })), false); slab.position.y = -.31; group.add(slab);
  if (q.reflect) { const rf = new Reflector(new THREE.PlaneGeometry(34, 20), { clipBias: .003, textureWidth: 1024 * (q.reflectRes || .5), textureHeight: 512 * (q.reflectRes || .5), color: 0x8a9096 }); rf.rotation.x = -Math.PI / 2; rf.position.y = .001; group.add(rf); A.reflector = rf; }
  const fm = new THREE.MeshStandardMaterial({ map: tex(fc, true, [3, 2]), roughnessMap: tex(rc, false, [3, 2]), roughness: .7, metalness: .25, transparent: !!q.reflect, alphaMap: q.reflect ? tex(ac, false, [3, 2]) : null, envMapIntensity: .9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 20), fm); floor.rotation.x = -Math.PI / 2; floor.position.y = .004; floor.receiveShadow = true; group.add(floor);
  // painted ring: yellow/black hazard border + centre
  const hz = cv(64, 64), hg = hz.getContext('2d'); hg.fillStyle = '#e8c21a'; hg.fillRect(0, 0, 64, 64); hg.fillStyle = '#111'; hg.beginPath(); hg.moveTo(0, 32); hg.lineTo(32, 0); hg.lineTo(64, 0); hg.lineTo(0, 64); hg.fill(); hg.beginPath(); hg.moveTo(32, 64); hg.lineTo(64, 32); hg.lineTo(64, 64); hg.fill();
  const hzt = tex(hz, true, [40, 1]); const border = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.85, 96), new THREE.MeshStandardMaterial({ map: hzt, roughness: .7 })); border.rotation.x = -Math.PI / 2; border.position.y = .008; group.add(border);
  const inner = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.46, 96), neon('#ff3a2a', 2.2)); inner.rotation.x = -Math.PI / 2; inner.position.y = .009; group.add(inner);
  const cl = cv(512, 512), cg = cl.getContext('2d'); cg.strokeStyle = '#fff'; cg.lineWidth = 14; cg.beginPath(); cg.arc(256, 256, 190, 0, TAU); cg.stroke(); cg.font = '900 150px Impact,Arial Black'; cg.fillStyle = '#fff'; cg.textAlign = 'center'; cg.textBaseline = 'middle'; cg.fillText('PIT', 256, 266);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: tex(cl), transparent: true, color: new THREE.Color('#ff3a2a').multiplyScalar(1.1), opacity: .6, depthWrite: false })); logo.rotation.x = -Math.PI / 2; logo.position.y = .012; group.add(logo);
  // steel cage: posts + chain link panels (back + sides; front stays open for the camera)
  const fence = cv(128, 128), fgc = fence.getContext('2d'); fgc.strokeStyle = '#fff'; fgc.lineWidth = 4; for (let i = -1; i < 9; i++) { fgc.beginPath(); fgc.moveTo(i * 16 - 8, 0); fgc.lineTo(i * 16 + 120, 128); fgc.moveTo(i * 16 + 136, 0); fgc.lineTo(i * 16 + 8, 128); fgc.stroke(); }
  const ft = tex(fence, false, [10, 3]), fenceMat = new THREE.MeshStandardMaterial({ color: '#8a9096', alphaMap: ft, alphaTest: .5, side: THREE.DoubleSide, metalness: .8, roughness: .45, transparent: false });
  const steel = new THREE.MeshStandardMaterial({ color: '#4a4f55', metalness: .85, roughness: .4 });
  const panel = (x, z, w, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.6), fenceMat); m.position.set(x, 1.9, z); m.rotation.y = ry; group.add(m); };
  const R = 7.4; for (let i = 0; i < 12; i++) { const a = Math.PI * 1.05 + (i / 11) * Math.PI * 0.9 * 1.0; if (i === 5 || i === 6) { } } // (arc built below)
  const seg = 14, arcStart = Math.PI * .92, arcEnd = Math.PI * 2.08; for (let i = 0; i < seg; i++) { const a0 = arcStart + (arcEnd - arcStart) * i / seg, a1 = arcStart + (arcEnd - arcStart) * (i + 1) / seg, am = (a0 + a1) / 2, w = 2 * R * Math.sin((a1 - a0) / 2); panel(Math.cos(am) * R * 1.35, Math.sin(am) * R * .95, w * 1.2, -am + Math.PI / 2); const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 4, 10), steel)); p.position.set(Math.cos(a1) * R * 1.35, 2, Math.sin(a1) * R * .95); group.add(p); }
  const topring = new THREE.Mesh(new THREE.TorusGeometry(1, .06, 8, 64, Math.PI * 1.16), steel); topring.scale.set(R * 1.35, R * .95, 1); topring.rotation.x = Math.PI / 2; topring.rotation.z = Math.PI * .92; topring.position.y = 3.95; group.add(topring);
  // ceiling beams + hanging industrial lamps (animated flicker) with visible light cones
  const beamM = new THREE.MeshStandardMaterial({ color: '#2a2d30', metalness: .8, roughness: .5 });
  for (let i = -3; i <= 3; i++) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(.5, .6, 40), beamM), false); b.position.set(i * 5.5, 11.2, -2); group.add(b); }
  for (let j = -1; j <= 1; j++) { const b = sh(new THREE.Mesh(new THREE.BoxGeometry(60, .5, .5), beamM), false); b.position.set(0, 10.8, j * 7 - 2); group.add(b); }
  const coneTex = (() => { const c = cv(64, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,240,200,.55)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); return tex(c); })();
  [[-4.5, 0], [0, 0], [4.5, 0], [-9, -6], [9, -6]].forEach(([x, z], i) => { const g = new THREE.Group(); const cord = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 3.2, 6), beamM); cord.position.y = 1.7; g.add(cord);
    const shade = sh(new THREE.Mesh(new THREE.ConeGeometry(.75, .6, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#3a4a3a', metalness: .6, roughness: .5, side: THREE.DoubleSide })), false); g.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.18, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.8), toneMapped: false })); bulb.position.y = -.2; g.add(bulb);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(.5, 3.2, 8, 24, 1, true), new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: .2, fog: true })); cone.position.y = -4.2; g.add(cone);
    const sp = new THREE.SpotLight(0xffe0b0, i < 3 ? 120 : 40, 18, .7, .7, 1.6); sp.position.set(0, -.2, 0); sp.target.position.set(0, -10, 0); g.add(sp, sp.target); g.position.set(x, 9, z); group.add(g); A.lamps.push({ sp, bulb, cone, base: i < 3 ? 120 : 40, ph: i * 1.7 }); });
  // pipes, vents, barrels with fire, crates
  const pipeM = new THREE.MeshStandardMaterial({ color: '#6a5a4a', metalness: .8, roughness: .45 });
  for (let i = 0; i < 4; i++) { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 44, 12), pipeM), false); p.rotation.z = Math.PI / 2; p.position.set(0, 3 + i * .5, -11.6); group.add(p); }
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const p = sh(new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 30, 12), pipeM), false); p.rotation.x = Math.PI / 2; p.position.set(s * 19.5, 2.4 + i * .6, -2); group.add(p); }
  const barrel = (x, z, fire) => { const b = sh(new THREE.Mesh(new THREE.CylinderGeometry(.34, .3, .9, 18), new THREE.MeshStandardMaterial({ color: fire ? '#3a2a1c' : '#2a5a4a', roughness: .55, metalness: .7 }))); b.position.set(x, .45, z); group.add(b); if (fire) { const l = new THREE.PointLight(0xff7a30, 14, 11, 2); l.position.set(x, 1.3, z); group.add(l); const fl = new THREE.Mesh(new THREE.ConeGeometry(.24, .7, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, .2), toneMapped: false, transparent: true, opacity: .85 })); fl.position.set(x, 1.25, z); group.add(fl); A.fires = A.fires || []; A.fires.push({ l, fm: fl, base: 14 }); } };
  barrel(-9, -5, true); barrel(9.5, -5.5, true); barrel(-9.6, -4.4, false); barrel(-8.4, -5.8, false); barrel(10.4, -4.6, false);
  [[-11, -8], [11, -8.5], [-12.2, -7.6]].forEach(([x, z]) => { const c = sh(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: '#5a4a32', roughness: .8 }))); c.position.set(x, .6, z); c.rotation.y = rn() * 3; group.add(c); });
  // catwalk with crowd leaning on the rail, left/right/back
  const catM = new THREE.MeshStandardMaterial({ color: '#2f3336', metalness: .8, roughness: .5 });
  const cat = (x, z, w, d, ry) => { const g = new THREE.Group(); const fl = sh(new THREE.Mesh(new THREE.BoxGeometry(w, .2, d), catM), false); g.add(fl); const rail = sh(new THREE.Mesh(new THREE.BoxGeometry(w, .08, .08), catM), false); rail.position.set(0, 1.1, d / 2 - .1); g.add(rail); const rail2 = rail.clone(); rail2.position.y = .6; g.add(rail2); for (let i = 0; i <= w; i += 1.6) { const p = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.1, .06), catM); p.position.set(i - w / 2, .55, d / 2 - .1); g.add(p); } g.position.set(x, 3.6, z); g.rotation.y = ry; group.add(g); };
  cat(-14.5, -3, 18, 2.4, Math.PI / 2); cat(14.5, -3, 18, 2.4, -Math.PI / 2); cat(0, -10.2, 28, 2.4, 0);
  const spots = []; for (let i = 0; i < 22; i++) { spots.push([-13.2, 3.7, -11 + i * .8, Math.PI / 2]); spots.push([13.2, 3.7, -11 + i * .8, -Math.PI / 2]); } for (let i = 0; i < 30; i++) spots.push([-14 + i * .95, 3.7, -9.2, 0]);
  const floorCrowd = []; for (let i = 0; i < 18; i++) { floorCrowd.push([-12 - rn() * 2, 0, -9 + i * .9 + rn() * .3, Math.PI / 2]); floorCrowd.push([12 + rn() * 2, 0, -9 + i * .9 + rn() * .3, -Math.PI / 2]); }
  const cr = crowd(rn, spots.concat(floorCrowd), ['#1a1a20', '#3a2a22', '#2a3a3a', '#4a2a2a', '#222', '#5a5a4a'], 1); cr.meshes.forEach(m => group.add(m)); A.crowd = cr;
  // emergency beacons (rotating) + steam + sparks
  A.beacons = [[-17, 8, -9], [17, 8, -9]].map(([x, y, z]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, .1, .05), toneMapped: false })); b.position.set(x, y, z); group.add(b); const l = new THREE.SpotLight(0xff2a1a, 220, 30, .5, .5, 1.5); l.position.set(x, y, z); l.target.position.set(x * .2, 0, -2); group.add(l, l.target); return { b, l }; });
  const st = glowTex('200,210,220'); A.steam = []; for (let i = 0; i < 24; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, opacity: 0, depthWrite: false, color: 0x9aa8b0 })); s.userData = { x: [-6, 7][i & 1] + (rn() - .5) * .2, z: -11 + (rn() - .5), t: rn() * 6 }; group.add(s); A.steam.push(s); }
  const SN = 90, sp2 = new Float32Array(SN * 3); A.spv = new Float32Array(SN * 3); const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp2, 3)); A.sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffb050', size: .1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sp2.fill(999); group.add(A.sparks);
  A.update = (t, dt) => {
    A.lamps.forEach((l, i) => { const f = 1 + Math.sin(t * 9 + l.ph) * .03 + (Math.sin(t * 2.3 + l.ph * 4) > .985 ? -.55 : 0) + (Math.random() < .004 ? -.7 : 0); l.sp.intensity = l.base * f; l.bulb.material.color.setScalar(3 * f); l.cone.material.opacity = .2 * f; });
    (A.fires || []).forEach((f, i) => { f.l.intensity = f.base + Math.sin(t * 17 + i * 3) * 3 + Math.random() * 2; f.fm.scale.set(1 + Math.sin(t * 20 + i) * .15, 1 + Math.sin(t * 13 + i) * .25, 1); });
    A.beacons.forEach((b, i) => { const k = (Math.sin(t * 5 + i * 3.14) + 1) / 2; b.l.intensity = 230 * k; b.b.material.color.setScalar(.4 + 3 * k).multiply(new THREE.Color(1, .05, .02)); b.b.material.color.r = .4 + 3 * k; });
    A.steam.forEach(s => { const u = s.userData; u.t += dt * .5; const k = (u.t % 3) / 3; s.position.set(u.x + Math.sin(u.t * 3) * .2 + k * .5, .4 + k * 4.5, u.z); s.scale.setScalar(.7 + k * 2.6); s.material.opacity = Math.sin(k * Math.PI) * .2; });
    const pa = sg.attributes.position.array, v = A.spv; if (Math.random() < .04) { const ox = (Math.random() < .5 ? -1 : 1) * (9 + Math.random() * 2), oz = -6 + Math.random() * 3; for (let i = 0; i < SN; i++) if (pa[i * 3] > 900) { for (let k = 0; k < 18; k++) { const j = (i + k) % SN; pa[j * 3] = ox; pa[j * 3 + 1] = 2.6; pa[j * 3 + 2] = oz; v[j * 3] = (Math.random() - .5) * 3; v[j * 3 + 1] = Math.random() * 3; v[j * 3 + 2] = (Math.random() - .5) * 3; } break; } }
    for (let i = 0; i < SN; i++) if (pa[i * 3] < 900) { v[i * 3 + 1] -= 9 * dt; pa[i * 3] += v[i * 3] * dt; pa[i * 3 + 1] += v[i * 3 + 1] * dt; pa[i * 3 + 2] += v[i * 3 + 2] * dt; if (pa[i * 3 + 1] < 0) pa[i * 3] = 999; } sg.attributes.position.needsUpdate = true;
    if ((Math.floor(t * 8) % 2) === 0) A.crowd.update(t);
  };
  return { group, update: A.update, preset: { fog: [0x0c1618, .011], bg: 0x070c0e, key: [0xcfe4ff, 1.0, [0, 9, 4]], hemi: [0x6a8a96, 0x1a1410, .5], spot: [0xffe0b0, 0], rims: null, exposure: 1.15 }, envLights: [[0xffe0b0, 0, 8, 0], [0xff3a2a, -10, 6, -6], [0x3ad0ff, 10, 4, -6]] };
}
