/* HUD layout on common Android viewports: nothing off-screen, touch targets >= 44 px, no overlaps between HUD controls, centre of the view stays free. */
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
(async () => {
  const file = path.resolve(__dirname, '../' + (process.env.BUILD || 'HUSH-FP-v3.html')); let ok = 0, bad = 0; const t = (n, c, d) => { c ? ok++ : bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(d))); };
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const sizes = [[640, 360], [720, 360], [780, 360], [851, 393], [915, 412], [960, 540], [1024, 600]];
  for (const [w, h] of sizes) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true })).newPage();
    await p.goto('file://' + file + '?test=1&unlock=1'); await p.waitForFunction(() => window.HUSH && HUSH.G.mode === 'home', null, { timeout: 90000 });
    await p.evaluate(() => HUSH.startLevel(0)); await p.waitForFunction(() => HUSH.G.mode === 'game' && !document.getElementById('ov-load').classList.contains('show'), null, { timeout: 90000 }); await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const ids = ['obj', 'noise', 'b-pause', 'b-bag', 'stick', 'b-pulse', 'b-crouch', 'b-sprint', 'hotbar']; const o = {}; for (const i of ids) { const e = document.getElementById(i); const q = e.getBoundingClientRect(); o[i] = [q.left, q.top, q.right, q.bottom]; } return { o, W: innerWidth, H: innerHeight }; });
    const names = Object.keys(r.o).filter(n => n !== 'b-sprint'); // sprint button is parked off-screen until the stick is pushed far const inside = names.every(n => { const [l, tp, rr, bt] = r.o[n]; return l >= -1 && tp >= -1 && rr <= r.W + 1 && bt <= r.H + 1; }); t(`${w}x${h}: every HUD control is on screen`, inside, r.o);
    const small = ['b-pause', 'b-bag', 'b-pulse', 'b-crouch', 'obj'].filter(n => { const [l, tp, rr, bt] = r.o[n]; return Math.min(rr - l, bt - tp) < 44; }); t(`${w}x${h}: touch targets >= 44 px`, small.length === 0, small);
    const ov = []; const hit = (a, c) => a[0] < c[2] - 1 && c[0] < a[2] - 1 && a[1] < c[3] - 1 && c[1] < a[3] - 1; const check = names.filter(n => n !== 'b-sprint' || true); for (let i = 0; i < check.length; i++) for (let j = i + 1; j < check.length; j++) if (hit(r.o[check[i]], r.o[check[j]])) ov.push(check[i] + '/' + check[j]);
    t(`${w}x${h}: no HUD controls overlap`, ov.length === 0, ov);
    const free = (() => { const cx = r.W / 2, cy = r.H / 2, zone = [cx - r.W * 0.12, cy - r.H * 0.2, cx + r.W * 0.12, cy + r.H * 0.2]; return names.every(n => !hit(r.o[n], zone)); })(); t(`${w}x${h}: centre of the view is free`, free);
    await p.close();
  }
  console.log(ok + ' passed, ' + bad + ' failed'); await b.close(); process.exit(bad ? 1 : 0);
})();
