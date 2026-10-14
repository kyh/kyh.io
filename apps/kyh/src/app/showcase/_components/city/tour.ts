// The flyover: a closed, smooth path that passes over every project's
// building, out along the near side of town and back along the far side,
// the way the camera pans across the valley in a title sequence.
export interface Stop {
  slug: string;
  x: number;
  z: number;
}

interface Sample {
  x: number;
  z: number;
  /** Distance along the path to here. */
  s: number;
}

export interface Tour {
  length: number;
  at: (s: number) => { x: number; z: number };
  /** The path distance closest to a point, to pick the tour up from there. */
  closest: (x: number, z: number) => number;
  /** The stop nearest a point, if one is close. */
  stopNear: (x: number, z: number, within: number) => Stop | null;
}

const screenU = (stop: Stop) => stop.x - stop.z;
const screenV = (stop: Stop) => stop.x + stop.z;

/** Out along the near half, left to right; back along the far half. */
export const orderStops = (stops: readonly Stop[]): Stop[] => {
  const depths = stops.map(screenV).toSorted((a, b) => a - b);
  const median = depths[Math.floor(depths.length / 2)] ?? 0;
  const near = stops
    .filter((stop) => screenV(stop) >= median)
    .toSorted((a, b) => screenU(a) - screenU(b));
  const far = stops
    .filter((stop) => screenV(stop) < median)
    .toSorted((a, b) => screenU(b) - screenU(a));
  return [...near, ...far];
};

const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 *
  (2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

const STEPS = 32;

export const createTour = (stops: readonly Stop[]): Tour | null => {
  const ordered = orderStops(stops);
  const count = ordered.length;
  if (count < 2) {
    return null;
  }
  const at = (index: number) =>
    ordered[((index % count) + count) % count] ?? { slug: "", x: 0, z: 0 };
  const samples: Sample[] = [];
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    const [p0, p1, p2, p3] = [at(index - 1), at(index), at(index + 1), at(index + 2)];
    for (let step = 0; step < STEPS; step += 1) {
      const t = step / STEPS;
      const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
      const z = catmullRom(p0.z, p1.z, p2.z, p3.z, t);
      const previous = samples.at(-1);
      total += previous ? Math.hypot(x - previous.x, z - previous.z) : 0;
      samples.push({ s: total, x, z });
    }
  }
  const [first] = samples;
  const last = samples.at(-1);
  if (!first || !last) {
    return null;
  }
  const length = total + Math.hypot(first.x - last.x, first.z - last.z);
  const sampleAt = (s: number) => {
    const wrapped = ((s % length) + length) % length;
    // Binary search for the sample just before `wrapped`.
    let low = 0;
    let high = samples.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if ((samples[mid]?.s ?? 0) <= wrapped) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    const a = samples[low] ?? first;
    const b = samples[low + 1] ?? first;
    const span = (b === first ? length : b.s) - a.s;
    const t = span > 0 ? (wrapped - a.s) / span : 0;
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  };
  return {
    at: sampleAt,
    closest: (x, z) => {
      let best = first;
      let bestDistance = Infinity;
      for (const sample of samples) {
        const distance = Math.hypot(sample.x - x, sample.z - z);
        if (distance < bestDistance) {
          best = sample;
          bestDistance = distance;
        }
      }
      return best.s;
    },
    length,
    stopNear: (x, z, within) => {
      let best: Stop | null = null;
      let bestDistance = within;
      for (const stop of ordered) {
        const distance = Math.hypot(stop.x - x, stop.z - z);
        if (distance < bestDistance) {
          best = stop;
          bestDistance = distance;
        }
      }
      return best;
    },
  };
};
