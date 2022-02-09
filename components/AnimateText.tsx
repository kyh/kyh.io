import styles from "./AnimateText.module.css";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const AnimateText = ({ children, className = "" }: Props) => {
  return <h1 className={`${styles.text} ${className}`}>{children}</h1>;
};
