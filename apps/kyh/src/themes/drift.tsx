"use client";

import { useReducedMotion } from "motion/react";

import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import { useSvgId } from "@/lib/svg-id";
import type { Art } from "./art";
import type { Drift } from "./theme";
import { PieceDefs, PieceLayers } from "./piece";
import { themeOf } from "./index";
import { useTheme } from "./store";

type Motion = "flutter" | "tumble";

interface Piece {
  delay: number;
  duration: number;
  size: number;
  sway: number;
  x: number;
  drawn: number | null;
  motion: Motion;
  swing: number;
  turn: number;
  dip: number;
  wind: number;
}

const SNOW = 48;
const LEAVES = 18;
const TUMBLING = 0.3;

const snowOf = (random: Random, index: number) => {
  const drawn = index % 5 === 0 ? 0 : null;
  const duration = drawn === null ? random.range(8, 18) : random.range(11, 19);

  return {
    delay: -random.range(0, duration),
    dip: 0,
    drawn,
    duration,
    motion: "flutter",
    size: drawn === null ? random.range(3, 7) : random.range(14, 26),
    sway: random.range(12, 42),
    swing: duration / 4,
    turn: 0,
    wind: 0,
    x: random.range(0, 100),
  } satisfies Piece;
};

const leafOf = (random: Random, index: number, kinds: number) => {
  const motion = random.chance(TUMBLING) ? "tumble" : "flutter";
  const duration = motion === "tumble" ? random.range(8, 12) : random.range(14, 22);

  return {
    delay: -random.range(0, duration),
    dip: random.range(8, 18),
    drawn: index % kinds,
    duration,
    motion,
    size: random.range(16, 30),
    sway: motion === "tumble" ? random.range(6, 14) : random.range(28, 60),
    swing: random.range(1.4, 2.6),
    turn: motion === "tumble" ? random.range(0.9, 1.6) : random.range(1.2, 2.4),
    wind: random.range(4, 18),
    x: random.range(-10, 95),
  } satisfies Piece;
};

const layoutOf = (drift: Drift, kinds: number) => {
  const random = createRandom(drift === "snow" ? 7 : 11);

  return drift === "snow"
    ? Array.from({ length: SNOW }, (_, index) => snowOf(random, index))
    : Array.from({ length: LEAVES }, (_, index) => leafOf(random, index, kinds));
};

const styleOf = ({ delay, dip, duration, size, sway, swing, turn, wind, x }: Piece) =>
  ({
    "--drift-delay": `${delay}s`,
    "--drift-duration": `${duration}s`,
    "--drift-size": `${size}px`,
    "--drift-sway": `${sway}px`,
    "--drift-wind": `${wind}vw`,
    "--drift-x": `${x}%`,
    "--leaf-dip": `${dip}px`,
    "--leaf-swing": `${swing}s`,
    "--leaf-turn": `${turn}s`,
  }) as React.CSSProperties;

const Falling = ({
  piece,
  kind,
  pieces,
  id,
}: {
  piece: Piece;
  kind: Drift;
  pieces: readonly Art[];
  id: string;
}) => {
  const art = piece.drawn === null ? undefined : pieces[piece.drawn];

  if (!art) {
    return <span className="theme-drift-sway theme-drift-dot" />;
  }

  const drawing = <PieceLayers art={art} id={`${id}-${piece.drawn ?? 0}`} />;

  if (kind === "snow") {
    return (
      <svg viewBox="0 0 24 24" className="theme-drift-sway">
        {drawing}
      </svg>
    );
  }

  return (
    <span className="theme-drift-sway" data-motion={piece.motion}>
      <svg viewBox="0 0 24 24" className="theme-drift-turn">
        {drawing}
      </svg>
    </span>
  );
};

export const ThemeDrift = () => {
  const { drift } = themeOf(useTheme());
  const still = useReducedMotion();
  const id = useSvgId("piece");

  if (drift === null || still) {
    return null;
  }

  const layout = layoutOf(drift.kind, drift.pieces.length);

  return (
    <div className="theme-drift" data-drift={drift.kind} aria-hidden="true">
      <svg className="absolute size-0">
        <defs>
          {drift.pieces.map((art, index) => (
            <PieceDefs key={index} art={art} id={`${id}-${index}`} />
          ))}
        </defs>
      </svg>
      {layout.map((piece, index) => (
        <span key={index} className="theme-drift-piece" style={styleOf(piece)}>
          <Falling piece={piece} kind={drift.kind} pieces={drift.pieces} id={id} />
        </span>
      ))}
    </div>
  );
};
