import { a11y } from "@repo/tailwind-compat/a11y.stylex";
import { up as mediaUp } from "@repo/tailwind-compat/media.stylex";
import { boxShadow } from "@repo/tailwind-compat/shadows.stylex";
import * as stylex from "@stylexjs/stylex";
import { fontSizes, lineHeights, radii, spacing } from "@repo/tailwind-compat/tokens.stylex";

import { colors } from "../styles/tokens.stylex";

const styles = stylex.create({
  wrap: {
    position: "relative",
    borderRadius: radii.md,
    boxShadow: boxShadow.sm,
  },
  input: {
    display: "block",
    width: "100%",
    appearance: "none",
    borderRadius: radii.default,
    borderWidth: 1,
    borderStyle: "solid",
    paddingInline: spacing[3],
    paddingBlock: spacing[2],
    lineHeight: { default: lineHeights.tight, [mediaUp.sm]: spacing[5] },
    color: colors.gray700,
    outlineStyle: { default: null, ":focus": "none" },
    fontSize: { default: null, [mediaUp.sm]: fontSizes.sm },
  },
});

export const Input = ({ label, ...rest }) => {
  return (
    <div>
      <label htmlFor={label} {...stylex.props(a11y.srOnly)}>
        {label}
      </label>
      <div {...stylex.props(styles.wrap)}>
        <input id={label} {...stylex.props(styles.input)} {...rest} />
      </div>
    </div>
  );
};
