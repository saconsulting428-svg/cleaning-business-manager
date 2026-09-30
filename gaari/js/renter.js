/* GAARI prototype — renter experience + shared chat/profile screens. */

const PAY = {
  cash: { label: 'Cash', sub: 'Pay the owner at handover', ic: 'cash' },
  jazzcash: { label: 'JazzCash', sub: 'Send to owner’s JazzCash wallet', ic: 'phone' },
  easypaisa: { label: 'Easypaisa', sub: 'Send to owner’s Easypaisa wallet', ic: 'phone' },
  bank: { label: 'Bank transfer', sub: 'IBFT / Raast to owner’s account', ic: 'bank' },
};
const ADDRESS = { c1: 'House 42, Street 7, DHA Phase 5, Lahore' };

/* ---------- Home ---------- */
Screens.home = {
  tab: 'home',
  render() {
    const s = S.search;
    const b = B();
    const popular = allCars().filter((c) => c.city === s.city).slice(0, 5);
    return `
    <header class="home-head">${logoFull()}<div class="hh-right">${bellBtn()}</div></header>
    <section class="hero">
      <div class="hero-art" aria-hidden="true">${carSide(CARS[0])}</div>
      <p class="hero-kicker">Salam, ${RENTER.name} 👋</p>
      <h1>Where do you need a car?</h1>
      <div class="hero-form">
        <label class="hf-field hf-city">${icon('pin', 18)}<span><small>Location</small>
          <select id="h-city" data-ch="homeField" data-k="city">${CITIES.map((c) => `<option ${c === s.city ? 'selected' : ''}>${c}</option>`).join('')}</select></span></label>
        <div class="hf-dates">
          <label class="hf-field">${icon('cal', 18)}<span><small>Pickup date</small><b class="hf-val">${fmtDay(s.from)}, ${fmtDate(s.from)}</b></span><input id="h-from" class="date-overlay" type="date" value="${s.from}" min="2026-09-30" data-ch="homeField" data-k="from" aria-label="Pickup date"></label>
          <label class="hf-field">${icon('cal', 18)}<span><small>Return date</small><b class="hf-val">${fmtDay(s.to)}, ${fmtDate(s.to)}</b></span><input id="h-to" class="date-overlay" type="date" value="${s.to}" min="2026-10-01" data-ch="homeField" data-k="to" aria-label="Return date"></label>
        </div>
        <button class="btn btn-primary btn-block btn-lg" data-act="findCar">${icon('search', 20)} Find a car</button>
      </div>
      <div class="truck-stripe" aria-hidden="true"></div>
    </section>

    <div class="or-divider"><span>OR</span></div>

    <button class="earn-cta" data-go="earn">
      <span class="earn-emoji" aria-hidden="true">💰</span>
      <span class="earn-text"><b>Rent my car</b><small>Turn your unused car into income.</small></span>
      <span class="earn-go">${icon('chev', 20)}</span>
    </button>

    ${b && bookingLive() ? `<section class="pad-x"><button class="live-card" data-go="trip">
      <div class="lc-top">${statusPill(b.status)}<span class="mono">${b.id}</span></div>
      <div class="lc-body"><div class="lc-car">${carSide(carById(b.carId))}</div><div><b>${carName(carById(b.carId))}</b><small>${fmtDate(b.from)} → ${fmtDate(b.to)} · ${fmtTime(b.time)}</small></div></div>
      <span class="lc-go">Open rental ${icon('chev', 16)}</span></button></section>` : ''}

    <section class="section">
      <div class="sec-head"><h2>Why people trust GAARI</h2></div>
      <div class="trust-strip">
        ${[['shield', 'Verified people', 'CNIC, licence, face & phone checked'], ['car', 'Verified cars', 'Registration & photos reviewed'], ['camera', 'Digital handover', 'Before & after photos, signed in app'], ['lock', 'Protected identity', 'Owners never download your CNIC']]
          .map(([ic, t, d]) => `<div class="ts-item"><span class="ts-ic">${icon(ic, 20)}</span><b>${t}</b><small>${d}</small></div>`).join('')}
      </div>
    </section>

    <section class="section">
      <div class="sec-head"><h2>Popular in ${s.city}</h2><button class="link" data-act="findCar">See all</button></div>
      <div class="h-scroll">${popular.length ? popular.map(miniCard).join('') : `<p class="muted">More cars coming soon in ${s.city}.</p>`}</div>
    </section>

    <section class="pad-x">
      <div class="fee-banner">
        <div><span class="fee-zero">Rs. 0</span><b>platform fee for renters</b><small>Pay the owner directly by cash, JazzCash, Easypaisa or bank transfer. Your booking, agreement and handover still stay inside GAARI.</small></div>
      </div>
    </section>

    <section class="section">
      <div class="sec-head"><h2>Rent anywhere in Pakistan</h2></div>
      <div class="city-row">${CITIES.map((c) => `<button class="city-chip ${c === s.city ? 'on' : ''}" data-act="pickCity" data-city="${c}"><b>${c}</b><small>${allCars().filter((x) => x.city === c).length} cars</small></button>`).join('')}</div>
    </section>
    <p class="foot-note">Apni car se kamao. Kisi ki bhi car rent karo.</p>`;
  },
};
function miniCard(car) {
  return `<button class="mini-card" data-go="car" data-id="${car.id}">
    <div class="mc-media">${carScene(car)}</div>
    <div class="mc-body"><b>${car.make} ${car.model.split(' ')[0]} ${car.year}</b>
    <div class="mc-meta">${stars(car.rating)}<span>${car.area}</span></div>
    <div class="mc-price"><b>${rs(car.price)}</b>/day</div></div></button>`;
}
Actions.homeField = (el) => { if (!el.value) return; S.search[el.dataset.k] = el.value; if (S.search.to <= S.search.from) S.search.to = addDays(S.search.from, 1); refresh(); };
Actions.findCar = () => { go('search'); };
Actions.pickCity = (el) => { S.search.city = el.dataset.city; save(); go('search'); };

/* ---------- Search ---------- */
function filteredCars() {
  const { city, q, f, sort } = S.search;
  let list = allCars().filter((c) => c.city === city);
  if (q.trim()) { const t = q.trim().toLowerCase(); list = list.filter((c) => `${c.make} ${c.model} ${c.area} ${c.year}`.toLowerCase().includes(t)); }
  if (f.self) list = list.filter((c) => c.rental !== 'driver');
  if (f.driver) list = list.filter((c) => c.rental !== 'self');
  if (f.auto && !f.manual) list = list.filter((c) => c.trans === 'Automatic');
  if (f.manual && !f.auto) list = list.filter((c) => c.trans === 'Manual');
  if (f.verified) list = list.filter((c) => c.verified);
  if (f.types.length) list = list.filter((c) => f.types.includes(c.type));
  if (f.seats) list = list.filter((c) => c.seats >= f.seats);
  if (f.rating) list = list.filter((c) => c.rating >= f.rating);
  list = list.filter((c) => c.price <= f.maxPrice);
  if (sort === 'low') list.sort((a, b) => a.price - b.price);
  if (sort === 'high') list.sort((a, b) => b.price - a.price);
  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || b.trips - a.trips);
  return list;
}
function activeFilterCount() {
  const f = S.search.f;
  return ['self', 'driver', 'auto', 'manual', 'verified'].filter((k) => f[k]).length + f.types.length + (f.seats ? 1 : 0) + (f.rating ? 1 : 0) + (f.maxPrice < 15000 ? 1 : 0);
}
function carCard(car) {
  const days = Math.max(1, daysBetween(S.search.from, S.search.to));
  const fav = S.favs.includes(car.id);
  return `<article class="car-card" data-go="car" data-id="${car.id}" tabindex="0">
    <div class="cc-media">${carScene(car)}
      <div class="cc-badges">${rentalBadges(car.rental)}</div>
      <button class="fav ${fav ? 'on' : ''}" data-act="fav" data-id="${car.id}" aria-label="Save car" aria-pressed="${fav}">${icon('heart', 18)}</button>
    </div>
    <div class="cc-body">
      <div class="cc-row"><h3>${car.make} ${car.model} ${car.year}</h3><div class="price"><b>${rs(car.price)}</b><small>/day</small></div></div>
      <div class="cc-meta">${stars(car.rating)}<span class="muted">(${car.trips} trips)</span><span class="sep">·</span>${icon('pin', 14)}<span>${car.area}, ${car.city}</span></div>
      <div class="cc-chips">${vchip('Owner verified')}${vchip('Vehicle verified', car.verified)}</div>
      <div class="cc-foot"><span>${car.trans} · ${car.seats} seats · ${car.fuel}</span><span class="cc-total">${rs(car.price * days)} for ${days} day${days > 1 ? 's' : ''}</span></div>
    </div>
  </article>`;
}
function skeletonCards(n = 3) {
  return Array.from({ length: n }, () => '<div class="car-card skel"><div class="skel-media"></div><div class="cc-body"><div class="skel-line w70"></div><div class="skel-line w40"></div><div class="skel-line w90"></div></div></div>').join('');
}
function resultsHTML() {
  const list = filteredCars();
  if (!list.length) {
    return emptyState('search', 'No cars match these filters', `Try removing a filter or searching another area of ${S.search.city}.`, '<button class="btn btn-ghost" data-act="clearFilters">Clear filters</button>');
  }
  return list.map(carCard).join('');
}
const QUICK = [['verified', 'Verified only'], ['self', 'Self drive'], ['driver', 'With driver'], ['auto', 'Automatic'], ['manual', 'Manual']];
Screens.search = {
  tab: 'search',
  render() {
    const s = S.search;
    const n = activeFilterCount();
    const count = filteredCars().length;
    return `
    <header class="search-head">
      <button class="search-summary" data-act="editTrip">${icon('pin', 18)}<span><b>${s.city}</b><small>${fmtDate(s.from)} – ${fmtDate(s.to)} · ${Math.max(1, daysBetween(s.from, s.to))} days</small></span>${icon('down', 16)}</button>
      <button class="icon-btn filter-btn ${n ? 'on' : ''}" data-act="openFilters" aria-label="Filters">${icon('filter', 21)}${n ? `<span class="dot-badge">${n}</span>` : ''}</button>
    </header>
    <div class="pad-x"><label class="search-input">${icon('search', 18)}<input id="q" type="search" placeholder="Search Corolla, Civic, DHA…" value="${esc(s.q)}" data-in="searchQ" autocomplete="off"></label></div>
    <div class="chip-row">${QUICK.map(([k, l]) => `<button class="chip ${s.f[k] ? 'on' : ''}" data-act="quickFilter" data-k="${k}">${s.f[k] ? icon('check', 14) : ''}${l}</button>`).join('')}
      ${['sedan', 'suv', 'hatch'].map((t) => `<button class="chip ${s.f.types.includes(t) ? 'on' : ''}" data-act="typeFilter" data-t="${t}">${{ sedan: 'Sedan', suv: 'SUV', hatch: 'Hatchback' }[t]}</button>`).join('')}</div>
    <div class="results-head pad-x"><span id="rcount"><b>${count}</b> cars in ${s.city}</span>
      <label class="sort">Sort <select id="sort" data-ch="sortBy">${[['recommended', 'Recommended'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['rating', 'Top rated']].map(([v, l]) => `<option value="${v}" ${s.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <div id="results" class="results pad-x">${resultsHTML()}</div>`;
  },
};
function reloadResults(delay = 380) {
  const el = $('#results'); if (!el) return;
  el.innerHTML = skeletonCards(2);
  const c = $('#rcount'); if (c) c.innerHTML = `<b>${filteredCars().length}</b> cars in ${S.search.city}`;
  clearTimeout(reloadResults.t);
  reloadResults.t = setTimeout(() => { el.innerHTML = resultsHTML(); }, delay);
}
Actions.searchQ = (el) => { S.search.q = el.value; save(); reloadResults(250); };
Actions.sortBy = (el) => { S.search.sort = el.value; save(); reloadResults(); };
Actions.quickFilter = (el) => { const k = el.dataset.k; S.search.f[k] = !S.search.f[k]; save(); refresh(); reloadResults(); };
Actions.typeFilter = (el) => { const t = el.dataset.t, a = S.search.f.types; S.search.f.types = a.includes(t) ? a.filter((x) => x !== t) : a.concat(t); save(); refresh(); reloadResults(); };
Actions.clearFilters = () => { S.search.f = defaultState().search.f; S.search.q = ''; save(); refresh(); };
Actions.fav = (el, e) => { e.stopPropagation(); const id = el.dataset.id; S.favs = S.favs.includes(id) ? S.favs.filter((x) => x !== id) : S.favs.concat(id); save(); el.classList.toggle('on'); el.setAttribute('aria-pressed', S.favs.includes(id)); toast(S.favs.includes(id) ? 'Saved to your cars' : 'Removed from saved', 'info'); };
Actions.editTrip = () => {
  const s = S.search;
  openSheet(`<div class="sheet-head"><h3>Where and when?</h3></div>
    <div class="form-stack">
      <label class="field"><span>City</span><select id="et-city">${CITIES.map((c) => `<option ${c === s.city ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <div class="row-2"><label class="field"><span>Pickup</span><input id="et-from" type="date" value="${s.from}" min="2026-09-30"></label>
      <label class="field"><span>Return</span><input id="et-to" type="date" value="${s.to}" min="2026-10-01"></label></div>
      <p class="field-err" id="et-err" hidden>Return date must be after pickup date.</p>
      <button class="btn btn-primary btn-block" data-act="saveTrip">Show cars</button></div>`);
};
Actions.saveTrip = () => {
  const from = $('#et-from').value, to = $('#et-to').value;
  if (!from || !to || to <= from) { $('#et-err').hidden = false; return; }
  Object.assign(S.search, { city: $('#et-city').value, from, to }); closeSheet(); refresh(); reloadResults();
};
Actions.openFilters = () => {
  const f = S.search.f;
  const tog = (k, l) => `<button class="chip ${f[k] ? 'on' : ''}" data-act="fToggle" data-k="${k}">${l}</button>`;
  openSheet(`<div class="sheet-head"><h3>Filters</h3></div>
    <div class="filter-body" id="filter-body">
      <div class="fgroup"><h4>Max price per day <b id="fp-val">${rs(f.maxPrice)}</b></h4><input id="f-price" type="range" min="2500" max="15000" step="500" value="${f.maxPrice}" data-in="fPrice"><div class="range-ends"><span>Rs. 2,500</span><span>Rs. 15,000</span></div></div>
      <div class="fgroup"><h4>Rental type</h4><div class="chip-wrap">${tog('self', 'Self drive')}${tog('driver', 'With driver')}</div></div>
      <div class="fgroup"><h4>Car type</h4><div class="chip-wrap">${['sedan', 'suv', 'hatch'].map((t) => `<button class="chip ${f.types.includes(t) ? 'on' : ''}" data-act="fType" data-t="${t}">${{ sedan: 'Sedan', suv: 'SUV', hatch: 'Hatchback' }[t]}</button>`).join('')}</div></div>
      <div class="fgroup"><h4>Transmission</h4><div class="chip-wrap">${tog('auto', 'Automatic')}${tog('manual', 'Manual')}</div></div>
      <div class="fgroup"><h4>Seats</h4><div class="chip-wrap">${[0, 4, 5, 7].map((n) => `<button class="chip ${f.seats === n ? 'on' : ''}" data-act="fSeats" data-n="${n}">${n ? n + '+' : 'Any'}</button>`).join('')}</div></div>
      <div class="fgroup"><h4>Rating</h4><div class="chip-wrap">${[0, 4.5, 4.8].map((n) => `<button class="chip ${f.rating === n ? 'on' : ''}" data-act="fRating" data-n="${n}">${n ? '★ ' + n + '+' : 'Any'}</button>`).join('')}</div></div>
      <div class="fgroup fg-switch"><div><h4>Verified cars only</h4><small>Registration and photos checked by GAARI</small></div><button class="switch ${f.verified ? 'on' : ''}" role="switch" aria-checked="${f.verified}" data-act="fToggle" data-k="verified"><span></span></button></div>
    </div>
    <div class="row-2 sheet-foot"><button class="btn btn-ghost" data-act="fClear">Clear all</button><button class="btn btn-primary" data-act="fApply">Show ${filteredCars().length} cars</button></div>`);
};
function refreshFilterSheet() { const y = $('.sheet') ? $('.sheet').scrollTop : 0; Actions.openFilters(); const s = $('.sheet'); if (s) s.scrollTop = y; $$('.sheet-wrap').forEach((w) => w.classList.add('in')); }
Actions.fToggle = (el) => { const k = el.dataset.k; S.search.f[k] = !S.search.f[k]; refreshFilterSheet(); };
Actions.fType = (el) => { const t = el.dataset.t, a = S.search.f.types; S.search.f.types = a.includes(t) ? a.filter((x) => x !== t) : a.concat(t); refreshFilterSheet(); };
Actions.fSeats = (el) => { S.search.f.seats = +el.dataset.n; refreshFilterSheet(); };
Actions.fRating = (el) => { S.search.f.rating = +el.dataset.n; refreshFilterSheet(); };
Actions.fPrice = (el) => { S.search.f.maxPrice = +el.value; $('#fp-val').textContent = rs(+el.value); const b = $('[data-act="fApply"]'); if (b) b.textContent = `Show ${filteredCars().length} cars`; };
Actions.fClear = () => { S.search.f = defaultState().search.f; refreshFilterSheet(); };
Actions.fApply = () => { closeSheet(); refresh(); reloadResults(); };

/* ---------- Car detail ---------- */
Screens.car = {
  render(p) {
    const car = carById(p.id);
    if (!car) return `${topbar('Car')}${emptyState('car', 'Car not found', 'This listing is no longer available.')}`;
    if (S.detail.id !== car.id) S.detail = { id: car.id, type: car.rental === 'driver' ? 'driver' : 'self' };
    const type = S.detail.type;
    const owner = ownerOf(car);
    const days = Math.max(1, daysBetween(S.search.from, S.search.to));
    const rate = rateFor(car, type);
    const views = [['side', 'Side'], ['front', 'Front'], ['back', 'Rear'], ['interior', 'Interior'], ['dash', 'Dashboard']];
    return `
    <div class="gallery-wrap">
      <div class="gallery" id="gallery">${views.map(([v], i) => `<div class="g-slide">${carScene(car, v, i)}</div>`).join('')}</div>
      <div class="g-top"><button class="icon-btn glass" data-back aria-label="Back">${icon('back', 22)}</button>
        <div class="g-actions"><button class="icon-btn glass" data-act="shareCar" aria-label="Share">${icon('share', 19)}</button><button class="icon-btn glass fav-lite ${S.favs.includes(car.id) ? 'on' : ''}" data-act="fav" data-id="${car.id}" aria-label="Save">${icon('heart', 19)}</button></div></div>
      <div class="g-dots" id="gdots">${views.map(([, l], i) => `<span class="${i === 0 ? 'on' : ''}" title="${l}"></span>`).join('')}</div>
      <span class="g-count" id="gcount">1 / ${views.length} · Side</span>
    </div>
    <div class="detail">
      <div class="d-badges">${rentalBadges(car.rental)}${car.verified ? '<span class="tb tb-ok">Verified car</span>' : '<span class="tb tb-wait">Verification pending</span>'}</div>
      <h1 class="d-title">${car.make} ${car.model} ${car.year}</h1>
      <div class="d-meta">${stars(car.rating)}<span><b>${car.trips}</b> completed rentals</span><span class="sep">·</span>${icon('pin', 14)}<span>${car.area}, ${car.city}</span></div>
      <div class="d-price"><b>${rs(car.price)}</b><span>/day</span><small>${rs(car.weekly)}/week · ${rs(car.monthly)}/month</small></div>

      <section class="d-sec"><h2>Verification</h2>
        <div class="verify-grid">
          ${[['Owner verified', true], ['Vehicle verified', car.verified], ['Documents verified', car.verified], ['Identity verified', true]].map(([t, ok]) => `<div class="vg ${ok ? '' : 'off'}">${icon(ok ? 'shield' : 'clock', 18)}<span>${t}</span></div>`).join('')}
        </div></section>

      <section class="d-sec"><h2>Rental option</h2>
        <div class="opt-list">
          ${[['self', 'Self drive', 'You drive. Valid licence required.', 'steer'], ['driver', 'With driver', `Driver included · +${rs(car.driverRate)}/day`, 'user']].map(([k, t, d, ic]) => {
            const offered = car.rental === 'both' || car.rental === k;
            return `<button class="opt ${type === k ? 'on' : ''} ${offered ? '' : 'disabled'}" ${offered ? `data-act="pickType" data-t="${k}"` : 'disabled'} aria-pressed="${type === k}">
              <span class="radio"></span><span class="opt-ic">${icon(ic, 20)}</span><span class="opt-t"><b>${t}</b><small>${offered ? d : 'Not offered by this owner'}</small></span></button>`;
          }).join('')}
        </div>
        ${car.rental === 'both' ? '<p class="note">This owner offers <b>both options</b>. Pick the one you need.</p>' : ''}
        ${type === 'driver' ? `<div class="driver-box">${icon('user', 18)}<div><b>Driver included</b><small>Owner’s authorised, verified driver · up to 10 hrs/day · ${rs(car.driverRate)}/day. Fuel and tolls are paid by you. Driver’s meals on out-of-city trips.</small></div></div>` : ''}
      </section>

      <section class="d-sec"><h2>Vehicle</h2>
        <div class="spec-grid">${[['cal', 'Year', car.year], ['gear', 'Transmission', car.trans], ['fuel', 'Fuel', car.fuel], ['seat', 'Seats', car.seats], ['gauge', 'Mileage', car.mileage], ['car', 'Engine', car.engine]].map(([ic, k, v]) => `<div class="spec">${icon(ic, 18)}<small>${k}</small><b>${v}</b></div>`).join('')}</div></section>

      <section class="d-sec"><h2>Features</h2><div class="chip-wrap">${car.features.map((f) => `<span class="feat">${icon('check', 13)}${f}</span>`).join('')}</div></section>

      <section class="d-sec"><h2>Your host</h2>
        <button class="owner-card" data-go="owner-profile" data-id="${owner.id}">${avatar(owner, 52)}
          <div class="oc-main"><b>${owner.name}</b><span class="oc-v">${icon('shield', 14)} Identity verified</span><small>${stars(owner.rating)} · ${owner.rentals} rentals · replies in ${owner.responseTime}</small></div>${icon('chev', 18)}</button>
        <p class="note">${icon('lock', 13)} Chat with ${owner.name} inside GAARI. Phone numbers are shared automatically at pickup.</p></section>

      <section class="d-sec"><h2>Pickup location</h2>
        <div class="loc-card"><div class="loc-map">${mapSVG({ speed: 9999, showStart: false })}<span class="loc-radius"></span></div>
        <p><b>${car.area}, ${car.city}</b><small>Exact address is shared after the owner confirms your booking.</small></p></div></section>

      <section class="d-sec"><h2>Good to know</h2>
        <ul class="perks">
          <li>${icon('check', 16)}<span><b>No security deposit.</b> Your verified profile and trust score do the work.</span></li>
          <li>${icon('check', 16)}<span><b>Rs. 0 platform fee.</b> Pay the owner directly.</span></li>
          <li>${icon('check', 16)}<span><b>Digital handover.</b> Photos, mileage and fuel recorded before and after.</span></li>
          <li>${icon('check', 16)}<span><b>Free cancellation</b> up to 24 hours before pickup.</span></li>
        </ul></section>

      <section class="d-sec"><h2>${stars(car.rating)} ${car.reviews} reviews</h2>
        ${CAR_REVIEWS.slice(0, 2).map(reviewItem).join('')}</section>
    </div>
    <div class="cta-bar">
      <div class="cta-price"><b>${rs(rate)}<small>/day</small></b><span>${days} days · ${rs(rate * days)} total</span></div>
      <button class="btn btn-primary btn-lg" data-act="startBooking" data-id="${car.id}">Book now</button>
    </div>`;
  },
  after(root) {
    const g = $('#gallery', root); if (!g) return;
    const labels = ['Side', 'Front', 'Rear', 'Interior', 'Dashboard'];
    g.addEventListener('scroll', () => {
      const i = Math.round(g.scrollLeft / g.clientWidth);
      $$('#gdots span', root).forEach((d, j) => d.classList.toggle('on', i === j));
      const c = $('#gcount', root); if (c) c.textContent = `${i + 1} / 5 · ${labels[i]}`;
    }, { passive: true });
  },
};
function reviewItem(r) {
  return `<div class="review"><div class="rv-top"><b>${r.who}</b>${starsRow(r.stars)}<time>${r.when}</time></div><p>${r.text}</p></div>`;
}
Actions.pickType = (el) => { S.detail.type = el.dataset.t; refresh(); };
Actions.shareCar = () => {
  const t = 'https://gaari.pk/car/toyota-corolla-2022-dha-lahore';
  const done = () => toast('Link copied');
  try { navigator.clipboard.writeText(t).then(done, () => toast(t, 'info')); } catch (e) { toast(t, 'info'); }
};
Actions.startBooking = (el) => {
  const car = carById(el.dataset.id);
  S.bookForm = { carId: car.id, type: S.detail.type, from: S.search.from, to: S.search.to, time: '10:00', pay: 'jazzcash', agree: true };
  go('book');
};

/* ---------- Owner public profile ---------- */
Screens['owner-profile'] = {
  render(p) {
    const o = OWNERS[p.id] || OWNERS.o1;
    const cars = allCars().filter((c) => c.owner === o.id);
    return `${topbar('Host profile')}
    <div class="profile-hero">${avatar(o, 84)}<h1>${o.name}</h1><span class="oc-v">${icon('shield', 15)} Identity verified</span><small>${o.city} · on GAARI since ${o.since}</small></div>
    <div class="stat-row pad-x">
      <div><b>${o.rating}</b><small>${icon('star', 12)} Rating</small></div>
      <div><b>${o.rentals}</b><small>Completed rentals</small></div>
      <div><b>${o.response}%</b><small>Response rate</small></div>
    </div>
    <section class="section pad-x"><h2 class="h2">Trust indicators</h2>
      ${verifyList([['Identity verified', true, 'CNIC and face checked by GAARI'], ['Phone verified'], ['Vehicle documents verified', true, 'Registration & token tax'], ['Replies within ' + o.responseTime], ['0 cancellations in last 90 days']])}
      <div class="privacy-note">${icon('lock', 16)}<span>GAARI never shows CNIC numbers, CNIC images or private documents on public profiles.</span></div>
    </section>
    <section class="section"><div class="sec-head"><h2>${o.name}’s cars</h2></div><div class="h-scroll">${cars.map(miniCard).join('')}</div></section>
    <section class="section pad-x"><h2 class="h2">What renters say</h2>${CAR_REVIEWS.map(reviewItem).join('')}</section>`;
  },
};

/* ---------- Booking ---------- */
Screens.book = {
  render() {
    const f = S.bookForm;
    if (!f) return `${topbar('Book')}${emptyState('car', 'Pick a car first', 'Choose a car to start a booking.', '<button class="btn btn-primary" data-tab="search">Find a car</button>')}`;
    const car = carById(f.carId);
    const days = daysBetween(f.from, f.to);
    const bad = !(days >= 1);
    const rate = rateFor(car, f.type);
    const amount = Math.max(days, 0) * rate;
    return `${topbar('Request booking', { sub: carName(car) })}
    <div class="pad stack-16">
      <div class="book-car">${carScene(car)}<div><b>${carName(car)}</b><small>${stars(car.rating)} · ${car.area}, ${car.city}</small><div class="d-badges">${rentalBadges(car.rental)}</div></div></div>

      <section class="card">
        <h3 class="card-t">Trip dates</h3>
        <div class="date-pair">
          <label class="field"><span>Pickup</span><input id="b-from" type="date" value="${f.from}" min="2026-09-30" data-ch="bookField" data-k="from"></label>
          <label class="field"><span>Time</span><select id="b-time" data-ch="bookField" data-k="time">${['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '18:00'].map((t) => `<option value="${t}" ${f.time === t ? 'selected' : ''}>${fmtTime(t)}</option>`).join('')}</select></label>
          <label class="field"><span>Return</span><input id="b-to" type="date" value="${f.to}" min="2026-10-01" data-ch="bookField" data-k="to"></label>
          <label class="field"><span>Time</span><input value="${fmtTime(f.time)}" disabled></label>
        </div>
        ${bad ? '<p class="field-err">Return date must be at least one day after pickup.</p>' : `<p class="date-summary">${icon('clock', 15)} Pickup <b>${fmtDate(f.from)} — ${fmtTime(f.time)}</b> · Return <b>${fmtDate(f.to)} — ${fmtTime(f.time)}</b></p>`}
      </section>

      <section class="card">
        <h3 class="card-t">Rental type</h3>
        <div class="seg">${[['self', 'Self drive'], ['driver', 'With driver']].map(([k, l]) => { const ok = car.rental === 'both' || car.rental === k; return `<button class="${f.type === k ? 'on' : ''}" ${ok ? `data-act="bookType" data-t="${k}"` : 'disabled'}>${l}</button>`; }).join('')}</div>
        ${f.type === 'driver' ? `<p class="note">${icon('user', 13)} Driver included · ${rs(car.driverRate)}/day. Fuel paid by you.</p>` : `<p class="note">${icon('steer', 13)} You drive. Your licence is already verified.</p>`}
      </section>

      <section class="card price-card">
        <h3 class="card-t">Price</h3>
        <div class="pline"><span>Rental · ${Math.max(days, 0)} days × ${rs(car.price)}</span><b>${rs(Math.max(days, 0) * car.price)}</b></div>
        ${f.type === 'driver' ? `<div class="pline"><span>Driver · ${Math.max(days, 0)} days × ${rs(car.driverRate)}</span><b>${rs(Math.max(days, 0) * car.driverRate)}</b></div>` : ''}
        <div class="pline"><span>Platform fee</span><b class="free">Rs. 0</b></div>
        <div class="pline total"><span>You pay the owner</span><b>${rs(amount)}</b></div>
        <p class="note">${icon('info', 13)} No security deposit. GAARI charges renters nothing.</p>
      </section>

      <section class="card">
        <h3 class="card-t">Payment method <span class="tag">Pay owner directly</span></h3>
        <div class="pay-list">${Object.entries(PAY).map(([k, m]) => `<button class="pay ${f.pay === k ? 'on' : ''}" data-act="bookPay" data-k="${k}" aria-pressed="${f.pay === k}"><span class="radio"></span><span class="pay-ic">${icon(m.ic, 18)}</span><span><b>${m.label}</b><small>${m.sub}</small></span></button>`).join('')}</div>
      </section>

      <section class="card share-card">
        <h3 class="card-t">${icon('lock', 16)} What ${ownerOf(car).name} sees before confirming</h3>
        <div class="protected-mini">${avatar(RENTER, 40)}<div><b>${RENTER.name}</b><small>${stars(RENTER.trust)} trust · ${RENTER.rentals} rentals</small></div></div>
        <div class="chip-wrap">${vchip('CNIC')}${vchip('Licence')}${vchip('Face')}${vchip('Phone')}</div>
        <p class="note">Your CNIC image, number and phone stay private. Details needed for handover unlock only when you arrive for pickup.</p>
      </section>

      <label class="agree"><input id="b-agree" type="checkbox" ${f.agree ? 'checked' : ''} data-ch="bookAgree"><span>I agree to the <button class="link" data-act="showAgreement">GAARI digital rental agreement</button> and the owner’s car rules.</span></label>
    </div>
    <div class="cta-bar">
      <div class="cta-price"><b>${rs(amount)}</b><span>to owner · Rs. 0 fee</span></div>
      <button class="btn btn-primary btn-lg" id="req-btn" data-act="requestBooking" ${bad || !f.agree ? 'disabled' : ''}>Request booking</button>
    </div>`;
  },
};
Actions.bookField = (el) => { S.bookForm[el.dataset.k] = el.value; refresh(); };
Actions.bookType = (el) => { S.bookForm.type = el.dataset.t; refresh(); };
Actions.bookPay = (el) => { S.bookForm.pay = el.dataset.k; refresh(); };
Actions.bookAgree = (el) => { S.bookForm.agree = el.checked; refresh(); };
Actions.showAgreement = (el, e) => {
  e.stopPropagation();
  const b = B();
  const car = carById(b ? b.carId : S.bookForm.carId);
  openSheet(`<div class="sheet-head"><h3>Digital rental agreement</h3><p>${b ? `Rental ID ${b.id} · ` : ''}${carName(car)}</p></div>
    <ol class="agreement">
      <li>The car belongs to the owner. GAARI is the booking platform and does not own any car.</li>
      <li>Renter pays the rental amount directly to the owner. GAARI charges the renter no platform fee.</li>
      <li>Both sides record the car’s condition, mileage and fuel in the app at pickup and return.</li>
      <li>The car is returned at the agreed time and place, with the same fuel level.</li>
      <li>Traffic challans during the rental are the renter’s responsibility.</li>
      <li>No sub-renting, racing, or leaving Pakistan’s highways network without owner approval.</li>
      <li>Accidents and disputes are reported in the app. GAARI support reviews the handover records.</li>
    </ol>
    <button class="btn btn-primary btn-block" data-act="closeSheet">Got it</button>`);
};
Actions.requestBooking = (el) => {
  if (bookingLive()) {
    openSheet(`<div class="sheet-head"><h3>You already have a rental in progress</h3><p>Finish ${B().id} first, or reset the demo from Demo mode.</p></div><button class="btn btn-primary btn-block" data-act="goTrip">Open ${B().id}</button>`, { center: true });
    return;
  }
  el.disabled = true; el.innerHTML = '<span class="spinner"></span> Sending request…';
  setTimeout(() => {
    const f = S.bookForm, car = carById(f.carId), owner = ownerOf(car);
    const days = daysBetween(f.from, f.to), rate = rateFor(car, f.type), amount = days * rate;
    const id = 'GR-' + S.nextId++;
    if (S.booking && S.booking.status === 'completed') S.history.unshift(S.booking);
    S.booking = { id, carId: car.id, type: f.type, from: f.from, to: f.to, time: f.time, days, rate, amount, commission: commissionOf(amount), pay: f.pay, status: 'requested', extension: null, pre: null, post: null, address: ADDRESS[car.id] || `${car.area}, ${car.city}` };
    S.simDay = false; S.reviewDone = false; S.ownerReviewDone = false;
    S.threads = S.threads.filter((t) => t.ref !== id);
    S.threads.unshift({ id: 'T-' + id, ref: id, carId: car.id, title: `${owner.name} · ${carShort(car)}`, unread: { renter: 0, owner: 1 },
      msgs: [{ from: 'system', text: `Booking requested · ${id}`, t: nowTime() }, { from: 'renter', text: `Assalam-o-Alaikum ${owner.name} bhai! I’d like to rent your ${car.model.split(' ')[0]} from ${fmtDate(f.from)} to ${fmtDate(f.to)}.`, t: nowTime() }] });
    notify('owner', `New booking request for your ${car.make} ${car.model.split(' ')[0]}`, `${RENTER.name} · ${fmtDate(f.from)}–${fmtDate(f.to)} · ${rs(amount)}`, 'o-booking', 'cal');
    S.stack.renter = [{ s: 'trips' }, { s: 'trip' }];
    save(); render('fwd');
    openSheet(`<div class="success-sheet"><div class="success-ic">${icon('check', 34)}</div><h3>Request sent to ${owner.name}</h3><p>Most owners reply within ${owner.responseTime}. We’ll notify you here and in Messages.</p>
      <div class="rid">Rental ID <b>${id}</b></div>
      ${demoHint('Continue as the owner to accept', 'role', 'Owner app', 'data-role="owner"')}
      <button class="btn btn-ghost btn-block" data-act="closeSheet">View booking status</button></div>`, { center: true });
  }, 1100);
};
Actions.goTrip = () => { closeSheet(true); S.stack.renter = [{ s: 'trips' }, { s: 'trip' }]; S.role = 'renter'; refresh(); };

/* ---------- Trips list ---------- */
const PAST_TRIPS = [
  { id: 'GR-10219', carId: 'c3', dates: '12–15 Sep', amount: 25500, owner: 'Usman', stars: 5 },
  { id: 'GR-10102', carId: 'c2', dates: '4–5 Jul', amount: 4800, owner: 'Sana', stars: 5 },
];
Screens.trips = {
  tab: 'trips',
  render() {
    const b = B();
    const past = (b && ['completed', 'declined'].includes(b.status) ? [b] : []).concat(S.history);
    return `<header class="page-head"><h1>My trips</h1>${bellBtn()}</header>
    <div class="pad-x stack-12">
      <h2 class="h3">Current</h2>
      ${b && bookingLive() ? tripCard(b) : emptyState('trips', 'No upcoming trips', 'Find a verified car near you and request a booking in minutes.', '<button class="btn btn-primary" data-tab="search">Find a car</button>')}
      <h2 class="h3">Past</h2>
      ${past.map(tripCard).join('')}
      ${PAST_TRIPS.map((t) => { const car = carById(t.carId); return `<div class="trip-card past"><div class="tc-media">${carSide(car)}</div><div class="tc-body"><div class="tc-top"><span class="status st-done"><span class="status-dot"></span>Completed</span><span class="mono">${t.id}</span></div><b>${carName(car)}</b><small>${t.dates} · ${rs(t.amount)} · Host ${t.owner}</small><small>You rated ${starsRow(t.stars)}</small></div></div>`; }).join('')}
    </div>`;
  },
};
function tripCard(b) {
  const car = carById(b.carId);
  return `<button class="trip-card" data-go="trip"><div class="tc-media">${carSide(car)}</div><div class="tc-body"><div class="tc-top">${statusPill(b.status)}<span class="mono">${b.id}</span></div><b>${carName(car)}</b><small>${fmtDate(b.from)} → ${fmtDate(b.to)} · ${fmtTime(b.time)} · ${rs(b.amount)}</small></div>${icon('chev', 18)}</button>`;
}

/* ---------- Rental status (renter) ---------- */
const FLOW_STEPS = [['requested', 'Requested'], ['confirmed', 'Confirmed'], ['handover', 'Handover'], ['active', 'Trip active'], ['completed', 'Returned']];
function flowIndex(st) { return { requested: 0, declined: 0, confirmed: 1, handover: 2, inspection: 2, condition_ok: 2, handed_over: 2, active: 3, returning: 3, completed: 4 }[st] || 0; }
function progress(st) {
  const i = flowIndex(st);
  return `<ol class="progress">${FLOW_STEPS.map(([, l], j) => `<li class="${j < i || st === 'completed' ? 'done' : ''} ${j === i && st !== 'completed' ? 'now' : ''}"><span></span><small>${l}</small></li>`).join('')}</ol>`;
}
function bookingFacts(b, car) {
  return kv([
    ['Rental ID', `<span class="mono">${b.id}</span>`],
    ['Pickup', `${fmtDay(b.from)} ${fmtDate(b.from)} · ${fmtTime(b.time)}`],
    ['Return', `${fmtDay(b.to)} ${fmtDate(b.to)} · ${fmtTime(b.time)}`],
    ['Location', b.status === 'requested' ? `${car.area}, ${car.city}` : b.address],
    ['Rental type', b.type === 'driver' ? 'With driver' : 'Self drive'],
    ['Rental amount', `${rs(b.amount)} <small class="muted">(${b.days} days)</small>`],
    ['Platform fee', '<span class="free">Rs. 0</span>'],
    ['Payment', `${PAY[b.pay].label} · pay owner directly`],
  ]);
}
Screens.trip = {
  render() {
    const b = B();
    if (!b) return `${topbar('Rental')}${emptyState('trips', 'No rental yet', 'Request a booking and its status will appear here.', '<button class="btn btn-primary" data-tab="search">Find a car</button>')}`;
    const car = carById(b.carId), owner = ownerOf(car);
    const head = `${topbar(b.id, { sub: carName(car), right: `<button class="icon-btn" data-act="openChat" aria-label="Chat">${icon('chat', 21)}</button>` })}`;
    let body = '';
    const ownerRow = `<div class="owner-row">${avatar(owner, 40)}<div><b>${owner.name}</b><small>${icon('shield', 12)} Verified host · ${stars(owner.rating)}</small></div><button class="icon-btn soft" data-act="openChat" aria-label="Chat">${icon('chat', 19)}</button><button class="icon-btn soft" data-act="callOwner" aria-label="Call">${icon('phone', 19)}</button></div>`;

    if (b.status === 'requested') {
      body = `<div class="status-hero sh-wait"><div class="pulse-ring">${icon('clock', 26)}</div>${statusPill('requested', true)}<p>We’ve sent your request to ${owner.name}. You’ll get a notification when they reply.</p></div>
        ${progress(b.status)}
        <div class="card">${bookingFacts(b, car)}</div>
        ${demoHint('Switch to the owner to accept or decline', 'role', 'Owner app', 'data-role="owner"')}
        <button class="btn btn-ghost btn-block" data-act="cancelReq">Cancel request</button>`;
    } else if (b.status === 'declined') {
      body = `<div class="status-hero sh-bad"><div class="sh-ic">${icon('x', 26)}</div>${statusPill('declined', true)}<p>${owner.name} can’t take this booking${b.declineReason ? ` (${esc(b.declineReason)})` : ''}. Similar verified cars are available for your dates.</p></div>
        <button class="btn btn-primary btn-block" data-tab="search">Find similar cars</button>`;
    } else if (b.status === 'confirmed' && !S.simDay) {
      body = `<div class="status-hero sh-ok"><div class="sh-ic">${icon('check', 28)}</div>${statusPill('confirmed', true)}<p>${owner.name} confirmed your booking. See you on ${fmtDay(b.from)}, ${fmtDate(b.from)}.</p></div>
        ${progress(b.status)}
        <div class="card">${bookingFacts(b, car)}</div>
        ${ownerRow}
        <button class="doc-row" data-act="showAgreement">${icon('file', 20)}<span><b>Digital rental agreement</b><small>Signed by both at handover</small></span>${icon('chev', 18)}</button>
        ${demoHint('Fast-forward to pickup day', 'simDay', 'Go to rental day')}`;
    } else if (b.status === 'confirmed' && S.simDay) {
      body = `<div class="today-card">
          <p class="today-k">Your rental today</p>
          <div class="today-car">${carSide(car)}</div>
          <h2>${carName(car)}</h2>
          <div class="today-facts"><div><small>Rental ID</small><b class="mono">${b.id}</b></div><div><small>Pickup</small><b>${car.area}</b></div><div><small>Time</small><b>${fmtTime(b.time)}</b></div></div>
          <p class="today-addr">${icon('pin', 15)} ${b.address}</p>
        </div>
        ${ownerRow}
        <div class="info-box">${icon('info', 18)}<span>When you reach the pickup point, tap <b>I’ve arrived</b>. ${owner.name} will then see the verified details needed to hand over the car.</span></div>
        <div class="cta-bar"><button class="btn btn-primary btn-block btn-xl" data-act="arrived">${icon('pin', 22)} I’ve arrived</button></div>`;
    } else if (b.status === 'handover') {
      body = `<div class="status-hero sh-lock"><div class="sh-ic">${icon('lock', 26)}</div>${statusPill('handover', true)}<h2 class="sh-h">Handover mode activated</h2><p>${owner.name} can now see your verified identity for this rental only. It’s hidden again when the rental closes.</p></div>
        <div class="code-card"><small>Handover code · show to ${owner.name}</small><b class="mono">4 8 2 7</b></div>
        ${progress(b.status)}
        <div class="wait-row"><span class="spinner dark"></span><span>${owner.name} is inspecting the car and taking photos…</span></div>
        ${demoHint('Continue as the owner to run the handover inspection', 'role', 'Owner app', 'data-role="owner"')}`;
    } else if (b.status === 'inspection') {
      body = `<div class="banner-lock">${icon('lock', 16)} Handover mode · ${b.id}</div>
        <h2 class="h2 pad-top">Check the car’s condition</h2><p class="muted">${owner.name} recorded these at ${b.pre.time}. Walk around the car and compare.</p>
        ${inspectionView(car, b.pre)}
        <label class="agree"><input id="c-agree" type="checkbox" checked><span>I’ve checked the car and agree to the <button class="link" data-act="showAgreement">digital rental agreement</button>.</span></label>
        <div class="cta-bar cta-col"><button class="btn btn-primary btn-block btn-lg" data-act="acceptCondition">${icon('check', 20)} Accept vehicle condition</button><button class="btn btn-text" data-act="raiseConcern">Something doesn’t match</button></div>`;
    } else if (b.status === 'condition_ok') {
      body = `<div class="status-hero sh-lock"><div class="sh-ic">${icon('key', 26)}</div>${statusPill('condition_ok', true)}<p>You accepted the condition. Waiting for ${owner.name} to hand over the keys.</p></div>
        ${progress(b.status)}
        <div class="wait-row"><span class="spinner dark"></span><span>Waiting for owner to confirm “Vehicle handed over”</span></div>
        ${demoHint('Continue as the owner', 'role', 'Owner app', 'data-role="owner"')}`;
    } else if (b.status === 'handed_over') {
      body = `<div class="status-hero sh-lock"><div class="sh-ic">${icon('key', 26)}</div>${statusPill('handed_over', true)}<h2 class="sh-h">Got the keys?</h2><p>Confirm you’ve received the car to start your trip. Your ${b.days}-day rental begins now.</p></div>
        ${progress(b.status)}
        <div class="cta-bar"><button class="btn btn-success btn-block btn-xl" data-act="vehicleReceived">${icon('check', 22)} Vehicle received</button></div>`;
    } else if (b.status === 'active') {
      return Screens.active.render();
    } else if (b.status === 'returning') {
      body = `<div class="status-hero sh-lock"><div class="sh-ic">${icon('camera', 26)}</div>${statusPill('returning', true)}<p>${owner.name} is recording the return photos, mileage and fuel. You’ll see a before/after comparison.</p></div>
        ${progress(b.status)}
        <div class="wait-row"><span class="spinner dark"></span><span>Return inspection in progress…</span></div>
        ${demoHint('Continue as the owner to finish the return', 'role', 'Owner app', 'data-role="owner"')}`;
    } else if (b.status === 'completed') {
      body = `<div class="status-hero sh-done"><div class="sh-ic big">${icon('check', 34)}</div>${statusPill('completed', true)}<h2 class="sh-h">Rental completed</h2><p>Return accepted by ${owner.name}. No new damage recorded. Shukriya for renting with GAARI!</p></div>
        <div class="card">${kv([['Rental ID', `<span class="mono">${b.id}</span>`], ['Days', b.days], ['Paid to owner', rs(b.amount)], ['Platform fee', '<span class="free">Rs. 0</span>'], ['Distance', `${(b.post.mileage - b.pre.mileage).toLocaleString('en-US')} km`]])}</div>
        ${compareView(car, b.pre, b.post, true)}
        ${S.reviewDone ? `<div class="card thanks">${icon('star', 22)}<div><b>Thanks for your review</b><small>It helps other renters choose with confidence.</small></div></div>` : `<div class="cta-bar"><button class="btn btn-primary btn-block btn-lg" data-go="review">${icon('star', 20)} Rate ${owner.name} & the car</button></div>`}`;
    }
    return head + `<div class="pad stack-16">${body}</div>`;
  },
};
Actions.cancelReq = () => {
  openSheet(`<div class="sheet-head"><h3>Cancel this request?</h3><p>${B().id} will be withdrawn. No charges apply.</p></div><div class="row-2"><button class="btn btn-ghost" data-act="closeSheet">Keep it</button><button class="btn btn-danger" data-act="cancelReqYes">Cancel request</button></div>`, { center: true });
};
Actions.cancelReqYes = () => { B().status = 'cancelled'; S.history.unshift(B()); S.booking = null; closeSheet(true); S.stack.renter = [{ s: 'trips' }]; refresh(); toast('Request cancelled', 'info'); };
Actions.simDay = () => { S.simDay = true; sysMsg('Reminder: pickup today at ' + fmtTime(B().time) + '.'); tick(); refresh(); toast('It’s rental day · ' + fmtDate(B().from), 'info'); };
Actions.arrived = () => {
  const b = B(); b.status = 'handover'; b.arrivedAt = nowTime();
  sysMsg('Renter has arrived.'); sysMsg('Handover mode started. Verified renter details unlocked for this rental.');
  notify('owner', `${RENTER.name} has arrived at pickup`, `${b.id} · Handover mode is on`, 'o-booking', 'pin');
  refresh(); toast('🔐 Handover mode activated');
};
Actions.acceptCondition = () => {
  if (!$('#c-agree').checked) { toast('Tick the agreement box to continue', 'err'); return; }
  const b = B(); b.status = 'condition_ok'; b.agreementSigned = nowTime();
  sysMsg('Renter accepted the vehicle condition and signed the rental agreement.');
  notify('owner', `${RENTER.name} accepted the vehicle condition`, 'Hand over the keys and confirm in the app', 'o-booking', 'check');
  refresh();
};
Actions.raiseConcern = () => {
  openSheet(`<div class="sheet-head"><h3>What doesn’t match?</h3><p>Your note is added to the handover record and sent to ${ownerOf(carById(B().carId)).name}.</p></div>
    <label class="field"><span>Describe the difference</span><textarea id="concern" rows="3" placeholder="e.g. Scratch on rear left door not in photos"></textarea></label>
    <button class="btn btn-primary btn-block" data-act="sendConcern">Add to handover record</button>`);
};
Actions.sendConcern = () => {
  const v = $('#concern').value.trim(); if (!v) { toast('Write a short note first', 'err'); return; }
  const t = threadFor(B().id); t.msgs.push({ from: 'renter', text: `Handover note: ${v}`, t: nowTime() }); t.unread.owner++;
  B().pre.renterNote = v; closeSheet(); refresh(); toast('Added to handover record');
};
Actions.vehicleReceived = () => {
  const b = B(); b.status = 'active'; b.startedAt = nowTime();
  sysMsg('Rental is now active.');
  notify('owner', 'Trip active · ' + b.id, `${RENTER.name} confirmed receiving the car`, 'o-booking', 'car');
  S.stack.renter = [{ s: 'trips' }, { s: 'trip' }];
  refresh(); toast('Trip active. Drive safe!');
};

/* ---------- Active trip (renter) ---------- */
Screens.active = {
  render() {
    const b = B();
    if (!b || b.status !== 'active') return Screens.trip.render();
    const car = carById(b.carId), owner = ownerOf(car);
    const ext = b.extension;
    return `<div class="active-hero">
        ${topbar('', { transparent: true, right: `<button class="icon-btn glass" data-act="openChat" aria-label="Chat">${icon('chat', 20)}</button>` })}
        <div class="ah-status">${statusPill('active', true)}</div>
        <h1>${car.make} ${car.model.split(' ')[0]}</h1>
        <p class="ah-sub"><span class="mono">${b.id}</span> · ${b.type === 'driver' ? 'With driver' : 'Self drive'}</p>
        <div class="ah-car">${carSide(car)}</div>
        <div class="ah-return"><div><small>Return by</small><b>${fmtDay(b.to)} ${fmtDate(b.to)} · ${fmtTime(b.time)}</b></div><div><small>Time left</small><b>${b.returnSoon ? '2 hrs' : `${b.days} days`}</b></div></div>
      </div>
      <div class="pad stack-16">
        ${b.returnSoon ? `<div class="alert-box warn">${icon('clock', 18)}<span><b>Return due in 2 hours.</b> Head to ${car.area}. ${owner.name} will inspect the car with you.</span></div>` : ''}
        ${ext && ext.status === 'pending' ? `<div class="alert-box info">${icon('extend', 18)}<span><b>Extension requested · +${ext.days} days.</b> Waiting for ${owner.name}.</span></div>` : ''}
        ${ext && ext.status === 'accepted' && !ext.seen ? `<div class="alert-box ok">${icon('check', 18)}<span><b>Extension accepted.</b> New return: ${fmtDate(b.to)}. New total ${rs(b.amount)}.</span></div>` : ''}
        ${ext && ext.status === 'declined' ? `<div class="alert-box bad">${icon('x', 18)}<span><b>Extension declined.</b> Please return on ${fmtDate(b.to)}.</span></div>` : ''}
        <button class="map-card" data-go="location">
          ${mapSVG()}
          <span class="map-label">📍 Live location from renter’s phone</span>
          <span class="map-live"><i></i>LIVE TRIP LOCATION</span>
        </button>
        <div class="action-grid">
          <button class="ag ag-danger" data-act="emergency">${icon('siren', 24)}<span>Emergency</span></button>
          <button class="ag" data-act="callOwner">${icon('phone', 24)}<span>Contact owner</span></button>
          <button class="ag" data-act="openChat">${icon('chat', 24)}<span>Chat</span></button>
          <button class="ag" data-go="extend">${icon('extend', 24)}<span>Extend rental</span></button>
          <button class="ag ag-warn" data-go="accident">${icon('alert', 24)}<span>Report accident</span></button>
          <button class="ag" data-act="showInspection">${icon('camera', 24)}<span>Handover photos</span></button>
        </div>
        <div class="card">${kv([['Pickup mileage', `${b.pre.mileage.toLocaleString('en-US')} km`], ['Pickup fuel', `${b.pre.fuel}% · return at same level`], ['Rental amount', rs(b.amount)], ['Payment', `${PAY[b.pay].label} to ${owner.name}`]])}</div>
        ${b.returnSoon ? demoHint('Continue as owner to complete the return', 'role', 'Owner app', 'data-role="owner"') : demoHint('Fast-forward to return day', 'returnSoon', 'Return day')}
      </div>`;
  },
};
Actions.returnSoon = () => { B().returnSoon = true; sysMsg('Return due in 2 hours.'); notify('owner', 'Return due in 2 hours · ' + B().id, 'Be ready at the pickup point for inspection', 'o-booking', 'clock'); refresh(); };
Actions.showInspection = () => {
  const b = B(), car = carById(b.carId);
  openSheet(`<div class="sheet-head"><h3>Handover record</h3><p>${b.id} · recorded ${b.pre.time}</p></div>${inspectionView(car, b.pre)}`);
};
Actions.emergency = () => {
  const b = B();
  openSheet(`<div class="sheet-head"><h3 class="danger-t">${icon('siren', 22)} Emergency</h3><p>Your live phone location and Rental ID ${b ? b.id : ''} are shared with GAARI Safety when you call.</p></div>
    <div class="em-list">
      <button class="em" data-act="protoCall" data-n="1122"><b>1122</b><span>Rescue & ambulance</span></button>
      <button class="em" data-act="protoCall" data-n="15"><b>15</b><span>Police emergency</span></button>
      <button class="em" data-act="protoCall" data-n="130"><b>130</b><span>Motorway police</span></button>
      <button class="em em-brand" data-act="protoCall" data-n="GAARI Safety"><b>24/7</b><span>GAARI Safety line</span></button>
    </div>
    <button class="btn btn-ghost btn-block" data-go="accident">Report an accident instead</button>`);
};
Actions.protoCall = (el) => { closeSheet(); toast(`Prototype: this would call ${el.dataset.n}`, 'info'); };
Actions.callOwner = () => {
  const b = B(); const owner = ownerOf(carById(b.carId));
  const unlocked = identityUnlocked() || b.status === 'confirmed';
  openSheet(`<div class="sheet-head"><h3>Call ${owner.name}</h3><p>${unlocked ? 'Calls go through a GAARI secure line. Both numbers stay private and the call is linked to ' + b.id + '.' : 'Calling unlocks after the owner confirms your booking. Use chat until then.'}</p></div>
    <div class="masked-call">${avatar(owner, 56)}<div><b>${owner.fullName}</b><small class="mono">+92 3•• ••• ••${owner.id === 'o1' ? '47' : '12'}</small><small>${icon('lock', 12)} Masked number</small></div></div>
    <div class="row-2"><button class="btn btn-ghost" data-act="openChat">${icon('chat', 18)} Chat</button><button class="btn btn-primary" ${unlocked ? 'data-act="protoCall" data-n="' + owner.name + ' via secure line"' : 'disabled'}>${icon('phone', 18)} Call</button></div>`);
};
Actions.openChat = () => { const b = B(); if (!b) { go('inbox'); return; } go('chat', { ref: b.id }); };

/* ---------- Live location ---------- */
Screens.location = {
  render() {
    const b = B();
    const car = b ? carById(b.carId) : CARS[0];
    const ownerView = S.role === 'owner';
    return `${topbar('Live trip location', { sub: b ? b.id : '' })}
    <div class="map-full">${mapSVG({ speed: 45 })}
      <span class="map-label">📍 Live location from renter’s phone</span>
      <div class="map-float"><span class="live-dot"></span><div><b>Near Main Boulevard, Gulberg III</b><small>Updated just now · accuracy ±15 m</small></div></div>
    </div>
    <div class="pad stack-12">
      <div class="info-box">${icon('info', 18)}<span>This is the <b>renter’s phone location</b>, shared with permission during the active rental. GAARI does not install trackers in cars.</span></div>
      ${ownerView ? '' : `<div class="fg-switch card"><div><h4>Share my location</h4><small>Visible to ${ownerOf(car).name} and GAARI Safety until the rental closes.</small></div><button class="switch ${S.sharing ? 'on' : ''}" role="switch" aria-checked="${S.sharing}" data-act="toggleShare"><span></span></button></div>`}
      ${kv([['Car', carName(car)], ['Return point', b ? b.address : ''], ['Distance from return point', '6.4 km']])}
    </div>`;
  },
};
Actions.toggleShare = () => {
  S.sharing = !S.sharing;
  if (!S.sharing) sysMsg('Renter paused location sharing.'); else sysMsg('Renter resumed location sharing.');
  refresh(); toast(S.sharing ? 'Location sharing on' : 'Location sharing paused. The owner has been told.', S.sharing ? 'ok' : 'info');
};

/* ---------- Extend ---------- */
Screens.extend = {
  render() {
    const b = B();
    if (!b || b.status !== 'active') return `${topbar('Extend rental')}${emptyState('extend', 'No active trip', 'You can extend a rental while it’s active.')}`;
    const car = carById(b.carId), owner = ownerOf(car);
    if (b.extension && b.extension.status === 'pending') {
      return `${topbar('Extend rental')}<div class="pad stack-16"><div class="status-hero sh-wait"><div class="pulse-ring">${icon('extend', 26)}</div><span class="status st-wait status-big"><span class="status-dot"></span>Extension requested</span><p>You asked for ${b.extension.days} more days. ${owner.name} will reply shortly.</p></div>
        ${kv([['New return', `${fmtDate(b.extension.newTo)} · ${fmtTime(b.time)}`], ['Extra amount', rs(b.extension.amount)], ['Platform fee', '<span class="free">Rs. 0</span>']])}
        ${demoHint('Continue as owner to accept', 'role', 'Owner app', 'data-role="owner"')}</div>`;
    }
    const d = (S.ext && S.ext.days) || 2;
    const newTo = addDays(b.to, d);
    return `${topbar('Extend rental', { sub: b.id })}
    <div class="pad stack-16">
      <p class="lead">How many more days do you need?</p>
      <div class="day-pick">${[1, 2, 3, 5].map((n) => `<button class="${n === d ? 'on' : ''}" data-act="extDays" data-n="${n}"><b>+${n}</b><small>day${n > 1 ? 's' : ''}</small></button>`).join('')}</div>
      <label class="field"><span>Message to ${owner.name}</span><textarea id="ext-msg" rows="2">I need the car for another ${d} day${d > 1 ? 's' : ''}.</textarea></label>
      <div class="card price-card">
        <div class="pline"><span>Current return</span><b>${fmtDate(b.to)} · ${fmtTime(b.time)}</b></div>
        <div class="pline"><span>New return</span><b class="accent">${fmtDate(newTo)} · ${fmtTime(b.time)}</b></div>
        <div class="pline"><span>${d} days × ${rs(b.rate)}</span><b>${rs(d * b.rate)}</b></div>
        <div class="pline"><span>Platform fee</span><b class="free">Rs. 0</b></div>
        <div class="pline total"><span>New rental total</span><b>${rs(b.amount + d * b.rate)}</b></div>
      </div>
    </div>
    <div class="cta-bar"><button class="btn btn-primary btn-block btn-lg" data-act="requestExt">${icon('extend', 20)} Extend rental</button></div>`;
  },
};
Actions.extDays = (el) => { S.ext = { days: +el.dataset.n }; refresh(); };
Actions.requestExt = () => {
  const b = B(); const d = (S.ext && S.ext.days) || 2;
  const msg = $('#ext-msg').value.trim() || `I need the car for another ${d} days.`;
  b.extension = { days: d, status: 'pending', amount: d * b.rate, newTo: addDays(b.to, d) };
  const t = threadFor(b.id); t.msgs.push({ from: 'renter', text: msg, t: nowTime() }); t.unread.owner++;
  sysMsg(`Extension requested: +${d} days (new return ${fmtDate(b.extension.newTo)}).`);
  notify('owner', `Renter requested ${d} additional days`, `${b.id} · new return ${fmtDate(b.extension.newTo)} · +${rs(b.extension.amount)}`, 'o-booking', 'extend');
  refresh(); toast('Extension request sent');
};

/* ---------- Accident ---------- */
Screens.accident = {
  render() {
    const b = B();
    const a = S.acc || (S.acc = { photos: 0, desc: '', voice: 0, kind: 'Accident' });
    const up = memory.photos.acc || [];
    return `${topbar('Report accident', { sub: b ? b.id : '' })}
    <div class="pad stack-16">
      <div class="alert-box bad">${icon('siren', 18)}<span>Anyone hurt? Call <b>1122</b> first. <button class="link" data-act="emergency">Emergency numbers</button></span></div>
      <div class="seg">${['Accident', 'Breakdown', 'Theft', 'Other'].map((k) => `<button class="${a.kind === k ? 'on' : ''}" data-act="accKind" data-k="${k}">${k}</button>`).join('')}</div>
      <div class="card">${kv([['Booking ID', `<span class="mono">${b ? b.id : '—'}</span>`], ['Current location', 'Near Liberty Market, Gulberg III, Lahore <small class="muted">from your phone</small>'], ['Time', nowTime()]])}</div>
      <div><h3 class="h3">Photos</h3>
        <div class="upload-grid">
          ${Array.from({ length: a.photos }, (_, i) => `<div class="up-thumb">${carDamage(carById(b.carId))}<span class="up-n">${i + 1}</span></div>`).join('')}
          ${up.map((src) => `<div class="up-thumb"><img src="${src}" alt="Uploaded photo"></div>`).join('')}
          <button class="up-add" data-act="accPhoto">${icon('camera', 22)}<small>Take photo</small></button>
          <label class="up-add">${icon('upload', 22)}<small>Upload</small><input type="file" accept="image/*" multiple hidden data-ch="accUpload"></label>
        </div></div>
      <label class="field"><span>What happened?</span><textarea id="acc-desc" rows="3" data-in="accDesc" placeholder="e.g. A motorbike hit the rear bumper at a signal on Main Boulevard.">${esc(a.desc)}</textarea></label>
      <div class="voice ${S.recording ? 'rec' : ''}">
        <button class="voice-btn" data-act="voice" aria-label="${S.recording ? 'Stop recording' : 'Record voice note'}">${icon(S.recording ? 'x' : 'mic', 22)}</button>
        <div><b>${S.recording ? 'Recording…' : a.voice ? 'Voice note attached' : 'Voice note (optional)'}</b><small id="vtime">${S.recording ? '0:00' : a.voice ? `0:${String(a.voice).padStart(2, '0')}` : 'Explain in Urdu or English'}</small></div>
      </div>
    </div>
    <div class="cta-bar"><button class="btn btn-danger btn-block btn-lg" data-act="submitIncident">Submit incident</button></div>`;
  },
};
Actions.accKind = (el) => { S.acc.kind = el.dataset.k; refresh(); };
Actions.accDesc = (el) => { S.acc.desc = el.value; save(); };
Actions.accPhoto = () => { S.acc.photos++; refresh(); toast('Photo captured'); };
Actions.accUpload = (el) => {
  const files = Array.from(el.files || []).slice(0, 6);
  memory.photos.acc = memory.photos.acc || [];
  let n = files.length; if (!n) return;
  files.forEach((f) => { const r = new FileReader(); r.onload = () => { memory.photos.acc.push(r.result); if (--n === 0) refresh(); }; r.readAsDataURL(f); });
};
let voiceTimer = null;
Actions.voice = () => {
  if (S.recording) { clearInterval(voiceTimer); S.recording = false; S.acc.voice = Math.max(3, S.acc.voiceSecs || 6); refresh(); return; }
  S.recording = true; S.acc.voiceSecs = 0; refresh();
  voiceTimer = setInterval(() => { S.acc.voiceSecs++; const v = $('#vtime'); if (v) v.textContent = `0:${String(S.acc.voiceSecs).padStart(2, '0')}`; if (S.acc.voiceSecs >= 59) Actions.voice(); }, 1000);
};
Actions.submitIncident = (el) => {
  const a = S.acc; const b = B();
  if (!a.desc.trim() && !a.photos && !(memory.photos.acc || []).length) { toast('Add a photo or a short description', 'err'); return; }
  if (S.recording) Actions.voice();
  el.disabled = true; el.innerHTML = '<span class="spinner"></span> Submitting…';
  setTimeout(() => {
    const id = 'INC-' + (2041 + S.incidents.length);
    S.incidents.unshift({ id, booking: b.id, kind: a.kind, desc: a.desc || '(photos only)', photos: a.photos + (memory.photos.acc || []).length, voice: !!a.voice, time: nowTime(), status: 'open' });
    sysMsg(`${a.kind} reported (${id}). GAARI support has been notified.`);
    notify('owner', `${a.kind} reported on ${b.id}`, 'GAARI support is reviewing. Tap to see details.', 'o-booking', 'alert');
    notify('admin', `New incident ${id}`, `${b.id} · ${a.kind}`, 'a-disputes', 'alert');
    S.acc = null; memory.photos.acc = [];
    S.stack.renter = [{ s: 'trips' }, { s: 'trip' }];
    save(); render('back');
    openSheet(`<div class="success-sheet"><div class="success-ic">${icon('shield', 32)}</div><h3>Incident ${id} submitted</h3><p>GAARI support will call you within 10 minutes. ${ownerOf(carById(b.carId)).name} has been notified. Your handover photos are attached to the case.</p><button class="btn btn-primary btn-block" data-act="closeSheet">Back to trip</button></div>`, { center: true });
  }, 1000);
};

/* ---------- Review ---------- */
Screens.review = {
  render() {
    const b = B(); const car = carById(b.carId), owner = ownerOf(car);
    const r = S.rv || (S.rv = { stars: 5, tags: ['Clean car', 'On time'], text: '' });
    return `${topbar('Rate your rental', { sub: b.id })}
    <div class="pad stack-16 center">
      ${avatar(owner, 72)}<h2 class="h2">How was renting from ${owner.name}?</h2>
      <div class="star-pick">${[1, 2, 3, 4, 5].map((n) => `<button class="${n <= r.stars ? 'on' : ''}" data-act="rvStar" data-n="${n}" aria-label="${n} stars">${icon('star', 34)}</button>`).join('')}</div>
      <div class="chip-wrap center">${['Clean car', 'On time', 'Friendly owner', 'As described', 'Easy handover', 'Good value'].map((t) => `<button class="chip ${r.tags.includes(t) ? 'on' : ''}" data-act="rvTag" data-t="${t}">${t}</button>`).join('')}</div>
      <label class="field left"><span>Anything to add?</span><textarea id="rv-text" rows="3" data-in="rvText" placeholder="Tell other renters about the car and the handover">${esc(r.text)}</textarea></label>
    </div>
    <div class="cta-bar"><button class="btn btn-primary btn-block btn-lg" data-act="submitReview">Submit review</button></div>`;
  },
};
Actions.rvStar = (el) => { S.rv.stars = +el.dataset.n; refresh(); };
Actions.rvTag = (el) => { const t = el.dataset.t; S.rv.tags = S.rv.tags.includes(t) ? S.rv.tags.filter((x) => x !== t) : S.rv.tags.concat(t); refresh(); };
Actions.rvText = (el) => { S.rv.text = el.value; save(); };
Actions.submitReview = () => {
  S.reviewDone = true;
  notify('owner', `${RENTER.name} rated you ${S.rv.stars}★`, S.rv.tags.join(' · '), 'o-booking', 'star');
  S.rv = null; back(); toast('Review posted. Shukriya!');
};

/* ---------- Earn (Rent my car) ---------- */
const EARN_MODELS = [['Toyota Corolla', 5500], ['Honda City', 4800], ['Honda Civic', 7500], ['Toyota Yaris', 5000], ['Suzuki Cultus', 3200], ['Kia Sportage', 8500], ['Suzuki Alto', 2800]];
Screens.earn = {
  render() {
    const e = S.earn || (S.earn = { m: 0, days: 12 });
    const rate = EARN_MODELS[e.m][1];
    const gross = rate * e.days, net = gross - commissionOf(gross);
    return `${topbar('Rent my car')}
    <section class="earn-hero">
      <p class="urdu" lang="ur">اپنی گاڑی سے کمائیں</p>
      <h1>Apni car se kamao.</h1>
      <p>List your car for free. Approve renters you trust. Get paid directly.</p>
    </section>
    <div class="pad stack-16">
      <div class="card calc">
        <h3 class="card-t">What could your car earn?</h3>
        <label class="field"><span>Your car</span><select id="earn-m" data-ch="earnModel">${EARN_MODELS.map(([m, r], i) => `<option value="${i}" ${i === e.m ? 'selected' : ''}>${m} · ~${rs(r)}/day</option>`).join('')}</select></label>
        <label class="field"><span>Days rented per month <b>${e.days}</b></span><input id="earn-d" type="range" min="4" max="24" value="${e.days}" data-in="earnDays"></label>
        <div class="calc-out"><small>You keep each month</small><b id="earn-net">${rs(net)}</b><span id="earn-sub">${rs(gross)} rental − ${rs(commissionOf(gross))} GAARI commission (10%)</span></div>
      </div>
      <ol class="how">
        <li><b>List your car in 5 minutes</b><small>Photos, documents, price and your available days.</small></li>
        <li><b>Accept renters you’re comfortable with</b><small>Every renter is CNIC, licence, face and phone verified.</small></li>
        <li><b>Hand over with a digital record</b><small>Photos, mileage and fuel saved before and after each trip.</small></li>
        <li><b>Get paid directly</b><small>Cash, JazzCash, Easypaisa or bank. Commission is taken from your wallet after the trip.</small></li>
      </ol>
      <div class="fee-banner owner"><div><span class="fee-zero">90%</span><b>of every rental is yours</b><small>No listing fee. GAARI earns only when your car earns.</small></div></div>
    </div>
    <div class="cta-bar"><button class="btn btn-primary btn-block btn-lg" data-act="listMyCar">${icon('plus', 20)} List my car</button></div>`;
  },
};
Actions.earnModel = (el) => { S.earn.m = +el.value; refresh(); };
Actions.earnDays = (el) => {
  S.earn.days = +el.value; const rate = EARN_MODELS[S.earn.m][1], gross = rate * S.earn.days;
  el.previousElementSibling.querySelector('b').textContent = S.earn.days;
  $('#earn-net').textContent = rs(gross - commissionOf(gross));
  $('#earn-sub').textContent = `${rs(gross)} rental − ${rs(commissionOf(gross))} GAARI commission (10%)`;
};
Actions.listMyCar = () => { S.role = 'owner'; startDraft(); S.stack.owner = [{ s: 'o-dash' }, { s: 'o-add' }]; save(); render('fwd'); toast('Switched to the owner app', 'info'); };

/* ---------- Renter profile (trust) ---------- */
const VIS = {
  before: { title: 'Before booking', rows: [['First name & photo', true], ['Trust score & rating', true], ['Verification badges', true], ['Full name', false], ['CNIC number', false], ['CNIC image', false], ['Phone number', false]] },
  handover: { title: 'At handover & during trip', rows: [['First name & photo', true], ['Trust score & rating', true], ['Verification badges', true], ['Full name', true], ['CNIC (last digit, verified)', true], ['CNIC image', false], ['Phone (masked call)', true]] },
  after: { title: 'After rental closes', rows: [['First name & initial', true], ['Rental ID & dates', true], ['Review you left', true], ['Full name', false], ['CNIC details', false], ['CNIC image', false], ['Phone number', false]] },
};
Screens.me = {
  tab: 'me',
  render() {
    const v = S.visTab || 'before';
    return `<header class="page-head"><h1>Profile</h1>${bellBtn()}</header>
    <div class="trust-hero">
      ${avatar(RENTER, 76)}
      <div class="th-main"><h2>${RENTER.fullName}</h2><small>${RENTER.city} · member since ${RENTER.since}</small></div>
      ${trustRing(RENTER.trust, 80)}
    </div>
    <div class="pad-x stack-16">
      ${verifyList([['CNIC verified', true, 'NADRA check · Jul 2024'], ['Driving licence verified', true, RENTER.licence], ['Face verified', true, 'Selfie matched to CNIC'], ['Phone verified', true, '+92 3•• ••• ••18']])}
      <div class="stat-row"><div><b>${RENTER.rentals}</b><small>🚗 Completed rentals</small></div><div><b>${RENTER.reviews}</b><small>⭐ Reviews</small></div><div><b>0</b><small>Disputes</small></div></div>
      <section class="card">
        <h3 class="card-t">${icon('lock', 16)} What owners can see</h3>
        <div class="seg small">${Object.entries(VIS).map(([k, x]) => `<button class="${v === k ? 'on' : ''}" data-act="visTab" data-k="${k}">${x.title.split(' ')[0] === 'At' ? 'At handover' : x.title.split(' ').slice(0, 2).join(' ')}</button>`).join('')}</div>
        <ul class="vis-list">${VIS[v].rows.map(([l, ok]) => `<li class="${ok ? 'yes' : 'no'}">${icon(ok ? 'eye' : 'eyeoff', 16)}<span>${l}</span><em>${ok ? 'Visible' : 'Hidden'}</em></li>`).join('')}</ul>
        <p class="note">Owners never download your CNIC. GAARI keeps documents for verification and dispute support only.</p>
      </section>
      <section><h3 class="h3">What owners say</h3>${RENTER_REVIEWS.map(reviewItem).join('')}</section>
      <div class="menu-list">
        <button data-act="payPrefs">${icon('cash', 20)}<span>Payment preferences</span>${icon('chev', 16)}</button>
        <button data-act="savedCars">${icon('heart', 20)}<span>Saved cars</span><em>${S.favs.length}</em>${icon('chev', 16)}</button>
        <button data-go="earn">${icon('wallet', 20)}<span>Rent my car & earn</span>${icon('chev', 16)}</button>
        <button data-act="support">${icon('info', 20)}<span>Help & support</span>${icon('chev', 16)}</button>
      </div>
    </div>`;
  },
};
Actions.visTab = (el) => { S.visTab = el.dataset.k; refresh(); };
Actions.payPrefs = () => openSheet(`<div class="sheet-head"><h3>Payment preferences</h3><p>You always pay the owner directly. GAARI never charges renters a fee.</p></div><div class="pay-list">${Object.entries(PAY).map(([k, m]) => `<div class="pay ${k === 'jazzcash' ? 'on' : ''}"><span class="radio"></span><span class="pay-ic">${icon(m.ic, 18)}</span><span><b>${m.label}</b><small>${m.sub}</small></span></div>`).join('')}</div>`);
Actions.savedCars = () => openSheet(`<div class="sheet-head"><h3>Saved cars</h3></div><div class="stack-12">${S.favs.length ? S.favs.map((id) => { const c = carById(id); return `<button class="trip-card" data-go="car" data-id="${id}"><div class="tc-media">${carSide(c)}</div><div class="tc-body"><b>${carName(c)}</b><small>${rs(c.price)}/day · ${c.area}</small></div>${icon('chev', 16)}</button>`; }).join('') : emptyState('heart', 'No saved cars', 'Tap the heart on any car to save it.')}</div>`);
Actions.support = () => openSheet(`<div class="sheet-head"><h3>Help & support</h3><p>Our team is available 9 AM – 11 PM, and GAARI Safety is 24/7 during active rentals.</p></div><div class="menu-list"><button data-act="openChat">${icon('chat', 20)}<span>Chat with support</span>${icon('chev', 16)}</button><button data-act="protoCall" data-n="GAARI support">${icon('phone', 20)}<span>Call support</span>${icon('chev', 16)}</button><button data-act="disputeInfo">${icon('flag', 20)}<span>Open a dispute</span>${icon('chev', 16)}</button></div>`);
Actions.disputeInfo = () => { closeSheet(); toast('Disputes open from a rental’s page, with handover photos attached.', 'info'); };

/* ---------- Messages (shared by renter & owner) ---------- */
Screens.inbox = {
  tab: 'inbox',
  render() {
    const role = S.role;
    const threads = S.threads;
    return `<header class="page-head"><h1>Messages</h1>${bellBtn()}</header>
    <div class="pad-x"><div class="privacy-note">${icon('lock', 16)}<span>Chats stay inside GAARI and are linked to a Rental ID. Phone numbers are never shown here.</span></div></div>
    <div class="thread-list">
      ${threads.length ? threads.map((t) => {
        const car = carById(t.carId); const last = t.msgs[t.msgs.length - 1];
        const other = role === 'owner' ? { name: RENTER.name, avatar: RENTER.avatar } : ownerOf(car);
        const n = t.unread[role] || 0;
        return `<button class="thread ${n ? 'unread' : ''}" data-go="chat" data-ref="${t.ref}">${avatar(other, 50)}
          <div class="th-body"><div class="th-top"><b>${role === 'owner' ? `${other.name} · ${carShort(car)}` : t.title}</b><time>${last.t || ''}</time></div>
          <small class="mono">${t.ref}${t.closed ? ' · closed' : ''}</small><p>${last.from === 'system' ? '• ' : ''}${esc(last.text)}</p></div>${n ? `<i class="nav-badge">${n}</i>` : ''}</button>`;
      }).join('') : emptyState('chat', 'No messages yet', 'Chats start when you request a booking.')}
    </div>`;
  },
};
Screens.chat = {
  render(p) {
    const t = threadFor(p.ref);
    if (!t) return `${topbar('Chat')}${emptyState('chat', 'Chat not found', '')}`;
    t.unread[S.role] = 0; save();
    const car = carById(t.carId); const me = S.role;
    const other = me === 'owner' ? { name: RENTER.name, avatar: RENTER.avatar } : ownerOf(car);
    const b = B() && B().id === t.ref ? B() : null;
    return `<header class="topbar chat-top"><button class="icon-btn" data-back aria-label="Back">${icon('back', 22)}</button>${avatar(other, 38)}<div class="topbar-title left">${other.name}<small>${icon('shield', 11)} Verified ${me === 'owner' ? 'renter' : 'host'}</small></div>${b ? `<button class="icon-btn" data-act="${me === 'owner' ? 'ownerCall' : 'callOwner'}" aria-label="Call">${icon('phone', 20)}</button>` : '<span class="tb-spacer"></span>'}</header>
    <button class="chat-context" ${b ? `data-go="${me === 'owner' ? 'o-booking' : 'trip'}"` : ''}><div class="cx-car">${carSide(car)}</div><div><b>${carName(car)}</b><small class="mono">${t.ref}</small></div>${b ? statusPill(b.status) : '<span class="status st-done"><span class="status-dot"></span>Closed</span>'}</button>
    <div class="chat-body" id="chat-body">
      ${t.msgs.map((m) => m.from === 'system'
        ? `<div class="sys-msg">${esc(m.text)}</div>`
        : `<div class="bubble ${m.from === me ? 'me' : 'them'} ${m.warn ? 'masked' : ''}"><p>${esc(m.text)}</p>${m.t ? `<time>${m.t}</time>` : ''}</div>`).join('')}
    </div>
    ${t.closed ? '<div class="chat-closed">This rental is closed. Chat is read-only.</div>' : `<form class="composer" data-act-form="send"><div class="quick-replies">${(me === 'owner' ? ['On my way', 'Car is ready', 'Please share ETA'] : ['I’m on my way', 'Running 10 min late', 'Where exactly?']).map((q) => `<button type="button" class="chip" data-act="quickReply" data-t="${q}">${q}</button>`).join('')}</div>
      <div class="composer-row"><input id="chat-in" type="text" placeholder="Message ${other.name}…" autocomplete="off" data-enter="send"><button type="button" class="send-btn" data-act="send" aria-label="Send">${icon('send', 20)}</button></div></form>`}`;
  },
  after(root) { const c = $('#chat-body', root); if (c) root.scrollTop = root.scrollHeight; },
};
const PHONE_RE = /(\+?92|0)\s?-?3\d{2}\s?-?\d{7}|\b\d{4}[\s-]?\d{7}\b/;
Actions.quickReply = (el) => { $('#chat-in').value = el.dataset.t; Actions.send(); };
Actions.send = () => {
  const inp = $('#chat-in'); if (!inp) return;
  let text = inp.value.trim(); if (!text) return;
  const ref = cur().p.ref; const t = threadFor(ref); const me = S.role, other = me === 'owner' ? 'renter' : 'owner';
  let warn = false;
  if (PHONE_RE.test(text)) { text = text.replace(PHONE_RE, '•••• •••••••'); warn = true; }
  t.msgs.push({ from: me, text, t: nowTime(), warn });
  if (warn) t.msgs.push({ from: 'system', text: 'Phone numbers are hidden in chat. Use the in-app call button. It keeps both numbers private and linked to this rental.' });
  t.unread[other] = (t.unread[other] || 0) + 1;
  refresh();
  // simulated reply from the other side
  setTimeout(() => {
    if (cur().s !== 'chat') return;
    const replies = me === 'renter'
      ? (/where|location|address|kahan/i.test(text) ? 'Pin is in your booking details. Main gate ke saamne 👍' : /late|der/i.test(text) ? 'No problem, take your time.' : 'Ji bilkul, see you then 👍')
      : (/eta|kitni/i.test(text) ? 'About 15 minutes away.' : 'Theek hai, shukriya!');
    t.msgs.push({ from: other, text: replies, t: nowTime() });
    refresh();
  }, 1600);
};
