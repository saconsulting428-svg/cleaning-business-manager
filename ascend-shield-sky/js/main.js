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
  if (location.hash === '#debug') window.__ascend = G;
})();
