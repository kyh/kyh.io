import { clamp01, easeInOut } from "./ease";

const LONGEST_FRAME = 0.05;
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
  let clock: number | null = still ? null : 0;
  let opened = still;
  let taken = false;

  return {
    get clock() {
      return clock;
    },
    get phase() {
      if (clock === null) {
        return "done";
      }

      return clock < built ? "building" : "clearing";
    },
    get pullBack() {
      return taken || clock === null || clock >= built
        ? null
        : easeInOut(clamp01(clock / (built * PULL_BACK)));
    },
    step: (elapsed: number) => {
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
    get taken() {
      return taken;
    },
  };
};

export type Intro = ReturnType<typeof createIntro>;
