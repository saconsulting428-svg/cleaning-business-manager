const { chromium } = require('playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const state = require('fs').readFileSync('state_end.json','utf8');
  const p = await b.newPage({viewport:{width:420,height:820}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)}); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  await p.addInitScript((st)=>{ if(!localStorage.getItem('homehaven3d_save')) localStorage.setItem('homehaven3d_save', st); }, state);
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1200); await p.evaluate(H.install);
  await p.evaluate(()=>window.skipDialogs()); await p.evaluate(()=>window.closeModal());
  const log=(k,v)=>console.log(k, typeof v==='string'?v:JSON.stringify(v));
  log('story', await p.evaluate(()=>({chapter:__game.S.chapter, storyDone:__game.S.storyDone, prop:__game.S.prop, unlocked:Object.keys(__game.S.unlocked)})));
  await p.screenshot({path:'g12_home.png'});
  // ---- rooms
  const rooms = await p.evaluate(()=>GAME_DATA.detectRooms(__game.S.layout).map(r=>r.name+'@'+r.lvl+' '+r.size+' enc='+r.enclosed+' items='+r.items.length));
  log('rooms', rooms);
  // ---- challenges: alex + tommy should already be satisfied
  const res = await p.evaluate(async()=>{
    const out={}; const G=__game;
    for (const id of ['alex_garden','tommy_corner']) { const c=G.CHALL.find(x=>x.id===id); G.S.chal[id]={st:'active'}; const pr=G.evalQ(c.quests,G.layoutOf(c.prop)); out[id]=pr.map(p=>p.have+'/'+p.q.n).join(' '); }
    return out; });
  log('challenge progress', res);
  await p.evaluate(()=>{ __game.claim(__game.CHALL.find(x=>x.id==='alex_garden'), __game.S.chal); }); await p.waitForTimeout(500); await p.screenshot({path:'g12_claim.png'}); await p.evaluate(()=>window.closeModal());
  log('after claim alex', await p.evaluate(()=>({chal:__game.S.chal, coins:__game.S.coins, inv:{lamp_arc:__game.S.inv.lamp_arc, plant_tall:__game.S.inv.plant_tall}, unlocked:Object.keys(__game.S.unlocked)})));
  // ---- zoe bedroom: add decorations and color theme upstairs
  await p.evaluate(()=>{ __game.S.chal.zoe_bedroom={st:'active'}; });
  const okp = await p.evaluate(()=>[window.place('lamp',5,3,0,1), window.place('plant',5,5,0,1)]); log('placed deco', okp);
  await p.evaluate(()=>{ const L=__game.S.layout; const paint=(o)=>{ WORLD.select(o); WORLD.paintSelected('#3A86C8'); WORLD.deselect(); }; L.filter(o=>o.lvl===1&&['bed','wardrobe'].includes(o.part)).forEach(paint); const w=L.find(o=>o.lvl===1&&o.part==='wall_plaster'); paint(w); __game.save(); });
  log('zoe progress', await p.evaluate(()=>{ const c=__game.CHALL.find(x=>x.id==='zoe_bedroom'); return __game.evalQ(c.quests,__game.layoutOf('home')).map(p=>p.have+'/'+p.q.n).join(' '); }));
  // ---- family dinner kitchen
  await p.evaluate(()=>{ __game.S.chal.ben_dinner={st:'active'}; });
  log('dinner placed', await p.evaluate(()=>[window.place('dining_table',6,4,0,0),window.place('chair',8,4,0,0),window.place('chair',8,5,0,0),window.place('chair',7,5,0,0)]));
  log('dinner progress', await p.evaluate(()=>{ const c=__game.CHALL.find(x=>x.id==='ben_dinner'); return __game.evalQ(c.quests,__game.layoutOf('home')).map(p=>p.have+'/'+p.q.n).join(' '); }));
  // ---- properties: cottage
  const homeCount = await p.evaluate(()=>__game.S.layout.length);
  log('switch cottage', await p.evaluate(()=>{ const ok=__game.switchProperty('cottage'); return {ok, prop:__game.S.prop, layout:__game.S.layout.length, homeParked:(__game.S.props.home||{}).layout&&__game.S.props.home.layout.length}; }));
  await p.waitForTimeout(2500); await p.screenshot({path:'g12_cottage.png'});
  // renovate the cottage a bit and evaluate contract c_budget
  log('contract budget before', await p.evaluate(()=>{ const c=__game.CONTR.find(x=>x.id==='c_budget'); return __game.evalQ(c.quests,__game.layoutOf('cottage')).map(p=>p.have+'/'+p.q.n).join(' '); }));
  log('cottage windows', await p.evaluate(()=>[window.place('window_small',4,4,0,0),window.place('window_small',6,4,0,0)]));
  log('contract budget after', await p.evaluate(()=>{ const c=__game.CONTR.find(x=>x.id==='c_budget'); return __game.evalQ(c.quests,__game.layoutOf('cottage')).map(p=>p.have+'/'+p.q.n).join(' '); }));
  // reload persistence
  await p.evaluate(()=>__game.save()); await p.reload(); await p.waitForSelector('#menu.on',{timeout:60000}); await p.click('#btnContinue'); await p.waitForTimeout(1500); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs());
  log('after reload', await p.evaluate(()=>({prop:__game.S.prop, layout:__game.S.layout.length, home:(__game.S.props.home||{}).layout&&__game.S.props.home.layout.length})));
  log('switch home', await p.evaluate(()=>{ __game.switchProperty('home'); return {prop:__game.S.prop, layout:__game.S.layout.length, cottage:(__game.S.props.cottage||{}).layout.length}; }));
  log('home before', homeCount);
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
