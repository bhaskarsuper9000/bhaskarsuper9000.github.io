/* graph.js: force-directed career graph. No library; a small simulation (link springs, repulsion, rectangle collision so labels
   do not overlap, anchors, centring, bounds) with alpha cooling. The rAF loop stops when the graph has settled.
   Under prefers-reduced-motion the layout is computed synchronously and drawn settled. */
(function () {
  var C = CAREER, B = BB, esc = B.esc, mk = B.svg, q = B.q;
  var S = document.getElementById('gsvg'), canvas = document.getElementById('gcanvas'), rd = document.getElementById('rd'),
    chipsEl = document.getElementById('echips');
  var DESC = {
    av: 'Fallback behaviour, permit-critical systems and simulation for robotaxis and trucks.',
    robo: 'ROS2 on embedded QNX, an underwater vehicle, a humanoid and a delivery robot.',
    sim: 'Simulator backend, playback and in-browser metrics; safety metrics from simulation and road data.',
    data: 'Pipelines, KPI platforms and GIS data on Grafana, InfluxDB, Postgres, neo4j.',
    full: 'TypeScript and React front ends on cloud-native backends, plus the tooling under them.',
    viz: 'Dashboards, graph visualization and in-browser 3D.',
    found: 'Kernel, game engine, networks, AI coursework, graphics and games.',
    gatik: 'Platform team. In-house AV simulator, a leadership data app, safety metrics from simulation and production data.',
    autox: 'Led Minimum Risk Condition (team of 4) and Binary Deployment (team of 3); about $1.1M a year saved with Binary Deployment and Observability.',
    scry: 'REST API 3x faster, core algorithm about 20x, graph visualization with neo4j and sigma.js.',
    usc: 'MS Computer Science: kernel, game engine, Nao robot, DARPA research, two hackathons.',
    oracle: 'Cloud CRM scripts and add-ins, delivered ahead of schedule.',
    iitb: 'MTech Geo-Informatics: Matsya AUV, thesis on road-defect mapping, first prize at the Smart Energy Hackathon.',
    mumbai: 'BE Computer Engineering: web-controlled robots, 16-bit graphics, Java games, two papers; taught Java to 20 students.'
  };
  /* ring order puts related areas next to each other */
  var RING = ['av', 'sim', 'data', 'viz', 'found', 'robo', 'full'];
  var st = { list: false, lens: null, sel: null, foc: null, hov: null, emp: null, empH: null, area: null };
  var W = 0, H = 0, SC = 1, mobile = false, labelsAll = true;
  var N = [], E = [], byKey = {}, gEdge, gNodes, ctr;
  var alpha = 0, alphaTarget = 0, ALPHA_MIN = 0.006, DECAY = 0.03, VDECAY = 0.55, raf = 0, running = false, built = false;
  var drag = null, tabKey = null, touched = false;

  function reduced() { return B.reduced(); }
  function lensOk(p) { return !st.lens || p.lens.indexOf(st.lens) >= 0; }

  /* ---------- build ---------- */
  function addNode(n) { N.push(n); byKey[n.key] = n; gNodes.appendChild(n.g); return n; }
  function mkG(cls, label, role) {
    var g = mk('g', { 'class': 'node ' + cls, tabindex: -1, role: role, 'aria-label': label });
    return g;
  }
  function build() {
    S.innerHTML = '';
    gEdge = mk('g'); gNodes = mk('g'); S.appendChild(gEdge); S.appendChild(gNodes);
    N = []; E = []; byKey = {};
    /* centre */
    var g = mkG('person', 'Bhaskar Bandyopadhyay, the centre of the graph', 'button');
    g.appendChild(mk('circle', { 'class': 'fr', r: 31 })); g.appendChild(mk('circle', { 'class': 'pc', r: 24 }));
    g.appendChild(mk('text', { y: 5, 'text-anchor': 'middle' }, 'BB')); g.appendChild(mk('text', { 'class': 'pn', y: 42, 'text-anchor': 'middle' }, 'BHASKAR'));
    ctr = addNode({ key: 'c', kind: 'c', id: 'c', g: g, L: 26, Rr: 26, U: 26, D: 48, m: 6 });
    /* areas */
    C.AREAS.forEach(function (a) {
      var g = mkG('area', a.name + ', ' + a.count + ' projects', 'button');
      var fr = mk('rect', { 'class': 'fr' }), box = mk('rect', { 'class': 'box', height: 24, y: -12 });
      var t = mk('text', { 'class': 'nl', y: 4 }, a.short.toUpperCase()), c = mk('text', { 'class': 'nc', y: 4 }, String(a.count));
      [fr, box, t, c].forEach(function (x) { g.appendChild(x); });
      addNode({ key: 'a:' + a.id, kind: 'a', id: a.id, it: a, g: g, box: box, fr: fr, t: t, c: c, m: 3 });
    });
    /* projects */
    C.PROJECTS.forEach(function (p) {
      var big = !!(p.metric && p.metric.t === 'num'), r = big ? 9 : 4.5;
      var g = mkG('leaf' + (big ? ' big' : ''), p.title + (p.metric ? ', ' + p.metric.v + ' ' + p.metric.l : '') + ', ' + C.eraById[p.era].short, 'link');
      g.setAttribute('data-era', p.era);
      var fr = mk('circle', { 'class': 'fr', r: r + 6 }), hit = mk('circle', { 'class': 'hit', r: Math.max(r + 5, 11) }), dot = mk('circle', { 'class': 'dot', r: r });
      var ll = mk('text', { 'class': 'll' }, p.short), lm = big ? mk('text', { 'class': 'lm' }, p.metric.v) : null;
      [fr, hit, dot, lm, ll].forEach(function (x) { if (x) g.appendChild(x); });
      addNode({ key: 'p:' + p.id, kind: 'p', id: p.id, it: p, g: g, r: r, big: big, ll: ll, lm: lm, side: 1, m: big ? 1.6 : 1 });
    });
    /* edges: area to centre, project to its areas. Never to employers. */
    function edge(a, b, len, str, cls) { len = len || 95; var l = mk('line', { 'class': 'edge ' + cls }); gEdge.appendChild(l); E.push({ a: a, b: b, len: len, str: str, el: l }); }
    C.AREAS.forEach(function (a) { edge(ctr, byKey['a:' + a.id], 1, 0.5, 'ac'); });
    C.PROJECTS.forEach(function (p) { p.areas.forEach(function (a) { edge(byKey['a:' + a], byKey['p:' + p.id], 0, 0.3, 'pa'); }); });
    wireNodes();
    built = true;
  }

  /* label geometry depends on viewport: all labels when there is room, otherwise headline numbers only */
  function measure() {
    N.forEach(function (n) { if (n.kind === 'p') n.g.classList.add('lab'); });
    N.forEach(function (n) {
      if (n.kind === 'a') {
        var tw = n.t.getComputedTextLength(), cw = n.c.getComputedTextLength(), w = tw + cw + 28;
        n.t.setAttribute('x', 10); n.c.setAttribute('x', 10 + tw + 8);
        n.box.setAttribute('width', w); n.box.setAttribute('x', -w / 2); n.t.setAttribute('x', -w / 2 + 10); n.c.setAttribute('x', -w / 2 + 18 + tw);
        n.fr.setAttribute('x', -w / 2 - 4); n.fr.setAttribute('width', w + 8); n.fr.setAttribute('y', -16); n.fr.setAttribute('height', 32);
        n.L = n.Rr = w / 2; n.U = n.D = 12;
      } else if (n.kind === 'p') {
        n.always = labelsAll || n.big;
        n.lw = Math.max(n.ll.getComputedTextLength(), n.lm ? n.lm.getComputedTextLength() : 0);
        n.lh = n.big ? 30 : 15;
        setSide(n, n.side);
      }
    });
    paint.key = paint.key;
    if (built) paint();
  }
  function setSide(n, s) {
    n.side = s;
    var off = n.r + 5, anc = s > 0 ? 'start' : 'end';
    if (n.big) { n.lm.setAttribute('x', s * off); n.lm.setAttribute('y', -2); n.lm.setAttribute('text-anchor', anc); n.ll.setAttribute('x', s * off); n.ll.setAttribute('y', 11); }
    else { n.ll.setAttribute('x', s * off); n.ll.setAttribute('y', 4); }
    n.ll.setAttribute('text-anchor', anc);
    var ext = n.always ? off + n.lw : n.r;
    n.U = n.D = Math.max(n.r, n.always ? n.lh / 2 : 0);
    if (s > 0) { n.L = n.r; n.Rr = ext; } else { n.Rr = n.r; n.L = ext; }
  }

  /* ---------- simulation ---------- */
  function anchorOf(id) {
    var i = RING.indexOf(id), a = (-90 + i * 360 / RING.length) * Math.PI / 180;
    return { x: W / 2 + Math.cos(a) * W * 0.37, y: H / 2 + Math.sin(a) * H * 0.36 };
  }
  function seed() {
    ctr.x = W / 2; ctr.y = H / 2;
    var cnt = {};
    C.AREAS.forEach(function (a) { var p = anchorOf(a.id), n = byKey['a:' + a.id]; n.x = p.x; n.y = p.y; n.ax = p.x; n.ay = p.y; });
    C.PROJECTS.forEach(function (p, i) {
      var n = byKey['p:' + p.id], cx = 0, cy = 0;
      p.areas.forEach(function (a) { var an = anchorOf(a); cx += an.x; cy += an.y; });
      cx /= p.areas.length; cy /= p.areas.length;
      var ang = (i * 137.508) * Math.PI / 180, rad = 55 * SC + (i % 5) * 14 * SC;
      var dx = cx - W / 2, dy = cy - H / 2, d = Math.hypot(dx, dy) || 1;
      n.x = cx + dx / d * 40 * SC + Math.cos(ang) * rad; n.y = cy + dy / d * 40 * SC + Math.sin(ang) * rad;
      n.side = n.x < W / 2 ? -1 : 1;
    });
    N.forEach(function (n) { n.vx = n.vy = 0; n.fx = n.fy = null; });
    lengths();
  }
  function lengths() {
    E.forEach(function (e) { e.len = e.el.classList.contains('ac') ? Math.hypot(e.b.ax - W / 2, e.b.ay - H / 2) : 80 * SC; });
  }
  function tick() {
    alpha += (alphaTarget - alpha) * DECAY;
    var i, j, a, b, dx, dy, d, f, e;
    /* link springs */
    for (i = 0; i < E.length; i++) {
      e = E[i]; a = e.a; b = e.b;
      dx = b.x - a.x; dy = b.y - a.y; d = Math.hypot(dx, dy) || 0.01;
      var len = e.len;
      f = (d - len) / d * e.str * alpha * 0.5;
      a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
    }
    /* repulsion (shorter range for dots, so the graph stays compact) */
    var K = 160 * SC;
    for (i = 0; i < N.length; i++) for (j = i + 1; j < N.length; j++) {
      a = N[i]; b = N[j]; dx = b.x - a.x; dy = b.y - a.y; d = Math.hypot(dx, dy) || 0.01;
      if (d > 260 * SC) continue;
      f = K * alpha / (d * Math.max(d, 24));
      a.vx -= dx * f / 1; a.vy -= dy * f / 1; b.vx += dx * f; b.vy += dy * f;
    }
    /* anchors for areas (keeps the ring tidy), centring for everything */
    for (i = 0; i < N.length; i++) {
      a = N[i];
      if (a.kind === 'a') { a.vx += (a.ax - a.x) * 1.6 * alpha; a.vy += (a.ay - a.y) * 1.6 * alpha; }
      else if (a.kind === 'c') { a.vx += (W / 2 - a.x) * 0.3 * alpha; a.vy += (H / 2 - a.y) * 0.3 * alpha; }
      else { a.vx += (W / 2 - a.x) * 0.004 * alpha; a.vy += (H / 2 - a.y) * 0.004 * alpha; }
    }
    /* integrate */
    for (i = 0; i < N.length; i++) {
      a = N[i];
      if (a.fx != null) { a.x = a.fx; a.y = a.fy; a.vx = a.vy = 0; continue; }
      a.vx *= VDECAY; a.vy *= VDECAY; a.x += a.vx; a.y += a.vy;
    }
    for (i = 0; i < N.length; i++) { var n = N[i]; if (n.kind === 'p' && n.always) { var s = n.x < W / 2 - 24 ? -1 : n.x > W / 2 + 24 ? 1 : n.side; if (s !== n.side) setSide(n, s); } }
    collide(2); bounds();
  }
  function collide(passes) {
    var pad = 5, padY = 3;
    for (var p = 0; p < passes; p++) for (var i = 0; i < N.length; i++) for (var j = i + 1; j < N.length; j++) {
      var a = N[i], b = N[j];
      var ox = Math.min(a.x + a.Rr, b.x + b.Rr) - Math.max(a.x - a.L, b.x - b.L) + pad, oy = Math.min(a.y + a.D, b.y + b.D) - Math.max(a.y - a.U, b.y - b.U) + padY;
      if (ox <= 0 || oy <= 0) continue;
      var wa = a.fx != null ? 0 : b.fx != null ? 1 : b.m / (a.m + b.m), wb = b.fx != null ? 0 : a.fx != null ? 1 : 1 - wa;
      var ca = a.x + (a.Rr - a.L) / 2, cb = b.x + (b.Rr - b.L) / 2, cay = a.y + (a.D - a.U) / 2, cby = b.y + (b.D - b.U) / 2;
      if (ox < oy * 1.6) { var sx = cb >= ca ? 1 : -1; a.x -= sx * ox * wa; b.x += sx * ox * wb; }
      else { var sy = cby >= cay ? 1 : -1; a.y -= sy * oy * wa; b.y += sy * oy * wb; }
    }
  }
  function bounds() {
    var m = 8;
    N.forEach(function (n) {
      var x = Math.max(m + n.L, Math.min(W - m - n.Rr, n.x)), y = Math.max(m + n.U, Math.min(H - m - n.D, n.y));
      if (x !== n.x) n.vx = 0; if (y !== n.y) n.vy = 0; n.x = x; n.y = y;
    });
  }
  function render() {
    N.forEach(function (n) { n.g.setAttribute('transform', 'translate(' + n.x.toFixed(1) + ',' + n.y.toFixed(1) + ')'); });
    E.forEach(function (e) { e.el.setAttribute('x1', e.a.x.toFixed(1)); e.el.setAttribute('y1', e.a.y.toFixed(1)); e.el.setAttribute('x2', e.b.x.toFixed(1)); e.el.setAttribute('y2', e.b.y.toFixed(1)); });
  }
  function frame() {
    tick(); render();
    if (alpha < ALPHA_MIN && alphaTarget === 0 && !drag) { running = false; return; }
    raf = requestAnimationFrame(frame);
  }
  function reheat(a) {
    if (reduced()) return;
    alpha = Math.max(alpha, a);
    if (!running) { running = true; raf = requestAnimationFrame(frame); }
  }
  function settleSync() {
    alpha = 1; alphaTarget = 0;
    for (var i = 0; i < 400 && alpha > ALPHA_MIN * 0.5; i++) tick();
    for (var k = 0; k < 120; k++) { collide(1); bounds(); }
    render();
  }

  /* ---------- sizing ---------- */
  function size(first) {
    var r = canvas.getBoundingClientRect(), nw = Math.round(r.width), nh = Math.round(r.height);
    if (nw < 50 || nh < 50 || (nw === W && nh === H && !first)) return;
    var ow = W, oh = H; first = first || !ow;
    W = nw; H = nh; mobile = W < 600;
    SC = Math.max(0.5, Math.min(1.15, Math.min(W / 1000, H / 560)));
    labelsAll = W * H > 330000;
    S.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    measure();
    if (first || !ow) { seed(); }
    else if (!touched) { seed(); }
    else { N.forEach(function (n) { n.x *= W / ow; n.y *= H / oh; if (n.kind === 'a') { var p = anchorOf(n.id); n.ax = p.x; n.ay = p.y; } }); lengths(); }
    if (first) {
      settleSync();
    } else if (!touched || reduced()) settleSync(); else reheat(0.7);
    paint();
  }

  /* ---------- state, highlighting ---------- */
  function focusOf() {
    if (st.hov) return st.hov;
    if (st.foc) return st.foc;
    return st.sel || null;
  }
  function parse(k) { return k ? { t: k[0], id: k.slice(2) } : null; }
  function paint() {
    var F = focusOf(), emp = st.empH || st.emp, area = !F && st.area ? st.area : null;
    var hi = {}, rel = {}, any = false;
    if (emp) {
      any = true;
      C.PROJECTS.forEach(function (p) { if (p.era === emp) { hi['p:' + p.id] = 1; p.areas.forEach(function (a) { rel['a:' + a] = 1; }); } });
      rel.c = 1;
    } else if (F && F.t === 'p') {
      any = true; var p = C.byId[F.id]; hi['p:' + p.id] = 1; p.areas.forEach(function (a) { rel['a:' + a] = 1; }); rel.c = 1;
    } else if (F && F.t === 'a') {
      any = true; hi['a:' + F.id] = 1; C.areaById[F.id].projects.forEach(function (p) { rel['p:' + p.id] = 1; }); rel.c = 1;
    }
    var chipEmp = emp || (F && F.t === 'p' ? C.byId[F.id].era : null);
    N.forEach(function (n) {
      var c = n.g.classList, on = hi[n.key], r = rel[n.key];
      var lensOff = false;
      if (st.lens) lensOff = n.kind === 'p' ? !lensOk(n.it) : n.kind === 'a' ? n.it.lens !== st.lens : false;
      c.toggle('hi', !!on); c.toggle('rel', !!r && !on); c.toggle('dim', any && !on && !r);
      c.toggle('lensoff', lensOff);
      c.toggle('lenshit', !!st.lens && !lensOff && n.kind === 'p');
      var isF = F && n.key === F.t + ':' + F.id || (F && F.t === 'c' && n.kind === 'c');
      c.toggle('sel', !!isF);
      if (n.kind === 'p') c.toggle('lab', !!(n.always || on || isF || (emp && on)));
    });
    E.forEach(function (e) {
      var ah = hi[e.a.key] || rel[e.a.key], bh = hi[e.b.key] || rel[e.b.key], strong = (hi[e.a.key] && bh) || (hi[e.b.key] && ah);
      e.el.classList.toggle('hi', !!strong); e.el.classList.toggle('dim', any && !strong);
    });
    chipsEl.querySelectorAll('.chip').forEach(function (c) {
      var id = c.getAttribute('data-emp');
      c.classList.toggle('hi', id === chipEmp); c.setAttribute('aria-pressed', String(st.emp === id));
      c.classList.toggle('dim', !!chipEmp && id !== chipEmp);
    });
    document.querySelectorAll('[data-lens]').forEach(function (b) { b.setAttribute('aria-pressed', String(st.lens === b.getAttribute('data-lens'))); });
    var key = emp && !F ? 'e:' + emp : F ? F.t + ':' + F.id : area ? 'x' : '';
    if (key !== paint.key) { paint.key = key; readout(F, emp); }
  }

  /* ---------- readout ---------- */
  function chips(items) { return '<div class="conn">' + items.map(function (i) { return '<span><b>' + i[1] + '</b> ' + esc(i[0]) + '</span>'; }).join('') + '</div>'; }
  function readout(F, emp) {
    var h = '', sheet = false;
    if (!F && emp) F = { t: 'e', id: emp };
    if (!F) {
      h = '<p class="k">Readout</p><h2>Hover a node</h2><p class="hint">Every project is on the graph, linked to its capability areas. Hover, focus or tap a node for details and its project page. Drag nodes to rearrange. Employer chips below the graph highlight their projects.</p><p class="sub">' +
        C.PROJECTS.length + ' projects &middot; ' + C.AREAS.length + ' areas &middot; ' + C.ERAS.length + ' employers and schools</p>';
    } else if (F.t === 'c') {
      h = '<p class="k">Bhaskar Bandyopadhyay</p><h2>The whole graph</h2><p>Software engineer, 8+ years: simulators, safety metrics and data tools for autonomous vehicles and robots.</p>'; sheet = true;
    } else if (F.t === 'a' || F.t === 'e') {
      var isEra = F.t === 'e', it = isEra ? C.eraById[F.id] : C.areaById[F.id], cn = {};
      it.projects.forEach(function (p) { (isEra ? p.areas.map(function (a) { return C.areaById[a].short; }) : [C.eraById[p.era].short]).forEach(function (k) { cn[k] = (cn[k] || 0) + 1; }); });
      var cl = Object.keys(cn).map(function (k) { return [k, cn[k]]; });
      h = '<p class="k">' + (isEra ? 'Employer / school' : 'Capability area') + (F.t === 'e' && st.emp === F.id ? ' &middot; pinned' : '') + '</p><h2>' + esc(it.name) + '</h2>' +
        (isEra ? '<p class="sub">' + esc(it.role) + ' &middot; ' + esc(it.range) + '</p>' : '') +
        '<p>' + esc(DESC[it.id] || '') + '</p><p class="sub">' + it.count + ' project' + (it.count > 1 ? 's' : '') + '. Connects to:</p>' + chips(cl) +
        '<a class="btn go" href="' + it.url + '">' + (isEra ? 'Projects, ' + esc(it.short) + ' &rarr;' : 'All projects &rarr;') + '</a>';
      sheet = true;
    } else {
      var p = C.byId[F.id], er = C.eraById[p.era];
      h = '<p class="k">Project &middot; ' + esc(p.year) + ' &middot; ' + esc(er.short) + '</p><h2>' + esc(p.title) + '</h2>' +
        (p.metric ? '<div class="m"><b>' + esc(p.metric.v) + '</b><span>' + esc(p.metric.l) + '</span></div>' : '') +
        '<p>' + esc(p.line) + '</p><div class="tags">' + p.stack.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div>' +
        '<p class="sub">' + p.areas.map(function (a) { return C.areaById[a].short; }).join(' · ') + (er.conf ? ' · confidential, text only' : '') + '</p>' +
        '<a class="btn btn-primary go" href="' + p.url + '">Open project page &rarr;</a>';
      sheet = true;
    }
    var mob = window.matchMedia('(max-width:860px)').matches;
    rd.innerHTML = (mob ? '<button class="x" type="button" aria-label="Close readout">&times;</button>' : '') + h;
    rd.classList.toggle('sheet', sheet && mob && !!(st.sel || st.foc || st.hov || st.emp)); rd.classList.toggle('empty', mob && !(sheet && (st.sel || st.foc || st.hov || st.emp)));
  }
  rd.addEventListener('click', function (e) { if (e.target.closest('.x')) { st.sel = st.foc = st.hov = null; st.emp = st.empH = null; paint.key = null; paint(); } });

  /* ---------- interaction ---------- */
  function nodeOf(t) { var g = t.closest && t.closest('.node'); if (!g) return null; for (var i = 0; i < N.length; i++) if (N[i].g === g) return N[i]; return null; }
  function fOf(n) { return { t: n.kind, id: n.id }; }
  function activate(n) {
    if (n.kind === 'p') { st.sel = st.sel && st.sel.id === n.id && st.sel.t === 'p' ? null : fOf(n); }
    else { st.sel = st.sel && st.sel.id === n.id && st.sel.t === n.kind ? null : fOf(n); }
    st.emp = null; paint();
  }
  function pt(e) { var r = S.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function wireNodes() {
    N.forEach(function (n) {
      var g = n.g;
      g.addEventListener('pointerenter', function (e) { if (e.pointerType === 'touch' || drag) return; st.hov = fOf(n); paint(); });
      g.addEventListener('pointerleave', function (e) { if (e.pointerType === 'touch') return; if (st.hov && st.hov.id === n.id) { st.hov = null; paint(); } });
      g.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        var p = pt(e); drag = { n: n, id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: n.x - p.x, oy: n.y - p.y, moved: false };
        try { g.setPointerCapture(e.pointerId); } catch (x) {}
      });
      g.addEventListener('pointermove', function (e) {
        if (!drag || drag.n !== n || e.pointerId !== drag.id) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
        if (!drag.moved) { drag.moved = true; g.classList.add('drag'); alphaTarget = reduced() ? 0 : 0.3; reheat(0.3); }
        var p = pt(e);
        n.fx = Math.max(n.L + 8, Math.min(W - n.Rr - 8, p.x + drag.ox)); n.fy = Math.max(n.U + 8, Math.min(H - n.D - 8, p.y + drag.oy));
        if (reduced()) { n.x = n.fx; n.y = n.fy; render(); }
      });
      function end(e) {
        if (!drag || drag.n !== n || e.pointerId !== drag.id) return;
        var moved = drag.moved; drag = null; g.classList.remove('drag'); n.fx = n.fy = null; alphaTarget = 0;
        if (moved) reheat(0.25); else if (e.type === 'pointerup') { activate(n); if (e.pointerType === 'touch') { st.hov = null; } }
      }
      g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
    });
    S.addEventListener('pointerdown', function (e) { if (e.target === S) { st.sel = st.area = null; st.emp = null; paint(); } });
    S.addEventListener('focusin', function (e) {
      var n = nodeOf(e.target); if (!n) return; tabKey = n.key; N.forEach(function (m) { m.g.setAttribute('tabindex', m === n ? 0 : -1); });
      if (e.target.matches && e.target.matches(':focus-visible')) { st.foc = fOf(n); paint(); }
    });
    S.addEventListener('focusout', function (e) { var n = nodeOf(e.target); if (n && st.foc && !(e.relatedTarget && S.contains(e.relatedTarget))) { st.foc = null; paint(); } });
    S.addEventListener('keydown', function (e) {
      var n = nodeOf(e.target); if (!n) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (n.kind === 'p' && e.key === 'Enter') location.href = n.it.url; else { activate(n); }
      } else if (e.key === 'Escape') { st.sel = st.foc = st.hov = st.emp = null; paint(); }
      else if (e.key.indexOf('Arrow') === 0) {
        e.preventDefault();
        var dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0, best = null, bs = 1e9;
        N.forEach(function (m) {
          if (m === n) return; var vx = m.x - n.x, vy = m.y - n.y, d = Math.hypot(vx, vy), along = (vx * dx + vy * dy) / d; if (along < 0.35) return;
          var sc = d * (2 - along); if (sc < bs) { bs = sc; best = m; }
        });
        if (best) best.g.focus();
      }
    });
  }
  /* employer chips */
  function buildChips() {
    C.ERAS.forEach(function (er) {
      var b = B.el('button', { type: 'button', 'class': 'chip', 'data-emp': er.id, 'aria-pressed': 'false', title: er.name + ': ' + er.count + ' projects' }, esc(er.short) + ' <i>' + er.count + '</i>');
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'touch') return; st.empH = er.id; paint(); });
      b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'touch') return; st.empH = null; paint(); });
      b.addEventListener('focus', function () { if (b.matches(':focus-visible')) { st.empH = er.id; paint(); } });
      b.addEventListener('blur', function () { if (st.empH === er.id) { st.empH = null; paint(); } });
      b.addEventListener('click', function () { st.emp = st.emp === er.id ? null : er.id; st.sel = null; paint(); });
      chipsEl.appendChild(b);
    });
  }

  /* ---------- list, legend, controls ---------- */
  function buildList() {
    function grp(items) {
      return '<ul>' + items.map(function (it) {
        return '<li><p class="grp"><a href="' + it.url + '">' + esc(it.name) + '</a><small>' + it.count + ' projects' + (it.range ? ' · ' + esc(it.range) : '') + '</small></p><ul>' +
          it.projects.map(function (p) { return '<li><time>' + esc(p.year) + '</time><a href="' + p.url + '">' + esc(p.title) + '</a>' + (p.metric ? '<b>' + esc(p.metric.v) + '</b>' : '<span></span>') + '<span class="st">' + esc(p.stack.join(', ')) + '</span></li>'; }).join('') + '</ul></li>';
      }).join('') + '</ul>';
    }
    document.getElementById('glist').innerHTML = '<div class="cols"><section aria-labelledby="l-skill"><h2 id="l-skill">By skill</h2>' + grp(C.AREAS) + '</section><section aria-labelledby="l-emp"><h2 id="l-emp">By employer and school</h2>' + grp(C.ERAS) + '</section></div>';
  }
  function legend() {
    var L = [['<svg viewBox="0 0 24 14"><circle cx="12" cy="7" r="5.5" class="st"/></svg>', 'You (centre)'], ['<svg viewBox="0 0 24 14"><rect x="1" y="2" width="22" height="10" class="st"/></svg>', 'Capability area'],
      ['<svg viewBox="0 0 24 14"><circle cx="12" cy="7" r="3" class="st"/></svg>', 'Project'], ['<svg viewBox="0 0 24 14"><circle cx="12" cy="7" r="5" class="fl"/></svg>', 'Headline number'],
      ['<svg viewBox="0 0 24 14"><path d="M1 7H23" class="ln"/></svg>', 'Project in area']];
    document.getElementById('legend').innerHTML = L.map(function (l) { return '<li>' + l[0] + l[1] + '</li>'; }).join('');
  }
  var ctl = document.querySelector('.gctl');
  function syncView() {
    ctl.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-view') === 'list') === st.list)); });
    document.body.classList.toggle('listmode', st.list);
    document.querySelector('.gpanel').classList.toggle('listp', st.list);
  }
  ctl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var v = b.getAttribute('data-view'), l = b.getAttribute('data-lens');
    if (v) { st.list = v === 'list'; syncView(); if (!st.list) setTimeout(function () { size(false); }, 0); }
    if (l) { st.lens = st.lens === l ? null : l; paint(); }
  });
  document.getElementById('tolist').addEventListener('click', function () { st.list = true; syncView(); });

  ['pointerdown', 'keydown', 'pointerover'].forEach(function (ev) { document.addEventListener(ev, function () { touched = true; }, { once: true, capture: true }); });
  /* ---------- init ---------- */
  function init() {
    var lens = q.get('lens'), foc = q.get('focus'), emp = q.get('emp'), area = q.get('area');
    if (lens && C.LENSES[lens]) st.lens = lens;
    if (q.get('view') === 'list') st.list = true;
    build(); buildList(); legend(); buildChips(); syncView();
    if (foc && C.byId[foc]) st.sel = { t: 'p', id: foc };
    else if (area && C.areaById[area]) st.sel = { t: 'a', id: area };
    if (emp && C.eraById[emp]) st.emp = emp;
    var first = N.filter(function (n) { return n.kind === 'p'; })[0]; first.g.setAttribute('tabindex', 0);
    size(true);
    var rt = 0;
    if (window.ResizeObserver) new ResizeObserver(function () { cancelAnimationFrame(rt); rt = requestAnimationFrame(function () { size(false); }); }).observe(canvas);
    var wsum = function () { return N.reduce(function (t, n) { return t + (n.lw || 0) + (n.kind === 'a' ? n.Rr : 0); }, 0); };
    var remeasure = function () { var w0 = wsum(); measure(); if (Math.abs(wsum() - w0) > 1 && !drag) { seed(); settleSync(); paint(); } };
    if (document.fonts) { document.fonts.addEventListener('loadingdone', remeasure); }
    window.addEventListener('load', remeasure);
    new MutationObserver(function () { measure(); seed(); settleSync(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-size', 'data-font'] });
  }
  /* wait for fonts so label widths (and so the settled layout) are the same on every load */
  if (document.fonts && document.fonts.ready) { var go = false, run = function () { if (!go) { go = true; init(); } }; document.fonts.ready.then(run); setTimeout(run, 1500); } else init();
})();
