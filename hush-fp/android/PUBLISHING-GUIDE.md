# Publishing guide (AAB banane se Play Store tak)

## A. AAB banana (Android Studio)
1. Open `HUSH-Android` in Android Studio, wait for Gradle sync to finish (bottom bar). If asked: *Install SDK Platform 36*, *Upgrade AGP*: accept.
2. (Optional but recommended) connect a real phone (USB debugging) and press **Run**. Check: game starts, tap to start gate, sound after first tap, touch stick/look/buttons, Back button (pauses in game, goes back in menus, "press back again to exit" on title), rotate the phone, switch to another app and back (game pauses).
3. `Build > Generate Signed App Bundle / APK > Android App Bundle`.
   * Key store path: create new `.jks` (e.g. `hush-upload.jks`), set passwords, alias `hush`, validity 25+ years, fill name/country.
   * **Back up the .jks and passwords** (cloud drive + offline copy). Never commit/share it.
   * Build variant: `release`. Finish.
4. Output: `app/release/app-release.aab` (about 5 MB).
5. Before every update: increase `versionCode` (and `versionName`) in `app/build.gradle`.

Command line alternative: copy `keystore.properties.example` to `keystore.properties`, run `keystore/make-keystore.(sh|bat)`, then `./gradlew bundleRelease` -> `app/build/outputs/bundle/release/app-release.aab`.

## B. Play Console checklist
1. Create developer account (one-time fee) and **Create app**: name `HUSH: Echoes in the Dark`, language, **Game**, **Free**.
2. **Store listing:** paste texts from `PlayStore/listing/store-listing.txt`; upload `app-icon-512x512.png`, `feature-graphic-1024x500.png`, 2-8 phone screenshots from `screenshots-phone/`. (Tablet screenshots are optional; the same landscape images can be reused.)
3. **Privacy policy:** upload `privacy-policy.html` somewhere public (GitHub Pages, your website, Google Sites) and paste the URL. Replace `<your support email here>` in the file first.
4. **App content:** Data safety (answers in `listing/data-safety-answers.md`), Content rating questionnaire (notes in `listing/content-rating-and-audience.md`), Target audience (13+/16+, not children), Ads = No, App access = all functionality available without login, Government/financial/health apps = No.
5. **Release:** Testing > Closed testing (or Production if your account type allows): upload the `.aab`, add release notes (`listing/release-notes.txt`), review, roll out. New personal accounts must run a closed test with the minimum number of testers for the minimum number of days Google currently requires before applying for production: check the Dashboard for the exact numbers.
6. **Play App Signing:** accept the default (Google manages the app signing key; your keystore is just the upload key).

## C. If something fails
* *"SDK location not found"*: Android Studio > Settings > Languages & Frameworks > Android SDK, install Platform 36 and Build-Tools; Studio writes `local.properties` for you.
* *Gradle/AGP version message*: use the suggested upgrade.
* *White/black screen on phone*: update **Android System WebView** / Chrome from the Play Store (the game needs WebGL 2).
* *No sound until you tap*: expected (browser audio policy): the first tap on the "start" screen unlocks it.
* *Upload rejected: package name already used*: change `applicationId` (see README).

## D. What I could NOT verify here
Real Gradle build / AAB generation, install on a real device, performance and audio on real phones, Play Console acceptance. Everything else (game logic on 40 levels, UI at five phone sizes, offline use, saves) is covered by the test suites in `hush-fp/tests`.
