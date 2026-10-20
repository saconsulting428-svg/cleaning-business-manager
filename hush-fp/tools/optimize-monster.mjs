/* One-off: shrinks the supplied Meshy GLB (205k tris, 3x2048 px textures, 20 MB) to a mobile-friendly asset (about 29k tris, 3x1024 px, 2.4 MB). Needs @gltf-transform/{core,functions}, meshoptimizer, sharp installed next to it.
   usage: node optimize-monster.mjs <original.glb> src/assets/monster.glb 0.14 1024 */
import { NodeIO } from '@gltf-transform/core';
import { weld, simplify, prune, dedup, textureCompress, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
const SRC = process.argv[2], OUT = process.argv[3], RATIO = +process.argv[4] || 0.14, TEX = +process.argv[5] || 1024;
const io = new NodeIO(); const doc = await io.read(SRC);
const m = doc.getRoot().listMaterials()[0]; console.log('baseColor', !!m.getBaseColorTexture(), 'normal', !!m.getNormalTexture(), 'mr', !!m.getMetallicRoughnessTexture(), 'emissive', !!m.getEmissiveTexture(), 'metal', m.getMetallicFactor(), 'rough', m.getRoughnessFactor(), 'alpha', m.getAlphaMode());
for (const t of doc.getRoot().listTextures()) console.log(t.getMimeType(), t.getSize());
await MeshoptSimplifier.ready;
await doc.transform(weld({ tolerance: 0.00005 }), simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: 0.01, lockBorder: false }), resample(), dedup(), prune(),
  textureCompress({ encoder: sharp, resize: [TEX, TEX], targetFormat: 'jpeg', quality: 82 }));
const p = doc.getRoot().listMeshes()[0].listPrimitives()[0]; console.log('verts', p.getAttribute('POSITION').getCount(), 'tris', p.getIndices().getCount() / 3);
await io.write(OUT, doc);
