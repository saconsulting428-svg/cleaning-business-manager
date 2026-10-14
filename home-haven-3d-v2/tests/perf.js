const { chromium } = require('playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const state = require('fs').readFileSync('state_end.json','utf8');
  const p = await b.newPage({viewport:{width:420,height:820}});
  await p.addInitScript((st)=>{ if(!localStorage.getItem('homehaven3d_save')) localStorage.setItem('homehaven3d_save', st); }, state);
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(3000);
  console.log(await p.evaluate(()=>{ const r=WORLD._renderer; r.info.autoReset=false; r.info.reset(); return new Promise(res=>setTimeout(()=>{ const i=r.info; res(JSON.stringify({calls:i.render.calls, triangles:i.render.triangles, geometries:i.memory.geometries, textures:i.memory.textures, frames:i.render.frame})); },1000)); }));
  console.log('meshes', await p.evaluate(()=>{ let n=0, sh=0; WORLD._camera.parent; return n; }));
  await b.close();
})();
