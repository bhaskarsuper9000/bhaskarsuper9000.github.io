/* Story mode slice, round 2: Phaser scene with sprite-stack depth, wall
   treatments, light pass, animated characters and live tuning (see settings.js). */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const DEBUG = Q.get('debug') === '1';
  const dbg = document.getElementById('debug'); if (DEBUG) dbg.hidden = false;
  function log(msg) { if (!DEBUG) return; dbg.hidden = false; const d = document.createElement('div'); d.textContent = msg; dbg.appendChild(d); }
  window.addEventListener('error', (e) => log('ERROR: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  window.addEventListener('unhandledrejection', (e) => log('REJECTION: ' + e.reason));
  const origErr = console.error; console.error = function () { log('console.error: ' + [].join.call(arguments, ' ')); origErr.apply(console, arguments); };

  const V = CFG.values;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'bb-story-v2';
  const store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  if (Q.get('reset') === '1') store.visited = [];
  store.visited = store.visited || [];
  if (Q.get('visited') !== null) store.visited = Q.get('visited').split(',').filter((v) => WORLD.LANDMARKS.some((l) => l.id === v));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode */ } };
  save();

  const S = { depth: Q.get('parallax') !== null ? Q.get('parallax') !== '0' : !reduced, char: null, scene: null, modal: null, near: null };
  const tiltNow = () => (S.depth ? V.tilt : 0);
  const leanNow = () => (S.depth ? V.lean * 0.001 : 0);
  const TOD = {
    morning: { mul: 0xfff0dc, glow: 0, pool: 0xffd9a0, poolA: 0.2, beam: 0.05, shadow: '#1d2a3a' },
    noon: { mul: 0xffffff, glow: 0, pool: 0xfff6e0, poolA: 0.12, beam: 0.03, shadow: '#20262e' },
    golden: { mul: 0xffdcb4, glow: 0.3, pool: 0xffb15c, poolA: 0.3, beam: 0.08, shadow: '#2a1f3a' },
    dusk: { mul: 0x6c72ab, glow: 1, pool: 0x8fa2ff, poolA: 0.04, beam: 0, shadow: '#151a33' },
  };

  // ======================= HUD =======================
  const $ = (s) => document.querySelector(s);
  const total = WORLD.LANDMARKS.length;
  function updateHud() {
    const n = store.visited.length, pct = Math.round((n / total) * 100);
    $('#pcount').textContent = `${n} / ${total} visited`;
    $('#ppct').textContent = pct + '%';
    $('#pbar').style.width = pct + '%';
    $('#progress').setAttribute('aria-valuenow', pct);
    if (S.scene) S.scene.refreshMarkers();
  }
  function setDepth(on) {
    S.depth = on;
    const b = $('#depthBtn'); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.querySelector('span').textContent = on ? 'on' : 'off';
  }
  $('#depthBtn').addEventListener('click', () => setDepth(!S.depth));
  $('#reset').addEventListener('click', () => { store.visited = []; save(); updateHud(); toast('Progress reset. The room is unexplored again.'); });
  let toastT;
  function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms || 3500); }

  // ======================= cards =======================
  const ground = WORLD.paintGround();
  const byId = Object.fromEntries(WORLD.objects.map((o) => [o.id, o]));
  const nWall = WORLD.objects.filter((o) => o.wall === 'N').map((o) => o.id);
  const BACKDROP = { pc: nWall.concat(['chair', 'almirah']), manuals: nWall.concat(['globe']), toy: [], west: [], east: [] };
  function portrait(ids, extra) {
    const T = V.tilt || 0.72, obs = ids.map((i) => byId[i]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const o of obs) { x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x + o.vox.w); y0 = Math.min(y0, o.y - o.top * T); y1 = Math.max(y1, o.y + o.vox.d); }
    x0 -= 10; x1 += 10; y0 -= 8; y1 += 12;
    const sc = 3, cv = document.createElement('canvas');
    cv.width = Math.round((x1 - x0) * sc); cv.height = Math.round((y1 - y0) * sc);
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, x0, y0, x1 - x0, y1 - y0, 0, 0, cv.width, cv.height);
    const all = obs.concat((extra || []).map((i) => byId[i])).filter((o) => o.baked.canvas).sort((a, b) => a.sort - b.sort);
    for (const o of all) PX.drawStack(ctx, o.baked, o.x - x0, o.y - y0, sc, T, 0);
    return cv;
  }
  let lastFocus = null;
  function openCard(kind, item) {
    if (S.modal) return;
    const m = $('#card');
    m.querySelector('.portrait').replaceChildren(portrait(kind === 'exit' ? [item.sign] : item.objs, BACKDROP[item.id]));
    m.querySelector('.year').textContent = kind === 'exit' ? 'Not built yet' : item.year;
    m.querySelector('#cardTitle').textContent = kind === 'exit' ? item.title : item.name;
    const tx = m.querySelector('.text'); tx.replaceChildren();
    for (const p of (kind === 'exit' ? [item.text, 'For now the story ends here. Turn back and keep exploring, or skip ahead to the resume.'] : item.text)) { const el = document.createElement('p'); el.textContent = p; tx.appendChild(el); }
    m.querySelector('.card-close').textContent = kind === 'exit' ? 'Turn back' : 'Close';
    m.dataset.kind = kind;
    lastFocus = document.activeElement;
    m.hidden = false; S.modal = { kind, item }; keys.clear();
    m.querySelector('.card-close').focus();
    if (kind === 'landmark' && !store.visited.includes(item.id)) {
      store.visited.push(item.id); save(); updateHud();
      if (store.visited.length === total) setTimeout(() => toast('Era 7 explored: 100%. The roads east and west are not built yet in this prototype.', 6000), 400);
    }
  }
  function closeCard() {
    if (!S.modal) return;
    const was = S.modal; S.modal = null; $('#card').hidden = true;
    if (was.kind === 'exit' && S.scene) S.scene.pushBack(was.item);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('#card .card-close').addEventListener('click', closeCard);
  $('#card').addEventListener('click', (e) => { if (e.target.id === 'card') closeCard(); });

  // ======================= input =======================
  const keys = new Set();
  const MAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.modal) { e.preventDefault(); closeCard(); return; }
    if (S.modal || S.char === null) return;
    const t = e.target;
    if (t && t.closest && t.closest('input, select, textarea')) return;
    if (t && t.closest && t.closest('button, a') && (e.code === 'Space' || e.code === 'Enter')) return;
    if (MAP[e.code]) { keys.add(MAP[e.code]); e.preventDefault(); hideHintSoon(); if (S.scene) S.scene.cancelPath(); }
    if ((e.code === 'Space' || e.code === 'Enter') && S.near) { e.preventDefault(); openCard('landmark', S.near); }
    if (e.code === 'KeyP') setDepth(!S.depth);
  });
  window.addEventListener('keyup', (e) => { if (MAP[e.code]) keys.delete(MAP[e.code]); });
  window.addEventListener('blur', () => keys.clear());
  $('#prompt').addEventListener('click', () => { if (S.near) openCard('landmark', S.near); });
  let hintTimer;
  function hideHintSoon() { if (hintTimer) return; hintTimer = setTimeout(() => { $('#hint').classList.add('gone'); }, 5000); }
  $('#hintClose').addEventListener('click', () => $('#hint').classList.add('gone'));
  if (Q.get('hint') === '0') $('#hint').classList.add('gone');

  // ======================= A* on the collision grid =======================
  const { grid, CELL, GW, GH } = WORLD;
  const free = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    let ok = 1;
    for (let dy = -1; dy <= 0 && ok; dy++) for (let dx = -1; dx <= 1; dx++) { const gx = x + dx, gy = y + dy; if (gx < 0 || gy < 0 || gx >= GW || gy >= GH || grid[gy * GW + gx]) { ok = 0; break; } }
    free[y * GW + x] = ok;
  }
  function nearestFree(gx, gy) {
    for (let r = 0; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = gx + dx, y = gy + dy; if (x >= 0 && y >= 0 && x < GW && y < GH && free[y * GW + x]) return [x, y];
    }
    return null;
  }
  function astar(sx, sy, tx, ty) {
    const s = nearestFree(sx, sy), t = nearestFree(tx, ty); if (!s || !t) return null;
    const N = GW * GH, g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = []; const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const si = s[1] * GW + s[0], ti = t[1] * GW + t[0];
    const h = (i) => { const dx = Math.abs(i % GW - t[0]), dy = Math.abs(((i / GW) | 0) - t[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    g[si] = 0; push(si, h(si));
    while (heap.length) {
      const [, i] = pop(); if (closed[i]) continue; closed[i] = 1; if (i === ti) break;
      const x = i % GW, y = (i / GW) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const ni = ny * GW + nx; if (!free[ni] || closed[ni]) continue;
        if (dx && dy && (!free[y * GW + nx] || !free[ny * GW + x])) continue;
        const ng = g[i] + (dx && dy ? 1.414 : 1); if (ng < g[ni]) { g[ni] = ng; came[ni] = i; push(ni, ng + h(ni)); }
      }
    }
    if (came[ti] < 0 && si !== ti) return null;
    const path = []; for (let i = ti; i !== si && i >= 0; i = came[i]) path.push([(i % GW) * CELL + CELL / 2, ((i / GW) | 0) * CELL + CELL / 2]);
    path.reverse();
    const out = []; for (let k = 0; k < path.length; k++) { if (k === path.length - 1 || k % 3 === 0) out.push(path[k]); }
    return out;
  }
  const blockedAt = (x, y) => {
    for (const [px, py] of [[x - 4, y - 3], [x + 3.9, y - 3], [x - 4, y], [x + 3.9, y], [x, y - 3], [x, y]]) {
      const gx = Math.floor(px / CELL), gy = Math.floor(py / CELL);
      if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return gx < 0 || gx >= GW ? !(y > 326 && y < 368) : true;
      if (grid[gy * GW + gx]) return true;
    }
    return false;
  };
  const R = WORLD.ROOM;
  const inRoom = (x, y) => x > R.x0 + 6 && x < R.x1 - 6 && y > R.y0 + 6 && y < R.y1 + 4;

  // pack many small canvases into a few big atlases (keeps WebGL batching happy)
  function pack(items) {
    const MAXW = 4096, atlases = []; let cur = null, x = 0, y = 0, rowH = 0;
    items.sort((a, b) => b.h - a.h);
    for (const it of items) {
      if (cur && x + it.w > MAXW) { x = 0; y += rowH; rowH = 0; }
      if (!cur || y + it.h > MAXW) { cur = { h: 0, list: [] }; atlases.push(cur); x = 0; y = 0; rowH = 0; }
      it.atlas = atlases.length - 1; it.ax = x; it.ay = y; cur.list.push(it);
      x += it.w + 2; rowH = Math.max(rowH, it.h + 2); cur.h = Math.max(cur.h, y + it.h + 2);
    }
    return atlases.map((a) => { const [c, ctx] = PX.canvas(MAXW, a.h); for (const it of a.list) ctx.drawImage(it.canvas, it.ax, it.ay); return c; });
  }

  // ======================= Phaser scene =======================
  class Region extends Phaser.Scene {
    constructor() { super('region'); }
    create() {
      S.scene = this;
      const tex = this.textures;
      tex.addCanvas('ground', ground);
      this.add.image(0, 0, 'ground').setOrigin(0, 0).setDepth(-1000);
      this.add.image(0, 0, 'ground').setOrigin(0, 1).setFlipY(true).setDepth(-1001);
      this.add.image(0, WORLD.H, 'ground').setOrigin(0, 0).setFlipY(true).setDepth(-1001);

      // AO + shadow layers (rebuilt live when the sun knobs change)
      this.aoTex = tex.createCanvas('ao', WORLD.W, WORLD.H);
      { const c = this.aoTex.context, m = WORLD.aoMask(); c.filter = 'blur(2.6px)'; c.drawImage(m, 0, 0); c.drawImage(m, 0, 0); c.filter = 'none'; c.globalCompositeOperation = 'source-in'; c.fillStyle = '#0c1016'; c.fillRect(0, 0, WORLD.W, WORLD.H); c.globalCompositeOperation = 'source-over'; this.aoTex.refresh(); }
      this.aoImg = this.add.image(0, 0, 'ao').setOrigin(0).setDepth(-899);
      this.shTex = tex.createCanvas('shadow', WORLD.W, WORLD.H);
      this.shImg = this.add.image(0, 0, 'shadow').setOrigin(0).setDepth(-900);
      this.maskCache = {};
      this.rebuildShadows();

      // ---- sprite stacks from atlases ----
      const items = [];
      for (const ob of WORLD.objects) {
        if (ob.shadowOnly) continue;
        items.push({ kind: 'ob', ob, canvas: ob.baked.canvas, w: ob.baked.canvas.width, h: ob.baked.canvas.height });
        if (ob.cap) items.push({ kind: 'cap', ob, canvas: ob.cap, w: ob.cap.width, h: ob.cap.height });
      }
      for (const c of WORLD.CANOPIES) c.layers.forEach((l, i) => items.push({ kind: 'leaf', c, i, canvas: l.canvas, w: l.w, h: l.h }));
      const atlases = pack(items);
      atlases.forEach((c, i) => tex.addCanvas('atlas' + i, c));
      this.stacks = []; const stackOf = {};
      for (const it of items) {
        const key = 'atlas' + it.atlas, t = tex.get(key);
        if (it.kind === 'ob') {
          const ob = it.ob, slices = [];
          for (const f of ob.baked.frames) {
            const fn = ob.id + ':' + f.z; t.add(fn, 0, it.ax + f.x, it.ay + f.y, ob.baked.w, ob.baked.d);
            slices.push({ img: this.add.image(ob.x, ob.y, key, fn).setOrigin(0).setDepth(ob.sort + f.z * 0.001), z: f.z, bx: ob.x, by: ob.y, key, fn });
          }
          const st = { id: ob.id, ob, cx: ob.cx, cy: ob.cy, top: ob.top, sort: ob.sort, wall: ob.wall || null, slices, ox: 0, oy: 0 };
          this.stacks.push(st); stackOf[ob.id] = st;
        }
      }
      for (const it of items) {
        const key = 'atlas' + it.atlas, t = tex.get(key);
        if (it.kind === 'cap') {
          const st = stackOf[it.ob.id], fn = it.ob.id + ':cap'; t.add(fn, 0, it.ax, it.ay, it.w, it.h);
          st.cap = this.add.image(it.ob.x, it.ob.y, key, fn).setOrigin(0).setVisible(false);
        }
        if (it.kind === 'leaf') {
          const c = it.c; let st = stackOf['leaf-' + c.id];
          if (!st) { st = { id: 'leaf-' + c.id, cx: c.cx, cy: c.cy, top: 0, sort: 100000 + c.cy + c.R, slices: [], ox: 0, oy: 0 }; stackOf[st.id] = st; this.stacks.push(st); }
          const l = c.layers[it.i], fn = st.id + ':' + it.i; t.add(fn, 0, it.ax, it.ay, l.w, l.h);
          const bx = c.cx - l.w / 2, by = c.cy - l.h / 2;
          st.slices.push({ img: this.add.image(bx, by, key, fn).setOrigin(0).setDepth(st.sort + l.z * 0.001), z: l.z, bx, by, key, fn });
          st.top = Math.max(st.top, l.z);
        }
      }
      this.stackById = stackOf;
      // wall groups (for the rigid mode + fade render textures)
      this.wallSides = {};
      for (const st of this.stacks) if (st.wall) { const g = this.wallSides[st.wall] || (this.wallSides[st.wall] = { stacks: [], cx: 0, cy: 0, x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, sort: 0 }); g.stacks.push(st); g.x0 = Math.min(g.x0, st.ob.x); g.y0 = Math.min(g.y0, st.ob.y); g.x1 = Math.max(g.x1, st.ob.x + st.ob.vox.w); g.y1 = Math.max(g.y1, st.ob.y + st.ob.vox.d); g.sort = Math.max(g.sort, st.sort); }
      for (const k in this.wallSides) { const g = this.wallSides[k]; g.cx = (g.x0 + g.x1) / 2; g.cy = (g.y0 + g.y1) / 2; g.h = 24; g.alpha = 1; g.full = 24; }

      // small generated textures
      const mk = (key, w, h, draw) => { const [c, x] = PX.canvas(w, h); draw(x, c); tex.addCanvas(key, c); };
      mk('dot', 2, 2, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 2, 2); });
      mk('pshadow', 24, 10, (x) => { x.filter = 'blur(1.2px)'; x.fillStyle = 'rgba(16,22,32,0.55)'; x.beginPath(); x.ellipse(12, 5, 8.5, 3, 0, 0, Math.PI * 2); x.fill(); x.filter = 'none'; x.fillStyle = 'rgba(10,14,20,0.35)'; x.beginPath(); x.ellipse(12, 5, 5, 1.6, 0, 0, Math.PI * 2); x.fill(); });
      mk('puff', 8, 6, (x) => { const g = x.createRadialGradient(4, 3, 0, 4, 3, 4); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 8, 6); });
      mk('glow', 64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
      mk('ring', 30, 14, (x) => { x.strokeStyle = 'rgba(255,233,140,1)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(15, 7, 13, 5.5, 0, 0, Math.PI * 2); x.stroke(); x.fillStyle = 'rgba(255,220,120,0.18)'; x.fill(); });
      mk('mk-new', 9, 12, (x) => {
        const rows = ['....k....', '...kyk...', '..kyYyk..', '.kyYYyyk.', 'kyYYwYyyk', '.kyyyyok.', '..kyyok..', '...kok...', '....k....'];
        const pal = { k: 0x5a3a08, y: 0xf7c531, Y: 0xffe58a, w: 0xffffff, o: 0xd08a12 };
        rows.forEach((r, yy) => [...r].forEach((ch, xx) => { if (pal[ch] !== undefined) PX.px(x, xx, yy, pal[ch]); }));
      });
      mk('mk-done', 11, 11, (x) => {
        const rows = ['...kkkkk...', '..kgggggk..', '.kgGGgggGk.', 'kgGgggggwgk', 'kggggggwwgk', 'kgwggwwwggk', 'kgwwwwwgggk', 'kggwwwggggk', '.kgggggggk.', '..kgggggk..', '...kkkkk...'];
        const pal = { k: 0x14401f, g: 0x3fb05a, G: 0x8be29a, w: 0xffffff };
        rows.forEach((r, yy) => [...r].forEach((ch, xx) => { if (pal[ch] !== undefined) PX.px(x, xx, yy, pal[ch]); }));
      });
      // clouds: fbm noise, lit from the north-west, posterised for a pixel feel
      for (let k = 0; k < 3; k++) mk('cloud' + k, 220, 130, (x) => {
        const w = 220, h = 130, img = x.createImageData(w, h), sd = 50 + k * 17;
        const dens = (px, py) => { const fx = (px - w / 2) / (w * 0.46), fy = (py - h / 2) / (h * 0.42); return PX.fbm(px / 34, py / 26, sd) * 1.35 - (fx * fx + fy * fy) * 0.85 - 0.28; };
        for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
          const d = dens(px, py); if (d <= 0) continue;
          const a = Math.min(1, d / 0.3), lit = dens(px - 3, py - 3) - dens(px + 3, py + 3);
          const sh = Math.max(0, Math.min(1, 0.62 + lit * 2.4 + d * 0.4));
          const tone = Math.round(sh * 4) / 4, col = PX.mix(0xa9b6cc, 0xffffff, tone), p = (py * w + px) * 4;
          img.data[p] = (col >> 16) & 255; img.data[p + 1] = (col >> 8) & 255; img.data[p + 2] = col & 255; img.data[p + 3] = Math.round(Math.round(a * 6) / 6 * 255);
        }
        x.putImageData(img, 0, 0);
      });

      // landmark rings + markers
      this.marks = WORLD.LANDMARKS.map((lm) => {
        const ring = this.add.image(lm.at[0], lm.at[1] - 2, 'ring').setDepth(-800).setAlpha(0.8);
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, top = 0;
        for (const o of lm.objs.map((i) => byId[i])) { x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x + o.vox.w); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y + o.vox.d); top = Math.max(top, o.top); }
        const m = this.add.image(0, 0, 'mk-new').setDepth(270000);
        return { lm, ring, m, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, top: top + 8 };
      });
      this.refreshMarkers();

      // window light, motes
      this.beam = this.add.graphics().setDepth(5000).setBlendMode(Phaser.BlendModes.ADD);
      this.motes = []; const rr = PX.rng(99);
      for (let i = 0; i < 26; i++) this.motes.push({ img: this.add.image(0, 0, 'dot').setScale(0.5).setDepth(5001).setBlendMode(Phaser.BlendModes.ADD), u: rr(), v: rr(), w: rr(), ph: rr() * 6.28 });

      // clouds (pool of 10) and their shadows
      this.clouds = []; const cr = PX.rng(5);
      for (let i = 0; i < 10; i++) {
        const c = { x: -160 + ((i * 397) % 900), y: [60, 300, 160, 420, 30, 250, 380, 110, 200, 330][i], k: i % 3, s: 0.8 + cr() * 0.6 };
        c.shadow = this.add.image(0, 0, 'cloud' + c.k).setScale(c.s).setTint(0x0d1a10).setDepth(-850);
        c.img = this.add.image(0, 0, 'cloud' + c.k).setScale(c.s).setDepth(240000);
        this.clouds.push(c);
      }
      // time-of-day tint (multiply) and light glows above it
      this.tint = this.add.rectangle(-400, -400, WORLD.W + 800, WORLD.H + 800, 0xffffff).setOrigin(0).setDepth(250000).setBlendMode(Phaser.BlendModes.MULTIPLY);
      const glow = (x, y, z, col, sx, sy, a) => ({ x, y, z, a, img: this.add.image(0, 0, 'glow').setTint(col).setScale(sx, sy).setDepth(260000).setBlendMode(Phaser.BlendModes.ADD) });
      this.glows = [
        glow(204, 330, 38, 0xffd27a, 0.7, 0.6, 1), glow(430, 330, 38, 0xffd27a, 0.7, 0.6, 1),
        glow(204, 334, 0, 0xffb45a, 2.4, 1.5, 0.45), glow(430, 334, 0, 0xffb45a, 2.4, 1.5, 0.45),
        glow(R.x0 + 232, R.y0 + 10, 21, 0xe8f4ff, 1.4, 0.45, 0.9), glow(304, 150, 0, 0xcfe4ff, 5.2, 3.6, 0.32),
        glow(199, 76, 24, 0x6fe8e8, 0.5, 0.4, 0.7),
      ];
      this.dust = []; for (let i = 0; i < 14; i++) this.dust.push(this.add.image(0, 0, 'puff').setVisible(false).setDepth(-700));
      this.dustI = 0;

      this.signs = WORLD.EXITS.map((ex) => {
        const el = document.createElement('button'); el.className = 'sign-label'; el.textContent = ex.label; el.type = 'button';
        el.addEventListener('click', () => this.goTo(ex.at[0], ex.at[1], () => this.exitTo(ex)));
        $('#labels').appendChild(el);
        return { ex, el, ob: byId[ex.sign] };
      });

      const cam = this.cameras.main;
      cam.setBackgroundColor('#3c5f2c');
      this.fitZoom();
      this.scale.on('resize', () => this.fitZoom());
      cam.centerOn(304, 170);
      this.input.on('pointerdown', (p) => this.onTap(p));
      this.t0 = 0;
      this.applyLook('*');
      CFG.on((k) => this.applyLook(k));
      this.layout();
      S.ready = true;
      if (S.pendingChar !== undefined) this.spawn(S.pendingChar);
    }

    // ---- live settings ----
    applyLook(k) {
      const all = k === '*';
      if (all || k === 'sun' || k === 'shadowLen' || k === 'shadowSoft' || k === 'tod') { clearTimeout(this._shT); this._shT = setTimeout(() => this.rebuildShadows(), all ? 0 : 120); }
      if (all || k === 'zoom') this.fitZoom();
      if (all || k === 'follow') this.cameras.main.setLerp(V.follow, V.follow);
      if (all || k === 'charH' || k === 'charSnap' || k === 'zoom') this.scalePlayer();
      const canvas = this.game.canvas; if (canvas) canvas.style.filter = `saturate(${V.sat}) contrast(${V.contrast})`;
      $('#vignette').style.background = `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) ${Math.round(70 - V.vignette * 25)}%, rgba(8,6,16,${(V.vignette * 0.85).toFixed(2)}) 100%)`;
      const tod = TOD[V.tod] || TOD.morning; this.tint.setFillStyle(tod.mul);
    }
    rebuildShadows() {
      const a = V.sun * Math.PI / 180, sx = Math.cos(a) * V.shadowLen, sy = Math.sin(a) * V.shadowLen;
      const key = sx.toFixed(3) + ',' + sy.toFixed(3);
      const m = this.maskCache[key] || (this.maskCache[key] = WORLD.shadowMask(sx, sy));
      const c = this.shTex.context; c.clearRect(0, 0, WORLD.W, WORLD.H);
      c.filter = V.shadowSoft > 0 ? `blur(${V.shadowSoft}px)` : 'none'; c.drawImage(m, 0, 0); c.filter = 'none';
      c.globalCompositeOperation = 'source-in'; c.fillStyle = (TOD[V.tod] || TOD.morning).shadow; c.fillRect(0, 0, WORLD.W, WORLD.H); c.globalCompositeOperation = 'source-over';
      this.shTex.refresh();
    }
    fitZoom() {
      const w = this.scale.width, h = this.scale.height;
      const z = V.zoom !== 'auto' ? +V.zoom : Math.max(2, Math.min(5, Math.floor(Math.min(w / 420, h / 250))));
      const cam = this.cameras.main; cam.setZoom(z);
      const hud = document.querySelector('.hud'), pad = Math.ceil(((hud ? hud.getBoundingClientRect().bottom : 50) + 6) / z);
      cam.setBounds(0, -pad, WORLD.W, WORLD.H + pad + 10);
      this.scalePlayer();
    }
    scalePlayer() {
      if (!this.player) return;
      const z = this.cameras.main.zoom; let s = V.charH / CHARS.H;
      if (V.charSnap) { const d = z * (window.devicePixelRatio || 1); s = Math.max(1, Math.round(s * d)) / d; } // whole device pixels per sprite pixel
      this.player.setScale(s); this.pshadow.setScale(s * 1.05, s);
    }

    spawn(ci) {
      const spots = { pc: [228, 106], manuals: [398, 108], toy: [306, 222], west: [40, 346], east: [600, 346], door: [304, 270], lane: [330, 350] };
      const at = spots[Q.get('at')] || [304, 140];
      const fr = CHARS.build(ci), names = [], sheet = document.createElement('canvas');
      const list = []; for (const dir of ['down', 'up', 'side']) { fr[dir].walk.forEach((c, k) => list.push([dir + '-w' + k, c])); fr[dir].idle.forEach((c, k) => list.push([dir + '-i' + k, c])); }
      sheet.width = CHARS.W * list.length; sheet.height = CHARS.H;
      const sctx = sheet.getContext('2d'); list.forEach(([n, c], i) => { sctx.drawImage(c, i * CHARS.W, 0); names.push(n); });
      const key = 'pl' + ci; if (this.textures.exists(key)) this.textures.remove(key);
      const t = this.textures.addCanvas(key, sheet); names.forEach((n, i) => t.add(n, 0, i * CHARS.W, 0, CHARS.W, CHARS.H));
      this.pshadow = this.add.image(at[0], at[1], 'pshadow').setDepth(-840).setAlpha(0.9);
      this.pdir = Q.get('at') && Q.get('at') !== 'door' ? 'up' : (Q.get('face') || 'down'); if (Q.get('face') === 'left' || Q.get('face') === 'right') this.pdir = 'side';
      this.player = this.add.image(at[0], at[1], key, this.pdir + '-i0').setOrigin(0.5, 1).setFlipX(Q.get('face') === 'left');
      this.vel = { x: 0, y: 0 }; this.phase = 0; this.idleT = Math.random() * 2; this.lastStep = -1; this.path = null;
      this.scalePlayer();
      this.cameras.main.startFollow(this.player, true, V.follow, V.follow, 0, 10);
      this.cameras.main.centerOn(at[0], at[1] - 10);
      S.char = ci;
      this.layout();
      if (DEBUG) this.selfTests();
      const card = Q.get('card');
      if (card) { const lm = WORLD.LANDMARKS.find((l) => l.id === card); const ex = WORLD.EXITS.find((e) => e.id === card); if (lm) openCard('landmark', lm); else if (ex) openCard('exit', ex); }
    }
    // debug-only self tests: headless Chrome runs few animation frames, so these step the movement directly
    selfTests() {
      const step = (n) => { for (let i = 0; i < n; i++) this.movePlayer(1 / 30); this.layout(); };
      const test = Q.get('test');
      if (test === 'tap') setTimeout(() => {
        const st = this.stackById.toy; this.onTap({ worldX: st.ob.x + 30, worldY: st.ob.y + 20 });
        log('tap test: path of ' + (this.path ? this.path.length : 'none') + ' waypoints'); step(180);
        log(`after 6 s: player at ${this.player.x.toFixed(0)},${this.player.y.toFixed(0)}; card open: ${S.modal ? S.modal.item.id : 'no'}`);
      }, 300);
      if (test === 'keys') setTimeout(() => {
        const ev = (t, code) => window.dispatchEvent(new KeyboardEvent(t, { code, bubbles: true }));
        const x0 = this.player.x; ev('keydown', 'KeyD'); const sp = []; for (let i = 0; i < 12; i++) { step(1); sp.push(Math.hypot(this.vel.x, this.vel.y).toFixed(0)); }
        ev('keyup', 'KeyD'); const st = []; for (let i = 0; i < 8; i++) { step(1); st.push(Math.hypot(this.vel.x, this.vel.y).toFixed(0)); }
        log(`keys test: speed ramp up ${sp.join(' ')} | ramp down ${st.join(' ')} | moved ${(this.player.x - x0).toFixed(1)}px | frame ${this.player.frame.name}`);
      }, 300);
    }
    refreshMarkers() {
      if (!this.marks) return;
      for (const mk of this.marks) { const v = store.visited.includes(mk.lm.id); mk.m.setTexture(v ? 'mk-done' : 'mk-new'); mk.ring.setVisible(!v); }
    }
    cancelPath() { this.path = null; this.onArrive = null; }
    goTo(x, y, onArrive) {
      if (!this.player) return;
      const p = astar(Math.floor(this.player.x / CELL), Math.floor(this.player.y / CELL), Math.floor(x / CELL), Math.floor(y / CELL));
      if (!p) return;
      this.path = p; this.onArrive = onArrive || null; hideHintSoon();
    }
    onTap(p) {
      if (S.modal || !this.player) return;
      const wx = p.worldX, wy = p.worldY;
      for (const mk of this.marks) for (const id of mk.lm.objs) {
        const s = this.stackById[id], o = s.ob, top = o.top;
        const bx0 = o.x + Math.min(0, s.ox * top), bx1 = o.x + o.vox.w + Math.max(0, s.ox * top), by0 = o.y + s.oy * top - 4, by1 = o.y + o.vox.d;
        if (wx >= bx0 && wx <= bx1 && wy >= by0 && wy <= by1) {
          const lm = mk.lm;
          if (Math.hypot(this.player.x - lm.at[0], this.player.y - lm.at[1]) < 30) { openCard('landmark', lm); return; }
          this.goTo(lm.at[0], lm.at[1], () => openCard('landmark', lm)); return;
        }
      }
      for (const sg of this.signs) { const o = sg.ob; if (wx >= o.x - 4 && wx <= o.x + o.vox.w + 4 && wy >= o.y - 24 && wy <= o.y + 10) { this.goTo(sg.ex.at[0], sg.ex.at[1], () => this.exitTo(sg.ex)); return; } }
      this.goTo(wx, wy);
      const r = this.add.image(wx, wy, 'ring').setDepth(-790).setScale(0.6).setAlpha(0.9);
      this.tweens.add({ targets: r, scale: 0.2, alpha: 0, duration: reduced ? 1 : 450, onComplete: () => r.destroy() });
    }
    exitTo(ex) { openCard('exit', ex); }
    pushBack(ex) { if (!this.player) return; this.player.x = ex.id === 'west' ? 34 : 606; this.player.y = 346; this.vel = { x: 0, y: 0 }; this.pdir = 'side'; this.player.setFlipX(ex.id !== 'west'); this.path = null; }

    view() {
      const cam = this.cameras.main, z = cam.zoom, w = cam.width / z, h = cam.height / z;
      const cx = cam.scrollX + cam.width / 2, cy = cam.scrollY + cam.height / 2;
      return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy, z };
    }
    // lean depends on position only (clamped as if every object were 40 voxels tall),
    // so split objects (lamp head / pole, trunk / canopy) and wall segments stay aligned
    lean(cx, cy) {
      const L = leanNow(); let lx = (cx - this.ccx) * L, ly = (cy - this.ccy) * L;
      const m = Math.hypot(lx, ly) * 40;
      if (m > V.leanClamp) { const f = m > 0 ? V.leanClamp / m : 0; lx *= f; ly *= f; }
      return [lx, ly - tiltNow()];
    }
    proj(x, y, z) { const [ox, oy] = this.lean(x, y, Math.max(z, 1)); return [x + z * ox, y + z * oy]; }

    // ---- wall treatments ----
    wallTargets() {
      const inside = this.player && inRoom(this.player.x, this.player.y);
      const low = Math.min(24, V.wallH);
      const t = {};
      for (const side of ['N', 'S', 'E', 'W']) {
        let h = 24, a = 1;
        if (V.walls === 'low') h = low;
        else if (V.walls === 'cutaway') h = side === 'N' ? 24 : (inside ? low : 24);
        else if (V.walls === 'fade') a = side === 'N' || !inside ? 1 : 0.3;
        if (!S.depth) { h = 24; }
        t[side] = { h, a };
      }
      return t;
    }
    layout(dt) {
      dt = dt || 0;
      const wv = this.view(); this.ccx = wv.cx; this.ccy = wv.cy;
      const tgt = this.wallTargets(), k = reduced || !dt ? 1 : Math.min(1, dt * 7);
      for (const side in this.wallSides) { const g = this.wallSides[side]; g.h += (tgt[side].h - g.h) * k; g.alpha += (tgt[side].a - g.alpha) * k; if (Math.abs(g.h - tgt[side].h) < 0.05) g.h = tgt[side].h; }
      for (const st of this.stacks) {
        let ox, oy;
        if (st.wall) {
          const g = this.wallSides[st.wall];
          if (V.wallLean === 'none') { ox = 0; oy = -tiltNow(); }
          else if (V.wallLean === 'rigid') [ox, oy] = this.lean(g.cx, g.cy, st.top);
          else [ox, oy] = this.lean(st.cx, st.cy, st.top);
        } else [ox, oy] = this.lean(st.cx, st.cy, st.top);
        st.ox = ox; st.oy = oy;
        const hcut = st.wall ? Math.round(this.wallSides[st.wall].h) : 1e9;
        for (const s of st.slices) { s.img.setPosition(s.bx + s.z * ox, s.by + s.z * oy); s.img.setVisible(s.z < hcut); }
        if (st.cap) {
          const show = hcut < st.top;
          st.cap.setVisible(show);
          if (show) st.cap.setPosition(st.ob.x + hcut * ox, st.ob.y + hcut * oy).setDepth(st.sort + hcut * 0.001);
        }
      }
      // faded walls are composited per side so the stacked slices fade as one surface
      for (const side in this.wallSides) {
        const g = this.wallSides[side];
        if (g.alpha < 0.99) {
          if (!g.rt) { const pad = 40; g.rx = g.x0 - pad; g.ry = g.y0 - pad; g.rt = this.add.renderTexture(g.rx, g.ry, g.x1 - g.x0 + pad * 2, g.y1 - g.y0 + pad * 2).setOrigin(0).setDepth(g.sort + 0.5); }
          g.rt.clear(); g.rt.beginDraw();
          for (const st of g.stacks) for (const s of st.slices) { if (!s.img.visible) continue; s.img.setVisible(false); g.rt.batchDrawFrame(s.key, s.fn, s.img.x - g.rx, s.img.y - g.ry); }
          g.rt.endDraw(); g.rt.setVisible(true).setAlpha(g.alpha);
        } else if (g.rt) g.rt.setVisible(false);
      }
    }

    update(time, dtMs) {
      const dt = Math.min(0.05, dtMs / 1000);
      this.t0 += dt;
      this.movePlayer(dt);
      this.layout(dt);
      const cam = this.cameras.main, tod = TOD[V.tod] || TOD.morning;
      for (const mk of this.marks) {
        const [x, y] = this.proj(mk.cx, mk.cy, mk.top);
        mk.m.setPosition(x, y - (reduced ? 0 : Math.sin(this.t0 * 3 + mk.cx) * 1.5));
        if (!reduced) mk.ring.setAlpha(0.55 + Math.sin(this.t0 * 4) * 0.3);
      }
      // window light pool + beam
      const W0 = WORLD.WINDOW, g = this.beam; g.clear();
      const fa = 0.55, fb = 2.3, fl = (x, z) => [x + z * fa, W0.y + z * fb];
      const p = [fl(W0.x0 + 2, W0.z0), fl(W0.x1 - 2, W0.z0), fl(W0.x1 - 2, W0.z1), fl(W0.x0 + 2, W0.z1)];
      const wtop = [this.proj(W0.x0 + 2, W0.y, W0.z1), this.proj(W0.x1 - 2, W0.y, W0.z1)], wbot = [this.proj(W0.x0 + 2, W0.y, W0.z0), this.proj(W0.x1 - 2, W0.y, W0.z0)];
      const pts = (a) => a.map(([x, y]) => ({ x, y }));
      g.fillStyle(tod.pool, tod.poolA); g.fillPoints(pts(p), true);
      g.fillStyle(tod.pool, tod.poolA * 0.5); g.fillPoints(pts([[p[0][0] - 3, p[0][1] - 2], [p[1][0] + 3, p[1][1] - 2], [p[2][0] + 4, p[2][1] + 3], [p[3][0] - 4, p[3][1] + 3]]), true);
      if (tod.beam > 0) { g.fillStyle(0xfff0c8, tod.beam); g.fillPoints(pts([wtop[0], wtop[1], p[2], p[1], wbot[1], wbot[0]]), true); g.fillPoints(pts([wbot[0], wbot[1], p[1], p[0]]), true); }
      for (const m of this.motes) {
        const tt = reduced ? 0 : this.t0, z = W0.z0 + ((m.v * 14 + tt * 0.6) % 14) - 2, along = m.u;
        const bx = W0.x0 + 4 + m.w * 44 + Math.sin(tt * 0.7 + m.ph) * 2;
        const [x, y] = this.proj(bx + z * fa * along, W0.y + z * fb * along + 4, z * (1 - along));
        m.img.setPosition(x, y).setAlpha(tod.beam > 0 ? 0.35 + 0.35 * Math.sin(tt * 2 + m.ph) : 0);
      }
      // clouds
      const kp = S.depth ? 0.35 : 0;
      this.clouds.forEach((c, i) => {
        const on = i < V.clouds; c.img.setVisible(on); c.shadow.setVisible(on && V.cloudShadow > 0); if (!on) return;
        if (!reduced) { c.x += dt * V.cloudSpeed * (0.8 + c.s * 0.3); if (c.x > WORLD.W + 200) c.x = -200; }
        c.img.setPosition(c.x + (c.x - this.ccx) * kp, c.y + (c.y - this.ccy) * kp - tiltNow() * 50).setAlpha(V.cloudAlpha);
        const a = V.sun * Math.PI / 180; c.shadow.setPosition(c.x + Math.cos(a) * 60 * V.shadowLen, c.y + Math.sin(a) * 60 * V.shadowLen).setAlpha(V.cloudShadow);
      });
      // light: shadows/AO strength, glows
      this.shImg.setAlpha(V.shadow * (V.tod === 'dusk' ? 0.6 : 1)); this.aoImg.setAlpha(V.ao * 0.8);
      for (const gl of this.glows) {
        const [x, y] = this.proj(gl.x, gl.y, gl.z), flick = reduced ? 1 : 1 + Math.sin(this.t0 * 9 + gl.x) * 0.03;
        gl.img.setPosition(x, y).setAlpha(tod.glow * gl.a * flick).setVisible(tod.glow > 0);
      }
      // DOM labels
      const VV = this.view(), zx = VV.z, vx = VV.x, vy = VV.y;
      for (const sg of this.signs) {
        const o = sg.ob, [x, y] = this.proj(o.x + o.vox.w / 2, o.y, o.top + 2);
        const w = sg.el.offsetWidth, sw = this.scale.width, sx = (x - vx) * zx;
        sg.el.hidden = !this.player || sx < -10 || sx > sw + 10;
        const lx = Math.max(w / 2 + 6, Math.min(sw - w / 2 - 6, sx));
        sg.el.style.transform = `translate(${Math.round(lx - w / 2)}px, ${Math.round((y - vy) * zx - sg.el.offsetHeight)}px)`;
      }
      const pr = $('#prompt');
      if (S.near && !S.modal) {
        const mk = this.marks.find((m) => m.lm === S.near), [x, y] = this.proj(mk.cx, mk.cy, mk.top);
        pr.hidden = false; pr.querySelector('b').textContent = S.near.name;
        pr.style.transform = `translate(${Math.round((x - vx) * zx)}px, ${Math.round((y - vy) * zx - 18)}px) translate(-50%, -100%)`;
      } else pr.hidden = true;
      if (DEBUG && this.game.loop.frame % 30 === 0) $('#fps').textContent = `fps ${this.game.loop.actualFps.toFixed(0)} | ${this.game.renderer.type === 1 ? 'canvas' : 'webgl'} | depth ${S.depth ? 'on' : 'off'} | preset ${CFG.preset} | walls ${V.walls}/${V.wallLean} | images ${this.children.list.length} | cam ${VV.x.toFixed(0)},${VV.y.toFixed(0)} z${cam.zoom} | pl ${this.player ? this.player.x.toFixed(0) + ',' + this.player.y.toFixed(0) : '-'}`;
    }

    movePlayer(dt) {
      const pl = this.player; if (!pl) return;
      let ix = 0, iy = 0;
      if (!S.modal) { ix = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0); iy = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0); }
      let wantSpeed = V.speed;
      if (!ix && !iy && this.path && this.path.length && !S.modal) {
        const [tx, ty] = this.path[0], dx = tx - pl.x, dy = ty - pl.y, d = Math.hypot(dx, dy);
        if (d < 2.5) { this.path.shift(); if (!this.path.length) { this.path = null; const cb = this.onArrive; this.onArrive = null; if (cb) cb(); } }
        else {
          ix = dx / d; iy = dy / d;
          if (this.path.length === 1) wantSpeed = Math.min(V.speed, Math.sqrt(2 * V.accel * d) + 6); // ease into the final spot
        }
      }
      const il = Math.hypot(ix, iy); if (il) { ix /= il; iy /= il; }
      // accelerate toward the wanted velocity, brake a bit harder than we accelerate
      const wx = ix * wantSpeed, wy = iy * wantSpeed;
      let dvx = wx - this.vel.x, dvy = wy - this.vel.y; const dl = Math.hypot(dvx, dvy), amax = V.accel * (il ? 1 : 1.5) * dt;
      if (dl > amax) { dvx *= amax / dl; dvy *= amax / dl; }
      this.vel.x += dvx; this.vel.y += dvy;
      const ox = pl.x, oy = pl.y;
      if (!blockedAt(pl.x + this.vel.x * dt, pl.y)) pl.x += this.vel.x * dt; else this.vel.x = 0;
      if (!blockedAt(pl.x, pl.y + this.vel.y * dt)) pl.y += this.vel.y * dt; else this.vel.y = 0;
      const sp = Math.hypot(this.vel.x, this.vel.y);
      if (this.path && il && Math.hypot(pl.x - ox, pl.y - oy) < V.speed * dt * 0.1) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 0.4) { this.path = null; this.stuck = 0; } } else this.stuck = 0;
      // facing follows intent while walking, keeps the last facing when stopped
      const fx = il ? ix : this.vel.x, fy = il ? iy : this.vel.y;
      if (sp > 4 || il) { if (Math.abs(fx) > Math.abs(fy) * 1.05) { this.pdir = 'side'; pl.setFlipX(fx < 0); } else if (Math.abs(fy) > 0.01) { this.pdir = fy < 0 ? 'up' : 'down'; pl.setFlipX(false); } }
      if (sp > 6) {
        this.phase = (this.phase + sp * dt / 30 * V.animRate) % 1; // ~30 px per full stride cycle
        const f = Math.floor(this.phase * CHARS.WALK) % CHARS.WALK;
        pl.setFrame(this.pdir + '-w' + f); this.idleT = 0;
        if ((f === 1 || f === 4) && f !== this.lastStep) this.footDust(pl.x + (f === 1 ? -2 : 2), pl.y);
        this.lastStep = f;
      } else {
        this.idleT += dt; this.lastStep = -1;
        const blink = !reduced && (this.idleT % 3.7) > 3.55;
        const breathe = !reduced && (this.idleT % 2.6) > 1.3;
        pl.setFrame(this.pdir + '-i' + (blink ? 2 : breathe ? 1 : 0));
      }
      pl.setDepth(pl.y + 0.5);
      this.pshadow.setPosition(pl.x, pl.y - 1);
      if (!S.modal) for (const ex of WORLD.EXITS) if (ex.test(pl.x)) { keys.clear(); this.vel = { x: 0, y: 0 }; this.exitTo(ex); break; }
      let near = null, best = 30;
      for (const lm of WORLD.LANDMARKS) { const d = Math.hypot(pl.x - lm.at[0], pl.y - lm.at[1]); if (d < best) { best = d; near = lm; } }
      S.near = near;
    }
    footDust(x, y) {
      if (!V.dust || reduced) return;
      const inside = inRoom(x, y), d = this.dust[this.dustI++ % this.dust.length];
      d.setPosition(x, y - 1).setVisible(true).setScale(0.5).setAlpha(inside ? 0.25 : 0.55).setTint(inside ? 0xe0d8c8 : 0xb89c76);
      this.tweens.killTweensOf(d);
      this.tweens.add({ targets: d, scale: 1.4, alpha: 0, y: y - 3, duration: 480, onComplete: () => d.setVisible(false) });
    }
  }

  // ======================= character select + boot =======================
  const sel = $('#select'), list = $('#chars');
  CHARS.VARIANTS.forEach((v, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'char'; b.dataset.i = i;
    const fr = CHARS.build(i), cv = document.createElement('canvas'); cv.width = 96; cv.height = 128; cv.setAttribute('aria-hidden', 'true');
    b.appendChild(cv);
    const nm = document.createElement('span'); nm.className = 'cname'; nm.textContent = v.name; b.appendChild(nm);
    const ds = document.createElement('span'); ds.className = 'cdesc'; ds.textContent = v.desc; b.appendChild(ds);
    b.setAttribute('aria-label', `${v.name}: ${v.desc}`);
    const draw = (c) => { const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 96, 128); x.fillStyle = 'rgba(0,0,0,0.28)'; x.beginPath(); x.ellipse(48, 122, 24, 5, 0, 0, 7); x.fill(); x.drawImage(c, 0, 0, 96, 128); };
    draw(fr.down.idle[0]); b._fr = fr; b._draw = draw;
    b.addEventListener('click', () => choose(i));
    list.appendChild(b);
  });
  let animK = 0;
  if (!reduced) setInterval(() => { animK++; list.querySelectorAll('.char').forEach((b) => { const act = b.matches(':hover, :focus'); b._draw(act ? b._fr.down.walk[animK % 6] : b._fr.down.idle[(animK % 14) < 7 ? 0 : 1]); }); }, 110);
  list.addEventListener('keydown', (e) => {
    const bs = [...list.querySelectorAll('.char')], i = bs.indexOf(document.activeElement); if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { bs[(i + 1) % bs.length].focus(); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { bs[(i + bs.length - 1) % bs.length].focus(); e.preventDefault(); }
  });
  function choose(i) {
    store.char = i; save(); sel.hidden = true; document.body.classList.remove('selecting');
    if (S.scene && S.ready) S.scene.spawn(i); else S.pendingChar = i;
  }

  CFG.buildPanel();
  updateHud(); setDepth(S.depth);
  const qc = parseInt(Q.get('char'), 10);
  if (qc >= 1 && qc <= 4) { sel.hidden = true; S.pendingChar = qc - 1; }
  else { document.body.classList.add('selecting'); sel.hidden = false; setTimeout(() => { const b = list.querySelectorAll('.char')[store.char || 0]; if (b) b.focus(); }, 50); }

  new Phaser.Game({
    type: Q.get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'game', pixelArt: true, backgroundColor: '#3c5f2c',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [Region], banner: false,
  });
})();
