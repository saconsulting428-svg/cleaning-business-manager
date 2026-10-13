/* The playable world: player movement and collision, interaction, inventory, doors/locks/generator/valve/vents/lockers, sonar pulse, radio lure, noise, creatures, objectives.
   Pure logic (no DOM, no Three): the renderer and the UI read its state and its event queue; tests drive it directly. Units: tiles (1 tile = 2 m in the renderer). */
import { rng32, clamp, angDiff, TAU } from './rng.js';
import { T, generate } from './gen.js';
import { makeCreature, updateCreature, emitNoise, KINDS, lineOfSight } from './ai.js';

export const DT = 1 / 30;
export const SPEED = { walk: 1.55, sprint: 2.7, crouch: 0.8 };
const PR = 0.3;                                                    // player radius in tiles
const TALL = { crate: 1, shelf: 1, pod: 1, barrel: 1 };

export class World {
  constructor(gen, opts) {
    opts = opts || {}; this.gen = gen; this.lights = gen.lights; this.spec = gen.spec; this.W = gen.W; this.H = gen.H; this.cells = gen.cells; this.rooms = gen.rooms; this.rnd = rng32(gen.seed * 3 + 1);
    this.god = !!opts.god; this.time = 0; this.events = []; this.noiseLevel = 0; this.huntCount = 0; this.over = null; this.threat = 0; this.pulseState = null; this.radioLures = [];
    this.solid = new Set(gen.blocked); this.tall = new Set(); this.doorAt = new Map(); this.objById = new Map(); this.doors = [];
    this.objs = gen.objs.map(o => Object.assign({}, o)); for (const o of this.objs) { this.objById.set(o.id, o); if (o.type === 'prop' && TALL[o.kind]) this.tall.add(o.y * this.W + o.x); }
    for (const o of this.objs) if (o.type === 'door') { o.open = 0; o.want = 0; o.locked = !!o.lock; o.revealed = !o.hidden; o.codeOk = false; this.doorAt.set(o.y * this.W + o.x, o); this.doors.push(o); this.solid.add(o.y * this.W + o.x); }
    for (const o of this.objs) { o.taken = false; o.on = false; o.done = false; o.pingT = 0; if (o.type === 'item') o.bob = this.rnd() * 6; }
    this.gens = this.objs.filter(o => o.type === 'generator');
    const s = gen.start; this.player = { x: s.x, y: s.y, yaw: s.yaw, pitch: 0, vx: 0, vy: 0, crouch: false, sprint: false, moving: false, stamina: 1, tired: false, hidden: -1, vent: null, alive: true, flash: true, inv: { key: 0, card: 0, fuse: 0, radio: 0 }, pulses: this.spec.pulses, stepDist: 0, speed: 0, eye: 1.62, hideT: 0, noteSeen: null };
    this.pulseRegen = 0; this.stats = { steps: 0, pulses: 0, hunts: 0 };
    this.creatures = gen.creatures.map((c, i) => makeCreature(this, c, i));
    this.steps = this.buildObjective(); this.refreshLocks();
    this.prompt = null; this.lastDenied = -9; this.keypad = null;
  }
  /* ---------- helpers ---------- */
  tileAt(x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.W || y >= this.H) return T.WALL; return this.cells[y * this.W + x]; }
  solidForPlayer(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return true; const i = ty * this.W + tx; if (this.cells[i] === T.WALL) return true;
    const d = this.doorAt.get(i); if (d) return d.open < 0.7 || (d.hidden && !d.revealed); return this.solid.has(i);
  }
  pickRoamRoom(c) {
    const cand = this.rooms.filter(r => r.idx >= 0 && this.reachableForCreature(r)); const far = cand.filter(r => Math.hypot(r.cx - c.x, r.cy - c.y) > 7);
    const list = far.length ? far : cand; return list[Math.floor(this.rnd() * list.length)] || this.rooms[0];
  }
  reachableForCreature(r) { const gateIdx = this.gen.gateEdge.filter((e, k) => this.gateOpen(k)).length; let zone = 0; for (let k = 0; k < this.gen.gateEdge.length; k++) if (this.gen.gateEdge[k] < r.idx) zone++; return zone <= gateIdx; }
  gateOpen(k) { const d = this.objs.find(o => o.type === 'door' && o.gate === k); return !d.locked; }
  nearestLocker(x, y, maxD) { let b = null, bd = maxD; for (const o of this.objs) if (o.type === 'locker') { const d = Math.hypot(o.x + 0.5 - x, o.y + 0.5 - y); if (d < bd) { bd = d; b = o; } } return b; }
  /* ---------- locks ---------- */
  refreshLocks() {
    for (const d of this.doors) {
      if (!d.lock) { d.locked = false; continue; }
      let ok = false;
      if (d.lock === 'key' || d.lock === 'card') ok = !!d.unlockedByItem;
      else if (d.lock === 'code') ok = d.codeOk; else if (d.lock === 'valve') ok = !!d.valveOk; else if (d.lock === 'power') ok = this.gens.some(g => g.gate === d.gate && g.on);
      else if (d.lock === 'secret') ok = d.revealed;
      d.locked = !ok;
    }
  }
  openDoor(d, open, by) {
    if (open && d.locked) return false; d.want = open ? 1 : 0; if (open && d.open < 0.2) { this.events.push({ type: 'door', x: d.x + 0.5, y: d.y + 0.5, by: by ? 'creature' : 'player' }); emitNoise(this, d.x + 0.5, d.y + 0.5, by ? 3 : 5, 'door'); }
    if (!open && d.open > 0.8) this.events.push({ type: 'door', x: d.x + 0.5, y: d.y + 0.5, by: by ? 'creature' : 'player' }); return true;
  }
  /* ---------- objective ---------- */
  buildObjective() {
    const st = [];
    for (const g of this.gen.gates) {
      if (g.type === 'key') st.push({ id: 'k' + g.k, text: 'Find the brass key', test: () => this.objs.some(o => o.type === 'item' && o.kind === 'key' && o.gate === g.k && o.taken) });
      else if (g.type === 'card') st.push({ id: 'c' + g.k, text: 'Find the keycard', test: () => this.objs.some(o => o.type === 'item' && o.kind === 'card' && o.gate === g.k && o.taken) });
      else if (g.type === 'code') st.push({ id: 'n' + g.k, text: 'Find the access code', test: () => this.objs.some(o => o.type === 'note' && o.gate === g.k && o.done) });
      else if (g.type === 'valve') st.push({ id: 'v' + g.k, text: 'Turn the bulkhead valve', test: () => this.objs.some(o => o.type === 'valve' && o.done) });
      else if (g.type === 'secret') st.push({ id: 's' + g.k, text: 'Find the hidden door (use a pulse)', test: () => this.objs.some(o => o.type === 'door' && o.gate === g.k && o.revealed) });
      else if (g.type === 'power') {
        const n = this.spec.fuses; st.push({ id: 'f' + g.k, text: n > 1 ? 'Find ' + n + ' fuses' : 'Find the fuse', test: () => this.objs.filter(o => o.type === 'item' && o.kind === 'fuse' && o.gate === g.k && o.taken).length >= n || this.gens.some(x => x.gate === g.k && x.on) });
        st.push({ id: 'g' + g.k, text: 'Start the generator', test: () => this.gens.some(x => x.gate === g.k && x.on) });
      }
    }
    st.push({ id: 'exit', text: 'Reach the exit', test: () => this.over === 'win' }); return st;
  }
  objective() { const cur = this.steps.find(s => !s.test()); return { current: cur ? cur.text : 'Reach the exit', steps: this.steps.map(s => ({ text: s.text, done: s.test() })) }; }
  /* ---------- player actions ---------- */
  facing() { return [Math.cos(this.player.yaw), Math.sin(this.player.yaw)]; }
  interactTarget() {
    const p = this.player; if (!p.alive || p.vent) return null; if (p.hidden >= 0) { const L = this.objById.get(p.hidden); return { obj: L, text: 'Leave locker', kind: 'unhide' }; }
    const f = this.facing(); let best = null, bd = 9;
    for (const o of this.objs) {
      if (o.type === 'prop' || (o.type === 'item' && o.taken)) continue; if (o.type === 'door' && o.hidden && !o.revealed) continue;
      const cx = o.x + 0.5, cy = o.y + 0.5, dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy), reach = o.type === 'door' ? 1.55 : 1.7; if (d > reach) continue;
      const dot = (dx * f[0] + dy * f[1]) / (d || 1); if (d > 0.9 && dot < 0.5) continue;
      const score = d - dot * 0.5; if (score < bd) { bd = score; best = o; }
    }
    if (!best) return null; return this.describe(best);
  }
  describe(o) {
    const p = this.player;
    switch (o.type) {
      case 'door': if (o.locked) { const need = o.lock === 'key' ? 'brass key' : o.lock === 'card' ? 'keycard' : o.lock === 'power' ? 'power' : o.lock === 'code' ? 'code' : o.lock === 'valve' ? 'bulkhead valve' : 'hidden'; return { obj: o, text: o.lock === 'code' ? 'Enter code' : (o.lock === 'key' || o.lock === 'card') && p.inv[o.lock] ? 'Unlock door' : 'Locked: needs ' + need, kind: 'door' }; } return { obj: o, text: o.want ? 'Close door' : 'Open door', kind: 'door' };
      case 'item': return { obj: o, text: 'Take ' + ({ key: 'brass key', card: 'keycard', fuse: 'fuse', radio: 'radio' }[o.kind]), kind: 'item' };
      case 'note': return { obj: o, text: 'Read note', kind: 'note' };
      case 'locker': return { obj: o, text: 'Hide', kind: 'locker' };
      case 'vent': return { obj: o, text: 'Crawl through vent', kind: 'vent' };
      case 'generator': return { obj: o, text: o.on ? 'Generator running' : p.inv.fuse >= o.need ? 'Insert fuses and start' : 'Generator: needs ' + o.need + (o.need > 1 ? ' fuses' : ' fuse') + ' (' + p.inv.fuse + ')', kind: 'generator' };
      case 'valve': return { obj: o, text: o.done ? 'Valve open' : 'Turn valve', kind: 'valve' };
      case 'exit': return { obj: o, text: 'Escape', kind: 'exit' };
    }
    return null;
  }
  interact() {
    const p = this.player; if (!p.alive || p.vent || this.over) return;
    const t = this.interactTarget(); if (!t) return; const o = t.obj;
    if (t.kind === 'unhide') return this.leaveLocker();
    switch (t.kind) {
      case 'door':
        if (o.locked) {
          if ((o.lock === 'key' || o.lock === 'card') && p.inv[o.lock] > 0) { p.inv[o.lock]--; o.unlockedByItem = true; this.refreshLocks(); this.events.push({ type: 'unlock', x: o.x + 0.5, y: o.y + 0.5 }); this.openDoor(o, true); }
          else if (o.lock === 'code') { this.keypad = o; this.events.push({ type: 'keypad', id: o.id }); }
          else if (this.time - this.lastDenied > 0.8) { this.lastDenied = this.time; this.events.push({ type: 'denied', text: t.text }); }
        } else this.openDoor(o, !o.want);
        break;
      case 'item': this.pickup(o); break;
      case 'note': o.done = true; p.noteSeen = o.code; this.events.push({ type: 'note', code: o.code }); break;
      case 'locker': this.enterLocker(o); break;
      case 'vent': this.enterVent(o); break;
      case 'generator': if (!o.on && p.inv.fuse >= o.need) { p.inv.fuse -= o.need; o.on = true; this.refreshLocks(); this.events.push({ type: 'generator', x: o.x + 0.5, y: o.y + 0.5 }); emitNoise(this, o.x + 0.5, o.y + 0.5, 16, 'generator'); o.nextNoise = 3; } else if (!o.on) this.events.push({ type: 'denied', text: t.text }); break;
      case 'valve': if (!o.done) { o.done = true; for (const d of this.doors) if (d.id === o.opens) { d.valveOk = true; } this.refreshLocks(); this.events.push({ type: 'valve', x: o.x + 0.5, y: o.y + 0.5 }); emitNoise(this, o.x + 0.5, o.y + 0.5, 9, 'valve'); } break;
      case 'exit': this.over = 'win'; this.events.push({ type: 'win' }); break;
    }
  }
  enterCode(doorId, code) { const d = this.objById.get(doorId); if (!d || !this.keypad) return false; if (String(code) === d.code) { d.codeOk = true; this.keypad = null; this.refreshLocks(); this.openDoor(d, true); this.events.push({ type: 'unlock', x: d.x + 0.5, y: d.y + 0.5 }); return true; } this.events.push({ type: 'denied', text: 'Wrong code' }); emitNoise(this, d.x + 0.5, d.y + 0.5, 4, 'keypad'); return false; }
  pickup(o) { o.taken = true; this.player.inv[o.kind]++; this.events.push({ type: 'pickup', kind: o.kind, x: o.x + 0.5, y: o.y + 0.5 }); }
  enterLocker(L) {
    const p = this.player; p.hidden = L.id; p.x = L.x + 0.5 - Math.cos(L.face) * 0.15; p.y = L.y + 0.5 - Math.sin(L.face) * 0.15; p.yaw = L.face; p.vx = p.vy = 0; p.hideT = 0; p.crouch = false;
    this.events.push({ type: 'hide', x: L.x + 0.5, y: L.y + 0.5 }); emitNoise(this, L.x + 0.5, L.y + 0.5, 2.2, 'locker');
    /* creatures that are hunting and can see the locker door remember where you went */
    for (const c of this.creatures) if (c.state === 'hunt' && Math.hypot(c.x - L.x, c.y - L.y) < 9 && lineOfSight(this, c.x, c.y, L.x + 0.5, L.y + 0.5)) c.knowsLocker = L.id;
  }
  leaveLocker() { const p = this.player, L = this.objById.get(p.hidden); if (!L) return; p.hidden = -1; p.x = L.x + 0.5 + Math.cos(L.face) * 0.62; p.y = L.y + 0.5 + Math.sin(L.face) * 0.62; this.events.push({ type: 'hide', x: p.x, y: p.y, out: true }); }
  enterVent(v) {
    const p = this.player, pr = this.objById.get(v.pair); if (!pr) return;
    p.vent = { t: 0, dur: 2.4, from: v, to: pr }; this.events.push({ type: 'vent', x: v.x + 0.5, y: v.y + 0.5 }); emitNoise(this, v.x + 0.5, v.y + 0.5, 3, 'vent');
  }
  pulse() {
    const p = this.player; if (!p.alive || p.vent || this.over || p.pulses <= 0 || p.hidden >= 0) return false; p.pulses--; this.stats.pulses++;
    this.pulseState = { x: p.x, y: p.y, t0: this.time }; this.events.push({ type: 'pulse', x: p.x, y: p.y });
    const R = 13; for (const c of this.creatures) if (Math.hypot(c.x - p.x, c.y - p.y) < R) c.revealT = 3.2;
    for (const o of this.objs) { if (Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) < R) { o.pingT = 4; if (o.type === 'door' && o.hidden && !o.revealed && Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) < 9) { o.revealed = true; this.refreshLocks(); this.events.push({ type: 'reveal', x: o.x + 0.5, y: o.y + 0.5 }); } } }
    emitNoise(this, p.x, p.y, 14, 'pulse'); return true;
  }
  useRadio() {
    const p = this.player; if (!p.alive || p.inv.radio <= 0 || p.vent || p.hidden >= 0) return false; p.inv.radio--; const f = this.facing();
    this.radioLures.push({ x: p.x + f[0] * 0.8, y: p.y + f[1] * 0.8, t: 1.2, n: 4, every: 2.2 }); this.events.push({ type: 'radio', x: p.x, y: p.y }); return true;
  }
  toggleFlash() { this.player.flash = !this.player.flash; this.events.push({ type: 'flash', on: this.player.flash }); }
  catchPlayer(c) { if (this.god || !this.player.alive) { if (this.god) { c.state = 'search'; c.searchT = 3; c.target = null; } return; } this.player.alive = false; this.over = 'dead'; this.caughtBy = c; this.events.push({ type: 'caught', id: c.id }); }
  /* ---------- the tick ---------- */
  update(dt, inp) {
    inp = inp || {}; const p = this.player; this.time += dt; this.noiseLevel = Math.max(0, this.noiseLevel - dt * 0.9);
    if (this.over && this.over !== 'win') { for (const c of this.creatures) c.moving = false; return; }
    if (this.over === 'win') return;
    if (p.alive) this.updatePlayer(dt, inp);
    for (const o of this.doors) { const sp = dt * 2.4; o.open = o.open < o.want ? Math.min(o.want, o.open + sp) : Math.max(o.want, o.open - sp); }
    for (const g of this.gens) if (g.on) { g.nextNoise -= dt; if (g.nextNoise <= 0) { g.nextNoise = 4; emitNoise(this, g.x + 0.5, g.y + 0.5, 15, 'generator'); } }
    for (let i = this.radioLures.length - 1; i >= 0; i--) { const r = this.radioLures[i]; r.t -= dt; if (r.t <= 0) { emitNoise(this, r.x, r.y, 17, 'radio'); this.events.push({ type: 'radioburst', x: r.x, y: r.y }); r.n--; r.t = r.every; if (r.n <= 0) this.radioLures.splice(i, 1); } }
    for (const o of this.objs) if (o.pingT > 0) o.pingT -= dt;
    if (p.alive && p.hidden < 0 && !p.vent) for (const o of this.objs) if (o.type === 'item' && !o.taken && Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) < 0.85) this.pickup(o);
    p.pulses = Math.min(this.spec.pulses, p.pulses);
    for (const c of this.creatures) updateCreature(this, c, dt);
    /* threat for the sound design: how close and how awake the nearest creature is */
    let th = 0; for (const c of this.creatures) { const d = Math.hypot(c.x - p.x, c.y - p.y), w = c.state === 'hunt' ? 1 : c.state === 'investigate' || c.state === 'suspicious' ? 0.6 : c.state === 'search' ? 0.45 : 0.25; th = Math.max(th, w * clamp(1 - d / 14, 0, 1)); } this.threat += (th - this.threat) * Math.min(1, dt * 2);
    this.prompt = this.interactTarget();
  }
  updatePlayer(dt, inp) {
    const p = this.player;
    if (inp.flash) this.toggleFlash(); if (inp.pulse) this.pulse(); if (inp.radio) this.useRadio(); if (inp.interact) this.interact();
    p.yaw += (inp.dyaw || 0); p.pitch = clamp(p.pitch + (inp.dpitch || 0), -1.25, 1.25);
    if (p.vent) { p.vent.t += dt; p.moving = false; if (p.vent.t >= p.vent.dur) { const v = p.vent.to; p.x = v.x + 0.5 + Math.cos(v.face) * 0.9; p.y = v.y + 0.5 + Math.sin(v.face) * 0.9; p.yaw = v.face; p.vent = null; this.events.push({ type: 'vent', x: p.x, y: p.y, out: true }); } return; }
    if (p.hidden >= 0) { p.hideT += dt; p.moving = false; p.yaw = angDiff(0, p.yaw); const L = this.objById.get(p.hidden); p.yaw = L.face + clamp(angDiff(L.face, p.yaw), -0.7, 0.7); if (inp.crouchPress) this.leaveLocker(); return; }
    if (inp.crouchPress) p.crouch = !p.crouch; if (inp.crouchSet !== undefined) p.crouch = !!inp.crouchSet;
    const fw = clamp(inp.fwd || 0, -1, 1), st = clamp(inp.str || 0, -1, 1), mag = Math.min(1, Math.hypot(fw, st)); p.moving = mag > 0.08;
    p.sprint = !!inp.sprint && !p.crouch && p.moving && !p.tired && fw > 0.3;
    if (p.sprint) { p.stamina -= dt * 0.28; if (p.stamina <= 0) { p.stamina = 0; p.tired = true; p.sprint = false; } } else { p.stamina = Math.min(1, p.stamina + dt * (p.moving ? 0.1 : 0.22)); if (p.tired && p.stamina > 0.35) p.tired = false; }
    const sp = p.crouch ? SPEED.crouch : p.sprint ? SPEED.sprint : SPEED.walk, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    const tvx = ((c * fw - s * st) * sp) * (mag ? 1 : 0), tvy = ((s * fw + c * st) * sp) * (mag ? 1 : 0), k = Math.min(1, dt * 10); p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k;
    if (!p.moving && Math.hypot(p.vx, p.vy) < 0.05) { p.vx = p.vy = 0; }
    const before = [p.x, p.y]; this.moveWithCollision(p.vx * dt, p.vy * dt); const moved = Math.hypot(p.x - before[0], p.y - before[1]); p.speed = moved / dt;
    /* footsteps are noise: the radius depends on how you move and what you walk on */
    p.stepDist += moved; const stride = p.sprint ? 0.9 : p.crouch ? 0.7 : 0.8;
    if (p.stepDist >= stride) {
      p.stepDist -= stride; const tile = this.tileAt(p.x, p.y); let r = p.sprint ? 9 : p.crouch ? 1.6 : 4.2; let kind = 'step';
      if (tile === T.GLASS) { r = p.crouch ? 4 : 11; kind = 'glass'; } else if (tile === T.WATER) { r = p.sprint ? 11 : p.crouch ? 2.2 : 6; kind = 'water'; }
      this.stats.steps++; this.events.push({ type: 'step', kind, crouch: p.crouch, sprint: p.sprint, x: p.x, y: p.y }); emitNoise(this, p.x, p.y, r, kind);
    }
  }
  moveWithCollision(dx, dy) {
    const p = this.player;
    const tryAxis = (nx, ny) => {
      const minx = Math.floor(nx - PR), maxx = Math.floor(nx + PR), miny = Math.floor(ny - PR), maxy = Math.floor(ny + PR);
      for (let ty = miny; ty <= maxy; ty++) for (let tx = minx; tx <= maxx; tx++) {
        if (!this.solidForPlayer(tx, ty)) continue;
        const cx = clamp(nx, tx, tx + 1), cy = clamp(ny, ty, ty + 1), ddx = nx - cx, ddy = ny - cy; if (ddx * ddx + ddy * ddy < PR * PR) {
          const d = this.doorAt.get(ty * this.W + tx); if (d && !d.locked && d.want === 0 && !(d.hidden && !d.revealed)) this.openDoor(d, true);      // walking into a door opens it
          else if (d && d.locked && this.time - this.lastDenied > 1.2 && !(d.hidden && !d.revealed)) { this.lastDenied = this.time; this.events.push({ type: 'denied', text: this.describe(d).text }); }
          return false;
        }
      }
      return true;
    };
    if (tryAxis(p.x + dx, p.y)) p.x += dx; else p.vx = 0; if (tryAxis(p.x, p.y + dy)) p.y += dy; else p.vy = 0;
  }
  /* ---------- queries for the renderer / HUD ---------- */
  noiseInfo() { const near = this.creatures.reduce((m, c) => Math.max(m, c.alert, c.state === 'hunt' ? 1 : 0), 0); return { noise: this.noiseLevel, alert: near, hunted: this.creatures.some(c => c.state === 'hunt') }; }
  drainEvents() { const e = this.events; this.events = []; return e; }
}
export function newWorld(spec, opts) { return new World(generate(spec), opts); }
