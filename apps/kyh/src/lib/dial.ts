// The theme toggle's easter egg: five quick taps turn it into a brightness
// slider, dark 0 → light 100. Pure: the dock applies what these return.

export const TAPS = 5;
export const TAP_GAP_MS = 600;

/** The taps still in the streak after one at `now`: a pause longer than the gap starts over. */
export const tapStreak = (taps: readonly number[], now: number): number[] => {
  const last = taps.at(-1);
  return last !== undefined && now - last <= TAP_GAP_MS ? [...taps, now] : [now];
};

/** 0 dark … 100 light; null follows the theme. */
export type Brightness = number | null;

/** The light half of the slider wears the light theme. */
export const themeOf = (light: number) => (light >= 50 ? "light" : "dark");

/** The custom property brightness sets on <html>: what global.css blends the backgrounds by. */
export const DIAL_PROPERTY = "--dial-light";

/** The value of `--dial-light`, or null to clear it. */
export const dialValue = (light: Brightness) =>
  light === null ? null : `${Math.min(100, Math.max(0, Math.round(light)))}%`;

export const DIAL_KEY = "kyh-dial";

/** A stored brightness, or none when the value is missing or not one of ours. */
export const readDial = (raw: string | null): Brightness => {
  const n = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
};

/** Runs before paint so a dialled page doesn't flash the stock palette. */
export const restoreScript = `try{var l=Number(localStorage.getItem(${JSON.stringify(DIAL_KEY)})||"x"),r=document.documentElement;if(l>=0&&l<=100){r.style.setProperty(${JSON.stringify(DIAL_PROPERTY)},Math.round(l)+"%");r.dataset.dial=""}}catch(e){}`;
