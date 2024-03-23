import type { Stat } from "@/lib/stat";
import { ConditionalContainer } from "@/components/conditional-container";
import styles from "./stat-span.module.css";

export const StatSpan = ({
  stat,
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  stat: Stat;
  onMouseEnter?: (s: Stat) => void;
  onMouseLeave?: (s: Stat) => void;
  children: React.ReactNode;
}) => {
  const shouldWrap = !isTouchDevice() && !!stat.href;

  const handleMouseEnter = () => {
    onMouseEnter && onMouseEnter(stat);
  };

  const handleMouseLeave = () => {
    onMouseLeave && onMouseLeave(stat);
  };

  return (
    <span
      className={styles.statSpan}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-text={children?.toString()}
    >
      <ConditionalContainer
        condition={shouldWrap}
        container={(children) => (
          <a href={stat.href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        )}
      >
        {children}
      </ConditionalContainer>
    </span>
  );
};

const isTouchDevice = () => {
  return (
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );
};
