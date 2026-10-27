import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const file = 'file://' + process.cwd() + '/' + (process.argv[2] || 'test.html');
const b = await chromium.launch();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const errs = [];
async function fresh(ctxOpts, init) {
  const ctx = await b.newContext({ viewport: { width: 480, height: 800 }, ...ctxOpts });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  if (init) await p.addInitScript(init);
  await p.goto(file);
  await p.waitForTimeout(900);
  return { ctx, p };
}
const S = (p, f) => p.evaluate(f);
const world = (p, x, y) => p.evaluate(([x, y]) => { const c = document.querySelector('canvas').getBoundingClientRect(); return [c.left + x * c.width / 480, c.top + y * c.height / 800]; }, [x, y]);
const click = async (p, x, y) => { const [cx, cy] = await world(p, x, y); await p.mouse.click(cx, cy); };

// ---- a. fresh start, locked levels ----
{
  const { ctx, p } = await fresh();
  ok(await S(p, () => __snake.DATA.camp.unlocked === 1 && __snake.DATA.camp.cur === 1), 'fresh unlocked=1');
  await click(p, 240, 568);                                   // Play
  await p.waitForTimeout(300);
  ok(await S(p, () => __snake.state === 'play' && __snake.camp.C.id === 1), 'Play starts level 1');
  ok(await S(p, () => __snake.G.snake.length === 3 && __snake.G.camp.ready > 0), 'READY beat and snake length 3');
  const pos0 = await S(p, () => __snake.G.snake[0].join(','));
  await p.waitForTimeout(600);
  ok(await S(p, () => __snake.G.snake[0].join(',')) === pos0, 'snake waits during READY');
  // ---- L1 completes with no input at all (straight line) ----
  await p.waitForFunction(() => __snake.state === 'won', null, { timeout: 15000 });
  ok(await S(p, () => __snake.camp.C.stars === 3 && __snake.DATA.camp.unlocked === 2 && __snake.DATA.camp.stars[1] === 3), 'L1 win: 3 stars, L2 unlocked');
  await p.screenshot({ path: 'shots/won.png' });
  const saved = await S(p, () => JSON.parse(localStorage.getItem('snakeFruitRush.v1')).camp);
  ok(saved.unlocked === 2 && saved.stars['1'] === 3 && saved.cur === 2, 'progress saved to localStorage');
  // reload keeps progress
  await p.reload(); await p.waitForTimeout(900);
  ok(await S(p, () => __snake.DATA.camp.unlocked === 2 && __snake.DATA.camp.cur === 2 && __snake.DATA.camp.stars[1] === 3), 'progress survives reload');
  // level select: L2 open, L3 locked
  await click(p, 240, 672 - 0);                               // Levels pill (left)
  await p.waitForTimeout(300);
  let st = await S(p, () => __snake.state);
  if (st !== 'levels') { await click(p, 128, 672); await p.waitForTimeout(300); st = await S(p, () => __snake.state); }
  ok(st === 'levels', 'level select opens');
  await p.screenshot({ path: 'shots/levels_progress.png' });
  // tile positions: x0=(480-(5*76+4*13))/2=24 ; y0=262
  await click(p, 24 + 2 * 89 + 38, 262 + 38);                 // level 3 (locked)
  await p.waitForTimeout(200);
  ok(await S(p, () => __snake.state === 'levels'), 'locked level 3 does not start');
  await click(p, 24 + 1 * 89 + 38, 262 + 38);                 // level 2
  await p.waitForTimeout(300);
  ok(await S(p, () => __snake.state === 'play' && __snake.camp.C.id === 2), 'unlocked level 2 starts from the grid');
  await ctx.close();
}
// ---- b. fail + retry + pause + controls on L2 ----
{
  const { ctx, p } = await fresh({}, () => { localStorage.setItem('snakeFruitRush.v1', JSON.stringify({ camp: { unlocked: 5, cur: 2, stars: { 1: 3 } } })); });
  await S(p, () => { window.__speedMul = 0.5; __snake.camp.start(2); });
  await p.waitForFunction(() => __snake.state === 'over', null, { timeout: 15000 });
  ok(await S(p, () => __snake.camp.C.over === 'wall'), 'L2: driving straight hits the wall (fail reason wall)');
  await p.screenshot({ path: 'shots/fail.png' });
  await click(p, 240, 400 - 150 + 176);                        // "Try again" (overlay h=300 -> top=250, button at top+176)
  await p.waitForTimeout(300);
  ok(await S(p, () => __snake.state === 'play' && __snake.camp.C.id === 2 && __snake.camp.C.moves === 0), 'Try again restarts the level');
  // keyboard: wait for READY, steer up with ArrowUp
  await p.waitForFunction(() => __snake.camp.C.ready === 0);
  await p.keyboard.press('ArrowUp');
  await p.waitForTimeout(300);
  ok(await S(p, () => __snake.G.dir[1] === -1), 'keyboard ArrowUp turns the snake');
  // pause
  await p.keyboard.press('Space');
  await p.waitForTimeout(150);
  ok(await S(p, () => __snake.state === 'paused'), 'Space pauses');
  const mv = await S(p, () => __snake.camp.C.moves);
  await p.waitForTimeout(500);
  ok(await S(p, () => __snake.camp.C.moves) === mv, 'no movement while paused');
  await p.screenshot({ path: 'shots/pause.png' });
  await p.keyboard.press('Space');
  await p.waitForTimeout(500);
  ok(await p.evaluate((m) => __snake.state === 'play' && __snake.camp.C.moves > m, mv), 'resume continues');
  await ctx.close();
}
// ---- c. swipe + tap controls ----
{
  const { ctx, p } = await fresh({}, () => { localStorage.setItem('snakeFruitRush.v1', JSON.stringify({ camp: { unlocked: 9, cur: 4, stars: {} } })); });
  await S(p, () => { __snake.camp.start(4); });
  await p.waitForFunction(() => __snake.camp.C.ready === 0, null, { timeout: 5000 });
  const [sx, sy] = await world(p, 240, 400);
  await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(sx, sy + 40, { steps: 5 }); await p.mouse.up();
  await p.waitForTimeout(350);
  ok(await S(p, () => __snake.G.dir[1] === 1), 'swipe down turns the snake down');
  const [tx, ty] = await world(p, 400, 130);   // tap far up-right -> turn horizontally/upward
  await p.mouse.click(tx, ty);
  await p.waitForTimeout(350);
  ok(await S(p, () => __snake.G.dir[1] !== 1 || __snake.state === 'over'), 'tap turns toward the tapped point');
  await ctx.close();
}
// ---- d. legacy / corrupt saves ----
{
  const old = { high: 120, highs: { classic: 120 }, theme: 2, bg: 1, coins: 77, skin: 'default', skins: ['default'], sound: false };
  let c = await fresh({}, (o) => { localStorage.setItem('snakeFruitRush.v1', JSON.stringify(o)); }); // placeholder
  await c.ctx.close();
  const { ctx, p } = await fresh({}, `localStorage.setItem('snakeFruitRush.v1', ${JSON.stringify(JSON.stringify(old))});`);
  ok(await S(p, () => __snake.DATA.camp.unlocked === 1 && __snake.DATA.coins === 77 && __snake.DATA.theme === 2 && __snake.DATA.highs.classic === 120), 'old save loads, keeps coins/theme/high, adds campaign');
  await ctx.close();
  const bad = { camp: { unlocked: 'x', cur: 999, stars: { 5: 9, abc: 2, 7: 2, 101: 3 } }, coins: 5 };
  const r = await fresh({}, `localStorage.setItem('snakeFruitRush.v1', ${JSON.stringify(JSON.stringify(bad))});`);
  const cp = await S(r.p, () => JSON.parse(JSON.stringify(__snake.DATA.camp)));
  ok(cp.stars[5] === 3 && cp.stars[7] === 2 && !cp.stars.abc && !cp.stars[101] && cp.unlocked >= 8 && cp.cur >= 1 && cp.cur <= cp.unlocked, 'corrupt campaign save is sanitized: ' + JSON.stringify(cp));
  await r.ctx.close();
  const junk = await fresh({}, `localStorage.setItem('snakeFruitRush.v1', '{{not json');`);
  ok(await S(junk.p, () => __snake.DATA.camp.unlocked === 1), 'broken JSON falls back to defaults');
  await junk.ctx.close();
}
// ---- e. endless mode still works ----
{
  const { ctx, p } = await fresh();
  await click(p, 352, 672);                    // Endless pill (right, no save)
  await p.waitForTimeout(300);
  ok(await S(p, () => __snake.state === 'play' && !__snake.G.camp && __snake.G.food), 'Endless pill starts the classic game');
  await p.waitForTimeout(1500);
  ok(await S(p, () => __snake.G.snake.length >= 3), 'endless snake moves');
  await p.screenshot({ path: 'shots/endless.png' });
  await ctx.close();
}
// ---- f. level 100 unlock edge ----
{
  const { ctx, p } = await fresh({}, () => { localStorage.setItem('snakeFruitRush.v1', JSON.stringify({ camp: { unlocked: 100, cur: 100, stars: { 99: 3 } } })); });
  await S(p, () => { window.__speedMul = 0.3; __snake.camp.start(100); });
  ok(await S(p, () => __snake.camp.C.id === 100), 'level 100 can be started when unlocked');
  await ctx.close();
}
console.log('pass', pass, 'fail', fail, 'pageerrors', errs.length, errs.slice(0, 3));
await b.close();
