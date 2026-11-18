export type Thing =
  | { kind: "train"; lane: number; d: number; color: number; hasRamp: boolean }
  | { kind: "barrier"; lane: number; d: number }
  | { kind: "coin"; lane: number; d: number; isHigh: boolean };

export type Kind = Thing["kind"];

export interface Game {
  time: number;
  scroll: number;
  lane: number;
  x: number;
  jump: number;
  roof: number;
  things: Thing[];
  score: number;
  coins: number;
  jumps: number;
  landings: number;
  crashes: number;
  crash: number;
  seed: number;
  nextSpawn: number;
}

export const FAR = 16;
export const RUNNER_D = 0.4;
export const TRAIN_LENGTH = 3;
export const RAMP_LENGTH = 1.2;
export const JUMP_SECONDS = 0.7;
const FALL_RATE = 3.5;
const U32 = 2 ** 32;
const TRAIN_COLORS = [0xf4_f1_ea, 0x2f_b5_a5, 0xe0_47_2f, 0x6e_5b_d0];

export const newGame: (seed?: number) => Game = (seed = 7) => ({
  coins: 0,
  crash: 0,
  crashes: 0,
  jump: -1,
  jumps: 0,
  landings: 0,
  lane: 1,
  nextSpawn: 2,
  roof: 0,
  score: 0,
  scroll: 0,
  seed,
  things: [],
  time: 0,
  x: 1,
});

const rand = (g: Game) => {
  g.seed = (g.seed * 1_664_525 + 1_013_904_223) % U32;

  return g.seed / U32;
};

const speedOf = (g: Game) => 6 + Math.min(g.score / 3000, 5);

const lengthOf = (t: Thing) => (t.kind === "train" ? TRAIN_LENGTH : 0);

const coinRow = (g: Game, lane: number, d: number, isHigh: boolean) => {
  for (let i = 0; i < 4; i += 1) {
    g.things.push({ d: d + i * 0.9, isHigh, kind: "coin", lane });
  }
};

const spawn = (g: Game) => {
  const blocked = rand(g) < 0.35 ? 2 : 1;

  const lanes = [0, 1, 2]
    .map((lane) => ({ lane, order: rand(g) }))
    .toSorted((a, b) => a.order - b.order)
    .map(({ lane }) => lane);

  for (const lane of lanes.slice(0, blocked)) {
    if (rand(g) < 0.6) {
      const color = TRAIN_COLORS[Math.floor(rand(g) * TRAIN_COLORS.length)] ?? 0xff_ff_ff;
      const hasRamp = rand(g) < 0.45;
      g.things.push({ color, d: FAR, hasRamp, kind: "train", lane });

      if (hasRamp) {
        coinRow(g, lane, FAR + 0.6, true);
      }
    } else {
      g.things.push({ d: FAR, kind: "barrier", lane });
    }
  }

  const free = lanes[blocked];

  if (free !== undefined && rand(g) < 0.7) {
    coinRow(g, free, FAR, false);
  }

  g.nextSpawn = 4.5 + TRAIN_LENGTH * 0.5 + rand(g) * 3;
};

const support = (g: Game, lane: number) => {
  let height = 0;
  let isRamped = false;

  for (const t of g.things) {
    if (t.kind !== "train" || t.lane !== lane) {
      continue;
    }

    const isUp = t.hasRamp && RUNNER_D - t.d < RAMP_LENGTH;

    if (t.d <= RUNNER_D && RUNNER_D <= t.d + TRAIN_LENGTH) {
      return { height: 1, isRamped: isUp };
    }

    if (t.hasRamp && t.d - RAMP_LENGTH <= RUNNER_D && RUNNER_D < t.d) {
      height = Math.max(height, (RUNNER_D - (t.d - RAMP_LENGTH)) / RAMP_LENGTH);
      isRamped = true;
    }
  }

  return { height, isRamped };
};

const climb = (g: Game, lane: number, dt: number) => {
  const { height, isRamped } = support(g, lane);

  if (height > g.roof + 0.3 && !isRamped) {
    return;
  }

  const wasFalling = g.roof > height;
  g.roof = height >= g.roof ? height : Math.max(height, g.roof - dt * FALL_RATE);

  if (wasFalling && g.roof === height && g.jump < 0) {
    g.landings += 1;
  }
};

const isOnRoof = (g: Game) => g.roof > 0.9;

const danger = (g: Game, lane: number) => {
  if (isOnRoof(g)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(
    ...g.things
      .filter(
        (t) =>
          t.kind === "train" &&
          t.lane === lane &&
          t.d + TRAIN_LENGTH > RUNNER_D - 0.2 &&
          !(t.hasRamp && t.d > RUNNER_D + 0.3),
      )
      .map((t) => t.d),
    Number.POSITIVE_INFINITY,
  );
};

const rampAhead = (g: Game, lane: number) =>
  g.things.some(
    (t) => t.kind === "train" && t.hasRamp && t.lane === lane && t.d > RUNNER_D + 0.3 && t.d < 8,
  );

const coinsAhead = (g: Game, lane: number) =>
  g.things.filter((t) => t.lane === lane && t.kind === "coin" && t.d > RUNNER_D && t.d < 8).length;

const barrierAhead = (g: Game, lane: number, reach: number) =>
  g.roof < 0.5 &&
  g.things.some(
    (t) => t.kind === "barrier" && t.lane === lane && t.d > RUNNER_D && t.d < RUNNER_D + reach,
  );

const think = (g: Game) => {
  const value = (lane: number) =>
    Math.min(danger(g, lane), 12) * 2 +
    coinsAhead(g, lane) +
    (rampAhead(g, lane) ? 4 : 0) +
    (isOnRoof(g) ? support(g, lane).height * 6 : 0) -
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
    g.jumps += 1;
  }
};

const touches = (t: Thing) => {
  if (t.kind === "train") {
    const front = t.hasRamp ? 0 : 0.35;

    return t.d - front < RUNNER_D && RUNNER_D < t.d + TRAIN_LENGTH;
  }

  return Math.abs(t.d - RUNNER_D) < 0.35;
};

const meet = (g: Game, t: Thing, isAirborne: boolean) => {
  if (t.kind === "coin") {
    if (t.isHigh !== g.roof > 0.5) {
      return true;
    }

    g.coins += 1;

    return false;
  }

  if (t.kind === "barrier" && (isAirborne || g.roof > 0.5)) {
    return true;
  }

  if (t.kind === "train" && g.roof > 0.85) {
    return true;
  }

  g.crash = 0.6;
  g.crashes += 1;

  return false;
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
      g.landings += 1;
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

  for (const t of g.things) {
    t.d -= moved;
  }

  climb(g, runnerLane, dt);
  g.things = g.things.filter((t) => {
    if (t.d + lengthOf(t) < -1) {
      return false;
    }

    if (t.lane !== runnerLane || !touches(t)) {
      return true;
    }

    return meet(g, t, isAirborne);
  });
};
