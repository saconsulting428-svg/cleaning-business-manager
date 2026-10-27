import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const b = await chromium.launch();
for (const [name, f, run] of [['original endless', 'base.html', () => __snake.newGame()], ['new endless', 'test.html', () => __snake.newGame()], ['new L1', 'test.html', () => { window.__speedMul = 1; __snake.camp.start(1); }], ['new L79', 'test.html', () => __snake.camp.start(79)]]) {
  const p = await b.newPage({ viewport: { width: 480, height: 800 } });
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto('file://' + process.cwd() + '/' + f + '?unlock=1&zoom=1.5'); await p.waitForTimeout(1200);
  await p.evaluate(run); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (t - ts[0] < 3000) requestAnimationFrame(f); else { const d = ts.slice(1).map((x, i) => x - ts[i]); res(Math.round(1000 / (d.reduce((a, c) => a + c, 0) / d.length))); } }; requestAnimationFrame(f); }));
  console.log(name, r, 'fps'); await p.close();
}
await b.close();
