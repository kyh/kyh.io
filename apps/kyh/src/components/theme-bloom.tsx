"use client";

import type { RefObject } from "react";
import { memo, useCallback, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ThemeIcon } from "@/components/theme-icon";
import type { ThemeId } from "@/themes";
import { THEMES } from "@/themes";
import { point } from "@/themes/art";
import { chooseTheme, useAppearance } from "@/themes/store";
import type { Mode } from "@/themes/theme";

// The themes, blooming over the theme toggle (held down) as a radial menu: a
// solid disc that springs from the button, a wedge per theme unfolding round
// it one after another, and a hub wearing the one under the pointer (or in
// use). Names aren't shown, only given to assistive tech and to typing one.
// Base UI's Menu does the focus, the keys (arrows, typing a name) and the
// dismissing; picking a theme closes it.

/** The disc's size, the hub's radius, and how far out each theme's icon sits (px). */
const SIZE = 196;
const CENTER = SIZE / 2;
const HUB = 38;
const ORBIT = (HUB + CENTER) / 2;
const PIECE = 24;
const SPAN = 360 / THEMES.length;

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const on = (radius: number, angle: number) =>
  point(CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle));

/**
 * The themes round the ring, clockwise from the top (plain light or dark, then
 * each theme), each a wedge edge to edge round the hub: its outline and where
 * its icon sits.
 */
const RING = THEMES.map(({ id, name }, index) => {
  const start = radians(-90 - SPAN / 2 + index * SPAN);
  const end = start + radians(SPAN);
  const middle = start + radians(SPAN / 2);
  const d = `M${on(CENTER, start)}A${CENTER} ${CENTER} 0 0 1 ${on(CENTER, end)}L${on(HUB, end)}A${HUB} ${HUB} 0 0 0 ${on(HUB, start)}Z`;
  return {
    clip: `path("${d}")`,
    d,
    id,
    index,
    left: CENTER + ORBIT * Math.cos(middle) - PIECE / 2,
    name,
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

interface WedgesProps {
  theme: ThemeId;
  /** The visitor's own light or dark, which plain light or dark goes back to. */
  own: Mode;
  still: boolean;
  /** Whether the keyboard is what's moving through the themes, so its focus is the visitor's doing. */
  keyed: RefObject<boolean>;
  /** Lights a theme in the hub as it comes under the pointer or focus, or puts it out as it leaves. */
  light: (id: ThemeId, under: boolean) => void;
}

/** The ring of themes; kept apart from the hub, so lighting one doesn't redraw them all. */
const WedgeRing = ({ theme, own, still, keyed, light }: WedgesProps) => (
  <Menu.RadioGroup value={theme} onValueChange={(id: ThemeId) => chooseTheme(id)}>
    {RING.map(({ clip, d, id, index, left, name, top }) => (
      <Menu.RadioItem
        key={id}
        value={id}
        label={name}
        aria-label={name}
        closeOnClick
        className="theme-bloom-wedge"
        style={{ clipPath: clip }}
        // Shown in the hub: the theme a mouse moves onto, or the keyboard's. Not
        // one that merely opened under a still pointer, or that Base UI focuses
        // on opening: neither is the visitor's doing.
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") {
            light(id, true);
          }
        }}
        onPointerLeave={() => light(id, false)}
        onFocus={() => {
          if (keyed.current) {
            light(id, true);
          }
        }}
        onBlur={() => light(id, false)}
        render={
          <motion.div
            initial={still ? { opacity: 0 } : { opacity: 0, rotate: -20, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            transition={still ? { duration: 0.15 } : { ...POP, delay: index * 0.025 }}
          />
        }
      >
        {/* Its face and edge: the clip leaves the inner half of the stroke, a hairline. */}
        <svg className="theme-bloom-face" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <path d={d} />
        </svg>
        <span className="theme-bloom-piece" style={{ left, top }}>
          {/* Plain light or dark shows the sun or moon it goes back to. */}
          <ThemeIcon appearance={{ mode: own, theme: id }} look="piece" />
        </span>
      </Menu.RadioItem>
    ))}
  </Menu.RadioGroup>
);
const Wedges = memo(WedgeRing);

interface ThemeBloomProps {
  /** The theme toggle it blooms over (covering it, so it can't be pressed while open) and returns focus to. */
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ThemeBloom = ({ anchor, open, onOpenChange }: ThemeBloomProps) => {
  const { own, theme } = useAppearance();
  const still = useReducedMotion() ?? false;
  /** The theme under the pointer or keyboard, shown in the hub. */
  const [lit, setLit] = useState<ThemeId | null>(null);
  const light = useCallback((id: ThemeId, under: boolean) => {
    if (under) {
      setLit(id);
    } else {
      setLit((was) => (was === id ? null : was));
    }
  }, []);
  const shown = lit ?? theme;
  const keyed = useRef(false);
  return (
    <Menu.Root
      open={open}
      modal={false}
      // Hover is CSS's, for a real pointer: highlighting on mouse events would light the
      // wedge the browser's after-touch mouse events land on when the finger lifts.
      highlightItemOnHover={false}
      onOpenChange={onOpenChange}
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
                className="theme-bloom"
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
                <Wedges theme={theme} own={own} still={still} keyed={keyed} light={light} />
                {/* The hub, the toggle's stand-in: wearing the theme, and closing the menu when pressed. */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Close themes"
                  className="theme-bloom-hub"
                  style={{ inset: CENTER - HUB }}
                  onClick={() => onOpenChange(false)}
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
                      {/* Plain light or dark as the visitor has it, which it is or goes back to. */}
                      <ThemeIcon appearance={{ mode: own, theme: shown }} look="glyph" />
                    </motion.span>
                  </AnimatePresence>
                </button>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        )}
      </AnimatePresence>
    </Menu.Root>
  );
};
