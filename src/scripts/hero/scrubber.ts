/** Career timeline scrubber. Equal-width era segments, x in [0, eras.length]; drag, arrows/Home/End and
    era tick buttons. Page scroll drives it too (scrollpin.ts) through progress(): 0 = today, 1 = oldest era. */
import { heroText } from '../../data/hero';

export interface HeroEra { id: string; title: string; tick: string; years: string; start: number; end: number; caption: string; ego: string; scene: string }
export interface Scrubber { era(): number; progress(): number; setProgress(p: number): void }

export function createScrubber(mount: HTMLElement, eras: HeroEra[], startEra: number, onEra: (i: number) => void, onUser: (p: number) => void): Scrubber {
  const NE = eras.length, X_END = NE - 0.001, X_OLD = 0.5;
  mount.innerHTML = `<div class="wrap scrub">
    <p class="scrub__hint label" aria-hidden="true">${heroText.scrollHint}</p>
    <div class="scrub__wrap">
      <div class="scrub__track" role="slider" tabindex="0" aria-label="Career timeline" aria-valuemin="${eras[0].start}" aria-valuemax="${eras[NE - 1].end}">
        <div class="scrub__ticks" aria-hidden="true"></div><div class="scrub__fill" aria-hidden="true"></div>
        <div class="scrub__handle" aria-hidden="true"><b></b></div>
      </div>
      <div class="scrub__eras"></div>
    </div>
    <button class="btn btn--ghost scrub__pause" type="button" aria-pressed="false" title="Pause the simulation"><span aria-hidden="true">❚❚</span><span class="vh">Pause simulation</span></button>
  </div>`;
  const q = <T extends HTMLElement>(s: string) => mount.querySelector(s) as T;
  const track = q('.scrub__track'), handle = q('.scrub__handle'), fill = q('.scrub__fill'), hy = q('.scrub__handle b');
  let x = X_END, era = NE - 1, dragging = false;

  const yrs = (e: HeroEra) => Math.max(1, e.end - e.start + 1);
  const year = (v: number) => { const i = Math.min(NE - 1, Math.floor(v)), e = eras[i]; return Math.min(e.end, Math.floor(e.start + (v - i) * yrs(e))); };
  const mid = (i: number) => (i === NE - 1 ? X_END : i + 0.5);
  const progress = () => Math.max(0, Math.min(1, (X_END - x) / (X_END - X_OLD)));

  let ticks = '';
  eras.forEach((e, i) => {
    for (let y = 0; y < yrs(e); y++) ticks += `<i class="${y ? '' : 'mj'}" style="left:${((i + y / yrs(e)) / NE * 100).toFixed(3)}%"></i>`;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'scrub__era'; b.tabIndex = -1; b.style.left = `${i / NE * 100}%`;
    b.innerHTML = `<b>${e.start}</b>`; b.append(e.tick);
    b.addEventListener('click', () => user(mid(i)));
    q('.scrub__eras').appendChild(b);
  });
  q('.scrub__ticks').innerHTML = `${ticks}<i class="mj" style="left:100%"></i>`;
  const eraBtns = mount.querySelectorAll('.scrub__era');

  function set(nx: number) {
    x = Math.max(0, Math.min(X_END, nx));
    const p = `${(x / NE * 100).toFixed(3)}%`;
    [track, handle, fill].forEach((n) => n.style.setProperty('--p', p));
    const i = Math.min(NE - 1, Math.floor(x)), y = year(x);
    hy.textContent = String(y);
    track.setAttribute('aria-valuenow', String(y)); track.setAttribute('aria-valuetext', `${eras[i].years}, ${eras[i].title}`);
    eraBtns.forEach((b, k) => b.classList.toggle('cur', k === i));
    if (i !== era) { era = i; onEra(i); }
  }
  const user = (nx: number) => { set(nx); onUser(progress()); };

  // the focus ring is for keyboard use only; a click or drag never shows it
  const fromPointer = (e: PointerEvent) => { const r = track.getBoundingClientRect(); return (e.clientX - r.left) / r.width * NE; };
  track.addEventListener('pointerdown', (e) => { dragging = true; track.classList.remove('is-kbd'); track.setPointerCapture(e.pointerId); user(fromPointer(e)); e.preventDefault(); });
  track.addEventListener('pointermove', (e) => { if (dragging) user(fromPointer(e)); });
  track.addEventListener('pointerup', () => { dragging = false; });
  track.addEventListener('pointercancel', () => { dragging = false; });
  track.addEventListener('keyup', (e) => { if (e.key === 'Tab') track.classList.add('is-kbd'); });
  track.addEventListener('blur', () => track.classList.remove('is-kbd'));
  track.addEventListener('keydown', (e) => {
    const i = Math.min(NE - 1, Math.floor(x)), k = e.key;
    let nx: number | null = null;
    if (k === 'ArrowLeft' || k === 'ArrowDown') nx = mid(Math.max(0, i - 1));
    else if (k === 'ArrowRight' || k === 'ArrowUp') nx = mid(Math.min(NE - 1, i + 1));
    else if (k === 'Home') nx = X_OLD; else if (k === 'End') nx = X_END;
    if (nx !== null) { track.classList.add('is-kbd'); user(nx); e.preventDefault(); }
  });

  era = startEra; set(mid(startEra));
  return { era: () => era, progress, setProgress: (p) => set(X_END - Math.max(0, Math.min(1, p)) * (X_END - X_OLD)) };
}
