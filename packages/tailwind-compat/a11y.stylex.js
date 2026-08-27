import * as stylex from "@stylexjs/stylex";

/**
 * Tailwind's `sr-only`: hidden from sight, still read by assistive tech. Kept as one
 * definition because getting it subtly wrong — a `display: none`, a missing
 * `white-space` — silently drops the element from the accessibility tree instead of
 * just looking off.
 *
 * Hand-written, unlike tokens.stylex.* — edit freely.
 */
export const a11y = stylex.create({
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});
