# HUSH: Echoes in the Dark: Android Studio project + Play Store pack

## Is zip mein kya hai
```
HUSH-Android/          <- Android Studio project (isko open karo)
  app/src/main/assets/www/index.html   <- poora game (offline, 4 MB)
  app/src/main/java/com/hushgame/echoes/MainActivity.java   <- WebView wrapper
  app/src/main/res/mipmap-*            <- APP ICON (adaptive + legacy + round + themed)
  keystore/                            <- signing key banane ki scripts
PlayStore/
  app-icon-512x512.png                 <- Play Console icon
  feature-graphic-1024x500.png         <- Play Console banner
  screenshots-phone/ (7 x 1920x1080)   <- Play Console screenshots
  privacy-policy.html / .md            <- privacy policy (URL pe host karna hai)
  listing/                             <- title, descriptions, data safety, rating notes, release notes
PUBLISHING-GUIDE.md    <- step by step: AAB banana + Play Console
```

## .aab banane ka sabse chhota tareeqa (5 steps)
1. **Android Studio** (latest stable, Narwhal ya naya) install karo. JDK 17+ uska bundled aata hai.
2. Zip extract karo, Android Studio mein **File > Open > `HUSH-Android`** folder choose karo. "Trust project" dabao.
3. Sync hone do (internet chahiye, pehli baar Gradle/SDK 36 download hoga). Agar Studio **"Update Android Gradle Plugin"** ya "Install missing SDK platform 36" bole to **accept karo**.
4. Menu: **Build > Generate Signed App Bundle / APK > Android App Bundle > Next > Create new...** (keystore banao, password aur .jks file **safe jagah backup** karo) > Next > **release** > Create.
5. File milegi: `HUSH-Android/app/release/app-release.aab` -> ye Play Console mein upload hoti hai.

Pehle phone par test karna ho: phone USB debugging on karke Studio mein **Run (green play)** dabao.

Icon: `app/src/main/res/mipmap-*/` mein hai. Install ke baad phone ke launcher mein monster ka icon dikhega (naam: HUSH).

**Package name** `com.hushgame.echoes` hai. Agar apna naam chahiye to **pehli upload se pehle** `app/build.gradle` mein `applicationId` aur `namespace`, aur Java folder/`package` line badal do (baad mein badal nahi sakte).

## Zaruri baatein (sach)
* Is environment mein Android SDK download nahi ho sakta, isliye **maine .aab khud build nahi kiya**. Java code ko Android 16 API ke against compile-check kiya hai, aur game HTML ko 40 levels ke saath browser mein test kiya hai, par **asli Gradle build aur asli phone par test aapke Studio mein hoga**. Agar Gradle koi version complain kare to Studio ka suggested fix accept karo (AGP version `build.gradle` mein 8.13.0 hai).
* Game abhi tak **asli phone par test nahi hua** (FPS, garmi, touch feel, audio). Play Store par daalne se pehle 2-3 alag Android phones par chalake dekho.
* Naye personal developer account ko Play Store par production se pehle **closed testing (kam se kam 12 testers, 14 din)** karni padti hai, current rule Play Console mein check karo.
* `targetSdk 36` rakha hai (2026 ki requirement ke hisaab se). Play Console agar kuch aur maange to `app/build.gradle` mein update karo.
