/** Career playback scrubber. Equal-width era segments, x in [0, eras.length]; drag, arrows/Home/End,
    era tick buttons, and "Play my story backwards" (about 20 s for the whole run). */
import { heroText } from '../../data/hero';

export interface HeroEra { id: string; title: string; tick: string; years: string; start: number; end: number; caption: string; ego: string; scene: string }
export interface Scrubber { era(): number; playing(): boolean; start(): void; stop(): void; tick(dt: number): void }

const RUN_S = 20;

export function createScrubber(mount: HTMLElement, eras: HeroEra[], startEra: number, onEra: (i: number) => void, onPlay: () => void): Scrubber {
  const NE = eras.length, X_END = NE - 0.001;
  mount.innerHTML = `<div class="wrap scrub">
    <button class="btn scrub__play" type="button" aria-pressed="false"><span class="scrub__ic" aria-hidden="true"></span><span class="scrub__lbl"></span></button>
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
  const track = q('.scrub__track'), handle = q('.scrub__handle'), fill = q('.scrub__fill'), hy = q('.scrub__handle b'), play = q<HTMLButtonElement>('.scrub__play');
  let x = X_END, era = NE - 1, playing = false, dragging = false;

  const yrs = (e: HeroEra) => Math.max(1, e.end - e.start + 1);
  const year = (v: number) => { const i = Math.min(NE - 1, Math.floor(v)), e = eras[i]; return Math.min(e.end, Math.floor(e.start + (v - i) * yrs(e))); };
  const mid = (i: number) => (i === NE - 1 ? X_END : i + 0.5);

  let ticks = '';
  eras.forEach((e, i) => {
    for (let y = 0; y < yrs(e); y++) ticks += `<i class="${y ? '' : 'mj'}" style="left:${((i + y / yrs(e)) / NE * 100).toFixed(3)}%"></i>`;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'scrub__era'; b.tabIndex = -1; b.style.left = `${i / NE * 100}%`;
    b.innerHTML = `<b>${e.start}</b>`; b.append(e.tick);
    b.addEventListener('click', () => { stop(); set(mid(i)); track.focus({ preventScroll: true }); });
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
  function ui() {
    play.setAttribute('aria-pressed', String(playing));
    q('.scrub__lbl').textContent = playing ? heroText.pause : x < 0.35 ? heroText.restart : heroText.play;
    q('.scrub__ic').textContent = playing ? '❚❚' : '◀◀';
  }
  function start() { if (x < 0.35) set(X_END); playing = true; ui(); onPlay(); }
  function stop() { if (!playing) return; playing = false; ui(); onPlay(); }

  const fromPointer = (e: PointerEvent) => { const r = track.getBoundingClientRect(); return (e.clientX - r.left) / r.width * NE; };
  track.addEventListener('pointerdown', (e) => { stop(); dragging = true; track.setPointerCapture(e.pointerId); set(fromPointer(e)); e.preventDefault(); track.focus({ preventScroll: true }); });
  track.addEventListener('pointermove', (e) => { if (dragging) set(fromPointer(e)); });
  track.addEventListener('pointerup', () => { dragging = false; });
  track.addEventListener('pointercancel', () => { dragging = false; });
  track.addEventListener('keydown', (e) => {
    const i = Math.min(NE - 1, Math.floor(x)), k = e.key;
    let nx: number | null = null;
    if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageDown') nx = mid(Math.max(0, i - 1));
    else if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageUp') nx = mid(Math.min(NE - 1, i + 1));
    else if (k === 'Home') nx = 0.5; else if (k === 'End') nx = X_END;
    else if (k === ' ' || k === 'Enter') { if (playing) stop(); else start(); e.preventDefault(); return; }
    if (nx !== null) { stop(); set(nx); e.preventDefault(); }
  });
  play.addEventListener('click', () => { if (!playing && x < 0.35) { set(X_END); ui(); return; } if (playing) stop(); else start(); });

  era = startEra; x = mid(startEra); set(x); ui();
  return {
    era: () => era, playing: () => playing, start, stop,
    tick(dt) { if (!playing) return; set(x - dt * NE / RUN_S); if (x <= 0.05) { set(0.05); stop(); } },
  };
}
