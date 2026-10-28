// Where a hat let go lands, for `hat.tsx`: on the nearest corner it can sit
// on (the logo's, an app's, a dock icon's, the avatar's) within reach of its
// brim, else back on the logo. Pure.

export interface Perch {
  key: string;
  /** The corner the brim sits on, in the screen's pixels. */
  x: number;
  y: number;
}

/** The hat's own place, on the homepage's logo. */
export const HOME = "logo";
/** Pixels from a corner that a brim let go still lands on it. */
export const PERCH_REACH = 72;

/** The perch nearest the brim, if one's in reach; else home. */
export const perchFor = (brim: { x: number; y: number }, perches: readonly Perch[]) => {
  let best = HOME;
  let nearest = PERCH_REACH;
  for (const { key, x, y } of perches) {
    const distance = Math.hypot(x - brim.x, y - brim.y);
    if (distance < nearest) {
      best = key;
      nearest = distance;
    }
  }
  return best;
};
