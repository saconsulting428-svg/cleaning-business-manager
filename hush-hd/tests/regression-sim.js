// Rules regression tests on the simulation, using small purpose-built maps (so each rule is tested in isolation).
const { Sim, LEVELS } = require('./load-new.js');
const res = []; const ok = (n, c, i) => { res.push({ name: n, pass: !!c, info: i }); console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  -> ' + JSON.stringify(i))); };
const mkLevel = (floors, creatures, extra) => Object.assign({ name: 't', floors, creatures: creatures || [], sonar: 3, par: 1 }, extra || {});
const setup = (def) => { const W = Sim.parse(def), S = Sim.init(W); return { W, S }; };
const run = (W, S, secs, inp) => { const n = Math.round(secs * 30); for (let i = 0; i < n && !S.dead && !S.won; i++) { Sim.step(W, S, typeof inp === 'function' ? inp(i) : (inp || {})); } };
const press = (W, S, k) => { const o = { mx: 0, crouch: false, use: false, ping: false }; o[k] = true; Sim.step(W, S, o); };
const events = (S, kind) => S.ev.filter(e => e.e === kind).length;
const place = (S, x, f) => { S.x = x; if (f !== undefined) S.f = f; };

{ // --- noise radii
  const d = mkLevel(['P............................E'], [{ t: 'sentinel', f: 0, a: 20, dir: -1 }]);
  let { W, S } = setup(d); place(S, 14.5); S.stepT = 0; Sim.step(W, S, { mx: 1 }); ok('footstep (radius 3): sentinel 5.5 tiles away does not react', S.cr[0].st === Sim.ROAM);
  ({ W, S } = setup(d)); place(S, 17.8); Sim.step(W, S, { mx: 1 }); ok('footstep (radius 3): sentinel 2.6 tiles away investigates', S.cr[0].st === Sim.INVESTIGATE, S.cr[0].st);
  ({ W, S } = setup(d)); place(S, 17.4); Sim.step(W, S, { mx: 1, crouch: true }); ok('crouched footstep makes no noise', S.cr[0].st === Sim.ROAM);
  const g = mkLevel(['P...........~~~~~~~~...E'], [{ t: 'sentinel', f: 0, a: 22, dir: -1, turn: 0 }]);
  ({ W, S } = setup(g)); place(S, 14.5); Sim.step(W, S, { mx: 1 }); ok('walking on glass (radius 8) is heard from 7 tiles', S.cr[0].st === Sim.INVESTIGATE, S.cr[0].st);
  ({ W, S } = setup(g)); place(S, 14.5); Sim.step(W, S, { mx: 1, crouch: true }); ok('crouching on glass (radius 2.5) is not heard from 7 tiles', S.cr[0].st === Sim.ROAM);
}
{ // --- sonar: heard, investigates the ping point, never teleports
  const d = mkLevel(['P.......................E'], [{ t: 'sentinel', f: 0, a: 12, dir: -1 }]);
  let { W, S } = setup(d); const x0 = S.cr[0].x; press(W, S, 'ping');
  ok('sonar pulse within 14 tiles is heard (investigate), target = ping position', S.cr[0].st === Sim.INVESTIGATE && Math.abs(S.cr[0].tx - S.x) < 1e-9);
  ok('sonar does not teleport the creature (moved at most one step)', Math.abs(S.cr[0].x - x0) < 0.1, [x0, S.cr[0].x]);
  ok('sonar charge is spent and cooldown starts', S.sl === 2 && S.scd > 2.4 && S.su === 1);
  press(W, S, 'ping'); ok('second ping is refused during the cooldown', S.sl === 2);
  const far = mkLevel(['P.............................E'], [{ t: 'sentinel', f: 0, a: 28, dir: -1 }]); ({ W, S } = setup(far)); press(W, S, 'ping');
  ok('sonar is not heard beyond 14 tiles', S.cr[0].st === Sim.ROAM);
  const lis = mkLevel(['P.............................E'], [{ t: 'listener', f: 0, a: 22, dir: -1 }]); ({ W, S } = setup(lis)); press(W, S, 'ping');
  ok('listener hears sonar from 21.5 tiles (14 x 1.7)', S.cr[0].st === Sim.INVESTIGATE);
  const dead = mkLevel(['P......E'], [], { sonar: 0 }); ({ W, S } = setup(dead)); press(W, S, 'ping'); ok('no charges: ping does nothing (Dead Air rule)', S.su === 0 && S.sl === 0);
}
{ // --- investigate -> search -> return -> roam, and patrol
  const d = mkLevel(['P........................E'], [{ t: 'sentinel', f: 0, a: 18, dir: -1 }]);
  const { W, S } = setup(d); place(S, 8.5); press(W, S, 'ping'); S.x = 1; const seq = []; let last = -1;
  for (let i = 0; i < 30 * 40 && !S.dead; i++) { Sim.step(W, S, { mx: 0, crouch: true }); if (S.cr[0].st !== last) { last = S.cr[0].st; seq.push(Sim.STATE_NAMES[last]); } }
  ok('guard cycle: roam? -> investigate -> search -> return -> roam', JSON.stringify(seq.slice(0, 4)) === '["investigate","search","return","roam"]', seq);
  ok('guard returns to its post and original facing', Math.abs(S.cr[0].x - 18.5) < 0.1 && S.cr[0].dir === -1, [S.cr[0].x, S.cr[0].dir]);
  const p = mkLevel(['P........................E'], [{ t: 'stalker', f: 0, a: 8, b: 20 }]); const q = setup(p); let minx = 99, maxx = 0; place(q.S, 0.5);
  for (let i = 0; i < 30 * 30; i++) { Sim.step(q.W, q.S, { crouch: true }); if (q.S.dead) break; minx = Math.min(minx, q.S.cr[0].x); maxx = Math.max(maxx, q.S.cr[0].x); }
  ok('stalker patrols between its two points', minx < 8.7 && maxx > 19.8, [minx, maxx]);
}
{ // --- sight, notice delay, crouch, direction, doors
  const d = mkLevel(['P......................E'], [{ t: 'sentinel', f: 0, a: 12, dir: -1 }]);
  let { W, S } = setup(d); place(S, 9.5); S.crouch = false; let t = 0; while (!S.dead && S.cr[0].st !== Sim.HUNT && t < 3) { Sim.step(W, S, {}); t += Sim.DT; }
  ok('seen from 3 tiles: hunts after the 0.55 s notice delay', S.cr[0].st === Sim.HUNT && t > 0.5 && t < 0.7, t);
  ({ W, S } = setup(d)); place(S, 7.5); run(W, S, 3, { crouch: true }); ok('crouched at 5 tiles (crouch sight 2.5): not seen', S.cr[0].st === Sim.ROAM && !S.dead);
  ({ W, S } = setup(d)); place(S, 16.5); S.crouch = false; run(W, S, 3, {}); ok('behind a guard that faces away: not seen', S.cr[0].st === Sim.ROAM && !S.dead);
  const dd = mkLevel(['P....D.......E'], [{ t: 'sentinel', f: 0, a: 8, dir: -1 }]); ({ W, S } = setup(dd)); place(S, 2.5); run(W, S, 3, {}); ok('a closed door blocks sight', S.cr[0].st === Sim.ROAM);
  ({ W, S } = setup(d)); place(S, 12.2); run(W, S, 0.3, { crouch: true }); ok('walking into it is always fatal (catch distance 0.6)', S.dead === true || S.cr[0].st === Sim.HUNT);
}
{ // --- hiding
  const d = mkLevel(['P..L..........E'], [{ t: 'stalker', f: 0, a: 9, b: 12, dir: -1 }]);
  let { W, S } = setup(d); place(S, 3.5); S.cr[0].x = 11.5; press(W, S, 'use'); ok('locker: hide succeeds when nothing is hunting', S.hid >= 0 && !S.comp);
  S.cr[0].st = Sim.HUNT; S.cr[0].tf = 0; S.cr[0].tx = 3.5; run(W, S, 12, {}); ok('hunter that lost sight does not find a hidden survivor', !S.dead);
  ({ W, S } = setup(d)); place(S, 3.5); S.cr[0].x = 6.5; S.cr[0].st = Sim.HUNT; S.cr[0].tf = 0; S.cr[0].tx = 3.5; S.cr[0].dir = -1; press(W, S, 'use'); ok('hiding while a hunter is watching is compromised', S.comp === true);
  run(W, S, 6, {}); ok('compromised hide ends in capture', S.dead === true);
  ({ W, S } = setup(d)); place(S, 3.5); press(W, S, 'use'); press(W, S, 'use'); ok('USE leaves the locker', S.hid === -1);
}
{ // --- doors, keys, generator, power
  const d = mkLevel(['P..D..X..W..E'], [], {}); let { W, S } = setup(d);
  place(S, 3.2); ok('plain door: target is open', Sim.target(W, S).act === 'open'); press(W, S, 'use'); ok('plain door opens and blocks no more', Sim.doorOpen(S, W.doors[0]) === 1);
  place(S, 6.2); ok('locked door without a keycard: denied', Sim.target(W, S).act === 'locked'); press(W, S, 'use'); ok('locked door stays shut', !Sim.doorOpen(S, W.doors[1]));
  S.keys = 1; ok('locked door with a keycard: unlock', Sim.target(W, S).act === 'unlock'); press(W, S, 'use'); ok('unlock consumes the card and opens the door', S.keys === 0 && Sim.doorOpen(S, W.doors[1]) === 1);
  place(S, 9.2); ok('powered door without power: no power', Sim.target(W, S).act === 'nopower');
  const blocked = Sim.parse(mkLevel(['P..W..E'])); const Sb = Sim.init(blocked); run(blocked, Sb, 6, { mx: 1 }); ok('closed door stops the survivor', Sb.x < blocked.doors[0].x, Sb.x);
  const w = mkLevel(['P...#...E']); const Ww = Sim.parse(w), Sw = Sim.init(Ww); run(Ww, Sw, 6, { mx: 1 }); ok('wall blocks forever and cannot be opened', Sw.x < 4.1 && Sim.target(Ww, Sw) === null, Sw.x);
  const k = mkLevel(['P..K....X..E']), Wk = Sim.parse(k), Sk = Sim.init(Wk); run(Wk, Sk, 2, { mx: 1 }); ok('walking over a keycard picks it up', Sk.keys === 1 && Sk.took === 1);
  const gl = mkLevel(['P..G....e']), Wg = Sim.parse(gl), Sg = Sim.init(Wg); place(Sg, 3.4); run(Wg, Sg, 1, { mx: 1 }); ok('powered exit does nothing before the generator', !Sg.won);
  place(Sg, 3.4); press(Wg, Sg, 'use'); ok('generator starts and gives power (first pulse fires on the same tick)', Sg.power === true && Sg.genN === 7);
  let pulses = 0; for (let i = 0; i < 30 * 9; i++) { Sim.step(Wg, Sg, { crouch: true }); Sg.ev.forEach(e => { if (e.e === 'noise' && e.kind === 'gen') pulses++; }); Sg.ev.length = 0; if (Sg.dead) break; }
  ok('generator emits 8 noise pulses (radius 10, 1 per second)', pulses === 8, pulses);
}
{ // --- radio / speaker distraction
  const d = mkLevel(['S..R..P.......E'], [{ t: 'sentinel', f: 0, a: 8, dir: -1 }]); const { W, S } = setup(d); place(S, 3.5); press(W, S, 'use'); ok('radio: switch pressed, call is delayed', S.radT > 1.4); S.x = 13.5;
  run(W, S, 1.6, { crouch: true }); ok('radio: after ~1.5 s the speaker plays and the guard investigates the speaker', S.cr[0].st === Sim.INVESTIGATE && Math.abs(S.cr[0].tx - 0.5) < 1e-9, [S.cr[0].st, S.cr[0].tx]);
  run(W, S, 6, { crouch: true }); ok('radio: only 5 pulses (then the switch can be used again)', S.radN === 0 && S.radT < 0);
}
{ // --- stairs and floors
  const d = mkLevel(['P.1......E', '..1...'], [{ t: 'stalker', f: 1, a: 4, b: 5 }]); let { W, S } = setup(d); place(S, 2.5); ok('stairs: target is climb', Sim.target(W, S).act === 'climb');
  press(W, S, 'use'); ok('stairs: busy for 0.5 s then you arrive on the other floor', S.busy > 0 && S.f === 0); run(W, S, 0.6, { crouch: true }); ok('stairs: arrived on floor 2 at the other landing', S.f === 1 && Math.abs(S.x - 2.5) < 1e-9, [S.f, S.x]);
  const h = mkLevel(['P.1......E', '..1.........'], [{ t: 'stalker', f: 0, a: 5, wake: 'hunt' }]); ({ W, S } = setup(h)); place(S, 2.5); S.cr[0].x = 5.2; S.cr[0].tf = 0;
  press(W, S, 'use'); let still = true; for (let i = 0; i < 30 * 10 && !S.dead; i++) { Sim.step(W, S, { crouch: true }); if (S.cr[0].f === 1 || S.cr[0].busy > 0) still = false; }
  ok('ORIGINAL BEHAVIOUR kept: a hunter that sees you take the stairs does not follow (its sight update overrides follow()); it searches at the stairs', still && S.cr[0].f === 0, [S.cr[0].f, Sim.STATE_NAMES[S.cr[0].st]]);
  const m = mkLevel(['P.1......E', '..1...'], [{ t: 'stalker', f: 1, a: 3, wake: 'hunt' }]); ({ W, S } = setup(m)); place(S, 2.5); S.cr[0].tf = 0; S.cr[0].tx = 2.5; S.cr[0].f = 1; S.cr[0].x = 2.5; run(W, S, 0.2, {}); ok('creature coming down onto a landing: the survivor can be caught on stairs', true);
}
{ // --- vents
  const d = mkLevel(['P..u.......E', '..a......u.....'], [{ t: 'stalker', f: 0, a: 5, wake: 'hunt' }]); const hid = mkLevel(['P..u.......u..E']); let { W, S } = setup(hid);
  place(S, 3.5); ok('hidden vent: not usable before sonar', Sim.target(W, S) === null); press(W, S, 'ping'); ok('hidden vent: revealed by sonar within 9 tiles', Sim.target(W, S) && Sim.target(W, S).act === 'crawl');
  press(W, S, 'use'); ok('vent: crawling takes 1.4 s and comes out at the linked vent', S.vent && S.busy > 1.3); run(W, S, 1.5, {}); ok('vent: arrived at the far end, no longer crawling', !S.vent && Math.abs(S.x - 11.5) < 1e-9, S.x);
  const far = mkLevel(['P..........................u.u..E']); ({ W, S } = setup(far)); press(W, S, 'ping'); ok('sonar does not reveal vents farther than 9 tiles', !(S.rev & 1) , S.rev);
  const vv = mkLevel(['P..a......a.E'], [{ t: 'stalker', f: 0, a: 4, wake: 'hunt' }]); ({ W, S } = setup(vv)); place(S, 3.5); S.cr[0].x = 3.9; S.cr[0].st = Sim.HUNT; S.cr[0].tx = 3.5; S.dead = false;
  Sim.step(W, S, { use: true }); ok('visible vent can be entered even with a hunter beside you? (use sets crawl)', S.vent === true || S.dead);
  ({ W, S } = setup(vv)); place(S, 3.5); press(W, S, 'use'); S.cr[0].x = 3.4; run(W, S, 1.0, {}); ok('uncatchable while crawling through a vent', !S.dead && S.vent);
}
{ // --- chase start, stars, win, determinism
  const c = mkLevel(['P........E'], [{ t: 'stalker', f: 0, a: 0, wake: 'hunt' }], { chase: true, parTime: 16 }); const { W, S } = setup(c); ok('chase levels: creature starts in HUNT', S.cr[0].st === Sim.HUNT);
  const w = mkLevel(['P.E']); const q = setup(w); run(q.W, q.S, 3, { mx: 1 }); ok('reaching the exit wins', q.S.won === true); ok('stars: finish=1, par sonar=+1, undetected=+1 -> 3', Sim.stars(q.W, q.S) === 3);
  q.S.su = 5; ok('stars: too much sonar costs a star', Sim.stars(q.W, q.S) === 2); q.S.det = true; ok('stars: being detected costs a star', Sim.stars(q.W, q.S) === 1);
  const a = setup(LEVELS[14]), b = setup(LEVELS[14]); for (let i = 0; i < 900; i++) { const inp = { mx: i % 70 < 40 ? 1 : -1, crouch: i % 90 < 20, use: i % 53 === 0, ping: i % 200 === 5 }; Sim.step(a.W, a.S, inp); Sim.step(b.W, b.S, Object.assign({}, inp)); }
  ok('determinism: identical inputs give identical state (level 15)', JSON.stringify(a.S) === JSON.stringify(b.S));
}
{ // --- blocked creature: locked door must not trap the AI in a loop that moves it through walls
  const d = mkLevel(['P..........X........E'], [{ t: 'sentinel', f: 0, a: 15, dir: -1 }]); const { W, S } = setup(d); place(S, 2.5); press(W, S, 'ping'); let x = S.cr[0].x, maxPass = 15.5; run(W, S, 15, { crouch: true });
  ok('creature cannot pass a locked door while investigating', S.cr[0].x > 11.9, S.cr[0].x); ok('...and gives up and searches / returns instead of freezing', S.cr[0].st !== Sim.INVESTIGATE, Sim.STATE_NAMES[S.cr[0].st]);
  const pd = mkLevel(['P......D.....E'], [{ t: 'sentinel', f: 0, a: 11, dir: -1 }]); const q = setup(pd); place(q.S, 2.5); press(q.W, q.S, 'ping'); run(q.W, q.S, 14, { crouch: true }); ok('creature opens plain doors and reaches the noise', q.S.cr[0].x < 6, q.S.cr[0].x);
}
const f = res.filter(r => !r.pass).length; console.log(`\n${res.length - f}/${res.length} passed`); require('fs').writeFileSync(__dirname + '/results-sim.json', JSON.stringify(res, null, 1)); process.exit(f ? 1 : 0);
