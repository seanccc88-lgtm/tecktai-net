/* Home hero slider (client choice, Doris 17 Nov; Sean lifted the static rule for the Home hero only).
   Three photos; the headline, proof card and buttons stay fixed, only the photo changes.
   - Moves on every 7 s with a 600 ms crossfade.
   - Pauses while keyboard focus is inside the hero; stops while the tab is hidden. No pause on hover (R7):
     the hero fills the first screen, so a resting mouse kept it paused; a tap still never pauses it.
   - A visible pause/play button (auto-moving content over 5 s needs one).
   - One control pill (R3): three indicators and the pause/play button, no arrows. Swipe and the arrow keys stay.
     The pill goes into the [data-hero-ctrl] slot that is already in the page, so nothing shifts.
   - "Reduce motion": no auto-advance and no fade; manual controls only (the pause button is hidden).
   - ?hero=static shows slide 1 only (nothing happens here).
   Slides 2 and 3 sit in <template>s. They are added to the page only after the page has loaded and
   after slide 1's photo has decoded (then when the browser is idle), so their photos never compete with
   the first photo. Everything added is absolutely positioned inside the hero, so nothing shifts. */
(function () {
  if (new URLSearchParams(location.search).get('hero') === 'static') return;
  var hero = document.querySelector('[data-hero]');
  var media = hero && hero.querySelector('[data-hero-media]');
  if (!media) return;

  function init() {
  var shade = media.querySelector('.hero__shade');
  [].forEach.call(media.querySelectorAll('template[data-hero-slide]'), function (t) {
    media.insertBefore(t.content.firstElementChild.cloneNode(true), shade);
    t.remove();
  });
  var slides = [].slice.call(media.querySelectorAll('.hero__slide'));
  if (slides.length < 2) return;

  var DELAY = 7000;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var current = 0, timer = null;
  var playing = true;   // the visitor's choice (pause/play button)
  var focused = false;  // keyboard focus inside the hero

  hero.classList.add('hero--slider');
  hero.setAttribute('aria-roledescription', 'carousel');
  slides.forEach(function (s, i) {
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
  });

  var svg = function (d) {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };
  var ICON_PAUSE = svg('<path d="M9 6v12M15 6v12"/>');
  var ICON_PLAY = svg('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>');

  // Controls: one indicator per photo, then pause/play, in one pill.
  var nav = document.createElement('div');
  nav.className = 'hero-nav';
  nav.setAttribute('aria-label', 'Showroom photos');
  nav.setAttribute('role', 'group');
  var button = function (cls, label, html) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    b.innerHTML = html;
    return b;
  };
  var dots = document.createElement('div');
  dots.className = 'hero-nav__dots';
  var dotEls = slides.map(function (s, i) {
    var d = button('hero-nav__dot', 'Show photo ' + (i + 1) + ' of ' + slides.length, '');
    d.addEventListener('click', function () { go(i, true); });
    dots.appendChild(d);
    return d;
  });
  var toggle = button('hero-nav__toggle', 'Pause slideshow', ICON_PAUSE);
  nav.appendChild(dots);
  nav.appendChild(toggle);
  (hero.querySelector('[data-hero-ctrl]') || hero).appendChild(nav);

  function go(i, byUser) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) {
      var on = n === current;
      s.classList.toggle('is-active', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    dotEls.forEach(function (d, n) { d.setAttribute('aria-current', n === current ? 'true' : 'false'); });
    if (byUser) start(); // a manual change restarts the 7 s count
  }
  nav.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(current - 1, true); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(current + 1, true); e.preventDefault(); }
  });

  // Swipe on phones: a mostly horizontal move of 40 px or more.
  var x0 = null, y0 = null;
  hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  hero.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(current + (dx < 0 ? 1 : -1), true);
    x0 = null;
  }, { passive: true });

  // Auto-advance.
  function canRun() { return playing && !focused && !reduce.matches && !document.hidden; }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() {
    stop();
    if (canRun()) timer = setInterval(function () { go(current + 1, false); }, DELAY);
    // Screen readers: quiet while it moves on its own, announce changes otherwise.
    media.setAttribute('aria-live', timer ? 'off' : 'polite');
  }
  function syncToggle() {
    toggle.hidden = reduce.matches;
    toggle.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
    toggle.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    hero.classList.toggle('hero--paused', !playing);
  }
  toggle.addEventListener('click', function () { playing = !playing; syncToggle(); start(); });
  // Pointer events, mouse only: a touch tap also fires compatibility mouseenter with no mouseleave after it.
  hero.addEventListener('focusin', function () { focused = true; start(); });
  hero.addEventListener('focusout', function (e) { if (!hero.contains(e.relatedTarget)) { focused = false; start(); } });
  document.addEventListener('visibilitychange', start);
  var onReduce = function () { syncToggle(); start(); };
  if (reduce.addEventListener) reduce.addEventListener('change', onReduce); else if (reduce.addListener) reduce.addListener(onReduce);

  go(0, false);
  syncToggle();
  start();
  }

  // Wait until the page has finished loading (readyState "complete") and slide 1's photo has decoded,
  // then for an idle moment. R7: the password-protected demo's "Remember me" path decrypts inside the password
  // page's own load handler, and there the window load event never fires again, but readyState still
  // reaches "complete". So listen for readystatechange as well as load (on the normal site "complete"
  // comes just before load, so the timing is the same). A 10 s safety timer covers anything that hangs.
  var first = media.querySelector('img');
  var loaded = new Promise(function (r) {
    if (document.readyState === 'complete') return r();
    document.addEventListener('readystatechange', function () { if (document.readyState === 'complete') r(); });
    window.addEventListener('load', r, { once: true });
  });
  var decoded = first && first.decode ? first.decode().catch(function () {}) : Promise.resolve();
  var started = false;
  function idleInit() {
    if (started) return;
    started = true;
    if (window.requestIdleCallback) window.requestIdleCallback(init, { timeout: 2000 });
    else setTimeout(init, 200);
  }
  Promise.all([loaded, decoded]).then(idleInit);
  setTimeout(idleInit, 10000);
})();
