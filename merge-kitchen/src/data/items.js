// ---------------------------------------------------------------------------
// Merge chains. EVERYTHING item-related is generated from CHAINS below, so adding
// 200+ dishes = adding more entries here (see README "Adding new items").
//
//   chain(id, names, unlockLevel, tiers)
//   tier = { id, emoji, name: { en, ur } [, value] }       (ids must be unique)
//
// Two identical items merge into the next tier of the same chain.
// ---------------------------------------------------------------------------

/** Coin value per tier (index = tier-1). Used for selling, orders and rewards. */
export const TIER_VALUES = [5, 12, 30, 75, 180, 430, 1000, 2300, 5200, 11000];

function chain(id, name, unlockLevel, tiers, valueMul = 1) {
  return { id, name, unlockLevel, valueMul, tiers };
}

export const CHAINS = [
  chain('potato', { en: 'Street Snacks', ur: 'Street Snacks' }, 1, [
    { id: 'potato', emoji: '🥔', name: { en: 'Potato', ur: 'Aloo' } },
    { id: 'fries', emoji: '🍟', name: { en: 'Fries', ur: 'Fries' } },
    { id: 'burger', emoji: '🍔', name: { en: 'Burger', ur: 'Burger' } },
    { id: 'pizza', emoji: '🍕', name: { en: 'Pizza', ur: 'Pizza' } },
    { id: 'biryani', emoji: '🍛', name: { en: 'Biryani', ur: 'Biryani' } },
    { id: 'sushi', emoji: '🍣', name: { en: 'Sushi', ur: 'Sushi' } },
    { id: 'goldplatter', emoji: '🏆', name: { en: 'Gold Platter', ur: 'Sunehri Thaal' } },
  ]),
  chain('flour', { en: 'Bakery', ur: 'Bakery' }, 4, [
    { id: 'flour', emoji: '🌾', name: { en: 'Flour', ur: 'Aata' } },
    { id: 'dough', emoji: '🍞', name: { en: 'Dough', ur: 'Goondha Aata' } },
    { id: 'naan', emoji: '🥖', name: { en: 'Naan', ur: 'Naan' } },
    { id: 'paratha', emoji: '🥞', name: { en: 'Paratha', ur: 'Paratha' } },
    { id: 'kebabroll', emoji: '🌯', name: { en: 'Kebab Roll', ur: 'Kebab Roll' } },
    { id: 'feastplate', emoji: '🍱', name: { en: 'Feast Plate', ur: 'Dawat Plate' } },
    { id: 'royalbanquet', emoji: '🦃', name: { en: 'Royal Banquet', ur: 'Shahi Dawat' } },
  ]),
  chain('tomato', { en: 'Chef Kitchen', ur: 'Chef Kitchen' }, 7, [
    { id: 'tomato', emoji: '🍅', name: { en: 'Tomato', ur: 'Tamatar' } },
    { id: 'sauce', emoji: '🥫', name: { en: 'Sauce', ur: 'Chutni' } },
    { id: 'pasta', emoji: '🍝', name: { en: 'Pasta', ur: 'Pasta' } },
    { id: 'lasagna', emoji: '🥘', name: { en: 'Lasagna', ur: 'Lasagna' } },
    { id: 'soup', emoji: '🍲', name: { en: 'Soup Pot', ur: 'Shorba Deg' } },
    { id: 'chefspecial', emoji: '🦞', name: { en: 'Chef Special', ur: 'Chef Special' } },
    { id: 'michelin', emoji: '🍽️', name: { en: 'Michelin Dish', ur: 'Michelin Dish' } },
  ], 1.1),
];

/** id -> item definition (generated) */
export const ITEMS = {};
export const ITEM_LIST = [];
for (const c of CHAINS) {
  c.tiers.forEach((t, i) => {
    const def = {
      id: t.id,
      chain: c.id,
      tier: i + 1,
      emoji: t.emoji,
      name: t.name,
      value: Math.round((t.value ?? TIER_VALUES[Math.min(i, TIER_VALUES.length - 1)]) * c.valueMul),
      next: c.tiers[i + 1]?.id ?? null,
      maxTier: c.tiers.length,
    };
    ITEMS[t.id] = def;
    ITEM_LIST.push(def);
  });
}

let lang = 'en';
export const setItemLang = (l) => { lang = l; };

export const chainById = (id) => CHAINS.find((c) => c.id === id);
export const itemName = (id) => ITEMS[id]?.name[lang] ?? ITEMS[id]?.name.en ?? id;
export const chainName = (c) => c.name[lang] ?? c.name.en;
export const isValidItem = (id) => Object.prototype.hasOwnProperty.call(ITEMS, id);
/** Chains available at a given player level */
export const unlockedChains = (level) => CHAINS.filter((c) => c.unlockLevel <= level);
export const tier1Of = (chainId) => chainById(chainId).tiers[0].id;
export const itemOf = (chainId, tier) => chainById(chainId).tiers[Math.min(tier, chainById(chainId).tiers.length) - 1].id;
