/* Game flow: menus, select, match/round manager, tournament (arcade), versus, training, settings, HUD. */
import * as THREE from 'three';
import { Fighter, AI, DIFFICULTY } from './fight.js';
import { ROSTER, POSE, MOVES } from './moves.js';
import { PORTRAITS } from './portraits.js';
import { Controller, getBindings, setBinding, resetBindings, onKey, isDown, touchState } from './input.js';
import { initAudio, sfx, setVolume, setMusic, setIntensity, speak, voice } from './audio.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { EXPR } from './char.js';

const ARENA_NAMES = { rooftop: 'NEON ROOFTOP', dojo: 'TOURNAMENT DOJO', bunker: 'UNDERGROUND PIT' };
const FPS = 60, DT = 1 / FPS, ROUNDS_TO_WIN = 2, ROUND_TIME = 60;
const $ = (s, r = document) => r.querySelector(s);
const LEVELS = ['easy', 'normal', 'hard', 'expert'];
const ACTION_LABEL = { left: 'Move Left', right: 'Move Right', crouch: 'Crouch', sideUp: 'Sidestep (away)', sideDown: 'Sidestep (near)', jump: 'Jump', block: 'Block', run: 'Run (hold + forward)', lp: 'Light Punch', hp: 'Heavy Punch', lk: 'Light Kick', hk: 'Heavy Kick' };
const keyName = c => c.replace('Key', '').replace('Arrow', '↑↓←→'.includes('x') ? '' : '').replace('Numpad', 'Num ').replace('ShiftLeft', 'L-Shift').replace('Space', 'Space').replace('Digit', '');

export class Game {
  constructor(gfx) {
    this.gfx = gfx; this.fx = gfx.fx; this.scene = gfx.scene; this.F = []; this.fighterCache = {};
    this.screen = 'menu'; this.phase = 'none'; this.mode = 'arcade'; this.canFight = false; this.hitstopF = 0; this.timeScale = 1; this.paused = false;
    this.settings = Object.assign({ arena: 'auto', difficulty: 'normal', quality: 'medium', sfx: .8, music: .5, timer: ROUND_TIME, rounds: ROUNDS_TO_WIN }, JSON.parse(localStorage.getItem('sc3d_settings') || '{}'));
    this.acc = 0; this.frame = 0; this.sel = { step: 0, idx: 0, p1: null, p2: null }; this.camMode = 'menu';
    this.ui = {}; this.buildUI(); this.show('menu'); setVolume(this.settings.sfx, this.settings.music);
    onKey((code) => this.onKeyDown(code));
    this.previewFighter = null;
  }
  /* ---------------- helpers used by Fighter ---------------- */
  sfx(n) { sfx(n); }
  voice(f, kind, big) { voice(kind, f.spec.gender === 'f', big); }
  say(t, o) { speak(t, Object.assign({ vol: this.settings.sfx }, o)); }
  flash(a) { try { let d = this._fl; if (!d) { d = this._fl = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;background:#fff;pointer-events:none;opacity:0;z-index:5;transition:opacity .18s ease-out'; document.body.appendChild(d); } d.style.transition = 'none'; d.style.opacity = a; void d.offsetWidth; d.style.transition = 'opacity .18s ease-out'; d.style.opacity = 0; } catch (e) {} }
  hitstop(f) { this.hitstopF = Math.max(this.hitstopF, f); }
  shake(a) { this.gfx.cam.shake(a); this.gfx.kick(a * .02); if (a > .2) this.gfx.cam.zoomKick = a * 2; }
  onHit(att, def, info) {
    this.ui.combo(att, def);
    if (info.ko && this.phase === 'fight') this.endRound('ko', att);
  }

  /* ---------------- fighters ---------------- */
  getFighter(idx, id) {
    const key = idx + ':' + id; let f = this.fighterCache[key];
    if (!f) { f = new Fighter(idx, ROSTER[id], this); this.fighterCache[key] = f; f.rig.root.visible = false; this.scene.add(f.rig.root); }
    return f;
  }
  disposeFighter(key) {
    const f = this.fighterCache[key]; if (!f) return; this.scene.remove(f.rig.root);
    f.rig.root.traverse(o => { if (o.isMesh) { o.geometry && o.geometry.dispose(); for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (!m) continue; for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose && m.dispose(); } } });
    delete this.fighterCache[key]; if (this.previewFighter === f) this.previewFighter = null;
  }
  pruneCache(keep) { for (const k of Object.keys(this.fighterCache)) if (!keep.includes(k)) this.disposeFighter(k); }
  getHero(id) { const key = 'hero:' + id; let f = this.fighterCache[key]; if (!f) { f = new Fighter(9, ROSTER[id], this, { lod: 'hero' }); this.fighterCache[key] = f; f.rig.root.visible = false; this.scene.add(f.rig.root); } return f; }
  setFighters(id1, id2) {
    for (const f of this.F) f.rig.root.visible = false;
    this.pruneCache(['0:' + id1, '1:' + id2]); this.F = [this.getFighter(0, id1), this.getFighter(1, id2)];
    for (const f of this.F) { f.rig.root.visible = true; f.wins = 0; }
  }
  placeFighters() {
    this.F[0].reset(-1.35, 0); this.F[1].reset(1.35, 0); this.F[0].face.set(1, 0, 0); this.F[1].face.set(-1, 0, 0);
    for (const f of this.F) { f.winPose = false; f.mood = 'idle'; f.computePose(); }
  }

  /* ---------------- match flow ---------------- */
  startMatch(opts) {
    initAudio(); this.mode = opts.mode; this.opts = opts; this.setFighters(opts.p1, opts.p2); this.arenaName = this.pickArena(); this.gfx.setArena(this.arenaName);
    const s = this.settings, solo = this.mode !== 'versus';
    this.ctrl = [new Controller(0, this.mode === 'versus' ? 0 : -1), this.mode === 'versus' ? new Controller(1, 1) : null];
    this.solo = solo;
    this.ai = null;
    if (solo) { const lvl = opts.level || s.difficulty; this.ai = new AI(lvl, ROSTER[opts.p2].ai); this.F[1].tkx = (opts.mode === 'arcade' && opts.p2 === 'omega') ? .88 : 1; this.ai.dummy = this.mode === 'training'; }
    this.round = 1; this.F[0].wins = this.F[1].wins = 0; this.training = this.mode === 'training';
    this.hideAll(); this.beginRound(true);
  }
  pickArena() { const all = ['rooftop', 'dojo', 'bunker'], a = this.settings.arena || 'auto'; if (this.mode === 'arcade' && this.tour) return all[this.tour.step % 3]; if (a !== 'auto' && all.includes(a)) return a; return all[(Math.random() * 3) | 0]; }
  beginRound(first) {
    this.placeFighters(); this.timer = this.training ? 999 : this.settings.timer; this.timerAcc = 0; this.canFight = false; this.phase = 'intro'; this.phaseT = 0; this.timeScale = 1; this.hitstopF = 0;
    this.ui.setHud(true); this.ui.updateHud(true); this.gfx.cam.setMode(first ? 'intro' : 'fight'); this.camMode = first ? 'intro' : 'fight';
    this.screen = 'game'; this.introSeq = first ? 5.6 : 0; this.announced = 0; setIntensity(.2);
    if (first) this.ui.intro(this.F[0].spec, this.F[1].spec, this.mode, this.tour);
    this.pose0();
  }
  pose0() { for (const f of this.F) { f.input = {}; f.prevIn = {}; } }
  endRound(why, winnerF) {
    if (this.phase !== 'fight') return;
    let w = winnerF; if (!w) { const [a, b] = this.F; w = a.hp > b.hp ? a : b.hp > a.hp ? b : null; }
    this.canFight = false; this.phase = 'ko'; this.phaseT = 0; this.roundWinner = w; if (w) w.wins++;
    this.timeScale = why === 'ko' ? .28 : 1; this.gfx.cam.setMode('ko', w ? this.F[1 - w.idx] : this.F[1]); this.camMode = 'ko';
    this.ui.banner(why === 'ko' ? 'K.O.' : 'TIME UP', why === 'ko' ? 'ko' : '');
    if (why === 'ko') { sfx('ko'); this.gfx.flash(.3, '#ffffff'); this.gfx.kick(.02); this.say('K.O.!', { pitch: .45, rate: .8 }); setTimeout(() => sfx('crowd'), 500); } else { this.say('Time up!'); sfx('bell'); }
    setIntensity(0);
  }
  afterKO() {
    const w = this.roundWinner; this.phase = 'roundEnd'; this.phaseT = 0; this.timeScale = 1;
    if (w) { w.winPose = true; w.winVariant = (Math.random() * 3) | 0; sfx('win'); sfx('crowd'); voice('win', w.spec.gender === 'f', true); setTimeout(() => this.say(this.mode === 'versus' ? 'Player ' + (w.idx + 1) + ' wins' : w.idx === 0 ? 'You win' : 'You lose', { rate: .85 }), 500); this.ui.banner(w.spec.name + ' WINS', 'win'); this.gfx.cam.setMode('win', w); this.camMode = 'win'; }
    else this.ui.banner('DRAW', '');
  }
  nextRoundOrEnd() {
    const need = this.settings.rounds, [a, b] = this.F;
    if (!this.training && (a.wins >= need || b.wins >= need)) return this.endMatch(a.wins >= need ? a : b);
    this.round++; this.beginRound(false);
  }
  endMatch(w) {
    this.phase = 'match'; this.phaseT = 0; this.matchWinner = w; this.gfx.cam.setMode('win', w); this.camMode = 'win'; this.canFight = false;
    const humanWon = this.mode === 'versus' || w.idx === 0; sfx(humanWon ? 'crowdBig' : 'lose'); setTimeout(() => this.say(this.mode === 'versus' ? 'Player ' + (w.idx + 1) + ' is victorious' : humanWon ? 'Victory!' : 'You lose', { rate: .8 }), 900);
    this.ui.setHud(false);
    if (this.mode === 'arcade') {
      if (humanWon) { this.tour.step++; this.saveTour(); if (this.tour.step >= this.tour.queue.length) { this.ui.champion(this.F[0].spec, this.tour); this.clearTour(); } else this.ui.result({ title: 'VICTORY', sub: 'NEXT OPPONENT: ' + ROSTER[this.tour.queue[this.tour.step]].name, winner: w.spec, buttons: [['NEXT FIGHT', () => this.nextTourFight()], ['MENU', () => this.toMenu()]], auto: 4200, autoFn: () => this.nextTourFight() }); }
      else this.ui.result({ title: 'DEFEAT', sub: w.spec.name + ' WINS', winner: w.spec, defeat: true, buttons: [['RETRY', () => this.nextTourFight(true)], ['MENU', () => this.toMenu()]] });
    } else this.ui.result({ title: this.mode === 'versus' ? 'PLAYER ' + (w.idx + 1) + ' WINS' : 'VICTORY', sub: w.spec.name + ' — ' + w.spec.title, winner: w.spec, buttons: [['REMATCH', () => this.startMatch(this.opts)], ['CHARACTER SELECT', () => this.openSelect(this.mode)], ['MENU', () => this.toMenu()]] });
  }
  toMenu() { this.gfx.setArena('rooftop'); this.phase = 'none'; this.canFight = false; this.timeScale = 1; this.paused = false; this.ui.pause(false); this.hideAll(); this.menuScene(); this.show('menu'); this.ui.setHud(false); this.gfx.cam.setMode('menu'); this.camMode = 'menu'; setIntensity(0); $('#banner').classList.remove('show'); }
  menuScene() { // idle stand-off behind the main menu
    this.previewFighter && (this.previewFighter.rig.root.visible = false); this.setFighters('kai', 'draven'); this.placeFighters(); this.F[0].reset(.2, .5); this.F[1].reset(2.0, -.3); this.F[0].face.set(1, 0, -.2).normalize(); this.F[1].face.set(-1, 0, .1).normalize(); this.screen = 'menu';
  }

  /* ---------------- tournament ---------------- */
  startTour(p1) {
    const others = Object.keys(ROSTER).filter(k => k !== p1 && k !== 'omega'); for (let i = others.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[others[i], others[j]] = [others[j], others[i]]; }
    if (p1 !== 'omega' && ROSTER.omega) others.push('omega'); // the final boss always comes last
    this.tour = { p1, queue: others, step: 0 }; this.saveTour(); this.nextTourFight();
  }
  tourLevel() { const n = this.tour.queue.length, t = n <= 1 ? .5 : this.tour.step / (n - 1), base = LEVELS.indexOf(this.settings.difficulty); return LEVELS[Math.max(0, Math.min(3, Math.floor(t * 3.4 + (base - 1) * .5)))]; }
  nextTourFight(retry) { const T = this.tour; this.startMatch({ mode: 'arcade', p1: T.p1, p2: T.queue[T.step], level: this.tourLevel() }); }
  saveTour() { try { localStorage.setItem('sc3d_tour', JSON.stringify(this.tour)); } catch (e) {} }
  clearTour() { try { localStorage.removeItem('sc3d_tour'); } catch (e) {} }
  loadTour() { try { const t = JSON.parse(localStorage.getItem('sc3d_tour') || 'null'); if (t && ROSTER[t.p1] && t.queue.every(q => ROSTER[q]) && t.step < t.queue.length) return t; } catch (e) {} return null; }

  /* ---------------- frame update ---------------- */
  update(dt) {
    this.gfx.cam.t += 0; const F = this.F;
    if ((this.screen === 'menu' || this.screen === 'settings') && F.length && !this.paused) { F[0].input = F[1].input = {}; F[0].update(F[1]); F[1].update(F[0]); F[0].computePose(); F[1].computePose(); }
    if (this.screen === 'viewer') this.viewerTick(dt);
    if (this.screen === 'select' && this.previewFighter) { const f = this.previewFighter; f.t++; f.input = {}; f.walkPh += .02; f.computePose(); }
    if (this.screen === 'game' && !this.paused) {
      this.acc += Math.min(dt, .1) * this.timeScale;
      while (this.acc >= DT) { this.acc -= DT; this.step(); }
      for (const f of F) { if (f.rig && this.phase) { /* keep pose fresh while interpolating */ } }
    }
    if (this.screen === 'viewer') { this.gfx.cam.view = this.v.view; }
    const camF = this.camMode === 'select' || this.screen === 'viewer' && this.previewFighter ? [this.previewFighter || this.v.f, this.previewFighter || this.v.f] : (F.length ? F : [{ pos: new THREE.Vector3(-1, 0, 0), y: 0 }, { pos: new THREE.Vector3(1, 0, 0), y: 0 }]);
    this.gfx.cam.update(dt, camF, this.gfx.aspect);
    if (this.screen === 'game') {
      this.ui.updateHud(); for (const f of F) { for (const [k, c] of [['handL', '#ffffff'], ['handR', '#ffffff'], ['footL', '#ffdca0'], ['footR', '#ffdca0']]) { const act = f.state === 'attack' && f.mv && f.mf >= f.mv.su - 4 && f.mf <= f.mv.su + f.mv.ac + 3 && (f.mv.hit.limb === k || f.mv.hit.limb === 'both' || f.mv.hit.limb === 'either' || (f.mv.hit.limb === 'eitherFoot' && k.startsWith('foot'))); const big = act && f.mv.hit.big; this.fx.trail(f.idx + k, f.world[k], act, big ? '#ff6a18' : f.spec.color); if (act && (big || k.startsWith('foot') || Math.random() < .5)) this.fx.fire(f.world[k], big ? 3 : 1, .7); } }
    }
  }
  step() {
    this.frame++; const F = this.F, [a, b] = F;
    this.phaseT += DT * 1; // phase time uses simulated seconds
    if (this.phase === 'intro') {
      const T = this.phaseT, first = this.introSeq > 0, base = first ? this.introSeq : 0;
      for (const f of F) { f.input = {}; f.t++; f.update(f === a ? b : a); f.computePose(); }
      if (T >= base && this.announced === 0) { this.announced = 1; this.ui.hideIntro(); this.gfx.cam.setMode('fight'); this.camMode = 'fight'; { const need = this.settings.rounds, fin = !this.training && this.F[0].wins === need - 1 && this.F[1].wins === need - 1; this.ui.banner(fin ? 'FINAL ROUND' : 'ROUND ' + this.round, 'round'); sfx('round'); this.say(fin ? 'Final round' : this.training ? 'Training' : 'Round ' + ['zero', 'one', 'two', 'three', 'four', 'five'][Math.min(5, this.round)]); } }
      if (T >= base + 1.4 && this.announced === 1) { this.announced = 2; this.ui.banner('FIGHT!', 'fight'); sfx('fight'); this.say('Fight!', { pitch: .5, rate: .95 }); this.canFight = true; this.phase = 'fight'; this.phaseT = 0; setIntensity(.7); this.gfx.flash(.25, '#ffd9a0'); }
      return;
    }
    if (this.hitstopF > 0) { this.hitstopF--; for (const f of F) f.computePose(); return; }
    // inputs
    if (this.canFight || this.phase === 'ko' || this.phase === 'roundEnd') {
      const c0 = this.ctrl[0].poll(this.solo), I0 = this.canFight ? c0 : {};
      let I1 = {}; if (this.canFight) { if (this.solo) I1 = this.ai.poll(b, a, this); else I1 = this.ctrl[1].poll(false); }
      a.readInput(I0, false); b.readInput(I1, false);
    } else { a.readInput({}, false); b.readInput({}, false); }
    a.update(b); b.update(a);
    // push apart (3D) + keep inside arena
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), min = .62;
    if (d < min && a.y < .5 && b.y < .5 && d > 1e-4 && a.state !== 'down' && b.state !== 'down') { const p = (min - d) / 2, nx = dx / d, nz = dz / d; a.pos.x -= nx * p; a.pos.z -= nz * p; b.pos.x += nx * p; b.pos.z += nz * p; }
    for (const f of F) f.computePose();
    for (const f of F) f.shownHp += (f.hp - f.shownHp) * .08;
    if (this.phase === 'fight' && this.frame % 70 === 0 && F.some(f => f.hp > 0 && f.hp < 22)) sfx('heartbeat');
    // timer / training regen
    if (this.phase === 'fight') {
      if (!this.training) { this.timerAcc += DT; if (this.timerAcc >= 1) { this.timerAcc -= 1; this.timer--; if (this.timer > 0 && this.timer <= 5) sfx('tick'); if (this.timer <= 0) this.endRound('time'); } }
      else { for (const f of F) if (f.state === 'idle' && this.frame % 120 === 0) f.hp = Math.min(f.stats.hp, f.hp + 15); for (const f of F) if (f.comboHits > 0 && f.state === 'idle') { f.comboHits = 0; } }
      if (a.state === 'idle') a.comboHits = 0; if (b.state === 'idle') b.comboHits = 0;
    } else if (this.phase === 'ko') {
      if (this.timeScale < 1 && this.phaseT > .9 * this.timeScale) this.timeScale = 1;
      if (this.phaseT > 2.4) this.afterKO();
    } else if (this.phase === 'roundEnd') { if (this.phaseT > 3.4) this.nextRoundOrEnd(); }
    else if (this.phase === 'match') { /* UI-driven */ }
  }

  /* ---------------- character viewer ---------------- */
  openViewer(id = 'kai') {
    initAudio(); this.F.forEach(f => f.rig.root.visible = false); this.previewFighter && (this.previewFighter.rig.root.visible = false); this.previewFighter = null;
    this.pruneCache(['hero:' + id]); const f = this.getHero(id); f.reset(0, 0); f.face.set(1, 0, 0); f.rig.root.visible = true; f.exprLock = false;
    const W = {}; for (const k of ['head', 'hip', 'neck', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'hipL', 'hipR', 'handL', 'handR', 'footL', 'footR']) W[k] = new THREE.Vector3(99, 99, 99);
    f.forcePose = POSE.relaxed; this.v = { f, id, anim: 'stand', t: 0, acc: 0, expr: null, spin: false, view: { az: .6, el: .05, dist: 4.8, ty: .95, fov: 28 }, dummy: { pos: new THREE.Vector3(3, 0, 0), y: 0, state: 'down', invul: 0, ko: true, world: W, rig: { sc: 1 }, input: {}, crouch: 0 } };
    this.hideAll(); this.ui.showViewer(id); this.gfx.setStudio(true); this.camMode = 'viewer'; this.gfx.cam.setMode('viewer'); this.ui.setHud(false); this.screen = 'viewer'; this.canFight = false;
  }
  closeViewer() { this.gfx.setStudio(false); this.v.f.rig.root.visible = false; this.v.f.exprLock = false; this.toMenu(); }
  viewerPlay(anim) { const v = this.v, f = v.f; v.anim = anim; v.t = 0; f.forcePose = anim === 'stand' ? POSE.relaxed : null; f.reset(0, 0); f.face.set(1, 0, 0); f.winPose = false; f.walking = 0; f.blocking = false; f.mv = null; f.state = 'idle'; f.crouch = 0; f.rig.setExpression(v.expr || 'focused', true); this.ui.markViewer(); }
  viewerExpr(name) { const v = this.v; v.expr = name === 'auto' ? null : name; v.f.exprLock = !!v.expr; if (v.expr) v.f.rig.setExpression(v.expr); this.ui.markViewer(); }
  viewerView(name) { const V = this.v.view, m = { front: [0, .05, 4.8, .95, 28], right: [Math.PI / 2, .05, 4.8, .95, 28], back: [Math.PI, .05, 4.8, .95, 28], left: [-Math.PI / 2, .05, 4.8, .95, 28], three: [.65, .08, 4.8, .95, 28], face: [0, 0, 1.0, 1.66, 22], closeup: [.5, .06, 2.0, 1.4, 26] }[name]; this.v.spin = name === 'spin'; if (m) { V.az = m[0]; V.el = m[1]; V.dist = m[2]; V.ty = m[3]; V.fov = m[4]; } }
  viewerTick(dt) {
    const v = this.v; if (!v) return; v.acc += Math.min(dt, .1); const f = v.f;
    if (v.spin) v.view.az += dt * .6;
    while (v.acc >= DT) { v.acc -= DT; v.t++; const a = v.anim, loop = n => v.t % n === 1;
      const moves = { jab: 'jab', cross: 'cross', lkick: 'lkick', hkick: 'hkick', sweep: 'sweep', upper: 'upper', special1: f.spec.specials.df_hp, special2: f.spec.specials.df_hk };
      if (moves[a]) { if (f.state === 'idle' && v.t % 110 === 1) { f.pos.set(0, 0, 0); f.startMove(moves[a]); } }
      else if (a === 'walkF' || a === 'walkB') { f.walking = a === 'walkF' ? 1 : -1; f.walkPh += (a === 'walkF' ? 1 : -1) * .08; }
      else if (a === 'hit') { if (loop(80)) { f.pos.set(0, 0, 0); f.state = 'hit'; f.launched = false; f.st = 34; f.hitPose = [POSE.hitHigh, POSE.hitMid, POSE.hitLow][(v.t / 80 | 0) % 3]; f.hitBlend = 1; f.vel.set(-1.6, 0, 0); } }
      else if (a === 'jump') { if (loop(90)) { f.pos.set(0, 0, 0); f.state = 'jump'; f.vy = 6.9; f.y = .001; f.airAtk = true; } }
      else if (a === 'dodge') { if (loop(100)) { f.pos.set(0, 0, 0); f.startDodge((v.t / 100 | 0) % 2 ? 1 : -1); } }
      else if (a === 'knockdown') { if (loop(260)) { f.pos.set(0, 0, 0); f.state = 'hit'; f.launched = true; f.vy = 5.2; f.y = .02; f.vel.set(-2.4, 0, 0); f.st = 999; f.ko = false; } }
      else if (a === 'victory') { f.winPose = true; if (loop(180)) f.winVariant = (f.winVariant + 1) % 3; }
      else if (a === 'defeat') { if (loop(300)) { f.pos.set(0, 0, 0); f.ko = true; f.state = 'hit'; f.launched = true; f.vy = 5.5; f.y = .02; f.vel.set(-2.2, 0, 0); f.st = 999; } }
      f.input = {}; f.update(v.dummy); f.canAct = false;
      if (a === 'block') f.blocking = true; if (a === 'crouch') f.crouch = 1; if (a === 'crouchBlock') { f.blocking = true; f.crouchBlock = true; f.crouch = 1; }
      if (f.pos.x > 1.6 || f.pos.x < -1.6) f.pos.x = 0; f.pos.z = 0;
      f.computePose(); this.fx.dust && 0;
    }
  }
  exportGLB() {
    const f = this.v ? this.v.f : this.getHero('kai'); f.rig.root.updateMatrixWorld(true);
    return new Promise((res, rej) => new GLTFExporter().parse(f.rig.root, r => res(r), rej, { binary: true, onlyVisible: false, maxTextureSize: 1024 }));
  }
  async downloadGLB() { const buf = await this.exportGLB(), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' })); a.download = this.v.id + '.glb'; a.click(); }

  /* ---------------- keys / navigation ---------------- */
  onKeyDown(code) {
    initAudio();
    if (this.screen === 'game' && (code === 'Escape' || code === 'KeyP') && this.phase !== 'match') { this.togglePause(); return; }
    if (this.remapping) { this.remapping(code); return; }
    const nav = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space'];
    if (!nav.includes(code)) return;
    if (this.screen === 'menu') this.menuNav(code);
    else if (this.screen === 'select') this.selectNav(code);
    else if (this.screen === 'settings' && code === 'Escape') this.show('menu');
    else if (this.screen === 'viewer' && code === 'Escape') this.closeViewer();
    else if (this.screen === 'game' && this.paused) this.pauseNav(code);
    else if (this.screen === 'game' && this.phase === 'match') this.resultNav(code);
  }
  togglePause() { this.paused = !this.paused; this.ui.pause(this.paused); sfx('ui'); if (this.paused) setIntensity(0); }
  menuNav(code) {
    const items = this.ui.menuItems; let i = this.ui.menuIdx;
    if (code === 'ArrowUp' || code === 'KeyW') i = (i + items.length - 1) % items.length; else if (code === 'ArrowDown' || code === 'KeyS') i = (i + 1) % items.length;
    else if (code === 'Enter' || code === 'Space') { sfx('ok'); items[i].fn(); return; } else return;
    this.ui.menuIdx = i; this.ui.refreshMenu(); sfx('ui');
  }
  pauseNav(code) { const it = this.ui.pauseItems; if (code === 'ArrowUp' || code === 'KeyW') this.ui.pauseIdx = (this.ui.pauseIdx + it.length - 1) % it.length; else if (code === 'ArrowDown' || code === 'KeyS') this.ui.pauseIdx = (this.ui.pauseIdx + 1) % it.length; else if (code === 'Enter' || code === 'Space') { sfx('ok'); it[this.ui.pauseIdx][1](); return; } this.ui.refreshPause(); }
  resultNav(code) { const b = this.ui.resultBtns; if (!b || !b.length) return; if (code === 'ArrowUp' || code === 'KeyW' || code === 'ArrowLeft' || code === 'KeyA') this.ui.resultIdx = (this.ui.resultIdx + b.length - 1) % b.length; else if (code === 'ArrowDown' || code === 'KeyS' || code === 'ArrowRight' || code === 'KeyD') this.ui.resultIdx = (this.ui.resultIdx + 1) % b.length; else if (code === 'Enter' || code === 'Space') { sfx('ok'); b[this.ui.resultIdx][1](); return; } this.ui.refreshResult(); }

  /* ---------------- select screen ---------------- */
  openSelect(mode) {
    initAudio(); this.mode = mode; this.sel = { step: 0, idx: 0, p1: null, p2: null }; this.screen = 'select'; this.camMode = 'select'; this.gfx.cam.setMode('select');
    this.F.forEach(f => f.rig.root.visible = false); this.ui.setHud(false); this.hideAll(); this.ui.showSelect(); this.previewSel();
  }
  previewSel() {
    const ids = Object.keys(ROSTER), id = ids[this.sel.idx]; if (this.previewFighter) this.previewFighter.rig.root.visible = false;
    this.pruneCache(['hero:' + id]); const f = this.previewFighter = this.getHero(id); f.reset(0, 0); f.face.set(1, 0, 0); f.rig.root.visible = true; f.mood = 'idle';
    if (this.sel.step === 1) f.face.set(-1, 0, 0);
    this.gfx.cam.focus = f; this.ui.refreshSelect(id);
  }
  selectNav(code) {
    const ids = Object.keys(ROSTER), n = ids.length;
    const cols = 10, mv = (d) => { this.sel.idx = (this.sel.idx + d + n * 4) % n; sfx('ui'); this.previewSel(); };
    if (code === 'ArrowLeft' || code === 'KeyA') mv(-1);
    else if (code === 'ArrowRight' || code === 'KeyD') mv(1);
    else if (code === 'ArrowUp' || code === 'KeyW') mv(-cols);
    else if (code === 'ArrowDown' || code === 'KeyS') mv(cols);
    else if (code === 'Enter' || code === 'Space') this.confirmSel();
    else if (code === 'Escape') { if (this.sel.step === 1) { this.sel.step = 0; this.previewSel(); } else { this.previewFighter && (this.previewFighter.rig.root.visible = false); this.toMenu(); } }
  }
  confirmSel() {
    const ids = Object.keys(ROSTER), id = ids[this.sel.idx]; sfx('ok');
    if (this.sel.step === 0) {
      this.sel.p1 = id;
      if (this.mode === 'arcade') { this.previewFighter.rig.root.visible = false; this.startTour(id); return; }
      if (this.mode === 'training') { this.previewFighter.rig.root.visible = false; this.startMatch({ mode: 'training', p1: id, p2: ids.find(k => k !== id) }); return; }
      this.sel.step = 1; this.sel.idx = (ids.indexOf(id) + 1) % ids.length; this.previewSel();
    } else {
      if (id === this.sel.p1 && ids.length > 1) { sfx('block'); return; }
      this.sel.p2 = id; this.previewFighter.rig.root.visible = false; this.startMatch({ mode: 'versus', p1: this.sel.p1, p2: id });
    }
  }
  show(s) { this.screen = s; this.ui.show(s); if (s === 'menu') { this.camMode = 'menu'; this.gfx.cam.setMode('menu'); } }
  hideAll() { this.ui.hideAll(); }
  saveSettings() { try { localStorage.setItem('sc3d_settings', JSON.stringify(this.settings)); } catch (e) {} setVolume(this.settings.sfx, this.settings.music); }

  /* ================= UI (DOM) ================= */
  buildUI() {
    const root = $('#ui'), G = this, ui = this.ui;
    root.innerHTML = `
    <div id="menu" class="screen">
      <div class="logo"><span>STREET</span><b>CLASH</b><i>3D</i></div>
      <div class="tag">ORIGINAL 3D FIGHTING — PHASE 2 BUILD</div>
      <ul id="menuList"></ul><div class="hint">↑ ↓ select &nbsp; ENTER confirm</div>
    </div>
    <div id="select" class="screen"><div class="selTop"><h2 id="selTitle">SELECT FIGHTER</h2></div>
      <div class="selSide"><div id="selList"></div><div id="selInfo"></div><div class="hint">← → choose &nbsp; ENTER confirm &nbsp; ESC back</div></div></div>
    <div id="viewer" class="screen"></div>
    <div id="settings" class="screen"><h2>SETTINGS</h2><div id="setBody"></div><div class="hint">ESC back</div></div>
    <div id="hud"><div class="hbar left"><div class="nm"><b id="n0"></b><i id="t0"></i></div><div class="bar"><div class="trail" id="tr0"></div><div class="fill" id="f0"></div></div><div class="pips" id="p0"></div></div>
      <div class="clock"><span id="clock">60</span><small id="rnd">ROUND 1</small></div>
      <div class="hbar right"><div class="nm"><b id="n1"></b><i id="t1"></i></div><div class="bar"><div class="trail" id="tr1"></div><div class="fill" id="f1"></div></div><div class="pips" id="p1"></div></div>
      <div id="combo0" class="combo"></div><div id="combo1" class="combo r"></div><div id="train"></div></div>
    <div id="banner"></div><div id="intro"></div><div id="result"></div><div id="pause"></div><div id="loading"><div class="ld"><b>STREET CLASH</b><div class="lbar"><i id="lbar"></i></div><small id="ltxt">Loading…</small></div></div>`;
    ui.menuIdx = 0; ui.pauseIdx = 0; ui.resultIdx = 0;
    const tourSaved = () => G.loadTour();
    const build = () => {
      const items = [];
      const t = tourSaved(); if (t) items.push({ label: 'CONTINUE TOURNAMENT', sub: ROSTER[t.p1].name + ' — fight ' + (t.step + 1) + '/' + t.queue.length, fn: () => { G.tour = t; G.hideAll(); G.nextTourFight(); } });
      items.push({ label: 'ARCADE / TOURNAMENT', sub: 'Fight your way to the championship', fn: () => G.openSelect('arcade') });
      items.push({ label: '2 PLAYER VERSUS', sub: 'Local multiplayer — keyboard or gamepads', fn: () => G.openSelect('versus') });
      items.push({ label: 'TRAINING', sub: 'Practice combos against a dummy', fn: () => G.openSelect('training') });
      items.push({ label: 'CHARACTER VIEWER', sub: 'KAI — 360° turnaround, expressions, animations, GLB export', fn: () => G.openViewer('kai') });
      items.push({ label: 'SETTINGS', sub: 'Graphics, audio, controls', fn: () => { G.show('settings'); ui.buildSettings(); } });
      items.push({ label: 'EXIT', sub: '', fn: () => { try { window.close(); } catch (e) {} location.reload(); } });
      ui.menuItems = items; if (ui.menuIdx >= items.length) ui.menuIdx = 0;
      $('#menuList').innerHTML = items.map((m, i) => `<li data-i="${i}"><span>${m.label}</span><small>${m.sub}</small></li>`).join('');
      $$('#menuList li').forEach(li => { li.onmouseenter = () => { ui.menuIdx = +li.dataset.i; ui.refreshMenu(); }; li.onclick = () => { initAudio(); sfx('ok'); ui.menuItems[+li.dataset.i].fn(); }; });
      ui.refreshMenu();
    };
    const $$ = (s) => [...document.querySelectorAll(s)];
    ui.refreshMenu = () => $$('#menuList li').forEach((li, i) => li.classList.toggle('on', i === ui.menuIdx));
    ui.show = (s) => { for (const e of $$('.screen')) e.classList.toggle('show', e.id === s); if (s === 'menu') build(); };
    ui.hideAll = () => { for (const e of $$('.screen')) e.classList.remove('show'); $('#result').classList.remove('show'); $('#pause').classList.remove('show'); $('#intro').classList.remove('show'); };
    ui.setHud = (v) => $('#hud').classList.toggle('show', v);
    // ----- select
    ui.showSelect = () => { for (const e of $$('.screen')) e.classList.toggle('show', e.id === 'select');
      const ids = Object.keys(ROSTER); $('#selList').innerHTML = ids.map((id, i) => { const R = ROSTER[id]; return `<div class="card" data-i="${i}" style="--c:${R.color}">${PORTRAITS[id] ? `<img src="${PORTRAITS[id]}" alt="${R.name}">` : `<span class="ph">${R.name[0]}</span>`}<b>${R.name}</b></div>`; }).join('');
      $$('#selList .card').forEach(c => { c.onclick = () => { const i = +c.dataset.i; if (i === G.sel.last) G.confirmSel(); G.sel.last = i; G.sel.idx = i; G.previewSel(); sfx('ui'); }; }); };
    ui.refreshSelect = (id) => { const s = ROSTER[id], st = s.stats, step = G.sel.step;
      $('#selTitle').innerHTML = (G.mode === 'versus' ? `PLAYER ${step + 1} — ` : G.mode === 'training' ? 'TRAINING — ' : 'ARCADE — ') + 'SELECT FIGHTER';
      $$('#selList .card').forEach((c, i) => c.classList.toggle('on', i === G.sel.idx));
      const bar = (l, v, m) => `<div class="st"><span>${l}</span><div><i style="width:${Math.min(100, v / m * 100)}%;background:${s.color}"></i></div></div>`;
      $('#selInfo').style.setProperty('--c', s.color);
      $('#selInfo').innerHTML = `<h3>${s.name}</h3><h4>${s.title}</h4><p class="style">${s.style}</p>${bar('SPEED', st.speed, 1.3)}${bar('POWER', st.power, 1.3)}${bar('REACH', st.reach, 1.3)}${bar('DEFENSE', st.defense, 1.3)}<p class="mv">Special: ↓→ + Heavy Punch / Heavy Kick</p>`; };
    // ----- HUD
    const maxOf = f => f.stats.hp;
    ui.updateHud = (init) => {
      const [a, b] = G.F; if (!a) return;
      [[a, 0], [b, 1]].forEach(([f, i]) => { $('#f' + i).style.width = Math.max(0, f.hp / maxOf(f) * 100) + '%'; $('#tr' + i).style.width = Math.max(0, f.shownHp / maxOf(f) * 100) + '%'; if (init) { $('#n' + i).textContent = (G.mode === 'versus' ? 'P' + (i + 1) + ' ' : '') + f.spec.name; $('#t' + i).textContent = f.spec.title; $('#hud').style.setProperty('--c' + i, f.spec.color); }
        $('#p' + i).innerHTML = [0, 1].map(k => `<u class="${k < f.wins ? 'on' : ''}"></u>`).join(''); });
      $('#clock').textContent = G.training ? '∞' : Math.max(0, G.timer); $('#rnd').textContent = G.training ? 'TRAINING' : 'ROUND ' + G.round;
      $('#train').innerHTML = G.training ? `<div>Last combo: <b>${Math.round(G.lastCombo || 0)}</b> dmg • ${G.lastHits || 0} hits</div><div class="hint">F/G punch • V/B kick • ↓+G uppercut • ↓+V sweep • ↓→+G / ↓→+B special • W/E sidestep • Shift block</div>` : '';
    };
    const comboT = [0, 0];
    ui.combo = (att, def) => { const i = att.idx, e = $('#combo' + i); const n = def.comboHits; G.lastCombo = def.comboDmg; G.lastHits = n; if (n >= 2) { e.innerHTML = `<b>${n}</b> HITS<small>${Math.round(def.comboDmg)} DMG</small>`; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop', 'on'); clearTimeout(comboT[i]); comboT[i] = setTimeout(() => e.classList.remove('on'), 1600); } };
    let bt = 0;
    ui.banner = (txt, cls) => { const e = $('#banner'); e.className = ''; e.innerHTML = `<span class="${cls}">${txt}</span>`; void e.offsetWidth; e.classList.add('show'); clearTimeout(bt); bt = setTimeout(() => e.classList.remove('show'), cls === 'win' ? 3000 : 1500); };
    ui.intro = (s1, s2, mode, tour) => { const e = $('#intro'); const step = tour ? `FIGHT ${tour.step + 1} / ${tour.queue.length}` : mode === 'versus' ? 'LOCAL VERSUS' : 'TRAINING';
      e.innerHTML = `<div class="vsStrip"><div class="side l" style="--c:${s1.color}"><small>${s1.style}</small><b>${s1.name}</b><i>${s1.title}</i></div><div class="vs">VS</div><div class="side r" style="--c:${s2.color}"><small>${s2.style}</small><b>${s2.name}</b><i>${s2.title}</i></div></div><div class="stepTxt">${step}<small style="display:block;font-size:.55em;color:#9fb1ff;letter-spacing:.4em">${ARENA_NAMES[G.arenaName] || ''}</small></div>`; e.classList.add('show'); };
    ui.hideIntro = () => $('#intro').classList.remove('show');
    ui.pause = (on) => { const e = $('#pause'); if (!on) { e.classList.remove('show'); return; } ui.pauseIdx = 0;
      ui.pauseItems = [['RESUME', () => G.togglePause()], ['RESTART MATCH', () => { G.togglePause(); G.startMatch(G.opts); }], ['MOVE LIST', () => { G.ui.moveList(); }], ['QUIT TO MENU', () => { G.togglePause(); G.toMenu(); }]];
      e.innerHTML = `<div class="pbox"><h2>PAUSED</h2><ul>${ui.pauseItems.map((p, i) => `<li data-i="${i}">${p[0]}</li>`).join('')}</ul><div id="mlist"></div></div>`; e.classList.add('show'); ui.refreshPause();
      $$('#pause li').forEach(li => li.onclick = () => ui.pauseItems[+li.dataset.i][1]()); };
    ui.refreshPause = () => $$('#pause li').forEach((li, i) => li.classList.toggle('on', i === ui.pauseIdx));
    ui.moveList = () => { const s = G.F[0].spec, sp = s.specials; $('#mlist').innerHTML = `<div class="ml"><b>${s.name} — controls</b><p>Jab: <kbd>F</kbd> • Cross: <kbd>G</kbd> • Front kick: <kbd>V</kbd> • Roundhouse: <kbd>B</kbd></p><p>Strings: F,G (jab→cross) • V,B (kick→roundhouse)</p><p>↓+G uppercut (launcher) • ↓+V low sweep</p><p>↓→+G <b>${movesName(sp.df_hp)}</b> • ↓→+B <b>${movesName(sp.df_hk)}</b></p><p>Hold Shift = block (hold ↓ too for low) • W/E sidestep • double-tap ←/→ dash</p></div>`; };
    ui.result = ({ title, sub, winner, buttons, defeat, auto, autoFn }) => { const e = $('#result'); $('#banner').classList.remove('show'); ui.resultBtns = buttons; ui.resultIdx = 0; e.className = defeat ? 'defeat' : '';
      e.innerHTML = `<div class="rbox" style="--c:${winner.color}"><small>${G.mode === 'arcade' ? 'TOURNAMENT' : 'MATCH RESULT'}</small><h1>${title}</h1><h3>${sub}</h3><div class="rbtn">${buttons.map((b, i) => `<button data-i="${i}">${b[0]}</button>`).join('')}</div></div>`;
      setTimeout(() => e.classList.add('show'), 1200); $$('#result button').forEach(b => b.onclick = () => ui.resultBtns[+b.dataset.i][1]()); ui.refreshResult();
      clearTimeout(ui.autoT); if (auto) ui.autoT = setTimeout(() => { if (G.phase === 'match' && G.screen === 'game') autoFn(); }, auto + 1200); };
    ui.refreshResult = () => $$('#result button').forEach((b, i) => b.classList.toggle('on', i === ui.resultIdx));
    ui.champion = (spec, tour) => { const e = $('#result'); $('#banner').classList.remove('show'); ui.resultBtns = [['MAIN MENU', () => G.toMenu()]]; ui.resultIdx = 0; e.className = 'champ';
      e.innerHTML = `<div class="rbox" style="--c:${spec.color}"><small>TOURNAMENT COMPLETE</small><h1>CHAMPION</h1><h3>${spec.name} — ${spec.title}</h3><p>You defeated all ${tour.queue.length} opponent${tour.queue.length > 1 ? 's' : ''}.</p><div class="rbtn"><button class="on" data-i="0">MAIN MENU</button></div></div>`;
      setTimeout(() => e.classList.add('show'), 1400); $$('#result button').forEach(b => b.onclick = () => G.toMenu()); sfx('win'); };
    // ----- settings
    ui.buildSettings = () => {
      const s = G.settings, kb = getBindings(), mk = (p) => Object.keys(ACTION_LABEL).map(a => `<div class="krow"><span>${ACTION_LABEL[a]}</span><button class="kb" data-p="${p}" data-a="${a}">${kb[p][a].map(keyName).join(' / ')}</button></div>`).join('');
      $('#setBody').innerHTML = `<div class="cols"><div><h3>GRAPHICS &amp; AUDIO</h3>
        <label>Quality <select id="sq">${['low', 'medium', 'high'].map(q => `<option ${s.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label><small>(applies after reload)</small>
        <label>Arena <select id="sa">${[['auto', 'Auto'], ['rooftop', 'Neon Rooftop'], ['dojo', 'Tournament Dojo'], ['bunker', 'Underground Pit']].map(q => `<option value="${q[0]}" ${s.arena === q[0] ? 'selected' : ''}>${q[1]}</option>`).join('')}</select></label>
        <label>AI difficulty <select id="sd">${LEVELS.map(q => `<option ${s.difficulty === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>
        <label>Rounds to win <select id="sr">${[1, 2, 3].map(q => `<option ${s.rounds === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>
        <label>Round time <select id="st">${[30, 60, 99].map(q => `<option ${s.timer === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>
        <label>SFX <input id="sv" type="range" min="0" max="1" step=".05" value="${s.sfx}"></label><label>Music <input id="mv" type="range" min="0" max="1" step=".05" value="${s.music}"></label>
        <button id="rst" class="btn">Reset controls</button></div>
        <div><h3>PLAYER 1 CONTROLS</h3>${mk(0)}</div><div><h3>PLAYER 2 CONTROLS</h3>${mk(1)}</div></div><p class="hint">Click a control, then press the new key. Gamepads: stick/D-pad move • X,Y punches • A,B kicks • LB block • RB jump.</p>`;
      const sv = () => { s.arena = $('#sa').value; s.quality = $('#sq').value; s.difficulty = $('#sd').value; s.rounds = +$('#sr').value; s.timer = +$('#st').value; s.sfx = +$('#sv').value; s.music = +$('#mv').value; G.saveSettings(); };
      ['#sa', '#sq', '#sd', '#sr', '#st', '#sv', '#mv'].forEach(i => $(i).oninput = sv); $('#rst').onclick = () => { resetBindings(); ui.buildSettings(); };
      $$('.kb').forEach(b => b.onclick = () => { b.textContent = 'press a key…'; G.remapping = (code) => { if (code === 'Escape') { G.remapping = null; ui.buildSettings(); return; } setBinding(+b.dataset.p, b.dataset.a, code); G.remapping = null; ui.buildSettings(); }; });
    };
    function movesName(k) { return (MOVES[k] && MOVES[k].name) || k; }
    const ANIMS = [['stand', 'Standing (turnaround)'], ['idle', 'Fighting stance'], ['walkF', 'Walk forward'], ['walkB', 'Walk back'], ['dodge', 'Sidestep / dodge'], ['jab', 'Light punch'], ['cross', 'Heavy punch'], ['lkick', 'Front kick'], ['hkick', 'Heavy kick'], ['upper', 'Uppercut'], ['sweep', 'Low sweep'], ['special1', 'Special 1'], ['special2', 'Special 2'], ['block', 'Block'], ['crouchBlock', 'Crouch block'], ['hit', 'Hit reactions'], ['jump', 'Jump + kick'], ['knockdown', 'Knockdown + get-up'], ['victory', 'Victory'], ['defeat', 'Defeat']];
    const VIEWS = [['front', 'Front'], ['left', 'Left'], ['back', 'Back'], ['right', 'Right'], ['three', '3/4'], ['face', 'Face'], ['closeup', 'Close-up'], ['spin', 'Turntable']];
    const EXPRS = [['auto', 'Auto'], ['neutral', 'Neutral'], ['angry', 'Angry'], ['shouting', 'Shouting'], ['focused', 'Focused'], ['smirk', 'Smirk'], ['serious', 'Serious'], ['pain', 'Pain']];
    ui.showViewer = (id) => { for (const e of $$('.screen')) e.classList.toggle('show', e.id === 'viewer'); const s = ROSTER[id];
      $('#viewer').innerHTML = `<div class="vp"><h2>${s.name}</h2><small>${s.title} — ${s.style}</small>
        <div class="vinfo"><span>AGE <b>${s.age || '—'}</b></span><span>HEIGHT <b>${s.height_cm || '—'} cm</b></span><span>WEIGHT <b>${s.weight_kg || '—'} kg</b></span><span>COUNTRY <b>${s.country || '—'}</b></span></div>
        <h4>VIEWS</h4><div class="vb" id="vViews">${VIEWS.map(v => `<button data-v="${v[0]}">${v[1]}</button>`).join('')}</div>
        <h4>FACIAL EXPRESSIONS</h4><div class="vb" id="vExpr">${EXPRS.map(v => `<button data-e="${v[0]}">${v[1]}</button>`).join('')}</div>
        <h4>ANIMATIONS</h4><div class="vb" id="vAnim">${ANIMS.map(v => `<button data-a="${v[0]}">${v[1]}</button>`).join('')}</div>
        <div class="vb"><button id="vGlb" class="hot">EXPORT GLB</button><button id="vBack">BACK</button></div><p class="hint2">Drag = rotate · Wheel = zoom</p></div>`;
      $$('#vViews button').forEach(b => b.onclick = () => G.viewerView(b.dataset.v)); $$('#vExpr button').forEach(b => b.onclick = () => G.viewerExpr(b.dataset.e)); $$('#vAnim button').forEach(b => b.onclick = () => G.viewerPlay(b.dataset.a));
      $('#vGlb').onclick = () => G.downloadGLB(); $('#vBack').onclick = () => G.closeViewer(); ui.markViewer(); };
    ui.markViewer = () => { const v = G.v; if (!v) return; $$('#vAnim button').forEach(b => b.classList.toggle('on', b.dataset.a === v.anim)); $$('#vExpr button').forEach(b => b.classList.toggle('on', (b.dataset.e === 'auto' && !v.expr) || b.dataset.e === v.expr)); };
    ui.loading = (p, t) => { $('#lbar').style.width = p * 100 + '%'; if (t) $('#ltxt').textContent = t; $('#loading').classList.toggle('hide', p >= 1); };
  }
}

/* ---------------- touch controls (Android / tablets) ---------------- */
export function initTouch(game) {
  if (!matchMedia('(pointer:coarse)').matches) return;
  const wrap = document.createElement('div'); wrap.id = 'touch'; document.body.appendChild(wrap);
  const mk = (p, label, act, css) => { const b = document.createElement('div'); b.className = 'tb p' + p; b.textContent = label; b.style.cssText = css;
    const on = e => { e.preventDefault(); touchState[p][act] = 1; b.classList.add('on'); }, off = e => { e.preventDefault(); touchState[p][act] = 0; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); wrap.appendChild(b); };
  // Player 1 (bottom): d-pad left, buttons right
  const P1 = [['◀', 'left', 'left:2vw;bottom:14vh'], ['▶', 'right', 'left:15vw;bottom:14vh'], ['▼', 'crouch', 'left:8.5vw;bottom:3vh'], ['▲', 'sideUp', 'left:8.5vw;bottom:26vh'],
    ['P', 'lp', 'right:20vw;bottom:22vh'], ['P+', 'hp', 'right:9vw;bottom:26vh'], ['K', 'lk', 'right:20vw;bottom:6vh'], ['K+', 'hk', 'right:9vw;bottom:10vh'], ['BLK', 'block', 'right:1vw;bottom:20vh'], ['JMP', 'jump', 'right:1vw;bottom:36vh'], ['RUN', 'run', 'left:28vw;bottom:14vh']];
  for (const [l, a, c] of P1) mk(0, l, a, c);
  const P2 = [['◀', 'left', 'left:2vw;top:12vh'], ['▶', 'right', 'left:11vw;top:12vh'], ['▼', 'crouch', 'left:2vw;top:24vh'], ['BLK', 'block', 'left:11vw;top:24vh'],
    ['P', 'lp', 'right:2vw;top:12vh'], ['P+', 'hp', 'right:11vw;top:12vh'], ['K', 'lk', 'right:2vw;top:24vh'], ['K+', 'hk', 'right:11vw;top:24vh'], ['JMP', 'jump', 'right:20vw;top:18vh'], ['RUN', 'run', 'left:20vw;top:18vh']];
  for (const [l, a, c] of P2) mk(1, l, a, c);
  const upd = () => { const g = game.screen === 'game' && !game.paused && game.phase !== 'match'; wrap.classList.toggle('show', g); wrap.classList.toggle('vs', game.mode === 'versus'); requestAnimationFrame(upd); }; upd();
}

/* drag / wheel for the character viewer */
export function initViewerControls(game, canvas) {
  let drag = false, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', e => { if (game.screen === 'viewer' && e.target === canvas) { drag = true; lx = e.clientX; ly = e.clientY; } });
  addEventListener('pointerup', () => { drag = false; });
  addEventListener('pointermove', e => { if (!drag || game.screen !== 'viewer') return; const V = game.v.view; V.az -= (e.clientX - lx) * .008; V.el = Math.max(-.3, Math.min(1.1, V.el + (e.clientY - ly) * .005)); lx = e.clientX; ly = e.clientY; game.v.spin = false; });
  canvas.addEventListener('wheel', e => { if (game.screen !== 'viewer') return; e.preventDefault(); const V = game.v.view; V.dist = Math.max(.7, Math.min(9, V.dist * (1 + Math.sign(e.deltaY) * .08))); }, { passive: false });
}
