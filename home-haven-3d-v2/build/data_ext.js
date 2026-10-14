  // ================================================================ NEW PARTS (unlocked by challenges / contracts)
  const NEWP = [
    ['sofa_modern', 'Modern Sofa', 'furniture', 'item', 2, 1, '#2A9D8F', 140], ['sofa_chester', 'Chesterfield Sofa', 'furniture', 'item', 2, 1, '#8A2F3A', 190],
    ['bed_double', 'Double Bed', 'bedroom', 'item', 2, 2, '#6C8EBF', 160], ['table_round', 'Round Dining Table', 'furniture', 'item', 2, 2, '#B9814B', 130],
    ['lamp_arc', 'Arc Lamp', 'decor', 'item', 1, 1, '#2B2B2B', 90], ['plant_tall', 'Tall Plant', 'decor', 'item', 1, 1, '#3F7F3A', 60],
    ['floor_parquet', 'Parquet Floor', 'floors', 'floor', 1, 1, '#86573A', 30], ['floor_slate', 'Slate Floor', 'floors', 'floor', 1, 1, '#5B646D', 30],
  ];
  NEWP.forEach(([id, name, cat, kind, w, d, color, price]) => { PART[id] = { id, name, cat, kind, w, d, color, layer: null, light: id === 'lamp_arc' ? 1.5 : 0, paintable: true, price, reward: true }; });
  const wallKind = (o) => PART[o.part].kind === 'wall' && PART[o.part].cat !== 'garden';
  const painted = (o) => !!o.color && o.color !== PART[o.part].color;
  const hueFam = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 28) return 'neutral'; let h; if (mx === r) h = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) h = (b - r) / (mx - mn) + 2; else h = (r - g) / (mx - mn) + 4; h *= 60; return h < 70 || h >= 330 ? 'warm' : h < 170 ? 'green' : h < 270 ? 'cool' : 'rose'; };
  const EDGE_ = [[0, -.5], [.5, 0], [0, .5], [-.5, 0]];
  const cellsOfO = (o) => { const P = PART[o.part], [fw, fd] = o.rot % 2 ? [P.d, P.w] : [P.w, P.d], c = []; for (let i = 0; i < fw; i++) for (let j = 0; j < fd; j++) c.push([o.x + i, o.z + j]); return c; };
  const RT_NAMES = { living: 'Living Room', kitchen: 'Kitchen', bedroom: 'Bedroom', bath: 'Bathroom', hall: 'Hall', study: 'Study' };
  // ---- rooms: connected floor cells that no wall edge separates (pure function of a layout)
  function detectRooms(layout) {
    const rooms = [], D = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    for (let lvl = 0; lvl < 2; lvl++) {
      const floors = new Map(), walls = new Set(), wallMap = new Map();
      layout.forEach(o => { if (o.lvl !== lvl) return; const P = PART[o.part]; if (P.kind === 'floor' && o.part !== 'path_stone') floors.set(o.x + ',' + o.z, o); else if (P.kind === 'wall' && P.cat !== 'garden') { const e = EDGE_[o.rot]; const k = ((o.x + .5 + e[0]) * 2) + ',' + ((o.z + .5 + e[1]) * 2); walls.add(k); wallMap.set(k, o); } });
      const edge = (x, z, d) => ((x + .5 + EDGE_[d][0]) * 2) + ',' + ((z + .5 + EDGE_[d][1]) * 2), seen = new Set();
      floors.forEach((_, k) => {
        if (seen.has(k)) return; const [sx, sz] = k.split(',').map(Number), q = [[sx, sz]], cells = []; seen.add(k); let enclosed = true;
        while (q.length) { const [x, z] = q.pop(); cells.push([x, z]); for (let d = 0; d < 4; d++) { const nx = x + D[d][0], nz = z + D[d][1], nk = nx + ',' + nz, w = walls.has(edge(x, z, d)); if (w) continue; if (floors.has(nk)) { if (!seen.has(nk)) { seen.add(nk); q.push([nx, nz]); } } else enclosed = false; } }
        const set = new Set(cells.map(c => c.join())), items = layout.filter(o => o.lvl === lvl && PART[o.part].kind === 'item' && cellsOfO(o).some(c => set.has(c.join())));
        const has = (...ids) => items.some(o => ids.includes(o.part));
        let name = has('stove', 'fridge', 'counter', 'sink') ? 'Kitchen' : has('bed', 'charpai', 'wardrobe', 'bed_double') ? 'Bedroom' : has('bathtub', 'toilet', 'basin') ? 'Bathroom' : has('sofa', 'tv', 'armchair', 'bookshelf', 'sofa_modern', 'sofa_chester') ? 'Living Room' : has('dining_table', 'table_round') ? 'Dining Room' : has('stairs') ? 'Hall' : lvl ? 'Upstairs Room' : 'Room';
        if (name === 'Room' || name === 'Upstairs Room') { const f = cells.map(c => floors.get(c.join())).find(o => o && o.rt); if (f && RT_NAMES[f.rt]) name = RT_NAMES[f.rt]; }
        const wl = new Set(); cells.forEach(([x, z]) => { for (let d = 0; d < 4; d++) { const o = wallMap.get(edge(x, z, d)); if (o) wl.add(o); } });
        rooms.push({ lvl, cells, enclosed, items, name, size: cells.length, walls: [...wl], floors: cells.map(c => floors.get(c.join())).filter(Boolean) });
      });
    }
    const cnt = {}; rooms.forEach(r => cnt[r.name] = (cnt[r.name] || 0) + 1); const idx = {}; rooms.forEach(r => { if (cnt[r.name] > 1) { idx[r.name] = (idx[r.name] || 0) + 1; r.name += ' ' + idx[r.name]; } });
    rooms.forEach((r, i) => { const xs = r.cells.map(c => c[0]), zs = r.cells.map(c => c[1]); r.key = r.lvl + ':' + Math.min(...xs) + ',' + Math.min(...zs); r.id = i; });
    return rooms;
  }
  const roomsWith = (layout, pred) => detectRooms(layout).filter(r => r.enclosed && pred(r));
  const cnt = (r, ...ids) => r.items.filter(o => ids.includes(o.part)).length;
  const bestRoom = (layout, score) => detectRooms(layout).reduce((m, r) => Math.max(m, score(r)), 0);

  // ================================================================ STORY CHAPTERS (7) — each quest is checked against the real layout
  const CHAPTERS = [
    { title: 'Clean & Foundation', unlock: ['floors', 'walls'], start: { floor_wood: 16, floor_tile: 8, floor_concrete: 8, wall_plaster: 20 },
      quests: [{ text: 'Clear 8 pieces of debris', n: 8, count: (S_) => (S_.cleared || []).length }, { text: 'Build rooms: 16 floor tiles', n: 16, test: (o) => kindIs('floor')(o) && o.part !== 'path_stone', give: [['floor_wood', 3], ['floor_concrete', 3]] }, { text: 'Walls around your rooms: 8', n: 8, test: wallOnly, give: [['wall_plaster', 3], ['wall_brick', 2]] }],
      mats: [['floor_concrete', 3], ['floor_wood', 2], ['floor_tile', 2], ['wall_plaster', 3], ['wall_brick', 2]], bundle: [['floor_tile', 4], ['wall_stone', 2]], reward: { coins: 500 },
      intro: [['ben', 'Ten years in the city… and I finally came back home.'], ['ben', 'Wait. Where is the house?!'], ['alex', 'Ben! Good to see you. The old house fell down in last year\'s storm. I\'m so sorry.'], ['ben', 'Then I\'ll build a new one. With my own hands.'], ['alex', 'First clean up the mess — tap the debris to clear it.'], ['alex', 'Then open Build, tap a room type and press Build. A ghost room shows where it goes, and the floor and walls appear by themselves!']],
      outro: [['alex', 'Clean plot, solid floor, walls going up. Every good home starts from the ground!'], ['ben', 'Next: the ground floor.']] },
    { title: 'Ground Floor', unlock: ['floors', 'walls', 'openings', 'furniture', 'decor', 'kitchen'], start: { door_wood: 1, window_small: 2, sofa: 1, counter: 1, wall_plaster: 12, floor_wood: 8, floor_tile: 8 },
      quests: [{ text: 'Reach 16 walls (doors and windows count)', n: 16, test: wallKind, give: [['wall_plaster', 3], ['wall_brick', 2]] }, { text: 'Install a door', n: 1, test: idIs('door_wood', 'door_glass'), give: [['door_wood', 1]] }, { text: 'Install 3 windows', n: 3, test: idIs('window_small', 'window_big'), give: [['window_small', 1]] }, { text: 'Living room: sofa & coffee table', n: 2, test: idIs('sofa', 'coffee_table'), give: [['sofa', 1], ['coffee_table', 1]] }, { text: 'Kitchen: counter, stove, fridge, sink', n: 4, test: idIs('counter', 'stove', 'fridge', 'sink'), give: [['stove', 1], ['fridge', 1], ['sink', 1], ['counter', 1]] }],
      mats: [['wall_plaster', 3], ['window_small', 1], ['floor_tile', 2], ['door_glass', 1], ['arch', 1], ['window_big', 1]], bundle: [['window_big', 1], ['arch', 1]], reward: { coins: 550 },
      intro: [['zoe', 'Hi neighbor! I\'m Zoe — I design interiors. I can\'t wait to see what you build.'], ['alex', 'Tap near the edge of a floor tile to place a wall. Walls snap to the nearest edge.'], ['zoe', 'A door, windows for light — then a cozy living room and a kitchen!']],
      outro: [['zoe', 'Now it really looks like a house. Love it!'], ['ben', 'Mom\'s kitchen… I can almost smell her Sunday pancakes.']] },
    { title: 'First Floor', unlock: ['floors', 'walls', 'openings', 'furniture', 'decor', 'kitchen', 'build', 'bedroom', 'bath'], start: { stairs: 1, floor_wood: 12, wall_plaster: 14, floor_carpet: 4, bed: 1 },
      quests: [{ text: 'Place stairs', n: 1, test: idIs('stairs'), give: [['stairs', 1]] }, { text: 'Lay 8 floors on Floor 2', n: 8, test: (o) => PART[o.part].kind === 'floor' && o.lvl === 1, give: [['floor_wood', 3]], lvl: 1 }, { text: 'Build 8 walls on Floor 2', n: 8, test: (o) => wallKind(o) && o.lvl === 1, give: [['wall_plaster', 3]], lvl: 1 }, { text: 'Bedroom: bed & wardrobe', n: 2, test: idIs('bed', 'wardrobe', 'bed_double'), give: [['bed', 1], ['wardrobe', 1]] }, { text: 'Bathroom: bathtub, toilet & basin', n: 3, test: idIs('bathtub', 'toilet', 'basin'), give: [['bathtub', 1], ['basin', 1], ['toilet', 1]] }],
      mats: [['floor_wood', 3], ['wall_plaster', 3], ['floor_marble', 2], ['window_big', 1], ['bedside', 1]], bundle: [['floor_marble', 4], ['bedside', 2]], reward: { coins: 600 },
      intro: [['ben', 'One more floor — a bedroom for Mom and a bathroom with hot water.'], ['alex', 'Switch to Floor 2 in Build mode. Stairs first — they need two floor tiles of space.'], ['ben', 'The fuse box is a mess too. Flip the switches until every bulb glows!']],
      outro: [['ben', 'Hot water, bright lights, a bed upstairs. Thank you, Alex.'], ['parker', 'Hmph. Still standing. Pretty sturdy for a hut, Ben.']] },
    { title: 'Roof & Exterior', unlock: ['floors', 'walls', 'openings', 'furniture', 'decor', 'kitchen', 'build', 'bedroom', 'bath', 'roof', 'garden'], start: { roof_slope: 24, roof_flat: 4, path_stone: 6, fence: 6, gate: 1 },
      quests: [{ text: 'Add a roof (Roof tab → Auto roof)', n: 12, test: (o) => kindIs('roof')(o) && o.part !== 'roof_rail', give: [['roof_slope', 3], ['roof_flat', 3]] }, { text: 'Paint 3 exterior walls', n: 3, test: (o) => PART[o.part].cat === 'walls' && painted(o) }, { text: 'Lay a garden path (6 stones)', n: 6, test: idIs('path_stone'), give: [['path_stone', 3]] }, { text: 'Build 6 fence pieces', n: 6, test: idIs('fence'), give: [['fence', 3]] }, { text: 'Install a gate', n: 1, test: idIs('gate'), give: [['gate', 1]] }],
      mats: [['roof_slope', 3], ['roof_slope_slate', 2], ['roof_flat', 2], ['roof_rail', 1], ['path_stone', 3], ['fence', 3]], bundle: [['roof_slope_slate', 3]], reward: { coins: 650 },
      intro: [['parker', 'Well, well. Mr. Parker, property developer. Nice little hut. I\'ll buy the land — cash, today.'], ['ben', 'It\'s not for sale, Mr. Parker.'], ['parker', 'Hmph. Let\'s see how long that lasts without a roof when the rain comes.'], ['alex', 'Roof first: open the Roof tab and tap Auto roof — one tap covers the whole house. Then paint the outside: tap a wall and choose Paint.']],
      outro: [['ben', 'Let it rain, Mr. Parker. We\'re covered.'], ['alex', 'And a gate at the end of the path. Home sweet home.']] },
    { title: 'Interior Design', unlock: ['floors', 'walls', 'openings', 'furniture', 'decor', 'kitchen', 'build', 'bedroom', 'bath', 'roof', 'garden'], start: { lamp: 2, rug: 1, plant: 2, bookshelf: 1 },
      quests: [{ text: 'Add 2 lamps', n: 2, test: idIs('lamp', 'lamp_arc'), give: [['lamp', 1]] }, { text: 'Lay 2 rugs', n: 2, test: idIs('rug'), give: [['rug', 1]] }, { text: 'Place 3 plants', n: 3, test: idIs('plant', 'plant_tall'), give: [['plant', 1]] }, { text: 'Decorate: painting, vase or clock (2)', n: 2, test: idIs('painting', 'vase', 'clock'), give: [['vase', 1], ['painting', 1]] }, { text: 'Bookshelf & TV', n: 2, test: idIs('bookshelf', 'tv'), give: [['bookshelf', 1], ['tv', 1]] }, { text: 'Recolor 4 floor tiles', n: 4, test: (o) => kindIs('floor')(o) && o.part !== 'path_stone' && painted(o) }],
      mats: [['plant', 1], ['armchair', 1], ['floor_carpet', 2], ['tv', 1], ['bookshelf', 1], ['vase', 1]], bundle: [['vase', 1], ['armchair', 1]], reward: { coins: 700 },
      intro: [['zoe', 'Furniture time! Tip: tap anything you placed to rotate, move or paint it. Try the Interior view to see inside.'], ['zoe', 'Color your floors, add lamps and rugs — make every room feel like yours.']],
      outro: [['zoe', 'So cozy! I\'d move in tomorrow.'], ['mom', '(On the phone) Ben, Alex sent me a photo. I cried. You built a living room?!']] },
    { title: 'Garden & Outdoor', unlock: ['floors', 'walls', 'openings', 'furniture', 'decor', 'kitchen', 'build', 'bedroom', 'bath', 'roof', 'garden'], start: { tree: 1, bush: 2, flowers: 2, bench: 1 },
      quests: [{ text: 'Plant 3 trees or bushes', n: 3, test: idIs('tree', 'pine', 'bush'), give: [['bush', 1], ['tree', 1], ['pine', 1]] }, { text: 'Plant 3 flower beds', n: 3, test: idIs('flowers'), give: [['flowers', 1]] }, { text: 'Bench & lamp post', n: 2, test: idIs('bench', 'lamp_post'), give: [['bench', 1], ['lamp_post', 1]] }, { text: 'Add a pond or fountain', n: 1, test: idIs('pond', 'fountain'), give: [['pond', 1]] }, { text: 'Swing, cat house or mailbox (2)', n: 2, test: idIs('swing', 'cat_house', 'mailbox'), give: [['cat_house', 1], ['mailbox', 1], ['swing', 1]] }],
      mats: [['bush', 2], ['flowers', 1], ['lamp_post', 1], ['pond', 1], ['cat_house', 1], ['mailbox', 1]], bundle: [['swing', 1], ['pond', 1]], reward: { coins: 700 },
      intro: [['zoe', 'A home needs a garden. Flowers, a bench, maybe a pond?'], ['ben', 'And a little house for Tommy. He follows me everywhere!']],
      outro: [['zoe', 'Prettiest garden on the street. Officially.'], ['ben', 'One last thing: the final inspection.']] },
    { title: 'Dream Home', unlock: ['floors', 'walls', 'openings', 'furniture', 'decor', 'kitchen', 'build', 'bedroom', 'bath', 'roof', 'garden'], start: { water_tank: 1, mailbox: 1 },
      quests: [{ text: 'Three enclosed rooms', n: 3, count: (S_, L) => Math.min(3, detectRooms(L).filter(r => r.enclosed).length) }, { text: 'Roof over the house (12 pieces)', n: 12, test: (o) => kindIs('roof')(o) && o.part !== 'roof_rail' }, { text: 'Every room furnished (3 rooms)', n: 3, count: (S_, L) => Math.min(3, detectRooms(L).filter(r => r.enclosed && r.items.length >= 2).length) }, { text: 'Install a water tank', n: 1, test: idIs('water_tank'), give: [['water_tank', 1]] }, { text: 'Put up a mailbox', n: 1, test: idIs('mailbox'), give: [['mailbox', 1]] }],
      mats: [['water_tank', 1], ['mailbox', 1], ['plant', 1]], bundle: [['piano', 1], ['fountain', 1]], reward: { coins: 1000 },
      intro: [['alex', 'Last stretch, Ben. The inspector wants three enclosed rooms, a roof, furniture in every room, a water tank and a mailbox.'], ['ben', 'Then the housewarming party can begin.']],
      outro: [['mom', 'Ben…? Is this… our home?'], ['ben', 'Welcome home, Mom.'], ['parker', '…Fine. FINE. It\'s a beautiful house. Congratulations.'], ['zoe', 'Housewarming party tonight! Everyone is invited!'], ['alex', 'And Ben — there are other houses in this street that need a hand…']] },
  ];
  // ================================================================ HOMEOWNER CHALLENGES, CONTRACTS, PROPERTIES (data-driven)
  const roomQ = (text, n, score) => ({ text, n, count: (S_, L) => Math.min(n, bestRoom(L, score)) });
  const CHALLENGES = [
    { id: 'zoe_bedroom', who: 'zoe', title: 'Zoe\'s Dream Bedroom', blurb: 'Zoe wants a bedroom with a bed, a wardrobe, two decorations and one matching color theme.', prop: 'home',
      quests: [roomQ('Bed and wardrobe in one room', 2, r => Math.min(2, cnt(r, 'bed', 'bed_double') + cnt(r, 'wardrobe'))), roomQ('Two decorations in that room', 2, r => (cnt(r, 'bed', 'bed_double') && cnt(r, 'wardrobe')) ? Math.min(2, cnt(r, 'lamp', 'lamp_arc', 'rug', 'plant', 'plant_tall', 'painting', 'vase', 'clock')) : 0),
        roomQ('Color theme: 3 painted pieces of one color family', 3, r => { if (!(cnt(r, 'bed', 'bed_double') && cnt(r, 'wardrobe'))) return 0; const f = {}; r.items.concat(r.walls, r.floors).filter(painted).forEach(o => { const k = hueFam(o.color); f[k] = (f[k] || 0) + 1; }); return Math.max(0, ...Object.values(f)); })],
      reward: { coins: 400, stars: 0, parts: { bed_double: 1 } }, unlocks: ['bed_double'] },
    { id: 'alex_garden', who: 'alex', title: 'Alex\'s Garden', blurb: 'Alex wants a proper garden: flowers, a fence with a gate, a path and a bench.', prop: 'home',
      quests: [{ text: 'Plant 3 flower beds', n: 3, test: idIs('flowers') }, { text: 'Fence: 6 pieces and a gate', n: 7, test: idIs('fence', 'gate') }, { text: 'Garden path (5 stones)', n: 5, test: idIs('path_stone') }, { text: 'Outdoor bench', n: 1, test: idIs('bench') }],
      reward: { coins: 350, parts: { lamp_arc: 1, plant_tall: 2 } }, unlocks: ['lamp_arc', 'plant_tall'] },
    { id: 'ben_dinner', who: 'ben', title: 'Family Dinner Kitchen', blurb: 'Mom is coming for dinner! Build a kitchen room with a dining table, chairs, fridge and stove.', prop: 'home',
      quests: [roomQ('Fridge and stove in one room', 2, r => Math.min(2, cnt(r, 'fridge') + cnt(r, 'stove'))), roomQ('Dining table in that kitchen', 1, r => (cnt(r, 'fridge') && cnt(r, 'stove')) ? Math.min(1, cnt(r, 'dining_table', 'table_round')) : 0), roomQ('Three chairs in that kitchen', 3, r => (cnt(r, 'fridge') && cnt(r, 'stove')) ? Math.min(3, cnt(r, 'chair')) : 0)],
      reward: { coins: 300, parts: { table_round: 1 } }, unlocks: ['table_round'] },
    { id: 'tommy_corner', who: 'tommy', title: 'Tommy\'s Cat Corner', blurb: 'Tommy deserves a corner: a cat house, a rug and two plants.', prop: 'home',
      quests: [{ text: 'Cat house', n: 1, test: idIs('cat_house') }, { text: 'Rug', n: 1, test: idIs('rug') }, { text: 'Two plants', n: 2, test: idIs('plant', 'plant_tall', 'bush') }],
      reward: { coins: 250, parts: { floor_parquet: 6 } }, unlocks: ['floor_parquet'] },
    { id: 'parker_house', who: 'parker', title: 'Mr. Parker\'s Old Cottage', blurb: 'Mr. Parker\'s old cottage is falling apart. Renovate it — it is a separate property, your own house stays untouched.', prop: 'cottage',
      quests: [{ text: 'Floors: 14 tiles', n: 14, test: (o) => kindIs('floor')(o) && o.part !== 'path_stone' }, { text: 'Walls: 14 (repair the gaps)', n: 14, test: wallKind }, { text: 'Install a door and 3 windows', n: 4, test: idIs('door_wood', 'door_glass', 'window_small', 'window_big') }, { text: 'Roof: 10 pieces', n: 10, test: (o) => kindIs('roof')(o) && o.part !== 'roof_rail' }, { text: 'Furnish: bed, sofa, 2 more items', n: 4, test: (o) => PART[o.part].kind === 'item' && PART[o.part].cat !== 'garden' }, { text: 'Paint 4 pieces', n: 4, test: painted }],
      reward: { coins: 600, parts: { sofa_chester: 1, floor_slate: 6 } }, unlocks: ['sofa_chester', 'floor_slate', 'property:beach'] },
  ];
  const CONTRACTS = [
    { id: 'c_budget', title: 'Budget-Friendly Renovation', prop: 'cottage', blurb: 'Repair the cottage on a budget: floors, walls and two windows — nothing fancy.', quests: [{ text: 'Floors: 10', n: 10, test: (o) => kindIs('floor')(o) && o.part !== 'path_stone' }, { text: 'Walls: 10', n: 10, test: wallKind }, { text: 'Windows: 2', n: 2, test: idIs('window_small', 'window_big') }], reward: { coins: 250 }, next: 'c_living' },
    { id: 'c_living', title: 'Luxury Living Room', prop: 'home', blurb: 'A showpiece living room: marble floor, two sofas, a piano and an aquarium.', quests: [{ text: 'Marble floor: 6 tiles', n: 6, test: idIs('floor_marble') }, { text: 'Two sofas', n: 2, test: idIs('sofa', 'sofa_modern', 'sofa_chester') }, { text: 'Piano', n: 1, test: idIs('piano') }, { text: 'Aquarium', n: 1, test: idIs('aquarium') }], reward: { coins: 500, parts: { floor_marble: 4 } }, next: 'c_kitchen' },
    { id: 'c_kitchen', title: 'Modern Kitchen', prop: 'home', blurb: 'Counters, stove, fridge, sink, dining table and a tiled floor.', quests: [{ text: 'Counters: 2', n: 2, test: idIs('counter') }, { text: 'Stove, fridge and sink', n: 3, test: idIs('stove', 'fridge', 'sink') }, { text: 'Dining table', n: 1, test: idIs('dining_table', 'table_round') }, { text: 'Tile floor: 6', n: 6, test: idIs('floor_tile') }], reward: { coins: 350 }, next: 'c_garden' },
    { id: 'c_garden', title: 'Small Garden Makeover', prop: 'home', blurb: 'Four flower beds, two trees, a water feature and a bench.', quests: [{ text: 'Flower beds: 4', n: 4, test: idIs('flowers') }, { text: 'Trees: 2', n: 2, test: idIs('tree', 'pine') }, { text: 'Pond or fountain', n: 1, test: idIs('pond', 'fountain') }, { text: 'Bench', n: 1, test: idIs('bench') }], reward: { coins: 300 }, next: 'c_transform' },
    { id: 'c_transform', title: 'Complete House Transformation', prop: 'beach', blurb: 'Build a whole beach house: floors, walls, a door, windows, a roof and furniture.', quests: [{ text: 'Floors: 20', n: 20, test: (o) => kindIs('floor')(o) && o.part !== 'path_stone' }, { text: 'Walls: 16', n: 16, test: wallKind }, { text: 'Door and 3 windows', n: 4, test: idIs('door_wood', 'door_glass', 'window_small', 'window_big') }, { text: 'Roof: 12', n: 12, test: (o) => kindIs('roof')(o) && o.part !== 'roof_rail' }, { text: 'Furniture: 6 pieces', n: 6, test: (o) => PART[o.part].kind === 'item' && PART[o.part].cat !== 'garden' }], reward: { coins: 1000, stars: 0 }, next: null },
  ];
  const cottageLayout = () => { const L = []; let id = 1; const add = (part, x, z, lvl = 0, rot = 0, color) => L.push({ id: 'c' + (id++), part, x, z, lvl, rot, color: color || PART[part].color });
    for (let x = 3; x < 9; x++) for (let z = 4; z < 8; z++) if ((x * 7 + z * 3) % 5 !== 0) add(z < 6 ? 'floor_concrete' : 'floor_wood', x, z);
    for (let x = 3; x < 9; x++) { if (x !== 5) add('wall_plaster', x, 4, 0, 0); } for (let x = 3; x < 9; x += 1) { if (x % 3 !== 0) add('wall_brick', x, 7, 0, 2); }
    for (let z = 4; z < 8; z++) { if (z !== 6) add('wall_plaster', 3, z, 0, 3); if (z !== 5) add('wall_brick', 8, z, 0, 1); }
    add('bush', 1, 9); add('fence', 0, 10, 0, 2); add('fence', 1, 10, 0, 2); add('flowers', 10, 9); return L; };
  const PROPERTIES = [
    { id: 'home', name: 'Family House', blurb: 'Your family home — always available.', theme: 'garden', unlocked: () => true },
    { id: 'cottage', name: 'Mr. Parker\'s Cottage', blurb: 'A rundown cottage that needs a full renovation.', theme: 'garden', unlocked: (S_) => S_.chapter >= CHAPTERS.length, preset: cottageLayout },
    { id: 'beach', name: 'Beach House', blurb: 'An empty plot on the sand. Build your holiday dream.', theme: 'beach', unlocked: (S_) => !!(S_.unlocked && S_.unlocked['property:beach']) },
  ];
