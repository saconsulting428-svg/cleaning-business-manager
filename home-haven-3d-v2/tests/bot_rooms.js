const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:360,height:800}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)});
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  const log=(k,v)=>console.log(k, typeof v==='string'?v:JSON.stringify(v));
  const S=()=>p.evaluate(()=>{ const L=__game.S.layout,P=SPRITES.parts; return {floors:L.filter(o=>P[o.part].kind==='floor'&&o.part!=='path_stone').length, walls:L.filter(o=>P[o.part].kind==='wall'&&P[o.part].cat!=='garden').length, openings:L.filter(o=>P[o.part].cat==='openings').length, items:L.filter(o=>P[o.part].kind==='item').length, roofs:L.filter(o=>P[o.part].kind==='roof').length, coins:__game.S.coins, ch:__game.S.chapter}; });
  const clickId=async(id)=>{ await p.evaluate((i)=>document.getElementById(i).click(),id); };
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.save(); });
  const dismiss=async()=>{ await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal()); };
  async function openBuild(){ if(!(await p.$('#build.on'))){ await p.evaluate(()=>document.getElementById('navBuild').click()); await p.waitForTimeout(1500); await dismiss(); } await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.offsetParent&&t.click();}); }
  async function toRooms(){ await openBuild(); if(await p.$('#build.roomedit')){ await clickId('reNew'); await p.waitForTimeout(800);} await p.evaluate(()=>{ [...document.querySelectorAll('.tab')][0].click(); }); await p.waitForTimeout(300); }
  async function placeRoom(idx,lvl=0){ await toRooms(); await p.evaluate((l)=>document.querySelectorAll('.sg')[l].click(),lvl); await p.waitForTimeout(500); await p.evaluate((i)=>document.querySelectorAll('#items .it')[i].click(),idx); await p.waitForTimeout(700);
    const info=await p.textContent('#rInfo'); const dis=await p.$eval('#rbOk',e=>e.disabled); if(dis) return 'BLOCKED '+info; await clickId('rbOk'); await p.waitForTimeout(1500); return info.replace(/\s+/g,' ')+' [built]'; }
  async function guide(max=4){ const out=[]; for(let i=0;i<max;i++){ const t=await p.evaluate(()=>{const g=document.getElementById('gdGo'); return g.offsetParent? g.textContent:null;}); if(!t||/Complete|Next room/.test(t)) break; out.push(t.trim()); await clickId('gdGo'); await p.waitForTimeout(1300);} return out.join(' > '); }
  async function complete(){ const before=await p.evaluate(()=>__game.S.chapter); await p.evaluate(()=>{ const g=document.getElementById('gdDone'), go=document.getElementById('gdGo'); if(g&&!g.classList.contains('hidden')) g.click(); else if(/Complete/.test(go.textContent)) go.click(); else __game.completeChapter(); }); await p.waitForTimeout(1200); await dismiss(); await p.waitForTimeout(1500); await dismiss(); await p.waitForTimeout(500); await dismiss(); return before+' -> '+await p.evaluate(()=>__game.S.chapter); }
  const quests=()=>p.evaluate(()=>__game.questProgress().map(x=>x.q.text+' '+x.have+'/'+x.q.n));
  // ch1
  log('ch1 living', await placeRoom(0)); log('  guide', await guide(1)); log('  state', await S()); log('  complete', await complete());
  // ch2: kitchen next to the living room, both furnished with doors and windows
  log('ch2 kitchen', await placeRoom(1)); log('  guide', await guide()); 
  await p.evaluate(()=>{ const r=GAME_DATA.detectRooms(__game.S.layout).find(r=>r.name==='Living Room'); __game.enterRoomEdit(r); }); await p.waitForTimeout(900);
  log('  living guide', await guide()); log('  state', await S()); log('  quests', await quests()); log('  complete', await complete());
  await p.evaluate(()=>{ __game.S.coins+=400; }); // ~4 puzzle wins of coins
  // ch3: stairs hall on the ground floor, bedroom and bathroom upstairs
  await toRooms(); await p.evaluate(()=>document.querySelectorAll('#items .it')[6].click()); await p.waitForTimeout(1200); log('ch3 stairs', await S());
  log('ch3 bedroom F2', await placeRoom(2,1)); log('  guide', await guide()); log('ch3 bath F2', await placeRoom(3,1)); log('  guide', await guide()); log('  state', await S()); log('  quests', await quests()); log('  complete', await complete());
  // ch4: roof through the UI
  await toRooms(); await p.evaluate(()=>document.querySelectorAll('.sg')[0].click()); await p.evaluate(()=>{ [...document.querySelectorAll('.tab')].find(t=>/Roof/.test(t.textContent)).click(); }); await p.waitForTimeout(400);
  await p.evaluate(()=>document.querySelectorAll('#items .it')[0].click()); await p.waitForTimeout(600); await p.evaluate(()=>{ document.querySelectorAll('#mbox .btn')[0].click(); }); await p.waitForTimeout(1500); log('ch4 roof', await S());
  await p.screenshot({path:'b3_roof.png'});
  log('  quests', await quests());
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
