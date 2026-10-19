// In-app purchase abstraction (stub). Swap the provider for Google Play Billing:
//   provider.purchase(productId) -> Promise<{ success: boolean }>
//   provider.restore()           -> Promise<string[]>  (owned non-consumable product ids)
// Entitlements are granted here in fulfil(), so the billing plugin never touches game state.
import { GEM_PACKS, NO_ADS } from '../data/shop.js';

export class IAPService {
  constructor(state) {
    this.state = state;
    this.provider = null;
  }

  setProvider(p) { this.provider = p; }

  products() { return [...GEM_PACKS, NO_ADS]; }

  async purchase(productId) {
    if (!this.provider) return { success: false, reason: 'no-provider' };
    const res = await this.provider.purchase(productId);
    if (res?.success) this.fulfil(productId);
    return { success: !!res?.success };
  }

  fulfil(productId) {
    const pack = GEM_PACKS.find((p) => p.id === productId);
    if (pack) this.state.addGems(pack.gems, { source: 'iap' });
    if (productId === NO_ADS.id) { this.state.data.noAds = true; this.state.save(); this.state.bus.emit('noads'); }
  }

  async restore() {
    const owned = (await this.provider?.restore?.()) ?? [];
    owned.forEach((id) => this.fulfil(id));
    return owned;
  }
}
