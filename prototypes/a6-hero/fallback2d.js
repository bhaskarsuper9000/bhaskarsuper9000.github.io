/* fallback2d.js: draws BB.sim items on a 2D canvas (first paint and the no-WebGL / reduced-motion still). */
(function () {
  'use strict';
  var BB = window.BB = window.BB || {}, SIM;
  function projector(c, w, h) { return SIM.projector(c, w, h); }
  function bathy(x, z) { return SIM.bathy(x, z); }
  function rot(v, a, b, c) { return SIM.rot(v, a, b, c); }
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
      var M = it.seg ? { seg: it.seg, tri: null } : SIM.models[it.m]; if (!M) return;
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

  BB.fallback2d = { draw: function () { SIM = BB.sim; return draw2D.apply(null, arguments); } };
})();
