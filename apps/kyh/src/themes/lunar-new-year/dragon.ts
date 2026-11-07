// The dragon that follows a mouse about at Lunar New Year, for `follower.tsx`:
// a festival dragon built in the round (`dragon-pose.ts`, `dragon-body.ts`) and
// seen from a little above, so it turns through every view. It swims
// (`dragon-swim.ts`), going only along its nose: after a moving mouse it weaves
// along behind it, and a resting mouse is the pearl it circles, watching it and
// snapping at it now and then, shaking its mane, puffing smoke, looking round.
// Nothing about a mouse can swing it about: a nudge moves the circle a little,
// and a reversal is a curve. Left long enough it spirals in round the pearl
// and coils up on it, chin down, eyes shut, facing the visitor, and breathes. A
// mouse come to rest on it and it stops for that, leans in and shuts its eyes;
// a click on it and it turns to the visitor and roars a greeting; a click
// elsewhere and it lunges there. Its whiskers, beard, mane, the tuft at its
// tail and its tail's last stretch are chains (`../follower/chain.ts`); every
// other part eases on a spring (`../follower/solid.ts`). Pure (state is stepped
// in place, for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Chain, Stuff } from "../follower/chain";
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Spring } from "../follower/solid";
import type { Point } from "../follower/walk";
import type { Stacking } from "./dragon-pose";
import type { Course, Swim } from "./dragon-swim";
import { flickChain, stepChain } from "../follower/chain";
import { createEmotes, PETTED_S, reached, say, sayWithHeart, stepEmotes } from "../follower/emote";
import {
  headingOf,
  PITCH,
  smooth,
  springAt,
  stepAngle,
  stepSpring,
  toScreen,
} from "../follower/solid";
import { REACH } from "./dragon-body";
import {
  dragonPose,
  hangsOf,
  isOn,
  LOCKS,
  noseAt,
  stackingOf,
  tailHangOf,
  TUFTS,
} from "./dragon-pose";
import { createSwim, MOST_TURN, STEP, stepSwim, topOf, wrap } from "./dragon-swim";
import { trailAt } from "./dragon-trail";

/** A moment's business, circling or held: a snap at the pearl, a shake of its mane, a puff of smoke, a look round, a tight curl over its own body. */
type Act = "none" | "snap" | "shake" | "puff" | "gaze" | "curl";
const ACT_S: Record<Act, number> = {
  curl: 1.15,
  gaze: 2.2,
  none: 0,
  puff: 1.1,
  shake: 0.9,
  snap: 0.42,
};
const IDLE: readonly Act[] = ["snap", "shake", "puff", "gaze", "curl", "snap", "puff", "curl"];

/** Each part's spring: where it's going, and how fast it gets there. */
interface Rig {
  /** The way its neck points, its heading smoothed: its head doesn't wag with its weave. */
  aim: Spring;
  /** Its head turned off that (radians, toward the camera +), nodded (+ up) and tipped (+ its top to its left). */
  look: Spring;
  nod: Spring;
  tip: Spring;
  /** Pixels its head's raised off the trail and thrust forward along its nose. */
  rear: Spring;
  reach: Spring;
  /** 0 to 1: its jaw open; dozing; eyes shut happy. */
  jaw: Spring;
  doze: Spring;
  content: Spring;
}

/** A knock that rings: its fins' lean, swung past upright on a stop. */
interface Swing {
  x: number;
  v: number;
}

/** Its coil: not coiling; waiting to come round to start; winding in; wound. */
type Coil = "none" | "waiting" | "winding" | "wound";

interface Puff extends Point {
  age: number;
  life: number;
  /** Pixels a second on the screen: it leaves with the dragon's way, so its head doesn't swim into it. */
  away: Point;
}

/** Where it's lunging on the ground, and seconds yet of it. */
interface Lunge {
  left: number;
  x: number;
  z: number;
}

export interface Dragon {
  swim: Swim;
  rig: Rig;
  /** Seconds not yet stepped, and the move of the pointer not yet stepped through. */
  owed: number;
  owedMove: Point;
  owedSpan: number;
  /** Where the pointer was when it was last stepped. */
  pointer: Point;
  /** The pointer's pace (pixels a second on the screen), smoothed; and 0 to 1 how much it's chasing it, not circling. */
  pace: Point;
  chase: Spring;
  /** Which way from the pointer it swims, chasing. */
  back: Point;
  /** Which way round the pearl it circles (1 its heading rising). */
  way: 1 | -1;
  still: number;
  /** A mouse's wandering while it's coiled, up to what wakes it. */
  stir: number;
  /** Whether a mouse came to rest on it, and seconds it's rested there. */
  held: boolean;
  petted: number;
  /** Seconds yet of its roar of greeting, once it's turned to the visitor for it; seconds it's owed that. */
  greet: number;
  greetDue: number;
  lunge: Lunge | null;
  coil: Coil;
  /** Pixels of its spiral it's wound. */
  wound: number;
  act: Act;
  actFor: number;
  next: number;
  side: 1 | -1;
  /** 0 to 1: its eyes shut in a blink, and seconds till its next. */
  blink: number;
  nextBlink: number;
  /** Where its waves are, radians, and its fins' lean and ripple. */
  wave: number;
  lean: Swing;
  ripple: number;
  /** 0 to 1: its legs tucked back; its mane hanging, not streaming. */
  tuck: number;
  limp: number;
  /** How far ahead of its last step it's drawn, pixels on the screen: a short frame isn't a stutter. */
  lead: Point;
  puffs: Puff[];
  steps: number;
  time: number;
  tail: Chain;
  whiskers: Chain[];
  mane: Chain[];
  beard: Chain;
  tufts: Chain[];
  stacking: Stacking;
  /** Seconds since its layers last changed places. */
  stacked: number;
  emotes: Emotes;
  random: Random;
}

const GREETING = ["新年快乐!", "恭喜发财!", "Happy Lunar New Year!", "Gong hei fat choy!"];
const LUNGE = ["rawr!", "*snap*"];
const CHATTER = ["*rawr*", "红包?", "Happy New Year!", "the pearl is mine!"];
const PET = ["♥", "*rumble* ♥", "♥ ♥"];
const SLEEP = ["z z z"];

const SIN = Math.sin(PITCH);
/** How far behind the pointer it swims, pixels on the screen. */
const BEHIND = 46;
/** Pixels of the pointer's way it takes to turn behind it. */
const BACK_TURNS = 60;
/** The pearl's circle (ground pixels), and how fast it goes round it. */
const ORBIT = 58;
const CRUISE = 88;
/** Screen pixels a second of the pointer's pace from which it follows, and by which it's all chasing. */
const CHASE_FROM = 45;
const CHASE_BY = 165;
/** How hard it closes on its spot, a second. */
const CLOSES = 2.4;
/** How tight it turns, swimming and coiling, and how far it weaves off its way. */
const RADIUS = 30;
const COIL_RADIUS = 9;
const CURL_RADIUS = 14.5;
const CURL_SPEED = 96;
const WEAVE = 0.42;
const CIRCLE_WEAVE = 0.1;
/** Seconds of a still pointer before it coils up. */
const DOZE_S = 30;
/** Its coil: the circle it winds down to, how far it winds, how fast, and how high it ends up. */
const COIL = 14;
const COIL_LENGTH = 300;
const COIL_CRUISE = 40;
const COIL_HEIGHT = 11;
/** Pixels of mouse that wake it. */
const WAKES = 14;
/** How far round its spiral takes it: where it starts, so it ends facing the visitor. */
const SPIRAL = (() => {
  let turned = 0;
  for (let along = 0; along < COIL_LENGTH; along += 1) {
    const t = smooth(along / COIL_LENGTH);
    turned += 1 / (ORBIT + (COIL - ORBIT) * t);
  }
  return turned;
})();
/** Seconds of a mouse at rest on it before it stops for it, and up to which it's a mouse that came to it, not one it swam under. */
const REST_S = 0.025;
const ARRIVED_S = 0.3;
const GREET_S = 1.7;
const GREET_OPENS_S = 0.3;
/** A lunge: seconds of it at most; how near its nose counts as a bite; the tightest it turns for it; and how near it just snaps, ground pixels. */
const LUNGE_S = 1.3;
const BITES = 16;
const LUNGE_RADIUS = 20;
const LUNGE_WIDEST = 30;
const SNAPS_WITHIN = 34;
const SNAPS_BEHIND_WITHIN = 100;
/** Pixels of the way it clears its own body by, going over it. */
const CLEARS = 14;
/** How far its head turns off its neck, at most, and snapping at something. */
const MOST_LOOK = 1.5;
const SNAP_LOOK = 1.8;
const LOOK_REACH = 0.9;
/** Seconds its layers keep their places at least, once changed: nothing flickers. */
const STACK_S = 0.15;
const MOST_STEP = 0.05;
const MOST_OWED = 0.1;
/** Its fins' swing: how fast it rings, and how little it's damped. */
const SWING_HZ = 2.1;
const SWING_DAMPING = 0.28;

/** Its chains: its whiskers fine and quick on the air; its mane, beard and tuft a little heavier. */
const WHISKER: Stuff = { damp: 5, drag: 0.016, keep: 0.05, keepTip: 0.006, rub: 0.6, weight: 30 };
const LOCK: Stuff = { damp: 5, drag: 0.012, keep: 0.06, keepTip: 0.008, rub: 0.6, weight: 150 };
const BEARD: Stuff = { damp: 6, drag: 0.01, keep: 0.08, keepTip: 0.012, rub: 0.5, weight: 240 };
const TUFT: Stuff = { damp: 5, drag: 0.012, keep: 0.05, keepTip: 0.008, rub: 0.6, weight: 90 };
const TAIL: Stuff = { damp: 6, drag: 0.004, keep: 0.1, keepTip: 0.03, rub: 0.3, weight: 0 };

const clamp = (value: number, most: number) => Math.max(-most, Math.min(most, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const emptyChain = (): Chain => ({ knots: [], owed: 0 });

const createDragon = (at: Point): Dragon => {
  const seed = Math.round(at.x * 7919 + at.y * 7);
  const heading = 0.5;
  const swim = createSwim(at.x - BEHIND, at.y / SIN, heading, REACH);
  return {
    act: "none",
    actFor: 0,
    back: { x: -1, y: 0 },
    beard: emptyChain(),
    blink: 0,
    chase: springAt(0),
    coil: "none",
    emotes: createEmotes(seed),
    greet: 0,
    greetDue: 0,
    held: false,
    lead: { x: 0, y: 0 },
    lean: { v: 0, x: 0 },
    limp: 1,
    lunge: null,
    mane: Array.from({ length: LOCKS }, emptyChain),
    next: 2,
    nextBlink: 2,
    owed: 0,
    owedMove: { x: 0, y: 0 },
    owedSpan: 0,
    pace: { x: 0, y: 0 },
    petted: 0,
    pointer: at,
    puffs: Array.from({ length: 4 }, () => ({
      age: 0,
      away: { x: 0, y: 0 },
      life: 0,
      x: 0,
      y: 0,
    })),
    random: createRandom(seed + 1),
    rig: {
      aim: springAt(heading),
      content: springAt(0),
      doze: springAt(0),
      jaw: springAt(0),
      look: springAt(0),
      nod: springAt(0),
      reach: springAt(0),
      rear: springAt(0),
      tip: springAt(0),
    },
    ripple: 0,
    side: 1,
    stacked: 0,
    stacking: { body: [], fins: [], head: [], legs: [] },
    steps: 0,
    still: 0,
    stir: 0,
    swim,
    tail: emptyChain(),
    time: 0,
    tuck: 0,
    tufts: Array.from({ length: TUFTS }, emptyChain),
    wave: 0,
    way: 1,
    whiskers: [emptyChain(), emptyChain()],
    wound: 0,
  };
};

/** The way round to the pearl: into the circle from outside, out from inside, along it on it. */
const circling = (swim: Swim, x: number, z: number, radius: number, way: 1 | -1) => {
  const dx = x - swim.x;
  const dz = z - swim.z;
  const off = Math.hypot(dx, dz) || 1;
  const inward = clamp((off - radius) / Math.max(radius * 0.8, 14), 1);
  const heading = Math.atan2(dz, dx) - way * (Math.PI / 2) * (1 - inward * 0.85);
  return { heading, off };
};

/** The heading and speed it wants after the pointer, as one moving vector. */
const chasing = (dragon: Dragon, at: Point) => {
  const { back, pace, swim } = dragon;
  const spotX = at.x + back.x * BEHIND;
  const spotZ = (at.y + back.y * BEHIND) / SIN;
  return {
    x: pace.x + CLOSES * (spotX - swim.x),
    z: pace.y / SIN + CLOSES * (spotZ - swim.z),
  };
};

const courseOfCircle = (dragon: Dragon, at: Point): Course => {
  const { chase, swim, way, wound } = dragon;
  const winding = smooth(wound / COIL_LENGTH);
  const radius = mix(ORBIT, COIL, winding);
  const round = circling(swim, at.x, at.y / SIN, radius, way);
  const cruise = mix(CRUISE, COIL_CRUISE, winding);
  const hurry = cruise + CLOSES * Math.max(0, round.off - radius * 1.15);
  const orbit = {
    x: Math.cos(round.heading) * hurry,
    z: Math.sin(round.heading) * hurry,
  };
  const follow = chasing(dragon, at);
  const x = mix(orbit.x, follow.x, chase.x);
  const z = mix(orbit.z, follow.z, chase.x);
  const speed = Math.hypot(x, z);
  return {
    heading: Math.atan2(z, x),
    height: COIL_HEIGHT * winding,
    radius: mix(RADIUS, COIL_RADIUS, winding),
    speed: Math.min(topOf(swim.heading), Math.max(mix(CRUISE * 0.8, COIL_CRUISE, winding), speed)),
    weave: mix(CIRCLE_WEAVE * (1 - winding), WEAVE, chase.x * smooth(swim.speed / 300)),
  };
};

/** Which way it faces to greet the visitor: three-quarters to the camera, on the side it already faces. */
const facedHeading = (heading: number) => (Math.cos(heading) >= 0 ? 0.95 : Math.PI - 0.95);

/** A dart at the click: the one arc through it, as fast as that arc can be swum, so it arrives. Behind it, the tightest way round. */
const courseOfLunge = (swim: Swim, lunge: Lunge): Course => {
  const dx = lunge.x - swim.x;
  const dz = lunge.z - swim.z;
  const heading = Math.atan2(dz, dx);
  const off = Math.abs(wrap(heading - swim.heading));
  const arc = Math.hypot(dx, dz) / (2 * Math.max(0.02, Math.sin(Math.min(off, Math.PI / 2))));
  const tight = Math.max(LUNGE_RADIUS, Math.min(arc, LUNGE_WIDEST));
  // Well off its nose it comes round first, so a far click isn't a sweep the wrong way.
  const radius = mix(Math.max(arc, LUNGE_RADIUS), tight, smooth((off - 0.5) / 0.6));
  const speed = Math.min(topOf(swim.heading) * 1.3, radius * MOST_TURN);
  return { heading, height: 0, radius, speed, weave: 0 };
};

const courseOf = (dragon: Dragon, at: Point): Course => {
  const { act, coil, greet, greetDue, held, lunge, swim } = dragon;
  const stopped = { heading: swim.heading, height: swim.h.x, radius: RADIUS, speed: 0, weave: 0 };
  if (coil === "wound") {
    return stopped;
  }
  if (lunge) {
    return courseOfLunge(swim, lunge);
  }
  if (greetDue > 0 || greet > 0) {
    const heading = facedHeading(swim.heading);
    const turned = Math.abs(wrap(heading - swim.heading)) < 0.4;
    return turned ? stopped : { ...stopped, heading, radius: 16, speed: 80 };
  }
  if (held) {
    return stopped;
  }
  if (act === "curl") {
    // Round a full turn tighter than its body's long: its head goes over the rest of it.
    const heading = swim.heading + dragon.way * 1.4;
    return { heading, height: 0, radius: CURL_RADIUS, speed: CURL_SPEED, weave: 0 };
  }
  return courseOfCircle(dragon, at);
};

/** How far it must rise to go over its own body, if that's in its way: so the coil's over and under are true. */
const clearing = (swim: Swim) => {
  const aheadX = swim.x + Math.cos(swim.heading) * 12;
  const aheadZ = swim.z + Math.sin(swim.heading) * 12;
  let height = 0;
  for (let behind = 40; behind < REACH - 16; behind += 6) {
    const mark = swim.trail.marks.length > 0 ? trailAt(swim.trail, behind) : swim.trail.head;
    if (Math.hypot(mark.x - aheadX, mark.z - aheadZ) < 16) {
      height = Math.max(height, mark.h + CLEARS);
    }
  }
  return height;
};

/** Which way from the pointer it swims, turned back along the way the pointer's going: by distance, so a nudge barely turns it. */
const stepBack = (dragon: Dragon, move: Point) => {
  const gone = Math.hypot(move.x, move.y) * STEP;
  if (gone === 0) {
    return;
  }
  const from = Math.atan2(dragon.back.y, dragon.back.x);
  const turn = wrap(Math.atan2(-move.y, -move.x) - from);
  const angle = from + turn * (1 - Math.exp(-gone / BACK_TURNS));
  dragon.back = { x: Math.cos(angle), y: Math.sin(angle) };
};

/** Which way round the pearl it'll circle: the way it's already going, held once it's circling. */
const stepWay = (dragon: Dragon, pointer: Point) => {
  const { chase, swim } = dragon;
  if (chase.x < 0.85) {
    return;
  }
  const dx = pointer.x - swim.x;
  const dz = pointer.y / SIN - swim.z;
  const across = Math.cos(swim.heading) * dz - Math.sin(swim.heading) * dx;
  const off = Math.hypot(dx, dz) || 1;
  if (Math.abs(across / off) > 0.3) {
    dragon.way = across > 0 ? 1 : -1;
  }
};

/** Its lunge ends at the bite, its jaw shutting as the spring lets go; or past the click, if it missed. */
const stepLunge = (dragon: Dragon) => {
  const { lunge, swim } = dragon;
  if (!lunge) {
    return;
  }
  lunge.left -= STEP;
  const dx = lunge.x - swim.x;
  const dz = lunge.z - swim.z;
  const off = Math.hypot(dx, dz);
  const past = off < BITES * 3 && Math.abs(wrap(Math.atan2(dz, dx) - swim.heading)) > 1.6;
  if (lunge.left <= 0 || off < BITES || past) {
    dragon.lunge = null;
  }
};

/** One fixed step of its swim, the pointer where it was this far through the frame. */
const stepOnce = (dragon: Dragon, at: Point, move: Point) => {
  const { chase, lean, pace, swim } = dragon;
  stepLunge(dragon);
  stepBack(dragon, move);
  stepWay(dragon, at);
  const closes = 1 - Math.exp(-7 * STEP);
  pace.x += (move.x - pace.x) * closes;
  pace.y += (move.y - pace.y) * closes;
  const paced = smooth((Math.hypot(pace.x, pace.y) - CHASE_FROM) / (CHASE_BY - CHASE_FROM));
  stepSpring(chase, dragon.coil === "winding" ? 0 : paced, 6, STEP);
  const course = courseOf(dragon, at);
  const height = Math.max(course.height, clearing(swim));
  stepSwim(swim, { ...course, height }, STEP);
  stepAngle(dragon.rig.aim, swim.heading, 11, STEP);
  if (dragon.coil === "winding") {
    dragon.wound = Math.min(COIL_LENGTH, dragon.wound + swim.speed * STEP);
  }
  // Its fins swing on: lean into the speed, and past upright as it stops.
  const omega = Math.PI * 2 * SWING_HZ;
  const goal = Math.min(1, swim.speed / 320);
  lean.v += (-omega * omega * (lean.x - goal) - 2 * SWING_DAMPING * omega * lean.v) * STEP;
  lean.x += lean.v * STEP;
};

const toScreenLead = (heading: number, by: number): Point =>
  toScreen([Math.cos(heading) * by, 0, Math.sin(heading) * by]);

/** Its swim this frame, in fixed steps, whatever the frame's length. */
const stepSwimming = (dragon: Dragon, pointer: Point, moved: Point, seconds: number) => {
  dragon.owedMove = { x: dragon.owedMove.x + moved.x, y: dragon.owedMove.y + moved.y };
  dragon.owedSpan += seconds;
  dragon.owed = Math.min(dragon.owed + seconds, MOST_OWED);
  const steps = Math.floor(dragon.owed / STEP);
  if (steps > 0) {
    dragon.owed -= steps * STEP;
    const from = dragon.pointer;
    const span = Math.max(dragon.owedSpan, STEP);
    const move = { x: dragon.owedMove.x / span, y: dragon.owedMove.y / span };
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const at = { x: mix(from.x, pointer.x, t), y: mix(from.y, pointer.y, t) };
      stepOnce(dragon, at, move);
    }
    dragon.pointer = pointer;
    dragon.owedMove = { x: 0, y: 0 };
    dragon.owedSpan = 0;
  }
  const { heading, speed } = dragon.swim;
  // A frame's leftover, carried on along its way in the drawing so a short frame doesn't stutter.
  const carried = speed * dragon.owed;
  dragon.lead = toScreenLead(heading, carried);
};

/** Left long enough it comes round to where its spiral ends facing the visitor, winds in, and is wound. */
const stepCoil = (dragon: Dragon, pointer: Point) => {
  const { swim } = dragon;
  if (dragon.still < DOZE_S) {
    dragon.coil = "none";
    dragon.wound = 0;
    return;
  }
  if (dragon.coil === "none") {
    dragon.coil = "waiting";
    dragon.act = "none";
  }
  if (dragon.coil === "waiting") {
    const start = Math.PI / 2 - dragon.way * SPIRAL;
    const off = Math.hypot(pointer.x - swim.x, (pointer.y - swim.z * SIN) / SIN);
    if (Math.abs(wrap(start - swim.heading)) < 0.12 && Math.abs(off - ORBIT) < ORBIT * 0.3) {
      dragon.coil = "winding";
    }
  }
  if (
    dragon.coil === "winding" &&
    dragon.wound >= COIL_LENGTH &&
    Math.abs(wrap(Math.PI / 2 - swim.heading)) < 0.2
  ) {
    dragon.coil = "wound";
  }
};

/** How it stands to the mouse this frame: left be or not, held by it, coiling or waking. */
const stepAttention = (dragon: Dragon, pointer: Point, moved: Point, seconds: number) => {
  const distance = Math.hypot(moved.x, moved.y);
  const asleep = dragon.coil === "wound";
  dragon.stir = Math.max(0, dragon.stir + distance - seconds * WAKES);
  const stirred = !asleep || dragon.stir > WAKES;
  if (distance >= 0.5 && stirred) {
    dragon.still = 0;
  } else if (distance < 0.5) {
    dragon.still += seconds;
  }
  const resting = distance < 0.5 && dragon.still > REST_S;
  if (dragon.held) {
    // A mouse stroking it, or nudged, is still on it: only moving off it lets it go.
    dragon.held = distance < 0.5 || isOn(dragon, pointer);
  } else if (resting && dragon.still < ARRIVED_S && !dragon.lunge && dragon.coil === "none") {
    dragon.held = isOn(dragon, pointer);
  }
  stepCoil(dragon, pointer);
};

/** How far into an act it is, eased in and out over its first and last fifth. */
const envelope = (dragon: Dragon, act: Act) => {
  if (dragon.act !== act) {
    return 0;
  }
  const t = dragon.actFor / ACT_S[act];
  return smooth(Math.min(t, 1 - t) * 5);
};

/** Its head's way to the visitor: three-quarters on, where the whole of its face shows. */
const visitorYaw = (heading: number) => (Math.cos(heading) >= 0 ? 1.1 : Math.PI - 1.1);

/** How far round from its way the mouse is, from its head. */
const mouseOff = ({ rig, swim }: Dragon, pointer: Point) => {
  const at = toScreen([swim.x, swim.h.x, swim.z]);
  return wrap(headingOf(pointer.x - at.x, pointer.y - at.y) - rig.aim.x);
};

/** The way to look: at the visitor greeting or dozing, else at the mouse, as far as its neck turns. */
const lookGoal = (dragon: Dragon, pointer: Point) => {
  const { rig, swim } = dragon;
  const yaw = rig.aim.x;
  if (dragon.greet > 0 || dragon.greetDue > 0 || dragon.coil === "wound" || dragon.held) {
    return clamp(wrap(visitorYaw(swim.heading) - yaw), MOST_LOOK);
  }
  const off = mouseOff(dragon, pointer);
  // Straight behind it, it looks ahead, so a mouse there doesn't swing its head from side to side.
  const snap = envelope(dragon, "snap");
  const fade = mix(1 - smooth((Math.abs(off) - 1.9) / 1), 1, snap);
  const gaze = dragon.act === "gaze" ? Math.sin((dragon.actFor / ACT_S.gaze) * Math.PI * 2) : 0;
  return clamp(off, mix(LOOK_REACH, SNAP_LOOK, snap)) * fade * (1 - Math.abs(gaze)) + gaze * 1.1;
};

const stepHead = (dragon: Dragon, pointer: Point, dt: number) => {
  const { rig, swim } = dragon;
  const striking = dragon.act === "snap" || dragon.lunge;
  stepSpring(rig.look, lookGoal(dragon, pointer), striking ? 20 : 8, dt);
  const roaring =
    dragon.greet > 0
      ? smooth((GREET_S - dragon.greet) / GREET_OPENS_S) * smooth(dragon.greet / 0.25)
      : 0;
  const snap = envelope(dragon, "snap");
  const shake = envelope(dragon, "shake");
  const petted = dragon.held ? 1 : 0;
  const content = dragon.petted > PETTED_S * 0.6 ? 1 : 0;
  const lunging = dragon.lunge ? 1 : 0;
  const coiled = rig.doze.x;
  const slope = (swim.h.x - trailAt(swim.trail, 14).h) / 14;
  // Seen from above, its face wants lifting to the camera, and turned away its nose wants dipping out of sight.
  const toCamera = Math.sin(rig.aim.x + rig.look.x);
  const held = toCamera > 0 ? 0.2 * toCamera : 0.32 * toCamera;
  const nod = held + clamp(slope, 0.5) * (1 - coiled) + 0.42 * roaring + 0.1 * content - 0.1 * snap;
  stepSpring(rig.nod, nod, 9, dt);
  const breath = 0.7 * coiled * Math.sin(dragon.time * 1.7);
  stepSpring(rig.rear, 9 * roaring + 1.5 * petted - 6 * coiled + breath, 10, dt);
  stepSpring(rig.reach, 6 * snap + 4 * lunging + 2 * content, 22, dt);
  const shaken = shake * 0.42 * Math.sin(dragon.actFor * 30);
  stepSpring(rig.tip, shaken + 0.26 * content * dragon.side, 18, dt);
  const open = Math.max(
    roaring,
    Math.sin(Math.min(1, dragon.actFor / ACT_S.snap) * Math.PI) * (dragon.act === "snap" ? 1 : 0),
    lunging * 0.8,
    0.28 * envelope(dragon, "puff"),
  );
  stepSpring(rig.jaw, open, 22, dt);
  stepSpring(rig.content, content, 8, dt);
  stepSpring(rig.doze, dragon.coil === "wound" ? 1 : 0, dragon.coil === "wound" ? 1.6 : 7, dt);
};

/** How much it's turned to the visitor: past 0, its face shows. */
const faceShown = (dragon: Dragon) => Math.sin(dragon.rig.aim.x + dragon.rig.look.x);

/** A click's roar waits till it's turned to the visitor: it says so at once, but never roars with its back to them. */
const stepGreeting = (dragon: Dragon, pointer: Point, seconds: number) => {
  const roaring = dragon.greet > 0;
  dragon.greet = Math.max(0, dragon.greet - seconds);
  // Its turn to roar can take it out from under a mouse that stays put.
  if (roaring && dragon.greet === 0 && !isOn(dragon, pointer)) {
    dragon.held = false;
  }
  dragon.greetDue = Math.max(0, dragon.greetDue - seconds);
  if (dragon.greetDue > 0 && faceShown(dragon) > 0.2) {
    dragon.greet = dragon.greetDue;
    dragon.greetDue = 0;
  }
};

const begin = (dragon: Dragon, act: Act) => {
  dragon.act = act;
  dragon.actFor = 0;
  dragon.side = dragon.random.chance(0.5) ? 1 : -1;
  if (act === "snap") {
    say(dragon.emotes, LUNGE);
  } else if (act === "shake") {
    for (const chain of [...dragon.mane, ...dragon.whiskers, dragon.beard]) {
      flickChain(chain, { x: 200 * dragon.side, y: -120 });
    }
  }
};

/** Smoke from its nose: a puff every so often through the act. */
const stepPuffs = (dragon: Dragon, dt: number) => {
  const { swim } = dragon;
  const spawn =
    dragon.act === "puff" &&
    Math.floor((dragon.actFor - dt) / 0.24) < Math.floor(dragon.actFor / 0.24);
  const slows = Math.exp(-2.2 * dt);
  for (const puff of dragon.puffs) {
    puff.age += dt;
    puff.away = { x: puff.away.x * slows, y: puff.away.y * slows };
    puff.y += (puff.away.y - 12) * dt;
    puff.x += (puff.away.x + Math.sin(puff.age * 4) * 4) * dt;
  }
  if (!spawn) {
    return;
  }
  const free = dragon.puffs.find(({ age, life }) => age >= life);
  if (free) {
    const nose = noseAt(dragon);
    const yaw = dragon.rig.aim.x + dragon.rig.look.x;
    const way = toScreenLead(swim.heading, swim.speed);
    const blown = toScreenLead(yaw, 26);
    free.age = 0;
    free.away = { x: way.x + blown.x, y: way.y + blown.y };
    free.life = 0.95;
    free.x = nose.x;
    free.y = nose.y;
  }
};

/** What it's up to circling, and its next bit of business. */
const stepActs = (dragon: Dragon, pointer: Point, seconds: number) => {
  dragon.actFor += seconds;
  const moved = dragon.act === "curl" && dragon.still < 0.05;
  if (dragon.act !== "none" && (dragon.actFor > ACT_S[dragon.act] || moved)) {
    dragon.act = "none";
  }
  stepPuffs(dragon, Math.min(seconds, MOST_STEP));
  if (dragon.held) {
    dragon.act = "none";
  }
  const free =
    dragon.act === "none" &&
    dragon.coil === "none" &&
    dragon.greet <= 0 &&
    dragon.greetDue <= 0 &&
    !dragon.held &&
    !dragon.lunge;
  if (!free || dragon.still < 1.2 || dragon.chase.x > 0.2) {
    return;
  }
  dragon.next -= seconds;
  if (dragon.next <= 0 && faceShown(dragon) > -0.1) {
    const act = dragon.random.pick(IDLE);
    // A snap swings its head to the mouse: at a mouse up the screen, that would be its back.
    const snapShows =
      Math.sin(dragon.rig.aim.x + clamp(mouseOff(dragon, pointer), SNAP_LOOK)) > 0.3;
    if (act !== "snap" || snapShows) {
      begin(dragon, act);
    }
    dragon.next = 1.6 + dragon.random.next() * 3.2;
  }
};

/** A mouse at rest on it: once it's been there a moment, it answers, whatever it's saying. */
const stepPetting = (dragon: Dragon, seconds: number) => {
  dragon.petted = dragon.held ? dragon.petted + seconds : 0;
  if (reached(dragon.petted, seconds, PETTED_S)) {
    sayWithHeart(dragon.emotes, PET);
  }
};

/** A blink now and then: shut and open again in a few frames. */
const BLINK_S = 0.16;
const stepBlink = (dragon: Dragon, dt: number) => {
  dragon.nextBlink -= dt;
  if (dragon.nextBlink <= 0) {
    dragon.nextBlink = dragon.random.range(1.8, 5.5);
  }
  dragon.blink =
    dragon.nextBlink < BLINK_S ? Math.sin((1 - dragon.nextBlink / BLINK_S) * Math.PI) : 0;
};

const stepTalk = (dragon: Dragon, seconds: number) => {
  stepEmotes(dragon.emotes, seconds);
  if (dragon.rig.doze.x > 0.6) {
    say(dragon.emotes, SLEEP);
  } else if (
    dragon.still > 2 &&
    dragon.coil === "none" &&
    !dragon.held &&
    dragon.random.chance(seconds * 0.12)
  ) {
    say(dragon.emotes, CHATTER);
  }
};

const stepChains = (dragon: Dragon, seconds: number) => {
  stepChain(dragon.tail, tailHangOf(dragon), TAIL, seconds);
  const { beard, mane, tufts, whiskers } = hangsOf(dragon);
  stepChain(dragon.beard, beard, BEARD, seconds);
  for (const [index, chain] of dragon.whiskers.entries()) {
    const hang = whiskers[index];
    if (hang) {
      stepChain(chain, hang, WHISKER, seconds);
    }
  }
  for (const [index, chain] of dragon.mane.entries()) {
    const hang = mane[index];
    if (hang) {
      stepChain(chain, hang, LOCK, seconds);
    }
  }
  for (const [index, chain] of dragon.tufts.entries()) {
    const hang = tufts[index];
    if (hang) {
      stepChain(chain, hang, TUFT, seconds);
    }
  }
};

const sameStacking = (a: Stacking, b: Stacking) =>
  a.body.join(" ") === b.body.join(" ") &&
  a.fins.join(" ") === b.fins.join(" ") &&
  a.head.join(" ") === b.head.join(" ") &&
  a.legs.join(" ") === b.legs.join(" ");

const stepDragon = (dragon: Dragon, pointer: Point, moved: Point, seconds: number) => {
  const dt = Math.min(Math.max(0, seconds), MOST_STEP);
  dragon.time += dt;
  dragon.wave += dt * (1.7 + dragon.swim.speed * 0.012);
  stepGreeting(dragon, pointer, seconds);
  stepAttention(dragon, pointer, moved, seconds);
  stepSwimming(dragon, pointer, moved, Math.max(0, seconds));
  stepHead(dragon, pointer, dt);
  stepActs(dragon, pointer, seconds);
  stepPetting(dragon, seconds);
  stepBlink(dragon, dt);
  stepTalk(dragon, seconds);
  dragon.tuck = smooth(dragon.swim.speed / 170) * (1 - dragon.rig.doze.x);
  dragon.limp = 1 - smooth(dragon.swim.speed / 170);
  dragon.ripple = 0.5 * Math.sin(dragon.time * 5) * Math.min(1, dragon.swim.speed / 200);
  dragon.steps += 1;
  stepChains(dragon, seconds);
  dragon.stacked += seconds;
  if (dragon.stacked > STACK_S || dragon.steps === 1) {
    const stacking = stackingOf(dragon, dragon.steps > 1 ? dragon.stacking : null);
    if (!sameStacking(stacking, dragon.stacking)) {
      dragon.stacked = 0;
    }
    dragon.stacking = stacking;
  }
};

const pokeDragon = (dragon: Dragon, at: Point) => {
  dragon.still = 0;
  dragon.stir = 0;
  if (isOn(dragon, at)) {
    say(dragon.emotes, GREETING, true);
    if (dragon.greet > 0) {
      // Already roaring, it roars on: a second click doesn't shut its jaw to open it again.
      dragon.greet = Math.max(dragon.greet, GREET_S - GREET_OPENS_S);
    } else {
      dragon.greetDue = GREET_S;
    }
    dragon.act = "none";
    return;
  }
  const { swim } = dragon;
  const { x } = at;
  const z = at.y / SIN;
  const off = Math.hypot(x - swim.x, z - swim.z);
  const turn = wrap(Math.atan2(z - swim.z, x - swim.x) - swim.heading);
  // Close by, or just behind it where getting there is a loop, it snaps round at it from where it is.
  if (off < SNAPS_WITHIN || (off < SNAPS_BEHIND_WITHIN && Math.abs(turn) > 2.1)) {
    dragon.lunge = null;
    begin(dragon, "snap");
    return;
  }
  // The short way round, whatever it was turning: the long way is the whirl.
  swim.committed = turn >= 0 ? 1 : -1;
  dragon.lunge = { left: Math.min(LUNGE_S, 0.4 + off / 400 + Math.abs(turn) * 0.2), x, z };
  say(dragon.emotes, LUNGE, dragon.emotes.line === null && dragon.random.chance(0.3));
};

export const dragon: Creature<Dragon> = {
  create: createDragon,
  poke: pokeDragon,
  pose: dragonPose,
  step: stepDragon,
};
