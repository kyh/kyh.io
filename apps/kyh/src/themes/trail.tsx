"use client";

// What a mouse leaves behind it in a theme that has a trail: the theme's
// piece (bats at Halloween, snowflakes at Christmas) let go every few pixels
// of travel, each drifting off and fading. A fixed ring of pieces is reused
// round and round, moved and animated straight on the DOM, so a moving
// pointer never renders React. A finger leaves none, and nor does a visitor
// who'd rather not see motion.
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { lastPointer, subscribeToPointer } from "@/lib/pointer";
import { createRandom } from "@/lib/random";
import { useSvgId } from "@/lib/svg-id";
import { PieceDefs, PieceLayers } from "./piece";
import { themeOf } from "./index";
import { useTheme } from "./store";

/** How many pieces are out at once, at most. */
const RING = 16;
/** Pixels of travel between one piece and the next. */
const SPACING = 36;
const SIZE = 28;
const LIFE_MS = 1000;

export const ThemeTrail = () => {
  const { art, trail } = themeOf(useTheme());
  const still = useReducedMotion();
  const id = useSvgId("trail");
  const pieces = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!trail || still) {
      return;
    }
    const random = createRandom(Date.now());
    let from: { x: number; y: number } | null = null;
    let next = 0;
    const flights: Animation[] = [];
    return subscribeToPointer(() => {
      const at = lastPointer();
      if (at?.kind !== "mouse") {
        return;
      }
      if (from !== null && Math.hypot(at.x - from.x, at.y - from.y) < SPACING) {
        return;
      }
      from = { x: at.x, y: at.y };
      const index = next;
      const piece = pieces.current[index];
      next = (next + 1) % RING;
      if (!piece) {
        return;
      }
      // `translate`, not left and top: a move mustn't dirty layout for the next reader of it.
      piece.style.translate = `${at.x - SIZE / 2}px ${at.y - SIZE / 2}px`;
      piece.hidden = false;
      // Off up and to either side, turning a little, as if let go.
      const dx = random.range(-28, 28);
      const dy = random.range(-46, -16);
      const turn = random.range(-30, 30);
      const flight = piece.animate(
        [
          { opacity: 0.95, transform: "translate(0, 0) scale(0.4) rotate(0deg)" },
          { offset: 0.25, opacity: 0.9, transform: "translate(0, 0) scale(1) rotate(0deg)" },
          { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.7) rotate(${turn}deg)` },
        ],
        { duration: LIFE_MS, easing: "ease-out" },
      );
      flights[index] = flight;
      // Hidden between flights, so a bat's wings don't beat on where nobody can see them.
      flight.addEventListener("finish", () => {
        if (flights[index] === flight) {
          piece.hidden = true;
        }
      });
    });
  }, [trail, still]);

  if (!trail || still) {
    return null;
  }
  return (
    <div className="pointer-events-none fixed inset-0 z-[3] overflow-hidden" aria-hidden="true">
      <svg className="absolute size-0">
        <defs>
          <PieceDefs art={art} id={id} />
        </defs>
      </svg>
      {Array.from({ length: RING }, (_, index) => (
        <span
          key={index}
          ref={(piece) => {
            pieces.current[index] = piece;
          }}
          className="absolute top-0 left-0 opacity-0"
          style={{ height: SIZE, width: SIZE }}
          hidden
        >
          <svg viewBox="0 0 24 24" className="block size-full overflow-visible">
            <PieceLayers art={art} id={id} />
          </svg>
        </span>
      ))}
    </div>
  );
};
