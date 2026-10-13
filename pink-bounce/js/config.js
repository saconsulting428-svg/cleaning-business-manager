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
  SLIT_Y: 768,           // a ball whose centre passes this line is lost

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

/* ---- persistent best score (localStorage may be unavailable) ---- */
PB.loadBest = function () {
  try { return parseInt(localStorage.getItem('pinkBounceBest'), 10) || 0; } catch (e) { return 0; }
};
PB.saveBest = function (v) {
  try { localStorage.setItem('pinkBounceBest', String(Math.floor(v))); } catch (e) { /* ignore */ }
};

/* Current high-level mode: 'boot' | 'menu' | 'playing' | 'paused' | 'over' */
PB.mode = 'boot';
PB.setMode = function (m) { PB.mode = m; };
