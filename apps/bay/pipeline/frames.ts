// A tile's frame on its way through a painter and back, shared by the two ways of painting: the
// API (paint.ts) and jobs handed to an agent (jobs.ts).

import sharp from "sharp";
import { GRID, frameRect, frameSize, parseKey } from "../src/lib/grid";
import { blend, compose, paintedShare } from "../src/lib/paint";
import { readMosaic, renderPath, writeMosaic } from "./common";

export const SIZE = frameSize(GRID);

export const png = (pixels: Uint8Array) =>
  sharp(Buffer.from(pixels), { raw: { channels: 4, height: SIZE, width: SIZE } })
    .png()
    .toBuffer();

// any picture as the frame's RGBA, resized to it if a painter answered at another size
export const rgba = async (file: Buffer | string) =>
  new Uint8Array(
    await sharp(file).resize(SIZE, SIZE, { fit: "fill" }).ensureAlpha().raw().toBuffer(),
  );

// the tile's own core cleared out of what's painted round it, so a redo starts from its render
// rather than keeping its old painting as context
const clearCore = (painted: Uint8Array) => {
  const next = new Uint8Array(painted);
  for (let y = GRID.margin; y < GRID.margin + GRID.core; y += 1) {
    for (let x = GRID.margin; x < GRID.margin + GRID.core; x += 1) {
      next[(y * SIZE + x) * 4 + 3] = 0;
    }
  }
  return next;
};

// what a painter gets for a tile: the render with what's painted pasted over it, the mask of what
// to keep (alpha: opaque keeps), and how much of the frame is already painted
export const prepare = async (tile: string, redo: boolean) => {
  const { i, j } = parseKey(tile);
  const around = await readMosaic(frameRect(GRID, i, j));
  const painted = redo ? clearCore(around) : around;
  const { image, mask } = compose(await rgba(renderPath(tile)), painted);
  return { image, mask, share: paintedShare(painted) };
};

// the mask as a picture a person or an agent can read: white keeps, black is to paint
export const visibleMask = (mask: Uint8Array) => {
  const out = new Uint8Array(mask.length);
  for (let p = 0; p < mask.length; p += 4) {
    const v = mask[p + 3] ?? 0;
    out.set([v, v, v, 255], p);
  }
  return out;
};

// a painter's answer folded into the mosaic, feathered over the margin into its neighbours
export const foldIn = async (tile: string, output: Buffer) => {
  const { i, j } = parseKey(tile);
  const rect = frameRect(GRID, i, j);
  const painted = await readMosaic(rect);
  await writeMosaic(rect, blend(GRID, painted, await rgba(output)));
};
