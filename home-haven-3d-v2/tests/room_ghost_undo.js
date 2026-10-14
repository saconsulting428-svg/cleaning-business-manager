const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:360,height:800}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.S.coins=2000; __game.save(); });
  await p.evaluate(()=>{ document.getElementById('navBuild').click(); }); await p.waitForTimeout(1500); await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.click();});
  const N=()=>p.evaluate(()=>({n:__game.S.layout.length,coins:__game.S.coins,inv:Object.values(__game.S.inv).reduce((a,b)=>a+b,0)}));
  const click=(id)=>p.evaluate(i=>document.getElementById(i).click(),id);
  const n0=await N(); console.log('start',n0);
  // tap on an empty spot moves the ghost there; tapping the ghost builds it
  const g0=await p.evaluate(()=>JSON.stringify(window.__game.S.layout.length));
  const pt=await p.evaluate(()=>WORLD.toScreen(2.5,9.5,0)); await p.mouse.click(pt[0],pt[1]); await p.waitForTimeout(600);
  const gh=await p.evaluate(()=>document.getElementById('rInfo').textContent); console.log('ghost after tap:',gh);
  await p.mouse.click(pt[0],pt[1]); await p.waitForTimeout(2500); console.log('built by tapping the ghost',await N(), await p.evaluate(()=>document.getElementById('build').className));
  await click('gdGo'); await p.waitForTimeout(1200); console.log('door',await N());
  await p.evaluate(()=>__game.undoBuild()); await p.waitForTimeout(300); console.log('undo door',await N());
  await p.evaluate(()=>__game.undoBuild()); await p.waitForTimeout(600); const n2=await N(); console.log('undo room',n2, n2.n===n0.n&&n2.coins===n0.coins?'RESTORED':'MISMATCH', await p.evaluate(()=>document.getElementById('build').className));
  await b.close();
})();
