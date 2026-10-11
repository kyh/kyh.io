// The frame source the mod's hooks spawn: serves the world through Vite to
// a headless Chrome (the one installed, via playwright-core), takes each
// frame the page posts, and answers the hooks over a Unix socket.
//
//   tsx stream/stream.ts --socket <path> --image <path>
//
// The page draws; this process turns its pixels into what the terminal
// takes: an RGBA file an Image reads (kitty, Ghostty), or Raster cells.
//
//   GET /frame?since=N&mode=image|cells&columns=C&rows=R&active=0|1
//     200, the frame's numbers in x- headers, its cells (if any) the body
//     204 when no frame is newer than N
//
// It prints `ready` once the first frame is in, and exits when the hooks
// stop asking for a while, so a lost session never leaves Chrome running.
import { once } from "node:events";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "playwright-core";
import type { Browser } from "playwright-core";
import { createServer } from "vite";

import { flipRows, frameSize, toCells } from "./frame";

type Mode = "image" | "cells";

interface Want {
  columns: number;
  rows: number;
  mode: Mode;
  isActive: boolean;
}

interface Latest {
  frame: number;
  width: number;
  height: number;
  columns: number;
  rows: number;
  score: number;
  coins: number;
  jumps: number;
  crashes: number;
  cells: string;
}

const ABANDONED_MS = 15_000;

const { values } = parseArgs({
  options: { image: { type: "string" }, socket: { type: "string" } },
});
const { image: imagePath, socket: socketPath } = values;
if (!imagePath || !socketPath) {
  process.stderr.write("usage: stream.ts --socket <path> --image <path>\n");
  process.exit(2);
}

const want: Want = { columns: 80, isActive: false, mode: "cells", rows: 24 };
let latest: Latest | null = null;
let lastAsked = Date.now();
let browser: Browser | null = null;

const readBody = async (request: http.IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const header = (request: http.IncomingMessage, name: string) => Number(request.headers[name] ?? 0);

// A frame from the page, kept in the form the hooks last asked for; the
// answer tells the page what to draw next.
const takeFrame = async (request: http.IncomingMessage, response: http.ServerResponse) => {
  const body = await readBody(request);
  const width = header(request, "x-width");
  const height = header(request, "x-height");
  if (width > 0 && height > 0 && body.length === width * height * 4) {
    const rgba = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    const { columns, rows } = want;
    const frame = (latest?.frame ?? 0) + 1;
    let cells = "";
    if (want.mode === "image") {
      // Written beside and renamed over, so the terminal never reads half a frame.
      writeFileSync(`${imagePath}.tmp`, flipRows(rgba, width, height));
      renameSync(`${imagePath}.tmp`, imagePath);
    } else {
      const words = toCells(rgba, width, height, columns, rows);
      cells = Buffer.from(words.buffer, words.byteOffset, words.byteLength).toString("base64");
    }
    const tally = {
      coins: header(request, "x-coins"),
      crashes: header(request, "x-crashes"),
      jumps: header(request, "x-jumps"),
      score: header(request, "x-score"),
    };
    latest = { cells, columns, frame, height, rows, width, ...tally };
    if (frame === 1) {
      process.stdout.write("ready\n");
    }
  }
  const size = frameSize(want.columns, want.rows, want.mode);
  response.setHeader("x-width", size.width);
  response.setHeader("x-height", size.height);
  response.setHeader("x-active", want.isActive ? "1" : "0");
  response.setHeader("x-mode", want.mode);
  response.end();
};

// The hooks' poll: what they want next, and the newest frame if they lack it.
const answer = (request: http.IncomingMessage, response: http.ServerResponse) => {
  const url = new URL(request.url ?? "/", "http://surfer");
  if (url.pathname !== "/frame") {
    response.statusCode = 404;
    response.end();
    return;
  }
  lastAsked = Date.now();
  const columns = Number(url.searchParams.get("columns"));
  const rows = Number(url.searchParams.get("rows"));
  if (columns > 0 && rows > 0) {
    want.columns = columns;
    want.rows = rows;
  }
  want.mode = url.searchParams.get("mode") === "image" ? "image" : "cells";
  want.isActive = url.searchParams.get("active") === "1";
  const since = Number(url.searchParams.get("since") ?? -1);
  if (!latest || latest.frame <= since) {
    response.statusCode = 204;
    response.end();
    return;
  }
  const { cells, ...numbers } = latest;
  for (const [name, value] of Object.entries(numbers)) {
    response.setHeader(`x-${name}`, value);
  }
  response.end(cells);
};

const vite = await createServer({
  appType: "spa",
  configFile: false,
  logLevel: "error",
  root: path.join(import.meta.dirname, "../world"),
  server: { hmr: false, middlewareMode: true },
});

const page = http.createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/frame") {
    vite.middlewares(request, response);
    return;
  }
  try {
    await takeFrame(request, response);
  } catch (error) {
    process.stderr.write(`frame: ${String(error)}\n`);
    response.statusCode = 500;
    response.end();
  }
});
page.listen(0, "127.0.0.1");
await once(page, "listening");
const address = page.address();
// A string address is a pipe's; a TCP listen always gives an object.
const port = address instanceof Object ? address.port : 0;

rmSync(socketPath, { force: true });
const hooks = http.createServer(answer);
hooks.listen(socketPath);
await once(hooks, "listening");

const shutdown = async (code: number) => {
  hooks.close();
  page.close();
  for (const file of [socketPath, imagePath, `${imagePath}.tmp`]) {
    rmSync(file, { force: true });
  }
  try {
    await browser?.close();
  } catch {
    // Chrome is gone already.
  }
  await vite.close();
  process.exit(code);
};
process.on("SIGTERM", async () => {
  await shutdown(0);
});
process.on("SIGINT", async () => {
  await shutdown(0);
});
setInterval(async () => {
  if (Date.now() - lastAsked > ABANDONED_MS) {
    await shutdown(0);
  }
}, 1000);

try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const tab = await browser.newPage();
  tab.on("pageerror", (error) => process.stderr.write(`page: ${error.message}\n`));
  await tab.goto(`http://127.0.0.1:${port}/?stream`);
} catch (error) {
  process.stderr.write(`chrome: ${error instanceof Error ? error.message : String(error)}\n`);
  await shutdown(1);
}
