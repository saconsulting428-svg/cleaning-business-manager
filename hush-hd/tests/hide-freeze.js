const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2200);
  const r = await p.evaluate(() => {
    const T = window.HUSH_TEST; T.G.devUnlock = true; T.G.auto = true; T.loadLevel(4, true); T.overlay('tutorial', false); T.G.paused = false; T.G.auto = false;   // L5 has lockers
    const S = T.G.S; S.x = 4.5; T.G.ppx = 4.5; T.G.px = 4.5; S.cr[0].x = 25; let ex = null;
    try { for (let k = 0; k < 20; k++) T.advance(1 / 60); T.G.in.use = true; for (let k = 0; k < 120; k++) T.advance(1 / 60); } catch (e) { ex = String(e.stack).split('\n').slice(0, 3).join(' | '); }
    return { hid: S.hid, t: S.t, ex };
  });
  console.log(JSON.stringify(r), 'pageerrors:', errs.length, errs.slice(0, 2)); await b.close();
})();
