// Records an app's og:video and its JPEG poster, encoded to the H.264 MP4 each
// app links from its metadata. Not part of `pnpm verify` or any build.
//
// Three clips are the real app, captured in headless Chromium from a server
// you started:
//
//   pnpm og:video kyh [theme]            # `next dev -p 3100` in apps/kyh (window.city is dev-only), NEXT_PUBLIC_ASSETS_URL set for the pins' icons
//   pnpm og:video stonksville            # `next build && next start -p 3004` in apps/stonksville
//   pnpm og:video commuting-clawders     # `next build && next start -p 3016`, local.db pushed
//
// kyh records the /showcase opening once per theme (`classic`, the default, or
// any id in apps/kyh/src/themes): the theme picked in the dock's themes menu on
// the homepage as a visitor would, then the showcase reached by its link, so
// the town goes up in that theme from its first frame, the camera pulling back
// from downtown, and the site's logo and line come up over the finished town.
// Each goes to apps/kyh/public/og/showcase[-<theme>]. `pnpm og:video kyh all`
// records every theme in turn.
//
// A capture swaps the page's clock (performance.now, Date, requestAnimationFrame
// and, where asked, timers) for one it advances a frame at a time,
// screenshotting each: headless WebGL runs on SwiftShader at a frame or two a
// second, and a stepped clock still makes a smooth 30fps clip whatever the
// machine's load. Each clip runs a beat past its length and that beat is
// crossfaded over its opening, so it loops.
//
// Autoplay's clip is a drawn scene (scripts/og-video/autoplay.html, drawn for
// any time t), since its real page is an OFF AIR screen without keys:
//
//   pnpm og:video autoplay
//
// Playwright isn't a dependency of the repo: it resolves from a global install
// through NODE_PATH, and only Chromium is needed. ffmpeg must be on PATH.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");

const WIDTH = 1200;
const HEIGHT = 630;
const FPS = 30;
/** Frames run past the clip's end and crossfaded over its start. */
const FADE = 18;

/** The kyh themes (apps/kyh/src/themes/index.ts) and the names the themes menu gives them. */
const KYH_THEMES = {
  christmas: "Christmas",
  classic: "Light / Dark",
  easter: "Easter",
  halloween: "Halloween",
  "lunar-new-year": "Lunar New Year",
  "st-patricks": "St. Patrick's Day",
  thanksgiving: "Thanksgiving",
  valentines: "Valentine's Day",
};

/** apps/kyh/src/components/icons.tsx's Logo: the mark on its rounded square. */
const kyhLogo = () => {
  const source = readFileSync(path.join(root, "apps/kyh/src/components/icons.tsx"), "utf-8");
  const body = source.slice(source.indexOf("export const Logo"));
  const paths = [
    ...body
      .slice(0, body.indexOf(");\n"))
      .matchAll(/d="(?<d>[^"]+)"\s+transform="(?<transform>[^"]+)"/gu),
  ];
  return `<svg viewBox="0 0 1026 1026" width="100" height="100" aria-hidden="true"><rect width="1026" height="1026" rx="100" fill="var(--body-color-highlighted)"/><g fill="var(--bg-highlighted)" transform="translate(272 257)">${paths
    .map(({ groups }) => `<path d="${groups?.d}" transform="${groups?.transform}"/>`)
    .join("")}</g></svg>`;
};

/** The logo and the site's line, over the middle of the town in the theme's own colors; hidden until the frames fade it in. */
const kyhOverlay = ({ logo, line }) => {
  const city = getComputedStyle(document.querySelector(".city") ?? document.body);
  const sea = city.getPropertyValue("--city-sea").trim() || "#e7e7e7";
  const style = document.createElement("style");
  // The page's chrome (the dock, the presence avatars, the flyover buttons,
  // the dev tools) has nothing to do in a clip.
  style.textContent = `
    .fixed:has(.dock-item), div.fixed.top-6.right-6, div.fixed.top-0.left-0, .city > .absolute.top-6.left-6, nextjs-portal { display: none !important; }
    #og-mark { position: fixed; inset: 0; z-index: 50; display: grid; place-content: center; justify-items: center; gap: 24px; pointer-events: none; opacity: 0;
      background: radial-gradient(ellipse 36% 34% at 50% 52%, color-mix(in oklab, ${sea} 94%, transparent) 0%, color-mix(in oklab, ${sea} 78%, transparent) 50%, transparent 100%); }
    #og-mark svg { border-radius: 14px; box-shadow: 0 16px 36px -14px rgb(0 0 0 / 0.45); }
    #og-mark p { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.01em; color: var(--body-color-highlighted); }
  `;
  document.head.append(style);
  const mark = document.createElement("div");
  mark.id = "og-mark";
  mark.innerHTML = `${logo}<p></p>`;
  mark.querySelector("p").textContent = line;
  document.body.append(mark);
};

/** How long the logo takes to come up over the finished town (s). */
const KYH_MARK_FADE = 0.8;

/**
 * A frame of the opening. The camera is the page's own pull-back until it has
 * settled, then held where it stopped, so the flyover the town opens on
 * doesn't take it; the mark comes up as the last buildings do.
 */
const kyhFrame = ({ fade, seconds }) => {
  const { intro, view } = window.city.debug();
  window.__ogBuilt ??= intro.built;
  if (!window.__ogHeld && intro.phase === "building" && intro.clock >= intro.built - 0.25) {
    window.__ogHeld = true;
    window.city.look(view.x, view.z, view.zoom);
  }
  const shown = Math.min(1, Math.max(0, (seconds - (window.__ogBuilt - 0.5)) / fade));
  const mark = document.querySelector("#og-mark");
  if (mark instanceof HTMLElement) {
    mark.style.opacity = String(shown * shown * (3 - 2 * shown));
  }
};

const kyhCapture = (theme) => ({
  // The town's multiplayer room and analytics: a capture shouldn't join the live town.
  block: ["party.vibedgames.com", "vercel-scripts.com", "vitals.vercel-insights.com"],
  colorScheme: "light",
  crf: 33,
  frame: (page, index) => page.evaluate(kyhFrame, { fade: KYH_MARK_FADE, seconds: index / FPS }),
  // The build (about 5.5s), its last trucks driving off and the town opening
  // (to about 7.3s), then the finished town held.
  frames: 270,
  gl: true,
  out: `apps/kyh/public/og/showcase${theme === "classic" ? "" : `-${theme}`}`,
  // The homepage first: the theme's picked there, then the showcase is
  // reached by its link, so the town is built in the theme from its first frame.
  path: "/",
  // The finished town under the mark.
  poster: 255,
  prepare: async (page, step) => {
    const menu = page.locator("button[aria-haspopup=menu]:has(.dock-item)");
    await menu.waitFor({ timeout: 120_000 });
    await menu.focus();
    await page.keyboard.press("ArrowUp");
    for (let i = 0; i < 20; i += 1) {
      await step(33);
    }
    await page.evaluate((name) => {
      document.querySelector(`[role=menuitemradio][aria-label="${name}"]`)?.click();
    }, KYH_THEMES[theme]);
    // Holding the toggle is an easter egg: its confetti settles on the homepage.
    for (let i = 0; i < 180; i += 1) {
      await step(33);
    }
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.querySelector('a[href="/showcase"]')?.click());
    // The town is made as it mounts; its clock waits for the page's, so the
    // opening is still on its first frame however long that takes.
    for (let i = 0; !(await page.evaluate(() => "city" in window)); i += 1) {
      if (i > 600) {
        throw new Error("The showcase never made its town (is apps/kyh running under next dev?)");
      }
      await page.waitForTimeout(200);
    }
    await page.evaluate(kyhOverlay, { line: "Kaiyu's corner of the internet", logo: kyhLogo() });
  },
  url: "http://localhost:3100",
});

/** Where stonksville's live price dot is (page px): the brightest green on the chart's canvas at the now line. */
const stonksPriceY = () => {
  for (const canvas of document.querySelectorAll("canvas")) {
    const context = canvas.getContext("2d");
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    const column = context?.getImageData(
      Math.round(764 * scale),
      0,
      Math.round(8 * scale),
      canvas.height,
    );
    let best = { green: 100, y: null };
    const data = column?.data ?? [];
    for (let i = 0; i < data.length; i += 4) {
      const green = data[i + 1] - data[i];
      if (data[i + 3] > 200 && green > best.green) {
        best = { green, y: Math.floor(i / 4 / (column?.width ?? 1)) / scale };
      }
    }
    if (best.y !== null) {
      return best.y;
    }
  }
  return 315;
};

/** Each app's clip, as a function of nothing (kyh's of its theme). A `scene` is drawn; anything else is captured from the running app. */
const apps = {
  autoplay: () => ({
    crf: 30,
    out: "apps/autoplay/public/og/og",
    posterMs: 2600,
    scene: "autoplay",
  }),
  "commuting-clawders": () => ({
    crf: 28,
    frames: 240,
    gl: true,
    out: "apps/commuting-clawders/public/og/og",
    path: "/",
    poster: 90,
    skipMs: 6000,
    timers: true,
    url: "http://localhost:3016",
  }),
  kyh: kyhCapture,
  stonksville: () => ({
    // Bets on the grid at least 15s ahead of the price, stacked a row either
    // side of where it stands then, so it's likely to run into one: those
    // placed before the clip starts come due inside it, more go down as it runs.
    aim: (page) => page.evaluate(stonksPriceY),
    clicks: [
      ...[-24, -12, 0, 12, 24].map((dy, i) => ({ atMs: 500 + i * 50, dy, x: 1058 })),
      ...[-24, -12, 0, 12, 24].map((dy, i) => ({ atMs: 5500 + i * 50, dy, x: 1058 })),
      { atMs: 17_000, dy: 0, x: 1123 },
      { atMs: 19_000, dy: 20, x: 1123 },
    ],
    crf: 28,
    frames: 240,
    out: "apps/stonksville/public/og/og",
    path: "/",
    // Late in the clip, the bets stacked round the price.
    poster: 236,
    // Math.random seeded, so the replay opens on the same stretch each run
    // (July 1971); the intraday ticks still vary with timing.
    seed: 3,
    skipMs: 16_000,
    timers: true,
    url: "http://localhost:3004",
  }),
};

/**
 * The page's clock, swapped for one `window.__ogStep(ms)` advances: rAF
 * callbacks run only when it's stepped, and with `timers` so do setTimeout and
 * setInterval, each at the moment it falls due. With `seed`, Math.random too.
 */
const steppedClock = ({ seed, timers }) => {
  if (seed !== undefined) {
    // A seeded Math.random, so a capture replays the same draw (stonksville's start day).
    let state = seed;
    // Park and Miller's minimal standard generator.
    Math.random = () => {
      state = (state * 16_807) % 2_147_483_647;
      return (state - 1) / 2_147_483_646;
    };
  }
  const RealDate = Date;
  const base = RealDate.now();
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

const ffmpeg = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);

const H264 = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-preset", "slow"];

/**
 * Encodes `frames` frames as the clip. With `fade`, `frames + fade` were shot
 * and the last `fade` are crossfaded over the first, so the end runs into the start.
 */
const encode = ({ crf, fade = 0, frames, framesDir, out, poster }) => {
  const input = ["-framerate", String(FPS), "-i", path.join(framesDir, "f%04d.png")];
  const scale = `scale=${WIDTH}:${HEIGHT}:flags=lanczos`;
  const filter =
    fade > 0
      ? [
          "-filter_complex",
          `[0:v]${scale},split=3[a][b][c];` +
            `[a]trim=start_frame=${frames}:end_frame=${frames + fade},setpts=PTS-STARTPTS[tail];` +
            `[b]trim=end_frame=${fade},setpts=PTS-STARTPTS[head];` +
            `[c]trim=start_frame=${fade}:end_frame=${frames},setpts=PTS-STARTPTS[body];` +
            `[tail][head]blend=all_expr='A*(1-N/${fade})+B*(N/${fade})'[joined];` +
            "[joined][body]concat=n=2:v=1:a=0[v]",
          "-map",
          "[v]",
        ]
      : ["-vf", scale];
  ffmpeg([
    ...input,
    ...filter,
    ...H264,
    "-crf",
    String(crf),
    "-r",
    String(FPS),
    "-movflags",
    "+faststart",
    "-an",
    `${out}.mp4`,
  ]);
  ffmpeg([
    "-i",
    path.join(framesDir, `f${String(poster).padStart(4, "0")}.png`),
    "-vf",
    scale,
    "-q:v",
    "3",
    `${out}.jpg`,
  ]);
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

const shoot = (page, framesDir, frame) =>
  page.screenshot({
    path: path.join(framesDir, `f${String(frame).padStart(4, "0")}.png`),
    timeout: 300_000,
  });

/** Draws a scene frame by frame. */
const recordScene = async (browser, app, framesDir) => {
  const page = await browser.newPage({
    deviceScaleFactor: 2,
    viewport: { height: HEIGHT, width: WIDTH },
  });
  await page.goto(pathToFileURL(path.join(root, "scripts/og-video", `${app.scene}.html`)).href);
  const duration = await page.evaluate(async () => {
    await window.sceneReady;
    return window.scene.duration;
  });
  const frames = Math.round((duration / 1000) * FPS);
  for (let frame = 0; frame < frames; frame += 1) {
    await page.evaluate((ms) => window.scene.render(ms), (frame * 1000) / FPS);
    await shoot(page, framesDir, frame);
  }
  return { frames, poster: Math.min(frames - 1, Math.round((app.posterMs / 1000) * FPS)) };
};

/** Runs the app on the stepped clock and shoots each frame, plus the fade's. */
const recordCapture = async (browser, app, framesDir) => {
  const context = await browser.newContext({
    colorScheme: app.colorScheme ?? "dark",
    deviceScaleFactor: 2,
    reducedMotion: "no-preference",
    viewport: { height: HEIGHT, width: WIDTH },
  });
  for (const host of app.block ?? []) {
    await context.route(
      (target) => target.hostname.endsWith(host),
      (route) => route.abort(),
    );
  }
  await context.addInitScript(steppedClock, { seed: app.seed, timers: app.timers ?? false });
  const page = await context.newPage();
  await page.goto(new URL(app.path, app.url).toString(), { waitUntil: "load" });
  // Let the page mount and compile its first frame before the clock moves.
  await page.waitForTimeout(3000);
  let clock = 0;
  /** One step of the page's clock, tapping wherever a click falls due in it. */
  const step = async (ms) => {
    for (const click of app.clicks ?? []) {
      if (click.atMs >= clock && click.atMs < clock + ms) {
        await page.mouse.click(click.x, click.y ?? (await app.aim(page)) + click.dy);
      }
    }
    clock += ms;
    await page.evaluate((by) => window.__ogStep(by), ms);
  };
  await step(0);
  await page.waitForTimeout(1000);
  await app.prepare?.(page, step);
  // Run the page up to where the clip starts, letting fetches land between steps.
  while (clock < (app.skipMs ?? 0)) {
    await step(1000 / FPS);
    await page.waitForTimeout(10);
  }
  for (let frame = 0; frame < app.frames + FADE; frame += 1) {
    await app.frame?.(page, frame, app.frames);
    await step(1000 / FPS);
    await shoot(page, framesDir, frame);
  }
  await context.close();
  return { fade: FADE, frames: app.frames, poster: app.poster };
};

const record = async (name, app) => {
  const out = path.resolve(root, app.out);
  mkdirSync(path.dirname(out), { recursive: true });
  const framesDir = mkdtempSync(path.join(tmpdir(), `og-${name}-`));
  const { chromium } = loadPlaywright();
  // The scenes load the apps' own files from the checkout; WebGL runs on SwiftShader.
  let args = [];
  if (app.scene) {
    args = ["--allow-file-access-from-files"];
  } else if (app.gl) {
    args = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
  }
  const browser = await chromium.launch({ args });
  try {
    const shot = app.scene
      ? await recordScene(browser, app, framesDir)
      : await recordCapture(browser, app, framesDir);
    encode({ crf: app.crf, framesDir, out, ...shot });
  } finally {
    await browser.close();
    rmSync(framesDir, { force: true, recursive: true });
  }
  const { size } = statSync(`${out}.mp4`);
  process.stdout.write(`${path.relative(root, out)}.mp4 (${(size / 1024).toFixed(0)} KB)\n`);
};

const main = async () => {
  const [name, variant] = process.argv.slice(2);
  const entry = apps[name];
  if (!entry) {
    throw new Error(`Usage: pnpm og:video <${Object.keys(apps).join("|")}> [kyh theme|all]`);
  }
  if (name !== "kyh") {
    await record(name, entry());
    return;
  }
  const themes = variant === "all" ? Object.keys(KYH_THEMES) : [variant ?? "classic"];
  for (const theme of themes) {
    if (!(theme in KYH_THEMES)) {
      throw new Error(`No kyh theme "${theme}": ${Object.keys(KYH_THEMES).join(", ")}`);
    }
    await record(`kyh-${theme}`, kyhCapture(theme));
  }
};

await main();
