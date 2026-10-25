// Step 1: render each tile's frame from Google's photorealistic 3D tiles, through the map's
// camera, in headless Chrome. Renders are kept in data/render/; a tile already rendered is
// skipped unless --force.
//
//   pnpm -F @repo/bay render --area ferry

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { createServer } from "vite";
import { GRID, frameRect, frameSize, parseKey } from "../src/lib/grid";
import { paintOrder } from "../src/lib/paint";
import { PROJECTION, ROOT, chromeOptions, cli, ensureDirs, renderPath } from "./common";

const key = process.env.GOOGLE_MAPS_API_KEY;
if (!key) {
  throw new Error("GOOGLE_MAPS_API_KEY is missing: see .env.example");
}

const { force, keys, limit } = cli();
const todo = paintOrder(keys, { i: 0, j: 0 })
  .filter((k) => force || !existsSync(renderPath(k)))
  .slice(0, limit);
console.log(`${keys.length} tiles in the area, ${todo.length} to render`);
await ensureDirs();

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
    viewport: { height: frameSize(GRID), width: frameSize(GRID) },
  });
  page.on("console", (m) => {
    if (m.type() === "error") {
      console.error(`  page: ${m.text()}`);
    }
  });
  await page.goto(`${server.resolvedUrls?.local[0] ?? "http://localhost:5173/"}render.html`);
  await page.waitForFunction(() => "bay" in window);
  await page.evaluate(([k, size]) => window.bay.setup(k, size), [key, frameSize(GRID)] as const);
  for (const [n, tile] of todo.entries()) {
    const { i, j } = parseKey(tile);
    const started = Date.now();
    const url = await page.evaluate(([proj, rect]) => window.bay.render(proj, rect), [
      PROJECTION,
      frameRect(GRID, i, j),
    ] as const);
    await writeFile(renderPath(tile), Buffer.from(url.split(",")[1] ?? "", "base64"));
    console.log(
      `[${n + 1}/${todo.length}] ${tile} in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
  }
} finally {
  await browser.close();
  await server.close();
}
