/* Interactive objects with real construction: swinging doors on hinges with frames, handles, lock plates and a keypad that shows what you type; lockers (and cabinets) whose door
   opens; breaker panels with an open hinged door and a row of switches that flip; generators with housing, grills, exhaust and a control panel; valves with spoked wheels; the exit door;
   items and terminals. Each returns what the game animates (see View.updateDynamic). Static parts are merged per material. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ctx, newAcc, paint } from './objects3d.js';

const M = (g, mat, x, y, z) => { const m = new THREE.Mesh(g, mat); if (x !== undefined) m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
const bx = (w, h, d, c, wear, seed) => paint(new THREE.BoxGeometry(w, h, d), c, wear === undefined ? 0.6 : wear, seed || 3);
const cy = (r1, r2, h, c, seg, wear) => paint(new THREE.CylinderGeometry(r1, r2, h, seg || 12), c, wear === undefined ? 0.6 : wear, 5);
const flush = (g, acc, mm) => { for (const c of Object.keys(acc)) { if (!acc[c].length) continue; const mat = mm[c]; if (!mat) { acc[c].forEach(x => x.dispose()); acc[c].length = 0; continue; } const m = new THREE.Mesh(mergeGeometries(acc[c]), mat); m.castShadow = c === 'steel' || c === 'wood'; m.receiveShadow = true; g.add(m); acc[c].forEach(x => x.dispose()); acc[c].length = 0; } };
const kp = (E, txt, st) => { const t = E.canvasTexture(128, 48, (x, w, h) => { x.fillStyle = st === 'ok' ? '#06200f' : st === 'bad' ? '#240808' : '#06140c'; x.fillRect(0, 0, w, h); x.fillStyle = st === 'ok' ? '#50ff90' : st === 'bad' ? '#ff5050' : '#3cff80'; x.font = 'bold 30px monospace'; x.textAlign = 'center'; x.fillText(txt, w / 2, 34); }); return t; };

export function buildDynamic(o, E) {
  const { TS, WH, R, group, dyn, mats, glowTex, patchPulse } = E, cx = o.x * TS + TS / 2, cz = o.y * TS + TS / 2;
  const mm = { steel: mats.steel, dark: mats.dark, wood: mats.wood, white: mats.white, cloth: mats.cloth, rust: mats.rust, glass: E.glassMat, liq: E.liqMat, scr: E.scrMat, bl1: E.bl1Mat, bl2: E.bl2Mat, hazard: E.hazMat };
  const acc = newAcc();
  if (o.type === 'door') {
    const alongX = o.dir === 'x', g = new THREE.Group(), piv = new THREE.Group(), span = TS - 0.1, hs = (o.x * 7 + o.y * 13) % 2 ? 1 : -1;
    g.position.set(cx, 0, cz); g.rotation.y = alongX ? Math.PI / 2 : 0;
    const K = ctx(acc, 0, 0, 0, 0.7, o.id * 11), { B, C } = K;                                                    // frame: posts, lintel, threshold, header box, bolts
    for (const s of [-1, 1]) { B('dark', 0.2, 2.8, 0.34, s * (TS / 2 - 0.1), 1.4, 0, 0x2f3338); B('steel', 0.04, 2.7, 0.38, s * (TS / 2 - 0.2), 1.35, 0, 0x4a5258); for (let i = 0; i < 4; i++) C('steel', 0.025, 0.025, 0.04, s * (TS / 2 - 0.1), 0.4 + i * 0.7, 0.18, 0x7a8087, 6, 'z'); }
    B('dark', TS, WH - 2.8, 0.34, 0, 2.8 + (WH - 2.8) / 2, 0, 0x2f3338); B('steel', TS - 0.2, 0.06, 0.3, 0, 2.77, 0, 0x4a5258); B('dark', span, 0.04, 0.3, 0, 0.02, 0, 0x2a2c30);
    flush(g, acc, mm);
    const slabM = mats.steel.clone(); patchPulse(slabM); slabM.emissive = new THREE.Color(0x000000); slabM.emissiveIntensity = 1; E.dis.push(slabM);
    const kk = ctx(acc, 0, 0, 0, 0.8, o.id * 17), P = kk;                                                         // door leaf (local x from the hinge)
    const lw = span - 0.04, c0 = o.lock ? 0xb4b8b6 : pk3(R, [0x9a9d98, 0x8c9490, 0xa89f8a]);
    P.B('steel', lw, 2.7, 0.1, hs * 0.0 + lw / 2 * hs, 1.35, 0, c0); P.B('steel', 0.08, 2.5, 0.13, lw * 0.18 * hs, 1.35, 0, mix2(c0)); P.B('steel', 0.08, 2.5, 0.13, lw * 0.86 * hs, 1.35, 0, mix2(c0));
    P.B('dark', lw - 0.1, 0.3, 0.14, lw / 2 * hs, 0.17, 0, 0x4a5258);
    if (!o.lock) { P.B('dark', 0.5, 0.3, 0.14, lw * 0.55 * hs, 1.9, 0, 0x16181b); P.B('glass', 0.42, 0.22, 0.02, lw * 0.55 * hs, 1.9, 0.07, 0x90b0b8); }
    P.C('dark', 0.025, 0.025, 0.5, lw * 0.9 * hs, 1.05, 0.12, 0x16181b, 8, 'x'); P.B('dark', 0.05, 0.05, 0.1, lw * 0.9 * hs, 1.05, 0.07, 0x16181b);
    for (const y of [0.4, 1.35, 2.3]) { P.C('steel', 0.04, 0.04, 0.2, 0.0, y, 0.0, 0x30343a, 10); P.C('dark', 0.05, 0.05, 0.03, 0.0, y + 0.1, 0.0, 0x16181b, 10); }
    if (o.lock) { P.B('dark', 0.26, 0.4, 0.04, lw * 0.82 * hs, 1.45, 0.08, 0x1d2024); P.B('steel', 0.7, 0.04, 0.16, lw / 2 * hs, 2.1, 0, 0xc99a14, 0, 0, 0); P.B('hazard', lw - 0.3, 0.12, 0.02, lw / 2 * hs, 2.25, 0.07, 0xc99a14); }
    else P.B('hazard', lw - 0.5, 0.06, 0.02, lw / 2 * hs, 0.6, 0.07, 0xd8d0b8);
    flush(piv, acc, Object.assign({}, mm, { steel: slabM }));
    if (o.lock) { const bandM = new THREE.MeshBasicMaterial({ color: E.lockCol[o.lock] || 0xffffff }); const band = new THREE.Mesh(new THREE.BoxGeometry(lw * 0.8, 0.1, 0.12), bandM); band.position.set(lw / 2 * hs, 0.95, 0); piv.add(band); E.dis.push(bandM); }
    const lightM = new THREE.MeshBasicMaterial({ color: 0xff2020 }); const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.08), lightM); lamp.position.set(hs * (TS / 2 - 0.1) * -1, 2.65, 0.19); g.add(lamp); E.dis.push(lightM);
    piv.position.set(-hs * (TS / 2 - 0.05), 0, 0); g.add(piv);
    let pad = null;
    if (o.lock === 'code') {
      pad = new THREE.Group(); pad.add(M(bx(0.26, 0.42, 0.07, 0x23272b, 0.3), mats.dark)); pad.add(M(bx(0.3, 0.46, 0.03, 0x4a5258, 0.3), mats.steel, 0, 0, -0.03));
      const dispM = new THREE.MeshBasicMaterial({ map: kp(E, '----') }), disp = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), dispM); disp.position.set(0, 0.14, 0.04); pad.add(disp);
      for (let i = 0; i < 12; i++) { const b = M(bx(0.05, 0.035, 0.025, 0x5d6368, 0.2), mats.dark, -0.07 + (i % 3) * 0.07, 0.04 - Math.floor(i / 3) * 0.065, 0.045); pad.add(b); }
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.01), new THREE.MeshBasicMaterial({ color: 0xff2020 })); led.position.set(0.1, 0.19, 0.04); pad.add(led);
      pad.position.set(hs * (TS / 2 + 0.0), 1.35, 0.26); pad.userData = { disp: dispM, last: '----', led }; g.add(pad); E.dis.push(dispM);
    }
    group.add(g);
    let wallSlab = null; if (o.hidden) { wallSlab = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 0.3 : TS, WH, alongX ? TS : 0.3), E.wallMat); wallSlab.position.set(cx, WH / 2, cz); group.add(wallSlab); g.visible = false; }
    dyn.doors.push({ o, g, slab: piv, slabM, lightM, wallSlab, pad, swing: (open) => { piv.rotation.y = hs * open * 1.5; }, kp: (txt, st) => { if (pad) { const u = pad.userData; if (u.last !== txt + st) { u.last = txt + st; u.disp.map.dispose(); u.disp.map = kp(E, txt, st); u.disp.needsUpdate = true; } } } });
    return true;
  }
  if (o.type === 'locker') {
    const dx = Math.cos(o.face), dz = Math.sin(o.face), v = o.variant || 'locker', g = new THREE.Group(), K = ctx(acc, 0, 0, 0, 0.8, o.id * 5), { B, C } = K;
    const tone = v === 'cabinet' ? pk3(R, [0x8a6a46, 0x75573a, 0x6a5a48]) : pk3(R, [0x3d4a45, 0x4a5560, 0x56604f, 0x5a4f46]), cat = v === 'cabinet' ? 'wood' : 'steel', w = v === 'cabinet' ? 1.15 : 0.9, h = v === 'cabinet' ? 1.55 : 2.0, d = 0.62;
    let door = null;
    if (v === 'alcove') {                                                       // a dark recess behind an open shelf frame
      B('dark', 0.95, 2.05, 0.5, 0, 1.03, -0.05, 0x060708); for (const sx of [-0.47, 0.47]) B('steel', 0.06, 2.1, 0.06, sx, 1.05, 0.34, 0x30343a); for (const yy of [0.12, 0.7, 1.3, 1.9]) B('steel', 1.0, 0.04, 0.5, 0, yy, 0.12, 0x30343a);
      B('wood', 0.34, 0.26, 0.3, -0.28, 0.85, 0.12, 0x6b4a2e); B('cloth', 0.4, 0.04, 0.3, 0.2, 1.34, 0.12, 0x4a4a3a); B('steel', 0.9, 0.04, 0.04, 0, 2.07, 0.36, 0x30343a);
    } else {
      B(cat, w, h, d, 0, h / 2 + 0.06, 0, mixc(tone, 0)); B('dark', w - 0.08, h - 0.1, 0.02, 0, h / 2 + 0.06, d / 2 - 0.02, 0x0b0d0e); B('dark', w + 0.04, 0.06, d + 0.04, 0, 0.03, 0, 0x1b1d20); B(cat, w + 0.03, 0.04, d + 0.03, 0, h + 0.08, 0, mixc(tone, 1));
      for (const s of [-1, 1]) B(cat, 0.04, h, 0.04, s * (w / 2 - 0.02), h / 2 + 0.06, d / 2, mixc(tone, 1)); B(cat, w, 0.05, 0.04, 0, h - 0.05, d / 2, mixc(tone, 1));
      flush(g, acc, mm);
      const dm = ctx(acc, 0, 0, 0, 0.9, o.id * 9), D = dm; const dw = w - 0.06, dh = h - 0.1;
      D.B(cat, dw, dh, 0.035, dw / 2, dh / 2, 0, mixc(tone, 0.04)); for (let i = 0; i < (v === 'cabinet' ? 0 : 8); i++) D.B('dark', dw * 0.6, 0.018, 0.04, dw / 2, h - 0.34 - i * 0.045, 0.01, 0x0b0d0e);
      if (v !== 'cabinet') for (let i = 0; i < 5; i++) D.B('dark', dw * 0.6, 0.018, 0.04, dw / 2, 0.38 - i * 0.045, 0.01, 0x0b0d0e); else { D.B(cat, dw - 0.2, dh - 0.2, 0.03, dw / 2, dh / 2, 0.02, mixc(tone, 0.12)); }
      D.B('dark', 0.05, 0.16, 0.05, dw - 0.1, h * 0.5, 0.05, 0x16181b); D.B('white', 0.12, 0.06, 0.012, dw / 2, h - 0.2, 0.025, 0xd0ccb8); for (const y of [0.25, h * 0.5, h - 0.2]) D.C('dark', 0.018, 0.018, 0.08, 0.0, y, 0.0, 0x16181b, 8);
      door = new THREE.Group(); flush(door, acc, mm); door.position.set(-dw / 2, 0.11, d / 2 + 0.02); g.add(door);
    }
    flush(g, acc, mm);
    g.position.set(cx - dx * (TS / 2 - 0.37), 0, cz - dz * (TS / 2 - 0.37)); g.rotation.y = Math.PI / 2 - o.face; group.add(g);
    dyn.valves.push({ o, g, kind: 'locker', door, mat: mats.steel }); return true;
  }
  if (o.type === 'vent') {
    const dx = Math.cos(o.face), dz = Math.sin(o.face), g = new THREE.Group(), K = ctx(acc, 0, 0, 0, 0.8, o.id * 3), { B, C } = K;
    B('dark', 1.0, 0.8, 0.06, 0, 0, 0, 0x070809); B('steel', 1.14, 0.06, 0.06, 0, 0.43, 0.02, 0x59636c); B('steel', 1.14, 0.06, 0.06, 0, -0.43, 0.02, 0x59636c); for (const s of [-1, 1]) B('steel', 0.06, 0.92, 0.06, s * 0.54, 0, 0.02, 0x59636c);
    for (let i = 0; i < 7; i++) B('steel', 0.98, 0.03, 0.08, 0, -0.33 + i * 0.11, 0.04, 0x6f757b, -0.5); for (const sx of [-0.54, 0.54]) for (const sy of [-0.43, 0.43]) C('dark', 0.022, 0.022, 0.03, sx, sy, 0.06, 0x16181b, 6, 'z');
    B('rust', 0.5, 0.012, 0.08, 0.2, -0.1, 0.05, 0x5a3a24); flush(g, acc, mm);
    g.position.set(cx - dx * (TS / 2 - 0.03), 0.55, cz - dz * (TS / 2 - 0.03)); g.rotation.y = Math.PI / 2 - o.face; group.add(g); dyn.valves.push({ o, g, kind: 'vent', mat: mats.dark }); return true;
  }
  if (o.type === 'generator') {
    const g = new THREE.Group(), K = ctx(acc, 0, 0, 0, 0.8, o.id * 7), { B, C } = K;
    B('steel', 1.9, 0.1, 1.15, 0, 0.12, 0, 0x2a2e30); for (const sx of [-0.8, 0.8]) for (const sz of [-0.5, 0.5]) { B('dark', 0.14, 0.1, 0.14, sx, 0.05, sz, 0x16181b); B('steel', 0.06, 0.55, 0.06, sx, 0.4, sz, 0x4a5258); }
    B('steel', 1.5, 0.8, 0.9, -0.1, 0.62, 0, 0x6a5e3a); for (let i = 0; i < 9; i++) B('steel', 1.46, 0.02, 0.94, -0.1, 0.35 + i * 0.07, 0, 0x5a4e30); B('steel', 1.54, 0.05, 0.94, -0.1, 1.04, 0, 0x4f4630);
    C('steel', 0.34, 0.34, 1.2, 0.0, 1.38, 0.0, 0x5a5a4e, 16, 'x'); for (let i = 0; i < 4; i++) C('steel', 0.355, 0.355, 0.04, -0.45 + i * 0.3, 1.38, 0, 0x3a3a34, 16, 'x'); B('dark', 0.5, 0.28, 0.5, 0.65, 1.1, 0, 0x1d2024);
    B('dark', 0.34, 0.55, 0.8, 0.82, 0.6, 0, 0x16181b); for (let i = 0; i < 6; i++) B('dark', 0.02, 0.45, 0.02, 1.0, 0.6, -0.33 + i * 0.13, 0x08080a);
    C('steel', 0.09, 0.09, 0.9, -0.7, 1.5, 0.35, 0x3a3a34, 10); C('steel', 0.14, 0.14, 0.4, -0.7, 1.2, 0.35, 0x45453c, 12); C('dark', 0.1, 0.12, 0.08, -0.7, 2.0, 0.35, 0x16181b, 10);
    B('steel', 0.6, 0.42, 0.06, -0.3, 0.75, 0.5, 0x2f3438); for (let i = 0; i < 3; i++) C('white', 0.05, 0.05, 0.02, -0.46 + i * 0.16, 0.85, 0.54, 0xd8d8cc, 12, 'z'); for (let i = 0; i < 4; i++) B('dark', 0.05, 0.035, 0.02, -0.5 + i * 0.1, 0.65, 0.54, i % 2 ? 0x9a2a22 : 0x2a6a3a);
    C('dark', 0.025, 0.025, 1.3, 0.2, 0.2, 0.62, 0x0b0b0d, 6, 'x'); C('dark', 0.045, 0.045, 0.2, 0.9, 0.25, 0.62, 0x16181b, 8); B('hazard', 0.6, 0.12, 0.01, 0.0, 0.5, 0.46, 0xc99a14);
    flush(g, acc, mm);
    const il = new THREE.MeshBasicMaterial({ color: 0xff2200 }); const ind = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.04), il); ind.position.set(-0.05, 0.9, 0.54); g.add(ind); E.dis.push(il);
    const fan = new THREE.Group(); for (let i = 0; i < 6; i++) { const bl = M(bx(0.26, 0.05, 0.012, 0x2a2e30, 0.2), mats.dark); bl.position.set(Math.cos(i * 1.047) * 0.13, Math.sin(i * 1.047) * 0.13, 0); bl.rotation.z = i * 1.047 + 0.3; fan.add(bl); } fan.add(M(cy(0.04, 0.04, 0.05, 0x16181b, 8), mats.dark)); fan.position.set(1.0, 0.62, 0.0); fan.rotation.y = Math.PI / 2; g.add(fan);
    g.position.set(cx, 0, cz); g.rotation.y = R() < 0.5 ? 0 : Math.PI / 2; group.add(g); dyn.gens.push({ o, g, il, fan }); return true;
  }
  if (o.type === 'breaker') {
    const g = new THREE.Group(), K = ctx(acc, 0, 0, 0, 0.8, o.id * 13), { B, C } = K;
    B('steel', 0.9, 1.4, 0.3, 0, 1.15, 0, 0x4f5a52); B('dark', 0.78, 1.28, 0.04, 0, 1.15, 0.13, 0x16181b); B('steel', 0.86, 0.04, 0.34, 0, 1.87, 0, 0x3a4440); B('hazard', 0.5, 0.1, 0.01, 0, 1.78, 0.16, 0xc99a14); B('white', 0.3, 0.12, 0.005, -0.2, 0.62, 0.16, 0xd8d4c0);
    for (let i = 0; i < 3; i++) { B('dark', 0.64, 0.05, 0.04, 0, 0.9 + i * 0.28, 0.15, 0x30363a); C('dark', 0.012, 0.012, 0.24, -0.26 + i * 0.26, 1.26 + (i % 2) * 0.08, 0.11, 0x0b0b0d, 6); }
    C('dark', 0.03, 0.03, 0.5, 0.2, 2.15, 0.0, 0x16181b, 8); B('steel', 0.2, 0.1, 0.1, 0.2, 1.93, 0.0, 0x3a4440);
    for (const y of [0.55, 1.1, 1.65]) C('steel', 0.025, 0.025, 0.1, -0.44, y, 0.16, 0x7a8087, 8, 'z');
    B('steel', 0.8, 1.2, 0.03, -0.85, 1.12, 0.45, 0x5a655c, 0, 1.45, 0);                                           // the panel door, swung open on its hinges
    B('dark', 0.1, 0.04, 0.04, -0.58, 1.12, 0.78, 0x16181b);
    flush(g, acc, mm);
    const led = new THREE.MeshBasicMaterial({ color: 0xff2a1a }), levers = []; E.dis.push(led);
    for (let i = 0; i < 8; i++) { const col = i % 4, row = Math.floor(i / 4), hb = M(bx(0.1, 0.16, 0.06, 0x23272b, 0.2), mats.dark, -0.27 + col * 0.18, 1.5 - row * 0.3 - 0.12, 0.16); g.add(hb); const lv = new THREE.Mesh(bx(0.045, 0.1, 0.045, i === 0 ? 0xc02a22 : 0xd8d4c0, 0.1), mats.dark); lv.geometry.translate(0, 0.05, 0); lv.position.set(-0.27 + col * 0.18, 1.5 - row * 0.3 - 0.12, 0.2); lv.rotation.x = -0.9; g.add(lv); levers.push(lv); }
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.04), led); lamp.position.set(0.28, 1.75, 0.16); g.add(lamp);
    const glb = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff9a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.45 })); glb.scale.set(1.5, 1.5, 1); glb.position.set(0, 1.4, 0.4); g.add(glb);
    g.position.set(cx, 0, cz); g.rotation.y = Math.floor(R() * 4) * Math.PI / 2; group.add(g); dyn.valves.push({ o, g, kind: 'breaker', led, levers, glow: glb }); return true;
  }
  if (o.type === 'valve') {
    const g = new THREE.Group(), K = ctx(acc, 0, 0, 0, 0.8, o.id * 19), { B, C, S } = K;
    B('steel', 0.7, 0.1, 0.7, 0, 0.05, 0, 0x2a2e30); C('steel', 0.14, 0.14, 1.8, 0, 0.55, 0, 0x4a5a62, 14, 'x'); for (const s of [-1, 1]) { C('steel', 0.22, 0.22, 0.06, s * 0.55, 0.55, 0, 0x30363a, 14, 'x'); C('steel', 0.22, 0.22, 0.06, s * 0.9, 0.55, 0, 0x30363a, 14, 'x'); for (let i = 0; i < 6; i++) B('dark', 0.05, 0.03, 0.03, s * 0.58, 0.55 + Math.sin(i * 1.05) * 0.2, Math.cos(i * 1.05) * 0.2, 0x16181b); }
    S('steel', 0.3, 0.28, 0.3, 0, 0.7, 0, 0x4f5f66); C('steel', 0.08, 0.08, 0.75, 0, 1.15, 0, 0x7a8087, 10); C('steel', 0.18, 0.18, 0.08, 0, 0.9, 0, 0x30363a, 12); B('steel', 0.04, 0.5, 0.04, 0.35, 0.95, 0, 0x4a5258, 0, 0, 0.0);
    C('white', 0.07, 0.07, 0.03, 0.3, 0.98, 0.22, 0xdcdcd0, 14, 'z'); B('bl1', 0.01, 0.05, 0.01, 0.3, 0.98, 0.24, 0xa02020, 0, 0, 0.5); B('hazard', 0.4, 0.1, 0.01, -0.5, 0.75, 0.2, 0xc99a14);
    flush(g, acc, mm);
    const wm = E.lit({ color: 0xb02a1e, roughness: 0.4, metalness: 0.6 }); patchPulse(wm); E.dis.push(wm); const tilt = new THREE.Group(), wheel = new THREE.Group();
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 22), wm)); wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 10).rotateX(Math.PI / 2), wm)); for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.028, 0.028), wm); sp.rotation.z = i * Math.PI / 3; wheel.add(sp); }
    tilt.rotation.x = Math.PI / 2; tilt.position.set(0, 1.55, 0); tilt.add(wheel); g.add(tilt);
    g.position.set(cx, 0, cz); g.rotation.y = (o.id % 4) * Math.PI / 2; group.add(g); dyn.valves.push({ o, g, kind: 'valve', wheel }); return true;
  }
  return false;
}
const pk3 = (R, a) => a[Math.floor(R() * a.length)];
const mix2 = (c) => ((c >> 1) & 0x7f7f7f);
const mixc = (c, k) => (k ? ((c >> 1) & 0x7f7f7f) + 0x181818 : c);
