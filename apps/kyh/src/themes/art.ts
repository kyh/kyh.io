// A theme's piece as data: layers of paths in a 24×24 box, drawn the way
// the showcase draws its town (after Inkline Town): flat faces in the town's
// palette, outlined in its ink, the side turned from the light (right of the
// middle) in a darker color and dotted as the town's shade is. `piece.tsx`
// draws it, wherever it shows: the easter-egg bursts, the themes menu, the
// trail and the drift. Pure.
import type { Token } from "@/app/showcase/_components/city/palette";

export interface Layer {
  d: string;
  /** A face's color, from the town's palette; none when unset. */
  fill?: Token;
  /** The face's side turned from the light, right of `split`: this color, dotted. */
  shade?: Token;
  /** Where the shade starts across the box; the middle when unset. */
  split?: number;
  /** A line in a palette color (a stem, a tassel) rather than ink. */
  stroke?: Token;
  strokeWidth?: number;
  /** Ink round a face, this wide; a face gets the town's fine line when unset, 0 for none. */
  ink?: number;
  /** Swings about a point (in the box) from one angle to another and back, as a wing beats. */
  swing?: Swing;
}

/** Degrees, clockwise. */
export interface Swing {
  at: readonly [number, number];
  from: number;
  to: number;
}

export interface Art {
  layers: readonly Layer[];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** A point in a path, to the hundredth. */
export const point = (x: number, y: number) => `${round(x)} ${round(y)}`;

/** An ellipse as a path, turned `rotate` degrees about its center. */
export const ellipse = (cx: number, cy: number, rx: number, ry: number, rotate = 0) => {
  const angle = (rotate * Math.PI) / 180;
  const dx = round(rx * Math.cos(angle));
  const dy = round(rx * Math.sin(angle));
  const arc = `a${rx} ${ry} ${rotate} 1 0`;
  return `M${round(cx - dx)} ${round(cy - dy)}${arc} ${2 * dx} ${2 * dy}${arc} ${-2 * dx} ${-2 * dy}Z`;
};

export const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);

/** An egg, standing in the box: the golden egg's and the painted egg's shape. */
export const EGG = "M12 2C8 2 4.5 8.5 4.5 14a7.5 7.5 0 0 0 15 0C19.5 8.5 16 2 12 2Z";

/** Curves drawn about the origin (`M x y` then `C` triples), turned to `angle` degrees and moved to a point. */
export const placed = (
  points: readonly (readonly [number, number])[],
  at: readonly [number, number],
  angle: number,
) => {
  const turn = (angle * Math.PI) / 180;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const moved = points.map(([x, y]) => point(at[0] + x * cos - y * sin, at[1] + x * sin + y * cos));
  const [start, ...curves] = moved;
  const triples = Array.from({ length: curves.length / 3 }, (_, index) =>
    curves.slice(index * 3, index * 3 + 3).join(" "),
  );
  return `M${start}${triples.map((triple) => `C${triple}`).join("")}Z`;
};
