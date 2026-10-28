const { chromium } = require('/opt/node-tools/node_modules/playwright'); const H=require('./helpers.js');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
 const p=await b.newPage({viewport:{width:740,height:360}}); p.setDefaultTimeout(120000); p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:90000});
 await p.click('#btnContinue'); await p.waitForTimeout(1000); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(300); await p.evaluate(()=>window.closeModal());
 await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.S.chapter=3; __game.S.coins=2500; __game.save(); });
 await p.evaluate(()=>document.getElementById('navBuild').click()); await p.waitForTimeout(1800); await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.click();});
 await p.evaluate(()=>document.getElementById('rbOk').click()); await p.waitForTimeout(1500);
 const tapOne=async()=>{ const pick=await p.evaluate(()=>{ for(const s of (WORLD.sites||[])){ const sc=WORLD.siteScreen(s.id); const el=document.elementFromPoint(sc[0],sc[1]); if(el&&el.tagName==='CANVAS'&&WORLD.pickSite(sc[0],sc[1])===s.id) return {x:sc[0],y:sc[1]}; } return null; }); if(!pick) return false; await p.mouse.click(pick.x,pick.y); await p.waitForTimeout(900); return true; };
 const info=()=>p.evaluate(()=>({t:document.getElementById('bhTitle').textContent,c:document.getElementById('bhCount').textContent,cls:document.getElementById('build').className}));
 await tapOne(); await tapOne(); console.log('landscape:',JSON.stringify(await info()));
 await p.setViewportSize({width:360,height:740}); await p.waitForTimeout(1500); console.log('rotated to portrait:',JSON.stringify(await info())); await p.screenshot({path:'orient_p.png'});
 await tapOne(); console.log('portrait tap:',JSON.stringify(await info()));
 await p.setViewportSize({width:740,height:360}); await p.waitForTimeout(1500); console.log('back to landscape:',JSON.stringify(await info())); await p.screenshot({path:'orient_l.png'});
 // advance to the roof stage and watch it assemble
 for(let i=0;i<30;i++){ const t=(await info()).t; if(/ROOF/.test(t)) break; await p.evaluate(()=>document.getElementById('gdGo').click()); await p.waitForTimeout(2300); }
 console.log('stage:',JSON.stringify(await info())); await p.screenshot({path:'roof_0.png'});
 await tapOne(); await p.waitForTimeout(250); await p.screenshot({path:'roof_1.png'}); await p.waitForTimeout(350); await p.screenshot({path:'roof_2.png'}); await p.waitForTimeout(900); await tapOne(); await p.waitForTimeout(500); await p.screenshot({path:'roof_3.png'}); await p.waitForTimeout(1800); await p.screenshot({path:'roof_4.png'});
 console.log('after roof taps:',JSON.stringify(await info()));
 await b.close(); })();
