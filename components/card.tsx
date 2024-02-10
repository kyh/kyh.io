import styles from "./card.module.css";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  effect?: "none" | "noise" | "dot" | "line" | "gradient";
} & React.HTMLProps<HTMLDivElement>;

export const Card = ({
  children,
  className = "",
  effect = "noise",
  ...props
}: CardProps) => {
  return (
    <article className={`${styles.cardContainer} ${className}`} {...props}>
      <div className={`${styles.card} ${effect ? styles[effect] : ""}`}>
        {children}
      </div>
    </article>
  );
};
