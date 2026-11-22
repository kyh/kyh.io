import type { Token } from "@/app/showcase/_components/city/palette";
import { INK, townColor } from "../piece";

/** A flat face in a palette color, and its ink round it this wide (none at 0). */
export const filled = (token: Token, ink = 0) =>
  ink > 0 ? { fill: townColor(token), stroke: INK, strokeWidth: ink } : { fill: townColor(token) };

/** A line this wide, in ink or a palette color. */
export const stroked = (width: number, token?: Token) => ({
  fill: "none",
  stroke: token ? townColor(token) : INK,
  strokeWidth: width,
});
