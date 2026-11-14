/* Round 2 characters: 24x32 explorers drawn procedurally from a tiny rig
   (hips, knees, shoulders, elbows, head) so every frame in every direction is
   consistent. Walk = 6 frames with arm swing, knee bend and body bob;
   idle = breathe + blink. Selective outline ("sel-out") is applied last. */
(function (global) {
  'use strict';
  const W = 24, H = 32, TAU = Math.PI * 2;
  const { light } = PX;

  class Buf {
    constructor() { this.c = new Int32Array(W * H).fill(-1); }
    p(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H || c === undefined) return; this.c[y * W + x] = c; }
    get(x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? -1 : this.c[y * W + x]; }
    rect(x0, y0, x1, y1, c) { for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) this.p(x, y, c); }
    ell(cx, cy, rx, ry, fn) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy > 1) continue;
        const c = typeof fn === 'function' ? fn(x, y, dx, dy) : fn; if (c !== null && c !== undefined) this.p(x, y, c);
      }
    }
    // thick segment: shade colour first, then base colour offset toward the light (top-left)
    limb(x0, y0, x1, y1, w, c, cs) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
      for (const [col, ww] of [[cs, w], [c, w - 1]]) {
        if (ww <= 0) continue;
        for (let i = 0; i <= n; i++) {
          const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
          const bx = Math.round(x - w / 2), by = Math.round(y - 0.5);
          for (let yy = 0; yy < (ww === w ? 1 : 1); yy++) for (let xx = 0; xx < ww; xx++) this.p(bx + xx, by + yy, col);
        }
      }
    }
    outline() {
      const out = this.c.slice();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (this.c[y * W + x] >= 0) continue;
        let best = -1, bl = 1e9;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = this.get(x + dx, y + dy); if (n < 0) continue;
          const l = ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255); if (l < bl) { bl = l; best = n; }
        }
        if (best >= 0) out[y * W + x] = light(best, 0.38);
      }
      this.c = out;
    }
    canvas() {
      const [cv, ctx] = PX.canvas(W, H), img = ctx.createImageData(W, H);
      for (let i = 0; i < W * H; i++) { const c = this.c[i]; if (c < 0) continue; img.data[i * 4] = (c >> 16) & 255; img.data[i * 4 + 1] = (c >> 8) & 255; img.data[i * 4 + 2] = c & 255; img.data[i * 4 + 3] = 255; }
      ctx.putImageData(img, 0, 0); return cv;
    }
  }

  const VARIANTS = [
    { name: 'Cap', desc: 'Red cap, blue tee', style: 'cap',
      skin: 0xc98d63, hair: 0x2a211d, shirt: 0x3a78c9, shorts: 0x4b4f5c, shoe: 0xe8e1d4, extra: 0xd63b30 },
    { name: 'Braid', desc: 'Long braid, yellow frock', style: 'braid',
      skin: 0xb97c55, hair: 0x221b19, shirt: 0xf0b93a, shorts: 0x2a9d8f, shoe: 0x7a3b2a, extra: 0xd8402f },
    { name: 'Specs', desc: 'Glasses, green tee', style: 'specs',
      skin: 0xd7a07a, hair: 0x3a2a22, shirt: 0x4caf50, shorts: 0xb09a6a, shoe: 0x3a3a3a, extra: 0x16161a },
    { name: 'Curls', desc: 'Curly hair, orange tee', style: 'curls',
      skin: 0x9a6440, hair: 0x1b1512, shirt: 0xef7d3c, shorts: 0x2c3e66, shoe: 0xe6e6e6, extra: 0x000000 },
  ];

  // pose: { ph (0..1 walk phase), walk (bool), br (breath 0/1), blink (bool) }
  function draw(v, dir, pose) {
    const b = new Buf();
    const s = Math.sin(TAU * pose.ph), co = Math.cos(TAU * pose.ph);
    const bob = pose.walk ? (Math.abs(s) > 0.6 ? 0 : -1) : 0;
    const br = pose.br || 0;
    const K = { s: v.skin, sS: light(v.skin, 0.8), sH: light(v.skin, 1.08), h: v.hair, hH: PX.mix(v.hair, 0x7a6658, 0.38), t: v.shirt, tH: light(v.shirt, 1.18), tS: light(v.shirt, 0.74),
      p: v.shorts, pS: light(v.shorts, 0.75), f: v.shoe, fS: light(v.shoe, 0.72), e: 0x24180f, x: v.extra, xS: light(v.extra, 0.7) };

    if (dir === 'side') {
      const hipY = 21 + bob, th = pose.walk ? s * 0.5 : 0;
      const leg = (theta, bend, dark) => {
        const k = dark ? 0.8 : 1, hx = 12, kx = hx + Math.sin(theta) * 4.2, ky = hipY + Math.cos(theta) * 4.2;
        const ax = kx + Math.sin(theta - bend) * 4.4, ay = ky + Math.cos(theta - bend) * 4.4;
        b.limb(hx, hipY, kx, ky, 3, light(K.s, k), light(K.sS, k));
        b.limb(kx, ky, ax, ay, 3, light(K.s, k), light(K.sS, k));
        const fy = Math.min(30, Math.round(ay)), fx = Math.round(ax);
        b.rect(fx - 1, fy, fx + 2, fy + 1, light(K.f, k)); b.rect(fx - 1, fy + 1, fx + 2, fy + 1, light(K.fS, k));
      };
      const bendA = pose.walk ? 1.0 * Math.max(0, co) : 0, bendB = pose.walk ? 1.0 * Math.max(0, -co) : 0;
      const arm = (alpha, dark) => {
        const k = dark ? 0.78 : 1, sx = 12, sy = 16 + bob - br;
        const ex = sx + Math.sin(alpha) * 3.4, ey = sy + Math.cos(alpha) * 3.4;
        const hx = ex + Math.sin(alpha + 0.45) * 3.2, hy = ey + Math.cos(alpha + 0.45) * 3.2;
        b.limb(sx, sy, ex, ey, 3, light(K.t, k), light(K.tS, k));
        b.limb(ex, ey, hx, hy, 2, light(K.s, k), light(K.sS, k));
        b.rect(Math.round(hx - 1), Math.round(hy), Math.round(hx), Math.round(hy) + 1, light(K.s, k));
      };
      // far side first
      leg(-th, bendB, true); arm(th * 0.9, true);
      // shorts + torso
      b.rect(9, hipY - 2, 15, hipY + 1, K.p); b.rect(15, hipY - 2, 15, hipY + 1, K.pS); b.rect(9, hipY + 1, 15, hipY + 1, K.pS);
      leg(th, bendA, false);
      b.rect(9, 15 + bob - br, 15, hipY - 2, K.t); b.rect(9, 15 + bob - br, 9, hipY - 2, K.tH); b.rect(15, 16 + bob - br, 15, hipY - 2, K.tS);
      b.rect(10, 15 + bob - br, 13, 15 + bob - br, K.tH);
      if (v.style === 'braid') { b.rect(9, hipY - 3, 15, hipY + 2, K.p); b.rect(9, hipY + 2, 15, hipY + 2, K.pS); }
      arm(-th * 0.9, false);
      // head
      const hy = 9.5 + bob - br, hx = 12.5;
      b.rect(11, hy + 4, 13, hy + 5.5, K.sS); // neck
      b.ell(hx, hy, 4.7, 4.9, (x, y, dx, dy) => {
        const back = x < 13 - (y > hy + 2 ? 1 : 0), top = y < hy - 1.6;
        if (back || top) return (dx < -0.2 && dy < -0.2) ? K.hH : K.h;
        return dx > 0.55 || dy > 0.6 ? K.sS : K.s;
      });
      b.p(17, Math.round(hy + 1), K.s); b.p(17, Math.round(hy + 2), K.sS);   // nose
      b.rect(11, Math.round(hy + 0.5), 11, Math.round(hy + 1.5), K.sS);     // ear
      if (pose.blink) b.rect(15, Math.round(hy + 1), 16, Math.round(hy + 1), K.e);
      else { b.rect(15, Math.round(hy), 15, Math.round(hy + 1), K.e); b.p(16, Math.round(hy), 0xffffff); }
      b.p(15, Math.round(hy + 3), K.sS);
      if (v.style === 'cap') { b.ell(hx - 0.5, hy - 2, 5, 3.2, (x, y) => y < hy - 1 ? (y < hy - 3 ? light(K.x, 1.12) : K.x) : null); b.rect(14, Math.round(hy - 1), 19, Math.round(hy - 1), K.xS); }
      if (v.style === 'braid') { b.rect(8, hy + 1, 9, hy + 10, K.h); b.p(8, Math.round(hy + 11), K.x); b.p(9, Math.round(hy + 11), K.x); b.rect(9, hy + 1, 9, hy + 9, K.hH); }
      if (v.style === 'specs') { const ey = Math.round(hy); b.rect(14, ey - 1, 17, ey - 1, K.x); b.rect(14, ey + 2, 17, ey + 2, K.x); b.rect(17, ey - 1, 17, ey + 2, K.x); b.rect(12, ey, 13, ey, K.x); }
      if (v.style === 'curls') b.ell(hx - 1, hy - 1.5, 5.4, 4.4, (x, y, dx, dy) => (x < 14 || y < hy - 1.5) ? ((PX.hash(x, y, 5) > 0.72 && dy < 0) ? K.hH : K.h) : null);
      if (pose.walk && 0) b.p(0, 0, 0);
    } else {
      const front = dir === 'down', hipY = 22 + bob;
      const liftA = pose.walk ? Math.max(0, Math.round(s * 2.2)) : 0, liftB = pose.walk ? Math.max(0, Math.round(-s * 2.2)) : 0;
      // legs
      const legF = (x, lift) => {
        b.limb(x, hipY + 1, x, 29 - lift, 3, K.s, K.sS);
        b.rect(x - 1.5, 30 - lift, x + 1.5, 30 - lift, K.f); b.rect(x - 1.5, 31 - lift, x + 1.5, 31 - lift, K.fS);
      };
      legF(10, front ? liftA : liftB); legF(14, front ? liftB : liftA);
      // shorts / frock
      const skirt = v.style === 'braid';
      b.rect(8, hipY - 1, 15, hipY + (skirt ? 3 : 2), K.p); b.rect(15, hipY - 1, 15, hipY + (skirt ? 3 : 2), K.pS);
      if (skirt) { b.rect(7, hipY + 2, 16, hipY + 3, K.p); b.rect(7, hipY + 3, 16, hipY + 3, K.pS); } else b.p(12, hipY + 2, -1);
      // torso
      const ty = 15 + bob - br;
      b.rect(8, ty, 15, hipY - 1, K.t); b.rect(7, ty + 1, 16, ty + 3, K.t);
      b.rect(8, ty, 9, hipY - 1, K.tH); b.rect(7, ty + 1, 7, ty + 3, K.tH); b.rect(15, ty + 1, 16, hipY - 1, K.tS); b.rect(8, hipY - 1, 15, hipY - 1, K.tS);
      if (front) { b.p(11, ty, K.sS); b.p(12, ty, K.sS); b.p(11, ty + 1, K.s); b.p(12, ty + 1, K.s); }
      // arms: the one swinging forward rises and foreshortens
      const armF = (sx, sw, left) => {
        const fwd = front ? sw : -sw;
        const hy = ty + 7 - Math.max(0, fwd) * 2.4 + Math.max(0, -fwd) * 0.2;
        const hx = sx + (left ? -0.3 : 0.3) + (fwd > 0 ? (left ? 0.8 : -0.8) * fwd : 0);
        b.limb(sx, ty + 1.5, sx + (hx - sx) * 0.4, ty + 3.5, 3, K.t, K.tS);
        b.limb(sx + (hx - sx) * 0.4, ty + 3.5, hx, hy, 2, K.s, K.sS);
        b.rect(Math.round(hx - 1), Math.round(hy), Math.round(hx), Math.round(hy) + 1, K.s);
      };
      const sw = pose.walk ? s : 0;
      armF(6.5, -sw, true); armF(17.5, sw, false);
      // head
      const hy = 9.5 + bob - br, hx = 12;
      b.rect(10, hy + 4, 13, hy + 5.5, K.sS);
      b.ell(hx, hy, 4.9, 4.9, (x, y, dx, dy) => {
        if (!front) return (dx < -0.3 && dy < 0) ? K.hH : (dy > 0.75 ? light(K.h, 0.85) : K.h);
        const hairy = y < hy - 1.5 || ((x < 8 || x > 15) && y < hy + 1) || (y < hy - 0.5 && (x % 3) !== 1);
        if (hairy) return (dx < -0.2 && dy < -0.3) ? K.hH : K.h;
        return dx > 0.55 ? K.sS : (dy > 0.7 ? K.sS : K.s);
      });
      b.p(7, Math.round(hy + 1), K.s); b.p(16, Math.round(hy + 1), K.sS); // ears
      if (front) {
        const ey = Math.round(hy + 0.5);
        if (pose.blink) { b.rect(9, ey + 1, 10, ey + 1, K.e); b.rect(13, ey + 1, 14, ey + 1, K.e); }
        else { b.rect(10, ey, 10, ey + 1, K.e); b.rect(13, ey, 13, ey + 1, K.e); }
        b.rect(11, ey + 3, 12, ey + 3, light(K.sS, 0.9));
        b.p(9, ey + 2, light(K.s, 1.05)); b.p(14, ey + 2, light(K.s, 1.05));
      }
      if (v.style === 'cap') {
        b.ell(hx, hy - 2.2, 5.1, 3.2, (x, y) => y < hy - 1 ? ((x < hx - 1 && y < hy - 3) ? light(K.x, 1.15) : K.x) : null);
        if (front) b.rect(7, Math.round(hy - 1), 16, Math.round(hy - 1), K.xS);
      }
      if (v.style === 'braid') {
        if (front) { b.rect(6, hy - 1, 7, hy + 4, K.h); b.rect(16, hy - 1, 17, hy + 4, K.h); }
        else { b.rect(11, hy + 3, 12, hy + 12, K.h); b.rect(11, hy + 3, 11, hy + 11, K.hH); b.rect(11, hy + 13, 12, hy + 13, K.x); }
      }
      if (v.style === 'specs' && front) { const ey = Math.round(hy + 0.5); b.rect(8, ey - 1, 11, ey - 1, K.x); b.rect(8, ey + 2, 11, ey + 2, K.x); b.rect(12, ey - 1, 15, ey - 1, K.x); b.rect(12, ey + 2, 15, ey + 2, K.x); b.rect(8, ey - 1, 8, ey + 2, K.x); b.rect(15, ey - 1, 15, ey + 2, K.x); b.rect(11, ey, 12, ey, K.x); }
      if (v.style === 'curls') b.ell(hx, hy - 1.8, 5.8, 4.3, (x, y, dx, dy) => (!front || y < hy - 1.2 || dx < -0.82 || dx > 0.82) ? ((PX.hash(x, y, 5) > 0.72 && dy < 0.2) ? K.hH : K.h) : null);
    }
    b.outline();
    return b.canvas();
  }

  const WALK = 6;
  // returns { down: {walk:[...6], idle:[base, breathe, blink]}, up: ..., side: ... }
  function build(vi) {
    const v = VARIANTS[vi], out = {};
    for (const dir of ['down', 'up', 'side']) {
      out[dir] = {
        walk: Array.from({ length: WALK }, (_, k) => draw(v, dir, { ph: k / WALK, walk: true })),
        idle: [draw(v, dir, { ph: 0, walk: false }), draw(v, dir, { ph: 0, walk: false, br: 1 }), draw(v, dir, { ph: 0, walk: false, blink: true })],
      };
    }
    return out;
  }
  global.CHARS = { VARIANTS, build, W, H, WALK };
})(window);
