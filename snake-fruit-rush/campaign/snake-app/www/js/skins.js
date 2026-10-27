/* Snake skins and the snake renderer. Skins are cosmetic only: they never change length, speed or hit boxes. */
(function (S) {
  'use strict';
  S.SKINS = [
    { id: 'default', name: 'Classic', cost: 0, a: '#4ade80', b: '#22c55e', head: '#86ff74', line: '#22c55e' },
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
  S.SKIN_BY_ID = {};
  S.SKINS.forEach((s) => { S.SKIN_BY_ID[s.id] = s; });
  S.activeSkin = () => S.SKIN_BY_ID[(S.save.data && S.save.data.skin) || 'default'] || S.SKINS[0];

  const T = { now: 0 };                      // animation clock (ms), set by the main loop
  S.snakeClock = (t) => { T.now = t; };

  function segColor(sk, i, n) {
    if (sk.pattern === 'rainbow') return S.hsl(i * 30 + T.now * 0.05, 85, 56);
    if (sk.pattern === 'shimmer' && Math.floor(T.now / 70) % (n + 8) === i) return '#ffffff';
    return i % 2 ? sk.a : sk.b;
  }

  // Cute head: big shiny eyes, rosy cheeks, plus the animal extras of a skin. k = size (1 = 22 px cell).
  function drawHead(sk, hx, hy, dx, dy, k, ring) {
    const G = S.gfx, px = -dy, py = dx, an = sk.animal;
    const at = (f, sd) => ({ x: hx + f[0] * k * dx + f[1] * k * px * sd, y: hy + f[0] * k * dy + f[1] * k * py * sd });
    if (an !== 'unicorn') G.line(hx + 10 * k * dx, hy + 10 * k * dy, hx + 19 * k * dx, hy + 19 * k * dy, '#ff4d6d', 3 * k);   // tongue
    if (an === 'panda') [1, -1].forEach((sd) => { const e = at([-5, 10], sd); G.circle(e.x, e.y, 5.2 * k, '#1f2937'); });
    if (an === 'dragon') [1, -1].forEach((sd) => { const a1 = at([-2, 8], sd), a2 = at([-11, 13], sd); G.line(a1.x, a1.y, a2.x, a2.y, '#f59e0b', 4.2 * k); });
    if (ring) G.circle(hx, hy, 16 * k, ring, 0.9);
    G.circle(hx, hy, 12.8 * k, S.shade(sk.head, -0.35), 0.5);        // soft rim
    G.circle(hx, hy, 12.2 * k, sk.head);
    if (an === 'panda') [1, -1].forEach((sd) => { const e = at([4.5, 6.2], sd); G.circle(e.x, e.y, 5.9 * k, '#1f2937'); });
    if (an === 'unicorn') {
      G.line(hx + 7 * k * dx, hy + 7 * k * dy, hx + 18 * k * dx, hy + 18 * k * dy, '#fcd34d', 4.6 * k);
      G.line(hx + 12 * k * dx, hy + 12 * k * dy, hx + 18 * k * dx, hy + 18 * k * dy, '#f59e0b', 2.4 * k);
      const m = at([-6, 0], 1); G.circle(m.x, m.y, 3.6 * k, '#f472b6');
    }
    [1, -1].forEach((sd) => {
      const e = at([4.5, 6.2], sd), c = at([1, 10], sd);
      if (an !== 'panda') G.circle(c.x, c.y, 2.3 * k, '#ff8fab', 0.7);
      G.circle(e.x, e.y, 4.9 * k, '#ffffff');
      G.circle(e.x + 1.7 * k * dx, e.y + 1.7 * k * dy, 2.6 * k, '#111111');
      G.circle(e.x + 0.4 * k * dx - 0.9 * k * px * sd, e.y + 0.4 * k * dy - 0.9 * k * py * sd, 1 * k, '#ffffff');
    });
  }

  /* pts: [{x,y}] head first (screen px, may be fractional). k: scale (cell / 22).
   * o: { skin, ring, pulseIdx, pulseT (0..1), dim (0..1 fades the whole snake), cell } */
  function drawSnake(pts, dir, k, o) {
    o = o || {};
    const G = S.gfx, g = G.g, sk = o.skin || S.activeSkin(), n = pts.length, cell = o.cell || 22 * k;
    const far = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > cell * 1.7;       // portal jump
    const path = (width, color, alpha, dx, dy) => {
      g.lineStyle(width, S.C(color), alpha);
      g.beginPath();
      g.moveTo(pts[n - 1].x + dx, pts[n - 1].y + dy);
      for (let i = n - 2; i >= 0; i--) {
        if (far(pts[i], pts[i + 1])) g.moveTo(pts[i].x + dx, pts[i].y + dy); else g.lineTo(pts[i].x + dx, pts[i].y + dy);
      }
      g.strokePath();
    };
    const dim = o.dim === undefined ? 1 : o.dim;
    path(19.5 * k, '#06150c', 0.32 * dim, 0, 1.2 * k);                  // soft outline / shadow so the snake pops from any floor
    path(15 * k, sk.line, dim, 0, 0);
    for (let i = n - 1; i >= 1; i--) {
      const fromTail = n - 1 - i;
      let r = fromTail < 3 ? [6, 7.5, 9][fromTail] : 10.5;
      if (o.pulseIdx !== undefined && Math.abs(i - o.pulseIdx) <= 1) r *= 1 + 0.22 * S.ease.pulse(o.pulseT || 0) * (i === o.pulseIdx ? 1 : 0.5);
      G.circle(pts[i].x, pts[i].y, r * k, segColor(sk, i, n), dim);
      if (sk.pattern === 'stars' && i % 3 === 0) G.circle(pts[i].x + 2 * k, pts[i].y - 2 * k, 1.8 * k, '#ffffff', dim);
    }
    path(4.2 * k, '#ffffff', 0.22 * dim, -2.2 * k, -3.2 * k);           // gloss line along the back
    drawHead(sk, pts[0].x, pts[0].y, dir[0], dir[1], k, o.ring);
  }

  // Small horizontal snake used on skin cards (head on the right).
  function miniSnake(sk, cx, cy, k) {
    const G = S.gfx, n = 5;
    k = k || 0.9;
    G.line(cx - 24 * k, cy, cx + 18 * k, cy, sk.line, 11 * k);
    for (let i = n - 1; i >= 1; i--) G.circle(cx + 18 * k - i * 10.5 * k, cy, (i === n - 1 ? 4.5 : 7) * k, segColor(sk, i, n));
    drawHead(sk, cx + 18 * k, cy, 1, 0, 0.72 * k, null);
  }

  S.snakeDraw = { snake: drawSnake, head: drawHead, mini: miniSnake, segColor: segColor };
})(window.SFR);
