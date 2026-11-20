/* ============================================================
   difficulty.js — adaptive difficulty ("flow"), so players are neither
   bored nor stuck, plus the opt-in "Easy Assist" earned by watching a
   rewarded ad (the game never gets *harder* because you skipped ads).
   flow 0..1 = how well the player is doing right now (starts from the
   saved skill). mod() -> 0.6..1.4 multiplier used for spawn rate,
   obstacle speed and pattern difficulty.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, U = G.U, D = G.Storage.data;
  G.Diff = {
    begin(run) { run.flow = D.skill; run.noHitT = 0; run.lastHit = -99; run.hits = 0; run.assist = 0; if (D.assist > 0) { D.assist--; run.assist = 1; } },
    tick(run, dt) { run.noHitT += dt; if (run.noHitT > 10) run.flow = Math.min(1, run.flow + dt * .004); },     // clean play for a while -> a bit harder
    onHit(run) { run.flow = Math.max(0, run.flow - .14); run.noHitT = 0; run.lastHit = run.t; run.hits++; },     // got hit -> back off
    onBonk(run) { run.flow = Math.min(1, run.flow + .004); },                                                    // good blocks -> slowly up
    mod(run) {
      let m = .78 + .6 * run.flow;                       // 0.78 (struggling) .. 1.38 (expert)
      m -= run.assist * .15;                             // Easy Assist from a rewarded ad
      if (run.t - run.lastHit < 12) m -= .08;            // short breather after a hit
      if (run.t < 30) m = Math.min(m, .9);               // the first 30 seconds are always gentle
      if (run.mode === 'journey' && run.level <= 3) m = Math.min(m, .95);
      return U.clamp(m, .6, 1.4);
    },
    end(run) {
      D.skill = U.lerp(D.skill, run.flow, .35);
      if (run.dead && run.t < 45) D.skill = Math.max(0, D.skill - .05);       // died very early -> next run is kinder
      D.skill = U.clamp(D.skill, 0, 1); G.Storage.save();
    }
  };
})();
