import type { JsonValue } from "@vibedgames/multiplayer";

const colors = {
  blue: {
    color: "hsl(206, 100%, 50%)",
    hue: "hsl(208, 77.5%, 76.9%)",
  },
  crimson: {
    color: "hsl(336, 80%, 57.8%)",
    hue: "hsl(335, 63.5%, 80.4%)",
  },
  cyan: {
    color: "hsl(190, 95%, 39%)",
    hue: "hsl(189, 60.3%, 52.5%)",
  },
  /** Earned, never dealt: every easter egg found (src/easter-eggs). */
  gold: {
    color: "hsl(40, 96%, 48%)",
    hue: "hsl(50, 100%, 78%)",
  },
  green: {
    color: "hsl(151, 55%, 41.5%)",
    hue: "hsl(146, 38.5%, 69%)",
  },
  indigo: {
    color: "hsl(226, 70%, 55.5%)",
    hue: "hsl(225, 77.4%, 82.1%)",
  },
  orange: {
    color: "hsl(24, 94%, 50%)",
    hue: "hsl(24, 100%, 75.3%)",
  },
  pink: {
    color: "hsl(322, 65%, 54.5%)",
    hue: "hsl(323, 62%, 80.1%)",
  },
  plum: {
    color: "hsl(292, 45%, 51%)",
    hue: "hsl(295, 48.2%, 78.9%)",
  },
  tomato: {
    color: "hsl(10, 78%, 54%)",
    hue: "hsl(10, 77.3%, 79.5%)",
  },
};

type ColorName = keyof typeof colors;
type Color = (typeof colors)[ColorName];

const COLOR_NAMES = Object.keys(colors).filter((name): name is ColorName => name in colors);

/** A palette color by the name a visitor sent; anything else is no color. */
export const colorNamed = (name: JsonValue | undefined): Color | null => {
  const found = COLOR_NAMES.find((each) => each === name);
  return found ? colors[found] : null;
};

let own: ColorName | null = null;

/**
 * This visitor's color for the page load, by name: their avatar, and how every
 * room draws their cursor and chat. The party server picks a color per room
 * connection, so the site says its own instead and every room agrees.
 */
const DEALT = COLOR_NAMES.filter((name) => name !== "gold");
const repaints = new Set<() => void>();

export const ownColorName = (): ColorName => {
  own ??= DEALT[Math.floor(Math.random() * DEALT.length)] ?? "blue";
  return own;
};

export const ownColor = (): Color => colors[ownColorName()];

/** A visitor's colors as a fill: light hue down to full color, behind dark text. */
export const gradientOf = (look: { color: string; hue: string }) =>
  `linear-gradient(${look.hue}, ${look.color})`;

export const GOLD = colors.gold;

/** Repaint this visitor; every room says their color again. */
export const setOwnColorName = (name: ColorName) => {
  if (own !== name) {
    own = name;
    for (const repaint of repaints) {
      repaint();
    }
  }
};

export const subscribeToOwnColor = (listener: () => void) => {
  repaints.add(listener);
  return () => {
    repaints.delete(listener);
  };
};

/** A visitor's colors: the palette color they name in their state, else the one their room gave them. */
export const lookOf = (
  state: { look?: JsonValue } | undefined,
  player: { color?: string; hue?: string },
): Color => {
  const named = colorNamed(state?.look);
  return {
    color: named?.color ?? player.color ?? colors.blue.color,
    hue: named?.hue ?? player.hue ?? colors.blue.hue,
  };
};
