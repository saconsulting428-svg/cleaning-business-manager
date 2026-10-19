// Single source of truth for every colour, font size and depth used in the game.
// No other file may contain a hex colour literal.

export const COLORS = Object.freeze({
  // brand tokens
  primary: 0xff8a1f,
  secondary: 0xe8412c,
  bgCream: 0xfff4e0,
  gold: 0xffc83d,
  gem: 0x3dc7ff,
  energy: 0x7ed957,
  ink: 0x3b2314,
  white: 0xffffff,
  // extended tokens
  cream2: 0xffe2b3,
  wood: 0xb06a3b,
  woodDark: 0x7a4526,
  boardFrame: 0x5a3520,
  cellA: 0xffecc9,
  cellB: 0xf6d8a4,
  locked: 0xa89684,
  success: 0x4cc35a,
  grape: 0x8e5be0,
  pink: 0xff6fa5,
  mint: 0x5fe0c0,
  sky: 0x8fd8ff,
  smoke: 0x6b5748,
});

// Colour of the tile rim per tier (index = tier-1). Tier 7+ reuse the last colour.
export const TIER_COLORS = [0xd9c9a8, 0x9be37a, 0x6fd0ff, 0xb28cff, 0xff9ad0, 0xffb347, 0xffd94a];

export const SHIRTS = [0xe8412c, 0x3dc7ff, 0x7ed957, 0xb28cff, 0xff6fa5, 0xffc83d, 0x5fe0c0, 0xff8a1f];

// Background palette for each restaurant stage (see data/levels.js)
export const STAGE_PALETTES = {
  cart: { top: 0x8fd8ff, bottom: 0xfff0c9, awningA: 0xe8412c, awningB: 0xfff4e0, floor: 0xc9a46e, pattern: 'dots', accent: 0xffffff },
  dhaba: { top: 0xffc983, bottom: 0xffe9b8, awningA: 0x2fae7a, awningB: 0xfff4e0, floor: 0xb06a3b, pattern: 'stripes', accent: 0xff8a1f },
  cafe: { top: 0xd5b8ff, bottom: 0xffe7f2, awningA: 0x8e5be0, awningB: 0xfff4e0, floor: 0xa87a58, pattern: 'diamonds', accent: 0xffffff },
  restaurant: { top: 0xff9a8a, bottom: 0xffe3c9, awningA: 0xb5251a, awningB: 0xffc83d, floor: 0x7a4526, pattern: 'checks', accent: 0xffc83d },
  hotel: { top: 0x6fb7ff, bottom: 0xe3f2ff, awningA: 0x1f6fd1, awningB: 0xffc83d, floor: 0x6b5748, pattern: 'diamonds', accent: 0xffc83d },
  global: { top: 0x2d1f5e, bottom: 0x7a5ad9, awningA: 0xffc83d, awningB: 0x3b2314, floor: 0x3b2314, pattern: 'stars', accent: 0xffc83d },
};

export const FONT = Object.freeze({
  family: '"Baloo 2", "Fredoka", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
  // Canvas is 720 wide; on a 360px phone the scale is 0.5, so 32 => 16px (accessibility minimum).
  xs: 32,
  sm: 36,
  md: 44,
  lg: 60,
  xl: 88,
});

export const DEPTH = Object.freeze({ bg: 0, counter: 5, customer: 10, board: 20, item: 30, drag: 100, fx: 200, hud: 300, popup: 500, toast: 700, top: 900 });

/** 0xRRGGBB -> '#rrggbb' (for Phaser text styles / CSS) */
export const css = (c) => '#' + (c & 0xffffff).toString(16).padStart(6, '0');

/** Lighten (f>0) or darken (f<0) a colour. f in [-1, 1]. */
export function shade(c, f) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  const m = (v) => Math.round((t - v) * p + v);
  return (m(r) << 16) | (m(g) << 8) | m(b);
}

export function mix(a, b, t) {
  const f = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (f(16) << 16) | (f(8) << 8) | f(0);
}

export const tierColor = (tier) => TIER_COLORS[Math.min(tier, TIER_COLORS.length) - 1];

/** Push theme tokens into CSS variables / meta tag so HTML chrome matches the game. */
export function applyThemeToDocument() {
  const root = document.documentElement;
  root.style.setProperty('--ink', css(COLORS.ink));
  root.style.setProperty('--cream', css(COLORS.bgCream));
  document.body.style.background = css(COLORS.ink);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', css(COLORS.ink));
}
