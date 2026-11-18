/**
 * Pre-paint boot functions. BaseLayout serialises them into an inline <script> in <head>,
 * so each must be self-contained (no imports, no outer variables).
 */
export type PrefKey = 'theme' | 'font' | 'size' | 'accent';
export interface PrefView { theme: string; font: string; size: string; accent: string }
export interface BBPrefs {
  view: PrefView;
  set(key: PrefKey, value: string): void;
  reset(): void;
  onChange(fn: () => void): void;
}
declare global { interface Window { bbPrefs: BBPrefs } }

/** Visitor settings -> attributes on <html>. localStorage key is part of the public contract. */
export function bootPrefs(): void {
  const KEY = 'bb-site-prefs-v1';
  const ALLOWED: Record<PrefKey, string[]> = {
    theme: ['light', 'dark', 'system'],
    font: ['instrument', 'sans', 'serif', 'mono', 'legible'],
    size: ['s', 'm', 'l', 'xl'],
    accent: ['0', '1', '2', '3', '4', '5'],
  };
  const DEFAULTS: PrefView = { theme: 'light', font: 'instrument', size: 'm', accent: '1' }; // keep in step with <html> in BaseLayout
  const root = document.documentElement;
  const listeners: Array<() => void> = [];
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const url = new URLSearchParams(location.search); // ?theme=&font=&size=&accent= override without saving
  let saved: Partial<PrefView> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* private mode */ }

  const api: BBPrefs = {
    view: { ...DEFAULTS },
    set(key, value) {
      saved[key] = value;
      url.delete(key);
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* ignore */ }
      apply();
    },
    reset() {
      saved = {};
      ['theme', 'font', 'size', 'accent'].forEach((k) => url.delete(k));
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      apply();
    },
    onChange(fn) { listeners.push(fn); },
  };

  function pick(key: PrefKey): string {
    const q = url.get(key);
    if (q && ALLOWED[key].includes(q)) return q;
    const s = saved[key];
    return s && ALLOWED[key].includes(String(s)) ? String(s) : DEFAULTS[key];
  }
  function apply(): void {
    const v = api.view;
    (Object.keys(ALLOWED) as PrefKey[]).forEach((k) => { v[k] = pick(k); });
    const dark = v.theme === 'dark' || (v.theme === 'system' && mq.matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-font', v.font);
    root.setAttribute('data-size', v.size);
    root.setAttribute('data-accent', v.accent);
    listeners.forEach((fn) => fn());
  }
  window.bbPrefs = api;
  apply();
  mq.addEventListener('change', apply);
  addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    try { saved = JSON.parse(e.newValue || '{}') || {}; } catch { saved = {}; }
    apply();
  });
}
