# bhaskarsuper9000.github.io

Portfolio site: Astro, static, GitHub Pages.

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run preview
npm run check      # type and template check
npm run resume:pdf # regenerate public/resume.pdf (needs Chromium), then rebuild
```

## Deploy
Push to `main`. `.github/workflows/deploy.yml` builds with the official Astro action and publishes to Pages. The workflow runs `npm run ci` (type check, build, private-data check) and also builds pull requests without deploying. Pages source is set to GitHub Actions.

## Add a blog post
Add `src/content/blog/my-post.md` with `title`, `date`, `summary` (and optional `tags`, `draft`), commit, push. See `src/content/blog/example-post.md`.

## Add a project
Add `src/content/projects/my-project.md` (copy any existing file for the frontmatter). It appears on `/projects/` and gets its own page. Full recipes, including new jobs and the resume, are in `docs/maintaining.md`. Design rules are in `docs/design-guidelines.md`.
