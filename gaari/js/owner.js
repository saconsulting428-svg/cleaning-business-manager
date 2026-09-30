/* GAARI prototype — owner experience: dashboard, requests, handover, return, wallet, listings. */

const ANGLES = [['front', 'Front'], ['back', 'Back'], ['left', 'Left side'], ['right', 'Right side'], ['interior', 'Interior'], ['dashboard', 'Dashboard']];
function shotArt(car, key, insp) {
  if (key === 'front') return carFront(car);
  if (key === 'back') return carFront(car, true);
  if (key === 'left') return carSide(car);
  if (key === 'right') return carSide(car, true);
  if (key === 'interior') return carInterior(car);
  if (key === 'dashboard') return carDash(insp.mileage, insp.fuel);
  if (key === 'damage') return carDamage(car);
  return '';
}
function shot(car, key, insp, label) {
  return `<figure class="shot"><div class="shot-img">${shotArt(car, key, insp)}<span class="shot-stamp">${insp.date || fmtDate(B().from)} · ${insp.shots[key] || insp.time}</span></div><figcaption>${label}</figcaption></figure>`;
}
function inspectionView(car, insp) {
  return `<div class="shot-grid">${ANGLES.map(([k, l]) => shot(car, k, insp, l)).join('')}</div>
    <div class="insp-facts">
      <div>${icon('gauge', 18)}<small>Mileage</small><b>${insp.mileage.toLocaleString('en-US')} km</b></div>
      <div>${icon('fuel', 18)}<small>Fuel</small><b>${insp.fuel}%</b><span class="fuel-bar"><i style="width:${insp.fuel}%"></i></span></div>
    </div>
    <div class="damage-row ${insp.damage ? '' : 'none'}">${insp.damage ? `<div class="dmg-img">${carDamage(car)}</div>` : icon('check', 20)}<div><small>Existing damage</small><b>${insp.damage ? esc(insp.damage) : 'No damage recorded'}</b>${insp.renterNote ? `<small class="warn-t">Renter note: ${esc(insp.renterNote)}</small>` : ''}</div></div>`;
}
function compareView(car, pre, post, compact = false) {
  const km = post.mileage - pre.mileage, fuelDiff = post.fuel - pre.fuel;
  return `<section class="compare ${compact ? 'compact' : ''}">
    <div class="cmp-head"><span>Before</span><span>After</span></div>
    ${ANGLES.slice(0, compact ? 4 : 6).map(([k, l]) => `<div class="cmp-row"><div class="cmp-img">${shotArt(car, k, pre)}</div><div class="cmp-img">${shotArt(car, k, post)}${post.newDamage && k === 'front' ? '<span class="cmp-flag">New</span>' : ''}</div><small>${l}</small></div>`).join('')}
    <div class="cmp-facts">
      <div><small>Mileage</small><b>${pre.mileage.toLocaleString('en-US')} → ${post.mileage.toLocaleString('en-US')}</b><em>+${km.toLocaleString('en-US')} km driven</em></div>
      <div><small>Fuel</small><b>${pre.fuel}% → ${post.fuel}%</b><em class="${fuelDiff < 0 ? 'warn-t' : ''}">${fuelDiff === 0 ? 'Same level' : fuelDiff < 0 ? `${fuelDiff}% lower` : `+${fuelDiff}%`}</em></div>
      <div><small>Damage</small><b>${post.newDamage ? esc(post.newDamage) : 'No new damage'}</b><em>Existing: ${esc(pre.damage || 'none')}</em></div>
    </div></section>`;
}

/* ---------- Protected renter cards ---------- */
function protectedRenterCard() {
  return `<div class="renter-card">
    <div class="rc-top">${avatar(RENTER, 56)}<div><b>${RENTER.name}</b><small>${stars(RENTER.rating)} · ${RENTER.rentals} completed rentals</small></div><div class="rc-score"><b>${RENTER.trust}</b><small>Trust</small></div></div>
    <div class="chip-wrap">${vchip('CNIC verified')}${vchip('Driving licence verified')}${vchip('Face verified')}${vchip('Phone verified')}</div>
    <div class="privacy-note">${icon('lock', 15)}<span>Protected identity. CNIC image, CNIC number and phone number stay with GAARI. Handover details unlock when ${RENTER.name} arrives.</span></div>
  </div>`;
}
function handoverIdentityCard(b, closedView = false) {
  return `<div class="hid">
    <div class="hid-top">${icon('lock', 15)} Handover mode · temporary access</div>
    <div class="hid-main">${avatar(RENTER, 88)}<div><h3>${RENTER.fullName}</h3><small>${RENTER.age} yrs · ${RENTER.city}</small><span class="mono rid">Rental ID ${b.id}</span></div></div>
    <div class="hid-list">
      <div><span class="g">${icon('check', 14)}</span><b>CNIC verified</b><small class="mono">•••••-•••••••-${RENTER.cnicEnd}</small></div>
      <div><span class="g">${icon('check', 14)}</span><b>Driving licence verified</b><small>${RENTER.licence}</small></div>
      <div><span class="g">${icon('check', 14)}</span><b>Face verified</b><small>Match this photo with the person in front of you</small></div>
      <div><span class="g">${icon('check', 14)}</span><b>Phone verified</b><small>Call through GAARI · number masked</small></div>
    </div>
    <div class="hid-foot">${icon('eye', 14)} Visible until the rental closes. Access is logged.</div>
  </div>`;
}

/* ---------- Dashboard ---------- */
function ownerCarStatus() {
  const b = B();
  if (b && ['active', 'handed_over', 'returning'].includes(b.status)) return ['On a trip', 'st-live'];
  if (S.ownerCars[0].paused) return ['Paused', 'st-bad'];
  return ['Listed · available', 'st-ok'];
}
function earningsChart() {
  const data = EARNINGS_MONTHS;
  const W = 330, H = 150, pl = 34, pb = 22, pt = 14, max = 70000;
  const bw = 30, gap = (W - pl - data.length * bw) / data.length;
  const y = (v) => pt + (H - pt - pb) * (1 - v / max);
  const ticks = [0, 20000, 40000, 60000];
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Monthly earnings, April to September 2026">
    ${ticks.map((t) => `<line x1="${pl}" x2="${W}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pl - 6}" y="${y(t) + 3.5}" text-anchor="end" class="axis">${t ? t / 1000 + 'k' : '0'}</text>`).join('')}
    ${data.map((d, i) => { const x = pl + gap / 2 + i * (bw + gap); const last = i === data.length - 1; const h = y(0) - y(d.v);
      return `<g class="bar ${last ? 'last' : ''}" data-tip="${d.m} 2026 · ${rs(d.v)}"><rect x="${x - 6}" y="${pt}" width="${bw + 12}" height="${H - pt - pb}" fill="transparent"/>
        <path d="M${x} ${y(0)} V${y(d.v) + 4} Q${x} ${y(d.v)} ${x + 4} ${y(d.v)} H${x + bw - 4} Q${x + bw} ${y(d.v)} ${x + bw} ${y(d.v) + 4} V${y(0)} Z" class="bar-fill" data-h="${h}"/>
        ${last ? `<text x="${x + bw / 2}" y="${y(d.v) - 5}" text-anchor="middle" class="bar-label">${d.v / 1000}k</text>` : ''}
        <text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" class="axis">${d.m}</text></g>`; }).join('')}
  </svg><div class="chart-tip" hidden></div></div>`;
}
function bindChartTips(root) {
  $$('.chart-wrap', root).forEach((w) => {
    const tip = $('.chart-tip', w);
    $$('[data-tip]', w).forEach((g) => {
      const show = () => { tip.hidden = false; tip.textContent = g.dataset.tip; const r = g.getBoundingClientRect(), wr = w.getBoundingClientRect(); tip.style.left = `${Math.min(wr.width - 110, Math.max(0, r.left - wr.left + r.width / 2 - 55))}px`; g.classList.add('hover'); };
      const hide = () => { tip.hidden = true; g.classList.remove('hover'); };
      g.addEventListener('pointerenter', show); g.addEventListener('pointerleave', hide); g.addEventListener('click', show);
    });
  });
}
Screens['o-dash'] = {
  tab: 'o-dash',
  render() {
    const b = B();
    const car = CARS[0];
    const st = S.stats, commission = commissionOf(st.gross), [csLabel, csCls] = ownerCarStatus();
    const low = S.wallet.balance < upcomingCommission() + 1650;
    return `<header class="page-head owner-head"><div><small>Assalam-o-Alaikum</small><h1>${OWNERS.o1.name}</h1></div>${bellBtn()}</header>
    <div class="pad-x stack-16">
      ${b && b.status === 'requested' ? `<button class="req-alert" data-go="o-booking"><span class="ra-ic">${icon('bell', 20)}</span><span><b>New booking request for your ${carShort(carById(b.carId))}</b><small>${RENTER.name} · ${fmtDate(b.from)}–${fmtDate(b.to)} · ${rs(b.amount)}</small></span><span class="ra-go">Review</span></button>` : ''}
      ${b && b.extension && b.extension.status === 'pending' ? `<button class="req-alert" data-go="o-booking"><span class="ra-ic">${icon('extend', 20)}</span><span><b>Renter requested ${b.extension.days} additional days</b><small>${b.id} · +${rs(b.extension.amount)}</small></span><span class="ra-go">Review</span></button>` : ''}
      ${b && ['handover', 'inspection', 'condition_ok', 'handed_over', 'active', 'returning'].includes(b.status) ? `<button class="live-card owner" data-go="o-booking"><div class="lc-top">${statusPill(b.status)}<span class="mono">${b.id}</span></div><div class="lc-body"><div class="lc-car">${carSide(carById(b.carId))}</div><div><b>${RENTER.name} · ${carShort(carById(b.carId))}</b><small>Return ${fmtDate(b.to)} · ${fmtTime(b.time)}</small></div></div><span class="lc-go">Open rental ${icon('chev', 16)}</span></button>` : ''}
      ${low ? `<div class="alert-box warn">${icon('alert', 18)}<span><b>Low commission balance.</b> Top up to keep accepting bookings. <button class="link" data-go="o-wallet">Open wallet</button></span></div>` : ''}

      <section class="earn-card">
        <p>Your car earned</p>
        <h2>${rs(EARNINGS_MONTHS[5].v)} <small>this month</small></h2>
        ${earningsChart()}
        <button class="btn btn-light btn-block" data-act="shareEarnings">${icon('share', 18)} Share earnings</button>
      </section>

      <section><h2 class="h3">Your car</h2>
        <button class="own-car" data-go="o-cars"><div class="oc-media">${carScene(car)}</div><div class="oc-info"><div><b>${carName(car)}</b><span class="status ${csCls}"><span class="status-dot"></span>${csLabel}</span></div><small>${car.plate} · ${stars(car.rating)} · ${car.trips} rentals</small><div class="d-badges">${rentalBadges(car.rental)}<span class="tb tb-ok">Vehicle verified</span></div></div></button></section>

      <section><h2 class="h3">2026 so far</h2>
        <div class="stat-grid">
          <div><small>Bookings</small><b>${st.bookings}</b></div>
          <div><small>Rental days</small><b>${st.days}</b></div>
          <div class="wide"><small>Gross rental revenue</small><b>${rs(st.gross)}</b></div>
          <div><small>Platform commission</small><b class="muted-b">${rs(commission)}</b></div>
          <div><small>Net after commission</small><b class="ok-b">${rs(st.gross - commission)}</b></div>
          <button data-go="o-wallet"><small>Commission wallet</small><b>${rs(S.wallet.balance)}</b></button>
          <button data-go="o-wallet"><small>Pending commission</small><b>${rs(upcomingCommission())}</b></button>
        </div></section>

      <section class="quick-grid">
        <button data-act="startAdd">${icon('plus', 22)}<span>Add car</span></button>
        <button data-go="o-avail" data-id="c1">${icon('cal', 22)}<span>Availability</span></button>
        <button data-go="o-wallet">${icon('wallet', 22)}<span>Wallet</span></button>
        <button data-go="o-cars">${icon('swap', 22)}<span>Rental type</span></button>
      </section>
    </div>`;
  },
  after(root) { bindChartTips(root); },
};
Actions.shareEarnings = () => {
  const text = `My Toyota Corolla earned Rs. 65,000 this month on GAARI. Apni car se kamao 🚗 gaari.pk`;
  openSheet(`<div class="sheet-head"><h3>Share your earnings</h3></div>
    <div class="share-card"><div class="sc-top">${logoFull(true)}</div><p>My car earned</p><b>${rs(65000)}</b><span>this month on GAARI</span><div class="sc-car">${carSide(CARS[0])}</div><em>Apni car se kamao.</em></div>
    <div class="row-2"><button class="btn btn-ghost" data-act="copyShare">${icon('file', 18)} Copy text</button><a class="btn btn-primary" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${icon('share', 18)} WhatsApp</a></div>
    <p class="note center" id="share-text">${esc(text)}</p>`);
};
Actions.copyShare = () => {
  const t = $('#share-text').textContent;
  try { navigator.clipboard.writeText(t).then(() => toast('Copied. Paste it anywhere.'), () => selectText('#share-text')); } catch (e) { selectText('#share-text'); }
};
function selectText(sel) { const el = $(sel); const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); toast('Text selected. Copy it from your keyboard.', 'info'); }

/* ---------- Bookings list ---------- */
Screens['o-bookings'] = {
  tab: 'o-bookings',
  render() {
    const b = B(); const tab = S.obTab || 'requests';
    const inReq = b && b.status === 'requested';
    const inActive = b && ['handover', 'inspection', 'condition_ok', 'handed_over', 'active', 'returning'].includes(b.status);
    const inUp = b && b.status === 'confirmed';
    const tabs = [['requests', 'Requests', inReq ? 1 : 0], ['upcoming', 'Upcoming', (inUp ? 1 : 0) + 1], ['active', 'Active', inActive ? 1 : 0], ['past', 'Past', 0]];
    let list = '';
    const card = (x, extra = '') => { const car = carById(x.carId); return `<button class="trip-card" data-go="o-booking"><div class="tc-media">${carSide(car)}</div><div class="tc-body"><div class="tc-top">${statusPill(x.status)}<span class="mono">${x.id}</span></div><b>${RENTER.name} · ${carShort(car)}</b><small>${fmtDate(x.from)} → ${fmtDate(x.to)} · ${rs(x.amount)}</small>${extra}</div>${icon('chev', 18)}</button>`; };
    if (tab === 'requests') list = inReq ? card(b, '<small class="warn-t">Reply soon · renters see your response time</small>') : emptyState('bell', 'No pending requests', 'New booking requests show up here. Keep your calendar up to date to get more.');
    if (tab === 'upcoming') list = (inUp ? card(b) : '') + `<div class="trip-card"><div class="tc-media">${carSide(CARS[0])}</div><div class="tc-body"><div class="tc-top">${statusPill('confirmed')}<span class="mono">GR-10291</span></div><b>Maha S. · Toyota Corolla</b><small>20 Oct → 22 Oct · ${rs(11000)}</small></div></div>`;
    if (tab === 'active') list = inActive ? card(b, b.extension && b.extension.status === 'pending' ? '<small class="warn-t">Extension request waiting</small>' : '') : emptyState('car', 'No active rentals', 'When a renter picks up your car, the live trip shows here.');
    if (tab === 'past') {
      list = (b && b.status === 'completed' ? `<button class="trip-card past" data-go="o-booking"><div class="tc-media">${carSide(carById(b.carId))}</div><div class="tc-body"><div class="tc-top">${statusPill('completed')}<span class="mono">${b.id}</span></div><b>${RENTER.name} T. · ${carShort(carById(b.carId))}</b><small>${fmtDate(b.from)}–${fmtDate(b.to)} · ${rs(b.amount)}</small><small class="lock-t">${icon('lock', 12)} Identity details removed</small></div></button>` : '')
        + PAST_OWNER_RENTALS.map((r) => `<div class="trip-card past"><div class="tc-media">${carSide(CARS[0])}</div><div class="tc-body"><div class="tc-top"><span class="status st-done"><span class="status-dot"></span>Closed</span><span class="mono">${r.id}</span></div><b>${r.renter} · Corolla</b><small>${r.dates} · ${rs(r.amount)} · commission ${rs(r.commission)}</small><small class="lock-t">${icon('lock', 12)} Identity details removed</small></div></div>`).join('');
    }
    return `<header class="page-head"><h1>Bookings</h1>${bellBtn()}</header>
      <div class="tabs pad-x">${tabs.map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="obTab" data-k="${k}">${l}${n ? `<i>${n}</i>` : ''}</button>`).join('')}</div>
      <div class="pad-x stack-12">${list}</div>`;
  },
};
Actions.obTab = (el) => { S.obTab = el.dataset.k; refresh(); };

/* ---------- Booking detail (owner) ---------- */
Screens['o-booking'] = {
  render() {
    const b = B();
    if (!b) return `${topbar('Booking')}${emptyState('trips', 'No booking yet', 'When a renter requests your car, it shows up here.', demoHint('Create one from the renter app', 'role', 'Renter app', 'data-role="renter"'))}`;
    const car = carById(b.carId);
    const demoOwner = car.owner !== 'o1' ? `<div class="demo-hint"><span>${icon('info', 15)} Demo: you’re acting as ${ownerOf(car).name}, the owner of this ${carShort(car)}.</span></div>` : '';
    const head = topbar(b.id, { sub: `${RENTER.name} · ${carShort(car)}`, right: b.status !== 'completed' && b.status !== 'requested' ? `<button class="icon-btn" data-go="chat" data-ref="${b.id}" aria-label="Chat">${icon('chat', 21)}</button>` : '' });
    const facts = kv([
      ['Rental ID', `<span class="mono">${b.id}</span>`], ['Pickup', `${fmtDay(b.from)} ${fmtDate(b.from)} · ${fmtTime(b.time)}`], ['Return', `${fmtDay(b.to)} ${fmtDate(b.to)} · ${fmtTime(b.time)}`],
      ['Location', b.address], ['Rental type', b.type === 'driver' ? 'With driver (you or your driver)' : 'Self drive'], ['Payment', `${PAY[b.pay].label} · renter pays you directly`],
    ]);
    const money = `<div class="card price-card"><h3 class="card-t">Your earnings</h3>
      <div class="pline"><span>Rental · ${b.days} days × ${rs(b.rate)}</span><b>${rs(b.amount)}</b></div>
      <div class="pline"><span>Renter pays you directly</span><b>${rs(b.amount)}</b></div>
      <div class="pline"><span>GAARI commission (10%) · from wallet after trip</span><b class="neg">−${rs(b.commission)}</b></div>
      <div class="pline total"><span>You keep</span><b>${rs(b.amount - b.commission)}</b></div></div>`;
    let body = '';

    if (b.status === 'requested') {
      const ok = canAcceptBooking(b);
      body = `<div class="req-head"><span class="status st-wait status-big"><span class="status-dot"></span>New booking request</span><p>New booking request for your ${carName(car)}.</p></div>
        ${ok ? '' : `<div class="alert-box bad">${icon('alert', 18)}<span><b>⚠️ Your commission balance is too low to accept new qualifying bookings.</b> You need ${rs(b.commission + upcomingCommission() - S.wallet.balance)} more (balance ${rs(S.wallet.balance)}, pending ${rs(upcomingCommission())}).</span></div><button class="btn btn-primary btn-block" data-act="openTopUp">${icon('wallet', 18)} Top up now</button>`}
        ${protectedRenterCard()}
        <div class="card">${facts}</div>
        ${money}
        <div class="cta-bar row-2"><button class="btn btn-ghost btn-lg" data-act="declineReq">Decline</button><button class="btn btn-success btn-lg" data-act="acceptReq" ${ok ? '' : 'disabled'}>${icon('check', 20)} Accept</button></div>`;
    } else if (b.status === 'declined' || b.status === 'cancelled') {
      body = `<div class="status-hero sh-bad"><div class="sh-ic">${icon('x', 26)}</div>${statusPill(b.status, true)}<p>This request was ${b.status}.</p></div>`;
    } else if (b.status === 'confirmed') {
      body = `<div class="status-hero sh-ok"><div class="sh-ic">${icon('check', 28)}</div>${statusPill('confirmed', true)}<p>${RENTER.name} will pick up on ${fmtDay(b.from)} ${fmtDate(b.from)} at ${fmtTime(b.time)}. Handover details unlock when they tap “I’ve arrived”.</p></div>
        ${protectedRenterCard()}
        <div class="card">${facts}</div>${money}
        ${demoHint('Switch to the renter for pickup day', 'role', 'Renter app', 'data-role="renter"')}`;
    } else if (b.status === 'handover') {
      body = `<div class="banner-lock big">${icon('lock', 18)} 🔐 Handover mode · ${RENTER.name} has arrived</div>
        ${handoverIdentityCard(b)}
        <div class="demo-hint"><span>${icon('key', 15)} Ask ${RENTER.name} for the handover code on their phone: <b class="mono">4827</b></span></div>
        <div class="info-box">${icon('camera', 18)}<span>Next: walk around the car together and record photos, mileage, fuel and any existing damage.</span></div>
        <div class="cta-bar"><button class="btn btn-primary btn-block btn-xl" data-act="startHandover">${icon('camera', 22)} Start handover</button></div>`;
    } else if (b.status === 'inspection') {
      body = `<div class="banner-lock">${icon('lock', 16)} Handover mode · ${b.id}</div>
        <div class="wait-row"><span class="spinner dark"></span><span>Shared with ${RENTER.name}. Waiting for them to accept the vehicle condition…</span></div>
        ${inspectionView(car, b.pre)}
        ${demoHint('Switch to the renter to accept', 'role', 'Renter app', 'data-role="renter"')}`;
    } else if (b.status === 'condition_ok') {
      body = `<div class="banner-lock">${icon('lock', 16)} Handover mode · ${b.id}</div>
        <div class="status-hero sh-ok"><div class="sh-ic">${icon('check', 26)}</div><h2 class="sh-h">Condition accepted</h2><p>${RENTER.name} accepted the vehicle condition and signed the rental agreement at ${b.agreementSigned}.</p></div>
        <button class="pay-check ${b.paid ? 'on' : ''}" data-act="togglePaid"><span class="box">${icon('check', 14)}</span><span><b>Payment received · ${rs(b.amount)}</b><small>${PAY[b.pay].label}, paid to you directly (optional record)</small></span></button>
        <div class="cta-bar"><button class="btn btn-primary btn-block btn-xl" data-act="handedOver">${icon('key', 22)} Vehicle handed over</button></div>`;
    } else if (b.status === 'handed_over') {
      body = `<div class="banner-lock">${icon('lock', 16)} Handover mode · ${b.id}</div>
        <div class="wait-row"><span class="spinner dark"></span><span>Waiting for ${RENTER.name} to confirm “Vehicle received”…</span></div>
        ${demoHint('Switch to the renter', 'role', 'Renter app', 'data-role="renter"')}`;
    } else if (b.status === 'active') {
      const ext = b.extension;
      const incidents = S.incidents.filter((i) => i.booking === b.id);
      body = `<div class="status-row">${statusPill('active', true)}<span>Return ${fmtDay(b.to)} ${fmtDate(b.to)} · ${fmtTime(b.time)}</span></div>
        ${b.returnSoon ? `<div class="alert-box warn">${icon('clock', 18)}<span><b>Return due in 2 hours.</b> Be at ${car.area} to inspect the car.</span></div>` : ''}
        ${ext && ext.status === 'pending' ? `<div class="ext-card"><div class="ext-top">${icon('extend', 20)}<b>Renter requested ${ext.days} additional days.</b></div>
            ${kv([['New return', `${fmtDay(ext.newTo)} ${fmtDate(ext.newTo)} · ${fmtTime(b.time)}`], ['Extra rental', rs(ext.amount)], ['New total', rs(b.amount + ext.amount)], ['Extra commission', rs(commissionOf(ext.amount))]])}
            <div class="row-2"><button class="btn btn-ghost" data-act="extDecline">Decline</button><button class="btn btn-success" data-act="extAccept">${icon('check', 18)} Accept</button></div></div>` : ''}
        ${incidents.map((i) => `<div class="alert-box bad">${icon('alert', 18)}<span><b>${i.kind} reported · ${i.id}</b> ${esc(i.desc)} · GAARI support is handling it.</span></div>`).join('')}
        <button class="map-card" data-go="location">${mapSVG()}<span class="map-label">📍 Live location from renter’s phone</span><span class="map-live"><i></i>LIVE TRIP LOCATION</span></button>
        <p class="note">${icon('info', 13)} ${S.sharing ? 'Shared by the renter with permission. GAARI does not track the car itself.' : 'The renter paused location sharing. GAARI Safety has been notified.'}</p>
        <div class="action-grid three">
          <button class="ag" data-go="chat" data-ref="${b.id}">${icon('chat', 22)}<span>Chat</span></button>
          <button class="ag" data-act="ownerCall">${icon('phone', 22)}<span>Call renter</span></button>
          <button class="ag" data-act="ownerIdentity">${icon('user', 22)}<span>Renter ID</span></button>
        </div>
        <div class="card">${facts}</div>
        <div class="cta-bar"><button class="btn btn-primary btn-block btn-lg" data-act="startReturn">${icon('camera', 20)} Complete return</button></div>`;
    } else if (b.status === 'returning') {
      body = `<div class="status-hero sh-lock"><div class="sh-ic">${icon('camera', 26)}</div>${statusPill('returning', true)}<p>Finish the return inspection to close the rental.</p></div>
        <button class="btn btn-primary btn-block btn-lg" data-go="o-inspect" data-mode="post">Continue return inspection</button>`;
    } else if (b.status === 'completed') {
      body = `<div class="status-hero sh-done"><div class="sh-ic big">${icon('check', 34)}</div>${statusPill('completed', true)}<h2 class="sh-h">Rental closed</h2><p>Return accepted. ${b.days} days · ${rs(b.amount)} earned.</p></div>
        <div class="card comm-card">${icon('wallet', 22)}<div><b>${rs(b.commission)} commission deducted</b><small>From your commission wallet · new balance ${rs(S.wallet.balance)}</small></div><button class="link" data-go="o-wallet">Wallet</button></div>
        <div class="closed-id">${icon('lock', 18)}<div><b>Renter identity removed</b><small>Only the minimum record is kept: ${RENTER.name} T., Rental ID ${b.id}, dates and handover photos. GAARI support keeps full records for disputes.</small></div></div>
        ${compareView(car, b.pre, b.post, true)}
        ${S.ownerReviewDone ? `<div class="card thanks">${icon('star', 22)}<div><b>You rated ${RENTER.name}</b><small>Your review adds to their trust score.</small></div></div>` : `<div class="cta-bar"><button class="btn btn-primary btn-block btn-lg" data-act="rateRenter">${icon('star', 20)} Rate ${RENTER.name}</button></div>`}`;
    }
    return head + `<div class="pad stack-16">${demoOwner}${body}</div>`;
  },
};
Actions.acceptReq = (el) => {
  const b = B();
  if (!canAcceptBooking(b)) { toast('Top up your commission wallet first', 'err'); return; }
  el.disabled = true; el.innerHTML = '<span class="spinner"></span> Accepting…';
  setTimeout(() => {
    b.status = 'confirmed';
    const t = threadFor(b.id);
    sysMsg('Booking confirmed.');
    t.msgs.push({ from: 'owner', text: `Walaikum Assalam ${RENTER.name}! Booking confirmed. See you on ${fmtDate(b.from)} at ${fmtTime(b.time)}.`, t: nowTime() }); t.unread.renter++;
    notify('renter', `🟢 Booking confirmed · ${b.id}`, `${carName(carById(b.carId))} · ${fmtDate(b.from)} ${fmtTime(b.time)}`, 'trip', 'check');
    refresh(); toast('Booking confirmed. Renter notified.');
  }, 700);
};
Actions.declineReq = () => {
  openSheet(`<div class="sheet-head"><h3>Decline this request?</h3><p>${RENTER.name} will be offered similar cars. Frequent declines lower your ranking.</p></div>
    <div class="radio-list">${['Car not available on these dates', 'Car needs maintenance', 'Other reason'].map((r, i) => `<label class="radio-row"><input type="radio" name="dr" value="${r}" ${i === 0 ? 'checked' : ''}><span>${r}</span></label>`).join('')}</div>
    <div class="row-2"><button class="btn btn-ghost" data-act="closeSheet">Back</button><button class="btn btn-danger" data-act="declineYes">Decline</button></div>`, { center: true });
};
Actions.declineYes = () => {
  const b = B(); const r = ($('input[name="dr"]:checked') || {}).value || '';
  b.status = 'declined'; b.declineReason = r.toLowerCase();
  sysMsg('Owner declined the booking.');
  notify('renter', `Booking ${b.id} declined`, 'See similar verified cars for your dates', 'trip', 'x');
  closeSheet(true); refresh(); toast('Request declined', 'info');
};
Actions.startHandover = () => {
  S.insp = { mode: 'pre', shots: {}, mileage: 87342, fuel: 75, damage: 'Minor front bumper scratch', hasDamage: true };
  go('o-inspect', { mode: 'pre' });
};
Actions.togglePaid = () => { B().paid = !B().paid; refresh(); };
Actions.handedOver = () => {
  const b = B(); b.status = 'handed_over';
  sysMsg('Handover started. Owner handed over the keys.');
  notify('renter', 'Keys handed over', 'Tap “Vehicle received” to start your trip', 'trip', 'key');
  refresh(); toast('Waiting for renter to confirm');
};
Actions.extAccept = () => {
  const b = B(); const ext = b.extension;
  const extra = commissionOf(ext.amount);
  if (S.wallet.balance - upcomingCommission() < extra) { toast('Top up your wallet to accept this extension', 'err'); go('o-wallet'); return; }
  b.to = ext.newTo; b.days += ext.days; b.amount += ext.amount; b.commission = commissionOf(b.amount); ext.status = 'accepted';
  sysMsg(`Extension accepted. New return ${fmtDate(b.to)} · ${fmtTime(b.time)}.`);
  notify('renter', 'Extension accepted', `New return ${fmtDate(b.to)} · total ${rs(b.amount)}`, 'trip', 'check');
  refresh(); toast(`Return moved to ${fmtDate(b.to)}`);
};
Actions.extDecline = () => {
  const b = B(); b.extension.status = 'declined';
  sysMsg('Extension declined by owner.');
  notify('renter', 'Extension declined', `Please return on ${fmtDate(b.to)}`, 'trip', 'x');
  refresh(); toast('Extension declined', 'info');
};
Actions.ownerCall = () => {
  openSheet(`<div class="sheet-head"><h3>Call ${RENTER.name}</h3><p>Secure line through GAARI. Neither number is shown and the call is linked to ${B().id}.</p></div>
    <div class="masked-call">${avatar(RENTER, 56)}<div><b>${RENTER.fullName}</b><small class="mono">+92 3•• ••• ••18</small><small>${icon('lock', 12)} Masked number</small></div></div>
    <button class="btn btn-primary btn-block" data-act="protoCall" data-n="${RENTER.name} via secure line">${icon('phone', 18)} Call</button>`);
};
Actions.ownerIdentity = () => openSheet(handoverIdentityCard(B()));
Actions.startReturn = () => {
  const b = B(); b.status = 'returning';
  S.insp = { mode: 'post', shots: {}, mileage: b.pre.mileage + 486 + (b.extension && b.extension.status === 'accepted' ? 212 : 0), fuel: b.pre.fuel, damage: '', hasDamage: false };
  sysMsg('Return started. Owner is recording the return inspection.');
  notify('renter', 'Return inspection started', b.id, 'trip', 'camera');
  save(); go('o-inspect', { mode: 'post' });
};
Actions.rateRenter = () => {
  openSheet(`<div class="sheet-head"><h3>Rate ${RENTER.name}</h3><p>Your rating updates their trust score.</p></div>
    <div class="star-pick center">${[1, 2, 3, 4, 5].map((n) => `<button class="on" data-act="noop" aria-label="${n} stars">${icon('star', 30)}</button>`).join('')}</div>
    <div class="chip-wrap center">${['On time', 'Returned clean', 'Careful driver', 'Good communication'].map((t, i) => `<span class="chip ${i < 3 ? 'on' : ''}">${t}</span>`).join('')}</div>
    <button class="btn btn-primary btn-block" data-act="rateRenterYes">Submit rating</button>`);
};
Actions.noop = () => {};
Actions.rateRenterYes = () => { S.ownerReviewDone = true; closeSheet(true); refresh(); toast('Rating submitted'); };

/* ---------- Inspection capture (pickup & return) ---------- */
Screens['o-inspect'] = {
  render(p) {
    const b = B(); const car = carById(b.carId);
    const mode = p.mode || 'pre';
    if (!S.insp || S.insp.mode !== mode) S.insp = mode === 'pre' ? { mode, shots: {}, mileage: 87342, fuel: 75, damage: 'Minor front bumper scratch', hasDamage: true } : { mode, shots: {}, mileage: b.pre.mileage + 486, fuel: b.pre.fuel, damage: '', hasDamage: false };
    const I = S.insp;
    const done = ANGLES.filter(([k]) => I.shots[k] && I.shots[k] !== '…').length;
    const all = done === ANGLES.length;
    return `${topbar(mode === 'pre' ? 'Handover inspection' : 'Return inspection', { sub: `${b.id} · ${carShort(car)}` })}
    <div class="pad stack-16">
      <div class="insp-progress"><div><b>${done}/6</b> photos</div><div class="bar"><i style="width:${(done / 6) * 100}%"></i></div>${all ? '' : '<button class="link" data-act="captureAll">Capture all (demo)</button>'}</div>
      <div class="cap-grid">
        ${ANGLES.map(([k, l]) => { const v = I.shots[k];
          return `<button class="cap ${v && v !== '…' ? 'done' : ''} ${v === '…' ? 'busy' : ''}" data-act="capture" data-k="${k}">
            ${v && v !== '…' ? `<div class="cap-img">${shotArt(car, k, I)}</div><span class="cap-ok">${icon('check', 14)}</span><span class="cap-time">${v}</span>` : v === '…' ? '<span class="spinner dark"></span>' : `<span class="cap-ic">${icon('camera', 24)}</span>`}
            <small>${l}</small></button>`; }).join('')}
      </div>
      <section class="card">
        <label class="field"><span>${icon('gauge', 15)} Mileage (km)</span><input id="i-km" type="number" inputmode="numeric" value="${I.mileage}" data-in="inspKm"></label>
        ${mode === 'post' ? `<small class="muted">At pickup: ${b.pre.mileage.toLocaleString('en-US')} km</small>` : ''}
        <label class="field"><span>${icon('fuel', 15)} Fuel level <b id="fuel-v">${I.fuel}%</b></span><input id="i-fuel" type="range" min="0" max="100" step="5" value="${I.fuel}" data-in="inspFuel"></label>
        ${mode === 'post' ? `<small class="muted">At pickup: ${b.pre.fuel}%</small>` : ''}
      </section>
      <section class="card">
        <div class="fg-switch"><div><h4>${mode === 'pre' ? 'Existing damage' : 'New damage'}</h4><small>${mode === 'pre' ? 'Record scratches or dents already on the car' : 'Anything not in the pickup photos?'}</small></div><button class="switch ${I.hasDamage ? 'on' : ''}" role="switch" aria-checked="${I.hasDamage}" data-act="inspDamage"><span></span></button></div>
        ${I.hasDamage ? `<div class="dmg-edit"><div class="dmg-img">${carDamage(car)}</div><label class="field"><span>Describe it</span><input id="i-dmg" value="${esc(I.damage)}" data-in="inspDmgText" placeholder="e.g. Dent on rear left door"></label></div>` : ''}
      </section>
    </div>
    <div class="cta-bar"><button class="btn btn-primary btn-block btn-lg" data-act="${mode === 'pre' ? 'shareInspection' : 'toCompare'}" ${all ? '' : 'disabled'}>${mode === 'pre' ? 'Share with renter' : 'Compare before & after'}</button></div>`;
  },
};
Actions.capture = (el) => {
  const k = el.dataset.k; if (S.insp.shots[k] && S.insp.shots[k] !== '…') return;
  S.insp.shots[k] = '…'; refresh();
  setTimeout(() => { S.insp.shots[k] = nowTime(); refresh(); }, 550);
};
Actions.captureAll = () => { ANGLES.forEach(([k], i) => { if (!S.insp.shots[k]) S.insp.shots[k] = nowTime(); }); refresh(); toast('All 6 photos captured'); };
Actions.inspKm = (el) => { S.insp.mileage = +el.value || 0; save(); };
Actions.inspFuel = (el) => { S.insp.fuel = +el.value; $('#fuel-v').textContent = el.value + '%'; save(); };
Actions.inspDamage = () => { S.insp.hasDamage = !S.insp.hasDamage; if (S.insp.hasDamage && !S.insp.damage) S.insp.damage = S.insp.mode === 'pre' ? 'Minor front bumper scratch' : 'Scratch on front right bumper'; refresh(); };
Actions.inspDmgText = (el) => { S.insp.damage = el.value; save(); };
Actions.shareInspection = () => {
  const b = B(), I = S.insp;
  b.pre = { shots: I.shots, mileage: I.mileage, fuel: I.fuel, damage: I.hasDamage ? I.damage : '', time: nowTime(), date: fmtDate(b.from) };
  b.status = 'inspection'; S.insp = null;
  sysMsg('Handover inspection shared: 6 photos, mileage and fuel recorded.');
  notify('renter', 'Check the car’s condition', 'Review the handover photos and accept', 'trip', 'camera');
  S.stack.owner = [{ s: 'o-bookings' }, { s: 'o-booking' }]; refresh(); toast('Inspection shared with renter');
};
Actions.toCompare = () => {
  const b = B(), I = S.insp;
  if (I.mileage < b.pre.mileage) { toast('Return mileage can’t be lower than pickup mileage', 'err'); return; }
  b.post = { shots: I.shots, mileage: I.mileage, fuel: I.fuel, newDamage: I.hasDamage ? I.damage : '', damage: b.pre.damage, time: nowTime(), date: fmtDate(b.to) };
  go('o-compare');
};

Screens['o-compare'] = {
  render() {
    const b = B(); const car = carById(b.carId);
    const issue = b.post.newDamage || b.post.fuel < b.pre.fuel;
    return `${topbar('Before vs after', { sub: b.id })}
    <div class="pad stack-16">
      ${issue ? `<div class="alert-box warn">${icon('alert', 18)}<span><b>${b.post.newDamage ? 'New damage recorded.' : 'Fuel is lower than at pickup.'}</b> Talk to ${RENTER.name} first. You can accept the return or open a claim. GAARI support reviews both photo sets.</span></div>` : `<div class="alert-box ok">${icon('check', 18)}<span><b>No new issues found.</b> Photos, mileage and fuel look consistent with pickup.</span></div>`}
      ${compareView(car, b.pre, b.post)}
    </div>
    <div class="cta-bar ${issue ? 'cta-col' : ''}">
      <button class="btn btn-success btn-block btn-lg" data-act="acceptReturn">${icon('check', 20)} Accept return</button>
      ${issue ? '<button class="btn btn-text" data-act="openClaim">Open damage claim</button>' : ''}
    </div>`;
  },
};
Actions.acceptReturn = (el) => {
  el.disabled = true; el.innerHTML = '<span class="spinner"></span> Closing rental…';
  setTimeout(() => {
    const b = B();
    b.status = 'completed'; b.closedAt = nowTime();
    S.wallet.balance -= b.commission;
    S.wallet.tx.unshift({ type: 'commission', amount: -b.commission, label: `Rental commission · ${b.id}`, date: fmtDate(b.to) });
    S.stats.bookings++; S.stats.days += b.days; S.stats.gross += b.amount;
    sysMsg('Return accepted. Rental closed.');
    const t = threadFor(b.id); if (t) t.closed = true;
    notify('renter', '✅ Rental completed', `Return accepted for ${b.id}. Rate your experience.`, 'trip', 'check');
    notify('owner', `${rs(b.commission)} commission deducted`, `${b.id} · wallet balance ${rs(S.wallet.balance)}`, 'o-wallet', 'wallet');
    S.stack.owner = [{ s: 'o-bookings' }, { s: 'o-booking' }];
    save(); render('fwd');
    openSheet(`<div class="success-sheet"><div class="success-ic">${icon('check', 34)}</div><h3>✅ Return accepted</h3><p>Rental completed. ${rs(b.commission)} commission was deducted from your wallet.</p>
      <div class="rid">Wallet balance <b>${rs(S.wallet.balance)}</b></div>
      <button class="btn btn-primary btn-block" data-act="closeSheet">Done</button></div>`, { center: true });
  }, 900);
};
Actions.openClaim = () => {
  const b = B();
  S.incidents.unshift({ id: 'INC-' + (2041 + S.incidents.length), booking: b.id, kind: 'Damage claim', desc: b.post.newDamage || 'Fuel lower than pickup', photos: 7, voice: false, time: nowTime(), status: 'open' });
  notify('admin', 'New damage claim', b.id, 'a-disputes', 'flag');
  sysMsg('Owner opened a damage claim. GAARI support will review both photo sets.');
  toast('Claim opened. GAARI support will contact both sides.', 'info');
  Actions.acceptReturn($('[data-act="acceptReturn"]'));
};

/* ---------- Wallet ---------- */
Screens['o-wallet'] = {
  tab: 'o-wallet',
  render() {
    S.seenWallet = true;
    const w = S.wallet, up = upcomingCommission();
    const last = w.tx.find((t) => t.type === 'commission');
    const low = w.balance < up + 1650;
    return `<header class="page-head"><h1>Commission wallet</h1>${bellBtn()}</header>
    <div class="pad-x stack-16">
      <section class="wallet-card ${w.balance < 0 ? 'neg' : ''}">
        <p>💰 Current balance</p><h2>${rs(w.balance)}</h2>
        <div class="wc-row"><div><small>Upcoming commission</small><b>${rs(up)}</b></div><div><small>Last deduction</small><b>${last ? rs(-last.amount) : '—'}</b></div></div>
        <button class="btn btn-primary btn-block btn-lg" data-act="openTopUp">${icon('plus', 20)} Top up balance</button>
      </section>
      ${low ? `<div class="alert-box bad">${icon('alert', 18)}<span><b>⚠️ Your commission balance is too low to accept new qualifying bookings.</b> Keep at least your pending commission plus one booking’s commission.</span></div><button class="btn btn-danger btn-block" data-act="openTopUp">Top up now</button>` : ''}
      <div class="info-box">${icon('info', 18)}<span>Renters pay you directly. After each completed rental, GAARI deducts a <b>10% commission</b> from this wallet. No other fees.</span></div>
      <section><h2 class="h3">Transactions</h2>
        <div class="tx-list">${w.tx.map((t) => `<div class="tx"><span class="tx-ic ${t.amount > 0 ? 'in' : 'out'}">${icon(t.amount > 0 ? 'plus' : 'receipt', 17)}</span><div><b>${t.type === 'topup' ? 'Top up' : 'Rental commission'}</b><small>${t.label.replace(/^(Top up · |Rental commission · )/, '')} · ${t.date}</small></div><em class="${t.amount > 0 ? 'pos' : 'neg'}">${t.amount > 0 ? '+' : '−'}${rs(Math.abs(t.amount))}</em></div>`).join('')}</div>
      </section>
    </div>`;
  },
};
Actions.openTopUp = () => {
  const tu = S.topup || (S.topup = { amt: 5000, m: 'jazzcash' });
  openSheet(`<div class="sheet-head"><h3>Top up commission wallet</h3><p>Current balance ${rs(S.wallet.balance)}</p></div>
    <div class="amt-grid">${[1000, 2500, 5000, 10000].map((a) => `<button class="${tu.amt === a ? 'on' : ''}" data-act="tuAmt" data-a="${a}">${rs(a)}</button>`).join('')}</div>
    <div class="pay-list">${[['jazzcash', 'JazzCash', 'phone'], ['easypaisa', 'Easypaisa', 'phone'], ['card', 'Debit / credit card', 'wallet'], ['bank', 'Bank transfer (Raast)', 'bank']].map(([k, l, ic]) => `<button class="pay ${tu.m === k ? 'on' : ''}" data-act="tuM" data-k="${k}"><span class="radio"></span><span class="pay-ic">${icon(ic, 18)}</span><span><b>${l}</b></span></button>`).join('')}</div>
    <button class="btn btn-primary btn-block btn-lg" data-act="doTopUp">Top up ${rs(tu.amt)}</button>`);
};
Actions.tuAmt = (el) => { S.topup.amt = +el.dataset.a; Actions.openTopUp(); $$('.sheet-wrap').forEach((w) => w.classList.add('in')); };
Actions.tuM = (el) => { S.topup.m = el.dataset.k; Actions.openTopUp(); $$('.sheet-wrap').forEach((w) => w.classList.add('in')); };
Actions.doTopUp = (el) => {
  el.disabled = true; el.innerHTML = '<span class="spinner"></span> Processing…';
  setTimeout(() => {
    const { amt, m } = S.topup;
    S.wallet.balance += amt;
    S.wallet.tx.unshift({ type: 'topup', amount: amt, label: `Top up · ${{ jazzcash: 'JazzCash', easypaisa: 'Easypaisa', card: 'Card', bank: 'Bank transfer' }[m]}`, date: '30 Sep' });
    save();
    $('.sheet').innerHTML = `<div class="success-sheet"><div class="success-ic">${icon('check', 34)}</div><h3>${rs(amt)} added</h3><p>New balance ${rs(S.wallet.balance)}. You can accept new bookings.</p><button class="btn btn-primary btn-block" data-act="closeTopUp">Done</button></div>`;
  }, 1200);
};
Actions.closeTopUp = () => { closeSheet(); refresh(); };

/* ---------- My cars, availability ---------- */
Screens['o-cars'] = {
  tab: 'o-cars',
  render() {
    const oc = S.ownerCars[0]; const car = CARS[0];
    const d = S.draft;
    return `<header class="page-head"><h1>My cars</h1><button class="icon-btn" data-act="startAdd" aria-label="Add car">${icon('plus', 22)}</button></header>
    <div class="pad-x stack-16">
      <section class="car-manage">
        <div class="cm-media">${carScene(car)}</div>
        <div class="cm-body">
          <div class="cm-title"><b>${carName(car)}</b><span class="tb tb-ok">Vehicle verified</span></div>
          <small>${car.plate} · ${car.area}, ${car.city}</small>
          <div class="fg-switch"><div><h4>Accepting bookings</h4><small>${oc.paused ? 'Hidden from search' : 'Visible in search'}</small></div><button class="switch ${oc.paused ? '' : 'on'}" role="switch" aria-checked="${!oc.paused}" data-act="togglePause"><span></span></button></div>
          <h4 class="mini-h">Rental type</h4>
          <div class="seg">${[['self', 'Self drive'], ['driver', 'With driver'], ['both', 'Both']].map(([k, l]) => `<button class="${car.rental === k ? 'on' : ''}" data-act="setRental" data-k="${k}">${l}</button>`).join('')}</div>
          <h4 class="mini-h">Daily price</h4>
          <div class="price-edit"><button class="icon-btn soft" data-act="priceStep" data-d="-250" aria-label="Lower price">−</button><b>${rs(car.price)}</b><button class="icon-btn soft" data-act="priceStep" data-d="250" aria-label="Raise price">+</button><small>Similar cars in DHA: Rs. 5,000–6,500</small></div>
          <button class="btn btn-ghost btn-block" data-go="o-avail" data-id="c1">${icon('cal', 18)} Edit availability</button>
        </div>
      </section>
      ${(S.customCars || []).map((c) => `<section class="car-manage"><div class="cm-media">${carScene(c)}</div><div class="cm-body"><div class="cm-title"><b>${carName(c)}</b><span class="tb tb-ok">Vehicle verified</span></div><small>${c.plate} · ${rs(c.price)}/day · live in search</small></div></section>`).join('')}
      ${d && d.status === 'pending' ? `<button class="car-manage pending" data-go="o-add"><div class="cm-body"><div class="cm-title"><b>${d.make} ${d.model} ${d.year}</b><span class="tb tb-wait">Pending review</span></div><small>${d.reg} · GAARI usually reviews within 24 hours</small></div></button>` : ''}
      ${d && d.status === 'draft' ? `<button class="car-manage pending" data-go="o-add"><div class="cm-body"><div class="cm-title"><b>Draft listing</b><span class="tb tb-self">Step ${d.step} of 6</span></div><small>Tap to continue</small></div></button>` : ''}
      <button class="add-car-btn" data-act="startAdd">${icon('plus', 22)}<span><b>Add another car</b><small>Earn more with every car you list</small></span></button>
    </div>`;
  },
};
Actions.togglePause = () => { S.ownerCars[0].paused = !S.ownerCars[0].paused; refresh(); toast(S.ownerCars[0].paused ? 'Listing paused' : 'Listing live again'); };
Actions.setRental = (el) => { CARS[0].rental = el.dataset.k; S.carEdits = Object.assign(S.carEdits || {}, { rental: el.dataset.k }); refresh(); toast('Rental type updated'); };
Actions.priceStep = (el) => { CARS[0].price = Math.max(2000, CARS[0].price + +el.dataset.d); S.carEdits = Object.assign(S.carEdits || {}, { price: CARS[0].price }); refresh(); };
function applyCarEdits() { if (S.carEdits) Object.assign(CARS[0], S.carEdits); }

const AV_CYCLE = { available: 'unavailable', unavailable: 'maintenance', maintenance: 'available' };
function bookedDays() {
  const b = B(); const out = {};
  if (b && ![ 'requested', 'declined', 'cancelled'].includes(b.status) && b.carId === 'c1') for (let d = b.from; d < b.to; d = addDays(d, 1)) out[d] = 'booked';
  return out;
}
function calendarHTML(y, m, map, act) {
  const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  let cells = Array.from({ length: lead }, () => '<span class="cal-empty"></span>').join('');
  for (let d = 1; d <= days; d++) {
    const iso = toISO(new Date(y, m, d));
    const st = map[iso] || 'available';
    const past = iso < '2026-09-30';
    cells += `<button class="cal-day st-${st} ${past ? 'past' : ''}" ${act && st !== 'booked' && !past ? `data-act="${act}" data-d="${iso}"` : 'disabled'} aria-label="${d} ${MONTHS[m]}: ${st}">${d}</button>`;
  }
  return `<div class="cal"><div class="cal-head">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="cal-grid">${cells}</div></div>`;
}
const CAL_LEGEND = `<div class="cal-legend"><span class="lg st-available">Available</span><span class="lg st-booked">Booked</span><span class="lg st-unavailable">Unavailable</span><span class="lg st-maintenance">Maintenance</span></div>`;
Screens['o-avail'] = {
  render() {
    const mo = S.calMonth || 9;
    const map = Object.assign({}, S.avail, bookedDays());
    const count = (k) => Object.entries(map).filter(([d, v]) => v === k && parseISO(d).getMonth() === mo).length;
    return `${topbar('Availability', { sub: carName(CARS[0]) })}
    <div class="pad stack-16">
      <div class="cal-nav"><button class="icon-btn soft" data-act="calMonth" data-d="-1" ${mo <= 9 ? 'disabled' : ''} aria-label="Previous month">${icon('back', 18)}</button><b>${['', '', '', '', '', '', '', '', '', 'October', 'November', 'December'][mo]} 2026</b><button class="icon-btn soft" data-act="calMonth" data-d="1" ${mo >= 11 ? 'disabled' : ''} aria-label="Next month">${icon('chev', 18)}</button></div>
      ${calendarHTML(2026, mo, map, 'calTap')}
      ${CAL_LEGEND}
      <p class="note">${icon('info', 13)} Tap a day to switch between Available, Unavailable and Maintenance. Booked days are locked.</p>
      <div class="stat-row"><div><b>${count('booked')}</b><small>Booked</small></div><div><b>${count('unavailable')}</b><small>Unavailable</small></div><div><b>${count('maintenance')}</b><small>Maintenance</small></div></div>
    </div>`;
  },
};
Actions.calMonth = (el) => { S.calMonth = Math.min(11, Math.max(9, (S.calMonth || 9) + +el.dataset.d)); refresh(); };
Actions.calTap = (el) => { const d = el.dataset.d; const next = AV_CYCLE[S.avail[d] || 'available']; if (next === 'available') delete S.avail[d]; else S.avail[d] = next; refresh(); };

/* ---------- Add car wizard ---------- */
const MAKES = ['Toyota', 'Honda', 'Suzuki', 'Kia', 'Hyundai', 'Changan', 'MG', 'Proton', 'Haval'];
const FEATURES = ['Air conditioning', 'Reverse camera', 'Bluetooth audio', 'Cruise control', 'Sunroof', 'Apple CarPlay / Android Auto', 'Airbags', 'Leather seats', 'Child seat', 'Roof rack'];
const DOCS = [['reg', 'Vehicle registration book', 'Front and back'], ['tax', 'Token tax 2026 receipt', 'Excise & Taxation'], ['cnic', 'Your CNIC', 'Private · only GAARI verification sees it']];
function startDraft() {
  if (!S.draft || S.draft.status === 'verified') S.draft = { step: 1, status: 'draft', reg: '', make: 'Honda', model: 'Civic', year: 2023, trans: 'Automatic', fuel: 'Petrol', seats: 5, features: ['Air conditioning', 'Reverse camera', 'Airbags'], rental: 'self', driverRate: 2500, daily: 7000, weekly: 44000, monthly: 170000, avail: {}, photos: {}, docs: {} };
}
Actions.startAdd = () => { startDraft(); go('o-add'); };
function draftCar() { const d = S.draft; return { id: 'n1', make: d.make, model: d.model || 'Car', year: d.year, type: d.seats >= 7 ? 'suv' : 'sedan', color: '#3E4C8A', plate: d.reg || 'LEA 23-1001' }; }
const STEP_T = ['Tell us about your car', 'Rental type', 'Set price', 'Availability', 'Upload car', 'Verification'];
Screens['o-add'] = {
  render() {
    if (!S.draft) startDraft();
    const d = S.draft; const st = d.status !== 'draft' ? 6 : d.step;
    const opt = (arr, key) => `<div class="seg">${arr.map((v) => `<button class="${String(d[key]) === String(v) ? 'on' : ''}" data-act="dSet" data-k="${key}" data-v="${v}">${v}</button>`).join('')}</div>`;
    let body = '';
    if (st === 1) {
      body = `<label class="field"><span>Registration number</span><input id="d-reg" value="${esc(d.reg)}" placeholder="e.g. LEA 23-1234" data-in="dInput" data-k="reg" autocomplete="off">${d.err && !d.reg ? '<em class="field-err">Enter your registration number</em>' : ''}</label>
        <div class="row-2"><label class="field"><span>Make</span><select id="d-make" data-ch="dInput" data-k="make">${MAKES.map((m) => `<option ${m === d.make ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="field"><span>Model</span><input id="d-model" value="${esc(d.model)}" data-in="dInput" data-k="model">${d.err && !d.model ? '<em class="field-err">Enter the model</em>' : ''}</label></div>
        <label class="field"><span>Year</span><select id="d-year" data-ch="dInput" data-k="year">${Array.from({ length: 12 }, (_, i) => 2026 - i).map((y) => `<option ${y == d.year ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
        <div class="field"><span>Transmission</span>${opt(['Automatic', 'Manual'], 'trans')}</div>
        <div class="field"><span>Fuel</span>${opt(['Petrol', 'Diesel', 'Hybrid', 'CNG'], 'fuel')}</div>
        <div class="field"><span>Seats</span>${opt([4, 5, 7, 8], 'seats')}</div>
        <div class="field"><span>Features</span><div class="chip-wrap">${FEATURES.map((f) => `<button class="chip ${d.features.includes(f) ? 'on' : ''}" data-act="dFeat" data-f="${f}">${d.features.includes(f) ? icon('check', 13) : ''}${f}</button>`).join('')}</div></div>`;
    } else if (st === 2) {
      body = `<p class="lead">How can people rent your car?</p>
        <div class="type-cards">${[['self', 'Self drive', 'Renter drives. Only licence-verified renters can book.', 'steer'], ['driver', 'With driver', 'You or your authorised driver drives the renter.', 'user'], ['both', 'Both', 'Offer both and let renters choose. Most bookings.', 'swap']].map(([k, t, s, ic]) => `<button class="type-card ${d.rental === k ? 'on' : ''}" data-act="dSet" data-k="rental" data-v="${k}"><span class="tc-ic">${icon(ic, 24)}</span><b>${t}</b><small>${s}</small><span class="radio"></span></button>`).join('')}</div>
        ${d.rental !== 'self' ? `<label class="field"><span>Driver charge per day</span><div class="money-in"><em>Rs.</em><input id="d-drv" type="number" value="${d.driverRate}" data-in="dInput" data-k="driverRate"></div><small class="muted">Up to 10 hrs/day. Fuel is paid by the renter.</small></label>` : ''}`;
    } else if (st === 3) {
      const net = d.daily * 12 - commissionOf(d.daily * 12);
      body = `<div class="suggest">${icon('sparkle', 16)}<span>Similar ${d.make} ${d.model}s in Lahore rent for <b>Rs. 6,500 – 7,500/day</b></span></div>
        ${[['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']].map(([k, l]) => `<label class="field"><span>${l} price</span><div class="money-in"><em>Rs.</em><input id="d-${k}" type="number" value="${d[k]}" data-in="dInput" data-k="${k}"></div></label>`).join('')}
        <div class="card calc-out"><small>At 12 days a month you keep</small><b>${rs(net)}</b><span>after 10% GAARI commission · renters pay Rs. 0 platform fee</span></div>`;
    } else if (st === 4) {
      body = `<p class="lead">When is your car available in October?</p>${calendarHTML(2026, 9, d.avail, 'dCal')}${CAL_LEGEND}<p class="note">${icon('info', 13)} Tap days to mark them unavailable or under maintenance. You can change this any time.</p>`;
    } else if (st === 5) {
      const car = draftCar();
      body = `<h3 class="h3">Car photos <small class="muted">${Object.keys(d.photos).length}/6</small></h3>
        <div class="cap-grid">${ANGLES.map(([k, l]) => { const src = memory.photos['d-' + k]; const has = d.photos[k];
          return `<label class="cap ${has ? 'done' : ''}">${has ? `<div class="cap-img">${src ? `<img src="${src}" alt="${l}">` : shotArt(car, k, { mileage: 12040, fuel: 80 })}</div><span class="cap-ok">${icon('check', 14)}</span>` : `<span class="cap-ic">${icon('camera', 22)}</span>`}<small>${l}</small><input type="file" accept="image/*" hidden data-ch="dPhoto" data-k="${k}"></label>`; }).join('')}</div>
        <button class="link" data-act="dSamplePhotos">Use sample photos (demo)</button>
        <h3 class="h3">Documents</h3>
        <div class="doc-list">${DOCS.map(([k, l, s]) => `<label class="doc-row ${d.docs[k] ? 'done' : ''}">${icon(d.docs[k] ? 'check' : 'file', 20)}<span><b>${l}</b><small>${d.docs[k] ? 'Uploaded · ' + esc(d.docs[k]) : s}</small></span><em>${d.docs[k] ? 'Replace' : 'Upload'}</em><input type="file" accept="image/*,application/pdf" hidden data-ch="dDoc" data-k="${k}"></label>`).join('')}</div>
        <button class="link" data-act="dSampleDocs">Use sample documents (demo)</button>
        ${d.err ? '<p class="field-err">Add at least 4 photos and all 3 documents to continue.</p>' : ''}`;
    } else {
      const car = draftCar();
      const verified = d.status === 'verified';
      body = d.status === 'draft' ? `<div class="review-car">${carScene(car)}<div><b>${d.make} ${d.model} ${d.year}</b><small>${d.reg} · ${d.trans} · ${d.fuel} · ${d.seats} seats</small><div class="d-badges">${rentalBadges(d.rental)}</div></div></div>
          ${kv([['Daily price', rs(d.daily)], ['Weekly', rs(d.weekly)], ['Monthly', rs(d.monthly)], ['Photos', `${Object.keys(d.photos).length} uploaded`], ['Documents', `${Object.keys(d.docs).length} of 3`]])}
          <p class="note">${icon('lock', 13)} Your CNIC and documents are only seen by GAARI’s verification team. Renters see a “Vehicle verified” badge.</p>`
        : `<div class="status-hero ${verified ? 'sh-ok' : 'sh-wait'}"><div class="${verified ? 'sh-ic' : 'pulse-ring'}">${icon(verified ? 'shield' : 'clock', 28)}</div>
            <span class="status ${verified ? 'st-ok' : 'st-wait'} status-big"><span class="status-dot"></span>${verified ? '🟢 Vehicle verified' : '🟡 Pending review'}</span>
            <p>${verified ? `Your ${d.make} ${d.model} is live in ${OWNERS.o1.city} search.` : 'GAARI is checking your documents and photos. Usually within 24 hours.'}</p></div>
          ${verifyList([['Registration matched with Excise record', verified || d.check > 0], ['Ownership matches your verified CNIC', verified || d.check > 1], ['Photos reviewed', verified || d.check > 2], ['Listing approved', verified]])}
          ${verified ? '' : `${demoHint('Approve it from the admin panel', 'adminVehicles', 'Admin')}<button class="btn btn-ghost btn-block" data-act="simApprove">Simulate approval</button>`}`;
    }
    const nextLabel = st === 6 ? (d.status === 'draft' ? 'Submit for verification' : d.status === 'verified' ? 'Go to my cars' : 'Back to dashboard') : 'Continue';
    return `${topbar(d.status === 'draft' ? `Step ${st} of 6` : 'Verification', { sub: d.status === 'draft' ? STEP_T[st - 1] : `${d.make} ${d.model} ${d.year}` })}
      <div class="wiz-bar"><i style="width:${(st / 6) * 100}%"></i></div>
      <div class="pad stack-16"><h1 class="wiz-t">${STEP_T[st - 1]}</h1>${body}</div>
      <div class="cta-bar ${st > 1 && d.status === 'draft' ? 'row-2' : ''}">${st > 1 && d.status === 'draft' ? '<button class="btn btn-ghost btn-lg" data-act="dBack">Back</button>' : ''}<button class="btn btn-primary btn-lg ${st > 1 && d.status === 'draft' ? '' : 'btn-block'}" data-act="dNext">${nextLabel}</button></div>`;
  },
};
Actions.dInput = (el) => { const k = el.dataset.k; S.draft[k] = ['year', 'driverRate', 'daily', 'weekly', 'monthly'].includes(k) ? +el.value : el.value; save(); if (el.tagName === 'SELECT' || k === 'daily') { if (k !== 'daily') refresh(); } };
Actions.dSet = (el) => { const k = el.dataset.k; S.draft[k] = k === 'seats' ? +el.dataset.v : el.dataset.v; refresh(); };
Actions.dFeat = (el) => { const f = el.dataset.f, a = S.draft.features; S.draft.features = a.includes(f) ? a.filter((x) => x !== f) : a.concat(f); refresh(); };
Actions.dCal = (el) => { const d = el.dataset.d; const next = AV_CYCLE[S.draft.avail[d] || 'available']; if (next === 'available') delete S.draft.avail[d]; else S.draft.avail[d] = next; refresh(); };
Actions.dPhoto = (el) => { const f = el.files && el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { memory.photos['d-' + el.dataset.k] = r.result; S.draft.photos[el.dataset.k] = true; refresh(); }; r.readAsDataURL(f); };
Actions.dDoc = (el) => { const f = el.files && el.files[0]; if (!f) return; S.draft.docs[el.dataset.k] = f.name; refresh(); };
Actions.dSamplePhotos = () => { ANGLES.forEach(([k]) => { S.draft.photos[k] = true; }); refresh(); };
Actions.dSampleDocs = () => { S.draft.docs = { reg: 'registration-book.jpg', tax: 'token-tax-2026.pdf', cnic: 'cnic-front-back.jpg' }; refresh(); };
Actions.dBack = () => { S.draft.step = Math.max(1, S.draft.step - 1); S.draft.err = false; refresh(); $('#screen').scrollTop = 0; };
Actions.dNext = () => {
  const d = S.draft;
  if (d.status === 'verified') { S.stack.owner = [{ s: 'o-cars' }]; refresh(); return; }
  if (d.status === 'pending') { S.stack.owner = [{ s: 'o-dash' }]; refresh(); return; }
  if (d.step === 1 && (!d.reg.trim() || !d.model.trim())) { d.err = true; refresh(); toast('Fill in the highlighted fields', 'err'); return; }
  if (d.step === 5 && (Object.keys(d.photos).length < 4 || Object.keys(d.docs).length < 3)) { d.err = true; refresh(); return; }
  d.err = false;
  if (d.step < 6) { d.step++; refresh(); $('#screen').scrollTop = 0; return; }
  d.status = 'pending'; d.check = 0;
  notify('admin', 'New vehicle for review', `${d.make} ${d.model} ${d.year} · ${d.reg}`, 'a-vehicles', 'car');
  refresh(); toast('Submitted for verification');
  [1, 2, 3].forEach((n) => setTimeout(() => { if (S.draft && S.draft.status === 'pending') { S.draft.check = n; if (cur().s === 'o-add') refresh(); else save(); } }, n * 900));
};
Actions.simApprove = () => approveDraft();
Actions.adminVehicles = () => { S.admin.tab = 'a-vehicles'; switchRole('admin'); };
function approveDraft() {
  const d = S.draft; if (!d || d.status !== 'pending') return;
  d.status = 'verified';
  const car = { id: 'n' + ((S.customCars || []).length + 1), make: d.make, model: d.model, year: d.year, price: d.daily, driverRate: d.driverRate, rating: 5.0, trips: 0, reviews: 0,
    area: 'DHA Phase 5', city: 'Lahore', rental: d.rental, trans: d.trans, fuel: d.fuel, seats: d.seats, type: d.seats >= 7 ? 'suv' : 'sedan', color: '#3E4C8A', colorName: 'Blue',
    mileage: '12,000 km', engine: '—', plate: d.reg, owner: 'o1', verified: true, features: d.features, weekly: d.weekly, monthly: d.monthly };
  S.customCars = (S.customCars || []).concat(car);
  notify('owner', '🟢 Vehicle verified', `${d.make} ${d.model} is now live in search`, 'o-cars', 'shield');
  save(); if (S.role === 'owner') refresh();
}
