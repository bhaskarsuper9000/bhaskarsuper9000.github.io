/** Resume content shared by /resume/ (TL;DR) and /resume/classic/ (print). Never add phone, date of birth or grades. */

export const summary =
  'Eight-plus years building autonomous-vehicle, robotics and simulation platforms, and the data tools developers and leadership use to decide.';

export const headline = [
  { value: '8+', label: 'years in autonomous platforms' },
  { value: '~$1.1M', label: 'saved a year at AutoX' },
  { value: '93%', label: 'of failure cases recovered (MRC)' },
  { value: '4 & 3', label: 'person teams led' },
];

export interface Bullet {
  text: string;
  /** project slug; makes the bullet explorable */
  slug?: string;
}
export interface Role {
  id: string;
  org: string;
  title: string;
  dates: string;
  headline: string;
  confidential?: boolean;
  bullets: Bullet[];
}

export const roles: Role[] = [
  {
    id: 'gatik',
    org: 'Gatik AI',
    title: 'Senior Software Engineer, Platform',
    dates: 'Jan 2025 – Oct 2026',
    confidential: true,
    headline: 'In-house autonomous-vehicle simulator, a leadership data app, and safety metrics from simulation and production.',
    bullets: [
      { slug: 'gatik-sim', text: 'Built core backend of an in-house autonomous-vehicle simulator, with playback, users, browser-based metrics and LLM features' },
      { slug: 'gatik-saas', text: 'Full-stack SaaS app joining company data from many sources into tools and dashboards for leadership' },
      { slug: 'gatik-metrics', text: 'Generated safety metrics from simulation and production data: encroachment time, collisions, lane boundary violations, exposure' },
      { text: 'Maintained a legacy Foxglove UI plugin for on-road visualization; unblocked critical tests, saving ~$60k' },
    ],
  },
  {
    id: 'autox',
    org: 'AutoX Technologies',
    title: 'Senior Software Engineer',
    dates: 'Jan 2018 – Oct 2024',
    headline: 'Led MRC (team of 4, 93% of failure cases recovered) and Binary Deployment (team of 3); ~$1.1M/yr saved with Binary Deployment and Observability; driverless permit work.',
    bullets: [
      { slug: 'autox-mrc', text: 'Led Minimum Risk Condition (MRC), team of 4: graceful recovery in 93% of failure cases' },
      { slug: 'autox-bindeploy', text: 'Proposed and led Binary Deployment, team of 3: about $800K saved annually' },
      { slug: 'autox-obs', text: 'Introduced Observability: KPI metrics visualization, saving $300K of developer time yearly' },
      { slug: 'autox-ptp', text: 'Expedited PTP time sync between lidar and cameras for the CPUC permit' },
      { slug: 'autox-flipdot', text: 'Expedited the flip-dot display for the CPUC permit' },
      { slug: 'autox-driveu', text: 'Expedited remote control (DriveU) for the CPUC permit' },
      { slug: 'autox-qnx', text: 'Ported a lighter ROS2 stack to embedded QNX; autonomy teams ported modules in 10 days' },
      { slug: 'autox-robot', text: 'Added auto path routing to a mini delivery robot for investor demos, leading to a successful Series B' },
    ],
  },
  {
    id: 'scry',
    org: 'Scry Analytics',
    title: 'Data Scientist & Engineering Intern',
    dates: 'Jun – Dec 2017',
    headline: 'REST API 3x faster, core algorithm ~20x faster, graph visualization.',
    bullets: [
      { slug: 'usc-scry', text: 'In-memory data transfer via SWIG (REST API 3x faster); core algorithm to O(n), ~20x speedup; graphs in neo4j & sigma.js' },
    ],
  },
  {
    id: 'oracle',
    org: 'Oracle Corporation, Bangalore',
    title: 'Applications Engineer',
    dates: 'Jul – Dec 2015',
    headline: 'Cloud CRM scripts and add-ins, delivered ahead of schedule.',
    bullets: [
      { slug: 'oracle-crm', text: 'Upgraded PHP scripts and C# add-ins for Oracle Cloud CRM ahead of schedule for Nike, British Telecom and others' },
    ],
  },
];

export interface MoreSection {
  id: string;
  title: string;
  teaser: string;
  items: Bullet[];
}

export const more: MoreSection[] = [
  {
    id: 'projects',
    title: 'Projects',
    teaser: 'Nao robot, Prime Engine, Matsya AUV, thesis, Turbo C graphics',
    items: [
      { slug: 'usc-nao', text: 'Nao robot: inverse kinematics and dynamics to draw and walk' },
      { slug: 'usc-kernel', text: 'Mini Unix kernel (processes, threads, scheduler, syscalls, VM)' },
      { slug: 'usc-prime', text: 'Prime Engine game engine: culling, physics and UI' },
      { slug: 'usc-cad', text: 'DARPA research assistant, Spatial Sciences Institute: CAD format with embedded semantics, paper at Symposium on Solid and Physical Modeling 2017' },
      { slug: 'iitb-auv', text: 'Matsya autonomous underwater vehicle team: drivers, navigation, mapping, vision' },
      { slug: 'iitb-roadmapper', text: 'Thesis: real-time mapping of road surface defects with Kinect and machine learning' },
      { slug: 'iitb-vgis', text: 'Virtual GIS: 3D model of the department building with indoor shortest path' },
      { slug: 'mum-graphics', text: '16-bit graphics in Turbo C and assembly: SVGA, an image editor, a BMP codec' },
      { slug: 'mum-robots', text: 'Final-year project: mobile robots controlled remotely over the web' },
    ],
  },
  {
    id: 'hackathons',
    title: 'Hackathons',
    teaser: '1st prize Smart Energy 2014, top 4 Caltech 2016',
    items: [
      { slug: 'iitb-streetlights', text: '1st prize, Smart Energy Hackathon 2014: smart streetlights' },
      { slug: 'usc-fullerene', text: 'Fullerene, phone as game controller: top 4 at Caltech HackTech 2016' },
      { slug: 'usc-resurrect', text: 'Resurrect: top 10% at LA Hacks, UCLA 2017' },
    ],
  },
  {
    id: 'opensource',
    title: 'Open source',
    teaser: 'indicator-multiload, Apollo Auto, Grafana flamegraph',
    items: [
      { slug: 'oss-multiload', text: 'Multi-GPU support for Ubuntu indicator-multiload' },
      { slug: 'oss-apollo', text: 'Fix to Apollo Auto real-time charts' },
      { slug: 'oss-flipdot', text: 'Fixes to a flip-dot display library' },
      { slug: 'oss-flamegraph', text: 'Grafana flamegraph panel update' },
    ],
  },
  {
    id: 'teaching',
    title: 'Teaching & mentoring',
    teaser: 'Java to 20 grads, 10+ juniors mentored',
    items: [
      { text: 'Taught Java to 20 grads, helping them secure top software jobs' },
      { text: 'Interviewed 30+ people and mentored 10+ junior developers' },
      { text: 'Led a CS student team of 15 at the University of Mumbai' },
    ],
  },
];

export const education = [
  { school: 'University of Southern California', degree: 'MS Computer Science', dates: 'Jan 2016 – Dec 2017' },
  { school: 'IIT Bombay', degree: 'MTech Geo-Informatics', dates: 'Jul 2013 – Jun 2015' },
  { school: 'University of Mumbai', degree: 'BE Computer Engineering', dates: 'Aug 2008 – Jul 2012' },
];

export const skills = [
  { group: 'Languages', items: ['C/C++', 'Python', 'SQL', 'TypeScript', 'shell', 'Java', 'Go'] },
  { group: 'Frameworks', items: ['ROS2', 'gtest', 'abseil', 'Boost', 'OpenCV', 'PCL', 'Protobuf', 'eBPF'] },
  { group: 'Data', items: ['TimescaleDB / Postgres', 'Mongo', 'Redis', 'Influx', 'Neo4j'] },
  { group: 'Web', items: ['React', 'Node.js', 'Angular', 'D3.js'] },
  { group: 'Cloud / DevOps', items: ['Grafana', 'Loki', 'Kubernetes', 'Azure', 'Docker', 'Ansible', 'Argo', 'Airflow', 'Bazel'] },
  { group: 'Standards', items: ['ISO 26262', 'DDS', 'RTPS', 'OAuth2', 'CAN', 'Serial'] },
];
/** Shown inline on the TL;DR; the rest sit behind "+N more". */
export const topSkills = ['C/C++', 'Python', 'TypeScript', 'ROS2', 'Kubernetes', 'Grafana', 'React', 'SQL'];

export const publications = [
  'Automatic learning of user design rationales from examples. Symposium on Solid and Physical Modeling, 2017.',
  'HyberFast: an effective way to save/resume processes with prevention of real-time data loss. Springer, 2011.',
  'XBee associated network based dynamic updation. National Conference on Emerging Trends in Engineering and Technology, 2012.',
];

/** Compact rows for the one-page classic resume only. */
export const classicExtras = [
  { label: 'Robotics', text: 'Matsya autonomous underwater vehicle (drivers, navigation, mapping, vision); Nao inverse kinematics to draw and walk; web-controlled mobile robots' },
  { label: 'Research', text: 'DARPA research assistant, USC Spatial Sciences Institute: CAD format with embedded semantics. MTech thesis: real-time mapping of road-surface defects with Kinect and machine learning' },
  { label: 'Open source', text: 'Multi-GPU support for Ubuntu indicator-multiload; fixes to Apollo Auto and a flip-dot library; Grafana flamegraph panel update' },
  { label: 'Hackathons', text: '1st prize, smart streetlights (IIT Bombay 2014); top 4 Best Entertainment, Fullerene (Caltech HackTech 2016); top 10%, Resurrect (LA Hacks, UCLA 2017)' },
  { label: 'Mentorship', text: 'Interviewed 30+ people and mentored 10+ junior developers; taught Java to 20 grads' },
];
