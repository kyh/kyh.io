// The hooks' side of the streamer (stream/stream.ts): where it listens and
// writes, what to ask it for, and what its answers say.

import type { Effect } from "./sfx";

export type Mode = "image" | "cells";

export interface Frame {
  frame: number;
  width: number;
  height: number;
  columns: number;
  rows: number;
  score: number;
  coins: number;
  jumps: number;
  crashes: number;
  cells?: string;
}

// What a run has done so far, as counts that only grow.
export type Counts = Pick<Frame, "coins" | "jumps" | "crashes">;

export interface Heard {
  chimedAt: number;
  effects: Effect[];
}

export const countsOf = ({ coins, crashes, jumps }: Frame): Counts => ({
  coins,
  crashes,
  jumps,
});

// Coins come four in a row; one chime per few frames reads as a run of them.
const COIN_GAP_FRAMES = 3;

// The effects to sound between the last frame heard and this one: a crash
// drowns the rest; otherwise each new jump and coin (coins spaced out). Landings
// stay silent: one per jump is too many sounds under the narration.
// Nothing for the first frame, or a restarted streamer counting from zero.
export const effectsBetween = (last: Counts | null, frame: Frame, chimedAt: number): Heard => {
  if (!last || frame.coins < last.coins || frame.jumps < last.jumps) {
    return { chimedAt, effects: [] };
  }
  if (frame.crashes > last.crashes) {
    return { chimedAt, effects: ["crash"] };
  }
  const effects: Effect[] = [];
  if (frame.jumps > last.jumps) {
    effects.push("jump");
  }
  const isChime = frame.coins > last.coins && frame.frame - chimedAt >= COIN_GAP_FRAMES;
  if (isChime) {
    effects.push("coin");
  }
  return { chimedAt: isChime ? frame.frame : chimedAt, effects };
};

// A Unix socket's path fits in about 100 bytes (104 on macOS, 108 on Linux).
const SOCKET_PATH_MAX = 100;

// The socket and the frame file, in the user's temporary directory when its
// path is short enough for a socket, else /tmp.
export const placementOf = (tmpDir: string | undefined, id: string) => {
  const base = (tmpDir ?? "").replace(/\/+$/u, "");
  const name = `mod-surfer-${id}`;
  const dir =
    base.startsWith("/") && `${base}/${name}.sock`.length <= SOCKET_PATH_MAX ? base : "/tmp";
  return { imagePath: `${dir}/${name}.rgba`, socketPath: `${dir}/${name}.sock` };
};

// Whether the terminal speaks kitty's graphics protocol; when it turns out
// not to, a refused Image blit drops back to cells.
export const drawsImages = (term: string | undefined, termProgram: string | undefined) =>
  /kitty|ghostty/iu.test(term ?? "") || /ghostty/iu.test(termProgram ?? "");

export const frameUrl = (
  since: number,
  mode: Mode,
  columns: number,
  rows: number,
  isActive: boolean,
) =>
  `http://surfer/frame?since=${since}&mode=${mode}&columns=${columns}&rows=${rows}&active=${isActive ? 1 : 0}`;

const count = (headers: Readonly<Record<string, string>>, name: string) => {
  const value = Number(headers[`x-${name}`] ?? Number.NaN);
  return Number.isInteger(value) && value >= 0 ? value : Number.NaN;
};

// The streamer's answer: the frame's numbers in `x-` headers, and in the
// body its Raster cells, empty when the frame is an Image's file.
export const parseFrame = (
  headers: Readonly<Record<string, string>>,
  body: string,
): Frame | null => {
  const numbers = {
    coins: count(headers, "coins"),
    columns: count(headers, "columns"),
    crashes: count(headers, "crashes"),
    frame: count(headers, "frame"),
    height: count(headers, "height"),
    jumps: count(headers, "jumps"),
    rows: count(headers, "rows"),
    score: count(headers, "score"),
    width: count(headers, "width"),
  };
  if (Object.values(numbers).some((value) => Number.isNaN(value))) {
    return null;
  }
  return body ? { ...numbers, cells: body } : numbers;
};

// The last line a process wrote that says something, for the pane to show.
export const lastWords = (output: string) =>
  output
    .split("\n")
    .map((line) => line.trim())
    .findLast((line) => line.length > 0) ?? "";
