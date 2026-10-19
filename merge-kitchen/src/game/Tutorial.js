import { COLORS, DEPTH } from '../ui/theme.js';
import { boxImage } from '../ui/draw.js';
import { T, E } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { BOARD, BOTTOM, SLOT_X, CUSTOMER } from '../ui/layout.js';
import { t } from '../data/i18n.js';

const cellPos = (i) => ({ x: BOARD.x + (i % BOARD.cols) * BOARD.cell + BOARD.cell / 2, y: BOARD.y + Math.floor(i / BOARD.cols) * BOARD.cell + BOARD.cell / 2 });

/**
 * First-30-seconds tutorial: max 3 short steps, never blocks input, skippable.
 *   1. merge two matching foods   2. serve the first customer   3. tap SPAWN
 * A pointing hand shows the gesture; the first customer always orders Fries (see CustomerSystem).
 */
export class Tutorial {
  constructor(scene, app) {
    this.scene = scene;
    this.app = app;
    this.step = 0;
    this.active = false;
    this.loop = null;

    const bus = app.state.bus;
    this.layer = scene.add.container(0, 0).setDepth(DEPTH.top - 5).setVisible(false);
    this.buildCard();
    this.hand = E(scene, 0, 0, '👆', 100).setOrigin(0.5, 0.08);
    this.ring = scene.add.graphics();
    this.layer.add([this.ring, this.hand]);

    const on = (ev, fn) => { bus.on(ev, fn, this); scene.events.once('shutdown', () => bus.off(ev, fn, this)); };
    on('board:merge', () => this.step === 1 && this.next());
    on('customer:served', () => { if (this.step === 1 || this.step === 2) this.setStep(3); });
    on('spawned', () => this.step === 3 && this.finish());
    on('board:spawn', () => this.refresh());
    on('board:move', () => this.refresh());
    on('board:swap', () => this.refresh());
    on('customer:spawn', () => this.refresh());
    on('drag:start', () => this.hand.setVisible(false) && this.ring.setVisible(false));
    on('drag:end', () => this.refresh());
    on('popup:open', () => this.layer.setVisible(false));
    on('popup:close', () => this.refresh());
  }

  buildCard() {
    const s = this.scene;
    this.card = s.add.container(360, 512);
    const g = boxImage(s, 640, 132, 36, COLORS.white, { lip: 6, ow: 6, shine: false });
    this.cardText = T(s, -212, -4, '', 38, COLORS.ink, { stroke: false, wrap: 360, ox: 0, align: 'left' });
    this.skipBtn = new Button(s, 242, 0, { w: 150, h: 70, r: 26, color: COLORS.smoke, label: t('btn.skip'), fontSize: 34, onClick: () => this.finish(true) });
    this.card.add([g, E(s, -272, 0, '👨‍🍳', 72), this.cardText, this.skipBtn]);
    this.layer.add(this.card);
  }

  /** Called whenever the Game scene becomes active */
  maybeStart() {
    const { state } = this.app;
    if (state.data.tutorial.done || this.active || state.mode !== 'game') { if (state.mode !== 'game') this.layer.setVisible(false); return; }
    this.active = true;
    this.setStep(1);
  }

  setStep(n) {
    this.step = n;
    this.cardText.setText(t('tut.' + n));
    this.card.setScale(0.7).setAlpha(0);
    this.scene.tweens.add({ targets: this.card, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    this.refresh();
  }

  next() {
    const { merge, state } = this.app;
    if (this.step === 1) {
      // go on to "serve" if a customer + the dish exist, else straight to "spawn"
      this.setStep(2);
    } else if (this.step === 2) {
      this.setStep(3);
    }
    void merge; void state;
  }

  finish(skipped = false) {
    this.active = false;
    this.step = 0;
    this.stopLoop();
    this.layer.setVisible(false);
    const { state } = this.app;
    state.data.tutorial.done = true;
    state.save();
    if (!skipped) {
      state.addCoins(50, { source: 'tutorial', score: false });
      this.app.toast(t('toast.tutorialDone'), { color: COLORS.gold });
    }
    state.bus.emit('tutorial:done');
    // the daily gift is shown right after the tutorial
    this.scene.time.delayedCall(1200, () => { if (this.app.daily.status().canClaim) this.app.ui.openPopup('daily'); });
  }

  stopLoop() {
    this.loop?.remove();
    this.scene.tweens.killTweensOf(this.hand);
    this.hand.setAlpha(0);
    this.ring.clear();
  }

  /** Re-aim the hand for the current step (board or customers changed) */
  refresh() {
    if (!this.active) return;
    const { merge, customers } = this.app;
    this.layer.setVisible(this.app.state.mode === 'game' && !this.app.ui.popups.isOpen);
    this.stopLoop();
    this.hand.setVisible(true);
    this.ring.setVisible(true);

    if (this.step === 1) {
      const pair = merge.findPair();
      if (!pair) return this.setStep(3);
      this.dragLoop(cellPos(pair.a), cellPos(pair.b), cellPos(pair.b));
    } else if (this.step === 2) {
      const c = customers.slots.find((x) => x && merge.has(x.order));
      if (!c) {
        const any = customers.slots.some(Boolean);
        if (!any) return; // wait for the customer to arrive
        return this.setStep(3);
      }
      const from = cellPos(merge.find(c.order));
      const to = { x: SLOT_X[c.slot] - 34, y: CUSTOMER.headY + 20 };
      this.dragLoop(from, to, to);
    } else if (this.step === 3) {
      this.tapLoop({ x: BOTTOM.spawn.x + 20, y: BOTTOM.spawn.y - 4 });
    }
  }

  dragLoop(from, to, ringAt) {
    const s = this.scene;
    this.ring.clear().lineStyle(8, COLORS.energy, 1).strokeCircle(ringAt.x, ringAt.y, 56);
    s.tweens.add({ targets: this.ring, alpha: { from: 1, to: 0.3 }, duration: 450, yoyo: true, repeat: -1 });
    const run = () => {
      if (!this.active) return;
      this.hand.setPosition(from.x, from.y + 10).setAlpha(0).setScale(1.1);
      s.tweens.add({ targets: this.hand, alpha: 1, scale: 0.95, duration: 220, onComplete: () => {
        s.tweens.add({ targets: this.hand, x: to.x, y: to.y + 10, duration: 900, ease: 'Sine.easeInOut', onComplete: () => {
          s.tweens.add({ targets: this.hand, alpha: 0, duration: 240, delay: 260, onComplete: () => { this.loop = s.time.delayedCall(300, run); } });
        } });
      } });
    };
    run();
  }

  tapLoop(at) {
    const s = this.scene;
    this.ring.clear().lineStyle(8, COLORS.energy, 1).strokeCircle(BOTTOM.spawn.x, BOTTOM.spawn.y, BOTTOM.spawn.r + 12);
    s.tweens.add({ targets: this.ring, alpha: { from: 1, to: 0.25 }, duration: 450, yoyo: true, repeat: -1 });
    this.hand.setPosition(at.x, at.y).setAlpha(1).setScale(1);
    s.tweens.add({ targets: this.hand, y: at.y - 24, scale: 0.92, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}
