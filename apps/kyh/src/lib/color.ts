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

type Color = (typeof colors)[keyof typeof colors];

const colorValues: Color[] = Object.values(colors);

const sampleSize = <T>(array: T[], size: number): T[] => {
  const shuffled = [...array];
  const count = Math.min(size, array.length);
  const lastIndex = array.length - 1;
  for (let index = 0; index < count; index += 1) {
    const rand = index + Math.floor(Math.random() * (lastIndex - index + 1));
    const value = shuffled[rand];
    const current = shuffled[index];
    if (value !== undefined && current !== undefined) {
      shuffled[rand] = current;
      shuffled[index] = value;
    }
  }
  return shuffled.slice(0, count);
};

const hashCode = (string?: string, mod?: number) => {
  let hash = 0;
  if (!string || string.length === 0) {
    return hash;
  }
  for (let i = 0; i < string.length; i += 1) {
    const chr = string.codePointAt(i) ?? 0;
    // oxlint-disable-next-line no-bitwise, unicorn/prefer-math-trunc -- Java-style string hash; `| 0` wraps to int32, which Math.trunc does not
    hash = ((hash << 5) - hash + chr) | 0;
  }
  if (mod) {
    return Math.abs(hash % mod);
  }
  return hash;
};

export const getRandomColor = () => colorValues[Math.floor(Math.random() * colorValues.length)];

export const getRandomUniqueColor = (currentColors: string[]) => {
  const colorNames = colorValues.map((col) => col.color);
  const uniqueColors = colorNames.filter((color: string) => !currentColors.includes(color));
  const uniqueColor = uniqueColors[Math.floor(Math.random() * uniqueColors.length)];
  const uniqueColorSet = colorValues.find((color) => color.color === uniqueColor);
  return uniqueColorSet ?? getRandomColor();
};

export const getRandomColors = (qty: number) => sampleSize(colorValues, qty);

export const getColorById = (id: string): Color =>
  colorValues[hashCode(id, colorValues.length)] ?? colors.blue;
