// Renders select-screen portraits + a body sheet for every fighter. Usage: node tools/render-portraits.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright'); const path = require('path'), fs = require('fs');
const out = path.join(__dirname, '..', 'assets', 'roster'); fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const mkPage = async () => { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.setDefaultTimeout(120000); await p.goto('file://' + path.join(__dirname, '..', 'street-clash-3d.html') + '?q=low'); await p.waitForFunction(() => window.__sc, { timeout: 120000 }); await p.waitForTimeout(1200); return p; };
  let p = await mkPage();
  const names = await p.evaluate(() => { __sc.game.openSelect('arcade'); return [...document.querySelectorAll('#selList .card b')].map(e => e.textContent.toLowerCase()); });
  let count = 0;
  for (const id of names) {
    if (fs.existsSync(path.join(out, 'body_' + id + '.png'))) continue;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (count++ % 6 === 5) { await p.close(); p = await mkPage(); }
        await p.evaluate(id => { const g = __sc.game; g.openViewer(id); document.querySelector('#viewer').style.display = 'none'; g.viewerExpr('focused'); const V = g.v.view; V.az = .45; V.el = .02; V.dist = 1.55; V.ty = 1.56; V.fov = 24; }, id);
        await p.waitForTimeout(1700); await p.screenshot({ path: path.join(out, 'portrait_' + id + '.png'), clip: { x: 340, y: 60, width: 600, height: 600 } });
        await p.evaluate(() => { const V = __sc.game.v.view; V.az = .6; V.el = .05; V.dist = 5.0; V.ty = .95; V.fov = 28; });
        await p.waitForTimeout(1300); await p.screenshot({ path: path.join(out, 'body_' + id + '.png'), clip: { x: 380, y: 0, width: 520, height: 720 } });
        console.log('done', id); break;
      } catch (e) { console.log('retry', id, String(e).slice(0, 80)); try { await p.close(); } catch (_) {} p = await mkPage(); }
    }
  }
  await b.close(); console.log('PORTRAITS written');
})();
