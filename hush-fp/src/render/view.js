/* The first-person view: WebGL renderer, camera (bob, crouch, vent crawl, death), flashlight with a visible volumetric beam, hands, dust, pooled emergency lights,
   creature models + sonar silhouettes, the sonar pulse uniforms. Reads a World; never changes it. */
import * as THREE from 'three';
import { buildExtras } from './extras3d.js';
import { buildScene, PULSE, TS, WH, THEME, glowTex, patchPulse } from './scene3d.js';
import { buildCreature, poseCreature, creatureMaterials, ghostMaterial } from './creature3d.js';
import { angDiff } from '../logic/rng.js';
import { GLBMonster } from './monster_glb.js';

/* high: PBR + normal maps + flashlight shadows (desktop). medium: cheap lit materials with normal maps, full resolution, no shadow pass (phones). low: plain materials, lower resolution.
   The pixel ratio is the CAP: the real ratio is scaled down automatically when frames get slow (dynamic resolution), and back up when there is headroom. */
export const QUALITY = {
  high: { pr: 1.5, shadow: 512, texSize: 512, dust: 70, mats: 'std', lamps: 2, head: true, cone: true },
  medium: { pr: 2, shadow: 0, texSize: 512, dust: 70, mats: 'lambert-n', lamps: 1, head: false, cone: true },
  low: { pr: 1.25, shadow: 0, texSize: 256, dust: 30, mats: 'lambert', lamps: 1, head: false, cone: false }
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const flick = (ph, t) => { const s = Math.sin(t * 13 + ph) * Math.sin(t * 7.3 + ph * 2); return s > 0.55 ? 0.1 : s > 0.3 ? 0.55 : 1; };

function matcap() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(24, 22, 2, 32, 32, 34); g.addColorStop(0, '#d8d8d8'); g.addColorStop(0.5, '#707070'); g.addColorStop(1, '#202020'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
let _blob = null; function blobTex() { if (_blob) return _blob; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _blob = new THREE.CanvasTexture(c); _blob.userData = { shared: true }; return _blob; }
export class View {
  constructor(canvas, qualityName, opts) {
    this.canvas = canvas; this.qName = qualityName || 'medium'; this.Q = QUALITY[this.qName]; this.t = 0; this.bob = 0; this.reachT = 0; this.shake = 0; this.world = null; this.built = null; this.cr = [];
    this.resScale = 1; this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !!(opts && opts.aa), powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.55;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.renderer.shadowMap.autoUpdate = false;   // the flashlight shadow is refreshed every other frame (half the shadow cost, not noticeable)
     this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 60); this.camera.rotation.order = 'YXZ';
    this.menuMode = false; this.setQuality(this.qName); this.buildHands(); this.frames = 0; this.slow = 0; this.brightness = 1;
  }
  setQuality(name) {
    this.qName = name; this.Q = QUALITY[name]; this.applyRes(); this.renderer.shadowMap.enabled = !!this.Q.shadow;
    this.resize(); if (this.flash) { this.flash.castShadow = !!this.Q.shadow; if (this.Q.shadow) { this.flash.shadow.mapSize.set(this.Q.shadow, this.Q.shadow); if (this.flash.shadow.map) { this.flash.shadow.map.dispose(); this.flash.shadow.map = null; } } }
  }
  applyRes() { this.renderer.setPixelRatio(Math.max(0.6, Math.min(window.devicePixelRatio || 1, this.Q.pr) * this.resScale)); }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.baseFov = w / h < 1 ? 82 : 70; this.camera.fov = this.baseFov; this.camera.updateProjectionMatrix(); this.portrait = w / h < 1;
  }
  /* ---- first-person hands + flashlight model, parented to the camera ---- */
  buildHands() {
    const mc = matcap(), hands = new THREE.Group(), body = new THREE.MeshMatcapMaterial({ color: 0x48505a, matcap: mc }), glove = new THREE.MeshMatcapMaterial({ color: 0x3a2e24, matcap: mc }), sleeve = new THREE.MeshMatcapMaterial({ color: 0x4a4d40, matcap: mc }), lens = new THREE.MeshBasicMaterial({ color: 0xfff6dd });
    /* a proper torch: ribbed aluminium barrel, a flared head with a bezel, a glowing lens, a rubber switch */
    const alu = new THREE.MeshMatcapMaterial({ color: 0xd0d8e2, matcap: mc }), rub = new THREE.MeshMatcapMaterial({ color: 0x1c1f23, matcap: mc }), bez = new THREE.MeshMatcapMaterial({ color: 0xb4bcc6, matcap: mc });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 16), alu); tube.rotation.x = Math.PI / 2; tube.position.z = 0.01; hands.add(tube);
    const ribs = []; for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0325, 0.0325, 0.012, 16), rub); r.rotation.x = Math.PI / 2; r.position.z = 0.06 - i * 0.03; hands.add(r); ribs.push(r); }
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.036, 0.075, 18), alu); head.rotation.x = Math.PI / 2; head.position.z = -0.135; hands.add(head);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.007, 8, 22), bez); bezel.position.z = -0.173; hands.add(bezel);
    const lensM = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), lens); lensM.position.z = -0.1735; lensM.rotation.y = Math.PI; hands.add(lensM); this.lens = lensM;
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.03), rub); sw.position.set(0, 0.034, -0.02); hands.add(sw);
    const lglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff1d0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, opacity: 0.55 })); lglow.scale.setScalar(0.22); lglow.position.z = -0.185; lglow.renderOrder = 6; hands.add(lglow); this.lensGlow = lglow;
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0125, 0.045, 3, 6), glove); f.rotation.z = Math.PI / 2; f.position.set(0, -0.028 + i * 0.0, 0.0 + 0.02 - i * 0.026); f.rotation.x = 0; f.position.set(0.0, -0.01, 0.06 - i * 0.027); f.scale.set(1, 1.2, 1); f.rotation.z = Math.PI / 2; hands.add(f); }
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.12), glove); palm.position.set(0.005, -0.03, 0.05); hands.add(palm);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 3, 6), glove); thumb.position.set(-0.04, 0.0, 0.03); thumb.rotation.set(0.2, 0, 0.5); hands.add(thumb);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 10), sleeve); forearm.rotation.x = Math.PI / 2 - 0.35; forearm.position.set(0.0, -0.08, 0.28); hands.add(forearm);
    /* the free hand, used for pickups / doors */
    const free = new THREE.Group(); const fp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.1), glove); free.add(fp); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.055, 3, 6), glove); f.rotation.x = Math.PI / 2; f.position.set(-0.026 + i * 0.0175, 0, -0.075); free.add(f); }
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.05, 0.45, 10), sleeve); fa.rotation.x = Math.PI / 2; fa.position.z = 0.28; free.add(fa);
    this.free = free; free.visible = false; this.hands = hands; this.handRoot = new THREE.Group(); this.handRoot.add(hands); this.handRoot.add(free); this.camera.add(this.handRoot); hands.position.set(0.17, -0.2, -0.32); hands.rotation.set(0.06, 0.12, 0); free.position.set(-0.16, -0.24, -0.34);
    for (const m of [tube, head, lensM, bezel, sw, ...ribs]) m.renderOrder = 5; this.camera.layers.enableAll();
    /* flashlight */
    this.flash = new THREE.SpotLight(0xfff4e0, 300, 36, 0.66, 1.0, 1.25); this.flash.castShadow = !!this.Q.shadow; this.flash.shadow.mapSize.set(this.Q.shadow || 512, this.Q.shadow || 512); this.flash.shadow.bias = -0.0006; this.flash.shadow.radius = 2; this.flash.shadow.camera.near = 0.3; this.flash.shadow.camera.far = 24;
    this.flashTarget = new THREE.Object3D(); this.flashRig = new THREE.Object3D(); this.flashRig.add(this.flash); this.flashRig.add(this.flashTarget); this.flashTarget.position.set(0, 0, -6); this.flash.target = this.flashTarget; this.flash.position.set(0.15, -0.12, -0.1);
    const coneG = new THREE.ConeGeometry(2.6, 11, 24, 1, true); coneG.translate(0, -5.5, 0); coneG.rotateX(Math.PI / 2);
    this.coneMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uInt: { value: 0.1 }, uCol: { value: new THREE.Color(0xfff0d8) } }, fog: false,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vA; void main(){ vN = normalMatrix * normal; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = mv.xyz; vA = clamp(-position.z / 11.0, 0.0, 1.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uInt; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying float vA; void main(){ float e = pow(abs(dot(normalize(vN), normalize(-vV))), 1.6); float a = e * (1.0 - vA) * smoothstep(0.0, 0.08, vA) * uInt; gl_FragColor = vec4(uCol * a, a); }' });
    this.cone = new THREE.Mesh(coneG, this.coneMat); this.cone.frustumCulled = false; this.flashRig.add(this.cone); this.cone.position.copy(this.flash.position);
  }
  /* ---- level ---- */
  loadLevel(world) {
    this.disposeLevel(); this.world = world; this.menuMode = false; const b = this.built = buildScene(world, this.Q); const sc = b.scene; sc.add(this.camera); sc.add(this.flashRig);
    /* pooled lights */
    this.pool = []; for (let i = 0; i < this.Q.lamps; i++) { const l = new THREE.PointLight(b.TH.lamp, 0, 11, 2); sc.add(l); this.pool.push(l); }
    this.head = null; if (this.Q.head) { this.head = new THREE.PointLight(0xffe2c0, 3.2, 7, 2); sc.add(this.head); } this.mlights = [0].map(() => { const l = new THREE.PointLight(0xff2a1a, 0, 9, 2); sc.add(l); return l; });
    /* dust */
    const n = this.Q.dust; const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = Math.random() * 3; pos[i * 3 + 2] = (Math.random() - 0.5) * 12; } g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8e0e8, size: 0.028, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })); this.dust.frustumCulled = false; sc.add(this.dust); this.dustBase = pos.slice();
    /* creatures: the body and its sonar silhouette */
    this.cr = world.creatures.map(c => {
      const gm = ghostMaterial();
      if (GLBMonster.ready) { const g = GLBMonster.build(c.t, this.Q); g.ghost.material = gm; sc.add(g.root); const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.8 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; blob.renderOrder = 1; sc.add(blob); return { c, real: g.root, ghost: g.ghost, gm, blob, glb: g.inst }; }
      const mats = creatureMaterials(c.t), real = buildCreature(c.t, mats, true), ghost = buildCreature(c.t, { skin: gm, bone: gm, eye: gm }, false); ghost.traverse(o => { o.renderOrder = 999; }); ghost.visible = false; sc.add(real); sc.add(ghost); const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.8 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; blob.renderOrder = 1; sc.add(blob); return { c, real, ghost, gm, mats, blob };
    });
    this.ex = buildExtras(world, sc, this.Q); this.flickT = 0; this.kickT = 0; this.fogBase = sc.fog.density;
    /* scare director props: a pair of eyes far down a corridor, and a lights-out timer */
    const eg = new THREE.Group(); for (const sx of [-0.09, 0.09]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff2a20, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true, opacity: 0 })); sp.scale.set(0.5, 0.5, 1); sp.position.x = sx; eg.add(sp); } eg.visible = false; sc.add(eg); this.eyeFx = { g: eg, t: 0, dur: 1 }; this.blackoutT = 0;
    this.bobPhase = 0; this.hurtT = 0; this.deadT = 0; this.winT = 0; this.updateCamera(world, 0, 0);
  }
  flashEyes(x, z, dur, h) { this.eyeFx.g.position.set(x, h || 1.55, z); this.eyeFx.t = this.eyeFx.dur = dur || 1.6; this.eyeFx.g.visible = true; }
  blackout(sec) { this.blackoutT = sec; }
  flicker(sec) { this.flickT = Math.max(this.flickT || 0, sec); }
  /* a hit: the view jerks away from the source, the lamp stutters */
  kick(amt, bearing) { this.kickT = 0.55; this.kickA = Math.min(1, amt / 12); this.kickB = bearing || 0; this.shake = Math.max(this.shake || 0, 0.45); }
  disposeLevel() {
    if (!this.built) return; const sc = this.built.scene; sc.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose(); if (o.geometry && !(o.geometry.userData && o.geometry.userData.shared)) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.userData && m.userData.shared) return; for (const k of ['map', 'normalMap', 'emissiveMap']) if (m[k] && !(m[k].userData && m[k].userData.shared)) m[k].dispose(); m.dispose(); }); });
    for (const e of this.cr || []) if (e.glb) { e.glb.mixer.stopAllAction(); e.glb.mixer.uncacheRoot(e.glb.inner); }   // release the clip bindings of this level's creatures
    this.built = null; this.cr = []; this.ex = null;
  }
  /* ---- per frame ---- */
  frame(world, dt, now, fx) {
    if (!this.built) return; fx = fx || {}; this.t = now; const p = world.player, b = this.built, dyn = b.dyn, TH = b.TH;
    this.alpha = fx.alpha === undefined ? 1 : fx.alpha; this.lookOv = fx.look || null;
    if (!fx.menu) this.updateCamera(world, dt, now); this.updateDynamic(world, dt, now);
    if (this.ex) { this.ex.update(world, dt, now, this.alpha); const sk = this.steamK = (this.steamK || 0) + ((world.inSteam ? 1 : 0) - (this.steamK || 0)) * Math.min(1, dt * 3); b.scene.fog.density = this.fogBase * (1 + 2.2 * sk); }
    /* pooled lamps: the three nearest live fixtures light the scene; flickering ones really flicker */
    const cx = this.camera.position.x, cz = this.camera.position.z; const near = [];
    if (this.blackoutT > 0) this.blackoutT -= dt; if (this.flickT > 0) this.flickT -= dt; const ef = this.eyeFx; if (ef.t > 0) { ef.t -= dt; const u = 1 - ef.t / ef.dur, o = ef.t <= 0 ? 0 : u < 0.15 ? u / 0.15 : (u > 0.55 && u < 0.62) || (u > 0.8 && u < 0.84) ? 0 : 1; ef.g.children.forEach(c => { c.material.opacity = o * 0.95; }); ef.g.visible = ef.t > 0; ef.g.lookAt(this.camera.position.x, ef.g.position.y, this.camera.position.z); }
    const awake = this._awake || (this._awake = []); awake.length = 0; for (const c of world.creatures) if (c.state === 'hunt' || c.state === 'investigate' || c.state === 'suspicious') awake.push(c);
    for (const f of b.fixtures) { let k = f.kind === 'dead' ? 0 : f.kind === 'flicker' ? flick(f.ph, now) : 1; if (k && awake.length) for (const c of awake) if ((c.x * TS - f.x) ** 2 + (c.y * TS - f.z) ** 2 < 90) { k = Math.min(k, flick(f.ph + 3, now * 1.7)); break; } if (this.blackoutT > 0) k = 0; else if (this.flickT > 0 && Math.sin(now * 47 + f.ph * 13) < 0.25) k *= 0.04; f.k = k; const fl = f.kind === 'flicker'; if (fl) f.mat.color.setHex(f.col).multiplyScalar(0.12 + 0.88 * k); if (f.kind === 'dead') continue; const d = (f.x - cx) ** 2 + (f.z - cz) ** 2; if (d < 200) near.push([d, f]); }
    near.sort((a, c) => a[0] - c[0]);
    for (let i = 0; i < this.pool.length; i++) { const l = this.pool[i], e = near[i]; if (!e) { l.intensity = 0; continue; } l.position.set(e[1].x, WH - 0.45, e[1].z); l.color.setHex(e[1].col); l.intensity = (world.spec.lightsOut ? 7 : 36) * e[1].k * (1 - i * 0.12); }
    /* sonar pulse */
    const ps = world.pulseState; if (ps) { const age = now - (this.pulseT0 === undefined || this.pulseSrc !== ps ? (this.pulseSrc = ps, this.pulseT0 = now) : this.pulseT0); PULSE.uPulseO.value.set(ps.x * TS, 1.2, ps.y * TS); PULSE.uPulseR.value = age * 15; PULSE.uPulseA.value = age < 1.6 ? 1 : Math.max(0, 1 - (age - 1.6) / 1.8); PULSE.uPulseMax.value = 28; if (age > 3.5) { world.pulseState = null; PULSE.uPulseA.value = 0; } } else PULSE.uPulseA.value = 0;
    PULSE.uTime.value = now;
    /* creatures */
    let li = 0; let nearest = null, nd = 1e9; for (const e of this.cr) { const d = (e.c.x * TS - cx) ** 2 + (e.c.y * TS - cz) ** 2; if (d < nd) { nd = d; nearest = e; } }
    for (const e of this.cr) {
      const c = e.c, al = this.alpha, cxp = c.px === undefined ? c.x : c.px + (c.x - c.px) * al, cyp = c.py === undefined ? c.y : c.py + (c.y - c.py) * al, cyaw = c.pyaw === undefined ? c.yaw : c.pyaw + angDiff(c.pyaw, c.yaw) * al, px = cxp * TS, pz = cyp * TS, rot = Math.PI / 2 - cyaw; e.real.position.set(px, 0, pz); e.real.rotation.y = rot; e.blob.position.set(px, 0.03, pz); const dpl = Math.hypot(p.x - c.x, p.y - c.y); c.lunge = c.state === 'hunt' && p.alive ? clamp(1 - (dpl - 0.9) / 1.1, 0, 1) : (world.over === 'dead' && world.caughtBy === c ? 1 : 0); if (!e.glb) { e.ghost.position.set(px, 0, pz); e.ghost.rotation.y = rot; }
      const dxp = p.x - c.x, dyp = p.y - c.y; let look; if (c.state !== 'roam' && c.state !== 'search' || c.seen) look = -angDiff(c.yaw, Math.atan2(dyp, dxp)) * (Math.hypot(dxp, dyp) < 12 ? 1 : 0);
      if (e.glb) { if (dt > 0 && (Math.hypot(p.x - c.x, p.y - c.y) < 36 || c.revealT > 0)) GLBMonster.update(e.glb, c, world, dt); } else { poseCreature(e.real, c, now, dt, c.seen || c.state === 'hunt' ? look : undefined); if (c.revealT > 0) poseCreature(e.ghost, c, now, dt, c.seen || c.state === 'hunt' ? look : undefined); }
      e.ghost.visible = c.revealT > 0; if (e.ghost.visible) e.gm.opacity = Math.min(1, c.revealT * 1.1) * (0.55 + 0.1 * Math.sin(now * 20));
    }
    if (this.Q.shadow) for (const e of this.cr) if (e.glb && e.glb.skin) e.glb.skin.castShadow = e === nearest;
    for (const e of nearest ? [nearest] : []) { const l = this.mlights[li++], c = e.c, d = Math.hypot(c.x * TS - cx, c.y * TS - cz); l.position.set(c.x * TS, 2.6, c.y * TS); l.color.setHex(c.t === 'sentinel' ? 0x80c8ff : 0xff2a1a); l.intensity = d < 16 ? (c.state === 'hunt' ? 5 : 1.1) * (0.8 + 0.2 * Math.sin(now * 5 + c.id)) : 0; } for (; li < 1; li++) this.mlights[li].intensity = 0;
    /* dust drifts around the camera */
    const pos = this.dust.geometry.attributes.position, base = this.dustBase; for (let i = 0; i < pos.count; i++) { const x = base[i * 3] + Math.sin(now * 0.2 + i) * 0.4 + now * 0.05, y = base[i * 3 + 1] + Math.sin(now * 0.3 + i * 1.7) * 0.3, z = base[i * 3 + 2] + Math.cos(now * 0.25 + i * 0.7) * 0.4; pos.setXYZ(i, cx + ((x + 6) % 12 + 12) % 12 - 6, ((y % 3) + 3) % 3, cz + ((z + 6) % 12 + 12) % 12 - 6); } pos.needsUpdate = true;
    if (this.head) { this.head.position.copy(this.camera.position); this.head.intensity = world.spec.lightsOut ? 1.2 : 3.2 * (world.player.flash ? 1 : 0.5); }
    this.renderer.toneMappingExposure = 1.55 * this.brightness * (world.spec.lightsOut ? 1.15 : 1);
    this.renderer.shadowMap.needsUpdate = this.frames % 3 === 0; this.renderer.render(b.scene, this.camera);
    /* dynamic resolution: when frames run long the render resolution drops a notch (never below 0.6x), with headroom it climbs back; only if still slow at the floor does the quality tier drop */
    this.frames++; if (dt > 0 && dt < 0.5) { this.ftSum = (this.ftSum || 0) + dt; this.ftN = (this.ftN || 0) + 1; }
    if (this.ftN >= 40) { const avg = this.ftSum / this.ftN; this.ftSum = 0; this.ftN = 0; this.cool = (this.cool || 0) - 1;
      if (this.cool <= 0) { if (avg > 0.0195) { if (this.resScale > 0.62) { this.resScale = Math.max(0.6, this.resScale - 0.12); this.applyRes(); this.resize(); this.cool = 2; } else if (this.autoQ && this.qName !== 'low') { this.resScale = 0.85; this.setQuality(this.qName === 'high' ? 'medium' : 'low'); if (this.onQuality) this.onQuality(this.qName); this.cool = 3; } }
        else if (avg < 0.0145 && this.resScale < 1) { this.resScale = Math.min(1, this.resScale + 0.06); this.applyRes(); this.resize(); this.cool = 3; } } }
  }
  updateCamera(world, dt, now) {
    const p = world.player, cam = this.camera, al = this.alpha === undefined ? 1 : this.alpha; let x = (p.px === undefined ? p.x : p.px + (p.x - p.px) * al) * TS, z = (p.py === undefined ? p.y : p.py + (p.y - p.py) * al) * TS, y = p.crouch ? 1.05 : 1.62; const k = Math.min(1, dt * 10); this.eyeY = this.eyeY === undefined ? y : this.eyeY + (y - this.eyeY) * k; y = this.eyeY;
    this.bobPhase += p.speed * dt * 1.9 * TS * 0.5; const ampT = p.speed > 0.1 ? (p.sprint ? 0.07 : p.crouch ? 0.02 : 0.04) : 0.004; this.bobAmp = this.bobAmp === undefined ? ampT : this.bobAmp + (ampT - this.bobAmp) * Math.min(1, dt * 6); const amp = this.bobAmp;   // the sway fades in and out instead of snapping
    let bx = Math.sin(this.bobPhase) * amp * 0.6, by = (Math.abs(Math.sin(this.bobPhase)) * 0.85 + Math.sin(this.bobPhase * 2 + 0.6) * 0.15) * amp - amp * 0.5; if (p.speed <= 0.1) by = Math.sin(now * 1.3) * 0.004 + by * 0.5;
    { const sy0 = this.lookOv ? this.lookOv.yaw : p.yaw, sr = -Math.sin(sy0) * (p.vx || 0) + Math.cos(sy0) * (p.vy || 0); this.leanRoll = (this.leanRoll || 0) + ((-sr * 0.016) - (this.leanRoll || 0)) * Math.min(1, dt * 7);   // lean into a sidestep
      const fovT = (this.baseFov || 70) + (p.sprint ? 5 : 0); this.fovNow = this.fovNow === undefined ? fovT : this.fovNow + (fovT - this.fovNow) * Math.min(1, dt * 5); if (Math.abs(this.camera.fov - this.fovNow) > 0.05) { this.camera.fov = this.fovNow; this.camera.updateProjectionMatrix(); } }
    let yaw = this.lookOv ? this.lookOv.yaw : p.yaw, pitch = this.lookOv ? this.lookOv.pitch : p.pitch, roll = -bx * 0.8 + (this.leanRoll || 0);
    if (p.vent) { const v = p.vent, t = Math.min(1, v.t / v.dur), a = [v.from.x + 0.5 + Math.cos(v.from.face) * 0.9, v.from.y + 0.5 + Math.sin(v.from.face) * 0.9], bb = [v.to.x + 0.5 + Math.cos(v.to.face) * 0.9, v.to.y + 0.5 + Math.sin(v.to.face) * 0.9]; x = (a[0] + (bb[0] - a[0]) * t) * TS; z = (a[1] + (bb[1] - a[1]) * t) * TS; y = 0.42 + Math.sin(now * 7) * 0.02; yaw = Math.atan2(bb[1] - a[1], bb[0] - a[0]); pitch = 0; }
    if (p.hidden >= 0) { y = 1.5; }
    let sx = 0, sy = 0; if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); sx = (Math.random() - 0.5) * this.shake * 0.12; sy = (Math.random() - 0.5) * this.shake * 0.12; }
    if (!p.alive && world.caughtBy) { this.deadT += dt; const c = world.caughtBy; const look = Math.atan2(c.y - p.y, c.x - p.x); yaw += angDiff(yaw, look) * Math.min(1, this.deadT * 4); y = Math.max(0.35, y - this.deadT * 1.1); pitch = 0.1 + this.deadT * 0.1; roll = Math.min(1.2, this.deadT * 1.6); sx += (Math.random() - 0.5) * 0.1 * Math.max(0, 0.8 - this.deadT); }
    else if (!p.alive) { this.deadT += dt; y = Math.max(0.35, y - this.deadT * 1.1); pitch += 0.25 * Math.min(1, this.deadT); roll = Math.min(1.2, this.deadT * 1.4); }
    if (this.kickT > 0) { this.kickT = Math.max(0, this.kickT - dt); const u = this.kickT / 0.55, e = u * u * this.kickA; pitch += 0.22 * e; roll += Math.sin(this.kickB) * 0.28 * e; yaw += Math.cos(this.kickB) * 0.07 * e; y -= 0.12 * e; }
    cam.position.set(x - Math.sin(yaw) * 0 + sx, y + by + sy, z); cam.rotation.set(pitch, -Math.PI / 2 - yaw, roll, 'YXZ');
    cam.updateMatrixWorld(true);
    /* flashlight follows with a little lag, so it feels held */
    if (!this.flashQ) { this.flashQ = new THREE.Quaternion().copy(cam.quaternion); }
    this.flashQ.slerp(cam.quaternion, 1 - Math.exp(-dt * 16)); this.flashRig.quaternion.copy(this.flashQ); this.flashRig.position.copy(cam.position);
    const on = p.flash && p.alive && p.hidden < 0 && !p.vent; let power = on ? 1 : 0; if (on && world.threat > 0.75 && Math.sin(now * 37) > 0.93) power = 0.15; if (on && p.stagger > 0 && Math.sin(now * 55) > 0.1) power = 0.2; if (on && world.spec.lightsOut) power = 1;
    this.flash.intensity += (power * 300 * (1 + 0.025 * Math.sin(now * 9)) - this.flash.intensity) * Math.min(1, dt * 20); this.coneMat.uniforms.uInt.value = this.flash.intensity / 300 * (this.portrait ? 0.12 : 0.1); this.cone.visible = this.Q.cone && this.flash.intensity > 3; this.lens.visible = on; this.lens.material.color.setScalar(on ? 1 : 0.05); if (this.lensGlow) { this.lensGlow.visible = on; this.lensGlow.material.opacity = 0.35 + 0.2 * (this.flash.intensity / 300); }
    /* hands: bob, sway, reach */
    const hs = p.sprint ? 1.8 : 1; this.hands.position.set(0.17 + Math.sin(this.bobPhase) * 0.008 * hs, -0.2 + Math.abs(Math.sin(this.bobPhase)) * 0.012 * hs + (p.crouch ? 0.01 : 0), -0.32); this.hands.rotation.set(0.06 + Math.sin(this.bobPhase * 2) * 0.01, 0.12, Math.sin(this.bobPhase) * 0.02);
    this.handRoot.visible = p.alive && p.hidden < 0 && !p.vent;
    if (this.reachT > 0) { this.reachT -= dt; const u = Math.sin(Math.PI * (1 - this.reachT / 0.45)); this.free.visible = true; this.free.position.set(-0.12 + 0.12 * u, -0.26 + 0.08 * u, -0.34 - 0.22 * u); this.free.rotation.set(0.3 * u, -0.1, 0.05); } else this.free.visible = false;
  }
  menuFrame(world, dt, now) { this.frame(world, dt, now, { menu: true }); }
  reach() { this.reachT = 0.45; }
  updateDynamic(world, dt, now) {
    const b = this.built, dyn = b.dyn, p = world.player;
    for (const d of dyn.doors) { const o = d.o; d.g.position.y = o.open * 2.6; const ok = !o.locked; d.lightM.color.setHex(ok ? 0x30ff70 : 0xff2a20); if (o.hidden) { d.wallSlab.visible = !o.revealed; d.g.visible = o.revealed; } if (d.pad) { d.pad.visible = true; } d.slabM.emissive.setHex(o.pingT > 0 ? 0x1a6fa8 : 0x000000); }
    for (const it of dyn.items) { const o = it.o; it.g.visible = !o.taken; if (o.taken) continue; it.g.position.y = 0.95 + Math.sin(now * 2 + o.bob) * 0.06; it.g.rotation.y = now * 0.9 + o.bob; it.gl.material.opacity = (0.45 + 0.15 * Math.sin(now * 3 + o.bob)) * (o.pingT > 0 ? 2.2 : 1); it.gl.scale.setScalar(o.pingT > 0 ? 2 : 1.1); }
    for (const n of dyn.notes) { n.gl.material.opacity = (0.3 + 0.1 * Math.sin(now * 2)) * (n.o.pingT > 0 ? 2.5 : 1); }
    for (const g of dyn.gens) { g.il.color.setHex(g.o.on ? 0x30ff70 : 0xff2200); if (g.o.on) { g.fan.rotation.z += dt * 18; g.g.position.y = Math.sin(now * 55) * 0.004; } }
    for (const v of dyn.valves) if (v.kind === 'breaker') { const d = v.o.done; v.led.color.setHex(d ? 0x30ff70 : 0xff2a1a); v.glow.material.color.setHex(d ? 0x40ff80 : 0xff9a2a); v.levers.forEach((l, i) => { const t = d ? 0.9 : -0.9; l.rotation.x += (t - l.rotation.x) * Math.min(1, dt * 9); }); }
    for (const v of dyn.valves) if (v.kind === 'valve') v.wheel.rotation.z = v.o.done ? (v.o.turn = Math.min(6.28 * 3, (v.o.turn || 0) + dt * 6)) : 0;
    if (dyn.exitGlow) dyn.exitGlow.material.opacity = 0.65 + 0.2 * Math.sin(now * 2);
    /* water slowly moves */
    if (b.waterMesh) { const t = b.tex.water.normal; t.offset.set(now * 0.01, now * 0.007); }
  }
  /* title screen: a slow dolly down the first corridor with a creature far ahead */
  setMenuCamera(world, t) {
    const p = world.player, k = Math.min(3.2, t * 0.22); const x = (p.x + Math.cos(p.yaw) * k) * TS, z = (p.y + Math.sin(p.yaw) * k) * TS; this.camera.position.set(x, 1.5 + Math.sin(t * 0.5) * 0.02, z); this.camera.rotation.set(0.0, -Math.PI / 2 - p.yaw + Math.sin(t * 0.3) * 0.07, 0, 'YXZ');
  }
}
