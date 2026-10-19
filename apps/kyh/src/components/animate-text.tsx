"use client";

import { motionValue, stagger } from "motion";
import { scrambleText } from "motion-plus-dom";
import type { ScrambleTextControls } from "motion-plus-dom";
import { useCallback, useEffect, useRef } from "react";

import { scrambleChars } from "@/lib/zhuyin";

export interface AnimateSectionProps<C> {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  as?: C;
}

export const AnimateSection = <C extends React.ElementType>({
  children,
  duration,
  delay,
  as,
  className = "",
  ...props
}: AnimateSectionProps<C>) => {
  const Element = as ?? "div";
  return (
    <div className="animate-section">
      <Element
        style={{
          animationDelay: `${delay ?? 0}s`,
          animationDuration: `${duration ?? 0.4}s`,
        }}
        className={className}
        {...props}
      >
        {children}
      </Element>
    </div>
  );
};

// Every letter scrambles at once, swapping glyphs every INTERVAL, then they
// settle left to right: the first after HOLD, each next STAGGER later.
const INTERVAL = 0.05;
const HOLD = 0.2;
const STAGGER = 0.05;

type ScrambleTextProps = {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span";
  trigger?: "load" | "hover" | "both";
} & React.HTMLAttributes<HTMLElement>;

export const ScrambleText = ({
  children,
  className = "text-[2em] leading-none font-normal text-foreground-highlighted",
  as: Element = "h1",
  trigger = "load",
  ...props
}: ScrambleTextProps) => {
  const text = children;
  const lettersRef = useRef<HTMLSpanElement>(null);
  const runRef = useRef<{ controls: ScrambleTextControls; unsubscribe: () => void }>(null);

  // Motion's scrambleText writes the scrambled string to a motion value; each
  // letter draws its glyph over itself, so the heading never changes width.
  const play = useCallback(() => {
    const letters = lettersRef.current?.querySelectorAll<HTMLSpanElement>("span[data-char]");
    if (!letters || globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    runRef.current?.controls.stop();
    runRef.current?.unsubscribe();
    const shown = motionValue(text);
    const unsubscribe = shown.on("change", (value) => {
      for (const [index, glyph] of [...value].entries()) {
        const letter = letters[index];
        if (letter) {
          letter.dataset.glyph = glyph;
        }
      }
    });
    const controls = scrambleText(shown, {
      chars: scrambleChars(text),
      duration: stagger(STAGGER, { startDelay: HOLD }),
      interval: INTERVAL,
    });
    runRef.current = { controls, unsubscribe };
  }, [text]);

  useEffect(() => {
    if (trigger !== "hover") {
      play();
    }
    return () => {
      runRef.current?.controls.stop();
      runRef.current?.unsubscribe();
    };
  }, [play, trigger]);

  return (
    <Element className={className} onMouseEnter={trigger === "load" ? undefined : play} {...props}>
      <span ref={lettersRef} data-scramble aria-hidden>
        {[...text].map((char, index) => (
          <span key={index} data-char={char} data-glyph={char}>
            {char}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </Element>
  );
};
