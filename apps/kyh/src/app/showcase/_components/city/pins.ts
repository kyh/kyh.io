// The page's icon links, kept floating over their roofs.
import { Vector3 } from "three";

import type { Camera } from "three";

import type { Placed } from "./draw-landmarks";
import { clamp } from "./ease";

/** How far above a roof its pin floats, in cells. */
const PIN_LIFT = 0.3;

/** The last placement written to a pin, so a still camera writes nothing. */
interface PinState {
  x: number;
  y: number;
  hidden: boolean;
  lit: boolean;
}

interface PinFrame {
  width: number;
  height: number;
  zoom: number;
  /** Every pin waits, as while the buildings are still going up. */
  waiting: boolean;
  lit: Placed | null;
}

export const createPins = (camera: Camera, bySlug: ReadonlyMap<string, Placed>) => {
  /** The pins, by slug. */
  let pins = new Map<string, HTMLElement>();
  const states = new Map<string, PinState>();
  const anchor = new Vector3();
  return {
    place: ({ width, height, zoom, waiting, lit: litEntry }: PinFrame) => {
      const scale = clamp(0.7 + zoom * 0.3, 0.75, 1.15).toFixed(3);
      for (const [slug, element] of pins) {
        const entry = bySlug.get(slug);
        if (entry) {
          const { bounds } = entry;
          anchor
            .set(bounds.x + bounds.w / 2, bounds.y + bounds.h + PIN_LIFT, bounds.z + bounds.d / 2)
            .project(camera);
          const x = Math.round(((anchor.x + 1) / 2) * width * 10) / 10;
          const y = Math.round(((1 - anchor.y) / 2) * height * 10) / 10;
          const hidden = waiting || x < -60 || x > width + 60 || y < -60 || y > height + 60;
          const lit = entry === litEntry;
          const last = states.get(slug);
          if (!last || last.x !== x || last.y !== y || last.hidden !== hidden || last.lit !== lit) {
            states.set(slug, { hidden, lit, x, y });
            element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            // Nearer pins over farther ones, and the lit one over all.
            element.style.zIndex = String(lit ? 100_000 : Math.round(y));
            element.style.setProperty("--pin-scale", scale);
            element.dataset.hidden = String(hidden);
          }
        }
      }
    },
    set: (next: Map<string, HTMLElement>) => {
      pins = next;
      states.clear();
    },
  };
};
