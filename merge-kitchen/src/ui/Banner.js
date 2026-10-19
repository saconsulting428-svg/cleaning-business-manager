import Phaser from 'phaser';
import { COLORS, DEPTH } from './theme.js';
import { roundedBox } from './draw.js';
import { T, E } from './text.js';
import { W } from './layout.js';

/**
 * Event banner that slides in from the side (Lunch/Dinner Rush, combo...).
 * show({ title, sub, icon, color, hold }) -> container
 */
export class Banner {
  constructor(scene, y = 262) {
    this.scene = scene;
    this.y = y;
    this.current = null;
  }

  show({ title, sub, icon = '🔥', color = COLORS.secondary, hold = 2600, y = this.y } = {}) {
    const s = this.scene;
    if (this.current) { s.tweens.killTweensOf(this.current); this.current.destroy(); }
    const c = s.add.container(W + 420, y).setDepth(DEPTH.toast);
    const g = s.add.graphics();
    roundedBox(g, 0, 0, 640, sub ? 176 : 112, 36, color);
    c.add(g);
    c.add(E(s, -250, -2, icon, 70));
    c.add(T(s, 28, sub ? -40 : 0, title, 52, COLORS.white, { wrap: 440 }));
    if (sub) c.add(T(s, 28, 22, sub, 32, COLORS.cream2, { wrap: 440 }));
    this.current = c;
    s.tweens.add({ targets: c, x: W / 2, duration: 380, ease: 'Back.easeOut' });
    s.tweens.add({
      targets: c, x: -420, duration: 320, delay: hold, ease: 'Quad.easeIn',
      onComplete: () => { c.destroy(); if (this.current === c) this.current = null; },
    });
    return c;
  }
}
