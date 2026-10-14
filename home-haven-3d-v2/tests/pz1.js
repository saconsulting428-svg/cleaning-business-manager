const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:420,height:820}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(800); if (await p.$('#dialog:not(.hidden)')) await p.click('#dlSkip'); await p.waitForTimeout(300);
  if (await p.$('#modal:not(.hidden)')) await p.click('#mbox .btn.primary,#mbox .xbtn');
  const types=['pipe','wire','tile','paint','brick','bolt','fuse'];
  const levels=(process.argv[3]||'1,5,12,25,40').split(',').map(Number);
  for (const t of types) for (const lv of levels) {
    const res = await p.evaluate(async ({t,lv})=>{
      const G=__game; G.S.hearts=5; G.S.boosters={hint:50,undo:50}; G.playType(t,lv);
      await new Promise(r=>setTimeout(r,500));
      const P=PUZ.puzzle; if(!P) return {err:'no puzzle'};
      let wins=0, fails=0; const api = P.api; const ow=api.win, of=api.fail; api.win=(s)=>{wins=s;}; api.fail=(r)=>{fails=r;};
      // also hook goal flows
      let hints=0, bad=0, undoOk=0, undoTot=0;
      // test undo: do 2 hints then undo twice
      for (let i=0;i<3 && !P.done;i++){ const r=P.hint(); if(r===false) {bad++;} else hints++; await new Promise(r=>setTimeout(r,250)); }
      let u1 = P.undo(); await new Promise(r=>setTimeout(r,250));
      let guard=0; while(!P.done && guard++<80){ const r=P.hint(); if(r===false){bad++; break;} hints++; await new Promise(r=>setTimeout(r,300)); }
      await new Promise(r=>setTimeout(r,900));
      return {type:t,lv,hints,bad,undo:u1,done:P.done,wins,fails};
    },{t,lv});
    console.log(JSON.stringify(res));
    await p.evaluate(()=>{ try{ document.querySelector('#modal:not(.hidden) .xbtn') && document.querySelector('#modal:not(.hidden) .xbtn').click(); __game.S.playing=null; window.PUZ && PUZ.end(); GAME.scene.stop('Puzzle'); document.getElementById('app').classList.remove('puzzle'); }catch(e){} });
  }
  await b.close();
})();
