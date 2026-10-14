const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:420,height:820}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  const res = await p.evaluate(()=>{
    const T=__ptest, out={}; const maxL=150;
    for (const name of ['pipeGen','wireGen','tileGen','brickGen','boltGen']) { const bad=[], slow=[]; for (let lv=1; lv<=maxL; lv++) { const t0=performance.now(); let r; try { r=T[name](lv); } catch(e){ r=null; bad.push(lv+':ERR '+e.message); continue; } const dt=performance.now()-t0; if(!r) bad.push(lv); if (dt>400) slow.push(lv+'='+Math.round(dt)+'ms'); } out[name]={bad,slow:slow.slice(0,8)}; }
    return out; });
  console.log(JSON.stringify(res,null,1));
  await b.close();
})();
