import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { GRID, parseKey, tileKey } from "../src/lib/grid";
import { TILE, levelCount, parentOf } from "../src/lib/pyramid";
import type { Manifest } from "../src/lib/pyramid";
import { MOSAIC, PROJECTION, PUBLIC, RENDERS, cli, inOrder, isPainted, readMosaic } from "./common";

const { from } = cli();
const files = await readdir(from === "paint" ? MOSAIC : RENDERS).catch(() => []);
const cores = files.filter((f) => f.endsWith(".png")).map((f) => parseKey(f.slice(0, -4)));

if (cores.length === 0) {
  throw new Error(
    from === "paint"
      ? "nothing painted yet: run render and paint first"
      : "nothing rendered yet: run render first",
  );
}

const c = GRID.core;

const rectOf = (tiles: { i: number; j: number }[]) => {
  const is = tiles.map((t) => t.i);
  const js = tiles.map((t) => t.j);

  return {
    h: (Math.max(...js) - Math.min(...js) + 1) * c,
    w: (Math.max(...is) - Math.min(...is) + 1) * c,
    x: Math.min(...is) * c,
    y: Math.min(...js) * c,
  };
};

const extent = rectOf(cores);

const isShown = await Promise.all(
  cores.map(async (t) => from === "render" || (await isPainted(tileKey(t.i, t.j)))),
);

const painted = cores.filter((_, n) => isShown[n] === true);

const bounds = rectOf(painted.length > 0 ? painted : cores);

await mkdir(PUBLIC, { recursive: true });

const old = await readdir(PUBLIC);

await Promise.all(
  old.map(async (f) => {
    await rm(path.join(PUBLIC, f), { force: true, recursive: true });
  }),
);

const file = (level: number, x: number, y: number) =>
  path.join(PUBLIC, String(level), `${x}_${y}.webp`);

const levels: string[][] = [[]];

await mkdir(path.join(PUBLIC, "0"), { recursive: true });

const bottom: { x: number; y: number }[] = [];

for (let y = Math.floor(extent.y / TILE); y * TILE < extent.y + extent.h; y += 1) {
  for (let x = Math.floor(extent.x / TILE); x * TILE < extent.x + extent.w; x += 1) {
    bottom.push({ x, y });
  }
}

await inOrder(bottom, async ({ x, y }) => {
  const pixels = await readMosaic({ h: TILE, w: TILE, x: x * TILE, y: y * TILE }, from);

  if (pixels.some((v, n) => n % 4 === 3 && v > 0)) {
    await sharp(Buffer.from(pixels), { raw: { channels: 4, height: TILE, width: TILE } })
      .webp({ quality: 88 })
      .toFile(file(0, x, y));
    levels[0]?.push(`${x}_${y}`);
  }
});

const above = Array.from({ length: Math.max(0, levelCount(extent) - 1) }, (_, n) => n + 1);

await inOrder(above, async (level) => {
  await mkdir(path.join(PUBLIC, String(level)), { recursive: true });

  const parents = new Set(
    (levels[level - 1] ?? []).map((k) => {
      const { i, j } = parseKey(k);
      const p = parentOf({ x: i, y: j });

      return `${p.x}_${p.y}`;
    }),
  );

  levels.push([...parents]);

  await inOrder([...parents], async (k) => {
    const { i, j } = parseKey(k);

    const children = [0, 1]
      .flatMap((dy) => [0, 1].map((dx) => ({ dx, dy, x: i * 2 + dx, y: j * 2 + dy })))
      .flatMap((t) => {
        const input = file(level - 1, t.x, t.y);

        return existsSync(input) ? [{ input, left: t.dx * TILE, top: t.dy * TILE }] : [];
      });

    const full = await sharp({
      create: {
        background: { alpha: 0, b: 0, g: 0, r: 0 },
        channels: 4,
        height: TILE * 2,
        width: TILE * 2,
      },
    })
      .composite(children)
      .png()
      .toBuffer();

    await sharp(full)
      .resize(TILE, TILE)
      .webp({ quality: 88 })
      .toFile(file(level, i, j));
  });
});

const manifest: Manifest = {
  bounds,
  levels,
  projection: PROJECTION,
  tile: TILE,
  updated: new Date().toISOString(),
};

await writeFile(path.join(PUBLIC, "manifest.json"), JSON.stringify(manifest));

console.log(
  `${cores.length} painted tiles → ${levels.map((l) => l.length).join(" / ")} display tiles over ${levels.length} levels`,
);
