const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:420,height:820}});
  const sv=require('fs').readFileSync('save_end.json','utf8');
  await p.addInitScript(s=>{ try{ if(!localStorage.getItem('__seeded')){ localStorage.setItem('homehaven3d_save',s); localStorage.setItem('__seeded','1'); } }catch(e){} }, sv);
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file://'+process.cwd()+'/v2/game4.html'); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  await p.evaluate(()=>{ document.getElementById('navBuild').click(); }); await p.waitForTimeout(1200);
  const N=()=>p.evaluate(()=>({n:__game.S.layout.length,coins:__game.S.coins,inv:Object.values(__game.S.inv).reduce((a,b)=>a+b,0)}));
  const drag=async(x0,z0,x1,z1)=>{ const a=await p.evaluate(([x,z])=>WORLD.toScreen(x,z,0),[x0,z0]), c=await p.evaluate(([x,z])=>WORLD.toScreen(x,z,0),[x1,z1]); await p.mouse.move(a[0],a[1]); await p.mouse.down(); for(let i=1;i<=14;i++){await p.mouse.move(a[0]+(c[0]-a[0])*i/14,a[1]+(c[1]-a[1])*i/14);await p.waitForTimeout(50);} await p.mouse.up(); await p.waitForTimeout(400); };
  const n0=await N(); console.log('start',n0);
  await p.evaluate(()=>{ document.querySelectorAll('.sg')[0].click(); [...document.querySelectorAll('.tab')][0].click(); document.querySelectorAll('#items .it')[3].click(); }); await p.waitForTimeout(300);
  await drag(0.5,0.5,2.5,2.5);
  await p.evaluate(()=>document.getElementById('rbOk').click()); await p.waitForTimeout(1000);
  const n1=await N(); console.log('built',n1);
  await p.evaluate(()=>document.getElementById('reAuto').click()); await p.waitForTimeout(400); console.log('auto',await N());
  await p.evaluate(()=>__game.undoBuild()); await p.waitForTimeout(300); console.log('undo1 (openings)',await N());
  await p.evaluate(()=>__game.undoBuild()); await p.waitForTimeout(500); const n2=await N(); console.log('undo2 (room)',n2, n2.n===n0.n&&n2.coins===n0.coins?'RESTORED':'MISMATCH');
  // advanced mode: locked before story done
  await p.evaluate(()=>document.getElementById('reNew')&&document.getElementById('reNew').click()); await p.waitForTimeout(500);
  await p.evaluate(()=>{ document.querySelector('.mg[data-m=adv]').click(); }); await p.waitForTimeout(300);
  console.log('adv attempt (story unfinished):', await p.evaluate(()=>({toast:(document.getElementById('toast')||{}).textContent, adv:__game.S.adv, tabs:[...document.querySelectorAll('.tab')].map(t=>t.textContent.trim())})));
  await p.evaluate(()=>{ __game.S.chapter=7; __game.S.storyDone=true; __game.save(); document.querySelector('.mg[data-m=adv]').click(); }); await p.waitForTimeout(500);
  console.log('adv (Dream Home):', await p.evaluate(()=>({adv:__game.S.adv, rm:WORLD.roomMode, tabs:[...document.querySelectorAll('.tab')].map(t=>t.textContent.trim())})));
  await p.screenshot({path:'r6_adv.png'});
  // advanced: place individual floor tiles by tap, drag-paint a path
  console.log('tabs',await p.evaluate(()=>[...document.querySelectorAll('.tab')].map(t=>t.textContent.trim()).join('|')));
  await p.evaluate(()=>{ [...document.querySelectorAll('.tab')].find(t=>/Floor|Build/.test(t.textContent)).click(); }); await p.waitForTimeout(300);
  console.log('adv items',await p.evaluate(()=>[...document.querySelectorAll('#items .it')].map(i=>i.textContent.trim().slice(0,14)).slice(0,10)));
  await p.evaluate(()=>{ __game.S.inv.floor_wood=(__game.S.inv.floor_wood||0)+10; }); 
  await p.evaluate(()=>{ const it=[...document.querySelectorAll('#items .it')].find(i=>/Wood Floor|Wood floor/.test(i.textContent)); it&&it.click(); }); await p.waitForTimeout(300);
  const f0=await p.evaluate(()=>__game.S.layout.filter(o=>o.part==='floor_wood').length);
  await drag(9.5,0.5,9.5,3.5);
  console.log('adv drag-paint floor tiles +', (await p.evaluate(()=>__game.S.layout.filter(o=>o.part==='floor_wood').length))-f0);
  // path stones drag 4 cells
  await p.evaluate(()=>{ [...document.querySelectorAll('.tab')].find(t=>/Garden/.test(t.textContent)).click(); __game.S.inv.path_stone=(__game.S.inv.path_stone||0)+8; }); await p.waitForTimeout(300);
  await p.evaluate(()=>{ [...document.querySelectorAll('#items .it')].find(i=>/Path/.test(i.textContent)).click(); }); await p.waitForTimeout(300);
  const s0=await p.evaluate(()=>__game.S.layout.filter(o=>o.part==='path_stone').length);
  await drag(11.5,7.5,11.5,10.5);
  console.log('path drag stones +', (await p.evaluate(()=>__game.S.layout.filter(o=>o.part==='path_stone').length))-s0);
  await b.close();
})();
