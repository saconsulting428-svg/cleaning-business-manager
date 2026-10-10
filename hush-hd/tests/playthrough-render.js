// Replays every solver solution through the real frame loop WITH RENDERING of every frame (hide, vents, stairs, doors, death, win), failing on any draw error.
const { chromium } = require('/opt/node-tools/node_modules/playwright'), fs = require('fs'), path = require('path');
const sols = {}; fs.readdirSync(path.join(__dirname, 'solutions')).forEach(f => Object.assign(sols, JSON.parse(fs.readFileSync(path.join(__dirname, 'solutions', f)))));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 })).newPage(); const errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 200)); }); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2200);
  const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null; let pass = 0, tot = 0;
  for (const L of Object.keys(sols).map(Number).sort((a, b) => a - b)) {
    if (only && !only.includes(L)) continue; const s = sols[L]; if (!s) continue; tot++;
    const r = await p.evaluate(([i, path]) => window.HUSH_TEST.runRender(i, path), [L - 1, s.path]); const good = r.won && !r.drawErr && r.stars === s.stars; if (good) pass++;
    console.log((good ? 'PASS' : 'FAIL') + ` L${L}: won=${r.won} stars=${r.stars} t=${r.t.toFixed(1)}s` + (r.drawErr ? ' DRAW ERROR ' + r.drawErr.slice(0, 160) : ''));
  }
  console.log(`${pass}/${tot} solutions completed with every frame rendered; console errors/warnings: ${errs.length}`); if (errs.length) console.log(errs.slice(0, 4));
  await b.close(); process.exit(pass === tot && !errs.length ? 0 : 1);
})();
