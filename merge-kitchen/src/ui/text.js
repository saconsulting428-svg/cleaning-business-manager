import { COLORS, FONT, css } from './theme.js';

/** Phaser text style: Baloo 2, chunky dark outline = high contrast on any background. */
export function textStyle(size = FONT.sm, color = COLORS.white, o = {}) {
  const style = {
    fontFamily: FONT.family,
    fontSize: `${Math.max(size, FONT.xs)}px`,
    fontStyle: o.weight || '800',
    color: css(color),
    align: o.align || 'center',
    padding: { x: 4, y: 6 },
    lineSpacing: o.lineSpacing ?? -6,
  };
  if (o.stroke !== false) {
    style.stroke = css(o.stroke ?? COLORS.ink);
    style.strokeThickness = o.strokeW ?? Math.max(4, Math.round(size / 7));
  }
  if (o.wrap) style.wordWrap = { width: o.wrap, useAdvancedWrap: true };
  return style;
}

/** Create a centred (by default) text object. */
export function T(scene, x, y, str, size = FONT.sm, color = COLORS.white, o = {}) {
  const t = scene.add.text(x, y, String(str), textStyle(size, color, o));
  t.setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  if (o.shadow) t.setShadow(0, 4, css(COLORS.ink), 0, false, true);
  return t;
}

/** Emoji glyph (no outline - outlines on colour emoji look muddy). */
export function E(scene, x, y, emoji, size = 56, o = {}) {
  const t = scene.add.text(x, y, emoji, {
    fontFamily: FONT.family,
    fontSize: `${size}px`,
    padding: { x: 6, y: 8 },
  });
  t.setOrigin(0.5);
  if (o.shadow !== false) t.setShadow(0, 4, css(COLORS.ink), 0, false, true);
  return t;
}

/** 12345 -> "12,345", 1.2M for big numbers */
export function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1e7) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  return n.toLocaleString('en-US');
}
