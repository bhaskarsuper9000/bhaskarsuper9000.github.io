/* shell.js: shared page chrome (nav, identity bar, concept switcher, footer) and tiny helpers for A7. */
(function () {
  var C = window.CAREER;
  var NS = 'http://www.w3.org/2000/svg';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(tag, attrs, html) { var n = document.createElement(tag); for (var k in attrs || {}) n.setAttribute(k, attrs[k]); if (html != null) n.innerHTML = html; return n; }
  function svg(tag, attrs, text) { var n = document.createElementNS(NS, tag); for (var k in attrs || {}) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; }
  var q = new URLSearchParams(location.search);

  var CONCEPTS = [['bento.html', 'A', 'Bento'], ['graph.html', 'B', 'Graph']];

  function top(current) {
    document.write(
      '<a class="skip" href="#main">Skip to content</a><div class="pgrid" aria-hidden="true"></div>' +
      '<header class="nav"><div class="wrap nav-in"><a class="brand" href="../a6-hero/index.html"><span class="brand-mark">BB</span><span class="brand-name">Bhaskar Bandyopadhyay</span></a>' +
      '<nav aria-label="Main"><ul>' +
      '<li><a href="../a6-hero/index.html">Home</a></li>' +
      '<li><a href="index.html" aria-current="page">Resume</a></li>' +
      '<li><a href="../a4-pages/index.html">Projects</a></li>' +
      '<li><a href="../a4-pages/blog.html">Blog</a></li></ul></nav>' +
      '<button class="btn btn-settings" type="button" data-settings-toggle aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg><span>Settings</span></button>' +
      '</div></header>');
  }

  /* identity bar: name, positioning, contact, download, projects link, concept switcher */
  function ident(current, tag) {
    var p = C.person, sw = CONCEPTS.map(function (c) {
      return '<a href="' + c[0] + '"' + (c[0] === current ? ' aria-current="page"' : '') + '><b>' + c[1] + '</b> ' + c[2] + '</a>';
    }).join('');
    return '<div class="wrap id">' +
      '<div class="id-t"><p class="eyebrow">TL;DR resume &middot; ' + esc(tag) + '</p>' +
      '<h1 class="id-n">Bhaskar <span>Bandyopadhyay</span></h1>' +
      '<p class="id-p">' + esc(p.pos) + '</p></div>' +
      '<div class="id-a"><div class="id-b"><a class="btn btn-primary" href="' + C.links.pdf + '" download>Download 1-page resume (PDF)</a>' +
      '<a class="btn" href="' + C.links.projects + '">All 42 projects &rarr;</a></div>' +
      '<p class="id-c"><a href="' + p.github + '">GitHub</a><a href="' + p.linkedin + '">LinkedIn</a><a href="mailto:' + p.email + '">' + p.email + '</a></p>' +
      '<nav class="cswitch" aria-label="Prototype concepts"><span>Concept</span>' + sw + '<a href="index.html">Compare</a></nav></div></div>';
  }

  function foot(note) {
    return '<footer class="foot"><div class="wrap foot-in"><span>Bhaskar Bandyopadhyay</span><a href="' + C.person.github + '">GitHub</a><a href="' + C.person.linkedin + '">LinkedIn</a>' +
      '<a href="mailto:' + C.person.email + '">' + C.person.email + '</a><span class="foot-n">' + note + '</span></div></footer>';
  }

  /* headline readout strip (used by B and C; the bento is the numbers) */
  function strip(ids) {
    var S = C.STATS, items = ids.map(function (k) {
      var s = S[k], href = s.id ? C.urlOf(s.id) : s.parts ? C.urlOf(s.parts[0].id) : C.links.projects;
      return '<li><a href="' + href + '"><b>' + esc(s.v) + '<small>' + esc(s.u || '') + '</small></b><span>' + esc(s.l) + '</span></a></li>';
    }).join('');
    return '<ul class="strip">' + items + '</ul>';
  }

  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  /* lens persistence shared with the hero key is avoided: A7 reads ?lens= only */
  window.BB = { esc: esc, el: el, svg: svg, q: q, top: top, ident: ident, foot: foot, strip: strip, reduced: function () { return mq.matches; },
    project: function (id) { return C.byId[id]; },
    metricTxt: function (p) { return p.metric ? p.metric.v + ' ' + p.metric.l : ''; } };
})();
