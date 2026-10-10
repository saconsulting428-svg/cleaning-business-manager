// Monster gait check at an exact 60 Hz: frame indices, cadence while moving slowly (roam) and hunting, thud timing.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2200);
  const out = await p.evaluate(() => {
    const T = window.HUSH_TEST; T.G.devUnlock = true; T.G.auto = true; T.loadLevel(4, true); T.overlay('tutorial', false); T.G.paused = false; T.G.auto = false;   // L5: a stalker patrols
    const S = T.G.S; S.hid = -1; S.x = 3; T.G.ppx = 3; T.G.px = 3; let n = 0; const th = []; const o = T.Sound.play; T.Sound.play = function (k) { if (k === 'cstep') th.push(n); return o.apply(this, arguments); };
    const frames = []; for (n = 0; n < 240; n++) { S.x = 3; T.advance(1 / 60); const c = S.cr[0]; const ph = T.G.crPhase[0] + T.G.cpo[0]; frames.push({ n, moving: T.G.crMv[0], x: +c.x.toFixed(1), fi: Math.floor((ph - Math.floor(ph)) * 8) % 8 }); }
    return { th, frames };
  });
  const mv = out.frames.filter(f => f.moving); let jumps = 0; for (let i = 1; i < mv.length; i++) { const d = (mv[i].fi - mv[i - 1].fi + 8) % 8; if (d > 1 && mv[i].n - mv[i - 1].n === 1) jumps++; }
  console.log('moving ticks', mv.length, 'of 240; frame jumps>1:', jumps, '; thuds at ticks', out.th.join(','), '; errors', errs.length);
  await b.close();
})();
