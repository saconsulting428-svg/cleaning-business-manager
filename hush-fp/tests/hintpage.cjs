/* stuck hints in the real page: after a stretch with no progress the hint bar shows, plainer each time; the objectives panel has a hint button; one graphics tier only */
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
(async () => {
  const file = path.resolve(__dirname, '../HUSH-FP-test.html'); let ok = 0, bad = 0; const t = (n, c, d) => { c ? ok++ : (bad++, console.log('FAIL ' + n + (d ? '  ' + d : ''))); };
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file + '?test=1&tips=1&unlock=1'); await p.waitForFunction(() => window.HUSH && HUSH.G.mode === 'home', null, { timeout: 90000 });
  await p.evaluate(() => { for (const id of ['sprint', 'glass', 'water', 'vent', 'radio', 'code', 'generator', 'valve', 'breaker', 'alarm', 'logs', 'stalker', 'listener', 'lightsout', 'hunted', 'spark', 'steam', 'health', 'medkit', 'crawler', 'collapse', 'noticed']) HUSH.save.tips[id] = 1; });
  await p.evaluate(() => HUSH.startLevel(6)); await p.waitForFunction(() => HUSH.G.mode === 'game' && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 90000 });
  await p.evaluate(() => { const w = HUSH.world(); w.creatures.forEach(c => { c.x = 1; c.y = 1; }); w.sp = null; w.crawlers.length = 0; w.god = true; });
  const hint = () => p.evaluate(() => ({ show: document.getElementById('hint').classList.contains('show'), text: document.getElementById('hint').textContent, lvl: HUSH.G.prog && HUSH.G.prog.lvl, ping: HUSH.world().objs.some(o => o.pingT > 0) }));
  await p.waitForTimeout(1500); t('no hint right at the start', !(await hint()).text.includes('HINT'));
  for (const [tt, want] of [[49.2, 1], [104.2, 2], [164.2, 3]]) { await p.evaluate((x) => { HUSH.G.prog.t = x; }, tt); await p.waitForTimeout(1800); const h = await hint(); t('hint level ' + want + ' appears', h.show && h.text.startsWith('HINT') && h.lvl === want, JSON.stringify(h)); if (want === 2) t('level 2 gives distance and direction', /steps away/.test(h.text), h.text); if (want === 3) t('level 3 lights the markers', h.ping, JSON.stringify(h)); }
  await p.evaluate(() => { HUSH.G.prog.lvl = 0; document.getElementById('hint').classList.remove('show'); document.getElementById('hint').textContent = ''; HUSH.G.hintT = 0; });
  await p.click('#obj'); await p.waitForTimeout(300); t('objectives panel has a hint button', await p.evaluate(() => !!document.getElementById('obj-help') && document.getElementById('ov-obj').classList.contains('show')));
  await p.click('#obj-help'); await p.waitForTimeout(500); const h2 = await hint(); t('the hint button shows a hint and closes the panel', h2.show && /HINT/.test(h2.text) && !(await p.evaluate(() => document.getElementById('ov-obj').classList.contains('show'))), JSON.stringify(h2));
  /* progress resets the timer */
  await p.evaluate(() => { HUSH.G.prog.t = 40; const w = HUSH.world(); const o = w.objs.find(o => o.type === 'door' && !o.locked); o.want = 1; }); await p.waitForTimeout(1600); t('progress (a door opened) resets the stuck timer', await p.evaluate(() => HUSH.G.prog.t < 10 && HUSH.G.prog.lvl === 0));
  t('one graphics tier, no graphics setting', await p.evaluate(() => HUSH.view().qName === 'high' && !document.getElementById('set-gfx') && HUSH.view().Q.shadow === 0));
  t('no page errors', errs.length === 0, errs.join(';'));
  console.log(ok + ' passed, ' + bad + ' failed'); await b.close(); process.exit(bad ? 1 : 0);
})();
