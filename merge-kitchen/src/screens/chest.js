import { COLORS } from '../ui/theme.js';
import { T, E, fmt } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { t } from '../data/i18n.js';
import { fmtClock } from '../systems/time.js';
import { haptic } from '../systems/Platform.js';
import { itemTexture } from '../game/textures.js';
import { rewardRow, popupTimer } from './kit.js';

/** Free chest every 4 hours. */
export const chestScreen = {
  size: () => ({ title: t('chest.title'), w: 600, h: 720, ribbon: COLORS.gem }),
  build(popup, scene, app) {
    const c = popup.content;
    const view = scene.add.container(0, 0);
    c.add(view);

    const showWaiting = () => {
      view.removeAll(true);
      const ready = app.chest.ready();
      const chest = E(scene, 0, -170, '🎁', 190);
      if (ready) scene.tweens.add({ targets: chest, angle: { from: -8, to: 8 }, scale: { from: 1, to: 1.08 }, duration: 160, yoyo: true, repeat: -1, repeatDelay: 700 });
      else scene.tweens.add({ targets: chest, scale: { from: 1, to: 1.04 }, duration: 900, yoyo: true, repeat: -1 });
      view.add(chest);
      const status = T(scene, 0, -10, ready ? t('chest.ready') : t('chest.wait'), 44, COLORS.ink, { stroke: false, wrap: 480 });
      view.add(status);
      if (ready) {
        const b = new Button(scene, 0, 150, { w: 400, h: 110, color: COLORS.primary, label: t('btn.open'), fontSize: 58, onClick: open });
        scene.tweens.add({ targets: b, scale: { from: 1, to: 1.06 }, duration: 520, yoyo: true, repeat: -1 });
        b.baseScale = 1;
        view.add(b);
      } else {
        const tm = T(scene, 0, 90, '', 76, COLORS.secondary, { stroke: false });
        view.add(tm);
        view.add(new Button(scene, 0, 230, { w: 360, h: 90, color: COLORS.locked, label: t('btn.open'), fontSize: 44, onClick: () => app.toast(t('toast.chestWait', { t: fmtClock(app.chest.msLeft()) })) }));
        popupTimer(popup, scene, 500, () => {
          if (!tm.active) return;
          if (app.chest.ready()) showWaiting(); else tm.setText(fmtClock(app.chest.msLeft()));
        });
      }
    };

    const open = () => {
      const r = app.chest.open();
      if (!r) return;
      app.audio.play('levelup');
      haptic([30, 40, 60]);
      view.removeAll(true);
      scene.cameras.main.flash(250, 255, 255, 255);
      app.ui.fx.confetti(40);
      view.add(E(scene, 0, -250, '🎉', 110));
      view.add(T(scene, 0, -150, t('chest.reward'), 44, COLORS.ink, { stroke: false }));
      view.add(rewardRow(scene, { coins: r.coins, gems: r.gems, energy: r.energy }, 0, -70, 48));
      r.items.forEach((id, i) => {
        const x = (i - (r.items.length - 1) / 2) * 130;
        const img = scene.add.image(x, 70, itemTexture(scene, id)).setScale(0);
        view.add(img);
        scene.tweens.add({ targets: img, scale: 1.1, duration: 360, delay: 200 + i * 160, ease: 'Back.easeOut' });
      });
      app.state.bus.emit('fx:coins', { x: 360, y: 560, n: 9 });
      view.add(new Button(scene, 0, 240, { w: 400, h: 100, color: COLORS.success, label: t('btn.awesome'), fontSize: 50, onClick: () => popup.close() }));
    };
    showWaiting();
  },
};
