import * as stylex from "@stylexjs/stylex";

/**
 * Tailwind's `shadow-*` utilities as the full `box-shadow` value they computed to.
 *
 * Tailwind composed the property from five slots — inset-shadow, inset-ring,
 * ring-offset, ring, then the shadow itself — and the four it wasn't using stayed at
 * their `0 0 #0000` initial value. They are invisible, but they are present in the
 * computed style, so keeping them is what makes a migrated element's `box-shadow`
 * byte-identical to Tailwind's.
 *
 * Hand-written, unlike tokens.stylex.* — edit freely.
 */
const NONE = "0 0 #0000";
const SLOTS = `${NONE}, ${NONE}, ${NONE}, ${NONE}`;

export const boxShadow = stylex.defineConsts({
  xs: `${SLOTS}, 0 1px 2px 0 rgb(0 0 0 / 0.05)`,
  sm: `${SLOTS}, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`,
  md: `${SLOTS}, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`,
  lg: `${SLOTS}, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`,
  xl: `${SLOTS}, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
  "2xl": `${SLOTS}, 0 25px 50px -12px rgb(0 0 0 / 0.25)`,
  none: NONE,
});

/**
 * For composing `ring-*` with `shadow-*`, which share the property. Tailwind's slot
 * order is inset-shadow, inset-ring, ring-offset, ring, shadow — so a ring sits fourth
 * and anything unused stays `0 0 #0000`:
 *
 *   ring + shadow:  `${ringSlots.before}, 0 0 0 1px ${c}, ${shadowLayers.lg}`
 *   ring alone:     `${ringSlots.before}, 0 0 0 1px ${c}, ${ringSlots.after}`
 *   ring + offset:  `${ringSlots.beforeOffset}, 0 0 0 1px #fff, 0 0 0 3px ${c}, ${ringSlots.after}`
 */
export const ringSlots = stylex.defineConsts({
  before: `${NONE}, ${NONE}, ${NONE}`,
  /** when `ring-offset-*` fills the third slot itself */
  beforeOffset: `${NONE}, ${NONE}`,
  after: NONE,
});

export const shadowLayers = stylex.defineConsts({
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
});
