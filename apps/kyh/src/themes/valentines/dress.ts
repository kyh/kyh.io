// What Valentine's Day puts on: a find throws candy hearts.
import type { Art } from "../art";
import type { Dress } from "../theme";
import { HEART } from ".";

const CANDY_HEART = {
  layers: [{ d: HEART, fill: "festiveRed", shade: "festiveRedShade" }],
} satisfies Art;

export const dress = {
  art: CANDY_HEART,
  confetti: [
    { back: "#ffc2d6", front: "#ff4d8d" },
    { back: "#fda4af", front: "#e11d48" },
    { back: "#ffe4ec", front: "#ffffff" },
  ],
  corners: null,
  drift: null,
} as const satisfies Dress;
