// The theme toggle's easter egg: five quick taps swap the dock for two
// sliders, brightness (dark 0 → light 100) and hue. Pure.

export const TAPS = 5;
export const TAP_GAP_MS = 600;

/** The taps still in the streak after one at `now`: a pause longer than the gap starts over. */
export const tapStreak = (taps: readonly number[], now: number): number[] => {
  const last = taps.at(-1);
  return last !== undefined && now - last <= TAP_GAP_MS ? [...taps, now] : [now];
};

/** The light half of the brightness slider wears the light theme. */
export const themeOf = (light: number) => (light >= 50 ? "light" : "dark");

/** Slate's own hue: where the hue slider starts. */
export const SLATE_HUE = 257;
