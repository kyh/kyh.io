// How tiles are painted into one seamless picture, as pure pixel arithmetic over RGBA buffers.
// The painted map is a mosaic whose alpha says how much of each pixel has been painted. A tile's
// frame is its core plus a margin; the model gets the frame with what's already painted pasted
// over the raw render (kept by the mask) and paints the rest; the result goes back in feathered
// over the margin, so it fades into the neighbours it carried on from.

import { frameSize, parseKey, tileKey } from "./grid";
import type { Grid } from "./grid";

// tiles out from the first one, ring by ring, each ring clockwise from the top: every tile after
// the first has a painted neighbour to carry on from
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

// every tile in a rectangle of tiles, both ends included
export const tileRange = (from: { i: number; j: number }, to: { i: number; j: number }) => {
  const keys: string[] = [];
  for (let j = Math.min(from.j, to.j); j <= Math.max(from.j, to.j); j += 1) {
    for (let i = Math.min(from.i, to.i); i <= Math.max(from.i, to.i); i += 1) {
      keys.push(tileKey(i, j));
    }
  }
  return keys;
};

// how much of the model's output a frame pixel keeps: all of the core, fading to none at the
// frame's edge across the margin
export const featherWeight = (grid: Grid, x: number, y: number) => {
  const size = frameSize(grid);
  const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
  return Math.min(1, Math.max(0, edge / grid.margin));
};

// at least this much painted and a pixel is context the model must keep
const KEEP = 128;

// the model's input: the painted pixels over the render, and the mask of what it must keep
// (opaque: keep; transparent: paint here), both RGBA of the frame's size
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

// the share of a frame already painted: none means the model starts from the render alone
export const paintedShare = (painted: Uint8Array) => {
  let kept = 0;
  for (let p = 3; p < painted.length; p += 4) {
    if ((painted[p] ?? 0) >= KEEP) {
      kept += 1;
    }
  }
  return kept / (painted.length / 4);
};

// the model's output folded into what was painted: over painted pixels it fades in across the
// margin; over unpainted ones it goes down as it is, as painted as its weight
export const blend = (grid: Grid, painted: Uint8Array, output: Uint8Array) => {
  const size = frameSize(grid);
  const next = new Uint8Array(painted.length);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const p = (y * size + x) * 4;
      const w = featherWeight(grid, x, y);
      const had = (painted[p + 3] ?? 0) / 255;
      // over what's painted, the weight decides; over what isn't, the output is all there is
      const mix = had > 0 ? w : 1;
      for (let c = 0; c < 3; c += 1) {
        next[p + c] = Math.round((painted[p + c] ?? 0) * (1 - mix) + (output[p + c] ?? 0) * mix);
      }
      next[p + 3] = Math.round(Math.max(had, w) * 255);
    }
  }
  return next;
};
