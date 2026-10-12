const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:960,height:540}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await p.goto('file://'+process.cwd()+'/street-clash-3d.html');await p.waitForTimeout(4000);
const r=await p.evaluate(async()=>{const {game}=window.__sc;game.startMatch({mode:'versus',p1:'kai',p2:'titan',level:3});
const AI=window.__sc.AI;const out={};
for(let i=0;i<1800;i++){await new Promise(r=>setTimeout(r,5));if(game.phase==='over'||game.screen==='result')break;}
return {hp:game.F?game.F.map(f=>Math.round(f.hp)):null,phase:game.phase}});
console.log(JSON.stringify(r),errs.slice(0,5));
await p.evaluate(()=>{const g=window.__sc.game;for(const f of g.F){f.hp=100;f.ko=false;}g.F[0].startMove('hkick');});
await p.waitForTimeout(700);await p.screenshot({path:'/tmp/kick.png'});
await b.close()})();
