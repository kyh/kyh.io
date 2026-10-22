// The sky over the town and the boats round it, placed in the scene and kept
// moving: the blimp crossing, balloons drifting, drones over downtown, sails
// circling the island and the ferry off the pier (boats.ts sails both). sky.ts
// draws them, and blimp.ts the blimp. The theme dresses the sky (its town): the
// blimp in its greeting, colors, lights and hat, else the site's name in grey,
// and what else it flies across (Santa's sleigh, a witch on her broom).
import type { Scene } from "three";

import type { ThemeId } from "@/themes";
import { TOWNS } from "@/themes/towns";
import type { BoatPose } from "./boats";
import type { Scheme } from "./palette";
import type { Built, Materials } from "./render";
import type { BlimpLook } from "./blimp";
import type { Flyer } from "./sky";
import type { Sketch, Vec3 } from "./sketch";
import { drawBlimp, PLAIN_BLIMP } from "./blimp";
import { RAISE } from "./carry";
import { BUILT, raise } from "./grow";
import { build } from "./render";
import { FLANK_ON, viewAt } from "./sketch";
import { drawBalloon, drawBoat, drawDrone, drawFerry, FLYER_HEADING } from "./sky";

/**
 * A path across the sky for what the theme dresses there. It turns with the
 * camera, so it crosses the screen the same way in every view and the blimp's
 * banner always faces it.
 */
interface Crossing {
  /** Its heading in the first view. */
  heading: number;
  /** It crosses over (center, center). */
  center: number;
  height: number;
  /** How far it goes before it comes round again, and how fast. */
  span: number;
  speed: number;
  /** Where along it it hangs when motion is reduced. */
  still: number;
  /** How far it bobs, and how fast. */
  bob: number;
  rate: number;
}

const BLIMP_CROSSING: Crossing = {
  bob: 0.15,
  center: 40,
  heading: FLANK_ON,
  height: 7.5,
  rate: 0.5,
  span: 76,
  speed: 0.65,
  still: -8,
};

const FLYER_CROSSING: Crossing = {
  bob: 0.25,
  center: 34,
  heading: FLYER_HEADING,
  height: 9.5,
  rate: 1.3,
  span: 90,
  speed: 1.2,
  still: 6,
};

/** What a number of quarter turns of the camera does to a heading. */
const turnedBy = (heading: number, turns: number) => heading + (turns * Math.PI) / 2;

/** Something the theme dresses in the sky: drawn from `key`, kept until the key changes. */
interface Dressed {
  built: Built;
  key: BlimpLook | Flyer | undefined;
  colorful: boolean;
  crossing: Crossing;
}

export const createSky = (
  scene: Scene,
  materials: Materials,
  still: boolean,
  /** The view it's drawn for, in quarter turns. */
  at: number,
  covers: readonly Vec3[],
) => {
  const view = viewAt(at);
  let visible = true;
  const draw = (sketch: Sketch) => {
    // The sky's there from the start: nothing in it goes up with the town.
    const built = raise(build(sketch, materials), BUILT);
    built.group.visible = visible;
    scene.add(built.group);
    return built;
  };
  const builds: Built[] = [];
  const add = (sketch: Sketch) => {
    const built = draw(sketch);
    builds.push(built);
    return built;
  };
  // What the theme dresses: the blimp and what else it flies; none until the first theme.
  let blimp: Dressed | null = null;
  let flyer: Dressed | null = null;
  const undraw = (built: Built) => {
    scene.remove(built.group);
    built.dispose();
  };
  /** Redraws one of them for a theme, unless it's drawn from the same thing already. */
  const redress = (
    dressed: Dressed | null,
    key: BlimpLook | Flyer | undefined,
    crossing: Crossing,
    sketchOn: ((heading: number) => Sketch) | null,
    colorful: boolean,
  ): Dressed | null => {
    if (dressed?.key === key) {
      return dressed;
    }
    if (dressed) {
      undraw(dressed.built);
    }
    return sketchOn
      ? { built: draw(sketchOn(turnedBy(crossing.heading, at))), colorful, crossing, key }
      : null;
  };
  const balloons = [add(drawBalloon(0, view, covers)), add(drawBalloon(1, view, covers))];
  const boats = [add(drawBoat("white")), add(drawBoat("accentRed")), add(drawBoat("accentBlue"))];
  const ferry = add(drawFerry());
  const drones = [
    add(drawDrone(view, covers)),
    add(drawDrone(view, covers)),
    add(drawDrone(view, covers)),
  ];
  /** Moves it all on to a moment; `camera` is where the camera's turned to, in quarter turns, maybe mid-turn. */
  const update = (time: number, poses: readonly BoatPose[], camera: number) => {
    for (const dressed of [blimp, flyer]) {
      if (dressed) {
        const { bob, center, heading, height, rate, span, speed } = dressed.crossing;
        const along = still
          ? dressed.crossing.still
          : (((time * speed) % span) / span - 0.5) * span;
        const now = turnedBy(heading, camera);
        dressed.built.group.position.set(
          center + Math.cos(now) * along,
          height + Math.sin(time * rate) * bob,
          center + Math.sin(now) * along,
        );
        // Drawn for this view, swung round with the camera as it turns.
        dressed.built.group.rotation.y = (-(camera - at) * Math.PI) / 2;
      }
    }
    for (const [index, balloon] of balloons.entries()) {
      const angle = time * 0.03 + index * 2.6;
      balloon.group.position.set(
        36 + Math.cos(angle) * (16 + index * 6),
        5 + index * 1.4 + Math.sin(time * 0.4 + index) * 0.5,
        36 + Math.sin(angle) * (12 + index * 5),
      );
    }
    for (const [index, boat] of [...boats, ferry].entries()) {
      const pose = poses[index];
      boat.group.visible = pose !== undefined;
      if (pose) {
        // In the hand, it's drawn up its line of sight, clear of the roofs.
        const up = pose.held ? (RAISE - pose.y) / view[1] : 0;
        boat.group.position.set(
          pose.x + view[0] * up,
          pose.y + view[1] * up,
          pose.z + view[2] * up,
        );
        boat.group.rotation.y = pose.heading;
      }
    }
    for (const [index, drone] of drones.entries()) {
      // Figure-eights over downtown, each on its own beat.
      const t = time * (0.16 + index * 0.05) + index * 2;
      drone.group.position.set(
        36 + Math.sin(t) * (5 + index * 2),
        3.4 + index * 0.6 + Math.sin(t * 3) * 0.15,
        35 + Math.sin(t * 2) * (3 + index),
      );
    }
  };
  const all = () => [...builds, ...(blimp ? [blimp.built] : []), ...(flyer ? [flyer.built] : [])];
  return {
    dispose: () => {
      for (const built of all()) {
        undraw(built);
      }
      blimp = null;
      flyer = null;
    },
    /** Dresses the sky for a theme, redrawing only what it changes. */
    dress: (theme: ThemeId) => {
      const { blimp: look = PLAIN_BLIMP, flyer: drawFlyer, lights } = TOWNS[theme];
      blimp = redress(
        blimp,
        look,
        BLIMP_CROSSING,
        (heading) => drawBlimp({ heading, lights, look }, view, covers),
        look !== PLAIN_BLIMP,
      );
      flyer = redress(
        flyer,
        drawFlyer,
        FLYER_CROSSING,
        drawFlyer ? (heading) => drawFlyer(heading, view, covers) : null,
        true,
      );
    },
    /** Grey as the town, but what a theme dresses in its colors, as its decorations are. */
    paint: (scheme: Scheme) => {
      for (const built of builds) {
        built.paint(scheme, false);
      }
      for (const dressed of [blimp, flyer]) {
        dressed?.built.paint(scheme, dressed.colorful);
      }
    },
    show: (shown: boolean) => {
      visible = shown;
      for (const built of all()) {
        built.group.visible = shown;
      }
    },
    update,
  };
};
