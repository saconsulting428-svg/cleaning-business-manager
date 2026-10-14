const { chromium } = require('playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const state = require('fs').readFileSync('state_end.json','utf8');
  const [w,h]=(process.argv[3]||'800x400').split('x').map(Number);
  const p = await b.newPage({viewport:{width:w,height:h}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)}); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  await p.addInitScript((st)=>{ if(!localStorage.getItem('homehaven3d_save')) localStorage.setItem('homehaven3d_save', st); }, state);
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1500); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.evaluate(()=>window.closeModal());
  await p.click('#navBuild'); await p.waitForTimeout(2500);
  // pick the Garden tab then first item
  await p.evaluate(()=>{ [...document.querySelectorAll('.tab')].find(t=>/Garden/.test(t.textContent)).click(); }); await p.waitForTimeout(300);
  await p.evaluate(()=>{ __game.S.inv.tree=3; document.querySelectorAll('.it')[0].click(); });
  await p.waitForTimeout(300);
  const pt = await p.evaluate(()=>WORLD.toScreen(1.5,3.5,0)); await p.mouse.click(pt[0],pt[1]); await p.waitForTimeout(1500);
  await p.screenshot({path:'g14_ghost.png'});
  await p.click('#gOk'); await p.waitForTimeout(800);
  // select a placed part: tap on bench location
  const sel = await p.evaluate(()=>{ const o=__game.S.layout.find(o=>o.part==='bench'); return WORLD.toScreen(o.x+1,o.z+.5,.4); });
  await p.evaluate(()=>WORLD.cancelPlace()); await p.mouse.click(sel[0],sel[1]); await p.waitForTimeout(1200);
  await p.click('#sPaint').catch(()=>{}); await p.waitForTimeout(500);
  await p.screenshot({path:'g14_sel.png'});
  console.log('selected', await p.evaluate(()=>WORLD.selected&&WORLD.selected.part));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
