/** Lens switch: clicking a lens selects it; clicking the active one clears it to the general view. */
import { defaultLens } from '../data/lenses';

const KEY = 'bb-lens-v1';
const root = document.documentElement;

function setLens(next: string, save: boolean): void {
  root.setAttribute('data-lens', next);
  document.querySelectorAll<HTMLButtonElement>('[data-lens-btn]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lensBtn === next));
  });
  if (!save) return;
  const url = new URL(location.href);
  if (next === defaultLens) url.searchParams.delete('lens');
  else url.searchParams.set('lens', next);
  history.replaceState(null, '', url);
  try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
}

document.querySelectorAll<HTMLButtonElement>('[data-lens-btn]').forEach((b) => {
  b.addEventListener('click', () => {
    const lens = b.dataset.lensBtn ?? 'all';
    setLens(root.getAttribute('data-lens') === lens ? 'all' : lens, true);
  });
});
setLens(root.getAttribute('data-lens') ?? defaultLens, false); // sync pressed state after the pre-paint boot
