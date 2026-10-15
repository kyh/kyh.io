// The sky over the town and the boats round it, placed in the scene and kept
// moving: the blimp crossing, balloons drifting, drones over downtown, sails
// circling the island and the ferry off the pier. sky.ts draws them.
import type { Scene } from "three";
import { Vector3 } from "three";

import type { Built, Materials } from "./render";
import type { Sketch, Vec3 } from "./sketch";
import { CENTER } from "./plan";
import { BUILT, raise } from "./grow";
import { build } from "./render";
import { BLIMP_HEADING, drawBalloon, drawBlimp, drawBoat, drawDrone, drawFerry } from "./sky";

const BLIMP_HEIGHT = 7.5;
const BLIMP_SPAN = 76;

/** A point on a tilted ellipse round the island, for boats. */
const sea = (angle: number, rx: number, rz: number) => ({
  x: CENTER + Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
  z: CENTER - Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
});

export const createSky = (
  scene: Scene,
  materials: Materials,
  still: boolean,
  view: Vec3,
  covers: readonly Vec3[],
) => {
  const builds: Built[] = [];
  const add = (sketch: Sketch) => {
    // The sky's there from the start: nothing in it goes up with the town.
    const built = raise(build(sketch, materials), BUILT);
    builds.push(built);
    scene.add(built.group);
    return built;
  };
  const blimp = add(drawBlimp("KYH.IO", view, covers));
  const balloons = [add(drawBalloon(0, view, covers)), add(drawBalloon(1, view, covers))];
  const boats = [add(drawBoat("white")), add(drawBoat("accentRed")), add(drawBoat("accentBlue"))];
  const ferry = add(drawFerry());
  const drones = [
    add(drawDrone(view, covers)),
    add(drawDrone(view, covers)),
    add(drawDrone(view, covers)),
  ];
  const heading = new Vector3(Math.cos(BLIMP_HEADING), 0, Math.sin(BLIMP_HEADING));
  const update = (time: number, pier: { x: number; z: number; d: number } | null) => {
    const along = still ? -8 : (((time * 0.65) % BLIMP_SPAN) / BLIMP_SPAN - 0.5) * BLIMP_SPAN;
    blimp.group.position.set(
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
    for (const [index, boat] of boats.entries()) {
      // Sail a wide loop round the island, nose along the way.
      const direction = index % 2 === 0 ? 1 : -1;
      const angle = time * (0.012 + index * 0.004) * direction + index * 2.1;
      const rx = 42 + index * 2.5;
      const rz = 33 + index * 2;
      const here = sea(angle, rx, rz);
      const ahead = sea(angle + direction * 0.01, rx, rz);
      boat.group.position.set(here.x, Math.sin(time * 1.5 + index) * 0.02 - 0.03, here.z);
      boat.group.rotation.y = -Math.atan2(ahead.z - here.z, ahead.x - here.x);
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
    if (pier) {
      // The ferry shuttles from the pier's end out to sea and back.
      const leg = (Math.sin(time * 0.06) + 1) / 2;
      ferry.group.position.set(pier.x + 1, -0.02, pier.z + pier.d + 0.6 + leg * 9);
      ferry.group.rotation.y = Math.cos(time * 0.06) > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else {
      ferry.group.visible = false;
    }
  };
  return { builds, update };
};
