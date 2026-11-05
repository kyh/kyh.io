// What a theme's follower is, to the stage that runs it (`stage.tsx`): a
// pure creature, created where the mouse first is, stepped after it a frame
// at a time, poked by a click, and posed: where it is, what it says, and each
// of its drawn parts (the elements marked `data-part` in its <svg>) as the
// path, transform or opacity to give them this frame. Pure.
import type { Point } from "./walk";

/** One drawn part this frame; what's left out stays as it was. */
export interface Part {
  d?: string;
  transform?: string;
  opacity?: number;
}

export interface Pose {
  /** Where it is on the screen: what its <svg> is drawn about. */
  at: Point;
  /** Where its bubble floats, about `at`. */
  bubble: Point;
  /** What its bubble says; null, nothing. */
  say: string | null;
  parts: Readonly<Record<string, Part>>;
}

export interface Creature<State> {
  create: (at: Point) => State;
  /** Steps it `seconds` on after the pointer, which moved `moved` pixels since. */
  step: (state: State, pointer: Point, moved: Point, seconds: number) => void;
  /** A click at `at`: on it, or anywhere. */
  poke: (state: State, at: Point) => void;
  pose: (state: State) => Pose;
}
