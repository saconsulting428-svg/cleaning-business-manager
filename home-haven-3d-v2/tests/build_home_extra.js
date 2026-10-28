const { chromium } = require('/opt/node-tools/node_modules/playwright'); const H=require('./helpers.js');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
 const p=await b.newPage({viewport:{width:360,height:740}}); p.setDefaultTimeout(120000); p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,200)); });
 await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:90000});
 const boot=async()=>{ await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal()); };
 await boot();
 await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.S.chapter=3; __game.S.coins=900; __game.save(); });
 await p.evaluate(()=>document.getElementById('navBuild').click()); await p.waitForTimeout(1800); await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.click();}); await p.evaluate(()=>window.closeModal());
 const info=()=>p.evaluate(()=>({title:document.getElementById('bhTitle').textContent,count:document.getElementById('bhCount').textContent,nsites:(WORLD.sites||[]).length,coins:__game.S.coins,floors:__game.S.layout.filter(o=>SPRITES.parts[o.part].kind==='floor').length,roofs:__game.S.layout.filter(o=>SPRITES.parts[o.part].kind==='roof').length,plan:!!__game.S.plan,modal:!document.getElementById('modal').classList.contains('hidden')&&document.getElementById('mbox').textContent.slice(0,60)}));
 const tapFirst=async()=>{ const pick=await p.evaluate(()=>{ for(const s of (WORLD.sites||[])){ const sc=WORLD.siteScreen(s.id); const el=document.elementFromPoint(sc[0],sc[1]); if(el&&el.tagName==='CANVAS'&&WORLD.pickSite(sc[0],sc[1])===s.id) return {x:sc[0],y:sc[1]}; } return null; }); if(!pick) return false; await p.mouse.click(pick.x,pick.y); await p.waitForTimeout(800); return true; };
 await p.evaluate(()=>document.getElementById('rbOk').click()); await p.waitForTimeout(1800);
 await tapFirst(); await tapFirst(); console.log('A tapped 2:',JSON.stringify(await info()));
 // B undo
 await p.evaluate(()=>__game.undoBuild()); await p.waitForTimeout(500); console.log('B after undo:',JSON.stringify(await info()));
 await tapFirst(); await tapFirst(); console.log('B re-tapped:',JSON.stringify(await info()));
 // A resume after reload
 await p.evaluate(()=>__game.save()); await p.reload(); await p.waitForSelector('#menu.on',{timeout:90000}); await boot(); await p.evaluate(()=>document.getElementById('navBuild').click()); await p.waitForTimeout(2200); await p.evaluate(()=>window.closeModal());
 console.log('A reload+resume:',JSON.stringify(await info()), await p.evaluate(()=>document.getElementById('build').className));
 // C coin shortage
 await p.evaluate(()=>{ __game.S.coins=0; __game.S.inv={}; }); await tapFirst(); await p.waitForTimeout(600); console.log('C no coins:',JSON.stringify(await info())); await p.screenshot({path:'bhm_coins.png'}); await p.evaluate(()=>window.closeModal()); await p.evaluate(()=>{ __game.S.coins=900; });
 // finish structure quickly with Build it all and look for roof stage
 for(let i=0;i<8;i++){ const st=await info(); if(/ROOF/.test(st.title)||/DESIGN/.test(st.title)) break; await p.evaluate(()=>document.getElementById('gdGo').click()); await p.waitForTimeout(2600); }
 console.log('D stage:',JSON.stringify(await info())); await p.screenshot({path:'bhm_roof.png'});
 if(/ROOF/.test((await info()).title)){ await tapFirst(); await tapFirst(); console.log('D roof tapped:',JSON.stringify(await info())); await p.screenshot({path:'bhm_roof2.png'}); }
 await b.close(); })();
