/* app.js: lens, readouts, chart, scrubber, era fades, render loop and fallbacks. */
(function () {
  'use strict';
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
  var d = document.documentElement, $ = function (id) { return document.getElementById(id); };
  var Q = new URLSearchParams(location.search), DEBUG = Q.get('debug') === '1';
  if (Q.get('bare') === '1') d.classList.add('bare');
  var P = '../a4-pages/project.html?p=', CONF = '../a4-pages/project.html?variant=confidential';

  /* ================================================================== debug overlay (errors + fps) */
  var errs = [], dbg = $('dbg');
  function logErr(m) { errs.push(String(m).slice(0, 160)); if (errs.length > 6) errs.shift(); }
  window.addEventListener('error', function (e) { logErr(e.message + (e.lineno ? ' @' + e.lineno : '')); });
  window.addEventListener('unhandledrejection', function (e) { logErr('promise: ' + (e.reason && e.reason.message || e.reason)); });
  if (DEBUG) dbg.hidden = false;

  /* ================================================================== content: lenses and projects */
  var LENSES = {
    all: {
      name: 'everything',
      pos: 'I build the simulators, safety metrics and data tools that help autonomous vehicles and robots get safely onto real roads.',
      proofs: [
        ['93%', 'Minimum Risk Condition', 'Led a team of 4; graceful recovery in 93% of failure cases.', 'AutoX', P + 'autox-mrc'],
        ['$800K<small>/yr</small>', 'Binary Deployment', 'Proposed and led it with a team of 3; about $800K saved a year.', 'AutoX', P + 'autox-bindeploy'],
        ['$300K<small>/yr</small>', 'Observability and KPI metrics', 'Grafana and InfluxDB; about $300K of developer time saved a year.', 'AutoX', P + 'autox-obs']],
      emph: ['speed', 'ttc']
    },
    av: {
      name: 'AV',
      pos: 'Autonomous-vehicle engineer: safety fallbacks, simulation, and the metrics that show whether a driverless vehicle is behaving safely.',
      proofs: [
        ['93%', 'Minimum Risk Condition', 'Led a team of 4 on graceful recovery; handles 93% of failure cases.', 'AutoX', P + 'autox-mrc'],
        ['Top 10', 'Safety metrics', 'From simulation and production data.', 'Gatik', P + 'gatik-metrics'],
        ['CPUC', 'Driverless-permit work', 'PTP time sync, flip-dot display and DriveU remote control, expedited for the permit.', 'AutoX', P + 'autox-flipdot']],
      emph: ['ttc', 'gap', 'lane']
    },
    robotics: {
      name: 'robotics',
      pos: 'Robotics software from drivers to middleware: ROS2 on embedded QNX, an underwater vehicle, a humanoid and a delivery robot.',
      proofs: [
        ['10 days', 'Lightweight ROS2 on embedded QNX', 'Autonomy teams could port their modules in about 10 days.', 'AutoX', P + 'autox-qnx'],
        ['6 DOF', 'Matsya underwater vehicle', 'Drivers, navigation, mapping and vision integration for a 6-DOF AUV.', 'IIT Bombay', P + 'iitb-auv'],
        ['Series B', 'Delivery-robot routing', 'Auto path routing on a mini delivery robot for the investor demos before Series B.', 'AutoX', P + 'autox-robot']],
      emph: ['tracked', 'lane', 'speed']
    },
    data: {
      name: 'data',
      pos: 'Data platforms and pipelines that turn simulation and fleet logs into metrics and dashboards people actually use.',
      proofs: [
        ['$300K<small>/yr</small>', 'Observability and KPI metrics', 'Grafana and InfluxDB; about $300K of developer time saved a year.', 'AutoX', P + 'autox-obs'],
        ['Top 10', 'Safety-metrics pipelines', 'Offline analytics for operations, safety and autonomy.', 'Gatik', P + 'gatik-metrics'],
        ['20&times;', 'Scry Analytics', 'Core algorithm to O(n), about 20x faster; graph visualization with neo4j and sigma.js.', 'Intern, 2017', P + 'usc-scry']],
      emph: ['gap', 'tracked']
    },
    fullstack: {
      name: 'full stack',
      pos: 'Full-stack apps and in-browser visualization: backends, dashboards and tools for engineers and leadership.',
      proofs: [
        ['$800K<small>/yr</small>', 'Binary Deployment', 'Proposed and led it with a team of 3; about $800K saved a year.', 'AutoX', P + 'autox-bindeploy'],
        ['SaaS', 'Leadership data platform', 'Company data in one app for leadership.', 'Gatik', P + 'gatik-saas'],
        ['Top 4', 'Fullerene', 'Phone as a game controller; top 4 at Caltech HackTech 2016.', 'USC', P + 'usc-fullerene']],
      emph: ['speed', 'cpu']
    }
  };
  /* weights per lens: all, av, robotics, data, fullstack */
  var PROJECTS = [
    ['2025–26', 'AV simulator', 'Backend, playback, users, browser-based metrics.', 'Gatik', CONF, [3, 3, 1, 2, 3], { av: 'simulation', fullstack: 'in-browser metrics', data: 'metrics', all: 'simulation' }],
    ['2025', 'Safety metrics', 'Top-10 metrics from simulation and road data.', 'Gatik', P + 'gatik-metrics', [2, 3, 0, 3, 0], { av: 'safety', data: 'pipelines', all: 'safety' }],
    ['2025–26', 'Leadership data platform', 'Full-stack app for leadership dashboards.', 'Gatik', P + 'gatik-saas', [2, 0, 0, 2.5, 3], { data: 'dashboards', fullstack: 'SaaS app', all: 'full stack' }],
    ['2018–24', 'Minimum Risk Condition', 'Led a team of 4; graceful recovery in 93% of failure cases.', 'AutoX', P + 'autox-mrc', [3, 3, 2, 0, 0], { av: 'safety fallback', robotics: 'robot safety', all: 'safety' }],
    ['2018–24', 'Binary Deployment', 'Proposed and led, team of 3; about $800K saved a year.', 'AutoX', P + 'autox-bindeploy', [2.5, 1, 1, 1, 3], { fullstack: 'platform', all: 'platform', av: 'release tooling', robotics: 'deployment', data: 'platform' }],
    ['2018–24', 'Observability and KPI metrics', 'Grafana and InfluxDB; about $300K of developer time a year.', 'AutoX', P + 'autox-obs', [2.4, 1, 1, 3, 2], { data: 'KPI platform', fullstack: 'dashboards', all: 'data', av: 'fleet metrics', robotics: 'telemetry' }],
    ['2018–24', 'Lightweight ROS2 on embedded QNX', 'Autonomy teams ported their modules in about 10 days.', 'AutoX', P + 'autox-qnx', [2, 2, 3, 0, 0], { robotics: 'ROS2, embedded', av: 'AV middleware', all: 'robotics' }],
    ['2018–24', 'Delivery-robot routing', 'Auto path routing for the investor demos before Series B.', 'AutoX', P + 'autox-robot', [1, 1, 3, 0, 0.5], { robotics: 'navigation', av: 'routing' }],
    ['2018–24', 'Flip-dot display, PTP sync, remote control', 'Expedited for the CPUC driverless permit.', 'AutoX', P + 'autox-flipdot', [1, 2.5, 1.5, 0, 0.5], { av: 'permit', robotics: 'hardware' }],
    ['2017', 'Scry Analytics internship', 'Core algorithm to O(n), about 20x faster; graph visualization.', 'USC', P + 'usc-scry', [1, 0, 0, 2.8, 1.5], { data: '20x speedup', fullstack: 'REST API, viz' }],
    ['2016–17', 'Nao robot motion', 'Inverse kinematics so a humanoid could walk and draw.', 'USC', P + 'usc-nao', [1, 0.5, 2.5, 0, 0], { robotics: 'kinematics' }],
    ['2016', 'Fullerene', 'Phone as a game controller; top 4 at Caltech HackTech.', 'USC', P + 'usc-fullerene', [0.5, 0, 0, 0, 2.2], { fullstack: 'web + mobile' }],
    ['2013–14', 'Matsya autonomous underwater vehicle', 'Drivers, navigation, mapping and vision integration.', 'IIT Bombay', P + 'iitb-auv', [1.5, 1, 3, 0, 0], { robotics: 'AUV', av: 'autonomy' }],
    ['2011–12', 'Remote control of mobile robots', 'Final-year project: robots driven over the web.', 'Mumbai', P + 'mum-robots', [0.5, 0.5, 2, 0, 1.5], { robotics: 'teleoperation', fullstack: 'web control' }]
  ];
  var LENS_I = { all: 0, av: 1, robotics: 2, data: 3, fullstack: 4 };

  /* ================================================================== lens */
  var lens = d.getAttribute('data-lens') || 'all';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function applyLens(l, animate) {
    lens = LENSES[l] ? l : 'all';
    var L = LENSES[lens];
    d.setAttribute('data-lens', lens);
    var r = document.querySelector('#lens input[value="' + lens + '"]'); if (r) r.checked = true;
    var pos = $('pos'); pos.textContent = L.pos;
    $('proofs').innerHTML = L.proofs.map(function (p) {
      return '<li><a class="proof" href="' + p[4] + '"><b class="pf-n">' + p[0] + '</b><span class="pf-t">' + esc(p[1]) + '</span><span class="pf-d">' + esc(p[2]) + '</span><span class="pf-w">' + esc(p[3]) + '</span></a></li>';
    }).join('');
    if (animate) ['proofs', 'pos', 'plist'].forEach(function (id) { var e = $(id); e.classList.remove('swap'); void e.offsetWidth; e.classList.add('swap'); });
    document.querySelectorAll('.capa').forEach(function (c) { c.classList.toggle('hit', lens !== 'all' && (c.getAttribute('data-lens-hit') || '').split(' ').indexOf(lens) >= 0); });
    var li = LENS_I[lens];
    var list = PROJECTS.map(function (p, i) { return { p: p, s: p[5][li] - i * 0.001 }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 6);
    $('plist').innerHTML = list.map(function (x) {
      var p = x.p, why = p[6][lens] || '';
      return '<li class="prow"><time>' + p[0] + '</time><div><h3><a href="' + p[4] + '">' + esc(p[1]) + '</a></h3><p>' + esc(p[2]) + '</p></div><span class="why">' + esc(why ? '▸ ' + why : p[3]) + '</span></li>';
    }).join('');
    $('rel-m').textContent = 'ordered for: ' + L.name;
    emphasise();
  }
  function setLens(l) {
    applyLens(l, true);
    try { localStorage.setItem('bb-lens-v1', lens); } catch (e) {}
    var u = new URL(location.href); if (lens === 'all') u.searchParams.delete('lens'); else u.searchParams.set('lens', lens);
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }
  $('lens').addEventListener('change', function (e) { if (e.target.name === 'lens') setLens(e.target.value); });

  /* ================================================================== readouts */
  var SLOTS = ['speed', 'lane', 'ttc', 'gap', 'tracked'], tiles = {};
  (function buildTiles() {
    var list = $('ro-list');
    SLOTS.concat(['cpu']).forEach(function (k) {
      var el = document.createElement('div'); el.className = 'ro' + (k === 'cpu' ? ' ro-x' : ''); el.setAttribute('data-k', k);
      el.innerHTML = '<div class="ro-h"><span class="ro-l"></span></div><div class="ro-v"><b>--</b><small></small></div><span class="ro-n"></span><i class="ro-g"></i>';
      list.appendChild(el);
      tiles[k] = { el: el, l: el.querySelector('.ro-l'), v: el.querySelector('.ro-v b'), u: el.querySelector('.ro-v small'), n: el.querySelector('.ro-n'), g: el.querySelector('.ro-g'), kind: null, dots: -1 };
    });
    tiles.cpu.l.textContent = 'In-browser compute'; tiles.cpu.el.setAttribute('data-kind', 'bar');
  })();
  function emphasise() {
    var E = LENSES[lens].emph;
    SLOTS.concat(['cpu']).forEach(function (k) { var t = tiles[k]; t.el.classList.toggle('emph', E.indexOf(k) >= 0); t.el.classList.toggle('dim', lens !== 'all' && E.indexOf(k) < 0); });
    tiles.cpu.el.hidden = lens !== 'fullstack';
    /* phone shows three tiles: the lens's emphasised ones first */
    var order = E.filter(function (k) { return k !== 'cpu' || lens === 'fullstack'; }).concat(SLOTS.filter(function (k) { return E.indexOf(k) < 0; }));
    if (order.indexOf('cpu') < 0) order.push('cpu');
    var list = $('ro-list'); order.forEach(function (k) { list.appendChild(tiles[k].el); });
  }
  var cpuMs = 0;
  function updateReadouts(era) {
    era.metrics().forEach(function (m) {
      var t = tiles[m.k]; if (!t) return;
      if (t.l.textContent !== m.label) t.l.textContent = m.label;
      t.v.textContent = m.value; t.u.textContent = m.unit; t.n.textContent = m.note || '';
      if (t.kind !== m.kind) { t.kind = m.kind; t.el.setAttribute('data-kind', m.kind); t.g.innerHTML = ''; t.dots = -1; }
      if (m.kind === 'dots') { if (t.dots !== m.n) { t.dots = m.n; t.g.innerHTML = new Array(m.n + 1).join('<i></i>'); } var ds = t.g.children, on = Math.round(m.frac * m.n); for (var i = 0; i < ds.length; i++) ds[i].classList.toggle('on', i < on); }
      else t.el.style.setProperty('--f', Math.max(-1, Math.min(1, m.frac || 0)).toFixed(3));
      t.el.classList.toggle('warn', !!m.warn);
    });
    if (lens === 'fullstack') { var c = tiles.cpu; c.v.textContent = (cpuMs * 1000).toFixed(0); c.u.textContent = '\u00B5s'; c.n.textContent = 'per frame: sim step + metrics'; c.el.style.setProperty('--f', Math.min(1, cpuMs / 1).toFixed(3)); }
  }

  /* ================================================================== colours from the HUD tokens */
  var probe = document.createElement('i'); probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; document.body.appendChild(probe);
  function css(v) { probe.style.color = ''; probe.style.color = v; return getComputedStyle(probe).color; }
  function rgb(s) { var m = s.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(A[i] + (B[i] - A[i]) * t); }).join(',') + ')'; }
  var COL = {};
  function readColours() {
    var light = d.getAttribute('data-theme') === 'light';
    var accent = css('var(--accent)'), text = css('var(--text)'), text2 = css('var(--text-2)'), lineS = css('var(--line-strong)'), bg = css('var(--bg)'), warn = css('var(--warn)');
    var surface = light ? css('#f4f8fa') : bg;
    COL = {
      light: light, accent: accent, warn: warn,
      ego: accent, agent: light ? mix(text2, text, 0.35) : mix(text2, text, 0.25),
      static: light ? mix(lineS, text2, 0.5) : mix(lineS, text2, 0.45),
      world: light ? mix(lineS, bg, 0.15) : mix(lineS, text2, 0.2),
      grid: light ? mix(lineS, text2, 0.3) : lineS,
      fill: light ? surface : mix(bg, accent, 0.035),
      fillEgo: light ? mix(surface, accent, 0.05) : mix(bg, accent, 0.07),
      road: light ? mix(bg, lineS, 0.1) : mix(bg, lineS, 0.07),
      accentSoft: 'rgba(' + rgb(accent).join(',') + ',0.25)',
      text2: text2, line: css('var(--line)'), bg: bg
    };
    return COL;
  }

  /* ================================================================== eras + scrubber */
  var ERAS = Sim.ERAS, NE = ERAS.length, NOW = 2026 + 10.5 / 12, eras = {};
  var PRE = Q.get('t') !== null && isFinite(+Q.get('t')) ? Math.max(0, Math.min(600, +Q.get('t'))) : 22;
  function getEra(i) {
    if (!eras[i]) { var e = eras[i] = ERAS[i].make(); for (var n = Math.round(PRE / Sim.DT); n > 0; n--) e.step(Sim.DT); }
    return eras[i];
  }
  function xToYear(x) { var i = Math.min(NE - 1, Math.floor(x)), E = ERAS[i]; return Math.min(2026, Math.floor(E.from + (x - i) * (E.to - E.from))); }
  var X_NOW = NE - 1 + (NOW - 2025) / 2;
  var x = X_NOW, shown = -1, target = NE - 1, fade = 1;
  var qe = Q.get('era'); if (qe) { var qi = ERAS.findIndex(function (e) { return e.id === qe; }); if (qi >= 0) { x = qi === NE - 1 ? X_NOW : qi + 0.5; target = qi; } }

  var track = $('track'), handle = $('handle');
  (function buildTicks() {
    var tk = $('track-ticks'), et = $('era-ticks'), html = '';
    ERAS.forEach(function (E, i) {
      var yrs = Math.max(1, Math.min(E.to, 2027) - E.from);
      for (var y = 0; y < yrs; y++) html += '<i class="' + (y === 0 ? 'mj' : '') + '" style="left:' + ((i + y / yrs) / NE * 100).toFixed(3) + '%"></i>';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'era-tick'; b.tabIndex = -1; b.style.left = (i / NE * 100) + '%';
      b.innerHTML = '<b>' + (E.id === '1995' ? 'c.1995' : E.from) + '</b>' + esc(E.name === 'University of Mumbai' ? 'Mumbai' : E.name);
      b.addEventListener('click', function () { stopPlay(); setX(i === NE - 1 ? X_NOW : i + 0.5); track.focus({ preventScroll: true }); });
      et.appendChild(b);
    });
    html += '<i class="mj" style="left:100%"></i>'; tk.innerHTML = html;
  })();
  function setX(nx) {
    x = Math.max(0, Math.min(X_NOW, nx));
    var p = (x / NE * 100).toFixed(3) + '%'; track.style.setProperty('--p', p); handle.style.setProperty('--p', p); $('track-fill').style.setProperty('--p', p);
    var i = Math.min(NE - 1, Math.floor(x)), E = ERAS[i], y = xToYear(x);
    $('handle-y').textContent = x >= X_NOW - 0.01 ? 'TODAY' : String(y);
    track.setAttribute('aria-valuenow', String(y)); track.setAttribute('aria-valuetext', E.years + ', ' + E.name);
    document.querySelectorAll('.era-tick').forEach(function (b, k) { b.classList.toggle('cur', k === i); });
    if (i !== target) { target = i; if (mode !== 'gl') swapTo(i); }
  }
  function fromPointer(e) { var r = track.getBoundingClientRect(); return (e.clientX - r.left) / r.width * NE; }
  var dragging = false;
  track.addEventListener('pointerdown', function (e) { stopPlay(); dragging = true; track.setPointerCapture(e.pointerId); setX(fromPointer(e)); e.preventDefault(); track.focus({ preventScroll: true }); });
  track.addEventListener('pointermove', function (e) { if (dragging) setX(fromPointer(e)); });
  track.addEventListener('pointerup', function () { dragging = false; });
  track.addEventListener('pointercancel', function () { dragging = false; });
  track.addEventListener('keydown', function (e) {
    var i = Math.min(NE - 1, Math.floor(x)), k = e.key, nx = null;
    if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageDown') nx = Math.max(0, i - 1) + 0.5;
    else if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageUp') nx = i + 1 >= NE - 1 ? X_NOW : i + 1.5;
    else if (k === 'Home') nx = 0.5; else if (k === 'End') nx = X_NOW;
    else if (k === ' ' || k === 'Enter') { togglePlay(); e.preventDefault(); return; }
    if (nx !== null) { stopPlay(); setX(nx); e.preventDefault(); }
  });

  /* "Play my story backwards": every era gets the same dwell, about 20 s for the whole run */
  var playing = false, playBtn = $('play');
  function togglePlay() { if (playing) stopPlay(); else startPlay(); }
  function startPlay() { if (x < 0.35) setX(X_NOW); playing = true; playBtn.setAttribute('aria-pressed', 'true'); playBtn.querySelector('.lbl').textContent = 'Pause the story'; playBtn.querySelector('.ic').textContent = '❚❚'; kick(); }
  function stopPlay() { if (!playing) return; playing = false; playBtn.setAttribute('aria-pressed', 'false'); playBtn.querySelector('.lbl').textContent = x < 0.35 ? 'Back to today' : 'Play my story backwards'; playBtn.querySelector('.ic').textContent = '◀◀'; }
  playBtn.addEventListener('click', function () { if (!playing && x < 0.35) { setX(X_NOW); playBtn.querySelector('.lbl').textContent = 'Play my story backwards'; return; } togglePlay(); });

  /* ================================================================== stage, cameras, labels */
  var stage = $('stage'), still = $('still'), gl = $('gl'), tags = $('tags3d'), W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var centerX = 0, centerY = 0, roRect = { left: 1e9, bottom: 0 }, cur = null, anchorX = 0, anchorY = 0, safeL = 0, safeR = 1e9, safeB = 0, phone = false;
  var ptr = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, inside: false, glow: 0 };
  function layout() {
    var r = stage.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    phone = matchMedia('(max-width:860px)').matches;
    if (!phone) {
      var tr = document.querySelector('.hero-text').getBoundingClientRect(), rr = $('readouts').getBoundingClientRect();
      safeL = tr.right - r.left + 8; safeR = W - 12; safeB = rr.bottom - r.top; roRect = { left: rr.left - r.left, bottom: rr.bottom - r.top };
      anchorX = ((safeL + W) / 2) / W - 0.5 + 0.03; anchorY = 0.1; centerX = ((safeL + roRect.left) / 2) / W - 0.5; centerY = 0.06;
    } else { safeL = 0; safeR = W; safeB = 0; anchorX = 0; anchorY = 0.12; centerX = 0; centerY = 0.05; }
    still.width = W * DPR; still.height = H * DPR;
    var cc = $('chart-cv'), cr = cc.getBoundingClientRect(); cc.width = Math.max(1, cr.width * DPR); cc.height = Math.max(1, cr.height * DPR);
    if (R3) R3.setSize(W, H);
  }
  function camFor(era, t) {
    var chase = era.cam().frame === 'chase', c = Sim.camera(era, t, ptr, chase ? anchorX : centerX, chase ? anchorY : centerY, W / H);
    var k = (1 + 0.22 * (1 - fade) * (1 - fade)) * (phone && chase ? 0.7 : 1);   // gentle dolly-in as a new era fades up
    c.pos = [c.target[0] + (c.pos[0] - c.target[0]) * k, c.target[1] + (c.pos[1] - c.target[1]) * k, c.target[2] + (c.pos[2] - c.target[2]) * k];
    return c;
  }
  var tagEls = {};
  function updateTags(era, cam) {
    var pr = Sim.projector(cam, W, H), seen = {}, placed = [];
    era.labels().map(function (l) { return { l: l, p: pr.project(l.p) }; }).filter(function (o) { return o.p; }).sort(function (a, b) { return b.p[1] - a.p[1]; }).forEach(function (o) {
      var l = o.l, p = o.p, w = l.text.length * 6.4 + 14;
      for (var k = 0; k < placed.length; k++) { var q = placed[k]; if (Math.abs(q[0] - p[0]) < (q[2] + w) / 2 && Math.abs(q[1] - p[1]) < 19) { p = [p[0], q[1] - 20, p[2]]; k = -1; } }
      placed.push([p[0], p[1], w]);
      if (p[0] < safeL + 40 || p[0] > safeR - 40 || p[1] < 30 || p[1] > H - (phone ? 70 : 150)) return;
      if (!phone && p[1] < roRect.bottom + 22 && p[0] + w / 2 > roRect.left - 8) { p = [roRect.left - 8 - w / 2, p[1], p[2]]; if (p[0] - w / 2 < safeL) return; }
      var el = tagEls[l.id]; if (!el) { el = tagEls[l.id] = document.createElement('span'); el.className = 'tag3d'; tags.appendChild(el); }
      seen[l.id] = 1; if (el.textContent !== l.text) el.textContent = l.text; el.classList.toggle('warn', !!l.warn);
      el.style.transform = 'translate(' + p[0].toFixed(1) + 'px,' + (p[1] - 9).toFixed(1) + 'px) translate(-50%,-100%)'; el.style.opacity = fade.toFixed(2); el.hidden = false;
    });
    for (var id in tagEls) if (!seen[id]) tagEls[id].hidden = true;
  }
  function clearTags() { tags.innerHTML = ''; tagEls = {}; }
  function setCaption(i) {
    var E = ERAS[i], cap = $('era-cap');
    $('era-y').textContent = E.years; $('era-n').textContent = E.name; $('era-t').textContent = E.caption;
    var EGO = { '2026': 'autonomous box truck', '2018': 'robotaxi', '2016': 'small humanoid', '2013': 'underwater vehicle', '2008': 'web-driven robot', '1995': 'beige PC', '1990': 'toy truck' };
    $('ro-era').textContent = 'Ego: ' + EGO[E.id];
    var ch = getEra(i).chart; $('ch-a').textContent = ch.a.label + (ch.a.unit ? ' (' + ch.a.unit + ')' : ''); $('ch-b').textContent = ch.b.label + (ch.b.unit ? ' (' + ch.b.unit + ')' : '');
    $('scene-desc').textContent = getEra(i).describe() + ' Era: ' + E.years + ', ' + E.name + '.';
    gl.setAttribute('aria-label', 'Live toy simulation, ' + E.years + ' ' + E.name);
  }
  function swapTo(i) {
    shown = i; cur = getEra(i); clearTags(); if (R3) R3.clear(); setCaption(i);
    updateReadouts(cur); drawChart(cur);
    if (mode !== 'gl') drawStill();
  }

  /* ================================================================== chart (2D canvas) */
  function drawChart(era) {
    var cv = $('chart-cv'), c = cv.getContext('2d'), w = cv.width, h = cv.height, hs = era.hist, ch = era.chart, n = hs.n;
    c.clearRect(0, 0, w, h); if (!COL.accent) return;
    var pad = 2 * DPR, bot = h - 11 * DPR, top = 3 * DPR, ph = bot - top;
    c.lineWidth = 1; c.strokeStyle = COL.line; c.beginPath();
    for (var g = 0; g <= 4; g++) { var gx = Math.round(pad + (w - 2 * pad) * g / 4) + 0.5; c.moveTo(gx, top); c.lineTo(gx, bot); }
    [0, 0.5, 1].forEach(function (f) { var gy = Math.round(top + ph * f) + 0.5; c.moveTo(pad, gy); c.lineTo(w - pad, gy); }); c.stroke();
    c.fillStyle = COL.text2; c.font = (9 * DPR) + 'px ui-monospace, monospace'; c.textBaseline = 'bottom';
    ['-20s', '-15', '-10', '-5', 'now'].forEach(function (s, k) { c.textAlign = k === 0 ? 'left' : k === 4 ? 'right' : 'center'; c.fillText(s, pad + (w - 2 * pad) * k / 4, h); });
    if (ch.a.label === 'TTC') { var ty = top + ph * (1 - 3 / ch.a.max); c.strokeStyle = COL.warn; c.setLineDash([3 * DPR, 3 * DPR]); c.beginPath(); c.moveTo(pad, ty); c.lineTo(w - pad, ty); c.stroke(); c.setLineDash([]); }
    function series(arr, max, color, lw) {
      c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); var started = false;
      for (var k = 0; k < n; k++) { var v = arr[(hs.i + k) % n]; if (isNaN(v)) { started = false; continue; } var px = pad + (w - 2 * pad) * k / (n - 1), py = top + ph * (1 - Math.max(0, Math.min(1, v / max))); if (!started) { c.moveTo(px, py); started = true; } else c.lineTo(px, py); }
      c.stroke();
    }
    c.globalAlpha = 0.8; series(hs.b, ch.b.max, COL.text2, 1 * DPR); c.globalAlpha = 1; series(hs.a, ch.a.max, COL.accent, 1.6 * DPR);
  }

  /* ================================================================== 2D still (first paint + fallback) */
  var sctx = still.getContext('2d');
  function drawStill() {
    if (!cur || !W) return;
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var cam = camFor(cur, cur.t); Sim.draw2D(sctx, cur, cam, W, H, COL, 1);
    updateTags(cur, cam);
  }

  /* ================================================================== WebGL path */
  var R3 = null, mode = 'still', running = false, userPaused = false, visible = !document.hidden, inView = true, raf = 0, last = 0, acc = 0, simT = 0;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, STATIC = Q.get('static') === '1';
  function hasWebGL() { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  function startGL() {
    if (R3 || mode === 'loading') return;
    mode = 'loading';
    import(THREE_URL).then(function (THREE) {
      R3 = window.Render3D(THREE, gl, Sim); R3.setColors(COL, COL.light); layout();
      mode = 'gl'; stage.classList.add('gl-on'); d.classList.remove('static-mode'); stage.classList.remove('paused');
      if (shown !== target) swapTo(target);
      renderFrame(0); kick();
    }).catch(function (err) { logErr('three.js failed: ' + (err && err.message)); mode = 'still'; d.classList.add('static-mode'); drawStill(); });
  }
  function want() { return mode === 'gl' && visible && inView && !userPaused; }
  function kick() { if (!running && (want() || (playing && mode !== 'gl'))) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } }
  var fpsN = 0, fpsT = 0, fps = 0, slow = 0, info = {}, uiT = 0;
  function loop(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) { setX(x - dt * NE / 20); if (x <= 0.05) { setX(0.05); stopPlay(); } }
    if (!want()) { running = false; if (playing) { running = true; raf = requestAnimationFrame(loop); } return; }
    renderFrame(dt);
    fpsN++; fpsT += dt; if (fpsT >= 0.5) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
    raf = requestAnimationFrame(loop);
  }
  function renderFrame(dt) {
    /* era fade state machine: out 0.28 s, swap, in 0.45 s */
    if (target !== shown) { fade -= dt / 0.28; if (fade <= 0 || shown < 0) { fade = 0; swapTo(target); } }
    else if (fade < 1) fade = Math.min(1, fade + dt / 0.45);
    $('era-cap').classList.toggle('fading', target !== shown);
    var t0 = performance.now();
    acc += dt; var steps = 0; while (acc >= Sim.DT && steps < 8) { cur.step(Sim.DT); acc -= Sim.DT; steps++; } if (steps === 8) acc = 0;
    var items = cur.objects(); var t1 = performance.now();
    cpuMs = cpuMs * 0.9 + (t1 - t0) * 0.1;
    simT += dt;
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 3); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 3);
    ptr.glow += ((ptr.inside ? 1 : 0) - ptr.glow) * Math.min(1, dt * 4);
    var cam = camFor(cur, simT);
    var focus = cur.cam().focus, pw = null;
    if (ptr.glow > 0.01) { var gp = R3.pointerToGround(ptr.nx, ptr.ny, 0); if (gp) pw = [gp[0], gp[1], ptr.glow * 0.9]; }
    info = R3.render({ cam: cam, items: items, ground: cur.ground, focus: focus, ring: cur.ring(), ptr: pw, fade: fade });
    updateTags(cur, cam);
    uiT += dt; if (uiT > 0.12 || dt === 0) { uiT = 0; updateReadouts(cur); drawChart(cur); }
    if (DEBUG) dbg.textContent = 'fps ' + fps.toFixed(0) + '  frame cpu ' + (performance.now() - t0).toFixed(2) + ' ms  sim ' + cpuMs.toFixed(3) + ' ms\ncalls ' + info.calls + '  tris ' + info.triangles + '  lines ' + info.lines + '  dpr ' + DPR + '  ' + W + 'x' + H + '\nera ' + ERAS[shown].id + '  t ' + cur.t.toFixed(1) + '  lens ' + lens + (errs.length ? '\nERR ' + errs.join('\nERR ') : '\nerrors: none');
  }
  $('sim-pause').addEventListener('click', function () {
    userPaused = !userPaused; this.setAttribute('aria-pressed', String(userPaused)); this.querySelector('.vh').textContent = userPaused ? 'Resume simulation' : 'Pause simulation';
    this.querySelector('[aria-hidden]').textContent = userPaused ? '▶' : '❚❚'; this.title = userPaused ? 'Resume the simulation' : 'Pause the simulation';
    $('readouts').classList.toggle('paused', userPaused);
    if (mode !== 'gl') { if (!userPaused && !STATIC && hasWebGL()) { $('stage-play').hidden = true; startGL(); } return; }
    kick();
  });
  $('stage-play').addEventListener('click', function () { this.hidden = true; userPaused = false; $('sim-pause').setAttribute('aria-pressed', 'false'); startGL(); });

  /* pointer: parallax + grid glow on the hero; page-grid highlight below it */
  stage.parentNode.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var r = stage.getBoundingClientRect(); ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    ptr.nx = ptr.tx; ptr.ny = -ptr.ty; ptr.inside = e.clientX - r.left > safeL && e.clientX - r.left < safeR && !(e.clientX - r.left > roRect.left && e.clientY - r.top < roRect.bottom);
  });
  stage.parentNode.addEventListener('pointerleave', function () { ptr.inside = false; ptr.tx = 0; ptr.ty = 0; });
  var pg = document.querySelector('.pgrid'), pgh = document.querySelector('.pgrid-hi');
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var hb = $('hero').getBoundingClientRect(), onPage = e.clientY > hb.bottom;
    pg.classList.toggle('on', onPage);
    if (onPage) { pgh.style.setProperty('--mx', e.clientX + 'px'); pgh.style.setProperty('--my', e.clientY + 'px'); pgh.style.setProperty('--oy', (-(window.scrollY % 48)) + 'px'); }
  }, { passive: true });
  window.addEventListener('scroll', function () { pgh.style.setProperty('--oy', (-(window.scrollY % 48)) + 'px'); }, { passive: true });

  /* pause when hidden or scrolled away */
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; kick(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; kick(); }, { threshold: 0.02 }).observe(stage);
  var rsT = 0; window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(function () { layout(); if (mode === 'gl') renderFrame(0); else drawStill(); if (cur) drawChart(cur); }, 80); });
  new MutationObserver(function () { readColours(); if (R3) { R3.setColors(COL, COL.light); if (!running) renderFrame(0); } else drawStill(); if (cur) drawChart(cur); }).observe(d, { attributes: true, attributeFilter: ['data-theme', 'data-accent', 'data-size', 'data-font'] });

  /* ================================================================== boot: text first, then the still, then WebGL */
  applyLens(lens, false);
  setX(x);
  requestAnimationFrame(function () {
    setTimeout(function () {
      readColours(); layout(); swapTo(target); fade = 1;
      if (Q.get('play') === '1') setTimeout(startPlay, 50);
      if (STATIC) { d.classList.add('static-mode'); $('readouts').classList.add('paused'); return; }
      if (!hasWebGL()) { d.classList.add('static-mode'); logErr('WebGL unavailable: static still shown'); return; }
      if (reduced) { d.classList.add('static-mode'); $('stage-play').hidden = false; userPaused = true; $('sim-pause').setAttribute('aria-pressed', 'true'); return; }
      startGL();
    }, 0);
  });
  if (DEBUG) setInterval(function () { if (mode !== 'gl') dbg.textContent = 'mode ' + mode + (errs.length ? '\nERR ' + errs.join('\nERR ') : '\nerrors: none'); }, 500);
})();
