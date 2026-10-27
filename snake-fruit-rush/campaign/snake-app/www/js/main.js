/* Boot, input handling and the main loop. */
(function (S) {
  'use strict';
  const SC = S.screens, P = S.play, ui = S.ui, G = S.gfx, A = S.audio;
  const SWIPE_PX = 14;
  let ready = false, now = 0;

  // ---------- screen size ----------
  function chooseSize() {
    const host = document.getElementById('game'), r = host.getBoundingClientRect();
    const w = r.width || window.innerWidth, h = r.height || window.innerHeight;
    S.H = S.clamp(Math.round(S.W * h / w), 720, 1000);
    // canvas resolution: sharp, but never more than ~1.6 million pixels so mid-range phones stay smooth
    const byPixels = Math.sqrt(1.6e6 / (S.W * S.H)), dpr = window.devicePixelRatio || 2;
    S.ZOOM = S.clamp(Math.floor(Math.min(2, byPixels, dpr) * 4) / 4, 1.25, 2);
  }

  // ---------- Phaser scene ----------
  class Main extends Phaser.Scene {
    create() {
      S.scene = this;
      G.init(this, 7);
      this.cameras.main.setZoom(S.ZOOM);
      this.cameras.main.centerOn(S.W / 2, S.H / 2);
      this.cameras.main.setBackgroundColor('#0f1220');
      S.art.load(this).then(() => { ready = true; }, (e) => { console.error(e); ready = true; });
      wireInput(this);
    }
    update(time, delta) {
      delta = Math.min(delta, 100);
      now += delta;
      frame(delta);
    }
  }

  // ---------- adaptive resolution ----------
  // If the phone cannot keep ~40 fps, render the canvas at a lower resolution (the picture is scaled up by CSS).
  const perf = { n: 0, sum: 0, since: 0 };
  function governor(dt) {
    if (now < 4000 || S.noGovernor) return;
    perf.n++; perf.sum += dt;
    if (perf.n < 150) return;
    const avg = perf.sum / perf.n;
    perf.n = 0; perf.sum = 0;
    if (avg > 27 && S.ZOOM > 1.25 && !document.hidden) {
      S.ZOOM = Math.max(1.25, S.ZOOM - 0.25);
      const sc = S.scene;
      sc.scale.setGameSize(Math.round(S.W * S.ZOOM), Math.round(S.H * S.ZOOM));
      sc.cameras.main.setZoom(S.ZOOM); sc.cameras.main.centerOn(S.W / 2, S.H / 2);
    }
  }

  // ---------- main loop ----------
  function frame(dt) {
    SC.now = now;
    G.begin();
    ui.begin(now);
    if (!ready) { G.use(0); G.vgrad(0, 0, S.W, S.H, '#2f6a41', '#14341f', 20); G.text(S.W / 2, S.H / 2, 'Loading...', 22, '#fff6dc'); G.end(); return; }
    ui.updateFade(dt);
    S.ads.update(dt);
    governor(dt);
    const d = S.save.data;
    // logic
    if (SC.name === 'menu') SC.updateDemo(dt);
    if (SC.name === 'play') {
      P.update(dt, now);
      if (!SC.ov && P.mode === 'done') {
        if (P.result) { SC.openOverlay('complete', {}); }
        else { SC.noteFail(P.lv.id); SC.openOverlay('failed', {}); }
      }
    } else P.updateFx(dt);
    // draw
    switch (SC.name) {
      case 'menu': S.drawMenu(now); break;
      case 'map': S.drawMap(now); break;
      case 'intro': S.drawIntro(now); break;
      case 'settings': S.drawSettings(now); break;
      case 'skins': S.drawSkins(now); break;
      case 'play': S.drawWorldBg(S.worldIndex(P.lv.id), now); P.drawBoard(now); P.drawHud(now); break;
      default: break;
    }
    S.drawOverlay(now);
    ui.drawToast();
    ui.drawFade();
    G.end();
    // music: calm tune on menus, quieter while playing, silent on overlays that end an attempt
    const mode = SC.name === 'play' ? (P.mode === 'run' || P.mode === 'ready' ? 'play' : null) : 'menu';
    A.musicTick(SC.ov === 'complete' || SC.ov === 'failed' ? null : mode);
  }

  // ---------- input ----------
  function wireInput(scene) {
    const canvas = scene.game.canvas, touches = new Map();
    const toWorld = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * S.W / r.width, y: (e.clientY - r.top) * S.H / r.height }; };
    window.addEventListener('pointerdown', (e) => {
      A.unlock();
      const w = toWorld(e), b = ready && !ui.blocked() ? ui.hit(w.x, w.y) : null;
      const t = { x: e.clientX, y: e.clientY, moved: false, btn: b, downFired: false };
      if (b && b.down) { b.down(); t.downFired = true; }
      else if (b) { ui.pressed = b.id; ui.pressAt = now; }
      touches.set(e.pointerId, t);
    }, { passive: true });
    window.addEventListener('pointermove', (e) => {
      const t = touches.get(e.pointerId);
      if (!t) return;
      const dx = e.clientX - t.x, dy = e.clientY - t.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
      if (SC.name === 'play' && !SC.ov && P.active()) {            // swipe: turn right away, mid-gesture
        P.turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
        t.x = e.clientX; t.y = e.clientY; t.moved = true;
        if (ui.pressed) ui.pressed = null;
      } else if (Math.max(Math.abs(dx), Math.abs(dy)) > 26) { t.moved = true; if (ui.pressed) ui.pressed = null; }
    }, { passive: true });
    const end = (e, cancelled) => {
      const t = touches.get(e.pointerId);
      touches.delete(e.pointerId);
      ui.pressed = null;
      if (!t || cancelled || !ready || ui.blocked()) return;
      A.unlock();
      if (t.downFired) return;
      if (t.moved) return;
      const w = toWorld(e), b = ui.hit(w.x, w.y);
      if (b && t.btn && b.id === t.btn.id) {
        if (b.sound !== false) A.sfx.click();
        b.fn();
      } else if (!b && SC.name === 'play' && !SC.ov && P.active()) {
        P.tapTurn(w.x, w.y);
      }
    };
    window.addEventListener('pointerup', (e) => end(e, false));
    window.addEventListener('pointercancel', (e) => end(e, true));
    window.addEventListener('keydown', A.unlock, { once: true });

    // keyboard (desktop testing)
    const kb = scene.input.keyboard;
    if (kb) {
      const dirs = { UP: [0, -1], W: [0, -1], DOWN: [0, 1], S: [0, 1], LEFT: [-1, 0], A: [-1, 0], RIGHT: [1, 0], D: [1, 0] };
      Object.keys(dirs).forEach((k) => kb.on('keydown-' + k, () => { if (SC.name === 'play' && !SC.ov) P.turn(dirs[k]); }));
      kb.on('keydown-SPACE', () => { if (SC.name === 'play') { if (SC.ov === 'pause') { SC.closeOverlay(); P.resume(); } else if (!SC.ov) SC.pause(); } });
      kb.on('keydown-R', () => { if (SC.name === 'play' && !SC.ov) SC.beginPlay(P.lv.id); });
      kb.on('keydown-ESC', () => backAction());
    }

    // Pause and save when the app goes to the background.
    const away = () => {
      if (SC.name === 'play' && (P.mode === 'run' || P.mode === 'ready') && !SC.ov) SC.pause();
      else if (SC.name === 'play') { const a = P.snapshot(); if (a && P.mode === 'paused') S.save.data.attempt = a; S.save.write(); }
      else S.save.write();
      A.suspend();
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) away(); });
    window.addEventListener('pagehide', away);

    // Android back button (Capacitor/WebView): keep one history entry so the button reaches us first.
    try {
      history.pushState({ sfr: 1 }, '');
      window.addEventListener('popstate', () => {
        if (backAction()) history.pushState({ sfr: 1 }, '');
        else history.back();
      });
    } catch (e) { /* no history API */ }
  }
  // returns true when the game handled "back", false when the app may close
  function backAction() {
    if (!ready || ui.blocked()) return true;
    switch (SC.ov) {
      case 'pause': SC.closeOverlay(); P.resume(); return true;
      case 'tutorial': case 'confirm': SC.closeOverlay(); return true;
      case 'ad': S.ads.cancel(); return true;
      case 'complete': case 'failed': SC.go('map'); return true;
      default: break;
    }
    switch (SC.name) {
      case 'play': SC.pause(); return true;
      case 'intro': SC.go(SC.params.from === 'map' ? 'map' : 'menu'); return true;
      case 'map': case 'settings': SC.go('menu'); return true;
      case 'skins': if (SC.leaveSkins) SC.leaveSkins(SC.params.from || 'menu'); else SC.go('menu'); return true;
      default: return false;
    }
  }

  // ---------- start ----------
  function startGame() {
    if (window.snakeGame) return;
    S.save.init();
    chooseSize();
    SC.name = 'menu'; SC.t0 = 0;
    window.snakeGame = new Phaser.Game({
      type: /[?&]webgl=1/.test(location.search) ? Phaser.WEBGL : Phaser.CANVAS,
      parent: 'game', width: S.W * S.ZOOM, height: S.H * S.ZOOM, backgroundColor: '#0f1220',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true }, scene: Main
    });
  }
  try { Promise.all([document.fonts.load('500 20px Fredoka'), document.fonts.load('700 20px Fredoka')]).then(startGame, startGame); } catch (e) { startGame(); }
  setTimeout(startGame, 1500);

  // test hook (not used by the game itself)
  window.__sfr = S;
})(window.SFR);
