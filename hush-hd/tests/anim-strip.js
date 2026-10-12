const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 })).newPage();
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2200);
  const shots = await p.evaluate((which) => {
    const T = window.HUSH_TEST; T.G.devUnlock = true; T.G.auto = true; T.loadLevel(which === 'monster' ? 9 : 0, true); T.overlay('tutorial', false); T.G.paused = false; T.G.auto = false;
    const cv = document.getElementById('view'), out = []; const m = T.view.metrics();
    const grab = () => { const t = document.createElement('canvas'); t.width = 200; t.height = 250; const x = t.getContext('2d'); const sx = Math.round(cv.width / 2 - 100); x.drawImage(cv, sx, m.FY - 215, 200, 250, 0, 0, 200, 250); return t.toDataURL('image/png'); };
    if (which === 'monster') { const S = T.G.S; S.x = 3; T.G.ppx = 3; T.G.px = 3; S.cr[0].st = 3; for (let k = 0; k < 6; k++) T.advance(1 / 60); }
    for (let k = 0; k < 24; k++) { T.G.in.kr = which !== 'monster'; T.advance(1 / 60); if (which !== 'monster' ? (k >= 0 && k < 12) : true) out.push(grab()); }
    if (which !== 'monster') { T.G.in.kr = false; for (let k = 0; k < 10; k++) { T.advance(1 / 60); if (k > 0) out.push(grab()); } }
    return out;
  }, process.argv[4] || 'survivor');
  fs.writeFileSync(process.argv[3] + '.json', JSON.stringify(shots)); await b.close();
})();
