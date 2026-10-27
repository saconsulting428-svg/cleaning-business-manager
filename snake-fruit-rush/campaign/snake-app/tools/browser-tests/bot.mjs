import { createRequire } from 'module';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const PAGE_URL = new URL('../../www/index.html', import.meta.url).href;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 450, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
await page.goto(PAGE_URL);
await page.waitForFunction(() => window.__sfr && window.__sfr.art && window.__sfr.art.ready, null, { timeout: 8000 });
const res = await page.evaluate(() => {
  const S = __sfr, P = S.play, E = S.engine, out = [];
  const M = { U: E.DIRS.up, D: E.DIRS.down, L: E.DIRS.left, R: E.DIRS.right };
  for (const lv of S.LEVELS) {
    // fresh save each time so first-clear rewards are measured
    S.save.resetCampaign(); S.save.data.coins = 0;
    P.start(lv.id);
    let now = 5000, last = -1, guard = 0, issued = 0, lastWait = false;
    while (P.mode !== 'done' && guard++ < 40000) {
      const mv = P.st.moves;
      if (mv !== last || (P.waiting && !lastWait)) {
        last = mv;
        const ch = lv.solution[mv];
        if (ch && ch !== '.' && M[ch]) { const d = M[ch]; if (!E.sameDir(d, P.st.dir)) { if (P.turn(d)) issued++; } }
      }
      lastWait = P.waiting;
      P.update(16, now); now += 16;
    }
    out.push({ id: lv.id, won: !!P.result, stars: P.result ? P.result.stars : 0, moves: P.st.moves, reason: P.failInfo && P.failInfo.reason, coins: P.result && P.result.coins, ms: Math.round(P.attemptMs), tick: lv.tickMs });
  }
  return out;
});
const lost = res.filter((r) => !r.won), notThree = res.filter((r) => r.won && r.stars < 3);
console.log('levels played by bot (real-time loop):', res.length, 'won', res.length - lost.length);
console.log('LOST:', lost.map((r) => r.id + '(' + r.reason + ')').join(' ') || 'none');
console.log('won but < 3 stars:', notThree.map((r) => r.id + '(' + r.stars + ')').join(' ') || 'none');
console.log('avg attempt time s', (res.reduce((a, r) => a + r.ms, 0) / res.length / 1000).toFixed(1), 'max', Math.max(...res.map((r) => r.ms)) / 1000);
console.log(errors.join('\n') || 'no errors');
await browser.close();
