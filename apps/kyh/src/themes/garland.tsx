"use client";

import { useEffect, useRef } from "react";

import { themeOf } from "./index";
import { bulbsOf, HOOK, SAG, SPAN, SPANS, wirePath } from "./lights";
import { useTheme } from "./store";

const WIRE = wirePath();
const BULBS = bulbsOf();
const HEIGHT = HOOK + SAG + 16;

const Bulb = ({ bulb }: { bulb: (typeof BULBS)[number] }) => (
  <g
    transform={`translate(${bulb.x} ${bulb.y}) rotate(${bulb.tilt})`}
    className="light"
    data-color={bulb.color}
    style={
      {
        "--light-delay": `${bulb.delay}s`,
        "--light-period": `${bulb.period}s`,
      } as React.CSSProperties
    }
  >
    <circle cy={8.5} r={8} className="light-glow" />
    <rect x={-2.2} y={-0.6} width={4.4} height={3.8} rx={0.8} className="light-cap" />
    <path
      d="M0 3C-3.4 3-3.9 6.6-3.2 9.2-2.6 11.6-1.3 14 0 14s2.6-2.4 3.2-4.8C3.9 6.6 3.4 3 0 3Z"
      className="light-bulb"
    />
  </g>
);

const usePausedOffscreen = (garland: React.RefObject<HTMLDivElement | null>, shown: boolean) => {
  useEffect(() => {
    const element = garland.current;

    if (!shown || !element) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      element.toggleAttribute("data-offscreen", entry?.isIntersecting === false);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [garland, shown]);
};

export const ThemeGarland = () => {
  const { garland } = themeOf(useTheme());
  const ref = useRef<HTMLDivElement>(null);
  usePausedOffscreen(ref, garland !== null);

  if (garland === null) {
    return null;
  }

  return (
    <div ref={ref} className="theme-garland" data-garland={garland} aria-hidden="true">
      <svg
        width={SPAN * SPANS}
        height={HEIGHT}
        viewBox={`0 0 ${SPAN * SPANS} ${HEIGHT}`}
        className="block overflow-visible"
      >
        <path d={WIRE} className="light-wire" />
        {BULBS.map((bulb, index) => (
          <Bulb key={index} bulb={bulb} />
        ))}
      </svg>
    </div>
  );
};
