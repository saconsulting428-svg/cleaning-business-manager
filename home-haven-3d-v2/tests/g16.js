const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const [w,h]=(process.argv[3]||'800x400').split('x').map(Number);
  const p = await b.newPage({viewport:{width:w,height:h}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)});
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); if (await p.$('#dialog:not(.hidden)')) await p.click('#dlSkip'); await p.waitForTimeout(300); if (await p.$('#modal:not(.hidden)')) await p.click('#mbox .btn.secondary,#mbox .xbtn');
  const types=['pipe','wire','tile','paint','brick','bolt','fuse']; const imgs=[];
  for (const t of types) {
    await p.evaluate(({t})=>{ const G=__game; G.S.hearts=5; G.playType(t,6); },{t}); await p.waitForTimeout(1500);
    await p.screenshot({path:`g16_${t}.png`});
    await p.evaluate(()=>{ __game.S.playing=null; window.PUZ&&PUZ.end(); GAME.scene.stop('Puzzle'); document.getElementById('app').classList.remove('puzzle'); document.querySelectorAll('.layer').forEach(l=>l.classList.remove('on')); document.getElementById('home').classList.add('on'); WORLD.start(); });
  }
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
