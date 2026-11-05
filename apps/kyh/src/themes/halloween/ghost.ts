// The ghost as a follower (`../follower/creature.ts`): its sheet (`sheet.ts`)
// floating after the mouse, its face (`face.ts`) flinching at a click, and
// what it says: BOO! when it's clicked on, a squeak when a click elsewhere
// makes it jump, and the odd moan while it's left hanging about. Pure.
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Ghost } from "./sheet";
import { createEmotes, say, stepEmotes } from "../follower/emote";
import { startle } from "./face";
import { createGhost, ghostPaths, HEAD, stepGhost } from "./sheet";

interface Haunt {
  ghost: Ghost;
  emotes: Emotes;
  /** Seconds the pointer's been still. */
  still: number;
}

const BOO = ["Boo!", "BOO!", "Boo! ✦"];
const EEK = ["eep!", "!!", "eek!"];
const MOAN = ["ooOOooo…", "boo?", "…booo", "spooky, huh?"];
/** Seconds of a still pointer before it moans, now and then. */
const BORED_S = 5;

export const ghost: Creature<Haunt> = {
  create: (at) => ({
    emotes: createEmotes(Math.round(at.x * 31 + at.y)),
    ghost: createGhost(at),
    still: 0,
  }),
  poke: (haunt, at) => {
    // A click wakes it from its boredom: it's quiet a while before it moans again.
    haunt.still = 0;
    startle(haunt.ghost.mood);
    const on = Math.hypot(at.x - haunt.ghost.x, at.y - haunt.ghost.y) < HEAD * 2;
    say(haunt.emotes, on ? BOO : EEK, on || haunt.emotes.random.chance(0.3));
  },
  pose: (haunt) => {
    const { blush, ...paths } = ghostPaths(haunt.ghost);
    return {
      at: { x: haunt.ghost.x, y: haunt.ghost.y },
      bubble: { x: 0, y: -HEAD - 8 },
      parts: {
        body: { d: paths.body },
        cheeks: { d: paths.cheeks, opacity: blush },
        creases: { d: paths.creases },
        eyes: { d: paths.eyes },
        mouth: { d: paths.mouth },
        shade: { d: paths.shade },
        shine: { d: paths.shine },
        squints: { d: paths.squints },
      },
      say: haunt.emotes.line,
    };
  },
  step: (haunt, pointer, moved, seconds) => {
    stepGhost(haunt.ghost, pointer, moved, seconds);
    haunt.still = Math.hypot(moved.x, moved.y) < 0.5 ? haunt.still + seconds : 0;
    stepEmotes(haunt.emotes, seconds);
    if (haunt.still > BORED_S) {
      say(haunt.emotes, MOAN);
    }
  },
};
