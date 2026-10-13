const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
(async () => {
  const file = path.resolve(__dirname, '../HUSH-FP-v3.html'), out = '/tmp/claude-0/shots';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, vw, vh] of [['a', 844, 390], ['b', 640, 360], ['c', 915, 412]]) {
    const p = await (await b.newContext({ viewport: { width: vw, height: vh }, hasTouch: true })).newPage();
    await p.goto('file://' + file + '?test=1&unlock=1'); await p.waitForFunction(() => window.HUSH && HUSH.G.mode === 'home', null, { timeout: 90000 }); await p.waitForTimeout(800);
    if (name === 'a') { await p.screenshot({ path: out + '/ui-home.png' }); await p.click('#m-play'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/ui-chapters.png' }); await p.click('#chapter-list .chap:nth-child(2)'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/ui-levels.png' }); }
    await p.evaluate(() => HUSH.startLevel(10)); await p.waitForFunction(() => HUSH.G.mode === 'game' && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 90000 });
    await p.evaluate(() => { HUSH.world().pulse(); }); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/ui-hud-${name}.png` });
    if (name === 'a') { await p.click('#b-bag'); await p.waitForTimeout(300); await p.screenshot({ path: out + '/ui-inv.png' }); await p.click('#ov-inv [data-pclose]'); await p.click('#obj'); await p.waitForTimeout(300); await p.screenshot({ path: out + '/ui-obj.png' }); }
    await p.close();
  }
  await b.close();
})();
