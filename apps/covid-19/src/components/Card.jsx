import * as stylex from "@stylexjs/stylex";
import { radii, spacing } from "@repo/tailwind-compat/tokens.stylex";

import { colors } from "../styles/tokens.stylex";

const styles = stylex.create({
  card: {
    overflow: "hidden",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.gray700,
    paddingInline: spacing[4],
    paddingBlock: spacing[3],
  },
});

export const Card = ({ children, style }) => {
  return <div {...stylex.props(styles.card, style)}>{children}</div>;
};
