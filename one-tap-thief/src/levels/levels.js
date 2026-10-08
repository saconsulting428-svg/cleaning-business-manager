// Data-driven levels. To add a level: append an object here (no engine changes needed).
//
// Map legend:  # wall   . floor   F furniture (blocks move + sight)   H hiding spot   S start   E exit
//              L loot (+10)   R rare loot (+50)   K key   D locked door (needs a key)   A alarm zone
// Coordinates in guards/cameras/lasers are tile (x, y) with (0,0) top-left. Angles are degrees: 0=east, 90=south.
//
// guards:  { patrol:[[x,y,waitSeconds?],...], mode:'loop'|'pingpong', face, speed, range, fov, sweep:{amp,speed} }
// cameras: { x, y (wall tile), angle, arc, speed, range, fov }
// lasers:  { x, y, dir:'h'|'v', len, on, off, phase }
export const LEVELS = [
  { level: 1, world: 'house', name: 'First Night', difficulty: 1,
    hint: 'Tap where you want the thief to go. Grab the loot, then reach the green exit.',
    map: [
      '#########',
      '#S......#',
      '#.###.#.#',
      '#.#L#.#L#',
      '#.#.#.#.#',
      '#...#...#',
      '#.#####.#',
      '#L.....E#',
      '#########',
    ] },
  // L2 — first (slow) guard. Loot sits in notches beside the guard's lane: dip in only when he is far away.
  { level: 2, world: 'house', name: 'Night Watch', difficulty: 1,
    hint: 'A guard! His yellow cone is what he sees. Wait for him to walk away, then slip past.',
    map: [
      '#########',
      '#S......#',
      '#..FLF..#',
      '#.......#',
      '#..FLF..#',
      '#.......#',
      '####.####',
      '#E.....L#',
      '#########',
    ],
    guards: [{ patrol: [[2, 3, 1.2], [6, 3, 1.2]], mode: 'pingpong', speed: 1.0, range: 4, fov: 60 }] },

  // L3 — faster guard on a long loop that even visits the middle room; one wardrobe; risky gem in the middle room.
  { level: 3, world: 'house', name: 'Long Way Round', difficulty: 2,
    hint: 'This guard walks a long loop — even through the middle room. Duck onto the wardrobe to be invisible.',
    map: [
      '#########',
      '#L.....L#',
      '#.##.##.#',
      '#.#..L#.#',
      '#.#...#.#',
      '#.#H..#.#',
      '#.##.##.#',
      '#S.....E#',
      '#########',
    ],
    guards: [{ patrol: [[1, 1, 1.6], [7, 1, 1.6], [7, 7, 1.6], [4, 7, 0.2], [4, 4, 2.0], [4, 1, 0.2]], mode: 'loop', speed: 1.5, range: 5.6, fov: 74 }] },

  // L4 — two guards on crossing lanes: the band between them is covered by both cones. The wardrobe in the middle is the refuge.
  { level: 4, world: 'house', name: 'Crossfire', difficulty: 3,
    hint: 'Two guards, two lanes. Where their cones overlap is deadly — use the middle wardrobe to wait.',
    map: [
      '#########',
      '#L.....L#',
      '#.......#',
      '#...H...#',
      '#.......#',
      '#.......#',
      '#.F...F.#',
      '#.......#',
      '#S.....E#',
      '#########',
    ],
    guards: [
      { patrol: [[1, 2, 0.5], [7, 2, 0.5]], mode: 'pingpong', speed: 1.3, range: 5.4, fov: 72 },
      { patrol: [[7, 4, 0.5], [1, 4, 0.5]], mode: 'pingpong', speed: 1.3, range: 5.4, fov: 72 },
    ] },

  // L5 — a rare gem inside a vault with its own sweeping guard; two patrols box in the halls you must cross to reach it.
  { level: 5, world: 'house', name: 'Vault Room', difficulty: 4,
    hint: 'The gem is worth +50, and a guard sweeps the vault. Duck into the vault wardrobe, learn his rhythm, then strike.',
    map: [
      '#########',
      '#S.....L#',
      '#.F...F.#',
      '#.......#',
      '#.##.##.#',
      '#.#H..#.#',
      '#.#.R.#.#',
      '#.#####.#',
      '#.......#',
      '#L.....E#',
      '#########',
    ],
    guards: [
      { patrol: [[5, 5]], face: 180, sweep: { amp: 58, speed: 1.2 }, range: 4, fov: 62 },
      { patrol: [[7, 3, 0.6], [7, 1, 0.6], [1, 1, 0.6], [1, 3, 0.6]], mode: 'loop', speed: 1.3, range: 5.2, fov: 72 },
      { patrol: [[1, 8, 0.8], [7, 8, 0.8]], mode: 'pingpong', speed: 1.3, range: 5.2, fov: 72 },
    ] },

  // L6 — first CCTV. Every route crosses a doorway the camera pans over; a lingering beep + REC ring build up before the alarm.
  { level: 6, world: 'house', name: 'Eyes on the Wall', difficulty: 4,
    hint: 'CCTV! It beeps faster the longer it watches you. Break line of sight before the ring fills — or the alarm sounds.',
    map: [
      '#########',
      '#S.....L#',
      '#.F...F.#',
      '###...###',
      '#L.....L#',
      '#..FHF..#',
      '#.......#',
      '#E.....L#',
      '#########',
    ],
    cameras: [{ x: 4, y: 0, angle: 90, arc: 42, speed: 22, range: 9, fov: 80, fillTime: 1.1 }],
    guards: [{ patrol: [[2, 6, 1.0], [6, 6, 1.0]], mode: 'pingpong', speed: 1.2, range: 5, fov: 70 }] },

  // L7 — the key sits in a corner the guard lingers at; a second guard patrols the lane right behind the door.
  { level: 7, world: 'house', name: 'Locked In', difficulty: 5,
    hint: 'The key is in a guarded corner. Get it, get out, then open the door — another guard waits behind it.',
    map: [
      '#########',
      '#S.....K#',
      '#.F...F.#',
      '#.......#',
      '####D####',
      '#.......#',
      '#L..R.L.#',
      '#E.F.F.H#',
      '#########',
    ],
    guards: [
      { patrol: [[7, 3, 0.6], [2, 3, 0.6], [2, 1, 0.6], [7, 1, 2.0]], mode: 'loop', speed: 1.3, range: 5.4, fov: 74, startDelay: 1.5 },
      { patrol: [[7, 5]], face: 180, sweep: { amp: 45, speed: 1.3 }, range: 5.2, fov: 56 },
    ] },

  // L8 — alarm-tile barriers force a zig-zag route; a patrol guards each hall you have to cross.
  { level: 8, world: 'house', name: 'Tripwire', difficulty: 6,
    hint: 'Red tiles trigger the alarm. The only way through zig-zags — plan it around the guards.',
    map: [
      '#########',
      '#S.....L#',
      '#.......#',
      '#AAAAAA.#',
      '#.......#',
      '#L..H...#',
      '#.AAAAAA#',
      '#.......#',
      '#L.....E#',
      '#########',
    ],
    guards: [
      { patrol: [[7, 4, 1.2], [1, 4, 1.2]], mode: 'pingpong', speed: 1.3, range: 5.4, fov: 72, startDelay: 2.0 },
      { patrol: [[2, 7, 1.2], [6, 7, 1.2]], mode: 'pingpong', speed: 1.3, range: 5.4, fov: 72, startDelay: 1.0 },
    ] },

  // L9 — a camera sweeps the key room, a sweeper guards the vault door, a patrol loops past both; the vault is locked.
  { level: 9, world: 'house', name: 'Inside Job', difficulty: 7,
    hint: 'Camera, guards and a locked vault. Hide from the camera, time the sweeper, grab the key, open the door.',
    map: [
      '#########',
      '#S.H...L#',
      '#..K....#',
      '#.##D##.#',
      '#.#...#.#',
      '#.#.R.#.#',
      '#.#...#.#',
      '#.#####.#',
      '#L.....E#',
      '#########',
    ],
    cameras: [{ x: 0, y: 2, angle: 0, arc: 40, speed: 18, range: 8.5, fov: 60, fillTime: 1.1 }],
    guards: [
      { patrol: [[1, 3, 1.0], [1, 8, 0.6], [7, 8, 0.6], [7, 3, 1.0]], mode: 'loop', speed: 1.4, range: 5.4, fov: 72 },
      { patrol: [[6, 2]], face: 190, sweep: { amp: 40, speed: 1.4 }, range: 4.6, fov: 54 },
    ] },

  // L10 — the final Small House heist: guards, a sweeper over the vault floor, CCTV, alarm tiles and a blinking laser.
  { level: 10, world: 'house', name: 'The Big Score', difficulty: 8,
    hint: 'The big score. Guards, a camera, alarm tiles and a blinking laser. Gems are worth +50 each.',
    map: [
      '#########',
      '#S.F...K#',
      '#.......#',
      '#.F.H.F.#',
      '###A.A###',
      '#L.....L#',
      '#.F.H.F.#',
      '#.......#',
      '####D####',
      '#R.....R#',
      '#.......#',
      '#E.....L#',
      '#########',
    ],
    lasers: [{ x: 1, y: 10, dir: 'h', len: 7, on: 1.2, off: 1.8 }],
    cameras: [{ x: 8, y: 9, angle: 180, arc: 36, speed: 20, range: 7.5, fov: 52, fillTime: 1.1 }],
    guards: [
      { patrol: [[7, 2, 0.8], [1, 2, 0.8]], mode: 'pingpong', speed: 1.4, range: 5.4, fov: 74, startDelay: 2.5 },
      { patrol: [[7, 7, 0.8], [1, 7, 0.8]], mode: 'pingpong', speed: 1.4, range: 5.4, fov: 74 },
      { patrol: [[4, 11]], face: 270, sweep: { amp: 40, speed: 1.5 }, range: 3.6, fov: 50, prox: 1.0 },
    ] },
];

export const PLAYABLE_LEVELS = LEVELS.length;
export const getLevel = (n) => LEVELS.find((l) => l.level === n) || null;

/** The compact "summary" form from the design doc, derived from the full definition. */
export function summarize(def) {
  const count = (c) => def.map.reduce((a, r) => a + [...r].filter((x) => x === c).length, 0);
  return { level: def.level, world: def.world, guards: (def.guards || []).length, cameras: (def.cameras || []).length,
    loot: count('L') + count('R'), keys: count('K'), difficulty: def.difficulty };
}
