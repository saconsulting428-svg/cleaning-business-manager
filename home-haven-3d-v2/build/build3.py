import re,sys
s=open('../original/Home_Haven_3D.original.html',encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    n=s.count(old); assert n==count, f'count {n}!={count}: {old[:100]!r}'
    s=s.replace(old,new)
def cut(start,end,new):
    global s
    a=s.index(start); b=s.index(end,a); s=s[:a]+new+s[b:]
R=lambda f:open(f,encoding='utf-8').read()
# ---------------------------------------------------------------- CSS / HTML
rep("@media (prefers-reduced-motion:reduce){.cl,.ld-build i{animation:none}}\n</style>","@media (prefers-reduced-motion:reduce){.cl,.ld-build i{animation:none}}\n"+R('extra3.css')+"</style>")
rep('<div id="game"></div>','<div id="game"></div>\n  <div id="reno3d"></div>')
rep('<button class="nb" id="navStory"><span class="ic" data-ic="book"></span>Story</button>','<button class="nb" id="navStory"><span class="ic" data-ic="book"></span>Story</button>\n      <button class="nb" id="navProj"><span class="ic" data-ic="house"></span>Projects</button>')
rep('<button class="btn primary sm" id="btnBuildDone">Done</button>\n    </header>','<button class="btn secondary sm noedit" id="bRooms">Rooms</button>\n      <button class="btn secondary sm reonly" id="reBack">‹ Rooms</button><span class="rename reonly" id="reName"></span>\n      <button class="btn primary sm" id="btnBuildDone">Done</button>\n    </header>\n    <div class="guide hidden" id="guide"><div class="gsteps"><span class="gs">🚪 Door</span><span class="gs">🪟 Windows</span><span class="gs">🛋 Furniture</span><span class="gs">✔ Done</span></div><div class="gtxt" id="gdTxt"></div><div class="grow"><button class="btn accent" id="gdGo">Next</button><button class="btn primary sm hidden" id="gdDone">Complete ▶</button><button class="btn secondary sm" id="reMore">✎ Style</button></div></div>\n    <div class="retools reonly"><button class="btn blue" id="reWalls">Wall color</button><button class="btn blue" id="reFloor">Floor color</button><button class="btn accent" id="reSave">Save room</button><button class="btn secondary" id="reRestore">Restore</button></div>')
# ---------------------------------------------------------------- engine scripts
three=open('../vendor/three.min.js',encoding='utf-8').read()
mods=''.join('<script>'+R('../engine/'+f)+'\n</script>\n' for f in ['lib.js','furn1.js','furn2.js','furn3.js','furn4.js','parts3d.js','world3d.js','thumb.js'])
marker='<script>// Simple synthesized sound effects'; assert s.count(marker)==1
s=s.replace(marker,'<script>'+three+'\n</script>\n'+mods+marker)
a=s.index('<script>// Home Again — isometric world scene'); b=s.index('</script>',a)+len('</script>')
s=s[:a]+'<script>'+R('world_stub.js')+'</script>'+s[b:]
# ---------------------------------------------------------------- economy script: new parts, chapters, challenges, contracts, properties
cut("  // quest.give = guaranteed materials","  const FREE_MATS",R('data_ext.js'))
rep("window.GAME_DATA = { ECON, PRICES, CHAPTERS, ACH, SPIN, DAILY, FREE_MATS };","window.GAME_DATA = { ECON, PRICES, CHAPTERS, ACH, SPIN, DAILY, FREE_MATS, CHALLENGES, CONTRACTS, PROPERTIES, detectRooms, painted };")
rep("{ id: 'place50', name: 'Builder', text: 'Place 50 parts', n: 50,","{ id: 'place50', name: 'Builder', text: 'Place 50 parts', n: 50,")
rep("{ id: 'ch5', name: 'Halfway Home', text: 'Finish chapter 5', n: 5,","{ id: 'ch5', name: 'Halfway Home', text: 'Finish chapter 4', n: 4,")
rep("{ id: 'ch10', name: 'Home Haven', text: 'Finish every chapter', n: 10,","{ id: 'ch10', name: 'Home Haven', text: 'Finish every chapter', n: 7,")
# ---------------------------------------------------------------- flow script
rep("VER = 3;","VER = 5;")
rep("layout: [], inv: {}, nextId: 1,","layout: [], inv: {}, nextId: 1, prop: 'home', props: {}, cleared: [], unlocked: {}, chal: {}, contr: {}, rooms: {}, storyDone: false, firstShot: null,")
rep("    if (!d.ver || d.ver < VER) { s.ver = VER; if (raw) s.seen.migrated = 1; }","""    s.props = s.props && typeof s.props === 'object' ? s.props : {}; s.cleared = Array.isArray(s.cleared) ? s.cleared : []; ['unlocked', 'chal', 'contr', 'rooms'].forEach(k => { if (!s[k] || typeof s[k] !== 'object') s[k] = {}; });
    if (!d.ver || d.ver < 5) { // chapters changed (10 -> 7): rebuild progress from what is actually built
      const had = !!(d.layout && d.layout.length) || (d.chapter | 0) > 0; s.cleared = had ? [0, 1, 2, 3, 4, 5, 6, 7] : []; s.chapter = 0; s.prop = 'home'; s.props = {};
      const ok = (ch) => ch.quests.every(q => (q.count ? q.count(s, s.layout) : s.layout.filter(q.test).length) >= q.n);
      if ((d.chapter | 0) >= 10) s.chapter = CHAPTERS.length; else while (s.chapter < CHAPTERS.length && ok(CHAPTERS[s.chapter])) s.chapter++;
      Object.keys(s.seen).forEach(k => { if (/^ch\\d+$/.test(k)) delete s.seen[k]; }); if (had) for (let i = 0; i <= Math.min(s.chapter, CHAPTERS.length - 1); i++) s.seen['ch' + i] = 1;
      if (s.chapter >= CHAPTERS.length) s.storyDone = true;
    }
    if (!PROPS_OK(s.prop)) s.prop = 'home'; s.stats.chapters = Math.min(s.stats.chapters | 0, CHAPTERS.length); s.chapter = Math.max(0, Math.min(CHAPTERS.length, s.chapter | 0)); if (s.chapter >= CHAPTERS.length) s.storyDone = true;
    if (!d.ver || d.ver < VER) { s.ver = VER; if (raw) s.seen.migrated = 1; }""")
rep("  let S = load();","  const PROPS_OK = (id) => ['home', 'cottage', 'beach'].includes(id);\n  let S = load();")
rep("$('#bCoins').textContent = S.coins;\n  }","$('#bCoins').textContent = S.coins;\n  }")
cut("  function questProgress(ch = curCh())","  function renderHome() {",open('flow_q.js',encoding='utf-8').read())
rep("    const placed = S.layout.filter(o => q.test(o)).length;","    if (!q.give || !q.test) return 0; const placed = layoutOf('home').filter(o => q.test(o)).length;")
rep("const have = (id) => S.layout.filter(o => o.part === id).length + (S.inv[id] || 0);","const have = (id) => layoutOf('home').filter(o => o.part === id).length + (S.inv[id] || 0);")
rep("        got[id] = (got[id] || 0) + Math.min(gap, qty); return got;\n      }\n      const mats = curCh().mats,","        got[id] = (got[id] || 0) + Math.min(gap, qty); if (Object.keys(got).length >= 2) return got;\n      }\n      if (Object.keys(got).length) return got;\n      const mats = curCh().mats,")
rep("snap((u) => { if (u) { S.chBefore = u; save(); } });","snap((u) => { if (u) { S.chBefore = u; if (!S.firstShot) S.firstShot = u; save(); } });")
rep("const coins = ECON.CHAPTER_COINS(S.chapter), bundle = ch.bundle.reduce((o, [id, n]) => (o[id] = n, o), {}), before = S.chBefore;","const idx = S.chapter, coins = (ch.reward && ch.reward.coins) || ECON.CHAPTER_COINS(S.chapter), bundle = ch.bundle.reduce((o, [id, n]) => (o[id] = n, o), {}), before = S.chBefore;")
rep("    snap((after) => story(ch.outro, () => {\n      sheet({ ribbon: [`Chapter ${S.chapter} complete!`, 'green'], close: false,","    snap((after) => story(ch.outro, () => {\n      if (idx === CHAPTERS.length - 1) return showStoryComplete(after, coins);\n      sheet({ ribbon: [`Chapter ${S.chapter} complete!`, 'green'], close: false,")
rep("(finished() ? '<p class=\"body\"><b>You built the family home!</b> Every category is unlocked. Keep decorating — it\\'s your dream home.</p>' :","(finished() ? '<p class=\"body\"><b>You built the family home!</b></p>' :")
# puzzles in landscape: boosters move to a right-hand column and the board gets the full height
rep("bottom = a.bottom - $('.boosters').getBoundingClientRect().top + 10;","land = innerWidth > innerHeight, bottom = land ? 12 : a.bottom - $('.boosters').getBoundingClientRect().top + 10, right = land ? 100 : 0;")
rep("game.scene.start('Puzzle', { type: curType, level: S.level, api, rect: { top, bottom } });","game.scene.start('Puzzle', { type: curType, level: S.level, api, rect: { top, bottom, right } });")
rep("this.puzzle = new TYPES[data.type].cls(this, data.level, data.api, { x: 12, y: r.top, w: w - 24, h: h - r.top - r.bottom });","this.puzzle = new TYPES[data.type].cls(this, data.level, data.api, { x: 12, y: r.top, w: w - 24 - (r.right || 0), h: h - r.top - r.bottom });")
# Nuts & Bolts: the goal counter showed done/<sprite scale> because the constructor overwrote the generator's bolt count `k` with the sprite scale
rep("this.k = this.bw * .95 / (.8 * PZ.P);","this.goalN = this.k; this.k = this.bw * .95 / (.8 * PZ.P);")
rep("n: this.k, icon: 'pz:nut' }","n: this.goalN, icon: 'pz:nut' }")
# thumbnails of parts come from the 3D models
rep("  function thumb(name, bw = 70, bh = 62, extra = '') {\n","  function thumb(name, bw = 70, bh = 62, extra = '') {\n    const pm = /^p:(\\w+):\\d$/.exec(name); if (pm && PART[pm[1]]) { const u = RENO.partThumb(pm[1]); return u ? `<i style=\"display:block;width:${bw}px;height:${bh}px\"><img alt=\"\" src=\"${u}\" style=\"width:100%;height:100%;object-fit:contain;display:block\"></i>` : ''; }\n")
# puzzle <-> world
rep("$('#app').classList.add('puzzle'); show('play');","$('#app').classList.add('puzzle'); show('play'); WORLD.stop();")
rep("game.scene.stop('Puzzle'); game.scene.wake('World'); $('#app').classList.remove('puzzle'); show('home'); renderHome(); }","game.scene.stop('Puzzle'); $('#app').classList.remove('puzzle'); show('home'); WORLD.start(); renderHome(); }")
rep("this.st = this.hist.pop(); this.moves++; this.sel = null; this.draw(); this.info(); return true; }","this.st = this.hist.pop(); this.moves = Math.max(0, this.moves - 1); this.sel = null; this.draw(); this.info(); return true; }")
# build mode: landscape insets, room editor hooks
rep("    show('build'); WORLD.setMode('build'); WORLD.setLevel(Number($('.sg.on').dataset.l)); WORLD.setInterior(S.interior); WORLD.focus(60);","    show('build'); WORLD.setMode('build'); WORLD.setLevel(Number($('.sg.on').dataset.l)); WORLD.setInterior(S.interior); buildInsets(); if (innerHeight > innerWidth && !S.seen.rotTip) { S.seen.rotTip = 1; save(); setTimeout(() => toast('Tip: rotate your phone for a bigger build area'), 600); }")
rep("  function exitBuild() { WORLD.setMode('view'); WORLD.setInterior(S.interior); WORLD.focus(0);","  function exitBuild() { if (roomEdit) exitRoomEdit(); WORLD.setMode('view'); WORLD.setInterior(S.interior); WORLD.setInset(0); WORLD.focus(0, 0);")
rep("    const find = (id) => S.layout.find(o => o.id === id);\n    if (op.t === 'place')","    const find = (id) => S.layout.find(o => o.id === id);\n    if (op.t === 'multi') op.ops.forEach(m => { const o = find(m.id); if (o) o.color = m.old; }); else\n    if (op.t === 'place')")
rep("Object.values(PART).filter(p => p.cat === curCat).sort(","Object.values(PART).filter(p => p.cat === curCat && (!p.reward || S.unlocked[p.id])).sort(")
rep("const parts = Object.values(PART).filter(p => T[2].includes(p.cat))","const parts = Object.values(PART).filter(p => T[2].includes(p.cat) && (!p.reward || S.unlocked[p.id]))")
# optional automatic orientation (Capacitor ScreenOrientation plugin or the web API); off by default, toggle in Settings
rep("  function enterBuild() {\n","  const lockOri = (o) => { try { if (!S.autoRot) return; const cp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ScreenOrientation; if (cp) cp.lock({ orientation: o }); else if (screen.orientation && screen.orientation.lock) screen.orientation.lock(o).catch(() => { }); } catch (e) { } };\n  function enterBuild() {\n    lockOri('landscape');\n")
rep("  function exitBuild() { if (roomEdit) exitRoomEdit();","  function exitBuild() { lockOri('portrait'); if (roomEdit) exitRoomEdit();")
rep("row('music', 'Music') + row('sfx', 'Sound effects') + row('vib', 'Vibration')","row('music', 'Music') + row('sfx', 'Sound effects') + row('vib', 'Vibration') + row('autoRot', 'Auto landscape in Build mode')")
rep("prop: 'home', props: {},","autoRot: false, prop: 'home', props: {},")
# extension block + bindings
marker="  // ------------------------------------------------------------ SHOP"
assert s.count(marker)==1
s=s.replace(marker,R('flow_ext.js')+R('flow_room.js')+"""
  function buildInsets() { const land = innerWidth > innerHeight, dr = $('#build .drawer'); if (roomEdit) return; if (land) { WORLD.setInset(dr ? dr.offsetWidth : 0); WORLD.focus(0, (dr ? dr.offsetWidth : 0) / 2); } else { WORLD.setInset(0); WORLD.focus(60, 0); } }
  window.addEventListener('resize', () => { if ($('#build').classList.contains('on')) buildInsets(); });
"""+"\n"+marker)
rep("bindWorld(); WORLD.setLayout(S.layout);","bindWorld(); bindWorldExt(); WORLD.setLayout(S.layout); WORLD.setTheme(propDef(S.prop).theme); initDebris();")
rep("WORLD.setLayout(S.layout); WORLD.layout = S.layout; window.__game.S = S; enterHome();","WORLD.setLayout(S.layout); WORLD.layout = S.layout; WORLD.setTheme('garden'); initDebris(); window.__game.S = S; enterHome();")
rep("setTimeout(() => { clearInterval(msgT); WORLD.fitCamera(true); openMenu(); }, 350);","setTimeout(() => { clearInterval(msgT); WORLD.fitCamera(true); openMenu(); try { window.GAME.scene.sleep('World'); } catch (e) { } }, 350);")
# story/about text
rep("${c.quests.map(q => q.text).join(' • ')}","${c.quests.map(q => q.text).join(' • ')}")
rep("Solve repair puzzles, earn coins and materials, and build your family a new home — room by room.","Solve repair puzzles, earn coins and building materials, and build your family a new home in real 3D — then keep going with Dream Home challenges, contracts and new properties.")
rep("Built with HTML5 and Phaser 3","Built with HTML5, Phaser 3 and Three.js")
rep("window.__game = { get S() { return S; }, set S(v) { S = v; }, save,","window.__game = { get S() { return S; }, set S(v) { S = v; }, thumb, PART, questProgress, openChapter, openProjects, openRooms, enterRoomEdit, switchProperty, layoutOf, evalQ, claim, CHALL, CONTR, PROPS, undoBuild, save,")
import base64
a=s.index('<script>window.TITLE_ART="'); b=s.index('</script>',a)
s=s[:a]+'<script>window.TITLE_ART="data:image/webp;base64,'+base64.b64encode(open('art.webp','rb').read()).decode()+'";'+s[b:]
# ---- room-based building
rep("<button class=\"btn secondary sm noedit\" id=\"bRooms\">Rooms</button>","<button class=\"btn secondary sm noedit\" id=\"bRooms\">Rooms</button>")
rep('<p class="bhint" id="buildTip">','<div class="mrow noedit"><div class="seg" id="modeSeg"><button class="mg on" data-m="room">Rooms</button><button class="mg" data-m="adv">Advanced</button></div><button class="nb sm" id="bHelp" aria-label="Show the tutorial">?</button></div>\n    <p class="bhint" id="buildTip">')
rep('<div class="actbar hidden" id="ghostBar">','<div class="actbar hidden" id="roomBar"><div class="rinfo" id="rInfo"></div><button id="rbOk" class="ab ok"><span class="ic" data-ic="check"></span>Build</button><button id="rbRot" class="ab">↻<br>Turn</button><button id="rbNext" class="ab">➜<br>Next spot</button><button id="rbNo" class="ab"><span class="ic" data-ic="close"></span>Cancel</button></div>\n    <div class="actbar hidden" id="ghostBar">')
rep('<button id="sStore" class="ab warn">','<button id="sRoom" class="ab hidden">🏠<br>Room</button><button id="sStore" class="ab warn">')
rep('<button class="btn accent" id="reSave">Save room</button>','<button class="btn accent" id="reNew">＋ Room</button><button class="btn blue" id="reFloorS">Floor style</button><button class="btn blue" id="reWallS">Wall style</button><button class="btn accent" id="reAuto">Auto doors &amp; windows</button><button class="btn accent" id="reSave">Save room</button>')
rep('<div class="drawer">','<div id="tut" class="tut hidden"><div class="tbub"><b id="tutT"></b><p id="tutP"></p><div class="trow"><span id="tutDots"></span><span><button class="btn secondary sm" id="tutSkip">Skip</button> <button class="btn primary sm" id="tutNext">Next</button></span></div></div><div class="hand" id="tutHand"></div></div>\n    <div class="drawer">')
rep("autoRot: false, prop: 'home',","adv: false, autoRot: false, prop: 'home',")
rep("'Pick a part below, or tap a placed part to edit'","(buildMode() === 'room' ? 'Pick a room type, then drag on the grid' : 'Pick a part below, or tap a placed part to edit')")
rep("    renderTabs(); renderItems(); updateHud(); hint(); renderHome();\n  }","    renderTabs(); renderItems(); updateHud(); hint(); renderHome(); refreshRoomPlan(); tutMaybe();\n  }")
rep("  function exitBuild() { lockOri('portrait'); if (roomEdit) exitRoomEdit();","  function exitBuild() { lockOri('portrait'); tutStop(false); WORLD.setRoomMode(false); $('#roomBar').classList.add('hidden'); if (roomEdit) exitRoomEdit();")
rep("S.chapter++; S.stats.chapters = S.chapter; S.chBefore = null; save();\n","S.chapter++; S.stats.chapters = S.chapter; S.chBefore = null; save(); if (typeof refreshBuildUI === 'function') refreshBuildUI();\n")
rep("    if (op.t === 'multi') op.ops.forEach","    if (op.t === 'bulk') bulkUndo(op); else\n    if (op.t === 'multi') op.ops.forEach")
rep("Open <b>Build</b> to place them. Every puzzle you win earns more.","Open <b>Build</b>, pick a room type and drag on the grid. Every puzzle you win earns more.")
rep("bindWorld(); bindWorldExt();","bindWorld(); bindWorldExt(); bindRoomWorld();")
open(sys.argv[1] if len(sys.argv)>1 else '../Home_Haven_3D.html','w',encoding='utf-8').write(s)
print('built',len(s)//1024,'KB')
