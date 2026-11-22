import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { GRID, SF, parseKey, toCanvas, tileAt, tileKey } from "../src/lib/grid";
import { tileRange } from "../src/lib/paint";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const DATA = path.join(ROOT, "data");
export const RENDERS = path.join(DATA, "render");
export const MOSAIC = path.join(DATA, "mosaic");
export const PUBLIC = path.join(ROOT, "public", "data");

export const PROJECTION = SF;

interface Box {
  south: number;
  west: number;
  north: number;
  east: number;
}

const AREAS = new Map<string, Box>([
  ["ferry", { east: -122.389, north: 37.798, south: 37.7925, west: -122.3975 }],
  ["downtown", { east: -122.388, north: 37.8, south: 37.778, west: -122.418 }],
  ["sf", { east: -122.355, north: 37.833, south: 37.705, west: -122.517 }],
]);

const areaTiles = (box: Box) => {
  const corners = [
    toCanvas(PROJECTION, box.north, box.west, 0),
    toCanvas(PROJECTION, box.north, box.east, 0),
    toCanvas(PROJECTION, box.south, box.west, 0),
    toCanvas(PROJECTION, box.south, box.east, 0),
  ].map((c) => tileAt(GRID, c.x, c.y));

  const is = corners.map((c) => c.i);
  const js = corners.map((c) => c.j);

  return tileRange(
    { i: Math.min(...is), j: Math.min(...js) },
    { i: Math.max(...is), j: Math.max(...js) },
  );
};

export const cli = () => {
  const { values } = parseArgs({
    options: {
      area: { type: "string" },
      discard: { default: false, type: "boolean" },
      force: { default: false, type: "boolean" },
      from: { default: "render", type: "string" },
      go: { default: false, type: "boolean" },
      limit: { type: "string" },
      tiles: { type: "string" },
    },
  });

  let keys: string[];

  if (values.tiles) {
    const [from, to] = values.tiles.split(":").map((s) => s.split(",").map(Number));

    if (!(from?.length === 2 && to?.length === 2) || [...from, ...to].some(Number.isNaN)) {
      throw new Error(`--tiles=i,j:i,j wanted, got ${values.tiles}`);
    }

    keys = tileRange({ i: from[0] ?? 0, j: from[1] ?? 0 }, { i: to[0] ?? 0, j: to[1] ?? 0 });
  } else {
    const name = values.area ?? "ferry";
    const box = AREAS.get(name);

    if (!box) {
      throw new Error(`no area ${name}: one of ${[...AREAS.keys()].join(", ")}`);
    }

    keys = areaTiles(box);
  }

  const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;
  const from: Layer = values.from === "paint" ? "paint" : "render";

  return { discard: values.discard, force: values.force, from, go: values.go, keys, limit };
};

export const ensureDirs = async () => {
  await Promise.all([RENDERS, MOSAIC, PUBLIC].map((d) => mkdir(d, { recursive: true })));
};

export const renderPath = (key: string) => path.join(RENDERS, `${key}.png`);
export const mosaicPath = (key: string) => path.join(MOSAIC, `${key}.png`);

export type Layer = "render" | "paint";

const readCore = async (key: string, layer: Layer) => {
  if (layer === "paint") {
    const file = mosaicPath(key);

    return existsSync(file) ? await sharp(file).ensureAlpha().raw().toBuffer() : null;
  }

  const file = renderPath(key);

  if (!existsSync(file)) {
    return null;
  }

  const c = GRID.core;
  const m = GRID.margin;

  return sharp(file)
    .extract({ height: c, left: m, top: m, width: c })
    .ensureAlpha()
    .raw()
    .toBuffer();
};

export const readMosaic = async (
  rect: { x: number; y: number; w: number; h: number },
  layer: Layer = "paint",
) => {
  const c = GRID.core;
  const out = new Uint8Array(rect.w * rect.h * 4);

  for (let j = Math.floor(rect.y / c); j * c < rect.y + rect.h; j += 1) {
    for (let i = Math.floor(rect.x / c); i * c < rect.x + rect.w; i += 1) {
      const tile = await readCore(tileKey(i, j), layer);

      if (!tile) {
        continue;
      }

      const left = Math.max(rect.x, i * c);
      const right = Math.min(rect.x + rect.w, (i + 1) * c);

      for (let y = Math.max(rect.y, j * c); y < Math.min(rect.y + rect.h, (j + 1) * c); y += 1) {
        const from = ((y - j * c) * c + (left - i * c)) * 4;
        out.set(
          tile.subarray(from, from + (right - left) * 4),
          ((y - rect.y) * rect.w + (left - rect.x)) * 4,
        );
      }
    }
  }

  return out;
};

export const isPainted = async (key: string) => {
  if (!existsSync(mosaicPath(key))) {
    return false;
  }

  const { i, j } = parseKey(key);
  const c = GRID.core;
  const middle = await readMosaic({ h: 1, w: 1, x: i * c + c / 2, y: j * c + c / 2 });

  return middle[3] === 255;
};

export const writeMosaic = async (
  rect: { x: number; y: number; w: number; h: number },
  pixels: Uint8Array,
) => {
  const c = GRID.core;
  const image = sharp(Buffer.from(pixels), { raw: { channels: 4, height: rect.h, width: rect.w } });
  const writes: Promise<unknown>[] = [];

  for (let j = Math.floor(rect.y / c); j * c < rect.y + rect.h; j += 1) {
    for (let i = Math.floor(rect.x / c); i * c < rect.x + rect.w; i += 1) {
      const left = Math.max(rect.x, i * c);
      const top = Math.max(rect.y, j * c);
      const right = Math.min(rect.x + rect.w, (i + 1) * c);
      const bottom = Math.min(rect.y + rect.h, (j + 1) * c);
      const tile = await readMosaic({ h: c, w: c, x: i * c, y: j * c });

      const part = await image
        .clone()
        .extract({
          height: bottom - top,
          left: left - rect.x,
          top: top - rect.y,
          width: right - left,
        })
        .raw()
        .toBuffer();

      const w = right - left;

      for (let y = 0; y < bottom - top; y += 1) {
        const from = y * w * 4;
        tile.set(part.subarray(from, from + w * 4), ((top - j * c + y) * c + (left - i * c)) * 4);
      }

      writes.push(
        sharp(Buffer.from(tile), { raw: { channels: 4, height: c, width: c } })
          .png()
          .toFile(mosaicPath(tileKey(i, j))),
      );
    }
  }

  await Promise.all(writes);
};

export const chromeOptions = () => ({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : { channel: "chrome" }),
});
