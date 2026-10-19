"use client";

// The season's piece drifting over the showcase's town: snow falling, lanterns
// rising, bats flitting across. Each piece is CSS-animated (global.css), so
// the drift costs the compositor and not the page; a season without a drift,
// or a visitor who'd rather not see motion, gets none.
import { useReducedMotion } from "motion/react";

import { PieceDefs, PieceLayers, usePieceId } from "./piece";
import { seasonOf } from "./seasons";
import { useSeason } from "./store";

const PIECES = 14;

// Where each piece drifts, how big, how fast and how far it sways: seeded, so
// it's the same every visit.
const LAYOUT = (() => {
  let state = 7;
  const random = () => {
    state = (state * 16_807) % 2_147_483_647;
    return state / 2_147_483_647;
  };
  return Array.from({ length: PIECES }, () => {
    const duration = 10 + random() * 9;
    return {
      // A negative delay starts each piece partway along, so the town opens mid-drift.
      delay: -random() * duration,
      duration,
      size: 14 + random() * 14,
      sway: 10 + random() * 26,
      x: random() * 100,
    };
  });
})();

export const SeasonDrift = () => {
  const { art, drift } = seasonOf(useSeason());
  const still = useReducedMotion();
  const id = usePieceId();
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
      {LAYOUT.map(({ delay, duration, size, sway, x }, index) => {
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
            <svg viewBox="0 0 24 24" className="season-drift-sway">
              <PieceLayers art={art} id={id} />
            </svg>
          </span>
        );
      })}
    </div>
  );
};
