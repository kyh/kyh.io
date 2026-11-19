export interface Jiggle {
  x: number;
  v: number;
}

export const jiggleAt = (x: number) => ({ v: 0, x }) satisfies Jiggle;

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
