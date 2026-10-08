// Baked (rendered once per level / resize) environment: textured floors, walls with depth, cast shadows,
// detailed furniture and ambient lighting. Drawing this once keeps the per-frame cost low on phones.
import { K, tileKind } from './grid.js';
import { rr } from './props.js';

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shade(hex, d) {
  const n = parseInt(hex.slice(1), 16);
  const c = (s) => Math.max(0, Math.min(255, ((n >> s) & 255) + d));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
const hash = (x, y, l) => ((x * 73856093) ^ (y * 19349663) ^ (l * 83492791)) >>> 0;

export function bakeStatic(ctx, view, dpr) {
  const { ts, ox, oy, W, H } = view;
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const wd = ctx.world;
  const L = ctx.def.level;
  const R = rng(L * 977 + 13);
  const isWall = (x, y) => tileKind(ctx, x, y) === K.WALL;
  const X = (x) => ox + x * ts, Y = (y) => oy + y * ts;

  // outside darkness
  const bg = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, Math.max(W, H) * 0.8);
  bg.addColorStop(0, '#0d111c'); bg.addColorStop(1, '#04060b');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  // ---------------- floors
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    if (isWall(x, y)) continue;
    floorTile(g, wd, X(x), Y(y), ts, x, y, R);
  }
  // doormat at the entrance
  const sx = X(ctx.start.x), sy = Y(ctx.start.y);
  g.fillStyle = 'rgba(8,10,16,.75)'; rr(g, sx + ts * 0.1, sy + ts * 0.14, ts * 0.8, ts * 0.72, 4); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; rr(g, sx + ts * 0.16, sy + ts * 0.2, ts * 0.68, ts * 0.6, 3); g.stroke();

  // ---------------- ambient occlusion + wall shadows cast on the floor (light from the upper left)
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    if (isWall(x, y)) continue;
    const px = X(x), py = Y(y);
    if (isWall(x, y - 1)) edge(g, px, py, ts, 'n', ts * 0.55, 0.6);
    if (isWall(x - 1, y)) edge(g, px, py, ts, 'w', ts * 0.42, 0.5);
    if (isWall(x + 1, y)) edge(g, px, py, ts, 'e', ts * 0.2, 0.28);
    if (isWall(x, y + 1)) edge(g, px, py, ts, 's', ts * 0.18, 0.28);
  }

  // ---------------- walls with a visible south face
  const fh = ts * 0.3;
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    if (!isWall(x, y)) continue;
    const px = X(x), py = Y(y);
    const southOpen = !isWall(x, y + 1) && y + 1 < ctx.h;
    const capH = southOpen ? ts - fh : ts;
    const cg = g.createLinearGradient(px, py, px + ts, py + capH);
    cg.addColorStop(0, shade(wd.wallTop, 6)); cg.addColorStop(1, shade(wd.wallTop, -26));
    g.fillStyle = cg; g.fillRect(px, py, ts + 0.5, capH + 0.5);
    // plaster / concrete grain + faint block joints so large wall masses do not look like flat slabs
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '0,0,0'},${0.02 + R() * 0.05})`; g.fillRect(px + R() * ts, py + R() * capH, 1 + R() * 4, 1 + R() * 2); }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
    g.strokeRect(px + 0.5, py + 0.5, ts - 1, capH - 1);
    // inner bevel: darker inset so the top reads as a thick slab with depth
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(px + 3, py + 3, ts - 6, Math.max(0, capH - 6));
    // rim highlights where the cap meets open floor
    g.fillStyle = 'rgba(255,255,255,.16)';
    if (!isWall(x, y - 1)) g.fillRect(px, py, ts + 0.5, 1.3);
    if (!isWall(x - 1, y)) g.fillRect(px, py, 1.3, capH);
    if (southOpen) {
      const fg = g.createLinearGradient(0, py + capH, 0, py + ts);
      fg.addColorStop(0, wd.wallFace || '#1a1e2c'); fg.addColorStop(1, '#07080d');
      g.fillStyle = fg; g.fillRect(px, py + capH, ts + 0.5, fh + 0.5);
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(px, py + capH, ts + 0.5, 1.2);           // top edge catches light
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(px, py + ts - fh * 0.28, ts + 0.5, fh * 0.28); // skirting board
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(px, py + ts - fh * 0.28, ts + 0.5, 1);
      g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 1;                                   // wallpaper panel lines
      for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(px + (ts * k) / 3, py + capH + 2); g.lineTo(px + (ts * k) / 3, py + ts - fh * 0.3); g.stroke(); }
    }
  }
  // wall base shadow falling onto the floor below each south face
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    if (isWall(x, y) && !isWall(x, y + 1) && y + 1 < ctx.h) edge(g, X(x), Y(y + 1), ts, 'n', ts * 0.35, 0.5);
  }

  // ---------------- furniture
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    if (tileKind(ctx, x, y) !== K.FURN) continue;
    furniture(g, X(x), Y(y), ts, hash(x, y, L) % 4, hash(x, y, L + 5), isWall(x, y - 1), isWall(x - 1, y));
  }

  // ---------------- ambient light: darken everything, then warm lamp pools
  g.fillStyle = 'rgba(5,9,22,.34)'; g.fillRect(0, 0, W, H);
  const floors = [];
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) if (tileKind(ctx, x, y) === K.FLOOR) floors.push([x, y]);
  g.globalCompositeOperation = 'lighter';
  const lamps = Math.min(3, Math.max(1, Math.round(floors.length / 22)));
  for (let i = 0; i < lamps && floors.length; i++) {
    const [lx, ly] = floors[Math.floor(R() * floors.length)];
    const gr = g.createRadialGradient(X(lx + 0.5), Y(ly + 0.5), 0, X(lx + 0.5), Y(ly + 0.5), ts * 3.6);
    gr.addColorStop(0, 'rgba(255,196,120,.13)'); gr.addColorStop(1, 'rgba(255,196,120,0)');
    g.fillStyle = gr; g.fillRect(X(lx - 4), Y(ly - 4), ts * 9, ts * 9);
  }
  // cool moonlight wash from the top
  const ml = g.createLinearGradient(0, oy, 0, oy + ctx.h * ts);
  ml.addColorStop(0, 'rgba(90,120,200,.07)'); ml.addColorStop(1, 'rgba(90,120,200,0)');
  g.fillStyle = ml; g.fillRect(ox, oy, ctx.w * ts, ctx.h * ts);
  g.globalCompositeOperation = 'source-over';
  return c;
}

export function bakeVignette(W, H, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.max(W, H) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,4,10,.62)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}

function edge(g, px, py, ts, side, len, a) {
  let gr;
  if (side === 'n') { gr = g.createLinearGradient(0, py, 0, py + len); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px, py, ts + 0.5, len); }
  else if (side === 's') { gr = g.createLinearGradient(0, py + ts, 0, py + ts - len); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px, py + ts - len, ts + 0.5, len); }
  else if (side === 'w') { gr = g.createLinearGradient(px, 0, px + len, 0); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px, py, len, ts + 0.5); }
  else { gr = g.createLinearGradient(px + ts, 0, px + ts - len, 0); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px + ts - len, py, len, ts + 0.5); }
}

function floorTile(g, wd, px, py, ts, x, y, R) {
  const base = wd.floor[(x + y) & 1];
  const style = wd.style || 'wood';
  if (style === 'wood') {
    const n = 4, h = ts / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = shade(base, Math.round((R() - 0.5) * 16));
      g.fillRect(px, py + i * h, ts + 0.5, h + 0.5);
      g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(px, py + (i + 1) * h - 1, ts + 0.5, 1.1);          // gap between boards
      g.fillStyle = 'rgba(255,235,210,.05)'; g.fillRect(px, py + i * h, ts + 0.5, 1);
      const sx = px + R() * ts; g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(sx, py + i * h, 1, h);      // butt joint
      g.strokeStyle = 'rgba(255,230,200,.045)'; g.lineWidth = 1;
      for (let k = 0; k < 2; k++) { const gy = py + i * h + R() * h; g.beginPath(); g.moveTo(px + R() * ts * 0.4, gy); g.lineTo(px + ts * (0.5 + R() * 0.5), gy + (R() - 0.5) * 2); g.stroke(); }
    }
  } else if (style === 'carpet') {
    g.fillStyle = base; g.fillRect(px, py, ts + 0.5, ts + 0.5);
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '0,0,0'},${R() * 0.06})`; g.fillRect(px + R() * ts, py + R() * ts, 1.5, 1.5); }
  } else if (style === 'marble') {
    g.fillStyle = shade(base, Math.round((R() - 0.5) * 10)); g.fillRect(px, py, ts + 0.5, ts + 0.5);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
    for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(px + R() * ts, py); g.bezierCurveTo(px + R() * ts, py + ts * 0.3, px + R() * ts, py + ts * 0.7, px + R() * ts, py + ts); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
  } else { // stone / tile
    g.fillStyle = shade(base, Math.round((R() - 0.5) * 12)); g.fillRect(px, py, ts + 0.5, ts + 0.5);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.2; g.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
    g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(px + 1, py + 1, ts - 2, 1);
  }
}

const FABRICS = ['#3d4f5a', '#5a3340', '#444a3a', '#4a4558'];
function furniture(g, px, py, ts, type, h, wallN, wallW) {
  const x = px + ts * 0.08, y = py + ts * 0.08, w = ts * 0.84, hh = ts * 0.84;
  for (let i = 3; i >= 1; i--) { g.fillStyle = `rgba(0,0,0,${0.5 / 3})`; rr(g, x + ts * 0.05 + i, y + ts * 0.1 + i * 1.3, w, hh, ts * 0.07 + i); g.fill(); }
  if (type === 0) {                                  // dresser / cabinet
    const gr = g.createLinearGradient(x, y, x + w, y + hh); gr.addColorStop(0, '#7b5a3d'); gr.addColorStop(1, '#4a3626');
    g.fillStyle = gr; rr(g, x, y, w, hh, ts * 0.05); g.fill();
    g.strokeStyle = 'rgba(255,230,200,.22)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(255,235,210,.14)'; g.fillRect(x + 2, y + 2, w - 4, hh * 0.18);              // gloss on top
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.strokeRect(x + w * 0.08, y + hh * 0.3, w * 0.84, hh * 0.28); g.strokeRect(x + w * 0.08, y + hh * 0.62, w * 0.84, hh * 0.28);
    g.fillStyle = '#d2b06a'; g.fillRect(x + w * 0.42, y + hh * 0.43, w * 0.16, 2); g.fillRect(x + w * 0.42, y + hh * 0.75, w * 0.16, 2);
    g.fillStyle = '#2b3447'; rr(g, x + w * 0.62, y + hh * 0.06, w * 0.2, hh * 0.18, 2); g.fill();      // small lamp base on top
  } else if (type === 1) {                           // sofa
    const f = FABRICS[h % 4];
    g.fillStyle = shade(f, -18); rr(g, x, y, w, hh, ts * 0.1); g.fill();
    const back = wallN || !wallW;                    // backrest against the wall if there is one
    g.fillStyle = shade(f, 8); if (back) rr(g, x + 2, y + 2, w - 4, hh * 0.32, ts * 0.08); else rr(g, x + 2, y + 2, w * 0.3, hh - 4, ts * 0.08); g.fill();
    g.fillStyle = shade(f, 24);
    if (back) { rr(g, x + w * 0.1, y + hh * 0.38, w * 0.38, hh * 0.52, ts * 0.06); g.fill(); rr(g, x + w * 0.52, y + hh * 0.38, w * 0.38, hh * 0.52, ts * 0.06); g.fill(); }
    else { rr(g, x + w * 0.38, y + hh * 0.1, w * 0.52, hh * 0.38, ts * 0.06); g.fill(); rr(g, x + w * 0.38, y + hh * 0.52, w * 0.52, hh * 0.38, ts * 0.06); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 3, y + 3, w - 6, 2);
  } else if (type === 2) {                           // round table with a lamp / cup
    const gr = g.createRadialGradient(x + w * 0.38, y + hh * 0.35, 2, x + w / 2, y + hh / 2, w * 0.55);
    gr.addColorStop(0, '#a07a52'); gr.addColorStop(1, '#52391f');
    g.fillStyle = gr; g.beginPath(); g.arc(x + w / 2, y + hh / 2, w * 0.46, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,235,210,.25)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x + w * 0.4, y + hh * 0.36, w * 0.18, hh * 0.1, -0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8e2d2'; g.beginPath(); g.arc(x + w * 0.58, y + hh * 0.56, w * 0.09, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a2a1c'; g.beginPath(); g.arc(x + w * 0.58, y + hh * 0.56, w * 0.055, 0, Math.PI * 2); g.fill();
  } else {                                           // bookshelf seen from above
    g.fillStyle = '#3a2a1d'; rr(g, x, y, w, hh, ts * 0.04); g.fill();
    g.strokeStyle = 'rgba(255,230,200,.2)'; g.stroke();
    const cols = ['#8c2f39', '#2f5d8c', '#c9a14a', '#3d6b4f', '#6b4a8c', '#b5b5c0'];
    for (let r = 0; r < 3; r++) {
      let bx = x + w * 0.07;
      for (let i = 0; i < 8; i++) { const bw = w * (0.07 + ((h >> i) & 3) * 0.015); g.fillStyle = cols[(h + i + r) % 6]; g.fillRect(bx, y + hh * (0.1 + r * 0.29), bw, hh * 0.22); bx += bw + 1; if (bx > x + w * 0.9) break; }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + w * 0.05, y + hh * (0.34 + r * 0.29), w * 0.9, 1.5);
    }
  }
}
