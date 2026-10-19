import { COLORS, STAGE_PALETTES, DEPTH, css, shade } from '../ui/theme.js';
import { roundedBox } from '../ui/draw.js';
import { W, H, CUSTOMER, BOARD } from '../ui/layout.js';

function paintPattern(ctx, kind, accent) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = css(accent);
  const maxY = 440;
  if (kind === 'dots') {
    for (let y = 20; y < maxY; y += 56) for (let x = ((y / 56) % 2) * 28; x < W; x += 56) { ctx.beginPath(); ctx.arc(x + 14, y, 7, 0, 7); ctx.fill(); }
  } else if (kind === 'stripes') {
    for (let x = 0; x < W; x += 72) ctx.fillRect(x, 0, 36, maxY);
  } else if (kind === 'diamonds') {
    for (let y = 0; y < maxY; y += 64) for (let x = ((y / 64) % 2) * 32; x < W + 32; x += 64) { ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 20, y); ctx.lineTo(x, y + 20); ctx.lineTo(x - 20, y); ctx.closePath(); ctx.fill(); }
  } else if (kind === 'checks') {
    for (let y = 0; y < maxY; y += 60) for (let x = ((y / 60) % 2) * 60; x < W; x += 120) ctx.fillRect(x, y, 60, 60);
  } else if (kind === 'stars') {
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 60; i++) { const x = (i * 97) % W, y = (i * 61) % maxY, r = 2 + (i % 4); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}

/** Stage-themed scene backdrop (generated once per stage) + wooden counter. */
export class Background {
  constructor(scene) {
    this.scene = scene;
    this.image = scene.add.image(0, 0, '__DEFAULT').setOrigin(0).setDepth(DEPTH.bg);
    this.counter = scene.add.graphics().setDepth(DEPTH.counter + 10);
    this.drawCounter();
    this.stageId = null;
  }

  textureFor(stageId) {
    const key = 'bg_' + stageId;
    if (this.scene.textures.exists(key)) return key;
    const p = STAGE_PALETTES[stageId];
    const tex = this.scene.textures.createCanvas(key, W, H);
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 470);
    g.addColorStop(0, css(p.top));
    g.addColorStop(1, css(p.bottom));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    paintPattern(ctx, p.pattern, p.accent);
    // floor behind the board
    const f = ctx.createLinearGradient(0, 430, 0, H);
    f.addColorStop(0, css(shade(p.floor, 0.05)));
    f.addColorStop(1, css(shade(p.floor, -0.35)));
    ctx.fillStyle = f; ctx.fillRect(0, 430, W, H - 430);
    ctx.globalAlpha = 0.12; ctx.fillStyle = css(COLORS.ink);
    for (let y = 470; y < H; y += 70) ctx.fillRect(0, y, W, 4);
    ctx.globalAlpha = 1;
    // scalloped awning under the HUD
    const aw = 60, ay = 150;
    for (let i = 0; i * aw < W + aw; i++) {
      ctx.fillStyle = css(i % 2 ? p.awningB : p.awningA);
      ctx.fillRect(i * aw, ay - 8, aw, 38);
      ctx.beginPath(); ctx.arc(i * aw + aw / 2, ay + 30, aw / 2, 0, Math.PI); ctx.fill();
      ctx.strokeStyle = css(COLORS.ink); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(i * aw + aw / 2, ay + 30, aw / 2 - 2, 0, Math.PI); ctx.stroke();
    }
    ctx.fillStyle = css(COLORS.ink); ctx.fillRect(0, ay + 28, W, 0);
    tex.refresh();
    return key;
  }

  setStage(stageId) {
    if (this.stageId === stageId) return;
    this.stageId = stageId;
    this.image.setTexture(this.textureFor(stageId));
  }

  drawCounter() {
    const g = this.counter;
    g.clear();
    const y = CUSTOMER.counterY;
    // counter top
    g.fillStyle(COLORS.ink, 0.3).fillRect(0, y + 8, W, 66);
    g.fillStyle(COLORS.ink, 1).fillRect(0, y - 6, W, 70);
    g.fillStyle(shade(COLORS.wood, 0.3), 1).fillRect(0, y, W, 20);
    g.fillStyle(COLORS.wood, 1).fillRect(0, y + 20, W, 38);
    g.fillStyle(COLORS.woodDark, 0.55);
    for (let x = 60; x < W; x += 120) g.fillRect(x, y + 22, 4, 34);
    g.fillStyle(COLORS.white, 0.2).fillRect(0, y + 2, W, 5);
  }
}
