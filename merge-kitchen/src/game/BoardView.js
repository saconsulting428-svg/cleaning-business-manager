import Phaser from 'phaser';
import { COLORS, DEPTH } from '../ui/theme.js';
import { boxImage } from '../ui/draw.js';
import { BOARD, BOTTOM, SELL, STRIP_Y, STRIP_X } from '../ui/layout.js';
import { itemTexture } from './textures.js';
import { ITEMS, fusionOf } from '../data/items.js';

const ITEM_SCALE = 0.94;

/** Renders the 6x6 grid and its item sprites; animates in response to MergeSystem events. */
export class BoardView {
  constructor(scene, app, fx) {
    this.scene = scene;
    this.app = app;
    this.fx = fx;
    this.merge = app.merge;
    this.sprites = new Array(BOARD.size).fill(null);
    this.glows = [];
    this.guide = new Map(); // idx -> pulsing glow for items a customer is waiting for
    this.dragging = -1;

    const cx = BOARD.x + (BOARD.cols * BOARD.cell) / 2, cy = BOARD.y + (BOARD.rows * BOARD.cell) / 2;
    boxImage(scene, BOARD.cols * BOARD.cell + 28, BOARD.rows * BOARD.cell + 28, 40, COLORS.boardFrame, { lip: 10, ow: 7, shine: false })
      .setPosition(cx, cy + 4).setDepth(DEPTH.board - 2);
    for (let i = 0; i < BOARD.size; i++) {
      const p = this.cellCenter(i);
      const parity = (i % BOARD.cols + Math.floor(i / BOARD.cols)) % 2;
      scene.add.image(p.x, p.y, parity ? 'cell_a' : 'cell_b').setDepth(DEPTH.board);
    }
    this.hover = scene.add.image(0, 0, 'cell_glow').setDepth(DEPTH.item - 1).setVisible(false);
    scene.tweens.add({ targets: this.hover, alpha: { from: 1, to: 0.55 }, duration: 260, yoyo: true, repeat: -1 });

    this.bind();
    this.syncAll();
  }

  cellCenter(i) {
    return { x: BOARD.x + (i % BOARD.cols) * BOARD.cell + BOARD.cell / 2, y: BOARD.y + Math.floor(i / BOARD.cols) * BOARD.cell + BOARD.cell / 2 };
  }

  indexAt(x, y) {
    const c = Math.floor((x - BOARD.x) / BOARD.cell), r = Math.floor((y - BOARD.y) / BOARD.cell);
    if (c < 0 || r < 0 || c >= BOARD.cols || r >= BOARD.rows) return -1;
    return r * BOARD.cols + c;
  }

  bind() {
    const bus = this.app.state.bus;
    const on = (ev, fn) => { bus.on(ev, fn, this); this.scene.events.once('shutdown', () => bus.off(ev, fn, this)); };
    on('board:spawn', this.onSpawn);
    on('board:merge', this.onMerge);
    on('board:move', this.onMove);
    on('board:swap', this.onSwap);
    on('board:remove', this.onRemove);
  }

  makeSprite(id, i) {
    const p = this.cellCenter(i);
    const s = this.scene.add.image(p.x, p.y, itemTexture(this.scene, id)).setDepth(DEPTH.item).setScale(ITEM_SCALE);
    s.itemId = id;
    return s;
  }

  syncAll() {
    this.sprites.forEach((s) => s?.destroy());
    this.sprites.fill(null);
    this.merge.board.forEach((id, i) => { if (id) this.sprites[i] = this.makeSprite(id, i); });
  }

  // ---- event handlers -----------------------------------------------------
  onSpawn({ idx, id, source }) {
    this.sprites[idx]?.destroy();
    const s = this.makeSprite(id, idx);
    this.sprites[idx] = s;
    const p = this.cellCenter(idx);
    if (source === 'button' || source === 'premium') {
      const from = source === 'premium' ? { x: STRIP_X.premium, y: STRIP_Y } : BOTTOM.spawn;
      s.setPosition(from.x, from.y).setScale(0.35);
      this.scene.tweens.add({ targets: s, x: p.x, y: p.y, duration: 340, ease: 'Cubic.easeOut' });
      this.scene.tweens.add({ targets: s, scale: ITEM_SCALE, duration: 340, ease: 'Back.easeOut', onComplete: () => this.fx.sparkle(p.x, p.y, 6, COLORS.white) });
    } else {
      s.setScale(0);
      this.scene.tweens.add({ targets: s, scale: ITEM_SCALE, duration: 320, ease: 'Back.easeOut', delay: source === 'bonus' ? 220 : 0 });
      this.fx.sparkle(p.x, p.y, 8, COLORS.white);
    }
  }

  onMerge({ from, to, id, tier }) {
    this.clearGuide();
    const src = this.sprites[from], dst = this.sprites[to];
    this.sprites[from] = null;
    const p = this.cellCenter(to);
    if (src) {
      this.scene.tweens.add({ targets: src, x: p.x, y: p.y, scale: 0.85, duration: 90, ease: 'Quad.easeIn', onComplete: () => src.destroy() });
    }
    this.scene.time.delayedCall(src ? 80 : 0, () => {
      dst?.destroy();
      const s = this.makeSprite(id, to);
      this.sprites[to] = s;
      s.setScale(ITEM_SCALE * 1.5);
      this.scene.tweens.add({ targets: s, scale: ITEM_SCALE, duration: 300, ease: 'Back.easeOut' });
      this.fx.pop(p.x, p.y);
      this.fx.sparkle(p.x, p.y, 10 + tier * 3);
    });
    this.clearHighlights();
  }

  clearGuide() { this.setGuide(new Set()); }

  onMove({ from, to }) {
    this.clearGuide();
    const s = this.sprites[from];
    this.sprites[from] = null;
    this.sprites[to] = s;
    if (!s) return;
    const p = this.cellCenter(to);
    this.scene.tweens.add({ targets: s, x: p.x, y: p.y, scale: ITEM_SCALE, duration: 140, ease: 'Back.easeOut' });
    s.setDepth(DEPTH.item);
  }

  onSwap({ a, b }) {
    this.clearGuide();
    const sa = this.sprites[a], sb = this.sprites[b];
    this.sprites[a] = sb; this.sprites[b] = sa;
    [[sa, b], [sb, a]].forEach(([s, i]) => {
      if (!s) return;
      const p = this.cellCenter(i);
      s.setDepth(DEPTH.item);
      this.scene.tweens.add({ targets: s, x: p.x, y: p.y, scale: ITEM_SCALE, duration: 160, ease: 'Back.easeOut' });
    });
  }

  onRemove({ idx, reason, to }) {
    this.clearGuide();
    const s = this.sprites[idx];
    this.sprites[idx] = null;
    if (!s) return;
    s.setDepth(DEPTH.drag);
    if (reason === 'sell') {
      this.scene.tweens.add({ targets: s, x: SELL.x, y: SELL.y, scale: 0.2, alpha: 0.2, duration: 220, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
    } else {
      const t = to || { x: s.x, y: s.y - 60 };
      this.scene.tweens.add({ targets: s, x: t.x, y: t.y, scale: 0.35, duration: 200, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
    }
  }

  // ---- drag support -------------------------------------------------------------
  beginDrag(i) {
    const s = this.sprites[i];
    if (!s) return null;
    this.dragging = i;
    this.scene.tweens.killTweensOf(s);
    s.setDepth(DEPTH.drag);
    this.scene.tweens.add({ targets: s, scale: ITEM_SCALE * 1.18, duration: 100, ease: 'Back.easeOut' });
    this.highlightMatches(i);
    return s;
  }

  endDrag(i, snapBack) {
    const s = this.sprites[i];
    this.dragging = -1;
    this.clearHighlights();
    this.setHover(-1);
    if (!s || !snapBack) return;
    const p = this.cellCenter(i);
    this.scene.tweens.add({ targets: s, x: p.x, y: p.y, scale: ITEM_SCALE, duration: 180, ease: 'Back.easeOut', onComplete: () => s.setDepth(DEPTH.item) });
  }

  /** Pulse a glow on every cell that holds a valid merge partner for cell i */
  highlightMatches(i) {
    this.clearHighlights();
    const id = this.merge.board[i];
    if (!id) return;
    this.merge.board.forEach((other, j) => {
      if (j === i || !other) return;
      if (other !== id ? !fusionOf(id, other) : !ITEMS[id].next) return; // same item (merge) or recipe partner (fusion)
      const p = this.cellCenter(j);
      const g = this.scene.add.image(p.x, p.y, 'cell_glow').setDepth(DEPTH.item - 1);
      if (other !== id) g.setTint(COLORS.gold); // fusion partners glow gold
      this.scene.tweens.add({ targets: g, scale: { from: 0.94, to: 1.1 }, alpha: { from: 1, to: 0.6 }, duration: 320, yoyo: true, repeat: -1 });
      this.glows.push(g);
    });
  }

  clearHighlights() {
    this.glows.forEach((g) => { this.scene.tweens.killTweensOf(g); g.destroy(); });
    this.glows.length = 0;
  }

  /** Pulse a gold glow under every item that a waiting customer ordered. wanted: Set of item ids */
  setGuide(wanted) {
    const want = new Set();
    this.merge.board.forEach((id, i) => { if (id && wanted.has(id) && i !== this.dragging) want.add(i); });
    for (const [i, g] of this.guide) {
      if (!want.has(i)) { this.scene.tweens.killTweensOf(g); g.destroy(); this.guide.delete(i); }
    }
    want.forEach((i) => {
      if (this.guide.has(i)) return;
      const p = this.cellCenter(i);
      const g = this.scene.add.image(p.x, p.y, 'cell_glow').setTint(COLORS.gold).setDepth(DEPTH.item - 1);
      this.scene.tweens.add({ targets: g, scale: { from: 0.92, to: 1.12 }, alpha: { from: 1, to: 0.55 }, duration: 420, yoyo: true, repeat: -1 });
      this.guide.set(i, g);
    });
  }

  setHover(i) {
    if (i < 0) { this.hover.setVisible(false); return; }
    const p = this.cellCenter(i);
    this.hover.setPosition(p.x, p.y).setVisible(true);
  }

  /** Small float of reward text over a cell */
  rewardAt(i, text, color = COLORS.gold) {
    const p = this.cellCenter(i);
    this.fx.float(p.x, p.y - 30, text, { color, size: 40 });
  }
}
