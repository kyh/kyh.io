// A lovebird's wingbeat (`lovebird.ts` beats it, `lovebird-pose.ts` draws
// it): the arm's stroke through a beat, down from the top in a little over
// half of it (the power stroke), then up again with the wing drawn in. Pure.

/** The stroke's top and bottom (radians, + up), where the wings are held gliding, and the downstroke's share of a beat. */
const TOP = 1.05;
const BOTTOM = -0.8;
export const HELD = 0.12;
const DOWNSTROKE = 0.55;

/** Eased in and out over half a turn of a cosine. */
const ease = (u: number) => (1 - Math.cos(Math.PI * u)) / 2;

/** Its arm's stroke this far through its beats, `amp` of the way from held to its full stroke. */
export const strokeAt = (phase: number, amp: number) => {
  const p = phase - Math.floor(phase);
  const full =
    p < DOWNSTROKE
      ? TOP + (BOTTOM - TOP) * ease(p / DOWNSTROKE)
      : BOTTOM + (TOP - BOTTOM) * ease((p - DOWNSTROKE) / (1 - DOWNSTROKE));
  return HELD + (full - HELD) * amp;
};

/** 0 to 1 and back over the upstroke, when the wing's drawn in: 0 through the downstroke. */
export const upstrokeAt = (phase: number) => {
  const p = phase - Math.floor(phase);
  return p < DOWNSTROKE ? 0 : Math.sin((Math.PI * (p - DOWNSTROKE)) / (1 - DOWNSTROKE));
};
