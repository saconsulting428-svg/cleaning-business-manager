const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:process.env.CHROMIUM || undefined, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
  const p = await b.newPage({viewport:{width:420,height:820}});
  p.on('pageerror',e=>console.log('PAGEERR',e.message));
  await p.goto('file://'+process.cwd()+'/'+process.argv[2]); await p.waitForSelector('#menu.on',{timeout:60000});
  const out = await p.evaluate(()=>{
    const G=__game, S=G.S, CH=GAME_DATA.CHAPTERS, PART=SPRITES.parts; const res=[];
    for (let c=0;c<CH.length;c++){
      S.chapter=c; S.layout=[]; S.inv={}; S.matIdx=0; S.cleared=[0,1,2,3,4,5,6,7];
      const ch=CH[c]; Object.entries(ch.start).forEach(([id,n])=>S.inv[id]=(S.inv[id]||0)+n);
      const place=()=>{ ch.quests.forEach(q=>{ if(!q.test||!q.give) return; for(const id of Object.keys(S.inv)){ while(S.inv[id]>0 && S.layout.filter(o=>q.test(o)).length<q.n && q.test({part:id,lvl:q.lvl||0,color:PART[id].color})){ S.inv[id]--; S.layout.push({id:'x'+S.layout.length,part:id,x:0,z:0,rot:0,lvl:q.lvl||0,color:PART[id].color}); } } }); };
      place(); let wins=0, empties=0; const done=()=>ch.quests.filter(q=>q.test&&q.give).every(q=>S.layout.filter(o=>q.test(o)).length>=q.n);
      while(!done() && wins<80){ const m=G.guaranteedMats(); if(!Object.keys(m).length) empties++; Object.entries(m).forEach(([id,n])=>S.inv[id]=(S.inv[id]||0)+n); wins++; place(); }
      res.push({chapter:c+1,title:ch.title,winsToMaterialComplete:wins,emptyRewards:empties,done:done()});
    }
    // post-story free rotation never empty
    S.chapter=CH.length; S.matIdx=0; let empty=0; for(let i=0;i<60;i++){ if(!Object.keys(G.guaranteedMats()).length) empty++; }
    res.push({postStoryEmptyOf60:empty});
    return res;
  });
  console.log(out.map(o=>JSON.stringify(o)).join('\n'));
  await b.close();
})();
