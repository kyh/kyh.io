// What a theme is: the config every theme's folder exports from its
// `index.ts` as `theme`, one field per effect, each read where the effect
// happens: the days it runs (the calendar), its light or dark and grey tint
// (the page's paint), its piece and confetti (easter-egg finds), its glyph
// (the theme toggle), what falls across every page (`drift.tsx`), what
// follows the pointer (`trail.tsx`, `ghost.tsx`) and what hangs in the page's corners
// (`corners.tsx`). How the
// showcase's town dresses is the folder's `town.ts` (`Town` in
// city/town-theme.ts), kept apart so the town's drawing code loads only on
// the showcase. A new effect is a field here (or on `Town`), a value in each
// theme, and a read where it shows; a new theme is a folder and a line in
// `index.ts` and `towns.ts`. Pure.
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

/** What falls across every page: snow drifting down, or leaves tumbling. */
export type Drift = "snow" | "leaves";

/** What follows a mouse: the theme's piece let go behind it, or a ghost floating after it. */
export type Trail = "pieces" | "ghost";

/** What hangs in the page's top corners: cobwebs, a spider on each. */
export type Corners = "webs";

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
  /** What an easter-egg find throws, and what falls across the page if the theme has `drift`. */
  art: Art;
  /** Its icon as a line drawing in the 24×24 box, stroked as the dock's other icons are; null (the default theme) wears the sun or moon. */
  glyph: string | null;
  confetti: readonly ConfettiSide[];
  drift: Drift | null;
  /** What follows a mouse about: its pieces (`trail.tsx`) or a ghost (`ghost.tsx`); null, nothing. */
  trail: Trail | null;
  corners: Corners | null;
}

/** Confetti in the site's named colors (lib/color.ts): each name's color, its hue on the back. */
export const namedConfetti = (...names: string[]): ConfettiSide[] =>
  names.map((name) => {
    const look = colorNamed(name) ?? GOLD;
    return { back: look.hue, front: look.color };
  });
