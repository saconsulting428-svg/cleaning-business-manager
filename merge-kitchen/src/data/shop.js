// Shop catalogue. Real-money products go through IAPService (productId must match the
// Google Play Console in-app product id); everything else is paid with gems.

export const GEM_PACKS = [
  { id: 'gems_small', gems: 100, price: '$0.99', icon: 'gem' },
  { id: 'gems_medium', gems: 550, price: '$4.99', icon: 'gem', tag: 'popular' },
  { id: 'gems_large', gems: 1200, price: '$9.99', icon: 'gem', tag: 'best' },
];

export const NO_ADS = { id: 'no_ads', price: '$2.99' };

export const COIN_PACKS = [
  { id: 'coins_s', coins: 500, gems: 10 },
  { id: 'coins_m', coins: 2500, gems: 40 },
  { id: 'coins_l', coins: 8000, gems: 110 },
];

export const ENERGY_REFILL_GEMS = 15;

/** Coins -> energy: gives idle earnings / coins a purpose (cost grows with level) */
export const energyCoinCost = (level) => 100 + level * 40;
