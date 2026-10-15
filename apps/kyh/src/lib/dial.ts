// The theme toggle's easter egg: five quick taps turn it into two dials,
// brightness (dark 0 → light 100) and hue (the slate greys turned round the
// wheel). Pure: the dock applies what these return.

export const TAPS = 5;
export const TAP_GAP_MS = 600;

/** The taps still in the streak after one at `now`: a pause longer than the gap starts over. */
export const tapStreak = (taps: readonly number[], now: number): number[] => {
  const last = taps.at(-1);
  return last !== undefined && now - last <= TAP_GAP_MS ? [...taps, now] : [now];
};

export interface Dial {
  /** 0 dark … 100 light; null follows the theme. */
  light: number | null;
  /** Degrees; null keeps the slate greys. */
  hue: number | null;
}

export const NO_DIAL: Dial = { hue: null, light: null };

/** Slate's own hue: where the hue dial starts. */
export const SLATE_HUE = 257;

/** The light half of the brightness dial wears the light theme. */
export const themeOf = (light: number) => (light >= 50 ? "light" : "dark");

// Tailwind's slate in oklch (lightness %, chroma); the ends are tinted too so
// the hue reaches the page background.
const greys: [name: string, l: number, c: number][] = [
  ["gray0", 99.5, 0.004],
  ["gray50", 98.4, 0.003],
  ["gray100", 96.8, 0.007],
  ["gray200", 92.9, 0.013],
  ["gray300", 86.9, 0.022],
  ["gray400", 70.4, 0.04],
  ["gray500", 55.4, 0.046],
  ["gray600", 44.6, 0.043],
  ["gray700", 37.2, 0.044],
  ["gray800", 27.9, 0.041],
  ["gray900", 20.8, 0.042],
  ["gray950", 12.9, 0.042],
  ["gray1000", 7, 0.03],
];

// Slate's chroma is faint; turned to another hue it needs more to read.
const CHROMA_BOOST = 2;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type DialVar = readonly [property: `--${string}`, value: string];

/** The custom properties a dial sets on <html>. `--dial-light` is what global.css blends the backgrounds by. */
export const dialVars = ({ light, hue }: Dial): DialVar[] => {
  const vars: DialVar[] = [];
  if (light !== null) {
    vars.push(["--dial-light", `${clamp(Math.round(light), 0, 100)}%`]);
  }
  if (hue !== null) {
    const h = ((Math.round(hue) % 360) + 360) % 360;
    for (const [name, l, c] of greys) {
      vars.push([`--colors-${name}`, `oklch(${l}% ${+(c * CHROMA_BOOST).toFixed(3)} ${h})`]);
    }
  }
  return vars;
};

/** Every property a dial can set, to clear the ones it no longer does. */
export const DIAL_PROPERTIES = dialVars({ hue: 0, light: 0 }).map(([property]) => property);

export const DIAL_KEY = "kyh-dial";
export const DIAL_VARS_KEY = "kyh-dial-vars";

const level = (text: string | undefined, max: number) => {
  const n = text ? Number(text) : Number.NaN;
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};

/** What's stored for the sliders: `light,hue`, either one blank when unset. */
export const writeDial = ({ light, hue }: Dial) => `${light ?? ""},${hue ?? ""}`;

/** A stored dial, or none when the value is missing or not one of ours. */
export const readDial = (raw: string | null): Dial => {
  const [light, hue] = (raw ?? "").split(",");
  return { hue: level(hue, 360), light: level(light, 100) };
};

/** Runs before paint so a dialled page doesn't flash the stock palette: it applies the stored vars as they are. */
export const restoreScript = `try{var v=JSON.parse(localStorage.getItem(${JSON.stringify(DIAL_VARS_KEY)})||"[]"),r=document.documentElement;v.forEach(function(p){r.style.setProperty(p[0],p[1]);if(p[0]==="--dial-light")r.dataset.dial=""})}catch(e){}`;
