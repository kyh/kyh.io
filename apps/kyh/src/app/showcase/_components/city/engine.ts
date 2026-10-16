// The live city: renderer, camera, the drawn town and the loop that moves
// it. It talks to React through a few callbacks and methods; nothing in here
// knows about the page around it.
import {
  Box3,
  Color,
  OrthographicCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import type { Object3D } from "three";

import type { CityProject, Placed } from "./draw-landmarks";
import type { Look, Theme } from "./palette";
import type { CityPlan } from "./plan";
import type { Sketch, Vec3 } from "./sketch";
import { createAnimations } from "./animate";
import { listenForChat } from "@/lib/chat-input";
import { discoverEgg } from "@/easter-eggs/store";
import { createPresses, createSpotlight, isHover, keyMove } from "./controls";
import { CURB_TOP, drawBlock } from "./draw-blocks";
import { countrysideSteps } from "./draw-countryside";
import { drawGround } from "./draw-ground";
import { lotSteps, planEntries } from "./draw-landmarks";
import { createHalo } from "./halo";
import { createLife } from "./life";
import { lookOf, PALETTE, shade } from "./palette";
import { CENTER, contains, planCity, withinReach } from "./plan";
import { createRandom, hashString } from "./random";
import type { Built } from "./render";
import { build, createMaterials } from "./render";
import { createSchedule } from "./schedule";
import { ALL_BUILT, BUILT, createGrowth, raise } from "./grow";
import type { StartAt } from "./grow";
import { createHeights } from "./heights";
import { createIntro } from "./intro";
import { createSites } from "./sites";
import { createSketch, faceAreas, HEADINGS, viewAt } from "./sketch";
import { createSky } from "./sky-scene";
import { createBoats } from "./boats";
import type { Steps } from "./steps";
import { finish, runFor } from "./steps";
import { createTour } from "./tour";
import { TOWN_VERSION } from "./world";
import { approach, clamp, easeInOut } from "./ease";

/** CSS pixels per world unit at zoom 1: a cell's diamond is 64px wide. */
const PIXELS_PER_UNIT = 64 / Math.SQRT2;
const CAMERA_DISTANCE = 300;
const MAX_ZOOM = 3.2;
/** How close the camera starts while the town is built: on downtown's first sites. */
const BUILD_CLOSE = 1.1;
/** How long a frame may spend drawing the views a turn away (ms). */
const AHEAD_MS = 4;
/** Ground directions that run right and up the screen, for a view toward the camera. */
const screenAxes = (view: Vec3) => {
  const flat = Math.hypot(view[0], view[2]);
  return {
    right: { x: view[2] / flat, z: -view[0] / flat },
    up: { x: -view[0] / flat, z: -view[2] / flat },
  };
};
/** The ground is foreshortened by the 30° elevation: it reads half as deep. */
const FORESHORTEN = Math.sin(Math.PI / 6);
/** How far above a roof its pin floats, in cells. */
const PIN_LIFT = 0.3;
/** How fast held arrow keys pan the view, in CSS pixels a second. */
const KEY_PAN_SPEED = 700;
/** How long a quarter turn of the camera takes (ms). */
const TURN_MS = 520;

export interface CityCallbacks {
  /** The building showing its colors: hovered, focused, or passed by the flyover. */
  onHover: (slug: string | null) => void;
  /** A building was clicked: open its project. */
  onOpen: (slug: string) => void;
  /** The flyover took the camera, or let it go. */
  onTour: (touring: boolean) => void;
}

export interface CityOptions extends CityCallbacks {
  projects: CityProject[];
  theme: Theme;
  reducedMotion: boolean;
  /** Where visitors' lines and other people's pointers float. */
  overlay: HTMLElement | null;
  /** Share the town with everyone else on the page; false keeps it to this browser. */
  shared: boolean;
  /**
   * The whole town as the pointer meets it, pins included: moves, wheels and
   * leaving are heard here, presses only on the canvas so a pin's click stays its own.
   */
  surface: HTMLElement;
}

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

/** The town as one view sketches it. */
interface Town {
  placed: Placed[];
  sketch: Sketch;
}

/** The views a drawing keeps the faces of: its own, or both ends of a turn. */
const coversAt = (at: number) =>
  Number.isInteger(at) ? [viewAt(at)] : [viewAt(at - 0.5), viewAt(at + 0.5)];

/** Where to look to frame a building from a view: lifted for its height. */
const framing = ({ bounds }: Placed, view: Vec3) => {
  // Half the building's height on screen, laid back onto the ground, halved
  // again so short and tall buildings both sit near the middle.
  const lift = (bounds.h * Math.cos(Math.PI / 6)) / 2 / FORESHORTEN / 2;
  const { up } = screenAxes(view);
  return {
    x: bounds.x + bounds.w / 2 + up.x * lift,
    z: bounds.z + bounds.d / 2 + up.z * lift,
  };
};

/**
 * The town as one quarter turn sees it: every face and line sketched for that
 * view, the moving parts animated, and the sky over it. Only one is shown.
 * @yields {void} between buildings, so it can be spread over frames.
 */
const townViewSteps = function* townViewSteps(
  scene: Scene,
  materials: ReturnType<typeof createMaterials>,
  town: Town,
  view: Vec3,
  covers: readonly Vec3[],
  /** When each part of it goes up; BUILT once the town's up. */
  startAt: StartAt,
  still: boolean,
  looks: ReadonlyMap<string, Look>,
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
  const sky = createSky(scene, materials, still, view, covers);
  const builds = [city, ...buildings.values(), ...sky.builds];
  for (const built of [city, ...buildings.values()]) {
    scene.add(built.group);
  }
  return {
    animations,
    buildings,
    city,
    dispose: () => {
      for (const built of builds) {
        scene.remove(built.group);
        built.dispose();
      }
    },
    show: (shown: boolean) => {
      for (const built of builds) {
        built.group.visible = shown;
      }
    },
    sky,
  };
};

type TownView = ReturnType<typeof townViewSteps> extends Generator<unknown, infer T> ? T : never;

/** The last placement written to a pin, so a still camera writes nothing. */
interface PinState {
  x: number;
  y: number;
  hidden: boolean;
  lit: boolean;
}

export const createCity = (container: HTMLElement, options: CityOptions) => {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.touchAction = "none";
  canvas.style.outline = "none";
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "A city of Kai's projects. Drag or scroll to look around, pinch to zoom, [ and ] to turn, click a building to open it, and pick up cars and people to move them.",
  );
  container.append(canvas);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_DISTANCE * 2);
  let { theme } = options;
  const plan = planCity(planEntries(options.projects));
  /**
   * The town's drawings, by heading: whole quarter turns where the camera
   * rests, halves for a turn between two, which keep every face either end
   * sees. Only the ones near the camera are kept.
   */
  const townViews = new Map<number, TownView>();
  // The first view's drawing also says where every building is, and how tall.
  const firstTown = finish(sketchSteps(plan, options.projects, viewAt(0), coversAt(0)));
  const { placed } = firstTown;
  // Each building lights up in its project's colors, and rings its lot in them.
  const looks = new Map(
    placed.map((entry) => [
      entry.project.slug,
      lookOf(faceAreas(entry.sketch), entry.project.colors),
    ]),
  );

  const schedule = createSchedule(
    plan,
    new Map(placed.map((entry) => [entry.lot.slug, entry.bounds.y + entry.bounds.h])),
  );
  const growth = createGrowth();
  const materials = createMaterials(theme, growth.adapt);
  if (options.reducedMotion) {
    growth.set(ALL_BUILT);
  }
  // The building sites that put it up, there only while it's going up.
  let sites = options.reducedMotion ? null : createSites(scene, materials, schedule, plan);
  const intro = createIntro({
    built: schedule.end,
    cleared: Math.max(schedule.end, sites?.end ?? 0),
    still: options.reducedMotion,
  });
  const packUp = () => {
    sites?.dispose();
    sites = null;
  };
  /**
   * Sketches and builds the town for a heading, and keeps it hidden.
   * @yields {void} between pieces, so it can be spread over frames.
   */
  const townSteps = function* townSteps(at: number, sketched?: Town): Steps<TownView> {
    const town = sketched ?? (yield* sketchSteps(plan, options.projects, viewAt(at), coversAt(at)));
    const created = yield* townViewSteps(
      scene,
      materials,
      town,
      viewAt(at),
      coversAt(at),
      // A view drawn once the town's up has nothing left to raise.
      intro.phase === "done" ? BUILT : schedule.startAt,
      options.reducedMotion,
      looks,
    );
    created.show(false);
    townViews.set(at, created);
    return created;
  };
  /** The view being drawn ahead, between frames. */
  let drafting: { at: number; steps: Steps<TownView> } | null = null;
  const townViewAt = (at: number, town?: Town) => {
    const existing = townViews.get(at);
    if (existing) {
      return existing;
    }
    // Wanted now: whatever's left of it is drawn at once.
    if (drafting?.at === at) {
      const { steps } = drafting;
      drafting = null;
      return finish(steps);
    }
    return finish(townSteps(at, town));
  };
  /** How many quarter turns the camera has made round the town, and where it is mid-turn. */
  let heading = 0;
  let angle = 0;
  let turning: { by: 1 | -1; start: number } | null = null;
  let shownTown = townViewAt(0, firstTown);
  shownTown.show(true);
  // A soft ring of each building's own color round its lot while it's lit.
  const halo = createHalo();
  scene.add(halo.mesh);

  const bySlug = new Map(placed.map((entry) => [entry.project.slug, entry]));
  const boxes = placed.map((entry) => ({
    box: new Box3(
      new Vector3(entry.bounds.x - 0.1, entry.bounds.y, entry.bounds.z - 0.1),
      new Vector3(
        entry.bounds.x + entry.bounds.w + 0.1,
        entry.bounds.y + entry.bounds.h,
        entry.bounds.z + entry.bounds.d + 0.1,
      ),
    ),
    entry,
  }));
  const focusFor = (view: Vec3) => placed.map((entry) => framing(entry, view));
  const tourFor = (points: readonly { x: number; z: number }[]) =>
    createTour(
      placed.map((entry, index) => ({
        slug: entry.project.slug,
        x: points[index]?.x ?? 36,
        z: points[index]?.z ?? 36,
      })),
    );
  let focusPoints = focusFor(viewAt(0));
  let tour = tourFor(focusPoints);

  // The camera: where it looks, how close, and where it is easing to.
  let width = 1;
  let height = 1;
  const view = { x: 36, z: 37, zoom: 1 };
  let goal: { x: number; z: number; zoom: number } | null = null;
  let tourAt = 0;
  const fitZoom = () => Math.min(width / (84 * PIXELS_PER_UNIT), height / (34 * PIXELS_PER_UNIT));
  const minZoom = () => Math.max(0.2, fitZoom() * 0.9);
  // The opening pulls back to most of the island, its shore off the edges, not all of it in a ring of sea.
  const introZoom = () => Math.max(minZoom(), fitZoom() * 1.8);
  const tourZoom = () => clamp(Math.min(width, height * 1.6) / 1100, 0.7, 1.25);

  const place = () => {
    view.zoom = clamp(view.zoom, minZoom(), MAX_ZOOM);
    // Keep the island in reach: the target stops a little out to sea and slides along the coast.
    [view.x, view.z] = withinReach(view.x, view.z, 4);
    const unit = PIXELS_PER_UNIT * view.zoom;
    camera.left = -width / 2 / unit;
    camera.right = width / 2 / unit;
    camera.top = height / 2 / unit;
    camera.bottom = -height / 2 / unit;
    const toward = viewAt(angle);
    camera.position.set(
      view.x + toward[0] * CAMERA_DISTANCE,
      toward[1] * CAMERA_DISTANCE,
      view.z + toward[2] * CAMERA_DISTANCE,
    );
    camera.lookAt(view.x, 0, view.z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    materials.setZoom(view.zoom);
  };
  const resize = () => {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    materials.setPixelRatio(renderer.getPixelRatio());
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    place();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  view.zoom = fitZoom();
  place();

  // The town's life: its traffic, its people and their lines, what anyone
  // picks up, shared with everyone in the room.
  const projected = new Vector3();
  // How high what's underfoot is, for something carried: the town's flat tops, worked out
  // from the first view's drawing (tops are the same from every side) the first time it's needed.
  let heights: ((x: number, z: number) => number) | null = null;
  const surfaceAt = (x: number, z: number) => {
    heights ??= createHeights(
      [firstTown.sketch, ...placed.map((entry) => entry.sketch)],
      (px, pz) => (plan.blocks.some((block) => contains(block, px, pz)) ? CURB_TOP : 0),
    );
    return heights(x, z);
  };
  const toScreen = (x: number, y: number, z: number) => {
    projected.set(x, y, z).project(camera);
    return { x: ((projected.x + 1) / 2) * width, y: ((1 - projected.y) / 2) * height };
  };
  const life = createLife({
    overlay: options.overlay,
    placed,
    plan,
    // One room per version of the town, so a page from an older deploy never mixes in.
    room: options.shared
      ? `kyh-town-${TOWN_VERSION}-${hashString(options.projects.map((project) => project.slug).join(",")).toString(36)}`
      : null,
    scale: () => PIXELS_PER_UNIT * view.zoom,
    scene,
    size: () => ({ height, width }),
    surfaceAt,
    theme,
    toScreen,
    view: () => viewAt(angle),
  });

  // Boats sail on this page's clock alone, the same in every view of the town.
  const boats = createBoats();
  const underfoot = () => ({ surfaceAt, view: viewAt(angle) });
  /** The town's own time (s), and how the frames have been keeping up. */
  const clock = { last: performance.now(), slow: 0, time: 0 };

  /** The pointer carrying something, and what, if one is; and whether the mouse is over something to carry. */
  let carrying: { pointer: number; what: "actor" | "boat" } | null = null;
  let overActor = false;

  // What's lit, and whether the flyover has the camera: the rules are in controls.ts.
  const spotlight = createSpotlight<Placed>({
    now: () => performance.now(),
    // The visitor has the camera: a glide to a focused building stops too.
    onTake: () => {
      goal = null;
      intro.take();
    },
    onTour: options.onTour,
    still: options.reducedMotion,
  });
  let shown: Placed | null = null;
  // Repainting rewrites every vertex color, so each drawing remembers what it was last painted for.
  const paintedFor = new WeakMap<TownView, string>();
  const paintKey = () => `${theme}|${shown?.project.slug ?? ""}`;
  const updateCursor = () => {
    if (carrying !== null) {
      canvas.style.cursor = "grabbing";
    } else if (overActor) {
      canvas.style.cursor = "grab";
    } else {
      canvas.style.cursor = spotlight.pointer ? "pointer" : "";
    }
  };
  const refreshHover = () => {
    const next = spotlight.lit;
    if (next === shown) {
      return;
    }
    if (shown) {
      shownTown.buildings.get(shown.project.slug)?.paint(theme, false);
    }
    shown = next;
    if (shown) {
      shownTown.buildings.get(shown.project.slug)?.paint(theme, true);
    }
    paintedFor.set(shownTown, paintKey());
    halo.show(
      shown && {
        rect: shown.lot,
        tone: looks.get(shown.project.slug)?.glow ?? PALETTE.accentBlue,
        y: shown.bounds.y,
      },
    );
    updateCursor();
    options.onHover(shown?.project.slug ?? null);
  };

  const paintTown = (town: TownView) => {
    if (paintedFor.get(town) === paintKey()) {
      return;
    }
    paintedFor.set(town, paintKey());
    town.city.paint(theme, false);
    for (const [slug, built] of town.buildings) {
      built.paint(theme, slug === shown?.project.slug);
    }
    for (const built of town.sky.builds) {
      built.paint(theme, false);
    }
  };
  const applyTheme = () => {
    renderer.setClearColor(new Color(shade("sea", theme, false)));
    materials.setTheme(theme);
    for (const town of townViews.values()) {
      paintTown(town);
    }
    sites?.paint(theme);
    life.setTheme(theme);
  };
  applyTheme();

  /** The flyover takes the camera, from `from` along its path or from the nearest point. */
  const playTour = (from: number | null = null) => {
    if (tour && spotlight.play()) {
      goal = null;
      tourAt = from ?? tour.closest(view.x, view.z);
    }
  };
  const takeControl = () => {
    spotlight.take();
    refreshHover();
  };

  const raycaster = new Raycaster();
  const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  const aim = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((clientY - rect.top) / rect.height) * 2,
      ),
      camera,
    );
  };
  const groundAt = (clientX: number, clientY: number) => {
    aim(clientX, clientY);
    return (
      raycaster.ray.intersectPlane(groundPlane, new Vector3()) ?? new Vector3(view.x, 0, view.z)
    );
  };
  /** The ground point under the pointer, as a spot in town. */
  const spotAt = (clientX: number, clientY: number) => {
    const ground = groundAt(clientX, clientY);
    return { x: ground.x, y: 0, z: ground.z };
  };
  /** A client point relative to the canvas. */
  const local = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const pick = (clientX: number, clientY: number) => {
    aim(clientX, clientY);
    let best: Placed | null = null;
    let bestDistance = Infinity;
    const hit = new Vector3();
    for (const { box, entry } of boxes) {
      if (raycaster.ray.intersectBox(box, hit)) {
        const distance = hit.distanceTo(raycaster.ray.origin);
        if (distance < bestDistance) {
          best = entry;
          bestDistance = distance;
        }
      }
    }
    return best;
  };

  /** Zoom about a screen point, keeping the ground under it still. */
  const zoomAt = (factor: number, clientX: number, clientY: number) => {
    const before = groundAt(clientX, clientY);
    view.zoom = clamp(view.zoom * factor, minZoom(), MAX_ZOOM);
    place();
    const after = groundAt(clientX, clientY);
    view.x += before.x - after.x;
    view.z += before.z - after.z;
    place();
  };
  const panBy = (dx: number, dy: number) => {
    const unit = PIXELS_PER_UNIT * view.zoom;
    const { right, up } = screenAxes(viewAt(angle));
    view.x -= (right.x * dx - (up.x * dy) / FORESHORTEN) / unit;
    view.z -= (right.z * dx - (up.z * dy) / FORESHORTEN) / unit;
    place();
  };

  // Opening a project: one tab per click, even on a double click.
  let openedAt = 0;
  const open = (entry: Placed) => {
    const now = performance.now();
    if (now - openedAt > 800) {
      openedAt = now;
      options.onOpen(entry.project.slug);
    }
  };

  /** The pins floating over the buildings, by slug. */
  let pins = new Map<string, HTMLElement>();
  const presses = createPresses();
  /** Where the mouse last was over the town, to see what's under it after the camera moves. */
  let mouseAt: { x: number; y: number } | null = null;
  /** The boat under a screen point, if one's afloat there. */
  const boatAt = (x: number, y: number) => {
    const reach = Math.max(12, PIXELS_PER_UNIT * view.zoom * 0.5);
    let best: { index: number; distance: number } | null = null;
    for (const [index, pose] of boats.poses(clock.time).entries()) {
      const at = toScreen(pose.x, pose.y + 0.4, pose.z);
      const distance = Math.hypot(at.x - x, at.y - y);
      if (!pose.held && distance < reach && (!best || distance < best.distance)) {
        best = { distance, index };
      }
    }
    return best?.index ?? null;
  };
  const canLift = (x: number, y: number) => life.actorAt(x, y) !== null || boatAt(x, y) !== null;
  /** Take hold of the car, person or boat under the pointer, if there's one free. */
  const grabAt = (event: PointerEvent) => {
    const at = local(event.clientX, event.clientY);
    const pointer = spotAt(event.clientX, event.clientY);
    const key = life.actorAt(at.x, at.y);
    if (key) {
      return life.grab(key, pointer) ? "actor" : null;
    }
    const index = boatAt(at.x, at.y);
    const pose = index === null ? undefined : boats.poses(clock.time)[index];
    return index !== null &&
      pose &&
      boats.grab(index, pose, pointer, underfoot(), performance.now())
      ? "boat"
      : null;
  };
  /** Pick up whatever is under the pointer; false if there's none to take. */
  const tryGrab = (event: PointerEvent) => {
    const what = presses.count === 0 && event.button === 0 ? grabAt(event) : null;
    if (!what) {
      return false;
    }
    canvas.setPointerCapture(event.pointerId);
    carrying = { pointer: event.pointerId, what };
    spotlight.grab();
    refreshHover();
    updateCursor();
    discoverEgg("lift");
    return true;
  };
  const onPointerDown = (event: PointerEvent) => {
    if (carrying !== null || tryGrab(event)) {
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    presses.press(event.pointerId, event.clientX, event.clientY);
  };
  const onHoverMove = (event: PointerEvent) => {
    if (!isHover(event.pointerType, event.movementX, event.movementY)) {
      return;
    }
    life.point(spotAt(event.clientX, event.clientY));
    const at = local(event.clientX, event.clientY);
    overActor = canLift(at.x, at.y);
    spotlight.hover(pick(event.clientX, event.clientY));
    refreshHover();
    updateCursor();
  };
  /** After a zoom or pan the mouse didn't make, light whatever is under it now. */
  const repick = () => {
    if (!mouseAt || carrying !== null) {
      return;
    }
    const at = local(mouseAt.x, mouseAt.y);
    overActor = canLift(at.x, at.y);
    life.point(spotAt(mouseAt.x, mouseAt.y));
    spotlight.recheck(pick(mouseAt.x, mouseAt.y));
    refreshHover();
    updateCursor();
  };
  /** Show one of the town's drawings, lit as the spotlight says. */
  const showTown = (town: TownView) => {
    shownTown.show(false);
    shownTown = town;
    paintTown(town);
    town.show(true);
  };
  // Sketching a view takes a noticeable moment, so the ones a turn from here
  // are drawn ahead, a few milliseconds a frame, rather than when a key is
  // pressed: drawn in one go they'd stall the flyover.
  let ahead: number[] = [];
  const drawAhead = () => {
    const left = (heading + HEADINGS - 1) % HEADINGS;
    const right = (heading + 1) % HEADINGS;
    ahead = [heading + 0.5, right, left + 0.5, left];
    // A view no longer a turn away is dropped half drawn: nothing of it is in
    // the scene or on the GPU yet.
    if (drafting && !ahead.includes(drafting.at)) {
      drafting = null;
    }
  };
  /** A frame's share of drawing ahead. */
  const draftAhead = () => {
    while (!drafting) {
      const at = ahead.shift();
      if (at === undefined) {
        return;
      }
      if (!townViews.has(at)) {
        drafting = { at, steps: townSteps(at) };
      }
    }
    const done = runFor(drafting.steps, AHEAD_MS);
    if (done) {
      drafting = null;
      paintTown(done.value);
    }
  };
  /** The camera comes to rest at `to`: its own drawing, and the flyover's path as it sees it. */
  const settle = (to: number) => {
    turning = null;
    heading = to;
    angle = to;
    showTown(townViewAt(to));
    // Keep what a turn either way needs; the rest is drawn again if the camera comes back.
    const near = new Set([
      to,
      (to + 1) % HEADINGS,
      (to + 3) % HEADINGS,
      to + 0.5,
      (to + 3.5) % HEADINGS,
    ]);
    for (const [at, town] of townViews) {
      if (!near.has(at)) {
        town.dispose();
        townViews.delete(at);
      }
    }
    focusPoints = focusFor(viewAt(to));
    tour = tourFor(focusPoints);
    if (tour && spotlight.touring) {
      tourAt = tour.closest(view.x, view.z);
    }
    place();
    repick();
    drawAhead();
  };
  /** Swing the camera a quarter turn round the point it looks at. */
  const headingAfter = (by: number) => (((heading + by) % HEADINGS) + HEADINGS) % HEADINGS;
  const turn = (by: 1 | -1) => {
    if (turning) {
      settle(headingAfter(turning.by));
    }
    const to = headingAfter(by);
    if (options.reducedMotion) {
      settle(to);
      return;
    }
    // Sketch the far end now, so arriving there doesn't stall.
    paintTown(townViewAt(to));
    showTown(townViewAt((by === 1 ? heading : to) + 0.5));
    turning = { by, start: performance.now() };
  };
  /** Mid-turn: ease the camera round, and come to rest at the end. */
  const swing = (now: number) => {
    if (!turning) {
      return;
    }
    const t = clamp((now - turning.start) / TURN_MS, 0, 1);
    const eased = easeInOut(t);
    angle = heading + turning.by * eased;
    place();
    if (t >= 1) {
      settle(headingAfter(turning.by));
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "mouse") {
      mouseAt = { x: event.clientX, y: event.clientY };
      life.hand(local(event.clientX, event.clientY));
    }
    if (carrying?.pointer === event.pointerId) {
      const pointer = spotAt(event.clientX, event.clientY);
      if (carrying.what === "boat") {
        boats.carry(pointer, underfoot(), performance.now());
      } else {
        life.carry(pointer);
      }
      return;
    }
    if (!presses.has(event.pointerId)) {
      onHoverMove(event);
      return;
    }
    const move = presses.move(event.pointerId, event.clientX, event.clientY);
    if (!move) {
      return;
    }
    if (move.kind === "pinch" || move.started) {
      takeControl();
    }
    panBy(move.dx, move.dy);
    if (move.kind === "pinch" && move.zoom !== null) {
      zoomAt(move.zoom, move.at.x, move.at.y);
    }
  };
  const onTap = (event: PointerEvent) => {
    const opened = spotlight.tap(pick(event.clientX, event.clientY), event.pointerType);
    refreshHover();
    if (opened) {
      open(opened);
    }
  };
  /** Let go of what this pointer carries; true if it carried something. */
  const drop = (event: PointerEvent) => {
    if (carrying?.pointer !== event.pointerId) {
      return false;
    }
    if (carrying.what === "boat") {
      boats.letGo(clock.time);
    } else {
      life.letGo();
    }
    carrying = null;
    updateCursor();
    return true;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (drop(event)) {
      return;
    }
    const ended = presses.release(event.pointerId, event.button);
    if (ended === "tap") {
      onTap(event);
    } else if (ended === "drag") {
      repick();
    }
  };
  const onPointerCancel = (event: PointerEvent) => {
    if (drop(event)) {
      return;
    }
    // The browser took the gesture back (a system swipe, a long press): no tap.
    presses.cancel(event.pointerId);
  };
  const onPointerLeave = (event: PointerEvent) => {
    mouseAt = null;
    if (carrying === null) {
      life.point(null);
      life.hand(null);
    }
    overActor = false;
    // A finger leaves as it lifts: what its tap lit stays lit.
    if (event.pointerType !== "touch") {
      spotlight.leave(presses.count > 0);
    }
    refreshHover();
    updateCursor();
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    takeControl();
    // A trackpad's pinch arrives as ctrl+wheel; its two-finger scroll pans, as a drag does on touch.
    if (event.ctrlKey) {
      zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY);
    } else {
      const scale = event.deltaMode === 0 ? 1 : 40;
      panBy(-event.deltaX * scale, -event.deltaY * scale);
    }
    repick();
  };
  const onDoubleClick = (event: MouseEvent) => {
    // A double click on a building already opened it, and one on a car made it
    // hop; on open ground, zoom in.
    const at = local(event.clientX, event.clientY);
    if (!pick(event.clientX, event.clientY) && !life.actorAt(at.x, at.y)) {
      takeControl();
      zoomAt(1.8, event.clientX, event.clientY);
    }
  };
  /** Pan keys held down, and how fast they're moving the view (CSS pixels a second). */
  const panKeys = new Map<string, { dx: number; dy: number }>();
  const keyPan = { x: 0, y: 0 };
  const onKeyDown = (event: KeyboardEvent) => {
    const move = keyMove(event.key);
    if (!move) {
      // A key that doesn't move the view leaves the hover to the tour.
      return;
    }
    if (move.kind === "turn") {
      if (!event.repeat) {
        turn(move.by);
      }
      return;
    }
    takeControl();
    if (move.kind === "pan") {
      event.preventDefault();
      panKeys.set(event.key, { dx: move.dx, dy: move.dy });
      return;
    }
    view.zoom *= move.factor;
    place();
    repick();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    panKeys.delete(event.key);
  };
  const onBlur = () => {
    panKeys.clear();
  };
  /** Glide while pan keys are held: speed up into it and coast to a stop, as a game camera does. */
  const steerByKeys = (dt: number) => {
    let dx = 0;
    let dy = 0;
    for (const pan of panKeys.values()) {
      dx += pan.dx;
      dy += pan.dy;
    }
    const length = Math.hypot(dx, dy);
    const speed = length > 0 ? KEY_PAN_SPEED / length : 0;
    const k = approach(dt, panKeys.size > 0 ? 10 : 7);
    keyPan.x += (dx * speed - keyPan.x) * k;
    keyPan.y += (dy * speed - keyPan.y) * k;
    if (Math.hypot(keyPan.x, keyPan.y) < 4) {
      keyPan.x = 0;
      keyPan.y = 0;
      return;
    }
    panBy(keyPan.x * dt, keyPan.y * dt);
    repick();
  };
  // Every listener the town adds goes when it does: one abort, nothing left behind.
  const listening = new AbortController();
  const { signal } = listening;
  canvas.addEventListener("pointerdown", onPointerDown, { signal });
  options.surface.addEventListener("pointermove", onPointerMove, { signal });
  canvas.addEventListener("pointerup", onPointerUp, { signal });
  canvas.addEventListener("pointercancel", onPointerCancel, { signal });
  options.surface.addEventListener("pointerleave", onPointerLeave, { signal });
  options.surface.addEventListener("wheel", onWheel, { passive: false, signal });
  canvas.addEventListener("dblclick", onDoubleClick, { signal });
  canvas.addEventListener("keydown", onKeyDown, { signal });
  // Typing anywhere chats; the keys that move the view don't start a line.
  const stopChat = listenForChat({
    claims: (key) => keyMove(key) !== null,
    onDraft: life.type,
    onSend: life.say,
  });
  canvas.addEventListener("keyup", onKeyUp, { signal });
  canvas.addEventListener("blur", onBlur, { signal });

  // Pins: the page's icon links, kept floating over their roofs.
  const pinStates = new Map<string, PinState>();
  const anchor = new Vector3();
  const placePins = () => {
    const scale = clamp(0.7 + view.zoom * 0.3, 0.75, 1.15).toFixed(3);
    for (const [slug, element] of pins) {
      const entry = bySlug.get(slug);
      if (entry) {
        const { bounds } = entry;
        anchor
          .set(bounds.x + bounds.w / 2, bounds.y + bounds.h + PIN_LIFT, bounds.z + bounds.d / 2)
          .project(camera);
        const x = Math.round(((anchor.x + 1) / 2) * width * 10) / 10;
        const y = Math.round(((1 - anchor.y) / 2) * height * 10) / 10;
        // Pins wait for their buildings to finish growing.
        const hidden =
          intro.phase === "building" || x < -60 || x > width + 60 || y < -60 || y > height + 60;
        const lit = entry === shown;
        const last = pinStates.get(slug);
        if (!last || last.x !== x || last.y !== y || last.hidden !== hidden || last.lit !== lit) {
          pinStates.set(slug, { hidden, lit, x, y });
          element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          // Nearer pins over farther ones, and the lit one over all.
          element.style.zIndex = String(lit ? 100_000 : Math.round(y));
          element.style.setProperty("--pin-scale", scale);
          element.dataset.hidden = String(hidden);
        }
      }
    }
  };

  // The loop.
  const nearestStop = (x: number, z: number) => {
    let nearest = Infinity;
    for (const focus of focusPoints) {
      nearest = Math.min(nearest, Math.hypot(focus.x - x, focus.z - z));
    }
    return nearest;
  };
  const followTour = (dt: number) => {
    if (!tour) {
      return;
    }
    // Slow down over each project, the way a title sequence lingers.
    const near = nearestStop(view.x, view.z);
    const speed = 1.7 * (0.35 + 0.65 * clamp((near - 0.8) / 3.5, 0, 1));
    tourAt += speed * dt;
    const point = tour.at(tourAt);
    const k = approach(dt, 2.2);
    view.x += (point.x - view.x) * k;
    view.z += (point.z - view.z) * k;
    view.zoom += (tourZoom() - view.zoom) * approach(dt, 1.2);
    const slug = tour.stopNear(view.x, view.z, 2.2)?.slug;
    spotlight.pass(slug === undefined ? null : (bySlug.get(slug) ?? null));
    refreshHover();
    place();
  };
  const glide = (dt: number) => {
    if (!goal) {
      return;
    }
    const k = approach(dt, 4);
    view.x += (goal.x - view.x) * k;
    view.z += (goal.z - view.z) * k;
    view.zoom += (goal.zoom - view.zoom) * k;
    if (
      Math.hypot(goal.x - view.x, goal.z - view.z) < 0.01 &&
      Math.abs(goal.zoom - view.zoom) < 0.002
    ) {
      goal = null;
    }
    place();
  };
  /** A weak GPU drawing at full density gets a lighter canvas instead of a slideshow. */
  const adapt = (elapsed: number) => {
    clock.slow = elapsed > 0.034 ? clock.slow + 1 : Math.max(0, clock.slow - 2);
    if (clock.slow > 90 && renderer.getPixelRatio() > 1) {
      clock.slow = 0;
      renderer.setPixelRatio(1);
      resize();
    }
  };
  const resumeWhenIdle = () => {
    // A hand holding a car or a person is a press too: the flyover leaves the camera to it.
    // While the town's still going up the camera's the opening's: its clock runs on
    // capped frame time, so on a slow or hidden page it can outlast the idle wait.
    if (intro.phase !== "building" && spotlight.idle(presses.count > 0 || carrying !== null)) {
      playTour();
    }
  };
  const lit = (slug: string) => shown?.project.slug === slug;
  /**
   * The first frame also draws everything, hidden or off screen, unseen
   * beneath the real frame, so nothing is first drawn mid-show: the cars and
   * people as the town opens, the halo under the first building the flyover
   * lights. Compiling shaders alone isn't enough; drivers finish the work at
   * the first draw.
   */
  let warmed = false;
  const drawEverything = () => {
    warmed = true;
    const kept: { object: Object3D; visible: boolean; frustumCulled: boolean }[] = [];
    scene.traverse((object) => {
      kept.push({ frustumCulled: object.frustumCulled, object, visible: object.visible });
      object.visible = true;
      object.frustumCulled = false;
    });
    renderer.render(scene, camera);
    for (const { object, visible, frustumCulled } of kept) {
      object.visible = visible;
      object.frustumCulled = frustumCulled;
    }
  };
  let frame = 0;
  /** A frame of the opening: the town goes up, the camera pulls back, then it opens and is cleared. */
  const grow = (elapsed: number) => {
    const { opened, cleared } = intro.step(elapsed);
    if (intro.clock !== null) {
      growth.set(intro.clock);
      sites?.update(intro.clock);
    }
    const { pullBack } = intro;
    if (pullBack !== null) {
      // Eased in the zoom's own scale, so it reads evenly.
      view.zoom = Math.exp(
        Math.log(BUILD_CLOSE) * (1 - pullBack) + Math.log(introZoom()) * pullBack,
      );
      place();
    }
    // Built: in from most of the island to the first project, unless the visitor
    // has the camera, while the last trucks drive off.
    if (opened) {
      life.setOpen(true);
      if (!intro.taken) {
        playTour(0);
      }
    }
    // Cleared: the machines are gone, and the views a turn away can be drawn without a hitch.
    if (cleared) {
      packUp();
      drawAhead();
      // Ready for the first pick-up, so it doesn't stall the hand.
      surfaceAt(CENTER, CENTER);
    }
  };
  const tick = (now: number) => {
    const elapsed = Math.max(0, now - clock.last) / 1000;
    grow(elapsed);
    clock.last = now;
    adapt(elapsed);
    // The camera keeps real time; the town skips ahead no more than a beat
    // after a stall, so nothing teleports when a tab comes back.
    const dt = Math.min(0.1, elapsed);
    clock.time += dt;
    resumeWhenIdle();
    if (spotlight.touring) {
      followTour(Math.min(0.25, elapsed));
    } else {
      glide(Math.min(0.25, elapsed));
    }
    swing(now);
    steerByKeys(Math.min(0.1, elapsed));
    life.update(Math.min(0.25, elapsed) * 1000);
    shownTown.animations.update(clock.time, lit);
    halo.update(Math.min(0.25, elapsed), clock.time, theme);
    shownTown.sky.update(clock.time, plan.countryside.pier, boats.poses(clock.time));
    if (!warmed) {
      drawEverything();
    }
    renderer.render(scene, camera);
    placePins();
    draftAhead();
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  // The opening shot: most of the island, then down to the first project and
  // across, left to right, the way the title sequence pans the valley.
  let warmUp = 0;
  if (intro.phase === "done") {
    playTour(0);
    // Once the opening shot has settled in, start on the views a turn away.
    warmUp = window.setTimeout(drawAhead, 3000);
  } else {
    life.setOpen(false);
  }

  return {
    /** What the town is up to, for poking at in development. */
    debug: () => ({
      ...life.debug(),
      /** Where each boat is drawn on screen. */
      boats: boats.poses(clock.time).map((pose) => toScreen(pose.x, pose.y + 0.4, pose.z)),
      intro: { clock: intro.clock, phase: intro.phase },
    }),
    dispose: () => {
      cancelAnimationFrame(frame);
      listening.abort();
      window.clearTimeout(warmUp);
      stopChat();
      observer.disconnect();
      for (const town of townViews.values()) {
        town.dispose();
      }
      halo.dispose();
      life.dispose();
      packUp();
      materials.dispose();
      renderer.dispose();
      canvas.remove();
    },
    /** Bring a building into view and light it, as when its pin is focused. */
    focus: (slug: string) => {
      const entry = bySlug.get(slug);
      if (entry) {
        spotlight.pin(entry);
        takeControl();
        goal = { ...framing(entry, viewAt(heading)), zoom: Math.max(view.zoom, 1) };
      }
    },
    /** Light a building from its pin; null when the pointer leaves the pin. */
    hover: (slug: string | null) => {
      spotlight.pin(slug === null ? null : (bySlug.get(slug) ?? null));
      refreshHover();
    },
    look: (x: number, z: number, zoom: number) => {
      takeControl();
      view.x = x;
      view.z = z;
      view.zoom = zoom;
      place();
    },
    setPins: (next: Map<string, HTMLElement>) => {
      pins = next;
      pinStates.clear();
    },
    setTheme: (next: Theme) => {
      theme = next;
      applyTheme();
    },
    /** A finger on a closed pin: light its building, as a first tap on the building does. */
    tap: (slug: string) => {
      const entry = bySlug.get(slug);
      if (entry) {
        spotlight.tap(entry, "touch");
        refreshHover();
      }
    },
    /** Play the flyover, or pause it until it's played again. */
    tour: (on: boolean) => {
      if (on) {
        playTour();
      } else {
        spotlight.pause();
        refreshHover();
      }
    },
  };
};

export type City = ReturnType<typeof createCity>;
