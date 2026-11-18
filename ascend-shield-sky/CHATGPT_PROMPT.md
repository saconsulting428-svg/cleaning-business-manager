You are a senior HTML5 game developer and UI designer. Build a complete, polished 2D arcade physics game called **"Ascend: Shield & Sky"** (inspired by "Rise Up", but fixing its flaws). Deliver ONE self-contained `index.html` (HTML + CSS + vanilla JS, no build step, no external assets except an optional Google Font). Output the full code in one code block, no placeholders, no "rest of code here".

## 0. RULES FOR YOU (read first)
- Everything marked **[LOCKED]** must be implemented exactly as written. Do not redesign, rename, move or "improve" it.
- If something is unclear, choose the simplest option that matches this spec. Do not ask questions, do not skip features.
- Code must run with zero console errors on Chrome, Safari (iOS) and Firefox, mobile portrait and desktop.
- After the code, add a short "How to test" checklist.

## 1. TECHNOLOGY [LOCKED]
- HTML5 Canvas 2D for the game world; DOM/CSS for HUD and menus (crisp text, easy buttons).
- `requestAnimationFrame` loop with delta-time (capped at 50 ms) and 3 physics sub-steps per frame so a fast shield can never tunnel through small objects. Target a stable 60 FPS.
- HiDPI canvas (devicePixelRatio, max 2). Layout in CSS pixels, scale factor `S = clamp(min(W/420, H/760), 0.78, 1.25)` applied to all sizes.
- Input via Pointer Events (mouse + touch), plus keyboard (WASD/arrows, Esc/P = pause) and Gamepad API (left stick, Start = pause).
- Web Audio API synthesized sounds (hit, smash, star, damage, shield break, level up, checkpoint, UI click). No audio files. Sound toggle.
- `localStorage` (wrapped in try/catch) for auto-save. Pause automatically when the tab loses focus.
- Particle system with a hard cap (~600) and object reuse where possible. No gradient creation per obstacle per frame.

## 2. CORE GAMEPLAY [LOCKED]
- The hero is fixed at about 78% of screen height and gently sways left/right. The world scrolls down, which creates the feeling of rising.
- The player moves a circular **shield** (kinematic body: it moves where the finger/mouse is; it is never pushed by obstacles) to knock obstacles away.
- Mouse: shield follows the cursor. Touch: relative drag with the shield held ~60 px above the finger so the finger never hides it. Shield movement is smoothed (exponential follow) with a max speed cap.
- Shield velocity is measured every frame and transferred into obstacles on contact (a swing hits harder than a stationary block).

## 3. OBSTACLES & MOVEMENT (must feel physically right) [LOCKED]
Use real impulse-based collision, not fake bouncing:
- Obstacle types: **balls** (small), **blocks** (squares), **triangles**, **laser beams** (long thin glowing bars that keep spinning), **gates** (two staggered wide beams = slalom), **pyramids** of blocks, **boulders** (very heavy), **heavy steel clusters**, **tiny debris rain**.
- Shapes: circles and convex polygons. Use closest-point-on-polygon for circle-vs-polygon tests, with correct normal direction (including when the shield centre is inside).
- Each obstacle has mass, restitution, angular velocity, HP/toughness. On shield hit: separate by penetration depth, reflect relative velocity along the normal using restitution, divide the response by mass (heavy things move less), add a share of shield swipe velocity, and add spin from the tangential component.
- Circle-vs-circle collisions between obstacles (so ball piles scatter naturally). Soft bounce off the left/right walls.
- Spinning beams must keep a target spin speed (angular velocity relaxes back toward it after being hit).
- Obstacles that are hit very hard (impact power vs HP) **shatter** into particles. Knocked-up obstacles fly off the top and are removed.
- Spawn waves from weighted pattern functions with spacing that shrinks slowly with difficulty. New obstacle types unlock by level (balls L1, blocks L2, ball piles L3, triangles L4, gates L5, beams L6, pyramids L7, boulders L8, debris rain L9, heavy clusters L11). Never repeat the same pattern twice in a row.
- Fairness: the first wave of level 1 is a single slow ball dropping near the player's lane.

## 4. HEALTH & DAMAGE (fixes "one touch = death") [LOCKED]
- **Shield durability bar** (0–100). Damage = mass × approach speed × 0.028 × level scale. Heavy and fast = big damage; tiny debris or glancing hits = almost nothing (minimum 0.35, or zero if barely touching). Damage cooldown of 0.22 s per obstacle so one contact cannot hit twice.
- When durability reaches 0 the shield shatters (particles + sound) and is offline for ~2.8 s, then reboots at 50%. Durability regenerates slowly after 1.6 s without being hit. Cracks appear on the shield as durability drops.
- Hero has **3 hull hearts**. If an obstacle touches the hero: lose 1 heart, obstacle shatters, 1.7 s invulnerability (blinking), red screen vignette, shake. 0 hearts = run over.
- Finishing a level restores +1 heart and +30 durability. Repair pickups (green plus) appear occasionally when hurt.
- Mercy assist: each death on the same checkpoint reduces incoming damage by 9% (min 65%).

## 5. GAME MODES [LOCKED]
Main menu has a **Mode** switch with two modes:
1. **Levels mode** – structured progression. Level length = `85 + min(L,30)*3` meters (18 px = 1 m). Level 1 is a slow, forgiving tutorial: damage scale 0.3, slow rise speed (~82 px/s), 1–2 small balls at a time, timed hint messages ("Drag to move your shield", "Block the falling balls", "Your shield has a durability bar", "Collect stars"). Damage scale: L1 0.3, L2 0.5, L3 0.72, L4 0.88, then 1. Rise speed grows smoothly from 82 to ~255 over ~50 levels.
   - **Checkpoint every 10 levels** (levels 11, 21, 31 …): saved instantly, banner "⚑ CHECKPOINT". Dying restarts from the last checkpoint, never from level 1. Menu shows chips to pick any unlocked checkpoint.
2. **Infinite mode** – endless ascent with no level breaks. Difficulty and speed keep rising continuously with altitude (cap speed ~340 px/s, but keep adding pattern density and variety). Tracks "best altitude" separately. Same shield/hull/health rules. No checkpoints; a short breather (extra calm gap) every 1000 m with a "ZONE" banner.

## 6. ALTITUDE-DRIVEN BACKGROUND (the signature feature) [LOCKED]
The background must be driven by **altitude** (meters climbed; in Levels mode use the continuous level value) and must transition smoothly (smoothstep interpolation between keyframes; never hard cuts). The player should feel they are truly leaving Earth. Zones in this exact order:

| Altitude | Zone | What the player sees |
|---|---|---|
| 0 m | **Ground / Sunrise** | Start near the earth: a thin ground/horizon strip with hills, trees and tiny houses scrolls DOWN and away as the hero lifts off. Warm sunrise sky (pink → light blue), sun low on the horizon, birds. |
| ~150 m | **Blue Sky** | Bright blue sky, parallax clouds, sun high with soft glow. |
| ~400 m | **Golden Hour → Sunset** | Sun sinks toward the bottom, sky turns gold → orange → magenta, clouds tinted orange. |
| ~700 m | **Twilight** | Deep purple/indigo, first stars fade in, thin crescent **moon** rises on the right. Clouds fade out. |
| ~1000 m | **Night / Stratosphere** | Dark navy, many twinkling stars (parallax layers), full moon larger with craters, shooting stars occasionally. |
| ~1500 m | **Aurora Belt** | Green/teal/violet aurora ribbons (additive blending) waving across the sky, plus stars. |
| ~2200 m | **Outer Space** | Black space, dense stars, a big distant planet with rings and a nebula glow drifting by (parallax). Asteroids drift in the far background (decor only). |
| ~3200 m | **Interstellar Space** | Galaxy swirls, nebula clouds in purple/blue/pink, comets with tails, the Earth shrinking to a tiny blue dot at the bottom edge. |
| ~4500 m+ | **Alien Territory** | Alien flying saucers (UFOs) cruise across the background with glowing beams; cute aliens wave from windows; alien mothership silhouette appears. Some UFOs fire harmless colorful decor pulses. At 5500 m+ a rare "alien guardian" fly-by (visual only) with a banner "👽 You are not alone…". |

- Show a zone banner (name + subtitle) when entering each zone. HUD text colour must stay readable on both bright and dark skies (white text with dark shadow).
- Background decor is **non-colliding**; only obstacles hurt.
- Optional bonus: aliens in Infinite mode occasionally drop a rare golden star.

## 7. UI — FIXED LAYOUT [LOCKED]
Mobile-first portrait, container `max-width: 520px`, centered; dark body backdrop on desktop. Font: Fredoka (fallback system-ui). Style: glass panels (semi-transparent navy, blur, 1px light border, 24px radius), gradient buttons (cyan→indigo primary, green secondary), soft shadows, bounce on press. All taps ≥ 42 px.

**HUD (during play):**
- Top-left: big altitude "1143m" (38px bold), under it "LEVEL 12" (or "∞ INFINITE") and "⚑ Checkpoint: Level 11 • Best 2812m".
- Top-right: pill "⭐ 20" and a pause button.
- Under the top row: thin level-progress bar (Levels mode) / zone-progress bar (Infinite mode).
- Bottom: 3 heart icons on the left and the **shield durability bar** filling the rest (green → amber below 50% → red blinking below 25%, gold when Super Shield; text "SHIELD 97%" / "REBOOTING…" / "SUPER SHIELD 12s").
- Floating damage numbers, "+1" star pops, center banner for level/zone changes, tutorial hint text at ~34% height.

**Main menu:** logo "ASCEND" + "SHIELD & SKY", animated hero + orbiting shield in the middle (tapping empty space fires a test smash effect), bottom glass panel with: stats row (Best height / ⭐ stars / ⚑ checkpoint), mode switch (Levels | Infinite), big PLAY button, checkpoint chips, buttons Garage / Sound / Screen-shake toggle, optional-ad button, footer text "No forced ads — ever. Progress auto-saves.", and a small "Reset all progress" link (with confirm).

**Garage (shop):** header with back button, title, star balance. The hero preview stays visible in the top ~40% with the equipped trail streaming and the shield orbiting, and the sky slowly cycling through all zones. Bottom panel with 4 tabs: **Hero | Trail | Shield | Smash FX**; 3-column card grid (icon, name, price / Owned / Equipped). Tapping owned = equip; tapping locked = buy if affordable, otherwise toast "Need N more ⭐ — climb higher to earn them!". Hero tab also has a **character creator**: custom emoji input and 7 colour swatches to tint drawn heroes.

**Pause modal:** Resume, Sound, Shake, Restart from checkpoint, Menu.
**Run-over modal:** height, level, stars earned, checkpoint line, big green "Retry from Level N", Garage, Menu, plus two clearly-labelled optional ad buttons.

## 8. CUSTOMIZATION CONTENT [LOCKED]
- Heroes (drawn or emoji): Balloon (free), Rocket 60, Energy Orb 90, Ghost 120, Mini Planet 150, Sky Cat 80, Moon 180, Alien 200, UFO 250, Sunny 300, Dragon 450, Unicorn 600.
- Trails: None (free), Sparkle 40, Bubbles 80, Hearts 120, Fire 150, Stardust 220, Rainbow 350.
- Shields: Aqua (free), Mint 30, Sunset 50, Violet 80, Rose 80, Gold 200, Plasma (animated rainbow) 300.
- Smash FX: Sparks (free), Confetti 60, Snowfall 90, Starburst 100, Love Pop 140, Bubble Pop 160.
- Everything is bought with in-game stars only. Stars come from collecting star pickups (1 each, rare golden = 5) and a level-complete bonus. No real-money purchases anywhere.

## 9. MONETIZATION — FAIR [LOCKED]
- **Zero** forced, interstitial or auto-playing ads. No ad after death, none on "Skip", none on retry.
- Ads exist only behind explicit, clearly-labelled "Optional" buttons: (a) start next run with a 15 s Super Shield, (b) revive once per run with a 15 s Super Shield, (c) double the stars from this run.
- Ad modal: 15 s progress bar, "No thanks / Close" always visible and free, "Claim reward" appears only after completion. Wrap everything in an `AdProvider.show(title, sub, onReward)` object so a real rewarded-ad SDK can be dropped in later.
- Super Shield: bigger shield, no damage, obstacles shatter in one hit.

## 10. JUICE & POLISH [LOCKED]
- Particle explosions on every smash (style from equipped Smash FX), screen shake on heavy impacts (toggle in settings), red vignette on hull damage, flashing obstacle on hit, collision sparks.
- Trails emit from the hero; star pickups have glow, pulse and are gently magnetised toward the shield.
- Smooth animated banners, button press animations, blinking invulnerability, shield cracks, combo pitch-up on consecutive star pickups.
- Haptics via `navigator.vibrate` where available.

## 11. SAVE DATA [LOCKED]
Auto-save to localStorage on every level complete, purchase, death, pause and tab hide: stars, best altitude (per mode), best level, checkpoint, tutorial-done flag, owned + equipped cosmetics, custom emoji/colour, settings.

## 12. ACCEPTANCE CHECKLIST (verify before answering)
1. Level 1 can be completed by a first-time player without taking more than trivial damage.
2. Reaching level 11 saves a checkpoint; dying afterward restarts at level 11.
3. A heavy boulder hit clearly hurts more than debris; glancing hits do almost nothing.
4. Shield bar, hearts, shield break + reboot, and repair pickup all work.
5. Infinite mode runs endlessly and the background passes through: sunrise/ground → sky → sunset → twilight/moon → night → aurora → outer space → interstellar → aliens/UFOs.
6. Garage: buy, equip, preview, custom emoji, tint all work and persist after reload.
7. No ad ever appears unless a player presses an "Optional" button.
8. Works with mouse, touch, keyboard, gamepad; no console errors; ~60 FPS.

Now write the complete `index.html`.
