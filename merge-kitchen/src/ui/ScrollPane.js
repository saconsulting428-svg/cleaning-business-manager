import Phaser from 'phaser';
import { W } from './layout.js';

/**
 * Vertical drag-scroll list inside a popup. Add children to `pane.content` (origin = top-left of
 * the pane) and call setContentHeight(). Uses scene-level pointer events so interactive
 * children (tiles, buttons) keep working; children should ignore taps when pane.moved > 12.
 */
export class ScrollPane {
  constructor(scene, popup, { x, y, w, h }) {
    this.scene = scene;
    this.popup = popup;
    this.rect = { x, y, w, h };
    this.content = scene.add.container(x - w / 2, y - h / 2);
    popup.content.add(this.content);
    this.content.scrollPane = this; // Button.click() ignores taps on rows scrolled outside the visible window
    popup.content.sendToBack(this.content);
    this.scroll = 0;
    this.max = 0;
    this.moved = 0;
    this.dragging = false;
    this.maskGfx = null;

    // content stays hidden until the popup finished scaling in, then gets clipped by a world-space mask
    this.content.setAlpha(0);
    popup.whenOpen(() => {
      const r = this.worldRect();
      this.maskGfx = scene.make.graphics({ add: false });
      this.maskGfx.fillStyle(0xffffff, 1).fillRect(r.x, r.y, r.w, r.h);
      this.content.setMask(this.maskGfx.createGeometryMask());
      this.content.setAlpha(1);
    });

    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
    popup.once('destroy', () => {
      scene.input.off('pointerdown', this.down, this).off('pointermove', this.move, this).off('pointerup', this.up, this);
      this.maskGfx?.destroy();
    });
  }

  worldRect() {
    const p = this.popup.panel;
    return { x: p.x + this.rect.x - this.rect.w / 2, y: p.y + this.rect.y - this.rect.h / 2, w: this.rect.w, h: this.rect.h };
  }

  inside(p) {
    const r = this.worldRect();
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  setContentHeight(ch) {
    this.max = Math.max(0, ch - this.rect.h);
    this.apply(this.scroll);
  }

  apply(v) {
    this.scroll = Phaser.Math.Clamp(v, 0, this.max);
    this.content.y = this.rect.y - this.rect.h / 2 - this.scroll;
  }

  down(p) {
    if (!this.inside(p)) return;
    this.dragging = true;
    this.moved = 0;
    this.lastY = p.y;
    this.vel = 0;
    this.scene.tweens.killTweensOf(this);
  }

  move(p) {
    if (!this.dragging) return;
    const dy = p.y - this.lastY;
    this.lastY = p.y;
    this.moved += Math.abs(dy);
    this.vel = dy;
    if (this.moved > 8) this.apply(this.scroll - dy);
  }

  up() {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.moved > 12 && Math.abs(this.vel) > 3) {
      const target = Phaser.Math.Clamp(this.scroll - this.vel * 9, 0, this.max);
      this.scene.tweens.add({ targets: this, scroll: target, duration: 420, ease: 'Cubic.easeOut', onUpdate: () => this.apply(this.scroll) });
    }
    // keep `moved` until the tiles' pointerup handlers ran (they fire after this)
    this.scene.time.delayedCall(0, () => { this.moved = 0; });
  }

  get wasDrag() { return this.moved > 12; }
}
