"use client";

// What follows a mouse at Christmas: an Adélie penguin in a red scarf
// (`penguin.ts`), drawn in the showcase town's hand as the theme's pieces are
// (`piece.tsx`): a black back and flippers, a white front with its
// underside in the shaded white under the shade dots, a white ring round its
// eye, a dark beak, pink feet, and a red scarf striped white whose end swings
// as it goes. Parts marked `data-part` are posed a frame at a time by the
// stage.
import type { Token } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { penguin } from "./penguin";

const BODY =
  "M1 -42C8 -42 12 -36 12 -28C12 -18 13 -10 10 -5C7 -1 3 0 -1 0C-6 0 -10 -2 -12 -6C-14 -11 -12 -20 -10 -28C-8 -36 -5 -42 1 -42Z";
const FRONT = "M8 -31C11 -26 12.6 -18 12 -11C11 -6 8 -2 3 -1C-2 -1 -4 -3 -4 -6C0 -10 4 -20 8 -31Z";
const UNDERSIDE = "M12.2 -12C11 -6 8 -2 3 -1C-2 -1 -4 -3 -4 -6C2 -6.5 8 -8.5 12.2 -12Z";
const TAIL = "M-11.6 -6.4L-16.4 -1.6L-10.6 -2.8Z";
const FLIPPER = "M-1 -28.6C-6.4 -25 -8.4 -17 -7.2 -10.6C-4.2 -15 -1 -21 0.4 -26.4Z";
const SCARF = "M-11 -28.4C-4 -24.6 6 -24.6 11.2 -28.6L11.8 -24.6C6 -20.8 -4 -20.8 -11.6 -24.6Z";
const SCARF_STRIPES = "M-6 -25.6v3.8M0 -24.4v3.8M6 -25.2v3.6";
const SCARF_END = "M-10 -26.4L-15.6 -14.4L-12 -13.4L-7 -24.6Z";
const UPPER_BEAK = "M9 -34.2L15.6 -32.2L9 -31.2Z";
const LOWER_BEAK = "M9 -32L14.6 -31.4L9 -30.4Z";
const FOOT = "M-2 -0.6C0 -1.8 4 -1.8 6.2 -0.4L5.2 0.5H-2Z";

const Foot = ({ index, token }: { index: number; token: Token }) => (
  <path data-part={`foot-${index}`} d={FOOT} style={filled(token, 0.8)} />
);

export const Follower = () => {
  const id = useSvgId("penguin");
  return (
    <Stage creature={penguin} box={{ height: 120, width: 130, x: -65, y: -100 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={0.9} />
      </defs>
      <g data-part="flip">
        <Foot index={1} token="roofPinkShade" />
        <Foot index={0} token="accentPink" />
        <g data-part="body">
          <path d={TAIL} style={filled("screen", 0.8)} />
          <path d={BODY} style={filled("screen")} />
          <path d={FRONT} style={filled("white")} />
          <path d={UNDERSIDE} style={filled("whiteShade")} />
          <path d={UNDERSIDE} fill={`url(#${id}-dots)`} />
          <path d={BODY} style={stroked(1.3)} />
          <g data-part="head">
            <circle cx={5} cy={-34.4} r={2.3} style={filled("white", 0.6)} />
            <circle data-part="eye" cx={5.4} cy={-34.4} r={1.1} style={filled("screen")} />
            <path data-part="eyelid" d="M3.6 -34.2h3" style={{ ...stroked(0.8), opacity: 0 }} />
            <path data-part="beak" d={LOWER_BEAK} style={filled("screen", 0.6)} />
            <path d={UPPER_BEAK} style={filled("screen", 0.7)} />
          </g>
          <g data-part="scarf">
            <path d={SCARF_END} style={filled("festiveRed", 0.8)} />
            <path d="M-11.8 -19.6l3.6 1.6" style={stroked(1, "white")} />
          </g>
          <path d={SCARF} style={filled("festiveRed", 0.9)} />
          <path d={SCARF_STRIPES} style={stroked(1.1, "white")} />
          <path data-part="flipper" d={FLIPPER} style={filled("screen", 0.9)} />
        </g>
      </g>
    </Stage>
  );
};
