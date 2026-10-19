"use client";

import { createRandom, hashString } from "@/app/showcase/_components/city/random";
import { scrambleGlyphs } from "@/lib/zhuyin";

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

// The first scramble's glyphs roll from the text itself (a generator seeded by
// the text and the letter), so the server and the browser draw the same ones.
const seededRoll = (text: string, index: number) => {
  const random = createRandom(hashString(`${text}:${index}`));
  // Nearby seeds start close together; a few draws pull them apart.
  for (let draw = 0; draw < 3; draw += 1) {
    random.next();
  }
  return random.next;
};

const glyphVars = (glyphs: string[]) =>
  Object.fromEntries(glyphs.map((glyph, frame) => [`--char-${frame + 1}`, `"${glyph}"`]));

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

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (trigger === "load") {
      return;
    }
    const span = e.currentTarget.querySelector<HTMLSpanElement>("[data-scramble]");
    if (!span) {
      return;
    }

    // Roll new glyphs for this pass
    for (const [index, el] of span.querySelectorAll<HTMLSpanElement>("span[data-char]").entries()) {
      for (const [name, value] of Object.entries(
        glyphVars(scrambleGlyphs(text, index, Math.random)),
      )) {
        el.style.setProperty(name, value);
      }
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
            ...glyphVars(scrambleGlyphs(text, index, seededRoll(text, index))),
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
