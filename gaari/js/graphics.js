/* GAARI prototype — drawn graphics: icons, cars, avatars, map. No external images needed. */

let _gid = 0;
const uid = (p) => `${p}${++_gid}`;

/* ---------- Icons (24px stroke set) ---------- */
const ICON_PATHS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  trips: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1.2" fill="currentColor"/><path d="M6 6l9-3 1.5 3"/>',
  car: '<path d="M4 16v-4l2-5h12l2 5v4"/><path d="M3 16h18v3h-3M6 19H3"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/><path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" stroke="none"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 7.5-1.8"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M3 21h13M4 10h11M15 8l3 3v7a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
  seat: '<path d="M7 4h5l1 9h5l1 7H8z"/><path d="M8 13h5"/>',
  gear: '<circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v8M12 8v8M18 8v4H6"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  heart: '<path d="M12 20s-7.5-4.6-9-9.5C2 7 4.5 4.5 7.5 4.5c2 0 3.5 1 4.5 2.5 1-1.5 2.5-2.5 4.5-2.5 3 0 5.5 2.5 4.5 6-1.5 4.9-9 9.5-9 9.5z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  siren: '<path d="M6 18v-6a6 6 0 0 1 12 0v6"/><path d="M4 21h16v-3H4zM12 3v2M4.5 6l1.4 1.4M19.5 6l-1.4 1.4"/>',
  extend: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9 2h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.5 3.8 5.5"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  chart: '<path d="M4 20V4M4 20h16"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="7" width="3" height="10" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/><path d="M11 13l9-9"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  steer: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M3.5 10.5h6M14.5 10.5h6M12 14.5V21"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
};
function icon(name, size = 20, cls = '') {
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

/* ---------- Brand mark ---------- */
function logoMark(size = 32) {
  // A steering wheel folded into a "G", ringed in truck-art stripes.
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
    <rect width="40" height="40" rx="12" fill="#1F2163"/>
    <path d="M28.5 13.2A11 11 0 1 0 31 20h-9" fill="none" stroke="#FFB21E" stroke-width="4.2" stroke-linecap="round"/>
    <circle cx="20" cy="20" r="3.2" fill="#FFB21E"/>
    <path d="M20 23.2V30" stroke="#FFB21E" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}
function logoFull(light = false) {
  const c = light ? '#fff' : 'var(--ink)';
  return `<span class="logo">${logoMark(30)}<span class="logo-word" style="color:${c}">GAARI</span><span class="logo-urdu" style="color:${light ? '#FFB21E' : 'var(--marigold-deep)'}">گاڑی</span></span>`;
}

/* ---------- Colour helpers ---------- */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/* ---------- Car illustrations ---------- */
const BODY = {
  sedan: {
    body: 'M22 128 C20 112 28 104 48 101 L112 94 C128 78 150 62 182 58 L248 57 C276 58 296 72 318 92 L362 98 C378 101 384 110 384 122 L384 130 C384 136 380 140 374 140 L30 140 C25 140 22 136 22 128 Z',
    glass: ['M130 94 C146 78 162 68 186 66 L214 66 L214 94 Z', 'M222 66 L246 66 C268 67 284 78 300 94 L222 94 Z'],
    wheels: [100, 310], door: 218, lamp: 'M364 104 L382 109 L382 115 L366 112 Z', tail: 'M22 106 L34 105 L34 114 L22 115 Z',
  },
  suv: {
    body: 'M20 126 C18 110 24 100 42 97 L96 92 C108 70 120 52 146 48 L304 48 C322 49 334 60 344 84 L368 90 C380 94 386 104 386 118 L386 130 C386 136 382 140 376 140 L28 140 C23 140 20 136 20 126 Z',
    glass: ['M112 92 C120 72 130 58 150 56 L212 56 L212 92 Z', 'M220 56 L300 56 C314 57 322 66 332 88 L220 88 Z'],
    wheels: [100, 312], door: 216, lamp: 'M366 97 L385 102 L385 110 L368 107 Z', tail: 'M20 100 L32 99 L32 112 L20 113 Z', rails: true,
  },
  hatch: {
    body: 'M26 128 C24 110 30 100 46 98 L60 96 C70 70 92 58 130 56 L230 56 C258 58 280 72 300 92 L350 98 C366 101 376 110 376 122 L376 130 C376 136 372 140 366 140 L34 140 C29 140 26 136 26 128 Z',
    glass: ['M74 96 C82 76 98 66 132 64 L190 64 L190 96 Z', 'M198 64 L228 64 C252 65 270 76 286 94 L198 94 Z'],
    wheels: [96, 306], door: 194, lamp: 'M356 104 L374 109 L374 115 L358 112 Z', tail: 'M26 102 L38 101 L38 112 L26 113 Z',
  },
};

function wheel(cx, cy = 140) {
  return `<circle cx="${cx}" cy="${cy}" r="29" fill="#141527"/>
    <circle cx="${cx}" cy="${cy}" r="24" fill="#23243A"/>
    <circle cx="${cx}" cy="${cy}" r="14.5" fill="#C9CDD6"/>
    <g stroke="#8E94A3" stroke-width="2.4">${[0, 72, 144, 216, 288].map(a => { const r = a * Math.PI / 180; return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(r) * 13).toFixed(1)}" y2="${(cy + Math.sin(r) * 13).toFixed(1)}"/>`; }).join('')}</g>
    <circle cx="${cx}" cy="${cy}" r="4.5" fill="#5D6272"/>`;
}

function carSide(car, flip = false) {
  const b = BODY[car.type] || BODY.sedan;
  const g = uid('cg');
  const dark = shade(car.color, -40);
  return `<svg viewBox="0 0 400 178" class="car-svg" role="img" aria-label="${car.make} ${car.model}">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(car.color, 30)}"/><stop offset=".55" stop-color="${car.color}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
    <ellipse cx="203" cy="168" rx="182" ry="8" fill="#000" opacity=".16"/>
    <g ${flip ? 'transform="translate(404 0) scale(-1 1)"' : ''}>
      ${b.rails ? '<path d="M150 44 L300 44" stroke="#1B1C2E" stroke-width="4" stroke-linecap="round"/>' : ''}
      <path d="${b.body}" fill="url(#${g})" stroke="${dark}" stroke-width="1.5"/>
      ${b.glass.map(p => `<path d="${p}" fill="#2B3350"/>`).join('')}
      ${b.glass.map(p => `<path d="${p}" fill="#9FB6E6" opacity=".28"/>`).join('')}
      <path d="M${b.door} 96 L${b.door} 138" stroke="${dark}" stroke-width="1.4" opacity=".7"/>
      <path d="M44 116 L372 116" stroke="#fff" stroke-width="2.5" opacity=".22"/>
      <rect x="${b.door - 34}" y="102" width="16" height="3.5" rx="1.7" fill="${dark}"/>
      <rect x="${b.door + 30}" y="102" width="16" height="3.5" rx="1.7" fill="${dark}"/>
      <path d="${b.lamp}" fill="#FFF6C9"/><path d="${b.tail}" fill="#E0374B"/>
      ${wheel(b.wheels[0])}${wheel(b.wheels[1])}
    </g>
  </svg>`;
}

function carFront(car, back = false) {
  const g = uid('cf');
  const dark = shade(car.color, -45);
  const tall = car.type === 'suv' ? -8 : 0;
  return `<svg viewBox="0 0 400 178" class="car-svg" role="img" aria-label="${back ? 'Rear' : 'Front'} view">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(car.color, 28)}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
    <ellipse cx="200" cy="166" rx="150" ry="8" fill="#000" opacity=".16"/>
    <rect x="80" y="130" width="40" height="34" rx="7" fill="#15162A"/><rect x="280" y="130" width="40" height="34" rx="7" fill="#15162A"/>
    <path d="M70 142 L70 104 C70 92 80 86 92 84 L122 ${52 + tall} C128 ${44 + tall} 136 ${40 + tall} 148 ${40 + tall} L252 ${40 + tall} C264 ${40 + tall} 272 ${44 + tall} 278 ${52 + tall} L308 84 C320 86 330 92 330 104 L330 142 Z" fill="url(#${g})" stroke="${dark}" stroke-width="1.5"/>
    <path d="M134 ${54 + tall} L266 ${54 + tall} L292 84 L108 84 Z" fill="#2B3350"/><path d="M134 ${54 + tall} L200 ${54 + tall} L170 84 L108 84 Z" fill="#9FB6E6" opacity=".25"/>
    <rect x="58" y="86" width="16" height="10" rx="4" fill="${dark}"/><rect x="326" y="86" width="16" height="10" rx="4" fill="${dark}"/>
    ${back
      ? `<path d="M80 98 L136 100 L134 112 L82 110 Z" fill="#D8324A"/><path d="M320 98 L264 100 L266 112 L318 110 Z" fill="#D8324A"/>
         <rect x="160" y="100" width="80" height="6" rx="3" fill="${dark}"/>`
      : `<path d="M82 98 L140 100 L136 112 L84 110 Z" fill="#FFF6C9"/><path d="M318 98 L260 100 L264 112 L316 110 Z" fill="#FFF6C9"/>
         <rect x="150" y="104" width="100" height="18" rx="7" fill="#1B1C2E"/><path d="M160 113 H240" stroke="#555A70" stroke-width="2"/>`}
    <rect x="70" y="128" width="260" height="16" rx="6" fill="${dark}"/>
    <rect x="166" y="124" width="68" height="17" rx="3" fill="#fff" stroke="#1B1C2E" stroke-width="1.2"/>
    <text x="200" y="136.5" text-anchor="middle" font-family="Onest, sans-serif" font-size="10" font-weight="700" fill="#1B1C2E">${car.plate || 'LEB 22-4471'}</text>
  </svg>`;
}

function carInterior(car) {
  const seat = shade(car.type === 'suv' ? '#6B4B3A' : '#3A3D52', 0);
  return `<svg viewBox="0 0 400 178" class="car-svg" role="img" aria-label="Interior">
    <rect x="0" y="0" width="400" height="178" fill="#1C1D33"/>
    <path d="M0 40 Q200 0 400 40 L400 0 L0 0 Z" fill="#9FB6E6" opacity=".35"/>
    <path d="M0 70 Q200 40 400 70 L400 96 L0 96 Z" fill="#2A2C47"/>
    <circle cx="120" cy="92" r="34" fill="none" stroke="#0E0F1F" stroke-width="9"/><circle cx="120" cy="92" r="8" fill="#0E0F1F"/>
    <rect x="178" y="64" width="64" height="30" rx="5" fill="#0E0F1F"/><rect x="183" y="68" width="54" height="22" rx="3" fill="#3A63B8" opacity=".7"/>
    <path d="M40 178 L52 108 C54 98 64 94 76 94 L130 94 C142 94 150 100 150 110 L152 178 Z" fill="${seat}"/>
    <path d="M250 178 L252 110 C252 100 260 94 272 94 L326 94 C338 94 346 98 348 108 L360 178 Z" fill="${seat}"/>
    <rect x="186" y="118" width="28" height="60" rx="8" fill="#101122"/>
  </svg>`;
}

function carDash(mileage = 87342, fuel = 75) {
  const a = (-120 + (fuel / 100) * 240) * Math.PI / 180;
  const nx = 290 + Math.sin(a) * 38, ny = 104 - Math.cos(a) * 38;
  return `<svg viewBox="0 0 400 178" class="car-svg" role="img" aria-label="Dashboard: ${mileage} km, fuel ${fuel}%">
    <rect width="400" height="178" fill="#0F1024"/>
    <circle cx="120" cy="104" r="58" fill="#17183A" stroke="#2F3170" stroke-width="3"/>
    ${Array.from({ length: 13 }, (_, i) => { const t = (-120 + i * 20) * Math.PI / 180; return `<line x1="${120 + Math.sin(t) * 50}" y1="${104 - Math.cos(t) * 50}" x2="${120 + Math.sin(t) * 43}" y2="${104 - Math.cos(t) * 43}" stroke="#8C8FC7" stroke-width="2"/>`; }).join('')}
    <line x1="120" y1="104" x2="92" y2="72" stroke="#FFB21E" stroke-width="3" stroke-linecap="round"/>
    <rect x="80" y="126" width="80" height="22" rx="4" fill="#07081A"/>
    <text x="120" y="142" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" font-weight="700" fill="#7CF0B8">${Number(mileage).toLocaleString('en-US')}</text>
    <text x="120" y="162" text-anchor="middle" font-family="Onest, sans-serif" font-size="9" fill="#8C8FC7">ODOMETER · KM</text>
    <circle cx="290" cy="104" r="50" fill="#17183A" stroke="#2F3170" stroke-width="3"/>
    <path d="M${290 + Math.sin(-120 * Math.PI / 180) * 42} ${104 - Math.cos(-120 * Math.PI / 180) * 42} A42 42 0 1 1 ${290 + Math.sin(120 * Math.PI / 180) * 42} ${104 - Math.cos(120 * Math.PI / 180) * 42}" fill="none" stroke="#2F3170" stroke-width="6"/>
    <text x="252" y="140" font-family="Onest, sans-serif" font-size="11" font-weight="700" fill="#E0374B">E</text>
    <text x="320" y="140" font-family="Onest, sans-serif" font-size="11" font-weight="700" fill="#7CF0B8">F</text>
    <line x1="290" y1="104" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#FFB21E" stroke-width="3" stroke-linecap="round"/><circle cx="290" cy="104" r="5" fill="#FFB21E"/>
    <text x="290" y="162" text-anchor="middle" font-family="Onest, sans-serif" font-size="9" fill="#8C8FC7">FUEL ${fuel}%</text>
  </svg>`;
}

function carDamage(car) {
  return `<svg viewBox="0 0 400 178" class="car-svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Damage close-up">
    <rect width="400" height="178" fill="${shade(car.color, -10)}"/>
    <path d="M0 120 C120 100 280 100 400 120 L400 178 L0 178 Z" fill="${shade(car.color, -35)}"/>
    <path d="M150 104 C170 98 196 100 214 94 M160 110 C184 106 206 108 226 102" stroke="#6B6F7C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="190" cy="102" r="38" fill="none" stroke="#E0374B" stroke-width="3.5" stroke-dasharray="7 5"/>
  </svg>`;
}

/* A car on a softly coloured scene — used for cards and galleries */
const SCENES = [
  ['#FFE9B8', '#FFD27A'], ['#DDE6FF', '#BACBFF'], ['#E3F4EC', '#BFE6D2'], ['#FFE1E8', '#FFC2D0'], ['#ECE8FF', '#D5CCFF'],
];
function carScene(car, view = 'side', idx = 0) {
  const s = SCENES[(parseInt(car.id.replace(/\D/g, ''), 10) + idx) % SCENES.length];
  let art = '';
  if (view === 'side') art = carSide(car);
  else if (view === 'side2') art = carSide(car, true);
  else if (view === 'front') art = carFront(car);
  else if (view === 'back') art = carFront(car, true);
  else if (view === 'interior') art = carInterior(car);
  else if (view === 'dash') art = carDash();
  const dark = view === 'interior' || view === 'dash';
  return `<div class="scene ${dark ? 'scene-dark' : ''}" style="--s1:${s[0]};--s2:${s[1]}"><div class="scene-sun"></div>${art}</div>`;
}

/* ---------- Avatars ---------- */
const SKINS = ['#F3D2B3', '#E2B48C', '#C98E62', '#9C6644'];
const HAIRS = ['#1E1B1A', '#2C211C', '#3B2A20', '#151515', '#4A3527', '#6B6B6B'];
function avatar(p, size = 44) {
  const a = p.avatar || { skin: 1, hair: 0, bg: '#E6E0FF' };
  const skin = SKINS[a.skin % SKINS.length], hair = HAIRS[a.hair % HAIRS.length];
  const longHair = a.hair === 3 || a.hair === 4;
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${p.name}">
    <rect width="64" height="64" rx="32" fill="${a.bg}"/>
    ${longHair ? `<path d="M16 34 C14 18 22 12 32 12 C42 12 50 18 48 34 L50 52 L14 52 Z" fill="${hair}"/>` : ''}
    <path d="M12 64 C14 50 22 45 32 45 C42 45 50 50 52 64 Z" fill="${longHair ? '#E8336D' : '#23256B'}"/>
    <rect x="27" y="37" width="10" height="10" rx="4" fill="${shade(skin, -18)}"/>
    <ellipse cx="32" cy="29" rx="11" ry="13" fill="${skin}"/>
    ${longHair ? `<path d="M20 28 C20 17 26 14 32 14 C40 14 45 19 44 28 C40 22 30 20 20 28 Z" fill="${hair}"/>`
      : `<path d="M20 27 C19 17 25 13 32 13 C40 13 45 17 44 27 C42 21 36 19 30 20 C25 21 22 23 20 27 Z" fill="${hair}"/>${a.hair === 1 || a.hair === 5 ? `<path d="M23 34 C24 42 28 45 32 45 C36 45 40 42 41 34 C38 38 26 38 23 34 Z" fill="${hair}"/>` : ''}`}
    <circle cx="27.5" cy="30" r="1.4" fill="#1E1B1A"/><circle cx="36.5" cy="30" r="1.4" fill="#1E1B1A"/>
  </svg>`;
}

/* ---------- Lahore mock map with a moving phone dot ---------- */
function mapSVG(opts = {}) {
  const route = 'M60 250 C90 220 110 210 140 200 S200 170 220 150 S260 110 300 96 S340 70 352 52';
  const id = uid('rt');
  return `<svg viewBox="0 0 390 300" class="map-svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mock map of Lahore showing the renter's phone location">
    <rect width="390" height="300" fill="#ECEAE2"/>
    <g fill="#E1DED3">${Array.from({ length: 42 }, (_, i) => `<rect x="${(i % 7) * 58 + 6}" y="${Math.floor(i / 7) * 52 + 6}" width="${40 + (i % 3) * 5}" height="${34 + (i % 2) * 6}" rx="4"/>`).join('')}</g>
    <rect x="236" y="176" width="92" height="66" rx="10" fill="#CDE7C4"/>
    <text x="282" y="213" text-anchor="middle" font-size="8.5" font-family="Onest, sans-serif" fill="#4E7A45">Race Course Park</text>
    <rect x="18" y="30" width="70" height="52" rx="10" fill="#CDE7C4"/>
    <text x="53" y="60" text-anchor="middle" font-size="8.5" font-family="Onest, sans-serif" fill="#4E7A45">Gymkhana</text>
    <path d="M-10 150 C80 140 150 120 200 80 S300 10 400 0" stroke="#A9D2EE" stroke-width="9" fill="none"/>
    <text font-size="8.5" font-family="Onest, sans-serif" fill="#3D7FB0"><textPath href="#canal${id}" startOffset="8%">Lahore Canal</textPath></text>
    <path id="canal${id}" d="M-10 142 C80 132 150 112 200 72 S300 2 400 -8" fill="none"/>
    <g stroke="#fff" stroke-linecap="round" fill="none">
      <path d="M0 230 L390 200" stroke-width="11"/><path d="M120 0 L170 300" stroke-width="11"/>
      <path d="M0 100 L390 130" stroke-width="7"/><path d="M280 0 L240 300" stroke-width="7"/>
      <path d="M0 280 L390 262" stroke-width="5"/><path d="M40 0 L70 300" stroke-width="5"/>
    </g>
    <text x="14" y="222" font-size="8.5" font-weight="600" font-family="Onest, sans-serif" fill="#6F7185" transform="rotate(-4 14 222)">Main Boulevard Gulberg</text>
    <text x="178" y="292" font-size="8.5" font-weight="600" font-family="Onest, sans-serif" fill="#6F7185" transform="rotate(-80 178 292)">Ferozepur Road</text>
    <text x="296" y="122" font-size="8.5" font-weight="600" font-family="Onest, sans-serif" fill="#6F7185" transform="rotate(5 296 122)">Jail Road</text>
    <path d="${route}" stroke="#23256B" stroke-width="4" fill="none" stroke-dasharray="1 8" stroke-linecap="round" opacity=".55"/>
    ${opts.showStart !== false ? `<g transform="translate(60 250)"><circle r="7" fill="#FFB21E" stroke="#fff" stroke-width="2.5"/></g>` : ''}
    <g>
      <circle r="20" fill="#3A63FF" opacity=".18"><animate attributeName="r" values="10;24;10" dur="2.4s" repeatCount="indefinite"/></circle>
      <circle r="8" fill="#3A63FF" stroke="#fff" stroke-width="3"/>
      <animateMotion begin="-${Math.round((opts.speed || 60) * 0.45)}s" dur="${opts.speed || 60}s" repeatCount="indefinite" path="${route}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/>
    </g>
  </svg>`;
}
