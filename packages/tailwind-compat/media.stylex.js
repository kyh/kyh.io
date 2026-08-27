import * as stylex from "@stylexjs/stylex";

/**
 * Tailwind's breakpoints as MUTUALLY EXCLUSIVE ranges.
 *
 * Tailwind's `sm:` / `lg:` are open-ended `min-width` queries that overlap, and it
 * relies on emitting them widest-last so the widest wins. StyleX does not order
 * overlapping media queries by width — whichever atomic class lands later in the sheet
 * wins. Ranges that cannot both match remove the ordering question entirely.
 *
 * Use `up.*` only for the widest step in a chain; use `between.*` for every step that
 * has a wider one after it.
 *
 *   paddingInline: {
 *     default: spacing[4],
 *     [between.smToLg]: spacing[6],
 *     [up.lg]: spacing[8],
 *   }
 *
 * Hand-written, unlike tokens.stylex.* — edit freely.
 */
export const up = stylex.defineConsts({
  sm: "@media (width >= 40rem)",
  md: "@media (width >= 48rem)",
  lg: "@media (width >= 64rem)",
  xl: "@media (width >= 80rem)",
  "2xl": "@media (width >= 96rem)",
});

export const between = stylex.defineConsts({
  smToMd: "@media (width >= 40rem) and (width < 48rem)",
  smToLg: "@media (width >= 40rem) and (width < 64rem)",
  mdToLg: "@media (width >= 48rem) and (width < 64rem)",
  lgToXl: "@media (width >= 64rem) and (width < 80rem)",
  xlTo2xl: "@media (width >= 80rem) and (width < 96rem)",
});

/**
 * Hover styles belong behind this. A device without a hover-capable pointer otherwise
 * latches `:hover` on tap and keeps it until you tap elsewhere; Tailwind wrapped every
 * `hover:` utility the same way.
 */
export const feature = stylex.defineConsts({
  hover: "@media (hover: hover)",
});
