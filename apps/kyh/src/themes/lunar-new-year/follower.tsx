"use client";

// What follows a mouse at Lunar New Year: a festival dragon (`dragon.ts`),
// drawn in the showcase town's hand as the theme's pieces are (`piece.tsx`):
// red segments with gold bellies, scales and fins, two pairs of clawed legs
// and a gold tuft at the tail, and a red head with a gold mane, horns, a jaw
// that opens and long whiskers. Parts marked `data-part` are posed a frame
// at a time by the stage.
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { dragon, SEGMENTS } from "./dragon";

/** A segment of body, pointing along +x toward the head: its disc, belly, a scale and its fin. */
const DISC = "M-8.4 0A8.4 7.2 0 1 0 8.4 0A8.4 7.2 0 1 0 -8.4 0Z";
const BELLY = "M-7.4 3.4A8.4 7.2 0 0 0 7.4 3.4C4 5 -4 5 -7.4 3.4Z";
const SCALE = "M-3 -1.4Q0 -4.4 3 -1.4";
const FIN = "M-3 -6.4L-2 -10.4L2.4 -6.6Z";
const LEGS = "M-2 6L-4 12.4M2.4 6L1.4 12.6";
const CLAWS = "M-4 12.4l-1.6 0.8M-4 12.4l1.4 0.8M1.4 12.6l-1.4 0.8M1.4 12.6l1.6 0.6";
const TUFT = "M-5 0C-10 -6 -16 -6 -20 -2C-17 -1 -15 0 -14 1C-16 3 -18 6 -21 7C-15 9 -9 6 -5 2Z";
/** The legged segments. */
const LEGGED = new Set([2, 3, 9, 10]);

/** The head, pointing along +x from where its neck meets it. */
const SNOUT = "M-4 -6C2 -9 10 -8 16 -4C19 -2 19 1 17 2H8L3 4C0 5 -3 5 -5 2C-7 -1 -6 -4 -4 -6Z";
const JAW = "M3 3H16C17 5 15 7.4 11.6 7.4C8 7.4 4.6 6 3 4.6Z";
const MANE = "M-3 -6C-8 -11 -12 -7 -15 -10C-14 -4 -11 -1 -6 1C-11 2 -13 6 -16 6C-11 10 -6 8 -3 3Z";
const HORNS = "M0 -7C-2 -12 -6 -15 -10 -16M4 -8C3 -13 0 -17 -3 -19";
const TEETH = "M8.6 3.2l1 1.6 1 -1.6 1 1.6 1 -1.6 1 1.6";

const Segment = ({ index }: { index: number }) => (
  <g data-part={`segment-${index}`}>
    {index === SEGMENTS - 1 && <path d={TUFT} style={filled("gold", 0.9)} />}
    {LEGGED.has(index) && (
      <>
        <path d={LEGS} style={stroked(3.6)} />
        <path d={LEGS} style={stroked(2, "festiveRedShade")} />
        <path d={CLAWS} style={stroked(0.9, "gold")} />
      </>
    )}
    <path d={FIN} style={filled("gold", 0.8)} />
    <path d={DISC} style={filled("festiveRed", 1)} />
    <path d={BELLY} style={filled("gold")} />
    <path d={SCALE} style={stroked(0.8, "gold")} />
  </g>
);

export const Follower = () => {
  const id = useSvgId("dragon");
  return (
    <Stage creature={dragon} box={{ height: 340, width: 340, x: -170, y: -170 }}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={0.8} />
      </defs>
      {/* Tail first, so each segment lies over the one behind it. */}
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <Segment key={index} index={SEGMENTS - 1 - index} />
      ))}
      <g data-part="head">
        <path d={HORNS} style={stroked(3.4)} />
        <path d={HORNS} style={stroked(1.8, "hay")} />
        <path d={MANE} style={filled("gold", 0.9)} />
        <g data-part="jaw">
          <path d={JAW} style={filled("festiveRedShade")} />
          <path d={JAW} fill={`url(#${id}-dots)`} />
          <path d={JAW} style={stroked(0.9)} />
          <path d="M5 4.4l1 1.4 1 -1.4 1 1.4 1 -1.4" style={stroked(0.7, "white")} />
        </g>
        <path d={SNOUT} style={filled("festiveRed", 1.1)} />
        <path d={TEETH} style={stroked(0.7, "white")} />
        <path d="M2.6 -6.4Q6.6 -9 10.6 -6" style={stroked(1.4, "gold")} />
        <circle cx={7.4} cy={-4.4} r={2.3} style={filled("white", 0.7)} />
        <circle data-part="eye" cx={8} cy={-4.4} r={1.1} style={filled("screen")} />
        <path data-part="eyelid" d="M5.4 -4.2h4" style={{ ...stroked(0.8), opacity: 0 }} />
        <circle cx={16.4} cy={-2.4} r={0.6} style={filled("screen")} />
        <path data-part="whisker-0" style={stroked(1, "gold")} />
        <path data-part="whisker-1" style={stroked(1, "gold")} />
      </g>
    </Stage>
  );
};
