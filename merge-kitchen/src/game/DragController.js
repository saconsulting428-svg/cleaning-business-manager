import Phaser from 'phaser';
import { COLORS, DEPTH } from '../ui/theme.js';
import { roundedBox } from '../ui/draw.js';
import { T, E } from '../ui/text.js';
import { SELL } from '../ui/layout.js';
import { ITEMS } from '../data/items.js';
import { t } from '../data/i18n.js';
import { haptic } from '../systems/Platform.js';

const LIFT = 44; // item floats above the finger so it stays visible

/** Sell/trash drop zone under the board */
export class SellZone {
  constructor(scene) {
    this.scene = scene;
    this.rect = new Phaser.Geom.Rectangle(SELL.x - SELL.w / 2 - 14, SELL.y - SELL.h / 2 - 16, SELL.w + 28, SELL.h + 32);
    this.c = scene.add.container(SELL.x, SELL.y).setDepth(DEPTH.board + 2);
    this.g = scene.add.graphics();
    this.icon = E(scene, -SELL.w / 2 + 42, -2, '🗑️', 46);
    this.label = T(scene, 34, -3, t('btn.sell'), 36, COLORS.white);
    this.c.add([this.g, this.icon, this.label]);
    this.draw(false);
  }

  draw(active) {
    this.g.clear();
    roundedBox(this.g, 0, 0, SELL.w, SELL.h, 30, active ? COLORS.secondary : COLORS.smoke, { lip: 6 });
  }

  /** while dragging an item show what it will sell for */
  arm(value) {
    this.label.setText(value ? t('sell.value', { n: value }) : t('btn.sell'));
    this.label.setFontSize(value ? 32 : 36);
    this.icon.setX(value ? -SELL.w / 2 + 36 : -SELL.w / 2 + 42);
    this.label.setX(value ? 28 : 34);
  }

  hover(on) {
    if (this.on === on) return;
    this.on = on;
    this.draw(on);
    this.scene.tweens.add({ targets: this.c, scale: on ? 1.12 : 1, duration: 120, ease: 'Back.easeOut' });
  }

  contains(x, y) { return this.rect.contains(x, y); }
}

/**
 * Custom drag & drop on the board. Drop targets: another cell (merge / swap / move),
 * a customer (serve) or the sell zone. Never blocks input - tweens are short.
 */
export class DragController {
  constructor(scene, app, board, customersView, sell) {
    this.scene = scene;
    this.app = app;
    this.board = board;
    this.customers = customersView;
    this.sell = sell;
    this.drag = null;
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('gameout', this.cancel, this);
    scene.events.once('shutdown', () => scene.input.off('pointerdown', this.onDown, this).off('pointermove', this.onMove, this).off('pointerup', this.onUp, this).off('gameout', this.cancel, this));
  }

  get blocked() { return this.app.state.uiBlocks > 0; }

  onDown(p) {
    if (this.blocked || this.drag) return;
    const idx = this.board.indexAt(p.x, p.y);
    if (idx < 0) return;
    const id = this.app.merge.board[idx];
    if (!id) return;
    const sprite = this.board.beginDrag(idx);
    if (!sprite) return;
    this.drag = { idx, id, sprite, moved: false, sx: p.x, sy: p.y };
    this.app.audio.play('click');
    haptic(6);
    sprite.setPosition(p.x, p.y - LIFT);
    this.sell.arm(this.app.merge.sellValue(id));
    this.customers?.highlightFor(id);
    this.app.state.bus.emit('drag:start', { idx, id });
  }

  onMove(p) {
    const d = this.drag;
    if (!d) return;
    d.moved = true;
    d.sprite.setPosition(p.x, p.y - LIFT);
    const cell = this.board.indexAt(d.sprite.x, d.sprite.y);
    this.board.setHover(cell >= 0 && cell !== d.idx ? cell : -1);
    this.sell.hover(this.sell.contains(p.x, p.y) || this.sell.contains(d.sprite.x, d.sprite.y));
  }

  cancel() {
    const d = this.drag;
    if (!d) return;
    this.finish(true);
  }

  finish(snap) {
    const d = this.drag;
    this.drag = null;
    this.board.endDrag(d.idx, snap);
    this.sell.hover(false);
    this.sell.arm(0);
    this.customers?.clearHighlight();
    this.app.state.bus.emit('drag:end');
  }

  onUp(p) {
    const d = this.drag;
    if (!d) return;
    const { merge, audio } = this.app;
    const ix = d.sprite.x, iy = d.sprite.y;

    // 1) sell zone
    if (this.sell.contains(p.x, p.y) || this.sell.contains(ix, iy)) {
      this.finish(false);
      const coins = merge.sell(d.idx);
      audio.play('coin');
      haptic(10);
      this.app.toast?.(t('toast.sold', { n: coins }));
      return;
    }
    // 2) customer
    const slot = this.customers ? (this.customers.slotAt(p.x, p.y) >= 0 ? this.customers.slotAt(p.x, p.y) : this.customers.slotAt(ix, iy)) : -1;
    if (slot >= 0) {
      const res = this.app.customers.serve(slot, d.idx);
      if (res.ok) {
        const to = this.customers.faceWorldPos(slot);
        this.finish(false);
        merge.consume(d.idx, 'serve', to);
        return;
      }
      haptic([20, 30, 20]);
      this.finish(true);
      return;
    }
    // 3) another cell
    const cell = this.board.indexAt(ix, iy);
    if (cell >= 0 && cell !== d.idx) {
      if (merge.canMerge(d.idx, cell)) {
        this.finish(false);
        merge.tryMerge(d.idx, cell);
        return;
      }
      if (!merge.board[cell]) {
        this.finish(false);
        merge.move(d.idx, cell);
        audio.play('click');
        return;
      }
      this.finish(false);
      merge.swap(d.idx, cell);
      audio.play('click');
      return;
    }
    this.finish(true);
  }
}
