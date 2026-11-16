/* Web-driven robot scene (2008): arrow-key commands over a modelled network delay. */
import { model } from '../geo';
import '../shared-models';
import { TAU, deg, wrapPi, fmt } from '../math';
import { History } from '../history';
import type { Item, Scene } from '../types';

model('wbot', function (g) {
  g.box(0, 0.1, 0, 0.3, 0.1, 0.34);
  [-0.18, 0.18].forEach(function (x) { g.cyl(x, 0.07, 0.06, 0.07, 0.035, 'x', 10, { hub: true }); });
  g.cyl(0, 0.03, -0.13, 0.03, 0.02, 'x', 6);
  g.seg([0, 0.15, -0.08], [0, 0.4, -0.08]); g.box(0, 0.43, -0.06, 0.08, 0.06, 0.07); g.cyl(0, 0.43, -0.015, 0.02, 0.02, 'z', 8);
  g.seg([0.12, 0.15, -0.14], [0.12, 0.5, -0.16]);
  g.rect([[-0.1, 0.151, 0.02], [0.1, 0.151, 0.02], [0.1, 0.151, 0.14], [-0.1, 0.151, 0.14]]);
});
function arrowModel(key: string, pts: number[][]) { model(key, function (g) { let P = pts.map(function (p) { return [p[0] * 0.18, 0.003, p[1] * 0.18]; }); for (let i = 1; i < P.length - 1; i++) g.tri(P[0], P[i], P[i + 1]); g.poly(P, true); }); }
arrowModel('arr_f', [[0, 1], [0.7, 0.2], [0.3, 0.2], [0.3, -0.8], [-0.3, -0.8], [-0.3, 0.2], [-0.7, 0.2]]);
arrowModel('arr_l', [[1, 0], [0.2, 0.7], [0.2, 0.3], [-0.8, 0.3], [-0.8, -0.3], [0.2, -0.3], [0.2, -0.7]]);
arrowModel('arr_r', [[-1, 0], [-0.2, 0.7], [-0.2, 0.3], [0.8, 0.3], [0.8, -0.3], [-0.2, -0.3], [-0.2, -0.7]]);
arrowModel('arr_s', [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]);
model('padframe', function (g) { [[0, 0.24], [0.24, 0], [-0.24, 0], [0, 0]].forEach(function (c) { g.rect([[c[0] - 0.11, 0.002, c[1] - 0.11], [c[0] + 0.11, 0.002, c[1] - 0.11], [c[0] + 0.11, 0.002, c[1] + 0.11], [c[0] - 0.11, 0.002, c[1] + 0.11]]); }); });
model('bgi', function (g) {
  let W = 1.6, H = 1.0, y0 = 0.25, z = 0;
  g.rect([[-W / 2, y0, z], [W / 2, y0, z], [W / 2, y0 + H, z], [-W / 2, y0 + H, z]]);
  g.seg([-W / 2, y0 + H - 0.08, z], [W / 2, y0 + H - 0.08, z]);
  g.rect([[-W / 2 + 0.03, y0 + H - 0.065, z], [-W / 2 + 0.08, y0 + H - 0.065, z], [-W / 2 + 0.08, y0 + H - 0.015, z], [-W / 2 + 0.03, y0 + H - 0.015, z]]);
  let p: number[][] = []; for (let i = 0; i < 40; i++) { let a = i / 40 * TAU; p.push([-0.42 + Math.cos(a) * 0.22, y0 + 0.45 + Math.sin(a) * 0.22, z]); } g.poly(p, true);
  g.rect([[0.05, y0 + 0.2, z], [0.62, y0 + 0.2, z], [0.62, y0 + 0.72, z], [0.05, y0 + 0.72, z]]);
  for (let i = 0; i < 9; i++) g.seg([0.05, y0 + 0.2 + i * 0.065, z], [0.05 + i * 0.07, y0 + 0.72, z]);
  g.seg([-W / 2, y0 - 0.25, -0.12], [-W / 2, y0, z]); g.seg([W / 2, y0 - 0.25, -0.12], [W / 2, y0, z]);
  g.seg([-W / 2, y0 - 0.25, -0.12], [-W / 2 + 0.2, y0 - 0.25, -0.12]); g.seg([W / 2, y0 - 0.25, -0.12], [W / 2 - 0.2, y0 - 0.25, -0.12]);
});
model('wall', function (g) { g.box(0, 0.15, 0, 2.4, 0.3, 0.06); });

const SCRIPT: [string, number][] = [['F', 3.2], ['L', 1.0], ['F', 3.2], ['L', 1.0], ['F', 3.2], ['L', 1.0], ['F', 3.2], ['L', 1.0], ['S', 1.2]];
const SCRIPT_T = SCRIPT.reduce((a, c) => a + c[1], 0);
function cmdAt(t: number) { t = ((t % SCRIPT_T) + SCRIPT_T) % SCRIPT_T; for (let i = 0, a = 0; i < SCRIPT.length; i++) { a += SCRIPT[i][1]; if (t < a) return { c: SCRIPT[i][0], i: i }; } return { c: 'S', i: 8 }; }
const ARW: Record<string, string> = { F: '\u2191 fwd', L: '\u2190 left', R: '\u2192 right', S: '\u25A0 stop' };
export class WebEra implements Scene {
  [k: string]: any;
  t = 0; hist = new History(200);
  constructor() {
   this.t = 0; this.hist = new History(200); this.x = -0.72; this.z = -0.72; this.yaw = Math.PI / 2; this.v = 0; this.w = 0; this.odo = 0; this.cmds = 0; this.lastI = -1; this.step(0); 
  }
  lat(t: any) { return 0.18 + 0.07 * Math.sin(t * 0.9) + 0.04 * Math.sin(t * 2.7 + 1) + 0.03 * Math.sin(t * 7.1); }
  step(dt: any) {
    let t = (this.t += dt), self = this, L = this.lat(t), issued = cmdAt(t), applied = cmdAt(t - L);
    if (applied.i !== this.lastI) { this.cmds++; if (applied.c === 'S') { this.x = -0.72; this.z = -0.72; this.yaw = Math.PI / 2; } if (this.lastC === 'L') this.yaw = Math.round(this.yaw / (Math.PI / 2)) * (Math.PI / 2); this.lastI = applied.i; this.lastC = applied.c; }
    let tv = applied.c === 'F' ? 0.45 : 0, tw = applied.c === 'L' ? Math.PI / 2 : 0;
    this.v += (tv - this.v) * (1 - Math.exp(-dt * 12)); this.w += (tw - this.w) * (1 - Math.exp(-dt * 12));
    this.yaw += this.w * dt; this.x += Math.sin(this.yaw) * this.v * dt; this.z += Math.cos(this.yaw) * this.v * dt; this.odo += this.v * dt;
    this.cmd = applied.c; this.issued = issued.c; this.L = L;
    this.ringR = ((t % 1.2) / 1.2) * 1.6;
    this.m = { speed: this.v, heading: ((deg(this.yaw) % 360) + 360) % 360, lat: L * 1000, odo: this.odo };
    this.hist.tick(dt, function () { return self.L * 1000; }, function () { return self.v * 100; });
  }
  metrics() {
    let m = this.m;
    return [
      { k: 'speed', label: 'Speed', value: fmt(m.speed, 2), unit: 'm/s', frac: m.speed / 0.6, kind: 'ring', note: 'wheel odometry' },
      { k: 'lane', label: 'Heading', value: fmt(m.heading, 0).padStart(3, '0'), unit: '\u00B0', frac: wrapPi(this.yaw) / Math.PI, kind: 'center', note: 'turn rate ' + fmt(deg(this.w), 0) + ' \u00B0/s' },
      { k: 'ttc', label: 'Command', value: ARW[this.cmd], unit: '', frac: 0, kind: 'plain', note: 'browser sent ' + ARW[this.issued].split(' ')[1] },
      { k: 'gap', label: 'Link latency', value: fmt(m.lat, 0), unit: 'ms', frac: m.lat / 400, kind: 'bar', warn: m.lat > 280, note: 'modelled network delay' },
      { k: 'tracked', label: 'Odometry', value: fmt(m.odo, 1), unit: 'm', frac: (m.odo % 10) / 10, kind: 'bar', note: this.cmds + ' commands applied' }
    ];
  }
  chart = { a: { label: 'Latency', unit: 'ms', max: 400 }, b: { label: 'Speed', unit: 'cm/s', max: 60 } };
  objects(): Item[] {
    let out: any[] = [{ id: 'wbot', m: 'wbot', p: [this.x, 0, this.z], yaw: this.yaw, cls: 'ego' }], cmd = this.cmd;
    out.push({ id: 'bgi', m: 'bgi', p: [0.1, 0, -1.7], yaw: 0, s: 0.75, cls: 'static' });
    out.push({ id: 'pad', m: 'padframe', p: [1.25, 0, -0.9], yaw: Math.PI, s: 0.7, cls: 'world' });
    ([['arr_f', 0, 0.24, 'F'], ['arr_l', 0.24, 0, 'L'], ['arr_r', -0.24, 0, 'R'], ['arr_s', 0, 0, 'S']] as any[]).forEach(function (a) { out.push({ id: a[0], m: a[0], p: [1.25 - a[1] * 0.7, 0, -0.9 - a[2] * 0.7], yaw: Math.PI, s: 0.7, cls: cmd === a[3] ? 'active' : 'world' }); });
    out.push({ id: 'w1', m: 'wall', p: [0, 0, 1.45], cls: 'static' }); out.push({ id: 'w2', m: 'wall', p: [-1.5, 0, 0], yaw: Math.PI / 2, cls: 'static' });
    let sq = [[-0.72, -0.72], [-0.72, 0.72], [0.72, 0.72], [0.72, -0.72]], seg: number[] = [];
    sq.forEach(function (p, i) { let q = sq[(i + 1) % 4]; for (let k = 0; k < 10; k += 2) seg.push(p[0] + (q[0] - p[0]) * k / 10, 0.003, p[1] + (q[1] - p[1]) * k / 10, p[0] + (q[0] - p[0]) * (k + 1) / 10, 0.003, p[1] + (q[1] - p[1]) * (k + 1) / 10); });
    out.push({ id: 'route', seg: new Float32Array(seg), cls: 'path', a: 0.55 });
    out.push({ id: 'lidar', m: 'ring', p: [this.x, 0.01, this.z], s: Math.max(0.01, this.ringR), cls: 'ring', a: 0.6 * (1 - this.ringR / 1.6) });
    return out;
  }
  labels() { return [{ id: 'cmd', p: [this.x, 0.62, this.z], text: 'CMD ' + ARW[this.cmd].split(' ')[0] + ' +' + fmt(this.L * 1000, 0) + ' ms' }]; }
  cam() { return { focus: [this.x * 0.6, 0.18, this.z * 0.6], fwd: [0, -1], dist: 4.4, height: 2.1, fov: 30, ahead: 0, side: 0.32 }; }
  ground = { mode: 0, minor: 0.25, major: 1, fade: 7, amp: 0, glowR: 0.6 };
  ring() { return { x: this.x, z: this.z, r: this.ringR, a: 1 - this.ringR / 1.6, w: 0.08 }; }
  describe() { return 'A small wheeled robot drives a square, following arrow-key commands sent from a web page with a modelled network delay. A Turbo C style wireframe window stands behind it.'; }
}
