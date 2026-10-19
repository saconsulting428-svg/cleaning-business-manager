import Phaser from 'phaser';
import { COLORS, shade } from './theme.js';
import { bakeTexture } from './draw.js';
import { T } from './text.js';

/**
 * Rounded progress bar built from baked textures (no per-frame Graphics work):
 * a cached track image + a 9-slice fill that is stretched to the value.
 * setValue(0..1, animate). Optional centred label.
 */
export class ProgressBar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, o = {}) {
    super(scene, x, y);
    this.w = w; this.h = h;
    this.fh = h - 8; // fill height
    this.color = o.color ?? COLORS.energy;
    this.back = o.back ?? COLORS.smoke;
    this.value = o.value ?? 0;
    this.shown = this.value;

    const r = h / 2;
    const backKey = bakeTexture(scene, `pbar:${w}x${h}:${this.back}`, w, h, (g) => {
      g.fillStyle(COLORS.ink, 1).fillRoundedRect(0, 0, w, h, r);
      g.fillStyle(this.back, 1).fillRoundedRect(4, 4, w - 8, h - 8, r - 3);
    });
    this.track = scene.add.image(0, 0, backKey);
    this.add(this.track);
    this.buildFill();
    this.label = o.label !== false ? T(scene, 0, -1, '', o.fontSize ?? 28, COLORS.white) : null;
    if (this.label) this.add(this.label);
    this.draw();
    scene.add.existing(this);
  }

  buildFill() {
    const { fh, color, scene } = this;
    const key = bakeTexture(scene, `pfill:${fh}:${color}`, fh * 2, fh, (g) => {
      const r = fh / 2;
      g.fillStyle(shade(color, -0.25), 1).fillRoundedRect(0, 0, fh * 2, fh, r);
      g.fillStyle(color, 1).fillRoundedRect(0, 0, fh * 2, fh * 0.72, r);
      g.fillStyle(COLORS.white, 0.35).fillRoundedRect(r * 0.5, 2, fh * 2 - r, fh * 0.22, 3);
    });
    this.fill?.destroy();
    const half = Math.floor(fh / 2);
    this.fill = scene.add.nineslice(-this.w / 2 + 4, 0, key, undefined, fh, fh, half, half, 0, 0).setOrigin(0, 0.5);
    this.addAt(this.fill, 1);
  }

  draw() {
    const fw = (this.w - 8) * Phaser.Math.Clamp(this.shown, 0, 1);
    this.fill.setVisible(fw > 1);
    if (fw > 1) this.fill.setSize(Math.max(this.fh, fw), this.fh);
  }

  setText(s) { if (this.label) this.label.setText(s); return this; }
  setColor(c) { if (c !== this.color) { this.color = c; this.buildFill(); this.draw(); } return this; }

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
