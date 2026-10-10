const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[3];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2200);
  const ev = (fn) => p.evaluate((fn) => { const T = window.HUSH_TEST; return eval(fn); }, fn);
  const clip = { x: 0, y: 250, width: 390, height: 260 };
  const snap = async (n) => { await ev('T.G.paused=true'); await p.waitForTimeout(120); await p.screenshot({ path: out + '/' + n + '.png', clip }); await ev('T.G.paused=false'); };
  // run cycle
  await ev("T.run(0,[]); T.G.in.kr=true"); for (let i = 0; i < 4; i++) { await p.waitForTimeout(130); await snap('run' + i); }
  await ev("T.G.in.kr=false; T.G.in.crouch=true; T.G.in.kr=true"); for (let i = 0; i < 3; i++) { await p.waitForTimeout(260); await snap('crouch' + i); }
  // use animation
  await ev("T.run(0,[]); T.G.S.x=7.9; T.G.ppx=7.9; T.G.px=7.9; T.G.in.use=true"); for (let i = 0; i < 3; i++) { await p.waitForTimeout(110); await snap('use' + i); }
  // monster stare (notice) frames
  await ev("T.run(2,[]); const S=T.G.S; S.x=17.2; T.G.ppx=17.2; T.G.px=17.2; S.cr[0].x=21.2; S.cr[0].dir=-1; S.crouch=false"); for (let i = 0; i < 3; i++) { await p.waitForTimeout(110); await snap('stare' + i); }
  // monster run (chase level)
  await ev("T.run(9,[]); const S=T.G.S; S.x=14; T.G.ppx=14; T.G.px=14"); for (let i = 0; i < 3; i++) { await p.waitForTimeout(150); await snap('chase' + i); }
  // attack/caught
  await ev("T.run(4,[]); const S=T.G.S; S.x=14; T.G.ppx=14; T.G.px=14; S.cr[0].x=14.5; S.cr[0].st=3; S.cr[0].dir=-1; S.cr[0].tx=14; S.cr[0].f=0"); for (let i = 0; i < 4; i++) { await p.waitForTimeout(190); await snap('attack' + i); }
  console.log('errors', errs); await b.close();
})();
