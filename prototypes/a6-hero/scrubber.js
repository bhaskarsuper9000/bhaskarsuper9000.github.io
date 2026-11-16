/* scrubber.js: career playback scrubber. Equal-width era segments; x in [0, eras.length].
   Drag, arrows/Home/End, era tick buttons, and "Play my story backwards" (~20 s for the whole run). */
(function () {
  'use strict';
  var BB = window.BB = window.BB || {};
  var NOW = 2026 + 10.5 / 12, RUN_S = 20;

  /* opts: { track, ticks, eraTicks, fill, handle, handleYear, play, eras, start (era id or null), onEra(i), onPlay(playing) } */
  function create(o) {
    var E = o.eras, NE = E.length, X_NOW = NE - 1 + (NOW - E[NE - 1].from) / 2;
    var x = X_NOW, era = NE - 1, playing = false, dragging = false;
    var lbl = o.play.querySelector('.lbl'), ic = o.play.querySelector('.ic');

    function year(v) { var i = Math.min(NE - 1, Math.floor(v)), e = E[i]; return Math.min(2026, Math.floor(e.from + (v - i) * (e.to - e.from))); }
    function mid(i) { return i === NE - 1 ? X_NOW : i + 0.5; }

    var html = '';
    E.forEach(function (e, i) {
      var yrs = Math.max(1, Math.min(e.to, 2027) - e.from);
      for (var y = 0; y < yrs; y++) html += '<i class="' + (y ? '' : 'mj') + '" style="left:' + ((i + y / yrs) / NE * 100).toFixed(3) + '%"></i>';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'era-tick'; b.tabIndex = -1; b.style.left = (i / NE * 100) + '%';
      b.innerHTML = '<b>' + (e.id === '1995' ? 'c.1995' : e.from) + '</b>' + (e.short || e.name);
      b.addEventListener('click', function () { stop(); set(mid(i)); o.track.focus({ preventScroll: true }); });
      o.eraTicks.appendChild(b);
    });
    o.ticks.innerHTML = html + '<i class="mj" style="left:100%"></i>';
    var tickBtns = o.eraTicks.querySelectorAll('.era-tick');

    function set(nx) {
      x = Math.max(0, Math.min(X_NOW, nx));
      var p = (x / NE * 100).toFixed(3) + '%';
      [o.track, o.handle, o.fill].forEach(function (el) { el.style.setProperty('--p', p); });
      var i = Math.min(NE - 1, Math.floor(x)), y = year(x);
      o.handleYear.textContent = x >= X_NOW - 0.01 ? 'TODAY' : String(y);
      o.track.setAttribute('aria-valuenow', String(y)); o.track.setAttribute('aria-valuetext', E[i].years + ', ' + E[i].name);
      tickBtns.forEach(function (b, k) { b.classList.toggle('cur', k === i); });
      if (i !== era) { era = i; o.onEra(i); }
    }
    function ui() {
      o.play.setAttribute('aria-pressed', String(playing));
      lbl.textContent = playing ? 'Pause the story' : x < 0.35 ? 'Back to today' : 'Play my story backwards';
      ic.textContent = playing ? '❚❚' : '◀◀';
    }
    function start() { if (x < 0.35) set(X_NOW); playing = true; ui(); o.onPlay(true); }
    function stop() { if (!playing) return; playing = false; ui(); o.onPlay(false); }
    function tick(dt) { if (!playing) return; set(x - dt * NE / RUN_S); if (x <= 0.05) { set(0.05); stop(); } }

    function fromPointer(e) { var r = o.track.getBoundingClientRect(); return (e.clientX - r.left) / r.width * NE; }
    o.track.addEventListener('pointerdown', function (e) { stop(); dragging = true; o.track.setPointerCapture(e.pointerId); set(fromPointer(e)); e.preventDefault(); o.track.focus({ preventScroll: true }); });
    o.track.addEventListener('pointermove', function (e) { if (dragging) set(fromPointer(e)); });
    o.track.addEventListener('pointerup', function () { dragging = false; });
    o.track.addEventListener('pointercancel', function () { dragging = false; });
    o.track.addEventListener('keydown', function (e) {
      var i = Math.min(NE - 1, Math.floor(x)), k = e.key, nx = null;
      if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageDown') nx = mid(Math.max(0, i - 1));
      else if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageUp') nx = mid(Math.min(NE - 1, i + 1));
      else if (k === 'Home') nx = 0.5; else if (k === 'End') nx = X_NOW;
      else if (k === ' ' || k === 'Enter') { playing ? stop() : start(); e.preventDefault(); return; }
      if (nx !== null) { stop(); set(nx); e.preventDefault(); }
    });
    o.play.addEventListener('click', function () { if (!playing && x < 0.35) { set(X_NOW); ui(); return; } playing ? stop() : start(); });

    var si = o.start ? E.findIndex(function (e) { return e.id === o.start; }) : -1;
    if (si >= 0) { era = si; x = mid(si); }
    set(x); ui();
    return { era: function () { return era; }, playing: function () { return playing; }, start: start, stop: stop, tick: tick };
  }

  BB.scrubber = { create: create };
})();
