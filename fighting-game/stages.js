/* ============ 10 STAGES (built lazily to save memory) ============ */
function mk(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const BASE=HORIZON;
const STG=[
 {name:'NEON CITY',sky:['#07031a','#2a0f55','#a8268f'],sun:{x:700,y:200,r:90,c:'#ff4fd8'},stars:1,beam:'#66ccff',
  layers:[[.07,'city',{col:'#1a1040',min:60,max:190,mw:30,Mw:60,neon:.3,win:.35}],[.16,'city',{col:'#120a30',min:90,max:250,mw:50,Mw:95,neon:.55,win:.45}],[.32,'city',{col:'#0b0620',min:40,max:130,mw:70,Mw:140,neon:.8,win:.2}]],
  floor:['#241446','#07030f'],line:'#19e3ff',fm:'grid',pt:{t:'rise',c:'#ff4fd8',n:40}},
 {name:'SUNSET ROOFTOP',sky:['#1a0a2b','#8a2a5c','#ff9a3d'],sun:{x:300,y:290,r:120,c:'#ffd27a'},beam:'#ffbb88',
  layers:[[.07,'city',{col:'#40143c',min:60,max:190,mw:30,Mw:60,neon:.3,win:.35}],[.16,'city',{col:'#2d0d2c',min:90,max:250,mw:50,Mw:95,neon:.55,win:.45}],[.32,'city',{col:'#1c0820',min:40,max:130,mw:70,Mw:140,neon:.8,win:.2}]],
  floor:['#3a1428','#0c0408'],line:'#ffb347',fm:'grid',pt:{t:'rise',c:'#ffd27a',n:40}},
 {name:'SHAOLIN DOJO',indoor:1,sky:['#2a1208','#4a2410','#7a4018'],
  layers:[[.05,'shoji',{col:'#f3d9a0'}],[.14,'lanterns',{}],[.34,'pillars',{col:'#3a1a0c'}]],
  floor:['#7a4a22','#2a1608'],line:'#ffcf6a',fm:'planks',pt:{t:'drift',c:'#ffe3a0',n:30}},
 {name:'HARBOR NIGHT',sky:['#050b1c','#0c2348','#2a5a8a'],sun:{x:200,y:130,r:46,c:'#dfeaff'},stars:1,
  layers:[[.06,'city',{col:'#0f1c33',min:30,max:110,mw:30,Mw:60,neon:.2,win:.25}],[.17,'containers',{}],[.34,'cranes',{col:'#0a1220'}]],
  floor:['#1b2433','#05080f'],line:'#6cc3ff',fm:'tile',pt:{t:'rain',c:'#9cf',n:70}},
 {name:'BAMBOO FOREST',sky:['#0b2a22','#1f6b4a','#d6f0b0'],sun:{x:620,y:180,r:70,c:'#fff7c0'},
  layers:[[.05,'hills',{col:'#2a6a58',min:80,max:200}],[.15,'bamboo',{col:'#2c7a3e',thick:9,gap:46}],[.34,'bamboo',{col:'#14502a',thick:18,gap:110}]],
  floor:['#2a5a30','#07140a'],line:'#b8ff8a',fm:'grid',pt:{t:'fall',c:'#9fe070',n:30,leaf:1}},
 {name:'DESERT RUINS',sky:['#3a1a50','#d6603a','#ffcf6a'],sun:{x:300,y:260,r:110,c:'#fff0b0'},
  layers:[[.06,'dunes',{col:'#a8552f',amp:50}],[.16,'ruins',{col:'#6b3a22'}],[.34,'dunes',{col:'#7a3d22',amp:70}]],
  floor:['#c2874a','#4a2a14'],line:'#ffe0a0',fm:'plain',pt:{t:'drift',c:'#ffd7a0',n:40}},
 {name:'FROZEN PEAK',sky:['#0a1a3a','#2a5a9a','#bfe6ff'],stars:1,aurora:1,
  layers:[[.05,'hills',{col:'#5a7ab0',min:140,max:300,snow:1}],[.14,'hills',{col:'#88a8d8',min:80,max:200,snow:1}],[.34,'pines',{col:'#0c2038'}]],
  floor:['#bcd8f0','#3a5a80'],line:'#ffffff',fm:'grid',pt:{t:'fall',c:'#ffffff',n:60}},
 {name:'VOLCANO FORGE',sky:['#1a0505','#6a1408','#ff6a1a'],
  layers:[[.06,'volcano',{col:'#1a0806'}],[.16,'hills',{col:'#2a0e08',min:60,max:150,lava:1}],[.34,'hills',{col:'#140605',min:30,max:90}]],
  floor:['#2a1008','#080202'],line:'#ff6a1a',fm:'tile',pt:{t:'rise',c:'#ff9a3a',n:60}},
 {name:'SAKURA TEMPLE',sky:['#1a0a2e','#7a2a6a','#ffb08a'],sun:{x:700,y:170,r:70,c:'#fff0f0'},
  layers:[[.06,'hills',{col:'#3a1a4a',min:70,max:150}],[.17,'pagoda',{col:'#1a0a22'}],[.34,'trees',{col:'#2a1018'}]],
  floor:['#3a2a3a','#0d070d'],line:'#ffb0d0',fm:'tile',pt:{t:'fall',c:'#ffb8d0',n:45,leaf:1}},
 {name:'FINAL ARENA',sky:['#04010a','#220a3a','#5a1a6a'],sun:{x:480,y:150,r:120,c:'#e8c8ff'},stars:1,light:1,
  layers:[[.05,'arches',{col:'#120818'}],[.16,'arches',{col:'#1b0c22',sc:1.35}],[.34,'pillars',{col:'#0a0410',gold:1}]],
  floor:['#2a1038','#07030a'],line:'#ff2dd2',fm:'grid',pt:{t:'rise',c:'#ff2dd2',n:50}}
];
/* ---- layer builders ---- */
const LB={
  city(g,w,rn,o,st){
    let x=-20;const win='#ffe28a',neon=['#ff2d95','#19e3ff','#a855ff'];
    while(x<w){
      const bw=o.mw+rn()*(o.Mw-o.mw),bh=o.min+rn()*(o.max-o.min);
      g.fillStyle=o.col;g.fillRect(x,BASE-bh,bw,bh);
      for(let wy=BASE-bh+10;wy<BASE-8;wy+=13)for(let wx=x+6;wx<x+bw-8;wx+=11)if(rn()<o.win){g.fillStyle=win;g.globalAlpha=.2+rn()*.6;g.fillRect(wx,wy,5,7)}
      g.globalAlpha=1;
      if(rn()<o.neon){const c=neon[(rn()*3)|0];g.save();g.shadowColor=c;g.shadowBlur=14;g.strokeStyle=c;g.lineWidth=3;g.beginPath();g.moveTo(x,BASE-bh);g.lineTo(x+bw,BASE-bh);g.stroke();
        if(rn()<.6){g.fillStyle=c;g.fillRect(x+bw-10,BASE-bh+14,5,36+rn()*40)}g.restore()}
      if(rn()<.3){g.strokeStyle='#000';g.lineWidth=2;g.beginPath();g.moveTo(x+bw/2,BASE-bh);g.lineTo(x+bw/2,BASE-bh-24);g.stroke();g.fillStyle='#f33';g.fillRect(x+bw/2-2,BASE-bh-26,4,4)}
      x+=bw+rn()*10;
    }
  },
  hills(g,w,rn,o){
    const ph=rn()*9,ph2=rn()*9,f1=.004+rn()*.003,f2=.011+rn()*.006;
    const grd=g.createLinearGradient(0,BASE-o.max,0,BASE);grd.addColorStop(0,o.snow?'#f4faff':shade(o.col,1.35));grd.addColorStop(.5,o.snow?shade(o.col,1.25):o.col);grd.addColorStop(1,shade(o.col,.7));
    g.fillStyle=grd;g.beginPath();g.moveTo(0,BASE);
    for(let x=0;x<=w;x+=14){const t=.5+.5*Math.sin(x*f1+ph)*.65+.5*Math.sin(x*f2+ph2)*.35;g.lineTo(x,BASE-(o.min+(o.max-o.min)*t))}
    g.lineTo(w,BASE);g.closePath();g.fill();
    if(o.lava){g.save();g.strokeStyle='#ff6a1a';g.shadowColor='#ff6a1a';g.shadowBlur=12;g.lineWidth=2.5;for(let i=0;i<14;i++){let x=rn()*w,y=BASE-o.max*rn()*.6;g.beginPath();g.moveTo(x,y);for(let k=0;k<5;k++){x+=rn()*14-7;y+=10+rn()*14;g.lineTo(x,y)}g.stroke()}g.restore()}
  },
  bamboo(g,w,rn,o){
    for(let x=0;x<w;x+=o.gap*(.6+rn()*.8)){
      const t=o.thick*(.75+rn()*.5),gr=g.createLinearGradient(x-t/2,0,x+t/2,0);gr.addColorStop(0,shade(o.col,1.4));gr.addColorStop(.5,o.col);gr.addColorStop(1,shade(o.col,.55));
      g.fillStyle=gr;g.fillRect(x-t/2,0,t,BASE);
      for(let y=rn()*60;y<BASE;y+=55+rn()*45){g.fillStyle='rgba(0,0,0,.4)';g.fillRect(x-t/2-1,y,t+2,2.5);
        if(rn()<.5){g.fillStyle=shade(o.col,1.15);g.beginPath();g.ellipse(x+(rn()<.5?-1:1)*(t+14),y+6,t*1.9+10,3.2,rn()*.8-.4,0,TAU);g.fill()}}
    }
  },
  shoji(g,w,rn,o){
    const pw=96,ph=150;g.fillStyle='#1a0c06';g.fillRect(0,0,w,BASE);
    for(let x=0;x<w;x+=pw)for(let y=60;y<60+ph*2;y+=ph){
      const gr=g.createLinearGradient(0,y,0,y+ph);gr.addColorStop(0,o.col);gr.addColorStop(1,shade(o.col,.7));g.fillStyle=gr;g.globalAlpha=.55;g.fillRect(x+5,y+5,pw-10,ph-10);g.globalAlpha=1;
      g.strokeStyle='#2a140a';g.lineWidth=5;g.strokeRect(x+3,y+3,pw-6,ph-6);g.lineWidth=2;g.beginPath();g.moveTo(x+pw/2,y);g.lineTo(x+pw/2,y+ph);g.moveTo(x,y+ph/2);g.lineTo(x+pw,y+ph/2);g.stroke()}
    g.fillStyle='#2a140a';g.fillRect(0,BASE-70,w,70);
  },
  lanterns(g,w,rn){
    for(let x=60;x<w;x+=170+rn()*80){
      const y=70+rn()*60;g.strokeStyle='#1a0a05';g.lineWidth=2;g.beginPath();g.moveTo(x,0);g.lineTo(x,y);g.stroke();
      const gr=g.createRadialGradient(x,y+26,2,x,y+26,60);gr.addColorStop(0,'rgba(255,170,60,.65)');gr.addColorStop(1,'transparent');g.fillStyle=gr;g.fillRect(x-60,y-34,120,120);
      g.fillStyle='#c8201a';g.beginPath();g.ellipse(x,y+26,17,24,0,0,TAU);g.fill();g.fillStyle='#ffd24a';g.fillRect(x-9,y,18,4);g.fillRect(x-9,y+48,18,4);
      g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.5;for(let k=-1;k<=1;k++){g.beginPath();g.ellipse(x,y+26,17*Math.abs(k||.01),24,0,0,TAU);g.stroke()}
    }
    for(let x=300;x<w;x+=520){g.fillStyle='#8a1410';g.fillRect(x,0,56,200);g.fillStyle='#e8c24a';g.fillRect(x,0,56,8);g.fillRect(x,192,56,8);g.fillStyle='#e8c24a';g.fillRect(x+22,30,12,120)}
  },
  pillars(g,w,rn,o){
    for(let x=40;x<w;x+=420+rn()*120){
      const pw=o.gold?64:78,gr=g.createLinearGradient(x,0,x+pw,0);gr.addColorStop(0,shade(o.col,1.6));gr.addColorStop(.5,o.col);gr.addColorStop(1,shade(o.col,.5));
      g.fillStyle=gr;g.fillRect(x,0,pw,BASE+4);g.fillStyle=o.gold?'#d9a82a':'#7a1410';g.fillRect(x-6,0,pw+12,18);g.fillRect(x-6,BASE-60,pw+12,14);g.fillRect(x-6,150,pw+12,8);
    }
  },
  containers(g,w,rn){
    const cs=['#b8312a','#2a6ab8','#d89a1a','#2a8a5a','#7a3aa8','#c8c8c8'];let x=-10;
    while(x<w){const cw=88,n=1+((rn()*3)|0);for(let i=0;i<n;i++){const c=cs[(rn()*cs.length)|0],y=BASE-(i+1)*38;g.fillStyle=shade(c,.55);g.fillRect(x,y,cw,37);
      g.fillStyle='rgba(0,0,0,.25)';for(let k=6;k<cw;k+=9)g.fillRect(x+k,y+3,3,31);g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=2;g.strokeRect(x,y,cw,37)}
      x+=cw+4+rn()*30}
  },
  cranes(g,w,rn,o){
    for(let x=100;x<w;x+=520+rn()*200){
      g.strokeStyle=o.col;g.fillStyle=o.col;g.lineWidth=5;
      g.beginPath();g.moveTo(x,BASE);g.lineTo(x,40);g.moveTo(x+30,BASE);g.lineTo(x+30,40);g.stroke();
      g.lineWidth=2;for(let y=BASE;y>40;y-=26){g.beginPath();g.moveTo(x,y);g.lineTo(x+30,y-26);g.moveTo(x+30,y);g.lineTo(x,y-26);g.stroke()}
      g.lineWidth=7;g.beginPath();g.moveTo(x-140,60);g.lineTo(x+260,60);g.stroke();g.lineWidth=2;
      for(let k=-140;k<260;k+=26){g.beginPath();g.moveTo(x+k,60);g.lineTo(x+k+13,40);g.lineTo(x+k+26,60);g.stroke()}
      g.lineWidth=1.5;g.beginPath();g.moveTo(x+200,60);g.lineTo(x+200,170);g.stroke();g.fillRect(x+188,170,24,16);
      g.fillStyle='#ff3030';g.shadowColor='#f00';g.shadowBlur=10;g.beginPath();g.arc(x+15,36,4,0,TAU);g.fill();g.shadowBlur=0;
    }
  },
  dunes(g,w,rn,o){
    const ph=rn()*9;const gr=g.createLinearGradient(0,BASE-o.amp*2,0,BASE);gr.addColorStop(0,shade(o.col,1.3));gr.addColorStop(1,shade(o.col,.65));
    g.fillStyle=gr;g.beginPath();g.moveTo(0,BASE);for(let x=0;x<=w;x+=12)g.lineTo(x,BASE-o.amp*(.55+.45*Math.sin(x*.0045+ph))-o.amp*.3*Math.sin(x*.013+ph*2));g.lineTo(w,BASE);g.fill();
  },
  ruins(g,w,rn,o){
    for(let x=30;x<w;x+=150+rn()*160){
      const h=90+rn()*190,cw=36+rn()*16,gr=g.createLinearGradient(x,0,x+cw,0);gr.addColorStop(0,shade(o.col,1.4));gr.addColorStop(1,shade(o.col,.6));
      g.fillStyle=gr;g.beginPath();g.moveTo(x,BASE);g.lineTo(x,BASE-h);g.lineTo(x+cw*.3,BASE-h-6);g.lineTo(x+cw*.6,BASE-h+4);g.lineTo(x+cw,BASE-h-3);g.lineTo(x+cw,BASE);g.fill();
      g.fillStyle=shade(o.col,.8);g.fillRect(x-6,BASE-14,cw+12,14);
      g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1.5;for(let k=6;k<cw;k+=9){g.beginPath();g.moveTo(x+k,BASE-h+8);g.lineTo(x+k,BASE-14);g.stroke()}
      if(rn()<.5){g.fillStyle=o.col;g.beginPath();g.arc(x+cw+60,BASE-h*.7,60,Math.PI,0);g.lineTo(x+cw+120,BASE);g.lineTo(x+cw+110,BASE);g.lineTo(x+cw+110,BASE-h*.7);g.arc(x+cw+60,BASE-h*.7,50,0,Math.PI,true);g.lineTo(x+cw+10,BASE);g.lineTo(x+cw,BASE);g.fill()}
    }
  },
  pines(g,w,rn,o){
    for(let x=-20;x<w;x+=50+rn()*70){
      const h=120+rn()*180,tw=34+rn()*28;g.fillStyle=o.col;
      for(let k=0;k<5;k++){const y=BASE-h*(k/5.2),ww=tw*(1-k/5.6);g.beginPath();g.moveTo(x-ww,y);g.lineTo(x,y-h/4.2);g.lineTo(x+ww,y);g.fill()}
      g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.moveTo(x-8,BASE-h*.8);g.lineTo(x,BASE-h-6);g.lineTo(x+8,BASE-h*.8);g.fill();g.fillStyle=o.col;g.fillRect(x-4,BASE-10,8,14);
    }
  },
  volcano(g,w,rn,o){
    for(let x=300;x<w;x+=900+rn()*300){
      g.fillStyle=o.col;g.beginPath();g.moveTo(x-330,BASE);g.lineTo(x-60,BASE-260);g.lineTo(x+60,BASE-260);g.lineTo(x+330,BASE);g.fill();
      const gr=g.createRadialGradient(x,BASE-262,2,x,BASE-262,130);gr.addColorStop(0,'rgba(255,160,40,.95)');gr.addColorStop(1,'transparent');g.fillStyle=gr;g.fillRect(x-130,BASE-390,260,260);
      g.save();g.strokeStyle='#ff7a1a';g.shadowColor='#ff5a0a';g.shadowBlur=14;g.lineWidth=3;for(let i=0;i<3;i++){let xx=x-40+i*40,y=BASE-258;g.beginPath();g.moveTo(xx,y);for(let k=0;k<7;k++){xx+=(i-1)*14+rn()*8-4;y+=26;g.lineTo(xx,y)}g.stroke()}g.restore();
    }
  },
  pagoda(g,w,rn,o){
    for(let x=150;x<w;x+=430+rn()*160){
      g.fillStyle=o.col;const tiers=4+((rn()*2)|0);let y=BASE,tw=110;
      for(let k=0;k<tiers;k++){g.fillRect(x-tw*.4,y-34,tw*.8,34);g.beginPath();g.moveTo(x-tw*.75,y-34);g.quadraticCurveTo(x-tw*.4,y-30,x-tw*.35,y-50);g.lineTo(x+tw*.35,y-50);g.quadraticCurveTo(x+tw*.4,y-30,x+tw*.75,y-34);g.lineTo(x+tw*.5,y-38);g.lineTo(x-tw*.5,y-38);g.fill();y-=48;tw*=.84}
      g.fillRect(x-2,y-40,4,40);g.fillStyle='rgba(255,190,90,.8)';for(let k=0;k<tiers;k++)g.fillRect(x-5,BASE-48*k-28,10,14);
    }
    for(let x=60;x<w;x+=900){g.fillStyle='#8a1a1a';g.fillRect(x,BASE-150,12,150);g.fillRect(x+110,BASE-150,12,150);g.fillRect(x-14,BASE-160,150,12);g.fillRect(x-6,BASE-136,134,8)}
  },
  trees(g,w,rn,o){
    for(let x=60;x<w;x+=260+rn()*180){
      g.strokeStyle=o.col;g.lineCap='round';g.lineWidth=18;g.beginPath();g.moveTo(x,BASE);g.quadraticCurveTo(x+rn()*40-20,BASE-120,x+rn()*60-30,BASE-210);g.stroke();
      g.lineWidth=8;for(let b=0;b<3;b++){g.beginPath();g.moveTo(x,BASE-90-b*30);g.lineTo(x+(b%2?1:-1)*(70+rn()*40),BASE-180-b*20);g.stroke()}
      for(let i=0;i<46;i++){g.fillStyle=['#ff9ac0','#ffc6dc','#ff7aa8','#ffd9e8'][(rn()*4)|0];g.globalAlpha=.75;g.beginPath();g.arc(x+rn()*200-100,BASE-230+rn()*110,10+rn()*20,0,TAU);g.fill()}
      g.globalAlpha=1;
    }
  },
  arches(g,w,rn,o){
    const s=o.sc||1,aw=120*s,ah=170*s;
    for(let x=0;x<w;x+=aw+30*s){
      g.fillStyle=o.col;g.fillRect(x,BASE-ah-70*s,aw+30*s,ah+70*s);
      g.globalCompositeOperation='destination-out';g.beginPath();g.moveTo(x+14*s,BASE);g.lineTo(x+14*s,BASE-ah*.55);g.arc(x+14*s+aw/2-14*s,BASE-ah*.55,aw/2-14*s,Math.PI,0);g.lineTo(x+aw-14*s,BASE);g.fill();g.globalCompositeOperation='source-over';
      const gr=g.createRadialGradient(x+aw/2,BASE-ah*.4,2,x+aw/2,BASE-ah*.4,aw*.6);gr.addColorStop(0,'rgba(190,90,255,.35)');gr.addColorStop(1,'transparent');g.fillStyle=gr;g.fillRect(x,BASE-ah,aw+30*s,ah);
      g.fillStyle='rgba(255,170,60,.9)';g.beginPath();g.arc(x+aw+15*s,BASE-ah-40*s,4,0,TAU);g.fill();
    }
  }
};
function buildStage(i){
  const s=STG[i],rn=mulberry(101+i*37);
  const sky=mk(W,H,(g)=>{
    const gr=g.createLinearGradient(0,0,0,HORIZON+20);gr.addColorStop(0,s.sky[0]);gr.addColorStop(.6,s.sky[1]);gr.addColorStop(1,s.sky[2]);g.fillStyle=gr;g.fillRect(0,0,W,H);
    if(s.stars)for(let k=0;k<110;k++){g.globalAlpha=rn()*.8;g.fillStyle='#fff';g.fillRect(rn()*W,rn()*260,1+rn()*1.5,1+rn()*1.5)}
    g.globalAlpha=1;
    if(s.aurora)for(let b=0;b<3;b++){const gr2=g.createLinearGradient(0,40+b*30,0,230+b*30);gr2.addColorStop(0,'transparent');gr2.addColorStop(.5,['rgba(80,255,170,.4)','rgba(160,120,255,.35)','rgba(80,200,255,.3)'][b]);gr2.addColorStop(1,'transparent');
      g.fillStyle=gr2;g.beginPath();g.moveTo(0,200);for(let x=0;x<=W;x+=20)g.lineTo(x,90+b*30+Math.sin(x*.01+b*2)*40);g.lineTo(W,300);g.lineTo(0,300);g.fill()}
    if(s.sun){const p=s.sun,rg=g.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*2.4);rg.addColorStop(0,p.c);rg.addColorStop(.3,p.c+'55');rg.addColorStop(1,'transparent');g.fillStyle=rg;g.fillRect(0,0,W,H);
      g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.r*.55,0,TAU);g.fill();
      if(i<2){g.fillStyle=s.sky[1];for(let k=0;k<7;k++)g.fillRect(p.x-p.r,p.y+8+k*11,p.r*2,2+k*.7)}}
  });
  const layers=s.layers.map(([k,type,o])=>({k,c:mk(Math.ceil(W+WORLD*k),HORIZON,(g,w)=>LB[type](g,w,rn,o,s))}));
  return {sky,layers};
}
const stageCache={};
function getStage(i){
  if(stageCache[i])return stageCache[i];
  const ks=Object.keys(stageCache);if(ks.length>=2)delete stageCache[ks[0]];
  return stageCache[i]=buildStage(i);
}
const vignette=mk(W,H,(g)=>{const r=g.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.95);r.addColorStop(0,'transparent');r.addColorStop(1,'rgba(0,0,0,.65)');g.fillStyle=r;g.fillRect(0,0,W,H)});
let ambient=[],ambStage=-1,boltT=0;
function initAmbient(i){
  ambStage=i;const p=STG[i].pt;ambient=Array.from({length:p.n},()=>({x:Math.random()*W,y:Math.random()*H,s:rnd(.4,1.4),v:rnd(.3,1),ph:rnd(0,6)}));
}
function drawBG(){
  const s=STG[R.stage],S=getStage(R.stage),off=cam.x-480,z=cam.z;
  if(ambStage!==R.stage)initAmbient(R.stage);
  ctx.drawImage(S.sky,0,0);
  if(s.beam){
    ctx.globalCompositeOperation='lighter';
    for(let b=0;b<3;b++){const bx=140+b*340,a=Math.sin(G.f*.012+b*2)*.5,gr=ctx.createLinearGradient(bx,HORIZON,bx+a*300,0);gr.addColorStop(0,s.beam+'66');gr.addColorStop(1,'transparent');
      ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(bx-10,HORIZON);ctx.lineTo(bx+10,HORIZON);ctx.lineTo(bx+a*300+60,0);ctx.lineTo(bx+a*300-60,0);ctx.fill()}
    ctx.globalCompositeOperation='source-over';
  }
  for(const L of S.layers)ctx.drawImage(L.c,-off*L.k,L.k>.3?6:0);
  if(s.light){
    if(boltT<=0&&Math.random()<.006)boltT=10;
    if(boltT>0){boltT--;ctx.fillStyle='rgba(200,150,255,'+(boltT/10*.35)+')';ctx.fillRect(0,0,W,HORIZON);
      if(boltT>6){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.shadowColor='#c6f';ctx.shadowBlur=18;ctx.beginPath();let x=120+((G.f*37)%700),y=0;ctx.moveTo(x,y);while(y<HORIZON-40){x+=Math.random()*40-20;y+=34;ctx.lineTo(x,y)}ctx.stroke();ctx.shadowBlur=0}}
  }
  // floor
  const fg=ctx.createLinearGradient(0,HORIZON,0,H);fg.addColorStop(0,s.floor[0]);fg.addColorStop(1,s.floor[1]);ctx.fillStyle=fg;ctx.fillRect(0,HORIZON,W,H-HORIZON);
  ctx.save();ctx.strokeStyle=s.line;ctx.lineWidth=1.5;
  if(s.fm==='grid'||s.fm==='tile'){
    ctx.globalAlpha=s.fm==='grid'?.28:.16;
    for(let wx=-200;wx<=WORLD+200;wx+=100){const rx=wx-cam.x;ctx.beginPath();ctx.moveTo(480+rx*.7*z,HORIZON);ctx.lineTo(480+rx*1.45*z,H);ctx.stroke()}
    for(let k=1;k<=9;k++){const y=HORIZON+(H-HORIZON)*Math.pow(k/9,1.7);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  }else if(s.fm==='planks'){
    ctx.globalAlpha=.35;ctx.strokeStyle='#000';
    for(let k=1;k<=12;k++){const y=HORIZON+(H-HORIZON)*Math.pow(k/12,1.5);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    ctx.globalAlpha=.2;for(let wx=-400;wx<=WORLD+400;wx+=170){const rx=wx-cam.x;ctx.beginPath();ctx.moveTo(480+rx*.7*z,HORIZON);ctx.lineTo(480+rx*1.45*z,H);ctx.stroke()}
  }else{ctx.globalAlpha=.1;for(let k=1;k<=6;k++){const y=HORIZON+(H-HORIZON)*Math.pow(k/6,1.8);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}
  ctx.restore();
  ctx.save();ctx.shadowColor=s.line;ctx.shadowBlur=18;ctx.strokeStyle=s.line;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,HORIZON);ctx.lineTo(W,HORIZON);ctx.stroke();ctx.restore();
  const mx=480+((F.length?(F[0].x+F[1].x)/2:cam.x)-cam.x)*z;
  ctx.globalCompositeOperation='lighter';
  const sg=ctx.createRadialGradient(mx,GROUND+10,10,mx,GROUND+10,330);sg.addColorStop(0,s.line+'44');sg.addColorStop(1,'transparent');
  ctx.save();ctx.translate(0,GROUND+10);ctx.scale(1,.28);ctx.translate(0,-(GROUND+10));ctx.fillStyle=sg;ctx.fillRect(mx-340,GROUND-1200,680,3000);ctx.restore();
  // ambient particles
  const p=s.pt;ctx.fillStyle=p.c;ctx.strokeStyle=p.c;
  for(const e of ambient){
    if(p.t==='rise'){e.y-=e.v;e.x+=Math.sin((e.y+G.f)*.02)*.3;if(e.y<0){e.y=H;e.x=Math.random()*W}ctx.globalAlpha=.5;ctx.fillRect(e.x,e.y,e.s*2,e.s*2)}
    else if(p.t==='fall'){e.y+=e.v*1.1;e.x+=Math.sin(G.f*.03+e.ph)*.8+.3;if(e.y>H){e.y=-10;e.x=Math.random()*W}ctx.globalAlpha=.8;
      if(p.leaf){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(G.f*.04+e.ph);ctx.beginPath();ctx.ellipse(0,0,4*e.s,2*e.s,0,0,TAU);ctx.fill();ctx.restore()}else ctx.fillRect(e.x,e.y,e.s*2.2,e.s*2.2)}
    else if(p.t==='rain'){e.y+=14*e.v;e.x-=3*e.v;if(e.y>H){e.y=-20;e.x=Math.random()*(W+60)}ctx.globalAlpha=.35;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+3,e.y-12);ctx.stroke()}
    else{e.x+=e.v*1.4;e.y+=Math.sin(G.f*.02+e.ph)*.3;if(e.x>W){e.x=-5;e.y=Math.random()*H}ctx.globalAlpha=.45;ctx.fillRect(e.x,e.y,e.s*2,e.s*2)}
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
