import { forwardRef } from "react";

import styles from "./animate-text.module.css";

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
}: AnimateSectionProps<C>) => {
  const Element = as ?? "div";
  return (
    <div className={styles.section}>
      <Element
        style={{
          animationDelay: `${delay ?? 0}s`,
          animationDuration: `${duration ?? 0.4}s`,
        }}
        className={className}
      >
        {children}
      </Element>
    </div>
  );
};

const GLYPHS =
  "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ0123456789±!@#$%^&*()_+ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type ScrambleTextProps = React.HTMLAttributes<HTMLHeadingElement>;

export const ScrambleText = forwardRef<HTMLHeadingElement, ScrambleTextProps>(
  ({ children, className = "", ...props }, ref) => {
    const text = children?.toString() ?? "";
    return (
      <h1 className={className} ref={ref} {...props}>
        <span className={styles.scramble} aria-hidden>
          {text.split("").map((char, index) => (
            <span
              key={index}
              data-char={char}
              style={
                {
                  "--index": index,
                  "--char-1": `"${
                    GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
                  }"`,
                  "--char-2": `"${
                    GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
                  }"`,
                  "--char-3": `"${
                    GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
                  }"`,
                } as React.CSSProperties
              }
            >
              {char}
            </span>
          ))}
        </span>
        <span className="sr-only">{text}</span>
      </h1>
    );
  },
);
ScrambleText.displayName = "ScrambleText";
