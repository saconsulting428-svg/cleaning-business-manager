// Browser regression tests for the real game UI and flow (menus, input, pause, win/lose, restart, progression, save, visibility).
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const file = process.argv[2], outDir = process.argv[3] || '/tmp/shots';
const results = []; const ok = (name, cond, info) => { results.push({ name, pass: !!cond, info }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined && !cond ? '  -> ' + JSON.stringify(info) : '')); };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: false });
  const p = await ctx.newPage(); const errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  const ev = (fn, arg) => p.evaluate(([fn, arg]) => { const T = window.HUSH_TEST, $ = id => document.getElementById(id); return eval(fn); }, [fn, arg]);
  const fresh = async () => { await p.goto('file://' + file + '?test=1'); await ev("localStorage.clear()"); await p.goto('file://' + file + '?test=1'); await p.waitForTimeout(2200); };
  await fresh();
  ok('boot: home screen active, loading overlay gone', await ev("$('scr-home').classList.contains('active') && !$('ov-loading').classList.contains('show')"));
  ok('boot: Play label for new save', await ev("$('btn-play').textContent.trim()") === 'Play');
  // Play -> level 1 with tutorial
  await p.click('#btn-play'); await p.waitForTimeout(900);
  ok('play: game screen active, HUD says Level 1-1', await ev("$('scr-game').classList.contains('active') && $('hud-level').textContent") === 'Level 1-1' || await ev("$('hud-level').textContent") === 'Level 1-1');
  ok('play: tutorial card shown on first level and game paused behind it', await ev("T.isOpen('tutorial') && T.G.paused"));
  await p.click('#btn-tut-ok'); await p.waitForTimeout(300);
  ok('tutorial: dismissed, simulation running', await ev("!T.isOpen('tutorial') && !T.G.paused && !!T.G.S"));
  // keyboard movement
  const x0 = await ev("T.G.S.x"); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(800); await p.keyboard.up('ArrowRight'); const x1 = await ev("T.G.S.x");
  ok('keyboard: ArrowRight moves the survivor', x1 > x0 + 1, [x0, x1]);
  // drag input
  const x2 = await ev("T.G.S.x"); await p.mouse.move(120, 400); await p.mouse.down(); await p.mouse.move(210, 400, { steps: 4 }); await p.waitForTimeout(700);
  const draggingR = await ev("T.G.in.r"); await p.mouse.up(); await p.waitForTimeout(100); const x3 = await ev("T.G.S.x");
  ok('touch/mouse drag: hold-and-drag right moves, release stops', draggingR && x3 > x2 + 0.8 && !(await ev("T.G.in.r")), [x2, x3, draggingR]);
  await p.mouse.move(250, 400); await p.mouse.down(); await p.mouse.move(130, 400, { steps: 4 }); await p.waitForTimeout(600); const x4 = await ev("T.G.S.x"); await p.mouse.up();
  ok('drag left moves left', x4 < x3, [x3, x4]);
  // sonar
  const sl0 = await ev("T.G.S.sl"); await p.dispatchEvent('#ctl-sonar', 'pointerdown'); await p.waitForTimeout(250);
  ok('sonar button: uses a charge and counts it', (await ev("T.G.S.sl")) === sl0 - 1 && (await ev("T.G.S.su")) === 1 && (await ev("$('sonar-count').textContent")) === String(sl0 - 1));
  // crouch toggle
  await p.dispatchEvent('#ctl-crouch', 'pointerdown'); await p.waitForTimeout(200); ok('crouch button: toggles crouch', await ev("T.G.S.crouch && $('ctl-crouch').classList.contains('on')"));
  await p.dispatchEvent('#ctl-crouch', 'pointerdown'); await p.waitForTimeout(200); ok('crouch button: toggles back', await ev("!T.G.S.crouch"));
  // USE on a door
  await ev("T.G.S.x = 7.9; T.G.ppx = 7.9; T.G.px = 7.9"); await p.waitForTimeout(300);
  ok('USE button: lights up with OPEN near a door', (await ev("$('use-label').textContent")) === 'OPEN' && await ev("$('ctl-use').classList.contains('ready')"));
  await p.dispatchEvent('#ctl-use', 'pointerdown'); await p.waitForTimeout(300);
  ok('USE button: opens the door (door bit set in state)', (await ev("T.G.S.open")) === 1);
  // pause / resume / restart
  await p.click('#btn-pause'); await p.waitForTimeout(200); ok('pause: overlay shown and sim frozen', await ev("T.isOpen('pause') && T.G.paused")); const tp = await ev("T.G.S.t"); await p.waitForTimeout(400); ok('pause: time does not advance', (await ev("T.G.S.t")) === tp);
  await p.click('#btn-resume'); await p.waitForTimeout(300); ok('resume: sim runs again', (await ev("T.G.S.t")) > tp);
  await p.click('#btn-pause'); await p.click('#btn-pause-restart'); await p.waitForTimeout(300);
  ok('restart: level state is fresh (t≈0, sonar full, door closed, at start)', await ev("T.G.S.t < 0.6 && T.G.S.sl === T.G.W.sonar && T.G.S.open === 0 && Math.abs(T.G.S.x - T.G.W.start.x) < 0.5 && !T.G.paused"));
  // visibility
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(200);
  ok('visibility hidden: game auto-pauses', await ev("T.isOpen('pause') && T.G.paused"));
  await p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await p.click('#btn-resume'); await p.waitForTimeout(200);
  // win flow
  await ev("T.G.S.x = T.G.W.exit.x - 0.4; T.G.ppx = T.G.S.x; T.G.px = T.G.S.x; T.G.in.kr = true"); await p.waitForTimeout(1900);
  ok('win: Level Complete card with stars', await ev("T.isOpen('complete') && $('cmp-stars').querySelectorAll('.on').length >= 1"));
  ok('win: stars saved (level 1 >= 1 star) before anything else', (await ev("T.save.stars[0]")) >= 1 && (await ev("JSON.parse(localStorage.getItem('hush.save.v1')).stars[0]")) >= 1);
  // progression + persistence across reload
  await p.goto('file://' + file + '?test=1'); await p.waitForTimeout(2200);
  ok('save persists across reload (Continue shown, star total on home)', (await ev("$('btn-play').textContent.trim()")) === 'Continue' && /STARS/.test(await ev("$('home-foot').textContent")));
  await p.click('#btn-select'); await p.waitForTimeout(400); await p.click('.chapter.c1'); await p.waitForTimeout(400);
  ok('level select: level 2 unlocked after finishing level 1, level 3 locked', await ev("!document.querySelectorAll('.lvl')[1].classList.contains('locked') && document.querySelectorAll('.lvl')[2].classList.contains('locked')"));
  await p.click('#scr-levels .bar .icon-btn'); await p.waitForTimeout(300);
  ok('chapters: chapter 2 and 3 locked', await ev("document.querySelector('.chapter.c2').classList.contains('locked') && document.querySelector('.chapter.c3').classList.contains('locked')"));
  // load a level from the grid
  await p.click('.chapter.c1'); await p.waitForTimeout(300); await p.click('.lvl[data-l="1"]'); await p.waitForTimeout(1000);
  ok('level select: tapping level 2 loads it', (await ev("T.G.idx")) === 1 && (await ev("$('hud-name').textContent")) === 'Echo');
  if (await ev("T.isOpen('tutorial')")) await p.click('#btn-tut-ok');
  // death flow on level 3: put a creature on the player
  await ev("T.save.stars[1]=1; T.save.stars[2]=0; T.loadLevel(2, true); if (T.isOpen('tutorial')) document.getElementById('btn-tut-ok').click()"); await p.waitForTimeout(500);
  await ev("const S=T.G.S; S.x=10; T.G.ppx=10; T.G.px=10; S.cr[0].f=0; S.cr[0].x=10.3; S.cr[0].st=3; S.cr[0].dir=-1"); await p.waitForTimeout(1000);
  ok('death: caught state, caught overlay not yet blocking input immediately', await ev("T.G.S.dead && T.G.over"));
  await p.waitForTimeout(900); await p.screenshot({ path: outDir + '/caught_overlay.png' });
  ok('death: Game Over card shown ("You were caught") with Retry', await ev("T.isOpen('caught') && /caught/i.test($('ov-caught').textContent)"));
  const kr0 = await ev("T.G.S.x"); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(300); await p.keyboard.up('ArrowRight'); ok('death: input ignored while dead', (await ev("T.G.S.x")) === kr0);
  await p.click('#btn-retry'); await p.waitForTimeout(400);
  ok('retry: level restarted alive with no overlay', await ev("!T.G.S.dead && !T.G.over && !T.isOpen('caught') && T.G.S.t < 0.7"));
  // caught -> main menu
  await ev("const S=T.G.S; S.x=10; T.G.ppx=10; T.G.px=10; S.cr[0].x=10.3; S.cr[0].st=3"); await p.waitForTimeout(2200); await p.click('#btn-caught-home'); await p.waitForTimeout(300);
  ok('caught: Main Menu returns home', await ev("T.current() === 'home' && $('scr-home').classList.contains('active')"));
  // settings persistence
  await p.click('#btn-settings'); await p.waitForTimeout(300); await p.click('#set-sound + .toggle'); await p.waitForTimeout(100);
  ok('settings: sound toggle persists to save', (await ev("JSON.parse(localStorage.getItem('hush.save.v1')).sound")) === false);
  await p.click('#set-gfx button[data-v="2"]'); ok('settings: graphics Low applied and saved', (await ev("T.view.quality")) === 2 && (await ev("JSON.parse(localStorage.getItem('hush.save.v1')).gfx")) === 2);
  await p.click('#set-gfx button[data-v="auto"]');
  await p.click('#btn-reset-save'); await p.click('#btn-confirm-yes'); await p.waitForTimeout(300);
  ok('reset progress: stars cleared, back to home', (await ev("T.save.stars.every(s => s === 0)")) && (await ev("T.current()")) === 'home');
  // landscape layout
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(300); await p.click('#btn-play'); await p.waitForTimeout(1000); if (await ev("T.isOpen('tutorial')")) await p.click('#btn-tut-ok'); await p.waitForTimeout(500);
  const m = await ev("T.view.metrics()"); ok('landscape: scene scales to the window (PM based on height)', m.PM >= 40 && m.Hpx > 0, m);
  await p.screenshot({ path: outDir + '/landscape.png' });
  await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(400); await p.screenshot({ path: outDir + '/desktop.png' });
  ok('no console errors or warnings during the whole run', errs.length === 0, errs.slice(0, 5));
  const fails = results.filter(r => !r.pass).length; console.log(`\n${results.length - fails}/${results.length} passed`);
  require('fs').writeFileSync(__dirname + '/results-ui.json', JSON.stringify(results, null, 1));
  await b.close(); process.exit(fails ? 1 : 0);
})();
