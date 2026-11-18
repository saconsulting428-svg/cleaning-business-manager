/* ============================================================
   data.js — characters, upgrades, daily rewards, milestones
   ============================================================ */
(function () {
  'use strict';
  const G = window.G;
  const D = (G.Data = {});

  // speed = shield follow speed, size = hitbox of the hero (smaller is better), shield = shield radius
  D.CHARACTERS = [
    { id: 'balloon', name: 'Balloon',        price: 0,    speed: 1.00, size: 1.00, shield: 1.00, trail: 'sparkle', desc: 'Classic all-rounder' },
    { id: 'hotair',  name: 'Hot-Air Balloon', price: 250,  speed: 0.95, size: 1.14, shield: 1.22, trail: 'puff',    desc: 'Big shield, big target' },
    { id: 'rocket',  name: 'Mini Rocket',    price: 500,  speed: 1.18, size: 0.92, shield: 0.95, trail: 'fire',    desc: 'Fast shield' },
    { id: 'jelly',   name: 'Jellyfish',      price: 800,  speed: 0.95, size: 0.82, shield: 1.00, trail: 'bubble',  desc: 'Tiny hitbox' },
    { id: 'ufo',     name: 'UFO Pod',        price: 1200, speed: 1.00, size: 1.00, shield: 1.30, trail: 'glow',    desc: 'Huge shield' },
    { id: 'plane',   name: 'Paper Plane',    price: 1700, speed: 1.32, size: 0.90, shield: 0.90, trail: 'streak',  desc: 'Lightning-fast shield' },
    { id: 'bird',    name: 'Space Bird',     price: 2400, speed: 1.12, size: 0.78, shield: 1.05, trail: 'feather', desc: 'Smallest hitbox' }
  ];
  D.char = id => D.CHARACTERS.find(c => c.id === id) || D.CHARACTERS[0];

  // req = best distance (m) you must have reached before the upgrade can be bought (distance milestone)
  D.UPGRADES = [
    { id: 'shield', icon: '🛡️', name: 'Shield Power',  base: 80,  req: 0,    kind: 'passive', desc: l => `Shield size +${l * 8}% • repel force +${l * 12}%` },
    { id: 'gun',    icon: '🔫', name: 'Shield Gun',    base: 220, req: 500,  kind: 'passive', desc: l => l ? `Auto-fires ${G.T.gunRate[l]} shots/s` : 'Shield auto-shoots obstacles' },
    { id: 'invis',  icon: '👻', name: 'Ghost Mode',    base: 200, req: 1500, kind: 'active',  desc: l => l ? `${G.T.invisDur[l]}s pass-through • ${G.T.invisCd[l]}s cooldown` : 'Obstacles pass through you' },
    { id: 'magnet', icon: '🧲', name: 'Coin Magnet',   base: 100, req: 0,    kind: 'passive', desc: l => `Pull radius ${G.T.magnet[l]}px` },
    { id: 'slow',   icon: '⏳', name: 'Slow-Motion',   base: 180, req: 1000, kind: 'active',  desc: l => l ? `${G.T.slowDur[l]}s slow-mo • ${G.T.slowCd[l]}s cooldown` : 'Slow the world down' },
    { id: 'life',   icon: '❤️', name: 'Extra Life',    base: 300, req: 0,    kind: 'passive', desc: l => `${3 + (l >= 1 ? 1 : 0) + (l >= 3 ? 1 : 0)} max lives • more heart drops` },
    { id: 'dash',   icon: '⚡', name: 'Dash',          base: 160, req: 800,  kind: 'active',  desc: l => l ? `${G.T.dashDur[l]}s boost, smashes obstacles • ${G.T.dashCd[l]}s cooldown` : 'Short invincible boost' }
  ];
  D.upgrade = id => D.UPGRADES.find(u => u.id === id);
  D.MAXLV = 5;
  D.cost = (id, lvl) => Math.round(D.upgrade(id).base * (lvl + 1) * (1 + lvl * 0.35));

  // per-level numbers
  G.T = {
    gunRate: [0, 1.3, 1.9, 2.6, 3.4, 4.4],
    invisDur: [0, 2.4, 3, 3.6, 4.3, 5], invisCd: [0, 26, 23, 20, 17, 14],
    slowDur: [0, 3, 3.6, 4.2, 4.8, 5.5], slowCd: [0, 32, 28, 24, 20, 16],
    dashDur: [0, 0.9, 1.05, 1.2, 1.35, 1.5], dashCd: [0, 22, 19, 16, 13, 10],
    magnet: [70, 120, 170, 225, 285, 350]
  };

  D.DAILY = [50, 75, 100, 150, 200, 300, 500];       // 7-day streak

  // coin bonus for reaching a distance milestone (meters)
  D.MILESTONES = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 40000, 50000];
  D.mileBonus = m => Math.min(300, Math.round(10 + m / 100));
  D.nextMile = m => { for (const x of D.MILESTONES) if (x > m) return x; return (Math.floor(m / 10000) + 1) * 10000; };
})();
