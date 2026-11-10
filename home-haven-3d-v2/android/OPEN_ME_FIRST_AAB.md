# Home Haven 3D — Android Studio se .aab banane ke steps

Is zip mein poora Capacitor Android project hai (game `www/index.html` mein pehle se copy aur sync ho chuka hai,
`node_modules` bhi shamil hai, to `npm install` ki zaroorat nahi).

## 1. Android Studio mein kholein
1. Android Studio (Koala/Ladybug ya naya) install karein — isi mein JDK 17+ aur Android SDK aa jata hai.
2. **File > Open** -> is zip ko extract karke **`HomeHaven3D/android`** folder chunein
   (andar wala `android` folder, jis mein `gradlew` aur `settings.gradle` hai — bahar wala nahi).
3. "Trust project" -> Gradle sync khud chalega (pehli baar internet chahiye, 5-10 min). Agar SDK 34 install karne ko kahe to Install karein.

## 2. Pehle debug mein chala kar dekhein (zaroori)
Phone USB debugging ke saath jodein ya emulator banayein -> **Run ▶**. Ye project is development environment mein
kabhi build/run NAHI hua (AdMob plugin ke saath bhi nahi) (wahan Android SDK nahi tha). Isliye pehli build mein koi Gradle/SDK error aaye to wo yahan dikhega.

## 3. Signed .aab banayein
1. **Build > Generate Signed App Bundle / APK > Android App Bundle**.
2. **Create new...** se keystore banayein (.jks), passwords aur alias likh kar **kahin mehfooz rakhein** —
   keystore kho gaya to aap app update nahi kar paayenge. (Play App Signing on rakhein, Google upload key maang lega.)
3. Build variant **release** -> Finish. File milegi: `android/app/release/app-release.aab`.

## 4. Play Console mein upload se pehle
- **App ID**: `com.oconsulting.homehaven3d` (`android/app/build.gradle` mein `applicationId`). Apna naam chahiye to upload se PEHLE badal lein — baad mein nahi badalta.
- **Version**: har naye upload par `versionCode` ek barhayein (`android/app/build.gradle`, abhi 1) aur `versionName`.
- **Target API**: ab Capacitor 8 par hai — `compileSdk/targetSdk 36`, `minSdk 24`, AGP 8.13, Gradle 8.14 (Play ki naye apps ke liye API 36 ki shart poori). Java 21 chahiye (Android Studio ka bundled JDK kaafi hai). Android Studio recent hona chahiye (Narwhal 3 / Otter ya naya).
- **Icon / splash**: naya house icon + splash lag chuka hai. Play Console ke liye `store/play_store_icon_512.png` aur `store/feature_graphic_1024x500.png` upload karein.
- **Privacy policy URL** aur Data safety form Console mein bharna zaroori hai. Game apna data sirf phone ke `localStorage` mein rakhta hai.
- **Ads (AdMob)**: `@capacitor-community/admob` installed hai, aapke real IDs game mein lage hain (App ID manifest mein). Banner: home (portrait) + puzzle screens; interstitial: har 4th win ke baad (kam se kam 2 min gap); rewarded: existing 'Watch ad' buttons. **Apne phone par test karte waqt real ads par khud click mat karein** (AdMob account ban ho sakta hai) — test ke liye `Home_Haven_3D.html` mein `testing: false` ko `true` karke sync karein, release se pehle wapas `false`. Play Console mein 'Contains ads: Yes' chunein aur Data safety mein advertising ID declare karein. Naye AdMob unit IDs ko live hone mein kuch ghante lag sakte hain (shuru mein ad blank aa sakta hai).
- Content rating questionnaire aur target audience (bachon ke liye na ho to "13+/all" sahi chunein) bharein.

## Game badalna ho
`www/index.html` ko naye `Home_Haven_3D.html` se replace karein, phir is folder mein terminal kholkar `npx cap sync android` chalayein, phir Android Studio mein dobara build.
