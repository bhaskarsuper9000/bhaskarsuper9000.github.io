/* Road scene (box truck 2026, robotaxi 2018): looped route, IDM traffic, lidar sweep. */
import { model, bboxModel } from '../geo';
import '../shared-models';
import { clamp, sstep, fmt, ttcText } from '../math';
import { History } from '../history';
import type { Item, Scene } from '../types';

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
    for (let z = -3.2; z <= 1.2; z += 0.88) g.seg([x, 0.97, z], [x, 3.87, z]);
    g.rect([[x * 0.96, 2.05, 1.95], [x * 0.96, 2.05, 2.95], [x * 0.96, 2.55, 2.85], [x * 0.96, 2.55, 2.0]]);
  });
  for (let y = 0.95; y <= 1.35; y += 0.13) g.seg([-0.8, y, 3.74], [0.8, y, 3.74]);
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
  let rh = [0, 0.34, -0.5], fh = [0, 0.34, 0.55], bb = [0, 0.32, 0], st = [0, 0.88, -0.18], hd = [0, 0.92, 0.42];
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
function building(key: string, w: number, h: number, d: number) {
  return model(key, function (g) {
    g.box(0, h / 2, 0, w, h, d);
    for (let y = 3.2; y < h - 0.5; y += 3.2) g.rect([[-w / 2, y, -d / 2], [w / 2, y, -d / 2], [w / 2, y, d / 2], [-w / 2, y, d / 2]]);
    g.box(w * 0.2, h + 0.6, -d * 0.1, w * 0.25, 1.2, d * 0.2);
  });
}

class Route {
  [k: string]: any;
  
  constructor(A: any, B: any, R: any) {
  
    let ds = 0.25, segs = [[2 * A - 2 * R, 0], [Math.PI / 2 * R, R], [2 * B - 2 * R, 0], [Math.PI / 2 * R, R], [2 * A - 2 * R, 0], [Math.PI / 2 * R, R], [2 * B - 2 * R, 0], [Math.PI / 2 * R, R]];
    let L = 0; segs.forEach(function (s) { L += s[0]; });
    let n = Math.round(L / ds), X = new Float64Array(n + 1), Z = new Float64Array(n + 1), P = new Float64Array(n + 1);
    let x = -A + R, z = -B, psi = 0, i = 0, si = 0, sAcc = 0;
    for (i = 0; i <= n; i++) {
      X[i] = x; Z[i] = z; P[i] = psi;
      let s = i * ds; while (si < segs.length - 1 && s >= sAcc + segs[si][0]) { sAcc += segs[si][0]; si++; }
      let k = segs[si][1] ? 1 / segs[si][1] : 0, pm = psi + k * ds / 2;
      x += Math.cos(pm) * ds; z += Math.sin(pm) * ds; psi += k * ds;
    }
    this.L = L; this.ds = ds; this.n = n; this.X = X; this.Z = Z; this.P = P;
  }
  at(s: any) {
    s = ((s % this.L) + this.L) % this.L; let f = s / this.ds, i = Math.floor(f), t = f - i; if (i >= this.n) { i = this.n - 1; t = 1; }
    return { x: this.X[i] + (this.X[i + 1] - this.X[i]) * t, z: this.Z[i] + (this.Z[i + 1] - this.Z[i]) * t, psi: this.P[i] + (this.P[i + 1] - this.P[i]) * t };
  }
  point(s: any, d: any) { let a = this.at(s); return [a.x - Math.sin(a.psi) * d, a.z + Math.cos(a.psi) * d, Math.atan2(Math.cos(a.psi), Math.sin(a.psi))]; }
  curv(s: any) { let a = this.at(s - 1), b = this.at(s + 1); return Math.abs(b.psi - a.psi) / 2; }
  wrap(ds: any) { let L = this.L; ds = ds % L; if (ds > L / 2) ds -= L; if (ds < -L / 2) ds += L; return ds; }
}

let ROUTE: any = null;
const S_CW = 42, LANE = 3.7, SHOULDER = 1.5;
function roadWorld() {
  if (ROUTE) return ROUTE;
  let R = ROUTE = new Route(70, 40, 28);
  model('road', function (g) {
    let step = 1, s, curb = LANE + SHOULDER, walk = curb + 2.8;
    for (s = 0; s < R.L; s += step) {
      let a = R.point(s, -curb), b = R.point(s, curb), a2 = R.point(s + step, -curb), b2 = R.point(s + step, curb);
      g.quad([a[0], 0, a[1]], [b[0], 0, b[1]], [b2[0], 0, b2[1]], [a2[0], 0, a2[1]]);
    }
    function lineAt(d: number, dash: number, gap: number) {
      for (s = 0; s < R.L; s += step) {
        if (dash && (s % (dash + gap)) >= dash) continue;
        if (Math.abs(R.wrap(s - S_CW)) < 2.2 && Math.abs(d) < curb + 0.1) continue;
        let p = R.point(s, d), q = R.point(s + step, d); g.seg([p[0], 0.02, p[1]], [q[0], 0.02, q[1]]);
      }
    }
    lineAt(0, 3, 6); lineAt(LANE, 0, 0); lineAt(-LANE, 0, 0); lineAt(curb, 0, 0); lineAt(-curb, 0, 0); lineAt(walk, 0, 0); lineAt(-walk, 0, 0);
    for (let d = -curb + 0.4; d < curb - 0.3; d += 1.0) {
      let p1 = R.point(S_CW - 1.5, d), p2 = R.point(S_CW + 1.5, d), p3 = R.point(S_CW + 1.5, d + 0.5), p4 = R.point(S_CW - 1.5, d + 0.5);
      g.poly([[p1[0], 0.02, p1[1]], [p2[0], 0.02, p2[1]], [p3[0], 0.02, p3[1]], [p4[0], 0.02, p4[1]]], true);
    }
    let u = R.point(S_CW - 4, 0), v = R.point(S_CW - 4, LANE); g.seg([u[0], 0.02, u[1]], [v[0], 0.02, v[1]]);
    u = R.point(S_CW + 4, 0); v = R.point(S_CW + 4, -LANE); g.seg([u[0], 0.02, u[1]], [v[0], 0.02, v[1]]);
  });
  building('bld1', 18, 7, 12); building('bld2', 14, 10, 14); building('bld3', 24, 4.5, 10); building('bld4', 12, 8, 16); building('bld5', 16, 5, 12);
  return R;
}

export class RoadEra implements Scene {
  [k: string]: any;
  t = 0; hist = new History(200);
  agents: any[] = []; cones: any[] = []; statics: any[] = [];
  constructor(kind: any) {
  
    let R = roadWorld(), truck = kind === 'truck';
    this.kind = kind; this.t = 0; this.hist = new History(200);
    function veh(o: any) { o.v0 = o.v0 || 11; o.aMax = o.aMax || 1.5; o.b = o.b || 2.5; o.T = o.T || 1.3; o.s0 = o.s0 || 3; o.h = o.h || 1.5; o.vd = 0; return o; }
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
    this.cones = []; for (let i = 0; i < 5; i++) this.cones.push({ id: 'cone' + i, kind: 'cone', s: 228 + i * 4, d: -4.5, v: 0, dir: 1, len: 0.4, wid: 0.4, h: 0.7 });
    this.statics = [
      { m: 'bld1', x: -38, z: -12, yaw: 0 }, { m: 'bld2', x: -12, z: 10, yaw: 0 }, { m: 'bld3', x: 18, z: -14, yaw: 0 }, { m: 'bld4', x: 42, z: 8, yaw: 0 }, { m: 'bld5', x: 12, z: 16, yaw: 0 }
    ];
    for (let s = 12; s < 0; s += 37) { if (Math.abs(R.wrap(s - S_CW)) < 8) continue; let p = R.point(s, 11); this.statics.push({ m: 'tree', x: p[0], z: p[1], yaw: s }); }
    this.track = {}; this.encHist = new Uint8Array(200); this.encI = 0; this.encAcc = 0; this.minGapSession = Infinity;
    this.lidarR = 45; this.lidarT = 1.5;
    this.m = {};
    this.step(0);
  }
  pedD(t: any) {
    let c = (t + 23.5) % 32, sp = 14 / 1.3;
    if (c < 5) return { d: -7, vd: 0, start: 5 - c };
    if (c < 5 + sp) return { d: -7 + 1.3 * (c - 5), vd: 1.3, start: 0 };
    if (c < 21) return { d: 7, vd: 0, start: 21 - c };
    if (c < 21 + sp) return { d: 7 - 1.3 * (c - 21), vd: -1.3, start: 0 };
    return { d: -7, vd: 0, start: 37 - c };
  }
  pedConflict(a: any) {
    let p = this.ped, dc = a.d, half = a.wid / 2 + 1.2;
    if (p.vd > 0) return p.d < dc + half;
    if (p.vd < 0) return p.d > dc - half;
    return p.start < 1.5 && Math.abs(p.d) < 7.5 && ((p.d < 0 && dc > p.d) || (p.d > 0 && dc < p.d));
  }
  idm(a: any, all: any) {
    let R = ROUTE, best: any = null, bdv = 0;
    all.forEach(function (b: any) {
      if (b === a) return;
      if (Math.abs(b.d - a.d) > (a.wid + b.wid) / 2 + 0.3) return;
      let D = R.wrap(b.s - a.s) * a.dir; if (D <= 0 || D > 120) return;
      let gap = D - (a.len + b.len) / 2, vb = b.dir ? b.v * b.dir * a.dir : 0;
      if (best === null || gap < best) { best = gap; bdv = a.v - vb; }
    });
    if (this.pedConflict(a)) {
      let D = R.wrap(S_CW - 4 * a.dir - a.s) * a.dir - a.len / 2;
      if (D > -0.5 && (D > a.v * a.v / 10 - 1 || a.v < 1.5) && (best === null || D < best)) { best = Math.max(D, 0.05); bdv = a.v; }
    }
    let k = Math.max(R.curv(a.s), R.curv(a.s + 12 * a.dir), R.curv(a.s + 24 * a.dir)), v0 = Math.min(a.v0, Math.sqrt(2.0 / Math.max(k, 1e-4)));
    let v = a.v, sStar = a.s0 + Math.max(0, v * a.T + v * bdv / (2 * Math.sqrt(a.aMax * a.b)));
    let acc = a.aMax * (1 - Math.pow(v / v0, 4));
    if (best !== null) acc -= a.aMax * Math.pow(sStar / Math.max(best, 0.1), 2);
    return clamp(acc, -6, a.aMax);
  }
  step(dt: any) {
    let R = ROUTE, self = this, t = (this.t += dt), e = this.ego;
    let pd = this.pedD(t); this.ped = pd;
    let ped = this.agents[4]; ped.d = pd.d; ped.vd = pd.vd;
    this.agents.forEach(function (a) { if (a.id === 'car1') a.v0 = 9.5 + 2 * Math.sin(t * 0.11 + 1); });
    let road = [e].concat(this.agents, this.cones);
    let movers = [e].concat(this.agents.filter(function (a) { return a.kind === 'car' || a.kind === 'cyc'; }));
    let accs = movers.map(function (a) { return self.idm(a, road); });
    movers.forEach(function (a, i) { a.v = Math.max(0, a.v + accs[i] * dt); a.s = ((a.s + a.v * a.dir * dt) % R.L + R.L) % R.L; a.acc = accs[i]; });
    this.agents.forEach(function (a) { if (a.kind === 'bot') a.s = ((a.s + a.v * a.dir * dt) % R.L + R.L) % R.L; });
    /* ego lateral: hold lane centre, give vulnerable users / parked cars room, small controller wobble */
    let target = 1.85;
    road.forEach(function (b) {
      if (b === e || b.d < 2.5 || b.d > 6) return;
      let D = R.wrap(b.s - e.s); if (D < -12 || D > 28) return;
      target = Math.min(target, Math.max(1.85 - 0.75, b.d - b.wid / 2 - 1.5 - e.wid / 2));
    });
    let wob = 0.07 * Math.sin(t * 0.9) + 0.035 * Math.sin(t * 2.3 + 1);
    let nd = e.d + (target + wob - e.d) * (1 - Math.exp(-dt * 0.9));
    e.vd = dt > 0 ? (nd - e.d) / dt : 0; e.d = nd;
    /* lidar: an agent is (re)detected when the sweep passes it */
    let r1 = ((t % this.lidarT) / this.lidarT) * this.lidarR, r0 = (((t - dt) % this.lidarT + this.lidarT) % this.lidarT / this.lidarT) * this.lidarR;
    let ep = R.point(e.s, e.d);
    this.agents.forEach(function (a) {
      let p = R.point(a.s, a.d), dist = Math.hypot(p[0] - ep[0], p[1] - ep[1]);
      let tr = self.track[a.id] || (self.track[a.id] = { seen: -99, flash: 0 });
      if (dist <= self.lidarR && ((r0 <= r1 && dist > r0 && dist <= r1) || (r0 > r1 && (dist > r0 || dist <= r1)))) { if (t - tr.seen > 1.7) tr.flash = 1; tr.seen = t; }
      tr.flash = Math.max(0, tr.flash - dt * 1.6); tr.dist = dist; tr.on = (t - tr.seen) < self.lidarT + 0.2 && dist <= self.lidarR;
    });
    this.ringR = r1;
    this.compute(dt);
  }
  compute(dt: any) {
    let R = ROUTE, e = this.ego, self = this, all = this.agents.concat(this.cones);
    let ttc = Infinity, ttcWho = null, gap = Infinity, gapWho = null, enc = 0;
    all.forEach(function (b) {
      let ds = R.wrap(b.s - e.s), dd = b.d - e.d;
      let gs = Math.max(0, Math.abs(ds) - (e.len + b.len) / 2), gd = Math.max(0, Math.abs(dd) - (e.wid + b.wid) / 2), c = Math.hypot(gs, gd);
      if (c < gap) { gap = c; gapWho = b; }
      if (ds > 0 && ds < 100 && Math.abs(dd) < (e.wid + b.wid) / 2) {
        let vb = b.dir ? b.v * b.dir : 0, close = e.v - vb;
        if (close > 0.05) { let tt = gs / close; if (tt < ttc) { ttc = tt; ttcWho = b; } }
      }
      if (ds > -e.len / 2 && ds < 40 && Math.abs(b.d - 1.85) < LANE / 2 + b.wid / 2 && b.kind !== 'cone' && !(b.kind === 'car' && Math.abs(b.d - 1.85) < 0.5)) enc = 1;
    });
    this.encAcc += dt;
    while (this.encAcc >= 0.1) { this.encAcc -= 0.1; this.encHist[this.encI] = enc; this.encI = (this.encI + 1) % 200; }
    let encT = 0; for (let i = 0; i < 200; i++) encT += this.encHist[i]; encT /= 10;
    if (this.t > 1) this.minGapSession = Math.min(this.minGapSession, gap);
    let tracked = 0; for (let k in this.track) if (this.track[k].on) tracked++;
    this.m = { speed: e.v * 3.6, off: 1.85 - e.d, ttc: ttc, ttcWho: ttcWho, gap: gap, gapWho: gapWho, enc: encT, tracked: tracked, total: this.agents.length };
    this.hist.tick(dt, function () { return Math.min(self.m.ttc, 10); }, function () { return self.m.speed; });
  }
  metrics() {
    let m = this.m, off = m.off;
    return [
      { k: 'speed', label: 'Ego speed', value: fmt(m.speed, 1), unit: 'km/h', frac: m.speed / 60, kind: 'ring', note: this.kind === 'truck' ? 'box truck' : 'robotaxi' },
      { k: 'lane', label: 'Lane offset', value: (off >= 0 ? 'L ' : 'R ') + fmt(Math.abs(off), 2), unit: 'm', frac: clamp(off / 1.0, -1, 1), kind: 'center', note: 'from lane centre' },
      { k: 'ttc', label: 'Time to collision', value: ttcText(m.ttc), unit: 's', frac: isFinite(m.ttc) ? 1 - Math.min(m.ttc, 10) / 10 : 0, kind: 'bar', warn: m.ttc < 3, note: m.ttcWho ? 'in path: ' + (m.ttcWho.label || m.ttcWho.kind).toLowerCase() : 'nothing closing in path' },
      { k: 'gap', label: 'Min gap', value: fmt(m.gap, 1), unit: 'm', frac: 1 - Math.min(m.gap, 10) / 10, kind: 'bar', warn: m.gap < 1, note: 'encroached ' + fmt(m.enc, 1) + ' s of 20 s' },
      { k: 'tracked', label: 'Tracked agents', value: String(m.tracked), unit: '/ ' + m.total, frac: m.tracked / m.total, kind: 'dots', n: m.total, note: 'within ' + this.lidarR + ' m sweep' }
    ];
  }
  chart = { a: { label: 'TTC', unit: 's', max: 10 }, b: { label: 'Speed', unit: 'km/h', max: 60 } };
  pose(a: any) { let R = ROUTE, p = R.point(a.s, a.d), yaw = p[2]; if (a.dir < 0) yaw += Math.PI; if (a.v > 0.5) yaw += Math.atan2(-(a.vd || 0), a.v) * (a.dir || 1); return { x: p[0], z: p[1], yaw: yaw }; }
  objects(): Item[] {
    let R = ROUTE, self = this, out: any[] = [{ id: 'road', m: 'road', p: [0, 0, 0], cls: 'world' }], e = this.ego, ep = this.pose(e);
    this.statics.forEach(function (s, i) { out.push({ id: 'st' + i, m: s.m, p: [s.x, 0, s.z], yaw: s.yaw || 0, cls: 'static' }); });
    this.cones.forEach(function (c) { let p = R.point(c.s, c.d); out.push({ id: c.id, m: 'cone', p: [p[0], 0, p[1]], cls: 'static' }); });
    out.push({ id: 'ego', m: e.model, p: [ep.x, 0, ep.z], yaw: ep.yaw, cls: 'ego' });
    let crit = this.m.ttc < 4 ? this.m.ttcWho : null;
    this.agents.forEach(function (a) {
      let q = self.pose(a);
      if (a.kind === 'ped') {
        let fy = a.vd ? (a.vd > 0 ? q.yaw - Math.PI / 2 : q.yaw + Math.PI / 2) : q.yaw + Math.PI / 2 * (a.d < 0 ? -1 : 1), sw = a.vd ? 0.45 * Math.sin(self.t * 5.5) : 0;
        let rx = Math.cos(fy) * 0.1, rz = -Math.sin(fy) * 0.1;
        out.push({ id: 'ped', m: 'ped', p: [q.x, 0, q.z], yaw: fy, cls: 'agent' });
        out.push({ id: 'pedl', m: 'leg', p: [q.x + rx, 0.88, q.z + rz], yaw: fy, pitch: sw, cls: 'agent' });
        out.push({ id: 'pedr', m: 'leg', p: [q.x - rx, 0.88, q.z - rz], yaw: fy, pitch: -sw, cls: 'agent' });
        q.yaw = fy;
      } else out.push({ id: a.id, m: a.model, p: [q.x, 0, q.z], yaw: q.yaw, cls: 'agent' });
      let tr = self.track[a.id];
      if (tr && tr.on) out.push({ id: 'bb_' + a.id, m: bboxModel(a.wid + 0.4, a.h + 0.25, a.len + 0.4), p: [q.x, 0, q.z], yaw: q.yaw, cls: a === crit ? 'warn' : 'bbox', a: 0.55 + 0.45 * tr.flash });
    });
    /* planned path: lane centre ahead for ~5 s of travel, corridor edges dashed */
    let L = Math.max(14, e.v * 5), n = 40, strip = new Float32Array((n + 1) * 3), seg: number[] = [];
    for (let i = 0; i <= n; i++) {
      let s = e.s + e.len / 2 + L * i / n, k = i / n, d = e.d + (1.85 - e.d) * sstep(0, 1, k * 1.5), p = R.point(s, d);
      strip[i * 3] = p[0]; strip[i * 3 + 1] = 0.06; strip[i * 3 + 2] = p[1];
      if (i < n && i % 2 === 0) [-1, 1].forEach(function (sg) { let a = R.point(s, d + sg * e.wid / 2), b = R.point(s + L / n, d + sg * e.wid / 2); seg.push(a[0], 0.05, a[1], b[0], 0.05, b[1]); });
    }
    let tip = R.point(e.s + e.len / 2 + L, 1.85), tl = R.point(e.s + e.len / 2 + L - 1.4, 1.85 - 0.7), tr2 = R.point(e.s + e.len / 2 + L - 1.4, 1.85 + 0.7);
    seg.push(tl[0], 0.06, tl[1], tip[0], 0.06, tip[1], tip[0], 0.06, tip[1], tr2[0], 0.06, tr2[1]);
    out.push({ id: 'path', strip: strip, cls: 'path' });
    out.push({ id: 'corr', seg: new Float32Array(seg), cls: 'path', a: 0.5 });
    out.push({ id: 'range', m: 'dring', p: [ep.x, 0.03, ep.z], s: this.lidarR, cls: 'world', a: 0.7 });
    out.push({ id: 'lidar', m: 'ring', p: [ep.x, 0.04, ep.z], s: Math.max(0.01, this.ringR), cls: 'ring', a: 0.9 * Math.pow(1 - this.ringR / this.lidarR, 0.6) });
    return out;
  }
  labels() {
    let self = this, out: any[] = [];
    this.agents.forEach(function (a) {
      let tr = self.track[a.id]; if (!tr || !tr.on) return;
      let q = self.pose(a);
      out.push({ id: a.id, p: [q.x, a.h + 0.9, q.z], text: a.label + ' ' + fmt(tr.dist, 1) + ' m', warn: self.m.ttc < 4 && self.m.ttcWho === a });
    });
    return out;
  }
  cam() {
    let R = ROUTE, e = this.ego, p = this.pose(e), a = R.point(e.s + 8, 1.85), b = R.point(e.s - 12, 1.85), fx = a[0] - b[0], fz = a[1] - b[1], l = Math.hypot(fx, fz);
    let truck = this.kind === 'truck';
    return { focus: [p.x, truck ? 1.6 : 1.0, p.z], fwd: [fx / l, fz / l], dist: truck ? 54 : 44, height: truck ? 21 : 17, fov: 26, ahead: truck ? 4 : 3, side: 0.4, frame: 'chase' };
  }
  ground = { mode: 0, minor: 2, major: 10, fade: 120, amp: 0, glowR: 9 };
  ring() { let p = this.pose(this.ego); return { x: p.x, z: p.z, r: this.ringR, a: 1 - this.ringR / this.lidarR, w: 1.6 }; }
  describe() { return this.kind === 'truck' ? 'An autonomous box truck drives a looped road past a car, a cyclist, a pedestrian at a crossing and parked obstacles. A lidar ring sweeps out from the truck; detected agents get bounding boxes and the planned path is drawn ahead.' : 'A robotaxi minivan drives a looped road while a small delivery robot rolls along the pavement; other cars, a cyclist and a pedestrian are tracked with bounding boxes.'; }
}
