# 🍳 Merge Kitchen: Chef Empire

A bright, chunky, mobile-first **merge + restaurant tycoon** game. Start with a tiny street-food cart,
merge ingredients into legendary dishes, serve fussy customers, beat rival **Chef Kaleem**, and grow
into a global restaurant chain.

**Stack:** Phaser 3 · Vite · vanilla JavaScript (ES modules) · localStorage · Capacitor-ready.
No external assets: all art is generated in code (Phaser graphics + emoji) and all audio is synthesised
with WebAudio, so it loads in ~1 s and works fully offline.

---

## 1. Run it

```bash
cd merge-kitchen
npm install
npm run dev        # http://localhost:5173  (also reachable from your phone on the same Wi-Fi)
npm run build      # production build -> dist/
npm run preview    # serve the production build
npm run single     # ONE self-contained file -> dist-single/index.html (JS + CSS + fonts inlined)
```

A ready-made single file is also committed at `release/merge-kitchen.html` - just open it in any
modern browser (desktop or phone). Use browser dev-tools "device mode" for the 9:16 portrait layout.

**Debug URL flags**

| URL | Effect |
| --- | --- |
| `?rush=lunch` / `?rush=dinner` | Force the 2x-coins rush event on (for testing banners / multipliers) |

In the browser console: `__app` exposes every system (`__app.state.data`, `__app.energy`, `__app.merge`, …)
and `__game` is the Phaser game. Handy examples:

```js
__app.state.addXp(500)                         // level up (celebration, unlocks, rival...)
__app.state.addCoins(10000); __app.state.addGems(100)
__app.energy.refill()
__app.state.data.chest.readyAt = 0             // chest ready now
__app.state.data.lastSeen -= 3 * 3600e3        // pretend you were away 3 h (reload -> Welcome back)
```

## 2. How to play

1. **Spawn** (big orange button, costs ⚡1) puts an ingredient on a random empty cell of the 6×6 board.
2. **Drag two identical items together** to merge them into the next tier (Potato → Fries → Burger → …).
   Valid targets glow while you drag.
3. **Customers** wait at the counter with an order bubble and a patience bar. **Drag the right dish onto
   the customer** to serve: coins + XP + sometimes gems. A ✔ appears on a bubble when you already have the dish.
   A wrong dish costs patience; an expired order makes the customer storm off angry.
4. Drag any item to the **trash/Sell** zone to sell it. A full board shows a friendly toast (never a crash).
5. **Level up** to unlock new food lines (Bakery at Lv 4, Chef Kitchen at Lv 7), new restaurant stages
   (Street Cart → Dhaba → Cafe → Restaurant → Hotel → Global Chain) and more customer slots.
6. Every 3 levels **Chef Kaleem** challenges you to a 60-second **Rival Battle** (⚔️ button).

### Retention systems

| System | Behaviour |
| --- | --- |
| Energy | Max 5, +1 / 30 min in real time (also offline), countdown in the HUD. Refill by rewarded ad (+2), coins or gems |
| Daily gift | 7-day streak calendar; missing a day resets it; **Day 7 = Golden Chef skin** |
| Idle earnings | Coins/minute while the app is closed (cap 4 h) → *Welcome back* popup with **Collect** / **Collect x2 (ad)** |
| Lunch / Dinner Rush | 12:00-14:00 and 19:00-21:00 local time: **2x coins**, slide-in banner + live countdown tag |
| Daily quests | 3 per day (merge / serve / make a dish / earn / spawn) + all-done bonus; reset at midnight |
| Free chest | Opens every 4 h with a visible countdown (coins, gems, energy, ingredients) |
| Album | Every dish; silhouettes until discovered; milestone rewards |
| Weekly leaderboard | Local mock with fake chefs, behind `LeaderboardService` so a backend can be plugged in |
| Local notifications | Stubs for "Your food is burning!", "Rush started!", "Energy full!", chest, daily gift |

### Manual test checklist

- [ ] New game: tutorial hand shows merge → serve → spawn within ~30 s; **Skip** works; first order is Fries.
- [ ] Merge: pop, sparkles, floating `+coins`, coins fly to the HUD, haptic (on a phone), COMBO banner on 3 fast merges, screen shake on tier ≥ 5.
- [ ] Serve right/wrong dish; let a customer expire (angry exit).
- [ ] Fill the board → toast. Drag to **Sell**.
- [ ] Spawn with 0 energy → Out-of-energy popup → *Watch Ad* (mock, 3 s) gives +2.
- [ ] Reload: board, coins, quests, timers persist. Change the system clock by +3 h → Welcome back popup.
- [ ] Settings: sound / music / vibration persist; **English ↔ Roman Urdu** switches instantly.
- [ ] `__app.state.addXp(500)` → level-up celebration, new food line, stage backdrop change, rival dialogue.
- [ ] 360×640 up to 430×932: canvas is centred, letter-boxed, never cropped.

## 3. Project structure

```
merge-kitchen/
├─ index.html              shell: safe-area padding, viewport-fit=cover, manifest
├─ vite.config.js          relative base (works in Capacitor / file://)
├─ vite.single.config.js   single-file build
├─ capacitor.config.json   appId / webDir for Capacitor
├─ public/                 sw.js (offline cache), manifest, icon
├─ store/                  Play Store icon 512×512 + feature graphic 1024×500 (generated)
├─ tools/store-assets.html source of those graphics
└─ src/
   ├─ main.js              Phaser config (FIT, 720×1280 portrait), boots systems
   ├─ scenes/              Boot (splash/loading) · Menu · Game (world) · UI (HUD + all popups)
   ├─ systems/             SaveSystem, GameState, EnergySystem, MergeSystem, CustomerSystem, Economy,
   │                       ProgressionSystem, RivalSystem, QuestSystem, DailyReward, IdleEarnings,
   │                       ChestSystem, EventSystem, NotificationService, LeaderboardService,
   │                       AudioSystem (WebAudio), Platform (haptics/links/lifecycle), time
   ├─ services/            AdsService (mock rewarded) · IAPService (stub)  ← plug AdMob / Play Billing here
   ├─ data/                items.js · levels.js · quests.js · rewards.js · shop.js · i18n.js
   ├─ game/                textures, Background, BoardView, CustomerView, DragController, Tutorial
   ├─ screens/             one file per popup (daily, welcome, quests, album, shop, chest, …)
   └─ ui/                  theme (ALL colours) · layout · Button · Popup(+Manager) · Toast · ProgressBar ·
                           Badge · CurrencyPill · Banner · ScrollPane · fx (juice) · draw/text helpers
```

Design rules: **no hex colours outside `src/ui/theme.js`**; every label goes through `t('key')`;
scenes never contain game rules - systems do, and talk to views through the `state.bus` event emitter.
Timers all use `Date.now()` (so they keep running while the app is closed). Static art is baked into
cached textures (`boxImage`, `bakeTexture`) because Phaser re-tessellates `Graphics` objects every frame.

## 4. Adding new items / dishes

Everything item-related is generated from `src/data/items.js`. To add a whole new food line, append a chain:

```js
chain('rice', { en: 'Rice Bowl', ur: 'Chawal' }, /* unlockLevel */ 10, [
  { id: 'rice',     emoji: '🍚', name: { en: 'Rice',     ur: 'Chawal' } },
  { id: 'onigiri',  emoji: '🍙', name: { en: 'Onigiri',  ur: 'Onigiri' } },
  { id: 'curryrice',emoji: '🍛', name: { en: 'Curry Rice', ur: 'Curry Chawal' } },
  // ... as many tiers as you like (>= 7 recommended). Optional: value: 123
], /* valueMul */ 1.2),
```

That is all: merging, orders, selling, the album (silhouettes, milestones), quests ("make X"), unlock
celebration + starter ingredient pack, and the item textures (generated lazily on first use) pick it up
automatically. `ids` must be unique. To scale to 200+ dishes just keep adding chains - the Album uses a
scroll pane. Optional tuning lives in:

* `TIER_VALUES` (items.js) - coin value per tier (selling, order rewards)
* `maxOrderTier`, `patienceFor`, `xpForLevel`, `STAGES`, `idlePerMinute` (levels.js)
* `ALBUM_MILESTONES`, `DAILY_REWARDS`, `SKINS` (rewards.js) · `GEM_PACKS`, `COIN_PACKS` (shop.js)
* `ENERGY_MAX`, `ENERGY_INTERVAL` (EnergySystem.js)

Adding a language: add a dictionary to `src/data/i18n.js` + an entry in `LANGS`, and the `name`
translations in `items.js` / `levels.js` / `rewards.js`.

## 5. Build the Android app with Capacitor

Prerequisites: Node 18+, JDK 17, Android Studio (SDK + platform tools).

```bash
cd merge-kitchen
npm i @capacitor/core @capacitor/cli @capacitor/android
npm i @capacitor/haptics @capacitor/local-notifications @capacitor/app @capacitor/browser @capacitor/status-bar

# capacitor.config.json is already included (appId com.yourstudio.mergekitchen - change it!).
# If you prefer the wizard:  npx cap init "Merge Kitchen" com.yourstudio.mergekitchen --web-dir dist

npm run build          # creates dist/
npx cap add android    # once
npx cap sync android   # copies dist/ + plugins into the native project (run after every web change)
npx cap open android   # opens Android Studio
```

Recommended native tweaks (in `android/`):

* **Portrait only:** in `AndroidManifest.xml`, `<activity ... android:screenOrientation="portrait">`.
* **Edge-to-edge / safe areas:** the web shell already pads with `env(safe-area-inset-*)` and uses `viewport-fit=cover`.
  Optionally hide the status bar with `StatusBar.hide()` (from `@capacitor/status-bar`).
* **App icon / splash:** `npx @capacitor/assets generate --android` using `store/icon-512.png`
  (put a 1024×1024 version in `assets/icon-only.png`).
* **Notification icon:** add `res/drawable/ic_stat_icon.png` (referenced by `capacitor.config.json`).
* Haptics, link opening and app-lifecycle events are already wired in `src/systems/Platform.js`
  (uses `Capacitor.Plugins.*` when present, web fallbacks otherwise).

### Signed release bundle (AAB)

```bash
# 1) one-time: create an upload keystore (BACK IT UP, never commit it)
keytool -genkey -v -keystore merge-kitchen-upload.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000

# 2) android/keystore.properties  (git-ignored)
#    storeFile=../merge-kitchen-upload.keystore
#    storePassword=****   keyAlias=upload   keyPassword=****
```

`android/app/build.gradle`:

```groovy
def keystoreProps = new Properties()
def kf = rootProject.file("keystore.properties")
if (kf.exists()) keystoreProps.load(new FileInputStream(kf))

android {
  defaultConfig { versionCode 1; versionName "1.0.0" }   // bump versionCode for every upload
  signingConfigs {
    release {
      storeFile file(keystoreProps['storeFile']); storePassword keystoreProps['storePassword']
      keyAlias keystoreProps['keyAlias'];        keyPassword keystoreProps['keyPassword']
    }
  }
  buildTypes { release { signingConfig signingConfigs.release; minifyEnabled true; shrinkResources true } }
}
```

```bash
cd android && ./gradlew bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab   (upload this to Play Console)
```

(Or in Android Studio: *Build → Generate Signed App Bundle / APK → Android App Bundle*.)
Enrol in **Play App Signing** when you create the app; the keystore above is then only your *upload* key.

## 6. AdMob integration (rewarded ads)

Game code never talks to an ad SDK: it calls `app.ads.showRewarded(placement)` (placements used today:
`energy`, `idle_x2`). Replace the mock provider (installed in `UIScene.installProviders()`):

```bash
npm i @capacitor-community/admob && npx cap sync
```

```js
// src/services/AdMobProvider.js
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';

const REWARDED_ID = 'ca-app-pub-3940256099942544/5224354917'; // Google TEST id - replace with yours

export const admobProvider = {
  async init() { await AdMob.initialize({ initializeForTesting: true }); },
  isReady: () => true,
  async show() {
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_ID });
    return new Promise(async (resolve) => {
      let rewarded = false;
      const a = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; });
      const b = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => { a.remove(); b.remove(); resolve(rewarded); });
      await AdMob.showRewardVideoAd();
    });
  },
};
// then, in UIScene.installProviders():  await admobProvider.init(); app.ads.setProvider(admobProvider);
```

Checklist: add your **AdMob App ID** to `AndroidManifest.xml`
(`<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-xxx~yyy"/>`;
the test app id is `ca-app-pub-3940256099942544~3347511713`), keep **test ads** until release, show the
**UMP consent form** (EU/UK users) before the first ad request, and declare ads in Play Console.
Ads here are **always rewarded and optional**; the *VIP Pass* (`noAds`) simply skips the video and grants the reward.

**In-app purchases:** same idea with `IAPService.setProvider({ purchase(id) → {success}, restore() → ids })`.
Use Google Play Billing through a Capacitor plugin (e.g. `@capgo/native-purchases` or `cordova-plugin-purchase`).
Product ids must match `src/data/shop.js` (`gems_small`, `gems_medium`, `gems_large`, `no_ads`). Validate purchases
server-side before shipping a real economy.

## 7. Notifications, leaderboard

* `NotificationService` already schedules (when the app is backgrounded) *energy full*, *next rush*,
  *chest ready*, *"Your food is burning!"* (3 h) and *daily gift* through
  `Capacitor.Plugins.LocalNotifications`. Install `@capacitor/local-notifications`, call
  `notify.requestPermission()` at a good moment (e.g. after the tutorial) and you're done.
* `LeaderboardService.setProvider({ fetchTop(weekKey, limit), submit(weekKey, name, score) })` plugs in a backend
  (Play Games Services, Firebase, your own API). The default provider is an offline mock with fake chefs.

## 8. Google Play release checklist

- [ ] **Developer account** verified; app created with **Play App Signing**; package name final.
- [ ] **Privacy policy URL** (required - the game uses ads): host a page and set `PRIVACY_URL` in
      `src/screens/settings.js` (shown in *Settings → Privacy Policy*) and in Play Console.
- [ ] **App icon 512×512** PNG (≤1 MB) → `store/icon-512.png` ✔ (regenerate from `tools/store-assets.html`).
- [ ] **Feature graphic 1024×500** → `store/feature-graphic-1024x500.png` ✔
- [ ] **Screenshots:** at least 2 phone screenshots (portrait, 16:9–9:16, 320–3840 px); take 4–8 of the
      merge board, a celebration, rush banner and rival battle.
- [ ] Short (≤80 chars) + full (≤4000 chars) description, category *Casual*, contact e-mail.
- [ ] **Data safety form:** declare ad SDK data (Advertising ID / device identifiers if AdMob is on),
      state that progress is stored locally, and whether data is shared/collected.
- [ ] **Content rating** questionnaire (IARC). Cartoon, no violence beyond a friendly cook-off → typically *Everyone*.
- [ ] **Ads declaration** ("contains ads" = yes), **target audience** (not primarily for children, or follow the
      Families policy if you target kids - then use a child-safe ad configuration).
- [ ] **Target API level** meets current Play requirement (check `targetSdkVersion` in `android/variables.gradle`).
- [ ] Upload the signed **AAB** and test it via **Internal testing** first.
- [ ] **New personal developer accounts:** run a **closed test with at least 12 testers opted in for 14
      continuous days** before you can apply for production access. Start it early, recruit testers
      (friends, Reddit, Discord), and collect feedback.
- [ ] Replace placeholder `appId` (`com.yourstudio.mergekitchen`), mock ad/IAP providers and the privacy URL.

## 9. Known limitations

* Ads, in-app purchases and the leaderboard are mocks until you plug real providers in (clearly marked above).
* Roman Urdu translations are hand-written - have a native speaker review them before launch.
* Emoji are rendered by the device's system emoji font; very old Android versions may show a few newer glyphs as boxes.
