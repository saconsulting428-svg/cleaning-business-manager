import Phaser from 'phaser';
import { COLORS } from '../ui/theme.js';
import { T, E } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { ScrollPane } from '../ui/ScrollPane.js';
import { roundedCircle } from '../ui/draw.js';
import { ALBUM_CHAINS, ITEM_LIST, itemName, chainName } from '../data/items.js';
import { ALBUM_MILESTONES } from '../data/rewards.js';
import { t } from '../data/i18n.js';
import { itemTexture, silhouetteTexture } from '../game/textures.js';
import { rewardRow } from './kit.js';

const rewardText = (m) => [m.coins && `+${m.coins} 🪙`, m.gems && `+${m.gems} 💎`, m.energy && `+${m.energy} ⚡`].filter(Boolean).join('  ');

/** Dish collection: silhouettes for undiscovered dishes + milestone rewards. */
export const albumScreen = {
  size: () => ({ title: t('album.title'), w: 640, h: 1040, ribbon: COLORS.grape }),
  build(popup, scene, app) {
    const c = popup.content;
    const state = app.state;
    const found = state.data.discovered.length;
    const total = ITEM_LIST.length;

    c.add(T(scene, 0, -400, t('album.found', { a: found, b: total }), 40, COLORS.ink, { stroke: false }));
    const bar = new ProgressBar(scene, 0, -345, 500, 40, { color: COLORS.grape, label: false, value: found / total });
    c.add(bar);

    // milestone medallions
    const mile = scene.add.container(0, -255);
    c.add(mile);
    const renderMilestones = () => {
      mile.removeAll(true);
      const n = ALBUM_MILESTONES.length;
      ALBUM_MILESTONES.forEach((m, i) => {
        const x = (i - (n - 1) / 2) * 100;
        const claimed = state.data.album.claimed.includes(m.count);
        const reached = state.data.discovered.length >= m.count;
        const g = scene.add.graphics();
        roundedCircle(g, 0, 0, 36, claimed ? COLORS.success : reached ? COLORS.gold : COLORS.locked, { lip: 5, ow: 5 });
        const cell = scene.add.container(x, 0, [g, T(scene, 0, -2, claimed ? '✔' : String(m.count), 38, COLORS.white)]);
        cell.setSize(90, 90);
        cell.setInteractive(new Phaser.Geom.Rectangle(-6, -6, 102, 102), Phaser.Geom.Rectangle.Contains);
        if (reached && !claimed) scene.tweens.add({ targets: cell, scale: { from: 1, to: 1.14 }, duration: 450, yoyo: true, repeat: -1 });
        cell.on('pointerup', () => {
          if (claimed) return;
          if (!reached) { app.toast(t('album.milestone', { n: m.count }) + '  ' + rewardText(m)); return; }
          if (m.coins) state.addCoins(m.coins, { score: false });
          if (m.gems) state.addGems(m.gems);
          if (m.energy) app.energy.add(m.energy);
          state.data.album.claimed.push(m.count);
          state.save();
          app.audio.play('success');
          state.bus.emit('fx:coins', { x: 360 + x, y: 385, n: 6 });
          app.toast(rewardText(m));
          renderMilestones();
        });
        mile.add(cell);
        mile.add(rewardRow(scene, m.coins ? { coins: m.coins } : { gems: m.gems }, x, 64, 32));
      });
    };
    renderMilestones();

    // scrolling dish grid
    const pane = new ScrollPane(scene, popup, { x: 0, y: 180, w: 580, h: 640 });
    let y = 0;
    ALBUM_CHAINS.forEach((ch) => {
      const have = ch.tiers.filter((tr) => state.data.discovered.includes(tr.id)).length;
      pane.content.add(T(scene, 8, y + 22, `${chainName(ch)}   ${have}/${ch.tiers.length}`, 36, COLORS.ink, { ox: 0, stroke: false }));
      y += 52;
      ch.tiers.forEach((tr, i) => {
        const col = i % 7, row = Math.floor(i / 7);
        const known = state.data.discovered.includes(tr.id);
        const img = scene.add.image(42 + col * 82, y + 40 + row * 92, known ? itemTexture(scene, tr.id) : silhouetteTexture(scene, tr.id)).setScale(0.76);
        img.setInteractive();
        img.on('pointerup', (ptr) => { if (!pane.wasDrag && pane.inside(ptr)) app.toast(known ? `${tr.emoji}  ${itemName(tr.id)}` : t('album.locked')); });
        pane.content.add(img);
      });
      y += Math.ceil(ch.tiers.length / 7) * 92 + 28;
    });
    pane.setContentHeight(y);
  },
};
