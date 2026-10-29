const { chromium } = require('/opt/node-tools/node_modules/playwright'); const H=require('./helpers.js');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
 const [W,Hh]=(process.argv[2]||'740x360').split('x').map(Number), tag=process.argv[3]||'a';
 const p=await b.newPage({viewport:{width:W,height:Hh}}); p.setDefaultTimeout(120000); p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,200)); });
 await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:90000});
 await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
 await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.S.chapter=2; __game.S.coins=3000; __game.save(); });
 await p.evaluate(()=>document.getElementById('navBuild').click()); await p.waitForTimeout(1800); await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.click();});
 await p.evaluate(()=>document.getElementById('rbOk').click()); await p.waitForTimeout(1500);
 for(let i=0;i<60;i++){ const m=await p.evaluate(()=>{const m=document.getElementById('modal'); return !m.classList.contains('hidden')&&document.getElementById('mbox').textContent;}); if(/ROOM COMPLETE/.test(m)) break; const st=await p.evaluate(()=>document.getElementById('bhTitle')&&document.getElementById('bhTitle').textContent); if(/DESIGN/.test(st)){ await p.evaluate(()=>{ const e=document.querySelector('.bhopt[data-k=floor]'); e&&e.click(); }); await p.waitForTimeout(600);} await p.evaluate(()=>{const g=document.getElementById('gdGo'); g&&g.click();}); await p.waitForTimeout(2300); }
 await p.waitForTimeout(500); console.log('complete sheet buttons:',await p.evaluate(()=>[...document.querySelectorAll('#mbox .actions .btn')].map(b=>b.textContent.trim())));
 await p.evaluate(()=>{ const b=[...document.querySelectorAll('#mbox .actions .btn')].find(b=>/Design brief/.test(b.textContent)); b&&b.click(); }); await p.waitForTimeout(3500);
 console.log('dz:',await p.evaluate(()=>({cls:document.getElementById('build').className,title:document.getElementById('dzTitle').textContent,list:[...document.querySelectorAll('#dzList li')].map(l=>(l.classList.contains('ok')?'✓ ':'○ ')+l.textContent),active:!!(__game.S.dz&&__game.S.dz.active&&__game.S.dz.active.before)})));

 const R=await p.evaluate(()=>{ const r=GAME_DATA.detectRooms(__game.S.layout)[0]; const xs=r.cells.map(c=>c[0]), zs=r.cells.map(c=>c[1]); return {x0:Math.min(...xs),x1:Math.max(...xs)+1,z0:Math.min(...zs),z1:Math.max(...zs)+1,lvl:r.lvl}; });
 const scr=(x,z,y=0)=>p.evaluate(([x,z,y])=>WORLD.toScreen(x,z,y),[x,z,y]);
 const items=()=>p.evaluate(()=>__game.S.layout.filter(o=>SPRITES.parts[o.part].kind==='item').map(o=>o.part+':'+o.x+','+o.z+(o.elev?'^'+o.elev:'')));
 const dragFrom=async(a,c)=>{ await p.mouse.move(a[0],a[1]); await p.mouse.down(); for(let i=1;i<=14;i++){ await p.mouse.move(a[0]+(c[0]-a[0])*i/14,a[1]+(c[1]-a[1])*i/14); await p.waitForTimeout(35);} await p.mouse.up(); await p.waitForTimeout(500); };
 const pickCard=async(name,tab)=>{ if(tab) await p.evaluate((t)=>{ const e=[...document.querySelectorAll('#tabs .tab')].find(x=>x.textContent.includes(t)); e&&e.click(); },tab); await p.waitForTimeout(300); const ok=await p.evaluate((n)=>{ const e=[...document.querySelectorAll('#items .it')].find(x=>x.textContent.includes(n)); if(e){e.click();return true;} return false; },name); await p.waitForTimeout(700); return ok; };
 await p.evaluate(()=>document.getElementById('dzAdd').click()); await p.waitForTimeout(500); await p.screenshot({path:`dz_${tag}_1.png`});
 console.log('items before',JSON.stringify(await items()));
 // 1) TV unit: pick -> ghost spawns -> drag it to the wall by real mouse
 console.log('pick tv',await pickCard('TV','Living')); const gh=await p.evaluate(()=>{ const g=WORLD.ghostCand; if(!g) return null; const c=WORLD.centerOf(g); return WORLD.toScreen(c[0],c[1],0.4); }); console.log('ghost at',JSON.stringify(gh));
 console.log('elementFromPoint',await p.evaluate(([x,y])=>{ const e=document.elementFromPoint(x,y); return e? e.tagName+'#'+e.id+'.'+e.className : null; },gh)); const tvT=await scr(R.x0+1,R.z0+2.5,0); await dragFrom(gh,tvT); console.log('dbg',await p.evaluate(()=>({place:!!WORLD.place, ghost:WORLD.ghost&&WORLD.ghost.ok, cand:JSON.stringify(WORLD.ghostCand), drop:WORLD.dropMode, mode:WORLD.mode, inv:__game.S.inv.tv, coins:__game.S.coins, dbg:JSON.stringify(WORLD._dbg)+JSON.stringify(WORLD._dbg0)}))); await p.screenshot({path:`dz_${tag}_2.png`}); console.log('after tv drag',JSON.stringify(await items()));
 // 2) rug
 console.log('pick rug',await pickCard('Rug','Decor')); const gh2=await p.evaluate(()=>{ const g=WORLD.ghostCand; if(!g) return null; const c=WORLD.centerOf(g); return WORLD.toScreen(c[0],c[1],0.1); }); await dragFrom(gh2,await scr(R.x0+2,R.z0+2.5,0)); console.log('after rug',JSON.stringify(await items()));
 // 3) plant stacked on the coffee table
 const tbl=await p.evaluate(()=>{ const t=__game.S.layout.find(o=>o.part==='coffee_table'); return t?[t.x,t.z]:null; }); console.log('coffee table at',JSON.stringify(tbl));
 console.log('pick plant',await pickCard('Plant','Decor')); const gh3=await p.evaluate(()=>{ const g=WORLD.ghostCand; const c=WORLD.centerOf(g); return WORLD.toScreen(c[0],c[1],0.1); }); await dragFrom(gh3,await scr(tbl[0]+.5,tbl[1]+.5,0)); console.log('after plant',JSON.stringify(await items()));
 await p.evaluate(()=>{ WORLD.cancelPlace&&WORLD.cancelPlace(); }); await p.waitForTimeout(300);
 // 4) move the sofa by dragging it (no selection first)
 const sofa=await p.evaluate(()=>{ const t=__game.S.layout.find(o=>o.part==='sofa'); const c=WORLD.centerOf(t); return {x:t.x,z:t.z,c}; }); const sA=await scr(sofa.c[0],sofa.c[1],0.4), sB=await scr(R.x0+1.5,R.z1-1.2,0); await dragFrom(sA,sB);
 console.log('sofa',JSON.stringify(sofa),'->',JSON.stringify(await p.evaluate(()=>{ const t=__game.S.layout.find(o=>o.part==='sofa'); return [t.x,t.z]; })));
 await p.evaluate(()=>document.getElementById('dzAdd').click()); await p.waitForTimeout(400); await p.screenshot({path:`dz_${tag}_3.png`});
 // 5) walk in + orbit
 const yaw0=await p.evaluate(()=>WORLD._goal.yaw); await p.evaluate(()=>document.getElementById('dzView').click()); await p.waitForTimeout(2200); await dragFrom([560,290],[660,300]); console.log('yaw changed by orbit:',await p.evaluate((y)=>+(WORLD._goal.yaw-y).toFixed(2),yaw0),'pitch',await p.evaluate(()=>WORLD._goal.pitch)); await p.waitForTimeout(1500); await p.screenshot({path:`dz_${tag}_4.png`});
 await p.evaluate(()=>document.getElementById('dzView').click()); await p.waitForTimeout(1800);
 // 6) styles
 await p.evaluate(()=>document.getElementById('dzStyleBtn').click()); await p.waitForTimeout(500); await p.screenshot({path:`dz_${tag}_5.png`}); console.log('style cards',await p.evaluate(()=>[...document.querySelectorAll('.stcard')].map(e=>e.textContent.trim().slice(0,40))));
 await p.evaluate(()=>{ const e=document.querySelector('.stcard[data-s=modern]'); e&&e.click(); }); await p.waitForTimeout(2500); await p.screenshot({path:`dz_${tag}_6.png`});
 // 7) submit brief -> before/after
 console.log('submit state',await p.evaluate(()=>({txt:document.getElementById('dzSubmit').textContent,ready:document.getElementById('dzSubmit').classList.contains('ready'),stars:document.getElementById('dzStars').textContent})));
 await p.evaluate(()=>document.getElementById('dzSubmit').click()); await p.waitForTimeout(1500); await p.screenshot({path:`dz_${tag}_7.png`});
 console.log('result',await p.evaluate(()=>({sheet:document.getElementById('mbox').textContent.slice(0,120),done:JSON.stringify(__game.S.dz.done),coins:__game.S.coins,unlockedSofa:!!__game.S.unlocked.sofa_modern,ba:!!document.getElementById('ba2r')})));
 await b.close(); })();
