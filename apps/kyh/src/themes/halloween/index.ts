import type { Art } from "../art";
import type { Theme } from "../theme";
import { ellipse, point } from "../art";
import { span } from "../calendar";
import { namedConfetti } from "../theme";

const batWing = (side: -1 | 1) => {
  const at = (x: number, y: number) => point(12 + side * x, y);

  return {
    d: `M${at(1.1, 10.2)}C${at(2.4, 8.6)} ${at(4.2, 7.4)} ${at(6.4, 7)}C${at(8.6, 7.4)} ${at(10.2, 8.4)} ${at(11.6, 10.9)}Q${at(10.1, 10.2)} ${at(9.2, 12.6)}Q${at(7.5, 11.4)} ${at(6, 13.6)}Q${at(3.8, 12.2)} ${at(1.4, 14.4)}Z`,
    fill: "screen",
    swing: { at: [12 + side * 1.2, 11.4], from: side * -32, to: side * 16 },
  } as const;
};

const BAT_BODY = `${ellipse(12, 13.2, 1.8, 2.9)}M13.6 9 13.5 6.2l-1.1 1.7h-.8l-1.1-1.7-.1 2.8a1.9 1.9 0 1 0 3.2 0Z`;

const BAT = {
  layers: [
    batWing(-1),
    batWing(1),
    { d: BAT_BODY, strokeWidth: 1.2 },
    { d: BAT_BODY, fill: "screen", ink: 0 },
  ],
} satisfies Art;

const batHalf = (side: -1 | 1) => {
  const at = (x: number, y: number) => point(12 + side * x, y);

  return `M${at(0, 7.6)}L${at(1.4, 4.6)}L${at(2, 8)}Q${at(2.4, 8.8)} ${at(2.8, 9.6)}C${at(4.6, 6.8)} ${at(8, 5.8)} ${at(10.6, 7.4)}Q${at(9.2, 8.8)} ${at(8.6, 11.6)}Q${at(7, 10.2)} ${at(5.6, 12.6)}Q${at(4.2, 11.6)} ${at(3, 13.4)}Q${at(2, 16.4)} ${at(0, 18.4)}`;
};

const BAT_GLYPH = batHalf(-1) + batHalf(1);

export const theme = {
  art: BAT,
  confetti: [
    ...namedConfetti("orange", "orange", "plum", "gold"),
    { back: "hsl(270, 20%, 30%)", front: "hsl(270, 25%, 12%)" },
  ],
  corners: "webs",
  days: (year) => span(year, [10, 18], [11, 2]),
  drift: null,
  glyph: BAT_GLYPH,
  id: "halloween",
  mode: "dark",
  name: "Halloween",
  tint: { chroma: 2.5, hue: 295 },
} as const satisfies Theme;
