# bhaskarsuper9000.github.io

Personal portfolio of Bhaskar Bandyopadhyay. Astro 7, static output, deployed to GitHub Pages (user site, base `/`). One design language everywhere: the "Instrument panel / HUD".

## Commands
- `npm run dev` / `npm run build` / `npm run preview`
- `npm run check` (astro check; keep at 0 errors, 0 warnings)
- `npm run resume:pdf` rebuilds `public/resume.pdf` from `/resume/classic/` (needs Chromium); run `npm run build` after

## Structure
- `docs/` design-guidelines.md, maintaining.md
- `src/content/` markdown: `eras/`, `projects/` (one file per project), `blog/` (one file per post); schemas in `src/content.config.ts`
- `src/data/` site.ts (name, links, nav), lenses.ts (lenses, capabilities), resume.ts (resume text, skills, headline numbers), hero.ts (rolling title words, readout emphasis per lens, hero labels)
- `src/styles/` tokens.css (all raw values), base.css (reset, prose), components.css (shared components)
- `src/layouts/` BaseLayout (head, nav, footer, settings), PostLayout
- `src/components/` site/ (chrome and primitives), home/ (hero, lens, proof points), resume/ (TL;DR and classic), projects/ (rows, filters, demos/, diagrams/, registry.ts), blog/
- `src/scripts/` boot.ts (pre-paint prefs and lens), settings.ts, lens.ts, filters.ts
- `src/scripts/hero/` home hero: sim.ts (scenes, metrics, camera), fallback2d.ts, render3d.ts (three.js, lazy chunk), readouts.ts, scrubber.ts, rolltitle.ts, hero.ts (wiring); copy in `src/data/hero.ts`
- `src/lib/content.ts` collection queries and helpers
- `src/pages/` routes; `public/` static files (favicon, resume.pdf, images); `scripts/` build-time helpers
- `prototypes/` old throwaway drafts; not part of the build, do not edit

## Conventions
- No UI framework, no Tailwind: Astro components, plain CSS custom properties, small vanilla TS modules.
- Use tokens only; no raw colours, px sizes or fonts outside `tokens.css` (exception: the classic resume paper and canvas scenes).
- Content lives in markdown and `src/data`, never hard-coded in components.
- Comments only where the why is not obvious; keep them terse.
- Visitor prefs persist under localStorage key `bb-site-prefs-v1`; lens under `bb-lens-v1`. Do not rename.

## Read first
- Before changing any UI or adding a component, read `docs/design-guidelines.md`.
- For adding jobs, projects, eras, posts, or updating the resume, follow `docs/maintaining.md`.

## Hard rules
- Never publish a phone number, date of birth, roll numbers, grades or GPAs, anywhere (including the PDF).
- Gatik work is confidential: `disclosure: text` only, a few lines, no diagrams, demos or screenshots.
- Do not invent facts, metrics or quotes; hedge what is unconfirmed (see "Facts to confirm" in docs/maintaining.md).
