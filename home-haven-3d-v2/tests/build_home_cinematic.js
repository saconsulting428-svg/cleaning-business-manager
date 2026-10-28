const { chromium } = require('/opt/node-tools/node_modules/playwright'); const H=require('./helpers.js');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
 const [W,Hh]=(process.argv[2]||'740x360').split('x').map(Number), tag=process.argv[3]||'c';
 const p=await b.newPage({viewport:{width:W,height:Hh}}); p.setDefaultTimeout(120000); p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:90000});
 await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
 await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.S.chapter=1; __game.S.coins=900; __game.save(); });
 await p.evaluate(()=>document.getElementById('navBuild').click()); await p.waitForTimeout(1800); await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.click();});
 await p.evaluate(()=>document.getElementById('rbOk').click()); await p.waitForTimeout(1500);
 // mid-animation captures of a wall tap: before, during hammer, during rise
 for(let i=0;i<40;i++){ const t=await p.evaluate(()=>document.getElementById('bhTitle').textContent); if(/WALLS/.test(t)) break; await p.evaluate(()=>document.getElementById('gdGo').click()); await p.waitForTimeout(2200); }
 const pick=await p.evaluate(()=>{ for(const s of (WORLD.sites||[])){ const sc=WORLD.siteScreen(s.id); const el=document.elementFromPoint(sc[0],sc[1]); if(el&&el.tagName==='CANVAS'&&WORLD.pickSite(sc[0],sc[1])===s.id) return {x:sc[0],y:sc[1]}; } return null; });
 await p.screenshot({path:`cine_${tag}_0.png`}); await p.mouse.click(pick.x,pick.y); await p.waitForTimeout(120); await p.screenshot({path:`cine_${tag}_1.png`}); await p.waitForTimeout(330); await p.screenshot({path:`cine_${tag}_2.png`}); await p.waitForTimeout(300); await p.screenshot({path:`cine_${tag}_3.png`}); await p.waitForTimeout(700); await p.screenshot({path:`cine_${tag}_4.png`});
 // run to the end and capture the completion cinematic
 for(let i=0;i<60;i++){ const m=await p.evaluate(()=>{const m=document.getElementById('modal'); return !m.classList.contains('hidden');}); if(m) break; const st=await p.evaluate(()=>document.getElementById('bhTitle')&&document.getElementById('bhTitle').textContent); if(/DESIGN/.test(st)){ await p.evaluate(()=>{['floor:tile','wall:cream','furn:modern'].forEach(s=>{const [k,v]=s.split(':'); const e=document.querySelector(`.bhopt[data-k=${k}][data-v=${v}]`); e&&e.click();});}); await p.waitForTimeout(900); }
   await p.evaluate(()=>{ const g=document.getElementById('gdGo'); g&&g.click(); }); await p.waitForTimeout(2300); const left=await p.evaluate(()=>S&&0).catch(()=>0); if(await p.evaluate(()=>!document.getElementById('guide').offsetParent)) break; }
 await p.waitForTimeout(700); await p.screenshot({path:`cine_${tag}_5.png`}); await p.waitForTimeout(1200); await p.screenshot({path:`cine_${tag}_6.png`}); await p.waitForTimeout(1500); await p.screenshot({path:`cine_${tag}_7.png`});
 await b.close(); })();
