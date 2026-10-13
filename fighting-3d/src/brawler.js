/* "Heavy brawler" outfit kit: torn sleeveless gi top with back emblem, flame-hem pants, black belt with knot tails,
   heavy fingerless gloves with knuckle plates, combat boots. Shared by the muscular fighters. */
import * as THREE from 'three';
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

function emblemTex(kind, col, trim) {
  const c = cv(256, 256), g = c.getContext('2d'); g.translate(128, 128); g.lineJoin = 'round';
  g.shadowColor = trim; g.shadowBlur = 8; g.fillStyle = trim; g.strokeStyle = col; g.lineWidth = 3;
  const wing = (s) => { g.save(); g.scale(s, 1); g.beginPath(); g.moveTo(8, -10); for (let i = 0; i < 5; i++) { g.quadraticCurveTo(50 + i * 14, -70 + i * 22, 112 - i * 6, -52 + i * 30); g.lineTo(70 - i * 8, -18 + i * 26); } g.lineTo(8, 30); g.closePath(); g.fill(); g.stroke(); g.restore(); };
  if (kind === 'wings') { wing(1); wing(-1); g.beginPath(); g.ellipse(0, 10, 16, 42, 0, 0, TAU); g.fillStyle = col; g.fill(); g.stroke(); g.beginPath(); g.arc(0, -34, 14, 0, TAU); g.fillStyle = trim; g.fill(); }
  else if (kind === 'horns') { for (const s of [-1, 1]) { g.save(); g.scale(s, 1); g.beginPath(); g.moveTo(14, 8); g.quadraticCurveTo(70, 20, 96, -56); g.quadraticCurveTo(52, -14, 10, -22); g.closePath(); g.fill(); g.stroke(); g.restore(); } g.beginPath(); g.arc(0, 22, 34, 0, TAU); g.fillStyle = col; g.fill(); g.stroke(); g.fillStyle = trim; g.fillRect(-18, 14, 12, 8); g.fillRect(6, 14, 12, 8); g.fillRect(-4, 34, 8, 14); }
  else if (kind === 'claws') { for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 44 - 14, -88); g.quadraticCurveTo(i * 44 + 30, 0, i * 44 - 22, 92); g.quadraticCurveTo(i * 44 + 10, 0, i * 44 - 14, -88); g.fill(); g.stroke(); } }
  else if (kind === 'skull') { g.beginPath(); g.arc(0, -10, 54, 0, TAU); g.fillStyle = trim; g.fill(); g.fillRect(-30, 30, 60, 38); g.fillStyle = '#000'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 24, -8, 15, 18, 0, 0, TAU); g.fill(); } g.beginPath(); g.moveTo(0, 12); g.lineTo(-8, 28); g.lineTo(8, 28); g.fill(); }
  else { /* flame star */ g.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 38 : 96, a = i / 16 * TAU - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fillStyle = col; g.fill(); }
  return tex(c);
}
function flameHemTex(base, f1, f2) {
  const c = cv(128, 128), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 16) for (const [col, s] of [[f1, 1], [f2, .62]]) { g.fillStyle = col; g.beginPath(); g.moveTo(x - 8, 128); g.quadraticCurveTo(x, 128 - 70 * s, x + 3, 128 - 118 * s); g.quadraticCurveTo(x + 10, 128 - 60 * s, x + 14, 128 - 84 * s); g.quadraticCurveTo(x + 18, 128 - 30 * s, x + 24, 128); g.fill(); }
  // frayed bottom edge + wear
  g.globalCompositeOperation = 'destination-out'; for (let x = 0; x < 128; x += 5) g.fillRect(x, 124 + (x * 7 % 5) * .4, 3, 6);
  g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 60; i++) g.fillRect(Math.random() * 128, Math.random() * 128, 2, 5);
  return tex(c);
}
function tornFabricTex(col, trim) {
  const c = cv(128, 128), g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 1; for (let i = 0; i < 128; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 7, 1 + Math.random() * 3, Math.random() * 3, 0, TAU); g.fill(); }
  g.fillStyle = trim; g.fillRect(0, 0, 128, 6); g.fillRect(0, 122, 128, 6);
  return tex(c);
}

export function brawlerKit(o = {}) {
  return (rig, X) => {
    const { shadow, clothMat, metalMat, tubeGeo } = X, L = rig.L, b = rig.spec.bulk, sc = rig.sc, spec = rig.spec;
    const col = o.color || '#9a1218', trim = o.trim || '#ffc040', emb = o.emblem || 'wings';
    const fab = new THREE.MeshStandardMaterial({ map: tornFabricTex(col, trim), roughness: .8, side: THREE.DoubleSide });
    const leather = clothMat('#0d0c0e', 'leather'), plate = metalMat('#2a2a30', .35);
    const addT = m => { rig.torso.add(m); return m; }, addB = m => { rig.body.add(m); return m; };
    // back emblem + front chest patch on the torso
    const em = new THREE.Mesh(new THREE.PlaneGeometry(.36 * b, .36 * b), new THREE.MeshBasicMaterial({ map: emblemTex(emb, col, trim), transparent: true, toneMapped: false, opacity: .95, polygonOffset: true, polygonOffsetFactor: -2 }));
    em.position.set(-.205 * b, L.spine * .6, 0); em.rotation.y = -Math.PI / 2; em.scale.set(1, 1, 1); addT(em);
    const patch = o.noPatch ? new THREE.Object3D() : new THREE.Mesh(new THREE.PlaneGeometry(.075, .075), new THREE.MeshBasicMaterial({ map: emblemTex(emb, col, trim), transparent: true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    patch.position.set(.138 * b, L.spine * .8, .075 * b); patch.rotation.y = Math.PI / 2; addT(patch);
    // belt + knot + hanging tails (lagged cloth)
    const belt = shadow(new THREE.Mesh(new THREE.TorusGeometry(.158 * b, .02, 8, 28).rotateX(Math.PI / 2), leather)); belt.scale.set(1, 1, .8); belt.position.y = .012; addT(belt);
    const knot = o.noTails ? new THREE.Object3D() : shadow(new THREE.Mesh(new THREE.BoxGeometry(.03, .045, .06), leather)); knot.position.set(.16 * b, .012, .02); addT(knot);
    const tails = o.noTails ? [] : [-.5, .5].map((z, i) => { const geo = new THREE.PlaneGeometry(.045, .42, 1, 6); geo.translate(0, -.21, 0); const m = shadow(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#0d0c0e', roughness: .7, side: THREE.DoubleSide }))); addB(m); return { m, dir: new V3(0, -1, 0), z: z * .12, ph: i * 2 }; });
    // shoulder pad plates + heavy gloves
    rig.fist.forEach(f => {
      const kp = shadow(new THREE.Mesh(new THREE.BoxGeometry(.06, .02, .1), plate)); kp.position.set(.014, .045, 0); kp.rotation.z = -.15; f.add(kp);
      const cu = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.058, .056, .075, 16).rotateZ(Math.PI / 2), leather)); cu.position.set(-.06, 0, 0); f.add(cu);
      const sr = shadow(new THREE.Mesh(new THREE.TorusGeometry(.059, .008, 6, 18).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: trim, roughness: .4, metalness: .6 }))); sr.position.set(-.025, 0, 0); f.add(sr);
      f.scale.multiplyScalar(1.12);
    });
    // flame-hem pant cuffs + boots
    const hemMat = new THREE.MeshStandardMaterial({ map: flameHemTex(spec.pants.color, o.hem1 || '#ff5a14', o.hem2 || '#ffd24a'), roughness: .85, side: THREE.DoubleSide });
    const leg = [0, 1].map(() => ({
      hem: addB(shadow(new THREE.Mesh(tubeGeo(.074 * b * (spec.legs || 1), .066 * b * (spec.legs || 1), .02, .5), hemMat))),
      sh: addB(shadow(new THREE.Mesh(tubeGeo(.064, .068, .02, .5), clothMat('#0a090b', 'leather')))),
      bt: addB(shadow(new THREE.Mesh(new THREE.TorusGeometry(.068, .009, 6, 18).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b5b5bd', metalness: .8, roughness: .3 }))))
    }));
    if (o.noBoots) for (const g of leg) { g.sh.visible = false; g.bt.visible = false; }
    const _v = new V3(), _v2 = new V3(), _up = new V3(0, 1, 0), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
    const along = (mesh, a, bb, o0, o1) => { _v.copy(bb).sub(a); const l = _v.length(); _v.multiplyScalar(1 / (l || 1)); mesh.position.copy(a).addScaledVector(_v, l * o0); mesh.quaternion.setFromUnitVectors(_up, _v); mesh.scale.set(1, l * (o1 - o0), 1); };
    let t = 0;
    return {
      update(P, dt, ctx) {
        t += dt; const J = rig.joints, { qp, hip } = ctx, kj = [J.kneeL, J.kneeR], aj = [J.ankleL, J.ankleR];
        for (const i of [0, 1]) {
          const g = leg[i]; _v2.copy(kj[i]).sub(aj[i]).normalize();
          const tp = new V3().copy(aj[i]).addScaledVector(_v2, .26); along(g.sh, aj[i], tp, 0, 1); g.bt.position.copy(tp); g.bt.quaternion.copy(g.sh.quaternion);
          const hs = new V3().copy(aj[i]).addScaledVector(_v2, .1), he = new V3().copy(aj[i]).addScaledVector(_v2, .42); along(g.hem, hs, he, 0, 1);
        }
        for (const T of tails) {
          const rb = .17 * b; _v.set(rb, -.01, T.z).applyQuaternion(qp).add(hip);
          const tgt = _v2.set(-.25 + Math.sin(t * 5 + T.ph) * .08, -1, Math.sin(t * 3 + T.ph) * .12 + (T.z > 0 ? .15 : -.15)).normalize(); T.dir.lerp(tgt, .18).normalize();
          T.m.position.copy(_v); _q.setFromUnitVectors(new V3(0, -1, 0), T.dir); T.m.quaternion.copy(_q);
        }
      }
    };
  };
}
