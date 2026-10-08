// Animated / state-dependent props drawn every frame on top of the baked environment:
// doors, wardrobes, loot, keys, exit, alarm plates, CCTV, lasers, light beams.
const TAU = Math.PI * 2;

export function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function glow(g, x, y, r, rgb, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function dropShadow(g, x, y, w, h, r, a = 0.45) {
  for (let i = 3; i >= 1; i--) { g.fillStyle = `rgba(0,0,0,${a / 3})`; rr(g, x + w * 0.05 + i, y + h * 0.1 + i * 1.2, w + i, h + i, r + i); g.fill(); }
}

// ------------------------------------------------------------------ wardrobe (hiding spot)
export function drawWardrobe(g, px, py, ts, hiddenInside, t) {
  const x = px + ts * 0.08, y = py + ts * 0.06, w = ts * 0.84, h = ts * 0.86;
  dropShadow(g, x, y, w, h, ts * 0.06, 0.5);
  const wg = g.createLinearGradient(x, y, x + w, y);
  wg.addColorStop(0, '#3b2a1d'); wg.addColorStop(0.5, '#5a4130'); wg.addColorStop(1, '#33241a');
  g.fillStyle = wg; rr(g, x, y, w, h, ts * 0.05); g.fill();
  g.strokeStyle = 'rgba(255,230,200,.18)'; g.lineWidth = 1; g.stroke();
  // top cornice highlight
  g.fillStyle = 'rgba(255,235,210,.22)'; g.fillRect(x + 2, y + 1, w - 4, ts * 0.04);
  const open = hiddenInside ? ts * 0.035 : 0;
  for (const side of [-1, 1]) {            // two doors with raised panels
    const dx = side < 0 ? x + ts * 0.04 - open : x + w / 2 + open;
    const dw = w / 2 - ts * 0.04;
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(dx, y + ts * 0.07, dw, h - ts * 0.14);
    g.fillStyle = side < 0 ? '#5d4533' : '#573f2e'; g.fillRect(dx + 1, y + ts * 0.075, dw - 2, h - ts * 0.15);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeRect(dx + ts * 0.05, y + ts * 0.15, dw - ts * 0.1, h * 0.3);
    g.strokeRect(dx + ts * 0.05, y + h * 0.55, dw - ts * 0.1, h * 0.3);
    g.fillStyle = '#c9a85a'; g.beginPath(); g.arc(side < 0 ? dx + dw - ts * 0.06 : dx + ts * 0.06, y + h * 0.5, ts * 0.025, 0, TAU); g.fill();
  }
  if (hiddenInside) { // dark gap with two eyes glinting: the thief is crouched inside
    g.fillStyle = '#05050a'; g.fillRect(x + w / 2 - open - 1, y + ts * 0.075, open * 2 + 2, h - ts * 0.15);
    const bl = (Math.sin(t * 1.3) > 0.96) ? 0 : 1;
    g.fillStyle = `rgba(235,240,255,${0.85 * bl})`;
    g.fillRect(x + w / 2 - ts * 0.012, y + h * 0.3, ts * 0.025, ts * 0.018);
  }
}

// ------------------------------------------------------------------ locked door
export function drawDoor(g, px, py, ts, t) {
  dropShadow(g, px + 1, py + 1, ts - 2, ts - 2, 3, 0.4);
  const gr = g.createLinearGradient(px, py, px, py + ts);
  gr.addColorStop(0, '#5b4231'); gr.addColorStop(1, '#3a2a1f');
  g.fillStyle = '#1a120d'; g.fillRect(px, py, ts, ts);                       // frame
  g.fillStyle = gr; g.fillRect(px + ts * 0.08, py + ts * 0.04, ts * 0.84, ts * 0.92);
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.2;
  for (const [a, b] of [[0.14, 0.12], [0.14, 0.55]]) g.strokeRect(px + ts * a, py + ts * b, ts * 0.72, ts * 0.33);
  g.fillStyle = 'rgba(255,230,200,.12)'; g.fillRect(px + ts * 0.09, py + ts * 0.05, ts * 0.82, 2);
  // electronic lock plate with pulsing red LED + padlock hasp
  g.fillStyle = '#20242e'; rr(g, px + ts * 0.62, py + ts * 0.42, ts * 0.22, ts * 0.2, 2); g.fill();
  g.strokeStyle = '#59627a'; g.strokeRect(px + ts * 0.62, py + ts * 0.42, ts * 0.22, ts * 0.2);
  const led = 0.55 + 0.45 * Math.sin(t * 4);
  glow(g, px + ts * 0.73, py + ts * 0.52, ts * 0.12, '255,50,60', 0.5 * led);
  g.fillStyle = `rgba(255,70,80,${0.6 + 0.4 * led})`; g.beginPath(); g.arc(px + ts * 0.73, py + ts * 0.52, ts * 0.025, 0, TAU); g.fill();
  g.fillStyle = '#b8bcc8'; g.fillRect(px + ts * 0.4, py + ts * 0.5, ts * 0.12, ts * 0.12);
  g.strokeStyle = '#b8bcc8'; g.lineWidth = ts * 0.025; g.beginPath(); g.arc(px + ts * 0.46, py + ts * 0.5, ts * 0.05, Math.PI, 0); g.stroke();
}

/** After the door is unlocked: the leaf swings open against the jamb. */
export function drawDoorOpen(g, px, py, ts) {
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px, py + ts * 0.02, ts * 0.1, ts * 0.96);
  g.fillStyle = '#4a3627'; g.fillRect(px + ts * 0.02, py + ts * 0.02, ts * 0.07, ts * 0.96);
}

// ------------------------------------------------------------------ alarm plate
export function drawAlarmPlate(g, px, py, ts, t, active) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  g.fillStyle = '#1b1015'; rr(g, px + 2, py + 2, ts - 4, ts - 4, 3); g.fill();
  g.save(); g.beginPath(); g.rect(px + 3, py + 3, ts - 6, ts - 6); g.clip();
  g.strokeStyle = `rgba(255,50,70,${0.16 + 0.1 * pulse})`; g.lineWidth = ts * 0.1; g.beginPath();
  for (let i = -ts; i < ts * 2; i += ts * 0.32) { g.moveTo(px + i, py + ts); g.lineTo(px + i + ts, py); }
  g.stroke(); g.restore();
  g.strokeStyle = `rgba(255,60,80,${0.55 + 0.4 * pulse})`; g.lineWidth = 2; rr(g, px + 3, py + 3, ts - 6, ts - 6, 3); g.stroke();
  glow(g, px + ts / 2, py + ts / 2, ts * 0.7, '255,40,60', 0.12 + 0.1 * pulse + (active ? 0.15 : 0));
  g.fillStyle = `rgba(255,90,100,${0.5 + 0.5 * pulse})`;
  for (const [a, b] of [[0.14, 0.14], [0.86, 0.14], [0.14, 0.86], [0.86, 0.86]]) { g.beginPath(); g.arc(px + ts * a, py + ts * b, ts * 0.02, 0, TAU); g.fill(); }
}

// ------------------------------------------------------------------ exit
export function drawExit(g, px, py, ts, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  glow(g, px + ts / 2, py + ts / 2, ts * 1.1, '61,255,140', 0.16 + 0.1 * pulse);
  g.fillStyle = '#0b1c14'; rr(g, px + 3, py + 3, ts - 6, ts - 6, 4); g.fill();
  g.strokeStyle = `rgba(80,255,150,${0.6 + 0.3 * pulse})`; g.lineWidth = 2; rr(g, px + 4, py + 4, ts - 8, ts - 8, 4); g.stroke();
  // chevrons marching toward the door
  g.strokeStyle = `rgba(110,255,170,${0.5 + 0.4 * pulse})`; g.lineWidth = ts * 0.06; g.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const o = ((t * 0.9 + i * 0.5) % 1);
    g.globalAlpha = Math.sin(o * Math.PI);
    g.beginPath(); g.moveTo(px + ts * 0.3, py + ts * (0.72 - o * 0.4)); g.lineTo(px + ts * 0.5, py + ts * (0.55 - o * 0.4)); g.lineTo(px + ts * 0.7, py + ts * (0.72 - o * 0.4)); g.stroke();
  }
  g.globalAlpha = 1;
  // EXIT sign plate
  g.fillStyle = '#052d1a'; rr(g, px + ts * 0.2, py + ts * 0.08, ts * 0.6, ts * 0.22, 2); g.fill();
  g.fillStyle = '#7dffb0'; g.font = `800 ${ts * 0.17}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('EXIT', px + ts / 2, py + ts * 0.19); g.textBaseline = 'alphabetic';
}

// ------------------------------------------------------------------ loot
export function drawLoot(g, x, y, ts, rare, t, seed) {
  const s = ts * (rare ? 1 : 0.9);
  const tw = 0.5 + 0.5 * Math.sin(t * 3 + seed * 1.7);
  glow(g, x, y, s * 0.55, rare ? '170,120,255' : '255,200,70', 0.2 + 0.12 * tw);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x + s * 0.04, y + s * 0.16, s * 0.2, s * 0.08, 0, 0, TAU); g.fill();
  if (rare) {                                    // cut diamond
    const r = s * 0.22;
    g.save(); g.translate(x, y - s * 0.02);
    const pts = [[-1, -0.35], [-0.55, -0.9], [0.55, -0.9], [1, -0.35], [0, 1.05]];
    g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a * r, b * r) : g.moveTo(a * r, b * r))); g.closePath();
    const dg = g.createLinearGradient(-r, -r, r, r); dg.addColorStop(0, '#e8d8ff'); dg.addColorStop(0.5, '#8f6bff'); dg.addColorStop(1, '#4a2fb5');
    g.fillStyle = dg; g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.beginPath();
    g.moveTo(-r, -0.35 * r); g.lineTo(r, -0.35 * r); g.moveTo(-0.55 * r, -0.9 * r); g.lineTo(0, 1.05 * r); g.lineTo(0.55 * r, -0.9 * r); g.moveTo(0, -0.35 * r); g.lineTo(0, 1.05 * r); g.stroke();
    g.restore();
  } else {                                       // stack of gold coins
    for (let i = 2; i >= 0; i--) {
      const cy = y + s * (0.06 - i * 0.07), cx = x + (i === 1 ? s * 0.015 : 0);
      g.fillStyle = '#8a5f12'; g.beginPath(); g.ellipse(cx, cy + s * 0.035, s * 0.19, s * 0.09, 0, 0, TAU); g.fill();
      const cg = g.createLinearGradient(cx - s * 0.19, cy, cx + s * 0.19, cy);
      cg.addColorStop(0, '#f6d56a'); cg.addColorStop(0.5, '#ffe9a0'); cg.addColorStop(1, '#c9951f');
      g.fillStyle = cg; g.beginPath(); g.ellipse(cx, cy, s * 0.19, s * 0.09, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(120,80,10,.55)'; g.lineWidth = 1; g.stroke();
    }
  }
  // glint sparkle
  const k = (t * 0.7 + seed * 0.37) % 1;
  if (k < 0.25) {
    const a = Math.sin((k / 0.25) * Math.PI);
    g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 1.4; const sz = s * 0.12 * a;
    g.beginPath(); g.moveTo(x - s * 0.1 - sz, y - s * 0.12); g.lineTo(x - s * 0.1 + sz, y - s * 0.12); g.moveTo(x - s * 0.1, y - s * 0.12 - sz); g.lineTo(x - s * 0.1, y - s * 0.12 + sz); g.stroke();
  }
}

export function drawKey(g, x, y, ts, t) {
  glow(g, x, y, ts * 0.5, '255,210,90', 0.2 + 0.1 * Math.sin(t * 3));
  g.save(); g.translate(x, y); g.rotate(-0.55 + Math.sin(t * 2) * 0.05);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(-ts * 0.16, ts * 0.06, ts * 0.46, ts * 0.05);
  const kg = g.createLinearGradient(0, -ts * 0.06, 0, ts * 0.06); kg.addColorStop(0, '#fff0b0'); kg.addColorStop(0.5, '#d9a92c'); kg.addColorStop(1, '#8c6511');
  g.strokeStyle = kg; g.lineWidth = ts * 0.07; g.beginPath(); g.arc(-ts * 0.15, 0, ts * 0.1, 0, TAU); g.stroke();
  g.fillStyle = kg; g.fillRect(-ts * 0.05, -ts * 0.03, ts * 0.36, ts * 0.06);
  g.fillRect(ts * 0.22, 0, ts * 0.05, ts * 0.12); g.fillRect(ts * 0.13, 0, ts * 0.045, ts * 0.09);
  g.restore();
}

// ------------------------------------------------------------------ CCTV camera
export function drawCamera(g, x, y, ts, angle, stage, t, meter) {
  const hot = stage > 0;
  const led = stage === 3 ? '#ff2d3e' : stage === 2 ? '#ff8a1a' : stage === 1 ? '#ffd23a' : '#3d8bff';
  g.save(); g.translate(x, y);
  g.fillStyle = '#10131b'; rr(g, -ts * 0.26, -ts * 0.26, ts * 0.52, ts * 0.52, ts * 0.06); g.fill();     // wall mount plate
  g.strokeStyle = '#2b3140'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#3a4152'; for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) { g.beginPath(); g.arc(a * ts, b * ts, ts * 0.018, 0, TAU); g.fill(); }
  g.rotate(angle);
  g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, -ts * 0.22 + 2, -ts * 0.13 + 3, ts * 0.52, ts * 0.26, ts * 0.06); g.fill();
  const bg = g.createLinearGradient(0, -ts * 0.13, 0, ts * 0.13); bg.addColorStop(0, '#9aa3b6'); bg.addColorStop(0.45, '#d6dbe6'); bg.addColorStop(1, '#5b6376');
  g.fillStyle = bg; rr(g, -ts * 0.22, -ts * 0.13, ts * 0.5, ts * 0.26, ts * 0.06); g.fill();           // housing
  g.fillStyle = '#1a1e28'; g.fillRect(ts * 0.2, -ts * 0.115, ts * 0.1, ts * 0.23);                      // lens hood
  const lg = g.createRadialGradient(ts * 0.31, -ts * 0.02, 0, ts * 0.31, 0, ts * 0.1);
  lg.addColorStop(0, '#6aa0ff'); lg.addColorStop(0.5, '#0b1228'); lg.addColorStop(1, '#05070e');
  g.fillStyle = lg; g.beginPath(); g.ellipse(ts * 0.3, 0, ts * 0.045, ts * 0.1, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(ts * 0.285, -ts * 0.07, ts * 0.015, ts * 0.025);
  g.restore();
  const blink = hot ? (Math.floor(t * (5 + stage * 5)) % 2 ? 1 : 0.25) : (Math.floor(t * 1.2) % 2 ? 1 : 0.4);
  glow(g, x - ts * 0.15 * Math.cos(angle) , y - ts * 0.15 * Math.sin(angle) - 0, ts * 0.22, led === '#3d8bff' ? '61,139,255' : '255,60,60', 0.35 * blink);
  g.fillStyle = led; g.globalAlpha = blink; g.beginPath(); g.arc(x - ts * 0.16, y - ts * 0.16, ts * 0.025, 0, TAU); g.fill(); g.globalAlpha = 1;
  if (meter > 0.02) {                                                                                      // lock-on ring
    g.strokeStyle = led; g.lineWidth = 3.5; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y, ts * 0.5, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, meter)); g.stroke(); g.lineCap = 'butt';
    g.fillStyle = led; g.font = `800 ${ts * 0.26}px system-ui, sans-serif`; g.textAlign = 'center';
    if (Math.floor(t * 4) % 2) g.fillText('● REC', x, y + ts * 0.92);
  }
}

// ------------------------------------------------------------------ lasers
export function drawLaser(g, X, Y, ts, l, on, t) {
  const a = l.tiles[0], b = l.tiles[l.tiles.length - 1];
  const vert = l.dir === 'v';
  const x0 = X(a.x + (vert ? 0.5 : 0)), y0 = Y(a.y + (vert ? 0 : 0.5));
  const x1 = X(b.x + (vert ? 0.5 : 1)), y1 = Y(b.y + (vert ? 1 : 0.5));
  g.save(); g.lineCap = 'round';
  if (on) {
    g.strokeStyle = 'rgba(255,40,70,.18)'; g.lineWidth = ts * 0.2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = 'rgba(255,70,90,.55)'; g.lineWidth = ts * 0.07; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = 'rgba(255,230,235,.95)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  } else {
    g.strokeStyle = 'rgba(255,60,80,.12)'; g.lineWidth = 1; g.setLineDash([3, 6]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
  }
  for (const [ex, ey] of [[x0, y0], [x1, y1]]) {
    g.fillStyle = '#12151d'; rr(g, ex - ts * 0.09, ey - ts * 0.09, ts * 0.18, ts * 0.18, 3); g.fill();
    g.fillStyle = on ? '#ff3b52' : '#512030'; g.beginPath(); g.arc(ex, ey, ts * 0.035, 0, TAU); g.fill();
  }
  g.restore();
}
