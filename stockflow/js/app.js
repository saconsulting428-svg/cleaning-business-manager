/* ==========================================================================
   StockFlow — Application
   Navigation, pages, forms and user interactions.
   ========================================================================== */
(function () {
  'use strict';

  var SF = window.SF;
  var U = SF.util;
  var ui = SF.ui;
  var icon = ui.icon;
  var esc = U.esc;
  var money = SF.money;

  /* ------------------------------------------------------------------------
     Navigation & view state
     ------------------------------------------------------------------------ */
  var NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'products', label: 'Products', icon: 'products' },
    { id: 'inventory', label: 'Inventory', icon: 'inventory' },
    { id: 'sales', label: 'Sales', icon: 'sales' },
    { id: 'customers', label: 'Customers', icon: 'customers' },
    { id: 'suppliers', label: 'Suppliers', icon: 'suppliers' },
    { id: 'purchases', label: 'Purchases', icon: 'purchases' },
    { id: 'reports', label: 'Reports', icon: 'reports' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  var PAGE_SIZE = 50;
  var state = {
    page: 'dashboard',
    products: { q: '', category: '', stock: '', status: '', sort: 'name', dir: 'asc' },
    inventory: { tab: 'levels', q: '', stock: '', sort: 'name', dir: 'asc', hq: '', htype: '', hproduct: '', hlimit: PAGE_SIZE },
    sales: { q: '', status: '', method: '', period: 'all', sort: 'date', dir: 'desc', limit: PAGE_SIZE },
    customers: { q: '', city: '', balance: '', sort: 'name', dir: 'asc' },
    suppliers: { q: '', sort: 'name', dir: 'asc' },
    purchases: { q: '', status: '', supplier: '', sort: 'date', dir: 'desc', limit: PAGE_SIZE },
    reports: { period: 'month' }
  };

  var PERIODS = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'last3', label: 'Last 3 Months' },
    { value: 'year', label: 'This Year' }
  ];

  function D() { return SF.data(); }

  /* ------------------------------------------------------------------------
     Date ranges & buckets
     ------------------------------------------------------------------------ */
  function range(period) {
    var t = U.todayISO(), d = U.parseISO(t);
    switch (period) {
      case 'today': return { from: t, to: t, unit: 'day' };
      case 'week': return { from: U.addDays(t, -((d.getDay() + 6) % 7)), to: t, unit: 'day' };
      case 'month': return { from: t.slice(0, 8) + '01', to: t, unit: 'day' };
      case 'lastMonth':
        return { from: U.isoFromDate(new Date(d.getFullYear(), d.getMonth() - 1, 1)), to: U.isoFromDate(new Date(d.getFullYear(), d.getMonth(), 0)), unit: 'day' };
      case 'last3': return { from: U.addDays(t, -90), to: t, unit: 'week' };
      case 'year': return { from: d.getFullYear() + '-01-01', to: t, unit: 'month' };
      default: return { from: '0000-01-01', to: '9999-12-31', unit: 'month' };
    }
  }
  function periodLabel(v) {
    for (var i = 0; i < PERIODS.length; i++) if (PERIODS[i].value === v) return PERIODS[i].label;
    return 'All Time';
  }
  function shortDate(iso) {
    var d = U.parseISO(iso);
    return SF.MONTHS[d.getMonth()] + ' ' + d.getDate();
  }
  function buckets(from, to, unit) {
    var out = [];
    if (unit === 'month') {
      var d = U.parseISO(from);
      var cur = new Date(d.getFullYear(), d.getMonth(), 1);
      var end = U.parseISO(to);
      while (cur <= end) {
        var f = U.isoFromDate(cur);
        var l = U.isoFromDate(new Date(cur.getFullYear(), cur.getMonth() + 1, 0));
        out.push({ from: f, to: l, label: SF.MONTHS[cur.getMonth()], tip: SF.MONTHS[cur.getMonth()] + ' ' + cur.getFullYear() });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    } else {
      var step = unit === 'week' ? 7 : 1;
      for (var s = from; s <= to; s = U.addDays(s, step)) {
        var e = U.addDays(s, step - 1);
        if (e > to) e = to;
        out.push({ from: s, to: e, label: shortDate(s), tip: step === 1 ? SF.date(s) : SF.date(s) + ' – ' + SF.date(e) });
      }
    }
    return out;
  }
  function bucketSeries(sales, bks) {
    var rev = bks.map(function () { return 0; }), prof = rev.slice(), cnt = rev.slice();
    sales.forEach(function (s) {
      for (var i = 0; i < bks.length; i++) {
        if (s.date >= bks[i].from && s.date <= bks[i].to) { rev[i] += s.net; prof[i] += s.profit; cnt[i]++; break; }
      }
    });
    return { revenue: rev.map(U.round2), profit: prof.map(U.round2), count: cnt };
  }
  var compactMoney = function (v) { return money(v, { compact: true }); };

  /* ------------------------------------------------------------------------
     Shell rendering
     ------------------------------------------------------------------------ */
  function renderNav() {
    var low = D().products.filter(function (p) { return p.status === 'Active' && SF.stockStatus(p) !== 'In Stock'; }).length;
    document.getElementById('nav').innerHTML = '<div class="nav-label">Menu</div>' + NAV.map(function (n) {
      var badge = n.id === 'inventory' && low ? '<span class="nav-badge" title="Products low or out of stock">' + low + '</span>' : '';
      return '<a href="#/' + n.id + '" data-nav="' + n.id + '" class="' + (state.page === n.id ? 'active' : '') + '">' + icon(n.icon) + '<span>' + n.label + '</span>' + badge + '</a>';
    }).join('');
    document.getElementById('sidebar-biz').textContent = D().settings.businessName || 'StockFlow';
  }

  function pageHead(title, sub, actions) {
    return '<div class="page-head"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' +
      (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
  }
  function btn(action, label, cls, ic, extra) {
    return '<button type="button" class="btn ' + (cls || 'btn-primary') + '" data-action="' + action + '"' + (extra || '') + '>' + (ic ? icon(ic) : '') + '<span>' + esc(label) + '</span></button>';
  }
  function iconBtn(action, id, ic, title, danger) {
    return '<button type="button" class="icon-btn' + (danger ? ' danger' : '') + '" data-action="' + action + '" data-id="' + esc(id) + '" title="' + esc(title) + '" aria-label="' + esc(title) + '">' + icon(ic) + '</button>';
  }
  function kpi(label, value, foot, ic, tone, action) {
    return '<div class="kpi"' + (action ? ' data-action="goto" data-page="' + action + '" style="cursor:pointer"' : '') + '><div class="kpi-top"><span class="kpi-label">' + esc(label) + '</span><span class="kpi-icon ' + tone + '">' + icon(ic) + '</span></div>' +
      '<div class="kpi-value" title="' + esc(value) + '">' + esc(value) + '</div><div class="kpi-foot">' + foot + '</div></div>';
  }
  function searchBox(bind, placeholder, value) {
    return '<div class="search">' + icon('search') + '<input class="input" type="search" data-bind="' + bind + '" placeholder="' + esc(placeholder) + '" value="' + esc(value) + '" aria-label="' + esc(placeholder) + '"></div>';
  }
  function filterSelect(bind, options, value, placeholder) {
    return '<select class="input" data-bind="' + bind + '" aria-label="' + esc(placeholder) + '">' + ui.options(options, value, placeholder) + '</select>';
  }
  function moreButton(key, shown, total) {
    if (total <= shown) return '';
    return '<div style="padding:14px;text-align:center;border-top:1px solid var(--border)"><button type="button" class="btn btn-outline btn-sm" data-action="more" data-key="' + key + '">Show more (' + (total - shown) + ' remaining)</button></div>';
  }
  function sortList(list, st, getters) {
    var g = getters[st.sort] || getters[Object.keys(getters)[0]];
    var dir = st.dir === 'asc' ? 1 : -1;
    return list.slice().sort(function (a, b) {
      var x = g(a), y = g(b);
      if (typeof x === 'string') { x = x.toLowerCase(); y = String(y).toLowerCase(); }
      return x < y ? -dir : x > y ? dir : 0;
    });
  }
  function matches(q, fields) {
    if (!q) return true;
    q = q.toLowerCase();
    return fields.some(function (f) { return String(f || '').toLowerCase().indexOf(q) >= 0; });
  }
  function itemsCount(doc) {
    var u = doc.items.reduce(function (a, it) { return a + it.qty; }, 0);
    return doc.items.length + (doc.items.length === 1 ? ' item' : ' items') + ' · ' + u + ' units';
  }

  /* ------------------------------------------------------------------------
     DASHBOARD
     ------------------------------------------------------------------------ */
  var Dashboard = {
    title: 'Dashboard',
    render: function () {
      var d = D(), today = U.todayISO();
      var m = range('month'), lm = range('lastMonth');
      var todaySales = SF.summarize(SF.salesInRange(today, today));
      var month = SF.summarize(SF.salesInRange(m.from, m.to));
      var last = SF.summarize(SF.salesInRange(lm.from, lm.to));
      var inv = SF.inventoryValue();
      var active = d.products.filter(function (p) { return p.status === 'Active'; });
      var low = d.products.filter(function (p) { return SF.stockStatus(p) === 'Low Stock'; });
      var out = d.products.filter(function (p) { return SF.stockStatus(p) === 'Out of Stock'; });
      var change = last.revenue > 0 ? ((month.revenue - last.revenue) / last.revenue) * 100 : null;
      var changeHtml = change === null ? 'Net sales, excl. tax' : '<span class="' + (change >= 0 ? 'text-success' : 'text-danger') + ' fw-600">' + (change >= 0 ? '▲ ' : '▼ ') + Math.abs(change).toFixed(1) + '%</span> vs last month';

      var html = pageHead('Welcome back', 'Here is what is happening with ' + (d.settings.businessName || 'your business') + ' today.',
        btn('new-sale', 'New Sale', 'btn-primary', 'plus'));

      html += '<div class="kpi-grid">' +
        kpi('Total Products', SF.number(d.products.length), active.length + ' active', 'products', 'tone-blue', 'products') +
        kpi('Stock Value', money(inv.cost), 'Retail value ' + esc(money(inv.retail)), 'box', 'tone-teal', 'inventory') +
        kpi("Today's Sales", money(todaySales.total), todaySales.count + (todaySales.count === 1 ? ' order' : ' orders') + ' today', 'receipt', 'tone-violet', 'sales') +
        kpi('Monthly Revenue', money(month.revenue), changeHtml, 'dollar', 'tone-green', 'reports') +
        kpi('Monthly Profit', money(month.profit), 'Margin ' + SF.percent(month.revenue ? (month.profit / month.revenue) * 100 : 0), 'trending', 'tone-green', 'reports') +
        kpi('Low Stock Items', SF.number(low.length + out.length), out.length + ' out of stock', 'alert', low.length + out.length ? 'tone-red' : 'tone-green', 'inventory') +
        '</div>';

      html += '<div class="quick-actions">' +
        quick('add-product', 'Add Product', 'Create a new item', 'products', 'tone-blue') +
        quick('new-sale', 'New Sale', 'Record a customer order', 'sales', 'tone-green') +
        quick('add-customer', 'Add Customer', 'Save customer details', 'userPlus', 'tone-violet') +
        quick('add-purchase', 'Add Purchase', 'Receive supplier stock', 'purchases', 'tone-teal') +
        '</div>';

      html += '<div class="grid-3-2">' +
        '<div class="card"><div class="card-head"><div><h3>Sales Overview</h3><div class="card-sub">Daily net sales · last 30 days</div></div></div><div class="card-body"><div id="dash-sales-chart"></div></div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Revenue</h3><div class="card-sub">Revenue vs. profit · last 6 months</div></div>' + ui.legend([{ name: 'Revenue', color: ui.SERIES[0] }, { name: 'Profit', color: ui.SERIES[1] }]) + '</div><div class="card-body"><div id="dash-rev-chart"></div></div></div>' +
        '</div>';

      // Recent sales + low stock
      var recent = d.sales.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.createdAt < b.createdAt ? 1 : -1); }).slice(0, 6);
      var recentHtml = recent.length ? '<div class="table-wrap"><table class="table responsive compact"><thead><tr><th>Sale</th><th>Customer</th><th>Date</th><th class="num">Total</th><th>Status</th></tr></thead><tbody>' +
        recent.map(function (s) {
          return '<tr><td class="td-primary" data-label="Sale"><button class="link" data-action="view-sale" data-id="' + s.id + '">' + esc(s.number) + '</button></td>' +
            '<td data-label="Customer">' + esc(SF.customerName(s)) + '</td><td data-label="Date" class="nowrap">' + esc(SF.date(s.date)) + '</td>' +
            '<td data-label="Total" class="num fw-600">' + esc(money(s.total)) + '</td><td data-label="Status">' + ui.paymentBadge(s.paymentStatus) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : ui.empty('sales', 'No sales yet', 'Record your first sale to see it here.', btn('new-sale', 'New Sale', 'btn-primary btn-sm', 'plus'), true);

      var lowList = d.products.filter(function (p) { return p.status === 'Active' && SF.stockStatus(p) !== 'In Stock'; })
        .sort(function (a, b) { return a.stock - b.stock; }).slice(0, 6);
      var lowHtml = lowList.length ? '<ul class="list">' + lowList.map(function (p) {
        return '<li>' + ui.avatar(p.name) + '<div class="grow"><div class="cell-main"><button class="link" data-action="view-product" data-id="' + p.id + '">' + esc(p.name) + '</button></div><div class="cell-sub">' + esc(p.sku) + ' · Min ' + p.minStock + ' ' + esc(p.unit) + '</div></div>' +
          '<div class="end"><div class="fw-600 ' + (p.stock <= 0 ? 'text-danger' : 'text-warning') + '">' + p.stock + ' ' + esc(p.unit) + '</div>' +
          '<button class="link" style="font-size:12px" data-action="stock-in" data-id="' + p.id + '">Restock</button></div></li>';
      }).join('') + '</ul>' : ui.empty('check', 'All stocked up', 'Every active product is above its minimum stock level.', '', true);

      html += '<div class="grid-3-2">' +
        '<div class="card"><div class="card-head"><h3>Recent Sales</h3><button class="btn btn-ghost btn-sm" data-action="goto" data-page="sales">View all</button></div><div class="card-body flush">' + recentHtml + '</div></div>' +
        '<div class="card"><div class="card-head"><h3>Low Stock Products</h3><button class="btn btn-ghost btn-sm" data-action="goto" data-page="inventory">Inventory</button></div><div class="card-body flush">' + lowHtml + '</div></div>' +
        '</div>';

      // Top products + recent customers
      var top = SF.productSalesStats(SF.salesInRange(U.addDays(today, -29), today)).sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);
      var maxQ = top.length ? top[0].qty : 1;
      var topHtml = top.length ? '<ul class="list">' + top.map(function (p, i) {
        return '<li><span class="avatar tone-blue">#' + (i + 1) + '</span><div class="grow"><div class="cell-main">' + esc(p.name) + '</div>' +
          '<div class="rank-bar"><span style="width:' + Math.max(4, (p.qty / maxQ) * 100) + '%"></span></div></div>' +
          '<div class="end"><div class="fw-600">' + p.qty + ' sold</div><div class="cell-sub">' + esc(money(p.revenue)) + '</div></div></li>';
      }).join('') + '</ul>' : ui.empty('trending', 'No sales in the last 30 days', 'Top sellers will appear once you record sales.', '', true);

      var custMap = {};
      d.sales.forEach(function (s) {
        if (!s.customerId || !SF.customer(s.customerId)) return;
        var c = custMap[s.customerId] || (custMap[s.customerId] = { id: s.customerId, last: '', total: 0, count: 0 });
        if (s.date > c.last) c.last = s.date;
        c.total += s.total; c.count++;
      });
      var custs = Object.keys(custMap).map(function (k) { return custMap[k]; });
      d.customers.forEach(function (c) { if (!custMap[c.id]) custs.push({ id: c.id, last: '', total: 0, count: 0, created: c.createdAt }); });
      custs.sort(function (a, b) { return (b.last || b.created || '') > (a.last || a.created || '') ? 1 : -1; });
      custs = custs.slice(0, 5);
      var custHtml = custs.length ? '<ul class="list">' + custs.map(function (c) {
        var cu = SF.customer(c.id);
        return '<li>' + ui.avatar(cu.name, true) + '<div class="grow"><div class="cell-main"><button class="link" data-action="view-customer" data-id="' + cu.id + '">' + esc(cu.name) + '</button></div><div class="cell-sub">' +
          (c.last ? 'Last order ' + esc(SF.date(c.last)) : 'New customer') + '</div></div><div class="end"><div class="fw-600">' + esc(money(c.total)) + '</div><div class="cell-sub">' + c.count + ' orders</div></div></li>';
      }).join('') + '</ul>' : ui.empty('customers', 'No customers yet', 'Add customers to track their purchases.', btn('add-customer', 'Add Customer', 'btn-primary btn-sm', 'plus'), true);

      html += '<div class="grid-2">' +
        '<div class="card"><div class="card-head"><div><h3>Top Selling Products</h3><div class="card-sub">By units · last 30 days</div></div><button class="btn btn-ghost btn-sm" data-action="goto" data-page="reports">Reports</button></div><div class="card-body flush">' + topHtml + '</div></div>' +
        '<div class="card"><div class="card-head"><h3>Recent Customers</h3><button class="btn btn-ghost btn-sm" data-action="goto" data-page="customers">View all</button></div><div class="card-body flush">' + custHtml + '</div></div>' +
        '</div>';
      return html;
    },
    after: function () {
      var today = U.todayISO();
      var bk = buckets(U.addDays(today, -29), today, 'day');
      var ser = bucketSeries(SF.salesInRange(bk[0].from, today), bk);
      ui.chart(document.getElementById('dash-sales-chart'), 'bar', {
        labels: bk.map(function (b) { return b.label; }), tipLabels: bk.map(function (b) { return b.tip; }),
        series: [{ name: 'Net sales', color: ui.SERIES[0], values: ser.revenue }],
        format: money, axisFormat: compactMoney, height: 250
      });
      var d = U.parseISO(today);
      var from = U.isoFromDate(new Date(d.getFullYear(), d.getMonth() - 5, 1));
      var mb = buckets(from, today, 'month');
      var ms = bucketSeries(SF.salesInRange(from, today), mb);
      ui.chart(document.getElementById('dash-rev-chart'), 'bar', {
        labels: mb.map(function (b) { return b.label; }), tipLabels: mb.map(function (b) { return b.tip; }),
        series: [{ name: 'Revenue', color: ui.SERIES[0], values: ms.revenue }, { name: 'Profit', color: ui.SERIES[1], values: ms.profit }],
        format: money, axisFormat: compactMoney, height: 250
      });
    }
  };
  function quick(action, title, sub, ic, tone) {
    return '<button type="button" class="quick-action" data-action="' + action + '"><span class="kpi-icon ' + tone + '">' + icon(ic) + '</span><span>+ ' + esc(title) + '<small>' + esc(sub) + '</small></span></button>';
  }

  /* ------------------------------------------------------------------------
     PRODUCTS
     ------------------------------------------------------------------------ */
  var Products = {
    title: 'Products',
    render: function () {
      var st = state.products;
      var html = pageHead('Products', 'Manage your product catalog, pricing and stock levels.',
        btn('export-csv', 'Export CSV', 'btn-outline', 'download', ' data-kind="products"') + btn('add-product', 'Add Product', 'btn-primary', 'plus'));
      if (!D().products.length) {
        return html + '<div class="card">' + ui.empty('products', 'No products yet', 'Add your first product to start tracking inventory and recording sales.', btn('add-product', 'Add Product', 'btn-primary', 'plus')) + '</div>';
      }
      html += '<div class="card"><div class="toolbar">' +
        searchBox('products.q', 'Search name or SKU…', st.q) +
        filterSelect('products.category', SF.categories(), st.category, 'All categories') +
        filterSelect('products.stock', ['In Stock', 'Low Stock', 'Out of Stock'], st.stock, 'All stock levels') +
        filterSelect('products.status', ['Active', 'Inactive'], st.status, 'All statuses') +
        '<span class="toolbar-spacer"></span><span class="result-count" id="table-count"></span></div>' +
        '<div id="table-host"></div></div>';
      return html;
    },
    table: function () {
      var st = state.products;
      var list = D().products.filter(function (p) {
        return matches(st.q, [p.name, p.sku, p.description, p.category]) &&
          (!st.category || p.category === st.category) &&
          (!st.stock || SF.stockStatus(p) === st.stock) &&
          (!st.status || p.status === st.status);
      });
      list = sortList(list, st, {
        name: function (p) { return p.name; }, sku: function (p) { return p.sku; }, category: function (p) { return p.category; },
        cost: function (p) { return p.cost; }, price: function (p) { return p.price; }, stock: function (p) { return p.stock; },
        status: function (p) { return ['Out of Stock', 'Low Stock', 'In Stock'].indexOf(SF.stockStatus(p)); }
      });
      setCount(list.length, D().products.length, 'products');
      if (!list.length) return filteredEmpty();
      return '<div class="table-wrap"><table class="table responsive" data-table="products"><thead><tr>' +
        ui.sortTh('Product', 'name', st) + ui.sortTh('SKU', 'sku', st) + ui.sortTh('Category', 'category', st) +
        ui.sortTh('Cost', 'cost', st, 'num') + ui.sortTh('Price', 'price', st, 'num') + ui.sortTh('Stock', 'stock', st, 'num') +
        ui.sortTh('Stock Status', 'status', st) + '<th class="num">Actions</th></tr></thead><tbody>' +
        list.map(function (p) {
          return '<tr><td class="td-primary" data-label="Product"><div class="cell-product">' + ui.avatar(p.name) + '<div style="min-width:0"><div class="cell-main"><button class="link" data-action="view-product" data-id="' + p.id + '">' + esc(p.name) + '</button></div>' +
            '<div class="cell-sub">' + (p.status === 'Inactive' ? ui.badge('Inactive', 'muted', true) + ' ' : '') + 'Margin ' + SF.percent(SF.margin(p.price, p.cost)) + '</div></div></div></td>' +
            '<td data-label="SKU" class="nowrap">' + esc(p.sku) + '</td><td data-label="Category">' + esc(p.category) + '</td>' +
            '<td data-label="Cost" class="num">' + esc(money(p.cost)) + '</td><td data-label="Price" class="num fw-600">' + esc(money(p.price)) + '</td>' +
            '<td data-label="Stock" class="num">' + p.stock + ' <span class="muted">' + esc(p.unit) + '</span></td>' +
            '<td data-label="Stock Status">' + ui.stockBadge(p) + '</td>' +
            '<td class="td-actions"><div class="row-actions">' + iconBtn('view-product', p.id, 'eye', 'View details') + iconBtn('edit-product', p.id, 'edit', 'Edit product') + iconBtn('delete-product', p.id, 'trash', 'Delete product', true) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
  };

  function setCount(shown, total, noun) {
    var el = document.getElementById('table-count');
    if (el) el.textContent = shown === total ? total + ' ' + noun : shown + ' of ' + total + ' ' + noun;
  }
  function filteredEmpty() {
    return ui.empty('search', 'No matching records', 'Try a different search term or clear the filters.', '<button class="btn btn-outline btn-sm" data-action="clear-filters">Clear filters</button>');
  }

  function productForm(product) {
    var editing = !!product;
    var p = product || { name: '', sku: '', category: '', supplierId: '', cost: '', price: '', stock: 0, minStock: 5, unit: 'pcs', status: 'Active', description: '' };
    var units = SF.UNITS.slice();
    if (p.unit && units.indexOf(p.unit) < 0) units.push(p.unit);
    var suppliers = D().suppliers.slice().sort(byName).map(function (s) { return { value: s.id, label: s.name }; });
    var body = '<form id="product-form" novalidate><div class="form-grid">' +
      ui.field({ name: 'name', label: 'Product Name', required: true, value: p.name, span: 2, placeholder: 'e.g. Stainless Steel Water Bottle' }) +
      ui.field({ name: 'sku', label: 'SKU', required: true, control: '<div class="input-group"><input class="input" id="f_sku" name="sku" required value="' + esc(p.sku) + '" placeholder="e.g. HOME-2001" style="text-transform:uppercase"><button type="button" class="btn btn-outline" id="gen-sku" style="border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px">Generate</button></div>' }) +
      ui.field({ name: 'category', label: 'Category', required: true, value: p.category, attrs: 'list="cat-list" autocomplete="off"', placeholder: 'Choose or type a category' }) +
      ui.field({ name: 'supplierId', label: 'Supplier', type: 'select', options: ui.options(suppliers, p.supplierId, 'No supplier') }) +
      ui.field({ name: 'unit', label: 'Unit', type: 'select', options: ui.options(units, p.unit) }) +
      ui.field({ name: 'cost', label: 'Cost Price (' + SF.currencySymbol() + ')', required: true, type: 'number', value: p.cost, attrs: 'min="0" step="0.01" inputmode="decimal"', placeholder: '0.00' }) +
      ui.field({ name: 'price', label: 'Selling Price (' + SF.currencySymbol() + ')', required: true, type: 'number', value: p.price, attrs: 'min="0" step="0.01" inputmode="decimal"', placeholder: '0.00' }) +
      ui.field({ name: 'stock', label: editing ? 'Stock Quantity' : 'Opening Stock Quantity', required: true, type: 'number', value: p.stock, attrs: 'min="0" step="1" inputmode="numeric"', hint: editing ? 'Changing this records a stock adjustment in inventory history.' : 'Units you currently have on hand.' }) +
      ui.field({ name: 'minStock', label: 'Minimum Stock Level', required: true, type: 'number', value: p.minStock, attrs: 'min="0" step="1" inputmode="numeric"', hint: 'You will be alerted when stock falls to this level.' }) +
      ui.field({ name: 'status', label: 'Status', type: 'select', options: ui.options(['Active', 'Inactive'], p.status), hint: 'Inactive products cannot be added to new sales.' }) +
      '<div class="field"><label>&nbsp;</label><div class="calc-strip" id="prod-calc"></div></div>' +
      ui.field({ name: 'description', label: 'Description', type: 'textarea', value: p.description, span: 2, placeholder: 'Optional notes about this product' }) +
      '</div><datalist id="cat-list">' + SF.categories().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></form>';

    ui.openModal({
      title: editing ? 'Edit Product' : 'Add Product',
      size: 'lg',
      body: body,
      footer: '<button type="button" class="btn btn-outline" data-close>Cancel</button><button type="submit" form="product-form" class="btn btn-primary">' + icon('check') + (editing ? 'Save Changes' : 'Add Product') + '</button>',
      onOpen: function (modal) {
        var form = modal.querySelector('form');
        var calc = function () {
          var cost = U.num(form.cost.value), price = U.num(form.price.value);
          var profit = price - cost;
          modal.querySelector('#prod-calc').innerHTML =
            '<div><span>Profit / unit</span><strong class="' + (profit < 0 ? 'text-danger' : 'text-success') + '">' + esc(money(profit)) + '</strong></div>' +
            '<div><span>Margin</span><strong class="' + (profit < 0 ? 'text-danger' : '') + '">' + SF.percent(SF.margin(price, cost)) + '</strong></div>' +
            '<div><span>Markup</span><strong>' + SF.percent(cost > 0 ? (profit / cost) * 100 : 0) + '</strong></div>';
        };
        form.cost.addEventListener('input', calc);
        form.price.addEventListener('input', calc);
        calc();
        modal.querySelector('#gen-sku').addEventListener('click', function () {
          form.sku.value = SF.suggestSku(form.category.value);
          form.sku.closest('.field').classList.remove('has-error');
        });
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var ok = ui.validate(form, [
            { name: 'cost', test: function (v) { return U.num(v, -1) >= 0; }, message: 'Enter a valid cost (0 or more).' },
            { name: 'price', test: function (v) { return U.num(v, -1) >= 0; }, message: 'Enter a valid price (0 or more).' },
            { name: 'stock', test: function (v) { return /^\d+$/.test(String(v).trim()); }, message: 'Enter a whole number (0 or more).' },
            { name: 'minStock', test: function (v) { return /^\d+$/.test(String(v).trim()); }, message: 'Enter a whole number (0 or more).' }
          ]);
          if (!ok) return;
          var data = ui.formData(form);
          try {
            if (editing) SF.updateProduct(product.id, data); else SF.addProduct(data);
            ui.closeModal(modal);
            ui.toast(editing ? 'Product updated successfully' : 'Product added successfully');
          } catch (err) {
            if (/SKU/.test(err.message)) { var f = form.sku.closest('.field'); f.classList.add('has-error'); f.querySelector('.error').textContent = err.message; form.sku.focus(); }
            ui.toast(err.message, 'error');
          }
        });
      }
    });
  }

  function productDetails(id) {
    var p = SF.product(id);
    if (!p) return;
    var sold = SF.productSalesStats(D().sales.filter(function (s) { return s.items.some(function (it) { return it.productId === id; }); }))
      .filter(function (x) { return x.productId === id; })[0] || { qty: 0, revenue: 0, profit: 0 };
    var hist = txFor(id).slice(0, 8);
    var body = '<div class="detail-title">' + ui.avatar(p.name) + '<div><h3>' + esc(p.name) + '</h3><div class="cell-sub">' + esc(p.sku) + ' · ' + esc(p.category) + '</div></div><div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' + ui.stockBadge(p) + ui.statusBadge(p.status) + '</div></div>' +
      '<div class="detail-grid cols-4">' +
      stat('In Stock', p.stock + ' ' + p.unit) + stat('Stock Value', money(p.stock * p.cost)) + stat('Profit / Unit', money(SF.unitProfit(p))) + stat('Margin', SF.percent(SF.margin(p.price, p.cost))) +
      '</div><dl class="dl">' +
      dl('Cost Price', money(p.cost)) + dl('Selling Price', money(p.price)) + dl('Minimum Stock', p.minStock + ' ' + p.unit) +
      dl('Supplier', p.supplierId && SF.supplier(p.supplierId) ? SF.supplier(p.supplierId).name : '—') +
      dl('Units Sold (all time)', SF.number(sold.qty)) + dl('Sales Revenue', money(sold.revenue)) +
      dl('Description', p.description || '—') + '</dl>' +
      '<div class="section-label">Recent inventory activity</div>' +
      (hist.length ? '<div class="boxed">' + historyTable(hist, true) + '</div>' : '<div class="note-box">No stock movements recorded yet.</div>');
    ui.openModal({
      title: 'Product Details', size: 'lg', body: body,
      footer: '<button class="btn btn-danger-outline left" data-action="delete-product" data-id="' + p.id + '">' + icon('trash') + 'Delete</button>' +
        '<button class="btn btn-outline" data-action="stock-out" data-id="' + p.id + '">' + icon('minus') + 'Stock Out</button>' +
        '<button class="btn btn-outline" data-action="stock-in" data-id="' + p.id + '">' + icon('plus') + 'Stock In</button>' +
        '<button class="btn btn-primary" data-action="edit-product" data-id="' + p.id + '">' + icon('edit') + 'Edit</button>'
    });
  }
  function stat(label, value, cls) {
    return '<div class="stat-box"><span>' + esc(label) + '</span><strong class="' + (cls || '') + '" title="' + esc(value) + '">' + esc(value) + '</strong></div>';
  }
  function dl(label, value) {
    return '<dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd>';
  }
  function byName(a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; }

  function deleteProduct(id) {
    var p = SF.product(id);
    if (!p) return;
    var use = SF.productUsage(id);
    var extra = use.sales || use.purchases ? ' It appears on ' + use.sales + ' sale(s) and ' + use.purchases + ' purchase(s); those records will be kept.' : '';
    ui.confirm({ title: 'Delete product', heading: 'Delete "' + p.name + '"?', message: 'This permanently removes the product from your catalog and inventory.' + extra, confirmText: 'Delete Product' }).then(function (ok) {
      if (!ok) return;
      try { SF.deleteProduct(id); ui.toast('Product deleted successfully'); } catch (e) { ui.toast(e.message, 'error'); }
    });
  }

  /* ------------------------------------------------------------------------
     INVENTORY
     ------------------------------------------------------------------------ */
  function txFor(productId) {
    var list = D().transactions.map(function (t, i) { return { t: t, i: i }; })
      .filter(function (x) { return !productId || x.t.productId === productId; });
    list.sort(function (a, b) { return a.t.date < b.t.date ? 1 : a.t.date > b.t.date ? -1 : b.i - a.i; });
    return list.map(function (x) { return x.t; });
  }
  function historyTable(list, compact) {
    return '<div class="table-wrap"><table class="table responsive' + (compact ? ' compact' : '') + '"><thead><tr><th>Date</th>' + (compact ? '' : '<th>Product</th>') + '<th>Transaction Type</th><th class="num">Quantity</th><th class="num">Previous Stock</th><th class="num">New Stock</th><th>Reason</th></tr></thead><tbody>' +
      list.map(function (t) {
        return '<tr><td class="td-primary nowrap" data-label="Date">' + esc(SF.date(t.date)) + '</td>' +
          (compact ? '' : '<td data-label="Product"><div class="cell-main">' + esc(t.productName) + '</div><div class="cell-sub">' + esc(t.sku) + '</div></td>') +
          '<td data-label="Type">' + ui.txBadge(t.type) + '</td>' +
          '<td data-label="Quantity" class="num fw-600 ' + (t.qty > 0 ? 'text-success' : t.qty < 0 ? 'text-danger' : '') + '">' + (t.qty > 0 ? '+' : '') + t.qty + '</td>' +
          '<td data-label="Previous" class="num">' + t.prev + '</td><td data-label="New Stock" class="num fw-600">' + t.next + '</td>' +
          '<td data-label="Reason"><div>' + esc(t.reason || '—') + '</div>' + (t.notes ? '<div class="cell-sub">' + esc(t.notes) + '</div>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  var TX_TYPES = ['Opening Stock', 'Stock In', 'Stock Out', 'Adjustment', 'Sale', 'Sale Edited', 'Sale Cancelled', 'Purchase', 'Purchase Edited', 'Purchase Cancelled'];

  var Inventory = {
    title: 'Inventory',
    render: function () {
      var d = D(), st = state.inventory;
      var inv = SF.inventoryValue();
      var units = d.products.reduce(function (a, p) { return a + Math.max(0, p.stock); }, 0);
      var low = d.products.filter(function (p) { return SF.stockStatus(p) === 'Low Stock'; }).length;
      var out = d.products.filter(function (p) { return SF.stockStatus(p) === 'Out of Stock'; }).length;
      var html = pageHead('Inventory', 'Track stock levels, record stock movements and review history.',
        btn('stock-in', 'Stock In', 'btn-outline', 'arrowDown') + btn('stock-out', 'Stock Out', 'btn-outline', 'arrowUp') + btn('adjust-stock', 'Adjust Stock', 'btn-primary', 'sliders'));
      html += '<div class="kpi-grid cols-4">' +
        kpi('Total Inventory Items', SF.number(units) + ' units', 'Across ' + d.products.length + ' products', 'box', 'tone-blue') +
        kpi('Total Inventory Value', money(inv.cost), 'At cost · retail ' + esc(money(inv.retail)), 'dollar', 'tone-teal') +
        kpi('Low Stock', SF.number(low), 'At or below minimum level', 'alert', low ? 'tone-amber' : 'tone-green') +
        kpi('Out of Stock', SF.number(out), 'Need restocking now', 'x', out ? 'tone-red' : 'tone-green') +
        '</div>';
      if (!d.products.length) {
        return html + '<div class="card">' + ui.empty('inventory', 'No products in inventory', 'Add products first — their stock levels will appear here.', btn('add-product', 'Add Product', 'btn-primary', 'plus')) + '</div>';
      }
      html += '<div class="card"><div class="tabs">' +
        '<button type="button" data-set="inventory.tab" data-value="levels" class="' + (st.tab === 'levels' ? 'active' : '') + '">Stock Levels</button>' +
        '<button type="button" data-set="inventory.tab" data-value="history" class="' + (st.tab === 'history' ? 'active' : '') + '">Inventory History</button></div>';
      if (st.tab === 'levels') {
        html += '<div class="toolbar">' + searchBox('inventory.q', 'Search products or SKU…', st.q) +
          filterSelect('inventory.stock', ['In Stock', 'Low Stock', 'Out of Stock'], st.stock, 'All stock levels') +
          '<span class="toolbar-spacer"></span><span class="result-count" id="table-count"></span></div>';
      } else {
        var prods = d.products.slice().sort(byName).map(function (p) { return { value: p.id, label: p.name }; });
        html += '<div class="toolbar">' + searchBox('inventory.hq', 'Search history…', st.hq) +
          filterSelect('inventory.hproduct', prods, st.hproduct, 'All products') +
          filterSelect('inventory.htype', TX_TYPES, st.htype, 'All transaction types') +
          '<span class="toolbar-spacer"></span>' + btn('export-csv', 'Export', 'btn-outline btn-sm', 'download', ' data-kind="history"') + '<span class="result-count" id="table-count"></span></div>';
      }
      return html + '<div id="table-host"></div></div>';
    },
    table: function () {
      var st = state.inventory;
      if (st.tab === 'history') {
        var all = txFor(st.hproduct || null).filter(function (t) {
          return (!st.htype || t.type === st.htype) && matches(st.hq, [t.productName, t.sku, t.reason, t.notes, t.ref, t.type]);
        });
        setCount(all.length, D().transactions.length, 'entries');
        if (!all.length) return D().transactions.length ? filteredEmpty() : ui.empty('history', 'No inventory history', 'Stock movements from sales, purchases and adjustments appear here.');
        return historyTable(all.slice(0, st.hlimit)) + moreButton('history', st.hlimit, all.length);
      }
      var list = D().products.filter(function (p) {
        return matches(st.q, [p.name, p.sku, p.category]) && (!st.stock || SF.stockStatus(p) === st.stock);
      });
      list = sortList(list, st, {
        name: function (p) { return p.name; }, sku: function (p) { return p.sku; }, stock: function (p) { return p.stock; },
        min: function (p) { return p.minStock; }, cost: function (p) { return p.stock * p.cost; }, value: function (p) { return p.stock * p.price; },
        status: function (p) { return ['Out of Stock', 'Low Stock', 'In Stock'].indexOf(SF.stockStatus(p)); }
      });
      setCount(list.length, D().products.length, 'products');
      if (!list.length) return filteredEmpty();
      return '<div class="table-wrap"><table class="table responsive" data-table="inventory"><thead><tr>' +
        ui.sortTh('Product', 'name', st) + ui.sortTh('SKU', 'sku', st) + ui.sortTh('Current Stock', 'stock', st, 'num') + ui.sortTh('Minimum Stock', 'min', st, 'num') +
        ui.sortTh('Cost Value', 'cost', st, 'num') + ui.sortTh('Selling Value', 'value', st, 'num') + ui.sortTh('Status', 'status', st) + '<th class="num">Actions</th></tr></thead><tbody>' +
        list.map(function (p) {
          return '<tr><td class="td-primary" data-label="Product"><div class="cell-product">' + ui.avatar(p.name) + '<div style="min-width:0"><div class="cell-main"><button class="link" data-action="view-product" data-id="' + p.id + '">' + esc(p.name) + '</button></div><div class="cell-sub">' + esc(p.category) + '</div></div></div></td>' +
            '<td data-label="SKU" class="nowrap">' + esc(p.sku) + '</td>' +
            '<td data-label="Current Stock" class="num fw-600">' + p.stock + ' <span class="muted">' + esc(p.unit) + '</span></td>' +
            '<td data-label="Minimum Stock" class="num">' + p.minStock + '</td>' +
            '<td data-label="Cost Value" class="num">' + esc(money(Math.max(0, p.stock) * p.cost)) + '</td>' +
            '<td data-label="Selling Value" class="num">' + esc(money(Math.max(0, p.stock) * p.price)) + '</td>' +
            '<td data-label="Status">' + ui.stockBadge(p) + '</td>' +
            '<td class="td-actions"><div class="row-actions">' + iconBtn('stock-in', p.id, 'arrowDown', 'Stock in') + iconBtn('stock-out', p.id, 'arrowUp', 'Stock out') + iconBtn('adjust-stock', p.id, 'sliders', 'Adjust stock') + iconBtn('product-history', p.id, 'history', 'View history') + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
  };

  function stockForm(mode, productId) {
    var prods = D().products.slice().sort(byName);
    if (!prods.length) { ui.toast('Add a product first.', 'error'); return; }
    var titles = { in: 'Stock In', out: 'Stock Out', adjust: 'Adjust Stock' };
    var reasons = mode === 'in' ? SF.STOCK_IN_REASONS : mode === 'out' ? SF.STOCK_OUT_REASONS : ['Stock Count Correction', 'Damaged', 'Found in Count', 'System Correction', 'Other'];
    var opts = prods.map(function (p) { return { value: p.id, label: p.name + ' — ' + p.sku + ' (' + p.stock + ' ' + p.unit + ')' }; });
    var body = '<form id="stock-form" novalidate><div class="form-grid">' +
      ui.field({ name: 'productId', label: 'Product', required: true, type: 'select', options: ui.options(opts, productId || '', 'Select a product…'), span: 2 }) +
      ui.field({ name: 'qty', label: mode === 'adjust' ? 'New Stock Quantity' : 'Quantity', required: true, type: 'number', value: '', attrs: 'min="' + (mode === 'adjust' ? 0 : 1) + '" step="1" inputmode="numeric"', placeholder: mode === 'adjust' ? 'Counted quantity' : 'e.g. 10' }) +
      ui.field({ name: 'date', label: 'Date', required: true, type: 'date', value: U.todayISO() }) +
      ui.field({ name: 'reason', label: 'Reason', required: true, type: 'select', options: ui.options(reasons, reasons[0]), span: 2 }) +
      ui.field({ name: 'notes', label: 'Notes', type: 'textarea', value: '', span: 2, placeholder: 'Optional details (supplier reference, who counted, etc.)' }) +
      '<div class="field span-2"><div class="calc-strip" id="stock-preview"></div></div>' +
      '</div></form>';
    ui.openModal({
      title: titles[mode], body: body,
      footer: '<button type="button" class="btn btn-outline" data-close>Cancel</button><button type="submit" form="stock-form" class="btn btn-primary">' + icon('check') + 'Update Inventory</button>',
      onOpen: function (modal) {
        var form = modal.querySelector('form');
        var preview = function () {
          var p = SF.product(form.productId.value);
          var el = modal.querySelector('#stock-preview');
          if (!p) { el.innerHTML = '<div><span>Current stock</span><strong>—</strong></div><div><span>Change</span><strong>—</strong></div><div><span>New stock</span><strong>—</strong></div>'; return; }
          var q = Math.round(U.num(form.qty.value));
          var next = mode === 'in' ? p.stock + q : mode === 'out' ? p.stock - q : (form.qty.value === '' ? p.stock : q);
          var diff = next - p.stock;
          el.innerHTML = '<div><span>Current stock</span><strong>' + p.stock + ' ' + esc(p.unit) + '</strong></div>' +
            '<div><span>Change</span><strong class="' + (diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : '') + '">' + (diff > 0 ? '+' : '') + diff + '</strong></div>' +
            '<div><span>New stock</span><strong class="' + (next < 0 ? 'text-danger' : '') + '">' + next + ' ' + esc(p.unit) + '</strong></div>';
        };
        form.productId.addEventListener('change', preview);
        form.qty.addEventListener('input', preview);
        preview();
        if (productId) setTimeout(function () { form.qty.focus(); }, 40);
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          if (!ui.validate(form, [
            { name: 'qty', test: function (v) { return /^\d+$/.test(String(v).trim()) && (mode === 'adjust' || +v > 0); }, message: mode === 'adjust' ? 'Enter a whole number (0 or more).' : 'Enter a whole number greater than zero.' }
          ])) return;
          try {
            SF.stockMove(mode, ui.formData(form));
            ui.closeModal(modal);
            ui.toast('Inventory updated successfully');
          } catch (err) { ui.toast(err.message, 'error'); }
        });
      }
    });
  }

  function productHistory(id) {
    var p = SF.product(id);
    if (!p) return;
    var list = txFor(id);
    ui.openModal({
      title: 'Inventory History — ' + p.name, size: 'xl',
      body: '<div class="detail-grid">' + stat('Current Stock', p.stock + ' ' + p.unit) + stat('Minimum Stock', p.minStock + ' ' + p.unit) + stat('Movements', String(list.length)) + '</div>' +
        (list.length ? '<div class="boxed">' + historyTable(list, true) + '</div>' : '<div class="note-box">No stock movements recorded yet.</div>'),
      footer: '<button class="btn btn-outline" data-close>Close</button><button class="btn btn-primary" data-action="adjust-stock" data-id="' + p.id + '">' + icon('sliders') + 'Adjust Stock</button>'
    });
  }

  /* ------------------------------------------------------------------------
     SALES
     ------------------------------------------------------------------------ */
  var Sales = {
    title: 'Sales',
    render: function () {
      var st = state.sales;
      var m = range('month');
      var month = SF.summarize(SF.salesInRange(m.from, m.to));
      var all = SF.summarize(D().sales);
      var html = pageHead('Sales', 'Record orders, track payments and review sales history.',
        btn('export-csv', 'Export CSV', 'btn-outline', 'download', ' data-kind="sales"') + btn('new-sale', 'New Sale', 'btn-primary', 'plus'));
      html += '<div class="kpi-grid cols-4">' +
        kpi('Sales This Month', SF.number(month.count), SF.number(month.units) + ' units sold', 'receipt', 'tone-blue') +
        kpi('Revenue This Month', money(month.revenue), 'Net sales, excl. tax', 'dollar', 'tone-green') +
        kpi('Profit This Month', money(month.profit), 'Margin ' + SF.percent(month.revenue ? month.profit / month.revenue * 100 : 0), 'trending', 'tone-teal') +
        kpi('Outstanding Payments', money(all.outstanding), all.unpaid + ' unpaid or partial sales', 'wallet', all.outstanding ? 'tone-amber' : 'tone-green') +
        '</div>';
      if (!D().sales.length) {
        return html + '<div class="card">' + ui.empty('sales', 'No sales recorded yet', 'Create your first sale — stock levels, customer history and reports update automatically.', btn('new-sale', 'New Sale', 'btn-primary', 'plus')) + '</div>';
      }
      html += '<div class="card"><div class="toolbar">' +
        searchBox('sales.q', 'Search by sale ID, customer or product…', st.q) +
        filterSelect('sales.period', [{ value: 'all', label: 'All time' }].concat(PERIODS), st.period) +
        filterSelect('sales.status', SF.PAYMENT_STATUSES, st.status, 'All payment statuses') +
        filterSelect('sales.method', SF.PAYMENT_METHODS, st.method, 'All payment methods') +
        '<span class="toolbar-spacer"></span><span class="result-count" id="table-count"></span></div><div id="table-host"></div></div>';
      return html;
    },
    table: function () {
      var st = state.sales, r = range(st.period);
      var list = D().sales.filter(function (s) {
        return s.date >= r.from && s.date <= r.to &&
          (!st.status || s.paymentStatus === st.status) && (!st.method || s.paymentMethod === st.method) &&
          matches(st.q, [s.number, SF.customerName(s), s.notes].concat(s.items.map(function (i) { return i.name; })));
      });
      list = sortList(list, st, {
        date: function (s) { return s.date + (s.createdAt || ''); }, number: function (s) { return s.number; }, customer: function (s) { return SF.customerName(s); },
        items: function (s) { return s.items.length; }, total: function (s) { return s.total; }, profit: function (s) { return s.profit; }, status: function (s) { return s.paymentStatus; }
      });
      setCount(list.length, D().sales.length, 'sales');
      if (!list.length) return filteredEmpty();
      var sum = SF.summarize(list);
      var shown = list.slice(0, st.limit);
      return '<div class="table-wrap"><table class="table responsive" data-table="sales"><thead><tr>' +
        ui.sortTh('Sale ID', 'number', st) + ui.sortTh('Customer', 'customer', st) + ui.sortTh('Date', 'date', st) + ui.sortTh('Items', 'items', st) +
        ui.sortTh('Total', 'total', st, 'num') + ui.sortTh('Profit', 'profit', st, 'num') + ui.sortTh('Payment Status', 'status', st) + '<th class="num">Actions</th></tr></thead><tbody>' +
        shown.map(function (s) {
          var bal = SF.balance(s);
          return '<tr><td class="td-primary" data-label="Sale ID"><button class="link" data-action="view-sale" data-id="' + s.id + '">' + esc(s.number) + '</button><div class="cell-sub">' + esc(s.paymentMethod) + '</div></td>' +
            '<td data-label="Customer">' + esc(SF.customerName(s)) + '</td>' +
            '<td data-label="Date" class="nowrap">' + esc(SF.date(s.date)) + '</td>' +
            '<td data-label="Items" class="nowrap">' + esc(itemsCount(s)) + '</td>' +
            '<td data-label="Total" class="num fw-600">' + esc(money(s.total)) + (bal > 0 ? '<div class="cell-sub text-danger">Due ' + esc(money(bal)) + '</div>' : '') + '</td>' +
            '<td data-label="Profit" class="num ' + (s.profit < 0 ? 'text-danger' : 'text-success') + '">' + esc(money(s.profit)) + '</td>' +
            '<td data-label="Payment">' + ui.paymentBadge(s.paymentStatus) + '</td>' +
            '<td class="td-actions"><div class="row-actions">' + iconBtn('view-sale', s.id, 'eye', 'View sale') + iconBtn('edit-sale', s.id, 'edit', 'Edit sale') + iconBtn('delete-sale', s.id, 'trash', 'Delete sale', true) + '</div></td></tr>';
        }).join('') + '</tbody><tfoot><tr><td>Totals (' + list.length + ')</td><td></td><td></td><td></td><td class="num">' + esc(money(sum.total)) + '</td><td class="num">' + esc(money(sum.profit)) + '</td><td></td><td></td></tr></tfoot></table></div>' +
        moreButton('sales', st.limit, list.length);
    }
  };

  /* Shared line-item editor for sales and purchases */
  function lineRow(kind, optionsHtml, it, fmt) {
    var priceName = kind === 'sale' ? 'Unit Price' : 'Cost Price';
    return '<div class="line" data-line>' +
      '<div class="l-product"><span class="l-field-label">Product</span><select class="input" data-f="product" aria-label="Product">' + optionsHtml + '</select></div>' +
      '<div><span class="l-field-label">Quantity</span><input class="input" type="number" min="1" step="1" inputmode="numeric" data-f="qty" aria-label="Quantity" value="' + esc(it.qty || 1) + '"></div>' +
      '<div><span class="l-field-label">' + priceName + '</span><input class="input" type="number" min="0" step="0.01" inputmode="decimal" data-f="price" aria-label="' + priceName + '" value="' + esc(it.price !== undefined ? it.price : '') + '"></div>' +
      '<div class="line-total"><span class="l-field-label">Line Total</span><span data-f="total">' + esc(fmt(0)) + '</span></div>' +
      '<div class="l-remove"><button type="button" class="icon-btn danger" data-remove-line title="Remove line" aria-label="Remove line">' + icon('trash') + '</button></div>' +
      '<div class="stock-note" data-f="note"></div></div>';
  }

  function saleProductOptions(selectedId, oldQty) {
    var list = D().products.filter(function (p) { return p.status === 'Active' || oldQty[p.id] || p.id === selectedId; }).sort(byName);
    return '<option value="">Select a product…</option>' + list.map(function (p) {
      var avail = p.stock + (oldQty[p.id] || 0);
      var dis = avail <= 0 && p.id !== selectedId;
      return '<option value="' + p.id + '"' + (p.id === selectedId ? ' selected' : '') + (dis ? ' disabled' : '') + '>' + esc(p.name + ' · ' + p.sku + (dis ? ' (out of stock)' : ' (' + avail + ' available)')) + '</option>';
    }).join('');
  }

  function saleForm(sale, presetCustomerId) {
    var editing = !!sale;
    if (!D().products.some(function (p) { return p.status === 'Active'; }) && !editing) {
      ui.toast('Add an active product before creating a sale.', 'error');
      return;
    }
    var set = D().settings;
    var s = sale || { customerId: presetCustomerId || '', date: U.todayISO(), items: [], discountType: 'percent', discountValue: 0, taxRate: set.taxRate, paymentMethod: 'Cash', paymentStatus: 'Paid', amountPaid: '', notes: '' };
    var oldQty = {};
    if (editing) s.items.forEach(function (it) { oldQty[it.productId] = (oldQty[it.productId] || 0) + it.qty; });
    var oldCost = {};
    if (editing) s.items.forEach(function (it) { oldCost[it.productId] = it.cost; });
    var customers = D().customers.slice().sort(byName).map(function (c) { return { value: c.id, label: c.name + (c.company ? ' — ' + c.company : '') }; });

    var body = '<form id="sale-form" novalidate><div class="form-grid cols-3">' +
      ui.field({ name: 'customerId', label: 'Customer', type: 'select', options: ui.options(customers, s.customerId, 'Walk-in Customer') }) +
      ui.field({ name: 'date', label: 'Sale Date', required: true, type: 'date', value: s.date }) +
      ui.field({ name: 'paymentMethod', label: 'Payment Method', type: 'select', options: ui.options(SF.PAYMENT_METHODS, s.paymentMethod) }) +
      ui.field({ name: 'paymentStatus', label: 'Payment Status', type: 'select', options: ui.options(SF.PAYMENT_STATUSES, s.paymentStatus) }) +
      ui.field({ name: 'amountPaid', label: 'Amount Paid (' + SF.currencySymbol() + ')', type: 'number', value: s.paymentStatus === 'Partially Paid' ? s.amountPaid : '', attrs: 'min="0" step="0.01" inputmode="decimal"', placeholder: '0.00' }) +
      '</div>' +
      '<div class="form-section-title" style="margin-top:22px">Products</div>' +
      '<div class="lines"><div class="lines-head"><span>Product</span><span>Qty</span><span>Unit Price</span><span class="r">Line Total</span><span></span></div><div id="lines"></div>' +
      '<div class="lines-foot"><button type="button" class="btn btn-outline btn-sm" id="add-line">' + icon('plus') + 'Add Product</button></div></div>' +
      '<div class="sale-bottom"><div class="form-grid">' +
      ui.field({ name: 'discountValue', label: 'Discount', control: '<div class="input-group"><input class="input" id="f_discountValue" name="discountValue" type="number" min="0" step="0.01" inputmode="decimal" value="' + esc(s.discountValue || 0) + '"><select class="input narrow" name="discountType" aria-label="Discount type">' + ui.options([{ value: 'percent', label: '%' }, { value: 'fixed', label: SF.currencySymbol() }], s.discountType) + '</select></div>' }) +
      ui.field({ name: 'taxRate', label: 'Tax Rate (%)', type: 'number', value: s.taxRate, attrs: 'min="0" max="100" step="0.01" inputmode="decimal"', hint: 'Default from Settings: ' + set.taxRate + '%' }) +
      ui.field({ name: 'notes', label: 'Notes', type: 'textarea', value: s.notes, span: 2, placeholder: 'Optional notes for this sale' }) +
      '</div><div class="totals" id="sale-totals"></div></div></form>';

    ui.openModal({
      title: editing ? 'Edit Sale ' + s.number : 'New Sale', size: 'xl', body: body, static: true,
      footer: '<button type="button" class="btn btn-outline" data-close>Cancel</button><button type="submit" form="sale-form" class="btn btn-primary">' + icon('check') + (editing ? 'Save Changes' : 'Complete Sale') + '</button>',
      onOpen: function (modal) {
        var form = modal.querySelector('form');
        var linesEl = modal.querySelector('#lines');
        function addLine(it) {
          it = it || {};
          linesEl.insertAdjacentHTML('beforeend', lineRow('sale', saleProductOptions(it.productId || '', oldQty), it, money));
          refresh();
        }
        function readLines() {
          return Array.prototype.map.call(linesEl.querySelectorAll('[data-line]'), function (row) {
            var pid = row.querySelector('[data-f=product]').value;
            var p = SF.product(pid);
            return { row: row, productId: pid, qty: U.num(row.querySelector('[data-f=qty]').value), price: U.num(row.querySelector('[data-f=price]').value), cost: p ? (oldCost[pid] !== undefined ? oldCost[pid] : p.cost) : 0, product: p };
          });
        }
        function refresh() {
          var lines = readLines();
          var counts = {};
          lines.forEach(function (l) { if (l.productId) counts[l.productId] = (counts[l.productId] || 0) + 1; });
          lines.forEach(function (l) {
            l.row.querySelector('[data-f=total]').textContent = money(l.qty * l.price);
            var note = l.row.querySelector('[data-f=note]');
            if (!l.product) { note.textContent = ''; note.className = 'stock-note'; return; }
            var avail = l.product.stock + (oldQty[l.productId] || 0);
            var warn = l.qty > avail || counts[l.productId] > 1;
            note.className = 'stock-note' + (warn ? ' warn' : '');
            note.textContent = counts[l.productId] > 1 ? 'This product is already on another line.' :
              (l.qty > avail ? 'Only ' + avail + ' ' + l.product.unit + ' available.' : avail + ' ' + l.product.unit + ' available · cost ' + money(l.cost) + ' each');
          });
          linesEl.querySelectorAll('[data-remove-line]').forEach(function (b) { b.disabled = lines.length <= 1; });
          var valid = lines.filter(function (l) { return l.product; });
          var c = SF.calcSale(valid, form.discountType.value, form.discountValue.value, form.taxRate.value);
          var partial = form.paymentStatus.value === 'Partially Paid';
          var paid = partial ? Math.min(U.num(form.amountPaid.value), c.total) : form.paymentStatus.value === 'Paid' ? c.total : 0;
          modal.querySelector('#sale-totals').innerHTML =
            '<div class="totals-row"><span>Subtotal</span><strong>' + esc(money(c.subtotal)) + '</strong></div>' +
            '<div class="totals-row"><span>Discount' + (form.discountType.value === 'percent' && U.num(form.discountValue.value) ? ' (' + U.num(form.discountValue.value) + '%)' : '') + '</span><strong>− ' + esc(money(c.discount)) + '</strong></div>' +
            '<div class="totals-row"><span>Tax (' + U.num(form.taxRate.value) + '%)</span><strong>' + esc(money(c.tax)) + '</strong></div>' +
            '<div class="totals-row grand"><span>Grand Total</span><span>' + esc(money(c.total)) + '</span></div>' +
            '<div class="totals-row"><span>Amount Paid</span><strong>' + esc(money(paid)) + '</strong></div>' +
            '<div class="totals-row"><span>Balance Due</span><strong class="' + (c.total - paid > 0 ? 'text-danger' : '') + '">' + esc(money(c.total - paid)) + '</strong></div>' +
            '<div class="totals-row profit"><span>Estimated Profit</span><strong class="' + (c.profit < 0 ? 'text-danger' : '') + '">' + esc(money(c.profit)) + '</strong></div>';
          form.amountPaid.closest('.field').style.display = partial ? '' : 'none';
        }
        linesEl.addEventListener('change', function (e) {
          if (e.target.matches('[data-f=product]')) {
            var p = SF.product(e.target.value);
            var row = e.target.closest('[data-line]');
            if (p) row.querySelector('[data-f=price]').value = p.price.toFixed(2);
          }
          refresh();
        });
        linesEl.addEventListener('input', refresh);
        linesEl.addEventListener('click', function (e) {
          var b = e.target.closest('[data-remove-line]');
          if (b && linesEl.children.length > 1) { b.closest('[data-line]').remove(); refresh(); }
        });
        modal.querySelector('#add-line').addEventListener('click', function () {
          addLine();
          var sel = linesEl.lastElementChild.querySelector('select');
          if (sel) sel.focus();
        });
        ['discountValue', 'discountType', 'taxRate', 'paymentStatus', 'amountPaid'].forEach(function (n) {
          form[n].addEventListener('input', refresh);
          form[n].addEventListener('change', refresh);
        });
        if (s.items.length) s.items.forEach(function (it) { addLine({ productId: it.productId, qty: it.qty, price: it.price.toFixed(2) }); });
        else addLine();

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var rules = [{ name: 'taxRate', test: function (v) { var n = U.num(v, -1); return n >= 0 && n <= 100; }, message: 'Tax rate must be between 0 and 100.' }];
          if (form.paymentStatus.value === 'Partially Paid') rules.push({ name: 'amountPaid', test: function (v) { return U.num(v) > 0; }, message: 'Enter the amount paid.' });
          if (!ui.validate(form, rules)) return;
          var lines = readLines();
          var bad = null;
          lines.forEach(function (l) {
            l.row.querySelectorAll('.input').forEach(function (i) { i.classList.remove('invalid'); });
            if (!l.productId) { if (lines.length === 1 || l.qty) { l.row.querySelector('[data-f=product]').classList.add('invalid'); bad = bad || 'Select a product for each line (or remove empty lines).'; } }
            if (l.productId && !(l.qty >= 1 && Math.round(l.qty) === l.qty)) { l.row.querySelector('[data-f=qty]').classList.add('invalid'); bad = bad || 'Quantities must be whole numbers of at least 1.'; }
          });
          if (bad) { ui.toast(bad, 'error'); return; }
          var data = ui.formData(form);
          data.items = lines.filter(function (l) { return l.productId; }).map(function (l) { return { productId: l.productId, qty: l.qty, price: l.price }; });
          try {
            if (editing) SF.updateSale(sale.id, data); else SF.createSale(data);
            ui.closeModal(modal);
            ui.toast(editing ? 'Sale updated successfully' : 'Sale completed successfully');
          } catch (err) { ui.toast(err.message, 'error'); }
        });
      }
    });
  }

  function saleView(id) {
    var s = SF.sale(id);
    if (!s) return;
    var set = D().settings;
    var cust = s.customerId ? SF.customer(s.customerId) : null;
    var bal = SF.balance(s);
    var body = '<div class="print-area">' +
      '<div class="invoice-head"><div class="biz"><strong>' + esc(set.businessName) + '</strong>' +
      (set.address ? '<div>' + esc(set.address) + '</div>' : '') + '<div>' + esc([set.phone, set.email].filter(Boolean).join(' · ')) + '</div>' + (set.website ? '<div>' + esc(set.website) + '</div>' : '') + '</div>' +
      '<div class="meta"><div class="inv-no">' + esc(s.number) + '</div><div>Date: ' + esc(SF.date(s.date)) + '</div><div>' + ui.paymentBadge(s.paymentStatus) + '</div></div></div>' +
      '<div class="detail-grid">' +
      '<div class="stat-box"><span>Bill To</span><strong>' + esc(SF.customerName(s)) + '</strong>' + (cust ? '<div class="cell-sub">' + esc([cust.company, cust.phone, cust.email].filter(Boolean).join(' · ')) + '</div>' : '') + '</div>' +
      stat('Payment Method', s.paymentMethod) + stat('Balance Due', money(bal), bal > 0 ? 'text-danger' : 'text-success') + '</div>' +
      '<div class="boxed mb-20"><div class="table-wrap"><table class="table responsive compact"><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Line Total</th></tr></thead><tbody>' +
      s.items.map(function (it) {
        return '<tr><td class="td-primary" data-label="Product"><div class="cell-main">' + esc(it.name) + '</div><div class="cell-sub">' + esc(it.sku || '') + '</div></td><td data-label="Qty" class="num">' + it.qty + ' ' + esc(it.unit || '') + '</td>' +
          '<td data-label="Unit Price" class="num">' + esc(money(it.price)) + '</td><td data-label="Line Total" class="num fw-600">' + esc(money(it.qty * it.price)) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="sale-bottom" style="margin-top:0"><div>' + (s.notes ? '<div class="section-label">Notes</div><div class="note-box">' + esc(s.notes) + '</div>' : '') + '</div><div class="totals">' +
      '<div class="totals-row"><span>Subtotal</span><strong>' + esc(money(s.subtotal)) + '</strong></div>' +
      '<div class="totals-row"><span>Discount' + (s.discountType === 'percent' && s.discountValue ? ' (' + s.discountValue + '%)' : '') + '</span><strong>− ' + esc(money(s.discount)) + '</strong></div>' +
      '<div class="totals-row"><span>Tax (' + s.taxRate + '%)</span><strong>' + esc(money(s.tax)) + '</strong></div>' +
      '<div class="totals-row grand"><span>Grand Total</span><span>' + esc(money(s.total)) + '</span></div>' +
      '<div class="totals-row"><span>Amount Paid</span><strong>' + esc(money(SF.paidAmount(s))) + '</strong></div>' +
      '<div class="totals-row"><span>Balance Due</span><strong>' + esc(money(bal)) + '</strong></div>' +
      '<div class="totals-row profit"><span>Profit</span><strong class="' + (s.profit < 0 ? 'text-danger' : '') + '">' + esc(money(s.profit)) + '</strong></div>' +
      '</div></div></div>';
    ui.openModal({
      title: 'Sale ' + s.number, size: 'lg', body: body,
      footer: '<button class="btn btn-danger-outline left" data-action="delete-sale" data-id="' + s.id + '">' + icon('trash') + 'Delete</button>' +
        '<button class="btn btn-outline" data-action="print">' + icon('printer') + 'Print</button>' +
        '<button class="btn btn-outline" data-action="sale-payment" data-id="' + s.id + '">' + icon('wallet') + 'Update Payment</button>' +
        '<button class="btn btn-primary" data-action="edit-sale" data-id="' + s.id + '">' + icon('edit') + 'Edit</button>'
    });
  }

  function paymentForm(kind, id) {
    var doc = kind === 'sale' ? SF.sale(id) : SF.purchase(id);
    if (!doc) return;
    var body = '<form id="pay-form" novalidate><div class="calc-strip" style="margin-bottom:16px"><div><span>Total</span><strong>' + esc(money(doc.total)) + '</strong></div><div><span>Paid</span><strong>' + esc(money(SF.paidAmount(doc))) + '</strong></div><div><span>Balance</span><strong class="' + (SF.balance(doc) > 0 ? 'text-danger' : 'text-success') + '">' + esc(money(SF.balance(doc))) + '</strong></div></div>' +
      '<div class="form-grid">' +
      ui.field({ name: 'paymentStatus', label: 'Payment Status', type: 'select', options: ui.options(SF.PAYMENT_STATUSES, doc.paymentStatus) }) +
      ui.field({ name: 'amountPaid', label: 'Amount Paid (' + SF.currencySymbol() + ')', type: 'number', value: doc.paymentStatus === 'Partially Paid' ? doc.amountPaid : '', attrs: 'min="0" step="0.01" inputmode="decimal"', placeholder: '0.00' }) +
      (kind === 'sale' ? ui.field({ name: 'paymentMethod', label: 'Payment Method', type: 'select', options: ui.options(SF.PAYMENT_METHODS, doc.paymentMethod) }) : '') +
      ui.field({ name: 'notes', label: 'Notes', type: 'textarea', value: doc.notes, span: 2 }) +
      '</div></form>';
    ui.openModal({
      title: 'Update Payment — ' + doc.number, body: body,
      footer: '<button type="button" class="btn btn-outline" data-close>Cancel</button><button type="submit" form="pay-form" class="btn btn-primary">' + icon('check') + 'Save Payment</button>',
      onOpen: function (modal) {
        var form = modal.querySelector('form');
        var toggle = function () { form.amountPaid.closest('.field').style.display = form.paymentStatus.value === 'Partially Paid' ? '' : 'none'; };
        form.paymentStatus.addEventListener('change', toggle);
        toggle();
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var rules = form.paymentStatus.value === 'Partially Paid' ? [{ name: 'amountPaid', test: function (v) { return U.num(v) > 0 && U.num(v) < doc.total; }, message: 'Enter an amount between 0 and the total.' }] : [];
          if (!ui.validate(form, rules)) return;
          try {
            if (kind === 'sale') SF.updateSalePayment(id, ui.formData(form)); else SF.updatePurchasePayment(id, ui.formData(form));
            ui.closeModal(modal);
            ui.toast('Payment updated successfully');
          } catch (err) { ui.toast(err.message, 'error'); }
        });
      }
    });
  }

  function editSale(id) {
    var s = SF.sale(id);
    if (!s) return;
    if (!SF.canEditSaleItems(s)) {
      ui.toast('This sale includes a deleted product — only payment details can be changed.', 'info');
      paymentForm('sale', id);
      return;
    }
    saleForm(s);
  }

  function deleteSale(id) {
    var s = SF.sale(id);
    if (!s) return;
    ui.confirm({
      title: 'Delete sale', heading: 'Delete sale ' + s.number + '?',
      message: 'The sale will be removed and ' + s.items.reduce(function (a, it) { return a + it.qty; }, 0) + ' unit(s) will be returned to inventory. Reports and customer history will update. This cannot be undone.',
      confirmText: 'Delete Sale'
    }).then(function (ok) {
      if (!ok) return;
      try { SF.deleteSale(id); ui.toast('Sale deleted and inventory restored'); } catch (e) { ui.toast(e.message, 'error'); }
    });
  }

  /* ------------------------------------------------------------------------
     CUSTOMERS
     ------------------------------------------------------------------------ */
  var Customers = {
    title: 'Customers',
    render: function () {
      var st = state.customers;
      var html = pageHead('Customers', 'Keep customer details and purchase history in one place.',
        btn('export-csv', 'Export CSV', 'btn-outline', 'download', ' data-kind="customers"') + btn('add-customer', 'Add Customer', 'btn-primary', 'plus'));
      if (!D().customers.length) {
        return html + '<div class="card">' + ui.empty('customers', 'No customers yet', 'Add customers so you can link them to sales and follow up on balances.', btn('add-customer', 'Add Customer', 'btn-primary', 'plus')) + '</div>';
      }
      var cities = {};
      D().customers.forEach(function (c) { if (c.city) cities[c.city] = true; });
      html += '<div class="card"><div class="toolbar">' + searchBox('customers.q', 'Search name, company, phone or email…', st.q) +
        filterSelect('customers.city', Object.keys(cities).sort(), st.city, 'All cities') +
        filterSelect('customers.balance', [{ value: 'due', label: 'Outstanding balance' }, { value: 'clear', label: 'No balance' }, { value: 'business', label: 'Businesses' }, { value: 'individual', label: 'Individuals' }], st.balance, 'All customers') +
        '<span class="toolbar-spacer"></span><span class="result-count" id="table-count"></span></div><div id="table-host"></div></div>';
      return html;
    },
    table: function () {
      var st = state.customers;
      var rows = D().customers.map(function (c) { return { c: c, s: SF.customerStats(c.id) }; }).filter(function (r) {
        var c = r.c;
        return matches(st.q, [c.name, c.company, c.phone, c.email, c.city, c.address]) && (!st.city || c.city === st.city) &&
          (st.balance !== 'due' || r.s.outstanding > 0) && (st.balance !== 'clear' || r.s.outstanding <= 0) &&
          (st.balance !== 'business' || c.company) && (st.balance !== 'individual' || !c.company);
      });
      rows = sortList(rows, st, {
        name: function (r) { return r.c.name; }, city: function (r) { return r.c.city || ''; }, orders: function (r) { return r.s.count; },
        spent: function (r) { return r.s.spent; }, balance: function (r) { return r.s.outstanding; }
      });
      setCount(rows.length, D().customers.length, 'customers');
      if (!rows.length) return filteredEmpty();
      return '<div class="table-wrap"><table class="table responsive" data-table="customers"><thead><tr>' +
        ui.sortTh('Customer', 'name', st) + '<th>Contact</th>' + ui.sortTh('City', 'city', st) + ui.sortTh('Orders', 'orders', st, 'num') +
        ui.sortTh('Total Spent', 'spent', st, 'num') + ui.sortTh('Balance', 'balance', st, 'num') + '<th class="num">Actions</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var c = r.c;
          return '<tr><td class="td-primary" data-label="Customer"><div class="cell-product">' + ui.avatar(c.name, true) + '<div style="min-width:0"><div class="cell-main"><button class="link" data-action="view-customer" data-id="' + c.id + '">' + esc(c.name) + '</button></div><div class="cell-sub">' + esc(c.company || 'Individual') + '</div></div></div></td>' +
            '<td data-label="Contact"><div>' + esc(c.phone || '—') + '</div><div class="cell-sub">' + esc(c.email || '') + '</div></td>' +
            '<td data-label="City">' + esc(c.city || '—') + '</td><td data-label="Orders" class="num">' + r.s.count + '</td>' +
            '<td data-label="Total Spent" class="num fw-600">' + esc(money(r.s.spent)) + '</td>' +
            '<td data-label="Balance" class="num ' + (r.s.outstanding > 0 ? 'text-danger fw-600' : 'muted') + '">' + esc(money(r.s.outstanding)) + '</td>' +
            '<td class="td-actions"><div class="row-actions">' + iconBtn('view-customer', c.id, 'eye', 'View details') + iconBtn('edit-customer', c.id, 'edit', 'Edit customer') + iconBtn('delete-customer', c.id, 'trash', 'Delete customer', true) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
  };

  function customerForm(customer, onSaved) {
    var editing = !!customer;
    var c = customer || {};
    var body = '<form id="customer-form" novalidate><div class="form-grid">' +
      ui.field({ name: 'name', label: 'Full Name', required: true, value: c.name, placeholder: 'e.g. Emily Carter' }) +
      ui.field({ name: 'company', label: 'Company', value: c.company, placeholder: 'Optional' }) +
      ui.field({ name: 'phone', label: 'Phone', type: 'tel', value: c.phone, placeholder: '(555) 555-0100' }) +
      ui.field({ name: 'email', label: 'Email', type: 'email', value: c.email, placeholder: 'name@example.com' }) +
      ui.field({ name: 'address', label: 'Address', value: c.address, placeholder: 'Street address' }) +
      ui.field({ name: 'city', label: 'City', value: c.city }) +
      ui.field({ name: 'notes', label: 'Notes', type: 'textarea', value: c.notes, span: 2 }) +
      '</div></form>';
    ui.openModal({
      title: editing ? 'Edit Customer' : 'Add Customer', body: body,
      footer: '<button type="button" class="btn btn-outline" data-close>Cancel</button><button type="submit" form="customer-form" class="btn btn-primary">' + icon('check') + (editing ? 'Save Changes' : 'Add Customer') + '</button>',
      onOpen: function (modal) {
        var form = modal.querySelector('form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          if (!ui.validate(form, [{ name: 'email', test: function (v) { return !v.trim() || U.isValidEmail(v); }, message: 'Enter a valid email address.' }])) return;
          try {
            var saved = editing ? SF.updateCustomer(customer.id, ui.formData(form)) : SF.addCustomer(ui.formData(form));
            ui.closeModal(modal);
            ui.toast(editing ? 'Customer updated successfully' : 'Customer added successfully');
            if (onSaved) onSaved(saved);
          } catch (err) { ui.toast(err.message, 'error'); }
        });
      }
    });
  }

  function customerDetails(id) {
    var c = SF.customer(id);
    if (!c) return;
    var st = SF.customerStats(id);
    var sales = st.sales.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var body = '<div class="detail-title">' + ui.avatar(c.name, true) + '<div><h3>' + esc(c.name) + '</h3><div class="cell-sub">' + esc(c.company || 'Individual customer') + '</div></div></div>' +
      '<div class="detail-grid cols-4">' + stat('Total Purchases', String(st.count)) + stat('Total Amount Spent', money(st.spent)) +
      stat('Outstanding Balance', money(st.outstanding), st.outstanding > 0 ? 'text-danger' : '') + stat('Last Purchase', st.lastPurchase ? SF.date(st.lastPurchase) : '—') + '</div>' +
      '<dl class="dl">' + dl('Phone', c.phone || '—') + dl('Email', c.email || '—') + dl('Address', [c.address, c.city].filter(Boolean).join(', ') || '—') + dl('Notes', c.notes || '—') + '</dl>' +
      '<div class="section-label">Purchase History</div>' +
      (sales.length ? '<div class="boxed"><div class="table-wrap"><table class="table responsive compact"><thead><tr><th>Sale ID</th><th>Date</th><th>Items</th><th class="num">Total</th><th class="num">Balance</th><th>Status</th></tr></thead><tbody>' +
        sales.map(function (s) {
          return '<tr><td class="td-primary" data-label="Sale"><button class="link" data-action="view-sale" data-id="' + s.id + '">' + esc(s.number) + '</button></td><td data-label="Date" class="nowrap">' + esc(SF.date(s.date)) + '</td>' +
            '<td data-label="Items">' + esc(s.items.map(function (i) { return i.qty + '× ' + i.name; }).join(', ')) + '</td><td data-label="Total" class="num fw-600">' + esc(money(s.total)) + '</td>' +
            '<td data-label="Balance" class="num">' + esc(money(SF.balance(s))) + '</td><td data-label="Status">' + ui.paymentBadge(s.paymentStatus) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' : '<div class="note-box">No purchases yet. Create a sale for this customer to start their history.</div>');
    ui.openModal({
      title: 'Customer Details', size: 'lg', body: body,
      footer: '<button class="btn btn-danger-outline left" data-action="delete-customer" data-id="' + c.id + '">' + icon('trash') + 'Delete</button>' +
        '<button class="btn btn-outline" data-action="edit-customer" data-id="' + c.id + '">' + icon('edit') + 'Edit</button>' +
        '<button class="btn btn-primary" data-action="new-sale" data-customer="' + c.id + '">' + icon('plus') + 'New Sale</button>'
    });
  }

  function deleteCustomer(id) {
    var c = SF.customer(id);
    if (!c) return;
    var n = SF.customerStats(id).count;
    ui.confirm({ title: 'Delete customer', heading: 'Delete ' + c.name + '?', message: 'The customer record will be removed.' + (n ? ' Their ' + n + ' existing sale(s) will be kept under their name.' : ''), confirmText: 'Delete Customer' }).then(function (ok) {
      if (!ok) return;
      try { SF.deleteCustomer(id); ui.toast('Customer deleted successfully'); } catch (e) { ui.toast(e.message, 'error'); }
    });
  }

  /* ------------------------------------------------------------------------
     SUPPLIERS
     ------------------------------------------------------------------------ */
  var Suppliers = {
    title: 'Suppliers',
    render: function () {
      var st = state.suppliers;
      var html = pageHead('Suppliers', 'Manage the vendors you buy stock from.',
        btn('export-csv', 'Export CSV', 'btn-outline', 'download', ' data-kind="suppliers"') + btn('add-supplier', 'Add Supplier', 'btn-primary', 'plus'));
      if (!D().suppliers.length) {
        return html + '<div class="card">' + ui.empty('suppliers', 'No suppliers yet', 'Add a supplier to link products and record purchases.', btn('add-supplier', 'Add Supplier', 'btn-primary', 'plus')) + '</div>';
      }
      return html + '<div class="card"><div class="toolbar">' + searchBox('suppliers.q', 'Search supplier, contact, phone or email…', st.q) +
        '<span class="toolbar-spacer"></span><span class="result-count" id="table-count"></span></div><div id="table-host"></div></div>';
    },
    table: function () {
      var st = state.suppliers;
      var rows = D().suppliers.map(function (s) { return { s: s, x: SF.supplierStats(s.id) }; }).filter(function (r) {
        return matches(st.q, [r.s.name, r.s.contact, r.s.phone, r.s.email, r.s.address]);
      });
      rows = sortList(rows, st, {
        name: function (r) { return r.s.name; }, products: function (r) { return r.x.products.length; }, purchases: function (r) { return r.x.total; }, balance: function (r) { return r.x.outstanding; }
      });
      setCount(rows.length, D().suppliers.length, 'suppliers');
      if (!rows.length) return filteredEmpty();
      return '<div class="table-wrap"><table class="table responsive" data-table="suppliers"><thead><tr>' +
        ui.sortTh('Supplier', 'name', st) + '<th>Phone</th><th>Email</th>' + ui.sortTh('Products', 'products', st, 'num') + ui.sortTh('Total Purchased', 'purchases', st, 'num') + ui.sortTh('Balance Owed', 'balance', st, 'num') + '<th class="num">Actions</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var s = r.s;
          return '<tr><td class="td-primary" data-label="Supplier"><div class="cell-product">' + ui.avatar(s.name) + '<div style="min-width:0"><div class="cell-main"><button class="link" data-action="view-supplier" data-id="' + s.id + '">' + esc(s.name) + '</button></div><div class="cell-sub">' + esc(s.contact || '—') + '</div></div></div></td>' +
            '<td data-label="Phone" class="nowrap">' + esc(s.phone || '—') + '</td><td data-label="Email">' + esc(s.email || '—') + '</td>' +
            '<td data-label="Products" class="num">' + r.x.products.length + '</td><td data-label="Total Purchased" class="num fw-600">' + esc(money(r.x.total)) + '</td>' +
            '<td data-label="Balance Owed" class="num ' + (r.x.outstanding > 0 ? 'text-danger fw-600' : 'muted') + '">' + esc(money(r.x.outstanding)) + '</td>' +
            '<td class="td-actions"><div class="row-actions">' + iconBtn('view-supplier', s.id, 'eye', 'View details') + iconBtn('edit-supplier', s.id, 'edit', 'Edit supplier') + iconBtn('delete-supplier', s.id, 'trash', 'Delete supplier', true) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
  };

  function supplierForm(supplier) {
    var editing = !!supplier;
    var s = supplier || {};
    var body = '<form id="supplier-form" novalidate><div class="form-grid">' +
      ui.field({ name: 'name', label: 'Supplier Name', required: true, value: s.name, placeholder: 'e.g. TechSource Distribution' }) +
      ui.field({ name: 'contact', label: 'Contact Person', value: s.contact }) +
      ui.field({ name: 'phone', label: 'Phone', type: 'tel', value: s.phone }) +
      ui.field({ name: 'email', label: 'Email', type: 'email', value: s.email }) +
      ui.field({ name: 'address', label: 'Address', value: s.address, span: 2 }) +
      ui.field({ name: 'notes', label: 'Notes', type: 'textarea', value: s.notes, span: 2, placeholder: 'Payment terms, lead times, minimum orders…' }) +
      '</div></form>';
    ui.openModal({
      title: editing ? 'Edit Supplier' : 'Add Supplier', body: body,
      footer: '<button type="button" class="btn btn-outline" data-close>Cancel</button><button type="submit" form="supplier-form" class="btn btn-primary">' + icon('check') + (editing ? 'Save Changes' : 'Add Supplier') + '</button>',
      onOpen: function (modal) {
        var form = modal.querySelector('form');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          if (!ui.validate(form, [{ name: 'email', test: function (v) { return !v.trim() || U.isValidEmail(v); }, message: 'Enter a valid email address.' }])) return;
          try {
            if (editing) SF.updateSupplier(supplier.id, ui.formData(form)); else SF.addSupplier(ui.formData(form));
            ui.closeModal(modal);
            ui.toast(editing ? 'Supplier updated successfully' : 'Supplier added successfully');
          } catch (err) { ui.toast(err.message, 'error'); }
        });
      }
    });
  }

  function supplierDetails(id) {
    var s = SF.supplier(id);
    if (!s) return;
    var x = SF.supplierStats(id);
    var pur = x.purchases.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var body = '<div class="detail-title">' + ui.avatar(s.name) + '<div><h3>' + esc(s.name) + '</h3><div class="cell-sub">' + esc(s.contact ? 'Contact: ' + s.contact : 'Supplier') + '</div></div></div>' +
      '<div class="detail-grid cols-4">' + stat('Products Supplied', String(x.products.length)) + stat('Purchase Orders', String(x.count)) + stat('Total Purchased', money(x.total)) + stat('Balance Owed', money(x.outstanding), x.outstanding > 0 ? 'text-danger' : '') + '</div>' +
      '<dl class="dl">' + dl('Phone', s.phone || '—') + dl('Email', s.email || '—') + dl('Address', s.address || '—') + dl('Notes', s.notes || '—') + '</dl>' +
      '<div class="section-label">Products</div>' +
      (x.products.length ? '<div class="boxed mb-20"><div class="table-wrap"><table class="table responsive compact"><thead><tr><th>Product</th><th>SKU</th><th class="num">Cost</th><th class="num">Stock</th><th>Status</th></tr></thead><tbody>' +
        x.products.map(function (p) {
          return '<tr><td class="td-primary" data-label="Product"><button class="link" data-action="view-product" data-id="' + p.id + '">' + esc(p.name) + '</button></td><td data-label="SKU">' + esc(p.sku) + '</td><td data-label="Cost" class="num">' + esc(money(p.cost)) + '</td><td data-label="Stock" class="num">' + p.stock + '</td><td data-label="Status">' + ui.stockBadge(p) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' : '<div class="note-box mb-20">No products are linked to this supplier yet.</div>') +
      '<div class="section-label">Purchase History</div>' +
      (pur.length ? '<div class="boxed"><div class="table-wrap"><table class="table responsive compact"><thead><tr><th>Purchase ID</th><th>Date</th><th>Items</th><th class="num">Total</th><th>Status</th></tr></thead><tbody>' +
        pur.map(function (p) {
          return '<tr><td class="td-primary" data-label="Purchase"><button class="link" data-action="view-purchase" data-id="' + p.id + '">' + esc(p.number) + '</button></td><td data-label="Date" class="nowrap">' + esc(SF.date(p.date)) + '</td><td data-label="Items">' + esc(itemsCount(p)) + '</td><td data-label="Total" class="num fw-600">' + esc(money(p.total)) + '</td><td data-label="Status">' + ui.paymentBadge(p.paymentStatus) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' : '<div class="note-box">No purchases recorded from this supplier yet.</div>');
    ui.openModal({
      title: 'Supplier Details', size: 'lg', body: body,
      footer: '<button class="btn btn-danger-outline left" data-action="delete-supplier" data-id="' + s.id + '">' + icon('trash') + 'Delete</button>' +
        '<button class="btn btn-outline" data-action="edit-supplier" data-id="' + s.id + '">' + icon('edit') + 'Edit</button>' +
        '<button class="btn btn-primary" data-action="add-purchase" data-supplier="' + s.id + '">' + icon('plus') + 'New Purchase</button>'
    });
  }

  function deleteSupplier(id) {
    var s = SF.supplier(id);
    if (!s) return;
    var x = SF.supplierStats(id);
    ui.confirm({ title: 'Delete supplier', heading: 'Delete ' + s.name + '?', message: 'The supplier will be removed.' + (x.products.length ? ' ' + x.products.length + ' product(s) will no longer have a supplier assigned.' : '') + (x.count ? ' Existing purchase records are kept.' : ''), confirmText: 'Delete Supplier' }).then(function (ok) {
      if (!ok) return;
      try { SF.deleteSupplier(id); ui.toast('Supplier deleted successfully'); } catch (e) { ui.toast(e.message, 'error'); }
    });
  }

  /* ------------------------------------------------------------------------
     PURCHASES
     ------------------------------------------------------------------------ */
  var Purchases = {
    title: 'Purchases',
    render: function () {
      var st = state.purchases, d = D();
      var total = 0, owed = 0, units = 0;
      var m = range('month');
      d.purchases.forEach(function (p) {
        owed += SF.balance(p);
        if (p.date >= m.from && p.date <= m.to) { total += p.total; p.items.forEach(function (i) { units += i.qty; }); }
      });
      var html = pageHead('Purchases', 'Record stock bought from suppliers — inventory increases automatically.',
        btn('export-csv', 'Export CSV', 'btn-outline', 'download', ' data-kind="purchases"') + btn('add-purchase', 'Add Purchase', 'btn-primary', 'plus'));
      html += '<div class="kpi-grid cols-4">' +
        kpi('Purchase Orders', SF.number(d.purchases.length), 'All time', 'purchases', 'tone-blue') +
        kpi('Purchased This Month', money(total), SF.number(units) + ' units received', 'box', 'tone-teal') +
        kpi('Balance Owed', money(owed), 'To suppliers', 'wallet', owed > 0 ? 'tone-amber' : 'tone-green') +
        kpi('Suppliers', SF.number(d.suppliers.length), 'Active vendors', 'suppliers', 'tone-violet', 'suppliers') +
        '</div>';
      if (!d.purchases.length) {
        return html + '<div class="card">' + ui.empty('purchases', 'No purchases yet', 'Record a purchase from a supplier to add stock to your inventory.', btn('add-purchase', 'Add Purchase', 'btn-primary', 'plus')) + '</div>';
      }
      var sups = d.suppliers.slice().sort(byName).map(function (s) { return { value: s.id, label: s.name }; });
      return html + '<div class="card"><div class="toolbar">' + searchBox('purchases.q', 'Search purchase ID, supplier or product…', st.q) +
        filterSelect('purchases.supplier', sups, st.supplier, 'All suppliers') +
        filterSelect('purchases.status', SF.PAYMENT_STATUSES, st.status, 'All payment statuses') +
        '<span class="toolbar-spacer"></span><span class="result-count" id="table-count"></span></div><div id="table-host"></div></div>';
    },
    table: function () {
      var st = state.purchases;
      var list = D().purchases.filter(function (p) {
        return (!st.supplier || p.supplierId === st.supplier) && (!st.status || p.paymentStatus === st.status) &&
          matches(st.q, [p.number, SF.supplierName(p), p.notes].concat(p.items.map(function (i) { return i.name; })));
      });
      list = sortList(list, st, {
        date: function (p) { return p.date + (p.createdAt || ''); }, number: function (p) { return p.number; }, supplier: function (p) { return SF.supplierName(p); },
        items: function (p) { return p.items.length; }, total: function (p) { return p.total; }, status: function (p) { return p.paymentStatus; }
      });
      setCount(list.length, D().purchases.length, 'purchases');
      if (!list.length) return filteredEmpty();
      return '<div class="table-wrap"><table class="table responsive" data-table="purchases"><thead><tr>' +
        ui.sortTh('Purchase ID', 'number', st) + ui.sortTh('Supplier', 'supplier', st) + ui.sortTh('Date', 'date', st) + ui.sortTh('Items', 'items', st) +
        ui.sortTh('Total', 'total', st, 'num') + ui.sortTh('Payment Status', 'status', st) + '<th class="num">Actions</th></tr></thead><tbody>' +
        list.slice(0, st.limit).map(function (p) {
          var bal = SF.balance(p);
          return '<tr><td class="td-primary" data-label="Purchase ID"><button class="link" data-action="view-purchase" data-id="' + p.id + '">' + esc(p.number) + '</button></td>' +
            '<td data-label="Supplier">' + esc(SF.supplierName(p)) + '</td><td data-label="Date" class="nowrap">' + esc(SF.date(p.date)) + '</td>' +
            '<td data-label="Items" class="nowrap">' + esc(itemsCount(p)) + '</td>' +
            '<td data-label="Total" class="num fw-600">' + esc(money(p.total)) + (bal > 0 ? '<div class="cell-sub text-danger">Owed ' + esc(money(bal)) + '</div>' : '') + '</td>' +
            '<td data-label="Payment">' + ui.paymentBadge(p.paymentStatus) + '</td>' +
            '<td class="td-actions"><div class="row-actions">' + iconBtn('view-purchase', p.id, 'eye', 'View purchase') + iconBtn('edit-purchase', p.id, 'edit', 'Edit purchase') + iconBtn('delete-purchase', p.id, 'trash', 'Delete purchase', true) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>' + moreButton('purchases', st.limit, list.length);
    }
  };

  function purchaseProductOptions(supplierId, selectedId) {
    var all = D().products.slice().sort(byName);
    var mine = all.filter(function (p) { return supplierId && p.supplierId === supplierId; });
    var other = all.filter(function (p) { return !(supplierId && p.supplierId === supplierId); });
    var opt = function (p) { return '<option value="' + p.id + '"' + (p.id === selectedId ? ' selected' : '') + '>' + esc(p.name + ' · ' + p.sku + ' (' + p.stock + ' in stock)') + '</option>'; };
    var html = '<option value="">Select a product…</option>';
    if (mine.length) html += '<optgroup label="From this supplier">' + mine.map(opt).join('') + '</optgroup><optgroup label="Other products">' + other.map(opt).join('') + '</optgroup>';
    else html += all.map(opt).join('');
    return html;
  }

  function purchaseForm(purchase, presetSupplier) {
    var editing = !!purchase;
    if (!D().suppliers.length) { ui.toast('Add a supplier before recording a purchase.', 'error'); return; }
    if (!D().products.length) { ui.toast('Add a product before recording a purchase.', 'error'); return; }
    var p = purchase || { supplierId: presetSupplier || '', date: U.todayISO(), items: [], paymentStatus: 'Paid', amountPaid: '', notes: '' };
    var sups = D().suppliers.slice().sort(byName).map(function (s) { return { value: s.id, label: s.name }; });
    var body = '<form id="purchase-form" novalidate><div class="form-grid cols-3">' +
      ui.field({ name: 'supplierId', label: 'Supplier', required: true, type: 'select', options: ui.options(sups, p.supplierId, 'Select a supplier…') }) +
      ui.field({ name: 'date', label: 'Purchase Date', required: true, type: 'date', value: p.date }) +
      ui.field({ name: 'paymentStatus', label: 'Payment Status', type: 'select', options: ui.options(SF.PAYMENT_STATUSES, p.paymentStatus) }) +
      ui.field({ name: 'amountPaid', label: 'Amount Paid (' + SF.currencySymbol() + ')', type: 'number', value: p.paymentStatus === 'Partially Paid' ? p.amountPaid : '', attrs: 'min="0" step="0.01" inputmode="decimal"', placeholder: '0.00' }) +
      '</div><div class="form-section-title" style="margin-top:22px">Products Received</div>' +
      '<div class="lines"><div class="lines-head"><span>Product</span><span>Qty</span><span>Cost Price</span><span class="r">Line Total</span><span></span></div><div id="lines"></div>' +
      '<div class="lines-foot"><button type="button" class="btn btn-outline btn-sm" id="add-line">' + icon('plus') + 'Add Product</button></div></div>' +
      '<div class="sale-bottom"><div class="form-grid">' +
      ui.field({ name: 'notes', label: 'Notes', type: 'textarea', value: p.notes, span: 2, placeholder: 'Supplier invoice number, delivery notes…' }) +
      '<div class="field span-2"><label class="check"><input type="checkbox" name="updateCost"> Update product cost prices to these purchase costs</label></div>' +
      '</div><div class="totals" id="pur-totals"></div></div></form>';
    ui.openModal({
      title: editing ? 'Edit Purchase ' + p.number : 'Add Purchase', size: 'xl', body: body, static: true,
      footer: '<button type="button" class="btn btn-outline" data-close>Cancel</button><button type="submit" form="purchase-form" class="btn btn-primary">' + icon('check') + (editing ? 'Save Changes' : 'Complete Purchase') + '</button>',
      onOpen: function (modal) {
        var form = modal.querySelector('form');
        var linesEl = modal.querySelector('#lines');
        var oldQty = {};
        if (editing) p.items.forEach(function (it) { oldQty[it.productId] = it.qty; });
        function addLine(it) {
          it = it || {};
          linesEl.insertAdjacentHTML('beforeend', lineRow('purchase', purchaseProductOptions(form.supplierId.value, it.productId || ''), it, money));
          refresh();
        }
        function readLines() {
          return Array.prototype.map.call(linesEl.querySelectorAll('[data-line]'), function (row) {
            var pid = row.querySelector('[data-f=product]').value;
            return { row: row, productId: pid, product: SF.product(pid), qty: U.num(row.querySelector('[data-f=qty]').value), cost: U.num(row.querySelector('[data-f=price]').value) };
          });
        }
        function refresh() {
          var lines = readLines(), total = 0, units = 0, counts = {};
          lines.forEach(function (l) { if (l.productId) counts[l.productId] = (counts[l.productId] || 0) + 1; });
          lines.forEach(function (l) {
            var t = l.qty * l.cost;
            l.row.querySelector('[data-f=total]').textContent = money(t);
            var note = l.row.querySelector('[data-f=note]');
            if (l.product) {
              total += t; units += l.qty;
              var after = l.product.stock - (oldQty[l.productId] || 0) + l.qty;
              note.className = 'stock-note' + (counts[l.productId] > 1 || after < 0 ? ' warn' : '');
              note.textContent = counts[l.productId] > 1 ? 'This product is already on another line.' : 'Stock after purchase: ' + after + ' ' + l.product.unit + (l.product.cost !== l.cost ? ' · current cost ' + money(l.product.cost) : '');
            } else { note.textContent = ''; }
          });
          linesEl.querySelectorAll('[data-remove-line]').forEach(function (b) { b.disabled = lines.length <= 1; });
          var partial = form.paymentStatus.value === 'Partially Paid';
          var paid = partial ? Math.min(U.num(form.amountPaid.value), total) : form.paymentStatus.value === 'Paid' ? total : 0;
          modal.querySelector('#pur-totals').innerHTML =
            '<div class="totals-row"><span>Units received</span><strong>' + SF.number(units) + '</strong></div>' +
            '<div class="totals-row grand"><span>Total</span><span>' + esc(money(total)) + '</span></div>' +
            '<div class="totals-row"><span>Amount Paid</span><strong>' + esc(money(paid)) + '</strong></div>' +
            '<div class="totals-row"><span>Balance Owed</span><strong class="' + (total - paid > 0 ? 'text-danger' : '') + '">' + esc(money(total - paid)) + '</strong></div>';
          form.amountPaid.closest('.field').style.display = partial ? '' : 'none';
        }
        linesEl.addEventListener('change', function (e) {
          if (e.target.matches('[data-f=product]')) {
            var pr = SF.product(e.target.value);
            if (pr) e.target.closest('[data-line]').querySelector('[data-f=price]').value = pr.cost.toFixed(2);
          }
          refresh();
        });
        linesEl.addEventListener('input', refresh);
        linesEl.addEventListener('click', function (e) {
          var b = e.target.closest('[data-remove-line]');
          if (b && linesEl.children.length > 1) { b.closest('[data-line]').remove(); refresh(); }
        });
        modal.querySelector('#add-line').addEventListener('click', function () { addLine(); linesEl.lastElementChild.querySelector('select').focus(); });
        form.supplierId.addEventListener('change', function () {
          linesEl.querySelectorAll('[data-f=product]').forEach(function (sel) { var v = sel.value; sel.innerHTML = purchaseProductOptions(form.supplierId.value, v); });
        });
        ['paymentStatus', 'amountPaid'].forEach(function (n) { form[n].addEventListener('input', refresh); form[n].addEventListener('change', refresh); });
        if (p.items.length) p.items.forEach(function (it) { addLine({ productId: it.productId, qty: it.qty, price: it.cost.toFixed(2) }); });
        else addLine();

        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var rules = form.paymentStatus.value === 'Partially Paid' ? [{ name: 'amountPaid', test: function (v) { return U.num(v) > 0; }, message: 'Enter the amount paid.' }] : [];
          if (!ui.validate(form, rules)) return;
          var lines = readLines(), bad = null;
          lines.forEach(function (l) {
            l.row.querySelectorAll('.input').forEach(function (i) { i.classList.remove('invalid'); });
            if (!l.productId && (lines.length === 1 || l.qty)) { l.row.querySelector('[data-f=product]').classList.add('invalid'); bad = bad || 'Select a product for each line (or remove empty lines).'; }
            if (l.productId && !(l.qty >= 1 && Math.round(l.qty) === l.qty)) { l.row.querySelector('[data-f=qty]').classList.add('invalid'); bad = bad || 'Quantities must be whole numbers of at least 1.'; }
            if (l.productId && l.row.querySelector('[data-f=price]').value === '') { l.row.querySelector('[data-f=price]').classList.add('invalid'); bad = bad || 'Enter a cost price for each product.'; }
          });
          if (bad) { ui.toast(bad, 'error'); return; }
          var data = ui.formData(form);
          data.items = lines.filter(function (l) { return l.productId; }).map(function (l) { return { productId: l.productId, qty: l.qty, cost: l.cost }; });
          try {
            if (editing) SF.updatePurchase(purchase.id, data); else SF.createPurchase(data);
            ui.closeModal(modal);
            ui.toast(editing ? 'Purchase updated successfully' : 'Purchase completed — inventory updated');
          } catch (err) { ui.toast(err.message, 'error'); }
        });
      }
    });
  }

  function purchaseView(id) {
    var p = SF.purchase(id);
    if (!p) return;
    var sup = SF.supplier(p.supplierId);
    var bal = SF.balance(p);
    var body = '<div class="print-area"><div class="invoice-head"><div class="biz"><strong>' + esc(SF.supplierName(p)) + '</strong>' +
      (sup ? '<div>' + esc([sup.contact, sup.phone, sup.email].filter(Boolean).join(' · ')) + '</div>' : '') + '</div>' +
      '<div class="meta"><div class="inv-no">' + esc(p.number) + '</div><div>Date: ' + esc(SF.date(p.date)) + '</div><div>' + ui.paymentBadge(p.paymentStatus) + '</div></div></div>' +
      '<div class="boxed mb-20"><div class="table-wrap"><table class="table responsive compact"><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Cost Price</th><th class="num">Line Total</th></tr></thead><tbody>' +
      p.items.map(function (it) {
        return '<tr><td class="td-primary" data-label="Product"><div class="cell-main">' + esc(it.name) + '</div><div class="cell-sub">' + esc(it.sku || '') + '</div></td><td data-label="Qty" class="num">' + it.qty + ' ' + esc(it.unit || '') + '</td><td data-label="Cost" class="num">' + esc(money(it.cost)) + '</td><td data-label="Line Total" class="num fw-600">' + esc(money(it.qty * it.cost)) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="sale-bottom" style="margin-top:0"><div>' + (p.notes ? '<div class="section-label">Notes</div><div class="note-box">' + esc(p.notes) + '</div>' : '') + '</div><div class="totals">' +
      '<div class="totals-row grand"><span>Total</span><span>' + esc(money(p.total)) + '</span></div>' +
      '<div class="totals-row"><span>Amount Paid</span><strong>' + esc(money(SF.paidAmount(p))) + '</strong></div>' +
      '<div class="totals-row"><span>Balance Owed</span><strong class="' + (bal > 0 ? 'text-danger' : '') + '">' + esc(money(bal)) + '</strong></div></div></div></div>';
    ui.openModal({
      title: 'Purchase ' + p.number, size: 'lg', body: body,
      footer: '<button class="btn btn-danger-outline left" data-action="delete-purchase" data-id="' + p.id + '">' + icon('trash') + 'Delete</button>' +
        '<button class="btn btn-outline" data-action="print">' + icon('printer') + 'Print</button>' +
        '<button class="btn btn-outline" data-action="purchase-payment" data-id="' + p.id + '">' + icon('wallet') + 'Update Payment</button>' +
        '<button class="btn btn-primary" data-action="edit-purchase" data-id="' + p.id + '">' + icon('edit') + 'Edit</button>'
    });
  }

  function editPurchase(id) {
    var p = SF.purchase(id);
    if (!p) return;
    if (!SF.canEditPurchaseItems(p)) {
      ui.toast('This purchase includes a deleted product — only payment details can be changed.', 'info');
      paymentForm('purchase', id);
      return;
    }
    purchaseForm(p);
  }

  function deletePurchase(id) {
    var p = SF.purchase(id);
    if (!p) return;
    ui.confirm({
      title: 'Delete purchase', heading: 'Delete purchase ' + p.number + '?',
      message: 'The ' + p.items.reduce(function (a, it) { return a + it.qty; }, 0) + ' unit(s) received on this purchase will be removed from inventory. This cannot be undone.',
      confirmText: 'Delete Purchase'
    }).then(function (ok) {
      if (!ok) return;
      try { SF.deletePurchase(id); ui.toast('Purchase deleted and inventory updated'); } catch (e) { ui.toast(e.message, 'error'); }
    });
  }

  /* ------------------------------------------------------------------------
     REPORTS
     ------------------------------------------------------------------------ */
  var Reports = {
    title: 'Reports',
    render: function () {
      var st = state.reports, r = range(st.period);
      var sales = SF.salesInRange(r.from, r.to);
      var sum = SF.summarize(sales);
      var inv = SF.inventoryValue();
      var html = pageHead('Reports', 'Performance for ' + periodLabel(st.period).toLowerCase() + ' · ' + SF.date(r.from) + ' – ' + SF.date(r.to),
        btn('export-csv', 'Export Report', 'btn-outline', 'download', ' data-kind="report"') + btn('print-page', 'Print', 'btn-outline', 'printer'));
      html += '<div class="card mb-20"><div class="card-body" style="padding:12px 14px"><div class="segmented" role="tablist">' + PERIODS.map(function (p) {
        return '<button type="button" data-set="reports.period" data-value="' + p.value + '" class="' + (st.period === p.value ? 'active' : '') + '">' + p.label + '</button>';
      }).join('') + '</div></div></div>';
      html += '<div class="kpi-grid cols-5">' +
        kpi('Total Revenue', money(sum.revenue), 'Net sales, excl. ' + esc(money(sum.tax)) + ' tax', 'dollar', 'tone-blue') +
        kpi('Total Profit', money(sum.profit), 'Margin ' + SF.percent(sum.revenue ? sum.profit / sum.revenue * 100 : 0), 'trending', 'tone-green') +
        kpi('Total Sales', SF.number(sum.count), SF.number(sum.units) + ' units · avg ' + esc(money(sum.count ? sum.total / sum.count : 0)), 'receipt', 'tone-violet') +
        kpi('Inventory Value', money(inv.cost), 'Current, at cost', 'box', 'tone-teal') +
        kpi('Outstanding Payments', money(sum.outstanding), sum.unpaid + ' unpaid sale(s) in period', 'wallet', sum.outstanding ? 'tone-amber' : 'tone-green') +
        '</div>';
      if (!sales.length) {
        return html + '<div class="card">' + ui.empty('reports', 'No sales in this period', 'Choose another period above or record a sale to see revenue, profit and product performance.', btn('new-sale', 'New Sale', 'btn-primary', 'plus')) + '</div>';
      }
      html += '<div class="grid-2">' +
        '<div class="card"><div class="card-head"><div><h3>Revenue Over Time</h3><div class="card-sub">Net sales by ' + r.unit + '</div></div></div><div class="card-body"><div id="rep-rev"></div></div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Profit Over Time</h3><div class="card-sub">Gross profit by ' + r.unit + '</div></div></div><div class="card-body"><div id="rep-profit"></div></div></div>' +
        '</div>';
      var cats = SF.categoryStats(sales);
      var prods = SF.productSalesStats(sales).sort(function (a, b) { return b.qty - a.qty || b.revenue - a.revenue; });
      html += '<div class="grid-2">' +
        '<div class="card"><div class="card-head"><div><h3>Sales by Category</h3><div class="card-sub">Share of net revenue</div></div></div><div class="card-body"><div class="donut-wrap"><div id="rep-cat"></div><div class="donut-legend" id="rep-cat-legend"></div></div></div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Top Selling Products</h3><div class="card-sub">By units sold</div></div></div><div class="card-body flush"><ul class="list">' +
        prods.slice(0, 6).map(function (p, i) {
          return '<li><span class="avatar tone-blue">#' + (i + 1) + '</span><div class="grow"><div class="cell-main">' + esc(p.name) + '</div><div class="rank-bar"><span style="width:' + Math.max(4, p.qty / prods[0].qty * 100) + '%"></span></div></div><div class="end"><div class="fw-600">' + p.qty + ' units</div><div class="cell-sub">' + esc(money(p.revenue)) + '</div></div></li>';
        }).join('') + '</ul></div></div></div>';
      html += '<div class="grid-3-2">' +
        '<div class="card"><div class="card-head"><h3>Best Selling Products</h3><span class="card-sub">' + prods.length + ' products sold</span></div><div class="card-body flush"><div class="table-wrap"><table class="table responsive compact"><thead><tr><th>Product</th><th class="num">Units</th><th class="num">Revenue</th><th class="num">Profit</th><th class="num">Margin</th></tr></thead><tbody>' +
        prods.slice(0, 10).map(function (p) {
          return '<tr><td class="td-primary" data-label="Product"><div class="cell-main">' + esc(p.name) + '</div><div class="cell-sub">' + esc(p.sku) + '</div></td><td data-label="Units" class="num">' + p.qty + '</td><td data-label="Revenue" class="num fw-600">' + esc(money(p.revenue)) + '</td><td data-label="Profit" class="num text-success">' + esc(money(p.profit)) + '</td><td data-label="Margin" class="num">' + SF.percent(p.revenue ? p.profit / p.revenue * 100 : 0) + '</td></tr>';
        }).join('') + '</tbody></table></div></div></div>' +
        '<div class="card"><div class="card-head"><h3>Category Breakdown</h3></div><div class="card-body flush"><div class="table-wrap"><table class="table responsive compact"><thead><tr><th>Category</th><th class="num">Units</th><th class="num">Revenue</th><th class="num">Profit</th></tr></thead><tbody>' +
        cats.map(function (c) {
          return '<tr><td class="td-primary" data-label="Category">' + esc(c.category) + '</td><td data-label="Units" class="num">' + c.qty + '</td><td data-label="Revenue" class="num fw-600">' + esc(money(c.revenue)) + '</td><td data-label="Profit" class="num">' + esc(money(c.profit)) + '</td></tr>';
        }).join('') + '</tbody></table></div></div></div></div>';
      return html;
    },
    after: function () {
      var st = state.reports, r = range(st.period);
      var sales = SF.salesInRange(r.from, r.to);
      if (!sales.length) return;
      var bk = buckets(r.from, r.to, r.unit);
      var ser = bucketSeries(sales, bk);
      var labels = bk.map(function (b) { return b.label; }), tips = bk.map(function (b) { return b.tip; });
      ui.chart(document.getElementById('rep-rev'), 'bar', { labels: labels, tipLabels: tips, series: [{ name: 'Revenue', color: ui.SERIES[0], values: ser.revenue }], format: money, axisFormat: compactMoney, height: 260 });
      ui.chart(document.getElementById('rep-profit'), 'line', { labels: labels, tipLabels: tips, series: [{ name: 'Profit', color: ui.SERIES[2], values: ser.profit }], format: money, axisFormat: compactMoney, height: 260, area: true });
      var cats = SF.categoryStats(sales);
      if (cats.length > 7) {
        var rest = cats.slice(6).reduce(function (a, c) { a.revenue += c.revenue; return a; }, { category: 'Other', revenue: 0 });
        cats = cats.slice(0, 6).concat([rest]);
      }
      var total = cats.reduce(function (a, c) { return a + c.revenue; }, 0);
      var data = cats.map(function (c, i) { return { label: c.category, value: U.round2(c.revenue), color: ui.SERIES[i] }; });
      ui.chart(document.getElementById('rep-cat'), 'donut', { data: data, format: money, centerValue: compactMoney(total), centerLabel: 'Revenue' });
      document.getElementById('rep-cat-legend').innerHTML = data.map(function (d) {
        return '<div class="row"><i style="background:' + d.color + '"></i><span class="lbl">' + esc(d.label) + '</span><span class="val">' + esc(money(d.value)) + '</span><span class="pct">' + (total ? (d.value / total * 100).toFixed(1) : '0.0') + '%</span></div>';
      }).join('');
    }
  };

  /* ------------------------------------------------------------------------
     SETTINGS
     ------------------------------------------------------------------------ */
  var Settings = {
    title: 'Settings',
    render: function () {
      var s = D().settings;
      var curr = SF.CURRENCIES.map(function (c) { return { value: c.code, label: c.code + ' — ' + c.name }; });
      if (!SF.CURRENCIES.some(function (c) { return c.code === s.currency; })) curr.push({ value: s.currency, label: s.currency });
      var kb = (SF.storageSize() / 1024).toFixed(1);
      var d = D();
      return pageHead('Settings', 'Business details, preferences and data management.') +
        '<form id="settings-form" novalidate><div class="settings-grid">' +
        '<div class="card"><div class="card-head"><h3>Business Information</h3><span class="card-sub">Shown on sale receipts</span></div><div class="card-body"><div class="form-grid">' +
        ui.field({ name: 'businessName', label: 'Business Name', required: true, value: s.businessName, span: 2 }) +
        ui.field({ name: 'phone', label: 'Phone', type: 'tel', value: s.phone }) +
        ui.field({ name: 'email', label: 'Email', type: 'email', value: s.email }) +
        ui.field({ name: 'address', label: 'Address', value: s.address, span: 2 }) +
        ui.field({ name: 'website', label: 'Website', value: s.website, span: 2 }) +
        '</div></div></div>' +
        '<div class="stack"><div class="card"><div class="card-head"><h3>Application Settings</h3></div><div class="card-body"><div class="form-grid">' +
        ui.field({ name: 'currency', label: 'Currency', type: 'select', options: ui.options(curr, s.currency), span: 2 }) +
        ui.field({ name: 'taxRate', label: 'Default Tax Rate (%)', required: true, type: 'number', value: s.taxRate, attrs: 'min="0" max="100" step="0.01" inputmode="decimal"', hint: 'Applied to new sales. Existing sales keep their rate.' }) +
        ui.field({ name: 'dateFormat', label: 'Date Format', type: 'select', options: ui.options(SF.DATE_FORMATS, s.dateFormat) }) +
        '</div><div style="display:flex;justify-content:flex-end;margin-top:18px"><button type="submit" class="btn btn-primary">' + icon('check') + 'Save Settings</button></div></div></div>' +
        '<div class="card"><div class="card-head"><h3>Data Management</h3><span class="card-sub">' + kb + ' KB stored in this browser</span></div><div class="card-body">' +
        '<div class="setting-row"><div><h4>Export backup</h4><p>Download all products, sales, customers, suppliers, purchases, history and settings as a backup file.</p></div>' + btn('export-backup', 'Export Backup', 'btn-outline', 'download') + '</div>' +
        '<div class="setting-row"><div><h4>Restore backup</h4><p>Replace the current data with a StockFlow backup file (.json).</p></div><button type="button" class="btn btn-outline" data-action="import-backup">' + icon('upload') + '<span>Restore Backup</span></button><input type="file" id="backup-file" accept=".json,application/json" hidden></div>' +
        '<div class="setting-row"><div><h4>Records</h4><p>' + d.products.length + ' products · ' + d.sales.length + ' sales · ' + d.purchases.length + ' purchases · ' + d.customers.length + ' customers · ' + d.suppliers.length + ' suppliers · ' + d.transactions.length + ' inventory entries</p></div></div>' +
        '</div></div>' +
        '<div class="card danger-zone"><div class="card-head"><h3 class="text-danger">Danger Zone</h3></div><div class="card-body"><div class="setting-row"><div><h4>Reset Application Data</h4><p>Permanently delete all products, inventory history, sales, customers, suppliers and purchases, and restore default settings. Export a backup first if you may need this data.</p></div>' +
        btn('reset-data', 'Reset Application Data', 'btn-danger', 'trash') + '</div></div></div>' +
        '</div></div></form>';
    },
    after: function () {
      var form = document.getElementById('settings-form');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!ui.validate(form, [
          { name: 'email', test: function (v) { return !v.trim() || U.isValidEmail(v); }, message: 'Enter a valid email address.' },
          { name: 'taxRate', test: function (v) { var n = U.num(v, -1); return n >= 0 && n <= 100; }, message: 'Enter a value between 0 and 100.' }
        ])) return;
        try { SF.saveSettings(ui.formData(form)); ui.toast('Settings saved successfully'); } catch (err) { ui.toast(err.message, 'error'); }
      });
      document.getElementById('backup-file').addEventListener('change', function (e) {
        var file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        ui.confirm({ title: 'Restore backup', heading: 'Replace current data?', message: 'All current data will be replaced with the contents of "' + file.name + '". This cannot be undone.', confirmText: 'Restore Backup' }).then(function (ok) {
          if (!ok) return;
          var reader = new FileReader();
          reader.onload = function () {
            try { SF.importBackup(reader.result); SF.resetFormatCache(); ui.toast('Backup restored successfully'); } catch (err) { ui.toast(err.message, 'error'); }
          };
          reader.onerror = function () { ui.toast('Could not read the selected file.', 'error'); };
          reader.readAsText(file);
        });
      });
    }
  };

  /* ------------------------------------------------------------------------
     CSV exports
     ------------------------------------------------------------------------ */
  function exportCsv(kind) {
    var d = D(), rows, name;
    var stamp = U.todayISO();
    if (kind === 'products') {
      rows = [['Product', 'SKU', 'Category', 'Supplier', 'Cost Price', 'Selling Price', 'Profit per Unit', 'Margin %', 'Stock', 'Minimum Stock', 'Unit', 'Stock Status', 'Status', 'Description']].concat(d.products.map(function (p) {
        var s = SF.supplier(p.supplierId);
        return [p.name, p.sku, p.category, s ? s.name : '', p.cost.toFixed(2), p.price.toFixed(2), SF.unitProfit(p).toFixed(2), SF.margin(p.price, p.cost).toFixed(1), p.stock, p.minStock, p.unit, SF.stockStatus(p), p.status, p.description];
      }));
      name = 'products';
    } else if (kind === 'sales') {
      rows = [['Sale ID', 'Date', 'Customer', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total', 'Profit', 'Payment Method', 'Payment Status', 'Amount Paid', 'Balance', 'Notes']].concat(d.sales.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (s) {
        return [s.number, s.date, SF.customerName(s), s.items.map(function (i) { return i.qty + 'x ' + i.name; }).join('; '), s.subtotal.toFixed(2), s.discount.toFixed(2), s.tax.toFixed(2), s.total.toFixed(2), s.profit.toFixed(2), s.paymentMethod, s.paymentStatus, SF.paidAmount(s).toFixed(2), SF.balance(s).toFixed(2), s.notes];
      }));
      name = 'sales';
    } else if (kind === 'customers') {
      rows = [['Name', 'Company', 'Phone', 'Email', 'Address', 'City', 'Orders', 'Total Spent', 'Outstanding', 'Notes']].concat(d.customers.map(function (c) {
        var st = SF.customerStats(c.id);
        return [c.name, c.company, c.phone, c.email, c.address, c.city, st.count, st.spent.toFixed(2), st.outstanding.toFixed(2), c.notes];
      }));
      name = 'customers';
    } else if (kind === 'suppliers') {
      rows = [['Supplier', 'Contact Person', 'Phone', 'Email', 'Address', 'Products', 'Total Purchased', 'Balance Owed', 'Notes']].concat(d.suppliers.map(function (s) {
        var x = SF.supplierStats(s.id);
        return [s.name, s.contact, s.phone, s.email, s.address, x.products.length, x.total.toFixed(2), x.outstanding.toFixed(2), s.notes];
      }));
      name = 'suppliers';
    } else if (kind === 'purchases') {
      rows = [['Purchase ID', 'Date', 'Supplier', 'Items', 'Total', 'Payment Status', 'Amount Paid', 'Balance', 'Notes']].concat(d.purchases.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (p) {
        return [p.number, p.date, SF.supplierName(p), p.items.map(function (i) { return i.qty + 'x ' + i.name; }).join('; '), p.total.toFixed(2), p.paymentStatus, SF.paidAmount(p).toFixed(2), SF.balance(p).toFixed(2), p.notes];
      }));
      name = 'purchases';
    } else if (kind === 'history') {
      rows = [['Date', 'Product', 'SKU', 'Transaction Type', 'Quantity', 'Previous Stock', 'New Stock', 'Reason', 'Notes', 'Reference']].concat(txFor(null).map(function (t) {
        return [t.date, t.productName, t.sku, t.type, t.qty, t.prev, t.next, t.reason, t.notes, t.ref];
      }));
      name = 'inventory-history';
    } else if (kind === 'report') {
      var r = range(state.reports.period);
      var sales = SF.salesInRange(r.from, r.to);
      var sum = SF.summarize(sales);
      rows = [['StockFlow Report', periodLabel(state.reports.period), r.from + ' to ' + r.to], [],
        ['Total Revenue', sum.revenue.toFixed(2)], ['Total Profit', sum.profit.toFixed(2)], ['Total Sales', sum.count], ['Units Sold', sum.units],
        ['Tax Collected', sum.tax.toFixed(2)], ['Outstanding Payments', sum.outstanding.toFixed(2)], ['Inventory Value (cost)', SF.inventoryValue().cost.toFixed(2)], [],
        ['Product', 'SKU', 'Category', 'Units Sold', 'Revenue', 'Profit']].concat(SF.productSalesStats(sales).sort(function (a, b) { return b.qty - a.qty; }).map(function (p) {
          return [p.name, p.sku, p.category, p.qty, p.revenue.toFixed(2), p.profit.toFixed(2)];
        })).concat([[], ['Category', 'Units Sold', 'Revenue', 'Profit']]).concat(SF.categoryStats(sales).map(function (c) {
          return [c.category, c.qty, c.revenue.toFixed(2), c.profit.toFixed(2)];
        }));
      name = 'report-' + state.reports.period;
    }
    if (!rows) return;
    ui.download('stockflow-' + name + '-' + stamp + '.csv', '﻿' + ui.csv(rows), 'text/csv;charset=utf-8');
    ui.toast('Export downloaded');
  }

  /* ------------------------------------------------------------------------
     Router
     ------------------------------------------------------------------------ */
  var PAGES = { dashboard: Dashboard, products: Products, inventory: Inventory, sales: Sales, customers: Customers, suppliers: Suppliers, purchases: Purchases, reports: Reports, settings: Settings };

  function currentPageFromHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    return PAGES[h] ? h : 'dashboard';
  }

  function render(scrollTop) {
    var page = PAGES[state.page];
    var content = document.getElementById('content');
    var y = window.scrollY;
    content.innerHTML = page.render();
    if (page.table) drawTable();
    if (page.after) page.after();
    document.getElementById('topbar-title').textContent = page.title;
    document.title = page.title + ' · StockFlow';
    renderNav();
    if (scrollTop) window.scrollTo(0, 0); else window.scrollTo(0, y);
  }

  function drawTable() {
    var page = PAGES[state.page];
    var host = document.getElementById('table-host');
    if (host && page.table) host.innerHTML = page.table();
  }

  function go(page) {
    if (location.hash !== '#/' + page) location.hash = '#/' + page;
    else { state.page = page; render(true); }
  }

  window.addEventListener('hashchange', function () {
    state.page = currentPageFromHash();
    document.body.classList.remove('nav-open');
    ui.closeAllModals();
    render(true);
  });

  /* ------------------------------------------------------------------------
     Global event handling
     ------------------------------------------------------------------------ */
  var ACTIONS = {
    'goto': function (el) { go(el.getAttribute('data-page')); },
    'add-product': function () { productForm(null); },
    'view-product': function (el, id) { productDetails(id); },
    'edit-product': function (el, id) { var p = SF.product(id); if (p) productForm(p); },
    'delete-product': function (el, id) { deleteProduct(id); },
    'stock-in': function (el, id) { stockForm('in', id); },
    'stock-out': function (el, id) { stockForm('out', id); },
    'adjust-stock': function (el, id) { stockForm('adjust', id); },
    'product-history': function (el, id) { productHistory(id); },
    'new-sale': function (el) { saleForm(null, el.getAttribute('data-customer') || ''); },
    'view-sale': function (el, id) { saleView(id); },
    'edit-sale': function (el, id) { editSale(id); },
    'delete-sale': function (el, id) { deleteSale(id); },
    'sale-payment': function (el, id) { paymentForm('sale', id); },
    'add-customer': function () { customerForm(null); },
    'view-customer': function (el, id) { customerDetails(id); },
    'edit-customer': function (el, id) { var c = SF.customer(id); if (c) customerForm(c); },
    'delete-customer': function (el, id) { deleteCustomer(id); },
    'add-supplier': function () { supplierForm(null); },
    'view-supplier': function (el, id) { supplierDetails(id); },
    'edit-supplier': function (el, id) { var s = SF.supplier(id); if (s) supplierForm(s); },
    'delete-supplier': function (el, id) { deleteSupplier(id); },
    'add-purchase': function (el) { purchaseForm(null, el.getAttribute('data-supplier') || ''); },
    'view-purchase': function (el, id) { purchaseView(id); },
    'edit-purchase': function (el, id) { editPurchase(id); },
    'delete-purchase': function (el, id) { deletePurchase(id); },
    'purchase-payment': function (el, id) { paymentForm('purchase', id); },
    'print': function () {
      document.body.classList.add('print-modal');
      window.print();
      setTimeout(function () { document.body.classList.remove('print-modal'); }, 500);
    },
    'print-page': function () { window.print(); },
    'export-csv': function (el) { exportCsv(el.getAttribute('data-kind')); },
    'export-backup': function () {
      ui.download('stockflow-backup-' + U.todayISO() + '.json', SF.exportBackup(), 'application/json');
      ui.toast('Backup downloaded successfully');
    },
    'import-backup': function () { document.getElementById('backup-file').click(); },
    'reset-data': function () {
      ui.confirm({
        title: 'Reset application data', heading: 'Delete all application data?',
        message: 'This permanently deletes every product, inventory record, sale, customer, supplier and purchase stored in this browser and restores default settings. This cannot be undone.',
        confirmText: 'Yes, Delete Everything'
      }).then(function (ok) {
        if (!ok) return;
        SF.resetAll(false);
        SF.resetFormatCache();
        Object.keys(state).forEach(function (k) { if (typeof state[k] === 'object' && 'q' in state[k]) state[k].q = ''; });
        ui.toast('All application data has been reset');
        go('dashboard');
      });
    },
    'more': function (el) {
      var k = el.getAttribute('data-key');
      if (k === 'history') state.inventory.hlimit += PAGE_SIZE; else state[k].limit += PAGE_SIZE;
      drawTable();
    },
    'clear-filters': function () {
      var st = state[state.page];
      ['q', 'category', 'stock', 'status', 'method', 'city', 'balance', 'supplier', 'hq', 'htype', 'hproduct'].forEach(function (k) { if (k in st) st[k] = ''; });
      if ('period' in st && state.page === 'sales') st.period = 'all';
      render();
    }
  };

  document.addEventListener('click', function (e) {
    var th = e.target.closest('th[data-sort]');
    if (th) {
      var st = state[state.page];
      var key = th.getAttribute('data-sort');
      if (st.sort === key) st.dir = st.dir === 'asc' ? 'desc' : 'asc';
      else { st.sort = key; st.dir = /date|total|profit|stock|spent|balance|orders|purchases|products|cost|price|value|items/.test(key) ? 'desc' : 'asc'; }
      drawTable();
      return;
    }
    var setEl = e.target.closest('[data-set]');
    if (setEl) {
      var path = setEl.getAttribute('data-set').split('.');
      state[path[0]][path[1]] = setEl.getAttribute('data-value');
      render();
      return;
    }
    var el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    var action = el.getAttribute('data-action');
    var fn = ACTIONS[action];
    if (!fn) return;
    e.preventDefault();
    // Actions that change data close the details dialog they were launched from.
    var host = el.closest('.modal');
    if (host && !/^view-|^print/.test(action)) ui.closeModal(host);
    fn(el, el.getAttribute('data-id'));
  });

  var searchTimer = null;
  function onBind(e) {
    var el = e.target;
    var bind = el.getAttribute && el.getAttribute('data-bind');
    if (!bind) return;
    var path = bind.split('.');
    state[path[0]][path[1]] = el.value;
    if (state[path[0]].limit) state[path[0]].limit = PAGE_SIZE;
    if (path[0] === 'inventory') state.inventory.hlimit = PAGE_SIZE;
    if (el.type === 'search') {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(drawTable, 120);
    } else drawTable();
  }
  document.addEventListener('input', onBind);
  document.addEventListener('change', function (e) { if (e.target.tagName === 'SELECT') onBind(e); });

  // Sidebar (mobile)
  document.getElementById('menu-toggle').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
  document.getElementById('backdrop').addEventListener('click', function () { document.body.classList.remove('nav-open'); });
  document.getElementById('nav').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-nav]');
    if (a) {
      document.body.classList.remove('nav-open');
      if (a.getAttribute('data-nav') === state.page) { e.preventDefault(); render(true); }
    }
  });

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  function updateHeaderDate() {
    var d = new Date();
    document.getElementById('topbar-date').innerHTML = icon('calendar', 'icon-sm') + esc(d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
  }

  function boot() {
    SF.load();
    SF.onChange(function () { render(); });
    state.page = currentPageFromHash();
    updateHeaderDate();
    render(true);
    if (!SF.storageAvailable()) {
      ui.toast('Browser storage is disabled — changes will not be saved after closing this page.', 'error');
    }
    // Keep "today" figures accurate if the app stays open past midnight.
    var lastDay = U.todayISO();
    setInterval(function () {
      if (U.todayISO() !== lastDay) { lastDay = U.todayISO(); updateHeaderDate(); if (!document.querySelector('.modal-root')) render(); }
    }, 60000);
  }

  // Keep data in sync if StockFlow is open in more than one tab.
  window.addEventListener('storage', function (e) {
    if (e.key === 'stockflow_data_v1' && e.newValue) {
      SF.load();
      SF.resetFormatCache();
      if (!document.querySelector('.modal-root')) render();
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
