// (1) portrait home: zoom/settings row must sit below the quest card; (2) no banner/interstitial while the tutorial is active.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 360, height: 760 } }); p.setDefaultTimeout(60000); const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERR', e.message); });
  await p.addInitScript(() => { window.__adlog = []; const L = (n) => () => { window.__adlog.push(n); return Promise.resolve({}); }; window.Capacitor = { Plugins: { AdMob: { initialize: L('init'), showBanner: L('showBanner'), resumeBanner: L('resume'), hideBanner: L('hide'), addListener: L('listen'), prepareInterstitial: L('prepInter'), showInterstitial: L('showInter') } } }; });
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on', { timeout: 90000 }); await p.waitForTimeout(800);
  await p.click('#btnContinue'); await p.waitForTimeout(2500);
  console.log('tutorial active -> ads log:', JSON.stringify(await p.evaluate(() => ({ log: window.__adlog, tutOff: !!(__game.S.tut && __game.S.tut.off) }))));
  await p.evaluate(() => { __game.S.tut = { off: true, done: {}, rooms: 9 }; __game.S.chapter = 1; __game.save(); try { __game.enterHome(); } catch (e) { } }); await p.waitForTimeout(3000);
  console.log('tutorial off -> ads log:', JSON.stringify(await p.evaluate(() => window.__adlog.slice(-3))));
  const r = await p.evaluate(() => { const q = document.getElementById('quest').getBoundingClientRect(), s = document.querySelector('#home .side.right').getBoundingClientRect(); return { questBottom: Math.round(q.bottom), rowTop: Math.round(s.top), gap: Math.round(s.top - q.bottom) }; });
  console.log('row vs quest card', JSON.stringify(r), r.gap >= 4 ? 'OK' : 'OVERLAP');
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
