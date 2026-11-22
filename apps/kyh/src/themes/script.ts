import { BAR_SELECTOR, barColor, CHROMA_PROPERTY, HUE_PROPERTY, MODE_KEY } from "./paint";
import { DEFAULT_THEME, THEMES, windowIn } from "./index";

const FIRST_YEAR = 2026;
const LAST_YEAR = 2036;

const windowsBetween = (first: number, last: number) =>
  THEMES.flatMap((theme, index) =>
    Array.from({ length: last - first + 1 }, (_, offset) => windowIn(theme, first + offset))
      .filter((days) => days !== null)
      .flatMap(([from, to]) => [from, to, index]),
  );

const tints = THEMES.map(({ id, tint }) => (tint ? [id, tint.hue, tint.chroma] : null));
const modes = THEMES.map(({ mode }) => mode);
const bars = THEMES.map(({ tint }) => [barColor("light", tint), barColor("dark", tint)]);
const plain = THEMES.findIndex(({ id }) => id === DEFAULT_THEME);

/** The inline script, for the document's <head>. */
export const themeScript = (first = FIRST_YEAR, last = LAST_YEAR) =>
  `(()=>{const w=${JSON.stringify(windowsBetween(first, last))},t=${JSON.stringify(tints)},m=${JSON.stringify(modes)},d=new Date(),k=d.getFullYear()*1e4+(d.getMonth()+1)*100+d.getDate(),r=document.documentElement;let n=-1;for(let i=0;i<w.length;i+=3)if(k>=w[i]&&k<=w[i+1]){n=w[i+2];break}let o=null;try{o=localStorage.getItem(${JSON.stringify(MODE_KEY)})}catch{}const e=(n>=0&&m[n])||(o==="light"||o==="dark"?o:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),s=n>=0?t[n]:null;r.dataset.theme=e;r.style.setProperty("color-scheme",e);if(s){r.dataset.tint=s[0];r.style.setProperty(${JSON.stringify(HUE_PROPERTY)},s[1]);r.style.setProperty(${JSON.stringify(CHROMA_PROPERTY)},s[2])}let a=document.querySelector(${JSON.stringify(BAR_SELECTOR)});if(!a){a=document.createElement("meta");a.name="theme-color";document.head.prepend(a)}a.content=${JSON.stringify(bars)}[n>=0?n:${plain}][e==="dark"?1:0]})()`;
