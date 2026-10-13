/* Level layouts: hand-made early levels, then endless procedural generation.
   Cell legend: . empty | n normal | r reinforced | b bonus | u unbreakable */
(function () {
  const C = PB.CFG;

  const HAND = [
    [ '.nnnnnnnn.',
      'nnnnnnnnnn',
      'nnnnbbnnnn',
      '.nnnnnnnn.' ],
    [ 'nnnnnnnnnn',
      'nrrnnnnrrn',
      'nnnnnnnnnn',
      '.nnbnnbnn.' ],
    [ 'nnnnnnnnnn',
      'u..nnnn..u',
      'rrrnnnnrrr',
      'nnnnbbnnnn',
      '..nnnnnn..' ],
    [ 'rnrnrnrnrn',
      'nrnrnrnrnr',
      '..........',
      'nnnbnnbnnn',
      'u.nnnnnn.u' ],
    [ 'rrrrrrrrrr',
      'n.n.nn.n.n',
      'nnnnbbnnnn',
      'u.rrrrrr.u',
      'nnnnnnnnnn' ],
    [ 'u.rrrrrr.u',
      'nrnrbbrnrn',
      'nnnnnnnnnn',
      'rr..uu..rr',
      'nnnnnnnnnn',
      '.nnnnnnnn.' ]
  ];

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generate(n) {
    const rnd = rng(n * 7919 + 13);
    const rows = Math.min(9, 5 + Math.floor((n - 5) / 2));
    const half = C.GRID_COLS / 2;
    const density = Math.min(0.95, 0.68 + n * 0.02);
    const pR = Math.min(0.5, 0.12 + n * 0.025);
    const pU = Math.min(0.1, 0.02 + n * 0.006);
    const pB = 0.05;
    const style = n % 3;
    const out = [];
    for (let r = 0; r < rows; r++) {
      const left = [];
      for (let c = 0; c < half; c++) {
        let ch = '.';
        let p = density;
        if (style === 1 && (r + c) % 2 === 1) p *= 0.45;
        if (style === 2 && r % 3 === 2) p *= 0.5;
        if (rnd() < p) {
          const x = rnd();
          if (x < pU && r > 0) ch = 'u';
          else if (x < pU + pB) ch = 'b';
          else if (x < pU + pB + pR) ch = 'r';
          else ch = 'n';
        }
        left.push(ch);
      }
      out.push(left.join('') + left.slice().reverse().join(''));
    }
    return out;
  }

  /* Remove breakable blocks the ball could never reach (sealed in by unbreakables). */
  function pruneUnreachable(g) {
    const R = g.length, K = C.GRID_COLS;
    const seen = g.map(() => new Array(K).fill(false));
    const stack = [];
    for (let c = 0; c < K; c++) if (g[R - 1][c] !== 'u') { seen[R - 1][c] = true; stack.push([R - 1, c]); }
    while (stack.length) {
      const [r, c] = stack.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= R || nc >= K || seen[nr][nc] || g[nr][nc] === 'u') return;
        seen[nr][nc] = true; stack.push([nr, nc]);
      });
    }
    return g.map((row, r) => row.split('').map((ch, c) => (ch !== '.' && ch !== 'u' && !seen[r][c]) ? '.' : ch).join(''));
  }

  PB.buildLevel = function (n) {
    let pattern = n <= HAND.length ? HAND[n - 1].slice() : generate(n);
    pattern = pruneUnreachable(pattern);

    const cells = [];
    pattern.forEach((row, r) => row.split('').forEach((ch, c) => {
      if (ch === '.') return;
      let hp = 1;
      if (ch === 'r') hp = n >= 12 ? 3 : (n >= 6 && ((r + c) % 3 === 0) ? 3 : 2);
      cells.push({ c, r, kind: ch, hp });
    }));
    if (!cells.some(k => k.kind !== 'u')) cells.push({ c: 4, r: 0, kind: 'n', hp: 1 });

    const rows = pattern.length;
    const bottom = C.GRID_Y + rows * C.CELL_H;
    const obsCount = n < 4 ? 0 : Math.min(3, 1 + Math.floor((n - 4) / 4));
    const obstacles = [];
    for (let i = 0; i < obsCount; i++) {
      obstacles.push({
        y: Math.min(470, bottom + 38 + i * 42),
        x: 100 + i * 140,
        dir: i % 2 ? -1 : 1,
        speed: Math.min(210, 70 + n * 7 + i * 12)
      });
    }
    return {
      cells,
      obstacles,
      ballSpeed: Math.min(640, 360 + 16 * (n - 1)),
      paddleW: Math.max(C.PADDLE_MIN_W, C.PADDLE_W - 3 * (n - 1))
    };
  };
})();
