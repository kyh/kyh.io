// The theme dials' slider, after DialKit's (github.com/joshpuckett/dialkit,
// MIT): a filled pill you click or drag (keys go to a native range inside it).
// The arithmetic, pure.

export interface Range {
  min: number;
  max: number;
  step: number;
}

const clamp = (n: number, { min, max }: Range) => Math.min(max, Math.max(min, n));

/** The value at `fraction` (0–1, clamped) of the way along. */
export const valueAt = (fraction: number, { min, max }: Range) =>
  min + Math.min(1, Math.max(0, fraction)) * (max - min);

/** Where `value` sits along the track, 0–100. */
export const percentOf = (value: number, { min, max }: Range) =>
  ((value - min) / (max - min)) * 100;

/** Rounded to the step. */
export const roundToStep = (value: number, range: Range) =>
  clamp(range.min + Math.round((value - range.min) / range.step) * range.step, range);

/** A click lands on the nearest tenth when it's within a 32nd of one. */
export const snapToDecile = (value: number, range: Range) => {
  const fraction = (value - range.min) / (range.max - range.min);
  const nearest = Math.round(fraction * 10) / 10;
  return Math.abs(fraction - nearest) <= 1 / 32
    ? range.min + nearest * (range.max - range.min)
    : value;
};

const DEAD_ZONE = 32;
const MAX_CURSOR_RANGE = 200;
const MAX_STRETCH = 8;

/** Dragged `overshoot` px past an end (negative: the left one), the track gives a little: up to 8px that way. */
export const rubberStretch = (overshoot: number) =>
  Math.sign(overshoot) *
  MAX_STRETCH *
  Math.sqrt(Math.min(Math.max(0, Math.abs(overshoot) - DEAD_ZONE) / MAX_CURSOR_RANGE, 1));
