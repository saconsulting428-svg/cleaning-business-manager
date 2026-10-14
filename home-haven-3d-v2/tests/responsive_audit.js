const { chromium } = require('/opt/node-tools/node_modules/playwright');
const H = require('./helpers.js');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const [w,h]=(process.argv[2]||'360x640').split('x').map(Number), tag=process.argv[3]||'a';
  const p = await b.newPage({viewport:{width:w,height:h}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.waitForSelector('#menu.on',{timeout:60000}); await p.waitForTimeout(800);
  const clip=()=>p.evaluate(()=>{ const out=[]; const vw=innerWidth, vh=innerHeight; document.querySelectorAll('body *').forEach(e=>{ const r=e.getBoundingClientRect(); if(!r.width||!r.height) return; const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0) return; if(e.closest('.hidden')||e.closest('[hidden]')) return; if(e.closest('canvas')) return;
    if(r.right>vw+1||r.left<-1){ if(!e.closest('#tabs')&&!e.closest('#items')&&!e.closest('.drawer')&&!e.closest('.pz')&&!e.closest('#game')) out.push('OFFX '+(e.id||e.className||e.tagName).toString().slice(0,30)+' '+Math.round(r.left)+'-'+Math.round(r.right)); }
    if(e.children.length===0&&e.textContent.trim()&&(cs.overflow==='hidden'||cs.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+1) out.push('CLIPTXT '+e.textContent.trim().slice(0,28)); }); return [...new Set(out)].slice(0,12); });
  const shot=async(n)=>{ await p.screenshot({path:`aud_${tag}_${n}.png`}); const c=await clip(); const c2=c.filter(x=>!/OFFX cl|OFFX conf/.test(x)); if(c2.length) console.log(n,JSON.stringify(c2)); };
  await shot('menu');
  await p.click('#btnContinue'); await p.waitForTimeout(1200); await p.evaluate(H.install); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(400); await shot('home1'); await p.evaluate(()=>window.closeModal()); await p.waitForTimeout(400); await shot('home');
  await p.evaluate(()=>{ for(let i=0;i<8;i++){ if(!__game.S.cleared.includes(i)){ __game.S.cleared.push(i); WORLD.clearDebris(i);} } __game.S.coins=900; __game.save(); });
  for (const id of ['navShop','navStory','navProjects','navRewards']) { await p.evaluate(i=>{const e=document.getElementById(i); e&&e.click();},id); await p.waitForTimeout(1000); await shot(id); await p.evaluate(()=>window.closeModal()); await p.waitForTimeout(500); }
  await p.evaluate(()=>document.getElementById('navBuild').click()); await p.waitForTimeout(2200); await p.evaluate(()=>window.closeModal()); await shot('build_t1');
  await p.click('#tutNext'); await p.waitForTimeout(800); await shot('build_t2'); await p.click('#tutNext'); await p.waitForTimeout(500);
  await p.evaluate(()=>{const t=document.getElementById('tutSkip'); t&&t.click();}); await p.waitForTimeout(300); await shot('build_ghost');
  await p.evaluate(()=>document.getElementById('rbOk').click()); await p.waitForTimeout(3500); await shot('guide1');
  await p.evaluate(()=>{__game.S.coins=3000;}); for(let i=0;i<3;i++){ await p.evaluate(()=>document.getElementById('gdGo').click()); await p.waitForTimeout(1300);} await shot('guide_done');
  await p.evaluate(()=>document.getElementById('reMore').click()); await p.waitForTimeout(400); await shot('style_open');
  await p.evaluate(()=>document.getElementById('btnBuildDone').click()); await p.waitForTimeout(1500); await p.evaluate(()=>window.skipDialogs()); await p.waitForTimeout(500); await shot('home_after');
  await p.evaluate(()=>{ const e=document.getElementById('btnPlay')||document.querySelector('.play-btn,#playBtn'); e&&e.click(); }); await p.waitForTimeout(2500); await shot('puzzle');
  await b.close();
})();
