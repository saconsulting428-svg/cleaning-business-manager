// Canvas renderer: draws the level, entities, vision cones and effects. Reads sim state, never mutates it.
import { K, doorOpen, tileKind } from './grid.js';
import { conePolygon } from '../ai/vision.js';
import { effectiveRange } from '../ai/guard.js';
import { laserActive } from '../entities/laser.js';
import { drawThief } from '../entities/thief.js';

export function computeLayout(W, H, ctx, top, bottom) {
  const ts = Math.floor(Math.min(W / ctx.w, (H - top - bottom) / ctx.h));
  return { W, H, ts, ox: Math.round((W - ts * ctx.w) / 2), oy: Math.round(top + (H - top - bottom - ts * ctx.h) / 2) };
}
export function screenToTile(view, px, py) {
  return { x: Math.floor((px - view.ox) / view.ts), y: Math.floor((py - view.oy) / view.ts) };
}

// Detection stages: calm -> yellow (suspicious) -> orange (detecting) -> red (critical)
export function stageOf(m, alarm = false) {
  if (alarm || m >= 0.7) return 3;
  if (m >= 0.35) return 2;
  if (m >= 0.04) return 1;
  return 0;
}
const STAGE_RGB = ['', '255,214,50', '255,138,26', '255,45,60'];

function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

export function render(g, ctx, state, view, fx, opts) {
  const { ts, ox, oy, W, H } = view;
  const t = opts.t;
  const wd = ctx.world;
  const X = (x) => ox + x * ts;
  const Y = (y) => oy + y * ts;
  g.clearRect(0, 0, W, H);
  const critical = state.danger >= 0.7 && state.status === 'playing';
  g.save();
  if (critical) g.translate(Math.sin(t * 61) * 1.6 * (state.danger - 0.6), Math.cos(t * 53) * 1.6 * (state.danger - 0.6));

  // ---- floors ----
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    const k = tileKind(ctx, x, y);
    if (k === K.WALL) continue;
    g.fillStyle = wd.floor[(x + y) & 1];
    g.fillRect(X(x), Y(y), ts + 0.5, ts + 0.5);
  }
  // alarm zones
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    if (tileKind(ctx, x, y) !== K.ALARM) continue;
    const pulse = 0.35 + 0.2 * Math.sin(t * 5);
    g.fillStyle = `rgba(255,60,80,${pulse})`;
    g.fillRect(X(x) + 1, Y(y) + 1, ts - 2, ts - 2);
    g.save(); g.beginPath(); g.rect(X(x) + 1, Y(y) + 1, ts - 2, ts - 2); g.clip();
    g.strokeStyle = 'rgba(255,140,150,.75)'; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < ts * 2; i += ts / 3) { g.moveTo(X(x) + i, Y(y)); g.lineTo(X(x) + i - ts, Y(y) + ts); }
    g.stroke(); g.restore();
  }
  // start pad + exit
  g.fillStyle = 'rgba(255,255,255,.07)'; rr(g, X(ctx.start.x) + 3, Y(ctx.start.y) + 3, ts - 6, ts - 6, 6); g.fill();
  drawExit(g, X(ctx.exit.x), Y(ctx.exit.y), ts, t, state);

  // ---- vision cones ----
  const alarmOn = state.alarm.t > 0;
  const cones = [];
  for (const gd of state.guards) cones.push({ x: gd.x, y: gd.y, face: gd.face, range: effectiveRange(gd, state), fov: gd.fov, skip: 0.2, meter: gd.meter, alarm: alarmOn });
  for (const c of state.cameras) cones.push({ x: c.x, y: c.y, face: c.angle, range: c.range, fov: c.fov, skip: 0.6, meter: c.meter, alarm: c.cool > 0 || alarmOn, camera: true });
  for (const c of cones) {
    const pts = conePolygon(ctx, state, c.x, c.y, c.face, c.range, c.fov, c.skip);
    const stg = stageOf(c.meter, c.alarm);
    const rgb = stg ? STAGE_RGB[stg] : c.camera ? '110,190,255' : '215,235,255';
    const k = Math.min(1, c.meter);
    const flash = stg === 3 ? 0.12 * Math.sin(t * 18) : 0;
    const grad = g.createRadialGradient(X(c.x), Y(c.y), 2, X(c.x), Y(c.y), c.range * ts);
    grad.addColorStop(0, `rgba(${rgb},${0.34 + k * 0.32 + flash})`);
    grad.addColorStop(1, `rgba(${rgb},${0.06 + k * 0.2})`);
    g.fillStyle = grad;
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)))); g.closePath(); g.fill();
    g.strokeStyle = `rgba(${rgb},${0.4 + k * 0.5})`; g.lineWidth = stg >= 2 ? 2 : 1; g.stroke();
  }

  // ---- lasers ----
  for (const l of ctx.lasers) {
    const on = laserActive(l, state.time);
    const a = l.tiles[0], b = l.tiles[l.tiles.length - 1];
    g.save();
    g.strokeStyle = on ? '#ff2d4a' : 'rgba(255,45,74,.18)';
    g.lineWidth = on ? 3 : 1.5;
    if (on) { g.shadowColor = '#ff2d4a'; g.shadowBlur = 10; }
    g.beginPath(); g.moveTo(X(a.x), Y(a.y + 0.5)); g.lineTo(X(b.x + 1), Y(b.y + 0.5));
    if (l.dir === 'v') { g.beginPath(); g.moveTo(X(a.x + 0.5), Y(a.y)); g.lineTo(X(b.x + 0.5), Y(b.y + 1)); }
    g.stroke(); g.restore();
    g.fillStyle = '#51556b';
    for (const e of [a, b]) { g.beginPath(); g.arc(X(e.x + 0.5), Y(e.y + 0.5), ts * 0.1, 0, 7); g.fill(); }
  }

  // ---- walls, furniture, doors, hiding spots ----
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    const k = tileKind(ctx, x, y);
    const px = X(x), py = Y(y);
    if (k === K.WALL) {
      g.fillStyle = wd.wall; g.fillRect(px, py, ts + 0.5, ts + 0.5);
      if (tileKind(ctx, x, y + 1) !== K.WALL) { g.fillStyle = wd.wallTop; g.fillRect(px, py + ts - ts * 0.16, ts + 0.5, ts * 0.16); }
    } else if (k === K.FURN) {
      const s = (x * 7 + y * 13) % 3;
      g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, px + ts * 0.1, py + ts * 0.16, ts * 0.8, ts * 0.8, ts * 0.16); g.fill();
      g.fillStyle = wd.furn; rr(g, px + ts * 0.08, py + ts * 0.08, ts * 0.84, ts * 0.8, ts * 0.16); g.fill();
      g.fillStyle = 'rgba(255,255,255,.14)'; rr(g, px + ts * 0.18, py + ts * 0.16, ts * 0.64, ts * (s === 1 ? 0.26 : 0.2), ts * 0.1); g.fill();
      if (s === 2) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.strokeRect(px + ts * 0.25, py + ts * 0.42, ts * 0.5, ts * 0.3); }
    } else if (k === K.HIDE) drawHide(g, px, py, ts, wd);
    else if (k === K.DOOR && !doorOpen(ctx, state, x, y)) drawDoor(g, px, py, ts);
  }

  // ---- items ----
  ctx.items.forEach((it, i) => {
    if (state.taken[i]) return;
    const cx = X(it.x + 0.5), cy = Y(it.y + 0.5) + Math.sin(t * 3 + i) * ts * 0.04;
    if (it.type === 'key') drawKey(g, cx, cy, ts);
    else drawLoot(g, cx, cy, ts, it.type === 'rare', t);
  });

  // ---- cameras ----
  for (const c of state.cameras) {
    const stg = stageOf(c.meter, c.cool > 0);
    const col = stg ? `rgb(${STAGE_RGB[stg]})` : '#60a5fa';
    g.save(); g.translate(X(c.x), Y(c.y)); g.rotate(c.angle);
    g.fillStyle = '#2a2f45'; rr(g, -ts * 0.3, -ts * 0.22, ts * 0.6, ts * 0.44, 5); g.fill();
    const blink = stg ? (Math.floor(t * (6 + stg * 5)) % 2 ? 1 : 0.35) : 1;
    g.globalAlpha = blink; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 8 + stg * 5;
    g.beginPath(); g.arc(ts * 0.22, 0, ts * 0.11, 0, 7); g.fill();
    g.restore();
    if (c.meter > 0.02) { // visible lock-on buildup
      g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.arc(X(c.x), Y(c.y), ts * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, c.meter)); g.stroke(); g.lineCap = 'butt';
      g.fillStyle = col; g.font = `900 ${ts * 0.3}px system-ui`; g.textAlign = 'center';
      g.fillText('REC', X(c.x), Y(c.y) + ts * 0.9);
    }
  }

  // ---- guards ----
  for (const gd of state.guards) drawGuard(g, gd, X(gd.x), Y(gd.y), ts, t, alarmOn);

  // ---- tap target + path ----
  const p = state.player;
  if (opts.showPath && p.path.length) {
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (const n of p.path) { g.beginPath(); g.arc(X(n.x + 0.5), Y(n.y + 0.5), ts * 0.06, 0, 7); g.fill(); }
  }
  if (p.target) {
    const r = ts * (0.25 + 0.06 * Math.sin(t * 8));
    g.strokeStyle = 'rgba(245,197,66,.9)'; g.lineWidth = 2;
    g.beginPath(); g.arc(X(p.target.x + 0.5), Y(p.target.y + 0.5), r, 0, 7); g.stroke();
  }

  // ---- player ----
  if (state.danger > 0.3 && state.status === 'playing') {
    const pr = ts * (0.5 + 0.12 * Math.sin(t * (10 + state.danger * 14)));
    g.strokeStyle = `rgba(255,${state.danger > 0.7 ? 45 : 140},${state.danger > 0.7 ? 60 : 26},${0.35 + state.danger * 0.5})`;
    g.lineWidth = 3; g.beginPath(); g.arc(X(state.player.x), Y(state.player.y), pr, 0, 7); g.stroke();
  }
  const blink = state.invuln > 0 && Math.floor(t * 10) % 2 === 0;
  drawThief(g, X(p.x), Y(p.y), ts * 0.36, opts.character, opts.variant, p.face, { alpha: (p.hidden ? 0.5 : 1) * (blink ? 0.45 : 1), moving: p.moving, t });
  if (p.hidden) { g.fillStyle = 'rgba(255,255,255,.8)'; g.font = `700 ${ts * 0.26}px system-ui`; g.textAlign = 'center'; g.fillText('hidden', X(p.x), Y(p.y) - ts * 0.55); }

  // ---- effects ----
  for (const f of fx.rings) {
    const k = f.age / f.life;
    g.strokeStyle = `rgba(${f.rgb},${1 - k})`; g.lineWidth = 3 * (1 - k) + 1;
    g.beginPath(); g.arc(X(f.x), Y(f.y), ts * (0.2 + k * 0.9), 0, 7); g.stroke();
  }
  for (const f of fx.texts) {
    const k = f.age / f.life;
    g.globalAlpha = 1 - k * k; g.fillStyle = f.color; g.font = `800 ${ts * 0.4}px system-ui`; g.textAlign = 'center';
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3; g.strokeText(f.text, X(f.x), Y(f.y) - k * ts); g.fillText(f.text, X(f.x), Y(f.y) - k * ts);
    g.globalAlpha = 1;
  }

  g.restore();

  // ---- screen-edge danger vignette (pulses with the heartbeat) ----
  const beat = opts.beat || 0;
  const danger = Math.max(state.danger, alarmOn ? 0.5 + 0.1 * Math.sin(t * 10) : 0);
  if (danger > 0.03) {
    const strength = Math.min(0.75, 0.1 + danger * 0.55 + beat * 0.12 * (0.4 + danger));
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.55 - danger * 0.2), W / 2, H / 2, Math.max(W, H) * 0.78);
    const rgb = danger >= 0.7 || alarmOn ? '255,20,45' : danger >= 0.35 ? '255,110,20' : '255,190,30';
    v.addColorStop(0, `rgba(${rgb},0)`); v.addColorStop(1, `rgba(${rgb},${strength})`);
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
}

function drawGuard(g, gd, x, y, ts, t, alarmOn) {
  const r = ts * 0.34;
  const stg = stageOf(gd.meter, false);
  const col = stg ? `rgb(${STAGE_RGB[stg]})` : '#fff';
  // critical: expanding shock rings + body shake
  if (stg === 3) {
    for (let i = 0; i < 2; i++) {
      const k = (t * 2.4 + i * 0.5) % 1;
      g.strokeStyle = `rgba(255,45,60,${0.8 * (1 - k)})`; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, r * (1.1 + k * 1.8), 0, 7); g.stroke();
    }
  }
  const pulse = stg ? 1 + 0.08 * stg * Math.sin(t * (9 + stg * 5)) : 1;
  const jx = stg === 3 ? Math.sin(t * 80) * 1.4 : 0;
  g.save(); g.translate(x + jx, y); g.scale(pulse, pulse);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, r * 0.2, r, r * 0.85, 0, 0, 7); g.fill();
  g.rotate(gd.face);
  g.fillStyle = alarmOn || stg === 3 ? '#c0243a' : stg === 2 ? '#a5532b' : '#3b4f8c'; g.strokeStyle = stg ? col : 'rgba(255,255,255,.3)'; g.lineWidth = stg ? 2.5 : 1.5;
  g.beginPath(); g.ellipse(-r * 0.05, 0, r * 0.8, r * 0.98, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#e9bd96'; g.beginPath(); g.arc(r * 0.22, 0, r * 0.58, 0, 7); g.fill();
  g.fillStyle = '#161a2c'; g.beginPath(); g.ellipse(r * 0.05, 0, r * 0.52, r * 0.62, 0, 0, 7); g.fill(); // cap
  g.fillStyle = '#161a2c'; g.fillRect(r * 0.2, -r * 0.62, r * 0.3, r * 1.24);
  g.fillStyle = '#f5c542'; g.beginPath(); g.arc(r * 0.05, 0, r * 0.12, 0, 7); g.fill(); // badge
  g.restore();
  // detection ring + bouncing icon:  ? (yellow)  !  (orange)  !! (red)
  if (gd.meter > 0.02) {
    g.strokeStyle = col; g.lineWidth = 3.5 + stg; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y, r * 1.35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, gd.meter)); g.stroke(); g.lineCap = 'butt';
    const bounce = Math.abs(Math.sin(t * (6 + stg * 4))) * ts * (0.04 + 0.05 * stg);
    const size = ts * (0.42 + 0.1 * stg);
    g.font = `900 ${size}px system-ui`; g.textAlign = 'center';
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.65)';
    const txt = stg === 1 ? '?' : stg === 2 ? '!' : '!!';
    g.strokeText(txt, x, y - r * 1.5 - bounce); g.fillStyle = col; g.fillText(txt, x, y - r * 1.5 - bounce);
  } else if (alarmOn) {
    g.fillStyle = '#ff3b52'; g.font = `900 ${ts * 0.4}px system-ui`; g.textAlign = 'center'; g.fillText('!', x, y - r * 1.4 + Math.sin(t * 12) * 2);
  }
}

function drawLoot(g, x, y, ts, rare, t) {
  g.save(); g.translate(x, y);
  const r = ts * (rare ? 0.26 : 0.2);
  g.shadowColor = rare ? '#c77dff' : '#ffd24a'; g.shadowBlur = 12 + 4 * Math.sin(t * 4);
  if (rare) {
    g.fillStyle = '#b25cf0'; g.beginPath(); g.moveTo(0, -r * 1.2); g.lineTo(r, 0); g.lineTo(0, r * 1.2); g.lineTo(-r, 0); g.closePath(); g.fill();
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, -r * 1.2); g.lineTo(r * 0.4, -r * 0.1); g.lineTo(0, 0); g.lineTo(-r * 0.5, -r * 0.1); g.closePath(); g.fill();
  } else {
    g.fillStyle = '#ffcf33'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
    g.shadowBlur = 0; g.strokeStyle = '#b5821b'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.62, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(-r * 0.3, -r * 0.3, r * 0.2, 0, 7); g.fill();
  }
  g.restore();
}

function drawKey(g, x, y, ts) {
  g.save(); g.translate(x, y); g.rotate(-0.6);
  g.shadowColor = '#ffd24a'; g.shadowBlur = 10; g.strokeStyle = '#ffd24a'; g.fillStyle = '#ffd24a'; g.lineWidth = ts * 0.07;
  g.beginPath(); g.arc(-ts * 0.15, 0, ts * 0.12, 0, 7); g.stroke();
  g.fillRect(-ts * 0.03, -ts * 0.035, ts * 0.34, ts * 0.07); g.fillRect(ts * 0.2, 0, ts * 0.05, ts * 0.13); g.fillRect(ts * 0.1, 0, ts * 0.05, ts * 0.1);
  g.restore();
}

function drawDoor(g, px, py, ts) {
  g.fillStyle = '#5a3d22'; rr(g, px + 2, py + 2, ts - 4, ts - 4, 5); g.fill();
  g.fillStyle = '#7a5530'; g.fillRect(px + ts * 0.15, py + ts * 0.15, ts * 0.7, ts * 0.7);
  g.fillStyle = '#ffd24a'; rr(g, px + ts * 0.36, py + ts * 0.46, ts * 0.28, ts * 0.22, 3); g.fill();
  g.strokeStyle = '#ffd24a'; g.lineWidth = 2.5; g.beginPath(); g.arc(px + ts * 0.5, py + ts * 0.46, ts * 0.1, Math.PI, 0); g.stroke();
}

function drawHide(g, px, py, ts, wd) {
  g.fillStyle = 'rgba(0,0,0,.28)'; rr(g, px + ts * 0.14, py + ts * 0.14, ts * 0.74, ts * 0.8, ts * 0.12); g.fill();
  g.fillStyle = '#2f6b5a'; rr(g, px + ts * 0.1, py + ts * 0.08, ts * 0.8, ts * 0.8, ts * 0.12); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(px + ts * 0.5, py + ts * 0.12); g.lineTo(px + ts * 0.5, py + ts * 0.84); g.stroke();
  g.fillStyle = wd.accent; g.beginPath(); g.arc(px + ts * 0.42, py + ts * 0.5, ts * 0.04, 0, 7); g.arc(px + ts * 0.58, py + ts * 0.5, ts * 0.04, 0, 7); g.fill();
}

function drawExit(g, px, py, ts, t, state) {
  const glow = 0.5 + 0.3 * Math.sin(t * 3);
  g.save();
  g.shadowColor = '#3ddc84'; g.shadowBlur = 14 * glow;
  g.fillStyle = 'rgba(61,220,132,.35)'; rr(g, px + 2, py + 2, ts - 4, ts - 4, 8); g.fill();
  g.shadowBlur = 0; g.strokeStyle = '#3ddc84'; g.lineWidth = 2.5; rr(g, px + 4, py + 4, ts - 8, ts - 8, 7); g.stroke();
  g.fillStyle = '#3ddc84'; g.beginPath();
  g.moveTo(px + ts * 0.3, py + ts * 0.45); g.lineTo(px + ts * 0.5, py + ts * 0.25 + Math.sin(t * 4) * 2); g.lineTo(px + ts * 0.7, py + ts * 0.45);
  g.lineTo(px + ts * 0.57, py + ts * 0.45); g.lineTo(px + ts * 0.57, py + ts * 0.75); g.lineTo(px + ts * 0.43, py + ts * 0.75); g.lineTo(px + ts * 0.43, py + ts * 0.45); g.closePath(); g.fill();
  g.restore();
}
