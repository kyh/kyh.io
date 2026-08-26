import * as stylex from "@stylexjs/stylex";

/**
 * Tailwind's breakpoints as MUTUALLY EXCLUSIVE ranges.
 *
 * Tailwind's `sm:` / `lg:` are open-ended `min-width` queries that overlap, and it
 * relies on emitting them widest-last so the widest wins. StyleX does not order
 * overlapping media queries by width — whichever atomic class lands later in the
 * sheet wins, which silently made `sm:px-6 lg:px-8` resolve to the `sm` value on a
 * wide screen. Ranges that cannot both match remove the ordering question entirely.
 *
 * Use `up.*` only for the largest step in a chain; use `only.*` for every step that
 * has a wider one after it.
 *
 *   paddingInline: {
 *     default: spacing[4],
 *     [media.only.sm]: spacing[6],   // 40rem – 64rem
 *     [media.up.lg]: spacing[8],     // 64rem and wider
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

export const only = stylex.defineConsts({
  sm: "@media (width >= 40rem) and (width < 48rem)",
  smToLg: "@media (width >= 40rem) and (width < 64rem)",
  md: "@media (width >= 48rem) and (width < 64rem)",
  lg: "@media (width >= 64rem) and (width < 80rem)",
  xl: "@media (width >= 80rem) and (width < 96rem)",
});

/** Below a breakpoint, i.e. Tailwind's `max-*` variants. */
export const below = stylex.defineConsts({
  sm: "@media (width < 40rem)",
  md: "@media (width < 48rem)",
  lg: "@media (width < 64rem)",
  xl: "@media (width < 80rem)",
  "2xl": "@media (width < 96rem)",
});
