# Design guidelines: the Instrument panel language

Every page must look like it belongs to the same cockpit. If you are unsure, copy the nearest existing page. Source of truth: `src/styles/tokens.css` (values), `base.css` (type, prose), `components.css` (shared components).

## Principles
1. Instrument, not poster: thin luminous lines, small-caps mono and condensed labels, square corners, data as readouts.
2. Dark first, with a deliberate light theme. Both must work on every page; check both.
3. One accent at a time (visitor-selectable). Accent marks interaction and key numbers, never body text blocks.
4. Calm: no motion that is not responding to the visitor, except tiny status blips. Nothing loops loudly.
5. Static first: pages must be complete without JavaScript, except the interactive demos and diagrams.
6. Honest content: no fake metrics, no "coming soon" stubs, no empty sections. If a thing is not built, leave it out.

## Tokens (`tokens.css`)
- Colour: `--bg --bg-2` page; `--surface --surface-2` panel fills (translucent); `--surface-solid` for overlays on top of content; `--text --text-2` (secondary, keep >= 4.5:1); `--line` quiet hairline; `--line-strong` borders and rulers; `--accent --on-accent --accent-soft`; `--warn` confidential/caution; `--ok`; `--focus`; `--code-bg --code-text`; `--grid`; `--glow` (none in light).
- Swatches `--sw0..5` (cyan, green, amber, orange, sky, magenta) feed `--accent` via `data-accent`.
- Type: `--font-head` (condensed, uppercase, tracked), `--font-body`, `--font-mono`; sizes `--fs-display --fs-h1 --fs-h2 --fs-h3 --fs-lead --fs-body --fs-sm --fs-xs`; `--track-head`, `--track-label`.
- Space: `--space-1..6`, `--pad` gutter, `--maxw`, `--measure` (reading width), `--navh`.
- Lines/shape: `--radius` (0), `--line-w`, `--line-w-strong`, `--bracket-len`, `--bracket-w`, `--focus-w`.
- Motion: `--dur-fast --dur --dur-slow --ease`.
- Use `rem` for everything that should scale with the visitor's text size. Never use raw hex, `px` font sizes or font names outside `tokens.css`.

## Visitor settings (apply to every page)
Set as attributes on `<html>` before first paint (`scripts/boot.ts`): `data-theme` light/dark, `data-font` instrument/sans/serif/mono/legible, `data-size` s/m/l/xl (scales root font size), `data-accent` 0-5, plus `data-lens` on the home page. Never hard-code a colour that ignores these. Components that must keep a fixed look (the print resume paper, canvas scenes) say so in a comment.

## Components (global ones are in `components.css`)
- **Panel** (`Panel.astro`, `.panel`): corner-bracket frame, the default container. `tone="warn"` for confidential content, `tone="quiet"` for small inline frames. Do not nest panels more than one level.
- **Readout tile** (`.readout`, `__label`, `__value`): a labelled number. Values in mono. `--emph` for the single most important number in a group, `--warn` for caution.
- **Tick ruler** (`TickRuler.astro`): decoration only. Exactly one under the nav (already in `Nav.astro`) and one under each section head. Never add another ruler near the top of a page (the prototype showed a doubled row; do not reintroduce it).
- **Section head** (`SectionHead.astro`): number, title, optional meta, ruler. **Page head** (`PageHead.astro`): eyebrow, h1, lead; first thing on every inner page.
- **Buttons** (`.btn`): default outline; `.btn--primary` (one per view); `.btn--ghost` for tertiary actions. Labels are short, uppercase by style.
- **Tag** (`.tag`): stack/topic labels, not clickable. **Chip** (`.chip`): toggle filter, uses `aria-pressed`.
- **Badge** (`.badge--text|diagram|demo|write-up`): the disclosure type of a project. Amber = confidential text-only.
- **Lens switch** (`LensSwitch.astro`): two segments, clicking the active one clears it to the general view. Default is `defaultLens` in `src/data/lenses.ts` (Robotics). State: `?lens=robotics|fullstack|all`, `bb-lens-v1`.
- **Settings panel** (`SettingsPanel.astro`): a popover opened from the nav; never duplicate it inline.
- **Prose** (`.prose`): markdown body styling (headings, code, tables, figures, quotes). Use it for any long-form text.

## Hero scene, logo, rolling title
- **Scene** (`scripts/hero/`): a toy simulation per era, drawn as thin lines with translucent fills: ego in `--accent`, other agents in `--text-2`, world in `--line-strong`, warnings in `--warn`. Colours are read from the tokens at runtime (`palette.ts`), so theme and accent changes apply; no colour constants in scene code. No bloom, no post-processing, no external models or textures.
- **Motion limits**: calm chase/orbit camera, slight pointer parallax, one lidar/sonar sweep; 0.28 s fade out and 0.45 s fade in between eras. Pixel ratio capped at 2; rendering pauses when the tab is hidden, the hero is off screen, or the visitor presses pause.
- **Timeline**: on wide screens the home page (hero and the sections under it) is held still and page scroll moves the timeline from today back to the oldest era (`scrollpin.ts`), then the page scrolls on. Dragging, era ticks and arrow keys work too and keep the scroll position in step. On narrow screens the page is held once the scene reaches the top, so scene and timeline stay in view. Its focus ring shows for keyboard use only.
- **Dark theme is calm, not neon**: muted accents and a faint `--glow`. Do not add stronger glows or more saturated accents.
- **Fallbacks**: text, lens and proof points are server-rendered and never wait for the scene. Order: 2D-canvas still (`fallback2d.ts`), then three.js crossfades in. No WebGL, `?static=1` or reduced motion keep the still (reduced motion adds a Play button). Without JS: a faint grid, headline numbers and an era strip.
- **Readouts** are computed from the scene each frame (textbook TTC, gap, lane offset); never fake them. The lens only changes which tiles are emphasised.
- **Logo** (`Logo.astro`): static "BB" monogram on an accent-filled hexagon. No animation.
- **Rolling title**: one word in front of "software engineer", ~400 ms decode; the slot eases its width so nothing jumps. Screen readers get one stable label. Static first word under reduced motion.

## Typography and layout
- Headings are uppercase and tracked in the default font, normal case in the other fonts (handled by tokens, do not force `text-transform` on prose).
- Body copy max width `--measure`. Page width `--maxw`, gutter `--pad`.
- Layout must hold at 1440px and 390px with no horizontal scroll. Grids that contain wide children need `minmax(0, 1fr)`.

## Motion
Subtle: 120-450 ms eases, fades and short slides only. Respect `prefers-reduced-motion` (global rule in `base.css` removes animation and transitions; JS animation must check `matchMedia('(prefers-reduced-motion: reduce)')` and show the end state).

## Accessibility
- Contrast: text >= 4.5:1 against its surface in both themes and all six accents; check new colours in light too.
- Visible focus on everything interactive (`:focus-visible` outline in `--focus`); do not remove outlines.
- Everything reachable and usable by keyboard; toggles use real `<button aria-pressed>`; dialogs close on Esc.
- Decorative SVG/canvas is `aria-hidden`; informative graphics get a text alternative or an equivalent list.
- Touch targets at least about 2.4rem tall.

## Do
- Reuse components and tokens; add a token before adding a one-off value.
- Put page-specific layout in the component's own `<style>`; put anything used on 2+ pages in `components.css`.
- Test dark and light, 1440 and 390, and at the largest text size.

## Don't
- No UI framework, Tailwind, web fonts or external requests.
- No rounded corners, drop shadows or gradients outside the existing glow and bracket language.
- No second ruler, second primary button in a view, or decorative animation that loops.
- No placeholder "coming soon" sections.
