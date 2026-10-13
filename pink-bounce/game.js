/* Pink Bounce: Survival - bootstrap and global controls (pause, restart, mute, focus handling). */
(function () {
  'use strict';
  const C = PB.CFG;
  const $ = (id) => document.getElementById(id);

  PB.UI.init();
  PB.UI.setMenuBest(PB.loadBest());

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: C.W,
    height: C.H,
    backgroundColor: '#07030f',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, fps: 120, debug: false } },
    input: { activePointers: 3, keyboard: true },
    audio: { noAudio: true },          // sounds are synthesised in js/audio.js
    disableContextMenu: true,
    render: { antialias: true, roundPixels: false },
    scene: [PB.BootScene, PB.MenuScene, PB.GameScene]
  });
  PB.game = game;

  const gameScene = () => game.scene.getScene('Game');
  const inRun = () => PB.mode === 'playing' || PB.mode === 'paused';

  /* ---------------- flow ---------------- */
  PB.start = function () {
    PB.Audio.unlock();
    PB.UI.hideAll();
    PB.UI.setPaused(false);
    if (game.scene.isActive('Menu') || game.scene.isPaused('Menu')) game.scene.stop('Menu');
    const gs = gameScene();
    if (gs && (game.scene.isActive('Game') || game.scene.isPaused('Game'))) {
      if (game.scene.isPaused('Game')) game.scene.resume('Game');
      gs.scene.restart();                       // full re-create: no stale timers/listeners
    } else {
      game.scene.start('Game');
    }
  };

  PB.toMenu = function () {
    if (game.scene.isActive('Game') || game.scene.isPaused('Game')) game.scene.stop('Game');
    PB.UI.reset(); PB.UI.setPaused(false);
    PB.UI.setMenuBest(PB.loadBest());
    game.scene.start('Menu');
  };

  PB.pause = function () {
    if (PB.mode !== 'playing' || !game.scene.isActive('Game')) return;
    game.scene.pause('Game');
    PB.setMode('paused');
    PB.UI.showOnly('pause'); PB.UI.setPaused(true);
    PB.Audio.play('pause');
    const gs = gameScene(); if (gs) PB.saveBest(gs.best);
    setTimeout(() => { const b = $('btn-resume'); if (b && PB.mode === 'paused') b.focus(); }, 30);
  };

  PB.resume = function () {
    if (PB.mode !== 'paused') return;
    game.scene.resume('Game');
    PB.setMode('playing');
    PB.UI.hideAll(); PB.UI.setPaused(false);
    PB.Audio.unlock(); PB.Audio.play('pause');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  };

  PB.togglePause = function () { PB.mode === 'paused' ? PB.resume() : PB.pause(); };

  PB.toggleMute = function () {
    PB.Audio.unlock();
    PB.Audio.setMuted(!PB.Audio.isMuted());
    PB.UI.refreshMute();
  };

  /* ---------------- buttons ---------------- */
  const on = (id, fn) => $(id).addEventListener('click', (e) => { e.currentTarget.blur(); fn(); });
  on('btn-play', PB.start);
  on('btn-replay', PB.start);
  on('btn-resume', PB.resume);
  on('btn-pause', () => { if (inRun()) PB.togglePause(); });
  on('btn-restart', () => { if (inRun() || PB.mode === 'over') PB.start(); });
  on('btn-pause-restart', PB.start);
  on('btn-pause-menu', PB.toMenu);
  on('btn-over-menu', PB.toMenu);
  on('btn-mute', PB.toggleMute);

  /* ---------------- keyboard shortcuts (one listener, registered once) ---------------- */
  window.addEventListener('keydown', (e) => {
    PB.Audio.unlock();
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'p' || k === 'P' || k === 'Escape') { if (inRun()) { e.preventDefault(); PB.togglePause(); } }
    else if (k === 'r' || k === 'R') { if (inRun() || PB.mode === 'over') { e.preventDefault(); PB.start(); } }
    else if (k === 'm' || k === 'M') { PB.toggleMute(); }
    else if ((k === 'Enter' || k === ' ') && e.target.tagName !== 'BUTTON') {
      if (PB.mode === 'menu' || PB.mode === 'over') { e.preventDefault(); PB.start(); }
      else if (PB.mode === 'paused') { e.preventDefault(); PB.resume(); }
    }
  });
  window.addEventListener('pointerdown', () => PB.Audio.unlock(), { passive: true });

  /* ---------------- focus loss / tab hidden -> auto pause ---------------- */
  document.addEventListener('visibilitychange', () => { if (document.hidden) PB.pause(); });
  window.addEventListener('blur', () => PB.pause());
  window.addEventListener('pagehide', () => { const gs = gameScene(); if (gs && gs.best) PB.saveBest(gs.best); });

  /* ---------------- resize (mobile browser chrome / orientation) ---------------- */
  const refresh = () => requestAnimationFrame(() => game.scale.refresh());
  window.addEventListener('orientationchange', refresh);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refresh);
})();
