// Monetisation abstraction for ads. Game code only ever calls `ads.showRewarded(placement)`.
// To go live, call ads.setProvider(admobProvider) with an object that has:
//   isReady(placement) -> boolean
//   show(placement)    -> Promise<boolean>   // true when the user earned the reward
// See README -> "AdMob integration". Ads are ALWAYS rewarded and optional.
export class AdsService {
  constructor(state) {
    this.state = state;
    this.provider = null;
  }

  setProvider(p) { this.provider = p; }
  isReady(placement) { return this.state.data.noAds || !!this.provider?.isReady?.(placement); }

  /** Resolves true when the reward should be granted. VIP (No Ads) players skip the video. */
  async showRewarded(placement) {
    if (this.state.data.noAds) return true;
    if (!this.provider) return false;
    try { return !!(await this.provider.show(placement)); } catch (e) { console.warn('[ads] failed', e); return false; }
  }
}
