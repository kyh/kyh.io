// What the streamer does to a frame: the WebGL readback arrives RGBA and
// bottom-up; a terminal Image wants it top-down, and every other terminal
// gets Raster cells in quadrant blocks, two by two pixels a cell.

// A terminal cell is about twice as tall as it is wide.
const CELL_ASPECT = 2.1;
// Pixels across a column. Each frame crosses from Chrome to here whole, and
// that copy is what bounds the frame rate, so a frame is no bigger than the
// terminal can use: a picture's few pixels a column, or for blocks, twice
// the two a quadrant cell shows (the rest only smooths the average).
const PER_COLUMN = { cells: 4, image: 6 } as const;
const MAX_WIDTH = 640;

// The pixels to render for a pane of `columns` by `rows` cells.
export const frameSize = (columns: number, rows: number, mode: "image" | "cells") => {
  const width = Math.min(MAX_WIDTH, Math.round((columns * PER_COLUMN[mode]) / 2) * 2);
  const height = Math.max(2, Math.round((width * rows * CELL_ASPECT) / columns / 2) * 2);
  return { height, width };
};

// Top-down rows, by whole-row copies (native, no per-pixel work).
export const flipRows = (rgba: Uint8Array, width: number, height: number) => {
  const flipped = new Uint8Array(rgba.length);
  const stride = width * 4;
  for (let y = 0; y < height; y += 1) {
    flipped.set(rgba.subarray((height - 1 - y) * stride, (height - y) * stride), y * stride);
  }
  return flipped;
};

// Indexed by which of the four quarters take the foreground: bit 0 upper
// left, 1 upper right, 2 lower left, 3 lower right.
const QUADRANTS = [
  0x00_20, 0x25_98, 0x25_9d, 0x25_80, 0x25_96, 0x25_8c, 0x25_9e, 0x25_9b, 0x25_97, 0x25_9a, 0x25_90,
  0x25_9c, 0x25_84, 0x25_99, 0x25_9f, 0x25_88,
];

type Rgb = [number, number, number];

// The average color of a box of the bottom-up readback, by top-down bounds.
const average = (
  rgba: Uint8Array,
  width: number,
  height: number,
  box: [number, number, number, number],
): Rgb => {
  const [x0, y0, x1, y1] = box;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 1) {
    const row = (height - 1 - y) * width * 4;
    for (let x = x0; x < x1; x += 1) {
      const i = row + x * 4;
      r += rgba[i] ?? 0;
      g += rgba[i + 1] ?? 0;
      b += rgba[i + 2] ?? 0;
      n += 1;
    }
  }
  return n === 0 ? [0, 0, 0] : [r / n, g / n, b / n];
};

const pack = ([r, g, b]: Rgb) => Math.round(r) * 65_536 + Math.round(g) * 256 + Math.round(b);

const mean = (colors: Rgb[]): Rgb => {
  const sum: Rgb = [0, 0, 0];
  for (const color of colors) {
    sum[0] += color[0];
    sum[1] += color[1];
    sum[2] += color[2];
  }
  const n = Math.max(1, colors.length);
  return [sum[0] / n, sum[1] / n, sum[2] / n];
};

const spread = (colors: Rgb[], center: Rgb) =>
  colors.reduce(
    (total, c) =>
      total + (c[0] - center[0]) ** 2 + (c[1] - center[1]) ** 2 + (c[2] - center[2]) ** 2,
    0,
  );

const isSet = (mask: number, bit: number) => Math.floor(mask / 2 ** bit) % 2 === 1;

// The split of four quarters into two colors that loses the least.
const bestSplit = (quarters: Rgb[]) => {
  let best = { bg: mean(quarters), error: Number.POSITIVE_INFINITY, fg: mean(quarters), mask: 0 };
  best.error = spread(quarters, best.bg);
  for (let mask = 1; mask < 15; mask += 1) {
    const front = quarters.filter((_, i) => isSet(mask, i));
    const back = quarters.filter((_, i) => !isSet(mask, i));
    const fg = mean(front);
    const bg = mean(back);
    const error = spread(front, fg) + spread(back, bg);
    if (error < best.error) {
      best = { bg, error, fg, mask };
    }
  }
  return best;
};

// Raster cells (`[codePoint, foreground, background]` words) for `columns`
// by `rows`, from an RGBA readback of any size.
export const toCells = (
  rgba: Uint8Array,
  width: number,
  height: number,
  columns: number,
  rows: number,
) => {
  const cells = new Uint32Array(columns * rows * 3);
  const across = columns * 2;
  const down = rows * 2;
  const xAt = (i: number) => Math.min(width, Math.floor((i * width) / across));
  const yAt = (i: number) => Math.min(height, Math.floor((i * height) / down));
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const quarters = [0, 1, 2, 3].map((q) => {
        const sx = column * 2 + (q % 2);
        const sy = row * 2 + Math.floor(q / 2);
        return average(rgba, width, height, [
          xAt(sx),
          yAt(sy),
          Math.max(xAt(sx) + 1, xAt(sx + 1)),
          Math.max(yAt(sy) + 1, yAt(sy + 1)),
        ]);
      });
      const { bg, fg, mask } = bestSplit(quarters);
      const i = (row * columns + column) * 3;
      cells[i] = QUADRANTS[mask] ?? 0x20;
      cells[i + 1] = pack(fg);
      cells[i + 2] = pack(bg);
    }
  }
  return cells;
};
