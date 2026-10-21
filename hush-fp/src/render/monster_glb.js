/* The HUSH creature as a real rigged model (Meshy "Ashen Spinefiend", optimised to ~29k triangles / 1024 px textures and embedded in the HTML as a binary).
   One parsed template is shared by every creature: geometry, material and textures are reused, each creature only gets its own skeleton clone and AnimationMixer.
   The game's AI is untouched: this module only maps the AI's state (moving / speed / state / distance to the player) onto the model's clips.
     stationary (waiting, searching, sniffing, suspicious) -> Alert      slow walking (roam / investigate / search) -> Walking (Casual_Walk when very slow)
     hunting -> Running, RunFast when it is closing in or aggressive    catching the player -> Attack (once)      hunt roar -> Skill_03 (once)
   Foot planting: for every clip the template is sampled once at load; the lowest foot bone gives a per-clip height offset so the soles stay on the floor, and the
   stance-foot speed gives the clip's natural ground speed so playback is scaled to the creature's real speed (little foot sliding). The clips are in place (no root motion). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import GLB from '../assets/monster.glb';

const TS = 2;                                                        // world units per tile (must match scene3d)
const SCALE = { stalker: 1.2, sentinel: 1.3, listener: 1.15 };       // model is 1.7 m tall in its pose
const TINT = { stalker: 0x4a4541, sentinel: 0x3f4550, listener: 0x453d3d };       // the texture is bone-pale and glares under the flashlight: darkened toward charcoal
const CLIPS = ['Alert', 'Walking', 'Casual_Walk', 'Running', 'RunFast', 'Attack', 'Skill_03'];
const EYE = { y: 0.03, z: 0.02 };
let _glow = null; function glowTex() { if (_glow) return _glow; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _glow = new THREE.CanvasTexture(c); _glow.userData = { shared: true }; return _glow; }
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
let TPL = null; const MATS = {};

export const GLBMonster = {
  get ready() { return !!TPL; },
  error: null,
  async load() {
    if (TPL) return true;
    try {
      const buf = GLB.buffer.slice(GLB.byteOffset, GLB.byteOffset + GLB.byteLength);
      const gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
      const root = gltf.scene, clips = {}; gltf.animations.forEach(a => { clips[a.name] = a; });
      for (const n of CLIPS) if (!clips[n]) throw new Error('missing clip ' + n);
      root.traverse(o => { if (o.isSkinnedMesh) { o.frustumCulled = false; o.geometry.userData.shared = true; const m = o.material; m.userData.shared = true; for (const k of ['map', 'normalMap', 'metalnessMap', 'roughnessMap']) if (m[k]) { m[k].userData.shared = true; m[k].anisotropy = 4; } } });
      TPL = { root, clips, info: probe(root, clips), base: root.getObjectByProperty('isSkinnedMesh', true).material };
      return true;
    } catch (e) { GLBMonster.error = String(e && e.message || e); TPL = null; return false; }
  },
  /* one creature: returns { root, ghost, inst } where root is what the view positions and rotates */
  build(type, Q) {
    const s = SCALE[type] || 1.2, inner = cloneSkinned(TPL.root), root = new THREE.Group(); inner.scale.setScalar(s); root.add(inner);
    const mat = matFor(type, Q); let skin = null;
    inner.traverse(o => { if (o.isSkinnedMesh) { o.material = mat; o.frustumCulled = false; o.castShadow = !!Q.shadow; o.receiveShadow = false; skin = skin || o; } });
    const ghost = new THREE.SkinnedMesh(skin.geometry, new THREE.MeshBasicMaterial()); ghost.bind(skin.skeleton, skin.bindMatrix); ghost.frustumCulled = false; ghost.visible = false; ghost.renderOrder = 999; skin.parent.add(ghost);
    const hf = inner.getObjectByName(THREE.PropertyBinding.sanitizeNodeName('headfront')), eyes = [];
    if (hf) for (const sx of [-1, 1]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: type === 'sentinel' ? 0xbfeaff : 0xff2a20, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: type === 'listener' ? 0 : 0.9 })); sp.scale.setScalar(0.22 / s); sp.position.set(sx * 0.055, EYE.y, EYE.z); hf.add(sp); eyes.push(sp); }
    const mixer = new THREE.AnimationMixer(inner), act = {}; for (const n of CLIPS) act[n] = mixer.clipAction(TPL.clips[n]);
    const inst = { s, inner, mixer, act, eyes, skin, cur: null, sp: 0, fast: false, off: 0, attackT: 0, fresh: true };
    return { root, ghost, inst };
  },
  /* drive one creature from the AI state (visual only) */
  update(inst, c, world, dt) {
    const p = world.player, dpl = Math.hypot(p.x - c.x, p.y - c.y), mps = c.moving ? c.speed * TS : 0;
    inst.sp += (mps - inst.sp) * Math.min(1, dt * 8); if (!c.moving && inst.sp < 0.05) inst.sp = 0;
    const caught = world.over === 'dead' && world.caughtBy === c, hunting = c.state === 'hunt';
    let want = 'Alert', once = false;
    if (caught || (hunting && c.seen && dpl < 1.3 && p.alive)) { want = 'Attack'; once = true; }
    else if (inst.cur === 'Attack' && inst.attackT > 0 && hunting) { want = 'Attack'; once = true; }
    else if (hunting && c.roar > 0 && !c.moving) { want = 'Skill_03'; once = true; }
    else if (c.moving && inst.sp > 0.25) {
      if (hunting) { inst.fast = inst.fast ? dpl < 8 : dpl < 5.5; want = inst.fast ? 'RunFast' : 'Running'; }
      else want = inst.sp < 1.3 ? 'Casual_Walk' : 'Walking';
    }
    const info = TPL.info[want];
    if (want !== inst.cur) {
      const next = inst.act[want], prev = inst.cur ? inst.act[inst.cur] : null; next.enabled = true;
      if (once) { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; } else { next.setLoop(THREE.LoopRepeat, Infinity); next.clampWhenFinished = false; }
      next.reset(); next.setEffectiveWeight(1); next.play(); if (want === 'Attack') inst.attackT = TPL.clips.Attack.duration / 1.15;
      if (prev) prev.crossFadeTo(next, once ? 0.12 : 0.25, false);
      if (prev && !once && info.loco && TPL.info[inst.cur].loco) next.time = (prev.time % prev.getClip().duration) / prev.getClip().duration * next.getClip().duration;   // keep the stride phase
      inst.cur = want;
    }
    if (inst.attackT > 0) inst.attackT -= dt;
    const act = inst.act[want]; inst.ts = info.loco ? clamp(inst.sp / (info.v * inst.s), 0.55, 1.8) : want === 'Attack' ? 1.15 : 1; act.setEffectiveTimeScale(inst.ts);
    inst.mixer.update(dt); const off = info.off * inst.s; inst.off = inst.fresh ? off : inst.off + (off - inst.off) * Math.min(1, dt * 8); inst.fresh = false; inst.inner.position.y = inst.off;
  }
};

function matFor(type, Q) {
  const key = Q.mats + type; if (MATS[key]) return MATS[key]; const b = TPL.base; let m;
  if (Q.mats === 'std') { m = new THREE.MeshPhysicalMaterial({ map: b.map, normalMap: b.normalMap, side: b.side, roughness: 0.9, metalness: 0, specularIntensity: 0.05 }); }   /* low F0: the plain 4% specular of a standard material is enough to turn it white under the flashlight */
  else { m = new THREE.MeshLambertMaterial({ map: b.map, normalMap: Q.mats === 'lambert' ? null : b.normalMap }); }
  m.color = new THREE.Color(TINT[type] || 0x4a4541); m.userData.shared = true; return (MATS[key] = m);
}

/* sample every clip once: per-clip foot-plant offset and natural ground speed (model units) */
function probe(root, clips) {
  const probeRoot = cloneSkinned(root), mixer = new THREE.AnimationMixer(probeRoot), nm = n => THREE.PropertyBinding.sanitizeNodeName(n), get = n => probeRoot.getObjectByName(nm(n));
  const feet = ['LeftFoot', 'LeftToeBase', 'LeftToe_End', 'RightFoot', 'RightToeBase', 'RightToe_End'].map(n => get('mixamorig:' + n)), toes = [get('mixamorig:LeftToeBase'), get('mixamorig:RightToeBase')];
  const wp = o => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld), lowest = () => Math.min(...feet.map(o => wp(o).y));
  probeRoot.updateMatrixWorld(true); const bind = lowest(), out = {};
  for (const n of CLIPS) {
    const clip = clips[n]; mixer.stopAllAction(); const a = mixer.clipAction(clip); a.play(); const N = 48, dt = clip.duration / N; const lows = []; let last = null; const sp = [];
    for (let i = 0; i <= N; i++) {
      a.time = clip.duration * i / N; mixer.update(0); probeRoot.updateMatrixWorld(true); lows.push(lowest()); const cur = toes.map(o => wp(o));
      if (last) for (let k = 0; k < 2; k++) { const y = (cur[k].y + last[k].y) / 2, yo = (cur[1 - k].y + last[1 - k].y) / 2; if (y <= yo && y < 0.16) sp.push(-(cur[k].z - last[k].z) / dt); } last = cur;
    }
    sp.sort((x, y) => x - y); const v = sp.length ? sp[sp.length >> 1] : 0; lows.sort((x, y) => x - y); out[n] = { off: bind - lows[Math.floor(lows.length * 0.15)], v: Math.max(v, 0.3), loco: v > 0.3 };
  }
  return out;
}
