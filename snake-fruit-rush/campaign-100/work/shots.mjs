import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const file = 'file://' + process.cwd() + '/' + (process.argv[2] || 'test.html');
const ids = (process.argv[3] || '1,3,10,25,45,65,85,92,100').split(',').map(Number);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 480, height: 800 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(file + '?unlock=1&testads=1');
await p.waitForTimeout(1500);
await p.screenshot({ path: 'shots/menu.png' });
await p.evaluate(() => window.__snake.camp.open());
await p.waitForTimeout(400);
await p.screenshot({ path: 'shots/levels0.png' });
for (const id of ids) {
  await p.evaluate((i) => window.__snake.camp.start(i), id);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `shots/L${id}_ready.png` });
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `shots/L${id}.png` });
}
console.log('errors', errs.slice(0, 5));
await b.close();
