// A spring that wobbles: for the bunny's body squashing as it lands and
// stretching as it takes off, and quivering a moment after. The kit's springs
// (`../follower/solid.ts`) are critically damped, so they never overshoot;
// flesh does, a little. Solved exactly over each step, so it moves the same
// at any frame rate and a long frame can't throw it. Pure (state is stepped
// in place, for a frame's sake).

export interface Jiggle {
  x: number;
  v: number;
}

export const jiggleAt = (x: number): Jiggle => ({ v: 0, x });

/**
 * Steps a jiggle `seconds` on toward `goal`: `hertz` how fast it wobbles,
 * `damping` (0 to 1) how quickly the wobble dies, 1 none at all.
 */
export const stepJiggle = (
  jiggle: Jiggle,
  goal: number,
  hertz: number,
  damping: number,
  seconds: number,
) => {
  const t = Math.max(seconds, 0);
  const omega = Math.PI * 2 * hertz;
  const zeta = Math.min(Math.max(damping, 0), 0.999);
  const ringing = omega * Math.sqrt(1 - zeta * zeta);
  const off = jiggle.x - goal;
  const decay = Math.exp(-zeta * omega * t);
  const cos = Math.cos(ringing * t);
  const sin = Math.sin(ringing * t);
  const b = (jiggle.v + zeta * omega * off) / ringing;
  jiggle.x = goal + decay * (off * cos + b * sin);
  jiggle.v =
    decay * ((b * ringing - zeta * omega * off) * cos - (off * ringing + zeta * omega * b) * sin);
};
