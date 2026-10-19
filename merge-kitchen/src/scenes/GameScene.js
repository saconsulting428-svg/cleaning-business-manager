import Phaser from 'phaser';
import { COLORS } from '../ui/theme.js';
import { Background } from '../game/Background.js';
import { BoardView } from '../game/BoardView.js';
import { DragController, SellZone } from '../game/DragController.js';
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
    this.customersView = null;
    this.drag = new DragController(this, app, this.board, this.customersView, this.sell);

    this.listen('ui:spawn', this.onSpawnRequest);
    this.listen('board:merge', this.onMerge);
    this.listen('board:spawn', this.onSpawned);
    this.listen('board:full', () => app.toast?.(t('toast.boardFull')));
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  /** subscribe to the event bus and auto-unsubscribe when this scene shuts down */
  listen(ev, fn) {
    this.bus.on(ev, fn, this);
    this.events.once('shutdown', () => this.bus.off(ev, fn, this));
  }

  get blocked() { return this.app.state.uiBlocks > 0; }

  onSpawnRequest() {
    if (this.blocked || this.scene.isPaused()) return;
    const res = this.app.merge.trySpawn();
    if (res.ok) { this.app.audio.play('spawn'); haptic(10); return; }
    if (res.reason === 'energy') { this.app.audio.play('error'); this.app.ui.openPopup('energy'); }
    // 'full' is announced through the board:full event
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
    if (ev.isNew) {
      if (ev.tier >= 4) this.app.ui.openPopup('dish', { id: ev.id });
      else this.app.toast?.(t('toast.newDish', { name: itemName(ev.id) }), { color: COLORS.gold });
    }
  }
}
