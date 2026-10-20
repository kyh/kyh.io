// The sky over the town and the boats round it, placed in the scene and kept
// moving: the blimp crossing, balloons drifting, drones over downtown, sails
// circling the island and the ferry off the pier (boats.ts sails both). sky.ts
// draws them. The blimp is dressed for the season: its greeting in its colors
// (`blimp` in DECOR), else the site's name in grey.
import type { Scene } from "three";
import { Vector3 } from "three";

import type { SeasonId } from "@/seasons/seasons";
import type { BoatPose } from "./boats";
import type { Scheme } from "./palette";
import type { Built, Materials } from "./render";
import type { BlimpLook } from "./sky";
import type { Sketch, Vec3 } from "./sketch";
import { RAISE } from "./carry";
import { BUILT, raise } from "./grow";
import { build } from "./render";
import { DECOR } from "./season-decor";
import {
  BLIMP_HEADING,
  drawBalloon,
  drawBlimp,
  drawBoat,
  drawDrone,
  drawFerry,
  PLAIN_BLIMP,
} from "./sky";

const BLIMP_HEIGHT = 7.5;
const BLIMP_SPAN = 76;

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
  /** The blimp as it's dressed; none until the first season. */
  let blimp: { built: Built; look: BlimpLook } | null = null;
  const balloons = [add(drawBalloon(0, view, covers)), add(drawBalloon(1, view, covers))];
  const boats = [add(drawBoat("white")), add(drawBoat("accentRed")), add(drawBoat("accentBlue"))];
  const ferry = add(drawFerry());
  const drones = [
    add(drawDrone(view, covers)),
    add(drawDrone(view, covers)),
    add(drawDrone(view, covers)),
  ];
  const heading = new Vector3(Math.cos(BLIMP_HEADING), 0, Math.sin(BLIMP_HEADING));
  const update = (time: number, poses: readonly BoatPose[]) => {
    const along = still ? -8 : (((time * 0.65) % BLIMP_SPAN) / BLIMP_SPAN - 0.5) * BLIMP_SPAN;
    blimp?.built.group.position.set(
      40 + heading.x * along,
      BLIMP_HEIGHT + Math.sin(time * 0.5) * 0.15,
      40 + heading.z * along,
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
  const all = () => (blimp ? [...builds, blimp.built] : builds);
  return {
    dispose: () => {
      for (const built of all()) {
        scene.remove(built.group);
        built.dispose();
      }
      blimp = null;
    },
    /** Redraws the blimp for a season, if it doesn't already wear its look. */
    dress: (season: SeasonId) => {
      const look = DECOR[season].blimp ?? PLAIN_BLIMP;
      if (blimp?.look === look) {
        return;
      }
      if (blimp) {
        scene.remove(blimp.built.group);
        blimp.built.dispose();
      }
      blimp = { built: draw(drawBlimp(look, view, covers)), look };
    },
    /** Grey as the town, but a season's blimp, in its colors as its decorations are. */
    paint: (scheme: Scheme) => {
      for (const built of builds) {
        built.paint(scheme, false);
      }
      blimp?.built.paint(scheme, blimp.look !== PLAIN_BLIMP);
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
