/* Teck Tai – site behaviour. Classic script (no modules) so it also runs from disk (file://).
   Header state, mobile menu, contact tab, enquiry list + tray, cookie banner, search field, demo forms. */
(function () {
  'use strict';
  var d = document, body = d.body;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  // Storage that never throws (private windows, file:// quirks).
  var store = {
    get: function (k, f) { try { var v = localStorage.getItem(k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  // Root of the site, so links work both on a server and from disk.
  var root = (d.querySelector('meta[name="tt-root"]') || {}).content || '/';
  window.TT = window.TT || {};
  window.TT.root = root;
  window.TT.store = store;
  // Root-relative path → link that works here. On a server: unchanged. From disk (portable copy,
  // tt-root is e.g. "../../"): relative, with index.html added to folder paths.
  window.TT.link = function (path) {
    if (root === '/' || !path || path.charAt(0) !== '/') return path;
    var m = path.match(/^([^?#]*)(.*)$/), p = m[1].slice(1), tail = m[2];
    if (p === '' || p.slice(-1) === '/') p += 'index.html';
    return root + p + tail;
  };

  /* Measurement (SEO-2). Google Analytics 4 with Consent Mode v2: every storage type is denied by default
     and nothing is requested from Google until the visitor accepts. No personal data goes into any event. */
  function meta(n) { var m = d.querySelector('meta[name="' + n + '"]'); return m ? m.content : ''; }
  var endpoint = meta('tt-form'), ga4 = meta('tt-ga4'), loadedAt = Date.now(), gaOn = false;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (ga4) gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  function startGA() {
    if (!ga4 || gaOn) return;
    gaOn = true;
    gtag('consent', 'update', { analytics_storage: 'granted' }); // ads stay denied
    gtag('js', new Date());
    gtag('config', ga4, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var g = d.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4);
    d.head.appendChild(g);
  }
  function pageType() {
    var parts = location.pathname.split('/').filter(function (x) { return x && x !== 'index.html'; });
    var known = ['products', 'custom-and-packaging', 'contact', 'guides', 'about', 'collections', 'styles', 'privacy', 'thank-you'];
    var i = -1; parts.forEach(function (x, n) { if (i < 0 && known.indexOf(x) > -1) i = n; });
    if (i < 0) return d.querySelector('[data-404]') ? 'other' : 'home';
    var name = parts[i], rest = parts.length - i - 1;
    if (name === 'products') return parts[i + 1] === 'search' ? 'search' : rest === 0 ? 'products_hub' : rest === 1 ? 'category' : 'product';
    return name === 'custom-and-packaging' ? 'custom' : name === 'thank-you' ? 'thank_you' : name;
  }
  /** Send an event only after consent. cb runs when it is sent (or at once with no consent), so a page change can wait for it. */
  function track(name, params, cb) {
    if (!gaOn) { if (cb) cb(); return; }
    var done = false, fin = function () { if (!done) { done = true; if (cb) cb(); } };
    params = params || {}; params.page_type = pageType();
    if (cb) { params.event_callback = fin; params.transport_type = 'beacon'; setTimeout(fin, 500); }
    gtag('event', name, params);
  }
  window.TT.track = track;
  // Campaign tags on the landing URL are kept for this tab only and sent with an enquiry.
  try {
    var q0 = new URLSearchParams(location.search), u0 = {}, any = false;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) { var v = q0.get(k); if (v) { u0[k] = v.slice(0, 100); any = true; } });
    if (any) sessionStorage.setItem('tt-utm', JSON.stringify(u0));
  } catch (e) {}
  function utm() { try { return JSON.parse(sessionStorage.getItem('tt-utm') || '{}'); } catch (e) { return {}; } }

  /* Header: solid once scrolled */
  var hdr = $('[data-header]');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Mobile menu */
  var menu = $('[data-menu]');
  var openBtn = $('[data-menu-open]');
  function setMenu(open) {
    if (!menu) return;
    menu.hidden = !open;
    body.classList.toggle('menu-open', open);
    if (openBtn) openBtn.setAttribute('aria-expanded', String(open));
    if (open) { var c = $('[data-menu-close]'); if (c) c.focus(); } else if (openBtn) openBtn.focus();
  }
  if (openBtn) openBtn.addEventListener('click', function () { setMenu(true); });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && !menu.hidden) setMenu(false); });

  /* Popovers: contact tab and tray */
  function popover(btn, panel, onToggle) {
    if (!btn || !panel) return;
    btn.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (onToggle) onToggle(open);
    });
    d.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (onToggle) onToggle(false);
      }
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (onToggle) onToggle(false); btn.focus(); }
    });
  }
  var ctabLabel = $('[data-ctab-label]');
  popover($('[data-ctab-btn]'), $('#ctab-panel'), function (open) { if (ctabLabel) ctabLabel.textContent = open ? 'Close' : 'Contact us'; });

  /* Home from 1024 px (R3): while the hero's proof strip is in view, the contact tab sits 16 px above it, then
     returns to its place. A transform only, so nothing else moves. */
  var ctabEl = $('[data-ctab]'), proofStrip = $('.hero .proof');
  if (ctabEl && proofStrip && 'IntersectionObserver' in window) {
    var wide = window.matchMedia('(min-width: 1024px)'), stripSeen = false, ctabRaf = 0;
    var placeCtab = function () {
      ctabRaf = 0;
      var lift = 0;
      if (stripSeen && wide.matches) {
        var restBottom = window.innerHeight - (parseFloat(getComputedStyle(ctabEl).bottom) || 0);
        lift = Math.max(0, Math.round(restBottom - (proofStrip.getBoundingClientRect().top - 16)));
      }
      ctabEl.style.transform = lift ? 'translateY(' + -lift + 'px)' : '';
    };
    var queueCtab = function () { if (!ctabRaf) ctabRaf = window.requestAnimationFrame(placeCtab); };
    // First placement straight away (no transition), so the tab does not travel up after the page loads.
    var r0 = proofStrip.getBoundingClientRect();
    stripSeen = r0.top < window.innerHeight && r0.bottom > 0;
    ctabEl.style.transition = 'none'; placeCtab(); void ctabEl.offsetHeight; ctabEl.style.transition = '';
    new IntersectionObserver(function (entries) { stripSeen = entries[0].isIntersecting; queueCtab(); }).observe(proofStrip);
    window.addEventListener('scroll', function () { if (stripSeen) queueCtab(); }, { passive: true });
    window.addEventListener('resize', queueCtab);
  }

  /* Enquiry list (stored in the visitor's browser, no account) */
  var KEY = 'tt-enquiry';
  // Wording comes from quote-list.json (via the JSON block in Floating.astro); today's version A
  // wording is the fallback if the block is missing.
  var QL = { add: '+ Add to enquiry', added: '\u2713 In your enquiry', count: { one: '{n} item', other: '{n} items' },
    trayButton: { one: 'item in your enquiry', other: 'items in your enquiry' }, trayTitle: 'Your enquiry \u00b7 {count}',
    send: 'Get a quote for {count}', remove: 'Remove', formListTitleCount: 'From your enquiry list ({n})', toast: '', viewList: '' };
  try { var qlEl = d.getElementById('tt-quote-list'); if (qlEl) { var qlJ = JSON.parse(qlEl.textContent); for (var qk in qlJ) QL[qk] = qlJ[qk]; } } catch (err) {}
  function ql(s, n, name) {
    var count = (n === 1 ? QL.count.one : QL.count.other).replace('{n}', n);
    return String(s).replace('{count}', count).replace('{n}', n).replace('{name}', name || '');
  }
  function list() { return store.get(KEY, []); }
  function save(l) { store.set(KEY, l); render(); }
  function has(id) { return list().some(function (x) { return x.id === id; }); }
  function add(item) { var l = list(); if (!has(item.id)) { l.push(item); save(l); } }
  function remove(id) { save(list().filter(function (x) { return x.id !== id; })); }
  window.TT.enquiry = { list: list, add: add, remove: remove, has: has };

  var tray = $('[data-tray]'), trayPanel = $('#tray-panel'), trayBtn = $('[data-tray-btn]'), hdrEl = $('[data-header]');
  // R5: the panel opens from the header entry, anchored under the header (full-width sheet on phones).
  function headerBottom() { return hdrEl ? Math.max(0, Math.round(hdrEl.getBoundingClientRect().bottom)) : 0; }
  popover(trayBtn, trayPanel, function (open) { if (open && tray) tray.style.top = headerBottom() + 'px'; });
  var trayClose = $('[data-tray-close]');
  if (trayClose) trayClose.addEventListener('click', function () { trayPanel.hidden = true; trayBtn.setAttribute('aria-expanded', 'false'); trayBtn.focus(); });

  // Add-to-list toast (R5): top-right under the header; closes after 4 s, or waits to be dismissed with reduced motion.
  var toast = $('[data-qtoast-box]'), toastTimer = 0;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  function hideToast() { if (toast) toast.hidden = true; window.clearTimeout(toastTimer); }
  function showToast(name) {
    if (!toast || !QL.toast) return;
    toast.parentNode.style.top = (headerBottom() + 8) + 'px';
    $('[data-qtoast-msg]').textContent = ql(QL.toast, list().length, name);
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    if (!still.matches) toastTimer = window.setTimeout(hideToast, 4000);
  }
  if (toast) {
    $('[data-qtoast-close]').addEventListener('click', hideToast);
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !toast.hidden) hideToast(); });
    $('[data-qtoast-view]').addEventListener('click', function (e) {
      e.stopPropagation(); hideToast();
      if (trayBtn && trayPanel.hidden) trayBtn.click();
      if (trayBtn) trayBtn.focus();
    });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function href(path) { return window.TT.link ? window.TT.link(path) : path; }

  function render() {
    var l = list();
    if (tray) {
      tray.hidden = l.length === 0;
      $('[data-tray-n]').textContent = l.length;
      $('[data-tray-title]').textContent = ql(QL.trayTitle, l.length);
      $('[data-tray-send]').textContent = ql(QL.send, l.length);
      if (trayBtn) {
        trayBtn.hidden = l.length === 0;
        trayBtn.setAttribute('aria-label', (l.length === 1 ? QL.trayButton.one : QL.trayButton.other) + ', ' + ql('{count}', l.length));
        if (!l.length) { trayPanel.hidden = true; trayBtn.setAttribute('aria-expanded', 'false'); }
      }
      var ul = $('[data-tray-list]');
      ul.innerHTML = l.map(function (x) {
        return '<li><div class="tray__thumb">' + (x.img ? '<img src="' + esc(href(x.img)) + '" alt="">' : '') + '</div>' +
          '<div class="tray__info"><small>' + esc(x.id) + '</small><a href="' + esc(href(x.url)) + '">' + esc(x.name) + '</a></div>' +
          '<button type="button" class="tray__rm" data-remove="' + esc(x.id) + '">' + esc(QL.remove) + '</button></li>';
      }).join('');
      var send = $('[data-tray-send]');
      if (send) send.setAttribute('href', href('/contact/?interest=enquiry-list#quote'));
    }
    $$('[data-add]').forEach(function (b) {
      var on = has(b.getAttribute('data-add'));
      b.classList.toggle('is-added', on);
      b.textContent = on ? (b.getAttribute('data-added-text') || QL.added) : (b.getAttribute('data-add-text') || QL.add);
      b.setAttribute('aria-pressed', String(on));
    });
    d.dispatchEvent(new CustomEvent('tt:enquiry'));
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-add]');
    if (b) {
      var id = b.getAttribute('data-add');
      if (has(id)) remove(id);
      else { add({ id: id, name: b.getAttribute('data-add-name'), url: b.getAttribute('data-add-url'), img: b.getAttribute('data-add-img') }); track('enquiry_list_add', { item_id: id }); showToast(b.getAttribute('data-add-name')); }
      return;
    }
    var r = e.target.closest && e.target.closest('[data-remove]');
    if (r) { e.preventDefault(); remove(r.getAttribute('data-remove')); }
  });
  render();
  d.addEventListener('tt:refresh', render);

  /* Cookie banner. Accept starts Google Analytics (analytics storage only); Reject loads nothing. The choice is remembered. */
  var cookie = $('[data-cookie]');
  if (cookie && !store.get('tt-cookie', null)) { cookie.hidden = false; body.classList.add('has-cookie'); }
  if (store.get('tt-cookie', null) === 'accept') startGA();
  $$('[data-cookie-choice]').forEach(function (b) {
    b.addEventListener('click', function () {
      var choice = b.getAttribute('data-cookie-choice');
      store.set('tt-cookie', choice);
      cookie.hidden = true; body.classList.remove('has-cookie');
      if (choice === 'accept') startGA();
    });
  });

  /* Contact clicks: WhatsApp, email, WeChat (the ID is text, so a click on it counts). */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="https://wa.me/"], a[href^="mailto:"], [data-wechat]');
    if (!a) return;
    var h = a.getAttribute('href') || '';
    track(h.indexOf('mailto:') === 0 ? 'email_click' : h.indexOf('https://wa.me/') === 0 ? 'whatsapp_click' : 'wechat_open');
  });

  /* Search field: clear button */
  $$('[data-search-form]').forEach(function (f) {
    var input = $('input', f), clear = $('[data-search-clear]', f);
    var sync = function () { clear.hidden = !input.value; };
    input.addEventListener('input', sync); sync();
    clear.addEventListener('click', function () { input.value = ''; sync(); input.focus(); input.dispatchEvent(new Event('input')); });
    f.addEventListener('submit', function (e) {
      // From disk, a plain GET to a folder doesn't resolve: build the URL ourselves.
      e.preventDefault();
      var q = input.value.trim();
      location.href = href('/products/search/') + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  });

  /* Forms: validate, then (live) post to the form service, then go to Thank-you.
     Demo (no form endpoint): nothing is sent and nothing goes into the URL. */
  var params = new URLSearchParams(location.search);
  // Hidden field a person never sees; bots that fill every field give themselves away.
  function addHoneypot(form) {
    if (!endpoint || $('[name="website"]', form)) return;
    var w = d.createElement('div');
    w.setAttribute('aria-hidden', 'true');
    w.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
    w.innerHTML = '<label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
    form.appendChild(w);
  }
  // What the tick boxes mean for the enquiry type; the form's own default applies when nothing is ticked.
  var TYPE_OF = { 'product-quote': 'quote', samples: 'quote', other: 'quote', 'custom-project': 'custom_project', 'factory-tour': 'factory_tour', 'full-range': 'full_range', documents: 'documents' };
  var TYPE_ORDER = ['factory_tour', 'custom_project', 'documents', 'full_range', 'quote'];
  function enquiryType(form, ticked) {
    var def = form.getAttribute('data-enquiry-type') || 'quote';
    if (!ticked.length) return def;
    var found = ticked.map(function (v) { return TYPE_OF[v] || 'quote'; });
    for (var i = 0; i < TYPE_ORDER.length; i++) if (found.indexOf(TYPE_ORDER[i]) > -1) return TYPE_ORDER[i];
    return def;
  }
  function basePayload(form, extra) {
    var hp = $('[name="website"]', form), o = {
      page_url: location.href.split(/[?#]/)[0], utm: utm(), website: hp ? hp.value : '', elapsed_ms: Date.now() - loadedAt
    };
    for (var k in extra) o[k] = extra[k];
    return o;
  }
  function enquiryPayload(form) {
    var v = function (n) { var el = $('[name="' + n + '"]', form); return el ? (el.value || '').trim() : ''; };
    var boxes = $$('input[name="interest"]:checked', form), ticked = boxes.map(function (i) { return i.value; });
    var pt = $('[name="product-type"]', form), how = $('input[name="meeting"]:checked', form), sm = $('input[name="samples"]', form), items = [];
    if ($('[data-form-list]', form)) items = list().map(function (x) { return { id: x.id, name: x.name }; });
    else if (form.getAttribute('data-item-id')) items = [{ id: form.getAttribute('data-item-id'), name: form.getAttribute('data-item-name') || '' }];
    return basePayload(form, {
      form: 'enquiry', enquiry_type: enquiryType(form, ticked),
      company: v('company'), name: v('name'), email: v('email'), country: v('country'), message: v('message'),
      interests: boxes.map(function (i) { return i.getAttribute('data-label'); }),
      product_type: pt && pt.value ? pt.options[pt.selectedIndex].text : '',
      quantity: v('quantity'), samples: !!(sm && sm.checked) || ticked.indexOf('samples') > -1,
      meeting: how ? how.value : '', dates: v('dates'), items: items, how_found: v('source')
    });
  }
  // POST as text/plain with a JSON body: a "simple" request (no CORS preflight), which Apps Script accepts.
  // Success is only {ok:true}; a network error, a timeout or any other answer is a failure.
  function post(payload, ok, fail) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 25000);
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), redirect: 'follow', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); if (j && j.ok === true) ok(); else fail(); })
      .catch(function () { clearTimeout(timer); fail(); });
  }
  function sendErrorHtml(what) {
    return 'Sorry, we could not send ' + what + '. Nothing you typed has been lost. Please try again, or email <a href="' + esc(meta('tt-email') ? 'mailto:' + meta('tt-email') : '#') + '">' +
      esc(meta('tt-email')) + '</a> or <a href="' + esc(meta('tt-wa')) + '" target="_blank" rel="noopener">WhatsApp us</a>.';
  }
  $$('form[data-demo-form]').forEach(function (form) {
    // "What are you interested in?" tick boxes (B2). ?interest= presets one; the enquiry list means a product quote.
    var interest = (params.get('interest') || '').replace(/[^a-z0-9-]/g, '');
    if (interest === 'enquiry-list') interest = 'product-quote';
    var box0 = interest && $('input[name="interest"][value="' + interest + '"]', form);
    if (box0) box0.checked = true;
    // Ticking Factory tour opens the meeting group; unticking hides it and clears its answers.
    var tour = $('[data-meeting-toggle]', form), meet = $('[data-meeting]', form);
    var syncMeet = function () {
      if (!tour || !meet) return;
      meet.hidden = !tour.checked;
      if (!tour.checked) {
        $$('input', meet).forEach(function (i) { if (i.type === 'radio') i.checked = false; else i.value = ''; });
        var g = $('[data-radio-required]', meet); if (g) { g.classList.remove('has-error'); $('.field__err', g).textContent = ''; }
      }
    };
    if (tour) { tour.addEventListener('change', syncMeet); syncMeet(); }
    $$('select', form).forEach(function (s) {
      var f = function () { s.classList.toggle('is-placeholder', !s.value); };
      s.addEventListener('change', f); f();
    });

    // Enquiry list block above the message
    var box = $('[data-form-list]', form);
    var renderList = function () {
      if (!box) return;
      var l = list();
      box.hidden = l.length === 0;
      $('[data-form-list-title]', box).textContent = ql(QL.formListTitleCount, l.length);
      $('ul', box).innerHTML = l.map(function (x) {
        return '<li><div class="tray__thumb">' + (x.img ? '<img src="' + esc(href(x.img)) + '" alt="">' : '') + '</div><span>' + esc(x.id) + ' ' + esc(x.name) + '</span>' +
          '<button type="button" class="tray__rm" data-remove="' + esc(x.id) + '">' + esc(QL.remove) + '</button></li>';
      }).join('');
    };
    renderList();
    d.addEventListener('tt:enquiry', renderList);

    addHoneypot(form);

    // File upload name
    $$('input[type="file"]', form).forEach(function (fi) {
      var out = $('[data-file-name]', form), row = $('[data-file-row]', form);
      fi.addEventListener('change', function () {
        var f = fi.files && fi.files[0];
        if (row) row.hidden = !f;
        if (out && f) out.textContent = f.name + ' · ' + (f.size / 1048576).toFixed(1) + ' MB';
      });
      var rm = $('[data-file-remove]', form);
      if (rm) rm.addEventListener('click', function () { fi.value = ''; row.hidden = true; });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errs = [];
      $$('.field', form).forEach(function (fld) {
        var input = $('input, select, textarea', fld);
        var msg = $('.field__err', fld);
        if (!input || !msg) return;
        var bad = '';
        if (input.required && !input.value.trim()) bad = fld.getAttribute('data-required-msg') || 'Please fill in this field.';
        else if (input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value)) bad = 'Enter a full email address, e.g. name@company.com.';
        fld.classList.toggle('has-error', !!bad);
        msg.textContent = bad;
        input.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad) errs.push(input);
      });
      // Radio groups that are required while visible (the meeting choice).
      $$('[data-radio-required]', form).forEach(function (g) {
        var open = !g.closest('[hidden]');
        var bad = open && !$('input:checked', g);
        g.classList.toggle('has-error', !!bad);
        $('.field__err', g).textContent = bad ? g.getAttribute('data-required-msg') : '';
        if (bad) errs.push($('input', g));
      });
      var box2 = $('[data-form-errors]', form);
      if (errs.length) {
        // Summary line at the top; focus moves to it (Components v1.9 4.11, B2).
        if (box2) {
          box2.hidden = false;
          box2.className = 'form__errbox form__errbox--summary';
          box2.setAttribute('tabindex', '-1');
          box2.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v5.5M12 16.5h.01"></path></svg>' +
            'Please check the ' + (errs.length === 1 ? 'field' : errs.length + ' fields') + ' marked below.';
          box2.focus();
        } else errs[0].focus();
        return;
      }
      var sentSummary = function () {
        // Thank-you repeats what was sent (session only; nothing goes into the URL).
        try {
          var picked = $$('input[name="interest"]:checked', form).map(function (i) { return i.getAttribute('data-label'); });
          var how = $('input[name="meeting"]:checked', form), dates = $('input[name="dates"]', form);
          sessionStorage.setItem('tt-sent', JSON.stringify({
            interests: picked, tour: !!(tour && tour.checked), meeting: how ? how.value : '', dates: dates ? dates.value.trim() : ''
          }));
        } catch (e2) {}
      };
      var finish = function () {
        if (form.hasAttribute('data-clears-list')) store.set(KEY, []);
        location.href = href('/thank-you/');
      };
      if (!endpoint) { sentSummary(); finish(); return; } // demo: nothing is sent
      // Live: success only when the form service answers {ok:true}. Anything else keeps what was typed.
      var payload = enquiryPayload(form), btn = $('button[type="submit"]', form);
      if (form.getAttribute('data-sending')) return;
      form.setAttribute('data-sending', '1');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      post(payload, function () {
        sentSummary();
        track('generate_lead', { enquiry_type: payload.enquiry_type, how_found: payload.how_found || 'not_given' }, finish);
      }, function () {
        form.removeAttribute('data-sending');
        if (btn) { btn.disabled = false; btn.textContent = label; }
        if (box2) {
          box2.hidden = false; box2.className = 'form__errbox'; box2.setAttribute('tabindex', '-1');
          box2.innerHTML = sendErrorHtml('your enquiry');
          box2.focus();
        }
      });
    });
  });

  /* Season preview sign-up (B3): check on submit only; success replaces the form in place.
     Live: the address is posted to the form service; without an endpoint nothing is sent. */
  Array.prototype.forEach.call(d.querySelectorAll('form[data-signup]'), function (f) {
    var err0 = f.querySelector('.signup__err'), errText = err0 ? err0.textContent : '';
    addHoneypot(f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var band = f.closest('.signup'), input = f.querySelector('input[type="email"]'), err = f.querySelector('.signup__err');
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      band.classList.toggle('has-error', !ok);
      err.textContent = errText;
      err.hidden = ok;
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) { input.focus(); return; }
      var show = function () {
        f.hidden = true;
        var done = band.querySelector('.signup__ok'); done.hidden = false; done.setAttribute('tabindex', '-1'); done.focus();
      };
      if (!endpoint) { show(); return; }
      if (f.getAttribute('data-sending')) return;
      f.setAttribute('data-sending', '1');
      post(basePayload(f, { form: 'preview_signup', enquiry_type: 'preview_signup', email: input.value.trim() }), function () {
        show();
        track('generate_lead', { enquiry_type: 'preview_signup', how_found: 'not_given' });
      }, function () {
        f.removeAttribute('data-sending');
        err.innerHTML = sendErrorHtml('your sign-up'); err.hidden = false; band.classList.add('has-error');
      });
    });
  });

  /* Demo: ?demo=errors shows the form error state (for the overview page). */
  if (params.get('demo') === 'errors') {
    var f0 = $('form[data-demo-form]');
    if (f0) f0.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  /* WhatsApp links: name the page or product in the pre-filled message */
  var waText = body.getAttribute('data-wa');
  if (waText) $$('a[href^="https://wa.me/"]').forEach(function (a) {
    a.href = a.href.split('?')[0] + '?text=' + encodeURIComponent(waText);
  });
})();
