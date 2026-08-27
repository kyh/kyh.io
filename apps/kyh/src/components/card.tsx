import * as stylex from "@stylexjs/stylex";
import { radii, spacing } from "@repo/tailwind-compat/tokens.stylex";

type CardProps = {
  children: React.ReactNode;
  style?: stylex.StyleXStyles;
} & Omit<React.HTMLProps<HTMLDivElement>, "style">;

const styles = stylex.create({
  card: {
    overflow: "hidden",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--dock-border-color)",
    backgroundImage:
      "linear-gradient(to top in oklab, var(--dock-border-color) 0%, var(--dock-bg) 100%)",
    padding: spacing[1],
    backdropFilter: "blur(10px)",
  },
});

export const Card = ({ children, style, ...props }: CardProps) => {
  const { className, style: inline } = stylex.props(styles.card, style);
  return (
    <article className={`card-children ${className ?? ""}`} style={inline} {...props}>
      {children}
    </article>
  );
};
