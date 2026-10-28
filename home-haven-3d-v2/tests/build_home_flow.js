const { chromium } = require('/opt/node-tools/node_modules/playwright'); const H=require('./helpers.js');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
 const [W,Hh]=(process.argv[2]||'360x740').split('x').map(Number), CH=+(process.argv[3]||1), tag=process.argv[4]||'f';
 const p=await b.newPage({viewport:{width:W,height:Hh}}); p.setDefaultTimeout(120000); p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,200)); });
 await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:90000});
 await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
 await p.evaluate((ch)=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.S.chapter=ch; __game.S.coins=900; __game.save(); },CH);
 await p.evaluate(()=>document.getElementById('navBuild').click()); await p.waitForTimeout(1800); await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.click();}); await p.evaluate(()=>window.closeModal());
 const info=()=>p.evaluate(()=>({title:document.getElementById('bhTitle').textContent,count:document.getElementById('bhCount').textContent,go:document.getElementById('gdGo').textContent,nsites:(WORLD.sites||[]).length,coins:__game.S.coins,items:__game.S.layout.filter(o=>SPRITES.parts[o.part].kind==='item').length,open:__game.S.layout.filter(o=>SPRITES.parts[o.part].cat==='openings').length,plan:!!__game.S.plan,modal:!document.getElementById('modal').classList.contains('hidden')&&document.getElementById('mbox').textContent.slice(0,70)}));
 const click=(id)=>p.evaluate(i=>document.getElementById(i).click(),id);
 await click('rbOk'); await p.waitForTimeout(2000); console.log('Build ->',JSON.stringify(await info())); await p.screenshot({path:`bhf_${tag}_0.png`});
 let last='', shots=1;
 for(let i=0;i<40;i++){
   const st=await info(); if(st.modal) { console.log('modal:',st.modal); break; }
   if(st.title!==last){ last=st.title; console.log('STAGE',st.title,st.count); await p.screenshot({path:`bhf_${tag}_${shots++}.png`}); }
   if(/DESIGN/.test(st.title)){ // choose a look, then continue
     for(const [k,v] of [['floor','marble'],['wall','brick'],['furn','luxury']]){ const ok=await p.evaluate(([k,v])=>{ const e=document.querySelector(`.bhopt[data-k=${k}][data-v=${v}]`); if(e){e.click();return true;} return false; },[k,v]); await p.waitForTimeout(900); if(ok) console.log('  design',k,v); }
     await p.screenshot({path:`bhf_${tag}_${shots++}.png`}); await click('gdGo'); await p.waitForTimeout(1200); continue; }
   const pick=await p.evaluate(()=>{ const ids=(WORLD.sites||[]).map(s=>s.id); for(const id of ids){ const sc=WORLD.siteScreen(id); if(!sc) continue; const el=document.elementFromPoint(sc[0],sc[1]); if(el&&el.tagName==='CANVAS'&&WORLD.pickSite(sc[0],sc[1])===id) return {id,x:sc[0],y:sc[1]}; } return null; });
   if(!pick){ console.log('no tappable site at',st.title,st.count,'-> using Build it all'); await click('gdGo'); await p.waitForTimeout(1500); continue; }
   await p.mouse.click(pick.x,pick.y); await p.waitForTimeout(800);
 }
 await p.waitForTimeout(1500); console.log('END',JSON.stringify(await info())); await p.screenshot({path:`bhf_${tag}_end.png`});
 await b.close(); })();
