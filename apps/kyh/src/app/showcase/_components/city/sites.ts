// The building sites on screen while the town goes up: crews.ts plans them
// and says what each part is doing; this puts the drawings in the scene and
// moves them. Scaffolding goes up on its building's schedule, storey by storey
// with it; the machines and yards are there whole from the start.
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
import { BUILT, raise } from "./grow";
import { build } from "./render";
import { roadGraph } from "./traffic";

interface Placed<T> {
  work: T;
  built: Built;
}

export const createSites = (
  scene: Scene,
  materials: Materials,
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
    const placed = place(yard, raise(build(drawYard(yard), materials), BUILT));
    placed.built.group.position.set(yard.x + yard.w / 2, 0, yard.z + yard.d / 2);
    return placed;
  });
  const scaffolds = works.scaffolds.map((scaffold) =>
    place(
      scaffold,
      raise(build(drawScaffold(scaffold, scaffold.top), materials), schedule.startAt),
    ),
  );
  const cranes = works.cranes.map((crane) => {
    const placed = place(crane, raise(build(drawTowerCrane(crane.mast), materials), BUILT));
    placed.built.group.position.set(crane.at.x, 0, crane.at.z);
    return placed;
  });
  const trucks = works.trucks.map((truck) =>
    place(
      truck,
      raise(build(truck.kind === "mixer" ? drawMixer() : drawDumpTruck(), materials), BUILT),
    ),
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
        built.group.scale.setScalar(Math.max(0.001, shown));
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
          jib.scale.setScalar(Math.max(0.001, pose.reach));
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
