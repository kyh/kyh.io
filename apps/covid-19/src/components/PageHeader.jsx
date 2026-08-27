import * as stylex from "@stylexjs/stylex";
import {
  containers,
  fontSizes,
  fontWeights,
  lineHeights,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";
import { between as mediaBetween, up as mediaUp } from "@repo/tailwind-compat/media.stylex";

import { colors } from "../styles/tokens.stylex";

const styles = stylex.create({
  inner: {
    marginInline: "auto",
    maxWidth: containers["7xl"],
    paddingInline: {
      default: spacing[4],
      [mediaBetween.smToLg]: spacing[6],
      [mediaUp.lg]: spacing[8],
    },
  },
  heading: {
    fontSize: fontSizes["3xl"],
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.bold,
    color: colors.gray900,
  },
});

export const PageHeader = ({ children }) => {
  return (
    <header>
      <div {...stylex.props(styles.inner)}>
        <h2 {...stylex.props(styles.heading)}>{children}</h2>
      </div>
    </header>
  );
};
