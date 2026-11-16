---
title: "Example post: how publishing works on this site"
date: 2026-11-14
summary: "A sample post that shows every formatting element, and explains how to publish a real one: add a markdown file, commit."
tags: [example, meta]
draft: false
---

This is an example post. It exists to show what a post looks like and to double as the authoring guide. Delete it, or set `draft: true` in its frontmatter, once you have real posts.

## How to publish

Publishing a post is committing one markdown file.

1. Add a file to `src/content/blog/`. The filename becomes the URL: `my-first-post.md` is served at `/blog/my-first-post/`.
2. Start it with the frontmatter shown below.
3. Commit and push to `main`. GitHub Actions builds the site and deploys it.

```yaml
---
title: "Post title"
date: 2026-11-14          # YYYY-MM-DD
summary: "One sentence, shown in the blog list and in link previews."
tags: [robotics, notes]   # optional
draft: false              # true keeps it out of the production build
---
```

Posts with `draft: true` appear when you run `npm run dev` and are left out of `npm run build`, so you can write in public history without publishing.

## What you can use

Headings, as above. Inline `code`, **bold** and *italic*, and [links](/projects/). Reading time is computed from the text, so there is nothing to fill in.

### Code blocks

Fenced blocks are highlighted automatically. Name the language after the opening fence.

```ts
// min/max downsampling: keep spikes when drawing many points
export function minMax(ys: number[], buckets: number): number[] {
  const size = Math.ceil(ys.length / buckets);
  const out: number[] = [];
  for (let b = 0; b < buckets; b++) {
    const slice = ys.slice(b * size, (b + 1) * size);
    out.push(Math.min(...slice), Math.max(...slice));
  }
  return out;
}
```

### Images with captions

Put images in `public/images/blog/` and reference them by absolute path. For a caption, use a `figure` element.

<figure>
  <img src="/images/blog/example-pipeline.svg" alt="Three boxes joined by arrows: write a markdown file, commit it, the site rebuilds" width="640" height="160" />
  <figcaption>Figure 1. The whole publishing pipeline.</figcaption>
</figure>

### Tables

| Element | Markdown | Notes |
| --- | --- | --- |
| Heading | `## Title` | Use `##` and `###`; the page title is the `h1` |
| Code | fenced block | Language name enables highlighting |
| Image | `figure` + `img` | Add `alt` text |
| Table | pipes | Scrolls sideways on narrow screens |

### Quotes

> A chart is a claim about the data. Downsampling decides which claims you are able to make.

That is everything. The style is the site's own, so there is no need to format anything by hand.
