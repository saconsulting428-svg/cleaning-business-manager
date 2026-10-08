// AdService: one interface the game talks to. Swap the provider to go live with AdMob (see README).
import { CFG } from '../config.js';

/** Development provider: shows a clearly-marked placeholder instead of a real ad. No ad IDs involved. */
class MockAdProvider {
  constructor() { this.name = 'mock'; }
  async init() { return true; }
  isRewardedReady() { return true; }
  show(kind, label) {
    return new Promise((resolve) => {
      const seconds = kind === 'rewarded' ? 3 : 2;
      const el = document.createElement('div');
      el.className = 'ad-overlay';
      el.innerHTML = `<div class="ad-card"><div class="ad-tag">AD PLACEHOLDER</div>
        <h3>${kind === 'rewarded' ? 'Rewarded video' : 'Interstitial'}</h3><p>${label}</p>
        <div class="ad-count"></div><button class="btn ghost ad-close" disabled>Close</button></div>`;
      document.body.appendChild(el);
      const count = el.querySelector('.ad-count');
      const close = el.querySelector('.ad-close');
      let left = seconds;
      const done = (rewarded) => { clearInterval(timer); el.remove(); resolve({ rewarded }); };
      const tick = () => {
        count.textContent = left > 0 ? `Reward in ${left}…` : (kind === 'rewarded' ? 'Reward earned!' : 'Done');
        if (left <= 0) { close.disabled = false; close.textContent = kind === 'rewarded' ? 'Claim reward' : 'Close'; }
      };
      tick();
      const timer = setInterval(() => { left--; tick(); if (left <= 0) clearInterval(timer); }, 1000);
      close.addEventListener('click', () => done(kind === 'rewarded'));
    });
  }
}

/**
 * Real AdMob provider skeleton. Not active in development (no IDs shipped).
 * Implement with @capacitor-community/admob and register via AdService.setProvider(new AdMobProvider({...ids})).
 */
export class AdMobProvider {
  constructor(ids) { this.ids = ids; this.name = 'admob'; }
  async init() { throw new Error('AdMobProvider not wired yet — see README "Monetisation".'); }
  isRewardedReady() { return false; }
  async show() { return { rewarded: false }; }
}

class AdServiceImpl {
  constructor() { this.provider = new MockAdProvider(); this.completedSinceAd = 0; this.enabled = true; }
  async init() { try { await this.provider.init(); } catch (e) { this.provider = new MockAdProvider(); } }
  setProvider(p) { this.provider = p; return this.init(); }
  /** @returns {Promise<{rewarded:boolean}>} */
  showRewarded(placement, label) { return this.provider.show('rewarded', label || placement); }
  /** Interstitial between *selected* level transitions only (never banners in gameplay). */
  async maybeShowInterstitial(levelJustFinished) {
    if (!this.enabled || levelJustFinished < CFG.interstitial.fromLevel) return;
    this.completedSinceAd++;
    if (this.completedSinceAd < CFG.interstitial.everyNLevels) return;
    this.completedSinceAd = 0;
    await this.provider.show('interstitial', 'Shown every few levels, never during play.');
  }
}
export const AdService = new AdServiceImpl();
