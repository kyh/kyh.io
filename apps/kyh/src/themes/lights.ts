import { createRandom } from "@/lib/random";
import { point, round } from "./art";

/** One scallop of the string, wide, in px. */
export const SPAN = 88;

/** How far a scallop dips below its hooks. */
export const SAG = 14;

/** Where the hooks sit, below the top of the page. */
export const HOOK = 4;

/** Bulbs on each scallop. */
export const PER_SPAN = 3;

/** Enough scallops for the widest screen; the rest is clipped. */
export const SPANS = 48;

/** How many colors the bulbs take turns in. */
export const COLORS = 5;

export interface Bulb {
  x: number;
  y: number;
  /** Degrees off hanging straight down, as the wire tips it. */
  tilt: number;
  color: number;
  /** Which of the twinkles it dims with; never its neighbor's. */
  phase: number;
}

/** Bulbs twinkle in this many groups, each its own layer, so the twinkling is the compositor's work, not the page's. */
export const PHASES = 4;

const along = (t: number) => {
  const y = HOOK + 4 * SAG * t * (1 - t);
  const slope = (4 * SAG * (1 - 2 * t)) / SPAN;

  return { slope, y };
};

/** The wire: one dipping curve per scallop, hook to hook. */
export const wirePath = (spans = SPANS) =>
  Array.from({ length: spans }, (_, index) => {
    const from = index * SPAN;

    return `M${point(from, HOOK)}Q${point(from + SPAN / 2, HOOK + 2 * SAG)} ${point(from + SPAN, HOOK)}`;
  }).join("");

/** The bulbs along the wire, evenly spaced, colors in turn, twinkling out of step. */
export const bulbsOf = (spans = SPANS, seed = 25) => {
  const random = createRandom(seed);

  let phase = 0;

  return Array.from({ length: spans * PER_SPAN }, (_, index) => {
    const t = ((index % PER_SPAN) + 0.5) / PER_SPAN;
    const { slope, y } = along(t);
    phase = (phase + random.int(1, PHASES)) % PHASES;

    return {
      color: index % COLORS,
      phase,
      tilt: round((Math.atan(slope) * 180) / Math.PI / 2),
      x: round(Math.floor(index / PER_SPAN) * SPAN + t * SPAN),
      y: round(y),
    } satisfies Bulb;
  });
};
