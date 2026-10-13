/* HUSH: Echoes in the Dark - game controller: screens, input (touch + keyboard/mouse), the fixed-step loop, HUD, audio hooks, saving.
   The rules live in logic/world.js, the picture in render/view.js; this file connects them to the player. */
import { View } from './render/view.js';
import { World, DT } from './logic/world.js';
import { generate, T } from './logic/gen.js';
import { LEVELS, CHAPTERS } from './logic/levels.js';
import { Sound } from './audio.js';
import { runBot } from './test/bot.js';

const $ = (id) => document.getElementById(id), qa = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TEST = /[?&]test=1\b/.test(location.search), UNLOCK = /[?&]unlock=1\b/.test(location.search);
const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window; const isMobile = coarse || /Android|iPhone|iPad/i.test(navigator.userAgent);
$('app').classList.toggle('touch', coarse);

/* ---------------- save ---------------- */
const KEY = 'hush.fp.v1';
const save = { v: 1, stars: [], best: [], set: { gfx: 'auto', bright: 100, vibe: true, hints: true, vol: 80, mvol: 60, sound: true, music: true, aq: 'auto', sens: 100, inv: false, diff: 'normal' }, last: 0 };
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) { Object.assign(save, s); save.set = Object.assign({ gfx: 'auto', bright: 100, vibe: true, hints: true, vol: 80, mvol: 60, sound: true, music: true, aq: 'auto', sens: 100, inv: false, diff: 'normal' }, s.set || {}); } } catch (e) { /* private mode */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
const unlocked = (i) => UNLOCK || i === 0 || (save.stars[i - 1] || 0) > 0;
const chapterStars = (c) => { let s = 0; for (let i = c * 10; i < c * 10 + 10; i++) s += save.stars[i] || 0; return s; };

/* ---------------- state ---------------- */
const G = { view: null, world: null, level: 0, mode: 'boot', paused: false, modal: false, acc: 0, last: 0, now: 0, t0: 0, timeSpent: 0, hintT: 0, shownHint: -1, bannerT: 0, hbT: 0, lastInv: '', noiseT: 0, ended: 0, chapterView: 0, menuWorld: null, genCache: {}, over: false };
const inp = { keys: {}, fwd: 0, str: 0, dyaw: 0, dpitch: 0, sprintBtn: false, edge: {} };

/* ---------------- audio ---------------- */
function applyAudio() { const s = save.set; Sound.set('vol', s.vol / 100); Sound.set('mvol', s.mvol / 100); Sound.set('sound', s.sound); Sound.set('music', s.music); Sound.set('vibe', s.vibe); }
function spatial(x, y) {
  const p = G.world.player, dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy) || 1e-3, rx = -Math.sin(p.yaw), ry = Math.cos(p.yaw); return { v: clamp(1 - d / 15, 0, 1), pan: clamp((dx * rx + dy * ry) / d, -1, 1), d };
}
const vibe = (ms) => { if (save.set.vibe && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } };

/* ---------------- screens ---------------- */
const SCREENS = ['home', 'chapters', 'levels', 'game'];
function show(name) { for (const s of SCREENS) $('scr-' + s).classList.toggle('active', s === name); G.mode = name; if (name !== 'game' && document.pointerLockElement) document.exitPointerLock(); }
const overlay = (id, on) => $('ov-' + id).classList.toggle('show', !!on);
const anyOverlay = () => qa('.overlay.show').some(o => o.id !== 'ov-load');

function thumb(gen, lock) {
  const cv = document.createElement('canvas'), W = gen.W, H = gen.H, s = 4; cv.width = W * s; cv.height = H * s; const x = cv.getContext('2d'); x.fillStyle = '#05060a'; x.fillRect(0, 0, cv.width, cv.height);
  const col = ['#6a625a', '#4b6a7d', '#7a3038'][gen.spec.ch]; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const t = gen.cells[j * W + i]; if (t !== T.WALL) { x.fillStyle = t === T.WATER ? '#2c5873' : col; x.fillRect(i * s, j * s, s, s); } }
  x.fillStyle = '#5be08c'; x.fillRect((gen.start.x - 1) * s, (gen.start.y - 1) * s, s * 3, s * 3); x.fillStyle = '#ff4450'; x.fillRect(gen.exit.x * s - s, gen.exit.y * s - s, s * 3, s * 3);
  return cv;
}
function gen(i) { return G.genCache[i] || (G.genCache[i] = generate(LEVELS[i])); }
function buildChapters() {
  const list = $('chapter-list'); list.innerHTML = '';
  CHAPTERS.forEach((c, ci) => {
    const lock = !unlocked(ci * 10), el = document.createElement('button'); el.className = 'chap' + (G.chapterView === ci ? ' on' : '') + (lock ? ' lock' : '');
    el.style.backgroundImage = ['radial-gradient(ellipse at 50% 38%, #4a3a22 0%, #1a130b 55%, #050403 100%)', 'radial-gradient(ellipse at 50% 38%, #1d4a66 0%, #0a1a26 55%, #03070a 100%)', 'radial-gradient(ellipse at 50% 38%, #8a1a22 0%, #2a0709 55%, #060102 100%)'][ci];
    el.innerHTML = (lock ? '<svg class="lk"><use href="#i-lock"/></svg>' : '') + '<small>Chapter ' + (ci + 1) + '</small><b>' + c.name + '</b><em><svg><use href="#i-star"/></svg>' + chapterStars(ci) + ' / 30</em>';
    el.onclick = () => { if (lock) return Sound.play('denied'); Sound.play('ui'); G.chapterView = ci; buildLevels(); show('levels'); }; list.appendChild(el);
  });
}
function buildLevels() {
  const tabs = $('level-tabs'), grid = $('level-grid'); tabs.innerHTML = ''; grid.innerHTML = '';
  CHAPTERS.forEach((c, ci) => { const b = document.createElement('button'), lock = !unlocked(ci * 10); b.className = 'tab' + (ci === G.chapterView ? ' on' : '') + (lock ? ' lock' : ''); b.innerHTML = (lock ? '<svg><use href="#i-lock"/></svg>' : '') + 'Chapter ' + (ci + 1); b.onclick = () => { if (lock) return; G.chapterView = ci; buildLevels(); }; tabs.appendChild(b); });
  for (let i = G.chapterView * 10; i < G.chapterView * 10 + 10; i++) {
    const lock = !unlocked(i), g = gen(i), b = document.createElement('button'); b.className = 'lv' + (lock ? ' lock' : '') + (i === save.last && !lock ? ' on' : ''); b.appendChild(thumb(g, lock));
    const st = save.stars[i] || 0; b.insertAdjacentHTML('beforeend', '<b>' + (i - G.chapterView * 10 + 1) + '</b><span class="nm">' + LEVELS[i].name + '</span>' + (lock ? '<svg class="lk"><use href="#i-lock"/></svg>' : '<span class="st">' + [0, 1, 2].map(k => '<svg class="' + (k < st ? 'f' : '') + '"><use href="#i-star"/></svg>').join('') + '</span>'));
    b.onclick = () => { if (lock) return Sound.play('denied'); Sound.play('ui'); startLevel(i); }; grid.appendChild(b);
  }
}

/* ---------------- level flow ---------------- */
function setLoading(on, text, pct) { overlay('load', on); if (text) $('load-text').textContent = text; if (pct !== undefined) $('load-bar').style.width = pct + '%'; }
function nextFrame() { return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); }
async function startLevel(i) {
  setLoading(true, 'Entering ' + LEVELS[i].name, 20); ['pause', 'win', 'dead', 'note', 'keypad', 'settings', 'how', 'credits'].forEach(o => overlay(o, false)); await nextFrame();
  G.level = i; save.last = i; persist(); G.chapterView = LEVELS[i].ch; const w = new World(gen(i), { diff: save.set.diff }); G.world = w; setLoading(true, null, 55); await nextFrame(); G.view.loadLevel(w); setLoading(true, null, 95); await nextFrame();
  G.mode = 'game'; show('game'); G.paused = false; G.modal = false; G.over = false; G.ended = 0; G.timeSpent = 0; G.acc = 0; G.hintT = 8; G.shownHint = -1; G.lastInv = ''; G.menu = false; inp.sprintBtn = false; $('b-sprint').classList.remove('on');
  $('hint').textContent = save.set.hints ? LEVELS[i].hint : ''; $('hint').classList.toggle('show', save.set.hints); G.chapterAudio = LEVELS[i].ch; applyAudio(); Sound.unlock(); buildHotbar(true);
  setLoading(false, null, 100); G.last = performance.now(); $('fx-hurt').style.opacity = 0; if (!coarse) lockPointer();
}
function lockPointer() { const c = $('view'); if (c.requestPointerLock && !document.pointerLockElement) { try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } } }
function pause(on) { if (G.mode !== 'game' || G.over) return; G.paused = on; overlay('pause', on); if (on && document.pointerLockElement) document.exitPointerLock(); if (!on && !coarse) lockPointer(); if (on) Sound.suspend && Sound.suspend(); else Sound.resume && Sound.resume(); }
function winLevel() {
  const w = G.world; G.over = true; const t = G.timeSpent, par = w.gen.par; let stars = 1; if (w.huntCount <= 1) stars++; if (w.huntCount === 0 && t <= par * 1.25) stars++;
  const prev = save.stars[G.level] || 0; if (stars > prev) save.stars[G.level] = stars; if (!save.best[G.level] || t < save.best[G.level]) save.best[G.level] = Math.round(t); persist();
  Sound.play('win'); $('win-stars').innerHTML = [0, 1, 2].map(k => '<svg class="' + (k < stars ? 'f' : '') + '"><use href="#i-star"/></svg>').join(''); $('win-info').textContent = 'Time ' + fmt(t) + ' · par ' + fmt(par) + ' · ' + (w.huntCount ? 'hunted ' + w.huntCount + '×' : 'never seen');
  $('w-next').style.display = G.level + 1 < LEVELS.length ? '' : 'none'; setTimeout(() => { overlay('win', true); if (document.pointerLockElement) document.exitPointerLock(); }, 900); G.winStars = stars;
}
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function loseLevel() { G.over = true; vibe([80, 60, 160]); setTimeout(() => { overlay('dead', true); if (document.pointerLockElement) document.exitPointerLock(); }, 1700); }
function toMenu() { ['pause', 'win', 'dead', 'note', 'keypad'].forEach(o => overlay(o, false)); G.mode = 'home'; G.world = null; startMenuScene(); show('home'); Sound.scene({ menu: true }); }

/* ---------------- menu scene: the first corridor, something far down it ---------------- */
async function startMenuScene() {
  const spec = Object.assign({}, LEVELS[0], { name: 'menu', creatures: ['stalker'], pulses: 0 }); const w = new World(generate(spec), {}); G.menuWorld = w; G.view.loadLevel(w); G.view.menuMode = true; G.view.setQuality(G.view.qName);
  const p = w.player; let best = 0, by = p.yaw; for (let a = 0; a < 6.28; a += 0.1) { let d = 0; while (d < 30 && w.tileAt(p.x + Math.cos(a) * (d + 0.5), p.y + Math.sin(a) * (d + 0.5)) !== 0) d += 0.5; if (d > best) { best = d; by = a; } }
  p.yaw = by; const c = w.creatures[0]; const dd = Math.min(best * 0.85, 9); if (G.view.built) G.view.built.scene.fog.density = 0.032; c.x = p.x + Math.cos(by) * dd; c.y = p.y + Math.sin(by) * dd; c.yaw = by + Math.PI; c.state = 'roam'; c.wait = 1e9; c.post = { x: c.x, y: c.y, yaw: c.yaw }; p.flash = true; G.menuT = 0;
}

/* ---------------- HUD ---------------- */
const hotSlots = ['flash', 'card', 'key', 'fuse', 'radio'], ICON = { flash: 'i-flash', card: 'i-card', key: 'i-key', fuse: 'i-fuse', radio: 'i-radio' };
function buildHotbar(force) {
  const w = G.world; if (!w) return; const inv = w.player.inv, sig = [inv.card, inv.key, inv.fuse, inv.radio, w.player.flash].join(); if (!force && sig === G.lastInv) return; G.lastInv = sig; const bar = $('hotbar'); bar.innerHTML = '';
  hotSlots.forEach((k, n) => { const cnt = k === 'flash' ? 1 : inv[k], el = document.createElement('button'); el.className = 'slot' + (k === 'flash' ? (w.player.flash ? ' sel' : ' off') : cnt ? '' : ' empty'); el.innerHTML = '<svg><use href="#' + ICON[k] + '"/></svg>' + (k !== 'flash' && cnt > 1 ? '<i>' + cnt + '</i>' : ''); el.onpointerdown = (e) => { e.stopPropagation(); e.preventDefault(); if (k === 'flash') inp.edge.flash = true; else if (k === 'radio') inp.edge.radio = true; }; bar.appendChild(el); });
}
let noiseHist = new Array(44).fill(0);
function drawNoise(w, dt) {
  const cv = $('noise-cv'), x = cv.getContext('2d'), ni = w.noiseInfo(); G.noiseT += dt; if (G.noiseT < 0.06) return; G.noiseT = 0;
  const lvl = Math.max(ni.noise, w.player.moving ? (w.player.crouch ? 0.05 : w.player.sprint ? 0.55 : 0.2) : 0.02); noiseHist.push(lvl * (0.6 + 0.4 * Math.random())); noiseHist.shift();
  x.clearRect(0, 0, cv.width, cv.height); const col = ni.hunted ? '#ff3b47' : ni.alert > 0.3 ? '#f0b34a' : '#e5504f'; x.fillStyle = col; const bw = cv.width / noiseHist.length;
  noiseHist.forEach((v, i) => { const h = 2 + v * 28; x.globalAlpha = 0.35 + 0.65 * (i / noiseHist.length); x.fillRect(i * bw + 1, cv.height / 2 - h / 2, bw - 2, h); }); x.globalAlpha = 1;
  const n = $('noise'); n.classList.toggle('alert', ni.hunted); n.classList.toggle('warn', !ni.hunted && ni.alert > 0.3); n.classList.toggle('show', ni.hunted || ni.noise > 0.45); $('noise-msg').textContent = ni.hunted ? 'The creature has seen you. Run or hide!' : ni.noise > 0.45 ? 'Your sound is attracting something...' : '';
}
function banner(text, cls, ms) { const b = $('banner'); b.textContent = text; b.className = 'banner show ' + cls; G.bannerT = (ms || 1800) / 1000; }
function hud(w, dt) {
  const p = w.player; $('obj-text').textContent = w.objective().current; $('pulse-n').textContent = p.pulses; $('b-pulse').classList.toggle('dim', p.pulses <= 0); buildHotbar(false);
  const pr = w.prompt; const pe = $('prompt'); if (pr && !G.modal) { pe.classList.add('show'); pe.classList.toggle('no', /^Locked|needs/.test(pr.text)); $('prompt-text').textContent = pr.text; } else pe.classList.remove('show'); $('b-use').classList.toggle('can', !!pr && !/^Locked|needs/.test(pr.text));
  const st = $('stam'); st.classList.toggle('show', p.stamina < 0.98); st.classList.toggle('tired', p.tired); st.firstChild.style.width = (p.stamina * 100) + '%'; $('b-crouch').classList.toggle('on', p.crouch);
  if (G.bannerT > 0) { G.bannerT -= dt; if (G.bannerT <= 0) $('banner').classList.remove('show'); } if (G.hintT > 0) { G.hintT -= dt; if (G.hintT <= 0) $('hint').classList.remove('show'); }
  drawNoise(w, dt); $('fx-locker').style.opacity = p.hidden >= 0 ? 1 : 0; const th = w.threat; $('fx-hurt').style.opacity = (w.over === 'dead') ? 0.9 : Math.max(0, th - 0.55) * 0.9 * (0.7 + 0.3 * Math.sin(G.now * 6));
}

/* ---------------- events -> sound, banners, vibration ---------------- */
let hbTimer = 0;
function handleEvents(w, dt) {
  const p = w.player;
  for (const e of w.drainEvents()) {
    switch (e.type) {
      case 'step': if (e.kind === 'glass') Sound.play('glass', { crouch: e.crouch }); else Sound.play('step', { crouch: e.crouch, run: e.sprint, v: e.kind === 'water' ? 1.5 : 1 }); break;
      case 'pulse': Sound.play('ping'); Sound.duck(); $('fx-flash').style.transition = 'none'; $('fx-flash').style.opacity = 0.18; requestAnimationFrame(() => { $('fx-flash').style.transition = 'opacity .8s ease-out'; $('fx-flash').style.opacity = 0; }); vibe(30); break;
      case 'pickup': Sound.play('key'); G.view.reach(); buildHotbar(true); break;
      case 'door': { const s = spatial(e.x, e.y); if (s.d < 16) Sound.play('door'); if (e.by !== 'creature') G.view.reach(); break; }
      case 'unlock': Sound.play('unlock'); G.view.reach(); break;
      case 'denied': Sound.play('denied'); banner(e.text, 'sus', 1100); break;
      case 'hide': Sound.play('hide'); break;
      case 'vent': Sound.play('vent'); break;
      case 'generator': Sound.play('gen'); G.view.reach(); break;
      case 'valve': Sound.play('door'); setTimeout(() => Sound.play('thump', { pan: 0 }), 300); G.view.reach(); break;
      case 'radio': Sound.play('radio'); break;
      case 'radioburst': { const s = spatial(e.x, e.y); if (s.d < 22) Sound.play('radio'); break; }
      case 'reveal': Sound.play('unlock'); break;
      case 'note': $('note-code').textContent = e.code; G.modal = true; overlay('note', true); if (document.pointerLockElement) document.exitPointerLock(); break;
      case 'keypad': openKeypad(e.id); break;
      case 'heard': { const s = spatial(e.x, e.y); if (s.d < 20) { Sound.play('heard'); banner('IT HEARD THAT', 'heard', 1500); } break; }
      case 'suspicious': Sound.play('notice'); banner('SUSPICIOUS', 'sus', 1800); break;
      case 'hunt': { const s = spatial(e.x, e.y); Sound.play('hunt'); Sound.play('roar', { v: Math.max(0.35, s.v), pan: s.pan, kind: w.creatures[e.id].t }); banner('IT SEES YOU!', 'seen', 2400); vibe([60, 40, 60]); G.view.shake = 0.5; break; }
      case 'lost': Sound.play('lost'); banner('IT LOST YOU', 'heard', 1500); break;
      case 'cstep': { const s = spatial(e.x, e.y); const v = Math.max(0, 1 - s.d / 14); if (v > 0.03) Sound.play('cstep', { v: v * (e.hunt ? 1 : 0.8), pan: s.pan, kind: w.creatures[e.id].t }); break; }
      case 'caught': Sound.play('caught'); G.view.shake = 0.8; loseLevel(); break;
      case 'win': winLevel(); break;
    }
  }
  /* heartbeat and breathing follow the threat */
  hbTimer -= dt; if (w.threat > 0.35 && hbTimer <= 0 && p.alive) { hbTimer = 1.05 - 0.55 * w.threat; Sound.play('heart', { v: Math.min(1, w.threat * 1.2) }); if (w.threat > 0.8 && Math.random() < 0.3) vibe(25); }
  const nearGen = w.gens.find(g => g.on); Sound.scene({ chapter: LEVELS[G.level].ch, threat: w.threat, hunted: w.creatures.some(c => c.state === 'hunt'), gen: nearGen ? clamp(1 - Math.hypot(nearGen.x - p.x, nearGen.y - p.y) / 22, 0, 1) : 0, genPan: nearGen ? spatial(nearGen.x + 0.5, nearGen.y + 0.5).pan : 0, paused: G.paused });
  Sound.tick(dt, LEVELS[G.level].ch, w.threat > 0.5);
}

/* ---------------- keypad ---------------- */
let kpDoor = null, kpCode = '';
function openKeypad(id) { kpDoor = id; kpCode = ''; $('kp-screen').textContent = '----'; G.modal = true; overlay('keypad', true); if (document.pointerLockElement) document.exitPointerLock(); }
(function () { const g = $('kp-grid'); ['1', '2', '3', '4', '5', '6', '7', '8', '9', '<', '0', 'OK'].forEach(k => { const b = document.createElement('button'); b.textContent = k; b.onclick = () => { Sound.play('ui'); if (k === '<') kpCode = kpCode.slice(0, -1); else if (k === 'OK') { if (kpCode.length === 4 && G.world.enterCode(kpDoor, kpCode)) { overlay('keypad', false); G.modal = false; if (!coarse) lockPointer(); return; } kpCode = ''; } else if (kpCode.length < 4) kpCode += k; $('kp-screen').textContent = (kpCode + '----').slice(0, 4); }; g.appendChild(b); }); })();
$('kp-cancel').onclick = () => { overlay('keypad', false); G.modal = false; G.world.keypad = null; if (!coarse) lockPointer(); };
$('note-ok').onclick = () => { overlay('note', false); G.modal = false; if (!coarse) lockPointer(); };

/* ---------------- input ---------------- */
const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
window.addEventListener('keydown', (e) => {
  if (G.mode !== 'game') return; if (e.code === 'Escape') { if (!anyOverlay() || $('ov-pause').classList.contains('show')) pause(!G.paused); return; } if (G.paused || G.modal || G.over) return; if (e.repeat) return;
  const c = e.code; if (KEYMAP[c]) inp.keys[KEYMAP[c]] = true; else if (c === 'ShiftLeft' || c === 'ShiftRight') inp.keys.sprint = true; else if (c === 'KeyE' || c === 'Enter') inp.edge.interact = true; else if (c === 'Space' || c === 'KeyQ') { inp.edge.pulse = true; e.preventDefault(); } else if (c === 'KeyC' || c === 'ControlLeft') inp.edge.crouch = true; else if (c === 'KeyF') inp.edge.flash = true; else if (c === 'KeyR') inp.edge.radio = true;
});
window.addEventListener('keyup', (e) => { const c = e.code; if (KEYMAP[c]) inp.keys[KEYMAP[c]] = false; else if (c === 'ShiftLeft' || c === 'ShiftRight') inp.keys.sprint = false; });
window.addEventListener('blur', () => { inp.keys = {}; if (G.mode === 'game' && !G.over) pause(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'game' && !G.over) pause(true); });
document.addEventListener('pointerlockchange', () => { if (G.mode === 'game' && !document.pointerLockElement && !G.paused && !G.over && !G.modal && !coarse && !anyOverlay()) pause(true); });
document.addEventListener('mousemove', (e) => { if (!document.pointerLockElement || G.paused || G.modal) return; const s = 0.0022 * save.set.sens / 100; inp.dyaw += e.movementX * s; inp.dpitch += -e.movementY * s * (save.set.inv ? -1 : 1); });
$('view').addEventListener('mousedown', () => { if (G.mode === 'game' && !G.paused && !G.modal && !coarse && !G.over) lockPointer(); });
/* touch: a floating stick on the left, look-drag on the right, buttons */
const touch = { stick: null, look: null }; const R = 56;
function stickReset() { touch.stick = null; inp.fwd = 0; inp.str = 0; const st = $('stick'); st.firstChild.style.transform = ''; st.style.left = ''; st.style.top = ''; st.style.bottom = ''; }
$('scr-game').addEventListener('pointerdown', (e) => {
  if (G.mode !== 'game' || G.paused || G.modal || G.over) return; if (e.target.closest('.act, .slot, .icon-btn, .hotbar, .overlay')) return; const half = innerWidth * 0.45;
  if (e.clientX < half && !touch.stick) { touch.stick = { id: e.pointerId, x: e.clientX, y: e.clientY }; const st = $('stick'); st.style.left = (e.clientX - 66) + 'px'; st.style.top = (e.clientY - 66) + 'px'; st.style.bottom = 'auto'; st.style.display = 'block'; }
  else if (e.clientX >= half && !touch.look) touch.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
  try { $('scr-game').setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
});
$('scr-game').addEventListener('pointermove', (e) => {
  if (touch.stick && e.pointerId === touch.stick.id) { let dx = e.clientX - touch.stick.x, dy = e.clientY - touch.stick.y; const d = Math.hypot(dx, dy); if (d > R) { dx = dx / d * R; dy = dy / d * R; } $('stick').firstChild.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; inp.str = dx / R; inp.fwd = -dy / R; if (Math.hypot(inp.str, inp.fwd) < 0.12) { inp.str = inp.fwd = 0; } }
  else if (touch.look && e.pointerId === touch.look.id) { const s = 0.0052 * save.set.sens / 100; inp.dyaw += (e.clientX - touch.look.x) * s; inp.dpitch += -(e.clientY - touch.look.y) * s * (save.set.inv ? -1 : 1); touch.look.x = e.clientX; touch.look.y = e.clientY; }
});
const endTouch = (e) => { if (touch.stick && e.pointerId === touch.stick.id) stickReset(); if (touch.look && e.pointerId === touch.look.id) touch.look = null; };
$('scr-game').addEventListener('pointerup', endTouch); $('scr-game').addEventListener('pointercancel', endTouch);
const press = (id, fn) => { const el = $(id); el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (G.mode === 'game' && !G.paused && !G.modal && !G.over) fn(); }); };
press('b-pulse', () => { inp.edge.pulse = true; }); press('b-crouch', () => { inp.edge.crouch = true; }); press('b-use', () => { inp.edge.interact = true; }); press('b-sprint', () => { inp.sprintBtn = !inp.sprintBtn; $('b-sprint').classList.toggle('on', inp.sprintBtn); });
$('b-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pause(true); });

/* ---------------- menu wiring ---------------- */
$('m-play').onclick = () => { Sound.play('ui'); buildChapters(); show('chapters'); }; $('m-levels').onclick = () => { Sound.play('ui'); G.chapterView = Math.min(2, Math.floor(save.last / 10)); buildLevels(); show('levels'); };
$('m-settings').onclick = () => { Sound.play('ui'); openSettings(); }; $('m-how').onclick = () => { Sound.play('ui'); overlay('how', true); }; $('m-credits').onclick = () => { Sound.play('ui'); overlay('credits', true); };
$('m-exit').onclick = () => { Sound.play('ui'); try { window.close(); } catch (e) { /* ignore */ } toMenu(); };
qa('[data-go]').forEach(b => { b.onclick = () => { Sound.play('ui'); const g = b.getAttribute('data-go'); if (g === 'chapters') buildChapters(); show(g); }; });
qa('[data-close]').forEach(b => { b.onclick = () => { Sound.play('ui'); overlay(b.getAttribute('data-close'), false); }; });
$('p-resume').onclick = () => pause(false); $('p-restart').onclick = () => { Sound.play('ui'); overlay('pause', false); startLevel(G.level); }; $('p-settings').onclick = () => openSettings(); $('p-menu').onclick = () => { Sound.play('ui'); toMenu(); };
$('w-next').onclick = () => { Sound.play('ui'); overlay('win', false); startLevel(Math.min(LEVELS.length - 1, G.level + 1)); }; $('w-retry').onclick = () => { overlay('win', false); startLevel(G.level); }; $('w-menu').onclick = () => { overlay('win', false); toMenu(); buildLevels(); show('levels'); };
$('d-retry').onclick = () => { overlay('dead', false); startLevel(G.level); }; $('d-menu').onclick = () => { overlay('dead', false); toMenu(); buildLevels(); show('levels'); };
$('gate-go').onclick = () => { overlay('gate', false); Sound.unlock(); applyAudio(); Sound.scene({ menu: true }); Sound.play('ui'); };
/* settings */
function openSettings() { syncSettings(); overlay('settings', true); }
$('s-close').onclick = () => { overlay('settings', false); persist(); };
qa('#s-tabs button').forEach(b => { b.onclick = () => { qa('#s-tabs button').forEach(x => x.classList.toggle('on', x === b)); qa('.spage').forEach(p => p.classList.toggle('on', p.id === 'sp-' + b.getAttribute('data-t'))); }; });
function seg(id, key, fn) { qa('#' + id + ' button').forEach(b => { b.onclick = () => { save.set[key] = b.getAttribute('data-v'); syncSettings(); fn && fn(); persist(); Sound.play('ui'); }; }); }
function syncSettings() { const s = save.set; qa('#set-gfx button').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === s.gfx)); qa('#set-aq button').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === s.aq)); qa('#set-diff button').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === s.diff)); $('set-bright').value = s.bright; $('set-vibe').checked = s.vibe; $('set-hints').checked = s.hints; $('set-vol').value = s.vol; $('set-mvol').value = s.mvol; $('v-vol').textContent = s.vol + '%'; $('v-mvol').textContent = s.mvol + '%'; $('set-sound').checked = s.sound; $('set-music').checked = s.music; $('set-sens').value = s.sens; $('set-inv').checked = s.inv; }
function applyGfx() { const g = save.set.gfx, v = G.view; v.autoQ = g === 'auto'; v.setQuality(g === 'auto' ? (isMobile ? 'medium' : 'high') : g); v.brightness = save.set.bright / 100; }
seg('set-gfx', 'gfx', () => { applyGfx(); if (G.world) G.view.loadLevel(G.world); else startMenuScene(); }); seg('set-diff', 'diff', () => { if (G.world && !G.over) G.world.diff = { easy: { sight: 0.75, alert: 0.7, speed: 0.9 }, normal: { sight: 1, alert: 1, speed: 1 }, hard: { sight: 1.2, alert: 1.3, speed: 1.12 } }[save.set.diff]; }); seg('set-aq', 'aq', () => { Sound.setQuality(save.set.aq); Sound.unlock(); applyAudio(); });
const bindR = (id, key, fn) => { $(id).oninput = () => { save.set[key] = +$(id).value; fn && fn(); syncSettings(); }; $(id).onchange = persist; }, bindC = (id, key, fn) => { $(id).onchange = () => { save.set[key] = $(id).checked; fn && fn(); persist(); }; };
bindR('set-bright', 'bright', () => { G.view.brightness = save.set.bright / 100; }); bindR('set-vol', 'vol', applyAudio); bindR('set-mvol', 'mvol', applyAudio); bindR('set-sens', 'sens'); bindC('set-vibe', 'vibe', applyAudio); bindC('set-hints', 'hints'); bindC('set-sound', 'sound', applyAudio); bindC('set-music', 'music', applyAudio); bindC('set-inv', 'inv');
$('set-reset').onclick = () => { if ($('set-reset').dataset.sure) { save.stars = []; save.best = []; save.last = 0; persist(); delete $('set-reset').dataset.sure; $('set-reset').textContent = 'Reset'; } else { $('set-reset').dataset.sure = 1; $('set-reset').textContent = 'Sure?'; setTimeout(() => { delete $('set-reset').dataset.sure; $('set-reset').textContent = 'Reset'; }, 2500); } };

/* ---------------- the loop ---------------- */
function tickInput() {
  const k = inp.keys; let fwd = (k.f ? 1 : 0) - (k.b ? 1 : 0) + inp.fwd, str = (k.r ? 1 : 0) - (k.l ? 1 : 0) + inp.str; const m = Math.hypot(fwd, str); if (m > 1) { fwd /= m; str /= m; }
  const e = inp.edge, out = { fwd, str, sprint: !!k.sprint || inp.sprintBtn, dyaw: inp.dyaw, dpitch: inp.dpitch, interact: !!e.interact, pulse: !!e.pulse, crouchPress: !!e.crouch, flash: !!e.flash, radio: !!e.radio };
  inp.dyaw = 0; inp.dpitch = 0; inp.edge = {}; if (out.interact && G.world.prompt) G.view.reach(); return out;
}
function frame(ts) {
  requestAnimationFrame(frame); const now = ts / 1000, dt = Math.min(0.25, now - (G.lastTs || now)); G.lastTs = now; G.now = now; const v = G.view; if (!v || !v.built) return;
  if (G.mode === 'game' && G.world) {
    const w = G.world;
    if (!G.paused && !G.modal) { G.acc += dt; let n = 0; while (G.acc >= DT && n++ < 8) { const i = tickInput(); w.update(DT, i); if (!G.over || w.over === 'dead') G.timeSpent += DT; G.acc -= DT; handleEvents(w, DT); } if (n >= 8) G.acc = 0; }
    hud(w, dt); v.frame(w, G.paused || G.modal ? 0 : dt, now);
  } else if (G.menuWorld) { G.menuT += dt; const w = G.menuWorld; w.update(dt, {}); w.drainEvents(); v.setMenuCamera(w, G.menuT); v.camera.updateMatrixWorld(true); v.flashRig.position.copy(v.camera.position); v.flashRig.quaternion.copy(v.camera.quaternion); v.flash.intensity = 200; v.cone.visible = true; v.coneMat.uniforms.uInt.value = 0.1; v.handRoot.visible = false; v.menuFrame(w, dt, now); Sound.tick && Sound.tick(dt, 0, false); }
}
async function boot() {
  const v = G.view = new View($('view'), isMobile ? 'medium' : 'high'); v.onQuality = (q) => { save.set.gfx = save.set.gfx === 'auto' ? 'auto' : save.set.gfx; }; applyGfx(); applyAudio(); window.addEventListener('resize', () => v.resize());
  setLoading(true, 'Preparing the facility', 30); await nextFrame(); for (let i = 0; i < 30; i++) { gen(i); if (i % 6 === 0) { setLoading(true, null, 30 + i); await nextFrame(); } }
  await startMenuScene(); G.mode = 'home'; show('home'); syncSettings(); setLoading(false, null, 100); overlay('gate', !TEST); requestAnimationFrame(frame); Sound.setQuality(save.set.aq);
}
boot();
if (TEST) { window.HUSH = { G, save, inp, startLevel, toMenu, pause, view: () => G.view, world: () => G.world, LEVELS, runBot: (n) => runBot(G.world, n || 600), gen, step: (n, i) => { for (let k = 0; k < (n || 1); k++) { G.world.update(DT, i || {}); G.timeSpent += DT; handleEvents(G.world, DT); } }, unlockAll: () => { save.stars = LEVELS.map(() => 1); persist(); }, buildLevels, buildChapters, show }; }
