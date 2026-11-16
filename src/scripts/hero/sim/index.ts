/* Toy world behind the hero. No DOM, no dependencies.
   Each scene is a small deterministic simulation stepped at a fixed 60 Hz; metrics use textbook definitions.
   Scene internals are loosely typed; the exported Scene interface is the contract. */
import type { Scene } from './types';
import { RoadEra } from './scenes/road';
import { AuvEra } from './scenes/auv';
import { NaoEra } from './scenes/nao';
import { WebEra } from './scenes/web';
import { KidEra } from './scenes/kid';
import { ToyEra } from './scenes/toy';
import { OracleEra } from './scenes/oracle';

export * from './types';
export { DT } from './math';
export { History } from './history';
export { getModel, models } from './geo';
export { camera, rot, projector, type Projector } from './camera';
export { bathy } from './scenes/auv';

/** Scene registry. Era markdown files name their scene with `scene:`; eras without one are skipped by the scrubber. */
export const scenes: Record<string, () => Scene> = {
  truck: () => new RoadEra('truck'),
  robotaxi: () => new RoadEra('taxi'),
  humanoid: () => new NaoEra(),
  office: () => new OracleEra(),
  auv: () => new AuvEra(),
  webrobot: () => new WebEra(),
  crt: () => new KidEra(),
  toytruck: () => new ToyEra()
};
