"use client";

// What follows a mouse at Christmas: a reindeer (`reindeer.ts`), drawn in
// the showcase town's hand as the theme's pieces are (`piece.tsx`): a brown
// coat with its belly in the darker brown under the shade dots, a shaggy
// pale mane and rump, branching antlers, dark hooves, and a gold bell on a
// red collar. Parts marked `data-part` are posed a frame at a time by the
// stage.
import type { Token } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { Stage } from "../follower/stage";
import { filled, stroked } from "../follower/ink";
import { ShadeDots } from "../piece";
import { reindeer } from "./reindeer";

const BODY =
  "M-22 -46C-10 -52 8 -52 18 -49C25 -46 25 -36 20 -31C10 -27 -10 -27 -19 -30C-25 -33 -27 -42 -22 -46Z";
const BELLY = "M22 -34C16 -29 0 -27 -10 -28C-16 -28 -21 -30 -24 -34C-12 -31 8 -31 22 -34Z";
const RUMP = "M-22 -45C-25 -42 -25 -36 -21 -32C-20 -36 -19 -41 -22 -45Z";
const TAIL = "M-23 -44C-26 -43 -27 -40 -25 -38C-24 -40 -23 -42 -23 -44Z";
const MANE = "M17 -48C22 -46 25 -40 23 -33L21 -35L20.5 -32L18 -35C17 -39 16 -44 17 -48Z";
const COLLAR = "M13 -50C17 -46 19 -42 19.5 -40";
const SKULL =
  "M-6 -2C-5 -6 1 -7 5 -4C8 -2 11 0 12.5 2.4C13.4 4 12.4 5.6 10.6 5.6C7 5.6 2 5 -2 3.6C-5 2.6 -6.4 0.6 -6 -2Z";
const EAR = "M-2 -4C-6 -7 -10 -7 -12 -5C-10 -3 -6 -2 -2 -2.6Z";
/** An antler: the beam sweeping back and up, its tines forward and out. */
const ANTLER =
  "M-1 -5C-4 -12 -9 -16 -8 -24C-7.5 -28 -5 -31 -2 -33M-1.6 -7l5 -1M-3.4 -11l4 -5M-7 -16l-5 -3M-8 -21l4 -4M-6.4 -27l5 -2M-4 -31l-3 -4";
const Leg = ({ index, token, hoof }: { index: number; token: Token; hoof: string }) => (
  <>
    <path data-part={`leg-${index}`} style={stroked(4.8)} />
    <path data-part={`leg-${index}`} style={stroked(3, token)} markerEnd={`url(#${hoof})`} />
  </>
);

const Antler = ({ token }: { token: Token }) => (
  <>
    <path d={ANTLER} style={stroked(3.4)} />
    <path d={ANTLER} style={stroked(1.8, token)} />
  </>
);

export const Follower = () => {
  const id = useSvgId("reindeer");
  const hoof = `${id}-hoof`;
  return (
    <Stage creature={reindeer} box={{ height: 150, width: 170, x: -85, y: -130 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={1} />
        {/* A hoof at the end of each leg, turned along it. */}
        <marker
          id={hoof}
          markerUnits="userSpaceOnUse"
          markerWidth={8}
          markerHeight={8}
          refX={1}
          refY={2.4}
          orient="auto"
          overflow="visible"
        >
          <path d="M0 0.4H4.4V4.4H0Z" style={filled("screen", 0.8)} />
        </marker>
      </defs>
      <g data-part="flip">
        <Leg index={2} token="furShade" hoof={hoof} />
        <Leg index={3} token="furShade" hoof={hoof} />
        <Leg index={0} token="fur" hoof={hoof} />
        <Leg index={1} token="fur" hoof={hoof} />
        <g data-part="body">
          <path d={TAIL} style={filled("whiteShade", 0.9)} />
          <path d={BODY} style={filled("fur")} />
          <path d={BELLY} style={filled("furShade")} />
          <path d={BELLY} fill={`url(#${id}-dots)`} />
          <path d={RUMP} style={filled("whiteShade")} />
          <path d={BODY} style={stroked(1.4)} />
          <path data-part="neck" style={stroked(13)} />
          <path data-part="neck" style={stroked(10.4, "fur")} />
          <path d={MANE} style={filled("whiteShade", 0.9)} />
          <path d={COLLAR} style={stroked(4.6)} />
          <path d={COLLAR} style={stroked(2.8, "festiveRed")} />
          <g data-part="bell">
            <circle cx={19.5} cy={-36.6} r={2.7} style={filled("gold", 0.9)} />
            <path d="M19.5 -36v2.2" style={stroked(0.7)} />
          </g>
          <g data-part="head">
            <g transform="translate(3 0.6)">
              <Antler token="hayShade" />
            </g>
            <g data-part="ear">
              <path d={EAR} style={filled("fur", 0.9)} />
              <path d="M-3 -3.8C-6 -5 -8.6 -5.2 -10 -4.8" style={stroked(0.7, "furShade")} />
            </g>
            <path d={SKULL} style={filled("fur")} />
            <path d={SKULL} style={stroked(1.1)} />
            <ellipse cx={12} cy={3.4} rx={1.7} ry={1.3} style={filled("screen")} />
            <circle data-part="eye" cx={1.6} cy={-2.4} r={1.1} style={filled("screen")} />
            <path data-part="eyelid" d="M0.4 -2.2h2.4" style={{ ...stroked(0.8), opacity: 0 }} />
            <Antler token="hay" />
          </g>
        </g>
      </g>
    </Stage>
  );
};
