import re,sys,json
src=open('orig.html',encoding='utf-8').read()
s=src
def rep(old,new,count=1):
    global s
    n=s.count(old)
    assert n==count, f'pattern count {n}!={count}: {old[:80]!r}'
    s=s.replace(old,new)
def cut(start,end,new):
    global s
    a=s.index(start); b=s.index(end,a)
    s=s[:a]+new+s[b:]
R=lambda f:open(f,encoding='utf-8').read()

# ---------- CSS
rep("@media (prefers-reduced-motion:reduce){.cl,.ld-build i{animation:none}}\n</style>","@media (prefers-reduced-motion:reduce){.cl,.ld-build i{animation:none}}\n"+R('extra.css')+"</style>")
# ---------- HTML
rep('<div id="game"></div>','<div id="game"></div>\n  <div id="reno3d"></div>')
rep('<span class="ic" data-ic="hammer"></span>Build</button>','<span class="ic" data-ic="hammer"></span>Decorate</button>')
rep('<section id="home" class="layer">','<section id="home" class="layer">\n    <div id="bubbles"></div>')
reno_html='''<section id="reno" class="layer">
    <div class="rtop">
      <button class="nb sm" id="rBack" aria-label="Back"><span class="ic" data-ic="close"></span></button>
      <div class="rtitle"><small id="rRoom"></small><b id="rName"></b></div>
      <div class="res sm"><span class="ico star"></span><b id="rStars">0</b></div>
    </div>
    <div class="rpanel">
      <p class="rhead" id="rHint"></p>
      <div class="rcards" id="rCards"></div>
      <div class="ract"><button class="btn primary lg wide" id="rOk">Renovate</button><button class="btn blue wide hidden" id="rPlay"><span class="ic" data-ic="bulb"></span>Play a level to earn stars</button></div>
    </div>
  </section>
  '''
rep('<section id="play" class="layer">',reno_html+'<section id="play" class="layer">')

# ---------- engine scripts (three.js + renovation modules) inserted after SPRITES script
three=open('src/three.min.js',encoding='utf-8').read()
mods=''.join('<script>'+R('src/'+f)+'\n</script>\n' for f in ['lib.js','furn1.js','furn2.js','furn3.js','furn4.js','data.js','house.js','thumb.js'])
marker='<script>// Simple synthesized sound effects'
assert s.count(marker)==1
s=s.replace(marker,'<script>'+three+'\n</script>\n'+mods+marker)

# ---------- economy script: chapters, ECON, achievements
cut("  // quest.give = guaranteed materials","  const FREE_MATS", R('chapters_new.js'))
rep("HEART_MS: 15 * 60 * 1000, MAX_HEARTS: 5,","HEART_MS: 15 * 60 * 1000, MAX_HEARTS: 5,\n    STAR_PACKS: [[3, 250], [8, 600], [20, 1400]], CHEST_COINS: 150, CHAPTER_STARS: 3,")
rep("{ id: 'place50', name: 'Builder', text: 'Place 50 parts', n: 50, stat: 'placed', reward: 200 }","{ id: 'place50', name: 'Renovator', text: 'Renovate 10 things', n: 10, stat: 'placed', reward: 200 }")
rep("{ id: 'place200', name: 'Architect', text: 'Place 200 parts', n: 200, stat: 'placed', reward: 600 }","{ id: 'place200', name: 'Architect', text: 'Renovate 30 things', n: 30, stat: 'placed', reward: 600 }")
rep("{ id: 'paint10', name: 'Colorful', text: 'Paint 10 things', n: 10, stat: 'painted', reward: 150 }","{ id: 'paint10', name: 'Restyler', text: 'Change a style 5 times', n: 5, stat: 'painted', reward: 150 }")
rep("{ id: 'ch5', name: 'Halfway Home', text: 'Finish chapter 5', n: 5, stat: 'chapters', reward: 400 }","{ id: 'ch5', name: 'Halfway Home', text: 'Finish chapter 3', n: 3, stat: 'chapters', reward: 400 }")
rep("{ id: 'ch10', name: 'Home Haven', text: 'Finish every chapter', n: 10, stat: 'chapters', reward: 1200 }","{ id: 'ch10', name: 'Home Haven', text: 'Finish every chapter', n: 5, stat: 'chapters', reward: 1200 }")
rep("DAILY = [{ t: 'coins', n: 100 }, { t: 'coins', n: 150 }, { t: 'mats', n: 2 }, { t: 'hint', n: 2 }, { t: 'mats', n: 3 }, { t: 'coins', n: 200 }, { t: 'chest', n: 300 }]","DAILY = [{ t: 'coins', n: 100 }, { t: 'coins', n: 150 }, { t: 'mats', n: 2 }, { t: 'hint', n: 2 }, { t: 'mats', n: 3 }, { t: 'coins', n: 200 }, { t: 'chest', n: 300 }]")

# ---------- flow script
rep("VER = 3;","VER = 4;")
rep("layout: [], inv: {}, nextId: 1,","layout: [], inv: {}, reno: {}, nextId: 1,")
rep("    if (!d.ver || d.ver < VER) { s.ver = VER; if (raw) s.seen.migrated = 1; }",
"""    if (!d.ver || d.ver < 4) { s.chapter = 0; s.reno = {}; s.layout = []; s.inv = {}; s.chBefore = null; s.seen = Object.assign({}, s.seen); Object.keys(s.seen).forEach(k => { if (/^ch\\d+$/.test(k)) delete s.seen[k]; }); }
    s.reno = s.reno && typeof s.reno === 'object' ? s.reno : {}; Object.keys(s.reno).forEach(k => { const sl = RENO.DATA.BY_ID[k]; if (!sl || !(s.reno[k] >= 0 && s.reno[k] < sl.variants.length)) delete s.reno[k]; });
    s.chapter = Math.max(0, Math.min(CHAPTERS.length, s.chapter | 0));
    if (!d.ver || d.ver < VER) { s.ver = VER; if (raw) s.seen.migrated = 1; }""")
rep("$('#bCoins').textContent = S.coins;\n  }","$('#bCoins').textContent = S.coins; $('#rStars').textContent = S.stars;\n  }")
cut("  function questProgress(ch = curCh())","  function renderHome() {",R('flow_patch_q.js'))
rep("tickHearts(); updateHud(); renderQuest();\n    const t = puzzleFor(S.level);","tickHearts(); updateHud(); renderQuest(); renderBubbles();\n    const t = puzzleFor(S.level);")
cut("  // ------------------------------------------------------------ guaranteed material rewards","  // ------------------------------------------------------------ puzzles",R('flow_patch_ch.js'))
# level win
rep("bonus = chest ? bonusMats(3) : null; if (bonus) grant(bonus);","bonus = chest ? { coins: ECON.CHEST_COINS } : null; if (bonus) S.coins += bonus.coins;")
rep('<p class="label">Building materials</p>${lootHtml(mats)}','<p class="label">Ready to spend</p><div class="coinline" style="margin:0">${starI}${S.stars}</div><p class="sub" style="margin:0">Use stars to renovate your home</p>')
rep("${bonus ? `<p class=\"label\">Star chest (every ${ECON.STAR_CHEST_EVERY} stars)</p>${lootHtml(bonus)}` : ''}","${bonus ? `<p class=\"label\">Star chest (every ${ECON.STAR_CHEST_EVERY} stars)</p><div class=\"coinline\">${coinI}+${bonus.coins}</div>` : ''}")
rep("if (!finished() && questProgress().some(p => p.have < p.q.n)) setTimeout(() => toast('New materials are ready in Build'), 400);","setTimeout(() => { const n = affordable(); if (n) toast(n + (n > 1 ? ' renovations are' : ' renovation is') + ' ready — tap a bubble!'); }, 500);")
# puzzle <-> home switching
rep("$('#app').classList.add('puzzle'); show('play');","$('#app').classList.add('puzzle'); show('play'); RENO.stop();")
rep("$('#app').classList.remove('puzzle'); show('home'); renderHome(); }","$('#app').classList.remove('puzzle'); show('home'); RENO.start(); focusHome(true); renderHome(); }")
# renovation UI block before the shop
marker="  // ------------------------------------------------------------ SHOP"
assert s.count(marker)==1
blk=R('flow_reno.js')
blk=blk.replace("""  $('#vInterior').onclick = () => { sfx('click'); if (!reno.ready) return; const home = chRoomId(); if (RENO.currentRoom() !== home || !home) { if (!home && RENO.currentRoom() === null) RENO.focus('living', null, { shift: -14 }); else RENO.focus(home, null, { shift: -14 }); } else RENO.overview({ shift: -14 }); renderBubbles(); };""","""  $('#vInterior').onclick = () => { sfx('click'); if (!reno.ready) return; if (RENO.currentRoom()) RENO.overview({ shift: -14 }); else RENO.focus(chRoomId() || 'living', null, { shift: -14 }); renderBubbles(); };""")
blk=blk.replace("""    show('home'); RENO.focus(room === chRoomId() || finished() ? room : room, null, { shift: -14 }); if (!finished() && room !== chRoomId()) focusHome(); renderHome();""","""    show('home'); RENO.focus(room, null, { shift: -14 }); renderHome();""")
s=s.replace(marker,blk+"\n"+marker)
# shop
rep("const SHOP_TABS = [['materials', 'Materials', ['floors', 'walls', 'openings', 'roof', 'build']], ['furniture', 'Furniture', ['furniture', 'kitchen', 'bath', 'bedroom']], ['decor', 'Decor', ['decor', 'garden']], ['boosters', 'Boosters'], ['coins', 'Coins']];","const SHOP_TABS = [['stars', 'Stars'], ['boosters', 'Boosters'], ['coins', 'Coins']];")
rep("function openShop(tab = 'materials') {","function openShop(tab = 'stars') {")
rep("    } else if (tab === 'boosters') {","""    } else if (tab === 'stars') {
      body = `<p class="sub">Stars pay for renovations. You have ${starI} <b>${S.stars}</b>. Win puzzle levels to earn them for free, or buy a pack with coins.</p>` + ECON.STAR_PACKS.map(([n, c]) => `<div class="row2"><span class="ri">${starI}</span><span class="rt"><b>${n} stars</b><small>${Math.round(c / n)} coins each</small></span><button class="btn accent sm" data-buystar="${n}:${c}" ${S.coins < c ? 'disabled' : ''}>${coinI}${c}</button></div>`).join('');
    } else if (tab === 'boosters') {""")
rep("const ad = $('#adCoins', box);","$$('[data-buystar]', box).forEach(b => b.onclick = () => { const [n, c] = b.dataset.buystar.split(':').map(Number); if (S.coins < c) return; S.coins -= c; S.stars += n; save(); sfx('coin'); updateHud(); renderHome(); toast(`+${n} stars`); openShop('stars'); });\n    const ad = $('#adCoins', box);")
rep("""        <div class="row2"><span class="ri">${starI}</span><span class="rt"><b>Trade stars</b><small>${ns} stars → ${nc} coins. You have ${S.stars} stars.</small></span><button class="btn accent sm" id="tradeStars" ${S.stars < ns ? 'disabled' : ''}>Trade</button></div>\n""","")
# spin / daily
rep("else { const g = bonusMats(3); grant(g); html = lootHtml(g); }","else { S.stars += 3; html = `<div class=\"coinline\">${starI}+3</div><p class=\"body\"><b>3 stars</b> for your renovations!</p>`; }")
rep("? '❤' : '📦';","? '❤' : '★3';")
rep("matsIcon = thumb(`p:${(finished() ? FREE_MATS : curCh().mats)[0][0]}:0`, 34, 32);","matsIcon = starI;")
rep("<small>Chest: coins + materials</small>","<small>Chest: coins + stars</small>")
rep("r.t === 'mats' ? 'Materials ×' + r.n","r.t === 'mats' ? 'Stars ×' + r.n")
rep("let got = null, coins = 0;","let got = null, coins = 0, starGain = 0;")
rep("else if (r.t === 'mats') { got = {}; for (let i = 0; i < r.n; i++) got = merge(got, guaranteedMats()); }\n    else { coins = r.n; got = merge(guaranteedMats(), bonusMats(3)); }","else if (r.t === 'mats') { S.stars += r.n; starGain = r.n; }\n    else { coins = r.n; S.stars += 3; starGain = 3; }")
rep("+ (got ? lootHtml(got) : ''), actions: [{ text: 'Great', fn: () => openRewards('daily') }] });","+ (starGain ? `<div class=\"coinline\">${starI}+${starGain}</div>` : ''), actions: [{ text: 'Great', fn: () => openRewards('daily') }] });")
# story / settings / about / stars
rep("${c.quests.map(q => q.text).join(' • ')}","${c.tasks.length} renovation tasks")
rep("Parts placed: <b>${S.stats.placed}</b>","Things renovated: <b>${S.stats.placed}</b>")
rep("Solve repair puzzles, earn coins and materials, and build your family a new home — room by room.","Solve repair puzzles, earn stars, and renovate your family home room by room — try every style before you confirm.")
rep("Built with HTML5 and Phaser 3","Built with HTML5, Phaser 3 and Three.js")
rep("Every ${ECON.STAR_CHEST_EVERY} stars opens a Star Chest of bonus materials — ${next} more to go.","Spend them on renovation tasks. Every ${ECON.STAR_CHEST_EVERY} stars opens a Star Chest of bonus coins — ${next} more to go.")
rep("{ text: 'Trade stars for coins', cls: 'accent', fn: () => openShop('coins') }","{ text: 'Get more stars', cls: 'accent', fn: () => openShop('stars') }")
# menu / home / new game / night / boot
rep("show('menu'); WORLD.focus(-80);","show('menu'); WORLD.focus(-80); if (task) { RENO.revert(task.id); task = null; } if (reno.ready) { RENO.start(); RENO.overview({ shift: -70 }); renderBubbles(); }")
rep("AUDIO.unlock(); show('home'); WORLD.setInterior(S.interior); WORLD.focus(0); renderHome();","AUDIO.unlock(); show('home'); RENO.start(); focusHome(); renderHome();")
rep("WORLD.setLayout(S.layout); WORLD.layout = S.layout; window.__game.S = S; enterHome();","WORLD.setLayout(S.layout); WORLD.layout = S.layout; RENO.setChoices(S.reno); RENO.setNightNow(false); $('#app').classList.remove('night'); window.__game.S = S; enterHome();")
rep("WORLD.setNight(S.night); sfx('click'); renderHome(); };","WORLD.setNight(S.night); RENO.setNight(S.night); sfx('click'); renderHome(); };")
rep("bindWorld(); WORLD.setLayout(S.layout);","bindWorld(); initReno(); WORLD.setLayout(S.layout);")
rep("if ($('#build').classList.contains('on')) { exitBuild(); return; }","if ($('#reno').classList.contains('on')) { closeTask(true); return; }\n    if ($('#build').classList.contains('on')) { exitBuild(); return; }")
rep("window.__game = { get S() { return S; }, set S(v) { S = v; }, save,","window.__game = { get S() { return S; }, set S(v) { S = v; }, RENO, openTask, confirmTask, closeTask, chDone, save,")
rep("game.scene.stop('Puzzle'); game.scene.wake('World');","game.scene.stop('Puzzle');")
rep("setTimeout(() => { clearInterval(msgT); WORLD.fitCamera(true); openMenu(); }, 350);","setTimeout(() => { clearInterval(msgT); WORLD.fitCamera(true); openMenu(); try { if (reno.ready) window.GAME.scene.sleep('World'); } catch (e) { } }, 350);")
open(sys.argv[1] if len(sys.argv)>1 else 'Home_Haven_3D.html','w',encoding='utf-8').write(s)
print('built', len(s)//1024, 'KB')
