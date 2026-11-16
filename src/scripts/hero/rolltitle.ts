/** Rolling word in front of the title (see src/data/hero.ts). ~400 ms decode; the slot eases to each word's width.
    ?roll=fast: 1 s per word, ?t=<s> starts t s into the cycle; ?roll=hold&t=<s> freezes on that word (screenshots). */
import { rollingTitle } from '../../data/hero';

const GLYPHS = '#%*/<>=+01▮▯';

export function initRollingTitle(slot: HTMLElement): void {
  const words = rollingTitle.words.map((w) => w.word.toUpperCase());
  slot.textContent = words[0];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const q = new URLSearchParams(location.search), hold = q.get('roll') === 'hold', fast = hold || q.get('roll') === 'fast';
  const dur = rollingTitle.words.map((w) => (fast ? 1 : w.seconds)), total = dur.reduce((a, b) => a + b, 0);
  let off = fast && Number.isFinite(Number(q.get('t'))) ? Number(q.get('t')) % total : 0, i = 0;
  while (off >= dur[i]) { off -= dur[i]; i++; }

  const meas = document.createElement('span');
  meas.className = 'roll-meas'; meas.setAttribute('aria-hidden', 'true'); slot.after(meas);
  const width = (w: string) => { meas.textContent = w; return meas.getBoundingClientRect().width; };
  function show(w: string, animate: boolean) {
    slot.style.width = `${width(w)}px`;
    if (!animate) { slot.textContent = w; return; }
    const t0 = Date.now(), from = slot.textContent ?? '';
    const frame = () => {
      const k = Math.min(1, (Date.now() - t0) / 400), n = Math.max(w.length, Math.ceil(from.length * (1 - k)));
      let s = '';
      for (let c = 0; c < n; c++) {
        const settled = c < w.length && c / w.length < k * 1.15 - 0.15;
        s += settled ? w[c] : c < w.length || k < 0.6 ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : '';
      }
      slot.textContent = k >= 1 ? w : s;
      if (k < 1) setTimeout(frame, 33); // timers, not rAF, so a throttled tab still finishes the word
    };
    frame();
  }
  show(words[i], false);
  if (hold) return;
  const next = () => { i = (i + 1) % words.length; show(words[i], true); setTimeout(next, dur[i] * 1000); };
  setTimeout(next, (dur[i] - off) * 1000);
}
