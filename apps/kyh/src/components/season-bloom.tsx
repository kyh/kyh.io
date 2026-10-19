"use client";

import type { RefObject } from "react";
import { useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ThemeIcon } from "@/components/theme-toggle";
import { point } from "@/seasons/art";
import { DEFAULT_SEASON, seasonOf, SEASONS } from "@/seasons/seasons";
import type { ThemeId } from "@/seasons/store";
import { chooseTheme, themeIdOf, useTheme } from "@/seasons/store";

// The themes, blooming over the theme toggle (held down) as a radial menu: a
// solid disc that springs from the button, a wedge per theme unfolding round
// it one after another, and a hub wearing the one under the pointer (or in
// use), its name over the top. Base UI's Menu does the focus, the keys
// (arrows, typing a name) and the dismissing; picking a theme closes it.

/** The themes round the ring, clockwise from the top: plain light and dark, then each season. */
const RING: readonly { id: ThemeId; name: string }[] = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  ...SEASONS.filter(({ id }) => id !== DEFAULT_SEASON).map(({ id, name }) => ({ id, name })),
];

/** The disc's size, the hub's radius, and how far out each theme's icon sits (px). */
const SIZE = 196;
const CENTER = SIZE / 2;
const HUB = 38;
const ORBIT = (HUB + CENTER) / 2;
const PIECE = 24;
const SPAN = 360 / RING.length;

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const on = (radius: number, angle: number) =>
  point(CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle));

/** Each theme's wedge, edge to edge round the hub: its outline and where its icon sits. */
const WEDGES = RING.map((_, index) => {
  const start = radians(-90 - SPAN / 2 + index * SPAN);
  const end = start + radians(SPAN);
  const middle = start + radians(SPAN / 2);
  const d = `M${on(CENTER, start)}A${CENTER} ${CENTER} 0 0 1 ${on(CENTER, end)}L${on(HUB, end)}A${HUB} ${HUB} 0 0 0 ${on(HUB, start)}Z`;
  return {
    clip: `path("${d}")`,
    d,
    left: CENTER + ORBIT * Math.cos(middle) - PIECE / 2,
    top: CENTER + ORBIT * Math.sin(middle) - PIECE / 2,
  };
});

const POP = { damping: 26, stiffness: 380, type: "spring" } as const;

/** The least room the disc keeps from the screen's edges (px). */
const EDGE = 12;

/**
 * How far above the toggle's middle the disc's must sit to stay on screen:
 * centered on it where there's room, nudged up off the bottom where not.
 */
const liftOver = (toggle: HTMLElement | null) => {
  if (!toggle) {
    return 0;
  }
  const { bottom, top } = toggle.getBoundingClientRect();
  return Math.max(0, (top + bottom) / 2 + CENTER + EDGE - window.innerHeight);
};

const nameOf = (id: ThemeId) =>
  RING.find((theme) => theme.id === id)?.name ?? seasonOf(DEFAULT_SEASON).name;

interface SeasonBloomProps {
  /** The theme toggle it blooms over and returns focus to. */
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean, event: Event | undefined) => void;
}

export const SeasonBloom = ({ anchor, open, onOpenChange }: SeasonBloomProps) => {
  const current = themeIdOf(useTheme());
  const still = useReducedMotion() ?? false;
  /** The theme under the pointer or keyboard, shown in the hub. */
  const [lit, setLit] = useState<ThemeId | null>(null);
  const shown = lit ?? current;
  /** Whether the keyboard is what's moving through the themes, so its focus is the visitor's doing. */
  const keyed = useRef(false);
  return (
    <Menu.Root
      open={open}
      modal={false}
      // Hover is CSS's, for a real pointer: highlighting on mouse events would light the
      // wedge the browser's after-touch mouse events land on when the finger lifts.
      highlightItemOnHover={false}
      onOpenChange={(next, { event }) => onOpenChange(next, event)}
    >
      <AnimatePresence>
        {open && (
          <Menu.Portal keepMounted>
            <Menu.Positioner
              anchor={anchor}
              positionMethod="fixed"
              side="top"
              sideOffset={({ anchor: toggle, positioner }) =>
                liftOver(anchor.current) - (toggle.height + positioner.height) / 2
              }
              collisionPadding={EDGE}
              collisionAvoidance={{ align: "shift", fallbackAxisSide: "none", side: "none" }}
              className="z-20 outline-none"
            >
              <Menu.Popup
                aria-label="Theme"
                className="season-bloom"
                onKeyDown={() => {
                  keyed.current = true;
                }}
                onPointerDown={() => {
                  keyed.current = false;
                }}
                finalFocus={anchor}
                style={{ height: SIZE, width: SIZE }}
                render={
                  <motion.div
                    initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={still ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                    transition={still ? { duration: 0.15 } : POP}
                  />
                }
              >
                <Menu.RadioGroup value={current} onValueChange={(id: ThemeId) => chooseTheme(id)}>
                  {RING.map(({ id, name }, index) => {
                    const wedge = WEDGES[index];
                    return (
                      wedge && (
                        <Menu.RadioItem
                          key={id}
                          value={id}
                          label={name}
                          aria-label={name}
                          closeOnClick
                          className="season-bloom-wedge"
                          style={{ clipPath: wedge.clip }}
                          // Shown in the hub: the theme a mouse moves onto, or the keyboard's.
                          // Not one that merely opened under a still pointer, or that Base UI
                          // focuses on opening: neither is the visitor's doing.
                          onPointerMove={(event) => {
                            if (event.pointerType === "mouse") {
                              setLit(id);
                            }
                          }}
                          onPointerLeave={() => setLit((was) => (was === id ? null : was))}
                          onFocus={() => {
                            if (keyed.current) {
                              setLit(id);
                            }
                          }}
                          onBlur={() => setLit((was) => (was === id ? null : was))}
                          render={
                            <motion.div
                              initial={
                                still ? { opacity: 0 } : { opacity: 0, rotate: -20, scale: 0.6 }
                              }
                              animate={{ opacity: 1, rotate: 0, scale: 1 }}
                              transition={
                                still ? { duration: 0.15 } : { ...POP, delay: index * 0.025 }
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
                            <ThemeIcon id={id} look="piece" className="block size-full" />
                          </span>
                        </Menu.RadioItem>
                      )
                    );
                  })}
                </Menu.RadioGroup>
                {/* The hub, the toggle's stand-in: wearing the theme, and closing the menu when pressed. */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Close themes"
                  className="season-bloom-hub"
                  style={{ inset: CENTER - HUB }}
                  onClick={(event) => onOpenChange(false, event.nativeEvent)}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={shown}
                      className="block size-8"
                      initial={{ opacity: 0, scale: still ? 1 : 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: still ? 1 : 0.5 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ThemeIcon id={shown} look="glyph" className="block size-full" />
                    </motion.span>
                  </AnimatePresence>
                </button>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={shown}
                    className="season-bloom-name"
                    initial={{ opacity: 0, y: still ? 0 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: still ? 0 : -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {nameOf(shown)}
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
