import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import StreetlightsDemo from './demos/StreetlightsDemo.astro';
import ObservabilityDiagram from './diagrams/ObservabilityDiagram.astro';

/** Frontmatter `component:` keys. Add the component here to switch a project's demo or diagram on. */
export const registry: Record<string, AstroComponentFactory> = {
  streetlights: StreetlightsDemo,
  observability: ObservabilityDiagram,
};
