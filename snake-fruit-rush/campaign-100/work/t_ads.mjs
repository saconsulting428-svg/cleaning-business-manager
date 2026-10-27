import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const file = 'file://' + process.cwd() + '/test.html';
const b = await chromium.launch();
let pass = 0, fail = 0; const errs = [];
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
const LIVE = { banner: 'ca-app-pub-4552686824557844/8189814263', inter: 'ca-app-pub-4552686824557844/4376807748', rew: 'ca-app-pub-4552686824557844/7573816720' };
const FAKE = () => {
  const L = {}, calls = [];
  window.__ad = { calls, L, mode: { rewarded: 'ok', inter: 'ok', bannerLoad: true, consent: 'NOT_REQUIRED' }, loadDelay: 40 };
  const emit = (n, d) => (L[n] || []).forEach((f) => f(d));
  const M = window.__ad.mode;
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { AdMob: {
    addListener(n, f) { (L[n] = L[n] || []).push(f); calls.push(['addListener', n]); return Promise.resolve({ remove() {} }); },
    requestConsentInfo() { calls.push(['consent']); return Promise.resolve({ status: M.consent, isConsentFormAvailable: M.consent === 'REQUIRED', canRequestAds: true }); },
    showConsentForm() { calls.push(['showConsentForm']); return Promise.resolve({}); },
    initialize(o) { calls.push(['initialize', o]); return Promise.resolve(); },
    showBanner(o) { calls.push(['showBanner', o]); if (M.bannerLoad) { emit('bannerAdLoaded'); emit('bannerAdSizeChanged', { width: 360, height: 56 }); } else emit('bannerAdFailedToLoad', { code: 3 }); return Promise.resolve(); },
    hideBanner() { calls.push(['hideBanner']); return Promise.resolve(); },
    resumeBanner() { calls.push(['resumeBanner']); return Promise.resolve(); },
    removeBanner() { calls.push(['removeBanner']); return Promise.resolve(); },
    prepareInterstitial(o) { calls.push(['prepareInterstitial', o]); if (M.inter === 'nofill') { setTimeout(() => emit('interstitialAdFailedToLoad', {}), 10); return Promise.reject(new Error('nofill')); } setTimeout(() => emit('interstitialAdLoaded', {}), window.__ad.loadDelay); return Promise.resolve({}); },
    showInterstitial() { calls.push(['showInterstitial', window.__snake ? window.__snake.state : '']); setTimeout(() => emit('interstitialAdShowed'), 10); setTimeout(() => emit('interstitialAdDismissed'), 350); return Promise.resolve(); },
    prepareRewardVideoAd(o) { calls.push(['prepareRewardVideoAd', o]); if (M.rewarded === 'nofill') { setTimeout(() => emit('onRewardedVideoAdFailedToLoad', {}), 10); return Promise.reject(new Error('nofill')); } setTimeout(() => emit('onRewardedVideoAdLoaded', {}), window.__ad.loadDelay); return Promise.resolve({}); },
    showRewardVideoAd() {
      calls.push(['showRewardVideoAd', window.__snake ? window.__snake.state : '']);
      const m = M.rewarded;
      setTimeout(() => emit('onRewardedVideoAdShowed'), 10);
      if (m === 'ok') { setTimeout(() => emit('onRewardedVideoAdReward', { type: 'coins', amount: 1 }), 300); setTimeout(() => emit('onRewardedVideoAdDismissed'), 450); }
      else if (m === 'noreward') setTimeout(() => emit('onRewardedVideoAdDismissed'), 300);
      else if (m === 'nodismiss') setTimeout(() => emit('onRewardedVideoAdReward', { type: 'coins', amount: 1 }), 300);
      else if (m === 'failshow') { setTimeout(() => emit('onRewardedVideoAdFailedToShow', {}), 100); return Promise.reject(new Error('fail')); }
      return Promise.resolve({ type: 'coins', amount: 1 });
    }
  } } };
};
async function page(save, q = '', fake = true, vp = { width: 480, height: 800 }) {
  const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  if (fake) await p.addInitScript(FAKE);
  await p.addInitScript((s) => { if (s && !localStorage.getItem('snakeFruitRush.v1')) localStorage.setItem('snakeFruitRush.v1', JSON.stringify(s)); }, save);
  await p.goto(file + q); await p.waitForTimeout(2200); return { ctx, p };
}
const calls = (p, name) => p.evaluate((n) => window.__ad.calls.filter((c) => c[0] === n), name);
const last = async (p, n) => { const c = await calls(p, n); return c[c.length - 1]; };
const setMode = (p, k, v) => p.evaluate(([k, v]) => { window.__ad.mode[k] = v; }, [k, v]);
const waitState = (p, st, t = 12000) => p.waitForFunction((s) => __snake.state === s, st, { timeout: t });
const base = { coins: 500, menuMode: 'levels', camp: { unlocked: 60, cur: 5, stars: {} } };

console.log('IDs and SDK start');
{
  const { ctx, p } = await page(base);
  const init = await last(p, 'initialize'); const sb = await last(p, 'showBanner');
  ok(!!init && init[1].initializeForTesting === false, 'SDK initialised for live ads');
  ok(sb && sb[1].adId === LIVE.banner && sb[1].isTesting === false, 'banner uses the exact live banner ID (' + (sb && sb[1].adId) + ')');
  const ir = await last(p, 'prepareInterstitial'), rr = await last(p, 'prepareRewardVideoAd');
  ok(ir[1].adId === LIVE.inter, 'interstitial uses the exact live ID');
  ok(rr[1].adId === LIVE.rew, 'rewarded uses the exact live ID');
  const names = (await calls(p, 'addListener')).map((c) => c[1]);
  ok(names.length === new Set(names).size && names.length >= 10, 'each listener added once (' + names.length + ' listeners, no duplicates)');
  await ctx.close();
}
console.log('Test IDs with ?testads=1');
{
  const { ctx, p } = await page(base, '?testads=1');
  const sb = await last(p, 'showBanner'), rr = await last(p, 'prepareRewardVideoAd');
  ok(sb[1].adId.startsWith('ca-app-pub-3940256099942544/') && sb[1].isTesting === true && rr[1].adId === 'ca-app-pub-3940256099942544/5224354917', 'test mode uses Google test units');
  await ctx.close();
}
console.log('Banner only on menu screens');
{
  const { ctx, p } = await page(base);
  const shown = () => p.evaluate(() => __snake.state + ':' + window.SFRAds.state.bannerShown);
  ok((await shown()) === 'menu:true', 'banner visible on the main menu');
  await p.evaluate(() => __snake.camp.open()); await p.waitForTimeout(500);
  ok((await shown()) === 'levels:true', 'banner stays on the level map');
  await p.evaluate(() => __snake.openSheet(5)); await p.waitForTimeout(300);
  ok((await shown()).endsWith(':true'), 'banner visible with the Shop / Skins / Gifts sheets');
  await p.evaluate(() => __snake.closeSheet());
  await p.evaluate(() => { __snake.camp.start(5); }); await p.waitForTimeout(400);
  ok((await shown()) === 'play:false', 'banner hidden while a level is played');
  await p.keyboard.press('Space'); await p.waitForTimeout(300);
  ok((await shown()) === 'paused:false', 'banner hidden on pause');
  await p.keyboard.press('Space');
  await p.evaluate(() => { window.__speedMul = 0.2; __snake.camp.start(1); }); await waitState(p, 'won');
  ok((await shown()) === 'won:false', 'banner hidden on level complete');
  await p.evaluate(() => { window.__speedMul = 3; __snake.camp.start(2); }); await waitState(p, 'over');
  ok((await shown()) === 'over:false', 'banner hidden on level failure');
  await p.evaluate(() => __snake.camp.home()); await p.waitForTimeout(600);
  ok((await shown()) === 'menu:true', 'banner comes back on the menu (resume, no new ad request)');
  ok((await calls(p, 'showBanner')).length === 1, 'banner created once, then hidden / resumed');
  await p.evaluate(() => __snake.DATA.mode = 'classic'); await p.evaluate(() => { __snake.newGame(); }); await p.waitForTimeout(300);
  ok((await shown()) === 'play:false', 'banner hidden in Endless play');
  await ctx.close();
}
console.log('Banner never covers the game');
{
  for (const [vp, label] of [[{ width: 480, height: 800 }, 'screen exactly as tall as the game (worst case)'], [{ width: 360, height: 800 }, 'tall phone']]) {
    const { ctx, p } = await page(base, '', true, vp);
    await p.evaluate(() => { __snake.camp.start(5); });
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { bottom: c.bottom, h: innerHeight, off: document.getElementById('game').style.bottom }; });
    ok(r.bottom <= r.h - 56 + 1 || r.h - r.bottom >= 56, label + ': game ends ' + Math.round(r.h - r.bottom) + ' px above the bottom, banner is 56 px (' + r.off + ')');
    await ctx.close();
  }
}
console.log('Rewarded: Endless revive');
{
  const { ctx, p } = await page({ ...base, menuMode: 'endless' });
  await p.evaluate(() => { __snake.newGame(); __snake.G.score = 120; __snake.gameOver(); });
  await p.waitForTimeout(300);
  const len0 = await p.evaluate(() => __snake.G.snake.length);
  await p.evaluate(() => __snake.watchAd());
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => __snake.state === 'ad' && __snake.G.revives !== 1), 'ad screen is up, no revive before the reward');
  await waitState(p, 'paused');
  ok(await p.evaluate(() => __snake.G.revives === 1), 'revive granted after the reward callback');
  await p.evaluate(() => __snake.gameOver()); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => __snake.adAvailable() && (__snake.G.revives || 0) < 1)), 'only one revive per game');
  await p.evaluate(() => { __snake.newGame(); __snake.gameOver(); });
  await setMode(p, 'rewarded', 'noreward');
  await p.evaluate(() => window.SFRAds.state.rewardedReady = true);
  await p.evaluate(() => __snake.watchAd());
  await p.waitForFunction(() => __snake.state === 'over', null, { timeout: 8000 });
  ok(await p.evaluate(() => (__snake.G.revives || 0) === 0 && __snake.G.adMsg !== ''), 'ad closed without reward: no revive, normal game-over screen');
  await ctx.close();
}
console.log('Rewarded: campaign hint');
{
  const { ctx, p } = await page(base);
  await p.evaluate(() => { window.__speedMul = 3; __snake.camp.start(2); }); await waitState(p, 'over');
  ok(await p.evaluate(() => !__snake.camp.C.route), 'no hint before watching');
  await setMode(p, 'rewarded', 'noreward');
  await p.evaluate(() => { window.SFRAds.state.rewardedReady = true; __snake.ads.adHint(); });
  await p.waitForFunction(() => __snake.state === 'over' && __snake.G.adMsg, null, { timeout: 8000 });
  ok(await p.evaluate(() => !__snake.camp.C.route), 'ad skipped: no hint is given');
  await setMode(p, 'rewarded', 'ok');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { __snake.G.adMsg = ''; window.SFRAds.state.rewardedReady = true; __snake.ads.adHint(); });
  await p.waitForFunction(() => __snake.state === 'play', null, { timeout: 8000 });
  ok(await p.evaluate(() => !!__snake.camp.C.route && __snake.camp.C.route.length > 10 && __snake.camp.C.id === 2), 'hint granted after the reward: the level restarts with the route shown');
  await p.waitForTimeout(1500); await p.screenshot({ path: 'shots/ad_hint.png' });
  ok(await p.evaluate(() => { const C = __snake.camp.C; return C.route.every((c) => !C.rt.wall[c] && !C.rt.bomb[c]); }), 'hint route never leads over a wall or bomb');
  await ctx.close();
}
console.log('Rewarded: +50 coins');
{
  const { ctx, p } = await page({ ...base, coins: 10 });
  const coins = () => p.evaluate(() => __snake.DATA.coins);
  await p.evaluate(() => { __snake.openSheet(5); }); await p.waitForTimeout(500);
  await p.screenshot({ path: 'shots/ad_shop.png' });
  for (let i = 1; i <= 3; i++) {
    await p.evaluate(() => { window.SFRAds.state.rewardedReady = true; __snake.ads.claimAdCoins(); });
    await p.waitForFunction(() => __snake.state === 'menu', null, { timeout: 8000 });
    await p.waitForTimeout(400);
    ok((await coins()) === 10 + 50 * i, 'claim ' + i + ' gives +50 (coins ' + (await coins()) + ')');
  }
  const inv = await p.evaluate(() => JSON.stringify(__snake.DATA.pw) + __snake.DATA.skins.length);
  ok((await coins()) === 160 && (await p.evaluate(() => __snake.ads.coinsLeft())) === 0, '3 per day limit reached');
  const n0 = (await calls(p, 'showRewardVideoAd')).length;
  await p.evaluate(() => __snake.ads.claimAdCoins()); await p.waitForTimeout(500);
  ok((await calls(p, 'showRewardVideoAd')).length === n0 && (await coins()) === 160, 'a 4th claim shows no ad and gives nothing');
  ok((await p.evaluate(() => JSON.stringify(__snake.DATA.pw) + __snake.DATA.skins.length)) === inv, 'nothing was bought or opened automatically');
  await p.evaluate(() => { __snake.DATA.adCoins.d = '2000-01-01'; });
  ok((await p.evaluate(() => __snake.ads.coinsLeft())) === 3, 'the limit resets on a new day');
  await setMode(p, 'rewarded', 'noreward');
  await p.evaluate(() => { window.SFRAds.state.rewardedReady = true; __snake.ads.claimAdCoins(); });
  await p.waitForFunction(() => __snake.state === 'menu', null, { timeout: 8000 }); await p.waitForTimeout(300);
  ok((await coins()) === 160 && (await p.evaluate(() => __snake.ads.coinsLeft())) === 3, 'ad closed early: no coins, claim not used up');
  await setMode(p, 'rewarded', 'nodismiss');
  await p.evaluate(() => { window.SFRAds.state.rewardedReady = true; __snake.ads.claimAdCoins(); });
  await p.waitForFunction(() => __snake.state === 'menu', null, { timeout: 10000 }); await p.waitForTimeout(300);
  ok((await coins()) === 210, 'reward callback fired but no dismiss event: still paid after the 4 s safety wait');
  await setMode(p, 'rewarded', 'failshow');
  await p.waitForTimeout(1800);
  await p.evaluate(() => { window.SFRAds.state.rewardedReady = true; __snake.ads.claimAdCoins(); });
  await p.waitForFunction(() => __snake.state === 'menu', null, { timeout: 8000 }); await p.waitForTimeout(300);
  ok((await coins()) === 210, 'ad failed to show: no coins');
  await ctx.close();
}
console.log('Optional ad buttons appear only when an ad can really be shown');
{
  const { ctx, p } = await page({ ...base, coins: 5 }, '', true);
  await setMode(p, 'rewarded', 'nofill');
  await p.evaluate(() => { window.SFRAds.state.rewardedReady = false; });
  ok(await p.evaluate(() => !__snake.adAvailable()), 'no ad loaded: ad buttons are hidden');
  await ctx.close();
  const q = await page({ ...base, coins: 5 }, '', false);
  ok(await q.p.evaluate(() => !__snake.adAvailable()), 'plain browser (no Android SDK): no ad buttons, no errors');
  await q.p.evaluate(() => { window.__speedMul = 3; __snake.camp.start(2); }); await waitState(q.p, 'over');
  await q.p.evaluate(() => __snake.camp.retry()); await q.p.waitForTimeout(300);
  ok(await q.p.evaluate(() => __snake.state === 'play'), 'Try again works without any ad');
  await q.ctx.close();
}
console.log('Interstitial: natural breaks, cooldown, once per completion');
{
  const { ctx, p } = await page(base);
  const inters = () => calls(p, 'showInterstitial');
  const win = async (id) => { await p.evaluate((i) => { window.__speedMul = 0.2; __snake.camp.start(i); }, id); await waitState(p, 'won'); };
  await p.evaluate(() => { __snake.ads.meta.last = Date.now() - 200000; });
  await win(1); await p.evaluate(() => __snake.camp.next()); await p.waitForTimeout(500);
  await win(1); await p.evaluate(() => __snake.camp.next()); await p.waitForTimeout(500);
  ok((await inters()).length === 0 && (await p.evaluate(() => __snake.state)) === 'play', 'no interstitial after the 1st and 2nd completed level; next level starts');
  await win(1);
  await p.evaluate(() => { __snake.ads.meta.last = Date.now() - 20000; });
  await p.evaluate(() => __snake.camp.next()); await p.waitForTimeout(500);
  ok((await inters()).length === 0 && (await p.evaluate(() => __snake.state)) === 'play', '3rd level but inside the 90 s cooldown: no ad, game goes on');
  await win(1);
  await p.evaluate(() => { __snake.ads.meta.last = Date.now() - 200000; });
  await p.evaluate(() => __snake.camp.next());
  await p.waitForFunction(() => __snake.state === 'play', null, { timeout: 8000 });
  const c1 = await inters();
  ok(c1.length === 1 && c1[0][1] === 'ad', 'interstitial after the 3rd level result, before the next level (shown from the ad screen, not during play)');
  ok(await p.evaluate(() => __snake.camp.C.id === 2 && __snake.camp.C.moves === 0), 'the next level then starts normally');
  await win(1); await p.evaluate(() => __snake.camp.next()); await p.waitForTimeout(600);
  ok((await inters()).length === 1, 'not again for the next completion');
  // after a rewarded ad the cooldown restarts
  await p.evaluate(() => { __snake.ads.meta.levels = 5; __snake.ads.meta.last = Date.now() - 200000; });
  await p.evaluate(() => { window.__speedMul = 0.2; __snake.camp.start(1); }); await waitState(p, 'won');
  await p.evaluate(() => { window.SFRAds.state.rewardedReady = true; __snake.ads.requestRewarded('coins', { back: 'won', ok() {}, fail() {} }); });
  await p.waitForFunction(() => __snake.state === 'won', null, { timeout: 8000 });
  await p.evaluate(() => { __snake.ads.meta.levels = 5; });
  await p.evaluate(() => __snake.camp.next()); await p.waitForTimeout(700);
  ok((await inters()).length === 1, 'no interstitial right after a rewarded ad');
  // Endless
  await setMode(p, 'inter', 'ok');
  await p.evaluate(() => { __snake.ads.meta.last = Date.now() - 200000; __snake.ads.meta.endless = 0; __snake.newGame(); __snake.gameOver(); __snake.newGame(); __snake.gameOver(); });
  await p.waitForTimeout(500);
  const n1 = (await inters()).length;
  await p.evaluate(() => __snake.ads.playAgain());
  await p.waitForFunction(() => __snake.state === 'play', null, { timeout: 8000 });
  ok((await inters()).length === n1 + 1, 'Endless: Play again after the 2nd game over shows one interstitial, then a new game');
  // not available
  await p.evaluate(() => { __snake.ads.meta.last = Date.now() - 200000; __snake.ads.meta.endless = 5; window.SFRAds.state.interReady = false; __snake.gameOver(); });
  const n2 = (await inters()).length;
  await p.evaluate(() => __snake.ads.playAgain()); await p.waitForTimeout(400);
  ok((await inters()).length === n2 && (await p.evaluate(() => __snake.state)) === 'play', 'interstitial not ready: simply continues');
  await ctx.close();
}
console.log('Listeners, save and errors');
{
  const { ctx, p } = await page(base);
  for (let i = 0; i < 12; i++) await p.evaluate((i) => __snake.camp.start(10 + i), i);
  const names = (await calls(p, 'addListener')).map((c) => c[1]);
  ok(names.length === new Set(names).size, 'no duplicate SDK listeners after many level restarts');
  await p.evaluate(() => { __snake.DATA.adCoins = { d: new Date().toISOString().slice(0, 10), n: 2 }; });
  const sv = await p.evaluate(() => { __snake.DATA.coins; return 1; });
  await ctx.close();
  const c2 = await page({ coins: 1, adCoins: { d: 'bad', n: 9999 } }, '', false);
  ok(await c2.p.evaluate(() => __snake.DATA.adCoins === null), 'broken saved ad-coin record is ignored');
  await c2.ctx.close();
  void sv;
}
console.log('pass', pass, 'fail', fail, 'page errors', errs.length, errs.slice(0, 3));
await b.close();
