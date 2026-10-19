import { COLORS } from '../ui/theme.js';
import { T } from '../ui/text.js';
import { ScrollPane } from '../ui/ScrollPane.js';
import { t } from '../data/i18n.js';
import { fmt } from '../ui/text.js';
import { msToNextMonday, fmtLong } from '../systems/time.js';
import { card, popupTimer } from './kit.js';

const MEDAL = ['🥇', '🥈', '🥉'];

/** Weekly leaderboard (local mock behind LeaderboardService). */
export const leaderboardScreen = {
  size: () => ({ title: t('lb.title'), w: 640, h: 960, ribbon: COLORS.gold }),
  build(popup, scene, app) {
    const c = popup.content;
    c.add(T(scene, 0, -385, t('lb.score'), 34, COLORS.ink, { stroke: false }));
    let rank = '';
    const timer = T(scene, 0, -335, '', 32, COLORS.smoke, { stroke: false });
    c.add(timer);
    popupTimer(popup, scene, 1000, () => { if (timer.active) timer.setText(rank + t('lb.reset', { t: fmtLong(msToNextMonday()) })); });

    const pane = new ScrollPane(scene, popup, { x: 0, y: 70, w: 590, h: 710 });
    const loading = T(scene, 295, 60, '...', 60, COLORS.smoke, { stroke: false });
    pane.content.add(loading);
    app.leaderboard.getWeekly().then((res) => {
      if (!popup.active) return;
      loading.destroy();
      rank = t('lb.rank', { n: res.you.rank }) + '  ·  ';
      res.entries.forEach((e, i) => {
        const y = 40 + i * 82;
        pane.content.add(card(scene, 295, y, 580, 72, e.you ? COLORS.gold : COLORS.white, 22));
        pane.content.add(T(scene, 52, y - 2, e.rank <= 3 ? MEDAL[e.rank - 1] : `#${e.rank}`, e.rank <= 3 ? 44 : 34, e.you ? COLORS.white : COLORS.ink, { stroke: e.you ? undefined : false }));
        pane.content.add(T(scene, 100, y - 2, e.you ? t('lb.you') : e.name, 34, e.you ? COLORS.white : COLORS.ink, { ox: 0, stroke: e.you ? undefined : false, wrap: 260 }));
        pane.content.add(T(scene, 560, y - 2, fmt(e.score), 34, e.you ? COLORS.white : COLORS.ink, { ox: 1, stroke: e.you ? undefined : false }));
      });
      pane.setContentHeight(res.entries.length * 82 + 10);
    });
  },
};
