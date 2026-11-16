/* bento.js: flat bento of numbers. Tiles are built from CAREER (data.js). */
(function () {
  var C = CAREER, S = C.STATS, esc = BB.esc, u = C.urlOf, LIST = C.links.projects;
  var $ = function (id) { return C.byId[id]; };
  function polar(cx, cy, r, deg) { var a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arc(cx, cy, r, a0, a1) { var p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1); return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1); }

  /* ---- face visuals ---- */
  function gauge(pct) {
    var a0 = 225, span = 270, a1 = a0 + span * pct / 100, t = '';
    for (var i = 0; i <= 20; i++) { var d = a0 + span * i / 20, p = polar(60, 60, i % 5 ? 50 : 46, d), q = polar(60, 60, 54, d); t += '<path d="M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'L' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + '" class="' + (d <= a1 + .1 ? 'on' : '') + '"/>'; }
    return '<svg class="gauge" viewBox="0 0 120 120" aria-hidden="true"><path class="g-bg" d="' + arc(60, 60, 38, a0, a0 + span) + '"/><path class="g-v" d="' + arc(60, 60, 38, a0, a1) + '"/><g class="g-t">' + t + '</g></svg>';
  }
  function dots(n, on, cls) { var s = ''; for (var i = 0; i < n; i++) s += '<i class="' + (i < on ? 'on ' : '') + (cls || '') + '"></i>'; return s; }
  function ruler(n, on) { var s = ''; for (var i = 0; i < n; i++) s += '<i class="' + (i < on ? 'on' : '') + '"></i>'; return '<div class="ruler" aria-hidden="true" style="--n:' + n + '">' + s + '</div>'; }
  var YR = { gatik: '2025–26', autox: '2018–24', scry: '2017', usc: '2016–17', oracle: '2015', iitb: '2013–15', mumbai: '2008–12' };
  var ERAROWS = ['gatik', 'autox', 'scry', 'usc', 'oracle', 'iitb', 'mumbai'];
  function gantt() {
    var y0 = 2008, y1 = 2027, s = '';
    ERAROWS.forEach(function (id) { var e = C.eraById[id], l = (e.y[0] - y0) / (y1 - y0) * 100, w = Math.max(2, (e.y[1] - e.y[0]) / (y1 - y0) * 100);
      s += '<a class="gr" href="' + e.url + '"><span>' + esc(e.short) + '</span><span class="gb"><i style="left:' + l + '%;width:' + w + '%"></i></span><span class="gy num">' + YR[id] + '</span></a>'; });
    return '<div class="gantt">' + s + '</div>';
  }
  function tagLink(tag) { var p = C.PROJECTS.filter(function (p) { return p.stack.indexOf(tag) >= 0; })[0]; return p ? u(p.id) : LIST; }
  function chips(tags) { return tags.map(function (t) { return '<a class="chip" href="' + tagLink(t) + '">' + esc(t) + '</a>'; }).join(''); }

  function areaRows() {
    var max = Math.max.apply(null, C.AREAS.map(function (a) { return a.count; })), s = '';
    C.AREAS.forEach(function (a) {
      var top = a.projects.slice().sort(function (x, y) { return (y.metric ? 1 : 0) - (x.metric ? 1 : 0); }).slice(0, 3);
      s += '<div class="arow"><a class="an" href="' + a.url + '" data-lens="' + (a.lens || '') + '">' + esc(a.short) + '</a><span class="ad" aria-hidden="true">' + dots(max, a.count) + '</span><b class="ac num">' + a.count + '</b>' +
        '<span class="ap">' + top.map(function (p) { return '<a href="' + p.url + '">' + esc(p.short) + '</a>'; }).join('') + (a.count > 3 ? '<a class="pm" href="' + a.url + '">+' + (a.count - 3) + '</a>' : '') + '</span></div>';
    });
    return '<div class="areas">' + s + '</div>';
  }

  /* breakdown rows: [label, value, href, note] */
  function rows(list) { return '<ul class="rl">' + list.map(function (r) { return '<li><a href="' + r[2] + '"><span>' + esc(r[0]) + (r[3] ? '<small>' + esc(r[3]) + '</small>' : '') + '</span><b class="num">' + esc(r[1] || '') + '</b></a></li>'; }).join('') + '</ul>'; }
  function rowOf(id, v, note) { return [$(id).short, v == null ? ($(id).metric ? $(id).metric.v : '') : v, u(id), note]; }

  var T = [
    { id: 'saved', c: 4, r: 2, title: 'Saved per year at AutoX', href: u('autox-bindeploy'),
      face: '<div class="big"><b class="num">$1.1M</b><small>/yr</small></div><p class="cap">saved at AutoX</p>' +
        '<div class="sscale" aria-hidden="true"><span>0</span><span>$400K</span><span>$800K</span><span>$1.1M</span></div><div class="sbar" aria-hidden="true"><i style="flex:800"></i><i class="b" style="flex:300"></i></div>' +
        '<div class="sleg"><a href="' + u('autox-bindeploy') + '" style="flex:800"><b class="num">$800K</b><span>Binary Deployment<small>Proposed and led, team of 3</small></span></a><a href="' + u('autox-obs') + '" style="flex:300"><b class="num">$300K</b><span>Observability<small>KPI metrics for developers</small></span></a></div>',
      more: rows([rowOf('autox-bindeploy', '$800K', 'Proposed and led, team of 3'), rowOf('autox-obs', '$300K', 'Developer time, KPI metrics (Grafana, InfluxDB)')]) },
    { id: 'mrc', c: 3, r: 2, title: 'Minimum Risk Condition', href: u('autox-mrc'),
      face: '<div class="gwrap">' + gauge(93) + '<span class="num gv"><b>93</b><small>%</small></span></div><p class="cap">of failure cases recovered gracefully</p><p class="cap sub">Minimum Risk Condition, AutoX. Led a team of 4.</p>',
      more: rows([rowOf('autox-mrc', '93%', 'Led a team of 4. Graceful recovery from failures.')]) },
    { id: 'areas', c: 5, r: 2, title: 'Projects by area', href: LIST, cls: 'noov',
      face: '<div class="big sm"><b class="num">' + C.PROJECTS.length + '</b><small>projects across 7 areas</small></div>' + areaRows(),
      more: '' },
    { id: 'years', c: 2, title: 'Years', href: C.links.projects + '?kind=work',
      face: '<div class="big"><b class="num">8+</b><small>yrs</small></div><p class="cap">autonomous platforms</p>' + ruler(9, 9) + '<div class="rl2 num"><span>2018</span><span>2026</span></div>',
      more: rows([['Gatik AI', '2025–26', C.eraById.gatik.url, 'Platform, simulation, safety metrics'], ['AutoX Technologies', '2018–24', C.eraById.autox.url, 'Senior Software Engineer']]) },
    { id: 'teams', c: 2, title: 'Teams led', href: u('autox-mrc'),
      face: '<div class="big"><b class="num">4 &amp; 3</b></div><p class="cap">person teams led</p><div class="dm" aria-hidden="true">' + dots(4, 4) + '<em></em>' + dots(3, 3) + '</div>',
      more: rows([rowOf('autox-mrc', '4', 'Minimum Risk Condition'), rowOf('autox-bindeploy', '3', 'Binary Deployment')]) },
    { id: 'ros2', c: 2, title: 'ROS2 on QNX', href: u('autox-qnx'),
      face: '<div class="big"><b class="num">10</b><small>days</small></div><p class="cap">for teams to port modules to ROS2 on QNX</p>' + ruler(10, 10),
      more: rows([rowOf('autox-qnx', '10 days', 'Lightweight ROS2 for an embedded safety platform'), rowOf('autox-ros2', '', 'Middleware switch to ROS2'), rowOf('autox-ptp', '', 'PTP lidar-camera time sync')]) },
    { id: 'scry', c: 2, title: 'Scry Analytics', href: u('usc-scry'),
      face: '<div class="big"><b class="num">20x</b></div><p class="cap">faster algorithm (O(n)); REST API 3x</p><div class="mb" aria-hidden="true"><i style="width:100%"></i><i style="width:15%"></i></div>',
      more: rows([rowOf('usc-scry', '3x / 20x', 'REST API via SWIG / core algorithm to O(n)')]) },
    { id: 'awards', c: 2, title: 'Hackathon awards', href: C.links.projects + '?kind=hackathon',
      face: '<div class="big"><b class="num">3</b></div><p class="cap">hackathon awards</p><div class="medals num" aria-hidden="true"><i>1st</i><i>Top 4</i><i>10%</i></div>',
      more: rows([rowOf('iitb-streetlights', '1st', 'Smart Energy Hackathon, IIT Bombay 2014'), rowOf('usc-fullerene', 'Top 4', 'Caltech HackTech 2016'), rowOf('usc-resurrect', 'Top 10%', 'LA Hacks, UCLA 2017')]) },
    { id: 'papers', c: 2, title: 'Publications', href: u('usc-cad'),
      face: '<div class="big"><b class="num">3</b></div><p class="cap">publications</p><div class="dm" aria-hidden="true">' + dots(3, 3, 'sq') + '</div>',
      more: rows([rowOf('usc-cad', '2017', 'Symposium on Solid and Physical Modeling'), rowOf('mum-hyberfast', '2011', 'Springer conference'), rowOf('mum-xbee', '2012', 'NCETET, Mumbai')]) },
    { id: 'timeline', c: 3, title: 'Timeline, 4 companies', href: C.links.projects,
      face: '<div class="th"><span class="lab">Timeline</span><b class="num">4</b><span class="lab">companies</span></div>' + gantt(),
      more: '' , cls: 'noov' },
    { id: 'stack', c: 3, title: 'Stack', href: C.links.projects,
      face: '<div class="th"><span class="lab">Stack</span></div><div class="stk"><p><span class="lab">Code</span>' + chips(['C++', 'Python', 'React', 'Node.js']) + '<a class="chip" href="' + LIST + '">TypeScript</a></p><p><span class="lab">Robotics</span>' + chips(['ROS2', 'Embedded', 'Robotics']) + '</p><p><span class="lab">Data</span>' + chips(['Grafana', 'InfluxDB', 'Airflow', 'neo4j']) + '</p></div>',
      more: '<p class="mn">Languages C/C++, Python, SQL, TypeScript, shell, Java, Go.<br>Frameworks ROS2, gtest, Boost, OpenCV, PCL, Protobuf, eBPF.<br>Data TimescaleDB, Postgres, Mongo, Redis, Influx, Neo4j.<br>Web React, Node.js, Angular, D3.<br>Cloud Grafana, Loki, Kubernetes, Azure, Docker, Argo, Airflow, Bazel.</p>' + rows([rowOf('autox-obs', '', 'Grafana, InfluxDB, Airflow'), rowOf('autox-qnx', '', 'C++, ROS2, QNX')]) },
    { id: 'people', c: 2, title: 'People', href: C.links.projects + '?kind=work',
      face: '<div class="th"><span class="lab">People</span></div><div class="trio num"><p><b>30+</b><span>interviews</span></p><p><b>10+</b><span>mentored</span></p><p><b>20</b><span>taught Java</span></p></div>',
      more: rows([['Interviewed 30+ people', '', C.links.projects + '?kind=work'], ['Mentored 10+ junior developers', '', C.links.projects + '?kind=work'], ['Taught Java to 20 students; led a team of 15', '', C.eraById.mumbai.url]]) },
    { id: 'edu', c: 2, title: 'Education, 3 degrees', href: C.links.projects + '?kind=academic',
      face: '<div class="th"><span class="lab">Education</span><b class="num">3</b><span class="lab">degrees</span></div><ul class="edu"><li><b>MS</b> Computer Science<span class="num">USC 16–17</span></li><li><b>MTech</b> Geo-Informatics<span class="num">IIT-B 13–15</span></li><li><b>BE</b> Computer Eng.<span class="num">Mumbai 08–12</span></li></ul>',
      more: rows([['USC: MS Computer Science', '', C.eraById.usc.url, '7 projects'], ['IIT Bombay: MTech Geo-Informatics', '', C.eraById.iitb.url, '10 projects'], ['U. Mumbai: BE Computer Engineering', '', C.eraById.mumbai.url, '7 projects']]) },
    { id: 'contact', c: 2, title: 'Contact', href: null, cls: 'contact',
      face: '<div class="th"><span class="lab">Contact</span></div><a class="btn btn-primary" href="' + C.links.pdf + '" download>Resume PDF</a><p class="cl"><a href="' + C.person.github + '">GitHub</a><a href="' + C.person.linkedin + '">LinkedIn</a><a href="mailto:' + C.person.email + '">Email</a><a href="' + LIST + '">All projects</a></p>', more: '' }
  ];
  var RIGHT = 7; // tiles starting at or after this column anchor their overlay to the right edge

  var host = document.getElementById('bento'), col = 1, row = 1, html = '';
  T.forEach(function (t) {
    var r = t.r || 1;
    var side = col >= RIGHT ? ' rt' : '', bot = row >= 3 ? ' bt' : '';
    var title = esc(t.title);
    html += '<article class="tile hp ' + (t.cls || '') + side + bot + '" id="t-' + t.id + '" style="--c:' + t.c + ';--r:' + r + '" data-id="' + t.id + '">' +
      (t.href ? '<a class="ta" href="' + t.href + '"><span class="vh">' + title + ': open</span></a>' : '') +
      '<div class="face">' + t.face + '</div>' +
      (t.more ? '<div class="more hp" role="group" aria-label="' + title + ' breakdown"><p class="lab mh">' + title + '</p>' + t.more + '<button class="mx" type="button" aria-label="Close breakdown">&times;</button></div>' : '') + '</article>';
    col += t.c; if (col > 12) { col = 1; row++; }
  });
  host.innerHTML = html;

  /* touch: first tap opens the breakdown, second tap follows the link */
  var pinned = null, coarse = matchMedia('(hover:none)');
  function pin(t) { if (pinned) pinned.classList.remove('pin'); pinned = t; if (t) t.classList.add('pin'); document.body.classList.toggle('sheet', !!(t && t.querySelector('.more'))); }
  host.addEventListener('click', function (e) {
    var tile = e.target.closest('.tile'); if (!tile) return;
    if (e.target.closest('.mx')) { pin(null); return; }
    var a = e.target.closest('a');
    if (coarse.matches && a && a.classList.contains('ta') && tile.querySelector('.more') && tile !== pinned) { e.preventDefault(); pin(tile); }
    else if (coarse.matches && a && !a.closest('.more') && tile !== pinned && tile.querySelector('.more')) { e.preventDefault(); pin(tile); }
  });
  document.addEventListener('click', function (e) { if (pinned && !e.target.closest('.tile')) pin(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pinned) { pin(null); if (document.activeElement) document.activeElement.blur(); } });
  var open = BB.q.get('open'); if (open) { var t = document.getElementById('t-' + open); if (t) pin(t); }
})();
