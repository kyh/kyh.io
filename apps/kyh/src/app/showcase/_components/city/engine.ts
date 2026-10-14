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
import type { Built } from "./render";
import type { Sketch } from "./sketch";
import { createAnimations } from "./animate";
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
import { createSketch, faceAreas, VIEW } from "./sketch";
import { BLIMP_HEADING, drawBalloon, drawBlimp, drawBoat, drawDrone, drawFerry } from "./sky";
import { createTour } from "./tour";
import { TOWN_VERSION } from "./world";

/** CSS pixels per world unit at zoom 1: a cell's diamond is 64px wide. */
const PIXELS_PER_UNIT = 64 / Math.SQRT2;
const CAMERA_DISTANCE = 300;
const MAX_ZOOM = 3.2;
const DRAG_THRESHOLD = 5;
/** On the ground, the directions that move along the screen. */
const SCREEN_RIGHT = new Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2);
const SCREEN_UP = new Vector3(-Math.SQRT1_2, 0, -Math.SQRT1_2);
/** The ground is foreshortened by the 30° elevation: it reads half as deep. */
const FORESHORTEN = Math.sin(Math.PI / 6);
/** Left alone this long, the flyover picks up again. */
const IDLE_SECONDS = 30;
/** How far above a roof its pin floats, in cells. */
const PIN_LIFT = 0.3;

export interface CityCallbacks {
  /** The building showing its colors: hovered, focused, or passed by the flyover. */
  onHover: (slug: string | null) => void;
  /** A building was clicked: open its project. */
  onOpen: (slug: string) => void;
}

export interface CityOptions extends CityCallbacks {
  projects: CityProject[];
  theme: Theme;
  reducedMotion: boolean;
  /** Where visitors' lines and other people's pointers float. */
  overlay: HTMLElement | null;
  /** Share the town with everyone else on the page; false keeps it to this browser. */
  shared: boolean;
  /** How many people are in town, this one included. */
  onPeople: (count: number) => void;
}

const ease = (dt: number, rate: number) => 1 - Math.exp(-dt * rate);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const drawTown = (projects: readonly CityProject[]) => {
  const plan = planCity(planEntries(projects));
  const sketch = createSketch();
  drawGround(sketch, plan, createRandom(11));
  drawCountryside(sketch, plan);
  for (const block of plan.blocks) {
    drawBlock(sketch, block);
  }
  const placed = drawLots(sketch, plan, projects);
  return { placed, plan, sketch };
};

/** Where to look to frame a building: lifted for its height. */
const framing = ({ bounds }: Placed) => {
  // Half the building's height on screen, laid back onto the ground, halved
  // again so short and tall buildings both sit near the middle.
  const lift = (bounds.h * Math.cos(Math.PI / 6)) / 2 / FORESHORTEN / 2;
  return {
    x: bounds.x + bounds.w / 2 + SCREEN_UP.x * lift,
    z: bounds.z + bounds.d / 2 + SCREEN_UP.z * lift,
  };
};

const BLIMP_HEIGHT = 7.5;
const BLIMP_SPAN = 76;

/** A point on a tilted ellipse round the island, for boats. */
const sea = (angle: number, rx: number, rz: number) => ({
  x: 36 + Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
  z: 36 - Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
});

const createSky = (scene: Scene, materials: ReturnType<typeof createMaterials>, still: boolean) => {
  const builds: Built[] = [];
  const add = (sketch: Sketch) => {
    const built = build(sketch, materials);
    builds.push(built);
    scene.add(built.group);
    return built;
  };
  const blimp = add(drawBlimp("KYH.IO"));
  const balloons = [add(drawBalloon(0)), add(drawBalloon(1))];
  const boats = [add(drawBoat("white")), add(drawBoat("accentRed")), add(drawBoat("accentBlue"))];
  const ferry = add(drawFerry());
  const drones = [add(drawDrone()), add(drawDrone()), add(drawDrone())];
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

const edgeOf = (x: number, width: number) => {
  if (x < 150) {
    return "start";
  }
  return x > width - 150 ? "end" : "center";
};

/** Who is lighting a building up, if anyone: the first of these wins. */
interface Hovers {
  pin: Placed | null;
  pointer: Placed | null;
  tour: Placed | null;
}

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
    "A city of Kai's projects. Drag to look around, scroll to zoom, click a building to open it, and pick up cars and people to move them.",
  );
  container.append(canvas);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_DISTANCE * 2);
  let { theme } = options;
  const materials = createMaterials(theme);
  const { placed, plan, sketch } = drawTown(options.projects);
  const city = build(sketch, materials);
  scene.add(city.group);
  // Each project's building is built on its own, so it can light up alone.
  const buildings = new Map(
    placed.map((entry) => {
      const built = build(entry.sketch, materials);
      scene.add(built.group);
      return [entry, built] as const;
    }),
  );
  const rig = {
    parts: new Map([city, ...buildings.values()].flatMap((built) => [...built.parts])),
    screens: new Map([city, ...buildings.values()].flatMap((built) => [...built.screens])),
  };
  const animations = createAnimations(rig, { launches: !options.reducedMotion });
  const sky = createSky(scene, materials, options.reducedMotion);
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
  const focusPoints = placed.map((entry) => framing(entry));
  const tour = createTour(
    placed.map((entry, index) => ({
      slug: entry.project.slug,
      x: focusPoints[index]?.x ?? 36,
      z: focusPoints[index]?.z ?? 36,
    })),
  );

  // The camera: where it looks, how close, and where it is easing to.
  let width = 1;
  let height = 1;
  const view = { x: 36, z: 38, zoom: 0.5 };
  let goal: { x: number; z: number; zoom: number } | null = null;
  let touring = false;
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
    camera.position.set(
      view.x + VIEW[0] * CAMERA_DISTANCE,
      VIEW[1] * CAMERA_DISTANCE,
      view.z + VIEW[2] * CAMERA_DISTANCE,
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
    onPeople: options.onPeople,
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
  });

  /** The pointer carrying something, if one is; and whether the mouse is over something to carry. */
  let carrying: number | null = null;
  let overActor = false;

  // Hover: a pin (pointer or keyboard), the pointer on a building, or the
  // flyover passing one. The first of those lights its building up.
  const hoverBy: Hovers = {
    pin: null,
    pointer: null,
    tour: null,
  };
  let shown: Placed | null = null;
  const updateCursor = () => {
    if (carrying !== null) {
      canvas.style.cursor = "grabbing";
    } else if (overActor) {
      canvas.style.cursor = "grab";
    } else {
      canvas.style.cursor = hoverBy.pointer ? "pointer" : "";
    }
  };
  const refreshHover = () => {
    const next = hoverBy.pin ?? hoverBy.pointer ?? hoverBy.tour;
    if (next === shown) {
      return;
    }
    if (shown) {
      buildings.get(shown)?.paint(theme, false);
    }
    shown = next;
    if (shown) {
      buildings.get(shown)?.paint(theme, true);
    }
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

  const applyTheme = () => {
    renderer.setClearColor(new Color(shade("sea", theme, false)));
    materials.setTheme(theme);
    city.paint(theme, false);
    for (const [entry, built] of buildings) {
      built.paint(theme, entry === shown);
    }
    for (const built of sky.builds) {
      built.paint(theme, false);
    }
    life.setTheme(theme);
  };
  applyTheme();

  let idleSince = performance.now();
  const setTour = (playing: boolean, from: number | null = null) => {
    if (playing === touring || !tour) {
      return;
    }
    touring = playing;
    if (playing) {
      goal = null;
      tourAt = from ?? tour.closest(view.x, view.z);
    } else {
      hoverBy.tour = null;
      refreshHover();
    }
  };
  const takeControl = () => {
    idleSince = performance.now();
    goal = null;
    setTour(false);
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
    view.x -= (SCREEN_RIGHT.x * dx - (SCREEN_UP.x * dy) / FORESHORTEN) / unit;
    view.z -= (SCREEN_RIGHT.z * dx - (SCREEN_UP.z * dy) / FORESHORTEN) / unit;
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

  const pointers = new Map<number, { x: number; y: number }>();
  /** Where the mouse last was over the town, to see what's under it after the camera moves. */
  let mouseAt: { x: number; y: number } | null = null;
  let dragged = false;
  let downAt = { x: 0, y: 0 };
  let pinch = 0;
  /** Pick up whatever car or person is under the pointer; false if there's none to take. */
  const tryGrab = (event: PointerEvent) => {
    const at = local(event.clientX, event.clientY);
    const key = pointers.size === 0 && event.button === 0 ? life.actorAt(at.x, at.y) : null;
    if (!key || !life.grab(key, spotAt(event.clientX, event.clientY))) {
      return false;
    }
    canvas.setPointerCapture(event.pointerId);
    carrying = event.pointerId;
    takeControl();
    hoverBy.pointer = null;
    refreshHover();
    updateCursor();
    return true;
  };
  const onPointerDown = (event: PointerEvent) => {
    if (carrying !== null || tryGrab(event)) {
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      dragged = false;
      downAt = { x: event.clientX, y: event.clientY };
    } else {
      const [a, b] = [...pointers.values()];
      pinch = a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
      dragged = true;
    }
  };
  const onPinch = (event: PointerEvent, previous: { x: number; y: number }) => {
    const [a, b] = [...pointers.values()];
    if (!a || !b) {
      return;
    }
    const spread = Math.hypot(a.x - b.x, a.y - b.y);
    takeControl();
    panBy((event.clientX - previous.x) / 2, (event.clientY - previous.y) / 2);
    if (pinch > 0) {
      zoomAt(spread / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    pinch = spread;
  };
  const onHoverMove = (event: PointerEvent) => {
    // A move of nothing is the browser rechecking what's under a resting
    // cursor, not a hover: the flyover keeps going.
    if (event.pointerType !== "mouse" || (event.movementX === 0 && event.movementY === 0)) {
      return;
    }
    life.point(spotAt(event.clientX, event.clientY));
    const at = local(event.clientX, event.clientY);
    overActor = life.actorAt(at.x, at.y) !== null;
    const hit = pick(event.clientX, event.clientY);
    if (hit) {
      // Hovering a building holds the camera still so it can be read.
      takeControl();
    }
    hoverBy.pointer = hit;
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
    hoverBy.pointer = pick(mouseAt.x, mouseAt.y);
    refreshHover();
    updateCursor();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === "mouse") {
      mouseAt = { x: event.clientX, y: event.clientY };
    }
    if (carrying === event.pointerId) {
      const spot = spotAt(event.clientX, event.clientY);
      life.carry(spot);
      life.point(spot);
      return;
    }
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      onHoverMove(event);
      return;
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      onPinch(event, previous);
      return;
    }
    if (
      !dragged &&
      Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > DRAG_THRESHOLD
    ) {
      dragged = true;
      takeControl();
    }
    if (dragged) {
      panBy(event.clientX - previous.x, event.clientY - previous.y);
    }
  };
  const onTap = (event: PointerEvent) => {
    const hit = pick(event.clientX, event.clientY);
    takeControl();
    if (!hit) {
      hoverBy.pointer = null;
    } else if (event.pointerType === "mouse" || hoverBy.pointer === hit) {
      open(hit);
    } else {
      // A finger can't hover: the first tap shows the building, the second opens it.
      hoverBy.pointer = hit;
    }
    refreshHover();
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
    pointers.delete(event.pointerId);
    if (pointers.size > 0) {
      return;
    }
    if (!dragged && event.button === 0) {
      onTap(event);
    } else if (dragged) {
      repick();
    }
    pinch = 0;
  };
  const onPointerCancel = (event: PointerEvent) => {
    if (drop(event)) {
      return;
    }
    // The browser took the gesture back (a system swipe, a long press): no tap.
    pointers.delete(event.pointerId);
    if (pointers.size === 0) {
      pinch = 0;
    }
  };
  const onPointerLeave = () => {
    mouseAt = null;
    if (carrying === null) {
      life.point(null);
    }
    overActor = false;
    if (pointers.size === 0 && hoverBy.pointer) {
      hoverBy.pointer = null;
      refreshHover();
    }
    updateCursor();
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    takeControl();
    zoomAt(Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015)), event.clientX, event.clientY);
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
  const keyPan = new Map<string, [number, number]>([
    ["ArrowDown", [0, -60]],
    ["ArrowLeft", [60, 0]],
    ["ArrowRight", [-60, 0]],
    ["ArrowUp", [0, 60]],
    ["a", [60, 0]],
    ["d", [-60, 0]],
    ["s", [0, -60]],
    ["w", [0, 60]],
  ]);
  const onKeyDown = (event: KeyboardEvent) => {
    const pan = keyPan.get(event.key);
    if (pan) {
      event.preventDefault();
      takeControl();
      panBy(...pan);
    } else if (event.key === "+" || event.key === "=") {
      takeControl();
      view.zoom *= 1.25;
      place();
    } else if (event.key === "-") {
      takeControl();
      view.zoom /= 1.25;
      place();
    } else {
      // A key that doesn't move the view leaves the hover to the tour.
      return;
    }
    repick();
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("dblclick", onDoubleClick);
  canvas.addEventListener("keydown", onKeyDown);

  // Pins: the page's icon links, kept floating over their roofs.
  let pins = new Map<string, HTMLElement>();
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
        const hidden = x < -60 || x > width + 60 || y < -60 || y > height + 60;
        const lit = entry === shown;
        const last = pinStates.get(slug);
        if (!last || last.x !== x || last.y !== y || last.hidden !== hidden || last.lit !== lit) {
          pinStates.set(slug, { hidden, lit, x, y });
          element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          // Nearer pins over farther ones, and the lit one over all.
          element.style.zIndex = String(lit ? 100_000 : Math.round(y));
          element.style.setProperty("--pin-scale", scale);
          element.dataset.hidden = String(hidden);
          // Cards open above the pin, or below it near the top of the screen,
          // and lean away from the sides.
          element.dataset.below = String(y < 190);
          element.dataset.align = edgeOf(x, width);
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
    const k = ease(dt, 2.2);
    view.x += (point.x - view.x) * k;
    view.z += (point.z - view.z) * k;
    view.zoom += (tourZoom() - view.zoom) * ease(dt, 1.2);
    const slug = tour.stopNear(view.x, view.z, 2.2)?.slug;
    hoverBy.tour = slug === undefined ? null : (bySlug.get(slug) ?? null);
    refreshHover();
    place();
  };
  const glide = (dt: number) => {
    if (!goal) {
      return;
    }
    const k = ease(dt, 4);
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
  const resumeWhenIdle = (now: number) => {
    const engaged = hoverBy.pin !== null || hoverBy.pointer !== null || pointers.size > 0;
    if (!touring && !options.reducedMotion && !engaged && now - idleSince > IDLE_SECONDS * 1000) {
      setTour(true);
    }
  };
  const lit = (slug: string) => shown?.project.slug === slug;
  let frame = 0;
  const tick = (now: number) => {
    const elapsed = Math.max(0, now - clock.last) / 1000;
    clock.last = now;
    adapt(elapsed);
    // The camera keeps real time; the town skips ahead no more than a beat
    // after a stall, so nothing teleports when a tab comes back.
    const dt = Math.min(0.1, elapsed);
    clock.time += dt;
    resumeWhenIdle(now);
    if (touring) {
      followTour(Math.min(0.25, elapsed));
    } else {
      glide(Math.min(0.25, elapsed));
    }
    life.update(Math.min(0.25, elapsed) * 1000);
    animations.update(clock.time, lit);
    halo.update(Math.min(0.25, elapsed), clock.time, theme);
    sky.update(clock.time, plan.countryside.pier);
    renderer.render(scene, camera);
    placePins();
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  // The opening shot: the whole island, then down to the first project and
  // across, left to right, the way the title sequence pans the valley.
  if (!options.reducedMotion && tour) {
    setTour(true, 0);
  }

  return {
    /** What the town is up to, for poking at in development. */
    debug: () => life.debug(),
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("keydown", onKeyDown);
      for (const built of [city, ...buildings.values(), ...sky.builds]) {
        built.dispose();
      }
      halo.dispose();
      life.dispose();
      materials.dispose();
      renderer.dispose();
      canvas.remove();
    },
    /** Bring a building into view and light it, as when its pin is focused. */
    focus: (slug: string) => {
      const entry = bySlug.get(slug);
      if (entry) {
        takeControl();
        hoverBy.pin = entry;
        refreshHover();
        goal = { ...framing(entry), zoom: Math.max(view.zoom, 1) };
      }
    },
    /** Light a building from its pin; null when the pointer leaves the pin. */
    hover: (slug: string | null) => {
      const entry = slug === null ? null : (bySlug.get(slug) ?? null);
      if (entry) {
        takeControl();
      }
      hoverBy.pin = entry;
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
  };
};

export type City = ReturnType<typeof createCity>;
