/** 2D-canvas line drawing of a scene: first paint, and the still for no-WebGL, reduced motion and ?static=1. */
import { bathy, models, projector, rot, type Cam, type Cls, type Item, type Scene, type Vec3 } from './sim';
import type { Palette } from './palette';

type Seg = [Vec3, Vec3];

export function draw2D(ctx: CanvasRenderingContext2D, era: Scene, cam: Cam, W: number, H: number, col: Palette, alpha = 1) {
  const pr = projector(cam, W, H), g = era.ground, focus = era.cam().focus;
  ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';

  // ground grid, cell by cell so it can fade with distance
  const R = Math.min(g.fade, g.minor * 70), x0 = Math.floor((focus[0] - R) / g.minor) * g.minor, z0 = Math.floor((focus[2] - R) / g.minor) * g.minor;
  const n = Math.ceil(2 * R / g.minor), gy = (x: number, z: number) => (g.amp ? bathy(x, z) : 0);
  ctx.strokeStyle = col.grid; ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) for (let j = 0; j < n; j++) for (let o = 0; o < 2; o++) {
    const xa = o ? x0 + i * g.minor : x0 + j * g.minor, za = o ? z0 + j * g.minor : z0 + i * g.minor, xb = o ? xa : xa + g.minor, zb = o ? za + g.minor : za;
    if (g.mode === 1 && o === 1 && ((xa / g.major) + Math.floor(za / g.minor) * 0.37) % 1 > 0.02 * g.major / g.minor) continue;
    const dm = Math.hypot((xa + xb) / 2 - focus[0], (za + zb) / 2 - focus[2]); if (dm > R) continue;
    const v = o ? xa : za, major = Math.abs(v / g.major - Math.round(v / g.major)) < 1e-6;
    const s = pr.segment([xa, gy(xa, za), za], [xb, gy(xb, zb), zb]); if (!s) continue;
    ctx.globalAlpha = alpha * (major ? 0.9 : 0.45) * (1 - dm / R);
    ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); ctx.lineTo(s[1][0], s[1][1]); ctx.stroke();
  }
  ctx.globalAlpha = alpha;

  const colFor = (c: Cls) => c === 'ego' ? col.ego : c === 'agent' ? col.agent : c === 'warn' ? col.warn : ['bbox', 'path', 'ring', 'active', 'screen'].includes(c) ? col.accent : col.world;
  const items = era.objects().map((it, i): [Item, number, number] => [it, it.cls === 'world' ? 1e9 : it.p ? pr.toCam(it.p)[2] : 0, i])
    .sort((a, b) => b[1] - a[1] || a[2] - b[2]).map((x) => x[0]);
  const stroke = (list: Seg[]) => { ctx.beginPath(); list.forEach((q) => { ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); }); ctx.stroke(); };

  for (const it of items) {
    const a = (it.a ?? 1) * alpha; if (a <= 0.01) continue;
    ctx.globalAlpha = a * (it.cls === 'world' ? 0.75 : it.cls === 'static' ? 0.8 : 1); ctx.strokeStyle = colFor(it.cls); ctx.lineWidth = it.cls === 'path' && it.strip ? 1.5 : 1;
    if (it.strip) {
      const st = it.strip; let first = true; ctx.beginPath();
      for (let k = 0; k < st.length / 3 - 1; k++) {
        const sg = pr.segment([st[k * 3], st[k * 3 + 1], st[k * 3 + 2]], [st[k * 3 + 3], st[k * 3 + 4], st[k * 3 + 5]]);
        if (!sg) { first = true; continue; }
        if (first) ctx.moveTo(sg[0][0], sg[0][1]); ctx.lineTo(sg[1][0], sg[1][1]); first = false;
      }
      ctx.stroke(); continue;
    }
    const M = it.seg ? { seg: it.seg, tri: null } : it.m ? models[it.m] : undefined; if (!M) continue;
    const sc = it.s ?? 1, P = it.p ?? [0, 0, 0];
    const W3 = (x: number, y: number, z: number): Vec3 => {
      if (it.seg) return [x, y, z];
      const v = rot([x * sc, y * sc, z * sc], it.yaw ?? 0, it.pitch ?? 0, it.roll ?? 0); return [v[0] + P[0], v[1] + P[1], v[2] + P[2]];
    };
    const S = M.seg, T = M.tri, solid = !!T && !['world', 'bbox', 'warn', 'ring'].includes(it.cls), base = ctx.globalAlpha;
    const cd = solid ? pr.toCam(P)[2] : 0, front: Seg[] = [], back: Seg[] = [];
    for (let e = 0; e < S.length; e += 6) {
      const sg = pr.segment(W3(S[e], S[e + 1], S[e + 2]), W3(S[e + 3], S[e + 4], S[e + 5])); if (!sg) continue;
      (solid && (sg[0][2] + sg[1][2]) / 2 > cd + 0.15 * sc ? back : front).push(sg); // approximate hidden lines
    }
    if (solid && T) {
      ctx.globalAlpha = base * 0.25; stroke(back); ctx.globalAlpha = base * 0.85;
      ctx.fillStyle = it.cls === 'active' || it.cls === 'screen' ? col.accentSoft : col.fill;
      const tris: [Vec3, Vec3, Vec3, number][] = [];
      for (let q = 0; q < T.length; q += 9) {
        const p1 = pr.project(W3(T[q], T[q + 1], T[q + 2])), p2 = pr.project(W3(T[q + 3], T[q + 4], T[q + 5])), p3 = pr.project(W3(T[q + 6], T[q + 7], T[q + 8]));
        if (p1 && p2 && p3) tris.push([p1, p2, p3, p1[2] + p2[2] + p3[2]]);
      }
      tris.sort((x, y) => y[3] - x[3]).forEach((t) => { ctx.beginPath(); ctx.moveTo(t[0][0], t[0][1]); ctx.lineTo(t[1][0], t[1][1]); ctx.lineTo(t[2][0], t[2][1]); ctx.closePath(); ctx.fill(); });
      ctx.globalAlpha = base;
    }
    stroke(front);
  }
  ctx.restore();
}
