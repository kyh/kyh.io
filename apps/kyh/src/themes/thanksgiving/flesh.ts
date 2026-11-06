// What the turkey's snood, wattle and beard are made of (`../follower/chain.ts`):
// soft, heavy flesh that hangs by its weight and swings on after it's
// carried, looser than the kit's `FLOPPY` at its tip. Kept to where it hangs
// only gently (hardest at the root) and heavy enough that a walking head's
// thrust swings it forward and back under the beak rather than over it; a
// gobble's head shake flings it about.
import type { Chain, Hang, Point, Stuff } from "../follower/chain";

export const FLESH: Stuff = {
  damp: 6,
  drag: 0.006,
  keep: 0.07,
  keepTip: 0.01,
  rub: 0.35,
  weight: 900,
};

/**
 * Holds each link of a hanging chain within `most` radians of the way it
 * hangs at rest (each at its length, as the chain holds them), and every knot above `floor` (the ground under it, screen
 * pixels): applied after each of the chain's fixed steps, so a walking
 * head's quick thrust swings its snood and wattle under its beak, never up
 * over its head, and a peck doesn't bury them.
 */
export const holdFlesh = (hang: Hang, most: number, floor: number) => (chain: Chain) => {
  const { knots } = chain;
  for (let index = 1; index < knots.length; index += 1) {
    const knot = knots[index];
    const before = knots[index - 1];
    const rest = hang.rest[index - 1];
    const restBefore: Point =
      index === 1 ? { x: 0, y: 0 } : (hang.rest[index - 2] ?? rest ?? { x: 0, y: 0 });
    if (!knot || !before || !rest) {
      continue;
    }
    const length = Math.hypot(rest.x - restBefore.x, rest.y - restBefore.y);
    const hangs = Math.atan2(rest.y - restBefore.y, rest.x - restBefore.x);
    const lies = Math.atan2(knot.y - before.y, knot.x - before.x);
    const off = Math.atan2(Math.sin(lies - hangs), Math.cos(lies - hangs));
    if (Math.abs(off) > most && length > 0) {
      const angle = hangs + Math.sign(off) * most;
      const x = before.x + Math.cos(angle) * length;
      const y = before.y + Math.sin(angle) * length;
      knot.px += x - knot.x;
      knot.py += y - knot.y;
      knot.x = x;
      knot.y = y;
    }
    if (knot.y > floor) {
      knot.y = floor;
      knot.py = Math.min(knot.py, floor);
    }
  }
};
