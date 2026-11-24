import type { Point } from "./walk";

/** Where a follower's hat sits on the screen: its brim's middle, tilted `angle` degrees clockwise, `width` pixels across. */
export interface Crown extends Point {
  angle: number;
  width: number;
}

/** Where the homepage hat was let go on the screen (its brim's middle), tilted `angle` degrees and `width` pixels across. */
export type Drop = Crown;

/** Pixels from a follower's crown that a brim let go still lands on it. */
export const WEAR_REACH = 30;

let crown: Crown | null = null;
let carried: Point | null = null;
let dropped: Drop | null = null;
let worn = false;
let grabber: ((event: PointerEvent, from: Crown) => void) | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

/** Where the follower on the page would wear the hat, or null with none showing. */
export const crownOf = () => crown;

export const setCrown = (at: Crown | null) => {
  crown = at;
};

/** Where the hat is being carried on the screen (its brim's middle), or null when it isn't. */
export const carriedHat = () => carried;

export const carryHat = (at: Point | null) => {
  carried = at;
};

/** Whether the follower wears the hat. */
export const isHatWorn = () => worn;

/** Where it was let go to be worn, the last time it was. */
export const droppedHat = () => dropped;

/** Lets the hat go onto the follower, if `brim` is in reach of its crown. Whether it went on. */
export const putHatOn = (brim: Drop) => {
  if (!crown || Math.hypot(brim.x - crown.x, brim.y - crown.y) > WEAR_REACH) {
    return false;
  }

  dropped = brim;
  worn = true;
  notify();

  return true;
};

export const takeHatOff = () => {
  if (!worn) {
    return;
  }

  worn = false;
  notify();
};

/** Takes the worn hat off from under the pointer, to be carried, where something can carry it. Whether it was taken. */
export const grabHat = (event: PointerEvent) => {
  if (!worn || !grabber || !crown) {
    return false;
  }

  const from = crown;
  takeHatOff();
  grabber(event, from);

  return true;
};

/** Whether the worn hat can be grabbed off: something on the page carries it. */
export const canGrabHat = () => grabber !== null;

/** Sets what carries the hat once it's grabbed off the follower; null, nothing. */
export const setHatGrabber = (grab: ((event: PointerEvent, from: Crown) => void) | null) => {
  grabber = grab;
  notify();
};

export const subscribeToHat = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
