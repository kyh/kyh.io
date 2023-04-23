"use client";

import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import styles from "./animate-text.module.css";

type Props = {
  children: React.ReactNode;
  className?: string;
  rotate?: string[];
  duration?: number;
  delay?: number;
  as?: keyof typeof motion;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const AnimateText = ({
  children,
  className = "",
  rotate = [],
}: Props) => {
  const [currentWord, setCurrentWord] = useState(rotate[0]);
  const [animate, setAnimate] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!currentWord) return;

    const interval = setInterval(async () => {
      setAnimate(true);
      await sleep(250);
      const nextWord =
        rotate[(rotate.indexOf(currentWord) + 1) % rotate.length];
      setCurrentWord(nextWord);
      await sleep(250);
      setAnimate(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [rotate, currentWord]);

  useEffect(() => {
    sleep(500).then(() => setInitialized(true));
  }, []);

  return (
    <h1
      className={`${styles.text} ${className} ${
        !initialized ? styles.entering : styles.entered
      } ${animate ? styles.reveal : ""}`}
    >
      {children} {currentWord && currentWord}
    </h1>
  );
};

export const AnimateSection = ({
  children,
  duration,
  delay,
  as,
  className = "",
}: Props) => {
  const Element = as || "div";
  return (
    <div className={styles.section}>
      <Element
        style={{
          animationDelay: `${delay || 0}s`,
          animationDuration: `${duration || 0.4}s`,
        }}
        className={className}
      >
        {children}
      </Element>
    </div>
  );
};

type ScrambleText = string;

type ScrambleTexts = ScrambleText[];

type TextScrambleProps = {
  texts: ScrambleTexts;
  className?: string;
  letterSpeed?: number;
  nextLetterSpeed?: number;
  paused?: boolean;
  pauseTime?: number;
};

const symbols: string[] = "!<>-_\\/[]{}—=+*^?#".split("");

const randomItem = (array: Array<any>) =>
  array[Math.floor(Math.random() * array.length)];

const nextItem = (array: Array<any>, currentItem: any) => {
  const currentIndex = array.indexOf(currentItem);
  const bound = array.length;
  const nextIndex = (currentIndex + bound + 1) % bound;
  return array[nextIndex];
};

export const TextScramble = ({
  texts,
  className,
  letterSpeed = 5,
  nextLetterSpeed = 100,
  paused = false,
  pauseTime = 1500,
}: TextScrambleProps) => {
  const [currentText, setCurrentText] = useState<string>(texts[0]);
  const bakeLetterIntervalRef = useRef<NodeJS.Timer>();
  const bakeTextIntervalRef = useRef<NodeJS.Timer>();

  const initSymbols: string[] = Array(currentText.length)
    .fill(0)
    .map(() => randomItem(symbols));

  const [displayedText, setDisplayedText] = useState<string[]>(initSymbols);

  const leftIndexes: number[] = [];

  const defaultLeftIndexes = (): void => {
    currentText.split("").forEach((_, i) => {
      leftIndexes.push(i);
    });
  };

  const bakeLetter = () => {
    bakeLetterIntervalRef.current = setInterval(() => {
      if (paused) return;

      const updatedText: string[] = [];

      currentText.split("").forEach((_, i) => {
        if (!leftIndexes.includes(i)) {
          updatedText[i] = currentText[i];
          return;
        }

        const randomSymbol = randomItem(symbols);
        updatedText[i] = randomSymbol;
      });

      setDisplayedText(updatedText);
    }, letterSpeed);
  };

  const bakeText = () => {
    defaultLeftIndexes();
    bakeLetter();

    bakeTextIntervalRef.current = setInterval(() => {
      if (paused) return;
      if (leftIndexes.length === 0) {
        clearInterval(bakeLetterIntervalRef.current);
        clearInterval(bakeTextIntervalRef.current);

        setTimeout(() => {
          setCurrentText(nextItem(texts, currentText));
          defaultLeftIndexes();
        }, pauseTime);
      }

      leftIndexes.shift();
    }, nextLetterSpeed);
  };

  useEffect(() => {
    if (!paused) bakeText();
  }, [currentText, paused]);

  useEffect(() => {
    return () => {
      clearInterval(bakeLetterIntervalRef.current);
      clearInterval(bakeTextIntervalRef.current);
    };
  }, []);

  return <h1 className={className}>{displayedText}</h1>;
};