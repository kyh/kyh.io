// The hooks' side of the streamer (stream/stream.ts): where it listens and
// writes, what to ask it for, and what its answers say.

export type Mode = "image" | "cells";

export interface Frame {
  frame: number;
  width: number;
  height: number;
  columns: number;
  rows: number;
  coins: number;
  cells?: string;
}

// A Unix socket's path fits in about 100 bytes (104 on macOS, 108 on Linux).
const SOCKET_PATH_MAX = 100;

// The socket and the frame file, in the user's temporary directory when its
// path is short enough for a socket, else /tmp.
export const placementOf = (tmpDir: string | undefined, id: string) => {
  const base = (tmpDir ?? "").replace(/\/+$/u, "");
  const name = `mod-commuting-clawders-${id}`;
  const dir =
    base.startsWith("/") && `${base}/${name}.sock`.length <= SOCKET_PATH_MAX ? base : "/tmp";
  return { imagePath: `${dir}/${name}.rgba`, socketPath: `${dir}/${name}.sock` };
};

// Whether the terminal speaks kitty's graphics protocol; when it turns out
// not to, a refused Image blit drops back to cells.
export const drawsImages = (term: string | undefined, termProgram: string | undefined) =>
  /kitty|ghostty/iu.test(term ?? "") || /ghostty/iu.test(termProgram ?? "");

// What the world shows besides the picture: whether the run goes on, and its
// tokens for the score.
export interface Run {
  isActive: boolean;
  tokens: number;
}

export const frameUrl = (
  since: number,
  mode: Mode,
  columns: number,
  rows: number,
  { isActive, tokens }: Run,
) =>
  `http://clawders/frame?since=${since}&mode=${mode}&columns=${columns}&rows=${rows}&active=${isActive ? 1 : 0}&tokens=${tokens}`;

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
    frame: count(headers, "frame"),
    height: count(headers, "height"),
    rows: count(headers, "rows"),
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
