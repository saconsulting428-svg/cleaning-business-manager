import Phaser from 'phaser';
import { COLORS } from './theme.js';
import { T, fmt } from './text.js';

/** HUD pill: icon (texture key) + number that counts up/down smoothly. */
export class CurrencyPill extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, iconKey, value = 0, o = {}) {
    super(scene, x, y);
    this.w = w;
    this.shown = value;
    this.target = value;
    this.formatFn = o.format ?? fmt;
    const g = scene.add.graphics();
    g.fillStyle(COLORS.ink, 0.28).fillRoundedRect(-w / 2 + 2, -30, w, 64, 32);
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(-w / 2, -34, w, 66, 33);
    g.fillStyle(COLORS.boardFrame, 1).fillRoundedRect(-w / 2 + 5, -29, w - 10, 56, 28);
    g.fillStyle(COLORS.white, 0.12).fillRoundedRect(-w / 2 + 12, -26, w - 24, 16, 8);
    this.icon = scene.add.image(-w / 2 + 34, -2, iconKey).setScale(o.iconScale ?? 1);
    this.text = T(scene, w / 2 - 22, -2, (o.format ?? fmt)(value), 36, COLORS.white, { ox: 1 });
    this.add([g, this.icon, this.text]);
    scene.add.existing(this);
    this.setSize(w, 66);
  }

  render() { this.text.setText(this.format(Math.round(this.shown))); }
  format(n) { return this.formatFn(n); }

  setValue(v, animate = true) {
    this.target = v;
    this.scene.tweens.killTweensOf(this);
    if (!animate || Math.abs(v - this.shown) < 1) { this.shown = v; this.render(); return; }
    this.scene.tweens.add({ targets: this, shown: v, duration: 650, ease: 'Cubic.easeOut', onUpdate: () => this.render(), onComplete: () => { this.shown = v; this.render(); } });
  }

  /** little jump when something arrives */
  bump() {
    this.scene.tweens.add({ targets: this.icon, scale: { from: 1.35, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  }

  /** world position of the icon: target for coin-fly animations */
  iconPos() {
    const m = this.icon.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }
}
