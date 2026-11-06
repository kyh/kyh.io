// The bunny that follows a mouse about at Easter, for `follower.tsx`: a
// white rabbit, built in the round (`bunny-pose.ts` draws it). It hops after
// the mouse a hop at a time (`hop.ts`): each hop planned as it lands, toward a
// spot a little behind and below the pointer (`../follower/walk.ts`), little
// hops near and long bounds far, its last hop landing it there; it turns only
// in the air, and turns about where it stands in little hops round. Every
// foot stays where it was set down until it lifts. Its body squashes landing
// and stretches taking off, with a little wobble after (`jiggle.ts`); its
// long ears and its cotton tail are chains (`../follower/chain.ts`), held
// stiff against kinking (`stiffen.ts`), streaming back as it flies, flopping
// as it lands and swinging back up when it stops, the right ear floppier than
// the left. Left be, it breathes, twitches its nose, swivels an ear now and
// then, sniffs about, grooms its face with its paws and sits up tall to look
// round; left long enough, it lays its ears back and dozes. A click on it, or
// a petting, sets it leaping and twisting in the air (a binky, a happy
// rabbit's jump); a click elsewhere makes it thump, or, hopping, startle.
// Pure (state is stepped in place, for a frame's sake).
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
import { createEmotes, PETTED_S, reached, say, stepEmotes } from "../follower/emote";
import { faceGoal, PITCH, smooth, springAt, stepAngle, stepSpring } from "../follower/solid";
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
import { createHopper, isAirborne, placeOf, planLeap, SET_OFF, stepHopper } from "./hop";
import { jiggleAt, stepJiggle } from "./jiggle";
import { stiffen } from "./stiffen";

/** Where it keeps to by the pointer, on the screen. (Its pace is its hops', `hop.ts`.) */
const GAIT: Gait = { accel: 0, behind: 54, below: 28, stride: 0, top: 0 };
const SIN = Math.sin(PITCH);

export type Act = "none" | "sniff" | "groom" | "stand" | "binky" | "thump";

/** Each part's spring: where it's going, and how fast it gets there. */
export interface Rig {
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
  /** Which way its head faces in the world: ahead of its body into a turn, as an animal looks where it's going. */
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
/** Farther than this from the mouse (over the ground), it won't hop away from it to its spot. */
const AWAY_FROM_MOUSE = 20;
/** Seconds a mouse must be still on it to be resting there: one passing over isn't petting. */
const RESTING_S = 0.08;
/** Petted, how far from straight at the camera it turns: a three-quarter view. */
const PETTED_TURN = 0.5;
/** Seconds the mouse must be still before it settles to the camera: a pause isn't a stop. */
const SETTLING_S = 0.4;
/** Settled, the farthest from straight at the camera it stands: three-quarters on, its face and whatever it's up to in view. */
const SETTLED_TURN = 0.85;
const IDLE: readonly Act[] = ["sniff", "sniff", "groom", "stand"];
/** Acts it holds still for, whatever the mouse does, till they're done. */
const KEPT: ReadonlySet<Act> = new Set<Act>(["binky", "thump"]);

/** Its ears: stiff at the root and soft toward the tip; the right one softer and heavier, so it flops more. */
const EARS: readonly [Stuff, Stuff] = [
  { damp: 7, drag: 0.005, keep: 0.14, keepTip: 0.022, rub: 0.45, weight: 30 },
  { damp: 5.5, drag: 0.006, keep: 0.11, keepTip: 0.02, rub: 0.5, weight: 50 },
];
/** The most an ear's joint bends from its rest, radians: it bends along its length, never kinks. */
const EAR_BEND = 0.3;
/** And its root's swing from where it stands, held by the muscles at its base. */
const EAR_ROOT_BEND = 0.4;
/** And about the most it swings in a step of its chain, root to tip, radians. */
const EAR_SWING = 0.14;
/** Its tail: a short stiff puff that wobbles. */
const TAIL: Stuff = { damp: 4.5, drag: 0.004, keep: 0.09, keepTip: 0.09, rub: 0.3, weight: 0 };
/** How quickly its head turns to where it's going. */
const GAZE_RATE = 9;
/** How far its head turns from its body, either way. */
const NECK_TURN = 1;
/** Its body's wobble: how fast, and how soon it dies. */
const WOBBLE = { damping: 0.4, hertz: 6 } as const;

/** A point on the screen as a spot of its ground, in its own pixels: drawn `SIZE` times bigger. */
const groundOf = (at: Point): Spot => ({ x: at.x / SIZE, z: at.y / (SIN * SIZE) });

export const createBunny = (at: Point): Bunny => {
  const seed = Math.round(at.x * 7919 + at.y * 13);
  const walker = createWalker(at, GAIT);
  // A three-quarter view, toward the camera, to begin with.
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

/** Which way it'd stand: to the mouse; settled, no further from the camera than three-quarters on. */
const faceOf = (bunny: Bunny, pointer: Point) => {
  const { hopper, walker } = bunny;
  const goal = faceGoal({ ...walker, speed: 0 }, pointer, hopper.heading, 0);
  if (walker.still < SETTLING_S || Math.sin(goal) >= Math.cos(SETTLED_TURN)) {
    return goal;
  }
  return Math.PI / 2 + (Math.cos(goal) >= 0 ? -SETTLED_TURN : SETTLED_TURN);
};

/** Where it'd hop to, and which way it'd turn to stood there: null, it's to stay as it is. */
const wantOf = (bunny: Bunny, pointer: Point, resting: boolean, dozing: boolean) => {
  const { act, walker } = bunny;
  if (KEPT.has(act)) {
    return { face: null, target: null };
  }
  // Petted (a mouse resting on it), it stays, turned round to the camera to see who's petting it;
  // a mouse on it at all, it won't hop off from under it.
  if (resting || isOn(bunny, pointer)) {
    const face =
      bunny.petted > 0.2 && act === "none"
        ? Math.PI / 2 + (Math.cos(bunny.hopper.heading) >= 0 ? -PETTED_TURN : PETTED_TURN)
        : null;
    return { face, target: null };
  }
  const spot = spotOf(walker, GAIT, pointer);
  const face = dozing || act !== "none" ? null : faceOf(bunny, pointer);
  // Its spot swinging round behind a mouse that's turned back, it won't hop away from the mouse to
  // get there: it waits, turned to the mouse, till its spot's come round.
  const toSpot = { x: spot.x - walker.x, y: (spot.y - walker.y) / SIN };
  const toMouse = { x: pointer.x - walker.x, y: (pointer.y - walker.y) / SIN };
  const away =
    toSpot.x * toMouse.x + toSpot.y * toMouse.y < 0 &&
    Math.hypot(toMouse.x, toMouse.y) > AWAY_FROM_MOUSE;
  return {
    face: away ? faceOf(bunny, pointer) : face,
    target: away ? null : groundOf(spot),
  };
};

/** Whether it's somewhere to go: far enough from where it'd be that it'll hop. */
const isLeaving = (bunny: Bunny, target: Spot | null) => {
  const { at } = bunny.hopper;
  return target !== null && Math.hypot(target.x - at.x, target.z - at.z) > SET_OFF;
};

/** What it's up to: dozing or not, and its next bit of business when it's idle. */
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
  if (idle > 0.8 && bunny.next <= 0) {
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
    // The moment a petting counts, it answers it, whatever it was saying: a binky, unless it's in one.
    if (reached(bunny.petted, seconds, PETTED_S)) {
      say(emotes, PET, true);
      if (bunny.act !== "binky") {
        begin(bunny, "binky");
      }
    }
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, CHATTER);
  }
};

/** How far into an act it is, 0 to 1, eased in and out over its first and last `edge`. */
const envelope = (bunny: Bunny, act: Act, edge = 0.2) => {
  if (bunny.act !== act) {
    return 0;
  }
  const t = bunny.actFor / ACT_S[act];
  return smooth(Math.min(t, 1 - t) / edge);
};

/** Every part after where it's going, on its spring. */
const stepRig = (bunny: Bunny, dozing: boolean, leaving: boolean, seconds: number) => {
  const { rig } = bunny;
  const stand = envelope(bunny, "stand");
  const groom = envelope(bunny, "groom");
  const sniff = envelope(bunny, "sniff");
  const alert = bunny.act === "thump" ? thumpAt(bunny.actFor).alert : 0;
  // Bounding along or toward the camera it lays its ears back; bounding away, they'd point at the camera, so not.
  const along = Math.min(1, 1 + Math.sin(bunny.hopper.heading));
  const leap = (bunny.hopper.leap?.size ?? 0) * along;
  // Somewhere to go, it drops onto all fours at once.
  const down = leaving ? 2.5 : 1;
  stepSpring(rig.stand, Math.min(1, stand + 0.3 * groom + 0.35 * alert), 6 * down, seconds);
  stepSpring(rig.groom, groom, 8 * down, seconds);
  stepSpring(rig.sniff, sniff, 7, seconds);
  stepSpring(rig.doze, dozing ? 1 : 0, dozing ? 1.5 : 8, seconds);
  // Content petted, but not while it's leaping for joy.
  stepSpring(rig.content, bunny.petted > 0.3 && bunny.act !== "binky" ? 1 : 0, 5, seconds);
  // Looking round, sat up.
  stepSpring(
    rig.look,
    stand * Math.sin((bunny.actFor / ACT_S.stand) * Math.PI * 2) * 0.75,
    6,
    seconds,
  );
  // Grooming, its head bobs to its paws as they scrub.
  const scrub = groom * 0.12 * Math.sin(bunny.time * 7);
  const nod = 0.12 * stand + 0.2 * alert - 0.5 * sniff - 0.4 * groom + scrub - 0.12 * rig.doze.x;
  stepSpring(rig.nod, Math.max(-0.5, Math.min(0.3, nod)), 8, seconds);
  // Ears back as it bounds, pricked up sat tall or alarmed, laid flat dozing or petted.
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

/** A knock to its body and ears: `stretch` its body's (+ stretched, - squashed), `ears` down on them. */
const knock = (bunny: Bunny, stretch: number, ears: number) => {
  bunny.squash.v += stretch;
  if (ears !== 0) {
    for (const ear of bunny.ears) {
      flickChain(ear, { x: 0, y: ears });
    }
  }
};

/** Its binky's and thump's beats: taking off and landing, and the stamp. */
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

/** Its hops on: planned as each lands, its body knocked as it takes off and lands. */
const stepHops = (bunny: Bunny, want: ReturnType<typeof wantOf>, seconds: number) => {
  const { hopper, walker } = bunny;
  const was = { x: walker.x, y: walker.y };
  const beats = stepHopper(hopper, seconds, () => {
    // A binky or a thump waiting, it stops here for it.
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
  // Its head turns ahead of its body to where this hop will face, smoothly.
  const { gaze } = bunny.rig;
  stepAngle(gaze, hopper.leap ? hopper.leap.turnTo : place.heading, GAZE_RATE, seconds);
  // No farther round than its neck turns: it never looks back over its shoulder the wrong way round.
  const lead = Math.atan2(Math.sin(gaze.x - place.heading), Math.cos(gaze.x - place.heading));
  if (Math.abs(lead) > NECK_TURN) {
    gaze.x = place.heading + Math.sign(lead) * NECK_TURN;
    gaze.v = 0;
  }
  // Stretched out in the air, its wobble round that.
  const goal = hopper.leap && isAirborne(hopper.u) ? 0.08 * hopper.leap.size : 0;
  stepJiggle(bunny.squash, goal, WOBBLE.hertz, WOBBLE.damping, seconds);
};

/** Its ears and tail after where they hang this frame, the air on them as it goes. */
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

/** Its breath, nose and ears, alive while it's still. */
const stepLife = (bunny: Bunny, seconds: number) => {
  const { rig, swivel } = bunny;
  const doze = rig.doze.x;
  // Breathing slower dozing; its nose twitching all the while it's awake, fast as it sniffs.
  bunny.breath += seconds * Math.PI * 2 * (0.45 - 0.2 * doze);
  bunny.twitch += seconds * (1 - doze) * (1 + 1.2 * rig.sniff.x);
  // Now and then, standing about, an ear swivels to a sound.
  swivel.for = Math.max(0, swivel.for - seconds);
  swivel.in -= seconds;
  if (swivel.in <= 0) {
    swivel.ear = bunny.random.chance(0.5) ? 0 : 1;
    swivel.for = isHopping(bunny) ? 0 : 0.9;
    swivel.in = 3 + bunny.random.next() * 5;
  }
};

export const stepBunny = (bunny: Bunny, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = bunny;
  const dt = Math.max(0, seconds);
  bunny.time += dt;
  walker.still = Math.hypot(moved.x, moved.y) < 0.5 ? walker.still + dt : 0;
  walker.back = turnBack(walker.back, moved, 80);
  // Petted (a mouse resting on it), it stays put.
  const resting = walker.still > RESTING_S && isOn(bunny, pointer);
  const idle = isHopping(bunny) ? 0 : walker.still;
  const dozing = idle > DOZE_S && bunny.petted === 0;
  const want = wantOf(bunny, pointer, resting, dozing);
  const leaving = isLeaving(bunny, want.target);
  stepActs(bunny, leaving, idle, dt);
  // Busy (sat up, sniffing, grooming), it stays, and gets down on all fours before it hops off; it turns round only between.
  const { rig } = bunny;
  const busy = bunny.act !== "none" || Math.max(rig.stand.x, rig.groom.x) > 0.04;
  stepHops(bunny, busy ? { face: null, target: null } : want, dt);
  // A hop round to face whoever's petting it is in place: the petting goes on through it.
  bunny.petted = resting ? bunny.petted + dt : 0;
  stepTalk(bunny, dozing, idle, dt);
  stepRig(bunny, dozing, leaving, dt);
  stepBeats(bunny, dt);
  stepLife(bunny, dt);
  bunny.version += 1;
  stepChains(bunny, dt);
  bunny.sides = sidesOf(bunny);
};

export const pokeBunny = (bunny: Bunny, at: Point) => {
  bunny.walker.still = Math.min(bunny.walker.still, 3);
  // In the air, a click goes by.
  if (bunny.act === "binky") {
    return;
  }
  if (isOn(bunny, at)) {
    say(bunny.emotes, BINKY, true);
    // Hopping, it binkies as it lands.
    if (isHopping(bunny)) {
      bunny.queued = "binky";
    } else {
      begin(bunny, "binky");
    }
  } else if (isHopping(bunny) && (bunny.hopper.leap?.size ?? 0) > 0) {
    // Hopping on its way, it startles: its ears flick and its tail flags, and it hops on.
    say(bunny.emotes, STARTLE, bunny.random.chance(0.5));
    knock(bunny, 0, -220);
  } else if (isHopping(bunny)) {
    // Hopping round where it stands, it turns, then thumps.
    say(bunny.emotes, THUMP, bunny.random.chance(0.4));
    bunny.queued = "thump";
  } else if (bunny.act !== "thump") {
    // Standing, it always thumps; it only sometimes says so.
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
