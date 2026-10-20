/* visual check: teleports the player into several rooms of chosen levels and saves screenshots */
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
(async () => {
  const file = path.resolve(__dirname, '../' + (process.env.BUILD || 'HUSH-FP-v4.html')), out = process.env.OUT || '/tmp/claude-0/shots', lv = (process.env.LV || '1,11,21').split(',').map(Number);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + file + '?test=1&unlock=1'); await p.waitForFunction(() => window.HUSH && HUSH.G.mode === 'home', null, { timeout: 90000 });
  for (const n of lv) {
    await p.evaluate((n) => HUSH.startLevel(n - 1), n); await p.waitForFunction(() => HUSH.G.mode === 'game' && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 90000 });
    const rooms = await p.evaluate(() => HUSH.world().rooms.map(r => [r.cx + 0.5, r.cy + 0.5, r.kind]));
    for (let i = 0; i < Math.min(rooms.length, +(process.env.NR || 3)); i++) {
      const r = rooms[i]; await p.evaluate(([x, y]) => { const w = HUSH.world(), pl = w.player; pl.x = x - 2.2; pl.y = y + 0.2; pl.yaw = 0; pl.px = pl.x; pl.py = pl.y; }, r);
      await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/L${n}-${i}-${r[2]}.png` });
    }
  }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
