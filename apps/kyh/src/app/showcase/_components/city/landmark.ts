import type { Footprint } from "./draw-kit";
import type { Sketch } from "./sketch";

/** A lot to build on, and the height of the ground under it. */
export interface Site extends Footprint {
  y: number;
}

/** The volume a click on the building lands in. */
export interface Bounds extends Footprint {
  y: number;
  h: number;
}

export type DrawLandmark = (sketch: Sketch, site: Site, title: string) => Bounds;

export const bounds = (rect: Footprint, y: number, h: number): Bounds => ({
  d: rect.d,
  h,
  w: rect.w,
  x: rect.x,
  y,
  z: rect.z,
});
