import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";

export interface Emotes {
  /** What its bubble says now; null, nothing. */
  line: string | null;
  /** Seconds the line shows yet. */
  left: number;
  /** Seconds till it'll speak unprompted again. */
  quiet: number;
  random: Random;
}

const LINE_S = 1.6;
const LETTER_S = 0.04;
const QUIET_S = 3;
const QUIET_MORE_S = 4;

export const createEmotes = (seed: number) => ({
  left: 0,
  line: null,
  quiet: 1,
  random: createRandom(seed),
});

/**
 * Says one of `lines`, never the one it's saying: at once when `now` (a
 * click, a petting), else only when it's been quiet a while. Whether it spoke.
 */
export const say = (emotes: Emotes, lines: readonly string[], now = false) => {
  if (lines.length === 0 || (!now && (emotes.quiet > 0 || emotes.line !== null))) {
    return false;
  }

  const fresh = lines.filter((line) => line !== emotes.line);
  const line = emotes.random.pick(fresh.length > 0 ? fresh : lines);
  emotes.line = line;
  emotes.left = LINE_S + line.length * LETTER_S;
  emotes.quiet = QUIET_S + emotes.random.next() * QUIET_MORE_S;

  return true;
};

/** Answers a petting at once without cutting a click's line short: it goes on, with a heart. */
export const sayWithHeart = (emotes: Emotes, lines: readonly string[]) =>
  say(emotes, emotes.line && !emotes.line.endsWith("♥") ? [`${emotes.line} ♥`] : lines, true);

/** Steps it `seconds` on: the line runs out, then the quiet. */
export const stepEmotes = (emotes: Emotes, seconds: number) => {
  let rest = seconds;

  if (emotes.line !== null) {
    emotes.left -= rest;

    if (emotes.left > 0) {
      return;
    }

    emotes.line = null;
    rest = -emotes.left;
    emotes.left = 0;
  }

  emotes.quiet = Math.max(0, emotes.quiet - rest);
};

/** Seconds a mouse rests on a follower before it's a petting. */
export const PETTED_S = 0.5;

/**
 * Whether a time held (a petting, `seconds` longer this step) has just
 * passed `mark`: the one step to answer it on, whatever's being said.
 */
export const reached = (held: number, seconds: number, mark: number) =>
  held > mark && held - seconds <= mark;
