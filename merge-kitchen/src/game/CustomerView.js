import Phaser from 'phaser';
import { COLORS, DEPTH, SHIRTS } from '../ui/theme.js';
import { boxImage, bakeTexture, roundedBox } from '../ui/draw.js';
import { T, E } from '../ui/text.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { SLOT_X, CUSTOMER } from '../ui/layout.js';
import { itemTexture } from './textures.js';
import { ITEMS, chainById } from '../data/items.js';
import { STAGES } from '../data/levels.js';
import { t, getLang } from '../data/i18n.js';

const FACES = ['🙂', '😀', '🙂', '😃', '🙂', '😄'];
const HATS = ['🎩', '🧢', '👒', '🎀', '👑', '🎓', ''];
const CHAR_DX = -34;

/** One customer: body, face, hat, order bubble and patience bar. Reacts, then destroys itself. */
class Avatar {
  constructor(scene, view, slot, c) {
    this.scene = scene;
    this.view = view;
    this.slot = slot;
    this.c = c;
    this.mood = '';
    this.done = false;
    const x = SLOT_X[slot];
    this.root = scene.add.container(x, 0).setDepth(DEPTH.customer);

    // body (shirt) + head + hat in one container so they bob together
    this.char = scene.add.container(CHAR_DX, 0);
    bakeTexture(scene, 'collar', 52, 42, (g) => {
      g.fillStyle(COLORS.white, 1).fillTriangle(4, 4, 48, 4, 26, 34);
      g.lineStyle(4, COLORS.ink, 1).strokeTriangle(4, 4, 48, 4, 26, 34);
    });
    const body = scene.add.container(0, 0, [
      boxImage(scene, 122, 100, 34, SHIRTS[c.look.shirt % SHIRTS.length], { lip: 6, ow: 5, shadow: false }).setPosition(0, CUSTOMER.headY + 78),
      scene.add.image(-26, CUSTOMER.headY + 32, 'collar').setOrigin(0, 0),
    ]);
    this.face = E(scene, 0, CUSTOMER.headY, FACES[c.look.face % FACES.length], 104);
    const hat = HATS[c.look.hat % HATS.length];
    this.hat = hat ? E(scene, 8, CUSTOMER.headY - 56, hat, 58).setAngle(-12) : null;
    this.char.add([body, this.face, ...(this.hat ? [this.hat] : [])]);
    this.root.add(this.char);

    // order bubble
    this.bubble = scene.add.container(CUSTOMER.bubbleDX, CUSTOMER.bubbleY);
    this.glow = scene.add.image(0, 0, 'glow').setTint(COLORS.energy).setScale(0.8).setAlpha(0);
    bakeTexture(scene, 'bubble', 140, 150, (g) => {
      g.fillStyle(COLORS.ink, 1).fillTriangle(70 - 32, 62 + 40, 70 - 50, 62 + 76, 70 - 6, 62 + 48);
      g.fillStyle(COLORS.white, 1).fillTriangle(70 - 30, 62 + 38, 70 - 44, 62 + 66, 70 - 10, 62 + 46);
      roundedBox(g, 70, 62, 108, 108, 30, COLORS.white, { lip: 5, ow: 5, shadow: false, shine: false });
    });
    const bg = scene.add.image(0, 0, 'bubble').setOrigin(70 / 140, 62 / 150);
    this.item = scene.add.image(0, -2, itemTexture(scene, c.order)).setScale(0.8);
    bakeTexture(scene, 'bubble_check', 60, 60, (g) => {
      g.fillStyle(COLORS.ink, 1).fillCircle(30, 30, 22);
      g.fillStyle(COLORS.energy, 1).fillCircle(30, 30, 17);
      g.lineStyle(6, COLORS.white, 1).beginPath().moveTo(22, 30).lineTo(28, 37).lineTo(39, 22).strokePath();
    });
    this.check = scene.add.image(44, -44, 'bubble_check').setVisible(false);
    // small "how do I get this?" hint chip under the bubble, e.g. 🥔 ➜ 🍟
    this.hintChip = scene.add.container(CUSTOMER.bubbleDX + 34, CUSTOMER.bubbleY + 80).setVisible(false);
    this.hintText = T(scene, 0, -2, '', 34, COLORS.white);
    this.hintChip.add([boxImage(scene, 168, 50, 22, COLORS.boardFrame, { lip: 4, ow: 4, shine: false, shadow: false }), this.hintText]);
    this.root.add(this.hintChip);
    this.bubble.add([this.glow, bg, this.item, this.check]);
    this.root.add(this.bubble);

    // patience bar sits on the counter face (above the counter in depth)
    this.bar = new ProgressBar(scene, x, CUSTOMER.barY, 190, 28, { color: COLORS.energy, label: false, value: 1 }).setDepth(DEPTH.counter + 12);

    this.enter();
  }

  enter() {
    const s = this.scene;
    this.char.setScale(0.2).setAlpha(0).y = 70;
    this.bubble.setScale(0);
    this.bar.setAlpha(0);
    s.tweens.add({ targets: this.char, scale: 1, alpha: 1, y: 0, duration: 380, ease: 'Back.easeOut' });
    s.tweens.add({ targets: this.bubble, scale: 1, duration: 320, delay: 260, ease: 'Back.easeOut' });
    s.tweens.add({ targets: this.bar, alpha: 1, duration: 260, delay: 200 });
    this.startIdle(380);
  }

  startIdle(delay = 0) {
    this.idle = this.scene.tweens.add({ targets: this.char, y: -6, duration: 900 + this.slot * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay });
  }

  stopIdle() { this.idle?.stop(); this.scene.tweens.killTweensOf(this.char); this.char.setPosition(CHAR_DX, 0).setAngle(0).setScale(1); }

  setFace(emoji) { if (this.mood !== emoji) { this.mood = emoji; this.face.setText(emoji); } }

  /** called every frame while waiting */
  update(ratio) {
    if (this.done) return;
    this.bar.setValue(ratio, false);
    this.bar.setColor(ratio > 0.5 ? COLORS.energy : ratio > 0.25 ? COLORS.gold : COLORS.secondary);
    if (ratio < 0.25) this.setFace('😟'); else if (ratio < 0.5) this.setFace('😐'); else this.setFace(FACES[this.c.look.face % FACES.length]);
    if (ratio < 0.25 && !this.worried) {
      this.worried = true;
      this.scene.tweens.add({ targets: this.char, angle: { from: -3, to: 3 }, duration: 110, yoyo: true, repeat: -1 });
    }
  }

  setReady(ready) {
    if (this.ready === ready) return;
    this.ready = ready;
    this.check.setVisible(ready);
    if (ready) this.scene.tweens.add({ targets: this.check, scale: { from: 0.2, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  }

  setHint(text) {
    this.hintChip.setVisible(!!text);
    if (text) this.hintText.setText(text);
  }

  highlight(on) {
    this.scene.tweens.killTweensOf(this.glow);
    this.scene.tweens.killTweensOf(this.bubble);
    if (on) {
      this.glow.setAlpha(1);
      this.scene.tweens.add({ targets: this.bubble, scale: { from: 1, to: 1.14 }, duration: 260, yoyo: true, repeat: -1 });
    } else { this.glow.setAlpha(0); this.bubble.setScale(1); }
  }

  /** Wrong dish: shock + shake */
  shock() {
    this.stopIdle();
    this.worried = false;
    this.setFace('😱');
    this.scene.tweens.add({ targets: this.char, x: { from: CHAR_DX - 12, to: CHAR_DX + 12 }, duration: 55, yoyo: true, repeat: 5, onComplete: () => { this.char.x = CHAR_DX; if (!this.done) { this.mood = ''; this.startIdle(); } } });
    this.view.fx.float(SLOT_X[this.slot] + CHAR_DX, CUSTOMER.headY - 90, '❓', { size: 60, color: COLORS.white });
  }

  /** Served: happy dance, then leave */
  happy() {
    this.done = true;
    this.stopIdle();
    this.bar.destroy();
    this.setFace('😍');
    this.bubble.setVisible(false);
    const s = this.scene;
    s.tweens.add({ targets: this.char, y: -34, angle: { from: -8, to: 8 }, duration: 170, yoyo: true, repeat: 3, ease: 'Quad.easeOut' });
    this.view.fx.float(SLOT_X[this.slot] + CHAR_DX, CUSTOMER.headY - 80, '❤️', { size: 56, color: COLORS.white, dy: -70 });
    this.view.fx.sparkle(SLOT_X[this.slot] + CHAR_DX, CUSTOMER.headY, 14, COLORS.gold);
    s.tweens.add({ targets: this.root, alpha: 0, scale: 0.9, duration: 260, delay: 850, ease: 'Quad.easeIn', onComplete: () => this.destroy() });
  }

  /** Ran out of patience: funny angry exit */
  angry() {
    this.done = true;
    this.stopIdle();
    this.bar.destroy();
    this.setFace('😡');
    this.bubble.setVisible(false);
    const s = this.scene;
    this.view.fx.float(SLOT_X[this.slot] + CHAR_DX + 40, CUSTOMER.headY - 90, '💢', { size: 62, color: COLORS.white, dy: -40 });
    this.view.fx.float(SLOT_X[this.slot] + CHAR_DX, CUSTOMER.headY - 150, t('customer.angry'), { size: 40, color: COLORS.secondary, dy: -30 });
    s.tweens.add({ targets: this.char, x: { from: CHAR_DX - 10, to: CHAR_DX + 10 }, duration: 50, yoyo: true, repeat: 7 });
    const dir = this.slot === 0 ? -1 : 1;
    s.tweens.add({ targets: this.root, x: this.root.x + dir * 260, angle: dir * 6, alpha: 0, duration: 420, delay: 520, ease: 'Quad.easeIn', onComplete: () => this.destroy() });
  }

  vanish() {
    this.done = true;
    this.bar.destroy();
    this.scene.tweens.add({ targets: this.root, alpha: 0, duration: 200, onComplete: () => this.destroy() });
  }

  destroy() {
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.killTweensOf(this.char);
    this.root.destroy();
    this.bar?.destroy();
  }
}

/** Manages the customer row: avatars, locked-slot signs, drop hit-testing and highlights. */
export class CustomersView {
  constructor(scene, app, fx) {
    this.scene = scene;
    this.app = app;
    this.fx = fx;
    this.avatars = [null, null, null];
    this.board = null; // set by GameScene (guide glows on the board)
    this.locks = [];
    this.readyTimer = 0;
    this.buildLocks();

    const bus = app.state.bus;
    const on = (ev, fn) => { bus.on(ev, fn, this); scene.events.once('shutdown', () => bus.off(ev, fn, this)); };
    on('customer:spawn', ({ slot, c }) => { this.avatars[slot]?.destroy(); this.avatars[slot] = new Avatar(scene, this, slot, c); });
    on('customer:served', ({ slot }) => { this.avatars[slot]?.happy(); this.avatars[slot] = null; });
    on('customer:left', ({ slot }) => { this.avatars[slot]?.angry(); this.avatars[slot] = null; });
    on('customer:wrong', ({ slot }) => this.avatars[slot]?.shock());
    on('customer:clear', () => { this.avatars.forEach((a) => a?.vanish()); this.avatars.fill(null); this.buildLocks(); });
    on('levelup', () => this.buildLocks());

    // restore avatars for customers that are already waiting (scene re-entered from the menu)
    app.customers.slots.forEach((c, i) => { if (c) this.avatars[i] = new Avatar(scene, this, i, c); });
  }

  /** padlock signs for counter slots the current restaurant stage has not unlocked yet */
  buildLocks() {
    this.locks.forEach((l) => l.destroy());
    this.locks = [];
    const max = this.app.customers.maxSlots();
    for (let i = max; i < 3; i++) {
      const stage = STAGES.find((s) => s.maxCustomers > i);
      const c = this.scene.add.container(SLOT_X[i], 290).setDepth(DEPTH.customer);
      c.add([E(this.scene, 0, -34, '🔒', 76), T(this.scene, 0, 36, t('lock.stage', { name: stage ? (stage.name[getLang()] ?? stage.name.en) : '' }), 32, COLORS.white, { wrap: 200 })]);
      c.setAlpha(0.85);
      this.locks.push(c);
    }
  }

  slotAt(x, y) {
    for (let i = 0; i < 3; i++) {
      if (!this.avatars[i] || this.avatars[i].done) continue;
      if (Math.abs(x - SLOT_X[i]) < 116 && y > 170 && y < CUSTOMER.counterY + 70) return i;
    }
    return -1;
  }

  faceWorldPos(slot) { return { x: SLOT_X[slot] + CHAR_DX, y: CUSTOMER.headY }; }

  /** Emoji hint for an order that is not on the board yet: best ingredient you have ➜ the dish */
  hintFor(orderId) {
    const def = ITEMS[orderId];
    if (def.fusion) return `${ITEMS[def.fusion[0]].emoji}+${ITEMS[def.fusion[1]].emoji}`; // fusion recipe: show the two parents
    const chain = chainById(def.chain);
    let best = null;
    for (const tr of chain.tiers) {
      if (ITEMS[tr.id].tier >= def.tier) break;
      if (this.app.merge.has(tr.id)) best = tr; // highest tier of this line already on the board
    }
    return `${best ? best.emoji : '🧺'}➜${def.emoji}`;
  }

  /** pulse every bubble that wants `itemId` while it is being dragged */
  highlightFor(itemId) {
    this.avatars.forEach((a) => a && !a.done && a.highlight(a.c.order === itemId));
  }
  clearHighlight() { this.avatars.forEach((a) => a?.highlight(false)); }

  update(now) {
    const sys = this.app.customers;
    this.readyTimer -= 1;
    const checkReady = this.readyTimer <= 0;
    if (checkReady) this.readyTimer = 12;
    const wanted = new Set();
    this.avatars.forEach((a, i) => {
      if (!a || a.done) return;
      a.update(sys.patienceLeft(i, now));
      if (checkReady) {
        const have = this.app.merge.has(a.c.order);
        a.setReady(have);
        a.setHint(have ? '' : this.hintFor(a.c.order));
        if (have) wanted.add(a.c.order);
      }
    });
    if (checkReady) this.board?.setGuide(wanted);
  }
}
