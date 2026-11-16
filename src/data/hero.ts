/** Hero copy and settings that are not era or project content. Era captions live in src/content/eras/. */
import type { LensView } from './lenses';

/** Word rolled in front of `rest`; seconds each word stays. Reduced motion shows the first word only. */
export const rollingTitle = {
  words: [
    { word: 'Senior', seconds: 5 },
    { word: 'System', seconds: 5 },
    { word: 'Robotics', seconds: 5 },
    { word: 'AV', seconds: 5 },
    { word: 'Fullstack', seconds: 5 },
    { word: 'Data', seconds: 5 },
  ],
  rest: 'software engineer · 8+ years',
  label: 'Senior software engineer, 8+ years', // what screen readers hear
};

/** Readout tiles emphasised per lens (keys: speed, lane, ttc, gap, tracked, cpu). The full-stack lens also brings the chart forward (CSS). */
export const readoutEmphasis: Record<LensView, string[]> = {
  all: ['speed', 'ttc'],
  robotics: ['ttc', 'gap', 'tracked'],
  fullstack: ['speed', 'cpu'],
};

export const heroText = {
  readoutsCaption: 'Toy simulation running in your browser. Metrics are computed live from the scene.',
  play: 'Play my story backwards',
  pause: 'Pause the story',
  restart: 'Back to today',
  playSim: 'Play simulation',
};
