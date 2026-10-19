import Phaser from 'phaser';
import { COLORS } from '../ui/theme.js';
import { Background } from '../game/Background.js';
import { BoardView } from '../game/BoardView.js';
import { DragController, SellZone } from '../game/DragController.js';
import { CustomersView } from '../game/CustomerView.js';
import { FX } from '../ui/fx.js';
import { stageFor } from '../data/levels.js';
import { ITEMS, itemName } from '../data/items.js';
import { t } from '../data/i18n.js';
import { haptic } from '../systems/Platform.js';

/** The world: backdrop, customers, merge board and drag & drop. HUD/popups live in UIScene. */
export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const app = (this.app = this.registry.get('app'));
    const { state } = app;
    this.bus = state.bus;
    state.mode = 'game';
    app.ui?.setMode('game');

    this.background = new Background(this);
    this.background.setStage(stageFor(state.level).id);
    this.fx = new FX(this);
    this.board = new BoardView(this, app, this.fx);
    this.sell = new SellZone(this);
    this.customersView = new CustomersView(this, app, this.fx);
    this.customersView.board = this.board; // lets customers pulse the items they ordered
    this.drag = new DragController(this, app, this.board, this.customersView, this.sell);

    this.listen('ui:spawn', this.onSpawnRequest);
    this.listen('ui:premium', this.onPremiumRequest);
    this.listen('board:merge', this.onMerge);
    this.listen('board:spawn', this.onSpawned);
    this.listen('board:full', () => app.toast?.(t('toast.boardFull')));
    this.listen('customer:served', this.onServed);
    this.listen('progress:levelup', this.onLevelUp);
    this.listen('customer:left', this.onLeft);
    this.listen('customer:wrong', this.onWrong);
    app.customers.enter();
    this.events.once('shutdown', () => app.customers.leave());
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  /** subscribe to the event bus and auto-unsubscribe when this scene shuts down */
  listen(ev, fn) {
    this.bus.on(ev, fn, this);
    this.events.once('shutdown', () => this.bus.off(ev, fn, this));
  }

  get blocked() { return this.app.state.uiBlocks > 0; }

  update() {
    const now = Date.now();
    this.app.customers.update(now);
    this.app.rival.update(now);
    this.customersView.update(now);
  }

  onServed({ slot, coins, xp, gems, mult, bonus }) {
    const p = this.customersView.faceWorldPos(slot);
    this.app.audio.play('success');
    haptic([15, 40, 20]);
    this.fx.float(p.x, p.y - 50, `+${coins}`, { color: COLORS.gold, size: 60 });
    this.fx.float(p.x, p.y + 6, `+${xp} XP`, { color: COLORS.gem, size: 36, delay: 140 });
    if (mult > 1) this.fx.float(p.x + 70, p.y - 100, `x${mult} 🔥`, { color: COLORS.primary, size: 44, delay: 80 });
    this.bus.emit('fx:coins', { x: p.x, y: p.y, n: 7 });
    if (bonus?.type === 'charges') {
      this.fx.float(p.x, p.y + 110, t('bonus.charges', { n: bonus.n }), { color: COLORS.energy, size: 40, delay: 380 });
      this.app.audio.play('combo');
    } else if (bonus?.type === 'premium') {
      this.fx.float(p.x, p.y + 110, t('bonus.premium'), { color: COLORS.grape, size: 40, delay: 380 });
      this.app.audio.play('combo');
    }
    if (gems) {
      this.fx.float(p.x, p.y + 56, `+${gems} 💎`, { color: COLORS.gem, size: 44, delay: 260 });
      this.bus.emit('fx:gems', { x: p.x, y: p.y, n: gems });
    }
  }

  /** new restaurant stage => new backdrop with a flash */
  onLevelUp({ level, stage }) {
    if (stage) {
      this.cameras.main.flash(500, 255, 255, 255);
      this.background.setStage(stage.id);
    }
  }

  onLeft() {
    this.app.audio.play('error');
    haptic([30, 40, 30]);
  }

  onWrong() {
    this.app.audio.play('error');
    this.app.toast?.(t('toast.wrong'), { duration: 1000 });
  }

  /** Free Potato Basket: no energy needed, recharges every 6 s */
  onSpawnRequest() {
    if (this.blocked || this.scene.isPaused()) return;
    const { audio, gen } = this.app;
    const res = this.app.merge.tapBasket();
    if (res.ok) { audio.play('spawn'); haptic(10); return; }
    if (res.reason === 'empty') {
      audio.play('error');
      this.app.toast?.(t('gen.empty', { s: Math.ceil(gen.msToNext() / 1000) }), { duration: 1200 });
    }
    // 'full' is announced through the board:full event
  }

  /** Premium (1 energy) / double (2 energy) spawn: random tier 2-3 dishes */
  onPremiumRequest({ count = 1 } = {}) {
    if (this.blocked || this.scene.isPaused()) return;
    const res = this.app.merge.premium(count);
    if (res.ok) { this.app.audio.play('success'); haptic([10, 30, 10]); return; }
    if (res.reason === 'energy') { this.app.audio.play('error'); this.app.ui.openPopup('energy'); }
  }

  onSpawned({ id, source }) {
    if (source === 'bonus') { this.app.toast?.(t('toast.bonus') + ' 🍀', { duration: 1100 }); this.app.audio.play('spawn'); }
  }

  onMerge(ev) {
    const { audio, economy } = this.app;
    const r = economy.applyMerge(ev);
    const pitch = 1 + Math.min(ev.combo - 1, 6) * 0.1 + ev.tier * 0.03;
    audio.play('pop', pitch);
    haptic(ev.tier >= 5 ? [25, 30, 45] : 14);
    const p = this.board.cellCenter(ev.to);
    this.board.rewardAt(ev.to, `+${r.coins}`);
    this.bus.emit('fx:coins', { x: p.x, y: p.y, n: Math.min(5, 2 + Math.floor(ev.tier / 2)) });
    if (ev.combo >= 3) {
      this.fx.bigText(t('combo', { n: ev.combo }), 600, COLORS.gold);
      audio.play('combo');
    }
    if (ev.tier >= 5) this.cameras.main.shake(240, 0.007);
    if (ev.fusion) {
      this.fx.bigText(t('toast.fusion', { name: itemName(ev.id) }), 520, COLORS.grape);
      this.cameras.main.shake(200, 0.005);
    }
    if (ev.isNew) {
      if (ev.tier >= 4 || ev.fusion) this.app.ui.openPopup('dish', { id: ev.id });
      else this.app.toast?.(t('toast.newDish', { name: itemName(ev.id) }), { color: COLORS.gold });
    }
  }
}
