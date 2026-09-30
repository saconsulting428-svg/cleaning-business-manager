/* GAARI prototype — admin console (desktop-first, stacks on phones). */

const ADMIN_TABS = [
  ['a-dash', 'Dashboard', 'grid'], ['a-users', 'Users & KYC', 'users'], ['a-vehicles', 'Vehicles', 'car'],
  ['a-bookings', 'Bookings', 'trips'], ['a-commission', 'Commission', 'wallet'], ['a-disputes', 'Disputes', 'flag'], ['a-analytics', 'Analytics', 'chart'],
];
const lakh = (n) => n >= 10000000 ? `Rs. ${(n / 10000000).toFixed(2)} crore` : `Rs. ${(n / 100000).toFixed(1)} lakh`;
const pill = (t, cls) => `<span class="apill ap-${cls}">${t}</span>`;
const STATUS_CLS = { pending: 'wait', verified: 'ok', suspended: 'bad', rejected: 'bad', upcoming: 'info', active: 'live', completed: 'ok', cancelled: 'mute', disputed: 'bad', open: 'bad', investigating: 'wait', resolved: 'ok' };

function adminBookings() {
  const list = ADMIN.bookings.slice();
  const b = B();
  if (b) {
    const st = { requested: 'upcoming', confirmed: 'upcoming', handover: 'active', inspection: 'active', condition_ok: 'active', handed_over: 'active', active: 'active', returning: 'active', completed: 'completed', declined: 'cancelled' }[b.status] || 'upcoming';
    const car = carById(b.carId);
    list.unshift({ id: b.id, car: carName(car), renter: 'Hamza T.', owner: `${ownerOf(car).name} ${ownerOf(car).fullName.split(' ')[1][0]}.`, city: car.city, dates: `${fmtDate(b.from)}–${fmtDate(b.to)}`, amount: b.amount, status: st, live: true });
  }
  return list;
}
function adminDisputes() {
  return S.incidents.map((i) => ({ id: i.id, type: i.kind.includes('Damage') ? 'Damage' : i.kind, booking: i.booking, title: i.desc, parties: 'Hamza T. · reported in app', opened: 'Today ' + i.time, status: S.admin.disputes[i.id] || 'open', priority: 'High', live: true, voice: i.voice, photos: i.photos }))
    .concat(ADMIN.disputes.map((d) => Object.assign({}, d, { status: S.admin.disputes[d.id] || d.status })));
}
function adminKyc() { return ADMIN.kyc.map((u) => Object.assign({}, u, { status: S.admin.kyc[u.id] || u.status })); }
function adminVehicles() {
  const list = ADMIN.vehicles.map((v) => Object.assign({}, v, { status: S.admin.veh[v.id] || v.status }));
  const d = S.draft;
  if (d && d.status !== 'draft') list.unshift({ id: 'V-NEW', car: `${d.make} ${d.model} ${d.year}`, owner: 'Ahmed Raza', city: 'Lahore', plate: d.reg, submitted: 'Just now', status: d.status === 'verified' ? 'verified' : 'pending', docs: `${Object.keys(d.docs).length} documents, ${Object.keys(d.photos).length} photos`, live: true });
  return list;
}

function barsH(data, key, label, fmt = (v) => v.toLocaleString('en-US')) {
  const max = Math.max(...data.map((d) => d.v));
  return `<div class="hbars">${data.map((d) => `<div class="hb"><span class="hb-l">${d[key]}</span><span class="hb-track"><i style="width:${(d.v / max) * 100}%"></i></span><b>${fmt(d.v)}</b></div>`).join('')}</div>`;
}
function colChart(data, key, fmt, aria) {
  const W = 520, H = 190, pl = 40, pb = 24, pt = 16;
  const max = Math.max(...data.map((d) => d.v)) * 1.15;
  const step = [0.5, 1, 2, 5, 10, 20, 50, 100, 200].find((st) => max / st <= 5) || 500;
  const ticks = []; for (let t = 0; t <= max; t += step) ticks.push(+t.toFixed(2));
  const bw = Math.min(38, (W - pl) / data.length - 14), gap = (W - pl - data.length * bw) / data.length;
  const y = (v) => pt + (H - pt - pb) * (1 - v / max);
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${aria}">
    ${ticks.map((t) => `<line x1="${pl}" x2="${W}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${pl - 6}" y="${y(t) + 3.5}" text-anchor="end" class="axis">${fmt(t, true)}</text>`).join('')}
    ${data.map((d, i) => { const x = pl + gap / 2 + i * (bw + gap); const last = i === data.length - 1;
      return `<g class="bar ${last ? 'last' : ''}" data-tip="${d[key]} · ${fmt(d.v)}"><rect x="${x - gap / 2}" y="${pt}" width="${bw + gap}" height="${H - pt - pb}" fill="transparent"/>
      <path d="M${x} ${y(0)} V${y(d.v) + 4} Q${x} ${y(d.v)} ${x + 4} ${y(d.v)} H${x + bw - 4} Q${x + bw} ${y(d.v)} ${x + bw} ${y(d.v) + 4} V${y(0)} Z" class="bar-fill"/>
      ${last ? `<text x="${x + bw / 2}" y="${y(d.v) - 6}" text-anchor="middle" class="bar-label">${fmt(d.v)}</text>` : ''}
      <text x="${x + bw / 2}" y="${H - 7}" text-anchor="middle" class="axis">${d[key]}</text></g>`; }).join('')}
  </svg><div class="chart-tip" hidden></div></div>`;
}
function subTabs(name, tabs) {
  const cur = S.admin.sub[name] || tabs[0][0];
  return { cur, html: `<div class="tabs">${tabs.map(([k, l, n]) => `<button class="${cur === k ? 'on' : ''}" data-act="aSub" data-n="${name}" data-k="${k}">${l}${n != null ? `<i>${n}</i>` : ''}</button>`).join('')}</div>` };
}
Actions.aSub = (el) => { S.admin.sub[el.dataset.n] = el.dataset.k; refresh(); };
Actions.aTab = (el) => { S.admin.tab = el.dataset.k; save(); renderAdmin(); window.scrollTo(0, 0); };

const ADMIN_VIEWS = {
  'a-dash'() {
    const k = ADMIN.kpis; const b = B();
    const active = k.active + (b && ['active', 'handover', 'inspection', 'condition_ok', 'handed_over', 'returning'].includes(b.status) ? 1 : 0);
    const pendK = adminKyc().filter((u) => u.status === 'pending').length, pendV = adminVehicles().filter((v) => v.status === 'pending').length, openD = adminDisputes().filter((d) => d.status !== 'resolved').length;
    return `<div class="kpi-grid">
      ${[['Total users', k.users.toLocaleString('en-US'), '+312 this week'], ['Total cars', k.cars.toLocaleString('en-US'), '+48 this week'], ['Active rentals', active, 'right now'], ['Bookings', k.bookings.toLocaleString('en-US'), 'all time'], ['Rental value (GMV)', lakh(k.gmv), 'paid owner-direct'], ['Commission earned', lakh(k.commission), '10% from owners']]
        .map(([l, v, s]) => `<div class="kpi"><small>${l}</small><b>${v}</b><em>${s}</em></div>`).join('')}
    </div>
    <div class="a-cols">
      <section class="a-card"><h3>Bookings per week</h3>${colChart(ADMIN.weekly, 'w', (v) => Math.round(v), 'Weekly bookings, weeks 32 to 39')}</section>
      <section class="a-card"><h3>Needs attention</h3>
        <div class="todo">
          <button data-act="aTab" data-k="a-users">${icon('users', 18)}<span>${pendK} KYC requests</span>${pill('Review', 'wait')}</button>
          <button data-act="aTab" data-k="a-vehicles">${icon('car', 18)}<span>${pendV} vehicles pending</span>${pill('Review', 'wait')}</button>
          <button data-act="aTab" data-k="a-disputes">${icon('flag', 18)}<span>${openD} open disputes</span>${pill('Open', 'bad')}</button>
          <button data-act="aTab" data-k="a-commission">${icon('wallet', 18)}<span>1 owner wallet below minimum</span>${pill('Notify', 'info')}</button>
        </div></section>
    </div>
    <section class="a-card"><h3>Live activity</h3><ul class="feed">
      ${S.notifs.admin.slice(0, 4).map((n) => `<li><span class="fd-dot live"></span><b>${esc(n.title)}</b><span>${esc(n.body)}</span><time>${n.t}</time></li>`).join('')}
      ${b ? `<li><span class="fd-dot"></span><b>${b.id} · ${STATUS[b.status].label}</b><span>${carName(carById(b.carId))} · Hamza T. → ${ownerOf(carById(b.carId)).name}</span><time>now</time></li>` : ''}
      <li><span class="fd-dot"></span><b>GR-10280 · Trip active</b><span>Hyundai Tucson · Karachi</span><time>9:12 AM</time></li>
      <li><span class="fd-dot"></span><b>Owner top-up · Rs. 5,000</b><span>Imran Qureshi · JazzCash</span><time>8:40 AM</time></li>
      <li><span class="fd-dot"></span><b>KYC approved</b><span>Mehak Z. · Lahore</span><time>8:05 AM</time></li>
    </ul></section>`;
  },
  'a-users'() {
    const all = adminKyc();
    const t = subTabs('users', [['pending', 'Verification requests', all.filter((u) => u.status === 'pending').length], ['verified', 'Verified', all.filter((u) => u.status === 'verified').length], ['suspended', 'Suspended', all.filter((u) => u.status === 'suspended').length]]);
    const list = all.filter((u) => u.status === t.cur);
    return `${t.html}<div class="a-note">${icon('lock', 15)} Document images are visible to verification staff only. Every view is logged.</div>
    <div class="kyc-list">${list.length ? list.map((u) => `<article class="kyc">
      <div class="kyc-head"><div><b>${u.name}</b><small>${u.id} · ${u.role} · ${u.city} · ${u.submitted}</small></div>${pill(u.status, STATUS_CLS[u.status])}</div>
      <div class="kyc-docs"><div class="doc-thumb">${icon('file', 20)}<small>CNIC front</small></div><div class="doc-thumb">${icon('file', 20)}<small>CNIC back</small></div><div class="doc-thumb">${icon('user', 20)}<small>Selfie</small></div><div class="doc-thumb">${icon('file', 20)}<small>Licence</small></div></div>
      <div class="kyc-checks">${[['NADRA CNIC', u.checks.cnic], ['Licence', u.checks.licence], [`Face match ${Math.round(u.checks.face * 100)}%`, u.checks.face >= 0.9], ['Phone OTP', u.checks.phone]].map(([l, ok]) => `<span class="${ok ? 'ok' : 'bad'}">${icon(ok ? 'check' : 'x', 13)}${l}</span>`).join('')}</div>
      ${u.flag ? `<p class="kyc-flag">${icon('alert', 14)} ${u.flag}</p>` : ''}
      <div class="kyc-actions">${u.status === 'pending' ? `<button class="btn btn-ghost btn-sm" data-act="aKyc" data-id="${u.id}" data-s="rejected">Reject</button><button class="btn btn-success btn-sm" data-act="aKyc" data-id="${u.id}" data-s="verified">Approve</button>`
        : u.status === 'verified' ? `<button class="btn btn-ghost btn-sm" data-act="aKyc" data-id="${u.id}" data-s="suspended">Suspend</button>` : `<button class="btn btn-ghost btn-sm" data-act="aKyc" data-id="${u.id}" data-s="verified">Reinstate</button>`}</div>
    </article>`).join('') : emptyState('users', 'Nothing here', 'No users in this list right now.')}</div>`;
  },
  'a-vehicles'() {
    const all = adminVehicles();
    const t = subTabs('veh', [['pending', 'Pending', all.filter((v) => v.status === 'pending').length], ['verified', 'Verified', all.filter((v) => v.status === 'verified').length], ['rejected', 'Rejected', all.filter((v) => v.status === 'rejected').length]]);
    const list = all.filter((v) => v.status === t.cur);
    return `${t.html}<div class="a-table-wrap"><table class="a-table"><thead><tr><th>Vehicle</th><th>Owner</th><th>Plate</th><th>Documents</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.length ? list.map((v) => `<tr class="${v.live ? 'live-row' : ''}"><td><b>${v.car}</b>${v.live ? ' <span class="new-tag">Demo</span>' : ''}${v.flag ? `<small class="kyc-flag">${v.flag}</small>` : ''}</td><td>${v.owner}<small>${v.city}</small></td><td class="mono">${v.plate}</td><td>${v.docs}</td><td>${v.submitted}</td><td>${pill(v.status, STATUS_CLS[v.status])}</td>
        <td class="t-act">${v.status === 'pending' ? `<button class="btn btn-ghost btn-sm" data-act="aVeh" data-id="${v.id}" data-s="rejected">Reject</button><button class="btn btn-success btn-sm" data-act="aVeh" data-id="${v.id}" data-s="verified">Verify</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="7" class="t-empty">No vehicles in this list.</td></tr>'}
    </tbody></table></div>`;
  },
  'a-bookings'() {
    const all = adminBookings();
    const tabs = ['upcoming', 'active', 'completed', 'cancelled', 'disputed'];
    const t = subTabs('book', tabs.map((k) => [k, k[0].toUpperCase() + k.slice(1), all.filter((b) => b.status === k).length]));
    const list = all.filter((b) => b.status === t.cur);
    return `${t.html}<div class="a-table-wrap"><table class="a-table"><thead><tr><th>Rental ID</th><th>Car</th><th>Renter</th><th>Owner</th><th>City</th><th>Dates</th><th class="num">Amount</th><th class="num">Commission</th><th>Status</th></tr></thead><tbody>
      ${list.length ? list.map((b) => `<tr class="${b.live ? 'live-row' : ''}"><td class="mono">${b.id}${b.live ? ' <span class="new-tag">Demo</span>' : ''}</td><td>${b.car}</td><td>${b.renter}</td><td>${b.owner}</td><td>${b.city}</td><td>${b.dates}</td><td class="num">${rs(b.amount)}</td><td class="num">${rs(commissionOf(b.amount))}</td><td>${pill(b.status, STATUS_CLS[b.status])}</td></tr>`).join('') : '<tr><td colspan="9" class="t-empty">No bookings in this list.</td></tr>'}
    </tbody></table></div>`;
  },
  'a-commission'() {
    const w = S.wallet;
    const wallets = [{ owner: 'Ahmed Raza', cars: 1 + (S.customCars || []).length, balance: w.balance, pending: upcomingCommission(), live: true, low: w.balance < upcomingCommission() + 1650 }].concat(ADMIN.wallets);
    const t = subTabs('comm', [['wallets', 'Owner wallets'], ['tx', 'Transactions'], ['platform', 'Platform commission']]);
    let body = '';
    if (t.cur === 'wallets') body = `<div class="a-table-wrap"><table class="a-table"><thead><tr><th>Owner</th><th class="num">Cars</th><th class="num">Balance</th><th class="num">Pending commission</th><th>Status</th><th></th></tr></thead><tbody>
      ${wallets.map((x) => `<tr class="${x.live ? 'live-row' : ''}"><td><b>${x.owner}</b>${x.live ? ' <span class="new-tag">Demo</span>' : ''}</td><td class="num">${x.cars}</td><td class="num">${rs(x.balance)}</td><td class="num">${rs(x.pending)}</td><td>${x.low ? pill('Below minimum', 'bad') : pill('Healthy', 'ok')}</td><td class="t-act">${x.low ? `<button class="btn btn-ghost btn-sm" data-act="aRemind" data-o="${x.owner}">Send top-up reminder</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    if (t.cur === 'tx') body = `<div class="a-table-wrap"><table class="a-table"><thead><tr><th>Date</th><th>Owner</th><th>Type</th><th>Reference</th><th class="num">Amount</th></tr></thead><tbody>
      ${w.tx.map((x) => `<tr><td>${x.date}</td><td>Ahmed Raza</td><td>${x.type === 'topup' ? pill('Top up', 'info') : pill('Commission', 'ok')}</td><td>${x.label}</td><td class="num ${x.amount > 0 ? '' : 'neg'}">${x.amount > 0 ? '+' : '−'}${rs(Math.abs(x.amount))}</td></tr>`).join('')}
      <tr><td>29 Sep</td><td>Imran Qureshi</td><td>${pill('Commission', 'ok')}</td><td>Rental commission · GR-10270</td><td class="num neg">−${rs(4200)}</td></tr>
      <tr><td>29 Sep</td><td>Hira Siddiqui</td><td>${pill('Top up', 'info')}</td><td>Top up · Easypaisa</td><td class="num">+${rs(10000)}</td></tr></tbody></table></div>`;
    if (t.cur === 'platform') body = `<div class="kpi-grid three">${[['Commission this month', lakh(ADMIN.revenue[5].v * 10000000 * COMMISSION_RATE)], ['Commission all time', lakh(ADMIN.kpis.commission)], ['Owner wallet float', lakh(3120000)]].map(([l, v]) => `<div class="kpi"><small>${l}</small><b>${v}</b></div>`).join('')}</div>
      <section class="a-card"><h3>Commission by month (Rs. lakh)</h3>${colChart(ADMIN.revenue.map((r) => ({ m: r.m, v: +(r.v * 10).toFixed(1) })), 'm', (v, tick) => tick ? v.toFixed(0) : v.toFixed(1) + 'L', 'Commission by month in lakh rupees')}</section>`;
    return `${t.html}${body}`;
  },
  'a-disputes'() {
    const all = adminDisputes();
    const cats = ['All', 'Damage', 'Fraud', 'Payment', 'Cancellation', 'Accident'];
    const t = subTabs('disp', cats.map((c) => [c, c, c === 'All' ? all.filter((d) => d.status !== 'resolved').length : all.filter((d) => d.type === c && d.status !== 'resolved').length]));
    const list = t.cur === 'All' ? all : all.filter((d) => d.type === t.cur);
    return `${t.html}<div class="disp-list">${list.length ? list.map((d) => `<article class="disp ${d.live ? 'live' : ''}">
      <div class="disp-top"><span class="disp-type">${d.type}</span>${pill(d.priority, d.priority === 'High' ? 'bad' : d.priority === 'Medium' ? 'wait' : 'mute')}${pill(d.status, STATUS_CLS[d.status])}${d.live ? '<span class="new-tag">Demo</span>' : ''}</div>
      <b>${esc(d.title)}</b><small>${d.id} · ${d.booking} · ${d.parties} · opened ${d.opened}</small>
      ${d.live ? `<div class="disp-evidence">${icon('camera', 14)} ${d.photos} photo${d.photos === 1 ? '' : 's'} · handover before/after attached${d.voice ? ` · ${icon('mic', 14)} voice note` : ''} · 📍 phone location at time of report</div>` : ''}
      <div class="kyc-actions">${d.status !== 'resolved' ? `<button class="btn btn-ghost btn-sm" data-act="aDisp" data-id="${d.id}" data-s="investigating">Investigate</button><button class="btn btn-success btn-sm" data-act="aDisp" data-id="${d.id}" data-s="resolved">Mark resolved</button>` : '<span class="muted">Closed</span>'}</div></article>`).join('') : emptyState('flag', 'No disputes', 'Nothing in this category.')}</div>`;
  },
  'a-analytics'() {
    return `<div class="kpi-grid four">${[['Repeat renters', '38%', 'rented 2+ times'], ['Avg. rental length', '2.7 days', 'last 30 days'], ['Owner acceptance', '86%', 'of requests'], ['Handover completion', '99.2%', 'digital records']].map(([l, v, s]) => `<div class="kpi"><small>${l}</small><b>${v}</b><em>${s}</em></div>`).join('')}</div>
    <div class="a-cols">
      <section class="a-card"><h3>Bookings per week</h3>${colChart(ADMIN.weekly, 'w', (v) => Math.round(v), 'Weekly bookings')}</section>
      <section class="a-card"><h3>Rental value per month (Rs. crore)</h3>${colChart(ADMIN.revenue, 'm', (v, tick) => tick ? v.toFixed(1) : v.toFixed(2) + ' Cr', 'Rental value per month in crore rupees')}</section>
    </div>
    <div class="a-cols">
      <section class="a-card"><h3>Top cities · bookings</h3>${barsH(ADMIN.cities, 'c')}</section>
      <section class="a-card"><h3>Popular cars · bookings</h3>${barsH(ADMIN.popular, 'car')}</section>
    </div>`;
  },
};
Actions.aKyc = (el) => { S.admin.kyc[el.dataset.id] = el.dataset.s; refresh(); toast(`User ${el.dataset.s}`); };
Actions.aVeh = (el) => {
  if (el.dataset.id === 'V-NEW') {
    if (el.dataset.s === 'verified') approveDraft(); else { S.draft.status = 'draft'; S.draft.step = 5; notify('owner', 'Listing needs changes', 'Please re-upload clearer documents', 'o-add', 'alert'); }
  } else S.admin.veh[el.dataset.id] = el.dataset.s;
  refresh(); toast(el.dataset.s === 'verified' ? 'Vehicle verified. Owner notified.' : 'Vehicle rejected. Owner notified.');
};
Actions.aDisp = (el) => { S.admin.disputes[el.dataset.id] = el.dataset.s; refresh(); toast(`Dispute ${el.dataset.s}`); };
Actions.aRemind = (el) => toast(`Top-up reminder sent to ${el.dataset.o}`);

function renderAdmin() {
  const tab = S.admin.tab || 'a-dash';
  const title = ADMIN_TABS.find((t) => t[0] === tab)[1];
  S.notifs.admin.forEach((n) => { n.read = true; });
  $('#admin-root').innerHTML = `<div class="admin">
    <aside class="a-side">
      <div class="a-brand">${logoFull(true)}<span class="a-tag">Admin</span></div>
      <nav class="a-nav">${ADMIN_TABS.map(([k, l, ic]) => `<button class="${tab === k ? 'on' : ''}" data-act="aTab" data-k="${k}">${icon(ic, 18)}<span>${l}</span></button>`).join('')}</nav>
      <p class="a-foot">Pakistan · all cities<br>Signed in as ops@gaari.pk</p>
    </aside>
    <main class="a-main">
      <header class="a-head"><div><small>GAARI operations</small><h1>${title}</h1></div><div class="a-head-r"><span class="a-date">${icon('cal', 16)} Wed, 30 Sep 2026</span></div></header>
      ${ADMIN_VIEWS[tab]()}
    </main></div>`;
  bindChartTips($('#admin-root'));
}
