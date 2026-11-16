export const site = {
  name: 'Bhaskar Bandyopadhyay',
  short: 'Bhaskar B.',
  url: 'https://bhaskarsuper9000.github.io',
  title: 'Bhaskar Bandyopadhyay | autonomous vehicles, robotics, data, full stack',
  description:
    'Software engineer, 8+ years: autonomous vehicles, robotics, simulation and safety metrics, data platforms, full-stack apps and visualization.',
  positioning:
    'I build the simulators, safety metrics and data tools that help autonomous vehicles and robots get safely onto real roads.',
  email: 'bhaskarsuper9000@gmail.com',
  github: { label: 'github.com/bhaskarsuper9000', url: 'https://github.com/bhaskarsuper9000' },
  linkedin: { label: 'linkedin.com/in/oscarbandy', url: 'https://www.linkedin.com/in/oscarbandy' },
  resumePdf: '/resume.pdf',
} as const;

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Resume', href: '/resume/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'Blog', href: '/blog/' },
] as const;
