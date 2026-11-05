"use client";

// What follows a mouse on St. Patrick's Day: a leprechaun (`leprechaun.ts`),
// drawn in the showcase town's hand as the theme's pieces are (`piece.tsx`):
// a green coat with its tails in the darker green under the shade dots, a
// black belt and gold buckles, white stockings, black shoes, a red beard and
// a buckled green hat, and a gold coin to flip. Parts marked `data-part` are
// posed a frame at a time by the stage.
import type { Token } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { leprechaun } from "./leprechaun";

const COAT =
  "M-5.6 -41C-7.6 -34 -8.6 -26 -9.6 -18C-6 -16.4 5.6 -16.4 7.6 -18C7 -26 6.4 -34 4.8 -41C2 -42.4 -3 -42.4 -5.6 -41Z";
const TAILS = "M-8.4 -25C-11 -21.6 -12 -16 -11 -12.6L-8 -16.6Z";
const LAPEL = "M3.6 -40.6L1.6 -33.4L5.6 -36.4";
const SHOE = "M-2.4 -2.6C-2.6 -3.6 1 -3.6 3.4 -2.2C5.6 -1.4 5.8 0 4.6 0H-2.4Z";
const FACE =
  "M-5.6 0C-5.6 -3.6 -3 -6 0.4 -6C3.6 -6 6 -3.6 6 0C6 3.4 3.6 5.8 0.4 5.8C-3 5.8 -5.6 3.4 -5.6 0Z";
const BEARD =
  "M-4.6 0.6C-5.8 6 -2.2 11 2.6 10.8C6.2 10.6 8 7 7 3.2C5.4 5.2 2.6 5.6 0.4 4.6C-1.6 3.8 -3.4 2.4 -4.6 0.6Z";
const SIDEBURN = "M-4.6 0.6C-5.4 -1.4 -5.2 -3.4 -4.2 -4.6";
const BRIM = "M-8.6 -6.6H8.8V-4.4H-8.6Z";
const CROWN = "M-5.4 -6.6L-4.6 -17.4H4.4L5.4 -6.6Z";
const BAND = "M-5.2 -9.6H5.2V-6.8H-5.2Z";
const BUCKLE = "M-1.7 -10H1.9V-6.4H-1.7Z";

const Leg = ({ index, token }: { index: number; token: Token }) => (
  <>
    <path data-part={`leg-${index}`} style={stroked(4.6)} />
    <path data-part={`leg-${index}`} style={stroked(3, token)} />
    <g data-part={`shoe-${index}`}>
      <path d={SHOE} style={filled("screen", 0.8)} />
      <rect x={0} y={-3} width={1.8} height={1.6} style={filled("gold", 0.4)} />
    </g>
  </>
);

const Arm = ({ index, token }: { index: number; token: Token }) => (
  <>
    <path data-part={`arm-${index}`} style={stroked(5)} />
    <path data-part={`arm-${index}`} style={stroked(3.4, token)} />
    <circle data-part={`hand-${index}`} r={1.9} style={filled("skin", 0.8)} />
  </>
);

export const Follower = () => {
  const id = useSvgId("leprechaun");
  return (
    <Stage creature={leprechaun} box={{ height: 120, width: 120, x: -60, y: -100 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={1} />
      </defs>
      <g data-part="flip">
        <Arm index={1} token="festiveGreenShade" />
        <Leg index={1} token="whiteShade" />
        <Leg index={0} token="white" />
        <g data-part="body">
          <path d={TAILS} style={filled("festiveGreenShade")} />
          <path d={TAILS} fill={`url(#${id}-dots)`} />
          <path d={TAILS} style={stroked(0.9)} />
          <path d={COAT} style={filled("festiveGreen", 1.2)} />
          <path d={LAPEL} style={stroked(0.7)} />
          <path d="M-9.2 -25.4H7.4" style={stroked(2.6, "screen")} />
          <path d="M-1.4 -27H2.2V-23.8H-1.4Z" style={filled("gold", 0.6)} />
          <circle cx={3.6} cy={-31} r={0.8} style={filled("gold")} />
          <g data-part="head">
            <path d={FACE} style={filled("skin", 1)} />
            <circle cx={-2.6} cy={-0.4} r={1.6} style={filled("skin", 0.7)} />
            <path d={BEARD} style={filled("pumpkin", 0.9)} />
            <path d={SIDEBURN} style={stroked(1.6, "pumpkin")} />
            <circle cx={4} cy={1.6} r={1.3} style={filled("accentPink")} />
            <circle cx={6.4} cy={0.4} r={1.5} style={filled("skin", 0.7)} />
            <circle data-part="eye" cx={3} cy={-1.4} r={0.9} style={filled("screen")} />
            <path data-part="eyelid" d="M2 -1.2h2.2" style={{ ...stroked(0.7), opacity: 0 }} />
            <path d="M2.8 5.2q1.6 1 3 0" style={stroked(0.7)} />
            <g data-part="hat">
              <path d={CROWN} style={filled("festiveGreen", 0.9)} />
              <path d={BAND} style={filled("screen")} />
              <path d={BUCKLE} style={filled("gold", 0.5)} />
              <path d={BRIM} style={filled("festiveGreen", 0.9)} />
            </g>
          </g>
        </g>
        <Arm index={0} token="festiveGreen" />
        <g data-part="coin" style={{ opacity: 0 }}>
          <circle r={2.4} style={filled("gold", 0.7)} />
        </g>
      </g>
    </Stage>
  );
};
