import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-800.css';
import Phaser from 'phaser';
import { applyThemeToDocument, COLORS, css } from './ui/theme.js';
import { W, H } from './ui/layout.js';
import { createSystems } from './systems/index.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

applyThemeToDocument();
const app = createSystems();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: css(COLORS.ink),
  width: W,
  height: H,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, powerPreference: 'high-performance', roundPixels: false },
  fps: { target: 60 },
  input: { activePointers: 1 },
  audio: { noAudio: true }, // we synthesise sound with our own WebAudio AudioSystem
  banner: false,
  callbacks: { preBoot: (g) => g.registry.set('app', app) },
  scene: [BootScene, MenuScene, GameScene, UIScene],
});

// handy for debugging / automated tests
window.__game = game;
window.__app = app;

// Offline support for the web build (Capacitor serves local files, so it needs no worker).
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.Capacitor?.isNativePlatform?.()) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
