/* The first-person view: WebGL renderer, camera (bob, crouch, vent crawl, death), flashlight with a visible volumetric beam, hands, dust, pooled emergency lights,
   creature models + sonar silhouettes, the sonar pulse uniforms. Reads a World; never changes it. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildExtras } from './extras3d.js';
import { newAcc, buildProp, PROP_KINDS } from './objects3d.js';
import { buildTorch, torchById } from './torches.js';
import { buildScene, PULSE, TS, WH, THEME, glowTex, patchPulse } from './scene3d.js';
import { buildCreature, poseCreature, creatureMaterials, ghostMaterial } from './creature3d.js';
import { angDiff } from '../logic/rng.js';
import { GLBMonster } from './monster_glb.js';

/* high: PBR + normal maps + flashlight shadows (desktop). medium: cheap lit materials with normal maps, full resolution, no shadow pass (phones). low: plain materials, lower resolution.
   The pixel ratio is the CAP: the real ratio is scaled down automatically when frames get slow (dynamic resolution), and back up when there is headroom. */
/* One graphics tier for every device, tuned so a phone keeps its frame rate: cheap per-pixel lit materials with normal maps, no shadow pass, two pooled lamps, a 1.5x pixel-ratio cap that the
   dynamic resolution scaler lowers (down to 0.6x) the moment frames run long and raises again with headroom. The names stay only so older saves and callers keep working. */
const TIER = { pr: 1.5, shadow: 0, texSize: 512, dust: 60, mats: 'lambert-n', lamps: 2, head: false, cone: true };
export const QUALITY = { high: TIER, medium: TIER, low: TIER };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const flick = (ph, t) => { const s = Math.sin(t * 13 + ph) * Math.sin(t * 7.3 + ph * 2); return s > 0.55 ? 0.1 : s > 0.3 ? 0.55 : 1; };

function matcap() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(24, 22, 2, 32, 32, 34); g.addColorStop(0, '#d8d8d8'); g.addColorStop(0.5, '#707070'); g.addColorStop(1, '#202020'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
let _blob = null; function blobTex() { if (_blob) return _blob; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _blob = new THREE.CanvasTexture(c); _blob.userData = { shared: true }; return _blob; }
export class View {
  constructor(canvas, qualityName, opts) {
    this.canvas = canvas; this.qName = qualityName || 'medium'; this.Q = QUALITY[this.qName]; this.t = 0; this.bob = 0; this.reachT = 0; this.shake = 0; this.world = null; this.built = null; this.cr = [];
    this.resScale = 1; this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !!(opts && opts.aa), powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 0.85;
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
    const mc = matcap(), hands = new THREE.Group(), body = new THREE.MeshMatcapMaterial({ color: 0x48505a, matcap: mc }), glove = new THREE.MeshMatcapMaterial({ color: 0xa28b6c, matcap: mc }), sleeve = new THREE.MeshMatcapMaterial({ color: 0x4a4d40, matcap: mc }), lens = new THREE.MeshBasicMaterial({ color: 0xfff6dd });
    this.torchSlot = new THREE.Group(); hands.add(this.torchSlot); this.torchModels = {}; this.mcap = mc;
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0125, 0.045, 3, 6), glove); f.rotation.z = Math.PI / 2; f.position.set(0, -0.028 + i * 0.0, 0.0 + 0.02 - i * 0.026); f.rotation.x = 0; f.position.set(0.0, -0.01, 0.06 - i * 0.027); f.scale.set(1, 1.2, 1); f.rotation.z = Math.PI / 2; hands.add(f); }
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.05, 0.12), glove); palm.position.set(0.005, -0.03, 0.05); hands.add(palm);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.05, 3, 6), glove); thumb.position.set(-0.04, 0.0, 0.03); thumb.rotation.set(0.2, 0, 0.5); hands.add(thumb);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 10), sleeve); forearm.rotation.x = Math.PI / 2 - 0.35; forearm.position.set(0.0, -0.08, 0.28); hands.add(forearm);
    /* the free hand, used for pickups / doors */
    const free = new THREE.Group();                                           // the right hand: an open palm facing forward, fingers up (pushes a door / grabs an item)
    const palm2 = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), glove); palm2.scale.set(0.05, 0.046, 0.013); free.add(palm2);
    const fing = (x, len, tilt) => { const g1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0105, len * 0.55, 3, 8), glove), g2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0092, len * 0.5, 3, 8), glove); g1.position.set(x, 0.058 + len * 0.28, -0.002); g1.rotation.set(-0.08, 0, tilt); g2.position.set(x + tilt * -0.55 * len * 0.5, 0.058 + len * 0.78, -0.012); g2.rotation.set(-0.38, 0, tilt * 1.2); free.add(g1, g2); };
    fing(-0.03, 0.06, 0.06); fing(-0.01, 0.07, 0.02); fing(0.011, 0.068, -0.02); fing(0.031, 0.055, -0.07);
    const th2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0145, 0.045, 3, 8), glove); th2.position.set(0.056, 0.0, -0.004); th2.rotation.set(-0.2, 0, -0.9); free.add(th2);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.04, 0.05, 12), sleeve); cuff.position.set(-0.01, -0.07, 0.01); cuff.rotation.x = Math.PI / 2 - 0.5; free.add(cuff);
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.046, 0.5, 10), sleeve); wrist.rotation.x = Math.PI / 2 - 0.5; wrist.position.set(-0.03, -0.2, 0.22); wrist.rotation.z = 0.25; free.add(wrist);
    this.free = free; free.visible = false; this.hands = hands; this.handRoot = new THREE.Group(); this.handRoot.add(hands); this.handRoot.add(free); this.camera.add(this.handRoot); hands.position.set(0.17, -0.2, -0.32); hands.rotation.set(0.06, 0.12, 0); free.position.set(-0.24, -0.4, -0.3);
    this.camera.layers.enableAll();
    /* flashlight */
    this.flash = new THREE.SpotLight(0xfff4e0, 900, 14, 0.49, 0.6, 2); this.flash.castShadow = !!this.Q.shadow; this.flash.shadow.mapSize.set(this.Q.shadow || 512, this.Q.shadow || 512); this.flash.shadow.bias = -0.0006; this.flash.shadow.radius = 2; this.flash.shadow.camera.near = 0.3; this.flash.shadow.camera.far = 24;
    this.flashTarget = new THREE.Object3D(); this.flashRig = new THREE.Object3D(); this.flashRig.add(this.flash); this.flashRig.add(this.flashTarget); this.flashTarget.position.set(0, 0, -6); this.flash.target = this.flashTarget; this.flash.position.set(0.15, -0.12, -0.1);
    const coneG = new THREE.ConeGeometry(2.6, 11, 24, 1, true); coneG.translate(0, -5.5, 0); coneG.rotateX(Math.PI / 2);
    this.coneMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uInt: { value: 0.1 }, uCol: { value: new THREE.Color(0xfff0d8) } }, fog: false,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vA; void main(){ vN = normalMatrix * normal; vec4 mv = modelViewMatrix * vec4(position,1.0); vV = mv.xyz; vA = clamp(-position.z / 11.0, 0.0, 1.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uInt; uniform vec3 uCol; varying vec3 vN; varying vec3 vV; varying float vA; void main(){ float e = pow(abs(dot(normalize(vN), normalize(-vV))), 1.6); float a = e * (1.0 - vA) * smoothstep(0.0, 0.08, vA) * uInt; gl_FragColor = vec4(uCol * a, a); }' });
    this.cone = new THREE.Mesh(coneG, this.coneMat); this.cone.frustumCulled = false; this.flashRig.add(this.cone); this.cone.position.copy(this.flash.position);
    this.torchI = 900; this.torchCur = null; this.applyTorch(this.torchId || 'standard');
  }
  /* ---- level ---- */
  loadLevel(world) {
    this.disposeLevel(); this.world = world; this.menuMode = false; const b = this.built = buildScene(world, this.Q); const sc = b.scene; sc.add(this.camera); sc.add(this.flashRig);
    /* pooled lights */
    this.pool = []; for (let i = 0; i < this.Q.lamps; i++) { const l = new THREE.PointLight(b.TH.lamp, 0, 11, 2); sc.add(l); this.pool.push(l); }
    this.head = null; if (this.Q.head) { this.head = new THREE.PointLight(0xffe2c0, 3.2, 7, 2); sc.add(this.head); } this.mlights = [0].map(() => { const l = new THREE.PointLight(0xff2a1a, 0, 9, 2); sc.add(l); return l; });
    /* dust */
    const n = this.Q.dust; const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = Math.random() * 3; pos[i * 3 + 2] = (Math.random() - 0.5) * 12; } g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uO: { value: new THREE.Vector3() }, uD: { value: new THREE.Vector3(0, 0, -1) }, uCos: { value: Math.cos(0.49) }, uI: { value: 1 }, uPx: { value: 4 } },
      vertexShader: 'uniform vec3 uO, uD; uniform float uCos, uI, uPx; varying float vA; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vec3 d = wp.xyz - uO; float L = max(length(d), 0.01); float c = dot(d / L, uD); float cone = smoothstep(uCos - 0.1, uCos + 0.1, c); vA = cone * (1.0 - smoothstep(1.5, 13.0, L)) * uI * 0.9 + 0.035 * (1.0 - smoothstep(0.0, 5.0, L)); gl_PointSize = uPx * (0.7 + 2.2 / (0.6 + L * 0.3)); gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: 'varying float vA; void main() { vec2 q = gl_PointCoord - 0.5; float r = length(q); if (r > 0.5) discard; gl_FragColor = vec4(vec3(0.86, 0.9, 0.96), vA * smoothstep(0.5, 0.05, r)); }' });
    this.dust = new THREE.Points(g, this.dustMat); this.dust.frustumCulled = false; sc.add(this.dust); this.dustBase = pos.slice();
    /* creatures: the body and its sonar silhouette */
    this.cr = world.creatures.map(c => {
      const gm = ghostMaterial();
      if (GLBMonster.ready) { const g = GLBMonster.build(c.t, this.Q); g.ghost.material = gm; sc.add(g.root); const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.1), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.8 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; blob.renderOrder = 1; sc.add(blob); return { c, real: g.root, ghost: g.ghost, gm, blob, glb: g.inst }; }
      const mats = creatureMaterials(c.t), real = buildCreature(c.t, mats, true), ghost = buildCreature(c.t, { skin: gm, bone: gm, eye: gm }, false); ghost.traverse(o => { o.renderOrder = 999; }); ghost.visible = false; sc.add(real); sc.add(ghost); const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.8 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; blob.renderOrder = 1; sc.add(blob); return { c, real, ghost, gm, mats, blob };
    });
    this.ex = buildExtras(world, sc, this.Q); this.ex.dyn = b.dyn; this.redT0 = undefined; this.rhythm = false; this.pullPos = null; this.eggW = 0; this.ghosts = []; this.hugeM = null; this.flickT = 0; this.kickT = 0; this.fogBase = sc.fog.density;
    /* scare director props: a pair of eyes far down a corridor, and a lights-out timer */
    const eg = new THREE.Group(); for (const sx of [-0.09, 0.09]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff2a20, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true, opacity: 0 })); sp.scale.set(0.5, 0.5, 1); sp.position.x = sx; eg.add(sp); } eg.visible = false; sc.add(eg); this.eyeFx = { g: eg, t: 0, dur: 1 }; this.blackoutT = 0;
    this.bobPhase = 0; this.hurtT = 0; this.deadT = 0; this.winT = 0; this.updateCamera(world, 0, 0);
  }
  flashEyes(x, z, dur, h) { this.eyeFx.g.position.set(x, h || 1.55, z); this.eyeFx.t = this.eyeFx.dur = dur || 1.6; this.eyeFx.g.visible = true; }
  blackout(sec) { this.blackoutT = sec; }
  /* test/inspection aid: every prop kind on a plain floor under neutral light (rendered instead of the level while this.galleryScene is set) */
  gallery(rows) { const b = this.built, acc = newAcc(), kinds = PROP_KINDS, sc = new THREE.Scene(), cols = Math.ceil(kinds.length / (rows || 3)); sc.background = new THREE.Color(0x14181c); let i = 0; const R = () => 0.37;
    for (const k of kinds) { buildProp(k, acc, (i % cols) * 2.6, Math.floor(i / cols) * 2.8, 0, R, 3.2, i + 1); i++; }
    for (const c of Object.keys(acc)) if (acc[c].length && b.matMap[c]) sc.add(new THREE.Mesh(mergeGeometries(acc[c]), b.matMap[c]));
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), new THREE.MeshLambertMaterial({ color: 0x3a3e42 })); fl.rotation.x = -Math.PI / 2; fl.position.set(10, 0, 4); sc.add(fl);
    sc.add(new THREE.HemisphereLight(0xcfd8e0, 0x30343a, 2.2)); const dl = new THREE.DirectionalLight(0xfff0dd, 2.4); dl.position.set(-6, 10, 14); sc.add(dl);
    this.galleryScene = sc; this.galleryCam = new THREE.PerspectiveCamera(48, this.camera.aspect, 0.1, 80); this.galleryCam.position.set((cols - 1) * 1.3, 9.5, 17); this.galleryCam.lookAt((cols - 1) * 1.3, 0.9, 3.0); return kinds.length; }
  /* torches: the model on the hand, the beam and the cone follow the selected design; changing it lowers the hand, swaps the model and raises it again */
  setTorch(id, instant) { if (!this.torchModels) return; this.torchId = id; if (instant || !this.torchCur) { this.torchSw = null; this.applyTorch(id); return; } if (id !== this.torchCur) this.torchSw = { t: 0, to: id, done: false }; }
  reloadTorch() { if (!this.torchModels) return; if (this.torchActive) this.torchSlot.remove(this.torchActive.g); this.torchModels = {}; this.torchActive = null; this.applyTorch(this.torchId || 'standard'); }
  applyTorch(id) {
    const T = torchById(id); let m = this.torchModels[T.id] || (this.torchModels[T.id] = buildTorch(T.id, this.mcap, glowTex)); if (this.torchActive) this.torchSlot.remove(this.torchActive.g); this.torchSlot.add(m.g); this.torchActive = m; this.lens = m.lens; this.lensGlow = m.glow; this.torchCur = T.id;
    const L = T.light; this.torchI = L.I * 2.6; this.flash.angle = L.angle * 0.75; this.flash.penumbra = Math.max(0.6, L.pen); this.flash.distance = L.dist * 0.4; this.flash.decay = 2; this.flash.color.setHex(L.color); this.coneMat.uniforms.uCol.value.setHex(L.color); const k = Math.tan(L.angle * 0.75) / Math.tan(0.49); this.cone.scale.set(k, k, clamp(L.dist / 36, 0.7, 1.35));
  }
  /* fear-beat visuals: lamps turning red one after another, a figure that only the sonar shows, a huge shape under the floor */
  redWave() { this.redT0 = this.t; const p = this.world.player; for (const f of this.built.fixtures) f.d = Math.hypot(f.x / TS - p.x, f.z / TS - p.y) * 0.35; }
  ghost(x, y) { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); g.strokeStyle = '#7fe4ff'; g.fillStyle = 'rgba(40,160,200,.28)'; g.lineWidth = 3; g.beginPath(); g.arc(32, 22, 11, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(20, 40); g.lineTo(44, 40); g.lineTo(48, 92); g.lineTo(40, 92); g.lineTo(38, 124); g.lineTo(26, 124); g.lineTo(24, 92); g.lineTo(16, 92); g.closePath(); g.fill(); g.stroke();
    const t = new THREE.CanvasTexture(c), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, opacity: 0 })); sp.scale.set(1.2, 2.4, 1); sp.position.set(x * TS, 1.3, y * TS); sp.renderOrder = 998; this.built.scene.add(sp); (this.ghosts = this.ghosts || []).push({ sp, t0: this.t, tex: t }); }
  huge() { const p = this.world.player, m = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshBasicMaterial({ color: 0x1a6a88, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.scale.set(1.5, 0.8, 1); m.position.set(p.x * TS + Math.cos(p.yaw) * 6, 0.07, p.y * TS + Math.sin(p.yaw) * 6); this.built.scene.add(m); this.hugeM = { m, t0: this.t }; }
  flicker(sec) { this.flickT = Math.max(this.flickT || 0, sec); }
  /* a hit: the view jerks away from the source, the lamp stutters */
  kick(amt, bearing) { this.kickT = 0.55; this.kickA = Math.min(1, amt / 12); this.kickB = bearing || 0; this.shake = Math.max(this.shake || 0, 0.45); }
  disposeLevel() {
    this.projMeshes = null;
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
    for (const f of b.fixtures) { let k = f.kind === 'dead' ? 0 : f.kind === 'flicker' ? flick(f.ph, now) : 1; if (k && awake.length) for (const c of awake) if ((c.x * TS - f.x) ** 2 + (c.y * TS - f.z) ** 2 < 90) { k = Math.min(k, flick(f.ph + 3, now * 1.7)); break; } if (this.redT0 !== undefined && now - this.redT0 > (f.d || 0)) f.col = 0xff2a1a; if (this.rhythm && (now % 3.5) / 3.5 < 0.14) k *= 0.15; if (this.blackoutT > 0) k = 0; else if (this.flickT > 0 && Math.sin(now * 47 + f.ph * 13) < 0.25) k *= 0.04; f.k = k; const fl = f.kind === 'flicker'; if (fl) f.mat.color.setHex(f.col).multiplyScalar(0.12 + 0.88 * k); if (f.kind === 'dead') continue; const d = (f.x - cx) ** 2 + (f.z - cz) ** 2; if (d < 200) near.push([d, f]); }
    near.sort((a, c) => a[0] - c[0]);
    for (let i = 0; i < this.pool.length; i++) { const l = this.pool[i], e = near[i]; if (!e) { l.intensity = 0; continue; } l.position.set(e[1].x, (e[1].y || WH) - 0.45, e[1].z); l.color.setHex(e[1].col); l.intensity = (world.spec.lightsOut ? 7 : 36) * (e[1].big ? 1.7 : 1) * e[1].k * (1 - i * 0.12); }
    if (this.ghosts) for (let i = this.ghosts.length - 1; i >= 0; i--) { const g = this.ghosts[i], a = now - g.t0; g.sp.material.opacity = Math.min(1, a / 0.2) * Math.max(0, 1 - (a - 1.2) / 0.9) * 0.85; if (a > 2.2) { this.built.scene.remove(g.sp); g.tex.dispose(); g.sp.material.dispose(); this.ghosts.splice(i, 1); } }
    if (this.hugeM) { const a = now - this.hugeM.t0; this.hugeM.m.material.opacity = Math.sin(Math.PI * Math.min(1, a / 2.6)) * 0.55; this.hugeM.m.scale.setScalar(1.2 + a * 0.1); if (a > 2.6) { this.built.scene.remove(this.hugeM.m); this.hugeM.m.geometry.dispose(); this.hugeM.m.material.dispose(); this.hugeM = null; } }
    { const pm = b.matMap && b.matMap.pod, bt = world.spec.beat; if (pm && bt === 'eggStill') pm.emissiveIntensity = p.moving ? 0.5 + 0.45 * Math.sin(now * 3.2) : 0.1; else if (pm && bt === 'eggCrack' && this.eggW > 0) { this.eggW -= dt; pm.emissiveIntensity = 0.9 + Math.sin(now * 40) * 0.5; } }
    /* sonar pulse */
    const ps = world.pulseState; if (ps) { const age = now - (this.pulseT0 === undefined || this.pulseSrc !== ps ? (this.pulseSrc = ps, this.pulseT0 = now) : this.pulseT0); PULSE.uPulseO.value.set(ps.x * TS, 1.2, ps.y * TS); PULSE.uPulseR.value = age * 15; PULSE.uPulseA.value = age < 1.6 ? 1 : Math.max(0, 1 - (age - 1.6) / 1.8); PULSE.uPulseMax.value = 28; if (age > 3.5) { world.pulseState = null; PULSE.uPulseA.value = 0; } } else PULSE.uPulseA.value = 0;
    PULSE.uTime.value = now;
    /* creatures */
    let li = 0; let nearest = null, nd = 1e9; for (const e of this.cr) { if (e.c.dormant) continue; const d = (e.c.x * TS - cx) ** 2 + (e.c.y * TS - cz) ** 2; if (d < nd) { nd = d; nearest = e; } }
    { const vd = world.vdrop, bv = b.ventDrop; if (vd && bv) { const g = bv.g, st = vd.state;
        if (st === 'wait') { g.position.y = bv.y - 0.07; g.rotation.set(0, 0, 0); }
        else if (st === 'shake') { const k = vd.t < 1.2 ? 1 : 0.3; g.rotation.z = Math.sin(now * 61) * 0.035 * k; g.rotation.x = Math.cos(now * 47) * 0.03 * k; g.position.y = bv.y - 0.07 - Math.max(0, vd.t - 1.0) * 0.18; }
        else if (st === 'fall') { const t = vd.t; g.position.y = Math.max(0.06, bv.y - 0.1 - 4.9 * t * t * 1.6); g.rotation.x += dt * 4; g.rotation.z += dt * 2.5; }
        else if (st === 'done') { g.position.y = 0.06; g.rotation.set(0.08, g.rotation.y, 0.06); } } }
    for (const e of this.cr) {
      const c = e.c, al = this.alpha, cxp = c.px === undefined ? c.x : c.px + (c.x - c.px) * al, cyp = c.py === undefined ? c.y : c.py + (c.y - c.py) * al, cyaw = c.pyaw === undefined ? c.yaw : c.pyaw + angDiff(c.pyaw, c.yaw) * al, px = cxp * TS, pz = cyp * TS, rot = Math.PI / 2 - cyaw; const dropY = c.dropT > 0 ? (b.ventDrop ? b.ventDrop.y : 3.2) * (c.dropT / 0.8) ** 2 : 0; e.real.position.set(px, dropY, pz); e.real.rotation.y = rot; e.blob.position.set(px, 0.03, pz); e.blob.visible = !c.dormant && !(c.dropT > 0); if (c.dormant) { e.real.visible = false; e._dh = true; } else if (e._dh) { e.real.visible = true; e._dh = false; } const dpl = Math.hypot(p.x - c.x, p.y - c.y); c.lunge = c.state === 'hunt' && p.alive ? clamp(1 - (dpl - 0.7) / 0.9, 0, 1) : (world.over === 'dead' && world.caughtBy === c ? 1 : 0); if (!e.glb) { e.ghost.position.set(px, 0, pz); e.ghost.rotation.y = rot; }
      const dxp = p.x - c.x, dyp = p.y - c.y; let look; if (c.state !== 'roam' && c.state !== 'search' || c.seen) look = -angDiff(c.yaw, Math.atan2(dyp, dxp)) * (Math.hypot(dxp, dyp) < 12 ? 1 : 0);
      if (e.glb) { if (dt > 0 && (Math.hypot(p.x - c.x, p.y - c.y) < 36 || c.revealT > 0)) GLBMonster.update(e.glb, c, world, dt); } else { poseCreature(e.real, c, now, dt, c.seen || c.state === 'hunt' ? look : undefined); if (c.revealT > 0) poseCreature(e.ghost, c, now, dt, c.seen || c.state === 'hunt' ? look : undefined); }
      e.ghost.visible = c.revealT > 0; if (e.ghost.visible) e.gm.opacity = Math.min(1, c.revealT * 1.1) * (0.55 + 0.1 * Math.sin(now * 20));
    }
    if (this.Q.shadow) for (const e of this.cr) if (e.glb && e.glb.skin) e.glb.skin.castShadow = e === nearest;
    for (const e of nearest ? [nearest] : []) { const l = this.mlights[li++], c = e.c, d = Math.hypot(c.x * TS - cx, c.y * TS - cz); l.position.set(c.x * TS, 2.6, c.y * TS); l.color.setHex(c.t === 'sentinel' ? 0x80c8ff : 0xff2a1a); l.intensity = d < 16 ? (c.state === 'hunt' ? 5 : 1.1) * (0.8 + 0.2 * Math.sin(now * 5 + c.id)) : 0; } for (; li < 1; li++) this.mlights[li].intensity = 0;
    /* dust drifts around the camera */
    const pos = this.dust.geometry.attributes.position, base = this.dustBase; for (let i = 0; i < pos.count; i++) { const x = base[i * 3] + Math.sin(now * 0.2 + i) * 0.4 + now * 0.05, y = base[i * 3 + 1] + Math.sin(now * 0.3 + i * 1.7) * 0.3, z = base[i * 3 + 2] + Math.cos(now * 0.25 + i * 0.7) * 0.4; pos.setXYZ(i, cx + ((x + 6) % 12 + 12) % 12 - 6, ((y % 3) + 3) % 3, cz + ((z + 6) % 12 + 12) % 12 - 6); } pos.needsUpdate = true;
    { const du = this.dustMat.uniforms; this.camera.getWorldPosition(du.uO.value); this.camera.getWorldDirection(du.uD.value); du.uCos.value = Math.cos(this.flash.angle * 0.9); du.uI.value = Math.min(1, this.flash.intensity / Math.max(1, this.torchI)); du.uPx.value = 3.2 * (this.renderer.getPixelRatio ? this.renderer.getPixelRatio() : 1); }
    if (this.head) { this.head.position.copy(this.camera.position); this.head.intensity = world.spec.lightsOut ? 0.5 : 0.7 * (world.player.flash ? 1 : 0.5); }
    this.renderer.toneMappingExposure = 0.85 * this.brightness * (world.spec.lightsOut ? 1.15 : 1);
    { const PL = world.projectiles || [], pool = this.projMeshes || (this.projMeshes = []); for (let i = 0; i < Math.max(PL.length, pool.length); i++) { let m = pool[i]; if (!m && PL[i]) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 8), new THREE.MeshBasicMaterial({ color: 0x9fe8b4 })); m.frustumCulled = false; b.scene.add(m); pool[i] = m; } if (m) { if (PL[i]) { m.visible = true; m.position.set(PL[i].x * TS, PL[i].z, PL[i].y * TS); m.rotation.set(PL[i].t * 9, 0, PL[i].t * 7); if (m.parent !== b.scene) b.scene.add(m); } else m.visible = false; } } }
    if (this.galleryScene) { this.renderer.render(this.galleryScene, this.galleryCam); return; }
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
    { const sy0 = this.lookOv ? this.lookOv.yaw : p.yaw, sr = -Math.sin(sy0) * (p.vx || 0) + Math.cos(sy0) * (p.vy || 0); this.leanRoll = (this.leanRoll || 0) + ((-Math.max(-1, Math.min(1, sr / 2.6)) * 0.03) - (this.leanRoll || 0)) * Math.min(1, dt * 7);   // lean into a sidestep
      const fovT = (this.baseFov || 72) + (p.sprint ? 8 : 0); this.fovNow = this.fovNow === undefined ? fovT : this.fovNow + (fovT - this.fovNow) * Math.min(1, dt * 5); if (Math.abs(this.camera.fov - this.fovNow) > 0.05) { this.camera.fov = this.fovNow; this.camera.updateProjectionMatrix(); } }
    let yaw = this.lookOv ? this.lookOv.yaw : p.yaw, pitch = this.lookOv ? this.lookOv.pitch : p.pitch, roll = -bx * 0.8 + (this.leanRoll || 0);
    if (p.vent) { const v = p.vent, t = Math.min(1, v.t / v.dur), a = [v.from.x + 0.5 + Math.cos(v.from.face) * 0.9, v.from.y + 0.5 + Math.sin(v.from.face) * 0.9], bb = [v.to.x + 0.5 + Math.cos(v.to.face) * 0.9, v.to.y + 0.5 + Math.sin(v.to.face) * 0.9]; x = (a[0] + (bb[0] - a[0]) * t) * TS; z = (a[1] + (bb[1] - a[1]) * t) * TS; y = 0.42 + Math.sin(now * 7) * 0.02; yaw = Math.atan2(bb[1] - a[1], bb[0] - a[0]); pitch = 0; }
    if (p.hidden >= 0) { y = 1.5; }
    let sx = 0, sy = 0; if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); sx = (Math.random() - 0.5) * this.shake * 0.12; sy = (Math.random() - 0.5) * this.shake * 0.12; }
    if (!p.alive && world.caughtBy) { this.deadT += dt; const c = world.caughtBy; const look = Math.atan2(c.y - p.y, c.x - p.x); yaw += angDiff(yaw, look) * Math.min(1, this.deadT * 4); y = Math.max(0.35, y - this.deadT * 1.1); pitch = 0.1 + this.deadT * 0.1; roll = Math.min(1.2, this.deadT * 1.6); sx += (Math.random() - 0.5) * 0.1 * Math.max(0, 0.8 - this.deadT); }
    else if (!p.alive) { this.deadT += dt; y = Math.max(0.35, y - this.deadT * 1.1); pitch += 0.25 * Math.min(1, this.deadT); roll = Math.min(1.2, this.deadT * 1.4); }
    if (this.kickT > 0) { this.kickT = Math.max(0, this.kickT - dt); const u = this.kickT / 0.55, e = u * u * this.kickA; pitch += 0.22 * e; roll += Math.sin(this.kickB) * 0.28 * e; yaw += Math.cos(this.kickB) * 0.07 * e; y -= 0.12 * e; }
    const LS = p.leanS || 0; if (LS) { x += -Math.sin(yaw) * 0.5 * LS; z += Math.cos(yaw) * 0.5 * LS; roll += -LS * 0.12; }   // Q / E: peek round a corner
    cam.position.set(x - Math.sin(yaw) * 0 + sx, y + by + sy, z); cam.rotation.set(pitch, -Math.PI / 2 - yaw, roll, 'YXZ');
    cam.updateMatrixWorld(true);
    /* flashlight follows with a little lag, so it feels held */
    if (!this.flashQ) { this.flashQ = new THREE.Quaternion().copy(cam.quaternion); }
    this.flashQ.slerp(cam.quaternion, 1 - Math.exp(-dt * 16)); this.flashRig.quaternion.copy(this.flashQ); this.flashRig.position.copy(cam.position);
    const on = p.flash && p.alive && p.hidden < 0 && !p.vent; let power = on ? 1 : 0; if (on && world.threat > 0.75 && Math.sin(now * 37) > 0.93) power = 0.15; if (on && p.stagger > 0 && Math.sin(now * 55) > 0.1) power = 0.2; if (on && this.pullPos) { const ex = Math.atan2(this.pullPos[1] - p.y, this.pullPos[0] - p.x); let d = ex - p.yaw; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; if (Math.abs(d) > 1.3 && Math.sin(now * 31) > 0.5) power = 0.15; } if (on && world.spec.lightsOut) power = 1;
    { /* close range: walls or floor within about a metre would blow out to white, so the beam eases off as the surface under it gets near */ const pl = world.player, c0 = Math.cos(pl.yaw), s0 = Math.sin(pl.yaw); let dm = 6; for (let r = 0.1; r < 3; r += 0.1) { if (world.solidForPlayer(Math.floor(pl.x + c0 * r), Math.floor(pl.y + s0 * r))) { dm = r * TS; break; } } if (pl.pitch < -0.15) dm = Math.min(dm, 1.6 / Math.sin(-pl.pitch)); const u = clamp((dm - 0.5) / 2.2, 0, 1); this.nearK = (this.nearK === undefined ? 1 : this.nearK) + ((0.28 + 0.72 * u * u * (3 - 2 * u)) - (this.nearK === undefined ? 1 : this.nearK)) * Math.min(1, dt * 10); }
    this.flash.intensity += (power * this.torchI * this.nearK * (1 + 0.025 * Math.sin(now * 9)) - this.flash.intensity) * Math.min(1, dt * 20); this.coneMat.uniforms.uInt.value = this.flash.intensity / this.torchI * (this.portrait ? 0.12 : 0.1); this.cone.visible = this.Q.cone && this.flash.intensity > 3; this.lens.visible = on; this.lens.material.color.setHex(on ? this.torchActive.lensCol : 0x0c0c0c); if (this.lensGlow) { this.lensGlow.visible = on; this.lensGlow.material.opacity = 0.35 + 0.2 * (this.flash.intensity / this.torchI); }
    /* hands: bob, sway, reach */
    const hs = p.sprint ? 1.8 : 1; this.hands.position.set(0.17 + Math.sin(this.bobPhase) * 0.008 * hs, -0.2 + Math.abs(Math.sin(this.bobPhase)) * 0.012 * hs + (p.crouch ? 0.01 : 0), -0.32); this.hands.rotation.set(0.06 + Math.sin(this.bobPhase * 2) * 0.01, 0.12, Math.sin(this.bobPhase) * 0.02);
    if (this.torchSw) { const w = this.torchSw; w.t += dt; const u = Math.min(1, w.t / 0.55), sn = Math.sin(Math.PI * u); if (u >= 0.5 && !w.done) { w.done = true; this.applyTorch(w.to); } this.hands.position.y -= 0.3 * sn; this.hands.position.x += 0.06 * sn; this.hands.rotation.x += 0.9 * sn; if (u >= 1) this.torchSw = null; }
    this.handRoot.visible = p.alive && p.hidden < 0 && !p.vent;
    if (this.reachT > 0) { this.reachT -= dt; const u = Math.sin(Math.PI * (1 - this.reachT / 0.45)); this.free.visible = true; this.free.position.set(-0.24 + 0.15 * u, -0.4 + 0.27 * u, -0.3 - 0.26 * u); this.free.rotation.set(-0.35 * u + 0.1, 0.2 * (1 - u), 0.12 * (1 - u)); } else this.free.visible = false;
  }
  menuFrame(world, dt, now) { this.frame(world, dt, now, { menu: true }); }
  reach() { this.reachT = 0.45; }
  updateDynamic(world, dt, now) {
    const b = this.built, dyn = b.dyn, p = world.player;
    for (const d of dyn.doors) { const o = d.o; if (d.swing) d.swing(o.open); else d.g.position.y = o.open * 2.6; const ok = !o.locked; d.lightM.color.setHex(ok ? 0x30ff70 : 0xff2a20); if (o.hidden) { d.wallSlab.visible = !o.revealed; d.g.visible = o.revealed; } if (d.pad) { d.pad.visible = true; if (d.kp) { const k = world.kpShow, mine = k && k.id === o.id; d.kp(mine ? k.text : o.codeOk ? 'OPEN' : '----', mine ? k.st : o.codeOk ? 'ok' : ''); d.pad.userData.led.material.color.setHex(o.codeOk ? 0x30ff70 : 0xff2020); } } d.slabM.emissive.setHex(o.pingT > 0 ? 0x1a6fa8 : 0x000000); }
    for (const it of dyn.items) { const o = it.o; it.g.visible = !o.taken; if (o.taken) continue; it.g.position.y = 0.95 + Math.sin(now * 2 + o.bob) * 0.06; it.g.rotation.y = now * 0.9 + o.bob; it.gl.material.opacity = (0.45 + 0.15 * Math.sin(now * 3 + o.bob)) * (o.pingT > 0 ? 2.2 : 1); it.gl.scale.setScalar(o.pingT > 0 ? 2 : 1.1); }
    for (const n of dyn.notes) { n.gl.material.opacity = (0.3 + 0.1 * Math.sin(now * 2)) * (n.o.pingT > 0 ? 2.5 : 1); }
    for (const g of dyn.gens) { g.il.color.setHex(g.o.on ? 0x30ff70 : 0xff2200); if (g.o.on) { g.fan.rotation.z += dt * 18; g.g.position.y = Math.sin(now * 55) * 0.004; } }
    for (const v of dyn.valves) if (v.kind === 'breaker') { const d = v.o.done; v.led.color.setHex(d ? 0x30ff70 : 0xff2a1a); v.glow.material.color.setHex(d ? 0x40ff80 : 0xff9a2a); v.levers.forEach((l, i) => { const t = d ? 0.9 : -0.9; l.rotation.x += (t - l.rotation.x) * Math.min(1, dt * 9); }); }
    for (const v of dyn.valves) if (v.kind === 'locker' && v.door) { const near = Math.hypot(v.o.x + 0.5 - p.x, v.o.y + 0.5 - p.y) < 1.9, tg = p.hidden === v.o.id ? 0 : near && p.alive ? 1.3 : 0; v.ang = (v.ang || 0) + (tg - (v.ang || 0)) * Math.min(1, dt * 7); v.door.rotation.y = -v.ang; }
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
