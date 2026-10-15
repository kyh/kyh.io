// The building sites on screen while the town goes up: crews.ts plans them
// and says what each part is doing; this puts the drawings in the scene and
// moves them. Scaffolding draws with the town's own materials, so it rises
// storey by storey with the building it's round; the machines and yards with
// materials that never build.
import type { Scene } from "three";

import type { Theme } from "./palette";
import type { CityPlan } from "./plan";
import type { Built, Materials } from "./render";
import type { Schedule } from "./schedule";
import { cranePose, planWorks, truckPose, yardShown } from "./crews";
import {
  drawDumpTruck,
  drawMixer,
  drawScaffold,
  drawTowerCrane,
  drawYard,
  TRUCK_SCALE,
} from "./draw-crews";
import { build } from "./render";
import { roadGraph } from "./traffic";

interface Placed<T> {
  work: T;
  built: Built;
}

export const createSites = (
  scene: Scene,
  materials: Materials,
  fixed: Materials,
  schedule: Schedule,
  plan: CityPlan,
) => {
  const works = planWorks(schedule, roadGraph(plan));
  const builds: Built[] = [];
  const place = <T>(work: T, built: Built): Placed<T> => {
    built.group.visible = false;
    scene.add(built.group);
    builds.push(built);
    return { built, work };
  };
  const yards = works.yards.map((yard) => {
    const placed = place(yard, build(drawYard(yard), fixed));
    placed.built.group.position.set(yard.x + yard.w / 2, 0, yard.z + yard.d / 2);
    return placed;
  });
  const scaffolds = works.scaffolds.map((scaffold) =>
    place(scaffold, build(drawScaffold(scaffold, scaffold.top), materials)),
  );
  const cranes = works.cranes.map((crane) => {
    const placed = place(crane, build(drawTowerCrane(crane.mast), fixed));
    placed.built.group.position.set(crane.at.x, 0, crane.at.z);
    return placed;
  });
  const trucks = works.trucks.map((truck) =>
    place(truck, build(truck.kind === "mixer" ? drawMixer() : drawDumpTruck(), fixed)),
  );

  return {
    dispose: () => {
      for (const built of builds) {
        scene.remove(built.group);
        built.dispose();
      }
      builds.length = 0;
    },
    /** When the last truck's gone and the last crane's down (s). */
    end: works.end,
    paint: (theme: Theme) => {
      for (const { built } of [...yards, ...cranes, ...trucks]) {
        built.paint(theme, true);
      }
      for (const { built } of scaffolds) {
        built.paint(theme, false);
      }
    },
    /** Everything where it is in its work at `t` on the build clock. */
    update: (t: number) => {
      for (const { built, work: yard } of yards) {
        const shown = yardShown(yard, t);
        built.group.visible = shown > 0;
        built.group.scale.set(1, Math.max(0.001, shown), 1);
      }
      for (const { built, work: scaffold } of scaffolds) {
        built.group.visible = t < scaffold.until;
      }
      for (const { built, work: crane } of cranes) {
        const pose = cranePose(crane, t);
        built.group.visible = pose.shown;
        built.parts.get("mast")?.scale.set(1, Math.max(0.001, pose.mast), 1);
        const jib = built.parts.get("jib");
        if (jib) {
          jib.visible = pose.mast >= 1;
          jib.rotation.y = pose.jib;
        }
      }
      for (const { built, work: truck } of trucks) {
        const pose = truckPose(truck, t);
        built.group.visible = pose.shown;
        built.group.position.set(pose.x, 0, pose.z);
        built.group.rotation.y = pose.heading;
        built.group.scale.setScalar(TRUCK_SCALE * Math.max(0.001, pose.scale));
      }
    },
  };
};
