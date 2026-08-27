import { leading } from "@repo/tailwind-compat/leading.stylex";
import { theme } from "./styles/tokens.stylex";
import { feature, up as mediaUp } from "@repo/tailwind-compat/media.stylex";
import { containers, fontSizes, spacing } from "@repo/tailwind-compat/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import Link from "next/link";

const styles = stylex.create({
  page: {
    minHeight: "100vh",
    backgroundColor: theme.background,
    paddingInline: { default: spacing[4], [mediaUp.sm]: spacing[6] },
    paddingBlock: spacing[8],
  },
  wrap: { maxWidth: containers.xl },
  muted: {
    fontSize: fontSizes.sm,
    lineHeight: leading.sm,
    color: theme.mutedForeground,
  },
  link: {
    textDecorationLine: "underline",
    textUnderlineOffset: "2px",
    color: {
      default: null,
      [feature.hover]: { default: null, ":hover": theme.foreground },
    },
  },
});

const NotFound = () => {
  return (
    <div {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.wrap)}>
        <p {...stylex.props(styles.muted)}>
          Not found.{" "}
          <Link href="/" {...stylex.props(styles.link)}>
            Back
          </Link>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
