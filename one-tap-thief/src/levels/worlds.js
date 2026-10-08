// World themes. Level numbers per world follow the design doc (10 levels each, 50 total).
export const WORLDS = {
  house:     { id: 'house',     name: 'Small House',      levels: [1, 10],  floor: ['#2f3862', '#2a335a'], wall: '#202a55', wallTop: '#4b5796', furn: '#7a5a3c', accent: '#f5c542' },
  apartment: { id: 'apartment', name: 'Luxury Apartment', levels: [11, 20], floor: ['#3d3664', '#37305c'], wall: '#241d44', wallTop: '#5d539a', furn: '#8c6f4e', accent: '#e8b4ff' },
  jewelry:   { id: 'jewelry',   name: 'Jewelry Store',    levels: [21, 30], floor: ['#27465a', '#223f52'], wall: '#12303f', wallTop: '#43728d', furn: '#5f8da8', accent: '#7fe3ff' },
  museum:    { id: 'museum',    name: 'Museum',           levels: [31, 40], floor: ['#4a4339', '#443d34'], wall: '#2a241c', wallTop: '#75695a', furn: '#9a8466', accent: '#ffcf8a' },
  bank:      { id: 'bank',      name: 'Bank',             levels: [41, 50], floor: ['#32463b', '#2d4035'], wall: '#17261e', wallTop: '#55725f', furn: '#6b7f72', accent: '#6dff9f' },
};
export const WORLD_ORDER = ['house', 'apartment', 'jewelry', 'museum', 'bank'];
export const TOTAL_LEVELS = 50;
export const worldForLevel = (n) => WORLD_ORDER.map((id) => WORLDS[id]).find((w) => n >= w.levels[0] && n <= w.levels[1]);
