// Home Haven 3D — Phaser keeps the puzzle scenes; the building world is now the Three.js scene (RENO.World).
(function () {
  class WorldScene extends Phaser.Scene {
    constructor() { super('World'); }
    create() { RENO.World.init(document.getElementById('reno3d')); RENO.World.start(); }
  }
  window.WorldScene = WorldScene;
})();
