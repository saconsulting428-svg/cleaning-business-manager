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
  const cheap = Q.mats !== 'std', lit = (o) => { if (cheap) { delete o.roughness; delete o.metalness; return new THREE.MeshLambertMaterial(o); } return new THREE.MeshStandardMaterial(o); };
  const mat = (o) => { const m = lit(o); patchPulse(m); return m; };
  const metalM = mat({ color: 0x3a3e44, roughness: 0.7, metalness: 0.4 }), crateM = mat({ color: 0x4a4034, roughness: 0.9 }), rubbleM = mat({ color: 0x4b4a47, roughness: 0.95 }), shardM = mat({ color: 0x6a7076, roughness: 0.8 });
  const metalG = [], crateG = [], rubbleG = [], shardG = [], ex = { sparks: [], steams: [], leaks: [], pickups: [], crawlers: [] };
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
  const add = (arr, m, cast) => { if (!arr.length) return; const me = new THREE.Mesh(mergeGeometries(arr), m); me.castShadow = !!cast && !!Q.shadow; me.receiveShadow = true; scene.add(me); for (const g of arr) g.dispose(); };
  add(metalG, metalM, true); add(crateG, crateM, true); add(rubbleG, rubbleM, true); add(shardG, shardM, false);

  /* hazards: effects only (the rules live in logic/extras.js) */
  const addMats = [];
  const spriteMat = (map, color, add, op) => { const m = new THREE.SpriteMaterial({ map, color, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, transparent: true, depthWrite: false, opacity: op }); addMats.push(m); return m; };
  const cableM = new THREE.MeshBasicMaterial({ color: 0x14161a }), pipeM = lit({ color: 0x4a5058, roughness: 0.6, metalness: 0.5 });
  for (const o of world.objs) {
    if (o.type !== 'hazard') continue; const cx = o.x * TS + TS / 2, cz = o.y * TS + TS / 2;
    if (o.kind === 'spark') {
      const g = new THREE.Group(); g.position.set(cx, 0, cz);
      const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, WH - 1.5, 6), cableM); cab.position.y = 1.5 + (WH - 1.5) / 2; g.add(cab);
      const box0 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.14), pipeM); box0.position.y = 1.5; g.add(box0);
      const glow = new THREE.Sprite(spriteMat(glowTex(), 0x8fd0ff, true, 0)); glow.position.y = 1.45; glow.scale.setScalar(1.2); g.add(glow);
      const flo = new THREE.Sprite(spriteMat(glowTex(), 0x7fc4ff, true, 0)); flo.position.y = 0.1; flo.scale.set(2.2, 2.2, 1); g.add(flo);
      const arc = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })); arc.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3)); arc.frustumCulled = false; g.add(arc);
      scene.add(g); ex.sparks.push({ o, g, glow, flo, arc, t: 0 });
    } else if (o.kind === 'steam') {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8), pipeM); stub.position.y = 0.2; g.add(stub);
      const puffs = []; for (let k = 0; k < 5; k++) { const s = new THREE.Sprite(spriteMat(puffTex(), 0xcfd6dc, false, 0)); s.position.y = 0.4; s.scale.setScalar(0.5); g.add(s); puffs.push({ s, off: k / 5 }); }
      scene.add(g); ex.steams.push({ o, g, puffs });
    } else if (o.kind === 'leak') {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, WH - 1.7, 8), pipeM); pipe.position.y = 1.7 + (WH - 1.7) / 2; g.add(pipe);
      const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 8), pipeM); joint.position.y = 1.7; g.add(joint);
      const drop = new THREE.Sprite(spriteMat(glowTex(), 0xbfe4ff, true, 0)); drop.scale.set(0.07, 0.16, 1); drop.position.y = 1.65; g.add(drop); scene.add(g); ex.leaks.push({ o, g, drop });
    }
  }
  /* healing pickups */
  const whiteM = new THREE.MeshStandardMaterial({ color: 0xdfe6e4, roughness: 0.5 }), redM = new THREE.MeshBasicMaterial({ color: 0xd8262c }), tapeM = new THREE.MeshStandardMaterial({ color: 0xcfc4a4, roughness: 0.8 });
  for (const o of world.objs) {
    if (o.type !== 'pickup') continue; const g = new THREE.Group();
    if (o.kind === 'medkit') { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.3), whiteM)); const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.02), redM); c1.position.z = 0.16; const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.02), redM); c2.position.z = 0.16; g.add(c1, c2); const h = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), whiteM); h.position.y = 0.16; g.add(h); }
    else { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 12), tapeM); r.rotation.z = Math.PI / 2; g.add(r); const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.06), redM); s.position.set(0, 0.0, 0.1); g.add(s); }
    const gl = new THREE.Sprite(spriteMat(glowTex(), 0x6dffb0, true, 0.45)); gl.scale.setScalar(1.0); g.add(gl); g.position.set((o.x + 0.5) * TS, 0.9, (o.y + 0.5) * TS); scene.add(g); ex.pickups.push({ o, g, gl });
  }
  /* the small creatures */
  if (CrawlerGLB.ready) for (const c of world.crawlers) {
    const g = CrawlerGLB.build(Q), root = new THREE.Group(); root.add(g);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.7 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; blob.renderOrder = 1; scene.add(blob);
    const eyes = []; for (const sx of [-1, 1]) { const sp = new THREE.Sprite(spriteMat(glowTex(), 0xff3020, true, 0.9)); sp.scale.setScalar(0.13); sp.position.set(sx * 0.09, 0.2, 0.3); g.add(sp); eyes.push(sp); }
    scene.add(root); ex.crawlers.push({ c, root, body: g, blob, eyes });
  }

  /* per frame */
  const arcPts = (a) => { const p = a.geometry.attributes.position; let x = 0, y = 1.4, z = 0; for (let k = 0; k < 4; k++) { const nx = (Math.random() - 0.5) * 0.6 * (k + 1), ny = 1.4 - (k + 1) * 0.33, nz = (Math.random() - 0.5) * 0.6 * (k + 1); p.setXYZ(k * 2, x, y, z); p.setXYZ(k * 2 + 1, nx, ny, nz); x = nx; y = ny; z = nz; } p.needsUpdate = true; };
  ex.update = (w, dt, now, alpha) => {
    for (const s of ex.sparks) {
      const o = s.o, on = o.on, warn = o.warn; s.t -= dt;
      const gl = on ? 0.9 + 0.1 * Math.sin(now * 90) : warn ? (Math.sin(now * 40) > 0.6 ? 0.5 : 0.05) : 0.06; s.glow.material.opacity = gl; s.flo.material.opacity = on ? 0.55 : 0; s.arc.visible = on || (warn && Math.sin(now * 40) > 0.6);
      if (s.arc.visible && s.t <= 0) { s.t = 0.05; arcPts(s.arc); }
    }
    for (const s of ex.steams) { const on = s.o.on, ph = (w.time + s.o.ph) % s.o.period; for (const p of s.puffs) { const u = on ? ((ph / 3.6) * 1.6 + p.off) % 1 : 1; p.s.material.opacity = on ? Math.sin(Math.PI * u) * 0.5 : 0; p.s.scale.setScalar(0.5 + u * 3.2); p.s.position.y = 0.4 + u * 1.5; p.s.position.x = Math.sin(now + p.off * 9) * 0.2 * u; } }
    for (const l of ex.leaks) { const ph = (w.time + l.o.ph) % l.o.period, u = ph / l.o.period; if (u < 0.2) { l.drop.material.opacity = 0.9; l.drop.position.y = 1.65 - (u / 0.2) ** 2 * 1.6; } else l.drop.material.opacity = 0; }
    for (const p of ex.pickups) { p.g.visible = !p.o.taken; if (p.o.taken) continue; p.g.position.y = 0.85 + Math.sin(now * 2 + p.o.x) * 0.05; p.g.rotation.y = now * 0.8 + p.o.y; p.gl.material.opacity = (0.4 + 0.12 * Math.sin(now * 3 + p.o.y)) * (p.o.pingT > 0 ? 2 : 1); }
    for (const e of ex.crawlers) {
      const c = e.c, al = alpha === undefined ? 1 : alpha, x = (c.px + (c.x - c.px) * al) * TS, z = (c.py + (c.y - c.py) * al) * TS, run = c.moving, lunge = c.cd > 0.85 ? 1 : 0;
      let y = 0, rx = 0; if (c.ceil) { y = WH - 0.45; rx = Math.PI; } else if (c.drop > 0) { const u = 1 - c.drop / 0.5; y = (WH - 0.45) * (1 - u * u); rx = Math.PI * (1 - Math.min(1, u * 1.6)); }
      e.root.position.set(x, y, z); e.root.rotation.set(0, Math.PI / 2 - c.yaw, 0); e.body.rotation.x = rx;
      const sc = 1 + (run ? Math.sin(now * 26 + c.id) * 0.04 : Math.sin(now * 2.5 + c.id) * 0.02) + lunge * 0.25; e.body.scale.setScalar(sc); e.body.position.y = run ? Math.abs(Math.sin(now * 22 + c.id)) * 0.05 : 0; e.body.rotation.y = run ? Math.sin(now * 26 + c.id) * 0.14 : 0;
      e.blob.position.set(x, 0.03, z); e.blob.visible = y < 0.5; const p = w.player, d = Math.hypot(p.x - c.x, p.y - c.y); for (const s of e.eyes) s.material.opacity = d < 14 ? 0.9 : 0;
    }
  };
  return ex;
}
