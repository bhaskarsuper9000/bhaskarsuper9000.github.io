/** Instrument tiles and the 20 s streaming chart, fed from scene.metrics() and scene.hist. Builds its own DOM inside the mount. */
import type { Scene } from './sim/index';
import type { Palette } from './palette';

const SLOTS = ['speed', 'lane', 'ttc', 'gap', 'tracked'];
interface Tile { el: HTMLElement; l: HTMLElement; v: HTMLElement; u: HTMLElement; n: HTMLElement; g: HTMLElement; kind: string; dots: number }

export interface Readouts {
  root: HTMLElement;
  emphasise(keys: string[], lens: string): void;
  setEgo(label: string): void;
  update(scene: Scene, cpuMs: number): void;
  labels(scene: Scene): void;
  chart(scene: Scene, col: Palette, dpr: number): void;
  resize(dpr: number): void;
}

const el = (tag: string, cls: string, html = '') => { const e = document.createElement(tag); e.className = cls; if (html) e.innerHTML = html; return e; };

export function createReadouts(mount: HTMLElement, caption: string): Readouts {
  mount.textContent = '';
  mount.classList.add('is-live');
  mount.setAttribute('aria-label', 'Live readouts from the simulation');
  const head = el('div', 'ro-head', '<span class="ro-live"><i></i>Live</span>'), ego = el('span', 'ro-ego');
  head.appendChild(ego);
  const list = el('div', 'ro-list');
  const fig = el('figure', 'ro-chart'), cap = el('figcaption', ''), a = el('span', 'ro-chart__a'), b = el('span', 'ro-chart__b'), cv = document.createElement('canvas');
  cap.append(a, b, el('span', 'ro-chart__w', 'last 20 s')); cv.setAttribute('aria-hidden', 'true'); fig.append(cap, cv);
  mount.append(head, list, fig, el('p', 'ro-cap', caption));

  const tiles: Record<string, Tile> = {};
  for (const k of [...SLOTS, 'cpu']) {
    const t = el('div', 'ro', '<span class="ro-l"></span><span class="ro-v"><b>--</b><small></small></span><span class="ro-n"></span><i class="ro-g"></i>');
    t.dataset.k = k; list.appendChild(t);
    const q = (s: string) => t.querySelector(s) as HTMLElement;
    tiles[k] = { el: t, l: q('.ro-l'), v: q('.ro-v b'), u: q('.ro-v small'), n: q('.ro-n'), g: q('.ro-g'), kind: '', dots: -1 };
  }
  tiles.cpu.l.textContent = 'In-browser compute'; tiles.cpu.el.dataset.kind = 'bar';

  return {
    root: mount,
    emphasise(E, lens) {
      const showCpu = E.includes('cpu');
      for (const k of [...SLOTS, 'cpu']) { tiles[k].el.classList.toggle('ro--emph', E.includes(k)); tiles[k].el.classList.toggle('ro--dim', lens !== 'all' && !E.includes(k)); }
      tiles.cpu.el.hidden = !showCpu;
      // emphasised tiles first; the phone layout shows only the first three
      const order = [...E.filter((k) => k !== 'cpu' || showCpu), ...SLOTS.filter((k) => !E.includes(k))];
      if (!order.includes('cpu')) order.push('cpu');
      order.forEach((k) => list.appendChild(tiles[k].el));
    },
    setEgo(label) { ego.textContent = `Ego: ${label}`; },
    update(scene, cpuMs) {
      for (const m of scene.metrics()) {
        const t = tiles[m.k]; if (!t) continue;
        if (t.l.textContent !== m.label) t.l.textContent = m.label;
        t.v.textContent = m.value; t.u.textContent = m.unit; t.n.textContent = m.note ?? '';
        if (t.kind !== m.kind) { t.kind = m.kind; t.el.dataset.kind = m.kind; t.g.innerHTML = ''; t.dots = -1; }
        if (m.kind === 'dots' && m.n) {
          if (t.dots !== m.n) { t.dots = m.n; t.g.innerHTML = '<i></i>'.repeat(m.n); }
          const on = Math.round(m.frac * m.n); [...t.g.children].forEach((d, i) => d.classList.toggle('on', i < on));
        } else t.el.style.setProperty('--f', Math.max(-1, Math.min(1, m.frac || 0)).toFixed(3));
        t.el.classList.toggle('ro--warn', !!m.warn);
      }
      const c = tiles.cpu;
      if (!c.el.hidden) { c.v.textContent = (cpuMs * 1000).toFixed(0); c.u.textContent = 'µs'; c.n.textContent = 'per frame: sim step + metrics'; c.el.style.setProperty('--f', Math.min(1, cpuMs).toFixed(3)); }
    },
    labels(scene) {
      const ch = scene.chart;
      a.textContent = ch.a.label + (ch.a.unit ? ` (${ch.a.unit})` : '');
      b.textContent = ch.b.label + (ch.b.unit ? ` (${ch.b.unit})` : '');
    },
    resize(dpr) { const r = cv.getBoundingClientRect(); cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr); },
    chart(scene, col, dpr) {
      const c = cv.getContext('2d'); if (!c) return;
      const w = cv.width, h = cv.height, hs = scene.hist, ch = scene.chart, n = hs.n;
      c.clearRect(0, 0, w, h);
      const pad = 2 * dpr, bot = h - 11 * dpr, top = 3 * dpr, ph = bot - top;
      c.lineWidth = 1; c.strokeStyle = col.line; c.beginPath();
      for (let g = 0; g <= 4; g++) { const gx = Math.round(pad + (w - 2 * pad) * g / 4) + 0.5; c.moveTo(gx, top); c.lineTo(gx, bot); }
      for (const f of [0, 0.5, 1]) { const gy = Math.round(top + ph * f) + 0.5; c.moveTo(pad, gy); c.lineTo(w - pad, gy); }
      c.stroke();
      c.fillStyle = col.text2; c.font = `${9 * dpr}px ${getComputedStyle(mount).getPropertyValue('--font-mono') || 'monospace'}`; c.textBaseline = 'bottom';
      ['-20s', '-15', '-10', '-5', 'now'].forEach((s, k) => { c.textAlign = k === 0 ? 'left' : k === 4 ? 'right' : 'center'; c.fillText(s, pad + (w - 2 * pad) * k / 4, h); });
      if (ch.a.label === 'TTC') { const ty = top + ph * (1 - 3 / ch.a.max); c.strokeStyle = col.warn; c.setLineDash([3 * dpr, 3 * dpr]); c.beginPath(); c.moveTo(pad, ty); c.lineTo(w - pad, ty); c.stroke(); c.setLineDash([]); }
      const series = (arr: Float32Array, max: number, color: string, lw: number) => {
        c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); let on = false;
        for (let k = 0; k < n; k++) {
          const v = arr[(hs.i + k) % n]; if (Number.isNaN(v)) { on = false; continue; }
          const px = pad + (w - 2 * pad) * k / (n - 1), py = top + ph * (1 - Math.max(0, Math.min(1, v / max)));
          if (on) c.lineTo(px, py); else { c.moveTo(px, py); on = true; }
        }
        c.stroke();
      };
      c.globalAlpha = 0.8; series(hs.b, ch.b.max, col.text2, dpr); c.globalAlpha = 1; series(hs.a, ch.a.max, col.accent, 1.6 * dpr);
    },
  };
}
