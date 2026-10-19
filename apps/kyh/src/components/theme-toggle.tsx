import { useId } from "react";
import { motion } from "motion/react";

import { PieceIcon } from "@/seasons/piece";
import { seasonOf } from "@/seasons/seasons";
import type { ThemeId } from "@/seasons/store";

interface ThemeToggleIconProps {
  isLight: boolean;
}

export const ThemeToggleIcon = ({ isLight }: ThemeToggleIconProps) => {
  // One mask per icon: the themes menu draws a sun and a moon beside the toggle's own.
  const mask = `moon-mask-${useId().replaceAll(/[^\w-]/gu, "")}`;
  return (
    <svg
      viewBox="0 0 18 18"
      width="100%"
      height="100%"
      style={{ transform: isLight ? "rotate(90deg)" : "rotate(40deg)" }}
      className="overflow-visible transition-transform duration-500 ease-in-out"
      aria-hidden="true"
    >
      <mask id={mask}>
        <rect x="0" y="0" width="18" height="18" fill="#FFF" />
        <motion.circle
          cy="2"
          r="8"
          fill="black"
          initial={false}
          animate={{ cx: isLight ? 25 : 10 }}
        />
      </mask>
      <motion.circle
        cx="9"
        cy="9"
        r="8"
        fill="currentColor"
        mask={`url(#${mask})`}
        initial={false}
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
  );
};

interface ThemeIconProps {
  id: ThemeId;
  /** A season as its line glyph, to sit with the dock's icons, or as its colored piece. */
  look: "glyph" | "piece";
  className?: string;
}

/** A theme's icon: the sun or moon for plain light or dark, else its season's glyph or piece. */
export const ThemeIcon = ({ id, look, className }: ThemeIconProps) => {
  if (id === "light" || id === "dark") {
    return (
      <span className={className}>
        <ThemeToggleIcon isLight={id === "light"} />
      </span>
    );
  }
  const { art, glyph } = seasonOf(id);
  return look === "piece" ? (
    <PieceIcon art={art} className={className} />
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={glyph} />
    </svg>
  );
};
