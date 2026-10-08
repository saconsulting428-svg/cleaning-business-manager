// All gameplay tuning lives here. Levels may override per-entity values (speed, range, fov...).
export const CFG = {
  fixedStep: 1 / 60,
  playerSpeed: 4.4, // tiles / second
  pickupRadius: 0.55,
  bumpDistance: 0.55, // touching a guard = caught
  fillTime: 0.75, // seconds of continuous sight before a guard catches the thief
  decayRate: 1.3, // detection meter drain per second when unseen
  suspiciousAt: 0.04, // meter level where a guard stops to stare
  spottedAt: 0.35, // meter level that counts as "detected" for the Perfect Heist rule
  continueInvuln: 3,
  guard: { speed: 1.7, range: 4.5, fov: 70, turnRate: 400, defaultWait: 0.6, alertSpeedMul: 1.5 },
  camera: { range: 5, fov: 46, arc: 45, speed: 28, fillTime: 0.9, cooldown: 3 },
  alarm: { duration: 9, rangeBonus: 1.5, laserCooldown: 2 },
  laser: { on: 1.3, off: 1.7 },
  coins: { loot: 10, rare: 50, perfect: 100 },
  minLootFraction: 0.5, // loot needed for the 2nd star (levels can set minLoot)
  interstitial: { everyNLevels: 3, fromLevel: 3 },
};
