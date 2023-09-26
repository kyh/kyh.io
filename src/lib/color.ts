import sampleSize from "lodash/sampleSize";

const colors = {
  tomato: {
    color: "var(--colors-tomato9)",
    hue: "var(--colors-tomato7)",
  },
  crimson: {
    color: "var(--colors-crimson9)",
    hue: "var(--colors-crimson7)",
  },
  pink: {
    color: "var(--colors-pink9)",
    hue: "var(--colors-pink7)",
  },
  plum: {
    color: "var(--colors-plum9)",
    hue: "var(--colors-plum7)",
  },
  indigo: {
    color: "var(--colors-indigo9)",
    hue: "var(--colors-indigo7)",
  },
  blue: {
    color: "var(--colors-blue9)",
    hue: "var(--colors-blue7)",
  },
  cyan: {
    color: "var(--colors-cyan9)",
    hue: "var(--colors-cyan7)",
  },
  green: {
    color: "var(--colors-green9)",
    hue: "var(--colors-green7)",
  },
  orange: {
    color: "var(--colors-orange9)",
    hue: "var(--colors-orange7)",
  },
};

const colorValues = Object.values(colors);

export const getRandomUniqueColor = (currentColors: string[]) => {
  const colorNames = colorValues.map((col) => col.color);
  const uniqueColors = colorNames.filter(
    (color: string) => !currentColors.includes(color)
  );
  const uniqueColor =
    uniqueColors[Math.floor(Math.random() * uniqueColors.length)];
  const uniqueColorSet = colorValues.find(
    (color) => color.color === uniqueColor
  );
  return uniqueColorSet || getRandomColor();
};

export const getRandomColors = (qty: number) => {
  return sampleSize(colorValues, qty);
};

export const getRandomColor = () => {
  return colorValues[Math.floor(Math.random() * colorValues.length)];
};

export const getColorById = (id: string) => {
  return colorValues[hashCode(id, colorValues.length)];
};

const hashCode = (string?: string, mod?: number) => {
  let hash = 0;
  if (!string || string.length === 0) return hash;
  for (let i = 0; i < string.length; i++) {
    let chr = string.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  if (mod) return Math.abs(hash % mod);
  return hash;
};
