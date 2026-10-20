"use client";

import { useCallback, useEffect, useRef } from "react";

import { scrambleFrame, scrambleTicks, TICK_MS } from "@/lib/scramble";
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

const stop = (timer: React.RefObject<ReturnType<typeof setInterval> | null>) => {
  if (timer.current) {
    clearInterval(timer.current);
    timer.current = null;
  }
};

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
  const shownRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Each tick writes the next frame straight into the shown span; screen
  // readers get the plain text beside it. While it plays, the heading holds
  // its width, so it never slips out from under the pointer and replays.
  const play = useCallback(() => {
    const shown = shownRef.current;
    const heading = shown?.parentElement;
    if (
      !shown ||
      !heading ||
      timerRef.current ||
      globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    heading.style.minWidth = `${heading.offsetWidth}px`;
    const glyphs = scrambleChars(text);
    const last = scrambleTicks(text);
    let tick = 0;
    shown.textContent = scrambleFrame(text, tick, glyphs, Math.random);
    timerRef.current = setInterval(() => {
      tick += 1;
      shown.textContent = scrambleFrame(text, tick, glyphs, Math.random);
      if (tick >= last) {
        stop(timerRef);
        heading.style.minWidth = "";
      }
    }, TICK_MS);
  }, [text]);

  useEffect(() => {
    if (trigger !== "hover") {
      play();
    }
    const shown = shownRef.current;
    return () => {
      stop(timerRef);
      if (shown) {
        shown.textContent = text;
        shown.parentElement?.style.removeProperty("min-width");
      }
    };
  }, [play, text, trigger]);

  return (
    <Element className={className} onMouseEnter={trigger === "load" ? undefined : play} {...props}>
      <span ref={shownRef} data-scramble aria-hidden>
        {text}
      </span>
      <span className="sr-only">{text}</span>
    </Element>
  );
};
