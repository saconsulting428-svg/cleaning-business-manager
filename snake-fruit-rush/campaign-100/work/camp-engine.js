/* Snake Fruit Rush - puzzle rules engine.
 * Pure logic, no rendering and no timers: the game calls step() once per snake tick and the validator
 * (tools/validate-levels.mjs) calls the very same function, so what is tested is what is played.
 * Coordinates are (x, y), origin top-left. A "tick" is one head-cell transition (one move). */
(function (root) {
  'use strict';

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const DIR_LIST = [DIRS.up, DIRS.right, DIRS.down, DIRS.left];
  const sameDir = (a, b) => a[0] === b[0] && a[1] === b[1];
  const opposite = (a, b) => a[0] === -b[0] && a[1] === -b[1];

  // ---------- level -> runtime tables (built once per level) ----------
  function makeRuntime(level) {
    const cols = level.board.cols, rows = level.board.rows, n = cols * rows;
    const idx = (c) => c[1] * cols + c[0];
    const rt = {
      level: level, cols: cols, rows: rows, n: n, idx: idx,
      wall: new Uint8Array(n), ice: new Uint8Array(n), bomb: new Uint8Array(n),
      fruitAt: new Int16Array(n).fill(-1), keyAt: new Int16Array(n).fill(-1),
      doorAt: new Int16Array(n).fill(-1), gateAt: new Int16Array(n).fill(-1),
      switchAt: new Int16Array(n).fill(-1), portalTo: new Int16Array(n).fill(-1),
      fruits: [], keys: [], doors: [], gates: [], switches: [], requiredMask: 0,
      exit: idx(level.exit.cell), hardCap: level.hardMoveLimit || 0, startGateMask: 0
    };
    level.board.walls.forEach((c) => { rt.wall[idx(c)] = 1; });
    (level.board.ice || []).forEach((c) => { rt.ice[idx(c)] = 1; });
    level.items.forEach((it) => {
      const i = idx(it.cell);
      if (it.type === 'bomb') rt.bomb[i] = 1;
      else if (it.type === 'fruit') {
        rt.fruitAt[i] = rt.fruits.length;
        rt.fruits.push({ cell: i, species: it.species, required: it.required !== false });
        if (it.required !== false) rt.requiredMask |= 1 << (rt.fruits.length - 1);
      } else if (it.type === 'key') { rt.keyAt[i] = rt.keys.length; rt.keys.push({ id: it.id, cell: i }); }
    });
    level.devices.forEach((d) => {
      if (d.type === 'door') {
        const k = rt.keys.findIndex((x) => x.id === d.id);
        rt.doorAt[idx(d.cell)] = rt.doors.length;
        rt.doors.push({ id: d.id, cell: idx(d.cell), key: k });
      } else if (d.type === 'gate') {
        let gi = rt.gates.findIndex((x) => x.id === d.id);
        if (gi < 0) { gi = rt.gates.length; rt.gates.push({ id: d.id, cell: idx(d.cell), cells: [], startOpen: !!d.startOpen }); if (d.startOpen) rt.startGateMask |= 1 << gi; }
        rt.gates[gi].cells.push(idx(d.cell));
        rt.gateAt[idx(d.cell)] = gi;
      } else if (d.type === 'switch') {
        rt.switchAt[idx(d.cell)] = rt.switches.length;
        rt.switches.push({ id: d.id, cell: idx(d.cell), gate: d.gate });
      } else if (d.type === 'portal') {
        const a = idx(d.cells[0]), b = idx(d.cells[1]);
        rt.portalTo[a] = b; rt.portalTo[b] = a;
      }
    });
    rt.switches.forEach((s) => { s.gateIdx = rt.gates.findIndex((g) => g.id === s.gate); });
    return rt;
  }

  // ---------- state ----------
  function newState(rt) {
    const s = rt.level.snake, d = DIRS[s.direction], body = [];
    for (let i = 0; i < s.length; i++) body.push((s.head[1] - d[1] * i) * rt.cols + (s.head[0] - d[0] * i));
    return { body: body, dir: d, fruitMask: 0, keyMask: 0, gateMask: rt.startGateMask, moves: 0, done: false, swLog: '', fruitLog: '' };
  }
  function cloneState(st) {
    return { body: st.body.slice(), dir: st.dir, fruitMask: st.fruitMask, keyMask: st.keyMask, gateMask: st.gateMask,
      moves: st.moves, done: st.done, swLog: st.swLog, fruitLog: st.fruitLog };
  }
  function stateKey(st) {
    return st.body.join(',') + '|' + st.dir[0] + st.dir[1] + '|' + st.fruitMask + '|' + st.keyMask + '|' + st.gateMask + '|' + st.swLog;
  }
  const doorOpen = (rt, st, d) => d.key >= 0 && (st.keyMask >> d.key & 1) === 1;
  const gateOpen = (rt, st, gi) => (st.gateMask >> gi & 1) === 1;
  // cell the head could not enter (but that is not deadly by itself on ice)
  function isBlocked(rt, st, i) {
    if (rt.wall[i]) return 'wall';
    const d = rt.doorAt[i];
    if (d >= 0 && !doorOpen(rt, st, rt.doors[d])) return 'door';
    const g = rt.gateAt[i];
    if (g >= 0 && !gateOpen(rt, st, g)) return 'gate';
    return null;
  }
  const exitReady = (rt, st) => (st.fruitMask & rt.requiredMask) === rt.requiredMask;
  const onIce = (rt, st) => rt.ice[st.body[0]] === 1;

  // Which direction would the next tick use if the player sends `input` (or null)?
  function resolveDir(rt, st, input) {
    const head = st.body[0], hx = head % rt.cols, hy = (head / rt.cols) | 0;
    const forwardBlocked = () => {
      const nx = hx + st.dir[0], ny = hy + st.dir[1];
      return nx < 0 || ny < 0 || nx >= rt.cols || ny >= rt.rows || isBlocked(rt, st, ny * rt.cols + nx) !== null;
    };
    const sliding = rt.ice[head] === 1 && !forwardBlocked();
    if (sliding) return { dir: st.dir, forced: true };            // ice: the player cannot steer
    if (input && !opposite(input, st.dir)) return { dir: input, forced: false };
    return { dir: st.dir, forced: false };
  }

  /* One tick. input: [dx,dy] or null.
   * Returns { status: 'ok' | 'win' | 'fail' | 'wait', reason, events } and mutates st. */
  function step(rt, st, input) {
    const ev = [];
    if (st.done) return { status: 'wait', events: ev };
    const cols = rt.cols, rows = rt.rows, head = st.body[0], hx = head % cols, hy = (head / cols) | 0;
    const r = resolveDir(rt, st, input);
    st.dir = r.dir;
    const nx = hx + st.dir[0], ny = hy + st.dir[1];
    const outside = nx < 0 || ny < 0 || nx >= cols || ny >= rows;
    const next = outside ? -1 : ny * cols + nx;
    const blocked = outside ? 'wall' : isBlocked(rt, st, next);
    if (blocked) {
      if (rt.ice[head] === 1) {                                     // slid to a safe stop: wait for a turn...
        let canTurn = false;
        for (const d of DIR_LIST) {
          if (sameDir(d, st.dir) || opposite(d, st.dir)) continue;
          const tx = hx + d[0], ty = hy + d[1];
          if (tx >= 0 && ty >= 0 && tx < cols && ty < rows && isBlocked(rt, st, ty * cols + tx) === null) canTurn = true;
        }
        if (!canTurn) return fail(st, 'stuck', ev);                  // ...unless there is nowhere to go (never leaves the player frozen)
        return { status: 'wait', reason: 'ice', events: ev };
      }
      return fail(st, blocked === 'wall' ? 'wall' : 'door', ev);
    }
    let dest = next;
    if (rt.portalTo[next] >= 0) {                                   // portal: jump to the linked endpoint
      dest = rt.portalTo[next];
      ev.push({ t: 'portal', from: next, to: dest });
    }
    if (rt.bomb[dest]) { ev.push({ t: 'bomb', cell: dest }); return fail(st, 'trap', ev, dest); }
    const fi = rt.fruitAt[dest], eating = fi >= 0 && (st.fruitMask >> fi & 1) === 0;
    const len = st.body.length;
    for (let i = 0; i < len - (eating ? 0 : 1); i++) {            // the tail cell is free when the snake is not growing
      if (st.body[i] === dest) return fail(st, 'body', ev, dest);
    }
    st.body.unshift(dest);
    if (!eating) st.body.pop();
    st.moves++;
    if (eating) {
      st.fruitMask |= 1 << fi;
      st.fruitLog += fi + ',';
      ev.push({ t: 'fruit', cell: dest, index: fi, species: rt.fruits[fi].species, required: rt.fruits[fi].required });
    }
    const ki = rt.keyAt[dest];
    if (ki >= 0 && (st.keyMask >> ki & 1) === 0) {
      st.keyMask |= 1 << ki;
      ev.push({ t: 'key', cell: dest, index: ki });
      rt.doors.forEach((d, di) => { if (d.key === ki) ev.push({ t: 'door', cell: d.cell, index: di }); });
    }
    const si = rt.switchAt[dest];
    if (si >= 0 && rt.switches[si].gateIdx >= 0) {                  // entering a switch toggles its gate
      st.gateMask ^= 1 << rt.switches[si].gateIdx;
      st.swLog += si;
      ev.push({ t: 'switch', cell: dest, index: si, gate: rt.switches[si].gateIdx, open: gateOpen(rt, st, rt.switches[si].gateIdx) });
    }
    if (dest === rt.exit && exitReady(rt, st)) {
      st.done = true;
      ev.push({ t: 'exit', cell: dest });
      return { status: 'win', events: ev };
    }
    if (rt.hardCap && st.moves >= rt.hardCap) return fail(st, 'moves', ev);
    return { status: 'ok', events: ev };
  }
  function fail(st, reason, ev, cell) {
    st.done = true;
    return { status: 'fail', reason: reason, cell: cell, events: ev };
  }


  // ---------- stars ----------
  // Rule types: complete, movesAtMost, exactLength, collectOptional, skipOptional, fruitOrder, switchOrder, switchesAll
  function checkRule(rt, st, rule) {
    switch (rule.type) {
      case 'complete': return true;
      case 'movesAtMost': return st.moves <= rule.value;
      case 'exactLength': return st.body.length === rule.value;
      case 'collectOptional': return rt.fruits.every((f, i) => f.required || f.species !== rule.species || (st.fruitMask >> i & 1) === 1);
      case 'skipOptional': return rt.fruits.every((f, i) => f.required || f.species !== rule.species || (st.fruitMask >> i & 1) === 0);
      case 'fruitOrder': return st.fruitLog.indexOf(rule.value.join(',') + ',') === 0 || st.fruitLog.replace(/,$/, '').split(',').slice(0, rule.value.length).join(',') === rule.value.join(',');
      case 'switchOrder': { let p = 0; for (const c of st.swLog) { if (+c === rule.value[p]) p++; } return p >= rule.value.length; }
      case 'switchesAll': return rt.switches.every((s, i) => st.swLog.indexOf(String(i)) >= 0);
      default: return true;
    }
  }
  const checkAll = (rt, st, rules) => rules.every((r) => checkRule(rt, st, r));
  // 1 star = cleared, 2 = cleared within par, 3 = par plus the level's perfect condition(s)
  function evaluateStars(rt, st) {
    const sr = rt.level.starRules;
    let stars = 1;
    if (checkRule(rt, st, sr.two)) stars = 2;
    if (stars === 2 && checkAll(rt, st, sr.three)) stars = 3;
    return stars;
  }

  const api = { DIRS: DIRS, DIR_LIST: DIR_LIST, sameDir: sameDir, opposite: opposite, makeRuntime: makeRuntime, newState: newState,
    cloneState: cloneState, stateKey: stateKey, step: step, resolveDir: resolveDir, isBlocked: isBlocked, exitReady: exitReady,
    doorOpen: doorOpen, gateOpen: gateOpen, onIce: onIce, checkRule: checkRule, checkAll: checkAll, evaluateStars: evaluateStars };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SFREngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
