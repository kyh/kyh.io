"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import type { Bulb } from "./lights";
import { themeOf } from "./index";
import { bulbsOf, HOOK, PHASES, SAG, SPAN, SPANS, wirePath } from "./lights";
import { useTheme } from "./store";

const WIRE = wirePath();
const BULBS = bulbsOf();
const WIDTH = SPAN * SPANS;
const HEIGHT = HOOK + SAG + 16;
const DRAWS_ITS_OWN = new Set(["/showcase"]);
const BULB = "M0 3C-3.4 3-3.9 6.6-3.2 9.2-2.6 11.6-1.3 14 0 14s2.6-2.4 3.2-4.8C3.9 6.6 3.4 3 0 3Z";
const BULB_SHADE = "M0 3c3.4 0 3.9 3.6 3.2 6.2C2.6 11.6 1.3 14 0 14Z";

const LightBulb = ({ bulb }: { bulb: Bulb }) => (
  <g
    transform={`translate(${bulb.x} ${bulb.y}) rotate(${bulb.tilt})`}
    className="light"
    data-color={bulb.color}
  >
    <path d={BULB} className="light-bulb" />
    <path d={BULB_SHADE} className="light-shade" />
    <path d={BULB} className="light-ink" />
    <rect x={-2.2} y={-0.6} width={4.4} height={3.8} rx={0.8} className="light-cap" />
  </g>
);

const Layer = ({ children, phase }: { children: React.ReactNode; phase?: number }) => (
  <svg
    width={WIDTH}
    height={HEIGHT}
    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    className="theme-garland-layer"
    data-phase={phase}
  >
    {children}
  </svg>
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
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const shown = garland !== null && !DRAWS_ITS_OWN.has(pathname);
  usePausedOffscreen(ref, shown);

  if (!shown) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="theme-garland"
      data-garland={garland}
      style={{ height: HEIGHT }}
      aria-hidden="true"
    >
      <Layer>
        <path d={WIRE} className="light-wire" />
      </Layer>
      {Array.from({ length: PHASES }, (_, phase) => (
        <Layer key={phase} phase={phase}>
          {BULBS.filter((bulb) => bulb.phase === phase).map((bulb) => (
            <LightBulb key={`${bulb.x}`} bulb={bulb} />
          ))}
        </Layer>
      ))}
    </div>
  );
};
