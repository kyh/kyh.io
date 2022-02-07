import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import styles from "./ThemeToggle.module.css";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";
  const ariaLabel = `Switch to ${isLight ? "dark" : "light"} mode`;

  return (
    <button
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => setTheme(isLight ? "dark" : "light")}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        style={{ transform: isLight ? "rotate(90deg)" : "rotate(40deg)" }}
        className={styles.icon}
      >
        <mask id="moon-mask-main-nav">
          <rect x="0" y="0" width="18" height="18" fill="#FFF" />
          <motion.circle
            animate={{ cx: isLight ? 25 : 10 }}
            cy="2"
            r="8"
            fill="black"
          />
        </mask>
        <motion.circle
          cx="9"
          cy="9"
          fill="currentColor"
          mask="url(#moon-mask-main-nav)"
          animate={{ r: isLight ? 5 : 8 }}
        />
        <g>
          <motion.circle
            cx="17"
            cy="9"
            r="1.5"
            fill="currentColor"
            animate={{ scale: isLight ? 1 : 0 }}
          />
          <motion.circle
            cx="13"
            cy="15.928203230275509"
            r="1.5"
            fill="currentColor"
            animate={{ scale: isLight ? 1 : 0 }}
            transition={{ delay: isLight ? 0.05 : 0 }}
          />
          <motion.circle
            cx="5.000000000000002"
            cy="15.92820323027551"
            r="1.5"
            fill="currentColor"
            animate={{ scale: isLight ? 1 : 0 }}
            transition={{ delay: isLight ? 0.1 : 0 }}
          />
          <motion.circle
            cx="1"
            cy="9.000000000000002"
            r="1.5"
            fill="currentColor"
            animate={{ scale: isLight ? 1 : 0 }}
            transition={{ delay: isLight ? 0.15 : 0 }}
          />
          <motion.circle
            cx="4.9999999999999964"
            cy="2.071796769724492"
            r="1.5"
            fill="currentColor"
            animate={{ scale: isLight ? 1 : 0 }}
            transition={{ delay: isLight ? 0.2 : 0 }}
          />
          <motion.circle
            cx="13"
            cy="2.0717967697244912"
            r="1.5"
            fill="currentColor"
            animate={{ scale: isLight ? 1 : 0 }}
            transition={{ delay: isLight ? 0.25 : 0 }}
          />
        </g>
      </svg>
    </button>
  );
};
