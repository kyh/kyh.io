// The small numbers every part of the town moves by: clamping, blending,
// easing, and the way things come and go.

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const clamp01 = (value: number) => clamp(value, 0, 1);

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Slow out, quick through the middle, slow in: a cubic, 0 to 1. */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** How much of the way to close on a target this frame, closing at `rate` a second, whatever the frame rate. */
export const approach = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);

/**
 * How far something that's there from `from` until `until` is shown at `t`,
 * 0 to 1: ramping up over `ramp` seconds at one end and down at the other.
 * Things come and go by growing and shrinking by this, never by fading.
 */
export const shownBetween = (t: number, from: number, until: number, ramp: number) =>
  Math.min(clamp01((t - from) / ramp), clamp01((until - t) / ramp));
