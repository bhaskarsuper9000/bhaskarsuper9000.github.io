/** Two series sampled at 10 Hz, 20 s ring buffer, for the streaming chart. */
export class History {
  a: Float32Array; b: Float32Array; i = 0; acc = 0;
  constructor(public n: number) { this.a = new Float32Array(n).fill(NaN); this.b = new Float32Array(n).fill(NaN); }
  push(a: number, b: number) { this.a[this.i] = a; this.b[this.i] = b; this.i = (this.i + 1) % this.n; }
  tick(dt: number, fa: () => number, fb: () => number) { this.acc += dt; while (this.acc >= 0.1) { this.acc -= 0.1; this.push(fa(), fb()); } }
}
