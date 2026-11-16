export type Lens = 'robotics' | 'fullstack';
export type LensView = Lens | 'all';

/** Lens a first-time visitor sees. 'all' is the general view. */
export const defaultLens: LensView = 'robotics';

export const lenses: { id: Lens; label: string; positioning: string }[] = [
  {
    id: 'robotics',
    label: 'Robotics',
    positioning:
      'I build the fail-safe software, embedded ports and simulators that help autonomous vehicles and robots get safely onto real roads.',
  },
  {
    id: 'fullstack',
    label: 'Full stack',
    positioning:
      'I build the data platforms, deployment tooling and dashboards that let engineers and leadership see what a fleet is doing.',
  },
];

/** "What I'm good at". `projects` are slugs; unknown slugs fail the build. */
export const capabilities: { title: string; blurb: string; lenses: Lens[]; projects: string[] }[] = [
  {
    title: 'Autonomous vehicles',
    blurb: 'Fallback behaviour, permit-critical systems and simulation for robotaxis and trucks.',
    lenses: ['robotics'],
    projects: ['autox-mrc', 'gatik-sim'],
  },
  {
    title: 'Robotics',
    blurb: 'ROS2 on embedded QNX, an underwater vehicle, a humanoid and a delivery robot.',
    lenses: ['robotics'],
    projects: ['autox-qnx', 'iitb-auv'],
  },
  {
    title: 'Simulation & safety metrics',
    blurb: 'Simulator backend, playback and in-browser metrics; safety metrics from simulation and road data.',
    lenses: ['robotics', 'fullstack'],
    projects: ['gatik-sim', 'gatik-metrics'],
  },
  {
    title: 'Data & ETL',
    blurb: 'Pipelines and KPI platforms on Grafana and InfluxDB that people use every day.',
    lenses: ['fullstack'],
    projects: ['autox-obs', 'usc-scry'],
  },
  {
    title: 'Full-stack apps',
    blurb: 'TypeScript and React front ends on cloud-native backends, plus the deployment tooling under them.',
    lenses: ['fullstack'],
    projects: ['gatik-saas', 'autox-bindeploy'],
  },
  {
    title: 'Visualization',
    blurb: 'Dashboards, graph visualization and in-browser tools.',
    lenses: ['fullstack'],
    projects: ['oss-flamegraph', 'mum-graphics'],
  },
];
