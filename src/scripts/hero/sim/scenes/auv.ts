/* AUV scene (2013): looped course through a gate and buoys over contoured seabed. */
import { model, bboxModel } from '../geo';
import '../shared-models';
import { TAU, deg, wrapPi, fmt } from '../math';
import { History } from '../history';
import type { Item, Scene } from '../types';

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

export function bathy(x: number, z: number) { return 0.55 * Math.sin(x * 0.21 + 0.3) * Math.cos(z * 0.17) + 0.35 * Math.sin((x + z) * 0.11 + 1.2) + 0.2 * Math.sin(x * 0.5 - z * 0.37); }
export class AuvEra implements Scene {
  [k: string]: any;
  t = 0; hist = new History(200);
  buoys: any[] = [];
  constructor() {
  
    this.t = 0; this.u = 0.05; this.hist = new History(200); this.surface = 5.2; this.sonarR = 14; this.sonarT = 2.2; this.track = {};
    let self = this;
    this.pathAt = function (u: number): number[] { let a = u * TAU; return [7.5 * Math.cos(a), 2.5 + 0.55 * Math.sin(2 * a + 0.5), 4.6 * Math.sin(a) + 1.0 * Math.sin(2 * a)]; };
    function along(u: number, off: number) { let p = self.pathAt(u), q = self.pathAt(u + 0.001), tx = q[0] - p[0], tz = q[2] - p[2], l = Math.hypot(tx, tz); return [p[0] + tz / l * off, p[2] - tx / l * off, Math.atan2(tx, tz)]; }
    let g = along(0.25, 0); this.gate = { id: 'gate', label: 'GATE', x: g[0], z: g[1], yaw: g[2] + Math.PI / 2, r: 1.3 };
    this.buoys = [[0.52, 1.3, 2.2], [0.6, -1.4, 2.6], [0.84, 1.2, 1.9]].map(function (b, i) { let p = along(b[0], b[1]); return { id: 'buoy' + i, label: 'BUOY ' + (i + 1), x: p[0], z: p[1], y: b[2], r: 0.25 }; });
    let m = along(0.4, 0); this.marker = { x: m[0], z: m[1], yaw: m[2] };
    this.step(0);
  }
  step(dt: any) {
    let self = this, t = (this.t += dt), v = 0.85;
    let p = this.pathAt(this.u), q = this.pathAt(this.u + 0.0005), dl = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) / 0.0005;
    this.u = (this.u + v * dt / dl) % 1;
    p = this.pathAt(this.u); q = this.pathAt(this.u + 0.002);
    let hx = q[0] - p[0], hz = q[2] - p[2], hl = Math.hypot(hx, hz);
    let yaw = Math.atan2(hx, hz), prev = this.yaw == null ? yaw : this.yaw;
    this.yawRate = dt > 0 ? wrapPi(yaw - prev) / dt : 0; this.yaw = yaw;
    this.pos = [p[0], p[1] + 0.04 * Math.sin(t * 1.3), p[2]]; this.pitch = -Math.atan2(q[1] - p[1], hl); this.v = v;
    let r1 = ((t % this.sonarT) / this.sonarT) * this.sonarR, r0 = ((((t - dt) % this.sonarT) + this.sonarT) % this.sonarT / this.sonarT) * this.sonarR; this.ringR = r1;
    [this.gate].concat(this.buoys).forEach(function (o) {
      let d = Math.hypot(o.x - self.pos[0], o.z - self.pos[2]), tr = self.track[o.id] || (self.track[o.id] = { seen: -99, flash: 0 });
      if (d <= self.sonarR && ((r0 <= r1 && d > r0 && d <= r1) || (r0 > r1 && (d > r0 || d <= r1)))) { if (t - tr.seen > 2.4) tr.flash = 1; tr.seen = t; }
      tr.flash = Math.max(0, tr.flash - dt * 1.4); tr.dist = d; tr.on = t - tr.seen < self.sonarT + 0.2 && d <= self.sonarR;
    });
    let n = 0; for (let k in this.track) if (this.track[k].on) n++;
    this.m = { depth: this.surface - this.pos[1], heading: (deg(yaw) + 360) % 360, alt: this.pos[1] - bathy(this.pos[0], this.pos[2]), speed: v, contacts: n };
    this.hist.tick(dt, function () { return self.m.depth; }, function () { return self.m.alt; });
  }
  metrics() {
    let m = this.m;
    return [
      { k: 'speed', label: 'Depth', value: fmt(m.depth, 2), unit: 'm', frac: m.depth / this.surface, kind: 'ring', note: 'below surface' },
      { k: 'lane', label: 'Heading', value: fmt(m.heading, 0).padStart(3, '0'), unit: '\u00B0', frac: wrapPi(m.heading / 180 * Math.PI) / Math.PI, kind: 'center', note: 'turn rate ' + fmt(deg(this.yawRate), 1) + ' \u00B0/s' },
      { k: 'ttc', label: 'Altitude', value: fmt(m.alt, 2), unit: 'm', frac: 1 - m.alt / 4, kind: 'bar', note: 'above the seabed' },
      { k: 'gap', label: 'Speed', value: fmt(m.speed, 2), unit: 'm/s', frac: m.speed / 1.5, kind: 'bar', note: 'pitch ' + fmt(deg(this.pitch), 1) + '\u00B0' },
      { k: 'tracked', label: 'Sonar contacts', value: String(m.contacts), unit: '/ 4', frac: m.contacts / 4, kind: 'dots', n: 4, note: 'gate and buoys in ' + this.sonarR + ' m' }
    ];
  }
  chart = { a: { label: 'Depth', unit: 'm', max: 5 }, b: { label: 'Altitude', unit: 'm', max: 5 } };
  objects(): Item[] {
    let self = this, out: any[] = [], P = this.pos;
    out.push({ id: 'auv', m: 'auv', p: P, yaw: this.yaw, pitch: this.pitch, roll: -this.yawRate * 0.25, cls: 'ego' });
    let g = this.gate; out.push({ id: 'gate', m: 'gate', p: [g.x, bathy(g.x, g.z) + 0.6, g.z], yaw: g.yaw, cls: 'static' });
    let tether: number[] = [], drop: number[] = [];
    this.buoys.forEach(function (b) { let by = bathy(b.x, b.z) + b.y; out.push({ id: b.id, m: 'buoy', p: [b.x, by, b.z], cls: 'agent' }); out.push({ id: b.id + 'a', m: 'anchor', p: [b.x, bathy(b.x, b.z), b.z], cls: 'static' }); tether.push(b.x, by - 0.25, b.z, b.x, bathy(b.x, b.z) + 0.1, b.z); });
    let mk = this.marker; out.push({ id: 'marker', m: 'marker', p: [mk.x, bathy(mk.x, mk.z), mk.z], yaw: mk.yaw, cls: 'static' });
    out.push({ id: 'tether', seg: new Float32Array(tether), cls: 'static' });
    let hb = bathy(P[0], P[2]); for (let y = P[1] - 0.25; y > hb + 0.05; y -= 0.16) drop.push(P[0], y, P[2], P[0], Math.max(hb, y - 0.08), P[2]);
    drop.push(P[0] - 0.25, hb + 0.01, P[2], P[0] + 0.25, hb + 0.01, P[2], P[0], hb + 0.01, P[2] - 0.25, P[0], hb + 0.01, P[2] + 0.25);
    out.push({ id: 'drop', seg: new Float32Array(drop), cls: 'path', a: 0.7 });
    let n = 60, strip = new Float32Array((n + 1) * 3);
    for (let i = 0; i <= n; i++) { let p = this.pathAt(this.u + 0.004 + i * 0.0035); strip[i * 3] = p[0]; strip[i * 3 + 1] = p[1]; strip[i * 3 + 2] = p[2]; }
    out.push({ id: 'path', strip: strip, cls: 'path' });
    [this.gate].concat(this.buoys).forEach(function (o) { let tr = self.track[o.id]; if (tr && tr.on) { let isG = o === self.gate, h = isG ? 2.0 : 0.6, base = isG ? bathy(o.x, o.z) + 0.55 : bathy(o.x, o.z) + o.y - 0.3; out.push({ id: 'bb_' + o.id, m: isG ? bboxModel(2.8, h, 0.5) : bboxModel(0.6, h, 0.6), p: [o.x, base, o.z], yaw: o.yaw || 0, cls: 'bbox', a: 0.55 + 0.45 * tr.flash }); } });
    out.push({ id: 'lidar', m: 'ring', p: [P[0], hb + 0.05, P[2]], s: Math.max(0.01, this.ringR), cls: 'ring', a: 0.7 * (1 - this.ringR / this.sonarR) });
    return out;
  }
  labels() {
    let self = this, out: any[] = [];
    [this.gate].concat(this.buoys).forEach(function (o) { let tr = self.track[o.id]; if (!tr || !tr.on) return; let y = o === self.gate ? bathy(o.x, o.z) + 2.9 : bathy(o.x, o.z) + o.y + 0.6; out.push({ id: o.id, p: [o.x, y, o.z], text: o.label + ' ' + fmt(tr.dist, 1) + ' m' }); });
    return out;
  }
  cam() { return { focus: this.pos, fwd: [Math.sin(this.yaw), Math.cos(this.yaw)], dist: 10, height: 4.6, fov: 30, ahead: 0.8, side: 0.45, smooth: true }; }
  ground = { mode: 2, minor: 1, major: 5, fade: 30, amp: 1, glowR: 3, contour: 0.18 };
  ring() { return { x: this.pos[0], z: this.pos[2], r: this.ringR, a: 1 - this.ringR / this.sonarR, w: 0.6 }; }
  describe() { return 'An autonomous underwater vehicle follows a looped course through a gate and around three buoys above a contoured seabed. A sonar ring sweeps out and marks contacts.'; }
}
