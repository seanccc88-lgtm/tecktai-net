/* Category filters and search results. Classic script (works from disk).
   Filters (HANDOFF 2/3): choices are written to the address as readable words (?finish=glitter,matte&style=nordic)
   and restored on load, so a buyer can share a filtered view. The canonical stays the clean category page and the
   controls are checkboxes, not links, so crawlers never follow a filtered URL. */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var grid = $('[data-grid]');
  if (!grid) return;

  // Cards for products on other pages (or every product, on the search page) live in a <template>.
  var tpl = $('template[data-more]');
  var pageCards = $$('.pcard', grid);
  var moreCards = [];
  if (tpl) {
    var holder = d.createElement('div');
    holder.appendChild(tpl.content.cloneNode(true));
    moreCards = $$('.pcard', holder);
    moreCards.forEach(function (c) { c.hidden = true; grid.appendChild(c); });
    // Let the enquiry buttons on newly added cards show their state.
    if (window.TT && window.TT.enquiry) d.dispatchEvent(new CustomEvent('tt:refresh'));
  }
  var cards = pageCards.concat(moreCards);
  var pager = $('[data-pager]'), empty = $('[data-empty]');

  // Relative links inside cards when the portable copy runs from disk.
  if (window.TT && window.TT.root !== '/') $$('a[href^="/"], img[src^="/"], source[srcset]', grid).forEach(function (el) {
    if (el.tagName === 'A') el.setAttribute('href', window.TT.link(el.getAttribute('href')));
    else if (el.tagName === 'IMG') { el.src = window.TT.link(el.getAttribute('src')); if (el.srcset) el.srcset = el.getAttribute('srcset').replace(/(^|, )\//g, '$1' + window.TT.root); }
    else el.srcset = el.getAttribute('srcset').replace(/(^|, )\//g, '$1' + window.TT.root);
  });

  /* ── Category filters ── */
  var filters = $('[data-filters]');
  if (filters) {
    var boxes = $$('input[type="checkbox"]', filters);
    var chips = $('[data-filters-chips]', filters);
    var count = $('[data-filter-count]');
    // Restore choices from the address (unknown words are ignored).
    var params0 = new URLSearchParams(location.search);
    boxes.forEach(function (b) {
      var want = (params0.get(b.name) || '').split(',');
      if (want.indexOf(b.value) > -1) b.checked = true;
    });
    // Write choices back to the address without reloading; other parameters are kept.
    var writeUrl = function (sel) {
      try {
        var u = new URL(location.href);
        $$('.fgroup', filters).forEach(function (g) { u.searchParams.delete(g.getAttribute('data-group')); });
        Object.keys(sel).forEach(function (k) { u.searchParams.set(k, sel[k].join(',')); });
        history.replaceState(null, '', u.pathname + (u.search ? u.search.replace(/%2C/g, ',') : '') + u.hash);
      } catch (e) { /* from disk some browsers refuse; the filter still works */ }
    };
    var apply = function (fromUser) {
      var sel = {};
      boxes.forEach(function (b) { if (b.checked) (sel[b.name] = sel[b.name] || []).push(b.value); });
      var active = Object.keys(sel).length > 0;
      var shown = 0;
      cards.forEach(function (c) {
        var ok = Object.keys(sel).every(function (k) {
          var vals = (c.getAttribute('data-f-' + k) || '').split('|');
          return sel[k].some(function (v) { return vals.indexOf(v) > -1; });
        });
        var onPage = pageCards.indexOf(c) > -1;
        c.hidden = active ? !ok : !onPage;
        if (!c.hidden) shown++;
      });
      if (pager) pager.hidden = active;
      if (empty) empty.hidden = shown > 0;
      var n = boxes.filter(function (b) { return b.checked; }).length;
      if (count) count.textContent = n ? ' (' + n + ')' : '';
      $$('[data-filters-clear]').forEach(function (b) { if (b.closest('.filters__head')) b.hidden = !n; });
      $$('.fgroup', filters).forEach(function (g) {
        var k = g.getAttribute('data-group'), m = (sel[k] || []).length;
        $('[data-group-count]', g).textContent = m ? ' · ' + m + ' selected' : '';
      });
      chips.innerHTML = '';
      boxes.forEach(function (b) {
        if (!b.checked) return;
        var lab = b.getAttribute('data-label') || b.value;
        var x = d.createElement('button'); x.type = 'button'; x.textContent = lab + ' ×';
        x.setAttribute('aria-label', 'Remove filter ' + lab);
        x.addEventListener('click', function () { b.checked = false; apply(true); });
        chips.appendChild(x);
      });
      if (fromUser) writeUrl(sel);
    };
    boxes.forEach(function (b) { b.addEventListener('change', function () { apply(true); }); });
    $$('[data-filters-clear]').forEach(function (b) { b.addEventListener('click', function () { boxes.forEach(function (x) { x.checked = false; }); apply(true); }); });
    $$('[data-show-all]').forEach(function (b) {
      var label = b.textContent;
      b.addEventListener('click', function () {
        var g = b.closest('.fgroup'), on = g.classList.toggle('show-all');
        b.textContent = on ? 'Show fewer' : label; b.setAttribute('aria-expanded', String(on));
      });
    });
    var openBtn = $('[data-filters-open]');
    var setOpen = function (open) {
      filters.classList.toggle('is-open', open); d.body.classList.toggle('filters-open', open);
      if (openBtn) openBtn.setAttribute('aria-expanded', String(open));
      if (open) { var x = $('[data-filters-close]', filters); if (x) x.focus(); } else if (openBtn) openBtn.focus();
    };
    if (openBtn) openBtn.addEventListener('click', function () { setOpen(true); });
    $$('[data-filters-close]', filters).forEach(function (b) { b.addEventListener('click', function () { setOpen(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && filters.classList.contains('is-open')) setOpen(false); });
    // Open any closed group that has a restored choice, so the buyer sees what is active.
    $$('.fgroup', filters).forEach(function (g) { if ($('input:checked', g)) g.open = true; });
    apply(false);
  }

  /* Category dropdown (mobile) */
  var catSel = $('[data-cat-select]');
  if (catSel) catSel.addEventListener('change', function () { location.href = window.TT ? window.TT.link(catSel.value) : catSel.value; });

  /* ── Search results ── */
  var sres = $('[data-search-results]');
  if (sres) {
    var params = new URLSearchParams(location.search);
    var q = (params.get('q') || '').trim();
    var theme = (params.get('style') || '').replace(/[^a-z0-9-]/g, '');
    var input = $('input[name="q"]');
    if (input && q) { input.value = q; input.dispatchEvent(new Event('input')); }
    var norm = function (s) { return s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim(); };
    var terms = norm(q).split(' ').filter(Boolean);
    var themeName = '';
    var hits = 0;
    cards.forEach(function (c) {
      var hay = ' ' + norm(c.getAttribute('data-search') || '') + ' ';
      var id = (c.getAttribute('data-id') || '').toLowerCase(), idDigits = id.replace(/\D/g, '');
      var ok = (terms.length || theme) ? true : false;
      if (terms.length) ok = terms.every(function (t) {
        if (/^(tt)?\s*\d{1,3}$/.test(t)) { var n = t.replace(/\D/g, ''); return idDigits === ('000' + n).slice(-3); }
        return hay.indexOf(' ' + t) > -1;
      });
      if (ok && theme) {
        var slugs = (c.getAttribute('data-f-style') || '').split('|');
        ok = slugs.indexOf(theme) > -1;
      }
      c.hidden = !ok;
      if (ok) hits++;
    });
    // "tt-044" style queries arrive as two terms ("tt", "044"): treat as an item number.
    if (!hits && /^tt\s*-?\s*\d{1,3}$/i.test(q)) {
      var n = q.replace(/\D/g, '');
      cards.forEach(function (c) { var ok = (c.getAttribute('data-id') || '').replace(/\D/g, '') === ('000' + n).slice(-3); c.hidden = !ok; if (ok) hits++; });
    }
    if (theme) { var t = $('[data-style-name="' + theme + '"]'); themeName = t ? t.textContent : ''; }
    var title = $('[data-sres-title]');
    // Design: no visible heading for a text query (screen readers get one); a style gets a visible name.
    if (title) { title.textContent = themeName ? 'Style: ' + themeName : (q ? 'Search results for “' + q + '”' : ''); title.classList.toggle('sr-only', !themeName); }
    d.title = (themeName || q ? (themeName || q) + ' – ' : '') + 'Search | Teck Tai';
    var none = $('[data-sres-none]'), noneQ = $('[data-sres-none-q]');
    var anyQuery = !!(terms.length || theme);
    if (none) none.hidden = hits > 0 || !anyQuery;
    if (noneQ) noneQ.textContent = q || themeName;
    var fr = $('[data-sres-fullrange]'); if (fr) fr.hidden = hits === 0 && anyQuery;
    if (!anyQuery) cards.forEach(function (c) { c.hidden = true; });
    var prompt = $('[data-sres-prompt]'); if (prompt) prompt.hidden = anyQuery;
  }
})();
