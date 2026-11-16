/* Camera rig and projection, shared by both renderers. */
import { TAU } from './math';
import type { Cam, Scene, Vec3 } from './types';

/* ax, ay: where the focus should sit on screen, as offsets from the centre in fractions of width/height (+x right, +y down) */
export function camera(era: Scene, t: number, ptr: { x: number; y: number } | null, ax: number, ay: number, aspect: number): Cam {
  let c = era.cam(), f = c.fwd, th = c.side + 0.1 * Math.sin(t * TAU / 50) + (ptr ? ptr.x * 0.07 : 0);
  let bx = -f[0], bz = -f[1], cs = Math.cos(th), sn = Math.sin(th), ox = bx * cs - bz * sn, oz = bx * sn + bz * cs;
  let h = c.height * (1 + (ptr ? -ptr.y * 0.06 : 0) + 0.03 * Math.sin(t * TAU / 70));
  let pos = [c.focus[0] + ox * c.dist, c.focus[1] + h, c.focus[2] + oz * c.dist];
  let tgt = [c.focus[0] + f[0] * c.ahead, c.focus[1], c.focus[2] + f[1] * c.ahead];
  let B = basis({ pos: pos, target: tgt }), D = Math.hypot(tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]);
  let tv = Math.tan(c.fov * Math.PI / 360), kx = (ax || 0) * 2 * tv * (aspect || 1.6) * D, ky = (ay || 0) * 2 * tv * D;
  for (let i = 0; i < 3; i++) tgt[i] += -B.r[i] * kx + B.u[i] * ky;
  return { pos: pos, target: tgt, fov: c.fov };
}
function basis(cam: { pos: Vec3; target: Vec3 }) {
  let f = [cam.target[0] - cam.pos[0], cam.target[1] - cam.pos[1], cam.target[2] - cam.pos[2]], l = Math.hypot(f[0], f[1], f[2]); f = [f[0] / l, f[1] / l, f[2] / l];
  let r = [f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0]; l = Math.hypot(r[0], r[1], r[2]); r = [r[0] / l, r[1] / l, r[2] / l];
  let u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return { f: f, r: r, u: u };
}
/* rotate a model-space vector by YXZ euler (three.js order) */
export function rot(v: Vec3, yaw: number, pitch: number, roll: number): Vec3 {
  let x = v[0], y = v[1], z = v[2], c: number, s: number, t: number;
  if (roll) { c = Math.cos(roll); s = Math.sin(roll); t = x * c - y * s; y = x * s + y * c; x = t; }
  if (pitch) { c = Math.cos(pitch); s = Math.sin(pitch); t = y * c - z * s; z = y * s + z * c; y = t; }
  if (yaw) { c = Math.cos(yaw); s = Math.sin(yaw); t = x * c + z * s; z = -x * s + z * c; x = t; }
  return [x, y, z];
}
export interface Projector { toCam(p: Vec3): Vec3; scr(c: Vec3): Vec3; project(p: Vec3): Vec3 | null; segment(a: Vec3, b: Vec3): [Vec3, Vec3] | null }
export function projector(cam: Cam, W: number, H: number): Projector {
  let B = basis(cam), F = (H / 2) / Math.tan(cam.fov * Math.PI / 360), P = cam.pos;
  function toCam(p: Vec3) { let d0 = p[0] - P[0], d1 = p[1] - P[1], d2 = p[2] - P[2]; return [d0 * B.r[0] + d1 * B.r[1] + d2 * B.r[2], d0 * B.u[0] + d1 * B.u[1] + d2 * B.u[2], d0 * B.f[0] + d1 * B.f[1] + d2 * B.f[2]]; }
  function scr(c: Vec3) { return [W / 2 + c[0] / c[2] * F, H / 2 - c[1] / c[2] * F, c[2]]; }
  return {
    toCam: toCam, scr: scr,
    project: function (p: Vec3) { let c = toCam(p); return c[2] > 0.05 ? scr(c) : null; },
    segment: function (a: Vec3, b: Vec3): [Vec3, Vec3] | null {   // clip to near plane
      let A = toCam(a), Bc = toCam(b), n = 0.05;
      if (A[2] < n && Bc[2] < n) return null;
      if (A[2] < n) { let t = (n - A[2]) / (Bc[2] - A[2]); A = [A[0] + (Bc[0] - A[0]) * t, A[1] + (Bc[1] - A[1]) * t, n]; }
      if (Bc[2] < n) { let t2 = (n - Bc[2]) / (A[2] - Bc[2]); Bc = [Bc[0] + (A[0] - Bc[0]) * t2, Bc[1] + (A[1] - Bc[1]) * t2, n]; }
      return [scr(A), scr(Bc)];
    }
  };
}
