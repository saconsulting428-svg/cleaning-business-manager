const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const [w,h]=(process.argv[3]||'420x820').split('x').map(Number);
  const p = await b.newPage({viewport:{width:w,height:h}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)}); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); if (await p.$('#dialog:not(.hidden)')) await p.click('#dlSkip'); await p.waitForTimeout(300);
  await p.click('#mbox .btn.primary'); await p.waitForTimeout(3500);   // Start building
  const sh=async(n,t=800)=>{ await p.waitForTimeout(t); await p.screenshot({path:`r1_${n}.png`}); };
  await sh('tut1',1500);
  const cell=(x,z)=>p.evaluate(([x,z])=>WORLD.toScreen(x,z,0),[x,z]);
  // step 1: click a room card
  await p.click('#items .it:nth-child(2)'); await sh('tut2',900);   // Kitchen
  // step 2: real drag on canvas from cell (1,8) to (4,10) -> 4x3
  const a=await cell(1.5,8.5), c=await cell(4.5,10.5);
  await p.mouse.move(a[0],a[1]); await p.mouse.down(); for(let i=1;i<=8;i++){ await p.mouse.move(a[0]+(c[0]-a[0])*i/8, a[1]+(c[1]-a[1])*i/8); await p.waitForTimeout(40);} await p.mouse.up();
  await sh('tut3',900);
  console.log('plan', await p.textContent('#rInfo'));
  await p.click('#rbOk'); await sh('built',3000);
  console.log('layout', await p.evaluate(()=>{ const L=__game.S.layout; return {floors:L.filter(o=>SPRITES.parts[o.part].kind==='floor').length, walls:L.filter(o=>SPRITES.parts[o.part].kind==='wall').length, coins:__game.S.coins, inv:__game.S.inv}; }));
  console.log('roomedit', await p.evaluate(()=>document.getElementById('build').classList.contains('roomedit')+' '+document.getElementById('reName').textContent));
  console.log('ERRORS',JSON.stringify(errs)); await b.close();
})();
