// AdMob wiring with a mock Capacitor plugin: banner on home + puzzle (portrait), hidden in Build/landscape, space reserved.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 360, height: 740 } }); p.setDefaultTimeout(60000); const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERR', e.message); });
  await p.addInitScript(() => { window.__adlog = []; const L = (n) => (a) => { window.__adlog.push(n + (a && a.adId ? ':' + a.adId.slice(-10) + ':' + a.isTesting : '')); return Promise.resolve({}); };
    window.Capacitor = { Plugins: { AdMob: { initialize: L('init'), showBanner: L('showBanner'), resumeBanner: L('resume'), hideBanner: L('hide'), addListener: L('listen'), prepareInterstitial: L('prepInter'), showInterstitial: L('showInter'), prepareRewardVideoAd: L('prepRew'), showRewardVideoAd: () => { window.__adlog.push('showRew'); return Promise.resolve({ amount: 1 }); } } } }; });
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on', { timeout: 90000 }); await p.waitForTimeout(1000);
  const st = async (n) => console.log(n.padEnd(10), JSON.stringify(await p.evaluate(() => ({ log: window.__adlog.slice(-3), adb: getComputedStyle(document.documentElement).getPropertyValue('--adb'), layer: (document.querySelector('.layer.on') || {}).id }))));
  await st('menu'); await p.click('#btnContinue'); await p.waitForTimeout(1500);
  await p.evaluate(() => { __game.S.tut = { off: true, done: {}, rooms: 9 }; document.getElementById('modal').classList.add('hidden'); const d = document.getElementById('dialog'); d.classList.add('hidden'); }); await p.waitForTimeout(500); await st('home'); await p.screenshot({ path: 'ads_home.png' });
  const r = await p.evaluate(() => { const e = document.getElementById('btnPlay').getBoundingClientRect(); return [e.bottom, innerHeight]; }); console.log('playbar bottom', Math.round(r[0]), 'of', r[1], r[0] <= r[1] - 56 ? 'clear of banner' : 'COVERED');
  await p.evaluate(() => document.getElementById('navBuild').click()); await p.waitForTimeout(1500); await st('build');
  await p.evaluate(() => __game.exitBuild()); await p.waitForTimeout(800); await st('home2');
  await p.evaluate(() => { const G = __game; G.S.hearts = 5; G.S.howto = { pipe: 1 }; G.startLevel(); }); await p.waitForTimeout(2500); await st('puzzle'); await p.screenshot({ path: 'ads_puzzle.png' });
  const bo = await p.evaluate(() => { const e = document.querySelector('.boosters').getBoundingClientRect(); return [e.bottom, innerHeight]; }); console.log('boosters bottom', Math.round(bo[0]), bo[0] <= bo[1] - 56 ? 'clear' : 'COVERED');
  await p.setViewportSize({ width: 740, height: 360 }); await p.waitForTimeout(800); await st('landscape');
  await p.evaluate(async () => { await ADS.rewarded(); ADS.interstitial(); }); await st('rewarded');
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
