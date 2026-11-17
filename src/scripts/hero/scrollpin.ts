/** Holds the home page still while it scrolls and turns that scroll into timeline progress (0 = today,
    1 = oldest era); past the end the page scrolls on. The content under the hero is held with it, so it
    is in view from the start. On narrow screens the hero is a tall column, so the page is held once the
    scene reaches the top, with the scene and timeline both in view. */
export interface ScrollPin { active(): boolean; refresh(): void; scrollTo(p: number): void }

const PER_ERA_VH = 0.3; // scroll distance per era, in viewport heights

export function createScrollPin(hero: HTMLElement, eraCount: number, onProgress: (p: number) => void): ScrollPin {
  const pin = hero.closest<HTMLElement>('.hero-pin'), body = pin?.firstElementChild as HTMLElement | null;
  const narrow = matchMedia('(max-width: 860px)');
  const stage = hero.querySelector<HTMLElement>('[data-hero-stage]'), scrub = hero.querySelector<HTMLElement>('[data-hero-scrubber]');
  let on = false, start = 0, dist = 1, skip = false;

  function refresh() {
    if (!pin || !body) return;
    on = eraCount > 1;
    pin.classList.toggle('is-pinned', on);
    if (!on) { pin.style.height = ''; body.style.top = ''; return; }
    const navH = document.querySelector<HTMLElement>('.nav')?.offsetHeight ?? 0;
    const bodyTop = body.getBoundingClientRect().top, off = (el: HTMLElement | null, edge: 'top' | 'bottom') => (el ? el.getBoundingClientRect()[edge] - bodyTop : 0);
    // hold with the scene (narrow) or the hero (wide) under the nav, but never with the timeline below the window
    const top = Math.round(Math.min(navH - off(narrow.matches ? stage : hero, 'top'), innerHeight - off(scrub ?? hero, 'bottom')));
    dist = Math.round((eraCount - 1) * PER_ERA_VH * innerHeight);
    body.style.top = `${top}px`;
    pin.style.height = `${body.offsetHeight + dist}px`;
    start = pin.getBoundingClientRect().top + scrollY - top;
  }
  const read = () => Math.max(0, Math.min(1, (scrollY - start) / dist));

  addEventListener('scroll', () => {
    if (!on) return;
    if (skip) { skip = false; return; }
    onProgress(read());
  }, { passive: true });
  if (body) new ResizeObserver(refresh).observe(body); // content below the hero can change height (fonts, text size)

  refresh();
  return {
    active: () => on,
    refresh,
    // keeps the page position in step when the timeline is dragged or keyed
    scrollTo(p) { if (!on) return; const y = Math.round(start + p * dist); if (Math.abs(y - scrollY) < 1) return; skip = true; scrollTo({ top: y, behavior: 'instant' }); },
  };
}
