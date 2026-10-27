/* Overlays and utility screens: pause, level complete, level failed, mechanic tutorials, settings, skins. */
(function (S) {
  'use strict';
  const U = S.UI, G = () => S.gfx, ui = () => S.ui, P = S.play, SC = S.screens, A = () => S.audio;

  // ---------- overlay card helper ----------
  function card(now, t0, w, h, cy, dim) {
    const e = S.prog(now, t0, 0, 320), dy = (1 - S.ease.back(e)) * 50, a = S.ease.out(S.prog(now, t0, 0, 220));
    G().use(5);
    G().rect(0, 0, S.W, S.H, '#030b06', (dim === undefined ? 0.58 : dim) * a);
    ui().clearButtons();
    const x = (S.W - w) / 2, y = Math.round(cy - h / 2 + dy);
    ui().panel(x, y, w, h, { r: 30, shadow: 8 });
    return { x: x, y: y, w: w, h: h, cx: S.W / 2, age: now - t0 };
  }
  const cy0 = () => S.H / 2 + 4;

  // ---------- pause ----------
  SC.pause = function () {
    if (P.mode !== 'run') return;
    P.pause(); A().sfx.click();
    SC.openOverlay('pause', {});
  };
  function drawPause(now) {
    const g = G(), d = S.save.data, lv = P.lv, c = card(now, SC.ovT0, 348, 424, cy0());
    g.use(5);
    g.text(c.cx, c.y + 48, 'PAUSED', 34, U.ink);
    g.text(c.cx, c.y + 80, 'Level ' + lv.id + ' · progress saved', 13, U.inkSoft, { bold: false });
    S.snakeClock(now);
    S.snakeDraw.head(S.activeSkin(), c.cx, c.y + 124, 1, 0, 1.6, null);
    ui().button(c.cx, c.y + 188, 292, 58, SC.ovP && SC.ovP.resumed ? 'RESUME' : 'RESUME', () => { SC.closeOverlay(); P.resume(); }, { style: 'primary', size: 21, id: 'resume' });
    ui().button(c.cx, c.y + 252, 292, 50, 'RESTART LEVEL', () => { SC.closeOverlay(); SC.beginPlay(lv.id); }, { size: 17, id: 'restart' });
    ui().button(c.cx, c.y + 310, 292, 50, 'LEVEL MAP', () => { SC.closeOverlay(); d.world = S.worldIndex(lv.id); SC.go('map'); }, { size: 17, id: 'tomap' });
    g.text(c.x + 40, c.y + 376, 'SOUND', 12, U.inkSoft, { ox: 0 });
    ui().toggle(c.x + 130, c.y + 376, d.sfx, () => { d.sfx = !d.sfx; S.save.write(); }, 'p-sfx');
    g.text(c.x + 196, c.y + 376, 'MUSIC', 12, U.inkSoft, { ox: 0 });
    ui().toggle(c.x + 290, c.y + 376, d.music, () => { d.music = !d.music; S.save.write(); }, 'p-mus');
  }

  // ---------- level complete ----------
  function drawComplete(now) {
    const g = G(), r = P.result, lv = P.lv, wi = S.worldIndex(lv.id), w = S.WORLDS[wi], d = S.save.data;
    const last = lv.id >= S.levelCount(), goals = S.starGoals(lv);
    const c = card(now, SC.ovT0, 360, 548, cy0(), 0.5), age = c.age;
    g.use(5);
    // medal
    const bob = Math.sin(now / 400) * 2;
    g.circle(c.cx, c.y + 20 + bob, 46, '#000000', 0.18);
    g.circle(c.cx, c.y + 14 + bob, 44, w.accent);
    g.circle(c.cx, c.y + 14 + bob, 38, S.shade(w.accent, -0.35));
    g.circle(c.cx, c.y + 14 + bob, 34, S.shade(w.accent, 0.15));
    ui().star(c.cx, c.y + 14 + bob, 44, 1);
    g.text(c.cx, c.y + 84, last ? 'CAMPAIGN COMPLETE!' : 'LEVEL COMPLETE!', last ? 24 : 28, U.ink);
    g.text(c.cx, c.y + 110, w.name.toUpperCase() + ' · LEVEL ' + lv.id, 12, U.inkSoft);
    // stars (reveal one by one)
    ui().starRow(c.cx, c.y + 164, 54, r.stars, now, SC.ovT0 + 200);
    for (let i = 0; i < r.stars; i++) {
      const t = SC.ovT0 + 200 + 240 + i * 260;
      if (now >= t && !SC.ovP['s' + i]) { SC.ovP['s' + i] = 1; A().sfx.star(i); A().buzz(15); const L = P.layout(); P.burst(S.W / 2 + (i - 1) * 64, c.y + 164, '#ffe879', 8, 0.14); }
    }
    const label = r.stars === 3 ? 'PERFECT ESCAPE!' : (r.stars === 2 ? 'GREAT ESCAPE!' : 'ESCAPED!');
    g.text(c.cx, c.y + 214, label, 15, w.id === 'night' ? '#7a5cd6' : '#2d7a3c');
    if (r.newBest && !r.first) { ui().chip(c.x + c.w - 98, c.y + 202, 70, 24, { fill: '#e8f5c8', edge: '#a3d849' }); g.text(c.x + c.w - 63, c.y + 214, 'NEW BEST', 10, '#3f6a1b'); }
    // stats
    g.rrect(c.x + 22, c.y + 234, c.w - 44, 72, 18, U.cream2); g.rrectStroke(c.x + 22, c.y + 234, c.w - 44, 72, 18, U.creamEdge, 1, 2);
    g.text(c.x + 22 + 70, c.y + 254, 'MOVES', 10.5, U.inkSoft);
    g.text(c.x + 22 + 70, c.y + 282, r.moves + ' / ' + lv.starRules.two.value, 24, U.ink);
    g.line(c.cx, c.y + 246, c.cx, c.y + 294, U.creamEdge, 2);
    const shown = Math.round(r.coins * S.ease.out(S.prog(now, SC.ovT0, 700, 800)));
    g.img('coin', c.cx + 42, c.y + 276, 34, 34);
    g.text(c.cx + 66, c.y + 276, '+' + shown, 26, '#a8631a', { ox: 0 });
    g.text(c.cx + 96, c.y + 252, r.first ? 'FIRST CLEAR' : 'REPLAY', 10, U.inkSoft);
    // goals
    const stars = r.stars;
    [[1, goals.one], [2, goals.two], [3, goals.three]].forEach((row, i) => {
      const yy = c.y + 330 + i * 27;
      ui().star(c.x + 38, yy, 20, stars >= row[0]);
      g.text(c.x + 56, yy, row[1], 13, stars >= row[0] ? U.ink : U.inkFaint, { ox: 0, bold: stars >= row[0] });
      if (stars >= row[0]) { g.circle(c.x + c.w - 36, yy, 9, U.green); ui().icon('check', c.x + c.w - 36, yy, 11, '#ffffff'); }
    });
    if (r.unlockedNew && lv.id % 20 === 0 && !last) {
      ui().chip(c.cx - 110, c.y + 416, 220, 26, { fill: '#fff1a6', edge: '#d9b640' });
      g.text(c.cx, c.y + 429, 'WORLD ' + (wi + 2) + ' UNLOCKED!', 12, '#6d4b12');
    }
    // buttons (live after a short delay so a late swipe cannot tap them)
    const live = age > 650;
    const nextLabel = last ? 'LEVEL MAP' : 'NEXT LEVEL';
    ui().button(c.cx, c.y + c.h - 106, c.w - 52, 56, nextLabel, () => { if (last) { SC.go('map'); } else { d.world = S.worldIndex(lv.id + 1); SC.go('intro', { level: lv.id + 1, from: 'map' }); } }, { style: 'primary', size: 21, id: 'next', disabled: !live });
    ui().button(c.x + 22 + 80, c.y + c.h - 44, 160, 44, 'REPLAY', () => SC.beginPlay(lv.id), { size: 15, id: 'replay', disabled: !live });
    ui().button(c.x + c.w - 22 - 80, c.y + c.h - 44, 160, 44, 'LEVEL MAP', () => { d.world = S.worldIndex(lv.id); SC.go('map'); }, { size: 15, id: 'cmap', disabled: !live });
  }

  // ---------- level failed ----------
  const REASON = {
    wall: ['Wall', 'You hit a wall. Turn a little earlier!'],
    body: ['Tail', 'Your own body blocked the way. Plan your length!'],
    trap: ['Trap', 'Boom! Steer clear of the bombs.'],
    door: ['Locked door', 'That door needs its key first.'],
    moves: ['Out of moves', 'No moves left. Look for a shorter route!']
  };
  const fails = {};
  SC.noteFail = (id) => { fails[id] = (fails[id] || 0) + 1; };
  SC.failCount = (id) => fails[id] || 0;
  function drawFailed(now) {
    const g = G(), lv = P.lv, d = S.save.data, info = P.failInfo || { reason: 'wall' }, rs = REASON[info.reason] || REASON.wall;
    const hint = S.ads.available() && lv.solution && SC.failCount(lv.id) >= 2;
    const c = card(now, SC.ovT0, 348, hint ? 470 : 404, cy0());
    g.use(5);
    S.snakeClock(now);
    S.snakeDraw.head(S.activeSkin(), c.cx, c.y + 70, 1, 0, 1.7, null);
    for (let i = 0; i < 3; i++) { const a = now / 300 + i * 2.1; g.circle(c.cx + Math.cos(a) * 34, c.y + 38 + Math.sin(a) * 9, 4, '#ffd34d'); }
    g.text(c.cx, c.y + 126, 'LEVEL FAILED', 28, U.ink);
    g.text(c.cx, c.y + 162, rs[1], 14, U.inkSoft, { wrap: 290, bold: false });
    const req = P.rt.fruits.filter((f) => f.required).length, have = P.rt.fruits.filter((f, i) => f.required && ((P.st.fruitMask >> i) & 1)).length;
    ui().chip(c.cx - 100, c.y + 196, 200, 28, { fill: '#efe6c4', edge: '#c9b77a' });
    g.text(c.cx, c.y + 210, 'LEVEL ' + lv.id + ' · ' + have + ' / ' + req + ' FRUIT', 11.5, U.inkSoft);
    const live = c.age > 500;
    ui().button(c.cx, c.y + 266, 292, 62, 'TRY AGAIN', () => SC.beginPlay(lv.id), { style: 'primary', size: 23, id: 'retry', disabled: !live, icon: 'retry' });
    let y = c.y + 336;
    if (hint) {
      ui().button(c.cx, y, 292, 48, 'SHOW ROUTE (WATCH AD)', () => SC.watchHint(lv.id), { size: 14.5, id: 'hintad', icon: 'video', disabled: !live });
      y += 62;
    }
    ui().button(c.cx, y, 292, 48, 'LEVEL MAP', () => { d.world = S.worldIndex(lv.id); SC.go('map'); }, { size: 16, id: 'fmap', disabled: !live });
    g.text(c.cx, c.y + c.h - 18, SC.failCount(lv.id) >= 3 ? 'Tip: the star goals show what a perfect route looks like.' : 'Every try shows you more of the route.', 10.5, U.inkFaint, { bold: false });
  }
  // watch a rewarded ad, then restart with the route shown
  SC.watchHint = function (id) {
    SC.ov = 'ad'; SC.ovT0 = SC.now; SC.ovP = { level: id, msg: '' };
    S.ads.request((ok, msg) => {
      if (SC.ov !== 'ad') return;
      if (ok) SC.beginPlay(id, { hint: true });
      else { SC.ov = 'failed'; SC.ovP = {}; ui().showToast(msg || 'Ad not available.'); }
    });
  };
  function drawAdWait(now) {
    const g = G(), c = card(now, SC.ovT0, 330, 260, cy0(), 0.7);
    g.use(5);
    if (S.ads.isTest()) {
      g.text(c.cx, c.y + 50, 'TEST AD', 26, U.ink);
      g.text(c.cx, c.y + 82, 'Developer test mode (?testads=1)', 11.5, U.inkSoft, { bold: false });
      g.text(c.cx, c.y + 130, String(Math.max(0, Math.ceil(S.ads.testLeft / 1000))), 50, U.ink);
    } else {
      g.text(c.cx, c.y + 60, 'Loading ad...', 24, U.ink);
      g.text(c.cx, c.y + 96, 'The route appears after the ad finishes.', 12, U.inkSoft, { bold: false });
      for (let i = 0; i < 3; i++) g.circle(c.cx + (i - 1) * 22, c.y + 138 + Math.sin(now / 200 + i) * 5, 6, U.gold2);
    }
    if (c.age > 4000 || S.ads.isTest()) ui().button(c.cx, c.y + 208, 200, 44, 'CANCEL', () => S.ads.cancel(), { size: 15, id: 'adcancel' });
  }

  // ---------- mechanic tutorials ----------
  S.tutorials = {
    basic: { title: 'EAT FRUIT, FIND THE EXIT', sub: 'THE BASICS', scene: 'basic',
      steps: [['fruit', 'Swipe to turn', 'The snake keeps moving by itself. You only choose where it turns.'], ['exit', 'Eat, then escape', 'Eat every fruit. The glowing exit opens, then drive the head onto it.']] },
    wall: { title: 'WALLS BLOCK THE WAY', sub: 'NEW MECHANIC', scene: 'wall',
      steps: [['wall', 'Walls are solid', 'Hitting a wall ends the attempt. Turn in time and go around.'], ['fruit', 'Look ahead', 'The whole board is always visible. Plan your route first.']] },
    optional: { title: 'BONUS FRUIT', sub: 'NEW MECHANIC', scene: 'optional',
      steps: [['fruit', 'Rings mean optional', 'Ringed fruit is a bonus. It makes you longer and may be needed for 3 stars.'], ['wall', 'Longer = tighter', 'A long snake needs more room. Skip the bonus if it blocks your way out.']] },
    cap: { title: 'MOVE CAP', sub: 'NEW MECHANIC', scene: 'cap',
      steps: [['exit', 'Count your moves', 'Some levels end when the moves run out. The counter turns red when you get close.'], ['fruit', 'Shortest route wins', 'Find a direct path to every fruit and then the exit.']] },
    key: { title: 'KEYS OPEN LOCKED DOORS', sub: 'NEW MECHANIC', scene: 'key',
      steps: [['key', 'Pick up the key', 'Drive the head onto the key to collect it.'], ['door', 'The door opens', 'The matching door opens for the rest of the attempt.']] },
    switch: { title: 'SWITCHES OPEN GATES', sub: 'NEW MECHANIC', scene: 'switch',
      steps: [['switch', 'Step on the switch', 'Driving onto it toggles the linked gate (dotted line).'], ['gate', 'Gates change', 'A closed gate is a wall. Step on the switch again to toggle it back.']] },
    bomb: { title: 'BOMBS ARE DEADLY', sub: 'NEW MECHANIC', scene: 'bomb',
      steps: [['bomb', 'Never touch a bomb', 'Bombs stay where they are. Touching one ends the attempt.'], ['fruit', 'Use the safe lanes', 'Plan a route around them before you start.']] },
    ice: { title: 'ICE MAKES YOU SLIDE', sub: 'NEW MECHANIC', scene: 'ice',
      steps: [['ice', 'You cannot steer on ice', 'The snake slides straight until it leaves the ice.'], ['wall', 'It stops at walls', 'At the end of the ice you stop safely, then swipe to continue.']] },
    portal: { title: 'PORTALS TELEPORT', sub: 'NEW MECHANIC', scene: 'portal',
      steps: [['portal', 'Enter one, exit the other', 'The head jumps to the linked portal and keeps its direction.'], ['wall', 'Keep the exit clear', 'Your body must not be on the other portal when you jump.']] }
  };
  // tiny animated scenes (7 x 3 cells)
  const SCENES = {
    basic: { path: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]], fruit: [[3, 1]], exit: [6, 1] },
    wall: { path: [[0, 1], [1, 1], [2, 1], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]], wall: [[3, 1], [3, 2], [4, 1], [4, 2]], exit: [6, 0], fruit: [[5, 0]] },
    optional: { path: [[0, 1], [1, 1], [2, 1], [3, 1], [3, 0], [4, 0], [4, 1], [5, 1], [6, 1]], fruit: [[2, 1]], bonus: [[3, 0]], exit: [6, 1] },
    cap: { path: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]], fruit: [[3, 1]], exit: [6, 1], counter: 10 },
    key: { path: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]], key: [2, 1], door: [4, 1], exit: [6, 1] },
    switch: { path: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]], sw: [2, 1], gate: [4, 1], exit: [6, 1] },
    bomb: { path: [[0, 1], [1, 1], [2, 1], [2, 0], [3, 0], [4, 0], [4, 1], [5, 1], [6, 1]], bomb: [[3, 1]], exit: [6, 1] },
    ice: { path: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 0], [6, 0]], ice: [[2, 1], [3, 1], [4, 1]], wall: [[6, 1]], exit: [6, 0] },
    portal: { path: [[0, 1], [1, 1], [5, 1], [6, 1]], portal: [[1, 1], [5, 1]], wall: [[2, 1], [3, 1], [4, 1], [2, 0], [3, 0], [4, 0]], exit: [6, 1] }
  };
  function drawScene(kind, x, y, now, wi) {
    const g = G(), sc = SCENES[kind], w = S.WORLDS[wi], cs = 44, W7 = cs * 7, H3 = cs * 3;
    g.rrect(x - 5, y - 5, W7 + 10, H3 + 10, 20, w.frame);
    g.rect(x, y, W7, H3, w.floorA);
    for (let r = 0; r < 3; r++) for (let q = 0; q < 7; q++) if ((r + q) & 1) g.rect(x + q * cs, y + r * cs, cs, cs, w.floorB);
    g.rrectStroke(x - 3, y - 3, W7 + 6, H3 + 6, 16, w.frame, 1, 8);
    const at = (c) => ({ x: x + (c[0] + 0.5) * cs, y: y + (c[1] + 0.5) * cs });
    const len = sc.path.length, T = 340, loop = (len + 5) * T, tt = Math.max(0, (now % loop) - 2 * T), hi = Math.min(len - 1, tt / T);
    const idxOf = (cell) => sc.path.findIndex((p) => p[0] === cell[0] && p[1] === cell[1]);
    (sc.wall || []).forEach((c) => { const p = at(c); g.img('wall' + wi, p.x, p.y, cs * 1.05, cs * 1.05, { z: c[1] }); });
    (sc.ice || []).forEach((c) => { const p = at(c); g.img('ice', p.x, p.y, cs * 1.02, cs * 1.02, { z: c[1] }); });
    (sc.bomb || []).forEach((c) => { const p = at(c); g.circle(p.x, p.y + 3, cs * 0.5, '#ef4444', 0.18); g.img('bomb', p.x, p.y, cs * 0.9, cs * 0.9, { z: 5 }); });
    (sc.fruit || []).forEach((c) => { if (hi > idxOf(c) + 0.2) return; const p = at(c); g.img('fruits', p.x, p.y + Math.sin(now / 250) * 2, cs * 0.78, cs * 0.78, { frame: 'apple', z: 5 }); });
    (sc.bonus || []).forEach((c) => { if (hi > idxOf(c) + 0.2) return; const p = at(c); g.ring(p.x, p.y, cs * 0.42, '#fff4ae', 0.9, 2.5); g.img('fruits', p.x, p.y, cs * 0.74, cs * 0.74, { frame: 'strawberry', z: 5 }); g.img('stars', p.x + 14, p.y - 15, 13, 13, { frame: 1, z: 6 }); });
    if (sc.key && hi < idxOf(sc.key) + 0.1) { const p = at(sc.key); g.img('key', p.x, p.y + Math.sin(now / 240) * 2, cs * 0.8, cs * 0.8, { z: 5 }); }
    if (sc.door) { const opened = hi >= idxOf(sc.key) + 0.1, p = at(sc.door); g.img('door', p.x, p.y + cs * 0.5, cs * 0.9, cs * 1.18, { oy: 1, z: 6, alpha: opened ? Math.max(0, 1 - (hi - idxOf(sc.key) - 0.1) * 2) : 1 }); }
    if (sc.sw) { const p = at(sc.sw), lit = hi >= idxOf(sc.sw); g.img('switch', p.x, p.y, cs * 0.84, cs * 0.84, { z: 5, alpha: lit ? 0.8 : 1 }); const q = at(sc.gate); for (let i = 1; i < 6; i++) g.circle(p.x + (q.x - p.x) * i / 6, p.y + (q.y - p.y) * i / 6 - 14, 2, '#48d8bf', 0.55); }
    if (sc.gate) { const open = hi >= idxOf(sc.sw), p = at(sc.gate); g.img('gate', p.x, p.y + cs * 0.5, cs * 0.9, cs * 1.18, { oy: 1, z: 6, alpha: open ? 0.25 : 1 }); }
    (sc.portal || []).forEach((c, i) => { const p = at(c); g.img('tele0', p.x, p.y, cs * 1.0, cs * 1.0, { frame: i ? 'b' : 'a', z: 5 }); });
    if (sc.exit) { const p = at(sc.exit), ready = hi > 1; g.img('exit' + wi, p.x, p.y - 2, cs * 1.1, cs * 1.1, { z: 5, alpha: ready ? 1 : 0.5 }); }
    // snake
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const h = Math.max(0, hi - i), a = Math.floor(h), b = Math.min(len - 1, a + 1), f = h - a;
      let pa = sc.path[a], pb = sc.path[b];
      if (Math.abs(pa[0] - pb[0]) + Math.abs(pa[1] - pb[1]) > 1) pb = pa;       // portal jump
      pts.push(at([pa[0] + (pb[0] - pa[0]) * f, pa[1] + (pb[1] - pa[1]) * f]));
    }
    const hp = Math.min(len - 2, Math.floor(hi)), nx = sc.path[hp + 1], cu = sc.path[hp];
    let dir = [Math.sign(nx[0] - cu[0]), Math.sign(nx[1] - cu[1])];
    if (Math.abs(nx[0] - cu[0]) + Math.abs(nx[1] - cu[1]) > 1) dir = [1, 0];
    S.snakeClock(now);
    S.snakeDraw.snake(pts, dir.some((v) => v) ? dir : [1, 0], cs / 24, { cell: cs });
    if (sc.counter) {
      const n = Math.min(10, Math.floor(hi * 1.4));
      g.rrect(x + W7 - 112, y + 6, 104, 30, 15, '#000000', 0.45);
      g.text(x + W7 - 60, y + 21, n + ' / ' + sc.counter, 15, n >= 8 ? '#ff8a7a' : '#ffffff');
    }
  }
  function drawTutorial(now) {
    const g = G(), mech = SC.ovP.mech, tut = S.tutorials[mech], lvId = SC.ovP.level, wi = S.worldIndex(lvId);
    const c = card(now, SC.ovT0, 398, 570, cy0(), 0.62);
    g.use(5);
    ui().chip(c.cx - 62, c.y + 18, 124, 26, { fill: '#ffe7b8', edge: '#e0b45c' });
    g.text(c.cx, c.y + 31, tut.sub, 11, '#8a5a12');
    g.text(c.cx, c.y + 70, tut.title, tut.title.length > 22 ? 20 : 23, U.ink, { wrap: 350 });
    drawScene(tut.scene, c.cx - 154, c.y + 100, now, wi);
    tut.steps.forEach((st, i) => {
      const yy = c.y + 262 + i * 84;
      g.circle(c.x + 50, yy + 22, 26, '#efe6c4'); g.circle(c.x + 50, yy + 22, 23, U.cream2);
      const ik = st[0];
      if (ik === 'fruit') g.img('fruits', c.x + 50, yy + 22, 30, 30, { frame: 'apple' });
      else if (ik === 'key') g.img('key', c.x + 50, yy + 22, 32, 32);
      else if (ik === 'door') g.img('door', c.x + 50, yy + 32, 22, 30, { oy: 1 });
      else if (ik === 'gate') g.img('gate', c.x + 50, yy + 32, 22, 30, { oy: 1 });
      else if (ik === 'switch') g.img('switch', c.x + 50, yy + 22, 30, 30);
      else if (ik === 'bomb') g.img('bomb', c.x + 50, yy + 22, 32, 32);
      else if (ik === 'ice') g.img('ice', c.x + 50, yy + 22, 30, 30);
      else if (ik === 'portal') g.img('tele0', c.x + 50, yy + 22, 32, 32, { frame: 'a' });
      else if (ik === 'wall') g.img('wall' + wi, c.x + 50, yy + 22, 28, 28);
      else if (ik === 'exit') g.img('exit' + wi, c.x + 50, yy + 22, 34, 34);
      g.text(c.x + 90, yy + 8, (i + 1) + '  ' + st[1], 15, U.ink, { ox: 0 });
      g.text(c.x + 90, yy + 30, st[2], 12, U.inkSoft, { ox: 0, wrap: c.w - 120, align: 'left', bold: false, oy: 0 });
    });
    ui().button(c.cx, c.y + c.h - 56, c.w - 56, 56, 'GOT IT', () => {
      const d = S.save.data; d.seen[mech] = 1; S.save.write();
      SC.closeOverlay(); SC.beginPlay(lvId);
    }, { style: 'primary', size: 21, id: 'gotit', disabled: c.age < 350 });
    g.text(c.cx, c.y + c.h - 16, 'One rule - shown once - ready to play', 10, U.inkFaint, { bold: false });
  }

  // ---------- settings ----------
  function drawSettings(now) {
    const g = G(), d = S.save.data, wi = S.worldIndex(Math.min(d.unlocked, S.levelCount()));
    S.drawWorldBg(wi, now);
    g.use(4);
    S.backButton(() => SC.go('menu'));
    g.text(S.W / 2, 34, 'SETTINGS', 26, U.cream, { shadow: '#07170e', shadowDy: 3 });
    g.text(S.W / 2, 62, 'Make the game feel right for you', 12, U.cream, { alpha: 0.75, bold: false });
    const rows = [
      ['sfx', 'Sound effects', 'Pops, chimes and jingles'],
      ['music', 'Music', 'Calm background tune'],
      ['haptics', 'Vibration', 'Little buzzes when you eat or crash'],
      ['dpad', 'On-screen D-pad', 'Four arrow buttons under the board'],
      ['pattern', 'Board pattern', 'Soft texture on the board and backgrounds'],
      ['reduced', 'Reduce motion', 'Fewer animations and no screen shake']
    ];
    const y0 = 92, rh = 62;
    ui().panel(14, y0, S.W - 28, rows.length * rh + 14, { r: 24, shadow: 6 });
    rows.forEach((r, i) => {
      const y = y0 + 14 + i * rh + rh / 2 - 7;
      if (i) g.line(34, y - rh / 2, S.W - 34, y - rh / 2, U.creamEdge, 1.5, 0.5);
      g.text(34, y - 8, r[1], 16, U.ink, { ox: 0 });
      g.text(34, y + 12, r[2], 11, U.inkSoft, { ox: 0, bold: false });
      ui().toggle(S.W - 34 - 28, y, !!d[r[0]], () => { d[r[0]] = !d[r[0]]; S.save.write(); if (r[0] === 'sfx' && d.sfx) A().sfx.coin(); }, 's-' + r[0]);
    });
    const cy = y0 + rows.length * rh + 14 + 16;
    ui().panel(14, cy, S.W - 28, 82, { r: 22, shadow: 5 });
    g.text(34, cy + 22, 'CONTROLS', 10.5, U.inkSoft, { ox: 0 });
    g.text(34, cy + 44, 'Swipe to turn  ·  tap near the board to turn toward it', 12.5, U.ink, { ox: 0 });
    g.text(34, cy + 64, 'Reverse turns are blocked automatically.', 11.5, U.inkSoft, { ox: 0, bold: false });
    ui().button(S.W / 2, cy + 82 + 40, S.W - 60, 52, 'RESET CAMPAIGN', () => SC.openOverlay('confirm', {}), { style: 'ghost', size: 15, id: 'reset' });
    g.text(S.W / 2, S.H - 36, 'Snake Fruit Rush  v' + S.version, 11, U.cream, { alpha: 0.45, bold: false });
  }
  function drawConfirm(now) {
    const g = G(), d = S.save.data, c = card(now, SC.ovT0, 336, 280, cy0());
    g.use(5);
    g.text(c.cx, c.y + 44, 'RESET CAMPAIGN?', 24, U.ink);
    g.text(c.cx, c.y + 96, 'All level progress and stars are erased.\nYour coins and skins stay.', 13.5, U.inkSoft, { wrap: 290, bold: false });
    ui().button(c.cx, c.y + 168, 284, 52, 'KEEP MY PROGRESS', () => SC.closeOverlay(), { style: 'primary', size: 16, id: 'keep' });
    ui().button(c.cx, c.y + 232, 284, 46, 'ERASE PROGRESS', () => { S.save.resetCampaign(); SC.closeOverlay(); ui().showToast('Campaign reset'); }, { style: 'danger', size: 14.5, id: 'erase' });
  }

  // ---------- skins ----------
  let skinPick = null;
  function skinToast(msg) { A().sfx.err(); A().buzz(40); ui().showToast(msg); }
  SC.selectSkin = function (id) { if (!S.SKIN_BY_ID[id] || !S.save.isOwned(id)) return false; S.save.data.skin = id; S.save.write(); return true; };
  SC.buySkin = function (id) {
    const sk = S.SKIN_BY_ID[id], d = S.save.data;
    if (!sk || S.save.isOwned(id) || d.coins < sk.cost) return false;
    d.coins -= sk.cost; d.skins.push(id); d.skin = id; S.save.write(); return true;
  };
  function leaveSkins(from) {
    const d = S.save.data;
    if (skinPick && !S.save.isOwned(skinPick)) {          // a locked skin is picked: error, and back to the skin that is in use
      skinPick = d.skin; skinToast('Skin is locked! Back to ' + S.activeSkin().name + '.'); return;
    }
    SC.go(from || 'menu');
  }
  function drawSkins(now) {
    const g = G(), d = S.save.data, wi = S.worldIndex(Math.min(d.unlocked, S.levelCount())), w = S.WORLDS[wi];
    S.drawWorldBg(wi, now);
    g.use(4);
    if (!skinPick || !S.SKIN_BY_ID[skinPick]) skinPick = d.skin;
    const from = SC.params.from || 'menu';
    S.backButton(() => leaveSkins(from));
    g.text(S.W / 2, 34, 'SNAKE SKINS', 26, U.cream, { shadow: '#07170e', shadowDy: 3 });
    S.coinChip(S.W - 14, 54);
    // preview
    const py = 100, sk = S.SKIN_BY_ID[skinPick], owned = S.save.isOwned(sk.id);
    ui().panel(14, py, S.W - 28, 150, { r: 24, shadow: 6 });
    g.text(32, py + 24, sk.name.toUpperCase(), 12, U.inkSoft, { ox: 0 });
    const st = d.skin === sk.id ? 'EQUIPPED' : (owned ? 'OWNED' : 'LOCKED');
    ui().chip(S.W - 28 - 84, py + 10, 84, 24, { fill: st === 'EQUIPPED' ? '#e8f5c8' : (st === 'OWNED' ? '#e7eefc' : '#f4dede'), edge: st === 'EQUIPPED' ? '#a3d849' : (st === 'OWNED' ? '#9db6e0' : '#d9a0a0') });
    g.text(S.W - 28 - 42, py + 22, st, 10.5, st === 'EQUIPPED' ? '#3f6a1b' : (st === 'OWNED' ? '#3a5a9a' : '#a14040'));
    g.rrect(30, py + 40, S.W - 60, 96, 40, w.floorA, 0.9);
    S.snakeClock(now);
    S.snakeDraw.snake([{ x: S.W / 2 + 90, y: py + 88 }, { x: S.W / 2 + 66, y: py + 88 }, { x: S.W / 2 + 42, y: py + 88 }, { x: S.W / 2 + 18, y: py + 88 }, { x: S.W / 2 - 6, y: py + 88 }, { x: S.W / 2 - 30, y: py + 88 }, { x: S.W / 2 - 54, y: py + 88 }, { x: S.W / 2 - 78, y: py + 88 }], [1, 0], 1.25, { skin: sk, cell: 24 });
    if (!owned) { g.rrect(30, py + 40, S.W - 60, 96, 40, '#000000', 0.28); ui().icon('lock', S.W / 2 + 120, py + 104, 22, '#ffffff'); }
    // grid (3 columns)
    const gy = py + 168, cw = 128, ch = 84, gap = 8, x0 = (S.W - (cw * 3 + gap * 2)) / 2;
    S.SKINS.forEach((s, i) => {
      const x = x0 + (i % 3) * (cw + gap), y = gy + Math.floor(i / 3) * (ch + gap), own = S.save.isOwned(s.id), sel = skinPick === s.id;
      if (sel) g.rrect(x - 3, y - 3, cw + 6, ch + 6, 20, '#ffe879');
      g.rrect(x, y + 4, cw, ch, 17, '#000000', 0.25);
      g.rrect(x, y, cw, ch, 17, U.cream);
      g.rrectStroke(x, y, cw, ch, 17, U.creamEdge, 1, 2);
      g.rrect(x + 6, y + 6, cw - 12, 34, 11, w.floorA);
      S.snakeDraw.mini(s, x + cw / 2, y + 23, 0.95);
      g.text(x + cw / 2, y + 54, s.name, 13, U.ink);
      if (d.skin === s.id) g.text(x + cw / 2, y + 71, 'EQUIPPED', 10, '#3f6a1b');
      else if (own) g.text(x + cw / 2, y + 71, 'OWNED', 10, U.inkSoft);
      else { g.img('coin', x + cw / 2 - 18, y + 71, 15, 15); g.text(x + cw / 2 - 8, y + 71, String(s.cost), 11.5, d.coins >= s.cost ? '#a8631a' : U.inkSoft, { ox: 0 }); }
      if (!own) ui().icon('lock', x + cw - 16, y + 52, 10, '#a89560');
      ui().reg('sk' + s.id, x, y, cw, ch + 4, () => { skinPick = s.id; }, true);
    });
    // action
    const ay = gy + Math.ceil(S.SKINS.length / 3) * (ch + gap) + 22;
    if (d.skin === sk.id) ui().button(S.W / 2, ay, S.W - 60, 56, 'EQUIPPED', () => {}, { size: 18, disabled: true, id: 'skact' });
    else if (owned) ui().button(S.W / 2, ay, S.W - 60, 56, 'EQUIP ' + sk.name.toUpperCase(), () => { SC.selectSkin(sk.id); A().sfx.coin(); }, { style: 'primary', size: 18, id: 'skact' });
    else if (d.coins >= sk.cost) ui().button(S.W / 2, ay, S.W - 60, 56, 'UNLOCK FOR ' + sk.cost, () => { if (SC.buySkin(sk.id)) { A().sfx.unlock(); A().buzz(30); ui().showToast(sk.name + ' unlocked!'); } }, { style: 'primary', size: 18, id: 'skact' });
    else ui().button(S.W / 2, ay, S.W - 60, 56, 'NEED ' + (sk.cost - d.coins) + ' MORE COINS', () => skinToast('Not enough coins for ' + sk.name + '!'), { size: 15, id: 'skact', style: 'dark' });
    g.text(S.W / 2, ay + 44, 'Skins are cosmetic. They never change the puzzle.', 10.5, U.cream, { alpha: 0.6, bold: false });
  }
  SC.resetSkinPick = () => { skinPick = null; };
  SC.leaveSkins = leaveSkins;

  // ---------- dispatcher ----------
  S.drawOverlay = function (now) {
    switch (SC.ov) {
      case 'pause': drawPause(now); break;
      case 'complete': drawComplete(now); break;
      case 'failed': drawFailed(now); break;
      case 'tutorial': drawTutorial(now); break;
      case 'confirm': drawConfirm(now); break;
      case 'ad': drawAdWait(now); break;
      default: break;
    }
  };
  S.drawSettings = drawSettings; S.drawSkins = drawSkins;
})(window.SFR);
