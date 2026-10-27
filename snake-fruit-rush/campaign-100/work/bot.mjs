import { createRequire } from 'module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
import fs from 'fs';
const file = 'file://' + process.cwd() + '/' + (process.argv[2] || 'test.html');
const routes = JSON.parse(fs.readFileSync('routes.json'));
const levels = JSON.parse(fs.readFileSync('levels.json'));
const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const mul = Number(process.argv[4] || 0.3);
const ids = []; for (let i = 1; i <= 100; i++) if (!only || only.includes(i)) ids.push(i);
const b = await chromium.launch();
const results = [];
async function worker(list) {
  const p = await b.newPage({ viewport: { width: 480, height: 800 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(file + '?unlock=1');
  await p.waitForTimeout(800);
  for (const id of list) {
    const route = routes[id - 1];
    const r = await p.evaluate(({ id, route, mul }) => new Promise((resolve) => {
      window.__speedMul = mul;
      const S = window.__snake;
      S.camp.start(id);
      const pos = new Map(); route.forEach((c, i) => pos.set(c, i));
      const DV = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
      const t0 = Date.now(); let lastMoves = -1, stall = 0;
      const iv = setInterval(() => {
        const st = S.state, C = S.camp.C;
        if (st === 'won' || st === 'over' || Date.now() - t0 > 90000) {
          clearInterval(iv);
          resolve({ id, state: st, over: C && C.over, moves: C && C.moves, stars: C && C.stars, ms: Date.now() - t0 });
          return;
        }
        if (st !== 'play' || !C || C.ready > 0 || C.over || C.won) return;
        const head = C.st.body[0], i = pos.get(head);
        if (i === undefined || i + 1 >= route.length) return;
        const nx = route[i + 1];
        const dx = (nx % 20) - (head % 20), dy = ((nx / 20) | 0) - ((head / 20) | 0);
        if (Math.abs(dx) + Math.abs(dy) !== 1) return;
        const cur = C.st.dir;
        if (cur[0] !== dx || cur[1] !== dy) S.turn([dx, dy]);
      }, 2);
    }), { id, route, mul });
    const un = await p.evaluate(() => window.__snake.DATA.camp.unlocked);
    r.unlocked = un; r.errs = errs.length;
    results.push(r);
  }
  await p.close();
}
const W = 4, chunks = Array.from({ length: W }, () => []);
ids.forEach((id, i) => chunks[i % W].push(id));
await Promise.all(chunks.map(worker));
results.sort((a, c) => a.id - c.id);
const bad = results.filter((r) => r.state !== 'won' || r.stars !== 3 || r.moves !== levels[r.id - 1].par);
console.log('ran', results.length, 'won', results.filter((r) => r.state === 'won').length, 'threeStars', results.filter((r) => r.stars === 3).length);
console.log('problems', JSON.stringify(bad.slice(0, 20)));
console.log('max ms', Math.max(...results.map((r) => r.ms)));
fs.writeFileSync('bot-results.json', JSON.stringify(results));
await b.close();
