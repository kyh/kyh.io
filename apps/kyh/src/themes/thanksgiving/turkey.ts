import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Creature, Landing } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Feet, Steps } from "../follower/feet";
import type { Spring } from "../follower/solid";
import type { Chain } from "../follower/chain";
import type { Gait, Point, Walker } from "../follower/walk";
import { createEmotes, PETTED_S, reached, say, sayWithHeart, stepEmotes } from "../follower/emote";
import { createFeet, groundSpeedOf, keepPace, stepFeet } from "../follower/feet";
import { faceGoal, smooth, springAt, stepAngle, stepSpring } from "../follower/solid";
import { createChain, flickChain, hangOf, stepChain } from "../follower/chain";
import { createWalker, isOnWalker, stepWalker } from "../follower/walk";
import { FLESH, holdFlesh } from "./flesh";
import { fleshOf, SIZE, turkeyPose, wingOverOf } from "./turkey-pose";

const TOP = 150;

const GAIT: Gait = {
  accel: 700,
  behind: 70 * SIZE,
  below: 42 * SIZE,
  stride: 34 * SIZE,
  top: TOP,
};

const STEPS: Steps = {
  cadence: [1.4, 3],
  duty: [0.62, 0.38],
  homes: [
    { ahead: 0.8 * SIZE, left: 4.5 * SIZE },
    { ahead: 0.8 * SIZE, left: -4.5 * SIZE },
  ],
  lift: [2.2, 4.2],
  offsets: [0, 0.5],
  reach: 17 * SIZE,
  strain: { reach: 0.8, swung: 0.35 },
  top: TOP,
};

/** What it does left be, a bout at a time: forages (pecks about, steps round now and then), or struts. */
type Bout = "forage" | "strut";

/** What it's busy with a moment: a few pecks at the ground, a gobble, an alarm's head up. */
type Act = "none" | "peck" | "gobble" | "alert";

const ACT_S: Record<Act, number> = { alert: 1.4, gobble: 1.5, none: 0, peck: 1.1 };

/** Each part's spring: where it's going, and how fast it gets there. */
interface Rig {
  /** Which way it faces, radians: 0 to the right, a quarter turn toward the camera. */
  heading: Spring;
  /** 0 to 1: tail folded to fanned (and chest puffed), and dozing. */
  fan: Spring;
  doze: Spring;
  /** Its head, forward and up from its feet (its own pixels), before its neck's held to its length. */
  headX: Spring;
  headY: Spring;
  /** Its head nodded (radians, + beak up) and turned on its neck (radians, + to its left). */
  nod: Spring;
  look: Spring;
  /** Its body bowed forward (radians, + bowed), to peck. */
  bow: Spring;
  /** 0 to 1: its feathers ruffled up, gobbling. */
  ruffle: Spring;
  /** 0 to 1: craning up at the homepage hat carried near. */
  crane: Spring;
  /** Its hat tipped back on its head (radians), lagging as its head's thrust on. */
  tip: Spring;
}

/** The homepage hat, and it: carried near, or worn. */
interface Hat {
  /** Where it's carried on the screen; null, it isn't. */
  carried: Point | null;
  /** Whether it's seen it carried near, this time. */
  noticed: boolean;
  worn: boolean;
  /** Seconds since it was put on. */
  wornFor: number;
  /** Where it was let go, about where it's worn, to land from. */
  drop: Landing | null;
  /** Its head, forward from its feet (its own pixels), the last step: what its hat lags behind. */
  headWas: number;
}

/** A gobble's shake of its head, on top of its glide: forward and up (its own pixels), and turned. */
interface Shake {
  x: number;
  y: number;
  turn: number;
}

export interface Turkey {
  walker: Walker;
  gait: Gait;
  /** Its feet, set down on the ground (`../follower/feet.ts`). */
  feet: Feet;
  emotes: Emotes;
  random: Random;
  act: Act;
  /** Seconds into the act. */
  actFor: number;
  /** Seconds till it next pecks or, strutting, gobbles. */
  nextPeck: number;
  nextGobble: number;
  /** Seconds the mouse has rested on it. */
  petted: number;
  bout: Bout;
  /** Seconds left of the bout. */
  boutLeft: number;
  /** Foraging, how far it's turned aside from the mouse (radians): a step or two round to peck somewhere new. */
  aside: number;
  strutting: boolean;
  /** 0 to 1: how far down a peck has its head, its neck stretched out to the ground. */
  reach: number;
  /**
   * Whether its tail's nearer the camera than its body (it faces away): held
   * a little past side on either way, so the tail doesn't flicker over and
   * under its body as it sways.
   */
  tailNear: boolean;
  /** Whether each wing, its left then its right, is over its body (`wingOverOf`). */
  wingOver: [boolean, boolean];
  /**
   * Whether its face is turned from the camera, behind its head: by how it
   * holds its head, not a gobble's shake, and held a little either way, so
   * its face doesn't flicker over and under its head.
   */
  faceAway: boolean;
  /** Where on the screen a noise (a click off it) came from, that it looks toward. */
  heard: Point | null;
  rig: Rig;
  /** Its head bobbing as it walks, forward (its own pixels): held over the ground, then thrust on. */
  bob: number;
  shake: Shake;
  /** Its wattle, snood and beard: flesh hanging off it, swung about as it's carried (`chain.ts`). */
  wattle: Chain;
  snood: Chain;
  beard: Chain;
  /** Seconds it's been about, for its strut's slow pivot and a gobble's shake. */
  time: number;
  hat: Hat;
}

const GOBBLE = ["Gobble gobble!", "GOBBLE GOBBLE GOBBLE!", "gobble-obble-obble!"];
const PUTT = ["putt!", "putt putt!"];
const CHATTER = ["purr…", "yelp yelp", "cluck", "Happy Thanksgiving!", "Eat more pie!"];
const PET = ["♥", "purr ♥"];
const HURRY = ["putt!", "wait up!"];
const SLEEP = ["z z z"];
const DAPPER = ["How do I look?", "Dapper!", "Very pilgrim.", "gobble ♥"];
const HATTED = ["Feeling fancy", "Nice hat, huh?", "Happy Thanksgiving!"];
const NOTICED = ["ooh, a hat?", "for me?"];
const UNHATTED = ["hey!", "my hat!"];

const STRUT_S = 5;
const SLEEP_S = 32;
const MOVING = 20;

const HEAD: Point = { x: 19, y: 70 };
const STRUT_HEAD: Point = { x: 12, y: 65 };
const STRUT_PIVOT = 0.4;
const DOZE_HEAD: Point = { x: 6, y: 58 };
const PECK_HEAD: Point = { x: 40, y: 8 };
const PECK_BOW = 0.4;
const MOST_HELD = 15;
const SLEEP_SIDE = 0.44;
const TUCKED = 2.5;
const EYE_REACH = 110;
const CRANE_HEAD: Point = { x: 14, y: 80 };
const MOST_TIP = 0.4;
const TIP_LAG = 0.009;

const createTurkey = (at: Point) => {
  const seed = Math.round(at.x * 7919 + at.y * 31);
  const walker = createWalker(at, GAIT);
  const heading = Math.PI / 4;

  return {
    act: "none",
    actFor: 0,
    aside: 0,
    beard: createChain({ rest: [], root: at }),
    bob: 0,
    bout: "forage",
    boutLeft: STRUT_S,
    emotes: createEmotes(seed),
    faceAway: false,
    feet: createFeet(STEPS, walker, heading),
    gait: GAIT,
    hat: { carried: null, drop: null, headWas: HEAD.x, noticed: false, worn: false, wornFor: 0 },
    heard: null,
    nextGobble: 2,
    nextPeck: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    reach: 0,
    rig: {
      bow: springAt(0),
      crane: springAt(0),
      doze: springAt(0),
      fan: springAt(0),
      headX: springAt(HEAD.x),
      headY: springAt(HEAD.y),
      heading: springAt(heading),
      look: springAt(0),
      nod: springAt(0),
      ruffle: springAt(0),
      tip: springAt(0),
    },
    shake: { turn: 0, x: 0, y: 0 },
    snood: createChain({ rest: [], root: at }),
    strutting: false,
    tailNear: false,
    time: 0,
    walker,
    wattle: createChain({ rest: [], root: at }),
    wingOver: [false, false],
  } satisfies Turkey;
};

const begin = (turkey: Turkey, act: Act) => {
  turkey.act = act;
  turkey.actFor = 0;

  if (act === "gobble") {
    flickChain(turkey.snood, { x: 140, y: -90 });
    flickChain(turkey.wattle, { x: -120, y: -60 });
  }
};

const gobble = (turkey: Turkey, now: boolean) => {
  if (say(turkey.emotes, GOBBLE, now)) {
    begin(turkey, "gobble");

    return true;
  }

  return false;
};

const isOn = (turkey: Turkey, at: Point) =>
  isOnWalker(turkey.walker, at, 28 * SIZE, (turkey.hat.worn ? 100 : 80) * SIZE);

const envelope = (turkey: Turkey, act: Act, edge = 4) => {
  if (turkey.act !== act) {
    return 0;
  }

  const t = turkey.actFor / ACT_S[act];

  return smooth(Math.min(t, 1 - t) * edge);
};

const peckDown = (turkey: Turkey) =>
  turkey.act === "peck" ? Math.abs(Math.sin((turkey.actFor / ACT_S.peck) * Math.PI * 2)) ** 1.2 : 0;

const headGoal = (turkey: Turkey) => {
  const { rig } = turkey;
  const fan = rig.fan.x;
  const doze = rig.doze.x;
  const upright = (1 - fan) * (1 - doze);
  const front = Math.max(0, Math.sin(rig.heading.x)) * upright;
  const away = Math.max(0, -Math.sin(rig.heading.x)) * upright;
  let x = HEAD.x - 9 * front - 6 * away;
  let y = HEAD.y + 2 * front - 14 * away;
  x += (STRUT_HEAD.x - HEAD.x) * fan + (DOZE_HEAD.x - HEAD.x) * doze;
  y += (STRUT_HEAD.y - HEAD.y) * fan + (DOZE_HEAD.y - HEAD.y) * doze;
  let nod = -0.2 * fan - 0.3 * doze;
  const crane = rig.crane.x * upright;
  x += (CRANE_HEAD.x - x) * crane;
  y += (CRANE_HEAD.y - y) * crane;
  nod += 0.35 * crane;
  const down = peckDown(turkey);

  if (turkey.act === "peck") {
    x += (PECK_HEAD.x - x) * down;
    y += (PECK_HEAD.y - y) * down;
    nod = -0.3 - 0.7 * down;
  }

  const out = envelope(turkey, "gobble");
  x += 8 * out * (1 - 0.8 * front);
  y += 4 * out * (1 + front);
  nod += 0.35 * out;
  const tall = envelope(turkey, "alert", 6);
  x -= 3 * tall;
  y += 9 * tall;
  nod += 0.15 * tall;

  return { nod, x, y };
};

const settle = (turkey: Turkey, sleeping: boolean, moving: boolean, seconds: number) => {
  const { rig, strutting } = turkey;
  let rate = moving ? 14 : 6;

  if (strutting) {
    rate = 3.5;
  }

  stepSpring(rig.fan, strutting ? 1 : 0, rate, seconds);
  stepSpring(rig.doze, sleeping ? 1 : 0, sleeping ? 1.5 : 8, seconds);
  stepSpring(rig.ruffle, envelope(turkey, "gobble", 8), 20, seconds);
};

const stepBout = (turkey: Turkey, moving: boolean, seconds: number) => {
  const { random } = turkey;

  if (moving) {
    Object.assign(turkey, { aside: 0, bout: "forage", boutLeft: STRUT_S });

    return;
  }

  turkey.boutLeft -= seconds;

  if (turkey.boutLeft <= 0 && turkey.act !== "gobble") {
    const strut = turkey.bout === "forage";
    turkey.bout = strut ? "strut" : "forage";
    turkey.boutLeft = strut ? 6 + random.next() * 4 : 5 + random.next() * 4;
    turkey.nextGobble = 1 + random.next() * 2;
    turkey.aside = 0;
  }

  if (turkey.bout === "forage" && turkey.act === "none" && random.chance(seconds * 0.25)) {
    turkey.aside = (random.next() - 0.5) * 1.6;
  }
};

const startAct = (turkey: Turkey, idle: number, seconds: number) => {
  const foraging = !turkey.strutting && turkey.rig.fan.x < 0.1;

  if (foraging) {
    turkey.nextPeck -= seconds;
  } else if (turkey.strutting) {
    turkey.nextGobble -= seconds;
  }

  if (foraging && idle > 0.8 && turkey.nextPeck <= 0) {
    begin(turkey, "peck");
    turkey.nextPeck = 0.8 + turkey.random.next() * 2.2;
  } else if (turkey.strutting && turkey.nextGobble <= 0 && idle < SLEEP_S - 2) {
    const ending = turkey.bout === "strut" && turkey.boutLeft < ACT_S.gobble;
    turkey.nextGobble = !ending && gobble(turkey, false) ? 3 + turkey.random.next() * 4 : 0.5;
  }
};

const stepActs = (turkey: Turkey, moving: boolean, idle: number, seconds: number) => {
  const sleeping = idle > SLEEP_S && turkey.petted === 0;
  stepBout(turkey, moving, seconds);
  const showing = idle > STRUT_S && turkey.bout === "strut";
  const free = !moving && !sleeping && turkey.act !== "peck";
  turkey.strutting = free && (showing || turkey.petted > 0.4);
  settle(turkey, sleeping, moving, seconds);
  turkey.actFor += seconds;
  const off = (turkey.act === "peck" && (moving || turkey.walker.still < 0.15)) || sleeping;

  if (turkey.act !== "none" && (turkey.actFor > ACT_S[turkey.act] || off)) {
    turkey.act = "none";
  }

  if (turkey.act === "none" && !moving && !sleeping) {
    startAct(turkey, idle, seconds);
  }

  return sleeping;
};

const eyeing = ({ hat, walker }: Turkey) =>
  hat.carried !== null &&
  !hat.worn &&
  Math.hypot(hat.carried.x - walker.x, hat.carried.y - (walker.y - 50 * SIZE)) < EYE_REACH;

const stepTalk = (turkey: Turkey, sleeping: boolean, idle: number, seconds: number) => {
  const { emotes, hat, random, walker } = turkey;
  stepEmotes(emotes, seconds);

  if (eyeing(turkey) && !hat.noticed) {
    hat.noticed = say(emotes, NOTICED, true);
  } else if (sleeping) {
    if (turkey.rig.doze.x > 0.6) {
      say(emotes, SLEEP);
    }
  } else if (turkey.petted > PETTED_S) {
    if (reached(turkey.petted, seconds, PETTED_S)) {
      if (turkey.act === "gobble") {
        sayWithHeart(emotes, PET);
      } else {
        say(emotes, PET, true);
      }
    }
  } else if (groundSpeedOf(walker) > TOP * 0.9 && random.chance(seconds * 0.6)) {
    say(emotes, HURRY);
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, hat.worn && random.chance(0.5) ? HATTED : CHATTER);
  }
};

const facingOf = (turkey: Turkey, pointer: Point, moving: boolean, sleeping: boolean) => {
  const { rig, walker } = turkey;

  if (sleeping || rig.doze.x > 0.05) {
    const sides = [SLEEP_SIDE, Math.PI - SLEEP_SIDE];

    const off = (to: number) =>
      Math.abs(Math.atan2(Math.sin(to - rig.heading.x), Math.cos(to - rig.heading.x)));

    return off(sides[0] ?? 0) < off(sides[1] ?? 0) ? (sides[0] ?? 0) : (sides[1] ?? 0);
  }

  if (turkey.strutting && !moving) {
    return Math.PI / 2 + STRUT_PIVOT * Math.sin(turkey.time * 0.7);
  }

  const toward = turkey.act === "alert" && turkey.heard ? turkey.heard : pointer;
  const goal = faceGoal(walker, toward, rig.heading.x, MOVING / 2);

  if (moving || turkey.petted > 0 || turkey.aside === 0) {
    return goal;
  }

  const aside = goal + turkey.aside;

  return Math.sin(aside) < -0.3 ? goal - turkey.aside : aside;
};

const stepHead = (
  turkey: Turkey,
  pointer: Point,
  state: { moving: boolean; sleeping: boolean },
  seconds: number,
) => {
  const { rig } = turkey;
  const facing = facingOf(turkey, pointer, state.moving, state.sleeping);
  let turning = turkey.strutting && !state.moving ? 3 : 7;

  if (rig.doze.x > 0.05) {
    turning = 1.5;
  }

  stepAngle(rig.heading, facing, turning, seconds);
  const goal = headGoal(turkey);
  const rate = turkey.act === "peck" ? 40 : 16;
  stepSpring(rig.headX, goal.x, rate, seconds);
  stepSpring(rig.headY, goal.y, rate, seconds);
  stepSpring(rig.nod, goal.nod, rate, seconds);
  const tucked = Math.cos(rig.heading.x) < 0 ? -TUCKED : TUCKED;
  stepSpring(rig.look, rig.doze.x > 0.3 ? tucked : 0, 3, seconds);
  stepSpring(rig.bow, turkey.act === "peck" ? PECK_BOW : 0, 9, seconds);
  turkey.reach = peckDown(turkey);
  const out = envelope(turkey, "gobble");
  const t = turkey.time;
  turkey.shake = {
    turn: Math.sin(t * 27) * 0.55 * out,
    x: Math.sin(t * 35) * 2.6 * out,
    y: Math.sin(t * 44 + 1) * 2 * out,
  };
  stepSpring(rig.crane, eyeing(turkey) && !state.sleeping ? 1 : 0, 8, seconds);
};

const stepHat = (turkey: Turkey, seconds: number) => {
  const { hat, rig } = turkey;
  const head = rig.headX.x + turkey.bob + turkey.shake.x;
  const thrust = seconds > 0 ? (head - hat.headWas) / seconds : 0;
  hat.headWas = head;
  hat.wornFor += seconds;

  if (hat.carried === null) {
    hat.noticed = false;
  }

  const lag = Math.max(-MOST_TIP, Math.min(MOST_TIP, thrust * TIP_LAG));
  const held = turkey.act === "gobble" ? 0.3 : 1;
  stepSpring(rig.tip, hat.worn ? lag * held : 0, 7, seconds);
};

const bobOf = (turkey: Turkey) => {
  const { feet, walker } = turkey;

  if (feet.cadence <= 0) {
    return 0;
  }

  const speed = groundSpeedOf(walker);
  const step = speed / feet.cadence / 2 / SIZE;
  const hold = Math.min(0.75, MOST_HELD / Math.max(step, 1e-6));
  const held = step * hold * smooth(speed / MOVING / 2);
  const t = (feet.phase * 2) % 1;

  if (t < hold) {
    return held / 2 - (t / hold) * held;
  }

  return -held / 2 + smooth((t - hold) / (1 - hold)) * held;
};

const SWING = { beard: 0.5, snood: 0.6, wattle: 0.6 } as const;

const tailNearOf = (turkey: Turkey) => {
  const away = -Math.sin(turkey.rig.heading.x);

  return turkey.tailNear ? away > 0.05 : away > 0.15;
};

const faceAwayOf = ({ faceAway, rig }: Turkey) => {
  const away = -Math.sin(rig.heading.x + rig.look.x);

  return faceAway ? away > 0.13 : away > 0.28;
};

const stepTurkey = (turkey: Turkey, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = turkey;
  turkey.time += seconds;
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(turkey, pointer);
  const hold = resting || turkey.act === "peck" || eyeing(turkey);
  stepWalker(walker, GAIT, pointer, moved, seconds, hold);
  keepPace(walker, TOP, seconds);
  const moving = groundSpeedOf(walker) > MOVING;
  const idle = moving ? 0 : walker.still;
  turkey.petted = !moving && isOn(turkey, pointer) ? turkey.petted + seconds : 0;
  const sleeping = stepActs(turkey, moving, idle, seconds);
  stepTalk(turkey, sleeping, idle, seconds);
  stepHead(turkey, pointer, { moving, sleeping }, seconds);
  stepFeet(turkey.feet, STEPS, walker, turkey.rig.heading.x, seconds);
  turkey.bob = bobOf(turkey);
  stepHat(turkey, seconds);
  turkey.tailNear = tailNearOf(turkey);
  const [left, right] = turkey.wingOver;
  turkey.wingOver = [
    wingOverOf(left, turkey.rig.heading.x, 1),
    wingOverOf(right, turkey.rig.heading.x, -1),
  ];
  turkey.faceAway = faceAwayOf(turkey);
  const flesh = fleshOf(turkey);

  for (const name of ["snood", "wattle", "beard"] as const) {
    const { floor, points } = flesh[name];
    const hang = hangOf(points, walker, SIZE);
    const most = turkey.act === "gobble" ? 1.4 : SWING[name];
    stepChain(turkey[name], hang, FLESH, seconds, holdFlesh(hang, most, walker.y + floor * SIZE));
  }
};

const pokeTurkey = (turkey: Turkey, at: Point) => {
  turkey.walker.still = Math.min(turkey.walker.still, STRUT_S - 1);

  if (isOn(turkey, at)) {
    gobble(turkey, true);
  } else if (turkey.random.chance(0.45)) {
    gobble(turkey, true);
  } else if (say(turkey.emotes, PUTT, turkey.act !== "gobble")) {
    turkey.heard = { x: at.x, y: at.y };
    begin(turkey, "alert");
  }
};

const eyeHat = (turkey: Turkey, at: Point | null) => {
  turkey.hat.carried = at;
};

const wearHat = (turkey: Turkey, drop: Landing | null) => {
  const { hat } = turkey;
  turkey.walker.still = Math.min(turkey.walker.still, STRUT_S - 1);

  if (drop) {
    Object.assign(hat, { drop, worn: true, wornFor: 0 });
    turkey.heard = null;
    begin(turkey, "alert");
    say(turkey.emotes, DAPPER, true);

    return;
  }

  Object.assign(hat, { drop: null, noticed: true, worn: false });
  say(turkey.emotes, UNHATTED, true);
};

export const turkey: Creature<Turkey> = {
  create: createTurkey,
  eye: eyeHat,
  poke: pokeTurkey,
  pose: turkeyPose,
  step: stepTurkey,
  wear: wearHat,
};
