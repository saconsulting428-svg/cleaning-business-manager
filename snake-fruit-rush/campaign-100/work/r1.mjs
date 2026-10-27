import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const modes = { swift: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'], default: [] };
for (const [mn, args] of Object.entries(modes)) {
  const b = await chromium.launch({ args });
  for (const q of ['', '?webgl=1', '?canvas=1']) {
    const p = await b.newPage({ viewport: { width: 480, height: 800 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + process.cwd() + '/test.html' + q); await p.waitForTimeout(1800);
    const has = await p.evaluate(() => !!document.querySelector('canvas'));
    let r = 'no canvas';
    if (has) { await p.evaluate(() => { __snake.camp.unlockAll(); __snake.camp.start(63); }); await p.waitForTimeout(1500); r = await p.evaluate(() => __snake.renderer); await p.screenshot({ path: 'shots/r_' + mn + (q.replace(/\W/g, '') || 'auto') + '.png' }); }
    console.log(mn, q || '(no param)', '->', r, errs.slice(0, 2)); await p.close();
  }
  await b.close();
}
