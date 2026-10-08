// Canvas renderer. A baked static layer (floors, walls, furniture, lighting) + per-frame dynamic layer
// (props, light cones, characters, effects). Reads sim state, never mutates it. 2D canvas only.
import { K, doorOpen, tileKind } from './grid.js';
import { conePolygon } from '../ai/vision.js';
import { effectiveRange } from '../ai/guard.js';
import { laserActive } from '../entities/laser.js';
import { drawGuardFigure, drawThief } from './sprites.js';
import { normAngle } from '../ai/vision.js';
import { bakeStatic, bakeVignette } from './staticLayer.js';
import { drawAlarmPlate, drawCamera, drawDoor, drawDoorOpen, drawExit, drawKey, drawLaser, drawLoot, drawWardrobe } from './props.js';

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
/** Visual stage of a guard: follows the AI state machine (alert/chase = 3), otherwise the detection meter. */
export const guardStage = (gd) => (gd.chase || gd.alertT > 0 ? 3 : stageOf(gd.meter));

/** Walk-cycle bookkeeping: phase advances with distance travelled; mv is the smoothed 0..1 stride amount. */
export function makeAnim() { return { player: { ph: 0, mv: 0, x: null, y: 0, face: null }, guards: {}, t: 0 }; }
export function updateAnim(anim, state, dt) {
  const step = (a, x, y, speed) => {
    if (a.x === null || a.x === undefined) { a.x = x; a.y = y; }
    const d = Math.hypot(x - a.x, y - a.y); a.x = x; a.y = y;
    const target = dt > 0 ? Math.min(1, d / dt / speed) : 0;
    a.mv += (target - a.mv) * Math.min(1, dt * 12);
    a.ph += d * 4.2;
  };
  step(anim.player, state.player.x, state.player.y, 4.4);
  const pa = anim.player;                                  // smooth turning: the thief swings round instead of snapping
  if (pa.face === null) pa.face = state.player.face;
  const df = normAngle(state.player.face - pa.face);
  pa.face += df * Math.min(1, dt * 14);
  for (const g of state.guards) step(anim.guards[g.id] || (anim.guards[g.id] = { ph: 0, mv: 0, x: null, y: 0 }), g.x, g.y, g.chase ? 2.3 : 1.6);
}

export function render(g, ctx, state, view, fx, opts) {
  const { ts, ox, oy, W, H } = view;
  const t = opts.t;
  const dpr = opts.dpr || 1;
  const X = (x) => ox + x * ts;
  const Y = (y) => oy + y * ts;
  const cache = view.cache || (view.cache = {});
  if (!cache.layer) { cache.layer = bakeStatic(ctx, view, dpr); cache.vig = bakeVignette(W, H, dpr); }
  const alarmOn = state.alarm.t > 0;
  const critical = state.danger >= 0.7 && state.status === 'playing';

  g.clearRect(0, 0, W, H);
  g.save();
  if (critical) g.translate(Math.sin(t * 61) * 1.6 * (state.danger - 0.6), Math.cos(t * 53) * 1.6 * (state.danger - 0.6));
  g.drawImage(cache.layer, 0, 0, W, H);

  // ---- floor-level props: alarm plates, exit, wardrobes, doors
  const p = state.player;
  const ptx = Math.floor(p.x), pty = Math.floor(p.y);
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    const k = tileKind(ctx, x, y);
    if (k === K.ALARM) drawAlarmPlate(g, X(x), Y(y), ts, t, alarmOn);
    else if (k === K.EXIT) drawExit(g, X(x), Y(y), ts, t);
    else if (k === K.DOOR) { if (doorOpen(ctx, state, x, y)) drawDoorOpen(g, X(x), Y(y), ts); else drawDoor(g, X(x), Y(y), ts, t); }
  }

  // ---- lasers
  for (const l of ctx.lasers) drawLaser(g, X, Y, ts, l, laserActive(l, state.time), t);

  // ---- loot + keys
  ctx.items.forEach((it, i) => {
    if (state.taken[i]) return;
    const cx = X(it.x + 0.5), cy = Y(it.y + 0.5) + Math.sin(t * 2.4 + i) * ts * 0.02;
    if (it.type === 'key') drawKey(g, cx, cy, ts, t); else drawLoot(g, cx, cy, ts, it.type === 'rare', t, i);
  });

  // ---- light cones (additive, so they read as beams of light on the dark floor)
  const cones = [];
  for (const gd of state.guards) cones.push({ x: gd.x, y: gd.y, face: gd.face, range: effectiveRange(gd, state), fov: gd.fov, skip: 0.2, meter: gd.meter, alarm: alarmOn });
  for (const c of state.cameras) cones.push({ x: c.x, y: c.y, face: c.angle, range: c.range, fov: c.fov, skip: 0.6, meter: c.meter, alarm: c.cool > 0 || alarmOn, camera: true });
  g.globalCompositeOperation = 'lighter';
  for (const c of cones) {
    const stg = stageOf(c.meter, c.alarm);
    const rgb = stg ? STAGE_RGB[stg] : c.camera ? '90,150,255' : '235,242,255';
    const k = Math.min(1, c.meter);
    const flash = stg === 3 ? 0.05 * Math.sin(t * 18) : 0;
    // three nested wedges: bright core fading to a soft edge, with distance falloff — reads as light, not a flat shape
    for (const [fovK, a0] of [[1, 0.5], [0.72, 0.6], [0.42, 0.7]]) {
      const pts = conePolygon(ctx, state, c.x, c.y, c.face, c.range, c.fov * fovK, c.skip, fovK === 1 ? 26 : 14);
      const gr = g.createRadialGradient(X(c.x), Y(c.y), 2, X(c.x), Y(c.y), c.range * ts);
      const base = (0.2 + k * 0.2 + flash) * a0;
      gr.addColorStop(0, `rgba(${rgb},${base * 1.5})`);
      gr.addColorStop(0.5, `rgba(${rgb},${base * 0.8})`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(X(q.x), Y(q.y)) : g.moveTo(X(q.x), Y(q.y)))); g.closePath(); g.fill();
    }
  }
  g.globalCompositeOperation = 'source-over';

  // ---- proximity awareness halo: warms up as the thief nears a guard's personal space
  for (const gd of state.guards) {
    const d = Math.hypot(p.x - gd.x, p.y - gd.y);
    const outer = gd.prox * 1.9;
    if (d > outer || p.hidden || state.status !== 'playing') continue;
    const k = 1 - d / outer;
    const a = Math.min(0.34, k * k * 0.5 + gd.near * 0.14);
    const gr = g.createRadialGradient(X(gd.x), Y(gd.y), ts * 0.2, X(gd.x), Y(gd.y), gd.prox * ts * 1.15);
    gr.addColorStop(0, `rgba(255,70,60,${a})`); gr.addColorStop(1, 'rgba(255,70,60,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(X(gd.x), Y(gd.y), gd.prox * ts * 1.15, 0, Math.PI * 2); g.fill();
  }

  // ---- wardrobes (the thief is inside the one he hides in)
  for (let y = 0; y < ctx.h; y++) for (let x = 0; x < ctx.w; x++) {
    if (tileKind(ctx, x, y) === K.HIDE) drawWardrobe(g, X(x), Y(y), ts, p.hidden && x === ptx && y === pty, t);
  }

  // ---- cameras on the wall
  for (const c of state.cameras) drawCamera(g, X(c.x), Y(c.y), ts, c.angle, stageOf(c.meter, c.cool > 0), t, c.meter);

  // ---- characters, back to front
  const anim = opts.anim || makeAnim();
  const actors = state.guards.map((gd) => ({ y: gd.y, guard: gd }));
  if (!p.hidden) actors.push({ y: p.y, player: true });
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a.player) {
      const blink = state.invuln > 0 && Math.floor(t * 10) % 2 === 0;
      const pa = anim.player;
      drawThief(g, X(p.x), Y(p.y), ts * 0.44, opts.character, opts.variant, pa.face ?? p.face, { alpha: blink ? 0.45 : 1, ph: pa.ph, mv: pa.mv, t, crouch: state.danger > 0.5 ? 0.35 : 0 });
    } else {
      const gd = a.guard;
      const stg = guardStage(gd);
      const ga = anim.guards[gd.id] || { ph: 0, mv: 0 };
      const headYaw = stg >= 1 && gd.look !== null && !gd.chase ? Math.max(-1.1, Math.min(1.1, normAngle(gd.look - gd.face))) : 0;
      drawGuardAlertFx(g, gd, X(gd.x), Y(gd.y), ts, t, stg);
      drawGuardFigure(g, X(gd.x), Y(gd.y), ts * 1.18, gd.face, { ph: ga.ph, mv: ga.mv, t, stage: stg, alarm: alarmOn, headYaw, chase: gd.chase });
      drawGuardIcon(g, gd, X(gd.x), Y(gd.y), ts, t, stg, alarmOn);
    }
  }

  // ---- tap ripple: a tiny, very short-lived acknowledgement (no path, no trail)
  for (const f of fx.taps || []) {
    const k = f.age / f.life;
    g.strokeStyle = `rgba(255,255,255,${0.32 * (1 - k)})`; g.lineWidth = 1.5;
    g.beginPath(); g.arc(X(f.x), Y(f.y), ts * (0.1 + k * 0.22), 0, 7); g.stroke();
  }

  // ---- floating pickups text / pulses
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

  // ---- cinematic vignette + danger vignette (heartbeat-synced)
  g.drawImage(cache.vig, 0, 0, W, H);
  const beat = opts.beat || 0;
  const danger = Math.max(state.danger, state.tension * 0.55, alarmOn ? 0.5 + 0.1 * Math.sin(t * 10) : 0);
  if (danger > 0.03) {
    const strength = Math.min(0.75, 0.1 + danger * 0.55 + beat * 0.12 * (0.4 + danger));
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * (0.55 - danger * 0.2), W / 2, H / 2, Math.max(W, H) * 0.78);
    const rgb = danger >= 0.7 || alarmOn ? '255,20,45' : danger >= 0.35 ? '255,110,20' : '255,190,30';
    v.addColorStop(0, `rgba(${rgb},0)`); v.addColorStop(1, `rgba(${rgb},${strength})`);
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
}

function drawGuardAlertFx(g, gd, x, y, ts, t, stg) {
  if (stg === 3 && (gd.chase || gd.alertT > 0)) { /* strongest reaction */ }
  if (stg === 3) { // shock rings radiating from a fully alerted guard
    for (let i = 0; i < 2; i++) {
      const k = (t * 2.4 + i * 0.5) % 1;
      g.strokeStyle = `rgba(255,45,60,${0.8 * (1 - k)})`; g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, ts * 0.34 * (1.1 + k * 1.8), 0, 7); g.stroke();
    }
  }
}

function drawGuardIcon(g, gd, x, y, ts, t, stg, alarmOn) {
  const r = ts * 0.34;
  const col = stg ? `rgb(${STAGE_RGB[stg]})` : '#fff';
  if (gd.meter > 0.02 || stg === 3) {
    g.strokeStyle = col; g.lineWidth = 3 + stg; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y, r * 1.45, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, gd.meter)); g.stroke(); g.lineCap = 'butt';
    const bounce = Math.abs(Math.sin(t * (6 + stg * 4))) * ts * (0.04 + 0.05 * stg);
    g.font = `900 ${ts * (0.42 + 0.1 * stg)}px system-ui`; g.textAlign = 'center';
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.65)';
    const txt = stg === 1 ? '?' : stg === 2 ? '!' : '!!';
    g.strokeText(txt, x, y - r * 1.65 - bounce); g.fillStyle = col; g.fillText(txt, x, y - r * 1.65 - bounce);
  } else if (alarmOn) {
    g.fillStyle = '#ff3b52'; g.font = `900 ${ts * 0.4}px system-ui`; g.textAlign = 'center'; g.fillText('!', x, y - r * 1.5 + Math.sin(t * 12) * 2);
  }
}
