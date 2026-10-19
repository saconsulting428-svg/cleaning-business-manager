import { COLORS } from '../ui/theme.js';
import { T, E } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { roundedBox } from '../ui/draw.js';
import { t } from '../data/i18n.js';
import { RIVAL_TIME_MS, rivalTarget, rivalReward } from '../data/levels.js';
import { KALEEM_LINES } from '../data/rewards.js';
import { rewardRow } from './kit.js';

/** Chef Kaleem with a drawn chef hat. mood: smug | sad | gloat */
function kaleem(scene, x, y, mood) {
  const c = scene.add.container(x, y);
  const body = scene.add.graphics();
  roundedBox(body, 0, 118, 170, 120, 40, COLORS.secondary, { lip: 8, ow: 6, shadow: false });
  body.fillStyle(COLORS.white, 1).fillTriangle(-30, 66, 30, 66, 0, 112);
  body.lineStyle(5, COLORS.ink, 1).strokeTriangle(-30, 66, 30, 66, 0, 112);
  const face = E(scene, 0, 0, mood === 'sad' ? '😭' : mood === 'gloat' ? '😈' : '😏', 150);
  const hat = scene.add.graphics();
  const puff = (col, grow) => {
    hat.fillStyle(col, 1);
    hat.fillCircle(-40, -112, 40 + grow).fillCircle(40, -112, 40 + grow).fillCircle(0, -134, 46 + grow);
    hat.fillRoundedRect(-62 - grow, -112, 124 + grow * 2, 70 + grow, 14);
  };
  puff(COLORS.ink, 6);
  puff(COLORS.white, 0);
  hat.fillStyle(COLORS.cream2, 1).fillRoundedRect(-58, -78, 116, 16, 6);
  c.add([body, face, hat]);
  scene.tweens.add({ targets: c, y: y - 8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return c;
}

/**
 * Rival Battle dialog with Chef Kaleem.
 * data.mode: 'intro' (accept/later) | 'win' | 'lose'. Result data: { win, reward, level }
 */
export const rivalScreen = {
  size: (data) => ({ title: t('rival.title'), w: 640, h: data.mode === 'intro' ? 1070 : 960, ribbon: COLORS.secondary }),
  build(popup, scene, app, data) {
    const c = popup.content;
    const mode = data.mode ?? 'intro';
    const idx = app.rival.dialogueIndex % KALEEM_LINES;
    const key = mode === 'intro' ? 'kaleem.intro.' : mode === 'win' ? 'kaleem.win.' : 'kaleem.lose.';
    const k = kaleem(scene, 0, -290, mode === 'win' ? 'sad' : mode === 'lose' ? 'gloat' : 'smug');
    k.setScale(0.85);
    c.add(k);
    c.add(T(scene, 0, -118, t('rival.name'), 44, COLORS.secondary, { stroke: false }));

    // speech bubble
    const g = scene.add.graphics();
    roundedBox(g, 0, -4, 560, 150, 30, COLORS.white, { lip: 5, ow: 5, shadow: false, shine: false });
    c.add(g);
    c.add(T(scene, 0, -4, t(key + idx), 34, COLORS.ink, { stroke: false, wrap: 500 }));

    if (mode === 'intro') {
      const level = app.state.data.rival.battleLevel || app.state.level;
      c.add(T(scene, 0, 130, t('rival.rules', { n: rivalTarget(level), s: RIVAL_TIME_MS / 1000 }), 40, COLORS.ink, { stroke: false, wrap: 520 }));
      c.add(T(scene, 0, 215, t('rival.prize'), 34, COLORS.smoke, { stroke: false }));
      c.add(rewardRow(scene, rivalReward(level), 0, 270, 46));
      const go = new Button(scene, 0, 370, { w: 480, h: 104, color: COLORS.primary, icon: '⚔️', label: t('rival.accept'), fontSize: 42, onClick: () => { popup.close(); app.ui.startRivalBattle(); } });
      scene.tweens.add({ targets: go, scale: { from: 1, to: 1.05 }, duration: 560, yoyo: true, repeat: -1 });
      go.baseScale = 1;
      c.add(go);
      c.add(new Button(scene, 0, 466, { w: 300, h: 80, color: COLORS.smoke, label: t('btn.later'), fontSize: 36, onClick: () => popup.close() }));
    } else if (mode === 'win') {
      c.add(T(scene, 0, 130, t('rival.win'), 66, COLORS.success));
      c.add(T(scene, 0, 205, t('rival.prize'), 34, COLORS.smoke, { stroke: false }));
      c.add(rewardRow(scene, data.reward ?? {}, 0, 262, 46));
      c.add(new Button(scene, 0, 370, { w: 420, h: 104, color: COLORS.success, label: t('btn.awesome'), fontSize: 50, onClick: () => popup.close() }));
      app.ui.fx.confetti(70);
      app.audio.play('levelup');
      app.state.bus.emit('fx:coins', { x: 360, y: 880, n: 10 });
    } else {
      c.add(T(scene, 0, 130, t('rival.lose'), 66, COLORS.secondary));
      c.add(T(scene, 0, 212, t('rival.progress', { a: data.served ?? 0, b: data.target ?? 0 }), 56, COLORS.ink, { stroke: false }));
      c.add(new Button(scene, 0, 320, { w: 440, h: 100, color: COLORS.primary, icon: '⚔️', label: t('rival.retry'), fontSize: 44, onClick: () => { popup.close(); app.ui.startRivalBattle(); } }));
      c.add(new Button(scene, 0, 422, { w: 300, h: 80, color: COLORS.smoke, label: t('btn.later'), fontSize: 36, onClick: () => popup.close() }));
      app.audio.play('error');
    }
  },
};
