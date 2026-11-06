// Halloween: the week up to the 31st, dark and turned purple. A find throws
// bats and cobwebs hang in the page's corners (`dress.ts`), a ghost floats
// after the mouse (`follower.tsx`); the town puts jack-o'-lanterns by the
// doors and the pond and graves in the gardens, lights its windows orange
// after dark, stands a waving skeleton in the fountain, flies BOO! in a
// witch's hat and sends a witch across the sky.
import type { Theme } from "../theme";
import { point } from "../art";
import { span } from "../calendar";

/** A bat's half (-1 left, 1 right), from between its ears round the wing to its tail. */
const batHalf = (side: -1 | 1) => {
  const at = (x: number, y: number) => point(12 + side * x, y);
  return `M${at(0, 7.6)}L${at(1.4, 4.6)}L${at(2, 8)}Q${at(2.4, 8.8)} ${at(2.8, 9.6)}C${at(4.6, 6.8)} ${at(8, 5.8)} ${at(10.6, 7.4)}Q${at(9.2, 8.8)} ${at(8.6, 11.6)}Q${at(7, 10.2)} ${at(5.6, 12.6)}Q${at(4.2, 11.6)} ${at(3, 13.4)}Q${at(2, 16.4)} ${at(0, 18.4)}`;
};
const BAT_GLYPH = batHalf(-1) + batHalf(1);

export const theme = {
  // The week up to Halloween.
  days: (year) => span(year, [10, 25], [10, 31]),
  glyph: BAT_GLYPH,
  id: "halloween",
  mode: "dark",
  name: "Halloween",
  tint: { chroma: 2.5, hue: 295 },
} as const satisfies Theme;
