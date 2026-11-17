/** Hero orchestrator. Text and lens are server-rendered; this adds, in order: 2D still, then (if WebGL,
    no reduced motion, no ?static=1) a lazily loaded three.js scene that crossfades in. Owns framing, 3D
    labels, era fades, the loop and pausing (hidden tab, off screen, pause button). ?debug=1 shows an overlay. */
import { camera, DT, projector, scenes, type Cam, type Scene } from './sim/index';
import { draw2D } from './fallback2d';
import { readPalette, type Palette } from './palette';
import { createReadouts } from './readouts';
import { createScrubber, type HeroEra } from './scrubber';
import { createScrollPin } from './scrollpin';
import type { Renderer3D } from './render3d';
import { heroText, readoutEmphasis } from '../../data/hero';
import type { LensView } from '../../data/lenses';

export function initHero(root: HTMLElement): void {
  const d = document.documentElement, $ = <T extends HTMLElement>(s: string) => root.querySelector(s) as T;
  const Q = new URLSearchParams(location.search), DEBUG = Q.get('debug') === '1', STATIC = Q.get('static') === '1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eras: HeroEra[] = JSON.parse($('[data-hero-eras]').textContent ?? '[]');
  if (!eras.length) return;

  // debug overlay
  const errs: string[] = [];
  let dbg: HTMLElement | null = null;
  const logErr = (m: string) => { errs.push(m.slice(0, 160)); if (errs.length > 6) errs.shift(); };
  addEventListener('error', (e) => logErr(e.message + (e.lineno ? ` @${e.lineno}` : '')));
  addEventListener('unhandledrejection', (e) => logErr(`promise: ${e.reason?.message ?? e.reason}`));
  if (DEBUG) { dbg = document.createElement('pre'); dbg.className = 'hero-dbg'; document.body.appendChild(dbg); }

  let COL: Palette = readPalette();
  const R = createReadouts($('[data-hero-readouts]'), heroText.readoutsCaption);
  const lensOf = () => (d.getAttribute('data-lens') ?? 'all') as LensView;
  const applyLens = () => { const l = lensOf(); R.emphasise(readoutEmphasis[l] ?? readoutEmphasis.all, l); if (cur) R.update(cur, cpuMs); };

  // scenes are created on first visit and keep their own state; ?t=<s> pre-runs them (default 22 s)
  const PRE = Q.get('t') !== null && Number.isFinite(Number(Q.get('t'))) ? Math.max(0, Math.min(600, Number(Q.get('t')))) : 22;
  const made: Record<number, Scene> = {};
  const getScene = (i: number) => {
    if (!made[i]) { const s = made[i] = scenes[eras[i].scene](); for (let n = Math.round(PRE / DT); n > 0; n--) s.step(DT); }
    return made[i];
  };
  const qe = Q.get('era');
  let startIdx = eras.length - 1;
  if (qe) { const k = eras.findIndex((e) => e.id === qe || (Number(qe) >= e.start && Number(qe) <= e.end)); if (k >= 0) startIdx = k; }

  let shown = -1, target = startIdx, fade = 1, cur: Scene | null = null, cpuMs = 0;
  let R3: Renderer3D | null = null, mode: 'still' | 'loading' | 'gl' = 'still', running = false, userPaused = false, visible = !document.hidden, inView = true;
  const scrub = createScrubber($('[data-hero-scrubber]'), eras, startIdx, (i) => { target = i; if (mode !== 'gl' && cur) swapTo(i); }, (p) => pin.scrollTo(p));
  const pin = createScrollPin(root, eras.length, (p) => scrub.setProgress(p));

  // stage, framing, labels
  const stage = $('[data-hero-stage]'), still = $<HTMLCanvasElement>('[data-hero-still]'), gl = $<HTMLCanvasElement>('[data-hero-gl]'), tags = $('[data-hero-tags]');
  const textCol = $('[data-hero-text]'), roEl = R.root, sctx = still.getContext('2d');
  let W = 1, H = 1, phone = false;
  const DPR = Math.min(devicePixelRatio || 1, 2);
  const F = { chase: [0, 0], center: [0, 0], safeL: 0, safeR: 1e9, ro: { left: 1e9, bottom: 0 } };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, inside: false, glow: 0 };
  function layout() {
    const r = stage.getBoundingClientRect(); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    phone = matchMedia('(max-width: 860px)').matches;
    if (!phone) {
      const tr = textCol.getBoundingClientRect(), rr = roEl.getBoundingClientRect();
      F.safeL = tr.right - r.left + 8; F.safeR = W - 12; F.ro = { left: rr.left - r.left, bottom: rr.bottom - r.top };
      F.chase = [(F.safeL + W) / 2 / W - 0.47, 0.1]; F.center = [(F.safeL + F.ro.left) / 2 / W - 0.5, 0.06];
    } else { F.safeL = 0; F.safeR = W; F.ro = { left: 1e9, bottom: 0 }; F.chase = [0, 0.12]; F.center = [0, 0.05]; }
    still.width = W * DPR; still.height = H * DPR; R.resize(DPR);
    R3?.setSize(W, H);
  }
  function camFor(s: Scene, t: number): Cam {
    const chase = s.cam().frame === 'chase', a = chase ? F.chase : F.center, c = camera(s, t, ptr, a[0], a[1], W / H);
    const k = (1 + 0.22 * (1 - fade) ** 2) * (phone && chase ? 0.7 : 1); // dolly in as an era fades up
    c.pos = c.pos.map((v, i) => c.target[i] + (v - c.target[i]) * k);
    return c;
  }
  let tagEls: Record<string, HTMLElement> = {};
  function updateTags(s: Scene, cam: Cam) {
    const pr = projector(cam, W, H), seen: Record<string, boolean> = {}, placed: number[][] = [];
    s.labels().map((l) => ({ l, p: pr.project(l.p) })).filter((o) => o.p).sort((a, b) => b.p![1] - a.p![1]).forEach(({ l, p: pp }) => {
      let p = pp!;
      const w = l.text.length * 6.4 + 14;
      for (let k = 0; k < placed.length; k++) { const q = placed[k]; if (Math.abs(q[0] - p[0]) < (q[2] + w) / 2 && Math.abs(q[1] - p[1]) < 19) { p = [p[0], q[1] - 20, p[2]]; k = -1; } }
      placed.push([p[0], p[1], w]);
      if (p[0] < F.safeL + 40 || p[0] > F.safeR - 40 || p[1] < 30 || p[1] > H - (phone ? 70 : 150)) return;
      if (!phone && p[1] < F.ro.bottom + 22 && p[0] + w / 2 > F.ro.left - 8) { p = [F.ro.left - 8 - w / 2, p[1], p[2]]; if (p[0] - w / 2 < F.safeL) return; }
      let el = tagEls[l.id];
      if (!el) { el = tagEls[l.id] = document.createElement('span'); el.className = 'tag3d'; tags.appendChild(el); }
      seen[l.id] = true;
      if (el.textContent !== l.text) el.textContent = l.text;
      el.classList.toggle('tag3d--warn', !!l.warn);
      el.style.transform = `translate(${p[0].toFixed(1)}px,${(p[1] - 9).toFixed(1)}px) translate(-50%,-100%)`; el.style.opacity = fade.toFixed(2); el.hidden = false;
    });
    for (const id in tagEls) if (!seen[id]) tagEls[id].hidden = true;
  }
  function swapTo(i: number) {
    shown = i; cur = getScene(i); tags.textContent = ''; tagEls = {}; R3?.clear();
    const e = eras[i];
    $('[data-hero-era-y]').textContent = e.years; $('[data-hero-era-n]').textContent = e.title; $('[data-hero-era-t]').textContent = e.caption;
    R.setEgo(e.ego);
    $('[data-hero-desc]').textContent = `${cur.describe()} Era: ${e.years}, ${e.title}.`;
    gl.setAttribute('aria-label', `Live toy simulation, ${e.years} ${e.title}`);
    R.labels(cur); R.update(cur, cpuMs); R.chart(cur, COL, DPR);
    if (mode !== 'gl') drawStill();
  }
  function drawStill() {
    if (!cur || !sctx) return;
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const cam = camFor(cur, cur.t); draw2D(sctx, cur, cam, W, H, COL); updateTags(cur, cam);
  }

  function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }
  function startGL() {
    if (R3 || mode === 'loading') return;
    mode = 'loading';
    import('./render3d').then(({ createRenderer }) => {
      R3 = createRenderer(gl); R3.setColors(COL); layout();
      mode = 'gl'; stage.classList.add('is-gl'); d.classList.remove('hero-static');
      if (shown !== target) swapTo(target);
      renderFrame(0); kick();
    }).catch((err: Error) => { logErr(`three.js failed: ${err.message}`); mode = 'still'; d.classList.add('hero-static'); drawStill(); });
  }
  const want = () => mode === 'gl' && visible && inView && !userPaused;
  let last = 0, acc = 0, simT = 0, fpsN = 0, fpsT = 0, fps = 0, uiT = 0, info = { calls: 0, triangles: 0, lines: 0 };
  function kick() { if (!running && want()) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  function loop(now: number) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!want()) { running = false; return; }
    renderFrame(dt);
    fpsN++; fpsT += dt; if (fpsT >= 0.5) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
    requestAnimationFrame(loop);
  }
  function renderFrame(dt: number) {
    if (target !== shown) { fade -= dt / 0.28; if (fade <= 0 || shown < 0) { fade = 0; swapTo(target); } } // out 0.28 s, swap, in 0.45 s
    else if (fade < 1) fade = Math.min(1, fade + dt / 0.45);
    $('[data-hero-era]').classList.toggle('is-fading', target !== shown);
    if (!cur || !R3) return;
    const t0 = performance.now();
    acc += dt; let steps = 0;
    while (acc >= DT && steps < 8) { cur.step(DT); acc -= DT; steps++; }
    if (steps === 8) acc = 0;
    const items = cur.objects(); cpuMs = cpuMs * 0.9 + (performance.now() - t0) * 0.1;
    simT += dt;
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 3); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 3);
    ptr.glow += ((ptr.inside ? 1 : 0) - ptr.glow) * Math.min(1, dt * 4);
    const cam = camFor(cur, simT);
    let pw: number[] | null = null;
    if (ptr.glow > 0.01) { const gp = R3.pointerToGround(ptr.nx, ptr.ny, 0); if (gp) pw = [gp[0], gp[1], ptr.glow * 0.9]; }
    info = R3.render({ cam, items, ground: cur.ground, focus: cur.cam().focus, ring: cur.ring(), ptr: pw, fade });
    updateTags(cur, cam);
    uiT += dt; if (uiT > 0.12 || dt === 0) { uiT = 0; R.update(cur, cpuMs); R.chart(cur, COL, DPR); }
    if (dbg) dbg.textContent = `fps ${fps.toFixed(0)}  sim ${cpuMs.toFixed(3)} ms\ncalls ${info.calls}  tris ${info.triangles}  lines ${info.lines}  dpr ${DPR}  ${W}x${H}\nera ${eras[shown].id}  t ${cur.t.toFixed(1)}  lens ${lensOf()}\n${errs.length ? `ERR ${errs.join('\nERR ')}` : 'errors: none'}`;
  }

  // controls
  const pauseBtn = root.querySelector<HTMLButtonElement>('.scrub__pause')!, playSim = $<HTMLButtonElement>('[data-hero-playsim]');
  function setPaused(p: boolean) {
    userPaused = p; pauseBtn.setAttribute('aria-pressed', String(p));
    pauseBtn.querySelector('.vh')!.textContent = p ? 'Resume simulation' : 'Pause simulation';
    pauseBtn.querySelector('[aria-hidden]')!.textContent = p ? '▶' : '❚❚';
    R.root.classList.toggle('is-paused', p);
  }
  pauseBtn.addEventListener('click', () => {
    setPaused(!userPaused);
    if (mode !== 'gl') { if (!userPaused && !STATIC && hasWebGL()) { playSim.hidden = true; startGL(); } return; }
    kick();
  });
  playSim.textContent = `▶ ${heroText.playSim}`;
  playSim.addEventListener('click', () => { playSim.hidden = true; setPaused(false); startGL(); });

  root.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect(), lx = e.clientX - r.left, ly = e.clientY - r.top;
    ptr.tx = lx / r.width * 2 - 1; ptr.ty = ly / r.height * 2 - 1; ptr.nx = ptr.tx; ptr.ny = -ptr.ty;
    ptr.inside = lx > F.safeL && lx < F.safeR && !(lx > F.ro.left && ly < F.ro.bottom);
  });
  root.addEventListener('pointerleave', () => { ptr.inside = false; ptr.tx = 0; ptr.ty = 0; });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; kick(); });
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; kick(); }, { threshold: 0.02 }).observe(stage);

  // settings (theme, accent, font, size) and lens changes
  const refresh = () => {
    COL = readPalette(); layout(); pin.refresh();
    if (R3) { R3.setColors(COL); if (!running) renderFrame(0); } else drawStill();
    if (cur) R.chart(cur, COL, DPR);
  };
  let rsT = 0;
  addEventListener('resize', () => { clearTimeout(rsT); rsT = window.setTimeout(refresh, 80); });
  window.bbPrefs?.onChange(() => requestAnimationFrame(refresh));
  new MutationObserver(applyLens).observe(d, { attributes: true, attributeFilter: ['data-lens'] });

  // boot: first paint is already done (text); now the still, then WebGL
  applyLens();
  requestAnimationFrame(() => setTimeout(() => {
    layout(); swapTo(target); fade = 1;
    pin.refresh();
    if (qe) pin.scrollTo(scrub.progress()); else if (pin.active() && scrollY > 0) dispatchEvent(new Event('scroll')); // restored scroll position
    const fallback = STATIC || !hasWebGL() || reduced;
    if (fallback) { d.classList.add('hero-static'); setPaused(true); if (!hasWebGL()) logErr('WebGL unavailable: still shown'); }
    if (reduced && !STATIC && hasWebGL()) playSim.hidden = false;
    if (!fallback) startGL();
    if (dbg && mode !== 'gl') dbg.textContent = `mode ${mode}\n${errs.length ? `ERR ${errs.join('\nERR ')}` : 'errors: none'}`;
  }, 0));
}
