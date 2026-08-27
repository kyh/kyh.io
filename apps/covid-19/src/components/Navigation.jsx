import { leading } from "@repo/tailwind-compat/leading.stylex";
import * as stylex from "@stylexjs/stylex";
import {
  containers,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";
import { only as mediaOnly, up as mediaUp } from "@repo/tailwind-compat/media.stylex";
import { NavLink } from "react-router-dom";

import { colors } from "../styles/tokens.stylex";

const LINKS = [
  { to: "/", label: "Trend" },
  { to: "/distribution", label: "Distribution" },
];

const styles = stylex.create({
  nav: { marginBottom: { default: spacing[4], [mediaUp.sm]: spacing[8] } },
  inner: {
    marginInline: "auto",
    maxWidth: containers["7xl"],
    paddingInline: {
      default: null,
      [mediaOnly.smToLg]: spacing[6],
      [mediaUp.lg]: spacing[8],
    },
  },
  rule: { borderBottomWidth: 1, borderBottomStyle: "solid", borderColor: colors.gray700 },
  bar: {
    display: "flex",
    height: spacing[16],
    alignItems: "center",
    justifyContent: "space-between",
    paddingInline: { default: spacing[4], [mediaUp.sm]: 0 },
  },
  left: { display: "flex", alignItems: "center" },
  logoWrap: { flexShrink: 0 },
  logo: { height: spacing[8], width: spacing[8] },
  links: { marginLeft: spacing[10], display: "flex", alignItems: "baseline" },
  /** was space-x-4: margin on every child but the last */
  spaced: { marginInlineEnd: spacing[4] },
  link: {
    borderRadius: radii.md,
    paddingInline: spacing[3],
    paddingBlock: spacing[2],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    fontWeight: fontWeights.medium,
    color: { default: colors.gray300, ":focus": colors.white },
    outlineStyle: { default: null, ":focus": "none" },
    backgroundColor: { default: null, ":focus": colors.gray800 },
  },
  linkHover: {
    backgroundColor: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray800 },
    },
    color: { default: null, "@media (hover: hover)": { default: null, ":hover": colors.white } },
  },
  linkActive: { backgroundColor: colors.gray800 },
  meta: {
    marginLeft: spacing[6],
    display: "flex",
    alignItems: "center",
    fontSize: fontSizes.xs,
    lineHeight: leading.xs,
    color: colors.gray400,
  },
  date: { position: "relative", marginLeft: spacing[3] },
});

const Link = ({ to, children, isLast }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        stylex.props(
          styles.link,
          styles.linkHover,
          isActive && styles.linkActive,
          !isLast && styles.spaced,
        ).className
      }
    >
      {children}
    </NavLink>
  );
};

export const Navigation = () => {
  return (
    <nav {...stylex.props(styles.nav)}>
      <div {...stylex.props(styles.inner)}>
        <div {...stylex.props(styles.rule)}>
          <div {...stylex.props(styles.bar)}>
            <div {...stylex.props(styles.left)}>
              <div {...stylex.props(styles.logoWrap)}>
                <img {...stylex.props(styles.logo)} src="/logo.svg" alt="Covid-19 Dashboard" />
              </div>
              <div {...stylex.props(styles.links)}>
                {LINKS.map(({ to, label }, i) => (
                  <Link key={to} to={to} isLast={i === LINKS.length - 1}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div {...stylex.props(styles.meta)}>
              <div {...stylex.props(styles.date)}>7th March, 2021</div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
