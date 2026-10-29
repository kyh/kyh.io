// Step 1: draw each tile's frame from open data (source.ts) in the map's look, in headless Chrome.
// No keys. Renders are kept in data/render/; a tile already rendered is skipped unless --force.
//
//   pnpm -F @repo/bay render --area ferry

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { createServer } from "vite";
import { GRID, frameRect, frameSize, parseKey } from "../src/lib/grid";
import { paintOrder } from "../src/lib/paint";
import { PROJECTION, ROOT, chromeOptions, cli, ensureDirs, renderPath } from "./common";
import { frameScene } from "./source";

// drawn this many times bigger and shrunk, for clean edges and fine lines
const SUPERSAMPLE = 2;

const { force, keys, limit } = cli();
const todo = paintOrder(keys, { i: 0, j: 0 })
  .filter((k) => force || !existsSync(renderPath(k)))
  .slice(0, limit);
console.log(`${keys.length} tiles in the area, ${todo.length} to render`);
await ensureDirs();

const size = frameSize(GRID);
const server = await createServer({
  configFile: false,
  logLevel: "warn",
  root: ROOT,
  server: { port: 0 },
});
await server.listen();
const browser = await chromium.launch(chromeOptions());
try {
  const page = await browser.newPage({
    viewport: { height: size * SUPERSAMPLE, width: size * SUPERSAMPLE },
  });
  page.on("console", (m) => {
    if (m.type() === "error") {
      console.error(`  page: ${m.text()}`);
    }
  });
  await page.goto(`${server.resolvedUrls?.local[0] ?? "http://localhost:5173/"}render.html`);
  await page.waitForFunction(() => "bay" in window);
  await page.evaluate((s) => window.bay.setup(s), size * SUPERSAMPLE);
  for (const [n, tile] of todo.entries()) {
    const { i, j } = parseKey(tile);
    const started = Date.now();
    const rect = frameRect(GRID, i, j);
    const scene = await frameScene(PROJECTION, rect);
    const url = await page.evaluate(([p, r, s]) => window.bay.render(p, r, s), [
      PROJECTION,
      rect,
      scene,
    ] as const);
    const png = Buffer.from(url.split(",")[1] ?? "", "base64");
    await writeFile(
      renderPath(tile),
      await sharp(png).resize(size, size, { kernel: "lanczos3" }).png().toBuffer(),
    );
    console.log(
      `[${n + 1}/${todo.length}] ${tile}: ${scene.buildings.length} buildings, ${scene.trees.length} trees in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
  }
} finally {
  await browser.close();
  await server.close();
}
