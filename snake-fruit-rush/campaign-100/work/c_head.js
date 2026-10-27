
  // ---------- Campaign: 100 levels in 5 worlds (the level data and rules engine are embedded above) ----------
  const E = window.SFREngine, LV = window.SFR_LEVELS || [];
  const LEVEL_COUNT = LV.length;
  const UNLOCK_ALL = /[?&]unlock=1/.test(location.search);        // testing: all levels open (not saved)
  const READY_MS = 1100;
  const SPEED_MUL = () => (window.__speedMul > 0 ? window.__speedMul : 1);
  const WORLDS = [
    { name: 'Garden', sub: 'Walls, fruit and the exit', pattern: 3, pal: { bg: '#123a22', board1: '#b5e061', board2: '#a9d655', panel: '#2d7a4a', accent: '#ffd23f', text: '#f0fdf4', btnText: '#ffffff', head: '#2f6bff', a: '#5b8cff', b: '#3f73e0' },
      wall: { base: '#2f8f3a', top: '#6bdc62', edge: '#1b5a28' } },
    { name: 'Desert', sub: 'Winding canyons and dead ends', pattern: 1, pal: { bg: '#3a2210', board1: '#f4dca4', board2: '#eed199', panel: '#a35e2c', accent: '#ffb703', text: '#fff4e0', btnText: '#ffffff', head: '#12806f', a: '#26b59c', b: '#1a9680' },
      wall: { base: '#c4783f', top: '#eaa86a', edge: '#82481f' } },
    { name: 'Ice', sub: 'Slippery floors. Plan your stops!', pattern: 2, pal: { bg: '#0a2a4d', board1: '#c3e6f7', board2: '#b8dff3', panel: '#2f6fb3', accent: '#7dd3fc', text: '#e6f6ff', btnText: '#ffffff', head: '#ff7a59', a: '#ff9470', b: '#f4693f' },
      wall: { base: '#3f78c4', top: '#a9dcff', edge: '#244f8c' } },
    { name: 'Volcano', sub: 'Bombs! Steer around the danger', pattern: 4, pal: { bg: '#2a0c0c', board1: '#47292b', board2: '#4f2e30', panel: '#8a3420', accent: '#ffb020', text: '#ffe8d6', btnText: '#ffffff', head: '#fff09a', a: '#ffd166', b: '#ff9f1c' },
      wall: { base: '#2e2433', top: '#5d4a66', edge: '#150f19' } },
    { name: 'Night', sub: 'Keys, gates, switches and portals', pattern: 2, pal: { bg: '#090920', board1: '#1c2044', board2: '#222850', panel: '#40408a', accent: '#c4b5fd', text: '#e0e7ff', btnText: '#ffffff', head: '#9dff7a', a: '#4ade80', b: '#22c55e' },
      wall: { base: '#3b3880', top: '#7a76d6', edge: '#1c1a47' } }
  ];
  const GATE_COLS = ['#f97316', '#22d3ee', '#a3e635', '#f472b6'];
  const FAIL_TEXT = { wall: 'You hit a wall', body: 'You bit your own tail', trap: 'Boom! You hit a bomb', door: 'That way is closed', stuck: 'Stuck on the ice' };
  const hh = (a, b, s) => {                                           // tiny deterministic hash 0..1 (for tile decoration)
    let h = Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663) ^ Math.imul(s + 1, 83492791);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const lvLayer = (str) => {
    const a = new Uint8Array(COLS * ROWS);
    if (!str) return a;
    for (let y = 0; y < ROWS; y++) {
      let m = 0;
      for (let k = 0; k < 4; k++) m = (m << 5) | parseInt(str[y * 4 + k], 32);
      for (let x = 0; x < COLS; x++) if ((m >> x) & 1) a[y * COLS + x] = 1;
    }
    return a;
  };
  function engineLevel(L) {
    const walls = [], ice = [], items = [], devices = [], w = lvLayer(L.W), ic = lvLayer(L.I), bm = lvLayer(L.B);
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = [i % COLS, (i / COLS) | 0];
      if (w[i]) walls.push(c);
      if (ic[i]) ice.push(c);
      if (bm[i]) items.push({ type: 'bomb', cell: c });
    }
    L.F.forEach((c) => items.push({ type: 'fruit', cell: c, species: 'apple', required: true }));
    (L.K || []).forEach((c, i) => items.push({ type: 'key', cell: c, id: 'k' + i }));
    (L.D || []).forEach((c, i) => devices.push({ type: 'door', cell: c, id: 'k' + i }));
    (L.G || []).forEach((c, i) => devices.push({ type: 'gate', cell: c, id: 'g' + i, startOpen: false }));
    (L.S || []).forEach((s, i) => devices.push({ type: 'switch', cell: [s[0], s[1]], id: 's' + i, gate: 'g' + s[2] }));
    (L.P || []).forEach((p) => devices.push({ type: 'portal', cells: [[p[0], p[1]], [p[2], p[3]]] }));
    return { board: { cols: COLS, rows: ROWS, walls: walls, ice: ice }, snake: { head: [L.s[0], L.s[1]], direction: ['up', 'right', 'down', 'left'][L.s[2]], length: 3 },
      items: items, devices: devices, exit: { cell: L.E }, starRules: { two: { type: 'complete' }, three: [] } };
  }
  function cleanCamp(c) {
    const o = { unlocked: 1, cur: 1, stars: {} };
    if (c && typeof c === 'object') {
      o.unlocked = num(c.unlocked, 1, Math.max(1, LEVEL_COUNT), 1);
      if (c.stars && typeof c.stars === 'object') {
        Object.keys(c.stars).forEach((k) => {
          const id = k | 0, s = num(c.stars[k], 0, 3, 0);
          if (id >= 1 && id <= LEVEL_COUNT && s > 0) { o.stars[id] = s; if (id + 1 > o.unlocked) o.unlocked = Math.min(LEVEL_COUNT, id + 1); }
        });
      }
      o.cur = num(c.cur, 1, o.unlocked, o.unlocked);
    }
    return o;
  }
  // Power-ups that can be bought with coins and used inside levels.
  const PW = {
    slow: { name: 'Slow-Mo', cost: 60, desc: 'Snake moves slower for a while' },
    shield: { name: 'Shield', cost: 90, desc: 'Saves you from one crash' },
    sweep: { name: 'Defuse', cost: 80, desc: 'Removes bombs near you' },
    coin2: { name: '2x Coins', cost: 70, desc: 'Double coins in this level' }
  };
  const PW_KEYS = Object.keys(PW);
  function cleanPw(p) {
    const o = {};
    PW_KEYS.forEach((k) => { o[k] = num(p && p[k], 0, 99, 0); });
    return o;
  }
