/* Era 7, "The kid": a late-1990s room and lane in India.
   Builds every voxel object, the painted ground (with baked soft shadows),
   collision grid, landmarks and story copy. No Phaser in here. */
(function (global) {
  'use strict';
  const { Vox, hash, vnoise, fbm, light, mix, canvas, rgb } = PX;

  const W = 640, H = 448;
  const SUN = { x: 0.55, y: 0.42 }; // ground shadow offset per voxel of height

  // ---------- palette ----------
  const C = {
    wood: 0x8a5632, woodL: 0xa86f42, woodD: 0x5e3720, teak: 0x7a4a2a,
    beige: 0xd8cdaa, beigeD: 0xb9ad8a, beigeL: 0xe9e1c6,
    wallIn: 0x95cbc2, wallOut: 0xe8cf96, wallOutD: 0xc7a466, cap: 0xdcd3c1, skirt: 0x6f8c86,
    grill: 0x2f5d50, glass: 0x8cc6d8,
    win98: 0x008080, w98grey: 0xc0c0c0, w98blue: 0x000a80,
    pink: 0xe4a487, pinkD: 0xc07f63, blue: 0x9ec5d6, concrete: 0x9d978b, tank: 0x2b2b2e,
    leaf: [0x2f6b2a, 0x3d7f30, 0x4f9636, 0x64ab40, 0x7cbf4b], bark: 0x6b4a33, barkD: 0x4b3222,
    whitewash: 0xe9e3d6, moss: 0x6f7f4a,
    red: 0xd23a2c, yellow: 0xf2b829, black: 0x1f1f22, steel: 0x9aa3a8, signGreen: 0x2f7d4f,
  };
  const j = (c, x, y, z, a) => light(c, 1 + (hash(x * 3 + z * 7, y * 5 - z, 11) - 0.5) * (a || 0.08));

  const objects = []; // {id, x, y, vox, solid, above, sort, landmark}
  function add(id, x, y, vox, o) { const ob = Object.assign({ id, x, y, vox, solid: true, above: false }, o || {}); objects.push(ob); return ob; }

  // split off everything at z >= cut into an "above the player" object (tree canopies, lamp heads)
  function splitAbove(ob, cut) {
    const v = ob.vox, up = new Vox(v.w, v.d, v.h);
    for (let z = cut; z < v.h; z++) for (let y = 0; y < v.d; y++) for (let x = 0; x < v.w; x++) {
      const i = v.i(x, y, z); if (v.c[i] >= 0) { up.c[i] = v.c[i]; up.e[i] = v.e[i]; v.c[i] = -1; }
    }
    add(ob.id + '-top', ob.x, ob.y, up, { solid: false, above: true, cx: ob.cx, cy: ob.cy });
  }

  // ======================= the room =======================
  const RX0 = 160, RY0 = 48, RX1 = 448, RY1 = 256, WT = 8, WH = 24;

  function wallPaint(inner, x, y, z) {
    if (inner) {
      if (z < 2) return j(C.skirt, x, y, z, 0.06);
      return j(C.wallIn, x, y, z, 0.05);
    }
    if (z < 5) return j(C.wallOutD, x, y, z, 0.1);
    const stain = vnoise(x * 0.15, z * 0.3, 4) > 0.72 ? 0.93 : 1;
    return light(j(C.wallOut, x, y, z, 0.07), stain);
  }

  // North wall with window (open, with green iron grill), calendar and tube light
  {
    const v = new Vox(RX1 - RX0, WT, WH);
    v.box(0, 0, 0, v.w, WT, WH, (x, y, z, lx, ly, lz) => {
      if (z >= WH - 2) return j(C.cap, x, y, z, 0.06);
      if (lx >= 128 && lx < 176 && z >= 8 && z < 20) {
        const wx = lx - 128;
        if (wx < 2 || wx >= 46 || z < 9 || z >= 19) return ly >= 2 ? j(C.woodL, x, y, z, 0.1) : j(C.wood, x, y, z);
        if (wx === 23 || wx === 24) return j(C.wood, x, y, z);
        if (ly === 5 && (wx % 5 === 1 || z === 14)) return C.grill;
        return -2;
      }
      const inner = ly >= 4;
      if (inner && ly === WT - 1) {
        // calendar
        if (lx >= 60 && lx < 74 && z >= 10 && z < 20) {
          if (z >= 18) return 0xc8332b;
          if (lx === 60 || lx === 73 || z === 10) return 0xd8d2c4;
          if (z >= 15) return mix(0x4a8fbf, 0x7ec07a, (lx - 60) / 14);
          return ((lx + z) % 3 === 0) ? 0x8a8478 : 0xf4f1ea;
        }
        // tube light
        if (lx >= 216 && lx < 248 && z === 21) return { c: 0xf6fbff, e: 1 };
        if ((lx === 215 || lx === 248) && z >= 20 && z <= 21) return 0xbfc6c9;
      }
      return wallPaint(inner, x, y, z);
    });
    add('wallN', RX0, RY0, v);
  }
  // South wall with door gap + lintel and a barred window
  {
    const v = new Vox(RX1 - RX0, WT, WH);
    v.box(0, 0, 0, v.w, WT, WH, (x, y, z, lx, ly, lz) => {
      const door = lx >= 128 && lx < 160;
      if (door && z < 20) return null;
      if (z >= WH - 2) return j(C.cap, x, y, z, 0.06);
      if (door) return j(C.woodD, x, y, z);
      if (lx === 126 || lx === 127 || lx === 160 || lx === 161) return z < 20 ? j(C.wood, x, y, z) : j(C.woodD, x, y, z);
      if (lx >= 40 && lx < 80 && z >= 8 && z < 19) {
        const wx = lx - 40;
        if (wx < 2 || wx >= 38 || z < 9 || z >= 18) return j(C.woodL, x, y, z);
        if (ly === 3 && (wx % 5 === 2 || z === 13)) return C.grill;
        return -2;
      }
      return wallPaint(ly < 4, x, y, z);
    });
    add('wallS', RX0, RY1 - WT, v);
  }
  // West + east walls in 16px segments (keeps depth sorting honest)
  for (let side = 0; side < 2; side++) {
    for (let sy = RY0 + WT; sy < RY1 - WT; sy += 16) {
      const v = new Vox(WT, 16, WH);
      v.box(0, 0, 0, WT, 16, WH, (x, y, z, lx, ly) => {
        if (z >= WH - 2) return j(C.cap, x + side * 9, y + sy, z, 0.06);
        const inner = side === 0 ? lx >= 4 : lx < 4;
        return wallPaint(inner, x + side * 300, y + sy, z);
      });
      add('wall' + (side ? 'E' : 'W') + sy, side ? RX1 - WT : RX0, sy, v);
    }
  }

  // ---------- desk + CRT + keyboard (landmark: pc) ----------
  {
    const v = new Vox(66, 23, 36);
    const top = 14;
    v.box(0, 0, top - 2, 66, 22, top, (x, y, z, lx, ly, lz, f) => f === 'top' ? light(j(C.woodL, x, y, z, 0.05), 1 + 0.06 * Math.sin(lx * 0.7 + ly * 0.2)) : j(C.wood, x, y, z));
    for (const [lx, ly] of [[1, 1], [62, 1], [1, 19], [62, 19]]) v.box(lx, ly, 0, lx + 3, ly + 2, top - 2, C.woodD);
    // drawer pedestal on the right
    v.box(46, 2, 2, 64, 22, top - 2, (x, y, z, lx, ly, lz, f) => {
      if (f === 's') { if (lz === 4 || lz === 8) return C.woodD; if (lx >= 8 && lx <= 9 && (lz === 2 || lz === 6)) return 0xd8b04a; }
      return j(C.wood, x, y, z);
    });
    // speaker (left)
    v.box(2, 4, top, 8, 12, top + 9, (x, y, z, lx, ly, lz, f) => (f === 's' && lx > 0 && lx < 5 && lz > 1 && lz < 7) ? ((lx + lz) % 2 ? 0x3a3a3c : 0x2a2a2c) : j(C.beige, x, y, z, 0.04));
    // CRT: tube at the back, bezel in front, screen on the south face
    v.box(13, 1, top + 2, 33, 9, top + 18, (x, y, z) => j(C.beigeD, x, y, z, 0.05));
    v.box(15, 0, top + 4, 31, 3, top + 15, (x, y, z) => j(C.beigeD, x, y, z, 0.05));
    v.box(17, 9, top, 29, 14, top + 2, C.beigeD); // stand
    v.box(10, 8, top + 2, 36, 16, top + 22, (x, y, z, lx, ly, lz, f) => {
      if (f === 's') {
        const sx = lx - 3, sz = lz - 3; // screen 20 x 15
        if (sx >= 0 && sx < 20 && sz >= 0 && sz < 15) {
          if (sz === 0) return { c: sx < 4 ? 0x2f8f3a : C.w98grey, e: 1 };       // taskbar + start
          if (sx >= 6 && sx < 17 && sz >= 4 && sz < 12) {                        // a window
            if (sz === 11) return { c: sx > 14 ? 0xc0c0c0 : C.w98blue, e: 1 };
            if (sx === 6 || sx === 16 || sz === 4) return { c: 0x808080, e: 1 };
            return { c: (sz === 9 && sx > 7 && sx < 13) || (sz === 7 && sx > 7 && sx < 11) ? 0x303030 : 0xffffff, e: 1 };
          }
          if (sx >= 1 && sx < 3 && (sz === 12 || sz === 9 || sz === 6)) return { c: sz === 12 ? 0xffe066 : 0xf0f0f0, e: 1 }; // icons
          return { c: sz > 12 && sx > 14 ? 0x0a9090 : C.win98, e: 1 };
        }
        if (lz === 1 && lx === 23) return { c: 0x46ff6a, e: 1 }; // power LED
        if (lz <= 1 || lz >= 18 || sx < -1 || sx > 20) return j(C.beige, x, y, z, 0.03);
        return light(C.beige, 0.9);
      }
      return j(C.beige, x, y, z, 0.04);
    });
    // keyboard + mouse
    v.box(10, 17, top, 36, 22, top + 1, (x, y, z, lx, ly) => (ly > 0 && ly < 4 && lx > 0 && lx < 25 && (lx + (ly % 2)) % 2 === 0) ? 0x8f8a78 : C.beigeL);
    v.box(40, 15, top, 52, 22, top + 1, 0x2d4f8a); // mouse pad
    v.box(44, 17, top + 1, 47, 21, top + 2, C.beigeL);
    v.box(55, 9, top, 59, 13, top + 1, 0x222226); v.box(56, 4, top, 60, 8, top + 1, 0x1f4fa0); // floppies
    add('desk', 176, 57, v, { landmark: 'pc' });
  }
  // tower PC beside the desk
  {
    const v = new Vox(13, 22, 30);
    v.box(0, 0, 0, 13, 22, 30, (x, y, z, lx, ly, lz, f) => {
      if (f === 's') {
        if (lz >= 23 && lz <= 26 && lx >= 2 && lx <= 10) return lz === 24 && lx > 2 && lx < 10 ? 0x2a2a2a : (lx === 9 && lz === 25 ? 0x6b6b6b : C.beigeL);
        if (lz === 19 && lx >= 3 && lx <= 9) return 0x262626;
        if (lz === 20 && lx === 9) return 0x7a7a7a;
        if (lz >= 6 && lz <= 8 && lx >= 5 && lx <= 7) return 0xb7b0a0;
        if (lz === 11 && lx === 4) return { c: 0x55ff66, e: 1 };
        if (lz === 11 && lx === 8) return { c: 0xffaa33, e: 1 };
        if (lz >= 13 && lz <= 14 && lx >= 9 && lx <= 10) return 0x2b5fb0; // sticker
        if (lz < 4 && lx % 2 === 0) return C.beigeD;
        return j(C.beige, x, y, z, 0.03);
      }
      return j(C.beige, x, y, z, 0.04);
    });
    add('tower', 244, 58, v, { landmark: 'pc' });
  }
  // wooden chair, back to us
  {
    const v = new Vox(18, 16, 24);
    for (const [lx, ly] of [[1, 1], [15, 1], [1, 13], [15, 13]]) v.box(lx, ly, 0, lx + 2, ly + 2, 10, C.woodD);
    v.box(0, 0, 9, 18, 15, 11, (x, y, z, lx, ly, lz, f) => f === 'top' ? j(0x9b6a3e, x, y, z, 0.06) : C.wood);
    v.box(0, 13, 11, 2, 15, 24, C.wood); v.box(16, 13, 11, 18, 15, 24, C.wood);
    v.box(0, 13, 18, 18, 15, 23, (x, y, z) => j(0x9b6a3e, x, y, z, 0.06));
    add('chair', 198, 84, v);
  }

  // ---------- bookshelf + manuals (landmark: manuals) ----------
  {
    const v = new Vox(76, 14, 40);
    const boards = [0, 12, 24, 37];
    v.box(0, 0, 0, 76, 2, 39, C.woodD);
    v.box(0, 0, 0, 3, 14, 40, (x, y, z) => j(C.teak, x, y, z)); v.box(73, 0, 0, 76, 14, 40, (x, y, z) => j(C.teak, x, y, z));
    for (const b of boards) v.box(0, 0, b, 76, 14, b + 2, (x, y, z, lx, ly, lz, f) => j(f === 'top' ? C.woodL : C.teak, x, y, z, 0.05));
    const r = PX.rng(42);
    const spines = [0x2b4f9a, 0xb33a2e, 0x2f7d4f, 0xd8b04a, 0x6b3f8a, 0x3a3a40, 0xc96a2a, 0x1f6f8b];
    for (let s = 0; s < 3; s++) {
      let x = 4; const z0 = boards[s] + 2, zmax = boards[s + 1] - 1;
      while (x < 70) {
        const manual = r() < 0.38;
        const bw = manual ? 4 + Math.floor(r() * 3) : 2 + Math.floor(r() * 2);
        const bh = Math.min(zmax - z0, (manual ? 8 : 6) + Math.floor(r() * 4));
        const col = manual ? (r() < 0.5 ? 0xece6d6 : 0xd5dbe3) : spines[Math.floor(r() * spines.length)];
        const band = manual ? (r() < 0.5 ? 0x1f4fa0 : 0xc8332b) : light(col, 1.3);
        const depth = manual ? 11 : 9 + Math.floor(r() * 2);
        if (x + bw > 72) break;
        v.box(x, 2, z0, x + bw, 2 + depth, z0 + bh, (xx, yy, zz, lx, ly, lz, f) => {
          if (f === 'top') return light(col, 1.05);
          if (manual && (lz === bh - 3 || lz === bh - 4)) return band;
          if (manual && lz === 2 && lx === 1) return 0x222222;
          if (!manual && lz === bh - 2) return band;
          return lx === 0 ? light(col, 0.85) : col;
        });
        x += bw + (r() < 0.15 ? 2 : 0);
      }
    }
    // a little globe on top
    v.cyl(62, 7, 2.2, 39, 40, 0x6b4a33);
    add('shelf', 352, 57, v, { landmark: 'manuals' });
    // globe as its own slim object above the shelf (separate so it stays round)
    const g = new Vox(14, 14, 54);
    g.cyl(7, 7, 1, 40, 42, 0x5b3a26);
    g.blob(7, 7, 47, 5.2, 5.2, 5.2, (x, y, z, dx, dy, dz) => {
      const land = vnoise(x * 0.5 + z * 0.3, y * 0.5, 9) > 0.55;
      return land ? (dz > 0.4 ? 0xe9e1c6 : 0x5d9b49) : 0x2f72b8;
    }, 1, 0);
    add('globe', 352 + 55, 57, g, { solid: false });
  }
  // stack of manuals on the floor, covers up (the Windows one shows its flag logo)
  {
    const v = new Vox(22, 16, 10);
    const books = [[0, 0, 22, 16, 0xece6d6], [1, 1, 21, 15, 0x3b5fa0], [0, 1, 20, 15, 0xe2e6ec], [2, 0, 22, 14, 0xf3efe4]];
    books.forEach((b, i) => {
      v.box(b[0], b[1], i * 2 + (i === 3 ? 1 : 0), b[2], b[3], i * 2 + 2 + (i === 3 ? 1 : 0), (x, y, z, lx, ly, lz, f) => {
        if (f === 's' || f === 'e' || f === 'w') return (lz === 1 && i !== 1) ? 0xd9d4c6 : light(b[4], 0.92);
        if (i === 3 && f === 'top') {
          // flag logo: four colour panes
          if (lx >= 3 && lx < 9 && ly >= 3 && ly < 9) { const q = (lx < 6 ? 0 : 1) + (ly < 6 ? 0 : 2); return [0xe8402f, 0x3fae49, 0x1f6fd1, 0xf7c52a][q]; }
          if (ly >= 4 && ly <= 8 && lx >= 11 && lx < 18 && ly % 2 === 0) return 0x2b2b2b;
          if (ly === 11 && lx >= 3 && lx < 17) return 0x1f4fa0;
          return j(b[4], x, y, z, 0.03);
        }
        return b[4];
      });
    });
    add('manualStack', 394, 74, v, { landmark: 'manuals' });
  }

  // ---------- bed + steel almirah ----------
  {
    const v = new Vox(46, 86, 20);
    v.box(0, 0, 0, 46, 4, 20, (x, y, z, lx, ly, lz, f) => f === 'top' ? C.woodL : j(C.wood, x, y, z));
    for (const [lx, ly] of [[1, 82], [42, 82]]) v.box(lx, ly, 0, lx + 3, ly + 3, 7, C.woodD);
    v.box(0, 4, 5, 46, 86, 8, C.wood);
    v.box(1, 4, 8, 45, 85, 12, (x, y, z, lx, ly, lz, f) => {
      if (f !== 'top') return 0xd9dde6;
      const chk = ((Math.floor(lx / 4) + Math.floor(ly / 4)) % 2);
      if (ly > 50) return chk ? 0x3c6fb6 : 0x5d8fd6; // folded blanket area
      return (lx % 8 === 0 || ly % 8 === 0) ? 0xb8c8e8 : 0xeef1f6;
    });
    v.box(6, 6, 12, 40, 18, 15, (x, y, z, lx, ly, lz, f) => f === 'top' ? light(0xf6f3ec, 1 - (ly / 40)) : 0xe6e1d5); // pillow
    v.box(1, 52, 12, 45, 64, 15, (x, y, z, lx, ly) => ((lx >> 2) + (ly >> 2)) % 2 ? 0x2f5f9e : 0x4f7fc0);
    add('bed', 168, 158, v);
  }
  // steel almirah (with the inevitable suitcase on top), next to the window
  {
    const v = new Vox(28, 17, 52);
    const ST = 0x8f9c98;
    v.box(0, 0, 0, 28, 16, 44, (x, y, z, lx, ly, lz, f) => {
      if (f === 's') {
        if (lz < 3) return 0x5d6664;
        if (lx === 14) return 0x5d6664;
        if ((lx === 12 || lx === 16) && lz >= 20 && lz <= 25) return 0xe8eef0;
        if (lx === 18 && lz === 27) return 0x2a2a2a;
        if (lx >= 17 && lx <= 25 && lz >= 30 && lz <= 41) return lx === 17 || lx === 25 || lz === 30 || lz === 41 ? 0x6b7673 : (lx - lz) % 7 === 0 ? 0xeaf6fa : 0xa9c6cf; // mirror
        if (lx === 0 || lx === 27 || lz === 43) return light(ST, 1.1);
        if (lx >= 3 && lx <= 10 && lz >= 34 && lz <= 37) return 0xd8cfb0; // a sticker
      }
      return j(ST, x, y, z, 0.03);
    });
    v.box(3, 2, 44, 25, 15, 49, (x, y, z, lx, ly, lz, f) => (lx === 6 || lx === 16) ? 0xc9a36a : (f === 'top' ? 0x8a2f2c : 0x6e2422));
    add('almirah', 258, 57, v);
  }
  // cricket bat and ball by the east wall
  {
    const v = new Vox(14, 30, 5);
    v.box(2, 0, 0, 7, 17, 2, (x, y, z, lx, ly, lz, f) => f === 'top' ? (ly === 0 || lx === 0 ? 0xf0dcaa : 0xe2c48a) : 0xb89a62);
    v.box(3, 17, 0, 6, 26, 2, (x, y, z, lx, ly) => ly % 2 ? 0x2a2a2a : 0x3f3f3f);
    v.blob(10.5, 25.5, 1.5, 2, 2, 1.6, 0xc8332b, 1, 0);
    add('bat', 414, 186, v, { solid: false });
  }

  // ---------- the dismantled toy truck (landmark: toy) ----------
  {
    const v = new Vox(80, 44, 14);
    const Y = 0xf2b829, YD = 0xc98d12, R = 0xd23a2c, TYRE = 0x1d1d20, HUB = 0xb9bec2;
    const wheelFlat = (cx, cy) => v.cyl(cx, cy, 3.2, 0, 2, (x, y, z, dx, dy) => (dx * dx + dy * dy < 2) ? HUB : TYRE);
    const wheelUp = (cx, y0, cz) => { for (let x = cx - 4; x <= cx + 4; x++) for (let z = cz - 4; z <= cz + 4; z++) { const dx = x + 0.5 - cx, dz = z + 0.5 - cz; const d = dx * dx + dz * dz; if (d > 10) continue; for (let y = y0; y < y0 + 2; y++) v.set(x, y, z, d < 2.5 ? HUB : TYRE); } };
    // chassis / flatbed
    v.box(20, 14, 2, 50, 26, 4, 0x4a4a50);
    v.box(20, 14, 4, 50, 26, 8, (x, y, z, lx, ly, lz, f) => {
      if (f === 'top' && lx > 1 && lx < 28 && ly > 1 && ly < 10) return (lx % 4 === 0) ? YD : Y;
      if (f === 'top') return light(Y, 1.1);
      return Y;
    });
    v.box(22, 16, 5, 48, 24, 8, -2); // hollow bed
    v.box(22, 16, 4, 48, 24, 5, YD);
    for (const ax of [25, 44]) v.box(ax, 11, 2, ax + 2, 29, 3, HUB); // axles
    wheelUp(26, 27, 3); // one wheel still on
    // detached cab
    v.box(54, 12, 1, 68, 26, 10, (x, y, z, lx, ly, lz, f) => {
      if (lz >= 5 && lz <= 7 && (f === 's' || f === 'e' || f === 'w')) return { c: 0x9fd6ef, e: 0 };
      if (f === 'e' && lz === 2 && (ly === 2 || ly === 11)) return { c: 0xfff2a0, e: 1 };
      return R;
    });
    v.box(54, 12, 10, 68, 26, 11, light(R, 1.15));
    // little motor with copper winding exposed
    v.cyl(74, 30, 2.6, 0, 6, (x, y, z, dx, dy, lz) => lz > 1 && lz < 4 ? 0xc87533 : 0xb9bec2);
    // loose wheels, screwdriver, batteries, screws, a gear
    wheelFlat(10, 34); wheelFlat(40, 38); wheelFlat(62, 36);
    v.box(4, 8, 0, 10, 11, 2, 0xe0b12a); v.box(4, 8, 2, 10, 11, 3, 0xc8332b); v.box(10, 9, 0, 22, 10, 1, 0xc7cdd1);
    v.box(70, 8, 0, 76, 10, 2, 0x1f1f22); v.box(70, 8, 2, 72, 10, 3, 0xc23a2c);
    v.box(70, 12, 0, 76, 14, 2, 0x1f1f22); v.box(74, 12, 2, 76, 14, 3, 0xc23a2c);
    for (const [sx, sy] of [[16, 26], [30, 34], [52, 33], [57, 5], [46, 6]]) v.set(sx, sy, 0, 0xd2d6d9);
    v.cyl(36, 6, 3, 0, 1, (x, y, z, dx, dy) => (dx * dx + dy * dy < 1.2) ? 0x777777 : ((Math.atan2(dy, dx) * 4 / Math.PI + 8) % 1 < 0.5 ? 0xf4f0e6 : 0xd8d2c0));
    add('toy', 266, 166, v, { landmark: 'toy' });
  }

  // ======================= outside =======================
  // neighbour house (west): pink, two storeys, sunshades, stair room and black water tank
  {
    const BW = 120, BD = 160, v = new Vox(BW, BD + 4, 82);
    v.box(0, 0, 0, BW, BD, 50, (x, y, z, lx, ly, lz, f) => {
      if (f === 'top') return light(j(C.concrete, x, y, z, 0.06), 1 - Math.max(0, vnoise(lx * 0.08, ly * 0.08, 3) - 0.55) * 0.35);
      if (lz < 4) return j(0x8a8580, x, y, z, 0.08);
      if (lz === 25 || lz === 26) return light(C.pink, 0.92);
      const isS = f === 's', isE = f === 'e';
      if (isS || isE) {
        const u = isS ? lx : ly;
        for (const wx of isS ? [14, 50, 86] : [20, 70, 120]) for (const wz of [8, 32]) {
          if (u >= wx && u < wx + 20 && lz >= wz && lz < wz + 14) {
            const a = u - wx, b = lz - wz;
            if (a === 0 || a === 19 || b === 0 || b === 13) return 0x3b6f9a;
            if (a === 10) return 0x3b6f9a;
            if ((a % 4 === 2) || b === 7) return 0x2b3a3c;
            return b > 9 && a < 8 ? 0xa9d6ea : 0x34586e;
          }
        }
        if (isE && u >= 140 && u < 152 && lz >= 4 && lz < 22) return u === 140 || u === 151 || lz === 21 ? 0x5e3720 : 0x7c4a2a;
      }
      const streak = 1 - Math.max(0, vnoise(lx * 0.4 + ly * 0.4, lz * 0.05, 8) - 0.6) * 0.5;
      return light(j(C.pink, x, y, z, 0.06), streak);
    });
    // sunshades over each south window (they overhang: nice depth cue)
    for (const wx of [14, 50, 86]) for (const wz of [22, 46]) v.box(wx - 2, BD, wz, wx + 22, BD + 4, wz + 1, (x, y, z, lx, ly, lz, f) => f === 'top' ? 0xb7b1a5 : 0x8f897e);
    // parapet
    v.box(0, 0, 50, BW, BD, 54, (x, y, z, lx, ly, lz, f) => (lx < 3 || ly < 3 || lx >= BW - 3 || ly >= BD - 3) ? (f === 'top' ? 0xd8cfc6 : light(C.pink, 0.95)) : null);
    // stair room + tank
    v.box(70, 18, 50, 104, 52, 68, (x, y, z, lx, ly, lz, f) => {
      if (f === 's' && lx >= 12 && lx < 22 && lz < 13) return lx === 12 || lx === 21 || lz === 12 ? 0x5e3720 : 0x7c4a2a;
      if (f === 'top') return j(C.concrete, x, y, z, 0.1);
      return light(j(C.pink, x, y, z, 0.05), 0.97);
    });
    v.cyl(87, 33, 9.5, 68, 81, (x, y, z, dx, dy, lz) => lz === 12 ? (dx * dx + dy * dy < 9 ? 0x3d3d42 : 0x2f2f33) : (lz % 4 === 0 ? 0x3a3a3f : C.tank));
    // clothes line on the roof
    for (let x = 12; x < 60; x++) v.set(x, 120, 58, 0xdddddd);
    v.box(10, 119, 50, 12, 121, 59, 0x555555); v.box(60, 119, 50, 62, 121, 59, 0x555555);
    [[16, 0xc8332b], [24, 0xf2b829], [33, 0x2f72b8], [44, 0xe6e6e6], [52, 0x2f7d4f]].forEach(([cx, col]) => v.box(cx, 120, 53, cx + 5, 121, 58, col));
    add('houseW', 12, 36, v, { cx: 72, cy: 116 });
  }
  // neighbour house (east): pale blue with a TV antenna
  {
    const v = new Vox(86, 104, 74);
    v.box(0, 0, 0, 86, 100, 42, (x, y, z, lx, ly, lz, f) => {
      if (f === 'top') return j(C.concrete, x, y, z, 0.12);
      if (lz < 4) return 0x8a8580;
      if (f === 's' || f === 'w') {
        const u = f === 's' ? lx : ly;
        for (const wx of f === 's' ? [12, 52] : [16, 60]) if (u >= wx && u < wx + 18 && lz >= 10 && lz < 26) {
          const a = u - wx, b = lz - 10; if (a === 0 || a === 17 || b === 0 || b === 15 || a === 9) return 0x2f6a5a; if (a % 4 === 1) return 0x22302c; return b > 11 && a < 8 ? 0xb6e0ee : 0x3a5f72;
        }
      }
      return j(C.blue, x, y, z, 0.06);
    });
    v.box(10, 100, 26, 80, 104, 27, 0x8f897e);
    v.box(0, 0, 42, 86, 100, 45, (x, y, z, lx, ly, lz, f) => (lx < 2 || ly < 2 || lx >= 84 || ly >= 98) ? (f === 'top' ? 0xe2e8ea : C.blue) : null);
    v.box(40, 40, 42, 41, 41, 73, 0x6c7378);
    for (const [z, half] of [[64, 9], [68, 7], [72, 5]]) v.box(40 - half, 40, z, 41 + half, 41, z + 1, 0x8c9499);
    add('houseE', 548, 6, v, { cx: 591, cy: 58 });
  }
  // compound wall with gate pillars
  {
    const wallSeg = (x0, x1) => {
      const v = new Vox(x1 - x0, 6, 11);
      v.box(0, 0, 0, x1 - x0, 6, 11, (x, y, z, lx, ly, lz, f) => {
        if (lz >= 10) return 0xbab4a8;
        if (lz < 3) return light(j(C.moss, x, y + x0, z, 0.2), 1.05);
        return j(C.whitewash, x + x0, y, z, 0.07);
      });
      return v;
    };
    for (let x = 136; x < 288; x += 38) add('cwall' + x, x, 298, wallSeg(x, Math.min(x + 38, 280)));
    for (let x = 328; x < 472; x += 36) add('cwall' + x, x, 298, wallSeg(x, Math.min(x + 36, 472)));
    for (const px of [276, 324]) {
      const v = new Vox(12, 10, 19);
      v.box(1, 1, 0, 11, 9, 16, (x, y, z, lx, ly, lz) => lz < 3 ? j(C.moss, x, y, z, 0.2) : j(C.whitewash, x, y, z, 0.05));
      v.box(0, 0, 16, 12, 10, 18, 0xc7c0b2); v.box(3, 3, 18, 9, 7, 19, 0xd23a2c);
      add('pillar' + px, px - 2, 296, v);
    }
    for (const sx of [136, 466]) for (let y = 128; y < 298; y += 17) {
      const v = new Vox(6, Math.min(17, 298 - y), 11);
      v.box(0, 0, 0, 6, v.d, 11, (x, yy, z, lx, ly, lz) => lz >= 10 ? 0xbab4a8 : lz < 3 ? j(C.moss, x + sx, yy + y, z, 0.2) : j(C.whitewash, x + sx, yy + y, z, 0.07));
      add('cwallS' + sx + y, sx, y, v);
    }
  }
  // tulsi planter in the courtyard
  {
    const v = new Vox(14, 14, 22);
    v.box(1, 1, 0, 13, 13, 11, (x, y, z, lx, ly, lz, f) => (f === 's' && lx > 3 && lx < 8 && lz > 3 && lz < 8) ? 0xd27a2a : (lz < 2 ? 0xa45a3a : j(0xe6d8c0, x, y, z, 0.05)));
    v.box(0, 0, 11, 14, 14, 13, 0xb86a3e);
    v.blob(7, 7, 16, 5, 5, 5, (x, y, z, dx, dy, dz) => C.leaf[Math.floor(hash(x, y, z) * 3) + (dz > 0 ? 2 : 0)], 5, 0.35);
    add('tulsi', 244, 270, v);
  }
  // trees: trunk sorted with the player, canopy always above
  function tree(id, cx, cy, size, seed) {
    const R = size, P = Math.ceil(R * 1.3) + 3, v = new Vox(P * 2, P * 2, 36 + R);
    const ox = P, oy = P;
    v.cyl(ox, oy, 3.2, 0, 26, (x, y, z, dx, dy) => (Math.floor(x + z * 0.3) % 3 === 0) ? C.barkD : j(C.bark, x, y, z, 0.12));
    v.cyl(ox, oy, 4.2, 0, 2, C.barkD);
    for (let k = 0; k < 4; k++) { const a = k * 1.7 + seed; for (let t = 0; t < 9; t++) v.set(Math.round(ox + Math.cos(a) * t), Math.round(oy + Math.sin(a) * t * 0.8), 20 + Math.floor(t * 0.6), C.bark); }
    // canopy = a cluster of lumpy blobs, darker low down and brighter on top
    const zLo = 18, zHi = 26 + R * 0.75, rr = PX.rng(seed * 31 + 7);
    const leafCol = (x, y, z) => {
      const t = (z - zLo) / (zHi - zLo), clump = vnoise(x * 0.17, y * 0.17 + z * 0.12, seed + 3);
      let idx = Math.floor(t * 4.6 + (clump - 0.5) * 2.2); idx = Math.max(0, Math.min(4, idx));
      if (idx >= 3 && hash(x, y, z + seed) > 0.93) return 0xa8d860;
      return j(C.leaf[idx], x, y, z, 0.05);
    };
    v.blob(ox, oy - 2, 24 + R * 0.4, R * 0.72, R * 0.66, R * 0.42, leafCol, seed, 0.2);
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + rr() * 0.6, dist = R * (0.4 + rr() * 0.22), br = R * (0.36 + rr() * 0.14);
      v.blob(ox + Math.cos(a) * dist, oy - 2 + Math.sin(a) * dist * 0.88, 22 + R * 0.3 + (rr() - 0.4) * R * 0.25, br, br * 0.92, br * 0.7, leafCol, seed + k, 0.25);
    }
    const ob = add(id, cx - ox, cy - oy, v, { cx, cy });
    splitAbove(ob, 18);
    return ob;
  }
  tree('treeNE', 506, 112, 30, 1);
  tree('treeSE', 590, 252, 24, 2);
  tree('treeSW', 92, 268, 22, 3);
  tree('treeFG1', 160, 432, 30, 4);
  tree('treeFG2', 560, 438, 26, 5);
  // coconut palm
  {
    const v = new Vox(48, 48, 66);
    for (let z = 0; z < 56; z++) {
      const cx = 14 + Math.pow(z / 56, 2) * 10, cy = 34 - z * 0.05;
      v.cyl(cx, cy, 2.3, z, z + 1, (z % 3 === 0) ? 0x6e5a40 : 0x8f7655);
    }
    const tx = 24, ty = 31, tz = 56;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + 0.3;
      for (let t = 0; t < 20; t++) {
        const fx = tx + Math.cos(a) * t, fy = ty + Math.sin(a) * t * 0.9, fz = tz + 4 - (t * t) / 38;
        const col = t < 4 ? 0x5b7f2a : C.leaf[(t + k) % 2 ? 2 : 3];
        v.set(Math.round(fx), Math.round(fy), Math.round(fz), col);
        if (t > 3 && t < 18) { const nx = -Math.sin(a), ny = Math.cos(a); for (const s of [-2, -1, 1, 2]) v.set(Math.round(fx + nx * s), Math.round(fy + ny * s), Math.round(fz - Math.abs(s) * 0.5), C.leaf[Math.abs(s) === 2 ? 1 : 2]); }
      }
    }
    v.blob(tx, ty + 1, tz - 1, 3, 3, 2.5, 0x6b5a2a, 9, 0.1);
    const ob = add('palm', 476, 256, v, { cx: 490, cy: 290 });
    splitAbove(ob, 20);
  }
  // bushes
  [[148, 112, 9], [478, 196, 8], [260, 412, 10], [380, 410, 8], [60, 404, 9], [600, 166, 8], [184, 282, 7], [430, 278, 7]].forEach(([x, y, r], i) => {
    const v = new Vox(r * 2 + 4, r * 2 + 4, r + 4);
    v.blob(r + 2, r + 2, r * 0.6, r, r * 0.85, r * 0.75, (xx, yy, z, dx, dy, dz) => {
      if (hash(xx, yy, z + i) > 0.96 && dz > 0.2) return [0xf06b8a, 0xffd34d, 0xffffff][i % 3];
      return j(C.leaf[Math.max(0, Math.min(4, Math.floor(vnoise(xx * 0.4, yy * 0.4, i) * 3 + (dz + 0.3) * 1.6)))], xx, yy, z, 0.1);
    }, i + 20, 0.3);
    add('bush' + i, x - r - 2, y - r - 2, v);
  });
  // street lamps
  [[204, 318], [430, 318]].forEach(([x, y], i) => {
    const v = new Vox(6, 16, 56);
    v.box(2, 2, 0, 4, 4, 52, (xx, yy, z, lx, ly, lz) => lz < 3 ? 0x6a6a6a : 0x4f5a55);
    v.box(1, 1, 0, 5, 5, 3, 0x7a7a7a);
    v.box(2, 2, 51, 4, 13, 53, 0x4f5a55);
    v.box(0, 8, 47, 6, 16, 51, (xx, yy, z, lx, ly, lz, f) => lz === 0 ? { c: 0xfff0b0, e: 1 } : (f === 'top' ? 0x5c6a64 : 0x3c4642));
    const ob = add('lamp' + i, x - 3, y - 3, v, { cx: x, cy: y });
    splitAbove(ob, 22);
  });
  // signposts at both ends of the road
  function signpost(id, x, y, dir) {
    const v = new Vox(30, 4, 26);
    v.box(2, 1, 0, 4, 3, 22, 0x6a6f72); v.box(26, 1, 0, 28, 3, 22, 0x6a6f72);
    v.box(0, 0, 12, 30, 3, 25, (xx, yy, z, lx, ly, lz, f) => {
      if (f !== 's') return f === 'top' ? 0x3a8f5f : 0x24603c;
      if (lx === 0 || lx === 29 || lz === 0 || lz === 12) return 0xe9efe9;
      // arrow
      const ax = dir < 0 ? lx : 29 - lx, az = lz - 6;
      if (ax >= 4 && ax <= 7 && Math.abs(az) <= (7 - ax) + 1 && Math.abs(az) <= 3) return 0xffffff;
      if (ax >= 7 && ax <= 13 && Math.abs(az) <= 1) return 0xffffff;
      if (ax >= 16 && ax <= 26 && (lz === 9 || lz === 6 || lz === 3) && (ax % 5 !== 0)) return 0xcfe3d6;
      return C.signGreen;
    });
    return add(id, x - 15, y - 2, v);
  }
  signpost('signW', 36, 314, -1);
  signpost('signE', 604, 314, 1);

  // ---------- object bookkeeping ----------
  for (const ob of objects) {
    ob.baked = ob.vox.bake();
    if (ob.cx === undefined) { ob.cx = ob.x + ob.vox.w / 2; ob.cy = ob.y + ob.vox.d / 2; }
    // sort key: southern-most occupied row near the ground
    let maxY = -1; const v = ob.vox;
    for (let z = 0; z < Math.min(v.h, 20); z++) for (let y = v.d - 1; y > maxY; y--) for (let x = 0; x < v.w; x++) if (v.c[v.i(x, y, z)] >= 0) { maxY = y; break; }
    ob.sort = ob.above ? 100000 + ob.y + v.d : ob.y + (maxY >= 0 ? maxY + 1 : v.d);
    // top height (for markers / tap targets)
    let top = 0; for (const f of ob.baked.frames) top = Math.max(top, f.z + 1); ob.top = top;
  }

  // ---------- collision grid (4px cells) ----------
  const CELL = 4, GW = W / CELL, GH = H / CELL;
  const grid = new Uint8Array(GW * GH);
  for (const ob of objects) {
    if (!ob.solid || ob.above) continue; const v = ob.vox;
    for (let y = 0; y < v.d; y++) for (let x = 0; x < v.w; x++) {
      let hit = false; for (let z = 2; z < Math.min(20, v.h); z++) if (v.c[v.i(x, y, z)] >= 0) { hit = true; break; }
      if (!hit) continue;
      const gx = Math.floor((ob.x + x) / CELL), gy = Math.floor((ob.y + y) / CELL);
      if (gx >= 0 && gy >= 0 && gx < GW && gy < GH) grid[gy * GW + gx] = 1;
    }
  }
  // world edge blocks, except the road ends (exits)
  for (let gx = 0; gx < GW; gx++) { grid[gx] = 1; grid[(GH - 1) * GW + gx] = 1; }
  for (let gy = 0; gy < GH; gy++) {
    const wy = gy * CELL; const road = wy >= 326 && wy < 368;
    if (!road) { grid[gy * GW] = 1; grid[gy * GW + GW - 1] = 1; }
  }

  // ---------- ground ----------
  function paintGround() {
    const [cv, ctx] = canvas(W, H);
    const img = ctx.createImageData(W, H), d = img.data;
    const G = [0x4d7a2e, 0x5b8a35, 0x6a9a3c, 0x79a845, 0x86b44e];
    const SOIL = [0x7d5e3c, 0x8e6c45, 0x9c7a50, 0xab8a5e];
    const put = (x, y, c) => { const p = (y * W + x) * 4; d[p] = (c >> 16) & 255; d[p + 1] = (c >> 8) & 255; d[p + 2] = c & 255; d[p + 3] = 255; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let c;
      const n = fbm(x / 46, y / 46, 1), n2 = hash(x, y, 2), n3 = fbm(x / 9, y / 9, 6);
      const yard = x >= 142 && x < 466 && y >= 128 && y < 298;
      // grass / soil
      const soilT = yard ? 0.62 : 0.36;
      if (n < soilT) { c = SOIL[Math.min(3, Math.floor(n3 * 4.4))]; if (n2 > 0.93) c = light(c, 1.18); if (n2 < 0.05) c = light(c, 0.8); if (n > soilT - 0.03 && n2 > 0.5) c = G[1]; }
      else { c = G[Math.min(4, Math.floor(n3 * 3.2 + (n - 0.4) * 4))]; if (n2 > 0.965) c = light(c, 1.25); }
      // grass blades: tiny dark/light vertical pairs
      if (n >= soilT && hash(x, y, 9) > 0.9) c = light(c, 0.78);
      if (n >= soilT + 0.05 && hash(x >> 1, y >> 1, 10) > 0.995) c = [0xffffff, 0xffd84d, 0xf28fb0][Math.floor(hash(x, y, 3) * 3)];
      // road
      if (y >= 316 && y < 380) {
        const edge = (y < 326 || y >= 370) ? 1 : 0;
        const rough = vnoise(x / 3, y / 3, 12);
        const inRoad = y >= 324 + rough * 3 && y < 372 - rough * 3;
        if (inRoad) {
          c = n2 > 0.9 ? 0x5c5b5e : n2 < 0.12 ? 0x3c3b3f : 0x4a494d;
          if (vnoise(x / 22, y / 10, 14) > 0.74) c = light(c, 0.88); // patch repairs
          if (Math.abs(y - 348) < 1 && (x % 24) < 10) c = 0xc9c3a8; // faded centre dashes
        } else if (edge || y < 330 || y >= 366) c = SOIL[Math.floor(n3 * 3)];
      }
      // paved path from the door to the gate and road
      if (x >= 286 && x < 322 && y >= 256 && y < 326) {
        const bx = (x - 286 + ((Math.floor((y - 256) / 10) % 2) ? 9 : 0)) % 18, by = (y - 256) % 10;
        const t = hash(Math.floor((x - 286 + ((Math.floor((y - 256) / 10) % 2) ? 9 : 0)) / 18), Math.floor((y - 256) / 10), 21);
        let base = mix(0xa8a196, 0xbdb5a5, t);
        if (n2 > 0.85) base = light(base, 0.92);
        if (bx === 0 || by === 0) c = light(base, 1.18); else if (bx === 17 || by === 9) c = light(base, 0.7); else c = base;
        if (bx === 0 && by === 0) c = 0x6f6a60;
      }
      // room floor: beveled terrazzo tiles
      if (x >= RX0 && x < RX1 && y >= RY0 && y < RY1) {
        const tx = (x - RX0) % 16, ty = (y - RY0) % 16;
        const tt = hash(Math.floor((x - RX0) / 16), Math.floor((y - RY0) / 16), 30);
        let base = mix(0xd3c6ae, 0xddd0b8, tt);
        base = light(base, 0.97 + fbm(x / 7, y / 7, 31) * 0.06); if (n2 < 0.035) base = light(base, 0.78); else if (n2 < 0.06) base = light(base, 0.9); else if (n2 > 0.975) base = light(base, 1.12); else if (n2 > 0.955) base = mix(base, 0x6f8a7f, 0.35);
        if (tx === 0 || ty === 0) c = 0x8f8676;
        else if (tx === 1 || ty === 1) c = light(base, 1.1);
        else if (tx === 15 || ty === 15) c = light(base, 0.82);
        else c = base;
      }
      // rug (cotton dhurrie)
      if (x >= 266 && x < 366 && y >= 150 && y < 222) {
        const lx = x - 266, ly = y - 150;
        if (lx < 2 || lx >= 98) c = ((ly % 2) === 0) ? 0xe8dcc0 : light(c, 0.9); // fringe
        else if (lx < 5 || lx >= 95 || ly < 3 || ly >= 69) c = 0x6e1f22;
        else {
          const band = Math.floor((ly - 3) / 6) % 4;
          c = [0xa83a2e, 0xb8432f, 0xd9a441, 0x2f4f7a][band];
          if ((ly - 3) % 6 === 0) c = 0x6e1f22;
          if (band === 2 && (lx + ly) % 6 === 0) c = 0x8a2a24;
          if (n2 > 0.92) c = light(c, 0.9);
        }
      }
      put(x, y, c);
    }
    ctx.putImageData(img, 0, 0);

    // ---- soft shadows: project every voxel onto the ground along the sun ----
    const [sc, sctx] = canvas(W, H);
    const mask = sctx.createImageData(W, H), md = mask.data;
    for (const ob of objects) {
      const v = ob.vox;
      for (let z = 0; z < v.h; z++) {
        const ox = ob.x + z * SUN.x, oy = ob.y + z * SUN.y;
        for (let y = 0; y < v.d; y++) for (let x = 0; x < v.w; x++) {
          if (v.c[(z * v.d + y) * v.w + x] < 0) continue;
          const gx = Math.round(ox + x), gy = Math.round(oy + y);
          if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
          md[(gy * W + gx) * 4 + 3] = 255;
        }
      }
    }
    sctx.putImageData(mask, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.42; ctx.filter = 'blur(1.6px)';
    ctx.globalCompositeOperation = 'multiply';
    const [tc, tctx] = canvas(W, H);
    tctx.drawImage(sc, 0, 0); tctx.globalCompositeOperation = 'source-in'; tctx.fillStyle = '#1d2a3a'; tctx.fillRect(0, 0, W, H);
    ctx.drawImage(tc, 0, 0);
    ctx.restore();
    // warm the room interior slightly, cool the outside a touch
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,190,120,0.25)'; ctx.fillRect(RX0 + 8, RY0 + 8, RX1 - RX0 - 16, RY1 - RY0 - 16); ctx.restore();
    return cv;
  }

  // ---------- landmarks, exits, story ----------
  const LANDMARKS = [
    { id: 'pc', name: 'The family computer', year: 'c. 1999', at: [228, 104], objs: ['desk', 'tower'],
      text: ['This beige box was the most interesting thing in our house. In 5th grade my mother sat me down in front of it and taught me to write my first programs.',
        'I liked the games on it too, but what I really wanted to know was how they were made.'] },
    { id: 'manuals', name: 'A shelf of user manuals', year: 'c. 1998', at: [398, 106], objs: ['shelf', 'manualStack'],
      text: ['Other kids had comics. I had the Windows 3.1, Windows 98 and DOS user manuals, and I read them for fun.',
        'Half of it made no sense at first. The other half I tried out on the computer straight away, one command at a time.'] },
    { id: 'toy', name: 'A toy truck, in pieces', year: 'c. 1997', at: [306, 220], objs: ['toy'],
      text: ['Most of my toys ended up like this sooner or later. I was not trying to break them; I wanted to see the motor, the gears and the wires that made them move.',
        'Putting them back together was the hard part, and the part I learned the most from.'] },
  ];
  const EXITS = [
    { id: 'west', label: '← 1990: the toddler', title: '1990: the toddler', sign: 'signW', at: [40, 346], test: (x) => x < 14,
      text: 'This stretch of road is not built yet. In the full game it leads back to era 8, where a toddler is fascinated by cars and trucks and keeps asking to visit car garages.' },
    { id: 'east', label: '2008: University of Mumbai →', title: '2008: University of Mumbai', sign: 'signE', at: [600, 346], test: (x) => x > 626,
      text: 'This stretch of road is not built yet. In the full game it leads forward to era 6, Computer Engineering at the University of Mumbai (2008 to 2012).' },
  ];

  global.WORLD = { W, H, SUN, objects, grid, CELL, GW, GH, paintGround, LANDMARKS, EXITS, ROOM: { x0: RX0, y0: RY0, x1: RX1, y1: RY1 },
    WINDOW: { x0: RX0 + 128, x1: RX0 + 176, y: RY0 + WT, z0: 9, z1: 19 } };
})(window);
