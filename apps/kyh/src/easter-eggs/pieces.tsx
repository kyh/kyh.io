"use client";

// What each theme (`themes.ts`) throws, drawn in a 24×24 box that the burst
// flies home: its gradients, made once over the page under an id, and the
// piece that fills from them. Keyed by theme, so every theme has one.
import type { ReactNode } from "react";
import { motion } from "motion/react";

import { GOLD } from "@/lib/color";
import type { EggThemeId } from "./themes";

interface PieceArt {
  /** Gradients, ids starting `id`. */
  defs: (id: string) => ReactNode;
  piece: (id: string) => ReactNode;
}

/** The shadowed side of a golden egg. */
const DEEP_GOLD = "hsl(34, 90%, 30%)";
const EGG = "M12 2C8 2 4.5 8.5 4.5 14a7.5 7.5 0 0 0 15 0C19.5 8.5 16 2 12 2Z";

const egg: PieceArt = {
  defs: (id) => (
    <>
      <radialGradient id={id} cx="0.38" cy="0.34" r="0.75">
        <stop offset="0" stopColor="#fffbe8" />
        <stop offset="0.3" stopColor={GOLD.hue} />
        <stop offset="0.75" stopColor={GOLD.color} />
        <stop offset="1" stopColor={DEEP_GOLD} />
      </radialGradient>
      {/* Light bounced back up into the shadowed underside. */}
      <radialGradient id={`${id}-rim`} cx="0.6" cy="1.05" r="0.45">
        <stop offset="0" stopColor={GOLD.hue} stopOpacity="0.55" />
        <stop offset="1" stopColor={GOLD.hue} stopOpacity="0" />
      </radialGradient>
    </>
  ),
  // Lit from the top left: a deep rim, a body, and a gloss.
  piece: (id) => (
    <>
      <path d={EGG} fill="black" opacity="0.2" transform="translate(0 1.5)" />
      <path d={EGG} fill={`url(#${id})`} stroke={DEEP_GOLD} strokeWidth="0.75" />
      <path d={EGG} fill={`url(#${id}-rim)`} />
      <ellipse
        cx="9.4"
        cy="8.6"
        rx="1.9"
        ry="3"
        fill="white"
        opacity="0.85"
        transform="rotate(-24 9.4 8.6)"
      />
    </>
  ),
};

const WINGS =
  "M12 11C10 8.5 6 7 1.5 8.5c1.5 1 1.7 2.5 1.3 4.3 1.4-.8 2.8-.5 3.5.8 1-1 2.5-.8 3.3.4.8-1 1.6-1 2.4-.5ZM12 11c2-2.5 6-4 10.5-2.5-1.5 1-1.7 2.5-1.3 4.3-1.4-.8-2.8-.5-3.5.8-1-1-2.5-.8-3.3.4-.8-1-1.6-1-2.4-.5Z";
const HEAD = "M10.4 8.8 10.6 6l1 1.8h.8l1-1.8.2 2.8a2 2 0 1 1-3.2 0Z";
const NIGHT = "hsl(270, 30%, 8%)";
/** A moonlit edge, so a bat still shows against the night. */
const MOONLIT = "hsl(270, 45%, 78%)";
const EYES = "hsl(30, 100%, 60%)";

const bat: PieceArt = {
  defs: (id) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="hsl(270, 22%, 28%)" />
      <stop offset="1" stopColor={NIGHT} />
    </linearGradient>
  ),
  // Wings that beat from the shoulders, a body, and two lit eyes.
  piece: (id) => (
    <>
      <motion.g
        style={{ originY: 0.25 }}
        animate={{ scaleY: [1, 0.3, 1] }}
        transition={{ duration: 0.24, ease: "easeInOut", repeat: Infinity }}
      >
        <path d={WINGS} fill="black" opacity="0.2" transform="translate(0 1.5)" />
        <path d={WINGS} fill={`url(#${id})`} stroke={MOONLIT} strokeWidth="0.6" />
      </motion.g>
      <g stroke={MOONLIT} strokeWidth="0.6" paintOrder="stroke">
        <ellipse cx="12" cy="13.4" rx="2.1" ry="3.4" fill={`url(#${id})`} />
        <path d={HEAD} fill={`url(#${id})`} />
      </g>
      <circle cx="11.25" cy="9.9" r="0.5" fill={EYES} />
      <circle cx="12.75" cy="9.9" r="0.5" fill={EYES} />
    </>
  ),
};

export const PIECES: Record<EggThemeId, PieceArt> = { bats: bat, eggs: egg };
