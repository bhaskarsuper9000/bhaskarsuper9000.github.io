/* Toy truck scene (1990): pushed truck, letter blocks and a ball. */
import { model, bboxModel } from '../geo';
import { TAU, clamp, sstep, wrapPi, fmt, ttcText } from '../math';
import { History } from '../history';
import type { Item, Scene } from '../types';

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
const LETTERS: Record<string, number[][]> = { A: [[0, 0, 0.5, 1], [0.5, 1, 1, 0], [0.25, 0.5, 0.75, 0.5]], B: [[0, 0, 0, 1], [0, 1, 0.7, 1], [0.7, 1, 0.7, 0.5], [0, 0.5, 1, 0.5], [1, 0.5, 1, 0], [1, 0, 0, 0]], C: [[1, 1, 0, 1], [0, 1, 0, 0], [0, 0, 1, 0]] };
['A', 'B', 'C'].forEach(function (L) {
  model('blk' + L, function (g) {
    let s = 0.07; g.box(0, s / 2, 0, s, s, s);
    LETTERS[L].forEach(function (q) { let m = 0.016, k = s - 2 * m; g.seg([-s / 2 + m + q[0] * k, m + q[1] * k, s / 2 + 0.001], [-s / 2 + m + q[2] * k, m + q[3] * k, s / 2 + 0.001]); g.seg([s / 2 + 0.001, m + q[1] * k, s / 2 - m - q[0] * k], [s / 2 + 0.001, m + q[3] * k, s / 2 - m - q[2] * k]); });
  });
});
model('ball', function (g) { g.cyl(0, 0.05, 0, 0.05, 0.06, 'y', 12, { ribs: 6 }); g.cyl(0, 0.05, 0, 0.035, 0.1, 'y', 12); g.cyl(0, 0.05, 0, 0.05, 0.01, 'x', 12, { noFill: true }); });

/* generic in-path TTC in the ego frame (constant velocity): ego {x,z,yaw,v,len,wid}; obs {x,z,r,vx,vz} */
function egoFrameTTC(e: any, obs: any[]) {
  let fx = Math.sin(e.yaw), fz = Math.cos(e.yaw), best = Infinity, who = null;
  obs.forEach(function (o) {
    let rx = o.x - e.x, rz = o.z - e.z, lon = rx * fx + rz * fz, lat = rx * fz - rz * fx;
    if (lon <= 0 || Math.abs(lat) > e.wid / 2 + o.r) return;
    let gap = lon - e.len / 2 - o.r, close = e.v - ((o.vx || 0) * fx + (o.vz || 0) * fz);
    if (close > 0.01) { let t = Math.max(0, gap) / close; if (t < best) { best = t; who = o; } }
  });
  return { ttc: best, who: who };
}

export class ToyEra implements Scene {
  [k: string]: any;
  t = 0; hist = new History(200);
  blocks: any[] = [];
  constructor() {
  
    this.t = 0; this.u = 0; this.hist = new History(200); this.pushes = 0; this.dist = 0; this.wheelA = 0;
    this.blocks = ([['blkA', 0.55, -0.62, 0.4], ['blkB', -0.15, 0.78, 0.9], ['blkC', -1.0, 0.3, 0.2], ['blkA', 0.95, 0.45, 1.3], ['blkB', 0.62, -0.62, 0.4, 0.07], ['ball', -0.6, -0.65, 0]] as any[]).map(function (b, i) { return { id: 'b' + i, m: b[0], x: b[1], z: b[2], yaw: b[3], y: b[4] || 0, r: 0.05, label: b[0] === 'ball' ? 'BALL' : 'BLOCK ' + b[0].slice(3) }; });
    this.lastPush = -1; this.step(0);
  }
  pathAt(u: any) { let a = u * TAU; return [0.85 * Math.cos(a) + 0.12 * Math.sin(3 * a), 0.52 * Math.sin(a) + 0.1 * Math.cos(2 * a)]; }
  step(dt: any) {
    let t = (this.t += dt), self = this, period = 2.6, tp = t % period, k = Math.floor(t / period);
    if (k !== this.lastPush) { this.lastPush = k; this.pushes++; }
    let v = 0.03 + 0.5 * Math.exp(-1.0 * tp) * sstep(0, 0.15, tp);
    let p = this.pathAt(this.u), q = this.pathAt(this.u + 0.0005), dl = Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.0005;
    this.u = (this.u + v * dt / dl) % 1; this.v = v; this.dist += v * dt; this.wheelA += v * dt / 0.034;
    p = this.pathAt(this.u); q = this.pathAt(this.u + 0.002); this.pos = p;
    let yaw = Math.atan2(q[0] - p[0], q[1] - p[1]); this.yawRate = dt > 0 && this.yaw != null ? wrapPi(yaw - this.yaw) / dt : 0; this.yaw = yaw;
    let r = egoFrameTTC({ x: p[0], z: p[1], yaw: yaw, v: v, len: 0.28, wid: 0.14 }, this.blocks);
    let near = 0; this.blocks.forEach(function (b) { b.dist = Math.hypot(b.x - p[0], b.z - p[1]); b.on = b.dist < 0.75; if (b.on) near++; });
    this.m = { speed: v * 100, rpm: v / (TAU * 0.034) * 60, ttc: r.ttc, who: r.who, near: near };
    this.hist.tick(dt, function () { return Math.min(self.m.ttc, 10); }, function () { return self.m.speed; });
  }
  metrics() {
    let m = this.m;
    return [
      { k: 'speed', label: 'Speed', value: fmt(m.speed, 1), unit: 'cm/s', frac: m.speed / 55, kind: 'ring', note: 'one push every 2.6 s' },
      { k: 'lane', label: 'Wheel speed', value: fmt(m.rpm, 0), unit: 'rpm', frac: clamp(m.rpm / 160, -1, 1), kind: 'center', note: '3.4 cm wheels' },
      { k: 'ttc', label: 'Time to collision', value: ttcText(m.ttc), unit: 's', frac: isFinite(m.ttc) ? 1 - Math.min(m.ttc, 10) / 10 : 0, kind: 'bar', warn: m.ttc < 1.5, note: m.who ? 'in path: ' + m.who.label.toLowerCase() : 'nothing in path' },
      { k: 'gap', label: 'Pushes', value: String(this.pushes), unit: '', frac: (this.pushes % 10) / 10, kind: 'bar', note: fmt(this.dist, 2) + ' m pushed so far' },
      { k: 'tracked', label: 'Toys nearby', value: String(m.near), unit: '/ 6', frac: m.near / 6, kind: 'dots', n: 6, note: 'within 75 cm' }
    ];
  }
  chart = { a: { label: 'TTC', unit: 's', max: 10 }, b: { label: 'Speed', unit: 'cm/s', max: 60 } };
  objects(): Item[] {
    let self = this, out: any[] = [{ id: 'toy', m: 'toy', p: [this.pos[0], 0, this.pos[1]], yaw: this.yaw, cls: 'ego' }];
    this.blocks.forEach(function (b) {
      out.push({ id: b.id, m: b.m, p: [b.x, b.y, b.z], yaw: b.yaw, cls: 'static' });
      if (b.on) out.push({ id: 'bb' + b.id, m: bboxModel(0.11, 0.1, 0.11), p: [b.x, b.y, b.z], yaw: b.yaw, cls: self.m.who === b && self.m.ttc < 1.5 ? 'warn' : 'bbox', a: 0.7 });
    });
    let n = 40, strip = new Float32Array((n + 1) * 3);
    for (let i = 0; i <= n; i++) { let p = this.pathAt(this.u + 0.03 + i * 0.006); strip[i * 3] = p[0]; strip[i * 3 + 1] = 0.002; strip[i * 3 + 2] = p[1]; }
    out.push({ id: 'path', strip: strip, cls: 'path', a: 0.8 });
    return out;
  }
  labels() { let out: any[] = []; this.blocks.forEach(function (b) { if (b.on && b.dist < 0.55) out.push({ id: b.id, p: [b.x, 0.16 + b.y, b.z], text: b.label + ' ' + fmt(b.dist * 100, 0) + ' cm' }); }); return out; }
  cam() { return { focus: [this.pos[0], 0.05, this.pos[1]], fwd: [Math.sin(this.yaw), Math.cos(this.yaw)], dist: 1.9, height: 0.8, fov: 30, ahead: 0.1, side: 0.5, smooth: true }; }
  ground = { mode: 1, minor: 0.14, major: 1.2, fade: 4, amp: 0, glowR: 0.3 };
  ring() { return null; }
  describe() { return 'A toy truck is pushed across a wooden floor between letter blocks and a ball. Even here the readouts compute speed, wheel rpm and time to collision with the next block.'; }
}
