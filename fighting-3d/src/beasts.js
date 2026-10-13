/* Fantasy fighters: LEORAX (lion warrior) and IFRIT (fire jinn). Built on the brawler kit + head/body extras. */
import * as THREE from 'three';
import { brawlerKit } from './brawler.js';
const V3 = THREE.Vector3, TAU = Math.PI * 2;
const rng = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const glow = (col) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col); gr.addColorStop(.4, col.replace('1)', '.35)')); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; };
const pair = (a, b) => (rig, X) => { const A = a(rig, X), B = b(rig, X); return { update(P, dt, ctx) { A.update(P, dt, ctx); B.update(P, dt, ctx); } }; };

function lionExtras(rig, X) {
  const { shadow } = X, R = rig.L.headR, b = rig.spec.bulk, r = rng(41);
  const fur = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: .92 });
  const dark = fur('#4a2410'), mid = fur('#7a4218'), light = fur('#c98a3a');
  // mane: layered cones around the skull (open at the face)
  for (let i = 0; i < 150; i++) {
    const az = r() * TAU, el = (r() - .5) * 2.6; let d = new V3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    if (d.x > .25 && Math.abs(d.z) < .8 && d.y > -.9) { d.x = -Math.abs(d.x) * .6; } // keep the face clear
    d.normalize(); const len = R * (1.0 + r() * 1.0), m = shadow(new THREE.Mesh(new THREE.ConeGeometry(R * (.27 + r() * .1), len, 5), [dark, mid, light][(r() * 3) | 0]));
    const dir = d.clone(); dir.y -= .22 * (d.x < 0 ? 1 : .4); dir.normalize();
    m.position.copy(d).multiplyScalar(R * .95).addScaledVector(dir, len * .35); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir); rig.head.add(m);
  }
  for (const s of [-1, 1]) { // ears
    const e = shadow(new THREE.Mesh(new THREE.SphereGeometry(R * .26, 12, 10), mid)); e.scale.set(.5, 1, 1); e.position.set(-.05 * R, R * .98, s * R * .62); rig.head.add(e);
    const ei = new THREE.Mesh(new THREE.SphereGeometry(R * .16, 10, 8), fur('#d49a8a')); ei.scale.set(.4, .9, .9); ei.position.set(.02 * R, R * .98, s * R * .62); rig.head.add(ei);
    for (let k = 0; k < 6; k++) { const sb = shadow(new THREE.Mesh(new THREE.ConeGeometry(R * .09, R * .5, 4), mid)); sb.position.set(R * (.1 + k * .02), -R * (.35 + (k % 3) * .12), s * R * (.78 - k * .03)); sb.rotation.set(s * .3, 0, Math.PI * .85); rig.head.add(sb); } // side fur
  }
  // claws on the fists
  rig.fist.forEach(f => { for (let k = 0; k < 4; k++) { const c = shadow(new THREE.Mesh(new THREE.ConeGeometry(.009, .045, 6), new THREE.MeshStandardMaterial({ color: '#f1ead2', roughness: .4 }))); c.rotation.z = -Math.PI / 2; c.position.set(.095, -.01, (k - 1.5) * .02); f.add(c); } });
  // tail (lagged chain with a tuft)
  const seg = Array.from({ length: 6 }, (_, i) => { const m = shadow(new THREE.Mesh(new THREE.SphereGeometry(.026 - i * .0015, 8, 6), mid)); rig.body.add(m); return m; });
  const tuft = shadow(new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), dark)); tuft.scale.set(1, 1.7, 1); rig.body.add(tuft);
  const dir = new V3(-.6, -.5, 0).normalize(), tmp = new V3(), t0 = new V3(); let t = 0;
  return { update(P, dt, ctx) { t += dt; const { qp, hip } = ctx; t0.set(-.15 * b, -.02, 0).applyQuaternion(qp).add(hip);
    tmp.set(-.7 + Math.sin(t * 4) * .1, -.35 + Math.sin(t * 2.3) * .1, Math.sin(t * 3) * .25).applyQuaternion(qp).normalize(); dir.lerp(tmp, .12).normalize();
    seg.forEach((m, i) => m.position.copy(t0).addScaledVector(dir, i * .075).add(tmp.set(0, Math.sin(i * .9 + t * 3) * .02 * i, 0)));
    tuft.position.copy(t0).addScaledVector(dir, 6 * .075 + .03); } };
}

function jinnExtras(rig, X) {
  const { shadow } = X, R = rig.L.headR, b = rig.spec.bulk, L = rig.L;
  const gold = new THREE.MeshStandardMaterial({ color: '#ffc83a', metalness: .9, roughness: .25, emissive: '#6a4300', emissiveIntensity: .35 }), horn = new THREE.MeshStandardMaterial({ color: '#241437', roughness: .4, metalness: .2 });
  for (const s of [-1, 1]) {
    const h = shadow(new THREE.Mesh(new THREE.ConeGeometry(R * .17, R * 1.25, 8), horn)); h.position.set(-.12 * R, R * 1.1, s * R * .5); h.rotation.set(s * .45, 0, .3); rig.head.add(h);
    const ht = shadow(new THREE.Mesh(new THREE.ConeGeometry(R * .075, R * .32, 6), gold)); ht.position.set(-.2 * R, R * 1.62, s * R * .78); ht.rotation.set(s * .45, 0, .3); rig.head.add(ht);
    const ear = shadow(new THREE.Mesh(new THREE.ConeGeometry(R * .13, R * .6, 6), rig.mats.skin)); ear.position.set(-.02 * R, R * .1, s * R * 1.08); ear.rotation.set(s * 1.25, 0, .35); rig.head.add(ear);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * .09, R * .02, 6, 14), gold); ring.position.set(-.02 * R, -R * .18, s * R * .98); rig.head.add(ring);
  }
  const knot = shadow(new THREE.Mesh(new THREE.SphereGeometry(R * .34, 14, 10), new THREE.MeshStandardMaterial({ color: '#5a2d9c', roughness: .5 }))); knot.position.set(-.1 * R, R * 1.02, 0); rig.head.add(knot);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(R * .14), new THREE.MeshBasicMaterial({ color: '#7fe9ff', toneMapped: false })); gem.position.set(R * .12, R * 1.04, 0); rig.head.add(gem);
  const band = shadow(new THREE.Mesh(new THREE.TorusGeometry(R * .96, R * .05, 6, 28).rotateX(Math.PI / 2), gold)); band.position.y = R * .62; band.scale.set(1, 1, .98); rig.head.add(band);
  const collar = shadow(new THREE.Mesh(new THREE.TorusGeometry(.105 * b, .016, 8, 26).rotateX(Math.PI / 2), gold)); collar.position.set(.015, L.spine * .96, 0); collar.scale.set(1, 1, 1.15); rig.torso.add(collar);
  const bands = [0, 1].map(() => { const m = shadow(new THREE.Mesh(new THREE.TorusGeometry(.075 * b, .014, 8, 22).rotateX(Math.PI / 2), gold)); rig.body.add(m); return m; });
  const wr = [0, 1].map(() => { const m = shadow(new THREE.Mesh(new THREE.TorusGeometry(.05 * b, .02, 8, 20).rotateX(Math.PI / 2), gold)); rig.body.add(m); return m; });
  // drifting smoke / ember wisps
  const tex = glow('rgba(110,220,255,1)'), wisps = Array.from({ length: 16 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false })); rig.body.add(s); return { s, a: i / 16 * TAU, ph: i * .37 }; });
  const _v = new V3(), _w = new V3(), up = new V3(0, 1, 0); let t = 0;
  return { update(P, dt, ctx) { t += dt; const J = rig.joints, { hip } = ctx;
    for (const i of [0, 1]) { const sh = i ? J.shR : J.shL, el = i ? J.elbowR : J.elbowL, hd = i ? J.handR : J.handL;
      _v.copy(el).sub(sh); bands[i].position.copy(sh).addScaledVector(_v, .55); bands[i].quaternion.setFromUnitVectors(up, _v.normalize());
      _w.copy(hd).sub(el); wr[i].position.copy(el).addScaledVector(_w, .72); wr[i].quaternion.setFromUnitVectors(up, _w.normalize()); }
    for (const w of wisps) { const u = (t * .45 + w.ph) % 1; w.s.position.set(hip.x + Math.cos(w.a + t * 1.2) * (.3 + u * .12), hip.y - .55 + u * 1.9, hip.z + Math.sin(w.a + t * 1.2) * (.3 + u * .12)); w.s.scale.setScalar(.2 * (1 - u * .6)); w.s.material.opacity = Math.sin(u * Math.PI) * .75; } } };
}

export const lionKit = () => pair(brawlerKit({ emblem: 'claws', color: '#7a4218', trim: '#ffc040', hem1: '#ffb030', hem2: '#ffe27a', noPatch: true }), lionExtras);
export const jinnKit = () => pair(brawlerKit({ emblem: 'star', color: '#3b78c8', trim: '#ffd24a', hem1: '#3fd0ff', hem2: '#d8f8ff', noPatch: true, noBoots: true, noTails: true }), jinnExtras);
