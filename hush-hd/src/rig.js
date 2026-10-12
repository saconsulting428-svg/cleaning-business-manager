/* HUSH HD - procedural characters. A skeleton per figure, solved every frame (two-bone IK for legs, forward kinematics for the rest) and painted with
   shaded, textured shapes. There are no animation frames: every pose is computed from continuous inputs (distance travelled, speed, crouch, time, and
   one-off timers for interact / attack / caught), so motion cannot step or jump, feet stay planted on the ground, and the body, head, arms, pack and mane
   all move together. Units are metres, +x is the direction the figure faces, +y is up; the figure's origin is the floor under it. */
const Rig = (function () {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI;
  const lerp = function (a, b, t) { return a + (b - a) * t; };
  const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  const ease = function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const frac = function (v) { return v - Math.floor(v); };
  const sstep = function (a, b, v) { return ease((v - a) / (b - a)); };

  /* two-bone IK in y-up space: middle joint for a chain from (ax,ay) to a target (bx,by); bend +1 puts the middle joint to the +x/up side of the line */
  function ik(ax, ay, bx, by, l1, l2, bend) {
    let dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy); const m = l1 + l2 - 0.002;
    if (d > m) { dx *= m / d; dy *= m / d; d = m; } if (d < 0.05) { d = 0.05; }
    const a = Math.atan2(dy, dx), k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), j = a + bend * k;
    return { mx: ax + Math.cos(j) * l1, my: ay + Math.sin(j) * l1, ex: ax + dx, ey: ay + dy };
  }
  const fk = function (x, y, ang, len) { return [x + Math.sin(ang) * len, y - Math.cos(ang) * len]; };      // angle from straight down, + = forward

  /* ---------- painting helpers ---------- */
  function shade(col, k) { return 'rgb(' + clamp(Math.round(col[0] * k), 0, 255) + ',' + clamp(Math.round(col[1] * k), 0, 255) + ',' + clamp(Math.round(col[2] * k), 0, 255) + ')'; }
  /* a tapered limb: lit on its upper/front edge, dark on the lower/back edge */
  function limb(c, x1, y1, x2, y2, w1, w2, col, k) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1e-6, nx = -dy / l, ny = dx / l;
    const g = c.createLinearGradient(x1 + nx * w1, y1 + ny * w1, x1 - nx * w1, y1 - ny * w1);
    g.addColorStop(0, shade(col, 1.45 * k)); g.addColorStop(0.35, shade(col, 1.05 * k)); g.addColorStop(1, shade(col, 0.45 * k));
    c.fillStyle = g; c.beginPath(); c.moveTo(x1 + nx * w1, y1 + ny * w1); c.lineTo(x2 + nx * w2, y2 + ny * w2); c.lineTo(x2 - nx * w2, y2 - ny * w2); c.lineTo(x1 - nx * w1, y1 - ny * w1); c.closePath(); c.fill();
    c.beginPath(); c.arc(x1, y1, w1, 0, TAU); c.arc(x2, y2, w2, 0, TAU); c.fill();
  }
  function blob(c, x, y, rx, ry, rot, col, k) {
    const g = c.createRadialGradient(x - rx * 0.3, y + ry * 0.35, 0, x, y, Math.max(rx, ry) * 1.1); g.addColorStop(0, shade(col, 1.5 * k)); g.addColorStop(0.6, shade(col, 0.95 * k)); g.addColorStop(1, shade(col, 0.4 * k));
    c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill();
  }
  /* seeded random for stable hair, spikes, wear */
  function rnd(seed) { let s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  let GRAIN = null;
  function grain() {
    if (GRAIN) return GRAIN; const T = Gfx.textures(); GRAIN = T.concrete; return GRAIN;
  }
  /* cached off-screen surface per figure; painted in metres, then fabric/skin grain is laid over it and it is blitted */
  function surface(owner, w, h, PM) {
    const W = Math.ceil(w * PM), H = Math.ceil(h * PM);
    if (!owner.cv || owner.cv.width !== W || owner.cv.height !== H) { owner.cv = Gfx.mk(W, H); owner.cx = owner.cv.getContext('2d'); }
    const c = owner.cx; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, H);
    c.setTransform(PM, 0, 0, -PM, W / 2, H - 0.05 * PM); return { c, W, H };
  }
  function finish(owner, surf, ctx, px, fy, dir, alpha, PM, grainAmt) {
    const c = surf.c; c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = grainAmt; const k = PM / 70, pat = c.createPattern(grain(), 'repeat');
    c.save(); c.scale(k, k); c.fillStyle = pat; c.globalCompositeOperation = 'source-atop'; c.fillRect(0, 0, surf.W / k, surf.H / k); c.restore(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha *= alpha; const ox = Math.round(px), oy = Math.round(fy - surf.H + 0.05 * PM);
    if (dir < 0) { ctx.translate(ox, 0); ctx.scale(-1, 1); ctx.drawImage(owner.cv, -Math.round(surf.W / 2), oy); } else ctx.drawImage(owner.cv, ox - Math.round(surf.W / 2), oy);
    ctx.restore();
  }

  /* =====================================================================================================================================
     SURVIVOR
     ===================================================================================================================================== */
  const SK = { skin: [168, 122, 98], jacket: [58, 62, 58], pants: [38, 41, 44], boot: [24, 24, 26], pack: [48, 50, 46], hair: [14, 13, 14], strap: [30, 32, 30], metal: [150, 155, 160] };
  const SL = { thigh: 0.47, shin: 0.47, torso: 0.56, upper: 0.30, fore: 0.28 };

  function newSurvivor() { return { cv: null, cx: null, packA: 0, packV: 0, lastLean: 0, lean: 0, headLag: 0, torchA: 0, dropped: null, rngHair: rnd(7) }; }

  /* P: { ph (gait cycles), w (0..1 moving), c (0..1 crouch), t, use (-1 or 0..1), dead (-1 or 0..1), acc (-1..1 forward accel), dt, vent } */
  function pose(S, P) {
    const w = P.w, c = P.c, ph = P.ph, t = P.t, J = {};
    const hip0 = lerp(0.955, 0.60, c), stepL = lerp(0.95, 0.60, c) * w, lift = lerp(0.19, 0.10, c) * w, st = lerp(0.5, 0.6, c);
    const bob = lerp(0.04, 0.016, c) * w, br = Math.sin(t * 1.9) * 0.006 * (1 - w), sway = Math.sin(t * 0.7) * 0.012 * (1 - w);
    const cyc = 2 * PI * ph;
    const hx = sway, hy = hip0 - bob * (0.5 + 0.5 * Math.cos(2 * cyc)) + br;
    J.hip = [hx, hy];
    /* feet */
    const feet = [];
    for (let k = 0; k < 2; k++) {
      const q = frac(ph + 0.5 * k), idleX = k ? -0.1 : 0.1; let gx, gy, pitch;
      if (q < st) { const u = q / st; gx = stepL * (0.5 - u); gy = 0; pitch = lerp(0.35, 0, sstep(0, 0.3, u)) - 0.5 * sstep(0.7, 1, u); }
      else { const s = (q - st) / (1 - st); gx = stepL * (-0.5 + ease(s)); gy = lift * Math.pow(Math.sin(PI * s), 0.85); pitch = lerp(-0.5, 0.35, s) + 0.25 * Math.sin(PI * s); }
      const fx = hx + lerp(idleX, gx, w) + (c > 0.01 ? 0.05 * c : 0), fy = gy;
      const ank = [fx - 0.035, fy + 0.085], leg = ik(hx, hy, ank[0], ank[1], SL.thigh, SL.shin, 1);
      feet.push({ fx, fy, pitch: lerp(0, pitch, w), ank, knee: [leg.mx, leg.my], ex: leg.ex, ey: leg.ey });
    }
    J.feet = feet;
    /* torso, head */
    const accLean = (P.acc || 0) * 0.14;
    let lean = lerp(0.03, 0.5, c) + 0.14 * w + accLean + Math.sin(t * 1.9) * 0.008 * (1 - w);
    if (P.use >= 0) lean += 0.16 * Math.sin(PI * clamp(P.use, 0, 1));
    S.lean += (lean - S.lean) * Math.min(1, P.dt * 14); lean = S.lean;
    const sh = fk(hx, hy, -0, 0); J.lean = lean;
    J.sh = [hx + Math.sin(lean) * SL.torso, hy + Math.cos(lean) * SL.torso + br * 0.5];
    const headA = lean * 0.3 - 0.05 * Math.sin(2 * cyc + 0.8) * w;
    const neck = [J.sh[0] + Math.sin(lean * 0.65) * 0.09, J.sh[1] + Math.cos(lean * 0.65) * 0.09];
    J.neck = neck; J.headA = headA; J.head = [neck[0] + Math.sin(headA) * 0.12, neck[1] + Math.cos(headA) * 0.12];
    /* arms */
    const bobT = -0.03 * Math.abs(Math.cos(cyc)) * w, swayT = Math.sin(cyc) * 0.02 * w;
    let nearT = [J.sh[0] + lerp(0.40, 0.46, w) + swayT, J.sh[1] - lerp(0.33, 0.27, w) + bobT];
    J.armN = ik(J.sh[0], J.sh[1], nearT[0], nearT[1], SL.upper, SL.fore, -1);
    const swing = Math.sin(cyc + PI) * 0.9 * w * lerp(1, 0.55, c), rest = lerp(0.1, 0.3, c);
    let a1 = rest + swing, a2 = a1 + lerp(0.2, 0.55, w) + 0.45 * w * (0.5 + 0.5 * Math.sin(cyc + PI + 1.3));
    if (P.use >= 0) { const u = clamp(P.use, 0, 1), k = Math.sin(PI * Math.min(1, u * 1.15)); a1 = lerp(a1, 1.45, k); a2 = lerp(a2, 1.6, k); }
    const el = fk(J.sh[0] - 0.01, J.sh[1] - 0.02, a1, SL.upper), ha = fk(el[0], el[1], a2, SL.fore); J.armF = { mx: el[0], my: el[1], ex: ha[0], ey: ha[1] };
    /* pack: a spring so it lags the body a little */
    const target = -lean * 0.4 - (P.acc || 0) * 0.12 + Math.sin(2 * cyc) * 0.03 * w; S.packV += (target - S.packA) * 90 * P.dt; S.packV *= Math.exp(-9 * P.dt); S.packA += S.packV * P.dt; J.packA = clamp(S.packA, -0.5, 0.5);
    /* torch */
    J.torch = { x: J.armN.ex, y: J.armN.ey, a: -0.04 + 0.03 * Math.sin(cyc * 2) * w - (P.use >= 0 ? 0.25 * Math.sin(PI * clamp(P.use, 0, 1)) : 0) };
    return J;
  }

  /* caught: a knock-back and fall expressed directly as joint angles; p 0..1 */
  function poseCaught(S, p) {
    const J = {}; const a = ease(clamp(p / 0.55, 0, 1)), b = ease(clamp((p - 0.35) / 0.65, 0, 1));
    const rootX = -0.55 * a - 0.45 * b, hipY = lerp(0.88, 0.2, ease(clamp((p - 0.25) / 0.6, 0, 1))) + 0.08 * Math.sin(PI * clamp(p / 0.5, 0, 1));
    const lean = lerp(0.05, -0.35, a) + lerp(0, -1.2, b);                         // torso rotates back, ends nearly flat
    J.hip = [rootX, hipY]; J.lean = lean; J.sh = [rootX + Math.sin(lean) * SL.torso, hipY + Math.cos(lean) * SL.torso];
    const headA = lean - 0.1 * b; J.headA = headA; J.neck = [J.sh[0] + Math.sin(lean) * 0.09, J.sh[1] + Math.cos(lean) * 0.09]; J.head = [J.neck[0] + Math.sin(headA) * 0.12, J.neck[1] + Math.cos(headA) * 0.12];
    const legs = [];
    for (let k = 0; k < 2; k++) {
      const th = lerp(0.1 + 0.15 * k, 1.1 + 0.3 * k, b) - 0.4 * a * (1 - k), kn = lerp(0.2, 1.6 - 0.3 * k, b), kx = rootX + Math.sin(th) * SL.thigh, ky = hipY - Math.cos(th) * SL.thigh;
      const ex = kx + Math.sin(th - kn) * SL.shin, ey = Math.max(0.09, ky - Math.cos(th - kn) * SL.shin);
      legs.push({ fx: ex, fy: ey - 0.085, pitch: 0.6 * b, ank: [ex, ey], knee: [kx, ky], ex, ey });
    }
    J.feet = legs;
    const up = lerp(2.5, 1.2, b), el = fk(J.sh[0], J.sh[1], up, SL.upper), ha = fk(el[0], el[1], up + 0.5 + 0.4 * Math.sin(p * 6), SL.fore); J.armF = { mx: el[0], my: el[1], ex: ha[0], ey: ha[1] };
    const el2 = fk(J.sh[0], J.sh[1], lerp(2.9, 1.9, b), SL.upper), ha2 = fk(el2[0], el2[1], lerp(2.9, 1.7, b) - 0.6, SL.fore); J.armN = { mx: el2[0], my: el2[1], ex: ha2[0], ey: ha2[1] };
    J.packA = -0.2; J.torch = null;
    /* the torch leaves the hand, tumbles and lands */
    const tp = clamp((p - 0.12) / 0.5, 0, 1), tx = lerp(0.45, -0.1, tp) - 0.35 * tp, tyy = 1.05 + 0.5 * Math.sin(PI * Math.min(1, tp * 1.1)) * (1 - tp) - 0.98 * tp * tp; J.fallen = { x: tx, y: Math.max(0.05, tyy), a: lerp(0, -2.6, tp), landed: tp >= 1 };
    return J;
  }

  /* crawl through a vent: prone, elbows and knees alternating; ph in cycles */
  function poseCrawl(S, ph, t) {
    const J = {}, cyc = TAU * ph, hipY = 0.2 + 0.015 * Math.sin(cyc * 2); J.hip = [-0.42, hipY]; const lean = 1.32; J.lean = lean;
    J.sh = [J.hip[0] + Math.sin(lean) * SL.torso, J.hip[1] + Math.cos(lean) * SL.torso + 0.03]; J.headA = 1.0; J.neck = [J.sh[0] + 0.09, J.sh[1] + 0.03]; J.head = [J.neck[0] + 0.1, J.neck[1] + 0.07];
    const feet = [];
    for (let k = 0; k < 2; k++) { const q = Math.sin(cyc + PI * k); const kx = J.hip[0] + 0.26 + 0.12 * q, ky = 0.11 + 0.05 * Math.max(0, q); const ex = kx - 0.38, ey = 0.1 + 0.03 * Math.max(0, -q); feet.push({ fx: ex, fy: 0, pitch: -0.6, ank: [ex, ey], knee: [kx, ky], ex, ey }); }
    J.feet = feet;
    const reach = Math.sin(cyc), sx = J.sh[0], sy = J.sh[1]; J.armN = { mx: sx + 0.12 + 0.05 * reach, my: 0.13, ex: sx + 0.38 + 0.18 * reach, ey: 0.04 + 0.05 * Math.max(0, reach) }; J.armF = { mx: sx + 0.1 - 0.05 * reach, my: 0.14, ex: sx + 0.3 - 0.16 * reach, ey: 0.04 + 0.05 * Math.max(0, -reach) };
    J.packA = 0.0; J.torch = { x: J.armN.ex, y: J.armN.ey + 0.02, a: 0.0 }; return J;
  }

  function paintSurvivor(c, J, S, o) {
    const k = o.light === undefined ? 1 : o.light, hip = J.hip, sh = J.sh, lean = J.lean, ar = J.feet;
    const leg = function (f, far) {
      const kk = far ? 0.6 : 1; const hc = [hip[0], hip[1]];
      limb(c, hc[0], hc[1], f.knee[0], f.knee[1], 0.100, 0.072, SK.pants, kk * k);
      limb(c, f.knee[0], f.knee[1], f.ank[0], f.ank[1], 0.070, 0.056, SK.pants, kk * k);
      /* boot */
      const fa = f.pitch, cx = f.ank[0], cy = f.ank[1], cs = Math.cos(fa), sn = Math.sin(fa);
      const P = function (x, y) { return [cx + x * cs - y * sn, cy + x * sn + y * cs]; };
      const pts = [P(-0.075, 0.04), P(0.07, 0.035), P(0.2, -0.035), P(0.215, -0.085), P(-0.09, -0.085), P(-0.085, 0.0)];
      const g = c.createLinearGradient(cx, cy + 0.06, cx, cy - 0.1); g.addColorStop(0, shade(SK.boot, 1.7 * kk * k)); g.addColorStop(1, shade(SK.boot, 0.5 * kk * k));
      c.fillStyle = g; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill();
      c.fillStyle = shade([10, 10, 11], kk); const s1 = P(-0.09, -0.07), s2 = P(0.215, -0.085), s3 = P(0.2, -0.04), s4 = P(-0.09, -0.04); c.beginPath(); c.moveTo(s1[0], s1[1]); c.lineTo(s2[0], s2[1]); c.lineTo(s3[0], s3[1]); c.lineTo(s4[0], s4[1]); c.closePath(); c.fill();   // sole
      c.strokeStyle = shade([90, 92, 90], kk * k); c.lineWidth = 0.012; const b1 = P(-0.02, 0.07), b2 = P(0.06, 0.0); c.beginPath(); c.moveTo(b1[0], b1[1]); c.lineTo(b2[0], b2[1]); c.stroke();
    };
    const arm = function (a, far, torch) {
      const kk = far ? 0.62 : 1;
      limb(c, sh[0], sh[1] - 0.02, a.mx, a.my, 0.058, 0.048, SK.jacket, kk * k); limb(c, a.mx, a.my, a.ex, a.ey, 0.048, 0.038, SK.jacket, kk * k);
      c.fillStyle = shade(SK.strap, kk); const dx = a.ex - a.mx, dy = a.ey - a.my, l = Math.hypot(dx, dy) || 1; c.beginPath(); c.arc(a.ex - dx / l * 0.03, a.ey - dy / l * 0.03, 0.044, 0, TAU); c.fill();    // cuff
      blob(c, a.ex + dx / l * 0.03, a.ey + dy / l * 0.03, 0.04, 0.045, 0, SK.skin, 0.8 * kk * k);
    };
    /* far side first */
    arm(J.armF, true); leg(ar[1], true);
    /* pack */
    c.save(); c.translate(sh[0] - Math.sin(lean) * 0.0, sh[1] - 0.04); c.rotate(-lean + J.packA);
    const pg = c.createLinearGradient(-0.3, 0, 0, 0); pg.addColorStop(0, shade(SK.pack, 0.5 * k)); pg.addColorStop(1, shade(SK.pack, 1.2 * k));
    c.fillStyle = pg; c.beginPath(); c.moveTo(-0.05, 0.02); c.quadraticCurveTo(-0.34, 0.08, -0.31, -0.2); c.quadraticCurveTo(-0.3, -0.5, -0.06, -0.5); c.lineTo(-0.02, -0.1); c.closePath(); c.fill();
    c.fillStyle = shade(SK.pack, 0.7 * k); c.beginPath(); c.roundRect ? c.roundRect(-0.3, -0.34, 0.15, 0.17, 0.02) : c.rect(-0.3, -0.34, 0.15, 0.17); c.fill();
    c.strokeStyle = shade(SK.strap, 1.6 * k); c.lineWidth = 0.014; c.beginPath(); c.moveTo(-0.3, -0.16); c.lineTo(-0.06, -0.18); c.moveTo(-0.28, -0.4); c.lineTo(-0.07, -0.42); c.stroke();
    c.restore();
    /* torso: jacket from hip to shoulder, with a hood at the back of the neck and a belt */
    const nx = Math.cos(lean), ny = -Math.sin(lean);            // perpendicular, points to the front of the body
    const wH = 0.12, wS = 0.15, tg = c.createLinearGradient(hip[0] - nx * 0.15, hip[1] - ny * 0.15, hip[0] + nx * 0.15, hip[1] + ny * 0.15); tg.addColorStop(0, shade(SK.jacket, 0.5 * k)); tg.addColorStop(0.55, shade(SK.jacket, 1.1 * k)); tg.addColorStop(1, shade(SK.jacket, 1.5 * k));
    c.fillStyle = tg; c.beginPath(); c.moveTo(hip[0] - nx * wH, hip[1] - ny * wH - 0.05); c.lineTo(hip[0] + nx * (wH + 0.01), hip[1] + ny * (wH + 0.01) - 0.03); c.quadraticCurveTo(sh[0] + nx * 0.2, sh[1] + ny * 0.2 - 0.08, sh[0] + nx * wS, sh[1] + ny * wS + 0.02); c.lineTo(sh[0] - nx * wS, sh[1] - ny * wS + 0.02); c.closePath(); c.fill();
    c.fillStyle = shade([22, 24, 22], k); const b0 = [hip[0] + Math.sin(lean) * 0.13, hip[1] + Math.cos(lean) * 0.13]; c.save(); c.translate(b0[0], b0[1]); c.rotate(-lean); c.fillRect(-wH - 0.01, -0.03, 2 * wH + 0.03, 0.06); c.fillStyle = shade(SK.metal, 0.6 * k); c.fillRect(0.0, -0.025, 0.05, 0.05); c.restore();
    c.strokeStyle = shade(SK.strap, 1.4 * k); c.lineWidth = 0.02; c.beginPath(); c.moveTo(sh[0] + nx * 0.02, sh[1] + ny * 0.02 + 0.01); c.lineTo(hip[0] + Math.sin(lean) * 0.2 - nx * 0.05, hip[1] + Math.cos(lean) * 0.2 - ny * 0.05); c.stroke();     // shoulder strap
    c.fillStyle = shade(SK.jacket, 0.7 * k); c.beginPath(); c.ellipse(J.neck[0] - 0.07 - Math.sin(lean) * 0.01, J.neck[1] - 0.02, 0.11, 0.09, -lean, 0, TAU); c.fill();      // hood
    /* head */
    c.save(); c.translate(J.head[0], J.head[1]); c.rotate(-J.headA);
    const hg = c.createRadialGradient(0.03, 0.03, 0, 0, 0, 0.14); hg.addColorStop(0, shade(SK.skin, 1.35 * k)); hg.addColorStop(1, shade(SK.skin, 0.55 * k)); c.fillStyle = hg;
    c.beginPath(); c.ellipse(0.015, 0, 0.098, 0.115, 0, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(0.1, 0.0); c.lineTo(0.14, -0.04); c.lineTo(0.095, -0.05); c.closePath(); c.fill();                                     // nose
    c.fillStyle = shade([40, 32, 30], k); c.beginPath(); c.moveTo(-0.07, -0.02); c.quadraticCurveTo(0.0, -0.17, 0.09, -0.07); c.lineTo(0.1, -0.03); c.quadraticCurveTo(0.03, -0.075, -0.07, -0.02); c.closePath(); c.fill();      // beard
    c.fillStyle = '#0b0a0a'; c.beginPath(); c.arc(0.065, 0.025, 0.012, 0, TAU); c.fill(); c.fillStyle = shade(SK.skin, 0.4 * k); c.fillRect(0.045, 0.045, 0.06, 0.012);     // eye + brow
    c.fillStyle = shade(SK.skin, 0.8 * k); c.beginPath(); c.ellipse(-0.03, -0.015, 0.025, 0.035, 0, 0, TAU); c.fill();                           // ear
    c.fillStyle = shade(SK.hair, 1 * k); const R = S.rngHair; R(); const h2 = rnd(11); for (let i = 0; i < 24; i++) { const a = PI * 0.15 + h2() * PI * 1.1, rr = 0.075 + h2() * 0.05; c.beginPath(); c.arc(-0.01 + Math.cos(a) * rr, 0.02 + Math.sin(a) * rr, 0.03 + h2() * 0.02, 0, TAU); c.fill(); }
    c.restore();
    /* near side */
    leg(ar[0], false);
    c.fillStyle = shade(SK.pants, 0.7 * k); { const t0 = [(hip[0] + ar[0].knee[0]) / 2, (hip[1] + ar[0].knee[1]) / 2]; c.save(); c.translate(t0[0], t0[1]); c.rotate(Math.atan2(ar[0].knee[1] - hip[1], ar[0].knee[0] - hip[0]) + PI / 2); c.fillRect(0.06, -0.07, 0.04, 0.13); c.restore(); }   // cargo pocket
    arm(J.armN, false);
    /* torch */
    const T = J.torch; if (T) {
      c.save(); c.translate(T.x, T.y); c.rotate(T.a); const tg2 = c.createLinearGradient(0, 0.04, 0, -0.04); tg2.addColorStop(0, shade([60, 62, 66], k)); tg2.addColorStop(1, shade([10, 10, 12], k)); c.fillStyle = tg2;
      c.fillRect(-0.02, -0.032, 0.17, 0.064); c.beginPath(); c.moveTo(0.15, -0.032); c.lineTo(0.215, -0.058); c.lineTo(0.215, 0.058); c.lineTo(0.15, 0.032); c.closePath(); c.fill(); c.fillStyle = '#e8f4ff'; c.beginPath(); c.ellipse(0.216, 0, 0.012, 0.05, 0, 0, TAU); c.fill(); c.restore();
    }
    if (J.fallen) { const F = J.fallen; c.save(); c.translate(F.x, F.y); c.rotate(F.a); c.fillStyle = shade([14, 14, 16], k); c.fillRect(-0.09, -0.032, 0.17, 0.064); c.beginPath(); c.moveTo(0.07, -0.032); c.lineTo(0.13, -0.058); c.lineTo(0.13, 0.058); c.lineTo(0.07, 0.032); c.closePath(); c.fill(); c.fillStyle = '#cfe6f5'; c.beginPath(); c.ellipse(0.131, 0, 0.011, 0.05, 0, 0, TAU); c.fill(); c.restore(); }
  }
  function survivorAnchors(J) { const T = J.torch || J.fallen; if (!T) return { x: J.hip[0] + 0.3, y: 1.0, a: 0 }; const l = J.torch ? 0.22 : 0.14; return { x: T.x + Math.cos(T.a) * l, y: T.y + Math.sin(T.a) * l, a: T.a }; }

  /* draws the survivor; returns the torch lens position in metres relative to the feet (x forward) for the flashlight */
  function drawSurvivor(S, ctx, px, fy, dir, PM, P, alpha, mul) {
    mul = mul || 1; const surf = surface(S, 3.4, 2.6, PM / 1); const c = surf.c;
    let J; if (P.vent) J = poseCrawl(S, P.ph, P.t); else if (P.dead >= 0) J = poseCaught(S, P.dead); else J = pose(S, P);
    paintSurvivor(c, J, S, { light: 1 });
    finish(S, surf, ctx, px, fy, dir, alpha, PM, 0.35);
    const a = survivorAnchors(J); return { lens: [a.x, a.y], ang: a.a, head: J.head, J };
  }

  /* =====================================================================================================================================
     CREATURE (stalker / sentinel / listener share the rig; scale and tint differ)
     ===================================================================================================================================== */
  const MC = { hide: [30, 24, 28], flesh: [78, 54, 58], spike: [22, 16, 20], glow: '#ff2a2a' };
  const ML = { thigh: 0.62, shin: 0.6, upper: 0.5, fore: 0.55 };
  function newCreature(seed) { return { cv: null, cx: null, seed: seed || 1, lastLean: 0, lean: 0.5, head: 0, jaw: 0, mane: 0 }; }

  /* P: { ph, w (moving), run (0 prowl .. 1 hunt), t, mode: 'idle'|'inv'|'search'|'stare'|'roar'|'attack', k (0..1 mode progress for stare/attack), dt, acc } */
  function cpose(M, P) {
    const w = P.w, run = P.run, ph = P.ph, t = P.t, cyc = TAU * ph, J = {};
    const hip0 = lerp(1.06, 0.92, run) , stepL = lerp(1.0, 1.7, run) * w, lift = lerp(0.28, 0.38, run) * w, st = lerp(0.58, 0.42, run);
    const bob = lerp(0.04, 0.09, run) * w, br = Math.sin(t * 1.5) * 0.012 * (1 - w);
    let lean = lerp(0.62, 1.0, run * w) * 1.0 - 0.1 * (1 - w) + (P.acc || 0) * 0.1;                  // how far the torso is pitched forward
    let headDown = 0.0, jaw = 0.05 + 0.03 * Math.sin(t * 1.5), roll = 0;
    const m = P.mode;
    if (m === 'inv') { headDown = 0.45; lean -= 0.1; jaw = 0.0; }
    else if (m === 'search') { headDown = 0.2 + 0.1 * Math.sin(t * 1.3); roll = Math.sin(t * 1.1) * 0.5; jaw = 0.1; }
    else if (m === 'stare') { lean = lerp(lean, 0.35, P.k); headDown = -0.1 * P.k; jaw = 0.1 + 0.4 * P.k; }
    else if (m === 'roar') { const k = ease(P.k); lean = lerp(lean, 0.05, k); headDown = -0.9 * k; jaw = 0.1 + 0.95 * k; roll = 0.04 * Math.sin(t * 40) * k; }
    else if (m === 'attack') { const k = P.k; const wind = sstep(0, 0.3, k), strike = sstep(0.3, 0.65, k); lean = lerp(lean, 0.35, wind) + 0.9 * strike; jaw = 0.1 + 0.9 * strike; headDown = 0.2 * strike; }
    const hx = (m === 'attack' ? 0.3 * sstep(0.25, 0.7, P.k) : 0), hy = hip0 - bob * (0.5 + 0.5 * Math.cos(2 * cyc)) + br;
    J.hip = [hx, hy]; M.lean += (lean - M.lean) * Math.min(1, P.dt * 12); lean = M.lean; J.lean = lean;
    const torsoL = 0.82; J.sh = [hx + Math.sin(lean) * torsoL, hy + Math.cos(lean) * torsoL + 0.02 * Math.sin(2 * cyc) * w];
    const headA = lean * 0.75 + headDown - 0.2; J.neck = [J.sh[0] + Math.sin(lean * 0.9) * 0.2, J.sh[1] + Math.cos(lean * 0.9) * 0.2 - 0.04];
    J.headA = headA; J.head = [J.neck[0] + Math.sin(headA) * 0.26, J.neck[1] + Math.cos(headA) * 0.26]; J.jaw = clamp(jaw, 0, 1.2); J.roll = roll;
    /* legs: digitigrade, the knee points forward, the foot is a long lever */
    const feet = [];
    for (let k = 0; k < 2; k++) {
      const q = frac(ph + 0.5 * k), idleX = k ? -0.18 : 0.12; let gx, gy, pitch;
      if (q < st) { const u = q / st; gx = stepL * (0.5 - u); gy = 0; pitch = lerp(0.2, 0, sstep(0, 0.4, u)) - 0.7 * sstep(0.75, 1, u); }
      else { const s = (q - st) / (1 - st); gx = stepL * (-0.5 + ease(s)); gy = lift * Math.pow(Math.sin(PI * s), 0.8); pitch = lerp(-0.7, 0.3, s); }
      const fx = hx + lerp(idleX, gx, w), fy = gy * 1.0, ank = [fx - 0.1, fy + 0.3], leg = ik(hx - 0.05, hy, ank[0], ank[1], ML.thigh, ML.shin, 1);
      feet.push({ fx, fy, pitch: lerp(0.05, pitch, w), ank, knee: [leg.mx, leg.my] });
    }
    J.feet = feet;
    /* arms: long, swinging opposite the legs, hands near the ground when prowling */
    const armL = function (k) {
      const phase = cyc + PI * (k ? 0 : 1), sw = Math.sin(phase) * lerp(0.55, 0.95, run) * w;
      let a1 = lerp(0.35, 0.9, w * 0.5) + sw * 0.7 - 0.2 * (lean > 0.7 ? 1 : 0), a2 = a1 + lerp(0.15, 0.6, w) + 0.3 * Math.sin(phase + 1);
      if (m === 'roar') { const kk = ease(P.k); a1 = lerp(a1, -0.5 - 0.6 * k, kk); a2 = lerp(a2, -0.2 - 0.6 * k, kk); }
      if (m === 'attack') { const wind = sstep(0, 0.3, P.k), strike = sstep(0.3, 0.65, P.k), rec = sstep(0.75, 1, P.k); if (k === 0) { a1 = lerp(a1, -1.5, wind) + (2.9) * strike - 0.8 * rec; a2 = lerp(a2, -1.0, wind) + 2.4 * strike - 0.6 * rec; } else { a1 = lerp(a1, 0.2, wind) + 1.4 * strike; a2 = a1 + 0.3; } }
      const s0 = [J.sh[0] - 0.02, J.sh[1] - 0.06], el = fk(s0[0], s0[1], a1, ML.upper), ha = fk(el[0], el[1], a2, ML.fore); return { mx: el[0], my: el[1], ex: ha[0], ey: Math.max(0.03, ha[1]), a: a2 };
    };
    J.armN = armL(0); J.armF = armL(1);
    return J;
  }

  function paintCreature(c, J, M, o) {
    const hip = J.hip, sh = J.sh, lean = J.lean, k = o.light === undefined ? 1 : o.light, t = o.t || 0, R = rnd(M.seed * 7 + 1), hurt = o.glow === undefined ? 1 : o.glow;
    const veins = function (pts, a) { c.strokeStyle = 'rgba(255,48,52,' + (0.55 * a * hurt) + ')'; c.lineWidth = 0.016; c.lineCap = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); };
    const claws = function (x, y, ang, n, len, a) { c.fillStyle = shade([120, 22, 28], 1); c.strokeStyle = 'rgba(255,60,60,0.5)'; c.lineWidth = 0.006; for (let i = 0; i < n; i++) { const aa = ang + (i - (n - 1) / 2) * 0.28, ox = x + Math.cos(aa) * 0.04, oy = y + Math.sin(aa) * 0.04; c.beginPath(); c.moveTo(ox - Math.sin(aa) * 0.025, oy + Math.cos(aa) * 0.025); c.quadraticCurveTo(ox + Math.cos(aa) * len * 0.6, oy + Math.sin(aa) * len * 0.6 - 0.02, ox + Math.cos(aa) * len, oy + Math.sin(aa) * len - 0.04); c.quadraticCurveTo(ox + Math.cos(aa) * len * 0.5, oy + Math.sin(aa) * len * 0.5 + 0.03, ox + Math.sin(aa) * 0.025, oy - Math.cos(aa) * 0.025); c.closePath(); c.fill(); c.stroke(); } };
    const leg = function (f, far) {
      const kk = (far ? 0.6 : 1) * k, ankle = f.ank;
      limb(c, hip[0] - 0.05, hip[1], f.knee[0], f.knee[1], 0.2, 0.12, MC.hide, kk); limb(c, f.knee[0], f.knee[1], ankle[0], ankle[1], 0.12, 0.075, MC.hide, kk);
      if (!far) veins([[hip[0] - 0.02, hip[1] - 0.05], [f.knee[0] + 0.02, f.knee[1] + 0.05], [ankle[0], ankle[1] + 0.05]], 1);
      /* foot: heel behind the ankle, long toes in front */
      const cx = ankle[0], cy = ankle[1], fa = f.pitch, cs = Math.cos(fa), sn = Math.sin(fa), P = function (x, y) { return [cx + x * cs - y * sn, cy + x * sn + y * cs]; };
      const pts = [P(-0.1, 0.0), P(0.0, 0.06), P(0.3, -0.12), P(0.42, -0.26), P(0.3, -0.3), P(-0.02, -0.3), P(-0.12, -0.15)];
      limbPoly(c, pts, MC.hide, kk); claws(P(0.4, -0.26)[0], P(0.4, -0.26)[1], fa - 0.35, 3, 0.15, 1);
    };
    const arm = function (a, far) {
      const kk = (far ? 0.6 : 1) * k;
      limb(c, sh[0] - 0.02, sh[1] - 0.06, a.mx, a.my, 0.17, 0.11, MC.hide, kk); limb(c, a.mx, a.my, a.ex, a.ey, 0.11, 0.075, MC.hide, kk);
      if (!far) veins([[sh[0], sh[1] - 0.12], [a.mx, a.my], [a.ex, a.ey]], 1);
      blob(c, a.ex, a.ey, 0.1, 0.085, a.a, MC.hide, kk); claws(a.ex + 0.06, a.ey, a.a - 1.35, 4, 0.22, 1);
    };
    arm(J.armF, true); leg(J.feet[1], true);
    /* mane: spikes along the spine with a slow travelling wave */
    for (let i = 0; i < 16; i++) {
      const u = i / 15, sx = lerp(hip[0] + 0.0, J.neck[0], u), sy = lerp(hip[1] + 0.22, J.neck[1] + 0.05, u), spine = lean + (u - 0.5) * 0.4, wob = Math.sin(t * 3.2 + i * 0.7) * 0.07 + (J.roll || 0) * 0.1;
      const L = (0.28 + 0.22 * Math.sin(u * PI) + R() * 0.12) * (0.9 + 0.1 * Math.sin(t * 2 + i)), ang = -PI / 2 - spine * 0.9 - 0.55 - 0.5 * (1 - u) + wob, bx = sx - Math.sin(spine) * 0.06, by = sy + Math.cos(spine) * 0.06;
      c.fillStyle = shade(MC.spike, 0.8 * k); c.beginPath(); c.moveTo(bx - 0.045, by - 0.02); c.lineTo(bx + Math.cos(ang) * L, by - Math.sin(ang) * L * -1); c.lineTo(bx + 0.045, by + 0.04); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,50,56,' + (0.4 * hurt) + ')'; c.lineWidth = 0.008; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(ang) * L, by - Math.sin(ang) * L * -1); c.stroke();
    }
    /* torso */
    const nx = Math.cos(lean), ny = -Math.sin(lean), tg = c.createLinearGradient(hip[0] - nx * 0.3, hip[1] - ny * 0.3, hip[0] + nx * 0.34, hip[1] + ny * 0.34); tg.addColorStop(0, shade(MC.hide, 0.4 * k)); tg.addColorStop(0.6, shade(MC.flesh, 1.0 * k)); tg.addColorStop(1, shade(MC.flesh, 1.55 * k));
    c.fillStyle = tg; c.beginPath(); c.moveTo(hip[0] - nx * 0.2, hip[1] - ny * 0.2 - 0.08); c.quadraticCurveTo(hip[0] + nx * 0.34, hip[1] + ny * 0.34 - 0.04, sh[0] + nx * 0.34, sh[1] + ny * 0.34 - 0.03);
    c.quadraticCurveTo(sh[0] + nx * 0.1 + Math.sin(lean) * 0.2, sh[1] + 0.3, sh[0] - nx * 0.3, sh[1] - ny * 0.3 + 0.04); c.quadraticCurveTo(hip[0] - nx * 0.34, hip[1] - ny * 0.34, hip[0] - nx * 0.2, hip[1] - ny * 0.2 - 0.08); c.fill();
    blob(c, sh[0] + nx * 0.06 + Math.sin(lean) * 0.05, sh[1] - 0.08, 0.26, 0.2, -lean, MC.flesh, 1.15 * k);                      // shoulder mass
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.012; for (let i = 1; i < 5; i++) { const u = i / 5; c.beginPath(); c.moveTo(lerp(hip[0], sh[0], u) - nx * 0.05, lerp(hip[1], sh[1], u) - ny * 0.05); c.lineTo(lerp(hip[0], sh[0], u) + nx * 0.3, lerp(hip[1], sh[1], u) + ny * 0.3); c.stroke(); }
    veins([[hip[0] + nx * 0.1, hip[1] + ny * 0.1 + 0.05], [lerp(hip[0], sh[0], 0.5) + nx * 0.18, lerp(hip[1], sh[1], 0.5) + ny * 0.18], [sh[0] + nx * 0.1, sh[1] + ny * 0.1 - 0.05], [J.neck[0] + 0.05, J.neck[1] - 0.02]], 1);
    /* head: skull, snout, open jaw with teeth, ears, glowing eye */
    c.save(); c.translate(J.head[0], J.head[1]); c.rotate(-J.headA + 0.0);
    const jaw = J.jaw, hg = c.createRadialGradient(0.06, 0.05, 0, 0.05, 0, 0.32); hg.addColorStop(0, shade(MC.flesh, 1.5 * k)); hg.addColorStop(1, shade(MC.hide, 0.7 * k));
    c.fillStyle = shade(MC.hide, 0.8 * k); c.save(); c.translate(0.0, -0.02); c.rotate(jaw * 0.5); c.beginPath(); c.moveTo(-0.08, -0.04); c.lineTo(0.3, -0.03); c.lineTo(0.34, -0.09); c.lineTo(0.1, -0.15); c.lineTo(-0.06, -0.12); c.closePath(); c.fill();     // lower jaw
    c.fillStyle = '#d8c9b4'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0.07 + i * 0.05, -0.03); c.lineTo(0.09 + i * 0.05, 0.03 + 0.02 * jaw); c.lineTo(0.11 + i * 0.05, -0.03); c.fill(); } c.restore();
    c.fillStyle = hg; c.beginPath(); c.moveTo(-0.12, -0.02); c.quadraticCurveTo(-0.05, 0.2, 0.15, 0.17); c.lineTo(0.35, 0.05); c.quadraticCurveTo(0.38, -0.01, 0.33, -0.03); c.lineTo(0.0, -0.02); c.closePath(); c.fill();       // skull + snout
    c.fillStyle = shade(MC.spike, k); c.beginPath(); c.moveTo(-0.06, 0.13); c.lineTo(-0.1, 0.34); c.lineTo(0.03, 0.17); c.closePath(); c.fill();                          // ear
    c.fillStyle = '#d8c9b4'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0.12 + i * 0.045, -0.015); c.lineTo(0.135 + i * 0.045, -0.07 - 0.03 * jaw); c.lineTo(0.15 + i * 0.045, -0.015); c.fill(); }   // upper teeth
    c.fillStyle = '#ff2630'; c.shadowColor = '#ff2a2a'; c.shadowBlur = 0; c.beginPath(); c.ellipse(0.2, 0.105, 0.045, 0.026, -0.3, 0, TAU); c.fill(); c.fillStyle = '#fff4f0'; c.beginPath(); c.arc(0.212, 0.108, 0.011, 0, TAU); c.fill();
    c.restore();
    leg(J.feet[0], false); arm(J.armN, false);
  }
  function limbPoly(c, pts, col, k) { const g = c.createLinearGradient(pts[0][0], pts[2][1] + 0.15, pts[0][0], pts[0][1] - 0.1); g.addColorStop(0, shade(col, 0.45 * k)); g.addColorStop(1, shade(col, 1.4 * k)); c.fillStyle = g; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill(); }

  function drawCreature(M, ctx, px, fy, dir, PM, P, alpha, mul, tint) {
    const surf = surface(M, 5.2, 3.6, PM); const c = surf.c; const J = cpose(M, P);
    paintCreature(c, J, M, { light: 1, t: P.t });
    if (tint) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.9; c.fillStyle = tint; c.fillRect(0, 0, surf.W, surf.H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    finish(M, surf, ctx, px, fy, dir, alpha, PM, 0.3);
    const eyeA = J.headA; const e = [J.head[0] + Math.cos(eyeA) * 0.2 + Math.sin(eyeA) * 0.105, J.head[1] - Math.sin(eyeA) * 0.2 + Math.cos(eyeA) * 0.105];   // rotated eye position (matches the head transform)
    return { eye: e, head: J.head, J };
  }

  return { newSurvivor, drawSurvivor, newCreature, drawCreature, poseSurvivor: pose, poseCreature: cpose, ik, ease };
})();
