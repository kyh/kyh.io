import * as stylex from "@stylexjs/stylex";

/**
 * Tailwind's per-step line-height as an absolute length rather than a ratio.
 *
 * `fontSizeLineHeights` holds the ratios Tailwind shipped (`calc(1.25 / .875)` and
 * friends). lightningcss evaluates every `calc()` and rounds unitless numbers to five
 * decimals, so `1.4285714…` becomes `1.42857` — which lands 1/64px short of the real
 * value once Chrome quantises it. A length has no such rounding.
 *
 * These are exactly `fontSizes[step] * fontSizeLineHeights[step]`, so on any element
 * that sets both from the same step they are equivalent. They differ only for a
 * descendant that inherits the line-height at a different font-size; pair them with the
 * matching `fontSizes` step and that case cannot arise.
 *
 * Hand-written, unlike tokens.stylex.* — edit freely.
 */
export const leading = stylex.defineConsts({
  xs: "1rem",
  sm: "1.25rem",
  base: "1.5rem",
  lg: "1.75rem",
  xl: "1.75rem",
  "2xl": "2rem",
  "3xl": "2.25rem",
  "4xl": "2.5rem",
  "5xl": "3rem",
  "6xl": "3.75rem",
  "7xl": "4.5rem",
  "8xl": "6rem",
  "9xl": "8rem",
});
