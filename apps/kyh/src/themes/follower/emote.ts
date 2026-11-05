// What a follower says (`stage.tsx` floats it over its head in a bubble): a
// line at a time, held long enough to read, and then a quiet spell before it
// pipes up again unprompted. Each creature picks what to say and when; this
// keeps the bubble from chattering. Pure (state is stepped in place, for a
// frame's sake).
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

/** Seconds a line shows, plus a little a letter, so a long one can be read. */
const LINE_S = 1.6;
const LETTER_S = 0.04;
/** Seconds of quiet after a line, at least, and up to this much more. */
const QUIET_S = 3;
const QUIET_MORE_S = 4;

export const createEmotes = (seed: number): Emotes => ({
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

/** Steps it `seconds` on: the line runs out, then the quiet. */
export const stepEmotes = (emotes: Emotes, seconds: number) => {
  if (emotes.line !== null) {
    emotes.left -= seconds;
    if (emotes.left <= 0) {
      emotes.line = null;
    }
    return;
  }
  emotes.quiet = Math.max(0, emotes.quiet - seconds);
};
