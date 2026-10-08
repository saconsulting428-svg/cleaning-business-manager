// Cosmetic-only catalogue (no gameplay effect). Price 0 = owned from the start.
export const CHARACTERS = [
  { id: 'classic',   name: 'Classic Thief',   price: 0 },
  { id: 'ninja',     name: 'Ninja',           price: 300 },
  { id: 'hacker',    name: 'Hacker',          price: 400 },
  { id: 'spy',       name: 'Spy',             price: 500 },
  { id: 'gentleman', name: 'Gentleman',       price: 650 },
  { id: 'masked',    name: 'Masked Thief',    price: 800 },
];
export const VARIANTS = [
  { id: 'black', name: 'Black', price: 0,   suit: '#232942', accent: '#9aa4c7' },
  { id: 'red',   name: 'Red',   price: 150, suit: '#c92e40', accent: '#ffc2c9' },
  { id: 'gold',  name: 'Gold',  price: 400, suit: '#d1a02c', accent: '#fff3c4' },
  { id: 'neon',  name: 'Neon',  price: 300, suit: '#12d9a0', accent: '#eafff8', glow: '#12ffbf' },
  { id: 'cyber', name: 'Cyber', price: 500, suit: '#6c3df5', accent: '#3ee8ff', glow: '#3ee8ff' },
];
export const getChar = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
export const getVariant = (id) => VARIANTS.find((v) => v.id === id) || VARIANTS[0];
