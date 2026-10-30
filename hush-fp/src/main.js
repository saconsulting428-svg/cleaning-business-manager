/* HUSH: Echoes in the Dark - game controller: screens, input (touch + keyboard/mouse), the fixed-step loop, HUD, audio hooks, saving.
   The rules live in logic/world.js, the picture in render/view.js; this file connects them to the player. */
import { View } from './render/view.js';
import { World, DT, PULSE_CD } from './logic/world.js';
import { generate, T } from './logic/gen.js';
import { LEVELS, CHAPTERS, CH_START } from './logic/levels.js';
import { STORY, EPILOGUE } from './logic/story.js';
import { migrateSave } from './logic/migrate.js';
import { SEQ, MECH } from './ui/tips.js';
import { Sound } from './audio.js';
import * as AI from './logic/ai.js';
import { GLBMonster } from './render/monster_glb.js';
import { CrawlerGLB } from './render/crawler_glb.js';
import { drawFacilityMap, mapDir } from './ui/mapview.js';
import { TORCHES, TORCH_IDS, torchById, torchUnlocked, drawTorchIcon } from './render/torches.js';
import { stuckHint } from './ui/stuck.js';
import { HEAL, HP_MAX } from './logic/extras.js';
import { runBot } from './test/bot.js';

const $ = (id) => document.getElementById(id), qa = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
document.addEventListener('contextmenu', (e) => e.preventDefault());   // no long-press menus on the game
/* __TEST__ is a build-time flag: the release build contains no test hooks and ignores ?test=1 / ?unlock=1 */
const TEST = __TEST__ && /[?&]test=1\b/.test(location.search), UNLOCK = TEST && /[?&]unlock=1\b/.test(location.search);
const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window; const isMobile = coarse || /Android|iPhone|iPad/i.test(navigator.userAgent);
$('app').classList.toggle('touch', coarse);

/* ---------------- save ---------------- */
const KEY = 'hush.fp.v1';
const save = { v: 1, stars: [], best: [], logs: {}, tips: {}, set: { gfx: 'high', torch: 'standard', bright: 100, vibe: true, hints: true, vol: 80, mvol: 60, sound: true, music: true, aq: 'auto', sens: 100, inv: false, diff: 'normal', marks: true }, last: 0 };
try { const s = migrateSave(JSON.parse(localStorage.getItem(KEY) || 'null'), LEVELS); if (s && s.v === 1) { Object.assign(save, s); save.logs = (s.logs && typeof s.logs === 'object') ? s.logs : {}; save.tips = (s.tips && typeof s.tips === 'object' && !Array.isArray(s.tips)) ? s.tips : {}; save.stars = Array.isArray(s.stars) ? s.stars : []; save.best = Array.isArray(s.best) ? s.best : []; save.last = Math.max(0, Math.min(LEVELS.length - 1, +s.last || 0)); save.set = Object.assign({ gfx: 'auto', bright: 100, vibe: true, hints: true, vol: 80, mvol: 60, sound: true, music: true, aq: 'auto', sens: 100, inv: false, diff: 'normal', marks: true }, s.set || {}); } } catch (e) { /* private mode or a corrupted save: start fresh */ }
{ const S = save.set, num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d), one = (v, list, d) => (list.includes(v) ? v : d);
  save.set = { gfx: 'high', torch: one(S.torch, TORCH_IDS, 'standard'), aq: one(S.aq, ['auto', 'full', 'light'], 'auto'), diff: one(S.diff, ['easy', 'normal', 'hard'], 'normal'), bright: num(S.bright, 70, 160, 100), vol: num(S.vol, 0, 100, 80), mvol: num(S.mvol, 0, 100, 60), sens: num(S.sens, 30, 200, 100),
    vibe: S.vibe !== false, hints: S.hints !== false, sound: S.sound !== false, music: S.music !== false, inv: S.inv === true, marks: S.marks !== false }; }
save.lv = LEVELS.length; save.stars = save.stars.map(v => (v >= 0 && v <= 3 ? v | 0 : 0));
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
const unlocked = (i) => UNLOCK || i === 0 || (save.stars[i - 1] || 0) > 0;
const chapterStars = (c) => { let s = 0; for (let i = CH_START[c]; i < CH_START[c + 1]; i++) s += save.stars[i] || 0; return s; };
const chapterLogs = (c) => { let s = 0; for (let i = CH_START[c]; i < CH_START[c + 1]; i++) s += (save.logs && save.logs[i]) ? 1 : 0; return s; };

/* ---------------- state ---------------- */
const G = { view: null, world: null, level: 0, mode: 'boot', paused: false, modal: false, acc: 0, last: 0, now: 0, t0: 0, timeSpent: 0, hintT: 0, shownHint: -1, bannerT: 0, hbT: 0, lastInv: '', noiseT: 0, ended: 0, chapterView: 0, menuWorld: null, genCache: {}, over: false };
const inp = { keys: {}, fwd: 0, str: 0, dyaw: 0, dpitch: 0, pyaw: 0, ppitch: 0, sprintBtn: false, edge: {} };

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
    const lock = !unlocked(CH_START[ci]), el = document.createElement('button'); el.className = 'chap' + (G.chapterView === ci ? ' on' : '') + (lock ? ' lock' : '');
    el.style.backgroundImage = ['radial-gradient(ellipse at 50% 38%, #4a3a22 0%, #1a130b 55%, #050403 100%)', 'radial-gradient(ellipse at 50% 38%, #1d4a66 0%, #0a1a26 55%, #03070a 100%)', 'radial-gradient(ellipse at 50% 38%, #8a1a22 0%, #2a0709 55%, #060102 100%)'][ci];
    el.innerHTML = '<i class="art"></i>' + (lock ? '<svg class="lk"><use href="#i-lock"/></svg>' : '') + '<small>Chapter ' + (ci + 1) + ' &middot; levels ' + (CH_START[ci] + 1) + '-' + CH_START[ci + 1] + '</small><b>' + c.name + '</b><p class="syn">' + CH_SYN[ci] + '</p><em><svg><use href="#i-star"/></svg>' + chapterStars(ci) + ' / ' + (CH_START[ci + 1] - CH_START[ci]) * 3 + ' &nbsp;&middot;&nbsp; logs ' + chapterLogs(ci) + ' / ' + (CH_START[ci + 1] - CH_START[ci]) + '</em>';
    el.onclick = () => { if (lock) return Sound.play('denied'); Sound.play('ui'); G.chapterView = ci; buildLevels(); show('levels'); }; list.appendChild(el);
  });
}
/* campaign map: all 50 levels on one winding facility route (connectors, chapter bands, node shapes by what the level asks of you), then a non-playable COMING SOON node */
const MH = 300, NW = 104, CG = 176;
const nodePos = (i) => ({ x: 96 + i * NW + LEVELS[i].ch * CG, y: MH * 0.56 + Math.sin(i * 0.66 + LEVELS[i].ch * 1.3) * MH * 0.2 });
const nodeShape = (l, i, r) => {
  const hexp = (k) => Array.from({ length: k }, (_, j) => { const a = -Math.PI / 2 + j * 2 * Math.PI / k; return (r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1); }).join(' ');
  if (i === LEVELS.length - 1) return '<polygon points="' + Array.from({ length: 10 }, (_, j) => { const a = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? r * 0.55 : r * 1.2; return (rr * Math.cos(a)).toFixed(1) + ',' + (rr * Math.sin(a)).toFixed(1); }).join(' ') + '"/>';
  if (l.hunted || l.setpiece === 'chase') return '<polygon points="' + hexp(3) + '"/>';
  if (l.gates.includes('secret')) return '<rect x="' + (-r * 0.85) + '" y="' + (-r * 0.85) + '" width="' + r * 1.7 + '" height="' + r * 1.7 + '" rx="5"/>';
  if (l.gates.some(g => g === 'power' || g === 'breaker' || g === 'valve')) return '<polygon points="' + hexp(6) + '"/>';
  if (l.gates.length) return '<polygon points="' + hexp(4) + '" transform="scale(1.08)"/>';
  return '<circle r="' + r + '"/>';
};
const CH_SYN = ['Dusty offices, reception, security rooms and the sealed east wing. The evacuation was staged.', 'Cold teal light, red emergency lamps, flooded labs, tanks and pumps. The flooding was deliberate.', 'Rust, black growth and red light: tunnels, shafts, cells and the heart of the colony.'];
function buildLevels() {
  const tabs = $('level-tabs'), svg = $('route-svg'), route = $('route'); tabs.innerHTML = '';
  const last = nodePos(LEVELS.length - 1), W = Math.round(last.x + 330), curL = (save.last | 0), sel = G.selLevel !== undefined && unlocked(G.selLevel) ? G.selLevel : (unlocked(curL) ? curL : 0);
  CHAPTERS.forEach((c, ci) => { const b = document.createElement('button'), lock = !unlocked(CH_START[ci]); b.className = 'tab' + (ci === G.chapterView ? ' on' : '') + (lock ? ' lock' : ''); b.innerHTML = (lock ? '<svg><use href="#i-lock"/></svg>' : '') + 'Chapter ' + (ci + 1); b.onclick = () => { if (lock) return; G.chapterView = ci; Sound.play('ui'); qa('.tab', tabs).forEach((t, k) => t.classList.toggle('on', k === ci)); route.scrollTo({ left: Math.max(0, nodePos(CH_START[ci]).x - 180), behavior: 'smooth' }); }; tabs.appendChild(b); });
  const BAND = ['#6a5636', '#2a6a82', '#82242c'], COL = ['#d9b36a', '#5ec8e6', '#ff5c66'];
  let h = '<defs>' + BAND.map((c, k) => '<linearGradient id="bg' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".30"/><stop offset="1" stop-color="' + c + '" stop-opacity=".04"/></linearGradient>').join('') + '<pattern id="rgrid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#7aa6c0" stroke-opacity=".07"/></pattern></defs><rect width="' + W + '" height="' + MH + '" fill="url(#rgrid)"/>';
  CHAPTERS.forEach((c, ci) => { const x0 = nodePos(CH_START[ci]).x - 70, x1 = nodePos(CH_START[ci + 1] - 1).x + 70; h += '<rect x="' + x0 + '" y="6" width="' + (x1 - x0) + '" height="' + (MH - 12) + '" rx="8" fill="url(#bg' + ci + ')" stroke="' + COL[ci] + '" stroke-opacity=".35"/><text x="' + (x0 + 14) + '" y="26" class="rt" fill="' + COL[ci] + '">CHAPTER ' + (ci + 1) + '  //  ' + c.name.toUpperCase() + '</text><text x="' + (x0 + 14) + '" y="42" class="rs">LEVELS ' + (CH_START[ci] + 1) + '-' + CH_START[ci + 1] + '</text>'; });
  for (let i = 0; i < LEVELS.length; i++) { const a = nodePos(i), nx = i + 1 < LEVELS.length ? nodePos(i + 1) : { x: last.x + 190, y: MH * 0.5 }, st = save.stars[i] || 0, cls = i + 1 >= LEVELS.length ? 'soon' : st ? 'done' : unlocked(i + 1) ? 'open' : 'lock', mx = (a.x + nx.x) / 2; h += '<path class="seg ' + cls + '" d="M' + a.x + ' ' + a.y + ' C' + mx + ' ' + a.y + ' ' + mx + ' ' + nx.y + ' ' + nx.x + ' ' + nx.y + '"/>'; }
  for (let i = 0; i < LEVELS.length; i++) {
    const l = LEVELS[i], p = nodePos(i), lock = !unlocked(i), st = save.stars[i] || 0, r = i === LEVELS.length - 1 ? 22 : 20, cur = i === curL && !lock, up = i % 2 === 0;
    h += '<g class="nd ' + (lock ? 'lock' : st ? 'done' : 'open') + (cur ? ' cur' : '') + (i === sel ? ' sel' : '') + '" data-i="' + i + '" transform="translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')"><circle class="hit" r="30"/><g class="sh">' + nodeShape(l, i, r) + '</g><text class="num" y="5">' + (i + 1) + '</text>';
    if (lock) h += '<text class="lk" y="' + (up ? -30 : 40) + '">&#128274;</text>'; else h += '<text class="nm" y="' + (up ? -28 : 42) + '">' + l.name + '</text>' + (st ? '<text class="stz" y="' + (up ? 34 : -22) + '">' + '&#9733;'.repeat(st) + '<tspan class="e">' + '&#9733;'.repeat(3 - st) + '</tspan></text>' : '');
    h += '</g>';
  }
  const sx = last.x + 190, sy = MH * 0.5;
  h += '<g class="nd soonnode" data-soon="1" transform="translate(' + sx + ',' + sy + ')"><circle class="hit" r="44"/><polygon class="sh" points="' + Array.from({ length: 6 }, (_, j) => (34 * Math.cos(-Math.PI / 2 + j * Math.PI / 3)).toFixed(1) + ',' + (34 * Math.sin(-Math.PI / 2 + j * Math.PI / 3)).toFixed(1)).join(' ') + '"/><text class="soont" y="-3">COMING</text><text class="soont" y="12">SOON</text></g>';
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + MH); svg.setAttribute('width', W); svg.setAttribute('height', MH); svg.innerHTML = h;
  const info = (i) => {
    G.selLevel = i; qa('.nd', svg).forEach(n => n.classList.toggle('sel', +n.getAttribute('data-i') === i)); const l = LEVELS[i], g = gen(i), st = save.stars[i] || 0, el = $('lv-info'); el.innerHTML = '';
    el.appendChild(thumb(g, false)); const t = document.createElement('div'); t.className = 'lvt'; t.innerHTML = '<small>CHAPTER ' + (l.ch + 1) + ' &middot; LEVEL ' + (i + 1) + '</small><b>' + l.name + '</b><span class="rt2">' + l.route.join(' &rsaquo; ') + '</span><span class="ob">' + l.hint + '</span>'; el.appendChild(t);
    const r = document.createElement('div'); r.className = 'lvr'; r.innerHTML = '<span class="stz2">' + [0, 1, 2].map(k => '<svg class="' + (k < st ? 'f' : '') + '"><use href="#i-star"/></svg>').join('') + '</span>' + (save.best[i] ? '<small>BEST ' + Math.floor(save.best[i] / 60) + ':' + String(save.best[i] % 60).padStart(2, '0') + '</small>' : '') + '<button class="btn red" id="lv-play"><svg><use href="#i-play"/></svg>Play</button>'; el.appendChild(r); $('lv-play').onclick = () => { Sound.play('ui'); startLevel(i); };
  };
  qa('.nd', svg).forEach(n => { n.addEventListener('click', () => { if (n.getAttribute('data-soon')) { const el = $('lv-info'); el.innerHTML = '<div class="lvt"><small>AFTER LEVEL ' + LEVELS.length + '</small><b>COMING SOON</b><span class="ob">More of Halden Station is coming. Your progress is saved.</span></div>'; Sound.play('ui'); return; } const i = +n.getAttribute('data-i'); if (!unlocked(i)) { Sound.play('denied'); return; } Sound.play('ui'); if (G.selLevel === i && n.classList.contains('sel') && G.tapOnce === i) { startLevel(i); return; } G.tapOnce = i; info(i); }); });
  info(sel); setTimeout(() => route.scrollTo({ left: Math.max(0, nodePos(sel).x - route.clientWidth / 2), behavior: 'auto' }), 30);
}

/* ---------------- level flow ---------------- */
function setLoading(on, text, pct) { overlay('load', on); if (text) $('load-text').textContent = text; if (pct !== undefined) $('load-bar').style.width = pct + '%'; }
const later = (fn, ms) => { const run = G.run; setTimeout(() => { if (G.mode === 'game' && G.run === run && !G.paused && !G.over) fn(); }, ms); };   // delayed sounds die with the level / pause / game over
function nextFrame() { return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); }
let starting = false;
async function startLevel(i) { if (starting) return; starting = true; try { await startLevelNow(i); } finally { starting = false; } }   // a double tap on Retry / Next must not start two loads
async function startLevelNow(i) {
  setLoading(true, 'Entering ' + LEVELS[i].name, 20); ['pause', 'win', 'dead', 'note', 'log', 'keypad', 'settings', 'how', 'credits', 'inv', 'obj', 'map', 'tip'].forEach(o => overlay(o, false)); await nextFrame();
  G.run = (G.run || 0) + 1; G.level = i; save.last = i; persist(); G.chapterView = LEVELS[i].ch; const w = new World(gen(i), { assist: (G.deaths && G.deaths[i]) || 0 }); G.world = w; setLoading(true, null, 55); await nextFrame(); G.view.loadLevel(w); applyTorch(true); setLoading(true, null, 95); await nextFrame();
  G.mode = 'game'; show('game'); G.paused = false; G.modal = false; G.over = false; G.ended = 0; G.timeSpent = 0; G.acc = 0; G.hintT = 8; G.shownHint = -1; G.lastInv = ''; G.menu = false; inp.edge = {}; inp.dyaw = 0; inp.dpitch = 0; inp.pyaw = 0; inp.ppitch = 0; inp.sprintBtn = false; $('b-sprint').classList.remove('on');
  G.prog = null; G.heartEcho = false; G.tut = { dist: 0, yaw: 0, flash: 0, doors: 0, pulses: 0, firstPulse: 0, crouched: false, crouchNear: 0, hid: 0, picked: {}, bag: 0, map: 0, last: null, skip: false }; G.seq = tipsOn() && SEQ[i] && !save.tips['seq' + i] ? SEQ[i] : null; G.seqI = 0; G.seqOkT = 0; G.coachOn = false; $('hint').classList.remove('coach', 'ok');
  $('hint').textContent = save.set.hints && !G.seq ? LEVELS[i].hint : ''; $('hint').classList.toggle('show', !!save.set.hints && !G.seq); G.chapterAudio = LEVELS[i].ch; applyAudio(); Sound.unlock(); buildHotbar(true);
  setLoading(false, null, 100); G.last = performance.now(); $('fx-hurt').style.opacity = 0; if (!coarse) lockPointer();
}
function lockPointer() { const c = $('view'); if (c.requestPointerLock && !document.pointerLockElement) { try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ } } }
function pause(on) { if (G.mode !== 'game' || G.over) return; G.paused = on; overlay('pause', on); if (on && document.pointerLockElement) document.exitPointerLock(); if (!on && !coarse) lockPointer(); if (on) Sound.suspend && Sound.suspend(); else Sound.resume && Sound.resume(); }
function winLevel() {
  const w = G.world; G.over = true; const t = G.timeSpent, par = w.gen.par; let stars = 1; if (w.huntCount <= 1) stars++; if (w.huntCount === 0 && t <= par * 1.25) stars++;
  if (G.deaths) G.deaths[G.level] = 0; const prev = save.stars[G.level] || 0; if (stars > prev) save.stars[G.level] = stars; if (!save.best[G.level] || t < save.best[G.level]) save.best[G.level] = Math.round(t); persist();
  Sound.play('win'); $('win-stars').innerHTML = [0, 1, 2].map(k => '<svg class="' + (k < stars ? 'f' : '') + '"><use href="#i-star"/></svg>').join(''); $('win-info').textContent = 'Time ' + fmt(t) + ' · par ' + fmt(par) + ' · ' + (w.huntCount ? 'hunted ' + w.huntCount + '×' : 'never seen');
  $('w-next').style.display = G.level + 1 < LEVELS.length ? '' : 'none'; setTimeout(() => { overlay('win', true); if (document.pointerLockElement) document.exitPointerLock(); }, 900); G.winStars = stars; if (G.level === LEVELS.length - 1) { $('win-info').textContent = EPILOGUE; $('win-title').textContent = 'The end'; } else $('win-title').textContent = 'Escaped';
}
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function loseLevel() { G.deaths = G.deaths || {}; G.deaths[G.level] = (G.deaths[G.level] || 0) + 1; G.over = true; vibe([80, 60, 160]); setTimeout(() => { overlay('dead', true); if (document.pointerLockElement) document.exitPointerLock(); }, 1700); }
function toMenu() { ['pause', 'win', 'dead', 'note', 'log', 'keypad', 'inv', 'obj', 'map', 'tip'].forEach(o => overlay(o, false)); G.mode = 'home'; G.world = null; startMenuScene(); show('home'); Sound.scene({ menu: true }); }

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
  hotSlots.forEach((k, n) => { const cnt = k === 'flash' ? 1 : inv[k], el = document.createElement('button'); el.className = 'slot' + (k === 'flash' ? (w.player.flash ? ' sel' : ' off') : cnt ? '' : ' empty'); if (k === 'flash') { const T = torchById(save.set.torch); el.title = T.name; if (w.player.flash) el.style.boxShadow = '0 0 9px ' + T.pal[2], el.style.borderColor = T.pal[2]; } el.innerHTML = '<svg><use href="#' + ICON[k] + '"/></svg>' + (k !== 'flash' && cnt > 1 ? '<i>' + cnt + '</i>' : ''); el.onpointerdown = (e) => { e.stopPropagation(); e.preventDefault(); if (k === 'flash') inp.edge.flash = true; else if (k === 'radio') inp.edge.radio = true; }; bar.appendChild(el); });
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
  drawMarks(w); coachTick(w, dt); stuckTick(w, dt); presenceTick(w, dt);
  if (G.hudT < 0.066) return; const dtH = G.hudT; G.hudT = 0;
  setT('obj-text', w.objective().current); setT('pulse-n', p.pulses); setC('b-pulse', 'dim', p.pulses <= 0); const cdf = Math.round(w.pulseCd / PULSE_CD * 40) / 40; if (HC.cdf !== cdf) { HC.cdf = cdf; $('b-pulse').style.setProperty('--cd', cdf); } setC('b-pulse', 'cd', cdf > 0); setT('pulse-l', w.pulseCd > 0 ? w.pulseCd.toFixed(1) + 's' : 'Pulse'); buildHotbar(false);
  const pr = w.prompt, show = !!(pr && !G.modal); setC('prompt', 'show', show); if (show) { setC('prompt', 'no', /^Locked|needs/.test(pr.text)); setT('prompt-text', pr.text); }
  const st = $('stam'); setC('stam', 'show', p.stamina < 0.98); setC('stam', 'tired', p.tired); const sw = Math.round(p.stamina * 50) * 2 + '%'; if (HC.stw !== sw) { HC.stw = sw; st.firstChild.style.width = sw; } setC('b-crouch', 'on', p.crouch);
  if (G.hpShowT > 0) G.hpShowT -= dtH; const hpv = Math.ceil(p.hp); setT('hp-n', hpv); setC('hp', 'show', hpv < HP_MAX || G.hpShowT > 0); setC('hp', 'low', hpv <= 35); const hw = hpv + '%'; if (HC.hpw !== hw) { HC.hpw = hw; $('hp').lastChild.style.width = hw; }
  w.kpShow = $('ov-keypad').classList.contains('show') ? { id: kpDoor, text: (kpCode + '----').slice(0, 4), st: '' } : null;
  drawNoise(w, dtH); setO('fx-locker', p.hidden >= 0 ? 1 : 0); const th = w.threat; setO('fx-hurt', (w.over === 'dead') ? 0.9 : Math.max(0, th - 0.55) * 0.9);
}


/* ---------------- sonar markers + threat direction ---------------- */
const MARKC = { item: '#ffd070', exit: '#3dff8a', door: '#ff8a5a', generator: '#ffcc22', valve: '#ff5533', breaker: '#ff9a2a', note: '#fff0b0', log: '#46ff9a', locker: '#9ad', vent: '#9ad' };
let marksOn = false;
function drawMarks(w) {
  const cv = $('marks'), v = G.view, p = w.player; if (!cv || !v) return; const r = cv.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height); if (!W) return;
  const threats = w.creatures.filter(c => ((c.state === 'hunt' || c.state === 'investigate' || c.state === 'suspicious') && Math.hypot(c.x - p.x, c.y - p.y) < 16 || (c.state === 'roam' || c.state === 'search') && Math.hypot(c.x - p.x, c.y - p.y) < 8.5) && p.alive);
  const pinged = save.set.marks && (w.pulseState || w.objs.some(o => o.pingT > 0)), reveal = w.creatures.some(c => c.revealT > 0);
  if (!pinged && !reveal && !threats.length) { if (marksOn) { cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); marksOn = false; } return; }
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; } const x = cv.getContext('2d'); x.clearRect(0, 0, W, H); marksOn = true; v.camera.updateMatrixWorld(true);
  const T = v.camera.position.clone(), pr = (px, py, h) => { T.set(px * 2, h, py * 2).project(v.camera); return [(T.x * 0.5 + 0.5) * W, (-T.y * 0.5 + 0.5) * H, T.z < 1 && Math.abs(T.x) < 1.3]; };
  const edge = (sx, sy, behind, col, a) => { const cx = W / 2, cy = H / 2; let dx = sx - cx, dy = sy - cy; if (behind) { dx = -dx; dy = -dy; } const k = Math.min((W / 2 - 30) / Math.abs(dx || 1e-3), (H / 2 - 40) / Math.abs(dy || 1e-3)), ex = cx + dx * k, ey = cy + dy * k, ang = Math.atan2(dy, dx); x.save(); x.translate(ex, ey); x.rotate(ang); x.globalAlpha = a; x.fillStyle = col; x.beginPath(); x.moveTo(14, 0); x.lineTo(-8, 10); x.lineTo(-4, 0); x.lineTo(-8, -10); x.fill(); x.restore(); };
  const pulseK = 0.6 + 0.4 * Math.sin(performance.now() / 120);
  if (pinged) for (const o of w.objs) { if (!(o.pingT > 0) || !MARKC[o.type] || (o.type === 'item' && o.taken) || (o.type === 'door' && o.hidden && !o.revealed) || o.type === 'locker' || o.type === 'vent') continue; const [sx, sy, vis] = pr(o.x + 0.5, o.y + 0.5, REACH_H[o.type] || 1); if (!vis) continue; const a = Math.min(1, o.pingT / 1.5), c = MARKC[o.type];
    x.save(); x.globalAlpha = a; x.translate(sx, sy); x.rotate(Math.PI / 4); x.strokeStyle = c; x.lineWidth = 2; x.strokeRect(-7, -7, 14, 14); x.fillStyle = c; x.globalAlpha = a * 0.35; x.fillRect(-7, -7, 14, 14); x.restore(); }
  for (const c of w.creatures) { if (!(c.revealT > 0)) continue; const [sx, sy, vis] = pr(c.x, c.y, 1.4); if (vis) { x.save(); x.globalAlpha = Math.min(1, c.revealT); x.strokeStyle = '#ff3b47'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(sx, sy - 34); x.lineTo(sx + 14, sy - 12); x.lineTo(sx - 14, sy - 12); x.closePath(); x.stroke(); x.restore(); } }
  for (const c of threats) { const [sx, sy, vis] = pr(c.x, c.y, 1.4); if (vis && sx > 20 && sx < W - 20) continue; edge(sx, sy, !vis, c.state === 'hunt' ? '#ff3b47' : '#f0b34a', c.state === 'hunt' ? pulseK : c.state === 'roam' || c.state === 'search' ? 0.38 : 0.55); }
}

/* ---------------- inventory + objectives panels (the game holds still while they are open) ---------------- */
const INVINFO = { flash: ['Flashlight', 'A narrow beam. Switch it off to be harder to see. (F)'], card: ['Keycard', 'Opens doors with a blue card reader. Walk up and tap the door.'], key: ['Brass key', 'Opens doors with a gold lock.'], fuse: ['Fuse', 'Slot fuses into the generator to bring the power back.'], radio: ['Radio', 'Plays noise a little ahead of you. The creature goes there. One use each. (R)'], pulse: ['Sonar pulse', 'Reveals walls, doors, items and creatures for a few seconds. It also makes noise (radius 14) and needs ' + PULSE_CD + ' s to recharge.'] };
let invSel = 'flash';
function panel(id, on) {
  const open = $('ov-' + id).classList.contains('show');
  if (on) { if (G.mode !== 'game' || G.over || G.modal || anyOverlay() || !G.world) return; G.paused = true; if (document.pointerLockElement) document.exitPointerLock(); id === 'inv' ? (drawInv(), drawTorches()) : id === 'obj' ? drawObj() : drawMap(); if (id === 'inv') G.tut.bag++; if (id === 'map') { G.tut.map++; G.mapTimer = setInterval(() => { if (G.world) drawMap(); }, 180); } overlay(id, true); Sound.play('ui'); }
  else if (open) { overlay(id, false); if (id === 'map') { clearInterval(G.mapTimer); G.mapTimer = 0; } G.paused = false; if (!coarse) lockPointer(); }
}
/* torch selection: the model in the hand, the beam and how easily creatures notice the light follow the choice; a torch that is not unlocked yet cannot be selected */
function applyTorch(instant) {
  if (!torchUnlocked(torchById(save.set.torch), save.stars)) save.set.torch = 'standard'; const T = torchById(save.set.torch);
  if (G.view) G.view.setTorch(T.id, instant); if (G.world) G.world.player.torchSight = T.sight;
}
function drawTorches() {
  const row = $('inv-torch'); if (!row) return; row.innerHTML = '';
  const bars = (v) => '<span class="pips">' + [1, 2, 3, 4, 5].map(k => '<i class="' + (k <= v ? 'on' : '') + '"></i>').join('') + '</span>';
  TORCHES.forEach(t => {
    const un = torchUnlocked(t, save.stars), b = document.createElement('button'); b.className = 'tc' + (t.id === save.set.torch ? ' sel' : '') + (un ? '' : ' lock');
    b.innerHTML = '<canvas width="96" height="56"></canvas><b>' + t.name + '</b><em>Range ' + bars(t.bars[0]) + '</em><em>Spread ' + bars(t.bars[1]) + '</em><em>Stealth ' + bars(t.bars[2]) + '</em><small>' + (un ? (t.id === save.set.torch ? 'EQUIPPED' : 'TAP TO EQUIP') : 'LOCKED: ' + t.unlock.text) + '</small>'; drawTorchIcon(b.firstChild, t.id);
    b.onclick = () => { $('inv-desc').textContent = t.name + ' - ' + t.desc; if (!un) { Sound.play('denied'); return; } if (t.id !== save.set.torch) { save.set.torch = t.id; persist(); applyTorch(false); Sound.play('ui'); buildHotbar(true); } drawTorches(); };
    row.appendChild(b);
  });
}
function drawInv() {
  const w = G.world, inv = w.player.inv, cnt = { flash: w.player.flash ? 1 : 0, card: inv.card, key: inv.key, fuse: inv.fuse, radio: inv.radio, pulse: w.player.pulses }, g = $('inv-grid'); g.innerHTML = '';
  ['flash', 'pulse', 'card', 'key', 'fuse', 'radio'].forEach(k => { const b = document.createElement('button'); b.className = 'iv' + (k === invSel ? ' sel' : '') + (k !== 'flash' && !cnt[k] ? ' empty' : ''); b.innerHTML = '<svg><use href="#' + (k === 'pulse' ? 'i-pulse' : ICON[k]) + '"/></svg><span>' + INVINFO[k][0] + '</span>' + (k === 'flash' ? '<i>' + (cnt.flash ? 'ON' : 'OFF') + '</i>' : '<i>' + cnt[k] + '</i>'); b.onclick = () => { invSel = k; Sound.play('ui'); drawInv(); }; g.appendChild(b); });
  $('inv-desc').textContent = INVINFO[invSel][0] + ' - ' + INVINFO[invSel][1]; const u = $('inv-use'); u.hidden = !(invSel === 'flash' || (invSel === 'radio' && inv.radio > 0)); u.textContent = invSel === 'flash' ? (w.player.flash ? 'Switch off' : 'Switch on') : 'Use radio';
}
function drawObj() { const o = G.world.objective(), l = $('obj-list'); l.innerHTML = ''; let cur = true; o.steps.forEach(st => { const li = document.createElement('li'); li.className = st.done ? 'done' : cur ? 'cur' : ''; if (!st.done) cur = false; li.innerHTML = '<svg><use href="#' + (st.done ? 'i-check' : 'i-bulb') + '"/></svg><span></span>'; li.lastChild.textContent = st.text; l.appendChild(li); }); const lg = G.world.objs.find(o => o.type === 'log'); if (lg) { const li = document.createElement('li'); li.className = lg.done ? 'done' : ''; li.innerHTML = '<svg><use href="#' + (lg.done ? 'i-check' : 'i-book') + '"/></svg><span></span>'; li.lastChild.textContent = 'Optional: find the recovered log' + (lg.done ? ' (read)' : ''); l.appendChild(li); } $('obj-hint').textContent = 'Hint: ' + LEVELS[G.level].hint; }
for (const [id, pn] of [['b-bag', 'inv'], ['obj', 'obj'], ['b-map', 'map']]) $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); panel(pn, true); });
$('obj-help').onclick = () => { panel('obj', false); askHint(); };
$('inv-use').onclick = () => { const k = invSel; panel('inv', false); if (k === 'flash') inp.edge.flash = true; else inp.edge.radio = true; };
qa('[data-pclose]').forEach(b => { b.onclick = () => { Sound.play('ui'); panel(b.getAttribute('data-pclose'), false); }; });
document.addEventListener('keydown', (e) => { if (e.code === 'Escape') { const shownOv = (id) => $('ov-' + id).classList.contains('show'); if (['log', 'note', 'keypad', 'inv', 'obj', 'map', 'tip'].some(shownOv)) e.stopPropagation();   /* Escape closes the top panel only, it must not also open the pause menu */
    if (shownOv('log')) { e.stopPropagation(); $('log-ok').click(); return; } if (shownOv('note')) { e.stopPropagation(); $('note-ok').click(); return; } if (shownOv('keypad')) { e.stopPropagation(); $('kp-cancel').click(); return; } if ($('ov-inv').classList.contains('show')) panel('inv', false); else if ($('ov-obj').classList.contains('show')) panel('obj', false); else if ($('ov-map').classList.contains('show')) panel('map', false); else if ($('ov-tip').classList.contains('show')) $('tip-ok').click(); } else if (G.mode === 'game' && (e.code === 'KeyI' || e.code === 'Tab')) { e.preventDefault(); $('ov-inv').classList.contains('show') ? panel('inv', false) : panel('inv', true); } else if (G.mode === 'game' && e.code === 'KeyM') { $('ov-map').classList.contains('show') ? panel('map', false) : panel('map', true); } else if (G.mode === 'game' && e.code === 'KeyO') { $('ov-obj').classList.contains('show') ? panel('obj', false) : panel('obj', true); } }, true);


const tipsOn = () => !!save.set.hints && !(__TEST__ && TEST && !/[?&]tips=1\b/.test(location.search));   // the automated tests switch the teaching cards off (they would freeze the game); ?tips=1 turns them on
/* ---------------- map ---------------- */
function drawMap() {
  const w = G.world, cv = $('map-cv'); if (!w || !cv) return; const res = drawFacilityMap(w, cv, performance.now() / 1000), p = w.player, g = $('map-goal');
  if (g) { const t = res.target; g.innerHTML = t ? '<b>NEXT</b> ' + t.label + (res.route ? ' <span>&middot; about ' + res.route.pts.length + ' steps ' + mapDir(p, t) + '</span>' : '') : ''; }
  const sub = $('map-sub'); if (sub) { const sp = LEVELS[G.level]; setT('map-sub', sp ? sp.name + '  //  ' + CHAPTERS[sp.ch].name : ''); }
}

/* ---------------- tutorial coach (first levels) + one-time "new mechanic" cards ---------------- */
function track(e) {
  const T = G.tut; if (!T) return;
  if (e.type === 'flash') T.flash++; else if (e.type === 'door' && e.by !== 'creature') T.doors++; else if (e.type === 'pulse') { T.pulses++; if (!T.firstPulse) T.firstPulse = performance.now() / 1000; } else if (e.type === 'hide' && !e.out) T.hid++; else if (e.type === 'pickup') T.picked[e.kind] = 1;
}
/* fear beats: what the player sees and hears (the timing lives in logic/beats.js) */
function playBeat(e, w, p) {
  const sp = (x, y) => spatial(x, y), V = G.view;
  switch (e.what) {
    case 'phone': Sound.play('phone'); break;
    case 'crack': Sound.play('glass'); Sound.play('crack2'); V.shake = Math.max(V.shake || 0, 0.25); V.flicker(0.8); break;
    case 'scrape': Sound.play('scrape', { pan: Math.random() * 2 - 1 }); break;
    case 'silence': Sound.silence(e.dur || 4); break;
    case 'voice': Sound.play('voice', { static: e.static }); banner(e.text, 'sus', 3200); break;
    case 'clicks': Sound.play('clicks', { pan: Math.random() * 2 - 1 }); break;
    case 'radio2': { const s = sp(e.x, e.y); Sound.play('radioPulse', { v: Math.max(0.4, s.v), pan: s.pan }); break; }
    case 'knock': { const s = sp(e.x, e.y); if (s.d < 14) Sound.play('knock', { pan: s.pan }); break; }
    case 'redwave': V.redWave(); Sound.play('surge'); break;
    case 'motor': Sound.play('motor'); V.shake = Math.max(V.shake || 0, 0.4); break;
    case 'lift': Sound.play('lift'); banner('THE LIFT HAS STOPPED AT AN UNLISTED LEVEL', 'sus', 3000); break;
    case 'lightsPulse': V.rhythm = true; break;
    case 'tap3': { const s = sp(e.x, e.y); for (let i = 0; i < 3; i++) later(() => Sound.play('knock', { pan: s.pan }), 450 + i * 520); break; }
    case 'count': banner('CORE OVERHEAT 0:0' + e.n, 'seen', 1100); Sound.play('beep'); break;
    case 'impact2': Sound.play('impact', { v: 1, pan: 0 }); V.shake = Math.max(V.shake || 0, 0.6); break;
    case 'circle': for (let i = 0; i < 10; i++) later(() => Sound.play('cstep', { v: 0.7, pan: i % 2 ? -0.9 : 0.9, kind: 'stalker' }), 300 + i * 420); break;
    case 'ceilEyes': V.flashEyes(e.x * 2, e.y * 2, 1.6, 3.0); break;
    case 'eyesBehind': V.flashEyes((p.x - Math.cos(p.yaw) * 6) * 2, (p.y - Math.sin(p.yaw) * 6) * 2, 1.8, 1.7); break;
    case 'ghost': V.ghost(e.x, e.y); break;
    case 'huge': V.huge(); Sound.play('groan', { pan: 0, f: 0 }); break;
    case 'cctv': { const el = $('fx-cctv'); $('cctv-t').textContent = 'CAM 03'; $('cctv-s').textContent = e.mode === 'you' ? 'SUBJECT: UNKNOWN' : 'ROOM EMPTY'; el.classList.add('show'); Sound.play('beep'); setTimeout(() => el.classList.remove('show'), e.dur * 1000); break; }
    case 'stare': Sound.play('notice'); break;
    case 'eggcrack': Sound.play('crack2'); V.eggW = 1.4; break;
    case 'climb': Sound.play('scrape', { pan: 0.8 }); break;
    case 'heartEcho': G.heartEcho = true; break;
    case 'creak': { const s = sp(e.x, e.y); Sound.play('creak', { pan: s.pan, f: 0.5 }); break; }
    case 'torchPull': { const ex = w.gen.exit; V.pullPos = [ex.x + 0.5, ex.y + 0.5]; break; }
    case 'hum': Sound.play('hum', { pan: 0 }); break;
    case 'freeze': banner('THE SIGNAL CUTS OUT', 'heard', 2600); break;
    case 'faintPing': Sound.play('faintPing'); break;
    case 'fakeexit': banner('THIS IS NOT THE EXIT: THE SHAFT BEHIND IT IS EMPTY', 'sus', 3200); Sound.play('denied'); break;
  }
}
/* presence warning: a creature that has not noticed you is close (even behind a wall): say so once in a while, so a walking player is never surprised by what hears footsteps */
function presenceTick(w, dt) {
  const p = w.player; G.presT = (G.presT || 0) - dt; if (G.presT > 0 || !p.alive || p.hidden >= 0 || p.vent || G.paused || G.modal || G.over || !tipsOn()) return;
  let near = 1e9; for (const c of w.creatures) { if (c.dead || c.state === 'hunt') continue; near = Math.min(near, Math.hypot(c.x - p.x, c.y - p.y)); }
  if (near < 8.5 && p.moving && !p.crouch) { banner('SOMETHING IS CLOSE: CROUCH TO STAY QUIET', 'sus', 2400); Sound.play('notice'); G.presT = 16; }
}
/* stuck hints: no progress for a while -> a hint that gets plainer (50 s, 105 s, 165 s, then every 70 s) */
const STUCK_AT = [50, 105, 165];
function showHint(res) {
  const h = $('hint'); h.classList.remove('coach', 'ok'); h.innerHTML = '<b>HINT</b>' + res.text.replace(/</g, '&lt;'); h.classList.add('show'); G.hintT = 11; Sound.play('ui');
  if (res.ping && G.world) for (const t of res.targets) for (const o of G.world.objs) if (o.x === Math.floor(t.x) && o.y === Math.floor(t.y)) o.pingT = 5;
}
function stuckTick(w, dt) {
  const p = w.player; if (!p.alive || G.over || G.modal || G.paused || (G.seq && G.coachOn) || !tipsOn()) return;
  const S = G.prog = G.prog || { sig: '', t: 0, lvl: 0, tick: 0 }; S.tick -= dt;
  if (S.tick <= 0) {
    S.tick = 1; let n = 0; const sn = w.seen; if (sn) for (let i = 0; i < sn.length; i++) n += sn[i]; const inv = p.inv, sig = w.objective().current + '|' + (n >> 3) + '|' + inv.key + inv.card + inv.fuse + inv.radio + '|' + w.pickups.filter(o => o.taken).length + '|' + w.doors.filter(d => d.want).length + '|' + w.objs.filter(o => o.done).length;
    if (sig !== S.sig) { S.sig = sig; S.t = 0; S.lvl = 0; }
  }
  if (p.hidden >= 0 || p.vent || w.creatures.some(c => c.state === 'hunt')) return;          /* hiding or running for your life is not being stuck */
  S.t += dt; const next = S.lvl < STUCK_AT.length ? STUCK_AT[S.lvl] : STUCK_AT[2] + 70 * (S.lvl - STUCK_AT.length + 1);
  if (S.t >= next) { S.lvl++; showHint(stuckHint(w, Math.min(3, S.lvl))); }
}
function askHint() { const w = G.world; if (!w || !w.player.alive) return; const S = G.prog = G.prog || { sig: '', t: 0, lvl: 0, tick: 0 }; S.lvl = Math.min(3, Math.max(2, S.lvl + 1)); showHint(stuckHint(w, S.lvl)); }
function coachTick(w, dt) {
  const T = G.tut, p = w.player, now = performance.now() / 1000; if (!T || G.over) return;
  if (T.last) { T.dist += Math.hypot(p.x - T.last[0], p.y - T.last[1]); T.yaw += Math.abs(angDiffUI(p.yaw, T.last[2])); if (p.crouch) { T.crouched = true; if (w.creatures.some(c => Math.hypot(c.x - p.x, c.y - p.y) < 11)) T.crouchNear += dt; } } T.last = [p.x, p.y, p.yaw];
  const h = $('hint');
  if (G.seq && !G.modal && !G.paused) {
    const step = G.seq[G.seqI]; if (step) {
      if (!G.coachOn) { G.coachOn = true; h.classList.add('coach'); h.classList.remove('ok'); h.classList.add('show'); } G.hintT = 999;
      if (G.seqOkT > 0) { if (now > G.seqOkT) { G.seqOkT = 0; G.seqI++; G.coachOn = false; if (G.seqI >= G.seq.length - 1 && !G.seq[G.seqI]) G.seq = null; h.classList.remove('ok'); } }
      else {
        const n = G.seq.length; h.innerHTML = '<b>STEP ' + (G.seqI + 1) + ' / ' + n + ' &middot; ' + step.t + '</b>' + step.x + (step.id === 'exit' ? '' : '<small>tap this box to skip the step</small>');
        if (step.ok(T, w, now) || T.skip) { T.skip = false; if (step.id === 'exit') { /* last step stays until the level ends */ } else { h.classList.add('ok'); h.innerHTML = '<b>&#10003; ' + step.t + '</b>Well done.'; G.seqOkT = now + 1.1; Sound.play('ui'); if (G.seqI === n - 2) save.tips['seq' + G.level] = 1; if (G.seqI === n - 2) persist(); } }
      }
    }
  }
  /* one-time mechanic cards */
  if (tipsOn() && !G.modal && !G.paused && w.time > 1 && p.alive && p.hidden < 0 && !p.vent) { for (const m of MECH) { if (save.tips[m.id]) continue; let ok = false; try { ok = m.when(w); } catch (er) { ok = false; } if (ok) { showTip(m); break; } } }
}
const angDiffUI = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
function showTip(m) { save.tips[m.id] = 1; persist(); $('tip-title').textContent = m.t; $('tip-text').textContent = m.x; $('tip-use').setAttribute('href', '#' + (m.icon || 'i-hand')); G.modal = true; overlay('tip', true); Sound.play('ui'); if (document.pointerLockElement) document.exitPointerLock(); }
$('tip-ok').onclick = () => { overlay('tip', false); G.modal = false; Sound.play('ui'); if (!coarse) lockPointer(); };
$('hint').addEventListener('pointerdown', (e) => { if ($('hint').classList.contains('coach') && G.tut && G.seq && G.seq[G.seqI] && G.seq[G.seqI].id !== 'exit') { e.preventDefault(); e.stopPropagation(); G.tut.skip = true; } });

/* ---------------- events -> sound, banners, vibration ---------------- */
let hbTimer = 0;
function handleEvents(w, dt) {
  const p = w.player;
  for (const e of w.drainEvents()) {
    track(e);
    switch (e.type) {
      case 'step': if (e.kind === 'glass') Sound.play('glass', { crouch: e.crouch }); else if (e.kind === 'debris') Sound.play('debris', { crouch: e.crouch }); else Sound.play('step', { crouch: e.crouch, run: e.sprint, v: e.kind === 'water' ? 1.5 : 1 }); break;
      case 'pulse': Sound.play('ping'); Sound.duck(); $('fx-flash').style.transition = 'none'; $('fx-flash').style.opacity = 0.18; requestAnimationFrame(() => { $('fx-flash').style.transition = 'opacity .8s ease-out'; $('fx-flash').style.opacity = 0; }); vibe(30); break;
      case 'pickup': Sound.play('key'); G.view.reach(); buildHotbar(true); break;
      case 'door': { const s = spatial(e.x, e.y); if (s.d < 16) Sound.play('door'); if (e.by !== 'creature') G.view.reach(); break; }
      case 'unlock': Sound.play('unlock'); G.view.reach(); break;
      case 'pulsecd': banner('SONAR RECHARGING', 'sus', 700); break;
      case 'denied': Sound.play('denied'); banner(e.text, 'sus', 1100); break;
      case 'hide': Sound.play('hide'); break;
      case 'vent': Sound.play('vent'); break;
      case 'generator': Sound.play('gen'); G.view.reach(); break;
      case 'breaker': Sound.play('door'); later(() => Sound.play('thump', { pan: 0 }), 200); G.view.reach(); banner('BREAKER ' + e.n + ' / ' + e.total, e.n === e.total ? 'heard' : 'sus', 1500); break;
      case 'alarm': { Sound.play('heard'); const sp = spatial(e.x, e.y); Sound.play('roar', { v: 0.5, pan: 0, kind: 'stalker' }); banner('ALARM! GET OUT OF SIGHT: THEY ARE COMING', 'seen', 3200); vibe([60, 40, 120]); break; }
      case 'valve': Sound.play('door'); later(() => Sound.play('thump', { pan: 0 }), 300); G.view.reach(); break;
      case 'radio': Sound.play('radio'); break;
      case 'radioburst': { const s = spatial(e.x, e.y); if (s.d < 22) Sound.play('radio'); break; }
      case 'reveal': Sound.play('unlock'); break;
      case 'log': { const st = STORY[e.level] || ['Log', '...']; $('log-title').textContent = st[0]; $('log-text').textContent = st[1]; if (!save.logs[e.level]) { save.logs[e.level] = 1; persist(); } G.modal = true; overlay('log', true); Sound.play('ui'); if (document.pointerLockElement) document.exitPointerLock(); break; }
      case 'note': $('note-extra').textContent = w.spec.beat === 'noteWrite' ? 'Written over an older message: "DON\'T ANSWER THE PULSE."' : ''; $('note-code').textContent = e.code; G.modal = true; overlay('note', true); if (document.pointerLockElement) document.exitPointerLock(); break;
      case 'keypad': openKeypad(e.id); break;
      case 'heard': { const s = spatial(e.x, e.y); if (s.d < 20) { Sound.play('heard'); banner('IT HEARD THAT', 'heard', 1500); } break; }
      case 'sniff': { const sp = spatial(e.x, e.y); Sound.play('breath', { v: Math.max(0.5, sp.v), pan: sp.pan }); later(() => Sound.play('growl', { v: 0.4, pan: sp.pan, kind: 'stalker' }), 900); break; }
      case 'suspicious': Sound.play('notice'); banner('SUSPICIOUS', 'sus', 1800); break;
      case 'hunt': { const s = spatial(e.x, e.y); Sound.play('hunt'); Sound.play('roar', { v: Math.max(0.35, s.v), pan: s.pan, kind: w.creatures[e.id].t }); banner('IT SEES YOU!', 'seen', 2400); vibe([60, 40, 60]); G.view.shake = 0.5; break; }
      case 'lost': Sound.play('lost'); banner('IT LOST YOU', 'heard', 1500); break;
      case 'cstep': { const s = spatial(e.x, e.y); const v = Math.max(0, 1 - s.d / 14); if (v > 0.03) Sound.play('cstep', { v: v * (e.hunt ? 1 : 0.8), pan: s.pan, kind: w.creatures[e.id].t }); break; }
      case 'lunge': { const s = spatial(e.x, e.y); Sound.play('roar', { v: Math.max(0.5, s.v), pan: s.pan, kind: w.creatures[e.id].t }); G.view.shake = Math.max(G.view.shake || 0, 0.3); vibe(40); break; }
      case 'beat': playBeat(e, w, p); break;
      case 'hurt': { const bearing = angDiffUI(Math.atan2(e.y - p.y, e.x - p.x), p.yaw); Sound.play('hurt'); G.view.kick(e.amt, bearing); vibe([40, 30, 90]); const d = $('fx-dmg'); d.classList.remove('hit'); void d.offsetWidth; d.classList.add('hit'); G.hpShowT = 5; break; }
      case 'heal': Sound.play('heal'); banner('+' + HEAL[e.kind] + ' HP', 'heard', 1400); G.hpShowT = 4; break;
      case 'hpfull': banner('HEALTH IS FULL: SAVE IT FOR LATER', 'sus', 1300); break;
      case 'spark': { const s = spatial(e.x, e.y); if (s.d < 14) Sound.play('zap', { v: Math.max(0.25, s.v), pan: s.pan }); break; }
      case 'steam': { const s = spatial(e.x, e.y); if (s.d < 16) Sound.play('hiss', { v: Math.max(0.25, s.v), pan: s.pan }); break; }
      case 'drip': { const s = spatial(e.x, e.y); if (s.d < 12) Sound.play('drip', { f: Math.random(), pan: s.pan }); break; }
      case 'cwake': { const s = spatial(e.x, e.y); Sound.play('cscreech', { v: Math.max(0.5, s.v), pan: s.pan }); banner(e.ceil ? 'SOMETHING DROPPED FROM ABOVE' : 'SOMETHING SMALL AND FAST', 'seen', 1900); vibe([40, 30, 40]); break; }
      case 'cskit': { const s = spatial(e.x, e.y), v = Math.max(0, 1 - s.d / 16); if (v > 0.04) Sound.play('skit', { v, pan: s.pan }); break; }
      case 'cbite': Sound.play('cbite'); break;
      case 'impact': { const s = spatial(e.x, e.y); Sound.play('impact', { v: Math.max(0.35, s.v), pan: s.pan }); break; }
      case 'machine': { const s = spatial(e.x, e.y); Sound.play('machine', { v: Math.max(0.4, s.v), pan: s.pan }); banner('MACHINERY STARTING SOMEWHERE', 'sus', 2200); break; }
      case 'sighting': G.view.flashEyes(e.x * 2, e.y * 2, 1.9, 2.5); break;
      case 'sp': if (e.what === 'outage') { G.view.blackout(e.dur); Sound.duck && Sound.duck(); Sound.play('surge'); banner('POWER FAILURE', 'sus', 2000); } else if (e.what === 'flicker') G.view.flicker(e.dur); else if (e.what === 'surge') Sound.play('surge'); else if (e.what === 'chase') banner('IT KNOWS WHERE YOU ARE', 'seen', 2400); break;
      case 'dead': { Sound.play('hurt'); Sound.play('caught'); G.view.shake = 0.7; G.deadCause = e.cause; $('dead-sub').textContent = e.cause === 'spark' ? 'The wiring finished what the dark started.' : 'Small things are still deadly.'; loseLevel(); break; }
      case 'caught': $('dead-sub').textContent = 'It heard you. It found you.'; Sound.play('caught'); G.view.shake = 0.8; loseLevel(); break;
      case 'win': winLevel(); break;
    }
  }
  /* heartbeat and breathing follow the threat */
  /* scare director: psychological beats while nothing is chasing you (visual and audio only, no effect on the rules) */
  G.dirT = (G.dirT === undefined ? 20 + Math.random() * 15 : G.dirT) - dt;
  if (G.dirT <= 0 && p.alive && p.hidden < 0 && !p.vent && w.threat < 0.5 && !w.creatures.some(c => c.state === 'hunt')) {
    G.dirT = 28 + Math.random() * 30; const r = Math.random(), pan = Math.random() * 2 - 1;
    if (r < 0.3) { G.view.blackout(1.1 + Math.random() * 0.8); Sound.duck && Sound.duck(); later(() => Sound.play('thump', { pan }), 1200); }
    else if (r < 0.6) { Sound.play('thump', { pan }); later(() => Sound.play('creak', { pan }), 700 + Math.random() * 900); }
    else { const yaw = p.yaw; let spot = null; for (let d = 16; d >= 9 && !spot; d -= 1) for (const da of [0, 0.12, -0.12, 0.25, -0.25]) { const x = p.x + Math.cos(yaw + da) * d, y = p.y + Math.sin(yaw + da) * d, k = Math.floor(y) * w.W + Math.floor(x); if (w.cells[k] !== 0 && !w.solid.has(k) && AI.lineOfSight(w, p.x, p.y, x, y)) { spot = [x, y]; break; } } if (spot) { G.view.flashEyes(spot[0] * 2, spot[1] * 2, 1.7); Sound.play('growl', { v: 0.25, pan: 0, kind: 'stalker' }); } else G.dirT = 6; }
  }
  hbTimer -= dt; const th2 = Math.max(w.threat, p.hp < 35 ? 0.6 : 0); if (th2 > 0.35 && hbTimer <= 0 && p.alive) { hbTimer = 1.05 - 0.55 * th2; Sound.play('heart', { v: Math.min(1, th2 * 1.2) }); if (G.heartEcho) later(() => Sound.play('heart', { v: Math.min(1, th2 * 0.8) }), 380); if (th2 > 0.8 && Math.random() < 0.3) vibe(25); }
  const nearGen = w.gens.find(g => g.on); Sound.scene({ chapter: LEVELS[G.level].ch, threat: w.threat, hunted: w.creatures.some(c => c.state === 'hunt'), gen: nearGen ? clamp(1 - Math.hypot(nearGen.x - p.x, nearGen.y - p.y) / 22, 0, 1) : 0, genPan: nearGen ? spatial(nearGen.x + 0.5, nearGen.y + 0.5).pan : 0, paused: G.paused });
  Sound.tick(dt, LEVELS[G.level].ch, w.threat > 0.5);
}

/* ---------------- keypad ---------------- */
let kpDoor = null, kpCode = '';
function openKeypad(id) { kpDoor = id; kpCode = ''; $('kp-screen').textContent = '----'; G.modal = true; overlay('keypad', true); if (document.pointerLockElement) document.exitPointerLock(); }
(function () { const g = $('kp-grid'); ['1', '2', '3', '4', '5', '6', '7', '8', '9', '<', '0', 'OK'].forEach(k => { const b = document.createElement('button'); b.textContent = k; b.onclick = () => { Sound.play('ui'); if (k === '<') kpCode = kpCode.slice(0, -1); else if (k === 'OK') { if (kpCode.length === 4 && G.world.enterCode(kpDoor, kpCode)) { overlay('keypad', false); G.modal = false; if (!coarse) lockPointer(); return; } kpCode = ''; } else if (kpCode.length < 4) kpCode += k; $('kp-screen').textContent = (kpCode + '----').slice(0, 4); }; g.appendChild(b); }); })();
$('kp-cancel').onclick = () => { overlay('keypad', false); G.modal = false; G.world.keypad = null; if (!coarse) lockPointer(); };
$('log-ok').onclick = () => { overlay('log', false); G.modal = false; if (!coarse) lockPointer(); };
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
const REACH_H = { door: 1.3, locker: 1.0, item: 0.95, generator: 0.9, valve: 1.2, breaker: 1.2, note: 0.1, log: 1.1, vent: 0.55, exit: 1.3 };
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
  else if (touch.look && e.pointerId === touch.look.id) { if (Math.hypot(e.clientX - touch.look.sx, e.clientY - touch.look.sy) > 12) touch.look.moved = true; const s = 0.0052 * save.set.sens / 100; inp.pyaw += (e.clientX - touch.look.x) * s; inp.ppitch += -(e.clientY - touch.look.y) * s * (save.set.inv ? -1 : 1); /* pending turn, fed in smoothly each frame */  touch.look.x = e.clientX; touch.look.y = e.clientY; }
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
$('m-play').onclick = () => { landscape(); Sound.play('ui'); buildChapters(); show('chapters'); }; $('m-levels').onclick = () => { Sound.play('ui'); G.chapterView = LEVELS[Math.min(save.last, LEVELS.length - 1)].ch; buildLevels(); show('levels'); };
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
function syncSettings() { const s = save.set; qa('#set-gfx button').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === s.gfx)); qa('#set-aq button').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === s.aq)); $('set-bright').value = s.bright; $('set-vibe').checked = s.vibe; $('set-hints').checked = s.hints; $('set-marks').checked = s.marks; $('set-vol').value = s.vol; $('set-mvol').value = s.mvol; $('v-vol').textContent = s.vol + '%'; $('v-mvol').textContent = s.mvol + '%'; $('set-sound').checked = s.sound; $('set-music').checked = s.music; $('set-sens').value = s.sens; $('set-inv').checked = s.inv; }
function applyGfx() { const v = G.view; v.autoQ = false; v.setQuality('high'); v.brightness = save.set.bright / 100; }   /* a single graphics tier: no setting to choose */
seg('set-aq', 'aq', () => { Sound.setQuality(save.set.aq); Sound.unlock(); applyAudio(); });
const bindR = (id, key, fn) => { $(id).oninput = () => { save.set[key] = +$(id).value; fn && fn(); syncSettings(); }; $(id).onchange = persist; }, bindC = (id, key, fn) => { $(id).onchange = () => { save.set[key] = $(id).checked; fn && fn(); persist(); }; };
bindR('set-bright', 'bright', () => { G.view.brightness = save.set.bright / 100; }); bindR('set-vol', 'vol', applyAudio); bindR('set-mvol', 'mvol', applyAudio); bindR('set-sens', 'sens'); bindC('set-vibe', 'vibe', applyAudio); bindC('set-hints', 'hints'); bindC('set-marks', 'marks'); bindC('set-sound', 'sound', applyAudio); bindC('set-music', 'music', applyAudio); bindC('set-inv', 'inv');
$('set-reset').onclick = () => { if ($('set-reset').dataset.sure) { save.stars = []; save.best = []; save.last = 0; save.tips = {}; persist(); delete $('set-reset').dataset.sure; $('set-reset').textContent = 'Reset'; } else { $('set-reset').dataset.sure = 1; $('set-reset').textContent = 'Sure?'; setTimeout(() => { delete $('set-reset').dataset.sure; $('set-reset').textContent = 'Reset'; }, 2500); } };

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
    if (!G.paused && !G.modal) { const kk = 1 - Math.exp(-dt / 0.045); const ty = inp.pyaw * kk, tp = inp.ppitch * kk; inp.dyaw += ty; inp.dpitch += tp; inp.pyaw -= ty; inp.ppitch -= tp; G.acc += dt; let n = 0; while (G.acc >= DT && n++ < 8) { const i = tickInput(); w.update(DT, i); if (!G.over || w.over === 'dead') G.timeSpent += DT; G.acc -= DT; handleEvents(w, DT); } if (n >= 8) G.acc = 0; } else { inp.edge = {}; inp.dyaw = 0; inp.dpitch = 0; inp.pyaw = 0; inp.ppitch = 0; G.acc = 0; }   // nothing typed or tapped while paused may fire on resume
    hud(w, dt); const pl = w.player, free = pl.alive && pl.hidden < 0 && !pl.vent && !G.paused && !G.modal; v.frame(w, G.paused || G.modal ? 0 : dt, now, { alpha: G.paused || G.modal ? 1 : clamp(G.acc / DT, 0, 1), look: free ? { yaw: pl.yaw + inp.dyaw, pitch: clamp(pl.pitch + inp.dpitch, -1.25, 1.25) } : null });
  } else if (G.menuWorld) { G.menuT += dt; const w = G.menuWorld; w.update(dt, {}); w.drainEvents(); v.setMenuCamera(w, G.menuT); v.camera.updateMatrixWorld(true); v.flashRig.position.copy(v.camera.position); v.flashRig.quaternion.copy(v.camera.quaternion); v.flash.intensity = 200; v.cone.visible = true; v.coneMat.uniforms.uInt.value = 0.1; v.handRoot.visible = false; v.menuFrame(w, dt, now); Sound.tick && Sound.tick(dt, 0, false); }
}
async function boot() {
  const v = G.view = new View($('view'), 'high', { aa: false }); v.onQuality = (q) => { save.set.gfx = save.set.gfx === 'auto' ? 'auto' : save.set.gfx; }; if (isMobile) v.resScale = 0.85; applyGfx(); applyAudio(); window.addEventListener('resize', () => v.resize());
  setLoading(true, 'Preparing the facility', 30); await nextFrame(); for (let i = 0; i < LEVELS.length; i++) { gen(i); if (i % 8 === 0) { setLoading(true, null, 30 + i); await nextFrame(); } }
  if (!(__TEST__ && TEST && /[?&]noglb=1\b/.test(location.search))) await GLBMonster.load(); await CrawlerGLB.load(); await startMenuScene(); G.mode = 'home'; show('home'); syncSettings(); setLoading(false, null, 100); overlay('gate', !TEST); requestAnimationFrame(frame); Sound.setQuality(save.set.aq);
}
boot();
if (__TEST__ && TEST) { window.HUSH = { gallery: () => G.view.gallery(), G, save, inp, ai: AI, glb: GLBMonster, tapAt, proj: (o) => { const v = G.view, r = $('view').getBoundingClientRect(), t = v.camera.position.clone(); v.camera.updateMatrixWorld(true); t.set((o.x + 0.5) * 2, REACH_H[o.type] || 1, (o.y + 0.5) * 2).project(v.camera); return [(t.x * 0.5 + 0.5) * r.width + r.left, (-t.y * 0.5 + 0.5) * r.height + r.top]; }, startLevel, toMenu, pause, view: () => G.view, world: () => G.world, LEVELS, runBot: (n) => runBot(G.world, n || 600), gen, step: (n, i) => { for (let k = 0; k < (n || 1); k++) { G.world.update(DT, i || {}); G.timeSpent += DT; handleEvents(G.world, DT); } }, unlockAll: () => { save.stars = LEVELS.map(() => 1); persist(); }, buildLevels, buildChapters, show }; }
