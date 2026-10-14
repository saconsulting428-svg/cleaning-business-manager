const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:420,height:820}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(800); if (await p.$('#dialog:not(.hidden)')) await p.click('#dlSkip'); await p.waitForTimeout(300);
  if (await p.$('#modal:not(.hidden)')) await p.click('#mbox .btn.primary,#mbox .xbtn');
  for (const t of ['pipe','wire','tile','paint','brick','bolt','fuse']) {
    await p.evaluate(({t})=>{ const G=__game; G.S.hearts=5; G.S.boosters={hint:5,undo:5}; G.playType(t,8); },{t});
    await p.waitForTimeout(1200);
    const before = await p.evaluate(()=>JSON.stringify({h:__game.S.boosters.hint,u:__game.S.boosters.undo,mv:document.getElementById('ptVal').textContent}));
    await p.click('#bHint'); await p.waitForTimeout(700);
    const afterHint = await p.evaluate(()=>JSON.stringify({h:__game.S.boosters.hint,mv:document.getElementById('ptVal').textContent,toast:[...document.querySelectorAll('.toast')].map(x=>x.textContent)}));
    await p.click('#bUndo'); await p.waitForTimeout(600);
    const afterUndo = await p.evaluate(()=>JSON.stringify({u:__game.S.boosters.undo,mv:document.getElementById('ptVal').textContent,toast:[...document.querySelectorAll('.toast')].map(x=>x.textContent)}));
    console.log(t,'before',before,'hint',afterHint,'undo',afterUndo);
    await p.screenshot({path:`pz2_${t}.png`});
    await p.evaluate(()=>{ __game.S.playing=null; window.PUZ&&PUZ.end(); GAME.scene.stop('Puzzle'); document.getElementById('app').classList.remove('puzzle'); document.querySelectorAll('.layer').forEach(l=>l.classList.remove('on')); document.getElementById('home').classList.add('on'); WORLD.start&&WORLD.start(); });
  }
  await b.close();
})();
