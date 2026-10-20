"use client";

import { useCallback, useEffect, useRef } from "react";

import type { Cell } from "@/lib/scramble";
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

const paint = (shown: HTMLElement, cells: Cell[]) => {
  shown.textContent = cells.map((cell) => cell.glyph).join("");
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
  // Repainting under the pointer makes Chrome fire mouseenter again with no
  // mouseleave between, so only an enter after a leave counts as a hover.
  const insideRef = useRef(false);

  // Each tick writes the next frame straight into the shown span; screen
  // readers get the plain text beside it. While it plays, the heading holds
  // its width, so it never slips out from under the pointer and replays.
  const play = useCallback(() => {
    const shown = shownRef.current;
    const heading = shown?.parentElement;
    if (!shown || !heading || timerRef.current) {
      return;
    }
    if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      delete shown.dataset.pending;
      return;
    }
    heading.style.minWidth = `${heading.offsetWidth}px`;
    const glyphs = scrambleChars(text);
    const last = scrambleTicks(text);
    let tick = 0;
    // The first frame replaces the text in the same task that unhides it, so
    // an on-load heading never shows whole before it types out.
    paint(shown, scrambleFrame(text, tick, glyphs, Math.random));
    delete shown.dataset.pending;
    timerRef.current = setInterval(() => {
      tick += 1;
      paint(shown, scrambleFrame(text, tick, glyphs, Math.random));
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
    <Element
      className={className}
      onMouseEnter={
        trigger === "load"
          ? undefined
          : () => {
              if (!insideRef.current) {
                insideRef.current = true;
                play();
              }
            }
      }
      onMouseLeave={() => {
        insideRef.current = false;
      }}
      {...props}
    >
      <span
        ref={shownRef}
        data-scramble
        data-pending={trigger === "hover" ? undefined : ""}
        aria-hidden
      >
        {text}
      </span>
      <span className="sr-only">{text}</span>
    </Element>
  );
};
