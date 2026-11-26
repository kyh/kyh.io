import { frameSize, parseKey, tileKey } from "./grid";
import type { Grid } from "./grid";

export const paintOrder = (keys: Iterable<string>, start: { i: number; j: number }) => {
  const ring = (k: string) => {
    const { i, j } = parseKey(k);

    return Math.max(Math.abs(i - start.i), Math.abs(j - start.j));
  };

  const angle = (k: string) => {
    const { i, j } = parseKey(k);

    return (Math.atan2(i - start.i, -(j - start.j)) + 2 * Math.PI) % (2 * Math.PI);
  };

  return [...new Set(keys)].toSorted((a, b) => ring(a) - ring(b) || angle(a) - angle(b));
};

const apart = (a: { i: number; j: number }, b: { i: number; j: number }) =>
  Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j));

export const nextWave = (order: string[], painted: Set<string>, limit: number) => {
  const done = [...painted].map(parseKey);
  const beside = (t: { i: number; j: number }) => done.some((d) => apart(d, t) === 1);
  const fresh = !order.some((k) => !painted.has(k) && beside(parseKey(k)));
  const wave: string[] = [];

  for (const key of order) {
    if (wave.length >= limit || (fresh && wave.length === 1)) {
      break;
    }

    const t = parseKey(key);
    const free = !painted.has(key) && wave.every((w) => apart(parseKey(w), t) > 1);

    if (free && (fresh || beside(t))) {
      wave.push(key);
    }
  }

  return wave;
};

export const tileRange = (from: { i: number; j: number }, to: { i: number; j: number }) => {
  const keys: string[] = [];

  for (let j = Math.min(from.j, to.j); j <= Math.max(from.j, to.j); j += 1) {
    for (let i = Math.min(from.i, to.i); i <= Math.max(from.i, to.i); i += 1) {
      keys.push(tileKey(i, j));
    }
  }

  return keys;
};

export const featherWeight = (grid: Grid, x: number, y: number) => {
  const size = frameSize(grid);
  const edge = Math.min(x, y, size - 1 - x, size - 1 - y);

  return Math.min(1, Math.max(0, edge / grid.margin));
};

const KEEP = 128;

export const compose = (render: Uint8Array, painted: Uint8Array) => {
  const image = new Uint8Array(render.length);
  const mask = new Uint8Array(render.length);

  for (let p = 0; p < render.length; p += 4) {
    const a = (painted[p + 3] ?? 0) / 255;

    for (let c = 0; c < 3; c += 1) {
      image[p + c] = Math.round((painted[p + c] ?? 0) * a + (render[p + c] ?? 0) * (1 - a));
    }

    image[p + 3] = 255;
    mask[p + 3] = (painted[p + 3] ?? 0) >= KEEP ? 255 : 0;
  }

  return { image, mask };
};

export const paintedShare = (painted: Uint8Array) => {
  let kept = 0;

  for (let p = 3; p < painted.length; p += 4) {
    if ((painted[p] ?? 0) >= KEEP) {
      kept += 1;
    }
  }

  return kept / (painted.length / 4);
};

export const blend = (grid: Grid, painted: Uint8Array, output: Uint8Array) => {
  const size = frameSize(grid);
  const next = new Uint8Array(painted.length);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const p = (y * size + x) * 4;
      const w = featherWeight(grid, x, y);
      const had = (painted[p + 3] ?? 0) / 255;
      const mix = had > 0 ? w : 1;

      for (let c = 0; c < 3; c += 1) {
        next[p + c] = Math.round((painted[p + c] ?? 0) * (1 - mix) + (output[p + c] ?? 0) * mix);
      }

      next[p + 3] = Math.round(Math.max(had, w) * 255);
    }
  }

  return next;
};
