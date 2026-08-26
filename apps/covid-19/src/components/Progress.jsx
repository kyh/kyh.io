import * as stylex from "@stylexjs/stylex";
import { radii, spacing } from "@repo/tailwind-compat/tokens.stylex";

import { colors } from "../styles/tokens.stylex";

const styles = stylex.create({
  track: {
    display: "flex",
    height: spacing[2],
    overflow: "hidden",
    borderRadius: radii.default,
    backgroundColor: colors.gray700,
  },
  bar: { backgroundColor: colors.teal500 },
});

export const Progress = ({ value, total }) => {
  return (
    <div {...stylex.props(styles.track)}>
      <div
        style={{ width: `${(value / total) * 100}%` }}
        {...stylex.props(styles.bar)}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin="0"
        aria-valuemax={total}
      />
    </div>
  );
};
