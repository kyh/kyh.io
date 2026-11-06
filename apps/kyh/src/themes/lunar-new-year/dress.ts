// What Lunar New Year puts on: a find throws red lanterns.
import type { Art } from "../art";
import type { Dress } from "../theme";
import { ellipse } from "../art";
import { namedConfetti } from "../theme";

/** A red paper lantern: hung from a hook, ribbed, gold caps, a tassel below. */
const LANTERN = {
  layers: [
    { d: "M12 1.8v3.6", strokeWidth: 1 },
    { d: ellipse(12, 12.6, 7.4, 6), fill: "festiveRed", shade: "festiveRedShade" },
    { d: "M12 6.7v11.8M8.4 7.6c-1.7 3-1.7 7.8 0 10M15.6 7.6c1.7 3 1.7 7.8 0 10", strokeWidth: 0.4 },
    {
      d: "M9.2 5.2h5.6a.8.8 0 0 1 .8.8v1.2H8.4V6a.8.8 0 0 1 .8-.8ZM8.4 18h7.2v1.2a.8.8 0 0 1-.8.8H9.2a.8.8 0 0 1-.8-.8Z",
      fill: "gold",
      shade: "goldShade",
    },
    { d: "M12 20v3M10.8 20.2l-.4 2.4M13.2 20.2l.4 2.4", strokeWidth: 1.7 },
    { d: "M12 20v3M10.8 20.2l-.4 2.4M13.2 20.2l.4 2.4", stroke: "festiveRed", strokeWidth: 0.8 },
  ],
} satisfies Art;

export const dress = {
  art: LANTERN,
  confetti: [
    { back: "#ff8a80", front: "#e11d2e" },
    { back: "#ff8a80", front: "#e11d2e" },
    ...namedConfetti("gold", "gold"),
  ],
  corners: null,
  drift: null,
} as const satisfies Dress;
