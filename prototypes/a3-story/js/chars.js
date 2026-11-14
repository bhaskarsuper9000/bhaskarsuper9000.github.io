/* Four cosmetic explorer avatars, drawn as 16x20 ASCII pixel art with
   outline, skin/shirt shading and a highlight column. Frames: down/up/side x 2 */
(function (global) {
  'use strict';
  const DOWN = [
    '................',
    '.....kkkkkk.....',
    '....kHHhhhhk....',
    '...kHhhhhhhhk...',
    '...khhhhhhhhk...',
    '...khsssssshk...',
    '...ksesssseSk...',
    '...kssssssssk...',
    '....kSssssSk....',
    '.....kSSSSk.....',
    '...kuttttttTk...',
    '..kuuttttttTTk..',
    '..ksuttttttTSk..',
    '..ksTttttttTSk..',
    '...kTTTTTTTTk...',
    '...kppppppPPk...',
    '...kpppkkpPPk...',
    '....ksSk.ksSk...',
    '....kffk.kffk...',
    '....kkkk.kkkk...'];
  const UP = DOWN.slice();
  UP[5] = '...khhhhhhhhk...';
  UP[6] = '...khhhhhhhhk...';
  UP[7] = '...khhhhhhhhk...';
  UP[8] = '....khhhhhhk....';
  UP[10] = '...kTttttttTk...';
  const SIDE = [
    '................',
    '.....kkkkk......',
    '....kHHhhhk.....',
    '...kHhhhhhhk....',
    '...khhhhhhhk....',
    '...khhhsssssk...',
    '...khhssssesk...',
    '...khhsssssssk..',
    '....khSsssSk....',
    '.....kSSSk......',
    '....kuttttTk....',
    '....kuttttTk....',
    '....kutsStTk....',
    '....kttsStTk....',
    '....kTTTTTTk....',
    '....kppppPPk....',
    '....kpppPPPk....',
    '.....ksSSk......',
    '.....kfffffk....',
    '.....kkkkkkk....'];
  function walkFront(rows) {
    const r = rows.slice();
    // lift the left foot one pixel
    r[17] = r[17].slice(0, 4) + 'kffk' + r[17].slice(8);
    r[18] = r[18].slice(0, 4) + 'kkkk' + r[18].slice(8);
    r[19] = r[19].slice(0, 4) + '....' + r[19].slice(8);
    return r;
  }
  function walkFront2(rows) {
    const r = rows.slice();
    r[17] = r[17].slice(0, 9) + 'kffk' + r[17].slice(13);
    r[18] = r[18].slice(0, 9) + 'kkkk' + r[18].slice(13);
    r[19] = r[19].slice(0, 9) + '....' + r[19].slice(13);
    return r;
  }
  function walkSide(rows) {
    const r = rows.slice();
    r[16] = '....kppk.PPk....';
    r[17] = '....ksk..kSk....';
    r[18] = '...kffk..kffk...';
    r[19] = '...kkkk..kkkk...';
    return r;
  }

  const VARIANTS = [
    { name: 'Cap', desc: 'Red cap, blue tee',
      pal: { k: 0x241a17, s: 0xc98d63, S: 0x9c6643, e: 0x2a1c16, h: 0xd63b30, H: 0xf06a55, t: 0x3a78c9, u: 0x74a8ea, T: 0x24508f, p: 0x4b4f5c, P: 0x33363f, f: 0xe8e1d4 },
      mod: (dir, r) => { if (dir === 'down') { r[4] = '...kCCCCCCCCk...'; } if (dir === 'side') { r[4] = '...khhhhhhhCCk..'; } return r; },
      extra: { C: 0x9c241d } },
    { name: 'Braid', desc: 'Long braid, yellow frock',
      pal: { k: 0x221816, s: 0xb97c55, S: 0x8f5a38, e: 0x1a1210, h: 0x221b19, H: 0x4a3c36, t: 0xf0b93a, u: 0xffdc7e, T: 0xc28a1c, p: 0x2a9d8f, P: 0x1d6f66, f: 0x7a3b2a },
      mod: (dir, r) => {
        if (dir === 'down') { r[8] = '...khSssssShk...'; r[9] = '...khkSSSSkhk...'; r[10] = '...khtttttthk...'; }
        if (dir === 'up') { r[9] = '.....khhhhk.....'; r[10] = '...kuthhhhtTk...'; r[11] = '..kuuthHhhtTTk..'; r[12] = '..ksutkhhkTTSk..'.slice(0, 16); }
        if (dir === 'side') { r[8] = '....khSsssSk....'; r[9] = '...khkSSSk......'; r[10] = '...khkuttTk.....'.padEnd(16, '.'); r[11] = '...khkuttTk.....'.padEnd(16, '.'); }
        return r;
      } },
    { name: 'Specs', desc: 'Glasses, green tee',
      pal: { k: 0x241a17, s: 0xd7a07a, S: 0xad7652, e: 0x1a1a1a, h: 0x3a2a22, H: 0x6a4f3d, t: 0x4caf50, u: 0x86d686, T: 0x2f7d33, p: 0xb09a6a, P: 0x8a764e, f: 0x3a3a3a },
      mod: (dir, r) => { if (dir === 'down') r[6] = '...kgegssgegk...'; if (dir === 'side') r[6] = '...khhsssgegk...'; return r; },
      extra: { g: 0x16161a } },
    { name: 'Curls', desc: 'Curly hair, orange tee',
      pal: { k: 0x1f1512, s: 0x9a6440, S: 0x744628, e: 0x140d0a, h: 0x1b1512, H: 0x4b382e, t: 0xef7d3c, u: 0xffab72, T: 0xb8541f, p: 0x2c3e66, P: 0x1e2b48, f: 0xe6e6e6 },
      mod: (dir, r) => {
        r[1] = '....kkkkkkkk....'; r[2] = '...kHhHhHhHhk...'; r[3] = '..khHhHhHhHhhk..';
        if (dir !== 'side') r[4] = '..khhhHhhHhhhk..'; else r[4] = '..khHhhhhHhk....';
        return r;
      } },
  ];

  // returns {down:[c0,c1,c2], up:[...], side:[...]} canvases
  function build(vi) {
    const v = VARIANTS[vi];
    const pal = Object.assign({}, v.pal, v.extra || {});
    const make = (dir, rows) => PX.spriteFromRows(v.mod(dir, rows.slice()), pal);
    return {
      down: [make('down', DOWN), make('down', walkFront(DOWN)), make('down', walkFront2(DOWN))],
      up: [make('up', UP), make('up', walkFront(UP)), make('up', walkFront2(UP))],
      side: [make('side', SIDE), make('side', walkSide(SIDE)), make('side', SIDE)],
    };
  }
  global.CHARS = { VARIANTS, build };
})(window);
