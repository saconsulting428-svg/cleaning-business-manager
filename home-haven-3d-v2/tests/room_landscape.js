const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const [w,h]=(process.argv[2]||'800x400').split('x').map(Number), tag=process.argv[3]||'ls';
  const p = await b.newPage({viewport:{width:w,height:h}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file://'+process.cwd()+'/v2/game4.html'); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.save(); });
  await p.evaluate(()=>{ document.getElementById('navBuild').click(); }); await p.waitForTimeout(2500);
  for(let s=1;s<=4;s++){ await p.screenshot({path:`t_${tag}_${s}.png`}); const nx=await p.$('#tutNext'); if(!nx||!(await nx.isVisible())) break; await nx.click({force:true}).catch(()=>{}); await p.waitForTimeout(900); }
  await p.evaluate(()=>{ const t=document.getElementById('tutSkip'); t&&t.click(); }); await p.waitForTimeout(500);
  await p.evaluate(()=>{ document.querySelectorAll('#items .it')[0].click(); }); await p.waitForTimeout(500);
  const a=await p.evaluate(()=>WORLD.toScreen(3.5,3.5,0)), c=await p.evaluate(()=>WORLD.toScreen(7.5,6.5,0));
  await p.mouse.move(a[0],a[1]); await p.mouse.down(); for(let i=1;i<=10;i++){await p.mouse.move(a[0]+(c[0]-a[0])*i/10,a[1]+(c[1]-a[1])*i/10);await p.waitForTimeout(40);} await p.mouse.up(); await p.waitForTimeout(1500);
  await p.screenshot({path:`rm_${tag}_preview.png`});
  await p.evaluate(()=>document.getElementById('rbOk').click()); await p.waitForTimeout(6000);
  await p.screenshot({path:`rm_${tag}_built.png`});
  await b.close();
})();
