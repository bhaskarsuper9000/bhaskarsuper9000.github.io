/** Scene colours resolved from the HUD tokens, so theme and accent settings reach the canvases. */
export interface Palette {
  light: boolean; accent: string; warn: string; ego: string; agent: string; static: string; world: string; grid: string;
  fill: string; fillEgo: string; road: string; accentSoft: string; text2: string; line: string; bg: string;
}

let probe: HTMLElement | null = null;
function css(v: string): string {
  if (!probe) { probe = document.createElement('i'); probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; document.body.appendChild(probe); }
  probe.style.color = '';
  probe.style.color = v;
  return getComputedStyle(probe).color;
}
const rgb = (s: string) => (s.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
function mix(a: string, b: string, t: number): string {
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

export function readPalette(): Palette {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  const accent = css('var(--accent)'), text = css('var(--text)'), text2 = css('var(--text-2)'), lineS = css('var(--line-strong)'), bg = css('var(--bg)');
  const surface = light ? css('var(--surface-solid)') : bg;
  return {
    light, accent, warn: css('var(--warn)'), ego: accent,
    agent: mix(text2, text, light ? 0.35 : 0.25), static: mix(lineS, text2, light ? 0.5 : 0.45),
    world: light ? mix(lineS, bg, 0.15) : mix(lineS, text2, 0.2), grid: light ? mix(lineS, text2, 0.3) : lineS,
    fill: light ? surface : mix(bg, accent, 0.035), fillEgo: light ? mix(surface, accent, 0.05) : mix(bg, accent, 0.07),
    road: mix(bg, lineS, light ? 0.1 : 0.07), accentSoft: `rgba(${rgb(accent).join(',')},0.25)`,
    text2, line: css('var(--line)'), bg,
  };
}
