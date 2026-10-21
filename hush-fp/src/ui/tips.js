/* Teaching content. SEQ: guided steps for the first four levels (shown one at a time in the hint bar, each completes when the player really does it).
   MECH: a one-time "NEW" card the first time a mechanic appears (the game holds still until the player taps Got it). Both are shown only once per save (save.tips) and
   can be switched off with the Hints setting. T is the tracker main.js fills in (distance walked, turned, events seen); w is the World. */
const near = (w, pred, r) => { const p = w.player; return w.objs.some(o => pred(o) && !(o.type === 'item' && o.taken) && Math.hypot(o.x + 0.5 - p.x, o.y + 0.5 - p.y) < r); };
const nearTile = (w, tile, r) => { const p = w.player, px = Math.floor(p.x), py = Math.floor(p.y), R = Math.ceil(r); for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const x = px + dx, y = py + dy; if (x >= 0 && y >= 0 && x < w.W && y < w.H && w.cells[y * w.W + x] === tile && dx * dx + dy * dy <= r * r) return true; } return false; };
const creatureNear = (w, type, r) => w.creatures.some(c => (!type || c.t === type) && (Math.hypot(c.x - w.player.x, c.y - w.player.y) < r || c.revealT > 0));

export const SEQ = {
  0: [
    { id: 'move', t: 'WALK', x: 'Drag the LEFT stick to walk (W A S D on a keyboard).', ok: (T) => T.dist >= 4 },
    { id: 'look', t: 'LOOK AROUND', x: 'Drag on the RIGHT side of the screen to turn the view.', ok: (T) => T.yaw >= 1.5 },
    { id: 'flash', t: 'FLASHLIGHT', x: 'Tap the flashlight icon in the bottom bar to switch it off, then on again.', ok: (T) => T.flash >= 2 },
    { id: 'map', t: 'MAP', x: 'Tap the MAP button (top right). It shows the rooms, your position and where to go next. Close it with the back arrow.', ok: (T) => T.map >= 1 },
    { id: 'door', t: 'DOORS', x: 'Walk into a door, or tap it, to open it. Doors make a little noise.', ok: (T) => T.doors >= 1 },
    { id: 'exit', t: 'ESCAPE', x: 'Follow the map to the glowing green EXIT sign and walk up to it.', ok: () => false }
  ],
  1: [
    { id: 'pulse', t: 'SONAR PULSE', x: 'Tap PULSE. It lights up walls, doors, objects and creatures for a few seconds.', ok: (T) => T.pulses >= 1 },
    { id: 'noise', t: 'SOUND IS DANGER', x: 'A pulse is LOUD. The noise bar at the top shows how much you are making. Use sonar sparingly.', ok: (T, w, now) => T.pulses >= 1 && now - T.firstPulse > 4 },
    { id: 'hidden', t: 'HIDDEN DOORS', x: 'A dead end? Stand near the walls and pulse: hidden doors appear. Then walk through.', ok: (T, w) => w.objs.some(o => o.type === 'door' && o.hidden && o.revealed) },
    { id: 'exit', t: 'ESCAPE', x: 'Reach the EXIT. Check the MAP if you are lost.', ok: () => false }
  ],
  2: [
    { id: 'key', t: 'KEYS', x: 'Find the brass key and walk over it (or tap it) to pick it up. The map shows where it is.', ok: (T) => !!T.picked.key },
    { id: 'bag', t: 'INVENTORY', x: 'Tap the BAG button to see what you carry.', ok: (T) => T.bag >= 1 },
    { id: 'lock', t: 'LOCKED DOORS', x: 'A door with a gold lock needs the key. Walk up to it and tap to unlock.', ok: (T, w) => w.objs.some(o => o.type === 'door' && o.lock === 'key' && o.unlockedByItem) },
    { id: 'crouch', t: 'CROUCH', x: 'Tap CROUCH to move silently. Quiet is safe, running is loud.', ok: (T) => T.crouched },
    { id: 'exit', t: 'ESCAPE', x: 'Go through the unlocked door and reach the EXIT.', ok: () => false }
  ],
  3: [
    { id: 'guard', t: 'A GUARD', x: 'A creature watches this place. It hears noise and sees you in the flashlight. Crouch and stay quiet near it.', ok: (T) => T.crouchNear >= 3 },
    { id: 'hide', t: 'HIDE', x: 'Walk up to a locker and tap it to hide inside. Tap again to come out. It only opens the locker if it SAW you go in.', ok: (T) => T.hid >= 1 },
    { id: 'card', t: 'KEYCARD', x: 'Find the keycard, then the card-reader door. Use the map.', ok: (T) => !!T.picked.card },
    { id: 'exit', t: 'ESCAPE', x: 'Reach the EXIT without being caught.', ok: () => false }
  ]
};

export const MECH = [
  { id: 'sprint', icon: 'i-run', t: 'SPRINT', x: 'The SPRINT button (next to the stick) makes you fast but LOUD, and drains stamina. A hunting creature is slower than your sprint: run, then hide.', when: (w) => w.spec.story === 4 && w.time > 6 },
  { id: 'glass', icon: 'i-warn', t: 'BROKEN GLASS', x: 'Glass on the floor is VERY loud. Crouch over it, or walk around it.', when: (w) => nearTile(w, 3, 6) },
  { id: 'water', icon: 'i-warn', t: 'WATER', x: 'Splashing carries far. Crouch in water, or keep to dry floor.', when: (w) => nearTile(w, 2, 5) },
  { id: 'vent', icon: 'i-hand', t: 'VENTS', x: 'Tap a vent grate to crawl through to the matching vent. Creatures are too big to follow.', when: (w) => near(w, o => o.type === 'vent', 7) },
  { id: 'radio', icon: 'i-radio', t: 'RADIO', x: 'The radio plays static where you stand. The creature walks to the sound: throw it, then slip the other way. One use each.', when: (w) => w.player.inv.radio > 0 },
  { id: 'code', icon: 'i-hand', t: 'KEYPAD DOORS', x: 'A keypad door needs a 4-digit code. Search for a NOTE with the number, then tap the door and type it.', when: (w) => near(w, o => (o.type === 'door' && o.lock === 'code') || o.type === 'note', 7) },
  { id: 'generator', icon: 'i-fuse', t: 'GENERATORS', x: 'Power doors need the generator started, and fuses to start it. It is VERY loud: have an escape route ready.', when: (w) => near(w, o => o.type === 'generator', 8) || w.player.inv.fuse > 0 },
  { id: 'valve', icon: 'i-hand', t: 'VALVES', x: 'Turn the bulkhead valve to open the sealed door it controls.', when: (w) => near(w, o => o.type === 'valve', 7) },
  { id: 'breaker', icon: 'i-fuse', t: 'BREAKERS', x: 'Flip ALL the breaker switches in the facility to restore power to the locked door. Their lights turn green. The map shows which are left.', when: (w) => near(w, o => o.type === 'breaker', 8) },
  { id: 'alarm', icon: 'i-warn', t: 'ALARMS', x: 'Some objects are wired to an alarm. Taking the first key or card here sets it off and tells every creature where you are. Be ready to hide.', when: (w) => !!w.spec.alarm && w.time > 3 },
  { id: 'logs', icon: 'i-book', t: 'RECOVERED LOGS', x: 'Glowing terminals hold recovered logs. They are optional, but they tell what happened here.', when: (w) => near(w, o => o.type === 'log', 5) },
  { id: 'stalker', icon: 'i-eye', t: 'THE STALKER', x: 'It patrols, follows noise and hunts what it sees. Break line of sight and hide in a locker, or crawl into a vent.', when: (w) => w.spec.story > 3 && creatureNear(w, 'stalker', 15) },
  { id: 'listener', icon: 'i-eye', t: 'THE LISTENER', x: 'Almost blind, but it hears everything: footsteps, doors, even sonar. Crouch and move slowly when it is close.', when: (w) => creatureNear(w, 'listener', 15) },
  { id: 'lightsout', icon: 'i-flash', t: 'LIGHTS OUT', x: 'The lights are dead here. Your flashlight and the sonar are all you have. Listen.', when: (w) => !!w.spec.lightsOut && w.time > 2 },
  { id: 'hunted', icon: 'i-warn', t: 'IT SEES YOU', x: 'When it hunts you: break line of sight, hide in a locker, crawl through a vent, or run. If it loses you it will search the area.', when: (w) => w.creatures.some(c => c.state === 'hunt') }
];
