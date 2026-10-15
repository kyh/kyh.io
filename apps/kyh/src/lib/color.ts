import type { JsonValue } from "@vibedgames/multiplayer";

import { eggsComplete } from "@/lib/easter-egg-store";

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

/** The look for a visitor who has found every easter egg. */
export const GOLD = {
  color: "hsl(40, 96%, 48%)",
  hue: "hsl(50, 100%, 78%)",
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
export const ownColorName = (): ColorName => {
  own ??= COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)] ?? "blue";
  return own;
};

export const ownColor = (): Color => colors[ownColorName()];

/** How this visitor looks to themselves and everyone: gold once every easter egg is found. */
export const ownLook = (): Color => (eggsComplete() ? GOLD : ownColor());

/** What a room's state carries so everyone else draws this visitor gold. */
export const ownEggs = () => (eggsComplete() ? "all" : null);

/**
 * A visitor's colors: gold once they've found every easter egg, else the
 * palette color they name in their state, else the one their room gave them.
 */
export const lookOf = (
  state: { look?: JsonValue; eggs?: JsonValue } | undefined,
  player: { color?: string; hue?: string },
): Color => {
  if (state?.eggs === "all") {
    return GOLD;
  }
  const named = colorNamed(state?.look);
  return {
    color: named?.color ?? player.color ?? colors.blue.color,
    hue: named?.hue ?? player.hue ?? colors.blue.hue,
  };
};
