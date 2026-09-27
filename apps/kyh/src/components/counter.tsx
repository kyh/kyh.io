"use client";

import type { Transition } from "motion/react";
import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";

interface VerticalProps {
  letter: string;
}

const chars = ["9", "8", "7", "6", "5", "4", "3", "2", "1", "0", ",", ".", "-"];
const amountOfItems = chars.length + 1;
const containerHeight = `${amountOfItems}em`;

const Vertical = ({ letter }: VerticalProps) => {
  const charIndex = chars.indexOf(letter);

  if (charIndex === -1) {
    return letter;
  }

  const y = `${(-charIndex / (amountOfItems - 1)) * 100}%`;

  return (
    <div style={{ height: containerHeight, position: "relative" }}>
      <motion.div
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y }}
        exit={{ opacity: 0, y }}
        transition={{ ease: "easeOut" }}
        style={{
          left: 0,
          position: `absolute`,
        }}
      >
        {chars.map((char) => (
          <div key={char}>{char}</div>
        ))}
      </motion.div>
    </div>
  );
};

interface CounterProps {
  text: string | number;
  height?: string | number;
}

const sum = (values: number[]) => {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
};

const generateTextStats = () => {
  const cache = new Map<string, number>();
  const fromCache = (letter: string) => cache.get(letter) ?? 0;

  // safety for nodejs/ssr
  if (typeof document === "undefined") {
    return fromCache;
  }

  let hasCalculatedFont = false;
  const context = document.createElement("canvas").getContext("2d");
  if (!context) {
    return fromCache;
  }

  return (letter: string) => {
    if (!cache.has(letter)) {
      if (!hasCalculatedFont) {
        context.font = getComputedStyle(document.body).font;
        hasCalculatedFont = true;
      }
      cache.set(letter, (context.measureText(letter).width ?? 0) - 0.2);
    }

    return fromCache(letter);
  };
};

const transition = { ease: "easeOut" } satisfies Transition;

export const Counter = ({ text, height = "1em" }: CounterProps) => {
  const getTextStats = useMemo(() => generateTextStats(), []);

  const baseStyles = {
    height,
    lineHeight: Number.isFinite(height) ? `${height}px` : height,
  };

  const textArray = [...String(text)];
  const stats = textArray.map(getTextStats);
  const totalWidth = Math.ceil(sum(stats));

  return (
    <motion.div
      initial={{ width: totalWidth }}
      animate={{ width: totalWidth }}
      transition={transition}
      style={{
        ...baseStyles,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <span className="absolute top-0 left-0 text-transparent">{text}</span>

      <AnimatePresence initial={false}>
        {textArray.map((letter, index) => {
          const x = sum(stats.slice(0, index));
          const width = stats[index];

          // animate from the right to left, so we need to invert the index
          const key = `${textArray.length - index}`;

          return (
            <motion.span
              key={key}
              layoutId={key}
              animate={{ opacity: 1, width, x }}
              initial={{ opacity: 0, width, x }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ ease: "easeOut" }}
              className="pointer-events-none absolute top-0 left-0"
              aria-hidden="true"
            >
              <Vertical letter={letter} />
            </motion.span>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};
