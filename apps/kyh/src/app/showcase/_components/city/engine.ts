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

import type { CityProject, Placed } from "./draw-landmarks";
import type { Theme } from "./palette";
import type { CityPlan } from "./plan";
import type { Built } from "./render";
import type { Sketch, Vec3 } from "./sketch";
import { createAnimations } from "./animate";
import { listenForChat } from "@/lib/chat-input";
import { createPresses, createSpotlight, isHover, keyMove } from "./controls";
import { drawBlock } from "./draw-blocks";
import { drawCountryside } from "./draw-countryside";
import { drawGround } from "./draw-ground";
import { drawLots, planEntries } from "./draw-landmarks";
import { createHalo } from "./halo";
import { createLife } from "./life";
import { shade, signature } from "./palette";
import { inland, planCity } from "./plan";
import { createRandom, hashString } from "./random";
import { build, createMaterials } from "./render";
import { createSchedule } from "./schedule";
import { createSites } from "./sites";
import { createSketch, faceAreas, HEADINGS, viewAt } from "./sketch";
import { BLIMP_HEADING, drawBalloon, drawBlimp, drawBoat, drawDrone, drawFerry } from "./sky";
import { createTour } from "./tour";
import { TOWN_VERSION } from "./world";
import { approach, clamp, easeInOut } from "./ease";

/** CSS pixels per world unit at zoom 1: a cell's diamond is 64px wide. */
const PIXELS_PER_UNIT = 64 / Math.SQRT2;
const CAMERA_DISTANCE = 300;
const MAX_ZOOM = 3.2;
/** How close the camera starts while the town is built: on downtown's first sites. */
const BUILD_CLOSE = 1.1;
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

/** The town sketched for a view, keeping the faces of every view in `covers`. */
const drawTown = (
  plan: CityPlan,
  projects: readonly CityProject[],
  view: Vec3,
  covers: readonly Vec3[],
) => {
  const sketch = createSketch(view, covers);
  drawGround(sketch, plan, createRandom(11));
  drawCountryside(sketch, plan);
  for (const block of plan.blocks) {
    drawBlock(sketch, block);
  }
  const placed = drawLots(sketch, plan, projects);
  return { placed, sketch };
};

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

const BLIMP_HEIGHT = 7.5;
const BLIMP_SPAN = 76;

/** A point on a tilted ellipse round the island, for boats. */
const sea = (angle: number, rx: number, rz: number) => ({
  x: 36 + Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
  z: 36 - Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
});

const createSky = (
  scene: Scene,
  materials: ReturnType<typeof createMaterials>,
  still: boolean,
  view: Vec3,
  covers: readonly Vec3[],
) => {
  const builds: Built[] = [];
  const add = (sketch: Sketch) => {
    const built = build(sketch, materials);
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

/**
 * The town as one quarter turn sees it: every face and line sketched for that
 * view, the moving parts animated, and the sky over it. Only one is shown.
 */
const createTownView = (
  scene: Scene,
  materials: ReturnType<typeof createMaterials>,
  /** For what never goes up: the sky over the town. */
  fixed: ReturnType<typeof createMaterials>,
  town: ReturnType<typeof drawTown>,
  view: Vec3,
  covers: readonly Vec3[],
  still: boolean,
) => {
  const city = build(town.sketch, materials);
  // Each project's building is built on its own, so it can light up alone.
  const buildings = new Map(
    town.placed.map((entry) => [entry.project.slug, build(entry.sketch, materials)] as const),
  );
  const rig = {
    parts: new Map([city, ...buildings.values()].flatMap((built) => [...built.parts])),
    screens: new Map([city, ...buildings.values()].flatMap((built) => [...built.screens])),
  };
  const animations = createAnimations(rig, { launches: !still });
  const sky = createSky(scene, fixed, still, view, covers);
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
  const townViews = new Map<number, ReturnType<typeof createTownView>>();
  const drawTownAt = (at: number) => {
    const covers = Number.isInteger(at) ? [viewAt(at)] : [viewAt(at - 0.5), viewAt(at + 0.5)];
    return drawTown(plan, options.projects, viewAt(at), covers);
  };
  // The first view's drawing also says where every building is, and how tall.
  const firstTown = drawTownAt(0);
  const { placed } = firstTown;
  const schedule = createSchedule(
    plan,
    new Map(placed.map((entry) => [entry.lot.slug, entry.bounds.y + entry.bounds.h])),
  );
  const materials = createMaterials(theme, options.reducedMotion ? null : schedule.startAt);
  const fixed = createMaterials(theme);
  /** Seconds the town has spent going up; null once it's built, or with reduced motion. */
  let growing: number | null = options.reducedMotion ? null : 0;
  // The building sites that put it up, there only while it's going up.
  let sites = growing === null ? null : createSites(scene, materials, fixed, schedule, plan);
  /** When the town's up and every truck and crane has gone (s). */
  const builtBy = Math.max(schedule.end, sites?.end ?? 0);
  /** Whether the flyover has been sent off now the buildings are up. */
  let toured = false;
  /** The buildings are still going up (the last trucks may drive off after). */
  const stillBuilding = () => growing !== null && growing < schedule.end;
  const packUp = () => {
    sites?.dispose();
    sites = null;
  };
  const townViewAt = (at: number, town = drawTownAt(at)) => {
    const existing = townViews.get(at);
    if (existing) {
      return existing;
    }
    const covers = Number.isInteger(at) ? [viewAt(at)] : [viewAt(at - 0.5), viewAt(at + 0.5)];
    const created = createTownView(
      scene,
      materials,
      fixed,
      town,
      viewAt(at),
      covers,
      options.reducedMotion,
    );
    created.show(false);
    townViews.set(at, created);
    return created;
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
  const colors = new Map(placed.map((entry) => [entry, signature(faceAreas(entry.sketch))]));

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
  // Close on downtown as the first ground's broken, pulling back to the whole island as it's built.
  const view = { x: 36, z: 37, zoom: options.reducedMotion ? 0 : BUILD_CLOSE };
  let goal: { x: number; z: number; zoom: number } | null = null;
  let tourAt = 0;
  const fitZoom = () => Math.min(width / (84 * PIXELS_PER_UNIT), height / (34 * PIXELS_PER_UNIT));
  const minZoom = () => Math.max(0.2, fitZoom() * 0.9);
  const tourZoom = () => clamp(Math.min(width, height * 1.6) / 1100, 0.7, 1.25);

  const place = () => {
    view.zoom = clamp(view.zoom, minZoom(), MAX_ZOOM);
    // Keep the island in reach: the target may not wander far out to sea.
    if (inland(view.x, view.z) < -4) {
      view.x += (36 - view.x) * 0.06;
      view.z += (36 - view.z) * 0.06;
    }
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
    fixed.setZoom(view.zoom);
  };
  const resize = () => {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
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
    theme,
    toScreen: (x, y, z) => {
      projected.set(x, y, z).project(camera);
      return { x: ((projected.x + 1) / 2) * width, y: ((1 - projected.y) / 2) * height };
    },
    town: firstTown.sketch,
    view: () => viewAt(angle),
  });

  /** The pointer carrying something, if one is; and whether the mouse is over something to carry. */
  let carrying: number | null = null;
  let overActor = false;

  // What's lit, and whether the flyover has the camera: the rules are in controls.ts.
  /** The visitor took the camera while the town was going up: the flyover waits for idle instead. */
  let handsOn = false;
  const spotlight = createSpotlight<Placed>({
    now: () => performance.now(),
    // The visitor has the camera: a glide to a focused building stops too.
    onTake: () => {
      goal = null;
      handsOn = true;
    },
    onTour: options.onTour,
    still: options.reducedMotion,
  });
  let shown: Placed | null = null;
  // Repainting rewrites every vertex color, so each drawing remembers what it was last painted for.
  const paintedFor = new WeakMap<ReturnType<typeof createTownView>, string>();
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
        token: colors.get(shown) ?? "accentBlue",
        y: shown.bounds.y,
      },
    );
    updateCursor();
    options.onHover(shown?.project.slug ?? null);
  };

  const paintTown = (town: ReturnType<typeof createTownView>) => {
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
    fixed.setTheme(theme);
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
  /** Pick up whatever car or person is under the pointer; false if there's none to take. */
  const tryGrab = (event: PointerEvent) => {
    const at = local(event.clientX, event.clientY);
    const key = presses.count === 0 && event.button === 0 ? life.actorAt(at.x, at.y) : null;
    if (!key || !life.grab(key, spotAt(event.clientX, event.clientY))) {
      return false;
    }
    canvas.setPointerCapture(event.pointerId);
    carrying = event.pointerId;
    spotlight.grab();
    refreshHover();
    updateCursor();
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
    overActor = life.actorAt(at.x, at.y) !== null;
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
    overActor = life.actorAt(at.x, at.y) !== null;
    life.point(spotAt(mouseAt.x, mouseAt.y));
    spotlight.recheck(pick(mouseAt.x, mouseAt.y));
    refreshHover();
    updateCursor();
  };
  /** Show one of the town's drawings, lit as the spotlight says. */
  const showTown = (town: ReturnType<typeof createTownView>) => {
    shownTown.show(false);
    shownTown = town;
    paintTown(town);
    town.show(true);
  };
  // Sketching a view takes a noticeable moment, so the ones a turn from here
  // are drawn ahead, one at a time between frames, rather than when a key is pressed.
  let ahead = 0;
  const drawAhead = () => {
    const left = (heading + HEADINGS - 1) % HEADINGS;
    const right = (heading + 1) % HEADINGS;
    const queue = [heading + 0.5, right, left + 0.5, left];
    const next = () => {
      const step = queue.shift();
      if (step !== undefined) {
        paintTown(townViewAt(step));
        ahead = window.setTimeout(next, 250);
      }
    };
    window.clearTimeout(ahead);
    ahead = window.setTimeout(next, 250);
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
    if (carrying === event.pointerId) {
      life.carry(spotAt(event.clientX, event.clientY));
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
    if (carrying !== event.pointerId) {
      return false;
    }
    carrying = null;
    life.letGo();
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
  canvas.addEventListener("pointerdown", onPointerDown);
  options.surface.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  options.surface.addEventListener("pointerleave", onPointerLeave);
  options.surface.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("dblclick", onDoubleClick);
  canvas.addEventListener("keydown", onKeyDown);
  // Typing anywhere chats; the keys that move the view don't start a line.
  const stopChat = listenForChat({
    claims: (key) => keyMove(key) !== null,
    onDraft: life.type,
    onSend: life.say,
  });
  canvas.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("blur", onBlur);

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
        const hidden = stillBuilding() || x < -60 || x > width + 60 || y < -60 || y > height + 60;
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
  const clock = { last: performance.now(), slow: 0, time: 0 };
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
    // While the town's still going up, the camera holds on the whole island.
    if (!stillBuilding() && spotlight.idle(presses.count > 0 || carrying !== null)) {
      playTour();
    }
  };
  const lit = (slug: string) => shown?.project.slug === slug;
  let frame = 0;
  // Counted in frames' time, a slow one (the first few, compiling shaders)
  // capped, so the growing plays out whole instead of skipping ahead.
  const grow = (elapsed: number) => {
    if (growing === null) {
      return;
    }
    growing += Math.min(elapsed, 0.05);
    materials.setGrowth(growing);
    sites?.update(growing);
    if (!handsOn && growing < schedule.end) {
      // Pulling back, eased, in the zoom's own scale so it reads evenly.
      const k = clamp(growing / (schedule.end * 0.8), 0, 1);
      const eased = easeInOut(k);
      view.zoom = Math.exp(Math.log(BUILD_CLOSE) * (1 - eased) + Math.log(minZoom()) * eased);
      place();
    }
    // Built: in from the whole island to the first project, unless the visitor
    // has the camera, while the last trucks drive off.
    if (growing >= schedule.end && !toured) {
      toured = true;
      life.setOpen(true);
      if (!handsOn) {
        playTour(0);
      }
    }
    if (growing >= builtBy) {
      growing = null;
      packUp();
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
    shownTown.sky.update(clock.time, plan.countryside.pier);
    renderer.render(scene, camera);
    placePins();
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  // The opening shot: the whole island, then down to the first project and
  // across, left to right, the way the title sequence pans the valley.
  if (growing === null) {
    playTour(0);
  } else {
    life.setOpen(false);
  }
  // Once the opening has settled in, start on the views a turn away.
  const warmUp = setTimeout(drawAhead, 3000);

  return {
    /** What the town is up to, for poking at in development. */
    debug: () => ({ ...life.debug(), buildEnd: schedule.end, building: growing }),
    dispose: () => {
      cancelAnimationFrame(frame);
      clearTimeout(warmUp);
      stopChat();
      window.clearTimeout(ahead);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      options.surface.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      options.surface.removeEventListener("pointerleave", onPointerLeave);
      options.surface.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("blur", onBlur);
      for (const town of townViews.values()) {
        town.dispose();
      }
      halo.dispose();
      life.dispose();
      packUp();
      materials.dispose();
      fixed.dispose();
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
