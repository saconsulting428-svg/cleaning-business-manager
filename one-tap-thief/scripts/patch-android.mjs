// Run after `npx cap add android`: locks the app to portrait and hides system bars chrome.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const manifest = 'android/app/src/main/AndroidManifest.xml';
if (!existsSync(manifest)) { console.error('android/ not found — run `npm run android:add` first'); process.exit(1); }
let x = readFileSync(manifest, 'utf8');
if (!x.includes('screenOrientation')) x = x.replace('<activity', '<activity\n            android:screenOrientation="portrait"');
writeFileSync(manifest, x);
console.log('AndroidManifest: portrait locked');
