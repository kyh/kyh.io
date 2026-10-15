// Every color in the city, by day (ink on paper, after Inkline Town) and by
// night (pale ink on slate, windows lit). Geometry is batched per token, so a
// theme switch recolors a few dozen materials and rebuilds nothing.
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
  field: { day: "#efe5c4", night: "#2b2a22" },
  fieldGreen: { day: "#dce6c8", night: "#1f2b22" },
  flame: { day: "#f3a64a", night: "#ffb057" },
  glass: { day: "#dbe6ea", night: "#f1c76f" },
  glassDim: { day: "#dbe6ea", night: "#34434b" },
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
  top: { day: "#f7f8f4", night: "#2d3a41" },
  tree: { day: "#cbd8ba", night: "#253a31" },
  treeShade: { day: "#b9c9a6", night: "#1d3029" },
  trunk: { day: "#9a8b78", night: "#3a3229" },
  wallLeft: { day: "#eceee8", night: "#28343b" },
  wallRight: { day: "#dfe2db", night: "#212c32" },
  water: { day: "#d9e6ea", night: "#13232b" },
  wave: { day: "#c4d3cf", night: "#22343c" },
  white: { day: "#fbfbf8", night: "#d9e0dc" },
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

/** The vivid accent each pastel belongs to. */
const ACCENT_OF: Partial<Record<Token, Token>> = {
  roofBlue: "accentBlue",
  roofBlueShade: "accentBlue",
  roofGreen: "accentGreen",
  roofGreenShade: "accentGreen",
  roofLilac: "accentPurple",
  roofLilacShade: "accentPurple",
  roofPink: "accentPink",
  roofPinkShade: "accentPink",
  roofTeal: "accentTeal",
  roofTealShade: "accentTeal",
  roofTerracotta: "accentOrange",
  roofTerracottaShade: "accentOrange",
  roofYellow: "accentYellow",
  roofYellowShade: "accentYellow",
};

const VIVID: ReadonlySet<Token> = new Set<Token>(ACCENTS);

/**
 * A building's own color, for the glow round its lot: whichever accent its
 * colored surfaces add up to most, weighted by how colorful each one is, so
 * a big pastel roof beats a small red door and grey walls count for nothing.
 */
export const signature = (areas: ReadonlyMap<Token, number>): Token => {
  const weights = new Map<Token, number>();
  for (const [token, area] of areas) {
    const [r, g, b] = channels(PALETTE[token].day);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const accent = ACCENT_OF[token] ?? token;
    if (chroma > 24 && VIVID.has(accent)) {
      weights.set(accent, (weights.get(accent) ?? 0) + area * chroma);
    }
  }
  let best: Token = "accentBlue";
  let bestWeight = 0;
  for (const [token, weight] of weights) {
    if (weight > bestWeight) {
      best = token;
      bestWeight = weight;
    }
  }
  return best;
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

export const untinted: Tint = (hex) => hex;

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

/** Below this an icon is black, white or grey: it has no hue to lend. */
const NEUTRAL_CHROMA = 0.03;

/** The colored token covering the most of a building, weighted by how colorful it is. */
export const dominant = (areas: ReadonlyMap<Token, number>): Token | null => {
  let best: Token | null = null;
  let bestWeight = 0;
  for (const [token, area] of areas) {
    const [, a, b] = oklab(PALETTE[token].day);
    const chroma = Math.hypot(a, b);
    if (chroma > NEUTRAL_CHROMA && area * chroma > bestWeight) {
      best = token;
      bestWeight = area * chroma;
    }
  }
  return best;
};

/**
 * Turns a building's colors so its main one lands on its project's color:
 * every hue rotates by the same angle and saturates by the same factor
 * (within reason), and lightness stays put and near-greys stay as they are, so pastel roofs stay pastel,
 * night stays night and a two-tone building keeps its contrast. A project
 * with a neutral icon keeps the colors it was drawn in.
 */
export const brandTint = (main: Token | null, brand?: string): Tint => {
  if (main === null || brand === undefined) {
    return untinted;
  }
  const [, fromA, fromB] = oklab(PALETTE[main].day);
  const [, toA, toB] = oklab(brand);
  const toChroma = Math.hypot(toA, toB);
  if (toChroma < NEUTRAL_CHROMA) {
    return untinted;
  }
  const turn = Math.atan2(toB, toA) - Math.atan2(fromB, fromA);
  const stretch = Math.min(1.5, Math.max(0.5, toChroma / Math.hypot(fromA, fromB)));
  const cos = Math.cos(turn) * stretch;
  const sin = Math.sin(turn) * stretch;
  return (hex) => {
    const [lightness, a, b] = oklab(hex);
    if (Math.hypot(a, b) < NEUTRAL_CHROMA) {
      return hex;
    }
    return fromOklab([lightness, a * cos - b * sin, a * sin + b * cos]);
  };
};

/**
 * The city is drawn in greys; a building shows its colors only while it is
 * hovered (or the flyover is passing it).
 */
export const shade = (token: Token, theme: Theme, colorful: boolean, tint: Tint = untinted) =>
  colorful ? tint(PALETTE[token][theme]) : greyOf(PALETTE[token][theme]);

const LIGHTNESS: Record<Theme, readonly [number, number]> = {
  day: [0.45, 0.72],
  night: [0.68, 0.85],
};

/** A project's color as a glow on the ground: kept dark enough to show by day, light enough by night. */
export const glowOf = (brand: string): Record<Theme, string> => {
  const [lightness, a, b] = oklab(brand);
  const at = (theme: Theme) => {
    const [low, high] = LIGHTNESS[theme];
    return fromOklab([Math.min(high, Math.max(low, lightness)), a, b]);
  };
  return { day: at("day"), night: at("night") };
};
