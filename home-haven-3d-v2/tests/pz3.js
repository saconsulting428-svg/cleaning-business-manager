const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:420,height:820}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(800); if (await p.$('#dialog:not(.hidden)')) await p.click('#dlSkip'); await p.waitForTimeout(300); if (await p.$('#modal:not(.hidden)')) await p.click('#mbox .btn.secondary,#mbox .xbtn');
  for (const lv of [1,8,30]) { await p.evaluate((lv)=>{ __game.S.hearts=5; __game.S.boosters={hint:9,undo:9}; __game.playType('bolt',lv); },lv); await p.waitForTimeout(1200);
    const g0 = await p.textContent('#ptGoal'); await p.click('#bHint'); await p.waitForTimeout(800); await p.click('#bUndo'); await p.waitForTimeout(600);
    console.log('bolt lv',lv,'goal',g0,'moves after hint+undo',await p.textContent('#ptVal'));
    await p.evaluate(()=>{ __game.S.playing=null; window.PUZ&&PUZ.end(); GAME.scene.stop('Puzzle'); document.getElementById('app').classList.remove('puzzle'); document.querySelectorAll('.layer').forEach(l=>l.classList.remove('on')); document.getElementById('home').classList.add('on'); WORLD.start(); }); }
  await b.close();
})();
