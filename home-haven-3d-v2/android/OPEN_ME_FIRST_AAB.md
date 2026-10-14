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
kabhi build/run NAHI hua (wahan Android SDK nahi tha). Isliye pehli build mein koi Gradle/SDK error aaye to wo yahan dikhega.

## 3. Signed .aab banayein
1. **Build > Generate Signed App Bundle / APK > Android App Bundle**.
2. **Create new...** se keystore banayein (.jks), passwords aur alias likh kar **kahin mehfooz rakhein** —
   keystore kho gaya to aap app update nahi kar paayenge. (Play App Signing on rakhein, Google upload key maang lega.)
3. Build variant **release** -> Finish. File milegi: `android/app/release/app-release.aab`.

## 4. Play Console mein upload se pehle
- **App ID**: `com.oconsulting.homehaven3d` (`android/app/build.gradle` mein `applicationId`). Apna naam chahiye to upload se PEHLE badal lein — baad mein nahi badalta.
- **Version**: har naye upload par `versionCode` ek barhayein (`android/app/build.gradle`, abhi 1) aur `versionName`.
- **Target API**: yahan `targetSdkVersion 34` hai (`android/variables.gradle`). Play Store naye apps ke liye naya target maangta hai (2025 se API 35, aage aur naya).
  Agar Play Console "target API level too low" kahe to Capacitor 7+ par upgrade karna hoga:
  `npm i @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest @capacitor/screen-orientation@latest` phir `npx cap sync android`,
  aur Android Studio ka "AGP Upgrade Assistant" chalayein. Ye upgrade yahan test nahi hua.
- **Icon / splash**: abhi Capacitor ka default icon/splash hai (`android/app/src/main/res/mipmap-*`, `drawable*`). Apna icon Android Studio mein
  right-click `res` > **New > Image Asset** se lagayein. Play Store ke liye 512x512 icon aur feature graphic (1024x500) Console mein alag upload hota hai.
- **Privacy policy URL** aur Data safety form Console mein bharna zaroori hai. Game apna data sirf phone ke `localStorage` mein rakhta hai.
- **Ads**: AdMob plugin install NAHI hai — game mein 3 second ka demo ad dikhta hai. Asli ads chahiye to `@capacitor-community/admob` install karke AdMob IDs dalni hongi.
  Agar ads nahi chahiye to Play Console mein "contains ads: No" tabhi chunein jab demo ad bhi hata dein, warna review mein masla ho sakta hai.
- Content rating questionnaire aur target audience (bachon ke liye na ho to "13+/all" sahi chunein) bharein.

## Game badalna ho
`www/index.html` ko naye `Home_Haven_3D.html` se replace karein, phir is folder mein terminal kholkar `npx cap sync android` chalayein, phir Android Studio mein dobara build.
