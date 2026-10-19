// Full-screen celebrations: Level Up and New Dish discovered (spotlight, slow zoom, confetti).
import Phaser from 'phaser';
import { COLORS, TIER_COLORS, tierColor } from '../ui/theme.js';
import { T, E } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { roundedCircle } from '../ui/draw.js';
import { ITEMS, CHAINS, itemName, chainName } from '../data/items.js';
import { stageFor } from '../data/levels.js';
import { t, getLang } from '../data/i18n.js';
import { haptic } from '../systems/Platform.js';
import { itemTexture } from '../game/textures.js';
import { rewardRow } from './kit.js';

/** rotating light rays + glow behind the hero element */
function spotlight(popup, scene, tint = COLORS.gold, y = -120) {
  const c = scene.add.container(0, y);
  for (let i = 0; i < 12; i++) {
    c.add(scene.add.image(0, 0, 'ray').setOrigin(0.5, 1).setAngle(i * 30).setTint(tint).setAlpha(0.2));
  }
  c.add(scene.add.image(0, 0, 'glow').setTint(tint).setScale(3.6).setAlpha(0.85));
  scene.tweens.add({ targets: c, angle: 360, duration: 24000, repeat: -1 });
  popup.content.add(c);
  popup.content.sendToBack(c);
  return c;
}

export const levelupScreen = {
  size: () => ({ bare: true, closable: false, w: 720, h: 1280 }),
  build(popup, scene, app, ev) {
    const c = popup.content;
    app.audio.play('levelup');
    haptic([30, 40, 30, 40, 80]);
    app.ui.fx.confetti(90);
    spotlight(popup, scene, COLORS.gold, -290);

    const title = T(scene, 0, -500, t('level.title'), 104, COLORS.gold).setScale(0.3);
    scene.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: title, angle: { from: -2.5, to: 2.5 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(title);

    const g = scene.add.graphics();
    roundedCircle(g, 0, 0, 130, COLORS.gold, { lip: 12, ow: 10 });
    const badge = scene.add.container(0, -290, [g, T(scene, 0, -6, String(ev.level), 150, COLORS.white)]).setScale(0);
    scene.tweens.add({ targets: badge, scale: 1, duration: 600, delay: 200, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: badge, scale: { from: 1, to: 1.06 }, duration: 3500, yoyo: true, repeat: -1, delay: 900 });
    c.add(badge);

    // running cursor so stage + new food line + reward always stack without overlap
    let y = -110;
    if (ev.stage) {
      c.add(E(scene, 0, y, ev.stage.emoji, 84));
      c.add(T(scene, 0, y + 78, t('level.stage', { name: ev.stage.name[getLang()] ?? ev.stage.name.en }), 44, COLORS.white, { wrap: 620 }));
      y += 160;
    } else {
      c.add(T(scene, 0, y + 20, t('level.reached', { n: ev.level }), 54, COLORS.white));
      y += 90;
    }
    ev.chains.forEach((ch) => {
      c.add(T(scene, 0, y, t('level.unlock', { name: chainName(ch) }), 38, COLORS.energy, { wrap: 620 }));
      ch.tiers.slice(0, 3).forEach((tr, i) => {
        const img = scene.add.image((i - 1) * 96, y + 84, itemTexture(scene, tr.id)).setScale(0);
        scene.tweens.add({ targets: img, scale: 0.8, duration: 300, delay: 700 + i * 140, ease: 'Back.easeOut' });
        c.add(img);
      });
      y += 170;
    });
    c.add(T(scene, 0, y, t('level.reward'), 34, COLORS.cream2));
    c.add(rewardRow(scene, ev.reward, 0, y + 58, 54, COLORS.white));
    const btn = new Button(scene, 0, Math.min(540, y + 190), { w: 440, h: 110, color: COLORS.primary, label: t('btn.awesome'), fontSize: 56, onClick: () => popup.close() });
    scene.tweens.add({ targets: btn, scale: { from: 1, to: 1.05 }, duration: 600, yoyo: true, repeat: -1, delay: 800 });
    btn.baseScale = 1;
    c.add(btn);
    scene.time.delayedCall(900, () => app.state.bus.emit('fx:coins', { x: 360, y: 640 + y + 58, n: 8 }));
  },
};

/** New high-tier dish: spotlight + slow zoom + confetti */
export const dishScreen = {
  size: () => ({ bare: true, closable: false, w: 720, h: 1280 }),
  build(popup, scene, app, { id }) {
    const def = ITEMS[id];
    const c = popup.content;
    app.audio.play('levelup');
    haptic([20, 30, 20, 30, 70]);
    app.ui.fx.confetti(80);
    const tint = tierColor(def.tier);
    spotlight(popup, scene, tint, -80);

    const title = T(scene, 0, -420, t('dish.title'), 100, COLORS.gold).setScale(0.3);
    scene.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: title, angle: { from: -2.5, to: 2.5 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(title);

    const img = scene.add.image(0, -80, itemTexture(scene, id)).setScale(0.2).setAngle(-20);
    scene.tweens.add({ targets: img, scale: 3, angle: 0, duration: 650, ease: 'Back.easeOut', onComplete: () => {
      scene.tweens.add({ targets: img, scale: 3.5, duration: 4200, ease: 'Sine.easeOut' }); // slow zoom
    } });
    c.add(img);

    const name = T(scene, 0, 150, itemName(id), 80, COLORS.white, { wrap: 640 }).setAlpha(0);
    scene.tweens.add({ targets: name, alpha: 1, y: 160, duration: 400, delay: 500, ease: 'Quad.easeOut' });
    c.add(name);
    const chain = CHAINS.find((ch) => ch.id === def.chain);
    c.add(T(scene, 0, 225, `${chainName(chain)} · ${t('tier', { n: def.tier })}`, 38, COLORS.cream2));
    for (let i = 0; i < def.tier; i++) {
      const s = scene.add.image((i - (def.tier - 1) / 2) * 56, 290, 'ico_star').setScale(0);
      scene.tweens.add({ targets: s, scale: 1, duration: 260, delay: 700 + i * 90, ease: 'Back.easeOut' });
      c.add(s);
    }
    c.add(new Button(scene, 0, 480, { w: 440, h: 110, color: COLORS.primary, label: t('btn.awesome'), fontSize: 56, onClick: () => popup.close() }));
  },
};
