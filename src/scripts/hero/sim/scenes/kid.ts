/* Kid's computer scene (1995): beige PC typing DOS and BASIC. */
import { model } from '../geo';
import { TAU, clamp, fmt } from '../math';
import { History } from '../history';
import type { Item, Scene } from '../types';

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
  let p: number[][] = [], cx = 0, cy = 1.11, w = 0.17, h = 0.135, r = 0.02, z = 0.111;
  [[w - r, h - r, 0], [-w + r, h - r, 0.25], [-w + r, -h + r, 0.5], [w - r, -h + r, 0.75]].forEach(function (c) { for (let i = 0; i <= 4; i++) { let a = (c[2] + i / 16) * TAU; p.push([cx + c[0] + Math.cos(a) * r, cy + c[1] + Math.sin(a) * r, z]); } });
  g.poly(p, true);
});
model('crtscreen', function (g) { let z = 0.11; g.quad([-0.17, 0.975, z], [0.17, 0.975, z], [0.17, 1.245, z], [-0.17, 1.245, z]); });
model('kbd', function (g) {
  g.box(0, 0.765, 0.32, 0.46, 0.03, 0.16, { tz: 0.9, tdz: -0.01 });
  for (let r = 0; r < 4; r++) g.seg([-0.21, 0.781, 0.26 + r * 0.035], [0.21, 0.781, 0.26 + r * 0.035]);
  for (let c = 0; c < 14; c++) g.seg([-0.21 + c * 0.0323, 0.781, 0.255], [-0.21 + c * 0.0323, 0.781, 0.37]);
});
model('manual', function (g) { g.box(0, 0.77, 0, 0.2, 0.035, 0.26, { ry: 0.25 }); g.box(0.02, 0.795, 0.02, 0.19, 0.02, 0.25, { ry: 0.32 }); });
model('mouse', function (g) { g.box(0, 0.765, 0, 0.06, 0.03, 0.1, { tx: 0.7, tz: 0.8 }); g.seg([0, 0.78, 0.05], [0, 0.8, 0.12]); });
model('cursor', function (g) { let w = 0.009, h = 0.004; g.quad([0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0]); g.rect([[0, 0, 0], [w, 0, 0], [w, h, 0], [0, h, 0]]); });

const GLYPH: Record<string, number[][]> = {
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
let TEXT = ['C:\\>DIR', 'C:\\>CD GAMES', 'C:\\GAMES>QBASIC', '10 PRINT "HOW DOES IT WORK"', '20 GOTO 10', 'RUN'];
export class KidEra implements Scene {
  [k: string]: any;
  t = 0; hist = new History(200);
  recent: number[] = [];
  constructor() {
   this.t = 0; this.hist = new History(200); this.keys = 0; this.typed = 0; this.loopT = 0; this.cps = 0; this.recent = []; this.step(0); 
  }
  step(dt: any) {
    let t = (this.t += dt), self = this; this.loopT += dt;
    let total = TEXT.join('').length, lt = this.loopT, prevTyped = this.typed;
    // typing schedule: ~7 chars/s with a pause after each line, 3 s pause at the end, then the screen clears
    let n = 0, tt = 0.6, done = false;
    for (let li = 0; li < TEXT.length && !done; li++) { for (let ci = 0; ci < TEXT[li].length; ci++) { let gap = 0.11 + 0.06 * Math.sin((li * 31 + ci) * 1.7) * Math.sin((li * 31 + ci) * 0.37); tt += gap; if (tt > lt) { done = true; break; } n++; } if (!done) { tt += 0.9; if (tt > lt) done = true; } }
    this.typed = n;
    if (n === total && lt > tt + 3) { this.loopT = 0; this.typed = 0; }
    if (this.typed > prevTyped) { this.keys += this.typed - prevTyped; for (let k = 0; k < this.typed - prevTyped; k++) this.recent.push(t); }
    this.recent = this.recent.filter(function (x) { return t - x < 2; }); this.cps = this.recent.length / 2;
    this.blink = (t % 0.53) < 0.265;
    let lines = 0, c = this.typed; TEXT.forEach(function (L) { if (c >= L.length) { lines++; c -= L.length; } else c = 0; });
    this.m = { keys: this.keys, lines: lines, cps: this.cps };
    this.hist.tick(dt, function () { return self.cps; }, function () { return self.blink ? 1 : 0; });
  }
  metrics() {
    let m = this.m;
    return [
      { k: 'speed', label: 'Keystrokes', value: String(m.keys), unit: 'keys', frac: (m.keys % 100) / 100, kind: 'ring', note: 'since this page opened' },
      { k: 'lane', label: 'Typing rate', value: fmt(m.cps, 1), unit: 'chars/s', frac: clamp(m.cps / 10, -1, 1), kind: 'center', note: 'over the last 2 s' },
      { k: 'ttc', label: 'Cursor', value: this.blink ? 'ON' : 'OFF', unit: '', frac: this.blink ? 1 : 0, kind: 'bar', note: 'blinks about twice a second' },
      { k: 'gap', label: 'Lines on screen', value: String(m.lines), unit: '/ 25', frac: m.lines / 25, kind: 'bar', note: '80 \u00D7 25 text mode' },
      { k: 'tracked', label: 'Manuals read', value: '3', unit: '', frac: 1, kind: 'dots', n: 3, note: 'DOS, Windows 3.1, Windows 98' }
    ];
  }
  chart = { a: { label: 'Chars/s', unit: '', max: 10 }, b: { label: 'Cursor', unit: '', max: 4 } };
  objects(): Item[] {
    let out: any[] = [{ id: 'desk', m: 'desk', p: [0, 0, 0], cls: 'static' }, { id: 'pc', m: 'pc', p: [-0.15, 0, -0.05], cls: 'ego' }, { id: 'scr', m: 'crtscreen', p: [-0.15, 0, -0.05], cls: 'screen' },
      { id: 'kbd', m: 'kbd', p: [-0.15, 0, 0], cls: 'ego' }, { id: 'man', m: 'manual', p: [0.42, 0, 0.1], cls: 'agent' }, { id: 'mouse', m: 'mouse', p: [0.2, 0, 0.3], cls: 'agent' }];
    let seg: number[] = [], sc = 0.0042, x0 = -0.15 - 0.155, y0 = 1.225, z = 0.062, c = this.typed, cx = x0, cy = y0, li: number;
    for (li = 0; li < TEXT.length; li++) {
      let L = TEXT[li], k = Math.min(c, L.length); c -= k;
      for (let i = 0; i < k; i++) { let gl = GLYPH[L[i]] || []; gl.forEach(function (q) { seg.push(x0 + i * 3 * sc + q[0] * sc, y0 - li * 0.03 + q[1] * sc, z, x0 + i * 3 * sc + q[2] * sc, y0 - li * 0.03 + q[3] * sc, z); }); }
      cx = x0 + k * 3 * sc; cy = y0 - li * 0.03;
      if (k < L.length) break;
      if (li === TEXT.length - 1) { cx = x0; cy = y0 - (li + 1) * 0.03; }
    }
    if (this.typed === TEXT.join('').length) for (let r = 0; r < 2; r++) { let s = 'HOW DOES IT WORK'; for (let j = 0; j < s.length; j++) (GLYPH[s[j]] || []).forEach(function (q) { seg.push(x0 + j * 3 * sc + q[0] * sc, cy - r * 0.03 + q[1] * sc, z, x0 + j * 3 * sc + q[2] * sc, cy - r * 0.03 + q[3] * sc, z); }); }
    out.push({ id: 'text', seg: new Float32Array(seg), cls: 'path' });
    out.push({ id: 'cur', m: 'cursor', p: [cx, cy - 0.004, z], cls: 'active', a: this.blink ? 1 : 0 });
    return out;
  }
  labels() { return [{ id: 'crt', p: [-0.15, 1.42, 0], text: 'BEIGE PC, 80\u00D725' }]; }
  cam() { return { focus: [-0.05, 0.98, 0.05], fwd: [0, -1], dist: 3.0, height: 0.75, fov: 30, ahead: 0, side: 0.5 }; }
  ground = { mode: 0, minor: 0.3, major: 1.5, fade: 7, amp: 0, glowR: 0.7 };
  ring() { return null; }
  describe() { return 'A beige desktop computer with a CRT monitor sits on a desk next to a DOS manual. A cursor blinks while short commands and a BASIC program are typed out.'; }
}
