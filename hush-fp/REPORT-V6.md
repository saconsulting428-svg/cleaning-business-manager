# HUSH-FP v6 (release build: `HUSH-FP.html`)

Build: `node tools/build.mjs src/main.js HUSH-FP.html` (release: no test hooks) and `HUSH_TEST=1 node tools/build.mjs src/main.js HUSH-FP-test.html` (test build used by `tests/*.cjs`).

## Fixed (requested)
1. Sealed-room creatures patrol again (`pickRoamRoom` accepts any reachable tile of a room, not the landmark-blocked centre).
2. Machine / tank / metal / crate props no longer blow out to white under the flashlight (darker, less glossy material).
3. Escape closes the open log / note / keypad overlay like their buttons.
4. Old saves migrate: `src/logic/migrate.js` re-indexes stars / best times / last level by level name; newly inserted levels are credited with 1 star when the level after them is already cleared so the unlock chain never re-locks old progress. A save that already holds data past index 29 is treated as a 40-level save. (Honest limit: a 30-level-era save and a save from my own v4/v5 test builds with fewer than 30 levels played cannot be told apart; they are read as old.)
5. All 40 levels are generated at boot (+~0.1 s, no heap change measured).
6. **Reported by you:** after leaving a locker the player was stuck (all 298 lockers: it was placed 0.62 tile out, inside the locker's solid tile). Now placed 0.9 tile out; 298/298 lockers and 16/16 vent exits tested in all four directions.
7. **Reported by you:** walking up to the exit (within 1.2 tiles) now finishes the level, no tap needed.

## Additional issues found and fixed
- Stray taps / keys pressed while paused, loading or in a modal fired on resume (input edges are now cleared).
- Double tap on Retry / Next could start two level loads (re-entrancy guard).
- **GPU texture leak**: every creature's skeleton bone texture was never freed (3 per load on 3-monster levels); skeletons and mixers are now disposed.
- A hunting creature whose target was unreachable stood there hunting forever (gives up after 3 s with no path).
- A level with a hidden door could be soft-locked by spending all sonar charges before finding it: one charge now returns after 20 s (only on levels with a secret gate).
- `pickup()` could double-count an item.
- Old saves lost the "objective markers" default; settings from corrupted saves (strings, negatives) are now sanitised; corrupted/blocked localStorage cannot break boot.
- Objective chip could overlap the noise meter with long objective text on small phones.
- Touch: `touch-action: none` on the game surface, long-press context menu suppressed.
- Delayed sounds (sniff growl, valve thump, director beats) are cancelled by level change / pause / game over.
- Release build: `__TEST__` compiled out (no `window.HUSH`, no `?test`/`?unlock`/`?adapt`/`?noglb`).
- Minor per-frame allocation in the render loop removed (creature sort / awake filter).

## Verified on this build
`gen` 40/40 solvable, `play` 40/40, `ai` 17/17, `story` 9/9, `qa.mjs` 29/29 (reachability of every interactable, spawn safety, targeting, locker/vent exits, exit, soft-lock guard, patrol, door/valve/generator/code/locker semantics, save migration), `patrol` 0/47 bad, `fuzz` 240 runs / 1,309 game-minutes with no invariant violations, `ui` 41/41, `monster` 23/23, `glb` 18/18, `layout` 21/21, `qa.cjs` 25/25 (touch, pause/retry safety, monster integration, memory over 16 loads), `qa2.cjs` (90 screens at 5 phone sizes, no clipping/overlap), `qa3.cjs` 29/29 (release build offline, real taps, save robustness), `explore` no findings, `page.cjs` all 40 levels completed in the real page.

## Not verified / limits
Audio not listened to. No real phone run (frame rate, thermal, touch feel) and no real-device browser matrix. Performance numbers are software-GL only (3-monster levels ~112k triangles in the test counter). No Android wrapper exists yet (see blockers in the chat report).
