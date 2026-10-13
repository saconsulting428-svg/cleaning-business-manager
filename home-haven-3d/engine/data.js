// Home Haven 3D — renovation engine, part 3: rooms, tasks (slots) and style options
(function () {
  const RENO = window.RENO;
  const W = 5, D = 4.4, H = 3, FY = [0, 3.3];
  const ROOMS = {
    living:  { name: 'Living Room', floor: 0, cx: -2.65, win: { x: -0.4, y: 1.0, w: 1.8, h: 1.5 }, door: 'right', focusY: 1.5 },
    kitchen: { name: 'Kitchen',     floor: 0, cx: 2.65,  win: { x: -0.5, y: 1.15, w: 1.5, h: 1.2 }, door: 'left', focusY: 1.5 },
    bedroom: { name: 'Bedroom',     floor: 1, cx: -2.65, win: { x: -0.6, y: 1.1, w: 1.7, h: 1.4 }, door: 'right', focusY: 1.5 },
    bath:    { name: 'Bathroom',    floor: 1, cx: 2.65,  win: { x: -1.55, y: 1.45, w: 1.0, h: .8 }, door: 'left', focusY: 1.5 },
    garden:  { name: 'Garden',      floor: 0, cx: 0, garden: true },
  };
  const S = []; // slots in display order
  const slot = (id, room, type, name, cost, pos, size, variants, o = {}) => S.push(Object.assign({ id, room, type, name, cost, pos, size, variants, rot: 0 }, o));
  const V = (name, p) => ({ name, p });

  // ============================================================ LIVING ROOM
  slot('liv_floor', 'living', 'floor', 'Floor', 2, [0, 0, 0], [5, .1, 4.4], [
    V('Honey Oak', { kind: 'planks', c: '#c8914f', pw: .28 }), V('Stone Tile', { kind: 'tiles', c: '#cbc8c1', c2: '#bab7b0', size: .6, grout: '#9c9992' }), V('Walnut Herringbone', { kind: 'herring', c: '#86573a' })], { surface: 'floor', anchor: [0, .3, 1.5] });
  slot('liv_wall', 'living', 'wall', 'Walls', 2, [0, 0, 0], [5, 3, .1], [
    V('Warm Cream', { kind: 'paint', c: '#f3e3c3' }), V('Sage Stripes', { kind: 'stripe', c: '#d4e4c7', c2: '#c0d6b1', sw: .22, wain: { c: '#fbf8f0', h: .9 } }), V('Navy Panelling', { kind: 'paint', c: '#dfe7ee', wain: { c: '#2f4468', h: 1.15, rail: '#f2efe8' } })], { surface: 'wall', anchor: [-2.3, 2.3, -2.1] });
  slot('liv_rug', 'living', 'rug', 'Rug', 2, [-.4, 0, -.15], [3, .06, 2.2], [
    V('Cream Shag', { round: true, w: 2.5, d: 2.5, style: 'shag', c1: '#f2e8d4', c2: '#d9c7a6', c3: '#fff' }), V('Navy Stripes', { w: 3.0, d: 2.0, style: 'stripe', c1: '#f5f0e6', c2: '#3d5a80', c3: '#c85a54', fringe: true }), V('Persian Red', { w: 3.1, d: 2.1, style: 'persian', c1: '#8b2e2e', c2: '#d4a64a', c3: '#2d3e66', fringe: true })], { anchor: [1.2, .3, .6] });
  slot('liv_sofa', 'living', 'sofa', 'Sofa', 4, [-.4, 0, -1.68], [2.4, 1.0, 1.0], [
    V('Classic Grey', { style: 'classic', c: '#8d99a6', leg: '#6b4a2f', pillow: '#f0d9a8', pillow2: '#5f8fb0' }), V('Modern Teal', { style: 'modern', c: '#2f8f8b', leg: '#c9a24a', pillow: '#f2e6c8', pillow2: '#e07b53', throw: '#e8cf9d' }), V('Chesterfield', { style: 'chester', c: '#8a2f3a', leg: '#2b1a12', pillow: '#e8c98f', pillow2: '#355c7d' })], { anchor: [0, 1.15, 0] });
  slot('liv_table', 'living', 'coffee', 'Coffee Table', 3, [-.4, 0, -.15], [1.3, .5, .8], [
    V('Round Oak', { style: 'round', c: '#c28a52', c2: '#2b2b2b' }), V('Glass & Oak', { style: 'glass', c: '#b08550', c2: '#222', metal: true }), V('Marble Oval', { style: 'oval', c: '#f1f1ef', c2: '#c9a24a', metal: true })], { anchor: [0, .8, 0] });
  slot('liv_curtains', 'living', 'curtains', 'Curtains', 2, [-.4, 0, -2.2], [2.6, 2.2, .2], [
    V('Velvet Drapes', { style: 'drapes', c: '#b5533c', c2: '#e4b363', pat: 'none', rod: '#c9a24a' }), V('Sage Sheers', { style: 'sheer', c: '#a8c496', c2: '#ffffff', pat: 'stripe', rod: '#3a2a1c' }), V('Roman Blind', { style: 'blind', c: '#e8d9b5', c2: '#f6f0e0', pat: 'stripe', rod: '#6b4a2f' })], { anchor: [0, 2.2, .3], win: true });
  slot('liv_lamp', 'living', 'lamp', 'Floor Lamp', 2, [1.85, 0, -1.8], [.6, 1.7, .6], [
    V('Wood Tripod', { style: 'tripod', shade: '#f6e7c1', wood: '#8b5e3c' }), V('Arc Lamp', { style: 'arc', metal: '#2b2b2b', shade: '#ffd9a0' }), V('Brass Torchiere', { style: 'torch', metal: '#c9a24a', shade: '#fff1d0' })], { anchor: [0, 1.95, 0] });
  slot('liv_art', 'living', 'painting', 'Wall Art', 3, [1.85, 1.75, -2.2], [.9, 1.1, .1], [
    V('Sunset Valley', { art: 'landscape', w: .75, h: .95, frame: '#6b4a2f', pal: ['#ffd5a5', '#ffb27a', '#5c8a6b', '#355c4a'] }), V('Modern Abstract', { art: 'abstract', w: .75, h: .95, frame: '#1f1f1f', pal: ['#f2e8d5', '#e76f51', '#2a9d8f', '#264653', '#f4a261'] }), V('Botanical Gold', { art: 'botanic', w: .75, h: .95, frame: '#c9a24a', metalFrame: true, mat: true, pal: ['#f7f2e8', '#6b8f5a', '#8fb573', '#d98e73'] })], { anchor: [0, .35, .1], wall: true });

  // ============================================================ KITCHEN
  slot('kit_floor', 'kitchen', 'floor', 'Floor', 2, [0, 0, 0], [5, .1, 4.4], [
    V('Checker Tile', { kind: 'tiles', c: '#f2efe6', c2: '#33445a', size: .5, grout: '#bdb8aa' }), V('Terracotta', { kind: 'tiles', c: '#c8744a', size: .5, grout: '#a8643f', v: .12 }), V('Light Oak', { kind: 'planks', c: '#d9b27a', pw: .26 })], { surface: 'floor', anchor: [0, .3, 1.5] });
  slot('kit_wall', 'kitchen', 'wall', 'Walls', 2, [0, 0, 0], [5, 3, .1], [
    V('White Subway', { kind: 'subway', c: '#f6f6f2' }), V('Mint Subway', { kind: 'subway', c: '#a9dccb' }), V('Exposed Brick', { kind: 'brick', c: '#b5553d' })], { surface: 'wall', anchor: [-2.2, 2.4, -2.1] });
  slot('kit_cabinets', 'kitchen', 'cabinets', 'Cabinets', 4, [-.5, 0, -1.87], [3.9, 2.2, .7], [
    V('White Shaker', { style: 'shaker', c: '#f4f1ea', top: '#8c8479', hand: '#c9ced3' }), V('Sage Green', { style: 'flat', c: '#8fae8b', top: '#d9c9a8', hand: '#c9a24a' }), V('Navy & Wood', { style: 'wood', c: '#2f4a6d', top: '#b98756', hand: '#d9d9d9', knob: true })], { anchor: [0, 2.1, .1] });
  slot('kit_hood', 'kitchen', 'hood', 'Range Hood', 2, [-1.55, 0, -1.95], [.9, 1.1, .5], [
    V('Steel Chimney', { style: 'chimney', c: '#c9ced3' }), V('Copper Dome', { style: 'copper', c: '#c47a4b' }), V('Black Slope', { style: 'slope', c: '#2b2e33' })], { anchor: [0, 2.5, 0] });
  slot('kit_fridge', 'kitchen', 'fridge', 'Fridge', 3, [1.95, 0, -1.8], [.9, 1.9, .8], [
    V('Retro Cream', { style: 'retro', c: '#f1e3c0', hand: '#c9a24a', w: .8, h: 1.75 }), V('Steel Door', { style: 'steel', c: '#c2c7cc', hand: '#8a8f94', w: .9, h: 1.9 }), V('Mint Retro', { style: 'retro', c: '#9fd8c8', hand: '#ffffff', w: .78, h: 1.7 })], { anchor: [0, 2.1, 0] });
  slot('kit_dining', 'kitchen', 'dining', 'Dining Set', 3, [.3, 0, .6], [2.0, 1.0, 1.9], [
    V('Round Table', { style: 'round', c: '#b9814b', leg: '#4a3322', seat: '#f1ece0' }), V('Oak & Teal', { style: 'rect', c: '#c9955c', leg: '#6b4a2f', seat: '#4e7d73', fabric: true, slats: true }), V('Bench Set', { style: 'bench', c: '#8a6a47', leg: '#222222', metal: true, seat: '#e0884a' })], { anchor: [0, 1.15, 0] });
  slot('kit_pendant', 'kitchen', 'pendant', 'Pendant Lights', 2, [.3, 0, .6], [2.6, .8, .3], [
    V('Amber Domes', { style: 'dome', c: '#e9a23b', stagger: true }), V('Glass Globes', { style: 'globe' }), V('Rattan Shades', { style: 'rattan', c: '#c9a56a' })], { anchor: [0, 2.6, 0] });

  // ============================================================ BEDROOM
  slot('bed_floor', 'bedroom', 'floor', 'Floor', 2, [0, 0, 0], [5, .1, 4.4], [
    V('Cozy Carpet', { kind: 'carpet', c: '#bdb8ae' }), V('Warm Oak', { kind: 'planks', c: '#c28c54', pw: .26 }), V('Dark Parquet', { kind: 'herring', c: '#6b4630' })], { surface: 'floor', anchor: [0, .3, 1.5] });
  slot('bed_wall', 'bedroom', 'wall', 'Walls', 2, [0, 0, 0], [5, 3, .1], [
    V('Dusty Rose', { kind: 'paint', c: '#ebc8c3' }), V('Lattice Paper', { kind: 'lattice', c: '#f2eadd', c2: '#cdb99b' }), V('Deep Teal', { kind: 'paint', c: '#43838a', wain: { c: '#f6f3ec', h: .85, rail: '#f6f3ec' } })], { surface: 'wall', anchor: [-2.2, 2.4, -2.1] });
  slot('bed_bed', 'bedroom', 'bed', 'Bed', 4, [-.6, 0, -1.15], [1.9, 1.2, 2.2], [
    V('Timber Frame', { style: 'wood', wood: '#a9703d', sheet: '#f5efe6', duvet: '#6c8ebf', accent: '#e6a15c' }), V('Velvet Headboard', { style: 'upholstered', wood: '#7d8a96', sheet: '#f7f3ea', duvet: '#d9c7b0', accent: '#4c6f86' }), V('Iron Bed', { style: 'metal', wood: '#2a2a2e', sheet: '#f4efe6', duvet: '#b94a48', accent: '#f0c36d' })], { anchor: [0, 1.5, 0] });
  slot('bed_wardrobe', 'bedroom', 'wardrobe', 'Wardrobe', 3, [1.7, 0, -1.89], [1.4, 2.1, .62], [
    V('White & Mirror', { style: 'mirror', c: '#f4f1ea', hand: '#c9ced3', w: 1.4 }), V('Sliding Walnut', { style: 'sliding', c: '#6b4630', c2: '#8a5d3b', hand: '#c9a24a', w: 1.4 }), V('Sage Shaker', { style: 'shaker', c: '#9bb59a', hand: '#c9a24a', w: 1.4 })], { anchor: [0, 2.5, 0] });
  slot('bed_stands', 'bedroom', 'nightstands', 'Nightstands', 3, [-.6, 0, -1.98], [3.2, .9, .45], [
    V('Oak Drawers', { style: 'drawer', c: '#b98756', c2: '#5a3d26', hand: '#c9a24a', lamp: 'shade', shade: '#f6e7c1' }), V('Brass Round', { style: 'round', c: '#f3efe6', c2: '#c9a24a', lamp: 'globe', shade: '#ffffff' }), V('White Modern', { style: 'drawer', c: '#f2f2f0', c2: '#999999', hand: '#555555', lamp: 'shade', shade: '#a9c1de' })], { anchor: [0, 1.4, .2] });
  slot('bed_rug', 'bedroom', 'rug', 'Rug', 2, [-.6, 0, .55], [2.6, .06, 1.8], [
    V('Round Shag', { round: true, w: 2.1, d: 2.1, style: 'shag', c1: '#efe3cd', c2: '#d6c19e', c3: '#fff' }), V('Persian', { w: 2.6, d: 1.7, style: 'persian', c1: '#35506b', c2: '#d9b66a', c3: '#a64b4b', fringe: true }), V('Stripes', { w: 2.6, d: 1.7, style: 'stripe', c1: '#f4efe6', c2: '#a4c3b2', c3: '#e0a458', fringe: true })], { anchor: [1.6, .3, .2] });
  slot('bed_curtains', 'bedroom', 'curtains', 'Curtains', 2, [-.6, 0, -2.2], [2.6, 2.3, .2], [
    V('Linen Drapes', { style: 'drapes', c: '#d9c7a8', c2: '#ffffff', pat: 'none', rod: '#3a2a1c' }), V('Dotted Blue', { style: 'drapes', c: '#6f93b8', c2: '#ffffff', pat: 'dots', rod: '#c9a24a' }), V('White Sheers', { style: 'sheer', c: '#f1ede4', c2: '#ffffff', pat: 'none', rod: '#2a2a2e' })], { anchor: [0, 2.4, .3], win: true });

  // ============================================================ BATHROOM
  slot('bath_floor', 'bath', 'floor', 'Floor', 2, [0, 0, 0], [5, .1, 4.4], [
    V('White Marble', { kind: 'tiles', c: '#f1f1ee', size: .6, vein: true, grout: '#d6d6d2' }), V('Slate Tile', { kind: 'tiles', c: '#5b646d', c2: '#4b535b', size: .5, grout: '#3d444b' }), V('Mint Mosaic', { kind: 'tiles', c: '#c2e5d8', c2: '#a8d6c6', size: .22, grout: '#e8f2ee' })], { surface: 'floor', anchor: [0, .3, 1.5] });
  slot('bath_wall', 'bath', 'wall', 'Walls', 2, [0, 0, 0], [5, 3, .1], [
    V('Aqua Subway', { kind: 'subway', c: '#a5d9dd' }), V('Classic White', { kind: 'subway', c: '#fbfbf9', wain: { c: '#5aa7b8', h: .5, rail: '#ffffff' } }), V('Navy Tile', { kind: 'subway', c: '#35577c' })], { surface: 'wall', anchor: [-2.2, 2.4, -2.1] });
  slot('bath_tub', 'bath', 'bathtub', 'Bathtub', 4, [-1.55, 0, -1.78], [1.9, 1.0, .9], [
    V('Freestanding', { style: 'free' }), V('Clawfoot', { style: 'claw' }), V('Tiled Alcove', { style: 'built', tile: '#7fc3cd' })], { anchor: [0, 1.4, 0] });
  slot('bath_vanity', 'bath', 'vanity', 'Vanity', 3, [.35, 0, -1.94], [1.2, 1.0, .6], [
    V('Marble Top', { style: 'cab', c: '#f4f1ea', top: '#e5e2da', hand: '#c9a24a', w: 1.1 }), V('Floating Walnut', { style: 'floating', c: '#7b5434', top: '#f3f3f1', hand: '#222222', w: 1.1 }), V('Teal Cabinet', { style: 'cab', c: '#3a8f8e', top: '#dcdcd6', hand: '#f0f0f0', w: 1.1 })], { anchor: [0, 1.1, 0] });
  slot('bath_mirror', 'bath', 'mirror', 'Mirror', 2, [.35, 1.95, -2.2], [1, 1, .1], [
    V('Gold Round', { style: 'round', frame: '#c9a24a', metal: true }), V('Oak Arch', { style: 'arch', frame: '#b98756' }), V('Lit Vanity', { style: 'rect', frame: '#222222' })], { anchor: [0, .55, .1], wall: true });
  slot('bath_toilet', 'bath', 'toilet', 'Toilet', 3, [1.75, 0, -1.85], [.5, .8, .75], [
    V('Modern', { style: 'modern', c: '#fbfcfd' }), V('Classic', { style: 'classic', c: '#f7f4ec', seat: '#c9a56a' }), V('Compact', { style: 'compact', c: '#f4f8fb' })], { anchor: [0, 1.0, 0] });
  slot('bath_mat', 'bath', 'bathmat', 'Bath Mat', 2, [-1.55, 0, -.55], [1.8, .15, .8], [
    V('Teal Round', { round: true, c: '#4aa6a6', c2: '#7bcaca', t: '#ffffff', t2: '#ffcf9f' }), V('Striped Cotton', { c: '#e9e4d8', c2: '#3d5a80', t: '#f4f4f0', t2: '#9bc4d9' }), V('Fluffy Pink', { c: '#f1b7c4', c2: '#fbd6de', t: '#fff', t2: '#c8e3c0' })], { anchor: [0, .4, 0] });

  // ============================================================ GARDEN (world coordinates, front yard)
  slot('gar_lawn', 'garden', 'lawn', 'Lawn', 2, [0, 0, 8], [10, .1, 4], [
    V('Fresh Lawn', { kind: 'grass', c: '#6db557' }), V('Wildflowers', { kind: 'grass', c: '#76b95f', flowers: 260, fl: ['#ff8fa3', '#ffe066', '#ffffff', '#c3a6ff'] }), V('Pebble Garden', { kind: 'pebble', c: '#cdc3ab' })], { surface: 'lawn', anchor: [4.4, .4, 6] });
  slot('gar_path', 'garden', 'path', 'Garden Path', 2, [0, 0, 8.2], [1.6, .1, 5], [
    V('Stepping Stones', { style: 'stones', c: '#bab4a6' }), V('Brick Walk', { style: 'brick', c: '#b4573f' }), V('Boardwalk', { style: 'plank', c: '#a97c50' })], { anchor: [0, .5, -2.4] });
  slot('gar_fence', 'garden', 'fence', 'Fence & Gate', 3, [0, 0, 8.2], [12, 1.1, .4], [
    V('White Picket', { style: 'picket', c: '#f8f4ea' }), V('Iron Railing', { style: 'iron', c: '#2a2d33' }), V('Stone Wall', { style: 'stone', c: '#b8a98e' })], { anchor: [-3.6, 1.4, 0] });
  slot('gar_tree', 'garden', 'tree', 'Tree', 3, [-5.9, 0, 4.2], [2.6, 3.8, 2.6], [
    V('Shady Oak', { style: 'oak', c: '#5da64a', trunk: '#7a5233' }), V('Cherry Blossom', { style: 'blossom', c: '#f0a9c0', trunk: '#6b4a3a' }), V('Evergreen Pine', { style: 'pine', c: '#2f7d52', trunk: '#6b4a2f' })], { anchor: [0, 4.3, 0] });
  slot('gar_beds', 'garden', 'flowerbeds', 'Flower Beds', 3, [0, 0, 3.7], [10.4, .8, .8], [
    V('Tulip Beds', { style: 'tulip', f: ['#ff6b6b', '#ffd166', '#ff9ff3', '#ffffff'], box: '#8b5e3c' }), V('Lavender', { style: 'lavender', f: ['#9b7fd1', '#b79be6', '#8a6fc4'], box: '#7a5a3c' }), V('Rose Garden', { style: 'rose', f: ['#ff4d6d', '#ffb3c1', '#fff1f3'], box: '#5c4033' })], { anchor: [-3.4, 1.2, 0] });
  slot('gar_bench', 'garden', 'bench', 'Garden Bench', 3, [-2.6, 0, 6.3], [1.7, 1, .7], [
    V('Park Bench', { style: 'park', c: '#a97c50', leg: '#2a2d33', metal: true }), V('Modern Slats', { style: 'modern', c: '#d8c3a0', leg: '#34373d', metal: true }), V('Cushion Rattan', { style: 'cushion', c: '#c9a56a', accent: '#e07b53' })], { anchor: [0, 1.4, 0] });
  slot('gar_fountain', 'garden', 'fountain', 'Water Feature', 4, [3.4, 0, 5.9], [2.4, 2, 2.4], [
    V('Tiered Fountain', { style: 'tiered', c: '#cfc7b8' }), V('Koi Pond', { style: 'pond', c: '#9a9a92' }), V('Bird Bath', { style: 'bird', c: '#d6cfc2' })], { anchor: [0, 2.3, 0] });


  // bubble anchors (room-local), spread out so the task bubbles never pile up
  const ANCH = {
    liv_floor: [-2.0, .3, 1.75], liv_wall: [-2.2, 2.7, -1.4], liv_rug: [1.7, .05, .95], liv_sofa: [-.4, 1.15, -1.68], liv_table: [-.4, .45, .25], liv_curtains: [-.4, 2.55, -2.1], liv_lamp: [1.85, 1.5, -1.8], liv_art: [1.85, 2.75, -2.15],
    kit_floor: [-2.0, .3, 1.75], kit_wall: [.2, 2.9, -2.1], kit_cabinets: [-1.9, .95, -1.55], kit_hood: [-1.45, 2.45, -1.9], kit_fridge: [1.95, 1.9, -1.8], kit_dining: [.3, .85, .95], kit_pendant: [.3, 2.35, .6],
    bed_floor: [-2.0, .3, 1.75], bed_wall: [-2.1, 2.8, -1.3], bed_bed: [-.6, 1.2, -1.1], bed_wardrobe: [1.7, 2.2, -1.89], bed_stands: [-1.88, .95, -1.98], bed_rug: [1.2, .05, .9], bed_curtains: [-.6, 2.55, -2.1],
    bath_floor: [1.9, .3, 1.7], bath_wall: [-2.2, 2.85, -1.5], bath_tub: [-1.55, .85, -1.78], bath_vanity: [.35, .95, -1.94], bath_mirror: [.35, 2.5, -2.2], bath_toilet: [1.75, .85, -1.85], bath_mat: [-1.55, .05, -.55],
    gar_tree: [-5.9, 3.9, 4.2], gar_beds: [-3.9, .75, 3.7], gar_bench: [-2.6, .9, 6.3], gar_path: [0, .25, 5.2], gar_fountain: [3.4, 2.0, 5.9], gar_lawn: [5.8, .25, 7.0], gar_fence: [-5.0, 1.1, 8.2],
  };
  S.forEach(s => { if (ANCH[s.id]) s.anchor = ANCH[s.id]; });

  const CHAPTERS = [
    { room: 'living', slots: S.filter(s => s.room === 'living').map(s => s.id) },
    { room: 'kitchen', slots: S.filter(s => s.room === 'kitchen').map(s => s.id) },
    { room: 'bedroom', slots: S.filter(s => s.room === 'bedroom').map(s => s.id) },
    { room: 'bath', slots: S.filter(s => s.room === 'bath').map(s => s.id) },
    { room: 'garden', slots: S.filter(s => s.room === 'garden').map(s => s.id) },
  ];
  const byId = {}; S.forEach(s => byId[s.id] = s);
  RENO.DATA = { ROOMS, SLOTS: S, BY_ID: byId, CHAPTERS, W, D, H, FY };
})();
