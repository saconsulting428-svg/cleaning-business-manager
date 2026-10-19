import Phaser from 'phaser';
import { COLORS, DEPTH, STAGE_PALETTES, css } from '../ui/theme.js';
import { W, H } from '../ui/layout.js';
import { T, E } from '../ui/text.js';
import { ProgressBar } from '../ui/ProgressBar.js';
import { makeCoreTextures, itemTexture, prebakeGameplay } from '../game/textures.js';
import { ITEM_LIST } from '../data/items.js';
import { t } from '../data/i18n.js';

/** Splash / loading: bakes all generated textures, waits for the font, then opens the Menu. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  async create() {
    // font first (bundled via @fontsource, so it also works offline)
    try {
      await Promise.race([
        Promise.all([document.fonts.load('800 40px "Baloo 2"'), document.fonts.load('600 40px "Baloo 2"')]),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
    } catch { /* fallback font */ }

    const sky = this.add.graphics();
    sky.fillGradientStyle(STAGE_PALETTES.cart.top, STAGE_PALETTES.cart.top, STAGE_PALETTES.cart.bottom, STAGE_PALETTES.cart.bottom, 1);
    sky.fillRect(0, 0, W, H);
    const chef = E(this, W / 2, 470, '👨‍🍳', 190);
    this.tweens.add({ targets: chef, y: 450, angle: { from: -4, to: 4 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    T(this, W / 2, 690, 'Merge Kitchen', 92, COLORS.white);
    T(this, W / 2, 782, t('app.sub').toUpperCase(), 52, COLORS.gold);
    const bar = new ProgressBar(this, W / 2, 960, 460, 44, { color: COLORS.energy, label: false });
    T(this, W / 2, 1030, t('loading'), 34, COLORS.white);

    makeCoreTextures(this);
    bar.setValue(0.35, true);
    await new Promise((r) => requestAnimationFrame(() => r()));
    ITEM_LIST.forEach((it) => itemTexture(this, it.id));
    prebakeGameplay(this);
    bar.setValue(0.8, true);
    await new Promise((r) => setTimeout(r, 450));
    bar.setValue(1, true);
    await new Promise((r) => setTimeout(r, 250));

    this.scene.launch('UI');
    this.scene.start('Menu');
  }
}
