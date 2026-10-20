// The sky over the town and the boats round it, placed in the scene and kept
// moving: the blimp crossing, balloons drifting, drones over downtown, sails
// circling the island and the ferry off the pier (boats.ts sails both). sky.ts
// draws them, and blimp.ts the blimp. The season dresses the sky (DECOR): the
// blimp in its greeting, colors, lights and hat, else the site's name in grey,
// and what else it flies across (Santa's sleigh, a witch on her broom).
import type { Scene } from "three";
import { Vector3 } from "three";

import type { SeasonId } from "@/seasons/seasons";
import type { BoatPose } from "./boats";
import type { Scheme } from "./palette";
import type { Built, Materials } from "./render";
import type { BlimpLook } from "./blimp";
import type { Flyer } from "./sky";
import type { Sketch, Vec3 } from "./sketch";
import { BLIMP_HEADING, drawBlimp, PLAIN_BLIMP } from "./blimp";
import { RAISE } from "./carry";
import { BUILT, raise } from "./grow";
import { build } from "./render";
import { DECOR } from "./season-decor";
import { drawBalloon, drawBoat, drawDrone, drawFerry, FLYER_HEADING } from "./sky";

const BLIMP_HEIGHT = 7.5;
const BLIMP_SPAN = 76;
const FLYER_HEIGHT = 9.5;
const FLYER_SPAN = 90;

export const createSky = (
  scene: Scene,
  materials: Materials,
  still: boolean,
  view: Vec3,
  covers: readonly Vec3[],
) => {
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
  // What the season dresses: the blimp and what else it flies; none until the first season.
  let blimp: { built: Built; look: BlimpLook } | null = null;
  let flyer: { built: Built; draw: Flyer } | null = null;
  const undraw = (built: Built) => {
    scene.remove(built.group);
    built.dispose();
  };
  const balloons = [add(drawBalloon(0, view, covers)), add(drawBalloon(1, view, covers))];
  const boats = [add(drawBoat("white")), add(drawBoat("accentRed")), add(drawBoat("accentBlue"))];
  const ferry = add(drawFerry());
  const drones = [
    add(drawDrone(view, covers)),
    add(drawDrone(view, covers)),
    add(drawDrone(view, covers)),
  ];
  const heading = new Vector3(Math.cos(BLIMP_HEADING), 0, Math.sin(BLIMP_HEADING));
  const flyerHeading = new Vector3(Math.cos(FLYER_HEADING), 0, Math.sin(FLYER_HEADING));
  const update = (time: number, poses: readonly BoatPose[]) => {
    const along = still ? -8 : (((time * 0.65) % BLIMP_SPAN) / BLIMP_SPAN - 0.5) * BLIMP_SPAN;
    blimp?.built.group.position.set(
      40 + heading.x * along,
      BLIMP_HEIGHT + Math.sin(time * 0.5) * 0.15,
      40 + heading.z * along,
    );
    const across = still ? 6 : (((time * 1.2) % FLYER_SPAN) / FLYER_SPAN - 0.5) * FLYER_SPAN;
    flyer?.built.group.position.set(
      34 + flyerHeading.x * across,
      FLYER_HEIGHT + Math.sin(time * 1.3) * 0.25,
      34 + flyerHeading.z * across,
    );
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
    /** Dresses the sky for a season, redrawing only what it changes. */
    dress: (season: SeasonId) => {
      const { blimp: look = PLAIN_BLIMP, flyer: drawFlyer } = DECOR[season];
      if (blimp?.look !== look) {
        if (blimp) {
          undraw(blimp.built);
        }
        blimp = { built: draw(drawBlimp(look, view, covers)), look };
      }
      if (flyer?.draw !== drawFlyer) {
        if (flyer) {
          undraw(flyer.built);
        }
        flyer = drawFlyer ? { built: draw(drawFlyer(view, covers)), draw: drawFlyer } : null;
      }
    },
    /** Grey as the town, but what a season dresses in its colors, as its decorations are. */
    paint: (scheme: Scheme) => {
      for (const built of builds) {
        built.paint(scheme, false);
      }
      blimp?.built.paint(scheme, blimp.look !== PLAIN_BLIMP);
      flyer?.built.paint(scheme, true);
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
