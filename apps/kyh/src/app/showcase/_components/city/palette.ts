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

/** The same color as a grey of equal lightness (Rec. 601 luma, in sRGB). */
export const greyOf = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.floor(value / 65_536) % 256;
  const g = Math.floor(value / 256) % 256;
  const b = value % 256;
  const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const channel = luma.toString(16).padStart(2, "0");
  return `#${channel}${channel}${channel}`;
};

/**
 * The city is drawn in greys; a building shows its colors only while it is
 * hovered (or the flyover is passing it).
 */
export const shade = (token: Token, theme: Theme, colorful: boolean) =>
  colorful ? PALETTE[token][theme] : greyOf(PALETTE[token][theme]);
