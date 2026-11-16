/* Procedural geometry (triangle fills + line segments) and the model registry. Models are metres, y up, forward +z. */
import { TAU } from './math';
import type { Model } from './types';

type P = number[];
interface BoxOpts { tx?: number; tz?: number; tdz?: number; fz?: number; bz?: number; rx?: number; ry?: number; noFill?: boolean; noEdge?: boolean }
interface CylOpts { rot?: number; taper?: number; noFill?: boolean; ribs?: number; hub?: boolean }
/** Builds one model: triangle fills plus line segments, the format both renderers draw. */
export class Geo {
  t: number[] = [];
  s: number[] = [];
  tri(a: P, b: P, c: P) { this.t.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
  quad(a: P, b: P, c: P, d: P) { this.tri(a, b, c); this.tri(a, c, d); }
  seg(a: P, b: P) { this.s.push(a[0], a[1], a[2], b[0], b[1], b[2]); }
  poly(p: P[], closed?: boolean) { for (let i = 0; i < p.length - 1; i++) this.seg(p[i], p[i + 1]); if (closed) this.seg(p[p.length - 1], p[0]); }
  rect(p: P[]) { this.poly(p, true); }
  hull(Q: P[], o: BoxOpts = {}) {
    if (!o.noFill) for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) this.quad(Q[f[0]], Q[f[1]], Q[f[2]], Q[f[3]]);
    if (!o.noEdge) for (const e of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) this.seg(Q[e[0]], Q[e[1]]);
    return this;
  }
  /** Box centred at (cx,cy,cz). tx/tz scale the top face and tdz shifts it (windscreens); fz/bz scale the +z/-z faces; rx pitches, ry yaws. */
  box(cx: number, cy: number, cz: number, w: number, h: number, d: number, o: BoxOpts = {}) {
    const hw = w / 2, hh = h / 2, hd = d / 2, tx = o.tx ?? 1, tz = o.tz ?? 1, tdz = o.tdz ?? 0, fz = o.fz ?? 1, bz = o.bz ?? 1;
    const raw: P[] = [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd], [-hw * tx, hh, -hd * tz + tdz], [hw * tx, hh, -hd * tz + tdz], [hw * tx, hh, hd * tz + tdz], [-hw * tx, hh, hd * tz + tdz]]
      .map((p) => { const k = p[2] > 0 ? fz : bz; return [p[0] * k, p[1] * k, p[2]]; });
    const c = Math.cos(o.rx ?? 0), s = Math.sin(o.rx ?? 0), c2 = Math.cos(o.ry ?? 0), s2 = Math.sin(o.ry ?? 0);
    return this.hull(raw.map((p) => { const y = p[1] * c - p[2] * s, z = p[1] * s + p[2] * c, x = p[0]; return [cx + x * c2 + z * s2, cy + y, cz - x * s2 + z * c2]; }), o);
  }
  cyl(cx: number, cy: number, cz: number, r: number, l: number, ax: 'x' | 'y' | 'z', n = 10, o: CylOpts = {}) {
    const pt = (u: number, v: number, rr: number): P => { const a = rr * Math.cos(u), b = rr * Math.sin(u); return ax === 'x' ? [cx + v, cy + a, cz + b] : ax === 'y' ? [cx + a, cy + v, cz + b] : [cx + a, cy + b, cz + v]; };
    const A: P[] = [], B: P[] = [];
    for (let i = 0; i < n; i++) { const u = i / n * TAU + (o.rot ?? 0); A.push(pt(u, -l / 2, r)); B.push(pt(u, l / 2, r * (o.taper ?? 1))); }
    const ca = pt(0, -l / 2, 0), cb = pt(0, l / 2, 0);
    if (!o.noFill) for (let i = 0; i < n; i++) { const j = (i + 1) % n; this.quad(A[i], A[j], B[j], B[i]); this.tri(ca, A[j], A[i]); this.tri(cb, B[i], B[j]); }
    this.poly(A, true); this.poly(B, true);
    for (let i = 0; i < (o.ribs ?? 0); i++) { const k = Math.floor(i * n / (o.ribs ?? 1)); this.seg(A[k], B[k]); }
    if (o.hub) { const q = Math.floor(n / 4); this.seg(A[0], A[2 * q]); this.seg(A[q], A[3 * q]); this.seg(B[0], B[2 * q]); this.seg(B[q], B[3 * q]); }
    return this;
  }
}

const MODELS: Record<string, Model> = {};
export function model(key: string, fn: (g: Geo) => void) { let g = new Geo(); fn(g); MODELS[key] = { tri: new Float32Array(g.t), seg: new Float32Array(g.s) }; return MODELS[key]; }
export function getModel(key: string): Model | undefined { return MODELS[key]; }

/* corner-bracket bounding boxes, cached per size */
export function bboxModel(w: number, h: number, d: number) {
  let key = 'bb_' + w.toFixed(2) + '_' + h.toFixed(2) + '_' + d.toFixed(2);
  if (MODELS[key]) return key;
  model(key, function (g) {
    let hw = w / 2, hd = d / 2, k = Math.min(0.6, Math.min(w, h, d) * 0.3);
    [-1, 1].forEach(function (sx) { [0, 1].forEach(function (sy) { [-1, 1].forEach(function (sz) {
      let p = [sx * hw, sy * h, sz * hd];
      g.seg(p, [p[0] - sx * k, p[1], p[2]]);
      g.seg(p, [p[0], p[1] + (sy ? -k : k), p[2]]);
      g.seg(p, [p[0], p[1], p[2] - sz * k]);
    }); }); });
  });
  return key;
}

export { MODELS as models };
