/* Exploratory session in the real page: flows a player would do, plus leak and persistence checks. Prints FINDINGS (anything surprising) instead of asserting. */
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
(async () => {
  const file = path.resolve(__dirname, '../' + (process.env.BUILD || 'HUSH-FP-v5.html')); const F = []; const find = (s) => { F.push(s); console.log('FINDING:', s); }; const info = (s) => console.log('  ', s);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
  const open = async (q) => { await p.goto('file://' + file + '?test=1' + (q || '')); await p.waitForFunction(() => window.HUSH && HUSH.G.mode === 'home', null, { timeout: 120000 }); };
  const inGame = () => p.waitForFunction(() => HUSH.G.mode === 'game' && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 120000 });
  const shown = (id) => p.evaluate((i) => document.getElementById(i).classList.contains('show') || document.getElementById(i).classList.contains('active'), id);
  await open(); await p.evaluate(() => localStorage.clear()); await open();
  /* 1. locked content */
  await p.click('#m-play'); await p.click('#chapter-list .chap:nth-child(2)'); info('tap locked chapter 2 -> still on chapters: ' + (await shown('scr-chapters')));
  if (!(await shown('scr-chapters'))) find('a locked chapter can be opened');
  await p.click('#chapter-list .chap:nth-child(1)'); const lockedLv = await p.evaluate(() => document.querySelectorAll('#level-grid .lv.lock').length); if (lockedLv !== 12) find('chapter 1 should show 12 locked levels at the start, got ' + lockedLv);
  await p.click('#level-grid .lv:nth-child(5)'); await p.waitForTimeout(400); if (await p.evaluate(() => HUSH.G.mode === 'game')) find('a locked level (5) can be started');
  /* 2. play level 1 with REAL input: walk, look, pause/resume with Escape, open panels */
  await p.click('#level-grid .lv:nth-child(1)'); await inGame();
  await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); if (!(await shown('ov-pause'))) find('Escape does not open the pause menu in game');
  const pz = await p.evaluate(() => [HUSH.world().player.x, HUSH.world().player.y]); await p.waitForTimeout(800); const pz2 = await p.evaluate(() => [HUSH.world().player.x, HUSH.world().player.y]); if (Math.hypot(pz[0] - pz2[0], pz[1] - pz2[1]) > 0.001) find('the world keeps moving while paused');
  await p.click('#p-settings'); await p.waitForTimeout(200); if (!(await shown('ov-settings'))) find('Settings does not open from pause'); await p.click('#s-close'); if (!(await shown('ov-pause'))) find('closing Settings from pause should return to the pause menu (it does not)');
  await p.click('#p-resume'); await p.waitForTimeout(300); if (await p.evaluate(() => HUSH.G.paused)) find('Resume leaves the game paused');
  /* 3. restart spam (leak check) */
  const mem = () => p.evaluate(() => { const i = HUSH.view().renderer.info.memory; return { g: i.geometries, t: i.textures, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1 }; });
  const m0 = await mem(); for (let i = 0; i < 6; i++) { await p.evaluate((n) => HUSH.startLevel(n), i % 2 ? 12 : 4); await inGame(); } const m1 = await mem(); info('memory after 6 level loads: ' + JSON.stringify(m0) + ' -> ' + JSON.stringify(m1));
  if (m1.g > m0.g + 40 || m1.t > m0.t + 15) find('GPU resources grow across level loads (possible leak): ' + JSON.stringify(m0) + ' -> ' + JSON.stringify(m1));
  /* 4. rapid pause/resume + tap storm */
  for (let i = 0; i < 20; i++) { await p.keyboard.press('Escape'); } await p.waitForTimeout(300); const st = await p.evaluate(() => ({ paused: HUSH.G.paused, ov: [...document.querySelectorAll('.overlay.show')].map(o => o.id) })); info('after 20 Escape presses: ' + JSON.stringify(st)); if (st.paused !== st.ov.includes('ov-pause')) find('pause state and pause overlay disagree after rapid Escape: ' + JSON.stringify(st));
  await p.evaluate(() => { document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); HUSH.G.paused = false; });
  /* 5. progression across the chapter boundary: win level 13 and press Next */
  await p.evaluate(() => HUSH.unlockAll()); await p.evaluate(() => HUSH.startLevel(12)); await inGame(); await p.evaluate(() => { HUSH.world().god = true; HUSH.runBot(900); }); await p.waitForFunction(() => document.getElementById('ov-win').classList.contains('show'), null, { timeout: 30000 }).catch(() => {});
  if (!(await shown('ov-win'))) find('level 13 could not be won by the bot'); else { await p.click('#w-next'); await inGame(); const lv = await p.evaluate(() => [HUSH.G.level, HUSH.G.chapterView, HUSH.world().spec.name]); info('next after level 13 -> ' + JSON.stringify(lv)); if (lv[0] !== 13) find('Next level after 13 went to ' + lv[0]); if (lv[1] !== 1) find('chapter view not updated after crossing into chapter 2'); }
  /* 6. persistence across reload */
  const before = await p.evaluate(() => JSON.stringify({ s: HUSH.save.stars.slice(0, 15), l: HUSH.save.logs })); await p.reload(); await p.waitForFunction(() => window.HUSH && HUSH.G.mode === 'home', null, { timeout: 120000 }); const after = await p.evaluate(() => JSON.stringify({ s: HUSH.save.stars.slice(0, 15), l: HUSH.save.logs })); if (before !== after) find('progress not restored after reload: ' + before + ' vs ' + after); else info('save restored after reload');
  /* 7. old 30-level save compatibility */
  await p.evaluate(() => localStorage.setItem('hush-fp-save', JSON.stringify({ v: 1, stars: new Array(30).fill(1), best: [], set: {}, last: 29 }))); const keys = await p.evaluate(() => Object.keys(localStorage)); info('localStorage keys: ' + keys.join(','));
  /* 8. orientation / resize */
  await p.evaluate((i) => HUSH.startLevel(i), 3); await inGame(); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700); const rot = await p.evaluate(() => getComputedStyle(document.getElementById('ov-rotate')).display !== 'none'); info('portrait: rotate overlay shown = ' + rot); if (!rot) find('portrait mode shows no rotate-to-landscape overlay'); await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(700); if (await shown('ov-pause')) await p.click('#p-resume'); if (await p.evaluate(() => HUSH.G.paused)) find('game stays paused after rotating back and pressing Resume');
  const cw = await p.evaluate(() => { const c = document.getElementById('view'); return [c.clientWidth, c.clientHeight, innerWidth, innerHeight]; }); if (Math.abs(cw[0] - cw[2]) > 2 || Math.abs(cw[1] - cw[3]) > 2) find('canvas size does not follow the window after rotating back: ' + cw.join('x'));
  /* 9. dying twice quickly / retry spam */
  await p.evaluate(() => { const w = HUSH.world(); w.catchPlayer(w.creatures[0] || { id: 0 }); }); await p.waitForFunction(() => document.getElementById('ov-dead').classList.contains('show'), null, { timeout: 20000 }).catch(() => find('death overlay never shown'));
  await p.click('#d-retry'); await p.click('#d-retry', { timeout: 500 }).catch(() => {}); await inGame(); const alive = await p.evaluate(() => HUSH.world().player.alive && !HUSH.G.over); if (!alive) find('after retry (double tap) the player is not alive/ready');
  /* 10. console */
  const uniq = [...new Set(errs)]; if (uniq.length) find('console messages: ' + uniq.slice(0, 5).join(' | ')); else info('no console errors/warnings during the whole session');
  console.log(F.length ? `\n${F.length} finding(s)` : '\nno findings'); await b.close();
})();
