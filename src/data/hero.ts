/** Hero copy and settings that are not era or project content. Era captions live in src/content/eras/. */
/** Word rolled in front of `rest`; seconds each word stays. Reduced motion shows the first word only. */
export const rollingTitle = {
  words: [
    { word: 'Senior', seconds: 2.5 },
    { word: 'System', seconds: 2.5 },
    { word: 'Robotics', seconds: 2.5 },
    { word: 'AV', seconds: 2.5 },
    { word: 'Fullstack', seconds: 2.5 },
    { word: 'Data', seconds: 2.5 },
  ],
  rest: 'software engineer · 8+ years',
  label: 'Senior software engineer, 8+ years', // what screen readers hear
};

/** Readout tiles shown first and emphasised (keys: speed, lane, ttc, gap, tracked, cpu). */
export const readoutEmphasis = ['speed', 'ttc'];

export const heroText = {
  readoutsCaption: 'Toy simulation running in your browser. Metrics are computed live from the scene.',
  playStory: 'Play the timeline backwards',
  pauseStory: 'Pause the timeline',
  playSim: 'Play simulation',
};
