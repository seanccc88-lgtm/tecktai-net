/* Searchable dropdown (FIX-1): progressive enhancement over a native <select data-combobox>.
   WAI-ARIA combobox (editable, list autocomplete) with a listbox popup. The <select> stays in the form,
   keeps its name and is the only value the form sends; this script only sets select.value and fires
   "change". Without JavaScript the native dropdown works as before. All wording comes from data-*
   attributes filled from forms.json. No library. */
(function () {
  'use strict';
  var uid = 0;
  var norm = function (s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  };
  var fmt = function (t, n, q) { return (t || '').replace('{n}', n).replace('{q}', q); };

  function enhance(sel) {
    if (sel.hasAttribute('data-cbx-native')) return;
    var id = 'cbx' + (++uid);
    var field = sel.closest('.field');
    var labelSpan = field && field.querySelector(':scope > span:first-child');
    var d = sel.dataset;

    // Entries in native order: { value, label, key } and separators (null).
    var all = [];
    var placeholder = '';
    Array.prototype.forEach.call(sel.options, function (o) {
      if (o.value === '' && !o.disabled) { placeholder = o.text; return; }
      if (o.disabled) { all.push(null); return; }
      all.push({ value: o.value, label: o.text, key: norm(o.text) });
    });

    var wrap = document.createElement('div');
    wrap.className = 'cbx';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'cbx__input';
    input.id = id + '-in';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', id + '-list');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.placeholder = d.cbxPlaceholder || placeholder;
    if (sel.required) input.setAttribute('aria-required', 'true');
    if (labelSpan) {
      if (!labelSpan.id) labelSpan.id = id + '-label';
      input.setAttribute('aria-labelledby', labelSpan.id);
    }
    var err = field && field.querySelector('.field__err');
    if (err) {
      if (!err.id) err.id = id + '-err';
      input.setAttribute('aria-describedby', err.id);
    }
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cbx__toggle';
    toggle.tabIndex = -1;
    toggle.setAttribute('aria-hidden', 'true');
    var pop = document.createElement('div');
    pop.className = 'cbx__pop';
    pop.hidden = true;
    var list = document.createElement('ul');
    list.className = 'cbx__list';
    list.id = id + '-list';
    list.setAttribute('role', 'listbox');
    if (labelSpan) list.setAttribute('aria-labelledby', labelSpan.id);
    var empty = document.createElement('p');
    empty.className = 'cbx__empty';
    empty.hidden = true;
    pop.appendChild(list);
    pop.appendChild(empty);
    var status = document.createElement('span');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    wrap.appendChild(input);
    wrap.appendChild(toggle);
    wrap.appendChild(pop);
    wrap.appendChild(status);

    // The select keeps its place (first control in the label) but leaves the tab order and the a11y tree.
    sel.setAttribute('data-cbx-native', '');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    sel.parentNode.insertBefore(wrap, sel.nextSibling);
    sel.addEventListener('focus', function () { input.focus(); });
    // Clicking the label text goes to the visible field, not the hidden select.
    if (field) field.addEventListener('click', function (e) {
      if (wrap.contains(e.target)) return;
      e.preventDefault();
      input.focus();
    });

    var shown = [];   // entries currently rendered (no separators)
    var active = -1;  // index into shown
    var statusTimer;

    var current = function () {
      for (var i = 0; i < all.length; i++) if (all[i] && all[i].value === sel.value) return all[i];
      return null;
    };
    var syncFromSelect = function () {
      var c = current();
      input.value = c ? c.label : '';
      wrap.classList.toggle('is-empty', !c);
    };

    function render(q) {
      var k = norm(q);
      var items = [];
      if (!k) {
        items = all.slice();
      } else {
        var seen = {}, scored = [];
        all.forEach(function (e, i) {
          if (!e || seen[e.value]) return;
          var at = e.key.indexOf(k);
          if (at < 0) return;
          seen[e.value] = 1;
          var score = at === 0 ? 0 : /[\s(,'-]/.test(e.key.charAt(at - 1)) ? 1 : 2;
          scored.push({ e: e, s: score, i: i });
        });
        scored.sort(function (a, b) { return a.s - b.s || a.i - b.i; });
        items = scored.map(function (x) { return x.e; });
      }
      list.textContent = '';
      shown = [];
      var cur = sel.value;
      items.forEach(function (e) {
        var li = document.createElement('li');
        if (!e) {
          if (!shown.length) return;
          li.className = 'cbx__sep';
          li.setAttribute('role', 'separator');
          list.appendChild(li);
          return;
        }
        li.id = id + '-o' + shown.length;
        li.className = 'cbx__opt';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', e.value === cur ? 'true' : 'false');
        li.textContent = e.label;
        li.setAttribute('data-i', shown.length);
        list.appendChild(li);
        shown.push(e);
      });
      empty.hidden = shown.length > 0;
      list.hidden = !shown.length;
      if (!shown.length) empty.textContent = fmt(d.cbxEmpty, 0, q.trim());
      clearTimeout(statusTimer);
      statusTimer = setTimeout(function () {
        status.textContent = shown.length ? fmt(shown.length === 1 ? d.cbxOne : d.cbxMany, shown.length, q.trim()) : empty.textContent;
      }, 400);
    }

    function setActive(i, scroll) {
      var prev = list.querySelector('.is-active');
      if (prev) prev.classList.remove('is-active');
      active = i;
      if (i < 0 || !shown.length) { input.removeAttribute('aria-activedescendant'); return; }
      var li = document.getElementById(id + '-o' + i);
      li.classList.add('is-active');
      input.setAttribute('aria-activedescendant', li.id);
      if (scroll) {
        var top = li.offsetTop, bottom = top + li.offsetHeight;
        if (top < list.scrollTop) list.scrollTop = top;
        else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
      }
    }

    function place() {
      // Open downwards unless there is clearly more room above (phone with the keyboard up).
      var r = input.getBoundingClientRect();
      var vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      var below = vh - r.bottom - 8, above = r.top - 8;
      var up = below < 200 && above > below;
      wrap.classList.toggle('cbx--up', up);
      list.style.maxHeight = Math.max(144, Math.min(288, up ? above : below)) + 'px';
    }

    function open(q) {
      render(q);
      if (pop.hidden) {
        pop.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        wrap.classList.add('is-open');
        place();
      }
    }
    function close() {
      if (pop.hidden) return;
      pop.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      wrap.classList.remove('is-open');
      setActive(-1);
    }
    function choose(e) {
      if (e && sel.value !== e.value) {
        sel.value = e.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
      syncFromSelect();
      close();
    }
    // Leaving the field: an exact name typed in full, or text with only one match, counts as a choice;
    // anything else goes back to the last real choice (or empty), so the visible text always matches what is sent.
    function commit() {
      var k = norm(input.value);
      if (!k) {
        if (sel.value) { sel.value = ''; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      } else {
        for (var i = 0; i < all.length; i++) {
          if (all[i] && all[i].key === k) { choose(all[i]); return; }
        }
        // One match left (e.g. "united k" then tap elsewhere): take it.
        var hits = [], seen = {};
        all.forEach(function (e) { if (e && !seen[e.value] && e.key.indexOf(k) > -1) { seen[e.value] = 1; hits.push(e); } });
        if (hits.length === 1) { choose(hits[0]); return; }
      }
      syncFromSelect();
      close();
    }
    // dir: 1 / -1 from the keyboard (start at the choice, or the first / last entry); 0 from a click or tap
    // (highlight only the current choice, so nothing looks chosen that is not).
    function openFull(dir) {
      open('');
      var c = sel.value, idx = -1;
      for (var i = 0; i < shown.length; i++) if (shown[i].value === c) { idx = i; break; }
      if (idx < 0 && dir) idx = dir < 0 ? shown.length - 1 : 0;
      setActive(idx, true);
      if (idx >= 0) {
        var li = document.getElementById(id + '-o' + idx);
        list.scrollTop = Math.max(0, li.offsetTop - list.clientHeight / 2 + li.offsetHeight / 2);
      }
    }

    input.addEventListener('input', function () {
      open(input.value);
      setActive(shown.length && input.value.trim() ? 0 : -1, true);
      list.scrollTop = 0;
    });
    input.addEventListener('keydown', function (e) {
      var isOpen = !pop.hidden;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) { if (input.value && input.value !== (current() || {}).label) { open(input.value); setActive(0, true); } else openFull(1); }
          else if (!e.altKey && shown.length) setActive(Math.min(active + 1, shown.length - 1), true);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) { openFull(-1); }
          else if (e.altKey) { if (active > -1) choose(shown[active]); else close(); }
          else if (shown.length) setActive(Math.max(active - 1, 0), true);
          break;
        case 'PageDown':
          if (isOpen && shown.length) { e.preventDefault(); setActive(Math.min(active + 6, shown.length - 1), true); }
          break;
        case 'PageUp':
          if (isOpen && shown.length) { e.preventDefault(); setActive(Math.max(active - 6, 0), true); }
          break;
        case 'Enter':
          if (isOpen) { e.preventDefault(); if (active > -1) choose(shown[active]); else commit(); }
          break;
        case 'Escape':
          if (isOpen) { e.preventDefault(); e.stopPropagation(); syncFromSelect(); close(); }
          else if (input.value || sel.value) { e.preventDefault(); input.value = ''; commit(); }
          break;
        case 'Tab':
          // Typed, then Tab: take the highlighted match (the visible text then matches what is sent).
          if (isOpen) { if (active > -1 && norm(input.value)) choose(shown[active]); else commit(); }
          break;
      }
    });
    input.addEventListener('focus', function () { if (input.value) input.select(); });
    input.addEventListener('click', function () { if (pop.hidden) openFull(0); });
    input.addEventListener('blur', function () { commit(); });
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      if (pop.hidden) { input.focus(); openFull(0); } else { syncFromSelect(); close(); input.focus(); }
    });
    toggle.addEventListener('mousedown', function (e) { e.preventDefault(); });
    // Keep focus in the input while picking with mouse or tap; cancel the label's default (focusing the select).
    pop.addEventListener('mousedown', function (e) { e.preventDefault(); });
    pop.addEventListener('click', function (e) {
      e.preventDefault();
      var li = e.target.closest('.cbx__opt');
      if (li) choose(shown[+li.getAttribute('data-i')]);
    });
    list.addEventListener('mousemove', function (e) {
      var li = e.target.closest('.cbx__opt');
      if (li && +li.getAttribute('data-i') !== active) setActive(+li.getAttribute('data-i'), false);
    });
    sel.addEventListener('change', syncFromSelect);
    window.addEventListener('pageshow', syncFromSelect);
    window.addEventListener('resize', function () { if (!pop.hidden) place(); });
    syncFromSelect();
  }

  // Styles load with this script (public/css/combobox.css, next to /js/), and the select is swapped only once
  // they have arrived, so the field never shows unstyled. If they fail to load, the native select stays.
  // A select the buyer reached by keyboard before this ran is swapped at once, focus moving into the new field;
  // one opened by mouse or tap (its native list may be open) is swapped once they leave it.
  var run = function () {
    Array.prototype.forEach.call(document.querySelectorAll('select[data-combobox]'), function (sel) {
      if (document.activeElement !== sel) enhance(sel);
      else if (sel.hasAttribute('data-cbx-pointer')) sel.addEventListener('blur', function () { enhance(sel); }, { once: true });
      else { enhance(sel); sel.nextElementSibling.querySelector('.cbx__input').focus(); }
    });
  };
  var me = document.currentScript;
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = me && me.src ? me.src.replace(/js\/combobox\.js([?#].*)?$/, 'css/combobox.css') : '/css/combobox.css';
  css.onload = run;
  document.head.appendChild(css);
})();
