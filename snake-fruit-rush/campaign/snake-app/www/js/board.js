/* Drawing of the puzzle board, the snake and the gameplay HUD. */
(function (S) {
  'use strict';
  const P = S.play, G = () => S.gfx, U = S.UI, E = S.engine;

  // ---------- world background (menu, map, intro and play share it) ----------
  S.drawWorldBg = function (wi, now) {
    const w = S.WORLDS[wi], g = G(), key = S.art.ensureBg(S.scene, wi);
    g.use(0);
    if (key) g.img(key, 0, 0, S.W, S.H, { ox: 0, oy: 0 });
    else g.vgrad(0, 0, S.W, S.H, w.bgTop, w.bgBot, 34);
    if (!S.save.data.reduced) {                                    // a few slow drifting lights (kept tiny and few)
      for (let i = 0; i < 9; i++) {
        const sp = 0.006 + (i % 3) * 0.004, x = (i * 83.7 + now * sp * 0.6) % S.W, y = (S.H + 20 - ((i * 131.3 + now * sp) % (S.H + 40)));
        g.circle(x + Math.sin(now / 900 + i) * 8, y, 2 + (i % 3), w.glow, 0.13 + 0.05 * Math.sin(now / 600 + i));
      }
    }
  };

  // ---------- golden apple (bonus) ----------
  function drawGolden(x, y, s, now) {
    const g = G();
    g.circle(x, y, (22 + 3 * Math.sin(now / 150)) * s, '#fde047', 0.28);
    g.line(x, y - 8 * s, x + 3 * s, y - 14 * s, '#7a4a21', 2.4 * s);
    g.circle(x + 5 * s, y - 12 * s, 3.2 * s, '#facc15');
    g.circle(x, y, 10.5 * s, '#d97706');
    g.circle(x, y, 9.5 * s, '#fbbf24');
    g.circle(x - 3.5 * s, y - 3.5 * s, 3 * s, '#fff3b0');
    if (Math.sin(now / 130) > 0.4) { g.line(x + 11 * s, y - 6 * s, x + 15 * s, y - 6 * s, '#ffffff', 1.8 * s); g.line(x + 13 * s, y - 8 * s, x + 13 * s, y - 4 * s, '#ffffff', 1.8 * s); }
  }

  // ---------- board ----------
  P.drawBoard = function (now) {
    const L = P.layout(), lv = P.lv, rt = P.rt, st = P.st, wi = S.worldIndex(lv.id), w = S.WORLDS[wi], g = G(), c = L.cell;
    const cellC = (i) => ({ x: L.bx + (i % 8) * c + c / 2, y: L.by + ((i / 8) | 0) * c + c / 2, r: (i / 8) | 0 });
    // --- frame + floor (layer 1)
    g.use(1);
    const fx = L.bx - 5, fy = L.by - 5, fs = L.size + 10;
    g.rrect(fx, fy + 6, fs, fs, 18, '#000000', 0.32);
    g.rrect(fx, fy, fs, fs, 18, S.shade(w.frame, 0.25));
    g.rrect(fx + 2, fy + 2, fs - 4, fs - 4, 16, w.frame);
    g.rrect(L.bx, L.by, L.size, L.size, 6, w.floorA);
    for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) if ((r + q) & 1) g.rect(L.bx + q * c, L.by + r * c, c, c, w.floorB);
    g.rrectStroke(L.bx - 2, L.by - 2, L.size + 4, L.size + 4, 9, w.frame, 1, 6);      // hides the square floor corners
    for (let i = 0; i < 64; i++) {                                    // tiny floor details: grass, pebbles, snow, embers, stars
      const h = (Math.imul(i + 11 + wi * 97, 2654435761) >>> 0), cx = L.bx + (i % 8) * c, cy = L.by + ((i / 8) | 0) * c;
      if (h % 5 > 1 || rt.wall[i]) continue;
      const ox = cx + 8 + (h >>> 3) % (c - 16), oy = cy + 8 + (h >>> 9) % (c - 16);
      if (wi === 0) { g.line(ox, oy, ox - 2, oy - 6, '#6aa22a', 2, 0.45); g.line(ox, oy, ox + 2, oy - 7, '#6aa22a', 2, 0.45); g.line(ox, oy, ox + 5, oy - 4, '#6aa22a', 2, 0.45); }
      else if (wi === 1) { g.circle(ox, oy, 2.4, '#b88f55', 0.4); g.circle(ox + 5, oy + 2, 1.6, '#b88f55', 0.35); }
      else if (wi === 2) { g.circle(ox, oy, 2, '#ffffff', 0.9); g.circle(ox + 6, oy + 3, 1.4, '#ffffff', 0.8); }
      else if (wi === 3) { g.line(ox, oy, ox + 7, oy + 4, '#ff7047', 2, 0.35); g.circle(ox, oy, 1.6, '#ffb347', 0.5); }
      else { g.circle(ox, oy, 1.8, '#ffffff', 0.55); g.circle(ox + 7, oy + 4, 1.2, '#a58cff', 0.6); }
    }
    if (S.save.data.pattern) g.img('patterns', L.bx, L.by, L.size, L.size, { frame: w.pattern, alpha: 0.16, ox: 0, oy: 0, z: 0 });
    // link lines (faint dotted): switch -> gate, portal <-> portal
    const dotted = (a, b, color, alpha) => {
      const n = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 11));
      for (let i = 1; i < n; i++) g.circle(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, 2, color, alpha);
    };
    rt.switches.forEach((s) => { if (s.gateIdx >= 0) dotted(cellC(s.cell), cellC(rt.gates[s.gateIdx].cell), '#48d8bf', 0.4); });
    lv.devices.filter((d) => d.type === 'portal').forEach((d, i) => dotted(cellC(d.cells[1][1] * 8 + d.cells[1][0]), cellC(d.cells[0][1] * 8 + d.cells[0][0]), i ? '#ff9a6a' : '#9a8cff', 0.3));
    // ground shadows under tiles
    for (let i = 0; i < 64; i++) if (rt.wall[i]) { const p = cellC(i); g.rrect(p.x - c / 2 + 3, p.y - c / 2 + 7, c - 2, c - 4, 10, '#000000', 0.2); }

    // --- tiles (layer 2). z = row so lower rows overlap upper ones.
    g.use(2);
    for (let i = 0; i < 64; i++) {
      const p = cellC(i);
      if (rt.wall[i]) g.img('wall' + wi, p.x, p.y - c * 0.02, c * 1.05, c * 1.05, { z: p.r });
      else if (rt.ice[i]) {                                          // flat glossy ice (clearly different from the raised wall blocks)
        g.use(1);
        const x0 = p.x - c / 2 + 2, y0 = p.y - c / 2 + 2, q = c - 4;
        g.rrect(x0, y0 + 2, q, q, 10, '#2a7fb0', 0.35);
        g.rrect(x0, y0, q, q, 10, '#8fe3ff');
        g.rrect(x0 + 3, y0 + 3, q - 6, q * 0.5, 8, '#d9f8ff', 0.75);
        g.rrectStroke(x0, y0, q, q, 10, '#3a91ba', 1, 2);
        g.line(x0 + q * 0.22, y0 + q * 0.62, x0 + q * 0.42, y0 + q * 0.42, '#ffffff', 2.4, 0.85);
        g.line(x0 + q * 0.5, y0 + q * 0.78, x0 + q * 0.72, y0 + q * 0.56, '#ffffff', 2.4, 0.7);
        if (!S.save.data.reduced && ((i * 7 + Math.floor(now / 500)) % 9 === 0)) g.circle(p.x + 8, p.y - 7, 2.6, '#ffffff', 0.95);
        g.use(2);
      }
    }
    const multiKey = rt.keys.length > 1, multiGate = rt.gates.length > 1;
    // bombs
    for (let i = 0; i < 64; i++) if (rt.bomb[i]) {
      const p = cellC(i), pulse = 0.5 + 0.5 * Math.sin(now / 260 + i);
      g.use(1); g.circle(p.x, p.y + 4, c * (0.52 + 0.06 * pulse), '#ef4444', 0.16 + 0.1 * pulse); g.use(2);
      g.img('bomb', p.x, p.y - 1, c * 0.96, c * 0.96, { z: p.r + 0.2 });
    }
    // keys
    rt.keys.forEach((k, ki) => {
      if ((st.keyMask >> ki) & 1) return;
      const p = cellC(k.cell), bob = Math.sin(now / 240 + ki) * 2.5;
      g.use(1); g.circle(p.x, p.y + 12, c * 0.26, '#000000', 0.18); g.use(2);
      g.img('key', p.x, p.y + bob, c * 0.82, c * 0.82, { z: p.r + 0.3 });
      if (multiKey) { g.rrect(p.x + 6, p.y - 22, 18, 18, 9, '#000000', 0.55); g.text(p.x + 15, p.y - 13, String(ki + 1), 12, '#ffe879'); }
    });
    // doors (keyed)
    rt.doors.forEach((d, di) => {
      const open = E.doorOpen(rt, st, d), age = now - ((P.doorAt && P.doorAt[di]) || -1e9), p = cellC(d.cell);
      let a = open ? Math.max(0, 1 - age / 420) : 1;
      if (a <= 0.02) return;
      const lift = open ? age / 420 * 10 : 0;
      g.img('door', p.x, p.y + c * 0.5 - lift, c * 0.94, c * 1.2, { oy: 1, z: p.r + 0.4, alpha: a });
      if (multiKey && !open) { g.rrect(p.x - 9, p.y - 2, 18, 18, 9, '#000000', 0.55); g.text(p.x, p.y + 7, String(rt.keys[d.key] ? d.key + 1 : '?'), 12, '#ffe879'); }
    });
    // gates (switch controlled)
    rt.gates.forEach((gt, gi) => {
      const open = E.gateOpen(rt, st, gi), age = now - ((P.gateAt && P.gateAt[gi]) || -1e9), p = cellC(gt.cell);
      const t = S.clamp(age / 260, 0, 1), a = open ? 1 - 0.8 * t : 0.2 + 0.8 * t, drop = open ? t * 8 : (1 - t) * 8;
      if (open && age > 260) { g.rrectStroke(p.x - c * 0.4, p.y - c * 0.4, c * 0.8, c * 0.8, 8, '#7be0d0', 0.55, 2.5); }
      g.img('gate', p.x, p.y + c * 0.5 + (open ? drop : -drop * 0), c * 0.94, c * 1.2, { oy: 1, z: p.r + 0.4, alpha: Math.max(0.28, a) });
      if (multiGate) { g.rrect(p.x - 9, p.y - 2, 18, 18, 9, '#000000', 0.55); g.text(p.x, p.y + 7, String.fromCharCode(65 + gi), 12, '#7be0d0'); }
    });
    // switches
    rt.switches.forEach((s, si) => {
      const p = cellC(s.cell), lit = s.gateIdx >= 0 && E.gateOpen(rt, st, s.gateIdx);
      g.img('switch', p.x, p.y + (lit ? 3 : 0), c * 0.86, c * 0.86, { z: p.r + 0.1, alpha: lit ? 0.78 : 1, scaleY: lit ? 0.86 : 1 });
      if (multiGate) { g.rrect(p.x + 4, p.y - 22, 18, 18, 9, '#000000', 0.55); g.text(p.x + 13, p.y - 13, String.fromCharCode(65 + si), 12, '#7be0d0'); }
    });
    // portals
    lv.devices.filter((d) => d.type === 'portal').forEach((d, pi) => {
      d.cells.forEach((cc, ei) => {
        const p = cellC(cc[1] * 8 + cc[0]), sw = 1 + 0.04 * Math.sin(now / 300 + ei * 2);
        g.use(1); g.circle(p.x, p.y + 6, c * 0.46, pi ? '#ff9a6a' : '#7a6cff', 0.2 + 0.1 * Math.sin(now / 260 + pi)); g.use(2);
        g.img('tele' + (pi % 2), p.x, p.y - 1, c * 1.02 * sw, c * 1.02 * sw, { frame: ei ? 'b' : 'a', z: p.r + 0.2 });
        if (lv.devices.filter((x) => x.type === 'portal').length > 1) { g.rrect(p.x + 6, p.y - 24, 18, 18, 9, '#000000', 0.55); g.text(p.x + 15, p.y - 15, String(pi + 1), 12, '#ffffff'); }
      });
    });
    // fruits
    rt.fruits.forEach((f, fi) => {
      if ((st.fruitMask >> fi) & 1) return;
      const p = cellC(f.cell), bob = Math.sin(now / 250 + fi * 1.7) * 2.4;
      g.use(1); g.rrect(p.x - c * 0.22, p.y + c * 0.22, c * 0.44, c * 0.12, 6, '#000000', 0.2); g.use(2);
      if (f.species === 'golden') {
        drawGolden(p.x, p.y + bob, c / 24, now);
      } else {
        const big = f.species === 'bigfruit';
        const frame = big ? 'apple' : f.species, size = c * (big ? 1.0 : 0.8);
        if (!f.required) {                                         // optional / bonus fruit gets a pulsing ring + star
          g.use(1); g.ring(p.x, p.y, c * (0.42 + 0.03 * Math.sin(now / 200 + fi)), '#fff4ae', 0.9, 2.5); g.circle(p.x, p.y, c * 0.4, '#ffffff', 0.12); g.use(2);
          g.img('stars', p.x + c * 0.32, p.y - c * 0.34, 15, 15, { frame: 1, z: p.r + 0.6 });
        }
        g.img('fruits', p.x, p.y + bob, size, size, { frame: frame, z: p.r + 0.3 });
      }
    });
    // exit
    {
      const p = cellC(rt.exit), ready = E.exitReady(rt, st), age = now - P.exitAt, pulse = 1 + (ready ? 0.05 * Math.sin(now / 220) : 0) + (age < 500 ? 0.3 * S.ease.pulse(age / 500) : 0);
      g.use(1);
      if (ready) { g.circle(p.x, p.y + 2, c * (0.62 + 0.05 * Math.sin(now / 240)), '#8ef5d4', 0.2); g.circle(p.x, p.y + 2, c * 0.46, '#d8fff0', 0.18); }
      g.use(2);
      g.img('exit' + wi, p.x, p.y - 2, c * 1.12 * pulse, c * 1.12 * pulse, { z: p.r + 0.1, alpha: ready ? 1 : 0.5 });
      if (!ready) {
        const left = rt.fruits.filter((f, i) => f.required && !((st.fruitMask >> i) & 1)).length;
        g.rrect(p.x - 13, p.y + 4, 26, 20, 10, '#000000', 0.62);
        g.text(p.x, p.y + 14, String(left), 14, '#ffffff');
      }
    }
    // hint path (after a watched rewarded ad)
    g.use(2);
    if (P.hintCells) P.hintCells.forEach((ci, i) => { const p = cellC(ci); g.circle(p.x, p.y, 4 + 1.2 * Math.sin(now / 200 + i * 0.5), '#ffffff', 0.55); });

    // --- snake (layer 3)
    g.use(3);
    const vis = P.visualCells(), k = c / 32, pts = vis.map((q) => ({ x: L.bx + (q.x + 0.5) * c, y: L.by + (q.y + 0.5) * c }));
    const dying = P.mode === 'dying' || (P.mode === 'done' && P.failInfo);
    if (dying) {                                                    // head bumps into what it hit
      const age = Math.min(1, (now - P.endAt) / 140), off = S.ease.out(age) * c * 0.3;
      pts[0].x += P.bumpDir[0] * off; pts[0].y += P.bumpDir[1] * off;
    } else if (P.mode !== 'paused' && !S.save.data.reduced) pts[0].y += Math.sin(now / 150) * 1.4;     // tiny head bob
    const ring = null, ea = now - P.eatAt;
    S.snakeClock(now);
    S.snakeDraw.snake(pts, P.st.dir, k, { cell: c, ring: ring, pulseIdx: ea < 420 ? Math.floor((ea / 420) * P.st.body.length) : undefined, pulseT: ea < 420 ? 0.5 + 0.5 * Math.sin(ea / 420 * Math.PI) : 0, dim: dying ? 0.92 : 1 });
    if (P.waiting && P.mode === 'run') {                           // stopped at the end of the ice: show the free turns
      const h = pts[0], d = P.st.dir, pulse = 0.55 + 0.45 * Math.sin(now / 160);
      [[-d[1], d[0]], [d[1], -d[0]]].forEach((t) => {
        const tx = h.x + t[0] * c * 0.95, ty = h.y + t[1] * c * 0.95;
        g.circle(tx, ty, 12, '#ffffff', 0.25 * pulse + 0.1);
        g.poly([{ x: tx + t[0] * 9, y: ty + t[1] * 9 }, { x: tx - t[1] * 7 - t[0] * 3, y: ty + t[0] * 7 - t[1] * 3 }, { x: tx + t[1] * 7 - t[0] * 3, y: ty - t[0] * 7 - t[1] * 3 }], '#ffffff', 0.5 + 0.4 * pulse);
      });
    }
    // collision marker
    if (P.failInfo && P.failInfo.cell !== undefined && P.failInfo.reason !== 'trap') {
      const p = cellC(P.failInfo.cell);
      g.ring(p.x, p.y, c * 0.45 + 3 * Math.sin(now / 120), '#ff6b6b', 0.9, 3);
    }
    if (P.failInfo && P.failInfo.reason === 'wall') {                // the wall the snake hit
      const h = P.st.body[0], dx = P.bumpDir[0], dy = P.bumpDir[1], cx = (h % 8) + dx, cy = ((h / 8) | 0) + dy;
      if (cx >= 0 && cy >= 0 && cx < 8 && cy < 8) { const p = cellC(cy * 8 + cx); g.rrect(p.x - c / 2, p.y - c / 2, c, c, 8, '#ff3b30', 0.28 + 0.12 * Math.sin(now / 100)); }
    }
    // --- fx
    P.fx.forEach((e) => {
      const t = e.life / e.max;
      if (e.k === 'spark') g.circle(e.x, e.y, e.r * (0.4 + 0.6 * t), e.color, Math.min(1, t * 1.6));
      else if (e.k === 'ring') { const r = e.r0 + (e.r1 - e.r0) * (1 - t); g.ring(e.x, e.y, r, e.color, t, 3 * t + 1); }
      else if (e.k === 'conf') {
        const w = 5, h = 8, co = Math.cos(e.rot), si = Math.sin(e.rot);
        g.poly([{ x: e.x + co * -w - si * -h, y: e.y + si * -w + co * -h }, { x: e.x + co * w - si * -h, y: e.y + si * w + co * -h }, { x: e.x + co * w - si * h, y: e.y + si * w + co * h }, { x: e.x + co * -w - si * h, y: e.y + si * -w + co * h }], e.color, Math.min(1, t * 2.5));
      } else if (e.k === 'pop') {
        const sc = 1 + (1 - t) * 0.9, sp = e.species === 'golden' ? 'apple' : (e.species === 'bigfruit' ? 'apple' : e.species);
        g.img('fruits', e.x, e.y, c * 0.8 * sc, c * 0.8 * sc, { frame: sp, alpha: t * 0.9, z: 80 });
      }
    });
    if (P.mode === 'dying' || (P.mode === 'done' && P.failInfo)) {
      const age = now - P.endAt;
      if (age < 260) g.rect(0, 0, S.W, S.H, '#ff2d2d', 0.22 * (1 - age / 260));
    }
    // floating texts
    g.use(4);
    P.fx.forEach((e) => { if (e.k === 'text') { const t = e.life / e.max; g.text(e.x, e.y, e.s, e.size, e.color, { alpha: Math.min(1, t * 2.2), shadow: '#000000', shadowDy: 1.5 }); } });
  };

  // ---------- HUD (compact: the board is the hero) ----------
  P.drawHud = function (now) {
    const lv = P.lv, rt = P.rt, st = P.st, wi = S.worldIndex(lv.id), w = S.WORLDS[wi], g = G(), ui = S.ui, L = P.layout();
    g.use(4);
    // top row: level, pause
    ui.chip(12, 10, 112, 34);
    g.circle(31, 27, 8, w.accent); g.circle(31, 27, 3.6, '#ffffff', 0.9);
    g.text(46, 27, 'LEVEL ' + lv.id, 15, U.ink, { ox: 0 });
    ui.round(S.W - 12 - 23, 27, 22, 'pause', () => S.screens.pause(), { id: 'pause' });
    // objective: one line, straight on the background
    g.text(S.W / 2, 64, S.objectiveText(lv), 13.5, '#fff6dc', { shadow: '#000000', shadowDy: 1.5, wrap: 420 });
    // bottom bar: fruit / key progress, moves, stars
    const sy = L.statY, par = lv.parMoves, cap = lv.hardMoveLimit, over = st.moves > par, nearCap = cap && st.moves >= cap * 0.85;
    g.rrect(12, sy, S.W - 24, 44, 22, '#000000', 0.38);
    let ix = 34;
    rt.fruits.forEach((f, i) => {
      if (!f.required) return;
      const got = (st.fruitMask >> i) & 1, frame = f.species === 'golden' || f.species === 'bigfruit' ? 'apple' : f.species;
      g.img('fruits', ix, sy + 22, 26, 26, { frame: frame, alpha: got ? 1 : 0.4 });
      if (got) { g.circle(ix + 10, sy + 31, 7, U.green); g.line(ix + 6.5, sy + 31, ix + 9, sy + 33.5, '#ffffff', 2); g.line(ix + 9, sy + 33.5, ix + 13.5, sy + 28, '#ffffff', 2); }
      ix += 32;
    });
    rt.keys.forEach((k, i) => { const got = (st.keyMask >> i) & 1; g.img('key', ix, sy + 22, 24, 24, { alpha: got ? 1 : 0.4 }); ix += 30; });
    g.text(S.W / 2 + 18, sy + 22, st.moves + ' / ' + (cap || par), 18, nearCap ? '#ff8a7a' : (over && !cap ? '#ffd27a' : '#ffffff'), { shadow: '#000000', shadowDy: 1.5 });
    g.text(S.W / 2 + 18 - 62, sy + 23, 'MOVES', 9.5, '#fff6dc', { alpha: 0.7 });
    const stars = P.starsPossible();
    for (let i = 0; i < 3; i++) ui.star(S.W - 24 - 70 + i * 26, sy + 22, 24, i < stars);
    // beginner help on the first levels: a swipe hand until the player has swiped once
    if (lv.id <= 3 && !S.save.data.seen.swipe && (P.mode === 'ready' || P.mode === 'run')) {
      const d = st.dir, tx = -d[1] || 1, ty = d[0] || 1, t = (now % 1500) / 1500, e = S.ease.inOut(t);       // swipe sideways relative to the heading
      const hx = L.bx + L.size / 2 + tx * (e - 0.5) * 120, hy = L.by + L.size * 0.8 + ty * (e - 0.5) * 120 * (tx ? 0 : 1);
      g.circle(hx, hy, 17, '#ffffff', 0.85 * (1 - Math.abs(e - 0.5) * 0.6)); g.circle(hx, hy, 9, '#ffe879', 0.9);
      g.text(S.W / 2, L.by + L.size * 0.8 - 40, 'SWIPE TO TURN', 16, '#ffffff', { shadow: '#000000', shadowDy: 2 });
      g.text(S.W / 2, L.by + L.size * 0.8 + 46, 'the snake keeps moving by itself', 12, '#fff6dc', { alpha: 0.9, bold: false });
    } else if (S.save.data.dpad) P.drawDpad(L);
    // READY -> GO
    if (P.mode === 'ready') {
      const long = P.readyDur > 1000, seg = P.readyDur / (long ? 4 : 1.8), step = long ? Math.min(3, Math.floor(P.readyT / seg)) : (P.readyT < P.readyDur * 0.55 ? 0 : 1);
      const local = long ? (P.readyT - step * seg) / seg : (step ? (P.readyT - P.readyDur * 0.55) / (P.readyDur * 0.45) : P.readyT / (P.readyDur * 0.55));
      const label = long ? (step === 3 ? 'GO!' : String(3 - step)) : (step ? 'GO!' : 'READY');
      const sc = 1 + 0.45 * (1 - S.ease.out(S.clamp(local * 2.2, 0, 1))), cx = S.W / 2, cy = L.by + L.size * 0.42;
      g.rrect(L.bx, L.by, L.size, L.size, 8, '#000000', 0.2);
      g.text(cx, cy, label, (label.length > 2 ? 72 : 110) * 1, label === 'GO!' ? '#ffe879' : '#ffffff', { shadow: '#000000', shadowDy: 6, scale: sc, alpha: 1 - Math.max(0, local - 0.7) * 2 });
    }
  };

  // stars that are still reachable with the current attempt
  P.starsPossible = function () {
    const lv = P.lv, st = P.st, sr = lv.starRules;
    let n = 1;
    const cap = sr.two.value;
    if (st.moves <= cap) {
      n = 2;
      const ok = sr.three.every((r) => {
        if (r.type === 'movesAtMost') return st.moves <= r.value;
        if (r.type === 'skipOptional') return P.rt.fruits.every((f, i) => f.required || f.species !== r.species || !((st.fruitMask >> i) & 1));
        if (r.type === 'exactLength') return st.body.length <= r.value;
        return true;
      });
      if (ok) n = 3;
    }
    return n;
  };

  P.drawDpad = function (L) {
    const g = G(), cx = S.W / 2, cy = L.dpadY, b = 66, ui = S.ui;
    const btn = (id, x, y, dir, arrow) => {
      const pressed = ui.pressed === id;
      g.rrect(x - b / 2, y - b / 2 + 4, b, b, 18, '#000000', 0.3);
      g.rrect(x - b / 2, y - b / 2 + (pressed ? 3 : 0), b, b, 18, U.creamEdge);
      g.rrect(x - b / 2 + 3, y - b / 2 + 3 + (pressed ? 3 : 0), b - 6, b - 6, 15, U.cream);
      const a = 11, yy = y + (pressed ? 3 : 0);
      g.poly([{ x: x + dir[0] * a, y: yy + dir[1] * a }, { x: x - dir[1] * a - dir[0] * a * 0.4, y: yy + dir[0] * a - dir[1] * a * 0.4 }, { x: x + dir[1] * a - dir[0] * a * 0.4, y: yy - dir[0] * a - dir[1] * a * 0.4 }], U.ink);
      ui.reg(id, x - b / 2 - 4, y - b / 2 - 4, b + 8, b + 8, () => {}, false);
      ui.buttons[ui.buttons.length - 1].down = () => P.turn(dir);
    };
    btn('dp-u', cx, cy - b * 0.62, E.DIRS.up); btn('dp-d', cx, cy + b * 0.62, E.DIRS.down);
    btn('dp-l', cx - b * 1.1, cy, E.DIRS.left); btn('dp-r', cx + b * 1.1, cy, E.DIRS.right);
  };
})(window.SFR);
