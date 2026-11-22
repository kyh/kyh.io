import type { LivelinePoint, Momentum } from "../types";

/**
 * Auto-detect momentum from recent data points.
 * Only triggers during active movement — checks the last few points,
 * not the total delta over the full lookback window.
 */
export const detectMomentum = (points: LivelinePoint[], lookback = 20) => {
  if (points.length < 5) {
    return "flat" satisfies Momentum;
  }

  const start = Math.max(0, points.length - lookback);

  let min = Infinity;
  let max = -Infinity;

  for (let i = start; i < points.length; i += 1) {
    const v = points[i].value;

    if (v < min) {
      min = v;
    }

    if (v > max) {
      max = v;
    }
  }

  const range = max - min;

  if (range === 0) {
    return "flat" satisfies Momentum;
  }

  const tailStart = Math.max(start, points.length - 5);
  const first = points[tailStart].value;
  const last = points.at(-1);

  if (last === undefined) {
    return "flat" satisfies Momentum;
  }

  const delta = last.value - first;

  const threshold = range * 0.12;

  if (delta > threshold) {
    return "up" satisfies Momentum;
  }

  if (delta < -threshold) {
    return "down" satisfies Momentum;
  }

  return "flat" satisfies Momentum;
};
