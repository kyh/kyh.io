import * as stylex from "@stylexjs/stylex";

/**
 * Tailwind's `animate-pulse` / `animate-spin`, spelled as longhands.
 *
 * StyleX classifies `animation` as a shorthand-of-shorthands and drops it without
 * warning — the rule simply never reaches the stylesheet — so the composite string
 * `@repo/tailwind-compat`'s `animations` export gives us cannot be used directly.
 */
const pulseFrames = stylex.keyframes({
  "50%": { opacity: 0.5 },
});

const spinFrames = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

export const animate = stylex.create({
  pulse: {
    animationName: pulseFrames,
    animationDuration: "2s",
    animationTimingFunction: "cubic-bezier(.4, 0, .6, 1)",
    animationIterationCount: "infinite",
  },
  spin: {
    animationName: spinFrames,
    animationDuration: "1s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});
