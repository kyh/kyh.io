"use client";

import type { RefObject } from "react";
import { Menu } from "@base-ui/react/menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { PieceIcon } from "@/seasons/piece";
import type { SeasonId } from "@/seasons/seasons";
import { SEASONS } from "@/seasons/seasons";
import { chooseSeason, useSeason } from "@/seasons/store";

// The seasons, blooming out of the theme toggle (after beui's Bloom Menu): the
// panel springs out of the button, its grid opens from the middle like an iris,
// and the seasons come up from the center out. Base UI's Menu does the focus,
// the keys and the dismissing; picking a season keeps the menu open, so the
// page can be tried in each.

const COLUMNS = 4;
const ROWS = Math.ceil(SEASONS.length / COLUMNS);
const BLOOM = { damping: 32, mass: 0.9, stiffness: 300, type: "spring" } as const;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** How far a season sits from the grid's middle, so the bloom reaches it in turn. */
const distanceOf = (index: number) =>
  Math.hypot((index % COLUMNS) - (COLUMNS - 1) / 2, Math.floor(index / COLUMNS) - (ROWS - 1) / 2);

interface SeasonBloomProps {
  /** The theme toggle it blooms out of and returns focus to. */
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean, event: Event | undefined) => void;
}

export const SeasonBloom = ({ anchor, open, onOpenChange }: SeasonBloomProps) => {
  const season = useSeason();
  const still = useReducedMotion() ?? false;
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
              sideOffset={20}
              className="z-20 outline-none"
            >
              <Menu.Popup
                aria-label="Theme"
                className="season-bloom"
                finalFocus={anchor}
                render={
                  <motion.div
                    initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.2 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={still ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                    transition={still ? { duration: 0.15 } : BLOOM}
                  />
                }
              >
                <motion.div
                  initial={still ? false : { clipPath: "inset(45% 34% 45% 34%)" }}
                  animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
                  transition={{ delay: still ? 0 : 0.08, duration: 0.45, ease: EASE_OUT }}
                >
                  <Menu.RadioGroup
                    value={season}
                    onValueChange={(id: SeasonId) => chooseSeason(id)}
                    className="season-bloom-grid"
                  >
                    {SEASONS.map((each, index) => (
                      <Menu.RadioItem key={each.id} value={each.id} className="season-bloom-item">
                        <motion.span
                          className="season-bloom-face"
                          initial={
                            still
                              ? { opacity: 0 }
                              : { filter: "blur(6px)", opacity: 0, scale: 0.85 }
                          }
                          animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
                          transition={{
                            damping: 34,
                            delay: still ? 0 : 0.1 + distanceOf(index) * 0.07,
                            stiffness: 440,
                            type: "spring",
                          }}
                        >
                          <PieceIcon art={each.art} className="size-7" />
                          <span className="season-bloom-name">{each.name}</span>
                        </motion.span>
                      </Menu.RadioItem>
                    ))}
                  </Menu.RadioGroup>
                </motion.div>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        )}
      </AnimatePresence>
    </Menu.Root>
  );
};
