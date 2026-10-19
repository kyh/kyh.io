// Every color in the city, by day (ink on paper, after Inkline Town) and by
// night (pale ink on slate, windows lit). Geometry is batched per token, so a
// theme switch recolors a few dozen materials and rebuilds nothing.
import { contrastOf, FLIP, shadeOf } from "@/lib/brightness";
import type { GreyTint } from "@/seasons/seasons";

export const PALETTE = {
  accentBlue: { day: "#4f78c4", night: "#7aa5ff" },
  accentGreen: { day: "#57a06b", night: "#7fd69a" },
  accentOrange: { day: "#d97757", night: "#ff9a6b" },
  accentPink: { day: "#e58aa6", night: "#ff9ec0" },
  accentPurple: { day: "#8c6bc0", night: "#b394ff" },
  accentRed: { day: "#d9614f", night: "#ff7a66" },
  accentTeal: { day: "#3f9c97", night: "#5fd0c8" },
  accentYellow: { day: "#e9b949", night: "#ffd166" },
  door: { day: "#8f9891", night: "#3a4a4f" },
  festiveGreen: { day: "#3f8f55", night: "#4fae68" },
  festiveGreenShade: { day: "#327447", night: "#3d8c53" },
  festiveRed: { day: "#d93a3a", night: "#ff5a52" },
  festiveRedShade: { day: "#b52d2f", night: "#d9443f" },
  field: { day: "#efe5c4", night: "#2b2a22" },
  fieldGreen: { day: "#dce6c8", night: "#1f2b22" },
  flame: { day: "#f3a64a", night: "#ffb057" },
  glass: { day: "#dbe6ea", night: "#f1c76f" },
  glassDim: { day: "#dbe6ea", night: "#34434b" },
  gold: { day: "#e8b22e", night: "#ffc94a" },
  goldShade: { day: "#c8941c", night: "#d9a636" },
  hay: { day: "#ecd27a", night: "#a08944" },
  hayShade: { day: "#d9bb5c", night: "#857036" },
  hedge: { day: "#c3d2ae", night: "#1f3229" },
  ink: { day: "#3d4943", night: "#a9bab3" },
  inkSoft: { day: "#a3aba4", night: "#4f605a" },
  lamp: { day: "#f6f1dc", night: "#ffe08a" },
  land: { day: "#f1f2ed", night: "#1b252b" },
  lawn: { day: "#e4eadb", night: "#1c2a26" },
  metal: { day: "#ccd1d2", night: "#3a464c" },
  metalDark: { day: "#a9b0b3", night: "#2c363b" },
  navy: { day: "#3d5277", night: "#5a78a8" },
  paving: { day: "#ebede7", night: "#1f292f" },
  pine: { day: "#bfcfb0", night: "#21362d" },
  pineShade: { day: "#a9bd9a", night: "#1a2c25" },
  plate: { day: "#f6f7f3", night: "#212c32" },
  pumpkin: { day: "#f08c2e", night: "#ff9d42" },
  pumpkinShade: { day: "#d6731c", night: "#d97a26" },
  road: { day: "#e2e4de", night: "#263238" },
  roadMark: { day: "#c3c8c0", night: "#46555b" },
  roofBlue: { day: "#c2d0e4", night: "#34425a" },
  roofBlueShade: { day: "#adbed7", night: "#2c384d" },
  roofGray: { day: "#d7dad5", night: "#353e42" },
  roofGrayShade: { day: "#c4c9c2", night: "#2d3539" },
  roofGreen: { day: "#cddcc2", night: "#334637" },
  roofGreenShade: { day: "#b9cbac", night: "#2a3b2e" },
  roofLilac: { day: "#d3c6e2", night: "#433b56" },
  roofLilacShade: { day: "#c0b1d3", night: "#393249" },
  roofPink: { day: "#ecc3bb", night: "#5b3f41" },
  roofPinkShade: { day: "#dcaea5", night: "#4d3537" },
  roofTeal: { day: "#b0d8d3", night: "#2d4947" },
  roofTealShade: { day: "#9bc8c2", night: "#253e3c" },
  roofTerracotta: { day: "#e8c0a4", night: "#55402f" },
  roofTerracottaShade: { day: "#d9ab8c", night: "#473527" },
  roofYellow: { day: "#f2e2b3", night: "#55503a" },
  roofYellowShade: { day: "#e4d19b", night: "#474230" },
  sand: { day: "#f1ead6", night: "#2a2a26" },
  screen: { day: "#3a4642", night: "#0c1214" },
  sea: { day: "#e2e9e6", night: "#0f181d" },
  shore: { day: "#eaf0ed", night: "#142128" },
  signBoard: { day: "#fbfbf8", night: "#26333a" },
  signText: { day: "#3d4943", night: "#ffe7a8" },
  skin: { day: "#e6c2a4", night: "#a88a73" },
  skinDark: { day: "#b88a68", night: "#7c5f4a" },
  soil: { day: "#e3dbc8", night: "#2a2722" },
  stone: { day: "#c9ced1", night: "#6a7780" },
  stoneShade: { day: "#b1b7bb", night: "#56626a" },
  top: { day: "#f7f8f4", night: "#2d3a41" },
  tree: { day: "#cbd8ba", night: "#253a31" },
  treeShade: { day: "#b9c9a6", night: "#1d3029" },
  trunk: { day: "#9a8b78", night: "#3a3229" },
  wallLeft: { day: "#eceee8", night: "#28343b" },
  wallRight: { day: "#dfe2db", night: "#212c32" },
  water: { day: "#d9e6ea", night: "#13232b" },
  wave: { day: "#c4d3cf", night: "#22343c" },
  white: { day: "#fbfbf8", night: "#d9e0dc" },
  /** White turned from the light that stays white by night, for round things a dark wall shade would hole. */
  whiteShade: { day: "#dfe2db", night: "#b2bbb7" },
} as const;

export type Token = keyof typeof PALETTE;
export type Theme = "day" | "night";

/** Which token a face takes, by the way it faces: up, toward +z or toward +x. */
export interface Paint {
  top: Token;
  left: Token;
  right: Token;
}

export const paint = (top: Token, left: Token = top, right: Token = left): Paint => ({
  left,
  right,
  top,
});

export const WALLS = paint("top", "wallLeft", "wallRight");

/** Pastel roofs, each a lit and a shaded slope. */
export const ROOFS = [
  paint("roofPink", "roofPink", "roofPinkShade"),
  paint("roofBlue", "roofBlue", "roofBlueShade"),
  paint("roofGreen", "roofGreen", "roofGreenShade"),
  paint("roofYellow", "roofYellow", "roofYellowShade"),
  paint("roofTeal", "roofTeal", "roofTealShade"),
  paint("roofLilac", "roofLilac", "roofLilacShade"),
  paint("roofTerracotta", "roofTerracotta", "roofTerracottaShade"),
] as const;

export const ROOF_GRAY = paint("roofGray", "roofGray", "roofGrayShade");

/** The tokens painted only on faces turned from the light, which take the shadow dots. */
export const SHADE: ReadonlySet<Token> = new Set<Token>([
  "festiveGreenShade",
  "festiveRedShade",
  "goldShade",
  "hayShade",
  "pineShade",
  "pumpkinShade",
  "roofBlueShade",
  "roofGrayShade",
  "roofGreenShade",
  "roofLilacShade",
  "roofPinkShade",
  "roofTealShade",
  "roofTerracottaShade",
  "roofYellowShade",
  "stoneShade",
  "treeShade",
  "wallRight",
  "whiteShade",
]);

export const ACCENTS = [
  "accentRed",
  "accentBlue",
  "accentGreen",
  "accentYellow",
  "accentPurple",
  "accentTeal",
  "accentPink",
  "accentOrange",
] as const satisfies readonly Token[];

const channels = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [Math.floor(value / 65_536) % 256, Math.floor(value / 256) % 256, value % 256] as const;
};

/** The same color as a grey of equal lightness (Rec. 601 luma, in sRGB). */
export const greyOf = (hex: string) => {
  const [r, g, b] = channels(hex);
  const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const channel = luma.toString(16).padStart(2, "0");
  return `#${channel}${channel}${channel}`;
};

/** How a building's colors are turned toward its project's own. */
export type Tint = (hex: string) => string;

const untinted: Tint = (hex) => hex;

type Lab = readonly [number, number, number];

const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

const toGamma = (channel: number) =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;

/** OKLab, where turning a hue keeps its lightness. */
export const oklab = (hex: string): Lab => {
  const [red, green, blue] = channels(hex);
  const r = toLinear(red / 255);
  const g = toLinear(green / 255);
  const b = toLinear(blue / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

export const fromOklab = ([lightness, a, b]: Lab) => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb
    .map((channel) =>
      Math.round(Math.min(1, Math.max(0, toGamma(Math.max(0, channel)))) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

/** Trees stay green when their building lights up: a purple oak reads as a mistake, not a brand. */
const FOLIAGE: ReadonlySet<Token> = new Set<Token>(["pine", "pineShade", "tree", "treeShade"]);

/**
 * How the city is drawn, as the site's theme, dial and season say: how light
 * it is (night 0 … day 1, the theme's own end until the dial's brightness
 * moves) and how the season turns the greys, if it does.
 */
export interface Scheme {
  light: number;
  tint: GreyTint | null;
}

// Schemes by value, so a dial moving back and forth finds the colors it
// already worked out; the shelf starts over if it ever fills.
const schemes = new Map<string, Scheme>();
const SCHEMES_KEPT = 512;

/** The one scheme for this light and tint. */
export const schemeAt = (light: number, tint: GreyTint | null): Scheme => {
  const key = `${light}|${tint?.hue}|${tint?.chroma}`;
  let scheme = schemes.get(key);
  if (!scheme) {
    if (schemes.size >= SCHEMES_KEPT) {
      schemes.clear();
    }
    scheme = { light, tint };
    schemes.set(key, scheme);
  }
  return scheme;
};

/** Day or night, for what flips rather than fades: past halfway, as the site's theme does. */
export const timeOf = ({ light }: Scheme): Theme => (light >= FLIP ? "day" : "night");

/**
 * The ink, as the site's text: at the theme's own end, its color; nearer the
 * flip, toward black by day and white by night (soft ink toward the ink), so
 * the lines hold against grounds that have dimmed or brightened.
 */
const INK_POLES: Partial<Record<Token, Record<Theme, string>>> = {
  ink: { day: "#000000", night: "#ffffff" },
  inkSoft: { day: PALETTE.ink.day, night: PALETTE.ink.night },
  signText: { day: "#000000", night: "#ffffff" },
};

/** `from` turned `amount` of the way to `to`, in OKLab as the site's color-mix is. */
export const mixHex = (from: string, to: string, amount: number) => {
  if (amount <= 0) {
    return from;
  }
  if (amount >= 1) {
    return to;
  }
  const [l1, a1, b1] = oklab(from);
  const [l2, a2, b2] = oklab(to);
  return fromOklab([l1 + (l2 - l1) * amount, a1 + (a2 - a1) * amount, b1 + (b2 - b1) * amount]);
};

/** Slate's hue and its chroma in its darks; the chroma fades toward white. */
const SLATE_HUE = 257;
const SLATE_CHROMA = 0.042;

/**
 * A grey of the same lightness, turned to `hue` (OKLCH degrees) as Tailwind's
 * slate is: its tint kept through the darks and faded toward white.
 */
export const slateOf = (hex: string, hue: number, chroma = SLATE_CHROMA) => {
  const [lightness] = oklab(greyOf(hex));
  const amount = chroma * Math.min(1, (1 - lightness) / 0.25);
  const angle = (hue * Math.PI) / 180;
  return fromOklab([lightness, amount * Math.cos(angle), amount * Math.sin(angle)]);
};

/**
 * A color as the city's greys show it, the way the site draws its own greys:
 * plain by day, slate as it darkens, and turned by the season's tint at any
 * light (global.css).
 */
export const greyIn = (hex: string, { light, tint }: Scheme) => {
  if (tint) {
    return slateOf(hex, tint.hue, SLATE_CHROMA * tint.chroma);
  }
  return light >= 1 ? greyOf(hex) : slateOf(hex, SLATE_HUE, SLATE_CHROMA * (1 - shadeOf(light)));
};

// A scheme's colors, worked out once per token: a repaint while the dial
// moves is a lookup per run of faces, not two trips through OKLab.
const colorsIn = new WeakMap<Scheme, Map<Token, string>>();
const greysIn = new WeakMap<Scheme, Map<Token, string>>();

const remembered = (
  memo: WeakMap<Scheme, Map<Token, string>>,
  scheme: Scheme,
  token: Token,
  work: () => string,
) => {
  let colors = memo.get(scheme);
  if (!colors) {
    colors = new Map();
    memo.set(scheme, colors);
  }
  let hex = colors.get(token);
  if (hex === undefined) {
    hex = work();
    colors.set(token, hex);
  }
  return hex;
};

/**
 * A token's color in the scheme, by the site's curves (brightness.ts): grounds
 * mixed from night to day by the shade, ink held to the contrast.
 */
export const colorIn = (token: Token, scheme: Scheme) =>
  remembered(colorsIn, scheme, token, () => {
    const poles = INK_POLES[token];
    if (poles) {
      const time = timeOf(scheme);
      return mixHex(poles[time], PALETTE[token][time], contrastOf(scheme.light));
    }
    return mixHex(PALETTE[token].night, PALETTE[token].day, shadeOf(scheme.light));
  });

/**
 * The city is drawn in greys; a building shows its colors only while it is
 * hovered (or the flyover is passing it).
 */
export const shade = (token: Token, scheme: Scheme, colorful: boolean, tint: Tint = untinted) => {
  if (!colorful) {
    return remembered(greysIn, scheme, token, () => greyIn(colorIn(token, scheme), scheme));
  }
  const hex = colorIn(token, scheme);
  return FOLIAGE.has(token) ? hex : tint(hex);
};

/** Below this a color is black, white or grey: it has no hue to lend or turn. */
const NEUTRAL_CHROMA = 0.03;

const chromaOf = (hex: string) => {
  const [, a, b] = oklab(hex);
  return Math.hypot(a, b);
};

/** The colored token covering the most of a building, weighted by how colorful it is. */
export const dominant = (areas: ReadonlyMap<Token, number>): Token | null => {
  let best: Token | null = null;
  let bestWeight = 0;
  for (const [token, area] of areas) {
    const chroma = chromaOf(PALETTE[token].day);
    if (chroma > NEUTRAL_CHROMA && area * chroma > bestWeight) {
      best = token;
      bestWeight = area * chroma;
    }
  }
  return best;
};

/** The turn and saturation that carry one color's hue onto another's. */
const turnBetween = (from: string, to: string) => {
  const [, fromA, fromB] = oklab(from);
  const [, toA, toB] = oklab(to);
  const turn = Math.atan2(toB, toA) - Math.atan2(fromB, fromA);
  const stretch = Math.min(1.5, Math.max(0.5, Math.hypot(toA, toB) / Math.hypot(fromA, fromB)));
  return { cos: Math.cos(turn) * stretch, sin: Math.sin(turn) * stretch };
};

const hueOf = (hex: string) => {
  const [, a, b] = oklab(hex);
  return Math.atan2(b, a);
};

const hueGap = (from: number, to: number) =>
  Math.abs(Math.atan2(Math.sin(to - from), Math.cos(to - from)));

/** Hues closer than this (about 35°) are one family: a roof, its shaded slope, its awning. */
const FAMILY_GAP = 0.6;

/**
 * A building's colored tokens grouped into families of hue, the one covering
 * most first, each named by its heaviest color.
 */
const familiesOf = (areas: ReadonlyMap<Token, number>) => {
  const weighed = [...areas]
    .filter(([token]) => !FOLIAGE.has(token))
    .map(([token, area]) => ({
      hex: PALETTE[token].day,
      weight: area * chromaOf(PALETTE[token].day),
    }))
    .filter(({ hex }) => chromaOf(hex) > NEUTRAL_CHROMA)
    .toSorted((first, second) => second.weight - first.weight);
  const families: { hex: string; hue: number }[] = [];
  for (const { hex } of weighed) {
    const hue = hueOf(hex);
    if (!families.some((family) => hueGap(family.hue, hue) < FAMILY_GAP)) {
      families.push({ hex, hue });
    }
  }
  return families;
};

/**
 * Turns a building's hue families onto its project's colors, the biggest onto
 * the first, the next onto the second, and so on; families past the icon's
 * colors turn with the biggest, keeping their offset from it, so a one-color
 * icon still leaves a building more than one color. Lightness stays put and
 * near-greys stay as they are, so pastel roofs stay pastel, shaded slopes
 * stay shaded and night stays night.
 */
const turnOnto = (areas: ReadonlyMap<Token, number>, colors: readonly string[]): Tint => {
  const families = familiesOf(areas);
  const [main] = families;
  const [first] = colors;
  if (main === undefined || first === undefined) {
    return untinted;
  }
  const mainTurn = { hue: main.hue, ...turnBetween(main.hex, first) };
  const turns = families.map((family, index) => {
    const onto = colors[index];
    return onto
      ? { hue: family.hue, ...turnBetween(family.hex, onto) }
      : { ...mainTurn, hue: family.hue };
  });
  return (hex) => {
    const [lightness, a, b] = oklab(hex);
    if (Math.hypot(a, b) < NEUTRAL_CHROMA) {
      return hex;
    }
    const hue = Math.atan2(b, a);
    let nearest = mainTurn;
    for (const turn of turns) {
      if (hueGap(turn.hue, hue) < hueGap(nearest.hue, hue)) {
        nearest = turn;
      }
    }
    const { cos, sin } = nearest;
    return fromOklab([lightness, a * cos - b * sin, a * sin + b * cos]);
  };
};

const GLOW_LIGHTNESS: Record<Theme, readonly [number, number]> = {
  day: [0.45, 0.72],
  night: [0.68, 0.85],
};
const GLOW_CHROMA = 0.1;

/** A color as a glow on the ground: dark enough to show by day, light enough by night, never washed out. */
const glowOf = (hex: string): Record<Theme, string> => {
  const [lightness, a, b] = oklab(hex);
  const chroma = Math.hypot(a, b);
  // A grey's faint hue, boosted, would glow in a color it doesn't have.
  const boost = chroma >= NEUTRAL_CHROMA ? Math.max(1, GLOW_CHROMA / chroma) : 0;
  const at = (theme: Theme) => {
    const [low, high] = GLOW_LIGHTNESS[theme];
    return fromOklab([Math.min(high, Math.max(low, lightness)), a * boost, b * boost]);
  };
  return { day: at("day"), night: at("night") };
};

/** How a building looks lit: the tint it paints itself with, and the glow round its lot. */
export interface Look {
  tint: Tint;
  glow: Record<Theme, string>;
}

/**
 * Turns a building's colors to greys, darkened toward `grey`, as turnOnto
 * turns them onto a hue: what's grey already stays as it is, and each colored
 * face keeps its place between light and shade, scaled into the grey's range.
 */
const greyedTo = (grey: string): Tint => {
  const [target] = oklab(grey);
  const scale = Math.min(1, target + 0.25);
  return (hex) => {
    const [lightness, a, b] = oklab(hex);
    return Math.hypot(a, b) < NEUTRAL_CHROMA ? hex : fromOklab([lightness * scale, 0, 0]);
  };
};

/**
 * A building lit in its project's colors: its own turned onto them, its lot
 * ringed in the first. An icon known only by a grey paints it in that grey.
 * Without colors to go by, it keeps the colors it was drawn in and glows in
 * its main one.
 */
export const lookOf = (areas: ReadonlyMap<Token, number>, colors: readonly string[] = []): Look => {
  const colored = colors.filter((hex) => chromaOf(hex) >= NEUTRAL_CHROMA);
  const [first] = colored;
  const [grey] = colors;
  if (first === undefined && grey !== undefined) {
    return { glow: glowOf(grey), tint: greyedTo(grey) };
  }
  if (first === undefined) {
    return { glow: glowOf(PALETTE[dominant(areas) ?? "accentBlue"].day), tint: untinted };
  }
  return { glow: glowOf(first), tint: turnOnto(areas, colored) };
};
