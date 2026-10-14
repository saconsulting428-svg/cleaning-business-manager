# Android build (Capacitor 6)

The game is a single HTML file, so Android packaging is a thin Capacitor WebView wrapper.
**Status: this scaffold was generated and syncs, but no APK was built or run on a device/emulator in the environment
this project was developed in (no Android SDK available there).** Treat the first build as untested.

## Requirements
- Node 18+, JDK 17, Android Studio (or the Android command-line SDK, API 34) with `ANDROID_HOME` set.

## Build a debug APK
```bash
cd android
npm install
npm run sync            # copies ../Home_Haven_3D.html into www/ and runs `cap sync android`
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```
Or open `android/android` in Android Studio and press Run.

## Orientation
Both orientations work (the UI is responsive; Build mode puts the item panel on the left in landscape).
Automatic landscape-for-Build is **off by default**: Settings -> "Auto landscape in Build mode".
When enabled it calls the Capacitor ScreenOrientation plugin (already listed in package.json) on entering/leaving Build.
Verify this on your target devices before turning it on by default (`S.autoRot` in `Home_Haven_3D.html` / `DEF()`).

## Ads
The original AdMob wrapper is untouched: it uses `@capacitor-community/admob` when installed, otherwise a 3-second demo ad.
