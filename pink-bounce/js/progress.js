/* Run statistics, coins, achievements and the local leaderboard. */
PB.ACHIEVEMENTS = [
  { id: 'first',    name: 'First Crack',    desc: 'Break your first block',          reward: 20,  test: (s) => s.blocks >= 1 },
  { id: 'smasher',  name: 'Demolition Crew', desc: 'Break 500 blocks in total',      reward: 100, test: (s) => s.blocks >= 500 },
  { id: 'lvl5',     name: 'Getting Warm',   desc: 'Reach level 5',                   reward: 60,  test: (s) => s.maxLevel >= 5 },
  { id: 'lvl10',    name: 'Ten Deep',       desc: 'Reach level 10',                  reward: 150, test: (s) => s.maxLevel >= 10 },
  { id: 'combo8',   name: 'Combo Machine',  desc: 'Reach a x8 combo',                reward: 80,  test: (s) => s.maxMult >= 8 },
  { id: 'power25',  name: 'Power Hungry',   desc: 'Collect 25 power-ups',            reward: 80,  test: (s) => s.powerups >= 25 },
  { id: 'vault',    name: 'Vault Cracker',  desc: 'Clear a Fortress Mode level',     reward: 100, test: (s) => s.fortressClears >= 1 },
  { id: 'score10k', name: 'Five Figures',   desc: 'Score 10,000 in one run',         reward: 120, test: (s) => s.bestScore >= 10000 },
  { id: 'games10',  name: 'Regular',        desc: 'Play 10 games',                   reward: 50,  test: (s) => s.games >= 10 }
];

PB.Progress = {
  /** Merge a run's counters into the saved stats; returns achievements unlocked by it. */
  record(run, ctx) {
    const D = PB.Save.data, s = D.stats;
    s.blocks += run.blocks; s.powerups += run.powerups; s.fortressClears += run.fortressClears;
    s.maxMult = Math.max(s.maxMult, run.maxMult);
    s.maxLevel = Math.max(s.maxLevel, ctx.level);
    s.bestScore = Math.max(s.bestScore, ctx.score);
    if (ctx.gameOver) s.games++;
    run.blocks = 0; run.powerups = 0; run.fortressClears = 0;
    const unlocked = [];
    PB.ACHIEVEMENTS.forEach((a) => {
      if (!D.ach[a.id] && a.test(s)) { D.ach[a.id] = true; D.coins += a.reward; unlocked.push(a); }
    });
    PB.Save.save();
    return unlocked;
  },
  addBoardEntry(score, mode, level) {
    const D = PB.Save.data;
    D.board.push({ score, mode, level, ts: Date.now() });
    D.board.sort((a, b) => b.score - a.score);
    D.board.length = Math.min(D.board.length, 10);
    PB.Save.save();
  },
  coinsFor(score) { return Math.floor(score / 50); }
};
