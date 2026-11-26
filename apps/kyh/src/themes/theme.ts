import { colorNamed, GOLD } from "@/lib/color";
import type { Art } from "./art";
import type { Window } from "./calendar";

/** The site's greys turned to a hue (OKLCH degrees), their chroma a multiple of slate's own. */
export interface GreyTint {
  hue: number;
  chroma: number;
}

/** The site's two color schemes, which every theme is one of. */
export type Mode = "light" | "dark";

/** How what falls across every page falls: snow drifting down, or leaves fluttering and tumbling. */
export type Drift = "snow" | "leaves";

/** What falls across every page, and the pieces it's made of, mixed (`drift.tsx`). */
export interface Fall {
  kind: Drift;
  pieces: readonly Art[];
}

/** What hangs in the page's top corners: cobwebs, a spider on each. */
export type Corners = "webs";

/** What's strung along the top of the page: Christmas lights, twinkling. */
export type Garland = "lights";

/** What goes off behind every page: fireworks, bursting and falling. */
export type Sky = "fireworks";

/** One side of a bit of confetti and its flip side. */
export interface ConfettiSide {
  front: string;
  back: string;
}

export interface Theme {
  id: string;
  /** In the themes menu (to assistive tech and typing). */
  name: string;
  /** The days it runs in a year; the default theme has none, and runs when no other does. */
  days?: (year: number) => Window | null;
  /** Light or dark, whatever the visitor's own is; null (the default theme) keeps theirs. */
  mode: Mode | null;
  /** Null keeps the site's own slate. */
  tint: GreyTint | null;
  /** What an easter-egg find throws. */
  art: Art;
  /** Its icon as a line drawing in the 24×24 box, stroked as the dock's other icons are; null (the default theme) wears the sun or moon. */
  glyph: string | null;
  confetti: readonly ConfettiSide[];
  drift: Fall | null;
  corners: Corners | null;
  garland: Garland | null;
  sky: Sky | null;
}

/** Confetti in the site's named colors (lib/color.ts): each name's color, its hue on the back. */
export const namedConfetti = (...names: string[]) =>
  names.map((name) => {
    const look = colorNamed(name) ?? GOLD;

    return { back: look.hue, front: look.color };
  });
