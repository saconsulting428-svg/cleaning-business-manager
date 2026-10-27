<script>// =====================================================================
//  SNAKE - FRUIT RUSH   (Phaser 3)
//  Controls: swipe / tap / mouse click, Arrow keys or WASD
//            Space = pause, Enter = play, C = continue, T = theme, B = background, Esc = menu
//  High score, theme, sound and the saved game are kept in localStorage.
// =====================================================================
(function () {
  'use strict';

  // ---------- Settings ----------
  const W = 480, H = 800;            // logical screen (portrait)
  const ZOOM = 2;                    // render at 2x so it is sharp on phones
  const CELL = 22, COLS = 20, ROWS = 26;
  const BX = 20, BY = 104;           // board top-left
  const BW = COLS * CELL, BH = ROWS * CELL;

  const FRUIT_POINTS = 10;
  const BONUS_POINTS = 50;
  const BONUS_EVERY = 5;             // big fruit after every 5 fruits
  const BONUS_TICKS = 55;            // big fruit stays this many steps
  const START_DELAY = 150;           // ms per step at the start (lower = faster)
  const MIN_DELAY = 72;              // fastest the snake gets on its own
  const SPEEDUP_FRUITS = 45;         // bigger = speed goes up more slowly
  const SWIPE_PX = 14;               // finger movement (screen px) that counts as a swipe
  const INSTANT_TURN = 0.25;         // turn right away if the snake is this far into its step

  const MODES = {
    classic: { name: 'Classic', desc: 'Walls and tail are deadly' },
    walls: { name: 'No walls', desc: 'Go through the walls', wall: true },
    ghost: { name: 'Ghost', desc: 'Pass through yourself', ghost: true },
    ultimate: { name: 'Ultimate', desc: 'Bombs! No walls, ghost, own speed', wall: true, ghost: true, bombs: true }
  };
  const MODE_KEYS = Object.keys(MODES);
  const BOMBS = 6;                   // bombs on the board in Ultimate mode
  const BOMB_SAFE = 4;               // bombs never appear this close to the snake's head
  const DEMO = { x0: 31, y0: 87, cols: 19, rows: 11, ms: 140 };   // the little self-playing snake on the home screen
  const speedDelay = (level) => 214 - level * 16;   // Ultimate speed 1 (slow, 198 ms) .. 10 (fast, 54 ms)

  const COMBO_TICKS = 45;            // eat the next fruit within this many steps
  const COMBO_POWER_EVERY = 3;       // ability icon on every 3rd combo
  const POWER_ITEM_TICKS = 85;       // ability icon stays on the board
  const POWER_TICKS = 110;           // ability lasts this many steps
  const MAGNET_RANGE = 5;
  const SLOW_FACTOR = 1.7;
  const REVIVES_PER_GAME = 1;        // how many times an ad can revive the snake in one game
  const TEST_AD_MS = 5000;           // length of the developer test ad (only with ?testads=1 in the URL)
  const AD_TIMEOUT_MS = 90000;       // give up on a rewarded ad that never answers
  const TEST_ADS = /[?&]testads=1/.test(location.search);
  const COIN_FRUIT = 1, COIN_BONUS = 5, COIN_GOLD = 25;   // coins for a fruit / big fruit / golden fruit
  const GOLD_POINTS = 100;           // golden fruit score (before multipliers)
  const GOLD_TICKS = 45;             // golden fruit stays this many steps
  const NEAR_POINTS = 20;            // close call bonus (Ultimate mode)
  const MAX_COINS = 999999;
  const BACKGROUNDS = ['Plain', 'Dots', 'Grid', 'Stripes', 'Plus'];

  const STORAGE_KEY = 'snakeFruitRush.v1';
  const FONT = 'Fredoka, Verdana, "Trebuchet MS", sans-serif';

  const THEMES = [
    { name: 'Midnight', bg: '#0f1220', board1: '#171b2e', board2: '#1d2340', head: '#86ff74', a: '#4ade80', b: '#22c55e', text: '#e5e7eb', accent: '#facc15', panel: '#2a3157', btnText: '#ffffff' },
    { name: 'Garden', bg: '#173622', board1: '#a7d948', board2: '#9bcf3f', head: '#3566d6', a: '#4f83f1', b: '#3f73e0', text: '#f0fdf4', accent: '#fde047', panel: '#2a6a45', btnText: '#ffffff' },
    { name: 'Ocean', bg: '#06283d', board1: '#0b3a57', board2: '#0f4466', head: '#ffe08a', a: '#ffb703', b: '#fb8500', text: '#e0f2fe', accent: '#5eead4', panel: '#14608f', btnText: '#ffffff' },
    { name: 'Sunset', bg: '#2b1331', board1: '#44203f', board2: '#4e2749', head: '#fff09a', a: '#ff9f1c', b: '#ff6b35', text: '#ffe8d6', accent: '#ff5d8f', panel: '#73305f', btnText: '#ffffff' },
    { name: 'Candy', bg: '#ffd9e8', board1: '#fff5f9', board2: '#ffe6f0', head: '#7c3aed', a: '#a78bfa', b: '#8b5cf6', text: '#4a2545', accent: '#ec4899', panel: '#f472b6', btnText: '#ffffff' }
  ];

  const POWERS = {
    slow: { name: 'SLOW', color: '#38bdf8' },
    ghost: { name: 'GHOST', color: '#a78bfa' },
    magnet: { name: 'MAGNET', color: '#ef4444' },
    wall: { name: 'NO WALLS', color: '#14b8a6' },
    double: { name: '2X', color: '#f59e0b' }
  };
  const POWER_KEYS = Object.keys(POWERS);
  const FRUITS = ['apple', 'orange', 'cherry', 'grapes', 'strawberry'];

  // Snake skins. 'default' follows the theme and is always free.
  const SKINS = [
    { id: 'default', name: 'Classic', cost: 0 },
    { id: 'lava', name: 'Lava', cost: 120, a: '#ff7a1a', b: '#e11d2e', head: '#ffd166', line: '#e11d2e' },
    { id: 'ice', name: 'Frost', cost: 120, a: '#bae6fd', b: '#38bdf8', head: '#ffffff', line: '#38bdf8' },
    { id: 'berry', name: 'Berry', cost: 200, a: '#f472b6', b: '#a21caf', head: '#fde68a', line: '#a21caf' },
    { id: 'bee', name: 'Bee', cost: 300, a: '#facc15', b: '#6b4423', head: '#facc15', line: '#6b4423' },
    { id: 'panda', name: 'Panda', cost: 350, a: '#ffffff', b: '#374151', head: '#ffffff', line: '#9ca3af', animal: 'panda' },
    { id: 'galaxy', name: 'Galaxy', cost: 450, a: '#6d28d9', b: '#312e81', head: '#c4b5fd', line: '#312e81', pattern: 'stars', trail: 'sparkle' },
    { id: 'rainbow', name: 'Rainbow', cost: 600, head: '#ffffff', line: '#a78bfa', pattern: 'rainbow', trail: 'rainbow' },
    { id: 'dragon', name: 'Dragon', cost: 700, a: '#4ade80', b: '#15803d', head: '#22c55e', line: '#15803d', animal: 'dragon', trail: 'fire' },
    { id: 'unicorn', name: 'Unicorn', cost: 900, a: '#fbcfe8', b: '#c4b5fd', head: '#ffffff', line: '#c4b5fd', animal: 'unicorn', trail: 'rainbow' },
    { id: 'gold', name: 'Golden', cost: 1000, a: '#fde047', b: '#d97706', head: '#fff7c2', line: '#d97706', pattern: 'shimmer', trail: 'sparkle' }
  ];
  const SKIN_BY_ID = {};
  SKINS.forEach((s) => { SKIN_BY_ID[s.id] = s; });

  // Daily challenges. One is picked from the date, so everybody gets the same one each day.
  const DAILY_TYPES = [
    { id: 'fruits', text: (n) => 'Eat ' + n + ' fruits', sub: 'across all games today', targets: [25, 40, 60], rewards: [40, 60, 90] },
    { id: 'score', text: (n) => 'Score ' + n + ' points', sub: 'in a single game', targets: [250, 400, 600], rewards: [40, 60, 90] },
    { id: 'survive', text: (n) => 'Survive ' + n + ' seconds', sub: 'in a single game', targets: [45, 75, 110], rewards: [40, 60, 90] },
    { id: 'bonus', text: (n) => 'Eat ' + n + ' big fruits', sub: 'across all games today', targets: [3, 5, 8], rewards: [40, 60, 90] },
    { id: 'golden', text: (n) => 'Catch ' + n + ' golden fruit', sub: 'across all games today', targets: [1, 2, 3], rewards: [50, 80, 120] },
    { id: 'combo', text: (n) => 'Reach combo x' + n, sub: 'in a single game', targets: [4, 6, 9], rewards: [40, 60, 90] },
    { id: 'ultimate', text: (n) => 'Dodge bombs: eat ' + n + ' fruits', sub: 'in Ultimate mode', targets: [12, 20, 30], rewards: [50, 80, 120] }
  ];
  const DAILY_BY_ID = {};
  DAILY_TYPES.forEach((d) => { DAILY_BY_ID[d.id] = d; });
  const STREAK_BONUS = 5, STREAK_MAX = 6;   // +5 coins per streak day, up to +30

  // ---------- Local storage ----------
  const num = (v, lo, hi, dflt) => {                 // safe integer from untrusted saved data
    v = Math.floor(Number(v));
    return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
  };
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function dateKey(d) {
    const p = (n) => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function addDays(key, n) {
    const a = key.split('-');
    return dateKey(new Date(+a[0], +a[1] - 1, +a[2] + n));
  }
  // Deterministic challenge for a date: same date -> same challenge.
  function makeDaily(date) {
    let h = 0;
    for (let i = 0; i < date.length; i++) h = (Math.imul(h, 31) + date.charCodeAt(i)) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    const type = DAILY_TYPES[h % DAILY_TYPES.length], tier = (h >>> 8) % 3;
    return { date: date, id: type.id, target: type.targets[tier], reward: type.rewards[tier], progress: 0, claimed: false };
  }
  function cleanDaily(d) {
    if (!d || typeof d !== 'object' || !DATE_RE.test(d.date) || !DAILY_BY_ID[d.id]) return null;
    const ref = makeDaily(d.date);
    if (ref.id !== d.id) return null;                                  // does not match the generator: ignore the save
    ref.progress = num(d.progress, 0, 1e7, 0);                         // target and reward always come from the generator
    ref.claimed = d.claimed === true;
    return ref;
  }

  function loadData() {
    const d = { high: 0, highs: {}, mode: 'classic', speed: 5, tab: 0, theme: 0, bg: 0, sound: true, save: null,
      coins: 0, skin: 'default', skins: ['default'], daily: null, claimedDates: [], streak: 0, lastClaim: '', spinDates: [] };
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved && typeof saved === 'object') Object.assign(d, saved);
    } catch (e) { /* no storage or broken data: use defaults */ }
    if (!d.highs || typeof d.highs !== 'object') d.highs = {};
    if (d.highs.classic === undefined) d.highs.classic = d.high | 0;   // old single high score
    if (!MODES[d.mode]) d.mode = 'classic';
    d.speed = Math.min(10, Math.max(1, d.speed | 0 || 5));
    d.tab = Math.abs(d.tab | 0) % 5;
    d.theme = Math.abs(d.theme | 0) % THEMES.length;
    d.bg = Math.abs(d.bg | 0) % BACKGROUNDS.length;
    // coins + skins
    d.coins = num(d.coins, 0, MAX_COINS, 0);
    const owned = Array.isArray(d.skins) ? d.skins.filter((id, i, a) => typeof id === 'string' && SKIN_BY_ID[id] && a.indexOf(id) === i) : [];
    if (owned.indexOf('default') < 0) owned.unshift('default');
    d.skins = owned;
    if (typeof d.skin !== 'string' || owned.indexOf(d.skin) < 0) d.skin = 'default';   // locked skins cannot be selected
    // daily challenge
    d.claimedDates = Array.isArray(d.claimedDates) ? d.claimedDates.filter((x) => typeof x === 'string' && DATE_RE.test(x)).slice(-120) : [];
    d.streak = num(d.streak, 0, 100000, 0);
    d.lastClaim = typeof d.lastClaim === 'string' && DATE_RE.test(d.lastClaim) ? d.lastClaim : '';
    d.spinDates = Array.isArray(d.spinDates) ? d.spinDates.filter((x) => typeof x === 'string' && DATE_RE.test(x)).slice(-60) : [];
    d.daily = cleanDaily(d.daily);
    return d;
  }
  function writeData() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); } catch (e) { /* no storage */ }
  }

  const DATA = loadData();
  let state = 'menu';                // menu / play / paused / over / ad
  let adLeft = 0;                    // ms left of the placeholder ad (-1 = waiting for a real ad)
  let G = null;                      // running game
  let prevSnake = null;              // snake before the last step (for smooth movement)
  let acc = 0;                       // ms since the last step
  let anim = 0;                      // animation clock (ms)
  let buttons = [];                  // {x, y, w, h, fn} for taps
  let popups = [];                   // {x, y, s, color, life}
  let scene, g, boardG, layers = [], L = null;   // two drawing layers: 0 = game/menu, 1 = overlays on top
  let sheetOpen = false, sheetT = 0;              // home screen settings sheet
  let demo = null;
  let fxs = [];                      // short visual effects: sparks and rings {k, x, y, vx, vy, r, color, life, max}
  let banner = null;                 // big message over the board {s, sub, color, life}
  let adToken = 0, adTimer = 0;      // identifies the running rewarded-ad request
  let dailyCheck = 0;                // last time the date was checked (ms)

  const th = () => THEMES[DATA.theme];
  const C = (hex) => parseInt(hex.slice(1), 16);
  const cellXY = (c, r) => ({ x: BX + c * CELL + CELL / 2, y: BY + r * CELL + CELL / 2 });
  const rnd = (n) => Math.floor(Math.random() * n);
  const modeOf = () => MODES[(G && G.mode) || 'classic'];
  const has = (k) => !!(G.fx[k] || modeOf()[k]);          // ability from a power-up or from the game mode
  const best = (m) => DATA.highs[m] | 0;
  function shade(hex, f) {                          // f < 0 darker, f > 0 lighter
    const n = C(hex), m = f < 0 ? 0 : 255, a = Math.abs(f);
    const ch = (v) => Math.round(v + (m - v) * a);
    return '#' + ((1 << 24) | (ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
  }

  function hsl(h, s2, l) {
    h = ((h % 360) + 360) % 360; s2 /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s2 * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return '#' + ((1 << 24) | (f(0) << 16) | (f(8) << 8) | f(4)).toString(16).slice(1);
  }

  // ---------- Coins, skins and the daily challenge ----------
  const coinText = (n) => (n >= 10000 ? Math.floor(n / 1000) + 'k' : String(n));
  function addCoins(n) {
    n = n | 0;
    if (n <= 0) return;
    DATA.coins = Math.min(MAX_COINS, DATA.coins + n);
    if (G) G.coins = (G.coins | 0) + n;
  }
  const skinOwned = (id) => DATA.skins.indexOf(id) >= 0;
  const activeSkin = () => SKIN_BY_ID[DATA.skin] || SKINS[0];
  function selectSkin(id) {
    if (!SKIN_BY_ID[id] || !skinOwned(id)) return false;        // a locked skin can never be selected
    DATA.skin = id;
    writeData();
    return true;
  }
  function buySkin(id) {
    const sk = SKIN_BY_ID[id];
    if (!sk || skinOwned(id) || DATA.coins < sk.cost) return false;
    DATA.coins -= sk.cost;
    DATA.skins.push(id);
    DATA.skin = id;
    writeData();
    sfx.coin();
    return true;
  }

  // Makes sure DATA.daily is today's challenge (also after midnight or when the clock changes).
  function dailyEnsure(force) {
    const now = Date.now();
    if (!force && DATA.daily && now - dailyCheck < 4000) return DATA.daily;
    dailyCheck = now;
    const today = dateKey(new Date());
    if (!DATA.daily || DATA.daily.date !== today) {
      DATA.daily = makeDaily(today);
      if (DATA.claimedDates.indexOf(today) >= 0) {              // already rewarded for this date (e.g. clock moved back)
        DATA.daily.claimed = true;
        DATA.daily.progress = DATA.daily.target;
      }
      writeData();
    }
    return DATA.daily;
  }
  function dailyText() {
    const d = dailyEnsure();
    return DAILY_BY_ID[d.id].text(d.target);
  }
  // kind: the objective id. add: progress is added up; max: progress keeps the best value.
  function dailyAdd(id, n) { dailyUpdate(id, n, false); }
  function dailyMax(id, v) { dailyUpdate(id, v, true); }
  function dailyUpdate(id, v, isMax) {
    const d = dailyEnsure();
    if (d.id !== id || d.claimed) return;
    if (id === 'ultimate' && (!G || G.mode !== 'ultimate')) return;
    d.progress = Math.min(d.target, isMax ? Math.max(d.progress, v) : d.progress + v);
    if (d.progress >= d.target) claimDaily();
  }
  // The reward is paid at most once per date: the flag and the date list are saved before anything else happens.
  function claimDaily() {
    const d = DATA.daily;
    if (!d || d.claimed || d.progress < d.target || DATA.claimedDates.indexOf(d.date) >= 0) return;
    d.claimed = true;
    DATA.claimedDates.push(d.date);
    if (DATA.claimedDates.length > 120) DATA.claimedDates.shift();
    DATA.streak = DATA.lastClaim && addDays(DATA.lastClaim, 1) === d.date ? DATA.streak + 1 : 1;
    DATA.lastClaim = d.date;
    const bonus = Math.min(DATA.streak - 1, STREAK_MAX) * STREAK_BONUS, total = d.reward + bonus;
    addCoins(total);
    if (G) G.dailyCoins = (G.dailyCoins | 0) + total;
    writeData();
    showBanner('DAILY DONE!  +' + total + ' coins', DATA.streak > 1 ? DATA.streak + ' day streak' : 'Challenge complete', '#facc15', 2200);
    if (G) { const h = cellXY(G.snake[0][0], G.snake[0][1]); burst(h.x, h.y, 'rand', 16); }
    sfx.win();
    buzz(40);
  }

  // ---------- Short effects (kept small and cheap for low-end phones) ----------
  const MAX_FX = 48;
  const CONFETTI = ['#f87171', '#fbbf24', '#4ade80', '#38bdf8', '#c084fc', '#f472b6'];
  function burst(x, y, color, n) {
    for (let i = 0; i < n && fxs.length < MAX_FX; i++) {
      const a = Math.random() * 6.283, v = 0.05 + Math.random() * 0.08;
      fxs.push({ k: 0, x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 2 + Math.random() * 2, color: color === 'rand' ? CONFETTI[rnd(CONFETTI.length)] : color, life: 420, max: 420 });
    }
  }
  // Little puffs behind the tail: skin trails (rainbow, fire, sparkle) and a sparkle while a combo is running.
  function trailPuff() {
    const sk = activeSkin(), t = G.snake[G.snake.length - 1];
    let color = null;
    if (sk.trail === 'rainbow') color = hsl(anim * 0.35, 90, 60);
    else if (sk.trail === 'fire') color = Math.random() < 0.5 ? '#f97316' : '#fbbf24';
    else if (sk.trail === 'sparkle') color = Math.random() < 0.5 ? '#fde68a' : '#ffffff';
    else if (G.combo >= 3) color = th().accent;
    if (!color || fxs.length >= MAX_FX - 8) return;
    const p = cellXY(t[0], t[1]);
    fxs.push({ k: 0, x: p.x + (Math.random() - 0.5) * 6, y: p.y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02, r: 3.2, color: color, life: 520, max: 520 });
  }
  function ring(x, y, color) {
    if (fxs.length < MAX_FX) fxs.push({ k: 1, x: x, y: y, vx: 0, vy: 0, r: 14, color: color, life: 380, max: 380 });
  }
  function showBanner(s, sub, color, ms) { banner = { s: s, sub: sub || '', color: color, life: ms || 1100, max: ms || 1100 }; }

  // ---------- Sound + vibration ----------
  let actx = null, master = null, unlocked = false;
  // The browser only allows sound after a tap/key, so audio starts on the first touch.
  function audio() {
    if (!unlocked) return null;
    try {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        master = actx.createGain();
        master.gain.value = 0.9;
        master.connect(actx.destination);
      }
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function unlockAudio() { if (!unlocked) { unlocked = true; audio(); } }
  // One note: frequency (Hz), length (s), wave, volume, delay (s), optional glide target (Hz).
  function tone(freq, dur, type, vol, delay, slide) {
    if (!DATA.sound) return;
    const c = audio();
    if (!c) return;
    try {
      const o = c.createOscillator(), gn = c.createGain(), t = c.currentTime + (delay || 0);
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn); gn.connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* no audio */ }
  }
  function noise(dur, vol) {
    if (!DATA.sound) return;
    const c = audio();
    if (!c) return;
    try {
      const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource(), gn = c.createGain();
      src.buffer = buf; gn.gain.value = vol;
      src.connect(gn); gn.connect(master);
      src.start();
    } catch (e) { /* no audio */ }
  }
  // Cute sound effects
  const sfx = {
    click: () => tone(540, 0.05, 'triangle', 0.12),
    eat: (combo) => { const f = 460 + Math.min(combo, 10) * 40; tone(f, 0.1, 'sine', 0.3, 0, f * 1.7); },       // "pop"
    yum: () => { tone(660, 0.1, 'triangle', 0.25); tone(880, 0.16, 'triangle', 0.25, 0.08); },
    gold: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.15, 'triangle', 0.25, i * 0.07)),
    combo: (n) => { tone(520 + n * 35, 0.1, 'triangle', 0.22); tone(780 + n * 35, 0.14, 'triangle', 0.22, 0.09); },
    power: () => tone(380, 0.25, 'square', 0.14, 0, 1000),
    coin: () => { tone(988, 0.08, 'square', 0.12); tone(1319, 0.22, 'square', 0.12, 0.07); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.25, i * 0.1)),
    over: () => tone(440, 0.55, 'triangle', 0.28, 0, 160),
    boom: () => { noise(0.5, 0.4); tone(130, 0.5, 'sawtooth', 0.28, 0, 40); },
    near: () => tone(300, 0.14, 'square', 0.12, 0, 750),
    err: () => { tone(230, 0.13, 'square', 0.14); tone(170, 0.2, 'square', 0.14, 0.1); },
    revive: () => [440, 660, 880].forEach((f, i) => tone(f, 0.18, 'triangle', 0.25, i * 0.09))
  };
  // Happy background tune (pentatonic, so every note fits). Notes are scheduled a little ahead of time
  // from the game loop - there are no timers, so nothing keeps playing after a pause, game over or Home.
  const TUNE = [
    [0, 4, 7, 9, 7, 4, 7, 4, 2, 5, 9, 12, 9, 5, 9, 5],
    [0, 4, 7, 12, 9, 7, 4, 7, 5, 9, 12, 9, 7, 4, 2, 4],
    [4, 7, 9, 7, 4, 2, 4, 0, 5, 9, 7, 5, 4, 2, 0, 2],
    [0, 7, 4, 7, 9, 7, 12, 9, 7, 4, 7, 2, 4, 0, 4, 7]
  ];
  const BASS = [0, -3, -7, -5];
  const MUSIC_STEP = 0.19;
  let musicNext = 0, musicStep = 0;
  function musicTick() {
    if (!DATA.sound || !unlocked || (state !== 'play' && state !== 'menu')) { musicNext = 0; return; }
    const c = audio();
    if (!c || c.state !== 'running') return;
    const now = c.currentTime;
    if (musicNext < now) musicNext = now + 0.05;
    while (musicNext < now + 0.3) {
      const i = musicStep & 15, bar = (musicStep >> 4) % TUNE.length, d = musicNext - now, vol = state === 'menu' ? 0.06 : 0.08;
      tone(261.63 * Math.pow(2, TUNE[bar][i] / 12), 0.24, 'triangle', vol, d);
      if (i % 4 === 0) tone(130.81 * Math.pow(2, BASS[i >> 2] / 12), 0.6, 'sine', vol * 1.3, d);
      musicStep++; musicNext += MUSIC_STEP;
    }
  }

  function buzz(ms) {
    try { if (DATA.sound && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
  }

  // ---------- Drawing helpers ----------
  function dot(x, y, r, color, alpha) {
    g.fillStyle(C(color), alpha === undefined ? 1 : alpha);
    g.fillCircle(x, y, r);
  }
  function line(x1, y1, x2, y2, color, width) {
    g.lineStyle(width, C(color), 1);
    g.lineBetween(x1, y1, x2, y2);
  }
  function rrect(x, y, w, h, r, color, alpha) {
    g.fillStyle(C(color), alpha === undefined ? 1 : alpha);
    g.fillRoundedRect(x, y, w, h, r);
  }
  // Text objects are pooled and reused every frame.
  function txt(x, y, s, size, color, originX, bold) {
    let t = L.texts[L.n];
    if (!t) {
      t = scene.add.text(0, 0, '', { fontFamily: FONT });
      t.setScale(1 / ZOOM);            // text is rendered at ZOOM x size, then scaled down, so it stays sharp
      t.setDepth(L.depth + 1);
      L.texts.push(t);
    }
    L.n++;
    const key = s + '|' + size + '|' + color + '|' + (bold === false ? 0 : 1);
    if (t._key !== key) {
      t.setStyle({ fontFamily: FONT, fontSize: (size * ZOOM) + 'px', color: color, fontStyle: bold === false ? '500' : '700' });
      t.setText(s);
      t._key = key;
    }
    t.setOrigin(originX === undefined ? 0.5 : originX, 0.5);
    t.setPosition(x, y);
    t.setVisible(true);
  }
  function button(cx, cy, w, h, label, fn, opts) {
    const t = th(), o = opts || {};
    let fill = o.primary ? t.accent : t.panel;
    let labelColor = o.primary ? '#1b1b1b' : t.btnText;
    if (o.disabled) { fill = t.board2; labelColor = t.panel; }
    if (o.dark) { fill = t.bg; labelColor = t.text; }
    const r = Math.min(20, h / 2);
    if (o.primary) rrect(cx - w / 2, cy - h / 2 + 5, w, h, r, shade(fill, -0.3));   // 3D base
    rrect(cx - w / 2, cy - h / 2, w, h, r, fill);
    txt(cx, cy, label, o.size || 18, labelColor);
    if (!o.disabled && fn) buttons.push({ x: cx - w / 2, y: cy - h / 2, w: w, h: h, fn: fn });
  }

  function useLayer(i) { L = layers[i]; g = L.g; }

  // ---------- Fruits ----------
  function drawFruit(kind, x, y, s) {
    const d = (dx, dy, r, col) => dot(x + dx * s, y - dy * s, r * s, col);
    const l = (x1, y1, x2, y2, col, w) => line(x + x1 * s, y - y1 * s, x + x2 * s, y - y2 * s, col, w * s);
    if (kind === 'apple') {
      l(0, 6, 2, 12, '#7a4a21', 2);
      d(5, 11, 3, '#4caf50');
      d(0, 0, 9, '#e53935');
      d(-4, 4, 2.5, '#ff8a80');
    } else if (kind === 'orange') {
      d(0, 0, 9, '#ff9a1f');
      d(-4, 4, 2.5, '#ffd08a');
      d(1, 9, 3, '#3fa34d');
    } else if (kind === 'cherry') {
      l(1, 11, -5, -2, '#3fa34d', 2);
      l(1, 11, 5, -3, '#3fa34d', 2);
      d(-5, -4, 5.5, '#c2185b');
      d(5, -5, 5.5, '#d81b60');
      d(-7, -2, 1.5, '#ff9ec4');
      d(3, -3, 1.5, '#ff9ec4');
    } else if (kind === 'grapes') {
      l(0, 6, 1, 12, '#7a4a21', 2);
      d(4, 10, 2.5, '#4caf50');
      [[-5, 4], [0, 4], [5, 4], [-2.5, -1], [2.5, -1], [0, -6]].forEach((p) => {
        d(p[0], p[1], 4, '#8e44ad');
        d(p[0] - 1, p[1] + 1, 1.25, '#d7a8f0');
      });
    } else { // strawberry
      d(0, 2, 8, '#ef233c');
      d(0, -4, 5.5, '#ef233c');
      [[-3, 3], [3, 2], [0, -1], [-2, -5], [3, -4]].forEach((p) => d(p[0], p[1], 1, '#ffe066'));
      [[-4, 8], [0, 9.5], [4, 8]].forEach((p) => d(p[0], p[1], 3, '#3fa34d'));
    }
  }

  function drawCoin(x, y, r) {
    dot(x, y, r, '#b45309');
    dot(x, y, r * 0.84, '#fbbf24');
    dot(x - r * 0.2, y - r * 0.2, r * 0.3, '#fde68a');
  }
  // Golden fruit: a shiny gold apple with a pulsing glow and a shrinking timer ring.
  function drawGolden(x, y, s, frac) {
    const a = anim / 60;
    dot(x, y, (21 + 3 * Math.sin(a * 0.7)) * s, '#fde047', 0.28);
    line(x, y - 8 * s, x + 3 * s, y - 14 * s, '#7a4a21', 2 * s);
    dot(x + 5 * s, y - 12 * s, 3 * s, '#facc15');
    dot(x, y, 10 * s, '#d97706');
    dot(x, y, 9 * s, '#fbbf24');
    dot(x - 3.5 * s, y - 3.5 * s, 3 * s, '#fff3b0');
    const tw = Math.sin(a * 1.3) > 0.4;                                  // little twinkle
    if (tw) { line(x + 11 * s, y - 6 * s, x + 15 * s, y - 6 * s, '#ffffff', 1.6 * s); line(x + 13 * s, y - 8 * s, x + 13 * s, y - 4 * s, '#ffffff', 1.6 * s); }
    if (frac < 1) {                                                      // time left
      g.lineStyle(2.5, C('#fde047'), 1);
      g.beginPath(); g.arc(x, y, 14 * s, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.max(0.02, frac)); g.strokePath();
    }
  }

  // ---------- Ability icons ----------
  function drawPower(kind, x, y, s) {
    const col = POWERS[kind].color;
    dot(x, y, 12 * s, '#ffffff');
    dot(x, y, 10.5 * s, col);
    if (kind === 'slow') {                       // clock
      dot(x, y, 6.5 * s, '#ffffff');
      line(x, y, x, y - 4.5 * s, '#1f2937', 2 * s);
      line(x, y, x + 3.5 * s, y, '#1f2937', 2 * s);
    } else if (kind === 'ghost') {
      dot(x, y - 2 * s, 5.6 * s, '#ffffff');
      g.fillStyle(0xffffff, 1);
      g.fillRect(x - 5.6 * s, y - 2 * s, 11.2 * s, 5 * s);
      [-3.7, 0, 3.7].forEach((dx) => dot(x + dx * s, y + 3 * s, 1.9 * s, '#ffffff'));
      dot(x - 2.2 * s, y - 2 * s, 1.4 * s, '#1f2937');
      dot(x + 2.2 * s, y - 2 * s, 1.4 * s, '#1f2937');
    } else if (kind === 'magnet') {              // U-shaped magnet
      line(x - 4.5 * s, y - 5.5 * s, x - 4.5 * s, y + 4.5 * s, '#ffffff', 3.4 * s);
      line(x + 4.5 * s, y - 5.5 * s, x + 4.5 * s, y + 4.5 * s, '#ffffff', 3.4 * s);
      line(x - 6.2 * s, y + 4 * s, x + 6.2 * s, y + 4 * s, '#ffffff', 3.4 * s);
    } else if (kind === 'wall') {                // portal
      dot(x, y, 7 * s, '#ffffff');
      dot(x, y, 4.8 * s, col);
      dot(x, y, 2.2 * s, '#ffffff');
    } else {                                     // double points
      txt(x, y, 'x2', Math.round(10 * s), '#ffffff');
    }
  }

  // ---------- Bomb ----------
  function drawBomb(x, y, s) {
    const a = anim / 60;
    dot(x, y + 1, 13 * s, '#ef4444', 0.18 + 0.12 * Math.sin(a * 0.35));   // warning glow
    line(x + 4 * s, y - 6 * s, x + 8 * s, y - 11 * s, '#a16207', 2.2 * s);  // fuse
    dot(x, y + 1, 8.5 * s, '#1f2937');
    dot(x - 2.8 * s, y - 1.8 * s, 2.4 * s, '#6b7280');
    rrect(x + 1.5 * s, y - 8.5 * s, 5 * s, 4 * s, 1 * s, '#374151');
    const flick = Math.sin(a * 1.7) > 0;
    dot(x + 8.5 * s, y - 11.5 * s, (flick ? 3.2 : 2.4) * s, flick ? '#fbbf24' : '#f97316');
  }
  function drawBoom(x, y) {
    for (let i = 0; i < 10; i++) {
      const ang = i * Math.PI / 5, r = 26;
      dot(x + Math.cos(ang) * r, y + Math.sin(ang) * r, 8, i % 2 ? '#f97316' : '#fbbf24');
    }
    dot(x, y, 22, '#f97316');
    dot(x, y, 14, '#fde68a');
  }

  // ---------- Snake ----------
  // Colour of body segment i (0 = head) for a skin. The default skin follows the theme.
  function segColor(sk, i, n) {
    const t = th();
    if (sk.id === 'default') return i % 2 ? t.a : t.b;
    if (sk.pattern === 'rainbow') return hsl(i * 30 + anim * 0.05, 85, 56);
    if (sk.pattern === 'shimmer' && Math.floor(anim / 70) % (n + 8) === i) return '#ffffff';
    return i % 2 ? sk.a : sk.b;
  }
  function drawSnake(pts, dir, ringColor, skin) {
    const t = th(), n = pts.length, sk = skin || activeSkin();
    const lineCol = sk.id === 'default' ? t.b : sk.line, headCol = sk.id === 'default' ? t.head : sk.head;
    // body line, so the snake looks like one continuous shape
    g.lineStyle(15, C(lineCol), 1);
    g.beginPath();
    g.moveTo(pts[n - 1].x, pts[n - 1].y);
    for (let i = n - 2; i >= 0; i--) {
      const far = Math.abs(pts[i].x - pts[i + 1].x) + Math.abs(pts[i].y - pts[i + 1].y) > CELL * 1.7;
      if (far) g.moveTo(pts[i].x, pts[i].y);     // wrapped through a wall
      else g.lineTo(pts[i].x, pts[i].y);
    }
    g.strokePath();
    // tail gets thinner
    for (let i = n - 1; i >= 1; i--) {
      const fromTail = n - 1 - i;
      const r = fromTail < 3 ? [6, 7.5, 9][fromTail] : 10.5;
      dot(pts[i].x, pts[i].y, r, segColor(sk, i, n));
      if (sk.pattern === 'stars' && i % 3 === 0) dot(pts[i].x + 2, pts[i].y - 2, 1.8, '#ffffff');
    }
    drawHead(sk, pts[0].x, pts[0].y, dir[0], dir[1], 1, headCol, ringColor);
  }
  // Cute head: big shiny eyes, rosy cheeks, and the animal extras of a skin. k = size (1 in the game).
  function drawHead(sk, hx, hy, dx, dy, k, headCol, ringColor) {
    const px = -dy, py = dx, an = sk.animal;
    const at = (f, sd) => ({ x: hx + f[0] * k * dx + f[1] * k * px * sd, y: hy + f[0] * k * dy + f[1] * k * py * sd });
    if (an !== 'unicorn') line(hx + 10 * k * dx, hy + 10 * k * dy, hx + 19 * k * dx, hy + 19 * k * dy, '#ff4d6d', 3 * k);   // tongue
    if (an === 'panda') [1, -1].forEach((sd) => { const e = at([-5, 10], sd); dot(e.x, e.y, 5.2 * k, '#1f2937'); });             // ears
    if (an === 'dragon') [1, -1].forEach((sd) => { const a1 = at([-2, 8], sd), a2 = at([-11, 13], sd); line(a1.x, a1.y, a2.x, a2.y, '#f59e0b', 4.2 * k); });   // horns
    if (ringColor) dot(hx, hy, 16 * k, ringColor);
    dot(hx, hy, 12.5 * k, headCol);
    if (an === 'panda') [1, -1].forEach((sd) => { const e = at([4.5, 6.2], sd); dot(e.x, e.y, 5.9 * k, '#1f2937'); });         // eye patches
    if (an === 'unicorn') {                                                                                                     // horn + mane
      line(hx + 7 * k * dx, hy + 7 * k * dy, hx + 18 * k * dx, hy + 18 * k * dy, '#fcd34d', 4.6 * k);
      line(hx + 12 * k * dx, hy + 12 * k * dy, hx + 18 * k * dx, hy + 18 * k * dy, '#f59e0b', 2.4 * k);
      const m = at([-6, 0], 1); dot(m.x, m.y, 3.6 * k, '#f472b6');
    }
    [1, -1].forEach((sd) => {
      const e = at([4.5, 6.2], sd), c = at([1, 10], sd);
      if (an !== 'panda') dot(c.x, c.y, 2.3 * k, '#ff8fab', 0.7);                                                              // cheek
      dot(e.x, e.y, 4.9 * k, '#ffffff');
      dot(e.x + 1.7 * k * dx, e.y + 1.7 * k * dy, 2.6 * k, '#111111');
      dot(e.x + 0.4 * k * dx - 0.9 * k * px * sd, e.y + 0.4 * k * dy - 0.9 * k * py * sd, 1 * k, '#ffffff');                     // shine
    });
  }
  // Small horizontal snake used to preview a skin (head on the right).
  function miniSnake(sk, cx, cy) {
    const t = th(), n = 5, lineCol = sk.id === 'default' ? t.b : sk.line, headCol = sk.id === 'default' ? t.head : sk.head;
    line(cx - 22, cy, cx + 18, cy, lineCol, 11);
    for (let i = n - 1; i >= 1; i--) dot(cx + 18 - i * 10, cy, i === n - 1 ? 4.5 : 7, segColor(sk, i, n));
    drawHead(sk, cx + 18, cy, 1, 0, 0.72, headCol, null);
  }

  function snakePoints() {
    const delay = stepDelay();
    const k = state === 'play' ? Math.min(1, acc / delay) : 1;
    return G.snake.map((cur, i) => {
      const prev = (prevSnake && prevSnake[i]) || cur;
      const jump = Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]) > 1;
      const c = jump ? cur[0] : prev[0] + (cur[0] - prev[0]) * k;
      const r = jump ? cur[1] : prev[1] + (cur[1] - prev[1]) * k;
      return cellXY(c, r);
    });
  }

  // ---------- Screens ----------
  // Theme and background pickers (used in the menu and in the pause screen).
  function themePicker(cy, sp, r) {
    const t = th();
    THEMES.forEach((theme, i) => {
      const x = W / 2 + (i - 2) * sp;
      if (i === DATA.theme) dot(x, cy, r + 5, t.accent);
      dot(x, cy, r, theme.board1);
      dot(x, cy, r * 0.45, theme.a);
      buttons.push({ x: x - sp / 2, y: cy - r - 8, w: sp, h: 2 * r + 16, fn: () => setTheme(i) });
    });
  }
  function bgPicker(cy, sp, size) {
    const t = th();
    BACKGROUNDS.forEach((name, i) => {
      const x = W / 2 + (i - 2) * sp - size / 2, y = cy - size / 2;
      if (i === DATA.bg) rrect(x - 5, y - 5, size + 10, size + 10, 10, t.accent);
      rrect(x - 1, y - 1, size + 2, size + 2, 6, t.bg);
      g.fillStyle(C(t.board1), 1);
      g.fillRect(x, y, size, size);
      drawPattern(g, i, x, y, 4, 4, size / 4);
      buttons.push({ x: x - (sp - size) / 2, y: y - 8, w: sp, h: size + 16, fn: () => setBackground(i) });
    });
  }

  // ---------- Home screen ----------
  function demoReset() {
    demo = { snake: [[9, 5], [8, 5], [7, 5], [6, 5], [5, 5], [4, 5], [3, 5], [2, 5]], dir: [1, 0], prev: null, acc: 0, food: [14, 3], kind: 0 };
  }
  function demoStep() {
    const d = demo, h = d.snake[0];
    const wrap = (c, r) => [(c + DEMO.cols) % DEMO.cols, (r + DEMO.rows) % DEMO.rows];
    const dist = (p, q) => {
      const dx = Math.abs(p[0] - q[0]), dy = Math.abs(p[1] - q[1]);
      return Math.min(dx, DEMO.cols - dx) + Math.min(dy, DEMO.rows - dy);
    };
    let pick = null, bestD = 1e9;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((o) => {
      if (o[0] === -d.dir[0] && o[1] === -d.dir[1]) return;
      const n = wrap(h[0] + o[0], h[1] + o[1]);
      if (d.snake.slice(0, -1).some((p) => p[0] === n[0] && p[1] === n[1])) return;
      const v = dist(n, d.food) + Math.random() * 0.9;
      if (v < bestD) { bestD = v; pick = o; }
    });
    if (!pick) { demoReset(); return; }
    d.prev = d.snake.map((p) => [p[0], p[1]]);
    d.dir = pick;
    const n = wrap(h[0] + pick[0], h[1] + pick[1]);
    d.snake.unshift(n);
    if (n[0] === d.food[0] && n[1] === d.food[1]) {
      if (d.snake.length > 15) d.snake.pop();
      d.kind = (d.kind + 1) % FRUITS.length;
      do { d.food = [rnd(DEMO.cols), rnd(DEMO.rows)]; } while (d.snake.some((p) => p[0] === d.food[0] && p[1] === d.food[1]));
    } else {
      d.snake.pop();
    }
  }
  function demoXY(c, r) { return { x: DEMO.x0 + (c + 0.5) * CELL, y: DEMO.y0 + (r + 0.5) * CELL }; }

  function drawDemo() {
    const t = th(), d = demo, k = Math.min(1, d.acc / DEMO.ms);
    const w = DEMO.cols * CELL, h = DEMO.rows * CELL;
    rrect(DEMO.x0 - 7, DEMO.y0 - 7, w + 14, h + 14, 28, t.panel);
    rrect(DEMO.x0, DEMO.y0, w, h, 22, t.board1);
    drawPattern(g, DATA.bg, DEMO.x0, DEMO.y0, DEMO.cols, DEMO.rows, CELL);
    const f = demoXY(d.food[0], d.food[1]);
    drawFruit(FRUITS[d.kind], f.x, f.y + 1.5 * Math.sin(anim / 150), 1.15);
    const pts = d.snake.map((cur, i) => {
      const prev = (d.prev && d.prev[i]) || cur;
      const jump = Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]) > 1;
      return jump ? demoXY(cur[0], cur[1]) : demoXY(prev[0] + (cur[0] - prev[0]) * k, prev[1] + (cur[1] - prev[1]) * k);
    });
    drawSnake(pts, d.dir, null);
  }

  // small icons for the home screen buttons
  function drawIcon(kind, x, y) {
    const t = th(), c = t.btnText;
    if (kind === 'modes') {
      [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach((p, i) => rrect(x + p[0] - 5.5, y + p[1] - 5.5, 11, 11, 3, i === 0 ? t.accent : c));
    } else if (kind === 'themes') {
      dot(x, y, 14, c);
      [t.accent, t.a, t.head].forEach((col, i) => {
        const ang = -Math.PI / 2 + i * 2.1;
        dot(x + Math.cos(ang) * 7, y + Math.sin(ang) * 7, 3.6, col);
      });
      dot(x + 5, y + 6, 3, t.panel);
    } else if (kind === 'background') {
      rrect(x - 13, y - 13, 26, 26, 6, c);
      rrect(x - 10, y - 10, 20, 20, 4, t.panel);
      [-3.5, 3.5].forEach((o) => {
        line(x + o, y - 10, x + o, y + 10, c, 1.6);
        line(x - 10, y + o, x + 10, y + o, c, 1.6);
      });
    } else if (kind === 'sound') {
      rrect(x - 11, y - 5, 7, 10, 2, c);
      g.fillStyle(C(c), 1);
      g.fillTriangle(x - 6, y - 5, x + 2, y - 11, x + 2, y + 11);
      g.fillTriangle(x - 6, y - 5, x - 6, y + 5, x + 2, y + 11);
      if (DATA.sound) {
        g.lineStyle(2.4, C(c), 1);
        g.beginPath(); g.arc(x + 2, y, 7, -0.8, 0.8); g.strokePath();
        g.beginPath(); g.arc(x + 2, y, 12, -0.8, 0.8); g.strokePath();
      } else {
        line(x + 6, y - 6, x + 14, y + 6, '#ef4444', 2.6);
        line(x + 14, y - 6, x + 6, y + 6, '#ef4444', 2.6);
      }
    } else if (kind === 'skins') {
      [-9, -1, 7].forEach((o, i) => dot(x + o, y + 5 - i * 5, 5, i === 2 ? t.accent : c));
      dot(x + 9, y - 6, 2, '#111111');
    } else if (kind === 'gifts') {
      rrect(x - 12, y - 4, 24, 16, 3, c);
      rrect(x - 14, y - 10, 28, 8, 3, c);
      rrect(x - 3, y - 10, 6, 22, 1, t.accent);
      dot(x - 6, y - 14, 4, t.accent); dot(x + 6, y - 14, 4, t.accent);
    } else if (kind === 'star') {
      g.fillStyle(C(t.accent), 1);
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4 : 9, ang = -Math.PI / 2 + i * Math.PI / 5;
        pts.push({ x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r });
      }
      g.fillPoints(pts, true);
    }
  }
  function roundButton(x, y, kind, label, fn, badge) {
    const t = th();
    dot(x, y + 4, 31, shade(t.panel, -0.3));
    dot(x, y, 31, t.panel);
    drawIcon(kind, x, y);
    if (label) txt(x, y + 47, label, 13, t.text, 0.5, false);
    if (badge) { dot(x + 22, y - 22, 9, '#ef4444'); txt(x + 22, y - 22, '!', 12, '#ffffff'); }       // something new to collect
    buttons.push({ x: x - 44, y: y - 36, w: 88, h: label ? 100 : 72, fn: fn });
  }
  function openSheet(tab) { DATA.tab = tab; sheetOpen = true; skinPick = null; skinErr = null; }

  // Daily challenge card on the home screen: objective, progress and reward.
  function drawDailyCard(cy) {
    const t = th(), d = dailyEnsure(), type = DAILY_BY_ID[d.id], w = 440, h = 56, x = W / 2 - w / 2;
    const frac = Math.min(1, d.progress / d.target);
    rrect(x, cy - h / 2, w, h, 16, t.panel, 0.9);
    if (d.claimed) {
      dot(x + 28, cy, 14, '#22c55e');
      line(x + 21, cy, x + 26, cy + 5, '#ffffff', 3.4); line(x + 26, cy + 5, x + 35, cy - 5, '#ffffff', 3.4);
      txt(x + 52, cy - 12, 'Daily done: ' + type.text(d.target), 14, t.text, 0);
      txt(x + 52, cy + 12, 'New challenge tomorrow' + (DATA.streak > 1 ? '  -  ' + DATA.streak + ' day streak' : ''), 11, t.text, 0, false);
      return;
    }
    dot(x + 28, cy, 14, t.accent);
    txt(x + 28, cy + 1, '!', 20, '#1b1b1b');
    txt(x + 52, cy - 14, type.text(d.target), 14, t.text, 0);
    txt(x + 52, cy + 3, type.sub, 10, t.text, 0, false);
    rrect(x + 52, cy + 14, 250, 8, 4, t.bg);
    if (frac > 0) rrect(x + 52, cy + 14, Math.max(8, 250 * frac), 8, 4, t.accent);
    txt(x + 312, cy + 18, d.progress + '/' + d.target, 11, t.text, 0, false);
    drawCoin(x + w - 66, cy, 11);
    txt(x + w - 48, cy, '+' + d.reward, 16, t.accent, 0);
  }

  function drawMenu() {
    const t = th();
    // top bar: best score + coins + sound
    rrect(BX, 18, 104 + String(best(DATA.mode)).length * 11, 42, 21, t.panel, 0.7);
    drawIcon('star', BX + 24, 39);
    txt(BX + 42, 39, 'Best  ' + best(DATA.mode), 16, t.text, 0);
    const cw = 52 + coinText(DATA.coins).length * 11;
    rrect(W - BX - 62 - cw, 18, cw, 42, 21, t.panel, 0.7);
    drawCoin(W - BX - 62 - cw + 24, 39, 11);
    txt(W - BX - 62 - cw + 42, 39, coinText(DATA.coins), 16, t.accent, 0);
    dot(W - BX - 24, 39, 22, t.panel, 0.7);
    drawIcon('sound', W - BX - 26, 39);
    buttons.push({ x: W - BX - 54, y: 12, w: 58, h: 56, fn: toggleSound });

    // live preview of the game
    drawDemo();

    // logo
    txt(W / 2, 386, 'Snake', 92, shade(t.accent, -0.45));
    txt(W / 2, 380, 'Snake', 92, t.accent);
    txt(W / 2, 436, 'Fruit Rush', 24, t.text);

    drawDailyCard(484);

    // play
    const pw = 300, ph = 72, py = 568;
    rrect(W / 2 - pw / 2, py - ph / 2 + 7, pw, ph, 36, shade(t.accent, -0.35));
    rrect(W / 2 - pw / 2, py - ph / 2, pw, ph, 36, t.accent);
    g.fillStyle(0x1b1b1b, 1);
    g.fillTriangle(W / 2 - 52, py - 15, W / 2 - 52, py + 15, W / 2 - 26, py);
    txt(W / 2 + 18, py - 1, 'Play', 34, '#1b1b1b');
    buttons.push({ x: W / 2 - pw / 2, y: py - ph / 2, w: pw, h: ph + 7, fn: newGame });

    // current mode (opens the mode picker)
    const label = MODES[DATA.mode].name + ' mode' + (DATA.mode === 'ultimate' ? ', speed ' + DATA.speed : '');
    txt(W / 2 - 8, 631, label, 16, t.text, 0.5, false);
    const lx = W / 2 + 8 + label.length * 4.2;
    line(lx - 5, 628, lx, 633, t.text, 2.2);
    line(lx, 633, lx + 5, 628, t.text, 2.2);
    buttons.push({ x: W / 2 - 150, y: 613, w: 300, h: 36, fn: () => openSheet(0) });

    // continue a saved game
    if (DATA.save) {
      button(W / 2, 672, 250, 40, 'Continue ' + MODES[DATA.save.mode || 'classic'].name.toLowerCase() + ' game', continueGame, { size: 15 });
    }

    roundButton(W / 2 - 176, 738, 'modes', 'Modes', () => openSheet(0));
    roundButton(W / 2 - 88, 738, 'themes', 'Themes', () => openSheet(1));
    roundButton(W / 2, 738, 'background', 'Background', () => openSheet(2));
    roundButton(W / 2 + 88, 738, 'skins', 'Skins', () => openSheet(3));
    roundButton(W / 2 + 176, 738, 'gifts', 'Gifts', () => openSheet(4), !spinReady() ? 0 : 1);
  }

  // Skin picker: tap a skin to look at it, then Equip or Unlock.
  let skinPick = null;
  let skinErr = null;                                  // {s, until}: short error message in the skin tab
  function skinError(msg) { skinErr = { s: msg, until: anim + 2600 }; sfx.err(); buzz(40); }
  // Closing the sheet while a locked skin is picked is an error: say so and go back to the skin in use.
  function closeSheet() {
    if (DATA.tab === 3 && skinPick && SKIN_BY_ID[skinPick] && !skinOwned(skinPick)) {
      skinPick = DATA.skin;
      skinError('Skin is locked! Back to ' + activeSkin().name + '.');
      return;
    }
    sheetOpen = false;
  }
  function drawSkinTab(top) {
    const t = th(), cw = 104, ch = 74, gap = 6;
    if (!skinPick || !SKIN_BY_ID[skinPick]) skinPick = DATA.skin;
    if (skinErr && anim < skinErr.until) {
      txt(W / 2, top + 96, skinErr.s, 15, '#f87171');
    } else {
      const ct = coinText(DATA.coins) + ' coins', ox = String(ct).length * 4;
      drawCoin(W / 2 - ox - 12, top + 96, 10);
      txt(W / 2 - ox + 2, top + 96, ct, 15, t.accent, 0);
    }
    SKINS.forEach((sk, i) => {
      const cx = W / 2 + ((i % 4) - 1.5) * (cw + gap), cy = top + 148 + Math.floor(i / 4) * (ch + gap), ct = cy - ch / 2;
      const owned = skinOwned(sk.id), sel = skinPick === sk.id;
      if (sel) rrect(cx - cw / 2 - 3, ct - 3, cw + 6, ch + 6, 16, skinErr && anim < skinErr.until && !owned ? '#f87171' : t.accent);
      rrect(cx - cw / 2, ct, cw, ch, 13, t.panel);
      rrect(cx - cw / 2 + 5, ct + 4, cw - 10, 30, 9, t.board1);
      miniSnake(sk, cx, ct + 19);
      txt(cx, ct + 46, sk.name, 12, t.btnText);
      if (DATA.skin === sk.id) txt(cx, ct + 62, 'Equipped', 10, t.accent);
      else if (owned) txt(cx, ct + 62, 'Owned', 10, t.btnText, 0.5, false);
      else {
        drawCoin(cx - 14, ct + 62, 6);
        txt(cx - 5, ct + 62, String(sk.cost), 11, DATA.coins >= sk.cost ? t.accent : t.btnText, 0);
      }
      buttons.push({ x: cx - cw / 2, y: ct, w: cw, h: ch, fn: () => { skinPick = sk.id; } });
    });
    const sk = SKIN_BY_ID[skinPick], by = top + 384;
    if (DATA.skin === sk.id) button(W / 2, by, 260, 44, 'Equipped', null, { disabled: true, dark: true, size: 17 });
    else if (skinOwned(sk.id)) button(W / 2, by, 260, 44, 'Equip ' + sk.name, () => selectSkin(sk.id), { primary: true, size: 17 });
    else if (DATA.coins >= sk.cost) button(W / 2, by, 260, 44, 'Unlock for ' + sk.cost + ' coins', () => buySkin(sk.id), { primary: true, size: 17 });
    else button(W / 2, by, 260, 44, 'Need ' + (sk.cost - DATA.coins) + ' more coins', () => skinError('Not enough coins for ' + sk.name + '!'), { dark: true, size: 16 });
  }

  // ---------- Gifts: daily spin + mystery egg ----------
  const SPIN_VALUES = [10, 20, 15, 40, 10, 25, 60, 150];       // wedges, clockwise from the top
  const SPIN_WEIGHTS = [20, 16, 18, 10, 20, 12, 3, 1];
  const SPIN_COLORS = ['#f87171', '#fbbf24', '#4ade80', '#38bdf8', '#c084fc', '#f472b6', '#fb923c', '#facc15'];
  const EGG_COST = 100;
  const EGG_COINS = [40, 60, 80, 120, 200, 300], EGG_WEIGHTS = [30, 25, 20, 12, 8, 5];
  const EGG_SKIN_CHANCE = 0.3;
  const GIFT_MS = 1600;
  let gift = null;                                     // {kind, idx, val, skin, t, done} the last spin / egg result
  const pickWeighted = (w) => {
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
    return w.length - 1;
  };
  const giftBusy = () => !!gift && gift.t < GIFT_MS;
  const spinReady = () => DATA.spinDates.indexOf(dateKey(new Date())) < 0;
  // The prize is decided, paid and saved the moment the button is tapped; the animation only shows it.
  function doSpin() {
    if (giftBusy() || !spinReady()) return false;
    const idx = pickWeighted(SPIN_WEIGHTS), val = SPIN_VALUES[idx];
    DATA.spinDates.push(dateKey(new Date()));
    if (DATA.spinDates.length > 60) DATA.spinDates.shift();
    addCoins(val);
    writeData();
    gift = { kind: 'spin', idx: idx, val: val, t: 0, done: false };
    return true;
  }
  function openEgg() {
    if (giftBusy()) return false;
    if (DATA.coins < EGG_COST) { skinError('Need ' + (EGG_COST - DATA.coins) + ' more coins for the egg!'); return false; }
    DATA.coins -= EGG_COST;
    const locked = SKINS.filter((s) => !skinOwned(s.id));
    gift = { kind: 'egg', t: 0, done: false, val: 0, skin: null };
    if (locked.length && Math.random() < EGG_SKIN_CHANCE) {
      gift.skin = locked[rnd(locked.length)].id;
      DATA.skins.push(gift.skin);
      DATA.skin = gift.skin;
    } else {
      gift.val = EGG_COINS[pickWeighted(EGG_WEIGHTS)];
      addCoins(gift.val);
    }
    writeData();
    return true;
  }
  function drawWheel(cx, cy, r, rot) {
    SPIN_VALUES.forEach((v, i) => {
      const a0 = (-90 + rot + i * 45) * Math.PI / 180, a1 = a0 + Math.PI / 4;
      g.fillStyle(C(SPIN_COLORS[i]), 1);
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a1, false); g.closePath(); g.fillPath();
    });
    SPIN_VALUES.forEach((v, i) => {
      const am = (-90 + rot + (i + 0.5) * 45) * Math.PI / 180;
      txt(cx + Math.cos(am) * r * 0.66, cy + Math.sin(am) * r * 0.66, String(v), 10, '#1b1b1b');
    });
    dot(cx, cy, 8, '#ffffff');
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(cx - 8, cy - r - 11, cx + 8, cy - r - 11, cx, cy - r + 3);
  }
  function drawGifts(top) {
    const t = th(), lx = W / 2 - 112, rx = W / 2 + 112, cw = 212, ct = top + 100, chh = 206;
    rrect(lx - cw / 2, ct, cw, chh, 16, t.panel);
    rrect(rx - cw / 2, ct, cw, chh, 16, t.panel);
    const p = gift ? Math.min(1, gift.t / GIFT_MS) : 1, ease = 1 - Math.pow(1 - p, 3);
    // --- daily spin
    txt(lx, ct + 20, 'Daily Spin', 16, t.accent);
    const ready = spinReady(), sp = gift && gift.kind === 'spin';
    drawWheel(lx, ct + 92, 50, sp ? -(gift.idx + 0.5) * 45 + (1 - ease) * 1080 : (ready ? anim / 30 : 0));
    if (ready) button(lx, ct + 176, 176, 40, 'SPIN!', doSpin, { primary: true, size: 18 });
    else button(lx, ct + 176, 176, 40, 'Come back tomorrow', null, { dark: true, disabled: true, size: 13 });
    // --- mystery egg
    txt(rx, ct + 20, 'Mystery Egg', 16, t.accent);
    const eg = gift && gift.kind === 'egg', shake = eg && p < 1 ? Math.sin(gift.t / 35) * 5 * (0.4 + p) : 0;
    if (eg && p >= 1) {                                          // opened: show the prize
      if (gift.skin) miniSnake(SKIN_BY_ID[gift.skin], rx, ct + 92);
      else { drawCoin(rx, ct + 92, 26); }
    } else {
      g.fillStyle(0xfef3c7, 1); g.fillEllipse(rx + shake, ct + 94, 62, 78);
      [[-12, -10, '#f87171'], [10, 6, '#38bdf8'], [-8, 16, '#4ade80'], [8, -20, '#c084fc']].forEach((d) => dot(rx + shake + d[0], ct + 94 + d[1], 6, d[2]));
      dot(rx + shake - 14, ct + 78, 4, '#ffffff', 0.8);
    }
    const afford = DATA.coins >= EGG_COST;
    button(rx, ct + 176, 176, 40, 'Open egg  (' + EGG_COST + ')', openEgg, afford ? { primary: true, size: 16 } : { dark: true, size: 14 });
    // --- result
    if (skinErr && anim < skinErr.until) txt(W / 2, top + 330, skinErr.s, 15, '#f87171');
    else if (gift && gift.done) {
      const msg = gift.kind === 'spin' ? 'You won +' + gift.val + ' coins!' : (gift.skin ? 'New skin: ' + SKIN_BY_ID[gift.skin].name + '!  Equipped' : 'You got +' + gift.val + ' coins!');
      txt(W / 2, top + 330, msg, 18, t.accent);
      for (let i = 0; i < 12; i++) {                              // confetti
        const k = Math.min(1, (gift.t - GIFT_MS) / 1200);
        if (k < 1) dot(W / 2 + Math.sin(i * 7.3) * 190, top + 290 + (i % 4) * 8 + k * 60 * (0.6 + (i % 3) * 0.3), 3.2, CONFETTI[i % 6], 1 - k);
      }
    } else if (gift) txt(W / 2, top + 330, '...', 18, t.text);
    else txt(W / 2, top + 330, 'Free spin every day  -  Egg: coins or a new skin!', 12, t.text, 0.5, false);
  }

  // Settings sheet that slides up over the home screen.
  function drawSheet() {
    const t = th(), e = 1 - Math.pow(1 - sheetT, 3), sh = 500, top = H - sh * e;
    g.fillStyle(0x000000, 0.45 * e);
    g.fillRect(0, 0, W, H);
    rrect(0, top - 3, W, sh + 40, 30, t.panel);
    rrect(0, top, W, sh + 40, 30, t.bg);
    rrect(W / 2 - 24, top + 12, 48, 5, 3, t.panel);
    if (sheetT < 0.98) return;
    buttons = [];                                    // only the sheet reacts to taps now

    // tabs
    const tabs = ['Modes', 'Themes', 'Background', 'Skins', 'Gifts'], tw = BW / 5;
    rrect(BX, top + 32, BW, 46, 23, t.panel);
    tabs.forEach((name, i) => {
      const x = BX + i * tw;
      if (DATA.tab === i) rrect(x + 2, top + 35, tw - 4, 40, 20, t.accent);
      txt(x + tw / 2, top + 55, name, 12, DATA.tab === i ? '#1b1b1b' : t.btnText);
      buttons.push({ x: x, y: top + 32, w: tw, h: 46, fn: () => { if (DATA.tab === 3 && i !== 3) skinPick = DATA.skin; DATA.tab = i; writeData(); } });
    });

    if (DATA.tab === 0) {
      MODE_KEYS.forEach((k, i) => {
        const w = 212, h = 74, cx = W / 2 + (i % 2 ? 110 : -110), cy = top + 142 + Math.floor(i / 2) * 86;
        const sel = DATA.mode === k;
        if (sel) rrect(cx - w / 2 - 4, cy - h / 2 - 4, w + 8, h + 8, 18, t.accent);
        rrect(cx - w / 2, cy - h / 2, w, h, 15, t.panel);
        txt(cx, cy - 17, MODES[k].name, 18, sel ? t.accent : t.btnText);
        txt(cx, cy + 4, MODES[k].desc, 10, t.btnText, 0.5, false);
        txt(cx, cy + 22, 'Best ' + best(k), 11, t.btnText, 0.5, false);
        buttons.push({ x: cx - w / 2, y: cy - h / 2, w: w, h: h, fn: () => setMode(k) });
      });
      if (DATA.mode === 'ultimate') {
        txt(W / 2, top + 296, 'Speed ' + DATA.speed, 15, t.text);
        button(W / 2 - 122, top + 330, 56, 46, '-', () => setSpeed(DATA.speed - 1), { size: 26 });
        button(W / 2 + 122, top + 330, 56, 46, '+', () => setSpeed(DATA.speed + 1), { size: 26 });
        for (let i = 0; i < 10; i++) rrect(W / 2 - 74 + i * 15, top + 320, 11, 20, 3, i < DATA.speed ? t.accent : t.panel);
      } else {
        txt(W / 2, top + 316, 'Speed goes up slowly as you eat', 13, t.text, 0.5, false);
      }
    } else if (DATA.tab === 1) {
      themePicker(top + 190, 80, 28);
      txt(W / 2, top + 262, t.name, 20, t.accent);
    } else if (DATA.tab === 2) {
      bgPicker(top + 190, 80, 54);
      txt(W / 2, top + 262, BACKGROUNDS[DATA.bg], 20, t.accent);
    } else if (DATA.tab === 3) {
      drawSkinTab(top);
    } else {
      drawGifts(top);
    }
    button(W / 2, top + (DATA.tab === 3 ? 450 : 410), 260, 54, 'Done', closeSheet, { primary: true, size: 20 });
    buttons.push({ x: 0, y: 0, w: W, h: top, fn: closeSheet });   // tap above the sheet closes it
  }

  // Board background pattern. Used for the board itself and for the menu previews.
  function drawPattern(gr, kind, x, y, cols, rows, step) {
    const t = th();
    gr.fillStyle(C(kind === 3 ? t.board2 : t.panel), kind === 3 ? 1 : 0.6);
    if (kind === 1) {                                        // dots
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) gr.fillCircle(x + (c + 0.5) * step, y + (r + 0.5) * step, step * 0.1);
    } else if (kind === 2) {                                 // grid
      const w = Math.max(1, step * 0.07);
      for (let c = 1; c < cols; c++) gr.fillRect(x + c * step - w / 2, y, w, rows * step);
      for (let r = 1; r < rows; r++) gr.fillRect(x, y + r * step - w / 2, cols * step, w);
    } else if (kind === 3) {                                 // stripes
      for (let c = 0; c < cols; c += 2) gr.fillRect(x + c * step, y, step, rows * step);
    } else if (kind === 4) {                                 // plus signs
      const l = step * 0.22, w = Math.max(1, step * 0.1);
      for (let c = 1; c < cols; c += 2) for (let r = 1; r < rows; r += 2) {
        const px = x + c * step, py = y + r * step;
        gr.fillRect(px - l, py - w / 2, 2 * l, w);
        gr.fillRect(px - w / 2, py - l, w, 2 * l);
      }
    }
  }

  // The board never changes during play, so it is drawn once on its own layer.
  function drawBoard() {
    const t = th();
    boardG.clear();
    boardG.setVisible(state !== 'menu');
    const openWalls = state !== 'menu' && G && modeOf().wall;
    boardG.fillStyle(C(openWalls ? POWERS.wall.color : t.panel), 1);   // teal frame = walls are open
    boardG.fillRoundedRect(BX - 7, BY - 7, BW + 14, BH + 14, 12);
    boardG.fillStyle(C(t.board1), 1);
    boardG.fillRect(BX, BY, BW, BH);
    drawPattern(boardG, DATA.bg, BX, BY, COLS, ROWS, CELL);
  }

  function drawHud() {
    const t = th();
    txt(BX, 26, 'Score', 12, t.text, 0, false);
    txt(BX, 56, String(G.score), 28, t.accent, 0);
    txt(BX + BW, 26, 'Best in ' + modeOf().name.toLowerCase(), 12, t.text, 1, false);
    txt(BX + BW, 56, String(best(G.mode)), 28, t.text, 1);

    if (G.bonus) {                                // big fruit timer
      txt(W / 2, 28, 'BONUS +' + BONUS_POINTS, 13, t.accent);
      line(W / 2 - 60, 58, W / 2 + 60, 58, t.panel, 8);
      line(W / 2 - 60, 58, W / 2 - 60 + 120 * G.bonus[3] / BONUS_TICKS, 58, t.accent, 8);
    } else {
      txt(W / 2, 28, 'Big fruit in ' + (BONUS_EVERY - G.eaten % BONUS_EVERY), 12, t.text, 0.5, false);
      for (let i = 0; i < BONUS_EVERY; i++) {
        dot(W / 2 - 36 + i * 18, 58, 5, i < G.eaten % BONUS_EVERY ? t.accent : t.panel);
      }
    }
  }

  function drawBottomBar() {
    const t = th();
    if (G.combo > 0) {
      txt(BX, 708, 'COMBO x' + G.combo, 20, t.accent, 0);
      txt(BX + 128, 710, (1 + 0.5 * G.combo) + 'x pts', 11, t.text, 0, false);
      line(BX + 3, 734, BX + 163, 734, t.panel, 7);
      line(BX + 3, 734, BX + 3 + 160 * G.combo_t / COMBO_TICKS, 734, t.accent, 7);
    } else {
      txt(BX, 706, 'COMBO', 14, t.text, 0);
      txt(BX, 728, 'eat the big fruit to start', 11, t.text, 0, false);
    }
    // coins earned in this game + daily challenge progress
    const d = dailyEnsure();
    drawCoin(BX + 214, 707, 8);
    txt(BX + 227, 707, String(G.coins | 0), 14, t.accent, 0);
    if (d.claimed) {
      txt(BX + 206, 731, 'Daily done!', 11, '#4ade80', 0);
    } else {
      txt(BX + 206, 731, 'Daily ' + d.progress + '/' + d.target, 11, t.text, 0, false);
    }
    // active abilities, each with its own timer
    let x = BX + 14;
    Object.keys(G.fx).forEach((kind) => {
      drawPower(kind, x, 766, 1);
      txt(x + 16, 766, POWERS[kind].name, 9, t.text, 0);
      line(x - 12, 787, x + 60, 787, t.panel, 5);
      line(x - 12, 787, x - 12 + 72 * Math.min(1, G.fx[kind] / POWER_TICKS), 787, POWERS[kind].color, 5);
      x += 88;
    });
    // pause button
    const px = BX + BW - 52, py = 692;
    rrect(px, py, 52, 52, 12, t.panel);
    line(px + 19, py + 15, px + 19, py + 37, t.btnText, 6);
    line(px + 33, py + 15, px + 33, py + 37, t.btnText, 6);
    buttons.push({ x: px - 6, y: py - 6, w: 64, h: 64, fn: togglePause });
  }

  function drawGame() {
    const a = anim / 60;
    drawHud();
    drawBottomBar();
    if (G.power && state === 'play') {
      const p = cellXY(G.power[0], G.power[1]);
      dot(p.x, p.y, 18 + 2.5 * Math.sin(a * 0.6), POWERS[G.power[2]].color);
      dot(p.x, p.y, 14.5, th().board1);
      drawPower(G.power[2], p.x, p.y, 1.15);
    }
    (G.bombs || []).forEach((p) => { const b = cellXY(p[0], p[1]); drawBomb(b.x, b.y, 1); });
    const f = cellXY(G.food[0], G.food[1]);
    drawFruit(G.food[2], f.x, f.y + 1.5 * Math.sin(a * 0.4), 1.1);
    if (G.gold) {
      const q = cellXY(G.gold[0], G.gold[1]);
      drawGolden(q.x, q.y, 1.1, G.gold[2] / GOLD_TICKS);
    }
    if (G.bonus) {
      const b = cellXY(G.bonus[0], G.bonus[1]);
      dot(b.x, b.y, 27 + 3 * Math.sin(a * 0.6), th().accent);
      dot(b.x, b.y, 23, th().board1);
      drawFruit(G.bonus[2], b.x, b.y, 2.2);
    }
    const fxKeys = Object.keys(G.fx);
    drawSnake(snakePoints(), G.dir, fxKeys.length ? POWERS[fxKeys[0]].color : null);
    if (G.boom && state !== 'play') { const b = cellXY(G.boom[0], G.boom[1]); drawBoom(b.x, b.y); }
    fxs.forEach((e) => {
      const k = e.life / e.max;
      if (e.k === 1) { g.lineStyle(3 * k + 1, C(e.color), k); g.strokeCircle(e.x, e.y, e.r + (1 - k) * 26); }
      else dot(e.x, e.y, e.r * k + 0.5, e.color, k);
    });
    if (state === 'play') {
      popups.forEach((p) => txt(p.x, p.y - (900 - p.life) * 0.03, p.s, 13, p.color));
    }
    if (banner) {                                  // big message: combo level, golden fruit, daily done
      const k = banner.life / banner.max, grow = Math.min(1, (1 - k) * 8), alpha = Math.min(1, k * 4);
      const bw = 300 * (0.7 + 0.3 * grow), by = BY + 46 - (1 - k) * 14;
      rrect(W / 2 - bw / 2, by - 24, bw, banner.sub ? 52 : 38, 18, '#000000', 0.55 * alpha);
      txt(W / 2, by - (banner.sub ? 7 : 0) , banner.s, banner.sub ? 20 : 22, banner.color);
      if (banner.sub) txt(W / 2, by + 15, banner.sub, 11, '#ffffff', 0.5, false);
    }
  }

  // btns = [[label, fn, options], ...]   lines = [[text, color], ...] shown under the score
  function drawOverlay(title, sub, btns, lines) {
    const t = th(), ls = lines || [], extra = ls.length * 26, h = 150 + extra + btns.length * 70, top = (H - h) / 2;
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, W, H);
    rrect(W / 2 - 186, top - 6, 372, h + 12, 24, t.bg);
    rrect(W / 2 - 180, top, 360, h, 20, t.panel);
    txt(W / 2, top + 50, title, 34, t.accent);
    txt(W / 2, top + 98, sub, 15, t.btnText);
    ls.forEach((l, i) => txt(W / 2, top + 130 + i * 26, l[0], 14, l[1] || t.btnText, 0.5, false));
    btns.forEach((b, i) => button(W / 2, top + 162 + extra + i * 70, 290, 56, b[0], b[1], b[2]));
  }

  function drawPause() {
    const t = th(), h = 420, top = (H - h) / 2;
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, 0, W, H);
    rrect(W / 2 - 186, top - 6, 372, h + 12, 24, t.bg);
    rrect(W / 2 - 180, top, 360, h, 20, t.panel);
    txt(W / 2, top + 40, G.just_revived ? 'Revived!' : 'Paused', 32, t.accent);
    txt(W / 2, top + 78, modeOf().name + ' mode, score ' + G.score, 15, t.btnText);
    txt(W / 2, top + 114, 'Theme', 13, t.btnText, 0.5, false);
    themePicker(top + 146, 58, 18);
    txt(W / 2, top + 190, 'Background', 13, t.btnText, 0.5, false);
    bgPicker(top + 226, 58, 36);
    button(W / 2, top + 300, 290, 54, G.just_revived ? 'Go' : 'Resume', togglePause, { primary: true, size: 20 });
    button(W / 2, top + 368, 290, 54, 'Home', goMenu, { dark: true, size: 20 });
  }

  // Shown while a rewarded ad is requested. The real ad is drawn by the app on top of the game.
  function drawAd() {
    const t = th();
    g.fillStyle(0x000000, 0.8);
    g.fillRect(0, 0, W, H);
    rrect(W / 2 - 180, 280, 360, 240, 20, t.panel);
    if (adLeft < 0) {
      txt(W / 2, 380, 'Loading ad...', 20, t.btnText);
      txt(W / 2, 410, 'You get the revive after the ad finishes', 12, t.btnText, 0.5, false);
      button(W / 2, 470, 200, 44, 'Cancel', cancelAd, { dark: true, size: 16 });
      return;
    }
    txt(W / 2, 326, 'TEST AD', 26, t.accent);
    txt(W / 2, 366, 'Developer test mode (?testads=1), not a real ad', 12, t.btnText, 0.5, false);
    txt(W / 2, 426, String(Math.ceil(adLeft / 1000)), 54, t.btnText);
    line(W / 2 - 130, 486, W / 2 + 130, 486, t.bg, 8);
    line(W / 2 - 130, 486, W / 2 - 130 + 260 * (1 - adLeft / TEST_AD_MS), 486, t.accent, 8);
  }

  function draw() {
    layers.forEach((ly) => { ly.g.clear(); ly.n = 0; });
    buttons = [];
    useLayer(0);
    if (state === 'menu') {
      drawMenu();
      if (sheetT > 0) { useLayer(1); drawSheet(); }
    } else {
      drawGame();
      useLayer(1);
      if (state === 'paused') {
        drawPause();
      } else if (state === 'over') {
        const btns = [], lines = [];
        const canRevive = (G.revives || 0) < REVIVES_PER_GAME && adAvailable();
        if (canRevive) btns.push(['Revive (watch ad)', watchAd, { primary: true, size: 19 }]);
        btns.push(['Play again', newGame, canRevive ? { dark: true } : { primary: true }]);
        btns.push(['Share score', shareScore, { dark: true }]);
        btns.push(['Home', goMenu, { dark: true }]);
        lines.push(['+' + (G.coins | 0) + ' coins this game  (total ' + DATA.coins + ')', '#fbbf24']);
        const dd = dailyEnsure();
        if (G.dailyCoins) lines.push(['Daily challenge complete! +' + G.dailyCoins + ' coins', '#4ade80']);
        else if (!dd.claimed) lines.push(['Daily: ' + dailyText() + '  ' + dd.progress + '/' + dd.target]);
        if (G.adMsg) lines.push([G.adMsg, '#fca5a5']);
        if (G.shareMsg) lines.push([G.shareMsg, '#86efac']);
        drawOverlay(G.boom ? 'Boom!' : 'Game over', 'Score ' + G.score + (G.new_high ? ', new best!' : ''), btns, lines);
      } else if (state === 'ad') {
        drawAd();
      }
    }
    layers.forEach((ly) => { for (let i = ly.n; i < ly.texts.length; i++) ly.texts[i].setVisible(false); });
  }

  // ---------- Game logic ----------
  // opts.head: keep this far from the snake's head, opts.bombR: keep this far from bombs
  function freeCell(margin, opts) {
    const o = opts || {}, head = G.snake[0];
    const taken = new Set(G.snake.map((p) => p[0] + ',' + p[1]));
    if (G.food) taken.add(G.food[0] + ',' + G.food[1]);
    if (G.power) taken.add(G.power[0] + ',' + G.power[1]);
    if (G.gold) taken.add(G.gold[0] + ',' + G.gold[1]);
    if (G.bonus) {
      for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) taken.add((G.bonus[0] + dc) + ',' + (G.bonus[1] + dr));
    }
    const bombs = G.bombs || [];
    for (let tries = 0; tries < 5000; tries++) {
      const c = margin + rnd(COLS - 2 * margin), r = margin + rnd(ROWS - 2 * margin);
      if (taken.has(c + ',' + r)) continue;
      if (o.head && Math.max(Math.abs(c - head[0]), Math.abs(r - head[1])) < o.head) continue;
      if (bombs.some((p) => Math.max(Math.abs(c - p[0]), Math.abs(r - p[1])) <= (o.bombR || 0))) continue;
      return [c, r];
    }
    return [margin, margin];
  }
  // Ultimate mode: bombs in random places, never right in front of the snake.
  function placeBombs() {
    G.bombs = [];
    if (!modeOf().bombs) return;
    for (let i = 0; i < BOMBS; i++) G.bombs.push(freeCell(1, { head: BOMB_SAFE, bombR: 1 }));
  }
  const isBomb = (c, r) => (G.bombs || []).some((p) => p[0] === c && p[1] === r);
  function placeFood() {
    const p = freeCell(0, { bombR: 0 });
    G.food = [p[0], p[1], FRUITS[rnd(FRUITS.length)]];
  }
  function stepDelay() {
    if (!G) return START_DELAY;
    let d;
    if (G.mode === 'ultimate') d = speedDelay(G.speed || DATA.speed);                  // fixed speed chosen by the player
    else d = MIN_DELAY + (START_DELAY - MIN_DELAY) * Math.exp(-G.eaten / SPEEDUP_FRUITS);   // speeds up gently
    if (G.fx.slow) d *= SLOW_FACTOR;
    return d;
  }

  function setState(s) {
    state = s;
    applyTheme();
  }
  function applyTheme() {
    const bg = th().bg;
    document.body.style.backgroundColor = bg;
    if (scene) { scene.cameras.main.setBackgroundColor(bg); drawBoard(); }
  }

  function newGame() {
    const mc = COLS >> 1, mr = ROWS >> 1;
    G = {
      snake: [[mc, mr], [mc - 1, mr], [mc - 2, mr]],
      dir: [1, 0], queue: [], score: 0, eaten: 0, food: null, bonus: null, new_high: false,
      grow: 0, combo: 0, combo_t: 0, power: null, fx: {},
      gold: null, nextGold: 8 + rnd(6), coins: 0, dailyCoins: 0, playMs: 0, adMsg: '', shareMsg: '',
      mode: DATA.mode, speed: DATA.speed
    };
    popups = []; fxs = []; banner = null; prevSnake = null; acc = 0;
    adToken++;                                 // forget any ad request from the previous game
    gift = null;
    dailyEnsure(true);
    sheetOpen = false; sheetT = 0;
    placeBombs();
    placeFood();
    DATA.save = null;
    setState('play');
  }

  function continueGame() {
    const s = DATA.save;
    if (!s) return;
    const ok = s.snake && s.food && s.snake.concat([s.food]).every((p) => p[0] >= 0 && p[0] < COLS && p[1] >= 0 && p[1] < ROWS);
    if (!ok) { DATA.save = null; newGame(); return; }
    G = s;
    G.queue = [];
    G.fx = G.fx || {};
    G.mode = MODES[G.mode] ? G.mode : 'classic';
    // saves from older versions (or damaged ones) may miss the new fields
    G.coins = num(G.coins, 0, MAX_COINS, 0); G.dailyCoins = num(G.dailyCoins, 0, MAX_COINS, 0);
    G.playMs = num(G.playMs, 0, 1e9, 0); G.nextGold = num(G.nextGold, 0, 1e7, (G.eaten | 0) + 10);
    G.adMsg = ''; G.shareMsg = '';
    if (!Array.isArray(G.gold) || G.gold.length < 3) G.gold = null;
    if (!Array.isArray(G.snake) || !G.snake.length || !Array.isArray(G.dir)) { DATA.save = null; newGame(); return; }
    if (modeOf().bombs && !G.bombs) placeBombs();
    sheetOpen = false; sheetT = 0;
    G.just_revived = false;
    popups = []; fxs = []; banner = null; prevSnake = null; acc = 0;
    adToken++;
    dailyEnsure(true);
    setState('paused');              // does not start moving until the player resumes
  }

  function saveGame() {
    if (G && (state === 'play' || state === 'paused')) DATA.save = G;
    writeData();
  }
  function goMenu() { saveGame(); setState('menu'); }
  function gameOver() {
    DATA.save = null;
    G.adMsg = '';
    dailyEnsure();
    writeData();
    if (!G.boom) sfx.over();
    buzz(120);
    setState('over');
  }

  // ---------- Share ----------
  // The app can provide window.shareText(text) (e.g. an Android share sheet). Otherwise the browser's
  // share sheet is used, then the clipboard, then a WhatsApp link.
  function shareScore() {
    const text = 'I scored ' + G.score + ' in Snake Fruit Rush! Can you beat me?' + (window.SHARE_URL ? ' ' + window.SHARE_URL : '');
    const done = (msg) => { if (G) G.shareMsg = msg; };
    try {
      if (typeof window.shareText === 'function') { window.shareText(text); return; }
      if (navigator.share) { navigator.share({ text: text }).catch(() => {}); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => done('Score copied - paste it to a friend!'), () => window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank'));
        return;
      }
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    } catch (e) { done('Sharing is not available here.'); }
  }

  // ---------- Revive (rewarded ad) ----------
  // The real ad comes from the app (AdMob in the Android wrapper). It must define
  //   window.showRewardedAd = () => Promise<boolean>
  // that resolves true ONLY after the user-earned-reward callback fired, and false if the ad
  // failed, was not filled or was closed early. Optionally window.isRewardedAdReady() -> boolean.
  // The snake is revived only when the promise resolves with exactly true. Nothing is granted for a tap.
  // Without the hook no revive button is shown. For desktop testing, ?testads=1 uses a 5 s test countdown.
  function adAvailable() {
    if (typeof window.showRewardedAd === 'function') {
      try { return typeof window.isRewardedAdReady === 'function' ? window.isRewardedAdReady() !== false : true; } catch (e) { return true; }
    }
    return TEST_ADS;
  }
  function endAd(token, ok, msg) {
    if (token !== adToken || state !== 'ad') return;     // cancelled, restarted or answered twice
    adToken++;
    clearTimeout(adTimer);
    if (ok === true) { G.adMsg = ''; revive(); return; }
    G.adMsg = msg || 'Ad not available. Try again later.';
    setState('over');                                    // normal game-over / restart flow still works
  }
  function cancelAd() { endAd(adToken, false, 'Ad cancelled.'); }
  function watchAd() {
    if (state !== 'over' || (G.revives || 0) >= REVIVES_PER_GAME || !adAvailable()) return;
    const token = ++adToken;
    state = 'ad';
    G.adMsg = '';
    if (typeof window.showRewardedAd === 'function') {
      adLeft = -1;
      adTimer = setTimeout(() => endAd(token, false, 'Ad took too long.'), AD_TIMEOUT_MS);
      let p;
      try { p = Promise.resolve(window.showRewardedAd()); } catch (e) { p = Promise.reject(e); }
      p.then((ok) => endAd(token, ok === true), () => endAd(token, false));
    } else {
      adLeft = TEST_AD_MS;
    }
  }

  // The snake comes back in the middle of the board with its score and length.
  function revive() {
    const mc = COLS >> 1, mr = ROWS >> 1, len = G.snake.length;
    G.revives = (G.revives || 0) + 1;
    G.snake = [[mc, mr], [mc - 1, mr], [mc - 2, mr]];
    G.grow = Math.max(0, len - 3);     // grows back to its old length as it moves
    G.dir = [1, 0];
    G.queue = [];
    G.combo = 0; G.combo_t = 0;
    G.fx = { ghost: 25 };              // a few safe steps while it grows back
    G.just_revived = true;
    G.boom = null;
    G.gold = null;
    placeBombs();                      // fresh bombs, away from the middle
    popups = []; fxs = []; banner = null; prevSnake = null; acc = 0;
    if (G.bonus && Math.abs(G.bonus[0] - mc) <= 2 && Math.abs(G.bonus[1] - mr) <= 2) G.bonus = null;
    sfx.revive();
    setState('paused');                // waits for the player to press GO
    saveGame();
  }

  function popup(s, color, dy) {
    const h = cellXY(G.snake[0][0], G.snake[0][1]);
    popups.push({ x: Math.min(W - 60, Math.max(60, h.x)), y: h.y - 20 - (dy || 0), s: s, color: color || th().accent, life: 900 });
  }

  function addScore(points) {
    if (G.fx.double) points *= 2;
    points = Math.floor(points * (1 + 0.5 * G.combo));
    G.score += points;
    popup('+' + points, th().text, 0);
    if (G.score > best(G.mode)) { DATA.highs[G.mode] = G.score; G.new_high = true; }
    dailyMax('score', G.score);
  }
  function headXY() { return cellXY(G.snake[0][0], G.snake[0][1]); }

  const COMBO_TIERS = { 3: 'NICE!', 5: 'GREAT!', 8: 'AWESOME!', 12: 'UNSTOPPABLE!', 16: 'LEGENDARY!' };
  function bumpCombo() {
    G.combo += 1;
    G.combo_t = COMBO_TICKS;
    popup('COMBO x' + G.combo, th().accent, 18);
    dailyMax('combo', G.combo);
    const tier = COMBO_TIERS[G.combo];
    if (tier) {                                           // short, clear reward for a combo milestone
      const h = headXY();
      showBanner(tier + '  x' + G.combo, (1 + 0.5 * G.combo) + 'x points', th().accent, 1000);
      ring(h.x, h.y, th().accent); burst(h.x, h.y, 'rand', 10);
      sfx.combo(G.combo);
    }
    if (G.combo % COMBO_POWER_EVERY === 0 && !G.power) {
      const p = freeCell(0);
      const pool = POWER_KEYS.filter((k) => !modeOf()[k]);      // no 'No Walls' icon in a no-walls mode, etc.
      G.power = [p[0], p[1], pool[rnd(pool.length)], POWER_ITEM_TICKS];
    }
  }

  function eatAtHead() {
    const hc = G.snake[0][0], hr = G.snake[0][1];
    if (hc === G.food[0] && hr === G.food[1]) {             // fruit
      G.eaten += 1;
      G.grow += 1;
      if (G.combo > 0) bumpCombo();                         // combo only starts with the big fruit
      addScore(FRUIT_POINTS);
      addCoins(COIN_FRUIT);
      dailyAdd('fruits', 1); dailyAdd('ultimate', 1);
      const fp = headXY(); burst(fp.x, fp.y, 'rand', 6);
      sfx.eat(G.combo);
      buzz(12);
      placeFood();
      if (G.eaten % BONUS_EVERY === 0 && !G.bonus) {
        const p = freeCell(1, { bombR: 1 });
        G.bonus = [p[0], p[1], FRUITS[rnd(FRUITS.length)], BONUS_TICKS];
      }
      if (G.eaten >= G.nextGold && !G.gold) {               // golden fruit: rare, short-lived, worth a lot
        const p = freeCell(1, { bombR: 1 });
        G.gold = [p[0], p[1], GOLD_TICKS];
        G.nextGold = G.eaten + 10 + rnd(8);
        showBanner('GOLDEN FRUIT!', 'grab it fast', '#fde047', 900);
        tone(1000, 0.12, 'triangle', 0.2);
      }
    }
    if (G.bonus && Math.abs(hc - G.bonus[0]) <= 1 && Math.abs(hr - G.bonus[1]) <= 1) {   // big fruit
      G.bonus = null;
      G.grow += 1;
      if (modeOf().bombs) placeBombs();                     // bombs move after every big fruit
      bumpCombo();
      addScore(BONUS_POINTS);
      addCoins(COIN_BONUS);
      dailyAdd('bonus', 1); dailyAdd('fruits', 1); dailyAdd('ultimate', 1);
      const bp = headXY(); burst(bp.x, bp.y, 'rand', 12); ring(bp.x, bp.y, th().accent);
      sfx.yum();
      buzz(30);
    }
    if (G.gold && hc === G.gold[0] && hr === G.gold[1]) {   // golden fruit
      G.gold = null;
      G.grow += 1;
      if (G.combo > 0) bumpCombo();
      addScore(GOLD_POINTS);
      addCoins(COIN_GOLD);
      dailyAdd('golden', 1); dailyAdd('fruits', 1); dailyAdd('ultimate', 1);
      const gp = headXY(); burst(gp.x, gp.y, 'rand', 16); ring(gp.x, gp.y, '#fde047');
      showBanner('GOLDEN!  +' + GOLD_POINTS + ' +' + COIN_GOLD + ' coins', '', '#fde047', 1000);
      sfx.gold();
      buzz(40);
    }
    if (G.power && hc === G.power[0] && hr === G.power[1]) {   // ability icon
      const kind = G.power[2];
      G.power = null;
      G.fx[kind] = POWER_TICKS;
      popup(POWERS[kind].name + '!', POWERS[kind].color, 36);
      const pp = headXY(); ring(pp.x, pp.y, POWERS[kind].color); burst(pp.x, pp.y, POWERS[kind].color, 8);
      showBanner(POWERS[kind].name + '!', 'power-up active', POWERS[kind].color, 800);
      sfx.power();
      buzz(30);
    }
  }

  function magnetPull() {
    const hc = G.snake[0][0], hr = G.snake[0][1];
    [G.food, G.bonus, G.power, G.gold].forEach((item) => {
      if (item && Math.max(Math.abs(item[0] - hc), Math.abs(item[1] - hr)) <= MAGNET_RANGE) {
        const nc = item[0] + Math.sign(hc - item[0]), nr = item[1] + Math.sign(hr - item[1]);
        if (!isBomb(nc, nr)) { item[0] = nc; item[1] = nr; }            // fruit never lands on a bomb
      }
    });
  }

  function step() {
    const oldDir = G.dir;
    if (G.queue.length) G.dir = G.queue.shift();
    // close call: a bomb was right in front of the head and the player turned away just in time
    if (G.bombs && G.bombs.length && !same(oldDir, G.dir)) {
      let bc = G.snake[0][0] + oldDir[0], br = G.snake[0][1] + oldDir[1];
      if (has('wall')) { bc = (bc + COLS) % COLS; br = (br + ROWS) % ROWS; }
      if (isBomb(bc, br)) G.near = true;
    }
    let nc = G.snake[0][0] + G.dir[0], nr = G.snake[0][1] + G.dir[1];

    // 1. wall (NO WALLS: come out on the other side)
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) {
      if (has('wall')) { nc = (nc + COLS) % COLS; nr = (nr + ROWS) % ROWS; }
      else return gameOver();
    }
    // 2. bomb (Ultimate mode) - even a ghost snake explodes
    if (isBomb(nc, nr)) {
      G.boom = [nc, nr];
      sfx.boom();
      return gameOver();
    }
    // 3. own body (GHOST: pass through)
    const growing = G.grow > 0;
    const body = growing ? G.snake : G.snake.slice(0, -1);
    if (!has('ghost') && body.some((s) => s[0] === nc && s[1] === nr)) return gameOver();

    G.snake.unshift([nc, nr]);
    if (growing) G.grow -= 1; else G.snake.pop();
    trailPuff();
    if (G.near) {
      G.near = false;
      G.score += NEAR_POINTS;
      if (G.score > best(G.mode)) { DATA.highs[G.mode] = G.score; G.new_high = true; }
      dailyMax('score', G.score);
      const np = headXY();
      popup('CLOSE CALL! +' + NEAR_POINTS, '#f87171', 18);
      ring(np.x, np.y, '#f87171');
      sfx.near();
    }

    // 3. food / abilities
    eatAtHead();
    if (G.fx.magnet) { magnetPull(); eatAtHead(); }

    // 4. timers
    if (G.bonus && --G.bonus[3] <= 0) G.bonus = null;
    if (G.power && --G.power[3] <= 0) G.power = null;
    if (G.gold && --G.gold[2] <= 0) G.gold = null;
    if (G.combo > 0 && --G.combo_t <= 0) G.combo = 0;
    Object.keys(G.fx).forEach((k) => { if (--G.fx[k] <= 0) delete G.fx[k]; });
  }

  // ---------- Input ----------
  const opposite = (a, b) => a[0] === -b[0] && a[1] === -b[1];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];

  function turn(d) {
    if (state !== 'play') return false;
    const last = G.queue.length ? G.queue[G.queue.length - 1] : G.dir;
    if (same(d, last) || opposite(d, last) || G.queue.length >= 2) return false;
    G.queue.push(d);
    // Respond right away: if the snake is already part-way into its step, take the turn now
    // instead of waiting for the next step.
    if (G.queue.length === 1 && acc >= stepDelay() * INSTANT_TURN) {
      acc = 0;
      prevSnake = G.snake.map((p) => [p[0], p[1]]);
      step();
    }
    return true;
  }
  // Tap: the snake turns towards the tapped point.
  function tapTurn(x, y) {
    const h = cellXY(G.snake[0][0], G.snake[0][1]);
    const dx = x - h.x, dy = y - h.y;
    const horiz = [dx > 0 ? 1 : -1, 0], vert = [0, dy > 0 ? 1 : -1];
    const order = Math.abs(dx) > Math.abs(dy) ? [horiz, vert] : [vert, horiz];
    if (!turn(order[0])) turn(order[1]);        // cannot go straight or reverse, so try the other axis
  }
  function togglePause() {
    if (state === 'play') { saveGame(); setState('paused'); }
    else if (state === 'paused') { acc = 0; prevSnake = null; G.just_revived = false; setState('play'); }
  }
  function setTheme(i) {
    DATA.theme = (i + THEMES.length) % THEMES.length;
    writeData();
    applyTheme();
  }
  function setBackground(i) {
    DATA.bg = (i + BACKGROUNDS.length) % BACKGROUNDS.length;
    writeData();
    drawBoard();
  }
  function setMode(k) {
    DATA.mode = k;
    writeData();
  }
  function setSpeed(v) {
    DATA.speed = Math.min(10, Math.max(1, v));
    writeData();
  }
  function toggleSound() {
    DATA.sound = !DATA.sound;
    writeData();
    tone(660, 0.1, 'triangle', 0.25);
  }

  // ---------- Phaser scene ----------
  class Main extends Phaser.Scene {
    create() {
      scene = this;
      boardG = this.add.graphics();
      layers = [0, 1].map((i) => ({ g: this.add.graphics().setDepth(i * 20 + 1), texts: [], n: 0, depth: i * 20 + 1 }));
      useLayer(0);
      demoReset();
      this.cameras.main.setZoom(ZOOM);
      this.cameras.main.centerOn(W / 2, H / 2);
      applyTheme();

      // Touch / mouse are read from the whole window, so swipes that start near the
      // screen edges (outside the game canvas) also work, and swipes react on the move.
      const canvas = this.game.canvas;
      const toWorld = (e) => {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
      };
      const touches = new Map();
      window.addEventListener('pointerdown', (e) => {
        unlockAudio();
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: false });
      }, { passive: true });
      window.addEventListener('pointermove', (e) => {
        const s = touches.get(e.pointerId);
        if (!s || state !== 'play') return;
        const dx = e.clientX - s.x, dy = e.clientY - s.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
        turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
        s.x = e.clientX; s.y = e.clientY; s.moved = true;
      }, { passive: true });
      const end = (e, cancelled) => {
        const s = touches.get(e.pointerId);
        touches.delete(e.pointerId);
        if (!s || s.moved || cancelled) return;
        unlockAudio();
        const w = toWorld(e);
        const b = buttons.find((q) => w.x >= q.x && w.x <= q.x + q.w && w.y >= q.y && w.y <= q.y + q.h);
        if (b) { sfx.click(); b.fn(); }
        else if (state === 'play') tapTurn(w.x, w.y);
      };
      window.addEventListener('pointerup', (e) => end(e, false));
      window.addEventListener('pointercancel', (e) => end(e, true));

      window.addEventListener('keydown', unlockAudio, { once: true });
      const kb = this.input.keyboard;
      if (kb) {
        const dirs = { UP: [0, -1], W: [0, -1], DOWN: [0, 1], S: [0, 1], LEFT: [-1, 0], A: [-1, 0], RIGHT: [1, 0], D: [1, 0] };
        Object.keys(dirs).forEach((k) => kb.on('keydown-' + k, () => turn(dirs[k])));
        kb.on('keydown-SPACE', togglePause);
        kb.on('keydown-ENTER', () => { if (state === 'menu' || state === 'over') newGame(); else if (state === 'paused') togglePause(); });
        kb.on('keydown-ESC', () => { if (state !== 'menu') goMenu(); else closeSheet(); });
        kb.on('keydown-T', () => setTheme(DATA.theme + 1));
        kb.on('keydown-B', () => setBackground(DATA.bg + 1));
        kb.on('keydown-C', () => { if (state === 'menu') continueGame(); });
      }

      // Pause and save when the app goes to the background.
      const away = () => {
        if (state === 'play') togglePause(); else if (state !== 'ad') saveGame();
        try { if (actx && actx.state === 'running') actx.suspend(); } catch (e) { /* ignore */ }
      };
      document.addEventListener('visibilitychange', () => { if (document.hidden) away(); else dailyEnsure(true); });
      window.addEventListener('pagehide', away);
    }

    update(time, delta) {
      delta = Math.min(delta, 100);
      anim += delta;
      if (state === 'menu') {
        demo.acc += delta;
        while (demo.acc >= DEMO.ms) { demo.acc -= DEMO.ms; demoStep(); }
        sheetT = sheetOpen ? Math.min(1, sheetT + delta / 240) : Math.max(0, sheetT - delta / 200);
        if (gift && gift.t < 1e6) {
          gift.t += delta;
          if (!gift.done && gift.t >= GIFT_MS) { gift.done = true; if (gift.kind === 'egg' && !gift.skin) sfx.coin(); else sfx.win(); }
        }
      }
      if (state === 'play') {
        acc += delta;
        let delay = stepDelay();
        while (state === 'play' && acc >= delay) {
          acc -= delay;
          prevSnake = G.snake.map((s) => [s[0], s[1]]);
          step();
          delay = stepDelay();
        }
        popups.forEach((p) => { p.life -= delta; });
        popups = popups.filter((p) => p.life > 0);
        if (G) {
          const before = Math.floor(G.playMs / 1000);
          G.playMs += delta;
          if (Math.floor(G.playMs / 1000) !== before) dailyMax('survive', Math.floor(G.playMs / 1000));
        }
      }
      if (state === 'play' || state === 'over') {            // short effects fade out
        for (let i = fxs.length - 1; i >= 0; i--) {
          const e = fxs[i];
          e.life -= delta; e.x += e.vx * delta; e.y += e.vy * delta;
          if (e.life <= 0) fxs.splice(i, 1);
        }
        if (banner && state === 'play' && (banner.life -= delta) <= 0) banner = null;
      }
      if (state === 'ad' && adLeft > 0) {
        adLeft -= delta;
        if (adLeft <= 0) revive();
      }
      musicTick();
      draw();
    }
  }

  function startGame() {
    if (window.snakeGame) return;
    window.snakeGame = new Phaser.Game({
    type: /[?&]webgl=1/.test(location.search) ? Phaser.WEBGL : Phaser.CANVAS,   // Canvas is smooth everywhere; add ?webgl=1 to compare
    parent: 'game',
    width: W * ZOOM,
    height: H * ZOOM,
    backgroundColor: th().bg,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true },
    scene: Main
    });
  }
  // Wait for the embedded Fredoka font so the canvas text uses it (but never more than 1.5 s).
  try {
    Promise.all([document.fonts.load('500 20px Fredoka'), document.fonts.load('700 20px Fredoka')]).then(startGame, startGame);
  } catch (e) { startGame(); }
  setTimeout(startGame, 1500);

  // test hook (not used by the game itself)
  window.__snake = { get G() { return G; }, get state() { return state; }, get buttons() { return buttons; }, step2: step, DATA: DATA, turn: turn, get acc() { return acc; }, get sheet() { return sheetOpen; }, placeBombs: placeBombs, step: step, newGame: newGame, POWER_KEYS: POWER_KEYS,
    daily: { ensure: dailyEnsure, add: dailyAdd, max: dailyMax, make: makeDaily, load: loadData, addCoins: addCoins }, buySkin: buySkin, selectSkin: selectSkin, doSpin: doSpin, openEgg: openEgg, spinReady: spinReady, closeSheet: closeSheet, openSheet: openSheet, get skinPick() { return skinPick; }, set skinPick(v) { skinPick = v; }, get gift() { return gift; }, EGG_COST: EGG_COST, sfx: sfx, shareScore: shareScore, watchAd: watchAd, adAvailable: adAvailable, SKINS: SKINS, get fxs() { return fxs; }, eat: eatAtHead, gameOver: gameOver };
})();
</script>
</body>
</html>
