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

const colorValues = Object.values(colors);

const hashCode = (input: string, mod: number) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + (input.codePointAt(i) ?? 0)) % 2_147_483_647;
  }
  return hash % mod;
};

export const getColorById = (id: string): { color: string; hue: string } =>
  colorValues[hashCode(id, colorValues.length)] ?? colors.blue;
