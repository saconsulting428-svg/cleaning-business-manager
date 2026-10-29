// Puzzle tip placement: for each puzzle type and viewport, the tip bubble must not intersect the drawn puzzle area.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
 let bad=0; for(const v of (process.argv[2]||'800x400,740x360,915x412,360x740').split(',')){ const [W,H]=v.split('x').map(Number);
  const p=await b.newPage({viewport:{width:W,height:H}}); p.setDefaultTimeout(60000); p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file:///home/user/cleaning-business-manager/home-haven-3d-v2/Home_Haven_3D.html'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForSelector('#menu.on',{timeout:90000});
  await p.click('#btnContinue'); await p.waitForTimeout(1500);
  for(let L=1;L<=6;L++){
   await p.evaluate((L)=>{ const G=__game; G.S.cleared=[0,1,2,3,4,5,6,7]; G.S.chapter=1; G.S.level=L; G.S.hearts=5; G.S.tut={off:false,done:{debris:1,buildBtn:1,pick:1,confirm:1,roomDone:1,howto:1},rooms:1}; G.S.howto={pipe:1,bolt:1,tile:1,wire:1,brick:1,fuse:1,paint:1}; const d=document.getElementById('dialog'); d&&d.classList.add('hidden'); document.getElementById('modal').classList.add('hidden'); G.startLevel(); },L);
   await p.waitForTimeout(4000);
   const r=await p.evaluate(()=>{ const g=window.__tg; if(!(g&&g.id==='puz')) return null; const pr=window.__puzRect(), bb=g.bubble; const ov=pr?Math.max(0,Math.min(pr.x+pr.w,bb.x+bb.w)-Math.max(pr.x,bb.x))*Math.max(0,Math.min(pr.y+pr.h,bb.y+bb.h)-Math.max(pr.y,bb.y)):-1; return {b:bb,pr,ov,txt:document.getElementById('tgTxt').textContent}; });
   console.log(v,'L'+L,JSON.stringify(r)); if(!r||r.ov!==0) bad++; await p.screenshot({path:`tip_${v}_L${L}.png`});
   await p.evaluate(()=>{ try{ window.PUZ&&PUZ.end(); GAME.scene.stop('Puzzle'); }catch(e){} document.getElementById('app').classList.remove('puzzle'); document.querySelectorAll('.layer').forEach(l=>l.classList.remove('on')); document.getElementById('home').classList.add('on'); try{__game.S.playing=null;}catch(e){} });
  } await p.close(); }
 console.log('BAD',bad); await b.close(); })();
