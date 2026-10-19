// A season's tint on <html>, where global.css turns the site's greys by it.
// Shared by the store and the pre-paint script, which must agree.
import type { SeasonId } from "./seasons";
import { seasonOf } from "./seasons";

/** The custom properties a tint sets on <html>, read by global.css. */
export const HUE_PROPERTY = "--season-hue";
export const CHROMA_PROPERTY = "--season-chroma";

/** What painting touches of an element. */
export interface Paintable {
  dataset: DOMStringMap;
  style: Pick<CSSStyleDeclaration, "removeProperty" | "setProperty">;
}

/** Shows a season's tint on an element: `data-season` and the tint while it has one, nothing for slate. */
export const paintSeason = (root: Paintable, id: SeasonId) => {
  const { tint } = seasonOf(id);
  if (tint) {
    root.dataset.season = id;
    root.style.setProperty(HUE_PROPERTY, String(tint.hue));
    root.style.setProperty(CHROMA_PROPERTY, String(tint.chroma));
  } else {
    delete root.dataset.season;
    root.style.removeProperty(HUE_PROPERTY);
    root.style.removeProperty(CHROMA_PROPERTY);
  }
};
