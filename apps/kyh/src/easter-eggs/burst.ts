// What one find throws out of the cursor, like coins out of a block: a pop of
// confetti, and a handful of eggs (or the theme's pieces, src/themes) that
// spray out and then fly home to the avatar. Pure, given a random source, so the shape of a burst is asserted.
import type { ConfettiSide } from "@/themes/theme";
import { DEFAULT_THEME, themeOf } from "@/themes";

/** Eggs per find; the avatar pops once for each that lands. */
export const EGGS_PER_FIND = 5;
const PAPERS = 24;
const SEQUINS = 12;

/** One bit of confetti, in pixels from the cursor and pixels per frame (at 60fps). */
export interface Confetto {
  kind: "paper" | "sequin";
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Paper's size, or a sequin's radius in `width`. */
  width: number;
  height: number;
  rotation: number;
  /** Where in its flutter it starts, so no two flip together. */
  phase: number;
  front: string;
  back: string;
}

// Paper catches the air: light gravity, heavy drag, a slow terminal fall that
// it flutters through. Sequins are beads: they drop fast and barely slow.
const PHYSICS = {
  paper: { drag: 0.075, gravity: 0.3 },
  sequin: { drag: 0.02, gravity: 0.55 },
} as const;
const TERMINAL = 3;

export interface SprayedEgg {
  /** Where the spray throws it, from the cursor, in pixels. */
  x: number;
  y: number;
  /** Seconds before it heads home, so they land one at a time. */
  delay: number;
  tilt: number;
}

const between = (random: () => number, low: number, high: number) => low + random() * (high - low);

/**
 * A find's confetti: a small pop up and out of the cursor, about a hand high,
 * in the theme's colors. Paper shows its front and its back as it flips.
 */
export const throwConfetti = (
  random: () => number = Math.random,
  sides: readonly ConfettiSide[] = themeOf(DEFAULT_THEME).confetti,
): Confetto[] => {
  const side = (): ConfettiSide =>
    sides[Math.floor(random() * sides.length)] ?? { back: "white", front: "white" };
  const papers = Array.from({ length: PAPERS }, (): Confetto => {
    const { back, front } = side();
    return {
      back,
      front,
      height: between(random, 8, 15),
      kind: "paper",
      phase: between(random, 0, 100),
      rotation: between(random, 0, Math.PI * 2),
      vx: between(random, -5, 5),
      vy: -between(random, 4.5, 7.5),
      width: between(random, 5, 9),
      x: between(random, -6, 6),
      y: 0,
    };
  });
  const sequins = Array.from({ length: SEQUINS }, (): Confetto => {
    const { front } = side();
    const radius = between(random, 1.5, 2.6);
    return {
      back: front,
      front,
      height: radius,
      kind: "sequin",
      phase: 0,
      rotation: 0,
      vx: between(random, -3.5, 3.5),
      vy: -between(random, 6, 9),
      width: radius,
      x: between(random, -6, 6),
      y: 0,
    };
  });
  return [...papers, ...sequins];
};

/**
 * Moves a bit of confetti on by `frames` (60ths of a second), in place: drag,
 * gravity to a terminal fall, paper's sideways jitter. Returns how far round
 * its flip it is, -1 to 1: the sign says which side faces out.
 */
export const stepConfetto = (bit: Confetto, frames: number, random: () => number = Math.random) => {
  const { drag, gravity } = PHYSICS[bit.kind];
  bit.vx -= bit.vx * Math.min(1, drag * frames);
  bit.vy = Math.min(bit.vy + gravity * frames, TERMINAL);
  if (bit.kind === "paper") {
    bit.vx += (random() - 0.5) * frames;
  }
  bit.x += bit.vx * frames;
  bit.y += bit.vy * frames;
  return bit.kind === "paper" ? Math.cos((bit.y + bit.phase) * 0.09) : 1;
};

export const burstOf = (random: () => number = Math.random) => {
  // Eggs spray up and out in a fan, the way coins leave a block.
  const eggs: SprayedEgg[] = Array.from({ length: EGGS_PER_FIND }, (_, index) => {
    const angle = -Math.PI / 2 + ((index - (EGGS_PER_FIND - 1) / 2) / EGGS_PER_FIND) * Math.PI;
    const reach = between(random, 90, 140);
    return {
      delay: index * 0.09,
      tilt: between(random, -30, 30),
      x: Math.cos(angle) * reach,
      y: Math.sin(angle) * reach,
    };
  });
  return { eggs };
};
