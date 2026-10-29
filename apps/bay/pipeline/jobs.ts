// Painting with an agent instead of the API (CODEX.md is its brief): each run folds in the
// paintings the agent has saved, then lays out the next wave of jobs in data/jobs/, one folder a
// tile, for the agent to paint. Tiles in a wave never touch, so they can be painted in any order.
//
//   pnpm -F @repo/bay jobs --area ferry                  # fold in what's done, lay out the next wave
//   pnpm -F @repo/bay jobs --area ferry --discard        # lay the waiting jobs out afresh
//   pnpm -F @repo/bay jobs --tiles=1,0:1,0 --force       # redo a tile from its render

import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { nextWave, paintOrder } from "../src/lib/paint";
import { DATA, MOSAIC, cli, ensureDirs, isPainted, renderPath } from "./common";
import { SIZE, foldIn, png, prepare, visibleMask } from "./frames";
import { PROMPT } from "./prompt";

const JOBS = path.join(DATA, "jobs");
const OUTPUTS = path.join(DATA, "paint");
// the most jobs a wave lays out: enough to keep an agent busy, few enough to check by eye
const WAVE = 8;

const { discard, force, keys, limit } = cli();
await ensureDirs();
await mkdir(JOBS, { recursive: true });
await mkdir(OUTPUTS, { recursive: true });

const jobDirs = async () => {
  const names = await readdir(JOBS, { withFileTypes: true });
  return names.filter((d) => d.isDirectory()).map((d) => d.name);
};

// ---- fold in what the agent has painted --------------------------------------------------------

const folded: string[] = [];
for (const tile of await jobDirs()) {
  const output = path.join(JOBS, tile, "output.png");
  if (!existsSync(output)) {
    continue;
  }
  const body = await readFile(output);
  const meta = await sharp(body)
    .metadata()
    .catch(() => null);
  if (!(meta?.width && meta.height)) {
    console.error(`${tile}: output.png isn't a picture; leaving the job for another go`);
    continue;
  }
  if (Math.abs(meta.width / meta.height - 1) > 0.02) {
    console.error(
      `${tile}: output.png is ${meta.width}×${meta.height}, not square; leaving it for another go`,
    );
    continue;
  }
  await foldIn(tile, body);
  await rename(output, path.join(OUTPUTS, `${tile}.png`));
  await rm(path.join(JOBS, tile), { force: true, recursive: true });
  folded.push(tile);
}
if (folded.length > 0) {
  console.log(`folded in ${folded.length}: ${folded.join(", ")}`);
}

if (discard) {
  for (const tile of await jobDirs()) {
    await rm(path.join(JOBS, tile), { force: true, recursive: true });
  }
  console.log("dropped the waiting jobs");
}

// ---- the next wave -----------------------------------------------------------------------------

const brief = (tile: string, share: number) =>
  [
    `# Job ${tile}`,
    "",
    "Edit `input.png` into `output.png` (in this folder), following the brief below.",
    "",
    `- \`input.png\`: the frame to repaint, ${SIZE}×${SIZE}.`,
    share > 0
      ? `- \`mask.png\`: white is already painted (${Math.round(share * 100)}% of the frame): keep it as it is and carry its look on seamlessly into the black, which is yours to paint.`
      : "- No mask: nothing round this tile is painted yet, so the whole frame is yours, and it sets the style for the tiles after it.",
    ...(existsSync(path.join(JOBS, "reference.png"))
      ? ["- `../reference.png`: a picture of the look to match (its style, not its content)."]
      : []),
    `- \`output.png\`: save the result here, a ${SIZE}×${SIZE} PNG, same framing as the input.`,
    "",
    "## Brief",
    "",
    PROMPT,
    "",
  ].join("\n");

// every tile painted anywhere, not just in this area: a tile on the area's edge can carry on
// from one beyond it. A --force tile counts as unpainted, to be laid out again.
const paintedTiles = new Set<string>();
for (const name of await readdir(MOSAIC)) {
  const tile = name.replace(/\.png$/u, "");
  if (!(force && keys.includes(tile)) && (await isPainted(tile))) {
    paintedTiles.add(tile);
  }
}
const order = paintOrder(keys, { i: 0, j: 0 });
const left = order.filter((k) => !paintedTiles.has(k));

let wave: string[] = [];
const waiting = await jobDirs();
if (waiting.length === 0) {
  wave = nextWave(left, paintedTiles, Math.min(WAVE, limit));
  if (wave.length > 0 && process.env.STYLE_REFERENCE) {
    await copyFile(process.env.STYLE_REFERENCE, path.join(JOBS, "reference.png"));
  }
  for (const tile of wave) {
    if (!existsSync(renderPath(tile))) {
      throw new Error(`${tile} isn't rendered yet: run render for the area first`);
    }
    const dir = path.join(JOBS, tile);
    await mkdir(dir, { recursive: true });
    const { image, mask, share } = await prepare(tile, force);
    await writeFile(path.join(dir, "input.png"), await png(image));
    if (share > 0) {
      await writeFile(path.join(dir, "mask.png"), await png(visibleMask(mask)));
    }
    await writeFile(path.join(dir, "job.md"), brief(tile, share));
  }
}

// ---- where things stand, for the agent and for you ---------------------------------------------

const pending = await jobDirs();
await writeFile(
  path.join(JOBS, "JOBS.md"),
  [
    "# Painting jobs",
    "",
    pending.length > 0
      ? `${pending.length} waiting. For each folder below, read its \`job.md\` and paint its \`output.png\`; then run \`pnpm -F @repo/bay jobs\` again with the same area.`
      : "None waiting.",
    "",
    ...(pending.length > 0 ? [...pending.map((t) => `- \`data/jobs/${t}/\``), ""] : []),
    `${keys.length - left.length} of the area's ${keys.length} tiles painted.`,
    "",
  ].join("\n"),
);

if (pending.length > 0) {
  console.log(`${pending.length} jobs waiting in data/jobs/: ${pending.join(", ")}`);
  console.log("paint each one's output.png (its job.md says how), then run jobs again");
} else if (left.length === 0) {
  console.log(`all ${keys.length} tiles painted: run pyramid --from=paint, then dev:bay to look`);
} else {
  console.log(`${left.length} tiles left but none can be laid out: are they rendered?`);
}
