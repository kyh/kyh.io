"use client";

// What follows a mouse at Valentine's: a peach-faced lovebird
// (`lovebird.ts`), drawn in the showcase town's hand as the theme's pieces
// are (`piece.tsx`): a green body with its belly in the darker green under
// the shade dots, a blue rump, a rosy face and a red brow, a white ring round
// its eye and a pale hooked beak. Parts marked `data-part` are posed a frame
// at a time by the stage.
import type { Token } from "@/app/showcase/_components/city/palette";
import { useSvgId } from "@/lib/svg-id";
import { Stage } from "../follower/stage";
import { filled, stroked } from "../follower/ink";
import { ShadeDots } from "../piece";
import { lovebird } from "./lovebird";

const BODY = "M-9 -8C-8 -15 0 -19 6 -17C10 -15 10 -8 7 -4C4 -1 -2 -1 -6 -3C-9 -4 -10 -6 -9 -8Z";
const BELLY = "M9.4 -10C9 -6 7 -3 4 -2C0 -1 -4 -1.6 -7 -3.6C-2 -4 4 -5.4 9.4 -10Z";
const TAIL = "M-7.6 -9L-16 -6.4L-15.4 -4L-6.6 -5.4Z";
const RUMP = "M-8.6 -9.4C-7 -11.4 -4.6 -11.6 -3.4 -10C-5 -8.8 -7 -8.2 -8.6 -9.4Z";
const WING = "M3 -15C-2 -14.4 -7 -11 -11 -6C-6 -5 0 -6 4 -9C5 -11 5 -13 3 -15Z";
const PRIMARIES = "M-10 -6.4C-7 -7.6 -4 -8.4 -1 -8.8";
const SKULL =
  "M-5.4 1C-5.8 -3 -3 -5.8 0.4 -5.8C3.6 -5.8 5.8 -3.4 5.8 0C5.8 3 3.4 5.2 0.4 5.2C-2.4 5.2 -5 3.6 -5.4 1Z";
const FACE = "M0.6 -5.8C3.6 -5.8 5.8 -3.4 5.8 0C5.8 2.4 4.6 4.2 2.6 4.8C1.4 2.6 0.2 -1 0.6 -5.8Z";
const BROW = "M1.6 -5.6C3.6 -5.6 5.2 -4.4 5.6 -2.4C4.4 -3 3 -3.4 1.4 -3.4Z";
const UPPER_BEAK = "M5 -1.6C7.6 -1.8 8.8 0.4 7.6 2.8C6.6 2 5.8 1.4 5 1Z";
const LOWER_BEAK = "M5 1C6 1.4 6.8 2 7.2 2.8C6.2 3.2 5.4 2.8 5 2Z";
const LEGS = "M-1 -2.6L-1.6 0M1.6 -2.4L2 0";
const Wing = ({ index, token }: { index: number; token: Token }) => (
  <g data-part={`wing-${index}`}>
    <path d={WING} style={filled(token, 0.7)} />
    <path d={PRIMARIES} style={stroked(0.5)} />
  </g>
);

export const Follower = () => {
  const id = useSvgId("lovebird");
  return (
    <Stage creature={lovebird} box={{ height: 90, width: 100, x: -50, y: -70 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={0.7} />
      </defs>
      <g data-part="flip">
        <path data-part="legs" d={LEGS} style={stroked(0.9, "accentPink")} />
        <g data-part="body">
          <Wing index={1} token="festiveGreenShade" />
          <path d={TAIL} style={filled("accentBlue", 0.7)} />
          <path d={BODY} style={filled("festiveGreen")} />
          <path d={BELLY} style={filled("festiveGreenShade")} />
          <path d={BELLY} fill={`url(#${id}-dots)`} />
          <path d={RUMP} style={filled("accentBlue")} />
          <path d={BODY} style={stroked(0.9)} />
          <g data-part="head">
            <path d={SKULL} style={filled("festiveGreen")} />
            <path d={FACE} style={filled("accentPink")} />
            <path d={BROW} style={filled("festiveRed")} />
            <path d={SKULL} style={stroked(0.9)} />
            <circle cx={2.2} cy={-1.6} r={1.6} style={filled("white", 0.4)} />
            <circle data-part="eye" cx={2.4} cy={-1.6} r={0.8} style={filled("screen")} />
            <path data-part="eyelid" d="M1 -1.6h2.6" style={{ ...stroked(0.6), opacity: 0 }} />
            <path data-part="beak" d={LOWER_BEAK} style={filled("hayShade", 0.5)} />
            <path d={UPPER_BEAK} style={filled("hay", 0.6)} />
          </g>
          <Wing index={0} token="festiveGreen" />
        </g>
      </g>
    </Stage>
  );
};
