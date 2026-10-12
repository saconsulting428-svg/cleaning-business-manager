/* HUSH HD - 3D renderer for the rigged characters. The same skeleton poses that drive the 2D painter (rig.js) are turned into a signed-distance-field body
   (smooth capsules, ellipsoids and boxes with real surface normals), ray-marched in a small WebGL pass: soft key light, red/cool rim light, ambient occlusion,
   cloth/skin noise, glowing veins. The result is drawn into the figure's off-screen surface, so the rest of the renderer is unchanged. If WebGL is
   unavailable (or Rig3D.enabled is false) rig.js falls back to its 2D painter. Orthographic camera looking along -z, +x is forward, +y up, metres. */
const Rig3D = (function () {
  'use strict';
  const MAXW = 800, MAXH = 560;
  let gl = null, cv = null, failed = false; const progs = {};
  const COMMON = [
    'precision highp float;',
    'uniform vec2 uRes; uniform float uScale, uPM, uT; uniform vec4 uBox; uniform vec2 uOrg;',
    'float dot2(vec3 v){return dot(v,v);}',
    'float smin(float a,float b,float k){float h=max(k-abs(a-b),0.0)/k;return min(a,b)-h*h*k*0.25;}',
    'float hash(vec3 p){p=fract(p*0.3183099+vec3(0.1,0.2,0.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
    'float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float fbm(vec3 p){return 0.55*vnoise(p)+0.3*vnoise(p*2.1)+0.15*vnoise(p*4.3);}',
    'float sdRC(vec3 p,vec3 a,vec3 b,float r1,float r2){vec3 ba=b-a;float l2=dot(ba,ba);float rr=r1-r2;float a2=l2-rr*rr;float il2=1.0/l2;vec3 pa=p-a;float y=dot(pa,ba);float z=y-l2;float x2=dot2(pa*l2-ba*y);float y2=y*y*l2;float z2=z*z*l2;float k=sign(rr)*rr*rr*x2;if(sign(z)*a2*z2>k)return sqrt(x2+z2)*il2-r2;if(sign(y)*a2*y2<k)return sqrt(x2+y2)*il2-r1;return (sqrt(x2*a2*il2)+y*rr)*il2-r1;}',
    'float sdE(vec3 p,vec3 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.0)/k1;}',
    'float sdBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0)-r;}',
    'vec2 rot(vec2 v,float a){float c=cos(a),s=sin(a);return vec2(v.x*c-v.y*s,v.x*s+v.y*c);}',
    'vec2 MAP(vec3 p);',
    'vec3 nrm(vec3 p){vec2 e=vec2(1.0,-1.0)*0.0035;return normalize(e.xyy*MAP(p+e.xyy).x+e.yyx*MAP(p+e.yyx).x+e.yxy*MAP(p+e.yxy).x+e.xxx*MAP(p+e.xxx).x);}',
    'float ao(vec3 p,vec3 n){float o=0.0,s=1.0;for(int i=1;i<5;i++){float h=0.025*float(i);o+=(h-MAP(p+n*h).x)*s;s*=0.62;}return clamp(1.0-3.4*o,0.0,1.0);}',
    'vec3 SHADE(vec3 p,vec3 n,float id,float occ);',
    'void main(){',
    ' vec2 px=gl_FragCoord.xy/uScale; vec2 m=vec2(px.x/uPM-uOrg.x, px.y/uPM-uOrg.y);',
    ' if(m.x<uBox.x||m.x>uBox.z||m.y<uBox.y||m.y>uBox.w||gl_FragCoord.x>uRes.x||gl_FragCoord.y>uRes.y){gl_FragColor=vec4(0.0);return;}',
    ' float t=0.0,best=1e3;vec3 pb=vec3(m,0.0);float hit=0.0;float pxm=1.0/(uPM*uScale);',
    ' for(int i=0;i<44;i++){vec3 p=vec3(m,0.9-t);float d=MAP(p).x;if(d<best){best=d;pb=p;}if(d<0.0012){hit=1.0;pb=p;break;}t+=d*0.9;if(t>1.8)break;}',
    ' float cov=hit>0.5?1.0:1.0-smoothstep(0.0,pxm*1.4,best); if(cov<0.02){gl_FragColor=vec4(0.0);return;}',
    ' vec3 n=nrm(pb);vec2 r=MAP(pb);float occ=ao(pb,n);',
    ' vec3 col=SHADE(pb,n,r.y,occ);',
    ' col=pow(col,vec3(0.82));gl_FragColor=vec4(col*cov,cov);}'
  ].join('\n');

  const SURV = [
    'uniform vec2 uHip,uSh,uNeck,uHead,uPitch,uFlags; uniform float uHeadA,uLean,uPackA; uniform vec4 uArmN,uArmF,uLegN,uLegF; uniform vec3 uTorch,uFall;',
    'vec3 gboot(vec2 ank,float pitch,float z,vec3 p){float c=cos(pitch),s=sin(pitch);vec2 a=ank+vec2(-0.05*c+0.04*s,-0.05*s-0.04*c),b=ank+vec2(0.17*c+0.06*s,0.17*s-0.06*c),h=ank+vec2(-0.02*c-0.08*s,-0.02*s+0.08*c),k=ank+vec2(-0.04*c+0.02*s,-0.04*s-0.02*c);float d=sdRC(p,vec3(a,z),vec3(b,z),0.058,0.046);d=smin(d,sdRC(p,vec3(h,z),vec3(k,z),0.066,0.066),0.03);return vec3(d,0.0,0.0);}',
    'float torch(vec3 p,vec2 o,float a,float z,out float lens){vec2 d=vec2(cos(a),sin(a));vec3 a0=vec3(o,z),b=a0+vec3(d,0.0)*0.17;float v=sdRC(p,a0-vec3(d,0.0)*0.04,b,0.03,0.034);v=min(v,sdRC(p,b,b+vec3(d,0.0)*0.05,0.034,0.05));lens=length(p-(b+vec3(d,0.0)*0.052))-0.04;return v;}',
    'vec2 MAP(vec3 p){',
    ' float skin=1e3,jac=1e3,pan=1e3,boot=1e3,pack=1e3,hair=1e3,met=1e3,lens=1e3,dark=1e3;',
    ' vec3 q=vec3(p.xy,p.z*1.25); vec2 up=vec2(sin(uLean),cos(uLean));',
    ' jac=sdRC(q,vec3(uHip+up*0.05,0.0),vec3(uSh.x,uSh.y-0.03,0.0),0.15,0.17)/1.25;',
    ' jac=smin(jac,length(p-vec3(uSh.x,uSh.y-0.03,0.17))-0.078,0.05);jac=smin(jac,length(p-vec3(uSh.x,uSh.y-0.03,-0.17))-0.078,0.05);',
    ' vec3 S=vec3(uSh.x,uSh.y-0.03,0.0);',
    ' for(int k=0;k<2;k++){vec4 A=k==0?uArmN:uArmF;float z=k==0?0.18:-0.18;vec3 e=vec3(A.xy,z),h=vec3(A.zw,z),s=S+vec3(0.0,0.0,z*0.95);',
    '  float a=smin(sdRC(p,s,e,0.07,0.058),sdRC(p,e,h,0.058,0.047),0.03);jac=min(jac,a);vec3 fd=normalize(h-e);skin=min(skin,length(p-(h+fd*0.035))-0.046);}',
    ' pan=length(vec3(p.x-uHip.x,p.y-uHip.y,p.z*1.2))-0.135;',
    ' for(int k=0;k<2;k++){vec4 L=k==0?uLegN:uLegF;float z=k==0?0.085:-0.085;float pt=k==0?uPitch.x:uPitch.y;',
    '  float l=smin(sdRC(p,vec3(uHip,z),vec3(L.xy,z),0.108,0.077),sdRC(p,vec3(L.xy,z),vec3(L.zw,z),0.077,0.06),0.035);pan=smin(pan,l,0.02);',
    '  boot=min(boot,gboot(L.zw,pt,z,p).x);}',
    ' skin=min(skin,sdRC(p,vec3(uSh.x,uSh.y,0.0),vec3(uHead.x,uHead.y-0.06,0.0),0.06,0.052));',
    ' jac=smin(jac,length(vec3(p.xy-vec2(uNeck.x-0.05,uNeck.y-0.015),p.z*0.9))-0.105,0.06);',
    ' vec2 d=p.xy-uHead;vec2 lp2=rot(d,uHeadA)/1.15;vec3 lp=vec3(lp2,p.z/1.15);',
    ' float sk=sdE(lp-vec3(0.015,0.0,0.0),vec3(0.1,0.118,0.095));sk=smin(sk,length(lp-vec3(0.108,-0.025,0.0))-0.02,0.03);sk=smin(sk,sdE(lp-vec3(0.045,-0.07,0.0),vec3(0.075,0.06,0.075)),0.04);',
    ' sk=min(sk,length(vec3(lp.xy-vec2(-0.03,-0.01),abs(lp.z)-0.093))-0.022);skin=min(skin,sk*1.15);',
    ' float bd=max(sdE(lp-vec3(0.04,-0.065,0.0),vec3(0.09,0.078,0.09)),lp.y-0.012);hair=bd*1.15+0.002;',
    ' float hr=sdE(lp-vec3(-0.025,0.035,0.0),vec3(0.118,0.126,0.108))+0.012*vnoise(lp*60.0);hr=max(hr,-(lp.y-0.012+0.7*max(lp.x,0.0)));hair=min(hair,hr*1.15);',
    ' dark=length(vec3(lp.xy-vec2(0.088,0.03),abs(lp.z)-0.043))-0.013;',
    ' vec2 o=vec2(uSh.x,uSh.y-0.04);vec2 lq=rot(p.xy-o,uLean-uPackA);vec3 pl=vec3(lq-vec2(-0.18,-0.24),p.z);',
    ' pack=sdBox(pl,vec3(0.1,0.22,0.1),0.065);pack=smin(pack,sdBox(vec3(lq-vec2(-0.3,-0.33),p.z),vec3(0.025,0.09,0.11),0.03),0.03);pack=smin(pack,sdBox(vec3(lq-vec2(-0.17,-0.03),p.z),vec3(0.09,0.04,0.11),0.04),0.03);',
    ' pack=min(pack,sdRC(p,vec3(uSh.x+up.y*0.06+0.08,uSh.y-0.12,0.1),vec3(uHip+up*0.13+vec2(0.08,0.0),0.1),0.02,0.02));',
    ' if(uFlags.x>0.5){float ln;met=torch(p,uTorch.xy,uTorch.z,0.2,ln);lens=min(lens,ln);}',
    ' if(uFlags.y>0.5){float ln;float f=torch(p,uFall.xy,uFall.z,0.0,ln);met=min(met,f);lens=min(lens,ln);}',
    ' vec2 r=vec2(skin,1.0);',
    ' if(jac<r.x)r=vec2(jac,2.0);if(pan<r.x)r=vec2(pan,3.0);if(boot<r.x)r=vec2(boot,4.0);if(pack<r.x)r=vec2(pack,5.0);if(hair<r.x)r=vec2(hair,6.0);if(met<r.x)r=vec2(met,7.0);if(lens<r.x)r=vec2(lens,8.0);if(dark<r.x)r=vec2(dark,9.0);',
    ' return r;}',
    'vec3 SHADE(vec3 p,vec3 n,float id,float occ){',
    ' vec3 alb=vec3(0.5);float rough=0.8;float fab=vnoise(p*140.0)*0.5+vnoise(p*45.0)*0.5;',
    ' if(id<1.5){alb=vec3(0.5,0.35,0.28)*(0.85+0.3*fab);rough=0.6;}',
    ' else if(id<2.5){alb=vec3(0.085,0.095,0.08)*(0.6+0.8*fab);}',
    ' else if(id<3.5){alb=vec3(0.05,0.055,0.065)*(0.6+0.8*fab);}',
    ' else if(id<4.5){alb=vec3(0.03,0.028,0.028)*(0.7+0.6*fab);rough=0.85;}',
    ' else if(id<5.5){alb=vec3(0.075,0.082,0.062)*(0.55+0.9*fab);}',
    ' else if(id<6.5){alb=vec3(0.035,0.03,0.03)*(0.6+0.8*fab);}',
    ' else if(id<7.5){alb=vec3(0.22,0.23,0.25);rough=0.3;}',
    ' else if(id<8.5){return vec3(2.2,2.4,2.5);}',
    ' else {alb=vec3(0.02);}',
    ' vec3 nn=normalize(n+(vec3(vnoise(p*160.0),vnoise(p*160.0+7.0),vnoise(p*160.0+13.0))-0.5)*0.22*(id>1.5&&id<6.5?1.0:0.35));',
    ' vec3 L1=normalize(vec3(0.7,0.35,0.7)),L2=normalize(vec3(-0.6,0.45,-0.6)),V=vec3(0.0,0.0,1.0);',
    ' float d1=max(dot(nn,L1),0.0),d2=max(dot(nn,L2),0.0);',
    ' vec3 key=vec3(0.7,0.85,1.0)*1.05*d1;vec3 rim=vec3(0.45,0.62,0.85)*0.8*d2;',
    ' float fr=pow(1.0-max(dot(nn,V),0.0),3.0);',
    ' vec3 spec=vec3(0.7,0.85,1.0)*pow(max(dot(reflect(-L1,nn),V),0.0),mix(48.0,10.0,rough))*(1.0-rough)*0.7;',
    ' vec3 amb=vec3(0.045,0.055,0.07)+vec3(0.04,0.05,0.07)*(nn.y*0.5+0.5);',
    ' vec3 c=alb*(key+rim+amb*2.2)*occ+spec*occ+vec3(0.42,0.6,0.85)*fr*0.3*smoothstep(0.0,0.5,nn.x+0.45)*occ;',
    ' c*=mix(0.55,1.0,smoothstep(0.0,0.4,p.y));return c;}'
  ].join('\n');

  const MON = [
    'uniform vec2 uHip,uSh,uNeck,uHead,uPitch,uHA; uniform float uHeadA,uLean,uJaw,uRoll; uniform vec4 uArmN,uArmF,uLegN,uLegF;',
    'float spikes(vec3 p){float d=1e3;vec2 f=vec2(cos(uLean),-sin(uLean)),u=vec2(sin(uLean),cos(uLean));',
    ' for(int i=0;i<11;i++){float t=float(i)/10.0;vec2 sp=mix(uHip+vec2(0.0,0.22),uNeck+vec2(0.0,0.05),t)-f*0.2;float z=(mod(float(i),2.0)-0.5)*0.12;float L=0.17+0.17*sin(t*3.14159)+0.07*hash(vec3(float(i),1.0,2.0));',
    '  float w=sin(uT*3.2+float(i)*0.7)*0.18+uRoll*0.3;vec2 dir=normalize(-f*0.75+u*0.7+vec2(0.0,0.0));dir=rot(dir,w-0.25*(1.0-t));',
    '  d=min(d,sdRC(p,vec3(sp,z),vec3(sp+dir*L,z*1.4),0.028,0.003));}return d;}',
    'vec2 MAP(vec3 p){',
    ' float hide=1e3,bone=1e3,spk=1e3,eye=1e3,dk=1e3;',
    ' vec2 f=vec2(cos(uLean),-sin(uLean));vec3 q=vec3(p.xy,p.z*1.1);',
    ' vec2 ax=uSh-uHip;float al=length(ax);vec2 ad=ax/al;float tt=dot(p.xy-uHip,ad)/al;',
    ' float tor=sdRC(q,vec3(uHip,0.0),vec3(uSh,0.0),0.25,0.29)/1.1;tor+=0.016*sin(tt*40.0)*smoothstep(0.35,0.5,tt)*smoothstep(1.0,0.8,tt)*step(0.0,dot(p.xy-uHip,f)-0.05);',
    ' tor=smin(tor,length(vec3(p.xy-(uSh+f*0.06-vec2(0.0,0.07)),p.z*1.1))-0.25,0.12);hide=tor;',
    ' hide=smin(hide,sdRC(p,vec3(uSh,0.0),vec3(uHead-vec2(0.04,0.04),0.0),0.17,0.12),0.1);',
    ' vec2 d=p.xy-uHead;vec2 lp2=rot(d,uHeadA+uRoll*0.2);vec3 lp=vec3(lp2,p.z)/1.25;',
    ' float sk=sdRC(lp,vec3(-0.06,0.0,0.0),vec3(0.2,0.0,0.0),0.135,0.088);sk=smin(sk,sdRC(lp,vec3(0.17,-0.01,0.0),vec3(0.37,-0.04,0.0),0.08,0.045),0.05);',
    ' sk=smin(sk,sdRC(lp,vec3(0.12,0.1,0.07),vec3(0.26,0.085,0.07),0.036,0.03),0.04);sk=smin(sk,sdRC(lp,vec3(0.12,0.1,-0.07),vec3(0.26,0.085,-0.07),0.036,0.03),0.04);',
    ' sk=min(sk,sdRC(lp,vec3(-0.05,0.1,0.06),vec3(-0.13,0.35,0.08),0.045,0.006));sk=min(sk,sdRC(lp,vec3(-0.05,0.1,-0.06),vec3(-0.13,0.35,-0.08),0.045,0.006));',
    ' vec2 jl=rot(lp.xy-vec2(0.0,-0.02),uJaw*0.5)+vec2(0.0,-0.02);vec3 jp=vec3(jl,lp.z);float jw=sdRC(jp,vec3(0.0,-0.055,0.0),vec3(0.3,-0.08,0.0),0.07,0.04);',
    ' for(int i=0;i<5;i++){float x=0.16+0.045*float(i);for(int s=0;s<2;s++){float z=s==0?0.04:-0.04;bone=min(bone,1.25*sdRC(lp,vec3(x,-0.04,z),vec3(x+0.006,-0.09-0.03*uJaw,z),0.013,0.002));bone=min(bone,1.25*sdRC(jp,vec3(x-0.04,-0.07,z),vec3(x-0.035,-0.015,z),0.011,0.002));}}',
    ' hide=smin(hide,sk*1.25,0.05);hide=min(hide,jw*1.25);eye=1.25*(length(vec3(lp.xy-vec2(0.2,0.07),abs(lp.z)-0.07))-0.03);',
    ' for(int k=0;k<2;k++){vec4 A=k==0?uArmN:uArmF;float ha=k==0?uHA.x:uHA.y;float z=k==0?0.33:-0.33;vec3 s=vec3(uSh+vec2(-0.02,-0.06),z*0.9),e=vec3(A.xy,z),h=vec3(A.zw,z);',
    '  float a=smin(sdRC(p,s,e,0.125,0.08),sdRC(p,e,h,0.08,0.052),0.045);hide=smin(hide,a,0.06);hide=min(hide,length(p-h)-0.07);',
    '  for(int i=0;i<4;i++){float ang=ha-1.57+0.2+(float(i)-1.5)*0.3;vec2 cd=vec2(cos(ang),sin(ang));vec3 c0=h+vec3(cd,0.0)*0.05+vec3(0.0,0.0,(float(i)-1.5)*0.04);bone=min(bone,sdRC(p,c0,c0+vec3(cd*0.22,0.0)+vec3(0.0,-0.02,0.0),0.016,0.003));}}',
    ' for(int k=0;k<2;k++){vec4 L=k==0?uLegN:uLegF;float pt=k==0?uPitch.x:uPitch.y;float z=k==0?0.2:-0.2;',
    '  float l=smin(sdRC(p,vec3(uHip.x-0.05,uHip.y,z),vec3(L.xy,z),0.17,0.1),sdRC(p,vec3(L.xy,z),vec3(L.zw,z),0.1,0.055),0.05);hide=smin(hide,l,0.06);',
    '  float c=cos(pt),s=sin(pt);vec2 an=L.zw;vec2 h1=an+vec2(-0.08*c+0.1*s,-0.08*s-0.1*c),t1=an+vec2(0.36*c+0.24*s,0.36*s-0.24*c);',
    '  hide=smin(hide,sdRC(p,vec3(h1,z),vec3(t1,z),0.06,0.04),0.04);',
    '  for(int i=0;i<3;i++){float zz=z+(float(i)-1.0)*0.045;vec2 c0=t1;vec2 c1=t1+vec2(0.16*c+0.04*s,0.16*s-0.04*c);bone=min(bone,sdRC(p,vec3(c0,zz),vec3(c1,zz),0.016,0.003));}}',
    ' spk=spikes(p);',
    ' hide+=0.012*(fbm(p*22.0)-0.5);',
    ' vec2 r=vec2(hide,1.0);if(bone<r.x)r=vec2(bone,2.0);if(spk<r.x)r=vec2(spk,3.0);if(eye<r.x)r=vec2(eye,4.0);',
    ' return r;}',
    'vec3 SHADE(vec3 p,vec3 n,float id,float occ){',
    ' float pulse=0.8+0.2*sin(uT*2.4);',
    ' if(id>3.5)return vec3(3.0,0.25,0.2)*pulse;',
    ' vec3 alb=vec3(0.085,0.058,0.06);float nz=fbm(p*30.0);alb*=0.55+0.9*nz;',
    ' if(id>2.5)alb=vec3(0.045,0.03,0.035)*(0.7+0.6*nz);',
    ' else if(id>1.5)alb=vec3(0.55,0.5,0.42)*(0.5+0.7*nz);',
    ' vec3 nn=normalize(n+(vec3(vnoise(p*120.0),vnoise(p*120.0+5.0),vnoise(p*120.0+9.0))-0.5)*0.3);',
    ' vec3 V=vec3(0.0,0.0,1.0);vec3 Lk=normalize(vec3(0.5,0.5,0.8)),Lr=normalize(vec3(-0.5,0.5,-0.7));',
    ' float dk=max(dot(nn,Lk),0.0),dr=max(dot(nn,Lr),0.0);',
    ' vec3 c=alb*(vec3(0.55,0.62,0.8)*1.0*dk+vec3(1.0,0.12,0.08)*0.85*dr+vec3(0.05,0.03,0.04)*2.0)*occ;',
    ' float fr=pow(1.0-max(dot(nn,V),0.0),2.4);c+=vec3(1.0,0.16,0.12)*fr*0.5*occ;',
    ' float vn=abs(fbm(p*9.0+vec3(0.0,0.0,uT*0.05))-0.5);float vein=smoothstep(0.011,0.0,vn)*(id<1.5?1.0:0.0);c+=vec3(1.0,0.12,0.1)*vein*0.45*pulse;',
    ' c+=vec3(0.5,0.05,0.04)*0.05*occ*(id<1.5?1.0:0.0);',
    ' c+=vec3(0.7,0.8,1.0)*pow(max(dot(reflect(-Lk,nn),V),0.0),24.0)*0.25*(id<1.5?1.0:0.0)*occ;',
    ' return c;}'
  ].join('\n');

  const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}';
  function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function program(body) {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
    /* body defines MAP and SHADE, and must precede main(): split COMMON at the forward declarations */
    const i = COMMON.indexOf('void main(){'), src = COMMON.slice(0, i) + body + '\n' + COMMON.slice(i);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src)); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return { p, loc: {} };
  }
  function init() {
    if (gl || failed) return !!gl;
    try {
      cv = document.createElement('canvas'); cv.width = MAXW; cv.height = MAXH;
      gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true, depth: false, stencil: false, powerPreference: 'high-performance' });
      if (!gl) throw new Error('no webgl');
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      progs.surv = program(SURV); progs.mon = program(MON);
    } catch (e) { failed = true; gl = null; if (typeof console !== 'undefined') console.warn('Rig3D disabled:', e.message); return false; }
    return true;
  }
  function U(P, name) { let l = P.loc[name]; if (l === undefined) l = P.loc[name] = gl.getUniformLocation(P.p, name); return l; }
  function set(P, name, a, b, c, d) { const l = U(P, name); if (l === null) return; if (d !== undefined) gl.uniform4f(l, a, b, c, d); else if (c !== undefined) gl.uniform3f(l, a, b, c); else if (b !== undefined) gl.uniform2f(l, a, b); else gl.uniform1f(l, a); }

  /* box: [xmin, ymin, xmax, ymax] in metres in surface space (x from the figure's centre, y up from the floor line). Returns the GL canvas and the source rectangle to copy. */
  function render(kind, W, H, PM, origin, box, t, setter) {
    if (!api.enabled || !init()) return null;
    const sc = Math.min(1, MAXW / W, MAXH / H, api.maxPx / Math.max(W, H)), w = Math.max(2, Math.ceil(W * sc)), h = Math.max(2, Math.ceil(H * sc)), P = progs[kind];
    gl.viewport(0, 0, MAXW, MAXH); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(P.p);
    set(P, 'uRes', w, h); set(P, 'uScale', sc); set(P, 'uPM', PM); set(P, 'uT', t); set(P, 'uBox', box[0], box[1], box[2], box[3]); set(P, 'uOrg', origin[0], origin[1]);
    setter(function (n, a, b, c, d) { set(P, n, a, b, c, d); });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return { cv: cv, sx: 0, sy: MAXH - h, sw: w, sh: h };
  }
  const api = { enabled: true, maxPx: 560, init: init, render: render, ok: function () { return api.enabled && init(); } };
  return api;
})();
