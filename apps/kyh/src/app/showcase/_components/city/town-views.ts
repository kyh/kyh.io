// The town's drawings, one per heading: sketched, built and dressed for a
// view, kept while the camera is near, drawn ahead between frames, and
// repainted only when what they're painted for changes.
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

/** How long a frame may spend drawing the views a turn away (ms). */
const AHEAD_MS = 4;

/** The town as one view sketches it. */
export interface Town {
  placed: Placed[];
  sketch: Sketch;
}

/** The views a drawing keeps the faces of: its own, or both ends of a turn. */
const coversAt = (at: number) =>
  Number.isInteger(at) ? [viewAt(at)] : [viewAt(at - 0.5), viewAt(at + 0.5)];

/**
 * The town sketched for a view, keeping the faces of every view in `covers`.
 * @yields {void} between pieces, so it can be spread over frames.
 */
const sketchSteps = function* sketchSteps(
  plan: CityPlan,
  projects: readonly CityProject[],
  view: Vec3,
  covers: readonly Vec3[],
): Steps<Town> {
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

/**
 * The town as one quarter turn sees it: every face and line sketched for that
 * view, the moving parts animated, and the sky over it. Only one is shown.
 * @yields {void} between buildings, so it can be spread over frames.
 */
const townViewSteps = function* townViewSteps(
  scene: Scene,
  materials: ReturnType<typeof createMaterials>,
  town: Town,
  /** Its heading. */
  at: number,
  /** When each part of it goes up; BUILT once the town's up. */
  startAt: StartAt,
  still: boolean,
  looks: ReadonlyMap<string, Look>,
  plan: CityPlan,
) {
  const city = raise(build(town.sketch, materials), startAt);
  yield;
  // Each project's building is built on its own, so it can light up alone.
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
    /**
     * Dresses it for a theme: its decorations and its sky.
     * @yields {void} every few spots, so it can be spread over frames.
     */
    dressSteps: function* dressSteps(theme: ThemeId, from: StartAt): Steps<void> {
      yield* decor.dressSteps(theme, from);
      sky.dress(theme);
    },
    /** What the theme dresses it in, painted for the time of day: it doesn't change with a hover. */
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
    /** The theme it's dressed for; null before it's dressed. */
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
  /**
   * By heading: whole quarter turns where the camera rests, halves for a turn
   * between two, which keep every face either end sees.
   */
  const views = new Map<number, TownView>();
  /** The time of day and theme each drawing's dress was last painted for. */
  const dressPainted = new WeakMap<TownView, string>();
  // Repainting rewrites every vertex color, so each drawing remembers what it was last painted for.
  const paintedFor = new WeakMap<TownView, string>();
  const paintKey = () => {
    const scheme = options.scheme();
    return `${scheme.time}|${scheme.theme.id}|${options.lit() ?? ""}`;
  };

  /**
   * Dresses a kept drawing for the theme in play: its decorations and its sky.
   * @yields {void} every few spots, so it can be spread over frames.
   */
  const redressSteps = function* redressSteps(town: TownView): Steps<TownView> {
    yield* town.dressSteps(options.scheme().theme.id, options.startAt());
    dressPainted.delete(town);
    return town;
  };
  /**
   * Sketches and builds the town for a heading, and keeps it hidden.
   * @yields {void} between pieces, so it can be spread over frames.
   */
  const townSteps = function* townSteps(at: number, sketched?: Town): Steps<TownView> {
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
    // Kept once it's in the scene, so a draft dropped while it's dressed isn't
    // lost there; one left undressed is dressed when it's wanted (paint).
    // Hidden meanwhile: unpainted, it'd show over the town.
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
    // Dressed for another theme (one picked since it was drawn): redressed now it's to be seen.
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

  /** The view being drawn ahead, between frames. */
  let drafting: { at: number; steps: Steps<TownView> } | null = null;
  let ahead: number[] = [];

  return {
    /** The drawing for a heading, drawn now if it isn't yet. */
    at: (at: number, town?: Town) => {
      // Wanted now: whatever's left of drawing (or dressing) it is done at once.
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
    /** A frame's share of drawing ahead. */
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
      // Then the drawings kept from before another theme was picked.
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
        // Painted ahead too, so turning to it doesn't stall; one dressed for a
        // theme since passed is dressed again a frame at a time first.
        if (done.value.theme === options.scheme().theme.id) {
          paint(done.value);
        }
      }
    },
    /**
     * Queues the views a turn from `heading`. Sketching one takes a noticeable
     * moment, so they're drawn ahead, a few milliseconds a frame (`draft`),
     * rather than when a key is pressed: drawn in one go they'd stall the flyover.
     */
    drawAhead: (heading: number) => {
      const left = (heading + HEADINGS - 1) % HEADINGS;
      const right = (heading + 1) % HEADINGS;
      ahead = [heading + 0.5, right, left + 0.5, left];
      // A view no longer a turn away is dropped half drawn: nothing of it is in
      // the scene or on the GPU until it's built, and once built it's kept.
      if (drafting && !ahead.includes(drafting.at)) {
        drafting = null;
      }
    },
    /** Keeps only the drawings a turn either way of `heading` needs; the rest is drawn again if the camera comes back. */
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
    /** Moves the colors on a drawing from the building that had them to the one lit now. */
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
