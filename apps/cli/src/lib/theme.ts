// Layout constants
export const BOX_WIDTH = 48;
export const BOX_OUTER_WIDTH = 50; // BOX_WIDTH + 2 borders
export const MENU_LABEL_WIDTH = 16;
export const MENU_DESC_WIDTH = 30;
export const CONTACT_LABEL_WIDTH = 14;
export const CONTACT_URL_WIDTH = 32;
export const PROJECT_INNER_WIDTH = 42;
export const PROJECT_CONTENT_WIDTH = 38;
export const PROJECT_TITLE_WIDTH = 29;
export const PROJECT_BADGE_WIDTH = 9;

// Colors
export const colors = {
  highlight: "#00FFFF",
  dim: "#666666",
  muted: "#888888",
} as const;

// ANSI escape codes
export const ansi = {
  clearScreen: "\x1b[2J",
  cursorHome: "\x1b[H",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
} as const;

// Box drawing characters
export const box = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
  dividerLeft: "├",
  dividerRight: "┤",
  innerTopLeft: "┌",
  innerTopRight: "┐",
  innerBottomLeft: "└",
  innerBottomRight: "┘",
} as const;

// Navigation indicators
export const nav = {
  selected: ">",
  dotEmpty: "○",
  dotFilled: "●",
  arrowLeft: "←",
  arrowRight: "→",
  arrowUp: "↑",
  arrowDown: "↓",
} as const;

