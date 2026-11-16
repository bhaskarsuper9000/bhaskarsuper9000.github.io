/* Small numeric helpers shared by every scene. */
export const TAU = Math.PI * 2;
export const DT = 1 / 60;
export function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
export function sstep(a: number, b: number, x: number) { let t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
export function deg(r: number) { return r * 180 / Math.PI; }
export function wrapPi(a: number) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
export function fmt(v: number, d: number) { return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
export function ttcText(t: number) { return isFinite(t) ? fmt(Math.min(t, 99), 1) : '\u221E'; }

