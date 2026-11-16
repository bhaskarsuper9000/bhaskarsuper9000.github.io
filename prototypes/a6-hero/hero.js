/* hero.js: wires the modules together. Order of events: text + lens render immediately, then the 2D
   still, then three.js (if WebGL, not reduced motion, not ?static=1). Owns the stage, camera framing,
   3D labels, era fades, the render loop, pausing, and the ?debug=1 overlay.
   Depends on BB.sim, BB.fallback2d, BB.render3d, BB.readouts, BB.scrubber, BB.lens, BB.rollTitle. */
(function () {
  'use strict';
  var BB = window.BB = window.BB || {};
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
  var EGO = { '2026': 'autonomous box truck', '2018': 'robotaxi', '2016': 'small humanoid', '2013': 'underwater vehicle', '2008': 'web-driven robot', '1995': 'beige PC', '1990': 'toy truck' };

  function init(root) {
    var d = document.documentElement, $ = function (id) { return root.querySelector('#' + id) || document.getElementById(id); };
    var Q = new URLSearchParams(location.search), DEBUG = Q.get('debug') === '1', STATIC = Q.get('static') === '1';
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, S = BB.sim, ERAS = S.ERAS;
    if (Q.get('bare') === '1') d.classList.add('bare');

    /* ---- debug overlay ---- */
    var errs = [], dbg = $('dbg');
    function logErr(m) { errs.push(String(m).slice(0, 160)); if (errs.length > 6) errs.shift(); }
    window.addEventListener('error', function (e) { logErr(e.message + (e.lineno ? ' @' + e.lineno : '')); });
    window.addEventListener('unhandledrejection', function (e) { logErr('promise: ' + (e.reason && e.reason.message || e.reason)); });
    if (DEBUG && dbg) dbg.hidden = false;

    /* ---- colours from the HUD tokens ---- */
    var probe = document.createElement('i'); probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; root.appendChild(probe);
    function css(v) { probe.style.color = ''; probe.style.color = v; return getComputedStyle(probe).color; }
    function rgb(s) { var m = s.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; }
    function mix(a, b, t) { var A = rgb(a), B = rgb(b); return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(A[i] + (B[i] - A[i]) * t); }).join(',') + ')'; }
    var COL = {};
    function readColours() {
      var light = d.getAttribute('data-theme') === 'light';
      var accent = css('var(--accent)'), text = css('var(--text)'), text2 = css('var(--text-2)'), lineS = css('var(--line-strong)'), bg = css('var(--bg)');
      var surface = light ? css('#f4f8fa') : bg;
      COL = {
        light: light, accent: accent, warn: css('var(--warn)'), ego: accent,
        agent: mix(text2, text, light ? 0.35 : 0.25), static: mix(lineS, text2, light ? 0.5 : 0.45),
        world: light ? mix(lineS, bg, 0.15) : mix(lineS, text2, 0.2), grid: light ? mix(lineS, text2, 0.3) : lineS,
        fill: light ? surface : mix(bg, accent, 0.035), fillEgo: light ? mix(surface, accent, 0.05) : mix(bg, accent, 0.07),
        road: mix(bg, lineS, light ? 0.1 : 0.07), accentSoft: 'rgba(' + rgb(accent).join(',') + ',0.25)',
        text2: text2, line: css('var(--line)'), bg: bg
      };
    }

    /* ---- modules ---- */
    var R = BB.readouts.create({ list: $('ro-list'), chart: $('chart-cv'), chartA: $('ch-a'), chartB: $('ch-b') });
    var lens = BB.lens.create({
      root: $('lens'), pos: $('pos'), proofs: $('proofs'), plist: document.getElementById('plist'), relMeta: document.getElementById('rel-m'),
      caps: document.querySelectorAll('.capa'), onChange: function (id, L) { R.emphasise(L.emph, id); if (cur) R.update(cur, cpuMs); }
    });

    var PRE = Q.get('t') !== null && isFinite(+Q.get('t')) ? Math.max(0, Math.min(600, +Q.get('t'))) : 22, eras = {};
    function getEra(i) {
      if (!eras[i]) { var e = eras[i] = ERAS[i].make(); for (var n = Math.round(PRE / S.DT); n > 0; n--) e.step(S.DT); }
      return eras[i];
    }
    var shown = -1, target = ERAS.length - 1, fade = 1, cur = null, cpuMs = 0;
    var scrub = BB.scrubber.create({
      track: $('track'), ticks: $('track-ticks'), eraTicks: $('era-ticks'), fill: $('track-fill'), handle: $('handle'), handleYear: $('handle-y'), play: $('play'),
      eras: ERAS, start: Q.get('era'),
      onEra: function (i) { target = i; if (mode !== 'gl' && cur) swapTo(i); },
      onPlay: function () { kick(); }
    });
    target = scrub.era();

    /* ---- stage, framing, labels ---- */
    var stage = $('stage'), still = $('still'), gl = $('gl'), tags = $('tags3d'), W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var F = { chase: [0, 0], center: [0, 0], safeL: 0, safeR: 1e9, ro: { left: 1e9, bottom: 0 } }, phone = false;
    var ptr = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, inside: false, glow: 0 };
    function layout() {
      var r = stage.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      phone = matchMedia('(max-width:860px)').matches;
      if (!phone) {
        var tr = root.querySelector('.hero-text').getBoundingClientRect(), rr = $('readouts').getBoundingClientRect();
        F.safeL = tr.right - r.left + 8; F.safeR = W - 12; F.ro = { left: rr.left - r.left, bottom: rr.bottom - r.top };
        F.chase = [((F.safeL + W) / 2) / W - 0.47, 0.1]; F.center = [((F.safeL + F.ro.left) / 2) / W - 0.5, 0.06];
      } else { F.safeL = 0; F.safeR = W; F.ro = { left: 1e9, bottom: 0 }; F.chase = [0, 0.12]; F.center = [0, 0.05]; }
      still.width = W * DPR; still.height = H * DPR; R.resize(DPR);
      if (R3) R3.setSize(W, H);
    }
    function camFor(era, t) {
      var chase = era.cam().frame === 'chase', a = chase ? F.chase : F.center, c = S.camera(era, t, ptr, a[0], a[1], W / H);
      var k = (1 + 0.22 * (1 - fade) * (1 - fade)) * (phone && chase ? 0.7 : 1);   // dolly-in as an era fades up
      c.pos = [0, 1, 2].map(function (i) { return c.target[i] + (c.pos[i] - c.target[i]) * k; });
      return c;
    }
    var tagEls = {};
    function updateTags(era, cam) {
      var pr = S.projector(cam, W, H), seen = {}, placed = [];
      era.labels().map(function (l) { return { l: l, p: pr.project(l.p) }; }).filter(function (o) { return o.p; }).sort(function (a, b) { return b.p[1] - a.p[1]; }).forEach(function (o) {
        var l = o.l, p = o.p, w = l.text.length * 6.4 + 14;
        for (var k = 0; k < placed.length; k++) { var q = placed[k]; if (Math.abs(q[0] - p[0]) < (q[2] + w) / 2 && Math.abs(q[1] - p[1]) < 19) { p = [p[0], q[1] - 20, p[2]]; k = -1; } }
        placed.push([p[0], p[1], w]);
        if (p[0] < F.safeL + 40 || p[0] > F.safeR - 40 || p[1] < 30 || p[1] > H - (phone ? 70 : 150)) return;
        if (!phone && p[1] < F.ro.bottom + 22 && p[0] + w / 2 > F.ro.left - 8) { p = [F.ro.left - 8 - w / 2, p[1], p[2]]; if (p[0] - w / 2 < F.safeL) return; }
        var el = tagEls[l.id]; if (!el) { el = tagEls[l.id] = document.createElement('span'); el.className = 'tag3d'; tags.appendChild(el); }
        seen[l.id] = 1; if (el.textContent !== l.text) el.textContent = l.text; el.classList.toggle('warn', !!l.warn);
        el.style.transform = 'translate(' + p[0].toFixed(1) + 'px,' + (p[1] - 9).toFixed(1) + 'px) translate(-50%,-100%)'; el.style.opacity = fade.toFixed(2); el.hidden = false;
      });
      for (var id in tagEls) if (!seen[id]) tagEls[id].hidden = true;
    }
    function swapTo(i) {
      shown = i; cur = getEra(i); tags.innerHTML = ''; tagEls = {}; if (R3) R3.clear();
      var E = ERAS[i];
      $('era-y').textContent = E.years; $('era-n').textContent = E.name; $('era-t').textContent = E.caption;
      $('ro-era').textContent = 'Ego: ' + EGO[E.id];
      $('scene-desc').textContent = cur.describe() + ' Era: ' + E.years + ', ' + E.name + '.';
      gl.setAttribute('aria-label', 'Live toy simulation, ' + E.years + ' ' + E.name);
      R.labels(cur); R.update(cur, cpuMs); R.chart(cur, COL, DPR);
      if (mode !== 'gl') drawStill();
    }
    var sctx = still.getContext('2d');
    function drawStill() {
      if (!cur || !W) return;
      sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var cam = camFor(cur, cur.t); BB.fallback2d.draw(sctx, cur, cam, W, H, COL, 1); updateTags(cur, cam);
    }

    /* ---- WebGL path + loop ---- */
    var R3 = null, mode = 'still', running = false, userPaused = false, visible = !document.hidden, inView = true, last = 0, acc = 0, simT = 0;
    function hasWebGL() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
    function startGL() {
      if (R3 || mode === 'loading') return;
      mode = 'loading';
      import(THREE_URL).then(function (THREE) {
        R3 = BB.render3d.create(THREE, gl, S); R3.setColors(COL, COL.light); layout();
        mode = 'gl'; stage.classList.add('gl-on'); d.classList.remove('static-mode');
        if (shown !== target) swapTo(target);
        renderFrame(0); kick();
      }).catch(function (err) { logErr('three.js failed: ' + (err && err.message)); mode = 'still'; d.classList.add('static-mode'); drawStill(); });
    }
    function want() { return mode === 'gl' && visible && inView && !userPaused; }
    function kick() { if (!running && (want() || scrub.playing())) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
    var fpsN = 0, fpsT = 0, fps = 0, info = {}, uiT = 0;
    function loop(now) {
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      scrub.tick(dt);
      if (!want()) { running = scrub.playing(); if (running) requestAnimationFrame(loop); return; }
      renderFrame(dt);
      fpsN++; fpsT += dt; if (fpsT >= 0.5) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
      requestAnimationFrame(loop);
    }
    function renderFrame(dt) {
      if (target !== shown) { fade -= dt / 0.28; if (fade <= 0 || shown < 0) { fade = 0; swapTo(target); } }   // out 0.28 s, swap, in 0.45 s
      else if (fade < 1) fade = Math.min(1, fade + dt / 0.45);
      $('era-cap').classList.toggle('fading', target !== shown);
      var t0 = performance.now();
      acc += dt; var steps = 0; while (acc >= S.DT && steps < 8) { cur.step(S.DT); acc -= S.DT; steps++; } if (steps === 8) acc = 0;
      var items = cur.objects(); cpuMs = cpuMs * 0.9 + (performance.now() - t0) * 0.1;
      simT += dt;
      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 3); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 3);
      ptr.glow += ((ptr.inside ? 1 : 0) - ptr.glow) * Math.min(1, dt * 4);
      var cam = camFor(cur, simT), pw = null;
      if (ptr.glow > 0.01) { var gp = R3.pointerToGround(ptr.nx, ptr.ny, 0); if (gp) pw = [gp[0], gp[1], ptr.glow * 0.9]; }
      info = R3.render({ cam: cam, items: items, ground: cur.ground, focus: cur.cam().focus, ring: cur.ring(), ptr: pw, fade: fade });
      updateTags(cur, cam);
      uiT += dt; if (uiT > 0.12 || dt === 0) { uiT = 0; R.update(cur, cpuMs); R.chart(cur, COL, DPR); }
      if (DEBUG) dbg.textContent = 'fps ' + fps.toFixed(0) + '  sim ' + cpuMs.toFixed(3) + ' ms\ncalls ' + info.calls + '  tris ' + info.triangles + '  lines ' + info.lines + '  dpr ' + DPR + '  ' + W + 'x' + H +
        '\nera ' + ERAS[shown].id + '  t ' + cur.t.toFixed(1) + '  lens ' + lens.get() + (errs.length ? '\nERR ' + errs.join('\nERR ') : '\nerrors: none');
    }

    /* ---- controls ---- */
    var pauseBtn = $('sim-pause');
    function setPaused(p) {
      userPaused = p; pauseBtn.setAttribute('aria-pressed', String(p)); pauseBtn.querySelector('.vh').textContent = p ? 'Resume simulation' : 'Pause simulation';
      pauseBtn.querySelector('[aria-hidden]').textContent = p ? '▶' : '❚❚'; $('readouts').classList.toggle('paused', p);
    }
    pauseBtn.addEventListener('click', function () {
      setPaused(!userPaused);
      if (mode !== 'gl') { if (!userPaused && !STATIC && hasWebGL()) { $('stage-play').hidden = true; startGL(); } return; }
      kick();
    });
    $('stage-play').addEventListener('click', function () { this.hidden = true; setPaused(false); startGL(); });

    /* pointer: parallax + 3D grid glow on the hero, 2D page-grid highlight below it */
    var heroEl = $('hero');
    heroEl.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = stage.getBoundingClientRect(), lx = e.clientX - r.left, ly = e.clientY - r.top;
      ptr.tx = lx / r.width * 2 - 1; ptr.ty = ly / r.height * 2 - 1; ptr.nx = ptr.tx; ptr.ny = -ptr.ty;
      ptr.inside = lx > F.safeL && lx < F.safeR && !(lx > F.ro.left && ly < F.ro.bottom);
    });
    heroEl.addEventListener('pointerleave', function () { ptr.inside = false; ptr.tx = 0; ptr.ty = 0; });
    var pg = document.querySelector('.pgrid'), pgh = pg && pg.querySelector('.pgrid-hi');
    if (pg) {
      document.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var on = e.clientY > heroEl.getBoundingClientRect().bottom; pg.classList.toggle('on', on);
        if (on) { pgh.style.setProperty('--mx', e.clientX + 'px'); pgh.style.setProperty('--my', e.clientY + 'px'); pgh.style.setProperty('--oy', (-(window.scrollY % 48)) + 'px'); }
      }, { passive: true });
      window.addEventListener('scroll', function () { pgh.style.setProperty('--oy', (-(window.scrollY % 48)) + 'px'); }, { passive: true });
    }

    document.addEventListener('visibilitychange', function () { visible = !document.hidden; kick(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; kick(); }, { threshold: 0.02 }).observe(stage);
    var rsT = 0;
    window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(function () { layout(); if (mode === 'gl') renderFrame(0); else drawStill(); if (cur) R.chart(cur, COL, DPR); }, 80); });
    new MutationObserver(function () {
      readColours(); if (R3) { R3.setColors(COL, COL.light); if (!running) renderFrame(0); } else drawStill(); if (cur) R.chart(cur, COL, DPR);
    }).observe(d, { attributes: true, attributeFilter: ['data-theme', 'data-accent', 'data-size', 'data-font'] });

    /* ---- boot ---- */
    requestAnimationFrame(function () {
      setTimeout(function () {
        readColours(); layout(); swapTo(target); fade = 1;
        if (Q.get('play') === '1') setTimeout(scrub.start, 50);
        if (STATIC) { d.classList.add('static-mode'); $('readouts').classList.add('paused'); return; }
        if (!hasWebGL()) { d.classList.add('static-mode'); logErr('WebGL unavailable: static still shown'); return; }
        if (reduced) { d.classList.add('static-mode'); $('stage-play').hidden = false; setPaused(true); return; }
        startGL();
      }, 0);
    });
    if (DEBUG) setInterval(function () { if (mode !== 'gl') dbg.textContent = 'mode ' + mode + (errs.length ? '\nERR ' + errs.join('\nERR ') : '\nerrors: none'); }, 500);
  }

  BB.hero = { init: init };
})();
