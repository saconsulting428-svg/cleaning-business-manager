// DOM screens: splash, home, levels, gameplay HUD + overlays, shop, wardrobe, settings, how-to-play.
import { Game } from '../game/game.js';
import { LEVELS, PLAYABLE_LEVELS, getLevel } from '../levels/levels.js';
import { WORLDS, WORLD_ORDER, TOTAL_LEVELS } from '../levels/worlds.js';
import { CHARACTERS, VARIANTS, getChar, getVariant } from '../entities/cosmetics.js';
import { drawThief } from '../entities/thief.js';
import { AdService } from '../services/ads.js';
import * as save from '../storage/save.js';
import * as audio from '../audio/audio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const stars = (n, max = 3) => '★'.repeat(n) + '<span class="off">' + '★'.repeat(max - n) + '</span>';

let game = null;
let currentScreen = 'splash';
let shopTab = 'chars';
let lastResult = null;
let toastTimer = 0;

const TEMPLATE = `
<section id="splash" class="screen center">
  <canvas class="logo-thief" width="240" height="240"></canvas>
  <h1 class="logo">ONE TAP<br><span>THIEF</span></h1>
  <p class="tag">Steal. Escape. Don’t Get Caught.</p>
  <div class="loadbar"><i></i></div>
</section>

<section id="home" class="screen">
  <header class="topbar"><div class="coins" data-bind="coins"></div><div class="pill star-total" data-bind="stars"></div></header>
  <div class="home-mid">
    <canvas class="logo-thief" id="homeThief" width="260" height="260"></canvas>
    <h1 class="logo">ONE TAP<br><span>THIEF</span></h1>
    <p class="tag">Steal. Escape. Don’t Get Caught.</p>
  </div>
  <nav class="menu">
    <button class="btn primary big" data-action="play">PLAY <small data-bind="playLabel"></small></button>
    <button class="btn" data-action="levels">LEVELS</button>
    <button class="btn" data-action="shop">SHOP</button>
    <button class="btn" data-action="settings">SETTINGS</button>
    <div class="row2">
      <button class="btn ghost" data-action="wardrobe">Characters</button>
      <button class="btn ghost" data-action="howto">How to play</button>
    </div>
  </nav>
</section>

<section id="levels" class="screen">
  <header class="topbar"><button class="icon-btn" data-action="home" aria-label="Back">‹</button><h2>Levels</h2><div class="coins" data-bind="coins"></div></header>
  <div class="scroll" id="levelList"></div>
</section>

<section id="game" class="screen">
  <canvas id="stage"></canvas>
  <header class="hud" id="hud">
    <button class="icon-btn" data-action="pause" aria-label="Pause">❚❚</button>
    <div class="hud-mid"><div class="hud-title" id="hudTitle"></div><div class="hud-sub" id="hudSub"></div></div>
    <div class="hud-stats"><span class="hud-coin" id="hudCoins">0</span><span class="hud-loot" id="hudLoot">0/0</span><span class="hud-key" id="hudKey" hidden>🔑</span></div>
  </header>
  <div class="objective" id="objective"></div>
  <div class="alarm-banner" id="alarmBanner" hidden>ALARM</div>
  <div class="toast" id="toast"></div>
  <div class="ready" id="ready"><div class="ready-card"><h2 id="readyName"></h2><p id="readyHint"></p><div class="tap-hint">Drag &amp; release to start</div></div></div>
</section>

<section id="shop" class="screen">
  <header class="topbar"><button class="icon-btn" data-action="home" aria-label="Back">‹</button><h2 id="shopTitle">Shop</h2><div class="coins" data-bind="coins"></div></header>
  <div class="tabs"><button data-tab="chars" class="tab active">Characters</button><button data-tab="variants" class="tab">Colours</button></div>
  <p class="note" id="shopNote">Cosmetics only — they never change gameplay.</p>
  <div class="scroll grid cards" id="shopList"></div>
</section>

<section id="settings" class="screen">
  <header class="topbar"><button class="icon-btn" data-action="home" aria-label="Back">‹</button><h2>Settings</h2><div></div></header>
  <div class="scroll list">
    <label class="toggle"><span>Sound effects</span><input type="checkbox" data-setting="sound"><i></i></label>
    <label class="toggle"><span>Music</span><input type="checkbox" data-setting="music"><i></i></label>
    <label class="toggle"><span>Show level hints</span><input type="checkbox" data-setting="hints"><i></i></label>
    <button class="btn" data-action="howto">How to play</button>
    <button class="btn danger" data-action="reset">Reset progress</button>
    <p class="note">One Tap Thief v1.0 · Audio is synthesised in-game (placeholder sounds). Ads in this build are placeholders only.</p>
  </div>
</section>

<section id="howto" class="screen">
  <header class="topbar"><button class="icon-btn" data-action="back" aria-label="Back">‹</button><h2>How to play</h2><div></div></header>
  <div class="scroll list how">
    <div class="card"><b>👆 Drag to move</b><p>Press, drag and release where you want the thief to go — he finds his own way around walls. Release somewhere else to change your mind.</p></div>
    <div class="card"><b>🟡 Avoid vision cones</b><p>Guards and cameras see in a cone. Walls and furniture block their view. Stay in sight too long and you’re caught.</p></div>
    <div class="card"><b>🫥 Hide &amp; stay back</b><p>Step into a wardrobe to disappear. Guards also sense you when you get close — even behind their back — so give them room. Never touch a guard.</p></div>
    <div class="card"><b>💰 Loot &amp; exit</b><p>Collect coins (+10) and rare gems (+50), then reach the green exit.</p></div>
    <div class="card"><b>🔑 Keys &amp; doors</b><p>A key opens one locked door. Walking onto a red alarm tile, tripping a laser, or getting spotted by a camera sets off the alarm — guards rush in and see further.</p></div>
    <div class="card"><b>⭐ Stars</b><p>1★ reach the exit · 2★ collect enough loot · 3★ <i>Perfect Heist</i>: all loot, never detected, no alarm (+100 coins).</p></div>
  </div>
</section>

<div id="modal" class="modal" hidden></div>
`;

export function mount(root) {
  root.innerHTML = TEMPLATE;
  game = new Game($('#stage'), {
    onReady: showReady, onStart: hideReady, onHud: updateHud, onCaught: showCaught, onWin: showComplete,
    onToast: toast, onAutoPause: () => { if (currentScreen === 'game' && !game.paused && !game.waiting) openPause(); },
  });
  window.__ott = { get game() { return game; }, save, startLevel }; // debug/test handle
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  save.onChange(refreshBindings);
  refreshBindings();
  applySettings();
  drawSplash();
  setTimeout(() => { if (currentScreen === 'splash') go('home'); }, 1900);
  $('#splash').addEventListener('pointerdown', () => { audio.init(); go('home'); });
  requestAnimationFrame(homeThiefLoop);
}

// ---------------------------------------------------------------- navigation
const history = [];
function show(name) {
  if (currentScreen === 'game' && name !== 'game') game.stop();
  currentScreen = name;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === name));
  closeModal();
  if (name === 'home') audio.startMusic();
  if (name === 'levels') buildLevels();
  if (name === 'shop' || name === 'wardrobe') { $('#shop').dataset.mode = name; buildShop(); $('#shopTitle').textContent = name === 'shop' ? 'Shop' : 'Characters'; }
  if (name === 'settings') $$('[data-setting]', $('#settings')).forEach((i) => { i.checked = !!save.get()[i.dataset.setting]; });
  refreshBindings();
}
export function go(name) {
  if (name === currentScreen) return;
  if (name === 'home') history.length = 0; else history.push(currentScreen);
  show(name);
}
const back = () => { let t = history.pop() || 'home'; if (t === 'game' || t === 'splash') t = 'home'; show(t); };

function onClick(e) {
  const tab = e.target.closest('[data-tab]');
  if (tab) { audio.play('click'); shopTab = tab.dataset.tab; buildShop(); return; }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  audio.init(); audio.play('click');
  const a = el.dataset.action;
  const actions = {
    home: () => go('home'), back, levels: () => go('levels'), shop: () => go('shop'), wardrobe: () => go('wardrobe'),
    settings: () => go('settings'), howto: () => go('howto'),
    play: () => startLevel(Math.min(save.get().unlocked, PLAYABLE_LEVELS)),
    pause: openPause, resume: closePause,
    restart: () => { closeModal(); game.restart(); },
    quit: () => { closeModal(); go('levels'); },
    retry: () => { closeModal(); game.restart(); },
    next: nextLevel,
    doubleCoins, continueAd, reset: confirmReset,
    buy: () => buyOrEquip(el.dataset.kind, el.dataset.id),
    level: () => startLevel(+el.dataset.level),
  };
  actions[a]?.(el);
}

function onChange(e) {
  const s = e.target.dataset.setting;
  if (!s) return;
  save.set({ [s]: e.target.checked });
  applySettings();
  audio.play('click');
}

function applySettings() {
  const s = save.get();
  audio.configure({ sound: s.sound, music: s.music });
}

// ---------------------------------------------------------------- bindings / home
function refreshBindings() {
  const s = save.get();
  $$('[data-bind="coins"]').forEach((el) => { el.innerHTML = `<i class="coin-dot"></i>${s.coins}`; });
  $$('[data-bind="stars"]').forEach((el) => { el.innerHTML = `★ ${save.totalStars()} / ${PLAYABLE_LEVELS * 3}`; });
  $$('[data-bind="playLabel"]').forEach((el) => { el.textContent = `· Level ${Math.min(s.unlocked, PLAYABLE_LEVELS)}`; });
}

function drawSplash() {
  const c = $('#splash .logo-thief');
  const g = c.getContext('2d');
  g.clearRect(0, 0, 240, 240);
  drawThief(g, 120, 130, 70, 'classic', 'black', Math.PI / 2);
}
function homeThiefLoop(now) {
  requestAnimationFrame(homeThiefLoop);
  if (currentScreen !== 'home') return;
  const c = $('#homeThief');
  const g = c.getContext('2d');
  const s = save.get();
  g.clearRect(0, 0, c.width, c.height);
  const t = now / 1000;
  drawThief(g, 130, 140 + Math.sin(t * 2) * 4, 70, s.character, s.variant, Math.PI / 2 + Math.sin(t * 1.2) * 0.35);
}

// ---------------------------------------------------------------- level select
function buildLevels() {
  const s = save.get();
  let html = '';
  for (const id of WORLD_ORDER) {
    const w = WORLDS[id];
    const idx = WORLD_ORDER.indexOf(id) + 1;
    html += `<h3 class="world-h">World ${idx} — ${w.name}</h3>`;
    const playable = LEVELS.filter((l) => l.world === id);
    if (!playable.length) {
      html += `<div class="card soon">Levels ${w.levels[0]}–${w.levels[1]} · coming soon</div>`;
      continue;
    }
    html += '<div class="lvl-grid">';
    for (let n = w.levels[0]; n <= w.levels[1]; n++) {
      const def = getLevel(n);
      if (!def) { html += `<div class="lvl locked soon"><b>${n}</b><small>soon</small></div>`; continue; }
      const locked = n > s.unlocked;
      const st = save.starsFor(n);
      html += locked ? `<div class="lvl locked"><b>🔒</b><small>${n}</small></div>`
        : `<button class="lvl" data-action="level" data-level="${n}"><b>${n}</b><span class="stars">${stars(st)}</span></button>`;
    }
    html += '</div>';
  }
  $('#levelList').innerHTML = html;
}

// ---------------------------------------------------------------- gameplay
function startLevel(n) {
  if (!getLevel(n)) return;
  closeModal();
  const was = currentScreen;
  if (was !== 'game') go('game');
  audio.init(); audio.startMusic();
  requestAnimationFrame(() => {
    const hud = $('#hud').getBoundingClientRect();
    const obj = $('#objective').getBoundingClientRect();
    game.insets = { top: hud.bottom + 6, bottom: Math.max(48, window.innerHeight - obj.top + 4) + (window.innerHeight < 700 ? 36 : 84) }; // room for the start card
    game.load(n);
    game.start();
  });
}

function showReady(def) {
  const world = WORLDS[def.world];
  $('#hudTitle').textContent = `Level ${def.level}`;
  $('#hudSub').textContent = def.name;
  $('#readyName').textContent = `Level ${def.level} · ${def.name}`;
  const hint = save.get().hints && def.hint ? def.hint : `${world.name}`;
  $('#readyHint').textContent = hint;
  $('#ready').classList.add('show');
  $('#objective').textContent = 'Collect the loot, then reach the exit';
  $('#alarmBanner').hidden = true;
  game.canvas.focus?.();
}
const hideReady = () => $('#ready').classList.remove('show');

function updateHud(h) {
  $('#hudCoins').textContent = h.coins;
  $('#hudLoot').textContent = `${h.got}/${h.total}`;
  $('#hudKey').hidden = h.keys <= 0;
  $('#hudKey').textContent = h.keys > 1 ? `🔑×${h.keys}` : '🔑';
  $('#alarmBanner').hidden = !h.alarm;
  $('#game').classList.toggle('danger', h.danger || h.alarm);
  $('#objective').textContent = h.got >= h.total ? 'All loot taken — head for the exit!' : 'Collect the loot, then reach the exit';
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
}

// ---------------------------------------------------------------- modals
function openModal(html, cls = '') {
  const m = $('#modal');
  m.className = 'modal ' + cls;
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.hidden = false;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

function openPause() {
  if (game.waiting) return;
  game.setPaused(true);
  const s = save.get();
  openModal(`<h2>Paused</h2>
    <button class="btn primary" data-action="resume">Resume</button>
    <button class="btn" data-action="restart">Restart level</button>
    <label class="toggle"><span>Sound effects</span><input type="checkbox" data-setting="sound" ${s.sound ? 'checked' : ''}><i></i></label>
    <label class="toggle"><span>Music</span><input type="checkbox" data-setting="music" ${s.music ? 'checked' : ''}><i></i></label>
    <button class="btn ghost" data-action="quit">Quit to levels</button>`);
}
function closePause() { closeModal(); game.setPaused(false); game.last = performance.now(); }

function showCaught() {
  if (currentScreen !== 'game') return;
  game.setPaused(true);
  const can = !game.continueUsed;
  openModal(`<h2 class="bad">CAUGHT!</h2><p>The guards got you. Try a different route.</p>
    <button class="btn primary" data-action="retry">Retry</button>
    ${can ? '<button class="btn gold" data-action="continueAd">▶ Continue <small>watch ad</small></button>' : ''}
    <button class="btn ghost" data-action="quit">Levels</button>`, 'caught');
}

async function continueAd() {
  const r = await AdService.showRewarded('continue', 'Watch to continue from where you were caught.');
  if (r.rewarded) { closeModal(); game.continueRun(); } else toast('No reward — ad was skipped');
}

function showComplete(result) {
  if (currentScreen !== 'game') return;
  game.setPaused(true);
  lastResult = { ...result, doubled: false };
  const level = game.level;
  const before = save.starsFor(level);
  save.recordResult(level, result, PLAYABLE_LEVELS);
  save.addCoins(result.coins);
  const hasNext = level < PLAYABLE_LEVELS;
  openModal(`<h2 class="good">${result.perfect ? 'PERFECT HEIST!' : 'LEVEL COMPLETE'}</h2>
    <div class="star-row">${[1, 2, 3].map((i) => `<span class="star ${i <= result.stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.3}s">★</span>`).join('')}</div>
    ${result.perfect ? '<div class="badge">🏆 Perfect Heist · +100 bonus</div>' : `<p class="sub">${result.loot}/${result.totalLoot} loot${result.stars < 3 ? ' · 3★ needs all loot, no detection, no alarm' : ''}</p>`}
    <div class="earned"><i class="coin-dot"></i><span id="earned">+${result.coins}</span></div>
    ${before < result.stars && before > 0 ? '<p class="sub">New best!</p>' : ''}
    ${hasNext ? '<button class="btn primary" data-action="next">Next level</button>' : '<p class="sub">You cleared every MVP heist! More worlds are coming.</p>'}
    <button class="btn gold" id="dbl" data-action="doubleCoins">▶ 2× Coins <small>watch ad</small></button>
    <div class="row2"><button class="btn" data-action="retry">Retry</button><button class="btn ghost" data-action="quit">Levels</button></div>`, 'complete');
}

async function doubleCoins() {
  if (!lastResult || lastResult.doubled) return;
  const r = await AdService.showRewarded('double_coins', 'Watch to double your coins for this level.');
  if (!r.rewarded) return;
  lastResult.doubled = true;
  save.addCoins(lastResult.coins);
  $('#earned').textContent = `+${lastResult.coins * 2}`;
  const b = $('#dbl');
  b.disabled = true; b.textContent = '✔ Doubled';
  audio.play('buy');
}

async function nextLevel() {
  const done = game.level;
  closeModal();
  await AdService.maybeShowInterstitial(done);
  startLevel(done + 1);
}

// ---------------------------------------------------------------- shop / wardrobe
function buildShop() {
  const mode = $('#shop').dataset.mode || 'shop';
  const s = save.get();
  $$('.tab', $('#shop')).forEach((t) => t.classList.toggle('active', t.dataset.tab === shopTab));
  $('#shopNote').textContent = mode === 'shop' ? 'Cosmetics only — they never change gameplay.' : 'Choose who robs the place tonight.';
  const items = shopTab === 'chars' ? CHARACTERS : VARIANTS;
  const kind = shopTab === 'chars' ? 'char' : 'variant';
  const owned = kind === 'char' ? s.ownedChars : s.ownedVariants;
  const equipped = kind === 'char' ? s.character : s.variant;
  let html = '';
  for (const it of items) {
    const own = owned.includes(it.id);
    if (mode === 'wardrobe' && !own) continue;
    const label = equipped === it.id ? 'Equipped' : own ? 'Equip' : `<i class="coin-dot"></i>${it.price}`;
    const disabled = equipped === it.id || (!own && s.coins < it.price);
    html += `<div class="card item ${equipped === it.id ? 'equipped' : ''}">
      <canvas width="160" height="160" data-prev="${kind}:${it.id}"></canvas>
      <b>${it.name}</b>
      <button class="btn ${own ? '' : 'gold'} small" data-action="buy" data-kind="${kind}" data-id="${it.id}" ${disabled ? 'disabled' : ''}>${label}</button></div>`;
  }
  $('#shopList').innerHTML = html;
  $$('canvas[data-prev]', $('#shopList')).forEach((c) => {
    const [k, id] = c.dataset.prev.split(':');
    const g = c.getContext('2d');
    drawThief(g, 80, 84, 40, k === 'char' ? id : s.character, k === 'variant' ? id : s.variant, Math.PI / 2);
  });
}

function buyOrEquip(kind, id) {
  const s = save.get();
  const own = kind === 'char' ? s.ownedChars : s.ownedVariants;
  const item = kind === 'char' ? getChar(id) : getVariant(id);
  const patch = {};
  if (!own.includes(id)) {
    if (s.coins < item.price) { toast('Not enough coins'); return; }
    patch.coins = s.coins - item.price;
    patch[kind === 'char' ? 'ownedChars' : 'ownedVariants'] = [...own, id];
    audio.play('buy');
  }
  patch[kind === 'char' ? 'character' : 'variant'] = id;
  save.set(patch);
  buildShop();
}

// ---------------------------------------------------------------- settings: reset
function confirmReset() {
  openModal(`<h2 class="bad">Reset progress?</h2><p>This erases coins, stars, unlocked levels and purchases. This cannot be undone.</p>
    <button class="btn danger" id="confirmReset">Yes, erase everything</button>
    <button class="btn ghost" id="cancelReset">Cancel</button>`);
  $('#confirmReset').onclick = () => { save.resetProgress(); closeModal(); toast('Progress reset'); refreshBindings(); };
  $('#cancelReset').onclick = closeModal;
}
