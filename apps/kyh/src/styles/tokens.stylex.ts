import * as stylex from "@stylexjs/stylex";

/**
 * The semantic names Tailwind exposed through `@theme inline`, pointing at the same
 * CSS custom properties global.css already defines. Keeping the indirection in CSS is
 * what lets `[data-theme="dark"]` keep switching them — StyleX has no ancestor
 * selectors, so it cannot express that condition itself.
 */
export const theme = stylex.defineConsts({
  foreground: "var(--body-color)",
  foregroundFaded: "var(--body-color-faded)",
  foregroundHighlighted: "var(--body-color-highlighted)",
  background: "var(--bg-highlighted)",
  backgroundFaded: "var(--bg-color)",
  backgroundHover: "color-mix(in srgb, var(--bg-color) 50%, transparent)",
  border: "var(--border-color)",
  panel: "var(--panel)",
  dockBg: "var(--dock-bg)",
});

/** Values that used to be `dark:` utility pairs. */
export const appIcon = stylex.defineConsts({
  shadow: "var(--app-icon-shadow)",
  bg: "var(--app-icon-bg)",
  ring: "var(--app-icon-ring)",
  overlayBg: "var(--app-overlay-bg)",
});
