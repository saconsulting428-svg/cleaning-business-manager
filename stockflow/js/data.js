/* ==========================================================================
   StockFlow — Data layer
   Central data store (localStorage), initial records, calculations and
   every operation that changes business data.
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'stockflow_data_v1';
  var SF = (window.SF = window.SF || {});

  /* ------------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------------ */
  var U = (SF.util = {});

  U.uid = function (prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };
  U.round2 = function (n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  };
  U.num = function (v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback === undefined ? 0 : fallback;
  };
  U.pad = function (n) {
    return (n < 10 ? '0' : '') + n;
  };
  U.isoFromDate = function (d) {
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  };
  U.parseISO = function (iso) {
    var p = String(iso || '').split('-');
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  };
  U.todayISO = function () {
    return U.isoFromDate(new Date());
  };
  U.addDays = function (iso, days) {
    var d = U.parseISO(iso);
    d.setDate(d.getDate() + days);
    return U.isoFromDate(d);
  };
  U.esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  U.isValidEmail = function (s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
  };
  U.isValidISO = function (s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
    return U.isoFromDate(U.parseISO(s)) === s;
  };

  /* ------------------------------------------------------------------------
     Default settings
     ------------------------------------------------------------------------ */
  SF.CURRENCIES = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'NZD', name: 'New Zealand Dollar' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'ZAR', name: 'South African Rand' },
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'MXN', name: 'Mexican Peso' },
    { code: 'BRL', name: 'Brazilian Real' },
    { code: 'NGN', name: 'Nigerian Naira' },
    { code: 'PHP', name: 'Philippine Peso' }
  ];
  SF.DATE_FORMATS = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2026)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
    { value: 'MMM D, YYYY', label: 'MMM D, YYYY (Dec 31, 2026)' },
    { value: 'D MMM YYYY', label: 'D MMM YYYY (31 Dec 2026)' }
  ];
  SF.PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'Other'];
  SF.PAYMENT_STATUSES = ['Paid', 'Partially Paid', 'Pending'];
  SF.UNITS = ['pcs', 'box', 'pack', 'set', 'bag', 'bottle', 'kg', 'g', 'l', 'ml', 'm', 'pair', 'roll', 'dozen'];
  SF.STOCK_IN_REASONS = ['New Stock Received', 'Customer Return', 'Stock Count Correction', 'Transfer In', 'Other'];
  SF.STOCK_OUT_REASONS = ['Damaged', 'Expired', 'Lost / Stolen', 'Internal Use', 'Returned to Supplier', 'Stock Count Correction', 'Other'];

  function defaultSettings() {
    return {
      businessName: 'Harbor & Pine Goods Co.',
      phone: '(503) 555-0148',
      email: 'hello@harborandpine.com',
      address: '412 NW Everett St, Portland, OR 97209',
      website: 'www.harborandpine.com',
      currency: 'USD',
      taxRate: 8,
      dateFormat: 'MM/DD/YYYY'
    };
  }

  function emptyData() {
    return {
      version: 1,
      settings: defaultSettings(),
      products: [],
      customers: [],
      suppliers: [],
      sales: [],
      purchases: [],
      transactions: [],
      counters: { sale: 1000, purchase: 500 },
      createdAt: new Date().toISOString()
    };
  }

  /* ------------------------------------------------------------------------
     Storage
     ------------------------------------------------------------------------ */
  var DB = null;
  var storageOK = true;
  var listeners = [];

  SF.onChange = function (fn) {
    listeners.push(fn);
  };

  function normalize(d) {
    var base = emptyData();
    var out = {};
    Object.keys(base).forEach(function (k) {
      out[k] = d && d[k] !== undefined ? d[k] : base[k];
    });
    out.settings = Object.assign(defaultSettings(), (d && d.settings) || {});
    out.counters = Object.assign({ sale: 1000, purchase: 500 }, (d && d.counters) || {});
    ['products', 'customers', 'suppliers', 'sales', 'purchases', 'transactions'].forEach(function (k) {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    return out;
  }

  SF.load = function () {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      storageOK = false;
    }
    if (raw) {
      try {
        DB = normalize(JSON.parse(raw));
        return { fresh: false };
      } catch (e) {
        // Corrupted data — keep a copy so nothing is silently lost.
        try {
          window.localStorage.setItem(STORAGE_KEY + '_corrupt_' + Date.now(), raw);
        } catch (e2) { /* ignore */ }
      }
    }
    DB = buildInitialData();
    SF.save(true);
    return { fresh: true };
  };

  SF.save = function (silent) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
      storageOK = true;
    } catch (e) {
      storageOK = false;
      if (SF.ui && SF.ui.toast) SF.ui.toast('Could not save data — browser storage is full or disabled.', 'error');
    }
    if (!silent) listeners.forEach(function (fn) { fn(); });
  };

  SF.storageAvailable = function () {
    return storageOK;
  };

  SF.data = function () {
    return DB;
  };

  SF.resetAll = function () {
    DB = emptyData();
    DB.settings = Object.assign(defaultSettings(), { businessName: 'My Business', phone: '', email: '', address: '', website: '' });
    SF.save();
  };

  SF.exportBackup = function () {
    return JSON.stringify({ app: 'StockFlow', exportedAt: new Date().toISOString(), data: DB }, null, 2);
  };

  SF.importBackup = function (text) {
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('This file is not a valid StockFlow backup.');
    }
    var d = parsed && parsed.data ? parsed.data : parsed;
    if (!d || !Array.isArray(d.products) || !d.settings) {
      throw new Error('This file is not a valid StockFlow backup.');
    }
    DB = normalize(d);
    SF.save();
  };

  SF.storageSize = function () {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY) || '';
      return raw.length * 2;
    } catch (e) {
      return 0;
    }
  };

  /* ------------------------------------------------------------------------
     Formatting
     ------------------------------------------------------------------------ */
  var fmtCache = {};
  SF.money = function (n, opts) {
    var cur = (DB && DB.settings.currency) || 'USD';
    var compact = opts && opts.compact;
    var key = cur + (compact ? 'c' : '');
    if (!fmtCache[key]) {
      try {
        fmtCache[key] = new Intl.NumberFormat(undefined, compact
          ? { style: 'currency', currency: cur, notation: 'compact', maximumFractionDigits: 1 }
          : { style: 'currency', currency: cur });
      } catch (e) {
        fmtCache[key] = { format: function (v) { return cur + ' ' + Number(v).toFixed(2); } };
      }
    }
    return fmtCache[key].format(U.round2(n || 0));
  };
  SF.currencySymbol = function () {
    var cur = (DB && DB.settings.currency) || 'USD';
    try {
      var parts = new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).formatToParts(0);
      for (var i = 0; i < parts.length; i++) if (parts[i].type === 'currency') return parts[i].value;
    } catch (e) { /* ignore */ }
    return cur;
  };
  SF.number = function (n) {
    return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  SF.percent = function (n) {
    return (isFinite(n) ? Number(n).toFixed(1) : '0.0') + '%';
  };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  SF.MONTHS = MONTHS;
  SF.date = function (iso) {
    if (!iso) return '—';
    var d = U.parseISO(iso);
    var dd = U.pad(d.getDate()), mm = U.pad(d.getMonth() + 1), yyyy = d.getFullYear();
    switch ((DB && DB.settings.dateFormat) || 'MM/DD/YYYY') {
      case 'DD/MM/YYYY': return dd + '/' + mm + '/' + yyyy;
      case 'YYYY-MM-DD': return yyyy + '-' + mm + '-' + dd;
      case 'MMM D, YYYY': return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + yyyy;
      case 'D MMM YYYY': return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + yyyy;
      default: return mm + '/' + dd + '/' + yyyy;
    }
  };
  SF.resetFormatCache = function () {
    fmtCache = {};
  };

  /* ------------------------------------------------------------------------
     Lookups & calculations
     ------------------------------------------------------------------------ */
  function findById(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  SF.product = function (id) { return findById(DB.products, id); };
  SF.customer = function (id) { return findById(DB.customers, id); };
  SF.supplier = function (id) { return findById(DB.suppliers, id); };
  SF.sale = function (id) { return findById(DB.sales, id); };
  SF.purchase = function (id) { return findById(DB.purchases, id); };

  SF.customerName = function (sale) {
    var c = sale.customerId ? SF.customer(sale.customerId) : null;
    return c ? c.name : sale.customerName || 'Walk-in Customer';
  };
  SF.supplierName = function (p) {
    var s = p.supplierId ? SF.supplier(p.supplierId) : null;
    return s ? s.name : p.supplierName || 'Unknown Supplier';
  };

  SF.stockStatus = function (p) {
    if (p.stock <= 0) return 'Out of Stock';
    if (p.stock <= p.minStock) return 'Low Stock';
    return 'In Stock';
  };
  SF.unitProfit = function (p) {
    return U.round2(p.price - p.cost);
  };
  SF.margin = function (price, cost) {
    return price > 0 ? ((price - cost) / price) * 100 : 0;
  };

  SF.categories = function () {
    var set = {};
    DB.products.forEach(function (p) { if (p.category) set[p.category] = true; });
    return Object.keys(set).sort();
  };

  /**
   * Sale math — used everywhere so numbers are always consistent.
   *   Subtotal    = Σ qty × unit price
   *   Discount    = % of subtotal or a fixed amount (capped at subtotal)
   *   Tax         = (Subtotal − Discount) × tax rate
   *   Grand Total = Subtotal − Discount + Tax
   *   Revenue     = Subtotal − Discount   (net sales, tax excluded)
   *   Profit      = Revenue − Σ qty × unit cost
   */
  SF.calcSale = function (items, discountType, discountValue, taxRate) {
    var subtotal = 0, cost = 0, qty = 0;
    items.forEach(function (it) {
      subtotal += U.num(it.qty) * U.num(it.price);
      cost += U.num(it.qty) * U.num(it.cost);
      qty += U.num(it.qty);
    });
    subtotal = U.round2(subtotal);
    cost = U.round2(cost);
    var dv = Math.max(0, U.num(discountValue));
    var discount = discountType === 'percent' ? subtotal * Math.min(dv, 100) / 100 : dv;
    discount = U.round2(Math.min(discount, subtotal));
    var net = U.round2(subtotal - discount);
    var tax = U.round2(net * Math.max(0, U.num(taxRate)) / 100);
    var total = U.round2(net + tax);
    return { subtotal: subtotal, discount: discount, net: net, tax: tax, total: total, cost: cost, profit: U.round2(net - cost), qty: qty };
  };

  SF.paidAmount = function (doc) {
    if (doc.paymentStatus === 'Paid') return doc.total;
    if (doc.paymentStatus === 'Pending') return 0;
    return Math.min(U.num(doc.amountPaid), doc.total);
  };
  SF.balance = function (doc) {
    return U.round2(doc.total - SF.paidAmount(doc));
  };

  SF.inventoryValue = function () {
    var cost = 0, retail = 0;
    DB.products.forEach(function (p) {
      var s = Math.max(0, p.stock);
      cost += s * p.cost;
      retail += s * p.price;
    });
    return { cost: U.round2(cost), retail: U.round2(retail) };
  };

  SF.salesInRange = function (from, to) {
    return DB.sales.filter(function (s) { return s.date >= from && s.date <= to; });
  };

  SF.summarize = function (sales) {
    var r = { count: sales.length, revenue: 0, total: 0, profit: 0, tax: 0, discount: 0, outstanding: 0, unpaid: 0, units: 0 };
    sales.forEach(function (s) {
      r.revenue += s.net;
      r.total += s.total;
      r.profit += s.profit;
      r.tax += s.tax;
      r.discount += s.discount;
      var b = SF.balance(s);
      if (b > 0) { r.outstanding += b; r.unpaid++; }
      s.items.forEach(function (it) { r.units += it.qty; });
    });
    ['revenue', 'total', 'profit', 'tax', 'discount', 'outstanding'].forEach(function (k) { r[k] = U.round2(r[k]); });
    return r;
  };

  /** Net revenue for a single line after its share of the sale discount. */
  SF.lineNet = function (sale, item) {
    var line = item.qty * item.price;
    if (!sale.subtotal) return 0;
    return line - (sale.discount * line) / sale.subtotal;
  };

  SF.productSalesStats = function (sales) {
    var map = {};
    sales.forEach(function (s) {
      s.items.forEach(function (it) {
        var key = it.productId || it.name;
        if (!map[key]) {
          var p = SF.product(it.productId);
          map[key] = { productId: it.productId, name: p ? p.name : it.name, sku: p ? p.sku : it.sku || '', category: p ? p.category : it.category || 'Uncategorized', qty: 0, revenue: 0, profit: 0 };
        }
        var net = SF.lineNet(s, it);
        map[key].qty += it.qty;
        map[key].revenue += net;
        map[key].profit += net - it.qty * it.cost;
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  };

  SF.categoryStats = function (sales) {
    var map = {};
    SF.productSalesStats(sales).forEach(function (p) {
      var c = p.category || 'Uncategorized';
      if (!map[c]) map[c] = { category: c, revenue: 0, qty: 0, profit: 0 };
      map[c].revenue += p.revenue;
      map[c].qty += p.qty;
      map[c].profit += p.profit;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.revenue - a.revenue; });
  };

  /* ------------------------------------------------------------------------
     Inventory transactions
     ------------------------------------------------------------------------ */
  function logTx(product, type, change, reason, date, notes, ref) {
    var prev = product.stock;
    product.stock = prev + change;
    DB.transactions.push({
      id: U.uid('tx'),
      date: date || U.todayISO(),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: type,
      qty: change,
      prev: prev,
      next: product.stock,
      reason: reason || '',
      notes: notes || '',
      ref: ref || '',
      createdAt: new Date().toISOString()
    });
  }

  function fail(msg) {
    throw new Error(msg);
  }

  /* ------------------------------------------------------------------------
     Products
     ------------------------------------------------------------------------ */
  function cleanProduct(input) {
    var p = {
      name: String(input.name || '').trim(),
      sku: String(input.sku || '').trim().toUpperCase(),
      category: String(input.category || '').trim(),
      supplierId: input.supplierId || '',
      cost: U.round2(U.num(input.cost)),
      price: U.round2(U.num(input.price)),
      stock: Math.round(U.num(input.stock)),
      minStock: Math.max(0, Math.round(U.num(input.minStock))),
      unit: String(input.unit || 'pcs').trim() || 'pcs',
      status: input.status === 'Inactive' ? 'Inactive' : 'Active',
      description: String(input.description || '').trim()
    };
    if (!p.name) fail('Product name is required.');
    if (!p.sku) fail('SKU is required.');
    if (!p.category) fail('Category is required.');
    if (p.cost < 0 || p.price < 0) fail('Prices cannot be negative.');
    if (p.stock < 0) fail('Stock quantity cannot be negative.');
    return p;
  }

  SF.addProduct = function (input) {
    var p = cleanProduct(input);
    if (DB.products.some(function (x) { return x.sku === p.sku; })) fail('A product with SKU "' + p.sku + '" already exists.');
    var initial = p.stock;
    p.stock = 0;
    p.id = U.uid('prd');
    p.createdAt = new Date().toISOString();
    DB.products.push(p);
    if (initial > 0) logTx(p, 'Opening Stock', initial, 'Initial stock on product creation', U.todayISO());
    SF.save();
    return p;
  };

  SF.updateProduct = function (id, input) {
    var p = SF.product(id);
    if (!p) fail('Product not found.');
    var c = cleanProduct(input);
    if (DB.products.some(function (x) { return x.id !== id && x.sku === c.sku; })) fail('A product with SKU "' + c.sku + '" already exists.');
    var newStock = c.stock;
    delete c.stock;
    Object.assign(p, c);
    if (newStock !== p.stock) logTx(p, 'Adjustment', newStock - p.stock, 'Edited on product form', U.todayISO());
    SF.save();
    return p;
  };

  SF.deleteProduct = function (id) {
    var i = DB.products.findIndex(function (p) { return p.id === id; });
    if (i < 0) fail('Product not found.');
    DB.products.splice(i, 1);
    SF.save();
  };

  SF.productUsage = function (id) {
    return {
      sales: DB.sales.filter(function (s) { return s.items.some(function (it) { return it.productId === id; }); }).length,
      purchases: DB.purchases.filter(function (s) { return s.items.some(function (it) { return it.productId === id; }); }).length
    };
  };

  SF.suggestSku = function (category) {
    var prefix = String(category || 'GEN').replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase() || 'GEN';
    var n = 1001;
    var skus = {};
    DB.products.forEach(function (p) { skus[p.sku] = true; });
    while (skus[prefix + '-' + n]) n++;
    return prefix + '-' + n;
  };

  /* ------------------------------------------------------------------------
     Stock movements
     ------------------------------------------------------------------------ */
  SF.stockMove = function (mode, input) {
    var p = SF.product(input.productId);
    if (!p) fail('Please choose a product.');
    var qty = Math.round(U.num(input.qty, NaN));
    var date = input.date || U.todayISO();
    if (!U.isValidISO(date)) fail('Please enter a valid date.');
    var reason = String(input.reason || '').trim();
    if (!reason) fail('Please choose a reason.');
    if (mode === 'in') {
      if (!(qty > 0)) fail('Quantity must be greater than zero.');
      logTx(p, 'Stock In', qty, reason, date, input.notes);
    } else if (mode === 'out') {
      if (!(qty > 0)) fail('Quantity must be greater than zero.');
      if (qty > p.stock) fail('Only ' + p.stock + ' ' + p.unit + ' of ' + p.name + ' in stock.');
      logTx(p, 'Stock Out', -qty, reason, date, input.notes);
    } else {
      if (!(qty >= 0)) fail('New stock quantity must be zero or more.');
      if (qty === p.stock) fail('New quantity is the same as the current stock.');
      logTx(p, 'Adjustment', qty - p.stock, reason, date, input.notes);
    }
    SF.save();
    return p;
  };

  /* ------------------------------------------------------------------------
     Customers & Suppliers
     ------------------------------------------------------------------------ */
  function cleanContact(input, fields, required) {
    var out = {};
    fields.forEach(function (f) { out[f] = String(input[f] || '').trim(); });
    required.forEach(function (f) { if (!out[f]) fail('Please fill in all required fields.'); });
    if (out.email && !U.isValidEmail(out.email)) fail('Please enter a valid email address.');
    return out;
  }
  var CUSTOMER_FIELDS = ['name', 'company', 'phone', 'email', 'address', 'city', 'notes'];
  var SUPPLIER_FIELDS = ['name', 'contact', 'phone', 'email', 'address', 'notes'];

  SF.addCustomer = function (input) {
    var c = cleanContact(input, CUSTOMER_FIELDS, ['name']);
    c.id = U.uid('cus');
    c.createdAt = new Date().toISOString();
    DB.customers.push(c);
    SF.save();
    return c;
  };
  SF.updateCustomer = function (id, input) {
    var c = SF.customer(id);
    if (!c) fail('Customer not found.');
    Object.assign(c, cleanContact(input, CUSTOMER_FIELDS, ['name']));
    DB.sales.forEach(function (s) { if (s.customerId === id) s.customerName = c.name; });
    SF.save();
    return c;
  };
  SF.deleteCustomer = function (id) {
    var i = DB.customers.findIndex(function (c) { return c.id === id; });
    if (i < 0) fail('Customer not found.');
    DB.customers.splice(i, 1);
    SF.save();
  };
  SF.customerStats = function (id) {
    var sales = DB.sales.filter(function (s) { return s.customerId === id; });
    var r = SF.summarize(sales);
    var last = sales.reduce(function (m, s) { return s.date > m ? s.date : m; }, '');
    return { sales: sales, count: r.count, spent: r.total, outstanding: r.outstanding, lastPurchase: last };
  };

  SF.addSupplier = function (input) {
    var s = cleanContact(input, SUPPLIER_FIELDS, ['name']);
    s.id = U.uid('sup');
    s.createdAt = new Date().toISOString();
    DB.suppliers.push(s);
    SF.save();
    return s;
  };
  SF.updateSupplier = function (id, input) {
    var s = SF.supplier(id);
    if (!s) fail('Supplier not found.');
    Object.assign(s, cleanContact(input, SUPPLIER_FIELDS, ['name']));
    DB.purchases.forEach(function (p) { if (p.supplierId === id) p.supplierName = s.name; });
    SF.save();
    return s;
  };
  SF.deleteSupplier = function (id) {
    var i = DB.suppliers.findIndex(function (s) { return s.id === id; });
    if (i < 0) fail('Supplier not found.');
    DB.suppliers.splice(i, 1);
    DB.products.forEach(function (p) { if (p.supplierId === id) p.supplierId = ''; });
    SF.save();
  };
  SF.supplierStats = function (id) {
    var purchases = DB.purchases.filter(function (p) { return p.supplierId === id; });
    var total = 0, outstanding = 0;
    purchases.forEach(function (p) { total += p.total; outstanding += SF.balance(p); });
    return {
      purchases: purchases,
      products: DB.products.filter(function (p) { return p.supplierId === id; }),
      count: purchases.length,
      total: U.round2(total),
      outstanding: U.round2(outstanding)
    };
  };

  /* ------------------------------------------------------------------------
     Sales
     ------------------------------------------------------------------------ */
  function qtyMap(items) {
    var m = {};
    items.forEach(function (it) { if (it.productId) m[it.productId] = (m[it.productId] || 0) + it.qty; });
    return m;
  }

  function cleanPayment(input, total) {
    var status = SF.PAYMENT_STATUSES.indexOf(input.paymentStatus) >= 0 ? input.paymentStatus : 'Paid';
    var amountPaid = status === 'Paid' ? total : status === 'Pending' ? 0 : U.round2(U.num(input.amountPaid));
    if (status === 'Partially Paid') {
      if (!(amountPaid > 0)) fail('Enter the amount already paid for a partially paid record.');
      if (amountPaid >= total) fail('Amount paid must be less than the total. Mark it as Paid instead.');
    }
    return { paymentStatus: status, amountPaid: amountPaid };
  }

  function buildSale(input, existing) {
    var date = input.date;
    if (!U.isValidISO(date)) fail('Please enter a valid sale date.');
    var rawItems = (input.items || []).filter(function (it) { return it.productId; });
    if (!rawItems.length) fail('Add at least one product to the sale.');
    var seen = {};
    var items = rawItems.map(function (it) {
      var p = SF.product(it.productId);
      if (!p) fail('One of the selected products no longer exists.');
      if (seen[p.id]) fail(p.name + ' is listed more than once. Combine it into one line.');
      seen[p.id] = true;
      var qty = Math.round(U.num(it.qty, NaN));
      if (!(qty > 0)) fail('Quantity for ' + p.name + ' must be at least 1.');
      var price = U.round2(U.num(it.price, NaN));
      if (!(price >= 0)) fail('Enter a valid unit price for ' + p.name + '.');
      // Keep the original cost for lines that already existed on an edited sale.
      var oldLine = existing && existing.items.filter(function (o) { return o.productId === p.id; })[0];
      return { productId: p.id, name: p.name, sku: p.sku, category: p.category, unit: p.unit, qty: qty, price: price, cost: oldLine ? oldLine.cost : p.cost };
    });

    // Stock check (for an edit, the quantities already deducted are available again)
    var oldQty = existing ? qtyMap(existing.items) : {};
    items.forEach(function (it) {
      var p = SF.product(it.productId);
      var available = p.stock + (oldQty[p.id] || 0);
      if (it.qty > available) fail('Not enough stock for ' + p.name + '. Available: ' + available + ' ' + p.unit + '.');
    });

    var discountType = input.discountType === 'fixed' ? 'fixed' : 'percent';
    var discountValue = Math.max(0, U.round2(U.num(input.discountValue)));
    if (discountType === 'percent' && discountValue > 100) fail('Discount cannot be more than 100%.');
    var taxRate = Math.max(0, U.round2(U.num(input.taxRate)));
    var calc = SF.calcSale(items, discountType, discountValue, taxRate);
    if (discountType === 'fixed' && discountValue > calc.subtotal) fail('Discount cannot be larger than the subtotal.');
    var pay = cleanPayment(input, calc.total);
    var customer = input.customerId ? SF.customer(input.customerId) : null;
    if (input.customerId && !customer) fail('Selected customer no longer exists.');

    return {
      customerId: customer ? customer.id : '',
      customerName: customer ? customer.name : 'Walk-in Customer',
      date: date,
      items: items,
      discountType: discountType,
      discountValue: discountValue,
      taxRate: taxRate,
      subtotal: calc.subtotal,
      discount: calc.discount,
      net: calc.net,
      tax: calc.tax,
      total: calc.total,
      cost: calc.cost,
      profit: calc.profit,
      paymentMethod: SF.PAYMENT_METHODS.indexOf(input.paymentMethod) >= 0 ? input.paymentMethod : 'Cash',
      paymentStatus: pay.paymentStatus,
      amountPaid: pay.amountPaid,
      notes: String(input.notes || '').trim()
    };
  }

  SF.createSale = function (input) {
    var s = buildSale(input, null);
    DB.counters.sale += 1;
    s.id = U.uid('sal');
    s.number = 'INV-' + DB.counters.sale;
    s.createdAt = new Date().toISOString();
    s.items.forEach(function (it) {
      logTx(SF.product(it.productId), 'Sale', -it.qty, 'Sold on ' + s.number, s.date, '', s.number);
    });
    DB.sales.push(s);
    SF.save();
    return s;
  };

  SF.canEditSaleItems = function (sale) {
    return sale.items.every(function (it) { return !!SF.product(it.productId); });
  };

  SF.updateSale = function (id, input) {
    var sale = SF.sale(id);
    if (!sale) fail('Sale not found.');
    if (!SF.canEditSaleItems(sale)) fail('This sale contains a deleted product, so its items can no longer be edited.');
    var next = buildSale(input, sale);
    var oldQty = qtyMap(sale.items), newQty = qtyMap(next.items);
    var ids = Object.keys(Object.assign({}, oldQty, newQty));
    ids.forEach(function (pid) {
      var delta = (newQty[pid] || 0) - (oldQty[pid] || 0);
      if (delta !== 0) logTx(SF.product(pid), 'Sale Edited', -delta, 'Quantities changed on ' + sale.number, next.date, '', sale.number);
    });
    Object.assign(sale, next, { updatedAt: new Date().toISOString() });
    SF.save();
    return sale;
  };

  SF.updateSalePayment = function (id, input) {
    var sale = SF.sale(id);
    if (!sale) fail('Sale not found.');
    var pay = cleanPayment(input, sale.total);
    sale.paymentStatus = pay.paymentStatus;
    sale.amountPaid = pay.amountPaid;
    if (input.paymentMethod && SF.PAYMENT_METHODS.indexOf(input.paymentMethod) >= 0) sale.paymentMethod = input.paymentMethod;
    if (input.notes !== undefined) sale.notes = String(input.notes || '').trim();
    SF.save();
    return sale;
  };

  SF.deleteSale = function (id) {
    var i = DB.sales.findIndex(function (s) { return s.id === id; });
    if (i < 0) fail('Sale not found.');
    var sale = DB.sales[i];
    var restored = 0;
    sale.items.forEach(function (it) {
      var p = SF.product(it.productId);
      if (p) {
        logTx(p, 'Sale Cancelled', it.qty, 'Stock restored from ' + sale.number, U.todayISO(), '', sale.number);
        restored += it.qty;
      }
    });
    DB.sales.splice(i, 1);
    SF.save();
    return restored;
  };

  /* ------------------------------------------------------------------------
     Purchases
     ------------------------------------------------------------------------ */
  function buildPurchase(input, existing) {
    var supplier = SF.supplier(input.supplierId);
    if (!supplier) fail('Please choose a supplier.');
    if (!U.isValidISO(input.date)) fail('Please enter a valid purchase date.');
    var rawItems = (input.items || []).filter(function (it) { return it.productId; });
    if (!rawItems.length) fail('Add at least one product to the purchase.');
    var seen = {};
    var items = rawItems.map(function (it) {
      var p = SF.product(it.productId);
      if (!p) fail('One of the selected products no longer exists.');
      if (seen[p.id]) fail(p.name + ' is listed more than once. Combine it into one line.');
      seen[p.id] = true;
      var qty = Math.round(U.num(it.qty, NaN));
      if (!(qty > 0)) fail('Quantity for ' + p.name + ' must be at least 1.');
      var cost = U.round2(U.num(it.cost, NaN));
      if (!(cost >= 0)) fail('Enter a valid cost price for ' + p.name + '.');
      return { productId: p.id, name: p.name, sku: p.sku, unit: p.unit, qty: qty, cost: cost };
    });
    // Removing received units must not push stock below zero.
    var oldQty = existing ? qtyMap(existing.items) : {};
    var newQty = qtyMap(items);
    Object.keys(oldQty).forEach(function (pid) {
      var delta = (newQty[pid] || 0) - oldQty[pid];
      var p = SF.product(pid);
      if (p && delta < 0 && p.stock + delta < 0) fail('Cannot reduce ' + p.name + ' by ' + -delta + ' — only ' + p.stock + ' ' + p.unit + ' left in stock.');
    });
    var total = U.round2(items.reduce(function (s, it) { return s + it.qty * it.cost; }, 0));
    var pay = cleanPayment(input, total);
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: input.date,
      items: items,
      total: total,
      paymentStatus: pay.paymentStatus,
      amountPaid: pay.amountPaid,
      notes: String(input.notes || '').trim(),
      updateCost: !!input.updateCost
    };
  }

  function applyCostUpdate(purchase) {
    if (!purchase.updateCost) return;
    purchase.items.forEach(function (it) {
      var p = SF.product(it.productId);
      if (p) p.cost = it.cost;
    });
  }

  SF.createPurchase = function (input) {
    var pu = buildPurchase(input, null);
    DB.counters.purchase += 1;
    pu.id = U.uid('pur');
    pu.number = 'PO-' + DB.counters.purchase;
    pu.createdAt = new Date().toISOString();
    pu.items.forEach(function (it) {
      logTx(SF.product(it.productId), 'Purchase', it.qty, 'Received on ' + pu.number, pu.date, '', pu.number);
    });
    applyCostUpdate(pu);
    delete pu.updateCost;
    DB.purchases.push(pu);
    SF.save();
    return pu;
  };

  SF.canEditPurchaseItems = function (pu) {
    return pu.items.every(function (it) { return !!SF.product(it.productId); });
  };

  SF.updatePurchase = function (id, input) {
    var pu = SF.purchase(id);
    if (!pu) fail('Purchase not found.');
    if (!SF.canEditPurchaseItems(pu)) fail('This purchase contains a deleted product, so its items can no longer be edited.');
    var next = buildPurchase(input, pu);
    var oldQty = qtyMap(pu.items), newQty = qtyMap(next.items);
    Object.keys(Object.assign({}, oldQty, newQty)).forEach(function (pid) {
      var delta = (newQty[pid] || 0) - (oldQty[pid] || 0);
      if (delta !== 0) logTx(SF.product(pid), 'Purchase Edited', delta, 'Quantities changed on ' + pu.number, next.date, '', pu.number);
    });
    applyCostUpdate(next);
    delete next.updateCost;
    Object.assign(pu, next, { updatedAt: new Date().toISOString() });
    SF.save();
    return pu;
  };

  SF.updatePurchasePayment = function (id, input) {
    var pu = SF.purchase(id);
    if (!pu) fail('Purchase not found.');
    var pay = cleanPayment(input, pu.total);
    pu.paymentStatus = pay.paymentStatus;
    pu.amountPaid = pay.amountPaid;
    if (input.notes !== undefined) pu.notes = String(input.notes || '').trim();
    SF.save();
    return pu;
  };

  SF.deletePurchase = function (id) {
    var i = DB.purchases.findIndex(function (p) { return p.id === id; });
    if (i < 0) fail('Purchase not found.');
    var pu = DB.purchases[i];
    pu.items.forEach(function (it) {
      var p = SF.product(it.productId);
      if (p && p.stock < it.qty) fail('Cannot delete ' + pu.number + ': only ' + p.stock + ' of the ' + it.qty + ' ' + p.name + ' received are still in stock.');
    });
    pu.items.forEach(function (it) {
      var p = SF.product(it.productId);
      if (p) logTx(p, 'Purchase Cancelled', -it.qty, 'Stock removed — ' + pu.number + ' deleted', U.todayISO(), '', pu.number);
    });
    DB.purchases.splice(i, 1);
    SF.save();
  };

  /* ------------------------------------------------------------------------
     Settings
     ------------------------------------------------------------------------ */
  SF.saveSettings = function (input) {
    var s = DB.settings;
    var name = String(input.businessName || '').trim();
    if (!name) fail('Business name is required.');
    if (input.email && !U.isValidEmail(input.email)) fail('Please enter a valid email address.');
    var tax = U.num(input.taxRate, NaN);
    if (!(tax >= 0 && tax <= 100)) fail('Tax rate must be between 0 and 100.');
    s.businessName = name;
    s.phone = String(input.phone || '').trim();
    s.email = String(input.email || '').trim();
    s.address = String(input.address || '').trim();
    s.website = String(input.website || '').trim();
    s.currency = input.currency || 'USD';
    s.taxRate = U.round2(tax);
    s.dateFormat = input.dateFormat || 'MM/DD/YYYY';
    SF.resetFormatCache();
    SF.save();
  };

  /* ------------------------------------------------------------------------
     Initial business records (created only when no saved data exists)
     ------------------------------------------------------------------------ */
  function buildInitialData() {
    var d = emptyData();
    var prevDB = DB;
    DB = d;

    var seed = 20260415;
    function rand() {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function ri(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
    function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

    var today = U.todayISO();
    var stamp = function (iso, h) { return iso + 'T' + U.pad(h || 10) + ':00:00'; };

    var suppliers = [
      ['TechSource Distribution', 'Marcus Allen', '(415) 555-0192', 'orders@techsourcedist.com', '1800 Harrison St, San Francisco, CA 94103', 'Net 30 terms. Free shipping over $500.'],
      ['HomeGoods Wholesale Co.', 'Linda Park', '(206) 555-0137', 'sales@homegoodswholesale.com', '3301 1st Ave S, Seattle, WA 98134', 'Minimum order 24 units per item.'],
      ['Paperline Office Supply', 'Derek Holt', '(971) 555-0110', 'accounts@paperline.co', '715 SE Grand Ave, Portland, OR 97214', ''],
      ['Pure Botanics Ltd.', 'Sofia Marquez', '(541) 555-0176', 'wholesale@purebotanics.com', '88 Olive St, Eugene, OR 97401', 'Organic certified. Ships Tuesdays and Fridays.'],
      ['Summit Coffee Traders', 'James Okafor', '(503) 555-0163', 'trade@summitcoffee.com', '2210 NW Front Ave, Portland, OR 97209', 'Roast-to-order, 5 day lead time.'],
      ['ActiveGear Supply', 'Rachel Kim', '(916) 555-0124', 'b2b@activegear.com', '560 Bercut Dr, Sacramento, CA 95811', '']
    ].map(function (s, i) {
      return { id: 'sup_init' + (i + 1), name: s[0], contact: s[1], phone: s[2], email: s[3], address: s[4], notes: s[5], createdAt: stamp(U.addDays(today, -170)) };
    });
    d.suppliers = suppliers;

    // name, sku, category, supplier idx, cost, price, target stock, min, unit, status, description
    var P = [
      ['Wireless Bluetooth Earbuds', 'ELEC-1001', 'Electronics', 0, 18.5, 39.99, 42, 10, 'pcs', 'Active', 'True wireless earbuds with charging case, 24h battery life.'],
      ['USB-C Fast Charger 30W', 'ELEC-1002', 'Electronics', 0, 7.2, 19.99, 8, 15, 'pcs', 'Active', 'Compact PD wall charger compatible with phones and tablets.'],
      ['Portable Power Bank 10000mAh', 'ELEC-1003', 'Electronics', 0, 12.8, 29.99, 25, 10, 'pcs', 'Active', 'Slim power bank with dual USB output.'],
      ['HDMI Cable 2m', 'ELEC-1004', 'Electronics', 0, 2.1, 9.99, 0, 20, 'pcs', 'Active', 'High-speed 4K HDMI cable, braided.'],
      ['Stainless Steel Water Bottle 750ml', 'HOME-2001', 'Home & Kitchen', 1, 6.4, 22, 64, 20, 'pcs', 'Active', 'Double-wall insulated, keeps drinks cold for 24 hours.'],
      ['Ceramic Coffee Mug Set (4)', 'HOME-2002', 'Home & Kitchen', 1, 11, 28.5, 18, 8, 'set', 'Active', 'Set of four 12oz stoneware mugs.'],
      ['Bamboo Cutting Board', 'HOME-2003', 'Home & Kitchen', 1, 8.25, 24, 5, 10, 'pcs', 'Active', 'Large organic bamboo board with juice groove.'],
      ['Scented Soy Candle', 'HOME-2004', 'Home & Kitchen', 1, 4.1, 16, 37, 12, 'pcs', 'Active', 'Hand-poured soy wax candle, 40h burn time.'],
      ['A5 Hardcover Notebook', 'OFFI-3001', 'Office Supplies', 2, 3.2, 12.5, 120, 30, 'pcs', 'Active', '192 dotted pages, lay-flat binding.'],
      ['Gel Pen Pack (12)', 'OFFI-3002', 'Office Supplies', 2, 4.6, 11.99, 3, 15, 'pack', 'Active', 'Assorted colors, 0.7mm fine tip.'],
      ['Desk Organizer Tray', 'OFFI-3003', 'Office Supplies', 2, 9.4, 26, 14, 6, 'pcs', 'Active', 'Five-compartment wooden desk organizer.'],
      ['Organic Lavender Soap', 'CARE-4001', 'Personal Care', 3, 1.9, 7.5, 85, 25, 'pcs', 'Active', 'Cold-process bar soap with lavender essential oil.'],
      ['Natural Lip Balm', 'CARE-4002', 'Personal Care', 3, 1.2, 4.99, 0, 20, 'pcs', 'Active', 'Beeswax and shea butter lip balm.'],
      ['Argan Hair Oil 100ml', 'CARE-4003', 'Personal Care', 3, 7.8, 21, 22, 8, 'bottle', 'Active', 'Cold-pressed Moroccan argan oil.'],
      ['Premium Arabica Coffee Beans 1kg', 'BEVE-5001', 'Beverages', 4, 14.5, 32, 30, 10, 'bag', 'Active', 'Medium roast single-origin whole beans.'],
      ['Organic Green Tea (50 bags)', 'BEVE-5002', 'Beverages', 4, 4.3, 11.5, 48, 15, 'box', 'Active', 'Japanese sencha green tea bags.'],
      ['Non-Slip Yoga Mat', 'SPOR-6001', 'Sports & Fitness', 5, 11.6, 34.99, 16, 5, 'pcs', 'Active', '6mm TPE yoga mat with carry strap.'],
      ['Resistance Bands Set', 'SPOR-6002', 'Sports & Fitness', 5, 6.9, 19.99, 9, 10, 'set', 'Active', 'Five resistance levels with door anchor.'],
      ['Vintage Wall Clock', 'HOME-2005', 'Home & Kitchen', 1, 13.5, 38, 4, 2, 'pcs', 'Inactive', 'Discontinued line — remaining units only.']
    ];
    d.products = P.map(function (r, i) {
      return {
        id: 'prd_init' + (i + 1), name: r[0], sku: r[1], category: r[2], supplierId: suppliers[r[3]].id,
        cost: r[4], price: r[5], stock: 0, target: r[6], minStock: r[7], unit: r[8], status: r[9], description: r[10],
        createdAt: stamp(U.addDays(today, -165))
      };
    });

    var C = [
      ['Emily Carter', 'Carter Interiors', '(503) 555-0121', 'emily@carterinteriors.com', '1520 SE Hawthorne Blvd', 'Portland', 'Prefers card payments.'],
      ['Michael Brooks', '', '(503) 555-0187', 'mbrooks@mailbox.com', '88 N Mississippi Ave', 'Portland', ''],
      ['Sarah Nguyen', 'Bloom Café', '(971) 555-0145', 'sarah@bloomcafe.com', '240 NW 23rd Ave', 'Portland', 'Monthly coffee order.'],
      ['David Patel', 'Patel Dental Group', '(360) 555-0168', 'office@pateldental.com', '1100 Main St', 'Vancouver', 'Buys office supplies in bulk.'],
      ['Jessica Moore', '', '(503) 555-0193', 'jess.moore@inboxmail.com', '731 SW Salmon St', 'Portland', ''],
      ['Robert Chen', 'Chen & Co. Realty', '(503) 555-0154', 'robert@chenrealty.com', '4200 SW Corbett Ave', 'Portland', 'Client gifts every quarter.'],
      ['Amanda Wilson', 'Wellness Studio PDX', '(503) 555-0112', 'amanda@wellnesspdx.com', '915 NE Alberta St', 'Portland', 'Yoga studio — fitness items.'],
      ['Kevin Ramirez', '', '(541) 555-0139', 'k.ramirez@fastmail.com', '52 Oak St', 'Salem', ''],
      ['Olivia Thompson', 'Thompson Design Lab', '(503) 555-0175', 'olivia@thompsondesign.co', '600 SE Belmont St', 'Portland', ''],
      ['Daniel Foster', 'Foster Property Mgmt', '(503) 555-0106', 'dfoster@fosterpm.com', '2015 NE Broadway', 'Portland', 'Net 15 payment terms.'],
      ['Grace Lee', '', '(971) 555-0158', 'grace.lee@mailbox.com', '3321 SE Division St', 'Portland', ''],
      ['Nathan Hughes', 'Hughes Coworking', '(503) 555-0199', 'nathan@hughescowork.com', '120 SW Ash St', 'Portland', 'Stocks kitchen and office areas.']
    ];
    d.customers = C.map(function (r, i) {
      return { id: 'cus_init' + (i + 1), name: r[0], company: r[1], phone: r[2], email: r[3], address: r[4], city: r[5], notes: r[6], createdAt: stamp(U.addDays(today, -160 + i * 11)) };
    });

    var start = U.addDays(today, -150);
    var events = [];
    var active = d.products.filter(function (p) { return p.status === 'Active'; });
    // popularity weights
    var weights = active.map(function (p, i) { return [5, 3, 3, 2, 5, 3, 2, 4, 5, 3, 2, 4, 3, 2, 4, 3, 2, 2][i] || 2; });
    function pickProduct() {
      var total = weights.reduce(function (a, b) { return a + b; }, 0);
      var r = rand() * total;
      for (var i = 0; i < active.length; i++) { r -= weights[i]; if (r <= 0) return active[i]; }
      return active[0];
    }

    // Sales
    for (var day = 0; day <= 150; day++) {
      var date = U.addDays(start, day);
      var dow = U.parseISO(date).getDay();
      var growth = 0.8 + day / 150;
      var n = Math.round((rand() * 2.2 + (dow === 5 || dow === 6 ? 1 : 0)) * growth * 0.75);
      if (day === 150) n = Math.max(n, 3);
      for (var k = 0; k < n; k++) {
        var lines = ri(1, 3), items = [], used = {};
        for (var l = 0; l < lines; l++) {
          var p = pickProduct();
          if (used[p.id]) continue;
          used[p.id] = true;
          items.push({ productId: p.id, name: p.name, sku: p.sku, category: p.category, unit: p.unit, qty: ri(1, 3), price: p.price, cost: p.cost });
        }
        var cust = rand() < 0.25 ? null : pick(d.customers);
        var disc = rand() < 0.15 ? pick([5, 10]) : 0;
        var calc = SF.calcSale(items, 'percent', disc, 8);
        var age = 150 - day;
        var r = rand(), status = 'Paid';
        if (age < 30 && r < 0.12) status = 'Pending';
        else if (age < 45 && r < 0.2) status = 'Partially Paid';
        var paid = status === 'Paid' ? calc.total : status === 'Pending' ? 0 : U.round2(Math.floor(calc.total * 0.5));
        if (status === 'Partially Paid' && !(paid > 0 && paid < calc.total)) { status = 'Paid'; paid = calc.total; }
        events.push({
          kind: 'sale', date: date, order: k,
          doc: {
            id: 'sal_init' + (events.length + 1), customerId: cust ? cust.id : '', customerName: cust ? cust.name : 'Walk-in Customer',
            date: date, items: items, discountType: 'percent', discountValue: disc, taxRate: 8,
            subtotal: calc.subtotal, discount: calc.discount, net: calc.net, tax: calc.tax, total: calc.total, cost: calc.cost, profit: calc.profit,
            paymentMethod: pick(['Card', 'Card', 'Card', 'Cash', 'Cash', 'Bank Transfer', 'Other']),
            paymentStatus: status, amountPaid: paid, notes: '', createdAt: stamp(date, 9 + k)
          }
        });
      }
    }

    // Purchases every ~9-12 days
    var pday = 4;
    while (pday < 146) {
      var pdate = U.addDays(start, pday);
      var sup = pick(suppliers);
      var sp = d.products.filter(function (p) { return p.supplierId === sup.id && p.status === 'Active'; });
      var pitems = [];
      sp.forEach(function (p) { if (rand() < 0.75) pitems.push({ productId: p.id, name: p.name, sku: p.sku, unit: p.unit, qty: ri(2, 6) * 6, cost: p.cost }); });
      if (!pitems.length && sp.length) pitems.push({ productId: sp[0].id, name: sp[0].name, sku: sp[0].sku, unit: sp[0].unit, qty: 24, cost: sp[0].cost });
      if (pitems.length) {
        var ptotal = U.round2(pitems.reduce(function (s, it) { return s + it.qty * it.cost; }, 0));
        var pstatus = pday > 135 ? 'Pending' : pday > 120 ? 'Partially Paid' : 'Paid';
        events.push({
          kind: 'purchase', date: pdate, order: -1,
          doc: {
            id: 'pur_init' + (events.length + 1), supplierId: sup.id, supplierName: sup.name, date: pdate, items: pitems, total: ptotal,
            paymentStatus: pstatus, amountPaid: pstatus === 'Paid' ? ptotal : pstatus === 'Pending' ? 0 : U.round2(Math.round(ptotal * 0.4)),
            notes: pstatus === 'Pending' ? 'Invoice due in 30 days.' : '', createdAt: stamp(pdate, 8)
          }
        });
      }
      pday += ri(9, 12);
    }

    events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.order - b.order; });

    // Opening stock so that the running balance never dips below zero
    var sign = function (e) { return e.kind === 'sale' ? -1 : 1; };
    d.products.forEach(function (p) {
      var run = 0, min = 0;
      events.forEach(function (e) {
        e.doc.items.forEach(function (it) { if (it.productId === p.id) { run += sign(e) * it.qty; if (run < min) min = run; } });
      });
      var opening = Math.max(p.target - run, -min);
      p._opening = opening;
    });

    var openDate = U.addDays(start, -1);
    d.products.forEach(function (p) {
      if (p._opening > 0) logTx(p, 'Opening Stock', p._opening, 'Opening balance', openDate);
    });

    events.forEach(function (e) {
      if (e.kind === 'sale') {
        d.counters.sale += 1;
        e.doc.number = 'INV-' + d.counters.sale;
        e.doc.items.forEach(function (it) { logTx(SF.product(it.productId), 'Sale', -it.qty, 'Sold on ' + e.doc.number, e.date, '', e.doc.number); });
        d.sales.push(e.doc);
      } else {
        d.counters.purchase += 1;
        e.doc.number = 'PO-' + d.counters.purchase;
        e.doc.items.forEach(function (it) { logTx(SF.product(it.productId), 'Purchase', it.qty, 'Received on ' + e.doc.number, e.date, '', e.doc.number); });
        d.purchases.push(e.doc);
      }
    });

    // Physical count corrections bring every product to its intended level
    var countDate = U.addDays(today, -2);
    d.products.forEach(function (p) {
      if (p.stock !== p.target) {
        var diff = p.target - p.stock;
        logTx(p, diff > 0 ? 'Stock In' : 'Stock Out', diff, diff > 0 ? 'Stock Count Correction' : pick(['Damaged', 'Stock Count Correction', 'Internal Use']), countDate, 'Monthly stock count');
      }
      delete p.target;
      delete p._opening;
    });

    DB = prevDB;
    return d;
  }
})();
