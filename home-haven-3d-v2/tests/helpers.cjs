module.exports.install = `
window.skipDialogs = async()=>{ for(let i=0;i<20;i++){ const d=document.getElementById('dialog'); if(d && !d.classList.contains('hidden')){ document.getElementById('dlSkip').click(); await new Promise(r=>setTimeout(r,200)); } else break; } };
window.closeModal = async()=>{ const m=document.getElementById('modal'); if(m && !m.classList.contains('hidden')){ const b=m.querySelector('.btn.secondary,.xbtn,.btn.primary'); b&&b.click(); await new Promise(r=>setTimeout(r,250)); } };
const E=[[0,-.5],[.5,0],[0,.5],[-.5,0]];
window.place=(part,x,z,rot=0,lvl=0)=>{
  const S=__game.S, P=SPRITES.parts[part]; if(!(S.inv[part]>0)) S.inv[part]=(S.inv[part]||0)+1;
  WORLD.setMode('build'); WORLD.setLevel(lvl); WORLD.startPlace(part); WORLD.place.rot=rot; WORLD.pendingRot=rot;
  let sx,sz,h=lvl*WORLD.H+(P.kind==='roof'?WORLD.H:0);
  if(P.kind==='wall'){ const e=E[rot]; sx=x+.5+e[0]*.8; sz=z+.5+e[1]*.8; } else { const [fw,fd]=WORLD.footprint(part,rot); sx=x+fw/2; sz=z+fd/2; }
  const pt=WORLD.toScreen(sx,sz,h); const before=S.layout.length;
  WORLD.tap(pt[0],pt[1]); if (P.kind==='item' && WORLD.ghostCand) WORLD.tap(pt[0],pt[1]);
  WORLD.cancelPlace(); return S.layout.length>before || (P.kind==='wall' && S.layout.some(o=>o.part===part&&o.x===x&&o.z===z&&o.rot===rot));
};
window.sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
`;
