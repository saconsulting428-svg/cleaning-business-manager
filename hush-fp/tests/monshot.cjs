/* close-up screenshots of each creature variant in the real renderer */
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
(async () => {
  const file = path.resolve(__dirname, '../' + (process.env.BUILD || 'HUSH-FP-v5.html')), out = '/tmp/claude-0/shots';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file + '?test=1&unlock=1'); await p.waitForFunction(() => window.HUSH && HUSH.G.mode === 'home', null, { timeout: 90000 });
  for (const [lv, name] of [[16, 'listener'], [3, 'sentinel'], [4, 'stalker']]) {
    await p.evaluate((n) => HUSH.startLevel(n), lv); await p.waitForFunction(() => HUSH.G.mode === 'game' && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 90000 });
    for (const [d, st, tag] of [[3.4, 'roam', 'near'], [2.2, 'hunt', 'hunt'], [9, 'roam', 'far']]) {
      await p.evaluate(([d, st]) => { const w = HUSH.world(), c = w.creatures[0], pl = w.player; let ok = false; for (let a = 0; a < 6.28 && !ok; a += 0.15) { const x = c.x - Math.cos(a) * d, y = c.y - Math.sin(a) * d, k = Math.floor(y) * w.W + Math.floor(x); if (w.cells[k] !== 0 && !w.solid.has(k) && HUSH.ai.lineOfSight(w, c.x, c.y, x, y)) { pl.x = x; pl.y = y; pl.yaw = a; pl.px = x; pl.py = y; ok = true; } } c.state = st; c.wait = 99; c.yaw = Math.atan2(pl.y - c.y, pl.x - c.x); c.moving = st === 'hunt'; HUSH.world().creatures.forEach(q => { q.revealT = 0; }); }, [d, st]);
      await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/mon-${name}-${tag}.png` });
    }
  }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
