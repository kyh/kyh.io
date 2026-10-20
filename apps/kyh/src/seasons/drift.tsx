"use client";

// What falls across every page in a season that has it: snow at Christmas, a
// few flakes drawn and the rest soft dots, and tumbling leaves at
// Thanksgiving. Each piece is CSS-animated (global.css), so the fall costs
// the compositor and not the page; a visitor who'd rather not see motion
// gets none.
import { useReducedMotion } from "motion/react";

import { createRandom } from "@/lib/random";
import { useSvgId } from "@/lib/svg-id";
import type { Drift } from "./seasons";
import { PieceDefs, PieceLayers } from "./piece";
import { seasonOf } from "./seasons";
import { useSeason } from "./store";

interface Piece {
  delay: number;
  duration: number;
  size: number;
  sway: number;
  x: number;
  /** The season's piece drawn, or (snow only) a plain dot. */
  drawn: boolean;
}

// Where each piece falls, how big, how fast and how far it sways: seeded, so
// it's the same every visit.
const layoutOf = (drift: Drift): Piece[] => {
  const random = createRandom(drift === "snow" ? 7 : 11);
  const count = drift === "snow" ? 48 : 16;
  return Array.from({ length: count }, (_, index) => {
    const drawn = drift === "leaves" || index % 5 === 0;
    const duration = drawn ? random.range(11, 19) : random.range(8, 18);
    return {
      // A negative delay starts each piece partway down, so the page opens mid-fall.
      delay: -random.range(0, duration),
      drawn,
      duration,
      size: drawn ? random.range(14, 26) : random.range(3, 7),
      sway: random.range(12, 42),
      x: random.range(0, 100),
    };
  });
};

const LAYOUTS: Record<Drift, Piece[]> = { leaves: layoutOf("leaves"), snow: layoutOf("snow") };

export const SeasonDrift = () => {
  const { art, drift } = seasonOf(useSeason());
  const still = useReducedMotion();
  const id = useSvgId("piece");
  if (drift === null || still) {
    return null;
  }
  return (
    <div className="season-drift" data-drift={drift} aria-hidden="true">
      <svg className="absolute size-0">
        <defs>
          <PieceDefs art={art} id={id} />
        </defs>
      </svg>
      {LAYOUTS[drift].map(({ delay, drawn, duration, size, sway, x }, index) => {
        // SAFETY: CSS custom properties are valid inline styles, but
        // React.CSSProperties has no index signature for `--*` keys; the
        // object holds nothing else.
        const style = {
          "--drift-delay": `${delay}s`,
          "--drift-duration": `${duration}s`,
          "--drift-size": `${size}px`,
          "--drift-sway": `${sway}px`,
          "--drift-x": `${x}%`,
        } as React.CSSProperties;
        return (
          <span key={index} className="season-drift-piece" style={style}>
            {drawn ? (
              <svg viewBox="0 0 24 24" className="season-drift-sway">
                <PieceLayers art={art} id={id} />
              </svg>
            ) : (
              <span className="season-drift-sway season-drift-dot" />
            )}
          </span>
        );
      })}
    </div>
  );
};
