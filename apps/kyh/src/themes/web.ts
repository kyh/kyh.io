// A cobweb strung across a corner, for `corners.tsx`: spokes out from the
// corner at the origin into the quarter of +x and +y, and rings round them
// sagging back toward the corner between each pair of spokes, pushed aside
// round a mouse that brushes it (`Bend`). Paths in the web's own pixels, and
// the spider that lives on it, in the 24×24 box facing +x. Pure.
import { point } from "./art";

/** The web's box: the corner at the origin, out to here along each edge. */
export const WEB_SIZE = 168;

/** Degrees from the top edge (+x) round to the side (+y). */
const SPOKES = [4, 20, 37, 53, 70, 86];
const RINGS = [22, 42, 64, 88, 114, 140];
/** How far a ring sags toward the corner between two spokes, as a fraction of its radius. */
const SAG = 0.16;

/** A mouse pushing the web aside: where, in the web's pixels, and how hard (0 to 1). */
export interface Bend {
  x: number;
  y: number;
  strength: number;
}

/** How far round the mouse the web gives, and how far it gives at the middle. */
export const BEND_REACH = 56;
const BEND_PUSH = 14;

/** A point of the web moved by a bend: away from the mouse, most near it, none at its reach. */
export const bent = (x: number, y: number, bend: Bend | null) => {
  if (!bend || bend.strength === 0) {
    return point(x, y);
  }
  const dx = x - bend.x;
  const dy = y - bend.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= BEND_REACH) {
    return point(x, y);
  }
  const give = (1 - distance / BEND_REACH) ** 2 * BEND_PUSH * bend.strength;
  // Right under the mouse there's no away: give toward the corner's far side.
  const [ux, uy] = distance < 0.01 ? [Math.SQRT1_2, Math.SQRT1_2] : [dx / distance, dy / distance];
  return point(x + ux * give, y + uy * give);
};

const at = (radius: number, degrees: number, bend: Bend | null = null) => {
  const angle = (degrees * Math.PI) / 180;
  return bent(radius * Math.cos(angle), radius * Math.sin(angle), bend);
};

/** One ring, spoke to spoke, sagging between each. */
const ringPath = (radius: number, bend: Bend | null = null) => {
  const [first = 0, ...rest] = SPOKES;
  let last = first;
  const arcs = rest.map((degrees) => {
    const arc = `Q${at(radius * (1 - SAG), (last + degrees) / 2, bend)} ${at(radius, degrees, bend)}`;
    last = degrees;
    return arc;
  });
  return `M${at(radius, first, bend)}${arcs.join("")}`;
};

/**
 * The whole web: its spokes running out past the last ring, through each ring
 * where it crosses so a bend moves both together, and the rings. The corner
 * and the spokes' far ends are tied down.
 */
export const webPath = (bend: Bend | null = null) =>
  SPOKES.map(
    (degrees) =>
      `M0 0${RINGS.map((radius) => `L${at(radius, degrees, bend)}`).join("")}L${at(WEB_SIZE, degrees)}`,
  ).join("") + RINGS.map((radius) => ringPath(radius, bend)).join("");

/** The web hanging still. */
export const WEB_PATH = webPath();

/** The ring a spider walks. */
export const WALK = ringPath(RINGS[3] ?? 88);

/** The ring a spider walks, bent as the web is. */
export const walkPath = (bend: Bend | null) => ringPath(RINGS[3] ?? 88, bend);

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
