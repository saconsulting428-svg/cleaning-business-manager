import Phaser from 'phaser';
import { COLORS } from './theme.js';
import { bakeTexture } from './draw.js';
import { T } from './text.js';

/** Red notification dot (optionally with a number) that gently pulses. */
export class Badge extends Phaser.GameObjects.Container {
  constructor(scene, x = 0, y = 0) {
    super(scene, x, y);
    bakeTexture(scene, 'badge_dot', 48, 48, (g) => {
      g.fillStyle(COLORS.ink, 1).fillCircle(24, 26, 20);
      g.fillStyle(COLORS.white, 1).fillCircle(24, 24, 18);
      g.fillStyle(COLORS.secondary, 1).fillCircle(24, 24, 13);
    });
    this.g = scene.add.image(0, 0, 'badge_dot');
    this.num = T(scene, 0, -1, '', 26, COLORS.white, { stroke: false });
    this.add([this.g, this.num]);
    this.setVisible(false);
    scene.add.existing(this);
    this.pulse = scene.tweens.add({ targets: this, scale: { from: 1, to: 1.18 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', paused: true });
  }

  /** set(false|0) hides, set(true) shows a dot, set(n>0) shows a number */
  set(value) {
    const show = !!value;
    this.num.setText(typeof value === 'number' && value > 0 ? String(Math.min(value, 9)) : '');
    if (show === this.visible) return this;
    this.setVisible(show);
    if (show) { this.pulse.resume(); this.setScale(1); } else this.pulse.pause();
    return this;
  }
}
