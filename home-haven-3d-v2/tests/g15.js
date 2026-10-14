const { chromium } = require('playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:420,height:820}});
  const errs=[]; p.on('pageerror',e=>{errs.push(e.message);console.log('PAGEERR',e.message)}); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  // an old v3 save: chapter 4, built floors/walls
  const old = {ver:3,coins:420,stars:30,hearts:5,level:17,chapter:3,layout:[],inv:{floor_wood:2,wall_plaster:3},nextId:200,seen:{intro:1,ch0:1,ch1:1,ch2:1,ch3:1},stats:{wins:16,three:3,placed:60,painted:1,tommy:2,chapters:3},boosters:{hint:2,undo:1}};
  let id=1; for(let x=3;x<9;x++)for(let z=3;z<8;z++) old.layout.push({id:'o'+(id++),part:'floor_wood',x,z,lvl:0,rot:0,color:'#C98B5A'});
  for(let x=3;x<9;x++){ old.layout.push({id:'o'+(id++),part:'wall_plaster',x,z:3,lvl:0,rot:0,color:'#F2D3A0'}); old.layout.push({id:'o'+(id++),part:'wall_plaster',x,z:7,lvl:0,rot:2,color:'#F2D3A0'}); }
  for(let z=3;z<8;z++){ old.layout.push({id:'o'+(id++),part:'wall_brick',x:3,z,lvl:0,rot:3,color:'#C8553D'}); old.layout.push({id:'o'+(id++),part:'wall_brick',x:8,z,lvl:0,rot:1,color:'#C8553D'}); }
  old.layout.push({id:'o'+(id++),part:'sofa',x:4,z:4,lvl:0,rot:0,color:'#2A9D8F'});
  await p.addInitScript((st)=>{ if(!localStorage.getItem('homehaven3d_save')) localStorage.setItem('homehaven3d_save', JSON.stringify(st)); }, old);
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  console.log('migrated', await p.evaluate(()=>{ const S=__game.S; return JSON.stringify({ver:S.ver,chapter:S.chapter,coins:S.coins,stars:S.stars,level:S.level,layout:S.layout.length,inv:S.inv,cleared:S.cleared.length,boosters:S.boosters}); }));
  await p.click('#btnContinue'); await p.waitForTimeout(1500); await p.evaluate(H.install);
  await p.evaluate(()=>window.skipDialogs()); await p.evaluate(()=>window.closeModal()); await p.waitForTimeout(3000); await p.screenshot({path:'g15_old.png'});
  // shop: buy something
  await p.click('#navShop'); await p.waitForTimeout(800); await p.screenshot({path:'g15_shop.png'});
  const before = await p.evaluate(()=>({coins:__game.S.coins, sofa:__game.S.inv.sofa||0}));
  await p.evaluate(()=>{ document.querySelector('[data-tab="furniture"]').click(); }); await p.waitForTimeout(500);
  await p.evaluate(()=>{ document.querySelector('[data-buy="sofa"]').click(); }); await p.waitForTimeout(600);
  const after = await p.evaluate(()=>({coins:__game.S.coins, sofa:__game.S.inv.sofa||0, saved:JSON.parse(localStorage.getItem('homehaven3d_save')).inv.sofa}));
  console.log('shop buy', JSON.stringify(before), '->', JSON.stringify(after));
  await p.screenshot({path:'g15_shop2.png'});
  console.log('tabs', await p.evaluate(()=>[...document.querySelectorAll('.stab')].map(x=>x.textContent)));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
