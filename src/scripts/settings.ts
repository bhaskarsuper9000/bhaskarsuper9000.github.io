/** Settings panel UI. Logic and persistence live in boot.ts (window.bbPrefs). */
import type { PrefKey } from './boot';

const panel = document.querySelector<HTMLElement>('#settings-panel');
const toggles = document.querySelectorAll<HTMLButtonElement>('[data-settings-toggle]');
const prefs = window.bbPrefs;

if (panel && prefs) {
  const isOpen = () => !panel.hidden;
  const setOpen = (open: boolean, refocus = false) => {
    panel.hidden = !open;
    toggles.forEach((t) => t.setAttribute('aria-expanded', String(open)));
    if (open) panel.querySelector<HTMLInputElement>('input:checked')?.focus();
    else if (refocus) toggles[0]?.focus();
  };
  const sync = () => {
    (Object.keys(prefs.view) as PrefKey[]).forEach((k) => {
      const el = panel.querySelector<HTMLInputElement>(`input[name="${k}"][value="${prefs.view[k]}"]`);
      if (el) el.checked = true;
    });
  };

  toggles.forEach((t) => t.addEventListener('click', () => setOpen(!isOpen())));
  panel.querySelector('[data-settings-close]')?.addEventListener('click', () => setOpen(false, true));
  panel.querySelector('[data-settings-reset]')?.addEventListener('click', () => prefs.reset());
  panel.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name) prefs.set(t.name as PrefKey, t.value);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setOpen(false, true); });
  document.addEventListener('mousedown', (e) => {
    const target = e.target as Node;
    if (isOpen() && !panel.contains(target) && ![...toggles].some((t) => t.contains(target))) setOpen(false);
  });
  prefs.onChange(sync);
  sync();
  if (new URLSearchParams(location.search).get('settings') === 'open') setOpen(true);
}
