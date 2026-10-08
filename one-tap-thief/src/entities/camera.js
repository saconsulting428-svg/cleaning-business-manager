import { CFG } from '../config.js';
import { D2R } from '../ai/vision.js';
import { seesPlayer } from '../ai/vision.js';

/** CCTV camera. `def`: {x,y,angle,arc,speed,range,fov,fillTime,phase}. angle: 0=east, 90=south (degrees). */
export function makeCamera(def, id) {
  const arc = def.arc ?? CFG.camera.arc;
  return {
    id, x: def.x + 0.5, y: def.y + 0.5, base: def.angle ?? 90, arc,
    speed: def.speed ?? CFG.camera.speed, range: def.range ?? CFG.camera.range, fov: def.fov ?? CFG.camera.fov,
    fill: def.fillTime ?? CFG.camera.fillTime, t: def.phase ?? 0, meter: 0, cool: 0, beep: 0,
    angle: (def.angle ?? 90) * D2R,
  };
}

export function cameraAngle(c) {
  const w = c.arc > 0 ? c.speed / c.arc : 0;
  return (c.base + c.arc * Math.sin(c.t * w)) * D2R;
}

export function updateCamera(ctx, state, c, dt, hooks) {
  c.t += dt;
  c.angle = cameraAngle(c);
  if (c.cool > 0) { c.cool -= dt; c.meter = 0; return; }
  const d = seesPlayer(ctx, state, c.x, c.y, c.angle, c.range, c.fov, 0.6);
  if (d >= 0) c.meter += (dt / c.fill) * (1 + (1 - d / c.range) * 0.5);
  else c.meter = Math.max(0, c.meter - dt * CFG.decayRate);
  if (c.meter > CFG.spottedAt) state.spotted = true;
  if (c.meter > 0) {
    c.beep -= dt;
    if (c.beep <= 0) { hooks.emit('beep', { level: c.meter }); c.beep = 0.55 - 0.4 * Math.min(1, c.meter); }
  }
  if (c.meter >= 1) {
    c.meter = 0;
    c.cool = CFG.camera.cooldown;
    hooks.alarm(state.player.x, state.player.y, 'camera');
  }
}
