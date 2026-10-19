import Phaser from 'phaser';
import { COLORS, DEPTH, TIER_COLORS, SHIRTS } from './theme.js';
import { T } from './text.js';
import { W, H } from './layout.js';

/** Juice helpers: sparkles, floating text, confetti, flying coins. One instance per scene. */
export class FX {
  constructor(scene) {
    this.scene = scene;
    this.spark = scene.add.particles(0, 0, 'spark', {
      emitting: false,
      lifespan: { min: 380, max: 650 },
      speed: { min: 110, max: 330 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.95, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 420,
      rotate: { min: 0, max: 360 },
    }).setDepth(DEPTH.fx);
  }

  sparkle(x, y, count = 14, tint = COLORS.gold) {
    this.spark.setParticleTint(tint);
    this.spark.explode(count, x, y);
  }

  /** expanding ring + flash for merges */
  pop(x, y, tint = COLORS.white) {
    const s = this.scene;
    const glow = s.add.image(x, y, 'glow').setTint(tint).setDepth(DEPTH.fx).setScale(0.3).setAlpha(0.9);
    s.tweens.add({ targets: glow, scale: 1.3, alpha: 0, duration: 340, ease: 'Quad.easeOut', onComplete: () => glow.destroy() });
  }

  /** floating text that rises and fades */
  float(x, y, text, { color = COLORS.gold, size = 44, dy = -90, dur = 850, delay = 0 } = {}) {
    const t = T(this.scene, x, y, text, size, color).setDepth(DEPTH.fx + 1).setAlpha(0).setScale(0.6);
    this.scene.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 160, delay, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t, y: y + dy, alpha: 0, duration: dur, delay: delay + 120, ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
    return t;
  }

  /** coins burst then fly into the HUD pill; onArrive fires on first landing */
  coinsFly(x, y, to, n = 6, onArrive, key = 'ico_coin') {
    const s = this.scene;
    let arrived = false;
    for (let i = 0; i < n; i++) {
      const c = s.add.image(x, y, key).setScale(0.7).setDepth(DEPTH.fx + 2);
      const ox = x + Phaser.Math.Between(-60, 60), oy = y + Phaser.Math.Between(-60, 30);
      s.tweens.add({
        targets: c, x: ox, y: oy, duration: 160, ease: 'Quad.easeOut', delay: i * 22,
        onComplete: () => s.tweens.add({
          targets: c, x: to.x, y: to.y, scale: 0.55, duration: 420, ease: 'Quad.easeIn',
          onComplete: () => { c.destroy(); if (!arrived) { arrived = true; onArrive?.(); } },
        }),
      });
    }
  }

  /** confetti shower over the whole screen */
  confetti(count = 70, y = -20) {
    const s = this.scene;
    const palette = [...TIER_COLORS, ...SHIRTS];
    for (let i = 0; i < count; i++) {
      const p = s.add.image(Phaser.Math.Between(0, W), y - Phaser.Math.Between(0, 200), 'confetti')
        .setTint(Phaser.Utils.Array.GetRandom(palette)).setDepth(DEPTH.top).setScale(Phaser.Math.FloatBetween(0.8, 1.6)).setAngle(Phaser.Math.Between(0, 360));
      s.tweens.add({
        targets: p, y: H + 60, x: p.x + Phaser.Math.Between(-140, 140), angle: p.angle + Phaser.Math.Between(-540, 540),
        duration: Phaser.Math.Between(1400, 2600), delay: Phaser.Math.Between(0, 500), ease: 'Sine.easeIn',
        onComplete: () => p.destroy(),
      });
    }
  }

  /** big pop-in text in the middle of the screen (COMBO x3!) */
  bigText(text, y = 640, color = COLORS.gold) {
    const t = T(this.scene, W / 2, y, text, 96, color).setDepth(DEPTH.top).setScale(0.3).setAngle(-8);
    this.scene.tweens.add({ targets: t, scale: 1, angle: 0, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, alpha: 0, y: y - 80, duration: 380, delay: 620, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }
}
