/* readouts.js: instrument tiles + the 20 s streaming chart, fed from era.metrics() / era.hist. */
(function () {
  'use strict';
  var BB = window.BB = window.BB || {};
  var SLOTS = ['speed', 'lane', 'ttc', 'gap', 'tracked'];

  /* opts: { list, chart (canvas), chartA, chartB (label spans) } */
  function create(o) {
    var tiles = {}, emph = [], lensId = 'all';
    SLOTS.concat(['cpu']).forEach(function (k) {
      var el = document.createElement('div'); el.className = 'ro' + (k === 'cpu' ? ' ro-x' : ''); el.setAttribute('data-k', k);
      el.innerHTML = '<div class="ro-h"><span class="ro-l"></span></div><div class="ro-v"><b>--</b><small></small></div><span class="ro-n"></span><i class="ro-g"></i>';
      o.list.appendChild(el);
      tiles[k] = { el: el, l: el.querySelector('.ro-l'), v: el.querySelector('.ro-v b'), u: el.querySelector('.ro-v small'), n: el.querySelector('.ro-n'), g: el.querySelector('.ro-g'), kind: null, dots: -1 };
    });
    tiles.cpu.l.textContent = 'In-browser compute'; tiles.cpu.el.setAttribute('data-kind', 'bar');

    /* lens emphasis: emphasised tiles first (the phone shows only the first three) */
    function emphasise(E, id) {
      emph = E; lensId = id;
      var showCpu = E.indexOf('cpu') >= 0;
      SLOTS.concat(['cpu']).forEach(function (k) { var t = tiles[k]; t.el.classList.toggle('emph', E.indexOf(k) >= 0); t.el.classList.toggle('dim', id !== 'all' && E.indexOf(k) < 0); });
      tiles.cpu.el.hidden = !showCpu;
      var order = E.filter(function (k) { return k !== 'cpu' || showCpu; }).concat(SLOTS.filter(function (k) { return E.indexOf(k) < 0; }));
      if (order.indexOf('cpu') < 0) order.push('cpu');
      order.forEach(function (k) { o.list.appendChild(tiles[k].el); });
    }
    function update(era, cpuMs) {
      era.metrics().forEach(function (m) {
        var t = tiles[m.k]; if (!t) return;
        if (t.l.textContent !== m.label) t.l.textContent = m.label;
        t.v.textContent = m.value; t.u.textContent = m.unit; t.n.textContent = m.note || '';
        if (t.kind !== m.kind) { t.kind = m.kind; t.el.setAttribute('data-kind', m.kind); t.g.innerHTML = ''; t.dots = -1; }
        if (m.kind === 'dots') {
          if (t.dots !== m.n) { t.dots = m.n; t.g.innerHTML = new Array(m.n + 1).join('<i></i>'); }
          var ds = t.g.children, on = Math.round(m.frac * m.n); for (var i = 0; i < ds.length; i++) ds[i].classList.toggle('on', i < on);
        } else t.el.style.setProperty('--f', Math.max(-1, Math.min(1, m.frac || 0)).toFixed(3));
        t.el.classList.toggle('warn', !!m.warn);
      });
      if (!tiles.cpu.el.hidden) { var c = tiles.cpu; c.v.textContent = (cpuMs * 1000).toFixed(0); c.u.textContent = 'µs'; c.n.textContent = 'per frame: sim step + metrics'; c.el.style.setProperty('--f', Math.min(1, cpuMs).toFixed(3)); }
    }
    function labels(era) {
      var ch = era.chart;
      o.chartA.textContent = ch.a.label + (ch.a.unit ? ' (' + ch.a.unit + ')' : '');
      o.chartB.textContent = ch.b.label + (ch.b.unit ? ' (' + ch.b.unit + ')' : '');
    }
    function resize(dpr) { var r = o.chart.getBoundingClientRect(); o.chart.width = Math.max(1, r.width * dpr); o.chart.height = Math.max(1, r.height * dpr); }
    function chart(era, COL, DPR) {
      var cv = o.chart, c = cv.getContext('2d'), w = cv.width, h = cv.height, hs = era.hist, ch = era.chart, n = hs.n;
      c.clearRect(0, 0, w, h); if (!COL.accent) return;
      var pad = 2 * DPR, bot = h - 11 * DPR, top = 3 * DPR, ph = bot - top;
      c.lineWidth = 1; c.strokeStyle = COL.line; c.beginPath();
      for (var g = 0; g <= 4; g++) { var gx = Math.round(pad + (w - 2 * pad) * g / 4) + 0.5; c.moveTo(gx, top); c.lineTo(gx, bot); }
      [0, 0.5, 1].forEach(function (f) { var gy = Math.round(top + ph * f) + 0.5; c.moveTo(pad, gy); c.lineTo(w - pad, gy); }); c.stroke();
      c.fillStyle = COL.text2; c.font = (9 * DPR) + 'px ui-monospace, monospace'; c.textBaseline = 'bottom';
      ['-20s', '-15', '-10', '-5', 'now'].forEach(function (s, k) { c.textAlign = k === 0 ? 'left' : k === 4 ? 'right' : 'center'; c.fillText(s, pad + (w - 2 * pad) * k / 4, h); });
      if (ch.a.label === 'TTC') { var ty = top + ph * (1 - 3 / ch.a.max); c.strokeStyle = COL.warn; c.setLineDash([3 * DPR, 3 * DPR]); c.beginPath(); c.moveTo(pad, ty); c.lineTo(w - pad, ty); c.stroke(); c.setLineDash([]); }
      function series(arr, max, color, lw) {
        c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); var on = false;
        for (var k = 0; k < n; k++) {
          var v = arr[(hs.i + k) % n]; if (isNaN(v)) { on = false; continue; }
          var px = pad + (w - 2 * pad) * k / (n - 1), py = top + ph * (1 - Math.max(0, Math.min(1, v / max)));
          if (on) c.lineTo(px, py); else { c.moveTo(px, py); on = true; }
        }
        c.stroke();
      }
      c.globalAlpha = 0.8; series(hs.b, ch.b.max, COL.text2, DPR); c.globalAlpha = 1; series(hs.a, ch.a.max, COL.accent, 1.6 * DPR);
    }
    return { emphasise: emphasise, update: update, labels: labels, chart: chart, resize: resize };
  }

  BB.readouts = { create: create };
})();
