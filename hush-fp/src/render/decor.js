/* Environment character: per-room tints and lamp colours, landmark props (console, tank, machine, column, cage, cocoon), a stencil/graffiti decal atlas (one texture,
   one draw call), hazard bands, floor stains, lamp reflections on wet floors. Everything is merged into a handful of meshes so phones keep their frame rate. */
import * as THREE from 'three';
import { canvasTexture } from './textures.js';

export const KIND_TINT = {
  storage: [1.08, 0.98, 0.88], office: [0.94, 1.0, 1.06], machine: [1.14, 0.94, 0.78], vault: [0.84, 0.95, 1.1],
  pump: [0.84, 1.05, 1.14], tanks: [0.84, 1.12, 0.96], control: [0.8, 0.95, 1.24], sluice: [0.92, 1.06, 0.96],
  hive: [1.25, 0.78, 0.78], cells: [1.05, 0.98, 0.9], bonepit: [1.08, 0.9, 0.72], nursery: [1.22, 0.78, 1.0],
  reception: [1.05, 1.0, 0.92], lab: [0.9, 1.08, 1.04], security: [0.88, 0.98, 1.14], observation: [1.0, 1.0, 1.1], boiler: [1.18, 0.92, 0.76], filter: [0.86, 1.08, 1.1], tunnel: [1.1, 0.9, 0.78], queen: [1.28, 0.74, 0.9]
};
export const KIND_LAMP = {
  storage: 0xffd49a, office: 0xffeacc, machine: 0xffa347, vault: 0xc4dcff, pump: 0x98e2ff, tanks: 0x9effd0, control: 0x84b4ff, sluice: 0xd0e8ff,
  hive: 0xff4634, cells: 0xffb4a4, bonepit: 0xff6e44, nursery: 0xff4a6a,
  reception: 0xffe8c8, lab: 0xd0ffe8, security: 0x9ac4ff, observation: 0xc8d8ff, boiler: 0xff9038, filter: 0x9ae8ff, tunnel: 0xff6a48, queen: 0xff3a5a
};
const TEXTS = {
  storage: ['SECTOR B-07', 'STORAGE', 'NO ENTRY', 'KEEP QUIET'], office: ['OFFICE', 'STAFF ONLY', 'KEEP QUIET', 'ROOM 12'], machine: ['DANGER', 'HIGH VOLTAGE', 'GENERATOR 2', 'AUTHORISED'],
  vault: ['VAULT', 'AUTHORISED ONLY', 'NO ENTRY'], pump: ['PUMP STATION', 'FLOODING RISK', 'LEVEL -3'], tanks: ['TANK 4', 'BIOHAZARD', 'DRAIN'], control: ['CONTROL', 'DO NOT TOUCH', 'SYSTEM 3'],
  sluice: ['SLUICE 2', 'WET FLOOR', 'CAUTION'], hive: ['', 'IT HEARS', ''], cells: ['CELL 12', 'DO NOT OPEN', 'IT HEARS'], bonepit: ['', 'QUIET', ''], nursery: ['', 'IT HEARS', ''],
  reception: ['RECEPTION', 'VISITORS', 'PLEASE SIGN IN'], lab: ['LAB 3', 'BIOHAZARD', 'SAMPLES'], security: ['SECURITY', 'AUTHORISED', 'CAMERA 07'], observation: ['OBSERVATION', 'DO NOT KNOCK', 'WATCH'], boiler: ['BOILER 2', 'HOT SURFACE', 'DANGER'], filter: ['FILTER BANK', 'CHANGE WEEKLY', 'WET FLOOR'], tunnel: ['', 'IT HEARS', 'CRAWL'], queen: ['', 'LISTEN', 'HUSH']
};
/* atlas: 8 x 4 cells of 128 px */
const CELLS = ['t0', 't1', 't2', 't3', 'hazard', 'arrow', 'hand', 'scratch', 'slime', 'blood', 'paper', 'stain'];
let ATLAS = null;
function atlas(theme) {
  if (ATLAS && ATLAS.theme === theme) return ATLAS; const tex = canvasTexture(1024, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h); const cell = (i) => [(i % 8) * 128, Math.floor(i / 8) * 128];
    const stencil = (i, txt, col, bg) => { const [cx, cy] = cell(i); if (bg) { x.fillStyle = bg; x.fillRect(cx + 4, cy + 30, 120, 68); } x.fillStyle = col; x.font = 'bold ' + (txt.length > 9 ? 17 : 24) + 'px "Barlow Condensed", Arial Narrow, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, cx + 64, cy + 64); };
    const sign = (i, txt) => stencil(i, txt, theme === 'nest' ? '#c0807a' : '#d8c27a', theme === 'nest' ? 'rgba(40,10,10,.55)' : 'rgba(20,20,18,.7)');
    sign(0, 'SECTOR B-07'); sign(1, 'DANGER'); sign(2, 'KEEP QUIET'); sign(3, 'NO ENTRY'); sign(11, '');
    /* hazard */ { const [cx, cy] = cell(4); x.fillStyle = '#d4a017'; x.fillRect(cx, cy + 40, 128, 48); x.fillStyle = '#16161a'; for (let k = -2; k < 8; k++) { x.beginPath(); x.moveTo(cx + k * 24, cy + 88); x.lineTo(cx + k * 24 + 12, cy + 88); x.lineTo(cx + k * 24 + 36, cy + 40); x.lineTo(cx + k * 24 + 24, cy + 40); x.fill(); } }
    /* arrow */ { const [cx, cy] = cell(5); x.fillStyle = '#3ddc84'; x.beginPath(); x.moveTo(cx + 20, cy + 50); x.lineTo(cx + 74, cy + 50); x.lineTo(cx + 74, cy + 30); x.lineTo(cx + 112, cy + 64); x.lineTo(cx + 74, cy + 98); x.lineTo(cx + 74, cy + 78); x.lineTo(cx + 20, cy + 78); x.fill(); }
    /* hand print */ { const [cx, cy] = cell(6); x.fillStyle = 'rgba(120,10,12,.8)'; x.beginPath(); x.ellipse(cx + 64, cy + 76, 24, 28, 0, 0, 6.3); x.fill(); for (let f = 0; f < 5; f++) { x.beginPath(); x.ellipse(cx + 34 + f * 15, cy + 40 - (f === 0 || f === 4 ? -8 : f === 2 ? 6 : 0), 6, 20, (f - 2) * 0.12, 0, 6.3); x.fill(); } for (let d = 0; d < 6; d++) { x.fillRect(cx + 30 + d * 12, cy + 100, 3, 12 + (d * 7) % 14); } }
    /* scratches */ { const [cx, cy] = cell(7); x.strokeStyle = 'rgba(20,12,12,.85)'; x.lineWidth = 3; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(cx + 24 + k * 22, cy + 10); x.bezierCurveTo(cx + 30 + k * 22, cy + 50, cx + 18 + k * 22, cy + 80, cx + 34 + k * 22, cy + 118); x.stroke(); } }
    /* slime */ { const [cx, cy] = cell(8); const g = x.createRadialGradient(cx + 64, cy + 64, 4, cx + 64, cy + 64, 60); g.addColorStop(0, 'rgba(120,20,30,.85)'); g.addColorStop(0.6, 'rgba(70,10,20,.6)'); g.addColorStop(1, 'rgba(70,10,20,0)'); x.fillStyle = g; x.fillRect(cx, cy, 128, 128); }
    /* blood */ { const [cx, cy] = cell(9); const g = x.createRadialGradient(cx + 64, cy + 64, 2, cx + 64, cy + 64, 58); g.addColorStop(0, 'rgba(110,6,8,.9)'); g.addColorStop(0.7, 'rgba(70,4,6,.6)'); g.addColorStop(1, 'rgba(60,4,6,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(cx + 64, cy + 64, 58, 40, 0.4, 0, 6.3); x.fill(); for (let k = 0; k < 9; k++) { x.beginPath(); x.arc(cx + 10 + Math.random() * 108, cy + 10 + Math.random() * 108, 2 + Math.random() * 4, 0, 6.3); x.fill(); } }
    /* paper */ { const [cx, cy] = cell(10); x.fillStyle = '#cfc6a8'; x.fillRect(cx + 34, cy + 24, 60, 80); x.fillStyle = '#3a3428'; for (let k = 0; k < 7; k++) x.fillRect(cx + 40, cy + 34 + k * 9, 20 + Math.random() * 30, 2); }
    /* weathering over everything */ x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(0,0,0,' + (0.1 + Math.random() * 0.5) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); } x.globalCompositeOperation = 'source-over';
  });
  /* text signs per kind are drawn as extra atlas cells (12..31) so each kind has its own wording */
  ATLAS = { theme, tex, uv: (i) => { const cx = (i % 8) / 8, cy = 1 - (Math.floor(i / 8) + 1) / 4; return [cx, cy, 1 / 8, 1 / 4]; } }; return ATLAS;
}
function kindSigns(theme, used) {
  /* one extra canvas for per-kind wording: 4 rows per kind would be big, so draw a small atlas of 12 kinds x 3 lines */
  const kinds = (used && used.length ? used : Object.keys(TEXTS)).filter(k => TEXTS[k]); const tex = canvasTexture(1024, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h); kinds.forEach((k, ki) => { TEXTS[k].forEach((txt, ti) => { if (!txt) return; const cx = (ki % 4) * 256, cy = Math.floor(ki / 4) * 170 + ti * 56; x.fillStyle = theme === 'nest' ? 'rgba(46,10,12,.62)' : 'rgba(18,18,16,.72)'; x.fillRect(cx + 8, cy + 6, 240, 46); x.strokeStyle = theme === 'nest' ? '#9a5a54' : '#b9a45e'; x.lineWidth = 2; x.strokeRect(cx + 10, cy + 8, 236, 42); x.fillStyle = theme === 'nest' ? '#d09088' : '#e0cc84'; x.font = 'bold 30px "Barlow Condensed", Arial Narrow, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, cx + 128, cy + 30); }); });
    x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 1400; i++) { x.fillStyle = 'rgba(0,0,0,' + (0.1 + Math.random() * 0.5) + ')'; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 2); } x.globalCompositeOperation = 'source-over';
  });
  return { tex, kinds, rect: (k, ti) => { const ki = kinds.indexOf(k); return [(ki % 4) * 0.25 + 0.0078, 1 - (Math.floor(ki / 4) * 170 + ti * 56 + 52) / 512, 0.2344, 46 / 512]; } };
}
const hazardTex = () => { const t = canvasTexture(128, 64, (x, w, h) => { x.fillStyle = '#c99a14'; x.fillRect(0, 0, w, h); x.fillStyle = '#17171a'; for (let k = -2; k < 8; k++) { x.beginPath(); x.moveTo(k * 32, h); x.lineTo(k * 32 + 16, h); x.lineTo(k * 32 + 48, 0); x.lineTo(k * 32 + 32, 0); x.fill(); } x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.4 + ')'; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

const box = (w, h, d, x, y, z, ry) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };
const cyl = (r1, r2, h, x, y, z, seg) => { const g = new THREE.CylinderGeometry(r1, r2, h, seg || 12); g.translate(x, y, z); return g; };
const ell = (rx, ry, rz, x, y, z) => { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(rx, ry, rz); g.translate(x, y, z); return g; };
const place = (g, cx, cz, ry) => { if (ry) g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry)); g.translate(cx, 0, cz); return g; };
const merge = (a) => { const m = a.length === 1 ? a[0] : null; return m; };

/* landmark / extra props. M collects geometry lists by material name. WH = ceiling height */
export function extraProp(kind, M, cx, cz, rot, R, WH) {
  const P = (list, g) => M[list].push(place(g, cx, cz, rot));
  switch (kind) {
    case 'console': {
      P('metal', box(1.7, 0.85, 0.7, 0, 0.43, 0)); P('dark', box(1.6, 0.06, 0.62, 0, 0.88, 0)); P('metal', box(1.7, 0.5, 0.12, 0, 1.1, -0.34));
      for (let i = -1; i <= 1; i++) { const sc = box(0.46, 0.34, 0.03, i * 0.52, 1.28, -0.38); sc.rotateX?.call(sc, 0); P('scr', sc); P('dark', box(0.5, 0.38, 0.05, i * 0.52, 1.28, -0.41)); }
      P('dark', box(1.0, 0.03, 0.24, 0, 0.92, 0.12)); for (let i = 0; i < 10; i++) P(i % 3 === 0 ? 'bl1' : 'bl2', box(0.04, 0.025, 0.04, -0.7 + i * 0.12, 0.86, 0.36)); break;
    }
    case 'tank': {
      P('glass', cyl(0.8, 0.8, 2.4, 0, 1.45, 0, 20)); P('liq', cyl(0.7, 0.7, 2.0, 0, 1.35, 0, 18)); P('metal', cyl(0.88, 0.88, 0.16, 0, 0.18, 0, 20)); P('metal', cyl(0.88, 0.88, 0.16, 0, 2.7, 0, 20)); P('metal', cyl(0.12, 0.12, WH - 2.7, 0, 2.7 + (WH - 2.7) / 2, 0, 8));
      for (let k = 0; k < 6; k++) P('metal', box(0.04, 2.4, 0.04, Math.cos(k * 1.05) * 0.86, 1.45, Math.sin(k * 1.05) * 0.86)); for (let r = 0; r < 7; r++) P('metal', box(0.5, 0.03, 0.04, 0.95, 0.3 + r * 0.33, 0)); P('dark', cyl(0.1, 0.1, 0.9, 0.9, 0.3, 0.5, 8)); break;
    }
    case 'machine': {
      P('metal', box(1.7, 1.9, 1.4, 0, 0.95, 0)); P('dark', box(1.5, 0.12, 1.2, 0, 1.96, 0)); P('metal', cyl(0.14, 0.14, WH - 1.9, 0.5, 1.9 + (WH - 1.9) / 2, 0.3, 8)); P('metal', cyl(0.1, 0.1, 1.6, 0.95, 1.1, 0, 8));
      for (let i = 0; i < 6; i++) P(i % 2 ? 'bl1' : 'bl2', box(0.07, 0.07, 0.04, -0.6 + i * 0.22, 1.5, 0.72)); P('dark', cyl(0.38, 0.38, 0.05, -0.4, 0.8, 0.72, 14)); for (let i = 0; i < 5; i++) P('dark', box(1.4, 0.04, 0.03, 0, 0.3 + i * 0.12, 0.72)); break;
    }
    case 'column': { P('metal', cyl(0.46, 0.5, WH, 0, WH / 2, 0, 14)); P('dark', cyl(0.56, 0.56, 0.3, 0, 0.15, 0, 14)); P('hazard', cyl(0.505, 0.505, 0.5, 0, 0.9, 0, 14)); P('dark', cyl(0.56, 0.56, 0.2, 0, WH - 0.1, 0, 14)); break; }
    case 'cage': {
      for (const sx of [-0.8, 0.8]) for (const sz of [-0.8, 0.8]) P('dark', box(0.08, 2.2, 0.08, sx, 1.1, sz)); P('dark', box(1.7, 0.07, 1.7, 0, 2.2, 0)); P('dark', box(1.7, 0.07, 1.7, 0, 0.04, 0));
      for (let i = -3; i <= 3; i++) for (const s of [-0.8, 0.8]) { P('dark', box(0.03, 2.2, 0.03, i * 0.26, 1.1, s)); P('dark', box(0.03, 2.2, 0.03, s, 1.1, i * 0.26)); } P('bone', box(0.4, 0.06, 0.1, 0.1, 0.1, 0.1, 0.6)); P('bone', ell(0.18, 0.15, 0.2, -0.3, 0.16, -0.2)); break;
    }
    case 'cocoon': { P('flesh', cyl(0.12, 0.2, WH - 0.9, 0, 0.9 + (WH - 0.9) / 2, 0, 8)); P('pod', ell(0.62, 1.05, 0.62, 0, 1.15, 0)); P('flesh', cyl(0.95, 1.15, 0.3, 0, 0.15, 0, 12)); for (let k = 0; k < 5; k++) P('flesh', ell(0.14, 0.5, 0.14, Math.cos(k * 1.26) * 0.7, 0.4, Math.sin(k * 1.26) * 0.7)); break; }
  }
}

/* wall decals, floor stains, hazard bands, lamp reflections; returns meshes added + an update() */
export function buildDecor(C) {
  const { world, scene, R, TH, theme, lit, patchPulse, TS, WH, roomAt, wallFaces } = C; const out = { dispose: [], blink: [] };
  const A = atlas(theme), S = kindSigns(theme, [...new Set(world.rooms.map(r => r.kind))]);
  const addQuads = (list, tex, opts) => {
    if (!list.length) return null; const pos = [], nor = [], uv = [], idx = [];
    for (const q of list) { const o = pos.length / 3; for (const v of q.p) pos.push(v[0], v[1], v[2]); for (let k = 0; k < 4; k++) nor.push(q.n[0], q.n[1], q.n[2]); uv.push(...q.u); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    const m = lit(Object.assign({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, opts || {})); patchPulse(m); const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 2; scene.add(mesh); out.dispose.push(m); return mesh;
  };
  /* wall quad on a face: centre (cx,cy,cz) pushed out along normal n, width w along the face tangent t */
  const wallQuad = (f, w, h, y, u) => { const o = 0.012, [nx, nz] = f.n, tx = -nz, tz = nx, cx = f.x + nx * o, cz = f.z + nz * o; const hw = w / 2;
    return { p: [[cx - tx * hw, y - h / 2, cz - tz * hw], [cx + tx * hw, y - h / 2, cz + tz * hw], [cx + tx * hw, y + h / 2, cz + tz * hw], [cx - tx * hw, y + h / 2, cz - tz * hw]], n: [nx, 0, nz], u: [u[0], u[1], u[0] + u[2], u[1], u[0] + u[2], u[1] + u[3], u[0], u[1] + u[3]] }; };
  const signs = [], decals = [], floors = [], bands = [];
  const density = theme === 'nest' ? 0.16 : 0.12;
  for (const f of wallFaces) {
    const room = roomAt(f.tx, f.ty); const kind = room ? room.kind : null; if (R() > density) continue;
    const jitter = (R() - 0.5) * 0.7, face = { x: f.x + (f.n[1] ? jitter : 0), z: f.z + (f.n[0] ? jitter : 0), n: f.n };
    if (kind && TEXTS[kind] && R() < 0.55) { const ti = Math.floor(R() * 3), txt = TEXTS[kind][ti]; if (txt) { signs.push(wallQuad(face, 1.1, 0.23, 1.55 + R() * 0.6, S.rect(kind, ti))); continue; } }
    const r = R(); const cell = theme === 'nest' ? (r < 0.4 ? 7 : r < 0.7 ? 6 : 8) : (r < 0.3 ? 9 : r < 0.5 ? 10 : r < 0.7 ? 7 : 6); const uvr = A.uv(cell); const sz = cell === 10 ? 0.5 : cell === 8 ? 1.1 : 0.9;
    decals.push(wallQuad(face, sz, sz, 0.9 + R() * 0.9, uvr));
  }
  /* hazard band along walls of machine / sluice / vault rooms */
  const hz = hazardTex(); const hzPos = [];
  for (const f of wallFaces) { const room = roomAt(f.tx, f.ty); if (!room || !(room.kind === 'machine' || room.kind === 'sluice' || room.kind === 'vault')) continue; const q = wallQuad(f, TS, 0.22, 0.34, [0, 0, TS / 1.0, 1]); bands.push(q); }
  const mkBand = () => { if (!bands.length) return; const pos = [], nor = [], uv = [], idx = []; for (const q of bands) { const o = pos.length / 3; for (const v of q.p) pos.push(...v); for (let k = 0; k < 4; k++) nor.push(...q.n); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); const m = lit({ map: hz, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); patchPulse(m); const mesh = new THREE.Mesh(g, m); scene.add(mesh); out.dispose.push(m); }; mkBand();
  addQuads(signs, S.tex); addQuads(decals, A.tex);
  /* floor storytelling: stains, papers, hand prints near lockers */
  const fq = (x, z, s, cell, rot) => { const u = A.uv(cell), c = Math.cos(rot), sn = Math.sin(rot), h = s / 2, P = (dx, dz) => [x + dx * c - dz * sn, 0.012, z + dx * sn + dz * c]; return { p: [P(-h, h), P(h, h), P(h, -h), P(-h, -h)], n: [0, 1, 0], u: [u[0], u[1], u[0] + u[2], u[1], u[0] + u[2], u[1] + u[3], u[0], u[1] + u[3]] }; };
  for (const r of world.rooms) { const n = 1 + Math.floor(R() * 3); for (let i = 0; i < n; i++) { const x = (r.x0 + 0.6 + R() * (r.w - 1.2)) * TS, z = (r.y0 + 0.6 + R() * (r.h - 1.2)) * TS; const cell = theme === 'nest' ? (R() < 0.6 ? 8 : 9) : (R() < 0.45 ? 9 : R() < 0.7 ? 10 : 11); floors.push(fq(x, z, cell === 10 ? 0.5 : 1.0 + R() * 0.8, cell, R() * 6.28)); } }
  for (const o of world.objs) if (o.type === 'locker') { const cx = (o.x + 0.5) * TS + Math.cos(o.face) * 0.9, cz = (o.y + 0.5) * TS + Math.sin(o.face) * 0.9; floors.push(fq(cx, cz, 1.1, 9, R() * 6)); }
  addQuads(floors, A.tex);
  /* lamp reflections: soft vertical streaks on wet floors (flooded chapter, pump rooms) */
  const refl = []; const wetKinds = { pump: 1, tanks: 1, sluice: 1, control: 0.4 };
  for (const f of world.lights) { const room = roomAt(Math.floor(f.x), Math.floor(f.y)); const wet = theme === 'flood' ? 1 : room && wetKinds[room.kind] ? wetKinds[room.kind] : 0; if (!wet || f.kind === 'dead') continue; refl.push({ x: f.x * TS, z: f.y * TS, k: wet }); }
  if (refl.length) { const T0 = canvasTexture(64, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); const g2 = x.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, w, h); }); const pos = [], uv = [], idx = [];
    for (const r of refl) { const o = pos.length / 3, w = 0.35, l = 1.7; pos.push(r.x - w, 0.02, r.z + l, r.x + w, 0.02, r.z + l, r.x + w, 0.02, r.z - l, r.x - w, 0.02, r.z - l); uv.push(0, 1, 1, 1, 1, 0, 0, 0); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); const m = new THREE.MeshBasicMaterial({ map: T0, color: TH.lamp, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }); const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 3; scene.add(mesh); out.dispose.push(m); out.refl = m; }
  return out;
}
