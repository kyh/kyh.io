import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Chain, Stuff } from "../follower/chain";
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Spring } from "../follower/solid";
import type { Gait, Point, Walker } from "../follower/walk";
import type { Hopper, Spot } from "./hop";
import type { Jiggle } from "./jiggle";
import { createChain, flickChain, stepChain } from "../follower/chain";
import { createEmotes, PETTED_S, reached, say, sayWithHeart, stepEmotes } from "../follower/emote";
import {
  faceGoal,
  headingOf,
  PITCH,
  smooth,
  springAt,
  stepAngle,
  stepSpring,
} from "../follower/solid";
import { createWalker, isOnWalker, spotOf, turnBack } from "../follower/walk";
import {
  ACT_S,
  BINKY_BEATS,
  binkyAt,
  bunnyPose,
  hangsOf,
  sidesOf,
  SIZE,
  THUMP_BEATS,
  thumpAt,
} from "./bunny-pose";
import {
  createHopper,
  isAirborne,
  isPivot,
  placeOf,
  planLeap,
  SET_OFF,
  stepHopper,
  wrap,
} from "./hop";
import { jiggleAt, stepJiggle } from "./jiggle";
import { stiffen } from "./stiffen";

const GAIT: Gait = { accel: 0, behind: 54, below: 28, stride: 0, top: 0 };
const SIN = Math.sin(PITCH);

export type Act = "none" | "sniff" | "groom" | "stand" | "binky" | "thump";

/** Each part's spring: where it's going, and how fast it gets there. */
interface Rig {
  /** Which way it faces, radians: its hops' (kept here for what reads it). */
  heading: Spring;
  /** 0 to 1: sat up tall on its haunches, grooming, nose down sniffing, dozing, content being petted. */
  stand: Spring;
  groom: Spring;
  sniff: Spring;
  doze: Spring;
  content: Spring;
  /** Its head turned (radians, + to its left) and nodded (+ up, - down). */
  look: Spring;
  /** Which way its head faces in the world: ahead of its body into a turn, as an animal looks where it's going; stood, to the mouse. */
  gaze: Spring;
  nod: Spring;
  /** Its ears laid back (radians; less than 0 pricked forward), each swivelled out (radians), and its tail flagged up. */
  lay: Spring;
  swivel: [Spring, Spring];
  tail: Spring;
}

export interface Bunny {
  /** Where it is on the screen, and how it keeps by the pointer: synced from its hops. */
  walker: Walker;
  hopper: Hopper;
  /** Hops made, and how far into this one: for what counts them. */
  hop: number;
  emotes: Emotes;
  random: Random;
  act: Act;
  actFor: number;
  next: number;
  petted: number;
  /** Seconds it's been about, for its paws' scrubbing; its breath's and nose's runs (radians). */
  time: number;
  breath: number;
  twitch: number;
  /** Seconds till an ear swivels, which, and for how long. */
  swivel: { ear: number; for: number; in: number };
  rig: Rig;
  /** Its body's squash (-) and stretch (+), wobbling. */
  squash: Jiggle;
  /** Its ears (its left, its right) and its tail, in the screen's pixels. */
  ears: [Chain, Chain];
  tail: Chain;
  /** Which of its parts are in front of its body (`sidesOf`), kept so they don't flicker over and under. */
  sides: Record<string, boolean>;
  /** A binky or a thump asked for while it was hopping: it does it once it's landed. */
  queued: Act | null;
  /** Counts its steps, so what's worked out from it once a step is worked out once (`bunny-pose.ts`). */
  version: number;
}

const BINKY = ["binky!", "♥", "wheee!"];
const THUMP = ["*thump*", "!"];
const STARTLE = ["!", "eep!"];
const CHATTER = ["*sniff sniff*", "Happy Easter!", "found any eggs?", "*nibble*"];
const PET = ["♥", "*purr*"];
const SLEEP = ["z z z"];

const DOZE_S = 30;
const AWAY_FROM_MOUSE = 20;
const RESTING_S = 0.08;
const PETTED_TURN = 0.5;
const SETTLING_S = 1.3;
const SETTLED_TURN = 0.85;
const IDLE: readonly Act[] = ["sniff", "sniff", "groom", "stand"];
const KEPT: ReadonlySet<Act> = new Set<Act>(["binky", "thump"]);

const EARS: readonly [Stuff, Stuff] = [
  { damp: 7, drag: 0.005, keep: 0.14, keepTip: 0.022, rub: 0.45, weight: 30 },
  { damp: 5.5, drag: 0.006, keep: 0.11, keepTip: 0.02, rub: 0.5, weight: 50 },
];

const EAR_BEND = 0.3;
const EAR_ROOT_BEND = 0.4;
const EAR_SWING = 0.14;
const TAIL: Stuff = { damp: 4.5, drag: 0.004, keep: 0.09, keepTip: 0.09, rub: 0.3, weight: 0 };
const GAZE_RATE = 9;
const NECK_TURN = 1;
const HEAD_UP = 18;
const WOBBLE = { damping: 0.4, hertz: 6 } as const;

const groundOf = (at: Point) => ({ x: at.x / SIZE, z: at.y / (SIN * SIZE) }) satisfies Spot;

const createBunny = (at: Point) => {
  const seed = Math.round(at.x * 7919 + at.y * 13);
  const walker = createWalker(at, GAIT);
  const heading = Math.PI / 4;

  const bunny: Bunny = {
    act: "none",
    actFor: 0,
    breath: 0,
    ears: [
      { knots: [], owed: 0 },
      { knots: [], owed: 0 },
    ],
    emotes: createEmotes(seed),
    hop: 0,
    hopper: createHopper(groundOf(walker), heading),
    next: 1.5,
    petted: 0,
    queued: null,
    random: createRandom(seed + 1),
    rig: {
      content: springAt(0),
      doze: springAt(0),
      gaze: springAt(heading),
      groom: springAt(0),
      heading: springAt(heading),
      lay: springAt(0.12),
      look: springAt(0),
      nod: springAt(0),
      sniff: springAt(0),
      stand: springAt(0),
      swivel: [springAt(0), springAt(0)],
      tail: springAt(0),
    },
    sides: {},
    squash: jiggleAt(0),
    swivel: { ear: 0, for: 0, in: 4 },
    tail: { knots: [], owed: 0 },
    time: 0,
    twitch: 0,
    version: 0,
    walker,
  };

  const hangs = hangsOf(bunny);
  bunny.ears = [createChain(hangs.ears[0]), createChain(hangs.ears[1])];
  bunny.tail = createChain(hangs.tail);

  return bunny;
};

const begin = (bunny: Bunny, act: Act) => {
  bunny.act = act;
  bunny.actFor = 0;
};

const isOn = (bunny: Bunny, at: Point) => isOnWalker(bunny.walker, at, 18 * SIZE, 42 * SIZE);

const isHopping = (bunny: Bunny) => bunny.hopper.leap !== null;

const faceOf = (bunny: Bunny, pointer: Point) => {
  const { hopper, walker } = bunny;
  const goal = faceGoal({ ...walker, speed: 0 }, pointer, hopper.heading, 0);

  if (Math.sin(goal) >= Math.cos(SETTLED_TURN)) {
    return goal;
  }

  return Math.PI / 2 + (Math.cos(goal) >= 0 ? -SETTLED_TURN : SETTLED_TURN);
};

const wantOf = (bunny: Bunny, pointer: Point, resting: boolean, dozing: boolean) => {
  const { act, walker } = bunny;

  if (KEPT.has(act)) {
    return { face: null, target: null, watch: null };
  }

  if (resting || isOn(bunny, pointer)) {
    const face =
      bunny.petted > 0.2 && act === "none"
        ? Math.PI / 2 + (Math.cos(bunny.hopper.heading) >= 0 ? -PETTED_TURN : PETTED_TURN)
        : null;

    return { face, target: null, watch: null };
  }

  const spot = spotOf(walker, GAIT, pointer);
  const free = !dozing && act === "none";
  const face = free && walker.still >= SETTLING_S ? faceOf(bunny, pointer) : null;
  const toSpot = { x: spot.x - walker.x, y: (spot.y - walker.y) / SIN };
  const toMouse = { x: pointer.x - walker.x, y: (pointer.y - walker.y) / SIN };

  const away =
    toSpot.x * toMouse.x + toSpot.y * toMouse.y < 0 &&
    Math.hypot(toMouse.x, toMouse.y) > AWAY_FROM_MOUSE;

  const mouse = headingOf(pointer.x - walker.x, pointer.y - walker.y + HEAD_UP);

  return { face, target: away ? null : groundOf(spot), watch: free ? mouse : null };
};

const isLeaving = (bunny: Bunny, target: Spot | null) => {
  const { at } = bunny.hopper;

  return target !== null && Math.hypot(target.x - at.x, target.z - at.z) > SET_OFF;
};

const stepActs = (bunny: Bunny, leaving: boolean, idle: number, seconds: number) => {
  const dozing = idle > DOZE_S && bunny.petted === 0;
  bunny.actFor += seconds;
  const kept = KEPT.has(bunny.act);
  const over = bunny.actFor > ACT_S[bunny.act] || (leaving && !kept);

  if (bunny.act !== "none" && over) {
    bunny.act = "none";
  }

  if (bunny.act !== "none" || isHopping(bunny) || leaving || dozing || bunny.petted > 0) {
    return dozing;
  }

  bunny.next -= seconds;

  if (idle > SETTLING_S && bunny.next <= 0) {
    begin(bunny, bunny.random.pick(IDLE));
    bunny.next = 1.2 + bunny.random.next() * 2.5;
  }

  return dozing;
};

const stepTalk = (bunny: Bunny, dozing: boolean, idle: number, seconds: number) => {
  const { emotes, random } = bunny;
  stepEmotes(emotes, seconds);

  if (dozing) {
    say(emotes, SLEEP);
  } else if (bunny.petted > PETTED_S) {
    if (reached(bunny.petted, seconds, PETTED_S)) {
      if (bunny.act === "binky" || BINKY.includes(emotes.line ?? "")) {
        sayWithHeart(emotes, PET);
      } else {
        say(emotes, PET, true);
        begin(bunny, "binky");
      }
    }
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, CHATTER);
  }
};

const envelope = (bunny: Bunny, act: Act, edge = 0.2) => {
  if (bunny.act !== act) {
    return 0;
  }

  const t = bunny.actFor / ACT_S[act];

  return smooth(Math.min(t, 1 - t) / edge);
};

const stepRig = (bunny: Bunny, dozing: boolean, leaving: boolean, seconds: number) => {
  const { rig } = bunny;
  const stand = envelope(bunny, "stand");
  const groom = envelope(bunny, "groom");
  const sniff = envelope(bunny, "sniff");
  const alert = bunny.act === "thump" ? thumpAt(bunny.actFor).alert : 0;
  const along = Math.min(1, 1 + Math.sin(bunny.hopper.heading));
  const leap = (bunny.hopper.leap?.size ?? 0) * along;
  const down = leaving ? 2.5 : 1;
  stepSpring(rig.stand, Math.min(1, stand + 0.3 * groom + 0.35 * alert), 6 * down, seconds);
  stepSpring(rig.groom, groom, 8 * down, seconds);
  stepSpring(rig.sniff, sniff, 7, seconds);
  stepSpring(rig.doze, dozing ? 1 : 0, dozing ? 1.5 : 8, seconds);
  stepSpring(rig.content, bunny.petted > 0.3 && bunny.act !== "binky" ? 1 : 0, 5, seconds);
  stepSpring(
    rig.look,
    stand * Math.sin((bunny.actFor / ACT_S.stand) * Math.PI * 2) * 0.75,
    6,
    seconds,
  );
  const scrub = groom * 0.12 * Math.sin(bunny.time * 7);
  const nod = 0.12 * stand + 0.2 * alert - 0.5 * sniff - 0.4 * groom + scrub - 0.12 * rig.doze.x;
  stepSpring(rig.nod, Math.max(-0.5, Math.min(0.3, nod)), 8, seconds);

  const lay =
    0.12 +
    0.3 * leap +
    1.25 * rig.doze.x +
    0.55 * rig.content.x -
    0.14 * stand -
    0.3 * alert +
    0.3 * groom;

  stepSpring(rig.lay, Math.max(-0.25, Math.min(1.4, lay)), 6, seconds);
  const binky = bunny.act === "binky" ? binkyAt(bunny.actFor).air : 0;
  stepSpring(rig.tail, Math.min(1.1, 1.1 * alert + 0.5 * binky + 0.3 * leap), 10, seconds);

  for (const [index, swivel] of rig.swivel.entries()) {
    const turned = bunny.swivel.for > 0 && bunny.swivel.ear === index && rig.doze.x < 0.5;
    stepSpring(swivel, turned ? 0.5 : 0, 5, seconds);
  }
};

const knock = (bunny: Bunny, stretch: number, ears: number) => {
  bunny.squash.v += stretch;

  if (ears !== 0) {
    for (const ear of bunny.ears) {
      flickChain(ear, { x: 0, y: ears });
    }
  }
};

const stepBeats = (bunny: Bunny, seconds: number) => {
  const before = bunny.actFor - seconds;
  const crossed = (mark: number) => before < mark && bunny.actFor >= mark;

  if (bunny.act === "binky") {
    if (crossed(BINKY_BEATS.takeOff)) {
      knock(bunny, 4, 0);
    }

    if (crossed(BINKY_BEATS.landing)) {
      knock(bunny, -7.5, 260);
    }
  } else if (bunny.act === "thump" && crossed(THUMP_BEATS.stamp)) {
    knock(bunny, -14, 200);
  }
};

const watchOf = (gaze: number, heading: number, watch: number | null) => {
  if (watch === null) {
    return heading;
  }

  const lead = wrap(watch - heading);

  if (Math.abs(lead) <= NECK_TURN) {
    return watch;
  }

  const on = wrap(gaze - heading);

  return heading + NECK_TURN * Math.sign(Math.abs(on) > NECK_TURN / 2 ? on : lead);
};

const stepHops = (bunny: Bunny, want: ReturnType<typeof wantOf>, seconds: number) => {
  const { hopper, walker } = bunny;
  const was = { x: walker.x, y: walker.y };

  const beats = stepHopper(hopper, seconds, () => {
    const leap = bunny.queued ? null : planLeap(hopper, want.target, want.face);

    if (leap) {
      bunny.hop = Math.floor(bunny.hop) + 1;
    }

    return leap;
  });

  if (bunny.queued && !isHopping(bunny)) {
    begin(bunny, bunny.queued);
    bunny.queued = null;
  }

  if (beats.tookOff > 0) {
    knock(bunny, 3 * beats.tookOff, 0);
  }

  if (beats.foreLanded > 0) {
    knock(bunny, -1.5 * beats.foreLanded, 0);
  }

  if (beats.hindLanded > 0) {
    knock(bunny, -4 * beats.hindLanded, 80 * beats.hindLanded);
  }

  const place = placeOf(hopper);
  bunny.hop = Math.floor(bunny.hop) + place.u;
  walker.x = place.at.x * SIZE;
  walker.y = place.at.z * SIN * SIZE;

  if (seconds > 0) {
    walker.vx = (walker.x - was.x) / seconds;
    walker.vy = (walker.y - was.y) / seconds;
  }

  walker.speed = Math.hypot(walker.vx, walker.vy);
  bunny.rig.heading.x = place.heading;
  const { gaze } = bunny.rig;
  const looking = hopper.leap ? hopper.leap.turnTo : watchOf(gaze.x, place.heading, want.watch);
  stepAngle(gaze, looking, GAZE_RATE, seconds);
  const lead = Math.atan2(Math.sin(gaze.x - place.heading), Math.cos(gaze.x - place.heading));

  if (Math.abs(lead) > NECK_TURN) {
    gaze.x = place.heading + Math.sign(lead) * NECK_TURN;
    gaze.v = 0;
  }

  const goal = hopper.leap && isAirborne(hopper.u) ? 0.08 * hopper.leap.size : 0;
  stepJiggle(bunny.squash, goal, WOBBLE.hertz, WOBBLE.damping, seconds);
};

const stepChains = (bunny: Bunny, seconds: number) => {
  const hangs = hangsOf(bunny);

  for (const [index, ear] of bunny.ears.entries()) {
    const hang = hangs.ears[index] ?? hangs.ears[0];
    stepChain(ear, hang, EARS[index] ?? EARS[0], seconds, (held) => {
      stiffen(held, hang, EAR_BEND, EAR_ROOT_BEND, EAR_SWING);
    });
  }

  stepChain(bunny.tail, hangs.tail, TAIL, seconds);
};

const stepLife = (bunny: Bunny, seconds: number) => {
  const { rig, swivel } = bunny;
  const doze = rig.doze.x;
  bunny.breath += seconds * Math.PI * 2 * (0.45 - 0.2 * doze);
  bunny.twitch += seconds * (1 - doze) * (1 + 1.2 * rig.sniff.x);
  swivel.for = Math.max(0, swivel.for - seconds);
  swivel.in -= seconds;

  if (swivel.in <= 0) {
    swivel.ear = bunny.random.chance(0.5) ? 0 : 1;
    swivel.for = isHopping(bunny) ? 0 : 0.9;
    swivel.in = 3 + bunny.random.next() * 5;
  }
};

const stepBunny = (bunny: Bunny, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = bunny;
  const dt = Math.max(0, seconds);
  bunny.time += dt;
  walker.still = moved.x === 0 && moved.y === 0 ? walker.still + dt : 0;
  walker.back = turnBack(walker.back, moved, 80);
  const resting = walker.still > RESTING_S && isOn(bunny, pointer);
  const idle = isHopping(bunny) ? 0 : walker.still;
  const dozing = idle > DOZE_S && bunny.petted === 0;
  const want = wantOf(bunny, pointer, resting, dozing);
  const leaving = isLeaving(bunny, want.target);
  const turning = want.face !== null && isPivot(bunny.hopper.heading, want.face);
  stepActs(bunny, leaving, turning ? 0 : idle, dt);
  const { rig } = bunny;
  const busy = bunny.act !== "none" || Math.max(rig.stand.x, rig.groom.x) > 0.04;
  stepHops(bunny, busy ? { face: null, target: null, watch: null } : want, dt);
  bunny.petted = resting ? bunny.petted + dt : 0;
  stepTalk(bunny, dozing, idle, dt);
  stepRig(bunny, dozing, leaving, dt);
  stepBeats(bunny, dt);
  stepLife(bunny, dt);
  bunny.version += 1;
  stepChains(bunny, dt);
  bunny.sides = sidesOf(bunny);
};

const pokeBunny = (bunny: Bunny, at: Point) => {
  bunny.walker.still = Math.min(bunny.walker.still, 3);

  if (bunny.act === "binky") {
    return;
  }

  if (isOn(bunny, at)) {
    say(bunny.emotes, BINKY, true);

    if (isHopping(bunny)) {
      bunny.queued = "binky";
    } else {
      begin(bunny, "binky");
    }
  } else if (isHopping(bunny) && (bunny.hopper.leap?.size ?? 0) > 0) {
    say(bunny.emotes, STARTLE, bunny.random.chance(0.5));
    knock(bunny, 0, -220);
  } else if (isHopping(bunny)) {
    say(bunny.emotes, THUMP, bunny.random.chance(0.4));
    bunny.queued = "thump";
  } else if (bunny.act !== "thump") {
    say(bunny.emotes, THUMP, bunny.random.chance(0.4));
    begin(bunny, "thump");
  }
};

export const bunny: Creature<Bunny> = {
  create: createBunny,
  poke: pokeBunny,
  pose: bunnyPose,
  step: stepBunny,
};
