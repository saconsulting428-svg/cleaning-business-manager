/* ============================================================
   main.js — boot. Load order (see index.html):
   util → storage → data → audio → ads → chars → world → entities → game → ui → main
   ============================================================ */
(function () {
  'use strict';
  const G = window.G;
  G.World.init(document.getElementById('c').getContext('2d'));
  G.Game.boot();
  G.UI.init();
  // browsers only allow audio after a user gesture
  const unlock = () => { G.Audio.init(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => window.addEventListener(e, unlock, { passive: true }));
  // Android (Capacitor): hardware Back button = pause / close panel / go back / exit
  const cap = window.Capacitor, App = cap && cap.Plugins && cap.Plugins.App;
  if (App && App.addListener) App.addListener('backButton', () => {
    const st = G.Game.state, $ = id => document.getElementById(id);
    if ($('adov').classList.contains('show')) return;
    for (const id of ['buy', 'lvl', 'epick']) if ($(id).classList.contains('show')) { $(id).classList.remove('show'); return; }
    if (st === 'PLAY') return G.Game.pause();
    if (st === 'PAUSE') return G.Game.resume();
    if (st === 'OVER' || st === 'WINSHOW' || st === 'WIN') return G.Game.toMenu();
    if (G.UI.subOpen()) return G.UI.back();
    if (App.exitApp) App.exitApp();
  });
  if (location.hash === '#debug') window.__ascend = G;
})();
