import Phaser from 'phaser';
import { COLORS, shade } from './theme.js';
import { boxImage, circleImage } from './draw.js';
import { T, E } from './text.js';
import { Badge } from './Badge.js';
import { haptic } from '../systems/Platform.js';

/**
 * Chunky 3D button. Press = scale 0.92, release = bouncy overshoot, plays click + haptic.
 * options: { w,h,r,color,shape:'pill'|'circle', label, icon, caption, fontSize, iconSize, onClick, hitPad, silent }
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, o = {}) {
    super(scene, x, y);
    this.o = { w: 260, h: 100, r: 30, color: COLORS.primary, shape: 'pill', fontSize: 44, iconSize: 52, hitPad: 8, ...o };
    this.enabled = true;
    this.onClick = o.onClick;
    this.face = null;
    this.iconText = null;
    this.labelText = null;
    this.captionText = null;
    this.badge = null;
    this.build();
    scene.add.existing(this);
    this.bindInput();
  }

  get app() { return this.scene.registry.get('app'); }

  build() {
    const { w, h, r, color, shape, label, icon, caption, fontSize, iconSize } = this.o;
    const c = this.enabled ? color : COLORS.locked;
    this.face?.destroy();
    this.face = shape === 'circle' ? circleImage(this.scene, w / 2, c) : boxImage(this.scene, w, h, r, c); // baked + cached
    this.addAt(this.face, 0);

    [this.iconText, this.labelText, this.captionText].forEach((t) => t && t.destroy());
    this.iconText = this.labelText = this.captionText = null;
    const nudge = shape === 'circle' ? -4 : -3; // face is lifted by the 3D lip

    if (caption) {
      // icon on top, caption below (bottom bar buttons)
      this.iconText = icon ? E(this.scene, 0, nudge - h * 0.12, icon, iconSize) : null;
      this.captionText = T(this.scene, 0, h * 0.27, caption, 32, COLORS.white);
      this.add([this.iconText, this.captionText].filter(Boolean));
    } else if (icon && label) {
      const lw = label.length * fontSize * 0.5;
      this.iconText = E(this.scene, -lw / 2 - 6, nudge, icon, iconSize);
      this.labelText = T(this.scene, iconSize / 2 + 2, nudge, label, fontSize, COLORS.white);
      this.add([this.iconText, this.labelText]);
    } else if (icon) {
      this.iconText = E(this.scene, 0, nudge, icon, iconSize);
      this.add(this.iconText);
    } else if (label) {
      this.labelText = T(this.scene, 0, nudge, label, fontSize, COLORS.white);
      this.add(this.labelText);
    }
    if (this.badge) this.bringToTop(this.badge);
    this.setSize(w, h);
  }

  bindInput() {
    const { w, h, hitPad, shape } = this.o;
    const hit = shape === 'circle'
      ? new Phaser.Geom.Circle(w / 2, h / 2, w / 2 + hitPad)
      : new Phaser.Geom.Rectangle(-hitPad, -hitPad, w + hitPad * 2, h + hitPad * 2);
    this.setInteractive(hit, shape === 'circle' ? Phaser.Geom.Circle.Contains : Phaser.Geom.Rectangle.Contains);
    this.pressed = false;
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({ targets: this, scale: 0.92 * (this.baseScale ?? 1), duration: 70, ease: 'Quad.easeOut' });
    });
    const release = (fire) => {
      if (!this.pressed) return;
      this.pressed = false;
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({ targets: this, scale: this.baseScale ?? 1, duration: 220, ease: 'Back.easeOut' });
      if (fire && this.enabled) this.click();
    };
    this.on('pointerup', () => release(true));
    this.on('pointerout', () => release(false));
  }

  click() {
    for (let p = this.parentContainer; p; p = p.parentContainer) {
      if (p.scrollPane && !p.scrollPane.inside(this.scene.input.activePointer)) return; // clipped by a scroll pane
    }
    if (!this.o.silent) { this.app?.audio.play('click'); haptic(8); }
    this.onClick?.(this);
  }

  setEnabled(v) {
    if (this.enabled === v) return this;
    this.enabled = v;
    this.build();
    return this;
  }
  setLabel(s) { this.o.label = s; this.build(); return this; }
  setIcon(s) { this.o.icon = s; this.build(); return this; }
  setCaption(s) {
    if (this.captionText && this.o.caption !== undefined) { this.o.caption = s; this.captionText.setText(s); } else { this.o.caption = s; this.build(); }
    return this;
  }
  setColor(c) { this.o.color = c; this.build(); return this; }

  /** Adds (once) and returns a red-dot Badge at the top-right corner */
  attachBadge() {
    if (!this.badge) {
      const { w, h, shape } = this.o;
      const off = shape === 'circle' ? w * 0.36 : 0;
      this.badge = new Badge(this.scene, w / 2 - 10 - (shape === 'circle' ? w * 0.14 : 0) + off * 0, -h / 2 + 10);
      this.add(this.badge);
    }
    return this.badge;
  }

  /** gentle attention-grabbing wobble */
  wiggle() {
    this.scene.tweens.add({ targets: this, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => this.setAngle(0) });
  }
}
