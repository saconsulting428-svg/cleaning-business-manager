const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const [w,h]=(process.argv[3]||'420x820').split('x').map(Number);
  const p = await b.newPage({viewport:{width:w,height:h}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)}); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
  const log=(k,v)=>console.log(k, typeof v==='string'?v:JSON.stringify(v));
  const S=()=>p.evaluate(()=>{ const L=__game.S.layout, P=SPRITES.parts; return {floors:L.filter(o=>P[o.part].kind==='floor'&&o.part!=='path_stone').length, walls:L.filter(o=>P[o.part].kind==='wall'&&P[o.part].cat!=='garden').length, openings:L.filter(o=>P[o.part].cat==='openings').length, roofs:L.filter(o=>P[o.part].kind==='roof').length, coins:__game.S.coins, chapter:__game.S.chapter}; });
  const cellPt=(x,z,lvl=0)=>p.evaluate(([x,z,l])=>WORLD.toScreen(x,z,l*WORLD.H),[x,z,lvl]);
  async function enterBuild(){ if(!(await p.$('#build.on'))){ await p.evaluate(()=>{ document.getElementById('navBuild').click(); }); await p.waitForTimeout(1200); await p.evaluate(()=>window.closeModal()); } }
  async function leaveRoomEdit(){ await p.evaluate(()=>window.skipDialogs()); await p.evaluate(()=>window.closeModal()); if(await p.$('#build.roomedit')){ await p.evaluate(()=>document.getElementById('reNew').click()); await p.waitForTimeout(600);} }
  async function dragRoom(typeIdx,x0,z0,x1,z1,lvl=0){
    await enterBuild(); await leaveRoomEdit();
    await p.evaluate((l)=>{ document.querySelectorAll('.sg')[l].click(); },lvl);
    await p.evaluate(()=>{ [...document.querySelectorAll('.tab')][0].click(); }); await p.waitForTimeout(200);
    await p.evaluate((i)=>{ document.querySelectorAll('#items .it')[i].click(); },typeIdx);
    const a=await cellPt(x0+.5,z0+.5,lvl), c=await cellPt(x1+.5,z1+.5,lvl);
    await p.mouse.move(a[0],a[1]); await p.mouse.down(); for(let i=1;i<=10;i++){ await p.mouse.move(a[0]+(c[0]-a[0])*i/10, a[1]+(c[1]-a[1])*i/10); await p.waitForTimeout(30);} await p.mouse.up(); await p.waitForTimeout(300);
    const info=await p.textContent('#rInfo'); const dis=await p.$eval('#rbOk',e=>e.disabled);
    if(!dis) { await p.evaluate(()=>document.getElementById('rbOk').click()); await p.waitForTimeout(900); }
    return info.replace(/\s+/g,' ')+(dis?' [BLOCKED]':' [built]');
  }
  async function autoOpen(){ await p.evaluate(()=>{ document.getElementById('reAuto').click(); }); await p.waitForTimeout(500); }
  async function complete(){ await p.evaluate(()=>{ __game.completeChapter(); }); await p.waitForTimeout(800); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(1500); await p.evaluate(()=>window.closeModal()); await p.waitForTimeout(500); await p.evaluate(()=>window.skipDialogs()); return p.evaluate(()=>__game.S.chapter); }
  async function place(list){ let ok=0; await p.evaluate(()=>{ if(!document.getElementById('build').classList.contains('on')) document.getElementById('navBuild').click(); }); await leaveRoomEdit(); for(const a of list){ const r=await p.evaluate((a)=>window.place(...a),a); if(r) ok++; else console.log('  place failed',a.join(':')); } return ok+'/'+list.length; }
  await p.evaluate(()=>{ const t=document.getElementById('tutSkip'); t&&t.click(); });
  // ---- chapter 1: clear debris, first room
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.save(); });
  log('ch1 living room', await dragRoom(0,3,3,6,6)); log('  state', await S());
  log('  complete ->', await complete());
  // ---- chapter 2: kitchen shares a wall with the living room, auto doors/windows, furniture
  log('ch2 kitchen', await dragRoom(1,7,3,9,6)); log('  state', await S());
  await autoOpen(); log('  after auto openings (kitchen)', await S());
  // go to living room edit via rooms list API
  log('rooms', await p.evaluate(()=>GAME_DATA.detectRooms(__game.S.layout).map(r=>r.name+':'+r.lvl+':'+r.cells.length+':'+JSON.stringify(r.cells[0]))));
  await p.evaluate(()=>{ const r=GAME_DATA.detectRooms(__game.S.layout).find(r=>r.name==='Living Room'); __game.enterRoomEdit(r); }); await p.waitForTimeout(900); await autoOpen(); log('  after auto openings (living)', await S());
  log('  furniture', await place([['sofa',3,3,0,0],['coffee_table',4,5,0,0],['counter',7,3,0,0],['stove',8,3,0,0],['fridge',9,3,0,0],['sink',7,5,0,0]]));
  log('  quests', await p.evaluate(()=>__game.questProgress().map(x=>x.q.text+' '+x.have+'/'+x.q.n)));
  log('  complete ->', await complete());
  // ---- chapter 3: first floor rooms
  log('ch3 bedroom (floor 2)', await dragRoom(2,3,3,6,4,1)); log('ch3 bathroom (floor 2)', await dragRoom(3,7,3,9,4,1));
  log('  furniture', await place([['stairs',3,5,0,0],['bed',3,3,0,1],['wardrobe',5,3,0,1],['bathtub',7,3,0,1],['toilet',9,3,0,1],['basin',9,4,0,1]]));
  log('  quests', await p.evaluate(()=>__game.questProgress().map(x=>x.q.text+' '+x.have+'/'+x.q.n)));
  log('  complete ->', await complete());
  // ---- chapter 4: auto roof through the UI
  await enterBuild(); await leaveRoomEdit();
  await p.evaluate(()=>{ [...document.querySelectorAll('.tab')].find(t=>/Roof/.test(t.textContent)).click(); }); await p.waitForTimeout(300);
  await p.evaluate(()=>document.querySelectorAll('#items .it')[0].click()); await p.waitForTimeout(500); await p.screenshot({path:'rb_roofsheet.png'});
  await p.evaluate(()=>{ const bs=[...document.querySelectorAll('#mbox .btn')]; bs[0].click(); }); await p.waitForTimeout(1500); log('ch4 roof', await S());
  await p.evaluate(()=>{ WORLD.setMode('view'); }); await p.waitForTimeout(500);
  await p.evaluate(()=>{ const w=__game.S.layout.filter(o=>SPRITES.parts[o.part].cat==='walls').slice(0,3); w.forEach(o=>{ WORLD.select(o); WORLD.paintSelected('#3A86C8'); }); WORLD.deselect(); __game.save(); });
  require('fs').writeFileSync('save_ch4.json', await p.evaluate(()=>localStorage.getItem('homehaven3d_save')));
  await p.evaluate(()=>{ WORLD.setMode('build'); WORLD.setInterior(false); WORLD.resetFocus(); }); await p.waitForTimeout(4000);
  log('dbg', await p.evaluate(()=>({tabs:[...document.querySelectorAll('.tab')].map(t=>t.textContent.trim()+(t.classList.contains('lock')?'🔒':'')), build:document.getElementById('build').className, mode:WORLD.mode, ch:__game.S.chapter, fence:SPRITES.parts.fence&&SPRITES.parts.fence.cat})));
  // path stones by dragging (drag-paint) in garden tab
  await p.evaluate(()=>{ document.getElementById('navBuild').click(); }); await p.waitForTimeout(800);
  await p.evaluate(()=>{ [...document.querySelectorAll('.tab')].find(t=>/Garden/.test(t.textContent)).click(); __game.S.inv.path_stone=(__game.S.inv.path_stone||0)+8; __game.S.inv.fence=(__game.S.inv.fence||0)+8; }); await p.waitForTimeout(300);
  await p.evaluate(()=>{ [...document.querySelectorAll('#items .it')].find(i=>/Stone Path|Path/.test(i.textContent)).click(); }); await p.waitForTimeout(300);
  { const a=await cellPt(5.5,8.5), c=await cellPt(5.5,11.5); await p.mouse.move(a[0],a[1]); await p.mouse.down(); for(let i=1;i<=12;i++){ await p.mouse.move(a[0]+(c[0]-a[0])*i/12, a[1]+(c[1]-a[1])*i/12); await p.waitForTimeout(40);} await p.mouse.up(); }
  log('  path stones after drag', await p.evaluate(()=>__game.S.layout.filter(o=>o.part==='path_stone').length));
  log('  fence+gate', await place([['fence',0,11,2,0],['fence',1,11,2,0],['fence',2,11,2,0],['fence',8,11,2,0],['fence',9,11,2,0],['fence',10,11,2,0],['gate',5,11,2,0]]));
  log('  quests', await p.evaluate(()=>__game.questProgress().map(x=>x.q.text+' '+x.have+'/'+x.q.n)));
  log('  complete ->', await complete());
  await p.evaluate(()=>{ WORLD.setMode('view'); WORLD.setNight(false); }); await p.waitForTimeout(6000); await p.screenshot({path:'rb_house.png'});
  require('fs').writeFileSync('save_end.json', await p.evaluate(()=>localStorage.getItem('homehaven3d_save')));
  // undo test: build another room then undo
  await enterBuild(); await leaveRoomEdit();
  const before=await S(); log('undo test before', before); log('  extra room', await dragRoom(4,0,0,2,2)); const mid=await S(); log('  after build', mid);
  await p.evaluate(()=>{ __game.undoBuild(); }); await p.waitForTimeout(400); log('  after undo', await S());
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
