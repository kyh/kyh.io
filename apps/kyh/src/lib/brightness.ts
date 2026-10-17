// The brightness dial's two curves, the same ones global.css draws the site
// with (--shade, --contrast), for whatever paints outside CSS: the showcase's
// town. Brightness runs night 0 … day 1, and the theme flips at half. Pure.

/** The flip: at or past it the page wears the light theme. */
export const FLIP = 0.5;

/** How far the light theme's grounds go toward the dark ones at the flip, and the dark theme's toward the light. */
const LIGHT_REACH = 0.34;
const DARK_REACH = 0.365;

/**
 * How far along from the dark palette to the light one the grounds are: each
 * theme eases toward the other but stops short of the mid-greys, so the flip
 * jumps the middle rather than lingering in it.
 */
export const shadeOf = (light: number) =>
  light >= FLIP ? LIGHT_REACH + (1 - LIGHT_REACH) * light : (DARK_REACH / FLIP) * light;

/** How much of the theme's own text color is kept: 1 at the theme's end, 0 at the flip, where text is black or white. */
export const contrastOf = (light: number) =>
  Math.min(1, Math.max(0, Math.abs(light - FLIP) / (1 - FLIP)));
