import Phaser from 'phaser';
import { COLORS, shade } from './theme.js';
import { T } from './text.js';

/** Rounded progress bar. setValue(0..1, animate). Optional centred label. */
export class ProgressBar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, o = {}) {
    super(scene, x, y);
    this.w = w; this.h = h;
    this.color = o.color ?? COLORS.energy;
    this.back = o.back ?? COLORS.smoke;
    this.value = o.value ?? 0;
    this.shown = this.value;
    this.g = scene.add.graphics();
    this.add(this.g);
    this.label = o.label !== false ? T(scene, 0, -1, '', o.fontSize ?? 28, COLORS.white) : null;
    if (this.label) this.add(this.label);
    this.draw();
    scene.add.existing(this);
  }

  draw() {
    const { w, h } = this;
    const g = this.g;
    g.clear();
    const r = h / 2;
    g.fillStyle(COLORS.ink, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.fillStyle(this.back, 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, r - 3);
    const fw = Math.max(0, (w - 8) * Phaser.Math.Clamp(this.shown, 0, 1));
    if (fw > 1) {
      const fr = Math.min(r - 3, fw / 2);
      g.fillStyle(shade(this.color, -0.25), 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, fw, h - 8, fr);
      g.fillStyle(this.color, 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, fw, (h - 8) * 0.72, fr);
      g.fillStyle(COLORS.white, 0.35).fillRoundedRect(-w / 2 + 8, -h / 2 + 6, Math.max(0, fw - 8), (h - 8) * 0.25, 3);
    }
  }

  setText(s) { if (this.label) this.label.setText(s); return this; }
  setColor(c) { this.color = c; this.draw(); return this; }

  setValue(v, animate = true) {
    v = Phaser.Math.Clamp(v, 0, 1);
    if (!animate && Math.abs(v - this.shown) < 0.004 && v > 0.004 && v < 0.996) return this;
    this.value = v;
    this.scene.tweens.killTweensOf(this);
    if (!animate || Math.abs(v - this.shown) < 0.002) { this.shown = v; this.draw(); return this; }
    this.scene.tweens.add({ targets: this, shown: v, duration: 300, ease: 'Quad.easeOut', onUpdate: () => this.draw() });
    return this;
  }
}
