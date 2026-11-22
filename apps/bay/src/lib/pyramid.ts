import type { Projection } from "./grid";

export const TILE = 512;

export interface Manifest {
  updated: string;
  tile: number;
  bounds: { x: number; y: number; w: number; h: number };
  projection: Projection;
  levels: string[][];
}

export const levelFor = (zoom: number, levels: number) =>
  Math.max(0, Math.min(levels - 1, Math.floor(Math.log2(1 / zoom))));

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

export const levelCount = (bounds: { w: number; h: number }, tile = TILE) =>
  1 + Math.max(0, Math.ceil(Math.log2(Math.max(bounds.w, bounds.h) / tile)));

export const parentOf = (t: { x: number; y: number }) => ({
  x: Math.floor(t.x / 2),
  y: Math.floor(t.y / 2),
});
