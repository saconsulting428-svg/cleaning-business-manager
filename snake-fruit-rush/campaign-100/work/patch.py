import re,sys
s=open('game.js').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)>=1, 'missing: '+old[:70]
    if count==1: assert s.count(old)==1, 'multiple: '+old[:70]
    s=s.replace(old,new)
head=open('c_head.js').read(); logic=open('c_logic.js').read()
rep("  function loadData() {", head+"\n  function loadData() {")
rep("coins: 0, skin: 'default', skins: ['default'], daily: null, claimedDates: [], streak: 0, lastClaim: '', spinDates: [] };","coins: 0, skin: 'default', skins: ['default'], daily: null, claimedDates: [], streak: 0, lastClaim: '', spinDates: [], camp: null, menuMode: 'levels', vibe: true, tapSteer: false, pw: null };")
rep("    d.daily = cleanDaily(d.daily);\n    return d;","    d.daily = cleanDaily(d.daily);\n    d.menuMode = d.menuMode === 'endless' ? 'endless' : 'levels'; d.vibe = d.vibe !== false; d.tapSteer = d.tapSteer === true; d.pw = cleanPw(d.pw);\nd.camp = cleanCamp(d.camp);                                         // campaign progress: unlocked level, current level, stars per level\n    return d;")
rep("  const th = () => THEMES[DATA.theme];","  let CT = null;                      // world palette while a campaign screen is open\n  const th = () => CT || THEMES[DATA.theme];")
rep("    if (G.mode === 'ultimate') d = speedDelay","    if (G.camp) return G.camp.L.d * SPEED_MUL() * (G.camp.slowT > 0 ? 1.7 : 1);                                         // campaign: every level has its own pace\n    if (G.mode === 'ultimate') d = speedDelay")
rep("  function setState(s) {\n    state = s;","  function setState(s) {\n    state = s;\n    if (s === 'menu') CT = menuPal();")
rep("  function newGame() {\n    const mc","  function newGame() {\n    CT = null;\n    const mc")
rep("    const s = DATA.save;\n    if (!s) return;","    const s = DATA.save;\n    if (!s) return;\n    CT = null;")
rep("    if (G && (state === 'play' || state === 'paused')) DATA.save = G;","    if (G && !G.camp && (state === 'play' || state === 'paused')) DATA.save = G;")
rep("    if (G.queue.length === 1 && acc >= stepDelay() * INSTANT_TURN) {","    if (G.queue.length === 1 && acc >= stepDelay() * INSTANT_TURN && !(G.camp && (G.camp.ready > 0 || campSliding()))) {")
rep("      step();\n    }\n    return true;","      if (G.camp) campStep(); else step();\n    }\n    return true;")
rep("      if (state === 'play') {\n        acc += delta;","      if (state === 'play' && G.camp) {\n        campTick(delta);\n        popups.forEach((p) => { p.life -= delta; });\n        popups = popups.filter((p) => p.life > 0);\n      } else if (state === 'play') {\n        acc += delta;")
rep("      if (state === 'play' || state === 'over') {            // short effects fade out","      if (state === 'play' || state === 'over' || state === 'won') {            // short effects fade out")
rep("    if (!DATA.sound || !unlocked || (state !== 'play' && state !== 'menu')) { musicNext = 0; return; }","    if (!DATA.sound || !unlocked || (state !== 'play' && state !== 'menu' && state !== 'levels')) { musicNext = 0; return; }")
rep("const i = musicStep & 15, bar = (musicStep >> 4) % TUNE.length, d = musicNext - now, vol = state === 'menu' ? 0.06 : 0.08;","const i = musicStep & 15, bar = (musicStep >> 4) % TUNE.length, d = musicNext - now, vol = state === 'menu' || state === 'levels' ? 0.06 : 0.08;")
rep("  function drawBoard() {\n    const t = th();\n    boardG.clear();\n    boardG.setVisible(state !== 'menu');","  function drawBoard() {\n    const t = th();\n    if (G && G.camp && state !== 'menu' && state !== 'levels') { drawCampBoard(); return; }\n    boardG.clear();\n    boardG.setScale(1);\n    if (boardRT) boardRT.setVisible(false);\n    boardG.setVisible(state !== 'menu' && state !== 'levels');")
# draw()
rep("    if (state === 'menu') {\n      drawMenu();\n      if (sheetT > 0) { useLayer(1); drawSheet(); }\n    } else {\n      drawGame();\n      useLayer(1);\n      if (state === 'paused') {\n        drawPause();\n      } else if (state === 'over') {",
"    if (state === 'menu') {\n      drawMenu();\n      if (sheetT > 0) { useLayer(1); drawSheet(); }\n    } else if (state === 'levels') {\n      drawLevels();\n    } else {\n      if (G.camp) drawCampGame(); else drawGame();\n      useLayer(1);\n      if (state === 'paused') {\n        if (G.camp) drawCampPause(); else drawPause();\n      } else if (state === 'won') {\n        drawCampWon();\n      } else if (state === 'over' && G.camp) {\n        drawCampFail();\n      } else if (state === 'over') {")
# sfx
rep("    revive: () => [440, 660, 880].forEach((f, i) => tone(f, 0.18, 'triangle', 0.25, i * 0.09))","    revive: () => [440, 660, 880].forEach((f, i) => tone(f, 0.18, 'triangle', 0.25, i * 0.09)),\n    key: () => { tone(1047, 0.1, 'triangle', 0.25); tone(1568, 0.2, 'triangle', 0.25, 0.08); },\n    door: () => { tone(220, 0.12, 'square', 0.14); tone(330, 0.2, 'square', 0.14, 0.1); },\n    sw: (open) => { tone(open ? 520 : 400, 0.08, 'square', 0.14); tone(open ? 780 : 260, 0.16, 'square', 0.14, 0.07); },\n    portal: () => tone(300, 0.28, 'sine', 0.22, 0, 1200)")
# menu
a=s.index("    // play\n    const pw = 300")
b=s.index("    roundButton(W / 2 - 176, 738")
menu = """    // choose what to play: Levels or Endless
    const lv = DATA.menuMode !== 'endless', cp = DATA.camp, nl = campNext();
    rrect(W / 2 - 158, 453, 316, 48, 24, t.panel, 0.9);
    [['Levels', true], ['Endless', false]].forEach((o, i) => {
      const cx = W / 2 + (i ? 79 : -79), on = lv === o[1];
      if (on) rrect(cx - 75, 457, 150, 40, 20, t.accent);
      txt(cx, 478, o[0], 18, on ? '#1b1b1b' : t.btnText);
      buttons.push({ x: cx - 79, y: 453, w: 158, h: 48, fn: () => setMenuMode(o[1]) });
    });
    // play
    const hasSave = !!DATA.save, side = lv || hasSave, ph = 68, py = 548, pw = side ? 196 : 316, pcx = side ? W / 2 - 60 : W / 2;
    rrect(pcx - pw / 2, py - ph / 2 + 7, pw, ph, 34, shade(t.accent, -0.35));
    rrect(pcx - pw / 2, py - ph / 2, pw, ph, 34, t.accent);
    g.fillStyle(0x1b1b1b, 1);
    g.fillTriangle(pcx - 44, py - 14, pcx - 44, py + 14, pcx - 20, py);
    txt(pcx + 14, py - 1, 'Play', 32, '#1b1b1b');
    buttons.push({ x: pcx - pw / 2, y: py - ph / 2, w: pw, h: ph + 7, fn: playSelected });
    if (side) {
      const sx = W / 2 + 104;
      rrect(sx - 48, py - ph / 2 + 7, 96, ph, 34, shade(t.panel, -0.3));
      rrect(sx - 48, py - ph / 2, 96, ph, 34, t.panel);
      txt(sx, py - 1, lv ? 'Map' : 'Resume', lv ? 20 : 17, t.btnText);
      buttons.push({ x: sx - 48, y: py - ph / 2, w: 96, h: ph + 7, fn: lv ? openLevels : continueGame });
    }
    let totalStars = 0;
    for (let i = 1; i <= LEVEL_COUNT; i++) totalStars += cp.stars[i] | 0;
    if (lv) txt(W / 2, 604, 'Level ' + nl + '  -  ' + WORLDS[Math.floor((nl - 1) / 20)].name + '   -   ' + totalStars + ' stars', 15, t.text, 0.5, false);
    else txt(W / 2, 604, MODES[DATA.mode].name + ' mode' + (DATA.mode === 'ultimate' ? ', speed ' + DATA.speed : '') + (hasSave ? '   -   game saved' : ''), 15, t.text, 0.5, false);

"""
s=s[:a]+menu+s[b:]
# keyboard
rep("kb.on('keydown-ENTER', () => { if (state === 'menu' || state === 'over') newGame(); else if (state === 'paused') togglePause(); });",
"kb.on('keydown-ENTER', () => { if (state === 'menu') playCampaign(); else if (state === 'levels') startLevel(Math.min(campUnlocked(), lvPage * 20 + 1)); else if (state === 'won') campNextLevel(); else if (state === 'over') { if (G.camp) campRetry(); else newGame(); } else if (state === 'paused') togglePause(); });")
rep("kb.on('keydown-ESC', () => { if (state !== 'menu') goMenu(); else closeSheet(); });","kb.on('keydown-ESC', () => { if (state === 'levels') goHome(); else if (G && G.camp && state !== 'menu') leaveToLevels(); else if (state !== 'menu') goMenu(); else closeSheet(); });")
# ---- settings, touch, text, skins, shop ----
rep("  function drawIcon(kind, x, y) {\n    const t = th(), c = t.btnText;","  function drawIcon(kind, x, y, col) {\n    const t = th(), c = col || t.btnText;")
rep("    } else if (kind === 'star') {\n      g.fillStyle(C(t.accent), 1);","""    } else if (kind === 'vibe') {
      rrect(x - 6, y - 11, 12, 22, 3, c);
      rrect(x - 4, y - 8, 8, 14, 1.5, t.panel);
      [[-1, 9], [1, 9], [-1, 14], [1, 14]].forEach((o, i) => { g.lineStyle(2.2, C(c), 1); g.beginPath(); g.moveTo(x + o[0] * (i < 2 ? 9 : 14), y - 6); g.lineTo(x + o[0] * (i < 2 ? 9 : 14), y + 6); g.strokePath(); });
      if (!DATA.vibe) { line(x - 13, y + 12, x + 13, y - 12, '#ef4444', 2.8); }
    } else if (kind === 'tap') {
      dot(x - 1, y - 3, 6, c);
      rrect(x - 4, y - 3, 8, 15, 4, c);
      g.lineStyle(2, C(c), 1); g.beginPath(); g.arc(x - 1, y - 3, 10, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
      if (!DATA.tapSteer) { line(x - 12, y + 12, x + 12, y - 12, '#ef4444', 2.8); }
    } else if (kind === 'shop') {
      rrect(x - 12, y - 4, 24, 16, 4, c);
      g.lineStyle(3, C(c), 1); g.beginPath(); g.arc(x, y - 5, 7, Math.PI, 0); g.strokePath();
      dot(x, y + 4, 3.2, t.accent);
    } else if (kind === 'star') {
      g.fillStyle(C(t.accent), 1);""")
rep("try { if (DATA.sound && navigator.vibrate) navigator.vibrate(ms); }","try { if (DATA.vibe && navigator.vibrate) navigator.vibrate(ms); }")
rep("  function txt(x, y, s, size, color, originX, bold) {\n    let t = L.texts[L.n];","  const TXT_K = 1.1;                  // all text a little bigger than before\n  function txt(x, y, s, size, color, originX, bold) {\n    size = Math.round(size * TXT_K * 10) / 10;\n    let t = L.texts[L.n];")
rep("d.tab = Math.abs(d.tab | 0) % 5;","d.tab = Math.abs(d.tab | 0) % 6;")
# skins
rep("{ id: 'gold', name: 'Golden', cost: 1000, a: '#fde047', b: '#d97706', head: '#fff7c2', line: '#d97706', pattern: 'shimmer', trail: 'sparkle' }\n  ];","""{ id: 'gold', name: 'Golden', cost: 1000, a: '#fde047', b: '#d97706', head: '#fff7c2', line: '#d97706', pattern: 'shimmer', trail: 'sparkle' },
    { id: 'mint', name: 'Mint', cost: 1400, a: '#a7f3d0', b: '#34d399', head: '#ecfdf5', line: '#34d399' },
    { id: 'ocean', name: 'Ocean', cost: 1800, a: '#38bdf8', b: '#1d4ed8', head: '#bae6fd', line: '#1d4ed8', trail: 'bubble' },
    { id: 'kitty', name: 'Kitty', cost: 2200, a: '#fbbf24', b: '#f59e0b', head: '#fde68a', line: '#f59e0b', animal: 'cat' },
    { id: 'fox', name: 'Fox', cost: 2600, a: '#fb923c', b: '#c2410c', head: '#fdba74', line: '#c2410c', animal: 'fox' },
    { id: 'bunny', name: 'Bunny', cost: 3000, a: '#ffffff', b: '#fbcfe8', head: '#ffffff', line: '#f9a8d4', animal: 'bunny' },
    { id: 'neon', name: 'Neon', cost: 3500, a: '#22d3ee', b: '#a855f7', head: '#f0abfc', line: '#a855f7', pattern: 'neon', trail: 'sparkle' },
    { id: 'robot', name: 'Robo', cost: 4200, a: '#cbd5e1', b: '#64748b', head: '#e2e8f0', line: '#64748b', animal: 'robot' },
    { id: 'ninja', name: 'Ninja', cost: 5000, a: '#374151', b: '#111827', head: '#4b5563', line: '#111827', animal: 'ninja' },
    { id: 'magma', name: 'Magma', cost: 6000, a: '#fde047', b: '#dc2626', head: '#fff7ae', line: '#b91c1c', pattern: 'shimmer', trail: 'fire' },
    { id: 'phantom', name: 'Phantom', cost: 7000, a: '#e9d5ff', b: '#7c3aed', head: '#faf5ff', line: '#7c3aed', trail: 'sparkle' },
    { id: 'prism', name: 'Prism', cost: 8500, head: '#ffffff', line: '#c4b5fd', pattern: 'prism', trail: 'rainbow' },
    { id: 'emperor', name: 'Emperor', cost: 10000, a: '#fbbf24', b: '#b91c1c', head: '#fcd34d', line: '#b91c1c', animal: 'dragon', trail: 'fire' },
    { id: 'cosmic', name: 'Cosmic', cost: 12500, a: '#0ea5e9', b: '#4c1d95', head: '#e0f2fe', line: '#4c1d95', pattern: 'stars', trail: 'sparkle' },
    { id: 'diamond', name: 'Diamond', cost: 15000, a: '#bae6fd', b: '#e0f2fe', head: '#ffffff', line: '#7dd3fc', pattern: 'shimmer', trail: 'sparkle', animal: 'unicorn' },
    { id: 'royal', name: 'Royal', cost: 20000, a: '#fde047', b: '#a21caf', head: '#fff7c2', line: '#a21caf', pattern: 'shimmer', trail: 'gold', animal: 'crown' }
  ];""")
rep("    if (sk.pattern === 'rainbow') return hsl(i * 30 + anim * 0.05, 85, 56);","    if (sk.pattern === 'rainbow') return hsl(i * 30 + anim * 0.05, 85, 56);\n    if (sk.pattern === 'prism') return hsl(i * 22 + anim * 0.09, 75, 72);\n    if (sk.pattern === 'neon') return (Math.floor(anim / 220) + i) % 2 ? sk.a : sk.b;")
rep("    else if (sk.trail === 'sparkle') color = Math.random() < 0.5 ? '#fde68a' : '#ffffff';","    else if (sk.trail === 'sparkle') color = Math.random() < 0.5 ? '#fde68a' : '#ffffff';\n    else if (sk.trail === 'bubble') color = Math.random() < 0.5 ? '#7dd3fc' : '#ffffff';\n    else if (sk.trail === 'gold') color = Math.random() < 0.5 ? '#fde047' : '#f59e0b';")
rep("    if (an === 'panda') [1, -1].forEach((sd) => { const e = at([-5, 10], sd); dot(e.x, e.y, 5.2 * k, '#1f2937'); });             // ears","""    if (an === 'panda') [1, -1].forEach((sd) => { const e = at([-5, 10], sd); dot(e.x, e.y, 5.2 * k, '#1f2937'); });             // ears
    if (an === 'cat' || an === 'fox') [1, -1].forEach((sd) => {
      const p1 = at([-3, 5], sd), p2 = at([-7, 15], sd), p3 = at([5, 10], sd);
      g.fillStyle(C(an === 'fox' ? '#c2410c' : '#f59e0b'), 1); g.fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
      const q1 = at([-2, 7], sd), q2 = at([-5, 12.5], sd), q3 = at([2, 9.5], sd);
      g.fillStyle(C('#fbcfe8'), 1); g.fillTriangle(q1.x, q1.y, q2.x, q2.y, q3.x, q3.y);
    });
    if (an === 'bunny') [1, -1].forEach((sd) => { const a1 = at([-3, 6], sd), a2 = at([-17, 10], sd); line(a1.x, a1.y, a2.x, a2.y, '#f9a8d4', 6.4 * k); line(a1.x, a1.y, a2.x, a2.y, '#ffffff', 4 * k); });
    if (an === 'robot') { const a1 = at([-9, 0], 1), a2 = at([-17, 0], 1); line(a1.x, a1.y, a2.x, a2.y, '#94a3b8', 2.4 * k); dot(a2.x, a2.y, 3.2 * k, '#ef4444'); }""")
rep("    dot(hx, hy, 12.5 * k, headCol);\n","""    dot(hx, hy, 12.5 * k, headCol);
    if (an === 'ninja') { const b1 = at([-1.5, 12.5], 1), b2 = at([-1.5, 12.5], -1), b3 = at([-9, 16], -1); line(b1.x, b1.y, b2.x, b2.y, '#ef4444', 5 * k); line(b2.x, b2.y, b3.x, b3.y, '#ef4444', 3 * k); }
    if (an === 'crown') { [-7, 0, 7].forEach((o, i) => { const c1 = at([-9 - (i === 1 ? 3 : 0), o], 1); dot(c1.x, c1.y, 2.8 * k, '#fde047'); }); const c0 = at([-7, -9], 1), c9 = at([-7, 9], 1); line(c0.x, c0.y, c9.x, c9.y, '#fbbf24', 3.2 * k); }
""")
rep("    SKINS.forEach((sk, i) => {\n      const cx = W / 2 + ((i % 4) - 1.5)","    const pages = Math.ceil(SKINS.length / 12);\n    if (skinPage >= pages) skinPage = 0;\n    [[-1, BX + 22], [1, BX + BW - 22]].forEach((a) => {\n      dot(a[1], top + 96, 17, t.panel);\n      line(a[1] - a[0] * 3, top + 88, a[1] + a[0] * 4, top + 96, t.btnText, 3); line(a[1] + a[0] * 4, top + 96, a[1] - a[0] * 3, top + 104, t.btnText, 3);\n      buttons.push({ x: a[1] - 26, y: top + 74, w: 52, h: 46, fn: () => { skinPage = (skinPage + a[0] + pages) % pages; } });\n    });\n    txt(W / 2 + 112, top + 96, (skinPage + 1) + '/' + pages, 12, t.btnText, 0.5, false);\n    SKINS.slice(skinPage * 12, skinPage * 12 + 12).forEach((sk, i) => {\n      const cx = W / 2 + ((i % 4) - 1.5)")
rep("  let skinPick = null;","  let skinPick = null, skinPage = 0;")
rep("const locked = SKINS.filter((s) => !skinOwned(s.id));","const locked = SKINS.filter((s) => !skinOwned(s.id) && s.cost <= 1000);   // the eggs only hold the cheaper skins")
# menu
rep("    drawDailyCard(484);\n","")
rep("    rrect(W - BX - 62 - cw, 18, cw, 42, 21, t.panel, 0.7);\n    drawCoin(W - BX - 62 - cw + 24, 39, 11);\n    txt(W - BX - 62 - cw + 42, 39, coinText(DATA.coins), 16, t.accent, 0);","    rrect(W - BX - 118 - cw, 18, cw, 42, 21, t.panel, 0.7);\n    drawCoin(W - BX - 118 - cw + 24, 39, 11);\n    txt(W - BX - 118 - cw + 42, 39, coinText(DATA.coins), 16, t.accent, 0);\n    dot(W - BX - 76, 39, 22, t.panel, 0.7);\n    drawIcon('vibe', W - BX - 76, 39);\n    buttons.push({ x: W - BX - 102, y: 12, w: 52, h: 56, fn: toggleVibe });")
rep("    roundButton(W / 2 - 176, 738, 'modes', 'Modes', () => openSheet(0));\n    roundButton(W / 2 - 88, 738, 'themes', 'Themes', () => openSheet(1));\n    roundButton(W / 2, 738, 'background', 'Background', () => openSheet(2));\n    roundButton(W / 2 + 88, 738, 'skins', 'Skins', () => openSheet(3));\n    roundButton(W / 2 + 176, 738, 'gifts', 'Gifts', () => openSheet(4), !spinReady() ? 0 : 1);",
"    drawDailyCard(654);\n    const rb = DATA.menuMode === 'endless' ? [['modes', 'Modes', 0], ['themes', 'Themes', 1], ['background', 'Pattern', 2], ['skins', 'Skins', 3], ['shop', 'Shop', 5], ['gifts', 'Gifts', 4]] : [['skins', 'Skins', 3], ['shop', 'Shop', 5], ['gifts', 'Gifts', 4]];\n    rb.forEach((r, k) => roundButton(W / 2 + (k - (rb.length - 1) / 2) * (rb.length > 3 ? 76 : 110), 738, r[0], r[1], () => openSheet(r[2]), r[2] === 4 && spinReady() ? 1 : 0));")
# sheet tabs
a=s.index("    // tabs\n"); b=s.index("    if (DATA.tab === 0) {\n      MODE_KEYS")
s=s[:a]+"""    // tabs
    const tabs = DATA.menuMode === 'endless' ? [['Modes', 0], ['Themes', 1], ['Pattern', 2], ['Skins', 3], ['Shop', 5], ['Gifts', 4]] : [['Skins', 3], ['Shop', 5], ['Gifts', 4]], tw = BW / tabs.length;
    rrect(BX, top + 32, BW, 46, 23, t.panel);
    tabs.forEach((tb, i) => {
      const x = BX + i * tw;
      if (DATA.tab === tb[1]) rrect(x + 2, top + 35, tw - 4, 40, 20, t.accent);
      txt(x + tw / 2, top + 55, tb[0], tabs.length > 3 ? 11.5 : 15, DATA.tab === tb[1] ? '#1b1b1b' : t.btnText);
      buttons.push({ x: x, y: top + 32, w: tw, h: 46, fn: () => { if (DATA.tab === 3 && tb[1] !== 3) skinPick = DATA.skin; DATA.tab = tb[1]; writeData(); } });
    });

"""+s[b:]
rep("        txt(W / 2, top + 316, 'Speed goes up slowly as you eat', 13, t.text, 0.5, false);\n      }","        txt(W / 2, top + 316, 'Speed goes up slowly as you eat', 13, t.text, 0.5, false);\n      }\n      button(W / 2, top + 412, 280, 40, 'Tap to steer: ' + (DATA.tapSteer ? 'On' : 'Off'), toggleTap, { size: 15 });")
rep("      txt(W / 2, top + 262, t.name, 20, t.accent);","      txt(W / 2, top + 262, t.name, 20, t.accent);")
rep("      txt(W / 2, top + 262, BACKGROUNDS[DATA.bg], 20, t.accent);","      txt(W / 2, top + 262, BACKGROUNDS[DATA.bg], 20, t.accent);")
rep("    } else if (DATA.tab === 3) {\n      drawSkinTab(top);\n    } else {","    } else if (DATA.tab === 3) {\n      drawSkinTab(top);\n    } else if (DATA.tab === 5) {\n      drawShop(top);\n    } else {")
rep("button(W / 2, top + (DATA.tab === 3 ? 450 : 410), 260, 54, 'Done'","button(W / 2, top + (DATA.tab === 3 || DATA.tab === 0 || DATA.tab === 5 ? 462 : 410), 260, 48, 'Done'")
# pointer handling
rep("""        touches.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: false });""","""        const w0 = toWorld(e), b0 = buttons.find((q) => w0.x >= q.x && w0.x <= q.x + q.w && w0.y >= q.y && w0.y <= q.y + q.h);
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: false, t: performance.now(), b: b0 ? { x: b0.x, y: b0.y } : null });""")
rep("""        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
        turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);""","""        const ax = Math.abs(dx), ay = Math.abs(dy), need = Math.max(SWIPE_PX, canvas.getBoundingClientRect().width * 0.04);
        if (Math.max(ax, ay) < need) return;                         // small finger wobble is not a swipe
        if (Math.min(ax, ay) > Math.max(ax, ay) * 0.8) return;       // clear diagonals wait until the direction is obvious
        turn(ax > ay ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);""")
rep("""        if (b) { sfx.click(); b.fn(); }
        else if (state === 'play') tapTurn(w.x, w.y);""","""        if (b) { if (s.b && s.b.x === b.x && s.b.y === b.y) { sfx.click(); b.fn(); } }   // press and release must be on the same button
        else if (state === 'play' && DATA.tapSteer && performance.now() - s.t < 350) tapTurn(w.x, w.y);""")
rep("const SWIPE_PX = 14;","const SWIPE_PX = 20;")
rep("      delta = Math.min(delta, 100);\n      anim += delta;","      delta = Math.min(delta, 100);\n      anim += delta;\n      fpsAvg = fpsAvg * 0.97 + delta * 0.03;\n      if (!LITE && anim > 5000 && fpsAvg > 26) LITE = true;     // slow phone: switch off the decorations")
rep("  let CT = null;","  let LITE = false, fpsAvg = 16;     // LITE = slow device, skip the decorations\n  let CT = null;")

rep("    buttons.push({ x: x - 44, y: y - 36, w: 88, h: label ? 100 : 72, fn: fn });","    buttons.push({ x: x - 38, y: y - 36, w: 76, h: label ? 100 : 72, fn: fn });")
rep("    txt(BX + 42, 39, 'Best  ' + best(DATA.mode), 16, t.text, 0);","    txt(BX + 42, 39, DATA.menuMode === 'endless' ? 'Best  ' + best(DATA.mode) : 'Stars  ' + Object.keys(DATA.camp.stars).reduce((a, k) => a + DATA.camp.stars[k], 0), 16, t.text, 0);")
rep("kb.on('keydown-ENTER', () => { if (state === 'menu') playCampaign();","kb.on('keydown-ENTER', () => { if (state === 'menu') playSelected();")
rep("      demoReset();\n","      CT = menuPal();\n      demoReset();\n")
rep("      fpsAvg = fpsAvg * 0.97 + delta * 0.03;","      fpsAvg = fpsAvg * 0.97 + delta * 0.03;")
# logic insert
rep("  // ---------- Phaser scene ----------", logic+"\n  // ---------- Phaser scene ----------")
# test hook
rep("window.__snake = { get G() { return G; },","window.__snake = { camp: { start: startLevel, open: openLevels, home: goHome, retry: campRetry, next: campNextLevel, get C() { return G && G.camp; }, LV: LV, E: E, unlockAll: () => { DATA.camp.unlocked = LEVEL_COUNT; writeData(); }, engineLevel: engineLevel, randomFruit: randomFruit, WORLDS: WORLDS, sliding: () => campSliding() }, get CT() { return CT; }, usePower: usePower, buyPower: buyPower, PW: PW, get LITE() { return LITE; }, pts: snakePoints, get G() { return G; },")

open('game.camp.js','w').write(s)
print('patched', len(s))
