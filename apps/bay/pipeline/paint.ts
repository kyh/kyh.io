// Step 2: paint each rendered frame in the map's style with an image model, out from the first
// tile, each one carrying on from the neighbours already painted, and fold it into the mosaic.
// Costs money, so without --go it only says what it would do.
//
//   pnpm -F @repo/bay paint --area ferry        # the plan and its cost
//   pnpm -F @repo/bay paint --area ferry --go   # paint

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import sharp from "sharp";
import { z } from "zod";
import { GRID, frameRect, frameSize, parseKey } from "../src/lib/grid";
import { blend, compose, paintOrder, paintedShare } from "../src/lib/paint";
import { DATA, cli, ensureDirs, isPainted, readMosaic, renderPath, writeMosaic } from "./common";
import { PROMPT } from "./prompt";

const MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
// a high-quality 1024 square with two images in, roughly: what the plan quotes
const COST_PER_TILE = 0.2;
const OUTPUTS = path.join(DATA, "paint");

const { force, go, keys, limit } = cli();
const done = await Promise.all(keys.map(async (k) => !force && (await isPainted(k))));
const todo = paintOrder(
  keys.filter((_, n) => !done[n]),
  { i: 0, j: 0 },
).slice(0, limit);
const unrendered = todo.filter((k) => !existsSync(renderPath(k)));
console.log(
  `${keys.length} tiles in the area, ${todo.length} to paint with ${MODEL}, about $${(todo.length * COST_PER_TILE).toFixed(2)}`,
);
if (unrendered.length > 0) {
  throw new Error(
    `${unrendered.length} tiles aren't rendered yet (first: ${unrendered[0]}): run render first`,
  );
}
if (!go) {
  console.log("dry run: add --go to paint");
  process.exit(0);
}
const key = process.env.OPENAI_API_KEY;
if (!key) {
  throw new Error("OPENAI_API_KEY is missing: see .env.example");
}
await ensureDirs();
await mkdir(OUTPUTS, { recursive: true });

const size = frameSize(GRID);
const png = (pixels: Uint8Array) =>
  sharp(Buffer.from(pixels), { raw: { channels: 4, height: size, width: size } })
    .png()
    .toBuffer();
const rgba = async (file: Buffer | string) =>
  new Uint8Array(await sharp(file).resize(size, size).ensureAlpha().raw().toBuffer());

// the style reference, when there is one: a picture of the look to match, sent with every frame
const reference = process.env.STYLE_REFERENCE ? await readFile(process.env.STYLE_REFERENCE) : null;

// an images/edits answer: the picture, base64
const Answer = z.object({ data: z.array(z.object({ b64_json: z.string() })).min(1) });

const edit = async (image: Buffer, mask: Buffer | null) => {
  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", PROMPT);
  form.append("size", `${size}x${size}`);
  form.append("quality", "high");
  form.append("input_fidelity", "high");
  form.append("output_format", "png");
  form.append("image[]", new Blob([new Uint8Array(image)], { type: "image/png" }), "frame.png");
  if (reference) {
    form.append(
      "image[]",
      new Blob([new Uint8Array(reference)], { type: "image/png" }),
      "reference.png",
    );
  }
  if (mask) {
    form.append("mask", new Blob([new Uint8Array(mask)], { type: "image/png" }), "mask.png");
  }
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      body: form,
      headers: { authorization: `Bearer ${key}` },
      method: "POST",
    });
    if (res.ok) {
      const b64 = Answer.parse(await res.json()).data[0]?.b64_json;
      if (!b64) {
        throw new Error("the model answered with no image");
      }
      return Buffer.from(b64, "base64");
    }
    const retry = res.status === 429 || res.status >= 500;
    if (!retry || attempt === 3) {
      throw new Error(`images/edits ${res.status}: ${await res.text()}`);
    }
    await sleep(2 ** attempt * 5000);
  }
};

for (const [n, tile] of todo.entries()) {
  const { i, j } = parseKey(tile);
  const rect = frameRect(GRID, i, j);
  const started = Date.now();
  const painted = await readMosaic(rect);
  const share = paintedShare(painted);
  const { image, mask } = compose(await rgba(renderPath(tile)), painted);
  const output = await edit(await png(image), share > 0 ? await png(mask) : null);
  await writeFile(path.join(OUTPUTS, `${tile}.png`), output);
  await writeMosaic(rect, blend(GRID, painted, await rgba(output)));
  console.log(
    `[${n + 1}/${todo.length}] ${tile}: ${Math.round(share * 100)}% context, ${((Date.now() - started) / 1000).toFixed(0)}s`,
  );
}
