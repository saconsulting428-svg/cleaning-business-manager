import Phaser from 'phaser';
import { COLORS, DEPTH } from '../ui/theme.js';
import { roundedBox, roundedCircle } from '../ui/draw.js';
import { T, E } from '../ui/text.js';
import { W, H, BOTTOM, STRIP_Y } from '../ui/layout.js';
import { Button } from '../ui/Button.js';
import { CurrencyPill } from '../ui/CurrencyPill.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { Toast } from '../ui/Toast.js';
import { Banner } from '../ui/Banner.js';
import { PopupManager } from '../ui/Popup.js';
import { FX } from '../ui/fx.js';
import { registerScreens } from '../screens/index.js';
import { ENERGY_MAX } from '../systems/EnergySystem.js';
import { stageFor } from '../data/levels.js';
import { t, getLang } from '../data/i18n.js';
import { fmtClock } from '../systems/time.js';

/**
 * Persistent overlay scene: HUD, bottom bar, toasts, banners and every popup.
 * It sits above Menu/Game, which only draw the world.
 */
export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    const app = (this.app = this.registry.get('app'));
    this.state = app.state;
    this.bus = app.state.bus;
    this.fx = new FX(this);
    this.toaster = new Toast(this, 212);
    this.banner = new Banner(this, 270);
    this.popups = new PopupManager(this, app);
    registerScreens(this.popups);
    app.ui = this;
    app.toast = (msg, o) => this.toast(msg, o);

    this.hud = this.add.container(0, 0).setDepth(DEPTH.hud);
    this.bottom = this.add.container(0, 0).setDepth(DEPTH.hud);
    this.buildHUD();
    this.buildBottomBar();
    this.bindState();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    this.tick();
    this.setMode(this.state.mode);
  }

  toast(msg, o) { return this.toaster.show(msg, o); }
  openPopup(name, data, urgent) { return this.popups.open(name, data, urgent); }

  // ---- HUD ---------------------------------------------------------------
  buildHUD() {
    const d = this.state.data;
    this.coinPill = new CurrencyPill(this, 114, 58, 200, 'ico_coin', d.coins);
    this.gemPill = new CurrencyPill(this, 322, 58, 190, 'ico_gem', d.gems);
    this.energyPill = new CurrencyPill(this, 528, 58, 196, 'ico_bolt', d.energy, { format: (n) => `${n}/${ENERGY_MAX}` });
    [[this.coinPill, 'shop'], [this.gemPill, 'shop'], [this.energyPill, 'energy']].forEach(([pill, popup]) => {
      pill.setInteractive(new Phaser.Geom.Rectangle(0, 0, pill.w, 66), Phaser.Geom.Rectangle.Contains);
      pill.on('pointerup', () => { if (this.state.mode === 'game' || popup === 'shop') { this.app.audio.play('click'); this.openPopup(popup); } });
    });

    this.gear = new Button(this, 672, 58, { shape: 'circle', w: 76, h: 76, color: COLORS.smoke, icon: '⚙️', iconSize: 40, hitPad: 14, onClick: () => this.openPopup('settings') });

    // level badge + XP bar
    const badge = this.add.graphics();
    roundedCircle(badge, 60, 132, 40, COLORS.gold, { lip: 6 });
    this.levelText = T(this, 60, 129, '1', 44, COLORS.white);
    this.xpBar = new ProgressBar(this, 270, 134, 320, 46, { color: COLORS.gem, fontSize: 32 });
    this.energyTimer = T(this, 528, 128, '', 32, COLORS.energy);

    this.hud.add([this.coinPill, this.gemPill, this.energyPill, this.gear, badge, this.levelText, this.xpBar, this.energyTimer]);
    this.refreshLevel(false);
  }

  refreshLevel(animate = true) {
    const d = this.state.data;
    const stage = stageFor(d.level);
    this.levelText.setText(String(d.level));
    this.xpBar.setValue(this.state.xpProgress(), animate);
    this.xpBar.setText(`${stage.emoji} ${stage.name[getLang()] ?? stage.name.en}`);
  }

  // ---- bottom bar ------------------------------------------------------------
  buildBottomBar() {
    const bar = this.add.graphics();
    bar.fillStyle(COLORS.ink, 0.35).fillRoundedRect(-4, BOTTOM.y - 2, W + 8, H - BOTTOM.y + 6, { tl: 44, tr: 44, bl: 0, br: 0 });
    bar.fillStyle(COLORS.ink, 1).fillRoundedRect(-4, BOTTOM.y - 10, W + 8, H - BOTTOM.y + 10, { tl: 44, tr: 44, bl: 0, br: 0 });
    bar.fillStyle(COLORS.woodDark, 1).fillRoundedRect(0, BOTTOM.y - 4, W, H - BOTTOM.y + 4, { tl: 40, tr: 40, bl: 0, br: 0 });
    bar.fillStyle(COLORS.white, 0.12).fillRoundedRect(14, BOTTOM.y + 2, W - 28, 16, 8);
    this.bottom.add(bar);

    const { spawn, sideY, side } = BOTTOM;
    this.spawnBtn = new Button(this, spawn.x, spawn.y, { shape: 'circle', w: spawn.r * 2, h: spawn.r * 2, color: COLORS.primary, hitPad: 10, onClick: () => this.bus.emit('ui:spawn') });
    // custom face: icon, caption and energy-cost chip all inside the round button
    const chip = this.add.graphics();
    roundedBox(chip, 0, 52, 96, 42, 20, COLORS.energy, { lip: 4, ow: 4 });
    this.spawnCost = this.add.container(0, 0, [chip, this.add.image(-24, 51, 'ico_bolt').setScale(0.58), T(this, 20, 50, '1', 32, COLORS.white)]);
    this.spawnLabel = T(this, 0, 10, t('btn.spawn'), 34, COLORS.white);
    this.spawnBtn.add([E(this, 0, -36, '🍳', 60), this.spawnLabel, this.spawnCost]);

    const mk = (i, icon, cap, color, popup) => new Button(this, side[i], sideY, { w: 112, h: 118, r: 30, color, icon, iconSize: 50, caption: cap, hitPad: 6, onClick: () => this.openPopup(popup) });
    this.chestBtn = mk(0, '🎁', t('btn.chest'), COLORS.gem, 'chest');
    this.questBtn = mk(1, '📋', t('btn.quests'), COLORS.success, 'quests');
    this.albumBtn = mk(2, '📖', t('btn.album'), COLORS.grape, 'album');
    this.shopBtn = mk(3, '🛍️', t('btn.shop'), COLORS.pink, 'shop');
    [this.chestBtn, this.questBtn, this.albumBtn, this.shopBtn].forEach((b) => b.attachBadge());

    // small round buttons in the strip under the board
    const mkSmall = (x, icon, popup) => new Button(this, x, STRIP_Y, { w: 92, h: 78, r: 28, color: COLORS.primary, icon, iconSize: 42, hitPad: 8, onClick: () => this.openPopup(popup) });
    this.dailyBtn = mkSmall(432, '📅', 'daily');
    this.lbBtn = mkSmall(536, '🏆', 'leaderboard');
    this.rivalBtn = mkSmall(640, '⚔️', 'rival');
    [this.dailyBtn, this.lbBtn, this.rivalBtn].forEach((b) => b.attachBadge());
    this.rivalBtn.setVisible(false);

    this.bottom.add([this.spawnBtn, this.chestBtn, this.questBtn, this.albumBtn, this.shopBtn, this.dailyBtn, this.lbBtn, this.rivalBtn]);
  }

  setMode(mode) {
    this.state.mode = mode;
    this.bottom.setVisible(mode === 'game');
  }

  // ---- state bindings ---------------------------------------------------------------
  bindState() {
    const on = (ev, fn) => { this.bus.on(ev, fn, this); this.events.once('shutdown', () => this.bus.off(ev, fn, this)); };
    on('coins', (v) => this.coinPill.setValue(v));
    on('gems', (v) => this.gemPill.setValue(v));
    on('energy', (v) => { this.energyPill.setValue(v); this.updateEnergyTimer(); });
    on('xp', () => this.refreshLevel());
    on('fx:coins', ({ x, y, n }) => this.fx.coinsFly(x, y, this.coinPill.iconPos(), n, () => { this.coinPill.bump(); this.app.audio.play('coin'); }));
    on('fx:gems', ({ x, y, n }) => this.fx.coinsFly(x, y, this.gemPill.iconPos(), Math.min(n, 5), () => this.gemPill.bump(), 'ico_gem'));
  }

  updateEnergyTimer() {
    const ms = this.app.energy.msToNext();
    this.energyTimer.setText(ms > 0 ? t('hud.next', { t: fmtClock(ms) }) : '');
  }

  tick() {
    const now = Date.now();
    this.app.energy.sync(now);
    this.updateEnergyTimer();
    this.spawnCost.setAlpha(this.app.energy.value > 0 ? 1 : 0.55);
    this.energyPill.setValue(this.app.energy.value, false);
  }
}
