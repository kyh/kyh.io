// Paints the theme onto <html> before first paint, so a page doesn't load
// in the wrong light or slate and turn at hydration: the calendar's season,
// with its own light or dark, else the visitor's kept light or dark, else
// their system's. The page can't run the calendar yet, so its windows are
// worked out here for a span of years; past it, the store (store.ts) still
// paints the page once it runs. Pure.
import { CHROMA_PROPERTY, HUE_PROPERTY, MODE_KEY } from "./paint";
import { SEASONS, windowIn } from "./seasons";

const FIRST_YEAR = 2026;
const LAST_YEAR = 2036;

/**
 * Every season's windows in some years, flat as [from, to, season index, …],
 * first season first so the first match runs.
 */
const windowsBetween = (first: number, last: number) =>
  SEASONS.flatMap((season, index) =>
    Array.from({ length: last - first + 1 }, (_, offset) => windowIn(season, first + offset))
      .filter((days) => days !== null)
      .flatMap(([from, to]) => [from, to, index]),
  );

const tints = SEASONS.map(({ id, tint }) => (tint ? [id, tint.hue, tint.chroma] : null));
const modes = SEASONS.map(({ mode }) => mode);

/** The inline script, for the document's <head>. */
export const seasonScript = (first = FIRST_YEAR, last = LAST_YEAR) =>
  `(()=>{const w=${JSON.stringify(windowsBetween(first, last))},t=${JSON.stringify(tints)},m=${JSON.stringify(modes)},d=new Date(),k=d.getFullYear()*1e4+(d.getMonth()+1)*100+d.getDate(),r=document.documentElement;let n=-1;for(let i=0;i<w.length;i+=3)if(k>=w[i]&&k<=w[i+1]){n=w[i+2];break}let o=null;try{o=localStorage.getItem(${JSON.stringify(MODE_KEY)})}catch{}const e=(n>=0&&m[n])||(o==="light"||o==="dark"?o:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),s=n>=0?t[n]:null;r.dataset.theme=e;r.style.setProperty("color-scheme",e);if(s){r.dataset.season=s[0];r.style.setProperty(${JSON.stringify(HUE_PROPERTY)},s[1]);r.style.setProperty(${JSON.stringify(CHROMA_PROPERTY)},s[2])}})()`;
