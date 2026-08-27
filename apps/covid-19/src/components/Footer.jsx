import { leading } from "@repo/tailwind-compat/leading.stylex";
import * as stylex from "@stylexjs/stylex";
import { containers, fontSizes, spacing } from "@repo/tailwind-compat/tokens.stylex";
import { only as mediaOnly, up as mediaUp } from "@repo/tailwind-compat/media.stylex";

import { colors } from "../styles/tokens.stylex";

const styles = stylex.create({
  inner: {
    marginInline: "auto",
    display: "flex",
    maxWidth: containers["7xl"],
    justifyContent: "space-between",
    paddingInline: {
      default: spacing[4],
      [mediaOnly.smToLg]: spacing[6],
      [mediaUp.lg]: spacing[8],
    },
    paddingBlock: spacing[4],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: colors.gray400,
  },
  link: {
    color: {
      default: null,
      "@media (hover: hover)": { default: null, ":hover": colors.gray100 },
    },
  },
});

export const Footer = () => {
  return (
    <footer>
      <div {...stylex.props(styles.inner)}>
        <span>© {new Date().getFullYear()}, Kaiyu Hsu</span>
        <div>
          <a {...stylex.props(styles.link)} href="https://github.com/kyh/covid-19">
            Github
          </a>
        </div>
      </div>
    </footer>
  );
};
