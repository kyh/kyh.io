"use client";

import { a11y } from "@repo/tailwind-compat/a11y.stylex";
import { theme } from "../styles/tokens.stylex";

import { fontWeights } from "@repo/tailwind-compat/tokens.stylex";

import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  scrambleDefault: {
    fontSize: "2em",
    lineHeight: 1,
    fontWeight: fontWeights.normal,
    color: theme.foregroundHighlighted,
  },
});

export type AnimateSectionProps<C> = {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  as?: C;
};

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

const GLYPHS =
  "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ0123456789±!@#$%^&*()_+ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const getRandomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "";

const generateChars = (text: string) =>
  text.split("").map(() => ({
    char1: getRandomGlyph(),
    char2: getRandomGlyph(),
    char3: getRandomGlyph(),
  }));

type ScrambleTextProps = {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span";
  trigger?: "load" | "hover" | "both";
} & React.HTMLAttributes<HTMLElement>;

export const ScrambleText = ({
  children,
  className = stylex.props(styles.scrambleDefault).className,
  as: Element = "h1",
  trigger = "load",
  ...props
}: ScrambleTextProps) => {
  const text = children;
  const chars = generateChars(text);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (trigger === "load") return;
    const span = e.currentTarget.querySelector<HTMLSpanElement>("[data-scramble]");
    if (!span) return;

    // Update CSS vars with new random chars
    span.querySelectorAll<HTMLSpanElement>("span[data-char]").forEach((el) => {
      el.style.setProperty("--char-1", `"${getRandomGlyph()}"`);
      el.style.setProperty("--char-2", `"${getRandomGlyph()}"`);
      el.style.setProperty("--char-3", `"${getRandomGlyph()}"`);
    });

    // Restart animation by removing and re-adding class
    span.classList.remove("scramble");
    void span.offsetWidth; // Force reflow
    span.classList.add("scramble");
  };

  return (
    <Element className={className} onMouseEnter={handleMouseEnter} {...props}>
      <span data-scramble className={trigger !== "hover" ? "scramble" : ""} aria-hidden>
        {text.split("").map((char, index) => {
          // SAFETY: CSS custom properties are valid inline styles, but
          // React.CSSProperties has no index signature for `--*` keys; the
          // object holds nothing else.
          const charStyle = {
            "--index": index,
            "--char-1": `"${chars[index]?.char1}"`,
            "--char-2": `"${chars[index]?.char2}"`,
            "--char-3": `"${chars[index]?.char3}"`,
          } as React.CSSProperties;
          return (
            <span key={index} data-char={char} style={charStyle}>
              {char}
            </span>
          );
        })}
      </span>
      <span {...stylex.props(a11y.srOnly)}>{text}</span>
    </Element>
  );
};
