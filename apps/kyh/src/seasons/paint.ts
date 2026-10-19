// A theme on <html>: light or dark (`data-theme`, read by global.css and
// Tailwind's `dark:`), and its season's tint, where global.css turns the
// site's greys by it. Shared by the store and the pre-paint script, which
// must agree.
import type { Mode, SeasonId } from "./seasons";
import { seasonOf } from "./seasons";

/** Where the visitor's own light or dark is kept, for the store and the pre-paint script. */
export const MODE_KEY = "theme";

/** The custom properties a tint sets on <html>, read by global.css. */
export const HUE_PROPERTY = "--season-hue";
export const CHROMA_PROPERTY = "--season-chroma";

/** What painting touches of an element. */
export interface Paintable {
  dataset: DOMStringMap;
  style: Pick<CSSStyleDeclaration, "removeProperty" | "setProperty">;
}

/** Shows a theme on an element: its scheme, and `data-season` and the tint while it has one. */
export const paintTheme = (root: Paintable, season: SeasonId, mode: Mode) => {
  root.dataset.theme = mode;
  root.style.setProperty("color-scheme", mode);
  const { tint } = seasonOf(season);
  if (tint) {
    root.dataset.season = season;
    root.style.setProperty(HUE_PROPERTY, String(tint.hue));
    root.style.setProperty(CHROMA_PROPERTY, String(tint.chroma));
  } else {
    delete root.dataset.season;
    root.style.removeProperty(HUE_PROPERTY);
    root.style.removeProperty(CHROMA_PROPERTY);
  }
};
