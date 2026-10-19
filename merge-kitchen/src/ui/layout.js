// Fixed 720x1280 (9:16) design canvas. Phaser's FIT scale mode letterboxes it on any phone.
export const W = 720;
export const H = 1280;

export const HUD_H = 168;

export const BOARD = { cols: 6, rows: 6, cell: 96, x: 72, y: 446, size: 36 };

export const SLOT_X = [120, 360, 600];
export const CUSTOMER = { headY: 305, counterY: 376, barY: 408, bubbleDX: 62, bubbleY: 236 };

export const STRIP_Y = 1082;
export const SELL = { x: 140, y: STRIP_Y, w: 230, h: 62 };

export const BOTTOM = {
  y: 1128,
  spawn: { x: 360, y: 1190, r: 82 },
  sideY: 1208,
  side: [70, 196, 524, 650],
};
