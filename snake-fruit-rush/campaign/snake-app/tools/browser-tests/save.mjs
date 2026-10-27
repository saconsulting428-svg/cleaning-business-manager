import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const PAGE_URL = new URL('../../www/index.html', import.meta.url).href;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
async function open(init) {
  const ctx = await browser.newContext({ viewport: { width: 450, height: 800 }, hasTouch: true });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.errors = []; page.on('pageerror', (e) => page.errors.push(e.message));
  await page.goto(PAGE_URL);
  await page.waitForFunction(() => window.__sfr && window.__sfr.art && window.__sfr.art.ready);
  return { ctx, page };
}
const tap = async (page, id) => { const p = await page.evaluate((id) => { const b = __sfr.ui.buttons.find((x) => x.id === id); return b && [b.x + b.w / 2, b.y + b.h / 2]; }, id); if (!p) throw new Error('no button ' + id); const bb = await page.locator('canvas').boundingBox(); await page.touchscreen.tap(bb.x + p[0] * bb.width / 450, bb.y + p[1] * bb.height / (await page.evaluate(() => __sfr.H))); };

// 1. migration from the survival game save
{
  const old = { high: 900, highs: { classic: 900 }, coins: 777, skin: 'lava', skins: ['default', 'lava', 'zzz', 'panda'], sound: false, daily: { x: 1 } };
  const { ctx, page } = await open(`if(!localStorage.getItem('snakeFruitRush.v2')) localStorage.setItem('snakeFruitRush.v1', ${JSON.stringify(JSON.stringify(old))});`);
  const d = await page.evaluate(() => __sfr.save.data);
  ok(d.coins === 777 && d.skin === 'lava' && d.skins.join() === 'default,lava,panda' && d.sfx === false && d.music === false, 'v1 save migrated (coins, skins, sound): ' + JSON.stringify([d.coins, d.skin, d.skins, d.sfx]));
  ok(d.unlocked === 1 && d.completed.every((x) => x === 0), 'campaign starts fresh (old survival scores are not stars)');
  await ctx.close();
}
// 2. corrupt v2 data
{
  const bad = { version: 2, coins: 'abc', skin: 'gold', skins: ['gold', 5, 'default'], completed: [1, 1, 'x', 1], stars: [3, 9, -2], unlocked: 77, current: 999, world: 12, seen: { key: 1, '<script>': 1 }, attempt: { level: 3, body: [1, 2], dir: [1, 0] } };
  const { ctx, page } = await open(`localStorage.setItem('snakeFruitRush.v2', ${JSON.stringify(JSON.stringify(bad))});`);
  const d = await page.evaluate(() => __sfr.save.data);
  ok(d.coins === 0, 'bad coins -> 0');
  ok(d.skins.includes('gold') && d.skin === 'gold', 'owned list is trusted only for known ids (gold is a real skin id)');
  ok(d.stars[1] === 3 && d.stars[2] === 0, 'stars clamped 0..3');
  ok(d.unlocked === 5 && d.current <= d.unlocked && d.world === 4, 'unlocked is rebuilt from completed levels (' + d.unlocked + ') and clamped');
  ok(d.attempt === null, 'invalid attempt snapshot dropped');
  ok(!('<script>' in d.seen) && d.seen.key === 1, 'tutorial flags sanitised');
  await ctx.close();
  const r = await open(`localStorage.setItem('snakeFruitRush.v2', '{broken');`);
  ok(await r.page.evaluate(() => __sfr.save.data.unlocked === 1), 'broken JSON -> defaults');
  await r.ctx.close();
}
// 3. rewards paid once, best stars never go down, unlock rule
{
  const { ctx, page } = await open();
  const r = await page.evaluate(() => {
    const S = __sfr, sv = S.save, rw = { first: 10, replay: 1, perfect: 5 };
    const a = sv.complete(1, 2, rw), c1 = sv.data.coins;
    const b = sv.complete(1, 3, rw), c2 = sv.data.coins;
    const c = sv.complete(1, 3, rw), c3 = sv.data.coins;
    const d = sv.complete(1, 1, rw);
    return { a, b, c1, c2, c3, stars: sv.data.stars[0], unlocked: sv.data.unlocked, coinsEnd: sv.data.coins, dStars: sv.data.stars[0] };
  });
  ok(r.a.coins === 10 && r.c1 === 10, 'first clear pays once (10)');
  ok(r.c2 - r.c1 === 1 + 5, 'replay + first 3-star bonus paid (+6)');
  ok(r.c3 - r.c2 === 1, 'second 3-star replay pays only the replay coin');
  ok(r.stars === 3 && r.dStars === 3, 'best stars never decrease');
  ok(r.unlocked === 2, 'finishing level 1 unlocks level 2');
  await ctx.close();
}
// 4. persistence across a real reload + resume of an unfinished attempt
{
  const { ctx, page } = await open();
  await page.evaluate(() => { const S = __sfr; S.save.complete(1, 3, { first: 5, replay: 1, perfect: 5 }); S.save.complete(2, 2, { first: 5, replay: 1, perfect: 5 }); S.screens.name = 'play'; S.screens.ov = null; S.play.start(3); });
  await page.waitForFunction(() => __sfr.play.mode === 'run'); await page.waitForTimeout(500);
  await page.evaluate(() => __sfr.screens.pause());
  const snap = await page.evaluate(() => JSON.stringify(__sfr.save.data.attempt));
  await page.reload();
  await page.waitForFunction(() => window.__sfr && window.__sfr.art && window.__sfr.art.ready);
  const d = await page.evaluate(() => __sfr.save.data);
  ok(d.completed[0] === 1 && d.stars[0] === 3 && d.stars[1] === 2 && d.unlocked === 3 && d.coins === 15, 'progress, stars and coins survive a reload (' + d.coins + ' coins)');
  ok(JSON.stringify(d.attempt) === snap, 'unfinished attempt survives a reload');
  await page.waitForTimeout(500);
  await tap(page, 'play');
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => ({ name: __sfr.screens.name, ov: __sfr.screens.ov, mode: __sfr.play.mode, level: __sfr.play.lv.id, body: __sfr.play.st.body.join() }));
  ok(st.name === 'play' && st.ov === 'pause' && st.mode === 'paused' && st.level === 3, 'CONTINUE resumes the same level, paused: ' + JSON.stringify(st));
  ok(st.body === JSON.parse(snap).body.join(), 'resumed snake is exactly where it was');
  await tap(page, 'resume'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => __sfr.play.mode === 'run'), 'resume runs');
  await ctx.close();
}
// 5. skins: locked skin cannot be selected / unlocked without coins; leaving with a locked pick errors
{
  const { ctx, page } = await open();
  await page.evaluate(() => { __sfr.save.data.coins = 130; __sfr.screens.go('skins', { from: 'menu' }); });
  await page.waitForTimeout(700);
  ok(!(await page.evaluate(() => __sfr.screens.selectSkin('gold'))), 'locked skin cannot be equipped');
  ok(!(await page.evaluate(() => __sfr.screens.buySkin('gold'))), 'cannot buy without coins');
  await tap(page, 'skunicorn'); await page.waitForTimeout(150);
  await tap(page, 'back'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => __sfr.screens.name === 'skins' && __sfr.ui.toast && /locked/i.test(__sfr.ui.toast.s)), 'Back with a locked skin picked shows an error and stays: ' + await page.evaluate(() => __sfr.ui.toast && __sfr.ui.toast.s));
  await tap(page, 'back'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => __sfr.screens.name === 'menu'), 'second Back leaves (preview is back on the equipped skin)');
  ok(await page.evaluate(() => __sfr.screens.buySkin('lava') && __sfr.save.data.coins === 10 && __sfr.save.data.skin === 'lava'), 'buying Lava costs 120 and equips it');
  await ctx.close();
}
for (const f of []) {}
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
await browser.close();
