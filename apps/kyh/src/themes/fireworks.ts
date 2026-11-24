import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";

/** Seconds between launches, at least and at most. */
export const WAIT = [0.9, 2.2] as const;

/** At most this many rockets climbing at once. */
export const ROCKETS = 2;

/** Sparks a burst throws, at least and at most. */
export const SPARKS = [34, 54] as const;

/** How many colors a burst may be. */
export const COLORS = 4;

const GRAVITY = 420;
const SPARK_GRAVITY = 70;
const DRAG = 1.9;
const SPEED = [190, 300] as const;
const LIFE = [1.1, 1.9] as const;
const RISE = [0.4, 0.7] as const;
const SPREAD = [0.15, 0.85] as const;
const SCREEN = 900;

export interface Mover {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
}

export interface Spark extends Mover {
  age: number;
  life: number;
}

export interface Sky {
  rockets: Mover[];
  sparks: Spark[];
  /** Seconds until the next launch. */
  wait: number;
  random: Random;
}

/** An empty sky, its first rocket soon. */
export const createSky = (seed = 1) => {
  const random = createRandom(seed);

  const sky: Sky = { random, rockets: [], sparks: [], wait: random.range(0.2, 0.8) };

  return sky;
};

const scaleOf = (height: number) => Math.min(1, Math.max(0.5, height / SCREEN));

const launch = (sky: Sky, width: number, height: number) => {
  const { random } = sky;
  const rise = height * random.range(...RISE);

  sky.rockets.push({
    color: random.int(0, COLORS),
    vx: random.range(-30, 30) * scaleOf(height),
    vy: -Math.sqrt(2 * GRAVITY * rise),
    x: width * random.range(...SPREAD),
    y: height,
  });
};

const burst = (sky: Sky, rocket: Mover, height: number) => {
  const { random } = sky;
  const count = random.int(...SPARKS);
  const speed = random.range(...SPEED) * scaleOf(height);
  const twist = random.range(0, Math.PI * 2);

  for (let index = 0; index < count; index += 1) {
    const angle = twist + (index / count) * Math.PI * 2 + random.range(-0.08, 0.08);
    const pace = speed * random.range(0.72, 1);

    sky.sparks.push({
      age: 0,
      color: rocket.color,
      life: random.range(...LIFE),
      vx: Math.cos(angle) * pace,
      vy: Math.sin(angle) * pace,
      x: rocket.x,
      y: rocket.y,
    });
  }
};

/** The sky a moment on: rockets climb and burst at the top of their climb, sparks slow, fall and fade, and the next goes up when its wait is over. */
export const stepSky = (sky: Sky, seconds: number, width: number, height: number) => {
  const dt = Math.min(seconds, 1 / 20);
  sky.wait -= dt;

  if (sky.wait <= 0) {
    sky.wait = sky.random.range(...WAIT);

    if (sky.rockets.length < ROCKETS) {
      launch(sky, width, height);
    }
  }

  const climbing: Mover[] = [];

  for (const rocket of sky.rockets) {
    rocket.vy += GRAVITY * dt;
    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;

    if (rocket.vy >= 0) {
      burst(sky, rocket, height);
    } else {
      climbing.push(rocket);
    }
  }

  sky.rockets = climbing;
  const slow = Math.exp(-DRAG * dt);

  sky.sparks = sky.sparks.filter((spark) => {
    spark.age += dt;
    spark.vx *= slow;
    spark.vy = spark.vy * slow + SPARK_GRAVITY * dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;

    return spark.age < spark.life;
  });

  return sky;
};

/** How much of a spark is left to see: whole at first, fading out faster toward its end. */
export const glowOf = ({ age, life }: Spark) => Math.max(0, 1 - (age / life) ** 2);
