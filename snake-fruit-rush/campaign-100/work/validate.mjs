// Validates the 100 shipped levels using the code that is inside the HTML (same decoder + same rules engine as the game).
import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
import fs from 'fs';
const file = 'file://' + process.cwd() + '/' + (process.argv[2] || 'test.html');
const routes = JSON.parse(fs.readFileSync('routes.json'));
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(file); await p.waitForTimeout(800);
const res = await p.evaluate((routes) => {
  const { E, LV, engineLevel } = window.__snake.camp, COLS = 20, ROWS = 26, out = [];
  const D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  routes.forEach((route, n) => {
    const L = LV[n], el = engineLevel(L), rt = E.makeRuntime(el), r = { id: n + 1, errors: [] };
    const err = (m) => r.errors.push(m);
    // ---- structure ----
    const inb = (c) => c[0] >= 0 && c[1] >= 0 && c[0] < COLS && c[1] < ROWS;
    if (!L.F.length) err('no fruit');
    if (!inb(L.E) || !L.F.every(inb)) err('item outside board');
    if (rt.wall[rt.exit]) err('exit on wall');
    if ((L.K || []).length !== (L.D || []).length) err('key/door mismatch');
    (L.S || []).forEach((s) => { if (!L.G || !L.G[s[2]]) err('switch without gate'); });
    (L.G || []).forEach((g, i) => { if (!(L.S || []).some((s) => s[2] === i)) err('gate without switch'); });
    // ---- safe start: snake inside, body clear, survives straight for 5 ticks ----
    const st0 = E.newState(rt);
    if (st0.body.some((c) => rt.wall[c] || rt.bomb[c] || rt.ice[c])) err('start body on obstacle');
    const t = E.newState(rt); let alive = 0;
    for (let i = 0; i < 5; i++) { const q = E.step(rt, t, null); if (q.status === 'fail') break; alive++; }
    if (alive < 5) err('dies within 5 ticks when going straight (' + alive + ')');
    r.straightSafe = alive;
    // ---- route replay ----
    const st = E.newState(rt); let status = 'ok', waits = 0, ticks = 0;
    const jump = new Map(); (L.P || []).forEach((q) => { jump.set(q[1] * COLS + q[0], q[3] * COLS + q[2]); jump.set(q[3] * COLS + q[2], q[1] * COLS + q[0]); });
    for (let i = 1; i < route.length; i++) {
      const cur = route[i], head = st.body[0];
      const dx = (cur % COLS) - (head % COLS), dy = ((cur / COLS) | 0) - ((head / COLS) | 0);
      const d = D4.findIndex((v) => v[0] === dx && v[1] === dy);
      if (d < 0) { err('route gap at ' + i); break; }
      let q, g = 0;
      do { q = E.step(rt, st, D4[d]); ticks++; if (q.status === 'wait') waits++; g++; } while (q.status === 'wait' && g < 5);
      status = q.status;
      if (status === 'fail') { err('route fails: ' + q.reason + ' at ' + i); break; }
      const isEntry = (L.P || []).some((pp) => (pp[1] * COLS + pp[0]) === cur);
      if (isEntry) i++;
    }
    if (status !== 'win') err('route does not win (' + status + ')');
    r.moves = st.moves; r.par = L.par; r.fruits = L.F.length; r.waits = waits;
    if (st.moves !== L.par) err('par mismatch ' + st.moves + ' vs ' + L.par);
    if (E.exitReady(rt, st) !== true) err('fruit not all eaten at exit');
    r.stars3 = st.moves <= L.s3;
    if (!r.stars3) err('par run is not 3 stars');
    // ---- failure paths exist and are reported (wall) ----
    const f = E.newState(rt); let reason = null;
    for (let i = 0; i < 600 && !reason; i++) { const q = E.step(rt, f, null); if (q.status === 'fail') reason = q.reason; if (q.status === 'win') reason = 'win'; if (q.status === 'wait') { reason = 'wait'; } }
    r.idleEnd = reason;
    // ---- necessity of devices (static flood fill ignoring the snake) ----
    const flood = (doorsOpen, gatesOpen, portals, extraBlock) => {
      const blocked = new Uint8Array(COLS * ROWS);
      for (let i = 0; i < COLS * ROWS; i++) if (rt.wall[i] || rt.bomb[i]) blocked[i] = 1;
      rt.doors.forEach((d) => { if (!doorsOpen) blocked[d.cell] = 1; });
      rt.gates.forEach((g) => g.cells.forEach((c) => { if (!gatesOpen) blocked[c] = 1; }));
      (extraBlock || []).forEach((c) => { blocked[c] = 1; });
      const start = st0.body[0], seen = new Uint8Array(COLS * ROWS), q = [start]; seen[start] = 1;
      while (q.length) {
        const c = q.pop(), x = c % COLS, y = (c / COLS) | 0, nb = [];
        D4.forEach((d) => { const nx = x + d[0], ny = y + d[1]; if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) nb.push(ny * COLS + nx); });
        if (portals && rt.portalTo[c] >= 0) nb.push(rt.portalTo[c]);
        nb.forEach((m) => { if (!seen[m] && !blocked[m]) { seen[m] = 1; q.push(m); } });
      }
      return seen;
    };
    const all = flood(true, true, true);
    if (!all[rt.exit]) err('exit unreachable even with everything open');
    rt.fruits.forEach((fr, i) => { if (!all[fr.cell]) err('fruit ' + i + ' unreachable'); });
    if (rt.doors.length && flood(false, true, true)[rt.exit]) err('door is not needed');
    if (rt.gates.length && flood(true, false, true)[rt.exit]) err('gate is not needed');
    if (rt.portalTo.some((v) => v >= 0) && flood(true, true, false)[rt.exit]) err('portal is not needed');
    // keys / switches reachable before their doors/gates
    rt.keys.forEach((k, i) => { const dc = rt.doors.filter((d) => d.key === i).map((d) => d.cell); if (!flood(true, true, true, dc)[k.cell]) err('key ' + i + ' not reachable before its door'); });
    rt.switches.forEach((s, i) => { const gc = s.gateIdx >= 0 ? rt.gates[s.gateIdx].cells : []; if (!flood(true, true, true, gc)[s.cell]) err('switch ' + i + ' not reachable before its gate'); });
    // ---- fairness: nothing deadly next to the first 10 route cells ----
    for (let i = 0; i < Math.min(10, route.length); i++) {
      const x = route[i] % COLS, y = (route[i] / COLS) | 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        if (rt.bomb[ny * COLS + nx] || (rt.wall[ny * COLS + nx] && i < 8 && !(dx === 0 && dy === 0))) { err('hazard ' + (rt.bomb[ny * COLS + nx] ? 'bomb' : 'wall') + ' at ' + nx + ',' + ny + ' near route idx ' + i + ' (' + x + ',' + y + ')'); }
      }
    }
    // straight segment lengths (decisions need time)
    let prev = 0, minSeg = 99, corners = 0;
    for (let i = 1; i < route.length - 1; i++) {
      const a = route[i] - route[i - 1], c = route[i + 1] - route[i];
      if (Math.abs(a) !== 1 && Math.abs(a) !== COLS || Math.abs(c) !== 1 && Math.abs(c) !== COLS) continue;
      if (a !== c) { minSeg = Math.min(minSeg, i - prev); prev = i; corners++; }
    }
    r.minSeg = minSeg; r.corners = corners;
    r.delay = L.d; r.secs = Math.round(L.par * L.d / 100) / 10; r.reactionMs = L.d * minSeg;
    r.mech = [rt.ice.some((v) => v) ? 'ice' : '', rt.bomb.some((v) => v) ? 'bombs' : '', rt.keys.length ? 'key/door' : '', rt.switches.length ? 'switch/gate' : '', rt.portalTo.some((v) => v >= 0) ? 'portal' : ''].filter(Boolean).join('+') || 'walls';
    r.walls = rt.wall.reduce((a, v) => a + v, 0); r.bombs = rt.bomb.reduce((a, v) => a + v, 0); r.ice = rt.ice.reduce((a, v) => a + v, 0);
    // ---- random fruit places: the solution route must still win with every random layout ----
    for (let k = 0; k < 25; k++) {
      const L2 = window.__snake.camp.randomFruit(L), rt2 = E.makeRuntime(engineLevel(L2)), s2 = E.newState(rt2);
      let ok2 = true, status2 = 'ok';
      for (let i = 1; i < route.length; i++) {
        const cur = route[i], head = s2.body[0];
        const d = D4.findIndex((v) => v[0] === (cur % COLS) - (head % COLS) && v[1] === ((cur / COLS) | 0) - ((head / COLS) | 0));
        if (d < 0) { ok2 = false; break; }
        let q, g = 0;
        do { q = E.step(rt2, s2, D4[d]); g++; } while (q.status === 'wait' && g < 5);
        status2 = q.status;
        if (status2 === 'fail') { ok2 = false; break; }
        if ((L.P || []).some((pp) => (pp[1] * COLS + pp[0]) === cur)) i++;
      }
      if (!ok2 || status2 !== 'win') { err('random fruit layout ' + k + ' not winnable'); break; }
      if (L2.F.some((f) => rt2.wall[f[1] * COLS + f[0]] || rt2.bomb[f[1] * COLS + f[0]])) { err('fruit placed on an obstacle'); break; }
    }
    out.push(r);
  });
  return out;
}, routes);
await b.close();
const bad = res.filter((r) => r.errors.length);
console.log('levels checked', res.length, 'with errors', bad.length);
bad.slice(0, 10).forEach((r) => console.log(r.id, r.errors.join('; ')));
const mins = (k) => Math.min(...res.map((r) => r[k])), maxs = (k) => Math.max(...res.map((r) => r[k]));
console.log('min segment', mins('minSeg'), 'min reaction ms', mins('reactionMs'), 'max secs', maxs('secs'), 'min straightSafe', mins('straightSafe'));
fs.writeFileSync('validation.json', JSON.stringify(res));
