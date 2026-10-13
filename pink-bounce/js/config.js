/* Pink Bounce: Survival - shared configuration, power-up table and storage helpers. */
window.PB = window.PB || {};

PB.CFG = {
  W: 540,
  H: 800,

  PADDLE_Y: 700,
  PADDLE_H: 16,
  PADDLE_W: 104,
  PADDLE_MIN_W: 72,
  PADDLE_SPEED: 720,     // keyboard px/s
  PADDLE_FOLLOW: 2600,   // pointer follow px/s (fast, but never a teleport)
  MAX_BOUNCE_ANGLE: 62 * Math.PI / 180,

  WALL_Y: 744,           // Safety Wall centre (between paddle and slit)
  WALL_H: 8,
  SLIT_Y: 770,           // a ball whose centre passes this line is lost

  GRID_COLS: 10,
  CELL_W: 50,
  CELL_H: 26,
  BLOCK_W: 46,
  BLOCK_H: 20,
  GRID_X: 20,
  GRID_Y: 78,

  BALL_R: 9,
  BIG_R: 16,
  MIN_VY: 0.2,           // minimum |vy|/speed, prevents flat horizontal loops
  MIN_VX: 0.07,          // minimum |vx|/speed, prevents endless vertical loops
  SLOW_FACTOR: 0.6,
  MAX_BALLS: 12,
  PROTECT_MS: 2500,      // protection after launching a fresh ball
  AUTO_LAUNCH_MS: 3000,

  START_LIVES: 3,
  MAX_LIVES: 9,
  FONT: '"Trebuchet MS", "Segoe UI", system-ui, Arial, sans-serif'
};

/* Drop weights are relative. `duration` is ms (0 = instant / until used). */
PB.POWERUPS = {
  x3:     { label: 'X3',   name: 'X3 Balls',    color: 0xff3df2, css: '#ff3df2', duration: 0,     weight: 16, desc: 'Splits a ball into three' },
  life:   { label: '+3',   name: '+3 Lives',    color: 0xff4d6d, css: '#ff4d6d', duration: 0,     weight: 4,  desc: 'Adds three lives' },
  fire:   { label: 'FIRE', name: 'Fireball',    color: 0xff8a1f, css: '#ff8a1f', duration: 8000,  weight: 12, desc: 'Burns through blocks in one hit' },
  big:    { label: 'BIG',  name: 'Big Ball',    color: 0x22d3ee, css: '#22d3ee', duration: 10000, weight: 12, desc: 'Bigger ball, double damage' },
  wall:   { label: 'WALL', name: 'Safety Wall', color: 0x3b82ff, css: '#3b82ff', duration: 9000,  weight: 12, desc: 'Solid barrier above the slit' },
  shield: { label: 'SHLD', name: 'Shield',      color: 0x4ade80, css: '#4ade80', duration: 0,     weight: 11, desc: 'Cancels one life loss' },
  slow:   { label: 'SLOW', name: 'Slow Motion', color: 0xa78bfa, css: '#a78bfa', duration: 8000,  weight: 11, desc: 'Slows every ball' },
  wide:   { label: 'WIDE', name: 'Wide Paddle', color: 0xfde047, css: '#fde047', duration: 12000, weight: 14, desc: 'Much wider paddle' }
};
PB.POWERUP_KEYS = Object.keys(PB.POWERUPS);

/* ---------------- game modes ---------------- */
PB.MODES = {
  classic:  { id: 'classic',  name: 'Classic Mode',  desc: 'Break all the bricks' },
  fortress: { id: 'fortress', name: 'Fortress Mode', desc: 'One gate. Tough blocks inside.' }
};

/* ---------------- ball skins (price in coins) ---------------- */
PB.SKINS = [
  { id: 'orb',     name: 'Pink Orb', price: 0,   glow: '#ff3df2', core: '#ffffff', mid: '#ff5fd8', trail: 0xff3df2, css: 'radial-gradient(circle at 35% 30%,#fff,#ff5fd8 55%,#a1148f)' },
  { id: 'plasma',  name: 'Plasma',   price: 0,   glow: '#3b82ff', core: '#e0f2ff', mid: '#3b82ff', trail: 0x3b82ff, css: 'radial-gradient(circle at 35% 30%,#e0f2ff,#3b82ff 55%,#1e3a8a)' },
  { id: 'emerald', name: 'Emerald',  price: 150, glow: '#34d399', core: '#ecfdf5', mid: '#10b981', trail: 0x34d399, css: 'radial-gradient(circle at 35% 30%,#ecfdf5,#10b981 55%,#065f46)' },
  { id: 'solar',   name: 'Solar',    price: 200, glow: '#fde047', core: '#ffffff', mid: '#f59e0b', trail: 0xfde047, css: 'radial-gradient(circle at 35% 30%,#fff,#fbbf24 50%,#b45309)' },
  { id: 'void',    name: 'Void',     price: 300, glow: '#22d3ee', core: '#2a0a52', mid: '#0b0220', trail: 0x22d3ee, style: 'void',  css: 'radial-gradient(circle at 50% 50%,#0b0220 55%,#22d3ee 62%,#0b0220 75%)' },
  { id: 'candy',   name: 'Candy',    price: 400, glow: '#ff7ab8', core: '#ffffff', mid: '#ff7ab8', trail: 0xff9ad0, style: 'candy', css: 'repeating-linear-gradient(45deg,#ff7ab8 0 6px,#fff 6px 12px)' }
];

/* ---------------- colour themes (price in coins) ---------------- */
PB.THEMES = [
  { id: 'neon',   name: 'Neon Night',   price: 0,   a1: '#ff3df2', a2: '#3b82ff', a3: '#a64bff',
    blocks: ['#ff3d9a', '#a64bff', '#3b82ff', '#22d3ee'], bg: ['#0b0422', '#0d0526', '#16062f'],
    glowA: 'rgba(120,60,255,0.22)', glowB: 'rgba(255,61,154,0.16)', grid: 'rgba(90,120,255,0.16)', paddle: 0xff3df2, paddleDark: 0x7a1c9e },
  { id: 'sunset', name: 'Cyber Sunset', price: 300, a1: '#ff7a1a', a2: '#ff3d6e', a3: '#c026d3',
    blocks: ['#ff4d6d', '#ff8a1f', '#ffd23f', '#c026d3'], bg: ['#1a0618', '#220720', '#3a0a1e'],
    glowA: 'rgba(255,90,60,0.22)', glowB: 'rgba(192,38,211,0.2)', grid: 'rgba(255,120,90,0.15)', paddle: 0xff7a1a, paddleDark: 0x8a2a0a },
  { id: 'toxic',  name: 'Toxic Grid',   price: 300, a1: '#39ff88', a2: '#22d3ee', a3: '#84cc16',
    blocks: ['#39ff88', '#a3e635', '#14b8a6', '#22d3ee'], bg: ['#02140e', '#031a12', '#052414'],
    glowA: 'rgba(57,255,136,0.16)', glowB: 'rgba(34,211,238,0.14)', grid: 'rgba(57,255,136,0.13)', paddle: 0x39ff88, paddleDark: 0x0b6a3a },
  { id: 'ice',    name: 'Ice Galaxy',   price: 500, a1: '#7dd3fc', a2: '#818cf8', a3: '#e0f2fe',
    blocks: ['#7dd3fc', '#818cf8', '#c4b5fd', '#38bdf8'], bg: ['#050b24', '#071033', '#0a1646'],
    glowA: 'rgba(129,140,248,0.24)', glowB: 'rgba(125,211,252,0.15)', grid: 'rgba(125,180,255,0.15)', paddle: 0x7dd3fc, paddleDark: 0x1e4a8a },
  { id: 'candy',  name: 'Candy Pop',    price: 500, a1: '#ff7ab8', a2: '#7cf5ff', a3: '#ffe066',
    blocks: ['#ff7ab8', '#7cf5ff', '#ffe066', '#c7a6ff'], bg: ['#1d0a2e', '#240c38', '#34104a'],
    glowA: 'rgba(255,122,184,0.2)', glowB: 'rgba(124,245,255,0.14)', grid: 'rgba(255,170,220,0.14)', paddle: 0xff7ab8, paddleDark: 0x8a2b66 }
];

/* ---------------- persistent save data (localStorage may be unavailable) ---------------- */
PB.Save = (function () {
  const KEY = 'neonRicochet.v1';
  const def = () => ({
    coins: 0, best: { classic: 0, fortress: 0 }, board: [], ach: {},
    stats: { blocks: 0, powerups: 0, games: 0, maxLevel: 0, maxMult: 1, fortressClears: 0, bestScore: 0 },
    skins: ['orb', 'plasma'], themes: ['neon'], skin: 'orb', theme: 'neon', mode: 'classic'
  });
  let d = def();
  function load() {
    d = def();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      Object.keys(d).forEach((k) => {
        if (raw[k] === undefined) return;
        d[k] = (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) ? Object.assign(d[k], raw[k]) : raw[k];
      });
    } catch (e) { /* corrupt or unavailable: start fresh */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  load();
  return { get data() { return d; }, save, reset() { d = def(); save(); } };
})();

PB.loadBest = function (mode) { return PB.Save.data.best[mode || PB.Save.data.mode] || 0; };
PB.saveBest = function (mode, v) {
  const b = PB.Save.data.best;
  if (v > (b[mode] || 0)) { b[mode] = Math.floor(v); PB.Save.save(); }
};
PB.theme = function () { return PB.THEMES.find((t) => t.id === PB.Save.data.theme) || PB.THEMES[0]; };
PB.skin = function () { return PB.SKINS.find((t) => t.id === PB.Save.data.skin) || PB.SKINS[0]; };

/* Current high-level mode: 'boot' | 'menu' | 'playing' | 'paused' | 'over' */
PB.mode = 'boot';
PB.setMode = function (m) { PB.mode = m; };
