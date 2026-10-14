const { chromium } = require('playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const state = require('fs').readFileSync('state_end.json','utf8');
  const p = await b.newPage({viewport:{width:420,height:820}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)}); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  await p.addInitScript((st)=>{ if(!localStorage.getItem('homehaven3d_save')) localStorage.setItem('homehaven3d_save', st); }, state);
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  await p.click('#btnContinue'); await p.waitForTimeout(1200); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.evaluate(()=>window.closeModal());
  const log=(k,v)=>console.log(k, typeof v==='string'?v:JSON.stringify(v));
  const prog=(id)=>p.evaluate((id)=>{ const c=__game.CHALL.find(x=>x.id===id)||__game.CONTR.find(x=>x.id===id); return __game.evalQ(c.quests,__game.layoutOf(c.prop)).map(q=>q.have+'/'+q.q.n).join(' '); },id);
  await p.evaluate(()=>{ __game.switchProperty('cottage'); __game.S.chal.parker_house={st:'active'}; });
  log('parker before', await prog('parker_house'));
  const ok = await p.evaluate(()=>{ const r=[]; r.push(window.place('door_wood',5,4,0,0)); r.push(window.place('window_small',4,4,0,0)); r.push(window.place('window_small',6,4,0,0)); r.push(window.place('window_small',3,6,3,0));
    for (let x=3;x<8;x++){ r.push(window.place('roof_flat',x,4,0,0)); r.push(window.place('roof_flat',x,5,0,0)); }
    r.push(window.place('bed',4,5,0,0)); r.push(window.place('sofa',6,6,0,0)); r.push(window.place('tv',7,5,0,0)); r.push(window.place('bookshelf',3,5,0,0));
    const L=__game.S.layout; L.slice(0,4).forEach(o=>{ WORLD.select(o); WORLD.paintSelected('#3A86C8'); WORLD.deselect(); }); __game.save(); return r.map(x=>x?1:0).join(''); });
  log('placed', ok); log('parker after', await prog('parker_house'));
  await p.waitForTimeout(2500); await p.screenshot({path:'g18_cottage.png'});
  await p.evaluate(()=>{ __game.claim(__game.CHALL.find(x=>x.id==='parker_house'), __game.S.chal); }); await p.waitForTimeout(600); await p.screenshot({path:'g18_claim.png'}); await p.evaluate(()=>window.closeModal());
  log('after claim', await p.evaluate(()=>({chal:__game.S.chal.parker_house, unlockedBeach:!!__game.S.unlocked['property:beach'], propsAvail:__game.PROPS.map(x=>x.id+':'+x.unlocked(__game.S))})));
  log('switch beach', await p.evaluate(()=>{ const ok=__game.switchProperty('beach'); return {ok,prop:__game.S.prop,layout:__game.S.layout.length}; }));
  await p.waitForTimeout(3500); await p.screenshot({path:'g18_beach.png'});
  await p.evaluate(()=>__game.openProjects('contracts')); await p.waitForTimeout(600); await p.screenshot({path:'g18_contracts.png'});
  await p.evaluate(()=>window.closeModal()); await p.evaluate(()=>__game.openProjects('map')); await p.waitForTimeout(600); await p.screenshot({path:'g18_map.png'});
  console.log('ERRORS', JSON.stringify(errs)); await b.close();
})();
