/* rolltitle.js: the word in front of "SOFTWARE ENGINEER". SENIOR, SYSTEM, ROBOTICS,
   AV, FULLSTACK, DATA for 5 s each, repeat. Each change is a ~400 ms decode with the slot width
   easing to the new word, so the rest of the line slides instead of jumping.
   The visible text is aria-hidden; screen readers get one stable label from the markup.
   ?roll=fast: 1 s per word, ?t=<s> starts t s into the cycle; ?roll=hold&t=<s> freezes on that word (screenshots).
   Static SENIOR under reduced motion. */
(function () {
  'use strict';
  var BB = window.BB = window.BB || {};
  var WORDS = [['SENIOR', 5], ['SYSTEM', 5], ['ROBOTICS', 5], ['AV', 5], ['FULLSTACK', 5], ['DATA', 5]];
  var GLYPHS = '#%*/<>=+01▮▯';

  function init(slot) {
    var q = new URLSearchParams(location.search), hold = q.get('roll') === 'hold', fast = hold || q.get('roll') === 'fast';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { slot.textContent = 'SENIOR'; return; }
    var dur = WORDS.map(function (w) { return fast ? 1 : w[1]; }), total = dur.reduce(function (a, b) { return a + b; }, 0);
    var off = fast && isFinite(+q.get('t')) ? (+q.get('t') % total) : 0, i = 0;
    while (off >= dur[i]) { off -= dur[i]; i++; }

    var meas = document.createElement('span'); meas.className = 'roll-meas'; meas.setAttribute('aria-hidden', 'true'); slot.parentNode.appendChild(meas);
    function width(w) { meas.textContent = w; return meas.getBoundingClientRect().width; }
    function show(w, animate) {
      slot.style.width = width(w) + 'px';
      if (!animate) { slot.textContent = w; return; }
      var t0 = Date.now(), from = slot.textContent;
      (function frame() {
        var k = Math.min(1, (Date.now() - t0) / 400), n = Math.max(w.length, Math.ceil(from.length * (1 - k))), s = '';
        for (var c = 0; c < n; c++) {
          var settled = c < w.length && c / w.length < k * 1.15 - 0.15;
          s += settled ? w[c] : c < w.length || k < 0.6 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : '';
        }
        slot.textContent = k >= 1 ? w : s;
        if (k < 1) setTimeout(frame, 33);
      })();
    }
    show(WORDS[i][0], false);
    if (hold) return;
    function next() { i = (i + 1) % WORDS.length; show(WORDS[i][0], true); setTimeout(next, dur[i] * 1000); }
    setTimeout(next, (dur[i] - off) * 1000);
  }

  BB.rollTitle = { init: init };
})();
