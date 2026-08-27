import * as stylex from "@stylexjs/stylex";

/**
 * The exact `transition-property` lists Tailwind's `transition-*` utilities emitted.
 *
 * These still name `--tw-gradient-from/via/to`. Those custom properties no longer
 * exist, so transitioning them is a no-op — but keeping them means a migrated element's
 * computed `transition-property` is byte-identical to what Tailwind produced, which is
 * the difference between a clean visual diff and one with unexplained entries in it.
 *
 * Hand-written, unlike tokens.stylex.* — edit freely.
 */
export const transitionProperty = stylex.defineConsts({
  all: "all",
  colors:
    "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to",
  opacity: "opacity",
  shadow: "box-shadow",
  transform: "transform, translate, scale, rotate",
  default:
    "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events",
});
