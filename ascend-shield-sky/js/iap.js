/* ============================================================
   iap.js — coin shop / in-app purchases.
   Web build: "demo purchase" (no money moves, clearly labelled).
   Play Store build: connect Google Play Billing in `nativeBuy` (see the comment) and
   VERIFY RECEIPTS ON YOUR SERVER before granting coins in a real release.
   ============================================================ */
(function () {
  'use strict';
  const G = window.G, D = G.Storage.data, C = window.ASCEND_CONFIG || {};
  const P = (G.Purchases = {
    PACKS: [
      { id: 'coins_500',   coins: 500,   price: '$0.99',  icon: '💰', tag: '' },
      { id: 'coins_1200',  coins: 1200,  price: '$1.99',  icon: '👝', tag: '+20% bonus' },
      { id: 'coins_3000',  coins: 3000,  price: '$4.99',  icon: '🎒', tag: 'Popular' },
      { id: 'coins_7500',  coins: 7500,  price: '$9.99',  icon: '🧰', tag: 'Best value' },
      { id: 'coins_20000', coins: 20000, price: '$24.99', icon: '🏦', tag: 'Mega' }
    ],
    native: () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
    demo: () => !!C.demoPurchases && !P.native(),
    grant(pack, how) { D.coins += pack.coins; D.purchases.push({ id: pack.id, coins: pack.coins, how, t: Date.now() }); G.Storage.save(); },
    /* Real store hookup (example with cordova-plugin-purchase, works inside Capacitor):
         store.register({ id: pack.id, type: store.CONSUMABLE, platform: store.GOOGLE_PLAY });
         store.when(pack.id).approved(t => t.verify());          // verify on your server
         store.when(pack.id).verified(t => { grant(pack); t.finish(); });
         store.order(pack.id);
       Then call ok()/fail() accordingly. */
    nativeBuy(pack, ok, fail) { fail('Store not connected yet'); },
    buy(id, ok, fail) {
      const pack = P.PACKS.find(p => p.id === id); if (!pack) return fail('Unknown pack');
      if (P.native()) return P.nativeBuy(pack, () => { P.grant(pack, 'store'); ok(pack); }, fail);
      if (P.demo()) { P.grant(pack, 'demo'); return ok(pack); }
      fail('Purchases are not available in this build');
    }
  });
})();
