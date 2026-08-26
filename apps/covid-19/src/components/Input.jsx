import * as stylex from "@stylexjs/stylex";
import {
  fontSizes,
  lineHeights,
  mediaQueries,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

import { colors } from "../styles/tokens.stylex";

const styles = stylex.create({
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  wrap: {
    position: "relative",
    borderRadius: radii.md,
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
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
    lineHeight: { default: lineHeights.tight, [mediaQueries.sm]: spacing[5] },
    color: colors.gray700,
    outlineStyle: { default: null, ":focus": "none" },
    fontSize: { default: null, [mediaQueries.sm]: fontSizes.sm },
  },
});

export const Input = ({ label, ...rest }) => {
  return (
    <div>
      <label htmlFor={label} {...stylex.props(styles.srOnly)}>
        {label}
      </label>
      <div {...stylex.props(styles.wrap)}>
        <input id={label} {...stylex.props(styles.input)} {...rest} />
      </div>
    </div>
  );
};
