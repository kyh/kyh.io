"use client";

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

const pick = (glyphs: string[], roll: number) => glyphs[roll % glyphs.length] ?? "";

const getRandomGlyph = (glyphs: string[]) =>
  pick(glyphs, Math.floor(Math.random() * glyphs.length));

// The first scramble's glyphs come from the text itself (a string hash over the
// text, the letter and the slot), so the server and the browser draw the same ones.
const glyphFor = (text: string, index: number, slot: number) => {
  let hash = 7;
  for (const char of `${text}:${index}:${slot}`) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 2_147_483_647;
  }
  return pick(scrambleChars(text), hash);
};

const generateChars = (text: string) =>
  [...text].map((_, index) => ({
    char1: glyphFor(text, index, 1),
    char2: glyphFor(text, index, 2),
    char3: glyphFor(text, index, 3),
  }));

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
  const chars = generateChars(text);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (trigger === "load") {
      return;
    }
    const span = e.currentTarget.querySelector<HTMLSpanElement>("[data-scramble]");
    if (!span) {
      return;
    }

    // Update CSS vars with new random chars
    const glyphs = scrambleChars(text);
    for (const el of span.querySelectorAll<HTMLSpanElement>("span[data-char]")) {
      el.style.setProperty("--char-1", `"${getRandomGlyph(glyphs)}"`);
      el.style.setProperty("--char-2", `"${getRandomGlyph(glyphs)}"`);
      el.style.setProperty("--char-3", `"${getRandomGlyph(glyphs)}"`);
    }

    // Restart animation by removing and re-adding class; reading offsetWidth
    // forces the reflow that makes the browser notice the removal
    span.classList.remove("scramble");
    void span.offsetWidth;
    span.classList.add("scramble");
  };

  return (
    <Element className={className} onMouseEnter={handleMouseEnter} {...props}>
      <span data-scramble className={trigger === "hover" ? "" : "scramble"} aria-hidden>
        {[...text].map((char, index) => {
          // SAFETY: CSS custom properties are valid inline styles, but
          // React.CSSProperties has no index signature for `--*` keys; the
          // object holds nothing else.
          const charStyle = {
            "--char-1": `"${chars[index]?.char1}"`,
            "--char-2": `"${chars[index]?.char2}"`,
            "--char-3": `"${chars[index]?.char3}"`,
            "--index": index,
          } as React.CSSProperties;
          return (
            <span key={index} data-char={char} style={charStyle}>
              {char}
            </span>
          );
        })}
      </span>
      <span className="sr-only">{text}</span>
    </Element>
  );
};
