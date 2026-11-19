import { Box3, Color, Scene, Vector3, WebGLRenderer } from "three";

import type { Object3D } from "three";

import type { CityProject, Placed } from "./draw-landmarks";
import type { Scheme } from "./palette";
import { listenForChat } from "@/lib/chat-input";
import { discoverEgg } from "@/easter-eggs/store";
import { createCamera, framing, PIXELS_PER_UNIT } from "./camera";
import { createPresses, createSpotlight, isHover, keyMove } from "./controls";
import { CURB_TOP } from "./draw-blocks";
import { planEntries } from "./draw-landmarks";
import { createFlyover } from "./flyover";
import { createHalo } from "./halo";
import { createLife } from "./life";
import { lookOf, PALETTE, shade } from "./palette";
import { createPins } from "./pins";
import { CENTER, contains, planCity } from "./plan";
import { hashString } from "@/lib/random";
import { createMaterials } from "./render";
import { createSchedule } from "./schedule";
import { ALL_BUILT, BUILT, createGrowth } from "./grow";
import { createHeights } from "./heights";
import { createIntro } from "./intro";
import { createSites } from "./sites";
import { faceAreas, HEADINGS, viewAt } from "./sketch";
import { createBoats } from "./boats";
import type { TownView } from "./town-views";
import { createTownViews, sketchTown } from "./town-views";
import type { Setting } from "./town-theme";
import { schemeOf } from "./town-theme";
import { TOWN_VERSION } from "./world";
import { clamp, easeInOut } from "./ease";

const BUILD_CLOSE = 1.1;
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
  /** Day or night, and the theme, whose town it dresses in (town-theme.ts). */
  setting: Setting;
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
  let scheme = schemeOf(options.setting);
  let nextScheme: Scheme | null = null;
  const plan = planCity(planEntries(options.projects));
  const firstTown = sketchTown(plan, options.projects);
  const { placed } = firstTown;

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
  const materials = createMaterials(scheme, growth.adapt);

  if (options.reducedMotion) {
    growth.set(ALL_BUILT);
  }

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

  let shown: Placed | null = null;

  const views = createTownViews({
    lit: () => shown?.project.slug ?? null,
    looks,
    materials,
    plan,
    projects: options.projects,
    scene,
    scheme: () => scheme,
    startAt: () => (intro.phase === "done" ? BUILT : schedule.startAt),
    still: options.reducedMotion,
  });

  let heading = 0;
  let turning: { by: 1 | -1; start: number } | null = null;
  let shownTown = views.at(0, firstTown);
  shownTown.show(true);
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

  const cam = createCamera(canvas, materials.setZoom);
  const { camera, view } = cam;
  const flyover = createFlyover(placed, cam);
  const pins = createPins(camera, bySlug);

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    materials.setPixelRatio(renderer.getPixelRatio());
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    cam.resize(width, height);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  view.zoom = cam.fitZoom();
  cam.place();

  let heights: ((x: number, z: number) => number) | null = null;

  const surfaceAt = (x: number, z: number) => {
    heights ??= createHeights(
      [firstTown.sketch, ...placed.map((entry) => entry.sketch)],
      (px, pz) => (plan.blocks.some((block) => contains(block, px, pz)) ? CURB_TOP : 0),
    );

    return heights(x, z);
  };

  const life = createLife({
    overlay: options.overlay,
    placed,
    plan,
    room: options.shared
      ? `kyh-town-${TOWN_VERSION}-${hashString(options.projects.map((project) => project.slug).join(",")).toString(36)}`
      : null,
    scale: () => PIXELS_PER_UNIT * view.zoom,
    scene,
    scheme,
    size: () => cam.size,
    still: options.reducedMotion,
    surfaceAt,
    toScreen: cam.toScreen,
    view: () => viewAt(cam.angle),
  });

  const boats = createBoats(plan.countryside.pier);
  const underfoot = () => ({ surfaceAt, view: viewAt(cam.angle) });
  const clock = { last: performance.now(), slow: 0, time: 0 };

  let carrying: { pointer: number; what: "actor" | "boat" } | null = null;
  let overActor = false;

  const spotlight = createSpotlight<Placed>({
    now: () => performance.now(),
    onTake: () => {
      cam.glideTo(null);
      intro.take();
    },
    onTour: options.onTour,
    still: options.reducedMotion,
  });

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

    const was = shown?.project.slug ?? null;
    shown = next;
    views.relight(shownTown, was);
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

  const applyScheme = () => {
    renderer.setClearColor(new Color(shade("sea", scheme, false)));
    materials.setScheme(scheme);
    views.paint(shownTown);
    sites?.paint(scheme);
    life.setScheme(scheme);
  };

  applyScheme();

  const playTour = (from: number | null = null) => {
    if (flyover.ready && spotlight.play()) {
      cam.glideTo(null);
      flyover.start(from);
    }
  };

  const takeControl = () => {
    spotlight.take();
    refreshHover();
  };

  const spotAt = (clientX: number, clientY: number) => {
    const ground = cam.groundAt(clientX, clientY);

    return { x: ground.x, y: 0, z: ground.z };
  };

  const local = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();

    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const pick = (clientX: number, clientY: number) => {
    const ray = cam.rayAt(clientX, clientY);
    let best: Placed | null = null;
    let bestDistance = Infinity;
    const hit = new Vector3();

    for (const { box, entry } of boxes) {
      if (ray.intersectBox(box, hit)) {
        const distance = hit.distanceTo(ray.origin);

        if (distance < bestDistance) {
          best = entry;
          bestDistance = distance;
        }
      }
    }

    return best;
  };

  let openedAt = 0;

  const open = (entry: Placed) => {
    const now = performance.now();

    if (now - openedAt > 800) {
      openedAt = now;
      options.onOpen(entry.project.slug);
    }
  };

  const presses = createPresses();
  let mouseAt: { x: number; y: number } | null = null;

  const boatAt = (x: number, y: number) => {
    const reach = Math.max(12, PIXELS_PER_UNIT * view.zoom * 0.5);
    let best: { index: number; distance: number } | null = null;

    for (const [index, pose] of boats.poses(clock.time).entries()) {
      const at = cam.toScreen(pose.x, pose.y + 0.4, pose.z);
      const distance = Math.hypot(at.x - x, at.y - y);

      if (!pose.held && distance < reach && (!best || distance < best.distance)) {
        best = { distance, index };
      }
    }

    return best?.index ?? null;
  };

  const canLift = (x: number, y: number) => life.actorAt(x, y) !== null || boatAt(x, y) !== null;

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

  const showTown = (town: TownView) => {
    shownTown.show(false);
    shownTown = town;
    views.paint(town);
    town.show(true);
  };

  const settle = (to: number) => {
    turning = null;
    heading = to;
    cam.angle = to;
    showTown(views.at(to));
    views.keepNear(to);
    flyover.reframe(to, spotlight.touring);
    cam.place();
    repick();
    views.drawAhead(heading);
  };

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

    views.paint(views.at(to));
    showTown(views.at((by === 1 ? heading : to) + 0.5));
    turning = { by, start: performance.now() };
  };

  const swing = (now: number) => {
    if (!turning) {
      return;
    }

    const t = clamp((now - turning.start) / TURN_MS, 0, 1);
    cam.angle = heading + turning.by * easeInOut(t);
    cam.place();

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

    cam.panBy(move.dx, move.dy);

    if (move.kind === "pinch" && move.zoom !== null) {
      cam.zoomAt(move.zoom, move.at.x, move.at.y);
    }
  };

  const onTap = (event: PointerEvent) => {
    const opened = spotlight.tap(pick(event.clientX, event.clientY), event.pointerType);
    refreshHover();

    if (opened) {
      open(opened);
    }
  };

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

    presses.cancel(event.pointerId);
  };

  const onPointerLeave = (event: PointerEvent) => {
    mouseAt = null;

    if (carrying === null) {
      life.point(null);
      life.hand(null);
    }

    overActor = false;

    if (event.pointerType !== "touch") {
      spotlight.leave(presses.count > 0);
    }

    refreshHover();
    updateCursor();
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    takeControl();

    if (event.ctrlKey) {
      cam.zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY);
    } else {
      const scale = event.deltaMode === 0 ? 1 : 40;
      cam.panBy(-event.deltaX * scale, -event.deltaY * scale);
    }

    repick();
  };

  const onDoubleClick = (event: MouseEvent) => {
    const at = local(event.clientX, event.clientY);

    if (!pick(event.clientX, event.clientY) && !life.actorAt(at.x, at.y)) {
      takeControl();
      cam.zoomAt(1.8, event.clientX, event.clientY);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const move = keyMove(event.key);

    if (!move) {
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
      cam.holdKey(event.key, { dx: move.dx, dy: move.dy });

      return;
    }

    view.zoom *= move.factor;
    cam.place();
    repick();
  };

  const onKeyUp = (event: KeyboardEvent) => {
    cam.releaseKey(event.key);
  };

  const onBlur = () => {
    cam.releaseKeys();
  };

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

  const stopChat = listenForChat({
    claims: (key) => keyMove(key) !== null,
    onDraft: life.type,
    onSend: life.say,
  });

  canvas.addEventListener("keyup", onKeyUp, { signal });
  canvas.addEventListener("blur", onBlur, { signal });

  const followTour = (dt: number) => {
    if (!flyover.ready) {
      return;
    }

    const slug = flyover.step(dt);
    spotlight.pass(slug === null ? null : (bySlug.get(slug) ?? null));
    refreshHover();
  };

  const adapt = (elapsed: number) => {
    clock.slow = elapsed > 0.034 ? clock.slow + 1 : Math.max(0, clock.slow - 2);

    if (clock.slow > 90 && renderer.getPixelRatio() > 1) {
      clock.slow = 0;
      renderer.setPixelRatio(1);
      resize();
    }
  };

  const resumeWhenIdle = () => {
    if (intro.phase !== "building" && spotlight.idle(presses.count > 0 || carrying !== null)) {
      playTour();
    }
  };

  const lit = (slug: string) => shown?.project.slug === slug;
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

  const grow = (elapsed: number) => {
    const { opened, cleared } = intro.step(elapsed);

    if (intro.clock !== null) {
      growth.set(intro.clock);
      sites?.update(intro.clock);
    }

    const { pullBack } = intro;

    if (pullBack !== null) {
      view.zoom = Math.exp(
        Math.log(BUILD_CLOSE) * (1 - pullBack) + Math.log(cam.introZoom()) * pullBack,
      );
      cam.place();
    }

    if (opened) {
      life.setOpen(true);

      if (!intro.taken) {
        playTour(0);
      }
    }

    if (cleared) {
      packUp();
      views.drawAhead(heading);
      surfaceAt(CENTER, CENTER);
    }
  };

  const tick = (now: number) => {
    if (nextScheme) {
      scheme = nextScheme;
      nextScheme = null;
      applyScheme();
    }

    const elapsed = Math.max(0, now - clock.last) / 1000;
    grow(elapsed);
    clock.last = now;
    adapt(elapsed);
    const dt = Math.min(0.1, elapsed);
    clock.time += dt;
    resumeWhenIdle();

    if (spotlight.touring) {
      followTour(Math.min(0.25, elapsed));
    } else {
      cam.glide(Math.min(0.25, elapsed));
    }

    swing(now);

    if (cam.steer(Math.min(0.1, elapsed))) {
      repick();
    }

    life.update(Math.min(0.25, elapsed) * 1000);
    shownTown.animations.update(clock.time, lit, scheme);
    halo.update(Math.min(0.25, elapsed), clock.time, scheme.time);
    shownTown.sky.update(clock.time, boats.poses(clock.time), cam.angle);

    if (!warmed) {
      drawEverything();
    }

    renderer.render(scene, camera);
    pins.place({
      ...cam.size,
      lit: shown,
      waiting: intro.phase === "building",
      zoom: view.zoom,
    });
    views.draft();
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  let warmUp = 0;

  if (intro.phase === "done") {
    playTour(0);
    warmUp = window.setTimeout(() => views.drawAhead(heading), 3000);
  } else {
    life.setOpen(false);
  }

  return {
    debug: () => ({
      ...life.debug(),
      boats: boats.poses(clock.time).map((pose) => cam.toScreen(pose.x, pose.y + 0.4, pose.z)),
      intro: {
        built: schedule.end,
        cleared: Math.max(schedule.end, sites?.end ?? 0),
        clock: intro.clock,
        phase: intro.phase,
      },
      view: { ...view },
    }),
    dispose: () => {
      cancelAnimationFrame(frame);
      listening.abort();
      window.clearTimeout(warmUp);
      stopChat();
      observer.disconnect();
      views.dispose();
      halo.dispose();
      life.dispose();
      packUp();
      materials.dispose();
      renderer.dispose();
      canvas.remove();
    },
    focus: (slug: string) => {
      const entry = bySlug.get(slug);

      if (entry) {
        spotlight.pin(entry);
        takeControl();
        cam.glideTo({ ...framing(entry, viewAt(heading)), zoom: Math.max(view.zoom, 1) });
      }
    },
    hover: (slug: string | null) => {
      spotlight.pin(slug === null ? null : (bySlug.get(slug) ?? null));
      refreshHover();
    },
    look: (x: number, z: number, zoom: number) => {
      takeControl();
      view.x = x;
      view.z = z;
      view.zoom = zoom;
      cam.place();
    },
    setPins: pins.set,
    setSetting: (next: Setting) => {
      nextScheme = schemeOf(next);
    },
    tap: (slug: string) => {
      const entry = bySlug.get(slug);

      if (entry) {
        spotlight.tap(entry, "touch");
        refreshHover();
      }
    },
    tour: (on: boolean) => {
      if (on) {
        playTour();
      } else {
        spotlight.pause();
        refreshHover();
      }
    },
    turn,
  };
};

export type City = ReturnType<typeof createCity>;
