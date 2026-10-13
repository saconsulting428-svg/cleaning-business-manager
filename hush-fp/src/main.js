/* HUSH: Echoes in the Dark - game controller: screens, input (touch + keyboard/mouse), the fixed-step loop, HUD, audio hooks, saving.
   The rules live in logic/world.js, the picture in render/view.js; this file connects them to the player. */
import { View } from './render/view.js';
import { World, DT, PULSE_CD } from './logic/world.js';
import { generate, T } from './logic/gen.js';
import { LEVELS, CHAPTERS } from './logic/levels.js';
import { Sound } from './audio.js';
import * as AI from './logic/ai.js';
import { runBot } from './test/bot.js';

const $ = (id) => document.getElementById(id), qa = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TEST = /[?&]test=1\b/.test(location.search), UNLOCK = /[?&]unlock=1\b/.test(location.search);
const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window; const isMobile = coarse || /Android|iPhone|iPad/i.test(navigator.userAgent);
$('app').classList.toggle('touch', coarse);

/* ---------------- save ---------------- */
const KEY = 'hush.fp.v1';
const save = { v: 1, stars: [], best: [], set: { gfx: 'auto', bright: 100, vibe: true, hints: true, vol: 80, mvol: 60, sound: true, music: true, aq: 'auto', sens: 100, inv: false, diff: 'normal', marks: true }, last: 0 };
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
  setLoading(true, 'Entering ' + LEVELS[i].name, 20); ['pause', 'win', 'dead', 'note', 'keypad', 'settings', 'how', 'credits', 'inv', 'obj'].forEach(o => overlay(o, false)); await nextFrame();
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
function toMenu() { ['pause', 'win', 'dead', 'note', 'keypad', 'inv', 'obj'].forEach(o => overlay(o, false)); G.mode = 'home'; G.world = null; startMenuScene(); show('home'); Sound.scene({ menu: true }); }

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
const HC = {};                                                   // last values written to the DOM: nothing is touched unless it changed (cheap on phones)
function setT(id, v) { if (HC[id] !== v) { HC[id] = v; $(id).textContent = v; } }
function setC(id, cls, on) { const k = id + cls; if (HC[k] !== on) { HC[k] = on; $(id).classList.toggle(cls, on); } }
function setO(id, v) { v = Math.round(v * 20) / 20; if (HC[id + 'o'] !== v) { HC[id + 'o'] = v; $(id).style.opacity = v; } }
function hud(w, dt) {
  const p = w.player; G.hudT = (G.hudT || 0) + dt; if (G.bannerT > 0) { G.bannerT -= dt; if (G.bannerT <= 0) $('banner').classList.remove('show'); } if (G.hintT > 0) { G.hintT -= dt; if (G.hintT <= 0) $('hint').classList.remove('show'); }
  drawMarks(w);
  if (G.hudT < 0.066) return; const dtH = G.hudT; G.hudT = 0;
  setT('obj-text', w.objective().current); setT('pulse-n', p.pulses); setC('b-pulse', 'dim', p.pulses <= 0); const cdf = Math.round(w.pulseCd / PULSE_CD * 40) / 40; if (HC.cdf !== cdf) { HC.cdf = cdf; $('b-pulse').style.setProperty('--cd', cdf); } setC('b-pulse', 'cd', cdf > 0); setT('pulse-l', w.pulseCd > 0 ? w.pulseCd.toFixed(1) + 's' : 'Pulse'); buildHotbar(false);
  const pr = w.prompt, show = !!(pr && !G.modal); setC('prompt', 'show', show); if (show) { setC('prompt', 'no', /^Locked|needs/.test(pr.text)); setT('prompt-text', pr.text); }
  const st = $('stam'); setC('stam', 'show', p.stamina < 0.98); setC('stam', 'tired', p.tired); const sw = Math.round(p.stamina * 50) * 2 + '%'; if (HC.stw !== sw) { HC.stw = sw; st.firstChild.style.width = sw; } setC('b-crouch', 'on', p.crouch);
  drawNoise(w, dtH); setO('fx-locker', p.hidden >= 0 ? 1 : 0); const th = w.threat; setO('fx-hurt', (w.over === 'dead') ? 0.9 : Math.max(0, th - 0.55) * 0.9);
}


/* ---------------- sonar markers + threat direction ---------------- */
const MARKC = { item: '#ffd070', exit: '#3dff8a', door: '#ff8a5a', generator: '#ffcc22', valve: '#ff5533', note: '#fff0b0', locker: '#9ad', vent: '#9ad' };
let marksOn = false;
function drawMarks(w) {
  const cv = $('marks'), v = G.view, p = w.player; if (!cv || !v) return; const r = cv.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height); if (!W) return;
  const threats = w.creatures.filter(c => (c.state === 'hunt' || c.state === 'investigate' || c.state === 'suspicious') && Math.hypot(c.x - p.x, c.y - p.y) < 16 && p.alive);
  const pinged = save.set.marks && (w.pulseState || w.objs.some(o => o.pingT > 0)), reveal = w.creatures.some(c => c.revealT > 0);
  if (!pinged && !reveal && !threats.length) { if (marksOn) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); marksOn = false; } return; }
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } const x = cv.getContext('2d'); x.clearRect(0, 0, W, H); marksOn = true; v.camera.updateMatrixWorld(true);
  const T = v.camera.position.clone(), pr = (px, py, h) => { T.set(px * 2, h, py * 2).project(v.camera); return [(T.x * 0.5 + 0.5) * W, (-T.y * 0.5 + 0.5) * H, T.z < 1 && Math.abs(T.x) < 1.3]; };
  const edge = (sx, sy, behind, col, a) => { const cx = W / 2, cy = H / 2; let dx = sx - cx, dy = sy - cy; if (behind) { dx = -dx; dy = -dy; } const k = Math.min((W / 2 - 30) / Math.abs(dx || 1e-3), (H / 2 - 40) / Math.abs(dy || 1e-3)), ex = cx + dx * k, ey = cy + dy * k, ang = Math.atan2(dy, dx); x.save(); x.translate(ex, ey); x.rotate(ang); x.globalAlpha = a; x.fillStyle = col; x.beginPath(); x.moveTo(14, 0); x.lineTo(-8, 10); x.lineTo(-4, 0); x.lineTo(-8, -10); x.fill(); x.restore(); };
  const pulseK = 0.6 + 0.4 * Math.sin(performance.now() / 120);
  if (pinged) for (const o of w.objs) { if (!(o.pingT > 0) || !MARKC[o.type] || (o.type === 'item' && o.taken) || (o.type === 'door' && o.hidden && !o.revealed) || o.type === 'locker' || o.type === 'vent') continue; const [sx, sy, vis] = pr(o.x + 0.5, o.y + 0.5, REACH_H[o.type] || 1); if (!vis) continue; const a = Math.min(1, o.pingT / 1.5), c = MARKC[o.type];
    x.save(); x.globalAlpha = a; x.translate(sx, sy); x.rotate(Math.PI / 4); x.strokeStyle = c; x.lineWidth = 2; x.strokeRect(-7, -7, 14, 14); x.fillStyle = c; x.globalAlpha = a * 0.35; x.fillRect(-7, -7, 14, 14); x.restore(); }
  for (const c of w.creatures) { if (!(c.revealT > 0)) continue; const [sx, sy, vis] = pr(c.x, c.y, 1.4); if (vis) { x.save(); x.globalAlpha = Math.min(1, c.revealT); x.strokeStyle = '#ff3b47'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(sx, sy - 34); x.lineTo(sx + 14, sy - 12); x.lineTo(sx - 14, sy - 12); x.closePath(); x.stroke(); x.restore(); } }
  for (const c of threats) { const [sx, sy, vis] = pr(c.x, c.y, 1.4); if (vis && sx > 20 && sx < W - 20) continue; edge(sx, sy, !vis, c.state === 'hunt' ? '#ff3b47' : '#f0b34a', c.state === 'hunt' ? pulseK : 0.55); }
}

/* ---------------- inventory + objectives panels (the game holds still while they are open) ---------------- */
const INVINFO = { flash: ['Flashlight', 'A narrow beam. Switch it off to be harder to see. (F)'], card: ['Keycard', 'Opens doors with a blue card reader. Walk up and tap the door.'], key: ['Brass key', 'Opens doors with a gold lock.'], fuse: ['Fuse', 'Slot fuses into the generator to bring the power back.'], radio: ['Radio', 'Plays noise a little ahead of you. The creature goes there. One use each. (R)'], pulse: ['Sonar pulse', 'Reveals walls, doors, items and creatures for a few seconds. It also makes noise (radius 14) and needs ' + PULSE_CD + ' s to recharge.'] };
let invSel = 'flash';
function panel(id, on) {
  const open = $('ov-' + id).classList.contains('show');
  if (on) { if (G.mode !== 'game' || G.over || G.modal || anyOverlay() || !G.world) return; G.paused = true; if (document.pointerLockElement) document.exitPointerLock(); id === 'inv' ? drawInv() : drawObj(); overlay(id, true); Sound.play('ui'); }
  else if (open) { overlay(id, false); G.paused = false; if (!coarse) lockPointer(); }
}
function drawInv() {
  const w = G.world, inv = w.player.inv, cnt = { flash: w.player.flash ? 1 : 0, card: inv.card, key: inv.key, fuse: inv.fuse, radio: inv.radio, pulse: w.player.pulses }, g = $('inv-grid'); g.innerHTML = '';
  ['flash', 'pulse', 'card', 'key', 'fuse', 'radio'].forEach(k => { const b = document.createElement('button'); b.className = 'iv' + (k === invSel ? ' sel' : '') + (k !== 'flash' && !cnt[k] ? ' empty' : ''); b.innerHTML = '<svg><use href="#' + (k === 'pulse' ? 'i-pulse' : ICON[k]) + '"/></svg><span>' + INVINFO[k][0] + '</span>' + (k === 'flash' ? '<i>' + (cnt.flash ? 'ON' : 'OFF') + '</i>' : '<i>' + cnt[k] + '</i>'); b.onclick = () => { invSel = k; Sound.play('ui'); drawInv(); }; g.appendChild(b); });
  $('inv-desc').textContent = INVINFO[invSel][0] + ' - ' + INVINFO[invSel][1]; const u = $('inv-use'); u.hidden = !(invSel === 'flash' || (invSel === 'radio' && inv.radio > 0)); u.textContent = invSel === 'flash' ? (w.player.flash ? 'Switch off' : 'Switch on') : 'Use radio';
}
function drawObj() { const o = G.world.objective(), l = $('obj-list'); l.innerHTML = ''; let cur = true; o.steps.forEach(st => { const li = document.createElement('li'); li.className = st.done ? 'done' : cur ? 'cur' : ''; if (!st.done) cur = false; li.innerHTML = '<svg><use href="#' + (st.done ? 'i-check' : 'i-bulb') + '"/></svg><span></span>'; li.lastChild.textContent = st.text; l.appendChild(li); }); $('obj-hint').textContent = 'Hint: ' + LEVELS[G.level].hint; }
for (const [id, pn] of [['b-bag', 'inv'], ['obj', 'obj']]) $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); panel(pn, true); });
$('inv-use').onclick = () => { const k = invSel; panel('inv', false); if (k === 'flash') inp.edge.flash = true; else inp.edge.radio = true; };
qa('[data-pclose]').forEach(b => { b.onclick = () => { Sound.play('ui'); panel(b.getAttribute('data-pclose'), false); }; });
document.addEventListener('keydown', (e) => { if (e.code === 'Escape') { if ($('ov-inv').classList.contains('show')) panel('inv', false); else if ($('ov-obj').classList.contains('show')) panel('obj', false); } else if (G.mode === 'game' && (e.code === 'KeyI' || e.code === 'Tab')) { e.preventDefault(); $('ov-inv').classList.contains('show') ? panel('inv', false) : panel('inv', true); } else if (G.mode === 'game' && e.code === 'KeyO') { $('ov-obj').classList.contains('show') ? panel('obj', false) : panel('obj', true); } }, true);

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
      case 'pulsecd': banner('SONAR RECHARGING', 'sus', 700); break;
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
$('view').addEventListener('mousedown', (e) => { if (G.mode === 'game' && !G.paused && !G.modal && !coarse && !G.over) { if (document.pointerLockElement) { const r = $('view').getBoundingClientRect(); tapAt(r.left + r.width / 2, r.top + r.height / 2); } else lockPointer(); } });
/* tap or click a thing to use it: the object nearest the tap on screen, within reach (doors, lockers, items, vents, generator, valve, exit) */
const REACH_H = { door: 1.3, locker: 1.0, item: 0.95, generator: 0.9, valve: 1.2, note: 0.1, vent: 0.55, exit: 1.3 };
function tapAt(cx, cy) {
  const w = G.world, v = G.view; if (!w || G.paused || G.modal || G.over || !w.player.alive) return false; const p = w.player;
  if (p.hidden >= 0) { inp.edge.interact = true; return true; }
  const rect = $('view').getBoundingClientRect(), R = Math.max(80, Math.min(rect.width, rect.height) * 0.2); let best = null, bd = 1e9; const tmp = v.tmpV || (v.tmpV = v.camera.position.clone());
  v.camera.updateMatrixWorld(true);
  for (const o of w.objs) {
    if (!REACH_H[o.type] || (o.type === 'item' && o.taken) || (o.type === 'door' && o.hidden && !o.revealed)) continue; const d = Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y); if (d > 3.4) continue;
    tmp.set((o.x + 0.5) * 2, REACH_H[o.type], (o.y + 0.5) * 2).project(v.camera); if (tmp.z > 1 || tmp.z < -1) continue;
    const sx = (tmp.x * 0.5 + 0.5) * rect.width + rect.left, sy = (-tmp.y * 0.5 + 0.5) * rect.height + rect.top, dd = Math.hypot(sx - cx, sy - cy) / (o.type === 'door' || o.type === 'exit' ? 1.6 : 1) + d * 4;
    if (dd < R && dd < bd) { bd = dd; best = o; }
  }
  if (best) { const ok = w.interactWith(best); if (ok) v.reach(); return ok; }
  if (w.prompt && Math.hypot(cx - (rect.left + rect.width / 2), cy - (rect.top + rect.height / 2)) < R * 1.6) { inp.edge.interact = true; return true; }
  return false;
}
$('prompt').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (G.mode === 'game' && !G.paused && !G.modal && !G.over) inp.edge.interact = true; });
/* touch: a floating stick on the left, look-drag on the right, buttons */
const touch = { stick: null, look: null }; const R = 56;
function stickReset() { touch.stick = null; inp.fwd = 0; inp.str = 0; const st = $('stick'); st.firstChild.style.transform = ''; st.style.left = ''; st.style.top = ''; st.style.bottom = ''; }
$('scr-game').addEventListener('pointerdown', (e) => {
  if (G.mode !== 'game' || G.paused || G.modal || G.over) return; if (e.target.closest('.act, .slot, .icon-btn, .hotbar, .overlay')) return; const half = innerWidth * 0.45;
  if (e.clientX < half && !touch.stick) { touch.stick = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false }; const st = $('stick'); st.style.left = (e.clientX - 66) + 'px'; st.style.top = (e.clientY - 66) + 'px'; st.style.bottom = 'auto'; st.style.display = 'block'; }
  else if (e.clientX >= half && !touch.look) touch.look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
  try { $('scr-game').setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
});
$('scr-game').addEventListener('pointermove', (e) => {
  if (touch.stick && e.pointerId === touch.stick.id) { let dx = e.clientX - touch.stick.x, dy = e.clientY - touch.stick.y; const d = Math.hypot(dx, dy); if (d > 12) touch.stick.moved = true; if (d > R) { dx = dx / d * R; dy = dy / d * R; } $('stick').firstChild.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; inp.str = dx / R; inp.fwd = -dy / R; if (Math.hypot(inp.str, inp.fwd) < 0.12) { inp.str = inp.fwd = 0; } }
  else if (touch.look && e.pointerId === touch.look.id) { if (Math.hypot(e.clientX - touch.look.sx, e.clientY - touch.look.sy) > 12) touch.look.moved = true; const s = 0.0052 * save.set.sens / 100; inp.dyaw += (e.clientX - touch.look.x) * s; inp.dpitch += -(e.clientY - touch.look.y) * s * (save.set.inv ? -1 : 1); touch.look.x = e.clientX; touch.look.y = e.clientY; }
});
const endTouch = (e) => {
  const t0 = performance.now();
  if (touch.stick && e.pointerId === touch.stick.id) { const st = touch.stick; if (t0 - st.t < 320 && !st.moved) tapAt(st.x, st.y); stickReset(); }
  if (touch.look && e.pointerId === touch.look.id) { const lk = touch.look; if (t0 - lk.t < 320 && !lk.moved) tapAt(lk.sx, lk.sy); touch.look = null; }
};
$('scr-game').addEventListener('pointerup', endTouch); $('scr-game').addEventListener('pointercancel', endTouch);
const press = (id, fn) => { const el = $(id); el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (G.mode === 'game' && !G.paused && !G.modal && !G.over) fn(); }); };
press('b-pulse', () => { inp.edge.pulse = true; }); press('b-crouch', () => { inp.edge.crouch = true; }); press('b-sprint', () => { inp.sprintBtn = !inp.sprintBtn; $('b-sprint').classList.toggle('on', inp.sprintBtn); });
$('b-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); pause(true); });

/* ---------------- menu wiring ---------------- */
$('m-play').onclick = () => { landscape(); Sound.play('ui'); buildChapters(); show('chapters'); }; $('m-levels').onclick = () => { Sound.play('ui'); G.chapterView = Math.min(2, Math.floor(save.last / 10)); buildLevels(); show('levels'); };
$('m-settings').onclick = () => { Sound.play('ui'); openSettings(); }; $('m-how').onclick = () => { Sound.play('ui'); overlay('how', true); }; $('m-credits').onclick = () => { Sound.play('ui'); overlay('credits', true); };
$('m-exit').onclick = () => { Sound.play('ui'); try { window.close(); } catch (e) { /* ignore */ } toMenu(); };
qa('[data-go]').forEach(b => { b.onclick = () => { Sound.play('ui'); const g = b.getAttribute('data-go'); if (g === 'chapters') buildChapters(); show(g); }; });
qa('[data-close]').forEach(b => { b.onclick = () => { Sound.play('ui'); overlay(b.getAttribute('data-close'), false); }; });
$('p-resume').onclick = () => pause(false); $('p-restart').onclick = () => { Sound.play('ui'); overlay('pause', false); startLevel(G.level); }; $('p-settings').onclick = () => openSettings(); $('p-menu').onclick = () => { Sound.play('ui'); toMenu(); };
$('w-next').onclick = () => { Sound.play('ui'); overlay('win', false); startLevel(Math.min(LEVELS.length - 1, G.level + 1)); }; $('w-retry').onclick = () => { overlay('win', false); startLevel(G.level); }; $('w-menu').onclick = () => { overlay('win', false); toMenu(); buildLevels(); show('levels'); };
$('d-retry').onclick = () => { overlay('dead', false); startLevel(G.level); }; $('d-menu').onclick = () => { overlay('dead', false); toMenu(); buildLevels(); show('levels'); };
function landscape() { try { const el = document.documentElement; if (coarse && !document.fullscreenElement && el.requestFullscreen) { const r = el.requestFullscreen({ navigationUI: 'hide' }); if (r && r.then) r.then(() => { if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape'); }).catch(() => {}); } else if (screen.orientation && screen.orientation.lock && coarse) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* not supported */ } }
if (window.matchMedia) { const mq = matchMedia('(orientation: portrait)'); const f = () => { if (coarse && mq.matches && G.mode === 'game' && !G.over) pause(true); }; if (mq.addEventListener) mq.addEventListener('change', f); }
$('gate-go').onclick = () => { landscape(); overlay('gate', false); Sound.unlock(); applyAudio(); Sound.scene({ menu: true }); Sound.play('ui'); };
/* settings */
function openSettings() { syncSettings(); overlay('settings', true); }
$('s-close').onclick = () => { overlay('settings', false); persist(); };
qa('#s-tabs button').forEach(b => { b.onclick = () => { qa('#s-tabs button').forEach(x => x.classList.toggle('on', x === b)); qa('.spage').forEach(p => p.classList.toggle('on', p.id === 'sp-' + b.getAttribute('data-t'))); }; });
function seg(id, key, fn) { qa('#' + id + ' button').forEach(b => { b.onclick = () => { save.set[key] = b.getAttribute('data-v'); syncSettings(); fn && fn(); persist(); Sound.play('ui'); }; }); }
function syncSettings() { const s = save.set; qa('#set-gfx button').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === s.gfx)); qa('#set-aq button').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === s.aq)); qa('#set-diff button').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === s.diff)); $('set-bright').value = s.bright; $('set-vibe').checked = s.vibe; $('set-hints').checked = s.hints; $('set-marks').checked = s.marks; $('set-vol').value = s.vol; $('set-mvol').value = s.mvol; $('v-vol').textContent = s.vol + '%'; $('v-mvol').textContent = s.mvol + '%'; $('set-sound').checked = s.sound; $('set-music').checked = s.music; $('set-sens').value = s.sens; $('set-inv').checked = s.inv; }
function applyGfx() { const g = save.set.gfx, v = G.view; v.autoQ = g === 'auto' && (!TEST || /[?&]adapt=1\b/.test(location.search)); v.setQuality(g === 'auto' ? (isMobile ? 'medium' : 'high') : g); v.brightness = save.set.bright / 100; }
seg('set-gfx', 'gfx', () => { applyGfx(); if (G.world) G.view.loadLevel(G.world); else startMenuScene(); }); seg('set-diff', 'diff', () => { if (G.world && !G.over) G.world.diff = { easy: { sight: 0.75, alert: 0.7, speed: 0.9 }, normal: { sight: 1, alert: 1, speed: 1 }, hard: { sight: 1.2, alert: 1.3, speed: 1.12 } }[save.set.diff]; }); seg('set-aq', 'aq', () => { Sound.setQuality(save.set.aq); Sound.unlock(); applyAudio(); });
const bindR = (id, key, fn) => { $(id).oninput = () => { save.set[key] = +$(id).value; fn && fn(); syncSettings(); }; $(id).onchange = persist; }, bindC = (id, key, fn) => { $(id).onchange = () => { save.set[key] = $(id).checked; fn && fn(); persist(); }; };
bindR('set-bright', 'bright', () => { G.view.brightness = save.set.bright / 100; }); bindR('set-vol', 'vol', applyAudio); bindR('set-mvol', 'mvol', applyAudio); bindR('set-sens', 'sens'); bindC('set-vibe', 'vibe', applyAudio); bindC('set-hints', 'hints'); bindC('set-marks', 'marks'); bindC('set-sound', 'sound', applyAudio); bindC('set-music', 'music', applyAudio); bindC('set-inv', 'inv');
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
    hud(w, dt); const pl = w.player, free = pl.alive && pl.hidden < 0 && !pl.vent && !G.paused && !G.modal; v.frame(w, G.paused || G.modal ? 0 : dt, now, { alpha: G.paused || G.modal ? 1 : clamp(G.acc / DT, 0, 1), look: free ? { yaw: pl.yaw + inp.dyaw, pitch: clamp(pl.pitch + inp.dpitch, -1.25, 1.25) } : null });
  } else if (G.menuWorld) { G.menuT += dt; const w = G.menuWorld; w.update(dt, {}); w.drainEvents(); v.setMenuCamera(w, G.menuT); v.camera.updateMatrixWorld(true); v.flashRig.position.copy(v.camera.position); v.flashRig.quaternion.copy(v.camera.quaternion); v.flash.intensity = 200; v.cone.visible = true; v.coneMat.uniforms.uInt.value = 0.1; v.handRoot.visible = false; v.menuFrame(w, dt, now); Sound.tick && Sound.tick(dt, 0, false); }
}
async function boot() {
  const v = G.view = new View($('view'), isMobile ? 'medium' : 'high', { aa: !isMobile }); v.onQuality = (q) => { save.set.gfx = save.set.gfx === 'auto' ? 'auto' : save.set.gfx; }; if (isMobile) v.resScale = 0.85; applyGfx(); applyAudio(); window.addEventListener('resize', () => v.resize());
  setLoading(true, 'Preparing the facility', 30); await nextFrame(); for (let i = 0; i < 30; i++) { gen(i); if (i % 6 === 0) { setLoading(true, null, 30 + i); await nextFrame(); } }
  await startMenuScene(); G.mode = 'home'; show('home'); syncSettings(); setLoading(false, null, 100); overlay('gate', !TEST); requestAnimationFrame(frame); Sound.setQuality(save.set.aq);
}
boot();
if (TEST) { window.HUSH = { G, save, inp, ai: AI, tapAt, proj: (o) => { const v = G.view, r = $('view').getBoundingClientRect(), t = v.camera.position.clone(); v.camera.updateMatrixWorld(true); t.set((o.x + 0.5) * 2, REACH_H[o.type] || 1, (o.y + 0.5) * 2).project(v.camera); return [(t.x * 0.5 + 0.5) * r.width + r.left, (-t.y * 0.5 + 0.5) * r.height + r.top]; }, startLevel, toMenu, pause, view: () => G.view, world: () => G.world, LEVELS, runBot: (n) => runBot(G.world, n || 600), gen, step: (n, i) => { for (let k = 0; k < (n || 1); k++) { G.world.update(DT, i || {}); G.timeSpent += DT; handleEvents(G.world, DT); } }, unlockAll: () => { save.stars = LEVELS.map(() => 1); persist(); }, buildLevels, buildChapters, show }; }
