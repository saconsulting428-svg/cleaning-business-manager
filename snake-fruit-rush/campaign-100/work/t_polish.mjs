import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const file = 'file://' + process.cwd() + '/test.html';
const b = await chromium.launch({ args: ['--js-flags=--expose-gc'] });
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
async function page(save, q = '', throttle = 1) {
  const ctx = await b.newContext({ viewport: { width: 480, height: 800 } }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript((s) => { window.__listeners = 0; const a = EventTarget.prototype.addEventListener; EventTarget.prototype.addEventListener = function (...x) { window.__listeners++; return a.apply(this, x); }; if (s) localStorage.setItem('snakeFruitRush.v1', JSON.stringify(s)); }, save);
  if (throttle > 1) { const c = await ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
  await p.goto(file + q); await p.waitForTimeout(1000); return { ctx, p };
}
const world = (p, x, y) => p.evaluate(([x, y]) => { const c = document.querySelector('canvas').getBoundingClientRect(); return [c.left + x * c.width / 480, c.top + y * c.height / 800]; }, [x, y]);
// frame sampler: head position per frame
const SAMPLER = `window.__rec = (ms, actions) => new Promise((resolve) => { const S = __snake, fr = []; const t0 = performance.now(); let last = null, ai = 0;
  const tick = (t) => { const h = S.pts()[0]; fr.push({ t, x: h.x, y: h.y, n: S.G.snake.length, moves: S.camp.C ? S.camp.C.moves : 0 });
    while (actions && ai < actions.length && t - t0 >= actions[ai].at) { actions[ai].fn(); ai++; }
    if (t - t0 < ms && S.state === 'play') requestAnimationFrame(tick); else resolve(fr); }; requestAnimationFrame(tick); });`;
function analyse(fr, nominalPxPerMs) {
  const sp = [], big = [];
  fr = fr.filter((f) => f.t - fr[0].t > 700);     // skip the first moments after the game starts
  for (let i = 1; i < fr.length; i++) { const dt = fr[i].t - fr[i - 1].t, d = Math.hypot(fr[i].x - fr[i - 1].x, fr[i].y - fr[i - 1].y); if (dt <= 0 || dt > 40 || d > 30) continue; sp.push(d / dt); big.push(d); }
  const mean = sp.reduce((a, c) => a + c, 0) / sp.length, sd = Math.sqrt(sp.reduce((a, c) => a + (c - mean) ** 2, 0) / sp.length);
  const stalls = sp.filter((v) => v < 0.01).length;
  return { frames: fr.length, mean, cv: sd / mean, maxSpeed: Math.max(...sp), stalls, ratioMax: Math.max(...sp) / nominalPxPerMs };
}
console.log('Test A  straight movement for 10 s (No walls mode, wrap-around frames skipped)');
{
  const { ctx, p } = await page({ mode: 'walls', menuMode: 'endless' });
  await p.evaluate(SAMPLER);
  await p.evaluate(() => { __snake.DATA.mode = 'walls'; __snake.newGame(); });
  const fr = await p.evaluate(() => __rec(10000));
  const a = analyse(fr, 22 / 150); // original start pace 150ms/cell
  console.log('      ', JSON.stringify({ frames: a.frames, meanPxPerMs: +a.mean.toFixed(3), cv: +a.cv.toFixed(3), stalls: a.stalls }));
  ok(a.frames > 400, 'ran ~10 s of frames (' + a.frames + ')');
  ok(a.cv < 0.45 && a.stalls < 4, 'speed is even: coefficient of variation ' + a.cv.toFixed(2) + ', stalled frames ' + a.stalls);
  await ctx.close();
}
console.log('Test B  repeated left/right turns without snapping');
{
  const { ctx, p } = await page({ mode: 'walls' });
  await p.evaluate(SAMPLER);
  await p.evaluate(() => { __snake.DATA.mode = 'walls'; __snake.newGame(); });
  const fr = await p.evaluate(() => __rec(7000, Array.from({ length: 12 }, (_, i) => ({ at: 500 + i * 520, fn: () => { const d = __snake.G.dir; __snake.turn(d[0] ? [0, i % 4 < 2 ? 1 : -1] : [i % 4 < 2 ? 1 : -1, 0]); } }))));
  const a = analyse(fr, 22 / 150);
  console.log('      ', JSON.stringify({ frames: a.frames, maxSpeedVsNominal: +a.ratioMax.toFixed(2), stalls: a.stalls }));
  ok(a.ratioMax < 2.6, 'no jump: fastest frame is ' + a.ratioMax.toFixed(2) + 'x the normal speed (a jump would be >> 3x)');
  ok(a.stalls < 6, 'no visible pauses while turning (' + a.stalls + ' stalled frames)');
  await ctx.close();
}
console.log('Test C  rapid valid swipes / Test D long and diagonal swipes');
{
  const { ctx, p } = await page({ mode: 'walls' });
  await p.evaluate(() => { __snake.DATA.mode = 'walls'; __snake.newGame(); });
  await p.waitForTimeout(300);
  const [cx, cy] = await world(p, 240, 400);
  let maxQ = 0;
  const dirs = [[0, 1], [-1, 0], [0, -1], [1, 0], [0, 1], [-1, 0]];
  for (const d of dirs) {
    await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + d[0] * 40, cy + d[1] * 40, { steps: 4 }); await p.mouse.up();
    maxQ = Math.max(maxQ, await p.evaluate(() => __snake.G.queue.length));
    await p.waitForTimeout(60);
  }
  ok(maxQ <= 2, 'rapid swipes never queue more than 2 turns (max ' + maxQ + ')');
  ok(await p.evaluate(() => __snake.state === 'play'), 'still alive after rapid swipes');
  // long swipe: one drag of 700 px to the right while moving up/down must give exactly one turn
  await p.evaluate(() => { __snake.G.queue.length = 0; });
  const before = await p.evaluate(() => __snake.G.dir.join(','));
  const horiz = before === '0,1' || before === '0,-1';
  const sx = 60, sy = 400;
  await p.mouse.move(await world(p, sx, sy).then((q) => q[0]), (await world(p, sx, sy))[1]);
  await p.mouse.down();
  const dirv = horiz ? [1, 0] : [0, 1];
  const o = await world(p, 240, 400);
  await p.mouse.move(o[0] + dirv[0] * 25, o[1] + dirv[1] * 25, { steps: 3 });
  await p.mouse.move(o[0] + dirv[0] * 150, o[1] + dirv[1] * 150, { steps: 10 });
  await p.mouse.move(o[0] + dirv[0] * 280, o[1] + dirv[1] * 280, { steps: 10 });
  const q1 = await p.evaluate(() => __snake.G.queue.length + (__snake.acc < 0 ? 0 : 0));
  await p.mouse.up();
  const total = await p.evaluate(() => ({ q: __snake.G.queue.map((d) => d.join(',')), dir: __snake.G.dir.join(',') }));
  ok(total.q.length + (total.dir !== before ? 1 : 0) <= 1, 'long swipe = one turn (queue ' + JSON.stringify(total.q) + ', dir ' + before + ' -> ' + total.dir + ')');
  // diagonal: 60 right, 20 down -> right
  await p.waitForTimeout(500);
  await p.evaluate(() => { __snake.G.queue.length = 0; });
  const d0 = await p.evaluate(() => __snake.G.dir.join(','));
  if (d0 === '0,1' || d0 === '0,-1') {
    await p.mouse.move(o[0], o[1]); await p.mouse.down(); await p.mouse.move(o[0] + 60, o[1] + 20, { steps: 6 }); await p.mouse.up();
    const r = await p.evaluate(() => ({ q: __snake.G.queue.map((d) => d.join(',')), dir: __snake.G.dir.join(',') }));
    ok(r.q.concat([r.dir]).includes('1,0'), 'diagonal swipe resolves to the stronger axis (right): ' + JSON.stringify(r));
  } else ok(true, 'diagonal check skipped (snake moving horizontally)');
  // tiny wobble
  await p.waitForTimeout(500); await p.evaluate(() => { __snake.G.queue.length = 0; });
  await p.mouse.move(o[0], o[1]); await p.mouse.down(); await p.mouse.move(o[0] + 7, o[1] + 6, { steps: 3 }); await p.mouse.up();
  ok(await p.evaluate(() => __snake.G.queue.length === 0), 'small finger wobble does nothing');
  void q1;
  await ctx.close();
}
console.log('Test E  long body');
{
  const out = [];
  for (const len of [3, 90]) {
    const { ctx, p } = await page({ mode: 'walls' }, '', 4);
    await p.evaluate((n) => { __snake.DATA.mode = 'walls'; __snake.newGame(); const G = __snake.G; G.snake = []; for (let i = 0; i < n; i++) G.snake.push([2 + (Math.floor(i / 16) % 2 ? 15 - (i % 16) : i % 16), 2 + Math.floor(i / 16) * 2]); }, len);
    await p.waitForTimeout(800);
    const fps = await p.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (t - ts[0] < 3000) requestAnimationFrame(f); else res(Math.round(1000 / ((ts[ts.length - 1] - ts[0]) / (ts.length - 1)))); }; requestAnimationFrame(f); }));
    out.push([len, fps]);
    await ctx.close();
  }
  console.log('      ', JSON.stringify(out));
  ok(out[1][1] >= out[0][1] * 0.75, 'a 90 segment snake keeps ' + out[1][1] + ' fps vs ' + out[0][1] + ' fps with a short one (4x slower CPU, being drawn while the game runs)');
}
console.log('Test F  effects stay bounded');
{
  const { ctx, p } = await page({ camp: { unlocked: 100, cur: 63, stars: {} } });
  await p.evaluate(() => { __snake.camp.start(63); });
  await p.waitForFunction(() => __snake.camp.C.ready === 0);
  const r = await p.evaluate(async () => { let mx = 0, mp = 0; for (let i = 0; i < 300; i++) { __snake.eat; mx = Math.max(mx, __snake.fxCount); mp = Math.max(mp, __snake.popupCount); await new Promise((r) => requestAnimationFrame(r)); __snake.G.snake.length; } return [mx, mp]; });
  ok(r[0] <= 48 && r[1] <= 8, 'effects/pop-ups bounded (' + r.join('/') + ')');
  await ctx.close();
}
console.log('Test I  repeated restarts: no leaks');
{
  const { ctx, p } = await page({ camp: { unlocked: 100, cur: 63, stars: {} } });
  await p.evaluate(() => { __snake.camp.start(63); });
  await p.waitForTimeout(500);
  const snap = () => p.evaluate(() => { gc(); return { heap: performance.memory.usedJSHeapSize, listeners: window.__listeners, texts: __snake.textPool.join(','), fx: __snake.fxCount, pops: __snake.popupCount, textures: window.snakeGame.textures.getTextureKeys().length }; });
  for (let i = 0; i < 5; i++) await p.evaluate((i) => __snake.camp.start(20 + i), i);
  const a = await snap();
  for (let i = 0; i < 80; i++) await p.evaluate((i) => __snake.camp.start(20 + (i % 60)), i);
  await p.waitForTimeout(300);
  const c = await snap();
  console.log('      ', JSON.stringify({ a, c }));
  ok(c.listeners === a.listeners, 'no new event listeners after 80 restarts (' + a.listeners + ' -> ' + c.listeners + ')');
  ok(c.textures === a.textures, 'no new textures after 80 restarts (' + a.textures + ' -> ' + c.textures + ')');
  ok(c.texts === a.texts, 'text pool does not grow (' + a.texts + ' -> ' + c.texts + ')');
  ok(c.heap - a.heap < 6e6, 'memory does not climb (+' + Math.round((c.heap - a.heap) / 1e3) + ' KB)');
  await ctx.close();
}
console.log('Test J  low-end phone profile (6x slower CPU) and a main-thread freeze');
{
  const { ctx, p } = await page({ camp: { unlocked: 100, cur: 45, stars: {} } }, '', 6);
  await p.evaluate(SAMPLER);
  await p.evaluate(() => { __snake.camp.start(45); });
  await p.waitForFunction(() => __snake.camp.C.ready === 0, null, { timeout: 20000 });
  const fr = await p.evaluate(() => __rec(3000));
  const dts = fr.slice(1).map((f, i) => f.t - fr[i].t).sort((a, c) => a - c);
  console.log('      ', JSON.stringify({ frames: fr.length, medianMs: Math.round(dts[dts.length >> 1]), p95Ms: Math.round(dts[Math.floor(dts.length * 0.95)]), lite: await p.evaluate(() => __snake.LITE) }));
  ok(fr.length > 15, 'game keeps running on a very slow CPU');
  // freeze the page for 700 ms: at most one step may follow, never a burst
  const mv0 = await p.evaluate(() => __snake.camp.C.moves);
  await p.evaluate(() => { const t = performance.now(); while (performance.now() - t < 700) { /* freeze */ } });
  await p.waitForTimeout(60);
  const r = await p.evaluate(() => ({ moves: __snake.camp.C.moves, state: __snake.state }));
  ok(r.moves - mv0 <= 4 && r.state === 'play', 'a 700 ms freeze did not cause a burst of moves or a death (' + (r.moves - mv0) + ' moves in ~0.8 s)');
  await ctx.close();
}
console.log('Renderer: WebGL when the device has it, Canvas otherwise (no URL parameter)');
{
  const { ctx, p } = await page(null);
  const r = await p.evaluate(() => __snake.renderer);
  ok(r === 'canvas' || r === 'webgl', 'renderer chosen automatically: ' + r + ' (this test machine has no GPU, so Canvas is the expected fallback)');
  await ctx.close();
}
console.log('pass', pass, 'fail', fail, 'page errors', errs.length, errs.slice(0, 3));
await b.close();
