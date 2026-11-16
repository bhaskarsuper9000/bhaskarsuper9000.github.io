/* Humanoid scene (2016): two-link IK walking circle with footprints. */
import { model } from '../geo';
import { TAU, clamp, sstep, deg, fmt } from '../math';
import { History } from '../history';
import type { Item, Scene } from '../types';

model('n_torso', function (g) { g.box(0, 0.105, 0, 0.15, 0.19, 0.1, { tx: 1.08 }); g.box(0, 0.015, 0, 0.12, 0.03, 0.08); g.rect([[-0.04, 0.16, 0.051], [0.04, 0.16, 0.051], [0.04, 0.11, 0.051], [-0.04, 0.11, 0.051]]); });
model('n_head', function (g) { g.box(0, 0.06, 0, 0.12, 0.11, 0.115, { tx: 0.9, tz: 0.9 }); g.seg([-0.04, 0.07, 0.058], [-0.015, 0.07, 0.058]); g.seg([0.015, 0.07, 0.058], [0.04, 0.07, 0.058]); g.cyl(0.065, 0.06, 0, 0.025, 0.012, 'x', 8); g.cyl(-0.065, 0.06, 0, 0.025, 0.012, 'x', 8); });
model('n_thigh', function (g) { g.box(0, -0.05, 0, 0.05, 0.1, 0.062, { tx: 1.1 }); });
model('n_shin', function (g) { g.box(0, -0.05, 0, 0.046, 0.1, 0.056); g.cyl(0, 0, 0, 0.022, 0.05, 'x', 8); });
model('n_foot', function (g) { g.box(0, -0.012, 0.016, 0.07, 0.024, 0.13); });
model('n_arm', function (g) { g.box(0, -0.045, 0, 0.04, 0.09, 0.045); });
model('n_print', function (g) { g.rect([[-0.035, 0.001, -0.05], [0.035, 0.001, -0.05], [0.035, 0.001, 0.08], [-0.035, 0.001, 0.08]]); });
model('easel', function (g) {
  g.box(0, 0.5, 0, 0.6, 0.42, 0.02); g.seg([-0.25, 0, -0.15], [-0.22, 0.75, 0]); g.seg([0.25, 0, -0.15], [0.22, 0.75, 0]); g.seg([0, 0, -0.3], [0, 0.72, -0.02]);
  let p: number[][] = []; for (let i = 0; i <= 60; i++) { let a = i / 60 * TAU * 2.2, r = 0.02 + i / 60 * 0.15; p.push([Math.cos(a) * r, 0.5 + Math.sin(a) * r * 1.05, 0.012]); } g.poly(p);
});
model('cube', function (g) { g.box(0, 0.05, 0, 0.1, 0.1, 0.1); });

export class NaoEra implements Scene {
  [k: string]: any;
  t = 0; hist = new History(200);
  prints: any[] = []; lastPh: number[] = [];
  constructor() {
   this.t = 0; this.hist = new History(200); this.steps = 0; this.prints = []; this.lastPh = [0, 0.5]; this.Rc = 0.85; this.step(0); 
  }
  T = 1.0;
  S = 0.05;
  L1 = 0.1;
  L2 = 0.1;
  Hh = 0.21;
  leg(ph: any) {
    let S = this.S, z, lift = 0;
    if (ph < 0.5) z = S / 2 - S * (ph / 0.5); else { let k = sstep(0, 1, (ph - 0.5) / 0.5); z = -S / 2 + S * k; lift = 0.022 * Math.sin(Math.PI * (ph - 0.5) / 0.5); }
    let ys = -(this.Hh - 0.024 - lift), L1 = this.L1, L2 = this.L2, D = Math.min(Math.hypot(z, ys), L1 + L2 - 1e-4);
    let phf = Math.atan2(z, -ys), al = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)), be = Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
    let knee = Math.PI - be, th = phf + al, sh = th - knee;
    return { hip: th, knee: knee, shin: sh, ankle: -sh, z: z, lift: lift };
  }
  step(dt: any) {
    let t = (this.t += dt), self = this, v = this.S / (this.T / 2), Rc = this.Rc;
    this.ang = t * v / Rc; let a = this.ang;
    this.base = [Rc * Math.cos(a), Rc * Math.sin(a)]; this.yaw = Math.atan2(-Math.sin(a), Math.cos(a));
    let phL = (t / this.T) % 1, phR = (phL + 0.5) % 1;
    this.L = this.leg(phL); this.R = this.leg(phR);
    [[phL, 0], [phR, 1]].forEach(function (q) { let prev = self.lastPh[q[1]]; if (q[0] < prev) { self.steps++; self.touch(q[1]); } self.lastPh[q[1]] = q[0]; });
    this.m = { hip: deg(this.L.hip), knee: deg(this.L.knee), ankle: deg(this.L.ankle), steps: this.steps, speed: v * 100 };
    this.hist.tick(dt, function () { return deg(self.L.knee); }, function () { return deg(self.R.knee); });
    this.prints = this.prints.filter(function (p) { return t - p.t < 9; });
  }
  frame() {
    let y = this.yaw, c = Math.cos(y), s = Math.sin(y), b = this.base, bob = 0.004 * Math.cos(4 * Math.PI * this.t / this.T), sway = 0.006 * Math.sin(TAU * this.t / this.T);
    function W(lx: number, ly: number, lz: number) { return [b[0] + lx * c + lz * s, ly, b[1] - lx * s + lz * c]; }
    return { W: W, bob: bob, sway: sway };
  }
  touch(side: any) { let f = this.frame(), lg = side ? this.R : this.L, lx = (side ? -0.05 : 0.05) + f.sway; let hz = Math.sin(lg.hip) * this.L1 + Math.sin(lg.shin) * this.L2; this.prints.push({ p: f.W(lx, 0, hz), yaw: this.yaw, t: this.t }); }
  metrics() {
    let m = this.m;
    return [
      { k: 'speed', label: 'Hip pitch (L)', value: fmt(m.hip, 1), unit: '\u00B0', frac: (m.hip + 30) / 60, kind: 'ring', note: 'from 2-link inverse kinematics' },
      { k: 'lane', label: 'Knee (L)', value: fmt(m.knee, 1), unit: '\u00B0', frac: clamp(m.knee / 60, -1, 1), kind: 'center', note: 'bend, 0 = straight leg' },
      { k: 'ttc', label: 'Ankle (L)', value: fmt(m.ankle, 1), unit: '\u00B0', frac: (m.ankle + 30) / 60, kind: 'bar', note: 'keeps the foot flat' },
      { k: 'gap', label: 'Step count', value: String(m.steps), unit: 'steps', frac: (m.steps % 20) / 20, kind: 'bar', note: 'stride ' + fmt(this.S * 100, 0) + ' cm per step' },
      { k: 'tracked', label: 'Walk speed', value: fmt(m.speed, 1), unit: 'cm/s', frac: m.speed / 20, kind: 'bar', note: 'circle of radius ' + fmt(this.Rc, 2) + ' m' }
    ];
  }
  chart = { a: { label: 'Knee L', unit: '\u00B0', max: 60 }, b: { label: 'Knee R', unit: '\u00B0', max: 60 } };
  objects(): Item[] {
    let self = this, f = this.frame(), W = f.W, y = this.yaw, out: any[] = [], H = this.Hh + f.bob;
    out.push({ id: 'torso', m: 'n_torso', p: W(f.sway, H, 0), yaw: y, cls: 'ego' });
    out.push({ id: 'head', m: 'n_head', p: W(f.sway, H + 0.215, 0), yaw: y + 0.15 * Math.sin(this.t * 0.4), cls: 'ego' });
    [[this.L, 1], [this.R, -1]].forEach(function (q) {
      let lg = q[0], sx = q[1] * 0.05 + f.sway, hip = W(sx, H, 0), L1 = self.L1;
      let knee = W(sx, H - Math.cos(lg.hip) * L1, Math.sin(lg.hip) * L1), ank = W(sx, H - Math.cos(lg.hip) * L1 - Math.cos(lg.shin) * self.L2, Math.sin(lg.hip) * L1 + Math.sin(lg.shin) * self.L2);
      let id = q[1] > 0 ? 'l' : 'r';
      out.push({ id: 'th' + id, m: 'n_thigh', p: hip, yaw: y, pitch: -lg.hip, cls: 'ego' });
      out.push({ id: 'sh' + id, m: 'n_shin', p: knee, yaw: y, pitch: -lg.shin, cls: 'ego' });
      out.push({ id: 'ft' + id, m: 'n_foot', p: ank, yaw: y, cls: 'ego' });
      let sw = -0.4 * (lg.hip), sh = W(q[1] * 0.1 + f.sway, H + 0.18, 0);
      out.push({ id: 'ua' + id, m: 'n_arm', p: sh, yaw: y, pitch: -sw, roll: q[1] * 0.12, cls: 'ego' });
      let el = W(q[1] * 0.105 + f.sway, H + 0.18 - Math.cos(sw) * 0.09, Math.sin(sw) * 0.09);
      out.push({ id: 'fa' + id, m: 'n_arm', p: el, yaw: y, pitch: -sw - 0.5, s: 0.85, cls: 'ego' });
    });
    this.prints.forEach(function (p, i) { out.push({ id: 'pr' + i, m: 'n_print', p: p.p, yaw: p.yaw, cls: 'path', a: 0.8 * (1 - (self.t - p.t) / 9) }); });
    out.push({ id: 'easel', m: 'easel', p: [0.1, 0, -0.1], yaw: 0.6, cls: 'static' });
    [[0.25, 0.3, 0.3], [-0.3, 0.2, 1], [-1.35, -0.4, 0.2], [1.3, 0.6, 0.7], [0.4, -1.4, 0]].forEach(function (c, i) { out.push({ id: 'cube' + i, m: 'cube', p: [c[0], 0, c[1]], yaw: c[2], cls: 'static' }); });
    let n = 48, strip = new Float32Array((n + 1) * 3);
    for (let i = 0; i <= n; i++) { let a = this.ang + 0.12 + i * 0.02; strip[i * 3] = this.Rc * Math.cos(a); strip[i * 3 + 1] = 0.002; strip[i * 3 + 2] = this.Rc * Math.sin(a); }
    out.push({ id: 'path', strip: strip, cls: 'path', a: 0.8 });
    return out;
  }
  labels() { let f = this.frame(); return [{ id: 'knee', p: f.W(0.05, 0.33, 0), text: 'KNEE ' + fmt(this.m.knee, 0) + '\u00B0' }]; }
  cam() { return { focus: [this.base[0], 0.2, this.base[1]], fwd: [Math.sin(this.yaw), Math.cos(this.yaw)], dist: 2.7, height: 1.05, fov: 30, ahead: 0.05, side: 0.6 }; }
  ground = { mode: 0, minor: 0.1, major: 0.5, fade: 5, amp: 0, glowR: 0.35 };
  ring() { return null; }
  describe() { return 'A small humanoid robot walks a circle. Its leg angles come from two-link inverse kinematics each frame, and it leaves fading footprints on the floor grid.'; }
}
