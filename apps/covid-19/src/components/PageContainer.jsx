import * as stylex from "@stylexjs/stylex";
import { containers, spacing } from "@repo/tailwind-compat/tokens.stylex";
import { only as mediaOnly, up as mediaUp } from "@repo/tailwind-compat/media.stylex";

const styles = stylex.create({
  main: {
    marginInline: "auto",
    width: "100%",
    maxWidth: containers["7xl"],
    justifyContent: "space-between",
    display: { default: null, [mediaUp.sm]: "flex" },
    paddingInline: {
      default: null,
      [mediaOnly.smToLg]: spacing[6],
      [mediaUp.lg]: spacing[8],
    },
  },
});

export const PageContainer = ({ children }) => {
  return <main {...stylex.props(styles.main)}>{children}</main>;
};
