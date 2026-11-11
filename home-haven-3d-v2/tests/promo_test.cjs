// Promo build: everything unlocked, own save slot, recording panel jumps to any level / puzzle type.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 540, height: 960 } }); p.setDefaultTimeout(60000); const errs = []; p.on('pageerror', e => { errs.push(e.message); console.log('PAGEERR', e.message); });
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D_Promo.html'); await p.waitForSelector('#menu.on', { timeout: 90000 }); await p.click('#btnContinue'); await p.waitForTimeout(3000);
  await p.evaluate(() => { for (const i of ['modal', 'dialog']) { const e = document.getElementById(i); e && e.classList.add('hidden'); } });
  console.log('start', JSON.stringify(await p.evaluate(() => ({ coins: __game.S.coins, tutOff: __game.S.tut.off, keys: Object.keys(localStorage).filter(k => /homehaven/.test(k)), layer: document.querySelector('.layer.on').id }))));
  await p.click('#pm-b'); await p.fill('#pm-lv', '23'); await p.click('#pm-go'); await p.waitForTimeout(4500);
  console.log('lvl23', JSON.stringify(await p.evaluate(() => ({ level: __game.S.level, layer: document.querySelector('.layer.on').id, name: document.getElementById('ptName').textContent }))));
  await p.screenshot({ path: 'promo_play.png' });
  await p.click('#pm-b'); await p.click('#pm-types button[data-t=wire]'); await p.waitForTimeout(4500);
  console.log('wire', JSON.stringify(await p.evaluate(() => ({ level: __game.S.level, name: document.getElementById('ptName').textContent }))));
  await p.evaluate(() => __game.levelWin(3)); await p.waitForTimeout(1500);
  const ads = await p.evaluate(async () => ({ r: await ADS.rewarded(), cats: document.getElementById('build') ? 'ok' : 'x' }));
  console.log('rewarded instant:', ads.r, 'ERRORS', JSON.stringify(errs)); await b.close();
})();
