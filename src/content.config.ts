import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const eras = defineCollection({
  loader: glob({ base: './src/content/eras', pattern: '*.md' }),
  schema: z.object({
    title: z.string(),
    role: z.string().optional(),
    years: z.string(),
    start: z.number(),
    end: z.number(),
    caption: z.string(),
    order: z.number(), // 1 = newest
    scene: z.string().optional(), // key of `scenes` in src/scripts/hero/sim/index.ts; eras without one are skipped by the hero scrubber
    ego: z.string().optional(), // what the hero readouts call the moving thing
    tick: z.string().optional(), // short scrubber label; defaults to title
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '*.md' }),
  schema: z.object({
    title: z.string(),
    era: reference('eras'),
    year: z.string(), // display label, e.g. "2018–24"
    sort: z.number(), // ordering key only: higher = newer
    summary: z.string(),
    kind: z.enum(['work', 'academic', 'hackathon', 'open-source', 'personal']),
    disclosure: z.enum(['text', 'diagram', 'demo', 'write-up']),
    role: z.string().optional(),
    stack: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    lenses: z.array(z.enum(['robotics', 'fullstack'])).default([]),
    rank: z // lower = more prominent
      .object({ all: z.number().optional(), robotics: z.number().optional(), fullstack: z.number().optional() })
      .default({}),
    metric: z.object({ value: z.string(), label: z.string() }).optional(),
    featured: z.boolean().default(false),
    component: z.string().optional(), // key in components/projects/registry.ts
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '*.md' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { eras, projects, blog };
