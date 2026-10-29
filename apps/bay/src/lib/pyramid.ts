// The painted map served as a pyramid: level 0 is the canvas at full size cut into square tiles,
// each level up is half the size of the one below. Pure: the build and the viewer share it.

import type { Projection } from "./grid";

export const TILE = 512;

export interface Manifest {
  updated: string;
  tile: number;
  // the painted part of the canvas, in canvas px
  bounds: { x: number; y: number; w: number; h: number };
  projection: Projection;
  // per level, the tiles it has ("x_y" in that level's tile units)
  levels: string[][];
}

// the level whose pixels are closest to the screen's without being coarser
export const levelFor = (zoom: number, levels: number) =>
  Math.max(0, Math.min(levels - 1, Math.floor(Math.log2(1 / zoom))));

// the tiles of a level a canvas rectangle touches
export const tilesIn = (
  rect: { x: number; y: number; w: number; h: number },
  level: number,
  tile = TILE,
) => {
  const size = tile * 2 ** level;
  const out: { x: number; y: number }[] = [];
  for (let y = Math.floor(rect.y / size); y < Math.ceil((rect.y + rect.h) / size); y += 1) {
    for (let x = Math.floor(rect.x / size); x < Math.ceil((rect.x + rect.w) / size); x += 1) {
      out.push({ x, y });
    }
  }
  return out;
};

// levels up to the first whose tile spans the map (which still takes up to 2×2 tiles of it when the
// map straddles a tile edge: parents of -1 and 0 never meet)
export const levelCount = (bounds: { w: number; h: number }, tile = TILE) =>
  1 + Math.max(0, Math.ceil(Math.log2(Math.max(bounds.w, bounds.h) / tile)));

// the tile a level up that holds this one
export const parentOf = (t: { x: number; y: number }) => ({
  x: Math.floor(t.x / 2),
  y: Math.floor(t.y / 2),
});
