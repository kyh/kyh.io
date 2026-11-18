import type { Chain, Hang, Point } from "../follower/chain";

const ORIGIN: Point = { x: 0, y: 0 };

const angleOf = (x: number, y: number) => Math.atan2(y, x);
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

const wayOf = (from: Point, to: Point) => angleOf(to.x - from.x, to.y - from.y);

const turnAbout = (knots: readonly Point[], about: Point, angle: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (const knot of knots) {
    const dx = knot.x - about.x;
    const dy = knot.y - about.y;
    knot.x = about.x + dx * cos - dy * sin;
    knot.y = about.y + dx * sin + dy * cos;
  }
};

/**
 * Holds each joint of `chain` to within `most` radians of its bend at rest in
 * `hang`, and its root link to within `root` of its way at rest: the root
 * held by the body, as an ear's base is. Root to tip it turns no more than
 * about `swing` radians a step, easing into that: a gentle swing goes by as it is.
 */
export const stiffen = (chain: Chain, hang: Hang, most: number, root: number, swing: number) => {
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

    const rest =
      index === 1 ? 0 : wrap(wayOf(restJoint, restKnot) - wayOf(restBefore ?? ORIGIN, restJoint));

    const bend =
      index === 1 || !before
        ? wrap(wayOf(joint, knot) - wayOf(restJoint, restKnot))
        : wrap(wayOf(joint, knot) - wayOf(before, joint));

    const over = wrap(bend - rest);
    const limit = index === 1 ? root : most;

    if (Math.abs(over) > limit) {
      turnAbout(knots.slice(index), joint, Math.sign(over) * limit - over);
    }
  }

  const [first] = knots;
  const tip = knots.at(-1);

  if (first && tip) {
    const turned = wrap(
      wayOf(first, tip) - wayOf({ x: first.px, y: first.py }, { x: tip.px, y: tip.py }),
    );

    turnAbout(knots.slice(1), first, swing * Math.tanh(turned / swing) - turned);
  }
};
