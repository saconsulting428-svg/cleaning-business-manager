/* HUSH: Echoes in the Dark - 40 level specs. The generator turns each spec into a deterministic facility layout (rooms, corridors, gates, items, creatures).
   gates: the locks between you and the exit, in the order they appear along the route. key/card = an item somewhere behind you; power = find fuses and run the generator;
   code = read a note, type the code; valve = turn a bulkhead valve; secret = a hidden door that only a sonar pulse reveals. */
export const CHAPTERS = [
  { name: 'Abandoned Facility', line: 'Find a way out of the facility.', theme: 'concrete' },
  { name: 'The Flooded Section', line: 'The machines still run. So does it.', theme: 'flood' },
  { name: 'The Nest', line: 'It was never the only one.', theme: 'nest' }
];
const S = (name, hint, ch, seed, rooms, o) => Object.assign({ name, hint, ch, seed, rooms, gates: [], creatures: [], pulses: 3, glass: 0, lockers: 3, vents: 0, radio: false, water: false, dark: false, fuses: 1, lightsOut: false, par: 0 }, o || {});
export const LEVELS = [
  /* chapter 1 */
  S('First Contact', 'Walk with the left stick, look with the right. Open doors with USE. Reach the exit.', 0, 11, 4, { tutorial: 'move', lockers: 1 }),
  S('Echo', 'A dead end? Use a sonar PULSE to see what the dark is hiding.', 0, 12, 5, { gates: ['secret'], tutorial: 'pulse', lockers: 1 }),
  S('Reception', 'Keys are kept on desks, not on doors. Check the side rooms.', 0, 41, 5, { gates: ['key'], tutorial: 'key', lockers: 1 }),
  S('Stay Low', 'It is watching this place. CROUCH: it sees a crouching survivor only from close up.', 0, 13, 5, { creatures: ['sentinel'], gates: ['card'], tutorial: 'crouch', lockers: 2 }),
  S('Broken Glass', 'Debris is loud. Crouch over it, or something will come.', 0, 14, 5, { creatures: ['stalker'], gates: ['key'], glass: 7, lockers: 2 }),
  S('Hold Your Breath', 'Hide in a locker and let it walk past. Never run in front of it.', 0, 15, 6, { creatures: ['stalker'], gates: ['card'], lockers: 4, tutorial: 'hide' }),
  S('Keycard', 'The exit is locked. The keycard is somewhere behind you.', 0, 16, 6, { creatures: ['sentinel'], gates: ['card'], alarm: true }),
  S('Security Office', 'The code is on a note. A guard stands in the corridor: wait for it to leave.', 0, 42, 6, { creatures: ['sentinel'], gates: ['code'], lockers: 2 }),
  S('The Long Way Round', 'Vents are too small for it. Pulses find the hidden ones.', 0, 17, 7, { creatures: ['stalker', 'sentinel'], gates: ['breaker', 'card'], breakers: 2, vents: 1 }),
  S('Bait', 'It goes to where the sound was made. Use the radio, then slip past.', 0, 18, 6, { creatures: ['stalker'], gates: ['key'], radio: true, alarm: true, tutorial: 'radio' }),
  S('Observation Deck', 'Two locks, one of them hidden. Pulse near the glass.', 0, 43, 7, { creatures: ['stalker', 'sentinel'], gates: ['card', 'secret'], vents: 1 }),
  S('Crawlspace', 'A hidden door and a vent. Pulse, listen, move.', 0, 19, 7, { creatures: ['stalker'], gates: ['secret', 'key'], vents: 1 }),
  S('Run', 'It has seen you. RUN. Find the vent.', 0, 20, 7, { creatures: ['stalker'], gates: ['card'], vents: 1, hunted: true, pulses: 2 }),
  /* chapter 2 */
  S('Static', 'The radio still works. Use it to pull the guard away from the keycard.', 1, 21, 7, { creatures: ['sentinel'], gates: ['card'], radio: true, water: true }),
  S('Power Down', 'The exit has no power. The generator is loud.', 1, 22, 7, { creatures: ['stalker'], gates: ['power'], fuses: 1, water: true }),
  S('Pump Station', 'Turn the valve, then find the key. Water carries every step.', 1, 44, 7, { creatures: ['stalker'], gates: ['valve', 'key'], water: true }),
  S('Thin Walls', 'This one is nearly blind. It hears everything. Crouch near it.', 1, 23, 7, { creatures: ['listener'], gates: ['key'], water: true }),
  S('Service Tunnels', 'Doors are loud when they open. Know where it is first.', 1, 24, 8, { creatures: ['stalker'], gates: ['breaker', 'key'], breakers: 2, water: true }),
  S('Descent', 'Open the bulkhead valve, then find the card.', 1, 25, 8, { creatures: ['stalker', 'listener'], gates: ['valve', 'card'], water: true }),
  S('Short Circuit', 'The code is written somewhere dry. The listener hears every door.', 1, 45, 8, { creatures: ['listener'], gates: ['breaker', 'card'], breakers: 3, water: true }),
  S('Feedback', 'It stands over the keycard. Give it a reason to leave.', 1, 26, 8, { creatures: ['sentinel'], gates: ['card'], radio: true, alarm: true, water: true }),
  S('Generator Room', 'Two fuses, one generator. Start it, then be somewhere else.', 1, 27, 8, { creatures: ['stalker'], gates: ['power'], fuses: 2, water: true }),
  S('Glass Garden', 'Shattered tanks everywhere. Even crouching, glass whispers.', 1, 28, 8, { creatures: ['listener'], gates: ['key'], glass: 16, alarm: true, water: true }),
  S('Blackout', 'One sonar charge. Make it count. The lights are dead.', 1, 29, 8, { creatures: ['stalker'], gates: ['card'], pulses: 1, lightsOut: true, water: true }),
  S('Flood Gate', 'Valve, then power. Two sounds it will not ignore.', 1, 46, 9, { creatures: ['stalker', 'listener'], gates: ['valve', 'power'], fuses: 1, water: true }),
  S('Meltdown', 'Start the generator. Then run for the exit.', 1, 30, 9, { creatures: ['stalker', 'stalker'], gates: ['power'], fuses: 2, water: true }),
  /* chapter 3 */
  S('Two of Them', 'Two patrols. Count their steps.', 2, 31, 8, { creatures: ['stalker', 'stalker'], gates: ['card'], alarm: true }),
  S('Blind Spot', 'The guard looks one way, then the other. Take the key when its back is turned.', 2, 32, 8, { creatures: ['sentinel', 'sentinel'], gates: ['key'] }),
  S('Above and Below', 'A hunter and a listener. Sound travels.', 2, 33, 9, { creatures: ['stalker', 'listener'], gates: ['power'], fuses: 1 }),
  S('Cell Block', 'Two locks. The cells are not all empty.', 2, 34, 9, { creatures: ['stalker', 'listener'], gates: ['breaker', 'key'], breakers: 3, alarm: true, lockers: 5 }),
  S('Containment', 'Card, then code. The cells are not quiet.', 2, 47, 9, { creatures: ['stalker', 'sentinel'], gates: ['card', 'code'], lockers: 4 }),
  S('Decoy', 'Two guards. One radio. One generator.', 2, 35, 9, { creatures: ['sentinel', 'sentinel'], gates: ['power'], fuses: 2, radio: true, alarm: true }),
  S('Dead Air', 'The sonar is dead. Listen.', 2, 36, 9, { creatures: ['stalker', 'listener'], gates: ['code'], pulses: 0 }),
  S('Egg Chamber', 'Be quiet. They hatch to sound.', 2, 48, 10, { creatures: ['listener', 'listener', 'stalker'], gates: ['breaker'], breakers: 2, lockers: 5 }),
  S('The Shaft', 'A key at the bottom, the exit at the top.', 2, 37, 10, { creatures: ['stalker', 'stalker'], gates: ['key', 'card'], vents: 2 }),
  S('The Hive', 'They cannot see you. They can hear your heart.', 2, 38, 10, { creatures: ['listener', 'listener', 'listener'], gates: ['code'], lockers: 5 }),
  S('Breach', 'Valve, key, and a vent too small for them.', 2, 49, 10, { creatures: ['stalker', 'stalker', 'listener'], gates: ['valve', 'key'], vents: 2, alarm: true }),
  S('Last Light', 'Keycard, power, and a hidden way out. Everything you know.', 2, 39, 10, { creatures: ['stalker', 'listener'], gates: ['card', 'power', 'secret'], fuses: 1, vents: 1 }),
  S('The Source', 'No more answers to give. Everything you learned, in the dark.', 2, 50, 10, { creatures: ['stalker', 'listener', 'sentinel'], gates: ['code', 'power'], fuses: 1, pulses: 1, lightsOut: true }),
  S('Extraction', 'They all know you are here. Do not stop.', 2, 40, 10, { creatures: ['stalker', 'stalker', 'sentinel'], gates: ['power', 'key'], fuses: 2, hunted: true, radio: true })
];

LEVELS.forEach((l, i) => { l.story = i; });
/* every level gets its own look (palette of fog / lamps / wall tint, see render/scene3d.js LOOKS): consecutive levels never share one */
const LOOK_SETS = [['sterile', 'rust', 'cold', 'dust', 'emergency', 'toxic', 'violet'], ['cold', 'toxic', 'rust', 'sterile', 'emergency', 'violet', 'dust'], ['hive', 'bile', 'bruise', 'ember', 'bone']];
{ const cnt = [0, 0, 0]; LEVELS.forEach((l) => { const set = LOOK_SETS[l.ch]; l.look = set[(cnt[l.ch] * 2 + l.ch) % set.length]; cnt[l.ch]++; }); }
['sterile', 'dust', 'cold', 'sterile'].forEach((k, i) => { LEVELS[i].look = k; });   // the four tutorial levels stay calm and readable
/* first level index of each chapter (13 + 13 + 14 levels) */
export const CH_START = [0, 1, 2].map(c => LEVELS.findIndex(l => l.ch === c)).concat([LEVELS.length]);
