import { getCollection, type CollectionEntry } from 'astro:content';
import { registry } from '../components/projects/registry';

export type Project = CollectionEntry<'projects'>;
export type Era = CollectionEntry<'eras'>;
export type Post = CollectionEntry<'blog'>;
export type Disclosure = Project['data']['disclosure'];

/** Drafts show in `astro dev` only. */
const live = <T extends { data: { draft: boolean } }>(e: T) => import.meta.env.DEV || !e.data.draft;

export async function getEras(): Promise<Era[]> {
  return (await getCollection('eras')).sort((a, b) => a.data.order - b.data.order);
}

/** Newest first. */
export async function getProjects(): Promise<Project[]> {
  return (await getCollection('projects', live)).sort((a, b) => b.data.sort - a.data.sort);
}

export async function getPosts(): Promise<Post[]> {
  return (await getCollection('blog', live)).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * What the page actually offers. A diagram or demo needs a registered component;
 * until it is built the project is shown (and badged) as a write-up.
 */
export function effectiveDisclosure(p: Project): Disclosure {
  const d = p.data.disclosure;
  if (d === 'diagram' || d === 'demo') return p.data.component && registry[p.data.component] ? d : 'write-up';
  return d;
}

export const kindLabels: Record<Project['data']['kind'], string> = {
  work: 'Work',
  academic: 'Academic',
  hackathon: 'Hackathon',
  'open-source': 'Open source',
  personal: 'Personal',
};
export const disclosureLabels: Record<Disclosure, string> = {
  text: 'Text only',
  diagram: 'Diagram',
  demo: 'Demo',
  'write-up': 'Write-up',
};

/** Featured projects for the home page: ranked first (lower = better), then newest. */
export function featuredProjects(projects: Project[], n = 4): Project[] {
  return projects.filter((p) => p.data.featured).sort((a, b) => (a.data.rank ?? Infinity) - (b.data.rank ?? Infinity) || b.data.sort - a.data.sort).slice(0, n);
}

export const projectHref = (slug: string) => `/projects/${slug}/`;

export function readingMinutes(markdown: string): number {
  const words = markdown.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
