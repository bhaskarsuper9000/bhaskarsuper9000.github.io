# Credits and licences (prototype A3, story mode)

- No third-party art is used. Every sprite, tile, cloud and the ground texture is
  generated in code at startup (`js/pixel.js`, `js/chars.js`, `js/world.js`):
  voxel models baked into "sprite stack" slices, plus 16x20 ASCII-drawn characters.
  Written for this prototype; no licence restrictions.
- Phaser 3.80.1 (MIT licence, https://phaser.io), loaded from
  https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js. This is the only
  network request the page makes.
- Fonts: system font stacks only.
