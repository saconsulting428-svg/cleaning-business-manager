import re,sys
s=open('game.js').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)>=1, 'missing: '+old[:70]
    if count==1: assert s.count(old)==1, 'multiple: '+old[:70]
    s=s.replace(old,new)
head=open('c_head.js').read(); logic=open('c_logic.js').read()
rep("  function loadData() {", head+"\n  function loadData() {")
rep("coins: 0, skin: 'default', skins: ['default'], daily: null, claimedDates: [], streak: 0, lastClaim: '', spinDates: [] };","coins: 0, skin: 'default', skins: ['default'], daily: null, claimedDates: [], streak: 0, lastClaim: '', spinDates: [], camp: null };")
rep("    d.daily = cleanDaily(d.daily);\n    return d;","    d.daily = cleanDaily(d.daily);\n    d.camp = cleanCamp(d.camp);                                         // campaign progress: unlocked level, current level, stars per level\n    return d;")
rep("  const th = () => THEMES[DATA.theme];","  let CT = null;                      // world palette while a campaign screen is open\n  const th = () => CT || THEMES[DATA.theme];")
rep("    if (G.mode === 'ultimate') d = speedDelay","    if (G.camp) return G.camp.L.d * SPEED_MUL();                                         // campaign: every level has its own pace\n    if (G.mode === 'ultimate') d = speedDelay")
rep("  function setState(s) {\n    state = s;","  function setState(s) {\n    state = s;\n    if (s === 'menu') CT = null;")
rep("  function newGame() {\n    const mc","  function newGame() {\n    CT = null;\n    const mc")
rep("    const s = DATA.save;\n    if (!s) return;","    const s = DATA.save;\n    if (!s) return;\n    CT = null;")
rep("    if (G && (state === 'play' || state === 'paused')) DATA.save = G;","    if (G && !G.camp && (state === 'play' || state === 'paused')) DATA.save = G;")
rep("    if (G.queue.length === 1 && acc >= stepDelay() * INSTANT_TURN) {","    if (G.queue.length === 1 && acc >= stepDelay() * INSTANT_TURN && !(G.camp && (G.camp.ready > 0 || campSliding()))) {")
rep("      step();\n    }\n    return true;","      if (G.camp) campStep(); else step();\n    }\n    return true;")
rep("      if (state === 'play') {\n        acc += delta;","      if (state === 'play' && G.camp) {\n        campTick(delta);\n        popups.forEach((p) => { p.life -= delta; });\n        popups = popups.filter((p) => p.life > 0);\n      } else if (state === 'play') {\n        acc += delta;")
rep("      if (state === 'play' || state === 'over') {            // short effects fade out","      if (state === 'play' || state === 'over' || state === 'won') {            // short effects fade out")
rep("    if (!DATA.sound || !unlocked || (state !== 'play' && state !== 'menu')) { musicNext = 0; return; }","    if (!DATA.sound || !unlocked || (state !== 'play' && state !== 'menu' && state !== 'levels')) { musicNext = 0; return; }")
rep("const i = musicStep & 15, bar = (musicStep >> 4) % TUNE.length, d = musicNext - now, vol = state === 'menu' ? 0.06 : 0.08;","const i = musicStep & 15, bar = (musicStep >> 4) % TUNE.length, d = musicNext - now, vol = state === 'menu' || state === 'levels' ? 0.06 : 0.08;")
rep("  function drawBoard() {\n    const t = th();\n    boardG.clear();\n    boardG.setVisible(state !== 'menu');","  function drawBoard() {\n    const t = th();\n    if (G && G.camp && state !== 'menu' && state !== 'levels') { drawCampBoard(); return; }\n    boardG.clear();\n    boardG.setVisible(state !== 'menu' && state !== 'levels');")
# draw()
rep("    if (state === 'menu') {\n      drawMenu();\n      if (sheetT > 0) { useLayer(1); drawSheet(); }\n    } else {\n      drawGame();\n      useLayer(1);\n      if (state === 'paused') {\n        drawPause();\n      } else if (state === 'over') {",
"    if (state === 'menu') {\n      drawMenu();\n      if (sheetT > 0) { useLayer(1); drawSheet(); }\n    } else if (state === 'levels') {\n      drawLevels();\n    } else {\n      if (G.camp) drawCampGame(); else drawGame();\n      useLayer(1);\n      if (state === 'paused') {\n        if (G.camp) drawCampPause(); else drawPause();\n      } else if (state === 'won') {\n        drawCampWon();\n      } else if (state === 'over' && G.camp) {\n        drawCampFail();\n      } else if (state === 'over') {")
# sfx
rep("    revive: () => [440, 660, 880].forEach((f, i) => tone(f, 0.18, 'triangle', 0.25, i * 0.09))","    revive: () => [440, 660, 880].forEach((f, i) => tone(f, 0.18, 'triangle', 0.25, i * 0.09)),\n    key: () => { tone(1047, 0.1, 'triangle', 0.25); tone(1568, 0.2, 'triangle', 0.25, 0.08); },\n    door: () => { tone(220, 0.12, 'square', 0.14); tone(330, 0.2, 'square', 0.14, 0.1); },\n    sw: (open) => { tone(open ? 520 : 400, 0.08, 'square', 0.14); tone(open ? 780 : 260, 0.16, 'square', 0.14, 0.07); },\n    portal: () => tone(300, 0.28, 'sine', 0.22, 0, 1200)")
# menu
a=s.index("    // play\n    const pw = 300")
b=s.index("    roundButton(W / 2 - 176, 738")
menu = """    // play: continue the level campaign
    const cp = DATA.camp, nl = campNext(), pw = 300, ph = 72, py = 568;
    rrect(W / 2 - pw / 2, py - ph / 2 + 7, pw, ph, 36, shade(t.accent, -0.35));
    rrect(W / 2 - pw / 2, py - ph / 2, pw, ph, 36, t.accent);
    g.fillStyle(0x1b1b1b, 1);
    g.fillTriangle(W / 2 - 52, py - 15, W / 2 - 52, py + 15, W / 2 - 26, py);
    txt(W / 2 + 18, py - 1, 'Play', 34, '#1b1b1b');
    buttons.push({ x: W / 2 - pw / 2, y: py - ph / 2, w: pw, h: ph + 7, fn: playCampaign });
    let totalStars = 0;
    for (let i = 1; i <= LEVEL_COUNT; i++) totalStars += cp.stars[i] | 0;
    txt(W / 2, 628, 'Level ' + nl + '  -  ' + WORLDS[Math.floor((nl - 1) / 20)].name + '     ' + totalStars + ' stars', 16, t.text, 0.5, false);

    // levels / endless / continue
    const hasSave = !!DATA.save, pw2 = hasSave ? 140 : 215, gx = hasSave ? 150 : 224, x2 = W / 2 - (hasSave ? 150 : 112);
    button(x2, 672, pw2, 44, 'Levels', openLevels, { size: 17 });
    button(x2 + gx, 672, pw2, 44, hasSave ? 'Endless' : 'Endless ' + MODES[DATA.mode].name, newGame, { size: hasSave ? 16 : 15 });
    if (hasSave) button(x2 + gx * 2, 672, pw2, 44, 'Resume', continueGame, { size: 16 });

"""
s=s[:a]+menu+s[b:]
# keyboard
rep("kb.on('keydown-ENTER', () => { if (state === 'menu' || state === 'over') newGame(); else if (state === 'paused') togglePause(); });",
"kb.on('keydown-ENTER', () => { if (state === 'menu') playCampaign(); else if (state === 'levels') startLevel(Math.min(campUnlocked(), lvPage * 20 + 1)); else if (state === 'won') campNextLevel(); else if (state === 'over') { if (G.camp) campRetry(); else newGame(); } else if (state === 'paused') togglePause(); });")
rep("kb.on('keydown-ESC', () => { if (state !== 'menu') goMenu(); else closeSheet(); });","kb.on('keydown-ESC', () => { if (state === 'levels') goHome(); else if (G && G.camp && state !== 'menu') leaveToLevels(); else if (state !== 'menu') goMenu(); else closeSheet(); });")
# logic insert
rep("  // ---------- Phaser scene ----------", logic+"\n  // ---------- Phaser scene ----------")
# test hook
rep("window.__snake = { get G() { return G; },","window.__snake = { camp: { start: startLevel, open: openLevels, home: goHome, retry: campRetry, next: campNextLevel, get C() { return G && G.camp; }, LV: LV, E: E, unlockAll: () => { DATA.camp.unlocked = LEVEL_COUNT; writeData(); }, engineLevel: engineLevel, WORLDS: WORLDS, sliding: () => campSliding() }, get CT() { return CT; }, get G() { return G; },")
open('game.camp.js','w').write(s)
print('patched', len(s))
