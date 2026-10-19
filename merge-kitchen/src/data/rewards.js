// Static reward tables: daily login calendar, album milestones, Chef Kaleem lines.

/** 7-day login streak. Day 7 grants a special chef skin. */
export const DAILY_REWARDS = [
  { day: 1, coins: 100 },
  { day: 2, energy: 2 },
  { day: 3, gems: 5 },
  { day: 4, coins: 300 },
  { day: 5, energy: 3 },
  { day: 6, gems: 12 },
  { day: 7, gems: 25, skin: 'golden' },
];

/** Album milestones: discovering N dishes unlocks a reward */
export const ALBUM_MILESTONES = [
  { count: 4, coins: 150 },
  { count: 8, gems: 6 },
  { count: 12, coins: 600, energy: 2 },
  { count: 16, gems: 15 },
  { count: 21, gems: 40, coins: 2000 },
];

/** Free chest cadence */
export const CHEST_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export const SKINS = [
  { id: 'classic', emoji: '👨‍🍳', price: 0, name: { en: 'Classic Chef', ur: 'Classic Chef' } },
  { id: 'chefette', emoji: '👩‍🍳', price: 40, name: { en: 'Chef Madam', ur: 'Chef Madam' } },
  { id: 'robo', emoji: '🤖', price: 90, name: { en: 'Robo Chef', ur: 'Robo Chef' } },
  { id: 'golden', emoji: '🤴', price: -1, name: { en: 'Golden Chef', ur: 'Sunehri Chef' } }, // price -1 = not for sale (Day 7 reward)
];
export const skinById = (id) => SKINS.find((s) => s.id === id) ?? SKINS[0];

/** Comic dialogue of rival Chef Kaleem (keys live in i18n: kaleem.intro.N / win.N / lose.N) */
export const KALEEM_LINES = 4;
