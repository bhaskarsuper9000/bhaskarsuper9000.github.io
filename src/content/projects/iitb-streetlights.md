---
title: "Smart streetlights"
era: iitb
year: "2014"
sort: 2014.9
summary: "First prize, Smart Energy Hackathon, IIT Bombay. Hardware, software, protocol and custom PCBs in 36 hours."
kind: hackathon
disclosure: demo
role: "Team member. The split between hardware, software and PCBs is still to be confirmed."
stack: ["Python","MySQL","Embedded","PCB"]
links:
  - { label: "hub repo", url: "https://github.com/bhaskarsuper9000/smartstreetlights-hub" }
  - { label: "server repo", url: "https://github.com/bhaskarsuper9000/smartstreetlights-server" }
component: streetlights
---

## What and why

Street lights burn at full power all night whether or not anyone is nearby. The idea: give each lamp a light sensor and a motion sensor, let it dim when the road is empty and brighten when something approaches, and report its state and power draw to a dashboard so a city could see what each lamp is doing. A central server could also push an emergency command that switches lights on together.

The hackathon asked for something that cuts energy use. We built the whole chain rather than a slide: the lamp node hardware and its boards, the protocol between nodes and a local hub, the hub software, and the server UI.

## How it worked

Each lamp has a **node**. Per the repositories, a node reports an LDR (ambient light) reading, whether the lamp and its emergency light are on, a PIR (motion) state, and current and voltage. A **hub** talks to its nodes over a serial link at 9600 baud, using short ASCII frames:

```text
$H,<hub>,<node>,<type>,<payload>#     hub to node
(node replies with ldr, light, emergency, pir, current, voltage)
```

The hub is a Python daemon. It polls its nodes, writes their latest state to a MySQL database on the central server, and keeps a local history table for later analysis. A node that does not answer is marked down. A second hub process runs a multithreaded TCP server that listens for emergency requests from the server and broadcasts them to the nodes.

The hub also carries the start of the energy-saving logic. In daylight, switch the lamp off. At night with nothing detected, dim it. At night with motion, bring it to full. The code marks this part as still to be finished, so treat the logic above as the intended design rather than a verified result.

The server side is a small Bootstrap web interface with pages for hubs, nodes, power, a graph and emergency control.
