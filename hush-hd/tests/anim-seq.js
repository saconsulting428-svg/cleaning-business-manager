// Deterministic animation check: drives the real frame loop at exactly 60 Hz and records which sprite frame/blend is drawn through
// idle -> start -> run -> stop -> idle, and checks foot-step sounds against the drawn landings.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2200);
  const out = await p.evaluate(() => {
    const T = window.HUSH_TEST; T.G.devUnlock = true; T.G.auto = true; T.loadLevel(0, true); T.overlay('tutorial', false); T.G.paused = false; T.G.auto = false;
    const steps = []; const orig = T.Sound.play; T.Sound.play = function (n, o) { if (n === 'step' || n === 'glass') steps.push({ f: frameNo, n }); return orig.apply(this, arguments); };
    let frameNo = 0; const rows = []; const seq = [['idle', 30], ['run', 90], ['stop', 40]];
    for (const [phase, n] of seq) for (let k = 0; k < n; k++) { T.G.in.kr = phase === 'run'; T.advance(1 / 60); frameNo++; const d = T.view.debug.dbg || {}; rows.push({ f: frameNo, phase, x: +T.G.S.x.toFixed(2), mv: d.mv, run: d.run, b: d.b }); }
    return { rows, steps };
  });
  const r = out.rows; const stepAt = new Set(out.steps.map(s => s.f));
  let line = []; for (const x of r.filter(x => x.phase !== 'idle' || x.f > 26)) line.push(`${x.f}:${x.phase[0]}${x.mv}/${x.run}${x.b ? '+' + x.b : ''}${stepAt.has(x.f) ? '*' : ''}`);
  console.log(line.slice(0, 70).join('  ')); console.log('...'); console.log(line.slice(-45).join('  '));
  // continuity: while running, consecutive frame index must advance by 0 or 1 (mod 9), never jump
  const run = r.filter(x => x.phase === 'run' && x.mv === 1); let jumps = 0, maxStall = 0, stall = 0;
  for (let i = 1; i < run.length; i++) { const d = (run[i].run - run[i - 1].run + 9) % 9; if (d > 1) jumps++; if (d === 0) { stall++; maxStall = Math.max(maxStall, stall); } else stall = 0; }
  console.log('footsteps fired:', out.steps.length, 'at frames', out.steps.map(s => s.f).join(','));
  console.log('while running at 60Hz: frame-index jumps >1:', jumps, ' longest same-frame hold (60Hz ticks):', maxStall, ' errors:', errs.length);
  await b.close();
})();
