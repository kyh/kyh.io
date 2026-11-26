import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";

interface CityDebug {
  intro: { built: number; clock: number; phase: string };
  view: { x: number; z: number; zoom: number };
}

declare global {
  interface Window {
    __ogBuilt?: number;
    __ogHeld?: boolean;
    __ogStep: (ms: number) => void;
    city: { debug: () => CityDebug; look: (x: number, z: number, zoom: number) => void };
    scene: { duration: number; render: (ms: number) => void };
    sceneReady: Promise<unknown>;
  }
}

type Step = (ms: number) => Promise<void>;

interface Click {
  atMs: number;
  dy: number;
  x: number;
  y?: number;
}

interface SceneApp {
  crf: number;
  out: string;
  posterMs: number;
  scene: string;
}

interface CaptureApp {
  aim?: (page: Page) => Promise<number>;
  block?: string[];
  clicks?: Click[];
  colorScheme?: "dark" | "light";
  crf: number;
  frame?: (page: Page, index: number) => Promise<void>;
  frames: number;
  gl?: boolean;
  out: string;
  path: string;
  poster: number;
  prepare?: (page: Page, step: Step) => Promise<void>;
  seed?: number;
  skipMs?: number;
  timers?: boolean;
  url: string;
}

type App = CaptureApp | SceneApp;

type Run<T> = (item: T, index: number) => Promise<void>;

const drain: <T>(each: Iterator<T>, run: Run<T>, index: number) => Promise<void> = async (
  each,
  run,
  index,
) => {
  const next = each.next();

  if (next.done === true) {
    return;
  }

  await run(next.value, index);
  await drain(each, run, index + 1);
};

const inOrder = async <T>(items: Iterable<T>, run: Run<T>) => {
  await drain(items[Symbol.iterator](), run, 0);
};

const times = (count: number) => Array.from({ length: count }, (_, index) => index);

const root = path.resolve(import.meta.dirname, "..");

const WIDTH = 1200;
const HEIGHT = 630;
const FPS = 30;
const FADE = 18;

const KYH_THEMES = new Map([
  ["christmas", "Christmas"],
  ["classic", "Light / Dark"],
  ["easter", "Easter"],
  ["halloween", "Halloween"],
  ["lunar-new-year", "Lunar New Year"],
  ["st-patricks", "St. Patrick's Day"],
  ["thanksgiving", "Thanksgiving"],
  ["valentines", "Valentine's Day"],
]);

const kyhLogo = () => {
  const source = readFileSync(path.join(root, "apps/kyh/src/components/icons.tsx"), "utf-8");
  const body = source.slice(source.indexOf("export const Logo"));

  const paths = [
    ...body
      .slice(0, body.indexOf(");\n"))
      .matchAll(/d="(?<d>[^"]+)"\s+transform="(?<transform>[^"]+)"/gu),
  ];

  return `<svg viewBox="0 0 1026 1026" width="100" height="100" aria-hidden="true"><rect width="1026" height="1026" rx="100" fill="var(--body-color-highlighted)"/><g fill="var(--bg-highlighted)" transform="translate(272 257)">${paths
    .map(({ groups }) => `<path d="${groups?.d ?? ""}" transform="${groups?.transform ?? ""}"/>`)
    .join("")}</g></svg>`;
};

const kyhOverlay = ({ logo, line }: { line: string; logo: string }) => {
  const city = getComputedStyle(document.querySelector(".city") ?? document.body);
  const seaColor = city.getPropertyValue("--city-sea").trim();
  const sea = seaColor === "" ? "#e7e7e7" : seaColor;
  const style = document.createElement("style");
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
  const caption = mark.querySelector("p");

  if (caption !== null) {
    caption.textContent = line;
  }

  document.body.append(mark);
};

const KYH_MARK_FADE = 0.8;

const kyhFrame = ({ fade, seconds }: { fade: number; seconds: number }) => {
  const { intro, view } = window.city.debug();
  window.__ogBuilt ??= intro.built;
  const built = window.__ogBuilt;

  if (window.__ogHeld !== true && intro.phase === "building" && intro.clock >= intro.built - 0.25) {
    window.__ogHeld = true;
    window.city.look(view.x, view.z, view.zoom);
  }

  const shown = Math.min(1, Math.max(0, (seconds - (built - 0.5)) / fade));
  const mark = document.querySelector("#og-mark");

  if (mark instanceof HTMLElement) {
    mark.style.opacity = String(shown * shown * (3 - 2 * shown));
  }
};

const kyhCapture = (theme: string) =>
  ({
    block: ["party.vibedgames.com", "vercel-scripts.com", "vitals.vercel-insights.com"],
    colorScheme: "light",
    crf: 33,
    frame: async (page, index) => {
      await page.evaluate(kyhFrame, { fade: KYH_MARK_FADE, seconds: index / FPS });
    },
    frames: 270,
    gl: true,
    out: `apps/kyh/public/og/showcase${theme === "classic" ? "" : `-${theme}`}`,
    path: "/",
    poster: 255,
    prepare: async (page, step) => {
      const menu = page.locator("button[aria-haspopup=menu]:has(.dock-item)");
      await menu.waitFor({ timeout: 120_000 });
      await menu.focus();
      await page.keyboard.press("ArrowUp");
      await inOrder(times(20), async () => {
        await step(33);
      });

      await page.evaluate(
        (name) => {
          document
            .querySelector<HTMLElement>(`[role=menuitemradio][aria-label="${name}"]`)
            ?.click();
        },
        KYH_THEMES.get(theme) ?? "",
      );

      await inOrder(times(180), async () => {
        await step(33);
      });

      await page.mouse.move(0, 0);
      await page.evaluate(() => {
        document.querySelector<HTMLElement>('a[href="/showcase"]')?.click();
      });

      try {
        await page.waitForFunction(() => "city" in window, null, {
          polling: 200,
          timeout: 120_000,
        });
      } catch (error) {
        throw new Error("The showcase never made its town (is apps/kyh running under next dev?)", {
          cause: error,
        });
      }

      await page.evaluate(kyhOverlay, { line: "Kaiyu's corner of the internet", logo: kyhLogo() });
    },
    url: "http://localhost:3100",
  }) satisfies CaptureApp;

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

    const data = column?.data ?? new Uint8ClampedArray();

    const [best] = Array.from({ length: data.length / 4 }, (_, pixel) => ({
      alpha: data[pixel * 4 + 3] ?? 0,
      green: (data[pixel * 4 + 1] ?? 0) - (data[pixel * 4] ?? 0),
      y: Math.floor(pixel / (column?.width ?? 1)) / scale,
    }))
      .filter(({ alpha, green }) => alpha > 200 && green > 100)
      .toSorted((a, b) => b.green - a.green);

    if (best !== undefined) {
      return best.y;
    }
  }

  return 315;
};

const apps = new Map<string, (theme: string) => App>([
  [
    "autoplay",
    () => ({
      crf: 30,
      out: "apps/autoplay/public/og/og",
      posterMs: 2600,
      scene: "autoplay",
    }),
  ],
  [
    "commuting-clawders",
    () => ({
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
  ],
  ["kyh", kyhCapture],
  [
    "stonksville",
    () => ({
      aim: async (page) => await page.evaluate(stonksPriceY),
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
      poster: 236,
      seed: 3,
      skipMs: 16_000,
      timers: true,
      url: "http://localhost:3004",
    }),
  ],
]);

type Callback = (...args: unknown[]) => void;

interface PendingTimer {
  args: unknown[];
  due: number;
  every: number;
  id: number;
  run: Callback;
}

const steppedClock = ({ seed, timers }: { seed: number | undefined; timers: boolean }) => {
  if (seed !== undefined) {
    let state = seed;
    Math.random = () => {
      state = (state * 16_807) % 2_147_483_647;

      return (state - 1) / 2_147_483_646;
    };
  }

  const RealDate = Date;
  const base = RealDate.now();
  let elapsed = 0;
  let frames: { id: number; onFrame: FrameRequestCallback }[] = [];
  let pending: PendingTimer[] = [];
  let nextId = 1;

  type Parts = [
    year: number,
    monthIndex: number,
    date?: number,
    hours?: number,
    minutes?: number,
    seconds?: number,
    ms?: number,
  ];

  class SteppedDate extends RealDate {
    constructor(...args: [] | [value: number | string | Date] | Parts) {
      if (args.length === 0) {
        super(base + elapsed);
      } else if (args.length === 1) {
        super(args[0]);
      } else {
        const [year, monthIndex, ...rest] = args;
        super(year, monthIndex, ...rest);
      }
    }

    static override now() {
      return base + elapsed;
    }
  }

  Object.assign(window, { Date: SteppedDate });
  performance.now = () => elapsed;
  window.requestAnimationFrame = (onFrame) => {
    nextId += 1;
    frames.push({ id: nextId, onFrame });

    return nextId;
  };

  window.cancelAnimationFrame = (id) => {
    frames = frames.filter((entry) => entry.id !== id);
  };

  const clear = (id?: number) => {
    pending = pending.filter((timer) => timer.id !== id);
  };

  if (timers) {
    const schedule = (
      run: Callback,
      delay: number | undefined,
      every: boolean,
      args: unknown[],
    ) => {
      nextId += 1;
      const requested = Number(delay);
      const wait = Math.max(0, Number.isNaN(requested) ? 0 : requested);
      pending.push({
        args,
        due: elapsed + wait,
        every: every ? Math.max(1, wait) : 0,
        id: nextId,
        run,
      });

      return nextId;
    };

    Object.assign(window, {
      clearInterval: clear,
      clearTimeout: clear,
      setInterval: (run: Callback, delay?: number, ...args: unknown[]) =>
        schedule(run, delay, true, args),
      setTimeout: (run: Callback, delay?: number, ...args: unknown[]) =>
        schedule(run, delay, false, args),
    });
  }

  const runTimers = (until: number) => {
    for (let fired = 0; fired < 10_000; fired += 1) {
      let next: PendingTimer | null = null;

      for (const timer of pending) {
        if (timer.due <= until && (next === null || timer.due < next.due)) {
          next = timer;
        }
      }

      if (next === null) {
        return;
      }

      elapsed = Math.max(elapsed, next.due);

      if (next.every > 0) {
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

const ffmpeg = (args: string[]) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);

const H264 = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-preset", "slow"];

interface Encode {
  crf: number;
  fade?: number;
  frames: number;
  framesDir: string;
  out: string;
  poster: number;
}

const encode = ({ crf, fade = 0, frames, framesDir, out, poster }: Encode) => {
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

const shoot = async (page: Page, framesDir: string, frame: number) =>
  await page.screenshot({
    path: path.join(framesDir, `f${String(frame).padStart(4, "0")}.png`),
    timeout: 300_000,
  });

const recordScene = async (browser: Browser, app: SceneApp, framesDir: string) => {
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

  await inOrder(times(frames), async (frame) => {
    await page.evaluate(
      (ms) => {
        window.scene.render(ms);
      },
      (frame * 1000) / FPS,
    );
    await shoot(page, framesDir, frame);
  });

  return { frames, poster: Math.min(frames - 1, Math.round((app.posterMs / 1000) * FPS)) };
};

const recordCapture = async (browser: Browser, app: CaptureApp, framesDir: string) => {
  const context = await browser.newContext({
    colorScheme: app.colorScheme ?? "dark",
    deviceScaleFactor: 2,
    reducedMotion: "no-preference",
    viewport: { height: HEIGHT, width: WIDTH },
  });

  await Promise.all(
    (app.block ?? []).map(
      async (host) =>
        await context.route(
          (target) => target.hostname.endsWith(host),
          async (route) => {
            await route.abort();
          },
        ),
    ),
  );

  await context.addInitScript(steppedClock, { seed: app.seed, timers: app.timers ?? false });
  const page = await context.newPage();
  await page.goto(new URL(app.path, app.url).toString(), { waitUntil: "load" });
  await page.waitForTimeout(3000);
  let clock = 0;

  const aim = async (click: Click) => click.y ?? (await (app.aim?.(page) ?? 0)) + click.dy;

  const step: Step = async (ms) => {
    const due = (app.clicks ?? []).filter(
      (click) => click.atMs >= clock && click.atMs < clock + ms,
    );

    await inOrder(due, async (click) => {
      await page.mouse.click(click.x, await aim(click));
    });

    clock += ms;
    await page.evaluate((by) => {
      window.__ogStep(by);
    }, ms);
  };

  const skip: (until: number) => Promise<void> = async (until) => {
    if (clock >= until) {
      return;
    }

    await step(1000 / FPS);
    await page.waitForTimeout(10);
    await skip(until);
  };

  await step(0);
  await page.waitForTimeout(1000);
  await app.prepare?.(page, step);

  await skip(app.skipMs ?? 0);

  await inOrder(times(app.frames + FADE), async (frame) => {
    await app.frame?.(page, frame);
    await step(1000 / FPS);
    await shoot(page, framesDir, frame);
  });

  await context.close();

  return { fade: FADE, frames: app.frames, poster: app.poster };
};

const record = async (name: string, app: App) => {
  const out = path.resolve(root, app.out);
  mkdirSync(path.dirname(out), { recursive: true });
  const framesDir = mkdtempSync(path.join(tmpdir(), `og-${name}-`));
  let args: string[] = [];

  if ("scene" in app) {
    args = ["--allow-file-access-from-files"];
  } else if (app.gl === true) {
    args = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
  }

  const browser = await chromium.launch({ args });

  try {
    const shot =
      "scene" in app
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
  const [name = "", variant] = process.argv.slice(2);
  const entry = apps.get(name);

  if (entry === undefined) {
    throw new Error(`Usage: pnpm og:video <${[...apps.keys()].join("|")}> [kyh theme|all]`);
  }

  if (name !== "kyh") {
    await record(name, entry(""));

    return;
  }

  const themes = variant === "all" ? [...KYH_THEMES.keys()] : [variant ?? "classic"];

  await inOrder(themes, async (theme) => {
    if (!KYH_THEMES.has(theme)) {
      throw new Error(`No kyh theme "${theme}": ${[...KYH_THEMES.keys()].join(", ")}`);
    }

    await record(`kyh-${theme}`, kyhCapture(theme));
  });
};

await main();
