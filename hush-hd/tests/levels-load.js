// Loads each of the 30 levels in the real game, renders it from several camera positions, checks for errors, and times drawing.
const { chromium } = require('/opt/node-tools/node_modules/playwright'), fs = require('fs'), path = require('path');
const out = process.argv[3] || '/tmp/shots/levels'; fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })).newPage(); const errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2200);
  const rows = []; let bad = 0;
  for (let i = 0; i < 30; i++) {
    const r = await p.evaluate(async (i) => {
      const T = window.HUSH_TEST; T.G.devUnlock = true; T.G.auto = true; T.loadLevel(i, true); T.overlay('tutorial', false); T.G.paused = true; T.G.auto = false;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const W = T.G.W, S = T.G.S, res = { level: i + 1, name: W.def.name, floors: W.floors.length, objs: W.objs.length, creatures: W.cdefs.length, ok: true, ms: 0, frames: 0 };
      const f0 = W.floors[S.f].w, xs = [W.start.x, f0 * 0.5, W.exit.f === S.f ? W.exit.x : f0 - 1];
      const t0 = performance.now();
      for (const x of xs) { S.x = x; T.G.ppx = x; T.G.px = x; for (let k = 0; k < 20; k++) { T.fr.now = k * 0.033; T.fr.S = S; T.fr.px = x; T.G.now = k * 0.033; window.HUSH_TEST.view.draw(Object.assign(T.fr, { W, S, px: x, crx: S.cr.map(c => c.x), crMv: S.cr.map(() => false), crPhase: S.cr.map(() => 0), now: 5 + k * 0.033, pings: [], ripples: [], threat: 0, hunted: false, target: null, arrive: null, fade: 0, useP: -1, phase: 0, phaseC: 0 })); res.frames++; } }
      res.ms = (performance.now() - t0) / res.frames; return res;
    }, i);
    if (i % 3 === 0) { await p.evaluate(() => { const T = window.HUSH_TEST; T.G.S.x = T.G.W.start.x; T.G.ppx = T.G.S.x; T.G.px = T.G.S.x; }); await p.waitForTimeout(150); await p.screenshot({ path: out + '/L' + String(i + 1).padStart(2, '0') + '.png' }); }
    rows.push(r); console.log(`L${String(r.level).padStart(2)} ${r.name.padEnd(18)} floors=${r.floors} objects=${String(r.objs).padStart(2)} creatures=${r.creatures} draw=${r.ms.toFixed(1)}ms/frame (software GL)`);
  }
  console.log(`30 levels loaded and rendered; console errors/warnings: ${errs.length}`); if (errs.length) console.log(errs.slice(0, 6));
  fs.writeFileSync(path.join(__dirname, 'results-levels.json'), JSON.stringify(rows, null, 1)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
