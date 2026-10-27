  // ---------- Campaign logic ----------
  let lvPage = 0;                                    // world shown on the level select screen
  let lvMsg = null;                                  // {s, until}: short message on the level select screen
  const campUnlocked = () => (UNLOCK_ALL ? LEVEL_COUNT : DATA.camp.unlocked);
  const campNext = () => Math.min(LEVEL_COUNT, Math.max(1, DATA.camp.cur));
  function useWorld(w) { CT = WORLDS[w].pal; applyTheme(); }
  function openLevels() {
    lvPage = Math.floor((campNext() - 1) / 20);
    useWorld(lvPage);
    setState('levels');
  }
  const menuPal = () => (DATA.menuMode === 'endless' ? null : WORLDS[Math.floor((campNext() - 1) / 20)].pal);
  function setMenuMode(levels) {
    DATA.menuMode = levels ? 'levels' : 'endless';
    if (levels && DATA.tab < 3) DATA.tab = 3;                 // Modes / Themes / Pattern only exist in Endless
    writeData(); CT = menuPal(); applyTheme();
  }
  function playSelected() { if (DATA.menuMode === 'endless') newGame(); else playCampaign(); }
  function playCampaign() { startLevel(campNext()); }
  // Fruit goes to new random places on the route every time a level starts (always cells the solution passes, so it stays solvable).
  function randomFruit(L) {
    const q = lvLayer(L.Q), cells = [], want = L.F.length;
    for (let i = 0; i < COLS * ROWS; i++) if (q[i]) cells.push(i);
    for (const gap of [3, 2, 1]) {
      const pool = cells.slice(), out = [];
      while (pool.length && out.length < want) {
        const c = pool.splice(rnd(pool.length), 1)[0], x = c % COLS, y = (c / COLS) | 0;
        if (out.every((o) => Math.max(Math.abs(o[0] - x), Math.abs(o[1] - y)) >= gap)) out.push([x, y]);
      }
      if (out.length === want) return Object.assign({}, L, { F: out });
    }
    return L;
  }
  function startLevel(id) {
    id = Math.min(LEVEL_COUNT, Math.max(1, id | 0));
    if (id > campUnlocked()) return;
    const L = randomFruit(LV[id - 1]), el = engineLevel(L), rt = E.makeRuntime(el), st = E.newState(rt);
    G = {
      camp: { id: id, L: L, rt: rt, st: st, ready: READY_MS, over: null, won: false, endT: 0, moves: 0, exitOpen: false, slowT: 0, shield: false, hold: false, coinMul: 1, stars: 0, coins: 0, hint: L.h || '', flash: [], iceList: [], fr: [] },
      snake: st.body.map((c) => [c % COLS, (c / COLS) | 0]), dir: st.dir, queue: [], score: 0, eaten: 0, fx: {}, combo: 0, combo_t: 0, bonus: null, power: null, gold: null,
      food: null, bombs: [], coins: 0, dailyCoins: 0, playMs: 0, adMsg: '', shareMsg: '', mode: 'classic', speed: DATA.speed
    };
    const C0 = G.camp;
    for (let i = 0; i < COLS * ROWS; i++) if (rt.ice[i]) C0.iceList.push(i);
    rt.fruits.forEach((f, i) => C0.fr.push({ cell: f.cell, kind: FRUITS[(i + id) % FRUITS.length] }));
    popups = []; fxs = []; banner = null; prevSnake = null; acc = 0;
    adToken++; gift = null; sheetOpen = false; sheetT = 0;
    DATA.camp.cur = id;
    writeData();
    useWorld(L.w);
    setState('play');
  }
  const campSliding = () => !!G.camp && E.resolveDir(G.camp.rt, G.camp.st, null).forced;
  const cellOf = (i) => cellXY(i % COLS, (i / COLS) | 0);
  const campPlaying = () => G && G.camp && !G.camp.over && !G.camp.won;

  function campStep() {
    const C0 = G.camp, rt = C0.rt, st = C0.st;
    if (C0.over || C0.won) return;
    if (C0.hold) { if (!G.queue.length) return; C0.hold = false; }          // after a shield save the snake waits for a turn
    let input = null;
    if (!campSliding() && G.queue.length) input = G.queue.shift();          // on ice the player cannot steer: the turn waits in the queue
    const oldDir = st.dir;
    const res = E.step(rt, st, input);
    if (res.status === 'fail' && C0.shield && res.reason !== 'stuck') {
      st.done = false; st.dir = oldDir; G.dir = oldDir; C0.shield = false; C0.hold = true;
      const hp = headXY(); ring(hp.x, hp.y, '#38bdf8'); burst(hp.x, hp.y, '#7dd3fc', 12);
      showBanner('SHIELD SAVED YOU!', 'now steer away', '#38bdf8', 1400);
      sfx.power(); buzz(40);
      return;
    }
    G.dir = st.dir;
    if (res.status === 'wait') return;                                      // slid safely to a stop: wait for a turn
    if (res.status !== 'fail') {
      G.snake = st.body.map((c) => [c % COLS, (c / COLS) | 0]);
      C0.moves = st.moves;
      if (C0.slowT > 0) C0.slowT--;
      trailPuff();
      if (rt.ice[st.body[0]]) { const p = headXY(); if (fxs.length < MAX_FX - 6) fxs.push({ k: 0, x: p.x, y: p.y, vx: (Math.random() - 0.5) * 0.03, vy: (Math.random() - 0.5) * 0.03, r: 2.4, color: '#ffffff', life: 380, max: 380 }); }
    }
    res.events.forEach((e) => {
      const p = cellOf(e.cell);
      if (e.t === 'fruit') {
        G.eaten++; G.coins += COIN_FRUIT * C0.coinMul; addCoins(COIN_FRUIT * C0.coinMul); dailyAdd('fruits', 1);
        burst(p.x, p.y, 'rand', 8); ring(p.x, p.y, th().accent);
        popup('+1', th().accent, 30);
        sfx.eat(0); buzz(12);
      } else if (e.t === 'key') {
        ring(p.x, p.y, '#facc15'); burst(p.x, p.y, '#facc15', 8); popup('KEY!', '#facc15', 30);
        sfx.key(); buzz(20);
      } else if (e.t === 'door') {
        const q = cellOf(e.cell); ring(q.x, q.y, '#facc15'); burst(q.x, q.y, '#fde68a', 10); C0.flash.push({ cell: e.cell, t: 600 });
        sfx.door();
      } else if (e.t === 'switch') {
        const q = cellOf(e.cell); ring(q.x, q.y, GATE_COLS[e.gate % GATE_COLS.length]);
        const gc = rt.gates[e.gate].cells[0], gp = cellOf(gc);
        ring(gp.x, gp.y, GATE_COLS[e.gate % GATE_COLS.length]); C0.flash.push({ cell: gc, t: 600 });
        popup(e.open ? 'GATE OPEN' : 'GATE CLOSED', GATE_COLS[e.gate % GATE_COLS.length], 30);
        sfx.sw(e.open); buzz(20);
      } else if (e.t === 'portal') {
        const a = cellOf(e.from), b = cellOf(e.to);
        ring(a.x, a.y, '#c084fc'); ring(b.x, b.y, '#38bdf8'); burst(b.x, b.y, '#a5f3fc', 8);
        sfx.portal(); buzz(15);
      }
    });
    if (!C0.exitOpen && E.exitReady(rt, st)) {
      C0.exitOpen = true;
      const ep = cellOf(rt.exit);
      ring(ep.x, ep.y, '#4ade80'); burst(ep.x, ep.y, '#bbf7d0', 12);
      showBanner('EXIT OPEN!', 'reach the glowing exit', '#4ade80', 1100);
      sfx.yum();
    }
    if (res.status === 'win') {
      C0.won = true; C0.endT = 0;
      const moves = st.moves, L = C0.L;
      C0.stars = moves <= L.s3 ? 3 : moves <= L.s2 ? 2 : 1;
      const prev = DATA.camp.stars[C0.id] | 0;
      if (C0.stars > prev) DATA.camp.stars[C0.id] = C0.stars;
      C0.coins = (5 + 5 * C0.stars) * C0.coinMul;
      addCoins(C0.coins); G.coins += C0.coins;
      if (C0.id < LEVEL_COUNT) { DATA.camp.cur = C0.id + 1; if (DATA.camp.unlocked < C0.id + 1) DATA.camp.unlocked = C0.id + 1; }
      else DATA.camp.cur = C0.id;
      writeData();
      const hp = headXY(); burst(hp.x, hp.y, 'rand', 16); ring(hp.x, hp.y, '#fde047');
      sfx.win(); buzz(40);
    } else if (res.status === 'fail') {
      C0.over = res.reason; C0.endT = 0;
      if (res.reason === 'trap') { G.boom = [res.cell % COLS, (res.cell / COLS) | 0]; sfx.boom(); buzz(80); }
      else {
        sfx.over(); buzz(50);
        const hp = headXY(); ring(hp.x, hp.y, '#f87171'); burst(hp.x, hp.y, '#f87171', 10);
        if (res.reason === 'door') { const nx = st.body[0] % COLS + st.dir[0], ny = ((st.body[0] / COLS) | 0) + st.dir[1], ni = ny * COLS + nx; C0.over = rt.gateAt[ni] >= 0 ? 'gate' : 'door'; }
      }
    }
  }
  function campTick(delta) {                         // called every frame while state is 'play' and G.camp exists
    const C0 = G.camp;
    C0.flash.forEach((f) => { f.t -= delta; });
    C0.flash = C0.flash.filter((f) => f.t > 0);
    if (C0.over || C0.won) {
      C0.endT += delta;
      if (C0.won && C0.endT > 700) setState('won');
      else if (C0.over && C0.endT > (C0.over === 'trap' ? 900 : 650)) setState('over');
      return;
    }
    if (C0.ready > 0) { C0.ready -= delta; acc = 0; if (C0.ready <= 0) { C0.ready = 0; sfx.click(); } return; }
    acc += delta * turnBoost();
    let delay = stepDelay();
    while (state === 'play' && !C0.over && !C0.won && acc >= delay) {
      acc -= delay;
      prevSnake = G.snake.map((s) => [s[0], s[1]]);
      campStep();
    }
    G.playMs += delta;
  }
  function usePower(k) {
    if (state !== 'play' || !campPlaying() || G.camp.ready > 0) return;
    const C0 = G.camp, rt = C0.rt, st = C0.st, p = PW[k];
    if ((k === 'shield' && C0.shield) || (k === 'coin2' && C0.coinMul > 1) || (k === 'slow' && C0.slowT > 0)) return;
    const hx = st.body[0] % COLS, hy = (st.body[0] / COLS) | 0, near = [];
    if (k === 'sweep') {
      for (let i = 0; i < COLS * ROWS; i++) if (rt.bomb[i] && Math.max(Math.abs((i % COLS) - hx), Math.abs(((i / COLS) | 0) - hy)) <= 7) near.push(i);
      if (!near.length) { popup('No bombs near', '#fca5a5', 34); sfx.err(); return; }
    }
    if (!DATA.pw[k]) {
      if (DATA.coins < p.cost) { popup('Need ' + p.cost + ' coins', '#fca5a5', 34); sfx.err(); return; }
      DATA.coins -= p.cost; DATA.pw[k]++;
    }
    DATA.pw[k]--; writeData();
    const hp = headXY();
    if (k === 'slow') C0.slowT = 28;
    else if (k === 'shield') C0.shield = true;
    else if (k === 'coin2') C0.coinMul = 2;
    else near.forEach((i) => { rt.bomb[i] = 0; const q = cellOf(i); burst(q.x, q.y, '#fbbf24', 8); ring(q.x, q.y, '#fbbf24'); });
    ring(hp.x, hp.y, '#38bdf8'); popup(p.name + '!', '#7dd3fc', 34);
    sfx.power(); buzz(25);
  }
  let shopMsg = null;
  function buyPower(k) {
    const p = PW[k];
    if (DATA.coins < p.cost) { shopMsg = { s: 'Need ' + (p.cost - DATA.coins) + ' more coins for ' + p.name + '!', until: anim + 2400, bad: true }; sfx.err(); buzz(40); return; }
    DATA.coins -= p.cost; DATA.pw[k] = Math.min(99, DATA.pw[k] + 1); writeData(); sfx.coin();
    shopMsg = { s: p.name + ' added!', until: anim + 1500 };
  }
  function drawShop(top) {
    const t = th();
    if (shopMsg && anim < shopMsg.until) {
      txt(W / 2, top + 96, shopMsg.s, 15, shopMsg.bad ? '#f87171' : '#4ade80');
    } else {
      const ct = coinText(DATA.coins) + ' coins', ox = ct.length * 4.4;
      drawCoin(W / 2 - ox - 12, top + 96, 10);
      txt(W / 2 - ox + 2, top + 96, ct, 15, t.accent, 0);
    }
    PW_KEYS.forEach((k, i) => {
      const p = PW[k], w = 212, h = 112, cx = W / 2 + (i % 2 ? 110 : -110), cy = top + 176 + Math.floor(i / 2) * 124, can = DATA.coins >= p.cost;
      rrect(cx - w / 2, cy - h / 2 + 3, w, h, 15, shade(t.panel, -0.3));
      rrect(cx - w / 2, cy - h / 2, w, h, 15, t.panel);
      dot(cx - w / 2 + 30, cy - 22, 22, t.board1);
      drawPwIcon(k, cx - w / 2 + 30, cy - 23, false);
      txt(cx - w / 2 + 62, cy - 30, p.name, 16, t.btnText, 0);
      wrapText(p.desc, 18).forEach((l, j) => txt(cx - w / 2 + 62, cy - 8 + j * 15, l, 11, t.btnText, 0, false));
      txt(cx - w / 2 + 12, cy + 38, 'You have ' + (DATA.pw[k] | 0), 12, t.btnText, 0, false);
      rrect(cx + w / 2 - 74, cy + 24, 64, 28, 14, can ? t.accent : shade(t.panel, -0.25));
      drawCoin(cx + w / 2 - 60, cy + 38, 6.5);
      txt(cx + w / 2 - 50, cy + 38, String(p.cost), 13, can ? '#1b1b1b' : t.btnText, 0);
      buttons.push({ x: cx - w / 2, y: cy - h / 2, w: w, h: h, fn: () => buyPower(k) });
    });
    txt(W / 2, top + 396, 'Tap a power-up to buy it. Use them inside levels.', 12.5, t.text, 0.5, false);
    txt(W / 2, top + 420, 'In a level you can also tap its button to buy and use it.', 12.5, t.text, 0.5, false);
  }
  function toggleVibe() { DATA.vibe = !DATA.vibe; writeData(); if (DATA.vibe) buzz(30); }
  function toggleTap() { DATA.tapSteer = !DATA.tapSteer; writeData(); tone(660, 0.08, 'triangle', 0.2); }
  function campRetry() { startLevel(G.camp.id); }
  function campNextLevel() { if (G.camp.id < LEVEL_COUNT) startLevel(G.camp.id + 1); else openLevels(); }
  function leaveToLevels() { saveGame(); openLevels(); }
  function goHome() { setState('menu'); }

  // ---------- Level select + campaign drawing ----------
  function starShape(x, y, r, color, alpha) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, ang = -Math.PI / 2 + i * Math.PI / 5; pts.push({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr }); }
    g.fillStyle(C(color), alpha === undefined ? 1 : alpha);
    g.fillPoints(pts, true);
  }
  function lockIcon(x, y, s, color) {
    g.lineStyle(3 * s, C(color), 1);
    g.beginPath(); g.arc(x, y - 4 * s, 6 * s, Math.PI, 0); g.strokePath();
    rrect(x - 9 * s, y - 4 * s, 18 * s, 14 * s, 4 * s, color);
    dot(x, y + 2 * s, 2 * s, '#00000066');
  }
  function worldStars(w) { let n = 0; for (let i = w * 20 + 1; i <= w * 20 + 20; i++) n += DATA.camp.stars[i] | 0; return n; }
  function worldDone(w) { let n = 0; for (let i = w * 20 + 1; i <= w * 20 + 20; i++) if (DATA.camp.stars[i]) n++; return n; }
  function drawLevels() {
    const t = th(), cp = DATA.camp, w = lvPage, W0 = WORLDS[w], un = campUnlocked();
    // header
    rrect(BX, 22, 96, 40, 20, t.panel);
    line(BX + 22, 42, BX + 32, 35, t.btnText, 3.4); line(BX + 22, 42, BX + 32, 49, t.btnText, 3.4);
    txt(BX + 40, 42, 'Home', 17, t.btnText, 0);
    buttons.push({ x: BX - 6, y: 16, w: 108, h: 52, fn: goHome });
    txt(W / 2 + 20, 42, 'Levels', 32, t.accent);
    const cw = 52 + coinText(DATA.coins).length * 11;
    rrect(W - BX - cw, 22, cw, 40, 20, t.panel, 0.8);
    drawCoin(W - BX - cw + 22, 42, 11);
    txt(W - BX - cw + 40, 42, coinText(DATA.coins), 16, t.accent, 0);
    // world card
    const cy = 96, ch = 118;
    rrect(BX, cy + 5, BW, ch, 24, shade(t.panel, -0.35));
    rrect(BX, cy, BW, ch, 24, t.panel);
    // world art strip
    const wl = W0.wall;
    for (let i = 0; i < 9; i++) { const bx = BX + 78 + i * 36, by = cy + ch - 22; rrect(bx, by + 1, 24, 18, 5, wl.edge); rrect(bx, by, 24, 14, 5, wl.base); rrect(bx + 2, by + 1.5, 20, 4, 2, wl.top, 0.9); }
    txt(W / 2, cy + 22, 'WORLD ' + (w + 1) + ' of 5', 12, t.text, 0.5, false);
    txt(W / 2, cy + 52, W0.name, 36, t.accent);
    txt(W / 2, cy + 82, W0.sub, 13, t.text, 0.5, false);
    // arrows
    [[-1, BX + 28], [1, BX + BW - 28]].forEach((a) => {
      const can = w + a[0] >= 0 && w + a[0] < WORLDS.length;
      dot(a[1], cy + 52, 20, can ? shade(t.panel, 0.25) : shade(t.panel, -0.2), can ? 1 : 0.6);
      if (can) {
        line(a[1] - a[0] * 4, cy + 42, a[1] + a[0] * 5, cy + 52, t.btnText, 3.6);
        line(a[1] + a[0] * 5, cy + 52, a[1] - a[0] * 4, cy + 62, t.btnText, 3.6);
        buttons.push({ x: a[1] - 26, y: cy + 26, w: 52, h: 52, fn: () => { lvPage = w + a[0]; useWorld(lvPage); sfx.click(); } });
      }
    });
    // dots
    for (let i = 0; i < WORLDS.length; i++) {
      const x = W / 2 + (i - 2) * 22;
      dot(x, cy + ch + 20, i === w ? 6 : 4, i === w ? t.accent : t.panel);
      buttons.push({ x: x - 11, y: cy + ch + 8, w: 22, h: 24, fn: () => { lvPage = i; useWorld(i); } });
    }
    // level grid
    const tile = 76, gap = 13, x0 = (W - (5 * tile + 4 * gap)) / 2, y0 = 262;
    for (let k = 0; k < 20; k++) {
      const id = w * 20 + k + 1, col = k % 5, row = (k / 5) | 0, x = x0 + col * (tile + gap), y = y0 + row * (tile + 12);
      const open = id <= un, st = cp.stars[id] | 0, cur = id === cp.cur && open;
      const face = !open ? shade(t.panel, -0.3) : st ? t.accent : shade(t.panel, 0.18);
      rrect(x, y + 5, tile, tile, 18, shade(face, -0.38), open ? 1 : 0.7);
      rrect(x, y, tile, tile, 18, face, open ? 1 : 0.85);
      if (cur) { g.lineStyle(3.5, C('#ffffff'), 0.55 + 0.45 * Math.sin(anim / 160)); g.strokeRoundedRect(x - 3, y - 3, tile + 6, tile + 6, 21); }
      if (open) {
        txt(x + tile / 2, y + (st ? 29 : 38), String(id), 28, st ? '#1b1b1b' : t.btnText);
        if (st) for (let s = 0; s < 3; s++) starShape(x + tile / 2 + (s - 1) * 19, y + 59, 8.5, s < st ? '#b45309' : '#00000033');
      } else {
        lockIcon(x + tile / 2, y + tile / 2 - 2, 1.15, shade(t.text, -0.35));
      }
      buttons.push({ x: x, y: y, w: tile, h: tile + 6, fn: () => { if (open) startLevel(id); else { lvMsg = { s: 'Clear level ' + (un) + ' to unlock this one', until: anim + 2200 }; sfx.err(); } } });
    }
    // footer
    const first = w * 20 + 1, canPlay = first <= un;
    let target = Math.min(un, w * 20 + 20);
    for (let i = first; i <= w * 20 + 20 && i <= un; i++) { if (!cp.stars[i]) { target = i; break; } }
    txt(W / 2, 636, worldDone(w) + ' / 20 cleared   ' + worldStars(w) + ' / 60 stars', 14, t.text, 0.5, false);
    if (canPlay) button(W / 2, 688, 320, 62, 'Play level ' + target, () => startLevel(target), { primary: true, size: 24 });
    else button(W / 2, 688, 320, 62, 'Locked', null, { disabled: true, size: 22 });
    if (lvMsg && anim < lvMsg.until) txt(W / 2, 744, lvMsg.s, 14, '#fca5a5', 0.5, false);
    else txt(W / 2, 744, canPlay ? 'Clear a level to unlock the next one' : 'Finish world ' + w + ' to unlock', 13, t.text, 0.5, false);
  }

  // ----- tiles -----
  function floorDecor(gr, w, c, r, id) {
    const v = hh(c, r, id * 3 + w);
    if (v > 0.07) return;
    const x = BX + c * CELL + CELL / 2 + (hh(c, r, 5) - 0.5) * 8, y = BY + r * CELL + CELL / 2 + (hh(c, r, 6) - 0.5) * 8;
    const fill = (px, py, rad, col, al) => { gr.fillStyle(C(col), al); gr.fillCircle(px, py, rad); };
    if (w === 0) { [[0, -2.4], [2.4, 0], [0, 2.4], [-2.4, 0]].forEach((o) => fill(x + o[0], y + o[1], 1.7, '#ffffff', 0.85)); fill(x, y, 1.6, '#ffd23f', 1); }
    else if (w === 1) { fill(x, y, 2.2, '#c99a5b', 0.7); fill(x + 4, y + 3, 1.3, '#c99a5b', 0.7); }
    else if (w === 2) { gr.lineStyle(1.2, C('#ffffff'), 0.85); gr.lineBetween(x - 3.5, y, x + 3.5, y); gr.lineBetween(x, y - 3.5, x, y + 3.5); gr.lineBetween(x - 2.5, y - 2.5, x + 2.5, y + 2.5); gr.lineBetween(x + 2.5, y - 2.5, x - 2.5, y + 2.5); }
    else if (w === 3) { fill(x, y, 2.4, '#ff7a1a', 0.45); fill(x, y, 1.2, '#ffd166', 0.8); }
    else { gr.fillStyle(C('#a5b4fc'), 0.7); gr.fillCircle(x, y, 1.1); gr.fillStyle(C('#a5b4fc'), 0.25); gr.fillCircle(x, y, 2.6); }
  }
  function wallTile(gr, w, c, r, id) {
    const P = WORLDS[w].wall, x = BX + c * CELL, y = BY + r * CELL, v = hh(c, r, id), v2 = hh(c, r, id + 11);
    gr.fillStyle(0x000000, 0.28); gr.fillRoundedRect(x + 0.5, y + 3, CELL, CELL, 6);
    gr.fillStyle(C(P.edge), 1); gr.fillRoundedRect(x, y + 1.5, CELL, CELL - 1.5, 6);
    gr.fillStyle(C(P.base), 1); gr.fillRoundedRect(x, y, CELL, CELL - 3, 6);
    gr.fillStyle(C(P.top), 0.95); gr.fillRoundedRect(x + 2, y + 1.4, CELL - 4, 5.2, 3);
    if (w === 0) {                                              // hedge: leafy bumps
      gr.fillStyle(C(P.top), 0.9); gr.fillCircle(x + 5 + v * 3, y + 11, 3.2); gr.fillCircle(x + 15 - v2 * 3, y + 9, 3);
      gr.fillStyle(C('#1b5a28'), 0.5); gr.fillCircle(x + 11, y + 14.5, 2.6);
      if (v > 0.8) { gr.fillStyle(C('#ff6b81'), 1); gr.fillCircle(x + 7, y + 12, 1.7); }
    } else if (w === 1) {                                       // sandstone bricks
      gr.lineStyle(1.2, C(P.edge), 0.55); gr.lineBetween(x + 2, y + 10.5, x + CELL - 2, y + 10.5); gr.lineBetween(x + 6 + v * 8, y + 10.5, x + 6 + v * 8, y + CELL - 4);
      gr.fillStyle(C(P.edge), 0.35); gr.fillCircle(x + 5 + v2 * 10, y + 7.5, 1);
    } else if (w === 2) {                                       // ice crystal
      gr.lineStyle(1.6, C('#ffffff'), 0.85); gr.lineBetween(x + 5, y + 16, x + 11, y + 8); gr.lineBetween(x + 12, y + 17, x + 16, y + 11);
      gr.fillStyle(C('#ffffff'), 0.9); gr.fillCircle(x + 16.5, y + 5.5, 1.3);
    } else if (w === 3) {                                       // basalt with glowing cracks
      gr.lineStyle(1.8, C('#ff7a1a'), 0.95); gr.beginPath(); gr.moveTo(x + 4, y + 8 + v * 4); gr.lineTo(x + 10, y + 12); gr.lineTo(x + 14, y + 9); gr.lineTo(x + 19, y + 14 + v2 * 2); gr.strokePath();
      gr.lineStyle(0.8, C('#ffd166'), 0.9); gr.beginPath(); gr.moveTo(x + 10, y + 12); gr.lineTo(x + 14, y + 9); gr.strokePath();
    } else {                                                    // night stone with a glowing rune
      if (v > 0.45) { gr.lineStyle(1.5, C('#7cf5ff'), 0.9); gr.strokeCircle(x + CELL / 2, y + 10.5, 3.4); gr.fillStyle(C('#7cf5ff'), 0.9); gr.fillCircle(x + CELL / 2, y + 10.5, 1);
      } else { gr.fillStyle(C('#c4b5fd'), 0.8); gr.fillCircle(x + 5 + v2 * 12, y + 8, 1.2); }
    }
  }
  function iceTile(gr, c, r, id) {
    const x = BX + c * CELL, y = BY + r * CELL;
    gr.fillStyle(0x7dd3fc, 0.35); gr.fillRoundedRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1, 4);
    gr.fillStyle(0xffffff, 0.6); gr.fillRoundedRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3, 4);
    gr.lineStyle(1.2, 0x38bdf8, 0.9); gr.strokeRoundedRect(x + 1, y + 1, CELL - 2, CELL - 2, 4);
    gr.lineStyle(1.6, 0xffffff, 0.95); gr.lineBetween(x + 4, y + 8, x + 9, y + 3.5); gr.lineBetween(x + 7, y + 12, x + 15, y + 4.5);
  }
  // The board (floor, walls, ice) never changes during a level, so it is drawn once into a texture instead of being redrawn every frame.
  let boardRT = null;
  function bakeBoard() {
    try {
      if (!boardRT) { boardRT = scene.add.renderTexture(0, 0, W * ZOOM, H * ZOOM); boardRT.setOrigin(0, 0); boardRT.setScale(1 / ZOOM); boardRT.setDepth(boardG.depth); }
      boardRT.clear(); boardRT.setVisible(true);
      boardG.setScale(ZOOM); boardG.setVisible(true);
      boardRT.draw(boardG, 0, 0);
      boardG.setScale(1); boardG.setVisible(false);
    } catch (e) { boardG.setScale(1); boardG.setVisible(true); if (boardRT) boardRT.setVisible(false); }
  }
  function drawCampBoard() {
    const C0 = G.camp, rt = C0.rt, w = C0.L.w, t = th();
    boardG.clear();
    boardG.setVisible(true);
    boardG.fillStyle(C(shade(t.panel, -0.25)), 1);
    boardG.fillRoundedRect(BX - 8, BY - 5, BW + 16, BH + 17, 14);
    boardG.fillStyle(C(t.panel), 1);
    boardG.fillRoundedRect(BX - 8, BY - 8, BW + 16, BH + 16, 14);
    boardG.fillStyle(C(t.board1), 1);
    boardG.fillRect(BX, BY, BW, BH);
    drawPattern(boardG, WORLDS[w].pattern, BX, BY, COLS, ROWS, CELL);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (rt.wall[i]) continue;
      if (rt.ice[i]) iceTile(boardG, c, r, C0.id); else floorDecor(boardG, w, c, r, C0.id);
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (rt.wall[r * COLS + c]) wallTile(boardG, w, c, r, C0.id);
    bakeBoard();
  }

  // ----- dynamic items -----
  function drawKey(x, y, s) {
    const bob = Math.sin(anim / 220) * 1.5;
    y += bob;
    dot(x, y, 12 * s, '#facc15', 0.22);
    line(x - 1 * s, y + 1 * s, x + 8 * s, y + 1 * s, '#b45309', 3.6 * s);
    line(x + 4 * s, y + 1 * s, x + 4 * s, y + 5.5 * s, '#b45309', 2.6 * s); line(x + 7.5 * s, y + 1 * s, x + 7.5 * s, y + 4.5 * s, '#b45309', 2.6 * s);
    line(x - 1 * s, y + 1 * s, x + 8 * s, y + 1 * s, '#facc15', 2 * s);
    dot(x - 5 * s, y + 1 * s, 5.2 * s, '#b45309'); dot(x - 5 * s, y + 1 * s, 4 * s, '#fde047'); dot(x - 5 * s, y + 1 * s, 1.8 * s, '#b45309');
  }
  function drawDoor(x, y, open, flash) {
    if (open) {
      rrect(x - 10, y - 10, 20, 20, 5, '#facc15', 0.18 + (flash ? 0.25 : 0));
      g.lineStyle(1.6, C('#facc15'), 0.75); g.strokeRoundedRect(x - 10, y - 10, 20, 20, 5);
      return;
    }
    rrect(x - 11, y - 11 + 2, 22, 22, 5, '#5b3410');
    rrect(x - 11, y - 11, 22, 22, 5, '#a8672a');
    rrect(x - 9, y - 9, 18, 5, 3, '#d99a55', 0.8);
    line(x - 9, y + 2, x + 9, y + 2, '#6b3d12', 1.4);
    dot(x, y + 1, 4.6, '#fde047'); dot(x, y + 0.2, 1.6, '#7c4a10'); rrect(x - 0.9, y + 0.5, 1.8, 4, 0.6, '#7c4a10');
  }
  function drawGate(x, y, open, col, flash) {
    if (open) {
      rrect(x - 10, y - 10, 20, 3, 1.5, col, 0.55); rrect(x - 10, y + 7, 20, 3, 1.5, col, 0.55);
      g.fillStyle(C(col), 0.25); g.fillRoundedRect(x - 10, y - 10, 20, 20, 5);
      return;
    }
    rrect(x - 11, y - 11, 22, 22, 5, '#1f2937');
    for (let i = 0; i < 4; i++) { rrect(x - 8.5 + i * 5.6, y - 10, 3, 20, 1.5, col); rrect(x - 8.5 + i * 5.6, y - 10, 1.2, 20, 0.6, '#ffffff', 0.45); }
    rrect(x - 11, y - 3, 22, 3, 1.5, col, 0.9);
    if (flash) dot(x, y, 14, col, 0.3);
  }
  function drawSwitch(x, y, col, on) {
    dot(x, y, 12, col, on ? 0.12 : 0.28);
    rrect(x - 10, y - 8, 20, 17, 6, '#111827', 0.8);
    rrect(x - 10, y - 10 + (on ? 3 : 0), 20, 17 - (on ? 3 : 0), 6, '#475569');
    dot(x, y - 1 + (on ? 2 : 0), 6.2, on ? shade(col, -0.35) : col);
    if (!on) dot(x - 1.8, y - 3, 1.8, '#ffffff', 0.7);
  }
  function drawPortal(x, y, col, flip) {
    const a = anim / 400 * (flip ? -1 : 1);
    dot(x, y, 15, col, 0.18 + 0.08 * Math.sin(anim / 240));
    dot(x, y, 11.5, '#0b1020');
    for (let i = 0; i < 3; i++) {
      g.lineStyle(2.4 - i * 0.4, C(i === 1 ? '#ffffff' : col), 0.95);
      g.beginPath(); g.arc(x, y, 10.5 - i * 3, a + i * 2.1, a + i * 2.1 + 3.2); g.strokePath();
    }
    dot(x, y, 2, '#ffffff', 0.9);
  }
  function drawExitTile(x, y, open) {
    const a = anim / 60;
    if (open) {
      const p = 1 + 0.1 * Math.sin(a * 0.5);
      dot(x, y, 21 * p, '#fde047', 0.22); dot(x, y, 16.5 * p, '#fde047', 0.32);
      for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + a * 0.04; line(x + Math.cos(an) * 10, y + Math.sin(an) * 10, x + Math.cos(an) * 17 * p, y + Math.sin(an) * 17 * p, '#fde047', 1.6); }
      dot(x, y, 12.5, '#14532d'); dot(x, y, 10.5, '#22c55e'); dot(x, y, 7.2, '#bbf7d0');
      g.fillStyle(C('#14532d'), 1); g.fillTriangle(x - 3, y - 4.5, x - 3, y + 4.5, x + 4.5, y);
    } else {
      dot(x, y, 12.5, '#27272a'); dot(x, y, 10.5, '#52525b'); dot(x, y, 7.4, '#18181b');
      lockIcon(x, y + 0.5, 0.6, '#a1a1aa');
    }
  }
  function drawAmbient(w) {
    const a = anim / 1000;
    for (let i = 0; i < 14; i++) {
      const s = hh(i, w, 7), s2 = hh(i, w, 9);
      let x = BX + s * BW, y = BY + s2 * BH;
      if (w === 0) { x += Math.sin(a * 0.8 + i) * 10; y += Math.cos(a * 0.6 + i * 2) * 8; dot(x, y, 1.7, '#fffbd0', 0.45 + 0.3 * Math.sin(a * 2 + i)); }
      else if (w === 1) { x = BX + ((s * BW + a * 20 * (0.5 + s2)) % BW); y += Math.sin(a + i) * 4; dot(x, y, 1.4, '#fff1c9', 0.55); }
      else if (w === 2) { y = BY + ((s2 * BH + a * 24 * (0.6 + s)) % BH); x += Math.sin(a * 1.3 + i) * 8; dot(x, y, 1.9, '#ffffff', 0.85); }
      else if (w === 3) { y = BY + BH - ((s2 * BH + a * 28 * (0.5 + s)) % BH); x += Math.sin(a * 1.6 + i) * 6; dot(x, y, 2, '#ff9a2e', 0.5); dot(x, y, 1, '#fff2a0', 0.9); }
      else dot(x, y, 1.2 + 1.2 * s, '#c7d2fe', 0.2 + 0.55 * Math.abs(Math.sin(a * 1.5 + i * 3)));
    }
  }
  function wrapText(s, n) {
    const words = s.split(' '), out = [];
    let cur = '';
    words.forEach((w) => { if ((cur + ' ' + w).trim().length > n) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) out.push(cur);
    return out;
  }
  function objective(C0) {
    const rt = C0.rt, n = rt.fruits.length;
    const parts = [];
    if (rt.keys.length) parts.push('take the key');
    if (rt.switches.length) parts.push('press the switch');
    parts.push(n === 1 ? 'eat the fruit' : 'eat all ' + n + ' fruit');
    parts.push('reach the exit');
    const s = parts.join(', then ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function drawCampHud() {
    const C0 = G.camp, t = th(), rt = C0.rt, st = C0.st;
    txt(BX, 22, WORLDS[C0.L.w].name.toUpperCase() + '  -  WORLD ' + (C0.L.w + 1), 11, t.text, 0, false);
    txt(BX, 50, 'Level ' + C0.id, 28, t.accent, 0);
    txt(BX + BW, 22, 'Moves', 12, t.text, 1, false);
    txt(BX + BW, 50, String(C0.moves), 28, C0.moves > C0.L.s2 ? '#fca5a5' : t.text, 1);
    // tracker: fruit, keys, exit
    const items = rt.fruits.length + rt.keys.length + 1, x0 = W / 2 - (items - 1) * 12;
    let k = 0;
    rt.fruits.forEach((f, i) => {
      const x = x0 + k * 24, eaten = (st.fruitMask >> i) & 1;
      dot(x, 40, 10.5, t.panel); if (eaten) { dot(x, 40, 10.5, '#4ade80', 0.35); drawFruit(C0.fr[i].kind, x, 42, 0.62); } else { dot(x, 40, 7, t.bg, 0.55); }
      k++;
    });
    rt.keys.forEach((kk, i) => { const x = x0 + k * 24, has = (st.keyMask >> i) & 1; dot(x, 40, 10.5, t.panel); if (has) drawKey(x, 40, 0.62); else dot(x, 40, 5, '#facc15', 0.3); k++; });
    { const x = x0 + k * 24, open = C0.exitOpen; dot(x, 40, 10.5, open ? '#22c55e' : t.panel); g.fillStyle(C(open ? '#14532d' : t.text), open ? 1 : 0.5); g.fillTriangle(x - 3, 34, x - 3, 46, x + 5, 40); }
    txt(W / 2, 80, objective(C0), 12.5, t.text, 0.5, false);
  }
  function drawPwIcon(k, x, y, on) {
    if (k === 'slow') drawPower('slow', x, y, 0.95);
    else if (k === 'coin2') drawPower('double', x, y, 0.95);
    else if (k === 'shield') {
      g.fillStyle(C(on ? '#ffffff' : '#38bdf8'), 1);
      g.fillPoints([{ x: x - 10, y: y - 10 }, { x: x + 10, y: y - 10 }, { x: x + 10, y: y + 1 }, { x: x, y: y + 12 }, { x: x - 10, y: y + 1 }], true);
      g.fillStyle(C('#0c4a6e'), 0.55); g.fillPoints([{ x: x - 5, y: y - 6 }, { x: x + 5, y: y - 6 }, { x: x + 5, y: y }, { x: x, y: y + 6 }, { x: x - 5, y: y }], true);
    } else { drawBomb(x, y + 1, 0.8); line(x - 8, y + 8, x + 8, y - 8, '#4ade80', 3); }
  }
  function toggleBtn(cx, cy, kind, on, label, fn) {
    const t = th();
    dot(cx, cy + 3, 25, shade(t.panel, -0.3)); dot(cx, cy, 25, on ? t.accent : shade(t.panel, -0.15));
    g.fillStyle(0x000000, 0); drawIcon(kind, cx, cy, on ? '#1b1b1b' : t.btnText);
    txt(cx, cy + 40, label + (on ? '' : ' off'), 12, t.btnText, 0.5, false);
    buttons.push({ x: cx - 40, y: cy - 30, w: 80, h: 80, fn: fn });
  }
  function drawCampBottom() {
    const C0 = G.camp, t = th();
    PW_KEYS.forEach((k, i) => {
      const x = BX + i * 58, y = 694, n = DATA.pw[k] | 0;
      const on = (k === 'slow' && C0.slowT > 0) || (k === 'shield' && C0.shield) || (k === 'coin2' && C0.coinMul > 1);
      rrect(x, y + 3, 52, 52, 13, shade(t.panel, -0.3));
      rrect(x, y, 52, 52, 13, on ? '#0ea5e9' : t.panel);
      drawPwIcon(k, x + 26, y + 23, on);
      if (n > 0) { dot(x + 44, y + 8, 9.5, t.accent); txt(x + 44, y + 8, String(n), 12, '#1b1b1b'); }
      else { drawCoin(x + 14, y + 43, 5.5); txt(x + 22, y + 43, String(PW[k].cost), 11, DATA.coins >= PW[k].cost ? t.accent : t.btnText, 0); }
      buttons.push({ x: x - 3, y: y - 3, w: 58, h: 58, fn: () => usePower(k) });
    });
    txt(BX + 244, 706, '3 stars: ' + C0.L.s3 + ' moves', 12.5, t.text, 0, false);
    txt(BX + 244, 728, '2 stars: ' + C0.L.s2 + ' moves', 12.5, t.text, 0, false);
    const px = BX + BW - 52, py = 692;
    rrect(px, py, 52, 52, 12, t.panel);
    line(px + 19, py + 15, px + 19, py + 37, t.btnText, 6);
    line(px + 33, py + 15, px + 33, py + 37, t.btnText, 6);
    buttons.push({ x: px - 6, y: py - 6, w: 64, h: 64, fn: togglePause });
  }
  function drawCampGame() {
    const C0 = G.camp, rt = C0.rt, st = C0.st, a = anim / 60, w = C0.L.w;
    drawCampHud();
    drawCampBottom();
    if (!LITE) drawAmbient(w);
    // sparkles on the ice
    for (let n = 0; n < C0.iceList.length && !LITE; n++) {
      if ((n * 7 + Math.floor(anim / 380)) % 11) continue;
      const i = C0.iceList[n], p = cellOf(i), s = 0.5 + 0.5 * Math.sin(anim / 120 + n);
      line(p.x - 3 * s - 1, p.y, p.x + 3 * s + 1, p.y, '#ffffff', 1.4); line(p.x, p.y - 3 * s - 1, p.x, p.y + 3 * s + 1, '#ffffff', 1.4);
    }
    drawExitTile(cellOf(rt.exit).x, cellOf(rt.exit).y, C0.exitOpen);
    rt.portalTo.forEach((to, i) => { if (to >= 0) { const p = cellOf(i), cols = ['#c084fc', '#38bdf8']; drawPortal(p.x, p.y, cols[(i < to) ? 0 : 1], i < to); } });
    rt.switches.forEach((s) => { const p = cellOf(s.cell); drawSwitch(p.x, p.y, GATE_COLS[s.gateIdx % GATE_COLS.length], E.gateOpen(rt, st, s.gateIdx)); });
    rt.gates.forEach((gt, gi) => gt.cells.forEach((c) => { const p = cellOf(c); drawGate(p.x, p.y, E.gateOpen(rt, st, gi), GATE_COLS[gi % GATE_COLS.length], C0.flash.some((f) => f.cell === c)); }));
    rt.doors.forEach((d) => { const p = cellOf(d.cell); drawDoor(p.x, p.y, E.doorOpen(rt, st, d), C0.flash.some((f) => f.cell === d.cell)); });
    rt.keys.forEach((k, i) => { if (!((st.keyMask >> i) & 1)) { const p = cellOf(k.cell); drawKey(p.x, p.y, 1); } });
    for (let i = 0; i < COLS * ROWS; i++) if (rt.bomb[i]) { const b = cellOf(i); drawBomb(b.x, b.y, 1); }
    C0.fr.forEach((f, i) => { if (!((st.fruitMask >> i) & 1)) { const p = cellOf(f.cell); drawFruit(f.kind, p.x, p.y + 1.5 * Math.sin(a * 0.4 + i), 1.1); } });
    drawSnake(snakePoints(), G.dir, null);
    if (G.boom && C0.over === 'trap') { const b = cellXY(G.boom[0], G.boom[1]); drawBoom(b.x, b.y); }
    fxs.forEach((e) => {
      const k = e.life / e.max;
      if (e.k === 1) { g.lineStyle(3 * k + 1, C(e.color), k); g.strokeCircle(e.x, e.y, e.r + (1 - k) * 26); }
      else dot(e.x, e.y, e.r * k + 0.5, e.color, k);
    });
    if (state === 'play') popups.forEach((p) => txt(p.x, p.y - (900 - p.life) * 0.03, p.s, 13, p.color));
    if (banner) {
      const k = banner.life / banner.max, grow = Math.min(1, (1 - k) * 8), alpha = Math.min(1, k * 4);
      const bw = 300 * (0.7 + 0.3 * grow), by = BY + 46 - (1 - k) * 14;
      rrect(W / 2 - bw / 2, by - 24, bw, banner.sub ? 52 : 38, 18, '#000000', 0.55 * alpha);
      txt(W / 2, by - (banner.sub ? 7 : 0), banner.s, banner.sub ? 20 : 22, banner.color);
      if (banner.sub) txt(W / 2, by + 15, banner.sub, 11, '#ffffff', 0.5, false);
    }
    if (C0.hint && G.playMs < 9000 && C0.ready <= 0 && !C0.over && !C0.won) {
      const lines = wrapText(C0.hint, 40), hgt = 16 + lines.length * 22, ty = BY + BH - hgt - 14;
      rrect(BX + 20, ty, BW - 40, hgt, 16, '#000000', 0.62);
      lines.forEach((l, i) => txt(W / 2, ty + 18 + i * 22, l, 14.5, '#ffffff', 0.5, false));
    }
    if (C0.shield) { const p = headXY(); g.lineStyle(2.5, C('#38bdf8'), 0.75 + 0.25 * Math.sin(anim / 120)); g.strokeCircle(p.x, p.y, 17); }
    if (C0.hold) txt(W / 2, BY + 60, 'Turn now!', 22, '#38bdf8');
    if (C0.ready > 0) {
      const go = C0.ready < 380, k = go ? C0.ready / 380 : 1, bw = 190;
      rrect(W / 2 - bw / 2, BY + BH * 0.42 - 34, bw, 68, 22, '#000000', 0.55);
      txt(W / 2, BY + BH * 0.42, go ? 'GO!' : 'READY', go ? 40 + (1 - k) * 8 : 34, go ? '#4ade80' : '#ffffff');
    }
  }
  function drawCampOverlayFrame(h) {
    const t = th(), top = (H - h) / 2;
    g.fillStyle(0x000000, 0.4); g.fillRect(0, 0, W, H);
    rrect(W / 2 - 186, top - 6, 372, h + 12, 26, t.bg);
    rrect(W / 2 - 180, top, 360, h, 22, t.panel);
    return top;
  }
  function drawCampPause() {
    const t = th(), C0 = G.camp, top = drawCampOverlayFrame(420);
    txt(W / 2, top + 38, 'Paused', 33, t.accent);
    txt(W / 2, top + 74, 'Level ' + C0.id + '  -  ' + WORLDS[C0.L.w].name, 16, t.btnText);
    toggleBtn(W / 2 - 96, top + 122, 'sound', DATA.sound, 'Sound', toggleSound);
    toggleBtn(W / 2, top + 122, 'vibe', DATA.vibe, 'Vibrate', toggleVibe);
    toggleBtn(W / 2 + 96, top + 122, 'tap', DATA.tapSteer, 'Tap steer', toggleTap);
    button(W / 2, top + 232, 290, 56, 'Resume', togglePause, { primary: true, size: 21 });
    button(W / 2, top + 300, 290, 50, 'Restart level', campRetry, { dark: true, size: 18 });
    button(W / 2, top + 362, 290, 50, 'Levels', leaveToLevels, { dark: true, size: 18 });
  }
  function drawCampFail() {
    const t = th(), C0 = G.camp, top = drawCampOverlayFrame(300);
    txt(W / 2, top + 44, C0.over === 'trap' ? 'Boom!' : 'Oops!', 34, '#fca5a5');
    const why = C0.over === 'gate' ? 'The gate is closed - use the switch' : C0.over === 'door' ? 'The door is locked - get the key first' : (FAIL_TEXT[C0.over] || 'Try again');
    txt(W / 2, top + 88, why, 15, t.btnText);
    txt(W / 2, top + 114, 'Level ' + C0.id, 13, t.btnText, 0.5, false);
    button(W / 2, top + 176, 290, 58, 'Try again', campRetry, { primary: true, size: 22 });
    button(W / 2, top + 246, 290, 50, 'Levels', leaveToLevels, { dark: true, size: 18 });
  }
  function drawCampWon() {
    const t = th(), C0 = G.camp, last = C0.id >= LEVEL_COUNT, top = drawCampOverlayFrame(last ? 430 : 490);
    txt(W / 2, top + 44, last ? 'You did it!' : 'Level cleared!', 32, t.accent);
    txt(W / 2, top + 80, last ? 'All ' + LEVEL_COUNT + ' levels complete' : 'Level ' + C0.id + '  -  ' + WORLDS[C0.L.w].name, 15, t.btnText);
    for (let s = 0; s < 3; s++) {
      const k = Math.min(1, Math.max(0, (C0.endT - 700 - s * 220 + 700) / 260)), got = s < C0.stars;
      const x = W / 2 + (s - 1) * 62, y = top + 140 - (s === 1 ? 8 : 0), sc = got ? 1 + 0.35 * Math.sin(Math.min(1, k) * Math.PI) : 1;
      starShape(x, y + 3, 30 * sc, '#000000', 0.25);
      starShape(x, y, 30 * sc, got ? '#fde047' : '#00000044');
      if (got) starShape(x - 2, y - 3, 14 * sc, '#fffbe0', 0.6);
    }
    txt(W / 2, top + 208, C0.moves + ' moves', 20, t.btnText);
    txt(W / 2, top + 236, C0.stars < 3 ? (C0.stars < 2 ? '2 stars: ' + C0.L.s2 + ' moves   3 stars: ' + C0.L.s3 : '3 stars: ' + C0.L.s3 + ' moves or less') : 'Perfect run!', 13, t.btnText, 0.5, false);
    drawCoin(W / 2 - 52, top + 262, 9);
    txt(W / 2 - 38, top + 262, '+' + G.coins + ' coins', 15, '#fbbf24', 0);
    let y = top + 316;
    if (!last) { button(W / 2, y, 290, 58, 'Next level', campNextLevel, { primary: true, size: 22 }); y += 68; }
    button(W / 2, y, 290, 46, 'Replay', campRetry, { dark: true, size: 17 });
    button(W / 2, y + 56, 290, 46, 'Levels', leaveToLevels, { dark: true, size: 17 });
  }
