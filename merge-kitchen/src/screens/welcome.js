import Phaser from 'phaser';
import { COLORS } from '../ui/theme.js';
import { T, E, fmt } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { t } from '../data/i18n.js';
import { fmtAway } from '../systems/time.js';
import { skinById } from '../data/rewards.js';

/** "Welcome back! You earned X coins" - Collect / Collect x2 (watch ad). data: { coins, ms, capped } */
export const welcomeScreen = {
  size: () => ({ title: t('welcome.title'), w: 620, h: 800, closable: false, ribbon: COLORS.success }),
  build(popup, scene, app, data) {
    const c = popup.content;
    const chef = E(scene, 0, -230, skinById(app.state.data.skins.selected).emoji, 150);
    scene.tweens.add({ targets: chef, y: -246, angle: { from: -4, to: 4 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(chef);
    c.add(T(scene, 0, -110, t('welcome.body'), 34, COLORS.ink, { stroke: false, wrap: 500 }));
    const coin = scene.add.image(-110, -20, 'ico_coin').setScale(2);
    const amount = T(scene, -50, -20, '0', 80, COLORS.gold, { ox: 0 });
    c.add([coin, amount]);
    const counter = { v: 0 };
    scene.tweens.add({ targets: counter, v: data.coins, duration: 900, ease: 'Cubic.easeOut', onUpdate: () => amount.setText(fmt(counter.v)) });
    c.add(T(scene, 0, 62, t('welcome.away', { t: fmtAway(data.ms) }) + (data.capped ? '\n' + t('welcome.cap') : ''), 32, COLORS.smoke, { stroke: false, wrap: 500 }));

    let busy = false;
    const grant = (double) => {
      if (busy) return;
      busy = true;
      const total = app.idle.collect(data.coins, double);
      app.audio.play('coin');
      app.state.bus.emit('fx:coins', { x: 360, y: 640, n: 10 });
      app.toast(`+${fmt(total)} 🪙`);
      popup.close();
    };
    const collect = new Button(scene, 0, 200, { w: 460, h: 100, color: COLORS.primary, label: t('btn.collect'), fontSize: 48, onClick: () => grant(false) });
    const x2 = new Button(scene, 0, 320, { w: 460, h: 100, color: COLORS.success, icon: '🎬', label: t('btn.collect2'), fontSize: 44, onClick: async () => {
      if (busy) return;
      const ok = await app.ads.showRewarded('idle_x2');
      if (ok) grant(true); else app.toast(t('toast.adNotReady'));
    } });
    scene.tweens.add({ targets: x2, scale: { from: 1, to: 1.05 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    x2.baseScale = 1;
    c.add([collect, x2]);
  },
};
