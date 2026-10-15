// The town's opening, as a sim game's: it's built while the camera pulls
// back from downtown to the whole island, opens once the last building's up
// (its traffic comes out, the flyover takes over), and is cleared once the
// last machine has driven off. Pure: the engine ticks it and does what it says.
import { clamp01, easeInOut } from "./ease";

/** The longest a frame may move the build clock: a slow one (shaders compiling) slows it, never skips it (s). */
const LONGEST_FRAME = 0.05;
/** How much of the build the camera takes to pull back. */
const PULL_BACK = 0.8;

export type IntroPhase = "building" | "clearing" | "done";

interface IntroOptions {
  /** When the last building's up, on the build clock (s). */
  built: number;
  /** When the last machine's gone (s). */
  cleared: number;
  /** Reduced motion: no opening, the town's simply there. */
  still: boolean;
}

/** What a frame of the opening brought: it opened, or it's cleared. Each happens once. */
export interface IntroStep {
  opened: boolean;
  cleared: boolean;
}

export const createIntro = ({ built, cleared, still }: IntroOptions) => {
  /** The build clock; null once it's cleared. */
  let clock: number | null = still ? null : 0;
  let opened = still;
  let taken = false;
  return {
    /** The build clock (s), or null once it's over. */
    get clock() {
      return clock;
    },
    get phase(): IntroPhase {
      if (clock === null) {
        return "done";
      }
      return clock < built ? "building" : "clearing";
    },
    /**
     * How far the camera has pulled back from downtown toward the whole
     * island, 0 to 1, while it's building; null once the visitor's taken the
     * camera, or the building's done.
     */
    get pullBack() {
      return taken || clock === null || clock >= built
        ? null
        : easeInOut(clamp01(clock / (built * PULL_BACK)));
    },
    step: (elapsed: number): IntroStep => {
      if (clock === null) {
        return { cleared: false, opened: false };
      }
      clock += Math.min(elapsed, LONGEST_FRAME);
      const opening = !opened && clock >= built;
      opened ||= opening;
      const clearing = clock >= cleared;
      if (clearing) {
        clock = null;
      }
      return { cleared: clearing, opened: opening };
    },
    take: () => {
      taken = true;
    },
    /** Whether the visitor took the camera during the opening: the flyover then waits for idle. */
    get taken() {
      return taken;
    },
  };
};

export type Intro = ReturnType<typeof createIntro>;
