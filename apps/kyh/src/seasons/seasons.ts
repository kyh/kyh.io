// The site's seasonal themes, each whole in one entry: the days it runs, how
// it turns the site's greys, the piece an easter-egg find throws (`art.ts`),
// its confetti, and what falls across every page (snow, leaves) if anything.
// The calendar picks one for today, unless the seasons blooming out of the
// theme toggle have (`store.ts`).
// Adding a theme is adding an entry here, and its decorations for the
// showcase's town (city/season-decor.ts, keyed by season so none is missed).
// Pure.
import { colorNamed, GOLD } from "@/lib/color";
import type { Art } from "./art";
import { circle, ellipse, placed, point } from "./art";
import type { Window } from "./calendar";
import { around, dayKey, easterSunday, lunarNewYear, nthWeekday, span } from "./calendar";

/** The site's greys turned to a hue (OKLCH degrees), their chroma a multiple of slate's own. */
export interface GreyTint {
  hue: number;
  chroma: number;
}

/** What falls across every page: snow drifting down, or leaves tumbling. */
export type Drift = "snow" | "leaves";

/** One side of a bit of confetti and its flip side. */
export interface ConfettiSide {
  front: string;
  back: string;
}

export interface Season {
  id: string;
  /** In the seasons menu. */
  name: string;
  /** The days it runs in a year; the default season has none, and runs when no other does. */
  days?: (year: number) => Window | null;
  /** Null keeps the site's own slate. */
  tint: GreyTint | null;
  /** What an easter-egg find throws, and what falls across the page if the season has `drift`. */
  art: Art;
  confetti: readonly ConfettiSide[];
  drift: Drift | null;
}

const named = (...names: string[]): ConfettiSide[] =>
  names.map((name) => {
    const look = colorNamed(name) ?? GOLD;
    return { back: look.hue, front: look.color };
  });

const EGG = "M12 2C8 2 4.5 8.5 4.5 14a7.5 7.5 0 0 0 15 0C19.5 8.5 16 2 12 2Z";
/** Light on an egg's shoulder. */
const GLOSS = ellipse(9.4, 8.6, 1.9, 3, -24);

/** The shadowed side of a golden egg. */
const DEEP_GOLD = "hsl(34, 90%, 30%)";

const GOLDEN_EGG = {
  gradients: {
    body: {
      at: [0.38, 0.34],
      kind: "radial",
      r: 0.75,
      stops: [
        [0, "#fffbe8"],
        [0.3, GOLD.hue],
        [0.75, GOLD.color],
        [1, DEEP_GOLD],
      ],
    },
    // Light bounced back up into the shadowed underside.
    rim: {
      at: [0.6, 1.05],
      kind: "radial",
      r: 0.45,
      stops: [
        [0, GOLD.hue, 0.55],
        [1, GOLD.hue, 0],
      ],
    },
  },
  layers: [
    { d: EGG, gradient: "body", shadow: true, stroke: DEEP_GOLD, strokeWidth: 0.75 },
    { d: EGG, gradient: "rim" },
    { d: GLOSS, fill: "white", opacity: 0.85 },
  ],
} satisfies Art;

const PAINTED_EGG = {
  gradients: {
    body: {
      from: [0, 0],
      kind: "linear",
      stops: [
        [0, "#f6eeff"],
        [1, "#c6a3f0"],
      ],
      to: [0, 1],
    },
  },
  layers: [
    { d: EGG, gradient: "body", shadow: true, stroke: "#9b7cc8", strokeWidth: 0.6 },
    { d: `${circle(9, 8.4, 0.8)}${circle(12, 8, 0.8)}${circle(15, 8.4, 0.8)}`, fill: "#ff8fbb" },
    {
      d: "M5.2 13l1.7-1.6 1.7 1.6 1.7-1.6 1.7 1.6 1.7-1.6 1.7 1.6 1.7-1.6 1.7 1.6",
      stroke: "#f5c400",
      strokeWidth: 1.2,
    },
    { d: "M5.6 16.6h12.8", stroke: "#4fcf9f", strokeWidth: 1.1 },
    { d: GLOSS, fill: "white", opacity: 0.7 },
  ],
} satisfies Art;

const NIGHT = "hsl(270, 30%, 8%)";
/** A faint moonlit edge, so a bat still shows against the night. */
const MOONLIT = "hsl(270 45% 78% / 0.75)";

/**
 * A bat's wing on one side (-1 left, 1 right), `x` measured out from the
 * body: a curved leading edge out to a pointed tip, and a trailing edge
 * scalloped between the fingers. It beats about its shoulder, high above
 * the body and then just below it.
 */
const batWing = (side: -1 | 1) => {
  const at = (x: number, y: number) => point(12 + side * x, y);
  return {
    d: `M${at(1.1, 10.2)}C${at(2.4, 8.6)} ${at(4.2, 7.4)} ${at(6.4, 7)}C${at(8.6, 7.4)} ${at(10.2, 8.4)} ${at(11.6, 10.9)}Q${at(10.1, 10.2)} ${at(9.2, 12.6)}Q${at(7.5, 11.4)} ${at(6, 13.6)}Q${at(3.8, 12.2)} ${at(1.4, 14.4)}Z`,
    fill: NIGHT,
    stroke: MOONLIT,
    strokeWidth: 0.4,
    swing: { at: [12 + side * 1.2, 11.4], from: side * -32, to: side * 16 },
  } as const;
};

/** The body, and the head and its ears wound the same way so they fill as one. */
const BAT_BODY = `${ellipse(12, 13.2, 1.8, 2.9)}M13.6 9 13.5 6.2l-1.1 1.7h-.8l-1.1-1.7-.1 2.8a1.9 1.9 0 1 0 3.2 0Z`;

// A flat silhouette, after a cartoon bat: ears up, wings beating.
const BAT = {
  layers: [
    batWing(-1),
    batWing(1),
    // Its edge, then the body over it, so the seam where head meets body is hidden.
    { d: BAT_BODY, stroke: MOONLIT, strokeWidth: 0.8 },
    { d: BAT_BODY, fill: NIGHT },
  ],
} satisfies Art;

/** A heart, for a piece or anything else drawn in its 24×24 box. */
export const HEART =
  "M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21Z";

const CANDY_HEART = {
  gradients: {
    body: {
      at: [0.35, 0.3],
      kind: "radial",
      r: 0.8,
      stops: [
        [0, "#ffd6e2"],
        [0.4, "#ff5c8a"],
        [1, "#c2185b"],
      ],
    },
  },
  layers: [
    { d: HEART, gradient: "body", shadow: true, stroke: "#9c1048", strokeWidth: 0.6 },
    { d: ellipse(7.9, 9.6, 1.3, 2.1, -30), fill: "white", opacity: 0.8 },
  ],
} satisfies Art;

// One leaf of three, a heart with its tip at the stem, about the origin.
const LEAF: readonly (readonly [number, number])[] = [
  [0, 0],
  [-1.3, 1.3],
  [-4, 2.4],
  [-4, 4.9],
  [-4, 6.9],
  [-1.8, 7.8],
  [0, 6.2],
  [1.8, 7.8],
  [4, 6.9],
  [4, 4.9],
  [4, 2.4],
  [1.3, 1.3],
  [0, 0],
];
const SHAMROCK_CENTER = [12, 10.6] as const;

const SHAMROCK = {
  gradients: {
    body: {
      at: [0.4, 0.3],
      kind: "radial",
      r: 0.8,
      stops: [
        [0, "#c4f7b4"],
        [0.45, "#3fae4a"],
        [1, "#1d6b2a"],
      ],
    },
  },
  layers: [
    { d: "M12 11c.4 3.4 1.6 6.4 3.6 8.6", shadow: true, stroke: "#1f6b2c", strokeWidth: 1.5 },
    {
      // Up, then down to either side.
      d: [180, -60, 60].map((angle) => placed(LEAF, SHAMROCK_CENTER, angle)).join(""),
      gradient: "body",
      shadow: true,
      stroke: "#155a22",
      strokeWidth: 0.6,
    },
  ],
} satisfies Art;

const LANTERN_GOLD = "#f5c04a";
const LANTERN_GOLD_EDGE = "#a8741a";

const LANTERN = {
  gradients: {
    body: {
      at: [0.4, 0.35],
      kind: "radial",
      r: 0.75,
      stops: [
        [0, "#ffd27a"],
        [0.3, "#ff4a3d"],
        [1, "#a3121b"],
      ],
    },
  },
  layers: [
    { d: "M12 1.8v3.6", stroke: LANTERN_GOLD_EDGE, strokeWidth: 1 },
    {
      d: ellipse(12, 12.6, 7.4, 6),
      gradient: "body",
      shadow: true,
      stroke: "#7a0d14",
      strokeWidth: 0.6,
    },
    {
      d: "M12 6.7v11.8M8.4 7.6c-1.7 3-1.7 7.8 0 10M15.6 7.6c1.7 3 1.7 7.8 0 10",
      opacity: 0.7,
      stroke: "#8f1018",
      strokeWidth: 0.5,
    },
    {
      d: "M9.2 5.2h5.6a.8.8 0 0 1 .8.8v1.2H8.4V6a.8.8 0 0 1 .8-.8ZM8.4 18h7.2v1.2a.8.8 0 0 1-.8.8H9.2a.8.8 0 0 1-.8-.8Z",
      fill: LANTERN_GOLD,
      stroke: LANTERN_GOLD_EDGE,
      strokeWidth: 0.4,
    },
    { d: "M12 20v3M10.8 20.2l-.4 2.4M13.2 20.2l.4 2.4", stroke: "#e2362b", strokeWidth: 0.9 },
  ],
} satisfies Art;

const MAPLE_LEAF = {
  gradients: {
    body: {
      from: [0, 0],
      kind: "linear",
      stops: [
        [0, "#ffb347"],
        [0.55, "#e8590c"],
        [1, "#a61e0d"],
      ],
      to: [1, 1],
    },
  },
  layers: [
    { d: "M12 14v8", stroke: "#7a3b12", strokeWidth: 1.1 },
    {
      d: "M12 2l1.6 4.2 2.8-1.4-.6 4.2 4-1.4-1.2 3.2 3.4 1.6-4.4 2 .8 2.2-5.2-1-.4 2.8h-1.6l-.4-2.8-5.2 1 .8-2.2-4.4-2 3.4-1.6-1.2-3.2 4 1.4-.6-4.2 2.8 1.4Z",
      gradient: "body",
      shadow: true,
      stroke: "#7a2a0a",
      strokeWidth: 0.5,
    },
    {
      d: "M12 15.6V5.5M12 13.4l5.4-2.6M12 13.4 6.6 10.8",
      opacity: 0.55,
      stroke: "#7a2a0a",
      strokeWidth: 0.5,
    },
  ],
} satisfies Art;

// Six arms, each with a pair of branches near the tip and a pair near the middle.
const SNOWFLAKE_PATH = Array.from({ length: 6 }, (_, arm) => {
  const angle = ((arm * 60 - 90) * Math.PI) / 180;
  const along = (reach: number) =>
    [12 + reach * Math.cos(angle), 12 + reach * Math.sin(angle)] as const;
  const branch = (reach: number, length: number) => {
    const [x, y] = along(reach);
    const tip = (side: number) =>
      point(x + length * Math.cos(angle + side * 0.75), y + length * Math.sin(angle + side * 0.75));
    return `M${tip(-1)}L${point(x, y)}L${tip(1)}`;
  };
  return `M12 12L${point(...along(9.5))}${branch(6.4, 2.8)}${branch(3.6, 1.8)}`;
}).join("");

const SNOWFLAKE = {
  layers: [
    { d: SNOWFLAKE_PATH, shadow: true, stroke: "#6d9ccf", strokeWidth: 3 },
    { d: SNOWFLAKE_PATH, stroke: "#ffffff", strokeWidth: 1.4 },
    { d: circle(12, 12, 1.4), fill: "#ffffff", stroke: "#6d9ccf", strokeWidth: 0.6 },
  ],
} satisfies Art;

/** In calendar order; where two overlap, the one listed first runs. */
export const SEASONS = [
  {
    art: GOLDEN_EGG,
    confetti: named("gold", "gold", "crimson", "blue", "green", "plum"),
    drift: null,
    id: "classic",
    name: "Classic",
    tint: null,
  },
  {
    art: LANTERN,
    confetti: [
      { back: "#ff8a80", front: "#e11d2e" },
      { back: "#ff8a80", front: "#e11d2e" },
      ...named("gold", "gold"),
    ],
    // New Year's Eve and the week after it.
    days: (year) => {
      const first = lunarNewYear(year);
      return first === null ? null : around(first, 1, 6);
    },
    drift: null,
    id: "lunarNewYear",
    name: "Lunar New Year",
    tint: { chroma: 2.5, hue: 25 },
  },
  {
    art: CANDY_HEART,
    confetti: [
      { back: "#ffc2d6", front: "#ff4d8d" },
      { back: "#fda4af", front: "#e11d48" },
      { back: "#ffe4ec", front: "#ffffff" },
    ],
    days: (year) => span(year, [2, 10], [2, 14]),
    drift: null,
    id: "valentines",
    name: "Valentine's Day",
    tint: { chroma: 2, hue: 350 },
  },
  {
    art: SHAMROCK,
    confetti: [{ back: "#86efac", front: "#15803d" }, ...named("green", "green", "gold")],
    days: (year) => span(year, [3, 14], [3, 17]),
    drift: null,
    id: "stPatricks",
    name: "St. Patrick's Day",
    tint: { chroma: 2, hue: 140 },
  },
  {
    art: PAINTED_EGG,
    confetti: [
      { back: "#efe3ff", front: "#c4a1f0" },
      { back: "#d6f7ea", front: "#7fdcb8" },
      { back: "#fff3bf", front: "#ffd84d" },
      { back: "#ffe0ec", front: "#ff9fc3" },
      { back: "#dcefff", front: "#8cc8f5" },
    ],
    // Good Friday to Easter Monday.
    days: (year) => around(easterSunday(year), 2, 1),
    drift: null,
    id: "easter",
    name: "Easter",
    tint: { chroma: 1.5, hue: 320 },
  },
  {
    art: BAT,
    confetti: [
      ...named("orange", "orange", "plum", "gold"),
      { back: "hsl(270, 20%, 30%)", front: "hsl(270, 25%, 12%)" },
    ],
    // The week up to Halloween.
    days: (year) => span(year, [10, 25], [10, 31]),
    drift: null,
    id: "halloween",
    name: "Halloween",
    tint: { chroma: 2.5, hue: 295 },
  },
  {
    art: MAPLE_LEAF,
    confetti: [
      { back: "#fcd34d", front: "#b45309" },
      { back: "#fca5a5", front: "#991b1b" },
      ...named("orange", "gold"),
    ],
    // Thanksgiving week, Monday to Sunday.
    days: (year) => around(nthWeekday(year, 11, 4, 4), 3, 3),
    drift: "leaves",
    id: "thanksgiving",
    name: "Thanksgiving",
    tint: { chroma: 2, hue: 60 },
  },
  {
    art: SNOWFLAKE,
    confetti: [
      { back: "#fca5a5", front: "#dc2626" },
      { back: "#86efac", front: "#15803d" },
      { back: "#e0f2fe", front: "#ffffff" },
      ...named("gold"),
    ],
    days: (year) => span(year, [12, 15], [12, 26]),
    drift: "snow",
    id: "christmas",
    name: "Christmas",
    tint: { chroma: 2, hue: 165 },
  },
] as const satisfies readonly Season[];

export type SeasonId = (typeof SEASONS)[number]["id"];

export const DEFAULT_SEASON: SeasonId = "classic";

export const seasonOf = (id: SeasonId): Season =>
  SEASONS.find((season) => season.id === id) ?? SEASONS[0];

/** A season's days in a year, if it has any then. */
export const windowIn = (season: Season, year: number) => season.days?.(year) ?? null;

/** The season the calendar picks for a day: the first whose days it is, else the default. */
export const seasonOn = (date: Date): SeasonId => {
  const key = dayKey(date);
  const year = date.getFullYear();
  // Last year's window too, for one that runs on past December 31st.
  const runs = (season: Season) =>
    [year - 1, year].some((each) => {
      const days = windowIn(season, each);
      return days !== null && key >= days[0] && key <= days[1];
    });
  return SEASONS.find(runs)?.id ?? DEFAULT_SEASON;
};
