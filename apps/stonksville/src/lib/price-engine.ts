import type { DailyBar } from "./spx-data";

export interface PricePoint {
  time: number;
  price: number;
}

export interface ReplayConfig {
  /** Wall-clock ms one trading day plays for — one chart grid cell */
  dayMs: number;
  /** Tick interval in ms; must divide dayMs */
  tickInterval: number;
  /** Seconds of ticks generated before the first live tick */
  historySeconds: number;
  /** Seconds of ticks retained */
  retainSeconds: number;
}

const DEFAULT_CONFIG: ReplayConfig = {
  dayMs: 5000,
  historySeconds: 60,
  retainSeconds: 300,
  tickInterval: 100,
};

const PATH_CACHE_RADIUS = 30;
const WIGGLE = 0.4;
const FLAT_DAY_RANGE = 0.004;

const LCG_MODULUS = 2_147_483_647;
const LCG_MULTIPLIER = 48_271;

const seededRandom = (seed: number) => {
  let state = (Math.abs(Math.trunc(seed)) % (LCG_MODULUS - 1)) + 1;

  return () => {
    state = (state * LCG_MULTIPLIER) % LCG_MODULUS;

    return state / LCG_MODULUS;
  };
};

const gaussian = (random: () => number) => {
  let u = 0;

  while (u === 0) {
    u = random();
  }

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
};

const bridge = (
  out: number[],
  offset: number,
  from: number,
  to: number,
  steps: number,
  sigma: number,
  random: () => number,
) => {
  if (steps <= 0) {
    out[offset] = to;

    return;
  }

  const walk = Array.from({ length: steps + 1 }, () => 0);

  for (let k = 1; k <= steps; k += 1) {
    walk[k] = walk[k - 1] + sigma * gaussian(random);
  }

  const end = walk[steps];

  for (let k = 0; k <= steps; k += 1) {
    const frac = k / steps;
    out[offset + k] = from + (to - from) * frac + (walk[k] - end * frac);
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Synthesize one trading day's tick path from its bar: open → one extreme →
 * the other extreme → close, each leg a Brownian bridge, clamped to the day's
 * real high/low. Every level between low and high is crossed, so whether a
 * price was "touched" on a day is decided by the real data — only the shape
 * of the wander inside the range is made up.
 */
export const buildDayPath = (bar: DailyBar, steps: number, seed: number) => {
  const random = seededRandom(seed);
  const realRange = bar.high - bar.low;
  const range = realRange > 0 ? realRange : bar.close * FLAT_DAY_RANGE;
  const sigma = (range * WIGGLE) / Math.sqrt(steps);
  const slack = bar.hasRange ? 0 : range * 0.5;
  const low = bar.low - slack;
  const high = bar.high + slack;

  const highFirst = random() < 0.5;
  const first = highFirst ? bar.high : bar.low;
  const second = highFirst ? bar.low : bar.high;
  const i1 = first === bar.open ? 0 : Math.round(steps * (0.12 + random() * 0.33));
  const i2 = second === bar.close ? steps : Math.round(steps * (0.55 + random() * 0.33));

  const path = Array.from({ length: steps + 1 }, () => 0);
  bridge(path, 0, bar.open, first, i1, sigma, random);
  bridge(path, i1, first, second, i2 - i1, sigma, random);
  bridge(path, i2, second, bar.close, steps - i2, sigma, random);

  for (let k = 0; k <= steps; k += 1) {
    path[k] = clamp(path[k], low, high);
  }

  return path;
};

/**
 * Replays S&P 500 daily history as a live tick feed: each bar plays for
 * `dayMs` of wall-clock time, its ticks sampled from a synthetic intraday
 * path through the real open/high/low/close. Ticks sit on a fixed grid
 * (`epoch + n * tickInterval`) so day boundaries land on chart grid cells
 * and missed intervals (background tabs) are back-filled, never skipped.
 */
export class ReplayEngine {
  private readonly bars: DailyBar[];
  private readonly config: ReplayConfig;
  private readonly stepsPerDay: number;
  private readonly startIndex: number;
  private epoch = 0;
  private history: PricePoint[] = [];
  private lastTick = 0;
  private currentPrice: number;
  private readonly paths = new Map<number, number[]>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly listeners = new Set<(point: PricePoint) => void>();

  constructor(bars: DailyBar[], startIndex: number, config: Partial<ReplayConfig> = {}) {
    if (bars.length === 0) {
      throw new Error("ReplayEngine needs at least one bar");
    }

    this.bars = bars;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stepsPerDay = Math.max(1, Math.round(this.config.dayMs / this.config.tickInterval));
    this.startIndex = this.wrap(startIndex);
    this.currentPrice = bars[this.startIndex].open;
  }

  subscribe(listener: (point: PricePoint) => void) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  start() {
    if (this.intervalId) {
      return;
    }

    const { dayMs, tickInterval, historySeconds } = this.config;
    const now = Date.now();
    const half = dayMs / 2;
    this.epoch = Math.floor((now - half) / dayMs) * dayMs + half;

    for (let t = this.gridTime(now - historySeconds * 1000); t <= now; t += tickInterval) {
      this.push(t, false);
    }

    this.intervalId = setInterval(() => {
      this.advance();
    }, tickInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private advance() {
    const { tickInterval, retainSeconds, historySeconds } = this.config;
    const now = Date.now();

    if (now - this.lastTick > retainSeconds * 1000) {
      this.history = [];
      this.lastTick = this.gridTime(now - historySeconds * 1000) - tickInterval;
    }

    for (let t = this.lastTick + tickInterval; t <= now; t += tickInterval) {
      this.push(t, true);
    }
  }

  private push(time: number, notify: boolean) {
    const price = this.priceAt(time);
    this.currentPrice = price;
    this.lastTick = time;
    const point: PricePoint = { price, time };
    this.history.push(point);

    const cutoff = time - this.config.retainSeconds * 1000;

    if (this.history[0].time < cutoff) {
      let trimCount = 0;

      while (trimCount < this.history.length && this.history[trimCount].time < cutoff) {
        trimCount += 1;
      }

      this.history.splice(0, trimCount);
    }

    if (notify) {
      for (const listener of this.listeners) {
        listener(point);
      }
    }
  }

  private gridTime(time: number) {
    const { tickInterval } = this.config;

    return this.epoch + Math.ceil((time - this.epoch) / tickInterval) * tickInterval;
  }

  private wrap(index: number) {
    const n = this.bars.length;

    return ((index % n) + n) % n;
  }

  private pathFor(index: number) {
    const cached = this.paths.get(index);

    if (cached) {
      return cached;
    }

    const bar = this.bars[index];
    const path = buildDayPath(bar, this.stepsPerDay, Math.floor(bar.date / 86_400_000));
    this.paths.set(index, path);

    if (this.paths.size > PATH_CACHE_RADIUS * 2) {
      for (const key of this.paths.keys()) {
        if (Math.abs(key - index) > PATH_CACHE_RADIUS) {
          this.paths.delete(key);
        }
      }
    }

    return path;
  }

  /** Bar index playing at wall-clock `time` */
  indexAt(time: number) {
    return this.wrap(this.startIndex + Math.floor((time - this.epoch) / this.config.dayMs));
  }

  /** The trading day playing at wall-clock `time` */
  barAt(time: number) {
    return this.bars[this.indexAt(time)];
  }

  /** Price at any wall-clock instant — pure, so ticks can be back-filled */
  priceAt(time: number) {
    const { dayMs } = this.config;
    const rel = time - this.epoch;
    const dayOffset = Math.floor(rel / dayMs);
    const frac = (rel - dayOffset * dayMs) / dayMs;
    const path = this.pathFor(this.wrap(this.startIndex + dayOffset));
    const pos = frac * this.stepsPerDay;
    const i = Math.min(Math.floor(pos), this.stepsPerDay);
    const next = Math.min(i + 1, this.stepsPerDay);

    return path[i] + (path[next] - path[i]) * (pos - i);
  }

  /** Returns the internal array directly — do not mutate. */
  getHistoryRaw() {
    return this.history;
  }

  getCurrentPrice() {
    return this.currentPrice;
  }

  getCurrentBar() {
    return this.lastTick === 0 ? this.bars[this.startIndex] : this.barAt(this.lastTick);
  }
}
