import * as stylex from "@stylexjs/stylex";

/**
 * The semantic names Tailwind exposed through `@theme inline`, pointing at the same
 * CSS custom properties globals.css already defines. Keeping the indirection in CSS is
 * what lets the `.dark` class keep switching them — StyleX has no ancestor selectors,
 * so it cannot express that condition itself.
 *
 * Only the names something actually styles with are listed. globals.css still defines
 * the full shadcn set; add a const here when a component reaches for one.
 */
export const theme = stylex.defineConsts({
  background: "var(--background)",
  foreground: "var(--foreground)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  destructive: "var(--destructive)",
  border: "var(--border)",
  input: "var(--input)",
});
