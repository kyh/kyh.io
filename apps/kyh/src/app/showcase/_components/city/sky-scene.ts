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

interface Crossing {
  heading: number;
  center: number;
  height: number;
  span: number;
  speed: number;
  still: number;
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

const turnedBy = (heading: number, turns: number) => heading + (turns * Math.PI) / 2;

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
  at: number,
  covers: readonly Vec3[],
) => {
  const view = viewAt(at);
  let visible = true;

  const draw = (sketch: Sketch) => {
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

  let blimp: Dressed | null = null;
  let flyer: Dressed | null = null;

  const undraw = (built: Built) => {
    scene.remove(built.group);
    built.dispose();
  };

  const redress = (
    dressed: Dressed | null,
    key: BlimpLook | Flyer | undefined,
    crossing: Crossing,
    sketchOn: ((heading: number) => Sketch) | null,
    colorful: boolean,
  ) => {
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
