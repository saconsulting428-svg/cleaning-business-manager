/* HUSH HD - puppet for the supplied survivor art. The running frame with the clearest legs is cut into an upper body and, per leg, thigh, shin and boot. Each piece is
   moved every frame from a continuous skeleton (two-bone IK legs planted by distance travelled, lean, bob), so the look is the supplied artwork and the motion is
   continuous. Source pixels are the frame cell of Survivor_Run frame 4 (557x681). Screen space is y-down; the skeleton is y-up in metres. */
const Puppet = (function () {
  'use strict';
  const PI = Math.PI, K = 0.002736, FRAME = 4;
  const lerp = function (a, b, t) { return a + (b - a) * t; }, clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const ease = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }, frac = function (v) { return v - Math.floor(v); };
  const sstep = function (a, b, v) { return ease((v - a) / (b - a)); };
  const L = { thigh: 0.38, shin: 0.39, ankle: 0.23 };
  function ik(ax, ay, bx, by, l1, l2, bend) {
    let dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy); const m = l1 + l2 - 0.002; if (d > m) { dx *= m / d; dy *= m / d; d = m; } if (d < 0.05) d = 0.05;
    const a = Math.atan2(dy, dx), k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), j = a + bend * k; return { mx: ax + Math.cos(j) * l1, my: ay + Math.sin(j) * l1 };
  }
  function newState() { return { lean: 0.05 }; }
  /* P: { ph (gait cycles), w (0..1 moving), c (0..1 crouch), t, dt } -> hip, lean, two feet (knee, ankle, pitch) */
  function pose(S, P) {
    const w = P.w, c = P.c, ph = P.ph, t = P.t, J = {};
    const hip0 = lerp(0.96, 0.66, c), stepL = lerp(0.95, 0.6, c) * w, lift = lerp(0.19, 0.1, c) * w, st = lerp(0.5, 0.6, c), bob = lerp(0.04, 0.016, c) * w, br = Math.sin(t * 1.9) * 0.006 * (1 - w), cyc = 2 * PI * ph;
    const hx = Math.sin(t * 0.7) * 0.01 * (1 - w), hy = hip0 - bob * (0.5 + 0.5 * Math.cos(2 * cyc)) + br; J.hip = [hx, hy];
    J.feet = [];
    for (let k = 0; k < 2; k++) {
      const q = frac(ph + 0.5 * k), idleX = k ? -0.1 : 0.1; let gx, gy, pitch;
      if (q < st) { const u = q / st; gx = stepL * (0.5 - u); gy = 0; pitch = lerp(0.35, 0, sstep(0, 0.3, u)) - 0.5 * sstep(0.7, 1, u); }
      else { const s = (q - st) / (1 - st); gx = stepL * (-0.5 + ease(s)); gy = lift * Math.pow(Math.sin(PI * s), 0.85); pitch = lerp(-0.5, 0.35, s) + 0.25 * Math.sin(PI * s); }
      const fx = hx + lerp(idleX, gx, w) + 0.05 * c, ank = [fx - 0.03, gy + L.ankle], leg = ik(hx, hy, ank[0], ank[1], L.thigh, L.shin, 1);
      J.feet.push({ knee: [leg.mx, leg.my], ank, pitch: lerp(0, pitch, w) });
    }
    const target = lerp(0.03, 0.5, c) + 0.14 * w + (P.acc || 0) * 0.14; S.lean += (target - S.lean) * Math.min(1, P.dt * 12); J.lean = S.lean; return J;
  }

  /* ---- source geometry (native pixels in the frame cell), one config per character ---- */
  const CFG = {
    surv: { sheet: 'Survivor_Run', frame: 4, K: 0.002736, hip: [318, 365], lean0: 0.26, mark: [517, 288], L: L,
      legs: [{ h: [312, 372], k: [205, 447], a: [72, 497], bAng: 1.5, half: 80 }, { h: [330, 362], k: [455, 400], a: [468, 515], bAng: 0.12, half: 70 }],
      split: [420, 250], boot: [[[0, 452], [122, 446], [128, 500], [102, 560], [70, 612], [0, 612]], [[428, 503], [557, 498], [557, 562], [500, 604], [440, 612], [422, 560]]],
      upper: [[0, 0], [557, 0], [557, 322], [405, 326], [398, 382], [335, 404], [255, 400], [208, 362], [150, 336], [0, 336]], below: [[0, 312], [150, 312], [330, 316], [405, 300], [557, 300], [557, 681], [0, 681]], W: 557, H: 681, pose: pose },
    mon: { sheet: 'Monster_Run', frame: 3, K: 0.002904, hip: [360, 388], lean0: 1.05, mark: [655, 215], L: { thigh: 0.5, shin: 0.45, ankle: 0.2 },
      legs: [{ h: [350, 385], k: [190, 447], a: [62, 505], bAng: 1.5, half: 95 }, { h: [410, 402], k: [525, 455], a: [605, 570], bAng: 0.2, half: 85 }],
      split: [480, 300], boot: [[[0, 480], [135, 478], [125, 560], [70, 625], [0, 625]], [[560, 535], [742, 545], [742, 655], [640, 655], [560, 612]]],
      upper: [[0, 0], [742, 0], [742, 446], [566, 446], [545, 382], [492, 422], [400, 434], [322, 426], [292, 372], [165, 372], [112, 446], [0, 446]], below: [[0, 446], [112, 446], [150, 352], [480, 352], [545, 360], [566, 446], [742, 446], [742, 753], [0, 753]], W: 742, H: 753, pose: null }
  };
  const caches = {};
  function build(cfg, q, fr) {
    const w = fr.width, h = fr.height, polyPath = function (x, poly) { x.beginPath(); poly.forEach(function (p, i) { if (i) x.lineTo(p[0] * q, p[1] * q); else x.moveTo(p[0] * q, p[1] * q); }); x.closePath(); };
    const piece = function (clips) { const c = Gfx.mk(w, h), x = c.getContext('2d'); x.save(); clips.forEach(function (p) { if (p.c) { x.beginPath(); x.arc(p.c[0] * q, p.c[1] * q, p.r * q, 0, 6.2832); } else polyPath(x, p); x.clip(); }); x.drawImage(fr, 0, 0); x.restore(); return c; };
    const union = function (list) { const c = Gfx.mk(w, h), x = c.getContext('2d'); list.forEach(function (clips) { x.drawImage(piece(clips), 0, 0); }); return c; };       // pieces end in round caps, so a bent joint leaves no gap on its outer side
    const disc = function (c, r) { return { c: c, r: r }; };
    const quad = function (a, b, half, extA, extB) {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux, A = [a[0] - ux * extA, a[1] - uy * extA], B = [b[0] + ux * extB, b[1] + uy * extB];
      return [[A[0] + nx * half, A[1] + ny * half], [B[0] + nx * half, B[1] + ny * half], [B[0] - nx * half, B[1] - ny * half], [A[0] - nx * half, A[1] - ny * half]];
    };
    const P = { q, upper: piece([cfg.upper]), legs: [] };
    for (let i = 0; i < 2; i++) {
      const g = cfg.legs[i], sp = cfg.split[i], side = i === 0 ? [[0, 0], [sp, 0], [sp, cfg.H], [0, cfg.H]] : [[sp, 0], [cfg.W, 0], [cfg.W, cfg.H], [sp, cfg.H]];
      P.legs.push({ thigh: union([[quad(g.h, g.k, g.half, 30, 0), side, cfg.below], [disc(g.k, g.half * 0.9), side, cfg.below], [disc(g.h, g.half * 0.8), side, cfg.below]]), shin: union([[quad(g.k, g.a, g.half * 0.85, 22, 0)], [disc(g.k, g.half * 0.8)], [disc(g.a, g.half * 0.7)]]), boot: piece([cfg.boot[i]]) });
    }
    return P;
  }
  function pieces(cfg, PM) {
    const e = Gfx.SP[cfg.sheet]; if (!e || !e.ok) return null; const s = Gfx.scaledSheet(cfg.sheet, cfg.K * PM), c = caches[cfg.sheet];
    if (c && c.q === s.q) return c; return (caches[cfg.sheet] = build(cfg, s.q, s.frames[cfg.frame]));
  }
  /* draws a character at screen (px, fy) facing dir from a skeleton pose J; returns the marker point (torch lens / eye) in screen px */
  function drawRig(cfg, J, ctx, px, fy, dir, PM, alpha, tint) {
    const pcs = pieces(cfg, PM); if (!pcs) return null; const q = pcs.q, f = dir < 0 ? -1 : 1;
    const X = function (m) { return m * PM; }, Y = function (m) { return -m * PM; };
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(px, fy); ctx.scale(f, 1);
    const part = function (cv, anchor, tx, ty, rot, sc) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(rot); ctx.scale(sc, sc); ctx.drawImage(cv, -anchor[0] * q, -anchor[1] * q); ctx.restore(); };
    const ang = function (a, b) { return Math.atan2(b[1] - a[1], b[0] - a[0]); }, len = function (a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); };
    const hipS = [X(J.hip[0]), Y(J.hip[1])];
    for (let i = 0; i < 2; i++) {                                                        // far leg (feet[1]) uses the back-leg art, near leg (feet[0]) the front-leg art
      const g = cfg.legs[1 - i], fo = J.feet[i === 0 ? 1 : 0], pcL = pcs.legs[1 - i];
      const knee = [X(fo.knee[0]), Y(fo.knee[1])], ank = [X(fo.ank[0]), Y(fo.ank[1])];
      const sThigh = len(hipS, knee) / (len(g.h, g.k) * q), sShin = len(knee, ank) / (len(g.k, g.a) * q);
      part(pcL.shin, g.k, knee[0], knee[1], ang(knee, ank) - ang(g.k, g.a), sShin);
      part(pcL.boot, g.a, ank[0], ank[1], -fo.pitch - g.bAng, sShin);
      part(pcL.thigh, g.h, hipS[0], hipS[1], ang(hipS, knee) - ang(g.h, g.k), sThigh);
    }
    const up = J.lean - cfg.lean0; part(pcs.upper, cfg.hip, hipS[0], hipS[1], up, 1);
    ctx.restore();
    const dx = (cfg.mark[0] - cfg.hip[0]) * q, dy = (cfg.mark[1] - cfg.hip[1]) * q, c = Math.cos(up), s = Math.sin(up), lx = hipS[0] + dx * c - dy * s, ly = hipS[1] + dx * s + dy * c;
    return { x: px + f * lx, y: fy + ly };
  }
  function drawSurvivor(S, ctx, px, fy, dir, PM, P, alpha) { const r = drawRig(CFG.surv, pose(S, P), ctx, px, fy, dir, PM, alpha); return r ? { lens: r } : null; }

  /* ---- creature skeleton: digitigrade legs, hunched torso; prowl -> run via P.run ---- */
  function cpose(S, P) {
    const w = P.w, run = P.run, ph = P.ph, t = P.t, J = {}, Lm = CFG.mon.L;
    const hip0 = lerp(0.98, 0.9, run), stepL = lerp(1.0, 1.7, run) * w, lift = lerp(0.26, 0.36, run) * w, st = lerp(0.58, 0.42, run), bob = lerp(0.04, 0.09, run) * w, br = Math.sin(t * 1.5) * 0.012 * (1 - w), cyc = 2 * PI * ph;
    const hx = 0, hy = hip0 - bob * (0.5 + 0.5 * Math.cos(2 * cyc)) + br; J.hip = [hx, hy]; J.feet = [];
    for (let k = 0; k < 2; k++) {
      const q = frac(ph + 0.5 * k), idleX = k ? -0.18 : 0.12; let gx, gy, pitch;
      if (q < st) { const u = q / st; gx = stepL * (0.5 - u); gy = 0; pitch = lerp(0.2, 0, sstep(0, 0.4, u)) - 0.6 * sstep(0.75, 1, u); }
      else { const s = (q - st) / (1 - st); gx = stepL * (-0.5 + ease(s)); gy = lift * Math.pow(Math.sin(PI * s), 0.8); pitch = lerp(-0.6, 0.3, s); }
      const fx = hx + lerp(idleX, gx, w), ank = [fx - 0.05, gy + Lm.ankle], leg = ik(hx, hy, ank[0], ank[1], Lm.thigh, Lm.shin, 1);
      J.feet.push({ knee: [leg.mx, leg.my], ank, pitch: lerp(0.05, pitch, w) });
    }
    const target = lerp(0.62, 1.0, run * w) - 0.1 * (1 - w) + (P.mode === 'inv' ? 0.1 : 0) + (P.mode === 'search' ? 0.04 * Math.sin(t * 1.3) : 0); S.lean += (target - S.lean) * Math.min(1, P.dt * 10); J.lean = S.lean; return J;
  }
  function drawCreature(S, ctx, px, fy, dir, PM, P, alpha) { const r = drawRig(CFG.mon, cpose(S, P), ctx, px, fy, dir, PM, alpha); return r ? { eye: r } : null; }
  return { newState, pose, cpose, drawSurvivor, drawCreature, ready: function () { const e = Gfx.SP.Survivor_Run, m = Gfx.SP.Monster_Run; return !!(e && e.ok && m && m.ok); } };
})();
