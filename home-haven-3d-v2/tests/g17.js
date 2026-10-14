const { chromium } = require('playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const state = require('fs').readFileSync('state_end.json','utf8');
  const p = await b.newPage({viewport:{width:420,height:820}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)});
  await p.addInitScript((st)=>{ if(!localStorage.getItem('homehaven3d_save')) localStorage.setItem('homehaven3d_save', st); }, state);
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1200); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.evaluate(()=>window.closeModal());
  await p.click('#vNight'); await p.waitForTimeout(7000); await p.screenshot({path:'g17_night.png'});
  await p.click('#vSettings'); await p.waitForTimeout(500); await p.screenshot({path:'g17_settings.png'});
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
