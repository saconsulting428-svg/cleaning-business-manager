/* KAI — hero fighter definition + custom 3D parts (open leather jacket with gold dragon embroidery, torn red sash strips,
   armoured fingerless gloves, bracers, knee guards, combat boots, belt buckle, chain). Original design inspired by the supplied concept sheet. */
import * as THREE from 'three';

const V3 = THREE.Vector3, TAU = Math.PI * 2;
const GOLD = '#d9b25a';

export const KAI = {
  id: 'kai', name: 'KAI', title: 'DRAGON JACKET', style: 'Mixed Martial Arts', age: 25, height_cm: 183, weight_kg: 78, country: 'Unknown',
  skin: '#c4936a', eye: '#3a2412', height: 1.0, bulk: 1.04, shoulders: 1.05, arms: 1.06, legs: 1.02,
  face: { jaw: .6, hollow: 1, scar: true, real: true },
  hair: { style: 'messy', color: '#09080a' },
  top: { type: 'tank', color: '#0d0d11' }, pants: { type: 'long', color: '#111014', fabric: 'leather' }, belt: '#0c0a0b',
  gloves: { color: '#0d0c0e' }, shoes: { type: 'boot', color: '#0a090b', sole: '#1c1114' },
  aura: '#ffb02a', color: '#ff3b2f',
  stats: { speed: 1.06, power: 1.05, reach: 1.0, hp: 100, defense: 1.0, quick: 1.0 },
  specials: { df_hp: 'dragonPalm', df_hk: 'risingKick' },
  ai: { aggr: 1.1, block: 1.0, combo: 1.0 },
  custom: (rig, X) => kaiCustom(rig, X)
};

/* ---------- procedural leather + gold dragon embroidery ---------- */
let CACHE = null;
function dragonPath(g, s, bump) {
  const gold = bump ? '#ffffff' : (() => { const gr = g.createLinearGradient(-120, -180, 120, 180); gr.addColorStop(0, '#f6e19a'); gr.addColorStop(.5, GOLD); gr.addColorStop(1, '#8e6420'); return gr; })();
  g.save(); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = gold; g.fillStyle = bump ? '#bbbbbb' : 'rgba(40,24,6,.85)';
  const pt = t => [70 * Math.sin(t * TAU * 1.4 + .4) * (1 - .35 * t), -190 + 380 * t];
  for (let i = 0; i <= 70; i++) { const t = i / 70, [x, y] = pt(t), r = 22 * (1 - t * .78) + 3; g.lineWidth = bump ? 3 : 2.6; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    if (i % 2 === 0) { g.beginPath(); g.arc(x, y, r * .62, Math.PI * .1, Math.PI * .9); g.stroke(); } if (i % 5 === 0 && t > .05) { g.beginPath(); g.moveTo(x - r, y); g.lineTo(x - r - 14 * (1 - t), y - 10); g.stroke(); } }
  g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 70; i++) { const [x, y] = pt(i / 70); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  const [hx, hy] = pt(0); g.translate(hx, hy); g.lineWidth = 4; g.beginPath(); g.moveTo(-30, 10); g.quadraticCurveTo(0, -40, 36, -6); g.lineTo(52, 8); g.lineTo(26, 20); g.quadraticCurveTo(0, 34, -30, 10); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-14, -22); g.quadraticCurveTo(-34, -60, -62, -52); g.moveTo(8, -26); g.quadraticCurveTo(0, -70, -22, -84); g.stroke();
  g.beginPath(); g.moveTo(40, 4); g.bezierCurveTo(80, -20, 100, 30, 70, 50); g.moveTo(34, 14); g.bezierCurveTo(70, 40, 60, 70, 36, 60); g.stroke();
  g.fillStyle = bump ? '#fff' : '#ff3b2f'; g.beginPath(); g.arc(12, -6, 5, 0, TAU); g.fill(); g.restore();
}
function jacketTextures() {
  if (CACHE) return CACHE; const W = 1024, H = 1024, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const a = mk(), b = mk(), g = a.getContext('2d'), gb = b.getContext('2d'); g.fillStyle = '#0b0a0c'; g.fillRect(0, 0, W, H); gb.fillStyle = '#7a7a7a'; gb.fillRect(0, 0, W, H);
  let seed = 5; const rn = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 1500; i++) { const x = rn() * W, y = rn() * H, l = 10 + rn() * 50, an = rn() * 3; const dark = rn() < .5; g.strokeStyle = dark ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.07)'; g.lineWidth = 1 + rn() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke(); gb.strokeStyle = dark ? 'rgba(0,0,0,.4)' : 'rgba(255,255,255,.25)'; gb.lineWidth = 1 + rn() * 2; gb.beginPath(); gb.moveTo(x, y); gb.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); gb.stroke(); }
  for (let y = 120; y < H; y += 160) { const gr = g.createLinearGradient(0, y, 0, y + 40); gr.addColorStop(0, 'rgba(255,255,255,.06)'); gr.addColorStop(1, 'transparent'); g.fillStyle = gr; g.fillRect(0, y, W, 40); }
  for (const [c, gx] of [[g, g], [gb, gb]]) { const bump = c === gb;
    c.save(); c.translate(W / 2, 470); dragonPath(c, 2.1, bump); c.restore();                      // back dragon
    for (const x of [W * .27, W * .73]) { c.save(); c.strokeStyle = bump ? '#fff' : GOLD; c.lineWidth = 3; c.translate(x, 110); for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(0, 0, 14 + k * 12, Math.PI * .1 + k * .3, Math.PI * 1.1 + k * .2); c.stroke(); } c.restore(); } // shoulder scrollwork
    c.strokeStyle = bump ? '#fff' : GOLD; c.lineWidth = 5; for (const x of [6, W - 6]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }          // lapel edge trim
    c.strokeStyle = bump ? '#ddd' : '#a3121a'; c.lineWidth = 9; c.beginPath(); c.moveTo(0, H - 28); c.lineTo(W, H - 28); c.stroke();                           // red hem piping
    c.strokeStyle = bump ? '#fff' : GOLD; c.lineWidth = 3; c.beginPath(); c.moveTo(0, H - 46); c.lineTo(W, H - 46); c.stroke();
  }
  const mt = new THREE.CanvasTexture(a); mt.colorSpace = THREE.SRGBColorSpace; mt.anisotropy = 8; const bt = new THREE.CanvasTexture(b); bt.anisotropy = 8;
  // red torn sash texture
  const r = document.createElement('canvas'); r.width = 128; r.height = 256; const rg = r.getContext('2d'); rg.fillStyle = '#9a1017'; rg.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 60; i++) { const x = rn() * 128, y = rn() * 256, rr = 6 + rn() * 26, gr = rg.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, rn() < .5 ? 'rgba(20,0,0,.5)' : 'rgba(255,60,60,.18)'); gr.addColorStop(1, 'transparent'); rg.fillStyle = gr; rg.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  rg.strokeStyle = 'rgba(0,0,0,.25)'; rg.lineWidth = 1; for (let x = 0; x < 128; x += 4) { rg.beginPath(); rg.moveTo(x, 0); rg.lineTo(x + rn() * 3, 256); rg.stroke(); }
  const rt = new THREE.CanvasTexture(r); rt.colorSpace = THREE.SRGBColorSpace;
  return CACHE = { map: mt, bump: bt, sash: rt };
}
function jacketGeo(L, b, gap) {
  const T = L.spine, prof = [[-.2, .172], [-.1, .17], [0, .164], [.1, .16], [.3, .14], [.5, .162], [.68, .186], [.82, .202], [.92, .182], [.97, .11], [1, .07]];
  const pts = prof.map(([t, r]) => new THREE.Vector2(r * b * 1.08, t * T));
  const g = new THREE.LatheGeometry(pts, 56, Math.PI + gap / 2, TAU - gap); g.rotateY(-Math.PI / 2); return g;
}

function kaiCustom(rig, X) {
  const { shadow, clothMat, metalMat, tubeGeo } = X, L = rig.L, b = rig.spec.bulk, sc = rig.sc, tex = jacketTextures();
  const leather = new THREE.MeshPhysicalMaterial({ map: tex.map, bumpMap: tex.bump, bumpScale: 2.4, roughness: .36, metalness: .05, clearcoat: .6, clearcoatRoughness: .28, side: THREE.DoubleSide, envMapIntensity: .55 });
  const gold = metalMat(GOLD, .28), darkMetal = metalMat('#17171c', .35), red = new THREE.MeshStandardMaterial({ color: '#a5121a', roughness: .45, metalness: .35 });
  const boot = clothMat('#0a090b', 'leather'), redLeather = clothMat('#8f1017', 'leather');
  const addT = m => { rig.torso.add(m); return m; }, addB = m => { rig.body.add(m); return m; };
  // --- open jacket body, collar, shoulders
  const jm = shadow(new THREE.Mesh(jacketGeo(L, b, 1.15), leather)); jm.scale.set(1, 1, .68); addT(jm);
  for (const s of [-1, 1]) { const c = shadow(new THREE.Mesh(new THREE.BoxGeometry(.012, .11, .1), leather)); c.position.set(.015, L.spine * .99 + .045, s * .085 * b); c.rotation.set(s * .5, 0, -.12); addT(c);
    const t = shadow(new THREE.Mesh(new THREE.BoxGeometry(.014, .012, .102), gold)); t.position.set(.0, L.spine * .99 + .098, s * .1 * b); t.rotation.set(s * .5, 0, -.12); addT(t); }
  const back = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.088 * b, .096 * b, .09, 20, 1, true, Math.PI * .6, Math.PI * 1.4), leather)); back.position.set(-.012, L.spine * .99 + .035, 0); back.scale.z = .8; addT(back);
  rig.shMesh.forEach(m => { m.material = leather; m.scale.setScalar(1.2); });
  // --- belt buckle, chain
  const buckle = shadow(new THREE.Mesh(new THREE.BoxGeometry(.03, .062, .078), gold)); buckle.position.set(.165 * b, .012, 0); addT(buckle);
  const inset = shadow(new THREE.Mesh(new THREE.BoxGeometry(.034, .034, .05), red)); inset.position.set(.172 * b, .012, 0); addT(inset);
  const chain = new THREE.Mesh(new THREE.TorusGeometry(.082, .0045, 6, 40), gold); chain.position.set(.085, L.spine * .88, 0); chain.rotation.set(0, Math.PI / 2, -.5); chain.scale.set(1, 1.15, 1); addT(chain);
  const pend = shadow(new THREE.Mesh(new THREE.BoxGeometry(.01, .026, .018), gold)); pend.position.set(.15, L.spine * .66, 0); addT(pend);
  // --- sleeves (rolled), cuffs, bracers
  const sl = [0, 1].map(i => {
    const sU = shadow(new THREE.Mesh(tubeGeo(.074 * b, .066 * b, .1, .3), leather)), sF = shadow(new THREE.Mesh(tubeGeo(.056 * b, .052 * b, .05, .3), leather));
    const cuff = shadow(new THREE.Mesh(new THREE.TorusGeometry(.054 * b, .011, 8, 22).rotateX(Math.PI / 2), redLeather));
    const brc = shadow(new THREE.Mesh(tubeGeo(.049 * b, .046 * b, .06, .4), darkMetal)), brcR = shadow(new THREE.Mesh(new THREE.TorusGeometry(.049 * b, .007, 6, 18).rotateX(Math.PI / 2), red)), brcG = shadow(new THREE.Mesh(new THREE.TorusGeometry(.0495 * b, .0045, 6, 18).rotateX(Math.PI / 2), gold));
    [sU, sF, cuff, brc, brcR, brcG].forEach(addB); return { sU, sF, cuff, brc, brcR, brcG };
  });
  // --- gloves: red armoured knuckle plates, studs, cuffs
  rig.fist.forEach(f => {
    const plate = shadow(new THREE.Mesh(new THREE.BoxGeometry(.05, .016, .092), red)); plate.position.set(.012, .04, 0); plate.rotation.z = -.15; f.add(plate);
    for (let k = 0; k < 4; k++) { const st = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .012, 8), gold)); st.position.set(.044, .046, (k - 1.5) * .022); f.add(st); }
    const cu = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.052, .05, .05, 16).rotateZ(Math.PI / 2), clothMat('#0d0c0e', 'leather'))); cu.position.set(-.055, 0, 0); f.add(cu);
    const sr = shadow(new THREE.Mesh(new THREE.TorusGeometry(.053, .007, 6, 18).rotateY(Math.PI / 2), red)); sr.position.set(-.052, 0, 0); f.add(sr);
    for (let k = 0; k < 4; k++) { const fg = shadow(new THREE.Mesh(new THREE.CapsuleGeometry(.0105, .03, 4, 8), clothMat('#0d0c0e', 'leather'))); fg.rotation.x = Math.PI / 2; fg.position.set(.04, -.012, (k - 1.5) * .0215); f.add(fg); }
  });
  // --- legs: knee guards, thigh straps, taller boots
  const leg = [0, 1].map(i => {
    const kn = shadow(new THREE.Mesh(new THREE.SphereGeometry(.052 * b, 16, 12), darkMetal)); kn.scale.set(.55, 1.1, 1); const ke = shadow(new THREE.Mesh(new THREE.TorusGeometry(.04 * b, .005, 6, 20).rotateY(Math.PI / 2), gold)); ke.scale.set(1, 1.15, 1.2);
    const ts = shadow(new THREE.Mesh(new THREE.TorusGeometry(.066 * b, .01, 8, 22).rotateX(Math.PI / 2), redLeather));
    const sh = shadow(new THREE.Mesh(tubeGeo(.066, .07, .02, .5), boot)), bt = shadow(new THREE.Mesh(new THREE.TorusGeometry(.069, .008, 6, 18).rotateX(Math.PI / 2), red)), bk1 = shadow(new THREE.Mesh(new THREE.TorusGeometry(.0665, .004, 6, 18).rotateX(Math.PI / 2), metalMat('#bbb', .3))), bk2 = bk1.clone();
    [kn, ke, ts, sh, bt, bk1, bk2].forEach(addB);
    const toe = shadow(new THREE.Mesh(new THREE.SphereGeometry(.045, 14, 10), red)); toe.scale.set(.7, .45, 1.05); toe.position.set(.17 * sc, -.045 * sc, 0); rig.foot[i].add(toe);
    return { kn, ke, ts, sh, bt, bk1, bk2 };
  });
  // --- torn red sash strips (cloth simulation: spring-lagged direction + vertex flutter)
  const strips = [[-.3, .62, .12], [.32, .66, .12], [-1.35, .78, .1], [1.3, .6, .1], [-2.55, .72, .13], [2.7, .56, .1], [Math.PI, .8, .16]].map(([a, len, w], idx) => {
    const geo = new THREE.PlaneGeometry(w, len, 4, 10); geo.translate(0, -len / 2, 0); const p = geo.attributes.position; let sd = idx * 97 + 3;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k); if (y < -len * .97) { sd = (sd * 16807) % 2147483647; const r = sd / 2147483647; p.setY(k, y + (r - .2) * .09); } } geo.userData.base = p.array.slice();
    const mesh = shadow(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex.sash, roughness: .85, side: THREE.DoubleSide }))); addB(mesh); return { mesh, a, len, dir: new V3(0, -1, 0), phase: idx * 1.7 };
  });
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new V3(), _v2 = new V3(), _v3 = new V3(), _up = new V3(0, 1, 0);
  const along = (mesh, a, bb, off0, off1) => { _v.copy(bb).sub(a); const l = _v.length(); _v.multiplyScalar(1 / (l || 1)); mesh.position.copy(a).addScaledVector(_v, l * off0); mesh.quaternion.setFromUnitVectors(_up, _v); mesh.scale.set(1, l * (off1 - off0), 1); };
  let t = 0;
  return {
    update(P, dt, ctx) {
      t += dt; const J = rig.joints, { qp, hip } = ctx;
      for (const i of [0, 1]) {
        const s = sl[i], sh = i ? J.shR : J.shL, el = i ? J.elbowR : J.elbowL, hd = i ? J.handR : J.handL;
        const wr = _v2.copy(hd).addScaledVector(_v3.copy(hd).sub(el).normalize(), -L.hand * .45).clone();
        along(s.sU, sh, el, 0, 1); s.sU.scale.set(1, s.sU.scale.y, 1);
        along(s.sF, el, wr, 0, .36); s.sF.scale.set(1.04, s.sF.scale.y, 1.04);
        _v.copy(wr).sub(el).normalize(); s.cuff.position.copy(el).addScaledVector(_v, el.distanceTo(wr) * .36); s.cuff.quaternion.setFromUnitVectors(_up, _v);
        along(s.brc, el, wr, .52, 1); s.brcR.position.copy(el).addScaledVector(_v, el.distanceTo(wr) * .58); s.brcR.quaternion.copy(s.cuff.quaternion); s.brcG.position.copy(el).addScaledVector(_v, el.distanceTo(wr) * .93); s.brcG.quaternion.copy(s.cuff.quaternion);
      }
      const hj = [J.hipL, J.hipR], kj = [J.kneeL, J.kneeR], aj = [J.ankleL, J.ankleR];
      for (const i of [0, 1]) {
        const g = leg[i]; _v.copy(kj[i]).sub(aj[i]).normalize(); // shin axis
        _v2.set(1, 0, 0).applyQuaternion(qp); _v2.addScaledVector(_v, -_v2.dot(_v)).normalize();
        g.kn.position.copy(kj[i]).addScaledVector(_v2, .06 * b + .006); g.kn.quaternion.setFromUnitVectors(new V3(1, 0, 0), _v2); g.ke.position.copy(g.kn.position); g.ke.quaternion.copy(g.kn.quaternion);
        _v3.copy(kj[i]).sub(hj[i]); const tl = _v3.length(); _v3.normalize(); g.ts.position.copy(hj[i]).addScaledVector(_v3, tl * .6); g.ts.quaternion.setFromUnitVectors(_up, _v3);
        const top = _v2.copy(aj[i]).addScaledVector(_v, .27); along(g.sh, aj[i], top, 0, 1); g.bt.position.copy(top); g.bt.quaternion.copy(g.sh.quaternion);
        g.bk1.position.copy(aj[i]).addScaledVector(_v, .1); g.bk1.quaternion.copy(g.sh.quaternion); g.bk2.position.copy(aj[i]).addScaledVector(_v, .18); g.bk2.quaternion.copy(g.sh.quaternion);
      }
      // sash strips: attach around the belt, hang with lag, flutter with motion
      for (const S of strips) {
        const rb = .17 * b; _v.set(Math.cos(S.a) * rb, -.01, Math.sin(S.a) * rb * .8).applyQuaternion(qp).add(hip);
        const side = Math.abs(Math.sin(S.a)) > .6, li = S.a < 0 ? 0 : 1;
        const tgt = _v2.set(Math.cos(S.a) * -.15, -1, Math.sin(S.a) * .1); if (side) { _v3.copy(kj[li]).sub(hj[li]).normalize(); tgt.lerp(_v3, .45); } tgt.x += Math.sin(t * 5 + S.phase) * .05; tgt.z += Math.cos(t * 4 + S.phase) * .05; tgt.normalize();
        S.dir.lerp(tgt, .2).normalize();
        S.mesh.position.copy(_v); _q2.setFromAxisAngle(_up, Math.PI / 2 - S.a); _q.setFromUnitVectors(new V3(0, -1, 0), S.dir); S.mesh.quaternion.copy(_q).multiply(_q2);
        const p = S.mesh.geometry.attributes.position, base = S.mesh.geometry.userData.base, amp = .03 + Math.min(.06, rig.sway * .05);
        for (let k = 0; k < p.count; k++) { const y = base[k * 3 + 1], u = Math.min(1, -y / S.len); p.setXYZ(k, base[k * 3], y, Math.sin(t * 7 + S.phase + u * 5) * amp * u * u + Math.sin(t * 3 + u * 3) * .015 * u); }
        p.needsUpdate = true;
      }
    }
  };
}

export const kaiTextures = () => jacketTextures();
