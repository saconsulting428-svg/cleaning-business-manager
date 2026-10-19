import Phaser from 'phaser';
import { COLORS, DEPTH } from '../ui/theme.js';
import { boxImage, circleImage, bakeTexture } from '../ui/draw.js';
import { T, E } from '../ui/text.js';
import { W, H, BOTTOM, STRIP_Y, STRIP_X, GOAL_Y } from '../ui/layout.js';
import { Button } from '../ui/Button.js';
import { CurrencyPill } from '../ui/CurrencyPill.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { Toast } from '../ui/Toast.js';
import { Banner } from '../ui/Banner.js';
import { PopupManager } from '../ui/Popup.js';
import { FX } from '../ui/fx.js';
import { registerScreens } from '../screens/index.js';
import { ALBUM_MILESTONES } from '../data/rewards.js';
import { ENERGY_MAX } from '../systems/EnergySystem.js';
import { GEN_MAX } from '../systems/GeneratorSystem.js';
import { ITEMS, itemName } from '../data/items.js';
import { stageFor } from '../data/levels.js';
import { t, getLang } from '../data/i18n.js';
import { fmtClock, fmtShort } from '../systems/time.js';
import { onAppVisibility } from '../systems/Platform.js';
import { Tutorial } from '../game/Tutorial.js';

/** small rounded status pill used for the Rush / Battle tags on the counter edge */
function makeTag(scene, w, color) {
  const c = scene.add.container(0, 0);
  c.add(boxImage(scene, w, 56, 24, color, { lip: 5, ow: 5, shine: false }));
  return c;
}

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
    this.ticks = 0;

    // (scene restarts, e.g. language switch, must not inherit stale popup locks)
    this.state.uiBlocks = 0;
    app.customers.resume('popup');

    this.fx = new FX(this);
    this.toaster = new Toast(this, 252);
    this.banner = new Banner(this, 330);
    this.stuckTicks = 0;
    this.lastStuckAt = 0;
    this.popups = new PopupManager(this, app);
    registerScreens(this.popups);
    app.ui = this;
    app.toast = (msg, o) => this.toast(msg, o);
    this.installProviders();

    this.hud = this.add.container(0, 0).setDepth(DEPTH.hud);
    this.bottom = this.add.container(0, 0).setDepth(DEPTH.hud);
    this.tags = this.add.container(0, 0).setDepth(DEPTH.hud);
    this.buildHUD();
    this.buildBottomBar();
    this.buildTags();
    this.bindState();
    this.tutorial = new Tutorial(this, app);

    // offline earnings must be computed BEFORE we refresh "last seen"
    const away = app.idle.pending();
    if (away) app.idle.touch();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    this.tick();
    this.setMode(this.state.mode);

    this.watchLifecycle();
    this.time.delayedCall(350, () => this.startupPopups(away));
    const reopen = this.registry.get('reopen');
    if (reopen) { this.registry.set('reopen', null); this.openPopup(reopen); }
  }

  toast(msg, o) { return this.toaster.show(msg, o); }
  openPopup(name, data, urgent) { return this.popups.open(name, data, urgent); }

  // ---- monetization providers (mock): swap for AdMob / Play Billing in AdsService / IAPService ----
  installProviders() {
    const app = this.app;
    app.ads.setProvider({
      isReady: () => true,
      show: async (placement) => {
        const data = { placement, rewarded: false };
        await this.openPopup('adMock', data, true);
        return data.rewarded;
      },
    });
    app.iap.setProvider({
      purchase: async (id) => {
        const p = app.iap.products().find((x) => x.id === id);
        const name = p?.gems ? `${p.gems} 💎` : t('shop.noads');
        const data = { message: t('shop.buyConfirm', { name, price: p?.price ?? '' }), sub: t('shop.testPurchase'), yes: t('btn.buy'), result: false };
        await this.openPopup('confirm', data, true);
        return { success: data.result };
      },
      restore: async () => [],
    });
  }

  // ---- startup / lifecycle ---------------------------------------------------------------
  startupPopups(away) {
    if (this.app.startupShown) return;
    this.app.startupShown = true;
    if (away) this.openPopup('welcome', away);
    if (this.state.data.tutorial.done && this.app.daily.status().canClaim) this.openPopup('daily');
    const ev = this.app.events.update();
    if (ev) this.announceRush(ev, false);
  }

  watchLifecycle() {
    if (this.app.lifecycleBound) return;
    this.app.lifecycleBound = true;
    onAppVisibility((hidden) => {
      const app = this.app;
      const now = Date.now();
      if (hidden) {
        app.idle.touch(now);
        app.state.flush();
        app.notify.scheduleAll(now);
      } else {
        app.notify.cancelAll();
        app.energy.sync(now);
        const away = app.idle.pending(now);
        if (away) { app.idle.touch(now); this.openPopup('welcome', away); }
        app.quests.ensureToday(now);
      }
    });
  }

  reloadUI(reopen = null) {
    this.registry.set('reopen', reopen);
    this.scene.get(this.state.mode === 'game' ? 'Game' : 'Menu').scene.restart();
    this.scene.restart();
  }

  resetProgress() {
    this.state.frozen = true;
    this.app.saves.wipe();
    location.reload();
  }

  startRivalBattle() {
    const go = () => { if (this.app.rival.start()) { this.toast(t('toast.rivalOn')); this.app.audio.play('whoosh'); } };
    if (this.state.mode !== 'game') { this.scene.get('Menu').play(); this.time.delayedCall(700, go); } else go();
  }

  // ---- HUD ---------------------------------------------------------------
  buildHUD() {
    const d = this.state.data;
    this.coinPill = new CurrencyPill(this, 114, 58, 200, 'ico_coin', d.coins);
    this.gemPill = new CurrencyPill(this, 322, 58, 190, 'ico_gem', d.gems);
    this.energyPill = new CurrencyPill(this, 528, 58, 196, 'ico_bolt', d.energy, { format: (n) => `${n}/${ENERGY_MAX}` });
    [[this.coinPill, 'shop'], [this.gemPill, 'shop'], [this.energyPill, 'energy']].forEach(([pill, popup]) => {
      pill.setInteractive(new Phaser.Geom.Rectangle(0, 0, pill.w, 66), Phaser.Geom.Rectangle.Contains);
      pill.on('pointerup', () => { if (this.popups.isOpen) return; this.app.audio.play('click'); this.openPopup(popup); });
    });
    this.gear = new Button(this, 672, 58, { shape: 'circle', w: 76, h: 76, color: COLORS.smoke, icon: '⚙️', iconSize: 40, hitPad: 14, onClick: () => this.openPopup('settings') });

    // level badge + XP bar
    const badge = circleImage(this, 36, COLORS.gold, { lip: 6 }).setPosition(58, 122);
    this.levelText = T(this, 58, 120, '1', 40, COLORS.white);
    this.xpBar = new ProgressBar(this, 270, 124, 320, 44, { color: COLORS.gem, fontSize: 32 });
    this.xpBar.setInteractive(new Phaser.Geom.Rectangle(0, 0, 320, 44), Phaser.Geom.Rectangle.Contains);
    this.xpBar.setSize(320, 44);
    this.xpBar.on('pointerup', () => this.toast(`${t('xp')}: ${this.state.data.xp}`));
    this.energyTimer = T(this, 528, 120, '', 32, COLORS.energy);

    this.hud.add([this.coinPill, this.gemPill, this.energyPill, this.gear, badge, this.levelText, this.xpBar, this.energyTimer]);
    this.refreshLevel(false);
    this.buildGoalBar();
  }

  /** Always-visible "Next goal" bar under the HUD: progress fill, text, (n/m) and reward */
  buildGoalBar() {
    this.goalBar = new ProgressBar(this, W / 2, GOAL_Y, 704, 52, { color: COLORS.success, back: COLORS.boardFrame, label: false });
    this.goalBar.setSize(704, 52);
    this.goalBar.setInteractive(new Phaser.Geom.Rectangle(0, 0, 704, 52), Phaser.Geom.Rectangle.Contains);
    this.goalBar.on('pointerup', () => { this.app.audio.play('click'); this.toast(this.goalHint(), { duration: 2600 }); });
    this.goalIcon = E(this, -322, -2, '🎯', 34, { shadow: false });
    this.goalText = T(this, -292, -3, '', 32, COLORS.white, { ox: 0 });
    this.goalCount = T(this, 200, -3, '', 32, COLORS.gold, { ox: 1 });
    this.goalCoin = this.add.image(238, -1, 'ico_coin').setScale(0.62);
    this.goalReward = T(this, 262, -3, '', 32, COLORS.white, { ox: 0 });
    this.goalBar.add([this.goalIcon, this.goalText, this.goalCount, this.goalCoin, this.goalReward]);
    this.hud.add(this.goalBar);
    this.refreshGoal(false);
  }

  goalLabel(d) {
    if (d.type === 'serve') return t('goal.serve', { n: d.target });
    if (d.type === 'make') return t('goal.make', { item: `${ITEMS[d.item].emoji} ${itemName(d.item)}` });
    return t('goal.level', { n: d.lv });
  }

  goalHint() {
    const d = this.app.goals.def();
    if (d.type === 'serve') return t('goal.hint.serve');
    if (d.type === 'make') return t('goal.hint.make', { path: this.app.goals.path() });
    return t('goal.hint.level');
  }

  refreshGoal(animate = true) {
    const d = this.app.goals.def();
    this.goalText.setText(`${t('goal.next')} ${this.goalLabel(d)}`);
    this.goalCount.setText(`(${d.label})`);
    this.goalReward.setText(String(d.reward.coins));
    // keep long (Roman Urdu) labels inside the bar
    const room = 430;
    this.goalText.setScale(Math.min(1, Math.max(0.9, room / Math.max(1, this.goalText.width))));
    this.goalBar.setValue(d.ratio, animate);
  }

  /** Goal finished: celebrate, show the reward, and slide in the next goal at once */
  onGoalDone({ done, reward }) {
    this.app.audio.play('levelup');
    this.fx.confetti(45);
    this.banner.show({
      title: t('goal.done'),
      sub: `🪙 ${reward.coins}   💎 ${reward.gems}   🧺 +${reward.charges}`,
      icon: '🎯', color: COLORS.success, hold: 2200, y: 330,
    });
    this.bus.emit('fx:coins', { x: W / 2, y: GOAL_Y, n: 8 });
    this.tweens.add({ targets: this.goalBar, scale: { from: 1.06, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    this.refreshGoal(false);
    this.goalText.x = -292 + 80;
    this.tweens.add({ targets: this.goalText, x: -292, duration: 380, ease: 'Back.easeOut' });
    void done;
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
    const bh = H - BOTTOM.y + 10;
    bakeTexture(this, 'bottombar', W + 8, bh, (g) => {
      g.fillStyle(COLORS.ink, 0.35).fillRoundedRect(0, 8, W + 8, bh, { tl: 44, tr: 44, bl: 0, br: 0 });
      g.fillStyle(COLORS.ink, 1).fillRoundedRect(0, 0, W + 8, bh, { tl: 44, tr: 44, bl: 0, br: 0 });
      g.fillStyle(COLORS.woodDark, 1).fillRoundedRect(4, 6, W, bh - 6, { tl: 40, tr: 40, bl: 0, br: 0 });
      g.fillStyle(COLORS.white, 0.12).fillRoundedRect(18, 12, W - 28, 16, 8);
    });
    this.bottom.add(this.add.image(-4, BOTTOM.y - 10, 'bottombar').setOrigin(0, 0));

    const { spawn, sideY, side } = BOTTOM;
    // BIG button = the free Potato Basket generator (no energy). Face: basket, charges n/8, recharge timer.
    this.spawnBtn = new Button(this, spawn.x, spawn.y, { shape: 'circle', w: spawn.r * 2, h: spawn.r * 2, color: COLORS.primary, hitPad: 10, onClick: () => this.bus.emit('ui:spawn') });
    const chip = boxImage(this, 112, 42, 20, COLORS.energy, { lip: 4, ow: 4 }).setPosition(0, 54);
    this.spawnCost = this.add.container(0, 0, [chip]);
    this.basketTimer = T(this, 0, 52, '', 32, COLORS.white);
    this.basketCount = T(this, 0, 6, '', 44, COLORS.white);
    this.spawnCost.add(this.basketTimer);
    this.spawnBtn.add([E(this, 0, -38, '🥔', 60), this.basketCount, this.spawnCost]);

    const mk = (i, icon, cap, color, popup) => new Button(this, side[i], sideY, { w: 112, h: 118, r: 30, color, icon, iconSize: 50, caption: cap, hitPad: 6, onClick: () => this.openPopup(popup) });
    this.chestBtn = mk(0, '🎁', t('btn.chest'), COLORS.gem, 'chest');
    this.questBtn = mk(1, '📋', t('btn.quests'), COLORS.success, 'quests');
    this.albumBtn = mk(2, '📖', t('btn.album'), COLORS.grape, 'album');
    this.shopBtn = mk(3, '🛍️', t('btn.shop'), COLORS.pink, 'shop');
    [this.chestBtn, this.questBtn, this.albumBtn, this.shopBtn].forEach((b) => b.attachBadge());

    // small buttons in the strip under the board
    const mkSmall = (x, icon, onClick, color = COLORS.primary) => new Button(this, x, STRIP_Y, { w: 90, h: 78, r: 28, color, icon, iconSize: 42, hitPad: 8, onClick });
    // premium spawn (1 energy => tier 2-3 dish) and double spawn (2 energy => two of them)
    this.premiumBtn = new Button(this, STRIP_X.premium, STRIP_Y, { w: 90, h: 92, r: 28, color: COLORS.grape, icon: '✨', iconSize: 40, caption: '⚡1', hitPad: 6, onClick: () => this.bus.emit('ui:premium', { count: 1 }) });
    this.doubleBtn = new Button(this, STRIP_X.double, STRIP_Y, { w: 90, h: 92, r: 28, color: COLORS.pink, icon: '💫', iconSize: 40, caption: '⚡2', hitPad: 6, onClick: () => this.bus.emit('ui:premium', { count: 2 }) });
    this.dailyBtn = mkSmall(STRIP_X.daily, '📅', () => this.openPopup('daily'));
    this.lbBtn = mkSmall(STRIP_X.lb, '🏆', () => this.openPopup('leaderboard'));
    this.rivalBtn = mkSmall(STRIP_X.rival, '⚔️', () => (this.app.rival.active ? this.toast(t('toast.rivalOn')) : this.openPopup('rival', { mode: 'intro' })));
    this.rivalBtn.setColor(COLORS.secondary);
    [this.dailyBtn, this.lbBtn, this.rivalBtn].forEach((b) => b.attachBadge());

    this.bottom.add([this.spawnBtn, this.premiumBtn, this.doubleBtn, this.chestBtn, this.questBtn, this.albumBtn, this.shopBtn, this.dailyBtn, this.lbBtn, this.rivalBtn]);
  }

  // ---- Rush / Battle tags sitting on the counter edge -------------------------------------
  buildTags() {
    this.rushTag = makeTag(this, 430, COLORS.secondary);
    this.rushTag.setPosition(232, 436);
    this.rushName = T(this, -196, -2, '', 32, COLORS.white, { ox: 0 });
    this.rushTime = T(this, 196, -2, '', 32, COLORS.gold, { ox: 1 });
    this.rushTag.add([this.rushName, this.rushTime]).setVisible(false);

    this.battleTag = makeTag(this, 250, COLORS.grape);
    this.battleTag.setPosition(578, 436);
    this.battleText = T(this, 0, -2, '', 34, COLORS.white);
    this.battleTag.add(this.battleText).setVisible(false);
    this.tags.add([this.rushTag, this.battleTag]);
  }

  announceRush(ev, withSound = true) {
    this.banner.show({ title: `${t(ev.nameKey)} x${ev.mult}`, sub: `${t('rush.sub')}\n${t('rush.left', { t: fmtClock(ev.endsAt - Date.now()) })}`, icon: ev.icon, color: COLORS.secondary, hold: 3200 });
    if (withSound) this.app.audio.play('success');
  }

  setMode(mode) {
    this.state.mode = mode;
    this.bottom.setVisible(mode === 'game');
    this.tags.setVisible(mode === 'game');
    this.tutorial?.maybeStart();
  }

  // ---- state bindings ---------------------------------------------------------------
  bindState() {
    const on = (ev, fn) => { this.bus.on(ev, fn, this); this.events.once('shutdown', () => this.bus.off(ev, fn, this)); };
    const { app } = this;
    on('coins', (v) => this.coinPill.setValue(v));
    on('gems', (v) => this.gemPill.setValue(v));
    on('energy', (v) => { this.energyPill.setValue(v); this.updateEnergyTimer(); });
    on('xp', () => { this.refreshLevel(); this.refreshGoal(); });
    on('goal:progress', () => this.refreshGoal());
    on('goal:done', (e) => this.onGoalDone(e));
    on('customer:served', () => this.refreshGoal());
    on('fx:coins', ({ x, y, n }) => this.fx.coinsFly(x, y, this.coinPill.iconPos(), n, () => { this.coinPill.bump(); app.audio.play('coin'); }));
    on('fx:gems', ({ x, y, n }) => this.fx.coinsFly(x, y, this.gemPill.iconPos(), Math.min(n, 5), () => this.gemPill.bump(), 'ico_gem'));

    on('progress:levelup', (ev) => {
      this.openPopup('levelup', ev);
      if (ev.chains.some((c) => c.id === 'flour')) this.time.delayedCall(600, () => this.toast(t('toast.fusionTip'), { duration: 3400, color: COLORS.gold }));
      if (ev.rival) this.openPopup('rival', { mode: 'intro' });
      this.refreshBadges();
    });
    on('event:start', (ev) => { this.announceRush(ev); this.toast(t('toast.rushOn', { name: t(ev.nameKey) }), { color: COLORS.gold }); });
    on('rival:end', (r) => { this.openPopup('rival', { mode: r.win ? 'win' : 'lose', ...r }); this.refreshBadges(); });
    on('rival:start', () => this.refreshBadges());
    on('skin:unlocked', () => this.toast(t('toast.skinUnlocked')));
    on('quests', () => this.refreshBadges());
    on('discover', () => this.refreshBadges());
    on('chest:opened', () => this.refreshBadges());
    on('daily:claimed', () => this.refreshBadges());
    on('popup:close', () => this.refreshBadges());
  }

  updateEnergyTimer() {
    const ms = this.app.energy.msToNext();
    this.energyTimer.setText(ms > 0 ? t('hud.next', { t: fmtClock(ms) }) : '');
  }

  refreshBadges() {
    const app = this.app;
    this.chestBtn.badge.set(app.chest.ready());
    this.questBtn.badge.set(app.quests.claimableCount());
    this.dailyBtn.badge.set(app.daily.status().canClaim);
    const album = ALBUM_MILESTONES.some((m) => this.state.data.discovered.length >= m.count && !this.state.data.album.claimed.includes(m.count));
    this.albumBtn.badge.set(album);
    this.rivalBtn.setVisible(app.rival.available || app.rival.active);
    this.rivalBtn.badge.set(app.rival.available && !app.rival.active);
  }

  tick() {
    const app = this.app;
    const now = Date.now();
    this.ticks += 1;
    app.energy.sync(now);
    this.updateEnergyTimer();
    this.energyPill.setValue(app.energy.value, false);
    this.premiumBtn.setAlpha(app.energy.value >= 1 ? 1 : 0.6);
    this.doubleBtn.setAlpha(app.energy.value >= 2 ? 1 : 0.6);
    this.checkStuck(now);
    app.quests.ensureToday(now);
    app.state.rollWeek();

    // free chest countdown on its button
    this.chestBtn.setCaption(app.chest.ready() ? t('btn.open') : fmtShort(app.chest.msLeft(now)));

    // lunch / dinner rush
    const ev = app.events.update(now);
    const showTags = this.state.mode === 'game';
    this.rushTag.setVisible(showTags && !!ev);
    if (ev) { this.rushName.setText(`${ev.icon} ${t('hud.rush', { name: t(ev.nameKey), n: ev.mult })}`); this.rushTime.setText(fmtClock(ev.endsAt - now)); }

    // rival battle
    const b = app.rival.battle;
    this.battleTag.setVisible(showTags && !!b);
    if (b) this.battleText.setText(`⚔️ ${b.served}/${b.target}  ${fmtClock(app.rival.msLeft(now))}`);

    this.refreshBadges();
    if (this.ticks % 5 === 0) { app.idle.touch(now); app.state.flush(); }
  }

  /** Friendly help popup when nothing can be done: full board w/o merges, or no charges + no energy */
  checkStuck(now) {
    const app = this.app;
    if (this.state.mode !== 'game' || this.popups.isOpen || this.tutorial.active || now - this.lastStuckAt < 25000) { this.stuckTicks = 0; return; }
    const m = app.merge;
    const noMoves = !m.hasMoves() && !app.customers.slots.some((c) => c && m.has(c.order));
    const full = m.isFull();
    const empty = app.gen.charges < 1 && app.energy.value < 1;
    if (noMoves && (full || empty)) {
      this.stuckTicks += 1;
      if (this.stuckTicks >= 2) { this.stuckTicks = 0; this.lastStuckAt = now; this.openPopup('stuck', { kind: full ? 'full' : 'empty' }); }
    } else this.stuckTicks = 0;
  }

  update() {
    // free basket: charges n/8 + recharge countdown, refreshed every frame (Text ignores unchanged strings)
    const gen = this.app.gen;
    gen.sync();
    this.basketCount.setText(`${gen.charges}/${GEN_MAX}`);
    const ms = gen.msToNext();
    this.basketTimer.setText(ms > 0 ? `+1 ${Math.ceil(ms / 1000)}s` : t('gen.full'));
    this.spawnBtn.setAlpha(gen.charges > 0 ? 1 : 0.8);
    // smooth battle countdown even between 1s ticks
    if (this.app.rival.battle) this.battleText.setText(`⚔️ ${this.app.rival.battle.served}/${this.app.rival.battle.target}  ${fmtClock(this.app.rival.msLeft())}`);
  }
}
