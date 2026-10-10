const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[3];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
  const errs = []; p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  await p.goto('file://' + process.argv[2] + '?test=1'); await p.waitForTimeout(2500);
  const ev = (fn) => p.evaluate((fn) => { const T = window.HUSH_TEST; return eval(fn); }, fn);
  const shot = async (name, freeze = true) => { if (freeze) await ev('T.G.paused=true'); await p.waitForTimeout(200); await p.screenshot({ path: out + '/' + name + '.png' }); if (freeze) await ev('T.G.paused=false'); };
  // sonar ping
  await ev('T.run(3,[]); T.G.S.x=6; T.G.ppx=6; T.G.px=6; T.G.in.ping=true'); await p.waitForTimeout(450); await shot('sonar');
  // hide
  await ev('T.run(4,[]); T.G.S.cr[0].x=30; T.G.S.x=4.5; T.G.ppx=4.5; T.G.px=4.5; T.G.in.use=true'); await p.waitForTimeout(500); await shot('hide');
  // stairs (L4, stairs at tile 14)
  await ev('T.run(3,[]); T.G.S.x=14.5; T.G.ppx=14.5; T.G.px=14.5; T.G.in.use=true'); await p.waitForTimeout(220); await shot('stairs_mid'); await p.waitForTimeout(900); await shot('stairs_arrived');
  // vent (L2)
  await ev('T.run(1,[]); const S=T.G.S; S.rev=3; S.x=8.5; T.G.ppx=8.5; T.G.px=8.5; T.G.in.use=true'); await p.waitForTimeout(800); await shot('vent');
  // caught (L3: walk into the sentinel)
  await ev('T.run(2,[]); T.G.S.x=16; T.G.ppx=16; T.G.px=16; T.G.in.kr=true'); await p.waitForTimeout(6200); await shot('caught_state', false);
  await p.waitForTimeout(1200); await p.screenshot({ path: out + '/caught_overlay.png' });
  // attack frame mid-way
  await ev('T.run(2,[]); T.G.S.x=19; T.G.ppx=19; T.G.px=19; T.G.S.cr[0].x=19.9; T.G.S.cr[0].st=3; T.G.S.cr[0].dir=-1'); await p.waitForTimeout(1250); await shot('attack', false);
  // complete overlay
  await ev('T.run(0,[]); const S=T.G.S; S.x=T.G.W.exit.x-0.3; T.G.ppx=S.x; T.G.in.kr=true'); await p.waitForTimeout(1600); await p.screenshot({ path: out + '/complete.png' });
  // pause overlay, menus
  await ev('T.run(0,[]); T.pause(true)'); await p.waitForTimeout(300); await p.screenshot({ path: out + '/pause.png' });
  await ev("T.show('chapters')"); await p.waitForTimeout(500); await p.screenshot({ path: out + '/chapters.png' });
  await ev("T.renderLevels(1)"); await p.waitForTimeout(500); await p.screenshot({ path: out + '/levels.png' });
  await ev("T.show('settings')"); await p.waitForTimeout(500); await p.screenshot({ path: out + '/settings.png' });
  console.log('errors:', JSON.stringify(errs, null, 1));
  await b.close();
})();
