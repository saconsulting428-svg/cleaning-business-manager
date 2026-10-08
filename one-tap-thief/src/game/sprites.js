// Top-down humanoid sprites drawn procedurally on canvas: a shared skeleton (legs, shoes, torso, arms, head)
// with outfits for the thief and the police. No images, no 3D — just shaded 2D shapes + a walk cycle.
import { getVariant } from '../entities/cosmetics.js';

const TAU = Math.PI * 2;

function ell(g, x, y, rx, ry, fill, rot = 0) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fillStyle = fill; g.fill();
}
function limb(g, x0, y0, x1, y1, w, col) {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const mix = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

/** Soft contact shadow cast down-right (light comes from the upper left). */
function shadow(g, u, a = 0.4, k = 1) {
  g.save();
  g.translate(u * 0.07, u * 0.1);
  const gr = g.createRadialGradient(0, 0, u * 0.05, 0, 0, u * 0.42 * k);
  gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, u * 0.42 * k, u * 0.36 * k, 0, 0, TAU); g.fill();
  g.restore();
}

/** Shared pose maths. ph: walk phase (rad), mv: 0 idle .. 1 full stride, t: clock (s). */
function pose(ph, mv, t, stride = 0.2) {
  const s = Math.sin(ph) * mv;
  return {
    legL: s * stride, legR: -s * stride,
    armL: -s * 0.15, armR: s * 0.15,
    bob: Math.abs(Math.cos(ph)) * mv * 0.012,
    sway: Math.sin(ph) * mv * 0.012 + Math.sin(t * 1.7) * 0.004 * (1 - mv),
    breathe: 1 + Math.sin(t * 2.2) * 0.012 * (1 - mv),
  };
}

// ------------------------------------------------------------------------------------------ THIEF
/**
 * drawThief(g, x, y, r, charId, variantId, face, opts)
 * r ≈ 0.36 * tile size (kept for compatibility). face: radians (0 = east). opts: {alpha, ph, mv, t, crouch, glowOnly}
 */
export function drawThief(g, x, y, r, charId, variantId, face = Math.PI / 2, opts = {}) {
  const u = r / 0.36;
  const v = getVariant(variantId);
  const t = opts.t || 0;
  const P = pose(opts.ph ?? (opts.moving ? t * 12 : 0), opts.mv ?? (opts.moving ? 1 : 0), t, 0.2);
  const crouch = opts.crouch || 0;
  const suit = mix(v.suit, '#0b0d14', 0.22);        // dark stealth outfit, tinted by the cosmetic colour
  const suitHi = mix(v.suit, '#9aa6d0', 0.3);
  const trim = v.accent;
  g.save();
  g.globalAlpha = opts.alpha ?? 1;
  g.translate(x, y);
  shadow(g, u, 0.5, 1 + crouch * -0.2);
  g.rotate(face);
  g.scale(1 - crouch * 0.12, 1 + crouch * 0.1);
  g.translate(P.bob * u, P.sway * u);
  const sc = P.breathe;
  if (v.glow) { const gl = g.createRadialGradient(0, 0, u * 0.1, 0, 0, u * 0.6); gl.addColorStop(0, v.glow + '55'); gl.addColorStop(1, v.glow + '00'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, u * 0.6, 0, TAU); g.fill(); }

  // legs + shoes (dark trousers, black sneakers with pale soles)
  const hipY = u * 0.075;
  for (const [side, off] of [[-1, P.legL], [1, P.legR]]) {
    const fx = off * u * 1.3 + u * 0.09;
    limb(g, 0, side * hipY, fx, side * hipY * 1.25, u * 0.11, '#14161f');
    ell(g, fx + u * 0.035, side * hipY * 1.25, u * 0.085, u * 0.052, '#0a0b10');
    ell(g, fx + u * 0.03, side * hipY * 1.25 + side * u * 0.015, u * 0.07, u * 0.02, '#4a4f60');
  }
  // backpack / loot sack
  g.save(); g.translate(-u * 0.15, 0);
  rrect(g, -u * 0.09, -u * 0.13, u * 0.19, u * 0.26, u * 0.05); g.fillStyle = '#1a1511'; g.fill();
  rrect(g, -u * 0.07, -u * 0.1, u * 0.14, u * 0.2, u * 0.04); g.fillStyle = '#2a2018'; g.fill();
  g.fillStyle = '#3a2f22'; g.fillRect(-u * 0.02, -u * 0.1, u * 0.03, u * 0.2);
  g.restore();
  // arms (behind torso edge) with gloved hands
  for (const [side, off] of [[-1, P.armL], [1, P.armR]]) {
    const sx = 0, sy = side * u * 0.27;
    const hx = off * u * 1.25 + u * 0.03, hy = side * u * 0.33;
    limb(g, sx, sy, hx, hy, u * 0.115, 'rgba(165,195,255,.4)');
    limb(g, sx, sy, hx, hy, u * 0.095, suit);
    limb(g, sx, sy, (sx + hx) / 2, (sy + hy) / 2, u * 0.05, suitHi);
    ell(g, hx + u * 0.01, hy, u * 0.055, u * 0.055, '#0d0e13');
  }
  // torso: jacket with shoulders, centre seam and highlight
  g.save(); g.scale(sc, sc);
  const tg = g.createRadialGradient(-u * 0.02, -u * 0.04, u * 0.02, 0, 0, u * 0.27);
  tg.addColorStop(0, suitHi); tg.addColorStop(0.55, suit); tg.addColorStop(1, mix(v.suit, '#000000', 0.78));
  g.fillStyle = tg; rrect(g, -u * 0.1, -u * 0.27, u * 0.23, u * 0.54, u * 0.1); g.fill();
  g.strokeStyle = 'rgba(165,195,255,.5)'; g.lineWidth = Math.max(1.2, u * 0.018); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = Math.max(1, u * 0.014);
  g.beginPath(); g.moveTo(-u * 0.1, 0); g.lineTo(u * 0.12, 0); g.stroke();
  g.fillStyle = trim; g.globalAlpha *= 0.55; g.fillRect(u * 0.0, -u * 0.265, u * 0.02, u * 0.11); g.fillRect(u * 0.0, u * 0.155, u * 0.02, u * 0.11); g.globalAlpha = opts.alpha ?? 1;
  g.restore();
  // head + headwear
  head(g, u, charId, v, suit, suitHi, t, P);
  g.restore();
}

function head(g, u, charId, v, suit, suitHi, t, P) {
  g.save(); g.scale(1.22, 1.22);
  const hx = u * 0.03 + P.bob * u * 0.5;
  const skin = '#d9b090';
  const darkCloth = '#12141c';
  ell(g, hx - u * 0.02, 0, u * 0.125, u * 0.135, 'rgba(0,0,0,.35)'); // under-head shade
  switch (charId) {
    case 'ninja': {
      ell(g, hx, 0, u * 0.125, u * 0.13, darkCloth);
      ell(g, hx + u * 0.075, 0, u * 0.06, u * 0.085, '#0b0c11');
      g.fillStyle = '#e2e5ee'; g.fillRect(hx + u * 0.088, -u * 0.045, u * 0.025, u * 0.025); g.fillRect(hx + u * 0.088, u * 0.02, u * 0.025, u * 0.025);
      g.fillStyle = '#b3202d'; g.fillRect(hx - u * 0.01, -u * 0.13, u * 0.045, u * 0.26); // headband
      const flap = Math.sin(t * 9) * u * 0.02;
      limb(g, hx - u * 0.02, u * 0.09, hx - u * 0.19, u * 0.14 + flap, u * 0.03, '#b3202d'); // trailing tail
      limb(g, hx - u * 0.02, u * 0.06, hx - u * 0.17, u * 0.03 + flap, u * 0.03, '#8d1824');
      break; }
    case 'hacker': {
      ell(g, hx - u * 0.015, 0, u * 0.145, u * 0.15, suit); // hood
      ell(g, hx - u * 0.03, 0, u * 0.1, u * 0.11, suitHi);
      ell(g, hx + u * 0.075, 0, u * 0.065, u * 0.09, '#0b0c11');
      g.fillStyle = '#58f0ff'; g.globalAlpha *= 0.95; g.fillRect(hx + u * 0.08, -u * 0.07, u * 0.035, u * 0.14); g.globalAlpha = 1;
      break; }
    case 'spy': {
      ell(g, hx, 0, u * 0.12, u * 0.125, '#101218');
      ell(g, hx + u * 0.02, 0, u * 0.2, u * 0.15, '#1a1c25'); // fedora brim
      ell(g, hx, 0, u * 0.1, u * 0.1, '#262a36');
      g.fillStyle = '#7d1f2b'; g.fillRect(hx - u * 0.05, -u * 0.095, u * 0.03, u * 0.19); // hat band
      ell(g, hx + u * 0.12, 0, u * 0.035, u * 0.075, '#07080b'); // sunglasses
      break; }
    case 'gentleman': {
      ell(g, hx - u * 0.01, 0, u * 0.175, u * 0.155, '#0c0d12'); // brim
      ell(g, hx - u * 0.01, 0, u * 0.095, u * 0.095, '#1a1b24');
      ell(g, hx - u * 0.018, -u * 0.015, u * 0.05, u * 0.05, 'rgba(255,255,255,.07)');
      g.strokeStyle = '#b8892b'; g.lineWidth = Math.max(1, u * 0.02); g.beginPath(); g.arc(hx - u * 0.01, 0, u * 0.095, 0, TAU); g.stroke();
      ell(g, hx + u * 0.125, u * 0.035, u * 0.02, u * 0.02, '#d9b45a'); // monocle glint
      break; }
    case 'masked': {
      ell(g, hx, 0, u * 0.125, u * 0.13, '#14161f');
      g.fillStyle = skin; ell(g, hx + u * 0.07, 0, u * 0.06, u * 0.085, skin);
      g.fillStyle = '#0b0c11'; g.fillRect(hx + u * 0.07, -u * 0.09, u * 0.07, u * 0.18); // bandit mask
      g.fillStyle = '#f0f2f8'; g.fillRect(hx + u * 0.1, -u * 0.05, u * 0.02, u * 0.025); g.fillRect(hx + u * 0.1, u * 0.025, u * 0.02, u * 0.025);
      break; }
    default: { // classic: dark knit beanie + eye mask
      ell(g, hx, 0, u * 0.135, u * 0.14, 'rgba(165,195,255,.45)');
      ell(g, hx, 0, u * 0.125, u * 0.13, '#2a3042');
      ell(g, hx - u * 0.03, -u * 0.04, u * 0.06, u * 0.045, 'rgba(255,255,255,.12)');
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = Math.max(1, u * 0.012);
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(hx - u * 0.1, i * u * 0.04); g.lineTo(hx + u * 0.02, i * u * 0.04); g.stroke(); }
      ell(g, hx + u * 0.075, 0, u * 0.055, u * 0.085, skin);
      g.fillStyle = '#0a0b10'; g.fillRect(hx + u * 0.06, -u * 0.085, u * 0.06, u * 0.17);
      g.fillStyle = '#e8ebf5'; g.fillRect(hx + u * 0.085, -u * 0.05, u * 0.02, u * 0.025); g.fillRect(hx + u * 0.085, u * 0.025, u * 0.02, u * 0.025);
    }
  }
  g.restore();
}

// ------------------------------------------------------------------------------------------ POLICE
/**
 * drawGuardFigure(g, x, y, ts, face, o) — o: {ph, mv, t, stage(0-3), alarm}
 * stage 0 patrol (flashlight, relaxed swing) · 1 suspicious (hand to radio, slows) · 2 detecting (flashlight raised toward target)
 * · 3 critical/alarm (leaning in, arm extended, strobing radio)
 */
export function drawGuardFigure(g, x, y, ts, face, o = {}) {
  const u = ts;
  const t = o.t || 0;
  const stage = o.stage || 0;
  const P = pose(o.ph || 0, (o.mv || 0) * (stage === 3 ? 1.25 : 1), t, stage === 3 ? 0.24 : 0.19);
  const lean = stage >= 2 ? 0.025 * stage : 0;
  const alert = stage === 3 || o.alarm;
  const navy = '#1c2745', navyHi = '#34457a', vest = '#10141f', trouser = '#121827';
  g.save();
  g.translate(x, y);
  shadow(g, u, 0.55, 1.1);
  g.rotate(face);
  const big = stage === 3 ? 1.05 : 1;
  g.scale(big, big);
  g.translate((P.bob + lean) * u, P.sway * u);

  // boots + legs
  const hipY = u * 0.085;
  for (const [side, off] of [[-1, P.legL], [1, P.legR]]) {
    const fx = off * u * 1.3;
    limb(g, 0, side * hipY, fx, side * hipY * 1.3, u * 0.115, trouser);
    ell(g, fx + u * 0.04, side * hipY * 1.3, u * 0.1, u * 0.062, '#07080b');
    ell(g, fx + u * 0.075, side * hipY * 1.3, u * 0.03, u * 0.04, 'rgba(255,255,255,.09)');
  }
  // arms: sleeves + gloves; pose depends on stage
  const sy = u * 0.31;
  const L = { hx: P.armL * u * 1.2, hy: -sy - u * 0.02 };           // left (-y)
  let R = { hx: P.armR * u * 1.2 + u * 0.02, hy: sy + u * 0.03 };   // right (+y), carries flashlight
  if (stage === 1) { L.hx = u * 0.1; L.hy = -u * 0.12; }            // left hand up to the shoulder radio
  if (stage === 2) { R = { hx: u * 0.26, hy: u * 0.1 }; }           // flashlight raised toward the thief
  if (stage === 3) { R = { hx: u * 0.38, hy: u * 0.02 }; L.hx = u * 0.16; L.hy = -u * 0.17; } // arm fully extended
  limb(g, 0, -sy + u * 0.03, L.hx, L.hy, u * 0.11, navy);
  limb(g, 0, sy - u * 0.03, R.hx, R.hy, u * 0.11, navy);
  limb(g, 0, -sy + u * 0.03, L.hx * 0.6, (L.hy - sy) / 2, u * 0.05, navyHi);
  ell(g, L.hx, L.hy, u * 0.052, u * 0.052, '#0b0c11');
  ell(g, R.hx, R.hy, u * 0.052, u * 0.052, '#0b0c11');
  // flashlight in right hand
  g.save(); g.translate(R.hx + u * 0.02, R.hy);
  g.fillStyle = '#171a22'; g.fillRect(0, -u * 0.022, u * 0.12, u * 0.044);
  g.fillStyle = stage >= 2 ? '#fff6c8' : '#9aa6c8'; g.fillRect(u * 0.12, -u * 0.03, u * 0.02, u * 0.06);
  if (stage >= 2) { const lg = g.createRadialGradient(u * 0.14, 0, 0, u * 0.14, 0, u * 0.35); lg.addColorStop(0, 'rgba(255,246,200,.55)'); lg.addColorStop(1, 'rgba(255,246,200,0)'); g.fillStyle = lg; g.beginPath(); g.arc(u * 0.14, 0, u * 0.35, 0, TAU); g.fill(); }
  g.restore();

  // torso: uniform shirt + tactical vest + belt + radio
  const tg = g.createRadialGradient(-u * 0.02, -u * 0.04, u * 0.02, 0, 0, u * 0.3);
  tg.addColorStop(0, navyHi); tg.addColorStop(0.6, navy); tg.addColorStop(1, '#090c16');
  g.fillStyle = tg; rrect(g, -u * 0.12, -u * 0.3, u * 0.26, u * 0.6, u * 0.1); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = Math.max(1, u * 0.012); g.stroke();
  g.fillStyle = vest; rrect(g, -u * 0.085, -u * 0.245, u * 0.17, u * 0.49, u * 0.05); g.fill();            // vest
  g.fillStyle = '#1b2234'; g.fillRect(-u * 0.02, -u * 0.245, u * 0.02, u * 0.49);                      // vest zip
  g.fillStyle = '#242c44'; g.fillRect(u * 0.0, -u * 0.2, u * 0.06, u * 0.1); g.fillRect(u * 0.0, u * 0.1, u * 0.06, u * 0.1); // pouches
  g.fillStyle = '#e7edf8'; g.globalAlpha *= 0.8; g.fillRect(-u * 0.095, u * 0.03, u * 0.05, u * 0.02); g.globalAlpha = 1; // POLICE patch hint
  g.fillStyle = '#05060a'; g.fillRect(-u * 0.1, -u * 0.25, u * 0.025, u * 0.5);                 // belt line at back
  // shoulder epaulettes
  g.fillStyle = '#0d1120'; g.fillRect(-u * 0.02, -u * 0.3, u * 0.06, u * 0.05); g.fillRect(-u * 0.02, u * 0.25, u * 0.06, u * 0.05);
  // shoulder radio with status LED (strobes red/blue when alert)
  g.fillStyle = '#05060a'; g.fillRect(u * 0.01, -u * 0.27, u * 0.07, u * 0.05);
  const strobe = alert ? (Math.floor(t * 8) % 2 ? '#ff2d3e' : '#2d6bff') : (stage ? '#ffb020' : '#3ddc84');
  g.fillStyle = strobe; g.fillRect(u * 0.055, -u * 0.265, u * 0.02, u * 0.02);
  if (alert) { const gl = g.createRadialGradient(u * 0.065, -u * 0.26, 0, u * 0.065, -u * 0.26, u * 0.2); gl.addColorStop(0, strobe + 'aa'); gl.addColorStop(1, strobe + '00'); g.fillStyle = gl; g.beginPath(); g.arc(u * 0.065, -u * 0.26, u * 0.2, 0, TAU); g.fill(); }

  // head + police cap
  g.scale(1.2, 1.2);
  const hx = u * 0.035 + (stage >= 2 ? u * 0.015 : 0);
  ell(g, hx - u * 0.02, 0, u * 0.13, u * 0.14, 'rgba(0,0,0,.4)');
  ell(g, hx, 0, u * 0.115, u * 0.125, '#d2aa88');                                                   // skin (sides/neck)
  ell(g, hx - u * 0.01, 0, u * 0.125, u * 0.135, '#141b33');                                        // cap crown
  ell(g, hx - u * 0.015, 0, u * 0.085, u * 0.095, '#202c52');
  g.fillStyle = '#080a12'; rrect(g, hx + u * 0.075, -u * 0.1, u * 0.08, u * 0.2, u * 0.035); g.fill(); // peak (brim)
  g.fillStyle = '#d6a82b'; g.beginPath(); g.arc(hx + u * 0.015, 0, u * 0.028, 0, TAU); g.fill();      // gold badge
  g.restore();
}
