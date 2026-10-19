// Small utility popups: ad mock, confirm dialog, out-of-energy.
import { COLORS } from '../ui/theme.js';
import { T, E, fmt } from '../ui/text.js';
import { roundedBox } from '../ui/draw.js';
import { Button } from '../ui/Button.js';
import { t } from '../data/i18n.js';
import { fmtClock } from '../systems/time.js';
import { ENERGY_MAX } from '../systems/EnergySystem.js';
import { ENERGY_REFILL_GEMS, energyCoinCost } from '../data/shop.js';
import { popupTimer } from './kit.js';

/** Rewarded ad placeholder. Real ads replace the provider in AdsService. */
export const adMockScreen = {
  size: () => ({ title: t('ad.title'), w: 580, h: 640, closable: false, ribbon: COLORS.grape }),
  build(popup, scene, app, data) {
    const c = popup.content;
    const g = scene.add.graphics();
    roundedBox(g, 0, -70, 460, 280, 28, COLORS.ink, { lip: 0, ow: 4, shine: false, shadow: false });
    c.add(g);
    const spin = E(scene, 0, -90, '🍳', 110);
    scene.tweens.add({ targets: spin, angle: 360, duration: 1400, repeat: -1 });
    c.add(spin);
    c.add(T(scene, 0, -10, t('ad.playing'), 32, COLORS.white));
    const count = T(scene, 0, 120, '', 44, COLORS.ink, { stroke: false });
    c.add(count);
    c.add(T(scene, 0, 255, t('ad.note'), 32, COLORS.smoke, { stroke: false, wrap: 480 }));
    let left = 3;
    const done = () => {
      count.setText(t('ad.done'));
      const b = new Button(scene, 0, 190, { w: 340, h: 88, color: COLORS.success, label: t('btn.claim'), fontSize: 44, onClick: () => { data.rewarded = true; popup.close(); } });
      c.add(b);
      scene.tweens.add({ targets: b, scale: { from: 0.4, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    };
    count.setText(t('ad.reward', { n: left }));
    const ev = scene.time.addEvent({ delay: 1000, repeat: 2, callback: () => { left -= 1; if (left > 0) count.setText(t('ad.reward', { n: left })); else done(); } });
    popup.once('destroy', () => ev.remove());
  },
};

/** Yes/No dialog. data: { message, sub?, yes?, result:false } -> sets data.result */
export const confirmScreen = {
  size: () => ({ title: t('confirm.title'), w: 600, h: 520 }),
  build(popup, scene, app, data) {
    const c = popup.content;
    c.add(T(scene, 0, -70, data.message, 42, COLORS.ink, { stroke: false, wrap: 480 }));
    if (data.sub) c.add(T(scene, 0, 30, data.sub, 32, COLORS.smoke, { stroke: false, wrap: 480 }));
    const no = new Button(scene, -135, 150, { w: 240, h: 92, color: COLORS.smoke, label: t('btn.cancel'), fontSize: 40, onClick: () => popup.close() });
    const yes = new Button(scene, 135, 150, { w: 240, h: 92, color: COLORS.success, label: data.yes ?? t('btn.confirm'), fontSize: 40, onClick: () => { data.result = true; popup.close(); } });
    c.add([no, yes]);
  },
};

export const energyScreen = {
  size: () => ({ title: t('energy.title'), w: 600, h: 840, ribbon: COLORS.secondary }),
  build(popup, scene, app) {
    const c = popup.content;
    const bolt = scene.add.image(0, -265, 'ico_bolt').setScale(3.4).setTint(COLORS.locked);
    scene.tweens.add({ targets: bolt, angle: { from: -6, to: 6 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(bolt);
    c.add(T(scene, 0, -140, t('energy.body'), 36, COLORS.ink, { stroke: false, wrap: 480 }));

    const done = (n) => { app.toast(t('toast.energyAdded', { n })); popup.close(); };
    const ad = new Button(scene, 0, -30, { w: 480, h: 100, color: COLORS.success, icon: '🎬', label: t('energy.ad'), fontSize: 40, onClick: async () => {
      const ok = await app.ads.showRewarded('energy');
      if (ok) { app.energy.add(2); done(2); } else app.toast(t('toast.adNotReady'));
    } });
    const cost = energyCoinCost(app.state.level);
    const coins = new Button(scene, 0, 85, { w: 480, h: 100, color: COLORS.gold, label: t('energy.coins', { n: fmt(cost) }), fontSize: 40, onClick: () => {
      if (app.state.spendCoins(cost)) { app.energy.add(1); done(1); } else app.toast(t('toast.noCoins'));
    } });
    const gems = new Button(scene, 0, 200, { w: 480, h: 100, color: COLORS.gem, label: t('energy.gems', { n: ENERGY_REFILL_GEMS }), fontSize: 40, onClick: () => {
      if (app.state.spendGems(ENERGY_REFILL_GEMS)) { app.energy.refill(); done(ENERGY_MAX); } else { app.toast(t('toast.noGems')); app.ui.openPopup('shop'); }
    } });
    const wait = T(scene, 0, 320, '', 36, COLORS.smoke, { stroke: false, wrap: 500 });
    c.add([ad, coins, gems, wait]);
    popupTimer(popup, scene, 500, () => {
      app.energy.sync();
      wait.setText(t('energy.wait', { t: fmtClock(app.energy.msToNext()) }));
      wait.setVisible(app.energy.value < ENERGY_MAX);
    });
  },
};
