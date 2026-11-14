/* Story mode slice: Phaser scene, 2.5D sprite-stack layout, input, HUD, cards. */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const DEBUG = Q.get('debug') === '1';
  const dbg = document.getElementById('debug'); if (DEBUG) dbg.hidden = false;
  function log(msg) { if (!DEBUG) return; dbg.hidden = false; const d = document.createElement('div'); d.textContent = msg; dbg.appendChild(d); }
  window.addEventListener('error', (e) => log('ERROR: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  window.addEventListener('unhandledrejection', (e) => log('REJECTION: ' + e.reason));
  const origErr = console.error; console.error = function () { log('console.error: ' + [].join.call(arguments, ' ')); origErr.apply(console, arguments); };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'bb-story-v1';
  const store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  if (Q.get('reset') === '1') { store.visited = []; }
  store.visited = store.visited || [];
  if (Q.get('visited') !== null) store.visited = Q.get('visited').split(',').filter((v) => WORLD.LANDMARKS.some((l) => l.id === v));
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode */ } };
  save();

  const S = {
    depth: Q.get('parallax') !== null ? Q.get('parallax') !== '0' : !reduced,
    char: null, scene: null, modal: null, near: null,
    T: 0.72,      // tilt: screen px per voxel of height (3/4 view)
    L: 0.0014,    // lean: how much tops drift away from the screen centre
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
    if (S.scene) S.scene.layout(true);
  }
  $('#depthBtn').addEventListener('click', () => setDepth(!S.depth));
  $('#reset').addEventListener('click', () => { store.visited = []; save(); updateHud(); toast('Progress reset. The room is unexplored again.'); });
  let toastT;
  function toast(msg, ms) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms || 3500); }

  // ======================= cards =======================
  const ground = WORLD.paintGround();
  const byId = Object.fromEntries(WORLD.objects.map((o) => [o.id, o]));
  const BACKDROP = { pc: ['wallN', 'chair', 'almirah'], manuals: ['wallN', 'globe'], toy: [], west: [], east: [] };
  function portrait(ids, extra) {
    const obs = ids.map((i) => byId[i]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const o of obs) { x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x + o.vox.w); y0 = Math.min(y0, o.y - o.top * S.T); y1 = Math.max(y1, o.y + o.vox.d); }
    x0 -= 10; x1 += 10; y0 -= 8; y1 += 12;
    const sc = 3, cv = document.createElement('canvas');
    cv.width = Math.round((x1 - x0) * sc); cv.height = Math.round((y1 - y0) * sc);
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, x0, y0, x1 - x0, y1 - y0, 0, 0, cv.width, cv.height);
    const all = obs.concat((extra || []).map((i) => byId[i])).sort((a, b) => a.sort - b.sort);
    for (const o of all) PX.drawStack(ctx, o.baked, o.x - x0, o.y - y0, sc, S.T, 0);
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
    m.hidden = false; S.modal = { kind, item };
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
    if (e.target.closest && e.target.closest('button, a, input') && (e.code === 'Space' || e.code === 'Enter')) return;
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
  const free = new Uint8Array(GW * GH); // inflated by the player's foot box
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
    // thin the path: keep corners only
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

  // ======================= Phaser scene =======================
  class Region extends Phaser.Scene {
    constructor() { super('region'); }
    create() {
      S.scene = this;
      const tex = this.textures;
      tex.addCanvas('ground', ground);
      this.add.image(0, 0, 'ground').setOrigin(0, 0).setDepth(-1000);
      this.add.image(0, 0, 'ground').setOrigin(0, 1).setFlipY(true).setDepth(-1001); // mirrored apron above the map edge
      // sprite stacks: one image per z-slice
      this.stacks = [];
      for (const ob of WORLD.objects) {
        const key = 'ob-' + ob.id, t = tex.addCanvas(key, ob.baked.canvas);
        const slices = [];
        for (const f of ob.baked.frames) {
          t.add('z' + f.z, 0, f.x, f.y, ob.baked.w, ob.baked.d);
          const img = this.add.image(ob.x, ob.y, key, 'z' + f.z).setOrigin(0, 0).setDepth(ob.sort + f.z * 0.001);
          slices.push({ img, z: f.z });
        }
        this.stacks.push({ ob, slices, ox: 0, oy: 0 });
      }
      this.stackById = Object.fromEntries(this.stacks.map((s) => [s.ob.id, s]));

      // small generated textures
      const mk = (key, w, h, draw) => { const [c, x] = PX.canvas(w, h); draw(x); tex.addCanvas(key, c); };
      mk('dot', 2, 2, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 2, 2); });
      mk('pshadow', 14, 6, (x) => { x.fillStyle = 'rgba(20,30,40,0.38)'; x.beginPath(); x.ellipse(7, 3, 6.5, 2.6, 0, 0, Math.PI * 2); x.fill(); });
      mk('ring', 30, 14, (x) => {
        x.strokeStyle = 'rgba(255,233,140,1)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(15, 7, 13, 5.5, 0, 0, Math.PI * 2); x.stroke();
        x.fillStyle = 'rgba(255,220,120,0.18)'; x.fill();
      });
      mk('mk-new', 9, 12, (x) => {
        const rows = ['....k....', '...kyk...', '..kyYyk..', '.kyYYyyk.', 'kyYYwYyyk', '.kyyyyok.', '..kyyok..', '...kok...', '....k....', '.........', '...ksk...', '....s....'];
        const pal = { k: 0x5a3a08, y: 0xf7c531, Y: 0xffe58a, w: 0xffffff, o: 0xd08a12, s: 0x000000 };
        rows.forEach((r, yy) => [...r].forEach((ch, xx) => { if (pal[ch] !== undefined && ch !== 's') PX.px(x, xx, yy, pal[ch]); }));
      });
      mk('mk-done', 11, 11, (x) => {
        const rows = ['...kkkkk...', '..kgggggk..', '.kgGGgggGk.', 'kgGgggggwgk', 'kggggggwwgk', 'kgwggwwwggk', 'kgwwwwwgggk', 'kggwwwggggk', '.kgggggggk.', '..kgggggk..', '...kkkkk...'];
        const pal = { k: 0x14401f, g: 0x3fb05a, G: 0x8be29a, w: 0xffffff };
        rows.forEach((r, yy) => [...r].forEach((ch, xx) => { if (pal[ch] !== undefined) PX.px(x, xx, yy, pal[ch]); }));
      });
      // clouds: soft lumpy blobs, posterised alpha for a pixel feel
      for (let k = 0; k < 3; k++) mk('cloud' + k, 150, 90, (x) => {
        const r = PX.rng(7 + k * 13), [c2, x2] = PX.canvas(150, 90);
        for (let i = 0; i < 16; i++) {
          const cx = 30 + r() * 90, cy = 30 + r() * 30, rad = 12 + r() * 20;
          const g = x2.createRadialGradient(cx - rad * 0.3, cy - rad * 0.4, rad * 0.1, cx, cy, rad);
          g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(236,242,250,0.8)'); g.addColorStop(1, 'rgba(200,214,232,0)');
          x2.fillStyle = g; x2.beginPath(); x2.arc(cx, cy, rad, 0, Math.PI * 2); x2.fill();
        }
        const id = x2.getImageData(0, 0, 150, 90);
        for (let p = 0; p < id.data.length; p += 4) { const a = id.data[p + 3] / 255; const q = Math.round(a * 5) / 5; id.data[p + 3] = q * 255; const yy = (p / 4 / 150) | 0; const sh = yy > 50 ? 0.9 : 1; id.data[p] *= sh; id.data[p + 1] *= sh; id.data[p + 2] *= sh * 1.02; }
        x.putImageData(id, 0, 0);
      });

      // landmark rings + markers
      this.marks = WORLD.LANDMARKS.map((lm) => {
        const ring = this.add.image(lm.at[0], lm.at[1] - 2, 'ring').setDepth(-800).setAlpha(0.8);
        const obs = lm.objs.map((i) => byId[i]);
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, top = 0;
        for (const o of obs) { x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x + o.vox.w); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y + o.vox.d); top = Math.max(top, o.top); }
        const m = this.add.image(0, 0, 'mk-new').setDepth(200000);
        return { lm, ring, m, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, top: top + 8, box: [x0, y0, x1, y1] };
      });
      this.refreshMarkers();

      // light from the window: floor patch + faint volumetric beam (additive)
      this.beam = this.add.graphics().setDepth(5000).setBlendMode(Phaser.BlendModes.ADD);
      this.motes = [];
      const rr = PX.rng(99);
      for (let i = 0; i < 26; i++) this.motes.push({ img: this.add.image(0, 0, 'dot').setScale(0.5).setDepth(5001).setBlendMode(Phaser.BlendModes.ADD), u: rr(), v: rr(), w: rr(), ph: rr() * 6.28 });

      // clouds and their shadows
      this.clouds = [];
      const cr = PX.rng(5);
      for (let i = 0; i < 6; i++) {
        const c = { x: -120 + i * 150 + cr() * 60, y: [40, 300, 150, 420, 60, 250][i], k: i % 3, s: 0.9 + cr() * 0.7 };
        c.shadow = this.add.image(0, 0, 'cloud' + c.k).setScale(c.s).setTint(0x0d1a10).setAlpha(0.13).setDepth(-850);
        c.img = this.add.image(0, 0, 'cloud' + c.k).setScale(c.s).setAlpha(0.5).setDepth(300000);
        this.clouds.push(c);
      }

      // labels for the signposts (DOM, so the text stays crisp)
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
      this.layout(true);
      S.ready = true;
      document.body.classList.add('ready');
      if (S.pendingChar !== undefined) this.spawn(S.pendingChar);
    }
    fitZoom() {
      const w = this.scale.width, h = this.scale.height;
      const z = Math.max(2, Math.min(5, Math.floor(Math.min(w / 420, h / 250))));
      const cam = this.cameras.main; cam.setZoom(z);
      // let the camera scroll a little past the north edge so the HUD never hides the top row
      const hud = document.querySelector('.hud'), pad = Math.ceil(((hud ? hud.getBoundingClientRect().bottom : 50) + 6) / z);
      cam.setBounds(0, -pad, WORLD.W, WORLD.H + pad);
    }
    spawn(ci) {
      const spots = { pc: [228, 106], manuals: [398, 108], toy: [306, 222], west: [40, 346], east: [600, 346], door: [304, 270] };
      const at = spots[Q.get('at')] || [304, 140];
      const fr = CHARS.build(ci), sheet = document.createElement('canvas'); sheet.width = 16 * 9; sheet.height = 20;
      const sctx = sheet.getContext('2d');
      const names = [];
      ['down', 'up', 'side'].forEach((dir, di) => fr[dir].forEach((c, k) => { sctx.drawImage(c, (di * 3 + k) * 16, 0); names.push(dir + k); }));
      const key = 'pl' + ci; if (this.textures.exists(key)) this.textures.remove(key);
      const t = this.textures.addCanvas(key, sheet); names.forEach((n, i) => t.add(n, 0, i * 16, 0, 16, 20));
      this.pshadow = this.add.image(at[0], at[1], 'pshadow').setDepth(-840);
      this.player = this.add.image(at[0], at[1], key, Q.get('at') ? 'up0' : 'down0').setOrigin(0.5, 1);
      this.pdir = Q.get('at') ? 'up' : 'down'; this.pkey = key; this.walkT = 0; this.path = null;
      this.cameras.main.startFollow(this.player, true, 0.14, 0.14, 0, 10);
      this.cameras.main.centerOn(at[0], at[1] - 10);
      S.char = ci;
      this.layout(true);
      // debug-only self tests: headless Chrome runs very few animation frames,
      // so these step the movement code directly instead of waiting on rAF.
      const step = (n) => { for (let i = 0; i < n; i++) this.movePlayer(1 / 30); this.layout(); };
      if (DEBUG && Q.get('test') === 'tap') setTimeout(() => {
        const st = this.stackById.toy; this.onTap({ worldX: st.ob.x + 30, worldY: st.ob.y + 20 });
        log('tap test: path of ' + (this.path ? this.path.length : 'none') + ' waypoints');
        step(150); log(`after 5 s: player at ${this.player.x.toFixed(0)},${this.player.y.toFixed(0)}; card open: ${S.modal ? S.modal.item.id : 'no'}`);
      }, 300);
      if (DEBUG && Q.get('test') === 'keys') setTimeout(() => {
        const x0 = this.player.x, y0 = this.player.y;
        const ev = (t, code) => window.dispatchEvent(new KeyboardEvent(t, { code, bubbles: true }));
        ev('keydown', 'KeyA'); step(20); ev('keyup', 'KeyA'); ev('keydown', 'ArrowDown'); step(15); ev('keyup', 'ArrowDown');
        log(`keys test: moved from ${x0.toFixed(0)},${y0.toFixed(0)} to ${this.player.x.toFixed(0)},${this.player.y.toFixed(0)}; near=${S.near ? S.near.id : 'none'}`);
        ev('keydown', 'ArrowUp'); step(40); ev('keyup', 'ArrowUp'); log(`walked up into the shelf, stopped at y=${this.player.y.toFixed(0)}; near=${S.near ? S.near.id : 'none'}`);
        ev('keydown', 'Space'); ev('keyup', 'Space');
      }, 300);
      const card = Q.get('card');
      if (card) { const lm = WORLD.LANDMARKS.find((l) => l.id === card); const ex = WORLD.EXITS.find((e) => e.id === card); if (lm) openCard('landmark', lm); else if (ex) openCard('exit', ex); }
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
      // tap on a landmark (anywhere on its projected silhouette)?
      for (const mk of this.marks) {
        for (const id of mk.lm.objs) {
          const s = this.stackById[id], o = s.ob; const top = o.top;
          const bx0 = o.x + Math.min(0, s.ox * top), bx1 = o.x + o.vox.w + Math.max(0, s.ox * top);
          const by0 = o.y + s.oy * top - 4, by1 = o.y + o.vox.d;
          if (wx >= bx0 && wx <= bx1 && wy >= by0 && wy <= by1) {
            const lm = mk.lm;
            if (Math.hypot(this.player.x - lm.at[0], this.player.y - lm.at[1]) < 30) { openCard('landmark', lm); return; }
            this.goTo(lm.at[0], lm.at[1], () => openCard('landmark', lm)); return;
          }
        }
      }
      for (const sg of this.signs) { const o = sg.ob; if (wx >= o.x - 4 && wx <= o.x + o.vox.w + 4 && wy >= o.y - 24 && wy <= o.y + 10) { this.goTo(sg.ex.at[0], sg.ex.at[1], () => this.exitTo(sg.ex)); return; } }
      this.goTo(wx, wy);
      this.tapFx(wx, wy);
    }
    tapFx(x, y) {
      const r = this.add.image(x, y, 'ring').setDepth(-790).setScale(0.6).setAlpha(0.9).setTint(0xffffff);
      this.tweens.add({ targets: r, scale: 0.2, alpha: 0, duration: reduced ? 1 : 450, onComplete: () => r.destroy() });
    }
    exitTo(ex) { openCard('exit', ex); }
    pushBack(ex) { if (!this.player) return; this.player.x = ex.id === 'west' ? 34 : 606; this.player.y = 346; this.pdir = 'side'; this.player.setFlipX(ex.id === 'west' ? false : true); this.path = null; }

    // position every slice for the current camera: tops lean away from the centre
    layout() {
      const wv = this.view();
      const ccx = wv.cx, ccy = wv.cy;
      for (const st of this.stacks) {
        const o = st.ob;
        st.ox = S.depth ? (o.cx - ccx) * S.L : 0;
        st.oy = S.depth ? (o.cy - ccy) * S.L - S.T : 0;
        for (const s of st.slices) s.img.setPosition(o.x + s.z * st.ox, o.y + s.z * st.oy);
      }
      this.ccx = ccx; this.ccy = ccy;
    }
    view() { // visible world rect, computed directly (worldView lags/zero before first render)
      const cam = this.cameras.main, z = cam.zoom, w = cam.width / z, h = cam.height / z;
      const cx = cam.scrollX + cam.width / 2, cy = cam.scrollY + cam.height / 2;
      return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy, z };
    }
    proj(x, y, z) { // project a point at height z
      if (!S.depth) return [x, y];
      return [x + z * (x - this.ccx) * S.L, y + z * ((y - this.ccy) * S.L - S.T)];
    }
    update(time, dtMs) {
      const dt = Math.min(0.05, dtMs / 1000);
      this.t0 += dt;
      this.movePlayer(dt);
      this.layout();
      const cam = this.cameras.main;
      // markers
      for (const mk of this.marks) {
        const [x, y] = this.proj(mk.cx, mk.cy, mk.top);
        mk.m.setPosition(x, y - (reduced ? 0 : Math.sin(this.t0 * 3 + mk.cx) * 1.5));
        if (!reduced) mk.ring.setAlpha(0.55 + Math.sin(this.t0 * 4) * 0.3);
      }
      // window light
      const W0 = WORLD.WINDOW, g = this.beam; g.clear();
      const fa = 0.55, fb = 2.3; // light direction: per unit drop, how far it travels (x, y)
      const fl = (x, z) => [x + z * fa, W0.y + z * fb];
      const p = [fl(W0.x0 + 2, W0.z0), fl(W0.x1 - 2, W0.z0), fl(W0.x1 - 2, W0.z1), fl(W0.x0 + 2, W0.z1)];
      const wtop = [this.proj(W0.x0 + 2, W0.y, W0.z1), this.proj(W0.x1 - 2, W0.y, W0.z1)];
      const wbot = [this.proj(W0.x0 + 2, W0.y, W0.z0), this.proj(W0.x1 - 2, W0.y, W0.z0)];
      g.fillStyle(0xffd9a0, 0.16); g.fillPoints(p.map(([x, y]) => ({ x, y })), true);
      g.fillStyle(0xfff0c8, 0.045);
      g.fillPoints([wtop[0], wtop[1], p[2], p[1], wbot[1], wbot[0]].map(([x, y]) => ({ x, y })), true);
      g.fillPoints([wbot[0], wbot[1], p[1], p[0]].map(([x, y]) => ({ x, y })), true);
      for (const m of this.motes) {
        const tt = reduced ? 0 : this.t0;
        const z = W0.z0 + ((m.v * 14 + tt * 0.6) % 14) - 2, along = m.u;
        const bx = W0.x0 + 4 + m.w * 44 + Math.sin(tt * 0.7 + m.ph) * 2, fz = z;
        const [x, y] = this.proj(bx + fz * fa * along, W0.y + fz * fb * along + 4, z * (1 - along));
        m.img.setPosition(x, y).setAlpha(0.35 + 0.35 * Math.sin(tt * 2 + m.ph));
      }
      // clouds: high above the ground, so they slide faster than it when the camera moves
      for (const c of this.clouds) {
        if (!reduced) { c.x += dt * 4; if (c.x > WORLD.W + 160) c.x = -160; }
        const k = S.depth ? 0.3 : 0;
        c.img.setPosition(c.x + (c.x - this.ccx) * k, c.y + (c.y - this.ccy) * k - (S.depth ? 30 : 0));
        c.shadow.setPosition(c.x + 46, c.y + 36);
      }
      // DOM labels
      const VV = this.view(), zx = VV.z, vx = VV.x, vy = VV.y;
      for (const sg of this.signs) {
        const o = sg.ob, [x, y] = this.proj(o.x + o.vox.w / 2, o.y, o.top + 2);
        const w = sg.el.offsetWidth, sw = this.scale.width;
        const sx = (x - vx) * zx;
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
      if (DEBUG && this.game.loop.frame % 30 === 0) $('#fps').textContent = `fps ${this.game.loop.actualFps.toFixed(0)} | renderer ${this.game.renderer.type === 1 ? 'canvas' : 'webgl'} | depth ${S.depth ? 'on' : 'off'} | slices ${this.stacks.reduce((a, s) => a + s.slices.length, 0)} | cam ${VV.x.toFixed(0)},${VV.y.toFixed(0)} ${VV.w.toFixed(0)}x${VV.h.toFixed(0)} z${cam.zoom} | pl ${this.player ? this.player.x.toFixed(0) + ',' + this.player.y.toFixed(0) : '-'} | scale ${this.scale.width}x${this.scale.height}`;
    }
    movePlayer(dt) {
      const pl = this.player; if (!pl || S.modal) return;
      let vx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), vy = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
      if (!vx && !vy && this.path && this.path.length) {
        const [tx, ty] = this.path[0], dx = tx - pl.x, dy = ty - pl.y, d = Math.hypot(dx, dy);
        if (d < 2) { this.path.shift(); if (!this.path.length) { this.path = null; const cb = this.onArrive; this.onArrive = null; if (cb) cb(); } }
        else { vx = dx / d; vy = dy / d; }
      }
      const moving = vx || vy;
      if (moving) {
        const l = Math.hypot(vx, vy), sp = 74 * dt; vx = vx / l * sp; vy = vy / l * sp;
        const ox = pl.x, oy = pl.y;
        if (!blockedAt(pl.x + vx, pl.y)) pl.x += vx;
        if (!blockedAt(pl.x, pl.y + vy)) pl.y += vy;
        if (this.path && Math.hypot(pl.x - ox, pl.y - oy) < sp * 0.2) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 0.4) { this.path = null; this.stuck = 0; } } else this.stuck = 0;
        if (Math.abs(vx) > Math.abs(vy) * 1.1) { this.pdir = 'side'; pl.setFlipX(vx < 0); } else { this.pdir = vy < 0 ? 'up' : 'down'; pl.setFlipX(false); }
        this.walkT += dt;
        const f = Math.floor(this.walkT * 8) % 4, frame = [0, 1, 0, 2][f];
        pl.setFrame(this.pdir + (this.pdir === 'side' ? (f % 2 ? 1 : 0) : frame));
      } else { this.walkT = 0; pl.setFrame(this.pdir + '0'); }
      pl.setDepth(pl.y + 0.5);
      this.pshadow.setPosition(pl.x + 1, pl.y - 1);
      // exits
      for (const ex of WORLD.EXITS) if (ex.test(pl.x)) { keys.clear(); this.exitTo(ex); break; }
      // near a landmark?
      let near = null, best = 30;
      for (const lm of WORLD.LANDMARKS) { const d = Math.hypot(pl.x - lm.at[0], pl.y - lm.at[1]); if (d < best) { best = d; near = lm; } }
      S.near = near;
    }
  }

  // ======================= character select + boot =======================
  const sel = $('#select');
  const list = $('#chars');
  CHARS.VARIANTS.forEach((v, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'char'; b.dataset.i = i;
    const fr = CHARS.build(i), cv = document.createElement('canvas'); cv.width = 96; cv.height = 120; cv.setAttribute('aria-hidden', 'true');
    b.appendChild(cv);
    const nm = document.createElement('span'); nm.className = 'cname'; nm.textContent = v.name; b.appendChild(nm);
    const ds = document.createElement('span'); ds.className = 'cdesc'; ds.textContent = v.desc; b.appendChild(ds);
    b.setAttribute('aria-label', `${v.name}: ${v.desc}`);
    const draw = (k) => { const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 96, 120); c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(48, 114, 26, 6, 0, 0, 7); c.fill(); c.drawImage(fr.down[k], 0, 0, 96, 120); };
    draw(0); b._draw = draw;
    b.addEventListener('click', () => choose(i));
    list.appendChild(b);
  });
  let animK = 0;
  if (!reduced) setInterval(() => { animK++; list.querySelectorAll('.char').forEach((b) => b._draw(b.matches(':hover, :focus') ? [0, 1, 0, 2][animK % 4] : 0)); }, 180);
  list.addEventListener('keydown', (e) => {
    const bs = [...list.querySelectorAll('.char')], i = bs.indexOf(document.activeElement); if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { bs[(i + 1) % bs.length].focus(); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { bs[(i + bs.length - 1) % bs.length].focus(); e.preventDefault(); }
  });
  function choose(i) {
    store.char = i; save(); sel.hidden = true; document.body.classList.remove('selecting');
    if (S.scene && S.ready) S.scene.spawn(i); else S.pendingChar = i;
  }

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
