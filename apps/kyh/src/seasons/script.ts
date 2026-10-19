// Paints the calendar's season onto <html> before first paint, so a holiday
// page doesn't load in slate and turn at hydration. The page can't run the
// calendar yet, so its windows are worked out here for a span of years; past
// it, the store (store.ts) still tints the page once it runs. Pure.
import { CHROMA_PROPERTY, HUE_PROPERTY } from "./paint";
import { SEASONS, windowIn } from "./seasons";

const FIRST_YEAR = 2026;
const LAST_YEAR = 2036;

/**
 * Every season's windows touching some years, flat as [from, to, season index,
 * …], first season first so the first match runs. The year before is in too:
 * its New Year runs into the first.
 */
export const windowsBetween = (first: number, last: number) =>
  SEASONS.flatMap((season, index) =>
    Array.from({ length: last - first + 2 }, (_, offset) => windowIn(season, first - 1 + offset))
      .filter((days) => days !== null)
      .flatMap(([from, to]) => [from, to, index]),
  );

const tints = SEASONS.map(({ id, tint }) => (tint ? [id, tint.hue, tint.chroma] : null));

/** The inline script, for the document's <head>. */
export const seasonScript = (first = FIRST_YEAR, last = LAST_YEAR) =>
  `(()=>{const w=${JSON.stringify(windowsBetween(first, last))},t=${JSON.stringify(tints)},d=new Date(),k=d.getFullYear()*1e4+(d.getMonth()+1)*100+d.getDate();for(let i=0;i<w.length;i+=3)if(k>=w[i]&&k<=w[i+1]){const s=t[w[i+2]],r=document.documentElement;if(s){r.dataset.season=s[0];r.style.setProperty(${JSON.stringify(HUE_PROPERTY)},s[1]);r.style.setProperty(${JSON.stringify(CHROMA_PROPERTY)},s[2])}return}})()`;
