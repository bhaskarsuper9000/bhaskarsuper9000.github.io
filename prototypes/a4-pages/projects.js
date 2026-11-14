/* Single source of truth for the project list (newest first).
   Fields: id, era, year, title, summary, tags[], kind, disc
   kind: work | academic | hackathon | opensource | personal
   disc: text | diagram | demo | writeup
   Within an era, order is by judgement where the resumes give no month. */
const ERAS = [
  { id: 'gatik',  name: 'Gatik',               range: '2025–26', role: 'Senior Software Engineer, Platform' },
  { id: 'autox',  name: 'AutoX Technologies',  range: '2018–24', role: 'Senior Software Engineer' },
  { id: 'usc',    name: 'USC',                 range: '2016–17', role: 'MS Computer Science, plus Scry Analytics intern' },
  { id: 'oracle', name: 'Oracle, Bangalore',   range: '2015',    role: 'Applications Engineer' },
  { id: 'iitb',   name: 'IIT Bombay',          range: '2013–15', role: 'MTech Geo-Informatics' },
  { id: 'mumbai', name: 'University of Mumbai',range: '2008–12', role: 'BE Computer Engineering' },
  { id: 'kid',    name: 'Before college',      range: 'c. 2000', role: 'Fifth grade' }
];
const P = (id, era, year, title, summary, tags, kind, disc) => ({ id, era, year, title, summary, tags, kind, disc });
const PROJECTS = [
  P('gatik-sim','gatik','2025–26','Autonomous-vehicle simulator','In-house simulator: core backend, reliability, playback, users, browser-based metrics and LLM-assisted safety analysis.',['Simulation','Platform','LLM'],'work','text'),
  P('gatik-saas','gatik','2025–26','Leadership data platform','Full-stack SaaS app bringing company data from several sources into tools, processes and dashboards for leadership.',['Full-stack','Dashboards'],'work','text'),
  P('gatik-metrics','gatik','2025','Safety metrics from simulation and production data','A top-10 set of metrics (encroachment time, collisions, lane boundary violations, exposure) to make safety data visible across the org.',['Safety','Data'],'work','text'),

  P('autox-qnx','autox','2018–24','Lightweight ROS2 for embedded QNX','A lighter ROS2 stack for an embedded safety platform, so autonomy teams could port their modules in about 10 days.',['C++','ROS2','QNX','NXP S32G'],'work','diagram'),
  P('autox-mrc','autox','2018–24','Minimum Risk Condition','Led a team of 4 on graceful recovery from failures; handles 93% of failure cases.',['C++','Functional safety','ISO 26262'],'work','diagram'),
  P('autox-obs','autox','2018–24','Observability and KPI metrics','KPI visualisation for AI and ops teams; about $300K of developer time saved a year.',['Grafana','InfluxDB','Airflow'],'work','diagram'),
  P('autox-bindeploy','autox','2018–24','Binary Deployment','Proposed and led (team of 3) a way to ship binaries to vehicles; about $800K saved a year.',['Docker-in-Docker','Node.js'],'work','diagram'),
  P('autox-robot','autox','2018–24','Auto path routing on a mini delivery robot','Point-to-point routing with web APIs for stress tests and investor demos ahead of the Series B.',['Python','websockets','ORB-SLAM'],'work','diagram'),
  P('autox-driveu','autox','2018–24','Remote control (DriveU)','Remote-control capability, one of the projects expedited for the CPUC permit.',['Embedded','Networking'],'work','diagram'),
  P('autox-flipdot','autox','2018–24','Flip-dot display','Embedded flip-dot display that helped secure a driverless permit from the DMV.',['Embedded','RS-485'],'work','diagram'),
  P('autox-ptp','autox','2018–24','PTP time sync, lidar and cameras','Sensor hub streaming four cameras with PTP for lidar-camera time synchronisation.',['Embedded','PTP','GMSL'],'work','diagram'),
  P('autox-ros2','autox','2018–24','AI-stack middleware switch to ROS2','Moved the AI stack from an in-house middleware to ROS2 / cyber.',['C++','ROS2'],'work','diagram'),
  P('oss-flamegraph','autox','c. 2019–20','Grafana flamegraph panel','Updated the panel for newer Grafana APIs, fixed sizing and made it work with InfluxDB data.',['Grafana','D3','Angular'],'opensource','writeup'),
  P('oss-apollo','autox','c. 2019–20','Apollo Auto chart fix','Fixed real-time charts that kept resizing while data was plotted.',['React','chart.js'],'opensource','writeup'),
  P('oss-flipdot','autox','c. 2019–20','Flip-dot display driver','Tested simulator mode and latest hardware; fixed a bug in image copying during setup.',['Python','RS-485'],'opensource','writeup'),
  P('oss-multiload','autox','date unconfirmed','indicator-multiload GPU support','Multiple Nvidia GPU support in a widely used GNOME panel applet.',['Vala','nvidia-smi'],'opensource','writeup'),

  P('usc-scry','usc','2017','Scry Analytics internship','REST API 3x faster by moving data in memory (SWIG); core algorithm to O(n) for about 20x; graph visualisation with neo4j and sigma.js.',['C++','SWIG','neo4j','sigma.js'],'work','writeup'),
  P('usc-resurrect','usc','2017','Resurrect','LA Hacks hackathon (UCLA); top 10% of 200+ projects.',['Hackathon'],'hackathon','writeup'),
  P('usc-cad','usc','2016–17','Interoperable CAD format with embedded semantics','DARPA research assistant, Spatial Sciences Institute. Paper at the Symposium on Solid and Physical Modeling, 2017.',['Research','CAD'],'academic','writeup'),
  P('usc-fullerene','usc','2016','Fullerene','HackTech 2016 at Caltech; phone as game controller. Top 4 in Best Entertainment, plus Best Use of the Wolfram API.',['Hackathon','Games'],'hackathon','writeup'),
  P('usc-kernel','usc','2016–17','Kernel programming','Processes, threads, scheduler, syscalls and virtual memory for a mini Unix clone.',['C','OS'],'academic','writeup'),
  P('usc-prime','usc','2016–17','Prime Engine','Added culling, physics and UI to a bare-bones game engine.',['C++','Game engine'],'academic','writeup'),
  P('usc-nao','usc','2016–17','Nao robot motion','Inverse kinematics and dynamics so a Nao robot could draw and walk.',['Robotics','Kinematics'],'academic','writeup'),
  P('usc-foodwaste','usc','date unconfirmed','Food-waste display','Measured and displayed food waste in two student cafes; reduced it by about 10 lb.',['Web','Arduino'],'personal','writeup'),

  P('oracle-crm','oracle','2015','Oracle Cloud CRM scripts and add-ins','Upgraded PHP scripts and C# add-ins ahead of schedule for large clients.',['PHP','C#'],'work','writeup'),

  P('iitb-roadmapper','iitb','2013–15','Road mapper (MTech thesis)','Real-time mapping of road-surface defects using a Kinect and machine learning.',['Kinect','PCL','ML'],'academic','writeup'),
  P('iitb-streetlights','iitb','2014','Smart streetlights','First prize, Smart Energy Hackathon, IIT Bombay. Hardware, software, protocol and custom PCBs in 36 hours.',['Python','MySQL','Embedded','PCB'],'hackathon','demo'),
  P('iitb-auv','iitb','2013–14','Matsya autonomous underwater vehicle','Software team: ported drivers, tested navigation, added mapping, integrated vision.',['Robotics','ROS','Navigation'],'academic','writeup'),
  P('iitb-vgis','iitb','2013–15','Virtual GIS','3D model of the department building with a topology editor and indoor shortest path.',['GIS','3D','Shortest path'],'academic','writeup'),
  P('iitb-sat','iitb','2013–15','Satellite image classifier','Neural-network classification of land use, compared with standard supervised and unsupervised methods.',['Matlab','Neural networks'],'academic','writeup'),
  P('iitb-sos','iitb','2013–15','Interoperable web GIS and SOS','GIS client over WMS, with Sensor Observation Service data and a SPARQL query evaluator.',['GIS','WMS','SPARQL'],'academic','writeup'),
  P('iitb-rtos','iitb','2013–15','RTOS on Raspberry Pi, smart door','Customised ChibiOS on a Raspberry Pi to drop the extra Arduino from a smart door.',['RTOS','Raspberry Pi'],'academic','writeup'),
  P('iitb-tcp','iitb','2013–15','TCP and server performance','ns-3 TCP simulations and four TCP server designs, measured.',['ns-3','Networks'],'academic','writeup'),
  P('iitb-ai','iitb','2013–15','Sentiment analysis, generic A*, theorem prover','AI course work: a neural net over tweets, a reusable A* library, a propositional-logic prover.',['AI','A*'],'academic','writeup'),
  P('iitb-kvm','iitb','date unconfirmed','Power-aware data-centre prototype','A prototype power-aware data-centre solution using kvm.',['kvm','Virtualization'],'personal','writeup'),

  P('mum-robots','mumbai','2011–12','Remote control of mobile robots','Final-year project: a web app for programming and controlling robots, with a registration protocol, multiplexed communication and remote code burning.',['Web','Robotics','Protocol'],'academic','writeup'),
  P('mum-xbee','mumbai','2012','Paper: XBee associated network dynamic updation','National Conference on Emerging Trends in Engineering and Technology, Mumbai.',['Paper','XBee'],'academic','writeup'),
  P('mum-hyberfast','mumbai','2011','Paper: HyberFast','Save and resume processes without losing real-time data. Springer, 2011 conference.',['Paper','OS'],'academic','writeup'),
  P('mum-graphics','mumbai','2008–12','16-bit graphics in Turbo C and assembly','SVGA programs, an image editor and a BMP codec.',['Turbo C','Assembly'],'personal','writeup'),
  P('mum-games','mumbai','2008–12','Java games','Raycasters and a side-scroller.',['Java','Games'],'personal','writeup'),
  P('mum-web','mumbai','2008–12','Web apps and small tools','A treasure hunt, a competitive-coding site, a conference site, a chat server and a few utilities.',['Web','Tools'],'personal','writeup'),

  P('kid-first','kid','c. 2000','First programs','Learned programming in fifth grade from his mother.',['Childhood'],'personal','writeup')
];
