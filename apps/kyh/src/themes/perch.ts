// Where a hat let go lands, for `hat.tsx`: on the nearest corner it can sit
// on (the logo's, an app's, a dock icon's, the avatar's) within reach of its
// brim, else back on the logo. And how it moves, as kwadrants' tags do:
// carried, it leans into the way it's dragged; let go, it wobbles as it
// settles. Pure.

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

/** The most it leans carried, in degrees, and how far it leans a pixel moved. */
const MOST_LEAN = 8;
const LEAN = 0.8;

/** How far it leans carried, moved `dx` pixels across since the last move: into the move. */
export const leanFor = (dx: number) => Math.sign(dx) * Math.min(Math.abs(dx) * LEAN, MOST_LEAN);

/** How many keyframes the landing takes, and how long. */
const FRAMES = 20;
export const LANDING_MS = 380;

/**
 * The landing's keyframes: from `from` pixels away (the brim let go less where
 * it rests), carried bigger and leaning `lean` degrees off its own `tilt`, it
 * drops onto its perch with a little overshoot and wobbles still.
 */
export const landing = (from: { x: number; y: number }, tilt: number, lean: number) =>
  Array.from({ length: FRAMES + 1 }, (_, frame) => {
    const t = frame / FRAMES;
    // Out with a little overshoot, then the wobble dies with it.
    const left = (1 - t) ** 3 - 0.12 * Math.sin(t * Math.PI) * (1 - t);
    const scale = 1 + 0.15 * (1 - t) ** 2 + 0.06 * Math.cos(t * Math.PI * 2) * t * (1 - t) * 4;
    const rotate = tilt + lean * (1 - t) ** 4 + 4 * Math.sin(t * Math.PI * 3) * (1 - t);
    return {
      rotate: `${Math.round(rotate * 100) / 100}deg`,
      scale: Math.round(scale * 1000) / 1000,
      translate: `${Math.round(from.x * left * 10) / 10}px ${Math.round(from.y * left * 10) / 10}px`,
    };
  });
