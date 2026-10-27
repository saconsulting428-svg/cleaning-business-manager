/* Screens: main menu, level map, level intro, plus the screen/overlay state machine.
 * Overlays (pause, complete, failed, tutorial, settings...) are in screens2.js. */
(function (S) {
  'use strict';
  const U = S.UI, G = () => S.gfx, ui = () => S.ui, P = S.play;
  const FONT_CAPS = (s) => s.toUpperCase();

  const SC = S.screens = {
    name: 'menu', t0: 0, ov: null, ovT0: 0, ovP: null, params: {}, selected: 1, mapShake: {}, now: 0, history: [],
    go(name, params) {
      ui().go(() => { SC.name = name; SC.t0 = SC.now; SC.params = params || {}; SC.ov = null; });
    },
    openOverlay(name, params) { SC.ov = name; SC.ovT0 = SC.now; SC.ovP = params || {}; },
    closeOverlay() { SC.ov = null; },
    since() { return SC.now - SC.t0; }
  };

  // ---------- shared pieces ----------
  function coinChip(x, y) {                                       // top-right wallet
    const t = String(S.save.data.coins), w = 54 + t.length * 11;
    ui().chip(x - w, y, w, 36);
    G().img('coin', x - w + 22, y + 19, 26, 26);
    G().text(x - w + 40, y + 19, t, 17, U.ink, { ox: 0 });
    return w;
  }
  function backButton(fn) { ui().round(36, 34, 22, 'back', fn, { id: 'back' }); }
  const frontier = () => Math.min(S.save.data.unlocked, S.levelCount());
  const worldAt = () => S.worldIndex(frontier());

  // ---------- tiny self-playing snake on the home screen (decoration only: it is NOT the game) ----------
  const DEMO = { cols: 14, rows: 7, ms: 150 };
  let demo = null;
  function demoReset() { demo = { snake: [[7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [2, 3]], dir: [1, 0], prev: null, acc: 0, food: [11, 2], kind: 0 }; }
  function demoStep() {
    const d = demo, h = d.snake[0];
    let pick = null, best = 1e9;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((o) => {
      if (o[0] === -d.dir[0] && o[1] === -d.dir[1]) return;
      const n = [h[0] + o[0], h[1] + o[1]];
      if (n[0] < 0 || n[1] < 0 || n[0] >= DEMO.cols || n[1] >= DEMO.rows) return;
      if (d.snake.slice(0, -1).some((p) => p[0] === n[0] && p[1] === n[1])) return;
      // keep a little distance from the edge so the loop looks relaxed
      const edge = Math.min(n[0], n[1], DEMO.cols - 1 - n[0], DEMO.rows - 1 - n[1]);
      const v = Math.abs(n[0] - d.food[0]) + Math.abs(n[1] - d.food[1]) + Math.random() * 0.9 + (edge === 0 ? 0.6 : 0);
      if (v < best) { best = v; pick = o; }
    });
    if (!pick) { demoReset(); return; }
    d.prev = d.snake.map((p) => [p[0], p[1]]);
    d.dir = pick;
    const n = [h[0] + pick[0], h[1] + pick[1]];
    d.snake.unshift(n);
    if (n[0] === d.food[0] && n[1] === d.food[1]) {
      if (d.snake.length > 11) d.snake.pop();
      d.kind = (d.kind + 1) % 5;
      do { d.food = [S.rnd(DEMO.cols), S.rnd(DEMO.rows)]; } while (d.snake.some((p) => p[0] === d.food[0] && p[1] === d.food[1]));
    } else d.snake.pop();
  }
  SC.updateDemo = function (dt) {
    if (!demo) demoReset();
    demo.acc += dt;
    while (demo.acc >= DEMO.ms) { demo.acc -= DEMO.ms; demoStep(); }
  };

  // ---------- main menu ----------
  function drawMenu(now) {
    const g = G(), d = S.save.data, wi = worldAt(), w = S.WORLDS[wi], H = S.H;
    S.drawWorldBg(wi, now);
    g.use(4);
    ui().round(34, 34, 21, 'gear', () => SC.go('settings', { from: 'menu' }), { id: 'gear' });
    ui().round(S.W - 34, 34, 21, d.sfx || d.music ? 'sound' : 'mute', () => { const on = !(d.sfx || d.music); d.sfx = on; d.music = on; S.save.write(); }, { id: 'snd' });
    coinChip(S.W - 66, 16);
    const dy = Math.max(0, Math.round((H - 780) * 0.35)), t = now / 1000;
    // title: the snake and fruit are the identity
    g.img('fruits', 62, 112 + dy + Math.sin(t * 2) * 3, 52, 52, { frame: 'apple', rot: -0.25 });
    g.img('fruits', S.W - 62, 120 + dy + Math.sin(t * 2 + 1) * 3, 48, 48, { frame: 'cherry', rot: 0.25 });
    g.img('fruits', S.W - 92, 70 + dy + Math.sin(t * 2.4) * 3, 30, 30, { frame: 'orange', rot: 0.4 });
    g.text(S.W / 2, 104 + dy, 'SNAKE', 78, U.light, { shadow: '#07170e', shadowDy: 7 });
    g.text(S.W / 2, 162 + dy, 'FRUIT RUSH', 34, U.gold1, { shadow: '#5a3a08', shadowDy: 4 });
    // live snake stage (decoration only: it is NOT the game)
    const hy = 204 + dy, hw = S.W - 28, hh = 262, hx = 14;
    g.rrect(hx, hy + 6, hw, hh, 28, '#000000', 0.3);
    g.rrect(hx, hy, hw, hh, 28, S.shade(w.frame, 0.25));
    g.rrect(hx + 3, hy + 3, hw - 6, hh - 6, 26, w.frame);
    const fx = hx + 8, fy = hy + 8, fw = hw - 16, fh = hh - 16, cs = fw / DEMO.cols;
    g.rrect(fx, fy, fw, fh, 20, w.floorA);
    for (let r = 0; r < DEMO.rows; r++) for (let q = 0; q < DEMO.cols; q++) if ((r + q) & 1) g.rect(fx + q * cs, fy + r * cs, cs, cs, w.floorB);
    g.rrectStroke(fx - 4, fy - 4, fw + 8, fh + 8, 24, w.frame, 1, 9);
    if (!demo) demoReset();
    const k = Math.min(1, demo.acc / DEMO.ms), xy = (c, r) => ({ x: fx + (c + 0.5) * cs, y: fy + (r + 0.5) * (fh / DEMO.rows) });
    const f = xy(demo.food[0], demo.food[1]);
    g.img('fruits', f.x, f.y + Math.sin(now / 160) * 2, cs * 0.8, cs * 0.8, { frame: S.art.FRUIT_FRAMES[demo.kind] });
    const pts = demo.snake.map((cur, i) => {
      const prev = (demo.prev && demo.prev[i]) || cur, jump = Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]) > 1;
      return jump ? xy(cur[0], cur[1]) : xy(prev[0] + (cur[0] - prev[0]) * k, prev[1] + (cur[1] - prev[1]) * k);
    });
    S.snakeClock(now);
    S.snakeDraw.snake(pts, demo.dir, cs / 30, { cell: cs });
    // progress + play
    const cur = frontier(), done = S.save.completedCount(), hasRun = done > 0 || d.attempt, ay = hy + hh + 28;
    g.text(S.W / 2, ay, (hasRun ? 'LEVEL ' + cur + '  ·  ' : 'WORLD 1  ·  ') + w.name.toUpperCase() + '  ·  ' + S.save.totalStars() + ' ★', 13, U.light, { shadow: '#000000', shadowDy: 1.5 });
    ui().bar(S.W / 2 - 90, ay + 14, 180, 8, done / S.levelCount(), w.accent);
    const by = ay + 62;
    ui().button(S.W / 2, by, S.W - 56, 76, hasRun ? 'CONTINUE' : 'PLAY', () => SC.playCurrent(), { style: 'primary', size: 30, id: 'play', icon: 'play' });
    const ry = by + 82;
    ui().round(S.W / 2 - 120, ry, 28, 'skins', () => SC.go('skins', { from: 'menu' }), { id: 'skinsbtn' });
    ui().button(S.W / 2, ry, 150, 54, 'LEVEL MAP', () => SC.go('map', { world: worldAt() }), { size: 15, id: 'mapbtn', icon: 'map' });
    ui().round(S.W / 2 + 120, ry, 28, 'gear', () => SC.go('settings', { from: 'menu' }), { id: 'gear2' });
  }

  // From the home screen: resume an unfinished attempt, otherwise open the current level.
  SC.playCurrent = function () {
    const d = S.save.data;
    if (d.attempt && S.getLevel(d.attempt.level)) {
      const a = d.attempt;
      ui().go(() => { P.start(a.level, { snapshot: a }); SC.name = 'play'; SC.t0 = SC.now; SC.ov = null; SC.openOverlay('pause', { resumed: true }); });
    } else SC.go('intro', { level: frontier(), from: 'menu' });
  };

  // ---------- level map ----------
  function nodeColors(state) {
    if (state === 'done') return { fill: '#ffe36e', edge: '#fff6bd', ring: '#f5ad2f', ink: '#5e4b23' };
    if (state === 'current') return { fill: '#45cf8a', edge: '#b5ffcf', ring: '#e7ffda', ink: '#ffffff' };
    return { fill: '#40516e', edge: '#6f7e97', ring: '#8794ab', ink: '#aab5c9' };
  }
  function drawNode(x, y, level, state, now, stars, wobble) {
    const g = G(), c = nodeColors(state), r = 26, pulse = state === 'current' ? 1 + 0.06 * Math.sin(now / 260) : 1;
    x += wobble || 0;
    g.circle(x, y + 5, r + 1, '#000000', 0.28);
    if (state === 'current') { g.circle(x, y, (r + 9) * pulse, c.edge, 0.22 + 0.12 * Math.sin(now / 260)); }
    g.circle(x, y, r * pulse, c.edge);
    g.circle(x, y, (r - 3) * pulse, c.fill);
    if (state !== 'locked') g.ring(x, y, (r - 8) * pulse, c.ring, 0.7, 2);
    g.circle(x - 8, y - 10, 5, '#ffffff', state === 'locked' ? 0.12 : 0.4);
    if (state === 'locked') ui().icon('lock', x, y + 1, 18, c.ink);
    else g.text(x, y + 0.5, String(level), 19, c.ink);
    if (state === 'done') for (let i = 0; i < 3; i++) ui().star(x + (i - 1) * 14, y + r + 8, 14, i < stars);
  }

  function drawMap(now) {
    const g = G(), d = S.save.data;
    let wi = SC.params.world !== undefined ? SC.params.world : d.world;
    wi = S.clamp(wi, 0, 4);
    SC.params.world = wi;
    const w = S.WORLDS[wi];
    S.drawWorldBg(wi, now);
    g.use(4);
    if (SC.pendingUnlock) {                                         // a level was just unlocked: pop its node when the map opens
      const u = SC.pendingUnlock; SC.pendingUnlock = null;
      if (S.worldIndex(u.level) === wi) { SC.unlockPop = { level: u.level, t: now }; S.audio.sfx.unlock(); }
    }
    if (SC.worldChangeAt === undefined) SC.worldChangeAt = -1e9;
    backButton(() => SC.go('menu'));
    g.text(74, 24, 'LEVEL MAP', 11, U.light, { ox: 0, alpha: 0.78 });
    g.text(74, 48, w.trail, 24, U.light, { ox: 0, shadow: '#07170e', shadowDy: 3 });
    const first = wi * 20 + 1, last = wi * 20 + 20;
    ui().chip(S.W - 14 - 92, 20, 92, 30, { fill: U.cream });
    g.text(S.W - 14 - 46, 35, (first < 10 ? '0' : '') + first + '–' + last, 14, U.ink);
    // progress card
    const done = S.save.worldDone(wi), ws = S.save.worldStars(wi);
    ui().panel(14, 70, S.W - 28, 56, { r: 18, shadow: 4 });
    g.text(32, 90, done + ' / 20 LEVELS', 12.5, U.ink, { ox: 0 });
    ui().bar(32, 102, 190, 12, done / 20, w.accent, '#d9c690');
    ui().star(S.W - 40 - 4, 98, 26, 1);
    g.text(S.W - 62, 98, ws + '', 19, U.ink, { ox: 1 });
    g.text(S.W - 62 + 2, 114, '/ 60', 10, U.inkSoft, { ox: 1, bold: false });
    // world tabs
    for (let i = 0; i < 5; i++) {
      const cx = 52 + i * ((S.W - 104) / 4), cy = 158, open = d.unlocked >= i * 20 + 1, sel = i === wi, ww = S.WORLDS[i];
      g.circle(cx, cy + 4, 24, '#000000', 0.28);
      if (sel) g.circle(cx, cy, 29, '#ffffff', 0.9);
      g.circle(cx, cy, 24, open ? ww.accent : '#4a5568');
      g.circle(cx, cy, 20, open ? S.shade(ww.accent, -0.3) : '#2b3340');
      if (open) { [[0, -9], [8, 5], [-8, 5]].forEach((o) => g.circle(cx + o[0], cy + o[1], 4.2, '#ffffff', 0.85)); }
      else ui().icon('lock', cx, cy, 18, '#9aa5b8');
      g.text(cx, cy + 36, 'W' + (i + 1), 11, U.light, { alpha: sel ? 1 : 0.65 });
      ui().reg('wt' + i, cx - 30, cy - 30, 60, 76, () => { if (!open) ui().showToast('Complete Level ' + (i * 20) + ' to unlock'); else { SC.params.world = i; d.world = i; SC.worldChangeAt = SC.now; S.audio.sfx.click(); } }, false);
    }
    // path panel
    const py = 206, rowGap = S.clamp(Math.round((S.H - 560) / 5 + 8), 64, 80), ph = 64 + rowGap * 4 + 56;
    g.rrect(14, py, S.W - 28, ph, 26, '#000000', 0.26);
    g.text(34, py + 24, 'FOLLOW THE PATH', 11, U.light, { ox: 0, alpha: 0.75 });
    g.text(S.W - 34, py + 24, done + ' / 20', 11, U.light, { ox: 1, alpha: 0.75 });
    const cols = [87, 179, 271, 363], pos = [];
    for (let n = 0; n < 20; n++) { const r = (n / 4) | 0, c = n % 4, cc = r % 2 ? 3 - c : c; pos.push({ x: cols[cc], y: py + 70 + r * rowGap, level: first + n }); }
    // dotted path
    for (let n = 0; n < 19; n++) {
      const a = pos[n], b = pos[n + 1], lit = d.unlocked >= b.level;
      const steps = 6;
      for (let s = 1; s < steps; s++) {
        const t = s / steps; let x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (a.y !== b.y) { const bulge = (n % 4 === 3) ? 1 : 0; x = a.x + (b.x - a.x) * t + bulge * Math.sin(t * Math.PI) * (a.x > 200 ? 26 : -26); }
        g.circle(x, y, 2.8, lit ? w.accent2 : '#ffffff', lit ? 0.95 : 0.3);
      }
    }
    const slide = (1 - S.ease.out(S.prog(now, SC.worldChangeAt, 0, 260))) * 26;
    pos.forEach((p) => {
      p = { x: p.x + slide, y: p.y, level: p.level };
      const lv = p.level, unlocked = lv <= d.unlocked, doneL = d.completed[lv - 1] === 1;
      const state = doneL ? 'done' : (unlocked ? 'current' : 'locked');
      const wob = SC.mapShake[lv] && now - SC.mapShake[lv] < 360 ? Math.sin((now - SC.mapShake[lv]) / 28) * 5 * (1 - (now - SC.mapShake[lv]) / 360) : 0;
      let pop = 0;
      if (SC.unlockPop && SC.unlockPop.level === lv) { const a = now - SC.unlockPop.t; if (a < 900) pop = 1; }
      drawNode(p.x, p.y, lv, state, now, d.stars[lv - 1], wob);
      if (pop) g.ring(p.x, p.y, 26 + (now - SC.unlockPop.t) / 14, '#ffffff', 1 - (now - SC.unlockPop.t) / 900, 3);
      ui().reg('n' + lv, p.x - 34, p.y - 32, 68, 78, () => {
        if (!unlocked) { SC.mapShake[lv] = now; S.audio.sfx.err(); ui().showToast('Complete Level ' + (lv - 1) + ' first'); return; }
        d.world = wi; SC.go('intro', { level: lv, from: 'map' });
      }, true);
    });
    // footer
    const cur = Math.min(d.unlocked, S.levelCount());
    const fy = py + ph + 18;
    ui().chip(S.W / 2 - 60, fy - 14, 120, 28, { fill: '#fff1a6', edge: '#d9b640' });
    g.text(S.W / 2, fy, 'LEVEL ' + cur, 13, '#6d4b12');
    ui().button(S.W / 2, fy + 46, S.W - 60, 58, 'PLAY LEVEL ' + cur, () => { d.world = S.worldIndex(cur); SC.go('intro', { level: cur, from: 'map' }); }, { style: 'primary', size: 21, id: 'playcur' });
  }

  // ---------- level intro ----------
  function drawMiniBoard(x, y, size, lv, now) {                       // a tiny preview of the whole puzzle
    const g = G(), c = size / 8, w = S.WORLDS[S.worldIndex(lv.id)];
    g.rrect(x - 3, y - 3, size + 6, size + 6, 12, w.frame);
    g.rect(x, y, size, size, w.floorA);
    for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) if ((r + q) & 1) g.rect(x + q * c, y + r * c, c, c, w.floorB);
    const at = (cell) => ({ x: x + (cell[0] + 0.5) * c, y: y + (cell[1] + 0.5) * c });
    lv.board.walls.forEach((cell) => g.rect(x + cell[0] * c + 0.5, y + cell[1] * c + 0.5, c - 1, c - 1, S.shade(w.wall[0], 0.0)));
    lv.board.ice.forEach((cell) => g.rect(x + cell[0] * c, y + cell[1] * c, c, c, '#bfeaff'));
    lv.items.forEach((it) => { const p = at(it.cell); if (it.type === 'bomb') g.circle(p.x, p.y, c * 0.36, '#1f2937'); else if (it.type === 'key') g.circle(p.x, p.y, c * 0.3, '#ffd34d'); else g.circle(p.x, p.y, c * 0.3, it.required === false ? '#fff4ae' : '#ef3f43'); });
    lv.devices.forEach((d) => { if (d.type === 'portal') d.cells.forEach((cell) => { const p = at(cell); g.circle(p.x, p.y, c * 0.36, '#7a6cff'); }); else { const p = at(d.cell); g.rect(p.x - c * 0.3, p.y - c * 0.3, c * 0.6, c * 0.6, d.type === 'door' ? '#b67a43' : (d.type === 'gate' ? '#3fa6a0' : '#48d8bf')); } });
    const e = at(lv.exit.cell); g.circle(e.x, e.y, c * 0.4, '#64e5bb'); g.ring(e.x, e.y, c * 0.45, '#ffffff', 0.9, 1.5);
    const s = lv.snake, dd = S.engine.DIRS[s.direction];
    for (let i = s.length - 1; i >= 0; i--) { const p = at([s.head[0] - dd[0] * i, s.head[1] - dd[1] * i]); g.circle(p.x, p.y, c * (i ? 0.34 : 0.42), i ? '#2d9d4e' : '#86ff74'); }
  }

  function drawIntro(now) {
    const g = G(), d = S.save.data, id = SC.params.level || frontier(), lv = S.getLevel(id), wi = S.worldIndex(id), w = S.WORLDS[wi];
    S.drawWorldBg(wi, now);
    g.use(4);
    backButton(() => SC.go(SC.params.from === 'map' ? 'map' : 'menu'));
    g.text(S.W / 2, 28, 'LEVEL BRIEFING', 11.5, U.light, { alpha: 0.8 });
    ui().chip(S.W / 2 - 62, 44, 124, 26, { fill: '#e8f5c8', edge: '#a3d849' });
    g.text(S.W / 2, 57, 'WORLD ' + (wi + 1) + ' · ' + w.name.toUpperCase(), 10.5, '#3f6a1b');
    const a = S.ease.out(S.prog(now, SC.t0, 0, 380));
    g.text(S.W / 2, 100 + (1 - a) * 14, 'LEVEL ' + id, 44, U.light, { shadow: '#07170e', shadowDy: 5, alpha: a });
    const stars = d.stars[id - 1];
    ui().starRow(S.W / 2, 140, 22, stars);
    // objective card with mini preview
    const oy = 164, bs = 92;
    ui().panel(14, oy, S.W - 28, 118, { r: 22, shadow: 6 });
    g.text(32, oy + 24, 'YOUR OBJECTIVE', 10.5, U.inkSoft, { ox: 0 });
    g.text(32, oy + 62, S.objectiveText(lv), 16.5, U.ink, { ox: 0, wrap: 262, align: 'left' });
    drawMiniBoard(S.W - 14 - 20 - bs, oy + 14, bs, lv, now);
    // star goals
    const gy = oy + 134, goals = S.starGoals(lv);
    ui().panel(14, gy, S.W - 28, 138 + goals.extras.length * 18, { r: 22, shadow: 6 });
    g.text(32, gy + 24, 'EARN UP TO 3 STARS', 10.5, U.inkSoft, { ox: 0 });
    [[1, goals.one], [2, goals.two], [3, goals.three]].forEach((r, i) => {
      const yy = gy + 52 + i * 30 + (i === 2 ? 0 : 0);
      ui().star(46, yy, 24, stars >= r[0]);
      g.text(70, yy, r[1], 15, U.ink, { ox: 0 });
    });
    goals.extras.forEach((e, i) => g.text(70, gy + 52 + 3 * 30 + 4 + i * 18 - 6, '+ ' + e, 12, U.inkSoft, { ox: 0, bold: false }));
    // play
    const by = S.H - 56;
    ui().button(S.W / 2, by, S.W - 40, 62, 'PLAY LEVEL ' + id, () => SC.startLevel(id), { style: 'primary', size: 23, id: 'playlevel' });
  }

  // Start a level (shows the mechanic tutorial first the first time it appears)
  SC.startLevel = function (id) {
    const mech = S.mechForLevel(id), d = S.save.data;
    if (mech && !d.seen[mech] && S.tutorials[mech]) { SC.openOverlay('tutorial', { mech: mech, level: id }); return; }
    SC.beginPlay(id);
  };
  SC.beginPlay = function (id, opts) {
    const d = S.save.data;
    d.current = id; d.attempt = null; S.save.write();
    ui().go(() => { P.start(id, opts); SC.name = 'play'; SC.t0 = SC.now; SC.ov = null; });
  };

  S.drawMenu = drawMenu; S.drawMap = drawMap; S.drawIntro = drawIntro; S.drawNode = drawNode; S.coinChip = coinChip; S.backButton = backButton;
})(window.SFR);
