/* Shared shapes: the Scene contract and the items every renderer draws. */
import type { History } from './history';

export type Vec3 = number[];
export type Cls = 'ego' | 'agent' | 'static' | 'world' | 'bbox' | 'warn' | 'path' | 'ring' | 'active' | 'screen';
export interface Item { id: string; cls: Cls; m?: string; p?: Vec3; yaw?: number; pitch?: number; roll?: number; s?: number; a?: number; strip?: Float32Array; seg?: Float32Array }
export interface Metric { k: string; label: string; value: string; unit: string; frac: number; kind: string; warn?: boolean; note?: string; n?: number }
export interface Label { id: string; p: Vec3; text: string; warn?: boolean }
export interface CamSpec { focus: Vec3; fwd: number[]; dist: number; height: number; fov: number; ahead: number; side: number; frame?: string; smooth?: boolean }
export interface Ground { mode: number; minor: number; major: number; fade: number; amp: number; glowR: number; contour?: number }
export interface Ring { x: number; z: number; r: number; a: number; w: number }
export interface ChartSpec { a: { label: string; unit: string; max: number }; b: { label: string; unit: string; max: number } }
export interface Model { tri: Float32Array; seg: Float32Array }
export interface Cam { pos: Vec3; target: Vec3; fov: number }
export interface Scene {
  t: number; hist: History; chart: ChartSpec; ground: Ground;
  step(dt: number): void; metrics(): Metric[]; objects(): Item[]; labels(): Label[]; cam(): CamSpec; ring(): Ring | null; describe(): string;
}
