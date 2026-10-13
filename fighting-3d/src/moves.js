/* Fighter specs (data-driven: adding a fighter = adding an entry), poses and move data. */

import { KAI } from './kai.js';
import { EXTRA_ROSTER } from './roster3d.js';
export const ROSTER = {
  kai: KAI,
  draven: {
    id: 'draven', name: 'DRAVEN', title: 'CRIMSON REAPER', style: 'Kickboxing',
    skin: '#e3bf9f', eye: '#6a7480', height: 1.04, bulk: .98, shoulders: 1.05, arms: .95, legs: 1.0,
    hair: { style: 'long', color: '#c9ccd4' }, beard: { type: 'goatee', color: '#8d9099' }, face: { real: true, jaw: .5, width: .86, scar: false },
    top: { type: 'coat', color: '#14121a', fabric: 'leather', coatLen: .78, collar: true },
    pants: { type: 'long', color: '#1b1a22' }, belt: '#2a1014', gloves: { color: '#101014' }, shoes: { type: 'boot', color: '#0e0e12' },
    aura: '#7a3dff', color: '#9b5cff',
    stats: { speed: .95, power: 1.15, reach: 1.1, hp: 100, defense: 1.0, quick: .92 },
    specials: { df_hp: 'shadowFlurry', df_hk: 'reaperSpin' },
    ai: { aggr: .9, block: 1.15, combo: 1.1 }
  }
};
for (const s of EXTRA_ROSTER) ROSTER[s.id] = s;

/* ---------- pose model ---------- */
const NUM = ['pitch', 'twist', 'roll', 'hipTwist', 'hipRoll', 'headPitch', 'headYaw', 'fLp', 'fRp', 'fLy', 'fRy', 'lay', 'eye', 'brow'];
const VEC = ['hip', 'hL', 'hR', 'fL', 'fR'];
export function guard() {
  return { hip: [0, .93, .02], pitch: 7, twist: -32, roll: 0, hipTwist: -16, hipRoll: 0, headPitch: 6, headYaw: 30,
    hL: [.46, 1.38, -.2], hR: [.31, 1.34, .1], fL: [.27, 0, -.16], fR: [-.2, 0, .2], fLp: 0, fRp: 0, fLy: 16, fRy: -22, lay: 0, eye: 1, brow: .3 };
}
export function mod(base, o) { const p = clone(base); for (const k in o) p[k] = Array.isArray(o[k]) ? o[k].slice() : o[k]; return p; }
export function clone(p) { const q = {}; for (const k of VEC) q[k] = p[k].slice(); for (const k of NUM) q[k] = p[k]; return q; }
export function lerpPose(a, b, t, out) {
  for (const k of VEC) { const x = a[k], y = b[k], o = out[k]; o[0] = x[0] + (y[0] - x[0]) * t; o[1] = x[1] + (y[1] - x[1]) * t; o[2] = x[2] + (y[2] - x[2]) * t; }
  for (const k of NUM) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}
const G = guard();
export const POSE = {
  guard: G,
  crouch: mod(G, { hip: [.0, .6, .02], pitch: 14, fL: [.34, 0, -.2], fR: [-.28, 0, .24], hL: [.44, 1.12, -.2], hR: [.3, 1.08, .1], headPitch: 10 }),
  block: mod(G, { hL: [.4, 1.52, -.15], hR: [.38, 1.46, .1], pitch: 15, headPitch: 14, twist: -26, hip: [-.03, .91, .02], eye: 1, brow: .5 }),
  crouchBlock: mod(G, { hip: [-.02, .6, .02], pitch: 22, hL: [.4, 1.2, -.15], hR: [.36, 1.12, .1], fL: [.34, 0, -.2], fR: [-.28, 0, .24], headPitch: 16 }),
  hitHigh: mod(G, { hip: [-.1, .9, .02], pitch: -16, headPitch: -20, twist: -8, hL: [.08, 1.15, -.4], hR: [-.1, 1.25, .38], eye: 0, fL: [.2, 0, -.2], fR: [-.3, 0, .22] }),
  hitMid: mod(G, { hip: [-.08, .86, .02], pitch: 26, headPitch: 14, twist: -12, hL: [.2, 1.0, -.3], hR: [.12, 1.02, .28], eye: 0, fL: [.14, 0, -.2], fR: [-.3, 0, .22] }),
  hitLow: mod(G, { hip: [-.04, .9, .02], pitch: 10, roll: 14, headPitch: 8, hL: [.3, 1.2, -.3], hR: [.0, 1.3, .35], eye: 0, fL: [.3, .18, -.2], fR: [-.3, 0, .22] }),
  air: mod(G, { hip: [0, .82, .02], pitch: 6, fL: [.12, .38, -.2], fR: [-.1, .24, .2], hL: [.4, 1.35, -.2], hR: [.3, 1.3, .1] }),
  down: mod(G, { lay: 1, hip: [0, .95, 0], pitch: -4, twist: 0, hipTwist: 0, headPitch: 0, headYaw: 0, hL: [.1, .7, -.5], hR: [.1, .7, .5], fL: [.3, 0, -.18], fR: [.25, .05, .2], eye: 0, fLy: 0, fRy: 0 }),
  win: mod(G, { hip: [0, .97, 0], pitch: 0, twist: -10, hipTwist: -4, headPitch: -4, headYaw: 10, hL: [.1, 1.05, -.36], hR: [.18, 2.05, .24], fL: [.12, 0, -.2], fR: [-.14, 0, .2], brow: .1 }),
  relaxed: mod(G, { hip: [0, .985, 0], pitch: 0, twist: 0, hipTwist: 0, headPitch: 0, headYaw: 0, hL: [.03, .86, -.36], hR: [.03, .86, .36], fL: [0, 0, -.13], fR: [0, 0, .13], fLy: 0, fRy: 0, brow: .12 }),
  win2: mod(G, { hip: [0, .97, 0], pitch: -4, twist: 0, hipTwist: 0, headPitch: -8, headYaw: 0, hL: [.34, 1.28, -.3], hR: [.34, 1.28, .3], fL: [.1, 0, -.2], fR: [-.1, 0, .2], brow: .3 }),
  defeat: mod(G, { lay: 1, hip: [0, .95, 0], pitch: -6, twist: 8, hipTwist: 0, headPitch: -10, headYaw: -20, hL: [-.1, .6, -.62], hR: [-.5, .5, .55], fL: [.35, 0, -.28], fR: [.1, .03, .24], eye: 0, fLy: -10, fRy: 10 }),
  airFall: mod(G, { hip: [0, .86, .02], pitch: 4, fL: [.2, .22, -.2], fR: [-.12, .16, .2], hL: [.42, 1.4, -.2], hR: [.3, 1.34, .1] }),
  taunt: mod(G, { hip: [0, .98, 0], pitch: 0, twist: -8, hL: [.3, 1.0, -.4], hR: [.5, 1.9, .2] })
};

/* ---------- moves ----------
   keys: [frame, pose]  hit: {limb, r, dmg, hs, bs, kb, lvl, launch, down, sfx}
   su/ac/rc = startup/active/recovery frames, step = forward lunge (m/s) at startup end */
const P = POSE;
const jabW = mod(G, { hL: [.34, 1.37, -.2], twist: -38 });
const jabS = mod(G, { hL: [.86, 1.47, -.1], pitch: 12, twist: -20, hip: [.08, .93, 0], headPitch: 4 });
const crossW = mod(G, { hR: [.1, 1.3, .2], twist: -50, hipTwist: -32, hip: [-.04, .92, .03] });
const crossS = mod(G, { hR: [.9, 1.46, -.05], twist: 8, hipTwist: 10, pitch: 14, hip: [.16, .92, 0], fRp: -28, fR: [-.16, .03, .2], fL: [.3, 0, -.2], hL: [.3, 1.35, -.2] });
const lkC = mod(G, { fL: [.4, .95, -.12], hip: [-.02, .93, .02], pitch: 4, hL: [.4, 1.42, -.2] });
const lkS = mod(G, { fL: [.88, 1.38, -.06], fLp: 24, pitch: -12, hip: [-.04, .92, .03], hL: [.3, 1.45, -.25], hR: [.2, 1.3, .15] });
const hkC = mod(G, { fR: [.25, 1.3, .4], twist: -50, hipTwist: -34, pitch: 2, fL: [.14, 0, -.16], fLy: -40, hL: [.2, 1.5, -.3], hR: [.0, 1.2, .35] });
const hkS = mod(G, { fR: [.72, 1.72, -.16], fRp: -10, twist: 24, hipTwist: 34, pitch: -24, hip: [-.03, .88, 0], fL: [.1, 0, -.14], fLy: -70, hL: [.2, 1.52, -.32], hR: [-.02, 1.14, .36] });
const swC = mod(P.crouch, { fR: [-.12, .09, .52], hip: [-.02, .52, .02], pitch: 22, hL: [.4, .7, -.3], hR: [.1, .62, .3] });
const swS = mod(P.crouch, { fR: [.8, .09, -.02], hip: [.04, .5, .02], pitch: 18, twist: 4, hipTwist: 14, hL: [.5, .6, -.3], hR: [.1, .5, .3], fL: [.2, 0, -.26] });
const upC = mod(P.crouch, { hR: [.14, .8, .16], hip: [-.02, .66, .02], pitch: 22, twist: -46 });
const upS = mod(G, { hR: [.56, 1.92, .0], hip: [.1, .98, 0], pitch: 4, twist: 4, hipTwist: 10, fRp: -30, fR: [-.14, .06, .2], hL: [.3, 1.2, -.3] });

export const MOVES = {
  jab:   { name: 'Jab', su: 5, ac: 3, rc: 10, step: .6, keys: [[0, G], [2, jabW], [5, jabS], [8, jabS], [18, G]], hit: { limb: 'handL', r: .11, dmg: 5, hs: 15, bs: 8, kb: .16, lvl: 'high', sfx: 'punch' }, chain: { hp: 'cross' } },
  cross: { name: 'Cross', su: 9, ac: 3, rc: 16, step: 1.2, keys: [[0, G], [5, crossW], [9, crossS], [12, crossS], [28, G]], hit: { limb: 'handR', r: .12, dmg: 11, hs: 22, bs: 12, kb: .45, lvl: 'mid', sfx: 'punch2' } },
  lkick: { name: 'Front Kick', su: 8, ac: 3, rc: 15, step: .4, keys: [[0, G], [4, lkC], [8, lkS], [11, lkS], [26, G]], hit: { limb: 'footL', r: .14, dmg: 8, hs: 18, bs: 10, kb: .5, lvl: 'mid', sfx: 'kick' }, chain: { hk: 'hkick' } },
  hkick: { name: 'Roundhouse', su: 13, ac: 4, rc: 22, step: .5, keys: [[0, G], [7, hkC], [13, hkS], [17, hkS], [38, G]], hit: { limb: 'footR', r: .15, dmg: 15, hs: 26, bs: 15, kb: .8, lvl: 'high', sfx: 'kickH' } },
  sweep: { name: 'Low Sweep', su: 11, ac: 4, rc: 20, step: 0, crouch: true, keys: [[0, P.crouch], [5, swC], [11, swS], [15, swS], [32, P.crouch]], hit: { limb: 'footR', r: .13, dmg: 8, hs: 0, bs: 12, kb: .3, lvl: 'low', down: true, sfx: 'kick' } },
  upper: { name: 'Rising Uppercut', su: 9, ac: 4, rc: 24, step: .3, crouch: true, keys: [[0, P.crouch], [5, upC], [9, upS], [13, upS], [33, G]], hit: { limb: 'handR', r: .13, dmg: 13, hs: 0, bs: 14, kb: .3, lvl: 'mid', launch: 5.6, sfx: 'punchH' } },
  jkick: { name: 'Jump Kick', su: 3, ac: 22, rc: 0, air: true, keys: [[0, P.air], [4, mod(P.air, { fR: [.7, .56, .12], fL: [.0, .3, -.2], pitch: -10 })], [24, mod(P.air, { fR: [.7, .56, .12], pitch: -10 })]], hit: { limb: 'footR', r: .14, dmg: 8, hs: 18, bs: 9, kb: .35, lvl: 'high', sfx: 'kick' } },
  /* --- character specials --- */
  dragonPalm: { name: 'Dragon Palm', su: 14, ac: 4, rc: 26, step: 4.2, keys: [[0, G], [8, mod(G, { hL: [.1, 1.0, -.1], hR: [.1, 1.05, .1], pitch: 14, twist: -10, hip: [-.1, .88, 0], fL: [.32, 0, -.2], fR: [-.34, 0, .22] })], [14, mod(G, { hL: [.86, 1.34, -.1], hR: [.86, 1.38, .1], pitch: 20, twist: 0, hipTwist: 0, hip: [.2, .86, 0], fL: [.66, 0, -.18], fR: [-.3, .04, .2], fRp: -25, headPitch: 10 })], [18, mod(G, { hL: [.86, 1.34, -.1], hR: [.86, 1.38, .1], pitch: 20, twist: 0, hipTwist: 0, hip: [.2, .86, 0], fL: [.66, 0, -.18], fR: [-.3, .04, .2] })], [44, G]], hit: { limb: 'both', r: .15, dmg: 16, hs: 28, bs: 14, kb: 1.4, lvl: 'mid', sfx: 'heavy', launch: 0, big: true } },
  risingKick: { name: 'Rising Dragon Kick', su: 12, ac: 4, rc: 28, step: 1.5, keys: [[0, G], [6, mod(P.crouch, { fR: [-.3, .1, .2], hip: [-.05, .62, .02], pitch: 24 })], [12, mod(G, { fR: [.5, 1.7, .05], hip: [.1, 1.0, .0], pitch: -16, fRp: 20, hL: [.1, 1.5, -.4], hR: [.1, 1.8, .3], fL: [.1, .0, -.2] })], [16, mod(G, { fR: [.5, 1.7, .05], hip: [.1, 1.0, .0], pitch: -16, fRp: 20, hL: [.1, 1.5, -.4], hR: [.1, 1.8, .3], fL: [.1, .0, -.2] })], [44, G]], hit: { limb: 'footR', r: .16, dmg: 17, hs: 0, bs: 15, kb: .5, lvl: 'mid', launch: 7, sfx: 'heavy', big: true } },
  shadowFlurry: { name: 'Shadow Flurry', su: 11, ac: 8, rc: 26, step: 2.6, keys: [[0, G], [6, mod(G, { hL: [.1, 1.2, -.2], hR: [.1, 1.2, .2], pitch: 14, twist: -48 })], [11, mod(G, { hL: [.86, 1.5, -.12], pitch: 14, twist: -14, hip: [.12, .92, 0] })], [15, mod(G, { hR: [.9, 1.42, -.02], pitch: 14, twist: 10, hipTwist: 10, hip: [.16, .92, 0] })], [19, mod(G, { hL: [.9, 1.5, -.08], pitch: 16, twist: -12, hip: [.2, .91, 0] })], [45, G]], hit: { limb: 'either', r: .13, dmg: 6, hs: 20, bs: 8, kb: .3, lvl: 'mid', sfx: 'punch2', multi: 3, final: { dmg: 8, launch: 0, kb: 1.0 } } },
  reaperSpin: { name: 'Reaper Spin', su: 18, ac: 4, rc: 28, step: 1.8, keys: [[0, G], [8, mod(G, { twist: -120, hipTwist: -90, pitch: 6, hL: [.1, 1.4, -.3], hR: [-.1, 1.3, .35], hip: [-.04, .9, 0] })], [14, mod(G, { twist: -250, hipTwist: -200, pitch: -4, hip: [-.02, .88, 0], fR: [.3, .98, .2], hL: [.1, 1.4, -.3], hR: [-.1, 1.3, .35] })], [18, mod(G, { twist: -360 - 20, hipTwist: -330, pitch: -16, hip: [-.02, .88, 0], fR: [.72, 1.12, -.05], fRp: -8, fL: [.1, 0, -.14], hL: [.2, 1.5, -.35], hR: [.0, 1.2, .36] })], [22, mod(G, { twist: -380, hipTwist: -330, pitch: -16, hip: [-.02, .88, 0], fR: [.72, 1.12, -.05], fL: [.1, 0, -.14] })], [50, G]], hit: { limb: 'footR', r: .17, dmg: 20, hs: 0, bs: 16, kb: .5, lvl: 'high', launch: 6, sfx: 'heavy', big: true } }
};

/* --- extra specials used by the rest of the roster --- */
const flat = (o) => mod(G, o);
Object.assign(MOVES, {
  lungePunch: { name: 'Lunge Cross', su: 12, ac: 3, rc: 24, step: 3.6, keys: [[0, G], [7, flat({ hR: [.0, 1.25, .25], twist: -58, hipTwist: -36, hip: [-.1, .9, .03], pitch: 8 })], [12, flat({ hR: [.96, 1.42, 0], twist: 12, hipTwist: 14, pitch: 18, hip: [.28, .86, 0], fL: [.62, 0, -.2], fR: [-.3, .04, .2], fRp: -25, hL: [.3, 1.3, -.2] })], [15, flat({ hR: [.96, 1.42, 0], twist: 12, hipTwist: 14, pitch: 18, hip: [.28, .86, 0], fL: [.62, 0, -.2], fR: [-.3, .04, .2] })], [40, G]], hit: { limb: 'handR', r: .13, dmg: 15, hs: 26, bs: 13, kb: 1.0, lvl: 'mid', sfx: 'punchH', big: true } },
  axeKick: { name: 'Axe Kick', su: 16, ac: 5, rc: 28, step: .4, keys: [[0, G], [9, flat({ fR: [.15, 1.72, .08], pitch: -14, hip: [-.05, .9, 0], fL: [.1, 0, -.14], hL: [.2, 1.5, -.3], hR: [-.05, 1.3, .35] })], [16, flat({ fR: [.6, 1.5, -.02], pitch: -4, hip: [.02, .9, 0], fL: [.15, 0, -.14] })], [21, flat({ fR: [.66, .75, -.02], pitch: 8, hip: [.06, .88, 0], fL: [.2, 0, -.14] })], [44, G]], hit: { limb: 'footR', r: .16, dmg: 14, hs: 0, bs: 15, kb: .3, lvl: 'high', down: true, sfx: 'kickH', big: true } },
  flyingKnee: { name: 'Flying Knee', su: 6, ac: 14, rc: 0, air: true, leap: { vy: 4.6, vx: 3.6 }, keys: [[0, G], [5, flat({ hip: [0, .8, 0], fR: [.4, .72, .05], fL: [-.05, .2, -.2], pitch: 14, hL: [.4, 1.3, -.2], hR: [.35, 1.4, .1] })], [10, flat({ hip: [.05, .82, 0], fR: [.52, .82, .02], fL: [-.05, .15, -.2], pitch: 20, hL: [.5, 1.4, -.2], hR: [.4, 1.5, .1] })], [26, flat({ hip: [.05, .82, 0], fR: [.52, .82, .02], fL: [-.05, .1, -.2], pitch: 16 })]], hit: { limb: 'footR', r: .17, dmg: 13, hs: 22, bs: 12, kb: .7, lvl: 'high', launch: 3.5, sfx: 'heavy', big: true } },
  doubleKick: { name: 'Double Kick', su: 8, ac: 14, rc: 22, step: 1.8, keys: [[0, G], [5, lkC], [9, lkS], [13, flat({ fL: [.3, .45, -.12], hip: [0, .93, .02] })], [18, hkS], [22, hkS], [48, G]], hit: { limb: 'eitherFoot', r: .15, dmg: 8, hs: 18, bs: 10, kb: .4, lvl: 'mid', sfx: 'kick', multi: 2, gap: 8, final: { dmg: 10, launch: 0, kb: .9 } } },
  elbowDrive: { name: 'Elbow Drive', su: 7, ac: 3, rc: 20, step: 2.4, keys: [[0, G], [4, flat({ hR: [.1, 1.3, .22], twist: -48, hipTwist: -30, hip: [-.06, .9, 0] })], [7, flat({ hR: [.58, 1.36, 0], twist: 22, hipTwist: 20, pitch: 16, hip: [.16, .9, 0], hL: [.3, 1.35, -.2] })], [10, flat({ hR: [.58, 1.36, 0], twist: 22, hipTwist: 20, pitch: 16, hip: [.16, .9, 0] })], [28, G]], hit: { limb: 'handR', r: .16, dmg: 14, hs: 24, bs: 12, kb: .7, lvl: 'mid', sfx: 'punchH' } },
  hammerFist: { name: 'Hammer Fist', su: 13, ac: 3, rc: 24, step: 1.2, keys: [[0, G], [8, flat({ hL: [.2, 1.98, -.1], hR: [.2, 1.98, .1], pitch: -6, hip: [-.04, .95, 0] })], [13, flat({ hL: [.74, 1.2, -.08], hR: [.74, 1.2, .08], pitch: 22, hip: [.15, .88, 0], twist: 0, hipTwist: 0 })], [16, flat({ hL: [.74, 1.2, -.08], hR: [.74, 1.2, .08], pitch: 22, hip: [.15, .88, 0] })], [40, G]], hit: { limb: 'both', r: .15, dmg: 13, hs: 28, bs: 14, kb: .9, lvl: 'high', sfx: 'punchH', big: true } },
  slideKick: { name: 'Slide Kick', su: 10, ac: 5, rc: 28, step: 4.2, crouch: true, keys: [[0, P.crouch], [6, flat({ hip: [0, .42, 0], fR: [-.1, .12, .4], pitch: 25, fL: [.3, 0, -.22], hL: [.4, .8, -.3], hR: [.2, .7, .3] })], [10, flat({ hip: [.2, .42, 0], fR: [.94, .1, -.02], pitch: 30, hL: [.5, .6, -.3], hR: [.1, .5, .3], fL: [.2, 0, -.2] })], [15, flat({ hip: [.2, .42, 0], fR: [.94, .1, -.02], pitch: 30 })], [38, G]], hit: { limb: 'footR', r: .14, dmg: 9, hs: 0, bs: 12, kb: .3, lvl: 'low', down: true, sfx: 'kick' } },
  tigerClaw: { name: 'Tiger Claw', su: 10, ac: 3, rc: 22, step: 1.4, keys: [[0, G], [5, flat({ hR: [.15, .9, .2], pitch: 16, twist: -45, hip: [-.03, .78, 0] })], [10, flat({ hR: [.7, 1.78, 0], hip: [.1, .96, 0], pitch: 4, twist: 4, hipTwist: 10 })], [13, flat({ hR: [.7, 1.78, 0], hip: [.1, .96, 0], pitch: 4 })], [34, G]], hit: { limb: 'handR', r: .14, dmg: 12, hs: 0, bs: 13, kb: .3, lvl: 'mid', launch: 5, sfx: 'punchH', big: true } }
});

MOVES.hook = { name: 'Haymaker', su: 11, ac: 3, rc: 22, step: 1.6, keys: [[0, G], [7, flat({ hR: [-.05, 1.35, .62], twist: -70, hipTwist: -50, hip: [-.08, .9, .03], pitch: 4 })], [12, flat({ hR: [.62, 1.5, -.42], twist: 40, hipTwist: 46, pitch: 16, hip: [.18, .88, 0], fL: [.3, 0, -.2], hL: [.3, 1.3, -.2] })], [15, flat({ hR: [.62, 1.5, -.42], twist: 40, hipTwist: 46, pitch: 16, hip: [.18, .88, 0] })], [38, G]], hit: { limb: 'handR', r: .16, dmg: 17, hs: 28, bs: 14, kb: 1.1, lvl: 'high', sfx: 'punchH', big: true } };
MOVES.knee = { name: 'Knee Strike', su: 7, ac: 3, rc: 18, step: 2.2, keys: [[0, G], [4, flat({ fL: [.3, .62, -.1], hip: [.02, .9, 0], pitch: 6, hL: [.4, 1.35, -.2], hR: [.3, 1.45, .2] })], [8, flat({ fL: [.62, 1.0, -.08], hip: [.14, .9, 0], pitch: 14, hL: [.5, 1.5, -.2], hR: [.5, 1.5, .2] })], [11, flat({ fL: [.62, 1.0, -.08], hip: [.14, .9, 0], pitch: 14 })], [30, G]], hit: { limb: 'footL', r: .17, dmg: 12, hs: 24, bs: 12, kb: .8, lvl: 'mid', sfx: 'punchH', big: true } };
MOVES.spinKick = { name: 'Spin Kick', su: 14, ac: 4, rc: 24, step: 1.6, keys: [[0, G], [7, flat({ twist: -110, hipTwist: -90, hip: [-.03, .9, 0], fL: [.14, 0, -.16] })], [13, flat({ twist: -300, hipTwist: -250, pitch: -14, hip: [-.02, .88, 0], fR: [.72, 1.55, -.05], fL: [.1, 0, -.14], hL: [.2, 1.45, -.3], hR: [0, 1.2, .35] })], [18, flat({ twist: -340, hipTwist: -300, pitch: -18, hip: [-.02, .88, 0], fR: [.74, 1.62, -.05], fL: [.1, 0, -.14] })], [42, G]], hit: { limb: 'footR', r: .17, dmg: 18, hs: 28, bs: 15, kb: 1.2, lvl: 'high', sfx: 'kickH', big: true } };
MOVES.runPunch = { name: 'Charging Punch', su: 8, ac: 4, rc: 22, step: 6.2, keys: [[0, G], [5, flat({ hR: [.0, 1.25, .25], twist: -58, hipTwist: -36, hip: [-.1, .9, .03], pitch: 14 })], [10, flat({ hR: [.98, 1.4, 0], twist: 14, hipTwist: 16, pitch: 24, hip: [.3, .86, 0], fL: [.7, 0, -.2], fR: [-.4, .04, .2], hL: [.3, 1.3, -.2] })], [14, flat({ hR: [.98, 1.4, 0], twist: 14, hipTwist: 16, pitch: 24, hip: [.3, .86, 0] })], [36, G]], hit: { limb: 'handR', r: .16, dmg: 16, hs: 28, bs: 14, kb: 1.2, lvl: 'mid', sfx: 'punchH', big: true } };
MOVES.runKick = { name: 'Charging Kick', su: 8, ac: 5, rc: 26, step: 5.4, keys: [[0, G], [5, flat({ fR: [.2, .9, .3], hip: [0, .9, 0], pitch: 8, hL: [.3, 1.4, -.2], hR: [.2, 1.3, .2] })], [10, flat({ fR: [.82, 1.4, -.05], fRp: -10, hip: [.04, .9, 0], pitch: -18, fL: [-.1, 0, -.16], hL: [.2, 1.5, -.3], hR: [-.1, 1.1, .35] })], [16, flat({ fR: [.82, 1.4, -.05], hip: [.04, .9, 0], pitch: -18 })], [38, G]], hit: { limb: 'footR', r: .17, dmg: 17, hs: 28, bs: 15, kb: 1.3, lvl: 'high', sfx: 'kickH', big: true } };
// heavier, snappier: boost damage, compress timings ~20%
for (const mv of Object.values(MOVES)) {
  mv.hit.dmg = Math.round(mv.hit.dmg * 1.25); if (mv.hit.final) mv.hit.final.dmg = Math.round(mv.hit.final.dmg * 1.25);
  mv.hit.kb *= 1.35; if (mv.hit.final) mv.hit.final.kb *= 1.2;
  const k = .8; mv.su = Math.max(3, Math.round(mv.su * k)); mv.rc = Math.round(mv.rc * k); if (!mv.air) mv.ac = Math.max(2, Math.round(mv.ac * k));
  if (mv.hit.gap) mv.hit.gap = Math.max(3, Math.round(mv.hit.gap * k));
  mv.keys = mv.keys.map(([f, p]) => [Math.round(f * k), p]);
}
// fighter variety: each fighter gets their own heavy punch / kick / knee set
const HP = ['cross', 'hook', 'elbowDrive', 'lungePunch', 'hammerFist', 'tigerClaw'], HK = ['hkick', 'spinKick', 'axeKick', 'hkick', 'doubleKick'], LK = ['lkick', 'knee', 'lkick', 'knee'];
const HEAVY = ['titan', 'brutus', 'ogre', 'grizz', 'kane', 'ivan'];
for (const id in ROSTER) {
  if (id === 'kai') { ROSTER[id].basic = { hp: 'cross', hk: 'hkick', lk: 'lkick' }; continue; }
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const heavy = HEAVY.includes(id);
  ROSTER[id].basic = { hp: heavy ? (h % 2 ? 'hammerFist' : 'hook') : HP[h % HP.length], hk: HK[(h >> 3) % HK.length], lk: LK[(h >> 5) % LK.length] };
}
export const BASIC = { lp: 'jab', hp: 'cross', lk: 'lkick', hk: 'hkick', d_lk: 'sweep', d_hp: 'upper' };
