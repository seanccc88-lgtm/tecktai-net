/* Packaging tile galleries (Custom & Packaging, 17 Nov). Triggers carry data-pgal-open="<dialog id>".
   Native <dialog>: Esc closes; arrow keys move between photos; focus goes back to the trigger.
   Photos get their src only when the dialog first opens. No auto-advance. */
(function () {
  if (typeof HTMLDialogElement !== 'function') return; // very old browsers: the tile stays as it is
  document.querySelectorAll('[data-pgal-open]').forEach(function (b) { b.hidden = false; b.disabled = false; });

  var trigger = null;
  function setup(dlg) {
    if (dlg._pgal) return dlg._pgal;
    var slides = [].slice.call(dlg.querySelectorAll('[data-pgal-slide]'));
    var thumbs = [].slice.call(dlg.querySelectorAll('[data-pgal-thumb]'));
    var n = dlg.querySelector('[data-pgal-n]');
    var current = 0;
    function load() {
      dlg.querySelectorAll('[data-srcset]').forEach(function (el) { el.srcset = el.dataset.srcset; el.removeAttribute('data-srcset'); });
      dlg.querySelectorAll('img[data-src]').forEach(function (el) { el.src = el.dataset.src; el.removeAttribute('data-src'); });
    }
    function go(i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.hidden = k !== current; });
      thumbs.forEach(function (t, k) { t.setAttribute('aria-current', k === current ? 'true' : 'false'); });
      if (n) n.textContent = current + 1;
      var t = thumbs[current];
      if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    thumbs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
    dlg.querySelector('[data-pgal-prev]').addEventListener('click', function () { go(current - 1); });
    dlg.querySelector('[data-pgal-next]').addEventListener('click', function () { go(current + 1); });
    dlg.querySelector('[data-pgal-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(current - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { go(current + 1); e.preventDefault(); }
    });
    // A click on the dimmed backdrop (outside the panel) closes it.
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      document.documentElement.classList.remove('pgal-open');
      if (trigger && trigger.focus) trigger.focus();
      trigger = null;
    });
    dlg._pgal = { load: load, go: go };
    return dlg._pgal;
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pgal-open]');
    if (!b) return;
    var dlg = document.getElementById(b.getAttribute('data-pgal-open'));
    if (!dlg) return;
    e.preventDefault();
    var g = setup(dlg);
    g.load();
    g.go(0);
    trigger = b;
    document.documentElement.classList.add('pgal-open');
    dlg.showModal();
  });
})();
