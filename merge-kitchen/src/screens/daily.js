import { COLORS } from '../ui/theme.js';
import { T, E, fmt } from '../ui/text.js';
import { roundedBox } from '../ui/draw.js';
import { Button } from '../ui/Button.js';
import { DAILY_REWARDS, skinById } from '../data/rewards.js';
import { t } from '../data/i18n.js';
import { fmtClock } from '../systems/time.js';
import { haptic } from '../systems/Platform.js';
import { popupTimer } from './kit.js';

/** 7-day login streak calendar. Day 7 = special chef skin. */
export const dailyScreen = {
  size: () => ({ title: t('daily.title'), w: 640, h: 840 }),
  build(popup, scene, app) {
    const c = popup.content;
    c.add(T(scene, 0, -300, t('daily.streak'), 34, COLORS.ink, { stroke: false, wrap: 540 }));
    const tiles = scene.add.container(0, 0);
    c.add(tiles);
    const lower = scene.add.container(0, 0);
    c.add(lower);
    const hitTiles = {};

    const tileDraw = (i, status) => {
      const r = DAILY_REWARDS[i];
      const big = i === 6;
      const w = big ? 280 : 132, h = 170;
      const col = i < 4 ? i : i - 4;
      const x = big ? 146 : -219 + col * 146;
      const y = i < 4 ? -130 : 60;
      const done = status.canClaim ? i < status.doneCount : i <= status.todayIndex;
      const today = status.canClaim && i === status.todayIndex;
      const tile = scene.add.container(x, y);
      const g = scene.add.graphics();
      roundedBox(g, 0, 0, w, h, 26, done ? COLORS.success : today ? COLORS.gold : big ? COLORS.grape : COLORS.white, { lip: 8, ow: 5, shadow: false, shine: false });
      tile.add(g);
      tile.add(T(scene, 0, -58, t('daily.day', { n: i + 1 }), 32, done || today || big ? COLORS.white : COLORS.ink, { stroke: done || today || big ? undefined : false }));
      if (r.skin) {
        tile.add(E(scene, big ? -82 : 0, big ? -4 : 0, skinById(r.skin).emoji, big ? 76 : 70));
        tile.add(T(scene, big ? 52 : 0, big ? -14 : 50, t('daily.skin'), 32, COLORS.white, { wrap: big ? 150 : 130 }));
        tile.add(scene.add.image(big ? 8 : -28, 56, 'ico_gem').setScale(0.72));
        tile.add(T(scene, big ? 36 : 4, 56, `+${r.gems}`, 36, COLORS.white, { ox: 0 }));
      } else {
        const key = r.coins ? 'ico_coin' : r.gems ? 'ico_gem' : 'ico_bolt';
        const amount = r.coins ?? r.gems ?? `+${r.energy}`;
        tile.add(scene.add.image(0, -6, key).setScale(1.2));
        tile.add(T(scene, 0, 50, fmt(amount), 36, done || today ? COLORS.white : COLORS.ink, { stroke: done || today ? undefined : false }));
      }
      if (done) {
        const ck = scene.add.graphics();
        ck.fillStyle(COLORS.ink, 1).fillCircle(w / 2 - 22, -h / 2 + 22, 24);
        ck.fillStyle(COLORS.success, 1).fillCircle(w / 2 - 22, -h / 2 + 22, 19);
        ck.lineStyle(6, COLORS.white, 1).beginPath().moveTo(w / 2 - 32, -h / 2 + 22).lineTo(w / 2 - 24, -h / 2 + 31).lineTo(w / 2 - 10, -h / 2 + 12).strokePath();
        tile.add(ck);
      }
      if (today) scene.tweens.add({ targets: tile, scale: { from: 1, to: 1.07 }, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      tiles.add(tile);
      hitTiles[i] = tile;
    };

    const render = () => {
      tiles.removeAll(true);
      lower.removeAll(true);
      const st = app.daily.status();
      for (let i = 0; i < 7; i++) tileDraw(i, st);
      if (st.canClaim) {
        const btn = new Button(scene, 0, 292, { w: 400, h: 104, color: COLORS.primary, label: t('btn.claim'), fontSize: 54, onClick: () => claim() });
        scene.tweens.add({ targets: btn, scale: { from: 1, to: 1.05 }, duration: 600, yoyo: true, repeat: -1 });
        btn.baseScale = 1;
        lower.add(btn);
      } else {
        lower.add(T(scene, 0, 262, t('daily.claimed'), 42, COLORS.ink, { stroke: false }));
        const tm = T(scene, 0, 316, '', 36, COLORS.smoke, { stroke: false });
        lower.add(tm);
        popupTimer(popup, scene, 1000, () => { if (tm.active) tm.setText(t('daily.tomorrow', { t: fmtClock(app.daily.msToNext()) })); });
      }
    };

    const claim = () => {
      const st = app.daily.status();
      const idx = st.todayIndex;
      const r = app.daily.claim();
      if (!r) return;
      app.audio.play('success');
      haptic([20, 40, 30]);
      render();
      const tile = hitTiles[idx];
      scene.tweens.add({ targets: tile, scale: { from: 1.3, to: 1 }, duration: 380, ease: 'Back.easeOut' });
      app.state.bus.emit('fx:coins', { x: 360 + tile.x, y: 640 + tile.y, n: r.coins ? 8 : 4 });
      if (r.skin) app.toast(t('toast.skinUnlocked'));
      else if (r.energy) app.toast(t('toast.energyAdded', { n: r.energy }));
      scene.time.delayedCall(1100, () => popup.close());
    };
    render();
  },
};
