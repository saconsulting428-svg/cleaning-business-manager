import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const b = await chromium.launch(); let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', m); };
const MOCK = `window.FBInstant={calls:[],initializeAsync(){return Promise.resolve()},setLoadingProgress(p){this.calls.push('progress'+p)},startGameAsync(){this.calls.push('start');return Promise.resolve()},
 getRewardedVideoAsync(id){return Promise.resolve({loadAsync(){return Promise.resolve()},showAsync(){window.FBInstant.calls.push('rewarded:'+id);return Promise.resolve()}})},
 getInterstitialAdAsync(id){return Promise.resolve({loadAsync(){return Promise.resolve()},showAsync(){window.FBInstant.calls.push('inter:'+id);return Promise.resolve()}})},
 shareAsync(o){this.calls.push('share:'+(o.image||'').slice(0,10));return Promise.resolve()}};`;
async function run(name, vp, opts) {
  const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); const bad = []; p.on('requestfailed', (r) => { if (!/connect.facebook/.test(r.url())) bad.push(r.url()); });
  await p.route('**/fbinstant*.js', (r) => opts.mock ? r.fulfill({ contentType: 'application/javascript', body: MOCK }) : r.abort());
  if (opts.ids) await p.route('**/js/fb-config.js', (r) => r.fulfill({ contentType: 'application/javascript', body: "window.FB_CONFIG={rewardedPlacementId:'R1',interstitialPlacementId:'I1'};" }));
  await p.goto('http://localhost:8099/index.html'); await p.waitForTimeout(3000);
  ok(errs.length === 0 && bad.length === 0, name + ': loads, no page errors / failed requests ' + JSON.stringify(errs.concat(bad).slice(0, 3)));
  ok(await p.evaluate(() => !!window.__snake && document.querySelector('canvas') !== null), name + ': canvas + game running');
  return { ctx, p, errs };
}
// 1 no Facebook SDK (plain browser)
let { ctx, p, errs } = await run('plain', { width: 390, height: 844 }, {});
ok(await p.evaluate(() => typeof window.showRewardedAd === 'undefined' && !__snake.ads.kind), 'plain: no rewarded hook, no ad UI');
await p.evaluate(() => { __snake.camp.unlockAll(); __snake.camp.start(7); }); await p.waitForTimeout(900);
const r = await p.evaluate(() => new Promise((res) => { const C = __snake.camp.C; C.ready = 0; const route = C.L.R, D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]]; let i = 1, t0 = performance.now(), last = -1;
  const iv = setInterval(() => { const st = __snake.state; if (st === 'won') { clearInterval(iv); res('won'); return; } if (st !== 'play') { clearInterval(iv); res(st); return; }
    const G = __snake.G, h = G.snake[0], hc = h[1] * 20 + h[0]; for (let j = Math.max(0, i - 1); j < Math.min(route.length, i + 30); j++) if (route[j] === hc) { i = j + 1; break; }
    if (i < route.length) { const cur = route[i], d = D4.findIndex((v) => v[0] === (cur % 20) - h[0] && v[1] === ((cur / 20) | 0) - h[1]); if (d >= 0) G.queue = [D4[d]]; } if (performance.now() - t0 > 60000) { clearInterval(iv); res('timeout'); } }, 15); }));
ok(r === 'won', 'plain: level 7 played to the win through the stored route (' + r + ')');
ok(errs.length === 0, 'plain: still no page errors after play'); await p.screenshot({ path: 'fb_mobile.png' }); await ctx.close();
// 2 desktop size
({ ctx, p, errs } = await run('desktop', { width: 1280, height: 720 }, {})); await p.evaluate(() => { __snake.camp.unlockAll(); __snake.camp.start(1); }); await p.waitForTimeout(800);
const bb = await p.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return [c.width, c.height]; }); ok(bb[1] <= 720 && bb[0] <= 1280 && bb[1] > 500, 'desktop: canvas fits 1280x720 (' + bb.map(Math.round) + ')'); await p.screenshot({ path: 'fb_desktop.png' }); await ctx.close();
// 3 mock SDK without ids
({ ctx, p, errs } = await run('sdk-noids', { width: 390, height: 844 }, { mock: true })); ok(await p.evaluate(() => FBInstant.calls.join() === 'progress100,start'), 'sdk: init -> setLoadingProgress(100) -> startGameAsync'); ok(await p.evaluate(() => typeof window.showRewardedAd === 'undefined'), 'sdk without placement ids: ads stay off'); await ctx.close();
// 4 mock SDK with ids: rewarded coins + share
({ ctx, p, errs } = await run('sdk-ids', { width: 390, height: 844 }, { mock: true, ids: true }));
ok(await p.evaluate(() => typeof window.showRewardedAd === 'function'), 'sdk with ids: rewarded hook defined');
const c0 = await p.evaluate(() => __snake.DATA.coins); await p.evaluate(() => { __snake.openSheet(7); }); await p.waitForTimeout(500);
await p.evaluate(() => __snake.ads.claimAdCoins('menu', () => {})); await p.waitForTimeout(1500);
ok(await p.evaluate((c) => __snake.DATA.coins > c && FBInstant.calls.includes('rewarded:R1'), c0), 'sdk with ids: rewarded video shown, coins granted');
await p.evaluate(() => window.shareText('I scored 12 in Snake Fruit Rush! Can you beat me?')); ok(await p.evaluate(() => FBInstant.calls.some((x) => x.startsWith('share:data:image'))), 'share: shareAsync called with a score-card image');
ok(errs.length === 0, 'sdk-ids: no page errors ' + errs.slice(0, 2)); await ctx.close();
console.log('pass', pass, 'fail', fail); await b.close();
