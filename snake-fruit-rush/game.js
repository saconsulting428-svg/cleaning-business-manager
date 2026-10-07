/* Snake Fruit Rush — offline HTML5 canvas game. No dependencies, no network. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- config
  var COLS = 16, ROWS = 20;
  var FRUIT_POINTS = 10, BONUS_POINTS = 50, BONUS_EVERY = 5, BONUS_MS = 6000;
  var COMBO_MS = 4500;
  var START_LEN = 3, REVIVE_LEN = 6;
  var MIN_INTERVAL = 85;                       // fastest tick (ms) = speed cap
  function baseInterval(score) {               // 180ms @0 -> 145ms @100 -> 110ms @200 -> capped
    return Math.max(MIN_INTERVAL, 180 - score * 0.35);
  }
  function comboMult(streak) { return streak >= 10 ? 2 : streak >= 5 ? 1.5 : streak >= 3 ? 1.2 : 1; }

  var DIRS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };

  var THEMES = {
    ocean:    { name: 'Ocean',    bg1: '#06202e', bg2: '#0b4a5c', a: '#0c3547', b: '#0e3d52', accent: '#2ee6d0', accent2: '#ffd166', s1: '#3ef0c4', s2: '#14907e' },
    forest:   { name: 'Forest',   bg1: '#0b2013', bg2: '#1f5030', a: '#173a24', b: '#1c4429', accent: '#8be36a', accent2: '#ffb347', s1: '#c4f26a', s2: '#5a9a2a' },
    sunset:   { name: 'Sunset',   bg1: '#2a0f2e', bg2: '#7a2a3a', a: '#3e1838', b: '#481d3e', accent: '#ff9a5a', accent2: '#ffd36b', s1: '#ffe08a', s2: '#e8794a' },
    candy:    { name: 'Candy',    bg1: '#2e0c45', bg2: '#6b1f78', a: '#431565', b: '#4d1a72', accent: '#ff7ac8', accent2: '#ffe66d', s1: '#7dffd8', s2: '#2fb59a' },
    midnight: { name: 'Midnight', bg1: '#080818', bg2: '#1d1d52', a: '#11112c', b: '#161638', accent: '#8b7bff', accent2: '#7df9ff', s1: '#7df9ff', s2: '#4a8bd6' }
  };

  // ---------------------------------------------------------------- helpers
  function $(id) { return document.getElementById(id); }
  var Store = {
    get: function (k, d) { try { var v = localStorage.getItem('sfr.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('sfr.' + k, String(v)); } catch (e) { /* ignore */ } }
  };
  function rand(n) { return Math.floor(Math.random() * n); }
  function fmt(n) { return String(n); }

  // ---------------------------------------------------------------- sound (generated, no files)
  var Sfx = (function () {
    var ctx = null, on = Store.get('sound', '1') !== '0';
    function ensure() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(f, dur, type, vol, delay, to) {
      if (!on) return;
      var c = ensure(); if (!c) return;
      var t = c.currentTime + (delay || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    }
    return {
      isOn: function () { return on; },
      toggle: function () { on = !on; Store.set('sound', on ? '1' : '0'); if (on) { ensure(); this.click(); } return on; },
      unlock: ensure,
      click: function () { tone(520, 0.06, 'square', 0.05); },
      eat: function () { tone(520, 0.1, 'sine', 0.14, 0, 820); },
      bonus: function () { tone(660, 0.12, 'triangle', 0.16); tone(880, 0.12, 'triangle', 0.16, 0.09); tone(1175, 0.2, 'triangle', 0.16, 0.18); },
      combo: function () { tone(880, 0.1, 'square', 0.07); tone(1320, 0.16, 'square', 0.07, 0.08); },
      over: function () { tone(330, 0.5, 'sawtooth', 0.14, 0, 70); },
      revive: function () { tone(330, 0.12, 'triangle', 0.14); tone(495, 0.12, 'triangle', 0.14, 0.1); tone(660, 0.2, 'triangle', 0.14, 0.2); },
      tick: function () { tone(440, 0.07, 'sine', 0.08); }
    };
  })();

  // ---------------------------------------------------------------- power-up hooks (none yet)
  // Future power-ups (shield, slow-mo, speed boost, magnet, double score) register here:
  //   PowerUps.register({ id, duration, scoreMult(), tickScale(), absorbCollision(), onTick(dt) })
  // The game already routes score, speed and collisions through these hooks.
  var PowerUps = {
    defs: {}, active: [],
    register: function (def) { this.defs[def.id] = def; },
    activate: function (id) {
      var d = this.defs[id]; if (!d) return;
      this.active = this.active.filter(function (a) { return a.def.id !== id; });
      this.active.push({ def: d, left: d.duration || 0 });
    },
    update: function (dt) {
      for (var i = this.active.length - 1; i >= 0; i--) {
        var a = this.active[i];
        if (a.def.onTick) a.def.onTick(dt);
        a.left -= dt;
        if (a.left <= 0) this.active.splice(i, 1);
      }
    },
    reset: function () { this.active.length = 0; },
    scoreMult: function () { var m = 1; this.active.forEach(function (a) { if (a.def.scoreMult) m *= a.def.scoreMult(); }); return m; },
    tickScale: function () { var m = 1; this.active.forEach(function (a) { if (a.def.tickScale) m *= a.def.tickScale(); }); return m; },
    absorbCollision: function () {
      for (var i = 0; i < this.active.length; i++) {
        var d = this.active[i].def;
        if (d.absorbCollision && d.absorbCollision()) return true;
      }
      return false;
    }
  };

  // ---------------------------------------------------------------- themes
  var themeKey = Store.get('theme', 'ocean');
  if (!THEMES[themeKey]) themeKey = 'ocean';
  var T = THEMES[themeKey];
  var bgCache = null;

  function applyTheme(key) {
    themeKey = key; T = THEMES[key];
    var r = document.documentElement.style;
    r.setProperty('--bg1', T.bg1); r.setProperty('--bg2', T.bg2); r.setProperty('--arena', T.a);
    r.setProperty('--accent', T.accent); r.setProperty('--accent2', T.accent2);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = T.bg1;
    Store.set('theme', key);
    bgCache = null;
    var cards = document.querySelectorAll('.tcard');
    for (var i = 0; i < cards.length; i++) cards[i].classList.toggle('sel', cards[i].dataset.theme === key);
  }

  function buildThemeGrid() {
    var grid = $('themeGrid');
    Object.keys(THEMES).forEach(function (k) {
      var t = THEMES[k], b = document.createElement('button');
      b.className = 'tcard'; b.dataset.theme = k;
      b.innerHTML = '<i style="background:linear-gradient(135deg,' + t.bg2 + ',' + t.bg1 + ');--sn:' + t.s1 + '"></i>' + t.name;
      b.addEventListener('click', function () { Sfx.click(); applyTheme(k); });
      grid.appendChild(b);
    });
  }

  // ---------------------------------------------------------------- fruit sprites (vector, drawn once)
  function circ(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); }
  function leaf(g, x, y, rot) {
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#4cd964';
    g.beginPath(); g.ellipse(0, 0, 0.32, 0.15, 0, 0, 6.2832); g.fill(); g.restore();
  }
  function shine(g, x, y, rx, ry) { g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x, y, rx, ry, -0.5, 0, 6.2832); g.fill(); }
  var FRUIT_DRAW = [
    function apple(g) {
      circ(g, 0, 0.12, 0.7, '#ff4757'); circ(g, 0.12, 0.2, 0.55, 'rgba(160,0,30,.18)');
      shine(g, -0.28, -0.1, 0.1, 0.22);
      g.strokeStyle = '#7b4a1e'; g.lineWidth = 0.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -0.5); g.lineTo(0.08, -0.85); g.stroke();
      leaf(g, 0.3, -0.66, -0.4);
    },
    function strawberry(g) {
      g.fillStyle = '#ff2d55'; g.beginPath(); g.moveTo(0, 0.85);
      g.bezierCurveTo(-1, 0.2, -0.75, -0.55, 0, -0.4); g.bezierCurveTo(0.75, -0.55, 1, 0.2, 0, 0.85); g.fill();
      g.fillStyle = '#ffe27a';
      [[-0.3, 0], [0.3, 0], [0, 0.2], [-0.15, 0.5], [0.15, 0.5], [-0.35, 0.3], [0.35, 0.3], [0, -0.15]].forEach(function (p) {
        g.beginPath(); g.ellipse(p[0], p[1], 0.05, 0.08, 0, 0, 6.2832); g.fill();
      });
      leaf(g, -0.2, -0.45, 0.4); leaf(g, 0.2, -0.45, -0.4); leaf(g, 0, -0.52, 1.57);
    },
    function orange(g) {
      circ(g, 0, 0.1, 0.72, '#ff9f1c'); circ(g, 0.1, 0.18, 0.56, 'rgba(200,80,0,.2)');
      shine(g, -0.3, -0.12, 0.1, 0.22); circ(g, 0, -0.58, 0.07, '#2e7d32'); leaf(g, 0.22, -0.66, -0.3);
    },
    function grape(g) {
      var s = [[-0.4, -0.2], [0, -0.2], [0.4, -0.2], [-0.2, 0.2], [0.2, 0.2], [0, 0.6]];
      s.forEach(function (p) { circ(g, p[0], p[1], 0.33, '#8e44ff'); circ(g, p[0] - 0.1, p[1] - 0.1, 0.07, 'rgba(255,255,255,.55)'); });
      g.strokeStyle = '#7b4a1e'; g.lineWidth = 0.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -0.45); g.lineTo(0.05, -0.8); g.stroke();
      leaf(g, 0.3, -0.7, -0.3);
    },
    function melon(g) {
      g.save(); g.translate(0, -0.3);
      [[0.95, '#2e9e4f'], [0.84, '#d8f5c4'], [0.76, '#ff4d6d']].forEach(function (l) {
        g.fillStyle = l[1]; g.beginPath(); g.arc(0, 0, l[0], 0, Math.PI); g.closePath(); g.fill();
      });
      g.fillStyle = '#2b1b1b';
      [[-0.4, 0.2], [0, 0.35], [0.4, 0.2], [-0.2, 0.0], [0.2, 0.0]].forEach(function (p) {
        g.beginPath(); g.ellipse(p[0], p[1], 0.05, 0.09, 0, 0, 6.2832); g.fill();
      });
      g.restore();
    }
  ];
  function makeSprite(fn, px) {
    var c = document.createElement('canvas'); c.width = c.height = px;
    var g = c.getContext('2d'); g.translate(px / 2, px / 2); g.scale(px / 2.1, px / 2.1); fn(g);
    return c;
  }
  function makeSprites(px) { return FRUIT_DRAW.map(function (f) { return makeSprite(f, px); }); }

  function starPath(g, R, r) {
    g.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5;
      g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rad, Math.sin(a) * rad);
    }
    g.closePath();
  }

  // ---------------------------------------------------------------- screens
  var current = 'home';
  var screens = {};
  function show(name) {
    ['home', 'howto', 'themes', 'game'].forEach(function (n) { screens[n].classList.toggle('active', n === name); });
    var prev = current; current = name;
    if (prev === 'game' && name !== 'game') stopGameLoop();
    if (prev === 'home' && name !== 'home') stopHome();
    if (name === 'home') { $('homeBest').textContent = best; startHome(); }
    if (name === 'game') { startGameLoop(); }
  }

  // ---------------------------------------------------------------- game state
  var best = parseInt(Store.get('best', '0'), 10) || 0;
  var canvas, ctx, cell = 20, dpr = 1, sprites = null;
  var state = 'idle';                  // idle | countdown | playing | paused | dead | ad
  var snake, px, py, dir, dirQueue, acc, interval;
  var fruit, bonus, score, cycle, eaten, streak, comboTimer, mult, revived, newBest;
  var cdLeft, cdNum, deadTimer = 0, clock = 0;
  var particles = [], popups = [];

  function resetGame() {
    var cy = Math.floor(ROWS / 2), cx = 5;
    snake = []; for (var i = 0; i < START_LEN; i++) snake.push({ x: cx - i, y: cy });
    syncPrev();
    dir = DIRS.right; dirQueue = []; acc = 0;
    score = 0; cycle = 0; eaten = 0; streak = 0; comboTimer = 0; mult = 1;
    revived = false; newBest = false; bonus = null; fruit = null;
    particles.length = 0; popups.length = 0;
    PowerUps.reset();
    interval = baseInterval(0);
    fruit = spawnFruit();
    lastHud.score = lastHud.fruits = lastHud.mult = -1;
    hud();
  }
  function syncPrev() { px = snake.map(function (s) { return s.x; }); py = snake.map(function (s) { return s.y; }); }

  function freeCell() {
    var occ = new Uint8Array(COLS * ROWS), free = [], i;
    snake.forEach(function (s) { occ[s.y * COLS + s.x] = 1; });
    if (bonus) occ[bonus.y * COLS + bonus.x] = 1;
    if (fruit) occ[fruit.y * COLS + fruit.x] = 1;
    for (i = 0; i < occ.length; i++) if (!occ[i]) free.push(i);
    if (!free.length) return null;
    var k = free[rand(free.length)];
    return { x: k % COLS, y: Math.floor(k / COLS) };
  }
  function spawnFruit() {
    var c = freeCell(); if (!c) return null;
    c.type = rand(FRUIT_DRAW.length); c.phase = Math.random() * 6.28; return c;
  }
  function spawnBonus() {
    var c = freeCell(); if (!c) return;
    c.t = BONUS_MS; bonus = c;
  }

  // ---------------------------------------------------------------- HUD (DOM touched only on change)
  var lastHud = { score: -1, best: -1, fruits: -1, mult: -1 };
  var elScore, elBest, elFruits, elBar, elCombo, elBanner, elArena;
  function hud() {
    if (lastHud.score !== score) {
      elScore.textContent = score;
      if (lastHud.score !== -1 && score > 0) { elScore.classList.remove('pop'); void elScore.offsetWidth; elScore.classList.add('pop'); }
      lastHud.score = score;
    }
    if (lastHud.best !== best) { elBest.textContent = best; lastHud.best = best; }
    if (lastHud.fruits !== cycle) {
      elFruits.textContent = 'FRUITS: ' + cycle + ' / ' + BONUS_EVERY;
      elBar.style.transform = 'scaleX(' + cycle / BONUS_EVERY + ')';
      lastHud.fruits = cycle;
    }
    if (lastHud.mult !== mult) {
      var up = mult > lastHud.mult;
      elCombo.classList.toggle('on', mult > 1);
      if (mult > 1) {
        elCombo.textContent = 'COMBO x' + fmt(mult);
        if (up) { elCombo.classList.remove('bump'); void elCombo.offsetWidth; elCombo.classList.add('bump'); }
      }
      lastHud.mult = mult;
    }
  }
  function banner(text) {
    elBanner.textContent = text; elBanner.classList.remove('go'); void elBanner.offsetWidth; elBanner.classList.add('go');
  }

  // ---------------------------------------------------------------- input
  function queueDir(d) {
    if (state !== 'playing' && state !== 'countdown') return;
    var last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if (d === last || (d.x === -last.x && d.y === -last.y)) return;
    if (dirQueue.length < 2) dirQueue.push(d);
  }
  function bindInput() {
    var game = $('game'), sx = 0, sy = 0, id = null, MIN = 22;
    game.addEventListener('pointerdown', function (e) {
      Sfx.unlock();
      if (e.target.closest('button')) return;
      id = e.pointerId; sx = e.clientX; sy = e.clientY;
    });
    game.addEventListener('pointermove', function (e) {
      if (e.pointerId !== id) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < MIN) return;
      queueDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.right : DIRS.left) : (dy > 0 ? DIRS.down : DIRS.up));
      sx = e.clientX; sy = e.clientY;
    });
    function end(e) { if (e.pointerId === id) id = null; }
    game.addEventListener('pointerup', end); game.addEventListener('pointercancel', end);
    game.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    Array.prototype.forEach.call(document.querySelectorAll('.dbtn'), function (b) {
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); Sfx.unlock(); queueDir(DIRS[b.dataset.dir]); });
    });

    var KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
    window.addEventListener('keydown', function (e) {
      if (current !== 'game') return;
      var k = KEYS[e.key];
      if (k) { e.preventDefault(); queueDir(DIRS[k]); }
      else if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); if (state === 'paused') resume(); else pause(); }
    });
  }

  // ---------------------------------------------------------------- game flow
  function startGame() {
    resetGame();
    $('overOv').classList.remove('show'); $('pauseOv').classList.remove('show');
    clearTimeout(deadTimer);
    beginCountdown();
  }
  function beginCountdown() {
    state = 'countdown'; cdLeft = 1800; cdNum = 3; acc = 0;
  }
  function pause() {
    if (state !== 'playing' && state !== 'countdown') return;
    state = 'paused'; $('pauseOv').classList.add('show');
  }
  function resume() {
    if (state !== 'paused') return;
    $('pauseOv').classList.remove('show'); beginCountdown();
  }

  function tick() {
    if (dirQueue.length) dir = dirQueue.shift();
    var h = snake[0], nx = h.x + dir.x, ny = h.y + dir.y, i;
    var wall = nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS;
    var eatF = !wall && fruit && fruit.x === nx && fruit.y === ny;
    var eatB = !wall && bonus && bonus.x === nx && bonus.y === ny;
    var grow = eatF || eatB;
    var hitSelf = false;
    if (!wall) {
      var limit = grow ? snake.length : snake.length - 1;   // tail cell frees up when not growing
      for (i = 0; i < limit; i++) if (snake[i].x === nx && snake[i].y === ny) { hitSelf = true; break; }
    }
    if (wall || hitSelf) {
      if (PowerUps.absorbCollision()) return;
      die(); return;
    }
    // prev positions drive smooth interpolation: segment i slides from where segment i was
    var ox = snake.map(function (s) { return s.x; }), oy = snake.map(function (s) { return s.y; });
    snake.unshift({ x: nx, y: ny });
    if (grow) { ox.push(ox[ox.length - 1]); oy.push(oy[oy.length - 1]); } else { snake.pop(); }
    px = ox; py = oy;

    if (eatF) {
      collect(FRUIT_POINTS, nx, ny, FRUIT_DRAW_COLORS[fruit.type]);
      eaten++; cycle++;
      fruit = null;
      if (cycle >= BONUS_EVERY) { cycle = 0; spawnBonus(); banner('BONUS FRUIT!'); }
      fruit = spawnFruit();
    } else if (eatB) {
      collect(BONUS_POINTS, nx, ny, '#ffd23f', true);
      bonus = null;
    }
    interval = baseInterval(score);
    hud();
  }
  var FRUIT_DRAW_COLORS = ['#ff4757', '#ff2d55', '#ff9f1c', '#8e44ff', '#ff4d6d'];

  function collect(base, x, y, color, isBonus) {
    streak = comboTimer > 0 ? streak + 1 : 1;
    comboTimer = COMBO_MS;
    var prevMult = mult;
    mult = comboMult(streak);
    var pts = Math.round(base * mult * PowerUps.scoreMult());
    score += pts;
    if (score > best) { best = score; newBest = true; Store.set('best', best); }
    if (isBonus) Sfx.bonus(); else Sfx.eat();
    if (mult > prevMult) setTimeout(Sfx.combo, 110);
    burst(x + 0.5, y + 0.5, color, isBonus ? 18 : 10);
    popups.push({ x: x + 0.5, y: y + 0.2, text: '+' + pts, life: 0, color: isBonus ? '#ffd23f' : '#ffffff' });
  }

  function burst(cx, cy, color, n) {
    for (var i = 0; i < n && particles.length < 80; i++) {
      var a = Math.random() * 6.28, sp = 2 + Math.random() * 4;
      particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 400 + Math.random() * 300, c: color, r: 0.08 + Math.random() * 0.08 });
    }
  }

  function die() {
    state = 'dead';
    Sfx.over();
    if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) { /* ignore */ } }
    elArena.classList.remove('shake'); void elArena.offsetWidth; elArena.classList.add('shake');
    deadTimer = setTimeout(showGameOver, 650);
  }
  function showGameOver() {
    state = 'dead';
    $('goScore').textContent = score; $('goBest').textContent = best;
    $('goNew').classList.toggle('on', newBest && score > 0);
    var rb = $('btnRevive');
    rb.textContent = revived ? 'REVIVE USED' : '🎁 WATCH AD → REVIVE';
    rb.disabled = revived;
    $('overOv').classList.add('show');
  }

  function reviveSnake() {
    // Safe respawn: short straight snake in the open middle of the arena, heading right.
    var len = Math.min(snake.length, REVIVE_LEN), cy = Math.floor(ROWS / 2), hx = Math.floor(COLS / 2);
    snake = []; for (var i = 0; i < len; i++) snake.push({ x: hx - i, y: cy });
    syncPrev();
    dir = DIRS.right; dirQueue = []; acc = 0;
    // keep pickups off the snake
    if (fruit && onSnake(fruit)) { fruit = null; fruit = spawnFruit(); }
    if (bonus && onSnake(bonus)) bonus = null;
    streak = 0; comboTimer = 0; mult = 1;
    hud();
  }
  function onSnake(p) { return snake.some(function (s) { return s.x === p.x && s.y === p.y; }); }

  function revive() {
    if (revived || state !== 'dead') return;
    state = 'ad';
    showRewardedAd(function onReward() {
      revived = true;
      reviveSnake();
      $('overOv').classList.remove('show');
      Sfx.revive();
      beginCountdown();
    }, function onFail() { state = 'dead'; });
  }

  // ---------------------------------------------------------------- update + render
  var raf = 0, last = 0, running = false;
  function startGameLoop() { if (running) return; running = true; last = performance.now(); resize(); raf = requestAnimationFrame(frame); }
  function stopGameLoop() { running = false; cancelAnimationFrame(raf); clearTimeout(deadTimer); if (state !== 'dead' && state !== 'ad') state = 'idle'; }

  function frame(now) {
    if (!running) return;
    var dt = Math.min(now - last, 50); last = now;
    update(dt); render();
    raf = requestAnimationFrame(frame);
  }

  function update(dt) {
    clock += dt;
    if (state === 'countdown') {
      cdLeft -= dt;
      var n = Math.max(1, Math.ceil(cdLeft / 600));
      if (n !== cdNum) { cdNum = n; Sfx.tick(); }
      if (cdLeft <= 0) { state = 'playing'; acc = 0; }
    } else if (state === 'playing') {
      PowerUps.update(dt);
      acc += dt;
      var step = interval * PowerUps.tickScale();
      while (acc >= step && state === 'playing') { acc -= step; tick(); }
      if (bonus) { bonus.t -= dt; if (bonus.t <= 0) bonus = null; }
      if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) { streak = 0; mult = 1; hud(); } }
    }
    if (state !== 'paused') {
      var i;
      for (i = particles.length - 1; i >= 0; i--) {
        var p = particles[i]; p.life += dt;
        if (p.life >= p.max) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vy += 6 * dt / 1000;
      }
      for (i = popups.length - 1; i >= 0; i--) { popups[i].life += dt; if (popups[i].life > 800) popups.splice(i, 1); }
    }
  }

  function resize() {
    var wrap = $('arenaWrap'), w = wrap.clientWidth - 8, h = wrap.clientHeight - 8;
    if (w < 40 || h < 40) return;
    var c = Math.max(8, Math.floor(Math.min(w / COLS, h / ROWS)));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c === cell && canvas.width === COLS * c * dpr && sprites) return;
    cell = c;
    canvas.style.width = COLS * cell + 'px'; canvas.style.height = ROWS * cell + 'px';
    canvas.width = Math.round(COLS * cell * dpr); canvas.height = Math.round(ROWS * cell * dpr);
    sprites = makeSprites(Math.round(cell * dpr * 1.1));
    bgCache = null;
  }

  function buildBg() {
    var c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
    var g = c.getContext('2d'), s = cell * dpr;
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      g.fillStyle = (x + y) % 2 ? T.a : T.b; g.fillRect(x * s, y * s, Math.ceil(s), Math.ceil(s));
    }
    bgCache = c;
  }

  function render() {
    if (!canvas.width) return;
    if (!bgCache) buildBg();
    var s = cell * dpr, g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(bgCache, 0, 0);
    g.setTransform(s, 0, 0, s, 0, 0);               // 1 unit = 1 cell
    var t = clock / 1000;

    if (fruit) {
      var bob = Math.sin(t * 3 + fruit.phase) * 0.06, sc = 0.9 + Math.sin(t * 4 + fruit.phase) * 0.05;
      g.save(); g.translate(fruit.x + 0.5, fruit.y + 0.5 + bob); g.scale(sc, sc);
      g.drawImage(sprites[fruit.type], -0.55, -0.55, 1.1, 1.1); g.restore();
    }
    if (bonus) drawBonus(g, t);
    drawSnake(g, t);

    var i, p;
    for (i = 0; i < particles.length; i++) {
      p = particles[i]; g.globalAlpha = 1 - p.life / p.max; g.fillStyle = p.c;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 1;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.font = '800 0.8px system-ui, sans-serif';
    for (i = 0; i < popups.length; i++) {
      p = popups[i]; var k = p.life / 800;
      g.globalAlpha = 1 - k * k; g.lineWidth = 0.14; g.strokeStyle = 'rgba(0,0,0,.6)'; g.fillStyle = p.color;
      var yy = p.y - k * 1.4, sc2 = 1 + Math.max(0, 0.25 - k);
      g.save(); g.translate(p.x, yy); g.scale(sc2, sc2); g.strokeText(p.text, 0, 0); g.fillText(p.text, 0, 0); g.restore();
    }
    g.globalAlpha = 1;
    if (state === 'countdown') {
      var frac = (cdLeft % 600) / 600;
      g.save(); g.translate(COLS / 2, ROWS / 2); var z = 1 + (1 - frac) * 0.4; g.scale(z, z);
      g.globalAlpha = 0.4 + frac * 0.6; g.font = '900 4px system-ui, sans-serif';
      g.lineWidth = 0.3; g.strokeStyle = 'rgba(0,0,0,.55)'; g.fillStyle = T.accent2;
      g.strokeText(cdNum, 0, 0); g.fillText(cdNum, 0, 0); g.restore(); g.globalAlpha = 1;
    }
  }

  function drawBonus(g, t) {
    var cx = bonus.x + 0.5, cy = bonus.y + 0.5, left = bonus.t / BONUS_MS;
    if (bonus.t < 1500 && Math.floor(bonus.t / 120) % 2) return;          // blink when about to vanish
    var pulse = 1 + Math.sin(t * 7) * 0.1;
    g.save(); g.translate(cx, cy);
    g.strokeStyle = 'rgba(255,230,120,.9)'; g.lineWidth = 0.09; g.beginPath();
    g.arc(0, 0, 0.78, -Math.PI / 2, -Math.PI / 2 + 6.2832 * left); g.stroke();
    g.scale(pulse, pulse); g.rotate(Math.sin(t * 3) * 0.25);
    g.shadowColor = '#ffd23f'; g.shadowBlur = cell * dpr * 0.6;
    starPath(g, 0.72, 0.34);
    g.fillStyle = '#ffd23f'; g.fill();
    g.shadowBlur = 0; g.lineWidth = 0.07; g.strokeStyle = '#fff3b0'; g.stroke();
    circ(g, -0.14, -0.1, 0.07, 'rgba(255,255,255,.8)');
    g.restore();
  }

  function drawSnake(g, t) {
    var a = state === 'playing' ? Math.min(1, acc / (interval * PowerUps.tickScale())) : (state === 'dead' || state === 'ad' ? 1 : 0);
    var n = snake.length, i, xs = new Array(n), ys = new Array(n);
    for (i = 0; i < n; i++) {
      xs[i] = px[i] + (snake[i].x - px[i]) * a + 0.5;
      ys[i] = py[i] + (snake[i].y - py[i]) * a + 0.5;
    }
    var dead = state === 'dead' || state === 'ad';
    g.lineJoin = 'round'; g.lineCap = 'round';
    function path() { g.beginPath(); g.moveTo(xs[n - 1], ys[n - 1]); for (var k = n - 2; k >= 0; k--) g.lineTo(xs[k], ys[k]); }
    path(); g.strokeStyle = dead ? '#7a2a35' : T.s2; g.lineWidth = 0.86; g.stroke();
    path(); g.strokeStyle = dead ? '#ff5d73' : T.s1; g.lineWidth = 0.62; g.stroke();
    path(); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 0.14; g.stroke();
    // head
    var hx = xs[0], hy = ys[0], d = dir;
    circ(g, hx, hy, 0.46, dead ? '#ff5d73' : T.s1);
    var ex = -d.y * 0.2, ey = d.x * 0.2, fx = d.x * 0.14, fy = d.y * 0.14;
    [-1, 1].forEach(function (sd) {
      var x = hx + fx + ex * sd, y = hy + fy + ey * sd;
      circ(g, x, y, 0.15, '#fff'); circ(g, x + d.x * 0.04, y + d.y * 0.04, 0.075, '#10222b');
    });
  }

  // ---------------------------------------------------------------- home animation
  var homeRaf = 0, homeRun = false, homeSprites = null, homeSize = 0;
  function startHome() {
    if (homeRun) return; homeRun = true; homeRaf = requestAnimationFrame(homeFrame);
  }
  function stopHome() { homeRun = false; cancelAnimationFrame(homeRaf); }
  function homeFrame(now) {
    if (!homeRun) return;
    var c = $('homeCanvas'), w = c.clientWidth, h = c.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
    if (w && h) {
      if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) {
        c.width = Math.round(w * d); c.height = Math.round(h * d);
        homeSprites = makeSprites(Math.round(46 * d)); homeSize = 46;
      }
      var g = c.getContext('2d'), t = now / 1000;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
      g.setTransform(d, 0, 0, d, 0, 0);
      var fr = [[0.12, 0.3], [0.88, 0.25], [0.5, 0.92], [0.1, 0.8], [0.9, 0.78]];
      fr.forEach(function (p, i) {
        var s = 38 + Math.sin(t * 3 + i) * 3;
        g.drawImage(homeSprites[i], p[0] * w - s / 2, p[1] * h - s / 2 + Math.sin(t * 2 + i * 2) * 5, s, s);
      });
      var pts = [], N = 16;
      for (var i = 0; i < N; i++) {
        var u = t * 1.2 - i * 0.17;
        pts.push([w / 2 + Math.sin(u) * w * 0.3, h / 2 + Math.sin(2 * u) * h * 0.26]);
      }
      g.lineJoin = g.lineCap = 'round';
      function path() { g.beginPath(); g.moveTo(pts[N - 1][0], pts[N - 1][1]); for (var k = N - 2; k >= 0; k--) g.lineTo(pts[k][0], pts[k][1]); }
      path(); g.strokeStyle = T.s2; g.lineWidth = 22; g.stroke();
      path(); g.strokeStyle = T.s1; g.lineWidth = 16; g.stroke();
      path(); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 4; g.stroke();
      var hp = pts[0], nx = pts[1];
      var ang = Math.atan2(hp[1] - nx[1], hp[0] - nx[0]);
      g.fillStyle = T.s1; g.beginPath(); g.arc(hp[0], hp[1], 14, 0, 6.2832); g.fill();
      [-1, 1].forEach(function (sd) {
        var ex = hp[0] + Math.cos(ang) * 4 + Math.cos(ang + 1.5708) * 7 * sd, ey = hp[1] + Math.sin(ang) * 4 + Math.sin(ang + 1.5708) * 7 * sd;
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 4.5, 0, 6.2832); g.fill();
        g.fillStyle = '#10222b'; g.beginPath(); g.arc(ex + Math.cos(ang) * 1.5, ey + Math.sin(ang) * 1.5, 2.2, 0, 6.2832); g.fill();
      });
    }
    homeRaf = requestAnimationFrame(homeFrame);
  }

  // ---------------------------------------------------------------- init
  function syncSoundButtons() {
    var icon = Sfx.isOn() ? '🔊' : '🔇';
    Array.prototype.forEach.call(document.querySelectorAll('.sound-btn'), function (b) { b.textContent = icon; });
  }

  function init() {
    ['home', 'howto', 'themes', 'game'].forEach(function (n) { screens[n] = $(n); });
    canvas = $('canvas'); ctx = canvas.getContext('2d');
    elScore = $('hudScore'); elBest = $('hudBest'); elFruits = $('hudFruits'); elBar = $('hudBar');
    elCombo = $('hudCombo'); elBanner = $('banner'); elArena = $('arena');

    buildThemeGrid(); applyTheme(themeKey); syncSoundButtons();
    bindInput();

    function on(id, fn) { $(id).addEventListener('click', function () { Sfx.unlock(); Sfx.click(); fn(); }); }
    on('btnPlay', function () { show('game'); startGame(); });
    on('btnHow', function () { show('howto'); });
    on('btnThemes', function () { show('themes'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (b) {
      b.addEventListener('click', function () { Sfx.click(); show(b.dataset.go); });
    });
    on('btnPause', pause);
    on('btnResume', resume);
    on('btnPauseHome', function () { goHome(); });
    on('btnOverHome', function () { goHome(); });
    on('btnAgain', startGame);
    on('btnRevive', revive);
    Array.prototype.forEach.call(document.querySelectorAll('.sound-btn'), function (b) {
      b.addEventListener('click', function () { Sfx.toggle(); syncSoundButtons(); });
    });

    if (window.ResizeObserver) new ResizeObserver(function () { if (current === 'game') resize(); }).observe($('arenaWrap'));
    window.addEventListener('resize', function () { if (current === 'game') resize(); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { if (current === 'game') resize(); }, 200); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && current === 'game') pause(); });

    resetGame(); state = 'idle';
    $('homeBest').textContent = best;
    startHome();

    if (/[?&]test=1/.test(location.search)) {      // test hook, only active with ?test=1
      window.__sfr = {
        get: function () { return { state: state, score: score, best: best, cycle: cycle, eaten: eaten, bonus: bonus && { x: bonus.x, y: bonus.y, t: bonus.t }, fruit: fruit && { x: fruit.x, y: fruit.y }, snake: snake.map(function (s) { return [s.x, s.y]; }), dir: [dir.x, dir.y], revived: revived, interval: interval, mult: mult, streak: streak, COLS: COLS, ROWS: ROWS }; },
        place: function (o) {
          if (o.snake) { snake = o.snake.map(function (p) { return { x: p[0], y: p[1] }; }); syncPrev(); }
          if (o.dir) { dir = DIRS[o.dir]; dirQueue = []; }
          if (o.fruit) fruit = { x: o.fruit[0], y: o.fruit[1], type: 0, phase: 0 };
          if (o.score !== undefined) { score = o.score; interval = baseInterval(score); }
          if (o.cycle !== undefined) { cycle = o.cycle; }
          if (o.bonus) bonus = { x: o.bonus[0], y: o.bonus[1], t: o.bonus[2] };
          acc = 0; hud();
        }
      };
    }
  }

  function goHome() {
    clearTimeout(deadTimer);
    $('overOv').classList.remove('show'); $('pauseOv').classList.remove('show');
    state = 'idle'; show('home');
  }

  init();
})();
