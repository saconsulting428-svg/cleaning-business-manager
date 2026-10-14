const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const [w,h]=(process.argv[3]||'420x820').split('x').map(Number);
  const p = await b.newPage({viewport:{width:w,height:h}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)}); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(800); if (await p.$('#dialog:not(.hidden)')) await p.click('#dlSkip'); await p.waitForTimeout(300);
  if (await p.$('#modal:not(.hidden)')) await p.click('#mbox .btn.secondary,#mbox .xbtn');
  // helper installed in page
  await p.evaluate(()=>{
    window.skipDialogs = async()=>{ for(let i=0;i<20;i++){ const d=document.getElementById('dialog'); if(d && !d.classList.contains('hidden')){ document.getElementById('dlSkip').click(); await new Promise(r=>setTimeout(r,200)); } else break; } };
    window.closeModal = async()=>{ const m=document.getElementById('modal'); if(m && !m.classList.contains('hidden')){ const b=m.querySelector('.btn.primary,.btn.secondary,.xbtn'); b&&b.click(); await new Promise(r=>setTimeout(r,250)); } };
    const E=[[0,-.5],[.5,0],[0,.5],[-.5,0]];
    window.place=(part,x,z,rot=0,lvl=0)=>{
      const S=__game.S, P=SPRITES.parts[part]; if(!(S.inv[part]>0)) S.inv[part]=(S.inv[part]||0)+1; // test shortcut: ensure stock
      WORLD.setMode('build'); WORLD.setLevel(lvl); WORLD.startPlace(part); WORLD.place.rot=rot; WORLD.pendingRot=rot;
      let sx,sz,h=lvl*WORLD.H+(P.kind==='roof'?WORLD.H:0);
      if(P.kind==='wall'){ const e=E[rot]; sx=x+.5+e[0]*.8; sz=z+.5+e[1]*.8; }
      else { const [fw,fd]=WORLD.footprint(part,rot); sx=x+fw/2; sz=z+fd/2; }
      const pt=WORLD.toScreen(sx,sz,h); const before=S.layout.length;
      WORLD.tap(pt[0],pt[1]); if (P.kind==='item' && WORLD.ghostCand) WORLD.tap(pt[0],pt[1]); // second tap confirms items
      return S.layout.length>before;
    };
  });
  const plan = require('fs').readFileSync(process.argv[4]||'plan.json','utf8'); const P=JSON.parse(plan);
  const results={};
  for (const stage of P) {
    let ok=0, bad=[]; if (stage.before) await p.evaluate(stage.before);
    const res = await p.evaluate((ops)=>{ const bad=[]; let ok=0; for(const op of ops){ const r=window.place(...op); if(r) ok++; else bad.push(op.join(':')); } return {ok,bad}; }, stage.ops);
    console.log(stage.name, 'placed', res.ok, '/', stage.ops.length, res.bad.length? 'FAILED '+res.bad.slice(0,12).join(' '):'');
    await p.evaluate(()=>{ WORLD.cancelPlace(); });
    if (stage.after) await p.evaluate(stage.after);
    const q = await p.evaluate(()=>JSON.stringify(__game.questProgress().map(x=>x.q.text+' '+x.have+'/'+x.q.n)));
    console.log('  quests', q);
    if (stage.complete) { await p.evaluate(()=>{ __game.completeChapter(); }); await p.waitForTimeout(800); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(1800); if (stage.shotModal) await p.screenshot({path:stage.shotModal}); await p.evaluate(()=>window.closeModal()); await p.waitForTimeout(500); await p.evaluate(()=>window.skipDialogs());
      console.log('  chapter now', await p.evaluate(()=>__game.S.chapter)); }
    if (stage.shot) { await p.evaluate(()=>{ WORLD.setMode('view'); WORLD.setNight(false); }); await p.waitForTimeout(7500); await p.screenshot({path:stage.shot}); }
  }
  require('fs').writeFileSync('state_end.json', await p.evaluate(()=>localStorage.getItem('homehaven3d_save')));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
