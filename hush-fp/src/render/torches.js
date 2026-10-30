/* The torches: five distinct designs. Each has its own first-person 3D model (View swaps the model on the hand with a lowering/raising motion) and its own beam: range, spread,
   brightness, colour, and how easily creatures notice the light (sight: 1 is the original torch). The unlock rules tie the better ones to progress. */
import * as THREE from 'three';

export const TORCHES = [
  { id: 'standard', name: 'Field Torch', desc: 'Reliable all-rounder. Medium beam, medium range.', pal: ['#9aa3ad', '#23272b', '#fff6dd'], light: { I: 300, angle: 0.66, pen: 1.0, dist: 36, color: 0xfff4e0 }, sight: 1.15, bars: [3, 3, 3], unlock: { t: 'start', text: 'Always available' } },
  { id: 'lantern', name: 'Camp Lantern', desc: 'A wide soft light that fills a room, but short range and easy for creatures to spot.', pal: ['#59664e', '#1d2420', '#ffe9b0'], light: { I: 230, angle: 1.0, pen: 1.0, dist: 26, color: 0xffeac0 }, sight: 1.28, bars: [2, 5, 5], unlock: { t: 'level', n: 6, text: 'Finish level 6' } },
  { id: 'tactical', name: 'Tactical Beam', desc: 'A tight, long beam. Sees far down corridors, shows little to the sides.', pal: ['#30343a', '#101215', '#e6f0ff'], light: { I: 380, angle: 0.38, pen: 0.75, dist: 50, color: 0xf0f6ff }, sight: 1.2, bars: [5, 1, 4], unlock: { t: 'stars', n: 25, text: 'Earn 25 stars' } },
  { id: 'dynamo', name: 'Dynamo Torch', desc: 'Warm, even light that creatures notice a little less. Ordinary range.', pal: ['#c98a1c', '#2a2318', '#ffd88a'], light: { I: 265, angle: 0.72, pen: 1.0, dist: 33, color: 0xffd6a0 }, sight: 0.98, bars: [3, 3, 4], unlock: { t: 'level', n: 17, text: 'Finish chapter 1 (level 17)' } },
  { id: 'amber', name: 'Amber Signal', desc: 'A dim amber lamp that creatures barely notice. Short range: stealth over sight.', pal: ['#8e6a4a', '#3a1a14', '#ff9a50'], light: { I: 215, angle: 0.6, pen: 1.0, dist: 27, color: 0xff9a55 }, sight: 0.78, bars: [2, 3, 1], unlock: { t: 'level', n: 34, text: 'Finish chapter 2 (level 34)' } }
];
export const TORCH_IDS = TORCHES.map(t => t.id);
export const torchById = (id) => TORCHES.find(t => t.id === id) || TORCHES[0];
export function torchUnlocked(t, stars) {
  const u = t.unlock; if (u.t === 'start') return true; if (u.t === 'level') return (stars[u.n - 1] || 0) > 0; if (u.t === 'stars') return stars.reduce((a, b) => a + (b || 0), 0) >= u.n; return false;
}

const hexn = (s) => parseInt(s.slice(1), 16);
/* a torch model pointing along -z, lens at about z = -0.18 */
export function buildTorch(id, mc, glowTex) {
  const t = torchById(id), g = new THREE.Group(), mat = (c, rough) => new THREE.MeshMatcapMaterial({ color: c, matcap: mc }), body = mat(hexn(t.pal[0])), dark = mat(hexn(t.pal[1])), bez = mat(0xc4ccd6), lensCol = hexn(t.pal[2]);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), new THREE.MeshBasicMaterial({ color: lensCol })), add = (m, x, y, z, rx, ry, rz) => { m.position.set(x || 0, y || 0, z || 0); if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; if (rz) m.rotation.z = rz; g.add(m); return m; };
  const cyl = (r1, r2, h, m, z, seg) => add(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 16), m), 0, 0, z, Math.PI / 2);
  if (id === 'lantern') {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), body), 0, 0, 0); add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.07), body), 0, 0, -0.145);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.012), bez), 0, 0, -0.18); lens.geometry = new THREE.PlaneGeometry(0.11, 0.11); add(lens, 0, 0, -0.1865, 0, Math.PI);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 14, Math.PI), dark), 0, 0.06, -0.02, 0, 0, 0); for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.012, 0.02), dark), 0, 0, 0.06 - i * 0.05);
  } else if (id === 'tactical') {
    cyl(0.027, 0.027, 0.27, body, 0.02, 14); for (let i = 0; i < 5; i++) cyl(0.0285, 0.0285, 0.008, dark, 0.09 - i * 0.025, 14);
    cyl(0.04, 0.032, 0.05, dark, -0.13, 16); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.02), bez), Math.cos(a) * 0.042, Math.sin(a) * 0.042, -0.165); }
    add(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.005, 8, 20), bez), 0, 0, -0.158); lens.geometry = new THREE.CircleGeometry(0.036, 18); add(lens, 0, 0, -0.1745, 0, Math.PI); cyl(0.03, 0.026, 0.03, dark, 0.165, 14); add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.01, 0.026), bez), 0, 0.03, 0.12);
  } else if (id === 'dynamo') {
    cyl(0.04, 0.04, 0.2, body, 0.01, 16); cyl(0.06, 0.044, 0.06, body, -0.13, 18); add(new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.009, 8, 22), dark), 0, 0, -0.162); lens.geometry = new THREE.CircleGeometry(0.052, 20); add(lens, 0, 0, -0.1635, 0, Math.PI);
    cyl(0.042, 0.042, 0.02, dark, 0.11, 16); add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.012), dark), 0.06, -0.01, 0.035); add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8), body), 0.11, -0.01, 0.035, 0, 0, Math.PI / 2 * 0);
  } else if (id === 'amber') {
    cyl(0.03, 0.03, 0.22, body, 0.01, 16); for (const z of [0.07, -0.0, -0.07]) cyl(0.0325, 0.0325, 0.012, mat(0xb02a22), z, 16);
    cyl(0.05, 0.034, 0.07, body, -0.135, 18); add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 8, 22), mat(0xb02a22)), 0, 0, -0.171); lens.geometry = new THREE.CircleGeometry(0.046, 20); add(lens, 0, 0, -0.1725, 0, Math.PI); add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.03), dark), 0, 0.034, -0.02);
  } else {
    cyl(0.03, 0.03, 0.2, body, 0.01, 16); for (let i = 0; i < 4; i++) cyl(0.0325, 0.0325, 0.012, dark, 0.06 - i * 0.03, 16); cyl(0.056, 0.036, 0.075, body, -0.135, 18);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.007, 8, 22), bez), 0, 0, -0.173); add(lens, 0, 0, -0.1735, 0, Math.PI); add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.03), dark), 0, 0.034, -0.02);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: lensCol, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, opacity: 0.55 })); glow.scale.setScalar(0.22); glow.position.z = -0.19; glow.renderOrder = 6; g.add(glow);
  g.traverse(o => { if (o.isMesh) o.renderOrder = 5; });
  return { g, lens, glow, lensCol };
}

/* a small 2D picture of a torch for the equipment screen */
export function drawTorchIcon(cv, id) {
  const t = torchById(id), x = cv.getContext('2d'), W = cv.width, H = cv.height; x.clearRect(0, 0, W, H); x.save(); x.translate(W * 0.5, H * 0.5); x.rotate(-0.5); x.lineJoin = 'round';
  const [b, d, l] = t.pal, rr = (px, py, w, h, c, r) => { x.fillStyle = c; x.beginPath(); x.roundRect(px, py, w, h, r || 3); x.fill(); };
  const s = W / 120;
  if (id === 'lantern') { rr(-30 * s, -14 * s, 46 * s, 28 * s, b, 4); rr(14 * s, -20 * s, 20 * s, 40 * s, d, 3); rr(30 * s, -15 * s, 6 * s, 30 * s, l, 2); x.strokeStyle = d; x.lineWidth = 3 * s; x.beginPath(); x.arc(-8 * s, -16 * s, 12 * s, Math.PI, 0); x.stroke(); }
  else if (id === 'tactical') { rr(-40 * s, -7 * s, 66 * s, 14 * s, b, 3); for (let i = 0; i < 4; i++) rr((-28 + i * 7) * s, -8 * s, 2.5 * s, 16 * s, '#1c1f23', 1); rr(24 * s, -11 * s, 14 * s, 22 * s, d, 3); rr(37 * s, -8 * s, 4 * s, 16 * s, l, 2); }
  else if (id === 'dynamo') { rr(-34 * s, -11 * s, 50 * s, 22 * s, b, 6); rr(14 * s, -17 * s, 22 * s, 34 * s, b, 6); rr(34 * s, -13 * s, 5 * s, 26 * s, l, 2); rr(-12 * s, 10 * s, 30 * s, 5 * s, d, 2); rr(14 * s, 12 * s, 6 * s, 14 * s, d, 2); }
  else if (id === 'amber') { rr(-36 * s, -8 * s, 54 * s, 16 * s, b, 4); for (const px of [-22, -4]) rr(px * s, -9 * s, 4 * s, 18 * s, '#b02a22', 1); rr(16 * s, -13 * s, 20 * s, 26 * s, b, 4); rr(34 * s, -10 * s, 5 * s, 20 * s, l, 2); }
  else { rr(-36 * s, -8 * s, 54 * s, 16 * s, b, 4); for (let i = 0; i < 4; i++) rr((-26 + i * 8) * s, -9 * s, 3 * s, 18 * s, d, 1); rr(16 * s, -13 * s, 20 * s, 26 * s, b, 4); rr(34 * s, -10 * s, 5 * s, 20 * s, l, 2); }
  x.restore();
}
