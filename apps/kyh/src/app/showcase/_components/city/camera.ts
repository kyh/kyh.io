// The camera: where it looks on the ground, how close, which way round the
// town it faces, and the screen and ground points it maps between.
import { OrthographicCamera, Plane, Raycaster, Vector2, Vector3 } from "three";

import type { Placed } from "./draw-landmarks";
import type { Vec3 } from "./sketch";
import { withinReach } from "./plan";
import { viewAt } from "./sketch";
import { approach, clamp } from "./ease";

/** CSS pixels per world unit at zoom 1: a cell's diamond is 64px wide. */
export const PIXELS_PER_UNIT = 64 / Math.SQRT2;
const CAMERA_DISTANCE = 300;
const MAX_ZOOM = 3.2;
/** The ground is foreshortened by the 30° elevation: it reads half as deep. */
const FORESHORTEN = Math.sin(Math.PI / 6);
/** How fast held arrow keys pan the view, in CSS pixels a second. */
const KEY_PAN_SPEED = 700;

/** Ground directions that run right and up the screen, for a view toward the camera. */
const screenAxes = (view: Vec3) => {
  const flat = Math.hypot(view[0], view[2]);
  return {
    right: { x: view[2] / flat, z: -view[0] / flat },
    up: { x: -view[0] / flat, z: -view[2] / flat },
  };
};

/** Where to look to frame a building from a view: lifted for its height. */
export const framing = ({ bounds }: Placed, view: Vec3) => {
  // Half the building's height on screen, laid back onto the ground, halved
  // again so short and tall buildings both sit near the middle.
  const lift = (bounds.h * Math.cos(Math.PI / 6)) / 2 / FORESHORTEN / 2;
  const { up } = screenAxes(view);
  return {
    x: bounds.x + bounds.w / 2 + up.x * lift,
    z: bounds.z + bounds.d / 2 + up.z * lift,
  };
};

export const createCamera = (
  canvas: HTMLCanvasElement,
  /** Told the zoom whenever the camera moves, for what's drawn at a fixed screen size. */
  onZoom: (zoom: number) => void,
) => {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, CAMERA_DISTANCE * 2);
  const size = { height: 1, width: 1 };
  const view = { x: 36, z: 37, zoom: 1 };
  /** Which way round the town it faces, in quarter turns; fractional mid-turn. */
  let angle = 0;
  /** Where it's easing to, as when a pin is focused. */
  let goal: { x: number; z: number; zoom: number } | null = null;

  const fitZoom = () =>
    Math.min(size.width / (84 * PIXELS_PER_UNIT), size.height / (34 * PIXELS_PER_UNIT));
  const minZoom = () => Math.max(0.2, fitZoom() * 0.9);

  const place = () => {
    view.zoom = clamp(view.zoom, minZoom(), MAX_ZOOM);
    // Keep the island in reach: the target stops a little out to sea and slides along the coast.
    [view.x, view.z] = withinReach(view.x, view.z, 4);
    const unit = PIXELS_PER_UNIT * view.zoom;
    camera.left = -size.width / 2 / unit;
    camera.right = size.width / 2 / unit;
    camera.top = size.height / 2 / unit;
    camera.bottom = -size.height / 2 / unit;
    const toward = viewAt(angle);
    camera.position.set(
      view.x + toward[0] * CAMERA_DISTANCE,
      toward[1] * CAMERA_DISTANCE,
      view.z + toward[2] * CAMERA_DISTANCE,
    );
    camera.lookAt(view.x, 0, view.z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    onZoom(view.zoom);
  };

  const raycaster = new Raycaster();
  const groundPlane = new Plane(new Vector3(0, 1, 0), 0);
  /** The ray from the camera through a client point. */
  const rayAt = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((clientY - rect.top) / rect.height) * 2,
      ),
      camera,
    );
    return raycaster.ray;
  };
  const groundAt = (clientX: number, clientY: number) =>
    rayAt(clientX, clientY).intersectPlane(groundPlane, new Vector3()) ??
    new Vector3(view.x, 0, view.z);

  const panBy = (dx: number, dy: number) => {
    const unit = PIXELS_PER_UNIT * view.zoom;
    const { right, up } = screenAxes(viewAt(angle));
    view.x -= (right.x * dx - (up.x * dy) / FORESHORTEN) / unit;
    view.z -= (right.z * dx - (up.z * dy) / FORESHORTEN) / unit;
    place();
  };

  /** Pan keys held down, and how fast they're moving the view (CSS pixels a second). */
  const panKeys = new Map<string, { dx: number; dy: number }>();
  const keyPan = { x: 0, y: 0 };

  const projected = new Vector3();
  const toScreen = (x: number, y: number, z: number) => {
    projected.set(x, y, z).project(camera);
    return {
      x: ((projected.x + 1) / 2) * size.width,
      y: ((1 - projected.y) / 2) * size.height,
    };
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
  /** A frame of easing toward where it's gliding, if anywhere. */
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
  /**
   * Glide while pan keys are held: speed up into it and coast to a stop, as
   * a game camera does. True if it moved.
   */
  const steer = (dt: number) => {
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
      return false;
    }
    panBy(keyPan.x * dt, keyPan.y * dt);
    return true;
  };

  return {
    get angle() {
      return angle;
    },
    set angle(next: number) {
      angle = next;
    },
    camera,
    fitZoom,
    glide,
    glideTo: (next: { x: number; z: number; zoom: number } | null) => {
      goal = next;
    },
    groundAt,
    holdKey: (key: string, pan: { dx: number; dy: number }) => {
      panKeys.set(key, pan);
    },
    // The opening pulls back to most of the island, its shore off the edges, not all of it in a ring of sea.
    introZoom: () => Math.max(minZoom(), fitZoom() * 1.8),
    minZoom,
    panBy,
    place,
    rayAt,
    releaseKey: (key: string) => {
      panKeys.delete(key);
    },
    releaseKeys: () => {
      panKeys.clear();
    },
    resize: (width: number, height: number) => {
      size.width = width;
      size.height = height;
      place();
    },
    size,
    steer,
    toScreen,
    tourZoom: () => clamp(Math.min(size.width, size.height * 1.6) / 1100, 0.7, 1.25),
    view,
    zoomAt,
  };
};

export type CityCamera = ReturnType<typeof createCamera>;
