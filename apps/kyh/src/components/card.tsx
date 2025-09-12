import styles from "./card.module.css";

type CardProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLProps<HTMLDivElement>;

export const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <article className={`${styles.card} ${className}`} {...props}>
      {children}
    </article>
  );
};
