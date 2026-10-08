// Top-down humanoid sprites drawn procedurally on canvas (no images, no 3D): a shared skeleton — legs with knees and
// laced shoes, jointed arms with cuffs and gloves, shoulders, torso, head — plus outfits for the thief and the police.
// Animation: alternating stride, counter-swinging arms, shoulder twist, body bob, idle breathing, hide/crouch pose.
import { getVariant } from '../entities/cosmetics.js';

const TAU = Math.PI * 2;
const RIM = 'rgba(150,185,255,';          // cool rim light: keeps the thief readable in the dark

function ell(g, x, y, rx, ry, fill, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fillStyle = fill; g.fill(); }
function limb(g, x0, y0, x1, y1, w, col) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const mix = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

/** Soft contact shadow cast down-right (light from the upper left). */
function shadow(g, u, a = 0.4, k = 1) {
  g.save(); g.translate(u * 0.08, u * 0.11);
  const gr = g.createRadialGradient(0, 0, u * 0.05, 0, 0, u * 0.46 * k);
  gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.6, `rgba(0,0,0,${a * 0.45})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, u * 0.46 * k, u * 0.4 * k, 0, 0, TAU); g.fill(); g.restore();
}

/** Shared pose maths. ph: walk phase (rad), mv: 0 idle .. 1 full stride, t: clock (s). */
function pose(ph, mv, t, stride = 0.2) {
  const s = Math.sin(ph) * mv;
  return {
    legL: s * stride, legR: -s * stride, armL: -s * 0.16, armR: s * 0.16,
    bob: Math.abs(Math.cos(ph)) * mv * 0.012,
    sway: Math.sin(ph) * mv * 0.014 + Math.sin(t * 1.7) * 0.004 * (1 - mv),
    twist: Math.sin(ph) * mv * 0.09,                        // shoulders counter-rotate against the hips
    breathe: 1 + Math.sin(t * 2.2) * 0.014 * (1 - mv),
  };
}

/** One leg: trouser with highlight + knee crease, laced sneaker/boot with sole. */
function leg(g, u, side, off, c, boot) {
  const hipY = side * u * 0.08, fx = off * u * 1.35 + u * 0.1, fy = side * u * 0.095;
  limb(g, 0, hipY, fx, fy, u * 0.12, c.pants);
  limb(g, 0, hipY - side * u * 0.02, fx, fy - side * u * 0.02, u * 0.045, c.pantsHi);
  if (c.stripe) limb(g, 0, hipY + side * u * 0.05, fx, fy + side * u * 0.05, u * 0.014, c.stripe);
  ell(g, fx * 0.5, (hipY + fy) / 2, u * 0.05, u * 0.04, 'rgba(255,255,255,.07)');                // knee
  ell(g, fx + u * 0.045, fy + side * u * 0.012, u * 0.108, u * 0.064, boot ? '#bfc3d0' : '#cfd3df'); // sole
  ell(g, fx + u * 0.04, fy, u * 0.1, u * 0.056, boot ? '#07080b' : '#0d0e13');                       // upper
  ell(g, fx + u * 0.085, fy, u * 0.03, u * 0.034, 'rgba(255,255,255,.2)');                           // toe cap sheen
  g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = Math.max(1, u * 0.01);
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(fx + u * (0.0 + i * 0.03), fy - u * 0.02); g.lineTo(fx + u * (0.0 + i * 0.03), fy + u * 0.02); g.stroke(); }
}

/** One arm: sleeve (shoulder -> elbow -> wrist) with rim light, cuff and glove. Returns the hand position. */
function arm(g, u, side, swing, hand, c, rim = true) {
  const sx = 0, sy = side * u * 0.27;
  const hx = hand ? hand.x : swing * u * 1.25 + u * 0.03, hy = hand ? hand.y : side * u * 0.34;
  const ex = sx + (hx - sx) * 0.45, ey = side * u * (Math.abs(sy / u) + 0.045);
  if (rim) { limb(g, sx, sy, ex, ey, u * 0.135, `${RIM}.35)`); limb(g, ex, ey, hx, hy, u * 0.115, `${RIM}.35)`); }
  limb(g, sx, sy, ex, ey, u * 0.115, c.sleeve); limb(g, ex, ey, hx, hy, u * 0.098, c.sleeve);
  limb(g, sx, sy - side * u * 0.01, ex, ey - side * u * 0.01, u * 0.04, c.sleeveHi); limb(g, ex, ey - side * u * 0.01, hx, hy - side * u * 0.01, u * 0.035, c.sleeveHi);
  ell(g, ex, ey, u * 0.05, u * 0.045, 'rgba(0,0,0,.18)');                                          // elbow crease
  ell(g, hx - (hx - ex) * 0.12, hy - (hy - ey) * 0.12, u * 0.052, u * 0.06, c.cuff);               // cuff
  ell(g, hx + u * 0.012, hy, u * 0.056, u * 0.052, c.glove);                                       // glove
  ell(g, hx + u * 0.03, hy - side * u * 0.012, u * 0.02, u * 0.015, 'rgba(255,255,255,.22)');
  return { x: hx, y: hy };
}

// ------------------------------------------------------------------------------------------ THIEF
/**
 * drawThief(g, x, y, r, charId, variantId, face, opts)
 * r ≈ 0.36 * tile size (kept for compatibility). face: radians (0 = east).
 * opts: {alpha, ph (walk phase), mv (0..1), t (clock s), crouch, moving}
 */
export function drawThief(g, x, y, r, charId, variantId, face = Math.PI / 2, opts = {}) {
  const u = r / 0.36;
  const v = getVariant(variantId);
  const t = opts.t || 0;
  const P = pose(opts.ph ?? (opts.moving ? t * 12 : 0), opts.mv ?? (opts.moving ? 1 : 0), t, 0.2);
  const crouch = opts.crouch || 0;
  const jacket = mix(v.suit, '#0b0d14', 0.3), jacketHi = mix(v.suit, '#a9b7e6', 0.3);
  const c = { pants: '#171a23', pantsHi: '#2a2f3d', stripe: null, sleeve: jacket, sleeveHi: jacketHi, cuff: mix(v.suit, '#000000', 0.55), glove: '#0b0c11' };
  g.save();
  g.globalAlpha = opts.alpha ?? 1;
  g.translate(x, y);
  shadow(g, u, 0.55, 1 - crouch * 0.2);
  g.rotate(face);
  g.scale(1 - crouch * 0.12, 1 + crouch * 0.1);
  g.translate(P.bob * u, P.sway * u);
  if (v.glow) { const gl = g.createRadialGradient(0, 0, u * 0.1, 0, 0, u * 0.62); gl.addColorStop(0, v.glow + '55'); gl.addColorStop(1, v.glow + '00'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, u * 0.62, 0, TAU); g.fill(); }
  leg(g, u, -1, P.legL, c, false); leg(g, u, 1, P.legR, c, false);
  // backpack with straps
  g.save(); g.translate(-u * 0.155, 0);
  g.fillStyle = 'rgba(0,0,0,.4)'; rrect(g, -u * 0.085, -u * 0.125, u * 0.19, u * 0.27, u * 0.05); g.fill();
  rrect(g, -u * 0.09, -u * 0.135, u * 0.19, u * 0.27, u * 0.05); g.fillStyle = '#17120e'; g.fill();
  rrect(g, -u * 0.07, -u * 0.105, u * 0.14, u * 0.21, u * 0.04); g.fillStyle = '#2b2118'; g.fill();
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(-u * 0.07, -u * 0.105, u * 0.14, u * 0.02);
  g.fillStyle = '#3d3022'; g.fillRect(-u * 0.015, -u * 0.105, u * 0.03, u * 0.21);                    // zip
  g.restore();
  arm(g, u, -1, P.armL, null, c); arm(g, u, 1, P.armR, null, c);
  // torso (jacket / hoodie back) — shoulders twist against the hips while walking
  g.save(); g.rotate(P.twist); g.scale(P.breathe, P.breathe);
  const tg = g.createRadialGradient(-u * 0.02, -u * 0.06, u * 0.02, 0, 0, u * 0.3);
  tg.addColorStop(0, jacketHi); tg.addColorStop(0.5, jacket); tg.addColorStop(1, mix(v.suit, '#000000', 0.78));
  g.fillStyle = tg; rrect(g, -u * 0.1, -u * 0.27, u * 0.23, u * 0.54, u * 0.1); g.fill();
  g.strokeStyle = `${RIM}.6)`; g.lineWidth = Math.max(1.2, u * 0.018); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = Math.max(1, u * 0.012);
  g.beginPath(); g.moveTo(-u * 0.09, 0); g.lineTo(u * 0.12, 0); g.stroke();                              // back seam
  g.beginPath(); g.moveTo(-u * 0.02, -u * 0.25); g.quadraticCurveTo(u * 0.04, -u * 0.17, u * 0.05, -u * 0.07);   // yoke / shoulder seams
  g.moveTo(-u * 0.02, u * 0.25); g.quadraticCurveTo(u * 0.04, u * 0.17, u * 0.05, u * 0.07); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.09)';                                                                  // fabric creases
  g.beginPath(); g.moveTo(-u * 0.06, -u * 0.17); g.lineTo(u * 0.02, -u * 0.12); g.moveTo(-u * 0.06, u * 0.17); g.lineTo(u * 0.02, u * 0.12); g.stroke();
  g.fillStyle = v.accent; g.globalAlpha *= 0.5; g.fillRect(u * 0.0, -u * 0.265, u * 0.02, u * 0.1); g.fillRect(u * 0.0, u * 0.165, u * 0.02, u * 0.1); g.globalAlpha = opts.alpha ?? 1;   // reflective piping
  // bunched hood at the nape
  ell(g, u * 0.0, 0, u * 0.075, u * 0.13, mix(v.suit, '#000000', 0.45));
  ell(g, -u * 0.015, -u * 0.02, u * 0.04, u * 0.06, 'rgba(255,255,255,.06)');
  g.restore();
  head(g, u, charId, v, jacket, jacketHi, t, P);
  g.restore();
}

function head(g, u, charId, v, suit, suitHi, t, P) {
  g.save(); g.scale(1.22, 1.22);
  const hx = u * 0.03 + P.bob * u * 0.5;
  const skin = '#d9b090', dark = '#12141c';
  ell(g, hx - u * 0.02, 0, u * 0.13, u * 0.14, 'rgba(0,0,0,.4)');                                      // contact shade
  for (const s of [-1, 1]) ell(g, hx - u * 0.005, s * u * 0.118, u * 0.028, u * 0.033, '#c79b7b');       // ears
  switch (charId) {
    case 'ninja':
      ell(g, hx, 0, u * 0.125, u * 0.13, dark); ell(g, hx + u * 0.075, 0, u * 0.06, u * 0.085, '#0b0c11');
      g.fillStyle = '#e2e5ee'; g.fillRect(hx + u * 0.088, -u * 0.045, u * 0.025, u * 0.022); g.fillRect(hx + u * 0.088, u * 0.022, u * 0.025, u * 0.022);
      g.fillStyle = '#b3202d'; g.fillRect(hx - u * 0.01, -u * 0.13, u * 0.045, u * 0.26);
      { const flap = Math.sin(t * 9) * u * 0.02; limb(g, hx - u * 0.02, u * 0.09, hx - u * 0.19, u * 0.14 + flap, u * 0.03, '#b3202d'); limb(g, hx - u * 0.02, u * 0.06, hx - u * 0.17, u * 0.03 + flap, u * 0.03, '#8d1824'); }
      break;
    case 'hacker':
      ell(g, hx - u * 0.015, 0, u * 0.145, u * 0.15, suit); ell(g, hx - u * 0.03, -u * 0.015, u * 0.1, u * 0.1, suitHi);
      limb(g, hx + u * 0.06, -u * 0.07, hx + u * 0.1, -u * 0.12, u * 0.012, '#c9ced9'); limb(g, hx + u * 0.06, u * 0.07, hx + u * 0.1, u * 0.12, u * 0.012, '#c9ced9');   // drawstrings
      ell(g, hx + u * 0.075, 0, u * 0.065, u * 0.09, '#0b0c11');
      g.fillStyle = '#58f0ff'; g.fillRect(hx + u * 0.08, -u * 0.07, u * 0.035, u * 0.14);
      break;
    case 'spy':
      ell(g, hx, 0, u * 0.12, u * 0.125, '#101218'); ell(g, hx + u * 0.02, 0, u * 0.2, u * 0.15, '#1a1c25'); ell(g, hx, 0, u * 0.1, u * 0.1, '#262a36');
      ell(g, hx - u * 0.02, -u * 0.03, u * 0.05, u * 0.03, 'rgba(255,255,255,.1)');
      g.fillStyle = '#7d1f2b'; g.fillRect(hx - u * 0.05, -u * 0.095, u * 0.03, u * 0.19); ell(g, hx + u * 0.12, 0, u * 0.035, u * 0.075, '#07080b');
      break;
    case 'gentleman':
      ell(g, hx - u * 0.01, 0, u * 0.175, u * 0.155, '#0c0d12'); ell(g, hx - u * 0.01, 0, u * 0.095, u * 0.095, '#1a1b24');
      ell(g, hx - u * 0.018, -u * 0.015, u * 0.05, u * 0.05, 'rgba(255,255,255,.08)');
      g.strokeStyle = '#b8892b'; g.lineWidth = Math.max(1, u * 0.02); g.beginPath(); g.arc(hx - u * 0.01, 0, u * 0.095, 0, TAU); g.stroke();
      ell(g, hx + u * 0.125, u * 0.035, u * 0.02, u * 0.02, '#d9b45a');
      break;
    case 'masked':
      ell(g, hx, 0, u * 0.125, u * 0.13, '#14161f'); ell(g, hx + u * 0.07, 0, u * 0.06, u * 0.085, skin);
      g.fillStyle = '#0b0c11'; g.fillRect(hx + u * 0.07, -u * 0.09, u * 0.07, u * 0.18);
      g.fillStyle = '#f0f2f8'; g.fillRect(hx + u * 0.1, -u * 0.05, u * 0.02, u * 0.025); g.fillRect(hx + u * 0.1, u * 0.025, u * 0.02, u * 0.025);
      break;
    default: // classic: dark knit beanie + eye mask, hoodie collar behind
      ell(g, hx, 0, u * 0.135, u * 0.14, `${RIM}.45)`); ell(g, hx, 0, u * 0.125, u * 0.13, '#2a3042');
      ell(g, hx - u * 0.03, -u * 0.04, u * 0.06, u * 0.045, 'rgba(255,255,255,.14)');
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = Math.max(1, u * 0.012);
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(hx - u * 0.1, i * u * 0.04); g.lineTo(hx + u * 0.02, i * u * 0.04); g.stroke(); }
      ell(g, hx + u * 0.075, 0, u * 0.055, u * 0.085, skin);
      g.fillStyle = '#0a0b10'; g.fillRect(hx + u * 0.06, -u * 0.085, u * 0.06, u * 0.17);
      g.fillStyle = '#e8ebf5'; g.fillRect(hx + u * 0.085, -u * 0.05, u * 0.02, u * 0.025); g.fillRect(hx + u * 0.085, u * 0.025, u * 0.02, u * 0.025);
  }
  g.restore();
}

// ------------------------------------------------------------------------------------------ POLICE
/**
 * drawGuardFigure(g, x, y, ts, face, o) — o: {ph, mv, t, stage 0-3, alarm, headYaw, chase}
 * stage 0 patrol (flashlight low, relaxed swing) · 1 suspicious (stops, hand to shoulder radio, head turns)
 * · 2 detecting (flashlight raised toward the target) · 3 alert/chase (braced, arm extended, strobing radio, longer stride)
 */
export function drawGuardFigure(g, x, y, ts, face, o = {}) {
  const u = ts;
  const t = o.t || 0;
  const stage = o.stage || 0;
  const run = o.chase ? 1.35 : 1;
  const P = pose(o.ph || 0, Math.min(1.3, (o.mv || 0) * run), t, stage === 3 ? 0.25 : 0.19);
  const lean = stage >= 2 ? 0.02 * stage : 0;
  const alert = stage === 3 || o.alarm;
  const navy = '#1b2644', navyHi = '#3a4d86';
  const c = { pants: '#101624', pantsHi: '#1f2a44', stripe: '#33508f', sleeve: navy, sleeveHi: navyHi, cuff: '#10172b', glove: '#0a0b0f' };
  g.save();
  g.translate(x, y);
  shadow(g, u, 0.6, 1.1);
  g.rotate(face);
  const big = stage === 3 ? 1.05 : 1;
  g.scale(big, big);
  g.translate((P.bob + lean) * u, P.sway * u);

  leg(g, u, -1, P.legL, c, true); leg(g, u, 1, P.legR, c, true);

  // hands by stage
  let L = null, R = null;                                                          // null => natural swing
  if (stage === 1) L = { x: u * 0.09, y: -u * 0.13 };                              // left hand to the shoulder radio
  if (stage === 2) R = { x: u * 0.27, y: u * 0.1 };                                // flashlight raised toward the thief
  if (stage === 3) { R = { x: u * 0.4, y: u * 0.03 }; L = { x: u * 0.17, y: -u * 0.18 }; }
  const lh = arm(g, u, -1, P.armL, L, c, false);
  const rh = arm(g, u, 1, P.armR, R, c, false);

  // flashlight (metal body, grip ring, lens + glow when raised)
  g.save(); g.translate(rh.x + u * 0.015, rh.y);
  if (stage === 0) g.rotate(0.15);
  const fg = g.createLinearGradient(0, -u * 0.03, 0, u * 0.03); fg.addColorStop(0, '#6c7384'); fg.addColorStop(0.5, '#cfd4df'); fg.addColorStop(1, '#3a3f4d');
  g.fillStyle = fg; rrect(g, 0, -u * 0.026, u * 0.13, u * 0.052, u * 0.012); g.fill();
  g.fillStyle = '#0e1016'; g.fillRect(u * 0.03, -u * 0.028, u * 0.02, u * 0.056);
  g.fillStyle = stage >= 2 ? '#fffbe0' : '#a9b4d0'; g.fillRect(u * 0.125, -u * 0.036, u * 0.022, u * 0.072);
  if (stage >= 2) { const lg = g.createRadialGradient(u * 0.15, 0, 0, u * 0.15, 0, u * 0.4); lg.addColorStop(0, 'rgba(255,248,210,.6)'); lg.addColorStop(1, 'rgba(255,248,210,0)'); g.fillStyle = lg; g.beginPath(); g.arc(u * 0.15, 0, u * 0.4, 0, TAU); g.fill(); }
  g.restore();

  // torso: shirt, tactical vest (MOLLE rows, reflective tape), epaulettes, radio
  g.save(); g.rotate(P.twist);
  const tg = g.createRadialGradient(-u * 0.02, -u * 0.06, u * 0.02, 0, 0, u * 0.32);
  tg.addColorStop(0, navyHi); tg.addColorStop(0.55, navy); tg.addColorStop(1, '#080b15');
  g.fillStyle = tg; rrect(g, -u * 0.12, -u * 0.3, u * 0.26, u * 0.6, u * 0.1); g.fill();
  g.strokeStyle = 'rgba(160,190,255,.3)'; g.lineWidth = Math.max(1, u * 0.014); g.stroke();
  g.fillStyle = '#0e1220'; rrect(g, -u * 0.085, -u * 0.245, u * 0.17, u * 0.49, u * 0.05); g.fill();        // vest
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-u * 0.07, -u * 0.2 + i * u * 0.12); g.lineTo(u * 0.07, -u * 0.2 + i * u * 0.12); g.stroke(); }
  g.fillStyle = '#c9d2e6'; g.globalAlpha *= 0.55; g.fillRect(-u * 0.07, -u * 0.245, u * 0.012, u * 0.49); g.fillRect(u * 0.06, -u * 0.245, u * 0.012, u * 0.49); g.globalAlpha = 1; // reflective tape
  g.fillStyle = '#e7edf8'; g.globalAlpha *= 0.85; g.fillRect(-u * 0.05, -u * 0.07, u * 0.035, u * 0.14); g.globalAlpha = 1;  // POLICE back panel
  g.fillStyle = '#05060a'; g.fillRect(-u * 0.1, -u * 0.25, u * 0.022, u * 0.5);                               // duty belt
  g.fillStyle = '#0a0d18'; g.fillRect(-u * 0.02, -u * 0.3, u * 0.06, u * 0.05); g.fillRect(-u * 0.02, u * 0.25, u * 0.06, u * 0.05);                 // epaulettes
  g.fillStyle = '#c9a23a'; g.fillRect(-u * 0.005, -u * 0.29, u * 0.012, u * 0.03); g.fillRect(-u * 0.005, u * 0.26, u * 0.012, u * 0.03);
  // shoulder radio with coiled mic cord + status LED (strobes red/blue when alert)
  g.fillStyle = '#05060a'; g.fillRect(u * 0.01, -u * 0.27, u * 0.07, u * 0.05);
  g.strokeStyle = '#11141c'; g.lineWidth = Math.max(1, u * 0.012); g.beginPath(); g.moveTo(u * 0.04, -u * 0.22); g.quadraticCurveTo(u * 0.07, -u * 0.17, u * 0.05, -u * 0.12); g.stroke();
  const strobe = alert ? (Math.floor(t * 8) % 2 ? '#ff2d3e' : '#2d6bff') : (stage ? '#ffb020' : '#3ddc84');
  g.fillStyle = strobe; g.fillRect(u * 0.055, -u * 0.265, u * 0.02, u * 0.02);
  if (alert) { const gl = g.createRadialGradient(u * 0.065, -u * 0.26, 0, u * 0.065, -u * 0.26, u * 0.22); gl.addColorStop(0, strobe + 'aa'); gl.addColorStop(1, strobe + '00'); g.fillStyle = gl; g.beginPath(); g.arc(u * 0.065, -u * 0.26, u * 0.22, 0, TAU); g.fill(); }
  g.restore();

  // head + police cap (the head turns independently toward whatever caught the guard's attention)
  g.save(); g.scale(1.2, 1.2);
  const hx = u * 0.035 + (stage >= 2 ? u * 0.015 : 0);
  g.translate(hx, 0); g.rotate(o.headYaw || 0); g.translate(-hx, 0);
  ell(g, hx - u * 0.02, 0, u * 0.13, u * 0.14, 'rgba(0,0,0,.4)');
  for (const s of [-1, 1]) ell(g, hx - u * 0.005, s * u * 0.12, u * 0.028, u * 0.033, '#b98f72');             // ears
  ell(g, hx, 0, u * 0.115, u * 0.125, '#cfa584');                                                              // neck/skin
  ell(g, hx - u * 0.01, 0, u * 0.128, u * 0.138, '#131a33');                                                  // cap crown
  ell(g, hx - u * 0.015, -u * 0.01, u * 0.09, u * 0.1, '#222f58');
  ell(g, hx - u * 0.035, -u * 0.035, u * 0.045, u * 0.03, 'rgba(255,255,255,.12)');
  g.strokeStyle = '#0a0d1c'; g.lineWidth = Math.max(1, u * 0.014); g.beginPath(); g.arc(hx - u * 0.01, 0, u * 0.1, 0, TAU); g.stroke();   // cap band
  const pg = g.createLinearGradient(hx + u * 0.07, 0, hx + u * 0.16, 0); pg.addColorStop(0, '#05070d'); pg.addColorStop(1, '#1a2036');
  g.fillStyle = pg; rrect(g, hx + u * 0.075, -u * 0.105, u * 0.085, u * 0.21, u * 0.04); g.fill();            // visor
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(hx + u * 0.085, -u * 0.09, u * 0.02, u * 0.06);
  const bg = g.createRadialGradient(hx + u * 0.02, 0, 0, hx + u * 0.02, 0, u * 0.035); bg.addColorStop(0, '#fff0b0'); bg.addColorStop(1, '#c9a02a');
  g.fillStyle = bg; g.beginPath(); g.arc(hx + u * 0.02, 0, u * 0.03, 0, TAU); g.fill();                         // badge
  g.restore();
  g.restore();
}
