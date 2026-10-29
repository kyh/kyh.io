// A chibi face, for the ghost (`sheet.ts`), after the chibi plants': big
// round eyes set wide and low, each with a big shine up and in and a small
// one down and out, a tiny round mouth and blushing cheeks. It blinks, a
// quick close and a softer open with the odd double; it goes wide-eyed and
// open-mouthed when it's hurried; and it screws its eyes shut into > < and
// blushes when it's poked, startled by a click or brought up short. Drawn
// in the showcase town's hand: flat faces, no gradients. In the head's own
// pixels, +y down, its middle at the origin. Pure (state is stepped in place,
// for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import { ellipse, point } from "./art";

interface Point {
  x: number;
  y: number;
}

export interface Mood {
  /** 0 open to 1 shut, and where it's going. */
  blink: number;
  blinkTarget: 0 | 1;
  /** Seconds till the next blink. */
  nextBlink: number;
  /** 0 to 1: hurried, eyes and mouth wide. */
  excite: number;
  /** 0 to 1: eyes screwed shut into > <. */
  squint: number;
  /** Seconds the squint is held for yet. */
  squintHold: number;
  random: Random;
}

/** What it's feeling, a frame: how fast the pointer moved (pixels), whether it's poked, and how hard it was brought up short (0 to 1). */
export interface Cues {
  moved: number;
  poked: boolean;
  jolt: number;
}

const EYE_R = 2.9;
const EYE_SEP = 5.2;
const EYE_Y = 0.6;
const MOUTH_R = 1.1;
const MOUTH_Y = EYE_Y + 2.6;
const CHEEK_R = 1.9;
const CHEEK_X = EYE_SEP + EYE_R + 1.6;
const CHEEK_Y = EYE_Y + 1.9;
/** Seconds a poke or a startle holds its eyes shut. */
const STARTLE_S = 0.45;

export const createMood = (seed: number): Mood => ({
  blink: 0,
  blinkTarget: 0,
  excite: 0,
  nextBlink: 1.2,
  random: createRandom(seed),
  squint: 0,
  squintHold: 0,
});

/** A click anywhere startles it: it flinches, screwing its eyes into > < for a moment. */
export const startle = (mood: Mood) => {
  mood.squintHold = Math.max(mood.squintHold, STARTLE_S);
};

/** Steps its feelings `seconds` on. */
export const stepMood = (mood: Mood, seconds: number, cues: Cues) => {
  const dt = Math.min(seconds, 0.1);
  // Blinks: a quick close and a softer open, every two to five seconds, now and then twice.
  mood.nextBlink -= dt;
  if (mood.nextBlink <= 0 && mood.blinkTarget === 0) {
    mood.blinkTarget = 1;
    mood.nextBlink = 2 + mood.random.next() * 3.2 + (mood.random.chance(0.18) ? -1.75 : 0);
  }
  const blinkRate = mood.blinkTarget === 1 ? 26 : 13;
  mood.blink += (mood.blinkTarget - mood.blink) * Math.min(1, dt * blinkRate);
  if (mood.blink > 0.93) {
    mood.blinkTarget = 0;
  }
  // > < a moment after it's poked (it floats off a pointer, so a poke is brief) or jolted.
  if (cues.poked) {
    mood.squintHold = Math.max(mood.squintHold, STARTLE_S);
  }
  if (cues.jolt > 0.2) {
    mood.squintHold = Math.max(mood.squintHold, 0.2 + cues.jolt * 0.35);
  }
  mood.squintHold = Math.max(0, mood.squintHold - dt);
  const squintTarget = mood.squintHold > 0 ? 1 : 0;
  const squintRate = squintTarget > mood.squint ? 22 : 9;
  mood.squint += (squintTarget - mood.squint) * Math.min(1, dt * squintRate);
  // Hurried, it goes wide-eyed; it calms as it slows.
  mood.excite = Math.min(1, Math.max(0, mood.excite - dt * 1.4) + cues.moved * 0.004);
};

const smoothstep = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

export interface FacePaths {
  /** Its eyes, in the town's dark. */
  eyes: string;
  /** The shine in them. */
  shine: string;
  /** Its eyes screwed shut, > <, a line in the town's dark. */
  squints: string;
  mouth: string;
  cheeks: string;
  /** How hard it blushes, 0 to 1. */
  blush: number;
}

/**
 * Its face, about the head's middle: turned `tilt` radians with the head, the
 * eyes and mouth led a little toward where it's looking (`look`, pixels).
 */
export const facePaths = (mood: Mood, look: Point, tilt: number): FacePaths => {
  const turn = (x: number, y: number) => ({
    x: x * Math.cos(tilt) - y * Math.sin(tilt),
    y: x * Math.sin(tilt) + y * Math.cos(tilt),
  });
  const degrees = (tilt * 180) / Math.PI;
  // A squint first shuts the eyes like a blink, then they scrunch into > <.
  const shut = Math.max(mood.blink, smoothstep(0, 0.55, mood.squint));
  const scrunch = smoothstep(0.45, 0.8, mood.squint);
  const r = EYE_R * (1 + mood.excite * 0.3) * (1 - shut * 0.3);
  const tall = r * (1 - shut * 0.94);

  let eyes = "";
  let shine = "";
  let squints = "";
  for (const side of [-1, 1]) {
    const cx = EYE_SEP * side + look.x;
    const cy = EYE_Y + look.y;
    if (scrunch < 0.5) {
      const c = turn(cx, cy);
      eyes += ellipse(c.x, c.y, r, tall, degrees);
      if (shut < 0.5) {
        const big = turn(cx - r * 0.3, cy - r * 0.34);
        const small = turn(cx + r * 0.28, cy + r * 0.3);
        shine +=
          ellipse(big.x, big.y, r * 0.3, r * 0.3) + ellipse(small.x, small.y, r * 0.14, r * 0.14);
      }
    } else {
      // Pointing at the nose: > on the left, < on the right.
      const a = EYE_R * 0.55;
      const arm = EYE_R * 0.6;
      const [top, tip, bottom] = [
        turn(cx - a * side * -1, cy - arm),
        turn(cx + a * side * -1, cy),
        turn(cx - a * side * -1, cy + arm),
      ];
      squints += `M${point(top.x, top.y)}L${point(tip.x, tip.y)}L${point(bottom.x, bottom.y)}`;
    }
  }

  const mr = MOUTH_R * (1 + mood.excite * 0.5);
  const m = turn(look.x * 0.6, MOUTH_Y + look.y * 0.5);
  const mouth = ellipse(m.x, m.y, mr, mr / 1.4, degrees);

  let cheeks = "";
  for (const side of [-1, 1]) {
    const c = turn(CHEEK_X * side + look.x * 0.4, CHEEK_Y + look.y * 0.4);
    cheeks += ellipse(c.x, c.y, CHEEK_R, CHEEK_R * 0.75, degrees);
  }
  const blush = Math.min(1, 0.55 * (1 + mood.squint * 0.6));
  return { blush, cheeks, eyes, mouth, shine, squints };
};

/** The squint's stroke, in the head's pixels. */
export const SQUINT_WIDTH = EYE_R * 0.34;
