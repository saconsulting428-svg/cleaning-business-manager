import Phaser from 'phaser';
import { COLORS } from '../ui/theme.js';
import { W, H } from '../ui/layout.js';
import { T, E } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { Background } from '../game/Background.js';
import { stageFor } from '../data/levels.js';
import { CHAINS } from '../data/items.js';
import { skinById } from '../data/rewards.js';
import { t } from '../data/i18n.js';

/** Main menu: animated logo + chef + Play button. UI overlay shows currencies on top. */
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const app = (this.app = this.registry.get('app'));
    app.state.mode = 'menu';
    app.ui?.setMode('menu');
    const bg = new Background(this);
    bg.setStage(stageFor(app.state.level).id);
    bg.counter.setVisible(false);

    // drifting food in the background
    const foods = CHAINS.flatMap((c) => c.tiers.map((x) => x.emoji));
    for (let i = 0; i < 12; i++) {
      const f = E(this, Phaser.Math.Between(40, W - 40), Phaser.Math.Between(300, H), Phaser.Utils.Array.GetRandom(foods), Phaser.Math.Between(48, 84), { shadow: false }).setAlpha(0.35);
      this.tweens.add({ targets: f, y: f.y - Phaser.Math.Between(200, 480), angle: Phaser.Math.Between(-30, 30), duration: Phaser.Math.Between(4000, 8000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const logo = this.add.container(W / 2, 330);
    logo.add([T(this, 0, -40, 'Merge', 120, COLORS.white), T(this, 0, 70, 'Kitchen', 120, COLORS.gold), T(this, 0, 170, t('app.sub').toUpperCase(), 52, COLORS.white)]);
    this.tweens.add({ targets: logo, scale: { from: 0.96, to: 1.04 }, angle: { from: -2, to: 2 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const chef = E(this, W / 2, 700, skinById(app.state.data.skins.selected).emoji, 230);
    this.tweens.add({ targets: chef, y: 680, scaleX: { from: 1, to: 1.05 }, scaleY: { from: 1, to: 0.96 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    T(this, W / 2, 870, t('menu.tagline'), 38, COLORS.white, { wrap: 600 });

    const play = new Button(this, W / 2, 1000, { w: 420, h: 128, r: 48, color: COLORS.primary, label: t('menu.play'), fontSize: 72, onClick: () => this.play() });
    this.tweens.add({ targets: play, scale: { from: 1, to: 1.06 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    play.baseScale = 1;
    this.playBtn = play;

    this.daily = new Button(this, 150, 1140, { w: 220, h: 96, r: 34, color: COLORS.gem, icon: '📅', label: t('menu.daily'), fontSize: 34, iconSize: 44, onClick: () => app.ui.openPopup('daily') });
    this.daily.attachBadge();
    this.settings = new Button(this, 570, 1140, { w: 220, h: 96, r: 34, color: COLORS.smoke, icon: '⚙️', label: t('btn.settings'), fontSize: 34, iconSize: 44, onClick: () => app.ui.openPopup('settings') });
  }

  play() {
    this.app.audio.play('success');
    this.scene.start('Game');
  }
}
