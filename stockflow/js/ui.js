/* ==========================================================================
   StockFlow — UI toolkit
   Icons, toasts, modals, confirmation dialogs, badges and SVG charts.
   ========================================================================== */
(function () {
  'use strict';

  var SF = window.SF;
  var U = SF.util;
  var ui = (SF.ui = {});

  /* ------------------------------------------------------------------------
     Icons (inline SVG, stroke based)
     ------------------------------------------------------------------------ */
  var ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    products: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    inventory: '<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8"/><line x1="7" y1="17" x2="17" y2="17"/>',
    sales: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    customers: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    suppliers: '<rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    purchases: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    reports: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    trending: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    arrowDown: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    arrowUp: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 15"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 13h2"/><path d="M2 10h20"/><path d="M6 6V4h12v2"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/>',
    printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M10 22v-4h4v4"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    box: '<path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>'
  };
  ui.icon = function (name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  };

  /* ------------------------------------------------------------------------
     Small render helpers
     ------------------------------------------------------------------------ */
  var AVATAR_TONES = ['tone-blue', 'tone-teal', 'tone-green', 'tone-amber', 'tone-violet', 'tone-red'];
  ui.initials = function (name) {
    var parts = String(name || '?').trim().split(/\s+/).filter(function (w) { return /^[a-z]/i.test(w); });
    if (!parts.length) parts = [String(name || '?').trim() || '?'];
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  };
  ui.avatar = function (name, round) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return '<span class="avatar ' + (round ? 'round ' : '') + AVATAR_TONES[h % AVATAR_TONES.length] + '">' + U.esc(ui.initials(name)) + '</span>';
  };

  ui.badge = function (text, tone, plain) {
    return '<span class="badge badge-' + tone + (plain ? ' plain' : '') + '">' + U.esc(text) + '</span>';
  };
  ui.stockBadge = function (p) {
    var s = SF.stockStatus(p);
    return ui.badge(s, s === 'In Stock' ? 'success' : s === 'Low Stock' ? 'warning' : 'danger');
  };
  ui.paymentBadge = function (status) {
    return ui.badge(status, status === 'Paid' ? 'success' : status === 'Pending' ? 'danger' : 'warning');
  };
  ui.statusBadge = function (status) {
    return ui.badge(status, status === 'Active' ? 'blue' : 'muted');
  };
  ui.txBadge = function (type) {
    var tone = { 'Stock In': 'success', 'Purchase': 'success', 'Opening Stock': 'info', 'Stock Out': 'warning', 'Sale': 'blue', 'Adjustment': 'muted', 'Sale Cancelled': 'info', 'Sale Edited': 'muted', 'Purchase Edited': 'muted', 'Purchase Cancelled': 'danger' }[type] || 'muted';
    return ui.badge(type, tone, true);
  };

  ui.empty = function (icon, title, text, actionHtml, small) {
    return '<div class="empty' + (small ? ' small' : '') + '"><div class="empty-icon">' + ui.icon(icon) + '</div><h4>' + U.esc(title) + '</h4><p>' + U.esc(text) + '</p>' + (actionHtml || '') + '</div>';
  };

  ui.sortTh = function (label, key, state, cls) {
    var sorted = state.sort === key;
    var ind = sorted ? (state.dir === 'asc' ? '▲' : '▼') : '▲▼';
    return '<th class="sortable' + (sorted ? ' sorted' : '') + (cls ? ' ' + cls : '') + '" data-sort="' + key + '">' + U.esc(label) + '<span class="sort-ind">' + ind + '</span></th>';
  };

  ui.options = function (list, selected, placeholder) {
    var html = placeholder !== undefined ? '<option value="">' + U.esc(placeholder) + '</option>' : '';
    list.forEach(function (o) {
      var value = typeof o === 'object' ? o.value : o;
      var label = typeof o === 'object' ? o.label : o;
      html += '<option value="' + U.esc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + (o.disabled ? ' disabled' : '') + '>' + U.esc(label) + '</option>';
    });
    return html;
  };

  /* ------------------------------------------------------------------------
     Toasts
     ------------------------------------------------------------------------ */
  ui.toast = function (message, type) {
    type = type || 'success';
    var host = document.getElementById('toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = '<span class="t-icon">' + ui.icon(type === 'success' ? 'check' : type === 'error' ? 'x' : 'info') + '</span><span>' + U.esc(message) + '</span>';
    host.appendChild(el);
    while (host.children.length > 4) host.removeChild(host.firstChild);
    setTimeout(function () {
      el.classList.add('hide');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, type === 'error' ? 5000 : 3200);
  };

  /* ------------------------------------------------------------------------
     Modals
     ------------------------------------------------------------------------ */
  var stack = [];

  ui.openModal = function (opts) {
    var root = document.createElement('div');
    root.className = 'modal-root' + (opts.rootClass ? ' ' + opts.rootClass : '');
    root.innerHTML =
      '<div class="modal ' + (opts.size || '') + (opts.modalClass ? ' ' + opts.modalClass : '') + '" role="dialog" aria-modal="true" aria-label="' + U.esc(opts.title) + '">' +
      '<div class="modal-head"><h2>' + U.esc(opts.title) + '</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + ui.icon('x') + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '') +
      '</div>';
    document.getElementById('modals').appendChild(root);
    document.body.style.overflow = 'hidden';
    var modal = root.querySelector('.modal');
    var entry = { root: root, modal: modal, onClose: opts.onClose, lastFocus: document.activeElement };
    stack.push(entry);

    root.addEventListener('mousedown', function (e) {
      entry.downOnBackdrop = e.target === root;
    });
    root.addEventListener('click', function (e) {
      if (e.target === root && entry.downOnBackdrop && !opts.static) ui.closeModal(modal);
      if (e.target.closest('[data-close]')) ui.closeModal(modal);
    });
    if (opts.onOpen) opts.onOpen(modal);
    var first = modal.querySelector('[autofocus]') || modal.querySelector('input:not([type=hidden]):not([readonly]), select, textarea');
    if (first && window.innerWidth > 760) setTimeout(function () { if (!modal.contains(document.activeElement)) first.focus(); }, 30);
    return modal;
  };

  ui.closeModal = function (modal) {
    var idx = -1;
    for (var i = stack.length - 1; i >= 0; i--) if (!modal || stack[i].modal === modal) { idx = i; break; }
    if (idx < 0) return;
    var entry = stack.splice(idx, 1)[0];
    if (entry.root.parentNode) entry.root.parentNode.removeChild(entry.root);
    if (!stack.length) document.body.style.overflow = '';
    if (entry.onClose) entry.onClose();
    if (entry.lastFocus && entry.lastFocus.focus && document.body.contains(entry.lastFocus)) {
      try { entry.lastFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
  };

  ui.closeAllModals = function () {
    while (stack.length) ui.closeModal(stack[stack.length - 1].modal);
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && stack.length) {
      e.preventDefault();
      ui.closeModal(stack[stack.length - 1].modal);
    }
  });

  /** Confirmation dialog — resolves true when the user confirms. */
  ui.confirm = function (opts) {
    return new Promise(function (resolve) {
      var done = false;
      var danger = opts.danger !== false;
      var modal = ui.openModal({
        title: opts.title || 'Please confirm',
        size: 'sm',
        rootClass: 'confirm-root',
        modalClass: 'confirm-modal',
        body:
          '<div class="confirm-body"><div class="confirm-icon ' + (danger ? 'tone-red' : 'tone-blue') + '">' + ui.icon(danger ? 'alert' : 'info') + '</div>' +
          '<div><h3>' + U.esc(opts.heading || opts.title || 'Are you sure?') + '</h3><p>' + (opts.html || U.esc(opts.message || '')) + '</p></div></div>',
        footer:
          '<button type="button" class="btn btn-outline" data-close>Cancel</button>' +
          '<button type="button" class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-confirm autofocus>' + U.esc(opts.confirmText || 'Confirm') + '</button>',
        onClose: function () { if (!done) resolve(false); }
      });
      modal.querySelector('[data-confirm]').addEventListener('click', function () {
        done = true;
        ui.closeModal(modal);
        resolve(true);
      });
      setTimeout(function () { var b = modal.querySelector('[data-confirm]'); if (b) b.focus(); }, 40);
    });
  };

  /* ------------------------------------------------------------------------
     Form helpers
     ------------------------------------------------------------------------ */
  ui.field = function (o) {
    var id = 'f_' + o.name;
    var req = o.required ? '<span class="req">*</span>' : '';
    var control;
    var attrs = ' id="' + id + '" name="' + o.name + '"' + (o.required ? ' required' : '') + (o.attrs ? ' ' + o.attrs : '');
    if (o.type === 'select') {
      control = '<select class="input"' + attrs + '>' + o.options + '</select>';
    } else if (o.type === 'textarea') {
      control = '<textarea class="input"' + attrs + ' placeholder="' + U.esc(o.placeholder || '') + '">' + U.esc(o.value) + '</textarea>';
    } else {
      control = '<input class="input" type="' + (o.type || 'text') + '"' + attrs + ' value="' + U.esc(o.value === undefined ? '' : o.value) + '" placeholder="' + U.esc(o.placeholder || '') + '">';
    }
    if (o.control) control = o.control;
    return '<div class="field' + (o.span ? ' span-' + o.span : '') + '" data-field="' + o.name + '">' +
      '<label for="' + id + '">' + U.esc(o.label) + req + '</label>' + control +
      (o.hint ? '<span class="hint">' + U.esc(o.hint) + '</span>' : '') +
      '<span class="error">' + U.esc(o.error || 'This field is required.') + '</span></div>';
  };

  ui.formData = function (form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') out[el.name] = el.checked;
      else out[el.name] = el.value;
    });
    return out;
  };

  /** Highlights empty required fields and custom rule failures. Returns true when valid. */
  ui.validate = function (form, rules) {
    var ok = true, firstBad = null;
    form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('has-error'); });
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !el.required) return;
      if (!String(el.value).trim()) {
        mark(el, 'This field is required.');
      }
    });
    (rules || []).forEach(function (r) {
      var el = form.elements[r.name];
      if (el && !el.closest('.has-error') && !r.test(el.value)) mark(el, r.message);
    });
    function mark(el, msg) {
      ok = false;
      var f = el.closest('.field');
      if (f) {
        f.classList.add('has-error');
        var e = f.querySelector('.error');
        if (e) e.textContent = msg;
      }
      if (!firstBad) firstBad = el;
    }
    if (firstBad) firstBad.focus();
    return ok;
  };

  /* ------------------------------------------------------------------------
     Charts (SVG, responsive, with hover tooltips)
     ------------------------------------------------------------------------ */
  var charts = [];
  var SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
  ui.SERIES = SERIES;

  function niceScale(max, ticks) {
    if (!(max > 0)) return { max: 1, step: 0.25 };
    var raw = max / ticks;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    return { max: Math.ceil(max / step) * step, step: step };
  }

  function svgEl(w, h, inner) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img">' + inner + '</svg>';
  }

  function tooltip(container) {
    var tip = container.querySelector('.chart-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'chart-tip';
      container.appendChild(tip);
    }
    return {
      show: function (html, x, y) {
        tip.innerHTML = html;
        var cw = container.clientWidth;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
        tip.classList.add('show');
        var tw = tip.offsetWidth;
        var shift = 0;
        if (x - tw / 2 < 0) shift = tw / 2 - x;
        if (x + tw / 2 > cw) shift = cw - x - tw / 2;
        tip.style.left = x + shift + 'px';
      },
      hide: function () { tip.classList.remove('show'); }
    };
  }

  function tipHtml(title, rows) {
    return '<div class="tip-title">' + U.esc(title) + '</div>' + rows.map(function (r) {
      return '<div class="tip-row">' + (r.color ? '<i style="background:' + r.color + '"></i>' : '') + '<span>' + U.esc(r.label) + '</span><b>' + U.esc(r.value) + '</b></div>';
    }).join('');
  }

  function roundedTopRect(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }

  ui.legend = function (series) {
    return '<div class="legend">' + series.map(function (s) {
      return '<span><i style="background:' + s.color + '"></i>' + U.esc(s.name) + '</span>';
    }).join('') + '</div>';
  };

  function labelEvery(n, width, perLabel) {
    var fit = Math.max(1, Math.floor(width / perLabel));
    return Math.max(1, Math.ceil(n / fit));
  }

  /**
   * Vertical bar chart (one or more series, grouped).
   * cfg: { labels, tipLabels?, series: [{ name, color, values }], format, height }
   */
  function drawBar(el, cfg) {
    var W = Math.max(280, el.clientWidth || 600), H = cfg.height || 260;
    var m = { t: 12, r: 8, b: 28, l: 56 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var n = cfg.labels.length, sc = cfg.series.length;
    var max = 0;
    cfg.series.forEach(function (s) { s.values.forEach(function (v) { if (v > max) max = v; }); });
    var scale = niceScale(max, 4);
    var band = iw / Math.max(1, n);
    var gap = 2;
    var groupW = Math.min(band * 0.72, 18 * sc + gap * (sc - 1) + 20);
    var barW = Math.max(2, (groupW - gap * (sc - 1)) / sc);
    var y = function (v) { return m.t + ih - (v / scale.max) * ih; };
    var out = '';
    for (var t = 0; t <= scale.max + 1e-9; t += scale.step) {
      var yy = Math.round(y(t)) + 0.5;
      out += '<line class="grid-line" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + yy + '" y2="' + yy + '"/>';
      out += '<text class="axis-text" x="' + (m.l - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + U.esc(cfg.axisFormat ? cfg.axisFormat(t) : t) + '</text>';
    }
    var every = labelEvery(n, iw, 54);
    for (var i = 0; i < n; i++) {
      var gx = m.l + band * i + (band - groupW) / 2;
      out += '<g class="bar-group" data-i="' + i + '">';
      out += '<rect class="hit" x="' + (m.l + band * i) + '" y="' + m.t + '" width="' + band + '" height="' + ih + '"/>';
      cfg.series.forEach(function (s, si) {
        var v = s.values[i] || 0;
        var h = ih * (v / scale.max);
        out += '<path class="bar" fill="' + s.color + '" d="' + roundedTopRect(gx + si * (barW + gap), y(v), barW, Math.max(0, h), 4) + '"/>';
      });
      out += '</g>';
      if (i % every === 0) out += '<text class="axis-text" x="' + (m.l + band * i + band / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + U.esc(cfg.labels[i]) + '</text>';
    }
    out += '<line class="axis-line" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (m.t + ih + 0.5) + '" y2="' + (m.t + ih + 0.5) + '"/>';
    el.innerHTML = svgEl(W, H, out);
    var tip = tooltip(el);
    el.querySelectorAll('.bar-group').forEach(function (g) {
      g.addEventListener('mouseenter', function () {
        var i = +g.getAttribute('data-i');
        var maxV = Math.max.apply(null, cfg.series.map(function (s) { return s.values[i] || 0; }));
        tip.show(tipHtml((cfg.tipLabels || cfg.labels)[i], cfg.series.map(function (s) {
          return { label: s.name, value: cfg.format(s.values[i] || 0), color: s.color };
        })), m.l + band * i + band / 2, y(maxV));
      });
      g.addEventListener('mouseleave', tip.hide);
    });
  }

  /**
   * Line chart with crosshair tooltip.
   * cfg: { labels, tipLabels?, series: [{ name, color, values }], format, axisFormat, height, area }
   */
  function drawLine(el, cfg) {
    var W = Math.max(280, el.clientWidth || 600), H = cfg.height || 260;
    var m = { t: 14, r: 14, b: 28, l: 56 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var n = cfg.labels.length;
    var max = 0, min = 0;
    cfg.series.forEach(function (s) { s.values.forEach(function (v) { if (v > max) max = v; if (v < min) min = v; }); });
    var scale = niceScale(max - min, 4);
    var lo = min < 0 ? -Math.ceil(-min / scale.step) * scale.step : 0;
    var hi = lo + Math.max(scale.max, scale.step);
    while (hi < max) hi += scale.step;
    var x = function (i) { return n <= 1 ? m.l + iw / 2 : m.l + (iw * i) / (n - 1); };
    var y = function (v) { return m.t + ih - ((v - lo) / (hi - lo)) * ih; };
    var out = '';
    for (var t = lo; t <= hi + 1e-9; t += scale.step) {
      var yy = Math.round(y(t)) + 0.5;
      out += '<line class="' + (Math.abs(t) < 1e-9 ? 'axis-line' : 'grid-line') + '" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + yy + '" y2="' + yy + '"/>';
      out += '<text class="axis-text" x="' + (m.l - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + U.esc(cfg.axisFormat ? cfg.axisFormat(t) : t) + '</text>';
    }
    var every = labelEvery(n, iw, 58);
    for (var i = 0; i < n; i += every) {
      out += '<text class="axis-text" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + U.esc(cfg.labels[i]) + '</text>';
    }
    cfg.series.forEach(function (s, si) {
      var pts = s.values.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); });
      if (cfg.area && si === 0 && n > 1) {
        out += '<path d="M' + pts.join('L') + 'L' + x(n - 1) + ',' + y(Math.max(lo, 0)) + 'L' + x(0) + ',' + y(Math.max(lo, 0)) + 'Z" fill="' + s.color + '" opacity="0.1"/>';
      }
      out += '<polyline fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + pts.join(' ') + '"/>';
      if (n <= 16) {
        s.values.forEach(function (v, i) {
          out += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.5" fill="' + s.color + '" stroke="#fff" stroke-width="2"/>';
        });
      }
    });
    out += '<line class="hover-line" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ih) + '" style="display:none"/>';
    cfg.series.forEach(function (s, si) {
      out += '<circle class="hover-dot" data-s="' + si + '" r="5" fill="' + s.color + '" stroke="#fff" stroke-width="2" style="display:none;pointer-events:none"/>';
    });
    out += '<rect class="hit" x="' + m.l + '" y="' + m.t + '" width="' + iw + '" height="' + ih + '"/>';
    el.innerHTML = svgEl(W, H, out);
    var svg = el.querySelector('svg');
    var hit = svg.querySelector('.hit'), line = svg.querySelector('.hover-line');
    var dots = svg.querySelectorAll('.hover-dot');
    var tip = tooltip(el);
    function move(e) {
      var rect = svg.getBoundingClientRect();
      var px = ((e.clientX - rect.left) / rect.width) * W;
      var i = n <= 1 ? 0 : Math.round(((px - m.l) / iw) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      var xx = x(i);
      line.setAttribute('x1', xx); line.setAttribute('x2', xx); line.style.display = '';
      var topY = H;
      cfg.series.forEach(function (s, si) {
        var yy = y(s.values[i] || 0);
        if (yy < topY) topY = yy;
        dots[si].setAttribute('cx', xx); dots[si].setAttribute('cy', yy); dots[si].style.display = '';
      });
      var scaleF = rect.width / W;
      tip.show(tipHtml((cfg.tipLabels || cfg.labels)[i], cfg.series.map(function (s) {
        return { label: s.name, value: cfg.format(s.values[i] || 0), color: s.color };
      })), xx * scaleF, topY * scaleF);
    }
    function leave() {
      line.style.display = 'none';
      dots.forEach(function (d) { d.style.display = 'none'; });
      tip.hide();
    }
    hit.addEventListener('mousemove', move);
    hit.addEventListener('mouseleave', leave);
    hit.addEventListener('touchstart', function (e) { if (e.touches[0]) move(e.touches[0]); }, { passive: true });
  }

  /** Donut chart. cfg: { data: [{ label, value, color }], format, centerLabel } */
  function drawDonut(el, cfg) {
    var S = 190, R = 88, r = 58, cx = S / 2, cy = S / 2;
    var total = cfg.data.reduce(function (a, d) { return a + Math.max(0, d.value); }, 0);
    var out = '';
    if (!(total > 0)) {
      out = '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + r) / 2 + '" fill="none" stroke="#eef1f5" stroke-width="' + (R - r) + '"/>';
    } else {
      var a0 = -Math.PI / 2;
      cfg.data.forEach(function (d, i) {
        var frac = Math.max(0, d.value) / total;
        if (frac <= 0) return;
        var a1 = a0 + frac * Math.PI * 2;
        var large = a1 - a0 > Math.PI ? 1 : 0;
        var path;
        if (frac >= 0.9999) {
          path = 'M' + cx + ',' + (cy - R) + 'A' + R + ',' + R + ' 0 1 1 ' + (cx - 0.01) + ',' + (cy - R) + 'L' + (cx - 0.01) + ',' + (cy - r) + 'A' + r + ',' + r + ' 0 1 0 ' + cx + ',' + (cy - r) + 'Z';
        } else {
          path = 'M' + (cx + R * Math.cos(a0)) + ',' + (cy + R * Math.sin(a0)) +
            'A' + R + ',' + R + ' 0 ' + large + ' 1 ' + (cx + R * Math.cos(a1)) + ',' + (cy + R * Math.sin(a1)) +
            'L' + (cx + r * Math.cos(a1)) + ',' + (cy + r * Math.sin(a1)) +
            'A' + r + ',' + r + ' 0 ' + large + ' 0 ' + (cx + r * Math.cos(a0)) + ',' + (cy + r * Math.sin(a0)) + 'Z';
        }
        out += '<path class="seg" data-i="' + i + '" d="' + path + '" fill="' + d.color + '" stroke="#fff" stroke-width="2" style="cursor:pointer"/>';
        a0 = a1;
      });
    }
    out += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" style="font-size:17px;font-weight:750;fill:#0f1b2d;font-family:inherit">' + U.esc(cfg.centerValue || '') + '</text>';
    out += '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" class="axis-text">' + U.esc(cfg.centerLabel || '') + '</text>';
    el.innerHTML = svgEl(S, S, out);
    var tip = tooltip(el);
    el.querySelectorAll('.seg').forEach(function (seg) {
      seg.addEventListener('mousemove', function (e) {
        var d = cfg.data[+seg.getAttribute('data-i')];
        var rect = el.getBoundingClientRect();
        tip.show(tipHtml(d.label, [{ label: 'Revenue', value: cfg.format(d.value), color: d.color }, { label: 'Share', value: ((d.value / total) * 100).toFixed(1) + '%' }]), e.clientX - rect.left, e.clientY - rect.top);
      });
      seg.addEventListener('mouseleave', tip.hide);
    });
  }

  var DRAW = { bar: drawBar, line: drawLine, donut: drawDonut };

  ui.chart = function (el, type, cfg) {
    if (!el) return;
    el.classList.add('chart');
    charts = charts.filter(function (c) { return document.body.contains(c.el) && c.el !== el; });
    charts.push({ el: el, type: type, cfg: cfg, w: el.clientWidth });
    DRAW[type](el, cfg);
  };

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      charts = charts.filter(function (c) { return document.body.contains(c.el); });
      charts.forEach(function (c) {
        if (c.type !== 'donut' && c.el.clientWidth !== c.w) {
          c.w = c.el.clientWidth;
          DRAW[c.type](c.el, c.cfg);
        }
      });
    }, 120);
  });

  /* ------------------------------------------------------------------------
     File download helper (for backups / CSV export)
     ------------------------------------------------------------------------ */
  ui.download = function (filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.parentNode.removeChild(a); }, 200);
  };

  ui.csv = function (rows) {
    return rows.map(function (r) {
      return r.map(function (v) {
        var s = String(v === undefined || v === null ? '' : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');
  };
})();
