/* data.js: the career as one graph, shared by bento.html, graph.html and third.html.
   Generated from prototypes/a4-pages/projects.js (ids, years, titles, summaries, stack) plus tagging for
   capability areas and key numbers. Real facts only. Gatik items carry no metrics (confidential, text only).
   Graph: person -> AREAS and ERAS -> PROJECTS (each project has one era and one or more areas). */
(function(){
var AREAS=[
 {id:'av',name:'Autonomous vehicles',short:'AV',lens:'robotics'},
 {id:'robo',name:'Robotics',short:'Robotics',lens:'robotics'},
 {id:'sim',name:'Simulation & safety metrics',short:'Sim & safety',lens:'robotics'},
 {id:'data',name:'Data / ETL',short:'Data / ETL',lens:'fullstack'},
 {id:'full',name:'Full-stack apps',short:'Full stack',lens:'fullstack'},
 {id:'viz',name:'Visualization',short:'Viz',lens:'fullstack'},
 {id:'found',name:'Foundations & CS depth',short:'Foundations',lens:null}];
var ERAS=[
 {id:'gatik',name:'Gatik AI',short:'Gatik',range:'Jan 2025 – Oct 2026',y:[2025,2026.8],role:'Senior Software Engineer, Platform',kind:'work',conf:true},
 {id:'autox',name:'AutoX Technologies',short:'AutoX',range:'Jan 2018 – Oct 2024',y:[2018,2024.8],role:'Senior Software Engineer',kind:'work'},
 {id:'scry',name:'Scry Analytics',short:'Scry',range:'Jun – Dec 2017',y:[2017.4,2018],role:'Data Scientist & Engineering Intern',kind:'work'},
 {id:'usc',name:'University of Southern California',short:'USC',range:'Jan 2016 – Dec 2017',y:[2016,2018],role:'MS Computer Science',kind:'academic'},
 {id:'oracle',name:'Oracle, Bangalore',short:'Oracle',range:'Jul – Dec 2015',y:[2015.5,2016],role:'Applications Engineer',kind:'work'},
 {id:'iitb',name:'IIT Bombay',short:'IIT Bombay',range:'Jul 2013 – Jun 2015',y:[2013.5,2015.5],role:'MTech Geo-Informatics',kind:'academic'},
 {id:'mumbai',name:'University of Mumbai',short:'Mumbai',range:'2008 – 2012',y:[2008.6,2012.6],role:'BE Computer Engineering',kind:'academic'}];
var PROJECTS=[{"id":"gatik-sim","era":"gatik","year":"2025–26","title":"Autonomous-vehicle simulator","short":"AV simulator","line":"In-house simulator: core backend, reliability, playback, users, browser-based metrics and LLM-assisted safety analysis.","stack":["Simulation","Platform","LLM"],"kind":"work","areas":["av","sim","full"],"metric":null},
 {"id":"gatik-saas","era":"gatik","year":"2025–26","title":"Leadership data platform","short":"Leadership data app","line":"Full-stack SaaS app bringing company data from several sources into tools, processes and dashboards for leadership.","stack":["Full-stack","Dashboards"],"kind":"work","areas":["full","data","viz"],"metric":null},
 {"id":"gatik-metrics","era":"gatik","year":"2025","title":"Safety metrics from simulation and production data","short":"Safety metrics","line":"A top-10 set of metrics (encroachment time, collisions, lane boundary violations, exposure) to make safety data visible across the org.","stack":["Safety","Data"],"kind":"work","areas":["sim","data","av"],"metric":null},
 {"id":"autox-qnx","era":"autox","year":"2018–24","title":"Lightweight ROS2 for embedded QNX","short":"ROS2 on QNX","line":"A lighter ROS2 stack for an embedded safety platform, so autonomy teams could port their modules in about 10 days.","stack":["C++","ROS2","QNX","NXP S32G"],"kind":"work","areas":["av","robo"],"metric":{"v":"10 days","l":"to port modules","t":"num"}},
 {"id":"autox-mrc","era":"autox","year":"2018–24","title":"Minimum Risk Condition","short":"Min. Risk Condition","line":"Led a team of 4 on graceful recovery from failures; handles 93% of failure cases.","stack":["C++","Functional safety","ISO 26262"],"kind":"work","areas":["av"],"metric":{"v":"93%","l":"of failure cases recovered","t":"num"}},
 {"id":"autox-obs","era":"autox","year":"2018–24","title":"Observability and KPI metrics","short":"Observability / KPIs","line":"KPI visualisation for AI and ops teams; about $300K of developer time saved a year.","stack":["Grafana","InfluxDB","Airflow"],"kind":"work","areas":["data","viz","full"],"metric":{"v":"$300K","l":"dev time saved a year","t":"num"}},
 {"id":"autox-bindeploy","era":"autox","year":"2018–24","title":"Binary Deployment","short":"Binary Deployment","line":"Proposed and led (team of 3) a way to ship binaries to vehicles; about $800K saved a year.","stack":["Docker-in-Docker","Node.js"],"kind":"work","areas":["av","full"],"metric":{"v":"$800K","l":"saved a year","t":"num"}},
 {"id":"autox-robot","era":"autox","year":"2018–24","title":"Auto path routing on a mini delivery robot","short":"Delivery-robot routing","line":"Point-to-point routing with web APIs for stress tests and investor demos ahead of the Series B.","stack":["Python","websockets","ORB-SLAM"],"kind":"work","areas":["robo"],"metric":null},
 {"id":"autox-driveu","era":"autox","year":"2018–24","title":"Remote control (DriveU)","short":"Remote control (DriveU)","line":"Remote-control capability, one of the projects expedited for the CPUC permit.","stack":["Embedded","Networking"],"kind":"work","areas":["av"],"metric":null},
 {"id":"autox-flipdot","era":"autox","year":"2018–24","title":"Flip-dot display","short":"Flip-dot display","line":"Embedded flip-dot display that helped secure a driverless permit from the DMV.","stack":["Embedded","RS-485"],"kind":"work","areas":["av","robo"],"metric":{"v":"Permit","l":"helped secure driverless permit","t":"award"}},
 {"id":"autox-ptp","era":"autox","year":"2018–24","title":"PTP time sync, lidar and cameras","short":"PTP time sync","line":"Sensor hub streaming four cameras with PTP for lidar-camera time synchronisation.","stack":["Embedded","PTP","GMSL"],"kind":"work","areas":["av","robo"],"metric":null},
 {"id":"autox-ros2","era":"autox","year":"2018–24","title":"AI-stack middleware switch to ROS2","short":"Middleware to ROS2","line":"Moved the AI stack from an in-house middleware to ROS2 / cyber.","stack":["C++","ROS2"],"kind":"work","areas":["av","robo"],"metric":null},
 {"id":"oss-flamegraph","era":"autox","year":"c. 2019–20","title":"Grafana flamegraph panel","short":"Grafana flamegraph","line":"Updated the panel for newer Grafana APIs, fixed sizing and made it work with InfluxDB data.","stack":["Grafana","D3","Angular"],"kind":"opensource","areas":["viz","data"],"metric":null},
 {"id":"oss-apollo","era":"autox","year":"c. 2019–20","title":"Apollo Auto chart fix","short":"Apollo chart fix","line":"Fixed real-time charts that kept resizing while data was plotted.","stack":["React","chart.js"],"kind":"opensource","areas":["viz","av"],"metric":null},
 {"id":"oss-flipdot","era":"autox","year":"c. 2019–20","title":"Flip-dot display driver","short":"Flip-dot driver","line":"Tested simulator mode and latest hardware; fixed a bug in image copying during setup.","stack":["Python","RS-485"],"kind":"opensource","areas":["av","robo"],"metric":null},
 {"id":"oss-multiload","era":"autox","year":"date unconfirmed","title":"indicator-multiload GPU support","short":"Multiload GPU support","line":"Multiple Nvidia GPU support in a widely used GNOME panel applet.","stack":["Vala","nvidia-smi"],"kind":"opensource","areas":["full"],"metric":null},
 {"id":"usc-scry","era":"scry","year":"2017","title":"Scry Analytics internship","short":"Scry Analytics","line":"REST API 3x faster by moving data in memory (SWIG); core algorithm to O(n) for about 20x; graph visualisation with neo4j and sigma.js.","stack":["C++","SWIG","neo4j","sigma.js"],"kind":"work","areas":["data","viz","full"],"metric":{"v":"3x / 20x","l":"REST API / core algorithm","t":"num"}},
 {"id":"usc-resurrect","era":"usc","year":"2017","title":"Resurrect","short":"Resurrect","line":"LA Hacks hackathon (UCLA); top 10% of 200+ projects.","stack":["Hackathon"],"kind":"hackathon","areas":["full"],"metric":{"v":"Top 10%","l":"LA Hacks 2017","t":"award"}},
 {"id":"usc-cad","era":"usc","year":"2016–17","title":"Interoperable CAD format with embedded semantics","short":"Semantic CAD format","line":"DARPA research assistant, Spatial Sciences Institute. Paper at the Symposium on Solid and Physical Modeling, 2017.","stack":["Research","CAD"],"kind":"academic","areas":["data"],"metric":{"v":"Paper","l":"SPM 2017","t":"paper"}},
 {"id":"usc-fullerene","era":"usc","year":"2016","title":"Fullerene","short":"Fullerene","line":"HackTech 2016 at Caltech; phone as game controller. Top 4 in Best Entertainment, plus Best Use of the Wolfram API.","stack":["Hackathon","Games"],"kind":"hackathon","areas":["full"],"metric":{"v":"Top 4","l":"HackTech 2016","t":"award"}},
 {"id":"usc-kernel","era":"usc","year":"2016–17","title":"Kernel programming","short":"Mini Unix kernel","line":"Processes, threads, scheduler, syscalls and virtual memory for a mini Unix clone.","stack":["C","OS"],"kind":"academic","areas":["found"],"metric":null},
 {"id":"usc-prime","era":"usc","year":"2016–17","title":"Prime Engine","short":"Prime Engine","line":"Added culling, physics and UI to a bare-bones game engine.","stack":["C++","Game engine"],"kind":"academic","areas":["found","viz"],"metric":null},
 {"id":"usc-nao","era":"usc","year":"2016–17","title":"Nao robot motion","short":"Nao robot motion","line":"Inverse kinematics and dynamics so a Nao robot could draw and walk.","stack":["Robotics","Kinematics"],"kind":"academic","areas":["robo"],"metric":null},
 {"id":"usc-foodwaste","era":"usc","year":"date unconfirmed","title":"Food-waste display","short":"Food-waste display","line":"Measured and displayed food waste in two student cafes; reduced it by about 10 lb.","stack":["Web","Arduino"],"kind":"personal","areas":["data","viz"],"metric":null},
 {"id":"oracle-crm","era":"oracle","year":"2015","title":"Oracle Cloud CRM scripts and add-ins","short":"Cloud CRM add-ins","line":"Upgraded PHP scripts and C# add-ins ahead of schedule for large clients.","stack":["PHP","C#"],"kind":"work","areas":["full"],"metric":null},
 {"id":"iitb-roadmapper","era":"iitb","year":"2013–15","title":"Road mapper (MTech thesis)","short":"Road mapper (thesis)","line":"Real-time mapping of road-surface defects using a Kinect and machine learning.","stack":["Kinect","PCL","ML"],"kind":"academic","areas":["robo","data"],"metric":null},
 {"id":"iitb-streetlights","era":"iitb","year":"2014","title":"Smart streetlights","short":"Smart streetlights","line":"First prize, Smart Energy Hackathon, IIT Bombay. Hardware, software, protocol and custom PCBs in 36 hours.","stack":["Python","MySQL","Embedded","PCB"],"kind":"hackathon","areas":["robo","full"],"metric":{"v":"1st prize","l":"Smart Energy Hackathon 2014","t":"award"}},
 {"id":"iitb-auv","era":"iitb","year":"2013–14","title":"Matsya autonomous underwater vehicle","short":"Matsya AUV","line":"Software team: ported drivers, tested navigation, added mapping, integrated vision.","stack":["Robotics","ROS","Navigation"],"kind":"academic","areas":["robo","av"],"metric":null},
 {"id":"iitb-vgis","era":"iitb","year":"2013–15","title":"Virtual GIS","short":"Virtual GIS","line":"3D model of the department building with a topology editor and indoor shortest path.","stack":["GIS","3D","Shortest path"],"kind":"academic","areas":["viz","data"],"metric":null},
 {"id":"iitb-sat","era":"iitb","year":"2013–15","title":"Satellite image classifier","short":"Satellite classifier","line":"Neural-network classification of land use, compared with standard supervised and unsupervised methods.","stack":["Matlab","Neural networks"],"kind":"academic","areas":["data"],"metric":null},
 {"id":"iitb-sos","era":"iitb","year":"2013–15","title":"Interoperable web GIS and SOS","short":"Web GIS and SOS","line":"GIS client over WMS, with Sensor Observation Service data and a SPARQL query evaluator.","stack":["GIS","WMS","SPARQL"],"kind":"academic","areas":["data","full"],"metric":null},
 {"id":"iitb-rtos","era":"iitb","year":"2013–15","title":"RTOS on Raspberry Pi, smart door","short":"RTOS on Raspberry Pi","line":"Customised ChibiOS on a Raspberry Pi to drop the extra Arduino from a smart door.","stack":["RTOS","Raspberry Pi"],"kind":"academic","areas":["robo"],"metric":null},
 {"id":"iitb-tcp","era":"iitb","year":"2013–15","title":"TCP and server performance","short":"TCP performance","line":"ns-3 TCP simulations and four TCP server designs, measured.","stack":["ns-3","Networks"],"kind":"academic","areas":["found"],"metric":null},
 {"id":"iitb-ai","era":"iitb","year":"2013–15","title":"Sentiment analysis, generic A*, theorem prover","short":"AI coursework","line":"AI course work: a neural net over tweets, a reusable A* library, a propositional-logic prover.","stack":["AI","A*"],"kind":"academic","areas":["found"],"metric":null},
 {"id":"iitb-kvm","era":"iitb","year":"date unconfirmed","title":"Power-aware data-centre prototype","short":"Power-aware data centre","line":"A prototype power-aware data-centre solution using kvm.","stack":["kvm","Virtualization"],"kind":"personal","areas":["found"],"metric":null},
 {"id":"mum-robots","era":"mumbai","year":"2011–12","title":"Remote control of mobile robots","short":"Web-controlled robots","line":"Final-year project: a web app for programming and controlling robots, with a registration protocol, multiplexed communication and remote code burning.","stack":["Web","Robotics","Protocol"],"kind":"academic","areas":["robo","full"],"metric":null},
 {"id":"mum-xbee","era":"mumbai","year":"2012","title":"Paper: XBee associated network dynamic updation","short":"XBee network paper","line":"National Conference on Emerging Trends in Engineering and Technology, Mumbai.","stack":["Paper","XBee"],"kind":"academic","areas":["robo"],"metric":{"v":"Paper","l":"NCETET, Mumbai","t":"paper"}},
 {"id":"mum-hyberfast","era":"mumbai","year":"2011","title":"Paper: HyberFast","short":"HyberFast paper","line":"Save and resume processes without losing real-time data. Springer, 2011 conference.","stack":["Paper","OS"],"kind":"academic","areas":["found"],"metric":{"v":"Paper","l":"Springer 2011","t":"paper"}},
 {"id":"mum-graphics","era":"mumbai","year":"2008–12","title":"16-bit graphics in Turbo C and assembly","short":"Turbo C graphics","line":"SVGA programs, an image editor and a BMP codec.","stack":["Turbo C","Assembly"],"kind":"personal","areas":["found","viz"],"metric":null},
 {"id":"mum-games","era":"mumbai","year":"2008–12","title":"Java games","short":"Java games","line":"Raycasters and a side-scroller.","stack":["Java","Games"],"kind":"personal","areas":["found"],"metric":null},
 {"id":"mum-web","era":"mumbai","year":"2008–12","title":"Web apps and small tools","short":"Web apps and tools","line":"A treasure hunt, a competitive-coding site, a conference site, a chat server and a few utilities.","stack":["Web","Tools"],"kind":"personal","areas":["full"],"metric":null},
 {"id":"kid-first","era":"mumbai","year":"c. 2000","title":"First programs","short":"First programs","line":"Learned programming in fifth grade from his mother.","stack":["Childhood"],"kind":"personal","areas":["found"],"metric":null}];
var LENSES={robotics:{name:'Robotics',note:'AV + robotics + simulation'},fullstack:{name:'Full stack',note:'data + full stack + visualization'}};
var byId={},areaById={},eraById={};
AREAS.forEach(function(a){areaById[a.id]=a;a.projects=[];});
ERAS.forEach(function(e){eraById[e.id]=e;e.projects=[];});
PROJECTS.forEach(function(p){byId[p.id]=p;eraById[p.era].projects.push(p);
 p.lens=[];p.areas.forEach(function(a){areaById[a].projects.push(p);var l=areaById[a].lens;if(l&&p.lens.indexOf(l)<0)p.lens.push(l);});
 p.url='../a4-pages/project.html?p='+p.id;});
AREAS.forEach(function(a){a.count=a.projects.length;a.url='../a4-pages/index.html';});
ERAS.forEach(function(e){e.count=e.projects.length;e.url='../a4-pages/index.html?kind='+e.kind;});
var T=PROJECTS.length;
/* headline numbers: every value is a fact from the resume or derived from the list above */
var STATS={
 years:{v:'8+',l:'years in autonomous platforms',span:[2018,2026]},
 saved:{v:'$1.1M',u:'/yr',l:'saved at AutoX',parts:[{id:'autox-bindeploy',v:'$800K',l:'Binary Deployment'},{id:'autox-obs',v:'$300K',l:'Observability / KPI metrics'}]},
 mrc:{v:'93%',l:'of failure cases recovered (MRC)',id:'autox-mrc'},
 teams:{v:'4 & 3',l:'person teams led',parts:[{id:'autox-mrc',v:'4',l:'Minimum Risk Condition'},{id:'autox-bindeploy',v:'3',l:'Binary Deployment'}]},
 ros2:{v:'10',u:' days',l:'for teams to port modules to ROS2 on QNX',id:'autox-qnx'},
 scry:{v:'20x',l:'faster algorithm; REST API 3x (Scry)',id:'usc-scry'},
 companies:{v:'4',l:'companies: Gatik, AutoX, Scry, Oracle'},
 degrees:{v:'3',l:'degrees: MS, MTech, BE'},
 awards:{v:'3',l:'hackathon awards',ids:['iitb-streetlights','usc-fullerene','usc-resurrect']},
 papers:{v:'3',l:'publications',ids:['usc-cad','mum-xbee','mum-hyberfast']},
 interviews:{v:'30+',l:'people interviewed'},
 mentored:{v:'10+',l:'junior developers mentored'},
 taught:{v:'20',l:'students taught Java'},
 projects:{v:String(T),l:'projects, all linked'}
};
window.CAREER={AREAS:AREAS,ERAS:ERAS,PROJECTS:PROJECTS,LENSES:LENSES,STATS:STATS,byId:byId,areaById:areaById,eraById:eraById,
 person:{name:'Bhaskar Bandyopadhyay',pos:'I build the simulators, safety metrics and data tools that help autonomous vehicles and robots get safely onto real roads.',
  github:'https://github.com/bhaskarsuper9000',linkedin:'https://www.linkedin.com/in/oscarbandy',email:'bhaskarsuper9000@gmail.com'},
 links:{pdf:'/resume.pdf',projects:'../a4-pages/index.html'},
 urlOf:function(id){return '../a4-pages/project.html?p='+id;}};
})();
