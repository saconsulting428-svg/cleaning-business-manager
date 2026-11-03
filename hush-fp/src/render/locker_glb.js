/* The painted metal locker (Meshy GLB, ~4.7k triangles, one 1k texture): shared geometry + material, one mesh per locker. Falls back to the built-in locker if it did not load. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import GLB from '../assets/locker.glb';
import { patchPulse } from './scene3d.js';
let TPL = null; const MATS = {};
export const LockerGLB = {
  get ready() { return !!TPL; },
  async load() {
    if (TPL) return true;
    try {
      const buf = GLB.buffer.slice(GLB.byteOffset, GLB.byteOffset + GLB.byteLength), gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
      let mesh = null; gltf.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; }); if (!mesh) throw new Error('no mesh');
      mesh.geometry.userData.shared = true; mesh.geometry.computeBoundingBox(); const m = mesh.material; m.userData.shared = true;
      for (const k of ['map', 'normalMap']) if (m[k]) { m[k].userData.shared = true; m[k].anisotropy = 2; }
      TPL = { geo: mesh.geometry, base: m, minY: mesh.geometry.boundingBox.min.y };
      return true;
    } catch (e) { TPL = null; return false; }
  },
  /* front faces +z (like the built-in locker group); about 2.0 high, 0.57 wide, 0.62 deep, standing on y = 0.06 */
  build(Q, tint) {
    const key = (Q && Q.mats || 'std') + (tint || 0); let mat = MATS[key];
    if (!mat) { const b = TPL.base; mat = (Q && Q.mats || 'std') === 'std' ? b.clone() : new THREE.MeshLambertMaterial({ map: b.map }); mat.color = new THREE.Color(tint || 0xd8d8d0); mat.userData.shared = true; patchPulse(mat); MATS[key] = mat; }
    const mesh = new THREE.Mesh(TPL.geo, mat); mesh.scale.set(2.1, 2.1, 1.5); mesh.position.y = 0.06 - TPL.minY * 2.1; mesh.frustumCulled = true;
    const g = new THREE.Group(); g.add(mesh); return g;
  }
};
