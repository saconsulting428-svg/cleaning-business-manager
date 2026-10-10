// Plays every solver solution through the real game (real tick(), input path, events, win handling, save) in Chromium.
const { chromium } = require('/opt/node-tools/node_modules/playwright'), fs = require('fs'), path = require('path');
const sols = {}; fs.readdirSync(path.join(__dirname, 'solutions')).forEach(f => Object.assign(sols, JSON.parse(fs.readFileSync(path.join(__dirname, 'solutions', f)))));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 })).newPage(); const errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2200);
  let pass = 0, tot = 0; const rows = [];
  for (const L of Object.keys(sols).map(Number).sort((a, b) => a - b)) {
    const s = sols[L]; if (!s) { rows.push({ level: L, solved: false }); continue; }
    const r = await p.evaluate(([i, path]) => window.HUSH_TEST.run(i, path, 12), [L - 1, s.path]); await p.waitForTimeout(60);
    const savedStars = await p.evaluate(i => window.HUSH_TEST.save.stars[i], L - 1); tot++;
    const good = r.won && !r.dead && r.stars === s.stars && savedStars >= r.stars; if (good) pass++;
    rows.push({ level: L, won: r.won, stars: r.stars, saved: savedStars, t: +r.t.toFixed(1), su: r.su }); console.log((good ? 'PASS' : 'FAIL') + ` L${L}: won=${r.won} stars=${r.stars} saved=${savedStars} time=${r.t.toFixed(1)}s sonar=${r.su}`);
  }
  console.log(`${pass}/${tot} levels completed through the real game; console errors: ${errs.length}`); if (errs.length) console.log(errs.slice(0, 5));
  fs.writeFileSync(path.join(__dirname, 'results-playthrough.json'), JSON.stringify(rows, null, 1));
  await b.close(); process.exit(pass === tot && !errs.length ? 0 : 1);
})();
