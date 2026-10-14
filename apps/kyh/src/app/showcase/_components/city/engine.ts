// The live city: renderer, camera, the drawn town and the loop that moves
// it. It talks to React through a handful of callbacks and methods; nothing
// in here knows about the page around it.
import {
  Box3,
  Color,
  Group,
  OrthographicCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import type { CityProject, Placed } from "./draw-landmarks";
import type { Theme } from "./palette";
import type { Built } from "./render";
import type { Sketch } from "./sketch";
import { createActors } from "./actors";
import { createAnimations } from "./animate";
import { drawBlock } from "./draw-blocks";
import { drawCountryside } from "./draw-countryside";
import { drawGround } from "./draw-ground";
import { drawLots, planEntries } from "./draw-landmarks";
import { PALETTE, paint } from "./palette";
import { inland, planCity } from "./plan";
import { createRandom } from "./random";
import { build, createMaterials } from "./render";
import { createSketch, part, polygon, solid, VIEW } from "./sketch";
import { BLIMP_HEADING, drawBalloon, drawBlimp, drawBoat, drawDrone, drawFerry } from "./sky";
import { createTour } from "./tour";
import { createCrowd, createTraffic } from "./traffic";

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

export interface CityCallbacks {
  onHover: (slug: string | null) => void;
  onSelect: (slug: string | null) => void;
  onTour: (playing: boolean) => void;
  /** The project the flyover is passing, if any. */
  onPassing: (slug: string | null) => void;
}

export interface CityOptions extends CityCallbacks {
  projects: CityProject[];
  theme: Theme;
  reducedMotion: boolean;
}

/** Room the page's own panels take, so focused buildings land beside them. */
export interface Inset {
  right: number;
  bottom: number;
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

/** A down-pointing marker that bobs over the chosen building. */
const drawMarker = (): Sketch => {
  const sketch = createSketch();
  const colors = paint("accentRed", "accentRed", "accentRed");
  const tip: [number, number, number] = [0, 0, 0];
  const ring: [number, number, number][] = [
    [-0.22, 0.42, 0],
    [0, 0.42, -0.22],
    [0.22, 0.42, 0],
    [0, 0.42, 0.22],
  ];
  const triangles = ring.flatMap((corner, index) => {
    const next = ring[(index + 1) % ring.length] ?? corner;
    const mid: [number, number, number] = [
      (corner[0] + next[0]) / 2,
      0.2,
      (corner[2] + next[2]) / 2,
    ];
    return polygon([tip, corner, next], mid, colors);
  });
  solid(part(sketch, "marker", [0, 0, 0]), [...triangles, ...polygon(ring, [0, 1, 0], colors)]);
  return sketch;
};

/** Where to look to frame a building: lifted for its height, nudged clear of the page's panels. */
const framing = (placed: Placed, zoom: number, inset: Inset) => {
  const { bounds } = placed;
  // Half the building's height on screen, laid back onto the ground.
  const lift = (bounds.h * Math.cos(Math.PI / 6)) / 2 / FORESHORTEN / 2;
  const unit = PIXELS_PER_UNIT * zoom;
  const right = inset.right / 2 / unit;
  const down = inset.bottom / 2 / unit / FORESHORTEN;
  return {
    x: bounds.x + bounds.w / 2 + SCREEN_UP.x * (lift - down) + SCREEN_RIGHT.x * right,
    z: bounds.z + bounds.d / 2 + SCREEN_UP.z * (lift - down) + SCREEN_RIGHT.z * right,
  };
};

const outlineGeometry = (placed: Placed | null) => {
  const geometry = new LineSegmentsGeometry();
  if (!placed) {
    geometry.setPositions([0, -10, 0, 0, -10, 0]);
    return geometry;
  }
  const { bounds } = placed;
  const pad = 0.12;
  const y = bounds.y + 0.03;
  const x0 = bounds.x - pad;
  const z0 = bounds.z - pad;
  const x1 = bounds.x + bounds.w + pad;
  const z1 = bounds.z + bounds.d + pad;
  geometry.setPositions([
    x0,
    y,
    z0,
    x1,
    y,
    z0,
    x1,
    y,
    z0,
    x1,
    y,
    z1,
    x1,
    y,
    z1,
    x0,
    y,
    z1,
    x0,
    y,
    z1,
    x0,
    y,
    z0,
  ]);
  return geometry;
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
    "A city of Kai's projects. Drag to look around, scroll to zoom, click a building to open it.",
  );
  container.append(canvas);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_DISTANCE * 2);
  let { theme } = options;
  const materials = createMaterials(theme);
  const { placed, plan, sketch } = drawTown(options.projects);
  const city = build(sketch, materials);
  scene.add(city.group);
  const animations = createAnimations(city, { launches: !options.reducedMotion });
  const traffic = createTraffic(plan, 48);
  const crowd = createCrowd(plan, 180);
  const actors = createActors(traffic.cars, crowd.walkers, theme);
  const actorGroup = new Group();
  actorGroup.add(...actors.meshes);
  scene.add(actorGroup);
  const sky = createSky(scene, materials, options.reducedMotion);
  const marker = build(drawMarker(), materials);
  marker.group.visible = false;
  scene.add(marker.group);
  const hoverLine = new LineSegments2(outlineGeometry(null), materials.line("accentBlue", "bold"));
  const selectLine = new LineSegments2(outlineGeometry(null), materials.line("accentRed", "bold"));
  hoverLine.renderOrder = 3;
  selectLine.renderOrder = 3;
  scene.add(hoverLine, selectLine);

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
  const focusPoints = placed.map((entry) => framing(entry, 1, { bottom: 0, right: 0 }));
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
  let inset: Inset = { bottom: 0, right: 0 };
  const view = { x: 36, z: 38, zoom: 0.5 };
  let goal: { x: number; z: number; zoom: number } | null = null;
  let touring = false;
  let tourAt = 0;
  let passing: string | null = null;
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

  const applyTheme = () => {
    renderer.setClearColor(new Color(PALETTE.sea[theme]));
    materials.setTheme(theme);
    for (const built of [city, marker, ...sky.builds]) {
      for (const { material, token } of built.signs) {
        material.color.set(PALETTE[token][theme]);
      }
    }
    actors.setTheme(theme);
  };
  applyTheme();

  const setTour = (playing: boolean, from: number | null = null) => {
    if (playing === touring || !tour) {
      return;
    }
    touring = playing;
    if (playing) {
      goal = null;
      tourAt = from ?? tour.closest(view.x, view.z);
    } else if (passing !== null) {
      passing = null;
      options.onPassing(null);
    }
    options.onTour(playing);
  };

  // Selection and hover.
  let hovered: Placed | null = null;
  let selected: Placed | null = null;
  const setHovered = (next: Placed | null) => {
    if (next === hovered) {
      return;
    }
    hovered = next;
    hoverLine.geometry.dispose();
    hoverLine.geometry = outlineGeometry(next === selected ? null : next);
    canvas.style.cursor = next ? "pointer" : "";
    options.onHover(next?.project.slug ?? null);
  };
  const select = (slug: string | null) => {
    const next = slug === null ? null : (bySlug.get(slug) ?? null);
    if (next === selected) {
      return;
    }
    selected = next;
    selectLine.geometry.dispose();
    selectLine.geometry = outlineGeometry(next);
    marker.group.visible = next !== null;
    if (next) {
      setTour(false);
      const zoom = Math.max(view.zoom, 1.1);
      goal = { ...framing(next, zoom, inset), zoom };
    }
    options.onSelect(next?.project.slug ?? null);
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
  const takeControl = () => {
    goal = null;
    setTour(false);
  };

  const pointers = new Map<number, { x: number; y: number }>();
  let dragged = false;
  let downAt = { x: 0, y: 0 };
  let pinch = 0;
  const onPointerDown = (event: PointerEvent) => {
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
  const onPointerMove = (event: PointerEvent) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      if (event.pointerType === "mouse") {
        setHovered(pick(event.clientX, event.clientY));
      }
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
  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (pointers.size > 0) {
      return;
    }
    if (!dragged) {
      const hit = pick(event.clientX, event.clientY);
      select(hit?.project.slug ?? null);
      if (!hit) {
        takeControl();
      }
    }
    pinch = 0;
  };
  const onPointerLeave = () => {
    if (pointers.size === 0) {
      setHovered(null);
    }
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    takeControl();
    zoomAt(Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015)), event.clientX, event.clientY);
  };
  const onDoubleClick = (event: MouseEvent) => {
    takeControl();
    zoomAt(1.8, event.clientX, event.clientY);
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
    } else if (event.key === "Escape") {
      select(null);
    }
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("dblclick", onDoubleClick);
  canvas.addEventListener("keydown", onKeyDown);

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
    const slug = tour.stopNear(view.x, view.z, 2.2)?.slug ?? null;
    if (slug !== passing) {
      passing = slug;
      options.onPassing(slug);
    }
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
  let frame = 0;
  const tick = (now: number) => {
    const elapsed = Math.max(0, now - clock.last) / 1000;
    clock.last = now;
    adapt(elapsed);
    // The camera keeps real time; the town skips ahead no more than a beat
    // after a stall, so nothing teleports when a tab comes back.
    const dt = Math.min(0.1, elapsed);
    clock.time += dt;
    if (touring) {
      followTour(Math.min(0.25, elapsed));
    } else {
      glide(Math.min(0.25, elapsed));
    }
    traffic.step(dt);
    crowd.step(dt);
    actors.update();
    animations.update(clock.time);
    sky.update(clock.time, plan.countryside.pier);
    if (selected) {
      const { bounds } = selected;
      marker.group.position.set(
        bounds.x + bounds.w / 2,
        bounds.y + bounds.h + 0.45 + Math.abs(Math.sin(clock.time * 3)) * 0.18,
        bounds.z + bounds.d / 2,
      );
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  // The opening shot: the whole island, then down to the first project and
  // across, left to right, the way the title sequence pans the valley.
  if (!options.reducedMotion && tour) {
    setTour(true, 0);
  }

  return {
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("keydown", onKeyDown);
      for (const built of [city, marker, ...sky.builds]) {
        built.dispose();
      }
      hoverLine.geometry.dispose();
      selectLine.geometry.dispose();
      actors.dispose();
      materials.dispose();
      renderer.dispose();
      canvas.remove();
    },
    look: (x: number, z: number, zoom: number) => {
      takeControl();
      view.x = x;
      view.z = z;
      view.zoom = zoom;
      place();
    },
    /** Pull back to see the whole island. */
    overview: () => {
      takeControl();
      goal = { x: 36, z: 38, zoom: fitZoom() };
    },
    select,
    setInset: (next: Inset) => {
      inset = next;
    },
    setTheme: (next: Theme) => {
      theme = next;
      applyTheme();
    },
    setTour: (playing: boolean) => setTour(playing),
    zoomBy: (factor: number) => {
      takeControl();
      const rect = canvas.getBoundingClientRect();
      zoomAt(factor, rect.left + width / 2, rect.top + height / 2);
    },
  };
};

export type City = ReturnType<typeof createCity>;
