// A cobweb strung across a corner, for `corners.tsx`: spokes out from the
// corner at the origin into the quarter of +x and +y, and rings round them
// sagging back toward the corner between each pair of spokes. Paths in the
// web's own pixels, and the spider that lives on it, in the 24×24 box
// facing +x. Pure.
import { point } from "./art";

/** The web's box: the corner at the origin, out to here along each edge. */
export const WEB_SIZE = 168;

/** Degrees from the top edge (+x) round to the side (+y). */
const SPOKES = [4, 20, 37, 53, 70, 86];
const RINGS = [22, 42, 64, 88, 114, 140];
/** How far a ring sags toward the corner between two spokes, as a fraction of its radius. */
const SAG = 0.16;

const at = (radius: number, degrees: number) => {
  const angle = (degrees * Math.PI) / 180;
  return point(radius * Math.cos(angle), radius * Math.sin(angle));
};

/** One ring, spoke to spoke, sagging between each. */
export const ringPath = (radius: number) => {
  const [first = 0, ...rest] = SPOKES;
  let last = first;
  const arcs = rest.map((degrees) => {
    const arc = `Q${at(radius * (1 - SAG), (last + degrees) / 2)} ${at(radius, degrees)}`;
    last = degrees;
    return arc;
  });
  return `M${at(radius, first)}${arcs.join("")}`;
};

/** The whole web: its spokes running out past the last ring, and the rings. */
export const WEB_PATH =
  SPOKES.map((degrees) => `M0 0L${at(WEB_SIZE, degrees)}`).join("") +
  RINGS.map((radius) => ringPath(radius)).join("");

/** The ring a spider walks. */
export const WALK = ringPath(RINGS[3] ?? 88);

/** Where a spider hangs from: where the third ring crosses a middle spoke. */
export const HANG = (() => {
  const angle = ((SPOKES[3] ?? 53) * Math.PI) / 180;
  const radius = RINGS[2] ?? 64;
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
})();

/** Where a spider's legs meet its body. */
export const HIP = [13.6, 12] as const;
/** Each pair's lean toward the head, front pair first, in degrees. */
const LEANS = [62, 22, -18, -52];

/**
 * Half its legs, one gait's worth: the first and third on one side with the
 * second and fourth on the other, which step together while the rest hold.
 */
export const spiderLegs = (gait: 0 | 1) =>
  LEANS.flatMap((lean, pair) =>
    ([-1, 1] as const).flatMap((side) => {
      if ((pair + (side === 1 ? 1 : 0)) % 2 !== gait) {
        return [];
      }
      const out = (from: readonly [number, number], reach: number, degrees: number) => {
        const angle = (degrees * Math.PI) / 180;
        return [
          from[0] + reach * Math.sin(angle),
          from[1] + side * reach * Math.cos(angle),
        ] as const;
      };
      const knee = out(HIP, 4.6, lean * 0.8);
      const foot = out(knee, 5, lean * 1.35);
      return [`M${point(...HIP)}L${point(...knee)}L${point(...foot)}`];
    }),
  ).join("");
