/* The small secondary creature: a Meshy "Bloodfang Stalker" static model, decimated to about 4k triangles with 512 px textures (about 220 KB) and shared by every crawler / dropper.
   It has no skeleton, so the motion (scuttle, rear-up, lunge, ceiling drop) is procedural and done in extras3d.js. Geometry, material and textures are shared, never disposed per level. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import GLB from '../assets/crawler.glb';
import { patchPulse } from './scene3d.js';

let TPL = null; const MATS = {};
export const SCALE = 0.36;                                     // the model is about 1.9 long in its own units: this makes it roughly 0.7 m, small beside the 2.6 m stalker
export const CrawlerGLB = {
  get ready() { return !!TPL; },
  error: null,
  async load() {
    if (TPL) return true;
    try {
      const buf = GLB.buffer.slice(GLB.byteOffset, GLB.byteOffset + GLB.byteLength), gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
      let mesh = null; gltf.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; }); if (!mesh) throw new Error('no mesh');
      mesh.geometry.userData.shared = true; mesh.geometry.computeBoundingBox(); const bb = mesh.geometry.boundingBox; const m = mesh.material; m.userData.shared = true;
      for (const k of ['map', 'normalMap']) if (m[k]) { m[k].userData.shared = true; m[k].anisotropy = 2; }
      TPL = { geo: mesh.geometry, base: m, minY: bb.min.y, len: bb.max.z - bb.min.z };
      return true;
    } catch (e) { CrawlerGLB.error = String(e && e.message || e); TPL = null; return false; }
  },
  /* a fresh node (shared geometry + material) standing on y=0, facing +x like the logic's yaw 0 */
  build(Q) {
    const key = Q && Q.mats || 'std'; let mat = MATS[key];
    if (!mat) { const b = TPL.base; mat = key === 'std' ? b.clone() : new THREE.MeshLambertMaterial({ map: b.map }); mat.color = new THREE.Color(0xa49a94); mat.userData.shared = true; mat.side = THREE.FrontSide; patchPulse(mat); MATS[key] = mat; }
    const mesh = new THREE.Mesh(TPL.geo, mat); mesh.scale.setScalar(SCALE); mesh.position.y = -TPL.minY * SCALE; mesh.rotation.y = FWD; mesh.frustumCulled = false;
    const g = new THREE.Group(); g.add(mesh); g.userData.body = mesh; return g;
  }
};
let FWD = 0;      // the model faces +z like the rigged creature, and the view rotates the root by PI/2 - yaw
