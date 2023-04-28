import styles from "./badge.module.css";

type BadgeProps = {
  children: React.ReactNode;
};

export const Badge = ({ children }: BadgeProps) => {
  return (
    <span className={styles.badge}>
      <span className={styles.badgeContent}>{children}</span>
    </span>
  );
};
