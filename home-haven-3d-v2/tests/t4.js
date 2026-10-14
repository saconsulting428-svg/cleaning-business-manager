const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:+process.argv[3]||900,height:+process.argv[4]||600}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,400))});
  await p.goto('file://'+process.cwd()+'/v2/test.html'); await p.waitForFunction('window.READY',null,{timeout:30000});
  const js = require('fs').readFileSync(process.argv[2],'utf8');
  await p.evaluate(js); await p.waitForTimeout(+process.argv[6]||3000);
  await p.screenshot({path:process.argv[5]||'v2_out.png'});
  await b.close();
})();
