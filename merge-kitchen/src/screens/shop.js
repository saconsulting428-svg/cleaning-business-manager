import { COLORS } from '../ui/theme.js';
import { T, E, fmt } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { ScrollPane } from '../ui/ScrollPane.js';
import { roundedBox } from '../ui/draw.js';
import { GEM_PACKS, COIN_PACKS, NO_ADS, ENERGY_REFILL_GEMS, energyCoinCost } from '../data/shop.js';
import { SKINS } from '../data/rewards.js';
import { t, getLang } from '../data/i18n.js';
import { card } from './kit.js';
import { ENERGY_MAX } from '../systems/EnergySystem.js';

/** Shop: gem packs (IAP stub), energy, coins, chef skins, No Ads (VIP). */
export const shopScreen = {
  size: () => ({ title: t('shop.title'), w: 640, h: 1040, ribbon: COLORS.pink }),
  build(popup, scene, app) {
    const state = app.state;
    const c = popup.content;
    const pane = new ScrollPane(scene, popup, { x: 0, y: 40, w: 590, h: 880 });
    const body = pane.content;

    const buy = async (productId) => { // the confirm dialog lives in the IAP provider (see UIScene)
     
      const res = await app.iap.purchase(productId);
      if (res.success) { app.audio.play('levelup'); app.toast(t('toast.purchased')); render(); }
    };

    const render = () => {
      body.removeAll(true);
      let y = 0;
      const header = (text) => { body.add(T(scene, 6, y + 28, text, 40, COLORS.ink, { ox: 0, stroke: false })); y += 66; };
      const row = (h = 118) => { const cy = y + h / 2; body.add(card(scene, 295, cy, 580, h, COLORS.white)); y += h + 14; return cy; };

      // VIP / no ads
      header('👑 VIP');
      let cy = row(140);
      body.add(E(scene, 60, cy - 4, '🎬', 64));
      body.add(T(scene, 110, cy - 28, t('shop.noads'), 40, COLORS.ink, { ox: 0, stroke: false, wrap: 280 }));
      body.add(T(scene, 110, cy + 24, t('shop.noadsDesc'), 32, COLORS.smoke, { ox: 0, stroke: false, wrap: 280 }));
      if (state.data.noAds) body.add(T(scene, 490, cy, t('shop.owned'), 36, COLORS.success, { stroke: false }));
      else body.add(new Button(scene, 490, cy, { w: 170, h: 78, r: 26, color: COLORS.success, label: NO_ADS.price, fontSize: 36, onClick: () => buy(NO_ADS.id) }));

      header(`💎 ${t('shop.gems')}`);
      GEM_PACKS.forEach((p) => {
        cy = row();
        body.add(scene.add.image(56, cy, 'ico_gem').setScale(1.4));
        body.add(T(scene, 102, cy - 4, fmt(p.gems), 48, COLORS.ink, { ox: 0, stroke: false }));
        if (p.tag) {
          const g = scene.add.graphics();
          roundedBox(g, 318, cy - 4, 110, 42, 16, COLORS.secondary, { lip: 3, ow: 3, shine: false, shadow: false });
          body.add(g);
          body.add(T(scene, 318, cy - 6, t('shop.' + p.tag), 32, COLORS.white));
        }
        body.add(new Button(scene, 490, cy, { w: 170, h: 78, r: 26, color: COLORS.success, label: p.price, fontSize: 36, onClick: () => buy(p.id) }));
      });

      header(`⚡ ${t('shop.energy')}`);
      cy = row();
      body.add(scene.add.image(56, cy, 'ico_bolt').setScale(1.4));
      body.add(T(scene, 102, cy - 4, t('shop.refill'), 40, COLORS.ink, { ox: 0, stroke: false }));
      body.add(new Button(scene, 490, cy, { w: 170, h: 78, r: 26, color: COLORS.gem, label: `${ENERGY_REFILL_GEMS} 💎`, fontSize: 34, onClick: () => {
        if (state.spendGems(ENERGY_REFILL_GEMS)) { app.energy.refill(); app.audio.play('success'); app.toast(t('toast.energyAdded', { n: ENERGY_MAX })); } else app.toast(t('toast.noGems'));
      } }));

      cy = row();
      body.add(scene.add.image(56, cy, 'ico_bolt').setScale(1.4));
      body.add(T(scene, 102, cy - 4, t('shop.buyEnergy'), 40, COLORS.ink, { ox: 0, stroke: false }));
      body.add(new Button(scene, 490, cy, { w: 170, h: 78, r: 26, color: COLORS.gold, label: `${fmt(energyCoinCost(state.level))} 🪙`, fontSize: 32, onClick: () => {
        if (state.spendCoins(energyCoinCost(state.level))) { app.energy.add(1); app.audio.play('success'); app.toast(t('toast.energyAdded', { n: 1 })); } else app.toast(t('toast.noCoins'));
      } }));

      header(`🪙 ${t('shop.coins')}`);
      COIN_PACKS.forEach((p) => {
        cy = row();
        body.add(scene.add.image(56, cy, 'ico_coin').setScale(1.4));
        body.add(T(scene, 102, cy - 4, fmt(p.coins), 48, COLORS.ink, { ox: 0, stroke: false }));
        body.add(new Button(scene, 490, cy, { w: 170, h: 78, r: 26, color: COLORS.gem, label: `${p.gems} 💎`, fontSize: 34, onClick: () => {
          if (state.spendGems(p.gems)) { state.addCoins(p.coins, { score: false }); app.audio.play('coin'); state.bus.emit('fx:coins', { x: 360, y: 700, n: 8 }); } else { app.toast(t('toast.noGems')); }
        } }));
      });

      header(`👨‍🍳 ${t('shop.skins')}`);
      SKINS.forEach((s) => {
        cy = row();
        const owned = state.data.skins.owned.includes(s.id);
        const equipped = state.data.skins.selected === s.id;
        body.add(E(scene, 62, cy, s.emoji, 70));
        body.add(T(scene, 118, cy, s.name[getLang()] ?? s.name.en, 36, COLORS.ink, { ox: 0, stroke: false, wrap: 230 }));
        if (equipped) body.add(T(scene, 490, cy, '✔ ' + t('btn.equipped'), 32, COLORS.success, { stroke: false, wrap: 170 }));
        else if (owned) body.add(new Button(scene, 490, cy, { w: 170, h: 78, r: 26, color: COLORS.primary, label: t('btn.equip'), fontSize: 36, onClick: () => { state.data.skins.selected = s.id; state.save(); app.audio.play('click'); render(); } }));
        else if (s.price < 0) body.add(T(scene, 490, cy, '🔒 7/7', 34, COLORS.smoke, { stroke: false }));
        else body.add(new Button(scene, 490, cy, { w: 170, h: 78, r: 26, color: COLORS.gem, label: `${s.price} 💎`, fontSize: 34, onClick: () => {
          if (state.spendGems(s.price)) { state.data.skins.owned.push(s.id); state.data.skins.selected = s.id; state.save(); app.audio.play('success'); app.toast(t('toast.skinUnlocked')); render(); } else app.toast(t('toast.noGems'));
        } }));
      });
      body.add(T(scene, 295, y + 30, t('shop.testPurchase'), 32, COLORS.smoke, { stroke: false, wrap: 540 }));
      pane.setContentHeight(y + 80);
    };

    render();
  },
};
