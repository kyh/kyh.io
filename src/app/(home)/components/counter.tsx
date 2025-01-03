"use client";

import type { RefObject } from "react";
import { Fragment, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

import styles from "./counter.module.css";

type VerticalProps = {
  letter: string;
};

const chars = ["9", "8", "7", "6", "5", "4", "3", "2", "1", "0", ",", ".", "-"];
const amountOfItems = chars.length + 1;
const containerHeight = `${amountOfItems}em`;

const Vertical = ({ letter }: VerticalProps) => {
  const charIndex = chars.findIndex((char) => char === letter);

  if (charIndex === -1) {
    return <Fragment>{letter}</Fragment>;
  }

  const y = `${(-charIndex / (amountOfItems - 1)) * 100}%`;

  return (
    <div style={{ height: containerHeight, position: "relative" }}>
      <motion.div
        initial={{ y, opacity: 0 }}
        animate={{ y, opacity: 1 }}
        exit={{ y, opacity: 0 }}
        transition={{ ease: "easeOut" }}
        style={{
          position: `absolute`,
          left: 0,
        }}
      >
        {chars.map((char) => (
          <div key={char}>{char}</div>
        ))}
      </motion.div>
    </div>
  );
};

type CounterProps = {
  text: string | number;
  height?: string | number;
};

const transition = { ease: "easeOut" };

export const Counter = ({ text, height = "1em" }: CounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const getTextStats = useMemo(() => generateTextStats(ref), [ref]);

  const baseStyles = {
    height,
    lineHeight: typeof height === "string" ? height : `${height}px`,
  };

  const textArray = String(text).split("");
  const stats = textArray.map(getTextStats);
  const totalWidth = Math.ceil(stats.reduce(count, 0));

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
      <span className={styles.prefix} ref={ref}>
        {text}
      </span>

      <AnimatePresence initial={false}>
        {textArray.map((letter, index) => {
          const x = stats.slice(0, index).reduce(count, 0);
          const width = stats[index];

          // animate from the right to left, so we need to invert the index
          const key = `${textArray.length - index}`;

          return (
            <motion.span
              key={key}
              layoutId={key}
              animate={{ x, width, opacity: 1 }}
              initial={{ x, width, opacity: 0 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ ease: "easeOut" }}
              className={styles.letter}
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

const count = (acc: number, curr: number) => {
  return acc + curr;
};

const generateTextStats = (ref: RefObject<HTMLSpanElement | null>) => {
  const cache = new Map<string, number>();

  // safety for nodejs/ssr
  if (typeof document === "undefined") {
    return (letter: string) => {
      return cache.get(letter) ?? 0;
    };
  }

  let hasCalculatedFont = false;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;

  return (letter: string) => {
    if (!cache.has(letter)) {
      if (!hasCalculatedFont) {
        context.font = getComputedStyle(ref.current ?? document.body).font;
        hasCalculatedFont = true;
      }
      cache.set(letter, (context.measureText(letter).width ?? 0) - 0.2);
    }

    return cache.get(letter) ?? 0;
  };
};
