// What one find throws out of the cursor, like coins out of a block: a pop of
// confetti, and a handful of eggs that spray out and then fly home to the
// avatar. Pure, given a random source, so the shape of a burst is asserted.
import { colorNamed, GOLD } from "@/lib/color";

/** Eggs per find; the avatar pops once for each that lands. */
export const EGGS_PER_FIND = 5;
const CONFETTI = 28;

// Mostly gold, flecked with the visitors' own colors.
const COLORS = [
  GOLD.color,
  GOLD.hue,
  ...["crimson", "blue", "green", "plum"].map((name) => colorNamed(name)?.color ?? GOLD.color),
];

export interface Confetto {
  /** Where it ends up from the cursor, in pixels. */
  x: number;
  /** How high it pops before it falls. */
  up: number;
  /** How far below the cursor it ends. */
  fall: number;
  rotate: number;
  color: string;
  wide: boolean;
}

export interface SprayedEgg {
  /** Where the spray throws it, from the cursor, in pixels. */
  x: number;
  y: number;
  /** Seconds before it heads home, so they land one at a time. */
  delay: number;
  tilt: number;
}

const between = (random: () => number, low: number, high: number) => low + random() * (high - low);

export const burstOf = (random: () => number = Math.random) => {
  const confetti: Confetto[] = Array.from({ length: CONFETTI }, (_, index) => {
    const angle = (index / CONFETTI) * Math.PI * 2 + between(random, -0.2, 0.2);
    const reach = between(random, 60, 130);
    return {
      color: COLORS[index % COLORS.length] ?? "gold",
      fall: between(random, 80, 160),
      rotate: between(random, -540, 540),
      up: Math.min(0, Math.sin(angle) * reach) - between(random, 40, 90),
      wide: random() > 0.5,
      x: Math.cos(angle) * reach,
    };
  });
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
  return { confetti, eggs };
};
