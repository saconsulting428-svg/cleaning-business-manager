const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:800,height:400}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.S.coins=3000; __game.save(); });
  await p.evaluate(()=>{ document.getElementById('navBuild').click(); }); await p.waitForTimeout(2000);
  await p.screenshot({path:'l_tut.png'}); await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.click();});
  await p.waitForTimeout(600); await p.screenshot({path:'l_ghost.png'});
  const click=(id)=>p.evaluate(i=>document.getElementById(i).click(),id);
  await click('rbOk'); await p.waitForTimeout(2500); await click('gdGo'); await p.waitForTimeout(1500); await p.screenshot({path:'l_guide.png'});
  // advanced
  await p.evaluate(()=>{ __game.S.chapter=7; __game.S.storyDone=true; __game.save(); });
  await click('reNew'); await p.waitForTimeout(800);
  await p.evaluate(()=>document.querySelector('.mg[data-m=adv]').click()); await p.waitForTimeout(600);
  console.log(await p.evaluate(()=>({adv:__game.S.adv,tabs:[...document.querySelectorAll('.tab')].map(t=>t.textContent.trim()).join('|'),roomMode:WORLD.roomMode,drag:WORLD.roomDrag,bar:!document.getElementById('roomBar').classList.contains('hidden')})));
  await p.evaluate(()=>{ [...document.querySelectorAll('.tab')].find(t=>/Rooms/.test(t.textContent)).click(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>document.querySelectorAll('#items .it')[1].click()); await p.waitForTimeout(300);
  const a=await p.evaluate(()=>WORLD.toScreen(0.5,0.5,0)), c=await p.evaluate(()=>WORLD.toScreen(4.5,2.5,0));
  await p.mouse.move(a[0],a[1]); await p.mouse.down(); for(let i=1;i<=12;i++){await p.mouse.move(a[0]+(c[0]-a[0])*i/12,a[1]+(c[1]-a[1])*i/12);await p.waitForTimeout(40);} await p.mouse.up(); await p.waitForTimeout(600);
  console.log('adv drag preview:',await p.textContent('#rInfo')); await p.screenshot({path:'l_adv.png'});
  await click('rbOk'); await p.waitForTimeout(2000); console.log('adv built', await p.evaluate(()=>({edit:document.getElementById('build').className, floors:__game.S.layout.filter(o=>SPRITES.parts[o.part].kind==='floor').length})));
  await b.close();
})();
