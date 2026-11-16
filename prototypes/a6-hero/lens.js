/* lens.js: audience lens (none | robotics | fullstack). Owns the positioning line, the four proof
   points, the capability highlights and the "most relevant" list. ?lens= and localStorage. */
(function () {
  'use strict';
  var BB = window.BB = window.BB || {};
  var P = '../a4-pages/project.html?p=';
  var KEY = 'bb-lens-v1', IDS = ['robotics', 'fullstack'];

  /* proof: [figure (html), title, line, where, href] */
  var LENSES = {
    all: {
      name: 'general',
      pos: 'I build the simulators, safety metrics, platforms and tools that help autonomous vehicles and robots get safely onto real roads.',
      proofs: [
        ['93%', 'Minimum Risk Condition', 'Led a team of 4; graceful recovery in 93% of failure cases.', 'AutoX', P + 'autox-mrc'],
        ['$800K<small>/yr</small>', 'Binary Deployment', 'Proposed and led it with a team of 3; about $800K saved a year.', 'AutoX', P + 'autox-bindeploy'],
        ['$300K<small>/yr</small>', 'Observability and KPI metrics', 'Grafana and InfluxDB; about $300K of developer time saved a year.', 'AutoX', P + 'autox-obs'],
        ['10 days', 'ROS2 on embedded QNX', 'A lighter ROS2 stack; autonomy teams ported their modules in about 10 days.', 'AutoX', P + 'autox-qnx']],
      emph: ['speed', 'ttc']
    },
    robotics: {
      name: 'robotics',
      pos: 'Robotics and autonomous-vehicle software: safety fallbacks, embedded middleware, simulation, and the metrics that show a driverless vehicle is behaving safely.',
      proofs: [
        ['93%', 'Minimum Risk Condition', 'Led a team of 4 on graceful recovery; handles 93% of failure cases.', 'AutoX', P + 'autox-mrc'],
        ['10 days', 'ROS2 on embedded QNX', 'A lighter ROS2 stack; autonomy teams ported their modules in about 10 days.', 'AutoX', P + 'autox-qnx'],
        ['Top 10', 'AV simulator and safety metrics', 'Simulator backend and playback; safety metrics from simulation and road data.', 'Gatik', P + 'gatik-sim'],
        ['CPUC', 'Driverless-permit work', 'PTP time sync, flip-dot display and DriveU remote control, expedited for the permit.', 'AutoX', P + 'autox-flipdot']],
      emph: ['ttc', 'gap', 'tracked']
    },
    fullstack: {
      name: 'full stack',
      pos: 'Full-stack apps, data platforms and in-browser visualization: from pipelines and backends to the dashboards engineers and leadership use every day.',
      proofs: [
        ['$800K<small>/yr</small>', 'Binary Deployment', 'Proposed and led it with a team of 3; about $800K saved a year.', 'AutoX', P + 'autox-bindeploy'],
        ['$300K<small>/yr</small>', 'Observability and KPI metrics', 'Grafana and InfluxDB; about $300K of developer time saved a year.', 'AutoX', P + 'autox-obs'],
        ['SaaS', 'Leadership data platform', 'Company data from several sources in one app for leadership.', 'Gatik', P + 'gatik-saas'],
        ['20&times;', 'Scry Analytics', 'Core algorithm to O(n), about 20x faster; graph visualization with neo4j and sigma.js.', 'Intern, 2017', P + 'usc-scry']],
      emph: ['speed', 'cpu']
    }
  };
  /* [years, title, line, where, href, weights {all, robotics, fullstack}, why {lens: tag}] */
  var PROJECTS = [
    ['2025–26', 'AV simulator', 'Backend, playback, users, browser-based metrics.', 'Gatik', P + 'gatik-sim', [3, 3, 2.5], { all: 'simulation', robotics: 'simulation', fullstack: 'in-browser metrics' }],
    ['2025', 'Safety metrics', 'Top-10 metrics from simulation and road data.', 'Gatik', P + 'gatik-metrics', [2, 2.6, 2.4], { all: 'safety', robotics: 'safety', fullstack: 'pipelines' }],
    ['2025–26', 'Leadership data platform', 'Full-stack app for leadership dashboards.', 'Gatik', P + 'gatik-saas', [2, 0, 3], { all: 'full stack', fullstack: 'SaaS app' }],
    ['2018–24', 'Minimum Risk Condition', 'Led a team of 4; graceful recovery in 93% of failure cases.', 'AutoX', P + 'autox-mrc', [3, 3, 0], { all: 'safety', robotics: 'safety fallback' }],
    ['2018–24', 'Binary Deployment', 'Proposed and led, team of 3; about $800K saved a year.', 'AutoX', P + 'autox-bindeploy', [2.5, 1, 3], { all: 'platform', robotics: 'deployment', fullstack: 'platform' }],
    ['2018–24', 'Observability and KPI metrics', 'Grafana and InfluxDB; about $300K of developer time a year.', 'AutoX', P + 'autox-obs', [2.4, 1, 2.9], { all: 'data', robotics: 'telemetry', fullstack: 'KPI platform' }],
    ['2018–24', 'Lightweight ROS2 on embedded QNX', 'Autonomy teams ported their modules in about 10 days.', 'AutoX', P + 'autox-qnx', [2.2, 2.9, 0], { all: 'robotics', robotics: 'ROS2, embedded' }],
    ['2018–24', 'Delivery-robot routing', 'Auto path routing for the investor demos before Series B.', 'AutoX', P + 'autox-robot', [1, 2.4, 0.5], { robotics: 'navigation' }],
    ['2018–24', 'Flip-dot display, PTP sync, remote control', 'Expedited for the CPUC driverless permit.', 'AutoX', P + 'autox-flipdot', [1, 2.5, 0.5], { robotics: 'permit' }],
    ['2017', 'Scry Analytics internship', 'Core algorithm to O(n), about 20x faster; graph visualization.', 'USC', P + 'usc-scry', [1, 0, 2.6], { fullstack: '20x speedup' }],
    ['2016–17', 'Nao robot motion', 'Inverse kinematics so a humanoid could walk and draw.', 'USC', P + 'usc-nao', [1, 2, 0], { robotics: 'kinematics' }],
    ['2016', 'Fullerene', 'Phone as a game controller; top 4 at Caltech HackTech.', 'USC', P + 'usc-fullerene', [0.5, 0, 2.2], { fullstack: 'web + mobile' }],
    ['2013–14', 'Matsya autonomous underwater vehicle', 'Drivers, navigation, mapping and vision integration.', 'IIT Bombay', P + 'iitb-auv', [1.5, 2.7, 0], { robotics: 'AUV' }],
    ['2011–12', 'Remote control of mobile robots', 'Final-year project: robots driven over the web.', 'Mumbai', P + 'mum-robots', [0.5, 2, 1.2], { robotics: 'teleoperation', fullstack: 'web control' }]
  ];
  var COL = { all: 0, robotics: 1, fullstack: 2 };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function valid(l) { return IDS.indexOf(l) >= 0 ? l : 'all'; }
  function initial() {
    var q = new URLSearchParams(location.search).get('lens'), s = null;
    try { s = localStorage.getItem(KEY); } catch (e) {}
    return q !== null ? valid(q) : valid(s);
  }

  /* opts: { root, pos, proofs, plist, relMeta, caps (NodeList), onChange(lensId, lensDef) } */
  function create(o) {
    var d = document.documentElement, cur = 'all';
    function render(animate) {
      var L = LENSES[cur];
      d.setAttribute('data-lens', cur);
      o.root.querySelectorAll('[data-lens-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lens-btn') === cur)); });
      o.pos.textContent = L.pos;
      o.proofs.innerHTML = L.proofs.map(function (p) {
        return '<li><a class="proof" href="' + p[4] + '"><b class="pf-n">' + p[0] + '</b><span class="pf-w">' + esc(p[3]) + '</span><span class="pf-t">' + esc(p[1]) + '</span><span class="pf-d">' + esc(p[2]) + '</span></a></li>';
      }).join('');
      if (o.caps) o.caps.forEach(function (c) { c.classList.toggle('hit', cur !== 'all' && (c.getAttribute('data-lens-hit') || '').split(' ').indexOf(cur) >= 0); });
      if (o.plist) {
        var k = COL[cur];
        o.plist.innerHTML = PROJECTS.map(function (p, i) { return { p: p, s: p[5][k] - i * 0.001 }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 6).map(function (x) {
          var p = x.p, why = p[6][cur] || '';
          return '<li class="prow"><time>' + p[0] + '</time><div><h3><a href="' + p[4] + '">' + esc(p[1]) + '</a></h3><p>' + esc(p[2]) + '</p></div><span class="why">' + esc(why ? '▸ ' + why : p[3]) + '</span></li>';
        }).join('');
      }
      if (o.relMeta) o.relMeta.textContent = 'ordered for: ' + L.name;
      if (animate) [o.proofs, o.pos, o.plist].forEach(function (e) { if (!e) return; e.classList.remove('swap'); void e.offsetWidth; e.classList.add('swap'); });
      if (o.onChange) o.onChange(cur, L);
    }
    function set(l, user) {
      cur = valid(l); render(user);
      if (!user) return;
      try { localStorage.setItem(KEY, cur); } catch (e) {}
      var u = new URL(location.href); if (cur === 'all') u.searchParams.delete('lens'); else u.searchParams.set('lens', cur);
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
    o.root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lens-btn]'); if (!b) return;
      var l = b.getAttribute('data-lens-btn');
      set(l === cur ? 'all' : l, true);   // clicking the active lens returns to the general view
    });
    set(initial(), false);
    return { get: function () { return cur; }, set: set, def: function () { return LENSES[cur]; } };
  }

  BB.lens = { create: create, initial: initial, LENSES: LENSES, PROJECTS: PROJECTS };
})();
