// The title-sequence flyover: a path past every project as the camera's
// heading sees them, and the camera carried along it, lingering over each.
import type { CityCamera } from "./camera";
import type { Placed } from "./draw-landmarks";
import { framing } from "./camera";
import { approach, clamp } from "./ease";
import { viewAt } from "./sketch";
import { createTour } from "./tour";

export const createFlyover = (placed: readonly Placed[], camera: CityCamera) => {
  const { view } = camera;
  let stops = placed.map((entry) => framing(entry, viewAt(0)));
  const tourFor = () =>
    createTour(
      placed.map((entry, index) => ({
        slug: entry.project.slug,
        x: stops[index]?.x ?? 36,
        z: stops[index]?.z ?? 36,
      })),
    );
  let tour = tourFor();
  /** How far along the path it is. */
  let along = 0;
  const nearestStop = (x: number, z: number) => {
    let nearest = Infinity;
    for (const stop of stops) {
      nearest = Math.min(nearest, Math.hypot(stop.x - x, stop.z - z));
    }
    return nearest;
  };
  return {
    get ready() {
      return tour !== null;
    },
    /** The path as the camera at `heading` sees it, picked up from the nearest point if `touring`. */
    reframe: (heading: number, touring: boolean) => {
      stops = placed.map((entry) => framing(entry, viewAt(heading)));
      tour = tourFor();
      if (tour && touring) {
        along = tour.closest(view.x, view.z);
      }
    },
    /** Starts from `from` along the path, or from the point nearest the camera. */
    start: (from: number | null) => {
      if (tour) {
        along = from ?? tour.closest(view.x, view.z);
      }
    },
    /** A frame of the camera carried along; the slug of the project it's passing, if one. */
    step: (dt: number) => {
      if (!tour) {
        return null;
      }
      // Slow down over each project, the way a title sequence lingers.
      const near = nearestStop(view.x, view.z);
      const speed = 1.7 * (0.35 + 0.65 * clamp((near - 0.8) / 3.5, 0, 1));
      along += speed * dt;
      const point = tour.at(along);
      const k = approach(dt, 2.2);
      view.x += (point.x - view.x) * k;
      view.z += (point.z - view.z) * k;
      view.zoom += (camera.tourZoom() - view.zoom) * approach(dt, 1.2);
      camera.place();
      return tour.stopNear(view.x, view.z, 2.2)?.slug ?? null;
    },
  };
};
