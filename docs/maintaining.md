# Maintaining the site

Content is markdown plus a few data files. After any change run `npm run check && npm run build`.

## New blog post
1. Create `src/content/blog/<slug>.md` (the filename is the URL `/blog/<slug>/`).
2. Frontmatter: `title`, `date` (YYYY-MM-DD), `summary` (one line), optional `tags: [..]`, `draft: true|false`.
3. Write markdown. Images go in `public/images/blog/` and are referenced as `/images/blog/x.png`. See `src/content/blog/example-post.md` (delete it or set `draft: true` once real posts exist).
4. Commit and push to `main`. Drafts show in `npm run dev` only.

## New project
1. Create `src/content/projects/<slug>.md`; copy an existing file. Fields: `title`, `era` (an id from `src/content/eras/`), `year` (display label, e.g. "2018-24" or "c. 2019-20"), `sort` (number, higher = newer; only used for ordering), `summary` (one line), `kind` (work, academic, hackathon, open-source, personal), `disclosure` (text, diagram, demo, write-up), optional `role`, `stack`, `links`, `lenses`, `rank`, `metric`, `featured`, `component`, `draft`.
2. The body is the write-up in markdown. Keep to facts; if there is nothing more than the summary, leave the body empty.
3. `disclosure: diagram|demo` only takes effect when `component` names a key registered in `src/components/projects/registry.ts`. Until then the project is shown (and badged) as a write-up. To add one: create the component in `components/projects/demos/` or `diagrams/` (vanilla TS in a component `<script>`), register it, set `component:` in the project.
4. Employer work: use `disclosure: text`.

## New job or era
1. Add `src/content/eras/<id>.md` (`title`, `role`, `years`, `start`, `end`, `caption`, `order`; order 1 is newest; bump the order of older eras).
2. Set the previous job's end date in its era, in `src/data/resume.ts` (`roles[].dates`), and in any project `year` labels that said "present".
3. `src/data/resume.ts`: add a role with bullets (use `slug` to link a bullet to a project), update `headline` numbers and `summary` if they changed.
4. Add the projects (above) and give them lens ranks (below). Update `capabilities` in `src/data/lenses.ts` if a new strength appears.
5. The hero era strip and scrubber read the eras collection. To show the era in the hero scene, set `scene:` (a key of `scenes` in `src/scripts/hero/sim/index.ts`), `ego:` (readout label) and optionally `tick:` (short scrubber label). Eras without `scene` are skipped by the live scrubber.
6. Update `src/data/site.ts` (`tagline`, `roles`, `positioning`) if the title changed.
7. Regenerate the one-page resume: `npm run resume:pdf`, then `npm run build`; confirm 1 page with `pdfinfo public/resume.pdf`. If it overflows, trim bullets in `resume.ts` or `classicExtras`.

## New hero scene
1. Add `src/scripts/hero/sim/scenes/<name>.ts` (copy `scenes/oracle.ts`, the smallest). Register its models there with `model('key', (g) => { g.box(...); g.cyl(...); g.seg(...) })` from `../geo` (metres, y up, forward +z; models used by several scenes go in `sim/shared-models.ts`), and export a class implementing `Scene` (`types.ts`): `step`, `metrics` (5 tiles; keys speed, lane, ttc, gap, tracked are slot names only), `objects`, `labels`, `cam`, `ground`, `ring`, `describe`, `chart`.
2. Import it and register it in `scenes` in `sim/index.ts`, and set `scene: <key>` in the era's markdown.
3. Check `/?era=<id>`, `/?era=<id>&static=1`, light theme and phone; `?debug=1` shows errors and draw counts.

## Change the rolling title
Edit `rollingTitle` in `src/data/hero.ts` (words, seconds each, the rest of the line, and the screen-reader label). Test with `/?roll=fast` or `/?roll=hold&t=<seconds>`.

## Change lens rankings
In each project's frontmatter: `lenses: [robotics, fullstack]` puts it in a lens; `rank: { robotics: 1, fullstack: 2, all: 3 }` orders it (lower first). The home page shows the top 4 per lens; first-time visitors get `defaultLens` (`src/data/lenses.ts`); with no lens selected it shows `featured: true` projects ordered by `rank.all`. Unranked projects follow by recency.

## Change headline numbers
`src/data/resume.ts` `headline` (hero readouts and TL;DR stats). Per-project numbers are `metric: { value, label }` in the project (used by the hero proof points and the project page). Keep values short ("$800K/yr", "93%", "10 days").

## Mark something confidential
Set `disclosure: text`, remove `component`, `links` and screenshots, keep the body to a few lines. The page then shows the confidential note automatically.

## Retire old content
Set `draft: true` (hidden from production, still in the repo) or delete the file. Remove its slug from `resume.ts` and `capabilities` first, or the build fails on the unknown slug.

## Deploy
Push to `main`; the GitHub Action builds and publishes. Pages source is GitHub Actions (repository Settings > Pages). Local check: `npm run build && npm run preview`.

## Privacy checklist before pushing
`npm run ci` (type check, build, `scripts/check-private.mjs`) is what GitHub Actions runs on every push and pull request; run it before pushing. The check scans built pages for phone-like numbers, date of birth, grades and removed lines; it does not read the PDF, so also run `pdftotext public/resume.pdf -` after `npm run resume:pdf`.

## Facts to confirm
- Open-source items (indicator-multiload, Apollo Auto fix, flip-dot driver, Grafana flamegraph): the dates are approximate ("c. 2019-20", "date unconfirmed" for multiload) and the Apollo repo link points to the upstream project.
- Food-waste display: date and hardware/stack unconfirmed.
- Power-aware data-centre prototype (kvm): date unconfirmed.
- Smart streetlights: the owner's exact role (hardware vs software vs PCBs) and the hardware details; the page text is taken from the repositories and says the energy-saving logic was unfinished.
- Matsya AUV: "6 DOF" and the localisation/tracking and map-tool items come from older resumes.
- Satellite classifier, web GIS/SOS, RTOS, TCP and AI coursework: years are course-period guesses ("2013-15").
- Resurrect: "top 10% of 200+" (an older resume says top 20 of 200+).
- Gatik end date (Oct 2026) and the "~$60k Foxglove plugin" bullet are carried over from the earlier drafts.
- Lens top-4 choices (Robotics: MRC, QNX, simulator, flip-dot; Full stack: Binary Deployment, Observability, Scry, leadership platform) need the owner's sign-off.
