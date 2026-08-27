import * as stylex from "@stylexjs/stylex";
import { defaults, fontWeights, radii, spacing } from "@repo/tailwind-compat/tokens.stylex";
import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";

import { theme } from "../../../styles/tokens.stylex";
import { ScrambleText } from "@/components/animate-text";
import { HashIcon } from "@/components/icons";

const styles = stylex.create({
  headingRow: {
    marginLeft: `calc(-1 * ${spacing[5]})`,
    display: "flex",
    alignItems: "center",
    gap: spacing[2],
  },
  /** opacity follows the hovered `.group` ancestor; see global.css */
  anchor: {
    color: { default: theme.foregroundFaded, ":hover": theme.foregroundHighlighted },
    backgroundColor: { default: null, ":hover": theme.backgroundHover },
    margin: `calc(-1 * ${spacing[1]})`,
    translate: "0 -0.1875rem",
    borderRadius: radii.sm,
    padding: spacing[1],
    opacity: { default: "var(--group-action-opacity, 0)", ":focus-visible": 1 },
    transitionProperty: "color, background-color, opacity",
    transitionTimingFunction: defaults.transitionTimingFunction,
    transitionDuration: ".15s",
  },
  heading: {
    color: theme.foregroundHighlighted,
    scrollMarginTop: { default: "120px", [mediaUp.sm]: "100px" },
    lineHeight: 1,
    fontWeight: fontWeights.medium,
  },
  section: { display: "flex", flexDirection: "column", gap: spacing[4] },
  sectionAnchored: { scrollMarginTop: { default: "120px", [mediaUp.sm]: "100px" } },
  separator: { backgroundColor: theme.border, height: "1px" },
});

export const SectionHeading = ({ children, id }: { children: string; id?: string }) => (
  <div className="group" {...stylex.props(styles.headingRow)}>
    {id && (
      <a
        href={`#${id}`}
        {...stylex.props(styles.anchor)}
        aria-label={`Link to ${children} section`}
      >
        <HashIcon />
      </a>
    )}
    <ScrambleText
      id={id}
      as="h2"
      trigger="hover"
      className={stylex.props(styles.heading).className}
    >
      {children}
    </ScrambleText>
  </div>
);

type SectionProps = {
  children: React.ReactNode;
  style?: stylex.StyleXStyles;
  id?: string;
  delay?: number;
};

export const Section = ({ children, style, id, delay = 0 }: SectionProps) => (
  <div className="animate-section">
    <section
      id={id}
      {...stylex.props(styles.section, Boolean(id) && styles.sectionAnchored, style)}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </section>
  </div>
);

export const Separator = () => <div role="separator" {...stylex.props(styles.separator)} />;
