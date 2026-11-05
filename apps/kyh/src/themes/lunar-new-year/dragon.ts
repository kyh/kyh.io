// The dragon that follows a mouse about at Lunar New Year, for
// `follower.tsx`: a festival dragon, a long red body of segments behind a
// maned and horned head. The head swims after the mouse, weaving side to
// side as a dancing dragon's does, and each segment follows the one before
// it at arm's length, so the body snakes after. When the mouse rests, the
// mouse is the pearl a dragon chases: it circles it, round and round, now
// and then snapping at it; left long enough, it slows and dozes. A click on
// its head and it roars a greeting; a click elsewhere and it lunges at it.
// In the screen's pixels, +y down; the paths are about its head. Pure
// (state is stepped in place, for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Creature, Part, Pose } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Point } from "../follower/walk";
import { point, round } from "../art";
import { createEmotes, say, stepEmotes } from "../follower/emote";
import { approach, degrees, turnBack } from "../follower/walk";

export const SEGMENTS = 18;
/** Pixels between one segment and the next. */
const SPACING = 6.5;

export interface Dragon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Which way its head points (radians), and which way up it's drawn (-1 belly up, mid-turn between). */
  heading: number;
  upright: number;
  /** Its body, head end first. */
  body: Point[];
  /** Which way from the pointer it swims, and how far round the pearl it's got. */
  back: Point;
  orbit: number;
  still: number;
  time: number;
  /** 0 to 1: its jaw open, and dozing. */
  jaw: number;
  doze: number;
  /** Seconds yet of a roar or a snap, holding its jaw open. */
  roar: number;
  emotes: Emotes;
  random: Random;
}

const GREETING = ["新年快乐!", "恭喜发财!", "Happy Lunar New Year!", "Gong hei fat choy!"];
const LUNGE = ["rawr!", "*snap*"];
const CHATTER = ["*rawr*", "红包?", "Happy New Year!", "the pearl is mine!"];
const SLEEP = ["z z z"];

const BEHIND = 40;
/** How far round the pearl it circles, and how fast (radians a second). */
const ORBIT = 50;
const ORBIT_SPEED = 1.7;
const PULL = 26;
const DAMP = 6;
const MOST_PULL = 3200;
/** Its weave: how far to either side, and how fast. */
const WEAVE = 12;
const WEAVE_RATE = 5;
const CHASE_S = 1.2;
const DOZE_S = 30;
const MOST_STEP = 0.05;

export const createDragon = (at: Point): Dragon => {
  const seed = Math.round(at.x * 7919 + at.y * 7);
  const x = at.x - BEHIND;
  const { y } = at;
  return {
    back: { x: -1, y: 0 },
    body: Array.from({ length: SEGMENTS }, (_, index) => ({ x: x - (index + 1) * SPACING, y })),
    doze: 0,
    emotes: createEmotes(seed),
    heading: 0,
    jaw: 0,
    orbit: Math.PI,
    random: createRandom(seed + 1),
    roar: 0,
    still: 0,
    time: 0,
    upright: 1,
    vx: 0,
    vy: 0,
    x,
    y,
  };
};

const turnFrom = (dragon: Dragon, moved: Point) => {
  if (Math.hypot(moved.x, moved.y) <= 0.5) {
    return;
  }
  dragon.back = turnBack(dragon.back, moved, 60);
  // Picking up the circle where it's got to, when it next chases the pearl.
  dragon.orbit = Math.atan2(dragon.back.y, dragon.back.x);
};

/** Where its head's going: behind the pointer, weaving; or round it, chasing the pearl. */
const goalOf = (dragon: Dragon, pointer: Point, dt: number): Point => {
  if (dragon.still > CHASE_S) {
    dragon.orbit += dt * ORBIT_SPEED * (1 - dragon.doze * 0.9);
    return {
      x: pointer.x + Math.cos(dragon.orbit) * ORBIT,
      y: pointer.y + Math.sin(dragon.orbit) * ORBIT * 0.7,
    };
  }
  const speed = Math.hypot(dragon.vx, dragon.vy);
  const weave = Math.sin(dragon.time * WEAVE_RATE) * WEAVE * Math.min(1, speed / 200);
  const across = speed > 1 ? { x: -dragon.vy / speed, y: dragon.vx / speed } : { x: 0, y: 0 };
  return {
    x: pointer.x + dragon.back.x * BEHIND + across.x * weave,
    y: pointer.y + dragon.back.y * BEHIND + across.y * weave,
  };
};

/** Each segment kept at arm's length from the one before it, so the body snakes after the head. */
const follow = (dragon: Dragon) => {
  let ahead: Point = dragon;
  for (const segment of dragon.body) {
    const dx = segment.x - ahead.x;
    const dy = segment.y - ahead.y;
    const reach = Math.hypot(dx, dy) || 1;
    segment.x = ahead.x + (dx / reach) * SPACING;
    segment.y = ahead.y + (dy / reach) * SPACING;
    ahead = segment;
  }
};

export const stepDragon = (dragon: Dragon, pointer: Point, moved: Point, seconds: number) => {
  const dt = Math.min(seconds, MOST_STEP);
  dragon.time += dt;
  turnFrom(dragon, moved);
  dragon.still = Math.hypot(moved.x, moved.y) < 0.5 ? dragon.still + seconds : 0;
  const dozing = dragon.still > DOZE_S;
  dragon.doze = approach(dragon.doze, dozing ? 1 : 0, dozing ? 0.6 : 6, seconds);
  const goal = goalOf(dragon, pointer, dt);
  const wantX = PULL * (goal.x - dragon.x) - DAMP * dragon.vx;
  const wantY = PULL * (goal.y - dragon.y) - DAMP * dragon.vy;
  const want = Math.hypot(wantX, wantY);
  const scale = want > MOST_PULL ? MOST_PULL / want : 1;
  dragon.vx += wantX * scale * dt;
  dragon.vy += wantY * scale * dt;
  dragon.x += dragon.vx * dt;
  dragon.y += dragon.vy * dt;
  follow(dragon);
  // Its head turns the way it's going, and the right way up.
  const speed = Math.hypot(dragon.vx, dragon.vy);
  if (speed > 15) {
    const way = Math.atan2(dragon.vy, dragon.vx);
    const turn = Math.atan2(Math.sin(way - dragon.heading), Math.cos(way - dragon.heading));
    const heading = dragon.heading + turn * Math.min(1, dt * 10);
    dragon.heading = Math.atan2(Math.sin(heading), Math.cos(heading));
  }
  dragon.upright = approach(dragon.upright, Math.cos(dragon.heading) < 0 ? -1 : 1, 8, seconds);
  dragon.roar = Math.max(0, dragon.roar - seconds);
  // Chasing the pearl, it snaps at it now and then.
  if (dragon.still > CHASE_S && !dozing && dragon.random.chance(seconds * 0.25)) {
    dragon.roar = 0.35;
  }
  dragon.jaw = approach(dragon.jaw, dragon.roar > 0 ? 1 : 0, 18, seconds);
  stepEmotes(dragon.emotes, seconds);
  if (dozing) {
    say(dragon.emotes, SLEEP);
  } else if (dragon.still > 2 && dragon.random.chance(seconds * 0.1)) {
    say(dragon.emotes, CHATTER);
  }
};

export const pokeDragon = (dragon: Dragon, at: Point) => {
  dragon.still = 0;
  if (Math.hypot(at.x - dragon.x, at.y - dragon.y) < 22) {
    say(dragon.emotes, GREETING, true);
    dragon.roar = 1.2;
    return;
  }
  // A lunge at where it was clicked.
  const dx = at.x - dragon.x;
  const dy = at.y - dragon.y;
  const reach = Math.hypot(dx, dy) || 1;
  dragon.vx += (dx / reach) * 500;
  dragon.vy += (dy / reach) * 500;
  dragon.roar = 0.4;
  say(dragon.emotes, LUNGE, dragon.random.chance(0.3));
};

/** Its whiskers, about its head as it points along +x: trailing back from its snout, rippling. */
const whiskerOf = (dragon: Dragon, side: number) => {
  const wave = Math.sin(dragon.time * 6 + side) * 4;
  const tip = { x: -6, y: 9 + side * 4 + wave };
  const bend = { x: 6, y: 10 + side * 3 - wave };
  return `M${point(14, 0.5 + side)}Q${point(bend.x, bend.y)} ${point(tip.x, tip.y)}`;
};

export const dragonPose = (dragon: Dragon): Pose => {
  const at = { x: dragon.x, y: dragon.y };
  const segments = dragon.body.map((segment, index) => {
    const ahead = dragon.body[index - 1] ?? at;
    const angle = Math.atan2(ahead.y - segment.y, ahead.x - segment.x);
    // Thinner to the tail; every segment the way up its head is, so its fins all run along one side.
    const size = 1 - (index / SEGMENTS) * 0.55;
    const up = dragon.upright < 0 ? -1 : 1;
    const transform = `translate(${point(segment.x - at.x, segment.y - at.y)}) rotate(${round(degrees(angle))}) scale(${round(size)} ${round(size * up)})`;
    return [`segment-${index}`, { transform }] as const;
  });
  const flip = Math.sign(dragon.upright || 1) * Math.max(0.2, Math.abs(dragon.upright));
  const parts = {
    eye: { opacity: dragon.doze > 0.6 ? 0 : 1 },
    eyelid: { opacity: dragon.doze > 0.6 ? 1 : 0 },
    head: { transform: `rotate(${round(degrees(dragon.heading))}) scale(1 ${round(flip)})` },
    jaw: { transform: `rotate(${round(dragon.jaw * 28)} 3 3)` },
    "whisker-0": { d: whiskerOf(dragon, 0) },
    "whisker-1": { d: whiskerOf(dragon, 1.6) },
    ...Object.fromEntries(segments),
  } satisfies Record<string, Part>;
  return { at, bubble: { x: 0, y: -26 }, parts, say: dragon.emotes.line };
};

export const dragon: Creature<Dragon> = {
  create: createDragon,
  poke: pokeDragon,
  pose: dragonPose,
  step: stepDragon,
};
