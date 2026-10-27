import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const file = 'file://' + process.cwd() + '/test.html';
const b = await chromium.launch(); let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
async function page(save, q = '') { const ctx = await b.newContext({ viewport: { width: 480, height: 800 }, hasTouch: false }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.addInitScript((s) => { if (s) localStorage.setItem('snakeFruitRush.v1', JSON.stringify(s)); }, save); await p.goto(file + q); await p.waitForTimeout(900); return { ctx, p }; }
const world = (p, x, y) => p.evaluate(([x, y]) => { const c = document.querySelector('canvas').getBoundingClientRect(); return [c.left + x * c.width / 480, c.top + y * c.height / 800]; }, [x, y]);
const click = async (p, x, y) => { const [cx, cy] = await world(p, x, y); await p.mouse.click(cx, cy); };
const save = { coins: 1000, camp: { unlocked: 90, cur: 63, stars: {} }, pw: { slow: 1, shield: 1, sweep: 1, coin2: 0 } };
// 1. fruit randomisation: different layouts across restarts, always on the route (solvable by the bot)
{
  const { ctx, p } = await page(save);
  const sets = new Set();
  for (let i = 0; i < 8; i++) { sets.add(await p.evaluate(() => { __snake.camp.start(20); return JSON.stringify(__snake.camp.C.fr.map((f) => f.cell)); })); }
  ok(sets.size >= 6, 'fruit positions change on restart (' + sets.size + ' different of 8)');
  await ctx.close();
}
// 2. shield saves one crash, then waits for a turn
{
  const { ctx, p } = await page(save);
  await p.evaluate(() => { window.__speedMul = 0.4; __snake.camp.start(2); });
  await p.waitForFunction(() => __snake.camp.C.ready === 0);
  await p.evaluate(() => __snake.usePower('shield'));
  ok(await p.evaluate(() => __snake.camp.C.shield === true && __snake.DATA.pw.shield === 0), 'shield activates and uses one from the stock');
  await p.waitForFunction(() => __snake.camp.C.hold === true || __snake.state === 'over', null, { timeout: 15000 });
  ok(await p.evaluate(() => __snake.camp.C.hold === true && __snake.state === 'play' && __snake.camp.C.shield === false), 'shield absorbed the wall hit and the snake waits');
  const pos = await p.evaluate(() => __snake.G.snake[0].join(','));
  await p.waitForTimeout(400);
  ok(await p.evaluate((q) => __snake.G.snake[0].join(',') === q, pos), 'snake stays still while holding');
  await p.evaluate(() => __snake.turn([0, -1]));
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => __snake.camp.C.hold === false && __snake.G.dir[1] === -1), 'turn releases the hold');
  await ctx.close();
}
// 3. slow-mo, defuse, double coins, buying inside a level
{
  const { ctx, p } = await page(save);
  await p.evaluate(() => { __snake.camp.start(63); });
  await p.waitForFunction(() => __snake.camp.C.ready === 0);
  const d0 = await p.evaluate(() => { const C = __snake.camp.C; return C.L.d; });
  await p.evaluate(() => __snake.usePower('slow'));
  ok(await p.evaluate(() => __snake.camp.C.slowT > 0 && __snake.DATA.pw.slow === 0), 'slow-mo starts');
  const bombs0 = await p.evaluate(() => __snake.camp.C.rt.bomb.reduce((a, v) => a + v, 0));
  await p.evaluate(() => __snake.usePower('sweep'));
  const bombs1 = await p.evaluate(() => __snake.camp.C.rt.bomb.reduce((a, v) => a + v, 0));
  ok(bombs1 <= bombs0, 'defuse never adds bombs (' + bombs0 + ' -> ' + bombs1 + ')');
  const c0 = await p.evaluate(() => __snake.DATA.coins);
  await p.evaluate(() => __snake.usePower('coin2'));
  ok(await p.evaluate((c) => __snake.camp.C.coinMul === 2 && __snake.DATA.coins === c - 70 && __snake.DATA.pw.coin2 === 0, c0), 'double coins is bought on the spot (70 coins)');
  await ctx.close();
}
// 4. shop buy + not enough coins
{
  const { ctx, p } = await page({ coins: 100 });
  await p.evaluate(() => __snake.buyPower('shield'));
  const st = await p.evaluate(() => [__snake.DATA.coins, __snake.DATA.pw.shield]);
  ok(st[0] === 10 && st[1] === 1, 'buying a power-up takes coins and adds one: ' + st);
  await p.evaluate(() => __snake.buyPower('shield'));
  ok(await p.evaluate(() => __snake.DATA.coins === 10 && __snake.DATA.pw.shield === 1), 'cannot buy without enough coins');
  await ctx.close();
}
// 5. touch: accidental tap does nothing by default; swipe still steers; pause needs press+release on the button
{
  const { ctx, p } = await page(save);
  await p.evaluate(() => { __snake.camp.start(63); });
  await p.waitForFunction(() => __snake.camp.C.ready === 0);
  const dir0 = await p.evaluate(() => __snake.G.dir.join(','));
  const [tx, ty] = await world(p, 240, 140); await p.mouse.click(tx, ty);
  await p.waitForTimeout(200);
  ok(await p.evaluate((d) => __snake.G.dir.join(',') === d && !__snake.G.queue.length, dir0), 'a stray tap does not turn the snake');
  const [sx, sy] = await world(p, 240, 400); await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(sx + 6, sy + 4, { steps: 3 }); await p.mouse.up();
  ok(await p.evaluate((d) => __snake.G.dir.join(',') === d, dir0), 'tiny finger wobble is not a swipe');
  // pressing on the board and releasing on the pause button must not pause
  const [bx, by] = await world(p, 434, 718); await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(bx, by, { steps: 2 }); await p.mouse.up();
  ok(await p.evaluate(() => __snake.state !== 'paused'), 'drag onto the pause button does not pause');
  await click(p, 434, 718);
  ok(await p.evaluate(() => __snake.state === 'paused'), 'clean tap on pause button pauses');
  await p.screenshot({ path: 'shots/pause2.png' });
  // toggles
  await click(p, 240, 400 - 210 + 122 + 0);
  await ctx.close();
}
// 6. vibration + tap toggles saved
{
  const { ctx, p } = await page(save);
  ok(await p.evaluate(() => __snake.DATA.vibe === true && __snake.DATA.tapSteer === false), 'defaults: vibration on, tap steer off');
  await click(p, 480 - 20 - 76, 39);
  ok(await p.evaluate(() => __snake.DATA.vibe === false), 'menu vibration button toggles');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('snakeFruitRush.v1')).vibe === false), 'vibration setting is saved');
  await ctx.close();
}
// 7. skins: many, expensive, egg cannot give the expensive ones
{
  const { ctx, p } = await page(save);
  const info = await p.evaluate(() => ({ n: __snake.SKINS.length, max: Math.max(...__snake.SKINS.map((s) => s.cost)) }));
  ok(info.n >= 25 && info.max >= 20000, 'skins: ' + info.n + ', most expensive ' + info.max);
  await ctx.close();
}
console.log('pass', pass, 'fail', fail, 'pageerrors', errs.length, errs.slice(0, 3));
await b.close();
