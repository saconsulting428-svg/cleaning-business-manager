const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const [w,h]=(process.argv[2]||'360x800').split('x').map(Number), tag=process.argv[3]||'p';
  const p = await b.newPage({viewport:{width:w,height:h}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,200)); });
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.save(); });
  await p.evaluate(()=>{ document.getElementById('navBuild').click(); }); await p.waitForTimeout(2500);
  const st=()=>p.evaluate(()=>({edit:document.getElementById('build').className, bar:!document.getElementById('roomBar').classList.contains('hidden'), info:document.getElementById('rInfo').textContent, guide:!document.getElementById('guide').classList.contains('hidden')&&document.getElementById('gdGo').textContent, txt:document.getElementById('gdTxt').textContent, tut:!document.getElementById('tut').classList.contains('hidden')&&document.getElementById('tutT').textContent, floors:__game.S.layout.filter(o=>SPRITES.parts[o.part].kind==='floor').length, walls:__game.S.layout.filter(o=>SPRITES.parts[o.part].kind==='wall').length, items:__game.S.layout.filter(o=>SPRITES.parts[o.part].kind==='item').length, openings:__game.S.layout.filter(o=>SPRITES.parts[o.part].cat==='openings').length}));
  const shot=async(n)=>p.screenshot({path:`s_${tag}_${n}.png`});
  console.log('0 start',await st()); await shot('0');
  await p.click('#tutNext'); await p.waitForTimeout(800); console.log('tut2',(await st()).tut); await shot('1');
  await p.click('#tutNext'); await p.waitForTimeout(500); await p.click('#tutSkip').catch(()=>{});
  await p.evaluate(()=>document.querySelectorAll('#items .it')[0].click()); await p.waitForTimeout(800);
  console.log('ghost living',await st()); await shot('2');
  // tap another spot to move ghost
  const pt=await p.evaluate(()=>WORLD.toScreen(2.5,9.5,0)); await p.mouse.click(pt[0],pt[1]); await p.waitForTimeout(600); console.log('moved ghost',(await st()).info);
  await p.click('#rbNext'); await p.waitForTimeout(400);
  // tap on the ghost to build
  const r=await p.evaluate(()=>{ return null; });
  await p.evaluate(()=>document.getElementById('rbNext').click()); await p.waitForTimeout(300);
  await shot('3');
  await p.click('#rbOk'); await p.waitForTimeout(700); await shot('4'); await p.waitForTimeout(3500); console.log('built',await st()); await shot('5');
  await p.evaluate(()=>{__game.S.coins=2000;});
  for(let i=0;i<4;i++){ await p.evaluate(()=>document.getElementById('gdGo').click()); await p.waitForTimeout(1500); console.log('step',i,await st()); await shot('6'+i); }
  await b.close();
})();
