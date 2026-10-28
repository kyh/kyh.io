// Halloween: the week up to the 31st, dark and turned purple. A find throws
// bats; the town puts jack-o'-lanterns by the doors and the pond and graves
// in the gardens, lights its windows orange after dark, stands a waving
// skeleton in the fountain, flies BOO! in a witch's hat and sends a witch
// across the sky.
import type { Art } from "../art";
import type { Theme } from "../theme";
import { ellipse, point } from "../art";
import { span } from "../calendar";
import { namedConfetti } from "../theme";
import { WITCH_HAT } from "../hats";

const NIGHT = "hsl(270, 30%, 8%)";
/** A faint moonlit edge, so a bat still shows against the night. */
const MOONLIT = "hsl(270 45% 78% / 0.75)";

/**
 * A bat's wing on one side (-1 left, 1 right), `x` measured out from the
 * body: a curved leading edge out to a pointed tip, and a trailing edge
 * scalloped between the fingers. It beats about its shoulder, high above
 * the body and then just below it.
 */
const batWing = (side: -1 | 1) => {
  const at = (x: number, y: number) => point(12 + side * x, y);
  return {
    d: `M${at(1.1, 10.2)}C${at(2.4, 8.6)} ${at(4.2, 7.4)} ${at(6.4, 7)}C${at(8.6, 7.4)} ${at(10.2, 8.4)} ${at(11.6, 10.9)}Q${at(10.1, 10.2)} ${at(9.2, 12.6)}Q${at(7.5, 11.4)} ${at(6, 13.6)}Q${at(3.8, 12.2)} ${at(1.4, 14.4)}Z`,
    fill: NIGHT,
    stroke: MOONLIT,
    strokeWidth: 0.4,
    swing: { at: [12 + side * 1.2, 11.4], from: side * -32, to: side * 16 },
  } as const;
};

/** The body, and the head and its ears wound the same way so they fill as one. */
const BAT_BODY = `${ellipse(12, 13.2, 1.8, 2.9)}M13.6 9 13.5 6.2l-1.1 1.7h-.8l-1.1-1.7-.1 2.8a1.9 1.9 0 1 0 3.2 0Z`;

// A flat silhouette, after a cartoon bat: ears up, wings beating.
const BAT = {
  layers: [
    batWing(-1),
    batWing(1),
    // Its edge, then the body over it, so the seam where head meets body is hidden.
    { d: BAT_BODY, stroke: MOONLIT, strokeWidth: 0.8 },
    { d: BAT_BODY, fill: NIGHT },
  ],
} satisfies Art;

/** A bat's half (-1 left, 1 right), from between its ears round the wing to its tail. */
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
  // The week up to Halloween.
  corners: "webs",
  days: (year) => span(year, [10, 25], [10, 31]),
  drift: null,
  glyph: BAT_GLYPH,
  hat: WITCH_HAT,
  id: "halloween",
  mode: "dark",
  name: "Halloween",
  tint: { chroma: 2.5, hue: 295 },
  trail: true,
} as const satisfies Theme;
