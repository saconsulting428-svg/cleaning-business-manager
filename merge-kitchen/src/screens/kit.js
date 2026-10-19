import Phaser from 'phaser';
// Shared building blocks for popup screens.
import { COLORS } from '../ui/theme.js';
import { roundedBox, boxImage } from '../ui/draw.js';
import { T, E, fmt } from '../ui/text.js';
import { skinById } from '../data/rewards.js';

/** White inner card */
export function card(scene, x, y, w, h, color = COLORS.white, r = 28) {
  return boxImage(scene, w, h, r, color, { lip: 6, ow: 5, shadow: false, shine: false }).setPosition(x, y);
}

/**
 * Horizontal row of reward chips (coin / gem / energy / skin) centred on (x, y).
 * reward = { coins, gems, energy, skin }
 */
export function rewardRow(scene, reward, x = 0, y = 0, size = 36, color = COLORS.ink) {
  const parts = [];
  if (reward.coins) parts.push({ key: 'ico_coin', text: fmt(reward.coins) });
  if (reward.gems) parts.push({ key: 'ico_gem', text: fmt(reward.gems) });
  if (reward.energy) parts.push({ key: 'ico_bolt', text: '+' + reward.energy });
  if (reward.skin) parts.push({ emoji: skinById(reward.skin).emoji, text: '' });
  const c = scene.add.container(x, y);
  const icon = size * 1.05;
  const items = parts.map((p) => {
    const txt = p.text ? T(scene, 0, 0, p.text, size, color, { ox: 0, stroke: false }) : null;
    const w = icon + (txt ? txt.width + 4 : 0);
    return { p, txt, w };
  });
  const gap = 18;
  const total = items.reduce((a, i) => a + i.w, 0) + gap * (items.length - 1);
  let cx = -total / 2;
  items.forEach(({ p, txt, w }) => {
    const ic = p.key ? scene.add.image(cx + icon / 2, 0, p.key).setDisplaySize(icon, icon) : E(scene, cx + icon / 2, 0, p.emoji, size, { shadow: false });
    c.add(ic);
    if (txt) { txt.setPosition(cx + icon + 4, 0); c.add(txt); }
    cx += w + gap;
  });
  return c;
}

/** Big centred title text used inside popups */
export function heading(scene, text, y, size = 44, color = COLORS.ink) {
  return T(scene, 0, y, text, size, color, { stroke: false, wrap: 520 });
}

/** Run `fn` every `ms` while the popup exists */
export function popupTimer(popup, scene, ms, fn) {
  const ev = scene.time.addEvent({ delay: ms, loop: true, callback: fn });
  popup.once('destroy', () => ev.remove());
  fn();
  return ev;
}

/** iOS-style ON/OFF switch. onChange(newValue) */
export function makeToggle(scene, x, y, on, onChange) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const label = T(scene, 0, 0, '', 32, COLORS.white);
  const knob = scene.add.graphics();
  c.add([g, label, knob]);
  c.setSize(150, 70);
  const draw = (v) => {
    g.clear();
    roundedBox(g, 0, 0, 150, 66, 33, v ? COLORS.success : COLORS.locked, { lip: 4, ow: 5, shine: false, shadow: false });
    knob.clear();
    knob.fillStyle(COLORS.ink, 1).fillCircle(0, 0, 25);
    knob.fillStyle(COLORS.white, 1).fillCircle(0, -1, 21);
    knob.x = v ? 38 : -38;
    label.setText(v ? 'ON' : 'OFF').setX(v ? -22 : 24);
  };
  let value = on;
  draw(value);
  c.setInteractive(new Phaser.Geom.Rectangle(-10, -10, 170, 90), Phaser.Geom.Rectangle.Contains);
  c.on('pointerup', () => { value = !value; draw(value); scene.tweens.add({ targets: knob, scale: { from: 1.25, to: 1 }, duration: 180, ease: 'Back.easeOut' }); onChange(value); });
  return c;
}
