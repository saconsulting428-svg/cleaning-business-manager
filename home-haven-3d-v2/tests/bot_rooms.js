const { chromium } = require('/opt/node-tools/node_modules/playwright'); const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:360,height:800}}); p.setDefaultTimeout(120000);
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)});
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:90000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  const log=(k,v)=>console.log(k, typeof v==='string'?v:JSON.stringify(v));
  const S=()=>p.evaluate(()=>{ const L=__game.S.layout,P=SPRITES.parts; return {floors:L.filter(o=>P[o.part].kind==='floor'&&o.part!=='path_stone').length, walls:L.filter(o=>P[o.part].kind==='wall'&&P[o.part].cat!=='garden').length, openings:L.filter(o=>P[o.part].cat==='openings').length, items:L.filter(o=>P[o.part].kind==='item').length, roofs:L.filter(o=>P[o.part].kind==='roof').length, coins:__game.S.coins, ch:__game.S.chapter}; });
  const click=(id)=>p.evaluate(i=>document.getElementById(i).click(),id);
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.save(); });
  const dismiss=async()=>{ await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal()); };
  const modalText=()=>p.evaluate(()=>{ const m=document.getElementById('modal'); return m&&!m.classList.contains('hidden')?document.getElementById('mbox').textContent:''; });
  async function openBuild(){ if(!(await p.$('#build.on'))){ await p.evaluate(()=>document.getElementById('navBuild').click()); await p.waitForTimeout(1500); await dismiss(); } await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.offsetParent&&t.click();}); }
  async function toRooms(){ await openBuild(); if(await p.$('#build.roomedit')){ await click('reNew'); await p.waitForTimeout(800);} await p.evaluate(()=>{ [...document.querySelectorAll('.tab')][0].click(); }); await p.waitForTimeout(300); }
  // drive the Build Home panel until the room is complete (taps via the real site-tap path)
  async function finishPanel(max=30){ for(let i=0;i<max;i++){ const m=await modalText(); if(/ROOM COMPLETE/.test(m)) return 'complete'; if(/coins needed/.test(m)){ await p.evaluate(()=>{__game.S.coins+=400;}); await p.evaluate(()=>window.closeModal()); await p.waitForTimeout(300); }
      const st=await p.evaluate(()=>({t:document.getElementById('bhTitle').textContent, go:document.getElementById('gdGo').textContent, vis:!!document.getElementById('gdGo').offsetParent}));
      if(!st.vis) return 'no panel'; if(/DESIGN/.test(st.t)){ await p.evaluate(()=>{ ['floor:tile','wall:cream','furn:modern'].forEach(s=>{ const [k,v]=s.split(':'); const e=document.querySelector(`.bhopt[data-k=${k}][data-v=${v}]`); e&&e.click(); }); }); await p.waitForTimeout(700); await click('gdGo'); await p.waitForTimeout(900); continue; }
      if(/ROOM COMPLETE/.test(st.t)) return 'derived complete'; await click('gdGo'); await p.waitForTimeout(2200); }
    return 'timeout'; }
  async function buildRoom(idx,lvl=0){ await toRooms(); await p.evaluate((l)=>document.querySelectorAll('.sg')[l].click(),lvl); await p.waitForTimeout(500); await p.evaluate((i)=>document.querySelectorAll('#items .it')[i].click(),idx); await p.waitForTimeout(700);
    const info=(await p.textContent('#rInfo')).replace(/\s+/g,' '); await click('rbOk'); await p.waitForTimeout(1500); const r=await finishPanel(); return info+' -> '+r; }
  async function completeFromSheet(){ const before=await p.evaluate(()=>__game.S.chapter); await p.evaluate(()=>{ const b=document.querySelector('#mbox .actions .btn.primary'); b&&b.click(); }); await p.waitForTimeout(1200); await dismiss(); await p.waitForTimeout(1500); await dismiss(); await p.waitForTimeout(500); await dismiss(); return before+' -> '+await p.evaluate(()=>__game.S.chapter); }
  const quests=()=>p.evaluate(()=>__game.questProgress().map(x=>x.q.text+' '+x.have+'/'+x.q.n));
  // ch1
  log('ch1 living', await buildRoom(0)); log('  state', await S()); log('  complete', await completeFromSheet());
  // ch2: kitchen, then furnish the living room through its own panel
  log('ch2 kitchen', await buildRoom(1)); await p.evaluate(()=>window.closeModal()); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const r=GAME_DATA.detectRooms(__game.S.layout).find(r=>r.name==='Living Room'); __game.enterRoomEdit(r); }); await p.waitForTimeout(900);
  for(let i=0;i<6;i++){ const t=await p.evaluate(()=>document.getElementById('bhTitle').textContent); if(/ROOM COMPLETE/.test(t)) break; if(/DESIGN/.test(t)){ await p.evaluate(()=>{ const e=document.querySelector('.bhopt[data-k=floor]'); e&&e.click(); }); await click('gdGo'); await p.waitForTimeout(800); continue; } await click('gdGo'); await p.waitForTimeout(2200); }
  log('  state', await S()); log('  quests', await quests()); await dismiss(); await p.evaluate(()=>__game.completeChapter()); await p.waitForTimeout(1500); await dismiss(); await dismiss(); log('  chapter', await p.evaluate(()=>__game.S.chapter));
  // ch3
  await p.evaluate(()=>{ __game.S.coins+=500; }); await toRooms(); await p.evaluate(()=>document.querySelectorAll('#items .it')[6].click()); await p.waitForTimeout(1200); log('ch3 stairs', await S());
  log('ch3 bedroom F2', await buildRoom(2,1)); await p.evaluate(()=>window.closeModal()); log('ch3 bath F2', await buildRoom(3,1)); log('  quests', await quests()); log('  state', await S()); await p.evaluate(()=>window.closeModal());
  await p.evaluate(()=>__game.completeChapter()); await p.waitForTimeout(1500); await dismiss(); await dismiss(); log('  chapter', await p.evaluate(()=>__game.S.chapter));
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
