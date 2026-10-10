/* HUSH HD - game flow: screens, input, HUD, save data, and the bridge between simulation, renderer and audio. */
(function () {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };
  const SAVE_KEY = 'hush.save.v1', PER = PER_CHAPTER, DT = Sim.DT;
  const TEST = /[?&]test=1\b/.test(location.search);
  const icon = function (n) { return '<svg><use href="#i-' + n + '"/></svg>'; };
  const CYC = { run: 2.2, crouch: 1.0, monster: 3.2 }, MIN_CADENCE = 0.6;      // metres per loop (a little short, so the loop never looks like slow motion); monsters keep at least MIN_CADENCE loops/s while moving
  const frac = function (v) { return v - Math.floor(v); };
  /* how many of the `steps` frames (foot landings) were passed while a loop at n frames advanced from phase a to b */
  function landed(a, b, n, steps) { let c = 0; const ka = Math.floor(a * n + 1e-9), kb = Math.floor(b * n + 1e-9); for (let k = ka + 1; k <= kb; k++) if (steps.indexOf(((k % n) + n) % n) >= 0) c++; return c; }
  const meta = function (k) { const e = Gfx.SP[k]; return e && e.ok ? e.m : null; };
  const parsed = LEVELS.map(function (d) { return Sim.parse(d); });
  const view = Renderer.create($('view'), function () { /* quality stepped down automatically */ });
  const fr = view.newFrame();

  /* ---------- save data (same key and shape as the original game, so progress carries over) ---------- */
  const save = { v: 1, stars: [], best: [], seen: {}, sound: true, music: true, vibe: true, vol: 80, mvol: 60, bright: 0, gfx: 'auto' };
  (function () {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.v === 1) for (const k in s) save[k] = s[k]; } catch (e) { /* fresh save */ }
    for (let i = 0; i < parsed.length; i++) { save.stars[i] = save.stars[i] || 0; save.best[i] = save.best[i] || null; }
    if (!save.seen || typeof save.seen !== 'object') save.seen = {};
  })();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ } }
  function applyAudio() { Sound.set('sound', save.sound); Sound.set('music', save.music); Sound.set('vibe', save.vibe); Sound.set('vol', save.vol / 100); Sound.set('mvol', save.mvol / 100); }
  function applyGfx() { view.quality = save.gfx === 'auto' ? 0 : +save.gfx; }
  const unlocked = function (i) { return G.devUnlock || i === 0 || save.stars[i - 1] > 0; };
  const chStars = function (c) { let n = 0; for (let i = c * PER; i < (c + 1) * PER; i++) n += save.stars[i]; return n; };
  const total = function () { return save.stars.reduce(function (a, b) { return a + b; }, 0); };
  function nextLevel() { for (let i = 0; i < parsed.length; i++) if (!save.stars[i]) return i; return parsed.length - 1; }
  const fmt = function (t) { const s = Math.round(t); return (s < 600 ? '0' : '') + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); };

  /* ---------- state ---------- */
  const G = { idx: 0, W: null, S: null, paused: false, over: false, acc: 0, gt: 0, auto: false, devUnlock: false,
    px: 0, ppx: 0, crx: [], pcrx: [], phase: 0, pphase: 0, phaseC: 0, pphaseC: 0, crPhase: [], pcrPhase: [], crMv: [], crStep: [], cv: [], po: 0, poC: 0, cpo: [], lastStep: [], wasMoving: false, lastLand: -9,
    pings: [], ripples: [], threat: 0, heartT: 0, hunted: false, heardT: -9, fade: 0, reachT: -9, arrive: null, trans: null, hintT: 0, tut: null, result: null, label: '', labelNo: false,
    in: { l: false, r: false, kl: false, kr: false, crouch: false, ck: false, use: false, ping: false }, drag: null, ready: false };
  const TUT = {
    move:     { title: 'Get out', kind: 'empty', text: 'Touch and hold the screen, then drag left or right to move. Release to stop. USE lights up near doors, stairs and lockers.' },
    sonar:    { title: 'Use sonar wisely', kind: 'sonar', text: 'Sonar reveals your surroundings — but the creature can hear it.' },
    crouch:   { title: 'Stay low', kind: 'card', crouch: 1, text: 'Crouching is silent and makes you much harder to see. It is also slow.' },
    hide:     { title: 'Hide', kind: 'card', text: 'Step into a locker and it will walk straight past. It does not work if it is already chasing you.' },
    bait:     { title: 'Bait', kind: 'sonar', text: 'Every sound draws it to where the sound was made. That includes your sonar. Be somewhere else when it arrives.' },
    radio:    { title: 'Intercom', kind: 'card', text: 'The switch plays a loud call from a speaker somewhere else. It will go and look.' },
    gen:      { title: 'Generator', kind: 'card', text: 'Powered doors and exits need the generator. It roars for several seconds when it starts.' },
    listener: { title: 'The Listener', kind: 'card', mk: 'listener', text: 'It is almost blind but hears ordinary footsteps from far away. Crouch whenever it is near.' }
  };

  /* ---------- level lifecycle ---------- */
  function loadLevel(i, sync) {
    G.idx = i; G.W = parsed[i]; G.S = null; show('game'); view.resize(); view.setLevel(G.W, Math.floor(i / PER), i);
    $('hud-level').textContent = 'Level ' + (Math.floor(i / PER) + 1) + '-' + (i % PER + 1); $('hud-name').textContent = G.W.def.name; G.floorShown = -1;
    const ready = function () { loading(false); begin(); const t = G.W.def.tutorial || (i === 0 ? 'move' : null); if (t && !save.seen[t] && !G.auto) openTutorial(t); };
    if (sync) { view.warm(G.W.start.f); return ready(); }
    /* the loading screen is real work: the starting floor's tiles and every sprite size are prepared before the level begins */
    loading(true, 0.2, 'LOADING...'); requestAnimationFrame(function () { loading(true, 0.6); requestAnimationFrame(function () { view.warm(G.W.start.f); loading(true, 1); requestAnimationFrame(ready); }); });
  }
  function loading(on, p, text) { overlay('loading', on); if (on) { if (p !== undefined) $('load-bar').style.width = Math.round(p * 100) + '%'; if (text) $('load-text').textContent = text; } }
  function begin() {
    const W = G.W, S = G.S = Sim.init(W);
    G.over = false; G.paused = false; G.acc = 0; G.px = G.ppx = S.x; G.crx = S.cr.map(function (c) { return c.x; }); G.pcrx = G.crx.slice();
    G.crPhase = S.cr.map(function () { return 0; }); G.pcrPhase = G.crPhase.slice(); G.crMv = S.cr.map(function () { return false; }); G.crStep = S.cr.map(function () { return 0; }); G.cpo = S.cr.map(function () { return 0; }); G.lastStep = S.cr.map(function () { return 0; }); G.po = G.poC = 0; G.wasMoving = false;
    G.cv = S.cr.map(function (c) { return { st: c.st, seen: 0, t: 5 + Math.random() * 6 }; });
    G.phase = G.pphase = G.phaseC = G.pphaseC = 0; G.reachT = -9; G.arrive = null; G.trans = null; G.pings = []; G.ripples = []; G.threat = 0; G.hunted = false; G.heardT = -9; G.fade = 1;
    view.reset(); dragEnd();
    G.in.l = G.in.r = G.in.kl = G.in.kr = G.in.use = G.in.ping = false; G.in.crouch = false; $('ctl-crouch').classList.remove('on');
    hideOverlays(); toast(''); $('hint').textContent = W.def.hint || ''; $('hint').classList.remove('gone'); G.hintT = G.gt + 9; hud(true);
    S.cr.forEach(function (c, i) { if (c.st === Sim.HUNT) setTimeout(function () { if (G.S === S && !G.over) voice(i, 'roar'); }, 350); });
  }
  function openTutorial(k) { const t = TUT[k]; G.tut = k; G.paused = true; $('tut-title').textContent = t.title; $('tut-text').textContent = t.text; overlay('tutorial', true); }

  /* ---------- simulation tick ---------- */
  function tick() {
    const S = G.S, W = G.W;
    G.ppx = S.x; for (let i = 0; i < S.cr.length; i++) { G.pcrx[i] = S.cr[i].x; G.pcrPhase[i] = G.crPhase[i]; }
    G.pphase = G.phase; G.pphaseC = G.phaseC;
    const pf = S.f, cf = S.cr.map(function (c) { return c.f; });
    Sim.step(W, S, { mx: (G.in.r || G.in.kr ? 1 : 0) - (G.in.l || G.in.kl ? 1 : 0), crouch: G.in.crouch || G.in.ck, use: G.in.use, ping: G.in.ping });
    G.in.use = G.in.ping = false; G.gt += DT;
    if (S.f !== pf) { G.ppx = S.x; G.pphase = G.phase; }
    for (let i = 0; i < S.cr.length; i++) if (S.cr[i].f !== cf[i]) G.pcrx[i] = S.cr[i].x;
    survivorGait(S, W);
    for (let i = 0; i < S.ev.length; i++) onEvent(S.ev[i]);
    S.ev.length = 0;
    /* creatures: footsteps are the main way to track one without sonar; voices tell its mood */
    let near = 99, hunted = false;
    for (let i = 0; i < S.cr.length; i++) {
      const c = S.cr[i], d = Sim.route(W, c.f, c.x, S.f, S.x).d;
      if (c.st === Sim.HUNT) hunted = true;
      if (c.f === S.f && c.busy <= 0) near = Math.min(near, d);
      creatureGait(i, c, d, S);
      creatureVoice(i, c, d);
    }
    G.hunted = hunted;
    const th = Math.max(0, Math.min(1, (9 - near) / 7)); G.threat += (th - G.threat) * 0.08;
    if (G.threat > 0.12 || hunted) { G.heartT -= DT; if (G.heartT <= 0) { G.heartT = hunted ? 0.45 : 1.15 - 0.6 * G.threat; Sound.play('heart', { v: hunted ? 1 : 0.35 + G.threat * 0.65 }); } }
    Sound.tick(DT, Math.floor(G.idx / PER), false); soundScene();
    if (S.dead && !G.over) lose(); else if (S.won && !G.over) win();
    hud(false);
  }
  /* The survivor's stride is locked to distance travelled (no foot sliding). A walk starts on the frame closest to standing, so the
     idle -> moving change does not jump, and a footstep sound is fired the moment a boot lands in the drawn animation. */
  function survivorGait(S, W) {
    const sm = meta('Survivor_Run'), cm = meta('Survivor_CrouchWalk');
    if (S.moving) {
      const d = Math.abs(S.x - G.ppx);
      if (!G.wasMoving) { if (sm) G.po = sm.neutral / 9 - frac(G.phase); if (cm) G.poC = cm.neutral / 6 - frac(G.phaseC); G.pphase = G.phase; G.pphaseC = G.phaseC; }
      G.phase += d / CYC.run; G.phaseC += d / CYC.crouch;
      const m = S.crouch ? cm : sm;
      if (m && landed((S.crouch ? G.pphaseC + G.poC : G.pphase + G.po), (S.crouch ? G.phaseC + G.poC : G.phase + G.po), S.crouch ? 6 : 9, m.steps)) {
        const glass = W.floors[S.f].noisy[Math.floor(S.x)]; G.foot = !G.foot;
        Sound.play(glass ? 'glass' : 'step', { crouch: S.crouch, v: G.foot ? 1 : 0.88, run: !S.crouch });
      }
    }
    G.wasMoving = S.moving;
  }
  /* creatures: cadence never drops below MIN_CADENCE while moving (a slow prowl would otherwise play at 4 frames a second); thuds follow the drawn landings */
  function creatureGait(i, c, d, S) {
    const mvNow = c.busy <= 0 && Math.abs(c.x - G.pcrx[i]) > 1e-5, mm = meta('Monster_Run');
    const ds = c.step - G.lastStep[i]; G.lastStep[i] = c.step;
    if (mvNow && !G.crMv[i] && mm) G.cpo[i] = mm.neutral / 8 - frac(G.crPhase[i]);
    const prev = G.crPhase[i];
    if (mvNow) G.crPhase[i] += Math.max(ds / CYC.monster, MIN_CADENCE * DT);
    G.crMv[i] = mvNow;
    if (mvNow && mm && landed(prev + G.cpo[i], G.crPhase[i] + G.cpo[i], 8, mm.steps)) {
      const v = Math.max(0, 1 - d / 13) * (c.f === S.f ? 1 : 0.45);
      if (v > 0.03) Sound.play('cstep', { v: v * (G.crStep[i]++ % 2 ? 0.85 : 1), pan: c.f === S.f ? Math.max(-1, Math.min(1, (c.x - S.x) / 6)) : 0, kind: G.W.cdefs[i].t });
    }
  }
  /* the continuous layers: ventilation, hum, room tone, tension (follows danger), and the generator while it runs (louder close by, panned) */
  function soundScene() {
    if (current !== 'game' || !G.S) { Sound.scene({ menu: true }); return; }
    const S = G.S, W = G.W; let gen = 0, pan = 0;
    if (S.power && W.gen) { const d = Sim.route(W, W.gen.f, W.gen.x, S.f, S.x).d; gen = Math.max(0, 1 - d / 15) * (S.genN > 0 ? 1 : 0.5); pan = W.gen.f === S.f ? Math.max(-1, Math.min(1, (W.gen.x - S.x) / 7)) : 0; }
    Sound.scene({ chapter: Math.floor(G.idx / PER), threat: G.threat, hunted: G.hunted && !S.won, gen, genPan: pan, paused: G.paused || G.over });
  }
  /* positional creature voices: a growl when it begins to suspect you, a roar when it hunts, low breathing now and then */
  function voice(i, kind, scale) {
    const S = G.S, c = S.cr[i]; if (!c) return;
    const d = Sim.route(G.W, c.f, c.x, S.f, S.x).d, v = Math.max(0, 1 - d / 16) * (c.f === S.f ? 1 : 0.4) * (scale || 1);
    if (v > 0.04) Sound.play(kind, { v, pan: c.f === S.f ? Math.max(-1, Math.min(1, (c.x - S.x) / 6)) : 0, kind: G.W.cdefs[i].t });
  }
  function creatureVoice(i, c, d) {
    const cv = G.cv[i]; if (!cv) return;
    if (c.st !== cv.st) {
      if (c.st === Sim.HUNT) voice(i, 'roar');
      else if (c.st === Sim.INVESTIGATE && d < 16) voice(i, 'growl', 0.8);
      else if (c.st === Sim.SEARCH && cv.st === Sim.HUNT) voice(i, 'growl', 0.9);
      cv.st = c.st;
    }
    if (c.seen > 0.05 && cv.seen <= 0.05 && c.st !== Sim.HUNT) voice(i, 'growl', 1);
    cv.seen = c.seen;
    cv.t -= DT;
    if (cv.t <= 0) { cv.t = 5 + Math.random() * 7; if (c.st === Sim.SEARCH || c.st === Sim.ROAM) { if (d < 11) voice(i, Math.random() < 0.55 ? 'breath' : 'growl', c.st === Sim.SEARCH ? 0.8 : 0.55); } }
  }
  const ripple = function (e, col, kind) { if (e.f === G.S.f) { G.ripples.push({ f: e.f, x: e.x, r: e.r, t0: G.gt, col, kind }); if (G.ripples.length > 14) G.ripples.shift(); } };
  const vol = function (f, x) { return Math.max(0.12, 1 - Sim.route(G.W, f, x, G.S.f, G.S.x).d / 18); };
  function onEvent(e) {
    const S = G.S;
    switch (e.e) {
      case 'step': break;                                                       // the sound comes from the boot landing in the animation (survivorGait); the sim step is the noise
      case 'noise':
        if (e.kind === 'step') ripple(e, '#cfe6ff', 'step'); else if (e.kind === 'glass') ripple(e, '#ffc93a', 'glass'); else if (e.kind === 'door') ripple(e, '#9df3ff', 'door');
        else if (e.kind === 'gen') { ripple(e, '#ffc93a', 'gen'); Sound.play('genPulse', { v: vol(e.f, e.x) }); }
        else if (e.kind === 'radio') { ripple(e, '#ffc93a', 'radio'); Sound.play('radioPulse', { v: vol(e.f, e.x), pan: e.f === S.f ? Math.sign(e.x - S.x) : 0 }); }
        break;
      case 'ping': Sound.play('ping'); Sound.duck(); G.pings.push({ f: e.f, x: e.x, t0: G.gt, cr: S.cr.map(function (c, i) { return { i, f: c.f, x: c.x, dir: c.dir, ph: G.crPhase[i] + G.cpo[i] }; }) }); if (G.pings.length > 3) G.pings.shift(); break;
      case 'key': Sound.play('key'); toast('Keycard acquired'); G.reachT = G.gt; break;
      case 'door': Sound.play('door'); G.reachT = G.gt; break;
      case 'unlock': Sound.play('unlock'); toast('Door unlocked'); G.reachT = G.gt; break;
      case 'cdoor': if (e.f === S.f) { Sound.play('door'); toast('Something opened a door', 'bad'); } break;
      case 'denied': G.reachT = G.gt; Sound.play('denied'); toast(e.why === 'locked' ? 'Locked. Find a keycard.' : 'No power. Start the generator.', 'bad'); break;
      case 'hide': Sound.play('hide'); if (S.comp) toast('It saw you hide!', 'bad'); break;
      case 'leave': Sound.play('hide'); break;
      case 'stairs': Sound.play('stairs'); G.trans = { kind: 'stairs', up: S.bf < S.f, from: S.f }; break;
      case 'vent': Sound.play('vent'); G.trans = { kind: 'vent', up: S.bf < S.f, from: S.f }; break;
      case 'gen': G.reachT = G.gt; Sound.play('gen'); toast('Generator running. It is LOUD.', 'bad'); break;
      case 'radio': G.reachT = G.gt; Sound.play('radio'); toast('Intercom call in 2 seconds...'); break;
      case 'heard': if (G.gt - G.heardT > 1.2) Sound.play('heard'); G.heardT = G.gt; break;
      case 'hunt': Sound.play('hunt'); break;
      case 'lost': Sound.play('lost'); toast('It lost you. Stay quiet.'); break;
      case 'arrive': G.px = G.ppx = S.x; if (G.trans) { G.arrive = { t0: G.gt, kind: G.trans.kind, up: G.trans.up }; G.fade = G.trans.kind === 'vent' ? 1 : 0.85; if (G.trans.from !== S.f) toast('Floor ' + (S.f + 1) + ' of ' + G.W.floors.length); G.trans = null; } break;
    }
  }
  const LINES = ['The dark always finds you...', 'It heard every step.', 'Some noises shouldn\'t be made.', 'Quieter next time.', 'It was closer than you thought.'];
  function lose() {
    G.over = true; Sound.play('caught'); const S = G.S;
    setTimeout(function () {
      if (current !== 'game' || !G.over || G.S !== S) return;
      $('caught-line').textContent = LINES[Math.floor(Math.random() * LINES.length)]; overlay('caught', true); drawCaught();
    }, 1150);
  }
  function drawCaught() {
    const cv = $('caught-art'), h = cv.getBoundingClientRect().height;
    Renderer.poster(cv, { chapter: Math.floor(G.idx / PER), pm: h / 5.2, fy: 0.62, sx: 0.2, mx: 0.62, ms: 1.45, pose: 'attack', sPose: 'caught', sFrame: 3, mk: G.W.cdefs.length ? G.W.cdefs[0].t : 'stalker', dark: 0.7, red: 0.14, fadeBottom: 0.5, noBeam: true, bl: 0.7 });
  }
  function win() {
    const S = G.S, W = G.W, i = G.idx, st = Sim.stars(W, S); G.over = true; G.result = { stars: st, t: S.t, su: S.su, det: S.det };
    if (st > save.stars[i]) save.stars[i] = st;
    if (!save.best[i] || S.t < save.best[i].t) save.best[i] = { t: Math.round(S.t * 10) / 10, su: S.su };
    persist();                                                                    // saved before anything else happens
    Sound.play('win');
    setTimeout(function () { if (current === 'game' && G.over && G.S === S) showComplete(); }, 650);
  }
  function showComplete() {
    const r = G.result, W = G.W, s = $('cmp-stars').children, last = G.idx === parsed.length - 1, endCh = (G.idx + 1) % PER === 0, third = W.chase ? r.t <= W.parTime : !r.det;
    for (let i = 0; i < 3; i++) { s[i].setAttribute('class', ''); (function (i) { if (i < r.stars) setTimeout(function () { s[i].setAttribute('class', 'on'); Sound.play('star', { i }); }, 250 + i * 260); })(i); }
    const star = icon('star').replace('<svg', '<svg class="st"');
    $('cmp-rows').innerHTML = '<li class="ok">' + icon('clock') + '<span>Time</span><b>' + fmt(r.t) + '</b>' + star + '</li>' +
      '<li class="' + (r.su <= W.par ? 'ok' : '') + '">' + icon('sonar') + '<span>Sonar used (target ' + W.par + ')</span><b class="' + (r.su <= W.par ? '' : 'bad') + '">' + r.su + '</b>' + star + '</li>' +
      '<li class="' + (third ? 'ok' : '') + '">' + icon(W.chase ? 'clock' : 'eye') + '<span>' + (W.chase ? 'Escaped within ' + fmt(W.parTime) : 'Not detected') + '</span><b class="' + (third ? '' : 'bad') + '">' + icon(third ? 'check' : 'cross') + '</b>' + star + '</li>';
    $('btn-next').firstElementChild.textContent = last ? 'Chapters' : endCh ? 'Next Chapter' : 'Next Level';
    overlay('complete', true);
    const cv = $('cmp-art'); Renderer.poster(cv, { chapter: Math.floor(G.idx / PER), pm: cv.getBoundingClientRect().height / 2.4, fy: 0.9, sx: 0.4, creature: false, sPose: 'run', t: 0.4, dark: 0.7 });
  }

  /* ---------- HUD ---------- */
  const LABEL = { open: 'OPEN', unlock: 'UNLOCK', locked: 'LOCKED', nopower: 'NO POWER', hide: 'HIDE', leave: 'LEAVE', climb: 'STAIRS', crawl: 'VENT', start: 'START', radio: 'CALL' };
  let hudKey = '';
  function objective() {
    const S = G.S, W = G.W; let closedLock = false;
    if (W.chase) return ['exit', 'Run. Reach the exit.'];
    for (let i = 0; i < W.doors.length; i++) if (W.doors[i].kind === 'locked' && !Sim.doorOpen(S, W.doors[i])) closedLock = true;
    if (closedLock && S.keys === 0 && S.took !== (1 << W.keys.length) - 1) return ['key', 'Find the keycard'];
    if (closedLock && S.keys > 0) return ['key', 'Unlock the door'];
    if (!S.power && (W.exit.power || W.doors.some(function (d) { return d.kind === 'power' && !Sim.doorOpen(S, d); }))) return ['bolt', 'Start the generator'];
    return ['exit', 'Reach the exit'];
  }
  function hud(force) {
    const S = G.S, W = G.W; if (!S) return;
    const tg = Sim.target(W, S), ob = objective(); let seen = 0, inv = false, search = false;
    for (let i = 0; i < S.cr.length; i++) { seen = Math.max(seen, S.cr[i].seen); if (S.cr[i].st === Sim.INVESTIGATE) inv = true; if (S.cr[i].st === Sim.SEARCH) search = true; }
    /* four stages: it heard something -> it is suspicious -> it sees you -> caught */
    const sense = S.dead ? 'caught' : G.hunted ? 'hunt' : (seen > 0.05 || search) ? 'susp' : inv ? 'heard' : '';
    const key = [S.sl, S.scd > 0 ? 1 : 0, S.keys, S.took, tg ? tg.act : '', ob[1], sense, S.hid, S.f].join('|');
    $('ctl-sonar').style.setProperty('--cd', S.sl <= 0 ? 0 : S.scd > 0 ? 1 - S.scd / Sim.C.SONAR_CD : 1);
    if (sense === 'susp') $('sense').style.setProperty('--p', seen > 0.05 ? Math.min(1, seen).toFixed(2) : 0.35);
    G.label = tg ? LABEL[tg.act] : ''; G.labelNo = !!tg && (tg.act === 'locked' || tg.act === 'nopower');
    if (!force && key === hudKey) return; hudKey = key;
    $('hud-sonar').lastElementChild.textContent = S.sl + '/' + W.sonar; $('sonar-count').textContent = S.sl; $('ctl-sonar').classList.toggle('empty', S.sl <= 0);
    $('hud-keys').style.display = W.keys.length ? '' : 'none';
    if (W.keys.length) { let got = 0; for (let i = 0; i < W.keys.length; i++) if ((S.took >> i) & 1) got++; $('hud-keys').lastElementChild.textContent = got + '/' + W.keys.length; }
    $('objective').innerHTML = icon(ob[0]) + '<span>' + ob[1] + '</span>';
    if (W.floors.length > 1 && G.floorShown !== S.f) { G.floorShown = S.f; $('hud-name').textContent = W.def.name + '  ·  Floor ' + (S.f + 1) + '/' + W.floors.length; }
    const b = $('ctl-use'); b.classList.toggle('ready', !!tg); b.classList.toggle('no', G.labelNo); $('use-label').textContent = tg ? LABEL[tg.act] : 'USE';
    const se = $('sense'), SN = { heard: ['ear', 'IT HEARD THAT'], susp: ['eye', 'SUSPICIOUS'], hunt: ['eye', 'IT SEES YOU!'], caught: ['slash', 'CAUGHT'] };
    se.className = 'sense ' + sense;
    if (sense) { se.firstElementChild.innerHTML = '<use href="#i-' + SN[sense][0] + '"/>'; se.querySelector('b').textContent = SN[sense][1]; if (sense !== 'susp') se.style.setProperty('--p', sense === 'heard' ? 0.3 : 1); }
  }
  let toastT = 0;
  function toast(msg, kind) { const t = $('toast'); clearTimeout(toastT); if (!msg) { t.className = 'toast'; return; } t.textContent = msg; t.className = 'toast show ' + (kind || ''); toastT = setTimeout(function () { t.className = 'toast'; }, 2100); }

  /* ---------- screens ---------- */
  let current = 'home', settingsFrom = 'home', curCh = 0;
  function show(name) {
    current = name; ['home', 'chapters', 'levels', 'settings', 'game'].forEach(function (n) { $('scr-' + n).classList.toggle('active', n === name); });
    if (name !== 'game') hideOverlays();
    if (name === 'home') { const t = total(); $('btn-play').lastElementChild.textContent = t ? 'Continue' : 'Play'; $('home-foot').textContent = t ? t + ' / ' + parsed.length * 3 + ' STARS' : 'SOME NOISES SHOULDN\'T BE MADE...'; muteIcon(); homeT = -1; }
    if (name === 'chapters') renderChapters();
    if (name === 'settings') { setBright(save.bright || 0, true); setGfxUi(); $('set-sound').checked = save.sound; $('set-music').checked = save.music; $('set-vibe').checked = save.vibe; $('set-vol').value = save.vol; $('set-mvol').value = save.mvol; }
  }
  const overlay = function (n, on) { $('ov-' + n).classList.toggle('show', on); };
  const hideOverlays = function () { ['tutorial', 'pause', 'complete', 'caught', 'confirm', 'loading'].forEach(function (n) { overlay(n, false); }); };
  const isOpen = function (n) { return $('ov-' + n).classList.contains('show'); };
  const muteIcon = function () { $('btn-mute').innerHTML = icon(save.sound ? 'sound' : 'mute'); };
  const starsHtml = function (n) { let h = ''; for (let i = 0; i < 3; i++) h += '<svg' + (i < n ? '' : ' class="off"') + '><use href="#i-star"/></svg>'; return '<span class="stars">' + h + '</span>'; };
  function renderChapters() {
    $('ch-total').className = 'chip star'; $('ch-total').innerHTML = icon('star') + '<i>' + total() + '/' + parsed.length * 3 + '</i>';
    $('chapter-list').innerHTML = CHAPTERS.map(function (c, i) {
      const open = unlocked(i * PER);
      return '<button class="chapter c' + (i + 1) + (open ? '' : ' locked') + '" data-c="' + i + '"><canvas data-k="ch' + i + '"></canvas><span class="meta"><small>CHAPTER ' + (i + 1) + '</small><b>' + c.name + '</b><span class="prog">' + icon(open ? 'star' : 'lock') + '<span>' + chStars(i) + '/30</span></span></span>' + icon('next').replace('<svg', '<svg class="go"') + '</button>';
    }).join('');
    Array.prototype.forEach.call($('chapter-list').querySelectorAll('canvas'), function (cv, i) {
      const h = cv.getBoundingClientRect().height;
      Renderer.poster(cv, { chapter: i, pm: h / 2.35, fy: 0.9, sx: i === 2 ? 0.5 : 0.7, mx: i === 2 ? 0.8 : 0.92, creature: i > 0, mk: i === 1 ? 'listener' : 'sentinel', seed: 9 + i * 4, dark: 0.66, fadeLeft: 0.62, sPose: i === 1 ? 'crouch' : 'idle', shift: i * 5 });
    });
  }
  function renderLevels(c) {
    curCh = c; show('levels'); $('lv-title').textContent = 'Chapter ' + (c + 1); $('lv-sub').textContent = CHAPTERS[c].name; $('lv-total').className = 'chip star'; $('lv-total').innerHTML = icon('star') + '<i>' + chStars(c) + '/30</i>';
    $('lv-line').textContent = CHAPTERS[c].line; const nx = nextLevel(); let h = '';
    for (let i = c * PER; i < (c + 1) * PER; i++) { const open = unlocked(i); h += '<button class="lvl' + (open ? '' : ' locked') + (i === nx && !save.stars[i] ? ' next' : '') + '" data-l="' + i + '" aria-label="Level ' + (i % PER + 1) + '"><b>' + (i % PER + 1) + '</b>' + (open ? starsHtml(save.stars[i]) : icon('lock')) + '</button>'; }
    $('level-grid').innerHTML = h;
    const la = $('levels-art'); Renderer.poster(la, { chapter: c, pm: la.getBoundingClientRect().height / 3.0, fy: 0.74, sx: 0.34, mx: 0.9, creature: c > 0, mk: c === 1 ? 'listener' : 'stalker', seed: 21 + c, dark: 0.72, shift: 11 + c });
  }

  /* ---------- wiring ---------- */
  const on = function (id, fn) { $(id).addEventListener('click', function (e) { Sound.unlock(); Sound.play('ui'); fn(e); soundScene(); }); };
  on('btn-play', function () { loadLevel(nextLevel()); });
  on('btn-select', function () { show('chapters'); });
  on('btn-settings', function () { settingsFrom = 'home'; show('settings'); });
  on('btn-mute', function () { save.sound = !save.sound; persist(); applyAudio(); muteIcon(); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) { b.addEventListener('click', function () { Sound.play('ui'); show(b.getAttribute('data-back')); }); });
  $('chapter-list').addEventListener('click', function (e) { const b = e.target.closest('.chapter'); if (!b) return; Sound.unlock(); if (b.classList.contains('locked')) { Sound.play('denied'); return; } Sound.play('ui'); renderLevels(+b.getAttribute('data-c')); });
  $('level-grid').addEventListener('click', function (e) { const b = e.target.closest('.lvl'); if (!b) return; Sound.unlock(); if (b.classList.contains('locked')) { Sound.play('denied'); return; } Sound.play('ui'); loadLevel(+b.getAttribute('data-l')); });
  function setOpt(k, v) { save[k] = v; persist(); applyAudio(); }
  function setBright(v, quiet) { save.bright = v; view.setBright(v); Array.prototype.forEach.call($('set-bright').children, function (b) { b.classList.toggle('on', +b.getAttribute('data-v') === v); }); if (!quiet) persist(); }
  function setGfxUi() { Array.prototype.forEach.call($('set-gfx').children, function (b) { b.classList.toggle('on', b.getAttribute('data-v') === String(save.gfx)); }); }
  $('set-bright').addEventListener('click', function (e) { const v = e.target.getAttribute('data-v'); if (v !== null) { Sound.play('ui'); setBright(+v); } });
  $('set-gfx').addEventListener('click', function (e) { const v = e.target.getAttribute('data-v'); if (v !== null) { Sound.play('ui'); save.gfx = v === 'auto' ? 'auto' : +v; persist(); applyGfx(); setGfxUi(); } });
  $('set-sound').addEventListener('change', function (e) { setOpt('sound', e.target.checked); Sound.play('ui'); });
  $('set-music').addEventListener('change', function (e) { Sound.unlock(); setOpt('music', e.target.checked); });
  $('set-vibe').addEventListener('change', function (e) { setOpt('vibe', e.target.checked); if (e.target.checked) Sound.buzz(30); });
  $('set-vol').addEventListener('input', function (e) { setOpt('vol', +e.target.value); }); $('set-vol').addEventListener('change', function () { Sound.unlock(); Sound.play('key'); });
  $('set-mvol').addEventListener('input', function (e) { Sound.unlock(); setOpt('mvol', +e.target.value); });
  on('btn-settings-back', function () { if (settingsFrom === 'game') { show('game'); overlay('pause', true); } else show('home'); });
  on('btn-reset-save', function () { overlay('confirm', true); });
  on('btn-confirm-no', function () { overlay('confirm', false); });
  on('btn-confirm-yes', function () { save.stars = save.stars.map(function () { return 0; }); save.best = save.best.map(function () { return null; }); save.seen = {}; persist(); overlay('confirm', false); settingsFrom = 'home'; show('home'); });

  function pause(p) {
    if (current !== 'game' || !G.S || G.over || isOpen('tutorial') || isOpen('loading')) return;
    G.paused = p; overlay('pause', p); if (p) { dragEnd(); G.in.kl = G.in.kr = false; }
  }
  on('btn-pause', function () { pause(true); });
  on('btn-resume', function () { pause(false); });
  on('btn-pause-restart', function () { begin(); });
  on('btn-pause-settings', function () { settingsFrom = 'game'; show('settings'); });
  on('btn-pause-home', function () { G.paused = false; G.over = true; show('home'); });
  on('btn-tut-ok', function () { save.seen[G.tut] = 1; persist(); overlay('tutorial', false); G.paused = false; });
  on('btn-retry', function () { begin(); });
  on('btn-caught-home', function () { show('home'); });
  on('btn-cmp-levels', function () { renderLevels(Math.floor(G.idx / PER)); });
  on('btn-next', function () { if (G.idx === parsed.length - 1) show('chapters'); else loadLevel(G.idx + 1); });

  /* hold-and-drag movement: touch anywhere on the scene, drag left or right, keep holding to keep moving, release to stop */
  const DEAD = 14, TRAIL = 46, stage = $('stage'), dragEl = $('drag');
  function dragSet(dir) { G.in.l = dir < 0; G.in.r = dir > 0; dragEl.className = 'drag show' + (dir < 0 ? ' left' : dir > 0 ? ' right' : ''); }
  function dragEnd() { G.drag = null; G.in.l = G.in.r = false; if (dragEl) dragEl.className = 'drag'; }
  function dragMove(e) {
    const d = G.drag; if (!d || e.pointerId !== d.id) return; const x = e.clientX; let dx = x - d.x0;
    if (dx > TRAIL) d.x0 = x - TRAIL; else if (dx < -TRAIL) d.x0 = x + TRAIL; dx = x - d.x0;
    const dir = dx > DEAD ? 1 : dx < -DEAD ? -1 : (Math.abs(dx) < DEAD * 0.5 ? 0 : d.dir); d.dir = dir; dragSet(dir);
    const r = stage.getBoundingClientRect(); dragEl.style.transform = 'translate(' + (d.x0 - r.left) + 'px,' + (d.y0 - r.top) + 'px)'; dragEl.style.setProperty('--k', Math.max(-1, Math.min(1, dx / TRAIL)).toFixed(2));
  }
  stage.addEventListener('pointerdown', function (e) {
    e.preventDefault(); Sound.unlock(); if (G.paused || G.over || !G.S || G.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    try { stage.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } G.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dir: 0 }; $('drag-tip').classList.add('gone'); dragMove(e);
  });
  stage.addEventListener('pointermove', function (e) { if (G.drag) { e.preventDefault(); dragMove(e); } });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { stage.addEventListener(n, function (e) { if (G.drag && e.pointerId === G.drag.id) dragEnd(); }); });
  stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('touchmove', function (e) { if (current === 'game') e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  window.addEventListener('blur', function () { dragEnd(); G.in.kl = G.in.kr = G.in.ck = false; if (current === 'game' && !G.paused && !G.over && !isOpen('tutorial')) pause(true); });
  function press(id, fn) { $(id).addEventListener('pointerdown', function (e) { e.preventDefault(); Sound.unlock(); if (!G.paused && !G.over && G.S) fn(); }); $(id).addEventListener('contextmenu', function (e) { e.preventDefault(); }); }
  function pressSonar() { if (G.S.sl <= 0) { Sound.play('denied'); toast('No sonar charges left', 'bad'); } else if (G.S.scd > 0 || G.S.hid >= 0 || G.S.busy > 0) Sound.play('denied'); else G.in.ping = true; }
  press('ctl-crouch', function () { G.in.crouch = !G.in.crouch; $('ctl-crouch').classList.toggle('on', G.in.crouch); });
  press('ctl-use', function () { G.in.use = true; });
  press('ctl-sonar', pressSonar);
  document.addEventListener('keydown', function (e) {
    if (e.repeat) return; const k = e.key.toLowerCase(); if (k === 'escape') return back(); if (current !== 'game') return; Sound.unlock();
    if (k === 'p') return pause(!G.paused); if (G.paused || G.over || !G.S) return;
    if (k === 'arrowleft' || k === 'a') G.in.kl = true; else if (k === 'arrowright' || k === 'd') G.in.kr = true; else if (k === 'arrowdown' || k === 's' || k === 'shift' || k === 'c') G.in.ck = true;
    else if (k === ' ') { e.preventDefault(); pressSonar(); } else if (k === 'e' || k === 'enter' || k === 'arrowup' || k === 'w') G.in.use = true;
  });
  document.addEventListener('keyup', function (e) { const k = e.key.toLowerCase(); if (k === 'arrowleft' || k === 'a') G.in.kl = false; else if (k === 'arrowright' || k === 'd') G.in.kr = false; else if (k === 'arrowdown' || k === 's' || k === 'shift' || k === 'c') G.in.ck = false; });
  window.addEventListener('resize', function () { if (current === 'game' && G.W) view.resize(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (current === 'game' && !G.paused) pause(true); Sound.suspend(); } else Sound.resume(); });
  function back() {
    if (isOpen('confirm')) return overlay('confirm', false);
    if (current === 'game') { if (isOpen('tutorial')) return $('btn-tut-ok').click(); if (isOpen('complete')) return renderLevels(Math.floor(G.idx / PER)); if (isOpen('caught')) return show('home'); return pause(!G.paused); }
    if (current === 'settings') return $('btn-settings-back').click(); if (current === 'levels') return show('chapters'); if (current !== 'home') return show('home');
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (App && App.exitApp) App.exitApp();
  }
  document.addEventListener('backbutton', back, false);

  /* ---------- main loop ---------- */
  let lastT = 0, artT = 0, homeT = -1, sceneT = 0;
  function frame(ts) {
    const t = ts / 1000, dt = Math.min(0.1, t - lastT); lastT = t;
    if (current === 'game' && G.S && !isOpen('loading')) {
      if (!G.paused && !G.auto) { if (!G.over) { G.acc += dt; let n = 0; while (G.acc >= DT && n++ < 6) { tick(); G.acc -= DT; if (G.over) break; } if (G.acc >= DT) G.acc = 0; } else G.gt += dt; }
      const a = G.over || G.paused ? 1 : Math.min(1, G.acc / DT), S = G.S;
      G.px = G.ppx + (S.x - G.ppx) * a; for (let i = 0; i < S.cr.length; i++) G.crx[i] = G.pcrx[i] + (S.cr[i].x - G.pcrx[i]) * a;
      if (G.fade > 0) G.fade = Math.max(0, G.fade - dt * 2.8);
      if (G.hintT && G.gt > G.hintT) { $('hint').classList.add('gone'); G.hintT = 0; }
      const rt = G.gt + (G.over || G.paused || G.auto ? 0 : G.acc), rc = (rt - G.reachT) / 0.55;
      fr.W = G.W; fr.S = S; fr.px = G.px; fr.crx = G.crx; fr.crMv = G.crMv; fr.now = rt; fr.pings = G.pings; fr.ripples = G.ripples; fr.threat = G.threat; fr.hunted = G.hunted && !S.won;
      fr.target = Sim.target(G.W, S); fr.label = G.label; fr.labelNo = G.labelNo; fr.arrive = G.arrive; fr.fade = G.fade; fr.useP = rc >= 0 && rc < 1 ? rc : -1;
      fr.phase = G.pphase + (G.phase - G.pphase) * a + G.po; fr.phaseC = G.pphaseC + (G.phaseC - G.pphaseC) * a + G.poC;
      if (!fr.crPhase || fr.crPhase.length !== S.cr.length) fr.crPhase = new Array(S.cr.length);
      for (let i = 0; i < S.cr.length; i++) fr.crPhase[i] = G.pcrPhase[i] + (G.crPhase[i] - G.pcrPhase[i]) * a + G.cpo[i];
      try { view.draw(fr); } catch (e) { if (!G.drawErr) { G.drawErr = String(e && e.stack || e); if (window.console) console.error('draw failed: ' + G.drawErr); } }    // a rendering fault must never stop the simulation or the UI
      if (isOpen('tutorial') && t - artT > 0.07) { artT = t; tutArt(t); }
    } else if (current === 'home' && !isOpen('loading') && t - artT > 0.08) { artT = t; homeArt(t); }
    if (t - sceneT > 0.25) { sceneT = t; if (current !== 'game' || G.paused || G.over) soundScene(); if (current !== 'game' || G.paused) Sound.tick(0.25, 0, current !== 'game'); }
    requestAnimationFrame(frame);
  }
  function tutArt(t) {
    const tu = TUT[G.tut], ta = $('tut-art'), h = ta.getBoundingClientRect().height;
    Renderer.poster(ta, { chapter: Math.floor(G.idx / PER), pm: h / 2.5, fy: 0.9, sx: 0.24, mx: 0.8, creature: tu.kind !== 'empty', mk: tu.mk, sPose: tu.crouch ? 'crouch' : 'idle', dark: 0.74, roar: Math.floor(((Math.sin(t * 1.1) + 1) / 2) * 2.99) });
  }
  function homeArt(t) {
    const cv = $('home-art'), h = cv.getBoundingClientRect().height;
    Renderer.poster(cv, { chapter: 0, pm: h / 6.6, fy: 0.62, sx: 0.24, mx: 0.86, mk: 'stalker', seed: 6, dark: 0.8, fadeBottom: 0.36, roar: Math.floor(((Math.sin(t * 0.8) + 1) / 2) * 2.99), t });
  }
  /* boot: build textures, load fonts and every sprite behind the loading screen, then show the menu */
  function boot() {
    show('home'); overlay('loading', true); $('load-bar').style.width = '10%';
    const finish = function () {
      $('load-bar').style.width = '100%'; G.ready = true; applyAudio(); applyGfx(); view.setBright(save.bright || 0);
      Renderer.poster($('load-art'), { chapter: 0, pm: $('load-art').getBoundingClientRect().height / 6, fy: 0.62, creature: false, sx: -0.5, seed: 14, dark: 0.82, fadeBottom: 0.4 });
      requestAnimationFrame(function () { requestAnimationFrame(function () { overlay('loading', false); }); });
    };
    requestAnimationFrame(function () {
      Gfx.textures(); $('load-bar').style.width = '35%';
      const fl = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 20px "Barlow Condensed"'), document.fonts.load('600 20px "Barlow Condensed"'), document.fonts.load('500 14px "Barlow"')]) : Promise.resolve();
      Promise.all([Gfx.loadSprites(window.HUSH_ATLAS || {}), fl.catch(function () { /* system font fallback */ })]).then(function () { $('load-bar').style.width = '80%'; finish(); }, finish);
      setTimeout(function () { if (!G.ready) finish(); }, 6000);
    });
  }
  requestAnimationFrame(frame); boot();

  /* ---------- test hooks: only present with ?test=1 ---------- */
  if (TEST) {
    const ACTS = [{ mx: 1 }, { mx: -1 }, { mx: 1, crouch: true }, { mx: -1, crouch: true }, {}, { crouch: true }, { use: true }, { ping: true }];
    /* plays an action list through the real tick() and input path, without waiting in real time (12 ticks per action) */
    const run = function (i, path, nt) {
      G.devUnlock = true; G.auto = true; loadLevel(i, true); overlay('tutorial', false); G.paused = false; nt = nt || 12;
      for (let k = 0; k < path.length && !G.over; k++) {
        const a = ACTS[path[k]];
        for (let n = 0; n < nt && !G.over; n++) { G.in.kr = a.mx === 1; G.in.kl = a.mx === -1; G.in.crouch = !!a.crouch; G.in.use = n === 0 && !!a.use; G.in.ping = n === 0 && !!a.ping; tick(); }
      }
      G.in.kr = G.in.kl = G.in.crouch = false; G.auto = false; const S = G.S;
      return { level: i + 1, won: S.won, dead: S.dead, t: S.t, su: S.su, det: S.det, stars: S.won ? Sim.stars(G.W, S) : 0, saved: save.stars[i] };
    };
    /* runs one frame of the main loop with an exact time step, without scheduling the next one (deterministic animation tests) */
    const advance = function (dt) { const raf = window.requestAnimationFrame; window.requestAnimationFrame = function () { return 0; }; try { frame((lastT + dt) * 1000); } finally { window.requestAnimationFrame = raf; } };
    /* like run(), but through the real frame loop at exact steps, so every frame is also RENDERED (hide, vents, stairs, death... all draw paths) */
    const runRender = function (i, path) {
      G.devUnlock = true; G.auto = true; loadLevel(i, true); overlay('tutorial', false); G.paused = false; G.auto = false; G.drawErr = null;
      for (let k = 0; k < path.length && !G.over; k++) {
        const a = ACTS[path[k]];
        for (let n = 0; n < 12 && !G.over; n++) { G.in.kr = a.mx === 1; G.in.kl = a.mx === -1; G.in.crouch = !!a.crouch; G.in.use = n === 0 && !!a.use; G.in.ping = n === 0 && !!a.ping; advance(DT + 1e-9); }
      }
      G.in.kr = G.in.kl = G.in.crouch = false; const S = G.S;
      return { level: i + 1, won: S.won, dead: S.dead, t: S.t, su: S.su, stars: S.won ? Sim.stars(G.W, S) : 0, drawErr: G.drawErr };
    };
    window.HUSH_TEST = { runRender, advance, G, view, fr, run, tick, begin, pause, show, save, persist, loadLevel, renderLevels, Sim, Sound, overlay, isOpen, current: function () { return current; }, nextLevel, unlockAll: function () { G.devUnlock = true; } };
  }
})();
