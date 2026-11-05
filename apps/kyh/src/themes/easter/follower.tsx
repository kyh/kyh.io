"use client";

// What follows a mouse at Easter: a white rabbit (`bunny.ts`), drawn in the
// showcase town's hand as the theme's pieces are (`piece.tsx`): a white coat
// with its belly in the shaded white under the shade dots, a cotton tail,
// long ears lined pink, a pink nose and whiskers. Parts marked `data-part`
// are posed a frame at a time by the stage.
import type { Token } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { ellipse } from "../art";
import { Stage } from "../follower/stage";
import { filled, stroked } from "../follower/ink";
import { ShadeDots } from "../piece";
import { bunny } from "./bunny";

const BODY =
  "M-16 -6C-19 -16 -12 -26 -1 -26C7 -26 12 -21 13 -14C14 -7 10 -1 4 0H-11C-15 0 -16 -3 -16 -6Z";
const BELLY = "M13 -12C13 -5 9 -1 4 0H-11C-14 0 -15.5 -2 -16 -5C-8 -4 4 -5 13 -12Z";
const FOOT = ellipse(-5, -1.6, 8, 2.4);
const PAWS = `${ellipse(7.4, -1.6, 2.6, 1.7)}${ellipse(11, -1.6, 2.6, 1.7)}`;
const SKULL = ellipse(0, 0, 8.2, 6.6, 14);
const EAR = "M-1.4 -5C-4.4 -12 -4.4 -21 -1.4 -25C1.8 -23 3 -14 1.6 -5Z";
const EAR_LINING = "M-0.8 -7.4C-2.6 -12 -2.6 -19 -1.1 -22C0.6 -19 1.2 -13 0.6 -7.4Z";
const NOSE = "M6.6 0.4H8.8L7.7 1.8Z";
const WHISKERS = "M7.4 2l5.4 -1.4M7.4 2.4l5.6 0.8M7.2 2.8l4.6 2.4";
const Ear = ({ index, token }: { index: number; token: Token }) => (
  <g data-part={`ear-${index}`}>
    <path d={EAR} style={filled(token, 1)} />
    <path d={EAR_LINING} style={filled("accentPink")} />
  </g>
);

export const Follower = () => {
  const id = useSvgId("bunny");
  return (
    <Stage creature={bunny} box={{ height: 130, width: 130, x: -65, y: -110 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={1} />
      </defs>
      <g data-part="flip">
        <g data-part="body">
          <path data-part="foot" d={FOOT} style={filled("whiteShade", 1)} />
          <circle cx={-16} cy={-11} r={4.2} style={filled("white", 1)} />
          <path d={BODY} style={filled("white")} />
          <path d={BELLY} style={filled("whiteShade")} />
          <path d={BELLY} fill={`url(#${id}-dots)`} />
          <path d={BODY} style={stroked(1.3)} />
          <path d="M-10 -14C-8 -9 -4 -6 1 -5" style={stroked(0.7)} />
          <path data-part="paws" d={PAWS} style={filled("white", 0.9)} />
          <g data-part="head">
            <Ear index={0} token="whiteShade" />
            <path d={SKULL} style={filled("white")} />
            <path d={SKULL} style={stroked(1.2)} />
            <Ear index={1} token="white" />
            <circle data-part="eye" cx={2.6} cy={-1.6} r={1.5} style={filled("screen")} />
            <circle cx={2.1} cy={-2.1} r={0.5} style={filled("white")} />
            <path data-part="eyelid" d="M1.2 -1.4h2.8" style={{ ...stroked(0.8), opacity: 0 }} />
            <path data-part="nose" d={NOSE} style={filled("accentPink")} />
            <path d={WHISKERS} style={stroked(0.4)} />
          </g>
        </g>
      </g>
    </Stage>
  );
};
