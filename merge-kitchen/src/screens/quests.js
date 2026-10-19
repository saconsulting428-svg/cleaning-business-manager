import { COLORS } from '../ui/theme.js';
import { T, E } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { QUEST_BONUS } from '../data/quests.js';
import { itemName } from '../data/items.js';
import { t } from '../data/i18n.js';
import { fmtClock } from '../systems/time.js';
import { haptic } from '../systems/Platform.js';
import { card, rewardRow, popupTimer } from './kit.js';

const questText = (q) => {
  const p = { n: q.target, item: q.item ? itemName(q.item) : '' };
  return t('q.' + q.type, p);
};

/** Daily quests (3) + all-done bonus. Reset at local midnight. */
export const questsScreen = {
  size: () => ({ title: t('quests.title'), w: 640, h: 960, ribbon: COLORS.success }),
  build(popup, scene, app) {
    const c = popup.content;
    const body = scene.add.container(0, 0);
    c.add(body);
    let timerText = null;
    const fly = (x, y, n = 6) => { app.audio.play('coin'); haptic(12); app.state.bus.emit('fx:coins', { x: 360 + x, y: 640 + y, n }); };

    const render = () => {
      body.removeAll(true);
      const quests = app.quests;
      quests.list.forEach((q, i) => {
        const y = -300 + i * 172;
        const done = quests.isDone(q);
        body.add(card(scene, 0, y, 580, 156, q.claimed ? COLORS.cream2 : COLORS.white));
        body.add(T(scene, -265, y - 46, questText(q), 36, COLORS.ink, { ox: 0, stroke: false, wrap: 540 }));
        const bar = new ProgressBar(scene, -110, y + 8, 320, 44, { color: done ? COLORS.success : COLORS.gem, fontSize: 32, value: q.progress / q.target });
        bar.setText(`${q.progress}/${q.target}`);
        body.add(bar);
        body.add(rewardRow(scene, q.reward, -110, y + 56, 32));
        if (q.claimed) {
          body.add(T(scene, 195, y + 10, '✔', 70, COLORS.success));
        } else {
          const btn = new Button(scene, 195, y + 10, { w: 170, h: 76, r: 26, color: done ? COLORS.success : COLORS.locked, label: t('btn.claim'), fontSize: 34, onClick: (b) => {
            if (!done) return;
            const r = quests.claim(i);
            if (r) { fly(195, y); app.audio.play('success'); }
          } });
          if (done) scene.tweens.add({ targets: btn, scale: { from: 1, to: 1.08 }, duration: 480, yoyo: true, repeat: -1 });
          btn.baseScale = 1;
          body.add(btn);
        }
      });

      const by = 215;
      const ready = quests.bonusReady();
      body.add(card(scene, 0, by, 580, 150, quests.data.bonusClaimed ? COLORS.cream2 : COLORS.gold));
      body.add(E(scene, -250, by - 30, '🏆', 64));
      body.add(T(scene, -200, by - 34, t('quests.bonus'), 38, COLORS.white, { ox: 0 }));
      body.add(rewardRow(scene, QUEST_BONUS, -110, by + 36, 34, COLORS.white));
      if (quests.data.bonusClaimed) body.add(T(scene, 195, by, '✔', 70, COLORS.success));
      else {
        const b = new Button(scene, 195, by, { w: 170, h: 76, r: 26, color: ready ? COLORS.success : COLORS.locked, label: t('btn.claim'), fontSize: 34, onClick: () => { if (ready && quests.claimBonus()) { fly(195, by, 10); app.audio.play('success'); app.ui.fx.confetti(30); } } });
        if (ready) scene.tweens.add({ targets: b, scale: { from: 1, to: 1.08 }, duration: 480, yoyo: true, repeat: -1 });
        b.baseScale = 1;
        body.add(b);
      }
      const tm = T(scene, 0, 345, '', 34, COLORS.smoke, { stroke: false });
      body.add(tm);
      timerText = tm;
    };

    render();
    const onChange = () => { if (popup.active) render(); };
    app.state.bus.on('quests', onChange);
    popup.once('destroy', () => app.state.bus.off('quests', onChange));
    popupTimer(popup, scene, 1000, () => {
      if (app.quests.ensureToday()) render();
      if (timerText?.active) timerText.setText(t('quests.reset', { t: fmtClock(app.quests.msToReset()) }));
    });
  },
};
