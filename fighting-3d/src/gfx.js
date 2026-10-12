/* Rendering: renderer + post-processing, neon rooftop arena, cinematic camera rig, hit FX. */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

const V3 = THREE.Vector3, TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, srgb = true, rep) { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(rep[0], rep[1]); return t; }

export const QUALITY = {
  low:    { dpr: 1,   shadow: 1024, reflect: false, bloom: .5, msaa: 0, buildings: 40 },
  medium: { dpr: 1.5, shadow: 2048, reflect: true,  bloom: .8, msaa: 4, buildings: 80, reflectRes: .5 },
  high:   { dpr: 2,   shadow: 4096, reflect: true,  bloom: 1,  msaa: 4, buildings: 120, reflectRes: 1 }
};

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, chroma: { value: 0 }, flash: { value: 0 }, flashCol: { value: new THREE.Color(1, 1, 1) }, vig: { value: .55 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float time,chroma,flash,vig;uniform vec3 flashCol;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){
    vec2 c=vUv-.5;float d=dot(c,c);
    vec2 off=c*(chroma+d*.012);
    vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
    col=mix(col,flashCol*1.6,flash);
    // cinematic grade: lifted teal shadows, warm highlights
    float l=dot(col,vec3(.2126,.7152,.0722));
    col=mix(col,col*vec3(.94,1.0,1.1),smoothstep(.4,0.,l)*.5);
    col=mix(col,col*vec3(1.08,1.0,.92),smoothstep(.5,1.5,l)*.4);
    col=mix(vec3(l),col,1.12);
    col*=1.-vig*smoothstep(.15,.85,d*2.2);
    col+=(h(vUv*vec2(1920.,1080.)+time)-.5)*.018;
    gl_FragColor=vec4(col,1.);
  }`
};

export class Gfx {
  constructor(canvas, quality = 'medium') {
    this.canvas = canvas; this.q = QUALITY[quality] || QUALITY.medium; this.qname = quality;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, this.q.dpr)); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(34, 16 / 9, .1, 400);
    this.camera.position.set(0, 1.6, 6); this.clock = new THREE.Clock();
    this.buildArena();
    this.initPost();
    this.fx = new FX(this.scene, this.camera);
    this.cam = new CamRig(this.camera);
    this.resize(); addEventListener('resize', () => this.resize());
  }
  initPost() {
    const r = this.renderer, size = r.getSize(new THREE.Vector2()), pr = r.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: this.q.msaa });
    this.composer = new EffectComposer(r, rt); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), .55 * this.q.bloom, .7, .88); this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader); this.composer.addPass(this.grade); this.composer.addPass(new OutputPass());
  }
  resize() {
    const w = innerWidth, h = innerHeight; this.renderer.setSize(w, h, false); this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.composer.setSize(w, h); this.aspect = w / h;
    if (this.reflector) this.reflector.getRenderTarget().setSize(w * (this.q.reflectRes || .5) * this.renderer.getPixelRatio(), h * (this.q.reflectRes || .5) * this.renderer.getPixelRatio());
  }
  render(dt) {
    const t = this.clock.elapsedTime; this.arena.update(t, dt); this.fx.update(dt);
    this.grade.uniforms.time.value = t % 10; this.grade.uniforms.chroma.value *= .88; this.grade.uniforms.flash.value *= .8;
    this.bloom.strength = (.55 + this.fx.bloomKick) * this.q.bloom; this.composer.render(dt);
  }
  kick(chroma = .006) { this.grade.uniforms.chroma.value = Math.max(this.grade.uniforms.chroma.value, chroma); }
  flash(a, col) { this.grade.uniforms.flash.value = a; if (col) this.grade.uniforms.flashCol.value.set(col); }

  /* ================= ARENA: neon city rooftop at night ================= */
  buildArena() {
    const S = this.scene, rn = mulberry(2024), q = this.q;
    S.fog = new THREE.FogExp2(0x22103a, .0055); S.background = new THREE.Color(0x07030f);
    const A = this.arena = { update: () => {}, parts: [] }, grp = new THREE.Group(); S.add(grp);
    // ---- sky dome
    const sky = cv(4, 512), sg = sky.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#04020c'); gr.addColorStop(.45, '#14072e'); gr.addColorStop(.7, '#4a1458'); gr.addColorStop(.86, '#a8307a'); gr.addColorStop(1, '#ff7a8a'); sg.fillStyle = gr; sg.fillRect(0, 0, 4, 512);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 24), new THREE.MeshBasicMaterial({ map: tex(sky), side: THREE.BackSide, fog: false, depthWrite: false })); dome.rotation.y = 0; grp.add(dome);
    const sp = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const a = rn() * TAU, e = rn() * 1.1 + .15, R = 280; sp[i * 3] = Math.cos(a) * Math.cos(e) * R; sp[i * 3 + 1] = Math.sin(e) * R * .85 + 20; sp[i * 3 + 2] = -Math.abs(Math.sin(a) * Math.cos(e) * R) - 10; }
    const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.BufferAttribute(sp, 3)); grp.add(new THREE.Points(sgm, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: .7 })));
    // moon
    const mc = cv(256, 256), mg = mc.getContext('2d'), mrg = mg.createRadialGradient(128, 128, 20, 128, 128, 128); mrg.addColorStop(0, 'rgba(255,245,255,1)'); mrg.addColorStop(.25, 'rgba(255,225,250,.95)'); mrg.addColorStop(.3, 'rgba(255,170,230,.35)'); mrg.addColorStop(1, 'transparent'); mg.fillStyle = mrg; mg.fillRect(0, 0, 256, 256);
    mg.fillStyle = 'rgba(180,150,190,.35)'; for (let i = 0; i < 9; i++) { mg.beginPath(); mg.arc(100 + rn() * 56, 100 + rn() * 56, 4 + rn() * 9, 0, TAU); mg.fill(); }
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(mc), fog: false, color: new THREE.Color(2.2, 1.9, 2.4), depthWrite: false })); moon.scale.set(90, 90, 1); moon.position.set(-60, 75, -190); grp.add(moon);
    // clouds
    const cc = cv(512, 256), cg = cc.getContext('2d'); for (let i = 0; i < 70; i++) { const x = rn() * 512, y = 40 + rn() * 170, r = 25 + rn() * 55, g2 = cg.createRadialGradient(x, y, 0, x, y, r); g2.addColorStop(0, 'rgba(255,255,255,.12)'); g2.addColorStop(1, 'transparent'); cg.fillStyle = g2; cg.fillRect(x - r, y - r, r * 2, r * 2); }
    this.clouds = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.PlaneGeometry(420, 110), new THREE.MeshBasicMaterial({ map: tex(cc), transparent: true, depthWrite: false, fog: false, color: i ? 0xff6ab0 : 0x7a8cff, blending: THREE.AdditiveBlending, opacity: .55 })); m.position.set(i * 60 - 30, 38 + i * 22, -170 + i * 20); grp.add(m); return m; });

    // ---- lighting
    S.add(new THREE.HemisphereLight(0x5a4ca8, 0x1a0f26, .55));
    const key = this.key = new THREE.DirectionalLight(0xbfd0ff, 2.1); key.position.set(-3.5, 9, 6); key.castShadow = true; key.shadow.mapSize.set(q.shadow, q.shadow);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 5, bottom: -5, near: 1, far: 30 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 4; key.target.position.set(0, 1, 0); S.add(key, key.target);
    const rimM = new THREE.PointLight(0xff2fa0, 55, 22, 2); rimM.position.set(-5.5, 2.6, -3.2); const rimC = new THREE.PointLight(0x22d4ff, 55, 22, 2); rimC.position.set(5.5, 2.6, -3.2); S.add(rimM, rimC);
    const spot = new THREE.SpotLight(0xfff0e0, 160, 18, .55, .6, 1.6); spot.position.set(0, 8.5, 2.5); spot.target.position.set(0, 0, 0); spot.castShadow = q.shadow >= 2048; spot.shadow.mapSize.set(1024, 1024); S.add(spot, spot.target);
    A.flick = [rimM, rimC];

    // ---- floor
    const fw = 30, fd = 16, cc2 = cv(512, 512), cg2 = cc2.getContext('2d'); cg2.fillStyle = '#4a4a54'; cg2.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 26000; i++) { cg2.fillStyle = rn() < .5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.05)'; cg2.fillRect(rn() * 512, rn() * 512, 1 + rn() * 2, 1 + rn() * 2); }
    for (let i = 0; i < 40; i++) { const x = rn() * 512, y = rn() * 512, r = 20 + rn() * 70, g3 = cg2.createRadialGradient(x, y, 0, x, y, r); g3.addColorStop(0, 'rgba(0,0,0,.18)'); g3.addColorStop(1, 'transparent'); cg2.fillStyle = g3; cg2.fillRect(x - r, y - r, r * 2, r * 2); }
    cg2.strokeStyle = 'rgba(0,0,0,.55)'; cg2.lineWidth = 3; cg2.strokeRect(0, 0, 512, 512); cg2.beginPath(); cg2.moveTo(256, 0); cg2.lineTo(256, 512); cg2.moveTo(0, 256); cg2.lineTo(512, 256); cg2.stroke();
    const rough = cv(256, 256), rg = rough.getContext('2d'); rg.fillStyle = '#7a7a7a'; rg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18; i++) { const x = rn() * 256, y = rn() * 256, r = 18 + rn() * 55, g4 = rg.createRadialGradient(x, y, 0, x, y, r); g4.addColorStop(0, 'rgba(0,0,0,.85)'); g4.addColorStop(1, 'transparent'); rg.fillStyle = g4; rg.fillRect(x - r, y - r, r * 2, r * 2); }
    const alpha = cv(256, 256), ag = alpha.getContext('2d'); ag.fillStyle = '#c8c8c8'; ag.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18; i++) { const x = rn() * 256, y = rn() * 256, r = 18 + rn() * 55, g5 = ag.createRadialGradient(x, y, 0, x, y, r); g5.addColorStop(0, 'rgba(0,0,0,.8)'); g5.addColorStop(1, 'transparent'); ag.fillStyle = g5; ag.fillRect(x - r, y - r, r * 2, r * 2); }
    const slab = new THREE.Mesh(new THREE.BoxGeometry(fw, .6, fd), new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: .9 })); slab.position.y = -.31; slab.receiveShadow = true; grp.add(slab);
    if (q.reflect) {
      const refl = this.reflector = new Reflector(new THREE.PlaneGeometry(fw, fd), { clipBias: .003, textureWidth: 1024 * (q.reflectRes || .5), textureHeight: 512 * (q.reflectRes || .5), color: 0x9a95b0 });
      refl.rotation.x = -Math.PI / 2; refl.position.y = .001; grp.add(refl);
    }
    const floorMat = new THREE.MeshStandardMaterial({ map: tex(cc2, true, [fw / 6, fd / 6]), roughnessMap: tex(rough, false, [fw / 8, fd / 8]), roughness: .75, metalness: .2, transparent: !!q.reflect, alphaMap: q.reflect ? tex(alpha, false, [fw / 8, fd / 8]) : null, envMapIntensity: .8 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = .004; floor.receiveShadow = true; grp.add(floor);
    // ring markings
    const neon = (c, i = 2.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), toneMapped: false });
    const ringGeo = new THREE.RingGeometry(3.55, 3.62, 96), ring = new THREE.Mesh(ringGeo, neon('#ff3ea5')); ring.rotation.x = -Math.PI / 2; ring.position.y = .012; grp.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(3.7, 3.73, 96), neon('#22d4ff', 2)); ring2.rotation.x = -Math.PI / 2; ring2.position.y = .012; grp.add(ring2);
    const bar = (x, z, w, d, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, .012, d), neon(c)); m.position.set(x, .012, z); grp.add(m); };
    bar(0, 0, .06, 2.4, '#ff3ea5', 1.6); bar(-1.2, 0, .04, 1.0, '#22d4ff'); bar(1.2, 0, .04, 1.0, '#22d4ff');
    const lc = cv(512, 512), lg = lc.getContext('2d'); lg.fillStyle = 'rgba(0,0,0,0)'; lg.clearRect(0, 0, 512, 512); lg.strokeStyle = '#fff'; lg.lineWidth = 12; lg.beginPath(); lg.arc(256, 256, 190, 0, TAU); lg.stroke(); lg.font = '900 140px Impact,Arial Black,sans-serif'; lg.fillStyle = '#fff'; lg.textAlign = 'center'; lg.textBaseline = 'middle'; lg.fillText('SC', 256, 262);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: tex(lc), transparent: true, color: new THREE.Color('#ff3ea5').multiplyScalar(1.4), toneMapped: false, opacity: .55, depthWrite: false })); logo.rotation.x = -Math.PI / 2; logo.position.y = .014; grp.add(logo);

    // ---- parapet + pylons
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1d1b26, roughness: .85 });
    const wall = (x, z, w, d, h = 1.0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; grp.add(m); const s = new THREE.Mesh(new THREE.BoxGeometry(w + .02, .05, d + .02), neon(rn() < .5 ? '#22d4ff' : '#ff3ea5', 2.2)); s.position.set(x, h + .03, z); grp.add(s); };
    wall(0, -7.6, fw, .5); wall(-fw / 2 + .25, 0, .5, fd); wall(fw / 2 - .25, 0, .5, fd);
    // props: AC units, tank, antenna, crates, barrels
    const ac = (x, z, s = 1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.6 * s, 1.1 * s, 1.1 * s), new THREE.MeshStandardMaterial({ color: 0x4a4e58, roughness: .5, metalness: .6 })); b.position.set(x, .55 * s, z); b.castShadow = b.receiveShadow = true; grp.add(b);
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(.4 * s, .4 * s, .05, 24), new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: .8, roughness: .4 })); fan.position.set(x, 1.12 * s, z); grp.add(fan); return fan; };
    A.fans = [ac(-9, -6.2), ac(-6.5, -6.4, .9), ac(8, -6.3, 1.1), ac(11, -5.8)];
    const tank = new THREE.Group(); const tb = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.2, 28), new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: .7, metalness: .3 })); tb.position.y = 3.2; tb.castShadow = true; tank.add(tb);
    for (const [dx, dz] of [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.2), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: .8, roughness: .4 })); l.position.set(dx, 1.1, dz); tank.add(l); }
    tank.position.set(-12, 0, -6); grp.add(tank);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.05, .12, 12, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: .9, roughness: .4 })); mast.position.set(13, 6, -6.2); grp.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(.14), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, .1, .1), toneMapped: false })); beacon.position.set(13, 12.1, -6.2); grp.add(beacon); A.beacon = beacon;
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x5b4630, roughness: .8 });
    for (const [x, z, s] of [[-10.5, -3, .9], [-10.4, -3.2, .6], [10.8, -2.4, .8], [-4, -6.6, .7], [5.5, -6.5, .8]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat); c.position.set(x, s / 2, z); c.rotation.y = rn() * 3; c.castShadow = c.receiveShadow = true; grp.add(c); }
    // barrel fires (flickering practical lights)
    A.fires = [[-8, 2.4], [8.5, 2.6]].map(([x, z]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(.34, .3, .9, 18), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: .6, metalness: .6 })); b.position.set(x, .45, z); b.castShadow = true; grp.add(b);
      const l = new THREE.PointLight(0xff8a3a, 12, 9, 2); l.position.set(x, 1.2, z); S.add(l);
      const fm = new THREE.Mesh(new THREE.ConeGeometry(.22, .6, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, .2), toneMapped: false, transparent: true, opacity: .85 })); fm.position.set(x, 1.15, z); grp.add(fm); return { l, fm }; });
    // light poles
    const pole = (x, z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, 5, 8), new THREE.MeshStandardMaterial({ color: 0x1c1c22, metalness: .8, roughness: .4 })); p.position.set(x, 2.5, z); p.castShadow = true; grp.add(p); const h = new THREE.Mesh(new THREE.BoxGeometry(.7, .08, .3), neon('#fff0d8', 3)); h.position.set(x + (x < 0 ? .3 : -.3), 5, z); grp.add(h); };
    pole(-7, -6.5); pole(7, -6.5); pole(-12.5, 2); pole(12.5, 2);
    // pipes along the back wall
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x5a5e68, metalness: .8, roughness: .35 });
    for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 22, 12), pipeMat); p.rotation.z = Math.PI / 2; p.position.set(2, 1.35 + i * .22, -7.2); grp.add(p); }
    // steam
    const stc = cv(64, 64), stg = stc.getContext('2d'), sgr = stg.createRadialGradient(32, 32, 0, 32, 32, 32); sgr.addColorStop(0, 'rgba(255,255,255,.5)'); sgr.addColorStop(1, 'transparent'); stg.fillStyle = sgr; stg.fillRect(0, 0, 64, 64); const stT = tex(stc);
    A.steam = []; for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: stT, transparent: true, opacity: 0, depthWrite: false, color: 0xb9a8e0 })); s.userData = { x: [-3.5, 4.6][i & 1] + rnd(-.1, .1), z: -6.7, t: rnd(0, 6) }; grp.add(s); A.steam.push(s); }

    // ---- skyline
    const wins = [0, 1, 2].map(k => { const c = cv(256, 512), g = c.getContext('2d'); g.fillStyle = '#0c0a14'; g.fillRect(0, 0, 256, 512); const cols = [['#ffe6a8', '#ffc66a'], ['#8fe8ff', '#4fd0ff'], ['#ff9ad8', '#ff5fb8']][k];
      for (let y = 8; y < 504; y += 16) for (let x = 8; x < 248; x += 14) { if (rn() < .46) { g.fillStyle = rn() < .75 ? cols[0] : cols[1]; g.globalAlpha = .5 + rn() * .5; g.fillRect(x, y, 8, 9); } } g.globalAlpha = 1; return tex(c); });
    const bmat = wins.map(t => new THREE.MeshStandardMaterial({ color: 0x15121f, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: .5, metalness: .4, fog: true }));
    for (let i = 0; i < q.buildings; i++) {
      const a = rn() * Math.PI * 2, ang = -Math.PI * .5 + (rn() - .5) * Math.PI * 1.35, dist = 24 + rn() * 100, w = 6 + rn() * 14, d = 6 + rn() * 12, h = 14 + Math.pow(rn(), 1.7) * 110 + dist * .35;
      const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 8, uv.getY(k) * h / 14);
      const b = new THREE.Mesh(geo, bmat[(rn() * 3) | 0]); b.position.set(Math.cos(ang) * dist * 1.4, h / 2 - 3, Math.sin(ang) * dist - 14); grp.add(b);
      if (rn() < .3) { const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, .6, d * 1.02), neon(['#ff3ea5', '#22d4ff', '#a855ff'][(rn() * 3) | 0], 2.6)); cap.position.set(b.position.x, b.position.y + h / 2, b.position.z); grp.add(cap); }
    }
    // billboards
    const board = (txt, c, x, y, z, sc, ry = 0) => { const cc3 = cv(512, 256), g = cc3.getContext('2d'); g.fillStyle = '#05030a'; g.fillRect(0, 0, 512, 256); g.strokeStyle = c; g.lineWidth = 10; g.strokeRect(10, 10, 492, 236); g.font = '900 110px Impact,Arial Black,sans-serif'; g.fillStyle = c; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = c; g.shadowBlur = 24; g.fillText(txt, 256, 135);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(16 * sc, 8 * sc), new THREE.MeshBasicMaterial({ map: tex(cc3), toneMapped: false, color: new THREE.Color(2.2, 2.2, 2.2) })); m.position.set(x, y, z); m.rotation.y = ry; grp.add(m); return m; };
    A.boards = [board('NEON FIGHT', '#ff3ea5', -20, 24, -34, 1.3, .25), board('RAMEN 24H', '#22d4ff', 24, 18, -30, 1, -.3), board('CLASH', '#ffd23f', 3, 38, -60, 1.8), board('HOTEL', '#a855ff', -42, 30, -52, 1.4, .4)];
    // rain
    const N = 1800, rp = new Float32Array(N * 6); this.rainN = N; for (let i = 0; i < N; i++) { const x = rnd(-14, 14), y = rnd(0, 14), z = rnd(-9, 9); rp.set([x, y, z, x - .03, y - .5, z], i * 6); }
    const rg2 = new THREE.BufferGeometry(); rg2.setAttribute('position', new THREE.BufferAttribute(rp, 3)); A.rain = new THREE.LineSegments(rg2, new THREE.LineBasicMaterial({ color: 0xaab8ff, transparent: true, opacity: .28, fog: false })); S.add(A.rain);
    A.update = (t, dt) => {
      A.rain.visible = true; const p = rg2.attributes.position, a = p.array; for (let i = 0; i < N; i++) { const o = i * 6, v = (20 + (i % 7)) * dt; a[o + 1] -= v; a[o + 4] -= v; if (a[o + 1] < 0) { const x = rnd(-14, 14), z = rnd(-9, 9), y = 14; a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = x - .03; a[o + 4] = y - .5; a[o + 5] = z; } } p.needsUpdate = true;
      A.fans.forEach((f, i) => f.rotation.y += dt * (3 + i)); A.beacon.visible = (t % 1.6) < .25;
      A.flick[0].intensity = 55 + Math.sin(t * 9) * 3 + (Math.random() < .02 ? -20 : 0); A.flick[1].intensity = 55 + Math.sin(t * 7 + 1) * 3;
      A.fires.forEach((f, i) => { f.l.intensity = 12 + Math.sin(t * 17 + i * 3) * 3 + Math.random() * 2; f.fm.scale.set(1 + Math.sin(t * 20 + i) * .15, 1 + Math.sin(t * 13 + i) * .25, 1); });
      A.steam.forEach(s => { const u = s.userData; u.t += dt * .5; const k = (u.t % 3) / 3; s.position.set(u.x + Math.sin(u.t * 3) * .2 + k * .6, .6 + k * 4, u.z); s.scale.setScalar(.6 + k * 2.4); s.material.opacity = Math.sin(k * Math.PI) * .22; });
      this.clouds[0].position.x += dt * .6; this.clouds[1].position.x -= dt * .4; if (this.clouds[0].position.x > 120) this.clouds[0].position.x = -120; if (this.clouds[1].position.x < -120) this.clouds[1].position.x = 120;
      A.boards.forEach((b, i) => { b.material.color.setScalar(2 + Math.sin(t * 3 + i * 2) * .25 + (Math.random() < .004 ? -1.2 : 0)); });
    };
    // image-based lighting from the arena itself (neon reflections on skin, leather, metal)
    const pm = new THREE.PMREMGenerator(this.renderer); const envScene = new THREE.Scene(); envScene.background = new THREE.Color(0x120a22);
    const eg = grp.clone(true); envScene.add(eg); const el = [[0xff2fa0, -6, 3, -4], [0x22d4ff, 6, 3, -4], [0xfff0e0, 0, 8, 3]]; for (const [c, x, y, z] of el) { const l = new THREE.Mesh(new THREE.SphereGeometry(1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(6) })); l.position.set(x, y, z); envScene.add(l); }
    S.environment = pm.fromScene(envScene, .03).texture; pm.dispose();
  }
}

/* ================= CAMERA ================= */
export class CamRig {
  constructor(cam) { this.cam = cam; this.pos = new V3(0, 1.6, 6); this.look = new V3(0, 1.1, 0); this.mode = 'fight'; this.t = 0; this.shakeA = 0; this.fovT = 34; this.focus = null; this.orbit = 0; this.zoomKick = 0; }
  shake(a) { this.shakeA = Math.max(this.shakeA, a); }
  setMode(m, focus) { this.mode = m; this.t = 0; this.focus = focus || null; }
  update(dt, F, aspect) {
    this.t += dt; const a = F[0], b = F[1], mid = new V3((a.pos.x + b.pos.x) / 2, 0, (a.pos.z + b.pos.z) / 2), sep = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
    let tp = new V3(), tl = new V3(), fov = 34; const k = 1 - Math.exp(-dt * 5);
    const ax = new V3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z).normalize(), perp = new V3(-ax.z, 0, ax.x); if (perp.z < 0) perp.negate();
    if (this.mode === 'fight' || this.mode === 'training') {
      const th = Math.tan(fov * Math.PI / 360), D = Math.max(3.9, (sep + 2.6) / (2 * th * aspect), 3.2 / (2 * th));
      tp.copy(mid).addScaledVector(perp, D).addScaledVector(ax, -.25 + Math.sin(this.t * .3) * .15); tp.y = 1.45 + D * .045; tl.set(mid.x, 1.12 + Math.max(a.y, b.y) * .35, mid.z);
    } else if (this.mode === 'intro') { // orbit fighter A, then B, then wide
      const T = this.t, who = T < 2.4 ? a : T < 4.8 ? b : null;
      if (who) { const ang = (T % 2.4) * .35 + (who === a ? .9 : 2.2), foc = who.pos; const r = 2.1 - ((T % 2.4) / 2.4) * .5; tp.set(foc.x + Math.sin(ang) * r * (who === a ? 1 : -1), 1.4, foc.z + Math.cos(ang) * r); tl.set(foc.x, 1.45, foc.z); fov = 28; }
      else { const D = 6.5 - Math.min(1, (T - 4.8) / 1.5) * 2.2; tp.copy(mid).addScaledVector(perp, D); tp.y = 1.6; tl.set(mid.x, 1.15, mid.z); }
    } else if (this.mode === 'ko') {
      const f = this.focus || b, D = 3.2 - Math.min(1, this.t / 2) * 1.0; tp.set(f.pos.x + perp.x * D, 1.0, f.pos.z + perp.z * D); tl.set(f.pos.x, .9, f.pos.z); fov = 30;
    } else if (this.mode === 'win') {
      const f = this.focus || a, ang = this.t * .28 + .6, D = 2.6 + this.t * .08; tp.set(f.pos.x + Math.sin(ang) * D * (f.facingYaw > 1.5 || f.facingYaw < -1.5 ? -1 : 1), 1.1 + Math.sin(this.t * .5) * .1, f.pos.z + Math.cos(ang) * D); tl.set(f.pos.x, 1.45, f.pos.z); fov = 32;
    } else if (this.mode === 'menu') { tp.set(2.6 + Math.sin(this.t * .15) * .9, 1.35, 6.6); tl.set(.9, 1.15, 0); fov = 32; }
    else if (this.mode === 'select') { const f = this.focus; tp.set((f ? f.pos.x : 0) + .6, 1.3, (f ? f.pos.z : 0) + 5.3); tl.set((f ? f.pos.x : 0) - 1.15, 1.0, f ? f.pos.z : 0); fov = 30; }
    const kk = this.mode === 'intro' || this.mode === 'win' || this.mode === 'select' ? 1 - Math.exp(-dt * 3.5) : k;
    this.pos.lerp(tp, kk); this.look.lerp(tl, kk); this.fovT += (fov - this.fovT) * k;
    this.shakeA *= Math.exp(-dt * 9); const s = this.shakeA;
    this.cam.position.copy(this.pos).add(new V3(rnd(-s, s), rnd(-s, s), rnd(-s, s)) .multiplyScalar(.5)); this.cam.lookAt(this.look);
    this.zoomKick *= Math.exp(-dt * 8); this.cam.fov = this.fovT - this.zoomKick * 3; this.cam.updateProjectionMatrix();
  }
}

/* ================= HIT FX ================= */
export class FX {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera; this.bloomKick = 0;
    const N = this.N = 700; this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.maxLife = new Float32Array(N); this.cursor = 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const sc = cv(32, 32), sg = sc.getContext('2d'), sgr = sg.createRadialGradient(16, 16, 0, 16, 16, 16); sgr.addColorStop(0, '#fff'); sgr.addColorStop(.4, 'rgba(255,255,255,.6)'); sgr.addColorStop(1, 'transparent'); sg.fillStyle = sgr; sg.fillRect(0, 0, 32, 32);
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: .09, map: tex(sc), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); this.points.frustumCulled = false; scene.add(this.points);
    this.pos.fill(9999);
    // rings
    const rc = cv(128, 128), rg = rc.getContext('2d'); rg.strokeStyle = '#fff'; rg.lineWidth = 8; rg.beginPath(); rg.arc(64, 64, 52, 0, TAU); rg.stroke(); const rt = tex(rc);
    this.rings = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 })); m.visible = false; m.userData = { life: 0 }; scene.add(m); return m; });
    // flare star
    const fc = cv(128, 128), fg = fc.getContext('2d'); fg.translate(64, 64); const fgr = fg.createRadialGradient(0, 0, 0, 0, 0, 64); fgr.addColorStop(0, 'rgba(255,255,255,1)'); fgr.addColorStop(.2, 'rgba(255,255,255,.7)'); fgr.addColorStop(1, 'transparent'); fg.fillStyle = fgr; fg.fillRect(-64, -64, 128, 128);
    fg.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { fg.rotate(Math.PI / 4); fg.beginPath(); fg.moveTo(-60, 0); fg.lineTo(0, -3); fg.lineTo(60, 0); fg.lineTo(0, 3); fg.fill(); }
    this.flares = Array.from({ length: 8 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(fc), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 })); s.userData = { life: 0 }; s.visible = false; scene.add(s); return s; });
    // dust
    const dc = cv(64, 64), dg = dc.getContext('2d'), dgr = dg.createRadialGradient(32, 32, 0, 32, 32, 32); dgr.addColorStop(0, 'rgba(200,190,220,.55)'); dgr.addColorStop(1, 'transparent'); dg.fillStyle = dgr; dg.fillRect(0, 0, 64, 64); const dt = tex(dc);
    this.dust_ = Array.from({ length: 40 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dt, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { life: 0, v: new V3() }; s.visible = false; scene.add(s); return s; });
    this.light = new THREE.PointLight(0xffaa66, 0, 6, 2); scene.add(this.light); this.lightT = 0;
    // limb trails
    this.trails = {};
  }
  trail(key, p, active, color) {
    let T = this.trails[key];
    if (!T) { const n = 14, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 2 * 3), col = new Float32Array(n * 2 * 4), idx = []; for (let i = 0; i < n - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 4)); geo.setIndex(idx);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.frustumCulled = false; this.scene.add(m); T = this.trails[key] = { n, geo, pos, col, pts: [], m, fade: 0 }; }
    if (active) { T.pts.unshift(p.clone()); T.fade = 1; if (T.pts.length > T.n) T.pts.pop(); } else { T.fade *= .8; if (T.pts.length) T.pts.pop(); if (T.fade < .02) T.pts.length = 0; }
    const c = new THREE.Color(color || '#fff'), up = new V3(0, 1, 0), pts = T.pts, w = .05;
    for (let i = 0; i < T.n; i++) {
      const p0 = pts[Math.min(i, pts.length - 1)], p1 = pts[Math.min(i + 1, pts.length - 1)];
      if (!p0) { for (let k = 0; k < 6; k++) T.pos[i * 6 + k] = 0; for (let k = 0; k < 8; k++) T.col[i * 8 + k] = 0; continue; }
      const dir = p1 ? new V3().subVectors(p0, p1) : new V3(1, 0, 0), side = new V3().crossVectors(dir, this.camera.position.clone().sub(p0)).normalize().multiplyScalar(w * (1 - i / T.n * .8));
      T.pos.set([p0.x + side.x, p0.y + side.y, p0.z + side.z, p0.x - side.x, p0.y - side.y, p0.z - side.z], i * 6);
      const a = (1 - i / T.n) * .7 * T.fade; T.col.set([c.r * 2, c.g * 2, c.b * 2, a, c.r * 2, c.g * 2, c.b * 2, a], i * 8);
    }
    T.geo.attributes.position.needsUpdate = true; T.geo.attributes.color.needsUpdate = true;
  }
  burst(p, n, speed, cols, dir, spread = 1) {
    for (let i = 0; i < n; i++) {
      const k = this.cursor++ % this.N, a = rnd(0, TAU), e = rnd(-1, 1), s = rnd(.3, 1) * speed, c = new THREE.Color(cols[(Math.random() * cols.length) | 0]);
      this.pos.set([p.x, p.y, p.z], k * 3); this.vel.set([Math.cos(a) * Math.sqrt(1 - e * e) * s * spread + (dir ? dir.x * s * .8 : 0), e * s * spread * .8 + rnd(0, 1.5), Math.sin(a) * Math.sqrt(1 - e * e) * s * spread + (dir ? dir.z * s * .8 : 0)], k * 3);
      this.col.set([c.r * 3, c.g * 3, c.b * 3], k * 3); this.life[k] = this.maxLife[k] = rnd(.25, .6);
    }
  }
  ringAt(p, size, color, normal) {
    const m = this.rings.find(r => !r.visible) || this.rings[0]; m.visible = true; m.userData.life = .3; m.userData.size = size; m.position.copy(p); m.material.color.set(color).multiplyScalar(2); m.lookAt(this.camera.position);
  }
  flare(p, size, color) { const s = this.flares.find(f => !f.visible) || this.flares[0]; s.visible = true; s.userData.life = .12; s.userData.size = size; s.position.copy(p); s.material.color.set(color).multiplyScalar(2.5); }
  hit(p, dir, power, aura) {
    this.burst(p, 22 * power, 4 * power, ['#ffffff', '#ffd27a', '#ff8a3a', aura || '#fff'], dir); this.ringAt(p, .4 * power + .2, '#ffffff'); this.flare(p, .55 * power, '#ffe2a0');
    this.light.position.copy(p); this.light.color.set(aura || '#ffaa66'); this.light.intensity = 10 * power; this.lightT = .1; this.bloomKick = .12 * power;
  }
  block(p, dir) { this.burst(p, 12, 3, ['#8fd8ff', '#ffffff'], dir, .8); this.ringAt(p, .5, '#6fcfff'); this.flare(p, .3, '#8fd8ff'); this.light.position.copy(p); this.light.color.set('#7fd0ff'); this.light.intensity = 6; this.lightT = .08; }
  dust(p, n) { for (let i = 0; i < n; i++) { const s = this.dust_.find(d => !d.visible); if (!s) return; s.visible = true; s.userData.life = .7; s.userData.max = .7; s.userData.v.set(rnd(-1, 1), rnd(.1, .6), rnd(-1, 1)); s.position.set(p.x + rnd(-.2, .2), .08, p.z + rnd(-.2, .2)); s.scale.setScalar(.25); s.material.opacity = .6; } }
  update(dt) {
    const p = this.pos, v = this.vel, c = this.col;
    for (let i = 0; i < this.N; i++) { if (this.life[i] > 0) { this.life[i] -= dt; const o = i * 3; v[o + 1] -= 9 * dt; p[o] += v[o] * dt; p[o + 1] += v[o + 1] * dt; p[o + 2] += v[o + 2] * dt; if (p[o + 1] < .02) { p[o + 1] = .02; v[o + 1] *= -.35; } const f = Math.max(0, this.life[i] / this.maxLife[i]); const k = f * f; if (this.life[i] <= 0) p[o] = 9999; c[o] *= .96; c[o + 1] *= .96; c[o + 2] *= .96; } }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
    for (const r of this.rings) if (r.visible) { r.userData.life -= dt; const u = 1 - r.userData.life / .3; r.scale.setScalar(r.userData.size * (.3 + u * .9)); r.material.opacity = Math.max(0, 1 - u); if (r.userData.life <= 0) { r.visible = false; } }
    for (const f of this.flares) if (f.visible) { f.userData.life -= dt; const u = f.userData.life / .12; f.scale.setScalar(f.userData.size * (1.6 - u * .6)); f.material.opacity = Math.max(0, u); if (f.userData.life <= 0) f.visible = false; }
    for (const d of this.dust_) if (d.visible) { d.userData.life -= dt; const u = d.userData.life / d.userData.max; d.position.addScaledVector(d.userData.v, dt); d.userData.v.multiplyScalar(.96); d.scale.setScalar(.25 + (1 - u) * .9); d.material.opacity = u * .5; if (d.userData.life <= 0) d.visible = false; }
    if (this.lightT > 0) { this.lightT -= dt; if (this.lightT <= 0) this.light.intensity = 0; else this.light.intensity *= .8; }
    this.bloomKick *= .9;
  }
}
