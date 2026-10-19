// All art is generated in code: no downloads, works offline.
import { COLORS, FONT, css, shade, tierColor } from '../ui/theme.js';
import { ITEMS } from '../data/items.js';

const TILE = 96;

function rrPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Create (or replace) a canvas texture and let `draw(ctx, w, h)` paint it. */
function canvasTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.getContext(), w, h);
  tex.refresh();
  return key;
}

function emojiFont(px) { return `${px}px ${FONT.family}`; }

/** Item tile: rounded card with a tier-coloured rim + emoji. Generated lazily per item. */
export function itemTexture(scene, id) {
  const key = 'item_' + id;
  if (scene.textures.exists(key)) return key;
  const def = ITEMS[id];
  const rim = tierColor(def.tier);
  return canvasTexture(scene, key, TILE, TILE, (ctx, w, h) => {
    // soft drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    rrPath(ctx, 6, 9, w - 12, h - 12, 24); ctx.fill();
    // ink outline
    ctx.fillStyle = css(COLORS.ink);
    rrPath(ctx, 4, 4, w - 8, h - 10, 24); ctx.fill();
    // tier body with vertical gradient
    const g = ctx.createLinearGradient(0, 8, 0, h - 8);
    g.addColorStop(0, css(shade(rim, 0.55)));
    g.addColorStop(1, css(rim));
    ctx.fillStyle = g;
    rrPath(ctx, 9, 9, w - 18, h - 20, 19); ctx.fill();
    // inner cream plate
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    rrPath(ctx, 15, 14, w - 30, h - 32, 15); ctx.fill();
    // emoji
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = emojiFont(54);
    ctx.fillStyle = css(COLORS.ink);
    ctx.fillText(def.emoji, w / 2, h / 2 - 1);
    // top-tier gold sparkle corner
    if (def.tier === def.maxTier) {
      ctx.fillStyle = css(COLORS.gold);
      ctx.strokeStyle = css(COLORS.ink);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(w - 18, 20, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = css(COLORS.ink);
      ctx.font = `800 15px ${FONT.family}`;
      ctx.fillText('★', w - 18, 21);
    }
  });
}

/** Dark silhouette of an item for undiscovered album entries */
export function silhouetteTexture(scene, id) {
  const key = 'sil_' + id;
  if (scene.textures.exists(key)) return key;
  const def = ITEMS[id];
  return canvasTexture(scene, key, TILE, TILE, (ctx, w, h) => {
    ctx.fillStyle = css(COLORS.ink);
    rrPath(ctx, 4, 4, w - 8, h - 10, 24); ctx.fill();
    ctx.fillStyle = css(COLORS.smoke);
    rrPath(ctx, 9, 9, w - 18, h - 20, 19); ctx.fill();
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const c2 = tmp.getContext('2d');
    c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.font = emojiFont(54);
    c2.fillText(def.emoji, w / 2, h / 2 - 1);
    c2.globalCompositeOperation = 'source-in';
    c2.fillStyle = css(COLORS.ink);
    c2.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(tmp, 0, 0);
    ctx.globalAlpha = 1;
  });
}

/** Generate the shared textures once at boot */
export function makeCoreTextures(scene) {
  // checkerboard cells
  [['cell_a', COLORS.cellA], ['cell_b', COLORS.cellB]].forEach(([key, col]) => {
    canvasTexture(scene, key, TILE, TILE, (ctx, w, h) => {
      ctx.fillStyle = css(shade(col, -0.18));
      rrPath(ctx, 2, 2, w - 4, h - 4, 20); ctx.fill();
      ctx.fillStyle = css(col);
      rrPath(ctx, 2, 2, w - 4, h - 8, 20); ctx.fill();
    });
  });
  // glow outline for valid merge targets / drop highlight
  canvasTexture(scene, 'cell_glow', 112, 112, (ctx, w, h) => {
    ctx.shadowColor = css(COLORS.energy);
    ctx.shadowBlur = 16;
    ctx.lineWidth = 7;
    ctx.strokeStyle = css(COLORS.white);
    rrPath(ctx, 12, 12, w - 24, h - 24, 22); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4;
    ctx.strokeStyle = css(COLORS.energy);
    rrPath(ctx, 12, 12, w - 24, h - 24, 22); ctx.stroke();
  });
  // radial glow (spotlights / pop flashes)
  canvasTexture(scene, 'glow', 256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });

  const gfx = scene.make.graphics({ x: 0, y: 0, add: false });
  const bake = (key, w, h, draw) => { gfx.clear(); draw(gfx); gfx.generateTexture(key, w, h); };

  // 4-point sparkle
  bake('spark', 32, 32, (g) => {
    g.fillStyle(COLORS.white, 1);
    g.fillPoints([{ x: 16, y: 0 }, { x: 20, y: 12 }, { x: 32, y: 16 }, { x: 20, y: 20 }, { x: 16, y: 32 }, { x: 12, y: 20 }, { x: 0, y: 16 }, { x: 12, y: 12 }], true);
  });
  bake('confetti', 18, 10, (g) => { g.fillStyle(COLORS.white, 1); g.fillRoundedRect(0, 0, 18, 10, 3); });
  bake('dot', 16, 16, (g) => { g.fillStyle(COLORS.white, 1); g.fillCircle(8, 8, 8); });
  // light ray wedge for the celebration spotlight
  bake('ray', 120, 600, (g) => {
    g.fillStyle(COLORS.white, 1);
    g.fillTriangle(60, 0, 0, 600, 120, 600);
  });

  // HUD icons - distinct SHAPES (circle / diamond / bolt), not just colours
  bake('ico_coin', 48, 48, (g) => {
    g.fillStyle(COLORS.ink, 1).fillCircle(24, 24, 22);
    g.fillStyle(shade(COLORS.gold, -0.25), 1).fillCircle(24, 25, 18);
    g.fillStyle(COLORS.gold, 1).fillCircle(24, 23, 18);
    g.lineStyle(3, shade(COLORS.gold, -0.3), 1).strokeCircle(24, 23, 11);
    g.fillStyle(COLORS.white, 0.6).fillEllipse(17, 13, 9, 5);
  });
  bake('ico_gem', 48, 48, (g) => {
    g.fillStyle(COLORS.ink, 1).fillPoints([{ x: 24, y: 2 }, { x: 45, y: 17 }, { x: 24, y: 47 }, { x: 3, y: 17 }], true);
    g.fillStyle(COLORS.gem, 1).fillPoints([{ x: 24, y: 8 }, { x: 38, y: 18 }, { x: 24, y: 40 }, { x: 10, y: 18 }], true);
    g.fillStyle(COLORS.white, 0.55).fillPoints([{ x: 24, y: 8 }, { x: 10, y: 18 }, { x: 24, y: 22 }], true);
    g.fillStyle(shade(COLORS.gem, -0.25), 1).fillPoints([{ x: 24, y: 22 }, { x: 38, y: 18 }, { x: 24, y: 40 }], true);
  });
  bake('ico_bolt', 48, 48, (g) => {
    const pts = [{ x: 28, y: 1 }, { x: 8, y: 26 }, { x: 21, y: 26 }, { x: 16, y: 47 }, { x: 40, y: 20 }, { x: 26, y: 20 }];
    g.fillStyle(COLORS.ink, 1).fillPoints(pts.map((p) => ({ x: p.x, y: p.y })), true);
    g.fillStyle(COLORS.energy, 1).fillPoints([{ x: 27, y: 8 }, { x: 14, y: 25 }, { x: 25, y: 25 }, { x: 21, y: 40 }, { x: 35, y: 22 }, { x: 24, y: 22 }], true);
  });
  bake('ico_star', 48, 48, (g) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 11 : 22;
      pts.push({ x: 24 + Math.cos(a) * r, y: 25 + Math.sin(a) * r });
    }
    g.fillStyle(COLORS.ink, 1).fillPoints(pts, true);
    g.fillStyle(COLORS.gold, 1).fillPoints(pts.map((p) => ({ x: 24 + (p.x - 24) * 0.78, y: 25 + (p.y - 25) * 0.78 })), true);
  });
  gfx.destroy();
}
