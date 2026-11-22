import type { Scene } from "three";

import type { CityProject, Placed } from "./draw-landmarks";
import type { ThemeId } from "@/themes";
import type { Look, Scheme } from "./palette";
import type { CityPlan } from "./plan";
import type { Built, createMaterials } from "./render";
import type { StartAt } from "./grow";
import type { Sketch, Vec3 } from "./sketch";
import type { Steps } from "./steps";
import { createAnimations } from "./animate";
import { drawBlock } from "./draw-blocks";
import { countrysideSteps } from "./draw-countryside";
import { drawGround } from "./draw-ground";
import { lotSteps } from "./draw-landmarks";
import { raise } from "./grow";
import { build } from "./render";
import { createRandom } from "@/lib/random";
import { createSketch, HEADINGS, viewAt } from "./sketch";
import { createDecor } from "./decor-scene";
import { createSky } from "./sky-scene";
import { finish, runFor } from "./steps";

const AHEAD_MS = 4;

/** The town as one view sketches it. */
export interface Town {
  placed: Placed[];
  sketch: Sketch;
}

const coversAt = (at: number) =>
  Number.isInteger(at) ? [viewAt(at)] : [viewAt(at - 0.5), viewAt(at + 0.5)];

const sketchSteps = function* sketchSteps(
  plan: CityPlan,
  projects: readonly CityProject[],
  view: Vec3,
  covers: readonly Vec3[],
) {
  const sketch = createSketch(view, covers);
  drawGround(sketch, plan, createRandom(11));
  yield;
  yield* countrysideSteps(sketch, plan);

  for (const block of plan.blocks) {
    drawBlock(sketch, block);
    yield;
  }

  const placed = yield* lotSteps(sketch, plan, projects);

  return { placed, sketch };
};

/** The town as the first view sketches it, which also says where every building is, and how tall. */
export const sketchTown = (plan: CityPlan, projects: readonly CityProject[]) =>
  finish(sketchSteps(plan, projects, viewAt(0), coversAt(0)));

const townViewSteps = function* townViewSteps(
  scene: Scene,
  materials: ReturnType<typeof createMaterials>,
  town: Town,
  at: number,
  startAt: StartAt,
  still: boolean,
  looks: ReadonlyMap<string, Look>,
  plan: CityPlan,
) {
  const city = raise(build(town.sketch, materials), startAt);
  yield;
  const buildings = new Map<string, Built>();

  for (const entry of town.placed) {
    buildings.set(
      entry.project.slug,
      raise(build(entry.sketch, materials, looks.get(entry.project.slug)?.tint), startAt),
    );
    yield;
  }

  const rig = {
    parts: new Map([city, ...buildings.values()].flatMap((built) => [...built.parts])),
    screens: new Map([city, ...buildings.values()].flatMap((built) => [...built.screens])),
  };

  const animations = createAnimations(rig, { launches: !still });
  const sky = createSky(scene, materials, still, at, coversAt(at));
  const decor = createDecor(scene, materials, plan, viewAt(at), coversAt(at));
  const builds = [city, ...buildings.values()];

  for (const built of builds) {
    scene.add(built.group);
  }

  return {
    animations,
    at,
    buildings,
    city,
    dispose: () => {
      for (const built of builds) {
        scene.remove(built.group);
        built.dispose();
      }

      decor.dispose();
      sky.dispose();
    },
    dressSteps: function* dressSteps(theme: ThemeId, from: StartAt) {
      yield* decor.dressSteps(theme, from);
      sky.dress(theme);
    },
    paintDress: (scheme: Scheme) => {
      decor.paint(scheme);
      sky.paint(scheme);
    },
    show: (shown: boolean) => {
      for (const built of builds) {
        built.group.visible = shown;
      }

      decor.show(shown);
      sky.show(shown);
    },
    sky,
    get theme() {
      return decor.theme;
    },
  };
};

export type TownView =
  ReturnType<typeof townViewSteps> extends Generator<unknown, infer T> ? T : never;

interface TownViewsOptions {
  scene: Scene;
  materials: ReturnType<typeof createMaterials>;
  plan: CityPlan;
  projects: readonly CityProject[];
  looks: ReadonlyMap<string, Look>;
  still: boolean;
  scheme: () => Scheme;
  /** When what's drawn now goes up. */
  startAt: () => StartAt;
  /** The slug of the building showing its colors, if one is. */
  lit: () => string | null;
}

export const createTownViews = (options: TownViewsOptions) => {
  const { scene, materials, plan, projects, looks, still } = options;
  const views = new Map<number, TownView>();
  const dressPainted = new WeakMap<TownView, string>();
  const paintedFor = new WeakMap<TownView, string>();

  const paintKey = () => {
    const scheme = options.scheme();

    return `${scheme.time}|${scheme.theme.id}|${options.lit() ?? ""}`;
  };

  const redressSteps = function* redressSteps(town: TownView) {
    yield* town.dressSteps(options.scheme().theme.id, options.startAt());
    dressPainted.delete(town);

    return town;
  };

  const townSteps = function* townSteps(at: number, sketched?: Town) {
    const town = sketched ?? (yield* sketchSteps(plan, projects, viewAt(at), coversAt(at)));

    const created = yield* townViewSteps(
      scene,
      materials,
      town,
      at,
      options.startAt(),
      still,
      looks,
      plan,
    );

    views.set(at, created);
    created.show(false);

    return yield* redressSteps(created);
  };

  const paint = (town: TownView) => {
    const key = paintKey();

    if (paintedFor.get(town) === key) {
      return;
    }

    paintedFor.set(town, key);
    const scheme = options.scheme();

    if (town.theme !== scheme.theme.id) {
      finish(redressSteps(town));
    }

    const lit = options.lit();
    town.city.paint(scheme, false);

    for (const [slug, built] of town.buildings) {
      built.paint(scheme, slug === lit);
    }

    const look = `${scheme.time}|${scheme.theme.id}`;

    if (dressPainted.get(town) !== look) {
      dressPainted.set(town, look);
      town.paintDress(scheme);
    }
  };

  let drafting: { at: number; steps: Steps<TownView> } | null = null;
  let ahead: number[] = [];

  return {
    at: (at: number, town?: Town) => {
      if (drafting?.at === at) {
        const { steps } = drafting;
        drafting = null;

        return finish(steps);
      }

      return views.get(at) ?? finish(townSteps(at, town));
    },
    dispose: () => {
      for (const town of views.values()) {
        town.dispose();
      }
    },
    draft: () => {
      while (!drafting) {
        const at = ahead.shift();

        if (at === undefined) {
          break;
        }

        if (!views.has(at)) {
          drafting = { at, steps: townSteps(at) };
        }
      }

      const theme = options.scheme().theme.id;

      for (const town of views.values()) {
        if (!drafting && town.theme !== theme) {
          drafting = { at: town.at, steps: redressSteps(town) };
        }
      }

      if (!drafting) {
        return;
      }

      const done = runFor(drafting.steps, AHEAD_MS);

      if (done) {
        drafting = null;

        if (done.value.theme === options.scheme().theme.id) {
          paint(done.value);
        }
      }
    },
    drawAhead: (heading: number) => {
      const left = (heading + HEADINGS - 1) % HEADINGS;
      const right = (heading + 1) % HEADINGS;
      ahead = [heading + 0.5, right, left + 0.5, left];

      if (drafting && !ahead.includes(drafting.at)) {
        drafting = null;
      }
    },
    keepNear: (heading: number) => {
      const near = new Set([
        heading,
        (heading + 1) % HEADINGS,
        (heading + 3) % HEADINGS,
        heading + 0.5,
        (heading + 3.5) % HEADINGS,
      ]);

      for (const [at, town] of views) {
        if (!near.has(at)) {
          town.dispose();
          views.delete(at);
        }
      }
    },
    paint,
    relight: (town: TownView, was: string | null) => {
      const scheme = options.scheme();

      if (was !== null) {
        town.buildings.get(was)?.paint(scheme, false);
      }

      const lit = options.lit();

      if (lit !== null) {
        town.buildings.get(lit)?.paint(scheme, true);
      }

      paintedFor.set(town, paintKey());
    },
  };
};
