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

const SOCKET_PATH_MAX = 100;

export const placementOf = (tmpDir: string | undefined, id: string) => {
  const base = (tmpDir ?? "").replace(/\/+$/u, "");
  const name = `commuting-clawders-${id}`;

  const dir =
    base.startsWith("/") && `${base}/${name}.sock`.length <= SOCKET_PATH_MAX ? base : "/tmp";

  return { imagePath: `${dir}/${name}.rgba`, socketPath: `${dir}/${name}.sock` };
};

export const drawsImages = (term: string | undefined, termProgram: string | undefined) =>
  /kitty|ghostty/iu.test(term ?? "") || /ghostty/iu.test(termProgram ?? "");

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

export const parseFrame = (headers: Readonly<Record<string, string>>, body: string) => {
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

export const lastWords = (output: string) =>
  output
    .split("\n")
    .map((line) => line.trim())
    .findLast((line) => line.length > 0) ?? "";
