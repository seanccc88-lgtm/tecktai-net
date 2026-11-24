/* Product gallery: thumbnails, arrows when the strip overflows, hover zoom on desktop.
   No auto-advance. Classic script (works from disk). */
(function () {
  'use strict';
  var g = document.querySelector('[data-gallery]');
  if (!g) return;
  var slides = g.querySelectorAll('[data-slide]'), thumbs = g.querySelectorAll('[data-thumb]');
  var strip = g.querySelector('.gal__strip'), row = g.querySelector('[data-gal-thumbs]');
  var prev = g.querySelector('[data-gal-prev]'), next = g.querySelector('[data-gal-next]');
  var counter = g.querySelector('[data-gal-n]');
  function show(i) {
    slides.forEach(function (s, k) { s.hidden = k !== i; });
    thumbs.forEach(function (t, k) { if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    if (counter) counter.textContent = i + 1;
  }
  thumbs.forEach(function (t) { t.addEventListener('click', function () { show(+t.getAttribute('data-thumb')); }); });
  function arrows() {
    if (!row || !strip) return;
    var over = row.scrollWidth > row.clientWidth + 2;
    strip.classList.toggle('is-overflow', over);
    if (prev) prev.disabled = row.scrollLeft < 4;
    if (next) next.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
  }
  if (row) {
    row.addEventListener('scroll', arrows, { passive: true });
    window.addEventListener('resize', arrows);
    arrows();
    if (prev) prev.addEventListener('click', function () { row.scrollBy({ left: -248 }); });
    if (next) next.addEventListener('click', function () { row.scrollBy({ left: 248 }); });
  }
  // Hover zoom (desktop): magnify the area under the cursor.
  var main = g.querySelector('[data-zoom]');
  if (main && window.matchMedia('(hover: hover) and (min-width: 1024px)').matches) {
    main.addEventListener('mousemove', function (e) {
      var r = main.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
      main.querySelectorAll('img').forEach(function (img) { img.style.transformOrigin = x + '% ' + y + '%'; });
      main.classList.add('is-zoom');
    });
    main.addEventListener('mouseleave', function () { main.classList.remove('is-zoom'); });
  }
})();
