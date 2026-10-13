# Neon Ricochet

A neon arcade survival brick-breaker built with **Phaser 3.80.1** (bundled locally in `lib/`), plain HTML/CSS/JS - no build step, no other dependencies.

## Run locally

Option A - just open `index.html` in a modern browser (works from `file://`).

Option B - serve it (recommended for mobile testing on your LAN):

```bash
cd pink-bounce
python3 -m http.server 8080      # or: npx http-server -p 8080
# open http://localhost:8080
```

## Modes, themes and skins

- **Classic Mode** - endless levels of blocks, barriers and moving obstacles.
- **Fortress Mode** - an unbreakable spiked vault with a single gate (the opening moves and narrows as levels rise). Everything inside is tough, destroyable blocks.
- **Shop** - spend coins (1 coin per 50 points) on 6 ball skins and 5 colour themes. **Achievements** pay coin rewards. **Leaderboard** keeps your 10 best local runs.
- All progress is saved in `localStorage` (`neonRicochet.v1`).

## Controls

| Action | Input |
| --- | --- |
| Move paddle | Mouse, touch drag, `A`/`D`, `←`/`→` |
| Launch ball | Click / tap / `Space` (auto-launches after 3 s) |
| Pause / resume | `P` / `Esc` or the pause button (also auto-pauses on focus loss) |
| Restart | `R` or the restart button |
| Mute | `M` or the speaker button |

## Rules

- 3 lives (max 9). Losing the ball through the red **slit** below the paddle costs a life only when *all* balls are gone. A fresh ball gets 2.5 s of protection after launch.
- Blocks: normal, reinforced (2-3 hits), bonus (guaranteed power-up), unbreakable barriers, and moving red obstacles that appear from level 4.
- Combo multiplier (up to x8) grows with each block hit and resets when the ball touches the paddle. Level clear bonus = 500 x level + 100 x lives. Levels are endless and get faster/denser; the paddle slowly narrows.
- Best score is tracked separately per mode.

## Power-ups

| Capsule | Effect |
| --- | --- |
| X3 | Splits the lowest ball into three |
| +3 | Adds three lives |
| FIRE (8 s) | Balls burn through breakable blocks in one hit |
| BIG (10 s) | Bigger ball, double damage |
| WALL (9 s) | Solid barrier above the slit |
| SHLD | Cancels the next life loss (until used) |
| SLOW (8 s) | Balls move at 60 % speed |
| WIDE (12 s) | Much wider paddle |

Active effects and timers are shown at the top of the playfield. Effects overlap freely and are cleared when a life is lost or the game restarts.

## Layout

```
index.html   page + HUD/overlay markup
style.css    HUD, menus, responsive layout
game.js      Phaser bootstrap, pause/restart/mute/focus handling
js/config.js     constants, power-up table, localStorage helpers
js/audio.js      synthesised WebAudio sound effects (no audio files)
js/levels.js     hand-made + endless procedural level generator
js/textures.js   canvas-generated art
js/progress.js   stats, coins, achievements, leaderboard
js/ui.js         HUD, home screen, shop and sheets
js/scenes.js     Boot + Menu scenes
js/gamescene.js  gameplay scene (Arcade Physics)
```
