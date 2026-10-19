import Phaser from 'phaser';
import { COLORS, DEPTH } from './theme.js';
import { roundedBox } from './draw.js';
import { T } from './text.js';
import { W } from './layout.js';

/** Small slide-in message. Only one at a time: a new toast replaces the old. */
export class Toast {
  constructor(scene, y = 205) {
    this.scene = scene;
    this.y = y;
    this.current = null;
  }

  show(text, o = {}) {
    const s = this.scene;
    if (this.current) { s.tweens.killTweensOf(this.current); this.current.destroy(); }
    const label = T(s, 0, -3, text, 34, o.color ?? COLORS.white, { wrap: 560 });
    const w = Math.min(640, Math.max(260, label.width + 70));
    const h = Math.max(78, label.height + 34);
    const c = s.add.container(W / 2, this.y - 90).setDepth(DEPTH.toast).setAlpha(0);
    const g = s.add.graphics();
    roundedBox(g, 0, 0, w, h, 30, o.bg ?? COLORS.boardFrame, { lip: 6 });
    c.add([g, label]);
    this.current = c;
    s.tweens.add({ targets: c, y: this.y, alpha: 1, duration: 240, ease: 'Back.easeOut' });
    s.tweens.add({
      targets: c, y: this.y - 50, alpha: 0, duration: 260, delay: o.duration ?? 1700, ease: 'Quad.easeIn',
      onComplete: () => { c.destroy(); if (this.current === c) this.current = null; },
    });
    return c;
  }
}
