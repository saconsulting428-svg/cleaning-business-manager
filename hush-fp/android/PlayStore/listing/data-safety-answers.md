# Play Console > App content > Data safety  (answers for this build)

The app ships NO internet permission, no analytics, no ads, no accounts, no third-party SDKs (only AndroidX WebView helpers).

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | Not applicable (nothing is collected or transmitted) |
| Do you provide a way for users to request that their data be deleted? | Not applicable (progress is stored only on the device; uninstalling deletes it. Settings > Reset progress clears it in-game) |

Data kept ON the device only (not "collected" in Play's sense because it never leaves the device): game progress, stars, settings in WebView localStorage.

Permissions declared: `android.permission.VIBRATE` (haptic feedback). Nothing else.

Re-check this table if you ever add ads, analytics, Firebase, Play Games or any network feature.
