import type { Random } from "@/lib/random";
import type { ThemeId } from "@/themes";
import { createRandom, hashString } from "@/lib/random";
import { themeOf } from "@/themes";
import { TOWNS } from "@/themes/towns";
import type { BlimpLook } from "./blimp";
import type { Kind } from "./open-spots";
import type { Emote } from "./overlay";
import type { Repaint, Scheme, Time, Token } from "./palette";
import type { CityPlan } from "./plan";
import type { Flyer } from "./sky";
import type { Placed, Sketch } from "./sketch";
import type { Steps } from "./steps";
import { eaveLights } from "./decor-props";
import { KINDS, openSpots } from "./open-spots";

const SPOTS_A_STEP = 12;

/** Something a theme puts at one spot. */
export type Prop = (sketch: Sketch, x: number, z: number, random: Random) => void;

/**
 * How a theme dresses the town. What it puts out, by kind of spot (a kind it
 * leaves out stays bare); the colors some of its tokens take (`repaint`: snow
 * on the roofs and lawns at Christmas), which stay in color while the rest of
 * the town is grey, as do any `vivid` tokens it keeps in their own colors; the
 * lights it strings round every cottage's eaves and along the blimp's back;
 * what its people send up (life.ts floats it); how the blimp looks and what
 * else flies over (sky-scene.ts flies both); and the hat the site's logo
 * wears (`hat`, in its own frame as hats.ts draws them, pictured off the
 * showcase by picture.ts).
 */
export interface Town extends Partial<Record<Kind, Prop>> {
  repaint?: Repaint;
  vivid?: ReadonlySet<Token>;
  lights?: readonly Token[];
  emote?: Emote;
  blimp?: BlimpLook;
  flyer?: Flyer;
  hat?: (hat: Placed) => void;
}

/** What the city is drawn in: day or night, and the theme, as the site shows them. */
export interface Setting {
  time: Time;
  theme: ThemeId;
}

/** A setting with its theme and town looked up, as the city paints it. */
export const schemeOf = ({ theme, time }: Setting) => ({
  theme: themeOf(theme),
  time,
  town: TOWNS[theme],
});

/**
 * A theme's decorations, drawn into a sketch: the same ones in every view,
 * since each kind of spot gets its own stream of chances.
 * @yields {void} every few spots, so it can be spread over frames.
 */
export const decorSteps = function* decorSteps(sketch: Sketch, plan: CityPlan, id: ThemeId) {
  const town = TOWNS[id];
  const spots = openSpots(plan);

  for (const kind of KINDS) {
    const prop = town[kind];

    if (!prop) {
      continue;
    }

    const random = createRandom(hashString(`${id}:${kind}`));

    for (const [index, [x, z]] of spots[kind].entries()) {
      prop(sketch, x, z, random);

      if (index % SPOTS_A_STEP === SPOTS_A_STEP - 1) {
        yield;
      }
    }

    yield;
  }

  if (town.lights) {
    for (const [index, house] of spots.houses.entries()) {
      eaveLights(sketch, house, town.lights);

      if (index % SPOTS_A_STEP === SPOTS_A_STEP - 1) {
        yield;
      }
    }
  }
};
