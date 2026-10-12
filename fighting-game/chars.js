/* ============ CHARACTERS: 30 original fighters + realistic-style procedural renderer ============ */
function shade(c,k){
  let r,g,b;
  if(c[0]==='#'){const n=parseInt(c.slice(1),16);r=n>>16;g=n>>8&255;b=n&255}
  else{const m=c.match(/[\d.]+/g);r=+m[0];g=+m[1];b=+m[2]}
  if(k<1){r*=k;g*=k;b*=k}else{r+=(255-r)*(k-1);g+=(255-g)*(k-1);b+=(255-b)*(k-1)}
  return 'rgb('+(r|0)+','+(g|0)+','+(b|0)+')';
}
const SKIN={pale:'#f3d6bf',light:'#e8bf9a',tan:'#d39f76',olive:'#c4966a',brown:'#a06c45',dark:'#744a2f',ebony:'#4d2f20'};
const DEF={sk:SKIN.tan,hr:'short',hc:'#1a1a1a',fh:'none',top:'bare',tc:'#444',pt:'long',pc:'#333',bt:'#111',sc:'#222',shoe:'boot',gl:null,
  ac:'none',ac2:'#ddd',tat:null,h:1,w:1,g:'m',spd:1,pow:1,rch:1,tk:1,mg:1,fb:'orb',fc:'#4cf',eye:'#2a1a10',crop:false};
/* hr: short spiky long ponytail bun mohawk afro bald slick braids | fh: none beard stache goatee stubble
   top: bare vest tank tee crop jacket gi armor hoodie | pt: long shorts gi cargo | shoe: boot sneaker bare
   ac: none headband bandana mask ninja glasses shades scar gauntlets | fb: orb wave dart */
const RAW=[
 {n:'KAZE',t:'WIND FIST',sk:SKIN.tan,hr:'spiky',hc:'#14141f',top:'gi',tc:'#eef1f6',pt:'gi',pc:'#eef1f6',bt:'#c8102e',shoe:'bare',ac:'headband',ac2:'#c8102e',spd:1.08,fb:'orb',fc:'#4cc9ff'},
 {n:'RAVEN',t:'NIGHT BLADE',sk:SKIN.pale,hr:'long',hc:'#d9dde6',top:'jacket',tc:'#16161c',pt:'long',pc:'#1f2430',sc:'#0c0c10',ac:'scar',spd:1.05,pow:1.05,fb:'dart',fc:'#ff2d55'},
 {n:'JADE',t:'DRAGON LADY',sk:SKIN.tan,g:'f',hr:'ponytail',hc:'#0b0f0c',top:'tank',tc:'#1f9e68',pt:'long',pc:'#16241d',bt:'#2fe89a',shoe:'sneaker',sc:'#e8fff4',w:.86,spd:1.15,pow:.92,fb:'orb',fc:'#2fe89a'},
 {n:'TITAN',t:'IRON BULL',sk:SKIN.brown,hr:'bald',fh:'beard',hc:'#1c120c',top:'vest',tc:'#6b3a14',pt:'cargo',pc:'#3d3a2a',bt:'#222',ac:'gauntlets',h:1.07,w:1.42,spd:.88,pow:1.25,tk:.9,fb:'wave',fc:'#ff8a1f'},
 {n:'ZARA',t:'STREET QUEEN',sk:SKIN.dark,g:'f',hr:'afro',hc:'#150d08',top:'crop',tc:'#ffd23f',pt:'cargo',pc:'#4a5a3a',shoe:'sneaker',sc:'#f5f5f5',ac:'shades',w:.88,spd:1.1,fb:'dart',fc:'#ffd23f'},
 {n:'HAWK',t:'EX-MARINE',sk:SKIN.light,hr:'short',hc:'#d8b45a',fh:'stubble',top:'tank',tc:'#4b5a3a',pt:'cargo',pc:'#55603f',sc:'#2a2a22',w:1.15,pow:1.1,spd:.97,fb:'dart',fc:'#a8d060'},
 {n:'SORA',t:'SKY MONK',sk:SKIN.olive,hr:'bald',top:'gi',tc:'#e8791a',pt:'gi',pc:'#7a4a22',bt:'#f1d9a6',shoe:'bare',tat:'#5a3a1a',spd:1.0,fb:'orb',fc:'#ffb04a'},
 {n:'VIPER',t:'TOXIC ASSASSIN',sk:SKIN.pale,g:'f',hr:'slick',hc:'#2fd84a',top:'tank',tc:'#111418',pt:'long',pc:'#111418',bt:'#2fd84a',ac:'mask',ac2:'#111418',w:.84,spd:1.2,pow:.88,fb:'dart',fc:'#39ff5a'},
 {n:'BRUTUS',t:'PIT FIGHTER',sk:SKIN.light,hr:'mohawk',hc:'#c3261f',fh:'goatee',top:'bare',pt:'shorts',pc:'#1d3f8a',bt:'#f5f5f5',gl:'#e6e0cf',shoe:'sneaker',sc:'#222',tat:'#2a3a5a',w:1.25,pow:1.2,spd:.95,fb:'orb',fc:'#ff5a3a'},
 {n:'LUNA',t:'MOON DANCER',sk:SKIN.pale,g:'f',hr:'long',hc:'#b8a6ff',top:'crop',tc:'#f1ecff',pt:'shorts',pc:'#5b3aa8',bt:'#b8a6ff',sc:'#2a1a50',w:.84,spd:1.14,fb:'orb',fc:'#b08cff'},
 {n:'KANE',t:'CAGE CHAMPION',sk:SKIN.dark,hr:'bald',fh:'stubble',top:'bare',pt:'shorts',pc:'#111',bt:'#c8102e',gl:'#c8102e',shoe:'bare',w:1.18,pow:1.12,fb:'orb',fc:'#ff4040'},
 {n:'MIKA',t:'NEON RACER',sk:SKIN.light,g:'f',hr:'bun',hc:'#ff5fa8',top:'jacket',tc:'#ff3d9a',pt:'shorts',pc:'#f5f5f5',shoe:'sneaker',sc:'#ff3d9a',ac:'glasses',w:.85,spd:1.2,pow:.9,fb:'dart',fc:'#ff5fa8'},
 {n:'DRAKE',t:'DRAGON GANGSTER',sk:SKIN.tan,hr:'slick',hc:'#0c0c0c',top:'tee',tc:'#b01818',pt:'long',pc:'#2a3a5a',sc:'#eee',shoe:'sneaker',tat:'#1a1a1a',ac:'scar',pow:1.08,fb:'orb',fc:'#ff7a3a'},
 {n:'ONYX',t:'SHADOW NINJA',sk:SKIN.tan,hr:'bald',top:'gi',tc:'#17171f',pt:'gi',pc:'#17171f',bt:'#6a2bd8',shoe:'bare',ac:'ninja',ac2:'#17171f',w:.95,spd:1.22,pow:.9,fb:'dart',fc:'#9b5cff'},
 {n:'SAKURA',t:'CHERRY BLOSSOM',sk:SKIN.pale,g:'f',hr:'long',hc:'#1a0f18',top:'gi',tc:'#f6c6d8',pt:'gi',pc:'#fbeef3',bt:'#d6336c',shoe:'bare',w:.84,spd:1.12,fb:'orb',fc:'#ff7aa8'},
 {n:'BOLT',t:'THUNDER SPRINTER',sk:SKIN.ebony,hr:'braids',hc:'#0d0806',top:'jacket',tc:'#f2c200',pt:'shorts',pc:'#15151a',shoe:'sneaker',sc:'#f2c200',w:.95,spd:1.22,pow:.88,fb:'dart',fc:'#ffe14a'},
 {n:'IVAN',t:'SIBERIAN BEAR',sk:SKIN.pale,hr:'short',hc:'#cfa860',fh:'beard',top:'tank',tc:'#8a8f96',pt:'cargo',pc:'#3a4048',sc:'#14161a',h:1.07,w:1.38,spd:.88,pow:1.25,tk:.9,fb:'wave',fc:'#7fd0ff'},
 {n:'NOVA',t:'CYBER AGENT',sk:SKIN.pale,g:'f',hr:'short',hc:'#3a8bff',top:'armor',tc:'#e8f0f8',pt:'long',pc:'#1c2a3d',bt:'#3ad0ff',ac:'glasses',w:.88,spd:1.1,fb:'orb',fc:'#3ad0ff',eye:'#3ad0ff'},
 {n:'RYKER',t:'BOUNTY HUNTER',sk:SKIN.olive,hr:'short',hc:'#3a2a1a',fh:'goatee',top:'jacket',tc:'#6b4a2a',pt:'long',pc:'#3d3a33',ac:'bandana',ac2:'#a02a1a',pow:1.08,fb:'dart',fc:'#ff9a3a'},
 {n:'AMARA',t:'SAVANNA WARRIOR',sk:SKIN.ebony,g:'f',hr:'braids',hc:'#0a0605',top:'crop',tc:'#b8782a',pt:'shorts',pc:'#6b3a1a',bt:'#f2c200',gl:'wrap',shoe:'bare',tat:'#f2e2c0',w:.9,pow:1.05,fb:'wave',fc:'#ffc84a'},
 {n:'SHADE',t:'PHANTOM',sk:SKIN.pale,hr:'short',hc:'#222',top:'hoodie',tc:'#1c1c24',pt:'long',pc:'#33353d',ac:'mask',ac2:'#e8e8ee',spd:1.12,fb:'dart',fc:'#a07aff'},
 {n:'GRIZZ',t:'MOUNTAIN BRAWLER',sk:SKIN.light,hr:'long',hc:'#5a3a22',fh:'beard',top:'bare',pt:'long',pc:'#3a4a6a',bt:'#5a3a22',tat:'#6a4a3a',h:1.08,w:1.4,spd:.86,pow:1.25,tk:.88,fb:'wave',fc:'#d08a4a'},
 {n:'YUKI',t:'ICE MAIDEN',sk:SKIN.pale,g:'f',hr:'long',hc:'#cfe8ff',top:'tank',tc:'#e8f6ff',pt:'long',pc:'#6a9ad8',bt:'#9ad8ff',shoe:'boot',sc:'#cfe8ff',w:.84,spd:1.1,fb:'orb',fc:'#9ae6ff'},
 {n:'CRUZ',t:'CAPOEIRA MASTER',sk:SKIN.brown,hr:'afro',hc:'#150d08',top:'bare',pt:'gi',pc:'#f6f6f2',bt:'#3aa05a',shoe:'bare',w:1.0,spd:1.18,pow:.95,fb:'dart',fc:'#4ade80'},
 {n:'TEMPEST',t:'STORM CALLER',sk:SKIN.dark,hr:'mohawk',hc:'#f0f0ff',top:'armor',tc:'#4a2a8a',pt:'long',pc:'#1e1a30',bt:'#e8c24a',ac:'gauntlets',w:1.12,pow:1.12,fb:'wave',fc:'#c06bff'},
 {n:'DAGGER',t:'BLADE DANCER',sk:SKIN.tan,g:'f',hr:'ponytail',hc:'#7a0f1a',top:'vest',tc:'#15151a',pt:'cargo',pc:'#2a2a30',bt:'#c8102e',ac:'gauntlets',w:.86,spd:1.16,fb:'dart',fc:'#ff3355'},
 {n:'MAYA',t:'JUNGLE PRIESTESS',sk:SKIN.brown,g:'f',hr:'long',hc:'#0a0806',top:'crop',tc:'#2a7a4a',pt:'shorts',pc:'#5a3a1a',bt:'#e8c24a',ac:'headband',ac2:'#e8c24a',tat:'#e8d8b0',shoe:'bare',w:.86,fb:'orb',fc:'#ffd24a'},
 {n:'OGRE',t:'COLOSSUS',sk:SKIN.olive,hr:'bald',fh:'stubble',top:'bare',pt:'shorts',pc:'#4a4036',bt:'#222',ac:'scar',gl:'#3a3a3a',h:1.12,w:1.55,spd:.82,pow:1.32,tk:.85,fb:'wave',fc:'#ff5030'},
 {n:'PHOENIX',t:'FLAME FIST',sk:SKIN.light,hr:'spiky',hc:'#ff6a1a',top:'jacket',tc:'#b81d12',pt:'long',pc:'#17171c',gl:'#17171c',ac:'none',mg:1.2,pow:1.08,spd:1.08,fb:'orb',fc:'#ff7a2a'},
 {n:'OMEGA',t:'THE FINAL KING',sk:SKIN.tan,hr:'long',hc:'#e8e8f2',fh:'beard',top:'armor',tc:'#16121c',pt:'long',pc:'#16121c',bt:'#e8b830',ac:'gauntlets',h:1.1,w:1.25,spd:1.1,pow:1.2,rch:1.1,mg:1.5,tk:.9,fb:'wave',fc:'#ff2dd2',eye:'#ff2dd2'}
];
const ROSTER=RAW.map(r=>{
  const d=Object.assign({},DEF,r);
  d.name=d.n;d.title=d.t;d.c2=d.fc;d.c1=d.pc;d.acc=d.fc;d.skin=d.sk;return d;
});
const FBTYPES={orb:{v:10,dmg:8,r:34,life:140},wave:{v:7,dmg:11,r:48,life:150},dart:{v:16,dmg:6,r:24,life:100}};

/* ---------- drawing helpers ---------- */
function tseg(a,b,w1,w2,col,fl){
  const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1;let nx=-dy/L,ny=dx/L;if(ny>0){nx=-nx;ny=-ny}
  const g=ctx.createLinearGradient(a.x+nx*w1/2,a.y+ny*w1/2,a.x-nx*w1/2,a.y-ny*w1/2);
  g.addColorStop(0,fl?'#fff':shade(col,1.2));g.addColorStop(.45,fl?'#fff':col);g.addColorStop(1,fl?'#e6e6e6':shade(col,.6));
  ctx.beginPath();ctx.moveTo(a.x+nx*w1/2,a.y+ny*w1/2);ctx.lineTo(b.x+nx*w2/2,b.y+ny*w2/2);ctx.lineTo(b.x-nx*w2/2,b.y-ny*w2/2);ctx.lineTo(a.x-nx*w1/2,a.y-ny*w1/2);ctx.closePath();
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();ctx.arc(b.x,b.y,w2/2,0,TAU);ctx.fillStyle=fl?'#fff':col;ctx.fill();
}
const lp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
function drawLeg(hip,knee,foot,back,d,fl){
  const w=d.w,sk=back?shade(d.sk,.78):d.sk,pc=back?shade(d.pc,.76):d.pc,sc=back?shade(d.sc,.76):d.sc;
  const gi=d.pt==='gi',sh=d.pt==='shorts',kw=gi?1.2:1;
  if(sh){
    tseg(hip,knee,21*w,15*w,sk,fl);tseg(knee,foot,15*w,10.5*w,sk,fl);
    tseg(hip,lp(hip,knee,.62),24*w,21*w,pc,fl);
  }else{
    tseg(hip,knee,21*w*kw,15.5*w*kw,pc,fl);tseg(knee,foot,15*w*kw,gi?13*w:10.5*w,pc,fl);
    if(d.pt==='cargo'){const p=lp(hip,knee,.45);ctx.fillStyle=fl?'#fff':shade(pc,.8);ctx.fillRect(p.x-5,p.y-4,11,10)}
    if(gi){ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1.5;ctx.beginPath();const p=lp(knee,foot,.5);ctx.moveTo(p.x-7,p.y);ctx.lineTo(p.x+6,p.y+3);ctx.stroke()}
  }
  const fx=foot.x,fy=foot.y;
  if(d.shoe==='bare'){ctx.beginPath();ctx.ellipse(fx+6,fy-3.5,12,6,0,0,TAU);ctx.fillStyle=fl?'#fff':sk;ctx.fill()}
  else{
    if(d.shoe==='boot')tseg(lp(knee,foot,.55),foot,13*w,12*w,sc,fl);
    ctx.beginPath();ctx.ellipse(fx+7,fy-4,14,7,0,0,TAU);ctx.fillStyle=fl?'#fff':sc;ctx.fill();
    ctx.fillStyle=fl?'#fff':(d.shoe==='sneaker'?'#f4f4f4':shade(sc,.55));ctx.fillRect(fx-6,fy-2,26,3);
  }
}
function drawArm(sh,m,e,back,d,fl){
  const w=d.w,sk=back?shade(d.sk,.78):d.sk,tc=back?shade(d.tc,.76):d.tc;
  let su=0,sf=0;
  switch(d.top){case'tee':su=.6;break;case'jacket':case'hoodie':su=1;sf=1;break;case'gi':su=1;sf=.5;break;case'armor':su=1;break}
  tseg(sh,m,13.5*w,10.5*w,sk,fl);tseg(m,e,10.5*w,8*w,sk,fl);
  if(d.tat&&!back){ctx.strokeStyle=d.tat;ctx.lineWidth=2;ctx.beginPath();const p=lp(sh,m,.4),q=lp(sh,m,.8);ctx.moveTo(p.x-5,p.y);ctx.lineTo(q.x+4,q.y+3);ctx.moveTo(p.x+4,p.y-2);ctx.lineTo(q.x-4,q.y+2);ctx.stroke()}
  if(su)tseg(sh,su>=1?m:lp(sh,m,su),16*w,su>=1?13*w:14*w,tc,fl);
  if(sf)tseg(m,lp(m,e,sf),12.5*w,sf>=1?11*w:14*w,tc,fl);
  if(d.ac==='gauntlets'||d.top==='armor'){tseg(lp(m,e,.25),lp(m,e,.95),12.5*w,11*w,back?'#6d727b':'#a4aab4',fl);ctx.fillStyle=fl?'#fff':d.fc;ctx.beginPath();const c=lp(m,e,.6);ctx.arc(c.x,c.y,2,0,TAU);ctx.fill()}
  if(d.gl==='wrap'){tseg(lp(m,e,.4),lp(m,e,.95),12*w,11*w,'#efe9d8',fl)}
  const glove=d.gl&&d.gl!=='wrap'?(back?shade(d.gl,.78):d.gl):null,r=glove?9.5:7.8;
  const gg=ctx.createRadialGradient(e.x-2,e.y-3,1,e.x,e.y,r+2);gg.addColorStop(0,fl?'#fff':shade(glove||sk,1.25));gg.addColorStop(1,fl?'#fff':shade(glove||sk,.72));
  ctx.beginPath();ctx.arc(e.x,e.y,r,0,TAU);ctx.fillStyle=gg;ctx.fill();ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1.2;ctx.stroke();
}
function drawTorso(P,d,fl,f){
  const {sh,hip}=P,w=d.w,fem=d.g==='f',top=d.top;
  const sw=(fem?15.5:19)*w,ww=(fem?10.5:13.5)*w,hw=(fem?14:14)*w;
  const mid=lp(sh,hip,.55);
  const path=(ext)=>{ctx.beginPath();ctx.moveTo(sh.x-sw,sh.y+3);ctx.lineTo(sh.x+sw,sh.y+3);ctx.lineTo(mid.x+ww,mid.y);ctx.lineTo(hip.x+hw,hip.y+(ext||0));ctx.lineTo(hip.x-hw,hip.y+(ext||0));ctx.lineTo(mid.x-ww,mid.y);ctx.closePath()};
  const grad=(c,k)=>{const g=ctx.createLinearGradient(sh.x-sw,0,sh.x+sw,0);g.addColorStop(0,fl?'#fff':shade(c,.58));g.addColorStop(.5,fl?'#fff':c);g.addColorStop(1,fl?'#fff':shade(c,1.22));return g};
  const dark='rgba(0,0,0,.3)';
  const muscle=()=>{
    ctx.strokeStyle=dark;ctx.lineWidth=1.8;ctx.beginPath();
    ctx.moveTo(sh.x-sw*.7,sh.y+17);ctx.quadraticCurveTo(sh.x+sw*.1,sh.y+27,sh.x+sw*.95,sh.y+16);ctx.stroke();
    if(!fem){for(let i=0;i<3;i++){const y=lerp(sh.y+32,hip.y-8,i/2.6),x=lerp(sh.x,hip.x,(y-sh.y)/(hip.y-sh.y));ctx.beginPath();ctx.moveTo(x-5*w,y);ctx.lineTo(x+7*w,y);ctx.stroke()}
      ctx.beginPath();ctx.moveTo(sh.x+2,sh.y+30);ctx.lineTo(hip.x+2,hip.y-6);ctx.stroke()}
  };
  const tatt=()=>{if(d.tat){ctx.strokeStyle=d.tat;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(sh.x-sw*.6,sh.y+9);ctx.quadraticCurveTo(sh.x-sw*.2,sh.y+22,sh.x-sw*.5,sh.y+34);ctx.moveTo(sh.x-sw*.3,sh.y+8);ctx.lineTo(sh.x-sw*.7,sh.y+24);ctx.stroke()}};
  // skin base
  path();ctx.fillStyle=grad(d.sk);ctx.fill();
  if(top==='bare'||top==='vest'){muscle();tatt()}
  const cloth=(ext)=>{path(ext);ctx.fillStyle=grad(d.tc);ctx.fill()};
  switch(top){
    case'tank':case'tee':case'crop':{
      cloth();
      ctx.fillStyle=fl?'#fff':d.sk;ctx.beginPath();ctx.moveTo(sh.x+3,sh.y+3);ctx.lineTo(sh.x+11*w,sh.y+3);ctx.lineTo(sh.x+7,sh.y+15);ctx.closePath();ctx.fill();
      if(top==='crop'||fem&&top==='tank'&&false){const y=lerp(sh.y,hip.y,.62);ctx.beginPath();ctx.moveTo(mid.x-ww-1,y);ctx.lineTo(mid.x+ww+1,y);ctx.lineTo(hip.x+hw,hip.y);ctx.lineTo(hip.x-hw,hip.y);ctx.closePath();ctx.fillStyle=grad(d.sk);ctx.fill();ctx.fillStyle=dark;ctx.fillRect(hip.x-1,y+2,2,hip.y-y-6)}
      break}
    case'vest':{
      cloth();
      ctx.beginPath();ctx.moveTo(sh.x+1,sh.y+3);ctx.lineTo(sh.x+sw*.5,sh.y+3);ctx.lineTo(hip.x+hw*.2,hip.y);ctx.lineTo(hip.x-hw*.15,hip.y);ctx.closePath();ctx.fillStyle=grad(d.sk);ctx.fill();muscle();
      ctx.strokeStyle=fl?'#fff':shade(d.tc,.5);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sh.x+1,sh.y+3);ctx.lineTo(hip.x-hw*.15,hip.y);ctx.stroke();break}
    case'jacket':{
      cloth(5);
      ctx.strokeStyle=fl?'#fff':'rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sh.x+4,sh.y+4);ctx.lineTo(hip.x+3,hip.y+4);ctx.stroke();
      ctx.fillStyle=fl?'#fff':d.fc;ctx.globalAlpha=.8;ctx.fillRect(sh.x-sw+1,sh.y+3,3,hip.y-sh.y);ctx.globalAlpha=1;
      ctx.fillStyle=fl?'#fff':shade(d.tc,.7);ctx.beginPath();ctx.moveTo(sh.x-6,sh.y-1);ctx.lineTo(sh.x+10,sh.y-1);ctx.lineTo(sh.x+5,sh.y+10);ctx.lineTo(sh.x-4,sh.y+8);ctx.closePath();ctx.fill();
      ctx.fillStyle=fl?'#fff':d.sk;ctx.beginPath();ctx.moveTo(sh.x+4,sh.y+3);ctx.lineTo(sh.x+9,sh.y+3);ctx.lineTo(sh.x+6,sh.y+11);ctx.closePath();ctx.fill();break}
    case'gi':{
      cloth(3);
      ctx.fillStyle=fl?'#fff':d.sk;ctx.beginPath();ctx.moveTo(sh.x-3,sh.y+3);ctx.lineTo(sh.x+12,sh.y+3);ctx.lineTo(hip.x+5,mid.y+8);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sh.x-3,sh.y+3);ctx.lineTo(hip.x+5,mid.y+8);ctx.lineTo(sh.x+12,sh.y+3);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sh.x+12,sh.y+3);ctx.lineTo(hip.x-4,mid.y+14);ctx.stroke();break}
    case'armor':{
      cloth(3);
      const ag=ctx.createLinearGradient(0,sh.y,0,hip.y);ag.addColorStop(0,'rgba(255,255,255,.28)');ag.addColorStop(1,'rgba(0,0,0,.2)');path();ctx.fillStyle=ag;ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sh.x-sw*.8,sh.y+20);ctx.lineTo(sh.x+sw*.9,sh.y+20);ctx.moveTo(mid.x-ww,mid.y+4);ctx.lineTo(mid.x+ww,mid.y+4);ctx.moveTo(sh.x+1,sh.y+3);ctx.lineTo(hip.x+1,hip.y);ctx.stroke();
      ctx.fillStyle=fl?'#fff':d.fc;ctx.beginPath();ctx.arc(sh.x+5,sh.y+13,4,0,TAU);ctx.fill();
      ctx.fillStyle=fl?'#fff':shade(d.tc,1.25);ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sh.x-1,sh.y+3,15*w,10,0,0,TAU);ctx.fill();ctx.stroke();
      ctx.strokeStyle=fl?'#fff':d.fc;ctx.beginPath();ctx.ellipse(sh.x-1,sh.y+3,15*w,10,0,Math.PI,TAU);ctx.stroke();break}
    case'hoodie':{
      cloth(5);
      ctx.fillStyle=fl?'#fff':shade(d.tc,.7);ctx.beginPath();ctx.ellipse(sh.x-8,sh.y-2,13,9,-.3,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(sh.x+4,sh.y+4);ctx.lineTo(sh.x+3,sh.y+20);ctx.moveTo(sh.x+8,sh.y+4);ctx.lineTo(sh.x+8,sh.y+18);ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.moveTo(hip.x-hw+3,hip.y-12);ctx.quadraticCurveTo(hip.x,hip.y-4,hip.x+hw-3,hip.y-12);ctx.stroke();
      ctx.fillStyle=fl?'#fff':d.sk;ctx.beginPath();ctx.moveTo(sh.x+4,sh.y+3);ctx.lineTo(sh.x+9,sh.y+3);ctx.lineTo(sh.x+6,sh.y+9);ctx.closePath();ctx.fill();break}
  }
  // waistband / belt
  const open=top==='bare'||top==='vest'||top==='tank'||top==='tee'||top==='crop';
  if(open){
    ctx.beginPath();ctx.moveTo(mid.x-ww-.5,lerp(mid.y,hip.y,.55));ctx.lineTo(mid.x+ww+.5,lerp(mid.y,hip.y,.55));ctx.lineTo(hip.x+hw,hip.y+3);ctx.lineTo(hip.x-hw,hip.y+3);ctx.closePath();
    ctx.fillStyle=fl?'#fff':(d.pt==='shorts'?d.pc:d.pc);ctx.fill();
  }
  ctx.fillStyle=fl?'#fff':d.bt;ctx.fillRect(hip.x-hw-1,hip.y-5,hw*2+2,7);
  ctx.fillStyle=fl?'#fff':'#e8d27a';ctx.fillRect(hip.x+2,hip.y-5,6,7);
  if(top==='gi'){ctx.fillStyle=fl?'#fff':d.bt;ctx.beginPath();ctx.moveTo(hip.x+3,hip.y+2);ctx.lineTo(hip.x+7,hip.y+16+Math.sin(f.t*.1)*1.5);ctx.lineTo(hip.x+11,hip.y+14);ctx.lineTo(hip.x+8,hip.y+1);ctx.closePath();ctx.fill()}
}
function drawHeadBack(hx,hy,d,fl,f){
  const hc=fl?'#fff':d.hc,t=f.t,sw=Math.sin(t*.14)*2;
  ctx.fillStyle=hc;ctx.strokeStyle=hc;
  switch(d.hr){
    case'long':{ctx.beginPath();ctx.moveTo(hx+2,hy-12);ctx.quadraticCurveTo(hx-22,hy-8,hx-20+sw,hy+26);ctx.lineTo(hx-6,hy+30);ctx.quadraticCurveTo(hx-8,hy+10,hx+2,hy+4);ctx.fill();break}
    case'ponytail':{ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hx-8,hy-8);ctx.bezierCurveTo(hx-26,hy-10+sw,hx-28,hy+12,hx-20-sw,hy+30);ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(hx-8,hy-8);ctx.bezierCurveTo(hx-30,hy-4,hx-32,hy+10,hx-26,hy+24);ctx.stroke();break}
    case'bun':{ctx.beginPath();ctx.arc(hx-7,hy-17,7,0,TAU);ctx.fill();break}
    case'afro':{ctx.beginPath();ctx.arc(hx-3,hy-6,21,0,TAU);ctx.fill();break}
    case'braids':{ctx.lineWidth=3.5;ctx.lineCap='round';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(hx-8+i*2,hy-8);ctx.quadraticCurveTo(hx-14-i*4,hy+8,hx-12-i*4+sw*(i%2?1:-1),hy+28+i*3);ctx.stroke()}break}
    case'slick':{ctx.beginPath();ctx.moveTo(hx+2,hy-12);ctx.quadraticCurveTo(hx-20,hy-8,hx-18,hy+6);ctx.lineTo(hx-4,hy+4);ctx.fill();break}
    case'short':case'spiky':{ctx.beginPath();ctx.arc(hx-4,hy,12,Math.PI*.5,Math.PI*1.5);ctx.fill();break}
  }
}
function drawHeadFront(hx,hy,d,fl,f){
  const hc=fl?'#fff':d.hc,hurt=f.state==='hit'||f.state==='down'||f.state==='ko';
  ctx.fillStyle=hc;ctx.strokeStyle=hc;
  switch(d.hr){
    case'short':case'slick':case'long':case'ponytail':case'bun':case'braids':{
      ctx.beginPath();ctx.moveTo(hx-12,hy+2);ctx.quadraticCurveTo(hx-14,hy-15,hx+2,hy-15);ctx.quadraticCurveTo(hx+11,hy-14,hx+12,hy-6);ctx.quadraticCurveTo(hx+5,hy-9,hx-1,hy-6);ctx.quadraticCurveTo(hx-6,hy-3,hx-9,hy+3);ctx.closePath();ctx.fill();break}
    case'spiky':{
      ctx.beginPath();ctx.moveTo(hx-13,hy+2);ctx.lineTo(hx-18,hy-8);ctx.lineTo(hx-10,hy-8);ctx.lineTo(hx-13,hy-20);ctx.lineTo(hx-3,hy-14);ctx.lineTo(hx,hy-24);ctx.lineTo(hx+5,hy-14);ctx.lineTo(hx+14,hy-19);ctx.lineTo(hx+12,hy-6);ctx.quadraticCurveTo(hx+4,hy-9,hx-2,hy-6);ctx.quadraticCurveTo(hx-6,hy-3,hx-9,hy+3);ctx.closePath();ctx.fill();break}
    case'mohawk':{
      ctx.beginPath();ctx.moveTo(hx-12,hy-2);for(let i=0;i<6;i++){ctx.lineTo(hx-11+i*4.6,hy-14-(i%2?6:11)+Math.abs(i-2.5)*2);ctx.lineTo(hx-8+i*4.6,hy-12)}ctx.lineTo(hx+8,hy-10);ctx.lineTo(hx-8,hy-8);ctx.closePath();ctx.fill();break}
    case'afro':{ctx.beginPath();ctx.moveTo(hx-12,hy+1);ctx.quadraticCurveTo(hx-12,hy-14,hx+3,hy-14);ctx.quadraticCurveTo(hx+11,hy-13,hx+12,hy-6);ctx.quadraticCurveTo(hx+4,hy-8,hx-6,hy-5);ctx.closePath();ctx.fill();break}
  }
  // facial hair
  const fh=d.fh;
  if(fh==='beard'){ctx.beginPath();ctx.moveTo(hx-5,hy+1);ctx.quadraticCurveTo(hx-2,hy+16,hx+8,hy+15);ctx.quadraticCurveTo(hx+13,hy+10,hx+12,hy+3);ctx.quadraticCurveTo(hx+8,hy+7,hx+4,hy+5);ctx.quadraticCurveTo(hx,hy+4,hx-5,hy+1);ctx.fill()}
  else if(fh==='goatee'){ctx.beginPath();ctx.moveTo(hx+3,hy+8);ctx.lineTo(hx+11,hy+8);ctx.lineTo(hx+9,hy+16);ctx.lineTo(hx+4,hy+14);ctx.closePath();ctx.fill();ctx.fillRect(hx+5,hy+5,7,2)}
  else if(fh==='stache'){ctx.fillRect(hx+3,hy+5,9,2.5)}
  else if(fh==='stubble'){ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(hx-4,hy+2);ctx.quadraticCurveTo(hx,hy+15,hx+9,hy+14);ctx.quadraticCurveTo(hx+12,hy+9,hx+12,hy+4);ctx.quadraticCurveTo(hx+5,hy+8,hx-4,hy+2);ctx.fill();ctx.globalAlpha=1}
  // accessories
  const ac=d.ac;
  if(ac==='headband'||ac==='bandana'){
    const c=fl?'#fff':d.ac2;ctx.strokeStyle=c;ctx.lineWidth=4.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hx-13,hy-5);ctx.lineTo(hx+12.5,hy-8);ctx.stroke();
    ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(hx-13,hy-5);ctx.quadraticCurveTo(hx-26-Math.abs(f.vx)*2,hy+Math.sin(f.t*.3)*5,hx-37-Math.abs(f.vx)*3,hy+8+Math.sin(f.t*.3+1)*6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(hx-13,hy-5);ctx.quadraticCurveTo(hx-24,hy+6,hx-32,hy+14+Math.sin(f.t*.3)*4);ctx.stroke();
  }
  if(ac==='mask'){ctx.fillStyle=fl?'#fff':d.ac2;ctx.beginPath();ctx.moveTo(hx-2,hy+1);ctx.lineTo(hx+13,hy+1);ctx.quadraticCurveTo(hx+11,hy+14,hx+4,hy+15);ctx.quadraticCurveTo(hx-3,hy+10,hx-2,hy+1);ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1;ctx.stroke()}
  if(ac==='ninja'){ctx.fillStyle=fl?'#fff':d.ac2;ctx.beginPath();ctx.arc(hx+1,hy+1,14.5,0,TAU);ctx.fill();
    ctx.fillStyle=fl?'#fff':d.sk;ctx.beginPath();ctx.moveTo(hx+0,hy-4);ctx.lineTo(hx+14,hy-5);ctx.lineTo(hx+14,hy+3);ctx.lineTo(hx+1,hy+3);ctx.closePath();ctx.fill()}
  // eyes
  const ex=hx+7,ey=hy-1;
  if(hurt){ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ex-3,ey-3);ctx.lineTo(ex+3,ey);ctx.moveTo(ex-3,ey);ctx.lineTo(ex+3,ey-3);ctx.stroke();
    if(ac!=='mask'&&ac!=='ninja'){ctx.fillStyle='#4a1010';ctx.beginPath();ctx.ellipse(hx+8,hy+8,3,4,0,0,TAU);ctx.fill()}}
  else{
    ctx.fillStyle=fl?'#fff':'#f4f4f0';ctx.beginPath();ctx.ellipse(ex,ey,4.2,2.8,0,0,TAU);ctx.fill();
    ctx.fillStyle=fl?'#fff':d.eye;ctx.beginPath();ctx.arc(ex+1.4,ey,2,0,TAU);ctx.fill();
    ctx.strokeStyle=fl?'#fff':shade(d.hc==='#e8e8f2'||d.hc==='#cfe8ff'||d.hc==='#d9dde6'?'#555555':d.hc,.8);ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(ex-4,ey-5.5);ctx.lineTo(ex+5,ey-3.2);ctx.stroke();
    if(ac!=='mask'&&ac!=='ninja'){ctx.strokeStyle='rgba(60,20,20,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(hx+5,hy+8);ctx.lineTo(hx+11,hy+8);ctx.stroke()}
  }
  if(ac==='glasses'||ac==='shades'){ctx.fillStyle=ac==='shades'?'rgba(10,10,15,.92)':'rgba(120,220,255,.35)';ctx.strokeStyle='#111';ctx.lineWidth=1.8;
    ctx.beginPath();ctx.rect(hx+2,hy-5,12,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(hx+2,hy-3);ctx.lineTo(hx-11,hy-3);ctx.stroke()}
  if(ac==='scar'){ctx.strokeStyle='rgba(150,40,40,.85)';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(hx+3,hy-10);ctx.lineTo(hx+9,hy+7);ctx.stroke()}
}
function drawFighter(f,noAura){
  const P=pose(f),d=f.def,fl=f.flash>0&&f.flash%4<2,w=d.w,fem=d.g==='f';
  ctx.save();
  ctx.translate(f.x,-f.y);ctx.scale(f.facing*d.h,d.h);
  if(f.rot){const lie=Math.min(1,Math.abs(f.rot)/1.5),off=60*lie*(1-Math.min(1,f.y/70));ctx.translate(0,off);ctx.translate(0,-70);ctx.rotate(f.rot);ctx.translate(0,70)}
  if(!noAura&&(f.meter>=100||(f.mv==='sup'&&f.state==='attack'))){
    ctx.globalCompositeOperation='lighter';
    const pu=.6+Math.sin(G.f*.25)*.25,ag=ctx.createRadialGradient(0,-90,10,0,-90,130);
    ag.addColorStop(0,d.fc+'88');ag.addColorStop(1,'transparent');ctx.globalAlpha=pu;ctx.fillStyle=ag;ctx.fillRect(-140,-230,280,260);
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  ctx.lineCap='round';ctx.lineJoin='round';
  // back leg, back arm
  drawLeg(P.hip,P.lb.m,P.lb.e,true,d,fl);
  drawArm(P.sh,P.ab.m,P.ab.e,true,d,fl);
  // neck + torso + head back hair
  drawHeadBack(P.head.x,P.head.y,d,fl,f);
  tseg(P.sh,{x:P.head.x,y:P.head.y+8},(fem?9:12)*w,(fem?8:11)*w,shade(d.sk,.88),fl);
  drawTorso(P,d,fl,f);
  // head
  const hx=P.head.x,hy=P.head.y,hg=ctx.createRadialGradient(hx+5,hy-4,2,hx,hy,16);
  hg.addColorStop(0,fl?'#fff':shade(d.sk,1.15));hg.addColorStop(1,fl?'#fff':shade(d.sk,.78));
  ctx.beginPath();ctx.ellipse(hx+.5,hy+1,11.8,13.6,0,0,TAU);ctx.fillStyle=hg;ctx.fill();
  ctx.beginPath();ctx.moveTo(hx+11,hy-1);ctx.lineTo(hx+15,hy+4);ctx.lineTo(hx+11,hy+5);ctx.fillStyle=fl?'#fff':shade(d.sk,.92);ctx.fill();
  ctx.beginPath();ctx.ellipse(hx-4,hy+2,3,4.2,0,0,TAU);ctx.fillStyle=fl?'#fff':shade(d.sk,.8);ctx.fill();
  drawHeadFront(hx,hy,d,fl,f);
  // front leg, front arm
  drawLeg(P.hip,P.lf.m,P.lf.e,false,d,fl);
  drawArm(P.sh,P.af.m,P.af.e,false,d,fl);
  ctx.restore();
}
/* portrait cache for select screen */
const PORT={};
function portrait(i){
  if(PORT[i])return PORT[i];
  const d=ROSTER[i],c=document.createElement('canvas');c.width=84;c.height=84;
  const g=c.getContext('2d'),pf=mkFighter(9,d,false);pf.t=12;pf.x=0;pf.y=0;
  const save=ctx;
  const gr=g.createLinearGradient(0,0,0,84);gr.addColorStop(0,shade(d.fc,.35));gr.addColorStop(1,'#0a0612');g.fillStyle=gr;g.fillRect(0,0,84,84);
  g.save();g.translate(44,138);g.scale(.7,.7);
  // temporarily draw to portrait canvas
  window.ctx_swap=true;
  const _ctx=ctx;ctx=g;
  try{drawFighter(pf,true)}finally{ctx=_ctx}
  g.restore();
  g.strokeStyle='rgba(255,255,255,.15)';g.strokeRect(.5,.5,83,83);
  return PORT[i]=c;
}
