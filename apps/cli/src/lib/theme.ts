// Sci-fi terminal palette — near-black canvas, a single teal accent, and a
// tight grayscale ramp. Inspired by edex-ui / dex-ui system dashboards.
export const color = {
  bg: "#000000",
  // grayscale ramp
  text: "#E6E6E6",
  dim: "#7A7A7A",
  faint: "#4A4A4A",
  ghost: "#2A2A2A",
  // borders
  border: "#2E2E2E",
  borderActive: "#3F6F66",
  // accent
  accent: "#5EEAD4",
  accentDim: "#2F6F63",
  black: "#000000",
} as const;

// Thin technical border set used for every panel. Single-line, squared corners
// to match the Swiss/HUD reference frames.
export const panelBorder = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  topT: "┬",
  bottomT: "┴",
  leftT: "├",
  rightT: "┤",
  cross: "┼",
} as const;
