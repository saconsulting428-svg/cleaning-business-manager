/* GAARI prototype — core: state, navigation, shared components, demo controls.
   Screens live in js/renter.js, js/owner.js and js/admin.js. */

const STORE_KEY = 'gaari-demo-v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const Screens = {};
const Actions = {};
const memory = { photos: {} }; // uploaded images stay in memory only (too big for localStorage)

/* ---------- Formatting ---------- */
const rs = (n) => 'Rs. ' + Math.round(n).toLocaleString('en-US');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDate = (iso) => { const d = parseISO(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const fmtDay = (iso) => parseISO(iso).toLocaleDateString('en-GB', { weekday: 'short' });
const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nowTime = () => { const d = new Date(); return `${((d.getHours() + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`; };

/* ---------- State ---------- */
let S;
function defaultState() {
  return {
    role: 'renter',
    stack: { renter: [{ s: 'home' }], owner: [{ s: 'o-dash' }], admin: [{ s: 'a-dash' }] },
    search: { city: 'Lahore', from: '2026-10-10', to: '2026-10-13', q: '', sort: 'recommended',
      f: { self: false, driver: false, auto: false, manual: false, verified: false, types: [], seats: 0, rating: 0, maxPrice: 15000 } },
    favs: ['c3'],
    detail: { type: 'self' },
    bookForm: null,
    booking: null,
    nextId: 10284,
    history: [],
    simDay: false,
    sharing: true,
    wallet: {
      balance: 5000,
      tx: [
        { type: 'topup', amount: 5000, label: 'Top up · JazzCash', date: '26 Sep' },
        { type: 'commission', amount: -1100, label: 'Rental commission · GR-10247', date: '23 Sep' },
        { type: 'commission', amount: -1650, label: 'Rental commission · GR-10219', date: '15 Sep' },
        { type: 'topup', amount: 3000, label: 'Top up · Easypaisa', date: '10 Sep' },
      ],
    },
    stats: { bookings: 18, days: 31, gross: 170500 },
    ownerCars: [{ carId: 'c1', status: 'verified', paused: false }],
    avail: { '2026-10-05': 'unavailable', '2026-10-06': 'unavailable', '2026-10-16': 'maintenance', '2026-10-20': 'booked', '2026-10-21': 'booked', '2026-10-22': 'booked' },
    draft: null,
    threads: [
      { id: 'T-OLD1', ref: 'GR-10219', carId: 'c3', title: 'Usman · Kia Sportage', closed: true, unread: { renter: 0, owner: 0 },
        msgs: [{ from: 'system', text: 'Rental closed. Thank you for renting with GAARI.' }, { from: 'owner', text: 'Shukriya Hamza! Car was returned in perfect condition.', t: '15 Sep' }] },
    ],
    notifs: { renter: [], owner: [], admin: [] },
    incidents: [],
    admin: { tab: 'a-dash', kyc: {}, veh: {}, disputes: {}, sub: {} },
    reviewDone: false,
    ownerReviewDone: false,
    seenIntro: false,
  };
}
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { S = Object.assign(defaultState(), JSON.parse(raw)); return; } } catch (e) { /* storage unavailable */ }
  S = defaultState();
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

/* ---------- Lookups ---------- */
const carById = (id) => CARS.find((c) => c.id === id) || (S.customCars || []).find((c) => c.id === id);
const allCars = () => CARS.concat(S.customCars || []);
const ownerOf = (car) => OWNERS[car.owner] || OWNERS.o1;
const carName = (car) => `${car.make} ${car.model} ${car.year}`;
const carShort = (car) => `${car.make} ${car.model.split(' ')[0]}`;
const rateFor = (car, type) => car.price + (type === 'driver' ? car.driverRate : 0);
const commissionOf = (amount) => Math.round(amount * COMMISSION_RATE);
const B = () => S.booking;
const ACTIVE_FLOW = ['confirmed', 'handover', 'inspection', 'condition_ok', 'handed_over', 'active', 'returning'];
const bookingLive = () => B() && !['completed', 'declined', 'cancelled'].includes(B().status);
const identityUnlocked = () => B() && ['handover', 'inspection', 'condition_ok', 'handed_over', 'active', 'returning'].includes(B().status);
/* Commission owed on confirmed-but-not-completed bookings (GR-10291 is a seeded confirmed booking). */
function upcomingCommission() {
  const b = B();
  return 1100 + (b && ACTIVE_FLOW.includes(b.status) ? b.commission : 0);
}
function canAcceptBooking(b) { return S.wallet.balance - upcomingCommission() >= b.commission; }

const STATUS = {
  requested: { label: 'Awaiting owner confirmation', cls: 'st-wait', dot: '🟡' },
  declined: { label: 'Declined by owner', cls: 'st-bad', dot: '🔴' },
  cancelled: { label: 'Cancelled', cls: 'st-bad', dot: '⚪' },
  confirmed: { label: 'Booking confirmed', cls: 'st-ok', dot: '🟢' },
  handover: { label: 'Handover mode', cls: 'st-lock', dot: '🔐' },
  inspection: { label: 'Handover · inspection shared', cls: 'st-lock', dot: '🔐' },
  condition_ok: { label: 'Handover · condition accepted', cls: 'st-lock', dot: '🔐' },
  handed_over: { label: 'Handover · keys handed over', cls: 'st-lock', dot: '🔐' },
  active: { label: 'Trip active', cls: 'st-live', dot: '🟢' },
  returning: { label: 'Return inspection', cls: 'st-lock', dot: '🔍' },
  completed: { label: 'Rental completed', cls: 'st-done', dot: '✅' },
};
function statusPill(status, big = false) {
  const m = STATUS[status] || STATUS.requested;
  return `<span class="status ${m.cls} ${big ? 'status-big' : ''}"><span class="status-dot"></span>${m.label}</span>`;
}

/* ---------- Shared components ---------- */
function rentalBadges(rental) {
  if (rental === 'both') return '<span class="tb tb-both">Both options</span>';
  if (rental === 'driver') return '<span class="tb tb-driver">With driver</span>';
  return '<span class="tb tb-self">Self drive</span>';
}
const vchip = (t, ok = true) => `<span class="vchip ${ok ? '' : 'vchip-off'}">${icon(ok ? 'check' : 'clock', 13)}${t}</span>`;
const stars = (r) => `<span class="rating">${icon('star', 14)}${r.toFixed(1)}</span>`;
const starsRow = (n) => `<span class="stars-row">${Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'on' : ''}">${icon('star', 13)}</span>`).join('')}</span>`;

function topbar(title, opts = {}) {
  return `<header class="topbar ${opts.transparent ? 'topbar-clear' : ''}">
    ${opts.back === false ? '<span class="tb-spacer"></span>' : `<button class="icon-btn" data-back aria-label="Back">${icon('back', 22)}</button>`}
    <div class="topbar-title">${title}${opts.sub ? `<small>${opts.sub}</small>` : ''}</div>
    ${opts.right || '<span class="tb-spacer"></span>'}
  </header>`;
}
function bellBtn() {
  const n = S.notifs[S.role].filter((x) => !x.read).length;
  return `<button class="icon-btn" data-go="notifs" aria-label="Notifications">${icon('bell', 21)}${n ? `<span class="dot-badge">${n}</span>` : ''}</button>`;
}
function trustRing(score, size = 92) {
  const pct = score / 5, r = 38, c = 2 * Math.PI * r;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 92 92"><circle cx="46" cy="46" r="${r}" fill="none" stroke="var(--line)" stroke-width="8"/>
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="var(--trust)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(c * pct).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 46 46)"/></svg>
    <div class="ring-val"><b>${score.toFixed(1)}</b><small>Trust</small></div></div>`;
}
function verifyList(items) {
  return `<div class="verify-list">${items.map(([label, ok = true, sub = '']) => `<div class="verify-row ${ok ? '' : 'pending'}"><span class="vr-ic">${icon(ok ? 'check' : 'clock', 15)}</span><span>${label}${sub ? `<small>${sub}</small>` : ''}</span></div>`).join('')}</div>`;
}
function kv(rows) {
  return `<dl class="kv">${rows.filter(Boolean).map(([k, v, cls = '']) => `<div class="${cls}"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}
function emptyState(ic, title, text, btn = '') {
  return `<div class="empty"><div class="empty-ic">${icon(ic, 30)}</div><h3>${title}</h3><p>${text}</p>${btn}</div>`;
}
function demoHint(text, act, label, data = '') {
  return `<div class="demo-hint"><span>${icon('sparkle', 15)} ${text}</span><button class="demo-hint-btn" data-act="${act}" ${data}>${label} →</button></div>`;
}

/* ---------- Toasts, sheets, notifications ---------- */
function toast(msg, type = 'ok') {
  const root = S.role === 'admin' ? document.body : $('#device');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icon(type === 'err' ? 'alert' : type === 'info' ? 'info' : 'check', 18)}<span>${msg}</span>`;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 2800);
}
function openSheet(html, opts = {}) {
  closeSheet(true);
  const host = S.role === 'admin' ? document.body : $('#device');
  const wrap = document.createElement('div');
  wrap.className = `sheet-wrap ${opts.center ? 'sheet-center' : ''} ${S.role === 'admin' ? 'sheet-fixed' : ''}`;
  wrap.innerHTML = `<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grab"></div>${html}</div>`;
  host.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('in'));
  const f = wrap.querySelector('[autofocus]'); if (f) f.focus();
}
function closeSheet(instant) {
  $$('.sheet-wrap').forEach((w) => { if (instant) w.remove(); else { w.classList.remove('in'); setTimeout(() => w.remove(), 250); } });
}
function notify(role, title, body, go, ic = 'bell') {
  S.notifs[role].unshift({ title, body, go, ic, t: nowTime(), read: false });
  if (role !== S.role && role !== 'admin') {
    // Show the other side's notification as a small banner so presenters see cross-role events
    banner(role, title);
  }
}
function banner(role, title) {
  const el = document.createElement('button');
  el.className = 'x-banner';
  el.innerHTML = `<span class="xb-role">${role === 'owner' ? 'Owner app' : 'Renter app'}</span><span class="xb-text">${esc(title)}</span><span class="xb-go">Open ${icon('chev', 14)}</span>`;
  el.onclick = () => { el.remove(); switchRole(role); };
  (S.role === 'admin' ? document.body : $('#device')).appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 5200);
}

/* ---------- Chat helpers ---------- */
function threadFor(ref) { return S.threads.find((t) => t.ref === ref); }
function sysMsg(text) {
  const b = B(); if (!b) return;
  const t = threadFor(b.id); if (!t) return;
  t.msgs.push({ from: 'system', text, t: nowTime() });
}
function unreadCount(role) { return S.threads.reduce((n, t) => n + (t.unread[role] || 0), 0); }

/* ---------- Navigation ---------- */
function cur() { const st = S.stack[S.role]; return st[st.length - 1]; }
function go(s, p = {}, opt = {}) {
  const st = S.stack[S.role];
  if (opt.reset) S.stack[S.role] = [{ s, p }];
  else if (opt.replace) st[st.length - 1] = { s, p };
  else st.push({ s, p });
  closeSheet(true);
  save(); render('fwd');
}
function back() {
  const st = S.stack[S.role];
  if (st.length > 1) st.pop();
  save(); render('back');
}
function tabGo(s) { S.stack[S.role] = [{ s }]; save(); render('none'); }
function switchRole(role) {
  S.role = role; closeSheet(true); $$('.x-banner').forEach((b) => b.remove()); save(); render('none'); updateDemoUI();
}

const NAV = {
  renter: [['home', 'home', 'Home'], ['search', 'search', 'Search'], ['trips', 'trips', 'Trips'], ['inbox', 'chat', 'Messages'], ['me', 'user', 'Profile']],
  owner: [['o-dash', 'grid', 'Dashboard'], ['o-bookings', 'trips', 'Bookings'], ['o-wallet', 'wallet', 'Wallet'], ['inbox', 'chat', 'Messages'], ['o-cars', 'car', 'My cars']],
};
function navBadge(role, s) {
  if (s === 'inbox') return unreadCount(role);
  if (s === 'o-bookings') return B() && B().status === 'requested' || (B() && B().extension && B().extension.status === 'pending') ? 1 : 0;
  if (s === 'trips') return bookingLive() ? '•' : 0;
  return 0;
}
function renderNav(def) {
  const nav = $('#bottomnav');
  if (!def || !def.tab) { nav.hidden = true; return; }
  nav.hidden = false;
  nav.innerHTML = NAV[S.role].map(([s, ic, label]) => {
    const n = navBadge(S.role, s);
    return `<button class="nav-btn ${def.tab === s ? 'on' : ''}" data-tab="${s}">${icon(ic, 22)}<span>${label}</span>${n ? `<i class="nav-badge">${n}</i>` : ''}</button>`;
  }).join('');
}

let lastScreenKey = '';
function render(dir = 'none') {
  const isAdmin = S.role === 'admin';
  document.body.classList.toggle('mode-admin', isAdmin);
  $('#app-stage').hidden = isAdmin;
  $('#admin-root').hidden = !isAdmin;
  if (isAdmin) { renderAdmin(); updateDemoUI(); return; }
  const c = cur();
  const def = Screens[c.s] || Screens.home;
  const screen = $('#screen');
  const key = `${S.role}:${c.s}:${JSON.stringify(c.p || {})}`;
  const keepScroll = key === lastScreenKey && dir === 'none';
  const top = screen.scrollTop;
  screen.innerHTML = `<div class="page ${dir !== 'none' && key !== lastScreenKey ? 'enter-' + dir : ''}">${def.render(c.p || {})}</div>`;
  screen.classList.toggle('has-nav', !!def.tab);
  screen.scrollTop = keepScroll ? top : 0;
  lastScreenKey = key;
  renderNav(def);
  if (def.after) def.after(screen, c.p || {});
  updateDemoUI();
}
/* Re-render in place (keeps scroll) — used after state changes */
function refresh() { save(); render('none'); }

/* ---------- Event delegation ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-go],[data-act],[data-back],[data-tab]');
  if (!t) return;
  if (t.hasAttribute('data-back')) { e.preventDefault(); back(); return; }
  if (t.dataset.tab) { tabGo(t.dataset.tab); return; }
  if (t.dataset.go) {
    e.preventDefault();
    const { go: s, act, ...p } = t.dataset;
    go(s, p);
    return;
  }
  if (t.dataset.act && Actions[t.dataset.act]) { e.preventDefault(); Actions[t.dataset.act](t, e); }
});
document.addEventListener('input', (e) => {
  const t = e.target.closest('[data-in]');
  if (t && Actions[t.dataset.in]) Actions[t.dataset.in](t, e);
});
document.addEventListener('change', (e) => {
  const t = e.target.closest('[data-ch]');
  if (t && Actions[t.dataset.ch]) Actions[t.dataset.ch](t, e);
});
document.addEventListener('click', (e) => { const d = e.target.closest('.date-overlay'); if (d && d.showPicker) { try { d.showPicker(); } catch (err) { /* not allowed */ } } });
document.addEventListener('submit', (e) => { e.preventDefault(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
  if (e.key === 'Enter' && e.target.matches('[data-enter]') && Actions[e.target.dataset.enter]) { e.preventDefault(); Actions[e.target.dataset.enter](e.target, e); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('article[data-go]')) { e.preventDefault(); e.target.click(); }
});

Actions.closeSheet = () => closeSheet();
Actions.role = (el) => switchRole(el.dataset.role);

/* ---------- Notifications screen (both app roles) ---------- */
Screens.notifs = {
  render() {
    const list = S.notifs[S.role];
    list.forEach((n) => { n.read = true; }); save();
    return `${topbar('Notifications')}
      <div class="pad stack-12">
        ${list.length ? list.map((n) => `<button class="notif" ${n.go ? `data-go="${n.go}"` : ''}><span class="notif-ic">${icon(n.ic, 18)}</span><span class="notif-body"><b>${esc(n.title)}</b><small>${esc(n.body || '')}</small></span><time>${n.t}</time></button>`).join('')
          : emptyState('bell', 'All caught up', 'Booking updates, handover steps and payments will show up here.')}
      </div>`;
  },
};

/* ---------- Demo mode ---------- */
function demoSteps() {
  const b = B();
  const steps = [
    { role: 'renter', t: 'Search, pick a car and request a booking', done: !!b, go: 'search' },
    { role: 'owner', t: 'Accept the booking request', done: b && b.status !== 'requested', go: 'o-booking' },
    { role: 'renter', t: 'Rental day: tap “I’ve arrived”', done: b && !['requested', 'confirmed', 'declined'].includes(b.status), go: 'trip' },
    { role: 'owner', t: 'See protected identity, run handover inspection', done: b && ['inspection', 'condition_ok', 'handed_over', 'active', 'returning', 'completed'].includes(b.status), go: 'o-booking' },
    { role: 'renter', t: 'Accept vehicle condition', done: b && ['condition_ok', 'handed_over', 'active', 'returning', 'completed'].includes(b.status), go: 'trip' },
    { role: 'owner', t: 'Mark vehicle handed over', done: b && ['handed_over', 'active', 'returning', 'completed'].includes(b.status), go: 'o-booking' },
    { role: 'renter', t: 'Confirm vehicle received · trip goes live', done: b && ['active', 'returning', 'completed'].includes(b.status), go: 'trip' },
    { role: 'renter', t: 'Live phone location, request an extension', done: b && (b.extension || ['returning', 'completed'].includes(b.status)), go: 'extend', optional: true },
    { role: 'owner', t: 'Review extension, then complete the return', done: b && b.status === 'completed', go: 'o-booking' },
    { role: 'renter', t: 'Leave a review', done: S.reviewDone, go: 'trip' },
    { role: 'owner', t: 'Check commission wallet & earnings', done: S.reviewDone && S.seenWallet, go: 'o-wallet' },
    { role: 'admin', t: 'Admin: KYC, vehicles, bookings, disputes', done: false, go: 'a-dash' },
  ];
  const next = steps.findIndex((s) => !s.done && !(s.optional && b && b.status !== 'active'));
  return { steps, next };
}
Actions.demoStep = (el) => {
  const { steps } = demoSteps();
  const s = steps[+el.dataset.i];
  if (!s) return;
  S.role = s.role;
  if (s.role === 'admin') { S.admin.tab = s.go; }
  else if (['o-booking', 'trip', 'extend'].includes(s.go) && !B()) S.stack[s.role] = [{ s: s.role === 'owner' ? 'o-dash' : 'search' }];
  else if (s.go === 'o-booking' || s.go === 'trip') S.stack[s.role] = [{ s: s.role === 'owner' ? 'o-bookings' : 'trips' }, { s: s.go }];
  else if (s.go === 'extend') S.stack[s.role] = [{ s: 'trips' }, { s: 'trip' }, { s: 'extend' }];
  else S.stack[s.role] = [{ s: s.go }];
  closeSheet(true); save(); render('none');
};
function demoPanelHTML() {
  const { steps, next } = demoSteps();
  return `<div class="demo-panel">
    <div class="dp-roles" role="tablist" aria-label="Demo role">
      ${[['renter', 'Renter'], ['owner', 'Owner'], ['admin', 'Admin']].map(([r, l]) => `<button role="tab" aria-selected="${S.role === r}" class="${S.role === r ? 'on' : ''}" data-act="role" data-role="${r}">${l}</button>`).join('')}
    </div>
    <p class="dp-label">Demo script</p>
    <ol class="dp-steps">
      ${steps.map((s, i) => `<li class="${s.done ? 'done' : ''} ${i === next ? 'next' : ''}"><button data-act="demoStep" data-i="${i}"><span class="dp-num">${s.done ? icon('check', 12) : i + 1}</span><span class="dp-t"><em>${s.role}</em>${s.t}</span></button></li>`).join('')}
    </ol>
    <div class="dp-tools">
      <button data-act="demoLowBalance">${icon('wallet', 15)} Set owner wallet to Rs. 500</button>
      <button data-act="demoReset">${icon('refresh', 15)} Reset demo</button>
    </div>
  </div>`;
}
function updateDemoUI() {
  const side = $('#demo-side');
  if (side) {
    side.innerHTML = demoPanelHTML();
    const next = $('.dp-steps li.next', side), list = $('.dp-steps', side);
    if (next && list) list.scrollTop = next.offsetTop - list.offsetTop - 40;
  }
  const fab = $('#demo-fab');
  if (fab) fab.querySelector('b').textContent = S.role;
}
Actions.openDemo = () => openSheet(`<div class="sheet-head"><h3>Demo mode</h3><p>Prototype controls. Not part of the product.</p></div>${demoPanelHTML()}`);
Actions.demoLowBalance = () => { S.wallet.balance = 500; save(); closeSheet(true); render('none'); toast('Owner wallet set to Rs. 500', 'info'); };
Actions.demoReset = () => {
  openSheet(`<div class="sheet-head"><h3>Reset the demo?</h3><p>Bookings, messages, wallet and listings go back to the starting example data.</p></div>
    <div class="row-2"><button class="btn btn-ghost" data-act="closeSheet">Keep going</button><button class="btn btn-danger" data-act="demoResetYes">Reset</button></div>`, { center: true });
};
Actions.demoResetYes = () => { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ } S = defaultState(); memory.photos = {}; closeSheet(true); render('none'); toast('Demo reset'); };

/* ---------- Boot ---------- */
function tick() { const el = $('#sb-time'); if (el) el.textContent = S && S.simDay ? '9:52' : '9:41'; }
document.addEventListener('DOMContentLoaded', () => {
  load();
  applyCarEdits();
  $('#demo-fab').addEventListener('click', Actions.openDemo);
  render('none');
  tick();
});
