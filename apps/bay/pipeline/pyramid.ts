// Step 3: cut the map into the viewer's pyramid in public/data/: level 0 at full size, each level
// up half the one below, until a tile spans it all, and manifest.json listing them. Cut from the
// renders as they are (the default), or from the mosaic painted over them.
//
//   pnpm -F @repo/bay pyramid               # the procedural map
//   pnpm -F @repo/bay pyramid --from=paint  # the painted one

import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { GRID, parseKey, tileKey } from "../src/lib/grid";
import { TILE, levelCount, parentOf } from "../src/lib/pyramid";
import type { Manifest } from "../src/lib/pyramid";
import { MOSAIC, PROJECTION, PUBLIC, RENDERS, cli, isPainted, readMosaic } from "./common";

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
// what's cut: every tile with paint on it, the feathered fringes round the edge included
const extent = rectOf(cores);
// what the viewer calls the map: the tiles painted as tiles (their middles fully painted), not
// the fringes their margins left on the tiles round them
const painted: { i: number; j: number }[] = [];
for (const t of cores) {
  if (from === "render" || (await isPainted(tileKey(t.i, t.j)))) {
    painted.push(t);
  }
}
const bounds = rectOf(painted.length > 0 ? painted : cores);

// emptied, not removed: a dev server watching public/data loses track of a folder made anew
await mkdir(PUBLIC, { recursive: true });
const old = await readdir(PUBLIC);
await Promise.all(old.map((f) => rm(path.join(PUBLIC, f), { force: true, recursive: true })));
const file = (level: number, x: number, y: number) =>
  path.join(PUBLIC, String(level), `${x}_${y}.webp`);

// level 0: the mosaic in display tiles, the empty ones left out
const levels: string[][] = [[]];
await mkdir(path.join(PUBLIC, "0"), { recursive: true });
for (let y = Math.floor(extent.y / TILE); y * TILE < extent.y + extent.h; y += 1) {
  for (let x = Math.floor(extent.x / TILE); x * TILE < extent.x + extent.w; x += 1) {
    const pixels = await readMosaic({ h: TILE, w: TILE, x: x * TILE, y: y * TILE }, from);
    if (pixels.some((v, n) => n % 4 === 3 && v > 0)) {
      await sharp(Buffer.from(pixels), { raw: { channels: 4, height: TILE, width: TILE } })
        .webp({ quality: 88 })
        .toFile(file(0, x, y));
      levels[0]?.push(`${x}_${y}`);
    }
  }
}

// each level up: four tiles of the one below, halved, until a tile spans the map
for (let level = 1; level < levelCount(extent); level += 1) {
  await mkdir(path.join(PUBLIC, String(level)), { recursive: true });
  const parents = new Set(
    (levels[level - 1] ?? []).map((k) => {
      const { i, j } = parseKey(k);
      const p = parentOf({ x: i, y: j });
      return `${p.x}_${p.y}`;
    }),
  );
  levels.push([...parents]);
  for (const k of parents) {
    const { i, j } = parseKey(k);
    const children = [0, 1]
      .flatMap((dy) => [0, 1].map((dx) => ({ dx, dy, x: i * 2 + dx, y: j * 2 + dy })))
      .filter((t) => existsSync(file(level - 1, t.x, t.y)))
      .map((t) => ({ input: file(level - 1, t.x, t.y), left: t.dx * TILE, top: t.dy * TILE }));
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
  }
}

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
