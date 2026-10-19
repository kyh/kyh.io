// A theme on the page: light or dark on <html> (`data-theme`, read by
// global.css and Tailwind's `dark:`), its season's tint, where global.css
// turns the site's greys by it, and the browser's bar (`theme-color`) in the
// page's own background. Shared by the store and the pre-paint script, which
// must agree.
import type { GreyTint, Mode, SeasonId } from "./seasons";
import { seasonOf } from "./seasons";

/** Where the visitor's own light or dark is kept, for the store and the pre-paint script. */
export const MODE_KEY = "theme";

/** The custom properties a tint sets on <html>, read by global.css. */
export const HUE_PROPERTY = "--season-hue";
export const CHROMA_PROPERTY = "--season-chroma";

/** The meta that colors the browser's bar on mobile. */
export const BAR_SELECTOR = 'meta[name="theme-color"]';

/** What painting touches of <html>. */
export interface Paintable {
  dataset: DOMStringMap;
  style: Pick<CSSStyleDeclaration, "removeProperty" | "setProperty">;
}

/** The page as painting sees it: <html> and the browser's bar. */
export interface Page {
  root: Paintable;
  bar: { content: string };
}

/**
 * The page's own background (`--bg-highlighted` in global.css): gray0 by
 * light and gray1000 by dark, in hex as the site has them, or as a season's
 * tint turns them in oklch.
 */
const BACKGROUNDS = {
  dark: { chroma: 0.03, hex: "#000", lightness: 7 },
  light: { chroma: 0.004, hex: "#ffffff", lightness: 99.5 },
} as const;

/** The browser's bar in a theme: the page's own background, so the bar runs into it. */
export const barColor = (mode: Mode, tint: GreyTint | null) => {
  const { chroma, hex, lightness } = BACKGROUNDS[mode];
  return tint
    ? `oklch(${lightness}% ${Number((chroma * tint.chroma).toFixed(4))} ${tint.hue})`
    : hex;
};

/** Shows a theme on the page: its scheme, `data-season` and the tint while it has one, and the bar. */
export const paintTheme = ({ bar, root }: Page, season: SeasonId, mode: Mode) => {
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
  bar.content = barColor(mode, tint);
};
