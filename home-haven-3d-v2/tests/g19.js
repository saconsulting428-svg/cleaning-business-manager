const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:800,height:400}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]);
  await p.waitForTimeout(1500); await p.screenshot({path:'g19_loading.png'});
  await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1500); await p.screenshot({path:'g19_dialog.png'});
  await p.click('#dlSkip'); await p.waitForTimeout(800); await p.screenshot({path:'g19_sheet.png'});
  // tap Ben
  await p.click('#mbox .btn.secondary'); await p.waitForTimeout(1500);
  const pt = await p.evaluate(()=>{ const c=WORLD.chars[0]; return WORLD.toScreen(c.x,c.z,.8); }); await p.mouse.click(pt[0],pt[1]); await p.waitForTimeout(600); await p.screenshot({path:'g19_ben.png'});
  await b.close();
})();
