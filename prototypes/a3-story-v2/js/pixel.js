/* Pixel-art helpers: colour maths, seeded noise, a tiny voxel model that is
   baked into "sprite stack" slices, and ASCII-drawn character sprites.
   Everything here is plain canvas 2D; Phaser only receives finished canvases. */
(function (global) {
  'use strict';

  // ---------- colour ----------
  function hex(h) { return typeof h === 'number' ? h : parseInt(h.replace('#', ''), 16); }
  function rgb(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
  function pack(r, g, b) {
    r = r < 0 ? 0 : r > 255 ? 255 : r | 0; g = g < 0 ? 0 : g > 255 ? 255 : g | 0; b = b < 0 ? 0 : b > 255 ? 255 : b | 0;
    return (r << 16) | (g << 8) | b;
  }
  function shade(c, f) { const [r, g, b] = rgb(c); return pack(r * f, g * f, b * f); }
  // warm highlights, cool shadows (reads as more "painted" than plain multiply)
  function light(c, f) {
    const [r, g, b] = rgb(c);
    if (f >= 1) { const k = f - 1; return pack(r + (255 - r) * k * 0.9 + 6 * k, g + (255 - g) * k * 0.85, b + (255 - b) * k * 0.6); }
    const k = 1 - f; return pack(r * (1 - k * 1.05), g * (1 - k * 0.98), b * (1 - k * 0.8) + 4 * k);
  }
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return pack(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function css(c, a) { const [r, g, b] = rgb(c); return a === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`; }

  // ---------- deterministic noise ----------
  function hash(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0; h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  }
  function vnoise(x, y, s) { // smooth value noise, ~[0,1]
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s) { return vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15; }
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }

  // ---------- canvas ----------
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  function px(ctx, x, y, c, a) { ctx.fillStyle = css(c, a); ctx.fillRect(x, y, 1, 1); }
  function rect(ctx, x, y, w, h, c, a) { ctx.fillStyle = css(c, a); ctx.fillRect(x, y, w, h); }
  // chunky beveled block, Explode-Arena style
  function bevel(ctx, x, y, w, h, c, depth) {
    depth = depth || 1;
    rect(ctx, x, y, w, h, c);
    for (let i = 0; i < depth; i++) {
      rect(ctx, x + i, y + i, w - i * 2, 1, light(c, 1.22 - i * 0.06));
      rect(ctx, x + i, y + i, 1, h - i * 2, light(c, 1.12 - i * 0.05));
      rect(ctx, x + i, y + h - 1 - i, w - i * 2, 1, light(c, 0.7 + i * 0.06));
      rect(ctx, x + w - 1 - i, y + i, 1, h - i * 2, light(c, 0.78 + i * 0.05));
    }
  }

  // ---------- voxel model -> sprite stack ----------
  // Coordinates: x east, y south, z up. Faces are shaded for a light from the
  // north-west and above, so every object gets a consistent bevel for free.
  class Vox {
    constructor(w, d, h) {
      this.w = w; this.d = d; this.h = h;
      this.c = new Int32Array(w * d * h).fill(-1);
      this.e = new Uint8Array(w * d * h); // 1 = emissive (screen, LED): not shaded
    }
    i(x, y, z) { return (z * this.d + y) * this.w + x; }
    in(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.w && y < this.d && z < this.h; }
    get(x, y, z) { return this.in(x, y, z) ? this.c[this.i(x, y, z)] : -1; }
    set(x, y, z, c, emit) { if (!this.in(x, y, z)) return; const i = this.i(x, y, z); this.c[i] = c; this.e[i] = emit ? 1 : 0; }
    // fill a box (end-exclusive). col: number or fn(x,y,z,lx,ly,lz,face) -> colour | null | {c, e}
    box(x0, y0, z0, x1, y1, z1, col) {
      for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        let face = 'in';
        if (z === z1 - 1) face = 'top'; else if (y === y1 - 1) face = 's'; else if (x === x0) face = 'w'; else if (x === x1 - 1) face = 'e'; else if (y === y0) face = 'n';
        this._put(x, y, z, typeof col === 'function' ? col(x, y, z, x - x0, y - y0, z - z0, face) : col);
      }
      return this;
    }
    _put(x, y, z, v) {
      if (v === null || v === undefined) return;
      if (v === -2) { this.set(x, y, z, -1); return; } // carve
      if (typeof v === 'object') this.set(x, y, z, v.c, v.e); else this.set(x, y, z, v, 0);
    }
    cyl(cx, cy, r, z0, z1, col) {
      for (let z = z0; z < z1; z++) for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy > r * r) continue;
        this._put(x, y, z, typeof col === 'function' ? col(x, y, z, dx, dy, z - z0) : col);
      }
      return this;
    }
    blob(cx, cy, cz, rx, ry, rz, col, seed, rough) {
      rough = rough === undefined ? 0.25 : rough;
      for (let z = Math.floor(cz - rz); z <= cz + rz; z++) for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const n = (vnoise(x * 0.35, y * 0.35 + z * 0.5, seed) - 0.5) * rough * 2;
        if (d > 1 + n) continue;
        this._put(x, y, z, typeof col === 'function' ? col(x, y, z, dx, dy, dz, d) : col);
      }
      return this;
    }
    // Shade every solid voxel by its exposed faces and bake each z-level into a
    // frame of one canvas. Returns {canvas, frames:[{x,y,z}], w, d, h, shadowMask}
    bake(opts) {
      opts = opts || {};
      const { w, d, h } = this;
      const out = new Int32Array(w * d * h).fill(-1);
      const P = this.parent, solid = (x, y, z) => (this.in(x, y, z) || !P) ? this.get(x, y, z) >= 0 : P.vox.get(x + P.ox, y + P.oy, z) >= 0;
      for (let z = 0; z < h; z++) for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
        const i = this.i(x, y, z), c = this.c[i]; if (c < 0) continue;
        if (this.e[i]) { out[i] = c; continue; }
        let f;
        const up = !solid(x, y, z + 1), s = !solid(x, y + 1, z), e = !solid(x + 1, y, z), wv = !solid(x - 1, y, z), n = !solid(x, y - 1, z);
        if (up) {
          f = 1.0;
          if (n || wv) f = 1.13; else if (s || e) f = 0.9;
          // simple ambient occlusion: darker where something rises next to us
          if (solid(x + 1, y, z + 1) || solid(x, y + 1, z + 1) || solid(x - 1, y, z + 1) || solid(x, y - 1, z + 1)) f *= 0.82;
        } else if (s) {
          f = 0.8; if (!solid(x, y + 1, z + 1) && solid(x, y, z + 1) && !solid(x, y, z + 2)) f = 0.86;
          if (wv) f = 0.86; if (e) f = 0.72;
        } else if (e) f = 0.66;
        else if (wv) f = 0.92;
        else if (n) f = 0.74;
        else f = 0.62;
        if (z < 2 && !up) f *= 0.84;
        out[i] = light(c, f);
      }
      // frames laid out in a grid to stay under GPU texture limits
      const cols = Math.max(1, Math.floor(4000 / (w + 1)));
      const rows = Math.ceil(h / cols);
      const [cv, ctx] = canvas(cols * (w + 1), rows * (d + 1));
      const img = ctx.createImageData(cv.width, cv.height);
      const frames = [];
      for (let z = 0; z < h; z++) {
        const fx = (z % cols) * (w + 1), fy = Math.floor(z / cols) * (d + 1);
        let any = false;
        for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) {
          const c = out[this.i(x, y, z)]; if (c < 0) continue; any = true;
          const p = ((fy + y) * cv.width + fx + x) * 4;
          img.data[p] = (c >> 16) & 255; img.data[p + 1] = (c >> 8) & 255; img.data[p + 2] = c & 255; img.data[p + 3] = 255;
        }
        if (any || opts.keepEmpty) frames.push({ x: fx, y: fy, z });
      }
      ctx.putImageData(img, 0, 0);
      return { canvas: cv, frames, w, d, h, vox: this };
    }
    // occupancy at height z, for shadow casting and collision
    occ(x, y, z) { return this.get(x, y, z) >= 0; }
  }

  // Draw a baked stack into a 2D context (used for card portraits / previews)
  function drawStack(ctx, baked, ox, oy, scale, tilt, lean) {
    lean = lean || 0;
    for (const f of baked.frames) {
      ctx.drawImage(baked.canvas, f.x, f.y, baked.w, baked.d, Math.round((ox + f.z * lean) * scale), Math.round((oy - f.z * tilt) * scale), baked.w * scale, baked.d * scale);
    }
  }

  // ---------- ASCII sprites ----------
  function spriteFromRows(rows, pal) {
    const h = rows.length, w = rows[0].length;
    const [cv, ctx] = canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x]; if (ch === '.' || ch === ' ' || pal[ch] === undefined) continue;
      px(ctx, x, y, pal[ch]);
    }
    return cv;
  }

  global.PX = { hex, rgb, pack, shade, light, mix, css, hash, vnoise, fbm, rng, canvas, px, rect, bevel, Vox, drawStack, spriteFromRows };
})(window);
