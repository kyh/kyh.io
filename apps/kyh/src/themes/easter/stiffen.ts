// Stiffness against bending, for a chain (`../follower/chain.ts`) that's
// cartilage rather than cloth: a rabbit's ear bends along its length, but
// never kinks. After a step, each joint's bend from its rest is held to
// at most so much; whatever's past it is turned back about the joint,
// carried with the rest of the chain beyond it, and its last place too, so
// the turn adds no speed of its own. In the screen's pixels, as the chain is.
// Pure (state is stepped in place, for a frame's sake).
import type { Chain, Hang, Point } from "../follower/chain";

const ORIGIN: Point = { x: 0, y: 0 };

const angleOf = (x: number, y: number) => Math.atan2(y, x);
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** The way a link points, from the knot before it: the root's link from the root's own way at rest. */
const wayOf = (from: Point, to: Point) => angleOf(to.x - from.x, to.y - from.y);

/**
 * Holds each joint of `chain` to within `most` radians of its bend at rest in
 * `hang`, and its root link to within `root` of its way at rest: the root
 * held by the body, as an ear's base is.
 */
export const stiffen = (chain: Chain, hang: Hang, most: number, root = most) => {
  const { knots } = chain;
  for (let index = 1; index < knots.length; index += 1) {
    const joint = knots[index - 1];
    const knot = knots[index];
    const restJoint = index >= 2 ? hang.rest[index - 2] : ORIGIN;
    const restKnot = hang.rest[index - 1];
    if (!joint || !knot || !restJoint || !restKnot) {
      continue;
    }
    const restBefore = index >= 3 ? hang.rest[index - 3] : ORIGIN;
    const before = knots[index - 2];
    // The bend at rest and now: for the root's link, its way against its way at rest.
    const rest =
      index === 1 ? 0 : wrap(wayOf(restJoint, restKnot) - wayOf(restBefore ?? ORIGIN, restJoint));
    const bend =
      index === 1 || !before
        ? wrap(wayOf(joint, knot) - wayOf(restJoint, restKnot))
        : wrap(wayOf(joint, knot) - wayOf(before, joint));
    const over = wrap(bend - rest);
    const limit = index === 1 ? root : most;
    if (Math.abs(over) <= limit) {
      continue;
    }
    const turn = -(over - Math.sign(over) * limit);
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    // The rest of the chain past the joint turns with it.
    for (const outer of knots.slice(index)) {
      for (const [x, y] of [
        ["x", "y"],
        ["px", "py"],
      ] as const) {
        const dx = outer[x] - joint.x;
        const dy = outer[y] - joint.y;
        outer[x] = joint.x + dx * cos - dy * sin;
        outer[y] = joint.y + dx * sin + dy * cos;
      }
    }
  }
};
