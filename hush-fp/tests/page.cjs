/* Real-page play-through: every level is started through the game's own flow (3D scene built, HUD live), the scripted player completes it with the real
   logic (god mode only keeps the creature from ending the run), and the win overlay, stars and saved unlocks are checked. */
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
(async () => {
  const file = path.resolve(__dirname, '../' + (process.env.BUILD || 'HUSH-FP-v4.html')); const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + file + '?test=1'); await p.waitForFunction(() => window.HUSH && window.HUSH.G.mode === 'home', null, { timeout: 90000 }); let fail = 0, n = 0;
  const total = await p.evaluate(() => HUSH.LEVELS.length);
  for (let i = 0; i < total; i++) {
    if (only && !only.includes(i)) continue; n++;
    await p.evaluate(l => HUSH.startLevel(l), i); await p.waitForFunction(() => HUSH.G.mode === 'game' && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 90000 });
    const r = await p.evaluate(() => { const w = HUSH.world(); w.god = true; const t0 = performance.now(); const res = HUSH.runBot(900); return { res, ms: Math.round(performance.now() - t0), calls: HUSH.view().renderer.info.render.calls, tris: HUSH.view().renderer.info.render.triangles, name: HUSH.LEVELS[HUSH.G.level].name }; });
    await p.waitForFunction(() => document.getElementById('ov-win').classList.contains('show'), null, { timeout: 8000 }).catch(() => { });
    const win = await p.evaluate(() => ({ shown: document.getElementById('ov-win').classList.contains('show'), stars: HUSH.save.stars[HUSH.G.level], text: document.getElementById('win-info').textContent }));
    const ok = r.res.ok && win.shown && win.stars >= 1; if (!ok) fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' L' + String(i + 1).padStart(2) + ' ' + r.name.padEnd(20) + (ok ? 'won in ' + r.res.t.toFixed(0) + 's, stars ' + win.stars + ', ' + r.calls + ' draw calls, ' + Math.round(r.tris / 1000) + 'k tris' : ' ' + JSON.stringify(r.res) + ' ' + JSON.stringify(win)));
  }
  const unlockedAll = await p.evaluate(() => HUSH.save.stars.filter(s => s > 0).length);
  console.log('page errors:', errs.length, errs.slice(0, 3).join(' | ')); console.log(fail ? fail + ' failed' : n + ' levels completed in the real page; saved stars for ' + unlockedAll); await b.close(); process.exit(fail || errs.length ? 1 : 0);
})();
