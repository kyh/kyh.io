import { leading } from "@repo/tailwind-compat/leading.stylex";
import { cloneElement } from "react";
import * as stylex from "@stylexjs/stylex";
import { ringSlots } from "@repo/tailwind-compat/shadows.stylex";
import {
  colors,
  fontSizes,
  fontWeights,
  radii,
  spacing,
} from "@repo/tailwind-compat/tokens.stylex";

type Props = {
  label: string;
  style?: stylex.StyleXStyles;
  name: string;
  placeholder?: string;
  children?: any;
};

const styles = stylex.create({
  wrap: {
    position: "relative",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.slate600, ":focus-within": colors.emerald600 },
    paddingInline: spacing[3],
    paddingBlock: spacing[2],
    zIndex: { default: null, ":focus-within": 10 },
    boxShadow: {
      default: null,
      ":focus-within": `${ringSlots.before}, 0 0 0 1px ${colors.emerald600}, ${ringSlots.after}`,
    },
  },
  label: {
    display: "block",
    cursor: "text",
    paddingBottom: spacing[1],
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    fontWeight: fontWeights.medium,
    color: colors.slate50,
  },
  field: {
    display: "block",
    width: "100%",
    borderWidth: 0,
    padding: 0,
    color: colors.emerald500,
    backgroundColor: "transparent",
    boxShadow: { default: null, ":focus": "none" },
    "::placeholder": { color: colors.slate500 },
  },
});

export const FormField = ({ label, name, style, placeholder, children }: Props) => {
  const fieldProps = {
    id: name,
    type: "text",
    className: stylex.props(styles.field).className,
    name,
    placeholder,
  };

  const field = children ? cloneElement(children, fieldProps) : <input {...fieldProps} />;

  return (
    <div {...stylex.props(styles.wrap, style)}>
      <label htmlFor={name} {...stylex.props(styles.label)}>
        {label}
      </label>
      {field}
    </div>
  );
};
