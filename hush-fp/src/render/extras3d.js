/* 3D for the v9 additions: fallen shelves, collapsed corridors, debris, sparks, steam, pipe leaks, healing pickups and the small creatures.
   Lightweight on purpose: obstacles/debris are merged into one mesh per material, effects are a handful of additive sprites (no real-time lights), the small creature is one
   shared 4k-triangle mesh. Everything lives in the level's scene, so View.disposeLevel releases it. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { patchPulse, glowTex, TS, WH } from './scene3d.js';
import { CrawlerGLB } from './crawler_glb.js';

const box = (w, h, d, x, y, z, rx, ry, rz) => { const g = new THREE.BoxGeometry(w, h, d); if (rx || ry || rz) { g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0))); } g.translate(x, y, z); return g; };
let _blob = null; function blobTex() { if (_blob) return _blob; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _blob = new THREE.CanvasTexture(c); _blob.userData.shared = true; return _blob; }
let _puff = null; function puffTex() { if (_puff) return _puff; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); for (let i = 0; i < 6; i++) { const cx = 20 + Math.random() * 24, cy = 20 + Math.random() * 24, g = x.createRadialGradient(cx, cy, 1, cx, cy, 20); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); } _puff = new THREE.CanvasTexture(c); _puff.userData.shared = true; return _puff; }

export function buildExtras(world, scene, Q) {
  const grp = new THREE.Group(); scene.add(grp);
  const cheap = Q.mats !== 'std', lit = (o) => { if (cheap) { delete o.roughness; delete o.metalness; return new THREE.MeshLambertMaterial(o); } return new THREE.MeshStandardMaterial(o); };
  const mat = (o) => { const m = lit(o); patchPulse(m); return m; };
  const metalM = mat({ color: 0x3a3e44, roughness: 0.7, metalness: 0.4 }), crateM = mat({ color: 0x4a4034, roughness: 0.9 }), rubbleM = mat({ color: 0x4b4a47, roughness: 0.95 }), shardM = mat({ color: 0x6a7076, roughness: 0.8 });
  const metalG = [], crateG = [], rubbleG = [], shardG = [], ex = { group: grp, sparks: [], steams: [], leaks: [], pickups: [], crawlers: [] };
  let seed = world.spec.seed * 31 + 7; const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (const o of world.objs) {
    const cx = o.x * TS + TS / 2, cz = o.y * TS + TS / 2;
    if (o.type === 'prop' && o.kind === 'fallen') {
      /* a shelf unit that has come down: lying at an angle against a heap of boxes, its planks and spilled contents around it */
      const ry = o.rot || 0, put = (arr, g) => { g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry)); g.translate(cx, 0, cz); arr.push(g); };
      put(metalG, box(0.06, 1.9, 0.06, -0.8, 0.55, -0.3, 0.2, 0, 0.95)); put(metalG, box(0.06, 1.9, 0.06, -0.8, 0.55, 0.3, -0.2, 0, 0.95)); put(metalG, box(0.06, 1.9, 0.06, 0.1, 0.9, -0.3, 0.2, 0, 0.95)); put(metalG, box(0.06, 1.9, 0.06, 0.1, 0.9, 0.3, -0.2, 0, 0.95));
      for (let k = 0; k < 4; k++) put(metalG, box(1.7, 0.05, 0.6, -0.35, 0.3 + k * 0.28, 0, 0, 0, 0.95 - 0.02 * k));
      put(crateG, box(0.8, 0.7, 0.8, 0.55, 0.35, 0.45, 0, 0.4, 0)); put(crateG, box(0.6, 0.5, 0.6, 0.5, 0.95, 0.4, 0.1, 0.9, 0.1)); put(crateG, box(0.5, 0.4, 0.5, -0.6, 0.2, -0.6, 0, 0.3, 0)); put(shardG, box(0.5, 0.03, 0.35, 0.1, 0.03, -0.7, 0, 0.6, 0.05)); put(shardG, box(0.3, 0.03, 0.4, -0.2, 0.03, 0.75, 0, 1.2, 0));
    } else if (o.type === 'prop' && o.kind === 'collapse') {
      /* a corridor section that came down: slabs and rubble up to head height, a gap of dark behind it */
      for (let k = 0; k < 16; k++) { const s = 0.3 + R() * 0.7, x = (R() - 0.5) * 1.9, z = (R() - 0.5) * 1.9, g = box(s, s * (0.6 + R() * 0.8), s * (0.7 + R() * 0.6), x, s * 0.3 + R() * 0.9 * (1 - Math.hypot(x, z) / 1.5), z, R(), R() * 3, R()); g.translate(cx, 0, cz); rubbleG.push(g); }
      for (let k = 0; k < 2; k++) { const g = box(2.0, 0.28, 1.4, 0, 1.15 + k * 0.55, 0, 0.3 * (k ? -1 : 1), R() * 3, 0.35); g.translate(cx, 0, cz); rubbleG.push(g); }
      const g = box(0.14, WH - 1.5, 0.14, 0.4, 1.5 + (WH - 1.5) / 2, 0.3, 0.2, 0, 0.1); g.translate(cx, 0, cz); metalG.push(g);              // a bent rebar hanging from the break
    } else if (o.type === 'debris') {
      for (let k = 0; k < 6; k++) { const g = box(0.12 + R() * 0.3, 0.025 + R() * 0.07, 0.1 + R() * 0.25, (R() - 0.5) * 1.3, 0.03, (R() - 0.5) * 1.3, 0, R() * 3.1, R() * 0.2); g.translate(cx, 0, cz); (R() < 0.4 ? rubbleG : shardG).push(g); }
    }
  }
  /* chapter 3: pipe runs along the corridor ceilings and a few cable trays, so the underground reads as industrial */
  if (world.spec.ch === 2) for (const e of world.gen.edges) { const c = e.cells; for (let k = 1; k < c.length - 1; k++) { const [x, y] = c[k], [px, py] = c[k - 1]; const horiz = x !== px; if ((k + (e.a || 0)) % 2) continue; const g = new THREE.CylinderGeometry(0.09, 0.09, TS, 7); if (horiz) g.rotateZ(Math.PI / 2); else g.rotateX(Math.PI / 2); g.translate(x * TS + TS / 2 + (horiz ? 0 : 0.55), WH - 0.28, y * TS + TS / 2 + (horiz ? 0.55 : 0)); metalG.push(g); } }
  /* chapter 2: a pane of glass partition standing in some lab rooms is too costly to model here, so lab/specimen rooms get a row of floor-standing specimen jars instead */
  if (world.spec.ch === 1) for (const r of world.rooms) if (r.kind === 'specimen' || r.kind === 'lab') { for (let k = 0; k < 3; k++) { const x = (r.x0 + 0.5 + k * 1.3 + (k ? 0.2 : 0)) * TS, z = (r.y0 + 0.35) * TS; if (r.x0 + 0.5 + k * 1.3 > r.x0 + r.w - 1) break; const g = new THREE.CylinderGeometry(0.28, 0.28, 0.9, 10); g.translate(x, 0.45, z); shardG.push(g); const l = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 10); l.translate(x, 0.92, z); metalG.push(l); } }
  const add = (arr, m, cast) => { if (!arr.length) return; const me = new THREE.Mesh(mergeGeometries(arr), m); me.castShadow = !!cast && !!Q.shadow; me.receiveShadow = true; grp.add(me); for (const g of arr) g.dispose(); };

  /* hazards: effects only (the rules live in logic/extras.js) */
  const addMats = [];
  const spriteMat = (map, color, add, op) => { const m = new THREE.SpriteMaterial({ map, color, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false, opacity: op }); addMats.push(m); return m; };
  for (const o of world.objs) {
    if (o.type !== 'hazard') continue; const cx = o.x * TS + TS / 2, cz = o.y * TS + TS / 2;
    if (o.kind === 'spark') {
      const g = new THREE.Group(); g.position.set(cx, 0, cz);
      { const c0 = new THREE.CylinderGeometry(0.03, 0.03, WH - 1.5, 6); c0.translate(cx, 1.5 + (WH - 1.5) / 2, cz); metalG.push(c0); const b0 = new THREE.BoxGeometry(0.22, 0.3, 0.14); b0.translate(cx, 1.5, cz); metalG.push(b0); }
      const glow = new THREE.Sprite(spriteMat(glowTex(), 0x8fd0ff, true, 0)); glow.position.y = 1.45; glow.scale.setScalar(1.2); g.add(glow);
      const flo = new THREE.Sprite(spriteMat(glowTex(), 0x7fc4ff, true, 0)); flo.position.y = 0.1; flo.scale.set(2.2, 2.2, 1); g.add(flo);
      const arc = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); arc.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3)); arc.frustumCulled = false; g.add(arc);
      grp.add(g); ex.sparks.push({ o, g, glow, flo, arc, t: 0 });
    } else if (o.kind === 'steam') {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); { const st = new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8); st.translate(cx, 0.2, cz); metalG.push(st); }
      const puffs = []; for (let k = 0; k < 5; k++) { const s = new THREE.Sprite(spriteMat(puffTex(), 0xcfd6dc, false, 0)); s.position.y = 0.4; s.scale.setScalar(0.5); g.add(s); puffs.push({ s, off: k / 5 }); }
      grp.add(g); ex.steams.push({ o, g, puffs });
    } else if (o.kind === 'leak') {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); { const p0 = new THREE.CylinderGeometry(0.07, 0.07, WH - 1.7, 8); p0.translate(cx, 1.7 + (WH - 1.7) / 2, cz); metalG.push(p0); const j0 = new THREE.CylinderGeometry(0.11, 0.11, 0.12, 8); j0.translate(cx, 1.7, cz); metalG.push(j0); }
      const drop = new THREE.Sprite(spriteMat(glowTex(), 0xbfe4ff, true, 0)); drop.scale.set(0.07, 0.16, 1); drop.position.y = 1.65; g.add(drop); grp.add(g); ex.leaks.push({ o, g, drop });
    }
  }
  add(metalG, metalM, true); add(crateG, crateM, true); add(rubbleG, rubbleM, true); add(shardG, shardM, false);
  /* healing pickups */
  const whiteM = new THREE.MeshStandardMaterial({ color: 0xdfe6e4, roughness: 0.5 }), redM = new THREE.MeshBasicMaterial({ color: 0xd8262c }), tapeM = new THREE.MeshStandardMaterial({ color: 0xcfc4a4, roughness: 0.8 });
  for (const o of world.objs) {
    if (o.type !== 'pickup') continue; const g = new THREE.Group();
    if (o.kind === 'medkit') { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.3), whiteM)); const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.02), redM); c1.position.z = 0.16; const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.02), redM); c2.position.z = 0.16; g.add(c1, c2); const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), whiteM); h.position.y = 0.16; g.add(h); }
    else { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 12), tapeM); r.rotation.z = Math.PI / 2; g.add(r); const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.06), redM); s.position.set(0, 0.0, 0.1); g.add(s); }
    const gl = new THREE.Sprite(spriteMat(glowTex(), 0x6dffb0, true, 0.45)); gl.scale.setScalar(1.0); g.add(gl); g.position.set((o.x + 0.5) * TS, 0.9, (o.y + 0.5) * TS); grp.add(g); ex.pickups.push({ o, g, gl });
  }
  /* the small creatures */
  if (CrawlerGLB.ready) for (const c of world.crawlers) {
    const g = CrawlerGLB.build(Q), root = new THREE.Group(); root.add(g);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.7 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; blob.renderOrder = 1; grp.add(blob);
    const eyes = []; for (const sx of [-1, 1]) { const sp = new THREE.Sprite(spriteMat(glowTex(), 0xff3020, true, 0.9)); sp.scale.setScalar(0.13); sp.position.set(sx * 0.09, 0.2, 0.3); g.add(sp); eyes.push(sp); }
    grp.add(root); ex.crawlers.push({ c, root, body: g, blob, eyes });
  }

  /* scenery for the fear beats (spec.beat): decals and small props placed on real walls and floors of the level */
  const bt = world.spec.beat, ctex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const decalMat = (tex) => { const m = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); addMats.push(m); return m; };
  const wallSpot = (r) => { const W = world.W, cell = (x, y) => world.cells[y * W + x];
    for (const [nx, nz, px, pz, ok] of [[1, 0, r.x0 * TS, (r.y0 + r.h / 2) * TS, cell(r.x0 - 1, r.cy) === 0], [-1, 0, (r.x0 + r.w) * TS, (r.y0 + r.h / 2) * TS, cell(r.x0 + r.w, r.cy) === 0], [0, 1, (r.x0 + r.w / 2) * TS, r.y0 * TS, cell(r.cx, r.y0 - 1) === 0], [0, -1, (r.x0 + r.w / 2) * TS, (r.y0 + r.h) * TS, cell(r.cx, r.y0 + r.h) === 0]]) if (ok) return { nx, nz, px, pz }; return null; };
  const onWall = (spot, tex, w, h, y, off) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), decalMat(tex)); m.position.set(spot.px + spot.nx * 0.03 - spot.nz * (off || 0), y, spot.pz + spot.nz * 0.03 + spot.nx * (off || 0)); m.rotation.y = Math.atan2(spot.nx, spot.nz); grp.add(m); return m; };
  const R1 = world.rooms[Math.min(1, world.rooms.length - 1)], sp1 = wallSpot(R1) || wallSpot(world.rooms[0]);
  if (bt === 'clawWindow' && sp1) { const t = ctex(256, 256, (x, w, h) => { for (let k = 0; k < 4; k++) { x.strokeStyle = 'rgba(14,6,6,.95)'; x.lineWidth = 5; x.beginPath(); x.moveTo(40 + k * 48, 10); x.bezierCurveTo(50 + k * 48, 90, 30 + k * 48, 170, 52 + k * 48, 246); x.stroke(); x.strokeStyle = 'rgba(190,170,150,.35)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(44 + k * 48, 10); x.bezierCurveTo(54 + k * 48, 90, 34 + k * 48, 170, 56 + k * 48, 246); x.stroke(); } }); for (let k = 0; k < 3; k++) onWall(sp1, t, 1.0, 1.0, 1.55, -1.4 + k * 1.3); }
  if (bt === 'floorPlan' && sp1) { const t = ctex(256, 192, (x, w, h) => { x.fillStyle = '#cfc6a8'; x.fillRect(0, 0, w, h); x.strokeStyle = '#33403a'; x.lineWidth = 2; for (const [a, b, c, d] of [[14, 14, 70, 50], [90, 14, 70, 50], [166, 14, 70, 50], [14, 80, 70, 50], [90, 80, 70, 50]]) x.strokeRect(a, b, c, d); x.strokeStyle = '#8a1c1c'; x.lineWidth = 3; x.strokeRect(166, 80, 70, 50); x.setLineDash([5, 4]); x.strokeRect(14, 146, 222, 30); x.fillStyle = '#8a1c1c'; x.font = 'bold 12px monospace'; x.fillText('NOT ON PLAN', 172, 110); x.fillStyle = '#33403a'; x.fillText('FLOOR 1 - OFFICIAL', 14, 190); }); onWall(sp1, t, 1.3, 0.98, 1.6, 0); }
  if (bt === 'handprint') { const T = world.objs.find(o => o.type === 'prop' && o.kind === 'specimen'); const t = ctex(128, 128, (x, w, h) => { x.fillStyle = 'rgba(255,255,255,.0)'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(235,245,250,.55)'; x.beginPath(); x.ellipse(64, 80, 24, 28, 0, 0, 7); x.fill(); for (let f = 0; f < 5; f++) { x.beginPath(); x.ellipse(36 + f * 14, 44 - (f === 0 || f === 4 ? -8 : f === 2 ? 6 : 0), 6, 22, (f - 2) * 0.14, 0, 7); x.fill(); } }); const pos = T ? [(T.x + 0.5) * TS, 1.3, (T.y + 0.5) * TS + 0.57] : null; if (pos) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), decalMat(t)); m.position.set(pos[0], pos[1], pos[2]); grp.add(m); } else if (sp1) onWall(sp1, t, 0.5, 0.5, 1.3, 0); }
  if (bt === 'footprints') { const t = ctex(64, 128, (x, w, h) => { x.fillStyle = 'rgba(20,6,6,.8)'; x.beginPath(); x.ellipse(32, 36, 14, 26, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(32, 96, 12, 18, 0, 0, 7); x.fill(); }); const r = R1, y0 = (r.y0 + r.h / 2) * TS, x0 = (r.x0 + 0.6) * TS; for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.44), decalMat(t)); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2 + (k % 2 ? 0.1 : -0.1); m.position.set(x0 + k * 0.6, 0.035, y0 + (k % 2 ? 0.14 : -0.14)); grp.add(m); } }
  let ceilGroup = null; if (bt === 'ceilClaws') { const t = ctex(256, 256, (x) => { for (let k = 0; k < 4; k++) { x.strokeStyle = 'rgba(10,5,5,.95)'; x.lineWidth = 6; x.beginPath(); x.moveTo(30 + k * 54, 6); x.bezierCurveTo(60 + k * 54, 90, 20 + k * 54, 170, 50 + k * 54, 250); x.stroke(); } }); ceilGroup = new THREE.Group(); for (let k = 0; k < 4; k++) { const e = world.gen.edges[Math.min(k, world.gen.edges.length - 1)], c = e.cells[Math.floor(e.cells.length / 2)]; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), decalMat(t)); m.rotation.x = Math.PI / 2; m.position.set((c[0] + 0.5) * TS, WH - 0.02, (c[1] + 0.5) * TS); ceilGroup.add(m); } ceilGroup.visible = false; grp.add(ceilGroup); }
  const sway = []; if (bt === 'swingLamp' || bt === 'cableHum') { const r = R1; for (let k = 0; k < (bt === 'cableHum' ? 3 : 1); k++) { const g = new THREE.Group(), len = bt === 'cableHum' ? 1.7 : 0.9; g.position.set((r.x0 + 1.5 + k * 1.4) * TS / 1 * 1, WH, (r.y0 + 1.5) * TS / 1); g.position.x = (r.x0 + 1.5 + k * 1.2) * TS; g.position.z = (r.y0 + r.h / 2) * TS; const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 6), new THREE.MeshLambertMaterial({ color: 0x15171a })); cord.position.y = -len / 2; g.add(cord); if (bt === 'swingLamp') { const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0x3a3e42, side: THREE.DoubleSide })); cage.position.y = -len - 0.1; g.add(cage); const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffd9a0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 })); gl.scale.setScalar(1.3); gl.position.y = -len - 0.1; g.add(gl); } grp.add(g); sway.push({ g, ph: k * 1.7 }); } }
  const gshadow = []; if (bt === 'genShadow') for (const o of world.objs) if (o.type === 'generator') { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set((o.x + 0.5) * TS, 0.045, (o.y + 0.5) * TS); grp.add(m); gshadow.push(m); }
  if (bt === 'seatedShadow') { const r = world.rooms.find(q => q.kind === 'cells') || world.rooms[Math.min(2, world.rooms.length - 1)], m = new THREE.MeshLambertMaterial({ color: 0x1b1c1e }), f = new THREE.Group(); const part = (g, x, y, z) => { const q = new THREE.Mesh(g, m); q.position.set(x, y, z); f.add(q); }; part(new THREE.BoxGeometry(0.4, 0.5, 0.25), 0, 0.7, 0); part(new THREE.SphereGeometry(0.13, 10, 8), 0, 1.1, 0.02); part(new THREE.BoxGeometry(0.4, 0.14, 0.5), 0, 0.46, 0.2); part(new THREE.BoxGeometry(0.12, 0.45, 0.12), -0.12, 0.22, 0.42); part(new THREE.BoxGeometry(0.12, 0.45, 0.12), 0.12, 0.22, 0.42); part(new THREE.BoxGeometry(0.1, 0.4, 0.12), -0.27, 0.72, 0.1); part(new THREE.BoxGeometry(0.1, 0.4, 0.12), 0.27, 0.72, 0.1); f.position.set((r.x0 + 0.7) * TS, 0, (r.y0 + 0.9) * TS); f.rotation.y = Math.PI / 2; grp.add(f); }
  let wshape = null, wcells = []; if (bt === 'waterShape') { for (let y = 0; y < world.H; y++) for (let x = 0; x < world.W; x++) if (world.cells[y * world.W + x] === 2) wcells.push([x, y]); if (wcells.length) { wshape = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.75, depthWrite: false })); wshape.rotation.x = -Math.PI / 2; wshape.scale.set(1.8, 0.7, 1); grp.add(wshape); } }
  let rockL = null;

  /* per frame */
  const arcPts = (a) => { const p = a.geometry.attributes.position; let x = 0, y = 1.4, z = 0; for (let k = 0; k < 4; k++) { const nx = (Math.random() - 0.5) * 0.6 * (k + 1), ny = 1.4 - (k + 1) * 0.33, nz = (Math.random() - 0.5) * 0.6 * (k + 1); p.setXYZ(k * 2, x, y, z); p.setXYZ(k * 2 + 1, nx, ny, nz); x = nx; y = ny; z = nz; } p.needsUpdate = true; };
  ex.update = (w, dt, now, alpha) => {
    for (const q of sway) q.g.rotation.z = Math.sin(now * (bt === 'cableHum' ? 9 : 1.3) + q.ph) * (bt === 'cableHum' ? 0.03 : 0.32);
    for (const m of gshadow) m.rotation.z = now * 0.6;
    if (ceilGroup) ceilGroup.visible = w.objs.some(o => o.type === 'valve' && o.done);
    if (wshape && wcells.length) { const k = Math.floor(now * 0.08) % wcells.length, c = wcells[(k * 7) % wcells.length], c2 = wcells[((k + 1) * 7) % wcells.length], u = (now * 0.08) % 1; wshape.position.set(((c[0] + (c2[0] - c[0]) * u) + 0.5) * TS, 0.045, ((c[1] + (c2[1] - c[1]) * u) + 0.5) * TS); }
    if (bt === 'lockerRock' && ex.dyn) { if (!rockL) rockL = ex.dyn.valves.find(v => v.kind === 'locker' && v.o.room >= 2) || null; if (rockL) { const d = Math.hypot(rockL.o.x - w.player.x, rockL.o.y - w.player.y); rockL.g.rotation.z = d < 12 ? Math.sin(now * 5) * 0.018 * Math.max(0, 1 - Math.abs(Math.sin(now * 0.4))) : 0; } }

    for (const s of ex.sparks) {
      const o = s.o, on = o.on, warn = o.warn; s.t -= dt;
      const gl = on ? 0.9 + 0.1 * Math.sin(now * 90) : warn ? (Math.sin(now * 40) > 0.6 ? 0.5 : 0.05) : 0.06; s.glow.material.opacity = gl; s.glow.visible = gl > 0.08; s.flo.material.opacity = on ? 0.55 : 0; s.flo.visible = on; s.arc.visible = on || (warn && Math.sin(now * 40) > 0.6);
      if (s.arc.visible && s.t <= 0) { s.t = 0.05; arcPts(s.arc); }
    }
    for (const s of ex.steams) { const on = s.o.on, ph = (w.time + s.o.ph) % s.o.period; for (const p of s.puffs) { const u = on ? ((ph / 3.6) * 1.6 + p.off) % 1 : 1; p.s.material.opacity = on ? Math.sin(Math.PI * u) * 0.5 : 0; p.s.visible = on; p.s.scale.setScalar(0.5 + u * 3.2); p.s.position.y = 0.4 + u * 1.5; p.s.position.x = Math.sin(now + p.off * 9) * 0.2 * u; } }
    for (const l of ex.leaks) { const ph = (w.time + l.o.ph) % l.o.period, u = ph / l.o.period; l.drop.visible = u < 0.2; if (u < 0.2) { l.drop.material.opacity = 0.9; l.drop.position.y = 1.65 - (u / 0.2) ** 2 * 1.6; } else l.drop.material.opacity = 0; }
    for (const p of ex.pickups) { p.g.visible = !p.o.taken; if (p.o.taken) continue; p.g.position.y = 0.85 + Math.sin(now * 2 + p.o.x) * 0.05; p.g.rotation.y = now * 0.8 + p.o.y; p.gl.material.opacity = (0.4 + 0.12 * Math.sin(now * 3 + p.o.y)) * (p.o.pingT > 0 ? 2 : 1); }
    for (const e of ex.crawlers) {
      const c = e.c, al = alpha === undefined ? 1 : alpha, x = (c.px + (c.x - c.px) * al) * TS, z = (c.py + (c.y - c.py) * al) * TS, run = c.moving, lunge = c.cd > 0.85 ? 1 : 0;
      let y = 0, rx = 0; if (c.ceil) { y = WH - 0.45; rx = Math.PI; } else if (c.drop > 0) { const u = 1 - c.drop / 0.5; y = (WH - 0.45) * (1 - u * u); rx = Math.PI * (1 - Math.min(1, u * 1.6)); }
      e.root.position.set(x, y, z); e.root.rotation.set(0, Math.PI / 2 - c.yaw, 0); e.body.rotation.x = rx;
      const sc = 1 + (run ? Math.sin(now * 26 + c.id) * 0.04 : Math.sin(now * 2.5 + c.id) * 0.02) + lunge * 0.25; e.body.scale.setScalar(sc); e.body.position.y = run ? Math.abs(Math.sin(now * 22 + c.id)) * 0.05 : 0; e.body.rotation.y = run ? Math.sin(now * 26 + c.id) * 0.14 : 0;
      e.blob.position.set(x, 0.03, z); e.blob.visible = y < 0.5; const p = w.player, d = Math.hypot(p.x - c.x, p.y - c.y); for (const s of e.eyes) s.visible = d < 14;
    }
  };
  return ex;
}
