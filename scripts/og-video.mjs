// Records an app's og:video: the real page, captured in headless Chromium and
// encoded to the H.264 MP4 + JPEG poster each app links from its metadata.
// Not part of `pnpm verify` or any build. Run against a server you started:
//
//   pnpm og:video kyh                    # `next build && next start -p 3100` in apps/kyh, .env set
//   pnpm og:video stonksville            # `next start -p 3004`
//   pnpm og:video autoplay               # `next start -p 3005`
//   pnpm og:video commuting-clawders     # `next start -p 3016`, local.db pushed
//   pnpm og:video kyh --date 2026-10-28 --out apps/kyh/public/og/showcase-halloween
//
// It swaps the page's clock (performance.now, Date, requestAnimationFrame and,
// where asked, timers) for one it advances a frame at a time, screenshotting
// each: headless WebGL runs on SwiftShader at a frame or two a second, and a
// stepped clock still makes a smooth 30fps clip, whatever the machine's load.
//
// Playwright isn't a dependency of the repo: it resolves from a global install
// through NODE_PATH, and only Chromium is needed. ffmpeg must be on PATH.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

const WIDTH = 1200;
const HEIGHT = 630;
const FPS = 30;

/**
 * Each app's capture: where it runs, what to show, and how long.
 * `frames` is the clip's length at 30fps; `stepMs` how far the page's clock
 * moves per frame; `skipMs` how far to run it before the clip starts; `poster` which frame is the JPEG; `clicks` where to
 * tap, and when on the stepped clock (ms from its start), to play a little; `patch` edits one JSON response.
 */
const apps = {
  autoplay: {
    // TV static barely compresses: a shorter clip and a higher crf keep it small.
    crf: 32,
    frames: 180,
    // The OFF AIR screen as production shows it: without the dev-only list of
    // keys missing from a local .env, which the session API reports here.
    out: "apps/autoplay/public/og/og",
    patch: { json: (body) => ({ ...body, missingKeys: [] }), path: "/api/session" },
    path: "/",
    poster: 30,
    skipMs: 1500,
    stepMs: 1000 / FPS,
    timers: true,
    url: "http://localhost:3005",
  },
  "commuting-clawders": {
    crf: 28,
    frames: 270,
    gl: true,
    out: "apps/commuting-clawders/public/og/og",
    path: "/",
    poster: 120,
    skipMs: 4000,
    stepMs: 1000 / FPS,
    timers: true,
    url: "http://localhost:3016",
  },
  kyh: {
    // The town's multiplayer room and analytics: a capture shouldn't join the live town.
    block: ["party.vibedgames.com", "vercel-scripts.com", "vitals.vercel-insights.com"],
    colorScheme: "light",
    crf: 32,
    // A day with no holiday, so the committed clip wears the plain theme.
    date: "2026-08-12T10:00:00-07:00",
    frames: 270,
    gl: true,
    out: "apps/kyh/public/og/showcase",
    path: "/showcase",
    poster: 269,
    skipMs: 0,
    stepMs: 50,
    url: "http://localhost:3100",
  },
  stonksville: {
    // Bets on the grid at least 15s ahead of the price: a few placed before the
    // clip starts come due inside it, a few more go down as it runs.
    clicks: [
      { atMs: 500, x: 1040, y: 330 },
      { atMs: 1500, x: 1100, y: 290 },
      { atMs: 2500, x: 1160, y: 360 },
      { atMs: 4000, x: 1160, y: 310 },
      { atMs: 13_000, x: 1100, y: 330 },
      { atMs: 15_000, x: 1160, y: 230 },
    ],
    crf: 28,
    frames: 240,
    out: "apps/stonksville/public/og/og",
    path: "/",
    poster: 200,
    skipMs: 12_000,
    stepMs: 1000 / FPS,
    timers: true,
    url: "http://localhost:3004",
  },
};

/**
 * The page's clock, swapped for one `window.__ogStep(ms)` advances: rAF
 * callbacks run only when it's stepped, and with `timers` so do setTimeout and
 * setInterval, each at the moment it falls due.
 */
const steppedClock = ({ start, timers }) => {
  const RealDate = Date;
  const base = start ?? RealDate.now();
  let elapsed = 0;
  let frames = [];
  let pending = [];
  let nextId = 1;
  class SteppedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(base + elapsed);
      } else {
        super(...args);
      }
    }
    static now() {
      return base + elapsed;
    }
  }
  window.Date = SteppedDate;
  performance.now = () => elapsed;
  window.requestAnimationFrame = (onFrame) => {
    nextId += 1;
    frames.push({ id: nextId, onFrame });
    return nextId;
  };
  window.cancelAnimationFrame = (id) => {
    frames = frames.filter((entry) => entry.id !== id);
  };
  const clear = (id) => {
    pending = pending.filter((timer) => timer.id !== id);
  };
  if (timers) {
    const schedule = (run, delay, every, args) => {
      nextId += 1;
      const wait = Math.max(0, Number(delay) || 0);
      pending.push({
        args,
        due: elapsed + wait,
        every: every ? Math.max(1, wait) : 0,
        id: nextId,
        run,
      });
      return nextId;
    };
    window.setTimeout = (run, delay, ...args) => schedule(run, delay, false, args);
    window.setInterval = (run, delay, ...args) => schedule(run, delay, true, args);
    window.clearTimeout = clear;
    window.clearInterval = clear;
  }
  /** Fire every timer due by `until`, in order, each at its own moment. */
  const runTimers = (until) => {
    for (let fired = 0; fired < 10_000; fired += 1) {
      let next = null;
      for (const timer of pending) {
        if (timer.due <= until && (!next || timer.due < next.due)) {
          next = timer;
        }
      }
      if (!next) {
        return;
      }
      elapsed = Math.max(elapsed, next.due);
      if (next.every) {
        next.due += next.every;
      } else {
        clear(next.id);
      }
      next.run(...next.args);
    }
  };
  window.__ogStep = (ms) => {
    const until = elapsed + ms;
    runTimers(until);
    elapsed = until;
    const due = frames;
    frames = [];
    for (const entry of due) {
      entry.onFrame(elapsed);
    }
  };
};

const encode = ({ crf, framesDir, out, pattern, poster }) => {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      String(FPS),
      "-i",
      path.join(framesDir, pattern),
      "-vf",
      `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "high",
      "-crf",
      String(crf),
      "-preset",
      "slow",
      "-movflags",
      "+faststart",
      "-an",
      `${out}.mp4`,
    ],
    { stdio: "inherit" },
  );
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      path.join(framesDir, pattern.replace("%04d", String(poster).padStart(4, "0"))),
      "-vf",
      `scale=${WIDTH}:${HEIGHT}`,
      "-q:v",
      "3",
      `${out}.jpg`,
    ],
    { stdio: "inherit" },
  );
};

const loadPlaywright = () => {
  try {
    return require("playwright");
  } catch {
    throw new Error(
      "Playwright isn't installed here. Point NODE_PATH at a global install (NODE_PATH=$(npm root -g)) or `npm i -g playwright`.",
    );
  }
};

const parseArgs = (argv) => {
  const [name, ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 2) {
    flags[rest[index].replace(/^--/u, "")] = rest[index + 1];
  }
  return { flags, name };
};

const main = async () => {
  const { name, flags } = parseArgs(process.argv.slice(2));
  const app = apps[name];
  if (!app) {
    throw new Error(
      `Usage: pnpm og:video <${Object.keys(apps).join("|")}> [--url] [--date] [--out]`,
    );
  }
  const url = new URL(app.path, flags.url ?? app.url).toString();
  const out = path.resolve(root, flags.out ?? app.out);
  const date = flags.date ?? app.date;
  mkdirSync(path.dirname(out), { recursive: true });
  const framesDir = mkdtempSync(path.join(tmpdir(), `og-${name}-`));

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch(
    app.gl ? { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } : {},
  );
  try {
    const context = await browser.newContext({
      colorScheme: app.colorScheme ?? "dark",
      deviceScaleFactor: 1,
      reducedMotion: "no-preference",
      viewport: { height: HEIGHT, width: WIDTH },
    });
    for (const host of app.block ?? []) {
      await context.route(
        (target) => target.hostname.endsWith(host),
        (route) => route.abort(),
      );
    }
    if (app.patch) {
      const { json, path: patched } = app.patch;
      await context.route(
        (target) => target.pathname === patched,
        async (route) => {
          const response = await route.fetch();
          await route.fulfill({ json: json(await response.json()), response });
        },
      );
    }
    await context.addInitScript(steppedClock, {
      start: date ? Date.parse(date) : null,
      timers: app.timers ?? false,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load" });

    // Let the page mount and compile its first frame before the clock moves.
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.__ogStep(0));
    await page.waitForTimeout(1000);
    let clock = 0;
    /** One step of the page's clock, tapping wherever a click falls due in it. */
    const step = async () => {
      for (const click of app.clicks ?? []) {
        if (click.atMs >= clock && click.atMs < clock + app.stepMs) {
          await page.mouse.click(click.x, click.y);
        }
      }
      clock += app.stepMs;
      await page.evaluate((ms) => window.__ogStep(ms), app.stepMs);
    };
    // Run the page up to where the clip starts, letting fetches land between steps.
    while (clock < app.skipMs) {
      await step();
      await page.waitForTimeout(10);
    }
    for (let frame = 0; frame < app.frames; frame += 1) {
      await step();
      await page.screenshot({
        path: path.join(framesDir, `f${String(frame).padStart(4, "0")}.jpg`),
        quality: 95,
        type: "jpeg",
      });
    }
    await context.close();
    encode({ crf: app.crf, framesDir, out, pattern: "f%04d.jpg", poster: app.poster });
  } finally {
    await browser.close();
    rmSync(framesDir, { force: true, recursive: true });
  }
  const { size } = statSync(`${out}.mp4`);
  process.stdout.write(`${path.relative(root, out)}.mp4 (${(size / 1024).toFixed(0)} KB)\n`);
};

await main();
