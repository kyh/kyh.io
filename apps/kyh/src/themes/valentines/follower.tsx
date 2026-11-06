"use client";

// What follows a mouse at Valentine's: a peach-faced lovebird
// (`lovebird.ts`), built in the round (`lovebird-pose.ts`) and drawn in the
// showcase town's hand as the theme's pieces are (`piece.tsx`): flat faces,
// each solid's side from the light in its shade under the shade dots, ink
// round the outside. A green body and head, a blue rump, a peach face and a
// red forehead, a white ring round each eye, a pale hooked beak; green wings,
// their flight feathers darker on top and the whole underside in the shade;
// a green tail, its outer feathers banded red at the base where they show
// fanned; pink feet. Each `data-layer` is one part the stage stacks by how
// near the camera it is; each `data-part` is posed a frame at a time.
import { useSvgId } from "@/lib/svg-id";
import { filled, stroked } from "../follower/ink";
import { Solid } from "../follower/shaded";
import { Stage } from "../follower/stage";
import { ShadeDots } from "../piece";
import { lovebird } from "./lovebird";
import { SIZE } from "./lovebird-pose";

/** Ink `width` screen pixels wide, as the ghost's is, though the lovebird's drawn bigger. */
const ink = (width: number) => width / SIZE;

/** Ink round the body: drawn under it, so the rump's cap over it doesn't cover it. */
const OUTLINE = 2.6;

const Eye = ({ index }: { index: number }) => (
  <>
    <path data-part={`ring-${index}`} style={filled("white", ink(0.5))} />
    <path data-part={`eye-${index}`} style={filled("screen")} />
    <path data-part={`glint-${index}`} style={filled("white")} />
    <path data-part={`lid-${index}`} style={{ ...stroked(ink(0.8)), opacity: 0 }} />
  </>
);

/** A wing: its underside in the shade under the dots, its top over it as it shows, its flight feathers, inked. */
const Wing = ({ index, id }: { index: number; id: string }) => (
  <g data-layer={`wing-${index}`}>
    <path data-part={`wing-${index}`} style={filled("festiveGreenShade")} />
    <path data-part={`wing-${index}`} fill={`url(#${id}-dots)`} />
    <path data-part={`wing-${index}-top`} style={filled("festiveGreen")} />
    <path data-part={`hand-${index}`} style={filled("festiveGreenShade")} />
    <path data-part={`quills-${index}`} style={stroked(ink(0.5))} />
    <path data-part={`wing-${index}`} style={stroked(ink(0.9))} />
  </g>
);

/** Its beak: drawn under its head or over it, whichever way it's turned. */
const Beak = ({ at }: { at: "front" | "back" }) => (
  <>
    <path data-part={`beak-lower-${at}`} style={filled("hayShade", ink(0.6))} />
    <path data-part={`beak-upper-${at}`} style={filled("hay", ink(0.7))} />
  </>
);

export const Follower = () => {
  const id = useSvgId("lovebird");
  return (
    <Stage creature={lovebird} box={{ height: 150, width: 160, x: -80, y: -100 }} size={SIZE}>
      <defs>
        <ShadeDots id={`${id}-dots`} size={ink(0.8)} />
      </defs>
      {[0, 1].map((index) => (
        <g key={`leg-${index}`} data-layer={`leg-${index}`}>
          <path data-part={`leg-${index}`} style={stroked(ink(2.6))} />
          <path data-part={`leg-${index}`} style={stroked(ink(1.2), "accentPink")} />
        </g>
      ))}
      <g data-layer="tail">
        <path data-part="tail" style={filled("festiveGreen", ink(0.8))} />
        <path data-part="band" style={filled("festiveRed")} />
        <path data-part="tail-quills" style={stroked(ink(0.45))} />
        <path data-part="tail" style={stroked(ink(0.8))} />
      </g>
      <Wing index={0} id={id} />
      <Wing index={1} id={id} />
      <g data-layer="body">
        <path data-part="tufts" style={filled("festiveGreen", ink(0.7))} />
        <path data-part="body" style={stroked(ink(OUTLINE))} />
        <Solid name="body" id={id} fill="festiveGreen" shade="festiveGreenShade" />
        <Solid name="rump" id={id} fill="accentBlue" shade="navy" ink={ink(0.6)} />
      </g>
      <g data-layer="head">
        <Beak at="back" />
        <path data-part="head-tufts" style={filled("festiveGreen", ink(0.7))} />
        <Solid name="head" id={id} fill="festiveGreen" shade="festiveGreenShade" />
        <Solid name="face" id={id} fill="accentPink" shade="accentPink" ink={ink(0.5)} />
        <Solid name="brow" id={id} fill="festiveRed" shade="festiveRedShade" ink={ink(0.5)} />
        {/* Its head inked over its caps, as fine as the body's ink shows: it's drawn over the body. */}
        <path data-part="head" style={stroked(ink(1.3))} />
        <Eye index={0} />
        <Eye index={1} />
        <Beak at="front" />
      </g>
    </Stage>
  );
};
