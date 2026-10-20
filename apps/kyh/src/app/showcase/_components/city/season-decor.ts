// What the town puts out for the season (src/seasons): jack-o'-lanterns on
// the porches and graves in the gardens at Halloween, snowmen and trees on
// the square at Christmas. Each season decorates five kinds of spot the town
// leaves open: beside the cottages' doors, a garden's open corner, round the
// pond, the square and the ball courts, and the square's middle, for one
// giant piece (the town's tree at Christmas, a skeleton at Halloween). Drawn
// into a sketch of their own per view, so a season change swaps them without
// redrawing the town (engine.ts), and shown in color: the town is grey, its
// decorations aren't. What it does to the sky (the blimp's look, what flies
// over) is here too, drawn by blimp.ts and sky.ts. Pure.
import type { Random } from "@/lib/random";
import type { SeasonId } from "@/seasons/seasons";
import { createRandom, hashString } from "@/lib/random";
import { HEART } from "@/seasons/seasons";
import type { BlimpLook } from "./blimp";
import type { Kind } from "./open-spots";
import type { Emote } from "./overlay";
import type { Token } from "./palette";
import type { CityPlan } from "./plan";
import type { Flyer } from "./sky";
import type { Sketch } from "./sketch";
import type { Steps } from "./steps";
import { bunnyEars, heartCrest, lanterns, santaTrim, topHatTrim, witchTrim } from "./blimp";
import {
  balloon,
  christmasTree,
  cornShock,
  deadTree,
  eaveLights,
  egg,
  gravestone,
  GROUND,
  hayBale,
  lantern,
  lanternPost,
  potOfGold,
  present,
  pumpkin,
  rainbow,
  snowman,
} from "./decor-props";
import {
  fountainHeart,
  giantEgg,
  giantShamrock,
  giantSkeleton,
  giantTurkey,
  lanternGate,
  townTree,
} from "./decor-giants";
import { KINDS, openSpots } from "./open-spots";
import { GREEN, paint, PASTEL_ROOFS, RED, WHITE } from "./palette";
import { drawSleigh, drawWitch } from "./sky";
import { placed } from "./sketch";

/** How many spots are decorated between steps, when drawn over frames. */
const SPOTS_A_STEP = 12;

/** Something a season puts at one spot. */
type Prop = (sketch: Sketch, x: number, z: number, random: Random) => void;

/**
 * What a season puts out, by kind of spot; the lights it strings round every
 * cottage's eaves and along the blimp's back; what its people send up (life.ts
 * floats it); how the blimp looks and what else flies over (sky-scene.ts flies
 * both). A kind it leaves out stays bare.
 */
export interface Decor extends Partial<Record<Kind, Prop>> {
  lights?: readonly Token[];
  emote?: Emote;
  blimp?: BlimpLook;
  flyer?: Flyer;
}

/** An egg in a pastel, by a door or the pond. */
const pastelEgg: Prop = (sketch, x, z, random) => egg(sketch, x, z, random.pick(PASTEL_ROOFS));

/** Every season's decorations: keyed by season, so a new one isn't missed. */
export const DECOR: Record<SeasonId, Decor> = {
  christmas: {
    blimp: {
      banner: "festiveRed",
      fins: "festiveGreen",
      lettering: "white",
      text: "HO HO HO",
      trim: santaTrim,
    },
    centerpiece: townTree,
    flyer: drawSleigh,
    lights: ["festiveRed", "gold", "festiveGreen", "accentBlue"],
    porch: (sketch, x, z, random) => christmasTree(sketch, x, z, random, 0.42),
    square: (sketch, x, z, random) => {
      christmasTree(sketch, x, z, random, 1.25);
      present(sketch, x + 0.2, z + 0.16, RED);
      present(sketch, x - 0.18, z + 0.2, GREEN, 0.8);
    },
    yard: (sketch, x, z) => snowman(sketch, x, z),
  },
  classic: {},
  easter: {
    blimp: {
      banner: "accentPurple",
      fins: "accentPink",
      lettering: "white",
      text: "HAPPY EASTER",
      trim: bunnyEars,
    },
    centerpiece: giantEgg,
    lights: ["accentPink", "accentYellow", "accentTeal", "accentPurple"],
    porch: pastelEgg,
    shore: pastelEgg,
    square: (sketch, x, z, random) => {
      egg(sketch, x, z, random.pick(PASTEL_ROOFS), 3.2);
      egg(sketch, x + 0.22, z + 0.1, random.pick(PASTEL_ROOFS));
      egg(sketch, x - 0.2, z + 0.14, random.pick(PASTEL_ROOFS));
    },
    yard: (sketch, x, z, random) => {
      egg(sketch, x, z, random.pick(PASTEL_ROOFS));
      egg(sketch, x + 0.12, z + 0.06, random.pick(PASTEL_ROOFS));
      egg(sketch, x - 0.05, z + 0.13, random.pick(PASTEL_ROOFS));
    },
  },
  halloween: {
    blimp: {
      banner: "pumpkin",
      fins: "accentPurple",
      lettering: "screen",
      text: "BOO!",
      trim: witchTrim,
    },
    centerpiece: giantSkeleton,
    flyer: drawWitch,
    lights: ["pumpkin", "accentPurple"],
    porch: (sketch, x, z, random) => {
      pumpkin(sketch, x, z);
      if (random.chance(0.5)) {
        pumpkin(sketch, x - 0.1, z + 0.04, 0.7);
      }
    },
    shore: (sketch, x, z) => pumpkin(sketch, x, z, 0.9),
    square: (sketch, x, z, random) => {
      deadTree(sketch, x, z, random);
      gravestone(sketch, x - 0.22, z + 0.12);
      gravestone(sketch, x + 0.18, z + 0.16);
      pumpkin(sketch, x + 0.06, z + 0.24, 1.2);
    },
    yard: (sketch, x, z) => {
      gravestone(sketch, x - 0.08, z);
      gravestone(sketch, x + 0.1, z + 0.04);
    },
  },
  lunarNewYear: {
    blimp: {
      banner: "festiveRed",
      fins: "gold",
      lettering: "white",
      text: "HAPPY NEW YEAR",
      trim: lanterns,
    },
    centerpiece: lanternGate,
    lights: ["festiveRed", "festiveRed", "gold"],
    porch: (sketch, x, z) => lanternPost(sketch, x, z),
    shore: (sketch, x, z) => lanternPost(sketch, x, z, 0.3),
    square: (sketch, x, z) => {
      lanternPost(sketch, x - 0.15, z, 0.62);
      lantern(placed(sketch), [x + 0.1, GROUND + 0.25, z + 0.08], 1.6);
    },
  },
  stPatricks: {
    blimp: {
      banner: "festiveGreen",
      fins: "gold",
      lettering: "gold",
      text: "LUCKY",
      trim: topHatTrim("festiveGreen", "screen"),
    },
    centerpiece: giantShamrock,
    lights: ["festiveGreen", "gold"],
    porch: (sketch, x, z, random) => {
      if (random.chance(0.4)) {
        potOfGold(sketch, x, z);
      }
    },
    square: (sketch, x, z) => {
      potOfGold(sketch, x - 0.35, z);
      rainbow(sketch, x - 0.35, z, 0.4);
    },
  },
  thanksgiving: {
    blimp: {
      banner: "pumpkin",
      fins: "festiveRed",
      lettering: "white",
      text: "GIVE THANKS",
      trim: topHatTrim("screen", "screen"),
    },
    centerpiece: giantTurkey,
    lights: ["pumpkin", "gold", "festiveRed"],
    porch: (sketch, x, z) => {
      pumpkin(sketch, x, z);
      pumpkin(sketch, x - 0.09, z + 0.05, 0.6);
    },
    shore: (sketch, x, z) => pumpkin(sketch, x, z, 0.9),
    square: (sketch, x, z) => {
      hayBale(sketch, x - 0.12, z);
      hayBale(sketch, x + 0.12, z);
      hayBale(sketch, x, z, GROUND + 0.1);
      cornShock(sketch, x + 0.3, z - 0.1);
      pumpkin(sketch, x - 0.05, z + 0.17, 1.1);
    },
    yard: (sketch, x, z) => {
      hayBale(sketch, x, z);
      pumpkin(sketch, x + 0.02, z + 0.12, 0.8);
    },
  },
  valentines: {
    blimp: {
      banner: "accentPink",
      fins: "festiveRed",
      lettering: "white",
      text: "BE MINE",
      trim: heartCrest,
    },
    centerpiece: fountainHeart,
    emote: { d: HEART, fill: "#ff4f7b" },
    lights: ["festiveRed", "accentPink", "white"],
    porch: (sketch, x, z, random) => {
      if (random.chance(0.6)) {
        balloon(sketch, x, z, 0.3, random.pick([RED, paint("accentPink")]));
      }
    },
    square: (sketch, x, z, random) => {
      for (const [dx, dz, height] of [
        [0, 0, 0.55],
        [0.06, 0.04, 0.45],
        [-0.05, 0.05, 0.5],
        [0.03, -0.06, 0.4],
        [-0.04, -0.03, 0.62],
      ] as const) {
        balloon(sketch, x + dx, z + dz, height, random.pick([RED, paint("accentPink"), WHITE]));
      }
    },
  },
};

/**
 * The season's decorations, drawn into a sketch: the same ones in every view,
 * since each kind of spot gets its own stream of chances.
 * @yields {void} every few spots, so it can be spread over frames.
 */
export const decorSteps = function* decorSteps(
  sketch: Sketch,
  plan: CityPlan,
  season: SeasonId,
): Steps<void> {
  const decor = DECOR[season];
  const spots = openSpots(plan);
  for (const kind of KINDS) {
    const prop = decor[kind];
    if (!prop) {
      continue;
    }
    const random = createRandom(hashString(`${season}:${kind}`));
    for (const [index, [x, z]] of spots[kind].entries()) {
      prop(sketch, x, z, random);
      if (index % SPOTS_A_STEP === SPOTS_A_STEP - 1) {
        yield;
      }
    }
    yield;
  }
  if (decor.lights) {
    for (const [index, house] of spots.houses.entries()) {
      eaveLights(sketch, house, decor.lights);
      if (index % SPOTS_A_STEP === SPOTS_A_STEP - 1) {
        yield;
      }
    }
  }
};
