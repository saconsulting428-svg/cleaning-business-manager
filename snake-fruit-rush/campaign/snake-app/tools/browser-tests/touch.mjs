import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const SH = '/tmp/claude-0/-home-user-cleaning-business-manager/bf3a6e12-153d-500c-9dc9-390f424ff5b1/scratchpad/shots/';
const PAGE_URL = new URL('../../www/index.html', import.meta.url).href;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
async function fresh(vp) {
  const ctx = await browser.newContext({ viewport: vp || { width: 450, height: 800 }, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push('PAGEERR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push('CONSOLE ' + m.text()); });
  await page.goto(PAGE_URL);
  await page.waitForFunction(() => window.__sfr && window.__sfr.art && window.__sfr.art.ready, null, { timeout: 8000 });
  return { ctx, page };
}
const { ctx, page } = await fresh();
const box = async () => page.locator('canvas').boundingBox();
const tapW = async (x, y) => { const b = await box(); await page.touchscreen.tap(b.x + x * b.width / 450, b.y + y * b.height / (await page.evaluate(() => __sfr.H))); };
const H = await page.evaluate(() => __sfr.H);
console.log('logical H', H);
// --- menu -> PLAY (real tap) -> intro -> tutorial -> game
await page.waitForTimeout(600);
const playBtn = await page.evaluate(() => { const b = __sfr.ui.buttons.find((x) => x.id === 'play'); return [b.x + b.w / 2, b.y + b.h / 2]; });
await tapW(playBtn[0], playBtn[1]); await page.waitForTimeout(700);
ok(await page.evaluate(() => __sfr.screens.name === 'intro' && __sfr.screens.params.level === 1), 'PLAY opens level 1 intro');
const pl = await page.evaluate(() => { const b = __sfr.ui.buttons.find((x) => x.id === 'playlevel'); return [b.x + b.w / 2, b.y + b.h / 2]; });
await tapW(pl[0], pl[1]); await page.waitForTimeout(400);
ok(await page.evaluate(() => __sfr.screens.ov === 'tutorial'), 'first level shows the basics tutorial');
const got = await page.evaluate(() => { const b = __sfr.ui.buttons.find((x) => x.id === 'gotit'); return [b.x + b.w / 2, b.y + b.h / 2]; });
await page.waitForTimeout(400);
await tapW(got[0], got[1]); await page.waitForFunction(() => __sfr.play.mode === 'run', null, { timeout: 5000 });
ok(await page.evaluate(() => __sfr.screens.name === 'play' && __sfr.play.mode === 'run'), 'GOT IT starts level 1 and the snake is moving');
const x0 = await page.evaluate(() => __sfr.play.st.body[0]);
await page.waitForTimeout(600);
const x1 = await page.evaluate(() => __sfr.play.st.body[0]);
ok(x1 !== x0, 'snake moves by itself without any input (' + x0 + ' -> ' + x1 + ')');
// level 1 is a straight line (fruit then exit): the snake just keeps going and wins - no input needed
await page.waitForTimeout(1500);
ok(await page.evaluate(() => __sfr.screens.ov === 'complete' && __sfr.play.result.stars >= 1), 'level 1 completes by driving straight (stars ' + await page.evaluate(() => __sfr.play.result && __sfr.play.result.stars) + ')');
// --- real swipe on a level that needs turns
await page.evaluate(() => { const S = __sfr; S.screens.ov = null; S.screens.beginPlay(12); });
await page.waitForFunction(() => __sfr.play.mode === 'run', null, { timeout: 5000 });
await page.waitForTimeout(300);
const dir0 = await page.evaluate(() => __sfr.play.st.dir.join());
const b = await box();
const horiz = dir0 === '1,0' || dir0 === '-1,0';
await page.mouse.move(b.x + 200, b.y + 300); await page.mouse.down();
await page.mouse.move(b.x + 200 + (horiz ? 0 : 40), b.y + 300 + (horiz ? 40 : 0), { steps: 4 }); await page.mouse.up();
await page.waitForTimeout(400);
const dir1 = await page.evaluate(() => __sfr.play.st.dir.join());
ok(dir1 === (horiz ? '0,1' : '1,0'), 'swipe turns the snake: ' + dir0 + ' -> ' + dir1);
// the snake keeps going straight after the turn (no auto steering) until it hits something
await page.waitForFunction(() => __sfr.play.mode === 'dying' || __sfr.play.mode === 'done', null, { timeout: 15000 }).catch(() => {});
ok(await page.evaluate(() => __sfr.play.mode === 'dying' || __sfr.play.mode === 'done'), 'no auto-steering: the snake kept going straight and crashed');
ok(await page.evaluate(() => !!__sfr.play.failInfo), 'failure recorded: ' + await page.evaluate(() => JSON.stringify(__sfr.play.failInfo)));
await page.waitForTimeout(900);
ok(await page.evaluate(() => __sfr.screens.ov === 'failed'), 'Level Failed overlay shown');
const retry = await page.evaluate(() => { const b = __sfr.ui.buttons.find((x) => x.id === 'retry'); return [b.x + b.w / 2, b.y + b.h / 2]; });
await tapW(retry[0], retry[1]); await page.waitForTimeout(700);
ok(await page.evaluate(() => (__sfr.play.mode === 'ready' || __sfr.play.mode === 'run') && __sfr.play.st.moves < 4), 'TRY AGAIN restarts the level');
// --- tap-to-turn: a tap to the right of a downward-moving head turns the snake right
await page.evaluate(() => { __sfr.screens.ov = null; __sfr.play.start(12); });
await page.waitForFunction(() => __sfr.play.mode === 'run');
const hp = await page.evaluate(() => { const P = __sfr.play, h = P.cellXY(P.st.body[0]); return [h.x, h.y, P.st.dir.join()]; });
await tapW(hp[0] + 150, hp[1] - 10); await page.waitForTimeout(350);
ok(hp[2] === '0,1' && await page.evaluate(() => __sfr.play.st.dir.join() === '1,0'), 'tap to the right of the head turns the snake right');
// --- reverse is rejected
const rev = await page.evaluate(() => { const P = __sfr.play; P.st.dir = [1, 0]; P.queue = []; return P.turn([-1, 0]); });
ok(rev === false, 'reverse turn rejected');
// --- queued turn: two quick swipes queue (buffer) and both execute in order
await page.evaluate(() => { const P = __sfr.play; P.start(5); });
await page.waitForTimeout(100);
const q = await page.evaluate(() => { const P = __sfr.play; const a = P.turn([0, 1]); const b = P.turn([1, 0]); return [a, b, P.queue.length]; });
ok(q[0] && q[1] && q[2] >= 1, 'input buffer accepts two queued turns ' + JSON.stringify(q));
// --- pause by button (real tap) stops movement
await page.evaluate(() => { __sfr.play.start(3); });
await page.waitForFunction(() => __sfr.play.mode === 'run');
await page.waitForTimeout(300);
const pause = await page.evaluate(() => { const b = __sfr.ui.buttons.find((x) => x.id === 'pause'); return [b.x + b.w / 2, b.y + b.h / 2]; });
await tapW(pause[0], pause[1]); await page.waitForTimeout(300);
const m1 = await page.evaluate(() => __sfr.play.st.moves);
await page.waitForTimeout(900);
const m2 = await page.evaluate(() => __sfr.play.st.moves);
ok(m1 === m2 && await page.evaluate(() => __sfr.screens.ov === 'pause'), 'pause freezes the snake');
// saved attempt exists after pause and Continue resumes it
ok(await page.evaluate(() => !!__sfr.save.data.attempt && __sfr.save.data.attempt.level === 3), 'attempt snapshot saved on pause');
const res = await page.evaluate(() => { const b = __sfr.ui.buttons.find((x) => x.id === 'resume'); return [b.x + b.w / 2, b.y + b.h / 2]; });
await tapW(res[0], res[1]); await page.waitForTimeout(500);
ok(await page.evaluate(() => __sfr.play.mode === 'run'), 'RESUME continues');
console.log(page.errors.join('\n') || 'no JS errors');
await browser.close();
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
