/* sim.js: the toy world behind the hero. No dependencies, no DOM.
   - Geometry is built in code as triangle fills + line segments (one format,
     drawn by both the three.js renderer and the 2D-canvas fallback).
   - Each era is a small deterministic simulation stepped at a fixed 60 Hz.
   - Metrics are computed from simulation state with generic textbook definitions. */
(function () {
  'use strict';
  var TAU = Math.PI * 2, DT = 1 / 60;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function yawOf(vx, vz) { return Math.atan2(vx, vz); }
  function deg(r) { return r * 180 / Math.PI; }
  function wrapPi(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

  /* ------------------------------------------------------------------ geometry */
  function Geo() { this.t = []; this.s = []; }
  Geo.prototype.tri = function (a, b, c) { this.t.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
  Geo.prototype.quad = function (a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); };
  Geo.prototype.seg = function (a, b) { this.s.push(a[0], a[1], a[2], b[0], b[1], b[2]); };
  Geo.prototype.poly = function (p, closed) { for (var i = 0; i < p.length - 1; i++) this.seg(p[i], p[i + 1]); if (closed) this.seg(p[p.length - 1], p[0]); };
  Geo.prototype.hull = function (P, o) {
    o = o || {};
    if (!o.noFill) [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]].forEach(function (f) { this.quad(P[f[0]], P[f[1]], P[f[2]], P[f[3]]); }, this);
    if (!o.noEdge) [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(function (e) { this.seg(P[e[0]], P[e[1]]); }, this);
    return this;
  };
  /* box centred at c, size w,h,d. o.tx/o.tz scale the top face, o.tdz shifts it (cab windscreens),
     o.fz scales the +z face (CRT backs, noses), o.rx pitches the whole box, o.ry yaws it. */
  Geo.prototype.box = function (cx, cy, cz, w, h, d, o) {
    o = o || {};
    var hw = w / 2, hh = h / 2, hd = d / 2, tx = o.tx == null ? 1 : o.tx, tz = o.tz == null ? 1 : o.tz, tdz = o.tdz || 0, fz = o.fz == null ? 1 : o.fz, bz = o.bz == null ? 1 : o.bz;
    var raw = [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd], [-hw * tx, hh, -hd * tz + tdz], [hw * tx, hh, -hd * tz + tdz], [hw * tx, hh, hd * tz + tdz], [-hw * tx, hh, hd * tz + tdz]];
    raw = raw.map(function (p) { var k = p[2] > 0 ? fz : bz; return [p[0] * k, p[1] * k, p[2]]; });
    var rx = o.rx || 0, ry = o.ry || 0, c = Math.cos(rx), s = Math.sin(rx), c2 = Math.cos(ry), s2 = Math.sin(ry);
    var P = raw.map(function (p) { var y = p[1] * c - p[2] * s, z = p[1] * s + p[2] * c, x = p[0]; return [cx + x * c2 + z * s2, cy + y, cz - x * s2 + z * c2]; });
    return this.hull(P, o);
  };
  Geo.prototype.cyl = function (cx, cy, cz, r, l, ax, n, o) {
    o = o || {}; n = n || 10;
    function pt(u, v, rr) { var a = rr * Math.cos(u), b = rr * Math.sin(u); return ax === 'x' ? [cx + v, cy + a, cz + b] : ax === 'y' ? [cx + a, cy + v, cz + b] : [cx + a, cy + b, cz + v]; }
    var A = [], B = [], i;
    for (i = 0; i < n; i++) { var u = i / n * TAU + (o.rot || 0); A.push(pt(u, -l / 2, r)); B.push(pt(u, l / 2, r * (o.taper == null ? 1 : o.taper))); }
    var ca = pt(0, -l / 2, 0), cb = pt(0, l / 2, 0);
    if (!o.noFill) for (i = 0; i < n; i++) { var j = (i + 1) % n; this.quad(A[i], A[j], B[j], B[i]); this.tri(ca, A[j], A[i]); this.tri(cb, B[i], B[j]); }
    this.poly(A, true); this.poly(B, true);
    var ribs = o.ribs == null ? 0 : o.ribs;
    for (i = 0; i < ribs; i++) { var k = Math.floor(i * n / ribs); this.seg(A[k], B[k]); }
    if (o.hub) { var q = Math.floor(n / 4); this.seg(A[0], A[2 * q]); this.seg(A[q], A[3 * q]); this.seg(B[0], B[2 * q]); this.seg(B[q], B[3 * q]); }
    return this;
  };
  Geo.prototype.rect = function (pts) { this.poly(pts, true); };

  var MODELS = {};
  function model(key, fn) { var g = new Geo(); fn(g); MODELS[key] = { tri: new Float32Array(g.t), seg: new Float32Array(g.s) }; return MODELS[key]; }
  function getModel(key) { return MODELS[key]; }

  /* corner-bracket bounding boxes, cached per size */
  function bboxModel(w, h, d) {
    var key = 'bb_' + w.toFixed(2) + '_' + h.toFixed(2) + '_' + d.toFixed(2);
    if (MODELS[key]) return key;
    model(key, function (g) {
      var hw = w / 2, hd = d / 2, k = Math.min(0.6, Math.min(w, h, d) * 0.3);
      [-1, 1].forEach(function (sx) { [0, 1].forEach(function (sy) { [-1, 1].forEach(function (sz) {
        var p = [sx * hw, sy * h, sz * hd];
        g.seg(p, [p[0] - sx * k, p[1], p[2]]);
        g.seg(p, [p[0], p[1] + (sy ? -k : k), p[2]]);
        g.seg(p, [p[0], p[1], p[2] - sz * k]);
      }); }); });
    });
    return key;
  }
  model('ring', function (g) { var p = []; for (var i = 0; i < 128; i++) { var a = i / 128 * TAU; p.push([Math.cos(a), 0, Math.sin(a)]); } g.poly(p, true); });
  model('dring', function (g) { for (var i = 0; i < 96; i += 2) { var a = i / 96 * TAU, b = (i + 1) / 96 * TAU; g.seg([Math.cos(a), 0, Math.sin(a)], [Math.cos(b), 0, Math.sin(b)]); }
    for (i = 0; i < 72; i++) { var c = i / 72 * TAU, k = i % 6 === 0 ? 0.94 : 0.975; g.seg([Math.cos(c), 0, Math.sin(c)], [Math.cos(c) * k, 0, Math.sin(c) * k]); } });

  /* ------------------------------------------------------------------ models (metres, origin on the ground, forward = +z) */
  model('truck', function (g) {
    g.box(0, 0.78, -0.4, 2.2, 0.3, 7.4);                       // chassis
    g.box(0, 2.42, -1.1, 2.5, 2.95, 5.2);                      // cargo box
    g.box(0, 1.72, 2.68, 2.4, 2.05, 2.1, { tz: 0.8, tdz: -0.22 }); // cab
    g.box(0, 0.62, 3.83, 2.44, 0.32, 0.22);                    // bumper
    [2.8, -2.25, -3.1].forEach(function (z) { [-1.04, 1.04].forEach(function (x) { g.cyl(x, 0.5, z, 0.5, 0.32, 'x', 12, { hub: true }); }); });
    g.box(0, 2.82, 2.75, 2.0, 0.1, 0.5);                       // sensor bar
    g.cyl(0, 3.02, 2.75, 0.2, 0.3, 'y', 14, { ribs: 4 });      // roof lidar
    [-1.36, 1.36].forEach(function (x) { g.box(x, 2.2, 3.25, 0.14, 0.34, 0.24); });
    [-1.252, 1.252].forEach(function (x) {
      for (var z = -3.2; z <= 1.2; z += 0.88) g.seg([x, 0.97, z], [x, 3.87, z]);
      g.rect([[x * 0.96, 2.05, 1.95], [x * 0.96, 2.05, 2.95], [x * 0.96, 2.55, 2.85], [x * 0.96, 2.55, 2.0]]);
    });
    for (var y = 0.95; y <= 1.35; y += 0.13) g.seg([-0.8, y, 3.74], [0.8, y, 3.74]);
    g.seg([-1.0, 3.88, -3.71], [1.0, 3.88, -3.71]); g.seg([0, 0.97, -3.71], [0, 3.87, -3.71]);
  });
  model('taxi', function (g) {
    g.box(0, 0.68, 0, 1.96, 0.7, 5.0, { tz: 0.97 });
    g.box(0, 1.4, -0.3, 1.86, 0.74, 3.9, { tz: 0.82, tdz: -0.18, tx: 0.9 });
    g.box(0, 1.8, -0.35, 1.3, 0.06, 1.6);
    g.cyl(0, 1.98, -0.15, 0.2, 0.3, 'y', 14, { ribs: 4 });
    [-0.72, 0.72].forEach(function (x) { g.cyl(x, 1.89, 0.35, 0.08, 0.12, 'y', 8); });
    [1.62, -1.62].forEach(function (z) { [-0.92, 0.92].forEach(function (x) { g.cyl(x, 0.36, z, 0.36, 0.24, 'x', 12, { hub: true }); }); });
    [-0.985, 0.985].forEach(function (x) { g.seg([x, 1.06, -2.3], [x, 1.06, 1.6]); g.seg([x * 0.97, 0.4, 0.25], [x * 0.97, 1.7, 0.25]); g.seg([x * 0.97, 0.4, -1.0], [x * 0.97, 1.65, -1.0]); });
    g.seg([-0.7, 0.85, 2.5], [-0.35, 0.85, 2.5]); g.seg([0.7, 0.85, 2.5], [0.35, 0.85, 2.5]);
  });
  model('car', function (g) {
    g.box(0, 0.6, 0, 1.8, 0.56, 4.5, { tz: 0.95 });
    g.box(0, 1.12, -0.25, 1.62, 0.48, 2.4, { tz: 0.72, tx: 0.88 });
    [1.4, -1.4].forEach(function (z) { [-0.82, 0.82].forEach(function (x) { g.cyl(x, 0.33, z, 0.33, 0.22, 'x', 10, { hub: true }); }); });
  });
  model('cyc', function (g) {
    g.cyl(0, 0.34, 0.55, 0.34, 0.04, 'x', 14, { hub: true, noFill: true }); g.cyl(0, 0.34, -0.5, 0.34, 0.04, 'x', 14, { hub: true, noFill: true });
    var rh = [0, 0.34, -0.5], fh = [0, 0.34, 0.55], bb = [0, 0.32, 0], st = [0, 0.88, -0.18], hd = [0, 0.92, 0.42];
    g.poly([rh, bb, st, rh]); g.poly([bb, hd, fh]); g.seg(st, hd); g.seg([-0.25, 1.0, 0.45], [0.25, 1.0, 0.45]); g.seg(hd, [0, 1.0, 0.45]);
    g.box(0, 1.22, 0.05, 0.36, 0.56, 0.22, { rx: 0.45 });
    g.box(0, 1.6, 0.3, 0.2, 0.22, 0.22);
    g.poly([[0.12, 0.9, -0.15], [0.12, 0.62, 0.2], [0.12, 0.34, 0.05]]); g.poly([[-0.12, 0.9, -0.15], [-0.12, 0.6, 0.12], [-0.12, 0.3, -0.05]]);
    g.seg([0.18, 1.4, 0.15], [0.25, 1.0, 0.45]); g.seg([-0.18, 1.4, 0.15], [-0.25, 1.0, 0.45]);
  });
  model('ped', function (g) { g.box(0, 1.22, 0, 0.42, 0.6, 0.24, { tx: 0.92 }); g.box(0, 1.66, 0.01, 0.2, 0.24, 0.22); g.seg([0.24, 1.48, 0], [0.27, 0.95, 0.02]); g.seg([-0.24, 1.48, 0], [-0.27, 0.95, -0.02]); });
  model('leg', function (g) { g.box(0, -0.42, 0, 0.14, 0.84, 0.16); });
  model('bot', function (g) {
    g.box(0, 0.42, 0, 0.62, 0.5, 0.82, { tz: 0.94, tx: 0.95 });
    g.seg([-0.29, 0.6, -0.36], [0.29, 0.6, -0.36]); g.seg([-0.29, 0.6, 0.36], [0.29, 0.6, 0.36]);
    [-0.28, 0, 0.28].forEach(function (z) { [-0.33, 0.33].forEach(function (x) { g.cyl(x, 0.1, z, 0.1, 0.06, 'x', 8); }); });
    g.seg([-0.22, 0.67, -0.3], [-0.22, 1.55, -0.3]); g.poly([[-0.22, 1.55, -0.3], [-0.22, 1.43, -0.05], [-0.22, 1.33, -0.3]]);
    g.box(0, 0.58, 0.41, 0.3, 0.06, 0.02);
  });
  model('cone', function (g) { g.box(0, 0.38, 0, 0.32, 0.68, 0.32, { tx: 0.12, tz: 0.12 }); g.box(0, 0.025, 0, 0.44, 0.05, 0.44); g.seg([-0.11, 0.42, 0.11], [0.11, 0.42, 0.11]); });
  model('tree', function (g) { g.cyl(0, 0.8, 0, 0.1, 1.6, 'y', 6, { ribs: 2 }); g.box(0, 2.6, 0, 2.0, 2.4, 2.0, { tx: 0.06, tz: 0.06 }); });
  function building(key, w, h, d) {
    return model(key, function (g) {
      g.box(0, h / 2, 0, w, h, d);
      for (var y = 3.2; y < h - 0.5; y += 3.2) g.rect([[-w / 2, y, -d / 2], [w / 2, y, -d / 2], [w / 2, y, d / 2], [-w / 2, y, d / 2]]);
      g.box(w * 0.2, h + 0.6, -d * 0.1, w * 0.25, 1.2, d * 0.2);
    });
  }

  /* AUV, generic open-frame vehicle, about 1.3 m */
  model('auv', function (g) {
    g.cyl(0, 0.1, 0, 0.14, 1.05, 'z', 14, { ribs: 4 });
    g.cyl(0, 0.1, 0.58, 0.1, 0.12, 'z', 12, { taper: 0.55 });
    [-0.2, 0.2].forEach(function (x) { g.cyl(x, -0.13, -0.05, 0.065, 0.72, 'z', 10, { ribs: 2 }); });
    [-0.3, 0.3].forEach(function (x) { g.box(x, 0, -0.02, 0.02, 0.36, 0.92, { noFill: true }); g.cyl(x * 1.2, 0, 0.36, 0.06, 0.1, 'y', 10, { hub: true }); g.cyl(x * 1.2, 0, -0.42, 0.06, 0.1, 'y', 10, { hub: true }); });
    [-0.18, 0.18].forEach(function (x) { g.cyl(x, 0.1, -0.6, 0.07, 0.16, 'z', 10, { hub: true }); });
    g.box(0, -0.06, 0.44, 0.12, 0.08, 0.1);
    [-0.35, 0.3].forEach(function (z) { g.seg([-0.3, 0.17, z], [0.3, 0.17, z]); g.seg([-0.3, -0.17, z], [0.3, -0.17, z]); });
  });
  model('gate', function (g) { [-1.2, 1.2].forEach(function (x) { g.cyl(x, 0.85, 0, 0.045, 1.7, 'y', 8, { ribs: 2 }); }); g.box(0, 1.72, 0, 2.5, 0.06, 0.06); g.box(0, 0.04, 0, 2.5, 0.08, 0.3); });
  model('buoy', function (g) { g.cyl(0, 0, 0, 0.2, 0.3, 'y', 12, { ribs: 4 }); g.cyl(0, 0.2, 0, 0.14, 0.1, 'y', 12, { taper: 0.4 }); g.cyl(0, -0.2, 0, 0.14, 0.1, 'y', 12, { taper: 1.4 }); });
  model('marker', function (g) { g.box(0, 0.02, 0, 0.16, 0.03, 1.2); g.poly([[0, 0.04, 0.4], [0.07, 0.04, 0.28], [-0.07, 0.04, 0.28]], true); });
  model('anchor', function (g) { g.box(0, 0.05, 0, 0.2, 0.1, 0.2); });

  /* Nao-like humanoid parts (generic), pivots at the top of each limb */
  model('n_torso', function (g) { g.box(0, 0.105, 0, 0.15, 0.19, 0.1, { tx: 1.08 }); g.box(0, 0.015, 0, 0.12, 0.03, 0.08); g.rect([[-0.04, 0.16, 0.051], [0.04, 0.16, 0.051], [0.04, 0.11, 0.051], [-0.04, 0.11, 0.051]]); });
  model('n_head', function (g) { g.box(0, 0.06, 0, 0.12, 0.11, 0.115, { tx: 0.9, tz: 0.9 }); g.seg([-0.04, 0.07, 0.058], [-0.015, 0.07, 0.058]); g.seg([0.015, 0.07, 0.058], [0.04, 0.07, 0.058]); g.cyl(0.065, 0.06, 0, 0.025, 0.012, 'x', 8); g.cyl(-0.065, 0.06, 0, 0.025, 0.012, 'x', 8); });
  model('n_thigh', function (g) { g.box(0, -0.05, 0, 0.05, 0.1, 0.062, { tx: 1.1 }); });
  model('n_shin', function (g) { g.box(0, -0.05, 0, 0.046, 0.1, 0.056); g.cyl(0, 0, 0, 0.022, 0.05, 'x', 8); });
  model('n_foot', function (g) { g.box(0, -0.012, 0.016, 0.07, 0.024, 0.13); });
  model('n_arm', function (g) { g.box(0, -0.045, 0, 0.04, 0.09, 0.045); });
  model('n_print', function (g) { g.rect([[-0.035, 0.001, -0.05], [0.035, 0.001, -0.05], [0.035, 0.001, 0.08], [-0.035, 0.001, 0.08]]); });
  model('easel', function (g) {
    g.box(0, 0.5, 0, 0.6, 0.42, 0.02); g.seg([-0.25, 0, -0.15], [-0.22, 0.75, 0]); g.seg([0.25, 0, -0.15], [0.22, 0.75, 0]); g.seg([0, 0, -0.3], [0, 0.72, -0.02]);
    var p = []; for (var i = 0; i <= 60; i++) { var a = i / 60 * TAU * 2.2, r = 0.02 + i / 60 * 0.15; p.push([Math.cos(a) * r, 0.5 + Math.sin(a) * r * 1.05, 0.012]); } g.poly(p);
  });
  model('cube', function (g) { g.box(0, 0.05, 0, 0.1, 0.1, 0.1); });

  /* 2008: web-driven robot, arrow pad, BGI window */
  model('wbot', function (g) {
    g.box(0, 0.1, 0, 0.3, 0.1, 0.34);
    [-0.18, 0.18].forEach(function (x) { g.cyl(x, 0.07, 0.06, 0.07, 0.035, 'x', 10, { hub: true }); });
    g.cyl(0, 0.03, -0.13, 0.03, 0.02, 'x', 6);
    g.seg([0, 0.15, -0.08], [0, 0.4, -0.08]); g.box(0, 0.43, -0.06, 0.08, 0.06, 0.07); g.cyl(0, 0.43, -0.015, 0.02, 0.02, 'z', 8);
    g.seg([0.12, 0.15, -0.14], [0.12, 0.5, -0.16]);
    g.rect([[-0.1, 0.151, 0.02], [0.1, 0.151, 0.02], [0.1, 0.151, 0.14], [-0.1, 0.151, 0.14]]);
  });
  function arrowModel(key, pts) { model(key, function (g) { var P = pts.map(function (p) { return [p[0] * 0.18, 0.003, p[1] * 0.18]; }); for (var i = 1; i < P.length - 1; i++) g.tri(P[0], P[i], P[i + 1]); g.poly(P, true); }); }
  arrowModel('arr_f', [[0, 1], [0.7, 0.2], [0.3, 0.2], [0.3, -0.8], [-0.3, -0.8], [-0.3, 0.2], [-0.7, 0.2]]);
  arrowModel('arr_l', [[1, 0], [0.2, 0.7], [0.2, 0.3], [-0.8, 0.3], [-0.8, -0.3], [0.2, -0.3], [0.2, -0.7]]);
  arrowModel('arr_r', [[-1, 0], [-0.2, 0.7], [-0.2, 0.3], [0.8, 0.3], [0.8, -0.3], [-0.2, -0.3], [-0.2, -0.7]]);
  arrowModel('arr_s', [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]);
  model('padframe', function (g) { [[0, 0.24], [0.24, 0], [-0.24, 0], [0, 0]].forEach(function (c) { g.rect([[c[0] - 0.11, 0.002, c[1] - 0.11], [c[0] + 0.11, 0.002, c[1] - 0.11], [c[0] + 0.11, 0.002, c[1] + 0.11], [c[0] - 0.11, 0.002, c[1] + 0.11]]); }); });
  model('bgi', function (g) {
    var W = 1.6, H = 1.0, y0 = 0.25, z = 0;
    g.rect([[-W / 2, y0, z], [W / 2, y0, z], [W / 2, y0 + H, z], [-W / 2, y0 + H, z]]);
    g.seg([-W / 2, y0 + H - 0.08, z], [W / 2, y0 + H - 0.08, z]);
    g.rect([[-W / 2 + 0.03, y0 + H - 0.065, z], [-W / 2 + 0.08, y0 + H - 0.065, z], [-W / 2 + 0.08, y0 + H - 0.015, z], [-W / 2 + 0.03, y0 + H - 0.015, z]]);
    var p = []; for (var i = 0; i < 40; i++) { var a = i / 40 * TAU; p.push([-0.42 + Math.cos(a) * 0.22, y0 + 0.45 + Math.sin(a) * 0.22, z]); } g.poly(p, true);
    g.rect([[0.05, y0 + 0.2, z], [0.62, y0 + 0.2, z], [0.62, y0 + 0.72, z], [0.05, y0 + 0.72, z]]);
    for (i = 0; i < 9; i++) g.seg([0.05, y0 + 0.2 + i * 0.065, z], [0.05 + i * 0.07, y0 + 0.72, z]);
    g.seg([-W / 2, y0 - 0.25, -0.12], [-W / 2, y0, z]); g.seg([W / 2, y0 - 0.25, -0.12], [W / 2, y0, z]);
    g.seg([-W / 2, y0 - 0.25, -0.12], [-W / 2 + 0.2, y0 - 0.25, -0.12]); g.seg([W / 2, y0 - 0.25, -0.12], [W / 2 - 0.2, y0 - 0.25, -0.12]);
  });
  model('wall', function (g) { g.box(0, 0.15, 0, 2.4, 0.3, 0.06); });

  /* 1995: desk, beige desktop PC, CRT, keyboard, DOS manual */
  model('desk', function (g) {
    g.box(0, 0.73, 0, 1.3, 0.04, 0.7);
    [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]].forEach(function (p) { g.box(p[0], 0.355, p[1], 0.04, 0.71, 0.04); });
    g.box(0.4, 0.63, 0.0, 0.42, 0.16, 0.62); g.seg([0.25, 0.63, 0.311], [0.55, 0.63, 0.311]);
  });
  model('pc', function (g) {
    g.box(0, 0.81, -0.02, 0.52, 0.12, 0.44);
    g.rect([[0.06, 0.8, 0.201], [0.2, 0.8, 0.201], [0.2, 0.83, 0.201], [0.06, 0.83, 0.201]]); g.seg([0.08, 0.815, 0.201], [0.18, 0.815, 0.201]);
    g.rect([[-0.22, 0.79, 0.201], [-0.19, 0.79, 0.201], [-0.19, 0.81, 0.201], [-0.22, 0.81, 0.201]]);
    g.box(0, 1.1, 0.07, 0.44, 0.38, 0.08);
    g.box(0, 1.1, -0.17, 0.4, 0.34, 0.42, { bz: 0.6 });
    g.box(0, 0.885, -0.04, 0.22, 0.03, 0.2);
    var p = [], cx = 0, cy = 1.11, w = 0.17, h = 0.135, r = 0.02, z = 0.111;
    [[w - r, h - r, 0], [-w + r, h - r, 0.25], [-w + r, -h + r, 0.5], [w - r, -h + r, 0.75]].forEach(function (c) { for (var i = 0; i <= 4; i++) { var a = (c[2] + i / 16) * TAU; p.push([cx + c[0] + Math.cos(a) * r, cy + c[1] + Math.sin(a) * r, z]); } });
    g.poly(p, true);
  });
  model('crtscreen', function (g) { var z = 0.11; g.quad([-0.17, 0.975, z], [0.17, 0.975, z], [0.17, 1.245, z], [-0.17, 1.245, z]); });
  model('kbd', function (g) {
    g.box(0, 0.765, 0.32, 0.46, 0.03, 0.16, { tz: 0.9, tdz: -0.01 });
    for (var r = 0; r < 4; r++) g.seg([-0.21, 0.781, 0.26 + r * 0.035], [0.21, 0.781, 0.26 + r * 0.035]);
    for (var c = 0; c < 14; c++) g.seg([-0.21 + c * 0.0323, 0.781, 0.255], [-0.21 + c * 0.0323, 0.781, 0.37]);
  });
  model('manual', function (g) { g.box(0, 0.77, 0, 0.2, 0.035, 0.26, { ry: 0.25 }); g.box(0.02, 0.795, 0.02, 0.19, 0.02, 0.25, { ry: 0.32 }); });
  model('mouse', function (g) { g.box(0, 0.765, 0, 0.06, 0.03, 0.1, { tx: 0.7, tz: 0.8 }); g.seg([0, 0.78, 0.05], [0, 0.8, 0.12]); });
  model('cursor', function (g) { var w = 0.009, h = 0.004; g.quad([0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0]); g.rect([[0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0]]); });

  /* 1990: toy truck, blocks, ball */
  model('toy', function (g) {
    g.box(0, 0.04, 0, 0.11, 0.02, 0.27);
    g.box(0, 0.095, 0.085, 0.12, 0.09, 0.09, { tz: 0.75, tdz: -0.01 });
    g.box(0, 0.058, 0.145, 0.12, 0.035, 0.04);
    g.rect([[0.061, 0.1, 0.06], [0.061, 0.1, 0.11], [0.061, 0.125, 0.1], [0.061, 0.125, 0.065]]);
    g.rect([[-0.061, 0.1, 0.06], [-0.061, 0.1, 0.11], [-0.061, 0.125, 0.1], [-0.061, 0.125, 0.065]]);
    g.box(0, 0.055, -0.05, 0.13, 0.012, 0.17);
    g.box(0.06, 0.08, -0.05, 0.008, 0.04, 0.17); g.box(-0.06, 0.08, -0.05, 0.008, 0.04, 0.17); g.box(0, 0.08, -0.135, 0.13, 0.04, 0.008);
    [0.085, -0.085].forEach(function (z) { [-0.066, 0.066].forEach(function (x) { g.cyl(x, 0.034, z, 0.034, 0.024, 'x', 10, { hub: true }); }); });
  });
  var LETTERS = { A: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.25, 0.5, 0.75, 0.5]], B: [[0, 0, 0, 1], [0, 1, 0.7, 1], [0.7, 1, 0.7, 0.5], [0, 0.5, 1, 0.5], [1, 0.5, 1, 0], [1, 0, 0, 0]], C: [[1, 1, 0, 1], [0, 1, 0, 0], [0, 0, 1, 0]] };
  ['A', 'B', 'C'].forEach(function (L) {
    model('blk' + L, function (g) {
      var s = 0.07; g.box(0, s / 2, 0, s, s, s);
      LETTERS[L].forEach(function (q) { var m = 0.016, k = s - 2 * m; g.seg([-s / 2 + m + q[0] * k, m + q[1] * k, s / 2 + 0.001], [-s / 2 + m + q[2] * k, m + q[3] * k, s / 2 + 0.001]); g.seg([s / 2 + 0.001, m + q[1] * k, s / 2 - m - q[0] * k], [s / 2 + 0.001, m + q[3] * k, s / 2 - m - q[2] * k]); });
    });
  });
  model('ball', function (g) { g.cyl(0, 0.05, 0, 0.05, 0.06, 'y', 12, { ribs: 6 }); g.cyl(0, 0.05, 0, 0.035, 0.1, 'y', 12); g.cyl(0, 0.05, 0, 0.05, 0.01, 'x', 12, { noFill: true }); });

  /* ------------------------------------------------------------------ road route (rounded rectangle) */
  function Route(A, B, R) {
    var ds = 0.25, segs = [[2 * A - 2 * R, 0], [Math.PI / 2 * R, R], [2 * B - 2 * R, 0], [Math.PI / 2 * R, R], [2 * A - 2 * R, 0], [Math.PI / 2 * R, R], [2 * B - 2 * R, 0], [Math.PI / 2 * R, R]];
    var L = 0; segs.forEach(function (s) { L += s[0]; });
    var n = Math.round(L / ds), X = new Float64Array(n + 1), Z = new Float64Array(n + 1), P = new Float64Array(n + 1);
    var x = -A + R, z = -B, psi = 0, i = 0, si = 0, sAcc = 0;
    for (i = 0; i <= n; i++) {
      X[i] = x; Z[i] = z; P[i] = psi;
      var s = i * ds; while (si < segs.length - 1 && s >= sAcc + segs[si][0]) { sAcc += segs[si][0]; si++; }
      var k = segs[si][1] ? 1 / segs[si][1] : 0, pm = psi + k * ds / 2;
      x += Math.cos(pm) * ds; z += Math.sin(pm) * ds; psi += k * ds;
    }
    this.L = L; this.ds = ds; this.n = n; this.X = X; this.Z = Z; this.P = P;
  }
  Route.prototype.at = function (s) {
    s = ((s % this.L) + this.L) % this.L; var f = s / this.ds, i = Math.floor(f), t = f - i; if (i >= this.n) { i = this.n - 1; t = 1; }
    return { x: this.X[i] + (this.X[i + 1] - this.X[i]) * t, z: this.Z[i] + (this.Z[i + 1] - this.Z[i]) * t, psi: this.P[i] + (this.P[i + 1] - this.P[i]) * t };
  };
  Route.prototype.point = function (s, d) { var a = this.at(s); return [a.x - Math.sin(a.psi) * d, a.z + Math.cos(a.psi) * d, Math.atan2(Math.cos(a.psi), Math.sin(a.psi))]; };
  Route.prototype.curv = function (s) { var a = this.at(s - 1), b = this.at(s + 1); return Math.abs(b.psi - a.psi) / 2; };
  Route.prototype.wrap = function (ds) { var L = this.L; ds = ds % L; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L; return ds; };

  var ROUTE = null, S_CW = 42, LANE = 3.7, SHOULDER = 1.5;
  function roadWorld() {
    if (ROUTE) return ROUTE;
    var R = ROUTE = new Route(70, 40, 28);
    model('road', function (g) {
      var step = 1, s, curb = LANE + SHOULDER, walk = curb + 2.8;
      for (s = 0; s < R.L; s += step) {
        var a = R.point(s, -curb), b = R.point(s, curb), a2 = R.point(s + step, -curb), b2 = R.point(s + step, curb);
        g.quad([a[0], 0, a[1]], [b[0], 0, b[1]], [b2[0], 0, b2[1]], [a2[0], 0, a2[1]]);
      }
      function lineAt(d, dash, gap) {
        for (s = 0; s < R.L; s += step) {
          if (dash && (s % (dash + gap)) >= dash) continue;
          if (Math.abs(R.wrap(s - S_CW)) < 2.2 && Math.abs(d) < curb + 0.1) continue;
          var p = R.point(s, d), q = R.point(s + step, d); g.seg([p[0], 0.02, p[1]], [q[0], 0.02, q[1]]);
        }
      }
      lineAt(0, 3, 6); lineAt(LANE, 0, 0); lineAt(-LANE, 0, 0); lineAt(curb, 0, 0); lineAt(-curb, 0, 0); lineAt(walk, 0, 0); lineAt(-walk, 0, 0);
      for (var d = -curb + 0.4; d < curb - 0.3; d += 1.0) {
        var p1 = R.point(S_CW - 1.5, d), p2 = R.point(S_CW + 1.5, d), p3 = R.point(S_CW + 1.5, d + 0.5), p4 = R.point(S_CW - 1.5, d + 0.5);
        g.poly([[p1[0], 0.02, p1[1]], [p2[0], 0.02, p2[1]], [p3[0], 0.02, p3[1]], [p4[0], 0.02, p4[1]]], true);
      }
      var u = R.point(S_CW - 4, 0), v = R.point(S_CW - 4, LANE); g.seg([u[0], 0.02, u[1]], [v[0], 0.02, v[1]]);
      u = R.point(S_CW + 4, 0); v = R.point(S_CW + 4, -LANE); g.seg([u[0], 0.02, u[1]], [v[0], 0.02, v[1]]);
    });
    building('bld1', 18, 7, 12); building('bld2', 14, 10, 14); building('bld3', 24, 4.5, 10); building('bld4', 12, 8, 16); building('bld5', 16, 5, 12);
    return R;
  }

  /* ------------------------------------------------------------------ shared helpers */
  function History(n) { this.a = new Float32Array(n).fill(NaN); this.b = new Float32Array(n).fill(NaN); this.n = n; this.i = 0; this.acc = 0; }
  History.prototype.push = function (a, b) { this.a[this.i] = a; this.b[this.i] = b; this.i = (this.i + 1) % this.n; };
  History.prototype.tick = function (dt, fa, fb) { this.acc += dt; while (this.acc >= 0.1) { this.acc -= 0.1; this.push(fa(), fb()); } };
  function fmt(v, d) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
  function ttcText(t) { return isFinite(t) ? fmt(Math.min(t, 99), 1) : '\u221E'; }
  /* generic in-path TTC in the ego frame (constant velocity): ego {x,z,yaw,v,len,wid}; obs {x,z,r,vx,vz} */
  function egoFrameTTC(e, obs) {
    var fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), best = Infinity, who = null;
    obs.forEach(function (o) {
      var rx = o.x - e.x, rz = o.z - e.z, lon = rx * fx + rz * fz, lat = rx * fz - rz * fx;
      if (lon <= 0 || Math.abs(lat) > e.wid / 2 + o.r) return;
      var gap = lon - e.len / 2 - o.r, close = e.v - ((o.vx || 0) * fx + (o.vz || 0) * fz);
      if (close > 0.01) { var t = Math.max(0, gap) / close; if (t < best) { best = t; who = o; } }
    });
    return { ttc: best, who: who };
  }

  /* ------------------------------------------------------------------ era: road (truck 2026 / robotaxi 2018) */
  function RoadEra(kind) {
    var R = roadWorld(), self = this, truck = kind === 'truck';
    this.kind = kind; this.t = 0; this.hist = new History(200);
    function veh(o) { o.v0 = o.v0 || 11; o.aMax = o.aMax || 1.5; o.b = o.b || 2.5; o.T = o.T || 1.3; o.s0 = o.s0 || 3; o.h = o.h || 1.5; o.vd = 0; return o; }
    this.ego = veh({ id: 'ego', kind: 'ego', model: kind, s: 42 - 160 + 392, d: 1.85, v: 8, dir: 1, len: truck ? 7.8 : 5.0, wid: truck ? 2.5 : 2.0, h: truck ? 3.9 : 2.1, v0: truck ? 11 : 12.5, aMax: truck ? 1.0 : 1.6, b: 2.0, T: truck ? 1.8 : 1.4, s0: 4 });
    this.agents = [
      veh({ id: 'car1', kind: 'car', label: 'CAR', model: 'car', s: 42 - 135 + 392, d: 1.85, v: 10, dir: 1, len: 4.5, wid: 1.8, h: 1.4, v0: 12 }),
      veh({ id: 'car2', kind: 'car', label: 'CAR', model: 'car', s: 42 + 190, d: -1.85, v: 11, dir: -1, len: 4.5, wid: 1.8, h: 1.4, v0: 12.5 }),
      veh({ id: 'car3', kind: 'car', label: 'CAR', model: truck ? 'car' : 'taxi', s: 300, d: -1.85, v: 11, dir: -1, len: truck ? 4.5 : 5, wid: 1.9, h: 1.6, v0: 11.5 }),
      veh({ id: 'cyc', kind: 'cyc', label: 'CYCLIST', model: 'cyc', s: 42 - 75 + 392, d: 4.3, v: 4.6, dir: 1, len: 1.8, wid: 0.7, h: 1.8, v0: 4.8, aMax: 1, T: 1, s0: 2 }),
      { id: 'ped', kind: 'ped', label: 'PEDESTRIAN', model: 'ped', s: S_CW, d: -7, v: 0, dir: 0, len: 0.5, wid: 0.6, h: 1.8, vd: 0 },
      { id: 'park', kind: 'park', label: 'PARKED', model: 'car', s: 318, d: 4.6, v: 0, dir: 1, len: 4.5, wid: 1.8, h: 1.4, vd: 0 }
    ];
    if (!truck) this.agents.push({ id: 'bot', kind: 'bot', label: 'DELIVERY BOT', model: 'bot', s: 70, d: 6.7, v: 1.3, dir: -1, len: 0.8, wid: 0.65, h: 0.7, vd: 0 });
    this.cones = []; for (var i = 0; i < 5; i++) this.cones.push({ id: 'cone' + i, kind: 'cone', s: 228 + i * 4, d: -4.5, v: 0, dir: 1, len: 0.4, wid: 0.4, h: 0.7 });
    this.statics = [
      { m: 'bld1', x: -38, z: -12, yaw: 0 }, { m: 'bld2', x: -12, z: 10, yaw: 0 }, { m: 'bld3', x: 18, z: -14, yaw: 0 }, { m: 'bld4', x: 42, z: 8, yaw: 0 }, { m: 'bld5', x: 12, z: 16, yaw: 0 }
    ];
    for (var s = 12; s < 0; s += 37) { if (Math.abs(R.wrap(s - S_CW)) < 8) continue; var p = R.point(s, 11); this.statics.push({ m: 'tree', x: p[0], z: p[1], yaw: s }); }
    this.track = {}; this.encHist = new Uint8Array(200); this.encI = 0; this.encAcc = 0; this.minGapSession = Infinity;
    this.lidarR = 45; this.lidarT = 1.5;
    this.m = {};
    this.step(0);
  }
  RoadEra.prototype.pedD = function (t) {
    var c = (t + 23.5) % 32, sp = 14 / 1.3;
    if (c < 5) return { d: -7, vd: 0, start: 5 - c };
    if (c < 5 + sp) return { d: -7 + 1.3 * (c - 5), vd: 1.3, start: 0 };
    if (c < 21) return { d: 7, vd: 0, start: 21 - c };
    if (c < 21 + sp) return { d: 7 - 1.3 * (c - 21), vd: -1.3, start: 0 };
    return { d: -7, vd: 0, start: 37 - c };
  };
  RoadEra.prototype.pedConflict = function (a) {
    var p = this.ped, dc = a.d, half = a.wid / 2 + 1.2;
    if (p.vd > 0) return p.d < dc + half;
    if (p.vd < 0) return p.d > dc - half;
    return p.start < 1.5 && Math.abs(p.d) < 7.5 && ((p.d < 0 && dc > p.d) || (p.d > 0 && dc < p.d));
  };
  RoadEra.prototype.idm = function (a, all) {
    var R = ROUTE, best = null, bdv = 0, self = this;
    all.forEach(function (b) {
      if (b === a) return;
      if (Math.abs(b.d - a.d) > (a.wid + b.wid) / 2 + 0.3) return;
      var D = R.wrap(b.s - a.s) * a.dir; if (D <= 0 || D > 120) return;
      var gap = D - (a.len + b.len) / 2, vb = b.dir ? b.v * b.dir * a.dir : 0;
      if (best === null || gap < best) { best = gap; bdv = a.v - vb; }
    });
    if (this.pedConflict(a)) {
      var D = R.wrap(S_CW - 4 * a.dir - a.s) * a.dir - a.len / 2;
      if (D > -0.5 && (D > a.v * a.v / 10 - 1 || a.v < 1.5) && (best === null || D < best)) { best = Math.max(D, 0.05); bdv = a.v; }
    }
    var k = Math.max(R.curv(a.s), R.curv(a.s + 12 * a.dir), R.curv(a.s + 24 * a.dir)), v0 = Math.min(a.v0, Math.sqrt(2.0 / Math.max(k, 1e-4)));
    var v = a.v, sStar = a.s0 + Math.max(0, v * a.T + v * bdv / (2 * Math.sqrt(a.aMax * a.b)));
    var acc = a.aMax * (1 - Math.pow(v / v0, 4));
    if (best !== null) acc -= a.aMax * Math.pow(sStar / Math.max(best, 0.1), 2);
    return clamp(acc, -6, a.aMax);
  };
  RoadEra.prototype.step = function (dt) {
    var R = ROUTE, self = this, t = (this.t += dt), e = this.ego;
    var pd = this.pedD(t); this.ped = pd;
    var ped = this.agents[4]; ped.d = pd.d; ped.vd = pd.vd;
    this.agents.forEach(function (a) { if (a.id === 'car1') a.v0 = 9.5 + 2 * Math.sin(t * 0.11 + 1); });
    var road = [e].concat(this.agents, this.cones);
    var movers = [e].concat(this.agents.filter(function (a) { return a.kind === 'car' || a.kind === 'cyc'; }));
    var accs = movers.map(function (a) { return self.idm(a, road); });
    movers.forEach(function (a, i) { a.v = Math.max(0, a.v + accs[i] * dt); a.s = ((a.s + a.v * a.dir * dt) % R.L + R.L) % R.L; a.acc = accs[i]; });
    this.agents.forEach(function (a) { if (a.kind === 'bot') a.s = ((a.s + a.v * a.dir * dt) % R.L + R.L) % R.L; });
    /* ego lateral: hold lane centre, give vulnerable users / parked cars room, small controller wobble */
    var target = 1.85;
    road.forEach(function (b) {
      if (b === e || b.d < 2.5 || b.d > 6) return;
      var D = R.wrap(b.s - e.s); if (D < -12 || D > 28) return;
      target = Math.min(target, Math.max(1.85 - 0.75, b.d - b.wid / 2 - 1.5 - e.wid / 2));
    });
    var wob = 0.07 * Math.sin(t * 0.9) + 0.035 * Math.sin(t * 2.3 + 1);
    var nd = e.d + (target + wob - e.d) * (1 - Math.exp(-dt * 0.9));
    e.vd = dt > 0 ? (nd - e.d) / dt : 0; e.d = nd;
    /* lidar: an agent is (re)detected when the sweep passes it */
    var r1 = ((t % this.lidarT) / this.lidarT) * this.lidarR, r0 = (((t - dt) % this.lidarT + this.lidarT) % this.lidarT / this.lidarT) * this.lidarR;
    var ep = R.point(e.s, e.d);
    this.agents.forEach(function (a) {
      var p = R.point(a.s, a.d), dist = Math.hypot(p[0] - ep[0], p[1] - ep[1]);
      var tr = self.track[a.id] || (self.track[a.id] = { seen: -99, flash: 0 });
      if (dist <= self.lidarR && ((r0 <= r1 && dist > r0 && dist <= r1) || (r0 > r1 && (dist > r0 || dist <= r1)))) { if (t - tr.seen > 1.7) tr.flash = 1; tr.seen = t; }
      tr.flash = Math.max(0, tr.flash - dt * 1.6); tr.dist = dist; tr.on = (t - tr.seen) < self.lidarT + 0.2 && dist <= self.lidarR;
    });
    this.ringR = r1;
    this.compute(dt);
  };
  RoadEra.prototype.compute = function (dt) {
    var R = ROUTE, e = this.ego, self = this, all = this.agents.concat(this.cones);
    var ttc = Infinity, ttcWho = null, gap = Infinity, gapWho = null, enc = 0;
    all.forEach(function (b) {
      var ds = R.wrap(b.s - e.s), dd = b.d - e.d;
      var gs = Math.max(0, Math.abs(ds) - (e.len + b.len) / 2), gd = Math.max(0, Math.abs(dd) - (e.wid + b.wid) / 2), c = Math.hypot(gs, gd);
      if (c < gap) { gap = c; gapWho = b; }
      if (ds > 0 && ds < 100 && Math.abs(dd) < (e.wid + b.wid) / 2) {
        var vb = b.dir ? b.v * b.dir : 0, close = e.v - vb;
        if (close > 0.05) { var tt = gs / close; if (tt < ttc) { ttc = tt; ttcWho = b; } }
      }
      if (ds > -e.len / 2 && ds < 40 && Math.abs(b.d - 1.85) < LANE / 2 + b.wid / 2 && b.kind !== 'cone' && !(b.kind === 'car' && Math.abs(b.d - 1.85) < 0.5)) enc = 1;
    });
    this.encAcc += dt;
    while (this.encAcc >= 0.1) { this.encAcc -= 0.1; this.encHist[this.encI] = enc; this.encI = (this.encI + 1) % 200; }
    var encT = 0; for (var i = 0; i < 200; i++) encT += this.encHist[i]; encT /= 10;
    if (this.t > 1) this.minGapSession = Math.min(this.minGapSession, gap);
    var tracked = 0; for (var k in this.track) if (this.track[k].on) tracked++;
    this.m = { speed: e.v * 3.6, off: 1.85 - e.d, ttc: ttc, ttcWho: ttcWho, gap: gap, gapWho: gapWho, enc: encT, tracked: tracked, total: this.agents.length };
    this.hist.tick(dt, function () { return Math.min(self.m.ttc, 10); }, function () { return self.m.speed; });
  };
  RoadEra.prototype.metrics = function () {
    var m = this.m, off = m.off;
    return [
      { k: 'speed', label: 'Ego speed', value: fmt(m.speed, 1), unit: 'km/h', frac: m.speed / 60, kind: 'ring', note: this.kind === 'truck' ? 'box truck' : 'robotaxi' },
      { k: 'lane', label: 'Lane offset', value: (off >= 0 ? 'L ' : 'R ') + fmt(Math.abs(off), 2), unit: 'm', frac: clamp(off / 1.0, -1, 1), kind: 'center', note: 'from lane centre' },
      { k: 'ttc', label: 'Time to collision', value: ttcText(m.ttc), unit: 's', frac: isFinite(m.ttc) ? 1 - Math.min(m.ttc, 10) / 10 : 0, kind: 'bar', warn: m.ttc < 3, note: m.ttcWho ? 'in path: ' + (m.ttcWho.label || m.ttcWho.kind).toLowerCase() : 'nothing closing in path' },
      { k: 'gap', label: 'Min gap', value: fmt(m.gap, 1), unit: 'm', frac: 1 - Math.min(m.gap, 10) / 10, kind: 'bar', warn: m.gap < 1, note: 'encroached ' + fmt(m.enc, 1) + ' s of 20 s' },
      { k: 'tracked', label: 'Tracked agents', value: String(m.tracked), unit: '/ ' + m.total, frac: m.tracked / m.total, kind: 'dots', n: m.total, note: 'within ' + this.lidarR + ' m sweep' }
    ];
  };
  RoadEra.prototype.chart = { a: { label: 'TTC', unit: 's', max: 10 }, b: { label: 'Speed', unit: 'km/h', max: 60 } };
  RoadEra.prototype.pose = function (a) { var R = ROUTE, p = R.point(a.s, a.d), yaw = p[2]; if (a.dir < 0) yaw += Math.PI; if (a.v > 0.5) yaw += Math.atan2(-(a.vd || 0), a.v) * (a.dir || 1); return { x: p[0], z: p[1], yaw: yaw }; };
  RoadEra.prototype.objects = function () {
    var R = ROUTE, self = this, out = [{ id: 'road', m: 'road', p: [0, 0, 0], cls: 'world' }], e = this.ego, ep = this.pose(e);
    this.statics.forEach(function (s, i) { out.push({ id: 'st' + i, m: s.m, p: [s.x, 0, s.z], yaw: s.yaw || 0, cls: 'static' }); });
    this.cones.forEach(function (c) { var p = R.point(c.s, c.d); out.push({ id: c.id, m: 'cone', p: [p[0], 0, p[1]], cls: 'static' }); });
    out.push({ id: 'ego', m: e.model, p: [ep.x, 0, ep.z], yaw: ep.yaw, cls: 'ego' });
    var crit = this.m.ttc < 4 ? this.m.ttcWho : null;
    this.agents.forEach(function (a) {
      var q = self.pose(a);
      if (a.kind === 'ped') {
        var fy = a.vd ? (a.vd > 0 ? q.yaw - Math.PI / 2 : q.yaw + Math.PI / 2) : q.yaw + Math.PI / 2 * (a.d < 0 ? -1 : 1), sw = a.vd ? 0.45 * Math.sin(self.t * 5.5) : 0;
        var rx = Math.cos(fy) * 0.1, rz = -Math.sin(fy) * 0.1;
        out.push({ id: 'ped', m: 'ped', p: [q.x, 0, q.z], yaw: fy, cls: 'agent' });
        out.push({ id: 'pedl', m: 'leg', p: [q.x + rx, 0.88, q.z + rz], yaw: fy, pitch: sw, cls: 'agent' });
        out.push({ id: 'pedr', m: 'leg', p: [q.x - rx, 0.88, q.z - rz], yaw: fy, pitch: -sw, cls: 'agent' });
        q.yaw = fy;
      } else out.push({ id: a.id, m: a.model, p: [q.x, 0, q.z], yaw: q.yaw, cls: 'agent' });
      var tr = self.track[a.id];
      if (tr && tr.on) out.push({ id: 'bb_' + a.id, m: bboxModel(a.wid + 0.4, a.h + 0.25, a.len + 0.4), p: [q.x, 0, q.z], yaw: q.yaw, cls: a === crit ? 'warn' : 'bbox', a: 0.55 + 0.45 * tr.flash });
    });
    /* planned path: lane centre ahead for ~5 s of travel, corridor edges dashed */
    var L = Math.max(14, e.v * 5), n = 40, strip = new Float32Array((n + 1) * 3), seg = [], tgt = e.d;
    for (var i = 0; i <= n; i++) {
      var s = e.s + e.len / 2 + L * i / n, k = i / n, d = e.d + (1.85 - e.d) * sstep(0, 1, k * 1.5), p = R.point(s, d);
      strip[i * 3] = p[0]; strip[i * 3 + 1] = 0.06; strip[i * 3 + 2] = p[1];
      if (i < n && i % 2 === 0) [-1, 1].forEach(function (sg) { var a = R.point(s, d + sg * e.wid / 2), b = R.point(s + L / n, d + sg * e.wid / 2); seg.push(a[0], 0.05, a[1], b[0], 0.05, b[1]); });
    }
    var tip = R.point(e.s + e.len / 2 + L, 1.85), tl = R.point(e.s + e.len / 2 + L - 1.4, 1.85 - 0.7), tr2 = R.point(e.s + e.len / 2 + L - 1.4, 1.85 + 0.7);
    seg.push(tl[0], 0.06, tl[1], tip[0], 0.06, tip[1], tip[0], 0.06, tip[1], tr2[0], 0.06, tr2[1]);
    out.push({ id: 'path', strip: strip, cls: 'path' });
    out.push({ id: 'corr', seg: new Float32Array(seg), cls: 'path', a: 0.5 });
    out.push({ id: 'range', m: 'dring', p: [ep.x, 0.03, ep.z], s: this.lidarR, cls: 'world', a: 0.7 });
    out.push({ id: 'lidar', m: 'ring', p: [ep.x, 0.04, ep.z], s: Math.max(0.01, this.ringR), cls: 'ring', a: 0.9 * Math.pow(1 - this.ringR / this.lidarR, 0.6) });
    return out;
  };
  RoadEra.prototype.labels = function () {
    var self = this, out = [];
    this.agents.forEach(function (a) {
      var tr = self.track[a.id]; if (!tr || !tr.on) return;
      var q = self.pose(a);
      out.push({ id: a.id, p: [q.x, a.h + 0.9, q.z], text: a.label + ' ' + fmt(tr.dist, 1) + ' m', warn: self.m.ttc < 4 && self.m.ttcWho === a });
    });
    return out;
  };
  RoadEra.prototype.cam = function () {
    var R = ROUTE, e = this.ego, p = this.pose(e), a = R.point(e.s + 8, 1.85), b = R.point(e.s - 12, 1.85), fx = a[0] - b[0], fz = a[1] - b[1], l = Math.hypot(fx, fz);
    var truck = this.kind === 'truck';
    return { focus: [p.x, truck ? 1.6 : 1.0, p.z], fwd: [fx / l, fz / l], dist: truck ? 54 : 44, height: truck ? 21 : 17, fov: 26, ahead: truck ? 4 : 3, side: 0.4, frame: 'chase' };
  };
  RoadEra.prototype.ground = { mode: 0, minor: 2, major: 10, fade: 120, amp: 0, glowR: 9 };
  RoadEra.prototype.ring = function () { var p = this.pose(this.ego); return { x: p.x, z: p.z, r: this.ringR, a: 1 - this.ringR / this.lidarR, w: 1.6 }; };
  RoadEra.prototype.describe = function () { return this.kind === 'truck' ? 'An autonomous box truck drives a looped road past a car, a cyclist, a pedestrian at a crossing and parked obstacles. A lidar ring sweeps out from the truck; detected agents get bounding boxes and the planned path is drawn ahead.' : 'A robotaxi minivan drives a looped road while a small delivery robot rolls along the pavement; other cars, a cyclist and a pedestrian are tracked with bounding boxes.'; };

  /* ------------------------------------------------------------------ era: AUV (2013) */
  function bathy(x, z) { return 0.55 * Math.sin(x * 0.21 + 0.3) * Math.cos(z * 0.17) + 0.35 * Math.sin((x + z) * 0.11 + 1.2) + 0.2 * Math.sin(x * 0.5 - z * 0.37); }
  function AuvEra() {
    this.t = 0; this.u = 0.05; this.hist = new History(200); this.surface = 5.2; this.sonarR = 14; this.sonarT = 2.2; this.track = {};
    var self = this;
    this.pathAt = function (u) { var a = u * TAU; return [7.5 * Math.cos(a), 2.5 + 0.55 * Math.sin(2 * a + 0.5), 4.6 * Math.sin(a) + 1.0 * Math.sin(2 * a)]; };
    function along(u, off) { var p = self.pathAt(u), q = self.pathAt(u + 0.001), tx = q[0] - p[0], tz = q[2] - p[2], l = Math.hypot(tx, tz); return [p[0] + tz / l * off, p[2] - tx / l * off, Math.atan2(tx, tz)]; }
    var g = along(0.25, 0); this.gate = { id: 'gate', label: 'GATE', x: g[0], z: g[1], yaw: g[2] + Math.PI / 2, r: 1.3 };
    this.buoys = [[0.52, 1.3, 2.2], [0.6, -1.4, 2.6], [0.84, 1.2, 1.9]].map(function (b, i) { var p = along(b[0], b[1]); return { id: 'buoy' + i, label: 'BUOY ' + (i + 1), x: p[0], z: p[1], y: b[2], r: 0.25 }; });
    var m = along(0.4, 0); this.marker = { x: m[0], z: m[1], yaw: m[2] };
    this.step(0);
  }
  AuvEra.prototype.step = function (dt) {
    var self = this, t = (this.t += dt), v = 0.85;
    var p = this.pathAt(this.u), q = this.pathAt(this.u + 0.0005), dl = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) / 0.0005;
    this.u = (this.u + v * dt / dl) % 1;
    p = this.pathAt(this.u); q = this.pathAt(this.u + 0.002);
    var hx = q[0] - p[0], hz = q[2] - p[2], hl = Math.hypot(hx, hz);
    var yaw = Math.atan2(hx, hz), prev = this.yaw == null ? yaw : this.yaw;
    this.yawRate = dt > 0 ? wrapPi(yaw - prev) / dt : 0; this.yaw = yaw;
    this.pos = [p[0], p[1] + 0.04 * Math.sin(t * 1.3), p[2]]; this.pitch = -Math.atan2(q[1] - p[1], hl); this.v = v;
    var r1 = ((t % this.sonarT) / this.sonarT) * this.sonarR, r0 = ((((t - dt) % this.sonarT) + this.sonarT) % this.sonarT / this.sonarT) * this.sonarR; this.ringR = r1;
    [this.gate].concat(this.buoys).forEach(function (o) {
      var d = Math.hypot(o.x - self.pos[0], o.z - self.pos[2]), tr = self.track[o.id] || (self.track[o.id] = { seen: -99, flash: 0 });
      if (d <= self.sonarR && ((r0 <= r1 && d > r0 && d <= r1) || (r0 > r1 && (d > r0 || d <= r1)))) { if (t - tr.seen > 2.4) tr.flash = 1; tr.seen = t; }
      tr.flash = Math.max(0, tr.flash - dt * 1.4); tr.dist = d; tr.on = t - tr.seen < self.sonarT + 0.2 && d <= self.sonarR;
    });
    var n = 0; for (var k in this.track) if (this.track[k].on) n++;
    this.m = { depth: this.surface - this.pos[1], heading: (deg(yaw) + 360) % 360, alt: this.pos[1] - bathy(this.pos[0], this.pos[2]), speed: v, contacts: n };
    this.hist.tick(dt, function () { return self.m.depth; }, function () { return self.m.alt; });
  };
  AuvEra.prototype.metrics = function () {
    var m = this.m;
    return [
      { k: 'speed', label: 'Depth', value: fmt(m.depth, 2), unit: 'm', frac: m.depth / this.surface, kind: 'ring', note: 'below surface' },
      { k: 'lane', label: 'Heading', value: fmt(m.heading, 0).padStart(3, '0'), unit: '\u00B0', frac: wrapPi(m.heading / 180 * Math.PI) / Math.PI, kind: 'center', note: 'turn rate ' + fmt(deg(this.yawRate), 1) + ' \u00B0/s' },
      { k: 'ttc', label: 'Altitude', value: fmt(m.alt, 2), unit: 'm', frac: 1 - m.alt / 4, kind: 'bar', note: 'above the seabed' },
      { k: 'gap', label: 'Speed', value: fmt(m.speed, 2), unit: 'm/s', frac: m.speed / 1.5, kind: 'bar', note: 'pitch ' + fmt(deg(this.pitch), 1) + '\u00B0' },
      { k: 'tracked', label: 'Sonar contacts', value: String(m.contacts), unit: '/ 4', frac: m.contacts / 4, kind: 'dots', n: 4, note: 'gate and buoys in ' + this.sonarR + ' m' }
    ];
  };
  AuvEra.prototype.chart = { a: { label: 'Depth', unit: 'm', max: 5 }, b: { label: 'Altitude', unit: 'm', max: 5 } };
  AuvEra.prototype.objects = function () {
    var self = this, out = [], P = this.pos;
    out.push({ id: 'auv', m: 'auv', p: P, yaw: this.yaw, pitch: this.pitch, roll: -this.yawRate * 0.25, cls: 'ego' });
    var g = this.gate; out.push({ id: 'gate', m: 'gate', p: [g.x, bathy(g.x, g.z) + 0.6, g.z], yaw: g.yaw, cls: 'static' });
    var tether = [], drop = [];
    this.buoys.forEach(function (b) { var by = bathy(b.x, b.z) + b.y; out.push({ id: b.id, m: 'buoy', p: [b.x, by, b.z], cls: 'agent' }); out.push({ id: b.id + 'a', m: 'anchor', p: [b.x, bathy(b.x, b.z), b.z], cls: 'static' }); tether.push(b.x, by - 0.25, b.z, b.x, bathy(b.x, b.z) + 0.1, b.z); });
    var mk = this.marker; out.push({ id: 'marker', m: 'marker', p: [mk.x, bathy(mk.x, mk.z), mk.z], yaw: mk.yaw, cls: 'static' });
    out.push({ id: 'tether', seg: new Float32Array(tether), cls: 'static' });
    var hb = bathy(P[0], P[2]); for (var y = P[1] - 0.25; y > hb + 0.05; y -= 0.16) drop.push(P[0], y, P[2], P[0], Math.max(hb, y - 0.08), P[2]);
    drop.push(P[0] - 0.25, hb + 0.01, P[2], P[0] + 0.25, hb + 0.01, P[2], P[0], hb + 0.01, P[2] - 0.25, P[0], hb + 0.01, P[2] + 0.25);
    out.push({ id: 'drop', seg: new Float32Array(drop), cls: 'path', a: 0.7 });
    var n = 60, strip = new Float32Array((n + 1) * 3);
    for (var i = 0; i <= n; i++) { var p = this.pathAt(this.u + 0.004 + i * 0.0035); strip[i * 3] = p[0]; strip[i * 3 + 1] = p[1]; strip[i * 3 + 2] = p[2]; }
    out.push({ id: 'path', strip: strip, cls: 'path' });
    [this.gate].concat(this.buoys).forEach(function (o) { var tr = self.track[o.id]; if (tr && tr.on) { var isG = o === self.gate, h = isG ? 2.0 : 0.6, base = isG ? bathy(o.x, o.z) + 0.55 : bathy(o.x, o.z) + o.y - 0.3; out.push({ id: 'bb_' + o.id, m: isG ? bboxModel(2.8, h, 0.5) : bboxModel(0.6, h, 0.6), p: [o.x, base, o.z], yaw: o.yaw || 0, cls: 'bbox', a: 0.55 + 0.45 * tr.flash }); } });
    out.push({ id: 'lidar', m: 'ring', p: [P[0], hb + 0.05, P[2]], s: Math.max(0.01, this.ringR), cls: 'ring', a: 0.7 * (1 - this.ringR / this.sonarR) });
    return out;
  };
  AuvEra.prototype.labels = function () {
    var self = this, out = [];
    [this.gate].concat(this.buoys).forEach(function (o) { var tr = self.track[o.id]; if (!tr || !tr.on) return; var y = o === self.gate ? bathy(o.x, o.z) + 2.9 : bathy(o.x, o.z) + o.y + 0.6; out.push({ id: o.id, p: [o.x, y, o.z], text: o.label + ' ' + fmt(tr.dist, 1) + ' m' }); });
    return out;
  };
  AuvEra.prototype.cam = function () { return { focus: this.pos, fwd: [Math.sin(this.yaw), Math.cos(this.yaw)], dist: 10, height: 4.6, fov: 30, ahead: 0.8, side: 0.45, smooth: true }; };
  AuvEra.prototype.ground = { mode: 2, minor: 1, major: 5, fade: 30, amp: 1, glowR: 3, contour: 0.18 };
  AuvEra.prototype.ring = function () { return { x: this.pos[0], z: this.pos[2], r: this.ringR, a: 1 - this.ringR / this.sonarR, w: 0.6 }; };
  AuvEra.prototype.describe = function () { return 'An autonomous underwater vehicle follows a looped course through a gate and around three buoys above a contoured seabed. A sonar ring sweeps out and marks contacts.'; };

  /* ------------------------------------------------------------------ era: humanoid (2016) */
  function NaoEra() { this.t = 0; this.hist = new History(200); this.steps = 0; this.prints = []; this.lastPh = [0, 0.5]; this.Rc = 0.85; this.step(0); }
  NaoEra.prototype.T = 1.0; NaoEra.prototype.S = 0.05; NaoEra.prototype.L1 = 0.1; NaoEra.prototype.L2 = 0.1; NaoEra.prototype.Hh = 0.21;
  NaoEra.prototype.leg = function (ph) {
    var S = this.S, z, lift = 0;
    if (ph < 0.5) z = S / 2 - S * (ph / 0.5); else { var k = sstep(0, 1, (ph - 0.5) / 0.5); z = -S / 2 + S * k; lift = 0.022 * Math.sin(Math.PI * (ph - 0.5) / 0.5); }
    var ys = -(this.Hh - 0.024 - lift), L1 = this.L1, L2 = this.L2, D = Math.min(Math.hypot(z, ys), L1 + L2 - 1e-4);
    var phf = Math.atan2(z, -ys), al = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)), be = Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
    var knee = Math.PI - be, th = phf + al, sh = th - knee;
    return { hip: th, knee: knee, shin: sh, ankle: -sh, z: z, lift: lift };
  };
  NaoEra.prototype.step = function (dt) {
    var t = (this.t += dt), self = this, v = this.S / (this.T / 2), Rc = this.Rc;
    this.ang = t * v / Rc; var a = this.ang;
    this.base = [Rc * Math.cos(a), Rc * Math.sin(a)]; this.yaw = Math.atan2(-Math.sin(a), Math.cos(a));
    var phL = (t / this.T) % 1, phR = (phL + 0.5) % 1;
    this.L = this.leg(phL); this.R = this.leg(phR);
    [[phL, 0], [phR, 1]].forEach(function (q) { var prev = self.lastPh[q[1]]; if (q[0] < prev) { self.steps++; self.touch(q[1]); } self.lastPh[q[1]] = q[0]; });
    this.m = { hip: deg(this.L.hip), knee: deg(this.L.knee), ankle: deg(this.L.ankle), steps: this.steps, speed: v * 100 };
    this.hist.tick(dt, function () { return deg(self.L.knee); }, function () { return deg(self.R.knee); });
    this.prints = this.prints.filter(function (p) { return t - p.t < 9; });
  };
  NaoEra.prototype.frame = function () {
    var y = this.yaw, c = Math.cos(y), s = Math.sin(y), b = this.base, bob = 0.004 * Math.cos(4 * Math.PI * this.t / this.T), sway = 0.006 * Math.sin(TAU * this.t / this.T);
    function W(lx, ly, lz) { return [b[0] + lx * c + lz * s, ly, b[1] - lx * s + lz * c]; }
    return { W: W, bob: bob, sway: sway };
  };
  NaoEra.prototype.touch = function (side) { var f = this.frame(), lg = side ? this.R : this.L, lx = (side ? -0.05 : 0.05) + f.sway; var hz = Math.sin(lg.hip) * this.L1 + Math.sin(lg.shin) * this.L2; this.prints.push({ p: f.W(lx, 0, hz), yaw: this.yaw, t: this.t }); };
  NaoEra.prototype.metrics = function () {
    var m = this.m;
    return [
      { k: 'speed', label: 'Hip pitch (L)', value: fmt(m.hip, 1), unit: '\u00B0', frac: (m.hip + 30) / 60, kind: 'ring', note: 'from 2-link inverse kinematics' },
      { k: 'lane', label: 'Knee (L)', value: fmt(m.knee, 1), unit: '\u00B0', frac: clamp(m.knee / 60, -1, 1), kind: 'center', note: 'bend, 0 = straight leg' },
      { k: 'ttc', label: 'Ankle (L)', value: fmt(m.ankle, 1), unit: '\u00B0', frac: (m.ankle + 30) / 60, kind: 'bar', note: 'keeps the foot flat' },
      { k: 'gap', label: 'Step count', value: String(m.steps), unit: 'steps', frac: (m.steps % 20) / 20, kind: 'bar', note: 'stride ' + fmt(this.S * 100, 0) + ' cm per step' },
      { k: 'tracked', label: 'Walk speed', value: fmt(m.speed, 1), unit: 'cm/s', frac: m.speed / 20, kind: 'bar', note: 'circle of radius ' + fmt(this.Rc, 2) + ' m' }
    ];
  };
  NaoEra.prototype.chart = { a: { label: 'Knee L', unit: '\u00B0', max: 60 }, b: { label: 'Knee R', unit: '\u00B0', max: 60 } };
  NaoEra.prototype.objects = function () {
    var self = this, f = this.frame(), W = f.W, y = this.yaw, out = [], H = this.Hh + f.bob;
    out.push({ id: 'torso', m: 'n_torso', p: W(f.sway, H, 0), yaw: y, cls: 'ego' });
    out.push({ id: 'head', m: 'n_head', p: W(f.sway, H + 0.215, 0), yaw: y + 0.15 * Math.sin(this.t * 0.4), cls: 'ego' });
    [[this.L, 1], [this.R, -1]].forEach(function (q) {
      var lg = q[0], sx = q[1] * 0.05 + f.sway, hip = W(sx, H, 0), L1 = self.L1;
      var knee = W(sx, H - Math.cos(lg.hip) * L1, Math.sin(lg.hip) * L1), ank = W(sx, H - Math.cos(lg.hip) * L1 - Math.cos(lg.shin) * self.L2, Math.sin(lg.hip) * L1 + Math.sin(lg.shin) * self.L2);
      var id = q[1] > 0 ? 'l' : 'r';
      out.push({ id: 'th' + id, m: 'n_thigh', p: hip, yaw: y, pitch: -lg.hip, cls: 'ego' });
      out.push({ id: 'sh' + id, m: 'n_shin', p: knee, yaw: y, pitch: -lg.shin, cls: 'ego' });
      out.push({ id: 'ft' + id, m: 'n_foot', p: ank, yaw: y, cls: 'ego' });
      var sw = -0.4 * (lg.hip), sh = W(q[1] * 0.1 + f.sway, H + 0.18, 0);
      out.push({ id: 'ua' + id, m: 'n_arm', p: sh, yaw: y, pitch: -sw, roll: q[1] * 0.12, cls: 'ego' });
      var el = W(q[1] * 0.105 + f.sway, H + 0.18 - Math.cos(sw) * 0.09, Math.sin(sw) * 0.09);
      out.push({ id: 'fa' + id, m: 'n_arm', p: el, yaw: y, pitch: -sw - 0.5, s: 0.85, cls: 'ego' });
    });
    this.prints.forEach(function (p, i) { out.push({ id: 'pr' + i, m: 'n_print', p: p.p, yaw: p.yaw, cls: 'path', a: 0.8 * (1 - (self.t - p.t) / 9) }); });
    out.push({ id: 'easel', m: 'easel', p: [0.1, 0, -0.1], yaw: 0.6, cls: 'static' });
    [[0.25, 0.3, 0.3], [-0.3, 0.2, 1], [-1.35, -0.4, 0.2], [1.3, 0.6, 0.7], [0.4, -1.4, 0]].forEach(function (c, i) { out.push({ id: 'cube' + i, m: 'cube', p: [c[0], 0, c[1]], yaw: c[2], cls: 'static' }); });
    var n = 48, strip = new Float32Array((n + 1) * 3);
    for (var i = 0; i <= n; i++) { var a = this.ang + 0.12 + i * 0.02; strip[i * 3] = this.Rc * Math.cos(a); strip[i * 3 + 1] = 0.002; strip[i * 3 + 2] = this.Rc * Math.sin(a); }
    out.push({ id: 'path', strip: strip, cls: 'path', a: 0.8 });
    return out;
  };
  NaoEra.prototype.labels = function () { var f = this.frame(); return [{ id: 'knee', p: f.W(0.05, 0.33, 0), text: 'KNEE ' + fmt(this.m.knee, 0) + '\u00B0' }]; };
  NaoEra.prototype.cam = function () { return { focus: [this.base[0], 0.2, this.base[1]], fwd: [Math.sin(this.yaw), Math.cos(this.yaw)], dist: 2.7, height: 1.05, fov: 30, ahead: 0.05, side: 0.6 }; };
  NaoEra.prototype.ground = { mode: 0, minor: 0.1, major: 0.5, fade: 5, amp: 0, glowR: 0.35 };
  NaoEra.prototype.ring = function () { return null; };
  NaoEra.prototype.describe = function () { return 'A small humanoid robot walks a circle. Its leg angles come from two-link inverse kinematics each frame, and it leaves fading footprints on the floor grid.'; };

  /* ------------------------------------------------------------------ era: web-driven robot (2008) */
  var SCRIPT = [['F', 3.2], ['L', 1.0], ['F', 3.2], ['L', 1.0], ['F', 3.2], ['L', 1.0], ['F', 3.2], ['L', 1.0], ['S', 1.2]], SCRIPT_T = 0; SCRIPT.forEach(function (c) { SCRIPT_T += c[1]; });
  function cmdAt(t) { t = ((t % SCRIPT_T) + SCRIPT_T) % SCRIPT_T; for (var i = 0, a = 0; i < SCRIPT.length; i++) { a += SCRIPT[i][1]; if (t < a) return { c: SCRIPT[i][0], i: i }; } return { c: 'S', i: 8 }; }
  function WebEra() { this.t = 0; this.hist = new History(200); this.x = -0.72; this.z = -0.72; this.yaw = Math.PI / 2; this.v = 0; this.w = 0; this.odo = 0; this.cmds = 0; this.lastI = -1; this.step(0); }
  WebEra.prototype.lat = function (t) { return 0.18 + 0.07 * Math.sin(t * 0.9) + 0.04 * Math.sin(t * 2.7 + 1) + 0.03 * Math.sin(t * 7.1); };
  WebEra.prototype.step = function (dt) {
    var t = (this.t += dt), self = this, L = this.lat(t), issued = cmdAt(t), applied = cmdAt(t - L);
    if (applied.i !== this.lastI) { this.cmds++; if (applied.c === 'S') { this.x = -0.72; this.z = -0.72; this.yaw = Math.PI / 2; } if (this.lastC === 'L') this.yaw = Math.round(this.yaw / (Math.PI / 2)) * (Math.PI / 2); this.lastI = applied.i; this.lastC = applied.c; }
    var tv = applied.c === 'F' ? 0.45 : 0, tw = applied.c === 'L' ? Math.PI / 2 : 0;
    this.v += (tv - this.v) * (1 - Math.exp(-dt * 12)); this.w += (tw - this.w) * (1 - Math.exp(-dt * 12));
    this.yaw += this.w * dt; this.x += Math.sin(this.yaw) * this.v * dt; this.z += Math.cos(this.yaw) * this.v * dt; this.odo += this.v * dt;
    this.cmd = applied.c; this.issued = issued.c; this.L = L;
    this.ringR = ((t % 1.2) / 1.2) * 1.6;
    this.m = { speed: this.v, heading: ((deg(this.yaw) % 360) + 360) % 360, lat: L * 1000, odo: this.odo };
    this.hist.tick(dt, function () { return self.L * 1000; }, function () { return self.v * 100; });
  };
  var ARW = { F: '\u2191 fwd', L: '\u2190 left', R: '\u2192 right', S: '\u25A0 stop' };
  WebEra.prototype.metrics = function () {
    var m = this.m;
    return [
      { k: 'speed', label: 'Speed', value: fmt(m.speed, 2), unit: 'm/s', frac: m.speed / 0.6, kind: 'ring', note: 'wheel odometry' },
      { k: 'lane', label: 'Heading', value: fmt(m.heading, 0).padStart(3, '0'), unit: '\u00B0', frac: wrapPi(this.yaw) / Math.PI, kind: 'center', note: 'turn rate ' + fmt(deg(this.w), 0) + ' \u00B0/s' },
      { k: 'ttc', label: 'Command', value: ARW[this.cmd], unit: '', frac: 0, kind: 'plain', note: 'browser sent ' + ARW[this.issued].split(' ')[1] },
      { k: 'gap', label: 'Link latency', value: fmt(m.lat, 0), unit: 'ms', frac: m.lat / 400, kind: 'bar', warn: m.lat > 280, note: 'modelled network delay' },
      { k: 'tracked', label: 'Odometry', value: fmt(m.odo, 1), unit: 'm', frac: (m.odo % 10) / 10, kind: 'bar', note: this.cmds + ' commands applied' }
    ];
  };
  WebEra.prototype.chart = { a: { label: 'Latency', unit: 'ms', max: 400 }, b: { label: 'Speed', unit: 'cm/s', max: 60 } };
  WebEra.prototype.objects = function () {
    var out = [{ id: 'wbot', m: 'wbot', p: [this.x, 0, this.z], yaw: this.yaw, cls: 'ego' }], cmd = this.cmd;
    out.push({ id: 'bgi', m: 'bgi', p: [0.1, 0, -1.7], yaw: 0, s: 0.75, cls: 'static' });
    out.push({ id: 'pad', m: 'padframe', p: [1.25, 0, -0.9], yaw: Math.PI, s: 0.7, cls: 'world' });
    [['arr_f', 0, 0.24, 'F'], ['arr_l', 0.24, 0, 'L'], ['arr_r', -0.24, 0, 'R'], ['arr_s', 0, 0, 'S']].forEach(function (a) { out.push({ id: a[0], m: a[0], p: [1.25 - a[1] * 0.7, 0, -0.9 - a[2] * 0.7], yaw: Math.PI, s: 0.7, cls: cmd === a[3] ? 'active' : 'world' }); });
    out.push({ id: 'w1', m: 'wall', p: [0, 0, 1.45], cls: 'static' }); out.push({ id: 'w2', m: 'wall', p: [-1.5, 0, 0], yaw: Math.PI / 2, cls: 'static' });
    var sq = [[-0.72, -0.72], [-0.72, 0.72], [0.72, 0.72], [0.72, -0.72]], seg = [];
    sq.forEach(function (p, i) { var q = sq[(i + 1) % 4]; for (var k = 0; k < 10; k += 2) seg.push(p[0] + (q[0] - p[0]) * k / 10, 0.003, p[1] + (q[1] - p[1]) * k / 10, p[0] + (q[0] - p[0]) * (k + 1) / 10, 0.003, p[1] + (q[1] - p[1]) * (k + 1) / 10); });
    out.push({ id: 'route', seg: new Float32Array(seg), cls: 'path', a: 0.55 });
    out.push({ id: 'lidar', m: 'ring', p: [this.x, 0.01, this.z], s: Math.max(0.01, this.ringR), cls: 'ring', a: 0.6 * (1 - this.ringR / 1.6) });
    return out;
  };
  WebEra.prototype.labels = function () { return [{ id: 'cmd', p: [this.x, 0.62, this.z], text: 'CMD ' + ARW[this.cmd].split(' ')[0] + ' +' + fmt(this.L * 1000, 0) + ' ms' }]; };
  WebEra.prototype.cam = function () { return { focus: [this.x * 0.6, 0.18, this.z * 0.6], fwd: [0, -1], dist: 4.4, height: 2.1, fov: 30, ahead: 0, side: 0.32 }; };
  WebEra.prototype.ground = { mode: 0, minor: 0.25, major: 1, fade: 7, amp: 0, glowR: 0.6 };
  WebEra.prototype.ring = function () { return { x: this.x, z: this.z, r: this.ringR, a: 1 - this.ringR / 1.6, w: 0.08 }; };
  WebEra.prototype.describe = function () { return 'A small wheeled robot drives a square, following arrow-key commands sent from a web page with a modelled network delay. A Turbo C style wireframe window stands behind it.'; };

  /* ------------------------------------------------------------------ era: the kid's computer (1995) */
  var GLYPH = {
    A: [[0, 0, 0, 3], [0, 3, 1, 4], [1, 4, 2, 3], [2, 3, 2, 0], [0, 2, 2, 2]], B: [[0, 0, 0, 4], [0, 4, 1.5, 4], [1.5, 4, 1.5, 2], [0, 2, 2, 2], [2, 2, 2, 0], [2, 0, 0, 0]],
    C: [[2, 4, 0, 4], [0, 4, 0, 0], [0, 0, 2, 0]], D: [[0, 0, 0, 4], [0, 4, 1.3, 4], [1.3, 4, 2, 3.2], [2, 3.2, 2, 0.8], [2, 0.8, 1.3, 0], [1.3, 0, 0, 0]],
    E: [[2, 4, 0, 4], [0, 4, 0, 0], [0, 0, 2, 0], [0, 2, 1.5, 2]], G: [[2, 4, 0, 4], [0, 4, 0, 0], [0, 0, 2, 0], [2, 0, 2, 2], [2, 2, 1, 2]],
    H: [[0, 0, 0, 4], [2, 0, 2, 4], [0, 2, 2, 2]], I: [[1, 0, 1, 4], [0.4, 4, 1.6, 4], [0.4, 0, 1.6, 0]], L: [[0, 4, 0, 0], [0, 0, 2, 0]],
    M: [[0, 0, 0, 4], [0, 4, 1, 2], [1, 2, 2, 4], [2, 4, 2, 0]], N: [[0, 0, 0, 4], [0, 4, 2, 0], [2, 0, 2, 4]], O: [[0, 0, 0, 4], [0, 4, 2, 4], [2, 4, 2, 0], [2, 0, 0, 0]],
    P: [[0, 0, 0, 4], [0, 4, 2, 4], [2, 4, 2, 2], [2, 2, 0, 2]], Q: [[0, 0, 0, 4], [0, 4, 2, 4], [2, 4, 2, 0], [2, 0, 0, 0], [1.2, 0.8, 2.2, -0.3]],
    R: [[0, 0, 0, 4], [0, 4, 2, 4], [2, 4, 2, 2], [2, 2, 0, 2], [0.8, 2, 2, 0]], S: [[2, 4, 0, 4], [0, 4, 0, 2], [0, 2, 2, 2], [2, 2, 2, 0], [2, 0, 0, 0]],
    T: [[0, 4, 2, 4], [1, 4, 1, 0]], U: [[0, 4, 0, 0], [0, 0, 2, 0], [2, 0, 2, 4]], W: [[0, 4, 0, 0], [0, 0, 1, 1.5], [1, 1.5, 2, 0], [2, 0, 2, 4]], Y: [[0, 4, 1, 2], [2, 4, 1, 2], [1, 2, 1, 0]],
    '0': [[0, 0, 0, 4], [0, 4, 2, 4], [2, 4, 2, 0], [2, 0, 0, 0], [0, 0, 2, 4]], '1': [[1, 0, 1, 4], [1, 4, 0.4, 3.4], [0.4, 0, 1.6, 0]], '2': [[0, 4, 2, 4], [2, 4, 2, 2], [2, 2, 0, 2], [0, 2, 0, 0], [0, 0, 2, 0]],
    ':': [[1, 0.5, 1, 1], [1, 2.6, 1, 3.1]], '\\': [[0, 4, 2, 0]], '>': [[0, 4, 2, 2], [2, 2, 0, 0]], '"': [[0.6, 4, 0.6, 3], [1.4, 4, 1.4, 3]], '.': [[1, 0, 1, 0.4]], ' ': []
  };
  var TEXT = ['C:\\>DIR', 'C:\\>CD GAMES', 'C:\\GAMES>QBASIC', '10 PRINT "HOW DOES IT WORK"', '20 GOTO 10', 'RUN'];
  function KidEra() { this.t = 0; this.hist = new History(200); this.keys = 0; this.typed = 0; this.loopT = 0; this.cps = 0; this.recent = []; this.step(0); }
  KidEra.prototype.step = function (dt) {
    var t = (this.t += dt), self = this; this.loopT += dt;
    var total = TEXT.join('').length, lt = this.loopT, prevTyped = this.typed;
    // typing schedule: ~7 chars/s with a pause after each line, 3 s pause at the end, then the screen clears
    var n = 0, tt = 0.6, done = false;
    for (var li = 0; li < TEXT.length && !done; li++) { for (var ci = 0; ci < TEXT[li].length; ci++) { var gap = 0.11 + 0.06 * Math.sin((li * 31 + ci) * 1.7) * Math.sin((li * 31 + ci) * 0.37); tt += gap; if (tt > lt) { done = true; break; } n++; } if (!done) { tt += 0.9; if (tt > lt) done = true; } }
    this.typed = n;
    if (n === total && lt > tt + 3) { this.loopT = 0; this.typed = 0; }
    if (this.typed > prevTyped) { this.keys += this.typed - prevTyped; for (var k = 0; k < this.typed - prevTyped; k++) this.recent.push(t); }
    this.recent = this.recent.filter(function (x) { return t - x < 2; }); this.cps = this.recent.length / 2;
    this.blink = (t % 0.53) < 0.265;
    var lines = 0, c = this.typed; TEXT.forEach(function (L) { if (c >= L.length) { lines++; c -= L.length; } else c = 0; });
    this.m = { keys: this.keys, lines: lines, cps: this.cps };
    this.hist.tick(dt, function () { return self.cps; }, function () { return self.blink ? 1 : 0; });
  };
  KidEra.prototype.metrics = function () {
    var m = this.m;
    return [
      { k: 'speed', label: 'Keystrokes', value: String(m.keys), unit: 'keys', frac: (m.keys % 100) / 100, kind: 'ring', note: 'since this page opened' },
      { k: 'lane', label: 'Typing rate', value: fmt(m.cps, 1), unit: 'chars/s', frac: clamp(m.cps / 10, -1, 1), kind: 'center', note: 'over the last 2 s' },
      { k: 'ttc', label: 'Cursor', value: this.blink ? 'ON' : 'OFF', unit: '', frac: this.blink ? 1 : 0, kind: 'bar', note: 'blinks about twice a second' },
      { k: 'gap', label: 'Lines on screen', value: String(m.lines), unit: '/ 25', frac: m.lines / 25, kind: 'bar', note: '80 \u00D7 25 text mode' },
      { k: 'tracked', label: 'Manuals read', value: '3', unit: '', frac: 1, kind: 'dots', n: 3, note: 'DOS, Windows 3.1, Windows 98' }
    ];
  };
  KidEra.prototype.chart = { a: { label: 'Chars/s', unit: '', max: 10 }, b: { label: 'Cursor', unit: '', max: 4 } };
  KidEra.prototype.objects = function () {
    var out = [{ id: 'desk', m: 'desk', p: [0, 0, 0], cls: 'static' }, { id: 'pc', m: 'pc', p: [-0.15, 0, -0.05], cls: 'ego' }, { id: 'scr', m: 'crtscreen', p: [-0.15, 0, -0.05], cls: 'screen' },
      { id: 'kbd', m: 'kbd', p: [-0.15, 0, 0], cls: 'ego' }, { id: 'man', m: 'manual', p: [0.42, 0, 0.1], cls: 'agent' }, { id: 'mouse', m: 'mouse', p: [0.2, 0, 0.3], cls: 'agent' }];
    var seg = [], sc = 0.0042, x0 = -0.15 - 0.155, y0 = 1.225, z = 0.062, c = this.typed, cx = x0, cy = y0, li;
    for (li = 0; li < TEXT.length; li++) {
      var L = TEXT[li], k = Math.min(c, L.length); c -= k;
      for (var i = 0; i < k; i++) { var gl = GLYPH[L[i]] || []; gl.forEach(function (q) { seg.push(x0 + i * 3 * sc + q[0] * sc, y0 - li * 0.03 + q[1] * sc, z, x0 + i * 3 * sc + q[2] * sc, y0 - li * 0.03 + q[3] * sc, z); }); }
      cx = x0 + k * 3 * sc; cy = y0 - li * 0.03;
      if (k < L.length) break;
      if (li === TEXT.length - 1) { cx = x0; cy = y0 - (li + 1) * 0.03; }
    }
    if (this.typed === TEXT.join('').length) for (var r = 0; r < 2; r++) { var s = 'HOW DOES IT WORK'; for (var j = 0; j < s.length; j++) (GLYPH[s[j]] || []).forEach(function (q) { seg.push(x0 + j * 3 * sc + q[0] * sc, cy - r * 0.03 + q[1] * sc, z, x0 + j * 3 * sc + q[2] * sc, cy - r * 0.03 + q[3] * sc, z); }); }
    out.push({ id: 'text', seg: new Float32Array(seg), cls: 'path' });
    out.push({ id: 'cur', m: 'cursor', p: [cx, cy - 0.004, z], cls: 'active', a: this.blink ? 1 : 0 });
    return out;
  };
  KidEra.prototype.labels = function () { return [{ id: 'crt', p: [-0.15, 1.42, 0], text: 'BEIGE PC, 80\u00D725' }]; };
  KidEra.prototype.cam = function () { return { focus: [-0.05, 0.98, 0.05], fwd: [0, -1], dist: 3.0, height: 0.75, fov: 30, ahead: 0, side: 0.5 }; };
  KidEra.prototype.ground = { mode: 0, minor: 0.3, major: 1.5, fade: 7, amp: 0, glowR: 0.7 };
  KidEra.prototype.ring = function () { return null; };
  KidEra.prototype.describe = function () { return 'A beige desktop computer with a CRT monitor sits on a desk next to a DOS manual. A cursor blinks while short commands and a BASIC program are typed out.'; };

  /* ------------------------------------------------------------------ era: toy truck (1990) */
  function ToyEra() {
    this.t = 0; this.u = 0; this.hist = new History(200); this.pushes = 0; this.dist = 0; this.wheelA = 0;
    this.blocks = [['blkA', 0.55, -0.62, 0.4], ['blkB', -0.15, 0.78, 0.9], ['blkC', -1.0, 0.3, 0.2], ['blkA', 0.95, 0.45, 1.3], ['blkB', 0.62, -0.62, 0.4, 0.07], ['ball', -0.6, -0.65, 0]].map(function (b, i) { return { id: 'b' + i, m: b[0], x: b[1], z: b[2], yaw: b[3], y: b[4] || 0, r: 0.05, label: b[0] === 'ball' ? 'BALL' : 'BLOCK ' + b[0].slice(3) }; });
    this.lastPush = -1; this.step(0);
  }
  ToyEra.prototype.pathAt = function (u) { var a = u * TAU; return [0.85 * Math.cos(a) + 0.12 * Math.sin(3 * a), 0.52 * Math.sin(a) + 0.1 * Math.cos(2 * a)]; };
  ToyEra.prototype.step = function (dt) {
    var t = (this.t += dt), self = this, period = 2.6, tp = t % period, k = Math.floor(t / period);
    if (k !== this.lastPush) { this.lastPush = k; this.pushes++; }
    var v = 0.03 + 0.5 * Math.exp(-1.0 * tp) * sstep(0, 0.15, tp);
    var p = this.pathAt(this.u), q = this.pathAt(this.u + 0.0005), dl = Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.0005;
    this.u = (this.u + v * dt / dl) % 1; this.v = v; this.dist += v * dt; this.wheelA += v * dt / 0.034;
    p = this.pathAt(this.u); q = this.pathAt(this.u + 0.002); this.pos = p;
    var yaw = Math.atan2(q[0] - p[0], q[1] - p[1]); this.yawRate = dt > 0 && this.yaw != null ? wrapPi(yaw - this.yaw) / dt : 0; this.yaw = yaw;
    var r = egoFrameTTC({ x: p[0], z: p[1], yaw: yaw, v: v, len: 0.28, wid: 0.14 }, this.blocks);
    var near = 0; this.blocks.forEach(function (b) { b.dist = Math.hypot(b.x - p[0], b.z - p[1]); b.on = b.dist < 0.75; if (b.on) near++; });
    this.m = { speed: v * 100, rpm: v / (TAU * 0.034) * 60, ttc: r.ttc, who: r.who, near: near };
    this.hist.tick(dt, function () { return Math.min(self.m.ttc, 10); }, function () { return self.m.speed; });
  };
  ToyEra.prototype.metrics = function () {
    var m = this.m;
    return [
      { k: 'speed', label: 'Speed', value: fmt(m.speed, 1), unit: 'cm/s', frac: m.speed / 55, kind: 'ring', note: 'one push every 2.6 s' },
      { k: 'lane', label: 'Wheel speed', value: fmt(m.rpm, 0), unit: 'rpm', frac: clamp(m.rpm / 160, -1, 1), kind: 'center', note: '3.4 cm wheels' },
      { k: 'ttc', label: 'Time to collision', value: ttcText(m.ttc), unit: 's', frac: isFinite(m.ttc) ? 1 - Math.min(m.ttc, 10) / 10 : 0, kind: 'bar', warn: m.ttc < 1.5, note: m.who ? 'in path: ' + m.who.label.toLowerCase() : 'nothing in path' },
      { k: 'gap', label: 'Pushes', value: String(this.pushes), unit: '', frac: (this.pushes % 10) / 10, kind: 'bar', note: fmt(this.dist, 2) + ' m pushed so far' },
      { k: 'tracked', label: 'Toys nearby', value: String(m.near), unit: '/ 6', frac: m.near / 6, kind: 'dots', n: 6, note: 'within 75 cm' }
    ];
  };
  ToyEra.prototype.chart = { a: { label: 'TTC', unit: 's', max: 10 }, b: { label: 'Speed', unit: 'cm/s', max: 60 } };
  ToyEra.prototype.objects = function () {
    var self = this, out = [{ id: 'toy', m: 'toy', p: [this.pos[0], 0, this.pos[1]], yaw: this.yaw, cls: 'ego' }];
    this.blocks.forEach(function (b) {
      out.push({ id: b.id, m: b.m, p: [b.x, b.y, b.z], yaw: b.yaw, cls: 'static' });
      if (b.on) out.push({ id: 'bb' + b.id, m: bboxModel(0.11, 0.1, 0.11), p: [b.x, b.y, b.z], yaw: b.yaw, cls: self.m.who === b && self.m.ttc < 1.5 ? 'warn' : 'bbox', a: 0.7 });
    });
    var n = 40, strip = new Float32Array((n + 1) * 3);
    for (var i = 0; i <= n; i++) { var p = this.pathAt(this.u + 0.03 + i * 0.006); strip[i * 3] = p[0]; strip[i * 3 + 1] = 0.002; strip[i * 3 + 2] = p[1]; }
    out.push({ id: 'path', strip: strip, cls: 'path', a: 0.8 });
    return out;
  };
  ToyEra.prototype.labels = function () { var out = []; this.blocks.forEach(function (b) { if (b.on && b.dist < 0.55) out.push({ id: b.id, p: [b.x, 0.16 + b.y, b.z], text: b.label + ' ' + fmt(b.dist * 100, 0) + ' cm' }); }); return out; };
  ToyEra.prototype.cam = function () { return { focus: [this.pos[0], 0.05, this.pos[1]], fwd: [Math.sin(this.yaw), Math.cos(this.yaw)], dist: 1.9, height: 0.8, fov: 30, ahead: 0.1, side: 0.5, smooth: true }; };
  ToyEra.prototype.ground = { mode: 1, minor: 0.14, major: 1.2, fade: 4, amp: 0, glowR: 0.3 };
  ToyEra.prototype.ring = function () { return null; };
  ToyEra.prototype.describe = function () { return 'A toy truck is pushed across a wooden floor between letter blocks and a ball. Even here the readouts compute speed, wheel rpm and time to collision with the next block.'; };

  /* ------------------------------------------------------------------ era table */
  var ERAS = [
    { id: '1990', from: 1990, to: 1995, years: '1990', name: 'The toddler', caption: 'Fascinated by cars and trucks; wanted to visit every garage.', make: function () { return new ToyEra(); } },
    { id: '1995', from: 1995, to: 2008, years: 'c. 1995\u20132008', name: 'The kid', caption: 'Learned to program from my mother; read DOS and Windows manuals for fun.', make: function () { return new KidEra(); } },
    { id: '2008', from: 2008, to: 2013, years: '2008\u201312', name: 'University of Mumbai', caption: 'BE, Computer Engineering. Drove mobile robots over the web; pixels in Turbo C.', make: function () { return new WebEra(); } },
    { id: '2013', from: 2013, to: 2016, years: '2013\u201315', name: 'IIT Bombay', caption: 'MTech. Drivers, navigation and mapping for Matsya, an autonomous underwater vehicle.', make: function () { return new AuvEra(); } },
    { id: '2016', from: 2016, to: 2018, years: '2016\u201317', name: 'USC', caption: 'MS Computer Science. Inverse kinematics so a small humanoid could walk and draw.', make: function () { return new NaoEra(); } },
    { id: '2018', from: 2018, to: 2025, years: '2018\u201324', name: 'AutoX', caption: 'Robotaxis and a delivery robot: safety fallbacks, deployment, observability.', make: function () { return new RoadEra('taxi'); } },
    { id: '2026', from: 2025, to: 2027, years: '2025\u201326', name: 'Gatik', caption: 'Autonomous trucks: AV simulation, safety metrics, data platforms.', make: function () { return new RoadEra('truck'); } }
  ];

  /* ------------------------------------------------------------------ camera + projection (shared by both renderers) */
  /* ax, ay: where the focus should sit on screen, as offsets from the centre in fractions of width/height (+x right, +y down) */
  function camera(era, t, ptr, ax, ay, aspect) {
    var c = era.cam(), f = c.fwd, th = c.side + 0.1 * Math.sin(t * TAU / 50) + (ptr ? ptr.x * 0.07 : 0);
    var bx = -f[0], bz = -f[1], cs = Math.cos(th), sn = Math.sin(th), ox = bx * cs - bz * sn, oz = bx * sn + bz * cs;
    var h = c.height * (1 + (ptr ? -ptr.y * 0.06 : 0) + 0.03 * Math.sin(t * TAU / 70));
    var pos = [c.focus[0] + ox * c.dist, c.focus[1] + h, c.focus[2] + oz * c.dist];
    var tgt = [c.focus[0] + f[0] * c.ahead, c.focus[1], c.focus[2] + f[1] * c.ahead];
    var B = basis({ pos: pos, target: tgt }), D = Math.hypot(tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]);
    var tv = Math.tan(c.fov * Math.PI / 360), kx = (ax || 0) * 2 * tv * (aspect || 1.6) * D, ky = (ay || 0) * 2 * tv * D;
    for (var i = 0; i < 3; i++) tgt[i] += -B.r[i] * kx + B.u[i] * ky;
    return { pos: pos, target: tgt, fov: c.fov };
  }
  function basis(cam) {
    var f = [cam.target[0] - cam.pos[0], cam.target[1] - cam.pos[1], cam.target[2] - cam.pos[2]], l = Math.hypot(f[0], f[1], f[2]); f = [f[0] / l, f[1] / l, f[2] / l];
    var r = [f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0]; l = Math.hypot(r[0], r[1], r[2]); r = [r[0] / l, r[1] / l, r[2] / l];
    var u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    return { f: f, r: r, u: u };
  }
  /* rotate a model-space vector by YXZ euler (three.js order) */
  function rot(v, yaw, pitch, roll) {
    var x = v[0], y = v[1], z = v[2], c, s, t;
    if (roll) { c = Math.cos(roll); s = Math.sin(roll); t = x * c - y * s; y = x * s + y * c; x = t; }
    if (pitch) { c = Math.cos(pitch); s = Math.sin(pitch); t = y * c - z * s; z = y * s + z * c; y = t; }
    if (yaw) { c = Math.cos(yaw); s = Math.sin(yaw); t = x * c + z * s; z = -x * s + z * c; x = t; }
    return [x, y, z];
  }
  function projector(cam, W, H) {
    var B = basis(cam), F = (H / 2) / Math.tan(cam.fov * Math.PI / 360), P = cam.pos;
    function toCam(p) { var d0 = p[0] - P[0], d1 = p[1] - P[1], d2 = p[2] - P[2]; return [d0 * B.r[0] + d1 * B.r[1] + d2 * B.r[2], d0 * B.u[0] + d1 * B.u[1] + d2 * B.u[2], d0 * B.f[0] + d1 * B.f[1] + d2 * B.f[2]]; }
    function scr(c) { return [W / 2 + c[0] / c[2] * F, H / 2 - c[1] / c[2] * F, c[2]]; }
    return {
      toCam: toCam, scr: scr,
      project: function (p) { var c = toCam(p); return c[2] > 0.05 ? scr(c) : null; },
      segment: function (a, b) {   // clip to near plane
        var A = toCam(a), Bc = toCam(b), n = 0.05;
        if (A[2] < n && Bc[2] < n) return null;
        if (A[2] < n) { var t = (n - A[2]) / (Bc[2] - A[2]); A = [A[0] + (Bc[0] - A[0]) * t, A[1] + (Bc[1] - A[1]) * t, n]; }
        if (Bc[2] < n) { var t2 = (n - Bc[2]) / (A[2] - Bc[2]); Bc = [Bc[0] + (A[0] - Bc[0]) * t2, Bc[1] + (A[1] - Bc[1]) * t2, n]; }
        return [scr(A), scr(Bc)];
      }
    };
  }

  /* ------------------------------------------------------------------ 2D canvas renderer (static fallback and first paint) */
  function draw2D(ctx, era, cam, W, H, col, alpha) {
    var pr = projector(cam, W, H), g = era.ground, focus = era.cam().focus;
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.lineCap = 'round';
    /* ground grid, cell by cell so it can fade with distance */
    var R = Math.min(g.fade, g.minor * 70), x0 = Math.floor((focus[0] - R) / g.minor) * g.minor, z0 = Math.floor((focus[2] - R) / g.minor) * g.minor;
    var n = Math.ceil(2 * R / g.minor);
    function gy(x, z) { return g.amp ? bathy(x, z) : 0; }
    ctx.strokeStyle = col.grid; ctx.lineWidth = 1;
    for (var i = 0; i <= n; i++) for (var j = 0; j < n; j++) {
      for (var o = 0; o < 2; o++) {
        var xa = o ? x0 + i * g.minor : x0 + j * g.minor, za = o ? z0 + j * g.minor : z0 + i * g.minor, xb = o ? xa : xa + g.minor, zb = o ? za + g.minor : za;
        if (g.mode === 1 && o === 1) { var row = Math.floor(za / g.minor); if (((xa / g.major) + row * 0.37) % 1 > 0.02 * g.major / g.minor) continue; }
        var dm = Math.hypot((xa + xb) / 2 - focus[0], (za + zb) / 2 - focus[2]); if (dm > R) continue;
        var major = Math.abs(((o ? xa : za) / g.major) - Math.round((o ? xa : za) / g.major)) < 1e-6;
        var s = pr.segment([xa, gy(xa, za), za], [xb, gy(xb, zb), zb]); if (!s) continue;
        ctx.globalAlpha = (alpha == null ? 1 : alpha) * (major ? 0.9 : 0.45) * (1 - dm / R);
        ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); ctx.stroke();
      }
    }
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    var items = era.objects().map(function (it, i) { var d = it.cls === 'world' ? 1e9 : it.p ? pr.toCam(it.p)[2] : 0; return [it, d, i]; })
      .sort(function (a, b) { return b[1] - a[1] || a[2] - b[2]; }).map(function (x) { return x[0]; });
    function colFor(cls) { return cls === 'ego' ? col.ego : cls === 'agent' ? col.agent : cls === 'bbox' || cls === 'path' || cls === 'ring' || cls === 'active' || cls === 'screen' ? col.accent : cls === 'warn' ? col.warn : col.world; }
    items.forEach(function (it) {
      var a = (it.a == null ? 1 : it.a) * (alpha == null ? 1 : alpha); if (a <= 0.01) return;
      ctx.globalAlpha = a * (it.cls === 'world' ? 0.75 : it.cls === 'static' ? 0.8 : 1); ctx.strokeStyle = colFor(it.cls); ctx.lineWidth = it.cls === 'path' && it.strip ? 1.5 : 1;
      if (it.strip) { ctx.beginPath(); var st = it.strip, first = true; for (var k = 0; k < st.length / 3 - 1; k++) { var sg = pr.segment([st[k * 3], st[k * 3 + 1], st[k * 3 + 2]], [st[k * 3 + 3], st[k * 3 + 4], st[k * 3 + 5]]); if (!sg) { first = true; continue; } if (first) ctx.moveTo(sg[0][0], sg[0][1]); ctx.lineTo(sg[1][0], sg[1][1]); first = false; } ctx.stroke(); return; }
      var M = it.seg ? { seg: it.seg, tri: null } : MODELS[it.m]; if (!M) return;
      var sc = it.s == null ? 1 : it.s, P = it.p || [0, 0, 0];
      function W3(x, y, z) { var v = it.seg ? [x, y, z] : rot([x * sc, y * sc, z * sc], it.yaw || 0, it.pitch || 0, it.roll || 0); return it.seg ? v : [v[0] + P[0], v[1] + P[1], v[2] + P[2]]; }
      var S = M.seg, solid = M.tri && it.cls !== 'world' && it.cls !== 'bbox' && it.cls !== 'warn' && it.cls !== 'ring', base = ctx.globalAlpha;
      var cd = solid ? pr.toCam(P)[2] : 0, front = [], back = [];
      for (var e = 0; e < S.length; e += 6) {
        var A = W3(S[e], S[e + 1], S[e + 2]), Bv = W3(S[e + 3], S[e + 4], S[e + 5]), sg2 = pr.segment(A, Bv); if (!sg2) continue;
        (solid && (sg2[0][2] + sg2[1][2]) / 2 > cd + 0.15 * sc ? back : front).push(sg2);
      }
      function stroke(list) { ctx.beginPath(); list.forEach(function (q) { ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); }); ctx.stroke(); }
      if (solid) {
        ctx.globalAlpha = base * 0.25; stroke(back); ctx.globalAlpha = base * 0.85;
        ctx.fillStyle = it.cls === 'active' || it.cls === 'screen' ? col.accentSoft : col.fill; var T = M.tri, tris = [];
        for (var q = 0; q < T.length; q += 9) {
          var p1 = pr.project(W3(T[q], T[q + 1], T[q + 2])), p2 = pr.project(W3(T[q + 3], T[q + 4], T[q + 5])), p3 = pr.project(W3(T[q + 6], T[q + 7], T[q + 8]));
          if (p1 && p2 && p3) tris.push([p1, p2, p3, p1[2] + p2[2] + p3[2]]);
        }
        tris.sort(function (a, b) { return b[3] - a[3]; });
        tris.forEach(function (t) { ctx.beginPath(); ctx.moveTo(t[0][0], t[0][1]); ctx.lineTo(t[1][0], t[1][1]); ctx.lineTo(t[2][0], t[2][1]); ctx.closePath(); ctx.fill(); });
        ctx.globalAlpha = base;
      }
      stroke(front);
    });
    ctx.restore();
    return pr;
  }

  window.Sim = { DT: DT, ERAS: ERAS, models: MODELS, getModel: getModel, camera: camera, projector: projector, draw2D: draw2D, bathy: bathy, rot: rot };
})();
