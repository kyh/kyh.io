// The theme's decorations over one view of the town (town-theme.ts draws
// them), placed in the scene and redrawn when the theme changes, in color
// over the grey town. A view dresses them with its sky (sky-scene.ts).
import type { Scene } from "three";

import type { ThemeId } from "@/themes";
import type { StartAt } from "./grow";
import type { Scheme } from "./palette";
import type { CityPlan } from "./plan";
import type { Built, Materials } from "./render";
import type { Vec3 } from "./sketch";
import type { Steps } from "./steps";
import { raise } from "./grow";
import { build } from "./render";
import { decorSteps } from "./town-theme";
import { createSketch } from "./sketch";

export const createDecor = (
  scene: Scene,
  materials: Materials,
  plan: CityPlan,
  view: Vec3,
  covers: readonly Vec3[],
) => {
  let built: Built | null = null;
  let theme: ThemeId | null = null;
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
      theme = null;
    },
    /**
     * Redraws them for a theme, going up with the town from `startAt`.
     * @yields {void} every few spots, so it can be spread over frames.
     */
    dressSteps: function* dressSteps(next: ThemeId, startAt: StartAt): Steps<void> {
      const sketch = createSketch(view, covers);
      yield* decorSteps(sketch, plan, next);
      clear();
      theme = next;
      if (sketch.faces.size > 0 || sketch.lines.size > 0) {
        built = raise(build(sketch, materials), startAt);
        built.group.visible = visible;
        scene.add(built.group);
      }
    },
    paint: (scheme: Scheme) => built?.paint(scheme, true),
    show: (shown: boolean) => {
      visible = shown;
      if (built) {
        built.group.visible = shown;
      }
    },
    /** The theme they're for; null before they're dressed. */
    get theme() {
      return theme;
    },
  };
};
