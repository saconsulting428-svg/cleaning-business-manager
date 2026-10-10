const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[3];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
  const errs = []; p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2500);
  const setup = async (lv, fn) => { await p.evaluate(([lv, fn]) => { const T = window.HUSH_TEST; T.run(lv, []); T.G.paused = false; if (fn) eval(fn); }, [lv, fn]); await p.waitForTimeout(700); };
  const shot = async (name) => { await p.evaluate(() => { window.HUSH_TEST.G.paused = true; }); await p.waitForTimeout(250); await p.screenshot({ path: out + '/' + name + '.png' }); await p.evaluate(() => { window.HUSH_TEST.G.paused = false; }); };
  await setup(0, null); await shot('L01');
  await setup(4, "const S=T.G.S; S.x=12; T.G.ppx=12; T.G.px=12"); await shot('L05_stalker');
  await setup(11, "const S=T.G.S; S.x=12.5; T.G.ppx=12.5; T.G.px=12.5"); await shot('L12_gen');
  await setup(2, "const S=T.G.S; S.x=16; T.G.ppx=16; T.G.px=16"); await shot('L03_sentinel');
  console.log('errors:', JSON.stringify(errs, null, 1));
  await b.close();
})();
