/** Home page "Areas of interest". `projects` are slugs; unknown slugs fail the build. */
export const capabilities: { title: string; blurb: string; projects: string[] }[] = [
  {
    title: 'Autonomous vehicles',
    blurb: 'Fallback behaviour, permit-critical systems and simulation for robotaxis and trucks.',
    projects: ['autox-mrc', 'gatik-sim'],
  },
  {
    title: 'Robotics',
    blurb: 'ROS2 on embedded QNX, an underwater vehicle, a humanoid and a delivery robot.',
    projects: ['autox-qnx', 'iitb-auv'],
  },
  {
    title: 'Simulation & safety metrics',
    blurb: 'Simulator backend, playback and in-browser metrics; safety metrics from simulation and road data.',
    projects: ['gatik-sim', 'gatik-metrics'],
  },
  {
    title: 'Data & ETL',
    blurb: 'Pipelines and KPI platforms on Grafana and InfluxDB that people use every day.',
    projects: ['autox-obs', 'usc-scry'],
  },
  {
    title: 'Full-stack apps',
    blurb: 'TypeScript and React front ends on cloud-native backends, plus the deployment tooling under them.',
    projects: ['gatik-saas', 'autox-bindeploy'],
  },
  {
    title: 'Visualization',
    blurb: 'Dashboards, graph visualization and in-browser tools.',
    projects: ['oss-flamegraph', 'mum-graphics'],
  },
];
