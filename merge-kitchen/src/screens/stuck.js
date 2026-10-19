import { COLORS } from '../ui/theme.js';
import { T, E } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { t } from '../data/i18n.js';
import { popupTimer } from './kit.js';

/**
 * "Stuck" helper: shown when the board is full with no merges, or when both basket charges and energy
 * are used up. Offers: sell items, a live countdown to the next free charge, and a rewarded ad (+4 charges).
 * data: { kind: 'full' | 'empty' }
 */
export const stuckScreen = {
  size: () => ({ title: t('stuck.title'), w: 620, h: 800, ribbon: COLORS.primary }),
  build(popup, scene, app, data) {
    const c = popup.content;
    const face = E(scene, 0, -240, '🥹', 130);
    scene.tweens.add({ targets: face, y: -252, angle: { from: -5, to: 5 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(face);
    c.add(T(scene, 0, -110, t(data.kind === 'full' ? 'stuck.full' : 'stuck.empty'), 38, COLORS.ink, { stroke: false, wrap: 520 }));

    const sell = new Button(scene, 0, -10, { w: 480, h: 100, color: COLORS.secondary, icon: '🗑️', label: t('stuck.sell'), fontSize: 44, onClick: () => {
      const r = app.merge.sellCheapest(4);
      if (r.n) { app.audio.play('coin'); app.toast(t('stuck.sold', { n: r.n, c: r.coins })); }
      popup.close();
    } });
    c.add(sell);

    const wait = T(scene, 0, 120, '', 40, COLORS.success, { stroke: false, wrap: 520 });
    c.add(wait);
    popupTimer(popup, scene, 250, () => {
      if (!wait.active) return;
      app.gen.sync();
      const ms = app.gen.msToNext();
      wait.setText(data.kind === 'full' ? t('stuck.room') : app.gen.charges >= 1 ? t('stuck.ready') : t('stuck.wait', { s: Math.ceil(ms / 1000) }));
    });

    const ad = new Button(scene, 0, 235, { w: 480, h: 100, color: COLORS.success, icon: '🎬', label: t('stuck.ad'), fontSize: 40, onClick: async () => {
      const ok = await app.ads.showRewarded('charges');
      if (ok) { app.gen.add(4); app.toast(t('bonus.charges', { n: 4 })); popup.close(); } else app.toast(t('toast.adNotReady'));
    } });
    c.add(ad);
    c.add(new Button(scene, 0, 345, { w: 300, h: 76, color: COLORS.smoke, label: t('stuck.ok'), fontSize: 36, onClick: () => popup.close() }));
  },
};
