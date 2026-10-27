import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 480, height: 800 } });
await p.goto('file://' + process.cwd() + '/test.html?unlock=1'); await p.waitForTimeout(900);
await p.evaluate(() => __snake.camp.start(63)); await p.waitForFunction(() => __snake.camp.C.ready === 0);
await p.waitForTimeout(300);
const r = await p.evaluate(async () => {
  const S = __snake, out = [];
  for (let t = 0; t < 4; t++) {
    while (!(S.acc > 60 && S.acc < 110)) await new Promise((r) => requestAnimationFrame(r));
    const a = S.pts().map((q) => [q.x, q.y]);
    S.turn(S.G.dir[0] ? [0, 1] : [1, 0]);
    const c = S.pts().map((q) => [q.x, q.y]);
    out.push(Math.round(Math.max(...a.map((q, i) => Math.hypot(q[0] - c[i][0], q[1] - c[i][1])))));
    await new Promise((r) => setTimeout(r, 400));
    if (S.state !== 'play') break;
  }
  return out;
});
console.log('max visual jump (px) at each early turn:', r);
await b.close();
