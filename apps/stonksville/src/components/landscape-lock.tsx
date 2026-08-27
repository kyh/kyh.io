import * as stylex from "@stylexjs/stylex";

const PORTRAIT = "@media (max-width: 768px) and (orientation: portrait)";

/** Forces landscape on mobile portrait screens. Lives on a wrapper rather than
 * body so position:fixed, confetti, and third-party overlays keep the real viewport. */
const styles = stylex.create({
  shell: {
    width: { default: "100%", [PORTRAIT]: "100dvh" },
    height: { default: "100%", [PORTRAIT]: "100dvw" },
    overflow: { default: null, [PORTRAIT]: "hidden" },
    transform: { default: null, [PORTRAIT]: "rotate(90deg)" },
    transformOrigin: { default: null, [PORTRAIT]: "top left" },
    position: { default: null, [PORTRAIT]: "absolute" },
    top: { default: null, [PORTRAIT]: 0 },
    left: { default: null, [PORTRAIT]: "100dvw" },
  },
});

export function LandscapeShell({ children }: { children: React.ReactNode }) {
  return <div {...stylex.props(styles.shell)}>{children}</div>;
}
