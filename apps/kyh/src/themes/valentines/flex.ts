// The lovebird's springy bits that ring past their goal before they settle,
// as the kit's critically damped springs (`../follower/solid.ts`) never do:
// a wingtip whipping after its stroke, a body balancing on a moving pointer
// and dipping as it lands. An underdamped spring, stepped in small fixed
// pieces so it's the same at any frame rate and stays stable however long the
// frame. Pure (state is stepped in place, for a frame's sake).

export interface Flex {
  x: number;
  v: number;
}

export const flexAt = (x: number): Flex => ({ v: 0, x });

/** The longest piece a flex is stepped in, seconds. */
const PIECE = 1 / 240;

/**
 * Steps a flex `seconds` on toward `goal`, ringing at `hertz` and damped by
 * `damping` (a share of critical: 1 never overshoots, lower rings longer).
 * `goalSpeed` is how fast the goal itself moves: the damping is on the
 * flex's speed about it, so a flex chasing a moving goal (a wingtip after its
 * stroke) lags behind it rather than being held back.
 */
export const stepFlex = (
  flex: Flex,
  goal: number,
  hertz: number,
  damping: number,
  seconds: number,
  goalSpeed = 0,
) => {
  const pieces = Math.ceil(Math.max(0, seconds) / PIECE);
  if (pieces === 0) {
    return;
  }
  const h = seconds / pieces;
  const omega = Math.PI * 2 * hertz;
  for (let piece = 0; piece < pieces; piece += 1) {
    const pull = -omega * omega * (flex.x - goal) - 2 * damping * omega * (flex.v - goalSpeed);
    flex.v += pull * h;
    flex.x += flex.v * h;
  }
};

/** Knocks a flex: its speed changed by `by`, a bump or a jolt. */
export const kickFlex = (flex: Flex, by: number) => {
  flex.v += by;
};
