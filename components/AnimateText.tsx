import { useRef, useEffect, useState } from "react";
import styles from "./AnimateText.module.css";

type Props = {
  children: React.ReactNode;
  className?: string;
  rotate?: string[];
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
    }, 5000);

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
      } ${animate ? styles.rotate : ""}`}
    >
      {children} {currentWord && currentWord}
    </h1>
  );
};
