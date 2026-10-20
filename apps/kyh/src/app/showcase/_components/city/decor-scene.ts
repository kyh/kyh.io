// The season's decorations over one view of the town (season-decor.ts draws
// them), placed in the scene and redrawn when the season changes, in color
// over the grey town. A view dresses them with its sky (sky-scene.ts).
import type { Scene } from "three";

import type { SeasonId } from "@/seasons/seasons";
import type { StartAt } from "./grow";
import type { Scheme } from "./palette";
import type { CityPlan } from "./plan";
import type { Built, Materials } from "./render";
import type { Vec3 } from "./sketch";
import type { Steps } from "./steps";
import { raise } from "./grow";
import { build } from "./render";
import { decorSteps } from "./season-decor";
import { createSketch } from "./sketch";

export const createDecor = (
  scene: Scene,
  materials: Materials,
  plan: CityPlan,
  view: Vec3,
  covers: readonly Vec3[],
) => {
  let built: Built | null = null;
  let season: SeasonId | null = null;
  let visible = true;
  const clear = () => {
    if (built) {
      scene.remove(built.group);
      built.dispose();
      built = null;
    }
  };
  return {
    dispose: () => {
      clear();
      season = null;
    },
    /**
     * Redraws them for a season, going up with the town from `startAt`.
     * @yields {void} every few spots, so it can be spread over frames.
     */
    dressSteps: function* dressSteps(next: SeasonId, startAt: StartAt): Steps<void> {
      const sketch = createSketch(view, covers);
      yield* decorSteps(sketch, plan, next);
      clear();
      season = next;
      if (sketch.faces.size > 0 || sketch.lines.size > 0) {
        built = raise(build(sketch, materials), startAt);
        built.group.visible = visible;
        scene.add(built.group);
      }
    },
    paint: (scheme: Scheme) => built?.paint(scheme, true),
    /** The season they're for; null before they're dressed. */
    get season() {
      return season;
    },
    show: (shown: boolean) => {
      visible = shown;
      if (built) {
        built.group.visible = shown;
      }
    },
  };
};
