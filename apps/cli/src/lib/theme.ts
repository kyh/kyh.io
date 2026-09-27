// Sci-fi terminal palette — near-black canvas, a single teal accent, and a
// tight grayscale ramp. Inspired by edex-ui / dex-ui system dashboards.
export const color = {
  accent: "#5EEAD4",
  accentDim: "#2F6F63",
  bg: "#000000",
  black: "#000000",
  border: "#2E2E2E",
  borderActive: "#3F6F66",
  dim: "#7A7A7A",
  faint: "#4A4A4A",
  ghost: "#2A2A2A",
  text: "#E6E6E6",
} as const;

// Thin technical border set used for every panel. Single-line, squared corners
// to match the Swiss/HUD reference frames.
export const panelBorder = {
  bottomLeft: "└",
  bottomRight: "┘",
  bottomT: "┴",
  cross: "┼",
  horizontal: "─",
  leftT: "├",
  rightT: "┤",
  topLeft: "┌",
  topRight: "┐",
  topT: "┬",
  vertical: "│",
} as const;
