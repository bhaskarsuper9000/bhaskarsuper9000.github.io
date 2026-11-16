/* Models used by more than one scene; registered on import. */
import { TAU } from './math';
import { model } from './geo';

model('ring', function (g) { let p: number[][] = []; for (let i = 0; i < 128; i++) { let a = i / 128 * TAU; p.push([Math.cos(a), 0, Math.sin(a)]); } g.poly(p, true); });
model('dring', function (g) { for (let i = 0; i < 96; i += 2) { let a = i / 96 * TAU, b = (i + 1) / 96 * TAU; g.seg([Math.cos(a), 0, Math.sin(a)], [Math.cos(b), 0, Math.sin(b)]); }
  for (let i = 0; i < 72; i++) { let c = i / 72 * TAU, k = i % 6 === 0 ? 0.94 : 0.975; g.seg([Math.cos(c), 0, Math.sin(c)], [Math.cos(c) * k, 0, Math.sin(c) * k]); } });
