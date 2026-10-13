/* Boot (texture generation) and Menu (attract mode) scenes. */
(function () {
  const C = PB.CFG;

  class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'Boot' }); }
    create() {
      PB.makeTextures(this.game);
      PB.applyThemeCss();
      this.scene.start('Menu');
    }
  }

  class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'Menu' }); }

    create() {
      PB.addBackground(this);
      PB.setMode('menu');
      PB.UI.showOnly('menu');
      PB.UI.renderHome();

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < C.GRID_COLS; c++) {
          if ((c + r) % 5 === 4) continue;
          this.add.image(C.GRID_X + c * C.CELL_W + C.CELL_W / 2, 90 + r * C.CELL_H, 'blk_n' + (r % 4)).setAlpha(0.4).setDepth(1);
        }
      }
      this.trail = this.add.graphics().setDepth(2);
      this.balls = [];
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2, s = 170 + Math.random() * 90;
        const img = this.add.image(60 + Math.random() * 420, 300 + Math.random() * 300, i === 4 ? 'ball_fire' : 'ball_' + PB.skin().id).setDepth(3);
        this.balls.push({ img, vx: Math.cos(a) * s, vy: Math.sin(a) * s || 120, hist: [] });
      }
    }

    update(time, delta) {
      const dt = Math.min(delta, 50) / 1000;
      this.gridSprite.tilePositionY -= dt * 14;
      const g = this.trail; g.clear();
      this.balls.forEach((b) => {
        const im = b.img;
        im.x += b.vx * dt; im.y += b.vy * dt;
        if (im.x < 12) { im.x = 12; b.vx = Math.abs(b.vx); }
        if (im.x > C.W - 12) { im.x = C.W - 12; b.vx = -Math.abs(b.vx); }
        if (im.y < 12) { im.y = 12; b.vy = Math.abs(b.vy); }
        if (im.y > C.H - 140) { im.y = C.H - 140; b.vy = -Math.abs(b.vy); }
        b.hist.push(im.x, im.y); if (b.hist.length > 24) b.hist.splice(0, 2);
        const n = b.hist.length / 2;
        for (let i = 0; i < n; i++) {
          g.fillStyle(PB.skin().trail, (i / n) * 0.35);
          g.fillCircle(b.hist[i * 2], b.hist[i * 2 + 1], 3 + (i / n) * 5);
        }
      });
    }
  }

  PB.BootScene = BootScene;
  PB.MenuScene = MenuScene;
})();
