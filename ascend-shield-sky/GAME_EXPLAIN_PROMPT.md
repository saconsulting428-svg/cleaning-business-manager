# Prompt: Explain "Ascend: Shield & Sky" (complete feature guide)

Copy everything below the line into ChatGPT / Claude / any AI. Change the **TASK** line at the end to choose what you want (a tutorial, a store description, a video script, a GDD, a recreation spec, a pitch).

---

You are a game designer and technical writer. Below is the COMPLETE, factual description of a finished game called **"Ascend: Shield & Sky"**. Treat it as the single source of truth: do not invent features that are not listed, and do not leave any listed feature out. Explain it clearly for the audience named in the TASK line.

## 1. What the game is
A 2D arcade physics game for phones and desktop browsers (one HTML file, Canvas 2D + CSS, no build step). A hero (balloon, rocket, orb, emoji…) rises continuously from the ground to deep space. The hero cannot move. The player moves a circular **shield** to knock away falling obstacles. It is inspired by "Rise Up" but fixes its main player complaints: forced ads, brutal level 1, no save progress, instant death from one tiny touch.

## 2. Controls
- **Mouse:** shield follows the cursor (no click needed).
- **Touch:** drag anywhere; the shield stays about 60 px above the finger so it is never hidden. Tapping far away snaps the shield near the finger.
- **Keyboard:** WASD / arrow keys move the shield. Esc or P = pause/resume.
- **Gamepad:** left stick or D-pad moves the shield, Start = pause.
- Shield motion is smoothed and speed-capped; physics runs in 3 sub-steps per frame so a fast shield cannot pass through small objects. The shield's own speed is measured and added to every hit, so a hard swing smashes things and a stationary shield only blocks.
- The game auto-pauses when the tab/window loses focus.

## 3. Core loop
Obstacles spawn above the screen in "waves" (patterns) and fall toward the hero while the world scrolls. The player blocks, deflects or smashes them, collects ⭐ stars, survives the level, and keeps climbing. Altitude is counted in meters (18 pixels = 1 m).

## 4. Health system (the main fairness fix)
- **Shield durability bar (0–100):** each shield hit does damage = obstacle mass × approach speed × 0.028 × level damage scale × mercy factor. Heavy + fast = big damage; tiny debris or glancing hits = almost nothing (minimum 0.35, or 0 if barely touching). Each obstacle can only damage once per 0.22 s.
- **Shield break:** at 0 durability the shield shatters (particles, sound, screen shake) and is offline for 2.8 s (1.8 s in the first levels), then reboots with 50% durability (80% in early levels).
- **Regeneration:** after 1.6 s without being hit, durability regenerates (7/s normally, 18/s in early levels). Cracks appear on the shield as durability drops; the bar goes green → amber (<50%) → red blinking (<25%).
- **Hull hearts (3):** if an obstacle actually touches the hero, lose 1 heart, the obstacle shatters, 1.7 s blinking invulnerability, red screen vignette, shake. 0 hearts = run over.
- **Recovery:** each completed level gives +1 heart and +30 durability. Green "repair" pickups (+45 durability, +1 heart) appear sometimes when you are hurt.
- **Mercy assist:** every death on the same start point lowers incoming damage by 9% (down to 65%).
- **Damage scale by difficulty level:** L1 = 30%, L2 = 50%, L3 = 72%, L4 = 88%, L5+ = 100%.

## 5. Obstacles and physics
Shapes: circles and convex polygons (squares, triangles, long beams). Collisions use real impulses: separate by penetration depth, reflect relative velocity using restitution, heavier objects move less, a share of the shield's swipe velocity is added, and the hit point adds spin. Balls also collide with each other so piles scatter. Obstacles bounce softly off the side walls; knocked-up obstacles fly off the top and are removed. Each obstacle has HP: a hard enough hit shatters it into particles (cracks appear when damaged; they flash white when hit). Big smashes (mass ≥ 1.5) can drop a star.

Wave patterns and the difficulty level where they unlock:
| Pattern | Unlocks | Description |
|---|---|---|
| Sprinkle | L1 | a few small balls (L1: only 1–2, slow; first wave is a single ball near the hero's lane) |
| Blocks | L2 | spinning squares |
| Ball pit | L3 | tight cluster of small balls |
| Triangles | L4 | spinning triangles |
| Gates | L5 | two staggered wide beams (slalom) |
| Laser beams | L6 | long glowing bars that keep spinning (two counter-rotating beams later) |
| Pyramid | L7 | stacked blocks |
| Boulder | L8 | very heavy ball with escort balls |
| Debris rain | L9 | many tiny, low-damage pieces |
| Heavy cluster | L11 | steel balls, heavy and dangerous |
The same pattern never repeats twice in a row. Gaps between waves shrink from ~430 px to ~235 px as difficulty rises.

## 6. Pickups
- ⭐ Star = 1 coin; rare golden star = 5 (about 7% of waves). Stars are gently pulled toward the shield (magnet) and give a pitch-rising "combo" sound when collected quickly.
- 🟢 Repair pickup (see health).
- Stars are the only currency.

## 7. Game modes
**Levels mode:** level length = 85 + min(level,30)×3 meters. Rise speed grows smoothly from ~82 px/s (level 1) to ~255 px/s around level 50, then slowly to a cap. Level 1 is a forgiving tutorial with timed hints: "Drag to move your shield", "Block the falling balls", "Your shield has a durability bar", "Collect stars". Completing a level gives 3 + min(level,20) bonus stars. **Checkpoints are saved at levels 11, 21, 31…** (banner "⚑ CHECKPOINT"). Dying restarts from the last checkpoint, never level 1; the menu has chips to start from any unlocked checkpoint.

**Infinite mode:** endless climb, no level breaks. Difficulty rises continuously (one "virtual level" ≈ every 110 m). Every 1000 m you get a "REACHED" banner, +1 heart, +30 shield and +8 stars, plus a short calm gap. It tracks its own best altitude. No checkpoints; dying restarts from 0.

## 8. The world changes with altitude (both modes)
Zone banners appear when you enter a new zone; the sky colour blends smoothly between zones.
| Altitude | Zone | What you see |
|---|---|---|
| 0 m | 🌅 Sunrise | ground with hills, trees and houses that fall away as you lift off; low sun, pink sky, birds |
| 150 m | ☀️ Blue Sky | bright sky, parallax clouds, sun high |
| 300 m | 🌤️ Golden Hour | gold sky, sun sinking |
| 450 m | 🌇 Sunset | orange/magenta sky, orange clouds, sun sets |
| 700 m | 🌆 Twilight | purple sky, first stars, crescent moon rises |
| 1000 m | 🌙 Night Sky | stars, full cratered moon, shooting stars |
| 1500 m | 🌌 Aurora Belt | green/teal/violet waving aurora ribbons |
| 2200 m | 🪐 Outer Space | black sky, dense stars, big ringed planet, drifting asteroids |
| 3200 m | 🌠 Interstellar | rotating galaxy, nebula glow, comets, Earth shrinking to a tiny blue dot |
| 4500 m+ | 👽 Alien Territory | UFOs with waving green aliens and tractor beams; mothership at 5000 m+; a giant 👽 "guardian" at 5500 m+ with the banner "You are not alone…" |
All background decoration is non-colliding; only obstacles hurt. The HUD text stays readable on bright and dark skies.

## 9. Super Shield
Lasts 15 s: shield grows 45%, glows gold with a rotating ring, takes no damage, hero cannot be hurt, and obstacles shatter much more easily. Obtained only from optional ads (below).

## 10. Monetization (fair, ad-free by default)
- **Zero forced ads.** No ad after death, on retry, on skip or on pause.
- Three clearly labelled **optional** rewarded-ad buttons: (a) start the next run with a Super Shield (menu), (b) revive once per run with a Super Shield (game-over screen), (c) double the stars earned this run (game-over screen).
- The ad window has a 15 s progress bar, a "No thanks / Close" button that is always available and free, and "Claim reward" only appears after the full 15 s. Right now the "ad" is a placeholder video; a real rewarded-ad SDK plugs into one function, `AdProvider.show()`.
- Every cosmetic is earnable with stars; there are no real-money purchases.

## 11. Garage (shop and character creator)
Four tabs, 3-column card grid (icon, name, price / Owned / Equipped). Tap an owned item to equip; tap a locked item to buy it; if short on stars a message says exactly how many more are needed. A live preview shows the hero floating with the trail streaming, the shield orbiting, and the sky slowly cycling through every zone. Tapping the preview fires a test smash effect.
- **Hero:** Balloon (free), Rocket 60, Sky Cat 80, Energy Orb 90, Ghost 120, Mini Planet 150, Moon 180, Alien 200, UFO 250, Sunny 300, Dragon 450, Unicorn 600. Character creator: type **any custom emoji** (free) and tint drawn heroes with 7 colour swatches.
- **Trail:** None (free), Sparkle 40, Bubbles 80, Hearts 120, Fire 150, Stardust 220, Rainbow 350.
- **Shield colour:** Aqua (free), Mint 30, Sunset 50, Violet 80, Rose 80, Gold 200, Plasma (animated rainbow) 300.
- **Smash FX:** Sparks (free), Confetti 60, Snowfall 90, Starburst 100, Love Pop 140, Bubble Pop 160.

## 12. Screens and UI
- **Main menu:** logo, floating hero with orbiting shield, stats (best height, ⭐ stars, checkpoint or best zone), mode switch (Levels / Infinite), big PLAY button, checkpoint chips, Garage / Sound / Shake buttons, optional Super-Shield ad button, the promise "No forced ads — ever", and a "Reset all progress" link that needs two taps to confirm.
- **HUD:** big altitude, level (or "∞ Infinite • zone name"), checkpoint and best line, ⭐ star counter, pause button, progress bar (level progress, or zone progress in Infinite), 3 hearts and the shield bar (shows percent, "REBOOTING…", or "SUPER SHIELD 12s"). Floating damage numbers, "+1" star pops, centre banners, tutorial hints.
- **Pause:** Resume, Sound, Screen-shake toggle, Restart from checkpoint, Menu.
- **Run over:** height, level, stars earned, checkpoint/best line, "Retry from Level N" (or "Play again"), Garage, Menu, and the two optional ad buttons (Revive, Double stars).

## 13. Juice and polish
Particle explosions on every smash (style = equipped Smash FX), screen shake on heavy impacts (can be turned off), red vignette on hull damage, white flash on hit obstacles, collision sparks, glowing pulsing stars, blinking invulnerability, shield cracks, trail particles from the hero, haptic vibration on phones, synthesized Web Audio sounds (hit, smash, star combo, hurt, shield break, reboot, level up, checkpoint, UI click) with a sound toggle. Runs at 60 FPS with a particle cap and HiDPI canvas scaling.

## 14. Saving
Auto-saved in the browser (localStorage) on level complete, purchase, death, pause and tab hide: stars, best altitude (Levels and Infinite separately), best level, checkpoint, tutorial-done flag, mode, owned and equipped cosmetics, custom emoji/colour, sound and shake settings. Progress is per browser/device.

## 15. Technology summary
Single HTML file; HTML5 Canvas 2D for the world, DOM/CSS for HUD and menus; `requestAnimationFrame` with capped delta-time; Pointer Events, Keyboard and Gamepad APIs; Web Audio API synthesis; localStorage; `navigator.vibrate`; no external assets except the Google font Fredoka.

---

**TASK:** (choose one, delete the others)
1. Write a beginner-friendly "How to play" guide with headings for controls, health, modes, zones, shop and tips.
2. Write an App-Store / Play-Store style description with a short pitch, feature bullets and the "no forced ads" promise.
3. Write a 90-second gameplay-trailer video script.
4. Write a full Game Design Document with sections for mechanics, systems, balance numbers, progression and monetization.
5. Write a technical spec so another developer could rebuild this exact game.
6. Give me 15 pro tips for getting the highest altitude in Infinite mode.

Answer in clear English with headings and short paragraphs (or Roman Urdu if I say so).
