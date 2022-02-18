import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import styles from "./AnimateText.module.css";

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
  const ref = useRef<HTMLHeadingElement>(null);
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
      ref={ref}
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
