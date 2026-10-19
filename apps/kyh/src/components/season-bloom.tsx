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

// The seasons, blooming out of the theme toggle as a radial menu: a disc that
// springs from the button and turns into place, a wedge per season with its
// piece flying out from the middle, and the hub naming the one under the
// pointer (or in use). Base UI's Menu does the focus, the keys (arrows,
// typing a name) and the dismissing; picking a season keeps the menu open,
// so the page can be tried in each.

/** The disc's size, the hub's and the wedges' outer radius, and how far out each piece sits (px). */
const SIZE = 232;
const CENTER = SIZE / 2;
const HUB = 46;
const RIM = CENTER - 6;
const ORBIT = (HUB + RIM) / 2;
/** A wedge's share of the turn, less a hairline either side (degrees). */
const SPAN = 360 / SEASONS.length;
const GAP = 1.2;
const PIECE = 28;

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const on = (radius: number, angle: number) =>
  point(CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle));

/** Each season's wedge, clockwise from the top: its outline, where its piece sits, and how far that is from the middle. */
const WEDGES = SEASONS.map((_, index) => {
  const middle = radians(-90 + index * SPAN);
  const from = radians(-90 + index * SPAN - SPAN / 2 + GAP);
  const to = radians(-90 + index * SPAN + SPAN / 2 - GAP);
  const dx = ORBIT * Math.cos(middle);
  const dy = ORBIT * Math.sin(middle);
  return {
    clip: `path("M${on(RIM, from)}A${RIM} ${RIM} 0 0 1 ${on(RIM, to)}L${on(HUB, to)}A${HUB} ${HUB} 0 0 0 ${on(HUB, from)}Z")`,
    dx,
    dy,
    left: CENTER + dx - PIECE / 2,
    top: CENTER + dy - PIECE / 2,
  };
});

const BLOOM = { damping: 30, mass: 0.9, stiffness: 320, type: "spring" } as const;
const FLY = { damping: 26, stiffness: 420, type: "spring" } as const;

interface SeasonBloomProps {
  /** The theme toggle it blooms out of and returns focus to. */
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean, event: Event | undefined) => void;
}

export const SeasonBloom = ({ anchor, open, onOpenChange }: SeasonBloomProps) => {
  const season = useSeason();
  const still = useReducedMotion() ?? false;
  /** The season under the pointer or keyboard, named in the hub. */
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
            <Menu.Positioner
              anchor={anchor}
              side="top"
              sideOffset={14}
              collisionPadding={16}
              className="z-20 outline-none"
            >
              <Menu.Popup
                aria-label="Theme"
                className="season-bloom"
                finalFocus={anchor}
                style={{ height: SIZE, width: SIZE }}
                render={
                  <motion.div
                    initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.25 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={still ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                    transition={still ? { duration: 0.15 } : BLOOM}
                  />
                }
              >
                <motion.div
                  className="absolute inset-0"
                  initial={still ? false : { rotate: -50 }}
                  animate={{ rotate: 0 }}
                  transition={BLOOM}
                >
                  <Menu.RadioGroup
                    value={season}
                    onValueChange={(id: SeasonId) => chooseSeason(id)}
                  >
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
                          >
                            <motion.span
                              className="season-bloom-piece"
                              style={{ left: wedge.left, top: wedge.top }}
                              initial={
                                still
                                  ? { opacity: 0 }
                                  : { opacity: 0, scale: 0.3, x: -wedge.dx, y: -wedge.dy }
                              }
                              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                              transition={{ ...FLY, delay: still ? 0 : 0.04 + index * 0.025 }}
                            >
                              <PieceIcon art={each.art} className="size-full" />
                            </motion.span>
                          </Menu.RadioItem>
                        )
                      );
                    })}
                  </Menu.RadioGroup>
                </motion.div>
                <span className="season-bloom-hub" style={{ inset: CENTER - HUB + 4 }}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={name}
                      initial={{ opacity: 0, y: still ? 0 : 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: still ? 0 : -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {name}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        )}
      </AnimatePresence>
    </Menu.Root>
  );
};
