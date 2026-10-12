/* ============ STREET CLASH — single file fighting game ============ */
const cv=document.getElementById('c');let ctx=cv.getContext('2d');
const W=960,H=540,GROUND=450,HORIZON=410,WORLD=1700,MAXD=640,GRAV=.85;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, rnd=(a=0,b=1)=>a+Math.random()*(b-a);
const TAU=Math.PI*2;
/* ---------------- resize ---------------- */
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);cv.style.width=(W*s)+'px';cv.style.height=(H*s)+'px'}
addEventListener('resize',resize);resize();

/* ---------------- audio ---------------- */
let AC=null,master,musicG,noiseBuf,musicOn=true;
function initAudio(){
  if(AC)return;
  try{
    AC=new(window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();master.gain.value=.55;master.connect(AC.destination);
    musicG=AC.createGain();musicG.gain.value=.22;musicG.connect(AC.destination);
    noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
    const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    setInterval(sched,30);
  }catch(e){AC=null}
}
function tone(f,dur,type='sine',vol=.3,slide=0,dest,when=0){
  if(!AC)return;const t=AC.currentTime+when,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(dest||master);o.start(t);o.stop(t+dur+.03);
}
function noise(dur,vol=.3,fq=1000,q=1,type='lowpass',dest,when=0){
  if(!AC)return;const t=AC.currentTime+when,s=AC.createBufferSource(),fl=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=noiseBuf;fl.type=type;fl.frequency.value=fq;fl.Q.value=q;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(fl);fl.connect(g);g.connect(dest||master);s.start(t,Math.random()*.5);s.stop(t+dur+.03);
}
const SFX={
  punch(){noise(.09,.55,2200,1,'bandpass');tone(150,.1,'sine',.6,-90)},
  kick(){noise(.13,.65,1500,1,'bandpass');tone(95,.18,'sine',.8,-55)},
  heavy(){noise(.22,.8,900,1,'bandpass');tone(70,.3,'sine',1,-40);tone(300,.1,'square',.12,-200)},
  block(){noise(.05,.45,4200,2,'highpass');tone(520,.05,'square',.14)},
  whoosh(){noise(.14,.14,900,.8,'bandpass')},
  fire(){tone(260,.45,'sawtooth',.2,600);noise(.3,.2,2000)},
  ko(){tone(220,1,'sawtooth',.45,-170);noise(.7,.6,300)},
  jump(){tone(240,.12,'sine',.18,220)},
  land(){noise(.07,.25,300)},
  sup(){tone(90,1.1,'sawtooth',.4,900);noise(.9,.3,1200,1,'highpass')},
  ui(){tone(720,.07,'square',.12)},
  round(){tone(330,.25,'square',.18);tone(440,.35,'square',.18,0,null,.14)},
  fight(){tone(220,.5,'sawtooth',.3,300);noise(.3,.4,1500)}
};
const sfx=n=>{try{SFX[n]&&SFX[n]()}catch(e){}};
const BASS=[55,0,55,55,0,55,0,65.4, 49,0,49,49,0,49,0,58.3, 43.65,0,43.65,43.65,0,43.65,0,55, 49,0,49,49,0,49,65.4,73.4];
const ARP=[220,262,330,262,294,349,440,349];
let mStep=0,mNext=0;
function sched(){
  if(!AC||!musicOn)return;
  if(mNext<AC.currentTime)mNext=AC.currentTime+.05;
  while(mNext<AC.currentTime+.2){
    const s=mStep,w=mNext-AC.currentTime;
    if(BASS[s]){tone(BASS[s]*2,.16,'sawtooth',.5,0,musicG,w)}
    if(s%4==0){tone(130,.14,'sine',1,-90,musicG,w)}
    if(s%8==4){noise(.12,.5,1800,1,'bandpass',musicG,w)}
    if(s%2==1){noise(.04,.25,7000,1,'highpass',musicG,w)}
    if(s%2==0){tone(ARP[(s>>1)%8]*(s>=16?1.5:1),.1,'square',.12,0,musicG,w)}
    mNext+=60/148/4;mStep=(mStep+1)%32;
  }
}

/* ---------------- input ---------------- */
const KM=[
  {left:['KeyA'],right:['KeyD'],up:['KeyW'],down:['KeyS'],p:['KeyJ','KeyF'],k:['KeyK','KeyG'],s:['KeyL','KeyH'],u:['KeyU','KeyR']},
  {left:['ArrowLeft'],right:['ArrowRight'],up:['ArrowUp'],down:['ArrowDown'],p:['Numpad1','Comma'],k:['Numpad2','Period'],s:['Numpad3','Slash'],u:['Numpad0','Semicolon']}
];
const keys={};
addEventListener('keydown',e=>{
  if(e.code.startsWith('Arrow')||e.code==='Space'||e.code==='Slash'||e.code==='Quote')e.preventDefault();
  if(!keys[e.code]){keys[e.code]=true;initAudio();onKey(e.code)}
});
addEventListener('keyup',e=>{keys[e.code]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});

const DIFF=[
  {name:'EASY',     block:.15,punish:.08,aggr:.6, fire:.5, chain:.3},
  {name:'NORMAL',   block:.4, punish:.3, aggr:1,  fire:1,  chain:.55},
  {name:'HARD',     block:.7, punish:.6, aggr:1.4,fire:1.2,chain:.85},
  {name:'NIGHTMARE',block:.9, punish:.85,aggr:1.8,fire:1.4,chain:1}
];

/* ---------------- moves ---------------- */
/* su=startup, ac=active, rc=recovery, box=[x0,x1,y0,y1] (relative to attacker feet), lvl: h/m/l/p */
const MV={
  punch: {su:4, ac:3, rc:9, dmg:4, hs:16,bs:9, kb:4, lvl:'h',box:[15,82,102,152],next:{p:'punch2'},step:3,sfx:'punch'},
  punch2:{su:5, ac:3, rc:11,dmg:5, hs:17,bs:10,kb:5, lvl:'m',box:[15,90,70,132], next:{k:'finish'},step:4,sfx:'punch'},
  finish:{su:8, ac:4, rc:20,dmg:9, hs:30,bs:14,kb:10,lvl:'m',box:[15,115,60,150],launch:11,step:6,sfx:'heavy'},
  kick:  {su:8, ac:4, rc:14,dmg:8, hs:20,bs:11,kb:8, lvl:'m',box:[15,110,55,118],step:4,sfx:'kick'},
  sweep: {su:10,ac:4, rc:18,dmg:6, hs:0, bs:12,kb:3, lvl:'l',box:[15,118,0,26],down:true,crouchMove:true,sfx:'kick'},
  upper: {su:9, ac:4, rc:22,dmg:10,hs:0, bs:14,kb:3, lvl:'m',box:[10,74,55,178],launch:15,crouchMove:true,sfx:'heavy'},
  jkick: {su:3, ac:16,rc:0, dmg:7, hs:20,bs:10,kb:6, lvl:'h',box:[10,78,-38,60],air:true,sfx:'kick'},
  fire:  {su:14,ac:1, rc:24,dmg:0, sfx:'fire'},
  sup:   {su:36,ac:12,rc:32,dmg:30,hs:0, bs:14,kb:12,lvl:'m',box:[10,780,30,175],launch:13,chip:9,sfx:'sup'},
  proj:  {dmg:8,hs:22,bs:10,kb:7,lvl:'p',launch:0,chip:.8,sfx:'heavy'}
};

/* ---------------- state ---------------- */
const G={scene:'title',mode:0,diff:1,row:0,sel:[0,6],pick:0,paused:false,f:0,arc:{level:1,cont:0,opps:[]}};
const R={n:1,phase:'intro',pt:0,timer:5940,wins:[0,0],stage:0,sbase:0,banner:'',winner:-1,demo:true};
let F=[],PR=[],parts=[],shake=0,freeze=0,flashT=0,ts=1,combos=[null,null];
const cam={x:WORLD/2,z:1};

function mkFighter(i,def,cpu){
  return {i,def,cpu,x:0,y:0,vx:0,vy:0,facing:1,hp:100,trail:100,meter:0,state:'free',st:0,mv:null,fr:0,mvHit:false,
    crouch:false,blocking:false,back:false,walk:0,t:0,rot:0,invuln:0,flash:0,fireCool:0,launched:false,ko:false,airAtk:false,
    hitsTaken:0,buf:{p:0,k:0,s:0,u:0},prev:{},lastTap:{left:-99,right:-99},inp:{},
    ai:{t:0,plan:'wait',blockT:0,low:false,cool:0,reactP:0,reactA:0}};
}
function resetFighter(f,x,face){
  Object.assign(f,{x,y:0,vx:0,vy:0,facing:face,hp:100,trail:100,state:'free',st:0,mv:null,fr:0,mvHit:false,crouch:false,blocking:false,
    rot:0,invuln:0,flash:0,fireCool:0,launched:false,ko:false,airAtk:false,hitsTaken:0});
  f.buf={p:0,k:0,s:0,u:0};f.inp={};f.ai.t=20;f.ai.blockT=0;
}

/* ---------------- IK rig + pose ---------------- */
function ik(a,t,l1,l2,dir){
  let dx=t.x-a.x,dy=t.y-a.y,d=Math.hypot(dx,dy);const mx=l1+l2-.5;
  if(d>mx){dx*=mx/d;dy*=mx/d;d=mx}
  if(d<10)d=10;
  const A=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),b=Math.atan2(dy,dx)+dir*A;
  return {m:{x:a.x+Math.cos(b)*l1,y:a.y+Math.sin(b)*l1},e:{x:a.x+dx,y:a.y+dy}};
}
function pose(f){
  const m=f.mv?MV[f.mv]:null,air=f.y>1,ph=f.walk;
  let hipH=84+Math.sin(f.t*.1)*1.6,lean=3,fx=24,bx=-24,ffy=0,bfy=0,fh={x:34,y:-6},bh={x:18,y:10},hd=0;
  if(f.crouch&&!air){hipH=56;lean=9;fx=36;bx=-30;fh={x:30,y:-8};bh={x:16,y:6}}
  if(air){hipH=80;fx=26;ffy=30;bx=-6;bfy=18;fh={x:26,y:-10};bh={x:12,y:8}}
  else if(f.state==='free'&&Math.abs(f.vx)>.8&&!f.crouch){
    hipH=80;fx=22+Math.sin(ph)*17;bx=-24-Math.sin(ph)*17;ffy=Math.max(0,Math.cos(ph))*14;bfy=Math.max(0,-Math.cos(ph))*14;
  }
  if(f.state==='dash'){hipH=72;lean=14;fx=34;bx=-34;fh={x:14,y:6};bh={x:-6,y:14}}
  if(f.state==='block'||(f.state==='free'&&f.blocking&&!air)){fh={x:30,y:-30};bh={x:22,y:-14};lean-=5}
  if(f.state==='hit'){lean=-15;hd=-8;fh={x:-4,y:16};bh={x:-12,y:22};fx=16;bx=-30;hipH=air?78:82}
  if(f.state==='down'||f.state==='wake'){lean=-4;fh={x:20,y:24};bh={x:10,y:28}}
  if(f.state==='win'){fh={x:18,y:-80};bh={x:12,y:6};lean=0}
  if(m&&f.state==='attack'){
    const fr=f.fr,su=m.su,ac=m.ac,rc=Math.max(1,m.rc);
    let e=fr<su?fr/su:fr<su+ac?1:Math.max(0,1-(fr-su-ac)/rc);e=e*e*(3-2*e);
    switch(f.mv){
      case'punch':fh={x:22+e*68,y:-8};bh={x:14,y:6};lean=3+e*9;break;
      case'punch2':bh={x:20+e*66,y:-4};fh={x:26,y:-6};lean=2+e*13;hd=e*4;break;
      case'finish':fx=lerp(24,66,e);ffy=e*128;bx=-28;lean=3-e*16;fh={x:10,y:-22};bh={x:-18,y:-12};break;
      case'kick':fx=lerp(24,90,e);ffy=e*82;lean=3-e*9;fh={x:20,y:-14};bh={x:-14,y:-6};break;
      case'sweep':hipH=50;lean=14;fx=lerp(36,104,e);ffy=e*6;bx=-34;fh={x:20,y:46};bh={x:6,y:40};break;
      case'upper':hipH=62;lean=6+e*6;fh={x:20+e*28,y:36-e*134};bh={x:6,y:8};fx=34;bx=-26;break;
      case'jkick':fx=lerp(24,80,e);ffy=lerp(34,14,e);bfy=34;bx=-10;lean=-5;fh={x:14,y:-18};bh={x:-10,y:-6};break;
      case'fire':if(fr<su-2){fh={x:4,y:20};bh={x:-2,y:26};lean=-4;hipH=76}else{fh={x:64,y:-4};bh={x:50,y:2};lean=10;hipH=78}break;
      case'sup':if(fr<su){const u=fr/su;fh={x:10+Math.sin(f.t*.8)*3,y:-72-u*10};bh={x:2,y:-76-u*10};lean=-8;hipH=76}
                else{fh={x:70,y:-6};bh={x:56,y:-2};lean=14;hipH=76}break;
    }
  }
  const sh={x:lean,y:-hipH-Math.sqrt(3364-lean*lean)},head={x:sh.x+lean*.3+hd+2,y:sh.y-21},hip={x:0,y:-hipH};
  const ff={x:fx,y:-ffy},bf={x:bx,y:-bfy};
  const lf=ik(hip,ff,46,46,-1),lb=ik(hip,bf,46,46,-1);
  const af=ik(sh,{x:sh.x+fh.x,y:sh.y+fh.y},32,30,1),ab=ik(sh,{x:sh.x+bh.x,y:sh.y+bh.y},32,30,1);
  return {hip,sh,head,lf,lb,af,ab,hipH};
}
/* ---------------- particles ---------------- */
function spark(x,y,n,col,spd=9,life=14){for(let i=0;i<n;i++){const a=rnd(0,TAU),s=rnd(spd*.3,spd);parts.push({k:'s',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:life*rnd(.6,1.2),m:life,c:col})}}
function ring(x,y,r,col,l=16){parts.push({k:'r',x,y,r:6,R:r,l,m:l,c:col})}
function star(x,y,sz,col){parts.push({k:'st',x,y,sz,l:7,m:7,c:col,a:rnd(0,TAU)})}
function dust(x,y,n){for(let i=0;i<n;i++)parts.push({k:'d',x:x+rnd(-14,14),y,vx:rnd(-2,2),vy:rnd(-1.8,-.3),l:24,m:24,sz:rnd(5,12)})}
function popup(x,y,s,col){parts.push({k:'t',x,y,s,vy:-1.2,l:40,m:40,c:col})}
function updParts(){
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.l--;if(p.l<=0){parts.splice(i,1);continue}
    if(p.k==='s'){p.x+=p.vx;p.y+=p.vy;p.vy+=.35;p.vx*=.93}
    else if(p.k==='r'){p.r=lerp(p.r,p.R,.25)}
    else if(p.k==='d'){p.x+=p.vx;p.y+=p.vy;p.vx*=.95;p.sz+=.3}
    else if(p.k==='t'){p.y+=p.vy}
  }
}
function drawParts(){
  for(const p of parts){const a=p.l/p.m;
    if(p.k==='s'){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=p.c;ctx.globalAlpha=a;ctx.lineWidth=3*a+1;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*1.8,p.y-p.vy*1.8);ctx.stroke()}
    else if(p.k==='r'){ctx.globalCompositeOperation='lighter';ctx.strokeStyle=p.c;ctx.globalAlpha=a;ctx.lineWidth=5*a+1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.stroke()}
    else if(p.k==='st'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a;ctx.fillStyle=p.c;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);
      ctx.beginPath();for(let i=0;i<16;i++){const r=i%2?p.sz*.28:p.sz*(1.1-a*.3),an=i/16*TAU;ctx.lineTo(Math.cos(an)*r,Math.sin(an)*r)}ctx.fill();ctx.restore()}
    else if(p.k==='d'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a*.35;ctx.fillStyle='#bbb';ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,TAU);ctx.fill()}
    else if(p.k==='t'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a;txt(p.s,p.x,p.y,26,p.c,'center','#000',5)}
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}

/* ---------------- combat ---------------- */
const hh=f=>f.state==='down'?20:(f.crouch||f.mv==='sweep'||f.mv==='upper')?100:150;
function startMove(f,name){f.state='attack';f.mv=name;f.fr=0;f.mvHit=false;f.buf.p=f.buf.k=f.buf.s=f.buf.u=0;f.crouch=!!MV[name].crouchMove}
function startAttack(f){
  const b=f.buf,I=f.inp;
  if(b.u&&f.meter>=100){f.meter=0;startMove(f,'sup');return true}
  if(b.s&&f.fireCool<=0&&!PR.some(p=>p.o===f)){startMove(f,'fire');return true}
  if(b.p){startMove(f,I.down?'upper':'punch');return true}
  if(b.k){startMove(f,I.down?'sweep':'kick');return true}
  return false;
}
function canBlock(d,m){
  if(!(d.state==='free'||d.state==='block')||d.y>0||!d.back)return false;
  if(m.lvl==='l'&&!d.crouch)return false;
  if(m.lvl==='m'&&d.crouch)return false;
  return true;
}
function applyHit(a,d,m,cx,cy){
  if(d.invuln>0||d.state==='down'||d.ko)return;
  if(canBlock(d,m)){
    d.state='block';d.st=m.bs;d.mv=null;d.vx=a.facing*m.kb*.9;if(m.sfx!=='heavy'||!m.chip||m.chip>1)a.vx-=a.facing*(m.sfx==='sup'?0:2);
    d.hp=Math.max(.5,d.hp-(m.chip!==undefined?m.chip:m.dmg*.08));
    a.meter=Math.min(100,a.meter+3);d.meter=Math.min(100,d.meter+3);
    freeze=Math.max(freeze,3);spark(cx,cy,8,'#7cf',7);ring(cx,cy,26,'#7cf',10);popup(cx,cy-30,'BLOCK','#7cf');sfx('block');
    return;
  }
  const scale=Math.max(.45,1-.12*d.hitsTaken),dmg=m.dmg*(a.def.pow||1)*scale*(d.def.tk||1)*(d.tkx||1);
  d.hp-=dmg;d.hitsTaken++;d.state='hit';d.mv=null;d.crouch=false;d.flash=6;
  const air=d.y>0||m.launch;
  if(air||d.hp<=0){
    d.launched=true;d.vy=m.launch||(d.y>0?7.5:11);d.vx=a.facing*Math.max(m.kb,3)*(d.hp<=0?1.3:.8);d.st=999;
    if(d.y<=0)d.y=.1;
  }else if(m.down){d.state='down';d.st=44;d.vx=a.facing*4;sfx('land')}
  else{d.st=m.hs;d.vx=a.facing*m.kb}
  a.meter=Math.min(100,a.meter+dmg*1.3*(a.def.mg||1));d.meter=Math.min(100,d.meter+dmg*.9);
  const big=m.launch||dmg>=8;
  freeze=Math.max(freeze,big?10:6);shake=Math.max(shake,big?9:4);
  spark(cx,cy,big?20:12,big?'#ffd23f':'#fff',big?13:9);star(cx,cy,big?70:44,big?'#ffd23f':'#fff');ring(cx,cy,big?60:38,'#fff',14);
  sfx(m.sfx||'punch');
  if(d.hitsTaken>=2)combos[a.i]={n:d.hitsTaken,t:100};
  if(d.hp<=0){d.hp=0;d.ko=true;endRound('ko')}
}
function resolveHits(){
  const hits=[];
  for(const a of F){
    if(a.state!=='attack')continue;
    const m=MV[a.mv];if(!m.box||a.mvHit)continue;
    if(!(a.fr>m.su&&a.fr<=m.su+m.ac))continue;
    const d=F[1-a.i];if(d.invuln>0||d.state==='down'||d.ko)continue;
    const x0=a.x+a.facing*m.box[0],x1=a.x+a.facing*m.box[1]*(a.def.rch||1),lo=Math.min(x0,x1),hi=Math.max(x0,x1);
    const ya=a.y+m.box[2],yb=a.y+m.box[3];
    if(hi<d.x-24||lo>d.x+24||yb<d.y||ya>d.y+hh(d))continue;
    hits.push([a,d,m,clamp(d.x,lo,hi)-a.facing*8,Math.max(d.y+20,Math.min(yb,d.y+hh(d)))-(m.box[3]-m.box[2])*.2]);
  }
  for(const [a,d,m,cx,cy] of hits){a.mvHit=true;applyHit(a,d,m,cx,-cy+GROUND*0)}
}
function endRound(why){
  if(R.phase!=='fight')return;
  R.phase='ko';R.pt=0;
  const [a,b]=F;
  let w=-1;
  if(a.hp>b.hp+.01)w=0;else if(b.hp>a.hp+.01)w=1;
  R.winner=w;R.banner=why==='time'?'TIME UP':'K.O.';
  if(w>=0)R.wins[w]++;else{R.wins[0]++;R.wins[1]++}
  if(why==='ko'){sfx('ko');shake=16}
}

/* ---------------- AI ---------------- */
function aiInput(f,o){
  const I={left:0,right:0,up:0,down:0,p:0,k:0,s:0,u:0,dashF:0,dashB:0};
  if(R.phase!=='fight')return I;
  const A=f.ai,L=aiLevel(),dx=o.x-f.x,dist=Math.abs(dx),tw=dx>0?1:-1;
  const fwd=tw>0?'right':'left',back=tw>0?'left':'right';
  A.t--;A.blockT--;A.cool--;
  const om=o.state==='attack'?MV[o.mv]:null;
  // react to a fresh attack
  if(om&&o.fr===1&&dist<190&&om.box&&Math.random()<L.block){A.blockT=18+((om.su+om.ac)|0);A.low=om.lvl==='l'}
  for(const p of PR){
    if(p.o!==f&&A.reactP<=0&&Math.abs(p.x-f.x)<230&&Math.sign(f.x-p.x)===Math.sign(p.vx)){
      A.reactP=50;
      if(Math.random()<L.block){A.blockT=24;A.low=false}else if(Math.random()<.5)A.plan='jump',A.t=25;
    }
  }
  A.reactP--;
  if(om&&om.box&&o.fr>om.su+om.ac+2&&dist<115&&Math.random()<L.punish*.25){A.blockT=0;I.p=1;if(Math.random()<.4){I.p=0;I.k=1}return I}
  if(A.blockT>0){I[back]=1;if(A.low)I.down=1;return I}
  if(f.state==='attack'){
    const m=MV[f.mv];
    if(m.next&&f.mvHit&&f.fr>=m.su+m.ac&&Math.random()<L.chain*.35){for(const k in m.next)I[k]=1}
    return I;
  }
  if(f.meter>=100&&dist<420&&Math.random()<.03){I.u=1;return I}
  if(f.y>0){if(A.plan==='jump'&&dist<170&&Math.random()<.4)I.k=1;return I}
  if(o.y>60&&dist<130&&Math.random()<.5){I.down=1;I.p=1;return I}
  if(A.t<=0){
    const r=Math.random();A.t=Math.round(rnd(10,26)/Math.sqrt(L.aggr));
    if(dist>330){A.plan=r<.45?'approach':r<.45+.18*L.fire?'fire':r<.75?'jump':r<.88?'dash':'wait'}
    else if(dist>150){A.plan=r<.45?'approach':r<.6?'poke':r<.7*L.aggr?'dash':r<.8?'fire':r<.9?'jump':'wait'}
    else{A.plan=r<.62*L.aggr/1.2?'atk':r<.78?'retreat':r<.9?'guard':'wait'}
  }
  switch(A.plan){
    case'approach':if(dist>100)I[fwd]=1;else A.t=0;break;
    case'retreat':I[back]=1;break;
    case'guard':I[back]=1;break;
    case'dash':I.dashF=1;A.plan='wait';break;
    case'jump':if(f.y<=0){I.up=1;I[fwd]=1}A.plan='wait';break;
    case'fire':I.s=1;A.plan='wait';break;
    case'poke':if(dist<135){const r=Math.random();if(r<.5)I.k=1;else if(r<.8){I.down=1;I.k=1}else I.p=1;A.plan='wait'}else I[fwd]=1;break;
    case'atk':{const r=Math.random();
      if(dist>115){I[fwd]=1}
      else if(r<.4)I.p=1;else if(r<.65)I.k=1;else if(r<.8){I.down=1;I.k=1}else if(r<.92){I.down=1;I.p=1}else I.k=1;
      A.plan='wait';break}
  }
  return I;
}
function humanInput(f){
  const maps=(G.mode<2&&f.i===0)?[KM[0],KM[1]]:[KM[f.i]];
  const any=k=>maps.some(m=>m[k].some(c=>keys[c]));
  const I={left:any('left')?1:0,right:any('right')?1:0,up:any('up')?1:0,down:any('down')?1:0,p:0,k:0,s:0,u:0,dashF:0,dashB:0};
  for(const k of['p','k','s','u']){const c=any(k);if(c&&!f.prev[k])f.buf[k]=6;f.prev[k]=c}
  for(const d of['left','right']){
    const c=I[d];
    if(c&&!f.prev[d]){
      if(G.f-f.lastTap[d]<15){if((d==='right')===(f.facing>0))I.dashF=1;else I.dashB=1;f.lastTap[d]=-99}else f.lastTap[d]=G.f;
    }
    f.prev[d]=c;
  }
  return I;
}

/* ---------------- fighter update ---------------- */
function updFighter(f,o){
  f.t++;
  const I=f.inp;
  for(const k in f.buf)if(f.buf[k]>0)f.buf[k]--;
  if(f.invuln>0)f.invuln--;if(f.flash>0)f.flash--;if(f.fireCool>0)f.fireCool--;
  const grounded=f.y<=0&&f.vy<=0,backHeld=f.facing>0?I.left:I.right;
  f.back=!!backHeld;
  if(f.state==='free'||f.state==='dash'){}else f.blocking=false;
  switch(f.state){
    case'free':
      if(grounded){
        f.airAtk=false;f.facing=o.x>=f.x?1:-1;f.crouch=!!I.down;f.blocking=!!backHeld;
        if(startAttack(f))break;
        const spd=f.def.spd;
        if(I.dashF||I.dashB){f.state='dash';f.st=13;f.vx=f.facing*(I.dashF?11:-9)*spd;dust(f.x,0,4);sfx('whoosh');f.crouch=false}
        else if(I.up&&!f.crouch){f.vy=16.5;f.vx=((I.right?1:0)-(I.left?1:0))*4.4*spd;f.y=.1;sfx('jump');dust(f.x,0,3)}
        else if(!f.crouch){const dir=(I.right?1:0)-(I.left?1:0);f.vx=dir*(dir===f.facing?4.4:3.4)*spd;f.walk+=f.vx*f.facing*.065}
        else f.vx*=.7;
      }else{
        f.crouch=false;f.blocking=false;
        if(!f.airAtk&&(f.buf.p||f.buf.k)){startMove(f,'jkick');f.airAtk=true}
      }
      break;
    case'dash':f.st--;if(f.st<6&&startAttack(f))break;if(f.st<=0){f.state='free';f.vx*=.3}break;
    case'attack':{
      const m=MV[f.mv];f.fr++;
      if(f.fr===1){if(m.step)f.vx=f.facing*m.step;if(f.mv!=='fire'&&f.mv!=='sup')sfx('whoosh');
        if(f.mv==='sup'){freeze=Math.max(freeze,34);flashT=34;sfx('sup')}}
      if(f.mv==='fire'&&f.fr===m.su){{const fb=FBTYPES[f.def.fb];PR.push({x:f.x+f.facing*50,y:f.y+95,vx:f.facing*fb.v,o:f,t:0,c:f.def.fc,ty:f.def.fb,r:fb.r,life:fb.life,dmg:fb.dmg})}f.fireCool=36;sfx('fire');spark(f.x+f.facing*50,-f.y-95,8,f.def.c2,6)}
      if(m.next&&f.mvHit&&f.fr>=m.su+m.ac){
        for(const k in m.next)if(f.buf[k]>0){startMove(f,m.next[k]);break}
      }
      if(f.state==='attack'&&f.fr>=m.su+m.ac+m.rc&&!m.air){f.state='free';f.mv=null;f.crouch=false}
      else if(f.state==='attack'&&m.air&&f.fr>=m.su+m.ac+m.rc&&grounded){f.state='free';f.mv=null}
      break}
    case'hit':
      if(!f.launched){f.st--;if(f.st<=0){f.state='free'}}
      break;
    case'block':f.st--;if(f.st<=0)f.state='free';break;
    case'down':
      if(!f.ko){f.st--;if(f.st<=0){f.state='wake';f.st=16;f.invuln=16}}
      break;
    case'wake':f.st--;if(f.st<=0)f.state='free';break;
    case'win':break;
  }
  if(f.state==='free'&&grounded)f.hitsTaken=0;
  // rotation target
  let tr=0,rate=.25;
  if(f.state==='hit')tr=f.launched?-1.3:-.18;
  else if(f.state==='down'){tr=-Math.PI/2;rate=.33}
  f.rot+=(tr-f.rot)*rate;if(Math.abs(f.rot)<.01)f.rot=0;
  // physics
  f.x+=f.vx;
  if(f.y>0||f.vy>0){
    f.vy-=GRAV;f.y+=f.vy;
    if(f.y<=0){f.y=0;f.vy=0;onLand(f)}
  }else{
    if(f.state!=='free'&&f.state!=='dash')f.vx*=.84;
  }
  f.x=clamp(f.x,70,WORLD-70);
  if(f.state==='win'||f.state==='wake'){}
}
function onLand(f){
  dust(f.x,0,5);sfx('land');
  if(f.launched){f.launched=false;f.state='down';f.st=f.ko?9999:42;f.vx*=.5;shake=Math.max(shake,7);dust(f.x,0,6)}
  else if(f.state==='attack'&&MV[f.mv].air){f.state='free';f.mv=null;f.vx*=.3}
  else if(f.state==='free')f.vx*=.3;
}
function updProjectiles(){
  for(let i=PR.length-1;i>=0;i--){
    const p=PR[i];p.x+=p.vx;p.t++;
    const d=F[1-p.o.i];let dead=p.x<20||p.x>WORLD-20||p.t>p.life;
    if(!dead){
      for(const q of PR)if(q!==p&&q.o!==p.o&&Math.abs(q.x-p.x)<34&&Math.abs(q.y-p.y)<34){
        q.t=999;dead=true;spark(p.x,-p.y,18,'#fff',10);ring(p.x,-p.y,50,'#fff',16);sfx('heavy');shake=Math.max(shake,5)}
    }
    if(!dead&&Math.abs(p.x-d.x)<p.r&&p.y>d.y-18&&p.y<d.y+hh(d)&&d.invuln<=0&&d.state!=='down'&&!d.ko){
      applyHit(p.o,d,Object.assign({},MV.proj,{dmg:p.dmg,kb:p.ty==='wave'?9:p.ty==='dart'?5:7}),p.x,-p.y);dead=true;
    }
    if(dead)PR.splice(i,1);
  }
}

/* ---------------- main update ---------------- */
function update(){
  G.f++;
  if(freeze>0){freeze--;updParts();updCam();return}
  const fighting=R.phase==='fight';
  R.pt++;
  for(const f of F){
    const o=F[1-f.i];
    let I;
    if(f.cpu){I=aiInput(f,o);if(fighting)for(const k of['p','k','s','u'])if(I[k])f.buf[k]=6}
    else if(fighting)I=humanInput(f);
    else{I={left:0,right:0,up:0,down:0,dashF:0,dashB:0};f.buf.p=f.buf.k=f.buf.s=f.buf.u=0}
    f.inp=I;
  }
  if(R.phase==='prelude'){if(R.pt>=150){R.phase='intro';R.pt=0}}
  else if(R.phase==='intro'){if(R.pt===1)sfx('round');if(R.pt===80)sfx('fight');if(R.pt>=130){R.phase='fight';R.pt=0}}
  else if(fighting){R.timer--;if(R.timer<=0){R.timer=0;endRound('time')}}
  else if(R.phase==='match'){if(G.mode===0&&R.winner!==0&&R.pt>700)toTitle()}
  else if(R.phase==='ko'){
    ts=R.pt<70?.35:1;
    if(R.pt>60){for(const f of F)if(f.state==='free'&&f.y<=0&&R.winner===f.i)f.state='win'}
    if(R.pt>=170){ts=1;nextRound()}
  }
  for(const f of F)updFighter(f,F[1-f.i]);
  resolveHits();
  updProjectiles();
  // push apart
  const [a,b]=F;
  if(a.y<90&&b.y<90&&a.state!=='down'&&b.state!=='down'){
    const gap=Math.abs(a.x-b.x);
    if(gap<48){const push=(48-gap)/2,s=a.x<=b.x?1:-1;a.x-=s*push;b.x+=s*push;
      if(a.x<=70){a.x=70;b.x=a.x+48}else if(a.x>=WORLD-70){a.x=WORLD-70;b.x=a.x-48}
      if(b.x<=70){b.x=70;a.x=b.x+48}else if(b.x>=WORLD-70){b.x=WORLD-70;a.x=b.x-48}}
  }
  const dd=Math.abs(a.x-b.x);
  if(dd>MAXD){const ex=(dd-MAXD)/2,s=a.x<b.x?1:-1;a.x+=s*ex;b.x-=s*ex}
  for(const f of F){f.trail=f.hp<f.trail?Math.max(f.hp,f.trail-.35):f.hp}
  for(let i=0;i<2;i++)if(combos[i]&&--combos[i].t<=0)combos[i]=null;
  shake*=.84;if(flashT>0)flashT--;
  updParts();updCam();
}
function updCam(){
  const [a,b]=F,mx=(a.x+b.x)/2,d=Math.abs(a.x-b.x);
  const tz=clamp(840/(d+340),.86,1.2);
  cam.z=lerp(cam.z,tz,.08);
  const lim=480/cam.z;
  cam.x=clamp(lerp(cam.x,mx,.14),lim,WORLD-lim);
}
function nextRound(){
  if(R.demo){startRound();return}
  if(R.wins[0]>=2||R.wins[1]>=2||R.n>=5){
    R.phase='match';R.pt=0;
    R.winner=R.wins[0]>R.wins[1]?0:R.wins[1]>R.wins[0]?1:-1;
    if(G.mode===0&&R.winner===0){saveBest(G.arc.level);if(G.arc.level>=10){startEnding();return}}
    return;
  }
  R.n++;startRound();
}
function startRound(first){
  R.phase=(first&&!R.demo&&G.mode===0)?'prelude':'intro';R.pt=0;R.timer=99*60;R.banner='';ts=1;
  if(!R.demo&&G.mode!==0)R.stage=(R.sbase+R.n-1)%10;
  PR=[];parts=[];combos=[null,null];
  resetFighter(F[0],WORLD/2-150,1);resetFighter(F[1],WORLD/2+150,-1);
  cam.x=WORLD/2;cam.z=1;
}
function startMatch(demo){
  const s=G.sel;let opp=s[1];
  if(!demo&&G.mode===0)opp=G.arc.opps[G.arc.level-1];
  F=[mkFighter(0,ROSTER[s[0]],!!demo),mkFighter(1,ROSTER[opp],!!demo||G.mode<2)];
  F[1].tkx=(!demo&&G.mode===0)?[1,1,1,1,1,.97,.94,.9,.86,.8][G.arc.level-1]:1;
  R.n=1;R.wins=[0,0];R.demo=!!demo;
  if(!demo){R.sbase=(Math.random()*10)|0;R.stage=G.mode===0?G.arc.level-1:R.sbase;initAudio()}
  startRound(true);
}
function toTitle(){G.scene='title';G.paused=false;const a=(Math.random()*30)|0;G.sel=[G.sel[0],G.sel[1]];
  const keep=G.sel.slice();G.sel=[a,(a+1+((Math.random()*28)|0))%30];startMatch(true);G.sel=keep;R.stage=(Math.random()*10)|0}

/* ---------------- drawing: HUD ---------------- */
function txt(s,x,y,size,fill,align='center',stroke='#000',lw=0){
  ctx.font=size+'px Impact,"Arial Black",sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';
  if(lw){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.lineJoin='round';ctx.strokeText(s,x,y)}
  ctx.fillStyle=fill;ctx.fillText(s,x,y);
}
function para(x,y,w,h,flip){const k=14;ctx.beginPath();if(!flip){ctx.moveTo(x+k,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w-k,y+h);ctx.lineTo(x,y+h)}else{ctx.moveTo(x,y);ctx.lineTo(x+w-k,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+k,y+h)}ctx.closePath()}
function drawBar(x,y,w,h,f,flip){
  ctx.save();para(x,y,w,h,flip);ctx.fillStyle='rgba(0,0,0,.65)';ctx.fill();ctx.clip();
  const fr=f.hp/100,tr=f.trail/100;
  const gw=w*tr,hw=w*fr;
  ctx.fillStyle='#ffe9a8';if(flip)ctx.fillRect(x,y,gw,h);else ctx.fillRect(x+w-gw,y,gw,h);
  const g=ctx.createLinearGradient(0,y,0,y+h);
  const c=fr>.5?['#7dff7a','#1fb83a']:fr>.25?['#ffe45c','#e6a100']:['#ff7a6a','#d0152a'];
  g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);ctx.fillStyle=g;
  if(flip)ctx.fillRect(x,y,hw,h);else ctx.fillRect(x+w-hw,y,hw,h);
  ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(x,y,w,h*.35);
  ctx.restore();
  para(x,y,w,h,flip);ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();
}
function drawHUD(){
  if(R.demo||R.phase==='prelude')return;
  const bw=360;
  drawBar(70,22,bw,24,F[0],false);drawBar(W-70-bw,22,bw,24,F[1],true);
  // names
  txt(F[0].def.name+(F[0].cpu?' (CPU)':''),72,60,20,'#fff','left','#000',4);
  txt(F[1].def.name+(F[1].cpu?' (CPU)':''),W-72,60,20,'#fff','right','#000',4);
  // meters
  for(const f of F){
    const flip=f.i===1,x=flip?W-70-bw:70,w=200,mx=flip?x:x+bw-w;
    ctx.save();ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(flip?x:x+bw-w,76,w,8);
    const rdy=f.meter>=100;ctx.fillStyle=rdy?(G.f%10<5?'#fff':f.def.c2):f.def.c2;
    const mw=w*f.meter/100;ctx.fillRect(flip?x:x+bw-mw,76,mw,8);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.strokeRect(flip?x:x+bw-w,76,w,8);ctx.restore();
    if(rdy)txt('SUPER READY',flip?x+w+8:x+bw-w-8,80,14,'#ffd23f',flip?'left':'right','#000',3);
    // win pips
    for(let k=0;k<2;k++){const px=flip?W-80-k*22:80+k*22;ctx.beginPath();ctx.moveTo(px,95);ctx.lineTo(px+8,103);ctx.lineTo(px,111);ctx.lineTo(px-8,103);ctx.closePath();
      ctx.fillStyle=k<R.wins[f.i]?'#ffd23f':'rgba(0,0,0,.5)';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke()}
  }
  // timer
  ctx.save();ctx.fillStyle='rgba(0,0,0,.7)';ctx.strokeStyle='#fff';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(W/2-34,20);ctx.lineTo(W/2+34,20);ctx.lineTo(W/2+44,48);ctx.lineTo(W/2+34,76);ctx.lineTo(W/2-34,76);ctx.lineTo(W/2-44,48);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  const sec=Math.ceil(R.timer/60);txt(String(sec).padStart(2,'0'),W/2,50,40,sec<=10&&G.f%30<15?'#ff5050':'#ffe45c','center','#000',5);
  txt(G.mode===0?'STAGE '+G.arc.level+'/10  •  ROUND '+R.n:'ROUND '+R.n,W/2,92,15,'#fff','center','#000',3);txt(STG[R.stage].name,W/2,108,12,'#bbb','center','#000',3);
  // combos
  for(let i=0;i<2;i++){const c=combos[i];if(!c||c.n<2)continue;
    const s=1+Math.max(0,(c.t-92))*.04,x=i===0?140:W-140;
    ctx.save();ctx.translate(x,190);ctx.scale(s,s);txt(c.n+' HITS',0,0,50,'#ffd23f','center','#a00',8);ctx.restore()}
}
function bigText(s,y,size,sc=1,a=1){
  ctx.save();ctx.globalAlpha=a;ctx.translate(W/2,y);ctx.scale(sc,sc);
  ctx.font='italic '+size+'px Impact,"Arial Black",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const g=ctx.createLinearGradient(0,-size/2,0,size/2);g.addColorStop(0,'#fff6b0');g.addColorStop(.5,'#ffc400');g.addColorStop(1,'#ff3b1d');
  ctx.lineWidth=size/6;ctx.strokeStyle='#220';ctx.lineJoin='round';ctx.strokeText(s,0,0);
  ctx.shadowColor='#ff6a00';ctx.shadowBlur=24;ctx.fillStyle=g;ctx.fillText(s,0,0);ctx.restore();
}
function drawBanners(){
  if(R.demo)return;
  if(R.phase==='prelude'){
    ctx.fillStyle='rgba(0,0,0,'+Math.min(.55,R.pt/20)+')';ctx.fillRect(0,0,W,H);
    const k=Math.min(1,R.pt/14);
    bigText('STAGE '+G.arc.level,86,84,lerp(2,1,k),k);
    txt(STG[R.stage].name,W/2,146,28,'#9ef','center','#000',5);
    const a=F[0].def,b=F[1].def,s=Math.min(1,Math.max(0,(R.pt-12)/14));
    ctx.save();ctx.globalAlpha=s;
    txt(a.name,W/2-190-(1-s)*160,270,56,'#fff','center',a.fc,8);txt(a.title,W/2-190-(1-s)*160,308,18,a.fc,'center','#000',4);
    txt(b.name,W/2+190+(1-s)*160,270,56,'#fff','center',b.fc,8);txt(b.title,W/2+190+(1-s)*160,308,18,b.fc,'center','#000',4);
    ctx.restore();
    bigText('VS',280,70,lerp(2.5,1,s),s);
    if(G.arc.level===10)txt('— FINAL BOSS —',W/2,350,30,'#ff4060','center','#000',6);
    txt(G.arc.level>1&&G.arc.cont?'CONTINUES: '+G.arc.cont:'',W/2,380,16,'#ccc','center','#000',3);
  }else if(R.phase==='intro'){
    if(R.pt<80){const t=Math.min(1,R.pt/10);bigText('ROUND '+R.n,H/2-20,92,lerp(2.2,1,t),t)}
    else{const t=Math.min(1,(R.pt-80)/8);bigText('FIGHT!',H/2-20,120,lerp(2.6,1,t),R.pt>115?1-(R.pt-115)/15:1)}
  }else if(R.phase==='ko'){
    const t=Math.min(1,R.pt/10);
    bigText(R.banner,H/2-30,130,lerp(2.4,1,t),t);
    if(R.pt>70){txt(R.winner<0?'DRAW':F[R.winner].def.name+' WINS',W/2,H/2+60,40,'#fff','center','#000',7)}
  }else if(R.phase==='match'){
    ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,W,H);
    const w=R.winner;
    if(G.mode===0){
      if(w===0){bigText('STAGE '+G.arc.level+' CLEAR!',H/2-60,96,1);txt('NEXT: '+ROSTER[G.arc.opps[G.arc.level]].name,W/2,H/2+10,32,'#fff','center','#000',6);txt('ENTER = Next Stage',W/2,H/2+80,26,'#ffd23f','center','#000',5)}
      else{bigText('GAME OVER',H/2-70,110,1);txt('CONTINUE?  '+Math.max(0,Math.ceil((700-R.pt)/60)),W/2,H/2+20,44,'#fff','center','#000',7);txt('ENTER = Continue     ESC = Menu',W/2,H/2+84,26,'#ffd23f','center','#000',5)}
    }else{
      bigText(w<0?'DRAW GAME':(G.mode===1?(w===0?'YOU WIN!':'YOU LOSE'):'PLAYER '+(w+1)+' WINS'),H/2-70,110,1);
      if(w>=0)txt(F[w].def.name+' — '+F[w].def.title,W/2,H/2+10,34,'#fff','center','#000',6);
      txt('ENTER = Rematch     ESC = Menu',W/2,H/2+80,26,'#ffd23f','center','#000',5);
    }
  }
}

/* ---------------- projectiles + beam draw ---------------- */
function drawProj(){
  ctx.globalCompositeOperation='lighter';
  for(const p of PR){
    const dir=Math.sign(p.vx);
    if(p.ty==='dart'){
      const tg=ctx.createLinearGradient(p.x,0,p.x-dir*190,0);tg.addColorStop(0,p.c);tg.addColorStop(1,'transparent');
      ctx.fillStyle=tg;ctx.fillRect(Math.min(p.x,p.x-dir*190),-p.y-5,190,10);
      const g=ctx.createRadialGradient(p.x,-p.y,1,p.x,-p.y,22);g.addColorStop(0,'#fff');g.addColorStop(.4,p.c);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,-p.y,22,0,TAU);ctx.fill();
    }else if(p.ty==='wave'){
      ctx.save();ctx.translate(p.x,-p.y);ctx.scale(1,1.7);
      const g=ctx.createRadialGradient(0,0,4,0,0,48);g.addColorStop(0,'#fff');g.addColorStop(.35,p.c);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,48,0,TAU);ctx.fill();
      const tg=ctx.createLinearGradient(0,0,-dir*220,0);tg.addColorStop(0,p.c);tg.addColorStop(1,'transparent');ctx.fillStyle=tg;ctx.fillRect(Math.min(0,-dir*220),-24,220,48);ctx.restore();
    }else{
      const g=ctx.createRadialGradient(p.x,-p.y,2,p.x,-p.y,34);g.addColorStop(0,'#fff');g.addColorStop(.3,p.c);g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,-p.y,34,0,TAU);ctx.fill();
      const tg=ctx.createLinearGradient(p.x,0,p.x-dir*130,0);tg.addColorStop(0,p.c);tg.addColorStop(1,'transparent');
      ctx.fillStyle=tg;ctx.fillRect(Math.min(p.x,p.x-dir*130),-p.y-12,130,24);
    }
  }
  for(const f of F){
    if(f.state==='attack'&&f.mv==='sup'&&f.fr>MV.sup.su){
      const k=1-(f.fr-MV.sup.su)/MV.sup.ac,len=800,h=34*k+10,x0=f.x+f.facing*60,x1=x0+f.facing*len;
      const g=ctx.createLinearGradient(x0,0,x1,0);g.addColorStop(0,'#fff');g.addColorStop(.3,f.def.c2);g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.fillRect(Math.min(x0,x1),-f.y-100-h,len,h*2);
      ctx.fillStyle='#fff';ctx.fillRect(Math.min(x0,x1),-f.y-100-h*.3,len*.6,h*.6);
    }
  }
  ctx.globalCompositeOperation='source-over';
}

/* ---------------- render ---------------- */
function renderWorld(){
  const sx=(Math.random()-.5)*shake*2,sy=(Math.random()-.5)*shake*2;
  drawBG();
  ctx.save();ctx.translate(480+sx,GROUND+sy);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,0);
  // shadows
  for(const f of F){const s=Math.max(.3,1-f.y/260);ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(f.x,3,40*s,9*s,0,0,TAU);ctx.fill()}
  // reflections
  ctx.save();ctx.scale(1,-1);ctx.globalAlpha=.16;for(const f of F)drawFighter(f,true);ctx.restore();
  const order=F[0].state==='attack'||F[0].state==='win'?[1,0]:[0,1];
  if(F[1].state==='attack')order.reverse();
  for(const i of order)drawFighter(F[i]);
  drawProj();
  drawParts();
  ctx.restore();
  ctx.drawImage(vignette,0,0);
  if(flashT>0){
    const a=flashT/34;ctx.fillStyle='rgba(0,0,0,'+(.7*a)+')';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(255,255,255,'+(.5*a)+')';ctx.lineWidth=3;
    for(let i=0;i<40;i++){const an=i/40*TAU+G.f*.01;ctx.beginPath();ctx.moveTo(W/2+Math.cos(an)*180,H/2+Math.sin(an)*180);ctx.lineTo(W/2+Math.cos(an)*900,H/2+Math.sin(an)*900);ctx.stroke()}
    ctx.restore();
    txt('RAGE ART!',W/2,H/2,90,'#fff','center','#f0a',10);
  }
}
const MODES=['ARCADE  (10 STAGES)','VS CPU  (FREE FIGHT)','2 PLAYERS'];
const CTRL1='P1: A/D=Move  W=Jump  S=Crouch  J/F=Punch  K/G=Kick  L/H=Fireball  U/R=SUPER';
const CTRL2='P2: Arrows=Move  Numpad1/,=Punch  Numpad2/.=Kick  Numpad3//=Fireball  Numpad0/;=SUPER';
let bestLevel=0;try{bestLevel=+localStorage.getItem('sc_best')||0}catch(e){}
function renderTitle(){
  renderWorld();
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(W/2,104);
  ctx.font='italic 112px Impact,"Arial Black",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const g=ctx.createLinearGradient(0,-60,0,60);g.addColorStop(0,'#fff');g.addColorStop(.45,'#ffd23f');g.addColorStop(.55,'#ff7a00');g.addColorStop(1,'#d3001c');
  ctx.lineWidth=16;ctx.strokeStyle='#1a0030';ctx.lineJoin='round';ctx.strokeText('STREET CLASH',0,0);
  ctx.shadowColor='#ff3b9a';ctx.shadowBlur=30;ctx.fillStyle=g;ctx.fillText('STREET CLASH',0,0);ctx.restore();
  txt('30 FIGHTERS  •  10 STAGES  •  ONE CHAMPION',W/2,172,20,'#9ef','center','#000',4);
  const rows=['MODE:  '+MODES[G.mode],'DIFFICULTY:  '+DIFF[G.diff].name,'START FIGHT'];
  rows.forEach((s,i)=>{
    const y=240+i*54,sel=G.row===i;
    if(sel){ctx.fillStyle='rgba(255,60,120,.35)';ctx.fillRect(W/2-270,y-23,540,46);ctx.strokeStyle='#ff3b9a';ctx.lineWidth=3;ctx.strokeRect(W/2-270,y-23,540,46)}
    txt((sel?'▶ ':'')+s,W/2,y,sel?30:26,sel?'#fff':'#bbb','center','#000',5);
  });
  if(bestLevel)txt('BEST: STAGE '+bestLevel+' / 10'+(bestLevel>=10?'  ★ CHAMPION ★':''),W/2,404,18,'#ffd23f','center','#000',4);
  txt('↑↓ select   ←→ change   ENTER confirm   (M = music)',W/2,430,15,'#fff','center','#000',3);
  txt(CTRL1,W/2,466,14,'#9ef','center','#000',3);
  txt(CTRL2,W/2,486,14,'#f9a','center','#000',3);
  txt('P→P→K = 3-hit combo  |  ↓+P = Launcher  |  ↓+K = Sweep  |  Double-tap ←/→ = Dash  |  Hold BACK = Block',W/2,512,13,'#ddd','center','#000',3);
}
const SEL={x:22,y:84,cw:78,ch:78,cols:6};
const selCache={};
function selFighter(i){return selCache[i]||(selCache[i]=mkFighter(9,ROSTER[i],false))}
function bars(x,y,label,v,col){
  txt(label,x,y,14,'#ddd','left','#000',3);
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x+78,y-7,180,14);ctx.fillStyle=col;ctx.fillRect(x+78,y-7,180*clamp(v,0,1),14);ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.strokeRect(x+78,y-7,180,14);
}
function renderSelect(){
  renderWorld();
  ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,W,H);
  const picking=G.pick===0?'PLAYER 1':(G.mode===1?'OPPONENT':'PLAYER 2'),pc=G.pick===0?'#4df':'#f6a';
  txt('CHOOSE YOUR FIGHTER',24,40,34,'#fff','left','#a0a',6);
  txt(picking,W-24,40,28,pc,'right','#000',5);
  const cur=G.sel[G.pick];
  ROSTER.forEach((d,i)=>{
    const cx=SEL.x+(i%SEL.cols)*(SEL.cw+4),cy=SEL.y+((i/SEL.cols)|0)*(SEL.ch+4),sel=cur===i;
    ctx.drawImage(portrait(i),cx,cy,SEL.cw,SEL.ch);
    ctx.strokeStyle=sel?pc:(G.pick>0&&G.sel[0]===i?'#4df':'#555');ctx.lineWidth=sel?4:(G.pick>0&&G.sel[0]===i?3:1.5);ctx.strokeRect(cx+1,cy+1,SEL.cw-2,SEL.ch-2);
    ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(cx,cy+SEL.ch-15,SEL.cw,15);txt(d.name,cx+SEL.cw/2,cy+SEL.ch-7,12,sel?'#fff':'#bbb','center','#000',2);
  });
  // preview panel
  const d=ROSTER[cur],px=730;
  const pg=ctx.createRadialGradient(px,320,10,px,320,260);pg.addColorStop(0,d.fc+'55');pg.addColorStop(1,'transparent');ctx.fillStyle=pg;ctx.fillRect(500,60,440,470);
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(px,392,90,16,0,0,TAU);ctx.fill();
  const pf=selFighter(cur);pf.t=G.f;pf.x=0;
  ctx.save();ctx.translate(px,390);ctx.scale(1.28,1.28);drawFighter(pf,true);ctx.restore();
  txt(d.name,px,90,56,'#fff','center',d.fc,8);txt(d.title,px,130,22,d.fc,'center','#000',5);
  txt('#'+(cur+1)+' / 30',px,160,14,'#aaa','center','#000',3);
  bars(px-130,420,'SPEED',(d.spd-.7)/.6,'#4df');bars(px-130,442,'POWER',(d.pow-.7)/.7,'#f64');bars(px-130,464,'REACH',(d.rch-.7)/.6,'#fd4');bars(px-130,486,'DEFENSE',(1.2-d.tk*.9+(d.w-1)*.1-.1)/.7,'#4f8');
  txt('FIREBALL: '+d.fb.toUpperCase(),px,512,14,d.fc,'center','#000',3);
  txt('A/D/W/S or ARROWS = move   ENTER = select   ESC = back',24,522,13,'#ccc','left','#000',3);
}
/* ---- ending ---- */
let E={t:0,fw:[]};
function startEnding(){
  G.scene='ending';E={t:0,fw:[]};R.stage=9;
  const f=F[0];Object.assign(f,{x:WORLD/2,y:0,vx:0,vy:0,rot:0,facing:1,state:'win',mv:null,crouch:false,invuln:0,flash:0});
  cam.x=WORLD/2;cam.z=1.18;PR=[];parts=[];sfx('round');
  try{localStorage.setItem('sc_best','10');bestLevel=10}catch(e){bestLevel=10}
}
function updEnding(){
  G.f++;E.t++;F[0].t++;
  if(E.t%22===0){const x=rnd(120,840),y=rnd(70,260),c=['#ff3b9a','#ffd23f','#4cf','#7dff7a','#c06bff','#ff7a2a'][(Math.random()*6)|0],n=44;
    for(let i=0;i<n;i++){const a=i/n*TAU,s=rnd(2,6);E.fw.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:60+rnd(0,20),m:80,c})};sfx('heavy')}
  for(let i=E.fw.length-1;i>=0;i--){const p=E.fw[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.vx*=.98;if(--p.l<=0)E.fw.splice(i,1)}
}
function renderEnding(){
  ctx.setTransform(1,0,0,1,0,0);
  drawBG();
  ctx.save();ctx.translate(480,GROUND);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,0);
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(F[0].x,3,44,9,0,0,TAU);ctx.fill();
  ctx.save();ctx.scale(1,-1);ctx.globalAlpha=.16;drawFighter(F[0],true);ctx.restore();
  drawFighter(F[0]);ctx.restore();
  ctx.drawImage(vignette,0,0);
  ctx.globalCompositeOperation='lighter';
  for(const p of E.fw){ctx.globalAlpha=Math.max(0,p.l/p.m);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,2.6,0,TAU);ctx.fill()}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  const t=E.t,d=F[0].def;
  if(t<420){
    const k=Math.min(1,t/20);bigText('CONGRATULATIONS!',90,86,lerp(2,1,k),k);
    if(t>60)txt(d.name+'  —  '+d.title,W/2,160,30,'#fff','center','#000',6);
    if(t>110)txt('YOU DEFEATED ALL 10 OPPONENTS',W/2,198,26,'#ffd23f','center','#000',5);
    if(t>170)txt('YOU ARE THE NEW STREET CLASH CHAMPION!',W/2,232,22,'#9ef','center','#000',4);
    if(t>230){const n=G.arc.opps.length;for(let i=0;i<n;i++){const x=W/2-(n*50)/2+i*50+25;ctx.globalAlpha=.9;ctx.drawImage(portrait(G.arc.opps[i]),x-22,H-86,44,48);ctx.strokeStyle='#ffd23f';ctx.strokeRect(x-22,H-86,44,48);ctx.globalAlpha=1;txt('✕',x,H-62,26,'rgba(255,60,60,.85)','center','#000',2)}}
  }else{
    const lines=['STREET CLASH','','— THE END —','','FIGHTERS','','KAZE  RAVEN  JADE  TITAN  ZARA  HAWK','SORA  VIPER  BRUTUS  LUNA  KANE  MIKA','DRAKE  ONYX  SAKURA  BOLT  IVAN  NOVA','RYKER  AMARA  SHADE  GRIZZ  YUKI  CRUZ','TEMPEST  DAGGER  MAYA  OGRE  PHOENIX  OMEGA','','STAGES','','NEON CITY  •  SUNSET ROOFTOP  •  SHAOLIN DOJO','HARBOR NIGHT  •  BAMBOO FOREST  •  DESERT RUINS','FROZEN PEAK  •  VOLCANO FORGE  •  SAKURA TEMPLE','FINAL ARENA','','THANK YOU FOR PLAYING!'];
    const off=(t-420)*.9;
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,W,H);
    lines.forEach((s,i)=>{const y=H+30+i*40-off;if(y>-30&&y<H+30)txt(s,W/2,y,i===0?60:s===''?0:(s==='FIGHTERS'||s==='STAGES'||s==='— THE END —')?30:22,i===0?'#ffd23f':(s==='FIGHTERS'||s==='STAGES')?'#ff7ad0':'#fff','center','#000',5)});
  }
  if(t>120&&G.f%80<50)txt('PRESS ENTER',W-110,H-26,22,'#fff','center','#000',5);
}
function render(){
  ctx.setTransform(1,0,0,1,0,0);
  if(G.scene==='title')renderTitle();
  else if(G.scene==='select')renderSelect();
  else if(G.scene==='ending')renderEnding();
  else{
    renderWorld();drawHUD();drawBanners();
    if(G.paused){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,0,W,H);bigText('PAUSED',H/2-30,100);txt('ESC/P = Resume      Q = Quit to menu',W/2,H/2+50,26,'#fff','center','#000',5)}
  }
}

/* ---------------- arcade ---------------- */
function startArcade(){
  const p=G.sel[0],pool=[];for(let i=0;i<30;i++)if(i!==p&&i!==29)pool.push(i);
  for(let i=pool.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[pool[i],pool[j]]=[pool[j],pool[i]]}
  const opps=pool.slice(0,9);opps.push(p===29?pool[9]:29);
  G.arc={level:1,cont:0,opps};
}
function aiLevel(){
  if(G.mode!==0||R.demo)return DIFF[G.diff];
  const k=clamp((G.arc.level-1)/9+(G.diff-1)*.18,0,1);
  return {block:lerp(.1,.92,k),punish:lerp(.05,.9,k),aggr:lerp(.55,1.9,k),fire:lerp(.5,1.4,k),chain:lerp(.25,1,k)};
}
function saveBest(l){try{if(l>bestLevel){bestLevel=l;localStorage.setItem('sc_best',String(l))}}catch(e){}}
function confirmSelect(){
  sfx('round');
  if(G.pick===0&&G.mode>0){G.pick=1;G.sel[1]=G.mode===2?(G.sel[0]+1)%30:(G.sel[0]+7)%30;return}
  if(G.mode===0)startArcade();
  G.scene='game';startMatch(false);
}
function moveSel(c){
  const i=G.sel[G.pick];let n=i;
  if(c==='ArrowLeft'||c==='KeyA')n=(i+29)%30;else if(c==='ArrowRight'||c==='KeyD')n=(i+1)%30;
  else if(c==='ArrowUp'||c==='KeyW')n=(i+24)%30;else if(c==='ArrowDown'||c==='KeyS')n=(i+6)%30;
  if(n!==i){G.sel[G.pick]=n;sfx('ui')}
}
function onKey(c){
  if(c==='KeyM'){musicOn=!musicOn;return}
  const ok=c==='Enter'||c==='Space'||c==='KeyJ'||c==='Numpad1'||c==='Comma';
  if(G.scene==='title'){
    if(c==='ArrowUp'||c==='KeyW'){G.row=(G.row+2)%3;sfx('ui')}
    else if(c==='ArrowDown'||c==='KeyS'){G.row=(G.row+1)%3;sfx('ui')}
    else if(c==='ArrowLeft'||c==='KeyA'||c==='ArrowRight'||c==='KeyD'){
      const d=(c==='ArrowLeft'||c==='KeyA')?-1:1;
      if(G.row===0)G.mode=(G.mode+d+3)%3;else if(G.row===1)G.diff=(G.diff+d+4)%4;sfx('ui');
    }else if(ok){
      if(G.row===0){G.mode=(G.mode+1)%3;sfx('ui')}
      else if(G.row===1){G.diff=(G.diff+1)%4;sfx('ui')}
      else{G.scene='select';G.pick=0;sfx('ui')}
    }
  }else if(G.scene==='select'){
    if(ok)confirmSelect();
    else if(c==='Escape'||c==='Backspace'){if(G.pick>0)G.pick=0;else{toTitle()}}
    else moveSel(c);
  }else if(G.scene==='ending'){
    if((c==='Enter'||c==='Space')&&E.t>60)toTitle();
  }else if(G.scene==='game'){
    if(R.phase==='prelude'&&(c==='Enter'||c==='Space')){R.pt=Math.max(R.pt,150)}
    else if(R.phase==='match'){
      if(c==='Enter'||c==='Space'){
        if(G.mode===0){
          if(R.winner===0){G.arc.level++;}else G.arc.cont++;
          startMatch(false);
        }else startMatch(false);
      }else if(c==='Escape')toTitle();
    }else if(c==='Escape'||c==='KeyP'){G.paused=!G.paused}
    else if(c==='KeyQ'&&G.paused){toTitle()}
  }
}
cv.addEventListener('pointerdown',e=>{
  initAudio();
  try{if(matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement){document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{});screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}}catch(_){}
  const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;
  if(G.scene==='title'){
    const i=Math.floor((y-217)/54);
    if(i>=0&&i<3&&Math.abs(x-W/2)<280){G.row=i;onKey('Enter')}
  }else if(G.scene==='select'){
    const cx=Math.floor((x-SEL.x)/(SEL.cw+4)),cy=Math.floor((y-SEL.y)/(SEL.ch+4)),i=cy*SEL.cols+cx;
    if(cx>=0&&cx<SEL.cols&&cy>=0&&cy<5&&i<30){if(G.sel[G.pick]===i)confirmSelect();else{G.sel[G.pick]=i;sfx('ui')}}
    else if(x>520&&y>380)confirmSelect();
  }else if(G.scene==='ending')onKey('Enter');
  else if(G.scene==='game'&&(R.phase==='match'||R.phase==='prelude'))onKey('Enter');
});

/* ---------------- touch controls ---------------- */
(function(){
  if(!(matchMedia('(pointer:coarse)').matches))return;
  const t=document.getElementById('touch');t.style.display='block';
  const defs=[['◀','KeyA','left:2vmin;bottom:16vmin'],['▶','KeyD','left:19vmin;bottom:16vmin'],['▲','KeyW','left:10.5vmin;bottom:32vmin'],['▼','KeyS','left:10.5vmin;bottom:2vmin'],
    ['P','KeyJ','right:20vmin;bottom:18vmin'],['K','KeyK','right:3vmin;bottom:18vmin'],['FIRE','KeyL','right:20vmin;bottom:2vmin'],['SUPER','KeyU','right:3vmin;bottom:2vmin'],
    ['II','Escape','right:2vmin;top:-40vh']];
  for(const [l,c,pos] of defs){
    const b=document.createElement('div');b.className='b';b.textContent=l;b.style.cssText=pos;
    if(c==='Escape'){b.style.cssText='right:2vmin;bottom:calc(100% - 4vmin);width:9vmin;height:9vmin';}
    const dn=e=>{e.preventDefault();b.classList.add('on');if(!keys[c]){keys[c]=true;onKey(c)}};
    const up=e=>{e.preventDefault();b.classList.remove('on');keys[c]=false};
    b.addEventListener('pointerdown',dn);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);
    t.appendChild(b);
  }
})();

/* ---------------- loop ---------------- */
let last=performance.now(),acc=0;
function loop(now){
  const dt=Math.min(.1,(now-last)/1000);last=now;
  if(!(G.paused&&G.scene==='game')){
    acc+=dt*ts;
    let n=0;
    while(acc>=1/60&&n<5){if(G.scene==='ending')updEnding();else update();acc-=1/60;n++}
  }
  render();
  requestAnimationFrame(loop);
}
function boot(){toTitle();requestAnimationFrame(loop)}
window.__game={G,R,get F(){return F},keys,onKey};
