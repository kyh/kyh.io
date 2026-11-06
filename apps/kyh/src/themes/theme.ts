// What a theme is, in two parts. Its `theme` (`index.ts`) is what every page
// needs at once, for every theme, to know which one runs and to paint it
// before first paint: the days it runs (the calendar), its light or dark and
// grey tint (the page's paint), its name (the themes menu) and its glyph (the
// theme toggle). Its `dress` (`dress.ts`, listed in `dresses.ts`) is what it
// puts on: its piece and confetti (easter-egg finds), what falls across every
// page (`drift.tsx`) and what hangs in the page's corners (`corners.tsx`);
// each loads lazily, only for the theme that's on or once the themes menu is
// near. Two more things a theme has are kept apart, each in its folder and
// listed by theme, so their code loads only where it shows: how the
// showcase's town dresses (`town.ts`, listed in `towns.ts`), and what follows
// the mouse about (`follower.tsx`, listed in `followers.ts`). A new effect is
// a field on `Dress` (or `Theme`, if it must show before first paint, or
// `Town`), a value in each theme, and a read where it shows; a new theme is a
// folder and a line in `index.ts`, `dresses.ts`, `towns.ts` and
// `followers.ts`. Pure.
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
  /** Its icon as a line drawing in the 24×24 box, stroked as the dock's other icons are; null (the default theme) wears the sun or moon. */
  glyph: string | null;
}

/** What a theme puts on, loaded once it's on (`dresses.ts`). */
export interface Dress {
  /** What an easter-egg find throws, and its piece in the themes menu. */
  art: Art;
  confetti: readonly ConfettiSide[];
  drift: Fall | null;
  corners: Corners | null;
}

/** Confetti in the site's named colors (lib/color.ts): each name's color, its hue on the back. */
export const namedConfetti = (...names: string[]): ConfettiSide[] =>
  names.map((name) => {
    const look = colorNamed(name) ?? GOLD;
    return { back: look.hue, front: look.color };
  });
