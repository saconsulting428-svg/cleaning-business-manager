/* Combat engine: Fighter state machine, 3D hit detection against rig-based hurtboxes, blocking, combos, AI. */
import * as THREE from 'three';
import { Rig } from './char.js';
import { MOVES, POSE, BASIC, guard, lerpPose, clone, mod } from './moves.js';

const V3 = THREE.Vector3, FPS = 60, DT = 1 / FPS;
const ARENA = { x: 5.4, z: 1.7 };
const tmpA = new V3(), tmpB = new V3(), tmpC = new V3();
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sm = t => t * t * (3 - 2 * t);

function segDist2(p, a, b) { // squared distance point -> segment
  tmpA.copy(b).sub(a); const l2 = tmpA.lengthSq(); let t = l2 > 1e-9 ? tmpB.copy(p).sub(a).dot(tmpA) / l2 : 0; t = clamp(t, 0, 1);
  tmpC.copy(a).addScaledVector(tmpA, t); return tmpC.distanceToSquared(p);
}

export class Fighter {
  constructor(idx, spec, game, opts = {}) {
    this.idx = idx; this.spec = spec; this.game = game; this.stats = spec.stats; this.rig = new Rig(spec, opts); this.exprName = '';
    this.pos = new V3(); this.vel = new V3(); this.y = 0; this.vy = 0; this.face = new V3(1, 0, 0); this.attFace = new V3(1, 0, 0);
    this.cur = clone(guard()); this.tgt = clone(guard()); this.tmp = clone(guard());
    this.buf = { lp: 0, hp: 0, lk: 0, hk: 0, jump: 0 }; this.prevIn = {}; this.lastTap = { f: -99, b: -99 };
    this.input = {}; this.world = {}; for (const k of ['head', 'hip', 'neck', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'hipL', 'hipR', 'handL', 'handR', 'footL', 'footR']) this.world[k] = new V3();
    this.trailPts = { handL: [], handR: [], footL: [], footR: [] };
    this.reset();
  }
  reset(x = 0, z = 0) {
    this.pos.set(x, 0, z); this.vel.set(0, 0, 0); this.y = 0; this.vy = 0; this.hp = this.stats.hp; this.shownHp = this.hp; this.state = 'idle'; this.st = 0; this.t = 0;
    this.mv = null; this.mvName = ''; this.mf = 0; this.hitDone = false; this.hitsDone = 0; this.crouch = 0; this.blockT = 0; this.hitBlend = 0; this.hitPose = POSE.hitMid; this.lay = 0;
    this.launched = false; this.comboHits = 0; this.comboDmg = 0; this.ko = false; this.walkPh = 0; this.airAtk = false; this.dodgeT = 0; this.dodgeDir = 0; this.invul = 0;
    this.cur = clone(guard()); this.mood = 'idle'; this.winPose = false; this.wins = this.wins || 0; this.landT = 0; this.winVariant = 0; this.walking = 0; this.forcePose = this.forcePose || null;
  }
  get facingYaw() { return Math.atan2(-this.face.z, this.face.x); }

  /* ---- input edges ---- */
  readInput(I, frozen) {
    const p = this.prevIn;
    for (const k of ['lp', 'hp', 'lk', 'hk', 'jump']) { if (I[k] && !p[k]) this.buf[k] = 7; else if (this.buf[k] > 0 && !frozen) this.buf[k]--; }
    const fwdKey = this.face.x >= 0 ? 'right' : 'left', backKey = fwdKey === 'right' ? 'left' : 'right';
    this.tapF = this.tapB = false;
    if (I[fwdKey] && !p[fwdKey]) { if (this.t - this.lastTap.f < 14) this.tapF = true; this.lastTap.f = this.t; }
    if (I[backKey] && !p[backKey]) { if (this.t - this.lastTap.b < 14) this.tapB = true; this.lastTap.b = this.t; }
    this.sideUp = I.sideUp && !p.sideUp; this.sideDown = I.sideDown && !p.sideDown;
    this.fwdHeld = I[fwdKey]; this.backHeld = I[backKey]; this.prevIn = Object.assign({}, I); this.input = I;
  }
  consume(k) { this.buf[k] = 0; }

  /* ---- main update (fixed 60 Hz) ---- */
  update(opp) {
    const I = this.input, G = this.game; this.t++;
    if (this.invul > 0) this.invul--;
    tmpA.set(opp.pos.x - this.pos.x, 0, opp.pos.z - this.pos.z); const dist = tmpA.length(); this.dist = dist; if (dist > .01) tmpA.multiplyScalar(1 / dist);
    this.toOpp = tmpA.clone();
    const grounded = this.y <= 0 && this.vy <= 0;
    if (this.state === 'idle' || this.state === 'dash' || this.state === 'dodge' || this.state === 'win') this.face.lerp(tmpA, .3).normalize();
    this.canAct = (this.state === 'idle' || this.state === 'dash') && G.canFight;
    switch (this.state) {
      case 'idle': case 'dash': this.tickFree(opp, grounded); break;
      case 'jump': this.tickAir(opp); break;
      case 'attack': this.tickAttack(opp); break;
      case 'hit': this.st--; this.hitBlend = Math.max(0, this.hitBlend - .02); this.hitKick = Math.max(0, (this.hitKick || 0) - .04); if (!this.launched && this.st <= 0) this.state = 'idle'; break;
      case 'block': this.st--; if (this.st <= 0) this.state = 'idle'; break;
      case 'dodge': this.tickDodge(); break;
      case 'down': this.st--; if (this.st <= 0 && !this.ko) { this.state = 'getup'; this.st = 26; this.invul = 26; } break;
      case 'getup': this.st--; if (this.st <= 0) this.state = 'idle'; break;
    }
    this.crouchTarget = (this.state === 'idle' || (this.state === 'attack' && this.mv && this.mv.crouch) || this.state === 'block' && this.crouchBlock) && I.crouch && grounded && !(this.state === 'attack') ? 1 : 0;
    this.crouch += (this.crouchTarget - this.crouch) * .3;
    // physics
    if (this.y > 0 || this.vy > 0) { this.vy -= 18 * DT; this.y += this.vy * DT; if (this.y <= 0) { this.y = 0; this.vy = 0; this.land(); } }
    this.pos.addScaledVector(this.vel, DT);
    if (this.state === 'hit' || this.state === 'block' || this.state === 'down' || this.state === 'getup' || this.state === 'attack' && !this.mv?.air) this.vel.multiplyScalar(.86);
    this.pos.x = clamp(this.pos.x, -ARENA.x, ARENA.x); this.pos.z = clamp(this.pos.z, -ARENA.z, ARENA.z);
    // lay (knockdown rotation)
    const layT = this.state === 'down' ? 1 : (this.state === 'hit' && this.launched) ? clamp(.35 + Math.abs(this.vy) * .08, 0, .9) : this.state === 'getup' ? clamp(this.st / 26, 0, 1) * .9 : 0;
    this.lay += (layT - this.lay) * (this.state === 'down' ? .22 : .16); if (this.lay < .002) this.lay = 0;
  }

  tickFree(opp, grounded) {
    const I = this.input, spd = this.stats.speed;
    this.blocking = false; this.crouchBlock = false;
    if (!this.canAct) { this.vel.multiplyScalar(.7); return; }
    if (this.state === 'dash') { this.st--; if (this.st <= 0) { if (this.sprint && this.fwdHeld) { this.st = 2; this.dashVel.copy(this.face).multiplyScalar(6 * spd); } else { this.state = 'idle'; this.sprint = false; } } if (this.state === 'dash') { this.vel.copy(this.dashVel); if (this.sprint) this.walkPh += .34; this.tryAttack(opp); return; } }
    // block
    if (I.block) { this.blocking = true; this.crouchBlock = !!I.crouch; this.vel.set(0, 0, 0); this.walkPh += 0; return; }
    if (this.tryAttack(opp)) return;
    if (this.sideUp || this.sideDown) { this.startDodge(this.sideUp ? -1 : 1); return; }
    if (this.buf.jump > 0) { this.consume('jump'); this.vy = 6.9; this.y = .001; this.airAtk = false; const ax = ((I.right ? 1 : 0) - (I.left ? 1 : 0)); this.vel.set(ax * 2.4 * spd, 0, 0); this.state = 'jump'; this.game.sfx('jump'); this.game.fx.dust(this.pos, 4); return; }
    if (this.tapF || this.tapB) { this.state = 'dash'; this.st = 10; this.sprint = !!this.tapF; const s = this.tapF ? 1 : -1; this.dashVel = this.face.clone().multiplyScalar(s * (this.tapF ? 8 : 6.5) * spd); this.game.fx.dust(this.pos, 3); this.game.sfx('whoosh'); return; }
    // walk
    const ax = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    if (I.run && !I.crouch && ax !== 0 && ax * Math.sign(this.face.x || 1) > 0) { this.state = 'dash'; this.st = 2; this.sprint = true; this.dashVel = this.face.clone().multiplyScalar(6 * spd); this.game.fx.dust(this.pos, 2); return; }
    if (!I.crouch && ax !== 0) {
      const f = ax * Math.sign(this.face.x || 1), v = f > 0 ? 2.2 * spd : 1.8 * spd;
      this.vel.copy(this.face).multiplyScalar(f * v); this.walkPh += f * v * DT * 3.4; this.walking = f;
    } else { this.vel.multiplyScalar(.6); this.walking = 0; }
  }
  startDodge(dir) { this.state = 'dodge'; this.dodgeT = 0; this.dodgeDir = dir; this.game.sfx('whoosh'); this.game.fx.dust(this.pos, 3); }
  tickDodge() {
    this.dodgeT++; const T = this.dodgeT; let vz = 0;
    if (T <= 12) vz = this.dodgeDir * 3.9; else if (T > 24 && T <= 40) vz = -this.dodgeDir * 2.9; // step out, hold, ease back
    this.vel.set(0, 0, vz); this.invul = T < 18 ? 1 : 0;
    if (T >= 42) { this.state = 'idle'; this.vel.set(0, 0, 0); }
  }
  tickAir(opp) {
    const I = this.input;
    if (!this.airAtk && (this.buf.lk > 0 || this.buf.hk > 0 || this.buf.lp > 0 || this.buf.hp > 0)) { this.airAtk = true; this.startMove('jkick'); }
  }
  land() {
    this.landT = 8; this.game.fx.dust(this.pos, 5); this.game.sfx('land');
    if (this.launched) { this.launched = false; this.state = 'down'; this.st = this.ko ? 9999 : 50; this.vel.multiplyScalar(.4); this.game.shake(.18); this.game.fx.dust(this.pos, 8); this.game.sfx('thud'); }
    else if (this.state === 'jump' || (this.state === 'attack' && this.mv && this.mv.air)) { this.state = 'idle'; this.mv = null; this.vel.set(0, 0, 0); }
  }

  tryAttack(opp) {
    const I = this.input, b = this.buf, down = I.crouch, df = down && this.fwdHeld;
    let m = null, btn = null;
    if (this.state === 'dash' && this.sprint && (b.hp > 0 || b.lp > 0 || b.lk > 0 || b.hk > 0)) { const pu = b.hp > 0 || b.lp > 0; btn = b.hp > 0 ? 'hp' : b.lp > 0 ? 'lp' : b.lk > 0 ? 'lk' : 'hk'; this.consume(btn); this.sprint = false; this.startMove(pu ? 'runPunch' : 'runKick'); return true; }
    if (b.hp > 0 && df && this.spec.specials.df_hp) { m = this.spec.specials.df_hp; btn = 'hp'; }
    else if (b.hk > 0 && df && this.spec.specials.df_hk) { m = this.spec.specials.df_hk; btn = 'hk'; }
    else if (b.hp > 0) { m = down ? BASIC.d_hp : (this.spec.basic?.hp || BASIC.hp); btn = 'hp'; }
    else if (b.lp > 0) { m = BASIC.lp; btn = 'lp'; }
    else if (b.lk > 0) { m = down ? BASIC.d_lk : (this.spec.basic?.lk || BASIC.lk); btn = 'lk'; }
    else if (b.hk > 0) { m = this.spec.basic?.hk || BASIC.hk; btn = 'hk'; }
    if (!m) return false; this.consume(btn); this.startMove(m); return true;
  }
  startMove(name) {
    const mv = MOVES[name]; this.state = 'attack'; this.mvName = name; this.mv = mv; this.mf = 0; this.hitDone = false; this.hitsDone = 0;
    if (!mv.air) this.attFace.copy(this.face); else this.attFace.copy(this.face);
    this.vel.set(0, 0, 0); for (const k in this.buf) this.buf[k] = this.buf[k] > 0 && k !== 'jump' ? 0 : this.buf[k];
    this.game.sfx(mv.hit.big ? 'whooshH' : 'whoosh'); if (mv.hit.big || Math.random() < .5) this.game.voice(this, 'attack', !!mv.hit.big);
  }
  tickAttack(opp) {
    const mv = this.mv, h = mv.hit, sp = this.stats.quick; this.mf++;
    const su = mv.su, ac = mv.ac, total = su + ac + mv.rc;
    if (!mv.air && mv.step && this.mf <= su) this.vel.copy(this.attFace).multiplyScalar(mv.step * (this.mf < su ? 1 : 0.4));
    if (mv.leap && this.mf === 1) { this.vy = mv.leap.vy; this.y = .001; this.vel.copy(this.attFace).multiplyScalar(mv.leap.vx); }
    // chains: buffered button after a connected attack
    if (this.hitDone && mv.chain && this.mf >= su + 1) { for (const k in mv.chain) if (this.buf[k] > 0) { this.consume(k); this.startMove(mv.chain[k]); this.comboChain = true; return; } }
    if (this.mf >= su && this.mf < su + ac && !this.hitDone) this.checkHit(opp);
    if (!mv.air && this.mf >= total) { this.state = 'idle'; this.mv = null; }
  }

  /* ---- hit detection (geometry-based: the real limb tip must touch a hurtbox) ---- */
  tip(limb) { return this.world[limb]; }
  hurtOverlap(def, p, r) {
    const W = def.world, sc = def.rig.sc;
    if (p.distanceToSquared(W.head) < (.14 * sc + r) ** 2) return 'head';
    if (segDist2(p, W.hip, W.neck) < (.2 * sc + r) ** 2) return 'torso';
    for (const s of ['L', 'R']) if (segDist2(p, W['hip' + s], W['knee' + s]) < (.1 * sc + r) ** 2 || segDist2(p, W['knee' + s], W['ankle' + s]) < (.085 * sc + r) ** 2) return 'legs';
    return null;
  }
  checkHit(opp) {
    const mv = this.mv, h = mv.hit, reach = this.stats.reach;
    if (opp.invul > 0 || opp.state === 'down' || opp.state === 'getup' || opp.ko) return;
    const pts = h.limb === 'both' ? ['handL', 'handR'] : h.limb === 'either' ? ['handL', 'handR'] : h.limb === 'eitherFoot' ? ['footL', 'footR'] : [h.limb];
    if (h.multi) { const k = this.mf - mv.su; if (k % (h.gap || 3) !== 0 || this.hitsDone >= h.multi) return; }
    let part = null, hp = null;
    for (const l of pts) { part = this.hurtOverlap(opp, this.tip(l), h.r * (reach > 1 ? 1 + (reach - 1) * .6 : 1)); if (part) { hp = this.tip(l); break; } }
    if (!part) return;
    if (h.multi) { this.hitsDone++; if (this.hitsDone >= h.multi) this.hitDone = true; } else this.hitDone = true;
    const final = h.multi && this.hitsDone >= h.multi;
    this.resolve(opp, final && h.final ? Object.assign({}, h, h.final) : h, part, hp);
  }
  resolve(def, h, part, point) {
    const G = this.game, sc = def.rig.sc;
    const needsCrouch = h.lvl === 'low', crouchBad = h.lvl === 'mid';
    const guarding = (def.state === 'idle' || def.state === 'block') && def.blocking !== false && (def.input.block || def.state === 'block') && def.y <= 0;
    const blocked = guarding && !(needsCrouch && !def.crouchBlock) && !(crouchBad && def.crouchBlock && def.crouch > .6);
    const scale = Math.max(.4, 1 - .1 * def.comboHits);
    const dir = this.attFace;
    if (blocked) {
      const chip = h.dmg * .1; def.hp = Math.max(1, def.hp - chip); def.state = 'block'; def.st = h.bs; def.vel.copy(dir).multiplyScalar(h.kb * 7); def.mv = null; this.vel.addScaledVector(dir, -1.2);
      G.hitstop(3); G.fx.block(point, dir); G.sfx('block'); if (Math.random() < .5) G.sfx('clang'); G.shake(.04); G.onHit(this, def, { blocked: true, dmg: chip });
      return;
    }
    const dmg = h.dmg * this.stats.power * scale / def.stats.defense;
    def.hp = Math.max(0, def.hp - dmg); def.comboHits++; def.comboDmg += dmg; this.comboCount = def.comboHits;
    def.mv = null; def.crouch = def.crouchTarget = 0;
    def.hitPose = part === 'head' ? POSE.hitHigh : part === 'legs' ? POSE.hitLow : POSE.hitMid; def.hitBlend = 1;
    const ko = def.hp <= 0; if (ko) { def.ko = true; }
    const launch = h.launch || (def.y > 0 ? 3 : 0) || (ko ? 5.5 : 0);
    if (launch || h.down) {
      def.state = 'hit'; def.launched = true; def.vy = launch || 4.2; def.y = Math.max(def.y, .02); def.vel.copy(dir).multiplyScalar((h.kb + .4) * 6 + (ko ? 2.5 : 0)); def.st = 999;
    } else { def.state = 'hit'; def.launched = false; def.st = h.hs; def.vel.copy(dir).multiplyScalar(h.kb * 7); }
    def.hitKick = ko ? 2.2 : h.big ? 1.7 : 1; G.hitstop(ko ? 22 : h.big ? 14 : 8); G.fx.hit(point, dir, h.big || ko ? 2 : 1, this.spec.aura); G.sfx(h.sfx || 'punch'); if (h.big || ko || part === 'head') G.sfx('crunch'); G.voice(def, ko ? 'ko' : 'hurt', !!(h.big || ko)); G.shake(ko ? .7 : h.big ? .55 : .24); G.flash && G.flash(h.big || ko ? .35 : .15); G.onHit(this, def, { blocked: false, dmg, part, big: h.big || ko, ko });
  }

  /* ---- pose + render ---- */
  computePose() {
    const T = this.tgt, st = this.state, t = this.t; let alpha = .38;
    // base stance
    const bob = Math.sin(t * .09) * .012, breath = Math.sin(t * .07);
    lerpPose(guard(), POSE.crouch, this.crouch, T);
    let alphaOverride = 0;
    if (st === 'idle' || st === 'dash') {
      T.hip[1] += bob; T.hL[1] += breath * .01;
      if (this.blocking) { lerpPose(T, this.crouchBlock ? POSE.crouchBlock : POSE.block, 1, T); alpha = .4; }
      else if (this.walking && st === 'idle') this.walkPose(T);
      if (st === 'dash') {
        const sg = Math.sign(this.dashVel.dot(this.face) || 1);
        if (this.sprint && sg > 0) { const ph = this.walkPh; T.pitch += 24; T.hip[0] += .2; T.hip[1] -= .05 - Math.abs(Math.sin(ph)) * .03; T.fL[0] += Math.sin(ph) * .5; T.fL[1] = Math.max(0, Math.cos(ph)) * .34; T.fR[0] += -Math.sin(ph) * .5; T.fR[1] = Math.max(0, -Math.cos(ph)) * .34; T.hL[0] = .3 + Math.sin(ph) * .3; T.hL[1] = 1.15; T.hR[0] = .3 - Math.sin(ph) * .3; T.hR[1] = 1.15; T.twist = (T.twist || 0) + Math.sin(ph) * 8; }
        else { T.pitch += 12; T.hip[0] += .12 * sg; }
      }
    } else if (st === 'block') { lerpPose(T, this.crouchBlock ? POSE.crouchBlock : POSE.block, 1, T); T.pitch += 4; alpha = .5; }
    else if (st === 'jump') { lerpPose(T, POSE.air, 1, T); lerpPose(T, POSE.airFall, clamp(.5 - this.vy / 8, 0, 1), T); alpha = .3; }
    else if (st === 'attack') { this.attackPose(T); alphaOverride = 1; }
    else if (st === 'hit') { const hp = this.hitPose; lerpPose(T, hp, this.launched ? 1 : clamp(.5 + this.hitBlend * .5, 0, 1), T); if (this.launched) { T.hip[1] = .95; } const hk = this.hitKick || 0; T.pitch -= 16 * hk; T.hip[0] -= .09 * hk; T.headPitch = (T.headPitch || 0) - 22 * hk; alpha = .6; }
    else if (st === 'down') { lerpPose(T, this.ko ? POSE.defeat : POSE.down, 1, T); alpha = .35; }
    else if (st === 'getup') { lerpPose(T, POSE.down, clamp(this.st / 26, 0, 1), T); alpha = .3; }
    else if (st === 'dodge') { const d = this.dodgeDir, k = Math.sin(Math.min(1, this.dodgeT / 14) * Math.PI); lerpPose(T, mod(guard(), { hip: [0, .8, .02 + d * .06], pitch: 14, hL: [.38, 1.3, -.2], hR: [.3, 1.2, .1], fL: [.3, k * .06, -.16 + d * k * .3], fR: [-.3, 0, .24 + d * k * .22], roll: -d * 12 }), 1, T); alpha = .3; }
    if (this.winPose) { lerpPose(T, [POSE.win, POSE.win2, POSE.taunt][this.winVariant % 3], 1, T); alpha = .1; }
    if (this.landT > 0 && (st === 'idle')) { const k = this.landT / 8; T.hip[1] -= .14 * k; T.pitch += 8 * k; T.fL[0] += .05 * k; this.landT--; }
    if (this.forcePose) { lerpPose(T, this.forcePose, 1, T); alpha = .4; alphaOverride = 0; }
    if (this.mood === 'taunt') lerpPose(T, POSE.taunt, 1, T);
    // expression
    if (!this.exprLock) { let ex = 'focused'; if (st === 'attack') ex = this.mv && this.mv.hit.big ? 'shouting' : 'effort'; else if (st === 'hit') ex = 'pain'; else if (st === 'down') ex = this.ko ? 'ko' : 'pain'; else if (st === 'block' || this.blocking) ex = 'serious'; else if (this.winPose) ex = 'smirk'; else if (st === 'dash' || st === 'dodge') ex = 'angry';
      if (ex !== this.rig.exprName) this.rig.setExpression(ex); }
    lerpPose(this.cur, T, alphaOverride ? 1 : alpha, this.cur);
    this.rig.apply(this.cur, DT);
    const r = this.rig.root;
    r.position.set(this.pos.x, this.y, this.pos.z); r.rotation.y = this.facingYaw + (st === 'attack' && !(this.mv && this.mv.air) ? 0 : 0);
    if (st === 'attack') r.rotation.y = Math.atan2(-this.attFace.z, this.attFace.x);
    r.updateMatrixWorld(true);
    const J = this.rig.joints, W = this.world;
    W.head.copy(J.head); W.hip.copy(J.hip); W.neck.copy(J.neck); for (const k of ['kneeL', 'kneeR', 'ankleL', 'ankleR', 'hipL', 'hipR', 'handL', 'handR', 'footL', 'footR']) W[k].copy(J[k]);
    for (const k in W) this.rig.body.localToWorld(W[k]);
  }
  walkPose(T) {
    const ph = this.walkPh, f = this.walking, k = .22;
    T.fL[0] += Math.sin(ph) * k; T.fL[1] = Math.max(0, Math.cos(ph)) * .1; T.fR[0] += -Math.sin(ph) * k; T.fR[1] = Math.max(0, -Math.cos(ph)) * .1;
    T.hip[1] += Math.abs(Math.sin(ph)) * -.02 - .01; T.pitch += f > 0 ? 3 : -3; T.hL[0] += Math.sin(ph) * .05; T.hR[1] += Math.cos(ph * 2) * .015;
    if (f < 0) { T.hL[1] += .1; T.hR[1] += .1; T.fL[0] -= Math.sin(ph) * .06; T.fR[0] += Math.sin(ph) * .06; }
  }
  attackPose(T) {
    const mv = this.mv, keys = mv.keys; let f = this.mf;
    let i = 0; while (i < keys.length - 2 && f > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1], u = clamp((f - a[0]) / Math.max(1, b[0] - a[0]), 0, 1);
    lerpPose(a[1], b[1], sm(u), T);
    if (this.mvName === 'reaperSpin') { /* spin end equals guard orientation */ }
  }
}

/* ---------- AI controller ---------- */
export const DIFFICULTY = {
  easy:   { react: 26, block: .22, punish: .08, aggr: .55, combo: .25, dodge: .02, think: [24, 44] },
  normal: { react: 16, block: .5,  punish: .3,  aggr: .85, combo: .5,  dodge: .08, think: [16, 32] },
  hard:   { react: 9,  block: .72, punish: .55, aggr: 1.1, combo: .75, dodge: .16, think: [10, 22] },
  expert: { react: 4,  block: .9,  punish: .8,  aggr: 1.4, combo: 1.0, dodge: .26, think: [6, 14] }
};
export class AI {
  constructor(level = 'normal', profile = {}) { this.setLevel(level, profile); this.plan = 'wait'; this.pt = 0; this.guardT = 0; this.low = false; this.reactQ = []; this.press = {}; this.holdSide = 0; }
  setLevel(level, profile = {}) { this.L = Object.assign({}, typeof level === 'string' ? DIFFICULTY[level] : level); this.prof = profile; this.L.aggr *= profile.aggr || 1; this.L.block = Math.min(.97, this.L.block * (profile.block || 1)); this.L.combo *= profile.combo || 1; }
  poll(f, o, game) {
    const I = { left: 0, right: 0, crouch: 0, jump: 0, block: 0, lp: 0, hp: 0, lk: 0, hk: 0, sideUp: 0, sideDown: 0 };
    if (!game.canFight || this.dummy) return I;
    const L = this.L, dist = f.dist || 2, tw = o.pos.x > f.pos.x ? 1 : -1, FW = tw > 0 ? 'right' : 'left', BK = tw > 0 ? 'left' : 'right';
    this.pt--; if (this.guardT > 0) this.guardT--;
    const oa = o.state === 'attack' ? o.mv : null;
    // react to a new attack (with human-like reaction delay)
    if (oa && o.mf === 1 && dist < 1.9) this.reactQ.push({ t: L.react, mv: oa });
    for (const r of this.reactQ) r.t--;
    while (this.reactQ.length && this.reactQ[0].t <= 0) {
      const r = this.reactQ.shift(), roll = Math.random();
      if (roll < L.block) { this.guardT = r.mv.su + r.mv.ac + 6; this.low = r.mv.hit.lvl === 'low'; }
      else if (roll < L.block + L.dodge && dist < 1.6) { this.sidestep = Math.random() < .5 ? 'up' : 'down'; }
    }
    if (this.sidestep && f.canAct) { I[this.sidestep === 'up' ? 'sideUp' : 'sideDown'] = 1; this.sidestep = null; return I; }
    // punish whiffed / blocked recovery
    if (oa && o.mf > oa.su + oa.ac + 2 && dist < 1.45 && f.canAct && Math.random() < L.punish * .35 && this.guardT <= 0) { I[Math.random() < .6 ? 'lp' : 'hp'] = 1; this.pt = 6; return I; }
    if (this.guardT > 0) { I.block = 1; I.crouch = this.low ? 1 : 0; return I; }
    if (f.state === 'attack') { // chain follow-ups
      if (f.hitDone && f.mv.chain && Math.random() < L.combo * .3) { const k = Object.keys(f.mv.chain)[0]; I[k] = 1; }
      return I;
    }
    if (!f.canAct) return I;
    if (o.y > .5 && dist < 1.5 && Math.random() < .5) { I.crouch = 1; I.hp = 1; return I; }
    if (this.pt <= 0) {
      const r = Math.random(), a = L.aggr; this.pt = Math.round(L.think[0] + Math.random() * (L.think[1] - L.think[0]));
      if (dist > 3) this.plan = r < .55 ? 'approach' : r < .7 ? 'dash' : r < .8 ? 'jump' : 'wait';
      else if (dist > 1.55) this.plan = r < .5 ? 'approach' : r < .5 + .2 * a ? 'poke' : r < .85 ? 'wait' : 'retreat';
      else this.plan = r < .6 * a ? 'attack' : r < .72 ? 'retreat' : r < .84 ? 'guard' : r < .9 ? 'sidestep' : 'wait';
    }
    switch (this.plan) {
      case 'approach': if (dist > 1.2) I[FW] = 1; else this.pt = 0; break;
      case 'retreat': I[BK] = 1; break;
      case 'guard': I.block = 1; break;
      case 'dash': I[FW] = (f.t % 10 < 3) ? 1 : 0; if (f.t % 10 === 5) I[FW] = 1; break;
      case 'jump': if (f.state === 'idle') { I.jump = 1; I[FW] = 1; } this.plan = 'wait'; break;
      case 'sidestep': I[Math.random() < .5 ? 'sideUp' : 'sideDown'] = 1; this.plan = 'wait'; break;
      case 'poke': if (dist < 1.5) { const r = Math.random(); if (r < .5) I.lk = 1; else if (r < .8) I.hk = 1; else I.lp = 1; this.plan = 'wait'; } else I[FW] = 1; break;
      case 'attack': {
        if (dist > 1.3) { I[FW] = 1; break; }
        const r = Math.random(); if (r < .38) I.lp = 1; else if (r < .55) I.hp = 1; else if (r < .7) I.lk = 1; else if (r < .8) { I.crouch = 1; I.lk = 1; } else if (r < .9) { I.crouch = 1; I.hp = 1; } else { I.crouch = 1; I[FW] = 1; I[Math.random() < .5 ? 'hp' : 'hk'] = 1; }
        this.plan = 'wait'; break;
      }
    }
    return I;
  }
}
export { ARENA };
