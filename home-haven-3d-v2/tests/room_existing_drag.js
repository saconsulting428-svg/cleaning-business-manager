const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:360,height:800},hasTouch:false});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.save(); S=0; });
  await p.evaluate(()=>{ document.getElementById('navBuild').click(); }); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ const t=document.getElementById('tutSkip'); t&&t.click(); });
  const drag=async(x0,z0,x1,z1)=>{ const a=await p.evaluate(([x,z])=>WORLD.toScreen(x,z,0),[x0,z0]), c=await p.evaluate(([x,z])=>WORLD.toScreen(x,z,0),[x1,z1]); await p.mouse.move(a[0],a[1]); await p.mouse.down(); for(let i=1;i<=12;i++){await p.mouse.move(a[0]+(c[0]-a[0])*i/12,a[1]+(c[1]-a[1])*i/12);await p.waitForTimeout(40);} await p.mouse.up(); await p.waitForTimeout(500); };
  const st=()=>p.evaluate(()=>({edit:document.getElementById('build').classList.contains('roomedit'),bar:!document.getElementById('roomBar').classList.contains('hidden'),sel:!document.getElementById('selBar').classList.contains('hidden'),floors:__game.S.layout.filter(o=>SPRITES.parts[o.part].kind==='floor').length}));
  await p.evaluate(()=>document.querySelectorAll('#items .it')[0].click()); await p.waitForTimeout(300);
  await drag(3.5,3.5,6.5,6.5); await p.evaluate(()=>document.getElementById('rbOk').click()); await p.waitForTimeout(1500);
  console.log('built',await st());
  await p.evaluate(()=>document.getElementById('reNew').click()); await p.waitForTimeout(1500);
  await p.evaluate(()=>document.querySelectorAll('#items .it')[1].click()); await p.waitForTimeout(300);
  await drag(4.5,4.5,5.5,5.5);   // start ON the existing room
  console.log('drag from existing room',await st());
  await p.screenshot({path:'r8a.png'});
  { const a=await p.evaluate(()=>WORLD.toScreen(4.5,4.5,0)); await p.mouse.click(a[0],a[1]); await p.waitForTimeout(800); console.log('tap on built room',await st()); }
  await p.evaluate(()=>document.getElementById('reNew').click()); await p.waitForTimeout(1500);
  await p.evaluate(()=>document.querySelectorAll('#items .it')[1].click()); await p.waitForTimeout(300);
  await drag(7.5,3.5,9.5,6.5); console.log('drag on free land',await st()); await p.screenshot({path:'r8b.png'});
  await b.close();
})();
