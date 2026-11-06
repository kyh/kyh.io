// The default theme: plain light or dark, the visitor's own, on any day no
// other theme runs. A find throws golden eggs (`dress.ts`); the town stays as
// it is and flies the site's own blimp.
import type { Theme } from "../theme";

export const theme = {
  glyph: null,
  id: "classic",
  mode: null,
  name: "Light / Dark",
  tint: null,
} as const satisfies Theme;
