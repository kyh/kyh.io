// Records an app's og:video: a small HTML scene built to represent the app
// (scripts/og-video/<app>.html), never a capture of the running app. Each
// scene draws a frame for any time t (`window.scene.render(t)`), so this steps
// it at 30fps, screenshots each frame at 2x and encodes the H.264 MP4 + JPEG
// poster the app links from its metadata. Not part of `pnpm verify` or a build.
//
//   pnpm og:video kyh                  # → apps/kyh/public/og/showcase.mp4 + .jpg
//   pnpm og:video stonksville          # → apps/stonksville/public/og/og.mp4 + .jpg
//   pnpm og:video autoplay             # → apps/autoplay/public/og/og.mp4 + .jpg
//   pnpm og:video commuting-clawders   # → apps/commuting-clawders/public/og/og.mp4 + .jpg
//
// Playwright isn't a dependency of the repo: it resolves from a global install
// through NODE_PATH, and only Chromium is needed. ffmpeg must be on PATH.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

const WIDTH = 1200;
const HEIGHT = 630;
const FPS = 30;

/** Each app's scene, where its clip goes, the frame (ms) its poster is, and the crf that keeps it small. */
const apps = {
  autoplay: { crf: 30, out: "apps/autoplay/public/og/og", posterMs: 2600 },
  "commuting-clawders": { crf: 26, out: "apps/commuting-clawders/public/og/og", posterMs: 5600 },
  kyh: { crf: 26, out: "apps/kyh/public/og/showcase", posterMs: 6200 },
  stonksville: { crf: 26, out: "apps/stonksville/public/og/og", posterMs: 5200 },
};

const ffmpeg = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);

const loadPlaywright = () => {
  try {
    return require("playwright");
  } catch {
    throw new Error(
      "Playwright isn't installed here. Point NODE_PATH at a global install (NODE_PATH=$(npm root -g)) or `npm i -g playwright`.",
    );
  }
};

const main = async () => {
  const [name] = process.argv.slice(2);
  const app = apps[name];
  if (!app) {
    throw new Error(`Usage: pnpm og:video <${Object.keys(apps).join("|")}>`);
  }
  const out = path.resolve(root, app.out);
  mkdirSync(path.dirname(out), { recursive: true });
  const framesDir = mkdtempSync(path.join(tmpdir(), `og-${name}-`));

  const { chromium } = loadPlaywright();
  // The scenes load the apps' own font files from the checkout.
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage({
      deviceScaleFactor: 2,
      viewport: { height: HEIGHT, width: WIDTH },
    });
    await page.goto(pathToFileURL(path.join(root, "scripts/og-video", `${name}.html`)).href);
    const duration = await page.evaluate(async () => {
      await window.sceneReady;
      return window.scene.duration;
    });
    const frames = Math.round((duration / 1000) * FPS);
    for (let frame = 0; frame < frames; frame += 1) {
      await page.evaluate((ms) => window.scene.render(ms), (frame * 1000) / FPS);
      await page.screenshot({
        path: path.join(framesDir, `f${String(frame).padStart(4, "0")}.png`),
      });
    }
    ffmpeg([
      "-framerate",
      String(FPS),
      "-i",
      path.join(framesDir, "f%04d.png"),
      "-vf",
      `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "high",
      "-crf",
      String(app.crf),
      "-preset",
      "slow",
      "-movflags",
      "+faststart",
      "-an",
      `${out}.mp4`,
    ]);
    const poster = Math.min(frames - 1, Math.round((app.posterMs / 1000) * FPS));
    ffmpeg([
      "-i",
      path.join(framesDir, `f${String(poster).padStart(4, "0")}.png`),
      "-vf",
      `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
      "-q:v",
      "3",
      `${out}.jpg`,
    ]);
  } finally {
    await browser.close();
    rmSync(framesDir, { force: true, recursive: true });
  }
  const { size } = statSync(`${out}.mp4`);
  process.stdout.write(`${path.relative(root, out)}.mp4 (${(size / 1024).toFixed(0)} KB)\n`);
};

await main();
