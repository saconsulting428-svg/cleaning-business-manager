const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:360,height:740}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.S.coins=2000; __game.save(); });
  await p.evaluate(()=>{ document.getElementById('navBuild').click(); }); await p.waitForTimeout(1500); await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.click();});
  const click=(id)=>p.evaluate(i=>document.getElementById(i).click(),id);
  const st=()=>p.evaluate(()=>({cls:document.getElementById('build').className,go:document.getElementById('gdGo').offsetParent&&document.getElementById('gdGo').textContent,done:!document.getElementById('gdDone').classList.contains('hidden')&&document.getElementById('gdDone').textContent,sugg:[...document.querySelectorAll('.sugg')].map(e=>e.parentElement.textContent),type:document.querySelector('#items .it.on')&&document.querySelector('#items .it.on').textContent.slice(0,14),modal:!document.getElementById('modal').classList.contains('hidden')&&document.getElementById('mbox').textContent.slice(0,90)}));
  await click('rbOk'); await p.waitForTimeout(2000);
  // leave early -> confirmation
  await click('btnBuildDone'); await p.waitForTimeout(500); console.log('Done early:',await st()); await p.screenshot({path:'f_confirm.png'});
  await p.evaluate(()=>{ const bs=[...document.querySelectorAll('#mbox .btn')]; bs[0].click(); }); await p.waitForTimeout(400);
  for(let i=0;i<3;i++){ await click('gdGo'); await p.waitForTimeout(1300); }
  console.log('room finished:',await st()); await p.screenshot({path:'f_finished.png'});
  await click('gdDone'); await p.waitForTimeout(1500); console.log('after Next room:',await st()); await p.screenshot({path:'f_next.png'});
  // coin shortage -> sheet
  await p.evaluate(()=>{ __game.S.coins=5; __game.S.inv={}; document.querySelectorAll('#items .it')[2].click(); }); await p.waitForTimeout(800); await click('rbOk'); await p.waitForTimeout(600); console.log('no coins:',await st()); await p.screenshot({path:'f_coins.png'});
  await b.close();
})();
