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

const SIZE = 196;
const CENTER = SIZE / 2;
const HUB = 38;
const ORBIT = (HUB + CENTER) / 2;
const PIECE = 24;
const SPAN = 360 / THEMES.length;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

const on = (radius: number, angle: number) =>
  point(CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle));

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

const EDGE = 12;

const liftOver = (toggle: HTMLElement | null) => {
  if (!toggle) {
    return 0;
  }

  const { bottom, top } = toggle.getBoundingClientRect();

  return Math.max(0, (top + bottom) / 2 + CENTER + EDGE - window.innerHeight);
};

interface WedgesProps {
  theme: ThemeId;
  own: Mode;
  still: boolean;
  keyed: RefObject<boolean>;
  light: (id: ThemeId, under: boolean) => void;
}

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
        <svg className="theme-bloom-face" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <path d={d} />
        </svg>
        <span className="theme-bloom-piece" style={{ left, top }}>
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
    <Menu.Root open={open} modal={false} highlightItemOnHover={false} onOpenChange={onOpenChange}>
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
