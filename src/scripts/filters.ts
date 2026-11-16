/** Project filters: toggles row visibility without reload; state lives in ?kind=&disc=. */
type Key = 'kind' | 'disc';
export {};
const state: Record<Key, string> = { kind: 'all', disc: 'all' };

const root = document.querySelector<HTMLElement>('[data-filters]');
const rows = [...document.querySelectorAll<HTMLElement>('.prow')];
const eras = [...document.querySelectorAll<HTMLElement>('[data-era]')];
const jumps = [...document.querySelectorAll<HTMLAnchorElement>('.jump a')];
const chips = [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')];
const statusEl = document.querySelector<HTMLElement>('[data-status]');
const clear = document.querySelector<HTMLButtonElement>('[data-clear]');

const known = (key: Key, v: string | null) => (v && chips.some((c) => c.dataset.filter === key && c.dataset.value === v) ? v : 'all');
const params = new URLSearchParams(location.search);
state.kind = known('kind', params.get('kind'));
state.disc = known('disc', params.get('disc'));

function apply(): void {
  let shown = 0;
  rows.forEach((r) => {
    const ok = (state.kind === 'all' || r.dataset.kind === state.kind) && (state.disc === 'all' || r.dataset.disc === state.disc);
    r.hidden = !ok;
    if (ok) shown++;
  });
  eras.forEach((e, i) => {
    const any = !!e.querySelector('.prow:not([hidden])');
    e.hidden = !any;
    jumps[i]?.toggleAttribute('hidden', !any);
  });
  chips.forEach((c) => c.setAttribute('aria-pressed', String(state[c.dataset.filter as Key] === c.dataset.value)));
  const filtered = state.kind !== 'all' || state.disc !== 'all';
  if (statusEl) statusEl.textContent = `Showing ${shown} of ${rows.length} projects, newest first${filtered ? ' (filtered)' : ''}.`;
  if (clear) clear.hidden = !filtered;
  const url = new URL(location.href);
  (['kind', 'disc'] as Key[]).forEach((k) => (state[k] === 'all' ? url.searchParams.delete(k) : url.searchParams.set(k, state[k])));
  history.replaceState(null, '', url);
}

root?.addEventListener('click', (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]');
  if (!chip) return;
  state[chip.dataset.filter as Key] = chip.dataset.value ?? 'all';
  apply();
});
clear?.addEventListener('click', () => { state.kind = state.disc = 'all'; apply(); });
apply();
