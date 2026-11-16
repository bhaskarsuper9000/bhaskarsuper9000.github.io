/* Oracle scene (2015): server rack and a terminal scrolling script output. */
import { model } from '../geo';
import { fmt } from '../math';
import { History } from '../history';
import { rot } from '../camera';
import type { CamSpec, Ground, Item, Label, Metric, Scene } from '../types';

model('rack', function (g) {
  g.box(0, 1.0, 0, 0.6, 2.0, 0.8);
  for (let u = 0; u < 12; u++) { const y = 0.18 + u * 0.15; g.rect([[-0.27, y, 0.401], [0.27, y, 0.401], [0.27, y + 0.11, 0.401], [-0.27, y + 0.11, 0.401]]); }
});
model('led', function (g) { const w = 0.02; g.quad([0, 0, 0], [w, 0, 0], [w, w * 0.6, 0], [0, w * 0.6, 0]); });
model('term', function (g) {
  g.box(0, 0.73, 0, 1.0, 0.04, 0.55);
  [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]].forEach(function (p) { g.box(p[0], 0.355, p[1], 0.04, 0.71, 0.04); });
  g.box(0, 1.03, -0.05, 0.52, 0.34, 0.03); g.box(0, 0.8, -0.05, 0.05, 0.12, 0.05); g.box(0, 0.755, -0.05, 0.2, 0.01, 0.14);
  g.box(0, 0.76, 0.15, 0.4, 0.02, 0.13);
});
model('termscreen', function (g) { const z = -0.034; g.quad([-0.24, 0.875, z], [0.24, 0.875, z], [0.24, 1.185, z], [-0.24, 1.185, z]); });
/** Generic office scene for the Oracle months: a server rack and a terminal scrolling script output. */
export class OracleEra implements Scene {
  [k: string]: any;
  t = 0; hist = new History(200);
  leds: boolean[] = [];
  constructor() { this.t = 0; this.hist = new History(200); this.lines = 0; this.runs = 0; this.step(0); }
  step(dt: number) {
    const t = (this.t += dt), self = this;
    const nl = Math.floor(t * 3.2); if (nl > this.lines) { this.runs += nl - this.lines; this.lines = nl; }
    this.leds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (u) { return Math.sin(t * (2.1 + u * 0.37) + u * 1.7) > 0.2; });
    this.load = 0.45 + 0.25 * Math.sin(t * 0.7) + 0.1 * Math.sin(t * 2.3);
    this.hist.tick(dt, function () { return self.load * 100; }, function () { return self.leds.filter(Boolean).length; });
  }
  metrics(): Metric[] {
    const on = this.leds.filter(Boolean).length;
    return [
      { k: 'speed', label: 'Script lines', value: String(this.lines), unit: 'lines', frac: (this.lines % 100) / 100, kind: 'ring', note: 'printed since this page opened' },
      { k: 'lane', label: 'Rack load', value: fmt(this.load * 100, 0), unit: '%', frac: this.load * 2 - 1, kind: 'center', note: 'a made-up toy load curve' },
      { k: 'ttc', label: 'Activity LEDs', value: String(on), unit: '/ 12', frac: on / 12, kind: 'bar', note: 'one per rack unit' },
      { k: 'gap', label: 'Uptime', value: fmt(this.t, 0), unit: 's', frac: (this.t % 60) / 60, kind: 'bar', note: 'of this toy scene' },
      { k: 'tracked', label: 'Work', value: 'CRM', unit: '', frac: 1, kind: 'plain', note: 'cloud CRM scripts and add-ins' }
    ];
  }
  chart = { a: { label: 'Load', unit: '%', max: 100 }, b: { label: 'LEDs', unit: '', max: 12 } };
  objects(): Item[] {
    const out: Item[] = [{ id: 'rack', m: 'rack', p: [0.75, 0, -0.3], yaw: -0.35, cls: 'static' }, { id: 'term', m: 'term', p: [-0.35, 0, 0.2], yaw: 0.15, cls: 'ego' }, { id: 'scr', m: 'termscreen', p: [-0.35, 0, 0.2], yaw: 0.15, cls: 'screen' }];
    this.leds.forEach(function (on: boolean, u: number) { if (!on) return; const q = rot([0.2, 0.22 + u * 0.15, 0.402], -0.35, 0, 0); out.push({ id: 'led' + u, m: 'led', p: [0.75 + q[0], q[1], -0.3 + q[2]], yaw: -0.35, cls: 'active' }); });
    const seg: number[] = [], rows = 9, top = 1.17, x0 = -0.22;
    for (let r = 0; r < rows; r++) {
      const n = this.lines - rows + 1 + r; if (n < 0) continue;
      const len = 0.08 + 0.3 * ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1, y = top - r * 0.033;
      const a = rot([x0, y, -0.032], 0.15, 0, 0), b = rot([x0 + 0.03, y, -0.032], 0.15, 0, 0), c = rot([x0 + 0.045, y, -0.032], 0.15, 0, 0), d = rot([x0 + 0.045 + len, y, -0.032], 0.15, 0, 0);
      seg.push(a[0] - 0.35, a[1], a[2] + 0.2, b[0] - 0.35, b[1], b[2] + 0.2, c[0] - 0.35, c[1], c[2] + 0.2, d[0] - 0.35, d[1], d[2] + 0.2);
    }
    out.push({ id: 'text', seg: new Float32Array(seg), cls: 'path' });
    return out;
  }
  labels(): Label[] { return [{ id: 'rack', p: [0.75, 2.2, -0.3], text: 'RACK, 12U' }]; }
  cam(): CamSpec { return { focus: [0.2, 0.95, 0], fwd: [0, -1], dist: 6.2, height: 1.3, fov: 30, ahead: 0, side: 0.5 }; }
  ground: Ground = { mode: 0, minor: 0.3, major: 1.5, fade: 7, amp: 0, glowR: 0.7 };
  ring() { return null; }
  describe() { return 'A server rack with blinking activity lights stands next to a terminal where short script output scrolls by.'; }
}
