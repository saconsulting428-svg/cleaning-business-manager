const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:900,height:760}, deviceScaleFactor:1});
  p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{ if(m.type()==='error') console.log('CON',m.text().slice(0,300))});
  await p.goto('file://'+process.cwd()+'/v2/test.html'); await p.waitForFunction('window.READY',null,{timeout:30000});
  await p.evaluate(()=>{
    const L=[]; let id=1; const add=(part,x,z,lvl=0,rot=0,color)=>L.push({id:'o'+(id++),part,x,z,lvl,rot,color:color||SPRITES.parts[part].color});
    const X0=2,X1=9,Z0=3,Z1=7; // ground 7 x 4
    for(let x=X0;x<X1;x++)for(let z=Z0;z<Z1;z++) add('floor_wood',x,z);
    for(let x=X1-3;x<X1;x++) add('floor_tile',x,Z0); // kitchen
    for(let x=X0;x<X1;x++){ add('wall_plaster',x,Z0,0,0,'#F6E3C2'); if(x===4) add('door_wood',x,Z1-1,0,2,'#F6E3C2'); else if(x===3||x===6||x===7) add('window_big',x,Z1-1,0,2,'#F6E3C2'); else add('wall_plaster',x,Z1-1,0,2,'#F6E3C2'); }
    for(let z=Z0;z<Z1;z++){ add(z===4?'window_small':'wall_plaster',X0,z,0,3,'#F6E3C2'); add(z===5?'window_small':'wall_plaster',X1-1,z,0,1,'#F6E3C2'); }
    for(let z=Z0;z<Z1;z++) add(z===5?'arch':'wall_plaster',5,z,0,1,'#F6E3C2');
    // first floor 5 x 4
    for(let x=3;x<8;x++)for(let z=Z0;z<Z1;z++) add('floor_wood',x,z,1);
    for(let x=3;x<8;x++){ add('wall_plaster',x,Z0,1,0,'#F6E3C2'); add(x===5?'window_big':'wall_plaster',x,Z1-1,1,2,'#F6E3C2'); }
    for(let z=Z0;z<Z1;z++){ add('wall_plaster',3,z,1,3,'#F6E3C2'); add(z===4?'window_small':'wall_plaster',7,z,1,1,'#F6E3C2'); }
    // gable roof over first floor (two rows each side so the slope is continuous)
    for(let x=3;x<8;x++){ add('roof_slope',x,Z0,1,2,'#C24B32'); add('roof_slope',x,Z0+1,1,2,'#C24B32'); add('roof_slope',x,Z0+2,1,0,'#C24B32'); add('roof_slope',x,Z0+3,1,0,'#C24B32'); }
    // flat roof piece over the lower side parts
    for(let z=Z0;z<Z1;z++){ add('roof_flat',2,z,0,0,'#A39A90'); add('roof_flat',8,z,0,0,'#A39A90'); }
    // porch + path + fence + garden
    for(let x=3;x<6;x++) add('floor_wood',x,7); add('flowers',2,7); add('flowers',6,7);
    for(let z=8;z<12;z++) add('path_stone',4,z);
    for(let x=0;x<12;x++){ if(x===4) add('gate',x,11,0,2); else add('fence',x,11,0,2,'#F4F1EA'); }
    add('tree',0,2);add('tree',10,2);add('pine',11,5);add('bush',0,7);add('bush',9,7);add('flowers',1,9);add('flowers',7,9);add('flowers',8,9);add('bench',6,9,0,0);add('lamp_post',3,8);add('lamp_post',5,8);add('pond',9,9);add('mailbox',2,11);add('cat_house',10,6);
    RENO.World.setLayout(L); RENO.World.setMode('view'); RENO.World.setInterior(false);
    const c=RENO.World._cam,g=RENO.World._goal; Object.assign(g,{tx:5.2,ty:1.3,tz:6.6,dist:29,yaw:.6,pitch:.48,sx:0,sy:0}); Object.assign(c,g);
    RENO.World.chars[0].x=4.5; RENO.World.chars[0].z=8.6; RENO.World.chars[0].path=[]; RENO.World.chars[0].wait=1e9; RENO.World.chars[0].dir=Math.PI*.6; RENO.World.chars[1].x=5.3; RENO.World.chars[1].z=9.2; RENO.World.chars[1].path=[]; RENO.World.chars[1].wait=1e9; RENO.World.chars[1].dir=Math.PI*.9;
    window.READYART=1;
  });
  await p.waitForTimeout(4000);
  const url = await p.evaluate(()=>new Promise(res=>{ RENO.World.cb.frame=()=>{ const cv=document.querySelector('#c canvas'); const o=document.createElement('canvas'); o.width=cv.width;o.height=cv.height; const x=o.getContext('2d'); const gr=x.createLinearGradient(0,0,0,o.height); gr.addColorStop(0,'#7EC8F8'); gr.addColorStop(.6,'#CFEBFF'); gr.addColorStop(1,'#E3F5FF'); x.fillStyle=gr; x.fillRect(0,0,o.width,o.height); x.drawImage(cv,0,0); RENO.World.cb.frame=null; res(o.toDataURL('image/png')); }; }));
  require('fs').writeFileSync('art.png', Buffer.from(url.split(',')[1],'base64'));
  await b.close();
})();
