import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 480, height: 800 } });
await p.goto('file://' + process.cwd() + '/test.html?unlock=1'); await p.waitForTimeout(900);
for (const lvl of [1, 63]) {
await p.evaluate((l) => { __snake.camp.start(l); }, lvl); await p.waitForFunction(() => __snake.camp.C.ready === 0);
const r = await p.evaluate(async () => {
  const S = __snake; let turns = 0, last = null, maxJump = 0, lastT = 0, worstFrame = 0; const lat = [], jumps = [];
  const t0 = performance.now(); let nextTurn = t0 + 500, pending = null;
  while (performance.now() - t0 < 5000 && S.state === 'play') {
    const t = await new Promise((r) => requestAnimationFrame(r));
    const h = S.pts()[0];
    if (last) { const j = Math.hypot(h.x - last.x, h.y - last.y); const dt = t - lastT; worstFrame = Math.max(worstFrame, dt); if (dt < 25) maxJump = Math.max(maxJump, j); }
    last = h; lastT = t;
    if (pending) { if (S.G.dir.join() !== pending.d0) { lat.push(Math.round(t - pending.t)); pending = null; } else if (t - pending.t > 700) pending = null; }
    if (!pending && t > nextTurn) { const d = S.G.dir; if (S.turn(d[0] ? [0, 1] : [1, 0])) { turns++; pending = { t, d0: S.G.dir.join() }; } nextTurn = t + 450; }
  }
  return { turns, maxPxPerFrame: Math.round(maxJump * 10) / 10, normalPx: Math.round(22 / S.camp.C.L.d * 16.7 * 10) / 10, turnLatencyMs: lat.slice(0, 8), worstFrameMs: Math.round(worstFrame) };
});
console.log('level', lvl, JSON.stringify(r)); }
await b.close();
