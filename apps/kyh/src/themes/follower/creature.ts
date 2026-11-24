import type { Point } from "./walk";
import type { Crown } from "./wear";

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
  /**
   * Its layers (the elements marked `data-layer`, side by side in its <svg>)
   * back to front, for one turning in the round: what's nearer is drawn over.
   */
  order?: readonly string[];
  /** Where the homepage hat sits on it, in its own pixels about `at`: for one that can wear it. */
  crown?: Crown;
}

/**
 * The homepage hat let go onto it: where it was, about its crown (its own
 * pixels), how far it was turned off the crown's tilt (degrees), and how many
 * times bigger it was than it's worn.
 */
export interface Drop extends Point {
  turn: number;
  scale: number;
}

export interface Creature<State> {
  create: (at: Point) => State;
  /** Steps it `seconds` on after the pointer, which moved `moved` pixels since. */
  step: (state: State, pointer: Point, moved: Point, seconds: number) => void;
  /** A click at `at`: on it, or anywhere. */
  poke: (state: State, at: Point) => void;
  pose: (state: State) => Pose;
  /** Where the homepage hat is carried on the screen, each step; null, it isn't. */
  eye?: (state: State, hat: Point | null) => void;
  /** The homepage hat put on it (`drop`), or taken off (null). */
  wear?: (state: State, drop: Drop | null) => void;
}
