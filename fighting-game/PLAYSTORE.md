# Street Clash — Play Store par upload karne ka tareeka

Game ek PWA (installable web app) hai: `index.html`, `chars.js`, `stages.js`, `game.js`, `sw.js`,
`manifest.webmanifest` aur `icons/`. Play Store ko `.aab` file chahiye; neeche 2 aasaan raaste hain.

## Raasta 1 (sabse aasaan): PWABuilder
1. Poore `fighting-game/` folder ko kisi **HTTPS** hosting par daalo (GitHub Pages, Netlify, Vercel — free).
2. https://www.pwabuilder.com kholo, apna game ka URL daalo.
3. "Package for stores" -> **Android** -> Google Play. Ye `.aab` file + signing key banata hai.
4. Signing key ko **safe rakho** (khoyi to update nahi kar paoge).

## Raasta 2: Capacitor (offline, files app ke andar)
```
npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Street Clash" com.yourname.streetclash --web-dir=.
npx cap add android && npx cap open android     # Android Studio me Build > Generate Signed Bundle (.aab)
```
Android Studio me `AndroidManifest.xml` me `android:screenOrientation="sensorLandscape"` rakho.

## Play Console checklist
- Google Play Developer account (one-time $25 fee).
- App icon 512x512: `icons/icon-512.png`. Feature graphic 1024x500 aur 2+ screenshots (game ke).
- **Privacy Policy URL** (game koi data collect nahi karta — ek simple page bana lo).
- Content rating questionnaire (cartoon/fantasy violence, koi blood nahi).
- Target API level: Play Console jo maange (abhi latest). Package name unique rakho.
- Store listing me kisi dusre game ka naam (Tekken waghera) **mat** likho — trademark issue se app reject ho sakta hai.
  Saare 30 characters original hain.

## Test kaise karein
Local par: `python3 -m http.server` chalao, phir `http://localhost:8000/fighting-game/` kholo.
Phone par Chrome me kholo -> "Add to Home screen" se install karke offline test karo.
