"use client";

import type { RefObject } from "react";
import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { point } from "@/seasons/art";
import { PieceIcon } from "@/seasons/piece";
import type { SeasonId } from "@/seasons/seasons";
import { seasonOf, SEASONS } from "@/seasons/seasons";
import { chooseSeason, useSeason } from "@/seasons/store";

// The seasons, blooming out of the theme toggle as a radial menu: the toggle
// stays where it is as the hub (showing the season picked), and a wedge per
// season fans out round it over the top, one after another, each with its
// piece, the name of the one under the pointer above them. Base UI's Menu
// does the focus, the keys (arrows, typing a name) and the dismissing;
// picking a season keeps the menu open, so the page can be tried in each.

/** The wedges' inner and outer radius, and how far out each piece sits (px), round the toggle's middle. */
const INNER = 42;
const OUTER = 120;
const ORBIT = (INNER + OUTER) / 2 + 1;
const SIZE = OUTER * 2;
const CENTER = OUTER;
/** How much of the turn the wedges fan over, centered on straight up, and each one's share less a hairline (degrees). */
const ARC = 220;
const SPAN = ARC / SEASONS.length;
const GAP = 1;
const PIECE = 26;

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const on = (radius: number, angle: number) =>
  point(CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle));

/** Each season's wedge, left to right over the top: its outline and where its piece sits. */
const WEDGES = SEASONS.map((_, index) => {
  const start = -90 - ARC / 2 + index * SPAN;
  const middle = radians(start + SPAN / 2);
  const from = radians(start + GAP);
  const to = radians(start + SPAN - GAP);
  const d = `M${on(OUTER, from)}A${OUTER} ${OUTER} 0 0 1 ${on(OUTER, to)}L${on(INNER, to)}A${INNER} ${INNER} 0 0 0 ${on(INNER, from)}Z`;
  return {
    clip: `path("${d}")`,
    d,
    left: CENTER + ORBIT * Math.cos(middle) - PIECE / 2,
    top: CENTER + ORBIT * Math.sin(middle) - PIECE / 2,
  };
});

const UNFOLD = { damping: 24, stiffness: 380, type: "spring" } as const;

interface SeasonBloomProps {
  /** The theme toggle it blooms round and returns focus to. */
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean, event: Event | undefined) => void;
}

export const SeasonBloom = ({ anchor, open, onOpenChange }: SeasonBloomProps) => {
  const season = useSeason();
  const still = useReducedMotion() ?? false;
  /** The season under the pointer or keyboard, named over the wedges. */
  const [lit, setLit] = useState<SeasonId | null>(null);
  const { name } = seasonOf(lit ?? season);
  return (
    <Menu.Root
      open={open}
      modal={false}
      onOpenChange={(next, { event }) => onOpenChange(next, event)}
    >
      <AnimatePresence>
        {open && (
          <Menu.Portal keepMounted>
            {/* Centered on the toggle, whatever the dock has made of its size. */}
            <Menu.Positioner
              anchor={anchor}
              positionMethod="fixed"
              side="top"
              sideOffset={({ anchor: toggle, positioner }) =>
                -(toggle.height + positioner.height) / 2
              }
              collisionAvoidance={{ align: "none", fallbackAxisSide: "none", side: "none" }}
              className="pointer-events-none z-20 outline-none"
            >
              <Menu.Popup
                aria-label="Theme"
                className="season-bloom"
                finalFocus={anchor}
                style={{ height: SIZE, width: SIZE }}
                render={
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={still ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.18 }}
                  />
                }
              >
                <Menu.RadioGroup value={season} onValueChange={(id: SeasonId) => chooseSeason(id)}>
                  {SEASONS.map((each, index) => {
                    const wedge = WEDGES[index];
                    return (
                      wedge && (
                        <Menu.RadioItem
                          key={each.id}
                          value={each.id}
                          label={each.name}
                          aria-label={each.name}
                          className="season-bloom-wedge"
                          style={{ clipPath: wedge.clip }}
                          onFocus={() => setLit(each.id)}
                          onBlur={() => setLit(null)}
                          render={
                            <motion.div
                              initial={
                                still ? { opacity: 0 } : { opacity: 0, rotate: -24, scale: 0.45 }
                              }
                              animate={{ opacity: 1, rotate: 0, scale: 1 }}
                              transition={
                                still ? { duration: 0.15 } : { ...UNFOLD, delay: index * 0.03 }
                              }
                            />
                          }
                        >
                          {/* Its face and edge: the clip leaves the inner half of the stroke, a hairline. */}
                          <svg
                            className="season-bloom-face"
                            viewBox={`0 0 ${SIZE} ${SIZE}`}
                            aria-hidden="true"
                          >
                            <path d={wedge.d} />
                          </svg>
                          <span
                            className="season-bloom-piece"
                            style={{ left: wedge.left, top: wedge.top }}
                          >
                            <PieceIcon art={each.art} className="size-full" />
                          </span>
                        </Menu.RadioItem>
                      )
                    );
                  })}
                </Menu.RadioGroup>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={name}
                    className="season-bloom-name"
                    initial={{ opacity: 0, y: still ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: still ? 0 : -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {name}
                  </motion.span>
                </AnimatePresence>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        )}
      </AnimatePresence>
    </Menu.Root>
  );
};
