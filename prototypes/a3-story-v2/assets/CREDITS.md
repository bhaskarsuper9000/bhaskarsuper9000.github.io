# Credits and licences (prototype A3 round 2, story mode)

- No third-party art is used. Every sprite, tile, cloud, tree canopy and the ground
  texture is generated in code at startup:
  - `js/pixel.js`: colour helpers, noise, voxel model + sprite-stack baking
  - `js/world.js`: the room, neighbourhood, ground, shadow/AO masks, painted canopies
  - `js/chars.js`: the four 24x32 explorers, drawn from a small procedural rig
  Written for this prototype; no licence restrictions.
- Phaser 3.80.1 (MIT licence, https://phaser.io), loaded from
  https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js. This is the only
  network request the page makes.
- Fonts: system font stacks only.
