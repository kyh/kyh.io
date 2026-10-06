// A self-playing three-lane endless runner drawn into a Raster's cells.

export type Kind = "train" | "barrier" | "coin";
export interface Thing {
  lane: number;
  d: number;
  kind: Kind;
  color: number;
}
export interface Game {
  time: number;
  scroll: number;
  lane: number;
  x: number;
  jump: number;
  things: Thing[];
  score: number;
  coins: number;
  crash: number;
  seed: number;
  nextSpawn: number;
}

const FAR = 16;
const RUNNER_D = 0.4;
const JUMP_SECONDS = 0.7;
const U32 = 2 ** 32;
// The terminal's default color, as a Raster cell spells it.
const DEFAULT = 0x01_00_00_00;
const TRAIN_COLORS = [0xc0_39_2b, 0x2e_6f_d8, 0xe6_7e_22, 0x8e_44_ad];
const COIN = 0xf1_c4_0f;
const WHITE = 0xff_ff_ff;
const BLACK = 0x00_00_00;

export const newGame = (seed = 7): Game => ({
  coins: 0,
  crash: 0,
  jump: -1,
  lane: 1,
  nextSpawn: 2,
  score: 0,
  scroll: 0,
  seed,
  things: [],
  time: 0,
  x: 1,
});

// A linear congruential generator, exact in doubles: the product stays under 2^53.
const rand = (g: Game) => {
  g.seed = (g.seed * 1_664_525 + 1_013_904_223) % U32;
  return g.seed / U32;
};

const hash = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43_758.5453;
  return s - Math.floor(s);
};

const channel = (color: number, shift: number) => Math.floor(color / shift) % 256;

const mix = (a: number, b: number, t: number) => {
  const c = (shift: number) =>
    Math.round(channel(a, shift) * (1 - t) + channel(b, shift) * t) * shift;
  return c(65_536) + c(256) + c(1);
};

const speedOf = (g: Game) => 6 + Math.min(g.score / 3000, 5);

const spawn = (g: Game) => {
  const blocked = rand(g) < 0.35 ? 2 : 1;
  const lanes = [0, 1, 2]
    .map((lane) => ({ lane, order: rand(g) }))
    .toSorted((a, b) => a.order - b.order)
    .map(({ lane }) => lane);
  for (const lane of lanes.slice(0, blocked)) {
    const kind: Kind = rand(g) < 0.6 ? "train" : "barrier";
    const color = TRAIN_COLORS[Math.floor(rand(g) * TRAIN_COLORS.length)] ?? COIN;
    g.things.push({ color, d: FAR, kind, lane });
  }
  const free = lanes[blocked];
  if (free !== undefined && rand(g) < 0.7) {
    for (let i = 0; i < 4; i += 1) {
      g.things.push({ color: COIN, d: FAR + i * 0.9, kind: "coin", lane: free });
    }
  }
  g.nextSpawn = 4.5 + rand(g) * 3;
};

// Nearest train ahead in a lane (barriers are jumped, so they do not block).
const danger = (g: Game, lane: number) =>
  Math.min(
    ...g.things
      .filter((t) => t.lane === lane && t.kind === "train" && t.d > RUNNER_D - 0.2)
      .map((t) => t.d),
    Number.POSITIVE_INFINITY,
  );

const coinsAhead = (g: Game, lane: number) =>
  g.things.filter((t) => t.lane === lane && t.kind === "coin" && t.d > RUNNER_D && t.d < 8).length;

const barrierAhead = (g: Game, lane: number, reach: number) =>
  g.things.some(
    (t) => t.kind === "barrier" && t.lane === lane && t.d > RUNNER_D && t.d < RUNNER_D + reach,
  );

const think = (g: Game) => {
  const value = (lane: number) =>
    Math.min(danger(g, lane), 12) * 2 +
    coinsAhead(g, lane) -
    Math.abs(lane - g.lane) * 1.5 -
    (barrierAhead(g, lane, 3) ? 3 : 0);
  let target = g.lane;
  for (const lane of [0, 1, 2]) {
    if (value(lane) > value(target)) {
      target = lane;
    }
  }
  const next = g.lane + Math.sign(target - g.lane);
  if (next !== g.lane && danger(g, next) > 1.6) {
    g.lane = next;
  }
  const reach = 0.4 + speedOf(g) * 0.2;
  const mustJump = barrierAhead(g, Math.round(g.x), reach) || barrierAhead(g, g.lane, reach);
  if (mustJump && (g.jump < 0 || g.jump > 0.6)) {
    g.jump = 0;
  }
};

export const step = (g: Game, dt: number) => {
  const moved = speedOf(g) * dt;
  g.time += dt;
  g.scroll += moved;
  g.score += moved * 10;
  g.crash = Math.max(0, g.crash - dt);
  if (g.jump >= 0) {
    g.jump += dt / JUMP_SECONDS;
    if (g.jump >= 1) {
      g.jump = -1;
    }
  }
  g.nextSpawn -= moved;
  if (g.nextSpawn <= 0) {
    spawn(g);
  }

  think(g);
  const diff = g.lane - g.x;
  g.x += Math.sign(diff) * Math.min(Math.abs(diff), dt * 9);

  const runnerLane = Math.round(g.x);
  const isAirborne = g.jump >= 0;
  g.things = g.things.filter((t) => {
    t.d -= moved;
    if (t.d < -1) {
      return false;
    }
    if (t.lane !== runnerLane || Math.abs(t.d - RUNNER_D) >= 0.35) {
      return true;
    }
    if (t.kind === "coin") {
      g.coins += 1;
      return false;
    }
    if (t.kind === "barrier" && isAirborne) {
      return true;
    }
    g.crash = 0.6;
    return false;
  });
};

// A grid of cells and the pen that writes them.
const canvas = (cols: number, rows: number) => {
  const cells = new Uint32Array(cols * rows * 3);
  const at = (x: number, y: number) => {
    const cx = Math.round(x);
    const cy = Math.round(y);
    return cx >= 0 && cx < cols && cy >= 0 && cy < rows ? (cy * cols + cx) * 3 : -1;
  };
  // Writes a glyph; with no background the cell keeps the one it has.
  const put = (x: number, y: number, ch: string, fg: number, bg?: number) => {
    const i = at(x, y);
    if (i < 0) {
      return;
    }
    cells[i] = ch.codePointAt(0) ?? 32;
    cells[i + 1] = fg;
    if (bg !== undefined) {
      cells[i + 2] = bg;
    }
  };
  const text = (x: number, y: number, s: string, fg: number, bg?: number) => {
    for (const [k, ch] of [...s].entries()) {
      put(x + k, y, ch, fg, bg);
    }
  };
  return { cells, cols, put, rows, text };
};
type Canvas = ReturnType<typeof canvas>;

// The perspective: depth `d` maps to a row, a road width and lane centers.
const view = (c: Canvas) => {
  const hy = Math.max(2, Math.floor(c.rows * 0.3));
  const ground = c.rows - hy;
  const k = (ground - 1) / (FAR + 1);
  const cx = c.cols / 2;
  const roadWidth = (t: number) => Math.min(c.cols * 0.98, c.cols * (0.1 + 0.9 * t));
  const laneX = (t: number, lane: number) => cx + (lane - 1) * (roadWidth(t) / 3);
  const tOf = (d: number) => 1 / (1 + Math.max(0, d) * k);
  const rowOf = (d: number) => hy - 1 + tOf(d) * ground;
  return { cx, ground, hy, k, laneX, roadWidth, rowOf, tOf };
};
type View = ReturnType<typeof view>;

const drawSky = (c: Canvas, v: View, g: Game) => {
  for (let y = 0; y < v.hy; y += 1) {
    const bg = mix(0x1b_14_46, 0xff_8a_4c, y / v.hy);
    for (let x = 0; x < c.cols; x += 1) {
      c.put(x, y, " ", DEFAULT, bg);
    }
  }
  const drift = g.scroll * 0.4;
  for (let x = 0; x < c.cols; x += 1) {
    const block = Math.floor((x + drift) / 5);
    const height = Math.floor(hash(block) * v.hy * 0.7);
    for (let y = v.hy - height; y < v.hy; y += 1) {
      const isLit = hash(block * 31 + y) < 0.15 && (x + Math.floor(drift)) % 2 === 0;
      c.put(x, y, isLit ? "▪" : " ", 0xff_d3_6b, 0x2a_21_40);
    }
  }
};

const groundColor = (isRoad: boolean, isStripe: boolean) => {
  if (isRoad) {
    return isStripe ? 0x7a_4a_26 : 0x5b_50_48;
  }
  return isStripe ? 0x2f_5a_2a : 0x3c_6e_33;
};

// Ties scroll toward the viewer at the speed things approach.
const drawTrack = (c: Canvas, v: View, g: Game) => {
  for (let y = v.hy; y < c.rows; y += 1) {
    const t = (y - v.hy + 1) / v.ground;
    const w = v.roadWidth(t);
    const left = v.cx - w / 2;
    const phase = (((1 / t + g.scroll * v.k) * 0.9) % 1) + 1;
    const isStripe = phase % 1 < 0.28;
    for (let x = 0; x < c.cols; x += 1) {
      c.put(x, y, " ", DEFAULT, groundColor(x >= left && x < left + w, isStripe));
    }
    for (const lane of [0, 1, 2]) {
      const lx = v.laneX(t, lane);
      c.put(lx - w / 12, y, " ", DEFAULT, 0xc9_cc_d6);
      c.put(lx + w / 12, y, " ", DEFAULT, 0xc9_cc_d6);
    }
  }
};

const trainCell = (thing: Thing, row: number, height: number, isInner: boolean) => {
  if (row === 0) {
    return mix(thing.color, WHITE, 0.3);
  }
  if (height > 3 && row === Math.floor(height / 3) && isInner) {
    return 0x9f_d3_ff;
  }
  return thing.color;
};

// Black and yellow checks.
const barrierCell = (x: number, y: number) => ((x + y) % 2 === 0 ? COIN : 0x22_22_22);

const drawThing = (c: Canvas, v: View, thing: Thing) => {
  const t = v.tOf(thing.d);
  const base = Math.round(v.rowOf(thing.d));
  const lx = v.laneX(t, thing.lane);
  const half = Math.max(0.5, (v.roadWidth(t) / 3) * 0.4);
  if (thing.kind === "coin") {
    if (half < 1.5) {
      c.put(lx, base - 1, "●", COIN);
      return;
    }
    for (let x = lx - half / 2; x <= lx + half / 2; x += 1) {
      c.put(x, base - 1, "●", 0xff_f3_b0, COIN);
    }
    return;
  }
  const scale = thing.kind === "train" ? 0.9 : 0.25;
  const height = Math.max(1, Math.round(scale * v.ground * t * 1.4));
  const top = base - height + 1;
  for (let y = top; y <= base; y += 1) {
    for (let x = Math.round(lx - half); x <= Math.round(lx + half); x += 1) {
      const bg =
        thing.kind === "barrier"
          ? barrierCell(x, y)
          : trainCell(thing, y - top, height, Math.abs(x - lx) < half - 0.5);
      c.put(x, y, " ", DEFAULT, bg);
    }
  }
};

const legsOf = (g: Game, isPaused: boolean) => {
  if (isPaused) {
    return [" ", "║", " "];
  }
  return Math.floor(g.time * 10) % 2 === 0 ? ["/", " ", "\\"] : [" ", "│", " "];
};

const drawRunner = (c: Canvas, v: View, g: Game, isPaused: boolean) => {
  const rx = v.laneX(1, g.x);
  const lift = g.jump < 0 ? 0 : Math.round(Math.sin(Math.PI * g.jump) * 3);
  const feet = c.rows - 1 - lift;
  if (lift > 0) {
    c.put(rx, c.rows - 1, "▁", 0x22_22_22);
  }
  c.text(rx - 1, feet, legsOf(g, isPaused).join(""), 0x1d_2b_53);
  c.text(rx - 1, feet - 1, "▐█▌", 0x2e_cc_71);
  c.put(rx, feet - 2, "●", 0xf5_c6_a5);
  c.put(rx + 1, feet - 2, "▀", 0xe7_4c_3c);
};

const banner = (c: Canvas, v: View, label: string, bg: number) =>
  c.text(Math.max(0, Math.floor(v.cx - label.length / 2)), Math.floor(v.hy / 2), label, WHITE, bg);

export const draw = (g: Game, cols: number, rows: number, isPaused = false): Uint32Array => {
  const c = canvas(cols, rows);
  const v = view(c);
  drawSky(c, v, g);
  drawTrack(c, v, g);
  for (const thing of g.things.toSorted((a, b) => b.d - a.d)) {
    if (thing.d <= FAR && thing.d >= -0.5) {
      drawThing(c, v, thing);
    }
  }
  drawRunner(c, v, g, isPaused);
  c.text(1, 0, `SCORE ${String(Math.floor(g.score)).padStart(6, "0")}`, WHITE);
  c.text(1, 1, `● ${g.coins}`, COIN);
  if (g.crash > 0) {
    banner(c, v, " OUCH! ", 0xc0_39_2b);
  }
  if (isPaused) {
    banner(c, v, " waiting for Claude… ", BLACK);
  }
  return c.cells;
};

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Standard padded base64 of the cells' little-endian bytes, which is how a
// Raster takes them; the hooks sandbox has no Buffer.
export const encode = (words: Uint32Array): string => {
  const bytes = new Uint8Array(words.buffer, words.byteOffset, words.byteLength);
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += 3) {
    const count = Math.min(3, bytes.length - i);
    const n = (bytes[i] ?? 0) * 65_536 + (bytes[i + 1] ?? 0) * 256 + (bytes[i + 2] ?? 0);
    for (let k = 0; k < 4; k += 1) {
      const digit = Math.floor(n / 64 ** (3 - k)) % 64;
      out.push(k <= count ? (B64[digit] ?? "=") : "=");
    }
  }
  return out.join("");
};
